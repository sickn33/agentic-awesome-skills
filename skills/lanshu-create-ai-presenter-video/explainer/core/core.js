/* explainer core — the style-agnostic runtime every style kit and every film shares.
 *
 * Load as a classic script (<script src="core/core.js">) before the film's own script; it defines
 * window.ExplainerCore. Nothing here knows about a topic or a look:
 *   - time helpers and eases (every frame is a pure function of time t)
 *   - track(): camera / value keyframes through monotone Hermite with Fritsch–Carlson limiting
 *   - Story: narration lines, word times, chapters, recap — loaded from a topic's story.json
 *   - Captions / Chapters: DOM builders whose look comes entirely from the style kit's CSS
 *   - place(): put an overlay element at a screen point with an anchor, opacity and scale
 */
(function (g) {
  "use strict";
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const pr = (t, a, d) => clamp01((t - a) / d);
  const lerp = (a, b, u) => a + (b - a) * u;
  // fade in over fi after a, fade out over fo before b
  const env = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(pr(t, a, fi), 1 - pr(t, b - fo, fo));
  const E = {
    linear: (u) => u,
    o2: (u) => 1 - (1 - u) * (1 - u),
    o3: (u) => 1 - Math.pow(1 - u, 3),
    o4: (u) => 1 - Math.pow(1 - u, 4),
    i3: (u) => u * u * u,
    i2: (u) => u * u,
    io2: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
    io3: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    io4: (u) => (u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2),
    back: (u) => { const c1 = 1.6, c3 = c1 + 1; return u <= 0 ? 0 : 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  };
  // deterministic pseudo-random in [0,1)
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  // keys: [[t, v1, v2, ...], ...] sorted by t. Returns [v1, v2, ...] at time t, never overshooting a hold.
  function track(keys, t) {
    const n = keys.length;
    if (t <= keys[0][0]) return keys[0].slice(1);
    if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 0;
    while (keys[i + 1][0] < t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
    const h = k2[0] - k1[0], u = (t - k1[0]) / h, u2 = u * u, u3 = u2 * u, out = [];
    for (let d = 1; d < k1.length; d++) {
      const s01 = i === 0 ? 0 : (k1[d] - k0[d]) / (k1[0] - k0[0]);
      const s12 = (k2[d] - k1[d]) / h;
      const s23 = i + 2 > n - 1 ? 0 : (k3[d] - k2[d]) / (k3[0] - k2[0]);
      let m1 = i === 0 || s01 * s12 <= 0 ? 0 : (s01 + s12) / 2;
      let m2 = i + 1 === n - 1 || s12 * s23 <= 0 ? 0 : (s12 + s23) / 2;
      if (s12 === 0) m1 = m2 = 0;
      else {
        const a = m1 / s12, b = m2 / s12, r = a * a + b * b;
        if (r > 9) { const tau = 3 / Math.sqrt(r); m1 = tau * a * s12; m2 = tau * b * s12; }
      }
      out.push((2 * u3 - 3 * u2 + 1) * k1[d] + (u3 - 2 * u2 + u) * h * m1 + (-2 * u3 + 3 * u2) * k2[d] + (u3 - u2) * h * m2);
    }
    return out;
  }

  /* Story: wraps a topic's story.json
   *   { title, duration, lines: [{i, text, start, end, words: [[unit, t], ...]}],
   *     chapters: [{n, title, start, end}], end: {words: [[unit, t, emphasis?], ...]}, recap: {...} }
   * at(line, unit, nth=1)  -> time the nth occurrence of `unit` is spoken in line `line` (1-based)
   * phrase(line, text)     -> time the first unit of `text` is spoken (text must appear in the line)
   * span(line, text)       -> { start, end }: when `text` starts, and when the unit after it starts (or the line ends)
   * idx(line, unit, nth=1) -> index of that unit in line.words;  word(line, k) -> time of the k-th unit
   * lineAt(t)              -> the line being spoken at t (or null between lines)
   * spoken(line)           -> the line's units without punctuation: [[unit, t], ...]
   * chapterOf(line)        -> the chapter object of a line (null for the closing line)
   */
  function Story(data) {
    this.data = data;
    this.title = data.title;
    this.duration = data.duration;
    this.lines = data.lines;
    this.chapters = data.chapters || [];
    this.recap = data.recap || null;
    this.end = data.end || null; // the closing line: { line, start, emphasis }
  }
  Story.prototype.line = function (i) { return this.lines[i - 1]; };
  Story.prototype.at = function (line, unit, nth = 1) {
    const L = this.line(line);
    let k = 0;
    for (const [u, t] of L.words) if (u === unit && ++k === nth) return t;
    throw new Error(`story.at: "${unit}" #${nth} not in line ${line}: ${L.text}`);
  };
  Story.prototype.phrase = function (line, text) {
    return this.span(line, text).start;
  };
  Story.prototype.span = function (line, text) {
    const L = this.line(line);
    const units = L.words.map((w) => w[0]), want = text.replace(/\s/g, "");
    for (let s = 0; s < units.length; s++) {
      let acc = "", e = s;
      for (; e < units.length && acc.length < want.length; e++) acc += units[e];
      if (acc === want) {
        let n = e;
        while (n < units.length && !/[A-Za-z\d\u3400-\u9fff]/.test(units[n])) n++;
        return { start: L.words[s][1], end: n < units.length ? L.words[n][1] : L.end };
      }
    }
    throw new Error(`story.phrase: "${text}" not in line ${line}: ${L.text}`);
  };
  Story.prototype.idx = function (line, unit, nth = 1) {
    const L = this.line(line);
    let k = 0;
    for (let i = 0; i < L.words.length; i++) if (L.words[i][0] === unit && ++k === nth) return i;
    throw new Error(`story.idx: "${unit}" #${nth} not in line ${line}: ${L.text}`);
  };
  Story.prototype.word = function (line, k) { return this.line(line).words[k][1]; };
  Story.prototype.lineAt = function (t) {
    return this.lines.find((L) => t >= L.start && t < L.end) || null;
  };
  Story.prototype.spoken = function (line) {
    return this.line(line).words.filter((w) => /[A-Za-z\d\u3400-\u9fff]/.test(w[0]));
  };
  // the chapter a line belongs to (story.py writes line.chapter; older stories fall back to the line's start time)
  Story.prototype.chapterOf = function (line) {
    const L = this.line(line);
    if (L.chapter) return this.chapters.find((c) => c.key === L.chapter) || null;
    return this.chapters.find((c) => L.start >= c.start - 0.25 && L.start < c.end) || null;
  };
  Story.prototype.chapterAt = function (t) {
    return this.chapters.find((c) => t >= c.start && t < c.end) || null;
  };

  /* Captions: one element per narration line, one span per unit. The kit's CSS styles
   *   .kit-cap (the line box), .kit-cap > span (a unit), and the custom property --lit (0..1) per span.
   * opts (all optional; the defaults keep the original behaviour):
   *   groups   [[firstLine, lastLine], ...] to show several short lines in one caption box
   *   lead, tail   seconds the box shows before its first word / after its last line ends (0.12 / 0.18)
   *   skipEnd  true: no box for story.end.line (when Kit.title performs the closing line)
   *   air      em of space where a Latin / number unit touches CJK (e.g. 0.2); spans also get .kit-air-l / .kit-air-r
   *   clamp    true: neighbouring boxes never overlap, even with long lead / tail (they hand over at the gap's middle) */
  function Captions(container, story, opts = {}) {
    const endLine = opts.skipEnd && story.end ? story.end.line : null;
    const groups = opts.groups || story.lines.filter((L) => L.i !== endLine).map((L) => [L.i, L.i]);
    this.boxes = groups.map(([a, b]) => {
      const el = document.createElement("div");
      el.className = "kit-cap";
      container.appendChild(el);
      const spans = [];
      for (let i = a; i <= b; i++) {
        story.line(i).words.forEach(([u, t], k, arr) => {
          const s = document.createElement("span");
          const next = arr[k + 1];
          // keep a space between two Latin/number units, never inside CJK
          const latin = /[A-Za-z\d]$/.test(u) && next && /^[A-Za-z\d]/.test(next[0]);
          s.textContent = latin ? u + " " : u;
          el.appendChild(s);
          spans.push({ s, t });
        });
      }
      if (opts.air) airLatin(spans.map((x) => x.s), opts.air);
      return { el, a: story.line(a).start, b: story.line(b).end, spans };
    });
    this.lead = opts.lead ?? 0.12;
    this.tail = opts.tail ?? 0.18;
    this.boxes.forEach((c, k) => {
      c.from = c.a - this.lead;
      c.to = c.b + this.tail;
      if (!opts.clamp) return;
      const prev = this.boxes[k - 1], next = this.boxes[k + 1];
      if (prev) c.from = Math.max(c.from, (prev.b + c.a) / 2);
      if (next) c.to = Math.min(c.to, (c.b + next.a) / 2);
    });
  }
  const CJK = /[\u3400-\u9fff]/, LATIN = /[A-Za-z\d]/;
  function airLatin(spans, em) {
    spans.forEach((s, k) => {
      if (!LATIN.test(s.textContent)) return;
      const p = spans[k - 1], n = spans[k + 1];
      if (p && CJK.test(p.textContent.slice(-1))) { s.classList.add("kit-air-l"); s.style.marginLeft = em + "em"; }
      if (n && CJK.test(n.textContent.charAt(0))) { s.classList.add("kit-air-r"); s.style.marginRight = em + "em"; }
    });
  }
  Captions.prototype.render = function (t) {
    for (const c of this.boxes) {
      const o = env(t, c.from, c.to, 0.18, 0.2);
      c.el.style.opacity = o.toFixed(3);
      c.el.style.visibility = o > 0 ? "visible" : "hidden";
      if (o <= 0) continue;
      for (const w of c.spans) w.s.style.setProperty("--lit", E.o2(pr(t, w.t - 0.04, 0.16)).toFixed(3));
    }
  };

  /* Chapters: a single chip element with .kit-chap-n and .kit-chap-t children (kit CSS styles them).
   * opts.format: (n) => string for the number (default String(n); e.g. (n) => String(n).padStart(2, "0")) */
  function Chapters(el, story, opts = {}) {
    this.el = el;
    this.story = story;
    this.format = opts.format || String;
    el.classList.add("kit-chap");
    el.innerHTML = '<span class="kit-chap-n"></span><span class="kit-chap-t"></span>';
    this.n = el.firstChild;
    this.ti = el.lastChild;
  }
  Chapters.prototype.render = function (t) {
    const c = this.story.chapterAt(t);
    if (!c) { this.el.style.opacity = "0"; return; }
    const num = this.format(c.n);
    if (this.n.textContent !== num) this.n.textContent = num;
    if (this.ti.textContent !== c.title) this.ti.textContent = c.title;
    const o = Math.min(pr(t, c.start + 0.05, 0.35), 1 - pr(t, c.end - 0.25, 0.25));
    this.el.style.opacity = o.toFixed(3);
    this.el.style.setProperty("--in", E.o3(pr(t, c.start + 0.05, 0.45)).toFixed(3));
  };

  // put an absolutely positioned overlay at screen point (x, y); (ax, ay) is the element's anchor in 0..1.
  // opts.inherit: show with visibility "inherit" instead of "visible", so a hidden parent still hides the element
  function place(el, x, y, ax = 0.5, ay = 0.5, opacity = 1, scale = 1, opts) {
    if (opacity <= 0) { if (el.style.opacity !== "0") el.style.opacity = "0"; el.style.visibility = "hidden"; return; }
    el.style.visibility = opts && opts.inherit ? "inherit" : "visible";
    el.style.opacity = opacity.toFixed(3);
    el.style.transformOrigin = `${ax * 100}% ${ay * 100}%`;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${(-ax * 100).toFixed(1)}%, ${(-ay * 100).toFixed(1)}%) scale(${scale.toFixed(3)})`;
  }

  g.ExplainerCore = { version: 2, clamp01, pr, lerp, env, E, hash, track, Story, Captions, Chapters, place };
})(window);
