// Node-side DSP for the soundtrack: WAV I/O, true peak, a lookahead true-peak limiter, a glue compressor, BS.1770
// loudness, band energy, fades. Arrays are Float32Array per channel. At the end, loadVideo(): the video folder's cues,
// read the same way by render.mjs and check.mjs. No dependency outside node.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SR = 48000;
export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (x) => 20 * Math.log10(Math.max(x, 1e-12));

// ---------- WAV ----------

export function writeWav24(path, chans) {
  const n = chans[0].length;
  const nc = chans.length;
  const bytes = n * nc * 3;
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * nc * 3, 28);
  buf.writeUInt16LE(nc * 3, 32);
  buf.writeUInt16LE(24, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(bytes, 40);
  // TPDF dither at 24 bit, seeded so renders are repeatable
  let s = 12345;
  const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nc; c++) {
      let v = chans[c][i] * 8388607 + (rnd() - rnd());
      v = Math.max(-8388608, Math.min(8388607, Math.round(v)));
      buf.writeIntLE(v, o, 3);
      o += 3;
    }
  }
  fs.writeFileSync(path, buf);
}

export function readWav(path) {
  const b = fs.readFileSync(path);
  let p = 12, fmt, data;
  while (p < b.length) {
    const id = b.toString('ascii', p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { nc: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22), fmt: b.readUInt16LE(p + 8) };
    if (id === 'data') data = [p + 8, size];
    p += 8 + size + (size & 1);
  }
  const bps = fmt.bits / 8;
  const n = data[1] / (bps * fmt.nc);
  const chans = Array.from({ length: fmt.nc }, () => new Float32Array(n));
  let o = data[0];
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < fmt.nc; c++) {
      if (fmt.bits === 24) chans[c][i] = b.readIntLE(o, 3) / 8388608;
      else if (fmt.bits === 16) chans[c][i] = b.readInt16LE(o) / 32768;
      else if (fmt.bits === 32 && fmt.fmt === 3) chans[c][i] = b.readFloatLE(o);
      o += bps;
    }
  }
  return { sr: fmt.sr, bits: fmt.bits, chans };
}

// ---------- true peak (4x oversampled, windowed sinc) ----------

const OS = 4;
const ZC = 16; // zero crossings each side
const H = (() => {
  const len = 2 * ZC * OS + 1;
  const h = new Float64Array(len);
  const c = ZC * OS;
  for (let n = 0; n < len; n++) {
    const x = (n - c) / OS;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.5 * (1 + Math.cos((Math.PI * (n - c)) / (c + 1))); // Hann
    h[n] = sinc * w;
  }
  return h;
})();

// Per-sample peak envelope: the largest |value| among the original sample and
// the three interpolated points after it, across channels.
export function truePeakEnvelope(chans) {
  const n = chans[0].length;
  const env = new Float32Array(n);
  const c = ZC * OS;
  for (const x of chans) {
    for (let i = 0; i < n; i++) {
      let m = Math.abs(x[i]);
      for (let p = 1; p < OS; p++) {
        // value at time i + p/OS
        let acc = 0;
        for (let k = -ZC + 1; k <= ZC; k++) {
          const j = i + k;
          if (j < 0 || j >= n) continue;
          const hn = c + (k * OS - p) * -1; // h index for offset (p/OS - k)
          if (hn >= 0 && hn < H.length) acc += x[j] * H[hn];
        }
        const a = Math.abs(acc);
        if (a > m) m = a;
      }
      if (m > env[i]) env[i] = m;
    }
  }
  return env;
}

export function truePeak(chans) {
  const e = truePeakEnvelope(chans);
  let m = 0;
  for (let i = 0; i < e.length; i++) if (e[i] > m) m = e[i];
  return m;
}

export function samplePeak(chans, a = 0, b = chans[0].length) {
  let m = 0;
  for (const x of chans) for (let i = Math.max(0, a); i < Math.min(b, x.length); i++) { const v = Math.abs(x[i]); if (v > m) m = v; }
  return m;
}

// ---------- limiter ----------

// Lookahead true-peak limiter, as a gain curve. The gain at each sample is
// never above what that sample needs; attack is a straight ramp over the
// lookahead, release is exponential. Zero latency: the curve leads the peaks.
export function limiterGain(chans, ceilingDb, { lookahead = 96, release = 0.08 } = {}) {
  const ceil = dbToLin(ceilingDb);
  const n = chans[0].length;
  const env = truePeakEnvelope(chans);
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) req[i] = env[i] > ceil ? ceil / env[i] : 1;
  const L = lookahead;
  // forward min over [i, i+L] (monotonic deque, scanning backwards)
  const gmin = new Float32Array(n);
  const dq = new Int32Array(n);
  let head = 0, tail = 0;
  for (let j = n - 1; j >= 0; j--) {
    while (tail > head && req[dq[tail - 1]] >= req[j]) tail--;
    dq[tail++] = j;
    while (dq[head] > j + L) head++;
    gmin[j] = req[dq[head]];
  }
  // moving average over [i-L, i], counting gain 1 before the start
  const gs = new Float32Array(n);
  let acc = L + 1;
  for (let i = 0; i < n; i++) {
    acc += gmin[i] - (i - L - 1 >= 0 ? gmin[i - L - 1] : 1);
    gs[i] = Math.min(1, acc / (L + 1));
  }
  const rc = 1 - Math.exp(-1 / (release * SR));
  const gain = new Float32Array(n);
  let gr = 1;
  for (let i = 0; i < n; i++) {
    gr = gr + (1 - gr) * rc;
    if (gs[i] < gr) gr = gs[i];
    gain[i] = gr;
  }
  return gain;
}

export function limit(chans, ceilingDb, opts) {
  const gain = limiterGain(chans, ceilingDb, opts);
  let minGain = 1;
  for (let i = 0; i < gain.length; i++) {
    for (const x of chans) x[i] *= gain[i];
    if (gain[i] < minGain) minGain = gain[i];
  }
  return { gainReductionDb: -linToDb(minGain) };
}

// Feed-forward glue compressor, stereo linked, as a gain curve.
// RMS detector (attack/release in seconds), soft knee, smoothed gain.
export function compressorGain(chans, { threshold = -24, ratio = 2, knee = 6, attack = 0.01, release = 0.15, gainAttack = 0.004, gainRelease = 0.12 } = {}) {
  const n = chans[0].length;
  const ca = Math.exp(-1 / (attack * SR)), cr = Math.exp(-1 / (release * SR));
  const ga = Math.exp(-1 / (gainAttack * SR)), gre = Math.exp(-1 / (gainRelease * SR));
  const gain = new Float32Array(n);
  let e = 0, gdb = 0;
  for (let i = 0; i < n; i++) {
    let p = 0;
    for (const x of chans) p += x[i] * x[i];
    p /= chans.length;
    e = p > e ? ca * e + (1 - ca) * p : cr * e + (1 - cr) * p;
    const lvl = 10 * Math.log10(e + 1e-12);
    const over = lvl - threshold;
    let red = 0;
    if (over > knee / 2) red = over * (1 - 1 / ratio);
    else if (over > -knee / 2) red = ((over + knee / 2) ** 2 / (2 * knee)) * (1 - 1 / ratio);
    const target = -red;
    gdb = target < gdb ? ga * gdb + (1 - ga) * target : gre * gdb + (1 - gre) * target;
    gain[i] = dbToLin(gdb);
  }
  return gain;
}

// ---------- loudness (ITU-R BS.1770-4) ----------

function biquadRun(x, b, a) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

export function loudness(chans) {
  const kw = chans.map((x) =>
    biquadRun(
      biquadRun(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]),
      [1, -2, 1], [1, -1.99004745483398, 0.99007225036621],
    ),
  );
  const block = Math.round(0.4 * SR), step = Math.round(0.1 * SR);
  const z = [];
  for (let s = 0; s + block <= kw[0].length; s += step) {
    let sum = 0;
    for (const y of kw) { let e = 0; for (let i = s; i < s + block; i++) e += y[i] * y[i]; sum += e / block; }
    z.push(sum);
  }
  const L = (p) => -0.691 + 10 * Math.log10(p);
  const abs = z.filter((p) => L(p) > -70);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const rel = L(mean(abs)) - 10;
  const gated = abs.filter((p) => L(p) > rel);
  const momentaryMax = Math.max(...z.map(L));
  return { integrated: L(mean(gated)), momentaryMax };
}

// ---------- utils ----------

export function fadeEdges(chans, inMs = 2, outMs = 4) {
  const n = chans[0].length;
  const fi = Math.round((inMs / 1000) * SR), fo = Math.round((outMs / 1000) * SR);
  for (const x of chans) {
    for (let i = 0; i < fi && i < n; i++) x[i] *= Math.sin((Math.PI / 2) * (i / fi)) ** 2;
    for (let i = 0; i < fo && i < n; i++) x[n - 1 - i] *= Math.sin((Math.PI / 2) * (i / fo)) ** 2;
  }
}

// Gentle tail fade over the last `ms`, cosine shaped, ending at exactly zero.
export function fadeOut(chans, ms) {
  const n = chans[0].length;
  const f = Math.min(n, Math.round((ms / 1000) * SR));
  for (const x of chans) for (let i = 0; i < f; i++) x[n - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / f);
}

export function dcBlock(chans, hz = 8) {
  const R = Math.exp((-2 * Math.PI * hz) / SR);
  for (const x of chans) {
    let x1 = 0, y1 = 0;
    for (let i = 0; i < x.length; i++) { const y = x[i] - x1 + R * y1; x1 = x[i]; y1 = y; x[i] = y; }
  }
}

export function scale(chans, gain) {
  for (const x of chans) for (let i = 0; i < x.length; i++) x[i] *= gain;
}

export function dcOffset(chans) {
  return chans.map((x) => x.reduce((a, b) => a + b, 0) / x.length);
}

// ---------- band energy ----------

// In-place radix-2 FFT on re/im arrays of a power-of-two length.
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/** The level of the band from lo to hi Hz in dBFS (its mean square, as a sine at full scale reads -3): a Welch
 * spectrum of Hann windows 32768 samples long (1.5 Hz bins), so the band edge is sharp and a 37 Hz bass doesn't read
 * as sub. */
export function bandEnergyDb(chans, lo, hi) {
  const N = 32768, hop = N / 2;
  const win = Float64Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  let band = 0, all = 0;
  for (const x of chans) {
    for (let s = 0; s + N <= x.length; s += hop) {
      const re = new Float64Array(N), im = new Float64Array(N);
      for (let i = 0; i < N; i++) re[i] = x[s + i] * win[i];
      fft(re, im);
      for (let k = 0; k <= N / 2; k++) {
        const p = re[k] * re[k] + im[k] * im[k], f = (k * SR) / N;
        all += p;
        if (f >= lo && f < hi) band += p;
      }
    }
  }
  let ms = 0, n = 0;
  for (const x of chans) for (let i = 0; i < x.length; i++) { ms += x[i] * x[i]; n++; }
  return 10 * Math.log10((band + 1e-30) / (all + 1e-30) * (ms / n) + 1e-30);
}

// ---------- the video folder ----------

const here = path.dirname(fileURLToPath(import.meta.url));
/** The project root: the folder audio/ sits in. public/ and src/ hang off it. */
export const ROOT = path.resolve(here, '..');

/** synth.js evaluated in Node without audio, for its grid, default kicks and palette (the same source the browser runs). */
export function loadSynth() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(here, 'synth.js'), 'utf8'), { window, btoa: (s) => Buffer.from(s, 'binary').toString('base64') });
  return window.LaunchSynth;
}

/**
 * Reads <video folder>/audio/cues.mjs: MUSIC, SFX and optionally KICKS. Returns the grid, the kicks, the cues with
 * their file names and lengths in frames, and where everything is written.
 */
export async function loadVideo(arg) {
  if (!arg) throw new Error('usage: node --experimental-strip-types audio/<script>.mjs <video folder>, e.g. src/example');
  const dir = path.resolve(arg);
  const name = path.basename(dir);
  const cuesFile = path.join(dir, 'audio/cues.mjs');
  if (!fs.existsSync(cuesFile)) throw new Error(`no ${path.relative(process.cwd(), cuesFile)}`);
  let cues;
  try {
    cues = await import(pathToFileURL(cuesFile).href);
  } catch (e) {
    if (e.code === 'ERR_UNKNOWN_FILE_EXTENSION') throw new Error(`cues.mjs imports TypeScript: run node with --experimental-strip-types (Node 22.6+)\n${e.message}`);
    throw e;
  }
  const { MUSIC, SFX = [], KICKS } = cues;
  if (!MUSIC) throw new Error('cues.mjs exports no MUSIC');
  const synth = loadSynth();
  const G = synth.grid(MUSIC);
  const key = MUSIC.key ?? 'D minor';
  const kicks = (KICKS ?? synth.kicks(MUSIC)).filter((v) => v < G.gate);
  const files = new Set();
  const sfx = SFX.map((c) => {
    const sound = c.sound ?? c.name;
    if (!synth.PALETTE[sound]) throw new Error(`SFX "${c.name}": no sound "${sound}" in the palette (${Object.keys(synth.PALETTE).join(', ')})`);
    if (files.has(c.name)) throw new Error(`SFX "${c.name}" is listed twice; give the second a new name and sound: "${sound}"`);
    files.add(c.name);
    if (typeof c.level !== 'number' || !Array.isArray(c.at)) throw new Error(`SFX "${c.name}" needs at: [frames] and level: dB`);
    // A palette length is in 60ths of a second; a cue's own len is in frames.
    const len = c.len ?? Math.max(1, Math.round((synth.PALETTE[sound].len / 60) * G.fps));
    return { ...c, sound, len, pitches: synth.pitches(sound, key) };
  });
  return {
    dir, name, synth, G, key, kicks, sfx, music: { ...MUSIC, key },
    spf: SR / G.fps,
    pub: path.join(ROOT, 'public', name),
    audioDir: path.join(dir, 'audio'),
  };
}
