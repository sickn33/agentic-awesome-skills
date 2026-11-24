import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { TokenProperty } from './config.js';
import { intersects, type Box } from './image.js';
import { UiDiffError } from './log.js';
import { isStylexTokenSource, parseStylexTokens } from './stylex.js';

export type RGBAValue = [number, number, number, number];
export type TokenCategory = 'color' | 'spacing' | 'radius' | 'fontSize' | 'fontWeight' | 'fontFamily' | 'lineHeight';

export interface RawToken {
  name: string;
  value: string;
  type?: string;
  source: string;
}

export interface TokenValue {
  name: string;
  raw: string;
  category: TokenCategory;
  px?: number;
  weight?: number;
  family?: string;
  rgba?: RGBAValue;
}

export interface TokenSet {
  values: TokenValue[];
  spacingUnit?: number;
}

export interface StyledElement {
  selector: string;
  /** Page coordinates in CSS px. */
  box: Box;
  text: boolean;
  /** Horizontal margins come from `margin: auto` centering, not from a spacing value. */
  autoMarginX?: boolean;
  // Element map fields; absent in snapshots written before the map existed.
  /** Stable identity: "testid:…", "id:…", "aria:<role>:<label>", else "path:<selector>". */
  id?: string;
  /** Readable name: "button 'Get started'", "heading 'Pricing'", "Card (div.card)", or the selector. */
  name?: string;
  /** React or Vue component whose outermost DOM node this is. */
  component?: string;
  tag?: string;
  role?: string;
  /** Accessible name, for links, buttons, form fields, headings, images and elements with a role. */
  label?: string;
  /** The element's own text (not its children's). */
  ownText?: string;
  /** Image or video source, without the origin. */
  src?: string;
  attrs?: { testid?: string; id?: string; ariaLabel?: string };
  /** Index of the nearest recorded ancestor in `elements`. */
  parent?: number | null;
  /** Inside a capture.mask, hide or ignore selector: painted over or hidden in the screenshot, so not compared. */
  masked?: boolean;
  /** Matches a focus selector: only these elements and what they contain are compared. */
  focus?: boolean;
  /** `box` in device pixels (the screenshot's coordinates). */
  deviceBox?: Box;
  styles: {
    color: string;
    backgroundColor: string;
    borderColor: string[];
    margin: string[];
    padding: string[];
    gap: string[];
    radius: string[];
    fontSize: string;
    fontWeight: string;
    fontFamily: string;
    lineHeight: string;
    /** Absent in snapshots written before it was recorded. */
    letterSpacing?: string;
    // Recorded for the style diff; absent in older snapshots.
    opacity?: string;
    boxShadow?: string;
    borderWidth?: string[];
    /** Top, right, bottom, left, whether or not that side has a border. */
    borderColors?: string[];
    backgroundImage?: string;
    display?: string;
    flexDirection?: string;
    gridAutoFlow?: string;
    justifyContent?: string;
    alignItems?: string;
  };
}

export interface StyleSnapshot {
  elements: StyledElement[];
  /** Browser-normalized sRGB values for every color string seen (and every token color). */
  colors: Record<string, RGBAValue | null>;
}

export interface Finding {
  property: TokenProperty;
  value: string;
  selector: string;
  nearest?: string;
}

export interface AggregatedFinding {
  property: TokenProperty;
  value: string;
  /** Distinct elements (by selector) using the value. */
  count: number;
  selectors: string[];
  captures: string[];
  nearest?: string;
  isNew: boolean;
}

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------

const NAMED_COLORS: Record<string, RGBAValue> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
  green: [0, 128, 0, 1],
  blue: [0, 0, 255, 1],
  gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1],
  orange: [255, 165, 0, 1],
  purple: [128, 0, 128, 1],
  yellow: [255, 255, 0, 1],
  pink: [255, 192, 203, 1],
};

const COLOR_FN = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

export function looksLikeColor(value: string): boolean {
  const v = value.trim().toLowerCase();
  return /^#[0-9a-f]{3,8}$/.test(v) || COLOR_FN.test(v) || v in NAMED_COLORS;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Node-side color parser for hex, rgb(), hsl() and a few names. Other syntaxes are normalized in the browser. */
export function parseCssColor(input: string): RGBAValue | undefined {
  const v = input.trim().toLowerCase();
  if (v in NAMED_COLORS) return NAMED_COLORS[v];
  const hex = /^#([0-9a-f]{3,8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return undefined;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? Math.round((n(6) / 255) * 100) / 100 : 1];
  }
  const fn = /^(rgba?|hsla?)\(([^)]+)\)$/.exec(v);
  if (!fn) return undefined;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return undefined;
  const num = (p: string, max: number) => (p.endsWith('%') ? (parseFloat(p) / 100) * max : parseFloat(p));
  const alpha = parts[3] !== undefined ? num(parts[3], 1) : 1;
  if (fn[1].startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((p) => Math.round(num(p, 255)));
    return [r, g, b, Math.round(alpha * 100) / 100];
  }
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, s, l);
  return [r, g, b, Math.round(alpha * 100) / 100];
}

export function toPx(value: string | number, remBase = 16): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const v = value.trim().toLowerCase();
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(v);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (m[2] === 'rem' || m[2] === 'em') return n * remBase;
  return n;
}

const WEIGHT_NAMES: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

export function firstFamily(value: string): string {
  return (value.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
}

function stringify(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

/** Flattens W3C design tokens ($value/$type), Style Dictionary (value/type) and plain nested objects. */
export function parseJsonTokens(data: unknown, source: string): RawToken[] {
  const out: RawToken[] = [];
  const emit = (name: string, value: unknown, type?: string) => {
    if (Array.isArray(value)) {
      if (value.every((v) => typeof v === 'string') && /family|font(?!-?size)|typeface/i.test(name)) {
        out.push({ name, value: value.join(', '), type, source });
      } else if (value.length > 0) {
        const first = stringify(value[0]);
        if (first !== undefined) out.push({ name, value: first, type, source });
      }
      return;
    }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) emit(`${name}.${k}`, v, undefined);
      return;
    }
    const s = stringify(value);
    if (s !== undefined) out.push({ name, value: s, type, source });
  };
  const walk = (node: unknown, parts: string[], inheritedType?: string) => {
    if (node === null || node === undefined) return;
    const name = parts.join('.');
    if (typeof node !== 'object' || Array.isArray(node)) {
      emit(name, node, inheritedType);
      return;
    }
    const obj = node as Record<string, unknown>;
    const type = typeof obj.$type === 'string' ? obj.$type : inheritedType;
    if ('$value' in obj) {
      emit(name, obj.$value, type);
      return;
    }
    if ('value' in obj && (typeof obj.value !== 'object' || obj.value === null || Array.isArray(obj.value))) {
      emit(name, obj.value, typeof obj.type === 'string' ? obj.type : type);
      return;
    }
    for (const [key, child] of Object.entries(obj)) {
      if (key.startsWith('$')) continue;
      walk(child, [...parts, key], type);
    }
  };
  walk(data, []);
  return out;
}

export function parseCssTokens(css: string, source: string): RawToken[] {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: RawToken[] = [];
  for (const match of clean.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+)\s*(?=[;}])/g)) {
    out.push({ name: match[1], value: match[2].trim(), source });
  }
  return out;
}

const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
const TOKEN_FILE = /(?:^|\/)(?:design-)?tokens?(?:\.[\w-]+)?\.(?:json|css)$|\.tokens\.json$/i;
const STYLEX_FILE = /\.stylex\.(?:[cm]?[jt]s|[jt]sx)$/i;
const SKIP_DIR = /(?:^|\/)(?:node_modules|dist|build|out|coverage|\.next|\.ui-diff[^/]*|test|tests|__tests__|fixtures?|examples?)\//i;

/**
 * Finds design-token files among repository paths (relative to `dir`): StyleX `*.stylex.ts`
 * files that call defineVars/defineConsts, and tokens.json / tokens.css style files.
 */
export function detectTokenFiles(dir: string, files: string[], max = 12): string[] {
  const stylex: string[] = [];
  const plain: string[] = [];
  for (const rel of files) {
    if (SKIP_DIR.test(rel)) continue;
    if (STYLEX_FILE.test(rel)) {
      try {
        if (isStylexTokenSource(readFileSync(path.join(dir, rel), 'utf8'))) stylex.push(rel);
      } catch {
        // unreadable
      }
    } else if (TOKEN_FILE.test(rel)) {
      plain.push(rel);
    }
  }
  return [...stylex.sort(), ...plain.sort()].slice(0, max);
}

export function loadTokenFiles(files: string[]): RawToken[] {
  const raw: RawToken[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      throw new UiDiffError(`Token file not found: ${file}`);
    }
    const ext = path.extname(file).toLowerCase();
    if (SCRIPT_EXTENSIONS.has(ext)) {
      const tokens = parseStylexTokens(text, file);
      if (tokens.length === 0) throw new UiDiffError(`No StyleX tokens found in ${file}`, { hint: 'Script token files are read statically: point tokens.files at a file with stylex.defineVars({...}) literals.' });
      raw.push(...tokens);
    } else if (ext === '.json') {
      try {
        raw.push(...parseJsonTokens(JSON.parse(text), file));
      } catch (error) {
        throw new UiDiffError(`Could not parse token file ${file}: ${(error as Error).message}`);
      }
    } else {
      raw.push(...parseCssTokens(text, file));
    }
  }
  return raw;
}

function resolveReferences(tokens: RawToken[]): RawToken[] {
  const byName = new Map<string, string[]>();
  for (const t of tokens) {
    const keys = [t.name, t.name.replace(/^--/, '')];
    for (const k of keys) byName.set(k, [...(byName.get(k) ?? []), t.value]);
  }
  const resolveOne = (value: string, depth: number): string => {
    if (depth > 10) return value;
    let out = value.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^)]+))?\)/g, (_, name: string, fallback?: string) => {
      const hit = byName.get(name)?.[0];
      return hit !== undefined ? resolveOne(hit, depth + 1) : (fallback ?? _).trim();
    });
    out = out.replace(/^\{([^}]+)\}$/, (_, name: string) => {
      const hit = byName.get(name)?.[0];
      return hit !== undefined ? resolveOne(hit, depth + 1) : _;
    });
    return out;
  };
  return tokens.map((t) => ({ ...t, value: resolveOne(t.value, 0) }));
}

export function categoryFor(name: string, value: string, type?: string): TokenCategory | undefined {
  const n = name.toLowerCase().replace(/[._\s/]+/g, '-');
  const t = type?.toLowerCase().replace(/[-_\s]/g, '');
  const v = value.trim();
  const dimension = toPx(v) !== undefined;
  if (t === 'color') return 'color';
  if (t === 'fontfamily' || t === 'fontfamilies') return 'fontFamily';
  if (t === 'fontweight' || t === 'fontweights') return 'fontWeight';
  if (t === 'fontsize' || t === 'fontsizes') return dimension ? 'fontSize' : undefined;
  if (t === 'lineheight' || t === 'lineheights') return 'lineHeight';
  if (t === 'borderradius' || t === 'radius') return dimension ? 'radius' : undefined;
  if (/shadow|duration|easing|ease|z-?index|opacity|breakpoint|screen|transition|animation|blur/.test(n)) return undefined;
  if (looksLikeColor(v)) return 'color';
  if (/line-?height|leading/.test(n)) return 'lineHeight';
  if (/font-?weight|\bweight/.test(n) || (/font/.test(n) && /^[1-9]00$/.test(v))) return 'fontWeight';
  if (/font-?size|text-?size|type-?scale|(^|[.-])text[.-]/.test(n) && dimension) return 'fontSize';
  if (/family|typeface|(^|[.-])font[.-](sans|serif|mono|body|heading|display|base)/.test(n) || (/font/.test(n) && !dimension)) return 'fontFamily';
  if (/radius|radii|rounded|corner/.test(n) && dimension) return 'radius';
  if (/space|spacing|gap|margin|padding|inset|gutter|size|grid|layout|dimension|scale/.test(n) && dimension) return 'spacing';
  if (t === 'dimension' || t === 'spacing' || t === 'sizing') return dimension ? 'spacing' : undefined;
  return abbreviatedCategory(n, dimension);
}

/**
 * Short design-token names: --fs-sm, --fw-bold, --ff-serif, --lh-tight, --s-4 / --sp-4, --r-md.
 * Single letters only count as the first segment, so "--s-4" is spacing but "--icon-s" is not.
 */
function abbreviatedCategory(normalizedName: string, dimension: boolean): TokenCategory | undefined {
  const segments = normalizedName.split('-').filter(Boolean);
  const head = segments[0];
  const has = (...words: string[]) => segments.some((s) => words.includes(s));
  if (has('fs', 'fsz') && dimension) return 'fontSize';
  if (has('fw')) return 'fontWeight';
  if (has('ff')) return dimension ? undefined : 'fontFamily';
  if (has('lh')) return 'lineHeight';
  if (dimension && (head === 'r' || has('rad', 'br'))) return 'radius';
  if (dimension && (head === 's' || head === 'm' || head === 'p' || has('sp', 'spc', 'pad', 'mar', 'sz'))) return 'spacing';
  return undefined;
}

export type CategoryMap = Partial<Record<'color' | 'spacing' | 'radius' | 'font-size' | 'font-weight' | 'font-family' | 'line-height', string[]>>;

const CATEGORY_KEYS: Record<keyof CategoryMap, TokenCategory> = {
  color: 'color',
  spacing: 'spacing',
  radius: 'radius',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-family': 'fontFamily',
  'line-height': 'lineHeight',
};

function nameMatches(name: string, pattern: string): boolean {
  const re = new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
  return re.test(name);
}

/** Category forced by `tokens.categories` (name globs such as "--s-*" or "space.*"), if any. */
export function mappedCategory(name: string, categories: CategoryMap | undefined): TokenCategory | undefined {
  for (const [key, patterns] of Object.entries(categories ?? {}) as Array<[keyof CategoryMap, string[]]>) {
    if (patterns.some((p) => nameMatches(name, p))) return CATEGORY_KEYS[key];
  }
  return undefined;
}

export function buildTokenSet(raw: RawToken[], remBase = 16, categories?: CategoryMap): TokenSet {
  const values: TokenValue[] = [];
  let spacingUnit: number | undefined;
  for (const token of resolveReferences(raw)) {
    const category = mappedCategory(token.name, categories) ?? categoryFor(token.name, token.value, token.type);
    if (!category) continue;
    const value: TokenValue = { name: token.name, raw: token.value, category };
    if (category === 'color') value.rgba = parseCssColor(token.value);
    else if (category === 'fontWeight') value.weight = WEIGHT_NAMES[token.value.toLowerCase()] ?? Number(token.value);
    else if (category === 'fontFamily') value.family = firstFamily(token.value);
    else value.px = toPx(token.value, remBase);
    if (value.px === undefined && ['spacing', 'radius', 'fontSize'].includes(category)) continue;
    if (category === 'spacing' && /^(?:--)?(?:spacing|space|grid|base-?unit|spacing-?unit)$/i.test(token.name)) spacingUnit = value.px;
    values.push(value);
  }
  return { values, spacingUnit };
}

// ---------------------------------------------------------------------------------------------
// Auditing
// ---------------------------------------------------------------------------------------------

export function toHex(rgba: RGBAValue): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const base = `#${h(rgba[0])}${h(rgba[1])}${h(rgba[2])}`;
  return rgba[3] < 1 ? `${base}${h(rgba[3] * 255)}` : base;
}

function srgbToOklab([r, g, b]: RGBAValue): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function srgbToLab([r, g, b]: RGBAValue): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  // sRGB to XYZ, relative to the D65 white point.
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / 0.95047;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIEDE2000 color difference of two CIELAB colors. */
export function deltaE2000Lab([l1, a1, b1]: [number, number, number], [l2, a2, b2]: [number, number, number]): number {
  const rad = Math.PI / 180;
  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cMean7 = ((c1 + c2) / 2) ** 7;
  const g = 0.5 * (1 - Math.sqrt(cMean7 / (cMean7 + 25 ** 7)));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => (b === 0 && a === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dL = l2 - l1;
  const dC = c2p - c1p;
  let dh = 0;
  if (c1p * c2p !== 0) dh = Math.abs(h2p - h1p) <= 180 ? h2p - h1p : h2p - h1p > 180 ? h2p - h1p - 360 : h2p - h1p + 360;
  const dH = 2 * Math.sqrt(c1p * c2p) * Math.sin((dh / 2) * rad);
  const lMean = (l1 + l2) / 2;
  const cMeanP = (c1p + c2p) / 2;
  let hMean = h1p + h2p;
  if (c1p * c2p !== 0) hMean = Math.abs(h1p - h2p) <= 180 ? (h1p + h2p) / 2 : h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  const t = 1 - 0.17 * Math.cos((hMean - 30) * rad) + 0.24 * Math.cos(2 * hMean * rad) + 0.32 * Math.cos((3 * hMean + 6) * rad) - 0.2 * Math.cos((4 * hMean - 63) * rad);
  const sL = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2);
  const sC = 1 + 0.045 * cMeanP;
  const sH = 1 + 0.015 * cMeanP * t;
  const cMeanP7 = cMeanP ** 7;
  const rT = -2 * Math.sqrt(cMeanP7 / (cMeanP7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hMean - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / sL) ** 2 + (dC / sC) ** 2 + (dH / sH) ** 2 + rT * (dC / sC) * (dH / sH));
}

/** CIEDE2000 difference of two sRGB colors (alpha ignored). */
export function deltaE2000(a: RGBAValue, b: RGBAValue): number {
  return deltaE2000Lab(srgbToLab(a), srgbToLab(b));
}

/** Perceptual distance (OKLab ΔE × 100). */
export function colorDistance(a: RGBAValue, b: RGBAValue): number {
  const [l1, a1, b1] = srgbToOklab(a);
  const [l2, a2, b2] = srgbToOklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100 + Math.abs(a[3] - b[3]) * 50;
}

interface AuditContext {
  tokens: TokenSet;
  colors: Record<string, RGBAValue | null>;
  colorTolerance: number;
  pxTolerance: number;
  allowColors: RGBAValue[];
  allowPx: number[];
  allowFamilies: string[];
}

function colorOf(value: string, ctx: AuditContext): RGBAValue | undefined {
  const fromPage = ctx.colors[value];
  if (fromPage) return fromPage;
  return parseCssColor(value);
}

function tokenColor(t: TokenValue, ctx: AuditContext): RGBAValue | undefined {
  return ctx.colors[t.raw] ?? t.rgba;
}

function channelMatch(a: RGBAValue, b: RGBAValue, tolerance: number): boolean {
  return Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance && Math.abs(a[2] - b[2]) <= tolerance && Math.abs(a[3] - b[3]) <= 0.02;
}

function checkColor(value: string, ctx: AuditContext): { ok: boolean; display: string; nearest?: string } | undefined {
  const rgba = colorOf(value, ctx);
  if (!rgba || rgba[3] === 0) return undefined;
  const display = toHex(rgba);
  const palette = ctx.tokens.values.filter((t) => t.category === 'color');
  const candidates = palette.map((t) => ({ t, c: tokenColor(t, ctx) })).filter((x): x is { t: TokenValue; c: RGBAValue } => Boolean(x.c));
  if (ctx.allowColors.some((c) => channelMatch(c, rgba, ctx.colorTolerance))) return { ok: true, display };
  if (candidates.some((x) => channelMatch(x.c, rgba, ctx.colorTolerance))) return { ok: true, display };
  let best: { t: TokenValue; c: RGBAValue; d: number } | undefined;
  for (const x of candidates) {
    if (Math.abs(x.c[3] - rgba[3]) > 0.02) continue;
    const d = deltaE2000(x.c, rgba);
    if (!best || d < best.d) best = { ...x, d };
  }
  const close = best && best.d < NEAREST_COLOR_MAX_DELTA_E;
  return { ok: false, display, nearest: close ? `${best!.t.name} (${toHex(best!.c)})` : undefined };
}

/**
 * A token is suggested only below this CIEDE2000 difference: around 2 is just noticeable side by
 * side, 5 is the same color family; past it the nearest token is a different color.
 */
export const NEAREST_COLOR_MAX_DELTA_E = 5;

function checkPx(value: string, category: 'spacing' | 'radius' | 'fontSize' | 'lineHeight', ctx: AuditContext): { ok: boolean; display: string; nearest?: string } | undefined {
  const px = toPx(value);
  if (px === undefined) return undefined;
  const abs = Math.abs(px);
  if (abs < 0.5) return undefined;
  const display = `${Math.round(px * 100) / 100}px`;
  if (ctx.allowPx.some((a) => Math.abs(a - abs) <= ctx.pxTolerance)) return { ok: true, display };
  const scale = ctx.tokens.values.filter((t) => t.category === category && t.px !== undefined);
  if (category === 'radius' && abs >= 999 && scale.some((t) => (t.px ?? 0) >= 999)) return { ok: true, display };
  if (scale.some((t) => Math.abs((t.px ?? 0) - abs) <= ctx.pxTolerance)) return { ok: true, display };
  const unit = ctx.tokens.spacingUnit;
  if (category === 'spacing' && unit) {
    const multiple = abs / unit;
    if (Math.abs(multiple * 2 - Math.round(multiple * 2)) * unit <= ctx.pxTolerance) return { ok: true, display };
  }
  let best: TokenValue | undefined;
  for (const t of scale) if (!best || Math.abs((t.px ?? 0) - abs) < Math.abs((best.px ?? 0) - abs)) best = t;
  return { ok: false, display, nearest: best ? `${best.name} (${best.px}px)` : undefined };
}

export function hasCategory(tokens: TokenSet, category: TokenCategory): boolean {
  if (category === 'spacing' && tokens.spacingUnit) return true;
  return tokens.values.some((t) => t.category === category);
}

const PROPERTY_CATEGORY: Record<TokenProperty, TokenCategory> = {
  color: 'color',
  'background-color': 'color',
  'border-color': 'color',
  spacing: 'spacing',
  radius: 'radius',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'font-family': 'fontFamily',
  'line-height': 'lineHeight',
};

export interface AuditOptions {
  properties: TokenProperty[];
  colorTolerance: number;
  pxTolerance: number;
  allow: string[];
  /** Only audit elements intersecting these boxes (CSS px). Undefined = whole page. */
  regions?: Box[];
}

/** All (property, value) pairs on a page that are not covered by tokens. */
export function auditSnapshot(snapshot: StyleSnapshot, tokens: TokenSet, opts: AuditOptions): Finding[] {
  const ctx: AuditContext = {
    tokens,
    colors: snapshot.colors,
    colorTolerance: opts.colorTolerance,
    pxTolerance: opts.pxTolerance,
    allowColors: opts.allow.map((a) => snapshot.colors[a] ?? parseCssColor(a)).filter((c): c is RGBAValue => Boolean(c)),
    allowPx: opts.allow.map((a) => toPx(a)).filter((n): n is number => n !== undefined),
    allowFamilies: opts.allow.map(firstFamily),
  };
  const active = opts.properties.filter((p) => hasCategory(tokens, PROPERTY_CATEGORY[p]));
  const findings: Finding[] = [];
  const push = (property: TokenProperty, selector: string, result: { ok: boolean; display: string; nearest?: string } | undefined) => {
    if (result && !result.ok) findings.push({ property, value: result.display, selector, nearest: result.nearest });
  };
  for (const el of snapshot.elements) {
    if (opts.regions && !opts.regions.some((r) => intersects(el.box, r))) continue;
    const s = el.styles;
    for (const property of active) {
      switch (property) {
        case 'color':
          if (el.text) push(property, el.selector, checkColor(s.color, ctx));
          break;
        case 'background-color':
          push(property, el.selector, checkColor(s.backgroundColor, ctx));
          break;
        case 'border-color':
          for (const c of s.borderColor) push(property, el.selector, checkColor(c, ctx));
          break;
        case 'spacing': {
          const margins = el.autoMarginX ? [s.margin[0], s.margin[2]] : s.margin;
          for (const v of new Set([...margins, ...s.padding, ...s.gap])) push(property, el.selector, checkPx(v, 'spacing', ctx));
          break;
        }
        case 'radius':
          for (const v of new Set(s.radius)) push(property, el.selector, checkPx(v, 'radius', ctx));
          break;
        case 'font-size':
          if (el.text) push(property, el.selector, checkPx(s.fontSize, 'fontSize', ctx));
          break;
        case 'line-height':
          if (el.text) push(property, el.selector, checkPx(s.lineHeight, 'lineHeight', ctx));
          break;
        case 'font-weight':
          if (el.text) {
            const w = Number(s.fontWeight);
            const weights = tokens.values.filter((t) => t.category === 'fontWeight').map((t) => t.weight);
            if (Number.isFinite(w) && !weights.includes(w)) {
              const nearest = tokens.values.filter((t) => t.category === 'fontWeight').sort((a, b) => Math.abs((a.weight ?? 0) - w) - Math.abs((b.weight ?? 0) - w))[0];
              findings.push({ property, value: String(w), selector: el.selector, nearest: nearest ? `${nearest.name} (${nearest.weight})` : undefined });
            }
          }
          break;
        case 'font-family':
          if (el.text) {
            const fam = firstFamily(s.fontFamily);
            const families = tokens.values.filter((t) => t.category === 'fontFamily').map((t) => t.family);
            if (fam && !families.includes(fam) && !ctx.allowFamilies.includes(fam)) findings.push({ property, value: fam, selector: el.selector });
          }
          break;
      }
    }
  }
  return findings;
}

/** Merges per-capture findings into one row per (property, value), flagging values the base page never used. */
export function aggregateFindings(
  perCapture: Array<{ capture: string; findings: Finding[]; baseValues?: Set<string> }>,
  maxSelectors = 4,
): AggregatedFinding[] {
  const rows = new Map<string, AggregatedFinding & { selectorSet: Set<string> }>();
  for (const { capture, findings, baseValues } of perCapture) {
    for (const f of findings) {
      const key = `${f.property}|${f.value}`;
      let row = rows.get(key);
      if (!row) {
        row = { property: f.property, value: f.value, count: 0, selectors: [], captures: [], nearest: f.nearest, isNew: false, selectorSet: new Set() };
        rows.set(key, row);
      }
      row.selectorSet.add(f.selector);
      row.count = row.selectorSet.size;
      if (!row.captures.includes(capture)) row.captures.push(capture);
      if (!baseValues || !baseValues.has(key)) row.isNew = true;
    }
  }
  return [...rows.values()]
    .map(({ selectorSet, ...row }) => ({ ...row, selectors: [...selectorSet].slice(0, maxSelectors) }))
    .sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.count - a.count);
}

export function findingKeys(findings: Finding[]): Set<string> {
  return new Set(findings.map((f) => `${f.property}|${f.value}`));
}

export function tokenColorStrings(tokens: TokenSet): string[] {
  return [...new Set(tokens.values.filter((t) => t.category === 'color').map((t) => t.raw))];
}
