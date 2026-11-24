import pixelmatch from 'pixelmatch';
import type { PNG } from 'pngjs';
import { alignRows, shiftedBlocks, type RowBlock } from './align.js';
import { clampBox, COLORS, composeRow, createImage, crop, fadeToGray, fillRect, intersects, padTo, parseHexColor, resizeToWidth, strokeRect, unionBox, type Box, type RGBA } from './image.js';

export interface DiffOptions {
  threshold: number;
  includeAA: boolean;
  minChangedPixels: number;
  highlight: string;
  /** Device pixel ratio of the screenshots; region sizes scale with it. */
  scale?: number;
  /** Align rows first so content that only moved vertically is not counted as changed (default true). */
  alignShifts?: boolean;
  /** When set, only changes inside these boxes (device px) count; a size change alone does not. */
  only?: Box[];
}

export interface DiffOutcome {
  width: number;
  height: number;
  changedPixels: number;
  ratio: number;
  changed: boolean;
  sizeChanged: boolean;
  before: { width: number; height: number };
  after: { width: number; height: number };
  regions: Box[];
  /** Runs of identical content that moved vertically (device px; dy = after − before). Not counted as changed. */
  shifted: RowBlock[];
  /** Before rows that have no counterpart on the after side (content removed). */
  removedRows: number;
  /** Padded inputs (same size) — used to cut aligned crops. */
  paddedBefore: PNG;
  paddedAfter: PNG;
  diffImage: PNG;
}

function area(b: Box): number {
  return b.width * b.height;
}

/** Merges boxes that touch or sit within `gap` px of each other. */
export function mergeBoxes(input: Box[], gap: number): Box[] {
  let boxes = input.slice();
  let merged = true;
  while (merged) {
    merged = false;
    const next: Box[] = [];
    for (const box of boxes) {
      const hit = next.findIndex((other) => intersects(box, other, gap));
      if (hit >= 0) {
        next[hit] = unionBox(next[hit], box);
        merged = true;
      } else {
        next.push(box);
      }
    }
    boxes = next;
  }
  return boxes;
}

/** Groups changed pixels into rectangles: a coarse grid, 8-connected components, then proximity merging. */
export function findRegions(mask: Uint8Array, width: number, height: number, cell = 8, gap = 24): Box[] {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const hot = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const rowOffset = ((y / cell) | 0) * cols;
    const base = y * width;
    for (let x = 0; x < width; x++) if (mask[base + x]) hot[rowOffset + ((x / cell) | 0)] = 1;
  }
  const seen = new Uint8Array(cols * rows);
  const boxes: Box[] = [];
  const stack: number[] = [];
  for (let start = 0; start < hot.length; start++) {
    if (!hot[start] || seen[start]) continue;
    let minC = cols;
    let maxC = -1;
    let minR = rows;
    let maxR = -1;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const idx = stack.pop()!;
      const r = (idx / cols) | 0;
      const c = idx - r * cols;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      for (let dr = -1; dr <= 1; dr++) {
        const nr = r + dr;
        if (nr < 0 || nr >= rows) continue;
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc;
          if (nc < 0 || nc >= cols) continue;
          const n = nr * cols + nc;
          if (hot[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    boxes.push(clampBox({ x: minC * cell, y: minR * cell, width: (maxC - minC + 1) * cell, height: (maxR - minR + 1) * cell }, width, height));
  }
  return mergeBoxes(boxes, gap).sort((a, b) => area(b) - area(a));
}

const SHIFT_BAND: RGBA = [59, 130, 246, 255];

/** Builds the "before" rows each after row should be compared with (row alignment), padded where there is none. */
function alignedBefore(before: PNG, after: PNG, source: Int32Array, pad: RGBA): PNG {
  const out = createImage(after.width, after.height, pad);
  const stride = after.width * 4;
  for (let y = 0; y < after.height; y++) {
    const from = source[y];
    if (from >= 0) before.data.copy(out.data, y * stride, from * stride, (from + 1) * stride);
  }
  return out;
}

export function diffPngs(before: PNG, after: PNG, opts: DiffOptions): DiffOutcome {
  const scale = opts.scale ?? 1;
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const a = padTo(before, width, height, COLORS.pad);
  const b = padTo(after, width, height, COLORS.pad);
  const mask = new Uint8Array(width * height);
  let changedPixels: number;
  let shifted: RowBlock[] = [];
  let removedRows = 0;
  const removedBoxes: Box[] = [];
  const pixelOpts = { threshold: opts.threshold, includeAA: opts.includeAA, diffMask: true, diffColor: [255, 0, 0] as [number, number, number] };

  if ((opts.alignShifts ?? true) && before.width === after.width) {
    const alignment = alignRows(before, after);
    const reference = alignedBefore(before, after, alignment.source, COLORS.pad);
    const out = new Uint8Array(after.width * after.height * 4);
    pixelmatch(reference.data, after.data, out, after.width, after.height, pixelOpts);
    for (let i = 0; i < after.width * after.height; i++) mask[i] = out[i * 4 + 3] > 0 ? 1 : 0;
    // Inserted rows have no counterpart: they are new content even where they resemble the padding.
    for (let y = 0; y < after.height; y++) if (alignment.source[y] < 0) mask.fill(1, y * width, (y + 1) * width);
    for (const gap of alignment.removed) {
      removedRows += gap.rows;
      if (gap.afterY >= after.height) {
        // Content removed at the bottom: the padded after side shows nothing there.
        for (let y = after.height; y < height; y++) mask.fill(1, y * width, (y + 1) * width);
      } else {
        const band = Math.max(2, Math.round(2 * scale));
        removedBoxes.push(clampBox({ x: 0, y: Math.max(0, gap.afterY - band), width, height: band * 2 }, width, height));
      }
    }
    shifted = shiftedBlocks(alignment.blocks, Math.max(4, Math.round(4 * scale)));
    changedPixels = 0;
    for (let i = 0; i < mask.length; i++) changedPixels += mask[i];
  } else {
    const maskOut = new Uint8Array(width * height * 4);
    changedPixels = pixelmatch(a.data, b.data, maskOut, width, height, pixelOpts);
    for (let i = 0; i < mask.length; i++) mask[i] = maskOut[i * 4 + 3] > 0 ? 1 : 0;
  }
  let removedPixels = removedBoxes.length ? removedRows * width : 0;
  if (opts.only) {
    const allowed = new Uint8Array(width * height);
    for (const box of opts.only) {
      const b = clampBox(box, width, height);
      for (let y = b.y; y < b.y + b.height; y++) allowed.fill(1, y * width + b.x, y * width + b.x + b.width);
    }
    changedPixels = 0;
    for (let i = 0; i < mask.length; i++) {
      mask[i] &= allowed[i];
      changedPixels += mask[i];
    }
    const kept = removedBoxes.filter((r) => opts.only!.some((b) => intersects(r, b)));
    if (kept.length < removedBoxes.length) removedPixels = 0;
    removedBoxes.splice(0, removedBoxes.length, ...kept);
  }
  const sizeChanged = before.width !== after.width || before.height !== after.height;
  const changed = changedPixels + removedPixels >= Math.max(1, opts.minChangedPixels) || (sizeChanged && !opts.only);
  const regions = changed
    ? mergeBoxes([...findRegions(mask, width, height, Math.round(8 * scale), Math.round(24 * scale)), ...removedBoxes], Math.round(24 * scale)).sort((x, y) => area(y) - area(x))
    : [];

  const highlight: RGBA = parseHexColor(opts.highlight);
  const diffImage = fadeToGray(b, 0.28);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const o = i * 4;
    diffImage.data[o] = highlight[0];
    diffImage.data[o + 1] = highlight[1];
    diffImage.data[o + 2] = highlight[2];
    diffImage.data[o + 3] = 255;
  }
  const stroke = Math.max(2, Math.round(2 * scale));
  for (const region of regions) strokeRect(diffImage, region, highlight, stroke);
  // A slim band on the left edge marks content that only moved.
  const bandWidth = Math.max(3, Math.round(3 * scale));
  for (const block of shifted) fillRect(diffImage, clampBox({ x: 0, y: block.afterY, width: bandWidth, height: block.height }, width, height), SHIFT_BAND);

  return {
    width,
    height,
    changedPixels,
    ratio: changedPixels / (width * height),
    changed,
    sizeChanged,
    before: { width: before.width, height: before.height },
    after: { width: after.width, height: after.height },
    regions,
    shifted,
    removedRows,
    paddedBefore: a,
    paddedAfter: b,
    diffImage,
  };
}

/**
 * Picks up to `max` crop boxes around the largest changed regions, padded and grown to a
 * readable minimum size. Returns [] when the change covers most of the page anyway.
 */
export function focusBoxes(regions: Box[], width: number, height: number, opts: { max: number; padding: number; scale: number }): Box[] {
  if (opts.max === 0 || regions.length === 0) return [];
  const minW = Math.min(width, Math.round(420 * opts.scale));
  const minH = Math.min(height, Math.round(220 * opts.scale));
  const grown = regions.map((r) => {
    let box = { x: r.x - opts.padding, y: r.y - opts.padding, width: r.width + 2 * opts.padding, height: r.height + 2 * opts.padding };
    if (box.width < minW) box = { ...box, x: box.x - (minW - box.width) / 2, width: minW };
    if (box.height < minH) box = { ...box, y: box.y - (minH - box.height) / 2, height: minH };
    if (box.x < 0) box.x = 0;
    if (box.y < 0) box.y = 0;
    if (box.x + box.width > width) box.x = Math.max(0, width - box.width);
    if (box.y + box.height > height) box.y = Math.max(0, height - box.height);
    return clampBox(box, width, height);
  });
  const merged = mergeBoxes(grown, 0).sort((a, b) => area(b) - area(a));
  const picked = merged.slice(0, opts.max);
  if (picked.length === 1 && area(picked[0]) > 0.7 * width * height) return [];
  return picked;
}

export function composeCompare(
  diff: DiffOutcome,
  labels: { before: string; after: string; diff: string },
  opts: { box?: Box; maxWidth?: number; upscaleBelow?: number },
): PNG {
  let before = diff.paddedBefore;
  let after = diff.paddedAfter;
  let overlay = diff.diffImage;
  if (opts.box) {
    before = crop(before, opts.box);
    after = crop(after, opts.box);
    overlay = crop(overlay, opts.box);
  }
  if (opts.upscaleBelow && before.width < opts.upscaleBelow) {
    const target = Math.min(opts.upscaleBelow, before.width * 2);
    before = resizeToWidth(before, target);
    after = resizeToWidth(after, target);
    overlay = resizeToWidth(overlay, target);
  }
  return composeRow(
    [
      { image: before, label: labels.before, accent: COLORS.before },
      { image: after, label: labels.after, accent: COLORS.after },
      { image: overlay, label: labels.diff, accent: COLORS.diff },
    ],
    { maxWidth: opts.maxWidth },
  );
}

/** About the width a PR comment column shows an image at, in px. */
const SHOWN_WIDTH = 900;

/** The crop box narrowed to the focus elements it touches, so a crop never shows unfocused neighbours. */
export function clipToFocus(box: Box, focus: Box[] | undefined): Box {
  const touching = (focus ?? []).filter((f) => intersects(f, box));
  if (touching.length === 0) return box;
  const bounds = touching.reduce(unionBox);
  const x = Math.max(box.x, bounds.x);
  const y = Math.max(box.y, bounds.y);
  const w = Math.min(box.x + box.width, bounds.x + bounds.width) - x;
  const h = Math.min(box.y + box.height, bounds.y + bounds.height) - y;
  return w > 0 && h > 0 ? { x, y, width: w, height: h } : box;
}

/** Base and head crops of one area, each with the changed regions inside it outlined. */
function outlinedCrops(diff: DiffOutcome, box: Box, highlight: RGBA, scale: number, shrink = 1): [PNG, PNG] {
  const stroke = Math.max(2, Math.round(2 * scale * shrink));
  return [diff.paddedBefore, diff.paddedAfter].map((image) => {
    const out = crop(image, box);
    for (const region of diff.regions) {
      if (!intersects(region, box)) continue;
      strokeRect(out, clampBox({ x: region.x - box.x, y: region.y - box.y, width: region.width, height: region.height }, out.width, out.height), highlight, stroke);
    }
    return out;
  }) as [PNG, PNG];
}

/**
 * The still pair of a changed area: base | head side by side with the changed boxes outlined, for
 * readers who cannot compare a blinking image.
 */
export function composePair(diff: DiffOutcome, box: Box, labels: { before: string; after: string }, opts: { highlight: string; scale: number; maxWidth?: number; upscaleBelow?: number }): PNG {
  // Wide pairs are scaled down to fit maxWidth, and again to the width a PR comment shows them at;
  // a thicker outline stays visible after that.
  const shrink = Math.max(1, (2 * box.width) / Math.min(opts.maxWidth ?? Infinity, SHOWN_WIDTH));
  let [before, after] = outlinedCrops(diff, box, parseHexColor(opts.highlight), opts.scale, shrink);
  if (opts.upscaleBelow && before.width < opts.upscaleBelow) {
    const target = Math.min(opts.upscaleBelow, before.width * 2);
    before = resizeToWidth(before, target);
    after = resizeToWidth(after, target);
  }
  return composeRow(
    [
      { image: before, label: labels.before, accent: COLORS.before },
      { image: after, label: labels.after, accent: COLORS.after },
    ],
    { maxWidth: opts.maxWidth },
  );
}

/** The two frames of a blink GIF of one area: base, then head, labelled, the same size. */
export function blinkFrames(diff: DiffOutcome, box: Box, labels: { before: string; after: string }, opts: { highlight: string; scale: number; maxWidth: number }): [PNG, PNG] {
  const [before, after] = outlinedCrops(diff, box, parseHexColor(opts.highlight), opts.scale, Math.max(1, box.width / Math.min(opts.maxWidth, SHOWN_WIDTH)));
  const width = Math.min(before.width, opts.maxWidth);
  return [
    composeRow([{ image: resizeToWidth(before, width), label: labels.before, accent: COLORS.before }]),
    composeRow([{ image: resizeToWidth(after, width), label: labels.after, accent: COLORS.after }]),
  ];
}
