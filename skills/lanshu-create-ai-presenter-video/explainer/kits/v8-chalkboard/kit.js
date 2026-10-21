/* V8 黑板报 chalkboard kit — window.Kit. Load after lib/core.js and lib/story.js. See KIT.md.
 *
 * The world is ONE wooden-framed blackboard divided into panels. Everything on it is chalk written live:
 *   S()  a hand-drawn stroke that draws on (dash) — the chalk stick rides it, dust falls off it
 *   T()  chalk text, each character revealed left→right at its own time (the spoken time, for narration)
 *   X()  the felt eraser sweeps a rectangle; every target fades as the felt passes over it
 * Kit.render(t) draws the whole board for time t (camera, chalk, eraser, stick, dust, flows, components).
 * Every build call is deterministic (no Math.random / Date); render is a pure function of t.
 */
(function (g) {
  "use strict";
  const X = g.ExplainerCore;
  if (!X) throw new Error("kit v8-chalkboard: load lib/core.js first");
  const { clamp01, pr, lerp, E, hash, track } = X;
  const NS = "http://www.w3.org/2000/svg";

  // ---------------- palette: chalk colours and what they mean ----------------
  const C = { w: "#f2efe6", m: "#d6d2c4", y: "#f6d96b", p: "#f3a3ba", b: "#94cdea", g: "#aedb93", o: "#f5b26b" };
  const TONE = { default: "w", ink: "w", muted: "m", accent: "y", warn: "p", ok: "g", accent2: "b", orange: "o" };
  const tk = (t) => (t == null ? "w" : TONE[t] || (C[t] ? t : "w"));
  const color = (t) => (typeof t === "string" && (t[0] === "#" || t.indexOf("rgb") === 0) ? t : C[tk(t)]);
  const CHAPTER_TONES = ["p", "b", "y", "g", "o", "y", "b"];
  const BORDERS = ["wave", "dash", "scallop", "dot", "zig", "double", "wave"];
  const CN = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  const clsColor = (cls) => { const m = /\bc([wmypbgo])\b/.exec(cls || ""); return C[m ? m[1] : "w"]; };

  // ---------------- deterministic jitter ----------------
  let SEED = 1;
  const ns = () => (SEED += 7.31);
  const jit = (s, a) => (hash(s) - 0.5) * 2 * a;
  const f1 = (v) => (+v).toFixed(1);

  // estimated width in em: CJK = 1, Latin / digits ≈ 0.48, space 0.3 (Patrick Hand / Long Cang)
  const wlen = (str) => Array.from(str).reduce((n, ch) => n + (ch === " " ? 0.3 : ch.charCodeAt(0) < 0x2000 || ch === "≈" ? 0.48 : 1), 0);

  // ---------------- hand-drawn geometry (path strings) ----------------
  function line(x1, y1, x2, y2, wob) {
    const s = ns(), w = wob == null ? 5 : wob;
    return "M " + f1(x1 + jit(s, 2)) + " " + f1(y1 + jit(s + 1, 2)) + " Q " + f1((x1 + x2) / 2 + jit(s + 2, w)) + " " + f1((y1 + y2) / 2 + jit(s + 3, w)) + " " + f1(x2 + jit(s + 4, 2)) + " " + f1(y2 + jit(s + 5, 2));
  }
  function rect(x, y, w, h) {
    const s = ns(), pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x + 4, y + 5]];
    let d = "M " + f1(x + jit(s, 2)) + " " + f1(y + jit(s + 1, 2));
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += " Q " + f1((a[0] + b[0]) / 2 + jit(s + i * 3, Math.min(4, w / 12))) + " " + f1((a[1] + b[1]) / 2 + jit(s + i * 3 + 1, Math.min(4, h / 12))) + " " + f1(b[0] + jit(s + i * 5, 1.5)) + " " + f1(b[1] + jit(s + i * 5 + 1, 1.5));
    }
    return d;
  }
  function circ(cx, cy, rx, ry, turn) {
    const s = ns(), n = 44, t0 = -Math.PI * 0.6 + jit(s, 0.3);
    turn = turn || 1.12;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = t0 + (i / n) * turn * Math.PI * 2, r = 1 + jit(s + i, 0.035) + 0.05 * (i / n);
      d += (i ? " L " : "M ") + f1(cx + Math.cos(a) * rx * r) + " " + f1(cy + Math.sin(a) * ry * r);
    }
    return d;
  }
  function scrib(x, y, w, h) {
    const n = Math.max(4, Math.round(w / 6));
    let d = "M " + (x + 2) + " " + (y + h - 3);
    for (let i = 1; i <= n; i++) d += " L " + f1(x + (i / n) * (w - 4) + 2) + " " + f1(i % 2 ? y + 3 : y + h - 3);
    return d;
  }
  // 45° hatching clipped to a rectangle (chalk "fill")
  function hatch(x, y, w, h, step) {
    step = step || 12;
    let d = "";
    for (let c = -h; c < w; c += step) {
      const s0 = Math.max(0, -c / h), s1 = Math.min(1, (w - c) / h);
      if (s1 <= s0) continue;
      d += " M " + f1(x + c + h * s0) + " " + f1(y + h - h * s0) + " L " + f1(x + c + h * s1) + " " + f1(y + h - h * s1);
    }
    return d.trim();
  }
  function arrow(x1, y1, cx, cy, x2, y2, head) {
    const ang = Math.atan2(y2 - cy, x2 - cx), L = head || 26, a1 = ang + Math.PI * 0.82, a2 = ang - Math.PI * 0.82;
    return "M " + x1 + " " + y1 + " Q " + cx + " " + cy + " " + x2 + " " + y2 + " M " + f1(x2 + Math.cos(a1) * L) + " " + f1(y2 + Math.sin(a1) * L) + " L " + x2 + " " + y2 + " L " + f1(x2 + Math.cos(a2) * L) + " " + f1(y2 + Math.sin(a2) * L);
  }
  function cloud(x, y, w, h) {
    const s = ns();
    return "M " + (x + w * 0.18) + " " + (y + h) + " C " + (x - w * 0.02) + " " + (y + h) + " " + (x - w * 0.02) + " " + (y + h * 0.5) + " " + (x + w * 0.16) + " " + (y + h * 0.48) + " C " + (x + w * 0.14) + " " + (y + h * 0.1) + " " + (x + w * 0.42) + " " + f1(y - h * 0.04 + jit(s, 6)) + " " + (x + w * 0.5) + " " + (y + h * 0.24) + " C " + (x + w * 0.6) + " " + (y - h * 0.08) + " " + (x + w * 0.92) + " " + (y + h * 0.04) + " " + (x + w * 0.86) + " " + (y + h * 0.46) + " C " + (x + w * 1.04) + " " + (y + h * 0.5) + " " + (x + w * 1.04) + " " + (y + h) + " " + (x + w * 0.84) + " " + (y + h) + " Z";
  }
  function star(x, y, r) {
    let d = "";
    for (let q = 0; q <= 5; q++) { const a = -Math.PI / 2 + q * (Math.PI * 4 / 5); d += (q ? " L " : "M ") + f1(x + Math.cos(a) * r) + " " + f1(y + Math.sin(a) * r); }
    return d;
  }
  const check = (x, y, s) => line(x, y + s * 0.45, x + s * 0.35, y + s * 0.85, 2) + " " + line(x + s * 0.35, y + s * 0.85, x + s, y, 3);
  const cross = (x, y, s) => line(x, y, x + s, y + s, 2) + " " + line(x + s, y, x, y + s, 2);
  // a key (K: used for matching) and a card (V: the content that is taken)
  const keyIcon = (x, y, s) => circ(x + s * 0.2, y + s * 0.25, s * 0.18, s * 0.18, 1.0) + " M " + f1(x + s * 0.38) + " " + f1(y + s * 0.25) + " L " + f1(x + s) + " " + f1(y + s * 0.25) + " M " + f1(x + s * 0.78) + " " + f1(y + s * 0.25) + " L " + f1(x + s * 0.78) + " " + f1(y + s * 0.45) + " M " + f1(x + s * 0.93) + " " + f1(y + s * 0.25) + " L " + f1(x + s * 0.93) + " " + f1(y + s * 0.4);
  const cardIcon = (x, y, s) => rect(x, y, s, s * 0.62) + " " + line(x + s * 0.14, y + s * 0.2, x + s * 0.86, y + s * 0.2, 1) + " " + line(x + s * 0.14, y + s * 0.4, x + s * 0.62, y + s * 0.4, 1);
  const fileIcon = (x, y, w, h) => "M " + x + " " + y + " L " + (x + w * 0.7) + " " + y + " L " + (x + w) + " " + (y + h * 0.23) + " L " + (x + w) + " " + (y + h) + " L " + x + " " + (y + h) + " Z M " + (x + w * 0.7) + " " + y + " L " + (x + w * 0.7) + " " + (y + h * 0.23) + " L " + (x + w) + " " + (y + h * 0.23);
  function burst(x, y, r0, r1, n, rot) {
    let d = "";
    for (let i = 0; i < n; i++) { const a = (rot || -Math.PI / 2) + (i / n) * Math.PI * 2; d += " M " + f1(x + Math.cos(a) * r0) + " " + f1(y + Math.sin(a) * r0) + " L " + f1(x + Math.cos(a) * r1) + " " + f1(y + Math.sin(a) * r1); }
    return d.trim();
  }
  function wave(x1, x2, y, amp, per) {
    amp = amp || 6; per = per || 26;
    let d = "M " + f1(x1) + " " + f1(y);
    for (let x = x1 + per / 2; x <= x2 + 0.1; x += per / 2) d += " Q " + f1(x - per / 4) + " " + f1(y + (Math.round((x - x1) / (per / 2)) % 2 ? -amp : amp)) + " " + f1(x) + " " + f1(y);
    return d;
  }
  function brace(x, y1, y2, w) {
    const m = (y1 + y2) / 2; w = w || 26;
    return "M " + x + " " + y1 + " Q " + (x + w) + " " + y1 + " " + (x + w * 0.6) + " " + ((y1 + m) / 2) + " Q " + (x + w * 0.4) + " " + m + " " + (x + w * 1.4) + " " + m + " Q " + (x + w * 0.4) + " " + m + " " + (x + w * 0.6) + " " + ((m + y2) / 2) + " Q " + (x + w) + " " + y2 + " " + x + " " + y2;
  }
  function borderPath(style, W, H) {
    const m = 14;
    let d = "";
    const edge = (x1, y1, x2, y2, f) => {
      const L = Math.hypot(x2 - x1, y2 - y1), k = Math.max(2, Math.round(L / 26));
      let out = "";
      for (let j = 0; j <= k; j++) {
        const u = j / k, x = lerp(x1, x2, u), y = lerp(y1, y2, u), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, o = f(j);
        out += (j === 0 && d === "" ? "M " : " L ") + f1(x + nx * o) + " " + f1(y + ny * o);
      }
      return out;
    };
    const sides = [[m, m, W - m, m], [W - m, m, W - m, H - m], [W - m, H - m, m, H - m], [m, H - m, m, m]];
    if (style === "wave") sides.forEach((s) => { d += edge(s[0], s[1], s[2], s[3], (j) => Math.sin(j * 1.2) * 7); });
    if (style === "zig") sides.forEach((s) => { d += edge(s[0], s[1], s[2], s[3], (j) => (j % 2 ? 8 : -8)); });
    if (style === "scallop") sides.forEach((s) => { d += edge(s[0], s[1], s[2], s[3], (j) => Math.abs(Math.sin(j * 0.9)) * 12); });
    if (style === "dash" || style === "dot") {
      const per = style === "dot" ? 22 : 40, seg = style === "dot" ? 0.8 : 22;
      sides.forEach((s) => {
        const L = Math.hypot(s[2] - s[0], s[3] - s[1]);
        for (let q = 0; q + seg < L; q += per) {
          const a = q / L, b = (q + seg) / L;
          d += " M " + f1(lerp(s[0], s[2], a)) + " " + f1(lerp(s[1], s[3], a)) + " L " + f1(lerp(s[0], s[2], b)) + " " + f1(lerp(s[1], s[3], b));
        }
      });
      if (style === "dash") d += " " + rect(m + 12, m + 12, W - 2 * m - 24, H - 2 * m - 24);
    }
    if (style === "double") d = rect(m, m, W - 2 * m, H - 2 * m) + " " + rect(m + 12, m + 12, W - 2 * m - 24, H - 2 * m - 24);
    return d.trim();
  }
  // glyphs the chalk fonts lack (Long Cang has no → ∝ ✓): drawn in a 1×1 em box
  const GLYPH = {
    "→": "M 0.06 0.56 L 0.9 0.56 M 0.64 0.34 L 0.92 0.56 L 0.64 0.78",
    "←": "M 0.94 0.56 L 0.1 0.56 M 0.36 0.34 L 0.08 0.56 L 0.36 0.78",
    "↓": "M 0.5 0.12 L 0.5 0.92 M 0.28 0.66 L 0.5 0.94 L 0.72 0.66",
    "↑": "M 0.5 0.94 L 0.5 0.14 M 0.28 0.4 L 0.5 0.12 L 0.72 0.4",
    "∝": "M 0.92 0.36 C 0.62 0.36 0.5 0.8 0.26 0.8 C 0.1 0.8 0.06 0.66 0.06 0.58 C 0.06 0.5 0.1 0.36 0.26 0.36 C 0.5 0.36 0.62 0.8 0.92 0.8",
    "✓": "M 0.12 0.56 L 0.4 0.84 L 0.9 0.2",
    "✗": "M 0.18 0.22 L 0.82 0.86 M 0.82 0.22 L 0.18 0.86",
    // Long Cang writes 以 in a running-script form that reads like "rく"; the chalk draws a plain regular-script 以
    "以": "M 0.2 0.2 L 0.2 0.8 L 0.38 0.66 M 0.42 0.34 L 0.52 0.48 M 0.8 0.14 C 0.78 0.5 0.64 0.76 0.38 0.92 M 0.64 0.68 L 0.9 0.92",
  };
  const LAT = /[A-Za-z0-9≈·$%.–]/;

  // ---------------- registries ----------------
  const STROKES = [], WRITES = [], ERASES = [], OPS = new Map(), DUST = [], FLOWS = [], COMPONENTS = [], EXTRAS = [], MARKS = {}, PARKS = [];
  let B = null, CAM = null, HAND = null;
  const addOp = (el, fn) => { if (!el) return; if (!OPS.has(el)) OPS.set(el, []); OPS.get(el).push(fn); };
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const div = (cls, parent) => { const e = document.createElement("div"); e.className = cls; if (parent) parent.appendChild(e); return e; };
  const elOf = (o) => (o == null ? null : o.nodeType ? o : o.el || o.div || null);

  // ---------------- the board ----------------
  /* board({ stage, cols=4, rows=2, panelW=1840, panelH=1020, gap=60 }) builds the world inside the stage element. */
  function board(o) {
    o = o || {};
    const stage = o.stage;
    const pw = o.panelW || 1840, ph = o.panelH || 1020, gap = o.gap == null ? 60 : o.gap, cols = o.cols || 4, rows = o.rows || 2;
    const W = gap + cols * (pw + gap), H = gap + rows * (ph + gap);
    stage.classList.add("kit-stage");
    stage.setAttribute("data-layout-allow-overflow", "");
    const world = div("kit-world", stage);
    world.setAttribute("data-layout-allow-overflow", "");
    const frame = div("kit-frame", world);
    Object.assign(frame.style, { left: "-64px", top: "-64px", width: W + 128 + "px", height: H + 200 + "px" });
    const bd = div("kit-board", world);
    bd.style.width = W + "px";
    bd.style.height = H + "px";
    // old eraser clouds on the slate: a few soft light patches, placed deterministically
    const clouds = [];
    for (let i = 0; i < Math.max(4, cols + 1); i++) {
      const x = Math.round((i + 0.35 + hash(i * 3.1) * 0.5) * (W / Math.max(4, cols + 1))), y = Math.round(20 + hash(i * 5.7) * 70);
      clouds.push("radial-gradient(ellipse " + Math.round(700 + hash(i * 1.3) * 400) + "px " + Math.round(300 + hash(i * 2.9) * 120) + "px at " + x + "px " + y + "%, rgba(210, 225, 215, " + (0.05 + hash(i * 4.4) * 0.02).toFixed(3) + "), transparent 70%)");
    }
    clouds.push("linear-gradient(0deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 70%, rgba(0, 0, 0, 0.14))");
    bd.style.backgroundImage = clouds.join(", ");
    const tray = div("kit-tray", world);
    Object.assign(tray.style, { left: "-40px", top: H + 6 + "px", width: W + 80 + "px", height: "64px" });
    const chalk = div("kit-chalk", world);
    chalk.style.width = W + "px";
    chalk.style.height = H + "px";
    chalk.setAttribute("data-layout-allow-overflow", "");
    const fx = svgEl("svg", { class: "kit-fx", width: W, height: H + 80, viewBox: "0 0 " + W + " " + (H + 80) }, world);
    div("kit-grain", stage);
    div("kit-vig", stage);
    // props on the tray: chalk pieces and the eraser at rest
    const trayStuff = svgEl("g", {}, fx);
    const tx = Math.round(W * 0.31);
    [[tx, C.w], [tx + 100, C.y], [tx + 170, C.p], [tx + 260, C.b]].forEach((c, j) => svgEl("rect", { x: c[0], y: H + 16, width: 70, height: 16, rx: 6, fill: c[1], transform: "rotate(" + (j * 7 - 8) + " " + (c[0] + 35) + " " + (H + 24) + ")" }, trayStuff));
    const trayEraser = svgEl("g", {}, fx);
    svgEl("rect", { x: tx + 500, y: H + 2, width: 170, height: 40, rx: 6, fill: "#3d4d63" }, trayEraser);
    svgEl("rect", { x: tx + 500, y: H + 26, width: 170, height: 16, rx: 3, fill: "#d9d4c7" }, trayEraser);
    const dustLayer = svgEl("g", {}, fx);
    const flowLayer = svgEl("g", {}, fx);
    const stick = svgEl("g", {}, fx);
    const stickBody = svgEl("rect", { x: -6, y: -9, width: 78, height: 18, rx: 8, fill: C.w, style: "filter:drop-shadow(6px 10px 6px rgba(0,0,0,0.45))" }, stick);
    svgEl("rect", { x: -6, y: -9, width: 14, height: 18, rx: 6, fill: "rgba(0,0,0,0.12)" }, stick);
    const eraser = svgEl("g", { opacity: 0 }, fx);
    svgEl("rect", { x: -95, y: -40, width: 190, height: 58, rx: 8, fill: "#3d4d63", style: "filter:drop-shadow(8px 14px 10px rgba(0,0,0,0.5))" }, eraser);
    svgEl("rect", { x: -95, y: 10, width: 190, height: 22, rx: 4, fill: "#d9d4c7" }, eraser);
    B = { stage, world, chalk, fx, W, H, pw, ph, gap, cols, rows, trayEraser, stick, stickBody, eraser, dustLayer, flowLayer, panels: {} };
    B.at = (col, row) => ({ x: gap + col * (pw + gap), y: gap + row * (ph + gap) });
    B.center = (col, row, span) => { const p = B.at(col, row), w = (span || 1) * (pw + gap) - gap; return { x: p.x + w / 2, y: p.y + ph / 2 }; };
    return B;
  }

  /* panel(id, col, row, { span=1 }) — one framed area of the board; returns P (local coords 0..P.w × 0..P.h). */
  function panel(id, col, row, o) {
    o = o || {};
    const p = B.at(col, row), w = o.w || (o.span || 1) * (B.pw + B.gap) - B.gap, h = o.h || B.ph;
    const el = div("kit-panel", B.chalk);
    el.id = id;
    Object.assign(el.style, { left: p.x + "px", top: p.y + "px", width: w + "px", height: h + "px" });
    const svg = svgEl("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h }, el);
    const fl = svgEl("filter", { id: id + "-smear", x: "-20%", y: "-40%", width: "140%", height: "180%" }, svgEl("defs", {}, svg));
    svgEl("feGaussianBlur", { stdDeviation: "18" }, fl);
    const P = { id, el, svg, ox: p.x, oy: p.y, w, h, col, row };
    B.panels[id] = P;
    return P;
  }

  // ---------------- chalk primitives ----------------
  /* S(P, d, tone, width, t0, dur, { sprite=true, kind, ease, dash }) — d may be a function (resolved lazily, after fonts load) */
  function S(P, d, tone, width, t0, dur, opt) {
    opt = opt || {};
    const lazy = typeof d === "function";
    const el = svgEl("path", { d: lazy ? "M 0 0" : d, fill: "none", stroke: color(tone), "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }, P.svg);
    el.style.visibility = "hidden";
    const st = { el, len: lazy ? 0 : el.getTotalLength(), lazy: lazy ? d : null, t0, dur: Math.max(0.01, dur), P, sprite: opt.sprite !== false, color: color(tone), ease: opt.ease, kind: opt.kind || "draw", dash: opt.dash };
    if (opt.dash) el.style.strokeDasharray = opt.dash;
    STROKES.push(st);
    return st;
  }
  function resolve(st) {
    if (!st.lazy) return;
    st.el.setAttribute("d", st.lazy());
    st.len = st.el.getTotalLength();
    st.lazy = null;
  }

  /* T(P, x, y, size, segs, opt) — segs: [[text, tStart, tEnd?, cls?, color?], ...]; each character is written at its time.
   * Latin letters / digits get the Latin chalk face automatically; → ∝ ✓ are drawn. Returns { el, div, chars, end }. */
  function T(P, x, y, size, segs, opt) {
    opt = opt || {};
    const d = document.createElement("div");
    d.className = "ln " + (opt.cls || "");
    d.style.left = x + "px";
    d.style.top = y + "px";
    d.style.fontSize = size + "px";
    P.el.appendChild(d);
    const out = [];
    segs.forEach((s) => {
      const txt = Array.from(s[0]), a = s[1], b = s[2] == null ? a + 0.14 * txt.length : s[2];
      const cls = s[3] || "cw", fixed = /\b(kl|mast|lat)\b/.test(cls), col = s[4] || clsColor(cls);
      txt.forEach((ch, j) => {
        const sp = document.createElement("span");
        sp.className = "w " + cls + (!fixed && LAT.test(ch) ? " lat" : "");
        if (GLYPH[ch]) {
          sp.classList.add("gl");
          sp.innerHTML = '<svg viewBox="0 0 1 1"><path d="' + GLYPH[ch] + '" fill="none" stroke="currentColor" stroke-width="0.085" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        } else sp.textContent = ch;
        d.appendChild(sp);
        if (ch === " ") return;
        const at = a + (b - a) * (j / txt.length);
        const w = { sp, ch, at, dur: Math.max(0.08, Math.min(0.2, (b - a) / txt.length + 0.04)), line: d, P, sprite: opt.sprite !== false, color: col };
        WRITES.push(w);
        out.push(w);
      });
    });
    const end = out.length ? out[out.length - 1].at + out[out.length - 1].dur : 0;
    return { el: d, div: d, chars: out, end, size, x, y, P };
  }

  /* seq(P, x, y, size, parts, t0, cps, opt) — write parts one after another at a steady hand speed (cps characters/s). */
  function seq(P, x, y, size, parts, t0, cps, opt) {
    let t = t0;
    const segs = [];
    parts.forEach((p) => { const d = wlen(p[0]) / cps; segs.push([p[0], t, t + d, p[1], p[2]]); t += d; });
    const r = T(P, x, y, size, segs, opt);
    r.end = t;
    return r;
  }

  /* X(P, targets, rect=[x,y,w,h] in P coords, t0, dur) — the felt eraser sweeps the rect in three bands;
   * each target fades as the felt passes over it. Targets: stroke / text objects or elements. */
  function eraseAt(e, cx, cy) {
    const band = clamp01((cy - e.rect[1]) / e.rect[3]), r = Math.min(2, Math.floor(band * 3));
    let along = clamp01((cx - e.rect[0]) / e.rect[2]);
    if (r % 2 === 1) along = 1 - along;
    return e.t0 + ((r + along) / 3) * e.dur;
  }
  function X_(P, targets, rect, t0, dur, opt) {
    opt = opt || {};
    const sm = svgEl("g", { opacity: 0, filter: "url(#" + P.id + "-smear)" }, null);
    for (let q = 0; q < 3; q++) svgEl("rect", { x: f1(rect[0] + 20 + jit(ns(), 30)), y: f1(rect[1] + ((q + 0.2) / 3) * rect[3]), width: Math.max(10, rect[2] - 40), height: f1((rect[3] / 3) * 0.6), rx: 30, fill: "rgba(225,235,228," + (0.05 + 0.02 * q) + ")" }, sm);
    P.svg.insertBefore(sm, P.svg.firstChild.nextSibling);
    const e = { P, rect, t0, dur, smudge: sm, residue: opt.residue == null ? 1 : opt.residue };
    (Array.isArray(targets) ? targets : [targets]).forEach((o) => {
      const items = o && o.rows && !o.nodeType ? o.rows.map((r) => r.div) : o && o.chars && !o.nodeType ? [o.div || o.el] : [elOf(o)];
      items.forEach((el) => {
        if (!el) return;
        let cx, cy;
        if (el.getBBox) { const b = (o && o.lazy) ? { x: rect[0], y: rect[1], width: 0, height: 0 } : el.getBBox(); cx = b.x + b.width / 2; cy = b.y + b.height / 2; }
        else { const sz = parseFloat(el.style.fontSize) || 40; cx = parseFloat(el.style.left) + (wlen(el.textContent) * sz) / 2; cy = parseFloat(el.style.top) + sz / 2; }
        const at = eraseAt(e, cx, cy);
        addOp(el, (t) => 1 - pr(t, at, 0.12));
      });
    });
    ERASES.push(e);
    return e;
  }
  function eraserPos(e, t) {
    const u = pr(t, e.t0, e.dur), r = Math.min(2, Math.floor(u * 3));
    let along = u * 3 - r;
    if (r % 2 === 1) along = 1 - along;
    return { x: e.P.ox + e.rect[0] + along * e.rect[2], y: e.P.oy + e.rect[1] + ((r + 0.5) / 3) * e.rect[3] };
  }

  /* fade(targets, t0, dur, to=0.4, back=null) — dim things that are no longer the focus (and optionally bring them back at `back`) */
  function fade(targets, t0, dur, to, back) {
    to = to == null ? 0.4 : to;
    (Array.isArray(targets) ? targets : [targets]).forEach((o) => {
      const els = o && o.rows && !o.nodeType ? o.rows.map((r) => r.div) : [o && o.chars && !o.nodeType ? o.div || o.el : elOf(o)];
      els.forEach((el) => addOp(el, (t) => { let f = lerp(1, to, E.io2(pr(t, t0, dur))); if (back != null) f = lerp(f, 1, E.io2(pr(t, back, dur))); return f; }));
    });
  }
  // move a written / drawn thing (rarely: chalk does not slide; use for lifting a card off the board)
  function mark(name, t) { (MARKS[name] = MARKS[name] || []).push(+t.toFixed(3)); }
  function park(t, P, x, y, tone) { PARKS.push({ t, x: P.ox + x, y: P.oy + y, color: color(tone || "y") }); PARKS.sort((a, b) => a.t - b.t); }
  function onRender(fn) { EXTRAS.push(fn); }

  // ---------------- narration in chalk (the V8 captions) ----------------
  /* say(P, story, lineNo, { rows: [{ x, y, size, from?, k?, cls? }], tones: { phrase: "y" }, cls: "cw", sprite })
   * Writes narration line `lineNo` with each unit at its spoken time (story word times). A row starts at the unit
   * where its `from` phrase begins (or at unit index `k`). Latin units get a space against their neighbours; tones colour phrases. */
  function say(P, story, lineNo, o) {
    o = o || {};
    const L = story.line(lineNo), words = L.words;
    const rows = o.rows || [{ x: 48, y: 104, size: 64 }];
    const tones = o.tones || {};
    // character table with unit index
    const chars = [];
    words.forEach(([u], k) => Array.from(u).forEach((ch) => chars.push({ ch, k, tone: null })));
    const flat = chars.map((c) => c.ch).join("");
    Object.keys(tones).forEach((ph) => {
      const key = ph.replace(/\s/g, "");
      let from = 0, i;
      while ((i = flat.indexOf(key, from)) >= 0) { for (let j = 0; j < Array.from(key).length; j++) chars[i + j].tone = tones[ph]; from = i + key.length; }
    });
    // row boundaries: unit index where each row starts
    const starts = rows.map((r, ri) => {
      if (ri === 0) return 0;
      if (r.k != null) return r.k; // (additive) a row may start at a unit index instead of a `from` phrase
      const key = (r.from || "").replace(/\s/g, "");
      const i = flat.indexOf(key);
      if (!key || i < 0) throw new Error("Kit.say: row " + ri + " needs a `from` phrase in line " + lineNo);
      return chars[i].k;
    });
    const isLat = (s) => /[A-Za-z0-9%]$/.test(s), isLatStart = (s) => /^[A-Za-z0-9]/.test(s);
    const res = { rows: [], chars: [], end: 0, line: L };
    rows.forEach((r, ri) => {
      const k0 = starts[ri], k1 = ri + 1 < rows.length ? starts[ri + 1] : words.length;
      const baseCls = r.cls || o.cls || "cw";
      const segs = [];
      let ci = chars.findIndex((c) => c.k === k0);
      for (let k = k0; k < k1; k++) {
        const [u, t] = words[k];
        const next = k + 1 < words.length ? words[k + 1][1] : L.end;
        const n = Array.from(u).length, b = Math.min(next, t + 0.2 * n + 0.12);
        // runs of equal tone inside the unit
        let j = 0;
        while (j < n) {
          const tone = chars[ci + j].tone;
          let j2 = j;
          while (j2 < n && chars[ci + j2].tone === tone) j2++;
          const txt = Array.from(u).slice(j, j2).join("");
          const cls = tone ? baseCls.replace(/\bc[wmypbgo]\b/, "") + " c" + tk(tone) : baseCls;
          segs.push([txt, t + ((b - t) * j) / n, t + ((b - t) * j2) / n, cls.trim()]);
          j = j2;
        }
        ci += n;
        // a space between Latin and anything that is not punctuation
        const nu = k + 1 < k1 ? words[k + 1][0] : null;
        if (nu && !/^[，。：；、！？,.!?）」–\-\/~]/.test(nu) && !/[（「，。：；、！？–\-\/~]$/.test(u) && (isLat(u) || isLatStart(nu))) segs.push([" ", b, b, baseCls]);
      }
      const w = T(P, r.x, r.y, r.size, segs, { sprite: o.sprite !== false, cls: r.lineCls || o.lineCls || "" });
      res.rows.push(w);
      res.chars = res.chars.concat(w.chars);
      res.end = Math.max(res.end, w.end);
    });
    res.div = res.rows[0].div;
    res.el = res.div;
    // the characters of a phrase (for underlines, circles, erasing)
    res.charsOf = (phrase) => {
      const key = phrase.replace(/\s/g, ""), all = res.chars, s = all.map((c) => c.ch).join(""), i = s.indexOf(key);
      return i < 0 ? [] : all.slice(i, i + Array.from(key).length);
    };
    return res;
  }

  // position of a written character / run in panel coordinates (layout is read at render time, after fonts load)
  function spanBox(w) {
    return { x: w.line.offsetLeft + w.sp.offsetLeft, y: w.line.offsetTop + w.sp.offsetTop, w: w.sp.offsetWidth, h: w.sp.offsetHeight };
  }
  /* underline(P, chars, tone, t0, dur, { wavy }) — a chalk line under written characters (emphasis) */
  function underline(P, chs, tone, t0, dur, o) {
    o = o || {};
    if (!chs.length) return null;
    return S(P, () => {
      const a = spanBox(chs[0]), b = spanBox(chs[chs.length - 1]), y = a.y + a.h * (o.dy || 0.98);
      return o.wavy === false ? line(a.x + 4, y, b.x + b.w - 4, y, 3) : wave(a.x + 2, b.x + b.w - 2, y, o.amp || 5, o.per || 30);
    }, tone, o.width || 4.5, t0, dur || 0.25, { sprite: o.sprite !== false, kind: "draw" });
  }
  /* ring(P, chars, tone, t0) — circle written characters (the teacher's "this one") */
  function ring(P, chs, tone, t0, dur, o) {
    o = o || {};
    if (!chs.length) return null;
    return S(P, () => {
      const a = spanBox(chs[0]), b = spanBox(chs[chs.length - 1]), cx = (a.x + b.x + b.w) / 2, cy = a.y + a.h * 0.55;
      return circ(cx, cy, (b.x + b.w - a.x) / 2 + (o.pad || 22), a.h * 0.5 + (o.padY || 10));
    }, tone, o.width || 4.5, t0, dur || 0.22, { sprite: o.sprite !== false, kind: "tap" });
  }

  // ---------------- chapter badge + panel border ----------------
  /* chapter(P, story, n, { t, border=true, style, tone, size=54, subSize=38 }) — the panel's 美术字 badge from story.chapters:
   * "一 · 问题" + "越写越慢" (chapter title split at "：") and the panel's chalk border in the chapter colour. */
  function chapter(P, story, n, o) {
    o = o || {};
    const ch = story.chapters.find((c) => c.n === n);
    const t = o.t == null ? ch.start : o.t;
    const tone = o.tone || CHAPTER_TONES[(n - 1) % CHAPTER_TONES.length];
    const style = o.style || BORDERS[(n - 1) % BORDERS.length];
    const parts = ch.title.split(/[：:]/);
    const head = (CN[n] || n) + " · " + parts[0];
    const sub = parts.slice(1).join("：");
    if (o.border !== false) S(P, borderPath(style, P.w, P.h), tone, style === "dot" ? 8 : style === "double" ? 3.4 : style === "dash" ? 4 : 4.5, t, 0.6, { sprite: false });
    const size = o.size || 54, subSize = o.subSize || 38;
    const a = T(P, 40, 24, size, [[head, t + 0.05, t + 0.45, "kl c" + tone]], { sprite: false });
    const b = sub ? T(P, 40 + wlen(head) * size + 44, 24 + (size - subSize) * 0.62, subSize, [[sub, t + 0.3, t + 0.3 + 0.07 * Array.from(sub).length, "cm"]], { sprite: false }) : null;
    return { el: a.div, head: a, sub: b, tone, end: b ? b.end : a.end };
  }

  // ---------------- contract components ----------------
  const reg = (c) => { COMPONENTS.push(c); return c; };
  const atOf = (o) => { const a = o.at; if (!a || !a[0] || !a[0].el) throw new Error("Kit: components need at: [panel, x, y]"); return a; };

  /* label({ text, sub, tone, at: [P, x, y], t, size=40, subSize=32, cps=16, box=false }) — a chalk label; `sub` is the real term / unit */
  function label(o) {
    const [P, x, y] = atOf(o), size = o.size || 40, subSize = Math.max(30, o.subSize || Math.round(size * 0.78)), t = o.t || 0, cps = o.cps || 16;
    const tone = tk(o.tone);
    const a = seq(P, x, y, size, [[o.text, "c" + tone + (o.font === "kl" ? " kl" : "")]], t, cps, { sprite: o.sprite, cls: "kit-label" });
    let b = null;
    if (o.sub) b = seq(P, x + (o.subDx || 2), y + size * 1.16, subSize, [[o.sub, "cm"]], a.end, cps * 1.3, { sprite: o.sprite, cls: "kit-label-sub" });
    let box = null;
    if (o.box) {
      const w = Math.max(wlen(o.text) * size, b ? wlen(o.sub) * subSize : 0) + 40, h = size * 1.25 + (b ? subSize * 1.25 : 0) + 18;
      box = S(P, rect(x - 20, y - 10, w, h), tone, 4, t - 0.15, 0.3, { sprite: false });
    }
    return reg({ el: a.div, sub: b, box, end: b ? b.end : a.end, chars: a.chars, render() {} });
  }

  /* note(text, { at, t, size=38, cps=16, tone="accent" }) — one plain-language line ("说明"); "前缀：正文" puts the prefix in 美术字 */
  function note(text, o) {
    o = o || {};
    const [P, x, y] = atOf(o), size = Math.max(30, o.size || 38), cps = o.cps || 16, t = o.t || 0, tone = tk(o.tone || "accent");
    const i = text.indexOf("：");
    // a Chinese prefix is set in 美术字; a Latin one (a model name, a term) keeps the Latin chalk face
    const pre = i > 0 ? text.slice(0, i) : "", preCls = /[A-Za-z]/.test(pre) ? "lat c" + tone : "kl c" + tone;
    const parts = i > 0 ? [[pre, preCls], ["：" + text.slice(i + 1), "c" + tk(o.bodyTone || "ink")]] : [[text, "c" + tk(o.bodyTone || "ink")]];
    const r = seq(P, x, y, size, parts, t, cps, { sprite: o.sprite, cls: "kit-note" });
    if (i > 0 && o.underline !== false) underline(P, r.chars.slice(0, Array.from(text.slice(0, i)).length), tone, t + wlen(text.slice(0, i)) / cps, 0.2, { sprite: false, width: 3.5, amp: 3, per: 22 });
    return reg({ el: r.div, end: r.end, chars: r.chars, render() {} });
  }

  /* number({ value, unit, caption, decimals=0, at, t, size=96, tone="accent", grow=0.5, from=0 }) — render(t, u): count-up progress */
  function number(o) {
    const [P, x, y] = atOf(o), size = o.size || 96, t0 = o.t || 0, dec = o.decimals || 0, from = o.from || 0, grow = o.grow == null ? 0.5 : o.grow;
    const d = div("ln kit-num", P.el);
    Object.assign(d.style, { left: x + "px", top: y + "px", fontSize: size + "px", visibility: "hidden" });
    const v = document.createElement("span");
    v.className = "kit-num-v c" + tk(o.tone || "accent");
    d.appendChild(v);
    if (o.unit) { const u = document.createElement("span"); u.className = "kit-num-u"; u.textContent = o.unit; d.appendChild(u); }
    let c = null;
    if (o.caption) { c = document.createElement("div"); c.className = "kit-num-c"; c.textContent = o.caption; d.appendChild(c); }
    const fmt = (val) => (o.format ? o.format(val) : val.toFixed(dec));
    v.textContent = fmt(o.value);
    // the write-on (stick follows the reveal edge) is a pseudo-character so the sound bed hears it
    WRITES.push({ sp: d, ch: "#", at: t0, dur: 0.3, line: d, P, sprite: o.sprite !== false, color: color(o.tone || "accent"), whole: true });
    const comp = reg({
      el: d, value: o.value, _set: null,
      set(val) { this._set = val; return this; },
      render(t, u) {
        if (u == null) u = this._set != null ? null : E.o3(pr(t, t0, grow));
        const val = this._set != null && u == null ? this._set : from + (o.value - from) * clamp01(u);
        const s = fmt(val);
        if (v.textContent !== s) v.textContent = s;
      },
    });
    return comp;
  }

  /* bars({ rows: [{ label, value, max, tone, valueText }], at, t, w=560, h=46, gap=24, labelW=300, size=36 }) — render(t, u) */
  function bars(o) {
    const [P, x, y] = atOf(o), w = o.w || 560, h = o.h || 46, gap = o.gap == null ? 24 : o.gap, lw = o.labelW == null ? 300 : o.labelW, size = Math.max(30, o.size || 36);
    const t0 = o.t || 0, stagger = o.stagger == null ? 0.12 : o.stagger, grow = o.grow || 0.5;
    const g = svgEl("g", { class: "kit-bars" }, P.svg);
    const rows = o.rows.map((r, i) => {
      const ry = y + i * (h + gap), max = r.max || Math.max(...o.rows.map((q) => q.value)), tone = tk(r.tone || "accent");
      const fw = (w * r.value) / max, ti = t0 + i * stagger;
      if (r.label) seq(P, x, ry + (h - size * 1.1) / 2, size, [[r.label, "c" + tk(r.labelTone || "ink")]], ti, 18, { sprite: false });
      const outline = S(P, rect(x + lw, ry, w, h), "rgba(242,239,230,0.55)", 2.6, ti + 0.05, 0.25, { sprite: false });
      const cid = P.id + "-bar-" + BARCOUNT++;
      const cp = svgEl("clipPath", { id: cid }, P.svg.querySelector("defs"));
      const cr = svgEl("rect", { x: x + lw, y: ry - 4, width: 0, height: h + 8 }, cp);
      const fill = svgEl("path", { d: hatch(x + lw + 3, ry + 3, Math.max(4, fw - 6), h - 6, 11) + " " + rect(x + lw, ry, Math.max(6, fw), h), fill: "none", stroke: C[tone], "stroke-width": 3.2, "stroke-linecap": "round", "clip-path": "url(#" + cid + ")" }, g);
      const vt = r.valueText ? seq(P, x + lw + fw + 18, ry + (h - size * 1.1) / 2, size, [[r.valueText, "c" + tone]], ti + 0.2 + grow, 16, { sprite: false }) : null;
      return { r, cr, fill, fw, ti, outline, vt };
    });
    return reg({
      el: g, rows,
      render(t, u) {
        rows.forEach((q, i) => {
          const ui = u == null ? E.o3(pr(t, q.ti + 0.2, grow)) : Array.isArray(u) ? u[i] : u;
          const wv = f1(q.fw * clamp01(ui) + (ui > 0 ? 2 : 0));
          if (q.cr.getAttribute("width") !== wv) q.cr.setAttribute("width", wv);
        });
      },
    });
  }
  let BARCOUNT = 0;

  /* formula({ terms: [{ text, t, tone, sub, size }], at, size=64, subSize=32, column=false, rowGap, subX, rules: [i] })
   * — each term chalked at its time; `sub` annotates under it. column: true stacks the terms as a chalk 竖式
   * (one term per row, annotation to the right at subX, a ruled line drawn under every row index in `rules`). */
  function formula(o) {
    if (o.column) return formulaColumn(o);
    const [P, x, y] = atOf(o), size = o.size || 64, subSize = Math.max(30, o.subSize || 32);
    const segs = [];
    o.terms.forEach((tm, i) => {
      const n = Array.from(tm.text).length, next = i + 1 < o.terms.length ? o.terms[i + 1].t : tm.t + 0.6;
      segs.push([tm.text, tm.t, Math.min(next, tm.t + 0.09 * n + 0.1), "c" + tk(tm.tone || "ink")]);
      if (i + 1 < o.terms.length && !/\s$/.test(tm.text)) segs.push([" ", next, next]);
    });
    const r = T(P, x, y, size, segs, { sprite: o.sprite, cls: "kit-formula" });
    // annotations: positioned under their term once layout is known
    let ci = 0;
    const subs = [];
    o.terms.forEach((tm) => {
      const n = Array.from(tm.text.replace(/\s/g, "")).length, chs = r.chars.slice(ci, ci + n);
      ci += n;
      if (!tm.sub) return;
      const s = T(P, x, y + size * 1.12, subSize, [[tm.sub, tm.t + 0.15, tm.t + 0.15 + 0.07 * Array.from(tm.sub).length, "cm"]], { sprite: false, cls: "kit-formula-sub" });
      subs.push({ s, chs });
    });
    return reg({
      el: r.div, chars: r.chars, end: r.end, subs,
      render(t) {
        subs.forEach((q) => {
          if (q._placed || t < q.chs[0].at) return;
          const a = spanBox(q.chs[0]), b = spanBox(q.chs[q.chs.length - 1]), mid = (a.x + b.x + b.w) / 2;
          q.s.div.style.left = f1(mid - q.s.div.offsetWidth / 2) + "px";
          q._placed = true;
        });
      },
    });
  }

  function formulaColumn(o) {
    const [P, x, y] = atOf(o), size = o.size || 56, subSize = Math.max(30, o.subSize || 34), gap = o.rowGap || Math.round(size * 1.22);
    const subX = o.subX == null ? Math.round(size * 5) : o.subX, rules = o.rules || [];
    let yy = y;
    const rows = o.terms.map((tm, i) => {
      const sz = tm.size || size, n = Array.from(tm.text).length, next = i + 1 < o.terms.length ? o.terms[i + 1].t : tm.t + 0.8;
      const r = T(P, x, yy, sz, [[tm.text, tm.t, Math.min(next - 0.02, tm.t + 0.08 * n + 0.12), "c" + tk(tm.tone || "ink")]], { sprite: o.sprite, cls: "kit-formula" });
      if (tm.sub) T(P, x + subX, yy + (sz - subSize) * 0.6, subSize, [[tm.sub, tm.t + 0.12, tm.t + 0.12 + 0.06 * Array.from(tm.sub).length, "cm"]], { sprite: false, cls: "kit-formula-sub" });
      yy += Math.round(sz * 1.22) + (gap - Math.round(size * 1.22));
      if (rules.indexOf(i) >= 0) {
        const rt = i + 1 < o.terms.length ? o.terms[i + 1].t - 0.16 : tm.t + 0.4;
        S(P, line(x - 10, yy - 6, x + (o.ruleW || subX - 20), yy - 4, 3), "w", 4, rt, 0.14, { sprite: false });
        yy += 14;
      }
      return Object.assign(r, { term: tm });
    });
    return reg({ el: rows[0].div, rows, chars: rows.reduce((a, r) => a.concat(r.chars), []), end: rows[rows.length - 1].end, render() {} });
  }

  /* title(story, { P, rows: [{ x, y, size, from?, cls? }], rowTones: ["y", "p"], underline=true }) — the closing line,
   * word-timed in 美术字, every emphasis phrase (story.end.emphasis) underlined in chalk as soon as it is written. */
  function title(story, o) {
    const P = o.P, lineNo = story.data.end.line, tones = o.rowTones || ["y", "p"];
    const rows = o.rows.map((r, i) => Object.assign({ cls: r.cls || "mast c" + tk(tones[Math.min(i, tones.length - 1)]) }, r));
    const s = say(P, story, lineNo, { rows, sprite: o.sprite, lineCls: "kit-title" });
    const unders = [];
    if (o.underline !== false) (story.data.end.emphasis || []).forEach((ph) => {
      const chs = s.charsOf(ph);
      if (!chs.length) return;
      const tEnd = chs[chs.length - 1].at + chs[chs.length - 1].dur;
      unders.push(underline(P, chs, o.underlineTone || "w", tEnd + 0.02, 0.22, { width: o.underlineWidth || 6, amp: 6, per: 34, sprite: false }));
    });
    return reg(Object.assign(s, { unders, render() {} }));
  }

  // ---------------- the one-frame recap: a chalk mind map ----------------
  // break a recap point into ≤ maxEm rows: clauses end at ，：；; " · " separates list items; rows are balanced
  function wrap(text, maxEm, strip) {
    text = text.replace(/[。.]\s*$/, "");
    // with strip, a row's trailing ，：；、 is dropped, so it does not count toward the width
    const wl = (s) => wlen(strip ? s.replace(/[，：；、]$/, "") : s);
    const atoms = [];
    let cur = "";
    const chs = Array.from(text);
    for (let i = 0; i < chs.length; i++) {
      const ch = chs[i];
      if (ch === "·" && chs[i - 1] === " " && chs[i + 1] === " ") { atoms.push({ s: cur.replace(/\s+$/, ""), sep: " · " }); cur = ""; i++; continue; }
      cur += ch;
      if ("，：；".includes(ch)) { atoms.push({ s: cur, sep: "" }); cur = ""; }
    }
    if (cur) atoms.push({ s: cur, sep: "" });
    // split atoms that are too long on their own (at a space or after 、, else in the middle)
    const fit = maxEm * 1.06;
    for (let i = 0; i < atoms.length; i++) {
      if (wl(atoms[i].s) <= fit) continue;
      const a = Array.from(atoms[i].s);
      let best = -1, sep = "";
      for (let j = 1; j < a.length - 1; j++) {
        const cut = a[j] === " " ? j : a[j - 1] === "、" ? j : -1;
        if (cut > 0 && wlen(a.slice(0, cut).join("")) <= fit) { best = cut; sep = a[j] === " " ? " " : ""; }
      }
      if (best < 0) { best = Math.max(1, Math.floor(a.length / 2)); sep = ""; }
      const left = a.slice(0, best).join("").replace(/\s+$/, ""), right = a.slice(best).join("").replace(/^\s+/, "");
      atoms.splice(i, 1, { s: left, sep }, { s: right, sep: atoms[i].sep });
      if (wl(left) > fit) i--;
    }
    const join = (lo, hi) => { let s = ""; for (let k = lo; k <= hi; k++) s += (k > lo ? atoms[k - 1].sep : "") + atoms[k].s; return s; };
    // a row never runs on past ：or ；(they end a thought)
    const hard = (lo, hi) => { for (let k = lo; k < hi; k++) if (/[：；]$/.test(atoms[k].s)) return true; return false; };
    const wr = (lo, hi) => (hard(lo, hi) ? Infinity : wl(join(lo, hi)));
    const total = wlen(join(0, atoms.length - 1));
    const nMin = Math.min(atoms.length, Math.max(1, Math.ceil(total / maxEm), total > 8 && atoms.length > 1 ? 2 : 1));
    for (let n = nMin; n <= atoms.length; n++) {
      // best partition of atoms into n rows (minimise the longest row)
      const memo = {};
      const best = (i, k) => {
        if (k === 1) return { w: wr(i, atoms.length - 1), cuts: [] };
        const key = i + "," + k;
        if (memo[key]) return memo[key];
        let r = { w: Infinity, cuts: [] };
        for (let j = i; j <= atoms.length - k; j++) {
          const rest = best(j + 1, k - 1), w = Math.max(wr(i, j), rest.w);
          if (w < r.w) r = { w, cuts: [j].concat(rest.cuts) };
        }
        return (memo[key] = r);
      };
      const b = best(0, n);
      if (b.w <= fit || n === atoms.length) {
        const rows = [];
        let i = 0;
        b.cuts.concat([atoms.length - 1]).forEach((j) => { const r = join(i, j).trim(); rows.push(strip ? r.replace(/[，：；、]$/, "") : r); i = j + 1; });
        return rows;
      }
    }
    return [text];
  }
  // colour Latin runs (terms, numbers) in the branch colour, the rest in white chalk
  function toneRuns(text, tone, baseTone) {
    const runs = [], isL = (ch) => /[A-Za-z0-9≈$%.–\/]/.test(ch);
    let cur = "", curL = null;
    Array.from(text).forEach((ch) => {
      const l = ch === " " || ch === "·" ? curL : isL(ch);
      if (curL !== null && l !== curL) { runs.push([cur, curL]); cur = ""; }
      cur += ch;
      curL = l;
    });
    if (cur) runs.push([cur, curL]);
    return runs.map(([s, l]) => [s, "c" + (l ? tone : baseTone || "w")]);
  }

  /* recap(story, { P, t0=story.recap.start, t1, hold=2.6, cps, pace=1, summaryBranch=false, heading, hint, size,
   *               centerLines, doodles: [fn(ctx)] }) — ONE composed frame: a centre (story.recap.center / tagline) and the
   * numbered points as branches clockwise from one o'clock. Skeleton first (centre, branches, headings), then each branch
   * is filled in turn, its doodle drawn as it finishes; the key sentence is boxed last. Returns { end, box, P }. */
  /* (additive) centerFit: size the centre (story.recap.center, split at a space if long) and the tagline (split at "，" if
   * long) to fit inside the ellipse, growing rx / ry a little when needed — for any topic's centre and tagline. */
  function fitCenter(R, rx, ry) {
    const inner = () => 2 * rx * 0.8;
    const halves = (s, sep) => {
      let best = null;
      Array.from(s).forEach((ch, i) => {
        if (ch !== sep || i === 0) return;
        const a = s.slice(0, i).trim(), b = s.slice(i + 1).trim();
        if (!a || !b) return;
        const d = Math.abs(wlen(a) - wlen(b));
        if (!best || d < best.d) best = { d, rows: [a, b] };
      });
      return best ? best.rows : null;
    };
    let main = [R.center], cs = Math.min(96, Math.floor(inner() / wlen(R.center)));
    if (cs < 64) { const h = halves(R.center, " "); if (h) { main = h; cs = Math.min(84, Math.floor(inner() / Math.max(wlen(h[0]), wlen(h[1])))); } }
    cs = Math.max(44, cs);
    const tl = R.tagline ? R.tagline.replace(/[。.]\s*$/, "") : "";
    let tag = tl ? [tl] : [], ts = tl ? Math.min(48, Math.floor((inner() * 1.04) / wlen(tl))) : 0;
    if (tl && ts < 38) { const h = halves(tl, "，"); if (h) { tag = h; ts = Math.min(46, Math.floor((inner() * 1.04) / Math.max(wlen(h[0]), wlen(h[1])))); } }
    ts = tl ? Math.max(32, ts) : 0;
    const wmax = Math.max(...main.map((r) => wlen(r) * cs), ...tag.map((r) => wlen(r) * ts));
    rx = Math.min(330, Math.max(rx, wmax / 2 / 0.8 + 10));
    const hMain = main.length * cs * 1.1, gap = tag.length ? 14 : 0, total = hMain + gap + tag.length * ts * 1.2;
    ry = Math.max(ry, total / 2 / 0.82);
    const y0 = -total / 2 - cs * 0.08;
    return { main, cs, tag, ts, rx, ry, y0, tagY: y0 + hMain + gap };
  }

  function recap(story, o) {
    const R = story.recap, P = o.P, pace = o.pace || 1;
    const W = P.w, cx = o.cx || W / 2, cy = o.cy || 500;
    let rx = o.rx || 250, ry = o.ry || (o.summaryBranch ? 115 : 130);
    const t0 = o.t0 == null ? R.start : o.t0, at = (dt) => t0 + dt * pace;
    const size = o.size || 44, rowGap = Math.round(size * 1.27), headSize = o.headSize || 54;
    // heading
    const head = o.heading || "复习 · 一张脑图";
    seq(P, Math.round(cx - (wlen(head) * 56) / 2), 24, 56, [[head, "kl cy"]], at(0), 20 / pace, { sprite: false });
    // centre
    const fit = o.centerFit && !o.summaryBranch && !o.centerLines ? fitCenter(R, rx, ry) : null;
    if (fit) { rx = fit.rx; ry = fit.ry; }
    S(P, circ(cx, cy, rx, ry), "y", 5.5, at(0.3), 0.35 * pace, { kind: "draw" });
    let tagline = null;
    const center = o.centerLines || (o.summaryBranch && R.center.indexOf(" ") > 0 && R.center.length > 10 ? [R.center.slice(0, R.center.lastIndexOf(" ")), R.center.slice(R.center.lastIndexOf(" ") + 1)] : [R.center]);
    if (fit) {
      const face = (s) => (/[㐀-鿿]/.test(s) ? "kl" : "lat");
      let tw = at(0.4);
      fit.main.forEach((r, i) => { tw = seq(P, Math.round(cx - (wlen(r) * fit.cs) / 2), Math.round(cy + fit.y0 + i * fit.cs * 1.1), fit.cs, [[r, face(r) + " cy"]], tw, 16 / pace).end; });
      tw = Math.max(tw, at(0.62));
      fit.tag.forEach((r, i) => { tagline = seq(P, Math.round(cx - (wlen(r) * fit.ts) / 2), Math.round(cy + fit.tagY + i * fit.ts * 1.2), fit.ts, [[r, "cw"]], tw, 22 / pace); tw = tagline.end; });
    } else if (center.length > 1) {
      seq(P, Math.round(cx - (wlen(center[0]) * 40) / 2), cy - 102, 40, [[center[0], "lat cm"]], at(0.4), 30 / pace, { sprite: false });
      seq(P, Math.round(cx - (wlen(center[1]) * 100) / 2), cy - 48, 100, [[center[1], "lat cy"]], at(0.55), 20 / pace);
    } else {
      const cs = o.centerSize || 96;
      seq(P, Math.round(cx - (wlen(center[0]) * cs) / 2), cy - (o.summaryBranch ? 52 : 92), cs, [[center[0], "lat cy"]], at(0.4), 16 / pace);
      if (!o.summaryBranch && R.tagline) tagline = seq(P, Math.round(cx - (wlen(R.tagline) * 48) / 2), cy + 22, 48, [[R.tagline, "cw"]], at(0.62), 22 / pace);
    }
    // branches: right side top → bottom, then left side bottom → top (clockwise from one o'clock)
    const pts = R.points.map((p) => ({ n: p.n, head: (CN[p.n] || p.n) + " · " + p.title, text: p.text, tone: CHAPTER_TONES[(p.n - 1) % CHAPTER_TONES.length] }));
    if (o.summaryBranch) pts.push({ head: o.summaryTitle || "总结", text: R.tagline, tone: "w", summary: true });
    const N = pts.length, nr = Math.ceil(N / 2), nl = N - nr;
    const slotYs = (k) => (k === 1 ? [cy] : Array.from({ length: k }, (_, i) => lerp(180 + (3 - k) * 50, 800 - (3 - k) * 70, i / (k - 1))));
    const yr = slotYs(nr), yl = slotYs(nl).reverse();
    pts.forEach((p, j) => {
      const right = j < nr, uy = right ? yr[j] : yl[j - nr], side = right ? 1 : -1;
      const sy = cy + Math.max(-1, Math.min(1, (uy - cy) / 310)) * ry * 0.58, sx = cx + side * rx * Math.sqrt(Math.max(0, 1 - Math.pow((sy - cy) / ry, 2))) + side * 5;
      const x0 = sx + side * 110, x1 = right ? W - 50 : 60;
      p.uy = uy; p.right = right; p.x0 = x0;
      p.tx = right ? x0 + 10 : 70;
      p.br = "M " + f1(sx) + " " + f1(sy) + " C " + f1(sx + side * 65) + " " + f1(sy + (uy - sy) * 0.55) + " " + f1(x0 - side * 45) + " " + f1(uy) + " " + f1(x0) + " " + f1(uy) + " L " + f1(x1) + " " + f1(uy);
      const maxEm = ((right ? x1 - 40 - p.tx - 18 : x0 - 30 - p.tx - 18) / (p.summary ? 50 : size));
      // a mind-map branch reads as keywords: no trailing comma / colon on a row
      p.rows = wrap(p.text, maxEm, !p.summary);
    });
    // skeleton first, the way a teacher draws a mind map: branches and their headings
    pts.forEach((p, j) => {
      const tb = at(0.9 + j * 0.14);
      S(P, p.br, p.tone, 8, tb, 0.28 * pace, { kind: "draw" });
      p.headW = seq(P, p.tx, p.uy - 66, headSize, [[p.head, "kl c" + p.tone]], tb + 0.2 * pace, 26 / pace);
    });
    const hint = o.hint == null ? "从右上开始，顺时针读" : o.hint;
    let tc = at(0.9 + N * 0.14 + 0.3);
    if (hint) tc = seq(P, Math.round(cx - (wlen(hint) * 38) / 2), 948, 38, [[hint, "cm"]], at(2.0), 26 / pace, { sprite: false }).end + 0.1 * pace;
    // fill speed: given (cps) or fitted so the writing ends `hold` seconds before t1
    const totalEm = pts.reduce((n, p) => n + p.rows.reduce((m, r) => m + wlen(r), 0), 0);
    const rowsN = pts.reduce((n, p) => n + p.rows.length, 0);
    let cps = o.cps || 22;
    if (o.t1 != null) {
      const avail = o.t1 - (o.hold == null ? 1.2 : o.hold) - tc - rowsN * 0.03 * pace - N * 0.12 * pace - 0.45;
      cps = Math.max(o.cps || 10, totalEm / Math.max(0.5, avail));
    }
    pts.forEach((p, j) => {
      p.rowW = p.rows.map((r, k) => {
        const big = p.summary;
        const parts = big ? [[r, "c" + (o.summaryTones || ["y", "p"])[Math.min(k, 1)]]] : toneRuns(r, p.tone);
        const w = seq(P, p.tx + 18, p.uy + 12 + k * (big ? 60 : rowGap), big ? 50 : size, parts, tc, cps);
        tc = w.end + 0.03 * pace;
        return w;
      });
      if (o.doodles && o.doodles[j]) o.doodles[j]({ P, x: p.tx + wlen(p.head) * headSize + 34, y: p.uy - 66, right: p.right, uy: p.uy, t: tc - 0.1, tone: p.tone, S, T, seq, geo: GEO });
      tc += 0.12 * pace;
    });
    // the one sentence to keep gets boxed (summary branch) or underlined (tagline in the centre)
    const box = tc + 0.05;
    const sb = pts.find((p) => p.summary);
    if (sb) {
      const wmax = Math.max(...sb.rows.map((r) => wlen(r))) * 50;
      S(P, rect(sb.tx + 4, sb.uy + 6, wmax + 30, sb.rows.length * 60 + 8), "y", 4.5, box, 0.4, { kind: "tap" });
      park(box + 0.4, P, sb.tx + wmax + 100, sb.uy + 60, "y");
    } else if (tagline) {
      underline(P, tagline.chars, "y", box, 0.4, { width: 5, amp: 5, per: 30 });
      park(box + 0.4, P, cx + rx + 40, cy + 70, "y");
    }
    mark("recapBox", box);
    const res = reg({ P, box, end: box + 0.4, cps, render() {} });
    return res;
  }

  // ---------------- data dots along a drawn link (an extra) ----------------
  /* flow(stroke, t0, { n=3, speed=0.8, tone="y", r=8, until, frac=0.86 }) — dots ride the stroke from start to end */
  function flow(st, t0, o) {
    o = o || {};
    const n = o.n || 3, dots = [];
    for (let q = 0; q < n; q++) dots.push(svgEl("circle", { r: o.r || 8, fill: color(o.tone || "y"), opacity: 0 }, st.P.svg));
    FLOWS.push({ st, t0, dots, speed: o.speed || 0.8, until: o.until == null ? Infinity : o.until, frac: o.frac || 0.86, once: !!o.once });
  }

  /* gauge({ at: [P, x, y], w=240, h=560, tone="accent", label, t, level: (t) => 0..1 }) — a chalk container with a hatched
   * fill level (显存, a tank, a budget). render(t, level). An extra used by topics with a "how full" quantity. */
  function gauge(o) {
    const [P, x, y] = atOf(o), w = o.w || 240, h = o.h || 560, t0 = o.t || 0, tone = tk(o.tone || "accent");
    const outline = S(P, "M " + (x - 14) + " " + y + " L " + x + " " + (y + 10) + " L " + x + " " + (y + h) + " L " + (x + w) + " " + (y + h) + " L " + (x + w) + " " + (y + 10) + " L " + (x + w + 14) + " " + y, o.outlineTone || "w", 5, t0, 0.4, { kind: "draw" });
    const cid = P.id + "-gauge-" + BARCOUNT++;
    const cr = svgEl("rect", { x: x - 4, y: y + h, width: w + 8, height: 0 }, svgEl("clipPath", { id: cid }, P.svg.querySelector("defs")));
    const fill = svgEl("path", { d: hatch(x + 6, y + 12, w - 12, h - 18, 13), fill: "none", stroke: C[tone], "stroke-width": 3.4, "stroke-linecap": "round", "clip-path": "url(#" + cid + ")" }, P.svg);
    const lid = svgEl("path", { d: line(x + 6, y + h, x + w - 6, y + h, 3), fill: "none", stroke: C[tone], "stroke-width": 5, "stroke-linecap": "round", opacity: 0 }, P.svg);
    const lab = o.label ? seq(P, x + w / 2 - (wlen(o.label) * (o.labelSize || 48)) / 2, y - (o.labelSize || 48) * 1.35, o.labelSize || 48, [[o.label, "kl c" + tk(o.labelTone || "ink")]], t0 + 0.05, 14, { sprite: false }) : null;
    const comp = reg({
      el: fill, outline, label: lab, x, y, w, h, level: 0,
      levelY(l) { return y + h - (h - 14) * l; },
      render(t, level) {
        if (level == null) level = o.level ? o.level(t) : 0;
        this.level = level;
        const hh = (h - 14) * clamp01(level);
        cr.setAttribute("y", f1(y + h - hh));
        cr.setAttribute("height", f1(hh + 2));
        lid.setAttribute("d", "M " + (x + 8) + " " + f1(y + h - hh) + " L " + (x + w - 8) + " " + f1(y + h - hh));
        lid.setAttribute("opacity", hh > 2 ? 1 : 0);
      },
    });
    return comp;
  }

  // ---------------- camera ----------------
  /* camera(keys) — keys: [[t, centreX, centreY, scale, yaw°, roll°], ...] in board coordinates; monotone Hermite (core.track) */
  function camera(keys) { CAM = keys; }
  function camAt(t) { return CAM ? track(CAM, t) : [B.W / 2, B.H / 2, 1, 0, 0]; }

  // ---------------- rendering ----------------
  function strokePoint(st, u) { resolve(st); const p = st.el.getPointAtLength(clamp01(u) * st.len); return { x: st.P.ox + p.x, y: st.P.oy + p.y }; }
  function charPoint(w, u) {
    if (w.whole) return { x: w.P.ox + w.sp.offsetLeft + u * w.sp.offsetWidth, y: w.P.oy + w.sp.offsetTop + w.sp.offsetHeight * 0.55 };
    return { x: w.P.ox + w.line.offsetLeft + w.sp.offsetLeft + u * w.sp.offsetWidth, y: w.P.oy + w.line.offsetTop + w.sp.offsetTop + w.sp.offsetHeight * (0.45 + 0.25 * Math.sin(u * 9)) };
  }
  function buildHand() {
    // every hand-written item, sorted by when it ends: the idle stick rests where the last one finished
    HAND = [];
    WRITES.forEach((w) => { if (w.sprite) HAND.push({ t1: w.at + w.dur, pos: () => charPoint(w, 1), color: w.color }); });
    STROKES.forEach((st) => { if (st.sprite) HAND.push({ t1: st.t0 + st.dur, pos: () => strokePoint(st, 1), color: st.color }); });
    HAND.sort((a, b) => a.t1 - b.t1);
    // dust: sampled deterministically along every hand stroke, under each written character and along every erasure
    STROKES.forEach((st, j) => { if (st.sprite) addDust((tt) => strokePoint(st, pr(tt, st.t0, st.dur)), st.t0, st.t0 + st.dur, 0.035, 22, j * 97); });
    WRITES.forEach((w, j) => { if (w.sprite && j % 2 === 0) addDust(() => charPoint(w, 0.8), w.at + w.dur * 0.6, w.at + w.dur * 0.6 + 0.001, 1, 14, 9000 + j * 13); });
    ERASES.forEach((e, j) => addDust((tt) => { const p = eraserPos(e, tt); return { x: p.x + jit(tt * 91, 80), y: p.y + 30 }; }, e.t0, e.t0 + e.dur, 0.012, 40, 5000 + j * 131));
    DUST.forEach((d) => { d.el = svgEl("circle", { r: d.r.toFixed(1), fill: "rgba(242,239,230,0.75)", opacity: 0 }, B.dustLayer); });
  }
  function addDust(getPos, t0, t1, rate, spread, seedBase) {
    for (let tt = t0, q = 0; tt < t1; tt += rate, q++) DUST.push({ getPos, t: tt, vx: jit(seedBase + q, spread), life: 0.7 + hash(seedBase + q * 1.3) * 0.5, r: 1.2 + hash(seedBase + q * 2.1) * 1.8, el: null });
  }
  function lastFinished(t) {
    let lo = 0, hi = HAND.length - 1, r = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (HAND[m].t1 <= t) { r = m; lo = m + 1; } else hi = m - 1; }
    return r < 0 ? null : HAND[r];
  }

  function render(t) {
    if (!HAND) buildHand();
    // camera
    const c = camAt(t);
    B.world.style.transform = "translate(960px,540px) rotateY(" + c[3].toFixed(3) + "deg) rotateZ(" + c[4].toFixed(3) + "deg) scale(" + c[2].toFixed(4) + ") translate(" + (-c[0]).toFixed(2) + "px," + (-c[1]).toFixed(2) + "px)";
    // strokes draw on
    let active = null;
    for (const st of STROKES) {
      let u = pr(t, st.t0, st.dur);
      if (u <= 0) { if (st._s !== 0) { st.el.style.visibility = "hidden"; st._s = 0; } continue; }
      resolve(st);
      if (st.ease) u = st.ease(u);
      if (st._s !== 1) { st.el.style.visibility = "visible"; st._s = 1; if (!st.dash) st.el.style.strokeDasharray = st.len.toFixed(1) + " " + st.len.toFixed(1); }
      if (!st.dash) { const off = (st.len * (1 - u)).toFixed(1); if (st._o !== off) { st.el.style.strokeDashoffset = off; st._o = off; } }
      if (st.sprite && u < 1 && (!active || st.t0 > active.t)) active = { t: st.t0, pos: () => strokePoint(st, u), color: st.color };
    }
    // characters reveal left → right
    for (const w of WRITES) {
      const u = pr(t, w.at, w.dur);
      const k = u <= 0 ? "h" : u >= 1 ? "f" : "inset(-12% " + ((1 - u) * 100).toFixed(1) + "% -22% -4%)";
      if (w._k !== k) {
        w._k = k;
        w.sp.style.visibility = k === "h" ? "hidden" : "visible";
        w.sp.style.clipPath = k === "h" || k === "f" ? "none" : k;
      }
      if (u > 0 && u < 1 && w.sprite && (!active || w.at > active.t)) active = { t: w.at, pos: () => charPoint(w, u), color: w.color };
    }
    // opacity: erasures and fades multiply
    OPS.forEach((fns, el) => {
      let f = 1;
      for (const fn of fns) f *= fn(t);
      const s = f >= 0.999 ? "" : f.toFixed(3);
      if (el._op !== s) { el.style.opacity = s; el._op = s; }
    });
    // the eraser
    let erasing = null;
    for (const e of ERASES) {
      const u = pr(t, e.t0, e.dur);
      const so = (u * e.residue).toFixed(3);
      if (e._so !== so) { e.smudge.setAttribute("opacity", so); e._so = so; }
      if (t >= e.t0 && t <= e.t0 + e.dur) erasing = e;
    }
    if (erasing) {
      const ep = eraserPos(erasing, t);
      B.eraser.setAttribute("transform", "translate(" + f1(ep.x) + " " + f1(ep.y) + ") rotate(" + (-8 + 6 * Math.sin(t * 30)).toFixed(1) + ")");
      B.eraser.setAttribute("opacity", 1);
      B.trayEraser.setAttribute("opacity", 0);
    } else {
      B.eraser.setAttribute("opacity", 0);
      B.trayEraser.setAttribute("opacity", 1);
    }
    // the chalk stick rides the newest live stroke; between strokes it lifts beside the last thing it wrote
    let sp, lift = 0, col = C.w;
    if (active) { sp = active.pos(); col = active.color; }
    else {
      const lf = lastFinished(t);
      let pk = null;
      for (const p of PARKS) if (p.t <= t) pk = p;
      if (pk && (!lf || pk.t >= lf.t1)) { sp = { x: pk.x, y: pk.y }; col = pk.color; }
      else if (lf) { const p = lf.pos(); sp = { x: p.x + 26, y: p.y + 34 }; col = lf.color; }
      else { const cc = camAt(t); sp = { x: cc[0] + 700, y: cc[1] + 380 }; }
      lift = 1;
    }
    B.stickBody.setAttribute("fill", col);
    B.stick.setAttribute("transform", "translate(" + f1(sp.x) + " " + f1(sp.y) + ") rotate(" + (-38 + 6 * lift) + ") scale(" + (1 + 0.06 * lift) + ")");
    B.stick.setAttribute("opacity", erasing ? 0 : 1);
    // dust falls and fades
    for (const d of DUST) {
      const dt = t - d.t;
      if (dt < 0 || dt > d.life) { if (d._v !== 0) { d.el.setAttribute("opacity", 0); d._v = 0; } continue; }
      if (d._p == null) d._p = d.getPos(d.t);
      d.el.setAttribute("cx", f1(d._p.x + d.vx * dt));
      d.el.setAttribute("cy", f1(d._p.y + 40 * dt + 260 * dt * dt));
      d.el.setAttribute("opacity", (0.8 * (1 - dt / d.life)).toFixed(3));
      d._v = 1;
    }
    // data dots ride their links
    for (const F of FLOWS) {
      const live = t >= F.t0 && t <= F.until;
      F.dots.forEach((dot, q) => {
        if (!live) { dot.setAttribute("opacity", 0); return; }
        resolve(F.st);
        let ph = (t - F.t0) * F.speed + q / F.dots.length;
        if (F.once && ph > 1) { dot.setAttribute("opacity", 0); return; }
        ph %= 1;
        const p = F.st.el.getPointAtLength(ph * F.st.len * F.frac);
        dot.setAttribute("cx", f1(p.x));
        dot.setAttribute("cy", f1(p.y));
        dot.setAttribute("opacity", Math.sin(Math.PI * ph).toFixed(3));
      });
    }
    for (const comp of COMPONENTS) comp.render(t);
    for (const fn of EXTRAS) fn(t);
  }

  /* log() — every sound-worthy event, for the film's tools/sfx.py (lib/kit/chalklog.mjs writes it to JSON) */
  function log() {
    const r3 = (v) => +(+v).toFixed(3);
    const chars = WRITES.map((w) => r3(w.at)).sort((a, b) => a - b);
    const lines = STROKES.filter((s) => s.sprite && s.dur >= 0.12 && s.kind === "draw").map((s) => [r3(s.t0), r3(s.t0 + s.dur)]).sort((a, b) => a[0] - b[0]);
    const quick = STROKES.filter((s) => !s.sprite && s.kind === "draw" && s.dur >= 0.1).map((s) => [r3(s.t0), r3(s.t0 + s.dur)]).sort((a, b) => a[0] - b[0]);
    const ticks = STROKES.filter((s) => s.kind === "tick").map((s) => r3(s.t0)).sort((a, b) => a - b);
    const taps = STROKES.filter((s) => s.kind === "tap").map((s) => r3(s.t0 + s.dur)).sort((a, b) => a - b);
    const erases = ERASES.map((e) => [r3(e.t0), r3(e.t0 + e.dur)]);
    const moves = [];
    if (CAM) for (let i = 1; i < CAM.length; i++) {
      const a = CAM[i - 1], b = CAM[i], dist = Math.hypot(b[1] - a[1], b[2] - a[2]) * Math.min(a[3], b[3]), dz = Math.abs(Math.log(b[3] / a[3]));
      if (dist > 380 || dz > 0.25) moves.push([r3(a[0]), r3(b[0]), r3(dist), r3(dz), r3(b[1] - a[1])]);
    }
    return { chars, lines, quick, ticks, taps, erases, moves, marks: MARKS };
  }

  const GEO = { line, rect, circ, scrib, hatch, arrow, cloud, star, check, cross, keyIcon, cardIcon, fileIcon, burst, wave, brace, border: borderPath };

  g.Kit = {
    name: "v8-chalkboard",
    C, tone: tk, color, CHAPTER_TONES, BORDERS, wlen, wrap, geo: GEO, hash, jit,
    // the world
    board, panel, camera, camAt, render, onRender, log, mark, park,
    // chalk primitives
    S, T, X: X_, seq, fade, flow, underline, ring, spanBox,
    // narration + structure
    say, chapter,
    // contract components
    label, note, number, bars, formula, title, recap,
    // extras
    gauge,
  };
})(window);
