import type { MeasuredRow } from './verdict.js';
import type { A11yIssue, FocusDelta } from './a11y.js';
import { describeDependency, type DependencyChange } from './deps.js';
import type { ElementChange, RegionExplanation } from './elements.js';
import { componentLabel } from './components.js';
import type { FlowStop } from './flows.js';
import type { Box } from './image.js';
import { UiDiffError } from './log.js';
import type { AggregatedFinding } from './tokens.js';
import { VERSION } from './version.js';

export type CaptureStatus = 'changed' | 'unchanged' | 'added' | 'removed' | 'error';

export interface RouteRef {
  path: string;
  name: string;
  slug: string;
}

export interface CaptureResult {
  id: string;
  route: RouteRef;
  viewport: string;
  theme: string;
  /** Set for a checkpoint of a recorded flow: the page as the flow left it there, first viewport only. */
  flow?: { name: string; checkpoint: string };
  /**
   * Set for a component in one state: the diff covers its crop only (`crop`, CSS px, in each side's
   * screenshot), and the style diff only the root and what it contains. `rootChange` says how the
   * root's box changed on the page ("size 320×48 → 320×52px, moved 4px down").
   */
  component?: { name: string; state: 'default' | 'hover' | 'focus'; selector: string; flow?: { name: string; checkpoint: string }; crop: { base: Box; head: Box }; root: { before: Box; after: Box }; rootChange?: string };
  status: CaptureStatus;
  error?: string;
  /** Display URLs (sanitized), only for deployed previews. */
  urls: { base?: string; head?: string };
  diff?: {
    changedPixels: number;
    ratio: number;
    regions: Box[];
    scale: number;
    sizeBefore: [number, number];
    sizeAfter: [number, number];
    sizeChanged: boolean;
    /** Content that only moved vertically (CSS px; dy = after − before). Not counted in ratio. */
    shifted?: ShiftedRun[];
    /** Height (CSS px) of base content with no counterpart on head. */
    removedHeight?: number;
    /** Areas shown in the zoomed crops (`images.focus`, same order), CSS px. */
    focusBoxes?: Box[];
  };
  /** Paths relative to the output directory. */
  /**
   * focus: before | after | diff crops of the changed areas; pairs: the same areas as a still
   * base | head pair with the changed boxes outlined; blinks: the same areas as a blinking GIF.
   */
  images: {
    base?: string;
    head?: string;
    diff?: string;
    compare?: string;
    focus: string[];
    pairs?: string[];
    blinks?: string[];
    /** Before | after pairs of the verified hover and focus changes, with what each shows. */
    states?: Array<{ file: string; name: string; state: 'hover' | 'focus'; text: string }>;
  };
  warnings: string[];
  truncated: boolean;
  /** What each side was rendered with; set when both sides were captured. */
  fingerprint?: CaptureFingerprint;
  /** Size of each side's element map (styles/<side>/<id>.json); capped when capture.styleMaxElements cut it short. */
  elementMap?: Partial<Record<'base' | 'head', { elements: number; capped?: boolean }>>;
  styleDiff?: CaptureStyleDiff;
  /** Focus and ignore selectors of this capture; focusOnly when the diff was limited to the focused elements. */
  regions?: { focus: string[]; ignore: string[]; focusOnly: boolean };
}

/** What one side of a capture was rendered with, measured in the page. No paths, hosts, users or env values. */
export interface SideFingerprint {
  /** Commit the side was built from; absent for deployed previews. */
  commit?: string;
  viewport: { width: number; height: number; deviceScaleFactor: number; isMobile: boolean };
  browser: { name: string; version: string; userAgent: string };
  fonts: { loaded: string[]; failed: string[]; pending: string[] };
  freeze: { clock: string | null; seed: number | null; animations: boolean; fonts: boolean };
  media: { reducedMotion: string; colorScheme: string; locale: string; timezone: string };
  /** `fingerprint.dataLabel`, or "not declared". */
  data: string;
  /** Base side only: whether its captures came from the base cache, and the key. */
  cache?: { hit: boolean; key: string };
  /** Interactive elements checked in hover and focus states, and those skipped with why. Not compared between sides. */
  states?: { checked: number; skipped: number; skippedWhy: Record<string, number> };
}

/** The base cache this run used (worktree base only). */
export interface BaseCacheInfo {
  key: string;
  hit: boolean;
  /** Written by this run (a miss whose captures all succeeded). */
  stored?: boolean;
  /** When the reused captures were taken (hits). */
  capturedAt?: string;
  configHash: string;
  browser: string;
  uiDiffVersion: string;
}

export interface CaptureFingerprint {
  base?: SideFingerprint;
  head?: SideFingerprint;
  /** Everything except the commit that differs between base and head, one line each. */
  differences: string[];
}

export interface ShiftedRun {
  beforeY: number;
  afterY: number;
  height: number;
  dy: number;
}

export interface VariantGroup {
  id: string;
  route: RouteRef;
  param: string;
  viewport: string;
  theme: string;
  items: Array<{ value: string; image?: string; error?: string }>;
  strip?: string;
}

export interface MotionResult {
  id: string;
  route: RouteRef;
  viewport: string;
  theme: string;
  steps: string[];
  gif?: string;
  webm?: { base?: string; head?: string };
  /** Distinct frames recorded per side; 1 means nothing moved. */
  frames?: { base: number; head: number };
  warnings?: string[];
  error?: string;
}

/** One side's replay of a flow. */
export interface FlowSide {
  /** The whole replay, page load and checkpoints included. */
  ms: number;
  stoppedAt?: FlowStop;
  /** Restored from the base cache: ms is from the run that stored it. */
  cached?: boolean;
}

/** One flow on one viewport and theme, replayed on base and head. */
export interface FlowResult {
  name: string;
  route: RouteRef;
  viewport: string;
  theme: string;
  steps: string[];
  /** step is 1-based; capture is the id in `captures`, set when both sides reached the checkpoint. */
  checkpoints: Array<{ name: string; step: number; capture?: string }>;
  base: FlowSide;
  head: FlowSide;
  /** The flow stops on one side only (or earlier on one): counted as a change. */
  finding?: string;
  /** The flow stops at the same step on both sides: a problem with the flow, listed as a warning. */
  problem?: string;
}

/** One component in one state, at one viewport and theme, on base and head. */
export interface ComponentResult {
  name: string;
  state: 'default' | 'hover' | 'focus';
  selector: string;
  route: RouteRef;
  flow?: { name: string; checkpoint: string };
  viewport: string;
  theme: string;
  /** Elements the selector matched on each side. */
  matches: { base: number; head: number };
  /** Id in `captures`, set when both sides were captured. */
  capture?: string;
  base: { ms: number; cached?: boolean };
  head: { ms: number };
  /** Found on one side only (removed, added), or not comparable there: counted as a change. */
  change?: 'removed' | 'added' | 'not compared';
  finding?: string;
  /** Neither side was captured: a problem with the entry, listed as a warning. */
  problem?: string;
  /** For a removed or added component: a crop of the side that has it. */
  image?: string;
}

export interface TokenReport {
  files: string[];
  scope: 'changed-regions' | 'page';
  audited: string[];
  skipped: string[];
  findings: AggregatedFinding[];
}

export interface A11yReport {
  tags: string[];
  audited: string[];
  added: Array<A11yIssue & { captures: string[] }>;
  fixed: Array<A11yIssue & { captures: string[] }>;
  focus: Array<{ capture: string; delta: FocusDelta }>;
  errors: string[];
}

/** How a side got its dependencies: symlinked or hard-link copy of yours, its own install, the other side's install, or none needed. */
export type InstallKind = 'linked' | 'copied' | 'installed' | 'shared' | 'none';

/** Measured durations of one side's preparation (milliseconds). */
export interface SideTiming {
  mode: 'worktree' | 'url';
  /** Captures restored from the base cache: no checkout, install, build, boot or capture. */
  cached?: boolean;
  /** Worktree checkout and copied files. */
  checkoutMs?: number;
  install?: { kind: InstallKind; ms: number; retried?: boolean };
  buildMs?: number;
  /** From starting the server until it answered. */
  bootMs?: number;
  totalMs: number;
}

/** Measured wall-clock durations of a run (milliseconds); nothing here is estimated. */
export interface Timings {
  /** From the start of the run until the report was assembled. */
  totalMs: number;
  detectMs: number;
  /** Base and head are prepared at the same time; wallMs is how long that took. */
  prepare?: { wallMs: number; base: SideTiming; head: SideTiming };
  /** Making sure Chromium is installed (a download on the first run) and launching it. */
  browserMs?: number;
  capture?: { ms: number; count: number; slowest?: { id: string; side: 'base' | 'head'; ms: number } };
  diffMs?: number;
  /** a11y includes the axe runs and elementMapMs the element maps, both taken during capture. */
  extras?: { variantsMs?: number; motionMs?: number; a11yMs?: number; tokensMs?: number; elementMapMs?: number; styleDiffMs?: number; flowsMs?: number; componentsMs?: number };
}

export interface SideSummary {
  label: string;
  mode: 'worktree' | 'url';
  sha?: string;
  shortSha?: string;
  ref?: string;
  url?: string;
  includesUncommitted?: boolean;
}

/** Version of report.json this ui-diff writes. 1 and 2 are still read, see `parseReport`. */
export const REPORT_VERSION = 3;

/** Measured element-level changes of one capture (report version 3). */
export interface CaptureStyleDiff {
  /** Pairs found between the base and head element maps, by confidence. */
  matched: { high: number; medium: number; low: number };
  /** Changed, added and removed elements, biggest first (at most styleDiff.maxChanges). */
  changes: ElementChange[];
  /** Changes left out by styleDiff.maxChanges. */
  omitted?: number;
  /** One per diff region, same order. */
  regions: RegionExplanation[];
}

export interface Report {
  version: typeof REPORT_VERSION;
  tool: { name: 'ui-diff'; version: string };
  createdAt: string;
  base: SideSummary;
  head: SideSummary;
  routes: Array<{ path: string; name: string; reasons: string[]; confidence: string }>;
  detect?: {
    uiFiles: string[];
    unmatched: string[];
    skippedRoutes: string[];
    needsExample: Array<{ file: string; route: string }>;
    notes: string[];
    /** Changed dependencies; `ui` ones made routes affected, the others were not checked visually. */
    dependencies?: DependencyChange[];
    unparsedLockfiles?: string[];
  };
  viewports: string[];
  themes: string[];
  captures: CaptureResult[];
  variants: VariantGroup[];
  motion: MotionResult[];
  /** Recorded flows, one per flow, viewport and theme. */
  flows?: FlowResult[];
  /** Components, one per component, state, viewport and theme. */
  components?: ComponentResult[];
  /** Routes whose motion clip was skipped because no capture of them changed (use --motion-all to record anyway). */
  motionSkipped?: string[];
  /** Changed routes whose changed files touch no animation (transitions, keyframes, :hover...), so no clip was recorded. */
  motionNoAnimation?: string[];
  tokens?: TokenReport;
  a11y?: A11yReport;
  /** Set when nothing was captured: why (see `notCheckedReason`). */
  notChecked?: string;
  baseCache?: BaseCacheInfo;
  /** Focus and ignore selectors used by any captured route. */
  regions?: { focus: string[]; ignore: string[] };
  /** Set when base and head were captured differently on some capture: what differed, and where. */
  notComparable?: Array<{ key: string; captures: string[] }>;
  /**
   * Every verified measured change grouped by route, element, property and old → new value, as the
   * comment lists them: kind cause or unexplained for the rows that count, effect (with the id of
   * the cause's row) for what followed from one; each group keeps the captures it was seen on.
   * Rows seen at a flow checkpoint or inside a component name it.
   */
  measured?: Array<Omit<MeasuredRow, 'effects'> & { route: string; flow?: { name: string; checkpoint: string }; component?: { name: string; state: string } }>;
  timings?: Timings;
  warnings: string[];
  stats: { captures: number; changed: number; unchanged: number; added: number; removed: number; errors: number };
}

/**
 * Reads a report.json written by this or an earlier ui-diff (CI artifacts and kept reports outlive
 * upgrades). Version 2 lacks only version 3's optional `styleDiff`; version 1 also lacks version 2's
 * optional additions (`notChecked`, `diff.focusBoxes`), and `notChecked` is derived from the report.
 */
export function parseReport(raw: unknown, file: string): Report {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new UiDiffError(`${file} is not a ui-diff report`, { hint: 'Run `ui-diff run` to write a new one.' });
  const version = (raw as { version?: unknown }).version;
  if (version === REPORT_VERSION) return raw as Report;
  // Version 2 differs only by what 3 added (styleDiff), which is optional.
  if (version === 2) return { ...(raw as Omit<Report, 'version'>), version: REPORT_VERSION } as Report;
  if (version === 1) {
    const report = { ...(raw as Omit<Report, 'version'>), version: REPORT_VERSION } as Report;
    const notChecked = notCheckedReason(report);
    if (notChecked && report.notChecked === undefined) report.notChecked = notChecked;
    return report;
  }
  const newer = typeof version === 'number' && version > REPORT_VERSION;
  throw new UiDiffError(`${file} has report version ${String(version)}, which ui-diff ${VERSION} cannot read`, {
    hint: newer ? 'It was written by a newer ui-diff: update this one, or rerun `ui-diff run`.' : 'Rerun `ui-diff run` to write a new report.',
  });
}

function listOrNone(values: string[]): string {
  return values.length ? values.join(', ') : 'none';
}

/**
 * Differences between the two sides' capture environments, ignoring the commit (which is
 * supposed to differ). Anything listed here can change pixels without a code change.
 */
export function fingerprintDifferences(base: SideFingerprint, head: SideFingerprint): string[] {
  const fields: Array<[string, (f: SideFingerprint) => string]> = [
    ['viewport', (f) => `${f.viewport.width}×${f.viewport.height}`],
    ['devicePixelRatio', (f) => String(f.viewport.deviceScaleFactor)],
    ['isMobile', (f) => String(f.viewport.isMobile)],
    ['browser', (f) => `${f.browser.name} ${f.browser.version}`],
    ['user agent', (f) => f.browser.userAgent],
    ['fonts loaded', (f) => listOrNone(f.fonts.loaded)],
    ['fonts failed', (f) => listOrNone(f.fonts.failed)],
    ['fonts still loading', (f) => listOrNone(f.fonts.pending)],
    ['clock', (f) => f.freeze.clock ?? 'running'],
    ['random seed', (f) => (f.freeze.seed === null ? 'not seeded' : String(f.freeze.seed))],
    ['animations', (f) => (f.freeze.animations ? 'off' : 'on')],
    ['font wait', (f) => (f.freeze.fonts ? 'on' : 'off')],
    ['reduced motion', (f) => f.media.reducedMotion],
    ['color scheme', (f) => f.media.colorScheme],
    ['locale', (f) => f.media.locale],
    ['timezone', (f) => f.media.timezone],
    ['test data', (f) => f.data],
  ];
  const out: string[] = [];
  for (const [label, value] of fields) {
    const [b, h] = [value(base), value(head)];
    if (b !== h) out.push(`${label}: base ${b} · head ${h}`);
  }
  return out;
}

/**
 * Fingerprint keys (fonts, browser, viewport, seed, clock...) that differed between base and head,
 * with the captures they differed on. A run with any is not a clean comparison.
 */
export function comparability(captures: CaptureResult[]): Pick<Report, 'notComparable'> {
  const byKey = new Map<string, string[]>();
  for (const c of captures) {
    for (const d of c.fingerprint?.differences ?? []) {
      const key = d.slice(0, d.indexOf(':'));
      const where = `${c.route.path} ${c.viewport}/${c.theme}`;
      byKey.set(key, [...new Set([...(byKey.get(key) ?? []), where])]);
    }
  }
  return byKey.size ? { notComparable: [...byKey].map(([key, where]) => ({ key, captures: where })) } : {};
}

export function computeStats(captures: CaptureResult[]): Report['stats'] {
  const count = (s: CaptureStatus) => captures.filter((c) => c.status === s).length;
  return { captures: captures.length, changed: count('changed'), unchanged: count('unchanged'), added: count('added'), removed: count('removed'), errors: count('error') };
}

export function pct(ratio: number): string {
  const p = ratio * 100;
  if (p === 0) return '0%';
  if (p < 0.01) return '<0.01%';
  return `${p < 10 ? p.toFixed(2) : p.toFixed(1)}%`;
}

export function captureLabel(c: { route: RouteRef; viewport: string; theme: string; flow?: CaptureResult['flow']; component?: CaptureResult['component'] }, themes: number): string {
  return `${c.route.path} · ${c.viewport}${themes > 1 || c.theme !== 'light' ? ` · ${c.theme}` : ''}${c.flow ? ` · ${flowLabel(c.flow)}` : ''}${c.component ? ` · ${componentLabel(c.component)}` : ''}`;
}

/** "flow 'menu' · after open". */
export function flowLabel(flow: { name: string; checkpoint: string }): string {
  return `flow '${flow.name}' · ${flow.checkpoint}`;
}

function sizeNote(c: CaptureResult): string | undefined {
  if (!c.diff?.sizeChanged) return undefined;
  const [bw, bh] = c.diff.sizeBefore.map((n) => Math.round(n / c.diff!.scale));
  const [aw, ah] = c.diff.sizeAfter.map((n) => Math.round(n / c.diff!.scale));
  if (bw === aw) return `page height ${bh} → ${ah}px`;
  return `page size ${bw}×${bh} → ${aw}×${ah}px`;
}

function px(n: number): string {
  return `${Math.abs(n)}px`;
}

/** "content shifted down 60px" — moved-but-identical content, reported apart from real changes. */
export function shiftNote(c: CaptureResult): string | undefined {
  const runs = c.diff?.shifted ?? [];
  if (runs.length === 0) return undefined;
  const moves = [...new Set(runs.map((r) => r.dy))];
  const words = moves.slice(0, 3).map((dy) => `${dy > 0 ? 'down' : 'up'} ${px(dy)}`);
  const what = runs.length === 1 ? 'content' : `${runs.length} sections`;
  return `${what} shifted ${words.join(', ')}${moves.length > 3 ? ', …' : ''} (unchanged, not counted)`;
}

export function describeCapture(c: CaptureResult): string {
  if (c.status === 'error') return `capture failed: ${c.error ?? 'unknown error'}`;
  if (c.status === 'added') return 'new page (no base version)';
  if (c.status === 'removed') return 'page no longer renders on head';
  if (!c.diff) return '';
  const parts = [`${pct(c.diff.ratio)} of pixels changed`];
  if (c.diff.regions.length) parts.push(`${c.diff.regions.length} area${c.diff.regions.length === 1 ? '' : 's'}`);
  const shift = shiftNote(c);
  if (shift) parts.push(shift);
  if (c.diff.removedHeight) parts.push(`${c.diff.removedHeight}px of content removed`);
  const size = sizeNote(c);
  if (size) parts.push(size);
  return parts.join(' · ');
}

/** Report-level warning when some pages were taller than capture.maxHeight and only their top part was compared. */
export function truncationWarning(captures: CaptureResult[], maxHeight: number): string | undefined {
  const cut = captures.filter((c) => c.truncated);
  if (cut.length === 0) return undefined;
  const names = cut.slice(0, 5).map((c) => c.id).join(', ');
  const more = cut.length > 5 ? ` and ${cut.length - 5} more` : '';
  return `${cut.length} capture${cut.length === 1 ? ' was' : 's were'} cut at capture.maxHeight (${maxHeight}px): ${names}${more}. Changes below that line are not compared; raise capture.maxHeight to include them.`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Why nothing was captured, when nothing was. Phrased so an empty run never reads as "no visual changes". */
export function notCheckedReason(report: Report): string | undefined {
  if (report.captures.length > 0) return undefined;
  const d = report.detect;
  if (!d) return 'no route was selected';
  if (d.uiFiles.length === 0) return 'no changed file is a UI file (detect.include), so no route was captured';
  const why: string[] = [];
  if (d.unmatched.length) why.push(`${plural(d.unmatched.length, 'file')} could not be traced to a page (pass --routes, or map them with routes[].files)`);
  if (d.needsExample.length) why.push(`dynamic routes need an example path: ${[...new Set(d.needsExample.map((n) => n.route))].join(', ')}`);
  return `${plural(d.uiFiles.length, 'UI file')} changed but none could be mapped to a route${why.length ? `: ${why.join('; ')}` : ''}`;
}

/** Detection ran and found no changed UI file, so there is nothing to show reviewers. */
export function noUiChange(report: Report): boolean {
  return report.captures.length === 0 && report.detect !== undefined && report.detect.uiFiles.length === 0;
}

export function notCheckedNotice(reason: string): string {
  return `**Nothing was checked.** ${reason[0].toUpperCase()}${reason.slice(1)}. This is not a visual all-clear.`;
}

/** " Measured: link 'Get started' padding 8px 14px → 10px 18px (+2 more)." for the automatic summary. */
function measuredSummary(items: CaptureResult[]): string {
  const withDiff = items.filter((c) => c.styleDiff);
  if (withDiff.length === 0) return '';
  const all = withDiff.flatMap((c) => c.styleDiff!.changes.filter((x) => x.verified !== false)).sort((a, b) => b.magnitude - a.magnitude);
  if (all.length === 0) return ' No measured style, text or size change.';
  const top = all[0];
  const what = top.kind === 'changed' ? top.changes.map((p) => (p.property === 'position' ? p.after : `${p.property} ${p.before} → ${p.after}`)).join(', ') : top.kind;
  const others = new Set(all.slice(1).filter((c) => c.selector !== top.selector).map((c) => c.selector)).size;
  return ` Measured: ${top.name} ${what}${others ? ` (+${others} more element${others === 1 ? '' : 's'})` : ''}.`;
}

/** Data-driven summary used when no agent/human summary is supplied. */
export function autoSummary(report: Report): string {
  const lines: string[] = [];
  const s = report.stats;
  const changed = report.captures.filter((c) => c.status === 'changed' || c.status === 'added' || c.status === 'removed');
  const notChecked = notCheckedReason(report);
  const broken = [...(report.flows ?? []), ...(report.components ?? [])].some((f) => f.finding);
  if (notChecked) {
    lines.push(notCheckedNotice(notChecked));
  } else if (changed.length === 0 && s.errors === 0 && !broken && report.notComparable) {
    lines.push(`No visual changes found across ${s.captures} capture${s.captures === 1 ? '' : 's'}, but base and head were captured differently (${report.notComparable.map((n) => n.key).join(', ')}), so this is not a clean result.`);
  } else if (changed.length === 0 && s.errors === 0 && !broken) {
    lines.push(`No visual changes across ${s.captures} capture${s.captures === 1 ? '' : 's'} (${report.routes.length} route${report.routes.length === 1 ? '' : 's'}).`);
  } else {
    const byRoute = new Map<string, CaptureResult[]>();
    for (const c of changed) byRoute.set(c.route.path, [...(byRoute.get(c.route.path) ?? []), c]);
    for (const [route, items] of byRoute) {
      const worst = items.reduce((a, b) => ((b.diff?.ratio ?? 0) > (a.diff?.ratio ?? 0) ? b : a));
      const where = [...new Set(items.map((i) => `${i.viewport}${report.themes.length > 1 ? `/${i.theme}` : ''}${i.flow ? ` (${flowLabel(i.flow)})` : ''}${i.component ? ` (${componentLabel(i.component)})` : ''}`))].join(', ');
      lines.push(`- \`${route}\` changed on ${where}; largest: ${describeCapture(worst)}.${measuredSummary(items)}`);
    }
  }
  for (const finding of new Set([...(report.flows ?? []), ...(report.components ?? [])].map((f) => f.finding).filter(Boolean))) lines.push(`- ${finding![0].toUpperCase()}${finding!.slice(1)}.`);
  if (s.errors) lines.push(`- ${s.errors} capture${s.errors === 1 ? '' : 's'} failed — see the details below.`);
  const env = changed.filter((c) => c.fingerprint?.differences.length);
  if (env.length) {
    const where = env.map((c) => `\`${c.route.path}\` ${c.viewport}${report.themes.length > 1 ? `/${c.theme}` : ''}`).join(', ');
    lines.push(`- ⚠️ Capture environment differed on ${where} (${[...new Set(env.flatMap((c) => c.fingerprint!.differences.map((d) => d.split(':')[0])))].join(', ')}): those diffs may not come from the code.`);
  }
  if (report.a11y) {
    const { added, fixed } = report.a11y;
    if (added.length || fixed.length) {
      const top = added.slice(0, 3).map((i) => `${i.rule} on \`${i.target}\``).join(', ');
      lines.push(`- Accessibility: ${added.length} new issue${added.length === 1 ? '' : 's'}${top ? ` (${top})` : ''}, ${fixed.length} fixed.`);
    } else {
      lines.push('- Accessibility: no new or fixed axe issues.');
    }
    const focus = report.a11y.focus.filter((f) => f.delta.changed);
    if (focus.length) lines.push(`- Keyboard focus order changed on ${focus.map((f) => f.capture).join(', ')}.`);
  }
  if (report.tokens) {
    const fresh = report.tokens.findings.filter((f) => f.isNew);
    const notAudited = report.tokens.skipped.length ? ` Not audited (no tokens of that kind recognized): ${report.tokens.skipped.join(', ')}.` : '';
    if (fresh.length) {
      const top = fresh.slice(0, 3).map((f) => `${f.property} \`${f.value}\``).join(', ');
      lines.push(`- Design tokens: ${fresh.length} new off-token value${fresh.length === 1 ? '' : 's'} (${top}).${notAudited}`);
    } else {
      lines.push(`- Design tokens: no new off-token values in the changed areas.${notAudited}`);
    }
  }
  const cut = report.captures.filter((c) => c.truncated);
  if (cut.length) lines.push(`- ⚠️ ${cut.length} capture${cut.length === 1 ? '' : 's'} only cover the top of the page (capture.maxHeight); changes further down were not compared.`);
  if (report.variants.length) lines.push(`- ${report.variants.length} variant set${report.variants.length === 1 ? '' : 's'} to choose from below.`);
  if (report.motion.length) lines.push(`- ${report.motion.length} motion clip${report.motion.length === 1 ? '' : 's'} recorded for interactions static screenshots miss.`);
  const still = report.motion.filter((m) => m.warnings?.some((w) => w.startsWith('no motion detected')));
  if (still.length) lines.push(`- No motion detected in ${still.map((m) => `\`${m.route.path}\``).join(', ')} (single-frame clip).`);
  if (report.motionNoAnimation?.length) lines.push(`- Motion not recorded for ${report.motionNoAnimation.map((r) => `\`${r}\``).join(', ')}: their changed files touch no transition, animation or interaction state.`);
  if (report.motionSkipped?.length) lines.push(`- Motion not recorded for unchanged routes: ${report.motionSkipped.map((r) => `\`${r}\``).join(', ')}.`);
  const deps = report.detect?.dependencies ?? [];
  const uiDeps = deps.filter((d) => d.ui);
  const otherDeps = deps.filter((d) => !d.ui);
  if (uiDeps.length) lines.push(`- UI dependencies changed (${uiDeps.slice(0, 3).map(describeDependency).join(', ')}${uiDeps.length > 3 ? ', …' : ''}), so their routes were captured.`);
  if (otherDeps.length) lines.push(`- ${otherDeps.length} dependency change${otherDeps.length === 1 ? '' : 's'} not checked visually (${otherDeps.slice(0, 3).map(describeDependency).join(', ')}${otherDeps.length > 3 ? ', …' : ''}).`);
  if (report.detect?.skippedRoutes.length) lines.push(`- Not captured (over the route limit): ${report.detect.skippedRoutes.map((r) => `\`${r}\``).join(', ')}.`);
  if (report.detect?.needsExample.length) lines.push(`- Not captured (dynamic routes need example values): ${report.detect.needsExample.map((n) => `\`${n.route}\``).join(', ')}.`);
  return lines.join('\n');
}
