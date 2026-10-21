/* V6 cinematic kit — window.Kit for a Three.js one-take explainer.
 *
 * Load after lib/core.js and lib/story.js, as a classic script. The HTML components (label, note, number, bars,
 * formula, title, recap, progress) are plain DOM styled by kit.css. The 3D side is Kit.studio(): pass it the THREE
 * module and the addons your module script imported, and it returns the graphite studio (renderer, cove backdrop,
 * reflective floor, key / rim / fill light, bokeh + bloom post), the material palette, a camera rig that reads
 * keyframe tracks, and a projector that pins any kit component to a world point. Every render is a pure function
 * of t; nothing here reads a clock or Math.random.
 */
(function (g) {
  "use strict";
  const C = g.ExplainerCore;
  const { clamp01, pr, lerp, env, E, track } = C;
  const W = 1920, H = 1080;
  const o4 = (u) => 1 - Math.pow(1 - u, 4);

  const mk = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const vis = (el, o) => {
    const v = o > 0.001;
    el.style.visibility = v ? "visible" : "hidden";
    el.style.opacity = v ? o.toFixed(3) : "0";
    return v;
  };
  // every component can be put at a screen point: anchor (ax, ay) in 0..1 of its own box
  function at(el, x, y, ax = 0.5, ay = 0.5, o = 1, s = 1) {
    C.place(el, x, y, ax, ay, o, s);
  }
  // presence(t, o): visibility + a short rise as o goes 0 → 1 (what Kit.studio().place() drives)
  const rise = (el, o, dy = 12) => {
    if (!vis(el, o)) return false;
    el.style.translate = `0 ${((1 - E.o3(clamp01(o))) * dy).toFixed(1)}px`;
    return true;
  };
  const withAt = (obj) =>
    Object.assign(obj, {
      at: (x, y, ax, ay, o, s) => at(obj.el, x, y, ax, ay, o, s),
      presence: obj.presence || ((t, o) => rise(obj.el, o)),
    });

  // ---------------------------------------------------------------- label
  // A term pinned to a thing. tone: default | accent | warn | ok | ink | cool. big: numeral style (×1, ÷4, 5%).
  // render(t, o) sets presence (0..1); at(x, y, ax, ay) places it; pin(px, py) draws a leader from a 3D point.
  function label({ text, sub, tone = "default", size, big = false, mark = true } = {}) {
    const el = mk("div", `kit-label tone-${tone}${big ? " is-big" : ""}${mark ? "" : " no-mark"}`);
    const markEl = mk("span", "kit-label-mark");
    const body = mk("span", "kit-label-body");
    const tt = mk("span", "kit-label-t", text);
    body.appendChild(tt);
    let subEl = null;
    if (sub) body.appendChild((subEl = mk("span", "kit-label-sub", sub)));
    el.append(markEl, body);
    if (size) el.style.setProperty("--kit-label-size", size + "px");
    let leader = null, pinDot = null;
    const obj = {
      el,
      set(text2, sub2) {
        if (text2 != null && tt.textContent !== text2) tt.textContent = text2;
        if (sub2 != null && subEl && subEl.textContent !== sub2) subEl.textContent = sub2;
      },
      render(t, o = 1) {
        return rise(el, o);
      },
      // leader from the label's anchor to a pin given in label-local px offset (dx, dy) — set by Kit.studio().place()
      leaderTo(dx, dy, ax, ay) {
        if (!leader) {
          leader = mk("i", "kit-leader");
          pinDot = mk("i", "kit-pin");
          el.append(leader, pinDot);
        }
        const w = el.offsetWidth, h = el.offsetHeight;
        const x0 = ax * w, y0 = ay * h, x1 = x0 + dx, y1 = y0 + dy;
        const len = Math.hypot(dx, dy);
        leader.style.width = Math.max(0, len - 8).toFixed(1) + "px";
        leader.style.transform = `translate(${x1.toFixed(1)}px, ${y1.toFixed(1)}px) rotate(${Math.atan2(-dy, -dx).toFixed(4)}rad) translateX(4px)`;
        pinDot.style.left = x1.toFixed(1) + "px";
        pinDot.style.top = y1.toFixed(1) + "px";
      },
    };
    return withAt(obj);
  }

  // ---------------------------------------------------------------- note
  // One plain-language explanation line. slot "top" = under the chapter chip (default); "free" = place with at().
  function note(text, { slot = "top", tag = "说明" } = {}) {
    const el = mk("div", "kit-note" + (slot === "top" ? " at-top" : ""));
    if (tag) el.appendChild(mk("span", "kit-note-k", tag));
    const tx = mk("span", "kit-note-t");
    tx.innerHTML = text; // may hold <b>…</b> for the one accented word
    el.appendChild(tx);
    let shown = 0;
    const presence = (t, o) => {
      shown = o;
      if (!vis(el, o)) return false;
      el.style.translate = `${((1 - E.o3(clamp01(o))) * -18).toFixed(1)}px 0`;
      return true;
    };
    // the screen box this note occupies (for Kit.studio().keep), weighted by its current opacity
    const rect = (pad = 20) => {
      const r = { x0: el.offsetLeft - pad, y0: el.offsetTop - pad, x1: el.offsetLeft + el.offsetWidth + pad, y1: el.offsetTop + el.offsetHeight + pad, o: shown };
      return r;
    };
    return withAt({ el, presence, render: presence, rect });
  }
  // the window a note lives in: from a narration time to the end of its chapter (or an explicit end)
  note.window = (t, a, b) => env(t, a, b, 0.4, 0.35);

  // ---------------------------------------------------------------- number
  function number({ value = 0, unit = "", caption = "", decimals = 0, prefix = "", tone = "default", size } = {}) {
    const el = mk("div", `kit-num tone-${tone}`);
    const row = mk("div", "kit-num-row");
    const v = mk("span", "kit-num-v");
    const u = mk("span", "kit-num-u", unit);
    row.append(v, u);
    el.appendChild(row);
    let capEl = null;
    if (caption) el.appendChild((capEl = mk("div", "kit-num-c", caption)));
    if (size) v.style.fontSize = size + "px";
    let fixed = null;
    const fmt = (x) => prefix + (decimals ? x.toFixed(decimals) : String(Math.round(x)));
    const obj = {
      el,
      set(x) { fixed = x; },
      caption(c) { if (capEl && capEl.textContent !== c) capEl.textContent = c; },
      unit(s) { if (u.textContent !== s) u.textContent = s; },
      // u: count-up progress 0..1 (ignored when set() pinned a value); o: presence
      render(t, uu = 1, o = 1) {
        if (!vis(el, o)) return false;
        const s = fixed != null ? (typeof fixed === "string" ? fixed : fmt(fixed)) : fmt(value * clamp01(uu));
        if (v.textContent !== s) v.textContent = s;
        return rise(el, o, 14);
      },
    };
    return withAt(obj);
  }

  // ---------------------------------------------------------------- bars
  // rows: [{ label, value, max, tone, valueText }]; render(t, u, o): u = 0..1 or [u per row]
  function bars({ rows = [], width = 520 } = {}) {
    const el = mk("div", "kit-bars");
    const R = rows.map((r) => {
      const l = mk("div", "kit-bars-l", r.label);
      const tr = mk("div", "kit-bars-track");
      tr.style.width = width + "px";
      const f = mk("i", `kit-bars-fill tone-${r.tone || "default"}`);
      f.style.width = ((100 * (r.value / (r.max || 1))).toFixed(2)) + "%";
      tr.appendChild(f);
      const v = mk("div", "kit-bars-v", r.valueText ?? String(r.value));
      el.append(l, tr, v);
      return { f, v, l, r };
    });
    return withAt({
      el,
      rows: R,
      render(t, u = 1, o = 1) {
        if (!vis(el, o)) return false;
        R.forEach((x, k) => {
          const uk = clamp01(Array.isArray(u) ? u[k] ?? 0 : u);
          x.f.style.transform = `scaleX(${E.o3(uk).toFixed(4)})`;
          const q = clamp01(uk * 3);
          x.v.style.opacity = q.toFixed(3);
          x.l.style.opacity = (0.45 + 0.55 * clamp01(uk * 4)).toFixed(3);
        });
        return true;
      },
    });
  }

  // ---------------------------------------------------------------- formula
  // terms: [{ text, t, sub, tone, op }] — each term rises in at its time t (from the story)
  function formula({ terms = [], size } = {}) {
    const el = mk("div", "kit-formula");
    const T = terms.map((x) => {
      const op = x.op ?? /^[×÷=≈+→\-–]$/.test(x.text);
      const d = mk("div", `kit-formula-term${op ? " is-op" : ""}${x.tone ? " tone-" + x.tone : ""}`);
      const v = mk("div", "kit-formula-v", x.text);
      if (size) v.style.fontSize = size + "px";
      d.appendChild(v);
      if (x.sub) d.appendChild(mk("div", "kit-formula-s", x.sub));
      el.appendChild(d);
      return { d, at: x.t };
    });
    return withAt({
      el,
      terms: T,
      render(t, o = 1) {
        if (!vis(el, o)) return false;
        for (const x of T) {
          const u = E.o3(pr(t, x.at, 0.32));
          x.d.style.opacity = u.toFixed(3);
          x.d.style.transform = `translateY(${((1 - u) * 22).toFixed(1)}px)`;
        }
        return true;
      },
    });
  }

  // ---------------------------------------------------------------- title (closing line)
  // Word-timed: lines break after "：" "，" "；"; a short first segment ending in "：" becomes a small lead-in.
  // Emphasis comes from story.end.emphasis. Visible from story.end.start to the recap.
  function title(story, { left = 118, bottom = 168, top = null, size } = {}) {
    const end = story.data.end || {};
    const L = story.line(end.line || story.lines.length);
    const el = mk("div", "kit-title");
    if (size) el.style.fontSize = size + "px";
    el.style.left = left + "px";
    if (top != null) el.style.top = top + "px";
    else el.style.bottom = bottom + "px";
    const words = L.words;
    const joined = words.map((w) => w[0]).join("");
    const emph = new Array(joined.length).fill(false);
    for (const e of end.emphasis || []) {
      let i = joined.indexOf(e);
      while (i >= 0) { for (let k = 0; k < e.length; k++) emph[i + k] = true; i = joined.indexOf(e, i + 1); }
    }
    const lines = [];
    let cur = [], pos = 0;
    words.forEach(([u, t], k) => {
      const next = words[k + 1];
      const latin = /[A-Za-z\d]$/.test(u) && next && /^[A-Za-z\d]/.test(next[0]);
      const em = emph.slice(pos, pos + u.length).some(Boolean) && !/^[，。：；！？、]$/.test(u);
      cur.push({ u: latin ? u + " " : u, t, em });
      pos += u.length;
      if (/[，：；]$/.test(u) && k < words.length - 1) { lines.push(cur); cur = []; }
    });
    if (cur.length) lines.push(cur);
    const spans = [];
    lines.forEach((ln, i) => {
      const lineEl = mk("span", "kit-title-line");
      const txt = ln.map((x) => x.u).join("");
      if (i === 0 && lines.length > 2 && /：$/.test(txt) && txt.length <= 5) lineEl.classList.add("is-lead");
      for (const x of ln) {
        const s = mk("span", "kit-title-u" + (x.em ? " em" : ""), x.u);
        lineEl.appendChild(s);
        spans.push({ s, t: x.t });
      }
      el.appendChild(lineEl);
    });
    const a = end.start ?? L.start, b = story.recap ? story.recap.start + 0.35 : story.duration;
    return withAt({
      el,
      render(t) {
        const o = Math.min(pr(t, a - 0.15, 0.2), 1 - pr(t, b - 0.45, 0.45));
        if (!vis(el, o)) return false;
        for (const w of spans) {
          const u = o4(pr(t, w.t - 0.06, 0.42));
          w.s.style.transform = `translateY(${((1 - u) * 105).toFixed(2)}%)`;
          w.s.style.opacity = (0.15 + 0.85 * u).toFixed(3);
        }
        return true;
      },
    });
  }

  // ---------------------------------------------------------------- recap (one composed frame)
  // Center = story.recap.center + tagline inside a hairline ellipse; the points sit around it, read clockwise from
  // the top-left, each tied to the ellipse by a leader. Enters at story.recap.start, then a slow push so it never freezes.
  const RECAP_ANGLES = { 2: [200, 340], 3: [215, 325, 90], 4: [215, 325, 35, 145], 5: [215, 270, 325, 35, 145], 6: [215, 270, 325, 35, 90, 145] };
  function recap(story, { cx = 960, cy = 520, rx = 640, ry = 340, width = 520, maxTitle = 860 } = {}) {
    const R = story.recap;
    const el = mk("div", "kit-recap");
    const scrim = mk("div", "kit-recap-scrim");
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "kit-recap-svg");
    svg.setAttribute("viewBox", "0 0 1920 1080");
    const ring = document.createElementNS(ns, "ellipse");
    ring.setAttribute("class", "ring");
    svg.appendChild(ring);
    const center = mk("div", "kit-recap-center");
    const head = mk("div", "kit-recap-h", R.center);
    center.append(head, mk("div", "kit-recap-tag", R.tagline || ""));
    const stage = mk("div", "kit-recap-stage");
    stage.style.cssText = "position:absolute;inset:0;transform-origin:50% 48%";
    el.append(scrim, stage);
    stage.append(svg, center);
    const n = R.points.length;
    const angs = RECAP_ANGLES[n] || R.points.map((_, k) => 225 + (k * 360) / n);
    const pts = R.points.map((p, k) => {
      const ang = (angs[k] * Math.PI) / 180;
      const card = mk("div", "kit-recap-pt");
      card.style.width = width + "px";
      const hd = mk("div", "kit-recap-pt-h");
      hd.append(mk("span", "kit-recap-pt-n", String(p.n).padStart(2, "0")), mk("span", "kit-recap-pt-t", p.title));
      card.append(hd, mk("div", "kit-recap-pt-x", p.text));
      stage.appendChild(card);
      const line = document.createElementNS(ns, "line");
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("class", "dot");
      dot.setAttribute("r", "5");
      svg.append(line, dot);
      return { card, line, dot, ang, k };
    });
    let laid = false, er = { x: 200, y: 110 };
    function layout() {
      // the title shrinks to fit maxTitle, the ellipse hugs it
      const hw = head.offsetWidth;
      if (hw > maxTitle) head.style.fontSize = (92 * maxTitle / hw).toFixed(1) + "px";
      const cw = center.offsetWidth, ch = center.offsetHeight;
      center.style.left = (cx - cw / 2).toFixed(1) + "px";
      center.style.top = (cy - ch / 2).toFixed(1) + "px";
      er = { x: cw / 2 + 70, y: ch / 2 + 56 };
      const tb = { x0: cx - cw / 2 - 40, x1: cx + cw / 2 + 40, y0: cy - ch / 2 - 30, y1: cy + ch / 2 + 30 };
      for (const P of pts) {
        const w = P.card.offsetWidth, h = P.card.offsetHeight;
        const c = Math.cos(P.ang), s = Math.sin(P.ang);
        const px = cx + rx * c, py = cy + ry * s;
        // cards anchor toward the centre: left-side cards end at their point, right-side cards start there
        const ax = Math.abs(c) < 0.2 ? 0.5 : c < 0 ? 1 : 0;
        const ay = Math.abs(s) < 0.2 ? 0.5 : s < 0 ? 1 : 0;
        let x = px - ax * w, y = py - ay * h;
        x = Math.max(88, Math.min(W - 88 - w, x)); // 88: still ≥ 64 px after the slow push
        y = Math.max(64, Math.min(H - 64 - h, y));
        // never on top of the title: push the card out vertically
        if (x < tb.x1 && x + w > tb.x0 && y < tb.y1 && y + h > tb.y0) y = s < 0 ? tb.y0 - h : tb.y1;
        P.card.style.left = x.toFixed(1) + "px";
        P.card.style.top = y.toFixed(1) + "px";
        // the leader ends at the card edge nearest the centre
        let ex = Math.max(x, Math.min(x + w, cx)), ey = Math.max(y, Math.min(y + h, cy));
        if (ex > x && ex < x + w && ey > y && ey < y + h) { ex = x + w / 2; ey = y; }
        P.ex = ex;
        P.ey = ey;
        const a = Math.atan2((ey - cy) / er.y, (ex - cx) / er.x);
        P.sx = cx + er.x * Math.cos(a);
        P.sy = cy + er.y * Math.sin(a);
      }
      laid = true;
    }
    return withAt({
      el,
      render(t) {
        const o = pr(t, R.start - 0.1, 0.5);
        if (!vis(el, o)) return false;
        if (!laid) layout();
        const push = 1 + 0.022 * E.io2(pr(t, R.start, R.end - R.start));
        stage.style.transform = `scale(${push.toFixed(4)})`;
        const uc = E.o3(pr(t, R.start, 0.6));
        center.style.opacity = uc.toFixed(3);
        center.style.translate = `0 ${((1 - uc) * 16).toFixed(1)}px`;
        const grow = 0.9 + 0.1 * uc + 0.03 * E.io2(pr(t, R.start + 0.6, 3.5));
        ring.setAttribute("cx", cx);
        ring.setAttribute("cy", cy);
        ring.setAttribute("rx", (er.x * grow).toFixed(1));
        ring.setAttribute("ry", (er.y * grow).toFixed(1));
        ring.style.opacity = (0.8 * uc).toFixed(3);
        for (const P of pts) {
          const a = R.start + 0.35 + P.k * 0.3;
          const ul = E.io2(pr(t, a, 0.45)), uc2 = E.o3(pr(t, a + 0.25, 0.45));
          P.line.setAttribute("x1", P.sx.toFixed(1));
          P.line.setAttribute("y1", P.sy.toFixed(1));
          P.line.setAttribute("x2", lerp(P.sx, P.ex, ul).toFixed(1));
          P.line.setAttribute("y2", lerp(P.sy, P.ey, ul).toFixed(1));
          P.line.style.opacity = ul > 0 ? "1" : "0";
          P.dot.setAttribute("cx", P.sx.toFixed(1));
          P.dot.setAttribute("cy", P.sy.toFixed(1));
          P.dot.style.opacity = ul > 0 ? "1" : "0";
          P.card.style.opacity = uc2.toFixed(3);
          P.card.style.translate = `${((1 - uc2) * 18 * Math.sign(Math.cos(P.ang) || 0)).toFixed(1)}px ${((1 - uc2) * 10).toFixed(1)}px`;
        }
        return true;
      },
    });
  }

  // ---------------------------------------------------------------- captions (core.Captions, kit-styled)
  // The closing line is performed by Kit.title, so it gets no caption box. Latin units that touch CJK get a
  // little breathing room (classes lat-l / lat-r) — the words and times still come straight from the story.
  function captions(container, story, opts = {}) {
    const endLine = story.data.end ? story.data.end.line : null;
    const groups = opts.groups || story.lines.filter((L) => L.i !== endLine).map((L) => [L.i, L.i]);
    const c = new C.Captions(container, story, Object.assign({}, opts, { groups }));
    const cjk = (x) => /[\u3400-\u9fff]/.test(x || "");
    for (const b of c.boxes) {
      if (opts.wrap) b.el.classList.add("is-wrap"); // opt-in: a long line wraps into two balanced lines
      b.spans.forEach((w, k) => {
        const tx = w.s.textContent;
        if (!/[A-Za-z0-9]/.test(tx)) return;
        if (cjk((b.spans[k - 1] || {}).s?.textContent.slice(-1))) w.s.classList.add("lat-l");
        if (cjk((b.spans[k + 1] || {}).s?.textContent.slice(0, 1))) w.s.classList.add("lat-r");
      });
    }
    return c;
  }

  // ---------------------------------------------------------------- progress (extra): chapter hairline
  function progress(story) {
    const el = mk("div", "kit-progress");
    const segs = story.chapters.map((c) => {
      const d = mk("div");
      d.style.flex = String(c.end - c.start);
      const b = mk("b");
      d.appendChild(b);
      el.appendChild(d);
      return { b, c };
    });
    const last = story.chapters[story.chapters.length - 1];
    return withAt({
      el,
      render(t) {
        for (const s of segs) s.b.style.transform = `scaleX(${pr(t, s.c.start, s.c.end - s.c.start).toFixed(4)})`;
        el.style.opacity = (pr(t, 0.05, 0.4) * (1 - pr(t, last.end + 0.05, 0.4))).toFixed(3);
        return true;
      },
    });
  }

  // ---------------------------------------------------------------- studio (extra): the 3D world
  /* Kit.studio({ THREE, addons, canvas, ...opts })
   * addons: { RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, BokehPass, OutputPass, Reflector, RoundedBoxGeometry }
   * opts:   exposure (1.0), fov (32), fog [near, far] ([46, 150]), bloom { strength, radius, threshold }, mirror (true)
   * returns { THREE, renderer, scene, camera, composer, bokeh, bloom, light: {key, rim, fill, hemi}, col, mat, geo,
   *           shoot(t, CAM, TGT, APT), render(), screen(v), place(item, worldPos, o, opts), pool(x, z, r, o), surface(...) } */
  function studio({ THREE, addons, canvas, exposure = 1.0, fov = 32, fog = [46, 150], bloom: bl = {}, mirror = true } = {}) {
    const A = addons;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const col = {
      bg: new THREE.Color("#0c0d11"),
      horizon: new THREE.Color("#1a1c24"),
      accent: new THREE.Color("#FFD21E"),
      accent2: new THREE.Color("#8FC6FF"),
      warn: new THREE.Color("#FF6B4A"),
      ok: new THREE.Color("#6FE3B0"),
      porc: new THREE.Color("#ECE9E2"),
      graph: new THREE.Color("#2A2A30"),
      ink: new THREE.Color("#F2F2F0"),
    };

    const scene = new THREE.Scene();
    // the cove: a screen-space graphite gradient with a warm-grey horizon band — never flat black
    const bgc = document.createElement("canvas");
    bgc.width = 16;
    bgc.height = 512;
    const bg = bgc.getContext("2d");
    const gr = bg.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#0d0e13");
    gr.addColorStop(0.42, "#16171e");
    gr.addColorStop(0.56, "#1d1e26");
    gr.addColorStop(0.7, "#14151b");
    gr.addColorStop(1, "#0c0d11");
    bg.fillStyle = gr;
    bg.fillRect(0, 0, 16, 512);
    const bgTex = new THREE.CanvasTexture(bgc);
    bgTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = bgTex;
    scene.fog = new THREE.Fog(new THREE.Color("#17181f"), fog[0], fog[1]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new A.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.34;

    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 600);

    const key = new THREE.DirectionalLight(0xfff0dc, 1.5);
    key.position.set(-16, 36, 28);
    key.target.position.set(4, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 150 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xa8bcff, 1.1);
    rim.position.set(26, 16, -36);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe8d0, 0.32);
    fill.position.set(10, 8, 40);
    scene.add(fill);
    const hemi = new THREE.HemisphereLight(0x4a4a58, 0x0a0a0c, 0.55);
    scene.add(hemi);

    if (mirror && A.Reflector) {
      const m = new A.Reflector(new THREE.PlaneGeometry(800, 800), { textureWidth: W / 2, textureHeight: H / 2, color: 0x80808a, clipBias: 0.003 });
      m.rotation.x = -Math.PI / 2;
      scene.add(m);
    }
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.62, metalness: 0, transparent: true, opacity: mirror ? 0.8 : 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // soft light pools on the floor: fill an empty floor without flattening the mood
    const poolTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const q = c.getContext("2d");
      const rg = q.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, "rgba(255,244,226,1)");
      rg.addColorStop(0.45, "rgba(255,244,226,0.38)");
      rg.addColorStop(1, "rgba(255,244,226,0)");
      q.fillStyle = rg;
      q.fillRect(0, 0, 256, 256);
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
      return tx;
    })();
    const pools = [];
    function pool(x, z, r, o, color) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: poolTex, color: color || 0x6a655c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.03, z);
      m.scale.set(r * 2, r * 2, 1);
      m.renderOrder = -1;
      scene.add(m);
      pools.push(m);
      return m;
    }

    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new A.EffectComposer(renderer, rt);
    composer.setPixelRatio(1);
    composer.setSize(W, H);
    composer.addPass(new A.RenderPass(scene, camera));
    const bokeh = new A.BokehPass(scene, camera, { focus: 20, aperture: 0.0012, maxblur: 0.008 });
    composer.addPass(bokeh);
    const bloom = new A.UnrealBloomPass(new THREE.Vector2(W, H), bl.strength ?? 0.75, bl.radius ?? 0.5, bl.threshold ?? 1.1);
    composer.addPass(bloom);
    composer.addPass(new A.OutputPass());

    // ---- palette ----
    const glow = (c, o = 1) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: o, depthWrite: false });
    const mat = {
      porcelain: () => new THREE.MeshPhysicalMaterial({ color: col.porc.clone(), roughness: 0.34, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.2, emissive: col.accent.clone(), emissiveIntensity: 0, transparent: true }),
      accent: (k = 2.4) => new THREE.MeshStandardMaterial({ color: col.accent, emissive: col.accent, emissiveIntensity: k, roughness: 0.3 }),
      graphite: () => new THREE.MeshPhysicalMaterial({ color: col.graph.clone(), roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.25, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0, transparent: true }),
      metal: () => new THREE.MeshPhysicalMaterial({ color: 0x17171c, roughness: 0.3, metalness: 0.78, clearcoat: 0.7, clearcoatRoughness: 0.28, transparent: true, opacity: 1 }),
      glass: () => new THREE.MeshPhysicalMaterial({ color: 0x9aa4b8, roughness: 0.08, metalness: 0, transmission: 0, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
      glow,
      edge: (c = 0xf2f2f0, o = 0) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o }),
    };
    const sprite = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const q = c.getContext("2d");
      const rg = q.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(0.35, "rgba(255,255,255,0.45)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      q.fillStyle = rg;
      q.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();

    // canvas-backed text / graphics surfaces living in the 3D world (redrawn only when their args change)
    function surface(cw, ch, w, h, paint) {
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const q = c.getContext("2d");
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      let last = null;
      return {
        mesh,
        mat: m,
        draw(...args) {
          const sig = JSON.stringify(args);
          if (sig === last) return;
          last = sig;
          q.clearRect(0, 0, cw, ch);
          paint(q, ...args);
          tex.needsUpdate = true;
        },
      };
    }

    // ---- camera rig: CAM / TGT = [[t, x, y, z], ...], APT = [[t, aperture], ...] (optional) ----
    const target = new THREE.Vector3();
    function shoot(t, CAM, TGT, APT) {
      const p = track(CAM, t), q = track(TGT, t);
      camera.position.set(p[0], p[1], p[2]);
      target.set(q[0], q[1], q[2]);
      camera.lookAt(target);
      camera.updateMatrixWorld(); // labels project this frame's camera, never last frame's
      bokeh.uniforms.focus.value = camera.position.distanceTo(target);
      if (APT) bokeh.uniforms.aperture.value = track(APT, t)[0];
      return target;
    }

    // ---- projection + pinning overlay components ----
    const vt = new THREE.Vector3();
    function screen(v) {
      vt.copy(v).project(camera);
      return { x: (vt.x * 0.5 + 0.5) * W, y: (-vt.y * 0.5 + 0.5) * H, behind: vt.z > 1 };
    }
    // safe-area fade: inside 64 px sides, under the chapter strip, above the caption band
    function safe(x, y, w, h, top = 112, bottom = 160) {
      return clamp01((x - 40) / 40) * clamp01((W - 40 - (x + w)) / 40) * clamp01((y - top) / 30) * clamp01((H - bottom - (y + h)) / 30);
    }
    /* place(item, worldPos, o, { ax, ay, dx, dy, leader, t, top, bottom })
     * puts a kit component at a projected world point; dx/dy shift it in px (with leader: true a hairline + pin
     * mark the exact point). Returns the screen point or null when hidden. */
    // keep-out boxes (e.g. the visible notes): a pinned label that would land on one fades out instead
    const keep = [];
    function keepOut(t, boxes) {
      keep.length = 0;
      for (const b of boxes) if (b && b.o > 0.001) keep.push(b);
    }
    function place(item, p, o, opts = {}) {
      const { ax = 0, ay = 0.5, dx = 0, dy = 0, leader = false, t = 0, top, bottom } = opts;
      if (o <= 0.001) { item.presence(t, 0); return null; }
      const s = screen(p);
      if (s.behind) { item.presence(t, 0); return null; }
      const w = item.el.offsetWidth, h = item.el.offsetHeight;
      const x = s.x + dx, y = s.y + dy;
      const bx = x - ax * w, by = y - ay * h;
      let fade = opts.noSafe ? 1 : safe(bx, by, w, h, top, bottom);
      for (const k of keep) {
        if (bx < k.x1 && bx + w > k.x0 && by < k.y1 + 24 && by + h > k.y0) fade *= 1 - Math.min(1, k.o * 3) * (1 - clamp01((by - k.y1) / 24));
      }
      const oo = o * fade;
      if (!item.presence(t, oo)) { C.place(item.el, x, y, ax, ay, 0, 1); return null; }
      C.place(item.el, x, y, ax, ay, oo, 1);
      if (leader && item.leaderTo) item.leaderTo(-dx, -dy, ax, ay);
      return s;
    }

    function render() {
      composer.render();
    }

    return { THREE, renderer, scene, camera, composer, bokeh, bloom, light: { key, rim, fill, hemi }, col, mat, sprite, surface, shoot, screen, safe, place, keepOut, pool, pools, render, floor };
  }

  g.Kit = {
    name: "v6-cinematic",
    label,
    note,
    number,
    bars,
    formula,
    title,
    recap,
    captions,
    // extras
    progress,
    studio,
    at,
  };
})(window);
