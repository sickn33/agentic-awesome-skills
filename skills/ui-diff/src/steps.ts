import type { Page } from 'playwright';
import type { Step } from './config.js';

export function describeStep(step: Step): string {
  if ('hover' in step) return `hover ${step.hover}`;
  if ('click' in step) return `click ${step.click}`;
  if ('focus' in step) return `focus ${step.focus}`;
  if ('press' in step) return `press ${step.press}`;
  if ('fill' in step) return `fill ${step.fill}`;
  if ('scroll' in step) return typeof step.scroll === 'number' ? `scroll to ${step.scroll}px` : `scroll to ${step.scroll}`;
  if ('wait' in step) return `wait ${step.wait}ms`;
  if ('waitFor' in step) return `wait for ${step.waitFor}`;
  return `move mouse to ${step.mouse[0]},${step.mouse[1]}`;
}

function selectorOf(step: Step): string | undefined {
  if ('hover' in step) return step.hover;
  if ('click' in step) return step.click;
  if ('focus' in step) return step.focus;
  if ('fill' in step) return step.fill;
  if ('waitFor' in step) return step.waitFor;
  if ('scroll' in step && typeof step.scroll === 'string') return step.scroll;
  return undefined;
}

export interface StepOptions {
  timeoutMs?: number;
  /** Skip steps whose element does not exist (e.g. a control that is new on head) instead of failing. */
  skipMissing?: boolean;
  /** With skipMissing: how long a missing element may take to appear (e.g. after a previous click) before its step is skipped. */
  waitForMissingMs?: number;
}

async function isPresent(page: Page, selector: string, waitMs: number): Promise<boolean> {
  const locator = page.locator(selector);
  if ((await locator.count()) > 0) return true;
  if (waitMs <= 0) return false;
  return locator
    .first()
    .waitFor({ state: 'attached', timeout: waitMs })
    .then(
      () => true,
      () => false,
    );
}

/** Runs interaction steps; returns the descriptions of skipped steps. */
export async function runSteps(page: Page, steps: Step[], opts: StepOptions | number = {}): Promise<string[]> {
  const { timeoutMs = 10000, skipMissing = false, waitForMissingMs = 0 } = typeof opts === 'number' ? { timeoutMs: opts } : opts;
  const skipped: string[] = [];
  for (const step of steps) {
    const selector = selectorOf(step);
    if (skipMissing && selector && !(await isPresent(page, selector, waitForMissingMs))) {
      skipped.push(describeStep(step));
      continue;
    }
    try {
      if ('hover' in step) await page.locator(step.hover).first().hover({ timeout: timeoutMs });
      else if ('click' in step) await page.locator(step.click).first().click({ timeout: timeoutMs });
      else if ('focus' in step) await page.locator(step.focus).first().focus({ timeout: timeoutMs });
      else if ('press' in step) await page.keyboard.press(step.press);
      else if ('fill' in step) await page.locator(step.fill).first().fill(step.value, { timeout: timeoutMs });
      else if ('scroll' in step) {
        if (typeof step.scroll === 'number') {
          await page.evaluate(([top, smooth]) => window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }), [step.scroll, step.smooth ?? true] as const);
        } else {
          await page.locator(step.scroll).first().scrollIntoViewIfNeeded({ timeout: timeoutMs });
        }
      } else if ('wait' in step) await page.waitForTimeout(step.wait);
      else if ('waitFor' in step) await page.locator(step.waitFor).first().waitFor({ state: 'visible', timeout: timeoutMs });
      else if ('mouse' in step) await page.mouse.move(step.mouse[0], step.mouse[1], { steps: 8 });
    } catch (error) {
      throw new Error(`step "${describeStep(step)}" failed: ${(error as Error).message.split('\n')[0]}`);
    }
  }
  return skipped;
}
