// motion-lib.js — reusable MG primitives for deterministic canvas films (distilled from a real launch-film project).
// Load before film.js. Provides globals: cv, ctx, W, H, T (current time), BOIL (12fps boil frame), LANG.
// Contract: film.js defines render(t) that is PURE and DETERMINISTIC (no Math.random at draw time) — frames are rendered by parallel tabs.
//
// Index
//   math:      clamp seg lerp eox ein exio eio eback spring hash rand(seed) beatGrid(bpm, grid0)
//   shapes:    rr cover disc hero starPath cardShadow photoCard burst ring3d
//   doodle:    jit smoothPath partial doodle ellP starP heartP sparkle          (lines boil at 12 fps)
//   text:      HF lineIn penText                                                (penText = written on by a pen dot)
//   fx:        metaballs halftone stripes tint outline cutoutFrom lum blush grain
//   boot:      loadImages loadFonts startFilm({ dur, setup, render })
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
let T = 0, BOIL = 0;
const LANG = new URLSearchParams(location.search).get('lang') || 'en';

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const eox = p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);                     // expo out: UI, type, slams
const ein = p => p <= 0 ? 0 : Math.pow(2, 10 * p - 10);                      // expo in: falls, convergence
const exio = p => p <= 0 ? 0 : p >= 1 ? 1 : p < .5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
const eio = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;    // cubic in-out: camera, drift
const eback = p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const spring = (p, k = 7, f = 12) => p <= 0 ? 0 : 1 - Math.exp(-k * p) * Math.cos(f * p);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function rand(seed) { let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const beatGrid = (bpm, grid0 = 0) => k => grid0 + k * 60 / bpm;               // beat(k) → seconds
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---------- shapes ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function cover(g, img, x, y, w, h, zoom = 1, fx = .5, fy = .5) { const iw = img.width, ih = img.height, s = Math.max(w / iw, h / ih) * zoom, sw = w / s, sh = h / s; g.drawImage(img, (iw - sw) * fx, (ih - sh) * fy, sw, sh, x, y, w, h); }
function disc(x, y, r, color, sx = 1, sy = 1, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r), 0, 7); ctx.fill(); ctx.restore(); }
// protagonist with squash & stretch: sq > 0 = squashed (landing), sq < 0 = stretched (falling)
function hero(x, y, r, { sq = 0, rot = 0, color = '#FCB901' } = {}) { disc(x, y, r, color, 1 + sq, 1 - sq, rot); }
function starPath(g, x, y, r, rot = 0) { g.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, rad = i % 2 ? r * .46 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath(); }
function cardShadow(x, y, w, h, r, a = .2, blur = 60) { ctx.save(); ctx.shadowColor = `rgba(20,25,35,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = blur * .4; ctx.fillStyle = '#fff'; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore(); }
function photoCard(img, cx, cy, w, h, r = 44, o = {}) { const x = cx - w / 2, y = cy - h / 2; if (o.shadow !== 0) cardShadow(x, y, w, h, r, o.shadow ?? .2); ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); if (img) cover(ctx, img, x, y, w, h, o.zoom || 1, o.fx ?? .5, o.fy ?? .5); else { ctx.fillStyle = o.fill || '#ddd'; ctx.fillRect(x, y, w, h); } ctx.restore(); }
// confetti burst of dots; p = 0..1 progress
function burst(cx, cy, p, n = 14, R = 520, seed = 1, cols = ['#FB7ACB', '#3B7AFA', '#FCB901', '#DC644A', '#388D56'], s0 = 18) {
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + hash(seed + i) * .5, d = eox(p) * R * (.5 + hash(seed + i * 3) * .6), r = s0 * (1 - ein(p)) * (.6 + hash(i + seed) * .8); disc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, cols[i % cols.length]); }
}
// 3D carousel ring: returns items sorted back→front with screen x, scale, facing; step = rotation in item units
function ring3d(n, step, { cx = W / 2, R = 560, f = 1500 } = {}) {
  return Array.from({ length: n }, (_, i) => { const a = (i - step) / n * 6.283, z = Math.cos(a), depth = f / (f + R * (1 - z)); return { i, a, z, depth, x: cx + Math.sin(a) * R * depth, facing: Math.max(.18, Math.abs(z) * .85 + .15) }; }).sort((p, q) => p.z - q.z);
}

// ---------- doodle layer (hand-drawn lines boil on twos) ----------
const jit = (s0, a) => (hash(s0 * 13.37 + BOIL * 91.7) - .5) * 2 * a;
function smoothPath(pts, close) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]); if (close) ctx.closePath(); }
function partial(pts, prog) { if (prog >= 1) return pts; if (prog <= 0) return []; const n = (pts.length - 1) * prog, k = Math.floor(n), f = n - k, out = pts.slice(0, k + 1); if (k + 1 < pts.length) { const a = pts[k], b = pts[k + 1]; out.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]); } return out; }
// draw-on (trim path) with boil: prog 0..1
function doodle(pts, { color = '#4E8A6E', w = 9, prog = 1, amp = 2.2, seed = 1, close = false, alpha = 1 } = {}) {
  const p = partial(pts.map((q, i) => [q[0] + jit(seed + i * 1.3, amp), q[1] + jit(seed + i * 2.1 + 40, amp)]), prog); if (p.length < 2) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; smoothPath(p, close && prog >= 1); ctx.stroke(); ctx.restore();
}
const ellP = (cx, cy, rx, ry, n = 40, a0 = 0, turn = 1) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + i / n * 6.283 * turn; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const starP = (cx, cy, r) => Array.from({ length: 11 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * .45 : r; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
const heartP = (cx, cy, s) => Array.from({ length: 41 }, (_, i) => { const a = i / 40 * 6.283; return [cx + s * Math.pow(Math.sin(a), 3), cy - s * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]; });
function sparkle(x, y, r, p, color = '#4E8A6E', seed = 1) { if (p <= 0 || p >= 1) return; const s = Math.sin(p * Math.PI); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .3; doodle([[x + Math.cos(a) * r * .35, y + Math.sin(a) * r * .35], [x + Math.cos(a) * r * (.35 + .65 * s), y + Math.sin(a) * r * (.35 + .65 * s)]], { color, w: 7, seed: seed + k, amp: 1 }); } }

// ---------- text ----------
// handwriting families (declare @font-face in film.html): HandEN (Patrick Hand: EN+VI), HandZH (ZCOOL KuaiLe), HandJA (Yomogi), HandKO (Gaegu Bold)
const HAND = { en: 'HandEN', vi: 'HandEN', zh: 'HandZH', ja: 'HandJA', ko: 'HandKO' };
const HF = (s, lang = LANG) => `${lang === 'ko' ? 700 : 400} ${s * (lang === 'en' || lang === 'vi' ? 1.12 : 1)}px ${HAND[lang] || 'HandEN'}, "PingFang SC", sans-serif`;
const SANS = (w, s) => `${w} ${s}px "SF Pro Display", system-ui, "PingFang SC", "Hiragino Sans", "Apple SD Gothic Neo", sans-serif`;
const MONO = s => `600 ${s}px "SF Mono", Menlo, monospace`;
// mask-up reveal (clean sans); tout = optional exit time
function lineIn(text, x, y, font, color, tin, tout, { align = 'left', size = 60, spacing = '0px' } = {}) {
  const p = seg(T, tin, tin + .5), q = tout ? seg(T, tout, tout + .25) : 0; if (p <= 0 || q >= 1) return;
  ctx.save(); ctx.font = font; ctx.textAlign = align; ctx.letterSpacing = spacing; ctx.fillStyle = color;
  ctx.beginPath(); ctx.rect(0, y - size * 1.2, W, size * 1.6); ctx.clip(); ctx.fillText(text, x, y + (1 - eox(p)) * size * 1.2 - eox(q) * size * 1.2); ctx.restore();
}
// written on left→right; a pen dot rides the ink edge. Returns text width. out = 0..1 exit.
function penText(text, x, y, size, color, t0, dur, { align = 'center', pen = '#FCB901', tilt = -.03, alpha = 1, font = null, out = 0 } = {}) {
  const p = eio(seg(T, t0, t0 + dur)); if (p <= 0 || out >= 1) return 0;
  ctx.save(); ctx.font = font || HF(size); const w = ctx.measureText(text).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.translate(x0, y); ctx.rotate(tilt + jit(7, .006));
  ctx.beginPath(); ctx.rect(-30, -size * 1.4, (w + 60) * p, size * 2); ctx.clip();
  ctx.globalAlpha *= alpha * (1 - out); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, jit(3, 1.2), jit(4, 1.2) - out * 40);
  ctx.restore();
  if (p > 0 && p < 1 && pen) hero(x0 + w * p, y - size * .38 + Math.sin(T * 40) * size * .12, Math.max(9, size * .11), { color: pen });
  return w;
}

// ---------- fx ----------
// metaballs: low-res field → smooth upscale. balls = [{x, y, r}] in canvas px
const MB = mk(Math.round(W / 4), Math.round(H / 4)), MBX = MB.getContext('2d'), MBD = MBX.createImageData(MB.width, MB.height);
function metaballs(balls, color) {
  const d = MBD.data, k = 4, v = parseInt(color.slice(1), 16), R = v >> 16, G = (v >> 8) & 255, B = v & 255;
  for (let y = 0; y < MB.height; y++) for (let x = 0; x < MB.width; x++) {
    let f = 0; const px = x * k, py = y * k; for (const b of balls) { const dx = px - b.x, dy = py - b.y; f += b.r * b.r / (dx * dx + dy * dy + 1); }
    const i = (y * MB.width + x) * 4; d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = clamp((f - .9) * 6) * 255;
  }
  MBX.putImageData(MBD, 0, 0); ctx.drawImage(MB, 0, 0, W, H);
}
const lum = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
// halftone dots from luminance data d (w×h); curve maps lightness→radius factor
function halftone(g, d, w, h, sp, color, ang = 0, k = .64, curve = l => 1 - l, ox = 0, oy = 0) {
  g.fillStyle = color; const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(w, h) * .55;
  for (let v = -R, row = 0; v < R; v += sp * .866, row++) for (let u = -R + (row % 2 ? sp / 2 : 0); u < R; u += sp) {
    const x = w / 2 + u * ca - v * sa, y = h / 2 + u * sa + v * ca; if (x < -sp || y < -sp || x > w + sp || y > h + sp) continue;
    const i = (clamp(y | 0, 0, h - 1) * w + clamp(x | 0, 0, w - 1)) * 4, l = clamp(((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255 - .08) / .8), r = curve(l) * sp * k;
    if (r > .6) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 7); g.fill(); }
  }
}
function stripes(w, h, color, vertical = false, band = 22, gap = 18, paper = '#FBF8F2') { const c = mk(w, h), g = c.getContext('2d'); g.fillStyle = paper; g.fillRect(0, 0, w, h); g.fillStyle = color; if (vertical) for (let x = 0; x < w; x += band + gap) g.fillRect(x, 0, band, h); else for (let y = 0; y < h; y += band + gap) g.fillRect(0, y, w, band); return c; }
function tint(src, color) { const c = mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); return c; }
// sticker outline: dilate alpha by px in `color`, then the source on top
function outline(src, px, color = '#fff') { const c = mk(src.width, src.height), g = c.getContext('2d'); for (let a = 0; a < 24; a++) g.drawImage(src, Math.cos(a / 24 * 6.283) * px, Math.sin(a / 24 * 6.283) * px); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over'; g.drawImage(src, 0, 0); return c; }
// subject cut-out from an image + L8 mask PNG (from scripts/cutout.swift), at w×h
function cutoutFrom(img, maskImg, w = img.width, h = img.height) {
  const m = mk(w, h), mg = m.getContext('2d'); mg.drawImage(maskImg, 0, 0, w, h);
  const d = mg.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { d.data[i + 3] = d.data[i]; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; } mg.putImageData(d, 0, 0);
  const c = mk(w, h), g = c.getContext('2d'); cover(g, img, 0, 0, w, h); g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); return c;
}
// airy base: cream with three slow-drifting soft colour fields
function blush(t, base = '#F4F0E8', fields = [['#FB7ACB', .14, .17, .14], ['#62C0DA', .14, .89, .47], ['#FCB901', .12, .28, .86]]) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  fields.forEach(([c, a, fx, fy], k) => { const px = fx * W + Math.sin(t * .4 + k) * 110, py = fy * H + Math.cos(t * .3 + k) * 130, g = ctx.createRadialGradient(px, py, 0, px, py, W * .76), v = parseInt(c.slice(1), 16), rgb = `${v >> 16},${(v >> 8) & 255},${v & 255}`; g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); });
}
// seeded film grain overlay (deterministic across workers)
let NOISE = null;
function grain(t, amount = .06) {
  if (!NOISE) { NOISE = mk(W + 512, H + 512); const g = NOISE.getContext('2d'), d = g.createImageData(NOISE.width, NOISE.height), r = rand(7); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
  ctx.save(); ctx.globalAlpha = amount; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(NOISE, -((t * 431) % 256), -((t * 277) % 256)); ctx.restore();
}

// ---------- boot ----------
const loadImage = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = s; });
async function loadImages(map) { const out = {}; await Promise.all(Object.entries(map).map(async ([k, src]) => { out[k] = await loadImage(src); })); return out; }
const loadFonts = (fonts = [SANS(700, 40), MONO(30), '40px HandEN', '40px HandZH', '40px HandJA', '40px HandKO']) => Promise.all(fonts.map(f => document.fonts.load(f)));
// startFilm: awaits setup, exposes window.READY / render / DUR for tools/render-fast.js, wires the preview UI (play, scrub, ?t=)
function startFilm({ dur, setup = async () => {}, render }) {
  const frame = t => { T = t; BOIL = Math.floor(t * 12); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.letterSpacing = '0px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; render(t); };
  window.DUR = dur; window.render = frame;
  window.READY = (async () => { await loadFonts(); await setup(); frame(0); return true; })();
  if (/render/.test(location.search)) { document.body.classList.add('render'); return; }
  const au = document.getElementById('au'), sc = document.getElementById('scrub'), tl = document.getElementById('tl'), pb = document.getElementById('play');
  if (!sc) return; sc.max = dur; let playing = false;
  const loop = () => { if (!playing) return; const t = au && au.src ? au.currentTime : (performance.now() - t0) / 1000; if (t >= dur) { playing = false; pb.textContent = '▶ play'; } frame(Math.min(t, dur - .001)); sc.value = t; tl.textContent = t.toFixed(2) + 's'; requestAnimationFrame(loop); };
  let t0 = 0; pb.onclick = () => { playing = !playing; pb.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { const s = +sc.value >= dur - .05 ? 0 : +sc.value; t0 = performance.now() - s * 1000; if (au) { au.currentTime = s; au.play().catch(() => {}); } loop(); } else if (au) au.pause(); };
  sc.oninput = () => { frame(+sc.value); tl.textContent = (+sc.value).toFixed(2) + 's'; if (playing && au) au.currentTime = +sc.value; };
  window.READY.then(() => { const q = new URLSearchParams(location.search).get('t'); if (q) { sc.value = q; frame(+q); } });
}
