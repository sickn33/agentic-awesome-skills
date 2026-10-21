/* beats.js — KV cache in the V11 casefile 「案卷」 style: investigate it like a case.
 *   01 立案  the case folder is opened (立案), exhibit A — the generation log — types slower and slower, the suspects
 *   02 取证  exhibit B — the scene photo at step 8: a new token arrives, looks back at all 7, their K and V recomputed
 *   03 查明  the evidence is strung to the lineup: two suspects 排除, 重复计算 已证实; the record of steps 1–8
 *   04 修复  exhibit C — the KV cache register: each K, V computed once and filed (已存档); only the new one is computed
 *   05 结案  the report and the memory bill: Llama 2 7B, 2 × 32 × 4096 × 2 B ≈ 0.5 MB a token × 4096 ≈ 2 GB
 * Every time comes from the story (api.at / api.phrase / api.span) plus small offsets. Facts: story.json → facts;
 * the log's milliseconds are illustrative and marked 示意.
 */
window.Beats = function (api) {
  "use strict";
  const { story, K, E, pr } = api;
  const g = api.geo;
  const A = (l, u, n) => api.at(l, u, n), PH = (l, s) => api.phrase(l, s), SP = (l, s) => api.span(l, s);
  const ST = (k) => api.station(k);
  const R = (k, x, y, w, h) => ({ x: ST(k).x + x, y: ST(k).y + y, w, h }); // station-local rect → board rect
  const P = (k, x, y) => api.wp(k, x, y);
  const fn = api.fn;

  // ---------------- the film's own look (tokens, K / V chips, step cells) ----------------
  const css = document.createElement("style");
  css.textContent = `
    .cf-photo-img { position: absolute; left: 24px; top: 24px; width: 1032px; height: 440px; overflow: hidden; background: linear-gradient(160deg, #3a3f46, #22262b); }
    .cf-tok { position: absolute; width: 210px; height: 108px; display: flex; align-items: center; justify-content: center; background: #f4ecd8;
      border: 3px solid #9c8b70; border-radius: 8px; font-family: var(--kit-font-label); font-weight: 700; font-size: 54px; color: #3a2e22;
      box-shadow: 0 6px 10px rgba(0, 0, 0, 0.35); visibility: hidden; }
    .cf-tok.new { background: #fff3c4; border-color: var(--kit-accent); }
    .cf-chip { position: absolute; width: 88px; height: 46px; display: flex; align-items: center; justify-content: center; border: 3px solid;
      border-radius: 6px; font-family: var(--kit-font-mono); font-weight: 700; font-size: 30px; line-height: 1; visibility: hidden; }
    .cf-chip.k { border-color: #3c7f74; color: #2f6f64; background: rgba(60, 127, 116, 0.1); }
    .cf-chip.v { border-color: #b07a1c; color: #8a5e12; background: rgba(176, 122, 28, 0.1); }
    .cf-photo-img .cf-chip.k { border-color: #6fc2b3; color: #b4ece1; background: rgba(60, 127, 116, 0.35); }
    .cf-photo-img .cf-chip.v { border-color: #e0a84a; color: #f8d596; background: rgba(176, 122, 28, 0.35); }
    .cf-photo-img .cf-chip.re { border-color: #ff8a4c; color: #ffc3a0; background: rgba(162, 74, 16, 0.55); }
    .cf-badge { position: absolute; width: 46px; height: 46px; border-radius: 50%; background: var(--kit-warn); color: #fff; display: flex;
      align-items: center; justify-content: center; font-family: var(--kit-font-mono); font-weight: 700; font-size: 28px; line-height: 1;
      box-shadow: 1px 3px 3px rgba(0, 0, 0, 0.45); visibility: hidden; }
    .cf-date { position: absolute; font-family: var(--kit-font-mono); font-weight: 700; font-size: 34px; line-height: 1; letter-spacing: 3px;
      color: #ffb347; text-shadow: 0 0 8px rgba(255, 140, 40, 0.45); white-space: nowrap; }
    .cf-lab { position: absolute; font-family: var(--kit-font-label); font-weight: 700; color: var(--kit-muted); white-space: nowrap; line-height: 1.2; }
    .cf-cell { position: absolute; width: 40px; height: 32px; border: 3px solid var(--kit-ink); border-radius: 3px; background: #fbf6ea; visibility: hidden; }
    .cf-cell.new { background: rgba(255, 214, 51, 0.62); }
    .cf-cell i { position: absolute; inset: 0; background: repeating-linear-gradient(-45deg, rgba(162, 74, 16, 0.85) 0 5px, rgba(0, 0, 0, 0) 5px 10px); opacity: 0; }
    .cf-big { font-family: var(--kit-font-body); font-weight: 500; }
    .cf-mono { font-family: var(--kit-font-mono); font-weight: 700; }
  `;
  document.head.appendChild(css);

  // ---------------- small helpers ----------------
  const el = (parent, cls, x, y, size, html, style) => K.el("div", "kit-abs " + (cls || ""), parent, Object.assign({ left: x, top: y, fontSize: size }, style || {}), html);
  const typed = (parent, text, x, y, size, t0, t1, o = {}) => {
    const e = el(parent, "kit-typed kit-tone-" + (o.tone || "ink") + (o.cls ? " " + o.cls : ""), x, y, size, o.html ? text : K.esc(text));
    api.type(e, { at: t0, dur: Math.max(0.05, t1 - t0) });
    return e;
  };
  const hw = (parent, text, x, y, size, t0, t1, o = {}) => {
    const h = el(parent, "kit-hand kit-tone-" + (o.tone || "ink"), x, y, size, null, o.rot ? { transform: `rotate(${o.rot}deg)` } : null);
    const s = K.el("span", "", h, null, K.esc(text));
    api.write(s, { at: t0, dur: Math.max(0.08, t1 - t0) });
    return h;
  };
  // an element pops in at `at` (a token, a chip): from a little larger, one small overshoot; a light key tap
  const pop = (e, at, o = {}) => (o.sound !== false && K.event("type", at, 0.04, { n: 1 }), fn((t) => {
    const u = pr(t, at, o.dur || 0.2);
    e.style.visibility = u > 0 ? "visible" : "hidden";
    if (u <= 0) return;
    const f = o.from || 1.5, s = u >= 1 ? 1 : f + (1 - f) * E.back(u);
    e.style.opacity = Math.min(1, u * 3).toFixed(3);
    e.style.transform = `scale(${s.toFixed(3)})`;
  }));
  const cardSvg = (c, w, h) => K.svg(c.el, 0, 0, w, h);
  const span = (l, s) => SP(l, s);

  // keys: the caption's yellow span per line
  Object.assign(api.keys, {
    1: "就出得越慢", 2: "每一步都在做重复的事", 3: "回看前面所有的token", 4: "又被重新算了一遍",
    5: "重算早就算过的东西", 6: "只算一次", 7: "新来的那一个", 8: "缓存占显存",
  });
  // the closing sheet is the case's lesson; the report and the recap carry the 结案 stamps
  if (api.closing) Object.assign(api.closing, { tag: "教训", stamp: false });
  // tapes: only the evidence (S2) and the fix (S4) keep a token timeline
  [1, 3, 5].forEach((k) => (ST(k).tape = false));

  // =====================================================================================================
  // 01 立案 — 异常：同一个模型、同一台机器，回答写得越长，后面每个字就出得越慢。
  //           嫌疑有三个：机器太旧，模型累了，还是每一步都在做重复的事？
  // =====================================================================================================
  const L1 = story.line(1), L2 = story.line(2);
  const tAnom = A(1, "异"), tModel = span(1, "同一个模型"), tMach = span(1, "同一台机器");
  const tLong = span(1, "回答写得越长"), tSlow = span(1, "就出得越慢");
  const folder = api.card(1, { kind: "manila", x: 130, y: 190, w: 930, h: 300, tab: "案卷 07", pin: "red", rot: -1.0, at: 0.06, dur: 0.2 });
  typed(folder.el, "报案记录 · 第 1 页", 44, 34, 30, 0.32, 0.62, { tone: "muted" });
  const ttl = el(folder.el, "kit-display", 44, 82, 60, "为什么大模型越写越慢？");
  api.type(ttl, { at: 0.12, dur: 0.42 });
  api.stamp(folder.el, { text: "立案", tone: "accent", x: 800, y: 70, rot: 10, size: 64, at: tAnom + 0.04 });
  // the conditions are the same: typed as they are named, ticked
  const fsvg = cardSvg(folder, 930, 300);
  typed(folder.el, "模型：同一个", 48, 178, 38, tModel.start - 0.02, tModel.end + 0.05);
  typed(folder.el, "机器：同一台", 48, 232, 38, tMach.start - 0.02, tMach.end + 0.05);
  api.mark(fsvg, g.tick(300, 182, 34, 3), { at: tModel.end + 0.08, dur: 0.18, tone: "ink", width: 5 });
  api.mark(fsvg, g.tick(300, 236, 34, 5), { at: tMach.end + 0.08, dur: 0.18, tone: "ink", width: 5 });

  // exhibit A: the generation log — the typewriter itself slows down step by step (illustrative times)
  const exA = api.card(1, { kind: "lined", x: 1150, y: 165, w: 650, h: 600, rule: 50, ruleTop: 92 - 50 * 0.14 + 2, tag: "证物 A · 生成日志（示意）", pin: "yellow", rot: 1.4, at: tLong.start - 0.42 });
  const MS = [12, 24, 37, 49, 61, 73, 85, 96];
  const logT0 = tLong.start + 0.05, logT1 = tSlow.end - 0.02;
  let lt = logT0;
  const rows = MS.map((ms, k) => {
    const d = ((k + 1) / 36) * (logT1 - logT0); // row k types in (k + 1) units: the log gets slower
    const e = typed(exA.el, `step ${k + 1} ······ ${String(ms).padStart(2, " ")} ms`, 50, 96 + 50 * k - 8, 38, lt, lt + d * 0.92);
    lt += d;
    return e;
  });
  api.highlight(exA.el, { x: 40, y: 96 + 50 * 7 + 2, w: 470, h: 38, at: tSlow.end + 0.05, dur: 0.24, under: rows[7] });
  hw(exA.el, "每一步都更慢！", 300, 500, 52, A(1, "慢") - 0.05, A(1, "慢") + 0.62, { tone: "accent", rot: -5 });

  // the suspects (blue: hypotheses) — written as they are named; the third gets the question mark
  const tSus = A(2, "嫌"), s1 = span(2, "机器太旧"), s2 = span(2, "模型累了"), s3 = span(2, "每一步都在做重复的事");
  const list = api.card(1, { kind: "index", x: 180, y: 540, w: 880, h: 280, rule: 66, ruleTop: 78 - 66 * 0.14 + 2, tag: "嫌疑名单", pin: "blue", rot: -1.2, at: tSus - 0.32 });
  hw(list.el, "1. 机器太旧？", 44, 78, 54, s1.start - 0.05, s1.end + 0.1);
  hw(list.el, "2. 模型「累了」？", 44, 144, 54, s2.start - 0.05, s2.end + 0.12);
  hw(list.el, "3. 每一步都在做重复的事？", 44, 210, 54, s3.start - 0.1, s3.end + 0.05);
  api.stamp(list.el, { text: "推测", tone: "accent-2", x: 770, y: 80, rot: -9, size: 44, at: A(2, "三") + 0.02 });
  const qm = el(list.el, "kit-display kit-tone-accent", 760, 150, 110, "？");
  pop(qm, A(2, "？") - 0.04, { from: 1.8 });
  // a hunch, not a finding yet: a BLUE string from the log to the third suspect
  api.string(exA.tie("bl", [26, 26]), list.tie("tr", [26, 44]), { at: s3.start + 0.4, dur: 0.5, tone: "accent-2", ends: ["blue", "blue"] });

  api.focus(0.1, R(1, 110, 130, 980, 380), { max: 1.25 });
  api.focus(tLong.start - 0.5, R(1, 1100, 120, 760, 700), { fill: 0.96 });
  api.focus(tSus - 0.4, R(1, 120, 150, 1000, 680), { fill: 0.94 }); // the folder above, the list below
  api.focus(s3.start + 0.2, R(1, 120, 140, 1720, 690), { fill: 0.94 });
  ST(1).exit = exA;

  // =====================================================================================================
  // 02 取证 — 查过程：每出一个新 token，模型都要回看前面所有的 token。
  //           再看现场：到了第 8 步，前面 7 个 token 的 Key 和 Value，又被重新算了一遍。
  // =====================================================================================================
  const L3 = story.line(3), L4 = story.line(4);
  const tCheck = A(3, "查"), tNew = SP(3, "新token"), tLook = SP(3, "回看前面所有的token");
  const photo = api.card(2, { kind: "photo", x: 120, y: 160, w: 1080, h: 560, tag: "证物 B · 现场照片", pin: "yellow", rot: -1.4, at: tCheck - 0.32, pad: 0 });
  const img = K.el("div", "cf-photo-img", photo.el);
  const TOK = ["因为", "空气", "把", "蓝光", "散射", "得", "更", "多"];
  const tokXY = (i) => ({ x: 40 + (i % 4) * 246, y: 32 + Math.floor(i / 4) * 196 });
  const tokT = TOK.map((_, i) => (i < 7 ? tCheck + 0.15 + i * 0.1 : tNew.start - 0.02));
  const toks = TOK.map((w, i) => {
    const p = tokXY(i), e = K.el("div", "cf-tok" + (i === 7 ? " new" : ""), img, { left: p.x, top: p.y }, w);
    pop(e, tokT[i], { from: i === 7 ? 1.8 : 1.3 });
    return e;
  });
  const isvg = K.svg(img, 0, 0, 1032, 440);
  const pNew = tokXY(7);
  api.mark(isvg, g.loop(pNew.x + 105, pNew.y + 54, 136, 78, 7), { at: tNew.end + 0.04, dur: 0.32, tone: "#ff5a4a", width: 6 });
  // the new token looks back at every earlier one (blue: the process under investigation)
  TOK.slice(0, 7).forEach((_, i) => {
    const q = tokXY(i), x0 = pNew.x + 70, y0 = pNew.y + 4, x1 = q.x + 105, y1 = q.y + (i < 4 ? 110 : 4);
    const bow = i < 4 ? 0.18 : 0.42;
    api.mark(isvg, g.arrow(x0, y0, x1, y1, 20 + i, i < 4 ? bow : -bow, 18), { at: tLook.start + 0.02 + i * 0.1, dur: 0.24, tone: "#8fc1f0", width: 5 });
  });
  hw(photo.el, "现场：第 8 步，新来的「多」", 40, 478, 50, tNew.end + 0.2, tNew.end + 1.1);
  const lookTag = api.card(2, { kind: "paper", x: 1290, y: 500, w: 300, h: 112, pin: "blue", rot: 2, at: tLook.start - 0.22, pinX: 150, pinY: 16 });
  typed(lookTag.el, "回看前面", 54, 40, 48, tLook.start + 0.02, tLook.start + 0.45);

  // step 8: the photo's date stamp, a count of the 7 earlier tokens, their K and V, all recomputed
  const t8 = SP(4, "第8步"), t7 = SP(4, "前面7个token"), tKey = A(4, "Key"), tVal = A(4, "Value"), tRe = SP(4, "又被重新算了一遍");
  const date = el(img, "cf-date", 760, 392, 34, "STEP 08");
  api.type(date, { at: t8.start, dur: 0.3 });
  TOK.slice(0, 7).forEach((_, i) => {
    const p = tokXY(i);
    const b = K.el("div", "cf-badge", img, { left: p.x - 14, top: p.y - 14 }, String(i + 1));
    pop(b, t7.start + i * ((t7.end - t7.start - 0.1) / 7), { from: 1.6, dur: 0.16 });
    const k = K.el("div", "cf-chip k", img, { left: p.x + 14, top: p.y + 118 }, "K" + (i + 1));
    const v = K.el("div", "cf-chip v", img, { left: p.x + 110, top: p.y + 118 }, "V" + (i + 1));
    pop(k, tKey + i * 0.035, { from: 1.4, dur: 0.16 });
    pop(v, tVal + i * 0.035, { from: 1.4, dur: 0.16 });
    const tr = tRe.start + 0.1 + i * 0.12;
    fn((t) => { const on = t >= tr; k.classList.toggle("re", on); v.classList.toggle("re", on); });
  });
  const ledger = api.card(2, { kind: "index", x: 1250, y: 160, w: 630, h: 250, rule: 62, ruleTop: 92 - 62 * 0.14 + 2, tag: "笔录 · 第 8 步", pin: "red", rot: 1.6, at: tRe.start - 0.35 });
  typed(ledger.el, "要算的 K、V：8 份", 44, 96, 40, tRe.start + 0.02, tRe.start + 0.5);
  const reLine = typed(ledger.el, "其中重算：7 份", 44, 158, 40, tRe.start + 0.55, tRe.start + 0.95, { tone: "warn" });
  api.highlight(ledger.el, { x: 36, y: 160, w: 300, h: 40, at: tRe.end - 0.15, dur: 0.25, tone: "warn", under: reLine });
  const reTag = api.card(2, { kind: "paper", x: 1560, y: 620, w: 300, h: 112, pin: "red", rot: -2.4, at: tRe.start - 0.1, pinX: 150, pinY: 16 });
  typed(reTag.el, "又算一遍", 54, 40, 48, tRe.start + 0.12, tRe.start + 0.6, { tone: "warn" });
  // the red line from 「回看前面」 to 「又算一遍」: looking back is what makes the recomputation
  api.string(lookTag.tie("br", [20, 20]), reTag.tie("tl", [20, 20]), { at: tRe.start + 0.62, dur: 0.4, ends: true });
  // the tape: the token timeline, T8 (the new one) in red
  ST(2).marks = TOK.map((w, i) => ({ html: `<b>T${i + 1}</b>${w}`, t: tokT[i], until: i < 7 ? tokT[i] + 0.3 : null, tone: "accent" }));
  ST(2).tapeRect.y = ST(2).y + 770; // right under the photo, so the photo shots keep it in frame

  api.focus(L3.start - 0.6, R(2, 100, 120, 1160, 720), { station: 2, fill: 0.96 });
  api.focus(tLook.start - 0.15, R(2, 100, 120, 1540, 720), { fill: 0.96 });
  api.focus(L4.start - 0.1, R(2, 110, 130, 1120, 700), { fill: 0.98 }); // closer on the photo, the tape still in frame
  api.focus(tRe.start - 0.15, R(2, 100, 120, 1800, 720), { fill: 0.97 });
  ST(2).exit = reTag;

  // =====================================================================================================
  // 03 查明 — 证据串起来了：不是机器旧，也不是模型累，是每一步都在重算早就算过的东西。
  // =====================================================================================================
  const L5 = story.line(5);
  const tLink = span(5, "证据串起来了"), x1 = SP(5, "机器旧"), x2 = SP(5, "模型累"), tSteps = SP(5, "每一步都在重算"), tEarlier = SP(5, "早就算过的东西");
  const sus = [["嫌疑 1", "机器太旧？"], ["嫌疑 2", "模型累了？"], ["嫌疑 3", "重复计算？"]].map(([tag, name], i) => {
    const c = api.card(3, { kind: "index", x: 140 + i * 585, y: 160, w: 540, h: 210, rule: 70, ruleTop: 70, tag, pin: i < 2 ? "blue" : false, rot: [-1.2, 0.8, -0.6][i], at: L5.start - 0.62 + i * 0.12 });
    const h = hw(c.el, name, 44, 86, 64, L5.start - 0.3 + i * 0.12, L5.start + 0.25 + i * 0.12);
    return { c, h, svg: cardSvg(c, 540, 210) };
  });
  // suspect 3: a blue pin (a hypothesis) is swapped for a red one (the culprit)
  const pinX3 = ST(3).x + 140 + 2 * 585 + 270, pinY3 = ST(3).y + 160 + 26;
  api.add(K.pin(api.desk, pinX3, pinY3, { color: "blue", at: L5.start - 0.62 + 0.24 + 0.22, out: [tSteps.start + 0.05, 0.12] }));
  api.add(K.pin(api.desk, pinX3, pinY3, { color: "red", at: tSteps.start + 0.2 }));
  // the evidence strung to the third suspect: the travel string from 「又算一遍」 (ST(3).ride), and the ledger
  api.string(ledger.tie("tr", [24, 44]), sus[2].c.tie("tl", [26, 44]), { at: tLink.start + 0.3, dur: 0.6, ends: true, via: P(3, 700, 90) });
  // the first two excluded (blue, struck through), the third confirmed (red, ringed)
  [[x1, 0], [x2, 1]].forEach(([sp, i]) => {
    api.mark(sus[i].svg, g.line(36, 136, 400, 128, 9 + i, 3), { at: sp.start - 0.05, dur: 0.24, tone: "accent-2", width: 7 });
    api.stamp(sus[i].c.el, { text: "排除", tone: "accent-2", x: 420, y: 120, rot: -12, size: 58, at: sp.start + 0.22 });
  });
  api.mark(sus[2].svg, g.loop(170, 128, 160, 52, 12), { at: A(5, "重") + 0.02, dur: 0.3, tone: "accent", width: 6 });
  api.stamp(sus[2].c.el, { text: "已证实", tone: "accent", x: 400, y: 128, rot: -10, size: 54, at: A(5, "算", 1) + 0.12 });

  // exhibit D: the record of steps 1–8 — each step computes every earlier K, V again (36 rows, 28 of them redone)
  const rec = api.card(3, { kind: "lined", x: 230, y: 430, w: 1420, h: 410, rule: 40, ruleTop: 56, tag: "证物 D · 计算记录（第 1–8 步）", pin: "yellow", rot: 0.6, at: tSteps.start - 0.45 });
  const rowT = (k) => tSteps.start + 0.05 + k * ((tSteps.end - tSteps.start) / 8);
  const cells = [];
  for (let k = 0; k < 8; k++) {
    const lab = el(rec.el, "cf-lab", 40, 66 + k * 40, 30, `第 ${k + 1} 步`);
    api.type(lab, { at: rowT(k), dur: 0.08, sound: false });
    for (let j = 0; j <= k; j++) {
      const c = K.el("div", "cf-cell" + (j === k ? " new" : ""), rec.el, { left: 170 + j * 48, top: 66 + k * 40 });
      const hatch = K.el("i", "", c);
      pop(c, rowT(k) + j * 0.012, { from: 1.25, dur: 0.12, sound: false });
      if (j < k) cells.push({ hatch, t: tEarlier.start + 0.05 + (cells.length / 28) * 0.6 });
    }
  }
  fn((t) => { for (const c of cells) c.hatch.style.opacity = up01(t, c.t, 0.12).toFixed(3); });
  function up01(t, a, d) { return E.o2(pr(t, a, d)); }
  K.event("type", rowT(0), tSteps.end - tSteps.start, { n: 36 });
  const sumA = typed(rec.el, "8 步一共算了 36 份 K、V", 640, 84, 54, tEarlier.start + 0.05, tEarlier.start + 0.5);
  typed(rec.el, "其中", 640, 168, 54, tEarlier.start + 0.5, tEarlier.start + 0.62, { tone: "warn" });
  const sumB = typed(rec.el, "28 份", 772, 168, 54, tEarlier.start + 0.64, tEarlier.start + 0.85, { tone: "warn" });
  typed(rec.el, "早就算过", 934, 168, 54, tEarlier.start + 0.88, tEarlier.end + 0.15, { tone: "warn" });
  const rsvg = cardSvg(rec, 1420, 410);
  api.mark(rsvg, g.loop(838, 202, 92, 48, 21), { at: tEarlier.end + 0.25, dur: 0.3, tone: "accent", width: 6 });
  // legend: two sample cells, typed
  [["new", "这一步新算的", 0], ["", "早就算过、又算一遍的", 1]].forEach(([cls, text, i]) => {
    const c = K.el("div", "cf-cell " + cls, rec.el, { left: 644 + i * 330, top: 290 });
    if (!cls) K.el("i", "", c).style.opacity = "1";
    pop(c, tEarlier.end + 0.05 + i * 0.2, { from: 1.2, dur: 0.12 });
    const lab = el(rec.el, "cf-lab", 696 + i * 330, 288, 30, text);
    api.type(lab, { at: tEarlier.end + 0.08 + i * 0.2, dur: 0.3, sound: false });
  });
  void sumA; void sumB;

  ST(3).entry = sus[2].c;
  ST(3).ride = { a: reTag.tie("tr", [20, 20]), b: sus[2].c.tie("bl", [26, 20]), via: P(3, 330, 404) };
  api.focus(L5.start - 0.75, R(2, 1220, 120, 2880, 720), { station: 3, fill: 0.96, min: 0.4 });
  api.focus(x1.start - 0.3, R(3, 110, 120, 1780, 320), { fill: 0.94 });
  api.focus(tSteps.start - 0.35, R(3, 110, 120, 1780, 740), { fill: 0.96 });
  ST(3).exit = sus[2].c;

  // =====================================================================================================
  // 04 修复 — 修复办法叫 KV cache：每个 token 的 Key 和 Value 只算一次，存进缓存；
  //           之后只算新来的那一个，再去缓存里查。
  // =====================================================================================================
  const L6 = story.line(6), L7 = story.line(7);
  const tFix = span(6, "修复办法叫"), tKV = A(6, "KV"), tCache = A(6, "cache"), tEach = SP(6, "每个token的"), tK6 = A(6, "Key"), tV6 = A(6, "Value");
  const tOnce = SP(6, "只算一次"), tStore = SP(6, "存进缓存"), tOnly = SP(7, "只算新来的那一个"), tLook7 = SP(7, "再去缓存里查");
  const kv = api.card(4, { kind: "index", x: 130, y: 160, w: 820, h: 670, rule: 56, ruleTop: 140, tag: "证物 C · KV 缓存登记卡", pin: "red", rot: -0.8, at: tFix.start - 0.3 });
  const kvTitle = el(kv.el, "cf-mono kit-tone-accent", 44, 50, 60, "KV cache");
  api.type(kvTitle, { at: tKV - 0.02, dur: Math.max(0.3, tCache - tKV + 0.3) });
  [["token", 44, "muted"], ["K · 匹配", 236, "#2f6f64"], ["V · 内容", 474, "#8a5e12"]].forEach(([s, x, c]) => {
    const h = el(kv.el, "cf-lab", x, 150, 30, K.esc(s), { color: c === "muted" ? "" : c });
    api.type(h, { at: tEach.start - 0.1, dur: 0.25, sound: false });
  });
  const kvSvg = cardSvg(kv, 820, 670);
  const kvRows = TOK.map((w, i) => {
    const y = 204 + i * 56;
    const tk = typed(kv.el, w, 44, y, 38, i < 7 ? tEach.start + i * 0.12 : tOnly.start + 0.3, i < 7 ? tEach.start + i * 0.12 + 0.14 : tOnly.start + 0.45);
    const k = K.el("div", "cf-chip k", kv.el, { left: 236, top: y - 2 }, "K" + (i + 1));
    const v = K.el("div", "cf-chip v", kv.el, { left: 474, top: y - 2 }, "V" + (i + 1));
    pop(k, i < 7 ? tK6 + i * 0.05 : A(7, "那") - 0.02, { from: 1.4, dur: 0.16 });
    pop(v, i < 7 ? tV6 + i * 0.05 : A(7, "那") + 0.12, { from: 1.4, dur: 0.16 });
    const t1 = i < 7 ? tOnce.start + i * 0.08 : A(7, "个") + 0.05;
    const once = typed(kv.el, "×1", 640, y, 34, t1, t1 + 0.1, { tone: "accent", cls: "cf-mono" });
    return { tk, k, v, once, y };
  });
  // the new one: highlighted as it is computed
  api.highlight(kv.el, { x: 30, y: kvRows[7].y - 6, w: 600, h: 52, at: tOnly.end - 0.1, dur: 0.25 });
  // the lookup: a yellow sweep down the K column — the new token's query matched against every stored K
  api.highlight(kv.el, { x: 228, y: 196, w: 104, h: 7 * 56 - 6, at: tLook7.start + 0.05, dur: 0.5 });
  api.mark(kvSvg, g.arrow(370, kvRows[7].y + 18, 370, 240, 41, -0.2, 20), { at: tLook7.start + 0.15, dur: 0.45, tone: "accent", width: 5 });
  api.stamp(kv.el, { text: "已存档", tone: "accent", x: 600, y: 74, rot: -9, size: 50, at: tStore.start + 0.25 });

  const comp = api.card(4, { kind: "index", x: 1030, y: 160, w: 840, h: 270, rule: 62, ruleTop: 92 - 62 * 0.14 + 2, tag: "笔录 · 第 8 步", pin: "yellow", rot: 1.2, at: L7.start - 0.5 });
  typed(comp.el, "不缓存 ··········", 48, 96, 46, L7.start - 0.2, L7.start + 0.15, { tone: "muted" });
  typed(comp.el, "8 份", 560, 96, 46, L7.start + 0.17, L7.start + 0.3, { tone: "muted" });
  typed(comp.el, "有缓存 ··········", 48, 162, 46, tOnly.start + 0.1, tOnly.start + 0.6);
  typed(comp.el, "1 份", 560, 162, 46, tOnly.end - 0.3, tOnly.end);
  const csvg = cardSvg(comp, 840, 270);
  api.mark(csvg, g.loop(604, 190, 78, 40, 33), { at: tOnly.end + 0.08, dur: 0.3, tone: "accent", width: 6 });
  api.note(4, "结论：只算新来的那一个，\n再去缓存里查。", 1050, 480, { width: 800, fontSize: 60, rot: -2.2, pin: "red", at: L7.start - 0.2, speed: 0.085 });
  // the tape echoes the scene: T1–T7 come from the cache (visited dots), only T8 is computed (red)
  ST(4).marks = TOK.map((w, i) => ({ html: `<b>T${i + 1}</b>${w}`, t: i < 7 ? tStore.start + i * 0.1 : tOnly.start + 0.3, until: i < 7 ? tStore.start + i * 0.1 + 0.25 : null, tone: i < 7 ? "ink" : "accent" }));

  api.focus(L6.start - 0.55, R(4, 100, 110, 880, 820), { station: 4, fill: 0.97, dur: 1.15, ease: "io3" });
  api.focus(tEach.start - 0.25, R(4, 160, 180, 720, 520), { max: 1.2 });
  api.focus(tStore.start - 0.1, R(4, 100, 90, 880, 840), { fill: 0.97 });
  api.focus(L7.start - 0.55, R(4, 100, 120, 1800, 800), { fill: 0.97 });
  ST(4).exit = kv;

  // =====================================================================================================
  // 05 结案 — 结案报告还要写上代价：缓存占显存，随长度线性增长；Llama 2 7B 跑 4K 上下文，要多占 2 GB。
  // =====================================================================================================
  const L8 = story.line(8);
  const tRep = span(8, "结案报告"), tCost = SP(8, "代价"), tMem = SP(8, "缓存占显存"), tLin = SP(8, "随长度线性增长");
  const tLl = SP(8, "Llama27B"), t4k = SP(8, "跑4K上下文"), t2g = SP(8, "要多占2GB");
  const rep = api.card(5, { kind: "lined", x: 860, y: 150, w: 1030, h: 560, rule: 60, ruleTop: 138, tag: "案卷 07 · 第 4 页", pin: "red", rot: 0.8, at: tRep.start - 0.3 });
  const repT = el(rep.el, "kit-display", 50, 40, 62, "结案报告");
  api.type(repT, { at: tRep.start, dur: tRep.end - tRep.start + 0.05 });
  const ROWS = [["原因", "每一步都把前面所有 token 的 K、V 重算一遍"], ["修复", "K、V 只算一次存进缓存；之后只算新来的那一个"]];
  ROWS.forEach(([lab, text], i) => {
    const y = 152 + i * 64;
    const l = el(rep.el, "cf-lab", 50, y + 2, 32, lab);
    api.type(l, { at: tRep.end + 0.05 + i * 0.3, dur: 0.1, sound: false });
    typed(rep.el, text, 150, y, 32, tRep.end + 0.1 + i * 0.3, tRep.end + 0.1 + i * 0.3 + 0.45, { tone: "muted" });
  });
  const costL = el(rep.el, "cf-lab kit-tone-accent", 50, 282, 32, "代价");
  api.type(costL, { at: tCost.start, dur: 0.1 });
  const rsv = cardSvg(rep, 1030, 560);
  api.mark(rsv, g.loop(82, 302, 56, 30, 51), { at: tCost.end - 0.05, dur: 0.28, tone: "accent", width: 5 });
  const costA = typed(rep.el, "缓存占显存，随长度线性增长", 150, 280, 38, tMem.start, tLin.end);
  api.highlight(rep.el, { x: 142, y: 282, w: 200, h: 44, at: tMem.end + 0.02, dur: 0.22, under: costA });
  typed(rep.el, "Llama 2 7B · 4K 上下文：多占约 2 GB", 150, 344, 38, tLl.start, t2g.end, { tone: "ink" });
  api.stamp(rep.el, { text: "结案", tone: "accent", x: 850, y: 470, rot: -12, size: 96, at: L8.end - 0.32 });

  // exhibit E: the memory bill — a straight line (linear in length) and the arithmetic from story.json facts
  const bill = api.card(5, { kind: "index", x: 120, y: 150, w: 690, h: 680, rule: 56, ruleTop: 88, tag: "证物 E · 显存账单", pin: "yellow", rot: -1.2, at: tMem.start - 0.35 });
  const bsv = cardSvg(bill, 690, 680);
  const OX = 120, OY = 380, AX = 600, AY = 120; // chart origin, axis ends (card px)
  api.mark(bsv, `M ${OX} ${AY - 10} L ${OX} ${OY} L ${AX + 20} ${OY}`, { at: tMem.start - 0.05, dur: 0.3, tone: "ink", width: 4 });
  const yl = el(bill.el, "cf-lab", 32, 82, 30, "KV 缓存");
  const xl = el(bill.el, "cf-lab", 380, 398, 30, "上下文长度");
  api.type(yl, { at: tMem.start + 0.1, dur: 0.2, sound: false });
  api.type(xl, { at: tMem.start + 0.2, dur: 0.2, sound: false });
  api.mark(bsv, `M ${OX} ${OY} L ${AX - 30} ${AY + 30}`, { at: tLin.start + 0.15, dur: tLin.end - tLin.start - 0.2, tone: "warn", width: 7, ease: "linear" });
  const x4 = el(bill.el, "cf-mono", AX - 52, OY + 14, 32, "4K");
  api.type(x4, { at: A(8, "4K") - 0.02, dur: 0.12 });
  api.mark(bsv, `M ${AX - 30} ${OY - 8} L ${AX - 30} ${OY + 8}`, { at: A(8, "4K"), dur: 0.1, tone: "ink", width: 4, sound: false });
  const g2 = el(bill.el, "cf-mono kit-tone-accent", OX + 16, AY + 6, 34, "2 GB");
  api.type(g2, { at: A(8, "GB") - 0.15, dur: 0.15 });
  api.mark(bsv, `M ${OX} ${AY + 30} L ${AX - 30} ${AY + 30}`, { at: A(8, "GB") - 0.1, dur: 0.3, tone: "accent", width: 3, opacity: 0.6, sound: false });
  api.mark(bsv, g.loop(AX - 30, AY + 30, 26, 26, 61), { at: A(8, "GB") + 0.15, dur: 0.26, tone: "accent", width: 5 });
  typed(bill.el, "每个 token 的 K、V（FP16）：", 40, 466, 32, tLl.start, tLl.end - 0.1, { tone: "muted" });
  typed(bill.el, "2 × 32 层 × 4096 × 2 B ≈ 0.5 MB", 40, 520, 34, tLl.end, t4k.end - 0.05);
  const fin = typed(bill.el, "× 4096 个 token ≈ 2 GB", 40, 590, 40, t4k.end, A(8, "GB") + 0.15, { tone: "accent" });
  api.highlight(bill.el, { x: 34, y: 594, w: 470, h: 44, at: A(8, "GB") + 0.25, dur: 0.25, under: fin });

  api.focus(L8.start - 0.6, R(5, 830, 110, 1080, 640), { station: 5, fill: 0.95 });
  api.focus(tMem.end - 0.1, R(5, 100, 120, 740, 460), { max: 1.2 });
  api.focus(tLl.start - 0.25, R(5, 100, 430, 740, 430), { max: 1.2 });
  api.focus(L8.end - 0.75, R(5, 100, 110, 1800, 760), { fill: 0.96 });
  ST(5).entry = rep;
  ST(5).ride = { a: kv.tie("bl", [24, 24]), b: rep.tie("br", [24, 24]) };
  ST(4).ride = { a: sus[2].c.tie("br", [24, 24]), b: kv.tie("tr", [24, 44]), via: P(3, 1640, 1180) };
  ST(2).ride = { a: exA.tie("tr", [24, 44]), b: photo.tie("tl", [24, 44]) };

  return { render(t) {} };
};
