import type { Page } from 'playwright';
import type { FlowStep } from './config.js';

/** Why a flow stopped: its element never appeared, an action or wait ran out of time, or something else failed. */
export type FlowStopKind = 'missing' | 'timeout' | 'error';

/** Where a flow stopped on one side. */
export interface FlowStop {
  /** 1-based. */
  step: number;
  /** "click button.pay". */
  action: string;
  /** "click", "type into", "wait for"… */
  verb: string;
  selector?: string;
  kind: FlowStopKind;
  timeoutMs?: number;
  /** First line of the error, for kind "error". */
  message?: string;
}

/** One side's replay of a flow, kept on each of its checkpoint records. */
export interface FlowRunInfo {
  name: string;
  /** Readable name of each step's element where it was found ("button 'Pay'"), by step index. */
  names: Array<string | null>;
  stoppedAt?: FlowStop;
  /** False when the flow stopped before this checkpoint, so nothing was captured for it. */
  reached: boolean;
  /** The whole replay on this side, page load and checkpoints included. */
  ms: number;
}

function verbOf(step: FlowStep): string {
  if ('click' in step) return 'click';
  if ('hover' in step) return 'hover';
  if ('focus' in step) return 'focus';
  if ('type' in step) return 'type into';
  if ('press' in step) return 'press';
  if ('select' in step) return 'select in';
  if ('scroll' in step) return 'scroll to';
  if ('wait' in step) return 'wait for';
  return 'capture';
}

export function describeFlowStep(step: FlowStep): string {
  if ('type' in step) return `type ${JSON.stringify(step.text)} into ${step.type}`;
  if ('select' in step) return `select ${JSON.stringify(step.value)} in ${step.select}`;
  if ('press' in step) return `press ${step.press}`;
  if ('scroll' in step) return typeof step.scroll === 'number' ? `scroll to ${step.scroll}px` : `scroll to ${step.scroll}`;
  if ('wait' in step) return typeof step.wait === 'number' ? `wait ${step.wait}ms` : `wait for ${step.wait}`;
  const selector = flowStepSelector(step);
  return selector ? `${verbOf(step)} ${selector}` : `checkpoint '${step.checkpoint}'`;
}

export function flowStepSelector(step: FlowStep): string | undefined {
  if ('click' in step) return step.click;
  if ('hover' in step) return step.hover;
  if ('focus' in step) return step.focus;
  if ('type' in step) return step.type;
  if ('select' in step) return step.select;
  if ('scroll' in step && typeof step.scroll === 'string') return step.scroll;
  if ('wait' in step && typeof step.wait === 'string') return step.wait;
  return undefined;
}

async function present(page: Page, selector: string, timeoutMs: number): Promise<boolean> {
  const locator = page.locator(selector);
  if ((await locator.count()) > 0) return true;
  return locator
    .first()
    .waitFor({ state: 'attached', timeout: timeoutMs })
    .then(
      () => true,
      () => false,
    );
}

/** "button 'Pay'", as the element map names it, or null without an accessible name. */
async function nameOf(page: Page, selector: string): Promise<string | null> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      // No named helper functions in here: the test runner's transpiler wraps them in a helper the page lacks.
      const h = (window as unknown as { __uiDiff?: { accessibleName(e: Element): string; role(e: Element): string } }).__uiDiff;
      if (!h) return null;
      const role = h.role(el);
      const kind = /^H[1-6]$/.test(el.tagName) ? 'heading' : role === 'generic' ? el.tagName.toLowerCase() : role;
      const text = h.accessibleName(el).replace(/\s+/g, ' ').trim();
      return text ? `${kind} '${text.length > 40 ? `${text.slice(0, 39)}…` : text}'` : null;
    })
    .catch(() => null);
}

async function act(page: Page, step: FlowStep, timeout: number): Promise<void> {
  if ('click' in step) await page.locator(step.click).first().click({ timeout });
  else if ('hover' in step) await page.locator(step.hover).first().hover({ timeout });
  else if ('focus' in step) await page.locator(step.focus).first().focus({ timeout });
  else if ('type' in step) await page.locator(step.type).first().fill(step.text, { timeout });
  else if ('press' in step) await page.keyboard.press(step.press);
  else if ('select' in step) await page.locator(step.select).first().selectOption(step.value, { timeout });
  else if ('scroll' in step) {
    if (typeof step.scroll === 'number') await page.evaluate((top) => window.scrollTo({ top, behavior: 'auto' }), step.scroll);
    else await page.locator(step.scroll).first().scrollIntoViewIfNeeded({ timeout });
  } else if ('wait' in step) {
    if (typeof step.wait === 'number') await page.waitForTimeout(step.wait);
    else await page.locator(step.wait).first().waitFor({ state: 'visible', timeout });
  }
}

export interface FlowRunOptions {
  /** How long a step waits for its element, and for its action to finish. */
  timeoutMs: number;
  /** Called after each step that is a checkpoint; captures the page. Must not throw. */
  onCheckpoint: (name: string, step: number) => Promise<void>;
}

/**
 * Runs a flow's steps in order on a settled page, calling `onCheckpoint` after each checkpoint
 * step. Stops at the first step whose element does not appear within the timeout, whose action
 * or wait runs out of time, or that fails otherwise, and says where and why. Records the readable
 * name of each step's element, so the other side can name an element this side never found.
 */
export async function runFlow(page: Page, steps: FlowStep[], opts: FlowRunOptions): Promise<{ names: Array<string | null>; stoppedAt?: FlowStop }> {
  const names: Array<string | null> = steps.map(() => null);
  for (const [i, step] of steps.entries()) {
    const selector = flowStepSelector(step);
    const stop = (kind: FlowStopKind, extra: Partial<FlowStop> = {}): FlowStop => ({ step: i + 1, action: describeFlowStep(step), verb: verbOf(step), ...(selector ? { selector } : {}), kind, ...extra });
    try {
      if (selector) {
        if (!(await present(page, selector, opts.timeoutMs))) return { names, stoppedAt: stop('missing', { timeoutMs: opts.timeoutMs }) };
        names[i] = await nameOf(page, selector);
      }
      await act(page, step, opts.timeoutMs);
    } catch (error) {
      const message = (error as Error).message.split('\n')[0];
      return { names, stoppedAt: /Timeout \d+ms exceeded/.test(message) ? stop('timeout', { timeoutMs: opts.timeoutMs }) : stop('error', { message }) };
    }
    if (step.checkpoint !== undefined) await opts.onCheckpoint(step.checkpoint, i);
  }
  return { names };
}

function seconds(ms: number | undefined): string {
  return ms === undefined ? 'the timeout' : `${+(ms / 1000).toFixed(1)}s`;
}

/** "button 'Pay' not found", "nothing matches #pay", "could not click button 'Pay' within 5s". */
export function stopReason(stop: FlowStop, label?: string | null): string {
  const target = label ?? stop.selector ?? '';
  if (stop.kind === 'missing') return label ? `${label} not found` : `nothing matches ${stop.selector}`;
  if (stop.kind === 'timeout') return stop.verb === 'wait for' ? `${target} did not appear within ${seconds(stop.timeoutMs)}` : `could not ${stop.verb} ${target} within ${seconds(stop.timeoutMs)}`;
  return `${stop.action} failed: ${stop.message ?? 'unknown error'}`;
}

export interface FlowOutcome {
  /** One side stops where the other goes on: a finding about the change. */
  finding?: string;
  /** Both stop at the same step: the flow itself is wrong (a config problem). */
  problem?: string;
}

type SideRun = Pick<FlowRunInfo, 'names' | 'stoppedAt'>;

/**
 * Compares where a flow stopped on each side. A step's element is named from the side that found
 * it ("button 'Pay' not found" on head, named from base), else by its selector.
 */
export function flowOutcome(name: string, base: SideRun, head: SideRun): FlowOutcome {
  const [b, h] = [base.stoppedAt, head.stoppedAt];
  if (!b && !h) return {};
  const label = (stop: FlowStop, own: SideRun, other: SideRun) => other.names[stop.step - 1] ?? own.names[stop.step - 1] ?? null;
  if (b && h && b.step === h.step) return { problem: `flow '${name}' stops at step ${h.step} on base and head: ${stopReason(h, label(h, head, base))}; check the flow in the config` };
  const [side, stop, own, other, later] = h && (!b || h.step < b.step) ? (['head', h, head, base, b] as const) : (['base', b!, base, head, h] as const);
  const otherSide = side === 'head' ? 'base' : 'head';
  return { finding: `flow '${name}' stops at step ${stop.step} on ${side}: ${stopReason(stop, label(stop, own, other))}${later ? ` (${otherSide} stops later, at step ${later.step})` : ''}` };
}
