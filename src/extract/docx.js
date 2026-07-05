import mammoth from "mammoth";

export async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return {
    title: null,
    type: null,
    body: (result.value || "").trim(),
    wikilinks: [],
  };
}
