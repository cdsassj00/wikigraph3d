import { SUPPORTED_EXT } from "./scan.js";
import { DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL } from "./ollama.js";

const SUPPORTED = JSON.stringify([...SUPPORTED_EXT]);

export function renderGuiHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>wikigraph3d</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #050816;
    --panel: rgba(10, 16, 32, .76);
    --panel-strong: rgba(13, 22, 43, .92);
    --line: rgba(151, 171, 214, .24);
    --text: #eef5ff;
    --muted: #94a3bd;
    --accent: #7dd3fc;
    --accent-2: #a7f3d0;
    --danger: #fda4af;
    --shadow: 0 24px 80px rgba(0, 0, 0, .36);
    --ease: cubic-bezier(.34,1.56,.64,1);
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: "Segoe UI", "Noto Sans KR", Arial, sans-serif; overflow: hidden; }
  button, input { font: inherit; }
  button { border: 0; cursor: pointer; }
  #space { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; background: radial-gradient(circle at 20% 20%, #18315d 0, transparent 34%), radial-gradient(circle at 80% 10%, #312064 0, transparent 32%), #050816; }
  .shell { position: relative; z-index: 1; min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
  header { height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; color: #dcecff; }
  .brand { display: flex; align-items: center; gap: 11px; font-weight: 760; letter-spacing: 0; }
  .mark { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; color: #06111f; background: linear-gradient(135deg, var(--accent), var(--accent-2)); box-shadow: 0 0 34px rgba(125, 211, 252, .34); }
  .mark svg, .btn svg, .icon-btn svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .status { color: var(--muted); font-size: 13px; }
  main { min-height: calc(100vh - 68px); display: grid; place-items: center; padding: 14px 22px; }
  .wizard { width: min(860px, calc(100vw - 32px)); min-height: min(650px, calc(100vh - 96px)); display: grid; grid-template-rows: auto 1fr auto; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); backdrop-filter: blur(22px); overflow: hidden; }
  .progress-wrap { padding: 18px 22px 0; }
  .progress-meta { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; margin-bottom: 8px; }
  .progress { height: 5px; border-radius: 999px; background: rgba(148, 163, 184, .22); overflow: hidden; }
  .progress span { display: block; height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width .42s ease; }
  .stage { position: relative; overflow: hidden; min-height: 0; }
  .step { position: absolute; inset: 0; padding: 24px 48px 20px; display: grid; align-content: start; gap: 13px; opacity: 0; transform: translateX(36px) scale(.985); pointer-events: none; overflow-y: auto; transition: opacity .32s ease, transform .38s ease; }
  .step.active { opacity: 1; transform: none; pointer-events: auto; }
  .kicker { color: var(--accent-2); font-size: 13px; font-weight: 720; letter-spacing: 0; }
  h1, h2 { margin: 0; letter-spacing: 0; }
  h1 { font-size: clamp(34px, 6vw, 64px); line-height: 1.02; max-width: 760px; }
  h2 { font-size: clamp(25px, 3.2vw, 38px); line-height: 1.08; max-width: 720px; }
  p { margin: 0; color: var(--muted); line-height: 1.58; font-size: 15px; max-width: 680px; }
  .line-reveal { display: block; overflow: hidden; }
  .line-reveal span { display: block; transform: translateY(112%); transition: transform .7s cubic-bezier(.2,.7,.2,1); }
  .step.active .line-reveal span { transform: none; }
  .step.active .line-reveal:nth-child(2) span { transition-delay: .08s; }
  .step.active .line-reveal:nth-child(3) span { transition-delay: .16s; }
  .choice-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 4px; }
  .choice {
    min-height: 108px; display: grid; align-content: start; gap: 8px; text-align: left; padding: 14px;
    border-radius: 10px; background: rgba(15, 24, 48, .72); color: var(--text); border: 1px solid var(--line);
    transition: transform .45s var(--ease), border-color .18s ease, background .18s ease;
  }
  .choice:hover { transform: translateY(-4px); border-color: rgba(125, 211, 252, .72); background: rgba(19, 32, 63, .82); }
  .choice strong { font-size: 18px; }
  .choice span { color: var(--muted); line-height: 1.46; font-size: 14px; }
  .folder-input { display: none; }
  .field { display: grid; gap: 7px; color: #c7d5ed; font-size: 13px; font-weight: 650; }
  .path-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: end; }
  .path-actions .btn { min-width: 128px; white-space: nowrap; }
  input[type="text"], input[type="number"] {
    width: 100%; min-height: 40px; border-radius: 8px; border: 1px solid rgba(166, 185, 220, .3);
    background: rgba(4, 9, 20, .58); color: var(--text); padding: 9px 11px; outline: none;
  }
  input[type="text"]:focus, input[type="number"]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(125, 211, 252, .13); }
  .ai-grid, .review-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .review-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .metric { border: 1px solid var(--line); border-radius: 10px; background: rgba(6, 12, 26, .58); padding: 10px 14px; min-height: 66px; }
  .metric strong { display: block; font-size: 20px; color: #fff; overflow-wrap: anywhere; }
  .metric span { color: var(--muted); font-size: 12px; }
  .folder-metrics .metric { min-height: 50px; padding: 8px 10px; }
  .folder-metrics .metric strong { font-size: 16px; }
  .toggle { display: flex; gap: 10px; align-items: flex-start; color: #d8e5f8; }
  .toggle input { margin-top: 4px; }
  .notice { border: 1px solid rgba(125, 211, 252, .24); background: rgba(125, 211, 252, .08); border-radius: 10px; padding: 11px 13px; color: #cfe9ff; font-size: 14px; line-height: 1.45; }
  .log { min-height: 118px; border: 1px solid var(--line); border-radius: 10px; background: rgba(3, 7, 18, .62); color: #cbd5e1; padding: 14px; font-family: Consolas, "Cascadia Mono", monospace; font-size: 13px; white-space: pre-wrap; overflow: auto; }
  .loading-wrap { display: grid; place-items: center; gap: 16px; padding: 8px 0 2px; }
  .spinner {
    width: 82px; height: 82px; border-radius: 50%;
    background: conic-gradient(from 40deg, transparent 0 10%, var(--accent), var(--accent-2), transparent 76%);
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0);
    mask: radial-gradient(farthest-side, transparent calc(100% - 8px), #000 0);
    animation: spin .9s linear infinite;
  }
  .loading-caption { color: #d8e8ff; font-size: 14px; }
  .error { color: var(--danger); }
  .footer { min-height: 76px; padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--line); background: rgba(5, 10, 23, .38); }
  .footnote { color: var(--muted); font-size: 13px; }
  .btn, .icon-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px;
    padding: 10px 14px; border-radius: 8px; color: #03111d; background: linear-gradient(135deg, var(--accent), var(--accent-2));
    font-weight: 760; text-decoration: none; transition: transform .5s var(--ease), filter .2s ease;
  }
  .btn.secondary, .icon-btn.secondary { color: #dcecff; background: rgba(15, 24, 48, .78); border: 1px solid var(--line); }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn:not(:disabled):active { animation: squash .34s var(--ease); }
  .link-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .hidden { display: none !important; }
  .shake { animation: shake .42s ease; }
  @keyframes squash { 35% { transform: scale(.93, .84); } 72% { transform: scale(1.05, 1.08); } }
  @keyframes shake { 30%, 50%, 70% { transform: translateX(-7px); } 40%, 60% { transform: translateX(7px); } }
  @keyframes spin { to { transform: rotate(1turn); } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation: none !important; transition: none !important; }
    .line-reveal span, .step { transform: none !important; }
  }
  @media (max-width: 760px) {
    html, body { overflow-y: auto; }
    main { display: block; min-height: auto; padding: 12px; }
    .wizard { min-height: auto; grid-template-rows: auto auto auto; }
    .stage { overflow: visible; }
    .step { position: relative; inset: auto; display: none; padding: 28px 22px; opacity: 1; transform: none; pointer-events: none; overflow: visible; }
    .step.active { display: grid; pointer-events: auto; }
    .choice-grid, .ai-grid, .review-grid { grid-template-columns: 1fr; }
    .path-actions { grid-template-columns: 1fr; }
    .footer { align-items: stretch; flex-direction: column; }
    .link-actions { flex-direction: column; }
  }
</style>
</head>
<body>
<canvas id="space" aria-hidden="true"></canvas>
<div class="shell">
  <header>
    <div class="brand">
      <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M4 8l8-5 8 5M4 16l8 5 8-5M4 8v8M20 8v8"/></svg></span>
      <span>wikigraph3d</span>
    </div>
    <div class="status" id="statusText">대기 중</div>
  </header>

  <main>
    <section class="wizard" id="wizard">
      <div class="progress-wrap">
        <div class="progress-meta"><span id="stepLabel">시작</span><span id="progressText">0%</span></div>
        <div class="progress"><span id="progressBar"></span></div>
      </div>

      <div class="stage">
        <section class="step active" data-step="0">
          <div class="kicker">Question 1</div>
          <h2>
            <span class="line-reveal"><span>지식그래프를 만들 폴더에 문서를 담고,</span></span>
            <span class="line-reveal"><span>폴더를 지정하세요</span></span>
          </h2>
          <p>폴더 하나를 연결하면 파일 이름과 본문을 파싱해 검색 가능한 3D 위키를 만듭니다. 원본 파일 위치까지 남기려면 로컬 경로 입력을 쓰세요.</p>
          <input id="folderInput" class="folder-input" type="file" webkitdirectory directory multiple>
          <div class="choice-grid">
            <label class="choice" for="folderInput">
              <strong>폴더 선택</strong>
              <span>브라우저 권한 창에서 폴더를 허용합니다. 원본 절대경로는 브라우저가 숨깁니다.</span>
            </label>
            <div class="choice">
              <strong>로컬 경로 입력</strong>
              <span>C:\\Users\\me\\Documents 처럼 입력하면 원본 파일 위치가 그래프에 남습니다.</span>
              <div class="path-actions">
                <label class="field">폴더 경로
                  <input id="folderPath" type="text" placeholder="C:\\Users\\me\\Documents\\research">
                </label>
                <button id="usePathBtn" class="btn secondary" type="button">이 경로 사용</button>
              </div>
            </div>
          </div>
          <div id="folderMetrics" class="review-grid folder-metrics hidden">
            <div class="metric"><strong id="fileCount">0</strong><span>지원 파일</span></div>
            <div class="metric"><strong id="totalSize">0 MB</strong><span>선택 용량</span></div>
            <div class="metric"><strong id="folderName">-</strong><span>폴더</span></div>
            <div class="metric"><strong id="sourceMode">-</strong><span>연결 방식</span></div>
          </div>
          <div id="folderNotice" class="notice hidden"></div>
        </section>

        <section class="step" data-step="1">
          <div class="kicker">Question 2</div>
          <h2>AI API가 있으면 더 나은 위키 에이전트가 완성됩니다</h2>
          <p>없어도 기본 그래프와 문서검색은 바로 됩니다. 지금은 로컬 Ollama를 먼저 지원하며, 체크하면 문서별 요약과 태그를 로컬 모델이 만듭니다.</p>
          <label class="toggle">
            <input id="useOllama" type="checkbox">
            <span>생성할 때 Ollama로 문서별 요약과 태그도 만들기</span>
          </label>
          <div class="ai-grid">
            <label class="field">모델
              <input id="ollamaModel" type="text" value="${DEFAULT_OLLAMA_MODEL}">
            </label>
            <label class="field">Ollama 주소
              <input id="ollamaUrl" type="text" value="${DEFAULT_OLLAMA_BASE_URL}">
            </label>
            <label class="field">AI 처리 문서 수 제한
              <input id="ollamaLimit" type="number" min="1" placeholder="비워두면 전체">
            </label>
          </div>
          <button id="checkOllamaBtn" class="btn secondary" type="button">Ollama 확인</button>
          <div id="ollamaNotice" class="notice">Ollama가 없어도 그래프와 문서검색은 만들 수 있습니다.</div>
        </section>

        <section class="step" data-step="2">
          <div class="kicker">Build</div>
          <h2>그래프 생성중</h2>
          <p id="loadingText">문서를 파싱하고 자동 연결을 계산합니다. 완료되면 새 탭에서 그래프가 열립니다.</p>
          <div class="loading-wrap" aria-live="polite">
            <div class="spinner" aria-hidden="true"></div>
            <div class="loading-caption">검색 인덱스와 문서 연결을 준비하는 중입니다.</div>
          </div>
          <div class="review-grid">
            <div class="metric"><strong id="reviewFolder">-</strong><span>폴더</span></div>
            <div class="metric"><strong id="reviewFiles">0</strong><span>지원 파일</span></div>
            <div class="metric"><strong id="reviewAI">끄기</strong><span>로컬 AI</span></div>
            <div class="metric"><strong id="reviewPath">-</strong><span>파일 위치</span></div>
          </div>
          <div id="buildLog" class="log">생성을 시작합니다.</div>
        </section>

        <section class="step" data-step="3">
          <div class="kicker">Complete</div>
          <h2>그래프가 완성되었습니다</h2>
          <p id="resultText">새 그래프를 열어 문서를 검색하고 연결을 따라가세요. 첫 진입 가이드가 화면의 핵심 기능을 하이라이트합니다.</p>
          <div class="review-grid">
            <div class="metric"><strong id="nodesOut">0</strong><span>문서 노드</span></div>
            <div class="metric"><strong id="linksOut">0</strong><span>연결</span></div>
            <div class="metric"><strong id="extractedOut">0</strong><span>파싱 성공</span></div>
            <div class="metric"><strong id="aiOut">0</strong><span>AI 요약</span></div>
          </div>
          <div class="notice">문서검색은 그래프 화면 왼쪽 위 검색창에서 합니다. 문서를 클릭하면 연결된 문서와 파일 경로 액션이 상세 패널에 표시됩니다.</div>
          <div class="link-actions">
            <a id="openGraph" class="btn" target="_blank" rel="noreferrer">그래프 열기</a>
            <button id="downloadGraph" class="btn secondary" type="button">HTML 저장</button>
          </div>
        </section>
      </div>

      <div class="footer">
        <div class="footnote" id="footnote">문서는 외부 서버가 아니라 이 PC의 로컬 앱에서 처리됩니다.</div>
        <div class="link-actions">
          <button id="backBtn" class="btn secondary" type="button" disabled>이전</button>
          <button id="nextBtn" class="btn" type="button">다음</button>
        </div>
      </div>
    </section>
  </main>
</div>

<script>
const SUPPORTED_EXT = new Set(${SUPPORTED});
const REDUCE = matchMedia("(prefers-reduced-motion:reduce)").matches;
const stepLabel = document.getElementById("stepLabel");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const folderInput = document.getElementById("folderInput");
const folderPath = document.getElementById("folderPath");
const usePathBtn = document.getElementById("usePathBtn");
const useOllama = document.getElementById("useOllama");
const ollamaModel = document.getElementById("ollamaModel");
const ollamaUrl = document.getElementById("ollamaUrl");
const ollamaLimit = document.getElementById("ollamaLimit");
const checkOllamaBtn = document.getElementById("checkOllamaBtn");
const ollamaNotice = document.getElementById("ollamaNotice");
const folderNotice = document.getElementById("folderNotice");
const folderMetrics = document.getElementById("folderMetrics");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const buildLog = document.getElementById("buildLog");
const loadingText = document.getElementById("loadingText");
const downloadGraph = document.getElementById("downloadGraph");
let current = 0;
let selectedFiles = [];
let selectedFolderName = "";
let selectedSize = 0;
let mode = "";
let built = null;
let pendingGraphWindow = null;

function setProgress(percent, label) {
  const p = Math.max(0, Math.min(100, percent));
  progressBar.style.width = p + "%";
  progressText.textContent = Math.round(p) + "%";
  if (label) stepLabel.textContent = label;
}

function setStep(next) {
  current = Math.max(0, Math.min(3, next));
  document.querySelectorAll(".step").forEach(function(step) {
    step.classList.toggle("active", Number(step.dataset.step) === current);
  });
  backBtn.disabled = current === 0 || current >= 2;
  nextBtn.classList.toggle("hidden", current >= 2);
  nextBtn.textContent = current === 1 ? "그래프 만들기" : "다음";
  const labels = ["폴더 지정", "AI 연결", "그래프 생성중", "완료"];
  const progress = [18, 46, 68, 100];
  setProgress(progress[current], labels[current]);
  statusText.textContent = labels[current];
  if (current === 2) refreshReview();
}

function escapeText(value) {
  return String(value || "").replace(/[&<>"']/g, function(ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function extOf(file) {
  const name = (file.webkitRelativePath || file.name || "").toLowerCase();
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx);
}

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / 1024 / 1024;
  return mb >= 100 ? Math.round(mb) + " MB" : mb.toFixed(1) + " MB";
}

function folderNameFrom(files) {
  const rel = files[0] && (files[0].webkitRelativePath || files[0].name);
  if (!rel || !rel.includes("/")) return "선택됨";
  return rel.split("/")[0] || "선택됨";
}

function lastPathPart(value) {
  const clean = String(value || "").replace(/\\\\/g, "/").replace(/\\/+$/, "");
  return clean.split("/").filter(Boolean).pop() || "documents";
}

function syncFolderMetrics() {
  folderMetrics.classList.toggle("hidden", !mode);
  document.getElementById("fileCount").textContent = mode === "path" ? "확인 예정" : selectedFiles.length;
  document.getElementById("totalSize").textContent = mode === "path" ? "-" : formatSize(selectedSize);
  document.getElementById("folderName").textContent = selectedFolderName || "-";
  document.getElementById("sourceMode").textContent = mode === "path" ? "경로 입력" : mode === "upload" ? "폴더 선택" : "-";
}

function refreshSelection() {
  const all = Array.from(folderInput.files || []);
  selectedFiles = all.filter(function(file) {
    return SUPPORTED_EXT.has(extOf(file)) && !file.name.startsWith("~$");
  });
  selectedSize = selectedFiles.reduce(function(sum, file) { return sum + file.size; }, 0);
  if (selectedFiles.length) {
    selectedFolderName = folderNameFrom(selectedFiles);
    mode = "upload";
    syncFolderMetrics();
    folderNotice.classList.remove("hidden");
    folderNotice.textContent = selectedFiles.length + "개 문서를 찾았습니다. 다음으로 AI 연결 여부만 정하면 그래프를 만들 수 있습니다.";
  } else {
    selectedFolderName = "";
    mode = "";
    syncFolderMetrics();
    folderNotice.classList.remove("hidden");
    folderNotice.textContent = "지원되는 문서를 찾지 못했습니다. Markdown, TXT, PDF, DOCX, PPTX 파일이 들어있는 폴더를 선택하세요.";
  }
}

function refreshReview() {
  document.getElementById("reviewFolder").textContent = selectedFolderName || "-";
  document.getElementById("reviewFiles").textContent = mode === "path" ? "스캔 예정" : selectedFiles.length;
  document.getElementById("reviewAI").textContent = useOllama.checked ? "켜기" : "끄기";
  document.getElementById("reviewPath").textContent = mode === "path" ? "원본 경로" : "임시 사본";
  buildLog.textContent = mode === "path"
    ? "원본 폴더를 서버가 직접 스캔합니다. 파일/폴더 위치 액션이 원본 경로 기준으로 들어갑니다."
    : "브라우저가 선택한 파일을 로컬 서버로 전달합니다. 원본 절대경로는 브라우저 보안상 숨겨집니다.";
}

function showError(message) {
  const html = '<span class="error">' + escapeText(message) + "</span>";
  if (current === 0) {
    folderNotice.classList.remove("hidden");
    folderNotice.innerHTML = html;
  }
  if (current === 1) ollamaNotice.innerHTML = html;
  buildLog.innerHTML = html;
  document.getElementById("wizard").classList.remove("shake");
  void document.getElementById("wizard").offsetWidth;
  document.getElementById("wizard").classList.add("shake");
}

function validateCurrent() {
  if (current === 0 && !mode) {
    showError("폴더를 선택하거나 로컬 경로를 입력하세요.");
    return false;
  }
  if (current === 0 && mode === "upload" && selectedFiles.length === 0) {
    showError("지원되는 문서가 들어있는 폴더를 선택하세요.");
    return false;
  }
  return true;
}

folderInput.addEventListener("change", refreshSelection);
usePathBtn.addEventListener("click", function() {
  const value = folderPath.value.trim();
  if (!value) {
    showError("폴더 경로를 입력하세요.");
    return;
  }
  selectedFolderName = lastPathPart(value);
  selectedFiles = [];
  selectedSize = 0;
  mode = "path";
  syncFolderMetrics();
  folderNotice.classList.remove("hidden");
  folderNotice.textContent = "로컬 경로를 사용합니다. 그래프 안의 파일 열기/폴더 열기 액션이 원본 경로 기준으로 들어갑니다.";
});

checkOllamaBtn.addEventListener("click", async function() {
  ollamaNotice.textContent = "Ollama 상태를 확인합니다...";
  try {
    const params = new URLSearchParams({ model: ollamaModel.value.trim(), url: ollamaUrl.value.trim() });
    const res = await fetch("/api/ollama?" + params);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || "Ollama 확인 실패");
    ollamaNotice.textContent = data.modelAvailable
      ? "Ollama가 실행 중이고 모델도 준비되어 있습니다."
      : "Ollama는 실행 중이지만 모델이 없습니다. ollama pull " + ollamaModel.value.trim() + " 를 실행하세요.";
  } catch (err) {
    ollamaNotice.textContent = "Ollama를 찾지 못했습니다. 앱을 실행하거나 ollama serve 후 다시 확인하세요. " + err.message;
  }
});

function prepareGraphWindow() {
  try {
    const win = window.open("", "_blank");
    if (!win) return null;
    win.document.write('<!doctype html><title>wikigraph3d</title><body style="margin:0;background:#050816;color:#dcecff;font-family:Segoe UI,Noto Sans KR,sans-serif;display:grid;place-items:center;min-height:100vh"><div>그래프를 준비하고 있습니다...</div></body>');
    win.document.close();
    return win;
  } catch {
    return null;
  }
}

function openGraphWhenReady(data) {
  if (pendingGraphWindow && !pendingGraphWindow.closed) {
    pendingGraphWindow.location.href = data.graphUrl;
    pendingGraphWindow = null;
    return true;
  }
  const opened = window.open(data.graphUrl, "_blank", "noopener");
  return Boolean(opened);
}

function wait(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function saveGraphHtml() {
  if (!built || !built.graphUrl) {
    showError("저장할 그래프가 아직 없습니다.");
    return;
  }

  const originalText = downloadGraph.textContent;
  downloadGraph.disabled = true;
  downloadGraph.textContent = "저장 준비...";

  try {
    const res = await fetch(built.graphUrl, { cache: "no-store" });
    const html = await res.text();
    if (!res.ok) throw new Error(html || "그래프 HTML을 읽지 못했습니다.");

    const fileName = built.downloadName || "wikigraph3d.html";
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });

    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: "HTML file",
          accept: { "text/html": [".html", ".htm"] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
    }

    downloadGraph.textContent = "저장됨";
    setTimeout(function() { downloadGraph.textContent = originalText; }, 1400);
  } catch (err) {
    if (err && err.name === "AbortError") {
      downloadGraph.textContent = originalText;
      return;
    }
    showError("HTML 저장에 실패했습니다. 그래프 열기 후 브라우저의 저장 기능을 사용해도 됩니다. " + err.message);
    downloadGraph.textContent = originalText;
  } finally {
    downloadGraph.disabled = false;
  }
}

async function buildGraph() {
  if (!mode) {
    setStep(0);
    showError("폴더를 먼저 연결하세요.");
    return;
  }

  const startedAt = performance.now();
  nextBtn.disabled = true;
  nextBtn.classList.add("hidden");
  backBtn.disabled = true;
  refreshReview();
  setProgress(70, "파일 준비");
  loadingText.textContent = "파일을 준비하고 있습니다...";
  buildLog.textContent = "파일을 준비하고 있습니다...";

  try {
    let res;
    if (mode === "upload") {
      const form = new FormData();
      form.append("folderName", selectedFolderName || "documents");
      form.append("ollama", useOllama.checked ? "1" : "0");
      form.append("ollamaModel", ollamaModel.value.trim());
      form.append("ollamaUrl", ollamaUrl.value.trim());
      if (ollamaLimit.value.trim()) form.append("ollamaLimit", ollamaLimit.value.trim());
      selectedFiles.forEach(function(file) {
        form.append("files", file, file.webkitRelativePath || file.name);
      });
      setProgress(80, "로컬 전달");
      loadingText.textContent = "브라우저가 선택한 파일을 로컬 서버로 전달합니다...";
      buildLog.textContent = "선택한 파일을 이 PC의 로컬 서버로 전달합니다...";
      res = await fetch("/api/build", { method: "POST", body: form });
    } else {
      setProgress(80, "폴더 스캔");
      loadingText.textContent = "원본 폴더를 직접 스캔합니다...";
      buildLog.textContent = "원본 폴더를 직접 스캔합니다...";
      res = await fetch("/api/build-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderPath: folderPath.value.trim(),
          folderName: selectedFolderName || "documents",
          ollama: useOllama.checked,
          ollamaModel: ollamaModel.value.trim(),
          ollamaUrl: ollamaUrl.value.trim(),
          ollamaLimit: ollamaLimit.value.trim() || null,
        }),
      });
    }

    setProgress(92, "그래프 생성");
    loadingText.textContent = "문서 연결과 검색 인덱스를 그래프 HTML로 조립합니다...";
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.message || "그래프 생성 실패");
    built = data;
    document.getElementById("nodesOut").textContent = data.counts.nodes;
    document.getElementById("linksOut").textContent = data.counts.links;
    document.getElementById("extractedOut").textContent = data.counts.extracted + "/" + data.counts.files;
    document.getElementById("aiOut").textContent = data.ai && data.ai.enriched ? data.ai.enriched : 0;
    document.getElementById("openGraph").href = data.graphUrl;
    downloadGraph.dataset.graphUrl = data.graphUrl;
    downloadGraph.dataset.fileName = data.downloadName || "wikigraph3d.html";
    const elapsed = performance.now() - startedAt;
    if (elapsed < 900) await wait(900 - elapsed);
    const autoOpened = openGraphWhenReady(data);
    document.getElementById("resultText").textContent = data.title + " 그래프가 완성되었습니다. " +
      (autoOpened ? "새 탭에서 열었고, 첫 진입 가이드가 사용법을 하이라이트합니다." : "브라우저가 새 탭을 막았다면 아래 그래프 열기 버튼을 누르세요.");
    setProgress(100, "완료");
    setStep(3);
  } catch (err) {
    setProgress(70, "실패");
    if (pendingGraphWindow && !pendingGraphWindow.closed) pendingGraphWindow.close();
    pendingGraphWindow = null;
    showError(err.message);
    nextBtn.classList.remove("hidden");
    nextBtn.textContent = "다시 만들기";
  } finally {
    nextBtn.disabled = false;
    backBtn.disabled = current === 0 || current === 3;
  }
}

backBtn.addEventListener("click", function() { setStep(current - 1); });
downloadGraph.addEventListener("click", saveGraphHtml);
nextBtn.addEventListener("click", function() {
  if (current === 0 && validateCurrent()) setStep(1);
  else if (current === 1) {
    pendingGraphWindow = prepareGraphWindow();
    setStep(2);
    buildGraph();
  } else if (current === 2) {
    pendingGraphWindow = prepareGraphWindow();
    buildGraph();
  }
});

function runConstellation() {
  const canvas = document.getElementById("space");
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1;
  const stars = [];
  function fit() {
    dpr = Math.min(2, devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.length = 0;
    const count = Math.max(70, Math.min(140, Math.floor(w * h / 10500)));
    for (let i = 0; i < count; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .24, vy: (Math.random() - .5) * .24, r: .7 + Math.random() * 1.7 });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(226, 242, 255, .82)";
    for (const s of stars) {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0 || s.x > w) s.vx *= -1;
      if (s.y < 0 || s.y > h) s.vy *= -1;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(125, 211, 252, .16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i], b = stars[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 92) {
          ctx.globalAlpha = 1 - dist / 92;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    if (!REDUCE) requestAnimationFrame(frame);
  }
  addEventListener("resize", fit, { passive: true });
  fit();
  frame();
}

runConstellation();
setStep(0);
</script>
</body>
</html>`;
}
