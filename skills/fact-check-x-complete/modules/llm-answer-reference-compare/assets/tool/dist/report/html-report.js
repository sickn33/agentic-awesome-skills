import { buildReferenceMatrix } from "./reference-matrix.js";
import { sourceDescriptor } from "./source-level.js";
const md = { render: renderMarkdown };

function renderMarkdown(value) {
    const lines = value.replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    let listType = "";
    const closeList = () => {
        if (listType) {
            output.push(`</${listType}>`);
            listType = "";
        }
    };
    for (const line of lines) {
        const heading = line.match(/^(#{1,4})\s+(.+)$/);
        const unordered = line.match(/^[-*+]\s+(.+)$/);
        const ordered = line.match(/^\d+[.)]\s+(.+)$/);
        if (heading) {
            closeList();
            const level = Math.min(4, heading[1].length);
            output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        }
        else if (unordered || ordered) {
            const target = unordered ? "ul" : "ol";
            if (listType !== target) {
                closeList();
                listType = target;
                output.push(`<${target}>`);
            }
            output.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
        }
        else if (!line.trim()) {
            closeList();
        }
        else {
            closeList();
            output.push(`<p>${renderInline(line)}</p>`);
        }
    }
    closeList();
    return output.join("\n");
}

function renderInline(value) {
    return escapeHtml(value)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
}
export function renderHtmlReport(run) {
    const matrix = buildReferenceMatrix(run);
    const platforms = run.platforms;
    const platformLayout = platforms.length <= 3 ? "platform-layout-compact" : "platform-layout-dense";
    const platformHint = platforms.length <= 3 ? "等宽展示全部平台" : "横向滚动查看所有平台";
    const successCount = platforms.filter((platform) => platform.status === "success").length;
    const totalReferences = platforms.reduce((sum, platform) => sum + platform.references.length, 0);
    const totalSourceMentions = platforms.reduce((sum, platform) => sum + (platform.sourceMentions || []).length, 0);
    const maxReferences = Math.max(1, ...platforms.map((platform) => platform.references.length));
    const mostCitedPlatform = platforms.reduce((best, platform) => (platform.references.length > best.references.length ? platform : best), platforms[0]);
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>原始答案、参考文献与引用存证报告</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --panel-strong: #111827;
      --text: #172033;
      --muted: #667085;
      --subtle: #8a94a6;
      --border: #d9dee8;
      --line: #edf0f5;
      --soft: #eef7f4;
      --blue-soft: #eef4ff;
      --amber-soft: #fff6e6;
      --accent: #0f766e;
      --accent-strong: #0b5f59;
      --blue: #1d4ed8;
      --failed: #b42318;
      --ok: #087443;
      --shadow: 0 18px 50px rgba(17, 24, 39, 0.08);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 247, 249, 0.92) 340px),
        linear-gradient(90deg, rgba(15, 118, 110, 0.08), rgba(29, 78, 216, 0.05), rgba(161, 92, 0, 0.05));
      color: var(--text);
      line-height: 1.55;
    }
    a { color: var(--blue); overflow-wrap: anywhere; }
    .shell { max-width: 1440px; margin: 0 auto; padding: 18px 24px 44px; }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      background: rgba(246, 247, 249, 0.9);
      backdrop-filter: blur(14px);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      font-weight: 850;
    }
    .brand span:last-child { display: flex; flex-direction: column; line-height: 1.15; }
    .brand-en { color: var(--muted); font-size: 11px; font-weight: 720; }
    .brand-mark {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background:
        linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0)),
        linear-gradient(135deg, var(--accent), var(--blue));
      box-shadow: 0 10px 24px rgba(15, 118, 110, 0.24);
      flex: 0 0 auto;
    }
    .topnav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
      .topnav a {
      padding: 7px 10px;
      border: 1px solid rgba(217, 222, 232, 0.92);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      color: var(--text);
      font-size: 12px;
      font-weight: 760;
      text-decoration: none;
    }
    header.hero { margin: 8px 0 18px; }
    .hero-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(360px, 0.72fr);
      gap: 22px;
      align-items: stretch;
      padding: 24px;
      border: 1px solid rgba(217, 222, 232, 0.88);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow);
    }
    .hero-copy { min-width: 0; }
    h1 { margin: 0 0 10px; font-size: clamp(28px, 3.4vw, 48px); line-height: 1.04; letter-spacing: 0; }
    h2 { margin: 0; font-size: 21px; letter-spacing: 0; }
    h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
    .en {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .eyebrow {
      margin: 0 0 6px;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .question {
      margin-top: 16px;
      padding: 15px 16px;
      border-left: 4px solid var(--accent);
      background: #f9fbfc;
      color: var(--text);
      font-size: 15px;
    }
    .hero-side {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-content: start;
    }
    .metric {
      min-height: 104px;
      padding: 15px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(17, 24, 39, 0.05);
    }
    .metric:nth-child(1) { background: var(--panel-strong); color: white; border-color: var(--panel-strong); }
    .metric:nth-child(2) { background: var(--soft); }
    .metric:nth-child(3) { background: var(--blue-soft); }
    .metric:nth-child(4) { background: var(--amber-soft); }
    .metric strong {
      display: block;
      font-size: 30px;
      line-height: 1.1;
      color: inherit;
    }
    .metric span {
      display: block;
      margin-top: 7px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 720;
    }
    .metric:nth-child(1) span { color: rgba(255, 255, 255, 0.72); }
    .insight-bar {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin: 14px 0 0;
    }
    .insight {
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
      color: var(--muted);
      font-size: 13px;
    }
    .insight strong { display: block; color: var(--text); font-size: 15px; }
    section {
      margin-top: 18px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(217, 222, 232, 0.8);
      border-radius: 8px;
      box-shadow: 0 12px 40px rgba(17, 24, 39, 0.05);
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 16px;
      margin-bottom: 14px;
    }
    .section-head p { margin: 5px 0 0; color: var(--muted); font-size: 13px; }
      .section-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }
    .hint-pill {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 3px 10px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.82);
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
      white-space: nowrap;
    }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(var(--platform-count), minmax(0, 1fr));
      gap: 12px;
    }
    .status-item, .answer-card, .ref-list {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(17, 24, 39, 0.04);
    }
    .status-item {
      position: relative;
      overflow: hidden;
      padding: 14px;
    }
    .status-item::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--platform-accent, var(--accent));
    }
    .platform-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .platform-url {
      margin-top: 8px;
      color: var(--subtle);
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .coverage-track {
      height: 7px;
      border-radius: 999px;
      overflow: hidden;
      background: #edf1f5;
      margin: 12px 0 8px;
    }
    .coverage-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--platform-accent, var(--accent)), var(--blue));
    }
    .status-ok, .status-success { color: var(--ok); font-weight: 850; }
    .status-failed, .status-timeout, .status-login_required, .status-verification_required {
      color: var(--failed);
      font-weight: 850;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--soft);
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 850;
      white-space: nowrap;
    }
    .badge.status-failed, .badge.status-timeout, .badge.status-login_required, .badge.status-verification_required {
      background: #fff1f0;
      color: var(--failed);
    }
    .badge.neutral {
      background: #f2f4f7;
      color: #344054;
    }
    .comparison-scroll {
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 10px;
      scroll-snap-type: x proximity;
    }
    .comparison-scroll::-webkit-scrollbar { height: 10px; }
    .comparison-scroll::-webkit-scrollbar-thumb { background: #cfd6e2; border-radius: 999px; }
    .answer-grid {
      display: grid;
      grid-template-columns: repeat(var(--platform-count), minmax(0, 1fr));
      gap: 14px;
      align-items: start;
      width: 100%;
      min-width: 0;
    }
    .platform-layout-dense .answer-grid {
      grid-template-columns: repeat(var(--platform-count), minmax(320px, 1fr));
      width: max-content;
      min-width: 100%;
    }
    .answer-card {
      position: relative;
      overflow: hidden;
      scroll-snap-align: start;
    }
    .answer-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 4px;
      background: var(--platform-accent, var(--accent));
      z-index: 3;
    }
    .answer-head {
      position: sticky;
      top: 51px;
      z-index: 2;
      min-height: 66px;
      padding: 16px 16px 13px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
    }
    .answer-head h3, .ref-list-head h3, .platform-title h3 {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .answer-head h3::before, .ref-list-head h3::before, .platform-title h3::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--platform-accent, var(--accent));
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.09);
    }
    .answer-subtitle { margin-top: 2px; color: var(--subtle); font-size: 12px; }
    .answer-meta {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }
    .artifact-links {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 16px 0;
    }
    .artifact-links a {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 8px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: #ffffff;
      color: var(--blue);
      font-size: 12px;
      font-weight: 760;
      text-decoration: none;
    }
    .source-strip {
      margin: 10px 16px 0;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
      overflow: hidden;
    }
    .source-strip summary {
      cursor: pointer;
      padding: 10px 12px;
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 850;
      list-style: none;
    }
    .source-strip summary::-webkit-details-marker { display: none; }
    .source-strip-label {
      padding: 0 12px 8px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
    }
    .source-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 116px;
      overflow: auto;
      padding: 0 12px 12px;
    }
    .source-chip {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--soft);
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 800;
      text-decoration: none;
    }
    .answer-body {
      padding: 18px 20px 22px;
      height: 680px;
      overflow: auto;
      font-size: 15.5px;
      line-height: 1.82;
      background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
    }
    .answer-body h1, .answer-body h2, .answer-body h3 {
      margin: 22px 0 10px;
      color: #101828;
      font-size: 17px;
      line-height: 1.45;
    }
    .answer-body h1:first-child, .answer-body h2:first-child, .answer-body h3:first-child { margin-top: 0; }
    .answer-body p { margin: 0 0 12px; }
    .answer-body ul, .answer-body ol {
      margin: 8px 0 14px;
      padding-left: 22px;
    }
    .answer-body li { margin: 6px 0; }
    .answer-body table {
      min-width: 100%;
      margin: 10px 0 16px;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      font-size: 13px;
    }
    .answer-body th, .answer-body td {
      padding: 9px 10px;
      vertical-align: top;
    }
    .answer-body th {
      position: static;
      background: #f7f9fc;
    }
    .answer-body strong { font-weight: 800; }
    .answer-body p:first-child { margin-top: 0; }
    .answer-body p:last-child { margin-bottom: 0; }
    .answer-error {
      margin: 0;
      padding: 12px;
      border-radius: 8px;
      background: #fff1f0;
      color: var(--failed);
    }
    .cite-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      min-height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: #dff3ee;
      color: var(--accent-strong);
      font-size: 11px;
      font-weight: 850;
      text-decoration: none;
      vertical-align: 0.08em;
    }
    .table-wrap {
      overflow: visible;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--panel);
    }
    table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
    th, td {
      border-bottom: 1px solid var(--line);
      padding: 12px 14px;
      text-align: center;
      vertical-align: middle;
    }
    th {
      position: sticky;
      top: 0;
      background: #f3f6fa;
      color: #475467;
      font-size: 12px;
      font-weight: 850;
      z-index: 1;
    }
    tr:last-child td { border-bottom: 0; }
    td.mark { text-align: center; }
    #references th:first-child, #references td:first-child { width: 50%; }
    #references th:not(:first-child), #references td:not(:first-child) { width: auto; }
    #references th, #references td { overflow-wrap: anywhere; word-break: break-word; }
    .mark-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 52px;
      padding: 4px 9px;
      border-radius: 999px;
      background: var(--soft);
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 850;
    }
    .ref-title { font-weight: 760; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
    .ref-key { margin-top: 4px; color: var(--subtle); font-size: 12px; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
    .refs {
      display: grid;
      grid-template-columns: repeat(var(--platform-count), minmax(0, 1fr));
      gap: 14px;
      width: 100%;
      min-width: 0;
    }
    .platform-layout-dense .refs {
      grid-template-columns: repeat(var(--platform-count), minmax(280px, 1fr));
      width: max-content;
      min-width: 100%;
    }
    .ref-list {
      position: relative;
      padding: 15px;
      max-height: 620px;
      overflow: auto;
      scroll-snap-align: start;
    }
    .ref-list::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 4px;
      background: var(--platform-accent, var(--accent));
    }
    .ref-list-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .ref-list ol {
      display: grid;
      gap: 10px;
      margin: 0;
      padding-left: 22px;
    }
    .ref-list li {
      padding: 0 0 10px 3px;
      border-bottom: 1px solid var(--line);
    }
    .ref-list li:last-child { border-bottom: 0; padding-bottom: 0; }
    .ref-list li::marker { color: var(--accent); font-weight: 850; }
    .ref-snippet {
      margin-top: 7px;
      color: var(--muted);
      font-size: 12px;
    }
    .ref-snippet summary {
      cursor: pointer;
      color: var(--accent-strong);
      font-weight: 820;
    }
    .ref-snippet p {
      margin: 6px 0 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: #f7f9fc;
    }
    .muted { color: var(--muted); }
    .empty-state {
      margin: 0;
      padding: 14px;
      border: 1px dashed var(--border);
      border-radius: 8px;
      background: #fbfcfe;
      color: var(--muted);
    }
    .fine-print {
      margin: 20px 0 0;
      color: var(--subtle);
      font-size: 12px;
    }
    @media (max-width: 980px) {
      .hero-main { grid-template-columns: 1fr; }
      .insight-bar { grid-template-columns: 1fr; }
      .platform-count-4 .status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .platform-count-5 .status-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .shell { padding: 14px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .topnav { justify-content: flex-start; }
      .hero-main, section { padding: 16px; }
      .hero-side { grid-template-columns: 1fr; }
      .status-grid { grid-template-columns: 1fr; }
      .answer-grid, .platform-layout-dense .answer-grid,
      .refs, .platform-layout-dense .refs {
        grid-template-columns: none;
        grid-auto-flow: column;
        grid-auto-columns: minmax(86vw, 1fr);
        width: max-content;
        min-width: 100%;
      }
      .answer-body { height: 68vh; }
      h1 { font-size: 32px; }
      #references table, #references thead, #references tbody, #references tr, #references th, #references td { display: block; width: 100%; }
      #references thead { display: none; }
      #references tr { padding: 12px; border-bottom: 1px solid var(--line); }
      #references td { padding: 5px 0; border: 0; text-align: left; }
      #references td.mark { display: inline-block; width: auto; margin-right: 6px; }
    }
    @media print {
      .topbar { position: static; }
      body { background: #ffffff; }
      section, .hero-main, .metric, .answer-card, .status-item, .ref-list { box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="shell ${platformLayout} platform-count-${platforms.length}" style="--platform-count:${platforms.length}">
    <nav class="topbar">
      <div class="brand"><span class="brand-mark"></span><span>原始答案与引用存证<span class="brand-en">Raw Answers, References & Citations</span></span></div>
        <div class="topnav">
          <a href="#status">平台状态</a>
          <a href="#answers">答案对比</a>
          <a href="#references">来源矩阵</a>
          <a href="#per-platform">来源列表</a>
        </div>
      </nav>

    <header class="hero">
      <div class="hero-main">
        <div class="hero-copy">
          <p class="eyebrow">本地对比报告 / Local comparison report</p>
          <h1>原始答案、参考文献与引用存证报告</h1>
          <div class="question"><strong>问题 / Question</strong><br />${escapeHtml(run.question)}</div>
          <div class="insight-bar">
            <div class="insight"><strong>${escapeHtml(mostCitedPlatform?.label || "N/A")}</strong>捕获来源最多 / Most references</div>
            <div class="insight"><strong>${successCount === platforms.length ? "全部成功" : `${platforms.length - successCount} 个需关注`}</strong>平台运行状态 / Run health</div>
            <div class="insight"><strong>${escapeHtml(shortDate(run.createdAt))}</strong>本地生成 / Generated locally</div>
          </div>
        </div>
        <div class="hero-side">
          <div class="metric"><strong>${successCount}/${platforms.length}</strong><span>成功平台 / Successful platforms</span></div>
          <div class="metric"><strong>${totalReferences}</strong><span>捕获来源 / References captured</span></div>
          <div class="metric"><strong>${totalSourceMentions}</strong><span>无链接来源标签 / Source labels without URLs</span></div>
          <div class="metric"><strong>${matrix.length}</strong><span>去重来源 / Unique references</span></div>
          <div class="metric"><strong>${Math.round(totalReferences / Math.max(1, platforms.length))}</strong><span>平台均值 / Average per platform</span></div>
        </div>
      </div>
    </header>

    <section id="status">
      <div class="section-head">
        <div>
          <p class="eyebrow">运行状态 / Run health</p>
          <h2>平台状态<span class="en">Platform Status</span></h2>
          <p>每个平台的抓取状态、来源覆盖和运行耗时。 / Capture status, source coverage, and runtime.</p>
        </div>
        <span class="badge neutral">${platforms.length} 个平台</span>
      </div>
      <div class="status-grid">
        ${platforms.map((platform) => renderStatusCard(platform, maxReferences)).join("\n")}
      </div>
    </section>

    <section id="answers">
      <div class="section-head">
        <div>
          <p class="eyebrow">横向答案 / Side-by-side answers</p>
          <h2>答案对比<span class="en">Answer Comparison</span></h2>
          <p>仅展示平台原生返回的逐句引用关系；没有原生标号时不会自动猜测。 / Only platform-provided sentence-level citations are linked.</p>
        </div>
        <div class="section-actions"><span class="hint-pill">${platformHint}</span></div>
      </div>
      <div class="comparison-scroll" aria-label="答案横向对比">
        <div class="answer-grid">
          ${platforms.map(renderAnswerCard).join("\n")}
        </div>
      </div>
    </section>

    <section id="references">
      <div class="section-head">
        <div>
          <p class="eyebrow">来源重合 / Source overlap</p>
          <h2>来源矩阵<span class="en">Reference Comparison</span></h2>
          <p>每行是去重后的来源，并标记哪些平台引用过。 / Deduplicated sources mapped across platforms.</p>
        </div>
        <span class="badge neutral">${matrix.length} 个去重来源</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>参考来源 / Reference</th>
              ${platforms.map((platform) => `<th>${escapeHtml(platform.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${matrix.length
        ? matrix
            .map((row) => `<tr>
              <td><div class="ref-title"><a href="${escapeAttribute(row.url)}">${escapeHtml(row.title)}</a></div><div class="ref-key">${escapeHtml(row.key)}</div></td>
              ${platforms
            .map((platform) => `<td class="mark">${row.platforms[platform.platform] ? `<span class="mark-chip">已引用</span>` : ""}</td>`)
            .join("")}
            </tr>`)
            .join("\n")
        : `<tr><td colspan="${platforms.length + 1}" class="muted">未捕获参考来源 / No references captured.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section id="per-platform">
      <div class="section-head">
        <div>
          <p class="eyebrow">原始来源列表 / Captured source lists</p>
          <h2>各平台参考来源<span class="en">Per-Platform References</span></h2>
          <p>保留各平台原始来源列表；如果平台只给来源列表而不给逐句引用，这里会如实呈现。 / Original source lists, including snippets when captured.</p>
        </div>
        <div class="section-actions"><span class="hint-pill">${platforms.length <= 3 ? "等宽展示各平台来源" : "按平台横向对比来源"}</span></div>
      </div>
      <div class="comparison-scroll" aria-label="参考来源横向对比">
        <div class="refs">
          ${platforms.map(renderReferenceList).join("\n")}
        </div>
      </div>
    </section>
    <p class="fine-print">本报告展示原始答案、引用与现场存证；后续知识点对比与权威证据核验由独立阶段处理。</p>
  </main>
</body>
</html>`;
}
function renderStatusCard(platform, maxReferences) {
    const coverage = Math.round((platform.references.length / maxReferences) * 100);
    const sourceMentionCount = (platform.sourceMentions || []).length;
    return `<article class="status-item" style="${platformStyle(platform.platform)}">
    <div class="platform-title">
      <h3>${escapeHtml(platform.label)}</h3>
      <span class="badge status-${platform.status}">${escapeHtml(statusLabel(platform.status))}</span>
    </div>
    <div class="coverage-track"><div class="coverage-fill" style="width: ${coverage}%"></div></div>
    <div class="muted">捕获 ${platform.references.length} 条可回溯来源 / ${platform.references.length} references${sourceMentionCount ? ` · ${sourceMentionCount} 个无链接来源标签` : ""}${platform.durationMs ? ` · ${Math.round(platform.durationMs / 1000)}s` : ""}</div>
    <div class="platform-url">${escapeHtml(platform.url)}</div>
  </article>`;
}
function renderAnswerCard(platform) {
    const body = platform.status === "success"
        ? linkInlineCitations(md.render(formatAnswerForDisplay(cleanAnswerForReport(platform.answerMarkdown))), platform)
        : `<p class="answer-error">${escapeHtml(platform.error || platform.status)}</p>`;
    return `<article class="answer-card" style="${platformStyle(platform.platform)}">
    <div class="answer-head">
      <div>
        <h3>${escapeHtml(platform.label)}</h3>
        <div class="answer-subtitle">${platform.answerMarkdown.length} 字符 / characters</div>
      </div>
      <div class="answer-meta">
        <span class="badge status-${platform.status}">${escapeHtml(statusLabel(platform.status))}</span>
        <span class="badge neutral">${platform.references.length} 来源</span>
        ${(platform.sourceMentions || []).length ? `<span class="badge neutral">${platform.sourceMentions.length} 无链接标签</span>` : ""}
      </div>
    </div>
    ${renderArtifactLinks(platform)}
    ${renderSourceStrip(platform)}
    <div class="answer-body">${body}</div>
  </article>`;
}
function renderSourceStrip(platform) {
    const sourceMentions = platform.sourceMentions || [];
    if (platform.status !== "success") {
        return "";
    }
    if (platform.references.length === 0 && sourceMentions.length > 0) {
        const labels = sourceMentions
            .map((mention) => `<span class="source-chip">[${escapeHtml(mention.marker || "")}] ${escapeHtml(mention.label)}</span>`)
            .join("");
        return `<details class="source-strip" open>
    <summary>页面来源标签 · ${sourceMentions.length} 个（无可访问 URL）</summary>
    <div class="source-strip-label">页面显示了来源名称，但未暴露原文链接或摘录，因此不会把它们伪装成参考文献。</div>
    <div class="source-chips">${labels}</div>
  </details>`;
    }
    if (platform.references.length === 0 || answerHasInlineCitations(platform)) {
        return "";
    }
    const chips = platform.references
        .slice(0, 12)
        .map((reference, index) => {
        const marker = displayMarker(reference, index);
        const title = reference.title || reference.text || reference.url;
        return `<a class="source-chip" href="#${referenceId(platform.platform, reference)}">[${escapeHtml(marker)}] ${escapeHtml(title)}</a>`;
    })
        .join("");
    const overflow = platform.references.length > 12
        ? `<span class="source-chip">+${platform.references.length - 12} 更多</span>`
        : "";
    return `<details class="source-strip">
    <summary>来源概览 · ${platform.references.length} 条</summary>
    <div class="source-strip-label">该平台返回或页面暴露的来源列表；如果答案没有逐句标号，这里不自动猜测引用关系。<span class="en">Source list only when sentence-level mappings are not exposed.</span></div>
    <div class="source-chips">${chips}${overflow}</div>
  </details>`;
}
function renderReferenceList(platform) {
    const sourceMentions = platform.sourceMentions || [];
    return `<article class="ref-list" style="${platformStyle(platform.platform)}">
    <div class="ref-list-head">
      <h3>${escapeHtml(platform.label)}</h3>
      <span class="badge neutral">${platform.references.length} 来源</span>
    </div>
    ${platform.references.length
        ? `<ol>${platform.references.map((reference, index) => renderReferenceItem(platform, reference, index)).join("")}</ol>`
        : `<p class="empty-state">未捕获可访问的参考文献 URL / No reference URLs captured.</p>`}
    ${sourceMentions.length
        ? `<div class="ref-snippet"><strong>页面显示的来源标签（无 URL）</strong><ul>${sourceMentions.map((mention) => `<li>${escapeHtml(mention.label)}${mention.occurrenceCount > 1 ? `（出现 ${mention.occurrenceCount} 次）` : ""}</li>`).join("")}</ul></div>`
        : ""}
  </article>`;
}
function renderReferenceItem(platform, reference, index) {
    const title = reference.title || reference.text || reference.url;
    const marker = `<strong>[${escapeHtml(displayMarker(reference, index))}]</strong> `;
    const source = sourceDescriptor(reference, platform.platform);
    const sourceBadge = `<span class="badge neutral" title="${escapeAttribute(source.note || "按当前捕获结果的来源类型分级")}">${escapeHtml(source.label)}</span> `;
    const originLink = source.officialOriginUrl && source.officialOriginUrl !== reference.url
        ? ` <a href="${escapeAttribute(source.officialOriginUrl)}">官方来源链接</a>`
        : "";
    const platformUrl = reference.platformUrl || reference.platform_url || reference.originalUrl || reference.original_url || "";
    const platformLink = platformUrl && platformUrl !== reference.url
        ? ` <a href="${escapeAttribute(platformUrl)}">深知收录页</a>`
        : "";
    const attribution = reference.originAttributionStatus === "trusted_search_no_source_url"
        ? `<span class="badge neutral" title="${escapeAttribute(reference.originAttributionReason || "可信搜索未返回源网址")}">未返回源网址·保留收录页</span> `
        : reference.originAttributionStatus === "trusted_search_official_url"
            ? `<span class="badge neutral">官方来源</span> `
            : "";
    const scope = reference.citationScope === "global"
        ? `<span class="badge neutral">来源清单</span> `
        : reference.citationScope === "inline_and_global"
            ? `<span class="badge neutral">间接查找</span> `
            : "";
    const snippet = reference.snippet
        ? `<details class="ref-snippet"><summary>查看摘录</summary><p>${escapeHtml(reference.snippet)}</p></details>`
        : "";
    return `<li id="${referenceId(platform.platform, reference)}">${marker}${sourceBadge}${attribution}${scope}<a href="${escapeAttribute(reference.url)}">${escapeHtml(title)}</a>${originLink}${platformLink}${snippet}</li>`;
}
function answerHasInlineCitations(platform) {
    const markers = new Set(platform.references
        .filter((reference) => reference.citationScope !== "global" && Boolean(reference.marker))
        .map((reference, index) => displayMarker(reference, index)));
    const sortedMarkers = [...markers].sort((a, b) => Number(b) - Number(a));
    const bracketMatches = [...platform.answerMarkdown.matchAll(/\[(\d{1,4})\]|【(\d{1,4})】/g)];
    if (bracketMatches.some((match) => markers.has(match[1] || match[2]))) {
        return true;
    }
    if (!["dknowc-chat", "dknowc-deep-research"].includes(platform.platform)) {
        return false;
    }
    const bareMatches = [...platform.answerMarkdown.matchAll(/(^|[^\d[])(\d{1,8})(?=\s|。|；|，|、|\.|,|;|:|：|）|\)|$)/g)];
    return bareMatches.some((match) => Boolean(splitBareCitationSuffix(match[2], sortedMarkers, markers)));
}
function displayMarker(reference, index) {
    if (reference.citationScope === "global") {
        return `S${index + 1}`;
    }
    return reference.marker || String(index + 1);
}
function renderArtifactLinks(platform) {
    const links = [
        platform.artifacts?.screenshot ? `<a href="${escapeAttribute(platform.artifacts.screenshot)}">截图 / screenshot</a>` : "",
        platform.artifacts?.html ? `<a href="${escapeAttribute(platform.artifacts.html)}">页面 HTML / page html</a>` : "",
        platform.artifacts?.trace ? `<a href="${escapeAttribute(platform.artifacts.trace)}">轨迹 / trace</a>` : ""
    ].filter(Boolean);
    return links.length ? `<div class="artifact-links">${links.join("")}</div>` : "";
}
function platformStyle(platform) {
    const colors = {
        doubao: "#7c3aed",
        yuanbao: "#0f766e",
        deepseek: "#1d4ed8",
        qianwen: "#c2410c",
        "dknowc-chat": "#6d28d9",
        "dknowc-deep-research": "#0f766e",
        kimi: "#be185d",
        zhipu: "#047857",
        chatgpt: "#087443",
        claude: "#a15c00",
        gemini: "#2563eb"
    };
    return `--platform-accent: ${colors[platform] || "#0f766e"};`;
}
function cleanAnswerForReport(answer) {
    return answer
        .replace(/^已创建本问题知识专库（[^）]+）\s*/gm, "")
        .replace(/^已完成思考（[^）]+）\s*/gm, "")
        .replace(/^AI综合所有相关权威材料后，参考性解读如下，建议点击角标查看所依据的材料原文。\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function formatAnswerForDisplay(answer) {
    const normalized = answer
        .replace(/\r\n?/g, "\n")
        .replace(/^表格\s*$/gm, "")
        .replace(/[ \t]*\n[ \t]*/g, "\n")
        .replace(/^([^\n|]+)\t+([^\n|]+)\t+([^\n|]+)$/gm, "$1 | $2 | $3")
        .replace(/([。！？])([📌🎯🌟💡])/g, "$1\n\n$2")
        .replace(/([。！？])((?:批次定位|位次是更关键|物理类700分|历史类700分|官方信息查询渠道|院校层次|第一梯队|第二梯队|其他顶尖高校|补充信息|总而言之)[:：]?)/g, "$1\n\n$2")
        .replace(/(档位)\n+(可参考院校)\n+(判断)/g, "$1 | $2 | $3\n--- | --- | ---")
        .replace(/^(冲|稳|保)\n+([^\n]+)\n+([^\n]+)$/gm, "$1 | $2 | $3")
        .replace(/([。！？】])([一二三四五六七八九十]+、)/g, "$1\n\n$2")
        .replace(/([。！？】])((?:贷款|申请|首付|利率|期限|套数|额度|商转公|其他|参考文献|新增|提高|拓宽|多种)[^。\n]{0,24}[:：])/g, "$1\n\n$2")
        .replace(/(要点)([一二三四五六七八九十]+、)/g, "$1\n\n$2")
        .replace(/(参考文献[:：])/g, "\n\n$1\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const lines = normalized.split("\n");
    const formatted = [];
    let inReferenceSection = false;
    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index].trim();
        if (!rawLine) {
            pushBlank(formatted);
            continue;
        }
        const nextLine = lines[index + 1]?.trim() || "";
        if (/^[一二三四五六七八九十]+、/.test(rawLine) || /^\d+[.、]\s*/.test(rawLine)) {
            pushBlock(formatted, `### ${rawLine}`);
            continue;
        }
        if (/^📎?\s*参考文献[:：]?$/.test(rawLine) || /^参考文献[:：]?$/.test(rawLine)) {
            pushBlock(formatted, `### ${rawLine.replace(/^📎\s*/, "")}`);
            inReferenceSection = true;
            continue;
        }
        if (looksLikeDisplayHeading(rawLine, nextLine)) {
            pushBlock(formatted, `### ${rawLine}`);
            inReferenceSection = false;
            continue;
        }
        if (inReferenceSection) {
            const entries = splitReferenceEntries(rawLine);
            if (entries.length > 1 || entries.some(looksLikeReferenceEntry)) {
                entries.forEach((entry) => formatted.push(`- ${entry}`));
                continue;
            }
        }
        if (/^[∙•]\s*/.test(rawLine)) {
            formatted.push(`- ${rawLine.replace(/^[∙•]\s*/, "")}`);
            continue;
        }
        formatted.push(rawLine);
    }
    return formatted.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function splitReferenceEntries(line) {
    const cleaned = line.replace(/^[∙•-]\s*/, "").trim();
    return cleaned
        .replace(/(\[(?:\d{1,4})\]|【(?:\d{1,4})】)(?=[^\s\[\]【】<])/g, "$1\n")
        .split(/\n+/)
        .map((entry) => entry.trim().replace(/^[∙•-]\s*/, ""))
        .filter(Boolean);
}
function looksLikeReferenceEntry(line) {
    return /(《.+》|https?:\/\/|，\d{4}-\d{2}-\d{2}|\[(?:\d{1,4})\]$|【(?:\d{1,4})】$)/.test(line);
}
function looksLikeDisplayHeading(line, nextLine) {
    if (line.length > 28 || /[。！？；;]$/.test(line)) {
        return false;
    }
    if (/[:：]$/.test(line)) {
        return true;
    }
    return Boolean(nextLine && (/^[∙•]\s*/.test(nextLine) || /^[一二三四五六七八九十]+、/.test(nextLine)));
}
function pushBlock(lines, value) {
    pushBlank(lines);
    lines.push(value);
    lines.push("");
}
function pushBlank(lines) {
    if (lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
    }
}
function linkInlineCitations(html, platform) {
    const markers = new Set(platform.references
        .map((reference) => reference.marker)
        .filter((marker) => Boolean(marker)));
    if (markers.size === 0) {
        return html;
    }
    const sortedMarkers = [...markers].sort((a, b) => Number(b) - Number(a));
    const withBracketLinks = html.replace(/\[(\d{1,4})\]|【(\d{1,4})】/g, (whole, markerA, markerB) => {
        const marker = markerA || markerB;
        if (!markers.has(marker)) {
            return whole;
        }
        const reference = platform.references.find((item) => item.marker === marker);
        if (!reference) {
            return whole;
        }
        const left = whole.startsWith("【") ? "【" : "[";
        const right = whole.startsWith("【") ? "】" : "]";
        return `<a class="cite-link" href="#${referenceId(platform.platform, reference)}">${left}${escapeHtml(marker)}${right}</a>`;
    });
    if (!["dknowc-chat", "dknowc-deep-research"].includes(platform.platform)) {
        return withBracketLinks;
    }
    return withBracketLinks.replace(/(^|[^\d[])(\d{1,8})(?=<|\s|。|；|，|、|\.|,|;|:|：|）|\)|$)/g, (_whole, prefix, digits) => {
        const split = splitBareCitationSuffix(digits, sortedMarkers, markers);
        if (!split) {
            return `${prefix}${digits}`;
        }
        const linked = split.markers.map((marker) => {
            if (!markers.has(marker)) {
                return escapeHtml(marker);
            }
            const reference = platform.references.find((item) => item.marker === marker);
            if (!reference) {
                return escapeHtml(marker);
            }
            return `<a class="cite-link" href="#${referenceId(platform.platform, reference)}">[${escapeHtml(marker)}]</a>`;
        }).join("");
        return `${prefix}${escapeHtml(split.plainPrefix)}${linked}`;
    });
}
function splitBareCitationSuffix(digits, sortedMarkers, markers) {
    for (let start = 0; start < digits.length; start += 1) {
        const suffix = digits.slice(start);
        const citationMarkers = splitCitationDigits(suffix, sortedMarkers);
        if (citationMarkers.length > 0 && citationMarkers.every((marker) => markers.has(marker))) {
            return {
                plainPrefix: digits.slice(0, start),
                markers: citationMarkers
            };
        }
    }
    return undefined;
}
function splitCitationDigits(digits, markers) {
    const result = [];
    let rest = digits;
    while (rest.length > 0) {
        const matched = markers.find((marker) => rest.startsWith(marker));
        if (matched) {
            result.push(matched);
            rest = rest.slice(matched.length);
        }
        else {
            result.push(rest[0]);
            rest = rest.slice(1);
        }
    }
    return result;
}
function referenceId(platform, reference) {
    const key = `${platform}-${reference.marker || reference.normalizedUrl}`;
    return `ref-${key.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function escapeAttribute(value) {
    return escapeHtml(value);
}
function shortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString("zh-CN", { hour12: false });
}
function statusLabel(status) {
    const labels = {
        success: "成功 / success",
        failed: "失败 / failed",
        timeout: "超时 / timeout",
        login_required: "需登录 / login required",
        verification_required: "需验证 / verification required"
    };
    return labels[status];
}
