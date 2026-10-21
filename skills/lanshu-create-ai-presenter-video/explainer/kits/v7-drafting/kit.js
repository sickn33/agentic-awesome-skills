/* V7 · 图纸与注脚 (drafting) — window.Kit.
 *
 * Load after lib/core.js and lib/story.js. Every factory returns { el, render(t, ...) } and render is a pure function
 * of t and its explicit arguments: no state carried between frames, so any frame can be seeked.
 *
 * Contract:   label · note · number · bars · formula · title · recap
 * Extras:     ghost (the karaoke headline = this style's caption) · footnote · stamp · leader · sparks · camera ·
 *             dim (dimension line) · revcloud (redline revision cloud) · titleBlock · frame · util
 * See KIT.md for the look, the rules and how a new topic uses it.
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v7-drafting: load lib/core.js before lib/kit/kit.js");
  const { clamp01, pr, lerp, E, hash, track } = C;
  const NS = "http://www.w3.org/2000/svg";
  const T = {
    bg: "#0b0b0c", ink: "#edebe6", muted: "#a6a39d", line: "rgba(237,235,230,0.32)", ghost: "rgba(237,235,230,0.06)",
    accent: "#ffd21e", accent2: "#7fc8f8", warn: "#ff5b3a", ok: "#7be0a0", paper: "#ece9e1", paperInk: "#141311",
  };
  const E4 = (u) => 1 - Math.pow(1 - u, 4);
  const pulse = (t, a, d) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));
  const glow = (a) => `0 0 ${(14 + 20 * a).toFixed(1)}px rgba(255,190,0,${(0.35 + 0.35 * a).toFixed(3)})`;

  // ---------------- tiny DOM helpers ----------------
  function el(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function op(e, v) {
    const s = (+v).toFixed(3);
    if (e._op !== s) { e.style.opacity = s; e._op = s; }
  }
  function show(e, v) {
    op(e, v);
    const w = v > 0 ? "visible" : "hidden";
    if (e._vis !== w) { e.style.visibility = w; e._vis = w; }
  }
  function draw(path, len, u) {
    path.style.strokeDasharray = `${len} ${len}`;
    path.style.strokeDashoffset = (len * (1 - clamp01(u))).toFixed(1);
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  // typewriter with a block caret: text appears at cps chars/s from a; caret blinks off at caretUntil
  function typed(e, text, t, a, cps = 32, caretUntil) {
    const chars = Array.from(text);
    const n = Math.max(0, Math.min(chars.length, Math.floor((t - a) * cps)));
    const end = caretUntil == null ? a + chars.length / cps + 0.35 : caretUntil;
    const html = t < a ? "" : esc(chars.slice(0, n).join("")) + (t < end ? '<span class="kit-caret"></span>' : "");
    if (e._h !== html) { e.innerHTML = html; e._h = html; }
  }
  function setText(e, s) { if (e._t !== s) { e.textContent = s; e._t = s; } }
  function fmt(v, decimals = 0, group = true) {
    const s = Math.abs(v).toFixed(decimals);
    const [i, f] = s.split(".");
    const ig = group ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : i;
    return (v < 0 ? "−" : "") + ig + (f ? "." + f : "");
  }

  // ---------------- story units → ghost glyphs ----------------
  const LAT = /^[A-Za-z0-9.%+×\/–\-]+$/;
  const PUNCT = /^[，。、：；！？,.;:!?）)」』”"']$/;
  const DASH = /^[–\-]$/;
  function findRange(W, text, start = 0) {
    const target = String(text).replace(/\s/g, "");
    for (let s = start; s < W.length; s++) {
      let acc = "";
      for (let e = s; e < W.length && acc.length < target.length; e++) {
        acc += W[e][0];
        if (acc === target) return [s, e];
      }
    }
    return null;
  }
  // a run of units of one narration line, as ghost glyphs; returns [{s, at, k}]
  function ghostGlyphs(host, story, line, a, b, opts = {}) {
    const L = story.line(line), W = L.words;
    const mark = {};
    for (const [key, list] of [["a", opts.accent], ["w", opts.warn]]) {
      (list || []).forEach((p) => {
        const r = findRange(W, p, a);
        if (r && r[0] <= b) for (let k = r[0]; k <= Math.min(r[1], b); k++) mark[k] = key;
      });
    }
    // explicit marks by unit index ({ k: "a" | "w" }) — lets a caller paint a phrase that a row break has split
    if (opts.marks) for (const k in opts.marks) if (+k >= a && +k <= b) mark[k] = opts.marks[k];
    const out = [];
    for (let k = a; k <= b; k++) {
      const [u, tu] = W[k];
      const next = k + 1 < W.length ? W[k + 1][1] : L.end;
      const prev = k > a ? W[k - 1][0] : null;
      const lat = LAT.test(u);
      if (prev && !PUNCT.test(u) && !PUNCT.test(prev) && !DASH.test(u) && !DASH.test(prev) && (lat || LAT.test(prev))) {
        host.appendChild(document.createTextNode(" "));
      }
      const cs = Array.from(u);
      const span = Math.min(Math.max(next - tu, 0.05), 0.07 * cs.length + 0.05);
      cs.forEach((ch, j) => {
        const s = el("span", "kit-gk" + (lat ? " lat" : "") + (mark[k] ? " " + mark[k] : ""), host, ch);
        s.setAttribute("data-layout-allow-overlap", ""); // tight display type: glyph boxes touch by design
        out.push({ s, at: tu + (span * j) / cs.length, k, u });
      });
    }
    return out;
  }
  function renderGlyphs(glyphs, t, punch) {
    for (const c of glyphs) {
      const f = E.o2(pr(t, c.at - 0.03, 0.16));
      const fs = f.toFixed(3);
      if (c._f !== fs) { c.s.style.setProperty("--lit", fs); c._f = fs; }
      let tr = f < 1 ? `translateY(${((1 - f) * 0.06).toFixed(3)}em)` : "";
      if (punch && punch[c.k]) {
        const P = punch[c.k], k = 1 + P.amp * pulse(t, P.at, P.dur);
        if (k > 1.0005) tr = `scale(${k.toFixed(3)})`;
      }
      if (c._tr !== tr) { c.s.style.transform = tr; c.s.style.transformOrigin = "50% 70%"; c._tr = tr; }
    }
  }

  /* ghost({ story, line, from, upto, range, accent, warn, marks, punch, size, lead })
   *   One headline row: units of `line` from the first unit of phrase `from` (default: line start) up to the last
   *   unit of phrase `upto` (default: line end). Unsung glyphs wait at 17 % ink; each one fills when it is spoken.
   *   range: [a, b] unit indices (inclusive) instead of from / upto (used by the starter's automatic row breaks).
   *   accent / warn: phrases painted in the accent / redline; marks: { unitIndex: "a" | "w" } paints by index.
   *   punch: [{ phrase, amp, dur }] scale-pulse on a word.
   *   The film positions .el (left/top) and sets the size; render(t) does the rest. */
  function ghost(o) {
    const { story, line } = o;
    const W = story.line(line).words;
    let a = o.from ? (findRange(W, o.from) || [0])[0] : 0;
    const r = o.upto ? findRange(W, o.upto, a) : null;
    let b = r ? r[1] : W.length - 1;
    if (o.range) { a = Math.max(0, o.range[0]); b = Math.min(W.length - 1, o.range[1]); }
    const root = el("div", "kit-ghost" + (o.cls ? " " + o.cls : ""));
    if (o.size) root.style.fontSize = o.size + "px";
    const glyphs = ghostGlyphs(root, story, line, a, b, o);
    const punch = {};
    (o.punch || []).forEach((p) => {
      const pr2 = findRange(W, p.phrase, a);
      if (pr2) for (let k = pr2[0]; k <= pr2[1]; k++) punch[k] = { at: W[pr2[0]][1], amp: p.amp ?? 0.4, dur: p.dur ?? 0.45 };
    });
    const first = W[a][1], last = W[b][1];
    const lead = o.lead ?? 0.55;
    return {
      el: root, first, last, glyphs,
      at: (phrase) => { const q = findRange(W, phrase, a); return q ? W[q[0]][1] : first; },
      render(t) {
        const v = E.o2(pr(t, first - lead, 0.35));
        show(root, v);
        if (v > 0) renderGlyphs(glyphs, t, punch);
      },
    };
  }

  // ---------------- contract components ----------------
  /* label({ text, sub, tone }) — a drafting callout: typed text over a shoulder line; sub = the real term / unit (mono).
   * render(t, a, b, cps): types in from a, fades out at b. */
  function label({ text, sub, tone = "default" } = {}) {
    const root = el("div", `kit-label tone-${tone}`);
    const main = el("span", "kit-label-main", root);
    const subEl = sub ? el("span", "kit-label-sub", root) : null;
    const n = Array.from(text).length;
    return {
      el: root,
      render(t, a = 0, b = Infinity, cps = 40) {
        const v = Math.min(pr(t, a, 0.12), 1 - pr(t, b, 0.3));
        show(root, v);
        if (v <= 0) return;
        typed(main, text, t, a, cps);
        root.style.setProperty("--u", E.o3(pr(t, a + 0.05, 0.4)).toFixed(3));
        if (subEl) typed(subEl, sub, t, a + n / cps, cps * 1.3);
      },
    };
  }
  /* note(text, { tag }) — the plain-language "说明" line of a figure: a yellow tag and a typed sentence. */
  function note(text, opts = {}) {
    const root = el("div", "kit-note");
    el("span", "kit-note-tag", root, opts.tag || "说明");
    const body = el("span", "", root);
    return {
      el: root,
      render(t, a = 0, b = Infinity, cps = 32) {
        const v = Math.min(pr(t, a, 0.2), 1 - pr(t, b, 0.3));
        show(root, v);
        if (v > 0) typed(body, text, t, a + 0.1, cps);
      },
    };
  }
  /* number({ value, unit, caption, decimals, tone, group }) — Archivo readout. render(t, u): count-up 0 → value. */
  function number({ value, unit, caption, decimals = 0, tone = "accent", group = true } = {}) {
    const root = el("div", `kit-num tone-${tone}`);
    const cap = caption ? el("span", "kit-num-c", root, caption) : null;
    const row = el("div", "", root);
    const v = el("span", "kit-num-v", row);
    const u = unit ? el("span", "kit-num-u", row, unit) : null;
    let fixed = null;
    return {
      el: root, cap, unitEl: u,
      set(x) { fixed = x; },
      render(t, k) {
        const val = k == null ? (fixed ?? value) : value * E.o3(clamp01(k));
        setText(v, fmt(val, decimals, group));
        show(root, k == null ? 1 : k > 0 ? 1 : 0);
      },
    };
  }
  /* bars({ rows: [{ label, value, max, tone, valueText }], width }) — comparison meters. render(t, u): grow 0..1. */
  function bars({ rows, width = 900 } = {}) {
    const root = el("div", "kit-bars");
    root.style.setProperty("--kit-bar-w", width + "px");
    const R = rows.map((r) => {
      const l = el("div", "kit-bar-l", root, r.label);
      const tr = el("div", "kit-bar-t", root);
      const f = el("i", `kit-bar-f tone-${r.tone || "ink"}`, tr);
      const v = el("div", "kit-bar-v", root, r.valueText ?? String(r.value));
      return { r, l, f, v };
    });
    const s = rows.length > 1 ? Math.min(0.25, 0.6 / (rows.length - 1)) : 0;
    const w = 1 - s * (rows.length - 1);
    return {
      el: root, rows: R,
      render(t, u) {
        show(root, u > 0 ? 1 : 0);
        R.forEach((x, i) => {
          const k = E.io2(clamp01((u - i * s) / w));
          const frac = (x.r.value / (x.r.max || 1)) * k;
          x.f.style.transform = `scaleX(${frac.toFixed(4)})`;
          op(x.l, u > i * s ? 1 : 0);
          op(x.v, k > 0.6 ? 1 : 0);
        });
      },
    };
  }
  /* formula({ terms: [{ text | html, t, tone, cls }] }) — the human voice: serif italic, terms appear at their times. */
  function formula({ terms } = {}) {
    const root = el("div", "kit-formula");
    const F = terms.map((x) => {
      const s = el("span", "kit-ft" + (x.tone ? " tone-" + x.tone : "") + (x.cls ? " " + x.cls : ""), root);
      if (x.html != null) s.innerHTML = x.html; else s.textContent = x.text;
      return { s, x };
    });
    return {
      el: root, terms: F,
      render(t) {
        let any = 0;
        F.forEach(({ s, x }) => {
          const f = E.o3(pr(t, x.t, 0.25));
          any = Math.max(any, f);
          op(s, f);
          s.style.transform = f < 1 ? `translateY(${((1 - f) * 14).toFixed(1)}px)` : "";
        });
        show(root, any > 0 ? 1 : 0);
      },
    };
  }

  /* title(story, { size, left, bottom, until, lead }) — the closing line, word-timed, as the biggest ghost type in the film,
   * rows split after "，"/"；", emphasis from story.end.emphasis. Mount .el in screen space (above the world). */
  function title(story, o = {}) {
    const end = story.data.end || { line: story.lines.length, start: story.lines[story.lines.length - 1].start, emphasis: [] };
    const L = story.line(end.line), W = L.words;
    const root = el("div", "kit-title");
    const shade = el("div", "kit-title-shade", root);
    const rows = [];
    let s0 = 0;
    W.forEach(([u], k) => {
      if (/^[，；]$/.test(u) || k === W.length - 1) { rows.push([s0, k]); s0 = k + 1; }
    });
    const em = (r) => W.slice(r[0], r[1] + 1).reduce((n, [u]) => n + (LAT.test(u) ? 0.72 * u.length : 1), 0);
    const size = Math.min(o.size || 122, Math.floor(1690 / Math.max(...rows.map(em))));
    const bottom = o.bottom ?? 190;
    const els = rows.map((r, i) => {
      const row = el("div", "kit-ghost", root);
      row.style.fontSize = size + "px";
      row.style.left = (o.left ?? 112) + "px";
      row.style.top = (1080 - bottom - size * 1.04 - (rows.length - 1 - i) * size * 1.2).toFixed(0) + "px";
      const glyphs = ghostGlyphs(row, story, end.line, r[0], r[1], { accent: end.emphasis || [] });
      return { row, glyphs };
    });
    const until = o.until ?? (story.recap ? story.recap.start : Infinity);
    const lead = o.lead ?? 0.9, rowLead = Math.min(0.6, lead);  // lead: how early the shade and the waiting glyphs appear
    return {
      el: root, size, rows: els,
      render(t) {
        const v = E.o2(pr(t, end.start - lead, Math.min(0.6, lead))) * (1 - pr(t, until, 0.35));
        show(root, v);
        if (v <= 0) return;
        els.forEach(({ row, glyphs }) => {
          const first = glyphs[0].at;
          show(row, E.o2(pr(t, first - rowLead, 0.35)));
          renderGlyphs(glyphs, t);
        });
        op(shade, E.o2(pr(t, end.start - lead, Math.min(0.6, lead))));
      },
    };
  }

  /* recap(story, { kicker, titleBlock, push }) — ONE composed frame: the drawing's general notes.
   * Left: center term + tagline + the title block (drawn by the model, checked by you). Right: numbered notes, each
   * with a detail bubble on a leader from the center. Leaders draw on, bubbles pop, then only a slow push and the
   * dots running the leaders move (it never freezes). Times come from story.recap.start / .end. */
  function recap(story, o = {}) {
    const R = story.recap;
    const root = el("div", "kit-recap");
    const bg = el("div", "kit-recap-bg kit-sheet", root);
    const edge = el("div", "kit-recap-edge", root);
    const inner = el("div", "kit-recap-in", root);
    const lead = svg("svg", { class: "kit-svg", width: 1920, height: 1080, viewBox: "0 0 1920 1080", style: "left:0;top:0" }, inner);
    const kick = el("div", "kit-recap-kicker", inner);
    const kickText = o.kicker || "总图 · 回顾 · SHEET 1 / 1";
    const cName = R.center || story.title;
    // size the centre term to its measured width (Archivo expanded ≈ 0.76 em per Latin glyph), on one line if it fits
    // at ≥ 84 px, else balanced over two lines at the word break
    const emOf = (s) => Array.from(s).reduce((n, ch) => n + (/[A-Za-z0-9 .\-]/.test(ch) ? 0.76 : 1.02), 0);
    const words = cName.split(" ");
    let cSize = Math.min(124, Math.floor(690 / emOf(cName))), lines = 1;
    if (cSize < 84 && words.length > 1) {
      let best = Infinity;
      for (let k = 1; k < words.length; k++) best = Math.min(best, Math.max(emOf(words.slice(0, k).join(" ")), emOf(words.slice(k).join(" "))));
      cSize = Math.min(100, Math.floor(690 / best));
      lines = 2;
    }
    const tagText = R.tagline || story.data.subtitle || "";
    const tbRows = o.titleBlock || [["标题", R.tagline || story.title], ["绘制", "模型"], ["审核", "你"], ["张", "1 / 1"]];
    // the left column (kicker, term, tagline, title block) is laid out from estimated sizes and centred vertically
    const cH = cSize * 1.04 * lines, tagH = Math.ceil((Array.from(tagText).length * 52) / 740) * 62;
    const tbH = (1 + Math.ceil((tbRows.length - 1) / 2)) * 92;
    const colH = 50 + cH + 24 + tagH + 64 + tbH;
    const Y0 = Math.round((1080 - colH) / 2);
    const cTop = Y0 + 50, tagTop = cTop + cH + 24, tbTop = tagTop + tagH + 64;
    kick.style.top = Y0 + "px";
    const center = el("div", "kit-recap-c", inner, cName);
    center.style.fontSize = cSize + "px";
    center.style.top = cTop + "px";
    const tag = el("div", "kit-recap-tag", inner);
    tag.style.top = tagTop.toFixed(0) + "px";
    const tagGlyphs = Array.from(tagText).map((ch, j) => {
      const s = el("span", "kit-gk a", tag, ch);
      s.setAttribute("data-layout-allow-overlap", "");
      return { s, at: R.start + 0.55 + j * 0.06, k: -1 };
    });
    const sp = sparks(lead);
    const n = R.points.length;
    const top = 150, bottomY = 990, slot = (bottomY - top) / n;
    const ox = 846, oy = cTop + cH / 2;
    const origin = svg("circle", { cx: ox, cy: oy, r: 7, fill: T.accent }, lead);
    const P = R.points.map((p, i) => {
      const y = top + slot * i + Math.max(0, (slot - 150) / 2);
      const box = el("div", "kit-recap-pt", inner);
      box.style.top = y.toFixed(0) + "px";
      const bub = el("span", "kit-recap-bub", box, String(p.n ?? i + 1));
      const tt = el("div", "kit-recap-pt-t", box, p.title);
      const tx = el("div", "kit-recap-pt-x", box, p.text);
      // orthogonal leader on a shared spine with 45° chamfers, the way a drafter bundles callouts
      const by = y + 26, bx = 912, sx = 866, c = 12, sg = Math.sign(by - oy);
      const d = Math.abs(by - oy) < c ? `M ${ox} ${oy} L ${sx} ${oy} L ${sx} ${by} L ${bx - 4} ${by}` : `M ${ox} ${oy} L ${sx} ${oy} L ${sx} ${by - sg * c} L ${sx + c} ${by} L ${bx - 4} ${by}`;
      const path = svg("path", { class: "kit-acc", d, style: "stroke-width:2.5;stroke-linejoin:round" }, lead);
      const len = path.getTotalLength();
      const a = R.start + 0.75 + i * 0.16;
      sp.burst(bx + 26, by, a + 0.32, 10);
      const dot = svg("circle", { r: 7, fill: T.accent, opacity: 0, class: "kit-lead-dot" }, lead);
      return { box, bub, tt, tx, path, len, a, dot, i };
    });
    const tb = titleBlock({ rows: tbRows, w: 700 });
    tb.el.style.left = "96px";
    tb.el.style.top = tbTop + "px";
    inner.appendChild(tb.el);
    const push = o.push ?? 0.03;
    // a fresh sheet is laid over the drawing (an opaque wipe from the bottom, no crossfade); the film hides what is
    // under it once covered(t) is true. Text only arrives on the new sheet.
    const W0 = R.start - 0.1, W1 = W0 + 0.4, S = R.start + 0.3;
    return {
      el: root,
      covered: (t) => t >= W1,
      render(t) {
        show(root, t >= W0 ? 1 : 0);
        if (t < W0) return;
        const w = E.io3(pr(t, W0, W1 - W0));
        bg.style.clipPath = w < 1 ? `inset(${((1 - w) * 100).toFixed(2)}% 0 0 0)` : "none";
        edge.style.top = ((1 - w) * 1080 - 1).toFixed(1) + "px";
        op(edge, w > 0 && w < 1 ? 1 : 0);
        show(inner, t >= S - 0.05 ? 1 : 0);
        // a constant-speed push (no ease-out) so the last frames never settle into a still
        const k = E.o2(pr(t, S, 0.6)) * 0.1 + 0.9 * pr(t, S, R.end - S);
        inner.style.transform = `scale(${(1 + push * k).toFixed(4)})`;
        typed(kick, kickText, t, S, 48, S + 1.2);
        const c = E.o3(pr(t, S, 0.4));
        op(center, c);
        center.style.transform = `translateY(${((1 - c) * 18).toFixed(1)}px)`;
        op(tag, pr(t, S + 0.2, 0.2));
        renderGlyphs(tagGlyphs, t);
        op(origin, pr(t, S + 0.3, 0.15));
        P.forEach((p) => {
          draw(p.path, p.len, E.io3(pr(t, p.a, 0.36)));
          op(p.path, t >= p.a ? 1 : 0);
          const b = E.back(pr(t, p.a + 0.3, 0.3));
          op(p.bub, pr(t, p.a + 0.3, 0.1));
          p.bub.style.transform = `scale(${(0.4 + 0.6 * b).toFixed(3)})`;
          const f = E.o3(pr(t, p.a + 0.36, 0.3));
          op(p.tt, f);
          p.tt.style.transform = `translateX(${((1 - f) * 16).toFixed(1)}px)`;
          op(p.tx, E.o2(pr(t, p.a + 0.46, 0.35)));
          // after the build only the leaders carry motion: one dot runs each leader into its note
          const ph = ((t - (S + 1.4)) / 2.4 + p.i * 0.17) % 1;
          if (t < S + 1.4) { p.dot.setAttribute("opacity", 0); return; }
          const q = p.path.getPointAtLength(ph * p.len);
          p.dot.setAttribute("cx", q.x.toFixed(1));
          p.dot.setAttribute("cy", q.y.toFixed(1));
          p.dot.setAttribute("opacity", (Math.sin(Math.PI * ph) * pr(t, S + 1.4, 0.4)).toFixed(3));
        });
        tb.render(t, S + 0.9);
        sp.render(t);
      },
    };
  }

  // ---------------- style extras ----------------
  /* footnote({ mark, text, rule }) — the insider footnote: true, small reading speed (24 px), typed. render(t, a, b). */
  function footnote({ mark = "¹", text, rule = false } = {}) {
    const root = el("div", "kit-fn" + (rule ? " rule" : ""));
    el("span", "kit-fn-m", root, mark);
    const body = el("span", "", root);
    return {
      el: root,
      render(t, a = 0, b = Infinity, cps = 40) {
        const v = Math.min(pr(t, a, 0.2), 1 - pr(t, b, 0.3));
        show(root, v);
        if (v > 0) typed(body, text, t, a + 0.08, cps);
      },
    };
  }
  /* stamp({ text, sub, tone }) — a rubber stamp (×1, REV A, 2 GB): slams in at a. render(t, a, b). */
  function stamp({ text, sub, tone = "accent", tilt = -4 } = {}) {
    const root = el("div", `kit-stamp tone-${tone}`, null, text);
    if (sub) el("small", "", root, sub);
    return {
      el: root,
      render(t, a = 0, b = Infinity) {
        const u = E4(pr(t, a, 0.24));
        const v = (t >= a ? 1 : 0) * (1 - pr(t, b, 0.3));
        show(root, v);
        root.style.transform = `scale(${(2.1 - 1.1 * u).toFixed(3)}) rotate(${(tilt - 6 * (1 - u)).toFixed(2)}deg)`;
      },
    };
  }
  /* sparks(svgLayer) — deterministic ember bursts in that layer's coordinates. burst(x, y, t0, n, spread, up); render(t). */
  function sparks(layer) {
    const S = [];
    let nb = 0;
    return {
      burst(x, y, t0, n = 12, spread, up) {
        for (let i = 0; i < n; i++) {
          const seed = nb * 31 + i * 7.7 + 0.5;
          const ang = (up ? -Math.PI / 2 : 0) + (hash(seed) - 0.5) * (spread || Math.PI * 2);
          const sp = 220 + hash(seed + 1) * 520;
          S.push({ x, y, t0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0.35 + hash(seed + 2) * 0.35, el: svg("circle", { r: (1.6 + hash(seed + 3) * 2.2).toFixed(1), fill: T.accent, opacity: 0 }, layer) });
        }
        nb++;
      },
      render(t) {
        for (const s of S) {
          const dt = t - s.t0;
          if (dt < 0 || dt > s.life) { if (s._v !== 0) { s.el.setAttribute("opacity", 0); s._v = 0; } continue; }
          const drag = (1 - Math.exp(-3 * dt)) / 3;
          s.el.setAttribute("cx", (s.x + s.vx * drag).toFixed(1));
          s.el.setAttribute("cy", (s.y + s.vy * drag + 420 * dt * dt).toFixed(1));
          s.el.setAttribute("opacity", (1 - dt / s.life).toFixed(3));
          s._v = 1;
        }
      },
    };
  }
  /* leader(svgLayer, { d, a, b, label, lx, ly, sparks, flow, tone }) — the line the camera rides from figure to figure:
   * it draws from a to b with a glowing head, bursts at its end; after `flow` dots run along it. render(t). */
  function leader(layer, o) {
    const cls = o.tone === "warn" ? "kit-red" : o.tone === "q" ? "kit-blue" : "kit-acc";
    const p = svg("path", { class: cls, d: o.d, style: `stroke-width:${o.width || 3};stroke-linejoin:round` }, layer);
    const len = p.getTotalLength();
    const head = svg("circle", { r: 9, fill: "#fff6cc", class: "kit-lead-head", opacity: 0 }, layer);
    const tx = o.label ? svg("text", { x: o.lx, y: o.ly, class: "kit-lead-t" }, layer) : null;
    if (tx) tx.textContent = o.label;
    const end = p.getPointAtLength(len);
    if (o.sparks) o.sparks.burst(end.x, end.y, o.b, 12);
    const dots = o.flow != null ? [0, 1, 2].map(() => svg("circle", { r: 10, fill: T.accent, opacity: 0, class: "kit-lead-dot" }, layer)) : [];
    return {
      el: p, len,
      point: (u) => p.getPointAtLength(clamp01(u) * len),
      render(t) {
        const u = E.io3(pr(t, o.a, o.b - o.a));
        draw(p, len, u);
        op(p, t >= o.a ? 0.9 : 0);
        const q = p.getPointAtLength(u * len);
        head.setAttribute("cx", q.x.toFixed(1));
        head.setAttribute("cy", q.y.toFixed(1));
        head.setAttribute("opacity", t >= o.a && u < 1 ? 1 : 0);
        if (tx) op(tx, pr(t, o.a + 0.3, 0.3));
        dots.forEach((d, j) => {
          if (t < o.flow) { d.setAttribute("opacity", 0); return; }
          const ph = ((t - o.flow) * (o.flowSpeed || 0.75) + j / 3) % 1;
          const r = p.getPointAtLength(ph * len);
          d.setAttribute("cx", r.x.toFixed(1));
          d.setAttribute("cy", r.y.toFixed(1));
          d.setAttribute("opacity", (Math.sin(Math.PI * ph) * pr(t, o.flow, 0.3)).toFixed(3));
        });
      },
    };
  }
  /* camera(worldEl, keys) — 2.5D crane over the sheet. keys: [[t, cx, cy, scale, tilt°, roll°], ...] through
   * core.track (monotone Hermite, Fritsch–Carlson limited). Build keys from story times. render(t) → [cx, cy, s, tilt, roll]. */
  function camera(worldEl, keys) {
    return {
      keys,
      at: (t) => track(keys, t),
      render(t) {
        const c = track(keys, t);
        worldEl.style.transform = `translate(960px,540px) rotateX(${c[3].toFixed(3)}deg) rotateZ(${c[4].toFixed(3)}deg) scale(${c[2].toFixed(4)}) translate(${(-c[0]).toFixed(2)}px,${(-c[1]).toFixed(2)}px)`;
        return c;
      },
    };
  }
  /* dim(svgLayer, { x1, y1, x2, y2, text, off, ext, tone }) — a dimension line between two points, offset `off`
   * perpendicular, with extension lines, architectural ticks and the measure in the middle. render(t, a, b). */
  function dim(layer, o) {
    const { x1, y1, x2, y2 } = o;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, off = o.off ?? 40;
    const ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off;
    const color = o.tone === "warn" ? T.warn : o.tone === "accent" ? T.accent : o.tone === "q" ? T.accent2 : "rgba(237,235,230,0.8)";
    const g2 = svg("g", {}, layer);
    const ext = svg("path", { d: `M ${x1 + nx * 8} ${y1 + ny * 8} L ${ax + nx * 10} ${ay + ny * 10} M ${x2 + nx * 8} ${y2 + ny * 8} L ${bx + nx * 10} ${by + ny * 10}`, style: `fill:none;stroke:${color};stroke-width:1.5;opacity:0.7` }, g2);
    const line = svg("path", { d: `M ${ax} ${ay} L ${bx} ${by}`, style: `fill:none;stroke:${color};stroke-width:2` }, g2);
    const tk = (x, y) => `M ${x - 9 * (dx + dy) / L * 0.7} ${y - 9 * (dy - dx) / L * 0.7} L ${x + 9 * (dx + dy) / L * 0.7} ${y + 9 * (dy - dx) / L * 0.7}`;
    const ticks = svg("path", { d: tk(ax, ay) + " " + tk(bx, by), style: `fill:none;stroke:${color};stroke-width:3` }, g2);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const up = Math.abs(ang) > 90 ? ang + 180 : ang;
    // the measure sits on the far side of the dimension line (outside the part), upright where possible
    const away = off >= 0 ? 1 : -1, flip = Math.abs(ang) > 90 ? -1 : 1;
    const shift = away * flip > 0 ? 32 : -12;
    const tx = svg("text", { class: "kit-dim-t", x: 0, y: shift, "text-anchor": "middle", transform: `translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${up.toFixed(2)})`, style: `fill:${color}` }, g2);
    tx.textContent = o.text || "";
    const len = L;
    return {
      el: g2, text: tx,
      render(t, a = 0, b = Infinity) {
        const v = 1 - pr(t, b, 0.3);
        show(g2, t >= a ? v : 0);
        if (t < a) return;
        op(ext, pr(t, a, 0.15));
        draw(line, len, E.io2(pr(t, a + 0.05, 0.35)));
        op(ticks, pr(t, a + 0.3, 0.1));
        op(tx, pr(t, a + 0.3, 0.2));
      },
    };
  }
  /* revcloud(svgLayer, { x, y, w, h | pts, r, tag, tx, ty }) — the redline revision cloud a checker draws around what is
   * wrong, with its delta tag. Here: waste. pts = a clockwise polygon (screen coords) instead of the box. render(t, a, b). */
  function revcloud(layer, o) {
    const r = o.r || 18;
    const pts = o.pts ? o.pts.concat([o.pts[0]]) : [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h], [o.x, o.y]];
    if (o.pts) { const xs = o.pts.map((p) => p[0]), ys = o.pts.map((p) => p[1]); o.x = Math.min(...xs); o.y = Math.min(...ys); o.w = Math.max(...xs) - o.x; o.h = Math.max(...ys) - o.y; }
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let s = 0; s < pts.length - 1; s++) {
      const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / (2 * r)));
      for (let k = 1; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n;
        d += ` A ${(len / n / 2 + 2).toFixed(1)} ${(len / n / 2 + 2).toFixed(1)} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    const g2 = svg("g", {}, layer);
    const path = svg("path", { d, class: "kit-red", style: "stroke-width:3;stroke-linejoin:round" }, g2);
    const len = path.getTotalLength();
    let tri = null, tt = null;
    if (o.tag) {
      const cx = o.tx ?? o.x + o.w + 30, cy = o.ty ?? o.y - 24;
      tri = svg("path", { d: `M ${cx} ${cy - 22} L ${cx + 24} ${cy + 18} L ${cx - 24} ${cy + 18} Z`, class: "kit-red", style: "stroke-width:2.5" }, g2);
      tt = svg("text", { x: cx + 36, y: cy + 14, class: "kit-rev-t" }, g2);
      tt.textContent = o.tag;
    }
    return {
      el: g2, path,
      render(t, a = 0, b = Infinity) {
        const v = 1 - pr(t, b, 0.3);
        show(g2, t >= a ? v : 0);
        if (t < a) return;
        draw(path, len, E.io2(pr(t, a, 0.45)));
        if (tri) { op(tri, pr(t, a + 0.3, 0.15)); op(tt, pr(t, a + 0.35, 0.2)); }
      },
    };
  }
  /* titleBlock({ rows: [[label, value], ...], w }) — the drawing's title block: first row spans the width, the rest
   * pair up in two columns. Values type in. render(t, a). */
  function titleBlock({ rows, w = 700 } = {}) {
    const root = el("div", "kit-tb");
    const H = 92;
    const cells = [];
    rows.forEach((r, i) => {
      const full = i === 0;
      const col = full ? 0 : (i - 1) % 2, rowi = full ? 0 : 1 + Math.floor((i - 1) / 2);
      const c = el("div", "", root);
      c.style.left = (full ? 0 : col * (w / 2)) + "px";
      c.style.top = rowi * H + "px";
      c.style.width = (full ? w : w / 2) + "px";
      c.style.height = H + "px";
      c.style.borderBottomWidth = "2px";
      if (!full && col === 0) c.style.borderRightWidth = "2px";
      // label and value share one cell; in a far pull-back their projected boxes can touch, which is by design
      el("small", "", c, r[0]).setAttribute("data-layout-allow-overlap", "");
      const v = el("span", "", c);
      v.setAttribute("data-layout-allow-overlap", "");
      cells.push({ v, text: r[1] });
    });
    const nRows = 1 + Math.ceil((rows.length - 1) / 2);
    root.style.width = w + "px";
    root.style.height = nRows * H + "px";
    return {
      el: root,
      render(t, a = 0) {
        show(root, pr(t, a - 0.1, 0.25));
        cells.forEach((c, j) => typed(c.v, c.text, t, a + j * 0.12, 30, a + j * 0.12 + 0.3));
      },
    };
  }
  /* frame(container) — the camera's own furniture (screen space): warm spot, grain, vignette, crop marks and the
   * sheet number. Returns { sheetno } — set its text from the film. */
  function frame(container) {
    el("div", "kit-spot", container);
    el("div", "kit-grain", container);
    el("div", "kit-vig", container);
    ["tl", "tr", "bl", "br"].forEach((c) => el("span", "kit-crop " + c, container));
    const sheetno = el("div", "kit-sheetno", container);
    return { sheetno };
  }
  /* cell(world, { x, y, n, title }) — one figure on the sheet: corner ticks and the detail bubble (图 n). */
  function cell(world, { x, y, n, title: name, bx = 1700, by = 70 }) {
    const c = el("div", "kit-cell", world);
    c.style.left = x + "px";
    c.style.top = y + "px";
    ["tl", "tr", "bl", "br"].forEach((k) => el("span", "kit-tick " + k, c));
    if (n != null) {
      const f = el("div", "kit-fig", c);
      el("b", "", f, String(n));
      if (name) el("span", "", f, name);
      f.style.left = bx + "px";
      f.style.top = by + "px";
    }
    return c;
  }

  g.Kit = {
    name: "v7-drafting",
    tokens: T,
    // contract
    label, note, number, bars, formula, title, recap,
    // extras
    ghost, footnote, stamp, sparks, leader, camera, dim, revcloud, titleBlock, frame, cell,
    util: { el, svg, op, show, draw, typed, setText, fmt, pulse, glow, findRange, E4 },
  };
})(window);
