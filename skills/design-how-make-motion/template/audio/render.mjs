// Renders a video's soundtrack from its cues:
//   node --experimental-strip-types audio/render.mjs src/<name>
// writes public/<name>/music.wav, public/<name>/sfx/<cue name>.wav, and src/<name>/audio/{master.json,
// preview-mix.wav, kick-stem.wav, bass-stem.wav}.
//
// Synthesis runs in Remotion's own Chrome Headless Shell (ensureBrowser downloads it once), evaluating synth.js on a
// blank page. Leveling and the master run here on dsp.mjs: the effect levels squeezed toward an anchor, a glue
// compressor and a true-peak limiter over the whole mix, and their one gain curve applied back to the music and to each
// effect where it plays, so the files sum to the mastered mix.

import fs from 'node:fs';
import path from 'node:path';
import { ensureBrowser, openBrowser } from '@remotion/renderer';
import { dbToLin, linToDb, writeWav24, samplePeak, limiterGain, compressorGain, loudness, fadeEdges, fadeOut, dcBlock, scale, loadVideo } from './dsp.mjs';

const started = Date.now();
const V = await loadVideo(process.argv[2]);
const { G, spf, sfx: CUES } = V;
fs.mkdirSync(path.join(V.pub, 'sfx'), { recursive: true });
fs.mkdirSync(V.audioDir, { recursive: true });

const TARGET_LUFS = -14;
// The file's ceiling in dBTP, 0.1 under the -2.8 the check holds: AAC in the MP4 overshoots the PCM peak by up to
// 1.3 dB, so the WAVs stop well short of -1.
const CEILING = -2.9;
const GLUE = { threshold: -11, ratio: 1.6, knee: 8, attack: 0.015, release: 0.2 };
// Effect levels are peaks in dB; squeezing them toward -18 keeps a quiet tick audible and a loud chime from jumping.
const LEVEL_RATIO = 0.45, ANCHOR = -18;
const squeeze = (db) => ANCHOR + (db - ANCHOR) * LEVEL_RATIO;
// The bed's sample peak before the master.
const BED_PEAK = V.music.peak ?? -20;

const decode = (b64) => {
  const b = Buffer.from(b64, 'base64');
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};

// ---------- the browser ----------

await ensureBrowser({ logLevel: 'error' });
const browser = await openBrowser('chrome', { logLevel: 'error' });
let page, gain = 1, bed;
const sfx = {};
try {
  page = await browser.newPage({
    context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onLog: () => {},
    onBrowserLog: (l) => { if (l.type === 'error' || l.type === 'warning') console.error('[page]', l.text); },
  });
  // A blank page; the synth goes in as one evaluated script, and each render returns base64 Float32 per channel.
  await page.evaluate(fs.readFileSync(path.join(import.meta.dirname, 'synth.js'), 'utf8'));
  const render = (opts) => page.evaluate((o) => window.LaunchSynth.music(o), opts);

  // ---------- music: render, then set the bed's peak ----------

  let music;
  for (let pass = 0; pass < 4; pass++) {
    const [l, r] = await render({ ...V.music, gain, kicks: V.kicks });
    music = [decode(l), decode(r)];
    const off = BED_PEAK - linToDb(samplePeak(music));
    console.log(`music pass ${pass}: bed peak off by ${off.toFixed(2)} dB`);
    if (Math.abs(off) < 0.25) break;
    gain *= dbToLin(off);
  }
  if (music[0].length !== G.frames * spf) throw new Error(`music is ${music[0].length} samples, want ${G.frames * spf}`);
  // The kicks alone, for check.mjs's grid measurement: in the full mix the bell and rim on some kicks leak into the
  // low band and read their onsets early.
  {
    const [l, r] = await render({ ...V.music, gain, kicks: V.kicks, only: 'kick' });
    writeWav24(path.join(V.audioDir, 'kick-stem.wav'), [decode(l), decode(r)]);
  }
  // The bass alone, with its ducking, for check.mjs's duck measurement: in the mix the kick it ducks under masks it.
  {
    const [l, r] = await render({ ...V.music, gain, kicks: V.kicks, only: 'bass' });
    writeWav24(path.join(V.audioDir, 'bass-stem.wav'), [decode(l), decode(r)]);
  }
  dcBlock(music);

  // ---------- effects: render, cut to length, fade, set the peak ----------

  for (const cue of CUES) {
    const res = await page.evaluate((o) => window.LaunchSynth.sfx(o.sound, o), { sound: cue.sound, key: V.key, fps: G.fps });
    const n = cue.len * spf;
    const ch = res.data.map((d) => decode(d).slice(0, n));
    dcBlock(ch, 20);
    fadeOut(ch, Math.min(30, (cue.len / G.fps) * 1000 * 0.25));
    fadeEdges(ch, 2, 3);
    scale(ch, dbToLin(squeeze(cue.level)) / samplePeak(ch));
    sfx[cue.name] = ch;
  }
  bed = music;
} finally {
  await browser.close({ silent: true });
}

// ---------- master: one chain over the whole mix, split back into the files ----------

const N = G.frames * spf;
function mixdown(musicCh, sfxMap) {
  const out = musicCh.map((x) => new Float32Array(x));
  for (const cue of CUES) {
    const s = sfxMap[cue.name];
    for (const at of cue.at) for (let c = 0; c < 2; c++) for (let i = 0; i < s[c].length && at * spf + i < N; i++) out[c][at * spf + i] += s[c][i];
  }
  return out;
}
const copy = (chs) => chs.map((x) => new Float32Array(x));
const applyGain = (chs, gain, start = 0) => chs.map((x) => x.map((v, i) => v * gain[Math.min(gain.length - 1, Math.max(0, start + i))]));

const raw = mixdown(bed, sfx);
let offset = TARGET_LUFS - loudness(raw).integrated;
let Gc, stats;
for (let pass = 0; pass < 6; pass++) {
  const x = copy(raw);
  scale(x, dbToLin(offset));
  const gc = compressorGain(x, GLUE);
  const gl = limiterGain(applyGain(x, gc), CEILING, { lookahead: 96, release: 0.04 });
  Gc = gc.map((v, i) => v * gl[i] * dbToLin(offset));
  const L = loudness(applyGain(raw, Gc)).integrated;
  stats = { comp: -linToDb(gc.reduce((a, b) => Math.min(a, b), 1)), lim: -linToDb(gl.reduce((a, b) => Math.min(a, b), 1)), L };
  console.log(`master pass ${pass}: offset ${offset.toFixed(2)} dB, glue up to ${stats.comp.toFixed(2)} dB, limiter up to ${stats.lim.toFixed(2)} dB, mix ${L.toFixed(2)} LUFS`);
  if (process.env.GR_LOG) {
    // Where the dynamics work hardest, in beat-long windows: the place to lower an effect or the bed.
    const hard = [];
    for (let f = 0; f < G.frames; f += G.beat) {
      let c = 1, l = 1;
      for (let i = f * spf; i < Math.min(N, (f + G.beat) * spf); i++) { c = Math.min(c, gc[i]); l = Math.min(l, gl[i]); }
      if (c < 0.71 || l < 0.71) hard.push(`${f}: glue ${(-linToDb(c)).toFixed(1)} limiter ${(-linToDb(l)).toFixed(1)}`);
    }
    console.log(`  over 3 dB of gain reduction at frame ${hard.join(', ') || 'none'}`);
  }
  if (Math.abs(L - TARGET_LUFS) < 0.05) break;
  offset += TARGET_LUFS - L;
}

let masterMusic = applyGain(bed, Gc);
// The music on its own can peak over the mix where an effect cancelled it (the thump against the bass on the card).
masterMusic = applyGain(masterMusic, limiterGain(masterMusic, CEILING, { lookahead: 96, release: 0.04 }));
fadeEdges(masterMusic, 3, 3);
const masterSfx = {}, sfxGain = {};
for (const cue of CUES) {
  const len = sfx[cue.name][0].length;
  const gn = new Float32Array(len);
  // A repeated effect is one file: it takes the lowest master gain of its placements, sample by sample.
  for (let i = 0; i < len; i++) gn[i] = Math.min(...cue.at.map((at) => Gc[Math.min(Gc.length - 1, at * spf + i)]));
  sfxGain[cue.name] = gn;
  let m = applyGain(sfx[cue.name], gn);
  m = applyGain(m, limiterGain(m, CEILING, { lookahead: 48, release: 0.03 }));
  fadeEdges(m, 2, 3);
  masterSfx[cue.name] = m;
}

const sfxDir = path.join(V.pub, 'sfx');
writeWav24(path.join(V.pub, 'music.wav'), masterMusic);
for (const cue of CUES) writeWav24(path.join(sfxDir, `${cue.name}.wav`), masterSfx[cue.name]);
for (const f of fs.readdirSync(sfxDir)) if (f.endsWith('.wav') && !CUES.some((c) => `${c.name}.wav` === f)) fs.rmSync(path.join(sfxDir, f));
writeWav24(path.join(V.audioDir, 'preview-mix.wav'), mixdown(masterMusic, masterSfx));
fs.writeFileSync(path.join(V.audioDir, 'master.json'), JSON.stringify({
  lufs: +stats.L.toFixed(2), ceilingDbtp: CEILING, offsetDb: +offset.toFixed(2), levelRatio: LEVEL_RATIO, anchor: ANCHOR,
  glueMaxDb: +stats.comp.toFixed(2), limiterMaxDb: +stats.lim.toFixed(2), bedGainDb: +linToDb(gain).toFixed(2),
  grid: { fps: G.fps, bpm: G.bpm, beat: G.beat, drop: G.drop, gate: G.gate, end: G.end, frames: G.frames, key: V.key },
  kicks: V.kicks,
  sfxDynamicsDb: Object.fromEntries(CUES.map((c) => [c.name, +(linToDb(sfxGain[c.name][0]) - offset).toFixed(2)])),
}, null, 2) + '\n');
console.log(`wrote public/${V.name}/music.wav, ${CUES.length} sfx, ${path.relative(process.cwd(), V.audioDir)}/{preview-mix,kick-stem,bass-stem}.wav, master.json in ${((Date.now() - started) / 1000).toFixed(1)} s`);
