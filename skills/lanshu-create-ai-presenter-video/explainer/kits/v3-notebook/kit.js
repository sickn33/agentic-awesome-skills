/* V3 notebook kit — window.Kit.
 *
 * A teacher explains on one sheet of grid paper: every line is drawn by a live pen, every word is written at pen
 * speed, sticky notes are slapped on, a camera looks down at the desk and follows the pen. Load after
 * lib/core.js and lib/story.js. Every factory returns { el, render(t, ...) }; render is a pure function of t.
 *
 *   const pen = Kit.pen(world)                        the pen (one per layer); strokes / writes register their jobs on it
 *   Kit.stroke(svg, d, { at, dur, color, width, pen, dash, out })   a path drawn at pen speed
 *   Kit.write(el, { at, dur, pen, color, out })       text uncovered left-to-right at pen speed
 *   Kit.label / note / number / bars / formula / title / recap   the shared component API (KITS.md)
 *   extras: Kit.page, Kit.camera, Kit.scene, Kit.svg, Kit.path, Kit.geo, Kit.hand, Kit.highlight, Kit.slap,
 *           Kit.tape, Kit.eraser, Kit.lines, Kit.events (sound cue log, window.__kitEvents)
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v3-notebook: load lib/core.js first");
  const { clamp01, pr, E, hash } = C;
  const NS = "http://www.w3.org/2000/svg";
  const COL = {
    ink: "#2A2320", default: "#2A2320", accent: "#C63D2F", "accent-2": "#2E5A9C", warn: "#A9531A", ok: "#2F6B43",
    muted: "#6E655C", pencil: "#9C9186", hlpen: "#E9B824", red: "#C63D2F", blue: "#2E5A9C",
  };
  const color = (c) => COL[c] || c || COL.ink;
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const P = (x, y) => f(x) + " " + f(y);
  const hs = (n) => hash(n) * 2 - 1;
  const lerpP = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  const ease = (e) => (typeof e === "function" ? e : E[e] || E.io2);
  const isCJK = (ch) => /[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch);

  // ---------------- sound cue log (tools/events.mjs reads window.__kitEvents) ----------------
  const events = [];
  function event(kind, t, d, extra) {
    const e = Object.assign({ kind, t: +t.toFixed(3), d: +(d || 0).toFixed(3) }, extra || {});
    events.push(e);
    return e;
  }
  g.__kitEvents = events;

  // ---------------- hand-drawn geometry (SVG path strings, seeded wobble) ----------------
  const geo = {
    line(x1, y1, x2, y2, seed = 1, amp = 4) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, k = hs(seed) * amp;
      return "M " + P(x1 + hs(seed + 1) * 1.5, y1 + hs(seed + 2) * 1.5) + " Q " + P((x1 + x2) / 2 - (dy / L) * k, (y1 + y2) / 2 + (dx / L) * k) + " " + P(x2 + hs(seed + 3) * 1.5, y2 + hs(seed + 4) * 1.5);
    },
    rect(x, y, w, h, seed = 1, amp = 3) {
      const j = (i) => hs(seed * 17 + i) * amp;
      const p = [[x + j(1), y + j(2)], [x + w + j(3), y + j(4)], [x + w + j(5), y + h + j(6)], [x + j(7), y + h + j(8)]];
      let d = "M " + P(p[0][0], p[0][1]);
      for (let i = 0; i < 4; i++) {
        const a = p[i], b = i < 3 ? p[i + 1] : p[0];
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, k = j(10 + i) * 1.7;
        d += " Q " + P((a[0] + b[0]) / 2 - (dy / L) * k, (a[1] + b[1]) / 2 + (dx / L) * k) + " " + P(b[0], b[1]);
      }
      // the pen runs a little past where it started, along the top edge
      return d + " L " + P(p[0][0] + Math.min(18, w * 0.12), p[0][1] + j(9) * 0.5);
    },
    loop(cx, cy, rx, ry, seed = 1, turns = 1.1) {
      const n = 64, a0 = -2.5 + hs(seed) * 0.3;
      let d = "";
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = a0 + u * turns * Math.PI * 2;
        const r = 1 + 0.04 * Math.sin(a * 2 + seed) + 0.07 * (u - 0.5);
        d += (i ? " L " : "M ") + P(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
      }
      return d;
    },
    scribble(x, y, s, seed = 1, h) {
      h = h || s;
      const n = Math.max(5, Math.round(h / 4.5));
      let d = "";
      for (let i = 0; i < n; i++) {
        const yy = y + 4 + (i * (h - 8)) / (n - 1);
        const px = i % 2 === 0 ? x + 2 + hash(seed + i) * 3 : x + s - 2 - hash(seed + i + 40) * 3;
        d += (i ? " L " : "M ") + P(px, yy + (i % 2 === 0 ? 2.5 : -2.5));
      }
      return d;
    },
    tick(x, y, s, seed = 1) {
      return "M " + P(x, y + s * 0.52) + " L " + P(x + s * 0.36 + hs(seed) * 1.2, y + s * 0.9) + " L " + P(x + s + hs(seed + 1) * 2, y + hs(seed + 2) * 2);
    },
    cross(cx, cy, r, seed = 1) {
      return geo.line(cx - r, cy - r, cx + r, cy + r, seed, r * 0.08) + " " + geo.line(cx + r, cy - r, cx - r, cy + r, seed + 9, r * 0.08);
    },
    wavy(x, y, w, amp = 6, waves = 4, seed = 1) {
      const n = waves * 10;
      let d = "";
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        d += (i ? " L " : "M ") + P(x + u * w, y + Math.sin(u * waves * Math.PI * 2) * amp + hs(seed + i) * 0.8);
      }
      return d;
    },
    star(cx, cy, R, seed = 1) {
      let d = "";
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? R * 0.45 : R) * (1 + hs(seed + i) * 0.06);
        d += (i ? " L " : "M ") + P(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      return d;
    },
    // a hand-drawn arrow: one bowed stroke + two head strokes (bow is a fraction of the length, signed)
    arrow(x1, y1, x2, y2, seed = 1, bow = 0.12, head = 20) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const k = bow * L + hs(seed) * 3;
      const cx = (x1 + x2) / 2 - (dy / L) * k, cy = (y1 + y2) / 2 + (dx / L) * k;
      const tx = x2 - cx, ty = y2 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
      const a = 0.48;
      const h1 = { x: x2 - head * (ux * Math.cos(a) - uy * Math.sin(a)), y: y2 - head * (uy * Math.cos(a) + ux * Math.sin(a)) };
      const h2 = { x: x2 - head * (ux * Math.cos(a) + uy * Math.sin(a)), y: y2 - head * (uy * Math.cos(a) - ux * Math.sin(a)) };
      return "M " + P(x1, y1) + " Q " + P(cx, cy) + " " + P(x2, y2) + " M " + P(h1.x, h1.y) + " L " + P(x2, y2) + " L " + P(h2.x, h2.y);
    },
    // vertical curly brace from y1 to y2 at x; dir +1 points right, -1 points left
    brace(x, y1, y2, dir = 1, depth = 26) {
      const d = depth * dir, ym = (y1 + y2) / 2, r = Math.min(depth * 0.8, (y2 - y1) / 4);
      return "M " + P(x, y1) + " Q " + P(x + d * 0.5, y1) + " " + P(x + d * 0.5, y1 + r) + " L " + P(x + d * 0.5, ym - r) +
        " Q " + P(x + d * 0.5, ym) + " " + P(x + d, ym) + " Q " + P(x + d * 0.5, ym) + " " + P(x + d * 0.5, ym + r) +
        " L " + P(x + d * 0.5, y2 - r) + " Q " + P(x + d * 0.5, y2) + " " + P(x, y2);
    },
    // diagonal hatching over a box (clip it to the box)
    hatch(x, y, w, h, step = 11, lean = 0.9) {
      let d = "";
      for (let hx = x - h * lean; hx < x + w; hx += step) d += "M " + P(hx, y + h) + " L " + P(hx + h * lean, y) + " ";
      return d;
    },
    // a luggage tag pointing left (the Key), hole near the point
    tag(x, y, w, h, seed = 1) {
      const n = h * 0.42, j = (i) => hs(seed * 13 + i) * 1.4;
      return "M " + P(x + n + j(1), y + j(2)) + " L " + P(x + w + j(3), y + j(4)) + " L " + P(x + w + j(5), y + h + j(6)) + " L " + P(x + n + j(7), y + h + j(8)) +
        " L " + P(x + j(9), y + h / 2) + " Z " + geo.loop(x + n * 0.75, y + h / 2, h * 0.1, h * 0.1, seed + 3, 1.0);
    },
  };

  // ---------------- DOM helpers ----------------
  function el(tag, cls, parent, style, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) for (const k in style) e.style[k] = typeof style[k] === "number" ? style[k] + "px" : style[k];
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  // an absolutely positioned <svg> whose user units are the parent's px (viewBox = x y w h)
  function svg(parent, x = 0, y = 0, w = 1920, h = 1080) {
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("class", "kit-ink");
    s.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    s.setAttribute("width", w);
    s.setAttribute("height", h);
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.width = w + "px";
    s.style.height = h + "px";
    parent.appendChild(s);
    return s;
  }
  function path(parent, d, c, width, style) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.style.fill = "none";
    p.style.stroke = color(c);
    p.style.strokeWidth = width == null ? 3.2 : width;
    p.style.strokeLinecap = "round";
    p.style.strokeLinejoin = "round";
    if (style) for (const k in style) p.style[k] = style[k];
    parent.appendChild(p);
    return p;
  }
  // handwriting markup: Latin / digit runs are lettered in Caveat, the rest stays in the element's face
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function hand(text) {
    return esc(text).replace(/[A-Za-z0-9](?:[A-Za-z0-9 .%×÷≈+\-/·:]*[A-Za-z0-9%])?/g, (m) => `<span class="kit-cv">${m}</span>`);
  }
  // break text into lines of at most maxEm (CJK = 1em, Latin ≈ 0.5em), preferring breaks after punctuation;
  // an explicit "\n" always breaks
  function lines(text, maxEm) {
    if (text.indexOf("\n") >= 0) return text.split("\n").flatMap((t) => lines(t, maxEm));
    const toks = text.match(/[A-Za-z0-9.%+\-/·×÷]+|\s+|./gu) || [];
    const out = [];
    let cur = "", w = 0, lastPunct = -1;
    const width = (s) => [...s].reduce((a, ch) => a + (isCJK(ch) ? 1 : ch === " " ? 0.3 : 0.52), 0);
    for (const tk of toks) {
      const tw = width(tk);
      // never start a line with closing punctuation: it stays on the line it closes
      if (w + tw > maxEm && cur.trim() && !/^[，。；：、！？,.;:!?）)]$/.test(tk)) {
        if (lastPunct > cur.length * 0.3) { out.push(cur.slice(0, lastPunct).trim()); cur = cur.slice(lastPunct).replace(/^\s+/, ""); }
        else { out.push(cur.trim()); cur = ""; }
        w = width(cur);
        lastPunct = -1;
        if (/^\s+$/.test(tk) && !cur) continue;
      }
      cur += tk;
      w += tw;
      if (/[，。；：！？,;]/.test(tk)) lastPunct = cur.length;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  // position of a node's user-space origin inside `layer` (layout only: transforms ignored)
  function offsetIn(node, layer) {
    let x = 0, y = 0, e = node;
    if (typeof SVGElement !== "undefined" && e instanceof SVGElement) {
      let s = e.ownerSVGElement || e;
      while (s.ownerSVGElement) s = s.ownerSVGElement;
      const vb = s.viewBox && s.viewBox.baseVal;
      x += (parseFloat(s.style.left) || 0) - (vb && vb.width ? vb.x : 0);
      y += (parseFloat(s.style.top) || 0) - (vb && vb.width ? vb.y : 0);
      e = s.parentNode;
    }
    while (e && e !== layer) { x += e.offsetLeft || 0; y += e.offsetTop || 0; e = e.offsetParent; }
    return { x, y };
  }

  // ---------------- scene: one render call per frame ----------------
  function Scene() { this.items = []; }
  Scene.prototype.add = function (...xs) { for (const x of xs) this.items.push(x); return xs[0]; };
  Scene.prototype.fn = function (render) { this.items.push({ render }); };
  Scene.prototype.render = function (t) { for (const x of this.items) x.render(t); };

  // ---------------- strokes ----------------
  function prep(p) {
    const L = p.getTotalLength() + 2;
    p.__len = L;
    p.__off = L + 30;
    p.style.strokeDasharray = L + " " + (L + 80);
    p.style.strokeDashoffset = p.__off;
    return L;
  }
  let maskId = 0;
  /* o: { at, dur, color, width, ease, pen, penColor, off, dash: "12 9", out: [t, dur], fill, opacity, sound: false } */
  function stroke(parent, d, o = {}) {
    const c = color(o.color || o.tone);
    const p = path(parent, d, c, o.width, o.style);
    if (o.opacity != null) p.style.opacity = o.opacity;
    let target = p;
    if (o.dash) {
      const id = "kit-m" + maskId++;
      const m = document.createElementNS(NS, "mask");
      m.setAttribute("id", id);
      m.setAttribute("maskUnits", "userSpaceOnUse");
      m.setAttribute("x", "-2000"); m.setAttribute("y", "-2000"); m.setAttribute("width", "12000"); m.setAttribute("height", "9000");
      target = path(m, d, "#fff", (o.width || 3.2) + 10);
      parent.appendChild(m);
      p.style.strokeDasharray = o.dash;
      p.setAttribute("mask", `url(#${id})`);
    }
    prep(target);
    const at = o.at ?? 0, dur = o.dur ?? 0.3, ez = ease(o.ease || "io2");
    if (o.pen) o.pen.follow(target, at, dur, ez, color(o.penColor || c), o.off, o.sound);
    else if (o.sound !== false && dur > 0) event("stroke", at, dur, { len: Math.round(target.__len) });
    const op = o.opacity == null ? 1 : o.opacity;
    return {
      el: p, at, dur,
      render(t) {
        const u = ez(pr(t, at, dur));
        target.style.strokeDashoffset = (target.__off * (1 - u)).toFixed(1);
        if (o.out) p.style.opacity = (op * (1 - pr(t, o.out[0], o.out[1] || 0.25))).toFixed(3);
      },
    };
  }

  // ---------------- writing ----------------
  function writable(elm) {
    if (elm.__inner) return elm;
    const inner = document.createElement("span");
    inner.className = "kit-wx";
    while (elm.firstChild) inner.appendChild(elm.firstChild);
    elm.appendChild(inner);
    elm.classList.add("kit-w");
    elm.__inner = inner;
    elm.style.visibility = "hidden";
    return elm;
  }
  const chars = (elm) => (elm.textContent || "").replace(/\s/g, "").length;
  /* o: { at, dur, pen, color (pen colour), out: [t, dur], ease } */
  function write(elm, o = {}) {
    writable(elm);
    const n = Math.max(1, chars(elm));
    const at = o.at ?? 0, dur = o.dur ?? Math.min(0.9, Math.max(0.12, n * 0.055)), ez = ease(o.ease || "linear");
    if (o.pen) o.pen.write(elm, at, dur, color(o.color || "ink"), o.sound);
    else if (o.sound !== false) event("write", at, dur, { n });
    const inner = elm.__inner;
    return {
      el: elm, at, dur,
      render(t) {
        const u = ez(pr(t, at, dur));
        if (u <= 0) { elm.style.visibility = "hidden"; return; }
        elm.style.visibility = "visible";
        elm.style.transform = u >= 1 ? "none" : `translateX(${((u - 1) * 100).toFixed(2)}%)`;
        inner.style.transform = u >= 1 ? "none" : `translateX(${((1 - u) * 100).toFixed(2)}%)`;
        if (o.out) elm.style.opacity = (1 - pr(t, o.out[0], o.out[1] || 0.25)).toFixed(3);
      },
    };
  }

  // ---------------- the pen ----------------
  const PEN_SVG =
    '<svg viewBox="0 0 340 340"><g class="kit-pen-shadow" style="opacity:.16"><g transform="translate(20 20) rotate(52)"><path d="M 0 0 L 30 -9 L 300 -13 Q 312 -13 312 0 Q 312 13 300 13 L 30 9 Z" style="fill:#2a2320"/></g></g>' +
    '<g transform="translate(20 20) rotate(52)"><path d="M 0 0 L 30 -9 L 30 9 Z" style="fill:#4a423c"/><path class="kit-pen-tip" d="M 0 0 L 12 -3.6 L 12 3.6 Z" style="fill:#2a2320"/>' +
    '<rect x="30" y="-11" width="64" height="22" rx="5" style="fill:#2d2926"/><path d="M 44 -10 L 44 10 M 56 -10 L 56 10 M 68 -10 L 68 10" style="stroke:rgba(255,255,255,.14);stroke-width:2"/>' +
    '<rect class="kit-pen-band" x="94" y="-12.5" width="12" height="25" style="fill:#2a2320"/><rect x="106" y="-12.5" width="196" height="25" rx="8" style="fill:#34423f"/>' +
    '<rect x="112" y="-8" width="182" height="4" rx="2" style="fill:rgba(255,255,255,.22)"/><rect x="206" y="-17" width="88" height="6" rx="3" style="fill:#b9b2a6"/></g></svg>';
  /* Pen(layer, { enter: {x,y} where it comes from, rest: {x,y} offset when idle, scale }) */
  function Pen(layer, o = {}) {
    this.layer = layer;
    this.jobs = [];
    this.offs = [];
    this.enter = o.enter || { x: 2900, y: 1250 };
    this.rest = o.rest || { x: 70, y: 100 };
    this.scale = o.scale || 0.86;
    this.el = el("div", "kit-pen", layer, null, PEN_SVG);
    this.el.setAttribute("data-layout-allow-overflow", "");
    this.tip = this.el.querySelector(".kit-pen-tip");
    this.band = this.el.querySelector(".kit-pen-band");
    this.shadow = this.el.querySelector(".kit-pen-shadow");
  }
  // every pen job is also a sound cue (kind: "write" | "stroke" | "trace"); hover jobs are silent
  Pen.prototype.job = function (j, kind, extra) {
    this.jobs.push(j);
    if (!j.hover && kind !== false) event(kind || j.kind || "stroke", j.t0, j.t1 - j.t0, extra);
    return j;
  };
  // follow an SVG path (dash-drawn) from t0 for dur
  Pen.prototype.follow = function (p, t0, dur, ez, c, off, sound) {
    const layer = this.layer, L = (p.__len || p.getTotalLength() + 2) - 2;
    return this.job({ t0, t1: t0 + dur, color: color(c), at(u) {
      const q = p.getPointAtLength(Math.max(0, Math.min(L, ease(ez)(u) * L)));
      const o = off ? off() : offsetIn(p, layer);
      return { x: q.x + o.x, y: q.y + o.y };
    } }, sound === false ? false : "stroke", { len: Math.round(L) });
  };
  // write across an element's box, bobbing once per character
  Pen.prototype.write = function (elm, t0, dur, c, sound) {
    const layer = this.layer, n = Math.max(1, chars(elm));
    return this.job({ t0, t1: t0 + dur, color: color(c), at(u) {
      const r = offsetIn(elm, layer);
      return { x: r.x + elm.offsetWidth * u, y: r.y + elm.offsetHeight * (0.62 - 0.16 * Math.sin(u * n * Math.PI)) };
    } }, sound === false ? false : "write", { n });
  };
  // any path given as a function of u in layer px
  Pen.prototype.trace = function (t0, dur, c, fn, hover, kind) { return this.job({ t0, t1: t0 + dur, color: color(c), at: fn, hover: !!hover }, kind || "stroke"); };
  Pen.prototype.hover = function (t0, t1, x, y, c) { return this.job({ t0, t1, color: color(c), hover: true, at: () => ({ x, y }) }); };
  // the pen leaves the frame between t0 and t1 (fades)
  Pen.prototype.away = function (t0, t1) { this.offs.push([t0, t1]); };
  Pen.prototype.state = function (t) {
    let cur = null, prev = null, next = null;
    for (const j of this.jobs) {
      if (j.t0 <= t && t <= j.t1 && (!cur || j.t0 >= cur.t0)) cur = j;
      if (j.t1 < t && (!prev || j.t1 > prev.t1)) prev = j;
      if (j.t0 > t && (!next || j.t0 < next.t0)) next = j;
    }
    if (cur) return { p: cur.at((t - cur.t0) / Math.max(1e-6, cur.t1 - cur.t0)), lift: cur.hover ? 1 : 0, color: cur.color };
    const a = prev ? prev.at(1) : this.enter, col = prev ? prev.color : COL.ink;
    const rest = { x: a.x + this.rest.x, y: a.y + this.rest.y };
    const since = prev ? t - prev.t1 : 9;
    if (!next) { const ue = E.o2(clamp01(since / 0.35)); return { p: lerpP(a, rest, ue), lift: ue, color: col }; }
    const b = next.at(0), start = prev ? prev.t1 : 0, gap = next.t0 - start;
    if (gap <= 0.8) {
      const u = clamp01((t - start) / gap);
      return { p: lerpP(prev ? a : this.enter, b, E.io2(u)), lift: prev ? Math.sin(Math.PI * u) : 1 - u, color: u < 0.5 ? col : next.color };
    }
    const toNext = next.t0 - t;
    if (toNext < 0.45) { const u2 = 1 - toNext / 0.45; return { p: lerpP(rest, b, E.io2(u2)), lift: 1 - u2 * u2, color: next.color }; }
    const u3 = E.o2(clamp01(since / 0.35));
    return { p: lerpP(a, rest, u3), lift: u3, color: col };
  };
  Pen.prototype.render = function (t) {
    let vis = 1;
    for (const [a, b] of this.offs) vis = Math.min(vis, 1 - Math.min(pr(t, a, 0.2), 1 - pr(t, b - 0.2, 0.2)));
    this.el.style.opacity = vis.toFixed(3);
    this.el.style.visibility = vis > 0 ? "visible" : "hidden";
    const s = this.state(t);
    this.el.style.transform = `translate(${f(s.p.x)}px,${f(s.p.y)}px) scale(${(this.scale + 0.04 * s.lift).toFixed(3)})`;
    this.shadow.setAttribute("transform", `translate(${f(6 + 26 * s.lift)} ${f(8 + 22 * s.lift)})`);
    this.tip.style.fill = s.color;
    this.band.style.fill = s.color;
  };

  // ---------------- the eraser: rubs along a list of points ----------------
  function Eraser(layer, o = {}) {
    this.el = el("div", "kit-eraser", layer, null, "<i></i>");
    this.el.setAttribute("data-layout-allow-overflow", "");
    this.runs = [];
    this.home = o.home || { x: 0, y: 0 };
  }
  Eraser.prototype.rub = function (t0, t1, pts) { this.runs.push({ t0, t1, pts }); event("erase", t0, t1 - t0); };
  Eraser.prototype.render = function (t) {
    let p = this.home, o = 0;
    for (const r of this.runs) {
      if (t < r.t0 - 0.14 || t > r.t1 + 0.2) continue;
      const pts = r.pts, n = pts.length - 1;
      if (t < r.t0) { const u = E.o2((t - (r.t0 - 0.14)) / 0.14); p = { x: pts[0].x + 160 * (1 - u), y: pts[0].y + 140 * (1 - u) }; o = u; }
      else if (t <= r.t1) {
        const s = ((t - r.t0) / Math.max(1e-6, r.t1 - r.t0)) * n, i = Math.min(n - 1, Math.floor(s));
        p = lerpP(pts[i], pts[i + 1], E.io2(s - i)); o = 1;
      } else { const u = (t - r.t1) / 0.2; p = { x: pts[n].x + 160 * u, y: pts[n].y + 140 * u }; o = 1 - u; }
    }
    this.el.style.opacity = o.toFixed(3);
    this.el.style.visibility = o > 0 ? "visible" : "hidden";
    this.el.style.transform = `translate(${f(p.x)}px,${f(p.y)}px) rotate(-24deg)`;
  };

  // ---------------- camera: piecewise moves on a world layer ----------------
  // a view is { x, y, s }: world point (x, y) sits at the screen's top-left, scale s
  const view = (cx, cy, s, W = 1920, H = 1080) => ({ x: cx - W / 2 / s, y: cy - H / 2 / s, s });
  function Camera(world, start, o = {}) {
    this.world = world;
    this.start = start;
    this.moves = [];
    this.last = start;
    this.W = o.W || 1920;
    this.H = o.H || 1080;
  }
  // o (optional): { sound: false } keeps the move out of the sound-cue log (e.g. slow drifts between shots)
  Camera.prototype.move = function (to, at, dur, ez, o) {
    this.moves.push({ t0: at, t1: at + dur, a: this.last, b: to, e: ease(ez || "io2") });
    this.last = to;
    if (dur >= 0.4 && !(o && o.sound === false)) event("cam", at, dur);
    return this;
  };
  Camera.prototype.view = function (cx, cy, s) { return view(cx, cy, s, this.W, this.H); };
  Camera.prototype.at = function (t) {
    let c = this.start;
    for (const k of this.moves) {
      if (t >= k.t1) { c = k.b; continue; }
      if (t > k.t0) {
        // zoom in screen space: interpolate the view centre and log-scale so the move feels like one dolly
        const u = k.e((t - k.t0) / (k.t1 - k.t0));
        const ca = { x: k.a.x + this.W / 2 / k.a.s, y: k.a.y + this.H / 2 / k.a.s }, cb = { x: k.b.x + this.W / 2 / k.b.s, y: k.b.y + this.H / 2 / k.b.s };
        const s = Math.exp(Math.log(k.a.s) + (Math.log(k.b.s) - Math.log(k.a.s)) * u);
        return view(ca.x + (cb.x - ca.x) * u, ca.y + (cb.y - ca.y) * u, s, this.W, this.H);
      }
      break;
    }
    return c;
  };
  Camera.prototype.render = function (t) {
    const c = this.at(t);
    this.world.style.transform = `translate(${(-c.x * c.s).toFixed(2)}px,${(-c.y * c.s).toFixed(2)}px) scale(${c.s.toFixed(4)})`;
    return c;
  };

  // ---------------- the page ----------------
  /* page(world, { x, y, w, h, margin: x of the red margin line (or null), holes: [y, ...], holeX }) */
  function page(world, o = {}) {
    const pg = el("div", "kit-page", world, { left: o.x || 0, top: o.y || 0, width: o.w || 3840, height: o.h || 2400 });
    pg.setAttribute("data-layout-allow-overflow", "");
    el("div", "kit-page-grain", pg);
    if (o.margin != null) el("div", "kit-page-margin", pg, { left: o.margin });
    for (const y of o.holes || []) el("div", "kit-page-hole", pg, { left: o.holeX ?? 58, top: y });
    return pg;
  }

  // ---------------- paper props ----------------
  // slap a paper element down: drops from a little larger / rotated, lands at rot. o: { at, rot, dur, from: {scale, rot, x, y}, out: [t, dur] }
  function slap(elm, o = {}) {
    const at = o.at ?? 0, rot = o.rot ?? 0, dur = o.dur ?? 0.16, fr = o.from || {};
    const s0 = fr.scale ?? 1.16, r0 = fr.rot ?? rot + 7, x0 = fr.x ?? 0, y0 = fr.y ?? -22;
    if (o.sound !== false) event("slap", at + dur, 0);
    return {
      el: elm, at,
      render(t) {
        const u = E.i2(pr(t, at, dur));
        let op = pr(t, at, dur * 0.5);
        let x = x0 * (1 - u), y = y0 * (1 - u), r = r0 + (rot - r0) * u, s = s0 + (1 - s0) * u;
        if (o.out) {
          const v = E.i2(pr(t, o.out[0], o.out[1] || 0.3));
          y -= 80 * v; x += 120 * v; r += 14 * v; op *= 1 - v;
        }
        elm.style.opacity = op.toFixed(3);
        elm.style.visibility = op > 0 ? "visible" : "hidden";
        elm.style.transform = `translate(${f(x)}px,${f(y)}px) rotate(${f(r)}deg) scale(${s.toFixed(3)})`;
      },
    };
  }
  function tape(parent, x, y, w = 140, h = 42, rot = -3) {
    return el("div", "kit-tape", parent, { left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)` });
  }
  /* highlighter swipe: highlight(parent, { x, y, w, h, at, dur, pen, tone, under })
   * under: the (positioned) text element it marks — the swipe is inserted just before it so the ink stays on top */
  function highlight(parent, o) {
    const h = el("div", "kit-hl" + (o.tone === "warn" ? " kit-tone-warn" : ""), null, { left: o.x, top: o.y, width: o.w, height: o.h });
    if (o.under && o.under.parentNode === parent) parent.insertBefore(h, o.under);
    else parent.appendChild(h);
    const at = o.at ?? 0, dur = o.dur ?? 0.4, ez = ease("io2");
    if (o.pen) o.pen.trace(at, dur, "hlpen", (u) => { const r = offsetIn(h, o.pen.layer); return { x: r.x + ez(u) * h.offsetWidth, y: r.y + h.offsetHeight * 0.55 }; }, false, "hl");
    else event("hl", at, dur);
    return {
      el: h,
      render(t) {
        const u = ez(pr(t, at, dur));
        h.style.visibility = u > 0 ? "visible" : "hidden";
        h.style.transform = `scaleX(${u.toFixed(3)})`;
        if (o.out) h.style.opacity = (1 - pr(t, o.out[0], o.out[1] || 0.25)).toFixed(3);
      },
    };
  }

  /* hatchRect(svg, x, y, w, h, { color, step, width, wash }) — marker hatching clipped to a box (returns the <g>);
   * set g.style.opacity from a render function to show / hide it */
  let hatchId = 0;
  function hatchRect(parent, x, y, w, h, o = {}) {
    const id = "kit-hr" + hatchId++;
    const cp = document.createElementNS(NS, "clipPath");
    cp.setAttribute("id", id);
    const r = document.createElementNS(NS, "rect");
    r.setAttribute("x", x); r.setAttribute("y", y); r.setAttribute("width", w); r.setAttribute("height", h);
    cp.appendChild(r);
    parent.appendChild(cp);
    const gEl = document.createElementNS(NS, "g");
    gEl.setAttribute("clip-path", `url(#${id})`);
    parent.appendChild(gEl);
    if (o.wash !== false) {
      const wsh = document.createElementNS(NS, "rect");
      wsh.setAttribute("x", x); wsh.setAttribute("y", y); wsh.setAttribute("width", w); wsh.setAttribute("height", h);
      wsh.style.fill = color(o.color || "accent-2");
      wsh.style.opacity = String(o.wash ?? 0.14);
      gEl.appendChild(wsh);
    }
    path(gEl, geo.hatch(x, y, w, h, o.step || 12), o.color || "accent-2", o.width || 2.6);
    gEl.__clip = r;
    return gEl;
  }

  // ======================= the shared component API =======================

  /* label({ text, sub, tone, serif, inline, at, dur, pen, out }) — handwriting + the real term (Caveat, muted) */
  function label(o) {
    const root = el("div", "kit-label kit-tone-" + (o.tone || "ink"));
    const t1 = el("span", "kit-label-t" + (o.serif ? " kit-serif" : ""), root, null, o.serif ? esc(o.text) : hand(o.text));
    const parts = [write(t1, { at: o.at ?? 0, dur: o.dur, pen: o.pen, color: o.tone, out: o.out })];
    if (o.sub) {
      const holder = el("span", "kit-label-sub" + (o.inline ? " kit-inline" : ""), root);
      const t2 = el("span", "", holder, null, esc(o.sub));
      parts.push(write(t2, { at: parts[0].at + parts[0].dur + 0.06, pen: o.pen, color: "muted", out: o.out }));
    }
    return { el: root, parts, render(t) { for (const p of parts) p.render(t); } };
  }

  /* note(text, { at, pen, rot, width, maxEm, fontSize, speed (s per char), out }) — a sticky note slapped on,
   * the sentence written line by line ("\n" forces a break) */
  function note(text, o = {}) {
    const width = o.width || 520;
    const root = el("div", "kit-note", null, { width });
    el("i", "kit-note-tape", root);
    const at = o.at ?? 0;
    const sl = slap(root, { at, rot: o.rot ?? -1.6, out: o.out });
    const fontPx = o.fontSize || 44;
    if (o.fontSize) root.style.fontSize = fontPx + "px";
    const ls = lines(text, o.maxEm || Math.floor((width - 64) / (fontPx * 0.86)));
    let tt = at + 0.2;
    const ws = ls.map((s) => {
      const line = el("div", "kit-note-line", root);
      const w = el("span", "", line, null, hand(s));
      const n = s.replace(/\s/g, "").length;
      const wr = write(w, { at: tt, dur: Math.min(0.75, Math.max(0.14, n * (o.speed || 0.05))), pen: o.pen, color: "ink" });
      tt += wr.dur + (o.speed ? 0.03 : 0.06);
      return wr;
    });
    return { el: root, end: tt, render(t) { sl.render(t); for (const w of ws) w.render(t); } };
  }

  /* number({ value, unit, caption, decimals, tone, at, dur, format }) — render(t, u) counts up; .set(v) pins a value */
  function number(o) {
    const root = el("div", "kit-num kit-tone-" + (o.tone || "ink"));
    const row = el("span", "", root);
    const v = el("span", "kit-num-v", row);
    if (o.unit) el("span", "kit-num-u", row, null, esc(o.unit));
    if (o.caption) el("span", "kit-num-c", root, null, hand(o.caption));
    const dec = o.decimals || 0;
    const fmt = o.format || ((x) => x.toFixed(dec));
    const wr = write(row, { at: o.at ?? 0, dur: o.dur ?? 0.25, pen: o.pen, color: o.tone, sound: o.sound });
    let pinned = null;
    const api = {
      el: root, value: v,
      set(x) { pinned = x; return api; },
      render(t, u) {
        wr.render(t);
        const val = pinned != null ? pinned : o.value * (u == null ? 1 : clamp01(u));
        const s = fmt(val);
        if (v.textContent !== s) v.textContent = s;
      },
    };
    v.textContent = fmt(0);
    return api;
  }

  /* bars({ rows: [{ label, value, max, tone, valueText }], width, rowH, labelW, at, dur, stagger, pen })
   * render(t, u): u 0..1 grows every row (staggered); without u, grows over [at, at + dur] */
  let clipId = 0;
  function bars(o) {
    const root = el("div", "kit-bars");
    const W = o.width || 380, H = o.rowH || 58, lw = o.labelW || 180, th = Math.round(H * 0.64), st = o.stagger ?? 0.12;
    const rows = o.rows.map((r, k) => {
      const row = el("div", "kit-bar", root, { height: H });
      const lab = el("span", "kit-bar-l", row, { width: lw }, hand(r.label || ""));
      const tube = el("div", "kit-bar-tube", row, { width: W, height: th });
      const s = svg(tube, 0, 0, W, th);
      s.setAttribute("data-layout-allow-overflow", "");
      const id = "kit-bc" + clipId++;
      const cp = document.createElementNS(NS, "clipPath");
      cp.setAttribute("id", id);
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", "2"); rect.setAttribute("y", "2"); rect.setAttribute("height", String(th - 4)); rect.setAttribute("width", "0");
      cp.appendChild(rect);
      s.appendChild(cp);
      const c = color(r.tone || "accent-2");
      const wash = document.createElementNS(NS, "rect");
      wash.setAttribute("x", "2"); wash.setAttribute("y", "2"); wash.setAttribute("width", String(W - 4)); wash.setAttribute("height", String(th - 4));
      wash.setAttribute("clip-path", `url(#${id})`);
      wash.style.fill = c; wash.style.opacity = "0.16";
      s.appendChild(wash);
      const hat = path(s, geo.hatch(0, 0, W, th, 12), c, 3);
      hat.setAttribute("clip-path", `url(#${id})`);
      const box = path(s, geo.rect(1, 1, W - 2, th - 2, 300 + k * 7, 1.8), "ink", 2.8);
      prep(box);
      const val = el("span", "kit-bar-v", row, { color: c }, hand(r.valueText != null ? r.valueText : String(r.value)));
      return { r, lab, rect, box, val, frac: Math.max(0, Math.min(1, r.value / (r.max || 1))) };
    });
    const n = rows.length, at = o.at ?? 0, dur = o.dur ?? 0.8;
    if (o.sound !== false) event("bars", at, dur, { n });
    return {
      el: root,
      render(t, u) {
        if (u == null) u = pr(t, at, dur);
        rows.forEach((R, k) => {
          const uk = clamp01(u * (1 + st * (n - 1)) - st * k);
          const vis = uk > 0 ? "visible" : "hidden";
          R.lab.style.visibility = vis;
          R.lab.style.opacity = E.o2(clamp01(uk / 0.25)).toFixed(3);
          R.box.style.strokeDashoffset = (R.box.__off * (1 - E.o2(clamp01(uk / 0.35)))).toFixed(1);
          R.rect.setAttribute("width", f(Math.max(0, (W - 4) * R.frac * E.io2(clamp01((uk - 0.15) / 0.85)))));
          const vu = clamp01((uk - 0.8) / 0.2);
          R.val.style.visibility = vu > 0 ? "visible" : "hidden";
          R.val.style.clipPath = vu >= 1 ? "none" : `inset(-20% ${((1 - vu) * 100).toFixed(1)}% -20% 0)`;
        });
      },
    };
  }

  /* formula({ terms: [{ text, t, sub, tone, hand, ring, size, dur }], pen }) — each term is written at its own time */
  function formula(o) {
    const root = el("div", "kit-formula");
    const terms = o.terms.map((T, k) => {
      const box = el("span", "kit-term kit-tone-" + (T.tone || "ink"), root);
      const v = el("span", "kit-term-v" + (T.hand ? " kit-hand" : ""), box, T.size ? { fontSize: T.size } : null, T.hand ? hand(T.text) : esc(T.text));
      const n = T.text.replace(/\s/g, "").length;
      const parts = [write(v, { at: T.t, dur: T.dur ?? Math.min(0.42, Math.max(0.12, n * 0.06)), pen: o.pen, color: T.tone || "ink" })];
      if (T.sub) {
        const s = el("span", "kit-term-sub", box, null, hand(T.sub));
        parts.push(write(s, { at: parts[0].at + parts[0].dur + 0.02, dur: Math.min(0.3, 0.05 * T.sub.length + 0.08), pen: o.pen, color: "muted" }));
      }
      let ring = null;
      if (T.ring) {
        const s = document.createElementNS(NS, "svg");
        s.setAttribute("class", "kit-ink");
        s.setAttribute("data-layout-allow-overflow", "");
        box.appendChild(s);
        const p = path(s, "M 0 0", T.ring === true ? "accent" : T.ring, 5);
        p.setAttribute("pathLength", "100");
        p.style.strokeDasharray = "100 140";
        const rt = parts[parts.length - 1].at + parts[parts.length - 1].dur + 0.04;
        if (o.pen) o.pen.trace(rt, 0.26, T.ring === true ? "accent" : T.ring, (u) => {
          const r = offsetIn(v, o.pen.layer), a = -2.5 + u * 1.1 * Math.PI * 2;
          return { x: r.x + v.offsetWidth / 2 + Math.cos(a) * (v.offsetWidth / 2 + 22), y: r.y + v.offsetHeight / 2 + Math.sin(a) * (v.offsetHeight / 2 + 4) };
        });
        else event("stroke", rt, 0.26, { len: 400 });
        ring = { s, p, t: rt };
      }
      return { box, v, parts, ring };
    });
    return {
      el: root, terms,
      render(t) {
        for (const T of terms) {
          for (const p of T.parts) p.render(t);
          if (T.ring) {
            const w = T.v.offsetWidth, h = T.v.offsetHeight;
            T.ring.s.setAttribute("viewBox", `0 0 ${w} ${h}`);
            T.ring.s.style.width = w + "px"; T.ring.s.style.height = h + "px";
            T.ring.p.setAttribute("d", geo.loop(w / 2, h / 2, w / 2 + 22, h / 2 + 4, 77, 1.08));
            const u = E.io2(pr(t, T.ring.t, 0.26));
            T.ring.p.style.strokeDashoffset = (104 * (1 - u)).toFixed(1);
          }
        }
      },
    };
  }

  /* title(story, { pen, breaks: "punct" | "none", ink }) — the closing line, written word by word at the spoken times,
   * emphasis (story.end.emphasis) in red with a wavy underline drawn after it is spoken */
  function title(story, o = {}) {
    const end = story.data.end || {};
    const L = story.line(end.line || story.lines.length);
    const root = el("div", "kit-title");
    const units = L.words.map(([u, t]) => ({ u, t }));
    const flat = units.map((x) => x.u).join("");
    const emph = new Array(units.length).fill(-1);
    (end.emphasis || []).forEach((ph, k) => {
      const i = flat.indexOf(ph);
      if (i < 0) return;
      let pos = 0;
      units.forEach((x, j) => { const a = pos, b = pos + x.u.length; if (b > i && a < i + ph.length) emph[j] = k; pos = b; });
    });
    let line = el("span", "kit-title-line", root);
    const parts = [], ems = [];
    let curEm = -1, holder = line;
    units.forEach((x, j) => {
      if (emph[j] !== curEm) {
        curEm = emph[j];
        if (curEm >= 0) { holder = el("span", "kit-em", line); ems.push({ el: holder, last: x.t, k: curEm }); }
        else holder = line;
      }
      if (curEm >= 0) ems[ems.length - 1].last = x.t;
      const next = units[j + 1];
      const latin = /[A-Za-z\d]$/.test(x.u) && next && /^[A-Za-z\d]/.test(next.u);
      const s = el("span", "", holder, null, esc(latin ? x.u + " " : x.u));
      const isP = /^[，。：；！？、,.!?]$/.test(x.u);
      const dur = isP ? 0.06 : Math.max(0.08, Math.min(0.24, (next ? next.t - x.t : 0.3) * 0.9));
      parts.push(write(s, { at: x.t - 0.02, dur, pen: isP ? null : o.pen, color: curEm >= 0 ? "accent" : "ink", sound: !isP }));
      if (o.breaks !== "none" && /^[，；]$/.test(x.u) && next) { line = el("span", "kit-title-line", root); holder = line; curEm = -1; }
    });
    ems.forEach((m) => {
      m.t0 = m.last + 0.2;
      if (o.pen) o.pen.trace(m.t0, 0.3, "accent", (u) => {
        const r = offsetIn(m.el, o.pen.layer);
        return { x: r.x + m.el.offsetWidth * E.io2(u), y: r.y + m.el.offsetHeight * 0.98 + Math.sin(u * 14) * 5 };
      });
      else event("stroke", m.t0, 0.3, { len: 300 });
    });
    return {
      el: root,
      render(t) {
        for (const p of parts) p.render(t);
        for (const m of ems) m.el.style.setProperty("--ul", E.io2(pr(t, m.t0, 0.3)).toFixed(3));
      },
    };
  }

  /* recap(story, { at, end, covers: [elements] }) — a fresh page turns in from the right; the pen draws ONE mind map:
   * the subject ringed in the middle, its tagline highlighted, every point on an index card wired to it.
   * The returned el is a full-frame (1920×1080) screen layer with its own pen. `covers` (e.g. the world layer) are
   * hidden once the new page has landed, so nothing underneath competes with it. */
  function recap(story, o = {}) {
    const R = story.recap;
    const at = o.at ?? R.start, endT = o.end ?? R.end ?? story.duration;
    const W = 1920, H = 1080;
    const root = el("div", "kit-recap");
    root.setAttribute("data-layout-allow-overflow", "");
    const paper = el("div", "kit-recap-paper", root);
    el("div", "kit-page-grain", paper);
    el("div", "kit-page-margin", paper, { left: 150 });
    [250, 540, 830].forEach((y) => el("div", "kit-page-hole", paper, { left: 54, top: y - 22 }));
    const inner = el("div", "kit-recap-in", paper);
    const ink = svg(inner, 0, 0, W, H);
    const pen = new Pen(inner, { enter: { x: 1700, y: 1150 }, rest: { x: 80, y: 110 } });
    const items = [];

    // the points sit in slots around the centre, numbered clockwise from the top-left
    const pts = R.points || [];
    const SLOTS = {
      1: ["B"], 2: ["L", "R"], 3: ["L", "R", "B"], 4: ["TL", "TR", "BR", "BL"],
      5: ["TL", "TR", "BR", "B", "BL"], 6: ["TL", "TR", "R", "BR", "BL", "L"],
    };
    const n = Math.min(6, pts.length);
    const CW = 560, CX = 960, CY = n === 5 || n === 3 ? 452 : n === 6 ? 540 : 516;
    const rowY = n === 6 ? { T: 215, M: 540, B: 865 } : n === 5 ? { T: 262, M: 520, B: 700 } : { T: 300, M: 470, B: 768 };
    const slotXY = (sl) => ({
      TL: [84, rowY.T, "l"], TR: [W - 84 - CW, rowY.T, "r"], L: [84, rowY.M, "l"], R: [W - 84 - CW, rowY.M, "r"],
      BL: [84, rowY.B, "l"], BR: [W - 84 - CW, rowY.B, "r"], B: [CX - CW / 2, n <= 3 ? 880 : 905, "b"],
    })[sl];

    // centre: the subject (auto-sized, split on a space if long) + the tagline, ringed in red
    const center = el("div", "kit-recap-center", inner);
    const words = (o.center || R.center || story.title).split(" ");
    const emW = (s) => [...s].reduce((a, ch) => a + (isCJK(ch) ? 1 : ch === " " ? 0.3 : 0.5), 0);
    let tl = [words.join(" ")];
    if (emW(tl[0]) * 80 > 430 && words.length > 1) {
      let best = 1, bw = 1e9;
      for (let k = 1; k < words.length; k++) { const w = Math.max(emW(words.slice(0, k).join(" ")), emW(words.slice(k).join(" "))); if (w <= bw) { bw = w; best = k; } }
      tl = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
    }
    const tsize = Math.round(Math.min(92, 420 / Math.max(...tl.map(emW))));
    const ttl = el("span", "kit-recap-title", center, { fontSize: tsize });
    tl.forEach((s, i) => { const l = el("span", "", el("span", "", ttl, { display: "block" }), null, esc(s)); items.push(write(l, { at: at + 0.5 + i * 0.16, dur: 0.24, pen })); });
    const tagText = o.tagline || R.tagline || "";
    let tagLines = lines(tagText, 8.5);
    // no one- or two-character widow: rebalance (e.g. 9 characters → 5 + 4); lines without a widow are unchanged
    if (tagLines.length > 1 && emW(tagLines[tagLines.length - 1]) <= 2) tagLines = lines(tagText, Math.ceil(emW(tagLines.join("")) / tagLines.length) + 0.5);
    const tag = el("span", "kit-recap-tag", center);
    let tt = at + 0.8 + (tl.length - 1) * 0.16;
    tagLines.forEach((s, i) => {
      const holder = el("span", "", tag, { display: "block", position: "relative" });
      if (i === tagLines.length - 1) items.push(highlight(holder, { x: "-6px", y: "40%", w: "calc(100% + 12px)", h: "0.42em", at: tt + Math.min(0.4, s.length * 0.05) + 0.06, dur: 0.24, pen }));
      const w = write(el("span", "", holder, { position: "relative" }, hand(s)), { at: tt, dur: Math.min(0.4, s.length * 0.05), pen, color: "accent" });
      tt += w.dur + 0.04;
      items.push(w);
    });
    tt += 0.12;
    const TAG = 46;
    // written words sit in inline-block windows, so a line is ≈1.3em (title) / 1.4em (hand) tall
    const cH = tl.length * tsize * 1.3 + 14 + tagLines.length * TAG * 1.4;
    const cW = Math.max(...tl.map((s) => emW(s) * tsize), ...tagLines.map((s) => emW(s) * TAG));
    center.style.left = CX - cW / 2 + "px";
    center.style.top = CY - cH / 2 + "px";
    center.style.width = cW + "px";
    const rx = Math.max(250, (cW / 2) * 1.32 + 26), ry = Math.max(160, (cH / 2) * 1.32 + 22);
    items.push(stroke(ink, geo.loop(CX, CY, rx, ry, 501, 1.08), { color: "accent", width: 5.5, at: tt, dur: 0.3, pen }));
    tt += 0.3;

    // index cards, each wired to the ring by a hand-drawn arrow
    const t0 = tt + 0.04, step = Math.min(0.36, (endT - 1.7 - t0) / Math.max(1, n));
    pts.slice(0, n).forEach((pt, k) => {
      const [x, cy, side] = slotXY(SLOTS[n][k]);
      const card = el("div", "kit-recap-card", inner, { width: CW });
      el("span", "kit-recap-n", card, null, String(pt.n ?? k + 1));
      const hw = el("span", "", el("span", "kit-recap-h", card), null, hand(pt.title || ""));
      const ls = lines(pt.text || "", 13.2);
      const bodyLines = ls.map((s) => el("span", "", el("span", "kit-recap-line", card), null, hand(s)));
      const estH = 22 + 26 + 46 * 1.15 + ls.length * 48;
      const top = Math.round(cy - estH / 2);
      card.style.left = x + "px";
      card.style.top = top + "px";
      const ta = t0 + k * step;
      const ax = side === "l" ? x + CW + 14 : side === "r" ? x - 14 : CX, ay = side === "b" ? top - 14 : cy;
      const ang = Math.atan2(ay - CY, ax - CX);
      const sx = CX + Math.cos(ang) * rx * 1.03, sy = CY + Math.sin(ang) * ry * 1.03;
      items.push(stroke(ink, geo.arrow(sx, sy, ax, ay, 520 + k, side === "r" ? -0.08 : 0.08, 18), { color: "ink", width: 3.4, at: ta, dur: 0.2, pen }));
      items.push(slap(card, { at: ta + 0.14, rot: [-0.8, 0.7, -0.5, 0.9, -0.6, 0.5][k % 6] }));
      items.push(write(hw, { at: ta + 0.26, dur: 0.14, pen, color: "accent" }));
      let lt = ta + 0.36;
      bodyLines.forEach((b) => { const w = write(b, { at: lt, dur: Math.min(0.26, 0.016 * b.textContent.length + 0.08) }); lt += w.dur; items.push(w); });
    });
    pen.away(endT - 0.9, endT + 5);
    event("turn", at - 0.1, 0.6);
    return {
      el: root, pen,
      render(t) {
        const u = E.io3(pr(t, at - 0.1, 0.62));
        root.style.visibility = u > 0 ? "visible" : "hidden";
        paper.style.transform = u >= 1 ? "none" : `translateX(${((1 - u) * 104).toFixed(2)}%)`;
        for (const c of o.covers || []) c.style.display = u >= 1 ? "none" : "";
        // slow push so the frame never freezes
        const push = pr(t, at + 0.2, Math.max(1, endT - at - 0.2)); // linear: the page never parks
        inner.style.transform = `scale(${(1 + 0.05 * push).toFixed(4)})`;
        for (const it of items) it.render(t);
        pen.render(t);
      },
    };
  }

  g.Kit = {
    name: "v3-notebook",
    colors: COL,
    // shared API
    label, note, number, bars, formula, title, recap,
    // notebook extras
    pen: (layer, o) => new Pen(layer, o), eraser: (layer, o) => new Eraser(layer, o),
    camera: (world, start, o) => new Camera(world, start, o), view,
    scene: () => new Scene(), page, svg, path, stroke, write, writable, slap, tape, highlight, hatchRect,
    geo, hand, lines, offsetIn, el, events, event, prep,
  };
})(window);
