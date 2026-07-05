import fs from "node:fs";
import pdfParse from "pdf-parse";

export async function extractPdf(filePath) {
  const buf = fs.readFileSync(filePath);
  const result = await pdfParse(buf);
  return {
    title: null,
    type: null,
    body: (result.text || "").trim(),
    wikilinks: [],
  };
}
