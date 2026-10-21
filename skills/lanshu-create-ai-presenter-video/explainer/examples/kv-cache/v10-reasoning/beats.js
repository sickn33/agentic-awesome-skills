/* beats.js — KV cache, performed in V10 · 推演 (stories/kv-cache-reasoning).
 *
 * One canvas, four derivation stations (the starter's 2×2 snake): ① the question — the formula is built term by term
 * as each symbol is spoken, the new token's q is compared with every earlier k on a vector plane, weights take the v's;
 * ② the derivation — the triangle grows row by row (rose = the new k·v of that step, vermilion ↻ = recomputed), the sum
 * 1+2+…+8 = 36 = 8 + 28 and the columns that give the repetition away; ③ the cache — each diagonal dot flies down into
 * the KV cache once, the repeats fade, only the new token is computed and written, q scans the stored k's and takes the
 * v's back; ④ the cost — n → 1 on one plot, the memory line on the other, 0.5 MB/token derived from the facts, 4K → 2 GB.
 * Every beat time comes from story.at / story.phrase; illustrative numbers carry 「示意」.
 */
window.Beats = function (api) {
  "use strict";
  const { story, Kit, C, U, T } = api;
  const { E, pr, clamp01, lerp } = C;
  const at = api.at, ph = api.ph;
  const { vis, op, tr, attr, svg, el, draw } = U;
  const R = (fn) => api.add(fn);
  const S1 = api.station(1), S2 = api.station(2), S3 = api.station(3), S4 = api.station(4);
  const pulse = U.pulse;
  const pop = (t, a, d = 0.32) => E.back(pr(t, a, d));
  const math = (s) => `<span class="kit-math">${s}</span>`;

  // captions: each key span in the colour of what it names
  api.keys(1, [{ text: "q", tone: "q" }, { text: "k", tone: "k" }, { text: "v", tone: "v" }]);
  api.keys(2, ["几份", { text: "k", tone: "k" }, { text: "v", tone: "v" }]);
  api.keys(3, [{ text: "8份", tone: "warn" }]);
  api.keys(4, ["三角形", { text: "28份", tone: "warn" }]);
  api.keys(5, [{ text: "k", tone: "k" }, { text: "v", tone: "v" }, "只算一次"]);
  api.keys(6, ["新来的那一个"]);
  api.keys(7, ["只算1份", { text: "线性变大", tone: "warn" }]);
  api.keys(8, [{ text: "0.5MB", tone: "warn" }, { text: "2GB", tone: "warn" }]);

  // the illustrative sentence (示意) and its 2D key directions: q points between 蓝光 and 散射
  const TOK = ["因为", "空气", "把", "蓝光", "散射", "得", "更", "多"];
  const ANG = [200, 160, 238, 58, 36, 128, 96], QANG = 50;
  const WR = ANG.map((a) => Math.exp(2 * Math.cos(((a - QANG) * Math.PI) / 180)));
  const WS = WR.reduce((a, b) => a + b, 0), WT = WR.map((x) => x / WS), WMAX = Math.max(...WT);

  // ================= ① the question: what does one new token need? =================
  S1.header.el.style.display = "none";
  const L1 = (u, n) => at(1, u, n), L2 = (u, n) => at(2, u, n);
  const tQ = L1("q"), tK = L1("k"), tCmp = ph(1, "比一比"), tRatio = ph(1, "按比例"), tV = L1("v");
  const F1 = Kit.formula({
    size: 72, drop: 50,
    terms: [
      { text: "out", t: tV + 0.35 },
      { text: " = ", up: true, t: tV + 0.4 },
      { html: "Σ<sub>i</sub>", up: true, t: tV + 0.45 },
      { text: " softmax(", up: true, dim: true, t: tRatio },
      { text: "q", tone: "q", t: tQ, label: "新 token 的提问", labelAt: tQ + 0.2, pulse: [tCmp, L2("几") + 0.1] },
      { text: " · ", up: true, t: tCmp },
      { text: "k", sub: "i", tone: "k", t: tK, label: "拿来匹配", labelAt: tK + 0.15, pulse: [tCmp + 0.1, L2("k")] },
      { text: ")", up: true, dim: true, t: tRatio },
      { text: " v", sub: "i", tone: "v", t: tV, label: "被取走的内容", labelAt: tV + 0.15, pulse: [L2("v")] },
    ],
  }).center(960, 92);
  S1.el.appendChild(F1.el);
  R((t) => F1.render(t));

  // the sentence so far, then the new token
  const TW = TOK.map((s) => (s.length === 2 ? 100 : 72)), TY = 398, TH = 62;
  let x0 = 140;
  const TX = TW.map((w) => { const v = x0; x0 += w + 16; return v; });
  const TC = TX.map((x, j) => x + TW[j] / 2);
  const toks = TOK.map((s, j) => Kit.box(S1.el, { x: TX[j], y: TY, w: TW[j], h: TH, text: s, size: 30, tone: j === 7 ? "accent" : null }));
  const tTok = (j) => (j < 7 ? L1("大") + j * 0.09 : L1("新"));
  const tNth = L2("出");
  R((t) => toks.forEach((b, j) => {
    const u = j < 7 ? E.o3(pr(t, tTok(j), 0.3)) : pop(t, tTok(7), 0.42);
    vis(b, Math.min(1, u * 1.5));
    const k = j === 7 ? 1 + 0.12 * pulse(t, tNth, 0.5) : 1;
    tr(b, j < 7 ? `translateY(${((1 - u) * 18).toFixed(1)}px)` : `translateY(${(-(1 - u) * 80).toFixed(1)}px) scale(${((0.7 + 0.3 * u) * k).toFixed(3)})`);
  }));
  // its q comes out of it (rose), every earlier token's k (teal) and v (amber) come out of them
  const chip = (x, y, w, h, s, tone) => Kit.box(S1.el, { x, y, w, h, text: math(s), html: true, size: 28, tone, r: 9 });
  const qChip = chip(TC[7] - 26, 322, 52, 44, "q", "q");
  const kChips = TOK.map((_, j) => chip(TC[j] - (TW[j] - 26) / 2, 508, TW[j] - 26, 38, "k", "k"));
  const vChips = TOK.map((_, j) => chip(TC[j] - (TW[j] - 26) / 2, 554, TW[j] - 26, 38, "v", "v"));
  const tKc = (j) => (j < 7 ? ph(1, "前面") + 0.13 * j : L2("k") - 0.05);
  const tVc = (j) => (j < 7 ? L1("取") + 0.07 * j : L2("v") - 0.05);
  R((t) => {
    const uq = pop(t, L1("拿") + 0.05, 0.4);
    vis(qChip, t >= L1("拿") + 0.05 ? 1 : 0);
    tr(qChip, `translateY(${((1 - uq) * 60).toFixed(1)}px) scale(${(0.5 + 0.5 * uq).toFixed(3)})`);
    [[kChips, tKc, L2("k")], [vChips, tVc, L2("v")]].forEach(([list, tf, tp]) => list.forEach((b, j) => {
      const u = pop(t, tf(j), 0.34);
      vis(b, t >= tf(j) ? 1 : 0);
      const k = 1 + 0.14 * pulse(t, tp + 0.03 * j, 0.45);
      tr(b, `translateY(${(-(1 - Math.min(1, u)) * 40).toFixed(1)}px) scale(${((0.5 + 0.5 * u) * k).toFixed(3)})`);
    }));
  });

  // q against every k: the vector plane (二维示意) — the closer the direction, the bigger the dot product
  const PL = Kit.plane(S1.svg, { cx: 1475, cy: 500, R: 185 });
  const kv = ANG.map((a, j) => PL.vector({ ang: a, len: 0.78 + 0.05 * (j % 3), tone: "k", width: 2.6, label: TOK[j], labelSize: 28 }));
  const qv = PL.vector({ ang: QANG, len: 1.02, tone: "q", width: 5, glow: true, label: "q", math: true, labelSize: 40, labelR: 0.3 });
  const near = [3, 4];
  const proj = near.map((j) => PL.project(qv, kv[j], { tone: "q" }));
  R((t) => {
    PL.render(t, L1("拿") - 0.1);
    qv.render(t, tQ);
    kv.forEach((v, j) => v.render(t, ph(1, "前面") + 0.13 * j + 0.05, { w: near.includes(j) && t > tCmp ? 4.2 : 2.6, op: near.includes(j) || t < tCmp ? 1 : 1 - 0.45 * pr(t, tCmp, 0.4) }));
    near.forEach((j, m) => proj[m].render(t, tCmp + 0.05 + 0.12 * m, QANG, 1.02, ANG[j]));
  });
  const pLab = api.label(S1.el, 1475, 744, { text: "方向越接近，点积越大", tone: "muted" }, tCmp + 0.3);
  pLab.el.style.transform = "translateX(-50%)";
  api.label(S1.el, 1660, 296, { text: "二维示意", tone: "muted", size: 24 }, L1("拿") + 0.2);

  // 按比例: the softmax weights (示意) rise over the earlier tokens …
  const wBars = WT.slice(0, 7).map((w, j) => svg("rect", { x: TC[j] - 8, width: 16, rx: 4, fill: T.k }, S1.svg));
  api.label(S1.el, 140, 316, { text: "权重 · 示意", tone: "muted", size: 24 }, tRatio);
  R((t) => wBars.forEach((b, j) => {
    const u = E.o3(pr(t, tRatio + 0.06 * j, 0.45)), h = 52 * (WT[j] / WMAX) * u + 2;
    attr(b, "y", 388 - h); attr(b, "height", h);
    vis(b, t >= tRatio + 0.06 * j ? 0.9 : 0);
  }));
  // … and that much of each v is taken: amber dots slide into the new token's out
  const OUT = { x: 1030, y: 573 };
  const outC = svg("circle", { cx: OUT.x, cy: OUT.y, r: 4, fill: T.v, class: "kit-glow", style: `color:${T.v}` }, S1.svg);
  const outL = api.txt(S1.el, "kit-math", OUT.x + 30, OUT.y - 24, "out", `font-size:34px;color:${T.v}`);
  const vDots = WT.slice(0, 7).map(() => svg("circle", { r: 5, fill: T.v }, S1.svg));
  const tFlow = (j) => tV + 0.08 + 0.06 * j;
  R((t) => {
    let got = 0;
    vDots.forEach((d, j) => {
      const u = E.io2(pr(t, tFlow(j), 0.55));
      attr(d, "cx", lerp(TC[j], OUT.x, u)); attr(d, "cy", OUT.y - Math.sin(Math.PI * u) * 30);
      attr(d, "r", 4 + 10 * Math.sqrt(WT[j] / WMAX));
      vis(d, t >= tFlow(j) && u < 1 ? 1 : 0);
      if (u >= 1) got += WT[j];
    });
    attr(outC, "r", 5 + 17 * Math.sqrt(got));
    vis(outC, t >= tFlow(0) ? 1 : 0);
    vis(outL, pr(t, tV + 0.3, 0.3));
  });

  // ② 第 n 个 token: positions under the tokens, n under the new one; a brace over all n k·v pairs: 一共几份？
  const idx = TOK.map((_, j) => api.txt(S1.el, j < 7 ? "" : "kit-math", TC[j], j < 7 ? 466 : 458, j < 7 ? String(j + 1) : "n", j < 7 ? "font-family:var(--kit-font-mono);font-size:24px;color:var(--kit-muted);transform:translateX(-50%)" : `font-size:36px;color:${T.q};transform:translateX(-50%)`));
  const tIdx = (j) => (j < 7 ? L2("第") + 0.08 * j : L2("n"));
  R((t) => idx.forEach((e, j) => vis(e, pr(t, tIdx(j), 0.2))));
  const br = Kit.brace(S1.svg, { x1: TX[7] + TW[7], y1: 610, x2: TX[0], y2: 610, depth: 22, tone: "q", width: 2.6 });
  R((t) => br.render(t, ph(2, "一共"), 0.6));
  api.stmt(S1.el, br.tip.x, 646, "一共几份？", L2("几"), { size: 42, tone: "accent", center: true, cps: 16 });
  api.note(S1.el, 140, 778, "第 $n$ 步，要用到前面全部 $n$ 个 token 的 {k:$k$} 和 {v:$v$}", ph(2, "一共") + 0.25);

  // camera: lean toward the plane while q is compared, then back over the tokens for the question
  api.focus(tCmp - 0.35, tV - 0.2, { station: S1, x: 1000, y: 530, s: 1.0 });
  api.focus(L2("第") - 0.2, L2("v") + 0.2, { station: S1, x: 900, y: 540, s: 1.02, amt: 0.8 });

  // ================= ② the derivation: draw every step =================
  const L3 = (u, n) => at(3, u, n), L4 = (u, n) => at(4, u, n);
  const DX = 360, DY = 262, DP = 60;
  const tri = Kit.dots(S2.svg, { x: DX, y: DY, n: 8, pitch: DP, r: 12, shape: "tri" });
  // when row r (step r+1) appears, and when its c-th dot pops
  const rowAt = (r) => (r === 0 ? L3("1", 1) : r === 1 ? L3("2", 1) : r < 7 ? L3("第", 3) + 0.08 * (r - 2) : L3("8", 1));
  const dotAt = (r, c) => (r === 0 ? L3("1", 2) - 0.02 : r === 1 ? L3("2", 2) - 0.1 + 0.1 * c : r < 7 ? rowAt(r) + 0.05 + 0.025 * c : L3("就") + 0.075 * c);
  const rowL = TOK.map((s, r) => { const e = api.txt(S2.el, "", DX - 52, DY + r * DP - 21, s, "font-size:28px;font-weight:500;color:var(--kit-ink);transform:translateX(-100%)"); return e; });
  const stepL = TOK.map((_, r) => {
    const l = Kit.label({ text: `第 ${r + 1} 步：算 ${r + 1} 份`, tone: r === 0 || r === 1 || r === 7 ? "default" : "muted", size: 28 });
    api.put(S2.el, l.el, DX + 8 * DP + 4, DY + r * DP - 21);
    return l;
  });
  const tTri = L4("三"), tSum = L4("8"), t36 = L4("36"), tOf = ph(4, "其中"), t28 = L4("28"), tEarly = ph(4, "早就算过");
  const tFly = at(5, "一"), tStore = ph(5, "存进"), tNew = ph(6, "只算");
  R((t) => {
    tri.rows.forEach((row, r) => {
      vis(rowL[r], pr(t, rowAt(r), 0.25));
      stepL[r].render(t, rowAt(r), Infinity, r > 1 && r < 7 ? 90 : 34);
      row.forEach((d, c) => {
        const a = dotAt(r, c);
        // before its step: the construction lattice — every position of the triangle waits as a faint dashed ring
        if (t < a) { const gA = S2.show + 0.25 + 0.012 * (r * 8 + c); tri.paint(d, { s: t >= gA ? 0.75 * E.o3(pr(t, gA, 0.3)) : 0, ring: "muted", ringA: 0.55, dash: true }); return; }
        const g = pop(t, a, 0.3), diag = c === r;
        // the sum: rows light in turn; 36: all; 其中 8: the diagonal; 28: the repeats; then the cache takes over
        let k = 1 + 0.28 * pulse(t, tSum + 0.12 * r, 0.42) + 0.2 * pulse(t, t36, 0.5);
        let glow = 0.2 * pulse(t, tSum + 0.12 * r, 0.42);
        if (diag) { k += 0.25 * pulse(t, tOf + 0.15, 0.5); glow = Math.max(glow, 0.55 * (1 - pr(t, a, 0.8)) + 0.25 + 0.6 * pulse(t, tOf + 0.15, 0.5)); }
        else { k += 0.25 * pulse(t, t28 + 0.02 * c, 0.5); glow = Math.max(glow, 0.8 * pulse(t, t28 + 0.02 * c, 0.5)); }
        if (diag) {
          // rows 1–7: its k·v leaves for the cache (only the outline stays); row 8 stays lit — the step being computed
          const gone = r < 7 ? pr(t, tFly + 0.08 * r, 0.25) : 0;
          tri.paint(d, { s: g * k, fill: "q", fillA: 1 - 0.85 * gone, ring: "q", ringA: gone * 0.6, dash: gone > 0, glow: glow * (1 - gone) });
        } else {
          // a recomputation: vermilion ring with ↻; once the cache exists it fades to a dashed ghost (不再重算)
          const fade = r < 7 ? pr(t, tFly + 0.1, 0.8) : pr(t, tNew, 0.5);
          tri.paint(d, { s: g * k, ring: fade > 0.5 ? "muted" : "warn", ringA: 1 - 0.65 * fade, arc: 1 - fade, dash: fade > 0.5, fill: "warn", fillA: 0.12 * (1 - fade), glow: glow * (1 - fade) });
        }
      });
    });
  });
  // 画出来是一个三角形
  const triPath = `M ${DX - 34} ${DY - 40} L ${DX - 34} ${DY + 7 * DP + 34} L ${DX + 7 * DP + 40} ${DY + 7 * DP + 34} Z`;
  const triS = Kit.stroke(S2.svg, { d: triPath, tone: "ink", width: 2, dash: "6 8", opacity: 0.6 });
  R((t) => triS.render(t, tTri - 0.2, 0.7));
  // the sum builds as the rows are drawn (1, + 2, + … , + 8), and is closed when it is spoken: = 36
  const F2 = Kit.formula({
    size: 62,
    terms: [
      { text: "1", up: true, t: dotAt(0, 0), pulse: [tSum] },
      { text: " + ", up: true, t: dotAt(1, 0) - 0.05 },
      { text: "2", up: true, t: dotAt(1, 1), pulse: [tSum + 0.12] },
      { text: " + … + ", up: true, t: rowAt(2) },
      { text: "8", up: true, t: dotAt(7, 7), pulse: [tSum + 0.84] },
      { text: " = ", up: true, t: t36 - 0.2 },
      { text: "36", up: true, tone: "ink", t: t36, pulse: [t36] },
    ],
  });
  api.put(S2.el, F2.el, 1190, 268);
  R((t) => F2.render(t));
  const F3 = Kit.formula({
    size: 62, drop: 46,
    terms: [
      { text: "36", up: true, t: tOf },
      { text: " = ", up: true, t: tOf + 0.1 },
      { text: "8", up: true, tone: "q", t: tOf + 0.2, label: "对角线：新算的", labelAt: tOf + 0.3, pulse: [tOf + 0.2] },
      { text: " + ", up: true, t: t28 - 0.2 },
      { text: "28", up: true, tone: "warn", t: t28, label: "左边：又算一遍", labelAt: t28 + 0.1, pulse: [t28] },
    ],
  });
  api.put(S2.el, F3.el, 1190, 392);
  R((t) => F3.render(t));
  // 都是早就算过的: every column is one token, recomputed again and again
  const cols = Array.from({ length: 7 }, (_, c) => Kit.stroke(S2.svg, { d: `M ${DX + c * DP} ${DY + c * DP + 24} L ${DX + c * DP} ${DY + 7 * DP + 22}`, tone: "warn", width: 3, dash: "3 7" }));
  R((t) => cols.forEach((s, c) => s.render(t, tEarly + 0.06 * c, 0.45)));
  api.label(S2.el, DX - 34, DY + 7 * DP + 52, { text: "每一列 = 同一个 token 的 {k:$k$}、{v:$v$}，早就算过", tone: "warn", size: 28 }, tEarly + 0.25);
  api.label(S2.el, DX - 60, 206, { text: "不缓存：每一步把前面的都重算一遍", tone: "warn", size: 28 }, L3("不"));
  api.note(S2.el, 1190, 640, "第 $n$ 步重算 $n$ 份：加起来是个三角形", L4("画") + 0.1);

  // ================= ③ the cache: compute once, store, only the new one is computed =================
  const L5 = (u, n) => at(5, u, n), L6 = (u, n) => at(6, u, n);
  const KX = 540, VX = 710, CW = 150, CH = 46, CY = 268, CP = 58;
  const cellY = (r) => CY + r * CP;
  const tEmpty = L5("每") - 0.3;
  const kHead = api.txt(S3.el, "kit-math", KX + CW / 2, 210, "k", `font-size:44px;color:${T.k};transform:translateX(-50%)`);
  const vHead = api.txt(S3.el, "kit-math", VX + CW / 2, 210, "v", `font-size:44px;color:${T.v};transform:translateX(-50%)`);
  api.stmt(S3.el, KX - 330, 196, "KV 缓存", ph(5, "缓存"), { size: 40, cps: 12 });
  const cLab = TOK.map((s, r) => api.txt(S3.el, "", KX - 22, cellY(r) + 4, s, `font-size:28px;font-weight:500;color:${r === 7 ? T.q : "var(--kit-ink)"};transform:translateX(-100%)`));
  const cells = TOK.map((_, r) => [KX, VX].map((x, c) => svg("rect", { x, y: cellY(r), width: CW, height: CH, rx: 10, fill: c ? T.v : T.k, "fill-opacity": 0, stroke: T.muted, "stroke-width": 1.8, "stroke-dasharray": "6 6" }, S3.svg)));
  // flights: each diagonal dot of the triangle (rows 1–7) flies down into its cache row, splitting into its k and v
  const W = api.world.svg;
  const fl = TOK.slice(0, 7).map((_, r) => {
    return [0, 1].map((c) => {
      const sx = S2.x + DX + r * DP + 17, sy = S2.y + DY + r * DP + (c ? 9 : -9);
      const ex = S3.x + (c ? VX : KX) + CW / 2, ey = S3.y + cellY(r) + CH / 2;
      const d = `M ${sx} ${sy} C ${sx + 60} ${sy + 520} ${ex - 40} ${ey - 560} ${ex} ${ey}`;
      const p = svg("path", { d, fill: "none" }, W);
      const dot = svg("circle", { r: 11, fill: c ? T.v : T.k, class: "kit-glow", style: `color:${c ? T.v : T.k}` }, W);
      return { p, len: p.getTotalLength(), dot, a: tFly + 0.08 * r, d: 0.78 };
    });
  });
  // on the triangle: each diagonal dot shows its k and v (teal / amber) as they are named; those are what fly
  const kvd = TOK.slice(0, 7).map((_, r) => [0, 1].map((c) => svg("circle", { cx: DX + r * DP + 17, cy: DY + r * DP + (c ? 9 : -9), r: 7, fill: c ? T.v : T.k }, S2.svg)));
  R((t) => kvd.forEach((pair, r) => pair.forEach((d, c) => {
    const a = (c ? L5("v") : L5("k")) + 0.04 * r;
    attr(d, "r", 7 * pop(t, a, 0.3) + 2 * pulse(t, ph(5, "只算") + 0.03 * r, 0.4));
    vis(d, t >= a && t < tFly + 0.08 * r ? 1 : 0);
  })));
  const tWrite = L6("个") + 0.12; // 多's own k, v: computed once, written into the last row
  R((t) => {
    vis(kHead, pr(t, tFly + 0.45, 0.25)); vis(vHead, pr(t, tFly + 0.55, 0.25));
    cells.forEach((pair, r) => {
      vis(cLab[r], pr(t, tEmpty + 0.06 * r, 0.25));
      pair.forEach((rc, c) => {
        const appear = tEmpty + 0.06 * r + 0.03 * c;
        vis(rc, t >= appear ? pr(t, appear, 0.25) : 0);
        const filled = r < 7 ? fl[r][c].a + fl[r][c].d : tWrite + 0.45;
        const u = E.o3(pr(t, filled - 0.05, 0.3));
        const tone = c ? T.v : T.k;
        attr(rc, "stroke", u > 0 ? tone : r === 7 && t >= tNew ? T.q : T.muted);
        attr(rc, "stroke-dasharray", u > 0 ? "none" : "6 6");
        attr(rc, "fill-opacity", 0.24 * u + 0.25 * pulse(t, filled - 0.05, 0.4));
      });
    });
    fl.forEach((pair) => pair.forEach((f) => {
      const u = E.io2(pr(t, f.a, f.d));
      const q = f.p.getPointAtLength(u * f.len);
      attr(f.dot, "cx", q.x); attr(f.dot, "cy", q.y);
      vis(f.dot, t >= f.a && u < 1 ? 1 : 0);
    }));
  });
  // the camera stays on the triangle while each token's k and v are named, then glides down with them into the cache
  api.focus(S2.leave - 0.3, tFly + 0.95, { station: S2, x: 760, y: 520, s: 0.92, ease: 0.9, drift: 0.03 });

  // 之后只算新来的那一个: the new token, its q, k, v computed once (×1), the count of this step: 8 → 1
  const NX = 1060, NY = cellY(7) - 6;
  const nTok = Kit.box(S3.el, { x: NX, y: NY, w: 76, h: 58, text: "多", size: 30, tone: "accent" });
  const nq = Kit.box(S3.el, { x: NX + 100, y: NY + 6, w: 56, h: 46, text: math("q"), html: true, size: 28, tone: "q", r: 9 });
  const nk = Kit.box(S3.el, { x: NX + 168, y: NY + 6, w: 56, h: 46, text: math("k"), html: true, size: 28, tone: "k", r: 9 });
  const nv = Kit.box(S3.el, { x: NX + 236, y: NY + 6, w: 56, h: 46, text: math("v"), html: true, size: 28, tone: "v", r: 9 });
  api.label(S3.el, NX, NY - 52, { text: "新来的那一个：只算它", tone: "accent", size: 28 }, ph(6, "新来"));
  const tCalc = L6("那");
  // its k and v copies glide left into the cache's last row (算一次，写进去)
  const wk = Kit.box(S3.el, { x: 0, y: 0, w: 56, h: 46, text: math("k"), html: true, size: 28, tone: "k", r: 9 });
  const wv = Kit.box(S3.el, { x: 0, y: 0, w: 56, h: 46, text: math("v"), html: true, size: 28, tone: "v", r: 9 });
  api.label(S3.el, KX, cellY(7) + CH + 14, { text: "新的一行：算一次，写进去", tone: "accent", size: 28 }, tWrite + 0.3);
  R((t) => {
    const u0 = pop(t, ph(6, "新来"), 0.4);
    vis(nTok, t >= ph(6, "新来") ? 1 : 0);
    tr(nTok, `scale(${(0.5 + 0.5 * u0).toFixed(3)})`);
    [nq, nk, nv].forEach((b, j) => {
      const u = pop(t, tCalc + 0.09 * j, 0.32);
      vis(b, t >= tCalc + 0.09 * j ? 1 : 0);
      tr(b, `translateX(${(-(1 - Math.min(1, u)) * 40).toFixed(1)}px) scale(${(0.5 + 0.5 * u).toFixed(3)})`);
    });
    [[wk, NX + 168, KX + CW / 2 - 28], [wv, NX + 236, VX + CW / 2 - 28]].forEach(([b, xa, xb], j) => {
      const u = E.io3(pr(t, tWrite + 0.06 * j, 0.45));
      b.style.left = lerp(xa, xb, u).toFixed(1) + "px";
      b.style.top = (NY + 6 - Math.sin(Math.PI * u) * 46).toFixed(1) + "px";
      vis(b, t >= tWrite + 0.06 * j && u < 1 ? 1 : 0);
    });
  });
  // 这一步要算几份 k、v: without the cache 8, with it 1
  const CNT = { x: 1240, y: 300 };
  api.txt(S3.el, "", CNT.x, CNT.y - 50, "这一步要算几份 k、v", "font-size:26px;font-weight:500;color:var(--kit-muted)");
  const cntHead = S3.el.lastChild;
  const cA = api.txt(S3.el, "", CNT.x, CNT.y, "不缓存", "font-size:28px;font-weight:500;color:var(--kit-ink)");
  const blocks = Array.from({ length: 8 }, (_, j) => Kit.box(S3.el, { x: CNT.x + 100 + j * 30, y: CNT.y + 6, w: 22, h: 28, text: "", r: 5, cls: "cnt" }));
  blocks.forEach((b) => Object.assign(b.style, { background: "#4a5272", border: "none" }));
  const cA8 = api.txt(S3.el, "", CNT.x + 352, CNT.y, "8", "font-family:var(--kit-font-mono);font-size:28px;color:var(--kit-muted)");
  const cB = api.txt(S3.el, "", CNT.x + 430, CNT.y, "有缓存", "font-size:28px;font-weight:500;color:var(--kit-ink)");
  const one = Kit.box(S3.el, { x: CNT.x + 530, y: CNT.y + 6, w: 22, h: 28, text: "", r: 5 });
  Object.assign(one.style, { background: T.q, border: "none", boxShadow: "0 0 16px rgba(255,142,166,0.7)" });
  const cB1 = api.txt(S3.el, "", CNT.x + 566, CNT.y, "1", `font-family:var(--kit-font-mono);font-size:28px;color:${T.q}`);
  R((t) => {
    // without the cache this step would compute all 8 (the triangle's last row) — shown as the camera lands
    const a = tStore + 0.85;
    vis(cntHead, pr(t, a - 0.1, 0.3)); vis(cA, pr(t, a - 0.1, 0.3));
    blocks.forEach((b, j) => { vis(b, pr(t, a + 0.06 * j, 0.15)); tr(b, `scaleY(${E.back(pr(t, a + 0.06 * j, 0.25)).toFixed(3)})`); });
    vis(cA8, pr(t, a + 0.5, 0.2));
    vis(cB, pr(t, tCalc - 0.1, 0.3));
    vis(one, t >= L6("一") ? 1 : 0); tr(one, `scale(${E.back(pr(t, L6("一"), 0.35)).toFixed(3)})`);
    vis(cB1, pr(t, L6("一") + 0.1, 0.2));
  });
  // 再去缓存里查: q runs down the stored k's (each lights by how well it matches, 示意), the v's come back as amber
  const tLook = ph(6, "缓存里"), tBack = L6("查");
  const probe = svg("rect", { width: CW + 12, height: CH + 12, rx: 13, fill: "none", stroke: T.q, "stroke-width": 3, class: "kit-glow", style: `color:${T.q}` }, S3.svg);
  const mBars = WT.slice(0, 7).map(() => svg("rect", { height: 12, rx: 6, fill: T.v }, S3.svg));
  const OUT3 = { x: NX + 470, y: cellY(3) + CH / 2 };
  const out3 = svg("circle", { cx: OUT3.x, cy: OUT3.y, r: 4, fill: T.v, class: "kit-glow", style: `color:${T.v}` }, S3.svg);
  const out3L = api.txt(S3.el, "kit-math", OUT3.x + 30, OUT3.y - 26, "out", `font-size:34px;color:${T.v}`);
  const backD = WT.slice(0, 7).map(() => svg("circle", { r: 6, fill: T.v }, S3.svg));
  api.label(S3.el, VX + CW + 26, cellY(0) - 46, { text: "按匹配取回 {v:$v$}（示意）", tone: "muted", size: 24 }, tBack - 0.1);
  R((t) => {
    // the probe: from the new token's q up into the k column, then row by row down to 更
    const span = Math.max(0.35, tBack - tLook);
    const u = pr(t, tLook - 0.1, span);
    const r = 6 * E.io2(u);
    attr(probe, "x", KX - 6); attr(probe, "y", cellY(0) + r * CP - 6);
    vis(probe, t >= tLook - 0.1 && t < tBack + 0.5 ? 1 - pr(t, tBack + 0.2, 0.3) : 0);
    cells.slice(0, 7).forEach((pair, j) => {
      const hit = pulse(t, tLook - 0.1 + (span * j) / 6, 0.4);
      if (hit > 0) attr(pair[0], "fill-opacity", 0.24 + 0.55 * hit * (0.3 + 0.7 * WT[j] / WMAX));
    });
    mBars.forEach((b, j) => {
      const g = E.o3(pr(t, tLook + (span * j) / 6, 0.3)), wpx = 10 + 150 * (WT[j] / WMAX) * g;
      attr(b, "x", VX + CW + 22); attr(b, "y", cellY(j) + CH / 2 - 6); attr(b, "width", wpx);
      vis(b, t >= tLook + (span * j) / 6 ? 0.9 * (1 - pr(t, tBack + 0.15 + 0.04 * j, 0.25)) : 0);
      const d = backD[j], uu = E.io2(pr(t, tBack + 0.15 + 0.04 * j, 0.5));
      attr(d, "cx", lerp(VX + CW + 22 + wpx, OUT3.x, uu)); attr(d, "cy", lerp(cellY(j) + CH / 2, OUT3.y, uu));
      attr(d, "r", 4 + 9 * Math.sqrt(WT[j] / WMAX));
      vis(d, t >= tBack + 0.15 + 0.04 * j && uu < 1 ? 1 : 0);
    });
    let got = 0;
    WT.slice(0, 7).forEach((w, j) => { if (t >= tBack + 0.65 + 0.04 * j) got += w; });
    attr(out3, "r", 5 + 17 * Math.sqrt(got));
    vis(out3, t >= tBack + 0.15 ? 1 : 0);
    vis(out3L, pr(t, tBack + 0.3, 0.3));
  });
  api.note(S3.el, 140, 860, "旧的 {k:$k$}、{v:$v$} 收进缓存，以后只查不算", tStore + 0.35);

  // ================= ④ the cost: memory for speed =================
  const L7 = (u, n) => at(7, u, n), L8 = (u, n) => at(8, u, n);
  const PA = Kit.plot(S4.svg, { x: 170, y: 300, w: 480, h: 330, xMax: 8.6, yMax: 8.6, xTicks: [1, 2, 3, 4, 5, 6, 7, 8], xLabel: "第几步 →", yLabel: "这一步要算几份 k、v" });
  R((t) => PA.render(t, L7("每") - 0.05));
  const tN = ph(7, "从算"), tTo = ph(7, "变成"), tOne = L7("1");
  const pDots = Array.from({ length: 8 }, (_, j) => {
    const n = j + 1;
    return { n, ghost: svg("circle", { cx: PA.px(n), cy: PA.py(n), r: 7, fill: "none", stroke: T.warn, "stroke-width": 2 }, PA.layer), d: svg("circle", { r: 8, fill: T.warn }, PA.layer) };
  });
  const lineN = PA.line([[1, 1], [8, 8]], { tone: "warn", width: 3, dash: "9 9" });
  const line1 = PA.line([[1, 1], [8, 1]], { tone: "k", width: 5, glow: true });
  R((t) => {
    lineN.render(t, L7("n"), 0.5);
    line1.render(t, tOne - 0.05, 0.45);
    pDots.forEach((p, j) => {
      const a = tN + 0.05 * j, f = tTo + 0.05 + 0.05 * j;
      const g = pop(t, a, 0.3), u = E.i2(pr(t, f, 0.45)), land = pr(t, f + 0.45, 0.2);
      const y = lerp(PA.py(p.n), PA.py(1), u) - 10 * pulse(t, f + 0.45, 0.25);
      attr(p.d, "cx", PA.px(p.n)); attr(p.d, "cy", y);
      attr(p.d, "r", 8 * g);
      attr(p.d, "fill", land > 0.5 ? T.k : T.warn);
      vis(p.d, t >= a ? 1 : 0);
      vis(p.ghost, t >= f ? 0.7 * pr(t, f, 0.2) : 0);
    });
  });
  api.label(S4.el, 190, 300, { text: "不缓存：第 $n$ 步算 $n$ 份", tone: "warn", size: 28 }, L7("n") + 0.05);
  const l1 = Kit.label({ text: "缓存：每步只算 1 份", tone: "k", size: 28 });
  api.put(S4.el, l1.el, 650, PA.py(1) - 48);
  l1.el.style.transform = "translateX(-100%)";
  R((t) => l1.render(t, tOne + 0.1));
  // the price: the cache's memory grows with the context, linearly
  const PB = Kit.plot(S4.svg, { x: 990, y: 300, w: 740, h: 330, xMax: 4600, yMax: 2.4, xLabel: "上下文长度（token）→", yLabel: "缓存占的显存" });
  R((t) => PB.render(t, ph(7, "代价")));
  const tGrow = ph(7, "随长度"), tLin = ph(7, "线性");
  const memArea = svg("path", { d: `M ${PB.px(0)} ${PB.py(0)} L ${PB.px(4096)} ${PB.py(2)} L ${PB.px(4096)} ${PB.py(0)} Z`, fill: T.warn, "fill-opacity": 0.1 }, PB.layer);
  const memClip = svg("clipPath", { id: "memclip" }, PB.layer);
  const memRect = svg("rect", { x: PB.px(0), y: PB.y - 20, height: PB.h + 40, width: 0 }, memClip);
  memArea.setAttribute("clip-path", "url(#memclip)");
  const mem = PB.line([[0, 0], [4096, 2]], { tone: "warn", width: 5, glow: true });
  R((t) => {
    const u = mem.render(t, tGrow - 0.1, tLin + 0.55 - tGrow);
    attr(memRect, "width", (PB.px(4096) - PB.px(0)) * u);
    vis(memArea, t >= tGrow - 0.1 ? 1 : 0);
  });
  api.label(S4.el, 1180, 296, { text: "随长度线性变大", tone: "warn", size: 30 }, tLin);
  api.label(S4.el, 1020, 384, { text: "Llama 2 7B", sub: "FP16 · 32 层 · 4096 维", tone: "ink", size: 30 }, L8("Llama"));
  // 每个 token 约占 0.5 MB: the slope, and where the number comes from (story facts)
  const sx0 = PB.px(500), sx1 = PB.px(1400), sy0 = PB.py(500 / 2048), sy1 = PB.py(1400 / 2048);
  const slope = Kit.stroke(S4.svg, { d: `M ${sx0} ${sy0} L ${sx1} ${sy0} L ${sx1} ${sy1}`, tone: "warn", width: 2.5, dash: "6 6" });
  const tHalf = L8("0.5");
  R((t) => slope.render(t, tHalf - 0.1, 0.45));
  api.label(S4.el, sx1 + 16, sy0 - 52, { text: "每个 token ≈ 0.5 MB", tone: "warn", size: 28 }, tHalf + 0.1);
  const F4 = Kit.formula({
    size: 46, drop: 34, labelSize: 26, gap: 26,
    terms: [
      { text: "2", up: true, t: L8("每") + 0.05, label: "{k:$k$} 和 {v:$v$}" },
      { text: " × ", up: true, t: L8("每") + 0.15 },
      { text: "32", up: true, t: L8("个") + 0.05, label: "层" },
      { text: " × ", up: true, t: L8("个") + 0.15 },
      { text: "4096", up: true, t: L8("token") + 0.05, label: "维" },
      { text: " × ", up: true, t: L8("token") + 0.15 },
      { text: "2 B", up: true, t: L8("约"), label: "FP16" },
      { text: " ≈ ", up: true, t: L8("占") },
      { text: "0.5 MB", up: true, tone: "warn", t: tHalf, pulse: [tHalf] },
    ],
  });
  api.put(S4.el, F4.el, 1000, 690);
  R((t) => F4.render(t));
  // 4K 上下文 → 2 GB
  const t4k = L8("4K"), t2g = L8("2", 2);
  const drop4 = Kit.stroke(S4.svg, { d: `M ${PB.px(4096)} ${PB.py(0)} L ${PB.px(4096)} ${PB.py(2)}`, tone: "muted", width: 2, dash: "5 6" });
  const hor2 = Kit.stroke(S4.svg, { d: `M ${PB.px(4096)} ${PB.py(2)} L ${PB.px(0)} ${PB.py(2)}`, tone: "warn", width: 2, dash: "5 6" });
  const tick4 = api.txt(S4.el, "", PB.px(4096) + 12, PB.py(0) - 42, "4096", "font-family:var(--kit-font-mono);font-size:26px;color:var(--kit-ink)");
  const tick2 = api.txt(S4.el, "", PB.px(0) - 12, PB.py(2) - 18, "2 GB", `font-family:var(--kit-font-mono);font-size:28px;color:${T.warn};transform:translateX(-100%)`);
  const endDot = svg("circle", { cx: PB.px(4096), cy: PB.py(2), r: 10, fill: T.warn, class: "kit-glow", style: `color:${T.warn}` }, S4.svg);
  R((t) => {
    drop4.render(t, t4k, 0.5);
    vis(tick4, pr(t, t4k + 0.1, 0.25));
    hor2.render(t, t2g - 0.05, 0.4);
    vis(tick2, pr(t, t2g + 0.2, 0.25));
    attr(endDot, "r", 10 * pop(t, t2g, 0.35) + 4 * pulse(t, t2g + 0.35, 0.5));
    vis(endDot, t >= t2g ? 1 : 0);
  });
  const F5 = Kit.formula({
    size: 46,
    terms: [
      { text: "4096", up: true, t: t4k + 0.15 },
      { text: " × ", up: true, t: t4k + 0.3 },
      { text: "0.5 MB", up: true, t: t4k + 0.45 },
      { text: " = ", up: true, t: t2g - 0.15 },
      { text: "2 GB", up: true, tone: "warn", t: t2g, pulse: [t2g + 0.05] },
      { text: "（单条请求）", up: true, tone: "muted", t: t2g + 0.4, cls: "small" },
    ],
  });
  api.put(S4.el, F5.el, 1000, 834);
  F5.terms[5].s.style.cssText += ";font-family:var(--kit-font-body);font-size:26px;vertical-align:0.3em";
  R((t) => F5.render(t));
  api.note(S4.el, 170, 760, "不再重算，代价是缓存一直占着显存", L7("缓") + 0.1);

  api.focus(S4.arrive - 0.2, ph(7, "代价") + 0.5, { station: S4, x: 560, y: 480, s: 1.28, ease: 0.7 });
  api.focus(L8("Llama") - 0.3, L8("GB") + 0.5, { station: S4, x: 1070, y: 566, s: 1.0, amt: 0.85 });

  return { render() {} };
};
