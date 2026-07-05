import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { SUPPORTED_EXT } from "./scan.js";
import { buildGraphHtmlFromFolder } from "./build.js";
import { checkOllama, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL } from "./ollama.js";
import { renderGuiHtml } from "./gui-template.js";

const GUI_ROOT = path.join(os.tmpdir(), "wikigraph3d-gui");
const graphStore = new Map();

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
}

function openUrl(url) {
  if (process.platform === "win32") execFile("cmd", ["/c", "start", "", url]);
  else if (process.platform === "darwin") execFile("open", [url]);
  else execFile("xdg-open", [url]);
}

function openLocalPath(targetPath) {
  if (process.platform === "win32") execFile("cmd", ["/c", "start", "", targetPath]);
  else if (process.platform === "darwin") execFile("open", [targetPath]);
  else execFile("xdg-open", [targetPath]);
}

function sanitizeSegment(segment) {
  const cleaned = String(segment || "")
    .replace(/[<>:"|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 120) || "item";
}

function safeRelativePath(rawName) {
  const parts = String(rawName || "file")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map(sanitizeSegment);
  if (!parts.length) return "file";
  return parts.join(path.sep);
}

function ensureInside(root, target) {
  const relative = path.relative(root, target);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function commonTopFolder(relativePaths) {
  const tops = relativePaths
    .map((rel) => rel.split(/[\\/]/).filter(Boolean)[0])
    .filter(Boolean);
  if (!tops.length) return null;
  const first = tops[0];
  return tops.every((top) => top === first) ? first : null;
}

function parsePositiveLimit(value) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

async function readFormData(req) {
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: "half",
  });
  return request.formData();
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

async function saveUploadedFiles(form, jobDir) {
  const inputRoot = path.join(jobDir, "input");
  await fsp.mkdir(inputRoot, { recursive: true });

  const uploaded = form.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
  const saved = [];
  const skipped = [];

  for (const file of uploaded) {
    const rel = safeRelativePath(file.name);
    const ext = path.extname(rel).toLowerCase();
    if (!SUPPORTED_EXT.has(ext) || path.basename(rel).startsWith("~$")) {
      skipped.push(rel);
      continue;
    }

    const dest = path.join(inputRoot, rel);
    if (!ensureInside(inputRoot, dest)) {
      skipped.push(rel);
      continue;
    }

    await fsp.mkdir(path.dirname(dest), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsp.writeFile(dest, buffer);
    saved.push(rel);
  }

  return { inputRoot, saved, skipped };
}

function detectBuildRoot(inputRoot, savedRelPaths) {
  const top = commonTopFolder(savedRelPaths);
  if (!top) return inputRoot;
  const candidate = path.join(inputRoot, top);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
  return inputRoot;
}

function safeDownloadName(title) {
  return `${sanitizeSegment(title || "wikigraph3d")}-graph.html`;
}

function pathKey(value) {
  const resolved = path.resolve(String(value || ""));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function allowedGraphPaths(graph) {
  const allowed = new Set();
  for (const node of graph.nodes || []) {
    if (node.absolutePath) allowed.add(pathKey(node.absolutePath));
    if (node.folder) allowed.add(pathKey(node.folder));
  }
  return allowed;
}

function sameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function handleBuild(req, res) {
  const form = await readFormData(req);
  const jobId = randomUUID();
  const jobDir = path.join(GUI_ROOT, jobId);
  await fsp.mkdir(jobDir, { recursive: true });

  const folderName = sanitizeSegment(form.get("folderName") || "documents");
  const useOllama = form.get("ollama") === "1";
  const ollamaModel = String(form.get("ollamaModel") || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL;
  const ollamaUrl = String(form.get("ollamaUrl") || DEFAULT_OLLAMA_BASE_URL).trim() || DEFAULT_OLLAMA_BASE_URL;
  const ollamaLimit = parsePositiveLimit(form.get("ollamaLimit"));
  const warnings = [];

  const { inputRoot, saved, skipped } = await saveUploadedFiles(form, jobDir);
  if (!saved.length) {
    sendJson(res, 400, {
      ok: false,
      message: `지원하는 문서가 없습니다. 지원 형식: ${[...SUPPORTED_EXT].join(", ")}`,
      skipped,
    });
    return;
  }

  const buildRoot = detectBuildRoot(inputRoot, saved);
  const result = await buildGraphHtmlFromFolder(buildRoot, {
    title: folderName,
    ollama: useOllama,
    ollamaModel,
    ollamaUrl,
    ollamaLimit,
    onParseError(filePath, err) {
      warnings.push(`파싱 실패: ${path.basename(filePath)} - ${err.message}`);
    },
  });

  const outputPath = path.join(jobDir, safeDownloadName(folderName));
  await fsp.writeFile(outputPath, result.html, "utf-8");
  graphStore.set(jobId, {
    path: outputPath,
    title: folderName,
    downloadName: path.basename(outputPath),
    allowedPaths: allowedGraphPaths(result.graph),
    createdAt: Date.now(),
  });

  sendJson(res, 200, {
    ok: true,
    id: jobId,
    title: folderName,
    graphUrl: `/graphs/${jobId}`,
    downloadUrl: `/graphs/${jobId}?download=1`,
    downloadName: path.basename(outputPath),
    counts: result.counts,
    ai: result.ai,
    warnings,
    skipped,
  });
}

async function handleBuildPath(req, res) {
  const body = await readJson(req);
  const folderPath = path.resolve(String(body.folderPath || ""));
  if (!folderPath || !fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    sendJson(res, 400, { ok: false, message: "읽을 수 있는 폴더 경로가 아닙니다." });
    return;
  }

  const jobId = randomUUID();
  const jobDir = path.join(GUI_ROOT, jobId);
  await fsp.mkdir(jobDir, { recursive: true });

  const title = sanitizeSegment(body.folderName || path.basename(folderPath) || "documents");
  const warnings = [];
  const result = await buildGraphHtmlFromFolder(folderPath, {
    title,
    ollama: Boolean(body.ollama),
    ollamaModel: String(body.ollamaModel || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL,
    ollamaUrl: String(body.ollamaUrl || DEFAULT_OLLAMA_BASE_URL).trim() || DEFAULT_OLLAMA_BASE_URL,
    ollamaLimit: parsePositiveLimit(body.ollamaLimit),
    onParseError(filePath, err) {
      warnings.push(`파싱 실패: ${path.basename(filePath)} - ${err.message}`);
    },
  });

  if (!result.counts.files) {
    sendJson(res, 400, {
      ok: false,
      message: `지원하는 문서가 없습니다. 지원 형식: ${[...SUPPORTED_EXT].join(", ")}`,
    });
    return;
  }

  const outputPath = path.join(jobDir, safeDownloadName(title));
  await fsp.writeFile(outputPath, result.html, "utf-8");
  graphStore.set(jobId, {
    path: outputPath,
    title,
    downloadName: path.basename(outputPath),
    allowedPaths: allowedGraphPaths(result.graph),
    createdAt: Date.now(),
  });

  sendJson(res, 200, {
    ok: true,
    id: jobId,
    title,
    graphUrl: `/graphs/${jobId}`,
    downloadUrl: `/graphs/${jobId}?download=1`,
    downloadName: path.basename(outputPath),
    counts: result.counts,
    ai: result.ai,
    warnings,
    sourceMode: "path",
  });
}

async function handleOllamaStatus(req, res, url) {
  const model = url.searchParams.get("model") || DEFAULT_OLLAMA_MODEL;
  const baseUrl = url.searchParams.get("url") || DEFAULT_OLLAMA_BASE_URL;
  const status = await checkOllama({ baseUrl, model });
  sendJson(res, 200, { ok: status.ok, ...status });
}

async function handleGraph(req, res, url) {
  const id = decodeURIComponent(url.pathname.slice("/graphs/".length));
  const entry = graphStore.get(id);
  if (!entry || !fs.existsSync(entry.path)) {
    send(res, 404, "Graph not found", { "content-type": "text/plain; charset=utf-8" });
    return;
  }

  const headers = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  };
  if (url.searchParams.get("download") === "1") {
    headers["content-disposition"] = `attachment; filename="${entry.downloadName.replace(/"/g, "")}"`;
  }
  fs.createReadStream(entry.path)
    .on("error", () => send(res, 500, "Could not read graph"))
    .pipe(res.writeHead(200, headers));
}

async function handleOpenGraphPath(req, res, url) {
  if (!sameOriginRequest(req)) {
    sendJson(res, 403, { ok: false, message: "다른 출처의 요청은 허용하지 않습니다." });
    return;
  }

  const match = url.pathname.match(/^\/graphs\/([^/]+)\/open-path$/);
  const id = match ? decodeURIComponent(match[1]) : "";
  const entry = graphStore.get(id);
  if (!entry) {
    sendJson(res, 404, { ok: false, message: "Graph not found" });
    return;
  }

  const body = await readJson(req);
  const targetPath = path.resolve(String(body.path || ""));
  if (!entry.allowedPaths || !entry.allowedPaths.has(pathKey(targetPath))) {
    sendJson(res, 403, { ok: false, message: "이 그래프에 포함된 파일 또는 폴더만 열 수 있습니다." });
    return;
  }
  if (!fs.existsSync(targetPath)) {
    sendJson(res, 404, { ok: false, message: "파일 또는 폴더가 존재하지 않습니다." });
    return;
  }

  openLocalPath(targetPath);
  sendJson(res, 200, { ok: true });
}

export async function startGui({
  host = "127.0.0.1",
  port = 0,
  open = true,
} = {}) {
  await fsp.mkdir(GUI_ROOT, { recursive: true });

  const server = http.createServer((req, res) => {
    (async () => {
      const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
      if (req.method === "GET" && url.pathname === "/") {
        send(res, 200, renderGuiHtml(), {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/favicon.ico") {
        send(res, 204, "");
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/ollama") {
        await handleOllamaStatus(req, res, url);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/build") {
        await handleBuild(req, res);
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/build-path") {
        await handleBuildPath(req, res);
        return;
      }
      if (req.method === "POST" && /^\/graphs\/[^/]+\/open-path$/.test(url.pathname)) {
        await handleOpenGraphPath(req, res, url);
        return;
      }
      if (req.method === "GET" && url.pathname.startsWith("/graphs/")) {
        await handleGraph(req, res, url);
        return;
      }
      send(res, 404, "Not found", { "content-type": "text/plain; charset=utf-8" });
    })().catch((err) => {
      sendJson(res, 500, { ok: false, message: err.message });
    });
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  const address = server.address();
  const url = `http://${host}:${address.port}/`;
  if (open) openUrl(url);
  return { server, url, host, port: address.port };
}
