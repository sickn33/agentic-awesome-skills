import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Page } from 'playwright';

export interface AxeNode {
  target: string;
  html: string;
  summary: string;
}

export interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeNode[];
}

export interface FocusStop {
  selector: string;
  name: string;
  role: string;
  box: { x: number; y: number; width: number; height: number };
}

export interface A11yIssue {
  rule: string;
  impact: string | null;
  help: string;
  helpUrl: string;
  category: 'contrast' | 'labels' | 'focus' | 'other';
  target: string;
  html: string;
  summary: string;
}

export interface FocusDelta {
  changed: boolean;
  added: string[];
  removed: string[];
  /** Same control (stable selector) whose accessible name changed, e.g. a removed <label>. */
  renamed: string[];
  reordered: boolean;
  before: string[];
  after: string[];
  newOrderJumps: string[];
  fixedOrderJumps: string[];
}

export interface A11yDelta {
  added: A11yIssue[];
  fixed: A11yIssue[];
  focus?: FocusDelta;
}

const require = createRequire(import.meta.url);
let axeSource: string | undefined;

function loadAxe(): string {
  if (!axeSource) axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  return axeSource;
}

const CONTRAST_RULES = new Set(['color-contrast', 'color-contrast-enhanced', 'link-in-text-block']);
const LABEL_RULES = new Set([
  'label',
  'button-name',
  'link-name',
  'image-alt',
  'input-image-alt',
  'input-button-name',
  'aria-input-field-name',
  'aria-toggle-field-name',
  'select-name',
  'svg-img-alt',
  'role-img-alt',
  'frame-title',
  'label-title-only',
  'label-content-name-mismatch',
  'aria-command-name',
  'document-title',
]);
const FOCUS_RULES = new Set(['tabindex', 'focus-order-semantics', 'scrollable-region-focusable', 'nested-interactive', 'aria-hidden-focus', 'frame-focusable-content']);

export function categorize(rule: string): A11yIssue['category'] {
  if (CONTRAST_RULES.has(rule)) return 'contrast';
  if (LABEL_RULES.has(rule)) return 'labels';
  if (FOCUS_RULES.has(rule)) return 'focus';
  return 'other';
}

export async function runAxe(page: Page, opts: { tags: string[]; rules: Record<string, boolean> }): Promise<AxeViolation[]> {
  const hasAxe = await page.evaluate(() => typeof (window as unknown as { axe?: unknown }).axe !== 'undefined');
  if (!hasAxe) await page.addScriptTag({ content: loadAxe() });
  return page.evaluate(async ({ tags, rules }) => {
    type AxeResult = {
      violations: Array<{
        id: string;
        impact: string | null;
        help: string;
        helpUrl: string;
        tags: string[];
        nodes: Array<{ target: unknown[]; html: string; failureSummary?: string }>;
      }>;
    };
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: unknown) => Promise<AxeResult> } }).axe;
    const ruleOptions = Object.fromEntries(Object.entries(rules).map(([id, enabled]) => [id, { enabled }]));
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags }, rules: ruleOptions, resultTypes: ['violations'] });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.slice(0, 30).map((n) => ({
        target: n.target.map((t) => (Array.isArray(t) ? t.join(' ') : String(t))).join(' '),
        html: n.html.replace(/\s+/g, ' ').slice(0, 160),
        summary: (n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 240),
      })),
    }));
  }, opts);
}

export async function collectFocusOrder(page: Page, maxStops: number): Promise<FocusStop[]> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    window.scrollTo(0, 0);
  });
  const stops: FocusStop[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const helpers = (window as unknown as { __uiDiff: { cssPath(e: Element): string; accessibleName(e: Element): string; role(e: Element): string } }).__uiDiff;
      const r = el.getBoundingClientRect();
      return {
        selector: helpers.cssPath(el),
        name: helpers.accessibleName(el),
        role: helpers.role(el),
        box: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) },
      };
    });
    if (!stop || seen.has(stop.selector)) break;
    seen.add(stop.selector);
    stops.push(stop);
  }
  return stops;
}

function nodeKeys(rule: string, node: AxeNode): string[] {
  return [`${rule}|t|${node.target}`, `${rule}|h|${node.html}`];
}

function flatten(violations: AxeViolation[]): A11yIssue[] {
  return violations.flatMap((v) =>
    v.nodes.map((n) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      category: categorize(v.id),
      target: n.target,
      html: n.html,
      summary: n.summary,
    })),
  );
}

/** Issues present on only one side. Nodes match by selector, falling back to their HTML. */
export function diffViolations(base: AxeViolation[], head: AxeViolation[]): { added: A11yIssue[]; fixed: A11yIssue[] } {
  const baseIssues = flatten(base);
  const headIssues = flatten(head);
  const keysOf = (issues: A11yIssue[]) => new Set(issues.flatMap((i) => nodeKeys(i.rule, i)));
  const baseKeys = keysOf(baseIssues);
  const headKeys = keysOf(headIssues);
  const added = headIssues.filter((i) => !nodeKeys(i.rule, i).some((k) => baseKeys.has(k)));
  const fixed = baseIssues.filter((i) => !nodeKeys(i.rule, i).some((k) => headKeys.has(k)));
  return { added, fixed };
}

function labelOf(stop: FocusStop): string {
  const name = stop.name ? `"${stop.name.slice(0, 40)}"` : stop.selector;
  return `${stop.role} ${name}`;
}

const isStableSelector = (selector: string) => /^#[\w-]+$|^\[data-(?:testid|test|qa|cy)=/.test(selector);

/** Identity keys: a stable selector present on both sides, otherwise role + accessible name. */
function keyed(stops: FocusStop[], sharedSelectors: Set<string>): string[] {
  const counts = new Map<string, number>();
  return stops.map((s) => {
    if (sharedSelectors.has(s.selector)) return `sel|${s.selector}`;
    const base = `${s.role}|${s.name.toLowerCase()}`;
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return n > 1 ? `${base}#${n}` : base;
  });
}

/** Pairs of consecutive stops where focus jumps against reading order (up, or left on the same line). */
export function orderJumps(stops: FocusStop[]): string[] {
  const jumps: string[] = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1].box;
    const b = stops[i].box;
    const sameLine = Math.abs(a.y - b.y) < Math.max(12, Math.min(a.height, b.height) / 2);
    const backwards = (!sameLine && b.y + b.height <= a.y) || (sameLine && b.x + b.width <= a.x);
    if (backwards) jumps.push(`${labelOf(stops[i - 1])} → ${labelOf(stops[i])}`);
  }
  return jumps;
}

function lcsLength(a: string[], b: string[]): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
  return dp[a.length][b.length];
}

export function diffFocusOrder(base: FocusStop[], head: FocusStop[]): FocusDelta {
  const headStable = new Map(head.filter((s) => isStableSelector(s.selector)).map((s) => [s.selector, s]));
  const shared = new Set(base.filter((s) => headStable.has(s.selector)).map((s) => s.selector));
  const renamed = base
    .filter((s) => shared.has(s.selector) && headStable.get(s.selector)!.name !== s.name)
    .map((s) => `${s.role} "${s.name.slice(0, 40)}" → "${headStable.get(s.selector)!.name.slice(0, 40)}"`);
  const baseKeys = keyed(base, shared);
  const headKeys = keyed(head, shared);
  const baseSet = new Set(baseKeys);
  const headSet = new Set(headKeys);
  const added = head.filter((_, i) => !baseSet.has(headKeys[i])).map(labelOf);
  const removed = base.filter((_, i) => !headSet.has(baseKeys[i])).map(labelOf);
  const commonBase = baseKeys.filter((k) => headSet.has(k));
  const commonHead = headKeys.filter((k) => baseSet.has(k));
  const reordered = lcsLength(commonBase, commonHead) < commonBase.length;
  const baseJumps = new Set(orderJumps(base));
  const headJumps = orderJumps(head);
  const headJumpSet = new Set(headJumps);
  const newOrderJumps = headJumps.filter((j) => !baseJumps.has(j));
  const fixedOrderJumps = [...baseJumps].filter((j) => !headJumpSet.has(j));
  return {
    changed: added.length > 0 || removed.length > 0 || renamed.length > 0 || reordered || newOrderJumps.length > 0,
    added,
    removed,
    renamed,
    reordered,
    before: base.slice(0, 15).map(labelOf),
    after: head.slice(0, 15).map(labelOf),
    newOrderJumps,
    fixedOrderJumps,
  };
}
