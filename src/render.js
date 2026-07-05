// wiki/graph-view.html(llmwiki 프로젝트의 개인용 뷰어)에서 검증된 디자인을 범용으로 이식한 버전.
// 코딩 프로젝트 전용 로직(vscode://, 도구별 실행 명령)은 빼고, 임의의 문서 폴더에 맞게
// "탐색기에서 열기"만 남겼다. 링크 종류가 3가지(wikilink/folder/similar)로 늘어난 점이 다르다.

export function renderHtml({ title, nodes, links, typeCounts }) {
  // <script> 안에 그대로 박아 넣으므로, 문서 본문에 우연히 "</script>"가 들어있으면
  // (사용자가 넣은 임의 문서라 얼마든지 가능) 브라우저가 거기서 태그를 닫아버린다 —
  // 그 시퀀스와 JS 문자열에서 허용되지 않는 라인구분자를 미리 이스케이프한다.
  const dataJson = JSON.stringify({ nodes, links, typeCounts })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return HTML_HEAD_A + escapeHtmlText(title) + HTML_HEAD_B + dataJson + HTML_TAIL;
}

function escapeHtmlText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const HTML_HEAD_A = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>`;

const HTML_HEAD_B = `— 3D Document Graph</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"
        integrity="sha384-qOkzR5Ke/XkQxuGVJ9hpFEpDlcoLtWwVYhnJf06cLIZa2vaIptSqaubivErzmD5O"
        crossorigin="anonymous"></script>
<script src="https://unpkg.com/3d-force-graph@1.73.4/dist/3d-force-graph.min.js"
        integrity="sha384-GNPicn8pBA2/PGSyPTpxIlPurgLUYcNYJ2zskIq782dE9+gp5E32WSyuxZqA7J+u"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"
        integrity="sha384-/TQbtLCAerC3jgaim+N78RZSDYV7ryeoBCVqTuzRrFec2akfBkHS7ACQ3PQhvMVi"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"
        integrity="sha384-PCSoOZTpbkikBEtd/+uV3WNdc676i9KUf01KOA8CnJotvlx8rRrETbDuwdjqTYvt"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"
        integrity="sha384-+VfUPEb0PdtChMwmBcBmykRMDd+v6D/oFmB3rZM/puCMDYcIvF968OimRh4KQY9a"
        crossorigin="anonymous"></script>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; padding: 0; height: 100%; background: #0b0e14; color: #dfe6ee; font-family: "Inter", "Noto Sans KR", "Segoe UI", sans-serif; overflow: hidden; }
  #graph { position: fixed; inset: 0; }
  #panel {
    position: fixed; top: 0; right: 0; width: var(--panel-width, 420px); max-width: 92vw; height: 100%;
    background: rgba(15, 18, 26, 0.96); border-left: 1px solid #2a3140;
    box-shadow: -8px 0 24px rgba(0,0,0,.4); transform: translateX(100%);
    transition: transform .25s ease; overflow-y: auto; padding: 20px 22px 20px 28px; box-sizing: border-box; z-index: 20;
  }
  #panel.open { transform: translateX(0); }
  #panel.resizing { transition: none; }
  #panelResizer { position: absolute; top: 0; left: 0; width: 8px; height: 100%; cursor: col-resize; z-index: 21; touch-action: none; }
  #panelResizer:hover, #panelResizer.active { background: rgba(125, 184, 255, 0.25); }
  #panel h2 { margin-top: 0; font-size: 1.25em; color: #fff; }
  #panel .meta { font-size: .8em; color: #8b96a8; margin-bottom: 14px; }
  #panel .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  #panel .actions a, #panel .actions button {
    background: #1e2735; color: #cfe0ff; border: 1px solid #33415a; border-radius: 6px;
    padding: 6px 10px; font-size: .82em; text-decoration: none; cursor: pointer;
  }
  #panel .actions a:hover, #panel .actions button:hover { background: #29354a; }
  #panel .content { font-size: .92em; line-height: 1.55; white-space: pre-wrap; }
  #panel .content a { color: #7db8ff; }
  #panel .content code { background: #1a212e; padding: 1px 5px; border-radius: 4px; }
  #panel .content pre { background: #1a212e; padding: 10px; border-radius: 6px; overflow-x: auto; }
  #closeBtn { position: absolute; top: 12px; right: 14px; background: none; border: none; color: #8b96a8; font-size: 1.3em; cursor: pointer; }
  #hud { position: fixed; top: 14px; left: 14px; z-index: 15; display: flex; flex-direction: column; gap: 8px; max-width: 340px; }
  #hud input {
    background: #131722; border: 1px solid #2a3140; color: #dfe6ee; border-radius: 6px;
    padding: 8px 10px; font-size: .9em; width: 260px;
  }
  #legend { background: rgba(19,23,34,.85); border: 1px solid #2a3140; border-radius: 8px; padding: 10px 12px; font-size: .78em; max-height: 40vh; overflow-y: auto; }
  #legend .item { display: flex; align-items: center; gap: 6px; margin: 3px 0; cursor: pointer; }
  #legend .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex: none; }
  #title { font-size: .82em; color: #6d7788; }
  #suggestList { position: fixed; top: 62px; left: 14px; z-index: 16; background: #131722; border: 1px solid #2a3140; border-radius: 6px; max-height: 260px; overflow-y: auto; width: 260px; display: none; }
  #suggestList div { padding: 6px 10px; font-size: .85em; cursor: pointer; }
  #suggestList div:hover { background: #202838; }
  #suggestList div .snippet { color: #8b96a8; font-size: .85em; margin-top: 2px; }
  #hud .row { display: flex; gap: 6px; }
  #hud .row button {
    background: #131722; border: 1px solid #2a3140; color: #cfe0ff; border-radius: 6px;
    padding: 7px 10px; font-size: .82em; cursor: pointer; white-space: nowrap;
  }
  #hud .row button:hover { background: #1c2534; }
  #hud .row button.active { background: #2a3f66; border-color: #4a6fa5; }
  #filterChip {
    display: none; align-items: center; gap: 6px; background: #1e2735; border: 1px solid #33415a;
    border-radius: 14px; padding: 4px 6px 4px 12px; font-size: .8em; width: fit-content;
  }
  #filterChip button { background: none; border: none; color: #8b96a8; cursor: pointer; font-size: 1em; padding: 0 4px; }
  #listPanel { position: fixed; inset: 0; background: #0b0e14; z-index: 12; display: none; padding: 100px 24px 24px; box-sizing: border-box; overflow-y: auto; }
  #listPanel.open { display: block; }
  #listPanel table { border-collapse: collapse; width: 100%; max-width: 980px; margin: 0 auto; }
  #listPanel th { text-align: left; font-size: .78em; color: #8b96a8; padding: 6px 10px; border-bottom: 1px solid #2a3140; position: sticky; top: 0; background: #0b0e14; }
  #listPanel td { padding: 8px 10px; border-bottom: 1px solid #1a212e; font-size: .88em; cursor: pointer; }
  #listPanel tr:hover td { background: #151b26; }
  #listPanel .type-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 8px; }
  #listPanel .snippet { color: #75809a; font-size: .85em; }
  #listCount { max-width: 980px; margin: 0 auto 10px; color: #8b96a8; font-size: .85em; }
  #madeWith { position: fixed; bottom: 8px; right: 12px; z-index: 15; font-size: .72em; color: #4a5468; }
  #madeWith a { color: #6b7a95; }
</style>
</head>
<body>
<div id="graph"></div>
<div id="hud">
  <div id="title">Document Graph · <span id="countLabel"></span></div>
  <input id="search" placeholder="Search title & body... (Enter to jump)">
  <div id="suggestList"></div>
  <div id="filterChip"><span id="filterChipLabel"></span><button id="filterChipClear">✕</button></div>
  <div class="row">
    <button id="homeBtn" title="Reset view">⌂ Home</button>
    <button id="listToggleBtn" title="Switch to list view">☰ List view</button>
  </div>
  <div id="legend"></div>
</div>
<div id="panel">
  <div id="panelResizer"></div>
  <button id="closeBtn" onclick="closePanel()">✕</button>
  <div id="panelBody"></div>
</div>
<div id="listPanel">
  <div id="listCount"></div>
  <table>
    <thead><tr><th>Title</th><th>Type</th><th style="width:40%">Snippet</th></tr></thead>
    <tbody id="listBody"></tbody>
  </table>
</div>
<div id="madeWith">generated by <a href="https://github.com/cdsassj00/wikigraph3d" target="_blank">wikigraph3d</a></div>

<script>
const DATA = `;

const HTML_TAIL = `;

const PALETTE = ["#4C9AFF", "#36B37E", "#FF8B00", "#6554C0", "#00B8D9", "#FF5630",
  "#00875A", "#5243AA", "#97A0AF", "#DE350B", "#FFC400", "#8993A4", "#79E2F2",
  "#C0B6F2", "#FFC7C2", "#57D9A3"];
const typeColorMap = {};
function colorFor(type) {
  if (!typeColorMap[type]) {
    const idx = Object.keys(typeColorMap).length % PALETTE.length;
    typeColorMap[type] = PALETTE[idx];
  }
  return typeColorMap[type];
}

const byId = {};
DATA.nodes.forEach(n => byId[n.id] = n);

const degree = {};
DATA.links.filter(l => l.kind === "wikilink").forEach(l => {
  degree[l.source] = (degree[l.source] || 0) + 1;
  degree[l.target] = (degree[l.target] || 0) + 1;
});
// wikilink가 거의 없는 일반 문서 폴더에서는 유사도 링크로도 크기를 매긴다.
if (Object.keys(degree).length === 0) {
  DATA.links.forEach(l => {
    degree[l.source] = (degree[l.source] || 0) + 1;
    degree[l.target] = (degree[l.target] || 0) + 1;
  });
}

const wikilinkCount = DATA.links.filter(l => l.kind === "wikilink").length;
const otherCount = DATA.links.length - wikilinkCount;
document.getElementById("countLabel").textContent =
  \`\${DATA.nodes.length} docs · \${wikilinkCount} links (+\${otherCount} auto)\`;

const legend = document.getElementById("legend");
Object.entries(DATA.typeCounts).sort((a,b)=>b[1]-a[1]).forEach(([type, count]) => {
  const row = document.createElement("div");
  row.className = "item";
  row.innerHTML = \`<span class="dot" style="background:\${colorFor(type)}"></span>\${type} (\${count})\`;
  row.onclick = () => filterByType(type);
  legend.appendChild(row);
});

const filterChip = document.getElementById("filterChip");
const filterChipLabel = document.getElementById("filterChipLabel");
document.getElementById("filterChipClear").addEventListener("click", () => filterByType(null));
const listPanel = document.getElementById("listPanel");
const listBody = document.getElementById("listBody");
const listCount = document.getElementById("listCount");

let activeTypeFilter = null;
function filterByType(type) {
  activeTypeFilter = (activeTypeFilter === type) ? null : type;
  if (activeTypeFilter) {
    filterChip.style.display = "flex";
    filterChipLabel.textContent = \`Filter: \${activeTypeFilter}\`;
  } else {
    filterChip.style.display = "none";
  }
  refreshNodeVisuals();
  if (listPanel.classList.contains("open")) renderList();
}

let highlightNodes = new Set();
let highlightLinks = new Set();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const glowTexture = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

const nodeObjById = {};

function buildNodeObject(n) {
  const group = new THREE.Group();
  const r = 2.4 + Math.sqrt(degree[n.id] || 0) * 1.05;
  const color = new THREE.Color(colorFor(n.type));

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(r, 10, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
  );
  group.add(core);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color, transparent: true, opacity: 0.62,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.set(r * 3.2, r * 3.2, 1);
  group.add(halo);

  nodeObjById[n.id] = { group, core, halo, r };
  return group;
}

function refreshNodeVisuals() {
  DATA.nodes.forEach(n => {
    const obj = nodeObjById[n.id];
    if (!obj) return;
    const dimmed = (activeTypeFilter && n.type !== activeTypeFilter) ||
      (highlightNodes.size > 0 && !highlightNodes.has(n.id));
    obj.core.material.opacity = dimmed ? 0.18 : 1;
    obj.halo.material.opacity = dimmed ? 0.05 : 0.62;
  });
}

const LINK_STYLE = {
  wikilink: { color: "rgba(170,195,235,0.45)", width: 0.7, curvature: 0.12 },
  folder:   { color: "rgba(120,130,145,0.16)", width: 0.25, curvature: 0.3 },
  similar:  { color: "rgba(190,140,230,0.22)", width: 0.3, curvature: 0.2 },
};
function styleFor(l) { return LINK_STYLE[l.kind] || LINK_STYLE.similar; }

const Graph = ForceGraph3D()(document.getElementById("graph"))
  .graphData(DATA)
  .nodeId("id")
  .backgroundColor("#0b0e14")
  .nodeLabel(n => \`\${n.title} [\${n.type}]\`)
  .nodeVal(n => 1 + Math.sqrt(degree[n.id] || 0))
  .nodeThreeObject(buildNodeObject)
  .nodeThreeObjectExtend(false)
  .linkColor(l => highlightLinks.has(l) ? "#ffffff" : styleFor(l).color)
  .linkWidth(l => highlightLinks.has(l) ? 2.2 : styleFor(l).width)
  .linkCurvature(l => styleFor(l).curvature)
  .linkDirectionalParticles(l => highlightLinks.has(l) ? 2 : 0)
  .onNodeClick(n => { focusNode(n.id, true); });

Graph.d3Force("charge").strength(-110);
if (Graph.d3Force("link")) Graph.d3Force("link").distance(60);

const scene = Graph.scene();

(() => {
  const STAR_COUNT = 2400;
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const radius = 700 + Math.random() * 900;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.7, color: 0xaad0ff, transparent: true, opacity: 0.55,
    sizeAttenuation: true, depthWrite: false,
  });
  scene.add(new THREE.Points(geo, mat));
})();

const controls = Graph.controls();
let idleTimer = null;
function pauseAutoRotate() {
  if (reducedMotion) return;
  controls.autoRotate = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { controls.autoRotate = true; }, 6000);
}
if (!reducedMotion) {
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  controls.addEventListener("start", pauseAutoRotate);
}
controls.zoomSpeed = 2.2;
controls.rotateSpeed = 1.3;
controls.dampingFactor = 0.18;

Graph.onEngineStop(() => Graph.zoomToFit(400, 60));

function focusNode(id, moveCamera) {
  const n = byId[id];
  if (!n) return;
  highlightNodes = new Set([id]);
  highlightLinks = new Set(DATA.links.filter(l => {
    const s = l.source.id !== undefined ? l.source.id : l.source;
    const t = l.target.id !== undefined ? l.target.id : l.target;
    if (s === id) { highlightNodes.add(t); return true; }
    if (t === id) { highlightNodes.add(s); return true; }
    return false;
  }));
  refreshNodeVisuals();
  Graph.linkColor(Graph.linkColor());
  Graph.linkWidth(Graph.linkWidth());
  Graph.linkDirectionalParticles(Graph.linkDirectionalParticles());

  if (moveCamera) {
    const distance = 120;
    const graphNode = Graph.graphData().nodes.find(x => x.id === id);
    if (graphNode && graphNode.x !== undefined) {
      const ratio = 1 + distance / Math.hypot(graphNode.x, graphNode.y, graphNode.z || 1);
      Graph.cameraPosition(
        { x: graphNode.x * ratio, y: graphNode.y * ratio, z: (graphNode.z || 0) * ratio },
        graphNode, 400
      );
    }
  }
  openPanel(n);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

(() => {
  const panelEl = document.getElementById("panel");
  const resizer = document.getElementById("panelResizer");
  const saved = parseInt(localStorage.getItem("graphViewPanelWidth") || "", 10);
  if (saved) panelEl.style.setProperty("--panel-width", saved + "px");

  let dragging = false;
  resizer.addEventListener("pointerdown", (ev) => {
    dragging = true;
    resizer.classList.add("active");
    panelEl.classList.add("resizing");
    resizer.setPointerCapture(ev.pointerId);
  });
  resizer.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const width = Math.min(window.innerWidth * 0.92, Math.max(300, window.innerWidth - ev.clientX));
    panelEl.style.setProperty("--panel-width", width + "px");
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove("active");
    panelEl.classList.remove("resizing");
    const width = parseInt(panelEl.style.getPropertyValue("--panel-width"), 10);
    if (width) localStorage.setItem("graphViewPanelWidth", String(width));
  }
  resizer.addEventListener("pointerup", endDrag);
  resizer.addEventListener("pointercancel", endDrag);
})();

// 명시적 [[위키링크]]가 있는 문서(마크다운)라면 클릭 이동이 되게 마크다운 링크로 바꿔둔다.
function wikilinksToMd(body) {
  return body.replace(/\\[\\[(.+?)\\]\\]/g, (m, inner) => {
    const parts = inner.split(/(?<!\\\\)\\|/);
    const target = parts[0].replace(/\\\\\\|/g, "|").trim();
    const display = (parts[1] !== undefined ? parts[1] : target).replace(/\\\\\\|/g, "|").trim();
    const targetNode = DATA.nodes.find(x => x.title === target);
    if (!targetNode) return display;
    return \`[\${display}](#node:\${encodeURIComponent(targetNode.id)})\`;
  });
}

function openPanel(n) {
  const body = document.getElementById("panelBody");
  // 문서는 임의의 사용자가 넣은 것이라 신뢰할 수 없다 — marked가 원문 HTML을 그대로 통과시키므로
  // DOMPurify로 반드시 살균한 뒤에만 innerHTML에 넣는다.
  const isMarkdownish = /^#|\\n#|\\*\\*|\\n- /.test(n.body);
  const contentHtml = isMarkdownish
    ? DOMPurify.sanitize(marked.parse(wikilinksToMd(n.body)))
    : \`<pre>\${escapeHtml(n.body.slice(0, 20000))}</pre>\`;

  let actions = \`<a href="#" onclick="return false;" style="border-color:\${colorFor(n.type)}">\${n.type}</a>\`;
  if (n.folder) {
    const fileUri = "file:///" + n.folder.replace(/\\\\/g, "/");
    actions += \`<a href="\${escapeHtml(fileUri)}" target="_blank">📂 Open folder</a>\`;
  }

  document.getElementById("panel").classList.add("open");
  body.innerHTML = \`
    <h2>\${escapeHtml(n.title)}</h2>
    <div class="meta">\${escapeHtml(n.file)}</div>
    <div class="actions">\${actions}</div>
    <div class="content">\${contentHtml}</div>
  \`;
  body.querySelectorAll('a[href^="#node:"]').forEach(a => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const id = decodeURIComponent(a.getAttribute("href").slice("#node:".length));
      focusNode(id, true);
    });
  });
}

function closePanel() {
  document.getElementById("panel").classList.remove("open");
  highlightNodes = new Set();
  highlightLinks = new Set();
  refreshNodeVisuals();
  Graph.linkColor(Graph.linkColor());
  Graph.linkWidth(Graph.linkWidth());
  Graph.linkDirectionalParticles(Graph.linkDirectionalParticles());
}

const fuse = new Fuse(DATA.nodes, {
  keys: [
    { name: "title", weight: 0.7 },
    { name: "body", weight: 0.3 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeMatches: true,
});

function snippetFromMatch(body, match) {
  if (!match || !match.indices || !match.indices.length) return "";
  const [s, e] = match.indices[0];
  const start = Math.max(0, s - 25);
  const end = Math.min(body.length, e + 46);
  return (start > 0 ? "…" : "") + body.slice(start, end).replace(/\\s+/g, " ") + (end < body.length ? "…" : "");
}

function searchMatches(q, limit) {
  if (!q) return [];
  let results = fuse.search(q);
  if (activeTypeFilter) results = results.filter(r => r.item.type === activeTypeFilter);
  if (limit) results = results.slice(0, limit);
  return results.map(r => {
    const titleMatch = (r.matches || []).find(m => m.key === "title");
    const bodyMatch = (r.matches || []).find(m => m.key === "body");
    return {
      n: r.item,
      kind: titleMatch ? "title" : "body",
      snippet: bodyMatch ? snippetFromMatch(r.item.body, bodyMatch) : "",
    };
  });
}

const searchInput = document.getElementById("search");
const suggestList = document.getElementById("suggestList");
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  suggestList.innerHTML = "";
  if (!q) { suggestList.style.display = "none"; if (listPanel.classList.contains("open")) renderList(); return; }
  const matches = searchMatches(q, 15);
  matches.forEach(({ n, kind, snippet }) => {
    const row = document.createElement("div");
    if (kind === "title") {
      row.textContent = \`\${n.title} [\${n.type}]\`;
    } else {
      row.innerHTML = \`\${escapeHtml(n.title)} [\${n.type}]<div class="snippet">\${escapeHtml(snippet)}</div>\`;
    }
    row.onclick = () => { focusNode(n.id, true); suggestList.style.display = "none"; };
    suggestList.appendChild(row);
  });
  suggestList.style.display = matches.length ? "block" : "none";
  if (listPanel.classList.contains("open")) renderList();
});
searchInput.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    const hit = searchMatches(searchInput.value.trim(), 1)[0];
    if (hit) { focusNode(hit.n.id, true); suggestList.style.display = "none"; }
  }
});

document.getElementById("homeBtn").addEventListener("click", () => {
  activeTypeFilter = null;
  filterChip.style.display = "none";
  searchInput.value = "";
  suggestList.style.display = "none";
  closePanel();
  Graph.zoomToFit(500, 60);
});

const listToggleBtn = document.getElementById("listToggleBtn");
listToggleBtn.addEventListener("click", () => {
  const willOpen = !listPanel.classList.contains("open");
  listPanel.classList.toggle("open", willOpen);
  listToggleBtn.classList.toggle("active", willOpen);
  listToggleBtn.textContent = willOpen ? "🌐 Graph view" : "☰ List view";
  if (willOpen) renderList();
});

function renderList() {
  const q = searchInput.value.trim();
  const rows = q
    ? searchMatches(q).map(r => ({ n: r.n, snippet: r.snippet }))
    : (activeTypeFilter ? DATA.nodes.filter(n => n.type === activeTypeFilter) : DATA.nodes)
        .map(n => ({ n, snippet: "" }))
        .sort((a, b) => a.n.title.localeCompare(b.n.title));
  listCount.textContent = \`\${rows.length} docs\${activeTypeFilter ? \` · type: \${activeTypeFilter}\` : ""}\${q ? \` · search: "\${q}"\` : ""}\`;
  listBody.innerHTML = "";
  rows.forEach(({ n, snippet }) => {
    const shown = snippet || n.body.slice(0, 80).replace(/\\s+/g, " ");
    const tr = document.createElement("tr");
    tr.innerHTML = \`
      <td>\${escapeHtml(n.title)}</td>
      <td><span class="type-dot" style="background:\${colorFor(n.type)}"></span>\${n.type}</td>
      <td class="snippet">\${escapeHtml(shown)}</td>
    \`;
    tr.addEventListener("click", () => focusNode(n.id, true));
    listBody.appendChild(tr);
  });
}
</script>
</body>
</html>
`;
