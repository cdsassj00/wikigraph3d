import fs from "node:fs";
import matter from "gray-matter";

const WIKILINK_RE = /\[\[(.+?)\]\]/g;

export function splitWikilink(raw) {
  const parts = raw.split(/(?<!\\)\|/);
  const target = parts[0].replace(/\\\|/g, "|").trim();
  const display = (parts[1] !== undefined ? parts[1] : target).replace(/\\\|/g, "|").trim();
  return { target, display };
}

export function extractWikilinks(body) {
  const links = [];
  let m;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    links.push(splitWikilink(m[1]).target);
  }
  return links;
}

export async function extractMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    title: data.title || null,
    type: data.type || null,
    body: content.trim(),
    wikilinks: extractWikilinks(content),
  };
}
