/* beats.js — KV cache as a 小剧场 (v12-sitcom): a milk-tea shop.
 *
 * 误区   the new clerk 小林 sees the queue grow and the orders slow down, and blames his own hands
 * 账单   the manager reads the 8th customer's slip: the 7 earlier orders were all checked again — and every new customer
 *        makes him re-check everyone before (a chalk staircase: 1 + 2 + … + 8 = 36 checks, 28 of them repeats)
 * 对照   a pile of re-checked slips vs one little notebook: write each order once; the number to match, the content to take
 * 真名   a language model writes the same way: each token's Key and Value go into the notebook = KV cache; the cost is that
 *        the notebook grows — it lives in GPU memory (显存)
 * 结尾   side by side: 小林's notebook and the model's KV cache — only the new one is computed, the rest is looked up
 *
 * Every time comes from the story (api.at / api.ph / api.span) plus small offsets. Sound twin: tools/sfx_beats.py.
 */
window.Beats = function (api) {
  "use strict";
  var K = api.Kit, C = api.C, S = api.story, EZ = api.EZ, pr = C.pr, cl = C.clamp01, lerp = C.lerp;
  var ph = api.ph, at = api.at, W = api.world;
  var P = K.P;
  function X(k, sx) { return api.station(k).cx - 960 + sx; }
  function XE(sx) { return api.endStage.cx - 960 + sx; }
  var parts = [];
  function add(o) { parts.push(o); return o; }

  // ---------- small helpers ----------
  // a holder: an absolutely placed box whose anchor (ax, ay) sits at world (x, y); components go inside it
  function holder(x, y, ax, ay, z, parent) {
    var h = api.el("div", "a", null, parent || W);
    h.style.position = "absolute";
    h.style.left = x + "px"; h.style.top = y + "px";
    h.style.transform = "translate(" + (-ax * 100) + "%," + (-ay * 100) + "%)";
    api.z(h, z == null ? 70 : z);
    return h;
  }
  // pop an element in at `a` (back-eased) and out at `out`; o: { base (transform prefix), r (deg), origin, dIn, dOut }
  var pops = [];
  function pop(el, a, out, o) {
    o = o || {};
    el.style.transformOrigin = o.origin || "50% 100%";
    pops.push({ el: el, a: a, out: out, o: o });
    return el;
  }
  add({ render: function (t) {
    pops.forEach(function (p) {
      var s = K.popScale(t, p.a, p.out, p.o.dIn || 0.3, p.o.dOut || 0.2);
      if (s == null) { K.vis(p.el, false); return; }
      K.vis(p.el, true);
      p.el.style.transform = (p.o.base || "") + " scale(" + s.toFixed(3) + ")" + (p.o.r ? " rotate(" + p.o.r + "deg)" : "");
    });
  } });
  // a label / tag / chip centred at (x, y) (anchor ax, ay), popping in at a, out at out
  function label(o, x, y, a, out, z, ax, ay) {
    var h = holder(x, y, ax == null ? 0.5 : ax, ay == null ? 1 : ay, z);
    var L = K.label(o);
    L.el.style.position = "relative";
    h.appendChild(L.el);
    add({ render: function (t) { L.render(t, a, out); } });
    return L;
  }
  function tag(text, tone, x, y, a, out, z) {
    var h = holder(x, y, 0.5, 1, z == null ? 72 : z);
    var e = api.el("div", "kit-tag" + (tone ? " kit-tone-" + tone : ""), K.term(text), h);
    e.style.position = "relative";
    pop(e, a, out);
    return e;
  }
  function note(text, x, y, a, out, w) {
    var h = holder(x, y, 0, 0, 55);
    var n = K.note(text, { w: w || 520 });
    n.el.style.position = "relative";
    h.appendChild(n.el);
    add({ render: function (t) { n.render(t, a, out); } });
    return n;
  }
  function chip(o, x, y, a, out) {
    var h = holder(x, y, 0, 0, 74);
    var c = K.termChip(o);
    c.el.style.position = "relative";
    h.appendChild(c.el);
    add({ render: function (t) { c.render(t, a, out); } });
    return c;
  }
  function actor(o, z) { var a = api.actor(o, null, z == null ? 20 : z); add(a); return a; }
  function piece(kind, x, y, o, z) { return api.piece(kind, x, y, o, null, z); }
  // units of a text spread over [t0, t1] (for thought bubbles written as he thinks)
  function spread(text, t0, t1) { var n = K.units(text).length; return K.units(text).map(function (u, k) { return t0 + ((t1 - t0) * k) / Math.max(1, n - 1); }); }
  // a world element moved along a lifted arc from A to B between t0 and t0 + d (scale s0 → s1); hidden before `show`
  function fly(el, t, t0, d, A, B, lift, s0, s1, show, hideAt) {
    if ((show != null && t < show) || (hideAt != null && t >= hideAt)) { K.vis(el, false); return; }
    K.vis(el, true);
    var u = EZ.io2(pr(t, t0, d)), x = lerp(A.x, B.x, u), y = lerp(A.y, B.y, u) - lift * Math.sin(Math.PI * u);
    var s = lerp(s0 == null ? 1 : s0, s1 == null ? 1 : s1, u);
    el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
  }
  function svgBox(x, y, w, h, z) {
    var host = api.el("div", "a", null, W);
    host.style.position = "absolute"; host.style.left = x + "px"; host.style.top = y + "px"; host.style.width = w + "px"; host.style.height = h + "px";
    api.z(host, z == null ? 45 : z);
    var svg = K.svgEl("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h }, host);
    svg.style.position = "absolute"; svg.style.overflow = "visible";
    return { host: host, svg: svg };
  }
  // undress the default sets: this film builds its own milk-tea shop
  api.stations.forEach(function (st) { st.dress.style.display = "none"; });
  api.endStage.on = false;

  // the cast (looks shared by every scene and the recap)
  var LIN = { hair: "short", hairColor: "#2b2b2b", shirt: "#ffffff", apron: "#5fb88f", skin: "#ffd9bf", face: "smile" };
  var BOSS = { hair: "bun", hairColor: "#3a2a22", glasses: true, shirt: "#ffb46b", skin: "#f6c9a8", face: "smile" };
  var BOT = { kind: "robot", shirt: "#cfd8e3", face: "smile" };
  var MENU = [["珍珠奶茶", "12"], ["椰果奶茶", "12"], ["柠檬茶", "10"]];
  function ext(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

  // =====================================================================================================
  // 1 · 误区 — the queue grows, the orders slow down, 小林 blames his hands
  // =====================================================================================================
  (function () {
    var k = 0, x = function (sx) { return X(k, sx); };
    var T = {
      shop: at(1, "奶"), lin: ph(1, "新来的店员"), name: at(1, "小"), finds: at(1, "发"), more: ph(1, "客人越多"),
      slow: at(1, "出"), slower: at(1, "越", 2), thinks: at(2, "他"), self: at(2, "是"), hands: at(2, "手"), slowEnd: at(2, "慢"),
    };
    piece("door", x(30), 290, { w: 200, h: 470 }, 5);
    piece("window", x(1780), 150, { w: 130, h: 300 }, 5);
    var board = piece("board", x(1210), 56, { w: 540, h: 272, title: "奶茶 · 今日", rows: MENU }, 6);
    pop(board.title, T.shop - 0.05, null, { origin: "50% 50%", dIn: 0.35 });
    var clock = piece("clock", x(90), 116, { r: 50 }, 6);
    piece("counter", x(1040), 580, { w: 660, h: 280 }, 30);
    piece("register", x(1540), 512, {}, 31);
    var disp = K.display({ label: "叫号", steps: [[0, "#004"], [0.9, "#005"], [2.2, "#006"], [3.95, "#007"]] });
    var dh = holder(x(1130), 576, 0.5, 1, 32); disp.el.style.position = "relative"; dh.appendChild(disp.el);
    add(disp);
    // the clock races while the order does not come out (越慢)
    add({ render: function (t) { clock.hands(10 + 4 * t + 34 * EZ.io2(pr(t, T.slower - 0.1, 0.9))); } });

    // 小林 walks in behind the counter (新来的店员), finds the queue, works faster, then blames his hands
    var lin = actor(ext(LIN, { x: x(2060), y: 790, s: 1 }), 20);
    lin.move(T.lin - 0.3, T.lin + 0.55, x(1380));
    lin.cue(T.finds, { face: "surprised", tilt: -6 }).emote(T.finds + 0.05, "？", 1.0);
    lin.cue(T.more + 0.5, { face: "worried", tilt: 0 });
    // busy hands while the queue keeps growing (each swap is a scooping move, not an idle loop)
    for (var i = 0; i < 4; i++) lin.cue(T.slow + i * 0.3, { arms: i % 2 ? ["front", "write"] : ["write", "front"] });
    lin.cue(T.thinks - 0.05, { arms: ["hold", "hold"], face: "worried", tilt: 4 });
    lin.cue(T.hands, { sweat: true, face: "oops" });
    lin.cue(T.slowEnd, { slump: 1, face: "sad", arms: ["down", "down"], tilt: -4 });
    tag("小林 · 新店员", null, x(1380), 566, T.name - 0.05, null, 33);

    // the queue: two at first, five more walk in on 客人越多; faces fall on 越慢
    var q = K.queue({ front: x(900), y: 900, gap: 110, s: 0.78, n0: 2, seed: 7, enterFrom: x(-240) });
    api.z(q.el, 40); W.appendChild(q.el);
    [0, 0.17, 0.34, 0.5, 0.66].forEach(function (d) { q.join(T.more + d); });
    q.face(T.slower, "worried", { from: 1, stagger: 0.05 });
    add(q);

    // he thinks it is his hands
    var think = "一定是我手太慢……";
    var tb = api.bubble({ text: think, kind: "think", size: 48, tail: "right", along: 0.62, tip: [150, 30], times: spread(think, T.self, T.slowEnd + 0.15), write: true }, null, 60);
    tb.place(x(1290), 330);
    add({ render: function (t) { tb.render(t, T.thinks - 0.02, null); } });
    label({ text: "误区", tone: "warn" }, x(1080), 214, at(2, "。") - 0.02, null, 66);
    note("慢在哪儿？[[先看账单]]再说", x(290), 126, T.slow + 0.2, null, 420);
    api.mark(1, "出单越慢");
    api.mark(2, "手太慢");
    api.camera.frame(1, { x: x(960), s: 1.0, dx: 60 });
    api.camera.frame(2, { x: x(1010), y: 500, s: 1.08, dx: 40, ds: 0.02 });
  })();

  // =====================================================================================================
  // 2 · 账单 — the 8th customer's slip; then the chalk staircase of re-checks
  // =====================================================================================================
  (function () {
    var k = 1, x = function (sx) { return X(k, sx); };
    var T = {
      lift: at(3, "拿"), eighth: at(3, "第"), record: ph(3, "出单记录"), look: at(3, "看"), prev: at(3, "前"), seven: at(3, "7"),
      sheet: at(3, "单", 2), again: at(3, "又"), all: ph(3, "全部核对"), done: at(3, "遍"),
      aha: at(4, "原"), newc: ph(4, "新客人"), every: ph(4, "前面所有人"), recheck: ph(4, "重核"), later: at(4, "越"), slowE: at(4, "慢"),
    };
    piece("window", x(60), 150, { w: 150, h: 300 }, 5);
    var board = piece("board", x(980), 24, { w: 800, h: 310, title: "奶茶 · 今日", rows: MENU }, 6);
    piece("counter", x(1000), 580, { w: 760, h: 280 }, 30);
    piece("plant", x(1790), 640, { h: 250 }, 31);
    var disp = K.display({ label: "叫号", steps: [[0, "#007"], [T.eighth + 0.1, "#008"], [T.newc + 0.2, "#009"]] });
    var dh = holder(x(1120), 576, 0.5, 1, 32); disp.el.style.position = "relative"; dh.appendChild(disp.el);
    add(disp);

    // 小林 hurries in from the left (he left set 1 to the right); the manager is already at the register
    var lin = actor(ext(LIN, { x: x(380), y: 790, s: 1 }), 20);
    lin.move(api.station(k).start - 0.05, T.lift + 0.15, x(1260));
    lin.cue(api.station(k).start, { face: "worried", sweat: true });
    lin.cue(T.again, { face: "oops", arms: ["cheek", "cheek"] });
    lin.cue(T.done + 0.3, { arms: ["down", "down"] });
    lin.cue(T.aha, { face: "surprised", sweat: false, arms: ["down", "up"], tilt: 0 }).emote(T.aha + 0.02, "！", 1.2);
    lin.cue(T.aha + 0.9, { face: "worried", arms: ["down", "down"] });
    lin.cue(T.later, { face: "oops", sweat: true });
    var boss = actor(ext(BOSS, { x: x(1560), y: 790, s: 1 }), 20);
    var slip = K.prop("slip", { w: 46, h: 60 });
    W.appendChild(slip.el); api.z(slip.el, 22);
    boss.cue(T.lift, { arms: ["hold", "down"], face: "think" });
    boss.hold(-1, slip.el, T.lift, T.aha - 0.1, 0, -6);
    boss.cue(T.look, { face: "surprised" });
    boss.cue(T.again + 0.3, { face: "worried", tilt: -6 });
    boss.cue(T.aha - 0.1, { arms: ["down", "down"], face: "smile", tilt: 0 });
    boss.cue(T.every - 0.3, { arms: ["down", "point"], face: "think" });
    boss.cue(T.later + 0.4, { arms: ["down", "down"], face: "flat" });
    add({ render: function (t) { K.vis(slip.el, t >= T.lift && t < T.aha - 0.1); } });

    // the queue at the counter; a new customer walks in on 每来一位新客人
    var q = K.queue({ front: x(860), y: 900, gap: 108, s: 0.78, n0: 6, seed: 19, enterFrom: x(-260) });
    api.z(q.el, 40); W.appendChild(q.el);
    q.join(T.newc - 0.15);
    q.face(T.again, "worried", { from: 0, stagger: 0.04 });
    add(q);
    tag("#008", "accent", x(860), 470, T.eighth + 0.12, T.aha, 46);

    // the slip, up close: unrolls row by row, then every old row is stamped 又核一遍
    var ITEMS = ["珍珠奶茶", "椰果奶茶", "柠檬茶", "珍珠奶茶", "布丁奶茶", "椰果奶茶", "珍珠奶茶"];
    var rows = ITEMS.map(function (it, i) { return { no: "#00" + (i + 1), item: it, tag: "又核一遍" }; });
    rows.push({ no: "#008", item: "新单：柠檬茶", tag: "新单", kind: "new" });
    var rc = K.receipt({ title: "第 8 位客人 · 出单记录", rows: rows, w: 470, footer: "这一位：核了 8 张，<b>7 张是重核</b>" });
    var rh = holder(x(290), 120, 0, 0, 50); rc.el.style.position = "relative"; rh.appendChild(rc.el);
    var rowT = rows.map(function (r, i) { return i < 7 ? T.record + 0.12 + i * ((T.seven + 0.1 - T.record) / 7) : T.sheet; });
    var tagT = rows.map(function (r, i) { return i < 7 ? T.again + i * ((T.done - T.again) / 7) : T.sheet + 0.12; });
    add({ render: function (t) {
      var hi = rows.map(function (r, i) { return i < 7 ? K.bump(t, tagT[i] - 0.05, 0.4) * 0.8 : (t >= T.sheet ? 0.35 : 0); });
      rc.render(t, { at: T.eighth - 0.05, out: T.aha + 0.05, rows: rowT, tags: tagT, footer: T.done + 0.05, hi: hi });
      rc.el.style.transformOrigin = "100% 0";
    } });
    // the dashed thread from the slip in her hand to the close-up
    var th = svgBox(x(760), 120, 820, 420, 49);
    var thread = K.svgEl("path", { d: "M 0 120 Q 420 20 " + (x(1456) - x(760) - 8) + " 300", fill: "none", stroke: P.ink, "stroke-width": 4, "stroke-dasharray": "10 12", "stroke-linecap": "round" }, th.svg);
    add({ render: function (t) { var u = pr(t, T.eighth, 0.4), o = u > 0 && t < T.aha ? 1 : 0; th.host.style.visibility = o ? "inherit" : "hidden"; thread.style.clipPath = "inset(0 " + ((1 - u) * 100).toFixed(1) + "% 0 0)"; } });

    // 原来是这样！
    var aha = api.bubble({ text: "原来是这样！", kind: "say", size: 44, tail: "right", along: 0.55, tip: [210, 40] }, null, 62);
    aha.place(x(1196), 362);
    add({ render: function (t) { aha.render(t, T.aha - 0.04, T.every - 0.2); } });

    // the board is wiped and becomes the bill of checks: column n has n squares — n − 1 re-checks (red) + 1 new (yellow)
    var erase = T.every - 0.45;
    [board.title, board.rows].forEach(function (e) { add({ render: function (t) { var u = pr(t, erase, 0.35); e.style.clipPath = "inset(-10px -10px -10px " + (u * 105).toFixed(1) + "%)"; K.vis(e, u < 1); } }); });
    var area = board.area;
    var ttl = K.chalk("每位客人要核几张单", { size: 40 });
    area.appendChild(ttl.el); K.at(ttl.el, 40, 8);
    var cols = [], SQ = 24, G = 3, BX = 64, BY = 268, CW = 62;
    for (var c = 0; c < 8; c++) {
      var col = [];
      for (var r = 0; r <= c; r++) {
        var sq = api.el("div", "a", null, area);
        sq.style.cssText += "position:absolute;width:" + SQ + "px;height:" + SQ + "px;border-radius:5px;border:3px solid rgba(255,246,214,0.85);transform-origin:50% 100%;";
        sq.style.left = (BX + c * CW) + "px"; sq.style.top = (BY - (r + 1) * (SQ + G)) + "px";
        sq.style.background = r === c ? P.yellow : "#f08b7b";
        col.push(sq);
      }
      var num = api.el("div", "a", String(c + 1), area);
      num.style.cssText += "position:absolute;width:" + SQ + "px;text-align:center;font-family:var(--kit-font-mono);font-weight:700;font-size:24px;color:var(--kit-chalk);";
      num.style.left = (BX + c * CW) + "px"; num.style.top = (BY + 4) + "px";
      cols.push({ sq: col, num: num, t: T.newc + 0.55 + c * ((T.recheck + 0.4 - T.newc - 0.55) / 7) });
    }
    add({ render: function (t) {
      ttl.render(t, erase + 0.35, erase + 1.0);
      cols.forEach(function (cc) {
        K.vis(cc.num, t >= cc.t);
        cc.sq.forEach(function (sq, r) {
          var s = K.popScale(t, cc.t + r * 0.035, null, 0.22);
          K.vis(sq, s != null);
          if (s == null) return;
          var flash = r < cc.sq.length - 1 ? K.bump(t, T.recheck + 0.02 * r, 0.45) : 0;
          sq.style.transform = "scale(" + (s * (1 + 0.25 * flash)).toFixed(3) + ")";
        });
      });
    } });
    // 越往后越慢: a chalk line climbs the staircase
    var arr = K.svgEl("svg", { width: 560, height: 300, viewBox: "0 0 560 300" }, area);
    arr.style.position = "absolute"; arr.style.left = "0"; arr.style.top = "0"; arr.style.overflow = "visible";
    var climb = K.svgEl("path", { d: "M " + (BX + 12) + " " + (BY - 52) + " L " + (BX + 7 * CW + 12) + " " + (BY - 8 * (SQ + G) - 22), fill: "none", stroke: P.chalk, "stroke-width": 6, "stroke-linecap": "round", pathLength: "1", "stroke-dasharray": "1 1" }, arr);
    var head = K.svgEl("path", { d: "M -16 6 L 0 0 L -6 16", fill: "none", stroke: P.chalk, "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, arr);
    var hx = BX + 7 * CW + 12, hy = BY - 8 * (SQ + G) - 22;
    add({ render: function (t) {
      var u = EZ.o2(pr(t, T.later, T.slowE - T.later));
      climb.style.strokeDashoffset = (1 - u).toFixed(4);
      climb.style.visibility = u > 0 ? "visible" : "hidden";
      head.setAttribute("transform", "translate(" + hx + " " + hy + ") rotate(-30)");
      head.style.visibility = u >= 1 ? "visible" : "hidden";
    } });
    // the legend and the total (facts: 1 + 2 + … + 8 = 36, 28 already done before)
    var leg = api.el("div", "a", '<div><i style="display:inline-block;width:24px;height:24px;border-radius:5px;background:#ffcf5a;vertical-align:-3px;margin-right:10px"></i>新单</div><div><i style="display:inline-block;width:24px;height:24px;border-radius:5px;background:#f08b7b;vertical-align:-3px;margin-right:10px"></i>重核</div>', area);
    leg.style.cssText += "position:absolute;left:600px;top:76px;display:flex;flex-direction:column;gap:12px;color:var(--kit-chalk);font-family:var(--kit-font-body);font-weight:700;font-size:28px;line-height:1.2;";
    pop(leg, cols[0].t, null, { origin: "0 0" });
    var tot = K.chalk("共核 36 张", { size: 44, spans: [["36", "kit-chalk-y"]] });
    area.appendChild(tot.el); K.at(tot.el, 580, 170);
    var rep = K.chalk("28 张是重核", { size: 40, spans: [["28 张是重核", "kit-chalk-r"]] });
    area.appendChild(rep.el); K.at(rep.el, 580, 226);
    add({ render: function (t) { tot.render(t, T.slowE - 0.05, T.slowE + 0.35); rep.render(t, T.slowE + 0.3, T.slowE + 0.75); } });
    note("第 n 位客人，要核 [[n 张单]]", x(180), 160, T.every, null, 400);
    api.mark(3, "又全部核对了一遍");
    api.mark(4, "前面所有人的单子");
    api.camera.frame(3, { x: x(980), s: 1.0, dx: 30 });
    api.camera.focus(T.prev - 0.35, T.done + 0.25, { x: x(560), y: 470, s: 1.3 }, { dIn: 0.8, dOut: 0.7 });
    api.camera.frame(4, { x: x(990), s: 1.0, dx: 40 });
  })();

  // =====================================================================================================
  // 3 · 对照 — a pile of re-checked slips vs one little notebook
  // =====================================================================================================
  (function () {
    var k = 2, x = function (sx) { return X(k, sx); };
    var T = {
      hand: at(5, "递"), him: at(5, "他"), book: ph(5, "小本本"), each: at(5, "每"), once: ph(5, "只记一次"), no: ph(5, "单号"), match: at(5, "对"),
      content: ph(5, "内容"), take: at(5, "取"), newc: ph(6, "新客人"), write: ph(6, "只写"), self: ph(6, "这一张"), flip: at(6, "翻"), look: at(6, "查"), ok: ph(6, "就行"),
    };
    piece("window", x(40), 150, { w: 150, h: 300 }, 5);
    piece("window", x(1790), 150, { w: 130, h: 300 }, 5);
    piece("counter", x(820), 580, { w: 900, h: 280 }, 30);
    var disp = K.display({ label: "叫号", steps: [[0, "#003"], [T.newc + 0.3, "#006"]] });
    var dh = holder(x(1410), 576, 0.5, 1, 32); disp.el.style.position = "relative"; dh.appendChild(disp.el);
    add(disp);

    var lin = actor(ext(LIN, { x: x(360), y: 790, s: 1 }), 20);
    lin.move(api.station(k).start - 0.05, T.hand - 0.1, x(1100));
    lin.cue(api.station(k).start, { face: "worried", sweat: true });
    lin.cue(T.hand + 0.2, { arms: ["front", "front"], face: "surprised", sweat: false });
    lin.cue(T.book + 0.3, { arms: ["down", "down"], face: "happy" });
    lin.cue(T.each, { arms: ["down", "write"], face: "smile" });
    lin.cue(T.once + 0.6, { arms: ["down", "down"] });
    lin.cue(T.write, { arms: ["down", "write"], face: "smile" });
    lin.cue(T.flip - 0.1, { arms: ["down", "point"], face: "think" });
    lin.cue(T.ok, { arms: ["up", "down"], face: "happy" }).hop(T.ok, 44, 0.4);
    var boss = actor(ext(BOSS, { x: x(1560), y: 790, s: 1 }), 20);
    boss.cue(T.hand - 0.35, { arms: ["give", "down"], face: "smile" });
    boss.cue(T.him + 0.2, { arms: ["down", "down"] });
    boss.cue(T.no - 0.1, { arms: ["point", "down"], face: "think" });
    boss.cue(T.content - 0.05, { arms: ["point", "down"], face: "smile" });
    boss.cue(T.take + 0.3, { arms: ["down", "down"], face: "happy" });
    boss.cue(T.ok, { arms: ["down", "up"], face: "proud" });

    // the queue: the front customer is handed her tea on 取; a new customer comes in; on 就行 the line moves
    var q = K.queue({ front: x(700), y: 900, gap: 110, s: 0.78, n0: 3, seed: 31, enterFrom: x(-260), exitTo: x(-300) });
    api.z(q.el, 40); W.appendChild(q.el);
    q.serve(T.take + 0.25);
    q.join(T.newc - 0.1);
    q.serve(T.ok - 0.05);
    q.serve(T.ok + 0.45);
    add(q);

    // the comparison on the counter: a wobbly pile of re-checked slips | one little notebook
    var pile = K.prop("slipPile", { n: 14, w: 200, seed: 3 });
    var ph1 = holder(x(930), 584, 0.5, 1, 34); pile.el.style.position = "relative"; pile.el.style.marginLeft = "0"; pile.el.style.marginTop = "0"; ph1.appendChild(pile.el);
    add({ render: function (t) {
      var s = K.popScale(t, api.station(k).start + 0.25, null, 0.35);
      var sink = EZ.i2(pr(t, T.each - 0.1, 0.45));
      if (s == null || sink >= 1) { K.vis(pile.el, false); return; }
      K.vis(pile.el, true);
      pile.el.style.transformOrigin = "50% 100%";
      pile.el.style.transform = "translateX(" + (-260 * sink).toFixed(1) + "px) scale(" + s.toFixed(3) + ") rotate(" + (-14 * sink).toFixed(1) + "deg)";
      pile.el.style.opacity = (1 - sink).toFixed(3);
    } });
    tag("一堆重核的小票", "warn", x(930), 676, T.hand + 0.1, T.each - 0.05, 36);
    tag("一个小本本", "accent", x(1190), 676, T.book - 0.02, T.each - 0.05, 36);

    // the notebook: in her hand → handed over (递给他) → on the counter beside the pile → up to the wall, opened
    var NBW = 740, NBH = 380;
    var nb = K.notebook({ w: NBW, h: NBH, label: "小本本", rows: [["#001", "珍珠奶茶"], ["#002", "椰果奶茶"], ["#003", "柠檬茶"], ["#004", "布丁奶茶"], ["#005", "珍珠奶茶"], ["#006", "布丁奶茶"]] });
    var nh = api.el("div", "a", null, W); nh.style.position = "absolute"; nh.style.left = "0"; nh.style.top = "0"; api.z(nh, 50);
    nh.appendChild(nb.el); nb.el.style.left = (-NBW * 0.75) + "px"; nb.el.style.top = (-NBH) + "px"; // anchor: the cover's bottom centre
    nb.el.style.transformOrigin = "75% 100%";
    var handA = function (t) { return boss.handAt(t, -1); };
    var inset = { x: x(140) + NBW * 0.75, y: 120 + NBH };     // the open book's cover-anchor on the wall
    var rowsAt = function (t) {
      return [0, 1, 2, 3, 4].map(function (i) { return EZ.o2(pr(t, T.each + 0.25 + i * 0.2, 0.3)); })
        .concat([EZ.io2(pr(t, T.write + 0.1, T.self + 0.3 - T.write))]);
    };
    add({ render: function (t) {
      var t0 = T.hand - 0.35;
      if (t < t0) { K.vis(nh, false); return; }
      K.vis(nh, true);
      var A = handA(Math.min(t, T.hand)), Bc = { x: x(1190), y: 586 }, sc;
      var p, s;
      if (t < T.hand) { p = A; s = 0.24; }
      else if (t < T.him + 0.25) { var u = EZ.io2(pr(t, T.hand, T.him + 0.25 - T.hand)); p = { x: lerp(A.x, Bc.x, u), y: lerp(A.y, Bc.y, u) - 120 * Math.sin(Math.PI * u) }; s = lerp(0.24, 0.3, u); }
      else if (t < T.each - 0.15) { p = Bc; s = 0.3 * (1 + 0.12 * K.bump(t, T.book, 0.35)); }
      else { var v = EZ.io3(pr(t, T.each - 0.15, 0.55)); p = { x: lerp(Bc.x, inset.x, v), y: lerp(Bc.y, inset.y, v) - 80 * Math.sin(Math.PI * v) }; s = lerp(0.3, 1, v); }
      nh.style.transform = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
      var open = EZ.io2(pr(t, T.each + 0.15, 0.4));
      var act = -1;
      if (t >= T.match - 0.05 && t < T.take + 0.4) act = 2;
      if (t >= T.self - 0.4 && t < T.flip) act = 5;
      if (t >= T.look - 0.1 && t < T.ok + 0.2) act = Math.min(4, Math.floor((t - T.look + 0.1) / 0.08));
      nb.render(t, { open: open, rows: rowsAt(t), hiK: EZ.o2(pr(t, T.no, 0.25)) * (1 - pr(t, T.content - 0.05, 0.2)), hiV: EZ.o2(pr(t, T.content, 0.25)) * (1 - pr(t, T.take + 0.5, 0.3)), active: act, flip: pr(t, T.flip, 0.45) });
    } });
    label({ text: "只记一次", tone: "accent" }, x(1030), 250, T.once, T.no - 0.1, 66);
    tag("单号 → 拿来对", "ok", x(1030), 250, T.no + 0.1, T.content - 0.05, 66);
    tag("内容 → 拿来取", "accent", x(1030), 250, T.content + 0.1, T.take + 0.6, 66);
    tag("只写这一张", "accent", x(1030), 250, T.self, T.flip - 0.05, 66);
    tag("翻本子查", "ok", x(1030), 250, T.flip + 0.05, api.station(k).end - 0.2, 66);
    // the matched order's tea comes out of the book (取) to the front customer
    var cup = K.prop("cup", { fill: "#f3d36b" });
    W.appendChild(cup.el); api.z(cup.el, 52);
    var cupA = { x: x(140) + NBW * 0.5 + 120, y: 120 + 60 + 2 * nb.rowH + 70 }, cupB = { x: x(700) + 70, y: 900 - 0.78 * 250 };
    var front = q.actor(0);
    front.cue(T.no, { armR: "hold", face: "smile" });
    front.cue(T.take - 0.1, { armR: "tray", face: "happy" });
    add({ render: function (t) {
      if (t < T.take + 0.36) { fly(cup.el, t, T.take - 0.1, 0.45, cupA, cupB, 90, 0.7, 1, T.take - 0.12, T.take + 0.36); return; }
      if (t >= T.take + 1.7) { K.vis(cup.el, false); return; }
      var hp = front.handAt(t, 1);
      K.vis(cup.el, true);
      cup.el.style.transform = "translate(" + hp.x.toFixed(1) + "px," + (hp.y + 12).toFixed(1) + "px)";
    } });
    // her ticket: the order number she matches against the book (单号用来对)
    var ticket = api.el("div", "kit-tag kit-tone-ok", K.term("#003"), W);
    ticket.style.marginLeft = "-46px"; ticket.style.marginTop = "-58px"; api.z(ticket, 46);
    front.hold(1, ticket, T.no + 0.1, T.take - 0.1, 0, 0);
    add({ render: function (t) { K.vis(ticket, t >= T.no + 0.1 && t < T.take - 0.1); } });
    note("记一次，以后[[只查不重核]]", x(1250), 118, T.match + 0.2, null, 470);
    api.mark(5, "每张单只记一次");
    api.mark(6, "只写他自己这一张");
    api.camera.frame(5, { x: x(960), s: 1.0, dx: 40 });
    api.camera.focus(T.hand - 0.2, T.each - 0.2, { x: x(1100), y: 560, s: 1.25 }, { dIn: 0.7, dOut: 0.6 });
    api.camera.frame(6, { x: x(980), s: 1.0, dx: 60 });
  })();

  // =====================================================================================================
  // 4 · 真名 — a language model writes the same way: Key and Value go into the notebook = KV cache; it costs 显存
  // =====================================================================================================
  (function () {
    var k = 3, x = function (sx) { return X(k, sx); };
    var T = {
      model: at(7, "大"), writes: ph(7, "写字"), same: ph(7, "一样"), each: ph(7, "前面每个"), token: at(7, "token"), key: at(7, "Key"),
      value: at(7, "Value"), into: at(7, "记"), book: ph(7, "小本本"), called: at(7, "叫"), kv: at(7, "KV"),
      cost: at(8, "代"), thick: ph(8, "越记越厚"), thick2: at(8, "厚"), takes: at(8, "占"), vram: at(8, "显"),
    };
    piece("window", x(30), 150, { w: 130, h: 300 }, 5);
    piece("plant", x(1760), 640, { h: 250 }, 31);
    piece("desk", x(980), 610, { w: 740, h: 230 }, 30);
    var bot = actor(ext(BOT, { x: x(870), y: 905, s: 0.95 }), 41);
    bot.show(T.model - 0.15);
    bot.hop(T.model - 0.12, 50, 0.4);
    bot.cue(T.writes - 0.05, { arms: ["down", "give"], face: "happy" });
    bot.cue(T.each, { arms: ["down", "point"], face: "smile" });
    bot.cue(T.into, { arms: ["down", "give"] });
    bot.cue(T.kv, { arms: ["up", "down"], face: "proud" });
    bot.cue(T.cost, { arms: ["down", "give"], face: "flat" });
    bot.cue(T.takes, { face: "worried", sweat: true, arms: ["cheek", "cheek"] });
    tag("大模型", "accent", x(870), 420, T.model, null, 72);
    var same = api.bubble({ text: "我也一样！", kind: "say", size: 44, tail: "right", along: 0.6, tip: [120, 60] }, null, 62);
    same.place(x(800), 380);
    add({ render: function (t) { same.render(t, T.same - 0.06, T.token - 0.3); } });

    // the tokens it writes: tiles 1–5 (written), 6–9 later (越记越厚)
    var TILE = 78, GAPT = 14, TX = x(1000), TY = 136, NT = 9;
    var tiles = [];
    for (var i = 0; i < NT; i++) {
      var te = api.el("div", "a", null, W);
      te.style.cssText += "position:absolute;width:" + TILE + "px;height:" + TILE + "px;border-radius:16px;border:4px solid #3d2b22;background:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--kit-font-mono);font-weight:700;font-size:34px;color:#3d2b22;box-shadow:0 5px 0 #3d2b22;";
      te.textContent = String(i + 1);
      te.style.left = (TX + i * (TILE + GAPT)) + "px"; te.style.top = TY + "px";
      api.z(te, 46);
      var tt = i < 5 ? T.writes + i * 0.16 : T.thick + (i - 5) * 0.24;
      tiles.push({ el: te, t: tt });
      pop(te, tt, null, { origin: "50% 100%" });
    }
    tag("token", "ink", TX + 2.5 * (TILE + GAPT), TY - 10, T.token - 0.05, null, 73);
    add({ render: function (t) {
      tiles.forEach(function (ti, i) {
        var hot = i < 5 ? K.bump(t, T.each + i * 0.14, 0.32) : 0;
        ti.el.style.background = i >= 5 ? (t >= ti.t ? "#ffcf5a" : "#fff") : hot > 0.2 ? "#ffcf5a" : "#fff";
      });
    } });
    // Key (单号, mint) and Value (内容, peach) under each written tile, then filed into the notebook
    var NBW = 600, NBH = 300, NBX = x(1060), NBY = 330;
    var nb = K.notebook({ w: NBW, h: NBH, label: "小本本", cols: ["K · 单号", "V · 内容"], rows: [1, 2, 3, 4, 5].map(function (n) { return ["K" + n, "V" + n]; }) });
    var nh = holder(NBX, NBY, 0, 0, 44); nb.el.style.position = "relative"; nh.appendChild(nb.el);
    var kv = [];
    for (var j = 0; j < 5; j++) {
      ["K", "V"].forEach(function (L, m) {
        var e = api.el("div", "a", null, W);
        e.style.cssText += "position:absolute;left:0;top:0;width:66px;height:42px;margin-left:-33px;margin-top:-21px;border-radius:999px;border:3px solid #3d2b22;display:flex;align-items:center;justify-content:center;font-family:var(--kit-font-mono);font-weight:700;font-size:26px;color:#3d2b22;";
        e.style.background = m ? "#ffd9a8" : "#a6e6cc";
        e.textContent = L + (j + 1);
        api.z(e, 47);
        var A = { x: TX + j * (TILE + GAPT) + TILE / 2, y: TY + TILE + 34 + m * 50 };
        var B = { x: NBX + (m ? NBW / 2 : 0) + 64, y: NBY + 60 + j * nb.rowH + nb.rowH / 2 };
        kv.push({ el: e, A: A, B: B, t: (m ? T.value : T.key) + j * 0.06, f: T.into + 0.05 + j * 0.13 + m * 0.05 });
      });
    }
    add({ render: function (t) {
      kv.forEach(function (o) {
        var s = K.popScale(t, o.t, null, 0.26);
        if (s == null || t >= o.f + 0.42) { K.vis(o.el, false); return; }
        K.vis(o.el, true);
        var u = EZ.io2(pr(t, o.f, 0.42)), px = lerp(o.A.x, o.B.x, u), py = lerp(o.A.y, o.B.y, u) - 90 * Math.sin(Math.PI * u);
        o.el.style.transform = "translate(" + px.toFixed(1) + "px," + py.toFixed(1) + "px) scale(" + (s * (1 - 0.3 * u)).toFixed(3) + ")";
      });
      var rows = [0, 1, 2, 3, 4].map(function (i) { return EZ.o2(pr(t, T.into + 0.4 + i * 0.13, 0.2)); });
      var thick = 6 + 56 * EZ.io2(pr(t, T.thick, T.thick2 + 0.3 - T.thick));
      nb.render(t, { at: T.same - 0.05, open: 1, rows: rows, thick: thick, active: t >= T.thick && t < T.takes ? 4 : -1 });
    } });
    // KV cache: the notebook's real name lands on it
    label({ text: "KV cache", tone: "ink" }, NBX + NBW / 2, NBY - 14, T.kv - 0.04, null, 75);
    label({ text: "代价", tone: "warn" }, NBX + 70, NBY - 14, T.cost, null, 75);
    // 显存: the notebook lives in GPU memory — the memory stick fills as the book thickens
    var mem = svgBox(x(1130), 696, 470, 120, 48);
    K.svgEl("rect", { x: 3, y: 10, width: 464, height: 80, rx: 12, fill: "#5fb88f", stroke: P.ink, "stroke-width": 4 }, mem.svg);
    for (var p2 = 0; p2 < 28; p2++) K.svgEl("rect", { x: 14 + p2 * 16, y: 90, width: 9, height: 18, fill: "#ffcf5a", stroke: P.ink, "stroke-width": 2 }, mem.svg);
    var cells = [];
    for (var c2 = 0; c2 < 6; c2++) cells.push(K.svgEl("rect", { x: 22 + c2 * 74, y: 26, width: 58, height: 48, rx: 6, fill: "#2b2b2b" }, mem.svg));
    pop(mem.host, T.takes - 0.15, null, { origin: "50% 100%" });
    add({ render: function (t) { cells.forEach(function (ce, i) { ce.setAttribute("fill", t >= T.cost + 0.2 + i * ((T.vram - T.cost) / 6) ? "#e2483d" : "#2b2b2b"); }); } });
    label({ text: "显存", tone: "warn" }, x(1110), 756, T.vram - 0.04, null, 76, 1, 0.5);
    // the analogy mapped to the real names (one chip on each real word)
    chip({ a: "一张单", b: "token", tone: "coral", aw: 150 }, x(150), 168, T.token, null);
    chip({ a: "单号", b: "K · 拿来匹配", tone: "ok", aw: 150 }, x(150), 252, T.key, null);
    chip({ a: "单子内容", b: "V · 被取走的内容", tone: "peach", aw: 150 }, x(150), 336, T.value, null);
    chip({ a: "小本本", b: "KV cache", tone: "accent", aw: 150 }, x(150), 420, T.kv, null);
    note("例：Llama 2 7B 每个 token 约占 [[0.5 MiB]]", x(150), 548, T.cost + 0.1, null, 540);
    api.mark(7, "KV cache");
    api.mark(8, "显存");
    api.camera.frame(7, { x: x(960), s: 1.0, dx: 50 });
    api.camera.frame(8, { x: x(980), s: 1.0, dx: 20 });
    api.camera.focus(T.thick - 0.2, api.story.line(8).end + 0.2, { x: x(980), y: 560, s: 1.04 }, { dIn: 0.8, dOut: 0.6 });
  })();

  // =====================================================================================================
  // 结尾 — side by side: 小林's notebook and the model's KV cache; only the new one is computed, the rest looked up
  // =====================================================================================================
  (function () {
    var EL = S.line(S.end.line);
    var T = { only: ph(9, "只算"), newOne: ph(9, "新来的"), that: ph(9, "那一个"), then: at(9, "再"), cache: ph(9, "缓存"), look: at(9, "查") };
    var board = piece("board", XE(770), 56, { w: 940, h: 210, title: "", rows: null }, 6);
    var line1 = "只算新来的，再查缓存";
    var us = K.units(line1), times = api.alignTimes(us, EL);
    var chalk = K.chalk(line1, { size: 76, spans: [["新来的", "kit-chalk-y"], ["缓存", "kit-chalk-y"]] });
    board.area.appendChild(chalk.el); K.at(chalk.el, 100, 50);
    add({ render: function (t) { chalk.render(t, times); } });
    // left: 小林 at the counter with his notebook; right: the model at its desk with the KV cache
    piece("counter", XE(80), 580, { w: 760, h: 280 }, 30);
    piece("desk", XE(1080), 610, { w: 740, h: 230 }, 30);
    var lin = actor(ext(LIN, { x: XE(330), y: 790, s: 0.92 }), 20);
    var bot = actor(ext(BOT, { x: XE(1640), y: 905, s: 0.95 }), 41);
    var boss = actor(ext(BOSS, { x: XE(930), y: 905, s: 0.9 }), 42);
    lin.cue(T.only - 0.1, { arms: ["down", "write"], face: "smile" });
    lin.cue(T.then, { arms: ["down", "point"], face: "think" });
    lin.cue(T.look + 0.1, { arms: ["up", "down"], face: "happy" }).hop(T.look + 0.1, 40, 0.4);
    bot.cue(T.only - 0.1, { arms: ["give", "down"], face: "smile" });
    bot.cue(T.then, { arms: ["point", "down"], face: "think" });
    bot.cue(T.look + 0.1, { arms: ["down", "up"], face: "happy" }).hop(T.look + 0.16, 40, 0.4);
    boss.cue(T.newOne, { arms: ["point", "down"], face: "smile" });
    boss.cue(T.look + 0.1, { arms: ["cheer", "cheer"], face: "proud" });
    function book(x0, y0, label, rows, cols) {
      var nb = K.notebook({ w: 420, h: 230, label: label, cols: cols, rows: rows });
      var h = holder(x0, y0, 0, 0, 44); nb.el.style.position = "relative"; h.appendChild(nb.el);
      return nb;
    }
    var nbL = book(XE(420), 340, "小本本", [["#006", "布丁"], ["#007", "珍珠"], ["#008", "柠檬"], ["#009", "椰果"]], ["单号", "内容"]);
    var nbR = book(XE(1160), 370, "KV cache", [["K6", "V6"], ["K7", "V7"], ["K8", "V8"], ["K9", "V9"]], ["K", "V"]);
    var newRow = function (t) { return [1, 1, 1, EZ.io2(pr(t, T.newOne, 0.6))]; };
    add({ render: function (t) {
      var act = t >= T.newOne - 0.05 && t < T.cache ? 3 : t >= T.cache ? Math.min(2, Math.floor((t - T.cache) / 0.12)) : -1;
      var st = { open: 1, rows: newRow(t), active: act, flip: pr(t, T.cache - 0.05, 0.4) };
      nbL.render(t, st); nbR.render(t, st);
    } });
    tag("KV cache", "ink", XE(1370), 360, T.only - 0.2, null, 75);
    // the analogy mapped to the real names, recalled as the closing line starts
    var t1 = S.line(S.end.line).start;
    chip({ a: "小本本", b: "KV cache", tone: "accent", aw: 150 }, XE(110), 88, t1 + 0.05, null);
    chip({ a: "单号", b: "K · 拿来匹配", tone: "ok", aw: 150 }, XE(110), 164, t1 + 0.2, null);
    chip({ a: "单子内容", b: "V · 被取走的内容", tone: "peach", aw: 150 }, XE(110), 240, t1 + 0.35, null);
    tag("只写这一张", "accent", XE(630), 620 + 56, T.newOne + 0.05, T.then - 0.05, 76);
    tag("只算新 token", "accent", XE(1370), 650 + 56, T.newOne + 0.12, T.then - 0.05, 76);
    tag("翻本子查", "ok", XE(630), 676, T.cache, null, 76);
    tag("查缓存", "ok", XE(1370), 706, T.cache + 0.06, null, 76);
    api.camera.frame(9, { x: XE(960), s: 1.0, dx: 40, ds: 0.025 });
  })();

  // the curtain-call recap: the shop's cast and the model take a bow
  api.recapCast = [ext(LIN, { s: 0.86 }), ext(BOSS, { s: 0.86 }), ext(BOT, { s: 0.8 })];

  return {
    render: function (t) {
      for (var i = 0; i < parts.length; i++) parts[i].render(t);
    },
  };
};
