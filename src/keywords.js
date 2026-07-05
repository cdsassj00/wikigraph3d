// 외부 NLP 라이브러리 없이 순수 JS로 만든 아주 단순한 TF-IDF 키워드 추출기.
// 형태소 분석은 하지 않는다 — 공백/구두점 기준 토큰화 + 불용어 제거 + 빈도 기반이라
// 완벽하진 않지만, "이 문서들은 비슷한 단어를 많이 공유한다"는 자동 링크 신호로는 충분하다.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "is",
  "are", "was", "were", "be", "been", "with", "as", "by", "at", "this",
  "that", "it", "its", "from", "which", "will", "can", "not", "into", "your",
  "you", "we", "our", "their", "there", "these", "those", "also", "such",
  "이", "그", "저", "것", "수", "등", "및", "을", "를", "은", "는", "이는", "그리고",
  "하지만", "그러나", "때문에", "위해", "대한", "통해", "있다", "한다", "하는",
  "된다", "되어", "합니다", "입니다", "있는", "같은", "위한", "에서", "으로",
  "에게", "부터", "까지", "라는", "이며", "이고",
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || []).filter(
    (t) => !STOPWORDS.has(t)
  );
}

export function extractKeywords(docs, topN = 8) {
  const docFreq = new Map();
  const termCounts = docs.map((body) => {
    const counts = new Map();
    for (const tok of tokenize(body)) counts.set(tok, (counts.get(tok) || 0) + 1);
    for (const term of counts.keys()) docFreq.set(term, (docFreq.get(term) || 0) + 1);
    return counts;
  });

  const n = docs.length;
  return termCounts.map((counts) => {
    const scored = [...counts.entries()].map(([term, tf]) => {
      const idf = Math.log((n + 1) / (docFreq.get(term) + 1)) + 1;
      return [term, tf * idf];
    });
    scored.sort((a, b) => b[1] - a[1]);
    return scored.slice(0, topN).map(([term]) => term);
  });
}

// 상위 키워드를 공유하는 문서끼리만 후보로 묶어(역색인) O(n^2) 전수비교를 피한다.
export function keywordSimilarityLinks(nodeIds, keywordSets, minShared = 2) {
  const inverted = new Map();
  keywordSets.forEach((kws, i) => {
    for (const kw of kws) {
      if (!inverted.has(kw)) inverted.set(kw, []);
      inverted.get(kw).push(i);
    }
  });

  const sharedCount = new Map();
  for (const idxList of inverted.values()) {
    for (let a = 0; a < idxList.length; a++) {
      for (let b = a + 1; b < idxList.length; b++) {
        const key = `${idxList[a]}:${idxList[b]}`;
        sharedCount.set(key, (sharedCount.get(key) || 0) + 1);
      }
    }
  }

  const links = [];
  for (const [key, count] of sharedCount.entries()) {
    if (count < minShared) continue;
    const [a, b] = key.split(":").map(Number);
    links.push({ source: nodeIds[a], target: nodeIds[b], kind: "similar" });
  }
  return links;
}
