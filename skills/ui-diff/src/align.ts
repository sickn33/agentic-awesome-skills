import { createHash } from 'node:crypto';
import type { PNG } from 'pngjs';

/** A run of rows that render identically on both sides, `dy` device pixels apart (after − before). */
export interface RowBlock {
  beforeY: number;
  afterY: number;
  height: number;
  dy: number;
}

export interface RowAlignment {
  /** For each after row: the before row it is compared with, or -1 when it has no counterpart. */
  source: Int32Array;
  /** Matched runs in page order (dy may be 0). */
  blocks: RowBlock[];
  /** Before rows with no after counterpart (content removed), anchored at an after row. */
  removed: Array<{ afterY: number; rows: number }>;
}

interface RowInfo {
  hashes: string[];
  /** Rows that hold more than one colour; uniform rows are never used as anchors. */
  informative: Uint8Array;
}

function rowInfo(png: PNG): RowInfo {
  const stride = png.width * 4;
  const hashes: string[] = new Array(png.height);
  const informative = new Uint8Array(png.height);
  for (let y = 0; y < png.height; y++) {
    const row = png.data.subarray(y * stride, (y + 1) * stride);
    hashes[y] = createHash('sha1').update(row).digest('base64');
    for (let i = 4; i < stride; i++) {
      if (row[i] !== row[i & 3]) {
        informative[y] = 1;
        break;
      }
    }
  }
  return { hashes, informative };
}

/** Rows count as the same content when they are identical or differ in only a handful of pixels (anti-aliasing). */
function similarRows(a: PNG, ay: number, b: PNG, by: number, ha: string, hb: string): boolean {
  if (ha === hb) return true;
  const width = a.width;
  const budget = Math.max(1, Math.floor(width * 0.003));
  const oa = ay * width * 4;
  const ob = by * width * 4;
  let off = 0;
  for (let x = 0; x < width; x++) {
    const i = x * 4;
    const d = Math.abs(a.data[oa + i] - b.data[ob + i]) + Math.abs(a.data[oa + i + 1] - b.data[ob + i + 1]) + Math.abs(a.data[oa + i + 2] - b.data[ob + i + 2]) + Math.abs(a.data[oa + i + 3] - b.data[ob + i + 3]);
    if (d > 48 && ++off > budget) return false;
  }
  return true;
}

/** Longest increasing subsequence on `before` (pairs arrive sorted by `after`). */
function longestIncreasing(pairs: Array<[number, number]>): Array<[number, number]> {
  const tails: number[] = [];
  const prev = new Int32Array(pairs.length).fill(-1);
  for (let k = 0; k < pairs.length; k++) {
    const v = pairs[k][0];
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pairs[tails[mid]][0] < v) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[k] = tails[lo - 1];
    tails[lo] = k;
  }
  const out: Array<[number, number]> = [];
  for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = prev[k]) out.push(pairs[k]);
  return out.reverse();
}

/**
 * Aligns the rows of two screenshots of equal width, so content that merely moved up or down
 * (a taller hero pushing the sections below it) is compared with itself instead of with
 * whatever now sits at the same y.
 *
 * Rows that are unique on both sides anchor the alignment (kept in order with a longest
 * increasing subsequence, as in patience diff); each anchor grows up and down while the rows
 * keep matching. Rows between matched runs are compared top-aligned, like a plain diff.
 */
export function alignRows(before: PNG, after: PNG): RowAlignment {
  if (before.width !== after.width) throw new Error('alignRows needs images of equal width');
  const nb = before.height;
  const na = after.height;
  const ib = rowInfo(before);
  const ia = rowInfo(after);

  const countB = new Map<string, number>();
  const posB = new Map<string, number>();
  for (let y = 0; y < nb; y++) {
    if (!ib.informative[y]) continue;
    countB.set(ib.hashes[y], (countB.get(ib.hashes[y]) ?? 0) + 1);
    posB.set(ib.hashes[y], y);
  }
  const countA = new Map<string, number>();
  for (let y = 0; y < na; y++) if (ia.informative[y]) countA.set(ia.hashes[y], (countA.get(ia.hashes[y]) ?? 0) + 1);
  const candidates: Array<[number, number]> = [];
  for (let y = 0; y < na; y++) {
    const h = ia.hashes[y];
    if (ia.informative[y] && countA.get(h) === 1 && countB.get(h) === 1) candidates.push([posB.get(h)!, y]);
  }
  const anchors = longestIncreasing(candidates);

  const mB = new Int32Array(nb).fill(-1);
  const mA = new Int32Array(na).fill(-1);
  for (const [b, a] of anchors) {
    mB[b] = a;
    mA[a] = b;
  }
  const same = (b: number, a: number) => similarRows(before, b, after, a, ib.hashes[b], ia.hashes[a]);
  for (const [b0, a0] of anchors) {
    for (let b = b0 + 1, a = a0 + 1; b < nb && a < na && mB[b] < 0 && mA[a] < 0 && same(b, a); b++, a++) {
      mB[b] = a;
      mA[a] = b;
    }
    for (let b = b0 - 1, a = a0 - 1; b >= 0 && a >= 0 && mB[b] < 0 && mA[a] < 0 && same(b, a); b--, a--) {
      mB[b] = a;
      mA[a] = b;
    }
  }

  const blocks: RowBlock[] = [];
  for (let a = 0; a < na; a++) {
    if (mA[a] < 0) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.afterY + last.height === a && last.beforeY + last.height === mA[a]) last.height++;
    else blocks.push({ beforeY: mA[a], afterY: a, height: 1, dy: a - mA[a] });
  }

  const source = new Int32Array(na).fill(-1);
  const removed: RowAlignment['removed'] = [];
  let pb = 0;
  let pa = 0;
  const fillGap = (endB: number, endA: number) => {
    const lenB = Math.max(0, endB - pb);
    const lenA = Math.max(0, endA - pa);
    for (let t = 0; t < lenA; t++) source[pa + t] = t < lenB ? pb + t : -1;
    if (lenB > lenA) removed.push({ afterY: pa + lenA, rows: lenB - lenA });
  };
  for (const block of blocks) {
    fillGap(block.beforeY, block.afterY);
    for (let t = 0; t < block.height; t++) source[block.afterY + t] = block.beforeY + t;
    pb = block.beforeY + block.height;
    pa = block.afterY + block.height;
  }
  fillGap(nb, na);
  return { source, blocks, removed };
}

/** Shifted runs worth reporting: dy ≠ 0 and at least `minHeight` rows; neighbours with the same dy are merged. */
export function shiftedBlocks(blocks: RowBlock[], minHeight: number): RowBlock[] {
  const out: RowBlock[] = [];
  for (const block of blocks) {
    if (block.dy === 0) continue;
    const last = out[out.length - 1];
    if (last && last.dy === block.dy) {
      last.height = block.afterY + block.height - last.afterY;
      continue;
    }
    out.push({ ...block });
  }
  return out.filter((b) => b.height >= minHeight);
}
