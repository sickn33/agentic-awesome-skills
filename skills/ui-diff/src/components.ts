import type { ComponentState } from './config.js';
import type { ElementChange } from './elements.js';
import { unionBox, type Box } from './image.js';
import type { StyledElement, StyleSnapshot } from './tokens.js';

/** Why a component state was not captured on one side. */
export type ComponentMiss = 'none' | 'many' | 'hidden' | 'flow' | 'state';

/** One side's capture of a component in one state, kept on its record. */
export interface ComponentRunInfo {
  name: string;
  state: ComponentState;
  selector: string;
  /** Elements the selector matched. */
  matches: number;
  /** The root's element-map selector and box (CSS px, in the screenshot's coordinates). */
  root?: { selector: string; box: Box };
  /** False when nothing was captured for this state: see `miss`. */
  reached: boolean;
  miss?: ComponentMiss;
  /** The flow's stop or why the state could not be entered. */
  note?: string;
  /** The whole run on this side, page load and every state included. */
  ms: number;
}

/** Zero or several matches: the selector does not name one component. */
export function matchMiss(count: number): ComponentMiss | undefined {
  return count === 0 ? 'none' : count > 1 ? 'many' : undefined;
}

type Size = { width: number; height: number };

/**
 * The crops of a component on base and head: one box, the union of both root boxes laid over each
 * other at their top-left corners, plus `padding`, placed at each side's own root. Both crops have
 * the same size, so blink and side-by-side line up when the component changed size, and a
 * component that only moved on the page (something above it grew) crops to the same pixels. Kept
 * inside each page by shifting rather than shrinking, unless the page is smaller. CSS px, whole pixels.
 */
export function componentCrop(base: Box, head: Box, padding: number, pages: { base: Size; head: Size }): { base: Box; head: Box } {
  const u = unionBox({ ...base, x: 0, y: 0 }, { ...head, x: 0, y: 0 });
  const width = Math.ceil(u.width + 2 * padding);
  const height = Math.ceil(u.height + 2 * padding);
  const place = (root: Box, page: Size): Box => {
    const [w, h] = [Math.min(width, Math.floor(page.width)), Math.min(height, Math.floor(page.height))];
    const x = Math.min(Math.max(0, Math.floor(root.x - padding)), Math.floor(page.width) - w);
    const y = Math.min(Math.max(0, Math.floor(root.y - padding)), Math.floor(page.height) - h);
    return { x, y, width: w, height: h };
  };
  return { base: place(base, pages.base), head: place(head, pages.head) };
}

/** A device-px box for a CSS-px box at `scale`, clamped to the image. */
export function toDevice(box: Box, scale: number, size: { width: number; height: number }): Box {
  const x = Math.min(size.width, Math.round(box.x * scale));
  const y = Math.min(size.height, Math.round(box.y * scale));
  return { x, y, width: Math.max(0, Math.min(size.width, Math.round((box.x + box.width) * scale)) - x), height: Math.max(0, Math.min(size.height, Math.round((box.y + box.height) * scale)) - y) };
}

/** Moves an element map so its boxes are relative to the crop (CSS px `origin`, device px at `scale`). */
export function shiftSnapshot(snapshot: StyleSnapshot, origin: { x: number; y: number }, scale: number): void {
  for (const e of snapshot.elements) {
    e.box = { ...e.box, x: e.box.x - origin.x, y: e.box.y - origin.y };
    e.deviceBox = { x: Math.round(e.box.x * scale), y: Math.round(e.box.y * scale), width: Math.round(e.box.width * scale), height: Math.round(e.box.height * scale) };
  }
}

/** The element is the root or inside it, by its element map's parent chain. */
export function insideRoot(list: StyledElement[], index: number | undefined, root: number): boolean {
  for (let i: number | null | undefined = index; i != null; i = list[i]?.parent) if (i === root) return true;
  return false;
}

/** The changes of elements inside the component: added and changed ones on head, removed ones on base. */
export function scopeChanges(changes: ElementChange[], base: StyledElement[], head: StyledElement[], roots: { base: number; head: number }): ElementChange[] {
  return changes.filter((c) => (c.kind === 'removed' ? insideRoot(base, c.base, roots.base) : insideRoot(head, c.head, roots.head)));
}

function px(n: number): string {
  const r = Math.round(n * 2) / 2;
  return `${Object.is(r, -0) ? 0 : r}`;
}

/** "size 320×48 → 320×52px, moved 4px down": how the component's root box changed, or undefined. */
export function rootChange(before: Box, after: Box): string | undefined {
  const parts: string[] = [];
  if (Math.abs(before.width - after.width) >= 0.5 || Math.abs(before.height - after.height) >= 0.5) parts.push(`size ${px(before.width)}×${px(before.height)} → ${px(after.width)}×${px(after.height)}px`);
  const [dx, dy] = [after.x - before.x, after.y - before.y];
  const moves = [Math.abs(dx) >= 0.5 && `${px(Math.abs(dx))}px ${dx > 0 ? 'right' : 'left'}`, Math.abs(dy) >= 0.5 && `${px(Math.abs(dy))}px ${dy > 0 ? 'down' : 'up'}`].filter(Boolean);
  if (moves.length) parts.push(`moved ${moves.join(', ')}`);
  return parts.length ? parts.join(', ') : undefined;
}

/** "component 'primary button'", "component 'card' · hover". */
export function componentLabel(c: { name: string; state: string }): string {
  return `component '${c.name}'${c.state === 'default' ? '' : ` · ${c.state}`}`;
}

type SideRun = Pick<ComponentRunInfo, 'reached' | 'miss' | 'matches' | 'note' | 'selector'>;

function why(side: SideRun): string {
  if (side.miss === 'none') return `nothing matches ${side.selector}`;
  if (side.miss === 'many') return `${side.selector} matches ${side.matches} elements`;
  if (side.miss === 'hidden') return `${side.selector} is not visible`;
  return side.note ?? 'not captured';
}

export interface ComponentOutcome {
  /** One side has it and the other does not (removed, added), or it could not be compared there. */
  change?: 'removed' | 'added' | 'not compared';
  finding?: string;
  /** Neither side was captured: a problem with the component entry, listed as a warning. */
  problem?: string;
}

/**
 * Compares whether each side captured a component state. Found on one side only: removed or
 * added (also when hidden there). Several matches, a flow that stopped or a state that could not
 * be entered on one side: not compared. Neither side: a warning about the entry, not a finding.
 */
export function componentOutcome(c: { name: string; state: string }, base: SideRun, head: SideRun): ComponentOutcome {
  if (base.reached && head.reached) return {};
  const label = componentLabel(c);
  if (!base.reached && !head.reached) {
    const [b, h] = [why(base), why(head)];
    return { problem: `${label}: ${b === h ? `${b} on base and head` : `${b} on base, ${h} on head`}; check the component in the config` };
  }
  const [side, missing] = head.reached ? (['base', base] as const) : (['head', head] as const);
  const gone = missing.miss === 'none' || missing.miss === 'hidden';
  if (gone && side === 'head') return { change: 'removed', finding: `${label} removed on head: ${why(missing)}` };
  if (gone) return { change: 'added', finding: `${label} added on head (${why(missing)} on base)` };
  return { change: 'not compared', finding: `${label} not compared: ${why(missing)} on ${side}` };
}
