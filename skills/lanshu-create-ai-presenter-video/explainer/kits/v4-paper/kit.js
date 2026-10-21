/* v4-paper kit — 纸艺「立体书」 (paper-cut pop-up book).
 *
 * Load after lib/core.js and lib/story.js; defines window.Kit. Link lib/kit/kit.css in <head>.
 * Every factory returns { el, render(t, ...) }. render() is a pure function of t (and its explicit args) and only
 * touches the element's INSIDE — position `el` yourself (style.left/top, or ExplainerCore.place()).
 *
 * The paper physics this kit is built on:
 *   fold    a piece lies flat on the page (rotateX 88°, hinge on its bottom edge) and folds up to 0° with back.out
 *   shadow  a standing piece casts a shadow whose length follows cos(fold angle)
 *   ribbon  a sand ribbon unrolls from a paper roll (notes, the closing line)
 *   tape    a tape is pulled out of a slit in the page (bars, progress)
 *   swing   a hung piece swings twice and settles (caused by being hung, never idle)
 *   world   three parallax layers (far 0.4×, stage 1×, near 1.25×) driven by ONE camera {x, y, s}
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  if (!C) throw new Error("kit v4-paper: load lib/core.js before lib/kit/kit.js");
  const { clamp01, pr, E } = C;

  // ---------------- eases + time helpers ----------------
  const back = (s) => (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2));
  const EZ = Object.assign({}, E, {
    lin: (u) => u, i3: (u) => u * u * u, i4: (u) => u * u * u * u,
    sio: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
    b14: back(1.4), b16: back(1.6), b18: back(1.8),
  });
  const tw = (t, a, d, v0, v1, ez) => v0 + (v1 - v0) * (ez || EZ.lin)(pr(t, a, d));
  // eased keyframe ladder: [[t0, v0], [t1, v1, ease], ...] — holds exactly between keys, never overshoots a hold
  function ladder(t, K) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      if (t < K[i][0]) {
        const a = K[i - 1], b = K[i];
        return a[1] + (b[1] - a[1]) * (b[2] || EZ.lin)((t - a[0]) / (b[0] - a[0]));
      }
    }
    return K[K.length - 1][1];
  }
  // a hung piece: caused by being hung at t0, swings and settles to exactly 0 by t0 + settle
  function swing(t, t0, amp, per = 0.62, dec = 2.4, settle = 1.7) {
    const u = t - t0;
    if (u <= 0 || u >= settle) return 0;
    const env = Math.exp(-dec * u) * (u > settle - 0.4 ? (settle - u) / 0.4 : 1);
    return amp * env * Math.sin((2 * Math.PI * u) / per);
  }

  // ---------------- paper physics ----------------
  const FLAT = 88;
  // fold angle of a page piece: flat (88°) → folds up at tUp → optionally folds flat again at tDown
  function fold(t, tUp, dUp = 0.42, tDown = null, dDown = 0.3, ezUp = EZ.b14) {
    if (t < tUp) return FLAT;
    if (tDown == null || t < tDown) return FLAT * (1 - ezUp(pr(t, tUp, dUp)));
    return FLAT * EZ.i2(pr(t, tDown, dDown));
  }
  // is a piece with this life on the page (visible) at t?
  const alive = (t, tUp, tDown = null, dDown = 0.3) => t >= tUp && !(tDown != null && t >= tDown + dDown);
  // the hinge transform: the eye sits e px above the hinge line, d px in front of the page
  const foldCss = (a, e = 300, d = 1200) => `translateY(${-e}px) perspective(${d}px) translateY(${e}px) rotateX(${a.toFixed(2)}deg)`;
  const standK = (a) => Math.max(0, Math.cos((Math.min(90, Math.abs(a)) * Math.PI) / 180));
  // a floor shadow (a .kit-shadow div lying behind the piece): its length follows the fold angle
  function floorShadow(el, a, pre = "") {
    const k = standK(a);
    el.style.transform = `${pre} skewX(-50deg) scaleY(${k.toFixed(3)})`;
    el.style.opacity = k.toFixed(3);
  }
  // box-shadow of a standing card, lit from the top-left; fades as it lies down
  const cardShadow = (a, lift = 1) => {
    const k = standK(a) * lift;
    return `inset 0 -5px 0 rgba(38,54,74,0.07), ${(3 + 4 * k).toFixed(1)}px ${(4 + 9 * k).toFixed(1)}px ${(6 + 7 * k).toFixed(1)}px rgba(38,54,74,${(0.34 * k).toFixed(3)})`;
  };

  // ---------------- tiny DOM + text helpers ----------------
  function h(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    return el;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // Latin / digit runs (and ≈ → × ÷, which only Archivo Black carries) → Archivo Black term spans; [[x]] → accent ink
  const TERM = /[A-Za-z0-9$≈→×÷%][A-Za-z0-9$≈→×÷%.,·'\-–/+ ]*[A-Za-z0-9$%≈)]|[A-Za-z0-9$≈→×÷%]/g;
  function term(text) {
    return esc(text)
      .replace(TERM, (m) => `<span class="kit-term">${m}</span>`)
      .replace(/\[\[(.+?)\]\]/g, '<span class="kit-hot">$1</span>');
  }
  // a sentence as clause atoms (inline-blocks), so lines break after ， ； ： rather than inside a phrase
  const CLAUSE = /(?<=[，；：。]|·\s)/;
  const clauses = (text) => String(text).split(CLAUSE).map((c) => `<span class="kit-cl">${term(c)}</span>`).join("");
  // rough text width at font-size fs (CJK 1em, Archivo Latin ~0.66em) — for sizing, not layout
  // (latin = width of a Latin glyph in em: 0.66 for Archivo Black at 1em, ~0.57 inside running text where terms are 0.86em)
  const textW = (s, fs, latin = 0.66) => [...String(s)].reduce((w, ch) => w + (/[\u2E80-\uFFEF]/.test(ch) ? 1 : ch === " " ? 0.3 : latin) * fs, 0);
  // quadratic Bézier helpers for strings and flights
  function bez2(a, c, b, u) {
    const v = 1 - u;
    return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
  }
  function subPath(a, c, b, u) {
    const c1 = { x: a.x + (c.x - a.x) * u, y: a.y + (c.y - a.y) * u }, e = bez2(a, c, b, u);
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  }
  // a sagging string from a to b, drawn to progress u (0..1); returns the curve [a, c, b]
  function string(pathEl, a, b, u = 1, sag = 0.18) {
    const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + Math.hypot(b.x - a.x, b.y - a.y) * sag };
    pathEl.setAttribute("d", u > 0.001 ? subPath(a, c, b, clamp01(u)) : "");
    return [a, c, b];
  }
  function cloudSVG(w, h) {
    const d = "M 30 100 C 0 100, 0 58, 36 58 C 40 20, 100 8, 124 40 C 150 6, 214 14, 212 60 C 250 58, 258 100, 222 100 Z";
    return `<svg class="kit-cloud" viewBox="0 0 260 120" style="width:${w}px;height:${h}px"><path transform="translate(3 7)" d="${d}" fill="rgba(38,54,74,0.13)"/><path d="${d}" fill="#fbf8f1"/></svg>`;
  }
  function hsh(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  // ---------------- the world: far / stage / near layers + ONE camera ----------------
  /* world(root, opts) builds the book page inside `root` (a full-frame element):
   *   far   (0.4×)  sun, paper clouds, pale hills, the sage hills (a fold piece that can pop up at opts.hillsUp)
   *   stage (1×)    the floor of the page (kit-floor) + whatever the film puts in it (pass an existing element as opts.stage)
   *   near  (1.25×) paper grass along the page lip
   *   grain         paper grain over everything — printed ON the page, so it travels with the camera (a moving camera
   *                 always reads as motion; keep the camera drifting with intent, never parked)
   * render(cam, t) applies the camera {x, y, s} (world point at frame centre, scale) to all layers. */
  function world(root, o = {}) {
    const span = o.span || [-1600, 4000];
    const W = {};
    const far = h("div", "kit-layer kit-far");
    far.setAttribute("data-layout-allow-overflow", "");
    const sun = h("div", "kit-sun");
    const [sx, sy] = o.sun || [1700, 34];
    sun.style.left = sx + "px";
    sun.style.top = sy + "px";
    far.appendChild(sun);
    (o.clouds || [[60, 540, 190, 88], [1850, 420, 160, 74], [1468, 300, 160, 74], [-260, 230, 200, 92]]).forEach(([x, y, w, hh]) => {
      const c = h("div", null, cloudSVG(w, hh)).firstChild;
      c.style.left = x + "px";
      c.style.top = y + "px";
      far.appendChild(c);
    });
    const fx0 = 960 + (span[0] - 960) * 0.4 - 1400, fx1 = 960 + (span[1] - 960) * 0.4 + 1400, fw = fx1 - fx0;
    const pale = h("div", null, `<svg style="position:absolute;left:${fx0}px;top:580px;width:${fw}px;height:700px;overflow:visible" viewBox="0 0 5600 700" preserveAspectRatio="none"><path d="M 0 90 C 300 30, 560 40, 820 80 C 1100 124, 1340 20, 1640 50 C 1940 80, 2160 120, 2460 70 C 2760 20, 3040 30, 3320 90 C 3600 150, 3860 40, 4160 60 C 4460 80, 4760 130, 5060 60 C 5300 20, 5460 50, 5600 70 L 5600 700 L 0 700 Z" fill="#bcd4e6" opacity="0.8"/></svg>`).firstChild;
    far.appendChild(pale);
    const hills = h("div", "kit-piece", `<svg style="position:absolute;left:0;top:0;width:${fw}px;height:650px;overflow:visible" viewBox="0 0 5600 650" preserveAspectRatio="none"><path d="M 0 120 C 260 40, 520 20, 760 90 C 960 150, 1160 60, 1400 30 C 1640 0, 1880 70, 2120 120 C 2360 170, 2600 50, 2860 40 C 3120 30, 3340 110, 3560 140 C 3800 170, 4040 40, 4300 30 C 4560 20, 4820 110, 5060 120 C 5300 130, 5480 60, 5600 50 L 5600 650 L 0 650 Z" fill="#9dba9a"/><path d="M 0 250 C 380 180, 700 200, 1000 250 C 1300 300, 1600 200, 1960 220 C 2320 240, 2600 300, 2980 260 C 3360 220, 3700 180, 4060 240 C 4420 300, 4800 230, 5200 220 C 5400 215, 5500 230, 5600 240 L 5600 650 L 0 650 Z" fill="#8aab88"/></svg>`);
    hills.setAttribute("data-layout-allow-overflow", "");
    Object.assign(hills.style, { left: fx0 + "px", top: (o.hillsTop ?? 500) + "px", width: fw + "px", height: "650px" });
    far.appendChild(hills);

    const stage = o.stage || h("div", "kit-layer kit-stage");
    stage.classList.add("kit-layer");
    stage.setAttribute("data-layout-allow-overflow", "");
    const floor = h("div", "kit-floor");
    floor.setAttribute("data-layout-allow-overflow", "");
    Object.assign(floor.style, { left: span[0] - 1600 + "px", width: span[1] - span[0] + 3200 + "px", top: (o.floorY ?? 690) + "px" });
    stage.insertBefore(floor, stage.firstChild);

    const near = h("div", "kit-layer kit-near");
    near.setAttribute("data-layout-allow-overflow", "");
    const nx0 = Math.floor((960 + (span[0] - 960) * 1.25 - 1400) / 100) * 100, nx1 = 960 + (span[1] - 960) * 1.25 + 1400;
    const strip = (y0, amp, step, seed) => {
      let d = `M ${nx0} 1300 L ${nx0} ${y0}`;
      for (let x = nx0; x < nx1; x += step) {
        const top = y0 - amp * (0.4 + 0.6 * hsh(x * 0.013 + seed));
        d += ` Q ${x + step / 2} ${top.toFixed(1)} ${x + step} ${(y0 - 6 * hsh(x * 0.021 + seed)).toFixed(1)}`;
      }
      return d + ` L ${nx1 + 200} 1300 Z`;
    };
    if (o.grass !== false) {
      near.innerHTML = `<svg style="position:absolute;left:0;top:0;width:10px;height:10px;overflow:visible"><path d="${strip(1030, 44, 46, 3)}" fill="#8aab88"/><path d="${strip(1046, 30, 70, 9)}" fill="#9dba9a"/></svg>`;
    }
    const grain = h("div", "kit-grain kit-grain-page");
    grain.setAttribute("data-layout-allow-overflow", "");
    Object.assign(grain.style, { left: span[0] - 2400 + "px", top: "-1800px", width: span[1] - span[0] + 4800 + "px", height: "4600px" });

    if (stage.parentNode === root) root.insertBefore(far, stage);
    else { root.appendChild(far); root.appendChild(stage); }
    stage.after(near);
    root.appendChild(grain);

    Object.assign(W, {
      far, stage, near, grain, floor, hills, sun,
      cam: { x: 960, y: 540, s: 1 },
      render(cam, t) {
        this.cam = cam;
        const f2 = (v) => v.toFixed(2);
        const st = `translate(${f2(960 - cam.x * cam.s)}px,${f2(540 - cam.y * cam.s)}px) scale(${cam.s.toFixed(4)})`;
        stage.style.transform = st;
        grain.style.transform = st;
        const fs = 1 + (cam.s - 1) * 0.4, fxx = 960 + (cam.x - 960) * 0.4, fyy = 540 + (cam.y - 540) * 0.4;
        far.style.transform = `translate(${f2(960 - fxx * fs)}px,${f2(540 - fyy * fs)}px) scale(${fs.toFixed(4)})`;
        const ns = 1 + (cam.s - 1) * 1.25, nxx = 960 + (cam.x - 960) * 1.25;
        near.style.transform = `translate(${f2(960 - nxx * ns)}px,${f2(1080 - 1080 * ns)}px) scale(${ns.toFixed(4)})`;
        if (o.hillsUp != null) {
          hills.style.transform = foldCss(tw(t, o.hillsUp, 0.75, FLAT, 0, EZ.o3), 700, 2200);
          hills.style.opacity = t < o.hillsUp - 0.05 ? "0" : "1";
        }
      },
      // world point → screen point under the current camera
      toScreen(x, y) { const c = this.cam; return { x: 960 + (x - c.x) * c.s, y: 540 + (y - c.y) * c.s }; },
    });
    return W;
  }

  // ---------------- contract components ----------------
  // shared entry logic: explicit progress u (0..1) wins; else at/out times; else always standing
  function lifeOf(t, u, at, out, dIn, dOut, ez) {
    if (typeof u === "number") return { a: FLAT * (1 - u), vis: u > 0.002 };
    if (at == null) return { a: 0, vis: true };
    return { a: fold(t, at, dIn, out, dOut, ez), vis: alive(t, at, out, dOut) };
  }

  /* label({ text, sub, tone, at, out }) — a paper tag that folds up off the page.
   * render(t) uses at/out; render(t, u) takes an explicit fold-up progress (u > 1 overshoots like back.out). */
  function label(o = {}) {
    const tone = o.tone || "default";
    const el = h("div", `kit-label kit-tone-${tone}` + (o.cls ? " " + o.cls : ""));
    const card = h("div", "kit-label-card", `<span class="kit-label-t">${term(o.text || "")}</span>` + (o.sub ? `<span class="kit-label-sub">${term(o.sub)}</span>` : ""));
    if (o.size) card.style.fontSize = o.size + "px";
    el.appendChild(card);
    return {
      el, card, at: o.at ?? null, out: o.out ?? null,
      render(t, u) {
        const L = lifeOf(t, u, this.at, this.out, o.dIn || 0.4, o.dOut || 0.28, EZ.b16);
        card.style.visibility = L.vis ? "inherit" : "hidden";
        if (!L.vis) return;
        card.style.transform = foldCss(L.a, 80, 700);
        card.style.boxShadow = cardShadow(L.a);
      },
    };
  }

  /* note(text, { at, out, kicker, small }) — one plain-language line on a ribbon that unrolls from a paper roll.
   * [[word]] marks the important word (accent ink). render(t, u): u = how much is unrolled (0..1). */
  function note(text, o = {}) {
    const el = h("div", "kit-note" + (o.small ? " kit-note-s" : ""));
    const clip = h("div", "kit-ribbon-clip");
    const rib = h("div", "kit-ribbon", (o.kicker ? `<b class="kit-note-k">${esc(o.kicker)}</b>` : "") + `<span>${term(text)}</span>`);
    const roll = h("i", "kit-roll");
    clip.appendChild(rib);
    el.append(clip, roll);
    return {
      el, at: o.at ?? null, out: o.out ?? null,
      render(t, u) {
        let r;
        if (typeof u === "number") r = clamp01(u);
        else if (this.at == null) r = 1;
        else r = E.o3(pr(t, this.at, o.dIn || 0.5)) * (1 - EZ.i2(pr(t, this.out ?? 1e9, o.dOut || 0.3)));
        const vis = r > 0.002 ? "inherit" : "hidden";
        clip.style.visibility = vis;
        roll.style.visibility = vis;
        clip.style.clipPath = `inset(-30px ${((1 - r) * 100).toFixed(2)}% -40px -40px)`;
        roll.style.left = `calc(${(r * 100).toFixed(2)}% - 12px)`;
        roll.style.opacity = r > 0.005 && r < 0.985 ? "1" : "0";
        roll.style.width = (10 + 16 * (1 - r)).toFixed(1) + "px";
      },
    };
  }

  /* number({ value, unit, caption, decimals, tone, steps, at, out }) — a big number printed on a pop-up card.
   * render(t, u)  count-up: shows value·u
   * render(t)     with .set(v) shows v; with steps [[t, v], ...] shows the last step and flips a calendar page on each change */
  function number(o = {}) {
    const el = h("div", "kit-num" + (o.tone ? " kit-tone-" + o.tone : ""));
    const card = h("div", "kit-num-card");
    const v = h("span", "kit-num-v");
    const un = h("span", "kit-num-u", o.unit ? term(o.unit) : "");
    const flip = h("div", "kit-num-flip", '<span class="kit-num-v"></span>' + (o.unit ? `<span class="kit-num-u">${term(o.unit)}</span>` : ""));
    card.append(v, un, flip);
    el.appendChild(card);
    const allowOverlap = () => card.querySelectorAll("span").forEach((e) => e.setAttribute("data-layout-allow-overlap", ""));
    allowOverlap();
    let cap = null;
    if (o.caption) { cap = h("div", "kit-num-c", term(o.caption)); el.appendChild(cap); }
    const fmt = (x) => (o.decimals ? x.toFixed(o.decimals) : String(Math.round(x)));
    const flipV = flip.firstChild;
    return {
      el, card, at: o.at ?? null, out: o.out ?? null, fixed: null,
      set(x) { this.fixed = x; return this; },
      render(t, u) {
        const L = lifeOf(t, undefined, this.at, this.out, 0.45, 0.3, EZ.b16);
        card.style.visibility = L.vis ? "inherit" : "hidden";
        if (cap) cap.style.visibility = card.style.visibility;
        if (!L.vis) return;
        card.style.transform = foldCss(L.a, 120, 900);
        card.style.boxShadow = cardShadow(L.a);
        if (cap) cap.style.transform = foldCss(L.a, 60, 700);
        let val, prev = null, fp = 1;
        if (o.steps) {
          let i = -1;
          o.steps.forEach((s, k) => { if (t >= s[0]) i = k; });
          val = i < 0 ? o.steps[0][1] : o.steps[i][1];
          if (i >= 1) { prev = o.steps[i - 1][1]; fp = pr(t, o.steps[i][0], 0.32); }
        } else if (typeof u === "number") val = (o.value || 0) * clamp01(u);
        else val = this.fixed ?? o.value ?? 0;
        const s = fmt(val);
        if (v.textContent !== s) { v.textContent = s; allowOverlap(); }
        if (prev != null && fp < 1) {
          const ps = fmt(prev);
          if (flipV.textContent !== ps) { flipV.textContent = ps; allowOverlap(); }
          flip.style.visibility = "inherit";
          flip.style.transform = `rotateX(${(178 * EZ.io2(fp)).toFixed(1)}deg)`;
        } else flip.style.visibility = "hidden";
      },
    };
  }

  /* bars({ rows: [{ label, value, max, tone, valueText }], width }) — each row is a tape pulled out of a slit;
   * a navy tab riding the tape's end shows valueText. render(t, u): u (0..1, or one per row) = pull progress.
   * With { at } and no u, the tapes pull out one after another from `at`. */
  function bars(o = {}) {
    const el = h("div", "kit-bars");
    el.style.width = (o.width || 900) + "px";
    const rows = (o.rows || []).map((r) => {
      const row = h("div", `kit-bar kit-tone-${r.tone || "default"}`);
      const lab = h("div", "kit-bar-l", term(r.label || ""));
      if (o.labelWidth) lab.style.minWidth = o.labelWidth + "px";
      const trk = h("div", "kit-bar-t");
      const fill = h("div", "kit-bar-f");
      const slit = h("i", "kit-bar-slit");
      const tab = h("div", "kit-bar-v", term(r.valueText ?? String(r.value)));
      trk.append(fill, slit, tab);
      row.append(lab, trk);
      el.appendChild(row);
      return { row, lab, fill, tab, frac: clamp01((r.value || 0) / (r.max || 1)) };
    });
    return {
      el, rows, at: o.at ?? null, out: o.out ?? null,
      // change the text on row i's tab (e.g. a value that steps with the tape)
      setValueText(i, text) { const R = rows[i]; if (R && R.txt !== text) { R.txt = text; R.tab.innerHTML = term(text); } },
      render(t, u) {
        rows.forEach((R, i) => {
          let ui;
          if (Array.isArray(u)) ui = u[i];
          else if (typeof u === "number") ui = u;
          else ui = this.at == null ? 1 : E.o3(pr(t, this.at + 0.3 + i * 0.3, 0.55));
          const shown = this.at == null || alive(t, this.at, this.out, 0.3);
          R.row.style.visibility = shown ? "inherit" : "hidden";
          if (!shown) return;
          const a = this.at == null ? 0 : fold(t, this.at + i * 0.12, 0.4, this.out, 0.3, EZ.b16);
          R.lab.style.transform = foldCss(a, 60, 700);
          const w = (R.frac * clamp01(ui ?? 0) * 100).toFixed(2) + "%";
          R.fill.style.width = w;
          R.tab.style.left = w;
          R.tab.style.visibility = ui > 0.01 ? "inherit" : "hidden";
        });
      },
    };
  }

  /* formula({ terms: [{ text, sub, t, tone }, { text: "×", t }, { br: true }, ...], out }) — each term is a card that
   * folds up at its own time t (operators × = ≈ + ÷ → become navy discs). render(t). */
  function formula(o = {}) {
    const el = h("div", "kit-formula");
    let row = h("div", "kit-f-row");
    el.appendChild(row);
    const parts = [];
    (o.terms || []).forEach((tm) => {
      if (tm.br) { row = h("div", "kit-f-row"); el.appendChild(row); return; }
      const op = tm.op ?? /^[×=≈+÷→\-]$/.test(String(tm.text).trim());
      const p = op
        ? h("div", "kit-fo", esc(tm.text))
        : h("div", `kit-ft kit-tone-${tm.tone || "default"}`, `<span class="kit-ft-v">${term(tm.text)}</span>` + (tm.sub ? `<span class="kit-ft-s">${term(tm.sub)}</span>` : ""));
      row.appendChild(p);
      parts.push({ el: p, t: tm.t ?? 0, op, out: tm.out ?? null });
    });
    return {
      el, parts, out: o.out ?? null,
      render(t) {
        parts.forEach((P) => {
          const out = P.out ?? this.out;
          const vis = alive(t, P.t, out, 0.3);
          P.el.style.visibility = vis ? "inherit" : "hidden";
          if (!vis) return;
          if (P.op) {
            const s = EZ.b18(pr(t, P.t, 0.3)) * (1 - EZ.i2(pr(t, out ?? 1e9, 0.3)));
            P.el.style.transform = `scale(${Math.max(0.001, s).toFixed(3)})`;
          } else {
            const a = fold(t, P.t, 0.42, out, 0.3, EZ.b16);
            P.el.style.transform = foldCss(a, 60, 800);
            P.el.style.boxShadow = cardShadow(a);
          }
        });
      },
    };
  }

  /* title(story, { kicker }) — the closing line (story.end.line). Each clause gets its own ribbon that unrolls from the
   * middle when the clause starts; every word is printed onto it the moment it is spoken; story.end.emphasis words are
   * printed in accent ink. A short first clause ending in "：" (e.g. 「一句话：」) becomes a navy kicker tab above. */
  function title(story, o = {}) {
    const end = story.data.end;
    const L = story.line(end.line);
    const units = L.words.map(([u, t]) => ({ u, t, em: false }));
    const flat = units.map((x) => x.u).join("");
    const mark = new Array(flat.length).fill(false);
    (end.emphasis || []).forEach((e) => {
      const s = e.replace(/\s/g, "");
      const i = flat.indexOf(s);
      if (i >= 0) for (let k = 0; k < s.length; k++) mark[i + k] = true;
    });
    let pos = 0;
    units.forEach((x) => { for (let k = 0; k < x.u.length; k++) if (mark[pos + k]) x.em = true; pos += x.u.length; });
    const clauses = [];
    let cur = [];
    units.forEach((x) => { cur.push(x); if (/^[，,。：:；;！!？?]$/.test(x.u)) { clauses.push(cur); cur = []; } });
    if (cur.length) clauses.push(cur);
    const el = h("div", "kit-title");
    const ribs = clauses.map((cl, i) => {
      const text = cl.map((x) => x.u).join("");
      const kicker = o.kicker !== false && i === 0 && clauses.length >= 3 && /[：:]$/.test(text) && text.length <= 5;
      if (kicker) {
        const k = h("div", "kit-title-k", esc(text.replace(/[：:]$/, "")));
        el.appendChild(k);
        return { kicker: true, k, t0: cl[0].t, units: [] };
      }
      const wrap = h("div", "kit-title-r");
      const clip = h("div", "kit-ribbon-clip");
      const rib = h("div", "kit-ribbon");
      cl.forEach((x, k) => {
        const next = cl[k + 1];
        const latin = /[A-Za-z\d]$/.test(x.u) && next && /^[A-Za-z\d]/.test(next.u);
        const s = h("span", "kit-title-w" + (x.em ? " kit-em" : "") + (/^[A-Za-z0-9]/.test(x.u) ? " kit-term" : ""));
        s.textContent = x.u;
        if (latin) s.style.marginRight = "0.28em";
        rib.appendChild(s);
        x.s = s;
      });
      const rl = h("i", "kit-roll"), rr = h("i", "kit-roll");
      clip.appendChild(rib);
      wrap.append(clip, rl, rr);
      el.appendChild(wrap);
      return { kicker: false, wrap, clip, rl, rr, t0: cl[0].t, units: cl };
    });
    return {
      el,
      render(t) {
        ribs.forEach((R) => {
          if (R.kicker) {
            const vis = t >= R.t0 - 0.1;
            R.k.style.visibility = vis ? "inherit" : "hidden";
            if (vis) R.k.style.transform = foldCss(fold(t, R.t0 - 0.1, 0.4, null, 0, EZ.b16), 60, 700);
            return;
          }
          const r = E.o3(pr(t, R.t0 - 0.16, 0.5));
          const vis = r > 0.002 ? "inherit" : "hidden";
          R.clip.style.visibility = vis;
          const half = ((1 - r) * 50).toFixed(2);
          R.clip.style.clipPath = `inset(-30px ${half}% -40px ${half}%)`;
          const show = r > 0.005 && r < 0.985 ? "1" : "0";
          R.rl.style.left = `calc(${half}% - 12px)`;
          R.rr.style.left = `calc(${(100 - (1 - r) * 50).toFixed(2)}% - 12px)`;
          [R.rl, R.rr].forEach((x) => { x.style.opacity = show; x.style.visibility = vis; x.style.width = (10 + 16 * (1 - r)).toFixed(1) + "px"; });
          R.units.forEach((x) => {
            const p = pr(t, x.t - 0.04, 0.16);
            x.s.style.visibility = p > 0 ? "inherit" : "hidden";
            if (p > 0) {
              const k = EZ.o2(p);
              x.s.style.opacity = k.toFixed(3);
              x.s.style.transform = `translateY(${(-10 * (1 - k)).toFixed(1)}px) scale(${(1.28 - 0.28 * EZ.b16(p)).toFixed(3)})`;
            }
          });
        });
      },
    };
  }

  /* recap(story, opts) — the last page of the book folds up over the film: ONE composed pop-up spread with the centre
   * placard (story.recap.center + tagline, emphasis from story.end.emphasis) and the numbered point cards around it,
   * tied to the placard by paper strings. Runs from story.recap.start to .end; after it is built the spread keeps a slow
   * push-in so it never freezes. Top row holds ceil(n/2) cards, bottom row the rest (reading order: Z).
   * opts.hide: elements (the film's world) to switch off once the page fully covers them. */
  function recap(story, o = {}) {
    const R = story.recap;
    const n = R.points.length;
    const el = h("div", "kit-recap");
    el.setAttribute("data-layout-allow-overflow", "");
    const board = h("div", "kit-recap-board");
    const push = h("div", "kit-recap-push");
    push.appendChild(h("div", "kit-recap-land", `<svg viewBox="0 0 1920 420" preserveAspectRatio="none"><path d="M 0 110 C 220 60, 420 70, 640 100 C 860 130, 1060 50, 1300 70 C 1540 90, 1720 120, 1920 80 L 1920 420 L 0 420 Z" fill="#bcd4e6" opacity="0.55"/><path d="M 0 170 C 260 120, 520 110, 760 150 C 980 186, 1180 120, 1420 110 C 1640 102, 1800 140, 1920 150 L 1920 420 L 0 420 Z" fill="#9dba9a" opacity="0.55"/><path d="M 0 236 L 1920 236 L 1920 420 L 0 420 Z" fill="#f2e9d8"/></svg>`));
    const svgNS = "http://www.w3.org/2000/svg";
    const strings = document.createElementNS(svgNS, "svg");
    strings.setAttribute("class", "kit-recap-strings");
    push.appendChild(strings);
    board.appendChild(push);
    el.appendChild(board);

    // centre placard
    const emph = ((story.data.end && story.data.end.emphasis) || []).slice().sort((a, b) => b.length - a.length);
    let tag = esc(R.tagline || "");
    emph.forEach((e) => { if (e && tag.includes(e)) tag = tag.split(e).join(`\u0000${e}\u0001`); });
    tag = tag.replace(/\u0000/g, '<span class="kit-hot">').replace(/\u0001/g, "</span>");
    const cw = o.centerWidth || 720;
    const center = h("div", "kit-recap-center", `<div class="kit-recap-ct">${term(R.center)}</div><div class="kit-recap-tg">${tag}</div>`);
    // a centre with CJK in it is set in the display face (Archivo Black has no CJK); Latin runs stay in Archivo via .kit-term
    if (/[\u3400-\u9fff]/.test(R.center)) center.firstChild.classList.add("kit-recap-ct-cjk");
    const ctFs = Math.min(78, Math.floor((cw - 80) / Math.max(1, textW(R.center, 1))));
    center.firstChild.style.fontSize = ctFs + "px";
    const tgFs = Math.min(52, Math.floor((cw - 90) / Math.max(1, textW(R.tagline || "", 1))));
    center.lastChild.style.fontSize = tgFs + "px";
    center.style.width = cw + "px";
    const centerBox = { x: 960 - cw / 2, y: o.centerY ?? 405, w: cw, h: 42 + ctFs * 1.05 + 50 + tgFs * 1.2 };
    Object.assign(center.style, { left: centerBox.x + "px", top: centerBox.y + "px" });
    push.appendChild(center);

    // point cards: top row ceil(n/2) spread across the page, bottom row floor(n/2) — under the gaps of the top row when it
    // has one card fewer (5 → 3 + 2), in the same columns when it has as many (4 → 2 + 2)
    const top = Math.ceil(n / 2), bot = n - top;
    const rowY = [o.topY ?? 84, o.bottomY ?? 726];
    const M = 80, span = 1920 - 2 * M;
    const w = Math.min(o.cardWidth || (top <= 2 ? 760 : 600), (span - (top - 1) * 56) / top);
    const gapT = top > 1 ? (span - top * w) / (top - 1) : 0;
    const topX = [...Array(top)].map((_, k) => (top === 1 ? 960 - w / 2 : M + k * (w + gapT)));
    const botX = [...Array(bot)].map((_, k) => (bot === top - 1 ? (topX[k] + topX[k + 1]) / 2 : bot === top ? topX[k] : 960 - (bot * w + (bot - 1) * 56) / 2 + k * (w + 56)));
    // each card is as wide as its text needs (2–3 balanced lines), anchored to its slot: outer cards hug the page margins
    const XFS = 34;
    const cards = R.points.map((p, i) => {
      const r = i < top ? 0 : 1, k = r === 0 ? i : i - top, m = r === 0 ? top : bot;
      // pack the clauses greedily into lines no wider than the slot allows; the card is as wide as its longest line
      const room = (w - 64) / 1.05;
      let lines = 1, cur = 0, longest = 0;
      String(p.text).split(CLAUSE).forEach((c) => {
        const cw = textW(c, XFS, 0.57);
        if (cur > 0 && cur + cw > room) { lines++; longest = Math.max(longest, cur); cur = 0; }
        cur += cw;
      });
      longest = Math.max(longest, cur);
      const cw1 = Math.round(Math.min(w, Math.max(420, longest * 1.05 + 64)));
      const slot = r === 0 ? topX[k] : botX[k];
      const outerL = k === 0 && m > 1 && (r === 0 || bot === top), outerR = k === m - 1 && m > 1 && (r === 0 || bot === top);
      const x = outerL ? slot : outerR ? slot + w - cw1 : slot + (w - cw1) / 2;
      const card = h("div", "kit-recap-card", `<div class="kit-recap-h"><span class="kit-recap-n">${p.n ?? i + 1}</span><span class="kit-recap-t">${esc(p.title)}</span></div><div class="kit-recap-x">${clauses(p.text)}</div>`);
      Object.assign(card.style, { left: x.toFixed(0) + "px", top: rowY[r] + "px", width: cw1 + "px" });
      push.appendChild(card);
      const path = document.createElementNS(svgNS, "path");
      strings.appendChild(path);
      return { card, path, x, w: cw1, r, hgt: 46 + 70 + 10 + lines * 47 };
    });

    push.appendChild(h("div", "kit-recap-grain"));   // the grain is on the page, so it travels with the push
    const t0 = R.start, t1 = R.end;
    const hide = o.hide || [];
    return {
      el, board, center, cards,
      covered: (t) => t >= t0 + 0.85,
      render(t) {
        const vis = t >= t0 - 0.02;
        board.style.visibility = vis ? "inherit" : "hidden";
        hide.forEach((e) => { const c = t >= t0 + 0.85; e.style.visibility = c ? "hidden" : ""; e.style.opacity = c ? "0" : ""; });
        if (!vis) return;
        // the page folds up from the bottom edge of the frame
        const a = FLAT * (1 - EZ.b14(pr(t, t0, 0.8)));
        board.style.transform = `perspective(2600px) rotateX(${a.toFixed(2)}deg)`;
        // a steady push-in from the moment the spread stands (linear: it never settles into a frozen frame)
        const s = 1 + 0.04 * pr(t, t0 + 0.6, Math.max(0.5, t1 - t0 - 0.6));
        push.style.transform = `scale(${s.toFixed(4)})`;
        const cA = fold(t, t0 + 0.45, 0.5, null, 0, EZ.b16);
        center.style.transform = foldCss(cA, 160, 1400);
        center.style.visibility = t >= t0 + 0.45 ? "inherit" : "hidden";
        const cb = centerBox;
        cards.forEach((c, i) => {
          const tc = t0 + 0.75 + i * 0.17;
          const ca = fold(t, tc, 0.45, null, 0, EZ.b16);
          c.card.style.visibility = t >= tc ? "inherit" : "hidden";
          c.card.style.transform = foldCss(ca, 120, 1200);
          c.card.style.boxShadow = cardShadow(ca);
          // string from the placard to the card
          const ch = c.hgt;
          const cx = c.x + c.w / 2;
          const a0 = { x: Math.max(cb.x + 40, Math.min(cb.x + cb.w - 40, cx)), y: c.r === 0 ? cb.y : cb.y + cb.h };
          const b0 = { x: cx + (a0.x - cx) * 0.25, y: c.r === 0 ? rowY[0] + ch : rowY[1] };
          string(c.path, a0, b0, EZ.o2(pr(t, tc + 0.25, 0.5)), 0.08);
        });
      },
    };
  }

  /* captions(container, story, opts) — core.Captions (one paper label per line, units lit as spoken) with the paper
   * "pasted on" entry (drops 8 px, settles from 104 %, alternate lines tilted ±0.5°). The closing line (story.end.line)
   * is left out by default because Kit.title prints it word by word; pass { includeEnd: true } to keep it. */
  function captions(container, story, opts = {}) {
    const endLine = story.data.end && story.data.end.line;
    const groups = opts.groups || story.lines.filter((L) => opts.includeEnd || L.i !== endLine).map((L) => [L.i, L.i]);
    container.classList.add("kit-caps");
    const caps = new C.Captions(container, story, Object.assign({}, opts, { groups }));
    caps.boxes.forEach((b) => b.spans.forEach((w) => { if (/^[A-Za-z0-9.%$–\-]+ ?$/.test(w.s.textContent)) w.s.classList.add("kit-term"); }));
    const tilt = (i) => (i % 2 ? 0.5 : -0.5);
    return {
      el: container, captions: caps,
      render(t) {
        caps.render(t);
        caps.boxes.forEach((b, i) => {
          // a new label is pasted over the old one: the old one leaves as soon as the new one is half on
          const nx = caps.boxes[i + 1];
          if (nx && parseFloat(nx.el.style.opacity) >= 0.5) { b.el.style.visibility = "hidden"; b.el.style.opacity = "0"; }
          if (b.el.style.visibility === "hidden") return;
          const e = E.o2(pr(t, b.a - caps.lead, 0.24));
          b.el.style.transform = `translateY(${(-8 * (1 - e)).toFixed(2)}px) rotate(${tilt(i)}deg) scale(${(1 + 0.04 * (1 - e)).toFixed(3)})`;
        });
      },
    };
  }

  g.Kit = {
    name: "v4-paper",
    // contract
    label, note, number, bars, formula, title, recap,
    // style extras
    captions, world, fold, alive, foldCss, standK, floorShadow, cardShadow, swing, ladder, tw, EZ,
    bez2, subPath, string, cloudSVG, term, esc, h, hsh, FLAT,
    // text sizing helpers (exported for the starter; same functions the recap uses internally)
    textW, clauses, TERM,
  };
})(window);
