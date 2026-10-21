/* V2 signal kit — dark HUD, one acid-lime accent, data pulses, mono read-outs.
 * Load after lib/core.js (window.ExplainerCore) and lib/story.js; defines window.Kit.
 * Every factory returns { el, render(t, ...) }; render is a pure function of t and its explicit arguments.
 * The kit owns an element's opacity / visibility / inner content; the film owns its position (left/top or transform).
 * See KIT.md for the API, the extras and how to use them for a new topic.
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  const { clamp01, pr, E, hash } = C;
  const NS = "http://www.w3.org/2000/svg";
  let SEED = 1;
  const nextSeed = () => (SEED += 7.31);

  // ---------------- DOM helpers ----------------
  function el(tag, cls, parent) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }
  function svgEl(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function put(node, html) {
    if (node._h !== html) {
      node.innerHTML = html;
      node._h = html;
    }
  }
  function vis(node, o) {
    o = clamp01(o);
    const s = o.toFixed(3);
    if (node._o !== s) {
      node.style.opacity = s;
      node.style.visibility = o > 0.001 ? "visible" : "hidden";
      node._o = s;
    }
    return o;
  }
  const tone = (t) => (t && t !== "default" ? " kit-tone-" + t : "");
  const pad = (n, w) => String(n).padStart(w, "0");

  // ---------------- decode: scramble glyphs resolve left → right (pure function of t) ----------------
  const POOL = "#%&*+=<>/\\|01$@?";
  const wide = (c) => c.charCodeAt(0) > 0x2e80;
  function isHot(hot, i) {
    if (!hot) return false;
    if (typeof hot === "function") return hot(i);
    if (typeof hot[0] === "number") return i >= hot[0] && i < hot[1];
    return hot.some((r) => i >= r[0] && i < r[1]);
  }
  function glyph(i, t, seed) {
    const fr = Math.floor(t * 30 + 1e-6);
    return POOL.charAt(Math.floor(hash(i * 7.13 + fr * 1.37 + seed) * POOL.length));
  }
  /** HTML for `text` decoding in from t0 over dur seconds; hot = char range(s) drawn in the accent. */
  function dec(text, t, t0, dur = 0.32, seed = 0, hot = null) {
    text = String(text);
    if (t < t0) return "";
    const n = text.length,
      done = t >= t0 + dur;
    let out = "";
    for (let i = 0; i < n; i++) {
      const c = text.charAt(i);
      if (c === " ") {
        out += " ";
        continue;
      }
      const ri = t0 + dur * (0.3 + 0.7 * (n > 1 ? i / (n - 1) : 1));
      if (done || t >= ri) out += isHot(hot, i) ? '<em class="kit-hot">' + esc(c) + "</em>" : esc(c);
      else out += '<b class="kit-s' + (wide(c) ? " w" : "") + '">' + esc(glyph(i, t, seed)) + "</b>";
    }
    return out;
  }
  /** typewriter: characters appear at cps from t0; optional block cursor */
  function typed(text, t, t0, cps, cursor) {
    if (t < t0) return cursor ? '<i class="kit-cursor"></i>' : "";
    const k = Math.min(text.length, Math.floor((t - t0) * cps) + 1);
    return esc(text.slice(0, k)) + (cursor ? '<i class="kit-cursor"></i>' : "");
  }
  /** a read-out that shows its latest entry, decoding each one in. entries: [[t, text | (t) => text], ...] */
  function ticker(node, entries, dur = 0.3, hot = null) {
    const seed = nextSeed();
    return {
      el: node,
      render(t) {
        let i = -1;
        for (let j = 0; j < entries.length; j++) if (t >= entries[j][0]) i = j;
        if (i < 0) return put(node, "");
        const e = entries[i],
          txt = typeof e[1] === "function" ? e[1](t) : e[1];
        put(node, dec(txt, t, e[0], dur, seed + i * 5.1, hot));
      },
    };
  }
  const fmtTC = (t) => {
    const cs = Math.max(0, Math.floor(t * 100 + 1e-4));
    return "T+00:" + pad(Math.floor(cs / 100), 2) + "." + pad(cs % 100, 2);
  };

  // ---------------- geometry: cubic Bézier wires ----------------
  function bez(p, u) {
    const v = 1 - u;
    return {
      x: v * v * v * p[0].x + 3 * v * v * u * p[1].x + 3 * v * u * u * p[2].x + u * u * u * p[3].x,
      y: v * v * v * p[0].y + 3 * v * v * u * p[1].y + 3 * v * u * u * p[2].y + u * u * u * p[3].y,
    };
  }
  const f1 = (v) => v.toFixed(1);
  const pathD = (p) => `M ${f1(p[0].x)} ${f1(p[0].y)} C ${f1(p[1].x)} ${f1(p[1].y)}, ${f1(p[2].x)} ${f1(p[2].y)}, ${f1(p[3].x)} ${f1(p[3].y)}`;
  function blen(p) {
    let L = 0,
      a = bez(p, 0);
    for (let q = 1; q <= 48; q++) {
      const b = bez(p, q / 48);
      L += Math.hypot(b.x - a.x, b.y - a.y);
      a = b;
    }
    return L;
  }
  /** horizontal-tangent wire from a to b (bend = handle length) */
  function link(a, b, bend) {
    const k = bend == null ? Math.max(40, Math.abs(b.x - a.x) * 0.45) : bend;
    const s = b.x >= a.x ? 1 : -1;
    return [a, { x: a.x + s * k, y: a.y }, { x: b.x - s * k, y: b.y }, b];
  }

  // ---------------- extras: chamfered SVG panel ----------------
  /** draws a chamfered panel (fill + outline) as the first child of host; resize(w, h) redraws it */
  function panel(host, w, h, c = 18, o = {}) {
    const s = svgEl("svg", { class: "kit-panel-svg" });
    const p = svgEl("polygon", { fill: o.fill || "#0f1620", stroke: o.stroke || "#34445a", "stroke-width": o.sw || 2 }, s);
    if (o.dash) p.setAttribute("stroke-dasharray", o.dash);
    host.insertBefore(s, host.firstChild);
    const self = {
      el: s,
      poly: p,
      w: 0,
      h: 0,
      resize(W, H) {
        W = Math.max(2 * c + 2, Math.round(W));
        H = Math.max(2 * c + 2, Math.round(H));
        if (W === self.w && H === self.h) return self;
        self.w = W;
        self.h = H;
        s.setAttribute("width", W);
        s.setAttribute("height", H);
        s.setAttribute("viewBox", `0 0 ${W} ${H}`);
        p.setAttribute("points", `${c},1 ${W - 1},1 ${W - 1},${H - c} ${W - c},${H - 1} 1,${H - 1} 1,${c}`);
        return self;
      },
    };
    return self.resize(w, h);
  }

  // ---------------- contract: label ----------------
  function label(o) {
    const root = el("div", "kit-label" + tone(o.tone));
    const a = el("span", "kit-label-t", root);
    const s = o.sub != null ? el("span", "kit-label-sub", root) : null;
    const self = {
      el: root,
      text: o.text,
      sub: o.sub,
      at: o.at,
      until: o.until,
      dur: o.dur || 0.3,
      hot: o.hot || null,
      seed: nextSeed(),
      set(text, sub) {
        self.text = text;
        if (sub != null) self.sub = sub;
        return self;
      },
      /** decode in at `at` (omit = already shown), fade out before `until`; returns the opacity */
      render(t, at = self.at, until = self.until) {
        const t0 = at == null ? -1e9 : at;
        const op = (t < t0 ? 0 : 1) * (until == null ? 1 : 1 - pr(t, until - 0.18, 0.18));
        vis(root, op);
        if (op <= 0) return 0;
        put(a, dec(self.text, t, t0, self.dur, self.seed, self.hot));
        if (s) put(s, dec(self.sub, t, t0 + 0.05, self.dur, self.seed + 3.3));
        root.style.setProperty("--on", E.o2(pr(t, t0, 0.28)).toFixed(3));
        return op;
      },
    };
    return self;
  }

  // ---------------- contract: note ----------------
  function note(text, o = {}) {
    const root = el("div", "kit-note");
    const tag = el("b", "kit-note-tag", root);
    tag.textContent = o.tag || "说明";
    const x = el("span", "kit-note-x", root);
    const self = {
      el: root,
      text,
      at: o.at,
      until: o.until,
      hot: o.hot || null,
      seed: nextSeed(),
      render(t, at = self.at, until = self.until) {
        const t0 = at == null ? -1e9 : at;
        const op = (t < t0 ? 0 : 1) * (until == null ? 1 : 1 - pr(t, until - 0.22, 0.22));
        vis(root, op);
        root.style.display = op > 0 ? "" : "none";
        if (op <= 0) return 0;
        const u = E.o3(pr(t, t0, 0.3));
        root.style.clipPath = u < 1 ? `inset(-4px ${((1 - u) * 100).toFixed(2)}% -4px 0)` : "none";
        put(x, dec(self.text, t, t0 + 0.08, 0.42, self.seed, self.hot));
        return op;
      },
    };
    return self;
  }

  // ---------------- contract: number ----------------
  function number(o) {
    const root = el("div", "kit-num" + tone(o.tone));
    if (o.caption) el("div", "kit-num-c", root).textContent = o.caption;
    const row = el("div", "kit-num-row", root);
    const v = el("span", "kit-num-v", row);
    const u = o.unit ? el("span", "kit-num-u", row) : null;
    if (u) u.textContent = o.unit;
    const dp = o.decimals || 0;
    const fmt = o.format || ((x) => x.toFixed(dp));
    const self = {
      el: root,
      value: o.value,
      fixed: null,
      set(val) {
        self.fixed = val;
        return self;
      },
      /** u: count-up progress 0..1 (eased inside); op: opacity (default 1) */
      render(t, uu = 1, op = 1) {
        if (vis(root, op) <= 0) return;
        const val = self.fixed != null ? self.fixed : self.value * E.o2(clamp01(uu));
        put(v, esc(fmt(val)));
      },
    };
    return self;
  }

  // ---------------- contract: bars ----------------
  function bars(o) {
    const root = el("div", "kit-bars");
    root.style.width = (o.width || 820) + "px";
    const rows = o.rows.map((r) => {
      const b = el("div", "kit-bar" + tone(r.tone), root);
      const h = el("div", "kit-bar-h", b);
      el("span", "kit-bar-l", h).textContent = r.label;
      const v = el("span", "kit-bar-v", h);
      const tr = el("div", "kit-bar-track", b);
      const f = el("div", "kit-bar-fill", tr);
      return { r, b, v, f };
    });
    return {
      el: root,
      rows,
      /** u: grow progress 0..1, or one per row (a negative entry hides that row); op: opacity */
      render(t, u = 1, op = 1) {
        if (vis(root, op) <= 0) return;
        rows.forEach((x, i) => {
          const ui = Array.isArray(u) ? u[i] : u;
          x.b.style.visibility = ui < 0 ? "hidden" : "visible";
          if (ui < 0) return;
          const p = E.o2(clamp01(ui));
          const frac = (x.r.value / (x.r.max || x.r.value || 1)) * p;
          x.f.style.transform = `scaleX(${frac.toFixed(4)})`;
          const vt =
            typeof x.r.valueText === "function" ? x.r.valueText(p) : x.r.valueText != null ? (p > 0 ? x.r.valueText : "") : String(Math.round(x.r.value * p));
          put(x.v, esc(vt));
        });
      },
    };
  }

  // ---------------- contract: formula ----------------
  function formula(o) {
    const root = el("div", "kit-formula");
    const terms = o.terms.map((tm) => {
      const isOp = tm.op != null ? tm.op : /^[×=≈+÷→·]$/.test(tm.text);
      const d = el("div", "kit-f-term" + (isOp ? " kit-f-op" : "") + tone(tm.tone), root);
      const v = el("div", "kit-f-v", d);
      const s = tm.sub != null ? el("div", "kit-f-s", d) : null;
      d.style.visibility = "hidden";
      return { tm, d, v, s, seed: nextSeed() };
    });
    return {
      el: root,
      terms,
      /** each term decodes in at its own t (layout reserved, so nothing jumps); fade out before `until` */
      render(t, until) {
        const op = until == null ? 1 : 1 - pr(t, until - 0.2, 0.2);
        root.style.opacity = op.toFixed(3);
        terms.forEach((x) => {
          const on = t >= x.tm.t && op > 0;
          x.d.style.visibility = on ? "visible" : "hidden";
          if (!on) return;
          put(x.v, dec(x.tm.text, t, x.tm.t, 0.24, x.seed));
          if (x.s) put(x.s, dec(x.tm.sub, t, x.tm.t + 0.06, 0.3, x.seed + 2));
          const u = E.o3(pr(t, x.tm.t, 0.22));
          x.d.style.transform = u < 1 ? `translateY(${((1 - u) * 16).toFixed(1)}px)` : "none";
        });
      },
    };
  }

  // ---------------- contract: title (the word-timed closing line) ----------------
  function title(story, o = {}) {
    const end = story.data.end || {};
    const L = story.line(end.line || story.lines.length);
    const brk = o.breakAfter || ["，"];
    const emph = end.emphasis || [];
    const root = el("div", "kit-title");
    const lines = [[]];
    L.words.forEach(([u, t], k, arr) => {
      const next = arr[k + 1];
      const latin = /[A-Za-z\d]$/.test(u) && next && /^[A-Za-z\d]/.test(next[0]);
      lines[lines.length - 1].push({ u: latin ? u + " " : u, t });
      if (brk.includes(u) && k < arr.length - 1) lines.push([]);
    });
    const LN = lines.map((units) => {
      const chars = [];
      units.forEach((w) => {
        for (const c of w.u) chars.push({ c, t: w.t });
      });
      const text = chars.map((c) => c.c).join("");
      const hot = chars.map(() => false);
      emph.forEach((e) => {
        let i = text.indexOf(e);
        while (i >= 0) {
          for (let j = i; j < i + e.length; j++) hot[j] = true;
          i = text.indexOf(e, i + 1);
        }
      });
      return { chars, hot, node: el("span", "kit-title-line", root) };
    });
    const seed = nextSeed();
    const first = LN[0].chars[0].t;
    return {
      el: root,
      start: first,
      end: L.end,
      /** each unit decodes in exactly when it is spoken; emphasis words (story.end.emphasis) in the accent */
      render(t, until) {
        const op = (t >= first - 0.1 ? 1 : 0) * (until == null ? 1 : 1 - pr(t, until - 0.25, 0.25));
        if (vis(root, op) <= 0) return;
        LN.forEach((ln, li) => {
          let html = "";
          ln.chars.forEach((ch, i) => {
            if (ch.c === " ") return void (html += " ");
            if (t < ch.t - 0.1) html += '<span class="kit-ghost">' + esc(ch.c) + "</span>";
            else if (t < ch.t + 0.12) html += '<b class="kit-s' + (wide(ch.c) ? " w" : "") + '">' + esc(glyph(i + li * 31, t, seed)) + "</b>";
            else html += ln.hot[i] ? '<em class="kit-hot">' + esc(ch.c) + "</em>" : esc(ch.c);
          });
          put(ln.node, html);
        });
      },
    };
  }

  // ---------------- contract: recap (one composed frame: a node map) ----------------
  function recap(story, o = {}) {
    const R = story.recap;
    const s0 = R.start,
      s1 = R.end;
    const root = el("div", "kit-recap");
    const svg = svgEl("svg", { class: "kit-rc-wires", viewBox: "0 0 1920 1080" }, root);
    const CX = o.cx || 960,
      CY = o.cy || 520,
      CW = o.cw || 620,
      CH = o.ch || 264,
      GAP = 26;
    const center = el("div", "kit-rc-center", root);
    center.style.left = CX - CW / 2 + "px";
    center.style.width = CW + "px";
    center.style.top = CY - CH / 2 + "px";
    center.style.height = CH + "px";
    panel(center, CW, CH, 24, { stroke: "#c8ff3e", sw: 3, fill: "#0f1620" });
    const ck = el("div", "kit-rc-k", center);
    const ct = el("div", "kit-rc-title", center);
    const len = R.center.length;
    ct.style.fontSize = (len <= 10 ? 104 : len <= 16 ? 76 : 60) + "px";
    const cg = el("div", "kit-rc-tag", center);
    const n = R.points.length,
      nl = Math.ceil(n / 2);
    const cols = [el("div", "kit-rc-col", root), el("div", "kit-rc-col", root)];
    const CWID = o.cardWidth || 500,
      MX = 80;
    cols[0].style.left = MX + "px";
    cols[1].style.right = MX + "px";
    // card height from its text (estimated, deterministic): no empty card, no DOM measurement
    const ems = (str) => {
      let w = 0;
      for (const ch of str) w += wide(ch) ? 1 : ch === " " ? 0.26 : 0.56;
      return w;
    };
    const cardH = (p) => Math.round(42 + 54 + Math.max(1, Math.ceil((ems(p.text) * 29 * 1.02) / (CWID - 52))) * 41.2);
    cols.forEach((c) => (c.style.width = CWID + "px"));
    const cards = R.points.map((p, i) => {
      const side = i < nl ? 0 : 1;
      const card = el("div", "kit-rc-card", cols[side]);
      const KH = cardH(p);
      card.style.height = KH + "px";
      panel(card, CWID, KH, 18, { stroke: "#4a5d73" });
      const hd = el("div", "kit-rc-hd", card);
      const nn = el("b", "kit-rc-n", hd);
      const hh = el("span", "kit-rc-h", hd);
      const x = el("div", "kit-rc-x", card);
      const w0 = svgEl("path", { class: "w0" }, svg);
      const w1 = svgEl("path", { class: "w1" }, svg);
      const dots = [0, 1, 2].map((j) => svgEl("circle", { r: 7 - j * 2, cx: 0, cy: 0 }, svg));
      const j = side === 0 ? i : i - nl,
        m = side === 0 ? nl : n - nl;
      return { p, side, card, nn, hh, x, w0, w1, dots, seed: nextSeed(), j, m, KH };
    });
    [0, 1].forEach((side) => {
      const cs = cards.filter((c) => c.side === side);
      let y = (1080 - cs.reduce((a, c) => a + c.KH, 0) - (cs.length - 1) * GAP) / 2;
      cs.forEach((c) => {
        c.top = y;
        y += c.KH + GAP;
      });
    });
    const seed = nextSeed();
    return {
      el: root,
      start: s0,
      end: s1,
      render(t) {
        if (vis(root, t >= s0 ? 1 : 0) <= 0) return;
        // slow push (the only idle-time motion besides the data pulses on the wires)
        root.style.transform = `scale(${(1 + 0.016 * E.io2(pr(t, s0, s1 - s0))).toFixed(4)})`;
        // center node powers on, then decodes
        const cu = E.o3(pr(t, s0, 0.24));
        center.style.transform = `scaleY(${Math.max(0.04, cu).toFixed(3)})`;
        put(ck, dec("RECAP // 一图回顾", t, s0 + 0.05, 0.3, seed));
        put(ct, dec(R.center, t, s0 + 0.1, 0.45, seed + 1));
        put(cg, dec(R.tagline || "", t, s0 + 0.3, 0.42, seed + 2));
        cards.forEach((c, i) => {
          const a = s0 + 0.32 + i * 0.2;
          const top = c.top,
            hgt = c.KH;
          const cu2 = E.o3(pr(t, a + 0.16, 0.2));
          c.card.style.opacity = cu2 > 0 ? "1" : "0";
          c.card.style.visibility = cu2 > 0 ? "visible" : "hidden";
          c.card.style.transform = `scaleY(${Math.max(0.04, cu2).toFixed(3)})`;
          put(c.nn, dec(pad(c.p.n, 2), t, a + 0.18, 0.2, c.seed));
          put(c.hh, dec(c.p.title, t, a + 0.2, 0.3, c.seed + 1));
          put(c.x, dec(c.p.text, t, a + 0.26, 0.42, c.seed + 2));
          // wire from the center node's edge to the card
          const ex = c.side === 0 ? CX - CW / 2 : CX + CW / 2;
          const ey = CY + (c.j - (c.m - 1) / 2) * Math.min(64, (CH - 60) / Math.max(1, c.m));
          const cx = c.side === 0 ? MX + CWID : 1920 - MX - CWID;
          const pts = link({ x: ex, y: ey }, { x: cx, y: top + hgt / 2 });
          const d = pathD(pts),
            L = blen(pts) + 4;
          c.w0.setAttribute("d", d);
          c.w1.setAttribute("d", d);
          const du = E.io2(pr(t, a, 0.26));
          c.w0.style.strokeDasharray = `${L.toFixed(1)} ${L.toFixed(1)}`;
          c.w0.style.strokeDashoffset = ((1 - du) * L).toFixed(1);
          c.w1.style.opacity = du >= 1 ? "1" : "0";
          c.w1.style.strokeDashoffset = (-(t - a) * 46).toFixed(1);
          // data pulses travel center → card once the card is open
          const live = t >= a + 0.4;
          const ph = live ? ((t - a - 0.4) * 0.55 + i * 0.29) % 1 : 0;
          c.dots.forEach((dot, j) => {
            const q = ph - j * 0.03;
            if (!live || q <= 0) return void (dot.style.opacity = "0");
            const pt = bez(pts, q);
            dot.setAttribute("cx", f1(pt.x));
            dot.setAttribute("cy", f1(pt.y));
            dot.style.opacity = (Math.min(1, Math.sin(q * Math.PI) * 1.8) * (1 - j * 0.3)).toFixed(3);
          });
        });
      },
    };
  }

  // ---------------- extras ----------------
  /** four-corner tracking brackets that lock onto a target: scale 2.6 → 1 at `at` */
  function tracker(o = {}) {
    const root = el("span", "kit-trk" + tone(o.tone) + (o.big ? " big" : ""));
    for (let k = 0; k < 4; k++) el("i", null, root);
    if (o.w) root.style.width = o.w + "px";
    if (o.h) root.style.height = o.h + "px";
    return {
      el: root,
      render(t, at, until, from = 2.6) {
        const op = (t >= at ? 1 : 0) * (until == null ? 1 : 1 - pr(t, until - 0.12, 0.12));
        if (vis(root, op) <= 0) return 0;
        const u = E.o3(pr(t, at, 0.3));
        root.style.transform = `scale(${(from + (1 - from) * u).toFixed(3)})`;
        return op;
      },
    };
  }
  /** a badge that slams down (scale 1.9 → 1, rotate −14° → −5°) */
  function stamp(o = {}) {
    const root = el("div", "kit-stamp" + tone(o.tone));
    const b = el("b", null, root);
    b.textContent = o.text || "";
    let s = null;
    if (o.sub) {
      s = el("span", null, root);
      s.textContent = o.sub;
    }
    return {
      el: root,
      render(t, at, until) {
        const op = (t >= at ? 1 : 0) * (until == null ? 1 : 1 - pr(t, until - 0.14, 0.14));
        if (vis(root, op) <= 0) return 0;
        const u = E.i2(pr(t, at, 0.18));
        root.style.transform = `scale(${(1.9 - 0.9 * u).toFixed(3)}) rotate(${(-14 + 9 * u).toFixed(2)}deg)`;
        return op;
      },
    };
  }
  /** a data wire inside an <svg>: base line + flowing dashes + packets with decaying trails */
  function wire(svg, o = {}) {
    const g0 = svgEl("g", {}, svg);
    const base = svgEl("path", { fill: "none", stroke: o.base || "#34445a", "stroke-width": o.width || 3 }, g0);
    const flow = svgEl("path", { fill: "none", stroke: o.color || "#c8ff3e", "stroke-width": o.width || 3, "stroke-dasharray": o.dash || "12 16" }, g0);
    const n = o.packets == null ? 3 : o.packets;
    const pk = [];
    for (let p = 0; p < n; p++) {
      const grp = [];
      for (let j = 0; j < 3; j++) grp.push(svgEl("circle", { r: (o.r || 8) - j * 2, cx: 0, cy: 0, fill: o.color || "#c8ff3e" }, g0));
      pk.push(grp);
    }
    return {
      el: g0,
      /** pts: 4 Bézier points; s: { draw 0..1, live bool, t0 flow start, speed px/s, rate packets/s, dir ±1, op } */
      render(t, pts, s = {}) {
        const op = s.op == null ? 1 : s.op;
        g0.style.opacity = op.toFixed(3);
        if (op <= 0) return;
        const d = pathD(pts),
          L = blen(pts) + 4;
        base.setAttribute("d", d);
        flow.setAttribute("d", d);
        const dr = s.draw == null ? 1 : clamp01(s.draw);
        base.style.strokeDasharray = `${L.toFixed(1)} ${L.toFixed(1)}`;
        base.style.strokeDashoffset = ((1 - dr) * L).toFixed(1);
        flow.style.opacity = dr >= 1 && s.live !== false ? "1" : "0";
        const dir = s.dir || 1;
        flow.style.strokeDashoffset = (-(t - (s.t0 || 0)) * (s.speed || 70) * dir).toFixed(1);
        const live = s.live && dr >= 1;
        pk.forEach((grp, p) => {
          let ph = live ? ((t - (s.t0 || 0)) * (s.rate || 0.8) + p / n) % 1 : 0;
          if (dir < 0) ph = 1 - ph;
          grp.forEach((dot, j) => {
            const q = ph - j * 0.028 * dir;
            if (!live || q <= 0 || q >= 1) return void (dot.style.opacity = "0");
            const pt = bez(pts, q);
            dot.setAttribute("cx", f1(pt.x));
            dot.setAttribute("cy", f1(pt.y));
            dot.style.opacity = (Math.min(1, Math.sin(q * Math.PI) * 1.8) * (1 - j * 0.3)).toFixed(3);
          });
        });
      },
    };
  }
  /** HUD texture: corner brackets, timecode, one progress segment per chapter (all ≤ 20 px: texture only) */
  function hud(story, o = {}) {
    const root = el("div", "kit-hud");
    [
      ["left", "top"],
      ["right", "top"],
      ["left", "bottom"],
      ["right", "bottom"],
    ].forEach(([x, y]) => {
      const c = el("i", "kit-hud-c", root);
      c.style[x] = "40px";
      c.style[y] = "40px";
      c.style["border-" + x + "-width"] = "2px";
      c.style["border-" + y + "-width"] = "2px";
    });
    const r = el("div", "kit-hud-r", root);
    const tc = el("div", "kit-hud-tc", r);
    const segs = el("div", "kit-hud-segs", r);
    const chs = story.chapters;
    const span = chs.length ? chs[chs.length - 1].end : story.duration;
    const fills = chs.map((c) => {
      const d = el("div", null, segs);
      d.style.width = (((c.end - c.start) / span) * (220 - 6 * (chs.length - 1))).toFixed(1) + "px";
      return el("i", null, d);
    });
    return {
      el: root,
      render(t) {
        put(tc, fmtTC(t));
        fills.forEach((f, i) => {
          const c = chs[i];
          f.style.width = (clamp01((t - c.start) / (c.end - c.start)) * 100).toFixed(2) + "%";
          f.style.background = t >= c.start && t < c.end ? "#c8ff3e" : "#7d8fa3";
        });
      },
    };
  }
  /** chromatic glitch cut (2–4 frames of RGB split + slice displacement + a scan line) at each seam time */
  function glitch(host, seams, o = {}) {
    const target = o.target || host;
    const fx = svgEl("svg", { width: 0, height: 0, style: "position:absolute;left:0;top:0" }, host);
    const f = svgEl(
      "filter",
      { id: "kit-gl", x: 0, y: 0, width: 1920, height: 1080, filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" },
      fx
    );
    svgEl("feFlood", { x: 0, y: 0, width: 1920, height: 1080, "flood-color": "rgb(128,128,128)", result: "m0" }, f);
    const GB = [0, 1, 2, 3, 4, 5].map((j) => svgEl("feFlood", { x: 0, y: 0, width: 1920, height: 10, "flood-color": "rgb(128,128,128)", result: "m" + (j + 1) }, f));
    const mg = svgEl("feMerge", { result: "map" }, f);
    for (let j = 0; j <= 6; j++) svgEl("feMergeNode", { in: "m" + j }, mg);
    svgEl("feDisplacementMap", { in: "SourceGraphic", in2: "map", scale: 200, xChannelSelector: "R", yChannelSelector: "G", result: "d" }, f);
    svgEl("feColorMatrix", { in: "d", type: "matrix", values: "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", result: "r" }, f);
    const GRO = svgEl("feOffset", { in: "r", dx: 10, dy: 0, result: "r2" }, f);
    svgEl("feColorMatrix", { in: "d", type: "matrix", values: "0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0", result: "gb" }, f);
    const GBO = svgEl("feOffset", { in: "gb", dx: -10, dy: 0, result: "gb2" }, f);
    svgEl("feBlend", { in: "r2", in2: "gb2", mode: "screen" }, f);
    const line = el("div", "kit-gline", host);
    return {
      el: line,
      seams,
      render(t) {
        let on = -1;
        for (let i = 0; i < seams.length; i++) if (t >= seams[i] - 0.034 && t < seams[i] + 0.09) on = i;
        if (on < 0) {
          if (target._g !== 0) {
            target.style.filter = "none";
            target._g = 0;
          }
          line.style.opacity = "0";
          return;
        }
        const fr = Math.floor(t * 30 + 1e-6),
          s = fr * 3.7 + on * 91;
        const amp = 1 - 0.45 * clamp01((t - seams[on] + 0.034) / 0.124);
        GB.forEach((b, j) => {
          const y = Math.floor(hash(s + j * 1.9) * 1030),
            hh = 8 + Math.floor(hash(s + j * 2.7 + 5) * 84);
          const dir = hash(s + j * 4.1 + 9) > 0.5 ? 1 : -1;
          b.setAttribute("y", y);
          b.setAttribute("height", hh);
          b.setAttribute("flood-color", `rgb(${Math.round(128 + dir * (26 + hash(s + j * 3.3 + 2) * 72) * amp)},128,128)`);
        });
        const d = (8 + hash(s + 11) * 10) * amp;
        GRO.setAttribute("dx", d.toFixed(1));
        GBO.setAttribute("dx", (-d).toFixed(1));
        target.style.filter = "url(#kit-gl)";
        target._g = 1;
        line.style.opacity = "1";
        line.style.top = Math.floor(60 + hash(s + 17) * 960) + "px";
      },
    };
  }
  /** dot-field backdrop + vignette; render(cam) moves the dots at half the camera's travel (parallax only) */
  function backdrop(host) {
    const dots = el("div", "kit-dots", host);
    dots.setAttribute("data-layout-allow-overflow", "");
    el("div", "kit-vig", host);
    return {
      el: dots,
      render(c) {
        const cx = 960 * c.s + c.tx - 960,
          cy = 540 * c.s + c.ty - 540,
          ds = 1 + (c.s - 1) * 0.5;
        // the field repeats every 40 px, so long camera travels wrap instead of running off the field
        const per = 40 * ds,
          wrap = (v) => v - per * Math.round(v / per);
        dots.style.transform = `translate(${wrap(cx * 0.5).toFixed(2)}px,${wrap(cy * 0.5).toFixed(2)}px) scale(${ds.toFixed(4)})`;
      },
    };
  }
  /** mark Latin / number units in core captions so they set in mono with a little air around them */
  function dressCaptions(caps) {
    caps.boxes.forEach((b) =>
      b.spans.forEach(({ s }) => {
        if (/^[A-Za-z\d.%+\-/]+\s?$/.test(s.textContent)) {
          s.textContent = s.textContent.trim();
          s.classList.add("kit-cap-lat");
        }
      })
    );
    return caps;
  }

  g.Kit = {
    name: "v2-signal",
    // contract
    label,
    note,
    number,
    bars,
    formula,
    title,
    recap,
    // extras
    dec,
    typed,
    ticker,
    put,
    vis,
    esc,
    pad,
    fmtTC,
    panel,
    tracker,
    stamp,
    wire,
    hud,
    glitch,
    backdrop,
    dressCaptions,
    bez,
    pathD,
    blen,
    link,
  };
})(window);
