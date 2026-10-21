/* V11 casefile kit — 案卷 — window.Kit.
 *
 * Investigate the topic like a case on a cork board: cards slap on and are pinned with glossy push pins, red string
 * runs from pin to pin, rubber stamps thump down (已证实 / 推测 / 排除 / 已存档 / 结案), a typewriter fills the forms,
 * yellow sticky notes carry the handwriting, a masking-tape timeline runs along the bottom, and the captions are punched
 * on a black label-maker strip. Load after lib/core.js and lib/story.js. Every factory returns { el, render(t, ...) };
 * render is a pure function of t.
 *
 *   const D = Kit.desk(stage, { x0, y0, x1, y1 })     the board (cork + walnut frame), the lamp, the world layers
 *   Kit.card(D, { x, y, w, kind, tag, tab, pin, rot, at })    a card slapped on and pinned
 *   Kit.pin(D, x, y, { color, at }) · Kit.string(D, a, b, { at, dur }) · Kit.stamp(parent, { text, tone, x, y, at })
 *   Kit.type(el, { at, cps }) typed per character · Kit.write(el, { at, dur }) handwriting · Kit.highlight / mark / tapeline
 *   Kit.label / note / number / bars / formula / title / recap        the shared component API (KITS.md)
 *   Kit.captions(container, story, opts) = core.Captions on label-maker strips (+ yellow key spans), Kit.chapters(el, story)
 *   Kit.camera(D, startView) with .move(view, at, dur, ease) · Kit.view(cx, cy, s) · Kit.scene() · Kit.events (sound cues)
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v11-casefile: load lib/core.js first");
  const { clamp01, pr, E, hash } = C;
  const NS = "http://www.w3.org/2000/svg";
  const COL = {
    ink: "#2B211A", default: "#2B211A", muted: "#5E4C3A", accent: "#C8352B", "accent-2": "#2F5D8A", warn: "#A24A10",
    ok: "#2F6B43", red: "#C8352B", blue: "#2F5D8A", string: "#B3241B", hl: "#FFD633", paper: "#FBF6EA", manila: "#E9D29C",
  };
  const color = (c) => COL[c] || c || COL.ink;
  const PIN = { red: "red", accent: "red", yellow: "yellow", blue: "blue", "accent-2": "blue", white: "white" };
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const P = (x, y) => f(x) + " " + f(y);
  const hs = (n) => hash(n) * 2 - 1;
  const ease = (e) => (typeof e === "function" ? e : E[e] || E.io2);
  const isCJK = (ch) => /[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const emOf = (s) => [...s].reduce((a, ch) => a + (isCJK(ch) ? 1 : ch === " " ? 0.3 : 0.56), 0);

  // ---------------- sound cue log (lib/kit/events.mjs reads window.__kitEvents) ----------------
  const events = [];
  function event(kind, t, d, extra) {
    const e = Object.assign({ kind, t: +(+t).toFixed(3), d: +(d || 0).toFixed(3) }, extra || {});
    events.push(e);
    return e;
  }
  g.__kitEvents = events;

  // ---------------- DOM helpers ----------------
  function el(tag, cls, parent, style, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) for (const k in style) if (style[k] != null) e.style[k] = typeof style[k] === "number" ? style[k] + "px" : style[k];
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
    Object.assign(s.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
    s.setAttribute("data-layout-allow-overflow", "");
    parent.appendChild(s);
    return s;
  }
  function path(parent, d, c, width, style) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.style.fill = "none";
    p.style.stroke = color(c);
    p.style.strokeWidth = width == null ? 4 : width;
    p.style.strokeLinecap = "round";
    p.style.strokeLinejoin = "round";
    if (style) for (const k in style) p.style[k] = style[k];
    parent.appendChild(p);
    return p;
  }
  const allow = (e) => { e.setAttribute("data-layout-allow-overflow", ""); return e; };
  const show = (e, o) => {
    const v = o > 0 ? "visible" : "hidden";
    if (e.style.visibility !== v) e.style.visibility = v;
    e.style.opacity = o.toFixed(3);
  };

  // break text into lines of at most maxEm (CJK = 1 em, Latin ≈ 0.56 em), preferring breaks after punctuation;
  // "\n" always breaks; a line never starts with closing punctuation
  function lines(text, maxEm) {
    if (text.indexOf("\n") >= 0) return text.split("\n").flatMap((t) => lines(t, maxEm));
    const toks = text.match(/[A-Za-z0-9.%+\-/·×÷≈]+|\s+|./gu) || [];
    const out = [];
    let cur = "", w = 0, lastPunct = -1, lastSpace = -1;
    for (const tk of toks) {
      const tw = emOf(tk);
      if (w + tw > maxEm && cur.trim() && !/^[，。；：、！？,.;:!?）)」』]$/.test(tk)) {
        const cut = lastPunct > cur.length * 0.3 ? lastPunct : lastSpace > cur.length * 0.5 ? lastSpace : -1;
        if (cut > 0) { out.push(cur.slice(0, cut).trim()); cur = cur.slice(cut).replace(/^\s+/, ""); }
        else { out.push(cur.trim()); cur = ""; }
        w = emOf(cur);
        lastPunct = -1;
        lastSpace = -1;
        if (/^\s+$/.test(tk) && !cur) continue;
      }
      cur += tk;
      w += tw;
      if (/[，。；：！？,;]/.test(tk)) lastPunct = cur.length;
      else if (/^\s+$/.test(tk)) lastSpace = cur.length;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  // like lines(), but the last line is never a 1–2 character widow (the lines are rebalanced, same count)
  function balanced(text, maxEm) {
    const base = lines(text, maxEm);
    if (base.length < 2 || emOf(base[base.length - 1]) > 2.5) return base;
    const total = emOf(base.join(""));
    for (let m = Math.ceil(total / base.length); m <= maxEm + 4; m += 0.5) {
      const ls = lines(text, m);
      if (ls.length <= base.length && emOf(ls[ls.length - 1]) > 2.5 && Math.max(...ls.map(emOf)) <= maxEm + 1.5) return ls;
    }
    return base;
  }

  // ---------------- hand-drawn marker geometry (SVG path strings, seeded wobble) ----------------
  const geo = {
    line(x1, y1, x2, y2, seed = 1, amp = 4) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, k = hs(seed) * amp;
      return "M " + P(x1, y1) + " Q " + P((x1 + x2) / 2 - (dy / L) * k, (y1 + y2) / 2 + (dx / L) * k) + " " + P(x2, y2);
    },
    // a marker ring round (cx, cy): a little more than one turn, slightly open, slightly tilted
    loop(cx, cy, rx, ry, seed = 1, turns = 1.08) {
      const n = 64, a0 = -2.6 + hs(seed) * 0.3, tilt = hs(seed + 5) * 0.08;
      let d = "";
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = a0 + u * turns * Math.PI * 2;
        const r = 1 + 0.04 * Math.sin(a * 2 + seed) + 0.06 * (u - 0.5);
        const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
        d += (i ? " L " : "M ") + P(cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt));
      }
      return d;
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
    // an underline that dips a little and kicks up at the end
    under(x, y, w, seed = 1) {
      return "M " + P(x, y + hs(seed) * 2) + " Q " + P(x + w * 0.5, y + 7 + hs(seed + 1) * 3) + " " + P(x + w, y - 4 + hs(seed + 2) * 2);
    },
    cross(cx, cy, r, seed = 1) {
      return geo.line(cx - r, cy - r, cx + r, cy + r, seed, r * 0.08) + " " + geo.line(cx + r, cy - r, cx - r, cy + r, seed + 9, r * 0.08);
    },
    tick(x, y, s, seed = 1) {
      return "M " + P(x, y + s * 0.52) + " L " + P(x + s * 0.36 + hs(seed) * 1.2, y + s * 0.9) + " L " + P(x + s + hs(seed + 1) * 2, y + hs(seed + 2) * 2);
    },
    arrow(x1, y1, x2, y2, seed = 1, bow = 0.12, head = 22) {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, k = bow * L + hs(seed) * 3;
      const cx = (x1 + x2) / 2 - (dy / L) * k, cy = (y1 + y2) / 2 + (dx / L) * k;
      const tx = x2 - cx, ty = y2 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, a = 0.5;
      const h1 = { x: x2 - head * (ux * Math.cos(a) - uy * Math.sin(a)), y: y2 - head * (uy * Math.cos(a) + ux * Math.sin(a)) };
      const h2 = { x: x2 - head * (ux * Math.cos(a) + uy * Math.sin(a)), y: y2 - head * (uy * Math.cos(a) - ux * Math.sin(a)) };
      return "M " + P(x1, y1) + " Q " + P(cx, cy) + " " + P(x2, y2) + " M " + P(h1.x, h1.y) + " L " + P(x2, y2) + " L " + P(h2.x, h2.y);
    },
    // a horizontal curly brace from x1 to x2 at y; dir -1 points up (the brace opens downward), +1 points down
    brace(x1, x2, y, dir = -1, depth = 24) {
      const d = depth * dir, xm = (x1 + x2) / 2, r = Math.min(depth * 0.8, (x2 - x1) / 4);
      return "M " + P(x1, y) + " Q " + P(x1, y + d * 0.5) + " " + P(x1 + r, y + d * 0.5) + " L " + P(xm - r, y + d * 0.5) +
        " Q " + P(xm, y + d * 0.5) + " " + P(xm, y + d) + " Q " + P(xm, y + d * 0.5) + " " + P(xm + r, y + d * 0.5) +
        " L " + P(x2 - r, y + d * 0.5) + " Q " + P(x2, y + d * 0.5) + " " + P(x2, y);
    },
  };

  // ---------------- scene: one render call per frame ----------------
  function Scene() { this.items = []; }
  Scene.prototype.add = function (...xs) { for (const x of xs) this.items.push(x); return xs[0]; };
  Scene.prototype.fn = function (render) { this.items.push({ render }); };
  Scene.prototype.render = function (t) { for (const x of this.items) x.render(t); };

  // ---------------- the desk: board (cork + walnut frame), lamp, world layers ----------------
  /* desk(stage, { x0, y0, x1, y1, frame }) — board extents in world px. Layers, bottom to top:
   *   board (world: cork + frame) · lamp (screen: the desk lamp's warm pool and dark corners) · world:
   *   cards → wash (dims the board for the closing) → strings (svg) → pins → top (closing card, loose overlays).
   * D.view(v) moves the board and the world together (v = { x, y, s }, world point at the screen's top-left);
   * D.dim(u) 0..1 dims the board under the wash; D.hush(u) 0..1 fades the cards' contents (tags, text, stamps) so a
   * screen-space recap can sit over the board without covering any text. */
  function desk(stage, o = {}) {
    const x0 = o.x0 ?? 0, y0 = o.y0 ?? 0, x1 = o.x1 ?? 1920, y1 = o.y1 ?? 1080, F = o.frame ?? 72;
    stage.classList.add("kit-stage");
    const board = allow(el("div", "kit-board", stage));
    const cork = el("div", "kit-cork", board, { left: x0, top: y0, width: x1 - x0, height: y1 - y0 });
    const frame = el("div", "kit-frame", board, { left: x0 - F, top: y0 - F, width: x1 - x0 + 2 * F, height: y1 - y0 + 2 * F, borderWidth: F + "px" });
    const lamp = el("div", "kit-lamp", stage);
    const world = allow(el("div", "kit-world", stage));
    const cards = allow(el("div", "kit-layer kit-cards", world));
    const wash = el("div", "kit-wash", world, { left: x0 - F, top: y0 - F, width: x1 - x0 + 2 * F, height: y1 - y0 + 2 * F });
    const strings = svg(world, x0 - F, y0 - F, x1 - x0 + 2 * F, y1 - y0 + 2 * F);
    strings.classList.add("kit-strings");
    const pins = allow(el("div", "kit-layer kit-pins", world));
    const top = allow(el("div", "kit-layer kit-top", world));
    const D = {
      stage, board, cork, frame, lamp, world, cards, wash, strings, pins, top, x0, y0, x1, y1, F, s: 1, v: null,
      view(v) {
        const tr = `translate(${(-v.x * v.s).toFixed(2)}px,${(-v.y * v.s).toFixed(2)}px) scale(${v.s.toFixed(4)})`;
        board.style.transform = tr;
        world.style.transform = tr;
        D.s = v.s;
        D.v = v;
        // strings keep ≈ 3.4 px on screen near 1:1 and stay visible (≈ 2.5 px) in a whole-board pull-back
        world.style.setProperty("--kit-sw", (3.4 / Math.pow(v.s, 0.78)).toFixed(2) + "px");
        return v;
      },
      dim(u) { show(wash, clamp01(u)); },
      hush(u) {
        u = clamp01(u);
        world.style.setProperty("--kit-hush", u.toFixed(3));
        if (u > 0 && u < 0.999) world.setAttribute("data-hushing", ""); else world.removeAttribute("data-hushing");
        if (u >= 0.999) world.setAttribute("data-hushed", ""); else world.removeAttribute("data-hushed");
      },
    };
    return D;
  }

  // ---------------- camera: piecewise moves (log-scale zoom, centre interpolated) ----------------
  const view = (cx, cy, s, W = 1920, H = 1080) => ({ x: cx - W / 2 / s, y: cy - H / 2 / s, s });
  /* camera(target, startView) — target: a desk (its view()), an element / array of elements, or a function(v) */
  function Camera(target, start, o = {}) {
    this.target = target;
    this.start = start;
    this.moves = [];
    this.last = start;
    this.W = o.W || 1920;
    this.H = o.H || 1080;
  }
  // o: { sound: false } keeps the move out of the sound-cue log (slow drifts)
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
        const u = k.e((t - k.t0) / (k.t1 - k.t0));
        const ca = { x: k.a.x + this.W / 2 / k.a.s, y: k.a.y + this.H / 2 / k.a.s }, cb = { x: k.b.x + this.W / 2 / k.b.s, y: k.b.y + this.H / 2 / k.b.s };
        const s = Math.exp(Math.log(k.a.s) + (Math.log(k.b.s) - Math.log(k.a.s)) * u);
        return view(ca.x + (cb.x - ca.x) * u, ca.y + (cb.y - ca.y) * u, s, this.W, this.H);
      }
      break;
    }
    return c;
  };
  Camera.prototype.apply = function (v) {
    const T = this.target;
    if (!T) return v;
    if (typeof T === "function") return T(v), v;
    if (T.view && T.world) return T.view(v);
    const tr = `translate(${(-v.x * v.s).toFixed(2)}px,${(-v.y * v.s).toFixed(2)}px) scale(${v.s.toFixed(4)})`;
    for (const e of Array.isArray(T) ? T : [T]) e.style.transform = tr;
    return v;
  };
  Camera.prototype.render = function (t) { return this.apply(this.at(t)); };

  // ---------------- push pins ----------------
  /* pin(D, x, y, { color: red | yellow | blue | white, at, size, out: [t, dur], sound }) — drops in and is pushed into
   * the cork: a big soft shadow shrinks to a tight one, a tiny press at the end. Pins live in D.pins (above strings). */
  function pin(D, x, y, o = {}) {
    const c = PIN[o.color || o.tone || "red"] || "red";
    const p = el("div", "kit-pin" + (c !== "red" ? " kit-pin-" + c : ""), o.parent || D.pins, { left: x, top: y });
    if (o.size) Object.assign(p.style, { width: o.size + "px", height: o.size + "px", margin: -o.size / 2 + "px 0 0 " + -o.size / 2 + "px" });
    const at = o.at ?? 0;
    if (o.sound !== false) event("pin", at + 0.12, 0);
    return {
      el: p, x, y, at,
      render(t) {
        const u = pr(t, at, 0.12);
        let op = Math.min(1, u * 3);
        if (o.out) op *= 1 - pr(t, o.out[0], o.out[1] || 0.25);
        show(p, op);
        if (op <= 0) return;
        const e = E.i2(u), press = pr(t, at + 0.12, 0.09);
        const s = (1.9 - 0.9 * e) * (1 - 0.08 * Math.sin(Math.PI * press));
        p.style.transform = `translate(${f(-12 * (1 - e))}px,${f(-30 * (1 - e))}px) scale(${s.toFixed(3)})`;
        p.style.setProperty("--pin-lift", (1 - e).toFixed(3));
      },
    };
  }

  // ---------------- cards ----------------
  /* card(D, { x, y, w, h, kind, rot, tag, tagTone, tab, pin, pinX, pinY, pad, rule, ruleTop, at, dur, from, out, parent, cls, sound })
   *   kind: paper | lined | index | manila | photo | sticky. The card turns about its pin (pinX, pinY: card-local,
   *   default top centre), so the pin's board point never moves: card.pt = { x, y } is where strings tie on.
   *   It slaps down at `at` (from above, a little larger and turned), the pin is pushed in right after it lands.
   *   pin: true / "red" | "yellow" | "blue" | "white" | false. out: [t, dur] lifts it off again. */
  function card(D, o = {}) {
    const kind = o.kind || "paper", w = o.w ?? 520;
    const c = el("div", "kit-card kit-" + kind + (o.cls ? " " + o.cls : ""), o.parent || D.cards, { left: o.x, top: o.y, width: w });
    if (o.h != null) c.style.height = o.h + "px";
    if (o.pad != null) c.style.padding = typeof o.pad === "number" ? o.pad + "px" : o.pad;
    if (o.rule) c.style.setProperty("--rule", o.rule + "px");
    if (o.ruleTop != null) c.style.setProperty("--rule-top", o.ruleTop + "px");
    // the pin sits at the top centre, or right of the tag when the tag reaches past the middle
    const tagW = o.tag ? 22 + 34 + emOf(o.tag) * 32 : 0;
    const pinX = o.pinX ?? Math.min(w - 40, Math.max(w / 2, tagW + 44)), pinY = o.pinY ?? 26;
    c.style.transformOrigin = `${pinX}px ${pinY}px`;
    const rot = o.rot ?? 0, at = o.at ?? 0, dur = o.dur ?? 0.18;
    const tag = o.tag ? el("div", "kit-tag" + (o.tagTone ? " kit-tag-" + o.tagTone : ""), c, null, esc(o.tag)) : null;
    const tab = o.tab ? el("div", "kit-tab", c, null, esc(o.tab)) : null;
    let pn = null;
    if (o.pin !== false && o.pin !== null) {
      const pc = typeof o.pin === "string" ? o.pin : (o.pin && o.pin.color) || "red";
      pn = pin(D, o.x + pinX, o.y + pinY, { color: pc, at: at + dur + 0.04, sound: o.sound, out: o.out });
    }
    const fr = o.from || {};
    const x0 = fr.x ?? 0, y0 = fr.y ?? -40, r0 = fr.rot ?? 6, s0 = fr.scale ?? 1.1;
    if (o.sound !== false) event("slap", at + dur, 0, { w: Math.round(w) });
    return {
      el: c, tag, tab, pin: pn, x: o.x, y: o.y, w, at, dur, rot,
      pt: { x: o.x + pinX, y: o.y + pinY },
      land: at + dur,
      /* tie(where, inset): a board point on the card's edge for a string — t (the pin) | tl | tr | bl | br | l | r | b;
       * corners are inset (default 18 px) and turn with the card. Height: o.h, else the laid-out height. */
      tie(where = "t", inset = 18) {
        const h = o.h ?? (c.offsetHeight || 300), ix = Array.isArray(inset) ? inset[0] : inset, iy = Array.isArray(inset) ? inset[1] : inset;
        const M = { t: [pinX, pinY], tl: [ix, iy], tr: [w - ix, iy], bl: [ix, h - iy], br: [w - ix, h - iy], l: [ix, h / 2], r: [w - ix, h / 2], b: [w / 2, h - iy] };
        const [lx, ly] = M[where] || M.t, a = (rot * Math.PI) / 180, dx = lx - pinX, dy = ly - pinY;
        return { x: o.x + pinX + dx * Math.cos(a) - dy * Math.sin(a), y: o.y + pinY + dx * Math.sin(a) + dy * Math.cos(a) };
      },
      render(t) {
        const u = pr(t, at, dur);
        if (pn) pn.render(t);
        if (u <= 0) { if (c.style.visibility !== "hidden") show(c, 0); return; }
        const e = E.i2(u), settle = pr(t, at + dur, 0.14);
        let op = Math.min(1, u * 2.5), x = x0 * (1 - e), y = y0 * (1 - e), r = rot + r0 * (1 - e), s = 1 + (s0 - 1) * (1 - e);
        s *= 1 - 0.012 * Math.sin(Math.PI * settle);
        let lift = 1 - e;
        if (o.out) {
          const v = E.i2(pr(t, o.out[0], o.out[1] || 0.3));
          y -= 70 * v; x += 40 * v; r -= 8 * v; op *= 1 - v; lift += v;
        }
        show(c, op);
        c.style.transform = `translate(${f(x)}px,${f(y)}px) rotate(${f(r)}deg) scale(${s.toFixed(4)})`;
        c.style.setProperty("--lift", lift.toFixed(3));
      },
    };
  }

  /* ties(A, B, { a: [corners], b: [corners], insetA, insetB }) — the closest pair of corner ties between two cards, so a
   * string runs round the cards' text rather than across it: [pointOnA, pointOnB] */
  function ties(A, B, o = {}) {
    const ca = o.a || ["tl", "tr", "bl", "br"], cb = o.b || ["tl", "tr", "bl", "br"];
    const ins = (c, where, v) => (v != null ? v : where === "tl" || where === "tr" ? [18, 44] : 18);
    let best = null, bd = 1e18;
    for (const wa of ca) for (const wb of cb) {
      const pa = A.tie(wa, ins(A, wa, o.insetA)), pb = B.tie(wb, ins(B, wb, o.insetB)), d = Math.hypot(pa.x - pb.x, pa.y - pb.y);
      if (d < bd - 1) { bd = d; best = [pa, pb]; }
    }
    return best;
  }

  // slap any element down (labels, notes without a desk): o: { at, rot, dur, from, out }
  function slap(e, o = {}) {
    const at = o.at ?? 0, rot = o.rot ?? 0, dur = o.dur ?? 0.16, fr = o.from || {};
    const s0 = fr.scale ?? 1.12, r0 = fr.rot ?? rot + 6, x0 = fr.x ?? 0, y0 = fr.y ?? -26;
    if (o.sound !== false) event("slap", at + dur, 0, { w: 200 });
    return {
      el: e, at,
      render(t) {
        const u = E.i2(pr(t, at, dur));
        let op = pr(t, at, dur * 0.5), x = x0 * (1 - u), y = y0 * (1 - u), r = r0 + (rot - r0) * u, s = s0 + (1 - s0) * u;
        if (o.out) { const v = E.i2(pr(t, o.out[0], o.out[1] || 0.3)); y -= 70 * v; x += 50 * v; r += 10 * v; op *= 1 - v; }
        show(e, op);
        e.style.transform = `translate(${f(x)}px,${f(y)}px) rotate(${f(r)}deg) scale(${s.toFixed(3)})`;
      },
    };
  }

  // ---------------- red string between two anchors ----------------
  /* string(D, a, b, { at, dur, sag, bend, via, tone, width, ease, out, sound, parent, ends }) — a, b: board points (card.pt,
   * card.tie("br"), pin {x,y}). Pulled from a to b over dur, sagging a little under its own weight, with a soft shadow on
   * the cork. Its width follows the camera (--kit-sw) unless `width` is given. ends: true (or [colorA, colorB], size via
   * endSize) pushes a small pin at each end — at `a` as it leaves, at `b` as it arrives — for ties that are not pins.
   * .point(u) / .head(t): where the string's end is; .pins: the end pins. */
  function string(D, a, b, o = {}) {
    if (o.ends) {
      const cs = Array.isArray(o.ends) ? o.ends : ["white", "white"], sz = o.endSize || 24, at0 = o.at ?? 0, d0 = o.dur ?? 0.42;
      const pa = cs[0] ? pin(D, a.x, a.y, { color: cs[0], size: sz, at: at0 - 0.1, out: o.out, sound: o.sound }) : null;
      const pb = cs[1] ? pin(D, b.x, b.y, { color: cs[1], size: sz, at: at0 + d0 - 0.06, out: o.out, sound: o.sound }) : null;
      const st = string(D, a, b, Object.assign({}, o, { ends: null }));
      const r0 = st.render;
      st.pins = [pa, pb].filter(Boolean);
      st.render = (t) => { r0(t); for (const q of st.pins) q.render(t); };
      return st;
    }
    const parent = o.parent || D.strings;
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const sag = o.sag ?? Math.min(140, 10 + 0.055 * L), bend = o.bend ?? 0;
    // via: a board point the string passes through halfway (routes it round a card); else sag + bend
    const cx = o.via ? 2 * o.via.x - (a.x + b.x) / 2 : (a.x + b.x) / 2 - (dy / L) * bend;
    const cy = o.via ? 2 * o.via.y - (a.y + b.y) / 2 : (a.y + b.y) / 2 + (dx / L) * bend + sag;
    const d = "M " + P(a.x, a.y) + " Q " + P(cx, cy) + " " + P(b.x, b.y);
    const sh = path(parent, d, "rgba(42, 18, 5, 0.32)", null);
    sh.setAttribute("transform", "translate(2 5)");
    const p = path(parent, d, o.tone ? color(o.tone) : COL.string, null);
    if (o.width) { p.style.strokeWidth = o.width + "px"; sh.style.strokeWidth = o.width * 1.25 + "px"; }
    else { p.style.strokeWidth = "var(--kit-sw, 3.4px)"; sh.style.strokeWidth = "calc(var(--kit-sw, 3.4px) * 1.25)"; }
    const len = p.getTotalLength() + 4;
    for (const q of [sh, p]) { q.style.strokeDasharray = `${f(len)} ${f(len + 80)}`; q.style.strokeDashoffset = f(len); }
    const at = o.at ?? 0, dur = o.dur ?? 0.42, ez = ease(o.ease || "io2");
    if (o.sound !== false && dur > 0) event("string", at, dur, { len: Math.round(L) });
    const point = (u) => { const v = 1 - u; return { x: v * v * a.x + 2 * v * u * cx + u * u * b.x, y: v * v * a.y + 2 * v * u * cy + u * u * b.y }; };
    return {
      el: p, shadow: sh, a, b, at, dur, point,
      head: (t) => point(ez(pr(t, at, dur))),
      render(t) {
        const u = ez(pr(t, at, dur));
        const off = f(len * (1 - u)), vis = u > 0 ? "visible" : "hidden";
        let op = 1;
        if (o.out) op = 1 - pr(t, o.out[0], o.out[1] || 0.3);
        for (const q of [sh, p]) { q.style.strokeDashoffset = off; q.style.visibility = op > 0 ? vis : "hidden"; q.style.opacity = op.toFixed(3); }
      },
    };
  }

  // ---------------- rubber stamps ----------------
  /* stamp(parent, { text, tone: accent | accent-2 | ink, x, y (its centre, parent px), rot, size, at, opacity, out })
   * thumps down from above (fast, a tiny bounce), multiply-blended, uneven ink. Instead of x / y, place:
   * { left | right, top | bottom } pins its corner (px or em strings); size: null keeps the font size from CSS. */
  function stamp(parent, o = {}) {
    const tone = o.tone || "accent", at = o.at ?? 0, rot = o.rot ?? -9, size = o.size === undefined ? 64 : o.size;
    const root = el("div", "kit-stamp kit-tone-" + tone, parent, o.place ? { left: o.place.left, top: o.place.top, right: o.place.right, bottom: o.place.bottom, fontSize: size } : { left: o.x ?? 0, top: o.y ?? 0, fontSize: size });
    const tr0 = o.place ? "" : "translate(-50%,-50%) ";
    // a stamp is meant to land over the paper's text (multiply): its text waives the overlap check
    el("span", "kit-stamp-t", root, null, esc(o.text || "已证实")).setAttribute("data-layout-allow-overlap", "");
    const m = Math.round(hash(at * 7.3 + size) * 200) + "px " + Math.round(hash(at * 3.1 + 9) * 200) + "px";
    root.style.webkitMaskPosition = m;
    root.style.maskPosition = m;
    if (o.sound !== false) event("stamp", at + 0.09, 0, { size: size || 64 });
    return {
      el: root, at,
      render(t) {
        const u = pr(t, at, 0.09);
        let op = (o.opacity ?? 0.9) * Math.min(1, u * 1.8);
        if (o.out) op *= 1 - pr(t, o.out[0], o.out[1] || 0.25);
        show(root, op);
        if (op <= 0) return;
        const e = E.i3(u), b = pr(t, at + 0.09, 0.16);
        const s = (1.75 - 0.75 * e) * (1 + 0.04 * Math.sin(Math.PI * b) * (1 - b));
        root.style.transform = `${tr0}rotate(${f(rot)}deg) scale(${s.toFixed(3)})`;
      },
    };
  }

  // ---------------- typed text: character by character, at typewriter speed ----------------
  /* typer(el) → { n, set(k) }: shows the first k characters (whitespace is free). A plain-text element keeps ONE text
   * node — the typed prefix — and a hidden span holding the rest, so nothing reflows and the layout audit sees one text
   * block (per-character spans clipped at the frame edge read as overlapping text). Elements with markup inside fall
   * back to one hidden span per character (marked data-layout-allow-overlap). */
  function typer(e) {
    if (e.__typer) return e.__typer;
    const plain = e.childNodes.length === 1 && e.firstChild.nodeType === 3;
    let T;
    if (plain) {
      const text = e.firstChild.data, cps = [...text], cut = [0];
      cps.forEach((c, i) => { if (!/\s/.test(c)) cut.push(i + 1); });
      const node = e.firstChild, rest = document.createElement("span");
      rest.className = "kit-type-rest";
      e.appendChild(rest);
      let shown = -1;
      T = {
        n: cut.length - 1,
        set(k) {
          k = Math.max(0, Math.min(cut.length - 1, k));
          if (k === shown) return;
          shown = k;
          const i = k === cut.length - 1 ? cps.length : cut[k];
          node.data = cps.slice(0, i).join("");
          rest.textContent = cps.slice(i).join("");
        },
      };
      T.set(0);
    } else {
      const cs = chars(e);
      let shown = 0;
      T = {
        n: cs.length,
        set(k) {
          k = Math.max(0, Math.min(cs.length, k));
          if (k === shown) return;
          for (let i = Math.min(k, shown); i < Math.max(k, shown); i++) cs[i].style.visibility = i < k ? "visible" : "hidden";
          shown = k;
        },
      };
    }
    e.__typer = T;
    return T;
  }
  function chars(e) {
    if (e.__chars) return e.__chars;
    const out = [];
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const c of [...ch.textContent]) {
            if (/\s/.test(c)) frag.appendChild(document.createTextNode(c));
            else { const s = document.createElement("span"); s.className = "kit-ch"; s.textContent = c; s.setAttribute("data-layout-allow-overlap", ""); frag.appendChild(s); out.push(s); }
          }
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && !ch.classList.contains("kit-ch")) walk(ch);
      }
    };
    walk(e);
    e.__chars = out;
    return out;
  }
  /* type(el, { at, cps (chars / s, default 16), dur, out, sound }) — characters strike one by one in place (nothing
   * reflows). Returns { el, at, dur, end, render } */
  function type(e, o = {}) {
    const T = typer(e), n = Math.max(1, T.n);
    const at = o.at ?? 0, dur = o.dur ?? n / (o.cps || 16);
    if (o.sound !== false && T.n) event("type", at, dur, { n: T.n });
    return {
      el: e, at, dur, end: at + dur,
      render(t) {
        T.set(t < at ? 0 : Math.floor(((t - at) / Math.max(1e-6, dur)) * n + 1e-6) + 1);
        if (o.out) e.style.opacity = (1 - pr(t, o.out[0], o.out[1] || 0.25)).toFixed(3);
      },
    };
  }
  /* typed(parent, text, { x, y, size, cls, tone, at, cps, dur, html }) — an absolutely placed typed line (board px) */
  function typed(parent, text, o = {}) {
    const e = el("div", "kit-abs kit-typed kit-tone-" + (o.tone || "ink") + (o.cls ? " " + o.cls : ""), parent, { left: o.x ?? 0, top: o.y ?? 0, fontSize: o.size || 40 }, o.html ? text : esc(text));
    const tp = type(e, { at: o.at, cps: o.cps, dur: o.dur, out: o.out, sound: o.sound });
    tp.el = e;
    return tp;
  }

  // ---------------- handwriting: a window slides open while its content slides back (marker speed) ----------------
  function writable(e) {
    if (e.__inner) return e;
    const inner = document.createElement("span");
    inner.className = "kit-wx";
    while (e.firstChild) inner.appendChild(e.firstChild);
    e.appendChild(inner);
    e.classList.add("kit-w");
    e.__inner = inner;
    e.style.visibility = "hidden";
    return e;
  }
  const nchars = (e) => (e.textContent || "").replace(/\s/g, "").length;
  /* write(el, { at, dur, out, sound }) — handwriting uncovered left to right */
  function write(e, o = {}) {
    writable(e);
    const n = Math.max(1, nchars(e));
    const at = o.at ?? 0, dur = o.dur ?? Math.min(1.2, Math.max(0.14, n * 0.07)), ez = ease(o.ease || "linear");
    if (o.sound !== false) event("hand", at, dur, { n });
    const inner = e.__inner;
    return {
      el: e, at, dur, end: at + dur,
      render(t) {
        const u = ez(pr(t, at, dur));
        if (u <= 0) { e.style.visibility = "hidden"; return; }
        e.style.visibility = "visible";
        e.style.transform = u >= 1 ? "none" : `translateX(${((u - 1) * 100).toFixed(2)}%)`;
        inner.style.transform = u >= 1 ? "none" : `translateX(${((1 - u) * 100).toFixed(2)}%)`;
        if (o.out) e.style.opacity = (1 - pr(t, o.out[0], o.out[1] || 0.25)).toFixed(3);
      },
    };
  }
  /* hand(parent, text, { x, y, size, tone (default accent: the red marker), rot, at, dur }) — a handwritten line */
  function hand(parent, text, o = {}) {
    const holder = el("div", "kit-abs kit-hand kit-tone-" + (o.tone || "accent"), parent, { left: o.x ?? 0, top: o.y ?? 0, fontSize: o.size || 50 });
    if (o.rot) holder.style.transform = `rotate(${o.rot}deg)`;
    const s = el("span", "", holder, null, esc(text));
    const w = write(s, { at: o.at, dur: o.dur, out: o.out, sound: o.sound });
    w.holder = holder;
    return w;
  }

  // ---------------- highlighter, marker strokes, masking tape ----------------
  /* highlight(parent, { x, y, w, h, at, dur, under, tone, out }) — a yellow swipe; `under`: the text element it marks
   * (inserted just before it so the ink stays on top) */
  function highlight(parent, o) {
    const h = el("div", "kit-hl" + (o.tone === "warn" ? " kit-tone-warn" : ""), null, { left: o.x, top: o.y, width: o.w, height: o.h });
    if (o.under && o.under.parentNode === parent) parent.insertBefore(h, o.under);
    else parent.appendChild(h);
    const at = o.at ?? 0, dur = o.dur ?? 0.3, ez = ease("io2");
    if (o.sound !== false) event("hl", at, dur);
    return {
      el: h, at, dur,
      render(t) {
        const u = ez(pr(t, at, dur));
        h.style.visibility = u > 0 ? "visible" : "hidden";
        h.style.transform = `scaleX(${u.toFixed(3)})`;
        if (o.out) h.style.opacity = (1 - pr(t, o.out[0], o.out[1] || 0.25)).toFixed(3);
      },
    };
  }
  function prep(p) {
    const L = p.getTotalLength() + 2;
    p.__len = L;
    p.style.strokeDasharray = f(L) + " " + f(L + 80);
    p.style.strokeDashoffset = f(L + 20);
    return L;
  }
  /* mark(svg, d, { at, dur, tone (default accent), width, ease, out, opacity, sound }) — a marker stroke drawn on
   * (rings, underlines, crosses, arrows, brackets: use Kit.geo) */
  function mark(parent, d, o = {}) {
    const p = path(parent, d, o.tone || o.color || "accent", o.width ?? 5);
    if (o.opacity != null) p.style.opacity = o.opacity;
    const L = prep(p), at = o.at ?? 0, dur = o.dur ?? 0.3, ez = ease(o.ease || "io2");
    if (o.sound !== false && dur > 0) event("mark", at, dur, { len: Math.round(L) });
    const op = o.opacity == null ? 1 : o.opacity;
    return {
      el: p, at, dur,
      render(t) {
        const u = ez(pr(t, at, dur));
        p.style.strokeDashoffset = ((L + 20) * (1 - u)).toFixed(1);
        p.style.visibility = u > 0 ? "visible" : "hidden";
        if (o.out) p.style.opacity = (op * (1 - pr(t, o.out[0], o.out[1] || 0.25))).toFixed(3);
      },
    };
  }
  function tape(parent, x, y, w = 150, h = 44, rot = -4) {
    return el("div", "kit-tape", parent, { left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)` });
  }

  /* tapeline(parent, { x, y, w, h, rot, marks: [{ label, html, t, until, tone, p }], at, dur, head: [t0, t1], check })
   * a masking-tape timeline: it unrolls at `at`; marks T1…Tn are evenly spaced (or { p: 0..1 }); a mark lights in
   * its tone (default accent) at t and gets a red dot; after `until` it goes back to ink (visited). head: a red marker
   * arrow rides the tape from the first mark (t0) to the last (t1). */
  function tapeline(parent, o = {}) {
    const w = o.w ?? 1700, h = o.h ?? 60, ms = o.marks || [], n = Math.max(1, ms.length);
    const root = allow(el("div", "kit-tl", parent, { left: o.x ?? 0, top: o.y ?? 0, width: w, height: h }));
    const rot = o.rot ?? -0.5;
    root.style.transform = `rotate(${rot}deg)`;
    tape(root, 0, 0, w, h, 0).classList.add("kit-tl-tape");
    const pad = 22;
    const marks = ms.map((m, k) => {
      // n marks sit at the starts of n equal slots, the set centred on the tape (one mark: just left of the middle)
      const x = m.p != null ? pad + m.p * (w - 2 * pad) : w * (0.06 + (0.84 * k) / n) + (n === 1 ? w * 0.3 : 0);
      const me = el("div", "kit-tl-m", root, { left: x });
      el("i", "kit-tl-tick", me);
      const lab = el("span", "kit-tl-l", me, null, m.html || esc(m.label || ""));
      // tape marks are board texture whenever the camera leans past them (they slide under the caption strip):
      // o.check: true keeps them in the layout / contrast checks
      for (const q of [lab, ...lab.querySelectorAll("*")]) {
        q.setAttribute("data-layout-allow-occlusion", "");
        q.setAttribute("data-layout-allow-overlap", "");
        if (!o.check) q.setAttribute("data-layout-ignore", "");
      }
      const dot = el("i", "kit-tl-dot", me);
      return { me, lab, dot, x, t: m.t, until: m.until, tone: m.tone || "accent" };
    });
    const headEl = o.head ? el("i", "kit-tl-head", root) : null;
    const at = o.at ?? 0, dur = o.dur ?? 0.5;
    if (o.sound !== false) event("tape", at, dur);
    return {
      el: root, marks,
      render(t) {
        const u = E.o3(pr(t, at, dur));
        root.style.visibility = u > 0 ? "visible" : "hidden";
        root.style.clipPath = u >= 1 ? "none" : `inset(-60px ${((1 - u) * 100).toFixed(2)}% -60px -40px)`;
        for (const M of marks) {
          const lit = M.t == null ? 0 : pr(t, M.t, 0.16);
          const on = lit > 0.5 && !(M.until != null && t >= M.until);
          const col = on ? color(M.tone) : lit > 0.5 ? COL.ink : "";
          if (M.lab.style.color !== col) M.lab.style.color = col;
          M.dot.style.transform = `scale(${E.back(lit).toFixed(3)})`;
        }
        if (headEl) {
          const [t0, t1] = o.head, x0 = marks.length ? marks[0].x : pad, x1 = marks.length ? marks[marks.length - 1].x : w - pad;
          const q = pr(t, t0, Math.max(0.01, t1 - t0));
          headEl.style.left = f(x0 + (x1 - x0) * q) + "px";
          headEl.style.visibility = t >= t0 ? "visible" : "hidden";
        }
      },
    };
  }

  // ======================= the shared component API =======================

  /* label({ text, sub, tone, at, cps, rot, out }) — an evidence slip: the text typed, the real term (mono) under it.
   * Place it yourself (append label.el, set left / top). */
  function label(o) {
    const root = el("div", "kit-label kit-tone-" + (o.tone || "ink"));
    const at = o.at ?? 0;
    const sl = slap(root, { at: at - 0.16, rot: o.rot ?? -1.2, out: o.out });
    const t1 = el("span", "kit-label-t", root, null, esc(o.text));
    const parts = [type(t1, { at, cps: o.cps || 18 })];
    if (o.sub) parts.push(type(el("span", "kit-label-sub", root, null, esc(o.sub)), { at: parts[0].end + 0.05, cps: 26 }));
    return { el: root, parts, end: parts[parts.length - 1].end, render(t) { sl.render(t); for (const p of parts) p.render(t); } };
  }

  /* note(text, { at, width, rot, fontSize, speed (s per char), out, desk, x, y, pin, parent }) — the chapter's
   * plain-language sentence on a yellow sticky note, slapped on and handwritten line by line ("\n" breaks).
   * With { desk, x, y } it is a pinned card on the board; without, place note.el yourself. */
  function note(text, o = {}) {
    const width = o.width || 520, fontPx = o.fontSize || 50, at = o.at ?? 0;
    let root, holder;
    if (o.desk) {
      holder = card(o.desk, { kind: "sticky", cls: "kit-note", x: o.x ?? 0, y: o.y ?? 0, w: width, rot: o.rot ?? -1.8, pin: o.pin ?? false, pinY: 20, at, out: o.out, parent: o.parent });
      root = holder.el;
    } else {
      root = el("div", "kit-card kit-sticky kit-note", null, { width });
      holder = slap(root, { at, rot: o.rot ?? -1.8, out: o.out });
    }
    if (o.fontSize) root.style.fontSize = fontPx + "px";
    if (o.desk && o.pin) root.style.paddingTop = "46px";
    const ls = balanced(text, o.maxEm || Math.floor((width - 64) / fontPx - 0.6));
    let tt = at + 0.24;
    const ws = ls.map((s) => {
      const line = el("div", "kit-note-line", root);
      const w = write(el("span", "", line, null, esc(s)), { at: tt, dur: Math.min(0.9, Math.max(0.14, s.replace(/\s/g, "").length * (o.speed || 0.06))) });
      tt = w.end + 0.06;
      return w;
    });
    return { el: root, card: o.desk ? holder : null, pt: o.desk ? holder.pt : null, end: tt, render(t) { holder.render(t); for (const w of ws) w.render(t); } };
  }

  /* number({ value, unit, caption, decimals, tone, at, format, paper }) — typed count-up on a paper slip (paper: false =
   * bare, for use on a card); render(t, u) (u 0..1), or .set(v) */
  function number(o) {
    const root = el("div", "kit-num kit-tone-" + (o.tone || "ink") + (o.paper === false ? "" : " kit-slip"));
    const row = el("span", "", root);
    const v = el("span", "kit-num-v", row);
    if (o.unit) el("span", "kit-num-u", row, null, esc(o.unit));
    const cap = o.caption ? write(el("span", "", el("span", "kit-num-c", root), null, esc(o.caption)), { at: (o.at ?? 0) + 0.3 }) : null;
    const dec = o.decimals || 0, fmt = o.format || ((x) => x.toFixed(dec));
    const at = o.at ?? 0;
    if (o.sound !== false) event("type", at, 0.3, { n: 4 });
    let pinned = null;
    const api = {
      el: root, value: v,
      set(x) { pinned = x; return api; },
      render(t, u) {
        show(row, t >= at ? 1 : 0);
        const val = pinned != null ? pinned : o.value * (u == null ? E.o2(pr(t, at, 0.6)) : clamp01(u));
        const s = fmt(val);
        if (v.textContent !== s) v.textContent = s;
        if (cap) cap.render(t);
      },
    };
    v.textContent = fmt(0);
    return api;
  }

  /* bars({ rows: [{ label, value, max, tone, valueText }], width, rowH, labelW, at, dur, stagger, paper })
   * marker-hatched bars on paper; render(t, u) grows every row (staggered), or render(t) over [at, at + dur] */
  let clipId = 0;
  function bars(o) {
    const root = el("div", "kit-bars" + (o.paper === false ? "" : " kit-slip"));
    const W = o.width || 420, H = o.rowH || 64, lw = o.labelW || 200, th = Math.round(H * 0.6), st = o.stagger ?? 0.12;
    const rows = o.rows.map((r) => {
      const row = el("div", "kit-bar", root, { height: H });
      const lab = el("span", "kit-bar-l", row, { width: lw }, esc(r.label || ""));
      const tube = el("div", "kit-bar-tube", row, { width: W, height: th });
      const s = svg(tube, 0, 0, W, th);
      const id = "kit-bc" + clipId++;
      const cp = document.createElementNS(NS, "clipPath");
      cp.setAttribute("id", id);
      const rect = document.createElementNS(NS, "rect");
      rect.setAttribute("x", "0"); rect.setAttribute("y", "0"); rect.setAttribute("height", String(th)); rect.setAttribute("width", "0");
      cp.appendChild(rect);
      s.appendChild(cp);
      const c = color(r.tone || "accent");
      const wash = document.createElementNS(NS, "rect");
      wash.setAttribute("x", "0"); wash.setAttribute("y", "2"); wash.setAttribute("width", String(W)); wash.setAttribute("height", String(th - 4));
      wash.setAttribute("clip-path", `url(#${id})`);
      wash.style.fill = c; wash.style.opacity = "0.22";
      s.appendChild(wash);
      let hd = "";
      for (let hx = -th; hx < W; hx += 13) hd += "M " + P(hx, th) + " L " + P(hx + th * 0.9, 0) + " ";
      const hat = path(s, hd, c, 4);
      hat.setAttribute("clip-path", `url(#${id})`);
      path(s, "M 0 " + (th - 1) + " L " + W + " " + (th - 1), "ink", 2, { opacity: "0.35" });
      const val = el("span", "kit-bar-v", row, { color: c }, esc(r.valueText != null ? r.valueText : String(r.value)));
      return { lab, rect, val, frac: Math.max(0, Math.min(1, r.value / (r.max || 1))) };
    });
    const n = rows.length, at = o.at ?? 0, dur = o.dur ?? 0.8;
    if (o.sound !== false) event("mark", at, dur, { len: W });
    return {
      el: root,
      render(t, u) {
        if (u == null) u = pr(t, at, dur);
        rows.forEach((R, k) => {
          const uk = clamp01(u * (1 + st * (n - 1)) - st * k);
          show(R.lab, E.o2(clamp01(uk / 0.25)));
          R.rect.setAttribute("width", f(Math.max(0, W * R.frac * E.io2(clamp01((uk - 0.1) / 0.9)))));
          const vu = clamp01((uk - 0.8) / 0.2);
          R.val.style.visibility = vu > 0 ? "visible" : "hidden";
          R.val.style.clipPath = vu >= 1 ? "none" : `inset(-20% ${((1 - vu) * 100).toFixed(1)}% -20% 0)`;
        });
      },
    };
  }

  /* formula({ terms: [{ text, t, sub, tone, ring, size, cps }], paper }) — each term typed at its own spoken time, its
   * meaning handwritten under it; ring: true circles the result in red marker */
  function formula(o) {
    const root = el("div", "kit-formula" + (o.paper === false ? "" : " kit-slip"));
    const terms = o.terms.map((T, k) => {
      const box = el("span", "kit-term kit-tone-" + (T.tone || "ink"), root);
      const v = el("span", "kit-term-v", box, T.size ? { fontSize: T.size } : null, esc(T.text));
      const parts = [type(v, { at: T.t, cps: T.cps || 22 })];
      if (T.sub) parts.push(write(el("span", "", el("span", "kit-term-sub", box), null, esc(T.sub)), { at: parts[0].end + 0.04, dur: Math.min(0.4, 0.07 * T.sub.length + 0.08) }));
      let ring = null;
      if (T.ring) {
        const s = document.createElementNS(NS, "svg");
        s.setAttribute("class", "kit-ink");
        s.setAttribute("data-layout-allow-overflow", "");
        box.appendChild(s);
        const p = path(s, "M 0 0", T.ring === true ? "accent" : T.ring, 5);
        p.setAttribute("pathLength", "100");
        p.style.strokeDasharray = "100 140";
        const rt = parts[parts.length - 1].end + 0.06;
        event("mark", rt, 0.3, { len: 400 });
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
            T.ring.p.setAttribute("d", geo.loop(w / 2, h / 2, w / 2 + 12, h / 2 + 6, 77));
            const u = E.io2(pr(t, T.ring.t, 0.3));
            T.ring.p.style.strokeDashoffset = (104 * (1 - u)).toFixed(1);
            T.ring.p.style.visibility = u > 0 ? "visible" : "hidden";
          }
        }
      },
    };
  }

  /* title(story, { tag, stamp, stampText, breaks, at }) — the closing line on a lined sheet: every unit strikes as it is
   * spoken (display serif), story.end.emphasis in red, each emphasis ringed in red marker right after it is said,
   * then a 结案 stamp thumps on the corner. el is a .kit-card; size it with font-size (= the display size). */
  function title(story, o = {}) {
    const end = story.data.end || {};
    const L = story.line(end.line || story.lines.length);
    const root = el("div", "kit-card kit-lined kit-title");
    if (o.tag !== false) el("div", "kit-tag kit-tag-accent", root, null, esc(o.tag || "结论"));
    const txt = el("div", "kit-title-text", root);
    const units = L.words.map(([u, t]) => ({ u, t }));
    const flat = units.map((x) => x.u).join("");
    const emph = new Array(units.length).fill(-1);
    (end.emphasis || []).forEach((ph, k) => {
      const i = flat.indexOf(ph);
      if (i < 0) return;
      let pos = 0;
      units.forEach((x, j) => { const a = pos, b = pos + x.u.length; if (b > i && a < i + ph.length) emph[j] = k; pos = b; });
    });
    let line = el("span", "kit-title-line", txt), holder = line, curEm = -1;
    const parts = [], ems = [];
    units.forEach((x, j) => {
      if (emph[j] !== curEm) {
        curEm = emph[j];
        if (curEm >= 0) { holder = el("span", "kit-em", line); ems.push({ el: holder, last: x.t, k: curEm }); }
        else holder = line;
      }
      if (curEm >= 0) ems[ems.length - 1].last = x.t;
      const next = units[j + 1];
      const latin = /[A-Za-z\d]$/.test(x.u) && next && /^[A-Za-z\d]/.test(next.u);
      const s = el("span", "kit-title-u", holder, null, esc(x.u));
      if (latin) holder.appendChild(document.createTextNode(" "));
      parts.push({ s, t: x.t - 0.03 });
      if (o.breaks !== "none" && /^[，；]$/.test(x.u) && next) { line = el("span", "kit-title-line", txt); holder = line; curEm = -1; }
    });
    event("type", units.length ? units[0].t : 0, units.length ? units[units.length - 1].t - units[0].t + 0.1 : 0, { n: units.length, big: 1 });
    const ink = svg(txt, 0, 0, 10, 10);
    ems.forEach((m, k) => {
      m.t0 = m.last + 0.16;
      m.p = path(ink, "M 0 0", "accent", 7);
      m.p.setAttribute("pathLength", "100");
      m.p.style.strokeDasharray = "100 140";
      event("mark", m.t0, 0.32, { len: 600 });
    });
    const lastT = units.length ? units[units.length - 1].t : 0;
    const st = o.stamp === false ? null : stamp(root, { text: o.stampText || "结案", tone: "accent", place: { right: "0.3em", bottom: "0.16em" }, rot: -11, size: null, at: o.stampAt ?? lastT + 0.42 });
    return {
      el: root, ems, stamp: st, end: lastT,
      render(t) {
        for (const p of parts) {
          const u = pr(t, p.t, 0.12);
          p.s.style.visibility = u > 0 ? "visible" : "hidden";
          p.s.style.transform = u >= 1 ? "none" : `scale(${(1.22 - 0.22 * E.o3(u)).toFixed(3)})`;
        }
        if (ems.length) {
          const W = txt.offsetWidth, H = txt.offsetHeight;
          ink.setAttribute("viewBox", `0 0 ${W} ${H}`);
          Object.assign(ink.style, { left: "0px", top: "0px", width: W + "px", height: H + "px" });
          for (const m of ems) {
            const x = m.el.offsetLeft, y = m.el.offsetTop, w = m.el.offsetWidth, h = m.el.offsetHeight;
            m.p.setAttribute("d", geo.loop(x + w / 2, y + h / 2 + h * 0.04, w / 2 + h * 0.2, h * 0.5, 31 + m.k * 7));
            const u = E.io2(pr(t, m.t0, 0.32));
            m.p.style.strokeDashoffset = (104 * (1 - u)).toFixed(1);
            m.p.style.visibility = u > 0 ? "visible" : "hidden";
          }
        }
        if (st) st.render(t);
      },
    };
  }

  /* recap(story, { at, end, center, tagline, covers }) — ONE composed frame over the pulled-back board (screen space,
   * 1920 × 1080): the case folder slaps down in the middle (recap.center, the tagline in red marker), every point is an
   * index card pinned round it and tied to the folder's pin with red string, then 结案 is stamped on the folder.
   * A linear push keeps it moving to the end. `covers` (elements) fade out under the folder as it lands. */
  function recap(story, o = {}) {
    const R = story.recap;
    const at = o.at ?? R.start, endT = o.end ?? R.end ?? story.duration;
    const W = 1920, H = 1080;
    const root = allow(el("div", "kit-recap"));
    const inner = el("div", "kit-recap-in", root);
    const mini = { cards: el("div", "kit-layer", inner), strings: svg(inner, 0, 0, W, H), pins: el("div", "kit-layer", inner) };
    const items = [];
    const pts = (R.points || []).slice(0, 6), n = pts.length;
    // slots round the centre, numbered clockwise from the top-left
    const SLOTS = { 1: ["B"], 2: ["L", "R"], 3: ["L", "R", "B"], 4: ["TL", "TR", "BR", "BL"], 5: ["TL", "TR", "BR", "B", "BL"], 6: ["TL", "TR", "R", "BR", "BL", "L"] };
    const CW = 540, CX = 960, CY = n === 6 ? 540 : n === 5 || n === 3 ? 448 : n === 0 ? 540 : 520;
    const rowY = n === 6 ? { T: 200, M: 540, B: 880 } : n === 5 ? { T: 250, M: 520, B: 760 } : { T: 270, M: 520, B: 790 };
    const slotXY = (sl) => ({
      TL: [76, rowY.T, "l"], TR: [W - 76 - CW, rowY.T, "r"], L: [76, rowY.M, "l"], R: [W - 76 - CW, rowY.M, "r"],
      BL: [76, rowY.B, "l"], BR: [W - 76 - CW, rowY.B, "r"], B: [CX - CW / 2, n <= 3 ? 860 : 900, "b"],
    })[sl];

    // the folder: recap.center (auto-sized, with space and character breaks) + the tagline in red marker
    const LW = (str) => [...str].reduce((a, ch) => a + (isCJK(ch) ? 1 : ch === " " ? 0.3 : /[A-Z]/.test(ch) ? 0.74 : 0.6), 0); // display 900
    const words = String(o.center || R.center || story.title || "").split(" ");
    const FWMAX = n >= 2 ? 700 : 900, TW = FWMAX - 136;
    let tl = [words.join(" ")];
    if (LW(tl[0]) * 60 > TW && words.length > 1) {
      const dot = words.indexOf("·");
      let best = 1, bw = 1e9;
      if (dot > 0 && dot < words.length - 1) best = dot + 1; // 「案卷 ·」 / 「KV cache」
      else for (let k = 1; k < words.length; k++) { const w = Math.max(LW(words.slice(0, k).join(" ")), LW(words.slice(k).join(" "))); if (w <= bw) { bw = w; best = k; } }
      tl = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
    }
    tl = tl.flatMap((text) => {
      if (LW(text) * 48 <= TW) return [text];
      const rows = [], limit = TW / 60;
      let row = "", width = 0;
      for (const ch of text) {
        const w = LW(ch);
        if (row && width + w > limit) { rows.push(row.trim()); row = ""; width = 0; }
        row += ch; width += w;
      }
      if (row.trim()) rows.push(row.trim());
      return rows;
    });
    const tsize = Math.floor(Math.max(48, Math.min(84, TW / Math.max(1, ...tl.map(LW)))));
    const tagText = o.tagline ?? R.tagline ?? "";
    const tagLines = tagText ? balanced(tagText, 11) : [];
    const fw = Math.round(Math.min(FWMAX, Math.max(460, ...tl.map((s) => LW(s) * tsize + 136), ...tagLines.map((s) => emOf(s) * 50 + 136))));
    const fh = Math.round(tl.length * tsize * 1.34 + (tagLines.length ? 14 + tagLines.length * 62 : 0) + 78);
    const fold = card(mini, { kind: "manila", cls: "kit-recap-folder", x: CX - fw / 2, y: CY - fh / 2, w: fw, h: fh, tab: "案卷", rot: -0.8, pin: "red", at: at + 0.08, dur: 0.2, pinY: 26, from: { y: -60, scale: 1.08, rot: 4 } });
    fold.el.style.height = fh + "px";
    items.push(fold);
    const ttl = el("span", "kit-recap-title", fold.el, { fontSize: tsize });
    tl.forEach((s, i) => items.push(type(el("span", "", el("span", "", ttl, { display: "block" }), null, esc(s)), { at: at + 0.36 + i * 0.12, cps: 40 })));
    let tt = at + 0.62 + (tl.length - 1) * 0.12;
    if (tagLines.length) {
      const tag = el("span", "kit-recap-tag", fold.el);
      tagLines.forEach((s) => { const w = write(el("span", "", el("span", "", tag, { display: "block" }), null, esc(s)), { at: tt, dur: Math.min(0.45, s.length * 0.035 + 0.06) }); tt = w.end + 0.03; items.push(w); });
    }

    // the points: index cards, each tied from the folder's nearest corner to its own corner facing the folder
    const FACE = { TL: ["tl", "br"], TR: ["tr", "bl"], BR: ["br", "tl"], BL: ["bl", "tr"], L: ["l", "r"], R: ["r", "l"], B: ["b", "t"] };
    const t0 = tt + 0.06, step = n ? Math.min(0.34, Math.max(0.2, (endT - 1.9 - t0) / n)) : 0; // complete ≈ 1.5 s before the end
    pts.forEach((pt, k) => {
      const sl = SLOTS[n][k], [x, cy] = slotXY(sl);
      const ls = balanced(pt.text || "", 15.5);
      const ch = 30 + 50 + 6 + ls.length * 46 + 30;
      const top = Math.round(cy - ch / 2);
      const ta = t0 + k * step;
      const cd = card(mini, { kind: "index", cls: "kit-recap-card", x, y: top, w: CW, h: ch, rot: [-1.4, 1.2, -0.9, 1.5, -1.1, 0.8][k % 6], pin: ["yellow", "blue", "yellow", "blue", "yellow", "blue"][k % 6], pinY: 20, at: ta, dur: 0.16 });
      cd.el.style.height = ch + "px";
      const h = el("div", "kit-recap-h", cd.el);
      const nEl = el("span", "kit-recap-n", h, null, String(pt.n ?? k + 1).padStart(2, "0"));
      const hEl = el("span", "kit-recap-ht", h, null, esc(pt.title || ""));
      const [fa, ca] = FACE[sl];
      items.push(cd, string(mini, fold.tie(fa, 20), cd.tie(ca, [26, 22]), { at: ta + 0.2, dur: 0.28, width: 4, sag: 22, ease: "o3", ends: ["red", "white"], endSize: 22 }),
        type(nEl, { at: ta + 0.22, cps: 30, sound: false }), type(hEl, { at: ta + 0.26, cps: 36 }));
      let lt = ta + 0.36;
      ls.forEach((s) => { const w = type(el("span", "kit-recap-line", cd.el, null, esc(s)), { at: lt, cps: 64 }); lt = w.end; items.push(w); });
    });
    const sAt = Math.min(endT - 0.9, t0 + n * step + 0.25);
    const st = stamp(fold.el, { text: o.stampText || "结案", tone: "accent", place: { right: "-14px", bottom: "-34px" }, rot: -12, size: 46, at: sAt });
    items.push(st);
    event("recap", at, endT - at);
    return {
      el: root,
      render(t) {
        const on = t >= at - 0.05;
        root.style.visibility = on ? "visible" : "hidden";
        root.style.display = on ? "" : "none"; // children typed "visible" must not outlive a backward seek
        if (!on) return;
        inner.style.transform = `scale(${(1 + 0.04 * pr(t, at, Math.max(1, endT - at))).toFixed(4)})`; // linear: never parks
        for (const c of o.covers || []) { const v = 1 - pr(t, at + 0.12, 0.3); c.style.opacity = v.toFixed(3); c.style.visibility = v > 0 ? "" : "hidden"; }
        for (const it of items) it.render(t);
      },
    };
  }

  // ---------------- captions + chapter chip ----------------
  /* captions(container, story, opts) — core.Captions (opts: skipEnd, air, clamp, groups, lead, tail) on label-maker
   * strips: the units are wrapped so every wrapped row is its own strip. keys: { line: "phrase" } lights that phrase
   * in yellow as it is spoken; .key(line, phrase) adds one later. */
  function captions(container, story, opts = {}) {
    const cap = new C.Captions(container, story, opts);
    const endLine = opts.skipEnd && story.end ? story.end.line : null;
    const groups = opts.groups || story.lines.filter((L) => L.i !== endLine).map((L) => [L.i, L.i]);
    cap.boxes.forEach((b, k) => {
      const inner = el("span", "kit-cap-in");
      b.spans.forEach(({ s }) => inner.appendChild(s));
      b.el.appendChild(inner);
      b.group = groups[k];
    });
    cap.key = function (line, phrase) {
      if (!phrase) return false;
      for (const b of cap.boxes) {
        const [a, z] = b.group;
        if (line < a || line > z) continue;
        let off = 0;
        for (let i = a; i < line; i++) off += story.line(i).words.length;
        const units = story.line(line).words.map((w) => w[0]), want = String(phrase).replace(/\s/g, "");
        for (let s = 0; s < units.length; s++) {
          let acc = "", e = s;
          for (; e < units.length && acc.length < want.length; e++) acc += units[e];
          if (acc === want) { for (let q = s; q < e; q++) b.spans[off + q].s.classList.add("kit-cap-key"); return true; }
        }
      }
      return false;
    };
    for (const [i, ph] of Object.entries(opts.keys || {})) cap.key(+i, ph);
    return cap;
  }
  // the caption's default key span: the line's last clause of at least 4 em (its payoff), or none for a short line
  function keyPhrase(story, i) {
    const Ws = story.line(i).words, cl = [];
    let cur = null;
    Ws.forEach(([u]) => {
      if (/^[，。；：、！？,.;:!?…—「」『』（）()“”"《》]+$/.test(u)) { cur = null; return; }
      if (!cur) { cur = []; cl.push(cur); }
      cur.push(u);
    });
    const txt = (c) => c.map((u, k) => u + (/[A-Za-z\d]$/.test(u) && c[k + 1] && /^[A-Za-z\d]/.test(c[k + 1]) ? " " : "")).join("");
    if (cl.length < 2) return null;
    for (let k = cl.length - 1; k >= 1; k--) if (emOf(txt(cl[k])) >= 4 && emOf(txt(cl[k])) <= 16) return txt(cl[k]);
    return null;
  }
  const chapters = (e, story, opts) => new C.Chapters(e, story, Object.assign({ format: (n) => String(n).padStart(2, "0") }, opts || {}));

  g.Kit = {
    name: "v11-casefile",
    colors: COL,
    // shared API
    label, note, number, bars, formula, title, recap,
    // casefile extras
    desk, card, ties, pin, string, stamp, type, typer, typed, chars, write, writable, hand, highlight, mark, tape, tapeline, slap,
    captions, keyPhrase, chapters,
    camera: (target, start, o) => new Camera(target, start, o), view,
    scene: () => new Scene(), geo, el, svg, path, prep, esc, lines, balanced, emOf, events, event,
  };
})(window);
