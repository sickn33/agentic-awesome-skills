/* V5 comic kit — window.Kit for the explainer contract (see KIT.md).
 *
 * Load after lib/core.js and lib/story.js. Every factory returns { el, render(t, ...) } and render is a pure
 * function of t and its explicit arguments: no Math.random, no Date, no layout reads. Shapes (bursts, balloons,
 * rays) come from a seeded hash, so a frame is identical every time it is drawn.
 *
 * Motion vocabulary (shared by every piece): SLAM (falls from big with power4.in, lands, squashes, short
 * back.out rebound), POP (grows from small with back.out), RISE (slides up into place), GONE (shrinks and
 * fades). Impact frames, seeded screen shake, speed lines and the halftone dot wipe are extras.
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v5-comic: load lib/core.js before lib/kit/kit.js");
  const { clamp01, E, hash } = C;
  const NS = "http://www.w3.org/2000/svg";
  const COL = { ink: "#141414", paper: "#fff6e0", white: "#ffffff", accent: "#ff4fa3", blue: "#1c7bd1", yellow: "#ffe14d", warn: "#ff5a36", ok: "#2fbf5a" };
  const CJK = /[　-〿㐀-鿿＀-￯]/;
  const OPS = new Set(["×", "=", "≈", "+", "÷", "→", "−", "·"]);

  // ---------------- DOM helpers ----------------
  function mk(tag, cls, parent, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function hide(el) {
    if (el.style.visibility !== "hidden") { el.style.opacity = "0"; el.style.visibility = "hidden"; }
  }

  // ---------------- motion (pure) ----------------
  const p4in = (u) => u * u * u * u;
  function backOut(u, c1 = 1.6) { const c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
  const ZERO = (o, sx, sy, r) => ({ o, sx, sy, r, x: 0, y: 0 });

  /* slam(t, at, {s0=2.3, r0=-14, r=0, d=0.16, x0, y0}) -> null before `at`, else {o, sx, sy, r, x, y} */
  function slam(t, at, o = {}) {
    if (t < at) return null;
    const d = o.d ?? 0.16, s0 = o.s0 ?? 2.3, r0 = o.r0 ?? -14, r1 = o.r ?? 0;
    const u = (t - at) / d;
    if (u < 1) {
      const e = p4in(u), s = s0 + (1 - s0) * e;
      return { o: Math.min(1, 0.2 + u * 2.4), sx: s, sy: s, r: r0 + (r1 - r0) * e, x: (o.x0 || 0) * (1 - e), y: (o.y0 || 0) * (1 - e) };
    }
    const q = t - at - d;
    if (q < 0.05) { const a = E.o2(q / 0.05); return ZERO(1, 1 + 0.1 * a, 1 - 0.1 * a, r1); }
    if (q < 0.21) { const w = backOut((q - 0.05) / 0.16); return ZERO(1, 1.1 - 0.1 * w, 0.9 + 0.1 * w, r1); }
    return ZERO(1, 1, 1, r1);
  }
  /* pop(t, at, {s0=0.3, r0=0, r=0, d=0.26}) — grows with back.out */
  function pop(t, at, o = {}) {
    if (t < at) return null;
    const d = o.d ?? 0.26, s0 = o.s0 ?? 0.3, u = clamp01((t - at) / d), e = backOut(u, 1.7), s = s0 + (1 - s0) * e;
    const r0 = o.r0 ?? 0, r1 = o.r ?? 0, m = 1 - E.o3(u);
    return { o: clamp01(u * 3), sx: s, sy: s, r: r0 + (r1 - r0) * e, x: (o.x0 || 0) * m, y: (o.y0 || 0) * m };
  }
  /* rise(t, at, {y0=60, d=0.3}) — slides into place (power3.out) */
  function rise(t, at, o = {}) {
    if (t < at) return null;
    const u = clamp01((t - at) / (o.d ?? 0.3)), e = E.o3(u);
    return { o: clamp01(u * 2.5), sx: 1, sy: 1, r: o.r ?? 0, x: (o.x0 || 0) * (1 - e), y: (o.y0 ?? 60) * (1 - e) };
  }
  /* gone(t, end, d) -> 1 … 0 after `end` (power2.in) */
  function gone(t, end, d = 0.14) { if (end == null || t < end) return 1; return 1 - E.i2(clamp01((t - end) / d)); }
  const KINDS = { slam, pop, rise };

  /* show(el, t, at, end, o): write an entry (o.kind: "slam" | "pop" | "rise") and an exit to el.
   * o.base is a transform prefix kept in front (e.g. a centring translate). Returns true while visible. */
  function show(el, t, at, end, o = {}) {
    const st = (KINDS[o.kind] || slam)(t, at, o);
    const gg = gone(t, end, o.dOut ?? 0.14);
    if (!st || gg <= 0) { hide(el); return false; }
    const so = (o.sOut ?? 0.4) + (1 - (o.sOut ?? 0.4)) * gg;
    el.style.visibility = "visible";
    el.style.opacity = (st.o * gg).toFixed(3);
    el.style.transform = `${o.base || ""} translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) rotate(${st.r.toFixed(2)}deg) scale(${(st.sx * so).toFixed(3)}, ${(st.sy * so).toFixed(3)})`;
    return true;
  }

  // ---------------- shapes (seeded) ----------------
  function starPts(w, h, n, inner, seed) {
    const cx = w / 2, cy = h / 2, rx = w / 2 - 8, ry = h / 2 - 8, pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2 + (hash(seed + i * 1.37) - 0.5) * (Math.PI / n) * 0.4;
      const k = i % 2 === 0 ? 0.86 + hash(seed + i * 2.11) * 0.14 : inner * (0.86 + hash(seed + i * 3.3) * 0.28);
      pts.push((cx + Math.cos(a) * rx * k).toFixed(1) + "," + (cy + Math.sin(a) * ry * k).toFixed(1));
    }
    return pts.join(" ");
  }
  /* burst(svg, w, h, {n=12, inner=0.62, seed=1, fill=yellow, sw=7, shadow=8}) — a starburst sticker */
  function burst(el, w, h, o = {}) {
    const p = starPts(w, h, o.n ?? 12, o.inner ?? 0.62, o.seed ?? 1), sh = o.shadow ?? 8;
    el.setAttribute("viewBox", `0 0 ${w} ${h}`);
    el.innerHTML = (sh ? `<polygon points="${p}" transform="translate(${sh} ${sh})" fill="${COL.ink}"/>` : "") +
      `<polygon points="${p}" fill="${o.fill || COL.yellow}" stroke="${COL.ink}" stroke-width="${o.sw ?? 7}" stroke-linejoin="round"/>`;
    return el;
  }
  function makeBurst(parent, w, h, o = {}) {
    const s = svgEl("svg", { class: "kit-burst" }, parent);
    s.style.width = w + "px";
    s.style.height = h + "px";
    return burst(s, w, h, o);
  }
  /* shout(svg, w, h, {seed, tail:[x1,y1,tipx,tipy,x2,y2], fill}) — jagged shout balloon with a tail */
  function shout(el, w, h, o = {}) {
    const p = starPts(w, h, o.n ?? 24, o.inner ?? 0.86, o.seed ?? 51), tl = o.tail ? `<polygon points="${o.tail.join(",")}"/>` : "";
    el.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const f = o.fill || COL.white, st = `stroke="${COL.ink}" stroke-width="${o.sw ?? 6}" stroke-linejoin="round"`;
    el.innerHTML = `<g transform="translate(8 8)" fill="${COL.ink}">${tl}<polygon points="${p}"/></g>` +
      (o.tail ? `<polygon points="${o.tail.join(",")}" fill="${f}" ${st}/>` : "") + `<polygon points="${p}" fill="${f}" ${st}/>`;
    return el;
  }
  /* balloon(svg, w, h, {tail:[baseX, tipX, tipY], fill}) — a round speech balloon; the tail leaves the bottom edge */
  function balloon(el, w, h, o = {}) {
    const sw = o.sw ?? 6, r = Math.min(h / 2, 70), f = o.fill || COL.white, i = sw / 2 + 1;
    const body = `<rect x="${i}" y="${i}" width="${w - 2 * i - 10}" height="${h - 2 * i - 10 - (o.tail ? 60 : 0)}" rx="${r}" ry="${r}"/>`;
    const by = h - 10 - (o.tail ? 60 : 0) - i;
    const tw = o.tailW ?? 26;
    const tail = o.tail ? `<polygon points="${o.tail[0] - tw},${by - 4} ${o.tail[1]},${o.tail[2]} ${o.tail[0] + tw},${by - 4}"/>` : "";
    // a fill-only copy of the tail, inset, hides the body outline where the tail joins it
    const seam = o.tail ? `<polygon points="${o.tail[0] - tw + sw},${by - sw} ${o.tail[1]},${o.tail[2] - sw * 2.2} ${o.tail[0] + tw - sw},${by - sw}" fill="${f}"/>` : "";
    el.setAttribute("viewBox", `0 0 ${w} ${h}`);
    el.innerHTML = `<g transform="translate(8 8)" fill="${COL.ink}">${body}${tail}</g>` +
      `<g fill="${f}" stroke="${COL.ink}" stroke-width="${sw}" stroke-linejoin="round">${tail}${body}</g>` + seam;
    return el;
  }

  // ---------------- fx ----------------
  /* Shake(): seeded, decaying, frame-quantised screen shake. add(t, amp, dur) then offset(t) -> [x, y] */
  function Shake(fps = 30) {
    const L = [];
    return {
      list: L,
      add(t, a, d = 0.2) { L.push({ t, a, d }); return t; },
      offset(t) {
        let x = 0, y = 0;
        const step = Math.floor(t * fps + 1e-4);
        L.forEach((s, i) => {
          const u = (t - s.t) / s.d;
          if (u >= 0 && u < 1) {
            const k = Math.pow(1 - u, 2) * s.a;
            x += (hash(step * 13.1 + i * 7.7) * 2 - 1) * k;
            y += (hash(step * 29.3 + i * 3.1) * 2 - 1) * k * 0.7;
          }
        });
        return [x, y];
      },
    };
  }
  /* Rays(svg): two-frame impact flashes (yellow field + ink rays) behind the action. add(t, x, y); render(t) */
  function Rays(el, o = {}) {
    el.setAttribute("viewBox", "0 0 1920 1080");
    el.innerHTML = `<rect x="0" y="0" width="1920" height="1080" fill="${o.fill || COL.yellow}"/><path d="" fill="${COL.ink}"/>`;
    const path = el.lastChild, L = [], hold = o.hold ?? 0.062;
    return {
      add(t, x, y) { L.push({ t, x, y, d: null }); return t; },
      render(t) {
        let on = null;
        L.forEach((r) => { if (t >= r.t - 0.001 && t < r.t + hold) on = r; });
        if (!on) { el.style.opacity = "0"; el.style.visibility = "hidden"; return; }
        if (!on.d) {
          let d = "";
          for (let i = 0; i < 30; i++) {
            const a = (i / 30) * Math.PI * 2 + (hash(i * 3.3 + on.t) - 0.5) * 0.12, w = 0.03 + hash(i * 5.1 + on.t) * 0.035, r0 = 120 + hash(i * 7.7 + on.t) * 70, r1 = 1700;
            d += `M${(on.x + Math.cos(a) * r0).toFixed(1)} ${(on.y + Math.sin(a) * r0).toFixed(1)} L${(on.x + Math.cos(a - w) * r1).toFixed(1)} ${(on.y + Math.sin(a - w) * r1).toFixed(1)} L${(on.x + Math.cos(a + w) * r1).toFixed(1)} ${(on.y + Math.sin(a + w) * r1).toFixed(1)} Z `;
          }
          on.d = d;
        }
        path.setAttribute("d", on.d);
        el.style.visibility = "visible";
        el.style.opacity = "1";
      },
    };
  }
  /* Wipe(canvas, wipes): the halftone dot wipe. wipes: [{s, col, c:[x,y] (cover origin), r:[x,y] (reveal origin)}].
   * Dots grow to cover over 0.26 s before s, hold, then shrink from r over 0.33 s. render(t) */
  function Wipe(canvas, wipes, o = {}) {
    const ctx = canvas.getContext("2d"), G = o.grid ?? 48, RR = G * 0.63 + 1.5, lead = o.lead ?? 0.26, tail = o.tail ?? 0.36;
    return {
      wipes,
      active(t) { return wipes.some((w) => t >= w.s - lead && t <= w.s + tail); },
      render(t) {
        ctx.clearRect(0, 0, 1920, 1080);
        const on = this.active(t);
        canvas.style.visibility = on ? "visible" : "hidden";
        if (!on) return;
        wipes.forEach((w) => {
          const c0 = w.s - lead, r0 = w.s + 0.03, r1 = w.s + tail;
          if (t < c0 || t > r1) return;
          const cover = t < r0, org = cover ? w.c : w.r;
          const dmax = Math.max(Math.hypot(org[0], org[1]), Math.hypot(1920 - org[0], org[1]), Math.hypot(org[0], 1080 - org[1]), Math.hypot(1920 - org[0], 1080 - org[1]));
          const P = cover ? clamp01((t - c0) / (w.s - c0)) : clamp01((t - r0) / (r1 - r0));
          ctx.fillStyle = w.col || COL.accent;
          ctx.beginPath();
          for (let j = -1; j <= Math.ceil(1080 / G) + 1; j++) {
            for (let i = -1; i <= Math.ceil(1920 / G) + 1; i++) {
              const x = i * G + (j % 2 ? G / 2 : 0), y = j * G;
              const lp = clamp01((P - (Math.hypot(x - org[0], y - org[1]) / dmax) * 0.5) / 0.5);
              const rr = cover ? RR * E.o2(lp) : RR * (1 - E.o2(lp));
              if (rr < 0.4) continue;
              ctx.moveTo(x + rr, y);
              ctx.arc(x, y, rr, 0, Math.PI * 2);
            }
          }
          ctx.fill();
        });
      },
    };
  }
  /* Speed(svg, n): a pool of speed-line segments. flush([[x1, y1, x2, y2, width], ...]) each frame */
  function Speed(el, n = 70) {
    const pool = [];
    for (let i = 0; i < n; i++) {
      const ln = svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 0 }, el);
      ln.style.opacity = "0";
      pool.push(ln);
    }
    return {
      flush(segs) {
        for (let i = 0; i < pool.length; i++) {
          const ln = pool[i], s = segs[i];
          if (!s) { if (ln.style.opacity !== "0") ln.style.opacity = "0"; continue; }
          ln.setAttribute("x1", s[0].toFixed(1)); ln.setAttribute("y1", s[1].toFixed(1));
          ln.setAttribute("x2", s[2].toFixed(1)); ln.setAttribute("y2", s[3].toFixed(1));
          ln.setAttribute("stroke-width", s[4] || 5);
          ln.style.opacity = "1";
        }
      },
      /* trail(segs, from, to, u, o): three parallel streaks behind a mover going from→to at progress u */
      trail(segs, a, b, u, o = {}) {
        const len = o.len ?? 0.28, sp = o.gap ?? 14, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        if (u <= 0.02 || u >= 0.98) return;
        const nx = -dy / L, ny = dx / L, u0 = Math.max(0, u - len), u1 = Math.max(0, u - 0.06);
        for (let m = -1; m <= 1; m++) segs.push([a[0] + dx * u0 + nx * m * sp, a[1] + dy * u0 + ny * m * sp, a[0] + dx * u1 + nx * m * sp, a[1] + dy * u1 + ny * m * sp, m === 0 ? 5 : 4]);
      },
    };
  }
  /* sfx(text, {color, size, rot}) — an onomatopoeia ("POW!", "ZIP!", "SNIP!"). render(t, at, end, o) slams it */
  function sfx(text, o = {}) {
    const el = mk("div", "kit-sfx" + (CJK.test(text) ? " kit-cjk" : ""), null, text);
    if (o.color) el.style.color = o.color;
    if (o.size) el.style.fontSize = o.size + "px";
    hide(el);
    const rot = o.rot ?? -8;
    return { el, render(t, at, end = null, oo = {}) { return show(el, t, at, end, Object.assign({ s0: 2.2, r0: rot - 18, r: rot, d: 0.12 }, oo)); } };
  }

  // ---------------- contract components ----------------
  /* label({text, sub, tone}) — a sticker. tone: default (yellow) | accent | warn | ok | ink | blue | white.
   * render(t, at, end, o) slams it in at `at` (o: slam options, o.kind) and out at `end`. */
  function label({ text = "", sub = "", tone = "default" } = {}) {
    const el = mk("div", "kit-label" + (tone && tone !== "default" ? " kit-tone-" + tone : ""));
    mk("span", "kit-label-t", el, text);
    if (sub) mk("span", "kit-label-sub" + (CJK.test(sub) ? " kit-cjk" : ""), el, sub);
    hide(el);
    return { el, render(t, at = -1, end = null, o = {}) { return show(el, t, at, end, Object.assign({ s0: 1.9, r0: -10, r: -2, d: 0.14 }, o)); } };
  }
  /* note(text, {tag="说明"}) — the yellow narration box with an ink tag. render(t, at, end, o) */
  function note(text, opt = {}) {
    const el = mk("div", "kit-note");
    mk("span", "kit-note-tag", el, opt.tag ?? "说明");
    mk("span", "kit-note-t", el, text);
    hide(el);
    return { el, render(t, at = -1, end = null, o = {}) { return show(el, t, at, end, Object.assign({ s0: 1.6, r0: -6, r: -1.2, d: 0.14 }, o)); } };
  }
  /* number({value, unit, caption, decimals, prefix, burst}) — a lettered figure (pink with ink stroke).
   * render(t, u, at, end, o): count-up progress u 0..1 (omit u to keep a .set(v) value); optional slam at `at`. */
  function number({ value = 0, unit = "", caption = "", decimals = 0, prefix = "", burst: b = null } = {}) {
    const el = mk("div", "kit-num");
    const row = mk("div", "kit-num-row", el);
    row.style.isolation = "isolate";
    if (b) {
      const w = b.w || 440, h = b.h || 280, s = makeBurst(row, w, h, { n: b.n || 13, inner: b.inner || 0.64, seed: b.seed || 7, fill: b.fill });
      s.style.left = `calc(50% - ${w / 2}px)`;
      s.style.top = `calc(50% - ${h / 2}px)`;
    }
    const fmt = (x) => prefix + x.toFixed(decimals);
    const v = mk("span", "kit-num-v", row, fmt(0));
    const u = unit ? mk("span", "kit-num-u" + (CJK.test(unit) ? " kit-cjk" : ""), row, unit) : null;
    const c = caption ? mk("div", "kit-num-c", el, caption) : null;
    hide(el);
    const api = {
      el, v, u, c,
      set(x) { const s = typeof x === "number" ? fmt(x) : String(x); if (v.textContent !== s) v.textContent = s; return api; },
      render(t, uu, at = null, end = null, o = {}) {
        if (typeof uu === "number") api.set(value * clamp01(uu));
        if (at == null) { el.style.visibility = "visible"; el.style.opacity = "1"; return true; }
        return show(el, t, at, end, Object.assign({ s0: 2, r0: -8, r: 0, d: 0.14 }, o));
      },
    };
    return api;
  }
  /* bars({rows:[{label, value, max, tone, valueText, unit, decimals}], width, ease}) — striped comic gauges.
   * render(t, u, at, end, o): grow progress u 0..1 (rows stagger; ease "o3" default or "linear");
   * without valueText the value counts up with the fill. */
  function bars({ rows = [], width = null, ease = "o3" } = {}) {
    const EZ = ease === "linear" ? (x) => x : E[ease] || E.o3;
    const el = mk("div", "kit-bars");
    if (width) el.style.width = width + "px";
    const R = rows.map((r) => {
      const b = mk("div", "kit-bar", el), head = mk("div", "kit-bar-head", b);
      mk("span", "kit-bar-l", head, r.label);
      const v = mk("span", "kit-bar-v" + (r.valueText && CJK.test(r.valueText) ? " kit-cjk" : ""), head, r.valueText ?? "0");
      const f = mk("div", "kit-bar-fill kit-tone-" + (r.tone || "accent"), mk("div", "kit-bar-track", b));
      return { r, b, v, f };
    });
    hide(el);
    return {
      el, rows: R,
      render(t, u = 1, at = null, end = null, o = {}) {
        const n = R.length, st = n > 1 ? Math.min(0.25, 0.6 / (n - 1)) : 0;
        R.forEach((x, i) => {
          const ru = clamp01((u - i * st) / (1 - (n - 1) * st)), e = EZ(ru);
          x.f.style.transform = `scaleX(${((x.r.value / (x.r.max || 1)) * e).toFixed(4)})`;
          if (x.r.valueText != null) x.v.style.opacity = clamp01((ru - 0.55) / 0.3).toFixed(3);
          else x.v.textContent = (x.r.value * e).toFixed(x.r.decimals ?? 0) + (x.r.unit ?? "");
        });
        if (at == null) { el.style.visibility = "visible"; el.style.opacity = "1"; return true; }
        return show(el, t, at, end, Object.assign({ kind: "rise", y0: 70 }, o));
      },
    };
  }
  /* formula({terms:[{text, t, sub, tone, op}]}) — stickers and lettered operators; each term slams in at its t.
   * Operators are × = ≈ + ÷ → (or op:true). tone: accent | warn | yellow | blue. render(t, end) */
  function formula({ terms = [] } = {}) {
    const el = mk("div", "kit-formula");
    const T = terms.map((tm, i) => {
      const isOp = tm.op ?? OPS.has(String(tm.text).trim());
      let e;
      if (isOp) e = mk("span", "kit-f-op", el, tm.text);
      else {
        e = mk("span", "kit-f-term" + (tm.tone ? " kit-tone-" + tm.tone : ""), el);
        mk("span", "kit-f-main" + (CJK.test(tm.text) ? " kit-cjk" : ""), e, tm.text);
        if (tm.sub) mk("span", "kit-f-sub", e, tm.sub);
      }
      hide(e);
      return { tm, e, isOp, i };
    });
    return {
      el, terms: T,
      render(t, end = null) {
        el.style.visibility = "visible";
        T.forEach((x) => show(x.e, t, x.tm.t, end, x.isOp
          ? { kind: "pop", s0: 0.2, r0: -40, r: 0, d: 0.2 }
          : { s0: x.tm.tone === "accent" ? 2.7 : 2.1, r0: x.i % 4 ? 12 : -12, r: x.tm.r ?? (x.i % 4 ? 1.5 : -1.5), d: 0.14 }));
      },
    };
  }
  /* title(story, {bang}) — the word-timed closing line from story.end: split after ，：； into comic boxes
   * (yellow / ink alternating; a short "一句话：" lead becomes an ink tag); every unit slams in when spoken,
   * story.end.emphasis units are pink. render(t, end) */
  function title(story, opt = {}) {
    const end = story.data.end, L = story.line(end.line);
    const W = L.words.map(([u, t]) => ({ u, t }));
    const em = W.map(() => false);
    (end.emphasis || []).forEach((e) => {
      const target = e.replace(/\s/g, "");
      for (let s = 0; s < W.length; s++) {
        let acc = "";
        for (let k = s; k < W.length && acc.length < target.length; k++) {
          acc += W[k].u;
          if (acc === target) { for (let j = s; j <= k; j++) em[j] = true; s = W.length; break; }
        }
      }
    });
    const segs = [];
    let cur = [];
    W.forEach((w, i) => { cur.push(i); if (/^[，：；,;:]$/.test(w.u)) { segs.push(cur); cur = []; } });
    if (cur.length) {
      if (cur.every((i) => /^[。！？.!?]$/.test(W[i].u)) && segs.length) segs[segs.length - 1].push(...cur);
      else segs.push(cur);
    }
    const el = mk("div", "kit-title");
    let rowN = 0;
    const rows = segs.map((seg, si) => {
      const text = seg.map((i) => W[i].u).join("");
      const lead = si === 0 && segs.length > 1 && /[：:]$/.test(text) && text.length <= 6;
      const box = mk("div", lead ? "kit-title-lead" : "kit-title-row" + (rowN++ % 2 ? " kit-even" : ""), el);
      const spans = seg.map((i) => {
        let u = W[i].u;
        if (i === W.length - 1 && u === "。") u = opt.bang ?? "！";
        const next = W[i + 1];
        const latin = /[A-Za-z\d%]$/.test(u) && next && /^[A-Za-z\d]/.test(next.u);
        const s = mk("span", "kit-title-u" + (em[i] ? " kit-title-em" : ""), box, latin ? u + " " : u);
        s.style.visibility = "hidden";
        return { s, t: W[i].t };
      });
      airLatin(spans.map((x) => x.s));
      hide(box);
      return { box, lead, spans, t0: W[seg[0]].t, k: rowN };
    });
    // opt.maxWidth (px, opt-in): a row estimated wider than this shrinks (≥ 60 px) and, if still too wide, wraps
    // inside its box — punctuation glued to the unit before it, so no line starts with ，。！
    if (opt.maxWidth) rows.forEach((r) => {
      if (r.lead) return;
      const em = r.spans.reduce((a, x) => a + emWidth(x.s.textContent), 0), pad = 80;
      if (em * 84 + pad <= opt.maxWidth) return;
      const fs = Math.floor((opt.maxWidth - pad) / em);
      if (fs >= 60) { r.box.style.fontSize = fs + "px"; return; }
      r.box.style.fontSize = "64px";
      r.box.style.whiteSpace = "normal";
      r.box.style.maxWidth = opt.maxWidth + "px";
      r.box.style.textWrap = "balance";
      glue(r.spans.map((x) => x.s), "kit-glue");
    });
    return {
      el, rows,
      render(t, endT = null) {
        el.style.visibility = "visible";
        rows.forEach((r) => {
          const on = show(r.box, t, r.t0 - 0.1, endT, r.lead ? { kind: "pop", s0: 0.4, r0: -6, r: -1.5, d: 0.2 } : { s0: 1.25, r0: r.k % 2 ? -5 : 5, r: r.k % 2 ? -1.5 : 1, d: 0.14 });
          if (!on) { r.spans.forEach((x) => { if (x.s.style.visibility !== "hidden") x.s.style.visibility = "hidden"; }); return; }
          r.spans.forEach((x) => {
            const st = slam(t, x.t - 0.05, { s0: 1.9, r0: 0, r: 0, d: 0.1 });
            if (!st) { if (x.s.style.visibility !== "hidden") { x.s.style.visibility = "hidden"; } return; }
            x.s.style.visibility = "visible";
            x.s.style.opacity = st.o.toFixed(3);
            x.s.style.transform = `scale(${st.sx.toFixed(3)}, ${st.sy.toFixed(3)})`;
          });
        });
      },
    };
  }

  // recap layouts: points around a centre burst (never a grid of panels). Boxes keep ≥ 64 px margins even at the
  // end of the slow push (stage scale 1.025 about 960,500).
  function recapLayout(n) {
    const L = (x, y, w = 520, side = "l") => ({ x, y, w, side });
    if (n <= 3) return { c: [960, 430, 700, 420], pts: [L(90, 130), L(1310, 130, 520, "r"), L(580, 760, 760, "b")].slice(0, n) };
    if (n === 4) return { c: [960, 500, 690, 440], pts: [L(90, 140), L(1310, 140, 520, "r"), L(90, 620), L(1310, 620, 520, "r")] };
    if (n === 5) return { c: [960, 410, 690, 400], pts: [L(90, 100), L(1310, 100, 520, "r"), L(90, 500), L(1310, 500, 520, "r"), L(580, 760, 760, "b")] };
    const per = Math.ceil(n / 2), gap = 860 / per;
    return { c: [960, 480, 640, 420], pts: Array.from({ length: n }, (_, i) => (i < per ? L(90, 110 + i * gap, 500) : L(1330, 110 + (i - per) * gap, 500, "r"))) };
  }
  // quarter-em air where a Latin / number unit meets CJK (core.Captions only spaces Latin–Latin)
  const LAT = /^[A-Za-z0-9%$.,:+\-–\/]+\s?$/;
  function airLatin(spans) {
    spans.forEach((s, i) => {
      if (!LAT.test(s.textContent)) return;
      const p = spans[i - 1], n = spans[i + 1];
      if (p && !LAT.test(p.textContent) && !/^[，。：；、！？（）]$/.test(p.textContent)) s.classList.add("kit-ml");
      if (n && !LAT.test(n.textContent) && !/^[，。：；、！？（）]$/.test(n.textContent)) s.classList.add("kit-mr");
    });
  }
  /* dressCaptions(captions): call once after new ExplainerCore.Captions(...) — adds CJK/Latin spacing */
  function dressCaptions(caps) { caps.boxes.forEach((b) => airLatin(b.spans.map((x) => x.s))); return caps; }

  // estimated width of a unit in em (Noto Sans SC 700/900): CJK and full-width punctuation 1, Latin / digits ≈ 0.58
  function emWidth(s) {
    let w = 0;
    for (const ch of String(s)) w += /[　-〿㐀-鿿＀-￯]/.test(ch) ? 1 : ch === " " ? 0.26 : 0.58;
    return w;
  }
  const GLUE_P = /^[，。：；、！？,.;:!?）」』》”’…]+$/, GLUE_O = /^[（「『《“‘]+$/;
  /* glue(spans, cls, {latin}): wrap a unit together with the punctuation after it (and an opening bracket with the unit
   * after it) in one nowrap inline-block, so a wrapped line never starts with ，。！ or ends with （. Latin runs
   * ("128 GB", "Llama 2 7B") stay together too unless o.latin === false. The spans keep their identity. */
  function glue(spans, cls = "kit-glue", o = {}) {
    const groups = [];
    let cur = null;
    spans.forEach((s, i) => {
      const tx = s.textContent.trim(), prev = spans[i - 1];
      const latinRun = o.latin !== false && prev && /[A-Za-z\d%]$/.test(prev.textContent.trim()) && /^[A-Za-z\d]/.test(tx) && /\s$/.test(prev.textContent);
      if (cur && (GLUE_P.test(tx) || latinRun || GLUE_O.test(prev.textContent.trim()))) cur.push(s);
      else { cur = [s]; groups.push(cur); }
    });
    groups.forEach((g) => {
      if (g.length < 2) return;
      const w = document.createElement("span");
      w.className = cls;
      g[0].parentNode.insertBefore(w, g[0]);
      g.forEach((s) => w.appendChild(s));
    });
    return groups.length;
  }
  /* wrapCaptions(captions, {maxWidth}) — opt-in: caption boxes may wrap onto balanced lines (a long line ≈ 4–15 s
   * stays inside the frame) instead of the default single nowrap line. Call once after new ExplainerCore.Captions(...). */
  function wrapCaptions(caps, o = {}) {
    caps.boxes.forEach((b) => {
      b.el.classList.add("kit-cap-wrap");
      if (o.maxWidth) b.el.style.maxWidth = o.maxWidth + "px";
      glue(b.spans.map((x) => x.s), "kit-glue");
    });
    return caps;
  }
  /* recap(story) — ONE composed splash page: a burst with story.recap.center + tagline, the numbered points
   * around it, ink links from the centre. Slams in at recap.start, then a slow push so it never freezes. render(t) */
  function recap(story, opt = {}) {
    const R = story.recap, pts = R.points || [], lay = recapLayout(pts.length);
    const el = mk("div", "kit-recap");
    const stage = mk("div", "kit-recap-stage", el);
    mk("div", "kit-recap-dots", stage);
    const rays = svgEl("svg", { class: "kit-recap-rays", viewBox: "0 0 1920 1080" }, stage);
    const [cx, cy, cw, ch] = lay.c;
    let d = "";
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 + (hash(i * 4.1 + 70) - 0.5) * 0.08, w = 0.05 + hash(i * 2.7 + 71) * 0.04;
      d += `M${cx} ${cy} L${(cx + Math.cos(a - w) * 1400).toFixed(1)} ${(cy + Math.sin(a - w) * 1400).toFixed(1)} L${(cx + Math.cos(a + w) * 1400).toFixed(1)} ${(cy + Math.sin(a + w) * 1400).toFixed(1)} Z `;
    }
    svgEl("path", { d, fill: "#ffffff", "fill-opacity": "0.55" }, rays);
    rays.style.transformOrigin = `${cx}px ${cy}px`;
    const links = svgEl("svg", { class: "kit-recap-links", viewBox: "0 0 1920 1080" }, stage);
    const center = mk("div", "kit-recap-center", stage);
    Object.assign(center.style, { left: cx - cw / 2 + "px", top: cy - ch / 2 + "px", width: cw + "px", height: ch + "px" });
    const bs = makeBurst(center, cw + 120, ch + 120, { n: 17, inner: 0.78, seed: opt.seed ?? 9, sw: 8, shadow: 10 });
    Object.assign(bs.style, { left: "-60px", top: "-60px" });
    const ttl = String(R.center || story.title || "");
    const cj = CJK.test(ttl);
    let lines = [ttl];
    if (!cj && ttl.length > 12 && ttl.includes(" ")) {
      const sp = [...ttl.matchAll(/ /g)].map((m) => m.index), mid = ttl.length / 2;
      const k = sp.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
      lines = [ttl.slice(0, k), ttl.slice(k + 1)];
    }
    const longest = Math.max(...lines.map((s) => s.length));
    const fs = Math.min(cj ? 120 : 160, Math.floor((cw - 60) / (longest * (cj ? 1.02 : 0.46))));
    const title = mk("div", "kit-recap-title" + (cj ? " kit-cjk" : ""), center);
    title.style.fontSize = fs + "px";
    lines.forEach((s, i) => { if (i) mk("br", null, title); title.appendChild(document.createTextNode(s)); });
    const tag = R.tagline ? mk("div", "kit-recap-tag", center, R.tagline) : null;
    if (tag) tag.style.fontSize = Math.min(50, Math.floor((cw - 70) / ([...R.tagline].reduce((a, ch) => a + (CJK.test(ch) ? 1 : 0.55), 0)))) + "px";
    const badge = mk("div", "kit-recap-badge", el, opt.badge ?? "RECAP!");
    const P = pts.map((p, i) => {
      const L = lay.pts[i];
      const box = mk("div", "kit-recap-pt", stage);
      Object.assign(box.style, { left: L.x + "px", top: L.y + "px", width: L.w + "px" });
      const h = mk("div", "kit-recap-pt-h", box);
      mk("span", "kit-recap-n", h, String(p.n ?? i + 1));
      mk("span", "kit-recap-pt-t", h, p.title);
      mk("div", "kit-recap-pt-x", box, p.text);
      // link: from the burst rim to the box's inner header corner
      const ax = L.side === "l" ? L.x + L.w : L.side === "r" ? L.x : L.x + L.w / 2;
      const ay = L.side === "b" ? L.y : L.y + 46;
      const ang = Math.atan2(ay - cy, ax - cx);
      const sx = cx + Math.cos(ang) * cw * 0.36, sy = cy + Math.sin(ang) * ch * 0.36;
      const mx = (sx + ax) / 2, my = (sy + ay) / 2 + (L.side === "b" ? 0 : (ay < cy ? -40 : 40));
      const path = svgEl("path", { d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)}, ${ax.toFixed(1)} ${ay.toFixed(1)}`, pathLength: "1" }, links);
      const dot = svgEl("circle", { cx: ax.toFixed(1), cy: ay.toFixed(1), r: "12" }, links);
      hide(box);
      return { box, path, dot, rot: (hash(i * 9.7 + 3) - 0.5) * 3 };
    });
    el.style.display = "none";
    return {
      el, points: P,
      render(t) {
        const s = R.start, e = R.end;
        if (t < s - 0.001) { if (el.style.display !== "none") el.style.display = "none"; return false; }
        if (el.style.display === "none") el.style.display = "";
        const u = clamp01((t - s) / (e - s));
        stage.style.transform = `scale(${(1 + 0.025 * E.io2(u)).toFixed(4)})`;
        rays.style.transform = `rotate(${(-3 + 7 * E.io2(u)).toFixed(2)}deg)`;
        show(bs, t, s + 0.04, null, { kind: "pop", s0: 0.15, r0: -24, r: 0, d: 0.32 });
        show(title, t, s + 0.12, null, { s0: 2.3, r0: -10, r: -3, d: 0.16 });
        if (tag) show(tag, t, s + 0.42, null, { s0: 1.8, r0: 6, r: 1.5, d: 0.14 });
        show(badge, t, s + 0.2, null, { kind: "pop", s0: 0.3, r0: -12, r: -3, d: 0.22 });
        P.forEach((p, i) => {
          const at = s + 0.72 + i * 0.3;
          const lu = E.o2(clamp01((t - (at - 0.2)) / 0.24));
          p.path.style.strokeDasharray = `${lu.toFixed(4)} 2`;
          p.path.style.opacity = lu > 0.002 ? "1" : "0";
          p.dot.style.opacity = lu > 0.98 ? "1" : "0";
          show(p.box, t, at, null, { s0: 1.8, r0: i % 2 ? 10 : -10, r: p.rot, d: 0.14 });
        });
        return true;
      },
    };
  }

  g.Kit = {
    name: "v5-comic",
    colors: COL,
    // contract
    label, note, number, bars, formula, title, recap, dressCaptions,
    // opt-in additions (starter): wrapped captions, punctuation glue, width estimate
    wrapCaptions, glue, emWidth,
    // motion
    slam, pop, rise, gone, show, hide, backOut,
    // shapes + fx extras
    starPts, burst, makeBurst, shout, balloon, Shake, Rays, Wipe, Speed, sfx,
    // helpers
    mk, svgEl, isCJK: (s) => CJK.test(s),
  };
})(window);
