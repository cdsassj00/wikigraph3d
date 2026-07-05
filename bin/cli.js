#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { scanFolder, SUPPORTED_EXT } from "../src/scan.js";
import { extractMarkdown } from "../src/extract/markdown.js";
import { extractPdf } from "../src/extract/pdf.js";
import { extractDocx } from "../src/extract/docx.js";
import { extractPptx } from "../src/extract/pptx.js";
import { buildGraph } from "../src/linker.js";
import { renderHtml } from "../src/render.js";

function parseArgs(argv) {
  // 사용자 입장에서는 명령 한 번 쳤을 때 뭔가 "눈에 보여야" 직관적이다 —
  // 그래서 자동으로 브라우저를 여는 쪽을 기본값으로 하고, 원치 않으면 --no-open으로 끄게 한다.
  const args = { folder: null, out: null, open: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "-o") args.out = argv[++i];
    else if (a === "--open") args.open = true;
    else if (a === "--no-open") args.open = false;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!args.folder) args.folder = a;
  }
  return args;
}

function printHelp() {
  console.log(`wikigraph3d — turn a folder of documents into a single 3D searchable graph HTML file

Usage:
  npx github:cdsassj00/wikigraph3d <folder> [--out output.html] [--no-open]

Supported file types: ${[...SUPPORTED_EXT].join(", ")}

Options:
  --out, -o <file>   Output HTML path (default: <folder>-graph.html next to the folder)
  --no-open          Don't open the result in your browser automatically (default: opens it)
  --help, -h         Show this help
`);
}

async function extractOne(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === ".md" || ext === ".markdown" || ext === ".txt") return await extractMarkdown(filePath);
    if (ext === ".pdf") return await extractPdf(filePath);
    if (ext === ".docx") return await extractDocx(filePath);
    if (ext === ".pptx") return await extractPptx(filePath);
  } catch (err) {
    console.warn(`  ! skipped (parse error): ${filePath} — ${err.message}`);
    return null;
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.folder) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const root = path.resolve(args.folder);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }

  console.log(`Scanning ${root} ...`);
  const files = scanFolder(root);
  if (!files.length) {
    console.error(`No supported documents found (${[...SUPPORTED_EXT].join(", ")}).`);
    process.exit(1);
  }
  console.log(`Found ${files.length} documents. Extracting...`);

  const extracted = [];
  for (const filePath of files) {
    const result = await extractOne(filePath);
    if (result && result.body) extracted.push({ filePath, result });
  }
  console.log(`Extracted ${extracted.length}/${files.length} documents (empty/failed ones skipped).`);

  const graph = buildGraph(root, extracted);
  const wikilinkCount = graph.links.filter((l) => l.kind === "wikilink").length;
  const folderCount = graph.links.filter((l) => l.kind === "folder").length;
  const similarCount = graph.links.filter((l) => l.kind === "similar").length;
  console.log(
    `Graph: ${graph.nodes.length} nodes, ${graph.links.length} links ` +
      `(wikilink ${wikilinkCount} + folder ${folderCount} + similar ${similarCount})`
  );

  const title = path.basename(root);
  const html = renderHtml({ title, ...graph });

  const outPath = path.resolve(args.out || `${root}-graph.html`);
  fs.writeFileSync(outPath, html, "utf-8");
  console.log(`Wrote ${outPath}`);

  if (args.open) {
    console.log("Opening in your browser...");
    // 셸 문자열 보간 없이 인자 배열로 넘겨 경로에 특수문자가 있어도 안전하게 연다.
    if (process.platform === "win32") execFile("cmd", ["/c", "start", "", outPath]);
    else if (process.platform === "darwin") execFile("open", [outPath]);
    else execFile("xdg-open", [outPath]);
  } else {
    console.log(`Open it manually: ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
