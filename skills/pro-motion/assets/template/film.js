// film.js — starter film. Replace the scenes, keep the structure:
//   1. MUSIC: hit times from tools/analyze_music.py (onsets, grid0, bpm)
//   2. STR:   per-language key lines (?lang=en|zh|ja|ko|vi); decorative multilingual text stays in all cuts
//   3. SCENES: [start, fn] — each fn(t) draws a full frame; transitions live inside scenes (overlap two fns if needed)
//   4. render(t) must be pure: no Math.random, no state carried between frames
// This demo needs no photos: protagonist dot → three colour slams → doodle ring → 3D card ring → pen-written line → convergence → logo.

const DUR = 8.0;
const MUSIC = { bpm: 120, grid0: -0.02, stabs: [0.37, 0.75, 1.25], drop: 3.98, hits: [4.86, 5.49, 5.98, 6.48] };
const beat = beatGrid(MUSIC.bpm, MUSIC.grid0);
const C = { ink: '#0C0C0C', cream: '#F4F0E8', sun: '#FCB901', pink: '#FB7ACB', blue: '#3B7AFA', green: '#388D56', doodle: '#4E8A6E' };
const STR = {
  en: { tag: 'Play your photos.' }, zh: { tag: '一起玩照片。' }, ja: { tag: '写真で遊ぼう。' }, ko: { tag: '사진으로 놀자.' }, vi: { tag: 'Cùng chơi ảnh nào.' },
}[LANG];

// ---------- scene 1 · 0 → 1.55: the protagonist drops, then three colour slams on the stabs ----------
const SLAMS = [
  { t: MUSIC.stabs[0], color: C.pink, word: '玩', lang: 'zh', ink: C.ink, kind: 'circle' },
  { t: MUSIC.stabs[1], color: C.blue, word: '遊ぼ', lang: 'ja', ink: C.cream, kind: 'diag' },
  { t: MUSIC.stabs[2], color: C.sun, word: '놀자', lang: 'ko', ink: C.ink, kind: 'rise' },
];
function sOpen(t) {
  blush(t);
  if (t < SLAMS[0].t) { const p = seg(t, 0, .27), land = seg(t, .27, .37); hero(540, lerp(-80, 980, p * p), 30, { sq: land > 0 ? Math.sin(land * Math.PI) * .35 : -p * .25 }); return; }
  let k = 0; SLAMS.forEach((s, i) => { if (t >= s.t) k = i; });
  const s = SLAMS[k], p = seg(t, s.t, s.t + .2);
  if (k > 0) { ctx.fillStyle = SLAMS[k - 1].color; ctx.fillRect(0, 0, W, H); }
  ctx.save(); ctx.beginPath();
  if (s.kind === 'circle') ctx.arc(540, 980, 30 + eox(p) * 2300, 0, 7);
  else if (s.kind === 'diag') { const x = lerp(W + 800, -400, eox(p)); ctx.moveTo(x, 0); ctx.lineTo(x + 1900, 0); ctx.lineTo(x + 1500, H); ctx.lineTo(x - 400, H); ctx.closePath(); }
  else { const y = lerp(H, -200, eox(p)); ctx.moveTo(0, y); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y + Math.sin(x / 90 + t * 20) * 40 * (1 - p)); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); }
  ctx.clip(); ctx.fillStyle = s.color; ctx.fillRect(0, 0, W, H);
  ctx.font = HF(s.lang === 'zh' ? 640 : 380, s.lang); ctx.textBaseline = 'middle'; const chars = [...s.word], ws = chars.map(c => ctx.measureText(c).width); let x = 540 - ws.reduce((a, b) => a + b, 0) / 2;
  chars.forEach((c, i) => { const q = seg(t, s.t + i * .04, s.t + i * .04 + .3); if (q > 0) { ctx.save(); ctx.translate(x + ws[i] / 2, 960 + (1 - eox(q)) * 140); const sc = lerp(1.5, 1, eback(q)); ctx.scale(sc, sc * lerp(.7, 1, eox(q))); ctx.fillStyle = s.ink; ctx.fillText(c, -ws[i] / 2, 0); ctx.restore(); } x += ws[i]; });
  ctx.restore();
  burst(540, 960, seg(t, s.t, s.t + .55), 16, 640, k + 2, [C.cream, C.ink, C.pink, C.blue, C.sun].filter(c => c !== s.color), 20);
  if (t >= 1.32) { // the world shrinks back into the dot (moveTo before arc: no evenodd seam)
    const r = lerp(2300, 34, exio(seg(t, 1.32, 1.55)));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(540 + r, 960); ctx.arc(540, 960, r, 0, 6.2832, true); ctx.closePath(); ctx.clip('evenodd'); blush(t); ctx.restore();
    doodle(ellP(540, 960, 92, 84, 46, -1.6, 1.15).map((q, i) => [q[0] + i * .4, q[1]]), { prog: eox(seg(t, 1.4, 1.55)), seed: 3, w: 10, color: C.doodle });
  }
}

// ---------- scene 2 · 1.55 → 6.9: a ring of cards steps on the beat; the line is written by the dot ----------
const CARD_COLS = [C.pink, C.blue, C.sun, C.green, '#DC644A', '#62C0DA', '#B9A6F0'];
function sRing(t) {
  blush(t);
  const open = eox(seg(t, 1.55, 2.0));
  let step = 0; MUSIC.hits.forEach(b => { step += spring(seg(t, b, b + .55), 7, 11); });
  disc(540, 960, lerp(0, 620, open), [C.pink, C.blue, C.sun, C.green][Math.min(3, Math.floor(step + .5))]);
  for (const it of ring3d(CARD_COLS.length, step, { R: 560 * open })) {
    if (it.z < -.3) continue;
    const w = 520 * it.depth * it.facing, h = 520 * it.depth * 4 / 3;
    ctx.save(); ctx.globalAlpha = clamp(.35 + it.z * .65);
    photoCard(null, it.x, 960, w, h, 36, { fill: CARD_COLS[it.i], shadow: .15 });
    ctx.restore();
  }
  hero(540 + Math.cos(t * 4) * 340, 960 + Math.sin(t * 4) * 120, 20);
  penText(STR.tag, 540, 1660, 96, C.ink, 2.2, .6);
  if (t > 2.3) doodle(ellP(540, 1160, 620, 170, 60, -2.6 + t * .8, .7), { prog: eox(seg(t, 2.3, 2.8)), seed: 21, w: 9, color: C.doodle });
}

// ---------- scene 3 · 6.9 → 8: everything converges into the dot → logo ----------
function sEnd(t) {
  blush(t);
  const p = ein(seg(t, 6.9, 7.2)), balls = [{ x: 540, y: 960, r: lerp(10, 60, p) }];
  for (let i = 0; i < 10; i++) { const a = i * .63 + t * 3, d = lerp(700, 0, p); if (d > 0) balls.push({ x: 540 + Math.cos(a) * d, y: 960 + Math.sin(a) * d, r: 26 }); }
  if (t < 7.25) { metaballs(balls, C.sun); return; }
  // hand-lettered wordmark drawn on, the dot lands as the full stop
  const strokes = [[[0, -200], [130, -210]], [[66, -205], [60, 0]], [[170, -130], [168, -30], [190, 2], [230, 0], [252, -130]], [[252, -130], [256, 0]]];
  strokes.forEach((st, i) => doodle(st.map(([x, y]) => [380 + x, 1000 + y]), { prog: eox(seg(t, 7.25 + i * .06, 7.45 + i * .06)), color: C.ink, w: 24, seed: 50 + i }));
  const land = seg(t, 7.55, 7.8); hero(lerp(540, 680, eio(land)), lerp(960, 985, eio(land)) - Math.sin(land * Math.PI) * 200, 22);
}

const SCENES = [[0, sOpen], [1.55, sRing], [6.9, sEnd]];
function render(t) {
  let fn = SCENES[0][1]; for (const [s, f] of SCENES) if (t >= s) fn = f;
  fn(t); grain(t);
}
startFilm({ dur: DUR, render, setup: async () => { /* load photos / masks here: const IMG = await loadImages({ hero: 'assets/photos/hero.jpg' }) */ } });
