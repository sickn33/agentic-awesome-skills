/* V1 editorial 「留白」 — kit.js  (load after lib/core.js and lib/story.js)
 *
 * window.Kit: the shared component API (label, note, number, bars, formula, title, recap) plus V1 extras
 * (paper, block, blocks, card, tile, stamp, receipt, hair). Every factory returns { el, render(t, ...) };
 * render is a pure function of t and its explicit arguments — no clocks, no randomness, no measuring.
 *
 * Positioning: pass { x, y } to get an absolutely positioned element with its top-left at (x, y) (add
 * { ax, ay } in 0..1 to anchor elsewhere, e.g. ax: 0.5 to centre on x). Or place el yourself.
 * Visibility: pass { at, out } (seconds) and render(t) fades/pops the element in at `at` and out at `out`;
 * or call render(t, u) with an explicit entry progress u in 0..1 (u wins). Without either it stays visible.
 * Kit components own their own opacity/transform: do not tween them with GSAP as well.
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  const { pr, env, E, clamp01, lerp } = C;

  // ---------- small helpers ----------
  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    return e;
  }
  function vis(el, o) {
    const v = o > 0.002 ? o : 0;
    el.style.opacity = v.toFixed(3);
    el.style.visibility = v > 0 ? "visible" : "hidden";
  }
  function position(el, o) {
    if (o.x == null) return;
    el.style.position = "absolute";
    el.style.left = o.x + "px";
    el.style.top = o.y + "px";
    if (o.ax || o.ay) el.style.translate = `${-(o.ax || 0) * 100}% ${-(o.ay || 0) * 100}%`;
  }
  // entry progress 0..1 (explicit u wins; else from at/out; else 1)
  function prog(o, t, u) {
    if (u != null) return clamp01(u);
    if (o.at == null) return 1;
    return env(t, o.at, o.out == null ? 1e9 : o.out, o.fi || 0.32, o.fo || 0.28);
  }
  // the V1 entry: a short rise + settle (no overshoot wobble), exit is a plain fade
  function enter(el, p, rise = 14, fromScale = 0.94) {
    vis(el, Math.min(1, p * 1.4));
    const e = E.o3(p);
    el.style.transform = `translateY(${((1 - e) * rise).toFixed(1)}px) scale(${lerp(fromScale, 1, e).toFixed(4)})`;
  }
  const isLatin = (s) => /[A-Za-z\d]$/.test(s);
  const startsLatin = (s) => /^[A-Za-z\d]/.test(s);
  function fmt(v, decimals) {
    return decimals ? v.toFixed(decimals) : String(Math.round(v));
  }

  // ---------- page ----------
  /** paper(container): bone paper + grain behind everything in container */
  function paper(container) {
    const bg = h("div", "kit-paper");
    const grain = h("div", "kit-grain");
    container.prepend(grain);
    container.prepend(bg);
    return { el: bg, grain, render() {} };
  }

  // ---------- contract components ----------
  /** label({ text, sub, tone, x, y, at, out }) — a pill. tone: default | accent | warn | ok | ink */
  function label(o = {}) {
    let cur = o.tone || "default";
    const el = h("div", `kit-label kit-tone-${cur}`);
    const tx = h("span", "kit-label-t", o.text);
    el.appendChild(tx);
    let sub = null;
    if (o.sub) { sub = h("span", "kit-label-sub", o.sub); el.appendChild(sub); }
    position(el, o);
    return {
      el,
      set(text, subText) { if (tx.textContent !== text) tx.textContent = text; if (sub && subText != null && sub.textContent !== subText) sub.textContent = subText; },
      tone(tone) { if (tone === cur) return; el.classList.remove("kit-tone-" + cur); el.classList.add("kit-tone-" + tone); cur = tone; },
      render(t, u) { enter(el, prog(o, t, u), 12, 0.9); },
    };
  }

  /** note(text, { x, y, at, out, key }) — one plain-language line, keyed 「说明」 by default; reveals left→right */
  function note(text, o = {}) {
    const el = h("div", "kit-note");
    el.appendChild(h("span", "kit-note-k", o.key || "说明"));
    el.appendChild(h("span", "kit-note-t", text));
    position(el, o);
    return {
      el,
      render(t, u) {
        const p = prog(o, t, u);
        vis(el, Math.min(1, p * 2));
        const r = E.o3(clamp01(p * 1.15));
        el.style.clipPath = `inset(-10px ${((1 - r) * 100).toFixed(2)}% -10px -10px)`;
      },
    };
  }

  /** number({ value, unit, caption, decimals, from, tone, prefix }) — render(t, u): count-up progress u 0..1, or .set(v) */
  function number(o = {}) {
    const el = h("div", `kit-num kit-tone-${o.tone || "default"}`);
    const row = h("div", "kit-num-row");
    const v = h("span", "kit-num-v", (o.prefix || "") + fmt(o.from || 0, o.decimals));
    row.appendChild(v);
    if (o.unit) row.appendChild(h("span", "kit-num-u", o.unit));
    el.appendChild(row);
    if (o.caption) el.appendChild(h("div", "kit-num-c", o.caption));
    position(el, o);
    let fixed = null;
    const show = (s) => { if (v.textContent !== s) v.textContent = s; };
    return {
      el,
      set(val) { fixed = val; show((o.prefix || "") + (typeof val === "number" ? fmt(val, o.decimals) : val)); },
      render(t, u) {
        const p = o.at == null ? 1 : env(t, o.at, o.out == null ? 1e9 : o.out, 0.3, 0.28);
        enter(el, p, 18, 0.96);
        if (fixed != null) return;
        const k = u == null ? 1 : E.o3(clamp01(u));
        show((o.prefix || "") + fmt(lerp(o.from || 0, o.value, k), o.decimals));
      },
    };
  }

  /** bars({ rows: [{ label, value, max, tone, valueText }], width, x, y, at, out }) — render(t, u): grow progress
   *  (u may be one number for all rows or an array, one per row) */
  function bars(o = {}) {
    const el = h("div", "kit-bars");
    if (o.width) el.style.setProperty("--kit-bars-w", o.width + "px");
    const rows = o.rows.map((r) => {
      const l = h("div", "kit-bar-l", r.label);
      const tr = h("div", "kit-bar-track");
      const f = h("div", `kit-bar-fill kit-tone-${r.tone || "default"}`);
      tr.appendChild(f);
      const v = h("div", `kit-bar-v kit-tone-${r.tone || "default"}`, "");
      el.append(l, tr, v);
      return { r, f, v };
    });
    position(el, o);
    return {
      el,
      render(t, u) {
        vis(el, o.at == null ? 1 : env(t, o.at, o.out == null ? 1e9 : o.out, 0.3, 0.28));
        rows.forEach((row, i) => {
          const k = E.o3(clamp01(Array.isArray(u) ? u[i] ?? 0 : u == null ? 1 : u));
          const frac = (row.r.value / (row.r.max || 1)) * k;
          row.f.style.width = "100%";
          row.f.style.transform = `scaleX(${frac.toFixed(4)})`;
          const txt = typeof row.r.valueText === "function" ? row.r.valueText(k) : row.r.valueText != null ? (k > 0.02 ? row.r.valueText : "") : fmt(row.r.value * k, row.r.decimals);
          if (row.v.textContent !== txt) row.v.textContent = txt;
        });
      },
    };
  }

  /** formula({ terms: [{ text, sub, t, kind: "op" | "res", tone }], x, y, out }) — render(t): each term rises at its t */
  function formula(o = {}) {
    const el = h("div", "kit-formula");
    const terms = o.terms.map((term) => {
      const box = h("div", `kit-ft${term.kind ? " is-" + term.kind : ""}${term.tone ? " kit-tone-" + term.tone : ""}`);
      box.appendChild(h("div", "kit-ft-v", term.text));
      if (term.sub) box.appendChild(h("div", "kit-ft-s", term.sub));
      el.appendChild(box);
      return { term, box };
    });
    position(el, o);
    return {
      el,
      terms: terms.map((x) => x.box),
      render(t) {
        const out = o.out == null ? 1 : 1 - pr(t, o.out - 0.3, 0.3);
        vis(el, out);
        for (const { term, box } of terms) {
          const p = pr(t, term.t - 0.04, term.kind === "res" ? 0.42 : 0.3);
          vis(box, Math.min(1, p * 1.6));
          const e = E.o3(p);
          box.style.transform = `translateY(${((1 - e) * (term.kind === "res" ? 26 : 18)).toFixed(1)}px)`;
        }
      },
    };
  }

  /** title(story, { x, y, out, rule }) — the word-timed closing line (story.end); emphasis from story.end.emphasis.
   *  Lines break after ， ： ； 。 ; a short segment ending in ： becomes a small kicker line. */
  function title(story, o = {}) {
    const end = story.data.end || {};
    const L = story.line(end.line || story.lines.length);
    const el = h("div", "kit-title");
    // split units into display lines
    const lines = [[]];
    L.words.forEach(([u, t]) => {
      lines[lines.length - 1].push([u, t]);
      if (/[，：；。,:;!?！？]$/.test(u)) lines.push([]);
    });
    if (!lines[lines.length - 1].length) lines.pop();
    const text = L.words.map((w) => w[0]).join("");
    const emph = new Array(text.length).fill(false);
    (end.emphasis || []).forEach((e) => {
      let at = text.indexOf(e);
      while (at >= 0) { for (let k = 0; k < e.length; k++) emph[at + k] = true; at = text.indexOf(e, at + e.length); }
    });
    let ci = 0;
    const units = [];
    lines.forEach((ln) => {
      const s = ln.map((w) => w[0]).join("");
      const kicker = /[：:]$/.test(s) && s.length <= 5;
      const row = h("span", "kit-title-line" + (kicker ? " is-kicker" : ""));
      ln.forEach(([u, t], k) => {
        const span = h("span", "kit-title-u");
        span.setAttribute("data-layout-allow-overflow", "");
        for (const ch of u) {
          const c = h("span", emph[ci] ? "is-em" : null, ch);
          span.appendChild(c);
          ci++;
        }
        const next = ln[k + 1];
        if (isLatin(u) && next && startsLatin(next[0])) span.appendChild(document.createTextNode(" "));
        row.appendChild(span);
        units.push({ span, t });
      });
      el.appendChild(row);
    });
    let rule = null;
    if (o.rule !== false) { rule = h("span", "kit-title-rule"); el.appendChild(rule); }
    position(el, o);
    const out = o.out != null ? o.out : story.recap ? story.recap.start + 0.3 : story.duration + 1;
    const first = units.length ? units[0].t : 0;
    const last = units.length ? units[units.length - 1].t : 0;
    return {
      el,
      units: units.map((u) => u.span),
      render(t) {
        const o2 = 1 - pr(t, out - 0.35, 0.35);
        vis(el, t < first - 0.2 ? 0 : o2);
        for (const { span, t: tu } of units) {
          const p = E.o3(pr(t, tu - 0.06, 0.42));
          span.style.transform = `translateY(${((1 - p) * 105).toFixed(1)}%)`;
        }
        if (rule) rule.style.transform = `scaleX(${E.io3(pr(t, last, 0.6)).toFixed(4)})`;
      },
    };
  }

  /** recap(story, { figure, figureSize: [w, h], enter: "page" | "fade" | "none", kicker, fit })
   *  ONE composed frame: the title (story.recap.center + tagline) and the numbered points around it, each tied to
   *  the centre by a hairline leader. With a figure (an element you build — e.g. a miniature of the film's hero),
   *  the title sits on top and the figure takes the centre. Gentle motion: slow push + a reading highlight that
   *  steps through the points. */
  function recap(story, o = {}) {
    const R = story.recap;
    const W = 1920, H = 1080, M = 96;
    const el = h("div", "kit-recap");
    const bg = h("div", "kit-recap-bg");
    bg.appendChild(h("div", "kit-grain"));
    const inner = h("div", "kit-recap-in");
    inner.setAttribute("data-layout-allow-overflow", "");
    el.append(bg, inner);
    const pts = R.points;
    const n = pts.length;
    const hasFig = !!o.figure;
    const [fw, fh] = o.figureSize || [520, 470];
    // centre box (figure or title) and the head
    const head = h("div", "kit-recap-head");
    head.appendChild(h("div", "kit-recap-kicker", o.kicker || "RECAP · 一图回顾"));
    const titleEl = h("div", "kit-recap-title", R.center);
    const estUnits = [...R.center].reduce((a, c) => a + (/[\u0000-ɏ]/.test(c) ? 0.56 : 1), 0);
    let titleSize = hasFig ? Math.min(96, Math.floor(1100 / Math.max(1, estUnits))) : Math.min(104, Math.floor(1240 / Math.max(1, estUnits)));
    // o.fit (opt-in, 2026-10-05): size the title (and tagline) from wider Latin estimates so a long centre such as
    // "Hugging Face Storage" stays inside the centre box instead of running into the point columns
    const wem = (s) => [...s].reduce((a, c) => a + (/[\u2e80-\u9fff\u3000-\u303f\uff00-\uffef]/.test(c) ? 1 : c === " " ? 0.3 : /[A-Z]/.test(c) ? 0.72 : 0.6), 0);
    const fit = !!o.fit;
    if (fit) titleSize = Math.min(titleSize, Math.floor((hasFig ? 1500 : 700) / Math.max(1, wem(R.center))));
    const titlePx = Math.max(fit ? 48 : 64, titleSize);
    head.style.setProperty("--kit-recap-title", titlePx + "px");
    const rule = h("div", "kit-recap-rule");
    const tag = h("div", "kit-recap-tag", R.tagline || "");
    if (fit && R.tagline) tag.style.fontSize = Math.max(28, Math.min(40, Math.floor((hasFig ? 1500 : 700) / Math.max(1, wem(R.tagline))))) + "px";
    head.append(titleEl, rule, tag);
    inner.appendChild(head);
    let box;
    if (hasFig) {
      head.style.top = "56px";
      const fig = h("div", "kit-recap-fig");
      fig.style.left = (W / 2 - fw / 2) + "px";
      fig.style.top = "330px";
      fig.style.width = fw + "px";
      fig.style.height = fh + "px";
      fig.appendChild(o.figure);
      inner.appendChild(fig);
      box = { l: W / 2 - fw / 2, r: W / 2 + fw / 2, t: 330, b: 330 + fh, el: fig };
    } else {
      // title block centred; its box is approximated from its type size (no measuring)
      const bh = titlePx * 1.04 + 26 + 36 + 52 + 40;
      head.style.top = (H / 2 - bh / 2 - 10) + "px";
      const bw = fit ? Math.max(480, Math.min(720, wem(R.center) * titlePx)) : Math.max(480, Math.min(720, estUnits * Math.max(64, titleSize)));
      box = { l: W / 2 - bw / 2 - 30, r: W / 2 + bw / 2 + 30, t: H / 2 - bh / 2, b: H / 2 + bh / 2, el: head };
    }
    // points: left column top→bottom, then right column
    const nl = Math.ceil(n / 2), nr = n - nl;
    const gap = 70;
    const colW = Math.min(560, box.l - gap - M);
    const lx = box.l - gap - colW, rx = box.r + gap; // left column hugs the centre from the left, right column from the right
    const y0 = hasFig ? 300 : 150, y1 = hasFig ? 1010 : 960;
    const svg = svgEl("svg", { class: "kit-recap-svg", width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    inner.insertBefore(svg, inner.firstChild);
    const xsize = Math.max(...pts.map((p) => [...p.text].reduce((a, c) => a + (/[\u0000-ɏ]/.test(c) ? 0.55 : 1), 0))) > 3 * (colW / 29) ? 26 : 29;
    inner.style.setProperty("--kit-recap-x", xsize + "px");
    const items = pts.map((p, i) => {
      const left = i < nl;
      const k = left ? i : i - nl;
      const cnt = left ? nl : nr;
      const slot = (y1 - y0) / cnt;
      const chars = [...p.text].reduce((a, c) => a + (/[\u0000-ɏ]/.test(c) ? 0.55 : 1), 0);
      const lines = Math.min(3, Math.ceil((chars * xsize) / colW));
      const bhh = 66 + 10 + lines * xsize * 1.45;
      const top = y0 + k * slot + (slot - bhh) / 2;
      const node = h("div", "kit-recap-pt");
      const hd = h("div", "kit-recap-pt-h");
      hd.append(h("span", "kit-recap-pt-n", String(p.n).padStart(2, "0")), h("span", "kit-recap-pt-t", p.title));
      node.append(hd, h("div", "kit-recap-pt-x", p.text));
      node.style.width = colW + "px";
      node.style.left = (left ? lx : rx) + "px";
      if (left) node.classList.add("is-left");
      node.style.top = top.toFixed(1) + "px";
      inner.appendChild(node);
      // leader: from the column's inner edge at the numeral row to the centre box edge
      const ay = top + 34;
      const ax = left ? lx + colW + 16 : rx - 16;
      const bx = left ? box.l - 14 : box.r + 14;
      const by = box.t + ((k + 1) / (cnt + 1)) * (box.b - box.t);
      const mx = (ax + bx) / 2;
      const path = svgEl("path", { d: `M ${ax.toFixed(1)} ${ay.toFixed(1)} C ${mx.toFixed(1)} ${ay.toFixed(1)}, ${mx.toFixed(1)} ${by.toFixed(1)}, ${bx.toFixed(1)} ${by.toFixed(1)}` });
      const len = Math.hypot(bx - ax, by - ay) * 1.15 + 20;
      path.style.strokeDasharray = `${len.toFixed(0)} ${len.toFixed(0)}`;
      const dot = svgEl("circle", { cx: bx.toFixed(1), cy: by.toFixed(1), r: 6 });
      const dot0 = svgEl("circle", { cx: ax.toFixed(1), cy: ay.toFixed(1), r: 4 });
      svg.append(path, dot, dot0);
      return { node, path, dot, dot0, len, left };
    });
    const t0 = R.start, t1 = R.end || story.duration;
    const mode = o.enter || "page";
    return {
      el,
      render(t) {
        if (t < t0 - 0.6) { vis(el, 0); return; }
        // the new page arrives from the right (or fades), then everything is built on it
        const pin = E.io3(pr(t, t0 - 0.05, 0.55));
        if (mode === "page") { vis(el, t >= t0 - 0.05 ? 1 : 0); el.style.transform = `translateX(${((1 - pin) * 100).toFixed(2)}%)`; }
        else if (mode === "fade") vis(el, pin);
        else vis(el, t >= t0 ? 1 : 0);
        // slow push for the whole frame (gentle, never frozen)
        const push = 1 + 0.03 * E.io2(pr(t, t0 + 0.3, t1 - t0));
        inner.style.transform = `scale(${push.toFixed(4)})`;
        const hp = E.o3(pr(t, t0 + 0.4, 0.55));
        vis(head, hp);
        head.style.transform = `translateY(${((1 - hp) * 24).toFixed(1)}px)`;
        rule.style.transform = `scaleX(${E.io3(pr(t, t0 + 0.6, 0.5)).toFixed(4)})`;
        if (hasFig) {
          const fp = E.o3(pr(t, t0 + 0.45, 0.6));
          vis(box.el, fp);
          box.el.style.transform = `scale(${lerp(0.92, 1, fp).toFixed(4)})`;
        }
        // reading highlight: steps through the points once everything is on the page
        const ha = t0 + 0.75 + n * 0.16 + 0.25;
        const step = Math.max(0.45, (t1 - 0.35 - ha) / n);
        const active = t < ha ? -1 : Math.min(n - 1, Math.floor((t - ha) / step));
        items.forEach((it, i) => {
          const a = t0 + 0.65 + i * 0.16;
          const p = E.o3(pr(t, a, 0.45));
          vis(it.node, p);
          it.node.style.transform = `translateX(${((1 - p) * (it.left ? -26 : 26)).toFixed(1)}px)`;
          const d = E.io2(pr(t, a + 0.08, 0.5));
          it.path.style.strokeDashoffset = (it.len * (1 - d)).toFixed(1);
          vis(it.dot, pr(t, a + 0.5, 0.12));
          vis(it.dot0, p);
          const on = i === active;
          it.node.classList.toggle("is-on", on);
          it.path.classList.toggle("is-on", on);
          it.dot.classList.toggle("is-on", on);
        });
      },
    };
  }

  // ---------- V1 extras ----------
  /** block(kind, size): one data block. kind: ink (default) | accent | stone | paper | ghost | warn */
  function block(kind, size) {
    const b = h("div", "kit-block" + (kind && kind !== "ink" ? " is-" + kind : ""));
    if (size) b.style.setProperty("--kb", size + "px");
    return b;
  }
  /** blocks({ n, cols, size, gap, kind, x, y, kinds: (i) => kind }) → { el, cells, at(i) } — a grid of blocks
   *  in a holder; cells are absolutely positioned at (col*pitch, row*pitch) inside it. Animate cells yourself. */
  function blocks(o = {}) {
    const el = h("div", "kit-blocks");
    el.style.position = "absolute";
    const size = o.size || 48, pitch = size + (o.gap == null ? 8 : o.gap), cols = o.cols || 10;
    const at = (i) => ({ x: (i % cols) * pitch, y: Math.floor(i / cols) * pitch });
    const cells = [];
    for (let i = 0; i < (o.n || 100); i++) {
      const b = block(o.kinds ? o.kinds(i) : o.kind, size);
      const p = at(i);
      b.style.left = p.x + "px";
      b.style.top = p.y + "px";
      el.appendChild(b);
      cells.push(b);
    }
    el.style.width = (cols * pitch - (pitch - size)) + "px";
    el.style.height = (Math.ceil((o.n || 100) / cols) * pitch - (pitch - size)) + "px";
    if (o.x != null) { el.style.left = o.x + "px"; el.style.top = o.y + "px"; }
    return { el, cells, at, pitch, size, render() {} };
  }
  /** card({ title, meta, w, h, x, y }) — the paper card with a serif title and a mono meta on its head */
  function card(o = {}) {
    const el = h("div", "kit-card");
    el.style.width = (o.w || 620) + "px";
    el.style.height = (o.h || 660) + "px";
    if (o.x != null) { el.style.left = o.x + "px"; el.style.top = o.y + "px"; }
    const head = h("div", "kit-card-head");
    const ti = h("span", "kit-card-title", o.title || "");
    const me = h("span", "kit-card-meta", o.meta || "");
    head.append(ti, me);
    el.appendChild(head);
    return { el, head, title: ti, meta: me, render() {} };
  }
  /** tile({ text, sub, tone, x, y, at, out }) — a word set in a paper tile (a token, a name). tone: default | accent | ink | ghost */
  function tile(o = {}) {
    let cur = o.tone || "default";
    const el = h("div", `kit-tile kit-tone-${cur}`);
    const tx = h("span", "kit-tile-t", o.text);
    el.appendChild(tx);
    if (o.sub) el.appendChild(h("span", "kit-tile-sub", o.sub));
    position(el, o);
    return {
      el,
      tone(tone) { if (tone === cur) return; el.classList.remove("kit-tone-" + cur); el.classList.add("kit-tone-" + tone); cur = tone; },
      render(t, u) { enter(el, prog(o, t, u), 26, 0.82); },
    };
  }
  /** stamp({ text, tone, x, y, at, out, rot }) — a rubber stamp that slams down at `at` */
  function stamp(o = {}) {
    const el = h("div", `kit-stamp kit-tone-${o.tone || "accent"}`);
    el.appendChild(h("span", null, o.text));
    position(el, o);
    const rot = o.rot == null ? -8 : o.rot;
    return {
      el,
      render(t) {
        const p = pr(t, o.at, 0.2);
        const out = o.out == null ? 1 : 1 - pr(t, o.out - 0.2, 0.2);
        vis(el, p > 0 ? Math.min(1, p * 3) * out : 0);
        const e = E.i2(p);
        el.style.transform = `rotate(${lerp(rot - 6, rot, e).toFixed(2)}deg) scale(${lerp(1.8, 1, e).toFixed(4)})`;
      },
    };
  }
  /** receipt({ title, rows: [{ label, value, t, pre, swap, big, total, tone }], width, x, y, at, out })
   *  Prints line by line and the paper grows as it prints (never a mostly-empty slip).
   *  value may be a function of t; `pre` is shown until `swap` (e.g. "？" until the stamp). */
  function receipt(o = {}) {
    const el = h("div", "kit-receipt");
    el.style.width = (o.width || 640) + "px";
    const head = h("div", "kit-receipt-head", o.title || "RECEIPT");
    el.appendChild(head);
    const HEAD = 86, ROW = 84, FOOT = 44;
    const rows = o.rows.map((r, i) => {
      const line = h("div", "kit-rline" + (r.total ? " is-total" : ""));
      line.style.top = HEAD + i * ROW + "px";
      const l = h("span", "kit-rline-l", r.label);
      const v = h("span", "kit-rline-v" + (r.big ? " is-big" : "") + (r.tone ? " kit-tone-" + r.tone : ""), "");
      line.append(l, v);
      el.appendChild(line);
      return { r, line, v };
    });
    position(el, o);
    return {
      el,
      rows: rows.map((r) => r.line),
      render(t) {
        const p = o.at == null ? 1 : env(t, o.at, o.out == null ? 1e9 : o.out, 0.4, 0.3);
        vis(el, Math.min(1, p * 1.5));
        el.style.transform = `translateX(${((1 - E.o3(p)) * 120).toFixed(1)}px)`;
        // paper length follows the printed lines
        let fed = 0;
        rows.forEach(({ r }) => { fed += E.o3(pr(t, r.t - 0.12, 0.28)); });
        el.style.height = (HEAD + fed * ROW + FOOT).toFixed(1) + "px";
        rows.forEach(({ r, line, v }) => {
          const q = pr(t, r.t, 0.22);
          vis(line, q);
          line.style.transform = `translateY(${((1 - E.o3(q)) * -12).toFixed(1)}px)`;
          let txt = typeof r.value === "function" ? r.value(t) : r.value;
          const pre = r.pre != null && r.swap != null && t < r.swap;
          if (pre) txt = r.pre;
          v.classList.toggle("is-pre", pre);
          if (v.textContent !== txt) v.textContent = txt;
        });
      },
    };
  }
  /** hair({ d | x1,y1,x2,y2, tone, dots, w, h }) — a hairline (svg) that draws: render(t, u) with u = drawn fraction */
  function hair(o = {}) {
    const el = svgEl("svg", { class: "kit-hair" + (o.tone ? " kit-tone-" + o.tone : ""), width: o.w || 1920, height: o.h || 1080 });
    const d = o.d || `M ${o.x1} ${o.y1} L ${o.x2} ${o.y2}`;
    const path = svgEl("path", { d });
    el.appendChild(path);
    const len = o.len || (o.x1 != null ? Math.hypot(o.x2 - o.x1, o.y2 - o.y1) : 2000);
    path.style.strokeDasharray = `${len} ${len}`;
    let dot = null;
    if (o.dots && o.x2 != null) { dot = svgEl("circle", { cx: o.x2, cy: o.y2, r: 6 }); el.appendChild(dot); }
    return {
      el,
      path,
      set(dd) { path.setAttribute("d", dd); },
      render(t, u) {
        const p = u == null ? (o.at == null ? 1 : E.io2(pr(t, o.at, o.dur || 0.45))) : clamp01(u);
        const out = o.out == null ? 1 : 1 - pr(t, o.out - 0.25, 0.25);
        vis(el, p > 0 ? out : 0);
        path.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
        if (dot) vis(dot, pr(p, 0.9, 0.1));
      },
    };
  }

  g.Kit = {
    name: "v1-editorial",
    label, note, number, bars, formula, title, recap,
    // extras
    paper, block, blocks, card, tile, stamp, receipt, hair,
    util: { h, svgEl, vis, enter, prog },
  };
})(window);
