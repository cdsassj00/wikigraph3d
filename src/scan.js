import fs from "node:fs";
import path from "node:path";

export const SUPPORTED_EXT = new Set([".md", ".markdown", ".txt", ".pdf", ".docx", ".pptx"]);

const SKIP_DIRS = new Set(["node_modules", ".git", ".obsidian", ".llmwiki", "raw"]);

export function scanFolder(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXT.has(ext) && !entry.name.startsWith("~$")) {
          files.push(full);
        }
      }
    }
  }
  walk(root);
  return files.sort();
}
