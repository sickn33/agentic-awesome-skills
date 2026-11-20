// Numeric checks on a rendered soundtrack. Nobody in the loop can listen, so each check is a measurement, and each one
// was a real bug in a shipped track. Exits 1 on any failure.
//
//   node --experimental-strip-types audio/check.mjs src/<name> [--mp4 out/master.mp4]

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SR, readWav, linToDb, truePeak, loudness, bandEnergyDb, loadVideo, ROOT } from './dsp.mjs';

const V = await loadVideo(process.argv[2]);
const { G, spf } = V;
const rows = [];
const row = (check, value, pass, want) => rows.push({ check, value, want, pass });
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : String(x));
const exists = (f) => fs.existsSync(f) || (row(`file ${path.relative(ROOT, f)}`, 'missing', false, 'run audio/render.mjs'), false);

// ---------- the master ----------

const musicFile = path.join(V.pub, 'music.wav'), mixFile = path.join(V.audioDir, 'preview-mix.wav');
const stemFile = path.join(V.audioDir, 'kick-stem.wav'), bassFile = path.join(V.audioDir, 'bass-stem.wav'), masterFile = path.join(V.audioDir, 'master.json');
if (exists(mixFile)) {
  const mix = readWav(mixFile).chans;
  const L = loudness(mix).integrated;
  row('loudness, preview mix', `${L.toFixed(2)} LUFS`, Math.abs(L + 14) <= 0.5, '-14.0 ± 0.5');
  if (mix[0].length !== G.frames * spf) row('length, preview mix', `${mix[0].length} samples`, false, `${G.frames * spf}`);
  // An FM sideband at 0 Hz once sat under everything here.
  const low = bandEnergyDb(mix, 0, 30);
  row('energy under 30 Hz', `${f1(low)} dBFS`, low < -40, '< -40 dBFS');
  // Without highs the beat vanishes on a phone speaker.
  const high = bandEnergyDb(mix, 5000, SR / 2 + 1);
  row('energy over 5 kHz', `${f1(high)} dBFS`, high > -45, '> -45 dBFS');
}
// The AAC in the MP4 overshoots the PCM peak by up to 1.3 dB, so every file stops at -2.8 dBTP.
const peakRow = (label, file) => {
  if (!exists(file)) return;
  const w = readWav(file);
  const tp = linToDb(truePeak(w.chans));
  row(`true peak, ${label}`, `${f1(tp)} dBTP`, tp <= -2.8, '<= -2.8');
  // A non-zero first or last sample is a click where the file starts or stops.
  const n = w.chans[0].length;
  const edge = Math.max(...w.chans.map((x) => Math.max(Math.abs(x[0]), Math.abs(x[n - 1]))));
  if (edge > 1e-4) row(`edges, ${label}`, edge.toExponential(1), false, '< 1e-4');
};
peakRow('music.wav', musicFile);
peakRow('preview-mix.wav', mixFile);
for (const cue of V.sfx) peakRow(`sfx/${cue.name}.wav`, path.join(V.pub, 'sfx', `${cue.name}.wav`));

if (exists(masterFile)) {
  const m = JSON.parse(fs.readFileSync(masterFile, 'utf8'));
  // Over 4 dB on the kicks is pumping.
  row('limiter gain reduction', `${m.limiterMaxDb.toFixed(2)} dB`, m.limiterMaxDb < 4, '< 4 dB');
  row('glue gain reduction (info)', `${m.glueMaxDb.toFixed(2)} dB`, true, 'recorded');
}

// ---------- the beat ----------

if (exists(stemFile)) {
  const ks = readWav(stemFile).chans;
  const n = ks[0].length;
  // The onset in a zero-phase 140 Hz low band, at each grid kick: the sample where the next 5 ms most outweigh the last 5.
  let low = new Float32Array(n);
  for (let i = 0; i < n; i++) low[i] = (ks[0][i] + ks[1][i]) / 2;
  const w = (2 * Math.PI * 140) / SR, al = Math.sin(w) / (2 * Math.SQRT1_2), cw = Math.cos(w), a0 = 1 + al;
  const b = [(1 - cw) / 2 / a0, (1 - cw) / a0, (1 - cw) / 2 / a0], aa = [1, (-2 * cw) / a0, (1 - al) / a0];
  const run = (x) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - aa[1] * y1 - aa[2] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  low = run(run(low).reverse()).reverse();
  const ms = (x) => Math.round((x / 1000) * SR);
  const E = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) E[i + 1] = E[i] + low[i] * low[i];
  const W = ms(5);
  const offs = V.kicks.map((v) => {
    const k = Math.round(v * spf);
    let best = k, bestR = 0;
    for (let i = Math.max(W, k - ms(15)); i <= Math.min(n - W, k + ms(15)); i++) {
      const r = (E[i + W] - E[i]) / (E[i] - E[i - W] + 1e-7 * W);
      if (r > bestR) { bestR = r; best = i; }
    }
    return ((best - k) / SR) * 1000;
  });
  const worst = Math.max(0, ...offs.map(Math.abs));
  row(`kick onsets (${V.kicks.length}) vs grid`, `${f1(Math.min(...offs))} to ${f1(Math.max(...offs))} ms`, V.kicks.length > 0 && worst <= 4, 'within 4 ms');
  // The story has no kick, and after the drop the kick is there every felt bar until the gate.
  const rms = (a, z) => { let e = 0, k = 0; for (const x of ks) for (let i = Math.max(0, a); i < Math.min(z, n); i++) { e += x[i] * x[i]; k++; } return 10 * Math.log10(e / Math.max(1, k) + 1e-20); };
  if (G.drop > 0) {
    const story = rms(0, G.drop * spf);
    row('kick stem before the drop', `${f1(story)} dBFS`, story < -90, '< -90 dBFS (silent)');
  }
  const bars = [];
  for (let fb = G.drop; fb + G.beat <= G.gate; fb += G.felt) bars.push(rms(Math.round(fb * spf), Math.round(Math.min(fb + G.felt, G.gate) * spf)));
  // A felt bar with no kick reads near silence; one with its kicks sits within a few dB of the others.
  const lo = Math.min(...bars), hi = Math.max(...bars);
  row('kick stem per felt bar from the drop', `${f1(lo)} to ${f1(hi)} dBFS (${bars.length} bars)`, bars.length > 0 && lo > -60 && hi - lo < 6, '> -60 dBFS, spread < 6 dB');
}

// ---------- the bass under the kick ----------

// A bass held through a kick cancels it, and in the mix the kick masks whether the bass gave way, so this measures the
// bass alone: the 30 ms from each kick must sit at least 6 dB under the same 30 ms window 120 ms later, once the duck
// has let go. A kick whose later window is past the gate, or has no bass in it (the note ended), has nothing to compare.
if (exists(bassFile)) {
  const bs = readWav(bassFile).chans;
  const n = bs[0].length;
  const ms = (x) => Math.round((x / 1000) * SR);
  const rmsDb = (a, z) => { let e = 0, k = 0; for (const x of bs) for (let i = Math.max(0, a); i < Math.min(z, n); i++) { e += x[i] * x[i]; k++; } return 10 * Math.log10(e / Math.max(1, k) + 1e-20); };
  const gateAt = Math.round(G.gate * spf);
  const ducks = [];
  let skipped = 0;
  for (const v of V.kicks) {
    const k = Math.round(v * spf);
    if (k + ms(150) > gateAt) { skipped++; continue; }
    const later = rmsDb(k + ms(120), k + ms(150));
    if (later < -70) { skipped++; continue; }
    ducks.push(rmsDb(k, k + ms(30)) - later);
  }
  const worst = ducks.length ? Math.max(...ducks) : NaN;
  row(`bass ducked at each kick (${ducks.length} of ${V.kicks.length})`, ducks.length ? `${f1(worst)} dB at worst, ${f1(Math.min(...ducks))} at best` : 'no kick over a bass', ducks.length > 0 && worst <= -6, '<= -6 dB vs 120 ms later');
  if (skipped) row('  kicks with no bass 120 ms later (info)', `${skipped}`, true, 'not compared');
}

// ---------- the chords ----------

// From the synth's own note lists, not the audio: what the bed plays, when, and over what.
{
  const all = V.synth.notes(V.music);
  const chord = all.filter((x) => x.part === 'keys' || x.part === 'bass');
  const tune = all.filter((x) => x.part === 'line' || x.part === 'echo');
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const nm = (m) => `${names[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
  const overlap = (a, b) => a.from < b.to && b.from < a.to;
  // A semitone (a minor 2nd) or a minor 9th between the tune and any chord tone sounding with it. A major 7th is the
  // maj9 chords' own colour, so 11 passes.
  const rubs = [];
  for (const t of tune) for (const c of chord) {
    const d = Math.abs(t.midi - c.midi);
    if ((d === 1 || d === 13) && overlap(t, c)) rubs.push(`${t.part} ${nm(t.midi)} over ${nm(c.midi)} at ${Math.round(t.from)}`);
  }
  row(`tune vs chord (${tune.length} notes)`, rubs.length ? `${rubs.length}: ${[...new Set(rubs)].slice(0, 3).join('; ')}` : 'no semitone or minor 9th', rubs.length === 0, 'none');
  // Two chord tones less than a whole tone apart, both under 200 Hz, is mud.
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const low = chord.filter((c) => hz(c.midi) < 200);
  const mud = [];
  let pairs = 0;
  for (let i = 0; i < low.length; i++) for (let j = i + 1; j < low.length; j++) {
    if (!overlap(low[i], low[j])) continue;
    const d = Math.abs(low[i].midi - low[j].midi);
    if (d === 0) continue;
    pairs++;
    if (d < 2) mud.push(`${nm(low[i].midi)}/${nm(low[j].midi)} at ${Math.round(Math.max(low[i].from, low[j].from))}`);
  }
  row(`chord tones under 200 Hz (${pairs} pairs)`, mud.length ? `${mud.length}: ${[...new Set(mud)].slice(0, 3).join('; ')}` : 'none closer than a whole tone', mud.length === 0, '>= 2 semitones');
}

// ---------- effects in key ----------

{
  const sc = V.synth.scale(V.key);
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  // The whole palette, so a sound added for the next video is in key too, not only the ones cued here.
  const out = [];
  for (const s of Object.keys(V.synth.PALETTE)) for (const m of V.synth.pitches(s, V.key)) if (!sc.includes(((m % 12) + 12) % 12)) out.push(`${s} ${names[m % 12]}`);
  row(`effect pitches in ${V.key}`, out.length ? out.join(', ') : `${Object.keys(V.synth.PALETTE).length} sounds in key`, out.length === 0, 'all in the scale');
}

// ---------- the MP4 ----------

/** ffmpeg's EBU R128 summary: integrated loudness and true peak. Remotion's own ffmpeg first, then one on PATH. */
function ebur128(file) {
  const bins = [];
  const rem = path.join(ROOT, 'node_modules/@remotion');
  if (fs.existsSync(rem)) for (const d of fs.readdirSync(rem)) if (d.startsWith('compositor-')) bins.push(path.join(rem, d, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'));
  bins.push('ffmpeg');
  for (const bin of bins) {
    if (bin !== 'ffmpeg' && !fs.existsSync(bin)) continue;
    // ffmpeg prints the summary on stderr.
    const r = spawnSync(bin, ['-hide_banner', '-nostats', '-i', file, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], {
      env: { ...process.env, DYLD_LIBRARY_PATH: path.dirname(bin), LD_LIBRARY_PATH: path.dirname(bin) }, encoding: 'utf8',
    });
    if (r.stderr?.includes('Summary:')) return parse(r.stderr);
  }
  return null;
  function parse(r) {
    const sum = r.slice(r.lastIndexOf('Summary:'));
    return { I: +sum.match(/I:\s+(-?[\d.]+) LUFS/)[1], peak: +sum.match(/Peak:\s+(-?[\d.]+) dBFS/)[1] };
  }
}
const mp4At = process.argv.indexOf('--mp4');
if (mp4At >= 0) {
  const mp4 = path.resolve(process.argv[mp4At + 1] ?? '');
  const r = fs.existsSync(mp4) ? ebur128(mp4) : null;
  if (!r) row('MP4', `could not measure ${mp4}`, false, 'ffmpeg ebur128');
  else {
    row('loudness, MP4', `${r.I.toFixed(1)} LUFS`, Math.abs(r.I + 14) <= 0.5, '-14.0 ± 0.5');
    row('true peak, MP4', `${f1(r.peak)} dBTP`, r.peak <= -1, '<= -1');
  }
}

// ---------- the table ----------

const w0 = Math.max(...rows.map((r) => r.check.length)), w1 = Math.max(...rows.map((r) => String(r.value).length));
console.log(`${V.name}: ${G.frames} frames at ${G.fps} fps, ${G.bpm} BPM (${G.beat} frames a beat), ${V.key}, drop ${G.drop}, gate ${G.gate}, end ${G.end}\n`);
for (const r of rows) console.log(`${r.pass ? 'ok  ' : 'FAIL'}  ${r.check.padEnd(w0)}  ${String(r.value).padEnd(w1)}  ${r.want}`);
const failed = rows.filter((r) => !r.pass).length;
console.log(failed ? `\n${failed} check${failed > 1 ? 's' : ''} failed` : '\nall checks pass');
process.exitCode = failed ? 1 : 0;
