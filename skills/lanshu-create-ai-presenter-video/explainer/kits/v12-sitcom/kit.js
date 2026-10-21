/* v12-sitcom kit — 小剧场 (a sitcom set seen straight on).
 *
 * Load after lib/core.js and lib/story.js; defines window.Kit. Link lib/kit/kit.css in <head>.
 * Every factory returns { el, render(t, ...) }; render() is a pure function of t (and its explicit args): no Math.random,
 * no Date, no layout reads. Position `el` yourself (Kit.at(el, x, y) for pieces, or a transform).
 *
 * The style in one sentence: a character meets a misconception, finds the cause through a bill, a queue or a side-by-side
 * object comparison, and it ends in one sentence that maps the analogy to the real term.
 *
 *   set        one long room seen straight on (cream wall, mint wainscot, wood floor) — Kit.backdrop + Kit.piece(kind)
 *   actors     rounded flat characters, 4 px cocoa outlines, dot eyes, blush; configurable hair / clothes / face / pose;
 *              driven by cues (pose, face, sweat, slump, turn), moves (walks), hops and emotes — all evaluated at t
 *   evidence   Kit.receipt (unrolls row by row, red 又核一遍 tags), Kit.queue (grows / is served), Kit.notebook,
 *              Kit.display (叫号屏), props (cup, slip, slip pile, memory stick …)
 *   talk       Kit.bubble: speech (Noto), thought (Long Cang, cloud), shout; pops on its word, units lit as spoken
 *   naming     Kit.termChip: 小本本 = KV cache — the analogy mapped to the real term, a pill landing on its word
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v12-sitcom: load lib/core.js before lib/kit/kit.js");
  const { clamp01, pr, lerp, E, hash } = C;
  const NS = "http://www.w3.org/2000/svg";

  // ---------------- palette ----------------
  const P = {
    ink: "#3d2b22", wall: "#fbf3e4", wall2: "#f7ecd9", trim: "#f3e3c8", mint: "#cfe8dc", mint2: "#a6e6cc", mintD: "#5fb88f",
    wood: "#ecd0a8", woodLine: "#d8b585", coral: "#ef7d61", coralD: "#e0694c", yellow: "#ffcf5a", red: "#e2483d", redSoft: "#ffe1dc",
    board: "#2f5a4b", chalk: "#fff6d6", sky: "#bfe3f5", sun: "#ffe39a", skin: "#ffd9bf", blush: "#ff9fb4", paper: "#fffdf7",
    peach: "#ffd9a8", white: "#ffffff", pants: "#4b5a7a", dark: "#2b2b2b", sweat: "#8fd0ff", lilac: "#d5bdff", blue: "#8fc8ff",
    mouth: "#8a3d2e", metal: "#e3e9ee", leaf: "#7cc49a", pot: "#e8a274",
  };
  const SHIRTS = ["#f6a6b2", "#a6e6cc", "#d5bdff", "#ffd27a", "#8fc8ff", "#ffb46b", "#c9e48a", "#f9c0d8"];
  const HAIRS = ["#5a3a2a", "#2b2b2b", "#8a5a44", "#3a2a22", "#6b4a3a", "#b0703a"];
  const SKINS = ["#ffd9bf", "#f6c9a8", "#ffe2cc", "#eab894"];
  const STYLES = ["short", "bun", "bob", "spiky", "short", "ponytail", "cap"];
  const LINE = { stroke: P.ink, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" };

  // ---------------- eases + time helpers ----------------
  const back = (s) => (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2));
  const EZ = Object.assign({}, E, { lin: (u) => u, sio: (u) => -(Math.cos(Math.PI * u) - 1) / 2, b14: back(1.4), b17: back(1.7), b20: back(2.0) });
  const tw = (t, a, d, v0, v1, ez) => v0 + (v1 - v0) * (ez || EZ.lin)(pr(t, a, d));
  // eased keyframes: [[t0, v0], [t1, v1, ease], ...] — holds exactly between keys
  function ladder(t, K) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      if (t < K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (b[2] || EZ.io2)((t - a[0]) / (b[0] - a[0])); }
    }
    return K[K.length - 1][1];
  }
  // pop-in scale (0 before `at`, back-eased to 1) times a shrink-out before `out`; null when hidden
  function popScale(t, at, out, dIn = 0.3, dOut = 0.2) {
    if (at == null || t < at) return null;
    if (out != null && t >= out + dOut) return null;
    const a = EZ.b17(pr(t, at, dIn)), b = out == null ? 1 : 1 - EZ.i2(pr(t, out, dOut));
    const s = Math.max(0, a) * b;
    return s <= 0.001 ? null : s;
  }
  // a hop: y offset (negative = up) for a parabola of height h lasting d from `at`
  const hopY = (t, at, h = 36, d = 0.36) => { const u = (t - at) / d; return u > 0 && u < 1 ? -h * 4 * u * (1 - u) : 0; };
  // a landing squash after `at` → [sx, sy]
  function land(t, at, amt = 0.12) {
    const q = t - at;
    if (q < 0 || q > 0.3) return [1, 1];
    if (q < 0.06) { const a = q / 0.06; return [1 + amt * a, 1 - amt * a]; }
    const b = EZ.b17((q - 0.06) / 0.24);
    return [1 + amt - amt * b, 1 - amt + amt * b];
  }
  const bump = (t, at, d = 0.3) => { const u = (t - at) / d; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
  const hsh = (n) => hash(n);

  // ---------------- DOM helpers ----------------
  function mk(tag, cls, parent, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    if (parent) parent.appendChild(el);
    return el;
  }
  function svgEl(tag, attrs, parent, text) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // Latin / digit runs (incl. #008, KV cache, 0.5 MiB) → mono term spans
  const TERM = /[A-Za-z0-9#$%][A-Za-z0-9#$%.,·'\-–/+ ]*[A-Za-z0-9$%)]|[A-Za-z0-9#$%]/g;
  // Wrap raw Latin units, then escape every unit so HTML entities stay intact.
  const term = (text) => units(String(text)).map(({ s, latin }) => latin ? `<span class="kit-term">${esc(s)}</span>` : esc(s)).join("");
  const CJK = /[\u2E80-\uFFEF]/, WIDE = /[\u2E80-\uFFEF\u2014\u2026]/;   // … and — are full width in CJK faces
  // rough text width at font-size fs (CJK 1 em, Latin `latin` em) — for sizing, never for layout reads
  const textW = (s, fs, latin = 0.6) => [...String(s)].reduce((w, ch) => w + (WIDE.test(ch) ? 1 : ch === " " ? 0.3 : latin) * fs, 0);
  // split a text into units: Latin / number runs whole, everything else one character each
  function units(text) {
    const out = [], re = new RegExp(TERM.source, "g");
    let last = 0, m;
    while ((m = re.exec(text))) {
      for (let i = last; i < m.index; i++) out.push({ s: text[i], latin: false });
      out.push({ s: m[0], latin: true });
      last = m.index + m[0].length;
    }
    for (let i = last; i < text.length; i++) out.push({ s: text[i], latin: false });
    return out;
  }
  function at(el, x, y) { el.style.left = x + "px"; el.style.top = y + "px"; return el; }
  function vis(el, on) { const v = on ? "inherit" : "hidden"; if (el.style.visibility !== v) el.style.visibility = v; }
  // write a transform + visibility in one go: (x, y) translate, s scale (or [sx, sy]), r rotation (deg); s null hides
  function xf(el, x, y, s, r) {
    if (s == null) { vis(el, false); return false; }
    vis(el, true);
    const sx = Array.isArray(s) ? s[0] : s, sy = Array.isArray(s) ? s[1] : s;
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)` + (r ? ` rotate(${r.toFixed(2)}deg)` : "") + ` scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    return true;
  }

  // =====================================================================================================
  // THE SET
  // =====================================================================================================
  /* backdrop({ x0, x1, rooms: [{ x0, x1, paper }], dividers: [x, ...] }) — one long room seen straight on.
   * World y: cornice 0–24, wall 24–590, wainscot 590–760 (rails at 586 / 756), wood floor 760–1500. The wall continues
   * above 0 and the floor below 1080 so a camera that pulls back never sees the edge. `paper` adds faint vertical stripes
   * (a second wallpaper) to a room; dividers are wall pillars between rooms. */
  const WAIN = 590, FLOOR = 760;
  function backdrop(o) {
    const x0 = o.x0 - 400, x1 = o.x1 + 400, w = x1 - x0;
    const el = mk("div", "kit-backdrop");
    at(el, x0, -700);
    const svg = svgEl("svg", { width: w, height: 2300, viewBox: `${x0} -700 ${w} 2300` }, el);
    svgEl("rect", { x: x0, y: -700, width: w, height: 1290, fill: P.wall }, svg);
    (o.rooms || []).forEach((r) => {
      if (!r.paper) return;
      for (let x = r.x0 + 40; x < r.x1 - 40; x += 96) svgEl("rect", { x, y: -700, width: 40, height: 1290, fill: P.wall2 }, svg);
    });
    svgEl("rect", { x: x0, y: -700, width: w, height: 724, fill: P.trim }, svg);
    svgEl("rect", { x: x0, y: 20, width: w, height: 6, fill: P.ink, opacity: 0.85 }, svg);
    svgEl("rect", { x: x0, y: WAIN, width: w, height: FLOOR - WAIN, fill: P.mint }, svg);
    for (let x = Math.ceil(x0 / 70) * 70; x < x1; x += 70) svgEl("line", { x1: x, y1: WAIN + 22, x2: x, y2: FLOOR - 14, stroke: "#b7d9c8", "stroke-width": 3 }, svg);
    svgEl("rect", { x: x0, y: WAIN - 4, width: w, height: 8, fill: P.ink, opacity: 0.85 }, svg);
    svgEl("rect", { x: x0, y: FLOOR, width: w, height: 840, fill: P.wood }, svg);
    for (let x = Math.ceil(x0 / 160) * 160; x < x1 + 400; x += 160) svgEl("line", { x1: x, y1: FLOOR, x2: x - 140, y2: 1500, stroke: P.woodLine, "stroke-width": 3 }, svg);
    svgEl("rect", { x: x0, y: FLOOR - 4, width: w, height: 8, fill: P.ink, opacity: 0.85 }, svg);
    (o.dividers || []).forEach((x) => {
      svgEl("rect", { x: x - 60, y: -700, width: 120, height: 1460, fill: P.trim, ...LINE }, svg);
      svgEl("rect", { x: x - 76, y: FLOOR - 40, width: 152, height: 40, rx: 6, fill: "#e6d2b2", ...LINE }, svg);
      svgEl("rect", { x: x - 76, y: 26, width: 152, height: 34, rx: 6, fill: "#e6d2b2", ...LINE }, svg);
    });
    return { el, svg, x0, x1 };
  }

  // a piece: an absolutely placed div holding an SVG drawn in local px (top-left origin)
  function piece(w, h, draw, cls) {
    const el = mk("div", "kit-piece" + (cls ? " " + cls : ""));
    el.style.width = w + "px"; el.style.height = h + "px";
    const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, el);
    const r = draw ? draw(svg, el) : null;
    return Object.assign({ el, svg, w, h }, r || {});
  }

  /* Kit.piece(kind, opts) → { el, w, h, … } (place with Kit.at(el, x, y), top-left in world px). Kinds:
   *   counter {w, h, color}  board {w, h, title, rows: [[name, price]], titleSize}  window {w, h}  door {w, h, color}
   *   shelf {w, items: "cups"|"books"|"jars"}  plant {h}  clock {r}  lamp {len}  frame {w, h, kind}  desk {w, h, monitor}
   *   register {}  bench {w}  stool {}  sign {text, w}  (sign / board carry real HTML text) */
  const PIECES = {
    counter(o) {
      const w = o.w || 660, h = o.h || 280, col = o.color || P.coral;
      return piece(w, h, (s) => {
        svgEl("rect", { x: 20, y: 20, width: w - 40, height: h - 22, rx: 10, fill: col, ...LINE }, s);
        const n = Math.max(1, Math.round((w - 40) / 200)), pw = (w - 40 - 40 - (n - 1) * 40) / n;
        for (let i = 0; i < n; i++) svgEl("rect", { x: 40 + i * (pw + 40), y: 70, width: pw, height: h - 120, rx: 14, fill: "none", stroke: "#fff", "stroke-width": 4, opacity: 0.45 }, s);
        svgEl("rect", { x: 2, y: 2, width: w - 4, height: 40, rx: 12, fill: "#fff", ...LINE }, s);
      });
    },
    board(o) {
      const w = o.w || 560, h = o.h || 272;
      const p = piece(w, h, (s) => { svgEl("rect", { x: 2, y: 2, width: w - 4, height: h - 4, rx: 18, fill: P.board, ...LINE }, s); svgEl("rect", { x: 16, y: 16, width: w - 32, height: h - 32, rx: 10, fill: "none", stroke: "#ffffff", "stroke-width": 2, opacity: 0.12 }, s); });
      const ts = o.titleSize || 42;
      if (o.title) { const t = mk("div", "kit-board-h", p.el, term(o.title)); t.style.top = Math.round(ts * 0.55) + "px"; t.style.fontSize = ts + "px"; p.title = t; }
      if (o.rows) {
        const r = mk("div", "kit-board-rows", p.el);
        at(r, 50, Math.round(ts * 1.9 + 20)); r.style.width = (w - 100) + "px";
        o.rows.forEach((row) => mk("div", "kit-board-row", r, `<span>${esc(row[0])}</span>${row[1] != null ? `<b>${esc(row[1])}</b>` : ""}`));
        p.rows = r;
      }
      p.area = mk("div", null, p.el); p.area.style.position = "absolute"; p.area.style.inset = "0";
      return p;
    },
    window(o) {
      const w = o.w || 170, h = o.h || 330;
      return piece(w, h, (s) => {
        svgEl("rect", { x: 2, y: 2, width: w - 4, height: h - 4, rx: 16, fill: P.sky, ...LINE }, s);
        svgEl("circle", { cx: w * 0.24 + 4, cy: h * 0.24, r: Math.min(26, w * 0.15), fill: P.sun }, s);
        svgEl("path", { d: `M${w * 0.55},${h * 0.62} q${w * 0.12},-${h * 0.06} ${w * 0.24},0 q${w * 0.06},-${h * 0.05} ${w * 0.12},0 h-${w * 0.36} z`, fill: "#ffffff", opacity: 0.85 }, s);
        svgEl("line", { x1: w / 2, y1: 2, x2: w / 2, y2: h - 2, ...LINE }, s);
        svgEl("rect", { x: -10, y: h - 14, width: w + 20, height: 16, rx: 6, fill: "#fff", ...LINE }, s);
      });
    },
    door(o) {
      const w = o.w || 210, h = o.h || 480, col = o.color || "#e8b07a";
      return piece(w + 24, h + 12, (s) => {
        svgEl("rect", { x: 2, y: 2, width: w + 20, height: h + 8, rx: 10, fill: P.trim, ...LINE }, s);
        svgEl("rect", { x: 14, y: 14, width: w - 4, height: h - 10, rx: 8, fill: col, ...LINE }, s);
        svgEl("rect", { x: 40, y: 50, width: w - 56, height: h * 0.32, rx: 10, fill: P.sky, ...LINE }, s);
        svgEl("rect", { x: 40, y: h * 0.55, width: w - 56, height: h * 0.3, rx: 10, fill: "none", stroke: P.ink, "stroke-width": 3, opacity: 0.35 }, s);
        svgEl("circle", { cx: w - 20, cy: h * 0.5, r: 9, fill: P.yellow, ...LINE }, s);
      });
    },
    shelf(o) {
      const w = o.w || 380, items = o.items || "cups", seed = o.seed || 1;
      return piece(w, 300, (s) => {
        [110, 270].forEach((y, row) => {
          let x = 26;
          let k = 0;
          while (x < w - 70) {
            const hh = hsh(seed * 9 + row * 31 + k) , col = [P.coral, P.mint2, P.yellow, P.lilac, P.blue, P.peach][(k + row * 2 + seed) % 6];
            if (items === "books") { const bw = 26 + 14 * hh, bh = 70 + 30 * hsh(k * 3 + row + seed); svgEl("rect", { x, y: y - bh, width: bw, height: bh, rx: 4, fill: col, ...LINE }, s); x += bw + 4; }
            else if (items === "jars") { svgEl("rect", { x, y: y - 74, width: 54, height: 74, rx: 14, fill: "#fff", ...LINE }, s); svgEl("rect", { x: x + 6, y: y - 44, width: 42, height: 38, rx: 8, fill: col }, s); svgEl("rect", { x: x + 8, y: y - 86, width: 38, height: 14, rx: 4, fill: col, ...LINE }, s); x += 72; }
            else { svgEl("path", { d: `M${x},${y - 70} h48 l-6,70 h-36 z`, fill: "#fff", ...LINE }, s); svgEl("path", { d: `M${x + 4},${y - 40} h40 l-3,34 h-34 z`, fill: col }, s); svgEl("rect", { x: x - 4, y: y - 80, width: 56, height: 12, rx: 5, fill: "#fff", ...LINE }, s); x += 70; }
            k++;
          }
          svgEl("rect", { x: 2, y, width: w - 4, height: 20, rx: 6, fill: "#e6b884", ...LINE }, s);
        });
      });
    },
    plant(o) {
      const h = o.h || 260;
      return piece(180, h, (s) => {
        const top = h - 100;
        [[-50, -0.9], [-20, -1.3], [10, -1.45], [40, -1.2], [62, -0.75]].forEach(([dx, a], i) => {
          const L = top * (0.75 + 0.25 * hsh(i + 3)), x2 = 90 + Math.cos(a) * L * 0.55 + dx * 0.4, y2 = top + 10 + Math.sin(a) * L;
          svgEl("path", { d: `M90,${top + 20} Q${(90 + x2) / 2 + dx * 0.3},${(top + y2) / 2} ${x2},${y2} Q${(90 + x2) / 2 + dx * 0.6 + 20},${(top + y2) / 2 + 10} 90,${top + 20} Z`, fill: P.leaf, ...LINE }, s);
        });
        svgEl("path", { d: `M44,${h - 104} h92 l-12,100 h-68 z`, fill: P.pot, ...LINE }, s);
        svgEl("rect", { x: 36, y: h - 112, width: 108, height: 22, rx: 8, fill: P.pot, ...LINE }, s);
      });
    },
    clock(o) {
      const r = o.r || 52;
      const p = piece(r * 2 + 8, r * 2 + 8, (s) => {
        svgEl("circle", { cx: r + 4, cy: r + 4, r, fill: "#fff", ...LINE, "stroke-width": 5 }, s);
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; svgEl("line", { x1: r + 4 + Math.cos(a) * r * 0.78, y1: r + 4 + Math.sin(a) * r * 0.78, x2: r + 4 + Math.cos(a) * r * 0.9, y2: r + 4 + Math.sin(a) * r * 0.9, stroke: P.ink, "stroke-width": 3 }, s); }
      });
      p.hh = svgEl("line", { x1: r + 4, y1: r + 4, x2: r + 4, y2: r * 0.5 + 4, ...LINE, "stroke-width": 6 }, p.svg);
      p.mh = svgEl("line", { x1: r + 4, y1: r + 4, x2: r + 4 + r * 0.7, y2: r + 4, ...LINE }, p.svg);
      svgEl("circle", { cx: r + 4, cy: r + 4, r: 5, fill: P.ink }, p.svg);
      // hands(minutes): turn the hands (pure — pass a value computed from t)
      p.hands = (min) => {
        const a = (min / 60) * Math.PI * 2 - Math.PI / 2, b = (min / 720) * Math.PI * 2 - Math.PI / 2 + 1.2;
        p.mh.setAttribute("x2", (r + 4 + Math.cos(a) * r * 0.72).toFixed(1)); p.mh.setAttribute("y2", (r + 4 + Math.sin(a) * r * 0.72).toFixed(1));
        p.hh.setAttribute("x2", (r + 4 + Math.cos(b) * r * 0.48).toFixed(1)); p.hh.setAttribute("y2", (r + 4 + Math.sin(b) * r * 0.48).toFixed(1));
      };
      p.hands(10);
      return p;
    },
    lamp(o) {
      const len = o.len || 150;
      return piece(140, len + 90, (s) => {
        svgEl("line", { x1: 70, y1: 0, x2: 70, y2: len, ...LINE }, s);
        svgEl("path", { d: `M20,${len + 70} Q20,${len} 70,${len} Q120,${len} 120,${len + 70} Z`, fill: P.yellow, ...LINE }, s);
        svgEl("ellipse", { cx: 70, cy: len + 74, rx: 18, ry: 10, fill: "#fff6d6", ...LINE }, s);
      });
    },
    frame(o) {
      const w = o.w || 220, h = o.h || 170;
      return piece(w, h, (s) => {
        svgEl("rect", { x: 2, y: 2, width: w - 4, height: h - 4, rx: 10, fill: "#fff", ...LINE, "stroke-width": 5 }, s);
        svgEl("rect", { x: 18, y: 18, width: w - 36, height: h - 36, rx: 4, fill: o.kind === "sun" ? P.peach : P.sky }, s);
        svgEl("path", { d: `M18,${h - 18} L${w * 0.38},${h * 0.42} L${w * 0.58},${h * 0.66} L${w * 0.72},${h * 0.5} L${w - 18},${h - 18} Z`, fill: P.mintD, ...LINE, "stroke-width": 3 }, s);
        svgEl("circle", { cx: w * 0.74, cy: h * 0.3, r: 14, fill: P.sun }, s);
      });
    },
    desk(o) {
      const w = o.w || 560, h = o.h || 230;
      return piece(w, h + (o.monitor ? 230 : 0), (s) => {
        const y0 = o.monitor ? 230 : 0;
        if (o.monitor) {
          svgEl("rect", { x: w / 2 - 150, y: 4, width: 300, height: 190, rx: 16, fill: P.dark, ...LINE }, s);
          svgEl("rect", { x: w / 2 - 132, y: 20, width: 264, height: 158, rx: 8, fill: "#3c5a66" }, s);
          svgEl("rect", { x: w / 2 - 20, y: 194, width: 40, height: 30, fill: "#cfd6dc", ...LINE }, s);
        }
        svgEl("rect", { x: 30, y: y0 + 30, width: 26, height: h - 32, rx: 6, fill: "#c98f5a", ...LINE }, s);
        svgEl("rect", { x: w - 56, y: y0 + 30, width: 26, height: h - 32, rx: 6, fill: "#c98f5a", ...LINE }, s);
        svgEl("rect", { x: w - 220, y: y0 + 40, width: 170, height: 110, rx: 10, fill: "#e6b884", ...LINE }, s);
        svgEl("line", { x1: w - 200, y1: y0 + 95, x2: w - 70, y2: y0 + 95, ...LINE }, s);
        svgEl("rect", { x: 2, y: y0 + 2, width: w - 4, height: 40, rx: 10, fill: "#e6b884", ...LINE }, s);
      });
    },
    register(o) {
      return piece(130, 74, (s) => {
        svgEl("rect", { x: 4, y: 4, width: 120, height: 64, rx: 10, fill: "#fff6d6", ...LINE }, s);
        svgEl("rect", { x: 20, y: 18, width: 88, height: 26, rx: 4, fill: P.board }, s);
        for (let i = 0; i < 4; i++) svgEl("rect", { x: 20 + i * 23, y: 50, width: 16, height: 8, rx: 2, fill: P.ink, opacity: 0.6 }, s);
      });
    },
    bench(o) {
      const w = o.w || 360;
      return piece(w, 150, (s) => {
        svgEl("rect", { x: 20, y: 60, width: 22, height: 88, rx: 6, fill: "#c98f5a", ...LINE }, s);
        svgEl("rect", { x: w - 42, y: 60, width: 22, height: 88, rx: 6, fill: "#c98f5a", ...LINE }, s);
        svgEl("rect", { x: 2, y: 44, width: w - 4, height: 30, rx: 10, fill: P.coral, ...LINE }, s);
        svgEl("rect", { x: 10, y: 2, width: w - 20, height: 36, rx: 12, fill: P.coral, ...LINE }, s);
      });
    },
    stool() {
      return piece(110, 160, (s) => {
        svgEl("path", { d: "M26,30 L12,156 M84,30 L98,156", ...LINE, "stroke-width": 8 }, s);
        svgEl("rect", { x: 4, y: 4, width: 102, height: 30, rx: 14, fill: P.yellow, ...LINE }, s);
      });
    },
    sign(o) {
      const w = o.w || 360;
      const p = piece(w, 110, (s) => {
        svgEl("line", { x1: w * 0.25, y1: -60, x2: w * 0.25, y2: 10, ...LINE }, s);
        svgEl("line", { x1: w * 0.75, y1: -60, x2: w * 0.75, y2: 10, ...LINE }, s);
        svgEl("rect", { x: 2, y: 8, width: w - 4, height: 96, rx: 22, fill: o.color || P.coral, ...LINE }, s);
      });
      const t = mk("div", "kit-board-h", p.el, term(o.text || ""));
      t.style.top = "24px"; t.style.fontSize = (o.size || 46) + "px"; t.style.color = "#fff";
      if (!o.color || o.color === P.coral) { t.style.color = P.ink; }
      p.title = t;
      return p;
    },
  };
  function pieceOf(kind, o) {
    const f = PIECES[kind];
    if (!f) throw new Error("Kit.piece: unknown kind " + kind);
    return f(o || {});
  }

  // =====================================================================================================
  // ACTORS
  // =====================================================================================================
  // arm end points (x is multiplied by the side: -1 = screen left arm, +1 = screen right arm) and the elbow bulge
  const ARM = {
    down: [66, -170, 24], front: [118, -250, 24], up: [70, -436, 8], wave: [122, -420, -18], hold: [104, -360, 26],
    hip: [62, -232, 62], point: [170, -326, 6], give: [152, -284, 12], write: [24, -238, 48], chin: [10, -350, 72],
    shrug: [120, -316, -34], cheer: [100, -448, 30], cheek: [50, -372, 72], tray: [96, -270, 30], bow: [40, -230, 30],
  };
  const SHOULDER_Y = -300;
  const HAIR = {
    short: "M-62,-396 Q-64,-462 0,-466 Q62,-462 62,-400 Q40,-428 0,-424 Q-36,-428 -62,-396 Z",
    bob: "M-68,-366 Q-74,-468 0,-470 Q74,-468 68,-366 L52,-368 Q52,-420 0,-426 Q-52,-420 -52,-368 Z",
    spiky: "M-62,-400 L-60,-446 L-40,-438 L-32,-472 L-12,-450 L2,-482 L18,-452 L36,-470 L42,-440 L60,-448 L62,-400 Q36,-428 0,-424 Q-36,-428 -62,-400 Z",
  };
  // face parts: eyes, brows, mouth per expression
  const FACE = {
    smile: { eyes: "dot", mouth: "M-16,-358 q16,16 32,0" },
    happy: { eyes: "arc", mouth: "D" },
    worried: { eyes: "dot", brows: "M-34,-410 l18,-8 M34,-410 l-18,-8", mouth: "M-14,-350 q14,-11 28,0" },
    surprised: { eyes: "big", brows: "M-36,-422 q9,-8 18,0 M18,-422 q9,-8 18,0", mouth: "O" },
    sad: { eyes: "down", brows: "M-34,-410 l18,-8 M34,-410 l-18,-8", mouth: "M-14,-350 q14,-11 28,0" },
    think: { eyes: "side", brows: "M16,-420 q9,-8 18,0", mouth: "M-10,-354 h20" },
    flat: { eyes: "dot", mouth: "M-12,-356 h24" },
    proud: { eyes: "arc", mouth: "M-22,-360 q22,22 44,0" },
    oops: { eyes: "big", brows: "M-34,-410 l18,-8 M34,-410 l-18,-8", mouth: "M-16,-352 q8,-8 16,0 q8,8 16,0" },
  };

  /* Kit.character(o) → an actor. o: {
   *   x, y (feet, world px), s (scale; customers ≈ 0.78), flip (true = faces left), kind ("person" | "robot"),
   *   skin, hair: "short" | "bun" | "bob" | "spiky" | "ponytail" | "cap" | "long" | "bald", hairColor, shirt, pants, apron (colour),
   *   glasses, capColor, bow (bow-tie colour), face ("smile" | "happy" | "worried" | "surprised" | "sad" | "think" | "flat" |
   *   "proud" | "oops"), arms: [left, right] (poses: down front up wave hold hip point give write chin shrug cheer cheek tray bow),
   *   name (a name tag under the chin, e.g. "小林 · 新店员"), seed (picks unset colours / hair), bust (no legs) }
   * Drive it with (all chainable, all evaluated at render time — pure functions of t):
   *   .cue(t, { face, arms, armL, armR, sweat, slump, tilt, headY, flip, lean })   blend 0.24 s (faces switch at t)
   *   .move(t0, t1, x, { y, walk = true })   walk to x (legs swing; a jog when fast)
   *   .hop(t, h = 36, d = 0.36)              a hop with a landing squash
   *   .emote(t, "！", dur = 1.2)             a mark pops over the head
   *   .show(t0, t1)                          visible only inside these windows (call several times)
   *   .hold(side, el, t0, t1, dx, dy)        keep a world element at a hand
   *   .handAt(t, side), .headAt(t)           world points (for bubbles, flights)
   * render(t) every frame. */
  function character(o = {}) {
    const seed = o.seed != null ? o.seed : 1;
    const kind = o.kind || "person";
    const skin = o.skin || SKINS[Math.floor(hsh(seed * 3.3) * SKINS.length)];
    const shirt = o.shirt || SHIRTS[Math.floor(hsh(seed * 5.7 + 1) * SHIRTS.length)];
    const hairC = o.hairColor || HAIRS[Math.floor(hsh(seed * 7.1 + 2) * HAIRS.length)];
    const hairS = o.hair || (kind === "robot" ? "none" : STYLES[Math.floor(hsh(seed * 2.9 + 4) * STYLES.length)]);
    const pants = o.pants || P.pants;
    const el = mk("div", "kit-actor");
    const fig = mk("div", null, el);
    fig.style.position = "absolute"; fig.style.left = "0"; fig.style.top = "0"; fig.style.transformOrigin = "0 0";
    const svg = svgEl("svg", { viewBox: "-170 -560 340 580", width: 340, height: 580 }, fig);
    svg.style.position = "absolute"; svg.style.left = "-170px"; svg.style.top = "-560px"; svg.style.overflow = "visible";
    const G = (parent, attrs) => svgEl("g", attrs || {}, parent);
    const root = G(svg);
    // legs (each a group rotating at the hip)
    const legs = [-1, 1].map((side) => {
      const lg = G(root);
      if (!o.bust) {
        svgEl("rect", { x: side < 0 ? -36 : 6, y: -150, width: 30, height: 150, rx: 14, fill: pants, ...LINE }, lg);
        svgEl("ellipse", { cx: side < 0 ? -18 : 24, cy: 0, rx: 26, ry: 12, fill: P.ink }, lg);
      }
      return lg;
    });
    const upper = G(root); // everything above the hips (slumps)
    const behind = G(upper); // behind the body (long hair, ponytail)
    const body = G(upper);
    if (kind === "robot") {
      svgEl("rect", { x: -60, y: -330, width: 120, height: 196, rx: 34, fill: o.shirt || "#cfd8e3", ...LINE }, body);
      svgEl("rect", { x: -30, y: -290, width: 60, height: 70, rx: 12, fill: "#fff", ...LINE }, body);
      svgEl("circle", { cx: 0, cy: -255, r: 12, fill: P.coral, ...LINE }, body);
    } else {
      svgEl("rect", { x: -56, y: -330, width: 112, height: 196, rx: 46, fill: shirt, ...LINE }, body);
      if (o.apron) {
        svgEl("path", { d: "M-40,-268 L40,-268 L46,-150 L-46,-150 Z", fill: o.apron, ...LINE }, body);
        svgEl("path", { d: "M-30,-268 L-20,-322 M30,-268 L20,-322", ...LINE, fill: "none" }, body);
        svgEl("rect", { x: -18, y: -236, width: 36, height: 26, rx: 6, fill: "none", stroke: P.ink, "stroke-width": 3, opacity: 0.5 }, body);
      }
      if (o.bow) { svgEl("path", { d: "M0,-318 l-22,-12 v24 z M0,-318 l22,-12 v24 z", fill: o.bow, ...LINE }, body); svgEl("circle", { cx: 0, cy: -318, r: 6, fill: o.bow, ...LINE }, body); }
    }
    // arms: outline stroke + fill stroke + hand
    const armEls = [-1, 1].map(() => {
      const g2 = G(upper);
      const o1 = svgEl("path", { fill: "none", stroke: P.ink, "stroke-width": 30, "stroke-linecap": "round" }, g2);
      const o2 = svgEl("path", { fill: "none", stroke: kind === "robot" ? (o.shirt || "#cfd8e3") : shirt, "stroke-width": 22, "stroke-linecap": "round" }, g2);
      const hd = svgEl("circle", { r: 15, fill: kind === "robot" ? "#fff" : skin, ...LINE }, g2);
      return { o1, o2, hd, d: "" };
    });
    // head group (tilts / nods)
    const head = G(upper);
    if (hairS === "long") svgEl("path", { d: "M-70,-400 Q-76,-472 0,-474 Q76,-472 70,-400 L76,-318 Q62,-306 50,-326 L48,-380 L-48,-380 L-50,-326 Q-62,-306 -76,-318 Z", fill: hairC, ...LINE }, behind);
    if (hairS === "ponytail") svgEl("ellipse", { cx: 66, cy: -420, rx: 20, ry: 40, fill: hairC, ...LINE, transform: "rotate(-24 66 -420)" }, behind);
    let faceG;
    if (kind === "robot") {
      svgEl("line", { x1: 0, y1: -470, x2: 0, y2: -500, ...LINE }, head);
      svgEl("circle", { cx: 0, cy: -506, r: 12, fill: P.coral, ...LINE }, head);
      svgEl("rect", { x: -78, y: -470, width: 156, height: 136, rx: 36, fill: P.metal, ...LINE }, head);
      svgEl("rect", { x: -60, y: -452, width: 120, height: 100, rx: 22, fill: P.dark }, head);
      svgEl("rect", { x: -90, y: -420, width: 14, height: 40, rx: 6, fill: P.coral, ...LINE }, head);
      svgEl("rect", { x: 76, y: -420, width: 14, height: 40, rx: 6, fill: P.coral, ...LINE }, head);
      faceG = G(head);
    } else {
      svgEl("circle", { cx: 0, cy: -392, r: 62, fill: skin, ...LINE }, head);
      if (hairS !== "bald" && hairS !== "cap") svgEl("path", { d: HAIR[hairS] || HAIR.short, fill: hairC, ...LINE }, head);
      if (hairS === "bun") svgEl("circle", { cx: 0, cy: -470, r: 22, fill: hairC, ...LINE }, head);
      if (hairS === "cap") {
        svgEl("path", { d: HAIR.short, fill: hairC, ...LINE }, head);
        svgEl("path", { d: "M-64,-410 Q-62,-474 0,-476 Q62,-474 64,-410 Z", fill: o.capColor || P.coral, ...LINE }, head);
        svgEl("path", { d: "M-64,-412 Q-96,-414 -112,-400 Q-96,-394 -62,-400 Z", fill: o.capColor || P.coral, ...LINE }, head);
      }
      faceG = G(head);
      svgEl("ellipse", { cx: -38, cy: -368, rx: 11, ry: 7, fill: P.blush, opacity: 0.8 }, head);
      svgEl("ellipse", { cx: 38, cy: -368, rx: 11, ry: 7, fill: P.blush, opacity: 0.8 }, head);
      if (o.glasses) {
        svgEl("circle", { cx: -22, cy: -392, r: 17, fill: "none", ...LINE }, head);
        svgEl("circle", { cx: 22, cy: -392, r: 17, fill: "none", ...LINE }, head);
        svgEl("line", { x1: -5, y1: -392, x2: 5, y2: -392, ...LINE }, head);
      }
    }
    // faces: one group per expression, shown one at a time
    const fcol = kind === "robot" ? P.mint2 : P.ink;
    const FL = { stroke: fcol, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" };
    const faces = {};
    Object.keys(FACE).forEach((name) => {
      const F = FACE[name], fg = G(faceG, { visibility: "hidden" });
      const ey = kind === "robot" ? -404 : -392;
      const dy = ey + 392;
      if (F.eyes === "dot" || F.eyes === "side") { const sx = F.eyes === "side" ? 5 : 0; [-22, 22].forEach((x) => svgEl("ellipse", { cx: x + sx, cy: ey, rx: 6, ry: 8, fill: fcol }, fg)); }
      if (F.eyes === "big") [-22, 22].forEach((x) => { svgEl("ellipse", { cx: x, cy: ey, rx: 8, ry: 11, fill: fcol }, fg); svgEl("circle", { cx: x + 2.5, cy: ey - 4, r: 2.6, fill: kind === "robot" ? P.dark : "#fff" }, fg); });
      if (F.eyes === "arc") [-22, 22].forEach((x) => svgEl("path", { d: `M${x - 9},${ey + 3} q9,-12 18,0`, ...FL }, fg));
      if (F.eyes === "down") [-22, 22].forEach((x) => svgEl("path", { d: `M${x - 9},${ey - 2} q9,9 18,0`, ...FL }, fg));
      if (F.brows && kind !== "robot") svgEl("path", { d: F.brows, ...FL }, fg);
      if (F.mouth === "D") svgEl("path", { d: `M-18,${-362 + dy} q18,26 36,0 Z`, fill: kind === "robot" ? P.mint2 : P.mouth, stroke: fcol, "stroke-width": 4, "stroke-linejoin": "round" }, fg);
      else if (F.mouth === "O") svgEl("ellipse", { cx: 0, cy: -352 + dy, rx: 9, ry: 11, fill: kind === "robot" ? P.mint2 : P.mouth, stroke: fcol, "stroke-width": 4 }, fg);
      else svgEl("path", { d: F.mouth.replace(/^M(-?\d+),(-?\d+)/, (m, a, b) => `M${a},${+b + dy}`), ...FL }, fg);
      faces[name] = fg;
    });
    // sweat drops (pop in on a cue, slide a little, then stay)
    const sweat = G(head, { visibility: "hidden" });
    const sw1 = svgEl("path", { d: "M58,-432 q14,22 0,30 q-14,-8 0,-30 Z", fill: P.sweat, ...LINE }, sweat);
    const sw2 = svgEl("path", { d: "M78,-384 q10,16 0,22 q-10,-6 0,-22 Z", fill: P.sweat, ...LINE }, sweat);
    // overlays that never flip: name tag, emotes
    let nameEl = null;
    if (o.name) { nameEl = mk("div", "kit-tag", el, term(o.name)); }
    const emoteEls = [];

    const base = { face: o.face || "smile", arms: (o.arms || ["down", "down"]).slice(), sweat: false, slump: 0, tilt: 0, headY: 0, flip: o.flip ? -1 : 1, lean: 0 };
    const A = {
      el, fig, svg, o, s: o.s || 1, x: o.x || 0, y: o.y || 0, seed, shirt, hairColor: hairC, kind,
      cues: [], moves: [], hops: [], wins: [], holds: [],
      at(x, y) { A.x = x; if (y != null) A.y = y; return A; },
      cue(t, st) { A.cues.push({ t, st }); A._st = null; return A; },
      move(t0, t1, x, opts) { A.moves.push({ t0, t1, x, y: opts && opts.y, walk: !(opts && opts.walk === false), ez: (opts && opts.ease) || EZ.io2 }); A.moves.sort((a, b) => a.t0 - b.t0); A._mv = null; return A; },
      hop(t, h, d) { A.hops.push({ t, h: h == null ? 36 : h, d: d || 0.36 }); return A; },
      emote(t, text, dur) {
        const e = mk("div", "kit-emote", el, "<span>" + esc(text) + "</span>");
        emoteEls.push({ el: e, t, d: dur || 1.2 });
        return A;
      },
      show(t0, t1) { A.wins.push([t0, t1 == null ? 1e9 : t1]); return A; },
      hold(side, item, t0, t1, dx, dy) { A.holds.push({ side, el: item, t0, t1: t1 == null ? 1e9 : t1, dx: dx || 0, dy: dy || 0 }); return A; },
    };
    // resolved cue states (cumulative)
    function states() {
      if (A._st) return A._st;
      const cs = A.cues.slice().sort((a, b) => a.t - b.t);
      let cur = Object.assign({}, base, { arms: base.arms.slice() });
      const out = cs.map((c) => {
        const n = Object.assign({}, cur, c.st);
        n.arms = (c.st.arms || cur.arms).slice();
        if (c.st.armL) n.arms[0] = c.st.armL;
        if (c.st.armR) n.arms[1] = c.st.armR;
        cur = n;
        return { t: c.t, s: n };
      });
      A._st = out;
      return out;
    }
    function stateAt(t) {
      const ss = states();
      let i = -1;
      for (let k = 0; k < ss.length; k++) if (t >= ss[k].t) i = k;
      const cur = i >= 0 ? ss[i].s : base, prev = i > 0 ? ss[i - 1].s : base;
      const u = i >= 0 ? EZ.o3(pr(t, ss[i].t, 0.24)) : 1;
      return { cur, prev, u, t0: i >= 0 ? ss[i].t : -1e9 };
    }
    // position from the moves: { x, y, walking phase }
    function posAt(t) {
      let x = A.x, y = A.y, phase = 0, moving = false;
      for (const m of A.moves) {
        const xa = x, ya = y;
        const xb = m.x == null ? x : m.x, yb = m.y == null ? y : m.y;
        if (t >= m.t1) { x = xb; y = yb; continue; }
        if (t > m.t0) {
          const u = clamp01((t - m.t0) / (m.t1 - m.t0)), e = m.ez(u);
          x = lerp(xa, xb, e); y = lerp(ya, yb, e);
          if (m.walk) { moving = true; phase = (Math.hypot(x - xa, y - ya) / 64) * Math.PI; }
        }
        break;
      }
      return { x, y, phase, moving };
    }
    A.posAt = posAt;
    function armPts(pose, side) { const a = ARM[pose] || ARM.down; return [a[0] * side, a[1], a[2]]; }
    function armAt(st, side) {
      const k = side < 0 ? 0 : 1, a = armPts(st.prev.arms[k], side), b = armPts(st.cur.arms[k], side);
      return [lerp(a[0], b[0], st.u), lerp(a[1], b[1], st.u), lerp(a[2], b[2], st.u)];
    }
    A.handAt = function (t, side) {
      const st = stateAt(t), p = posAt(t), a = armAt(st, side < 0 ? -1 : 1), fl = lerp(st.prev.flip, st.cur.flip, st.u) < 0 ? -1 : 1;
      return { x: p.x + a[0] * A.s * fl, y: p.y + a[1] * A.s + hopsAt(t) };
    };
    A.headAt = function (t) { const p = posAt(t); return { x: p.x, y: p.y - 480 * A.s + hopsAt(t) }; };
    function hopsAt(t) { let y = 0; for (const h of A.hops) y += hopY(t, h.t, h.h, h.d); return y; }
    function squashAt(t) { let sx = 1, sy = 1; for (const h of A.hops) { const q = land(t, h.t + h.d, 0.1); sx *= q[0]; sy *= q[1]; } return [sx, sy]; }

    A.render = function (t) {
      if (A.wins.length && !A.wins.some((w) => t >= w[0] && t < w[1])) { vis(el, false); return; }
      vis(el, true);
      const st = stateAt(t), p = posAt(t);
      const dy = hopsAt(t), sq = squashAt(t);
      // a turn passes through edge-on (scaleX → 0) over 0.18 s
      const fu = st.cur.flip !== st.prev.flip ? EZ.io2(pr(t, st.t0, 0.18)) : 1;
      const flip = lerp(st.prev.flip, st.cur.flip, fu);
      const slump = lerp(st.prev.slump || 0, st.cur.slump || 0, st.u);
      const bob = p.moving ? -6 * Math.abs(Math.sin(p.phase)) : 0;
      el.style.transform = `translate(${p.x.toFixed(1)}px,${(p.y + dy + bob).toFixed(1)}px)`;
      const lean = lerp(st.prev.lean || 0, st.cur.lean || 0, st.u);
      fig.style.transform = `scale(${(A.s * sq[0] * (Math.abs(flip) < 0.04 ? 0.04 * Math.sign(flip || 1) : flip)).toFixed(3)},${(A.s * sq[1]).toFixed(3)})` + (lean ? ` rotate(${lean.toFixed(2)}deg)` : "");
      // legs swing while walking
      // legs swing from the hip while walking (a skew about the hip line reads as a swing)
      legs.forEach((lg, i) => {
        const a = p.moving ? (i ? 1 : -1) * 22 * Math.sin(p.phase) : 0;
        lg.setAttribute("transform", a ? `translate(0 -150) skewX(${(-a).toFixed(1)}) translate(0 150)` : "");
      });
      upper.setAttribute("transform", slump ? `translate(0 ${(16 * slump).toFixed(1)})` : "");
      // arms
      [-1, 1].forEach((side, k) => {
        const a = armAt(st, side), sx = side * 50, sy = SHOULDER_Y + 6 * slump;
        const d = `M${sx},${sy} Q${((sx + a[0]) / 2 + side * a[2]).toFixed(1)},${((sy + a[1]) / 2).toFixed(1)} ${a[0].toFixed(1)},${a[1].toFixed(1)}`;
        const ae = armEls[k];
        if (ae.d !== d) { ae.o1.setAttribute("d", d); ae.o2.setAttribute("d", d); ae.hd.setAttribute("cx", a[0].toFixed(1)); ae.hd.setAttribute("cy", a[1].toFixed(1)); ae.d = d; }
      });
      // head: nod / tilt / slump
      const hy = lerp(st.prev.headY || 0, st.cur.headY || 0, st.u) + 10 * slump, tl = lerp(st.prev.tilt || 0, st.cur.tilt || 0, st.u);
      head.setAttribute("transform", (hy ? `translate(0 ${hy.toFixed(1)})` : "") + (tl ? ` rotate(${tl.toFixed(1)} 0 -330)` : ""));
      const fname = FACE[st.cur.face] ? st.cur.face : "smile";
      for (const k in faces) { const v = k === fname ? "visible" : "hidden"; if (faces[k].getAttribute("visibility") !== v) faces[k].setAttribute("visibility", v); }
      // sweat: pops in when a cue turns it on, slides 8 px once
      const swOn = !!st.cur.sweat;
      sweat.setAttribute("visibility", swOn ? "visible" : "hidden");
      if (swOn) {
        const since = st.prev.sweat ? 1 : pr(t, st.t0, 0.5);
        sweat.setAttribute("transform", `translate(0 ${(8 * EZ.o2(since)).toFixed(1)})`);
        sw1.setAttribute("opacity", "1"); sw2.setAttribute("opacity", since > 0.3 ? "1" : "0");
      }
      // overlays
      if (nameEl) xf(nameEl, -nameTagW() / 2, -300 * A.s - 20, 1);
      emoteEls.forEach((e) => {
        const s = popScale(t, e.t, e.t + e.d, 0.26, 0.2);
        xf(e.el, 46 * A.s * (flip < 0 ? -1 : 1) - 20, -560 * A.s - 40, s, -8);
      });
      A.holds.forEach((h) => {
        if (t < h.t0 || t >= h.t1) return;
        const hp = A.handAt(t, h.side);
        h.el.style.transform = `translate(${(hp.x + h.dx).toFixed(1)}px,${(hp.y + h.dy).toFixed(1)}px)`;
      });
    };
    let _ntw = null;
    function nameTagW() { if (_ntw == null) _ntw = textW(o.name, 28, 0.6) + 42; return _ntw; }
    return A;
  }

  // =====================================================================================================
  // QUEUE — a line of customers that grows (join) and is served (the front walks off, the rest step up)
  // =====================================================================================================
  /* Kit.queue({ front: x of the first slot, y, gap = 118, s = 0.78, n0 = 0, seed = 1, enterFrom (x where joiners appear,
   *   default far left), exitTo (x the served walk to), looks: [characterOpts …] })
   * q.join(t)   one more at the back (walks in);  q.serve(t)  the front one walks off, the others step up one slot
   * q.face(t, face, { from, to })  expression for members in slots [from, to] (by slot at that time)
   * q.members   the actors (q.members[k] = the k-th person ever to stand in line);  q.count(t);  q.render(t) */
  function queue(o) {
    const gap = o.gap || 118, s = o.s || 0.78, y = o.y || 900, front = o.front, seed = o.seed || 1;
    const slotX = (k) => front - k * gap;
    const el = mk("div", "kit-set");
    const members = [], events = [];
    let built = false;
    const Q = {
      el, members, gap, front, slotX,
      join(t) { events.push({ t, k: "join" }); built = false; return Q; },
      serve(t) { events.push({ t, k: "serve" }); built = false; return Q; },
      face(t, face, r) { events.push({ t, k: "face", face, r: r || {} }); built = false; return Q; },
      count(t) { build(); let n = o.n0 || 0; events.forEach((e) => { if (e.t <= t) { if (e.k === "join") n++; if (e.k === "serve") n = Math.max(0, n - 1); } }); return n; },
      actor(k) { build(); return members[k]; },
    };
    function look(k) { const L = (o.looks && o.looks[k % o.looks.length]) || {}; return Object.assign({ seed: seed * 13 + k, s, face: "smile" }, L); }
    function build() {
      if (built) return;
      built = true;
      events.sort((a, b) => a.t - b.t);
      // simulate: line = member indices front→back
      const line = [];
      let made = 0;
      const need = (k) => {
        while (members.length <= k) {
          const m = character(Object.assign(look(members.length), { x: -9999, y }));
          m._made = false;
          members.push(m);
        }
        const m = members[k];
        if (!m._made) { el.appendChild(m.el); m._made = true; }
        return m;
      };
      // drop what an earlier build generated (q: true); cues / moves a scene added itself stay
      members.forEach((m) => { m.moves = m.moves.filter((x) => !x.q); m.cues = m.cues.filter((x) => !x.q); m._st = null; m._in = m._out = undefined; });
      const qmove = (m, t0, t1, x, opts) => { m.move(t0, t1, x, opts); m.moves.forEach((mv) => { if (mv.t0 === t0 && mv.t1 === t1 && mv.x === x) mv.q = true; }); };
      const qcue = (m, t, st) => { m.cues.push({ t, st, q: true }); m._st = null; };
      for (let k = 0; k < (o.n0 || 0); k++) { const m = need(made++); m.at(slotX(k), y); m._in = -1e9; line.push(members.indexOf(m)); }
      events.forEach((e) => {
        if (e.k === "join") {
          const idx = made++, m = need(idx), slot = line.length, x1 = slotX(slot);
          const x0 = o.enterFrom != null ? o.enterFrom : x1 - 520;
          m.at(x0, y); m._in = e.t;
          qmove(m, e.t, e.t + Math.min(1.1, Math.max(0.5, Math.abs(x1 - x0) / 700)), x1);
          line.push(idx);
        } else if (e.k === "serve" && line.length) {
          const idx = line.shift(), m = members[idx];
          const x0 = m.moves.filter((x) => x.q).length ? m.moves.filter((x) => x.q).slice(-1)[0].x : m.x;
          const x1 = o.exitTo != null ? o.exitTo : x0 + 900;
          qcue(m, e.t, { face: "happy", armR: "tray" });
          qmove(m, e.t + 0.1, e.t + 0.1 + Math.min(1.4, Math.abs(x1 - x0) / 650), x1, { y: y + 26 });
          m._out = e.t + 0.1 + Math.min(1.4, Math.abs(x1 - x0) / 650);
          line.forEach((j, slot) => { qmove(members[j], e.t + 0.2 + slot * 0.05, e.t + 0.62 + slot * 0.05, slotX(slot)); });
        } else if (e.k === "face") {
          line.forEach((j, slot) => { if (slot >= (e.r.from || 0) && slot <= (e.r.to == null ? 99 : e.r.to)) qcue(members[j], e.t + (e.r.stagger || 0) * slot, { face: e.face, sweat: e.r.sweat }); });
        }
      });
      members.forEach((m) => { m.wins.length = 0; m.show(m._in == null ? -1e9 : m._in, m._out == null ? 1e9 : m._out + 0.05); });
      // a member's slot position at the end of the simulation (for scenes that hand things to the line)
      Q.line = line.slice();
    }
    Q.render = function (t) { build(); for (let k = members.length - 1; k >= 0; k--) members[k].render(t); };
    return Q;
  }

  // =====================================================================================================
  // BUBBLES
  // =====================================================================================================
  function roundRectPath(w, h, r, tail) {
    // tail: { side: "down"|"up"|"left"|"right", base (px along the edge), tip: [x, y], half }
    const T = tail || {}, hb = T.half || 24;
    let d = `M${r},0 `;
    if (T.side === "up") d += `H${T.base - hb} L${T.tip[0]},${T.tip[1]} L${T.base + hb},0 `;
    d += `H${w - r} Q${w},0 ${w},${r} `;
    if (T.side === "right") d += `V${T.base - hb} L${T.tip[0]},${T.tip[1]} L${w},${T.base + hb} `;
    d += `V${h - r} Q${w},${h} ${w - r},${h} `;
    if (T.side === "down") d += `H${T.base + hb} L${T.tip[0]},${T.tip[1]} L${T.base - hb},${h} `;
    d += `H${r} Q0,${h} 0,${h - r} `;
    if (T.side === "left") d += `V${T.base + hb} L${T.tip[0]},${T.tip[1]} L0,${T.base - hb} `;
    d += `V${r} Q0,0 ${r},0 Z`;
    return d;
  }
  function cloudPath(w, h) {
    // scallops around a rounded rect, ≈ 64 px apart
    const pts = [], r = Math.min(h / 2, 50), per = [];
    const seg = (x0, y0, x1, y1) => { const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / 64)); for (let i = 0; i < n; i++) per.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]); };
    seg(r, 6, w - r, 6); seg(w - 6, r, w - 6, h - r); seg(w - r, h - 6, r, h - 6); seg(6, h - r, 6, r);
    per.forEach((p) => pts.push(p));
    let d = `M${pts[0][0]},${pts[0][1]} `;
    for (let i = 1; i <= pts.length; i++) {
      const a = pts[i - 1], b = pts[i % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      d += `A${(L * 0.6).toFixed(1)},${(L * 0.6).toFixed(1)} 0 0 1 ${b[0].toFixed(1)},${b[1].toFixed(1)} `;
    }
    return d + "Z";
  }
  function jagPath(w, h) {
    const pts = [], cx = w / 2, cy = h / 2, n = 22;
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2, out = i % 2 === 0 ? 1.0 : 0.86, j = 1 + 0.06 * (hsh(i * 3.1) - 0.5);
      pts.push([cx + Math.cos(a) * (w / 2 + 18) * out * j, cy + Math.sin(a) * (h / 2 + 18) * out * j]);
    }
    return "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L") + " Z";
  }

  /* Kit.bubble({ text, kind: "say" | "think" | "shout", size, maxW, lines, tail: "down" | "up" | "left" | "right",
   *   along (0..1 position of the tail on its edge), tip: [dx, dy] tail tip offset from the tail base, times (per unit: when it is
   *   spoken / written; null = shown at once), write (true: units appear at their time instead of being lit),
   *   mark: ["手太慢", …] (units on the yellow marker as they light), tag (small dark tag, e.g. "分镜 03"), todo (dashed 待演绎 tag) })
   * → { el, w, h, tip: {x, y} (local), place(x, y) puts the tail tip at world (x, y), render(t, at, out) } */
  function bubble(o) {
    const kind = o.kind || "say";
    const fs = o.size || (kind === "think" ? 52 : 40);
    const lh = kind === "think" ? 1.2 : 1.3;
    const us = units(o.text || "");
    const latinW = kind === "think" ? 0.5 : 0.6;
    const full = textW(o.text || "", fs, latinW);
    const maxW = o.maxW || 820;
    const lines = o.lines || Math.max(1, Math.ceil(full / maxW));
    const innerW = Math.min(maxW, lines > 1 ? full / lines * 1.12 + fs : full + fs * 0.2);
    const padX = kind === "think" ? 56 : kind === "shout" ? 60 : 42, padY = kind === "think" ? 40 : kind === "shout" ? 44 : 28;
    // room for the corner tags (分镜 NN on the left, 待演绎 on the right) on a short bubble
    const minW = o.minW || ((o.tag ? textW(o.tag, 26, 0.6) + 60 : 0) + (o.todo ? 150 : 0) + (o.tag || o.todo ? 60 : 0));
    const w = Math.round(o.w || Math.max(minW, innerW + padX * 2)), h = Math.round(o.h || lines * fs * lh + padY * 2);
    const side = o.tail || "down", along = o.along == null ? 0.5 : o.along;
    const tipOff = o.tip || (side === "down" ? [40, 70] : side === "up" ? [30, -70] : side === "left" ? [-70, 30] : [70, 30]);
    const el = mk("div", "kit-bubble" + (kind !== "say" ? " kit-" + kind : ""));
    el.style.width = w + "px"; el.style.height = h + "px";
    const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, el);
    let tip;
    if (kind === "think") {
      svgEl("path", { d: cloudPath(w, h), fill: "#fff", ...LINE }, svg);
      const bx = side === "left" ? 10 : side === "right" ? w - 10 : w * along, by = side === "down" ? h - 4 : side === "up" ? 4 : h * along;
      tip = { x: bx + tipOff[0], y: by + tipOff[1] };
      [[0.3, 20], [0.62, 14], [0.9, 9]].forEach(([f, r]) => svgEl("circle", { cx: bx + tipOff[0] * f, cy: by + tipOff[1] * f, r, fill: "#fff", ...LINE }, svg));
    } else if (kind === "shout") {
      svgEl("path", { d: jagPath(w, h), fill: "#fff", ...LINE }, svg);
      const bx = w * along, by = side === "down" ? h + 10 : -10;
      tip = { x: bx + tipOff[0], y: by + tipOff[1] };
      svgEl("path", { d: `M${bx - 26},${by - (side === "down" ? 20 : -20)} L${tip.x},${tip.y} L${bx + 26},${by - (side === "down" ? 20 : -20)} Z`, fill: "#fff", ...LINE }, svg);
      svgEl("path", { d: jagPath(w, h), fill: "#fff", stroke: "none" }, svg);
    } else {
      const r = Math.min(34, h / 2);
      const base = side === "down" || side === "up" ? Math.max(r + 30, Math.min(w - r - 30, w * along)) : Math.max(r + 30, Math.min(h - r - 30, h * along));
      const bxy = side === "down" ? [base, h] : side === "up" ? [base, 0] : side === "left" ? [0, base] : [w, base];
      tip = { x: bxy[0] + tipOff[0], y: bxy[1] + tipOff[1] };
      svgEl("path", { d: roundRectPath(w, h, r, { side, base, tip: [tip.x, tip.y] }), fill: "#fff", ...LINE }, svg);
    }
    el.style.transformOrigin = `${tip.x}px ${tip.y}px`;
    const box = mk("div", "kit-bubble-t", el);
    at(box, padX, padY - (kind === "think" ? 4 : 0)); box.style.width = (w - padX * 2) + "px"; box.style.height = (h - padY * 2) + "px"; box.style.fontSize = fs + "px";
    const inner = mk("div", null, box);
    const marks = [];
    (o.mark || []).forEach((m) => {
      const flat = us.map((u) => u.s).join(""), a = flat.indexOf(m);
      if (a < 0) return;
      let pos = 0;
      us.forEach((u, k) => { if (pos >= a && pos < a + m.length) marks.push(k); pos += u.s.length; });
    });
    const spans = us.map((u, k) => {
      const s = mk("span", "kit-bubble-u" + (u.latin ? " kit-term" : "") + (marks.includes(k) ? " kit-mark" : ""), inner);
      s.textContent = u.s;
      if (u.latin) { s.style.margin = "0 0.12em"; }
      return { el: s, t: o.times ? o.times[k] : null };
    });
    let tagEl = null, todoEl = null;
    if (o.tag) tagEl = mk("div", "kit-bubble-k", el, esc(o.tag));
    if (o.todo) todoEl = mk("div", "kit-bubble-todo", el, "<span>" + esc(o.todo === true ? "待演绎" : o.todo) + "</span>");
    const B = {
      el, w, h, tip, spans,
      place(x, y) { at(el, Math.round(x - tip.x), Math.round(y - tip.y)); return B; },
      render(t, atT, out) {
        const sc = popScale(t, atT, out, 0.3, 0.18);
        if (sc == null) { vis(el, false); return false; }
        vis(el, true);
        el.style.transform = `scale(${sc.toFixed(3)})`;
        spans.forEach((sp) => {
          if (sp.t == null) { sp.el.style.setProperty("--lit", "1"); sp.el.style.setProperty("--mk", "1"); return; }
          const p = EZ.o2(pr(t, sp.t - 0.04, 0.18));
          if (o.write) { sp.el.style.visibility = p > 0 ? "inherit" : "hidden"; sp.el.style.opacity = p.toFixed(3); }
          sp.el.style.setProperty("--lit", p.toFixed(3));
          sp.el.style.setProperty("--mk", p.toFixed(3));
        });
        if (todoEl) todoEl.style.transform = `rotate(3deg) scale(${(0.6 + 0.4 * EZ.b17(pr(t, atT + 0.25, 0.3))).toFixed(3)})`;
        return true;
      },
    };
    return B;
  }

  // =====================================================================================================
  // EVIDENCE
  // =====================================================================================================
  /* Kit.receipt({ title, rows: [{ no, item, tag, kind: "old" | "new" | "ok" }], footer (html, may use <b>), w = 480 })
   * render(t, { rows: [t …] (row i unrolls at rows[i]), tags: [t …] (its tag stamps), footer: t, hi: [w …] (row highlight 0..1),
   *   at, out }) — the paper unrolls downward row by row; the torn edge follows. */
  function receipt(o) {
    const w = o.w || 480, rows = o.rows || [];
    const el = mk("div", "kit-receipt");
    const clip = mk("div", "kit-receipt-clip", el);
    clip.style.width = w + "px";
    const paper = mk("div", "kit-receipt-paper", clip);
    paper.style.width = w + "px";
    const H0 = 26 + 38 + 27, ROW = 52, footLines = o.footer ? String(o.footer).split("<br>").length : 0, FOOT = o.footer ? 27 + footLines * 35 + 22 : 18;
    mk("div", "kit-receipt-h", paper, term(o.title || "")).style.height = "38px";
    mk("div", "kit-receipt-rule", paper);
    const rowEls = rows.map((r) => {
      const re = mk("div", "kit-receipt-row" + (r.kind === "new" ? " kit-new" : r.kind === "ok" ? " kit-ok" : ""), paper);
      mk("span", "kit-receipt-no", re, esc(r.no || ""));
      mk("span", "kit-receipt-it", re, esc(r.item || ""));
      const tg = r.tag ? mk("span", "kit-receipt-tag", re, esc(r.tag)) : null;
      return { el: re, tag: tg };
    });
    let foot = null;
    if (o.footer) { mk("div", "kit-receipt-rule", paper); foot = mk("div", "kit-receipt-f", paper, o.footer); }
    const full = H0 + rows.length * ROW + FOOT;
    paper.style.height = full + "px";
    const edge = svgEl("svg", { width: w, height: 20, viewBox: `0 0 ${w} 20`, class: "kit-receipt-edge" }, el);
    let d = "M0,0 ", n = Math.round(w / 24);
    for (let i = 0; i < n; i++) d += `L${((i + 0.5) * w) / n},16 L${((i + 1) * w) / n},0 `;
    svgEl("path", { d: d + "Z", fill: P.paper }, edge);
    svgEl("path", { d: d.replace(/^M0,0 /, "M0,-2 L0,0 ") + ` L${w},-2`, fill: "none", ...LINE }, edge);
    const R = {
      el, w, full, H0, ROW,
      heightAt(t, st) {
        let hh = H0;
        rows.forEach((r, i) => { hh += ROW * EZ.o3(pr(t, st.rows ? st.rows[i] : -1, 0.22)); });
        if (st.footer != null) hh += FOOT * EZ.o3(pr(t, st.footer, 0.3)); else hh += 18;
        return hh;
      },
      render(t, st) {
        st = st || {};
        const sc = popScale(t, st.at == null ? -1 : st.at, st.out, 0.32, 0.2);
        if (sc == null) { vis(el, false); return false; }
        vis(el, true);
        const hh = R.heightAt(t, st);
        clip.style.height = hh.toFixed(1) + "px";
        edge.style.transform = `translateY(${(hh - 1).toFixed(1)}px)`;
        rowEls.forEach((re, i) => {
          if (re.tag) {
            const ta = st.tags ? st.tags[i] : null, s = ta == null ? null : popScale(t, ta, null, 0.24);
            re.tag.style.visibility = s == null ? "hidden" : "inherit";
            if (s != null) re.tag.style.transform = `rotate(-4deg) scale(${(s * (1 + 0.5 * (1 - EZ.o2(pr(t, ta, 0.2))))).toFixed(3)})`;
          }
          const hi = st.hi ? st.hi[i] || 0 : 0;
          re.el.style.background = hi > 0.01 ? `rgba(255, 207, 90, ${(0.6 * hi).toFixed(3)})` : "";
        });
        el.style.transform = sc !== 1 ? `scale(${sc.toFixed(3)})` : "";
        return true;
      },
    };
    return R;
  }

  /* Kit.notebook({ w = 640 (open width), h = 360, rows: [[k, v] …], cols: ["单号", "内容"], label: "小本本" })
   * render(t, { open (0..1), rows: [p …] (each row written 0..1), hiK, hiV (column highlights 0..1), active (row index, yellow),
   *   flip (0..1 a page turns), thick (px of page edges under the book), at, out }) */
  function notebook(o) {
    const W = o.w || 640, H = o.h || 360, half = W / 2, rows = o.rows || [], cols = o.cols || ["单号", "内容"];
    const el = mk("div", "kit-nb");
    el.style.width = W + "px"; el.style.height = H + "px";
    const stack = mk("div", "kit-nb-stack", el);
    const L = mk("div", "kit-nb-page kit-l", el), Rr = mk("div", "kit-nb-page kit-r", el);
    [L, Rr].forEach((pg, k) => { at(pg, k ? half : 0, 0); pg.style.width = half + "px"; pg.style.height = H + "px"; });
    const RH = Math.min(52, (H - 70) / Math.max(4, rows.length));
    [L, Rr].forEach((pg, k) => {
      const hd = mk("div", "kit-nb-head", pg, `<span>${esc(cols[k] || "")}</span>`);
      for (let i = 0; i < Math.max(4, rows.length); i++) { const ru = mk("div", "kit-nb-rule", pg); ru.style.top = (60 + (i + 1) * RH) + "px"; }
      return hd;
    });
    const hiK = mk("div", "kit-nb-hi", L), hiV = mk("div", "kit-nb-hi", Rr);
    [hiK, hiV].forEach((h, k) => { at(h, 10, 52); h.style.width = (half - 20) + "px"; h.style.height = (H - 64) + "px"; h.style.background = k ? "rgba(255, 217, 168, 0.75)" : "rgba(166, 230, 204, 0.75)"; });
    const acts = [L, Rr].map((pg, k) => {
      const a = mk("div", "kit-nb-hi", pg);
      a.style.background = "rgba(255, 207, 90, 0.75)"; a.style.width = (half - (k ? 12 : 12)) + "px"; a.style.height = (RH - 4) + "px";
      return a;
    });
    const cells = rows.map((r, i) => {
      const y = 60 + i * RH + RH * 0.5 - 20;
      const k = mk("div", "kit-nb-cell" + (/^[#A-Za-z0-9]/.test(r[0]) ? " kit-term" : ""), L, esc(r[0]));
      const v = mk("div", "kit-nb-cell" + (/^[#A-Za-z0-9]/.test(r[1]) ? " kit-term" : ""), Rr, esc(r[1]));
      at(k, 30, y + (/^[#A-Za-z0-9]/.test(r[0]) ? 6 : 0)); at(v, 28, y + (/^[#A-Za-z0-9]/.test(r[1]) ? 6 : 0));
      if (RH < 46) { k.style.fontSize = Math.round(RH * 0.62) + "px"; v.style.fontSize = Math.round(RH * 0.82) + "px"; }
      return { k, v, y };
    });
    const flip = mk("div", "kit-nb-flip", el);
    at(flip, half, 0); flip.style.width = half + "px"; flip.style.height = H + "px";
    const cover = mk("div", "kit-nb-cover", el, o.label ? `<span>${term(o.label)}</span>` : "");
    at(cover, half, 0); cover.style.width = half + "px"; cover.style.height = H + "px";
    const spine = mk("div", "kit-nb-spine", el);
    spine.style.left = half + "px";
    return {
      el, w: W, h: H, half, rowH: RH, cells,
      render(t, st) {
        st = st || {};
        const sc = popScale(t, st.at == null ? -1 : st.at, st.out, 0.32, 0.2);
        if (sc == null) { vis(el, false); return false; }
        vis(el, true);
        el.style.transform = sc !== 1 ? `scale(${sc.toFixed(3)})` : "";
        const op = clamp01(st.open || 0);
        // the cover swings over the spine; the left page unfolds from the spine
        const cu = 1 - 2 * op;
        vis(cover, cu > 0.02);
        cover.style.transform = `scaleX(${Math.max(0.02, cu).toFixed(3)})`;
        cover.style.transformOrigin = "0 50%";
        vis(L, op > 0.5);
        L.style.transformOrigin = "100% 50%";
        L.style.transform = `scaleX(${Math.max(0.02, 2 * op - 1).toFixed(3)})`;
        vis(Rr, op > 0.001);
        vis(spine, op > 0.001);
        const th = st.thick || 0;
        stack.style.top = (H - 4) + "px"; stack.style.height = (th + 4).toFixed(1) + "px";
        vis(stack, th > 0.5);
        stack.style.left = (op > 0.5 ? 0 : half) + "px";
        cells.forEach((c, i) => {
          const p = st.rows ? clamp01(st.rows[i] || 0) : 0;
          [c.k, c.v].forEach((e) => { e.style.visibility = p > 0 ? "inherit" : "hidden"; e.style.clipPath = p < 1 ? `inset(-10px ${((1 - p) * 100).toFixed(1)}% -10px 0)` : "none"; });
        });
        hiK.style.opacity = (st.hiK || 0).toFixed(3); hiV.style.opacity = (st.hiV || 0).toFixed(3);
        vis(hiK, (st.hiK || 0) > 0.01); vis(hiV, (st.hiV || 0) > 0.01);
        const a = st.active;
        acts.forEach((ae, k) => { vis(ae, a != null && a >= 0 && (k ? op > 0.001 : op > 0.5)); if (a != null && a >= 0) at(ae, k ? 0 : 12, 60 + a * RH + 2); });
        const fu = clamp01(st.flip || 0);
        vis(flip, fu > 0.001 && fu < 0.999);
        flip.style.transform = `scaleX(${(1 - 2 * fu).toFixed(3)})`;
        return true;
      },
    };
  }

  /* Kit.display({ label: "叫号", steps: [[t, "#001"], …] }) — the ticket-number screen; the digits flip on each change. */
  function display(o) {
    const el = mk("div", "kit-display");
    if (o.label) mk("div", "kit-display-l", el, esc(o.label));
    const v = mk("div", "kit-display-v", el, "");
    const steps = (o.steps || [[0, o.value || "#000"]]).slice().sort((a, b) => a[0] - b[0]);
    return {
      el,
      render(t) {
        let cur = steps[0][1], ct = -1e9;
        steps.forEach((s) => { if (t >= s[0]) { cur = s[1]; ct = s[0]; } });
        if (v.textContent !== String(cur)) v.textContent = String(cur);
        const q = pr(t, ct, 0.16);
        v.style.transform = q < 1 ? `scaleY(${(0.3 + 0.7 * EZ.o3(q)).toFixed(3)})` : "";
      },
    };
  }

  /* Kit.chalk(text, { size = 52, cls: { "只记": "kit-chalk-y" } }) — Long Cang on a board, written character by character:
   * render(t, t0, t1) spreads the units over [t0, t1], or render(t, times) with one time per unit. */
  function chalk(text, o = {}) {
    const el = mk("div", "kit-chalk");
    el.style.fontSize = (o.size || 52) + "px";
    const us = units(text);
    const spans = us.map((u) => { const s = mk("span", u.latin ? "kit-term" : null, el); s.textContent = u.s; return s; });
    (o.color ? [o.color] : []).forEach((c) => (el.style.color = c));
    (o.spans || []).forEach(([sub, cls]) => {
      const flat = us.map((u) => u.s).join(""), a = flat.indexOf(sub);
      if (a < 0) return;
      let pos = 0;
      us.forEach((u, k) => { if (pos >= a && pos < a + sub.length) spans[k].classList.add(cls); pos += u.s.length; });
    });
    return {
      el, n: spans.length,
      render(t, t0, t1) {
        let any = false;
        spans.forEach((s, k) => {
          const ta = Array.isArray(t0) ? t0[Math.min(k, t0.length - 1)] : t0 + ((t1 - t0) * k) / Math.max(1, spans.length);
          const p = pr(t, ta, 0.12);
          s.style.visibility = p > 0 ? "inherit" : "hidden";
          if (p > 0) { any = true; s.style.opacity = (0.35 + 0.65 * p).toFixed(3); s.style.transform = p < 1 ? `scale(${(1.25 - 0.25 * p).toFixed(3)})` : ""; }
        });
        vis(el, any);
        return any;
      },
    };
  }

  // ---------------- small props (SVG in a .kit-prop div; anchor: bottom centre) ----------------
  function prop(w, h, draw) {
    const el = mk("div", "kit-prop");
    el.style.width = w + "px"; el.style.height = h + "px"; el.style.marginLeft = -w / 2 + "px"; el.style.marginTop = -h + "px";
    const svg = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}` }, el);
    draw(svg, el);
    return { el, svg, w, h };
  }
  const PROPS = {
    cup(o) { return prop(64, 92, (s) => { svgEl("path", { d: "M8,18 l8,72 h32 l8,-72 Z", fill: "#f6e3c8", ...LINE }, s); svgEl("path", { d: "M12,48 l5,38 h30 l5,-38 Z", fill: o.fill || "#d9a76a" }, s); svgEl("rect", { x: 3, y: 8, width: 58, height: 14, rx: 6, fill: "#fff", ...LINE }, s); [24, 34, 42].forEach((x, i) => svgEl("circle", { cx: x, cy: 76 + (i % 2) * 6, r: 5, fill: P.ink }, s)); svgEl("line", { x1: 38, y1: 8, x2: 48, y2: -18, ...LINE, "stroke-width": 6 }, s); }); },
    slip(o) { return prop(o.w || 60, o.h || 80, (s) => { const w = o.w || 60, h = o.h || 80; svgEl("rect", { x: 3, y: 3, width: w - 6, height: h - 6, rx: 6, fill: P.paper, ...LINE }, s); for (let i = 0; i < 3; i++) svgEl("line", { x1: 14, y1: 22 + i * 16, x2: w - 14, y2: 22 + i * 16, stroke: P.ink, "stroke-width": 3, opacity: 0.4 }, s); if (o.tag) svgEl("rect", { x: 12, y: h - 22, width: w - 24, height: 10, rx: 5, fill: o.tag }, s); }); },
    slipPile(o) {
      const n = o.n || 12, w = o.w || 200;
      return prop(w, 40 + n * 13, (s) => {
        for (let i = 0; i < n; i++) {
          const y = 40 + n * 13 - 30 - i * 13, dx = (hsh(i * 3.7 + (o.seed || 0)) - 0.5) * 34, r = (hsh(i * 5.1 + 2) - 0.5) * 10;
          svgEl("rect", { x: 20 + dx, y, width: w - 40, height: 26, rx: 4, fill: P.paper, ...LINE, "stroke-width": 3, transform: `rotate(${r.toFixed(1)} ${w / 2} ${y + 13})` }, s);
          svgEl("rect", { x: w - 70 + dx, y: y + 8, width: 34, height: 10, rx: 5, fill: P.red, transform: `rotate(${r.toFixed(1)} ${w / 2} ${y + 13})` }, s);
        }
      });
    },
    memory(o) {
      const w = o.w || 420;
      return prop(w, 120, (s) => {
        svgEl("rect", { x: 3, y: 20, width: w - 6, height: 80, rx: 10, fill: P.mintD, ...LINE }, s);
        for (let i = 0; i < Math.floor((w - 40) / 70); i++) svgEl("rect", { x: 24 + i * 70, y: 38, width: 50, height: 44, rx: 6, fill: P.dark }, s);
        for (let i = 0; i < Math.floor((w - 20) / 16); i++) svgEl("rect", { x: 14 + i * 16, y: 100, width: 9, height: 16, fill: P.yellow, stroke: P.ink, "stroke-width": 2 }, s);
      });
    },
    tile(o) { return prop(o.w || 96, o.h || 96, (s) => { svgEl("rect", { x: 3, y: 3, width: (o.w || 96) - 6, height: (o.h || 96) - 6, rx: 18, fill: o.fill || "#fff", ...LINE }, s); }); },
  };
  function propOf(kind, o) { const f = PROPS[kind]; if (!f) throw new Error("Kit.prop: unknown kind " + kind); return f(o || {}); }

  /* Kit.termChip({ a: "小本本", b: "KV cache", tone: "accent" | "ok" | "peach" | "warn" | "coral", aw }) — the analogy (left) =
   * the real term (right, Latin in mono). render(t, at, out): slides in from the left and lands with a squash. */
  function termChip(o) {
    const el = mk("div", "kit-chip" + (o.tone && o.tone !== "accent" ? " kit-tone-" + o.tone : ""));
    const a = mk("div", "kit-chip-a", el, esc(o.a));
    if (o.aw) a.style.width = o.aw + "px";
    mk("div", "kit-chip-b", el, `<span>=</span><span>${term(o.b)}</span>`);
    return {
      el,
      render(t, atT, out) {
        if (atT == null || t < atT || (out != null && t >= out + 0.2)) { vis(el, false); return false; }
        vis(el, true);
        const u = pr(t, atT, 0.34), e = EZ.b14(u), q = land(t, atT + 0.3, 0.08), o2 = out == null ? 1 : 1 - EZ.i2(pr(t, out, 0.2));
        el.style.transform = `translateX(${(-90 * (1 - e)).toFixed(1)}px) scale(${(q[0] * o2 * (0.6 + 0.4 * Math.min(1, u * 2))).toFixed(3)},${(q[1] * o2 * (0.6 + 0.4 * Math.min(1, u * 2))).toFixed(3)})`;
        return true;
      },
    };
  }

  // =====================================================================================================
  // THE CONTRACT
  // =====================================================================================================
  /* label({ text, sub, tone, size }) — a pill sticker; `sub` = the real term / unit (mono). render(t, at, out). */
  function label(o) {
    const el = mk("div", "kit-label" + (o.tone && o.tone !== "default" ? " kit-tone-" + o.tone : ""));
    if (o.size) el.style.fontSize = o.size + "px";
    mk("span", "kit-label-t", el, term(o.text || ""));
    if (o.sub) mk("span", "kit-label-sub" + (CJK.test(o.sub) && !/[A-Za-z]/.test(o.sub) ? " kit-cjk" : ""), el, term(o.sub));
    return {
      el,
      render(t, atT, out) {
        const s = popScale(t, atT == null ? o.at : atT, out == null ? o.out : out, 0.3, 0.2);
        if (s == null) { vis(el, false); return false; }
        vis(el, true);
        el.style.transform = `scale(${s.toFixed(3)})`;
        return true;
      },
    };
  }
  /* note(text, { tag = "说明", w }) — a memo card taped to the set wall; [[word]] = on the yellow marker. render(t, at, out). */
  function note(text, o = {}) {
    const el = mk("div", "kit-note");
    if (o.w) el.style.maxWidth = o.w + "px";
    mk("span", "kit-note-tag", el, esc(o.tag || "说明"));
    mk("span", "kit-note-t", el, term(text).replace(/\[\[(.+?)\]\]/g, "<b>$1</b>"));
    return {
      el,
      render(t, atT, out) {
        atT = atT == null ? o.at : atT; out = out == null ? o.out : out;
        if (atT == null || t < atT || (out != null && t >= out + 0.25)) { vis(el, false); return false; }
        vis(el, true);
        const u = EZ.b14(pr(t, atT, 0.4)), g2 = out == null ? 0 : EZ.i2(pr(t, out, 0.25));
        el.style.transform = `translateY(${(-40 * (1 - u) + 60 * g2).toFixed(1)}px) rotate(${(-9 * (1 - u) - 1.5 + 6 * g2).toFixed(2)}deg) scale(${(1 - 0.6 * g2).toFixed(3)})`;
        return true;
      },
    };
  }
  /* number({ value, unit, caption, decimals, tone, prefix }) — a big figure on a card. render(t, u, at): count value × u
   * (u omitted → the value set with .set(v), a number or a string). */
  function number(o) {
    const el = mk("div", "kit-num" + (o.tone ? " kit-tone-" + o.tone : ""));
    const card = mk("div", "kit-num-card", el);
    const v = mk("span", "kit-num-v", card, "");
    if (o.unit) mk("span", "kit-num-u", card, term(o.unit));
    if (o.caption) mk("div", "kit-num-c", el, term(o.caption));
    let val = o.value;
    const fmt = (x) => (typeof x === "number" ? (o.prefix || "") + x.toFixed(o.decimals || 0) : String(x));
    return {
      el,
      set(x) { val = x; },
      render(t, u, atT) {
        const s = popScale(t, atT == null ? (o.at == null ? -1 : o.at) : atT, o.out, 0.3, 0.2);
        if (s == null) { vis(el, false); return false; }
        vis(el, true);
        el.style.transform = `scale(${s.toFixed(3)})`;
        const x = u == null ? val : typeof o.value === "number" ? o.value * clamp01(u) : o.value;
        const txt = fmt(x);
        if (v.textContent !== txt) v.textContent = txt;
        return true;
      },
    };
  }
  /* bars({ rows: [{ label, value, max, tone, valueText }], width = 520 }) — render(t, u, at), u a number or one per row. */
  function bars(o) {
    const el = mk("div", "kit-bars"), W = o.width || 520;
    const max = Math.max(...o.rows.map((r) => r.max || r.value || 1));
    const rows = o.rows.map((r) => {
      const re = mk("div", "kit-bar" + (r.tone ? " kit-tone-" + r.tone : ""), el);
      mk("div", "kit-bar-l", re, term(r.label || ""));
      const tr = mk("div", "kit-bar-tr", re); tr.style.width = W + "px";
      const f = mk("div", "kit-bar-f", tr);
      const v = mk("div", "kit-bar-v", re, term(r.valueText != null ? r.valueText : String(r.value)));
      return { f, v, frac: (r.value || 0) / (r.max || max) };
    });
    return {
      el,
      render(t, u, atT) {
        const s = popScale(t, atT == null ? (o.at == null ? -1 : o.at) : atT, o.out, 0.3, 0.2);
        if (s == null) { vis(el, false); return false; }
        vis(el, true);
        el.style.transform = `scale(${s.toFixed(3)})`;
        rows.forEach((r, i) => {
          const p = clamp01(Array.isArray(u) ? u[i] || 0 : u == null ? 1 : u);
          r.f.style.width = (r.frac * p * 100).toFixed(2) + "%";
          r.f.style.borderRightWidth = p > 0.02 ? "4px" : "0";
          r.v.style.opacity = p > 0.05 ? "1" : "0";
        });
        return true;
      },
    };
  }
  /* formula({ terms: [{ text, sub, t, tone, op }] }) — pill terms and round operators (× = ≈ + ÷ →), each popping at its t. */
  const OPS = new Set(["×", "=", "≈", "+", "÷", "→", "−"]);
  function formula(o) {
    const el = mk("div", "kit-formula");
    const items = o.terms.map((x) => {
      const op = x.op || OPS.has(x.text);
      const e = op ? mk("div", "kit-fo", el, esc(x.text)) : mk("div", "kit-ft" + (x.tone ? " kit-tone-" + x.tone : ""), el, `<span class="kit-ft-v">${term(x.text)}</span>` + (x.sub ? `<span class="kit-ft-s">${term(x.sub)}</span>` : ""));
      return { e, t: x.t };
    });
    return {
      el,
      render(t, out) {
        let any = false;
        items.forEach((x) => {
          const s = popScale(t, x.t, out, 0.3, 0.2);
          if (s == null) { vis(x.e, false); return; }
          any = true; vis(x.e, true); x.e.style.transform = `scale(${s.toFixed(3)})`;
        });
        vis(el, any);
        return any;
      },
    };
  }

  /* title(story, { tag }) — the word-timed closing line in a big caption box with a dark 一句话 tag: every unit pops in as
   * it is spoken, story.end.emphasis on the yellow marker (swept in as spoken). A leading short clause ending in ：
   * (「一句话：」) becomes the tag. Place el yourself (the starter puts it in the caption band). render(t). */
  function title(story, o = {}) {
    const E0 = story.end;
    const el = mk("div", "kit-title");
    if (!E0) return { el, render() { vis(el, false); } };
    const L = story.line(E0.line), words = L.words.slice();
    let tag = o.tag || "一句话", k0 = 0;
    const lead = [];
    for (let k = 0; k < Math.min(words.length, 6); k++) { lead.push(words[k][0]); if (/^[：:]$/.test(words[k][0])) { if (lead.length <= 6) { tag = o.tag || lead.slice(0, -1).join(""); k0 = k + 1; } break; } }
    mk("span", "kit-title-tag", el, esc(tag));
    const tx = mk("span", "kit-title-t", el);
    const flat = words.map((w) => w[0]).join("");
    const emIdx = new Set();
    (E0.emphasis || []).forEach((e) => {
      const a = flat.indexOf(String(e).replace(/\s/g, ""));
      if (a < 0) return;
      let pos = 0;
      words.forEach((w, k) => { if (pos >= a && pos < a + e.replace(/\s/g, "").length) emIdx.add(k); pos += w[0].length; });
    });
    const us = [];
    for (let k = k0; k < words.length; k++) {
      const [u, t0] = words[k], latin = /[A-Za-z0-9]/.test(u), nx = words[k + 1];
      const s = mk("span", "kit-title-u" + (latin ? " kit-term" : "") + (emIdx.has(k) ? " kit-em" : ""), tx);
      s.textContent = latin && nx && /^[A-Za-z0-9]/.test(nx[0]) ? u + " " : u;
      if (latin) s.style.margin = "0 0.12em";
      us.push({ el: s, t: t0 });
    }
    const t0 = L.start - 0.25, t1 = story.recap ? story.recap.start + 0.4 : story.duration + 1;
    return {
      el, tag, units: us,
      render(t) {
        if (t < t0 || t >= t1) { vis(el, false); return false; }
        vis(el, true);
        const u = EZ.b14(pr(t, t0, 0.4));
        el.style.transform = `translateY(${(30 * (1 - u)).toFixed(1)}px) scale(${(0.86 + 0.14 * u).toFixed(3)})`;
        us.forEach((x) => {
          const p = pr(t, x.t - 0.05, 0.22);
          x.el.style.visibility = p > 0 ? "inherit" : "hidden";
          x.el.style.transform = p > 0 && p < 1 ? `scale(${(0.5 + 0.5 * EZ.b20(p)).toFixed(3)})` : "";
          x.el.style.setProperty("--mk", EZ.o2(pr(t, x.t + 0.05, 0.3)).toFixed(3));
        });
        return true;
      },
    };
  }

  /* recap(story, { cast: [characterOpts …], hide: [elements], badge }) — ONE composed frame: a curtain-call set. The coral
   * curtains close over the film at recap.start and open on it: the chalk board in the middle carries recap.center (+ the
   * tagline in chalk), numbered scene cards on both sides tied to the board with dashed strings, and the cast takes a bow in
   * front. A slow linear push-in keeps it alive. render(t). */
  function recap(story, o = {}) {
    const R = story.recap;
    const el = mk("div", "kit-recap");
    if (!R) return { el, render() { vis(el, false); } };
    const push = mk("div", "kit-recap-push", el);
    const svg = svgEl("svg", { width: 1920, height: 1080, viewBox: "0 0 1920 1080" }, push);
    // the set
    svgEl("rect", { x: 0, y: 0, width: 1920, height: 1080, fill: P.wall }, svg);
    for (let x = 150; x < 1800; x += 96) svgEl("rect", { x, y: 0, width: 40, height: 760, fill: P.wall2 }, svg);
    svgEl("rect", { x: 0, y: WAIN, width: 1920, height: FLOOR - WAIN, fill: P.mint }, svg);
    svgEl("rect", { x: 0, y: WAIN - 4, width: 1920, height: 8, fill: P.ink, opacity: 0.85 }, svg);
    svgEl("rect", { x: 0, y: FLOOR, width: 1920, height: 400, fill: P.wood }, svg);
    for (let x = 0; x < 2200; x += 160) svgEl("line", { x1: x, y1: FLOOR, x2: x - 60, y2: 1080, stroke: P.woodLine, "stroke-width": 3 }, svg);
    svgEl("rect", { x: 0, y: FLOOR - 4, width: 1920, height: 8, fill: P.ink, opacity: 0.85 }, svg);
    const links = svgEl("g", { class: "kit-recap-links" }, svg);
    // the board
    const pts = R.points || [];
    const BW = 720, BH = 290, BX = 960 - BW / 2, BY = 100;
    const board = mk("div", "kit-recap-board", push);
    at(board, BX, BY); board.style.width = BW + "px"; board.style.height = BH + "px";
    const cfs = Math.min(76, Math.floor((BW - 90) / Math.max(1, textW(R.center || story.title || "", 1, 0.62))));
    const ce = mk("div", "kit-recap-c", board, term(R.center || story.title || ""));
    ce.style.fontSize = cfs + "px";
    let tl = null;
    if (R.tagline) { tl = mk("div", "kit-recap-tl", board, esc(R.tagline)); tl.style.fontSize = Math.min(64, Math.floor((BW - 100) / Math.max(1, textW(R.tagline, 1, 0.5)))) + "px"; }
    // cards: left column ⌈n/2⌉, right column ⌊n/2⌋
    const nL = Math.ceil(pts.length / 2), nR = pts.length - nL;
    const CW = 440, TONES = [P.yellow, P.mint2, P.peach, P.redSoft, P.lilac, P.blue];
    const cards = pts.map((p, i) => {
      const left = i < nL, j = left ? i : i - nL, m = left ? nL : nR;
      const top = m > 2 ? 130 : 150, bottom = m > 2 ? 1010 : 980, ch = (bottom - top) / Math.max(1, m);
      const x = left ? 116 : 1920 - 116 - CW, y = top + j * ch + (m === 1 ? ch * 0.28 : 0);
      const c = mk("div", "kit-recap-card", push);
      at(c, x, y); c.style.width = CW + "px";
      const hd = mk("div", "kit-recap-h", c);
      mk("span", "kit-recap-n", hd, String(p.n != null ? p.n : i + 1));
      const tt = mk("span", "kit-recap-t", hd, term(p.title || ""));
      tt.style.background = TONES[i % TONES.length];
      mk("div", "kit-recap-x", c, term(p.text || ""));
      const path = svgEl("path", { d: "" }, links);
      const ax = left ? x + CW : x, ay = y + 70, bx = left ? BX + 40 : BX + BW - 40, by = BY + BH - 10;
      path.setAttribute("d", `M${ax},${ay} Q${(ax + bx) / 2},${Math.max(ay, by) + 60} ${bx},${by}`);
      path.setAttribute("pathLength", "1");
      return { el: c, path, i };
    });
    // the cast in front, centre
    const cast = mk("div", "kit-recap-cast", push);
    const actors = (o.cast || [{ seed: 3, hair: "short", shirt: "#fff", apron: P.mintD }, { seed: 5, hair: "bun", glasses: true, shirt: "#ffb46b" }]).map((spec, i, arr) => {
      const n = arr.length, x = 960 + (i - (n - 1) / 2) * Math.min(220, 560 / Math.max(1, n - 1 || 1)), a = character(Object.assign({ s: 0.86, face: "happy" }, spec, { x, y: 1000 }));
      cast.appendChild(a.el);
      return a;
    });
    // badge
    const badge = mk("div", "kit-recap-badge", push, `<i class="kit-chap-tag">小剧场</i><span>${esc(o.badge || "复习 · 一张图记住")}</span>`);
    // curtains (above everything in the recap layer)
    const cur = svgEl("svg", { width: 1920, height: 1080, viewBox: "0 0 1920 1080", class: "kit-curtain" }, el);
    const half = (sideX) => {
      const gg = svgEl("g", {}, cur);
      svgEl("rect", { x: 0, y: -10, width: 990, height: 1100, fill: P.coral, ...LINE, "stroke-width": 5 }, gg);
      for (let x = 60; x < 990; x += 110) svgEl("path", { d: `M${x},-10 Q${x + 24},540 ${x},1090`, fill: "none", stroke: "#d9604a", "stroke-width": 10, "stroke-linecap": "round" }, gg);
      svgEl("rect", { x: 0, y: -10, width: 990, height: 70, fill: "#d9604a", ...LINE, "stroke-width": 5 }, gg);
      return gg;
    };
    const cL = half(), cR = half();
    const tS = R.start, tC = R.start + 0.34, tO = R.start + 0.42, tOpen = R.start + 0.98;
    actors.forEach((a, i) => {
      a.cue(tO + 0.9 + i * 0.12, { arms: ["bow", "bow"], headY: 18, face: "happy", lean: 0 });
      a.cue(tO + 1.6 + i * 0.12, { arms: ["wave", "down"], headY: 0, face: "proud" });
      a.hop(tO + 0.55 + i * 0.1, 26, 0.32);
    });
    const hide = o.hide || [];
    function unhide() { hide.forEach((h) => { const v = h.dataset.kitRecapHid; if (v != null) { h.style.visibility = v === "-" ? "" : v; delete h.dataset.kitRecapHid; } }); }
    return {
      el, actors,
      render(t) {
        if (t < tS - 0.05) { vis(el, false); unhide(); return false; }
        vis(el, true);
        // curtains close (tS → tC), hold, open (tO → tOpen) to the sides where they frame the set
        const close = EZ.io2(pr(t, tS - 0.05, tC - tS + 0.05)), open = EZ.io3(pr(t, tO, tOpen - tO));
        const gapX = 990 * close - 924 * open; // how far each half has moved in from off-screen (66 px stay, framing the set)
        cL.setAttribute("transform", `translate(${(-990 + gapX).toFixed(1)} 0)`);
        cR.setAttribute("transform", `translate(${(1920 - gapX).toFixed(1)} 0)`);
        const shown = t >= tC;
        vis(push, shown);
        // switch the covered film off under the recap (and give back only what this recap switched off)
        if (shown) hide.forEach((h) => { if (h.style.visibility !== "hidden") { h.dataset.kitRecapHid = h.style.visibility || "-"; h.style.visibility = "hidden"; } });
        else unhide();
        if (!shown) return true;
        const u = clamp01((t - tC) / Math.max(0.5, R.end - tC));
        push.style.transform = `scale(${(1 + 0.04 * u).toFixed(4)})`;
        const bs = popScale(t, tO + 0.05, null, 0.36);
        board.style.visibility = bs == null ? "hidden" : "inherit";
        if (bs != null) board.style.transform = `scale(${bs.toFixed(3)})`;
        if (tl) { const p = pr(t, tO + 0.35, 0.5); tl.style.clipPath = `inset(-20px ${((1 - p) * 100).toFixed(1)}% -20px 0)`; }
        cards.forEach((c, i) => {
          const s = popScale(t, tO + 0.3 + i * 0.16, null, 0.32);
          c.el.style.visibility = s == null ? "hidden" : "inherit";
          if (s != null) c.el.style.transform = `scale(${s.toFixed(3)}) rotate(${(i % 2 ? 1 : -1) * 0.8}deg)`;
          const lp = pr(t, tO + 0.45 + i * 0.16, 0.4);
          c.path.style.strokeDasharray = lp >= 1 ? "0.016 0.014" : `${lp.toFixed(4)} 1`;
          c.path.style.visibility = lp > 0 ? "visible" : "hidden";
        });
        actors.forEach((a) => a.render(t));
        const bb = popScale(t, tO + 0.1, null, 0.3);
        badge.style.visibility = bb == null ? "hidden" : "inherit";
        if (bb != null) badge.style.transform = `scale(${bb.toFixed(3)})`;
        return true;
      },
    };
  }

  /* captions(container, story, opts) — core.Captions with the 小剧场 look: a 旁白 tag in each box, Latin units in mono, a small
   * rise on entry. The closing line is left out (Kit.title performs it) unless opts.includeEnd. caps.mark(line, text) puts that
   * span of a line on the yellow marker (it sweeps in unit by unit as it is spoken). */
  function captions(container, story, opts = {}) {
    container.classList.add("kit-caps");
    const caps = new C.Captions(container, story, Object.assign({ skipEnd: !opts.includeEnd, air: 0.16, clamp: true }, opts));
    const lineOf = [];
    const endLine = story.end ? story.end.line : null;
    const ids = (opts.groups || story.lines.filter((L) => opts.includeEnd || L.i !== endLine).map((L) => [L.i, L.i]));
    const TEXT_W = (opts.maxWidth || 1680) - 132 - 40;   // box max width minus the tag gutter and the right padding
    caps.boxes.forEach((b, k) => {
      const tg = document.createElement("i");
      tg.className = "kit-cap-tag";
      tg.textContent = opts.tag || "旁白";
      b.el.insertBefore(tg, b.el.firstChild);
      b.spans.forEach((w) => { if (/^[A-Za-z0-9.%$#–\-]+ ?$/.test(w.s.textContent)) w.s.classList.add("kit-term"); });
      lineOf[k] = ids[k];
      // a long line wraps onto balanced lines: size the box to them (a wrapped max-content box would keep its full width)
      const text = b.spans.map((w) => w.s.textContent).join("");
      const est = textW(text, 40, 0.58) + 8 * (text.match(/[A-Za-z0-9]+/g) || []).length;
      if (est > TEXT_W) {
        const n = Math.ceil(est / TEXT_W);
        b.el.style.width = Math.round(Math.min(TEXT_W, est / n + 90) + 132 + 40) + "px";
      }
    });
    return {
      el: container, captions: caps,
      mark(line, text) {
        const k = lineOf.findIndex((g2) => line >= g2[0] && line <= g2[1]);
        if (k < 0) return false;
        const b = caps.boxes[k], L = story.line(line), want = String(text).replace(/\s/g, "");
        const offset = story.lines.filter((x) => x.i >= lineOf[k][0] && x.i < line).reduce((n, x) => n + x.words.length, 0);
        const us = L.words.map((w) => w[0]);
        for (let s = 0; s < us.length; s++) {
          let acc = "", e = s;
          for (; e < us.length && acc.length < want.length; e++) acc += us[e];
          if (acc === want) { for (let j = s; j < e; j++) b.spans[offset + j].s.classList.add("kit-mark"); return true; }
        }
        return false;
      },
      render(t) {
        caps.render(t);
        caps.boxes.forEach((b, i) => {
          // a box is either there or not (no cross-fades): it is set down with a small rise and cut when its time is up;
          // a new box is set down over the old one
          const nx = caps.boxes[i + 1];
          const on = t >= b.from && t < b.to && !(nx && t >= nx.from);
          b.el.style.visibility = on ? "visible" : "hidden";
          b.el.style.opacity = on ? "1" : "0";
          if (!on) return;
          const e = EZ.o3(pr(t, b.from, 0.3));
          b.el.style.transform = `translateX(-50%) translateY(${(16 * (1 - e)).toFixed(1)}px)`;
        });
      },
    };
  }
  /* chapters(el, story) — core.Chapters with the 小剧场 tag in front of the scene number and title. */
  function chapters(el, story, opts = {}) {
    const ch = new C.Chapters(el, story, Object.assign({ format: (n) => String(n) }, opts));
    const tg = document.createElement("i");
    tg.className = "kit-chap-tag";
    tg.textContent = opts.tag || "小剧场";
    el.insertBefore(tg, el.firstChild);
    // the chip pops in per scene (no slow cross-fade): core sets the text and --in; the kit snaps the opacity
    const coreRender = ch.render.bind(ch);
    ch.render = function (t) {
      coreRender(t);
      const on = parseFloat(el.style.opacity || "0") > 0.02;
      el.style.opacity = on ? "1" : "0";
      el.style.visibility = on ? "visible" : "hidden";
    };
    return ch;
  }

  g.Kit = {
    name: "v12-sitcom",
    // contract
    label, note, number, bars, formula, title, recap,
    // chrome
    captions, chapters,
    // the set + cast + evidence
    backdrop, piece: pieceOf, character, queue, bubble, receipt, notebook, display, chalk, prop: propOf, termChip,
    // helpers
    P, SHIRTS, HAIRS, SKINS, ARM, FACE, WAIN, FLOOR, EZ, ladder, tw, popScale, hopY, land, bump, hsh,
    mk, svgEl, esc, term, textW, units, at, vis, xf, TERM,
  };
})(window);
