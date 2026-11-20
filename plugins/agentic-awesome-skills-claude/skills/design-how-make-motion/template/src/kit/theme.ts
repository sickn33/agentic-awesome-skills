// The video's look as one object (references/theme.md). Scenes read roles from it, never literals.

export type Hex = `#${string}`;
export type Bezier = readonly [number, number, number, number];
/** A face. `src.file` is a variable font file (one file, every weight) or a list of static files with their weights;
 * `src.google` is a Google Fonts CSS2 URL. Faces load under an alias (`alias()`), so a copy of the same family
 * installed on the machine can never stand in for it. */
export type Face = {family: string; weight?: number; fallback: string; src?: {file?: string | {file: string; weight: number}[]; google?: string}; licence?: 'ofl' | 'commercial' | 'unknown'};
export type Ground = {paper: Hex; ink: Hex; muted: Hex; faint: Hex; hair: Hex; well: Hex; accent: Hex; onAccent?: Hex};

export type Motion = {
  preset: 'punchy' | 'calm';
  ease: {settle: Bezier; glide: Bezier; exit: Bezier; resolve: Bezier; press: Bezier};
  frames: {whipIn: number; whipOut: number; wordStagger: number; wordSettle: number; wordExit: number};
  whipPx: number;
  /** Sub-frame samples while a whip runs and on other fast moves. 1 means sharp. */
  blur: {whip: number; move: number};
  caption: {style: 'kinetic' | 'static'; spreadIn: number; spreadOut: number};
};

/** The music's key, tempo and preset live in each video's audio/cues.mjs (MUSIC), beside its timing, not here. */
export type Sound = {lufs: number};

export type VideoTheme = {
  name: string;
  color: Ground & {onAccent: Hex; dark: Ground};
  font: {display: Face; text: Face; mono: Face};
  type: {caption: {size: number; weight: number; leading: number; tracking: number}; display: number; body: number; meta: number};
  shape: {radius: {panel: number; control: number; device: number}; hairline: number; shadow: 'none' | string};
  motion: Motion;
  sound: Sound;
  frame: {w: number; h: number; fps: number; scale: number};
};

export const PUNCHY: Motion = {
  preset: 'punchy',
  ease: {settle: [0.16, 1, 0.3, 1], glide: [0.83, 0, 0.17, 1], exit: [0.6, 0, 1, 0.6], resolve: [0.25, 0.6, 0.15, 1], press: [0.2, 0.8, 0.2, 1]},
  frames: {whipIn: 10, whipOut: 7, wordStagger: 4, wordSettle: 20, wordExit: 12},
  whipPx: 420,
  blur: {whip: 16, move: 8},
  caption: {style: 'kinetic', spreadIn: 0.16, spreadOut: 0.08},
};

export const CALM: Motion = {
  ...PUNCHY,
  preset: 'calm',
  frames: {whipIn: 7, whipOut: 5, wordStagger: 6, wordSettle: 30, wordExit: 12},
  whipPx: 160,
  blur: {whip: 1, move: 1},
  caption: {style: 'static', spreadIn: 0, spreadOut: 0},
};

export const DESIGN_HOW: VideoTheme = {
  name: 'design.how',
  color: {
    paper: '#ffffff', ink: '#111111', muted: '#71706f', faint: '#c9c8c5', hair: '#ececeb', well: '#f6f6f6', accent: '#0a84ff', onAccent: '#111111',
    dark: {paper: '#111111', ink: '#ffffff', muted: '#a09f9d', faint: '#4a4a48', hair: '#2a2a29', well: '#1d1d1c', accent: '#3d9aff', onAccent: '#111111'},
  },
  font: {
    display: {family: 'Inter Tight', weight: 500, fallback: 'Arial, sans-serif', src: {google: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=block'}, licence: 'ofl'},
    // The same src as display: a face with no src is a system face and never gets the loaded copy.
    text: {family: 'Inter Tight', weight: 400, fallback: 'Arial, sans-serif', src: {google: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=block'}, licence: 'ofl'},
    mono: {family: 'ui-monospace', fallback: 'SFMono-Regular, Menlo, monospace'},
  },
  type: {caption: {size: 76, weight: 500, leading: 1.1, tracking: -0.015}, display: 58, body: 21, meta: 17},
  shape: {radius: {panel: 18, control: 10, device: 54}, hairline: 1, shadow: 'none'},
  motion: PUNCHY,
  sound: {lufs: -14},
  frame: {w: 1350, h: 1080, fps: 60, scale: 2},
};

/** Frames per beat at a frame rate. The BPM must make a whole number. */
export function beatFrames(fps: number, bpm: number) {
  const f = (fps * 60) / bpm;
  if (!Number.isInteger(f)) throw new Error(`${bpm} BPM is ${f} frames a beat at ${fps} fps; pick a BPM that divides evenly`);
  return f;
}

type Partial2<T> = {[K in keyof T]?: T[K] extends object ? Partial2<T[K]> : T[K]};

/** A partial theme over a base, one level of objects at a time, with the preset's motion under any motion overrides. */
export function resolve(over: Partial2<VideoTheme> & {preset?: 'punchy' | 'calm'}, base: VideoTheme = DESIGN_HOW): VideoTheme {
  const motion = over.preset === 'calm' ? CALM : over.preset === 'punchy' ? PUNCHY : base.motion;
  const merge = (a: any, b: any): any => {
    if (b === undefined) return a;
    if (typeof a !== 'object' || a === null || Array.isArray(a)) return b;
    const out: any = {...a};
    for (const k of Object.keys(b)) out[k] = merge(a[k], b[k]);
    return out;
  };
  const {preset: _, ...rest} = over;
  const out = merge({...base, motion}, rest);
  // A face's src is replaced, not merged: a local file must not keep the default's Google URL beside it.
  for (const k of ['display', 'text', 'mono'] as const) {
    const face = rest.font?.[k];
    if (face && 'src' in face) out.font[k] = {...out.font[k], src: face.src};
  }
  return out;
}

// Contrast (WCAG 2): the gate in references/theme.md.
/** A colour as 0xRRGGBB: #rgb or #rrggbb. Anything else throws, so a colour the check can't read never passes it. */
function rgb(hex: string) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`"${hex}" isn't a hex colour (#rgb or #rrggbb); convert it before the contrast check`);
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  return parseInt(h, 16);
}
function lum(hex: Hex) {
  const n = rgb(hex);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: Hex, b: Hex) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Every text role on every ground it lands on. Returns the failures; an empty list passes. */
export function checkContrast(t: VideoTheme) {
  const fails: string[] = [];
  for (const [label, g] of [['paper', t.color], ['ink scene', t.color.dark]] as const) {
    for (const ground of ['paper', 'well'] as const) {
      for (const [role, min] of [['ink', 4.5], ['muted', 4.5], ['accent', 3]] as const) {
        const r = contrast(g[role], g[ground]);
        if (r < min) fails.push(`${label}: ${role} on ${ground} is ${r.toFixed(2)}:1, needs ${min}:1`);
      }
    }
  }
  // Text on an accent fill (a button, a chip), on both grounds: a bright accent on an ink scene needs dark text.
  for (const [label, g, on] of [['paper', t.color, t.color.onAccent], ['ink scene', t.color.dark, t.color.dark.onAccent ?? t.color.onAccent]] as const) {
    const r = contrast(on, g.accent);
    if (r < 4.5) fails.push(`${label}: onAccent on accent is ${r.toFixed(2)}:1, needs 4.5:1`);
  }
  return fails;
}

/** A colour between a and b, 0 to 1, in oklab, so a theme change glides instead of swapping. */
export const mix = (a: Hex, b: Hex, k: number) => k <= 0 ? a : k >= 1 ? b : `color-mix(in oklab, ${a} ${((1 - k) * 100).toFixed(2)}%, ${b})`;

/** The family name a face is registered under while it renders. A face with no src is a system face. */
export const alias = (f: Face) => (f.src ? `${f.family} (video)` : f.family);

/** CSS font stack for a face: its alias first, so only the copy the video loaded is ever used. */
export const stack = (f: Face) => (f.src ? `"${alias(f)}", ${f.fallback}` : `"${f.family}", ${f.fallback}`);
