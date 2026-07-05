import path from "node:path";
import { scanFolder } from "./scan.js";
import { extractMarkdown } from "./extract/markdown.js";
import { extractPdf } from "./extract/pdf.js";
import { extractDocx } from "./extract/docx.js";
import { extractPptx } from "./extract/pptx.js";
import { buildGraph } from "./linker.js";
import { renderHtml } from "./render.js";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  enrichNodesWithOllama,
  normalizeOllamaBaseUrl,
  ollamaSetupHint,
} from "./ollama.js";

export async function extractOne(filePath, { onParseError = null } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === ".md" || ext === ".markdown" || ext === ".txt") return await extractMarkdown(filePath);
    if (ext === ".pdf") return await extractPdf(filePath);
    if (ext === ".docx") return await extractDocx(filePath);
    if (ext === ".pptx") return await extractPptx(filePath);
  } catch (err) {
    onParseError?.(filePath, err);
    return null;
  }
  return null;
}

export function createDefaultAiState({
  documentCount = 0,
  baseUrl = DEFAULT_OLLAMA_BASE_URL,
  model = DEFAULT_OLLAMA_MODEL,
} = {}) {
  return {
    runtimeAsk: true,
    enabled: false,
    available: null,
    status: "not_checked",
    baseUrl: normalizeOllamaBaseUrl(baseUrl),
    model,
    enriched: 0,
    failed: 0,
    skipped: documentCount,
    setupHint: ollamaSetupHint({ baseUrl, model }),
  };
}

export function graphLinkCounts(graph) {
  return {
    wikilink: graph.links.filter((l) => l.kind === "wikilink").length,
    folder: graph.links.filter((l) => l.kind === "folder").length,
    similar: graph.links.filter((l) => l.kind === "similar").length,
  };
}

export async function buildGraphHtmlFromFolder(root, {
  title = path.basename(root),
  ollama = false,
  ollamaModel = DEFAULT_OLLAMA_MODEL,
  ollamaUrl = DEFAULT_OLLAMA_BASE_URL,
  ollamaLimit = null,
  onParseError = null,
  onAiProgress = null,
} = {}) {
  const files = scanFolder(root);
  const extracted = [];

  for (const filePath of files) {
    const result = await extractOne(filePath, { onParseError });
    if (result && result.body) extracted.push({ filePath, result });
  }

  const graph = buildGraph(root, extracted);
  let ai = createDefaultAiState({
    documentCount: graph.nodes.length,
    baseUrl: ollamaUrl,
    model: ollamaModel,
  });

  if (ollama) {
    const result = await enrichNodesWithOllama(graph.nodes, {
      baseUrl: ollamaUrl,
      model: ollamaModel,
      limit: ollamaLimit,
      onProgress: onAiProgress,
    });
    ai = { ...ai, ...result };
  }

  const html = renderHtml({ title, ...graph, ai });

  return {
    title,
    files,
    extracted,
    graph,
    ai,
    html,
    counts: {
      files: files.length,
      extracted: extracted.length,
      nodes: graph.nodes.length,
      links: graph.links.length,
      ...graphLinkCounts(graph),
    },
  };
}
