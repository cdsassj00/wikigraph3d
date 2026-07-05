#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { SUPPORTED_EXT } from "../src/scan.js";
import { buildGraphHtmlFromFolder } from "../src/build.js";
import { startGui } from "../src/gui.js";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
} from "../src/ollama.js";

function parsePositiveInt(raw, flagName) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${flagName} expects a positive integer.`);
  }
  return value;
}

function parseArgs(argv) {
  // 사용자 입장에서는 명령 한 번 쳤을 때 뭔가 "눈에 보여야" 직관적이다 —
  // 그래서 자동으로 브라우저를 여는 쪽을 기본값으로 하고, 원치 않으면 --no-open으로 끄게 한다.
  const args = {
    folder: null,
    out: null,
    open: true,
    ollama: false,
    ollamaModel: DEFAULT_OLLAMA_MODEL,
    ollamaUrl: DEFAULT_OLLAMA_BASE_URL,
    ollamaLimit: null,
    gui: false,
    host: "127.0.0.1",
    port: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" || a === "-o") args.out = argv[++i];
    else if (a === "--open") args.open = true;
    else if (a === "--no-open") args.open = false;
    else if (a === "--gui") args.gui = true;
    else if (a === "--host") args.host = argv[++i] || args.host;
    else if (a === "--port") args.port = Number(argv[++i] || 0);
    else if (a === "--ollama" || a === "--ai") args.ollama = true;
    else if (a === "--ollama-model") args.ollamaModel = argv[++i] || DEFAULT_OLLAMA_MODEL;
    else if (a === "--ollama-url") args.ollamaUrl = argv[++i] || DEFAULT_OLLAMA_BASE_URL;
    else if (a === "--ollama-limit") args.ollamaLimit = parsePositiveInt(argv[++i], a);
    else if (a === "--help" || a === "-h") args.help = true;
    else if (!args.folder) args.folder = a;
  }
  return args;
}

function printHelp() {
  console.log(`wikigraph3d — local document wiki graph builder

Usage:
  wikigraph3d
  wikigraph3d --gui
  wikigraph3d <folder> [--out output.html] [--no-open] [--ollama]

Supported file types: ${[...SUPPORTED_EXT].join(", ")}

Options:
  --gui                  Start the local browser GUI (default when no folder is given)
  --host <host>          GUI host (default: 127.0.0.1)
  --port <port>          GUI port (default: a free random port)
  --out, -o <file>       Output HTML path (default: <folder>-graph.html next to the folder)
  --no-open              Don't open the result in your browser automatically (default: opens it)
  --ollama, --ai         Add local Ollama summaries/tags while building the graph
  --ollama-model <name>  Ollama model to use (default: ${DEFAULT_OLLAMA_MODEL})
  --ollama-url <url>     Ollama server URL (default: ${DEFAULT_OLLAMA_BASE_URL})
  --ollama-limit <n>     Enrich only the first n documents
  --help, -h             Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.gui || !args.folder) {
    const gui = await startGui({ host: args.host, port: args.port, open: args.open });
    console.log(`wikigraph3d GUI running at ${gui.url}`);
    if (!args.open) console.log(`Open it manually: ${gui.url}`);
    return;
  }

  const root = path.resolve(args.folder);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }

  console.log(`Scanning and extracting ${root} ...`);
  const title = path.basename(root);
  const result = await buildGraphHtmlFromFolder(root, {
    title,
    ollama: args.ollama,
    ollamaModel: args.ollamaModel,
    ollamaUrl: args.ollamaUrl,
    ollamaLimit: args.ollamaLimit,
    onParseError(filePath, err) {
      console.warn(`  ! skipped (parse error): ${filePath} — ${err.message}`);
    },
    onAiProgress(event) {
      if (event.type === "start") {
        console.log(`  AI ${event.index}/${event.total}: ${event.node.title}`);
      } else if (event.type === "error") {
        console.warn(`  ! AI skipped: ${event.node.title} — ${event.error.message}`);
      }
    },
  });

  if (!result.counts.files) {
    console.error(`No supported documents found (${[...SUPPORTED_EXT].join(", ")}).`);
    process.exit(1);
  }
  console.log(`Extracted ${result.counts.extracted}/${result.counts.files} documents (empty/failed ones skipped).`);
  console.log(
    `Graph: ${result.counts.nodes} nodes, ${result.counts.links} links ` +
      `(wikilink ${result.counts.wikilink} + folder ${result.counts.folder} + similar ${result.counts.similar})`
  );

  if (args.ollama) {
    if (result.ai.available) {
      console.log(
        `Ollama: enriched ${result.ai.enriched}/${result.counts.nodes} documents` +
          `${result.ai.failed ? ` (${result.ai.failed} failed)` : ""}` +
          `${result.ai.skipped ? `, skipped ${result.ai.skipped}` : ""}.`
      );
    } else {
      console.warn(`Ollama: ${result.ai.message}`);
      console.warn(result.ai.setupHint);
      console.warn("Continuing without AI summaries. The graph and local text search will still work.");
    }
  }

  const outPath = path.resolve(args.out || `${root}-graph.html`);
  fs.writeFileSync(outPath, result.html, "utf-8");
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
