import fs from "node:fs";
import JSZip from "jszip";

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// pptx는 슬라이드마다 ppt/slides/slideN.xml 안에 텍스트가 <a:t>...</a:t> 로 들어있다.
// 전체 XML을 파싱하지 않고 그 태그만 정규식으로 뽑아도 충분히 안전하다(중첩되지 않는 텍스트 노드).
export async function extractPptx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return na - nb;
    });

  const slideTexts = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    const texts = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/gs)].map((m) => decodeXmlEntities(m[1]));
    if (texts.length) slideTexts.push(texts.join(" "));
  }

  return {
    title: null,
    type: null,
    body: slideTexts.join("\n\n").trim(),
    wikilinks: [],
  };
}
