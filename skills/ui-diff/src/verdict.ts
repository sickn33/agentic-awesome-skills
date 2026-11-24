import type { ChangeKind, ElementChange } from './elements.js';
import { notCheckedReason, type CaptureResult, type Report } from './report.js';

export type CheckVerdict = 'no visual changes' | 'no visual changes found, captured differently' | 'visual changes' | 'capture errors' | 'nothing checked';

/** "padding 8px 14px → 10px 18px · border-radius 4px → 8px", "added (+2 inside)". */
export function changeText(c: ElementChange): string {
  if (c.kind !== 'changed') return `${c.kind}${c.inside ? ` (+${c.inside} inside)` : ''}`;
  return c.changes.map((p) => (p.property === 'position' ? p.after : `${p.property} ${p.before} → ${p.after}`)).join(' · ');
}

export function isShownChange(c: CaptureResult): boolean {
  return c.status === 'changed' || c.status === 'added' || c.status === 'removed';
}

/** A verified change in the hover or focus state of one of the capture's elements. */
export function hasStateChanges(c: CaptureResult): boolean {
  return Boolean(c.styleDiff?.changes.some((x) => x.state && x.verified !== false));
}

function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

export interface MeasuredVariant {
  capture: string;
  viewport: string;
  theme: string;
  magnitude: number;
  /** The change's id in that capture's styleDiff, and for an effect the id of its cause there. */
  change?: string;
  cause?: string;
}

/** One measured change: an element's property going from one value to another, on the variants it was seen on. */
export interface MeasuredRow {
  /** "m3": unique within the report. */
  id: string;
  /** cause and unexplained rows count; effect rows sit under the row of their cause. */
  kind: ChangeKind;
  /** For an effect: the id of the row of its cause. */
  cause?: string;
  name: string;
  selector: string;
  /** The CSS property, "size", "position", "text", or the kind ("added", "removed") of a whole element. */
  property: string;
  /** Set for a change in the hover or keyboard focus state. */
  state?: 'hover' | 'focus';
  before?: string;
  after?: string;
  /** "padding 8px 14px → 10px 18px", "added (+2 inside)". */
  text: string;
  magnitude: number;
  variants: MeasuredVariant[];
  /** "desktop, mobile · light, dark", or "desktop/dark, mobile/dark" when not every combination. */
  where: string;
  /** For a counted row: what it changed besides itself (its own size and position, a parent, siblings). */
  effects: MeasuredRow[];
  /** A component's row its route's still captures list too: shown under the component, counted once. */
  repeat?: boolean;
}

export interface RouteMeasurements {
  route: string;
  /** Set for the changes seen at one checkpoint of a flow on the route. */
  flow?: { name: string; checkpoint: string };
  /** Set for the changes inside one component in one state; `root` says how its box changed, with where. */
  component?: { name: string; state: string; selector: string; root?: string };
  /** Changed captures of the route (or of the flow checkpoint or component) that have a style diff. */
  captures: CaptureResult[];
  /** Verified changes that count, grouped by element, property and old → new value, biggest element first. */
  rows: MeasuredRow[];
  /** "name: change" → why it was not verified. */
  unverified: Map<string, string>;
}

/** The variants a row was seen on, as compactly as they read: a full grid as its two lists. */
export function variantsLabel(variants: Array<Pick<MeasuredVariant, 'viewport' | 'theme'>>, report: Pick<Report, 'viewports' | 'themes'>): string {
  const order = (list: string[], all: string[]) => [...new Set(list)].sort((a, b) => all.indexOf(a) - all.indexOf(b));
  const viewports = order(variants.map((v) => v.viewport), report.viewports);
  const themes = order(variants.map((v) => v.theme), report.themes);
  const showThemes = report.themes.length > 1;
  const pairs = new Set(variants.map((v) => `${v.viewport}/${v.theme}`));
  if (pairs.size === viewports.length * themes.length) return showThemes ? `${viewports.join(', ')} · ${themes.join(', ')}` : viewports.join(', ');
  const combos = report.viewports.flatMap((v) => report.themes.map((t) => [v, t])).filter(([v, t]) => pairs.has(`${v}/${t}`));
  return combos.map(([v, t]) => (showThemes ? `${v}/${t}` : v)).join(', ');
}

interface PropertyRow {
  property: string;
  state?: 'hover' | 'focus';
  before?: string;
  after?: string;
  text: string;
  id?: string;
  kind: ChangeKind;
  cause?: string;
}

function propertyRows(change: ElementChange): PropertyRow[] {
  if (change.kind !== 'changed') return [{ property: change.kind, text: changeText(change), id: change.id, kind: 'cause' }];
  // Reports written before causes and effects were told apart count every change.
  return change.changes.map((p) => ({ property: p.property, ...(change.state ? { state: change.state } : {}), before: p.before, after: p.after, text: p.property === 'position' ? p.after : `${p.property} ${p.before} → ${p.after}`, id: p.id, kind: p.kind ?? 'cause', cause: p.cause }));
}

/** "padding 8px 14px → 10px 18px", leaving out what follows from it. */
export function causeText(change: ElementChange): string {
  const causes = change.changes.filter((p) => p.kind !== 'effect');
  return changeText(causes.length && change.kind === 'changed' ? { ...change, changes: causes } : change);
}

function groupKey(c: CaptureResult): string {
  if (c.component) return `${c.route.path}\u0001${c.component.name}\u0000${c.component.state}`;
  return c.flow ? `${c.route.path}\u0000${c.flow.name}\u0000${c.flow.checkpoint}` : c.route.path;
}

/** "size 109×40 → 113×44px", or one per viewport and theme where they differ ("…; … (mobile)"). */
function rootChanges(captures: CaptureResult[], report: Pick<Report, 'viewports' | 'themes'>): string | undefined {
  const byText = new Map<string, CaptureResult[]>();
  for (const c of captures) if (c.component?.rootChange) byText.set(c.component.rootChange, [...(byText.get(c.component.rootChange) ?? []), c]);
  if (byText.size === 0) return undefined;
  if (byText.size === 1 && [...byText.values()][0].length === captures.length) return [...byText.keys()][0];
  return [...byText].map(([text, seen]) => `${text} (${variantsLabel(seen, report)})`).join('; ');
}

/**
 * The measured changes of every changed route, in the order the routes were captured; each route's
 * flow checkpoints follow it as groups of their own, without what the route's still captures
 * already list.
 */
export function measurements(report: Report): RouteMeasurements[] {
  // A capture whose default state did not change can still have hover or focus changes.
  const changed = report.captures.filter((c) => c.styleDiff && (c.status === 'changed' || (c.status === 'unchanged' && c.styleDiff.changes.some((x) => x.state))));
  const out: RouteMeasurements[] = [];
  let next = 1;
  const groups = [...new Set(changed.map((c) => c.route.path))].flatMap((route) => {
    const keys = [...new Set(changed.filter((c) => c.route.path === route).map(groupKey))];
    return [...keys.filter((k) => k === route), ...keys.filter((k) => k !== route)];
  });
  /** Row and unverified keys of each route's still captures. */
  const listed = new Map<string, { rows: Set<string>; unverified: Set<string> }>();
  for (const group of groups) {
    const captures = changed.filter((c) => groupKey(c) === group);
    const route = captures[0].route.path;
    const flow = captures[0].flow;
    const component = captures[0].component;
    type Row = Omit<MeasuredRow, 'where' | 'effects' | 'id'> & { key: string };
    const rows = new Map<string, Row>();
    const effects = new Map<string, Row>();
    const elementMagnitude = new Map<string, number>();
    const unverified = new Map<string, string>();
    /** "<capture>|<change id>" → key of the counted row it went into. */
    const rowOf = new Map<string, string>();
    const hidden = new Set<string>();
    const pending: Array<{ c: CaptureResult; change: ElementChange; p: PropertyRow }> = [];
    const add = (map: Map<string, Row>, key: string, c: CaptureResult, change: ElementChange, p: PropertyRow, cause?: string) => {
      const row = map.get(key) ?? { key, kind: p.kind, ...(cause ? { cause } : {}), name: change.name, selector: change.selector, property: p.property, ...(p.state ? { state: p.state } : {}), before: p.before, after: p.after, text: p.text, magnitude: 0, variants: [] };
      row.magnitude = Math.max(row.magnitude, change.magnitude);
      if (!row.variants.some((v) => v.capture === c.id)) row.variants.push({ capture: c.id, viewport: c.viewport, theme: c.theme, magnitude: change.magnitude, ...(p.id ? { change: p.id } : {}), ...(p.cause ? { cause: p.cause } : {}) });
      map.set(key, row);
    };
    for (const c of captures) {
      for (const change of c.styleDiff!.changes) {
        if (c.status !== 'changed' && !change.state) continue;
        const element = `${change.name}\u0000${change.selector}`;
        if (change.verified === false) {
          unverified.set(`${change.name}${change.state ? ` · ${change.state}` : ''}: ${causeText(change)}`, change.unverified?.join('; ') ?? '');
          for (const p of propertyRows(change)) if (p.id) hidden.add(`${c.id}|${p.id}`);
          continue;
        }
        for (const p of propertyRows(change)) {
          if (p.kind === 'effect') {
            pending.push({ c, change, p });
            continue;
          }
          elementMagnitude.set(element, Math.max(elementMagnitude.get(element) ?? 0, change.magnitude));
          const key = `${element}\u0000${p.state ?? ''}\u0000${p.property}\u0000${p.before ?? ''}\u0000${p.after ?? ''}\u0000${p.text}`;
          add(rows, key, c, change, p);
          if (p.id) rowOf.set(`${c.id}|${p.id}`, key);
        }
      }
    }
    for (const { c, change, p } of pending) {
      const causeKey = rowOf.get(`${c.id}|${p.cause}`);
      if (!causeKey) {
        // Its cause is unverified: it goes with it. A cause that cannot be found: count it, never hide it.
        if (hidden.has(`${c.id}|${p.cause}`)) continue;
        const element = `${change.name}\u0000${change.selector}`;
        elementMagnitude.set(element, Math.max(elementMagnitude.get(element) ?? 0, change.magnitude));
        add(rows, `${element}\u0000${p.property}\u0000${p.before ?? ''}\u0000${p.after ?? ''}\u0000${p.text}`, c, change, { ...p, kind: 'unexplained', cause: undefined });
        continue;
      }
      add(effects, `${causeKey}\u0001${change.name}\u0000${change.selector}\u0000${p.property}\u0000${p.before ?? ''}\u0000${p.after ?? ''}\u0000${p.text}`, c, change, p, causeKey);
    }
    const still = listed.get(route);
    if (flow && still) {
      for (const key of [...rows.keys()]) if (still.rows.has(key)) rows.delete(key);
      for (const [key, e] of [...effects]) if (!rows.has(e.cause!)) effects.delete(key);
      for (const key of [...unverified.keys()]) if (still.unverified.has(key)) unverified.delete(key);
    }
    if (!flow && !component) listed.set(route, { rows: new Set(rows.keys()), unverified: new Set(unverified.keys()) });
    // Biggest element first; its properties in the order they were first measured, the values of one property together.
    const elementOrder = [...elementMagnitude].sort((a, b) => b[1] - a[1]).map(([key]) => key);
    const all = [...rows.values()];
    const firstOf = (row: Row) => all.findIndex((r) => r.name === row.name && r.selector === row.selector && r.property === row.property);
    const ids = new Map<string, string>();
    const sorted = all
      .map((row, i) => ({ row, i, p: firstOf(row) }))
      .sort((a, b) => elementOrder.indexOf(`${a.row.name}\u0000${a.row.selector}`) - elementOrder.indexOf(`${b.row.name}\u0000${b.row.selector}`) || a.p - b.p || a.i - b.i)
      .map(({ row }): MeasuredRow => {
        const { key, ...rest } = row;
        const id = `m${next++}`;
        ids.set(key, id);
        return { id, ...rest, where: variantsLabel(row.variants, report), effects: [], ...(component && still?.rows.has(key) ? { repeat: true } : {}) };
      });
    const byId = new Map(sorted.map((r) => [r.id, r]));
    for (const e of effects.values()) {
      const { key: _key, cause, ...rest } = e;
      const parent = byId.get(ids.get(cause!)!)!;
      // The cause's own element first, then the others in document order of discovery.
      parent.effects.push({ id: `m${next++}`, ...rest, cause: parent.id, where: variantsLabel(e.variants, report), effects: [] });
    }
    for (const r of sorted) r.effects.sort((a, b) => Number(!(a.name === r.name && a.selector === r.selector)) - Number(!(b.name === r.name && b.selector === r.selector)));
    const root = component && rootChanges(captures, report);
    out.push({ route, ...(flow ? { flow } : {}), ...(component ? { component: { name: component.name, state: component.state, selector: component.selector, ...(root ? { root } : {}) } } : {}), captures, rows: sorted, unverified });
  }
  return out;
}

/** Every route's rows, counted and effects alike, for report.json; a flow checkpoint's rows name it. */
export function measuredGroups(report: Report): Array<Omit<MeasuredRow, 'effects'> & { route: string; flow?: { name: string; checkpoint: string }; component?: { name: string; state: string } }> {
  return measurements(report).flatMap((r) => {
    const where = { route: r.route, ...(r.flow ? { flow: r.flow } : {}), ...(r.component ? { component: { name: r.component.name, state: r.component.state } } : {}) };
    return r.rows.flatMap(({ effects, ...row }) => [{ ...where, ...row }, ...effects.map(({ effects: _, ...e }) => ({ ...where, ...e }))]);
  });
}

/** A component found on one side only (or not comparable there), once per finding, with where; removed and added ones keep their crops. */
export function componentFindings(report: Report): Array<{ text: string; where: string; change: 'removed' | 'added' | 'not compared'; images: string[] }> {
  const byText = new Map<string, NonNullable<Report['components']>>();
  for (const c of report.components ?? []) if (c.finding) byText.set(c.finding, [...(byText.get(c.finding) ?? []), c]);
  return [...byText].map(([text, seen]) => ({ text, where: variantsLabel(seen, report), change: seen[0].change!, images: seen.flatMap((c) => (c.image ? [c.image] : [])) }));
}

/** A flow that stops on one side only, once per finding, with the viewports and themes it was seen on. */
export function flowFindings(report: Report): Array<{ text: string; where: string }> {
  const byText = new Map<string, Array<{ viewport: string; theme: string }>>();
  for (const f of report.flows ?? []) if (f.finding) byText.set(f.finding, [...(byText.get(f.finding) ?? []), f]);
  return [...byText].map(([text, seen]) => ({ text, where: variantsLabel(seen, report) }));
}

export interface PixelOnlyArea {
  capture: CaptureResult;
  /** CSS px. */
  box: { x: number; y: number; width: number; height: number };
  /** The element the area is inside, when one was found. */
  element?: string;
  note?: string;
}

/** Changed areas that no verified measured change explains, per changed capture with a style diff. */
export function pixelOnlyAreas(report: Report): PixelOnlyArea[] {
  const out: PixelOnlyArea[] = [];
  for (const c of report.captures) {
    if (c.status !== 'changed' || !c.styleDiff) continue;
    const scale = c.diff?.scale ?? 1;
    for (const r of c.styleDiff.regions) {
      if (r.changes.some((i) => c.styleDiff!.changes[i]?.verified !== false)) continue;
      const box = { x: Math.round(r.region.x / scale), y: Math.round(r.region.y / scale), width: Math.round(r.region.width / scale), height: Math.round(r.region.height / scale) };
      out.push({ capture: c, box, element: r.element?.name, note: r.note });
    }
  }
  return out;
}

export interface Verdict {
  kind: CheckVerdict;
  /** The first line of the comment and of `ui-diff check`, in plain words. */
  text: string;
}

/**
 * "No visual changes", "3 measured changes on 2 routes", "Changes found, but captures were not
 * comparable": what the run found, before any detail.
 */
export function verdict(report: Report): Verdict {
  const s = report.stats;
  const changed = report.captures.filter(isShownChange);
  const statesOnly = report.captures.filter((c) => !isShownChange(c) && hasStateChanges(c));
  const broken = flowFindings(report).length;
  const missing = componentFindings(report);
  const anyChange = changed.length + statesOnly.length + broken + missing.length > 0;
  const kind: CheckVerdict = s.errors ? 'capture errors' : notCheckedReason(report) ? 'nothing checked' : anyChange ? 'visual changes' : report.notComparable ? 'no visual changes found, captured differently' : 'no visual changes';
  if (kind === 'nothing checked') return { kind, text: 'Nothing was checked' };
  const failed = s.errors ? plural(s.errors, 'capture failed', 'captures failed') : '';
  if (!anyChange) {
    const text = report.notComparable ? 'No visual changes, but captures were not comparable' : 'No visual changes';
    if (!failed) return { kind, text };
    return { kind, text: s.errors === s.captures ? capitalize(failed) : `${capitalize(failed)}; ${text[0].toLowerCase()}${text.slice(1)} in the rest` };
  }
  if (report.notComparable) return { kind, text: `Changes found, but captures were not comparable${failed ? `; ${failed}` : ''}` };
  const routes = measurements(report);
  const measured = routes.filter((r) => r.rows.length);
  const count = measured.reduce((n, r) => n + r.rows.filter((row) => !row.repeat).length, 0);
  const pixelOnly = new Set(changed.filter((c) => c.status === 'changed' && !measured.some((r) => r.route === c.route.path)).map((c) => c.route.path)).size;
  const parts: string[] = [];
  if (count) parts.push(`${plural(count, 'measured change')} on ${plural(new Set(measured.map((r) => r.route)).size, 'route')}`);
  // Reports without a style diff (older ones, or styleDiff.enabled false) never measured anything.
  const anyMeasured = changed.some((c) => c.styleDiff);
  if (pixelOnly) parts.push(count ? `pixel changes on ${plural(pixelOnly, 'more route')}` : `Visual changes on ${plural(pixelOnly, 'route')}${anyMeasured ? ', none measured' : ''}`);
  if (s.added) parts.push(plural(s.added, 'new page'));
  if (s.removed) parts.push(`${plural(s.removed, 'page')} no longer ${s.removed === 1 ? 'renders' : 'render'}`);
  if (broken) parts.push(plural(broken, 'broken flow'));
  for (const change of ['removed', 'added', 'not compared'] as const) {
    const n = missing.filter((m) => m.change === change).length;
    if (n) parts.push(`${plural(n, 'component')} ${change}`);
  }
  if (failed) parts.push(failed);
  return { kind, text: capitalize(parts.join(', ')) };
}

function capitalize(text: string): string {
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

export interface EffectLine {
  /** Absent for the cause's own element. */
  element?: { name: string; selector: string };
  text: string;
}

/**
 * What a counted row caused, one line per element: its own size and position first ("size
 * 109.5×40 → 117.5×48px, moved 8px up (from the padding change)"), then other elements.
 */
export function effectLines(row: MeasuredRow): EffectLine[] {
  const byElement = new Map<string, { element?: { name: string; selector: string }; parts: string[]; scoped: boolean }>();
  for (const e of row.effects) {
    const own = e.name === row.name && e.selector === row.selector;
    const key = own ? '' : `${e.name}\u0000${e.selector}`;
    const line = byElement.get(key) ?? { ...(own ? {} : { element: { name: e.name, selector: e.selector } }), parts: [], scoped: false };
    const [label, value] = e.property === 'position' ? ['moved', e.text.replace(/^moved /, '')] : e.property === 'size' ? ['size', `${e.before} → ${e.after}`] : [e.property, e.text.replace(new RegExp(`^${e.property} `), '')];
    // Variants that differ from the cause's go right after the property they belong to.
    const scoped = e.where !== row.where;
    line.parts.push(scoped ? `${label} on ${e.where}: ${value}` : `${label} ${value}`);
    line.scoped ||= scoped;
    byElement.set(key, line);
  }
  const lines = [...byElement.values()].map((l) => ({ ...(l.element ? { element: l.element } : {}), text: l.parts.join(l.scoped ? '; ' : ', ') }));
  if (lines.length) lines[0].text += ` (from the ${row.property === 'added' || row.property === 'removed' ? `${row.property} element` : `${row.property} change`})`;
  return lines;
}
