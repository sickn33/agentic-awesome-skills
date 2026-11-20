// The browser side of a launch video's soundtrack. render.mjs evaluates this file in Remotion's headless Chrome and
// renders on an OfflineAudioContext; leveling and the master happen in Node (dsp.mjs). check.mjs and render.mjs also
// evaluate it in Node, without audio, for the grid, the default kicks and the effect palette's pitches.
//
// window.LaunchSynth:
//   music(opts)     the bed as [left, right] base64 Float32, opts = MUSIC from cues.mjs plus {gain, kicks, only}; only is
//                   'kick' or 'bass' for the stems check.mjs measures
//   sfx(name, opts) one effect from the palette, opts = {fps, key}; returns {len, data: [left, right]}
//   grid(MUSIC)     the derived grid in frames (beat, chord, felt bar, step, swing, gate, ...); throws on a bad tempo
//   kicks(MUSIC)    the default kick pattern, drop to gate
//   notes(MUSIC)    every pitched note the bed plays, as {part, from, to, midi} in frames, for check.mjs's chord checks
//   pitches(name, key), PALETTE, scale(key)   what check.mjs reads to keep every effect in key
//
// Two presets, each written in D (minor and major) and transposed to the cue's key. The chord bar before the end card
// is always V, so the card lands as a cadence, V to I. Before the drop (the story) it's keys, crackle and soft hats or
// shakers. The gate closes just before the card and the room rings into the gap; the tonic chord, the bass and a top
// note land on the card. Frames are video frames; T(v) is seconds.
//
// `punchy`: a swung, half-time hip-hop beat. The picture's beat is the grid, so every cut lands on a beat while the
// groove sits at half that tempo. A felt bar is 8 beats of 16 steps (a step is half a beat), odd steps swung a tenth of
// a beat late. A chord every 4 beats: i9 iv9 VImaj9 V7b9 (Dm9 Gm9 Bbmaj9 A7b9), or in major Imaj9 vi9 IVmaj9 V13 (Dmaj9
// Bm9 Gmaj9 A13). On the drop: a short kick, a clap and rim on 2 and 4 of the felt bar, ghost rims, hats on every
// step with velocities, a walking bass ducked under each kick, a bell line on chord tones with a slapback on the swing.
//
// `calm`: lo-fi at the real tempo (80 BPM is 45 frames a beat at 60 fps). A felt bar is one 4/4 bar of 16 sixteenths,
// odd sixteenths a fifteenth of a beat late, and a chord a bar: i9 iv9 VII13 IIImaj9 with V7(b9 b13) forced before the
// card (Dm9 Gm9 C13 Fmaj9, A7), or in major Imaj9 vi9 ii9 IVmaj9 with V13 (Dmaj9 Bm9 Em9 Gmaj9, A13). An FM electric
// piano struck on the one and pushed on the "and" of two, through a tape wobble; an upright-style bass on root, fifth
// and a chromatic pickup into the next root; a round kick, a snare that lands late, swung shakers, ghost rims, crackle;
// a sparse tine line every other bar.

(() => {
  const SR = 48000;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- key and grid ----------

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  function parseKey(key = 'D minor') {
    const m = /^([A-G])(#|b)?\s+(minor|major)$/.exec(String(key).trim());
    if (!m) throw new Error(`key "${key}": write it like "D minor", "F# minor", "Bb major"`);
    return { tonic: (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, mode: m[3] };
  }
  /** Semitones from D to the key's tonic, -6 to +5, so a transposed track stays near the register it was written in. */
  const keyOffset = (key) => ((parseKey(key).tonic - 2 + 18) % 12) - 6;
  /** The key's scale as pitch classes: natural minor or major. */
  const scale = (key) => {
    const { tonic, mode } = parseKey(key);
    return (mode === 'major' ? MAJOR : MINOR).map((d) => (tonic + d) % 12);
  };
  const mod = (a, n) => ((a % n) + n) % n;

  // How each preset cuts time, in beats. punchy's felt bar is two bars of half-time; calm's is one bar at the real
  // tempo, so its steps are sixteenths. The gate closes 0.8 s before the card in punchy (1.6 beats at 120) and one beat
  // before it in calm (0.75 s at 80): about the same silence, which is what the card needs to land.
  const FEEL = {
    punchy: { feltBeats: 8, stepBeats: 1 / 2, swingBeats: 1 / 10, gateBeats: 1.6, kicks: [[0, 7, 10], [0, 3, 10]] },
    // Lo-fi swing: the off sixteenth about 55 percent of the way through its eighth (50 ms at 80 BPM, 3 frames at 60 fps).
    // The kick is a lazy boom bap: the one, the "a" of two and the "and" of three, then the one and the "and" of three.
    calm: { feltBeats: 4, stepBeats: 1 / 4, swingBeats: 1 / 15, gateBeats: 1, kicks: [[0, 7, 10], [0, 10]] },
  };

  function grid({ fps, bpm, frames, drop, end, key = 'D minor', preset = 'punchy', fills } = {}) {
    const F = FEEL[preset];
    if (!F) throw new Error(`preset "${preset}": the presets are ${Object.keys(FEEL).map((p) => `"${p}"`).join(' and ')}`);
    for (const [k, v] of Object.entries({ fps, bpm, frames, drop, end })) if (typeof v !== 'number' || !(v >= 0)) throw new Error(`MUSIC.${k} must be a number, got ${v}`);
    if (SR % fps) throw new Error(`${fps} fps does not divide ${SR} Hz into whole samples a frame`);
    const beat = (fps * 60) / bpm;
    // Every beat on a whole frame, or cuts can't land on beats: at 60 fps that's 120 BPM (30), 100 (36), 80 (45).
    if (!Number.isInteger(beat)) throw new Error(`${bpm} BPM at ${fps} fps is ${beat.toFixed(3)} frames a beat; pick a BPM where fps*60/BPM is whole`);
    if (!(drop < end && end <= frames)) throw new Error(`MUSIC needs drop < end <= frames, got ${drop}, ${end}, ${frames}`);
    // The drop is the grid's downbeat, so the end card must sit a whole number of beats after it.
    if ((end - drop) % beat) throw new Error(`end (${end}) is not a whole number of beats (${beat} frames) after drop (${drop})`);
    const { mode } = parseKey(key);
    const chord = 4 * beat, felt = F.feltBeats * beat, gate = end - F.gateBeats * beat;
    // The ring after the end card fades over its last 60 percent, at most 7/6 s (the ship's 70 frames at 60 fps).
    const fadeFrom = frames - Math.round(Math.min((7 / 6) * fps, 0.6 * (frames - end)));
    return {
      fps, bpm, frames, drop, end, beat, chord, felt, preset, mode,
      step: beat * F.stepBeats, swing: beat * F.swingBeats, gate, fadeFrom,
      off: keyOffset(key), fills: (fills ?? [drop + felt]).filter((f) => f > drop && f < gate),
    };
  }

  /** Step s of a felt bar starting at fb, odd steps swung late. */
  const at = (G, fb, s) => fb + s * G.step + (mod(s, 2) ? G.swing : 0);

  /** The default kicks: the preset's patterns in alternate felt bars from the drop, none in the break. */
  function kicks(music) {
    const G = grid(music);
    const P = FEEL[G.preset].kicks;
    const k = [];
    for (let fb = G.drop, n = 0; fb < G.end; fb += G.felt, n++) for (const s of P[n % P.length]) k.push(at(G, fb, s));
    return k.filter((v) => v < G.gate).sort((a, b) => a - b);
  }

  // ---------- buffers and helpers ----------

  function rng(seed) {
    let s = seed | 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const noiseCache = new Map();
  function noise(ctx, seconds, seed, color = 'white') {
    const key = `${ctx.__id}:${seconds}:${seed}:${color}`;
    if (noiseCache.has(key)) return noiseCache.get(key);
    const len = Math.ceil(seconds * SR);
    const buf = ctx.createBuffer(1, len, SR);
    const d = buf.getChannelData(0);
    const r = rng(seed);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      if (color === 'pink') {
        // Paul Kellet's pink filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else d[i] = w;
    }
    noiseCache.set(key, buf);
    return buf;
  }
  function noiseSrc(ctx, seconds, seed, color) {
    const s = ctx.createBufferSource();
    s.buffer = noise(ctx, seconds, seed, color);
    return s;
  }

  // A stereo room: decorrelated, darkening exponential tail with a handful of early reflections.
  function impulse(ctx, { seconds, t60, seed = 11, hiStart = 9000, hiEnd = 1500, predelay = 0.012, early = 10, earlySpan = 0.06 }) {
    const len = Math.ceil(seconds * SR);
    const buf = ctx.createBuffer(2, len, SR);
    for (let ch = 0; ch < 2; ch++) {
      const r = rng(seed + ch * 7919);
      const d = buf.getChannelData(ch);
      let lp1 = 0, lp2 = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR - predelay;
        const n = r() * 2 - 1;
        if (t < 0) continue;
        const env = Math.exp((-6.907755 * t) / t60);
        const fc = hiEnd + (hiStart - hiEnd) * Math.exp(-t / (t60 * 0.3));
        const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
        lp1 += a * (n - lp1);
        lp2 += a * (lp1 - lp2);
        d[i] = lp2 * env * Math.min(1, t / 0.02) * 1.8;
      }
      for (let k = 0; k < early; k++) {
        const pos = Math.floor((predelay * 0.4 + r() * earlySpan) * SR);
        const gn = (0.35 + r() * 0.4) * (r() < 0.5 ? -1 : 1) * Math.exp(-(pos / SR) * 12);
        // A tiny smeared blip, not a single sample.
        for (let j = -6; j <= 6; j++) if (pos + j >= 0 && pos + j < len) d[pos + j] += gn * Math.exp(-(j * j) / 8) * 0.5;
      }
      const f = Math.floor(0.05 * SR);
      for (let i = 0; i < f; i++) d[len - 1 - i] *= i / f;
    }
    return buf;
  }

  function g(ctx, v = 1) {
    const n = ctx.createGain();
    n.gain.value = v;
    return n;
  }
  function biquad(ctx, type, freq, Q = 0.707) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  }
  function pan(ctx, p) {
    const n = ctx.createStereoPanner();
    n.pan.value = p;
    return n;
  }
  const curves = new Map();
  function shaper(ctx, drive) {
    const key = drive.toFixed(3);
    let c = curves.get(key);
    if (!c) {
      c = new Float32Array(4096);
      const norm = Math.tanh(drive);
      for (let i = 0; i < c.length; i++) c[i] = Math.tanh(((i / (c.length - 1)) * 2 - 1) * drive) / norm;
      curves.set(key, c);
    }
    const w = ctx.createWaveShaper();
    w.curve = c;
    // No oversampling: Chromium's oversampled shaper delays its output a few ms, which would put every kick behind
    // the grid. What's shaped here is low (kicks, bass), so aliasing stays far below hearing.
    w.oversample = 'none';
    return w;
  }
  function chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  }

  // ---------- voices ----------

  // A sine kick with a pitch drop, a soft clip and an optional noise click.
  function kick(ctx, out, { t, level = 1, f0 = 140, f1 = 50, ptau = 0.03, decay = 0.35, drive = 2.2, click = 0.12, tone = 3500 }) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f0, t);
    o.frequency.setTargetAtTime(f1, t, ptau);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(1, t + 0.0015);
    amp.gain.setValueAtTime(1, t + 0.012);
    amp.gain.setTargetAtTime(0, t + 0.012, decay / 3);
    const out1 = g(ctx, level);
    chain(o, amp, shaper(ctx, drive), biquad(ctx, 'lowpass', tone, 0.7), out1, out);
    o.start(t);
    o.stop(t + decay * 2.5 + 0.05);
    if (click > 0) {
      const n = noiseSrc(ctx, 0.05, 99);
      const ca = g(ctx, 0);
      ca.gain.setValueAtTime(0, t);
      ca.gain.linearRampToValueAtTime(click, t + 0.0008);
      ca.gain.setTargetAtTime(0, t + 0.0008, 0.0025);
      chain(n, biquad(ctx, 'bandpass', 2600, 0.9), ca, out1);
      n.start(t);
      n.stop(t + 0.04);
    }
  }

  // 808 metal: six square waves at inharmonic ratios, under the hat's noise.
  const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
  function metal(ctx, dest, t0, t1, level) {
    const mg = g(ctx, level);
    mg.connect(dest);
    for (const f of METAL) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(mg);
      o.start(t0);
      o.stop(t1);
    }
  }

  // A closed hat: white noise and a little metal through band and high pass.
  function hat(ctx, out, { t, level = 0.2, decay = 0.04, p = 0.18, seed = 3 }) {
    const bp = biquad(ctx, 'bandpass', 9500, 0.7);
    const amp = g(ctx, 0);
    chain(bp, biquad(ctx, 'highpass', 6500, 0.7), amp, pan(ctx, p), out);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.001);
    amp.gain.setTargetAtTime(0, t + 0.001, decay / 3);
    const n = noiseSrc(ctx, 0.3, seed);
    n.connect(bp);
    n.start(t);
    n.stop(t + decay * 3 + 0.02);
    metal(ctx, bp, t, t + decay * 3 + 0.02, 0.08);
  }

  // A short filtered transient with a resonant body. The noise is unpitched; the body is the pitch, so effects tune it.
  function tick(ctx, out, { t = 0, freq = 2600, q = 1.4, decay = 0.012, body = 900, bodyDecay = 0.018, bodyLevel = 0.5, level = 1, seed = 5, p = 0, hp = 250 }) {
    const o = g(ctx, level);
    chain(o, biquad(ctx, 'highpass', hp, 0.7), pan(ctx, p), out);
    const n = noiseSrc(ctx, 0.2, seed);
    const na = g(ctx, 0);
    na.gain.setValueAtTime(0, t);
    na.gain.linearRampToValueAtTime(1, t + 0.0006);
    na.gain.setTargetAtTime(0, t + 0.0006, decay / 3);
    chain(n, biquad(ctx, 'bandpass', freq, q), na, o);
    n.start(t);
    n.stop(t + decay * 4 + 0.01);
    if (bodyLevel > 0) {
      const s = ctx.createOscillator();
      s.frequency.setValueAtTime(body * 1.18, t);
      s.frequency.setTargetAtTime(body, t, 0.004);
      const sa = g(ctx, 0);
      sa.gain.setValueAtTime(0, t);
      sa.gain.linearRampToValueAtTime(bodyLevel, t + 0.0008);
      sa.gain.setTargetAtTime(0, t + 0.0008, bodyDecay / 3);
      chain(s, sa, o);
      s.start(t);
      s.stop(t + bodyDecay * 4 + 0.01);
    }
  }

  // A soft FM bell with one inharmonic partial on top.
  function bell(ctx, out, { t, midi, level = 1, ratio = 2, index = 1.4, tau = 0.16, p = 0, partial = 0.12 }) {
    const f = mtof(midi);
    const car = ctx.createOscillator(), md = ctx.createOscillator();
    car.frequency.value = f;
    md.frequency.value = f * ratio;
    const idx = g(ctx, 0);
    idx.gain.setValueAtTime(f * index, t);
    idx.gain.setTargetAtTime(f * 0.15, t, 0.05);
    md.connect(idx).connect(car.frequency);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.003);
    amp.gain.setTargetAtTime(0, t + 0.003, tau);
    const pn = pan(ctx, p);
    chain(car, amp, pn, out);
    const hi = ctx.createOscillator();
    hi.frequency.value = f * 2.76;
    const ha = g(ctx, 0);
    ha.gain.setValueAtTime(0, t);
    ha.gain.linearRampToValueAtTime(level * partial, t + 0.002);
    ha.gain.setTargetAtTime(0, t + 0.002, tau / 3);
    chain(hi, ha, pn);
    for (const o of [car, md, hi]) { o.start(t); o.stop(t + tau * 6); }
  }

  // A sub: a short sine with a triangle an octave up, a quick pitch drop at the front for definition.
  function sub(ctx, out, { t, midi, level, len = 0.11 }) {
    const f = mtof(midi);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.003);
    amp.gain.setTargetAtTime(0, t + len * 0.5, len / 4);
    chain(amp, biquad(ctx, 'lowpass', 420, 0.7), out);
    for (const [type, mult, lvl] of [['sine', 1, 1], ['triangle', 2, 0.25]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f * mult * 1.06, t);
      o.frequency.setTargetAtTime(f * mult, t, 0.008);
      chain(o, g(ctx, lvl), amp);
      o.start(t);
      o.stop(t + len * 3);
    }
  }

  // A rim: a tuned click with a woody body, dry.
  const rim = (ctx, out, { t, level, p = 0.05 }) => tick(ctx, out, { t, freq: 3200, q: 1.2, decay: 0.01, body: 1750, bodyDecay: 0.035, bodyLevel: 0.6, level, seed: 41, p, hp: 400 });

  // A dusty electric piano: two FM voices a hair apart, soft attack, low-passed, a tremolo on its own gain stage.
  function keys(ctx, out, { t, midi, level, len = 1.6, p = 0 }) {
    const f = mtof(midi);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.008);
    amp.gain.setTargetAtTime(level * 0.55, t + 0.01, 0.25);
    amp.gain.setTargetAtTime(0, t + len, 0.18);
    // The tremolo scales a unity stage after the envelope, so it can never swing the gain below zero (that ring-modulated).
    const trem = ctx.createOscillator(), depth = g(ctx, 0.12), tg = g(ctx, 1);
    trem.frequency.value = 4.2;
    trem.connect(depth).connect(tg.gain);
    // The high-pass takes out the FM's sideband at 0 Hz (ratio 1); the lowest key is a D3 at 147 Hz, so it costs nothing.
    chain(amp, tg, biquad(ctx, 'highpass', 90, 0.7), biquad(ctx, 'lowpass', 1900, 0.6), pan(ctx, p), out);
    for (const [det, lvl] of [[-0.06, 0.6], [0.07, 0.5]]) {
      const car = ctx.createOscillator(), md = ctx.createOscillator();
      car.frequency.value = f * (1 + det / 100);
      // The modulator tracks its own carrier, so no sideband lands near 0 Hz.
      md.frequency.value = car.frequency.value;
      const idx = g(ctx, 0);
      idx.gain.setValueAtTime(f * 1.4, t);
      idx.gain.setTargetAtTime(f * 0.3, t, 0.12);
      md.connect(idx).connect(car.frequency);
      chain(car, g(ctx, lvl), amp);
      for (const o of [car, md]) { o.start(t); o.stop(t + len + 1); }
    }
    trem.start(t);
    trem.stop(t + len + 1);
  }

  // The bass: a sine bent up two semitones into its note, a pluck that settles to a body, a little saturated so it
  // reads on a phone. Not a held block: a flat sine cancelled the kick under it.
  function bass(ctx, out, { t, midi, level, len }) {
    const f = mtof(midi);
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 1.12, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.004);
    amp.gain.setTargetAtTime(level * 0.45, t + 0.06, 0.35);
    amp.gain.setTargetAtTime(0, t + len - 0.04, 0.012);
    chain(o, amp, shaper(ctx, 1.8), biquad(ctx, 'lowpass', 1100, 0.7), out);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  // A clap: three quick noise bursts and a short tail, band-passed, with a little body.
  function clap(ctx, out, { t, level, seed = 70 }) {
    const bp = biquad(ctx, 'bandpass', 1700, 0.9);
    const amp = g(ctx, 0);
    chain(bp, biquad(ctx, 'highpass', 600, 0.7), amp, out);
    amp.gain.setValueAtTime(0, t);
    for (const [dt, l] of [[0, 1], [0.011, 0.8], [0.022, 0.9]]) {
      amp.gain.linearRampToValueAtTime(level * l, t + dt + 0.001);
      amp.gain.setTargetAtTime(level * 0.2, t + dt + 0.002, 0.003);
    }
    amp.gain.setTargetAtTime(0, t + 0.03, 0.06);
    const n = noiseSrc(ctx, 0.4, seed);
    n.connect(bp);
    n.start(t);
    n.stop(t + 0.4);
    tick(ctx, out, { t, freq: 900, q: 1, decay: 0.01, body: 210, bodyDecay: 0.04, bodyLevel: 0.5, level: level * 0.6, hp: 120 });
  }

  // ---------- calm's voices ----------

  // An FM electric piano: a carrier and modulator at 1:1 whose index falls from a bark to a soft body (the tine's
  // attack), a short partial seven harmonics up for the hammer, a slow tremolo on its own unity stage, low-passed dark.
  // `bright` lifts the index and the hammer for the tine line, so it speaks over the chords without being louder.
  function ep(ctx, out, { t, midi, level, len = 1.2, p = 0, bright = 0 }) {
    const f = mtof(midi);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.006);
    amp.gain.setTargetAtTime(level * 0.4, t + 0.01, 0.6);
    amp.gain.setTargetAtTime(0, t + len, 0.22);
    const trem = ctx.createOscillator(), depth = g(ctx, 0.1), tg = g(ctx, 1);
    trem.frequency.value = 2.8;
    trem.connect(depth).connect(tg.gain);
    // The high-pass takes out the 1:1 FM's sideband at 0 Hz; the lowest key is D3 (147 Hz), Ab2 (104 Hz) transposed down.
    chain(amp, tg, biquad(ctx, 'highpass', 90, 0.7), biquad(ctx, 'lowpass', 2400 + bright * 1400, 0.6), pan(ctx, p), out);
    const car = ctx.createOscillator(), md = ctx.createOscillator();
    car.frequency.value = f;
    md.frequency.value = f;
    const idx = g(ctx, 0);
    idx.gain.setValueAtTime(f * (1.8 + bright), t);
    idx.gain.setTargetAtTime(f * (0.35 + bright * 0.2), t, 0.15);
    md.connect(idx).connect(car.frequency);
    chain(car, amp);
    const hammer = ctx.createOscillator(), ha = g(ctx, 0);
    hammer.frequency.value = f * 7;
    ha.gain.setValueAtTime(0, t);
    ha.gain.linearRampToValueAtTime(0.05 + bright * 0.05, t + 0.002);
    ha.gain.setTargetAtTime(0, t + 0.002, 0.02);
    chain(hammer, ha, amp);
    for (const o of [car, md, hammer, trem]) { o.start(t); o.stop(t + len + 1.2); }
  }

  // An upright-style bass: a sine with a soft octave and twelfth, bent in from a few cents sharp like a plucked string
  // settling, a finger thump of low noise on the front, a fast drop to a body that keeps fading. Low-passed and a
  // little saturated so the overtones carry it on a phone where the fundamental can't.
  function upright(ctx, out, { t, midi, level, len }) {
    const f = mtof(midi);
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.008);
    amp.gain.setTargetAtTime(level * 0.55, t + 0.02, 0.12);
    amp.gain.setTargetAtTime(0, t + Math.max(0.05, len - 0.05), 0.02);
    chain(amp, shaper(ctx, 1.4), biquad(ctx, 'lowpass', 850, 0.7), out);
    for (const [mult, lvl] of [[1, 1], [2, 0.3], [3, 0.08]]) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f * mult * 1.02, t);
      o.frequency.setTargetAtTime(f * mult, t, 0.015);
      chain(o, g(ctx, lvl), amp);
      o.start(t);
      o.stop(t + len + 0.2);
    }
    const n = noiseSrc(ctx, 0.05, 61);
    const na = g(ctx, 0);
    na.gain.setValueAtTime(0, t);
    na.gain.linearRampToValueAtTime(level * 0.5, t + 0.002);
    na.gain.setTargetAtTime(0, t + 0.002, 0.008);
    chain(n, biquad(ctx, 'lowpass', 500, 0.8), na, out);
    n.start(t);
    n.stop(t + 0.05);
  }

  // A soft snare: a short body that falls a little in pitch, a papery band of noise and a darker tail under it.
  function snare(ctx, out, { t, level, seed = 80 }) {
    const body = ctx.createOscillator();
    body.frequency.setValueAtTime(200, t);
    body.frequency.setTargetAtTime(178, t, 0.01);
    const ba = g(ctx, 0);
    ba.gain.setValueAtTime(0, t);
    ba.gain.linearRampToValueAtTime(level * 0.55, t + 0.002);
    ba.gain.setTargetAtTime(0, t + 0.002, 0.03);
    chain(body, ba, out);
    body.start(t);
    body.stop(t + 0.2);
    for (const [bp, q, hp, lp, lvl, tau] of [[1900, 0.7, 380, 6500, 1, 0.045], [1200, 0.6, 250, 3200, 0.45, 0.1]]) {
      const n = noiseSrc(ctx, 0.5, seed + lvl * 10);
      const a = g(ctx, 0);
      a.gain.setValueAtTime(0, t);
      a.gain.linearRampToValueAtTime(level * lvl, t + 0.0015);
      a.gain.setTargetAtTime(0, t + 0.0015, tau);
      chain(n, biquad(ctx, 'bandpass', bp, q), biquad(ctx, 'highpass', hp, 0.7), biquad(ctx, 'lowpass', lp, 0.7), a, out);
      n.start(t);
      n.stop(t + tau * 6);
    }
  }

  // A shaker: high noise with a soft 5 ms attack (beads moving, not a stick), so it sits behind the beat, not on it.
  function shaker(ctx, out, { t, level, seed, p = 0.3 }) {
    const amp = g(ctx, 0);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(level, t + 0.005);
    amp.gain.setTargetAtTime(0, t + 0.005, 0.014);
    const n = noiseSrc(ctx, 0.1, seed);
    chain(n, biquad(ctx, 'bandpass', 7200, 0.9), biquad(ctx, 'highpass', 4500, 0.7), amp, pan(ctx, p), out);
    n.start(t);
    n.stop(t + 0.09);
  }

  // ---------- the songs, written in D ----------

  // Each chord: `keys` the voicing, `bass` [step from the chord's start (swung), midi, length in beats], `line` the top
  // line over this chord as [step, midi]. punchy's steps are half beats (8 a chord), calm's sixteenths (16 a chord).
  //
  // The lines are written per chord, from its own tones, so whatever chord the drop or the card puts under a phrase,
  // nothing in the line sits a semitone (or a minor ninth) from a chord tone; check.mjs proves it from notes(). A
  // punchy line's last note (step 6) has a slapback on the next chord's first step, so it's also a tone of the chord
  // that follows it and of V. Low voicings keep a third or more between notes under 200 Hz, where a second is mud.
  const SONGS = {
    punchy: {
      minor: {
        loop: [
          { name: 'Dm9', keys: [50, 53, 57, 60, 64], bass: [[0, 38], [7, 45]], line: [[0, 69], [3, 72], [4, 69], [6, 67]] },
          { name: 'Gm9', keys: [53, 58, 62, 65, 69], bass: [[0, 43], [2, 41], [7, 45]], line: [[0, 74], [3, 77], [4, 74], [6, 72]] },
          // Rootless over the bass. Its line and V's are the shipped bell line's two bars.
          { name: 'Bbmaj9', keys: [53, 57, 60, 62, 65], bass: [[0, 46], [7, 41]], line: [[0, 69], [3, 72], [4, 69], [6, 67]] },
          // V's line ends on E and leads through C#, the leading tone, into the tonic.
          { name: 'A7b9', keys: [52, 55, 58, 61, 64], bass: [[0, 45], [2, 43], [7, 37]], line: [[0, 64], [2, 67], [3, 64], [4, 61], [6, 64]] },
        ],
        V: 3,
        card: { keys: [50, 53, 57, 60, 64, 69], bass: 38, sub: 50, top: 81 },
      },
      major: {
        loop: [
          { name: 'Dmaj9', keys: [50, 54, 57, 61, 64], bass: [[0, 38], [7, 45]], line: [[0, 69], [3, 73], [4, 69], [6, 71]] },
          // Bm9 as Dmaj7 over B: the 9th sits on top, away from the 3rd, and the walk down A, F# leads to G.
          { name: 'Bm9', keys: [50, 54, 57, 61, 66], bass: [[0, 47], [2, 45], [7, 42]], line: [[0, 73], [3, 76], [4, 73], [6, 69]] },
          { name: 'Gmaj9', keys: [50, 54, 57, 59, 62], bass: [[0, 43], [7, 40]], line: [[0, 74], [3, 78], [4, 74], [6, 71]] },
          // A13 rootless (5, b7, 9, 3, 13): no 4th, so nothing a semitone from the 3rd. C# walks up into D.
          { name: 'A13', keys: [52, 55, 59, 61, 66], bass: [[0, 45], [2, 43], [7, 37]], line: [[0, 64], [2, 66], [3, 64], [4, 61], [6, 64]] },
        ],
        V: 3,
        card: { keys: [50, 54, 57, 61, 64, 69], bass: 38, sub: 50, top: 81 },
      },
    },
    calm: {
      minor: {
        // Bass: root on the one, fifth on three. The pickup on the "and" of four is added in score().
        loop: [
          { name: 'Dm9', keys: [53, 57, 60, 64], bass: [[0, 38, 1.4], [8, 45, 0.9]], line: [[6, 72], [8, 69], [11, 76]] },
          // The 9th (A) sits under the 3rd's octave, so the line keeps off Bb, a semitone above it.
          { name: 'Gm9', keys: [53, 58, 62, 69], bass: [[0, 43, 1.4], [8, 50, 0.9]], line: [[6, 74], [8, 77], [11, 74]] },
          { name: 'C13', keys: [52, 58, 62, 69], bass: [[0, 36, 1.4], [8, 43, 0.9]], line: [[6, 76], [8, 74], [11, 72]] },
          { name: 'Fmaj9', keys: [52, 57, 60, 67], bass: [[0, 41, 1.4], [8, 48, 0.9]], line: [[6, 72], [8, 76], [11, 79]] },
        ],
        // A7(b9 b13): b7, 3, b13, b9. No 5th in it or under it (E against the F would be the semitone), so the bass
        // goes root then b7. The line falls F, C#, Bb: the b9 resolves down to the card's A.
        V: { name: 'A7b9b13', keys: [55, 61, 65, 70], bass: [[0, 45, 1.4], [8, 43, 0.9]], line: [[6, 77], [8, 73], [11, 70]] },
        card: { keys: [53, 57, 60, 64, 69], bass: 38, top: 74 },
      },
      major: {
        loop: [
          { name: 'Dmaj9', keys: [54, 57, 61, 64], bass: [[0, 38, 1.4], [8, 45, 0.9]], line: [[6, 73], [8, 69], [11, 76]] },
          // No D in Bm9's line: D5 over the C# (its 9th) is a minor ninth.
          { name: 'Bm9', keys: [50, 54, 57, 61], bass: [[0, 35, 1.4], [8, 42, 0.9]], line: [[6, 78], [8, 76], [11, 73]] },
          { name: 'Em9', keys: [55, 59, 62, 66], bass: [[0, 40, 1.4], [8, 47, 0.9]], line: [[6, 74], [8, 71], [11, 78]] },
          { name: 'Gmaj9', keys: [54, 57, 59, 62], bass: [[0, 43, 1.4], [8, 50, 0.9]], line: [[6, 74], [8, 78], [11, 81]] },
        ],
        // A13 rootless; the line ends on C#, the leading tone, and the card's F# picks it up.
        V: { name: 'A13', keys: [55, 59, 61, 66], bass: [[0, 45, 1.4], [8, 43, 0.9]], line: [[6, 78], [8, 71], [11, 73]] },
        // The card's top note is the 3rd: D5 over the C#4 in Dmaj9 would be a minor ninth.
        card: { keys: [54, 57, 61, 64, 69], bass: 38, top: 78 },
      },
    },
  };

  /**
   * The bed's pitched notes, transposed, as the renderer plays them. Times `at` are frames, `dt` and `len` seconds.
   * Everything that goes through the gate stops before it; the card's notes start on `end`.
   */
  function score(G) {
    const song = SONGS[G.preset][G.mode];
    const tr = (m) => m + G.off;
    const sec = G.beat / G.fps;
    const V = typeof song.V === 'number' ? song.loop[song.V] : song.V;
    // The chord bars run from the drop; the first one may start before frame 0. The bar before the end card is V.
    const lead = Math.ceil(G.drop / G.chord);
    const chordAt = (v) => (v >= G.end - G.chord ? V : song.loop[mod(Math.floor((v - G.drop) / G.chord) + lead, song.loop.length)]);
    const starts = [];
    for (let c = G.drop - lead * G.chord; c < G.end; c += G.chord) starts.push(c);
    const keys = [], bass = [], line = [], echo = [];
    const calm = G.preset === 'calm';

    for (const c of starts) {
      const v0 = Math.max(c, 0);
      // A chord struck inside the break would only be heard as a tail; nothing new starts there.
      if (v0 >= G.gate) continue;
      const { keys: voicing } = chordAt(v0);
      const spread = (i) => (i / (voicing.length - 1)) * 0.6 - 0.3;
      if (!calm) {
        // The full chord on the bar's first frame, its top two notes as a stab on step 5, swung.
        voicing.forEach((m, i) => keys.push({ at: v0, dt: i * 0.012, midi: tr(m), level: 0.065, len: 1.3, p: spread(i) }));
        const stab = at(G, c, 5);
        if (stab >= 0 && stab < G.gate) voicing.slice(-2).forEach((m, i) => keys.push({ at: stab, dt: i * 0.008, midi: tr(m), level: 0.036, len: 0.35, p: 0.2 - i * 0.2 }));
      } else {
        // Laid back: rolled up from 20 ms behind the one, then pushed again, softer, on the "and" of two.
        voicing.forEach((m, i) => keys.push({ at: v0, dt: 0.02 + i * 0.013, midi: tr(m), level: 0.06, len: 1.4 * sec, p: spread(i) * 0.8 }));
        const push = at(G, c, 6);
        if (push >= 0 && push < G.gate) voicing.forEach((m, i) => keys.push({ at: push, dt: 0.03 + i * 0.01, midi: tr(m), level: 0.038, len: 1.9 * sec, p: spread(i) * 0.6 }));
      }
    }

    // The bass from the drop. punchy: each chord's walk, every note held until the next. calm: root, fifth and a
    // chromatic pickup a semitone under the next root on the "and" of four, each note its own length, a hair late.
    for (const c of starts) {
      if (c < G.drop) continue;
      const ch = chordAt(c);
      const ns = ch.bass.map(([s, m, beats]) => ({ at: at(G, c, s), midi: tr(m), beats }));
      if (calm) {
        const next = c + G.chord >= G.end ? song.card.bass : chordAt(c + G.chord).bass[0][1];
        ns.push({ at: at(G, c, 14), midi: tr(next - 1), beats: 0.4 });
      }
      bass.push(...ns);
    }
    bass.sort((a, b) => a.at - b.at);
    const bassNotes = [];
    bass.forEach((n, i) => {
      if (n.at >= G.gate) return;
      const next = Math.min(bass[i + 1]?.at ?? G.gate, G.gate);
      const room = (next - n.at) / G.fps;
      bassNotes.push(calm
        ? { at: n.at, dt: 0.012, midi: n.midi, level: 0.16, len: Math.min(n.beats * sec, room - 0.03) }
        : { at: n.at, dt: 0, midi: n.midi, level: 0.09, len: room - 0.01 });
    });

    // The top line. punchy: the bell on the drop's felt bar, every second felt bar after, and the last felt bar, so
    // its V bar leads into the card. calm: the tine every other bar from the drop, and on the V bar.
    for (const c of starts) {
      if (c < G.drop) continue;
      const n = Math.round((c - G.drop) / G.chord);
      const play = calm ? n % 2 === 1 || c >= G.end - G.chord : Math.floor((c - G.drop) / G.felt) % 2 === 0 || c + G.chord > G.end - G.felt;
      if (!play) continue;
      for (const [s, m] of chordAt(c).line) {
        const v = at(G, c, s);
        if (v < 0 || v >= G.gate || v >= c + G.chord) continue;
        line.push({ at: v, midi: tr(m) });
        // The slapback is two steps, so its echoes keep the swing.
        if (!calm && v + 2 * G.step < G.gate) echo.push({ at: v + 2 * G.step, midi: tr(m) });
      }
    }

    const card = { keys: song.card.keys.map(tr), bass: tr(song.card.bass), sub: song.card.sub && tr(song.card.sub), top: tr(song.card.top) };
    return { keys, bass: bassNotes, line, echo, card };
  }

  /** score() flattened into what sounds when, in frames, for check.mjs: keys and bass are the chord, line and echo the tune. */
  function notes(music) {
    const G = grid(music);
    const S = score(G);
    const f = (s) => s * G.fps;
    const gated = (from, to) => ({ from, to: Math.min(to, G.gate) });
    // A bell rings about 0.35 s before it's 17 dB down; the tine is held for its length and then released.
    const ring = G.preset === 'calm' ? 0.5 * (G.beat / G.fps) + 0.3 : 0.35;
    return [
      ...S.keys.map((n) => ({ part: 'keys', midi: n.midi, ...gated(n.at + f(n.dt), n.at + f(n.dt + n.len + 0.3)) })),
      // A bass note is released before its length is up, so it ends at its length: a walk up a semitone isn't a cluster.
      ...S.bass.map((n) => ({ part: 'bass', midi: n.midi, ...gated(n.at + f(n.dt), n.at + f(n.dt + n.len)) })),
      ...S.line.map((n) => ({ part: 'line', midi: n.midi, ...gated(n.at, n.at + f(ring)) })),
      ...S.echo.map((n) => ({ part: 'echo', midi: n.midi, ...gated(n.at, n.at + f(ring)) })),
      ...S.card.keys.map((m) => ({ part: 'keys', midi: m, from: G.end, to: G.frames })),
      ...[S.card.bass, S.card.sub].filter((m) => m).map((m) => ({ part: 'bass', midi: m, from: G.end, to: G.frames })),
      { part: 'line', midi: S.card.top, from: G.end, to: G.frames },
    ];
  }

  // ---------- the bed ----------

  // Vinyl: hiss, fine dust and an occasional pop, from one seeded stream. Spaced in 60ths of a second at any fps.
  function vinyl(ctx, out, secs, { hiss = 0.03, pops = 1 } = {}) {
    const h = noiseSrc(ctx, secs + 0.1, 91, 'pink');
    chain(h, biquad(ctx, 'highpass', 1800, 0.7), biquad(ctx, 'lowpass', 7000, 0.7), g(ctx, hiss), out);
    h.start(0);
    let r = 7;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const u = secs * 60;
    for (let v = 0; v < u; v += 1 + rnd() * 4) tick(ctx, out, { t: v / 60, freq: 2500 + rnd() * 4000, q: 0.8, decay: 0.0015, bodyLevel: 0, level: 0.008 + rnd() * 0.01, seed: 900 + Math.floor(v * 4), p: rnd() - 0.5 });
    for (let v = 20; v < u; v += (30 + rnd() * 70) / pops) tick(ctx, out, { t: v / 60, freq: 1800, q: 0.7, decay: 0.004, body: 900, bodyDecay: 0.006, bodyLevel: 0.3, level: 0.08 + rnd() * 0.05, seed: 5000 + Math.floor(v), p: rnd() * 0.6 - 0.3 });
  }

  function buildMusic(ctx, G, { gain = 1, kicks: K, only }) {
    const T = (v) => v / G.fps;
    const calm = G.preset === 'calm';
    const S = score(G);
    K = K.filter((v) => v < G.gate);

    const bus = g(ctx, 1);
    const level = g(ctx, gain);
    const fade = g(ctx, 1);
    chain(bus, fade, level, ctx.destination);
    // The gate: everything but the room and the crackle stops just before the card and stays shut. What plays on the
    // card goes straight to the bus, so a chord or bell struck before the gate can't ring back in when the card lands.
    const stop = g(ctx, 1);
    stop.connect(bus);
    stop.gain.setValueAtTime(1, T(G.gate));
    stop.gain.linearRampToValueAtTime(0, T(G.gate + G.beat / 10));
    // The drums through a tanh soft clip: dry hits have a high crest, and rounding their tops lets the master reach
    // -14 LUFS without leaning on its limiter. No DynamicsCompressor: it delays the output and puts kicks behind the grid.
    const drums = g(ctx, 1);
    chain(drums, g(ctx, 1.3), shaper(ctx, 1.5), g(ctx, 0.55), stop);
    // punchy's kick is short with a knock on top so it reads on a phone; calm's is rounder and longer, the knock softer.
    const knock = (out, v) => {
      if (calm) {
        kick(ctx, out, { t: T(v), level: 0.2, f0: 105, f1: 50, ptau: 0.025, decay: 0.22, drive: 1.4, click: 0.03, tone: 1800 });
        tick(ctx, out, { t: T(v), freq: 2000, q: 1, decay: 0.006, body: 160, bodyDecay: 0.04, bodyLevel: 0.6, level: 0.045, hp: 100 });
      } else {
        kick(ctx, out, { t: T(v), level: 0.17, f0: 120, f1: 55, ptau: 0.02, decay: 0.14, drive: 1.6, click: 0.05, tone: 2600 });
        tick(ctx, out, { t: T(v), freq: 2400, q: 1, decay: 0.006, body: 190, bodyDecay: 0.035, bodyLevel: 0.7, level: 0.06, hp: 120 });
      }
    };
    // The kicks alone, for check.mjs's grid measurement.
    if (only === 'kick') { for (const v of K) knock(drums, v); return; }

    // The bass. It ducks 12 dB under each kick for the kick's first 40 ms, so the kick punches through instead of
    // cancelling against it, and is back within 1 dB 120 ms later. check.mjs measures the duck on this bus alone; a
    // 9 dB duck with a 50 ms recovery measured only 5 dB once a pluck's own decay was counted.
    const bassBus = g(ctx, 1);
    chain(bassBus, stop);
    for (const v of K) { const t = T(v); bassBus.gain.setValueAtTime(1, t); bassBus.gain.linearRampToValueAtTime(0.25, t + 0.005); bassBus.gain.setTargetAtTime(1, t + 0.04, 0.035); }
    for (const n of S.bass) (calm ? upright : bass)(ctx, bassBus, { t: T(n.at) + n.dt, midi: n.midi, level: n.level, len: n.len });
    if (only === 'bass') return;

    if (G.fadeFrom < G.frames) {
      const n = 256, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) curve[i] = 0.5 + 0.5 * Math.cos((Math.PI * i) / (n - 1));
      fade.gain.setValueAtTime(1, T(G.fadeFrom));
      fade.gain.setValueCurveAtTime(curve, T(G.fadeFrom), T(G.frames) - T(G.fadeFrom) - 0.001);
    }

    // The room sits outside the gate, so the last bar's tail rings into the break. calm's is longer and darker.
    const room = ctx.createConvolver();
    room.buffer = calm
      ? impulse(ctx, { seconds: 2, t60: 1.1, seed: 29, hiStart: 3200, hiEnd: 900, predelay: 0.018, early: 8, earlySpan: 0.05 })
      : impulse(ctx, { seconds: 1.4, t60: 0.7, seed: 23, hiStart: 4200, hiEnd: 1200, predelay: 0.01, early: 8, earlySpan: 0.03 });
    const send = g(ctx, 1);
    chain(send, biquad(ctx, 'highpass', 300, 0.7), room, g(ctx, calm ? 0.4 : 0.35), bus);

    vinyl(ctx, bus, T(G.frames), calm ? { hiss: 0.04, pops: 1.4 } : {});

    // Keys.
    const keyBus = g(ctx, 1);
    if (calm) {
      // A tape wobble: the keys through a delay whose time drifts 0.8 ms at 0.55 Hz, about 5 cents of pitch either way.
      const wob = ctx.createDelay(0.05), lfo = ctx.createOscillator(), dep = g(ctx, 0.0008);
      wob.delayTime.value = 0.008;
      lfo.frequency.value = 0.55;
      lfo.connect(dep).connect(wob.delayTime);
      lfo.start(0);
      chain(keyBus, wob, stop);
      wob.connect(g(ctx, 0.45)).connect(send);
    } else {
      chain(keyBus, stop);
      keyBus.connect(g(ctx, 0.4)).connect(send);
    }
    for (const n of S.keys) (calm ? ep : keys)(ctx, keyBus, { t: T(n.at) + n.dt, midi: n.midi, level: n.level, len: n.len, p: n.p });

    // Hats (punchy) or shakers (calm) on every step from the drop, swung, with velocities; only the on-beat steps,
    // softer, through the story; a four-hit fill into each of G.fills.
    const hatBus = g(ctx, 1);
    chain(hatBus, biquad(ctx, 'highpass', calm ? 4000 : 5000, 0.7), drums);
    for (let s = -Math.floor(G.drop / G.step); at(G, G.drop, s) < G.gate; s++) {
      const v = at(G, G.drop, s);
      if (v < 0) continue;
      const story = v < G.drop;
      if (story && mod(s, 2)) continue;
      if (!story && G.fills.some((c) => v >= c - (calm ? 2 : 1) * G.step && v < c)) continue;
      const vel = [1, 0.4, 0.7, 0.45][mod(s, 4)];
      if (calm) shaker(ctx, hatBus, { t: T(v), level: (story ? 0.07 : 0.13) * vel * (0.9 + (0.2 * mod(s * 37, 7)) / 7), seed: 1000 + s, p: mod(s, 2) ? 0.35 : 0.2 });
      else {
        const open = mod(s, 32) === 14;
        hat(ctx, hatBus, { t: T(v), level: (story ? 0.06 : 0.14) * vel, decay: open ? 0.1 : 0.03, p: mod(s, 2) ? 0.2 : -0.12, seed: 1000 + s });
      }
    }

    for (const v of K) knock(drums, v);

    const clapBus = g(ctx, 1);
    chain(clapBus, drums);
    clapBus.connect(g(ctx, calm ? 0.45 : 0.35)).connect(send);
    if (!calm) {
      for (const c of G.fills) for (let i = 1; i <= 4; i++) hat(ctx, hatBus, { t: T(c - G.step + ((i - 1) * G.beat) / 8), level: 0.03 + 0.01 * i, decay: 0.02, p: i % 2 ? 0.25 : -0.25, seed: 700 + c + i });
      // A clap with a rim on 2 and 4 of the felt bar (steps 4 and 12); ghost rims on steps 9 and 15.
      for (let fb = G.drop; fb < G.end; fb += G.felt) {
        for (const s of [4, 12]) { const v = at(G, fb, s); if (v < G.gate) { clap(ctx, clapBus, { t: T(v), level: 0.22, seed: 70 + Math.round(v) }); rim(ctx, clapBus, { t: T(v), level: 0.1 }); } }
        for (const s of [9, 15]) { const v = at(G, fb, s); if (v < G.gate) rim(ctx, drums, { t: T(v), level: 0.05, p: -0.1 }); }
      }
    } else {
      // The snare on 2 and 4, 3 percent of a beat late (22 ms at 80 BPM): the lean that makes it lazy.
      const late = 0.03 * G.beat;
      for (let fb = G.drop, n = 0; fb < G.end; fb += G.felt, n++) {
        for (const s of [4, 12]) { const v = at(G, fb, s) + late; if (v < G.gate) snare(ctx, clapBus, { t: T(v), level: 0.2, seed: 80 + Math.round(v) }); }
        // Ghost rims: the last sixteenth every bar, the "and" of two every other bar.
        for (const s of n % 2 ? [6, 15] : [15]) { const v = at(G, fb, s); if (v < G.gate) rim(ctx, drums, { t: T(v), level: 0.04, p: -0.25 }); }
      }
      // A drag into each fill: two ghost snares on the last two sixteenths before it.
      for (const c of G.fills) [2, 1].forEach((k, i) => snare(ctx, clapBus, { t: T(c - k * G.step + (k === 1 ? G.swing : 0) + late), level: 0.05 + 0.03 * i, seed: 300 + c + k }));
    }

    // The top line: punchy's bell with a slapback two steps behind, calm's tine dry into the room.
    const lineBus = g(ctx, 1);
    chain(lineBus, stop);
    if (calm) {
      lineBus.connect(g(ctx, 0.5)).connect(send);
      for (const n of S.line) ep(ctx, lineBus, { t: T(n.at), midi: n.midi, level: 0.05, len: (0.5 * G.beat) / G.fps, p: 0.15, bright: 1 });
    } else {
      const slap = ctx.createDelay(4);
      slap.delayTime.value = T(2 * G.step);
      chain(lineBus, slap, biquad(ctx, 'lowpass', 2200, 0.6), g(ctx, 0.3), pan(ctx, 0.35), stop);
      lineBus.connect(g(ctx, 0.3)).connect(send);
      for (const n of S.line) bell(ctx, lineBus, { t: T(n.at), midi: n.midi, level: 0.1, ratio: 3, index: 0.8, tau: 0.18, p: 0.05, partial: 0.05 });
    }

    // The end card: the bass, the tonic chord and a top note land together. The `thump` effect is the card's kick. The
    // punchy bass and sub sit under the ship's (0.11, 0.08): with the thump on the same tonic they were the limiter's
    // hardest moment, 4.5 dB in F minor.
    const E = T(G.end), C = S.card;
    if (calm) {
      upright(ctx, bus, { t: E + 0.012, midi: C.bass, level: 0.13, len: 2 });
      C.keys.forEach((m, i) => ep(ctx, bus, { t: E + 0.02 + i * 0.02, midi: m, level: 0.055, len: 2, p: (i / (C.keys.length - 1)) * 0.5 - 0.25 }));
      ep(ctx, bus, { t: E + 0.12, midi: C.top, level: 0.05, len: 1.6, p: 0.15, bright: 1 });
    } else {
      bass(ctx, bus, { t: E, midi: C.bass, level: 0.08, len: 1.4 });
      sub(ctx, bus, { t: E, midi: C.sub, level: 0.06, len: 0.4 });
      C.keys.forEach((m, i) => keys(ctx, bus, { t: E + i * 0.016, midi: m, level: 0.065, len: 1.6, p: (i / (C.keys.length - 1)) * 0.6 - 0.3 }));
      bell(ctx, bus, { t: E, midi: C.top, level: 0.07, ratio: 2, index: 0.9, tau: 0.6, partial: 0.06 });
    }
  }

  // ---------- effects: a named palette, in key ----------

  // Two FM bell notes `gap` s apart, struck and left: no glide, no sweep.
  const twoNotes = (ctx, out, m0, m1, gap, level) => {
    bell(ctx, out, { t: 0.001, midi: m0, level, ratio: 2, index: 0.8, tau: 0.08 });
    bell(ctx, out, { t: 0.001 + gap, midi: m1, level: level * 0.94, ratio: 2, index: 0.8, tau: 0.09 });
  };
  // Each sound's pitches are written in D minor (`notes`) and transposed with the track; `major` replaces them in a
  // major key where a note isn't in D major (C becomes B, the 6th, the nearest consonant degree). The ticks' bodies
  // are tuned to scale notes near the frequencies the shipped ones used. `len` is in 60ths of a second, the length it rings.
  // No noise sweeps or whooshes: every one of those read as a whoosh.
  const PALETTE = {
    letter: { len: 3, notes: [100], about: 'a tiny high tick, for letters or items dropping in quick runs',
      build: (c, o, [m]) => tick(c, o, { t: 0.001, freq: 5600, q: 2, decay: 0.005, body: mtof(m), bodyDecay: 0.008, bodyLevel: 0.3 }) },
    tick: { len: 6, notes: [88], about: 'a dry tick, for a guide, a cursor step, a counter',
      build: (c, o, [m]) => tick(c, o, { t: 0.001, freq: 3000, q: 1.5, decay: 0.006, body: mtof(m), bodyDecay: 0.014, bodyLevel: 0.35 }) },
    press: { len: 5, notes: [84], major: [83], about: 'a button press or a drag starting',
      build: (c, o, [m]) => tick(c, o, { t: 0.001, freq: 2400, q: 1.3, decay: 0.008, body: mtof(m), bodyDecay: 0.02, bodyLevel: 0.45, hp: 300 }) },
    flip: { len: 5, notes: [96], major: [95], about: 'a word or card flipping',
      build: (c, o, [m]) => tick(c, o, { t: 0.001, freq: 4400, q: 2, decay: 0.005, body: mtof(m), bodyDecay: 0.009, bodyLevel: 0.3 }) },
    land: { len: 14, notes: [57], about: 'something heavy landing, a shutter',
      build: (c, o, [m]) => tick(c, o, { t: 0.001, freq: 900, q: 1, decay: 0.012, body: mtof(m), bodyDecay: 0.07, bodyLevel: 0.9, hp: 50 }) },
    stamp: { len: 10, notes: [74, 81], about: 'a stamp or tag dropping, a knock with a bell',
      build: (c, o, [m0, m1]) => { tick(c, o, { t: 0.001, freq: 2000, q: 1.2, decay: 0.01, body: mtof(m0), bodyDecay: 0.04, bodyLevel: 0.7, hp: 120 }); bell(c, o, { t: 0.03, midi: m1, level: 0.25, ratio: 2, index: 0.7, tau: 0.05 }); } },
    ping: { len: 10, notes: [86], about: 'one high bell, for a measurement or a row landing',
      build: (c, o, [m]) => bell(c, o, { t: 0.001, midi: m, level: 0.4, ratio: 2, index: 0.7, tau: 0.05 }) },
    step: { len: 14, notes: [69, 81], about: 'two bells an octave apart, for a pass or a step starting',
      build: (c, o, [m0, m1]) => twoNotes(c, o, m0, m1, 0.05, 0.4) },
    chime: { len: 20, notes: [74, 81], about: 'two bells, tonic then fifth, for the turn: a reveal, a flip into the product',
      build: (c, o, [m0, m1]) => twoNotes(c, o, m0, m1, 0.07, 0.5) },
    thump: { len: 24, notes: [26], about: "a soft low kick on the tonic, the end card's only kick",
      // An octave up when the key sits below D, so its fundamental stays over 30 Hz.
      build: (c, o, [m]) => kick(c, o, { t: 0.001, level: 0.8, f0: 100, f1: mtof(m < 26 ? m + 12 : m), ptau: 0.03, decay: 0.32, drive: 1.3, click: 0, tone: 1500 }) },
  };
  const pitches = (name, key) => {
    if (!PALETTE[name]) throw new Error(`no sound "${name}" in the palette: ${Object.keys(PALETTE).join(', ')}`);
    const { notes, major } = PALETTE[name];
    return (parseKey(key).mode === 'major' && major ? major : notes).map((m) => m + keyOffset(key));
  };

  // ---------- rendering ----------

  function toB64(f32) {
    const bytes = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  let renders = 0;
  async function music(opts) {
    const G = grid(opts);
    const ctx = new OfflineAudioContext(2, G.frames * (SR / G.fps), SR);
    ctx.__id = `music${renders++}`;
    buildMusic(ctx, G, { gain: opts.gain, kicks: opts.kicks ?? kicks(opts), only: opts.only });
    const buf = await ctx.startRendering();
    return [toB64(buf.getChannelData(0)), toB64(buf.getChannelData(1))];
  }

  async function sfx(name, { key = 'D minor' } = {}) {
    const spec = PALETTE[name];
    if (!spec) throw new Error(`no sound "${name}" in the palette`);
    const ctx = new OfflineAudioContext(2, Math.ceil((spec.len / 60 + 0.3) * SR), SR);
    ctx.__id = `sfx${renders++}`;
    const out = g(ctx, 1);
    out.connect(ctx.destination);
    spec.build(ctx, out, pitches(name, key));
    const buf = await ctx.startRendering();
    return { len: spec.len, data: [toB64(buf.getChannelData(0)), toB64(buf.getChannelData(1))] };
  }

  window.LaunchSynth = { SR, grid, kicks, notes, scale, pitches, PALETTE, music, sfx };
})();
