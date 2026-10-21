/* v9-clay kit — the plasticine-town look as the shared component API (window.Kit).
 *
 * Load after lib/core.js and lib/story.js (classic scripts). Every factory returns { el, render(t, …) } and every
 * render is a pure function of t plus its explicit arguments. Overlays are HTML stickers moved by a transform;
 * a film projects its 3D anchor points to the screen and passes x, y to render() (or gives fixed x, y in the options).
 *
 * Extras for this style (see KIT.md):
 *   Kit.clay(THREE, addons, opts)  the clay diorama toolkit: renderer + VSM + GTAO stage, clay material with a thumb-pressed
 *                                  bump, chunky rounded boxes, kawaii faces, squash, hops, puffs, lollipop trees, a 3-layer
 *                                  cream base, an iso camera track and world→screen projection
 *   Kit.sticker(html, opts)        any HTML on a sticker (for one-off panels); Kit.card(...) builds a white clay plaque
 *   Kit.boot(id, renderAt, opts)   the HyperFrames `three` adapter: wait for fonts, then render on every hf-seek
 */
(function (g) {
  "use strict";
  const X = g.ExplainerCore;
  const { clamp01, pr, lerp, env, E, hash } = X;
  const W = 1920, H = 1080;

  const Kit = {
    name: "v9-clay",
    W,
    H,
    layer: null, // default parent for new overlays (a film sets Kit.layer = its label layer)
    // where world-anchored stickers may go: clear of the chapter chip / notes (top), the caption band (bottom) and the edges
    safe: { left: 64, right: 64, top: 140, bottom: 150 },
  };
  const TICK = '<svg class="kit-tick" viewBox="0 0 30 30"><path d="M6 15.5 L12.5 22 L24 8" /></svg>';
  Kit.TICK = TICK;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  Kit.esc = esc;

  function mk(cls, html, parent) {
    const el = document.createElement("div");
    el.className = "kit-o " + cls;
    el.innerHTML = html;
    (parent || Kit.layer || document.body).appendChild(el);
    return el;
  }

  /* The placement every sticker shares: fade over its window, pop in with a soft overshoot, keep inside the safe area.
   * o: { win: [a, b], x, y, ax, ay, dx, dy, clamp, safe, pop, scale, fi, fo } */
  function placer(el, o) {
    const s = { el, o, w: 0, h: 0 };
    s.live = (t) => !o.win || (t > o.win[0] && t < o.win[1]);
    s.remeasure = () => { s.w = 0; };
    s.show = (t, x, y, extraScale = 1) => {
      const w = o.win;
      const op = w ? env(t, w[0], w[1], o.fi ?? 0.26, o.fo ?? 0.26) : 1;
      if (op <= 0 || x == null || y == null) {
        X.place(el, 0, 0, 0, 0, 0);
        return false;
      }
      const ax = o.ax ?? 0.5, ay = o.ay ?? 1;
      let px = x + (o.dx || 0), py = y + (o.dy || 0);
      // clamp into the safe area only while the anchor itself is on screen; an anchor the camera has left takes its sticker with it
      if (o.clamp !== false && x >= 0 && x <= W && y >= 0 && y <= H) {
        if (!s.w) { s.w = el.offsetWidth; s.h = el.offsetHeight; }
        const sf = o.safe || Kit.safe;
        const l = px - ax * s.w, tp = py - ay * s.h;
        const l2 = Math.max(sf.left, Math.min(l, W - sf.right - s.w));
        const t2 = Math.max(sf.top, Math.min(tp, H - sf.bottom - s.h));
        px += l2 - l;
        py += t2 - tp;
      }
      const sc = w && o.pop !== false ? 0.82 + 0.18 * E.back(pr(t, w[0], 0.42)) : 1;
      X.place(el, px, py, ax, ay, op, sc * (o.scale || 1) * extraScale);
      return true;
    };
    return s;
  }
  Kit.placer = placer;

  /* ---------------- sticker / card: any HTML on a clay sticker ---------------- */
  Kit.sticker = function (html, o = {}) {
    const el = mk(o.cls || "", html, o.parent);
    const s = placer(el, o);
    return { el, live: s.live, remeasure: s.remeasure, q: (sel) => el.querySelector(sel), render: (t, x, y, k) => s.show(t, x ?? o.x, y ?? o.y, k) };
  };
  Kit.card = (html, o = {}) => Kit.sticker('<div class="kit-card">' + html + "</div>", o);

  /* ---------------- label: 比喻 in sticker type + 真名 in mono ----------------
   * { text | html, sub, tone: default|accent|warn|ok|ink|sky, icon: dot|tick, stem, size: "sm", win, x, y, ax, ay, dx, dy } */
  Kit.label = function (o) {
    const tone = o.tone && o.tone !== "default" ? " kit-tone-" + o.tone : "";
    const icon = o.icon === "tick" ? TICK : o.icon === "dot" ? '<i class="kit-dot"></i>' : "";
    const html =
      '<div class="kit-label-pill">' + icon + '<span class="kit-label-t">' + (o.html ?? esc(o.text)) + "</span>" +
      (o.sub ? '<span class="kit-label-sub">' + esc(o.sub) + "</span>" : "") + "</div>";
    const stem = o.stem === "up" ? " kit-stem-up" : o.stem ? " kit-stem" : "";
    const el = mk("kit-label" + tone + stem + (o.size === "sm" ? " kit-sm" : ""), html, o.parent);
    const s = placer(el, Object.assign({ ay: o.stem === "up" ? 0 : 1 }, o));
    return { el, live: s.live, render: (t, x, y) => s.show(t, x ?? o.x, y ?? o.y) };
  };

  /* ---------------- note: one plain-language line (「说明」) ----------------
   * defaults to the top-right corner, mirroring the chapter chip; pass x, y to render() + clamp:true to pin it to the scene */
  Kit.note = function (text, o = {}) {
    const el = mk("kit-note", '<b class="kit-note-k">' + esc(o.key || "说明") + "</b><span>" + (o.html ?? esc(text)) + "</span>", o.parent);
    const opts = Object.assign({ x: W - 64, y: 50, ax: 1, ay: 0, clamp: false }, o);
    const s = placer(el, opts);
    return { el, live: s.live, render: (t, x, y) => s.show(t, x ?? opts.x, y ?? opts.y) };
  };

  /* ---------------- number: a hero figure that counts up ----------------
   * { value, unit, caption, decimals, prefix, size: "md", tone: "warn", plaque, win, x, y, ax, ay }
   * render(t, u) counts value × u (u 0..1); or call .set(v) (number or string) and render(t) */
  Kit.number = function (o) {
    const cls = "kit-num" + (o.size === "md" ? " kit-md" : "") + (o.tone ? " kit-tone-" + o.tone : "") + (o.plaque ? " kit-plaque" : "");
    const el = mk(
      cls,
      '<div class="kit-num-row"><span class="kit-num-v"></span><span class="kit-num-u">' + esc(o.unit || "") + "</span></div>" +
        (o.caption ? '<div class="kit-num-c">' + esc(o.caption) + "</div>" : ""),
      o.parent
    );
    const v = el.querySelector(".kit-num-v"), uEl = el.querySelector(".kit-num-u"), cEl = el.querySelector(".kit-num-c");
    const s = placer(el, Object.assign({ ax: 0, ay: 0.5 }, o));
    let shown = null, fixed = null;
    const fmt = (x) => (o.prefix || "") + (typeof x === "string" ? x : x.toFixed(o.decimals || 0));
    return {
      el,
      live: s.live,
      set(val) { fixed = val; },
      setUnit(u) { if (uEl.textContent !== u) { uEl.textContent = u; s.remeasure(); } },
      setCaption(c) { if (cEl && cEl.textContent !== c) { cEl.textContent = c; s.remeasure(); } },
      render(t, u, x, y) {
        const val = u == null ? (fixed ?? o.value) : o.value * clamp01(u);
        const txt = fmt(val);
        if (txt !== shown) { v.textContent = txt; shown = txt; s.remeasure(); }
        return s.show(t, x ?? o.x, y ?? o.y);
      },
    };
  };

  /* ---------------- bars: a clay meter card ----------------
   * { title, rows: [{ label, value, max, tone, valueText }], win, x, y, ax, ay }; render(t, u) — u is 0..1 or one per row */
  Kit.bars = function (o) {
    const rows = o.rows;
    const html =
      (o.title ? '<div class="kit-bars-hd">' + esc(o.title) + "</div>" : "") +
      rows
        .map((r) => '<span>' + esc(r.label) + '</span><div class="kit-bar' + (r.tone ? " kit-tone-" + r.tone : "") + '"><b></b></div><span class="kit-bars-v">' + esc(r.valueText ?? r.value) + "</span>")
        .join("");
    const el = mk("kit-bars", html, o.parent);
    const fills = [...el.querySelectorAll(".kit-bar > b")], vals = [...el.querySelectorAll(".kit-bars-v")];
    const s = placer(el, Object.assign({ ax: 0.5, ay: 0 }, o));
    return {
      el,
      live: s.live,
      render(t, u = 1, x, y) {
        rows.forEach((r, k) => {
          const uk = clamp01(Array.isArray(u) ? u[k] ?? 0 : u);
          fills[k].style.transform = "scaleX(" + ((r.value / (r.max || 1)) * uk).toFixed(4) + ")";
          vals[k].style.opacity = Math.min(1, uk * 4).toFixed(3);
        });
        return s.show(t, x ?? o.x, y ?? o.y);
      },
    };
  };

  /* ---------------- formula: clay tiles joined by operators, each appears at its time ----------------
   * { terms: [{ text, sub, t, tone, op }], win, x, y, ax, ay } — op is printed before the term ("×", "=", "≈", "+");
   * terms not yet spoken take no room, so the strip grows rightwards like writing */
  Kit.formula = function (o) {
    const terms = o.terms;
    const el = mk(
      "kit-formula",
      terms
        .map((m, k) =>
          (m.op ? '<span class="kit-f-op" data-k="' + k + '">' + esc(m.op) + "</span>" : "") +
          '<span class="kit-f-term' + (m.tone ? " kit-tone-" + m.tone : "") + '" data-k="' + k + '"><span class="kit-f-v">' + esc(m.text) + "</span>" +
          (m.sub ? '<span class="kit-f-s">' + esc(m.sub) + "</span>" : "") + "</span>"
        )
        .join(""),
      o.parent
    );
    const parts = terms.map((m, k) => ({ m, els: [...el.querySelectorAll('[data-k="' + k + '"]')] }));
    const win = o.win || [terms[0].t - 0.15, 1e9];
    const s = placer(el, Object.assign({ ax: 0, ay: 0.5 }, o, { win }));
    let shownN = -1;
    return {
      el,
      live: s.live,
      render(t, x, y) {
        let n = 0;
        parts.forEach(({ m, els }) => {
          const on = t >= m.t - 0.06;
          if (on) n++;
          const u = pr(t, m.t - 0.06, 0.32);
          const q = Math.sin(Math.PI * pr(t, m.t + 0.16, 0.22)) * 0.8;
          els.forEach((e) => {
            e.style.display = on ? "" : "none";
            e.style.opacity = u.toFixed(3);
            e.style.transform = "translateY(" + ((1 - E.o3(u)) * 16).toFixed(1) + "px) scale(" + (0.7 + 0.3 * E.back(u) + 0.06 * q).toFixed(3) + "," + (0.7 + 0.3 * E.back(u) - 0.1 * q).toFixed(3) + ")";
          });
        });
        if (n !== shownN) { shownN = n; s.remeasure(); }
        if (n === 0) return s.show(t, null, null);
        return s.show(t, x ?? o.x, y ?? o.y);
      },
    };
  };

  /* ---------------- title: the closing line, word-timed, emphasis from story.end.emphasis ---------------- */
  Kit.title = function (story, o = {}) {
    const END = story.end || story.data.end;
    const L = story.line(END.line);
    const el = document.createElement("div");
    el.className = "kit-title";
    (o.parent || Kit.layer || document.body).appendChild(el);
    const units = L.words.map((w) => w[0]);
    const joined = units.join("");
    const em = units.map(() => false);
    for (const ph of END.emphasis || []) {
      const p = ph.replace(/\s/g, ""), i = joined.indexOf(p);
      if (i < 0) continue;
      let pos = 0;
      units.forEach((u, k) => { if (pos + u.length > i && pos < i + p.length) em[k] = true; pos += u.length; });
    }
    const spans = L.words.map(([u, t], k, arr) => {
      const sp = document.createElement("span");
      const next = arr[k + 1];
      sp.textContent = /[A-Za-z\d]$/.test(u) && next && /^[A-Za-z\d]/.test(next[0]) ? u + " " : u;
      if (em[k]) sp.className = "kit-em";
      el.appendChild(sp);
      return { sp, t };
    });
    if (o.top != null) el.style.top = o.top + "px";
    const a = L.start - 0.1;
    return {
      el,
      render(t) {
        const op = pr(t, a, 0.2) * (o.until ? 1 - pr(t, o.until - 0.3, 0.3) : 1);
        el.style.opacity = op.toFixed(3);
        el.style.visibility = op > 0 ? "visible" : "hidden";
        if (op <= 0) return;
        for (const w of spans) {
          const u = pr(t, w.t - 0.05, 0.3);
          const q = Math.sin(Math.PI * pr(t, w.t + 0.2, 0.24)); // lands, flattens a little, springs back
          w.sp.style.opacity = u.toFixed(3);
          w.sp.style.transform = "translateY(" + ((1 - E.o3(u)) * 30).toFixed(1) + "px) scale(" + (1 + 0.06 * q).toFixed(3) + "," + (1 - 0.08 * q).toFixed(3) + ")";
        }
      },
    };
  };

  /* ---------------- recap: one composed frame ----------------
   * The centre sticker (story.recap.center, + tagline unless tagline:false) and one numbered card per story.recap.points,
   * each pinned to a district of the town. render(t, anchors) with anchors = { center: {x, y}, points: [{x, y, ax, ay}] }
   * (screen points the film projects every frame, so the cards ride the camera's slow pull); without anchors the cards
   * ring the centre. o: { analogies: [...], tagline, stagger, safe } */
  Kit.recap = function (story, o = {}) {
    const R = story.recap;
    const box = document.createElement("div");
    box.className = "kit-recap";
    (o.parent || Kit.layer || document.body).appendChild(box);
    const end = R.end + 2;
    const safe = o.safe || { left: 48, right: 48, top: 176, bottom: 40 };
    const cEl = mk("kit-recap-center", '<div class="kit-rc-pill">' + esc(R.center) + (o.tagline !== false && R.tagline ? "<small>" + esc(R.tagline) + "</small>" : "") + "</div>", box);
    const center = placer(cEl, { win: [R.start, end], ax: 0.5, ay: 1, safe });
    const cards = R.points.map((p, k) => {
      const an = o.analogies && o.analogies[k];
      const el = mk(
        "kit-rc-wrap",
        '<div class="kit-rc"><div class="kit-rc-n">' + p.n + '</div><div><b class="kit-rc-t">' + esc(p.title) + (an ? "<em>：</em>" + esc(an) : "") +
          '</b><span class="kit-rc-x">' + esc(p.text).replace(/([A-Za-z0-9.%≈/])\s+(?=[A-Za-z0-9≈])/g, "$1\u00a0") + "</span></div></div>",
        box
      );
      return placer(el, { win: [R.start + 0.25 + k * (o.stagger ?? 0.32), end], ax: 0.5, ay: 0.5, safe });
    });
    return {
      el: box,
      render(t, anchors = {}) {
        const c = anchors.center || { x: W / 2, y: H / 2 };
        center.show(t, c.x, c.y);
        cards.forEach((s, k) => {
          const n = cards.length, ang = -Math.PI / 2 + (k / n) * Math.PI * 2;
          const p = (anchors.points && anchors.points[k]) || { x: c.x + Math.cos(ang) * 640, y: c.y + Math.sin(ang) * 300 };
          s.o.ax = p.ax ?? 0.5;
          s.o.ay = p.ay ?? 0.5;
          s.show(t, p.x, p.y);
        });
      },
    };
  };

  /* ---------------- captions + chapters: core builds them, this kit only styles them ---------------- */
  // captions for every narrated line except the closing line (Kit.title performs that one)
  // Latin words (token, KV cache, 0.5 MB…) get a little air where they touch Chinese, as a typesetter would
  Kit.captions = (container, story, opts = {}) => {
    const caps = new X.Captions(container, story, Object.assign({ lead: 0.06, tail: 0.08, groups: story.lines.filter((L) => !story.data.end || L.i !== story.data.end.line).map((L) => [L.i, L.i]) }, opts));
    const cjk = /[\u3400-\u9fff]/;
    caps.boxes.forEach((b) => b.spans.forEach((w, i, arr) => {
      const txt = w.s.textContent;
      if (!/[A-Za-z0-9]/.test(txt)) return;
      const prev = i > 0 ? arr[i - 1].s.textContent : "", next = i + 1 < arr.length ? arr[i + 1].s.textContent : "";
      if (cjk.test(prev.slice(-1))) w.s.style.marginLeft = "0.2em";
      if (cjk.test(next.charAt(0))) w.s.style.marginRight = "0.2em";
    }));
    return caps;
  };
  Kit.chapters = (el, story) => new X.Chapters(el, story);

  /* ---------------- keyPhrase: a line's key phrase, for draft beats (the starter's placeholders and its sound bed) ----------------
   * Returns indices into story.line(i).words. The line is cut into clauses at ，。；：！？; the clause scoring highest on
   * 2 × (Latin words / numbers) + 1.5 (if it is the last clause) + min(units, 8) / 8 wins; one leading connective
   * (所以 / 因为 / 然后 / 就会 / 都要 / 是 …) and trailing particles (的 / 了 / 吧 …) are trimmed; punctuation is dropped;
   * at most o.max units (20). Pure function of the story data (no DOM), so tools can run it in Node. */
  const KP_SPLIT = /^[，。；：！？,.;:!?…]+$/;
  const KP_PUNCT = /^[\s，。；：！？、,.;:!?…—「」『』（）()《》“”"'‘’·]+$/;
  const KP_LEAD = ["所以才有", "所以说", "所以", "因为", "但是", "而且", "然后", "之后", "于是", "那么", "就会", "就要", "就能", "就是", "都要", "还要", "也要", "只要", "就", "才", "都", "还", "也", "又", "再", "是", "而", "拿"];
  const KP_TAIL = /^[的了吧呢啊呀吗嘛]$/;
  Kit.keyPhrase = function (story, i, o = {}) {
    const W = (story.line ? story.line(i) : story.lines[i - 1]).words;
    const clauses = [[]];
    W.forEach(([u], k) => {
      if (KP_SPLIT.test(u)) clauses.push([]);
      else if (!KP_PUNCT.test(u)) clauses[clauses.length - 1].push(k);
    });
    const cs = clauses.filter((c) => c.length);
    if (!cs.length) return [];
    let c = cs[cs.length - 1], best = -1;
    cs.forEach((cl, n) => {
      const s = 2 * cl.filter((k) => /[A-Za-z\d]/.test(W[k][0])).length + (n === cs.length - 1 ? 1.5 : 0) + Math.min(cl.length, 8) / 8;
      if (s > best) { best = s; c = cl; }
    });
    c = c.slice();
    const txt = c.map((k) => W[k][0]).join("");
    for (const p of KP_LEAD) {
      if (!txt.startsWith(p)) continue;
      let acc = "", n = 0;
      while (n < c.length && acc.length < p.length) acc += W[c[n++]][0];
      if (acc === p && c.length - n >= 2) { c = c.slice(n); break; }
    }
    while (c.length > 2 && KP_TAIL.test(W[c[c.length - 1]][0])) c.pop();
    return c.slice(0, o.max || 20);
  };

  /* ---------------- boot: the HyperFrames `three` adapter ---------------- */
  Kit.boot = function (id, renderAt, o = {}) {
    g.__hf = g.__hf || {};
    g.__hf.buildReady = g.__hf.buildReady || {};
    let ready = false;
    const text = (o.text || "") + (o.story ? o.story.lines.map((L) => L.text).join("") + JSON.stringify(o.story.recap || {}) + (o.story.chapters || []).map((c) => c.title).join("") : "");
    const fams = o.fonts || ['400 80px "Smiley Sans"', '400 34px "ZCOOL KuaiLe"', '800 40px "Noto Sans SC"', '500 28px "Noto Sans SC"', '500 28px "Geist Mono"'];
    g.__hf.buildReady[id] = (async () => {
      await Promise.all(fams.map((f) => document.fonts.load(f, text || "测试")));
      if (o.afterFonts) o.afterFonts();
      ready = true;
      renderAt(g.__hfThreeTime || 0);
    })();
    g.addEventListener("hf-seek", (e) => { if (ready) renderAt(e.detail.time); });
  };

  /* =====================================================================================================
   * Kit.clay — the plasticine diorama toolkit (Three.js r181).
   *   const C = Kit.clay(THREE, { RoundedBoxGeometry, EffectComposer, RenderPass, GTAOPass, OutputPass }, { canvas })
   * Returns the stage (renderer, scene, camera, sun, composer) and the makers every clay film reuses.
   * ===================================================================================================== */
  Kit.clay = function (THREE, A, o = {}) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    // pastel clay palette (ink = cocoa, never black)
    const P = Object.assign(
      {
        pad: "#ffd6c2", padB: "#fde6c6", padC: "#cdeedb", padD: "#ffdbe6", padE: "#dcd6f5", road: "#c9bfdb", dash: "#ffffff",
        wall: "#fff7ee", floor: "#fff0df", trim: "#ffd23f", yel: "#ffd23f", yelTape: "#ffeea0", card: "#eab88a", tape: "#f8dcb6",
        sky: "#8fc8ff", mint: "#a6e6cc", lilac: "#d5bdff", pink: "#ffbccd", red: "#ff7d6e", warn: "#ff6b5c", wood: "#e2a46c",
        tree: ["#86d69c", "#6fcb8b", "#a6e19f"], trunk: "#cf9868", ink: "#4a3a31", eye: "#3b2c25", blush: "#ff9fb4",
        island: "#fff1dc", islandMid: "#f6d1a8", islandLow: "#e9b489", white: "#ffffff", steel: "#c7d0da", board: "#e8ecf0",
      },
      o.palette || {}
    );

    // ---------- the stage: soft VSM sun + hemisphere fill, GTAO for clay contact shadows, Neutral tone mapping ----------
    const canvas = o.canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = o.exposure ?? 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    const scene = new THREE.Scene();
    scene.background = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 512;
      const gx = c.getContext("2d");
      const gr = gx.createLinearGradient(0, 0, 0, 512);
      const sky = o.sky || ["#ffe9dc", "#f6e2f2"];
      gr.addColorStop(0, sky[0]);
      gr.addColorStop(1, sky[1]);
      gx.fillStyle = gr;
      gx.fillRect(0, 0, 16, 512);
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
      return tx;
    })();
    const camera = new THREE.OrthographicCamera(-10, 10, 5.6, -5.6, 40, 280);
    scene.add(new THREE.HemisphereLight(0xfffaf2, 0xe7b9a0, o.hemi ?? 1.55));
    const sun = new THREE.DirectionalLight(0xfff0dc, o.sun ?? 2.2);
    const sunAt = o.sunPos || [-18, 42, 22], sunTo = o.sunTarget || [2, 0, -2], ext = o.shadowExtent || 38;
    sun.position.set(sunAt[0], sunAt[1], sunAt[2]);
    sun.target.position.set(sunTo[0], sunTo[1], sunTo[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 140 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 9;
    sun.shadow.blurSamples = 16;
    scene.add(sun, sun.target);
    const composer = new A.EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
    composer.setPixelRatio(1);
    composer.setSize(W, H);
    composer.addPass(new A.RenderPass(scene, camera));
    const gtao = new A.GTAOPass(scene, camera, W, H);
    gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.6, thickness: 1.2, scale: 1.25, samples: 16 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    gtao.blendIntensity = 0.85;
    // glass, light cones and other see-through things must not darken what sits behind them: hide them from the AO pass
    const NOAO = [];
    const aoRender = gtao.render.bind(gtao);
    gtao.render = (...args) => {
      const was = NOAO.map((m) => m.visible);
      NOAO.forEach((m) => { m.visible = false; });
      aoRender(...args);
      NOAO.forEach((m, i) => { m.visible = was[i]; });
    };
    const noAO = (...ms) => { NOAO.push(...ms); return ms[0]; };
    // VSM gotcha: three.js draws every *receiving* mesh into a VSM shadow map too, so castShadow = false is not enough —
    // glass, light cones, ghosts and thin frames must also stop receiving, or they throw shadows on what is behind them
    const noShadow = (...ms) => { ms.forEach((m) => m.traverse((o) => { o.castShadow = false; o.receiveShadow = false; })); return ms[0]; };
    composer.addPass(gtao);
    composer.addPass(new A.OutputPass());

    // ---------- plasticine: a thumb-pressed bump, a matte body with a velvet sheen ----------
    const bump = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const gx = c.getContext("2d");
      gx.fillStyle = "#808080";
      gx.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 520; k++) {
        const x = hash(k * 3.1) * 256, y = hash(k * 5.7 + 1) * 256, r = 4 + hash(k * 7.3 + 2) * 22, v = hash(k * 9.1 + 3) > 0.5 ? 255 : 0;
        const gr = gx.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${v},${v},${v},0.10)`);
        gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
        gx.fillStyle = gr;
        gx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      const tx = new THREE.CanvasTexture(c);
      tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
      return tx;
    })();
    const M = (color, m = {}) =>
      new THREE.MeshPhysicalMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.7, metalness: 0, sheen: 0.55, sheenRoughness: 0.55, sheenColor: new THREE.Color("#fff6ea"), bumpMap: bump, bumpScale: 1.4 }, m));
    // a clay material wearing a painted map (faces, tape, text); emissive is free for glows
    const clayMap = (map, m = {}) =>
      new THREE.MeshPhysicalMaterial(Object.assign({ map, roughness: 0.72, metalness: 0, sheen: 0.5, sheenRoughness: 0.55, sheenColor: new THREE.Color("#fff6ea"), bumpMap: bump, bumpScale: 1.4, transparent: true, emissive: new THREE.Color("#ffd23f"), emissiveIntensity: 0 }, m));
    // everything is chunky: corners round off to about a quarter of the smallest side
    const rbox = (w, h, d, r = 0.08) => { const m = Math.min(w, h, d); return new A.RoundedBoxGeometry(w, h, d, 4, Math.max(0.001, Math.min(Math.max(r, 0.26 * m), w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))); };
    function mesh(geo, mat, x, y, z, parent = scene, cast = true) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = cast;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    function slab(cx, cz, w, d, top, h, color, r = 0.25, parent = scene) { return mesh(rbox(w, h, d, r), M(color), cx, top - h / 2, cz, parent, false); }
    // the whole town sits on a three-layer cream base (a cake of plasticine)
    function diorama(cx, cz, w, d) {
      slab(cx, cz, w, d, 0, 0.5, P.island, 1.0);
      slab(cx, cz, w - 0.8, d - 0.8, -0.5, 0.8, P.islandMid, 0.6);
      slab(cx, cz, w - 1.6, d - 1.6, -1.3, 0.7, P.islandLow, 0.5);
    }
    // lollipop trees: a stubby trunk and two soft balls of green
    let treeN = 0;
    function tree(x, z, s = 1, y0 = 0.3) {
      const col = P.tree[treeN++ % P.tree.length];
      mesh(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 0.7 * s, 16), M(P.trunk), x, y0 + 0.35 * s, z);
      mesh(new THREE.SphereGeometry(0.66 * s, 28, 20), M(col), x, y0 + 1.2 * s, z);
      mesh(new THREE.SphereGeometry(0.4 * s, 24, 16), M(col), x + 0.28 * s, y0 + 1.62 * s, z - 0.12 * s);
    }

    // ---------- painted faces: kawaii bean eyes with a sparkle, rosy cheeks, a small smile (or ^ ^ when happy) ----------
    const TEXTS = [];
    function canvasTex(draw, w = 256, h = 256) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const gx = c.getContext("2d");
      draw(gx, w, h);
      const tx = new THREE.CanvasTexture(c);
      tx.colorSpace = THREE.SRGBColorSpace;
      tx.anisotropy = 4;
      TEXTS.push({ tx, gx, draw, w, h });
      return tx;
    }
    function paintFace(gx, face, cx = 128, cy = 128, s = 1) {
      gx.save();
      gx.translate(cx - 128 * s, cy - 128 * s);
      gx.scale(s, s);
      gx.fillStyle = "rgba(255,120,150,0.55)";
      [[70, 150], [186, 150]].forEach(([x, y]) => { gx.beginPath(); gx.ellipse(x, y, 26, 15, 0, 0, Math.PI * 2); gx.fill(); });
      gx.fillStyle = "#3b2c25";
      gx.strokeStyle = "#3b2c25";
      gx.lineCap = "round";
      if (face === "happy") {
        gx.lineWidth = 11;
        [[88, 118], [168, 118]].forEach(([x, y]) => { gx.beginPath(); gx.arc(x, y + 8, 17, Math.PI * 1.1, Math.PI * 1.9); gx.stroke(); });
      } else if (face === "tired") {
        gx.lineWidth = 9;
        [[90, 116], [166, 116]].forEach(([x, y]) => { gx.beginPath(); gx.moveTo(x - 16, y); gx.lineTo(x + 16, y); gx.stroke(); });
      } else {
        // "open" looks ahead; "lookL" / "lookR" glance sideways
        const dx = face === "lookL" ? -9 : face === "lookR" ? 9 : 0;
        [[90, 112], [166, 112]].forEach(([x, y]) => {
          gx.beginPath(); gx.ellipse(x + dx, y, 13, 19, 0, 0, Math.PI * 2); gx.fill();
          gx.fillStyle = "#ffffff"; gx.beginPath(); gx.arc(x + dx + 4, y - 7, 5, 0, Math.PI * 2); gx.fill(); gx.fillStyle = "#3b2c25";
        });
      }
      gx.lineWidth = 8;
      gx.beginPath();
      if (face === "tired") gx.arc(128, 162, 14, Math.PI * 1.15, Math.PI * 1.85);
      else gx.arc(128, 150, 16, Math.PI * 0.15, Math.PI * 0.85);
      gx.stroke();
      gx.restore();
    }
    // a box side: base colour, optional tape stripe, optional face ("open" | "happy" | "tired" | "lookL" | "lookR")
    const boxTexture = (base, tape, face) =>
      canvasTex((gx) => {
        gx.fillStyle = base;
        gx.fillRect(0, 0, 256, 256);
        if (tape) { gx.fillStyle = tape; gx.fillRect(104, 0, 48, 256); }
        if (face) paintFace(gx, face);
      });
    // a tile side with a word on it (redrawn after fonts load: call C.redraw())
    const textTexture = (base, text, o2 = {}) =>
      canvasTex(
        (gx, w, h) => {
          gx.fillStyle = base;
          gx.fillRect(0, 0, w, h);
          if (o2.band) { gx.fillStyle = o2.band; gx.fillRect(0, h * 0.8, w, h * 0.2); }
          if (o2.face) paintFace(gx, o2.face, w / 2, h * 0.3, 0.42);
          const fs = o2.size || (text.length > 2 ? 86 : 112);
          gx.font = `${o2.weight || 400} ${fs}px ${o2.font || '"ZCOOL KuaiLe", "Noto Sans SC", sans-serif'}`;
          gx.fillStyle = o2.color || P.ink;
          gx.textAlign = "center";
          gx.textBaseline = "middle";
          gx.fillText(text, w / 2, h * (o2.y ?? (o2.face ? 0.66 : 0.52)));
        },
        o2.w || 256,
        o2.h || 256
      );
    const redraw = () => TEXTS.forEach((T) => { T.gx.clearRect(0, 0, T.w, T.h); T.draw(T.gx, T.w, T.h); T.tx.needsUpdate = true; });

    // big shiny eyes and rosy cheeks on a front face at local x (rotY turns the face: -PI/2 puts it on +z)
    function eyes(parent, x, y, dz, s = 1, rotY = 0) {
      let host = parent;
      if (rotY) { host = new THREE.Group(); host.rotation.y = rotY; parent.add(host); }
      [-1, 1].forEach((k) => {
        const w = mesh(new THREE.SphereGeometry(0.25 * s, 24, 16), M("#ffffff", { bumpMap: null }), x, y, k * dz, host, false);
        w.scale.x = 0.45;
        const pu = mesh(new THREE.SphereGeometry(0.14 * s, 20, 14), M(P.eye, { bumpMap: null, roughness: 0.35 }), x + 0.08 * s, y - 0.02 * s, k * dz * 0.96, host, false);
        pu.scale.x = 0.5;
        mesh(new THREE.SphereGeometry(0.045 * s, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), x + 0.15 * s, y + 0.06 * s, k * dz * 0.9, host, false);
        const ck = mesh(new THREE.SphereGeometry(0.17 * s, 20, 12), M(P.blush, { bumpMap: null }), x - 0.02, y - 0.4 * s, k * dz * 1.55, host, false);
        ck.scale.set(0.3, 0.6, 1);
      });
      return host;
    }
    // little dot eyes + blush for small heroes (robots, pins): a face looking along +z
    function dotFace(parent, y, z, spread = 0.17, s = 1) {
      [-1, 1].forEach((k) => {
        const e = mesh(new THREE.SphereGeometry(0.085 * s, 18, 12), M(P.eye, { bumpMap: null, roughness: 0.3 }), k * spread, y, z, parent, false);
        e.scale.set(1, 1.3, 0.5);
        mesh(new THREE.SphereGeometry(0.028 * s, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), k * spread + 0.03 * s, y + 0.05 * s, z + 0.04 * s, parent, false);
        const ck = mesh(new THREE.SphereGeometry(0.08 * s, 14, 10), M(P.blush, { bumpMap: null }), k * spread * 1.75, y - 0.13 * s, z - 0.01, parent, false);
        ck.scale.set(1, 0.6, 0.4);
      });
    }

    // ---------- motion: squash on landing, parabolic hops, smoke puffs ----------
    // squash and stretch on landing: a quick flatten, then back to round (call after setting position / scale 1)
    function squash(m, t, land, amt = 1, base = 1) {
      const q = Math.sin(Math.PI * pr(t, land, 0.22)) * (1 - pr(t, land, 0.22) * 0.3) * amt;
      m.scale.set(base * (1 + 0.2 * q), base * (1 - 0.26 * q), base * (1 + 0.2 * q));
      m.position.y -= 0.065 * q * base;
      return q;
    }
    const hop = (a, b, u, h) => V(lerp(a.x, b.x, u), lerp(a.y, b.y, u) + Math.sin(Math.PI * u) * h, lerp(a.z, b.z, u));
    function bez(p0, c, p1, u) {
      const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u;
      const dx = (1 - u) * (c[0] - p0[0]) + u * (p1[0] - c[0]), dz = (1 - u) * (c[1] - p0[1]) + u * (p1[1] - c[1]);
      return { x: a * p0[0] + b * c[0] + d * p1[0], z: a * p0[1] + b * c[1] + d * p1[1], ang: Math.atan2(-dz, dx) };
    }
    function polyAt(pts, s) {
      for (let i = 1; i < pts.length; i++) {
        const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
        const l = Math.hypot(x1 - x0, z1 - z0);
        if (s <= l || i === pts.length - 1) { const u = l ? clamp01(s / l) : 0; return { x: x0 + (x1 - x0) * u, z: z0 + (z1 - z0) * u }; }
        s -= l;
      }
    }
    const polyLen = (pts) => pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    // little white clouds that rise and fade from (x, y, z); render(t, on) where `on` is the time they start
    function puffs(parent, x, y, z, n = 3, period = 1.6) {
      const list = Array.from({ length: n }, () => mesh(new THREE.SphereGeometry(0.34, 24, 16), M("#ffffff", { transparent: true, opacity: 0, bumpMap: null }), x, y, z, parent, false));
      return {
        list,
        render(t, on, off = 1e9) {
          const k = t - on;
          list.forEach((pf, j) => {
            const q = k > 0 ? (k / period + j / n) % 1 : 0;
            pf.visible = k > 0 && t < off;
            pf.position.set(x + 0.25 * q, y + 1.5 * q, z - 0.15 * q);
            pf.scale.setScalar(0.45 + 0.85 * q);
            pf.material.opacity = 0.92 * (1 - q) * Math.min(1, k / 0.3) * Math.min(1, q / 0.12);
          });
        },
      };
    }
    // one burst "poof" of n clouds at a point (for things that vanish): render(t, at)
    function poof(parent, n = 5, size = 0.4) {
      const list = Array.from({ length: n }, () => mesh(new THREE.SphereGeometry(size, 20, 14), M("#ffffff", { transparent: true, opacity: 0, bumpMap: null }), 0, 0, 0, parent, false));
      return {
        render(t, at, p) {
          const u = pr(t, at, 0.55);
          list.forEach((m, j) => {
            const a = (j / n) * Math.PI * 2 + 0.4;
            m.visible = u > 0 && u < 1;
            m.position.set(p.x + Math.cos(a) * 0.9 * E.o2(u), p.y + 0.3 * E.o2(u) + 0.2 * Math.sin(a * 2), p.z + Math.sin(a) * 0.9 * E.o2(u));
            m.scale.setScalar(0.4 + 0.9 * E.o2(u));
            m.material.opacity = 0.95 * (1 - u);
          });
        },
      };
    }

    // ---------- the iso camera: keys [[t, x, y, z, frustumWidth, azimuthDeg], …] through core.track ----------
    const EL = ((o.elevation ?? 33) * Math.PI) / 180;
    function setIso(keys, t) {
      const [x, y, z, w, azd] = X.track(keys, t);
      const az = (azd * Math.PI) / 180;
      camera.position.set(x + Math.sin(az) * Math.cos(EL) * 150, y + Math.sin(EL) * 150, z + Math.cos(az) * Math.cos(EL) * 150);
      camera.up.set(0, 1, 0);
      camera.lookAt(x, y, z);
      camera.updateMatrixWorld(); // labels project with this frame's camera, not the last one
      const hw = w / 2, hh = (hw * H) / W;
      camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh;
      camera.updateProjectionMatrix();
      return { x, y, z, w, az };
    }
    const vtmp = new THREE.Vector3();
    function toScreen(p) {
      vtmp.copy(p).project(camera);
      return { x: (vtmp.x * 0.5 + 0.5) * W, y: (-vtmp.y * 0.5 + 0.5) * H };
    }

    return {
      THREE, V, P, W, H, renderer, scene, camera, sun, composer, gtao, bump, noAO, noShadow,
      M, clayMap, rbox, mesh, slab, diorama, tree, canvasTex, paintFace, boxTexture, textTexture, redraw, eyes, dotFace,
      squash, hop, bez, polyAt, polyLen, puffs, poof, setIso, toScreen,
      render: () => composer.render(),
    };
  };

  g.Kit = Kit;
})(window);
