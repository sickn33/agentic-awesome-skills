import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import gifenc from 'gifenc';
import type { Page } from 'playwright';
import type { PNG } from 'pngjs';
import type { Step } from './config.js';
import { COLORS, composeRow, createImage, decodePng, resizeToWidth } from './image.js';
import { runSteps } from './steps.js';

const { GIFEncoder, applyPalette, quantize } = gifenc;

export interface RawFrame {
  /** Milliseconds since recording started. */
  t: number;
  data: Buffer;
}

/**
 * Records the page with the Chrome DevTools screencast while `steps` run. Frames arrive only when
 * something repaints, each with its own timestamp, so timing survives slow encoding.
 */
export async function recordFrames(
  page: Page,
  steps: Step[],
  opts: { durationMs: number; width: number; height: number; timeoutMs: number; beforeSteps?: () => Promise<void> },
): Promise<{ frames: RawFrame[]; skipped: string[] }> {
  const cdp = await page.context().newCDPSession(page);
  const frames: RawFrame[] = [];
  const start = Date.now();
  cdp.on('Page.screencastFrame', (event: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
    const stamp = event.metadata.timestamp ? event.metadata.timestamp * 1000 : Date.now();
    const t = Math.abs(stamp - Date.now()) < 5000 ? stamp - start : Date.now() - start;
    frames.push({ t: Math.max(0, t), data: Buffer.from(event.data, 'base64') });
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: opts.width, maxHeight: opts.height });
  let skipped: string[] = [];
  try {
    if (opts.beforeSteps) await opts.beforeSteps();
    else await page.waitForTimeout(150);
    skipped = await runSteps(page, steps, { timeoutMs: opts.timeoutMs, skipMissing: true });
    const remaining = opts.durationMs - (Date.now() - start);
    if (remaining > 0) await page.waitForTimeout(remaining);
  } finally {
    await cdp.send('Page.stopScreencast').catch(() => undefined);
    await cdp.detach().catch(() => undefined);
  }
  return { frames, skipped };
}

/** Picks, for each output tick, the latest frame shown at that time. */
export function resample(frames: RawFrame[], fps: number, durationMs: number): number[] {
  if (frames.length === 0) return [];
  const sorted = frames.map((f, i) => ({ t: f.t, i })).sort((a, b) => a.t - b.t);
  const count = Math.max(1, Math.round((durationMs / 1000) * fps));
  const picks: number[] = [];
  let cursor = 0;
  for (let n = 0; n < count; n++) {
    const tick = (n * 1000) / fps;
    while (cursor + 1 < sorted.length && sorted[cursor + 1].t <= tick) cursor++;
    picks.push(sorted[cursor].i);
  }
  return picks;
}

/**
 * Number of visually distinct frames (capped at `cap`). The screencast only sends frames on repaint,
 * so a still page yields one; byte-identical frames are skipped before decoding.
 */
export function distinctFrames(frames: RawFrame[], cap = 3): number {
  const byBytes = new Map<string, Buffer>();
  for (const f of frames) {
    const key = createHash('sha1').update(f.data).digest('base64');
    if (!byBytes.has(key)) byBytes.set(key, f.data);
  }
  if (byBytes.size <= 1) return byBytes.size;
  const seen = new Set<string>();
  for (const data of byBytes.values()) {
    try {
      seen.add(createHash('sha1').update(decodePng(data).data).digest('base64'));
    } catch {
      seen.add(`raw:${seen.size}`);
    }
    if (seen.size >= cap) break;
  }
  return seen.size;
}

/** Report warning for clips in which nothing moved. */
export function motionWarning(frames: { base: number; head: number }): string | undefined {
  const still = (n: number) => n <= 1;
  if (still(frames.base) && still(frames.head)) return 'no motion detected: the clip has a single frame on both sides (nothing animated during these steps)';
  if (still(frames.head)) return 'no motion detected on head (single frame); base animates';
  if (still(frames.base)) return 'no motion detected on base (single frame); head animates';
  return undefined;
}

export interface MotionClip {
  frames: RawFrame[];
  error?: string;
}

/** Encodes paired before/after frames as one side-by-side looping GIF. Identical frames are merged. */
export function encodeSideBySideGif(
  before: RawFrame[],
  after: RawFrame[],
  opts: { fps: number; durationMs: number; scale: number; labels: { before: string; after: string } },
): Buffer {
  const pickBefore = resample(before, opts.fps, opts.durationMs);
  const pickAfter = resample(after, opts.fps, opts.durationMs);
  const count = Math.max(pickBefore.length, pickAfter.length);
  const cache = new Map<string, PNG>();
  const load = (side: 'b' | 'a', frames: RawFrame[], index: number | undefined, fallback: { width: number; height: number }): PNG => {
    if (index === undefined) return createImage(fallback.width, fallback.height, COLORS.pad);
    const key = `${side}${index}`;
    let png = cache.get(key);
    if (!png) {
      png = decodePng(frames[index].data);
      if (opts.scale < 1) png = resizeToWidth(png, Math.round(png.width * opts.scale));
      cache.set(key, png);
    }
    return png;
  };
  const gif = GIFEncoder();
  const delay = Math.round(1000 / opts.fps);
  let pending: { index: Uint8Array; width: number; height: number; palette: number[][]; delay: number; key: string } | undefined;
  const flush = () => {
    if (pending) gif.writeFrame(pending.index, pending.width, pending.height, { palette: pending.palette, delay: pending.delay, repeat: 0 });
  };
  let reference = { width: 640, height: 400 };
  for (let n = 0; n < count; n++) {
    const b = load('b', before, pickBefore[n] ?? pickBefore[pickBefore.length - 1], reference);
    reference = { width: b.width, height: b.height };
    const a = load('a', after, pickAfter[n] ?? pickAfter[pickAfter.length - 1], reference);
    const key = `${pickBefore[n] ?? 'x'}:${pickAfter[n] ?? 'x'}`;
    if (pending && pending.key === key) {
      pending.delay += delay;
      continue;
    }
    flush();
    const frame = composeRow(
      [
        { image: b, label: opts.labels.before, accent: COLORS.before },
        { image: a, label: opts.labels.after, accent: COLORS.after },
      ],
      { scale: Math.max(2, Math.round(b.width / 200)) },
    );
    const palette = quantize(frame.data, 256);
    pending = { index: applyPalette(frame.data, palette), width: frame.width, height: frame.height, palette, delay, key };
  }
  flush();
  gif.finish();
  return Buffer.from(gif.bytes());
}

export function writeFile(file: string, data: Buffer): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
}

export function moveFile(from: string, to: string): void {
  mkdirSync(path.dirname(to), { recursive: true });
  renameSync(from, to);
}

/**
 * Changed lines that can change how something moves: CSS transitions, animations and keyframes,
 * transforms, interaction states, motion libraries and animation timing. Deliberately broad: a
 * false positive only records a clip that was not needed.
 */
const ANIMATION_LINE =
  /\b(?:transition|animation|animate|keyframes|transform|translate[XYZ3d]*|rotate|scale[XYZ3d]*|will-change|opacity|cubic-bezier|ease(?:-in|-out|-in-out)?|steps\(|requestAnimationFrame|motion|framer-motion|gsap|lottie|spring|duration|delay)\b|@keyframes|:hover|:focus|:active|:focus-visible|:focus-within|\[open\]|data-state/i;

/** Packages whose change can change motion everywhere. */
const ANIMATION_PACKAGES = /^(?:framer-motion|motion|gsap|@react-spring\/.*|react-spring|lottie-.*|@lottiefiles\/.*|animejs|@formkit\/auto-animate|tailwindcss-animate|tw-animate-css)$/;

export function isAnimationPackage(name: string): boolean {
  return ANIMATION_PACKAGES.test(name);
}

/** Class, id and attribute names and values in the selectors a motion script hovers, clicks or waits for. */
export function stepTokens(steps: Step[]): string[] {
  const tokens = new Set<string>();
  for (const step of steps) {
    for (const selector of Object.values(step).filter((v): v is string => typeof v === 'string')) {
      for (const m of selector.matchAll(/[.#]([\w-]+)/g)) tokens.add(m[1]);
      for (const m of selector.matchAll(/\[([\w-]+)(?:[~|^$*]?=\s*["']?([^"'\]]+)["']?)?\]/g)) {
        tokens.add(m[1]);
        if (m[2]) tokens.add(m[2].trim());
      }
    }
  }
  return [...tokens];
}

/**
 * Whether any changed line of a file can change the clip: it touches motion, or names an element
 * the motion script interacts with (a resized button changes its hover animation). Binary assets
 * (images, fonts) never do.
 */
export function touchesAnimation(file: string, lines: string[], tokens: string[] = []): boolean {
  if (/\.(?:svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i.test(file)) return false;
  const named = tokens.map((t) => new RegExp(`(?:^|[^\\w-])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^\\w-]|$)`));
  return lines.some((line) => ANIMATION_LINE.test(line) || named.some((re) => re.test(line)));
}

/** A looping GIF that switches between still frames, each shown for `delayMs`. */
export function encodeBlinkGif(frames: PNG[], delayMs = 900): Buffer {
  const gif = GIFEncoder();
  for (const frame of frames) {
    const palette = quantize(frame.data, 256);
    gif.writeFrame(applyPalette(frame.data, palette), frame.width, frame.height, { palette, delay: delayMs, repeat: 0 });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}
