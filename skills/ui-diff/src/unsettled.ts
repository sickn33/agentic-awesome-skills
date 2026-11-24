import { findRegions } from './diff.js';
import { decodePng, unionBox, type Box } from './image.js';

/** An area that kept changing between screenshots of one page load. */
export interface UnsettledRegion {
  /** Smallest element covering the area, when one more specific than <body> does. */
  selector?: string;
  /** CSS px, in screenshot coordinates. */
  box: Box;
}

/** Areas (device px) whose pixels differ between two screenshots of the same page. */
export function changedRegions(a: Buffer, b: Buffer, max = 3): Box[] {
  const before = decodePng(a);
  const after = decodePng(b);
  if (before.width !== after.width || before.height !== after.height) return [];
  const { width, height } = before;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (before.data[p] !== after.data[p] || before.data[p + 1] !== after.data[p + 1] || before.data[p + 2] !== after.data[p + 2] || before.data[p + 3] !== after.data[p + 3]) mask[i] = 1;
  }
  return findRegions(mask, width, height)
    .slice(0, max)
    .map((cell) => {
      // findRegions snaps to its grid; tighten to the changed pixels so the box matches an element.
      let [x0, y0, x1, y1] = [cell.x + cell.width, cell.y + cell.height, cell.x, cell.y];
      for (let y = cell.y; y < cell.y + cell.height; y++) {
        for (let x = cell.x; x < cell.x + cell.width; x++) {
          if (!mask[y * width + x]) continue;
          if (x < x0) x0 = x;
          if (x >= x1) x1 = x + 1;
          if (y < y0) y0 = y;
          if (y >= y1) y1 = y + 1;
        }
      }
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    });
}

/** The "page did not settle" warning, naming what kept changing when that is known. */
export function unsettledWarning(label: string, record: { unsettled?: UnsettledRegion[]; frozeTimers?: boolean; stable: boolean }): string {
  const regions = record.unsettled ?? [];
  if (regions.length === 0) return `${label}: page did not settle (animations or live data?); mask the changing area (capture.mask), or keep freeze.clock on if it shows the time`;
  const where = regions.map((r) => `${r.selector ?? 'an area'} (${r.box.width}×${r.box.height} px at ${r.box.x},${r.box.y})`).join(', ');
  const selectors = [...new Set(regions.map((r) => r.selector).filter((s): s is string => Boolean(s)))];
  const frozen = record.frozeTimers && record.stable ? '; timers were paused for the screenshot, but where it stops depends on load timing' : '';
  const mask = selectors.length ? `mask it with "capture": { "mask": ${JSON.stringify(selectors)} }` : 'mask it (capture.mask)';
  return `${label}: page did not settle: ${where} kept changing between screenshots${frozen}. To compare reliably, ${mask} or, if it shows the time, keep freeze.clock on`;
}

/**
 * Whether every changed area of a base/head diff (device px) lies inside an area that kept changing by itself.
 * Boxes of the same element are joined across both sides, since it may stop at a different spot on each.
 */
export function onlyInUnsettled(diffRegions: Box[], unsettled: UnsettledRegion[], scale: number): boolean {
  if (diffRegions.length === 0 || unsettled.length === 0) return false;
  // Diff regions are snapped to an 8 px (× scale) grid, so they can stick out of the element by almost a cell.
  const margin = 10 * scale;
  const joined = new Map<string, Box>();
  const loose: Box[] = [];
  for (const u of unsettled) {
    if (!u.selector) loose.push(u.box);
    else joined.set(u.selector, joined.has(u.selector) ? unionBox(joined.get(u.selector)!, u.box) : u.box);
  }
  const areas = [...joined.values(), ...loose].map((b) => ({ x: b.x * scale, y: b.y * scale, width: b.width * scale, height: b.height * scale }));
  return diffRegions.every((d) =>
    areas.some((a) => d.x >= a.x - margin && d.y >= a.y - margin && d.x + d.width <= a.x + a.width + margin && d.y + d.height <= a.y + a.height + margin),
  );
}
