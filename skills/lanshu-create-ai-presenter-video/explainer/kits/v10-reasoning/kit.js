/* V10 · 推演 (reasoning) — window.Kit.
 *
 * Load after lib/core.js and lib/story.js. Every factory returns { el, render(t, ...) } and render is a pure function
 * of t and its explicit arguments: nothing is carried between frames, so any frame can be seeked.
 *
 * Contract:   label · note · number · bars · formula · title · recap
 * Extras:     write (glyph write-on with $math$ / {tone:text} markup) · stmt (a statement in serif 900) · formula leaders ·
 *             stroke (draw-on path, dashed or solid, arrowhead) · brace · dots (a dot lattice / triangle) · plane (vectors on a
 *             circle with projections) · plot (axes + lines) · box · camera · canvas · backdrop · chapters · captions · util
 * See KIT.md for the look, the rules and how a new topic uses it.
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v10-reasoning: load lib/core.js before lib/kit/kit.js");
  const { clamp01, pr, lerp, E, track } = C;
  const NS = "http://www.w3.org/2000/svg";
  const T = {
    bg: "#12172a", glow: "#1c2446", ink: "#ece6d6", muted: "#9aa1b8", faint: "#2f395e", dot: "#2b3558",
    accent: "#ff8ea6", accent2: "#5fd3c2", accent3: "#ffc75e", warn: "#ff6f5e", ok: "#5fd3c2",
  };
  T.q = T.accent; T.k = T.accent2; T.v = T.accent3;
  const TONE = { default: T.ink, ink: T.ink, accent: T.accent, q: T.accent, k: T.accent2, v: T.accent3, warn: T.warn, ok: T.ok, muted: T.muted, faint: T.faint };
  /** tone name ("q" | "k" | "v" | "accent" | "warn" | "ok" | "muted" | "ink") → colour; a colour passes through */
  const tone = (n) => TONE[n] || n || T.ink;
  const RGB = (hex) => { const h = hex.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const rgba = (c, a) => { const [r, gg, b] = RGB(tone(c)); return `rgba(${r},${gg},${b},${(+a).toFixed(3)})`; };
  const pulse = (t, a, d) => (t < a || t > a + d ? 0 : Math.sin((Math.PI * (t - a)) / d));

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
  // like show(), but a visible element inherits its parent's visibility (a hidden station hides it)
  function vis(e, v) {
    op(e, v);
    const w = v > 0 ? "inherit" : "hidden";
    if (e._vis !== w) { e.style.visibility = w; e._vis = w; }
  }
  function attr(e, k, v) {
    const s = typeof v === "number" ? v.toFixed(2) : String(v);
    const key = "_a_" + k;
    if (e[key] !== s) { e.setAttribute(k, s); e[key] = s; }
  }
  function draw(path, len, u) {
    const d = `${len.toFixed(1)} ${len.toFixed(1)}`;
    if (path._da !== d) { path.style.strokeDasharray = d; path._da = d; }
    const o = (len * (1 - clamp01(u))).toFixed(1);
    if (path._do !== o) { path.style.strokeDashoffset = o; path._do = o; }
  }
  function setText(e, s) { if (e._t !== s) { e.textContent = s; e._t = s; } }
  function tr(e, s) { if (e._tr !== s) { e.style.transform = s; e._tr = s; } }
  function fmt(v, decimals = 0, group = true) {
    const s = Math.abs(v).toFixed(decimals);
    const [i, f] = s.split(".");
    const ig = group ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : i;
    return (v < 0 ? "−" : "") + ig + (f ? "." + f : "");
  }
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
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
  // width estimate in em for Noto Sans SC (layout that must not wait for fonts)
  const chEm = (ch) => (/[　-鿿＀-￯]/.test(ch) ? 1 : /[0-9]/.test(ch) ? 0.57 : /[ijl.,:;'|!]/.test(ch) ? 0.3 : /[mwMW%@]/.test(ch) ? 0.9 : /[frt]/.test(ch) ? 0.42 : ch === " " ? 0.25 : /[A-Z]/.test(ch) ? 0.67 : /[a-z]/.test(ch) ? 0.56 : 0.62);
  const strip = (s) => String(s).replace(/\$([^$]*)\$/g, "$1").replace(/\{\w+:([^{}]*)\}/g, "$1").replace(/\$/g, "");
  const em = (s) => Array.from(strip(s)).reduce((n, ch) => n + chEm(ch), 0);

  // ---------------- write-on text with a tiny markup ----------------
  // "$n$" → math italic (STIX), "{q:text}" → text in tone q (rose); "$…$" may sit inside a tone group.
  function parse(text) {
    const out = [];
    const push = (s, cls) => { for (const ch of Array.from(s)) out.push({ ch, cls }); };
    const inner = (s, base) => {
      const r2 = /\$([^$]+)\$/g;
      let l = 0, mm;
      while ((mm = r2.exec(s))) { push(s.slice(l, mm.index), base); push(mm[1], (base ? base + " " : "") + "kit-math"); l = r2.lastIndex; }
      push(s.slice(l), base);
    };
    const re = /\{(\w+):([^{}]*)\}/g;
    let last = 0, m;
    while ((m = re.exec(text))) { inner(text.slice(last, m.index), ""); inner(m[2], "tone-" + m[1]); last = re.lastIndex; }
    inner(text.slice(last), "");
    return out;
  }
  /* write(host, text) → { el, glyphs, n, render(t, a, cps, b) }: the text as glyph spans that rise into place one by one
   * from a (cps glyphs per second), and fade out at b. Unwritten glyphs are visibility:hidden (never "unpainted"). */
  function write(host, text) {
    host.classList.add("kit-w");
    // a run of Latin letters / digits of one class is one glyph, so wrapped text never breaks inside a word
    const parts = [];
    for (const p of parse(String(text))) {
      const q = parts[parts.length - 1];
      if (q && q.cls === p.cls && /^[A-Za-z0-9.%]+$/.test(q.ch) && /^[A-Za-z0-9.%]$/.test(p.ch)) q.ch += p.ch;
      else parts.push({ ch: p.ch, cls: p.cls });
    }
    const G = parts.map((p) => el("i", p.cls, host, p.ch));
    G.forEach((s) => { s.style.visibility = "hidden"; s._vis = "hidden"; });
    return {
      el: host, glyphs: G, n: G.length,
      render(t, a = 0, cps = 28, b = Infinity) {
        const out = 1 - pr(t, b, 0.3);
        for (let j = 0; j < G.length; j++) {
          const f = E.o3(pr(t, a + j / cps, 0.22)) * out;
          const s = G[j], k = f.toFixed(3);
          if (s._f === k) continue;
          s._f = k;
          s.style.opacity = k;
          s.style.transform = f < 1 ? `translateY(${((1 - f) * 0.24).toFixed(3)}em)` : "";
          const w = f > 0 ? "inherit" : "hidden";
          if (s._vis !== w) { s.style.visibility = w; s._vis = w; }
        }
        return out;
      },
    };
  }
  /* stmt(text, { size, tone, cls }) → { el, render(t, a, cps, b) }: a statement in Noto Serif SC 900, written on. */
  function stmt(text, o = {}) {
    const root = el("div", "kit-stmt" + (o.tone ? " tone-" + o.tone : "") + (o.cls ? " " + o.cls : ""));
    if (o.size) root.style.fontSize = o.size + "px";
    const W = write(root, text);
    return { el: root, n: W.n, render: (t, a, cps = 22, b) => { const v = W.render(t, a, cps, b); vis(root, t >= a ? v : 0); } };
  }

  // ---------------- contract components ----------------
  /* label({ text, sub, tone, size }) — a callout in its binding colour, written on; sub = the real term / unit (mono).
   * render(t, a, b, cps). text accepts the markup ($math$, {tone:text}). */
  function label({ text, sub, tone: tn = "default", size } = {}) {
    const root = el("div", `kit-label tone-${tn}`);
    if (size) root.style.fontSize = size + "px";
    const main = el("span", "", root);
    const W = write(main, text);
    const subEl = sub ? el("span", "kit-label-sub", root) : null;
    const S = subEl ? write(subEl, sub) : null;
    return {
      el: root,
      render(t, a = 0, b = Infinity, cps = 34) {
        const v = Math.min(pr(t, a, 0.1), 1 - pr(t, b, 0.3));
        vis(root, v);
        if (v <= 0) return;
        W.render(t, a, cps);
        if (S) S.render(t, a + W.n / cps, cps * 1.4);
      },
    };
  }
  /* note(text, { tag, mark }) — the chapter's plain-language line: a rose 「说明」 tag (or a math mark like ∴) + the
   * sentence written on. render(t, a, b, cps). */
  function note(text, o = {}) {
    const root = el("div", "kit-note");
    if (o.mark) el("span", "kit-note-m", root, o.mark);
    else el("span", "kit-note-tag", root, o.tag || "说明");
    const body = el("span", "", root);
    const W = write(body, text);
    return {
      el: root,
      render(t, a = 0, b = Infinity, cps = 30) {
        const v = Math.min(pr(t, a, 0.2), 1 - pr(t, b, 0.3));
        vis(root, v);
        if (v > 0) W.render(t, a + 0.12, cps);
      },
    };
  }
  /* number({ value, unit, caption, decimals, tone, group, format }) — JetBrains Mono readout. render(t, u): count-up
   * 0 → value with progress u (or render(t) after .set(v)). */
  function number({ value, unit, caption, decimals = 0, tone: tn = "accent", group = true, format } = {}) {
    const root = el("div", `kit-num tone-${tn}`);
    const cap = caption ? el("span", "kit-num-c", root, caption) : null;
    const row = el("div", "", root);
    const v = el("span", "kit-num-v", row);
    const u = unit ? el("span", "kit-num-u", row, unit) : null;
    let fixed = null;
    return {
      el: root, cap, unitEl: u, valueEl: v,
      set(x) { fixed = x; },
      render(t, k) {
        const val = k == null ? (fixed ?? value) : value * E.o3(clamp01(k));
        setText(v, format ? format(val) : fmt(val, decimals, group));
        vis(root, k == null ? 1 : k > 0 ? 1 : 0);
      },
    };
  }
  /* bars({ rows: [{ label, value, max, tone, valueText }], width }) — thin rounded meters. render(t, u): grow 0..1. */
  function bars({ rows, width = 720 } = {}) {
    const root = el("div", "kit-bars");
    root.style.setProperty("--kit-bar-w", width + "px");
    const R = rows.map((r) => {
      const l = el("div", "kit-bar-l", root, r.label);
      const trk = el("div", "kit-bar-t", root);
      const f = el("i", `kit-bar-f tone-${r.tone || "ink"}`, trk);
      const v = el("div", "kit-bar-v", root, r.valueText ?? String(r.value));
      return { r, l, f, v };
    });
    const s = rows.length > 1 ? Math.min(0.25, 0.6 / (rows.length - 1)) : 0;
    const w = 1 - s * (rows.length - 1);
    return {
      el: root, rows: R,
      render(t, u) {
        vis(root, u > 0 ? 1 : 0);
        R.forEach((x, i) => {
          const k = E.io2(clamp01((u - i * s) / w));
          tr(x.f, `scaleX(${((x.r.value / (x.r.max || 1)) * k).toFixed(4)})`);
          op(x.l, u > i * s ? 1 : 0);
          op(x.v, k > 0.6 ? 1 : 0);
        });
      },
    };
  }
  /* formula({ terms, size, drop, labelSize, gap }) — the colour-bound formula. Terms: [{ text | html, sub, t, tone, up,
   * dim, label, labelAt, labelDx, pulse: [times], until }]: each term rises in at t in its tone (STIX italic; `up` =
   * upright for operators); `pulse` lights the term (scale + glow) when its shape is spoken; a term with `label` gets a
   * curved leader in its own colour down to the label (written at labelAt, default t + 0.3; labels are spread so they
   * never overlap). Position .el (left/top) or call .center(x, y). render(t). */
  function formula(o = {}) {
    const size = o.size || 72, lsz = o.labelSize || 28, drop = o.drop ?? Math.round(size * 0.78), gap = o.gap ?? 34;
    const root = el("div", "kit-formula" + (o.cls ? " " + o.cls : ""));
    root.style.fontSize = size + "px";
    const lay = svg("svg", { class: "kit-ft-svg" }, root);
    const F = o.terms.map((x) => {
      const s = el("span", "kit-ft" + (x.up ? " up" : "") + (x.dim ? " dim" : "") + (x.tone ? " tone-" + x.tone : "") + (x.cls ? " " + x.cls : ""), root);
      if (x.html != null) s.innerHTML = x.html;
      else { s.textContent = x.text; if (x.sub) el("sub", "", s, x.sub); }
      s.style.visibility = "hidden";
      s.setAttribute("data-layout-allow-overlap", ""); // tight math type: a pulsing term may touch its neighbours
      let L = null;
      if (x.label) {
        const path = svg("path", { fill: "none", stroke: tone(x.tone), "stroke-width": 2.2, "stroke-linecap": "round" }, lay);
        const lab = el("div", "kit-ft-lab" + (x.tone ? " tone-" + x.tone : ""), root);
        lab.style.fontSize = lsz + "px";
        const W = write(lab, x.label);
        L = { path, lab, W, at: x.labelAt ?? x.t + 0.3, dx: x.labelDx || 0, w: em(x.label) * lsz };
      }
      return { s, x, L };
    });
    const withL = F.filter((f) => f.L);
    return {
      el: root, terms: F,
      center(x, y) { root.style.left = x + "px"; root.style.top = y + "px"; root.style.transform = "translateX(-50%)"; return this; },
      render(t) {
        let any = 0;
        F.forEach(({ s, x }) => {
          const f = E.o3(pr(t, x.t, 0.3)) * (x.until != null ? 1 - pr(t, x.until, 0.3) : 1);
          any = Math.max(any, f);
          vis(s, f);
          let k = 1, gl = 0;
          (x.pulse || []).forEach((p) => { const q = pulse(t, p, 0.6); if (q > gl) { gl = q; k = 1 + 0.16 * q; } });
          tr(s, `translateY(${((1 - f) * 0.2).toFixed(3)}em) scale(${k.toFixed(3)})`);
          const sh = gl > 0.01 ? `0 0 ${(10 + 18 * gl).toFixed(1)}px ${rgba(x.tone || "ink", 0.85 * gl)}` : "";
          if (s._sh !== sh) { s.style.textShadow = sh; s._sh = sh; }
        });
        vis(root, any > 0 ? 1 : 0);
        if (!withL.length || any <= 0) return;
        // leaders: measured from the laid-out terms (offsets ignore transforms), labels spread left → right
        const items = withL.map((f) => {
          const s = f.s;
          const cx = s.offsetLeft + s.offsetWidth * (f.x.sub ? 0.36 : 0.5);
          return { f, cx, yb: s.offsetTop + s.offsetHeight + 2, lx: cx + f.L.dx };
        }).sort((a, b) => a.lx - b.lx);
        for (let i = 1; i < items.length; i++) {
          const p = items[i - 1], q = items[i];
          const need = p.lx + (p.f.L.w + q.f.L.w) / 2 + gap;
          if (q.lx < need) q.lx = need;
        }
        const shift = items.reduce((n, it) => n + (it.lx - (it.cx + it.f.L.dx)), 0) / items.length;
        items.forEach((it) => {
          const L = it.f.L, lx = it.lx - shift, y1 = it.yb + drop;
          const d = `M ${it.cx.toFixed(1)} ${it.yb.toFixed(1)} C ${it.cx.toFixed(1)} ${(it.yb + drop * 0.55).toFixed(1)} ${lx.toFixed(1)} ${(it.yb + drop * 0.35).toFixed(1)} ${lx.toFixed(1)} ${y1.toFixed(1)}`;
          attr(L.path, "d", d);
          const u = E.io2(pr(t, L.at - 0.05, 0.35));
          draw(L.path, L.path.getTotalLength(), u);
          attr(L.path, "opacity", t >= L.at - 0.05 && (it.f.x.until == null || t < it.f.x.until + 0.3) ? 0.9 * (it.f.x.until != null ? 1 - pr(t, it.f.x.until, 0.3) : 1) : 0);
          L.lab.style.left = lx.toFixed(1) + "px";
          L.lab.style.top = (y1 + 6).toFixed(1) + "px";
          L.lab.style.transform = "translateX(-50%)";
          const v = it.f.x.until != null ? 1 - pr(t, it.f.x.until, 0.3) : 1;
          vis(L.lab, t >= L.at + 0.2 ? v : 0);
          L.W.render(t, L.at + 0.2, 30);
        });
      },
    };
  }

  // ---------------- the closing statement ----------------
  const LAT = /^[A-Za-z0-9.%+×\/–\-]+$/;
  const PUNCT = /^[，。、：；！？,.;:!?）)」』”"']$/;
  /* title(story, { size, top, maxW, lead, until, qed }) — the closing line as a statement: Noto Serif SC 900, centred near
   * the top over a shade, word-timed (every glyph waits at 20 % and fills as it is spoken), emphasis from
   * story.end.emphasis in rose with a soft underline, and a ∎ when the line is done. One row when it fits at ≥ 84 px,
   * else split after 「，」/「；」/「：」 into balanced rows. Mount .el in screen space. render(t). */
  function title(story, o = {}) {
    const end = story.end;
    const L = story.line(end.line), W = L.words;
    const root = el("div", "kit-title");
    const shade = el("div", "kit-title-shade", root);
    const maxW = o.maxW || 1700, maxS = o.size || 104;
    const uem = (u) => (LAT.test(u) ? 0.56 * u.length + 0.25 : Array.from(u).length * 1.04);
    const rowEm = (a, b, last) => { let n = 0; for (let k = a; k <= b; k++) n += uem(W[k][0]); return n + (last && o.qed !== false ? 0.9 : 0); };
    const n = W.length;
    let rows = [[0, n - 1]];
    let size = Math.min(maxS, Math.floor(maxW / rowEm(0, n - 1, true)));
    if (size < 84) {
      const cand = [];
      W.forEach(([u], k) => { if (k < n - 1 && /^[，；：]$/.test(u)) cand.push(k); });
      let best = null;
      for (const k of cand) {
        const m = Math.max(rowEm(0, k, false), rowEm(k + 1, n - 1, true));
        if (!best || m < best.m) best = { k, m };
      }
      for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
        const m = Math.max(rowEm(0, cand[i], false), rowEm(cand[i] + 1, cand[j], false), rowEm(cand[j] + 1, n - 1, true));
        if (best && Math.floor(maxW / best.m) >= 72) break;
        if (!best || m < best.m * 0.85) best = { k: cand[i], k2: cand[j], m };
      }
      if (best) {
        rows = best.k2 != null ? [[0, best.k], [best.k + 1, best.k2], [best.k2 + 1, n - 1]] : [[0, best.k], [best.k + 1, n - 1]];
        size = Math.min(maxS, Math.floor(maxW / best.m));
      }
    }
    const emph = {};
    (end.emphasis || []).forEach((p) => { const r = findRange(W, p); if (r) for (let k = r[0]; k <= r[1]; k++) emph[k] = 1; });
    const top = o.top ?? 128;
    const G = [];
    let qed = null;
    rows.forEach((r, ri) => {
      const row = el("div", "kit-title-row", root);
      row.style.fontSize = size + "px";
      row.style.top = (top + ri * size * 1.22).toFixed(0) + "px";
      for (let k = r[0]; k <= r[1]; k++) {
        const [u, tu] = W[k];
        const next = k + 1 < n ? W[k + 1][1] : L.end;
        const cs = LAT.test(u) ? [u] : Array.from(u);
        const span = Math.min(Math.max(next - tu, 0.05), 0.07 * cs.length + 0.05);
        if (k > r[0] && LAT.test(u) && !PUNCT.test(W[k - 1][0])) row.appendChild(document.createTextNode(" "));
        cs.forEach((ch, j) => {
          const s = el("span", "kit-tg" + (emph[k] ? " em" : "") + (LAT.test(u) ? " lat" : ""), row, ch);
          s.setAttribute("data-layout-allow-overlap", "");
          G.push({ s, at: tu + (span * j) / cs.length });
        });
      }
      if (ri === rows.length - 1 && o.qed !== false) qed = el("span", "kit-qed", row, "∎");
    });
    const rowsH = rows.length * size * 1.22;
    shade.style.height = Math.max(420, top + rowsH + 220).toFixed(0) + "px";
    const until = o.until ?? (story.recap ? story.recap.start : Infinity);
    const lead = o.lead ?? 0.6;
    const lastAt = G.length ? G[G.length - 1].at : end.start;
    return {
      el: root, size, rows, top, bottom: top + rowsH,
      render(t) {
        const v = E.o2(pr(t, end.start - lead, 0.5)) * (1 - pr(t, until - 0.1, 0.4));
        show(root, v);
        if (v <= 0) return;
        for (const c of G) {
          const f = E.o2(pr(t, c.at - 0.03, 0.18)).toFixed(3);
          if (c._f !== f) { c.s.style.setProperty("--lit", f); c._f = f; }
        }
        if (qed) {
          const q = E.back(pr(t, lastAt + 0.35, 0.35));
          vis(qed, t >= lastAt + 0.35 ? 1 : 0);
          tr(qed, `scale(${(0.3 + 0.7 * q).toFixed(3)})`);
        }
      },
    };
  }

  // ---------------- the one-frame recap: the derivation as a proof ----------------
  /* recap(story, { kicker, picture, anchor }) — ONE composed frame from story.recap. Left: the kicker, the centre term
   * (STIX italic; a CJK term upright in the serif), the tagline written in rose; right: the numbered steps on a spine,
   * ⇓ between them, a dot running down the spine once they are built. picture: true | { aspect } reserves a zone under
   * the tagline (recap.zone, sized to the canvas aspect) where the film shows its whole canvas, pulled back;
   * anchor(i, t) → { x, y, w, h } (or [x, y]) in screen px frames step i's region of that picture and pins the step's
   * number on its corner. Without a picture the left column is centred and the frame slowly pushes in. */
  function recap(story, o = {}) {
    const R = story.recap;
    const root = el("div", "kit-recap");
    const inner = el("div", "kit-recap-in", root);
    inner.style.cssText = "position:absolute;inset:0;transform-origin:50% 50%";
    const lay = svg("svg", { class: "kit-svg", width: 1920, height: 1080, viewBox: "0 0 1920 1080", style: "left:0;top:0" }, inner);
    const pic = !!o.picture;
    const cName = R.center || story.title || "";
    const cjk = /[\u3400-\u9fff]/.test(cName); // a CJK centre term is set upright in the serif (STIX has no CJK)
    const cSize = Math.min(pic ? 96 : 120, Math.floor(820 / Math.max(1, em(cName) * (cjk ? 1.06 : 0.92))));
    const tagText = R.tagline || story.data.subtitle || "";
    const tagLines = Math.max(1, Math.ceil((em(tagText) * 46 * 1.03) / 760));
    const tagH = tagText ? tagLines * 60 : 0;
    // left column: kicker, centre term, tagline — and, with a picture, the zone under it (sized to the canvas aspect);
    // the whole block is centred vertically so a wide canvas does not leave the column half empty
    const cGap = 56, cH = cSize * (cjk ? 1.2 : 1); // kicker → term; a CJK serif term needs its taller line box
    const headH = cGap + cH + 26 + tagH;
    let Y0 = Math.round((1080 - headH) / 2) - 20, zone = null;
    if (pic) {
      const avail = Math.max(220, 1000 - (104 + headH + 44));
      const asp = o.picture.aspect || 860 / avail;
      const zH = Math.min(avail, 860 / asp), zW = Math.min(860, zH * asp);
      Y0 = Math.max(104, Math.round((1080 - (headH + 44 + zH)) / 2));
      zone = { x: 96, y: Y0 + headH + 44, w: zW, h: zH };
    }
    const kick = el("div", "kit-recap-kicker", inner);
    kick.style.top = Y0 + "px";
    const KW = write(kick, o.kicker || "推演 · 回顾");
    const center = el("div", "kit-recap-c" + (cjk ? " cjk" : ""), inner, cName);
    center.style.fontSize = cSize + "px";
    center.style.top = Y0 + cGap + "px";
    const tag = el("div", "kit-recap-tag", inner);
    tag.style.top = (Y0 + cGap + cH + 26).toFixed(0) + "px";
    const tagG = Array.from(tagText).map((ch, j) => {
      const s = el("span", "kit-tg em", tag, ch);
      s.setAttribute("data-layout-allow-overlap", "");
      return { s, at: R.start + 0.55 + j * 0.055 };
    });
    const frame = pic ? el("div", "kit-recap-frame", inner) : null;
    if (frame) Object.assign(frame.style, { left: zone.x - 16 + "px", top: zone.y - 16 + "px", width: zone.w + 32 + "px", height: zone.h + 32 + "px" });
    // the steps
    const n = R.points.length;
    const est = (p) => 54 + Math.max(1, Math.ceil((em(p.text || "") * 28) / 700)) * 39;
    const hs = R.points.map(est), total = hs.reduce((a, b) => a + b, 0);
    const gapY = n > 1 ? Math.min(70, Math.max(26, (850 - total) / (n - 1))) : 0;
    let y = Math.round((1080 - (total + gapY * (n - 1))) / 2) - 10;
    const sx = 1067;
    const P = R.points.map((p, i) => {
      const box = el("div", "kit-recap-pt", inner);
      box.style.top = y.toFixed(0) + "px";
      const bub = el("span", "kit-recap-bub", box, String(p.n ?? i + 1));
      const tt = el("div", "kit-recap-pt-t", box, p.title || "");
      const tx = el("div", "kit-recap-pt-x", box, p.text || "");
      const by = y + 27;
      const a = R.start + 0.7 + i * 0.32;
      let opEl = null;
      if (i > 0) { opEl = el("div", "kit-recap-op", inner, "⇓"); opEl.style.left = sx - 52 + "px"; opEl.style.top = (by - gapY / 2 - hs[i - 1] / 2 + 6).toFixed(0) + "px"; }
      // anchored: a frame round the step's region of the picture and the step's number on its corner
      const lead = o.anchor ? svg("rect", { fill: "none", stroke: rgba("accent", 0.7), "stroke-width": 2, "stroke-dasharray": "7 7", rx: 12 }, lay) : null;
      const pin = o.anchor ? el("span", "kit-recap-bub kit-recap-pin", inner, String(p.n ?? i + 1)) : null;
      const out = { box, bub, tt, tx, by, a, opEl, lead, pin, i };
      y += hs[i] + gapY;
      return out;
    });
    const sy0 = P.length ? P[0].by : 0, sy1 = P.length ? P[P.length - 1].by : 0;
    const spine = svg("path", { d: `M ${sx} ${sy0} L ${sx} ${sy1}`, fill: "none", stroke: rgba("accent", 0.55), "stroke-width": 2.5 }, lay);
    const runner = svg("circle", { r: 7, fill: T.accent, class: "kit-glow", style: `color:${T.accent}` }, lay);
    lay.appendChild(runner);
    const S = R.start;
    return {
      el: root, zone,
      render(t) {
        show(root, t >= S - 0.05 ? 1 : 0);
        if (t < S - 0.05) return;
        if (!pic) tr(inner, `scale(${(1 + 0.022 * pr(t, S, R.end - S)).toFixed(4)})`);
        KW.render(t, S, 40);
        const c = E.o3(pr(t, S + 0.15, 0.4));
        vis(center, c);
        tr(center, `translateY(${((1 - c) * 16).toFixed(1)}px)`);
        vis(tag, t >= S + 0.5 ? 1 : 0);
        for (const g2 of tagG) {
          const f = E.o2(pr(t, g2.at, 0.2)).toFixed(3);
          if (g2._f !== f) { g2.s.style.setProperty("--lit", f); g2._f = f; }
        }
        if (frame) vis(frame, 0.8 * pr(t, S + 0.2, 0.4));
        draw(spine, Math.max(1, sy1 - sy0), E.io2(pr(t, S + 0.6, 0.32 * Math.max(1, n - 1) + 0.2)));
        vis(spine, t >= S + 0.6 ? 1 : 0);
        P.forEach((p) => {
          const b = E.back(pr(t, p.a, 0.3));
          vis(p.bub, pr(t, p.a, 0.1));
          tr(p.bub, `scale(${(0.4 + 0.6 * b).toFixed(3)})`);
          const f = E.o3(pr(t, p.a + 0.08, 0.35));
          vis(p.tt, f);
          tr(p.tt, `translateX(${((1 - f) * 18).toFixed(1)}px)`);
          vis(p.tx, E.o2(pr(t, p.a + 0.2, 0.35)));
          if (p.opEl) vis(p.opEl, E.o2(pr(t, p.a - 0.12, 0.25)));
          if (p.lead) {
            const A = o.anchor(p.i, t);
            if (!A) { vis(p.lead, 0); vis(p.pin, 0); return; }
            const rx = A.x ?? A[0], ry = A.y ?? A[1], rw = A.w || 0, rh = A.h || 0;
            if (rw > 0) {
              attr(p.lead, "x", rx); attr(p.lead, "y", ry); attr(p.lead, "width", rw); attr(p.lead, "height", rh);
              draw(p.lead, 2 * (rw + rh), E.io2(pr(t, p.a + 0.05, 0.5)));
            }
            vis(p.lead, t >= p.a + 0.05 && rw > 0 ? 1 : 0);
            const q = E.back(pr(t, p.a, 0.3));
            p.pin.style.left = (rx - 22).toFixed(1) + "px";
            p.pin.style.top = (ry - 22).toFixed(1) + "px";
            tr(p.pin, `scale(${(0.82 * Math.max(0, q)).toFixed(3)})`);
            vis(p.pin, t >= p.a ? 1 : 0);
          }
        });
        // after the build only the runner moves: a dot down the spine, again and again
        const t0 = S + 0.9 + 0.32 * n;
        if (t < t0 || n < 2) { vis(runner, 0); return; }
        const ph = ((t - t0) / 1.6) % 1;
        attr(runner, "cx", sx); attr(runner, "cy", sy0 + (sy1 - sy0) * E.io2(ph));
        vis(runner, Math.sin(Math.PI * ph) * pr(t, t0, 0.3));
      },
    };
  }

  // ---------------- style extras: the geometry of a derivation ----------------
  /* stroke(layer, { d, tone, width, dash, arrow, glow, opacity }) — a path that draws on (solid or dashed; a dashed one is
   * revealed through a mask so the dash pattern stays put), with an optional arrowhead riding the tip.
   * render(t, a, dur, b) → progress; point(u) → {x, y}. */
  let maskN = 0;
  function stroke(layer, o) {
    const col = tone(o.tone || "ink"), w = o.width || 2.5;
    const grp = svg("g", {}, layer);
    if (o.glow) { grp.setAttribute("class", "kit-glow"); grp.style.color = col; }
    const p = svg("path", { d: o.d, fill: "none", stroke: col, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, grp);
    const len = p.getTotalLength();
    let mp = null;
    if (o.dash) {
      p.setAttribute("stroke-dasharray", o.dash);
      const id = "kit-m" + ++maskN;
      const m = svg("mask", { id, maskUnits: "userSpaceOnUse", x: -20000, y: -20000, width: 60000, height: 60000 }, grp);
      mp = svg("path", { d: o.d, fill: "none", stroke: "#fff", "stroke-width": w + 8, "stroke-linecap": "round" }, m);
      p.setAttribute("mask", `url(#${id})`);
    }
    const head = o.arrow ? svg("path", { d: `M 0 0 L ${-3.6 * w - 6} ${-1.6 * w - 3} L ${-3.6 * w - 6} ${1.6 * w + 3} Z`, fill: col }, grp) : null;
    const base = o.opacity ?? 1;
    return {
      el: grp, path: p, len,
      point: (u) => p.getPointAtLength(clamp01(u) * len),
      render(t, a = 0, dur = 0.5, b = Infinity) {
        const u = E.io2(pr(t, a, dur));
        const v = (t >= a ? 1 : 0) * (1 - pr(t, b, 0.3));
        vis(grp, v * base);
        if (v <= 0) return 0;
        draw(mp || p, len, u);
        if (head) {
          const q = p.getPointAtLength(u * len), q0 = p.getPointAtLength(Math.max(0, u * len - 2));
          const ang = (Math.atan2(q.y - q0.y, q.x - q0.x) * 180) / Math.PI;
          attr(head, "transform", `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
          vis(head, u > 0.02 ? 1 : 0);
        }
        return u;
      },
    };
  }
  /* brace(layer, { x1, y1, x2, y2, depth, tone, width }) — a curly brace from (x1, y1) to (x2, y2), its tip bulging to
   * the left of the direction of travel (swap the ends to flip). render(t, a, dur, b). tip → {x, y}. */
  function brace(layer, o) {
    const { x1, y1, x2, y2 } = o, dep = o.depth ?? 22;
    const dx = x2 - x1, dy = y2 - y1, Lh = Math.hypot(dx, dy) || 1;
    const ux = dx / Lh, uy = dy / Lh, nx = uy, ny = -ux;
    const P = (s, k) => [x1 + ux * s + nx * k, y1 + uy * s + ny * k].map((v) => v.toFixed(1)).join(" ");
    const h = Lh / 2, q = dep / 2;
    const d = `M ${P(0, 0)} Q ${P(0, q)} ${P(Math.min(dep, h / 2), q)} L ${P(h - Math.min(dep, h / 2), q)} Q ${P(h, q)} ${P(h, dep)} Q ${P(h, q)} ${P(h + Math.min(dep, h / 2), q)} L ${P(Lh - Math.min(dep, h / 2), q)} Q ${P(Lh, q)} ${P(Lh, 0)}`;
    const s = stroke(layer, { d, tone: o.tone || "ink", width: o.width || 2.5 });
    s.tip = { x: x1 + ux * h + nx * dep, y: y1 + uy * h + ny * dep };
    return s;
  }
  /* box(parent, { x, y, w, h, text, tone, cls, size }) — a rounded box on the canvas (a token, a chip, a cell). */
  function box(parent, o) {
    const e = el("div", "kit-box" + (o.tone ? " tone-" + o.tone : "") + (o.cls ? " " + o.cls : ""), parent);
    if (o.text != null) e.innerHTML = o.html ? o.text : esc(o.text);
    Object.assign(e.style, { left: o.x + "px", top: o.y + "px", width: o.w + "px", height: o.h + "px" });
    if (o.size) e.style.fontSize = o.size + "px";
    if (o.r != null) e.style.borderRadius = o.r + "px";
    return e;
  }
  /* dots(layer, { x, y, n, cols, pitch, r, shape }) — a lattice of dots: shape "tri" (row k has k + 1 dots — the triangle
   * of a sum) or "grid" (n rows × cols). Each dot = { g, core, ring, arc, x, y, r, c }; paint(d, p) sets its look from
   * p = { s, fill, fillA, ring, ringA, dash, arc, glow } (tones or colours, 0..1 alphas, s = scale). x(c), y(r) give
   * centres. The ↻ arc marks a recomputation. */
  function dots(layer, o) {
    const pitch = o.pitch || 64, r0 = o.r || 12, n = o.n || 8;
    const root = svg("g", {}, layer);
    const X = (c) => o.x + c * pitch, Y = (r) => o.y + r * pitch;
    const rows = [];
    for (let r = 0; r < n; r++) {
      const cnt = o.shape === "grid" ? o.cols || n : r + 1, row = [];
      for (let c = 0; c < cnt; c++) {
        const gg = svg("g", { transform: `translate(${X(c)} ${Y(r)})` }, root);
        const ring = svg("circle", { r: r0, fill: "none", stroke: T.ink, "stroke-width": 2.6, opacity: 0 }, gg);
        const core = svg("circle", { r: r0, fill: T.ink, opacity: 0 }, gg);
        const a = r0 * 0.46;
        const arc = svg("path", { d: `M ${a} 0 A ${a} ${a} 0 1 1 ${(a * Math.cos(-0.9)).toFixed(2)} ${(a * Math.sin(-0.9)).toFixed(2)} M ${(a * Math.cos(-0.9) + 3.4).toFixed(2)} ${(a * Math.sin(-0.9) - 1.2).toFixed(2)} L ${(a * Math.cos(-0.9)).toFixed(2)} ${(a * Math.sin(-0.9)).toFixed(2)} L ${(a * Math.cos(-0.9) + 0.6).toFixed(2)} ${(a * Math.sin(-0.9) + 3.6).toFixed(2)}`, fill: "none", stroke: T.ink, "stroke-width": 2, "stroke-linecap": "round", opacity: 0 }, gg);
        row.push({ g: gg, core, ring, arc, x: X(c), y: Y(r), r, c });
      }
      rows.push(row);
    }
    function paint(d, p) {
      const s = Math.max(0, p.s ?? 1);
      attr(d.g, "transform", `translate(${(p.x ?? d.x).toFixed(1)} ${(p.y ?? d.y).toFixed(1)}) scale(${s.toFixed(3)})`);
      const fa = p.fill ? p.fillA ?? 1 : 0, ra = p.ring ? p.ringA ?? 1 : 0, aa = p.arc || 0;
      if (p.fill) attr(d.core, "fill", tone(p.fill));
      attr(d.core, "opacity", fa);
      if (p.ring) attr(d.ring, "stroke", tone(p.ring));
      attr(d.ring, "opacity", ra);
      attr(d.ring, "stroke-dasharray", p.dash ? "4 5" : "none");
      if (aa > 0) attr(d.arc, "stroke", tone(p.ring || p.fill || "ink"));
      attr(d.arc, "opacity", aa);
      const gl = p.glow || 0;
      const f = gl > 0.01 ? `drop-shadow(0 0 ${(4 + 8 * gl).toFixed(1)}px ${rgba(p.fill || p.ring || "ink", 0.9 * gl)})` : "none";
      if (d.g._fl !== f) { d.g.style.filter = f; d.g._fl = f; }
      const v = s > 0.001 && (fa > 0 || ra > 0) ? "inherit" : "hidden";
      if (d.g._vis !== v) { d.g.style.visibility = v; d.g._vis = v; }
    }
    return { el: root, rows, dot: (r, c) => rows[r] && rows[r][c], x: X, y: Y, paint, pitch };
  }
  /* plane(layer, { cx, cy, R }) — the vector plane: a circle, a dashed half-radius ring and two axes, drawn on with
   * render(t, a). vector({ ang, len, tone, width, label, labelSize, glow }) → { render(t, a, { ang, len, op, w }),
   * tip(ang?, len?) }: an arrow from the centre (ang in degrees, counter-clockwise; len in R) that grows from a.
   * project(from, onto, { tone }) → { render(t, a, angFrom, angOnto) }: the dashed perpendicular from one tip onto the
   * other's direction, and the projection's length lit along it (the dot product, drawn). */
  function plane(layer, o) {
    const { cx, cy, R } = o;
    const root = svg("g", {}, layer);
    const circ = stroke(root, { d: `M ${cx + R} ${cy} A ${R} ${R} 0 1 0 ${cx - R} ${cy} A ${R} ${R} 0 1 0 ${cx + R} ${cy}`, tone: T.faint, width: 2 });
    const half = stroke(root, { d: `M ${cx + R / 2} ${cy} A ${R / 2} ${R / 2} 0 1 0 ${cx - R / 2} ${cy} A ${R / 2} ${R / 2} 0 1 0 ${cx + R / 2} ${cy}`, tone: T.faint, width: 1.5, dash: "4 8" });
    const ax = stroke(root, { d: `M ${cx - R - 30} ${cy} L ${cx + R + 30} ${cy}`, tone: T.faint, width: 1.5 });
    const ay = stroke(root, { d: `M ${cx} ${cy + R + 30} L ${cx} ${cy - R - 30}`, tone: T.faint, width: 1.5 });
    const vecLayer = svg("g", {}, root);
    const tipOf = (ang, len) => ({ x: cx + Math.cos((ang * Math.PI) / 180) * len * R, y: cy - Math.sin((ang * Math.PI) / 180) * len * R });
    function vector(v) {
      const col = tone(v.tone || "k"), w = v.width || 3;
      const gg = svg("g", {}, vecLayer);
      if (v.glow) { gg.setAttribute("class", "kit-glow"); gg.style.color = col; }
      const line = svg("line", { x1: cx, y1: cy, x2: cx, y2: cy, stroke: col, "stroke-width": w, "stroke-linecap": "round" }, gg);
      const head = svg("path", { d: `M 0 0 L ${-3.4 * w - 7} ${-1.5 * w - 4} L ${-3.4 * w - 7} ${1.5 * w + 4} Z`, fill: col }, gg);
      const lab = v.label != null ? svg("text", { "text-anchor": "middle", style: `fill:${col};font-size:${v.labelSize || 28}px` }, gg) : null;
      if (lab) { lab.textContent = v.label; if (v.math) lab.setAttribute("class", "kit-tm"); }
      return {
        el: gg,
        tip: (ang = v.ang, len = v.len ?? 0.8) => tipOf(ang, len),
        render(t, a = 0, q = {}) {
          const ang = q.ang ?? v.ang, len = (q.len ?? v.len ?? 0.8) * E.o3(pr(t, a, 0.45));
          const vv = (t >= a ? 1 : 0) * (q.op ?? 1);
          vis(gg, vv);
          if (vv <= 0) return;
          const p = tipOf(ang, len);
          attr(line, "x2", p.x); attr(line, "y2", p.y);
          if (q.w) attr(line, "stroke-width", q.w);
          attr(head, "transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(-ang).toFixed(1)})`);
          if (lab) {
            const L2 = tipOf(ang, len + (v.labelR ?? 0.16));
            attr(lab, "x", L2.x); attr(lab, "y", L2.y + 9);
            attr(lab, "opacity", pr(t, a + 0.3, 0.25));
          }
        },
      };
    }
    function project(from, onto, q = {}) {
      const col = tone(q.tone || from.tone || "accent");
      const gg = svg("g", {}, vecLayer);
      const perp = svg("line", { stroke: col, "stroke-width": 2, "stroke-dasharray": "5 6", opacity: 0 }, gg);
      const seg = svg("line", { stroke: col, "stroke-width": 7, "stroke-linecap": "round", opacity: 0 }, gg);
      return {
        el: gg,
        render(t, a, angF, lenF, angO) {
          const u = E.io2(pr(t, a, 0.45));
          vis(gg, t >= a ? 1 : 0);
          if (t < a) return 0;
          const A = tipOf(angF, lenF);
          const ux = Math.cos((angO * Math.PI) / 180), uy = -Math.sin((angO * Math.PI) / 180);
          const d = (A.x - cx) * ux + (A.y - cy) * uy;
          const fx = cx + ux * d, fy = cy + uy * d;
          attr(perp, "x1", A.x); attr(perp, "y1", A.y);
          attr(perp, "x2", lerp(A.x, fx, u)); attr(perp, "y2", lerp(A.y, fy, u));
          attr(perp, "opacity", 0.85);
          const w = E.o3(pr(t, a + 0.35, 0.4));
          attr(seg, "x1", cx); attr(seg, "y1", cy);
          attr(seg, "x2", cx + (fx - cx) * w); attr(seg, "y2", cy + (fy - cy) * w);
          attr(seg, "opacity", 0.55 * w);
          return d / R;
        },
      };
    }
    return {
      el: root, cx, cy, R, vector, project, tip: tipOf, layer: vecLayer,
      render(t, a = 0, b = Infinity) {
        const v = 1 - pr(t, b, 0.3);
        vis(root, t >= a ? v : 0);
        circ.render(t, a, 0.7); half.render(t, a + 0.2, 0.6); ax.render(t, a + 0.1, 0.45); ay.render(t, a + 0.15, 0.45);
      },
    };
  }
  /* plot(layer, { x, y, w, h, xMax, yMax, xLabel, yLabel, xTicks, tone }) — axes for a result. px(v), py(v) map data to
   * layer px; render(t, a) draws the axes and writes the axis titles. line(pts | fn, { tone, width, dash, glow, from, to,
   * samples }) → stroke-like { render(t, a, dur, b), point(u) }. */
  function plot(layer, o) {
    const { x, y, w, h } = o;
    const root = svg("g", {}, layer);
    const px = (v) => x + (v / (o.xMax || 1)) * w, py = (v) => y + h - (v / (o.yMax || 1)) * h;
    const axX = stroke(root, { d: `M ${x} ${y + h} L ${x + w + 24} ${y + h}`, tone: T.muted, width: 2, arrow: true });
    const axY = stroke(root, { d: `M ${x} ${y + h} L ${x} ${y - 24}`, tone: T.muted, width: 2, arrow: true });
    const xl = o.xLabel ? svg("text", { x: x + w + 24, y: y + h + (o.xTicks && o.xTicks.length ? 84 : 52), "text-anchor": "end", style: `fill:${T.muted};font-size:26px` }, root) : null;
    if (xl) xl.textContent = o.xLabel;
    const yl = o.yLabel ? svg("text", { x: x - 2, y: y - 46, style: `fill:${T.ink};font-size:28px;font-weight:700` }, root) : null;
    if (yl) yl.textContent = o.yLabel;
    const ticks = (o.xTicks || []).map((v) => {
      const tx = svg("text", { x: px(v), y: y + h + 36, "text-anchor": "middle", class: "kit-tn" }, root);
      tx.textContent = String(v);
      return tx;
    });
    const lines = svg("g", {}, root);
    function line(src, q = {}) {
      let pts = src;
      if (typeof src === "function") {
        const a = q.from ?? 0, b = q.to ?? (o.xMax || 1), n = q.samples || 40;
        pts = [];
        for (let i = 0; i <= n; i++) { const v = a + ((b - a) * i) / n; pts.push([v, src(v)]); }
      }
      const d = pts.map(([vx, vy], i) => `${i ? "L" : "M"} ${px(vx).toFixed(1)} ${py(vy).toFixed(1)}`).join(" ");
      return stroke(lines, { d, tone: q.tone || "accent", width: q.width || 4, dash: q.dash, glow: q.glow, arrow: q.arrow });
    }
    return {
      el: root, px, py, line, layer: lines, x, y, w, h,
      render(t, a = 0, b = Infinity) {
        const v = 1 - pr(t, b, 0.3);
        vis(root, t >= a ? v : 0);
        axX.render(t, a, 0.5); axY.render(t, a + 0.1, 0.5);
        if (xl) attr(xl, "opacity", pr(t, a + 0.4, 0.3));
        if (yl) attr(yl, "opacity", pr(t, a + 0.3, 0.3));
        ticks.forEach((tx, i) => attr(tx, "opacity", pr(t, a + 0.3 + i * 0.04, 0.2)));
      },
    };
  }
  /* camera(worldEl, keys) — the glide over the canvas. keys: [[t, cx, cy, scale, rot°], ...] through core.track
   * (monotone Hermite, Fritsch–Carlson limited); (cx, cy) is the world point at the frame centre. render(t) → values. */
  function camera(worldEl, keys) {
    return {
      keys,
      at: (t) => track(keys, t),
      apply(c) {
        worldEl.style.transform = `translate(960px,540px) rotate(${c[3].toFixed(3)}deg) scale(${c[2].toFixed(4)}) translate(${(-c[0]).toFixed(2)}px,${(-c[1]).toFixed(2)}px)`;
        return c;
      },
      render(t) { return this.apply(track(keys, t)); },
      // world point → screen point for camera values c (for overlays pinned to the canvas)
      screen(c, wx, wy) {
        const r = (c[3] * Math.PI) / 180, s = c[2], dx = (wx - c[0]) * s, dy = (wy - c[1]) * s;
        return [960 + dx * Math.cos(r) - dy * Math.sin(r), 540 + dx * Math.sin(r) + dy * Math.cos(r)];
      },
    };
  }
  /* canvas(world, { x, y, w, h }) — the dot-grid sheet under everything (world px; make it larger than the stations). */
  function canvas(world, o) {
    const c = el("div", "kit-canvas", null);
    Object.assign(c.style, { left: o.x + "px", top: o.y + "px", width: o.w + "px", height: o.h + "px" });
    world.insertBefore(c, world.firstChild);
    return c;
  }
  /* backdrop(container) — screen furniture: the vignette and the soft shade under the caption band. Returns { shade }. */
  function backdrop(container) {
    el("div", "kit-vig", container);
    return { shade: el("div", "kit-capshade", container) };
  }
  /* chapters(el, story) — core.Chapters dressed as 「● 推演 01 · title」 (the kit only adds the dot, the word and the dot
   * separator; numbers and titles stay core's). render(t). */
  function chapters(host, story, o = {}) {
    const ch = new C.Chapters(host, story, { format: o.format || ((n) => String(n).padStart(2, "0")) });
    const dot = el("i", "kit-chap-dot");
    const k = el("span", "kit-chap-k", null, o.word || "推演");
    const sep = el("span", "kit-chap-sep", null, "·");
    host.insertBefore(k, ch.n);
    host.insertBefore(dot, k);
    host.insertBefore(sep, ch.ti);
    return ch;
  }
  /* captions(container, story, opts) — core.Captions (skipEnd, air 0.2, clamp by default) + this style's dress: single
   * lower-case letters are set as math (q, k, v, n), and keys(line, [phrase | { text, tone }]) paints a phrase in its
   * binding colour with a soft underline (tone q / accent = rose, k = teal, v = amber, warn). render(t). */
  function captions(container, story, opts = {}) {
    const caps = new C.Captions(container, story, Object.assign({ skipEnd: true, air: 0.2, clamp: true }, opts));
    const endLine = caps.boxes.length < story.lines.length && story.end ? story.end.line : null;
    const byLine = {};
    if (!opts.groups) story.lines.filter((L) => L.i !== endLine).forEach((L, k) => (byLine[L.i] = caps.boxes[k]));
    caps.boxes.forEach((b) => b.spans.forEach(({ s }) => { if (/^[a-z]\s?$/.test(s.textContent)) s.classList.add("kit-math"); }));
    caps.keys = function (line, list) {
      const b = byLine[line];
      if (!b) return caps;
      const W = story.line(line).words;
      (list || []).forEach((p) => {
        const text = typeof p === "string" ? p : p.text, tn = typeof p === "string" ? "q" : p.tone || "q";
        const r = findRange(W, text);
        if (!r) return;
        for (let k = r[0]; k <= r[1]; k++) {
          const s = b.spans[k] && b.spans[k].s;
          if (!s) continue;
          s.classList.add("kit-k");
          if (tn !== "q" && tn !== "accent") s.classList.add("tone-" + tn);
        }
      });
      return caps;
    };
    return caps;
  }

  g.Kit = {
    name: "v10-reasoning",
    tokens: T,
    // contract
    label, note, number, bars, formula, title, recap,
    // extras
    write, stmt, stroke, brace, box, dots, plane, plot, camera, canvas, backdrop, chapters, captions,
    util: { el, svg, op, show, vis, attr, draw, setText, tr, fmt, pulse, findRange, tone, rgba, em, parse, esc },
  };
})(window);
