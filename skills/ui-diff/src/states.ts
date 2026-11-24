import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import type { Page } from 'playwright';
import { PNG } from 'pngjs';
import { inFocus, type ChangeGroup, type ElementChange, type ElementMatch, type MatchConfidence, type PropertyChange } from './elements.js';
import type { StyleSnapshot } from './tokens.js';

export type StateName = 'hover' | 'focus';

/** What a state can change, as recorded and compared: one readable value per property. */
export type StateStyles = Record<StateProperty, string>;
export const STATE_PROPERTIES = ['color', 'background', 'border-color', 'outline', 'box-shadow', 'transform', 'opacity', 'text-decoration', 'cursor'] as const;
export type StateProperty = (typeof STATE_PROPERTIES)[number];

/** One element in one state on one side. */
export interface StateShot {
  selector: string;
  state: StateName;
  styles: StateStyles;
  /** Crop around the element in that state, device px. */
  file: string;
}

/** The hover and focus states of one capture's interactive elements. */
export interface StateCapture {
  /** Interactive elements recorded in at least one state. */
  checked: number;
  /** Interactive elements not recorded, and states of checked ones that could not be reached. */
  skipped: number;
  /** Why, with how many: "outside the viewport", "hover: covered by another element"… */
  skippedWhy: Record<string, number>;
  /** Every checked element with its default-state values, by its element map selector. */
  targets: Array<{ selector: string; defaults: StateStyles }>;
  shots: StateShot[];
}

export interface StateOptions {
  hover: boolean;
  focus: boolean;
  maxElements: number;
  /** CSS px around an element in its crop. */
  padding: number;
  /** Selectors of the focus regions: what they match counts as interactive too. */
  focusSelectors: string[];
  /** Masked, hidden and ignored selectors: elements inside them are skipped. */
  masked: string[];
  /** Wait for web fonts after each state change. */
  fonts: boolean;
  /** Where the crops go, and their file name stem. */
  dir: string;
  id: string;
  /** A screenshot of a viewport area with the capture's masks and hidden selectors applied. */
  shoot: (clip: { x: number; y: number; width: number; height: number }) => Promise<Buffer>;
}

type InPage = {
  __uiDiff: { cssPath(e: Element): string; normalizeColors(list: string[]): Record<string, [number, number, number, number] | null> };
  __uiDiffStates?: Element[];
  __uiDiffStateStyles?: (el: Element) => StateStyles;
};

/** Defines the in-page helpers: the state values of an element, colors as hex. */
async function installHelpers(page: Page): Promise<void> {
  // Run from TypeScript through tsx, the functions below carry __name() calls for their inner
  // functions; the page has no such helper, so give it one that does nothing.
  await page.evaluate('globalThis.__name ??= (fn) => fn');
  await page.evaluate(() => {
    const w = window as unknown as InPage;
    const hex = (value: string, norm: Record<string, [number, number, number, number] | null>) => {
      const c = norm[value];
      if (!c) return value;
      const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
      return `#${h(c[0])}${h(c[1])}${h(c[2])}${c[3] < 1 ? h(c[3] * 255) : ''}`;
    };
    const COLOR = /rgba?\([^)]*\)|color\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)/g;
    w.__uiDiffStateStyles = (el: Element) => {
      const cs = getComputedStyle(el);
      const sides = ['Top', 'Right', 'Bottom', 'Left'] as const;
      const borders = sides.filter((s) => cs.getPropertyValue(`border-${s.toLowerCase()}-style`) !== 'none' && parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0).map((s) => cs.getPropertyValue(`border-${s.toLowerCase()}-color`));
      const colors = [cs.color, cs.backgroundColor, cs.outlineColor, ...borders, ...(cs.boxShadow.match(COLOR) ?? [])];
      const norm = w.__uiDiff.normalizeColors([...new Set(colors)]);
      const matrix = /^matrix\(([^)]+)\)$/.exec(cs.transform);
      let transform = cs.transform;
      if (matrix) {
        const [a, b, c, d, e, f] = matrix[1].split(',').map((v) => Number(v.trim()));
        if (b === 0 && c === 0) {
          const parts = [];
          if (a !== 1 || d !== 1) parts.push(a === d ? `scale(${+a.toFixed(3)})` : `scale(${+a.toFixed(3)}, ${+d.toFixed(3)})`);
          if (e || f) parts.push(`translate(${+e.toFixed(2)}px, ${+f.toFixed(2)}px)`);
          transform = parts.join(' ') || 'none';
        }
      }
      const outline = cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0 ? 'none' : `${cs.outlineWidth} ${cs.outlineStyle} ${hex(cs.outlineColor, norm)}${parseFloat(cs.outlineOffset) ? `, offset ${cs.outlineOffset}` : ''}`;
      return {
        color: hex(cs.color, norm),
        background: hex(cs.backgroundColor, norm),
        'border-color': borders.length ? [...new Set(borders.map((b) => hex(b, norm)))].join(' ') : 'none',
        outline,
        'box-shadow': cs.boxShadow.replace(COLOR, (m) => hex(m, norm)),
        transform,
        opacity: String(Math.round(Number(cs.opacity) * 100) / 100),
        'text-decoration': cs.textDecorationLine,
        cursor: cs.cursor,
      };
    };
  });
}

/** Interactive elements of the settled page, the ones to check first, with why the others are left out. */
async function findTargets(page: Page, opts: StateOptions): Promise<{ targets: Array<{ selector: string; defaults: StateStyles; x: number; y: number }>; skippedWhy: Record<string, number> }> {
  return page.evaluate(
    ({ max, focusSelectors, masked }) => {
      const w = window as unknown as InPage;
      const matches = (el: Element, sel: string) => {
        try {
          return el.matches(sel) || Boolean(el.closest(sel));
        } catch {
          return false;
        }
      };
      const all: Element[] = [];
      const walk = (root: Document | ShadowRoot) => {
        for (const el of root.querySelectorAll('*')) {
          all.push(el);
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(document);
      const INTERACTIVE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]';
      const skippedWhy: Record<string, number> = {};
      const skip = (why: string) => (skippedWhy[why] = (skippedWhy[why] ?? 0) + 1);
      const picked: Element[] = [];
      for (const el of all) {
        const interactive = el.matches(INTERACTIVE) || (el.hasAttribute('tabindex') && (el as HTMLElement).tabIndex >= 0) || focusSelectors.some((s) => { try { return el.matches(s); } catch { return false; } });
        if (!interactive) continue;
        // A link inside a button-like element is checked once, as the outer one.
        if (picked.some((p) => p.contains(el))) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) {
          skip('hidden');
          continue;
        }
        if (masked.some((s) => matches(el, s))) {
          skip('masked or ignored');
          continue;
        }
        if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) {
          skip('outside the viewport');
          continue;
        }
        if (picked.length >= max) {
          skip('over states.maxElements');
          continue;
        }
        picked.push(el);
      }
      w.__uiDiffStates = picked;
      const targets = picked.map((el) => {
        const r = el.getBoundingClientRect();
        // The visible part's center, for the pointer.
        const x = (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2;
        const y = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
        return { selector: w.__uiDiff.cssPath(el), defaults: w.__uiDiffStateStyles!(el), x, y };
      });
      return { targets, skippedWhy };
    },
    { max: opts.maxElements, focusSelectors: opts.focusSelectors, masked: opts.masked },
  );
}

async function waitForFonts(page: Page, on: boolean): Promise<void> {
  if (!on) return;
  await page.evaluate(() => Promise.race([document.fonts.ready.then(() => undefined), new Promise((r) => setTimeout(r, 2000))])).catch(() => undefined);
}

/** The element's box in the viewport, padded and clamped to it; undefined when none of it shows. */
async function clipOf(page: Page, index: number, padding: number): Promise<{ x: number; y: number; width: number; height: number } | undefined> {
  return page.evaluate(
    ({ index, padding }) => {
      const el = (window as unknown as InPage).__uiDiffStates![index];
      const r = el.getBoundingClientRect();
      const x = Math.max(0, Math.floor(r.left - padding));
      const y = Math.max(0, Math.floor(r.top - padding));
      const right = Math.min(innerWidth, Math.ceil(r.right + padding));
      const bottom = Math.min(innerHeight, Math.ceil(r.bottom + padding));
      return right - x >= 1 && bottom - y >= 1 ? { x, y, width: right - x, height: bottom - y } : undefined;
    },
    { index, padding },
  );
}

/**
 * Records each interactive element of a settled page hovered with the real pointer and reached
 * with the Tab key (so :focus-visible applies), with the values a state can change and a crop.
 * Leaves the page as it found it: pointer off the page, nothing focused, scrolled to the top.
 */
export async function captureStates(page: Page, opts: StateOptions): Promise<StateCapture> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(-1, -1);
  await installHelpers(page);
  const { targets, skippedWhy } = await findTargets(page, opts);
  const skip = (why: string) => (skippedWhy[why] = (skippedWhy[why] ?? 0) + 1);
  const shots: StateShot[] = [];
  mkdirSync(opts.dir, { recursive: true });
  const record = async (index: number, state: StateName) => {
    await waitForFonts(page, opts.fonts);
    const clip = await clipOf(page, index, opts.padding);
    if (!clip) return skip(`${state}: off screen`);
    const styles = await page.evaluate((i) => {
      const w = window as unknown as InPage;
      return w.__uiDiffStateStyles!(w.__uiDiffStates![i]);
    }, index);
    const file = path.join(opts.dir, `${opts.id}__${index + 1}-${state}.png`);
    writeFileSync(file, await opts.shoot(clip));
    shots.push({ selector: targets[index].selector, state, styles, file });
  };

  if (opts.hover) {
    for (const [i, t] of targets.entries()) {
      await page.mouse.move(t.x, t.y);
      const hit = await page.evaluate(
        ({ i, x, y }) => {
          const el = (window as unknown as InPage).__uiDiffStates![i];
          let top = document.elementFromPoint(x, y);
          while (top?.shadowRoot) {
            const inner = top.shadowRoot.elementFromPoint(x, y);
            if (!inner || inner === top) break;
            top = inner;
          }
          for (let n: Node | null = top; n; n = n.parentNode ?? (n as ShadowRoot).host ?? null) if (n === el) return true;
          return false;
        },
        { i, x: t.x, y: t.y },
      );
      if (!hit) skip('hover: covered by another element');
      else await record(i, 'hover');
    }
    await page.mouse.move(-1, -1);
  }

  if (opts.focus && targets.length) {
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.scrollTo(0, 0);
    });
    const done = new Set<number>();
    // Enough Tab presses to pass skip links and controls that are not checked.
    for (let presses = 0; presses < targets.length * 4 + 20 && done.size < targets.length; presses++) {
      await page.keyboard.press('Tab');
      const index = await page.evaluate(() => {
        const w = window as unknown as InPage & { __uiDiffSeen?: Set<Element> };
        let el: Element | null = document.activeElement;
        while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
        if (!el || el === document.body) return -2;
        w.__uiDiffSeen ??= new Set();
        if (w.__uiDiffSeen.has(el)) return -3;
        w.__uiDiffSeen.add(el);
        return w.__uiDiffStates!.findIndex((t) => t === el || t.contains(el));
      });
      if (index === -2 || index === -3) break;
      if (index < 0 || done.has(index)) continue;
      done.add(index);
      await record(index, 'focus');
    }
    for (let i = 0; i < targets.length; i++) if (!done.has(i)) skip('focus: not reached with Tab');
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.scrollTo(0, 0);
      delete (window as unknown as { __uiDiffSeen?: unknown }).__uiDiffSeen;
    });
  }

  const checked = new Set(shots.map((s) => s.selector)).size;
  const skipped = Object.values(skippedWhy).reduce((n, v) => n + v, 0);
  return { checked, skipped, skippedWhy, targets: targets.filter((t) => shots.some((s) => s.selector === t.selector)).map(({ selector, defaults }) => ({ selector, defaults })), shots };
}

/** "12 checked, 30 skipped (20 outside the viewport, 10 hidden)". */
export function stateCounts(s: Pick<StateCapture, 'checked' | 'skipped' | 'skippedWhy'>): string {
  const why = Object.entries(s.skippedWhy)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, n]) => `${n} ${reason}`)
    .join(', ');
  return `${s.checked} checked, ${s.skipped} skipped${why ? ` (${why})` : ''}`;
}

const STATE_GROUP: Record<StateProperty, ChangeGroup> = { color: 'color', background: 'color', 'border-color': 'color', outline: 'shape', 'box-shadow': 'shape', transform: 'shape', opacity: 'color', 'text-decoration': 'type', cursor: 'layout' };

/** Properties a screenshot cannot show: their changes are verified by the match alone. */
const INVISIBLE = new Set<StateProperty>(['cursor']);

/**
 * Hover and focus changes of the elements matched between base and head: per state, every value
 * that differs between the sides, unless both sides' state values are just their default values
 * (the default state changed and the state does not set that property). Each changed element and
 * state is one change, a cause, with the crops of both sides.
 */
export function diffStates(base: StateCapture | undefined, head: StateCapture | undefined, baseMap: StyleSnapshot, headMap: StyleSnapshot, match: ElementMatch, opts: { focusOnly?: boolean } = {}): ElementChange[] {
  if (!base || !head) return [];
  const out: ElementChange[] = [];
  const defaults = (s: StateCapture, selector: string) => s.targets.find((t) => t.selector === selector)?.defaults;
  for (const pair of match.pairs) {
    const [b, h] = [baseMap.elements[pair.base], headMap.elements[pair.head]];
    if (!b || !h || b.masked || h.masked) continue;
    if (opts.focusOnly && !inFocus(headMap.elements, pair.head) && !inFocus(baseMap.elements, pair.base)) continue;
    const [bd, hd] = [defaults(base, b.selector), defaults(head, h.selector)];
    if (!bd || !hd) continue;
    for (const state of ['hover', 'focus'] as const) {
      const bs = base.shots.find((s) => s.selector === b.selector && s.state === state);
      const hs = head.shots.find((s) => s.selector === h.selector && s.state === state);
      if (!bs || !hs) continue;
      const changes: PropertyChange[] = [];
      for (const property of STATE_PROPERTIES) {
        const [before, after] = [bs.styles[property], hs.styles[property]];
        if (before === after || (before === bd[property] && after === hd[property])) continue;
        changes.push({ property, group: STATE_GROUP[property], before, after, id: `h${pair.head}:${state}:${property}`, kind: 'cause' });
      }
      if (changes.length === 0) continue;
      out.push({
        kind: 'changed',
        name: h.name ?? h.selector,
        selector: h.selector,
        base: pair.base,
        head: pair.head,
        confidence: pair.confidence,
        reason: pair.reason,
        changes,
        box: h.box,
        deviceBox: h.deviceBox,
        magnitude: 10 + changes.length,
        state,
        stateCrops: { base: bs.file, head: hs.file },
      });
    }
  }
  return out;
}

/**
 * Marks each state change verified or not: matched with at least `minConfidence`, and, for a match
 * that is not high confidence, its two crops differ, unless all it changed is something a
 * screenshot cannot show (the cursor). A high-confidence match with a measured value change is
 * verified by the measurement itself, however close the two colors are.
 */
export function verifyStateChanges(changes: ElementChange[], minConfidence: MatchConfidence, cropsDiffer: (base: string, head: string) => boolean): void {
  const rank: Record<MatchConfidence, number> = { low: 0, medium: 1, high: 2 };
  for (const change of changes) {
    if (!change.state || !change.stateCrops) continue;
    const reasons: string[] = [];
    if (change.confidence && rank[change.confidence] < rank[minConfidence]) reasons.push(`matched with ${change.confidence} confidence only (${change.reason})`);
    const visible = change.changes.some((p) => !INVISIBLE.has(p.property as StateProperty));
    if (visible && change.confidence !== 'high' && !cropsDiffer(change.stateCrops.base, change.stateCrops.head)) reasons.push(`no changed pixels in its ${change.state} crops`);
    change.verified = reasons.length === 0;
    if (reasons.length) change.unverified = reasons;
    else delete change.unverified;
  }
}

/**
 * Whether two state crops differ: a size change, or any pixel past `threshold` (pixelmatch,
 * anti-aliasing ignored). The default is exact: a hover often steps one shade (#2563eb → #1d4ed8),
 * which the page diff's threshold counts as the same color.
 */
export function cropsDiffer(baseFile: string, headFile: string, threshold = 0): boolean {
  const [a, b] = [PNG.sync.read(readFileSync(baseFile)), PNG.sync.read(readFileSync(headFile))];
  if (a.width !== b.width || a.height !== b.height) return true;
  return pixelmatch(a.data, b.data, undefined, a.width, a.height, { threshold, includeAA: false }) > 0;
}
