import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { chromium, devices, type Browser, type BrowserContext, type BrowserContextOptions, type Locator, type Page } from 'playwright';
import { collectFocusOrder, runAxe, type AxeViolation, type FocusStop } from './a11y.js';
import { applyAuth, type ResolvedAuth } from './auth.js';
import { matchMiss, type ComponentRunInfo } from './components.js';
import type { ComponentState, ResolvedComponent, ResolvedConfig, ResolvedFlow, ResolvedRoute, ThemeConfig, ViewportConfig } from './config.js';
import { DEV_OVERLAY_SELECTORS, fontState, freezeAnimations, hideCss, initScript, pageHeight, scrollThrough, settleFonts, waitForFontsAndImages, type FontState } from './determinism.js';
import { exec } from './exec.js';
import { runFlow, stopReason, type FlowRunInfo } from './flows.js';
import type { Box } from './image.js';
import { log, redact, UiDiffError } from './log.js';
import type { SideFingerprint } from './report.js';
import type { SideName } from './sides.js';
import { runSteps } from './steps.js';
import { collectStyles } from './styles.js';
import { captureStates, type StateCapture } from './states.js';
import type { StyleSnapshot } from './tokens.js';
import { changedRegions, type UnsettledRegion } from './unsettled.js';

export interface CaptureTarget {
  id: string;
  side: SideName;
  route: ResolvedRoute;
  viewport: ViewportConfig;
  theme: ThemeConfig;
  url: string;
  file: string;
  styles?: { file: string; extraColors: string[] };
  /** Hover and focus states: where their crops go. Needs the element map (styles) to pair them. */
  states?: { dir: string };
  a11y?: boolean;
  focusOrder?: boolean;
}

/** One side of a flow: where it starts, and a capture target per checkpoint, in the flow's order. */
export interface FlowTarget {
  side: SideName;
  route: ResolvedRoute;
  viewport: ViewportConfig;
  theme: ThemeConfig;
  url: string;
  flow: ResolvedFlow;
  checkpoints: CaptureTarget[];
  /** flowLimits.stepTimeoutMs. */
  timeoutMs: number;
}

/** One side of a component: where it is, and a capture target per state, in the component's order. */
export interface ComponentTarget {
  side: SideName;
  route: ResolvedRoute;
  viewport: ViewportConfig;
  theme: ThemeConfig;
  url: string;
  component: ResolvedComponent;
  states: CaptureTarget[];
  /** flowLimits.stepTimeoutMs: for its flow's steps, and how long the root may take to appear. */
  timeoutMs: number;
}

export interface CaptureRecord {
  id: string;
  side: SideName;
  ok: boolean;
  file?: string;
  width?: number;
  height?: number;
  httpStatus?: number;
  error?: string;
  consoleErrors: string[];
  pageErrors: string[];
  truncated: boolean;
  stable: boolean;
  attempts: number;
  /** Set when screenshots of this one page load kept changing; lists the areas when they could be found. */
  unsettled?: UnsettledRegion[];
  /** The page clock was paused for the final screenshots because something kept moving. */
  frozeTimers?: boolean;
  stylesFile?: string;
  /** The style snapshot (element map) hit capture.styleMaxElements. */
  stylesCapped?: boolean;
  /** Elements in the element map. */
  stylesCount?: number;
  /** How many elements each focus and ignore selector matched on this page. */
  regionHits?: { focus: Record<string, number>; ignore: Record<string, number> };
  /** Device-px boxes of the elements matching a focus selector. */
  focusBoxes?: Box[];
  /** Hover and focus states of the page's interactive elements. */
  states?: StateCapture;
  /** Time spent on the style snapshot, on hover and focus states, and on axe plus focus order, within durationMs. */
  statesMs?: number;
  stylesMs?: number;
  a11yMs?: number;
  axe?: AxeViolation[];
  focusOrder?: FocusStop[];
  /** Route actions skipped because no element matched them on this side. */
  skippedActions?: string[];
  /** Web fonts loaded, failed or still loading when the screenshot was taken. */
  fonts?: FontState;
  /** Capture environment measured in the page (the fingerprint without commit and data label). */
  environment?: Omit<SideFingerprint, 'commit' | 'data'>;
  /** `window.devicePixelRatio` measured in the page: device pixels per CSS pixel in the screenshot. */
  scale?: number;
  /** A flow checkpoint: that side's replay of the flow, and whether it got this far. */
  flow?: FlowRunInfo;
  /** A component in one state: what its selector matched on this side, and its root. */
  component?: ComponentRunInfo;
  durationMs: number;
}

/** Element boxes relative to the viewport, for a screenshot of the viewport taken while scrolled. */
function toViewport(snapshot: StyleSnapshot, [sx, sy]: [number, number], scale: number): void {
  if (!sx && !sy) return;
  for (const e of snapshot.elements) {
    e.box = { ...e.box, x: e.box.x - sx, y: e.box.y - sy };
    e.deviceBox = { x: Math.round(e.box.x * scale), y: Math.round(e.box.y * scale), width: Math.round(e.box.width * scale), height: Math.round(e.box.height * scale) };
  }
}

/** Names the element behind each changing area so the warning can say what to mask. */
async function describeRegions(page: Page, boxes: Box[], fullPage: boolean): Promise<UnsettledRegion[]> {
  if (boxes.length === 0) return [];
  return page
    .evaluate(
      ({ boxes, fullPage }) => {
        // No named helper functions in here: the test runner's transpiler wraps them in a helper the page lacks.
        const dpr = window.devicePixelRatio || 1;
        const helpers = (window as unknown as { __uiDiff?: { cssPath(el: Element): string } }).__uiDiff;
        const ox = fullPage ? window.scrollX : 0;
        const oy = fullPage ? window.scrollY : 0;
        const elements = Array.from(document.body?.querySelectorAll('*') ?? []);
        const pageHeight = document.documentElement.scrollHeight;
        const out: Array<{ selector?: string; box: { x: number; y: number; width: number; height: number } }> = [];
        for (const device of boxes) {
          const box = { x: Math.floor(device.x / dpr), y: Math.floor(device.y / dpr), width: Math.ceil(device.width / dpr), height: Math.ceil(device.height / dpr) };
          let best: Element | undefined;
          let bestArea = Infinity;
          for (const el of elements) {
            const r = el.getBoundingClientRect();
            const area = r.width * r.height;
            if (area === 0 || area >= bestArea) continue;
            const left = r.left + ox;
            const top = r.top + oy;
            if (left <= box.x + 2 && top <= box.y + 2 && left + r.width >= box.x + box.width - 2 && top + r.height >= box.y + box.height - 2) {
              best = el;
              bestArea = area;
            }
          }
          if (!best) {
            // Nothing covers both where it was and where it went (e.g. a positioned element that moves): take the
            // biggest overlap, looking a little around the box because the area it just left is empty.
            const near = { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 };
            let bestOverlap = 0;
            for (const el of elements) {
              const r = el.getBoundingClientRect();
              if (r.width * r.height === 0 || r.width * r.height > 4 * near.width * near.height) continue;
              const w = Math.min(r.left + ox + r.width, near.x + near.width) - Math.max(r.left + ox, near.x);
              const h = Math.min(r.top + oy + r.height, near.y + near.height) - Math.max(r.top + oy, near.y);
              if (w > 0 && h > 0 && w * h > bestOverlap) {
                best = el;
                bestOverlap = w * h;
              }
            }
          }
          // Carousels, tickers and marquees move inside a clipping box; that box, not the moving slide, is what to mask.
          let target = best;
          for (let cur = best, depth = 0; cur && cur !== document.body && depth < 6; cur = cur.parentElement ?? undefined, depth++) {
            if (cur.getBoundingClientRect().height >= pageHeight * 0.9) break;
            const style = getComputedStyle(cur);
            if (/hidden|clip|auto|scroll/.test(style.overflowX + style.overflowY)) {
              target = cur;
              break;
            }
          }
          const selector = (target && helpers?.cssPath(target)) || undefined;
          if (selector && out.some((o) => o.selector === selector)) continue;
          const r = target?.getBoundingClientRect();
          out.push({ selector, box: r ? { x: Math.round(r.left + ox), y: Math.round(r.top + oy), width: Math.round(r.width), height: Math.round(r.height) } : box });
        }
        return out;
      },
      { boxes, fullPage },
    )
    .catch((error: Error) => {
      log.debug(`could not name the areas that kept changing: ${error.message.split('\n')[0]}`);
      return [];
    });
}

/** How long a route action waits for its element to appear before it is skipped as missing on that side. */
const MISSING_ACTION_WAIT_MS = 3000;

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export function withQuery(url: string, params: Record<string, string> | undefined): string {
  if (!params || Object.keys(params).length === 0) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export function routeUrl(root: string, routePath: string, params?: Record<string, string>): string {
  return withQuery(new URL(routePath.replace(/^\/+/, ''), `${root.replace(/\/$/, '')}/`).toString(), params);
}

export function contextOptions(viewport: ViewportConfig, theme: ThemeConfig | undefined, cfg: ResolvedConfig, motion = false): BrowserContextOptions {
  const device = viewport.device ? devices[viewport.device] : undefined;
  if (viewport.device && !device) throw new UiDiffError(`Unknown Playwright device "${viewport.device}" in viewport ${viewport.name}`);
  const isMobile = viewport.isMobile ?? device?.isMobile ?? false;
  return {
    viewport: { width: viewport.width ?? device!.viewport.width, height: viewport.height ?? device!.viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor ?? device?.deviceScaleFactor ?? 1,
    isMobile,
    hasTouch: viewport.hasTouch ?? device?.hasTouch ?? false,
    userAgent: viewport.userAgent ?? device?.userAgent ?? (isMobile ? MOBILE_UA : undefined),
    colorScheme: theme?.colorScheme ?? 'light',
    reducedMotion: motion || !cfg.freeze.animations ? 'no-preference' : 'reduce',
    locale: cfg.capture.locale,
    timezoneId: cfg.capture.timezoneId,
    serviceWorkers: 'block',
    bypassCSP: true,
  };
}

const require = createRequire(import.meta.url);

/** Installs Playwright's Chromium on first use unless a system browser channel is configured. */
const BROWSER_HINT =
  'Run `npx --prefix <skill folder> playwright install chromium` once you are online (behind a proxy set HTTPS_PROXY, or PLAYWRIGHT_DOWNLOAD_HOST for a mirror), or use an installed Chrome with UI_DIFF_BROWSER_CHANNEL=chrome.';

/** Which browser captures run in: a browser channel (an installed Chrome), a custom executable, or Playwright's Chromium. */
export interface BrowserChoice {
  channel?: string;
  executablePath?: string;
  /** Recorded in the fingerprint: the channel name, "chromium" (bundled) or "custom executable" (the path is never recorded). */
  label: string;
}

/**
 * UI_DIFF_CHROMIUM_PATH wins, then UI_DIFF_BROWSER_CHANNEL, then config browser.channel, then the
 * Chromium Playwright downloads. Resolved once per run, so base and head always share the browser.
 */
export function resolveBrowser(configChannel?: string, env: NodeJS.ProcessEnv = process.env): BrowserChoice {
  if (env.UI_DIFF_CHROMIUM_PATH) return { executablePath: env.UI_DIFF_CHROMIUM_PATH, label: 'custom executable' };
  const channel = env.UI_DIFF_BROWSER_CHANNEL || configChannel;
  if (channel) return { channel, label: channel };
  return { label: 'chromium' };
}

/** Installs Playwright's Chromium on first use unless an installed browser was chosen. */
export async function ensureBrowser(choice: BrowserChoice = resolveBrowser()): Promise<void> {
  if (choice.channel || choice.executablePath) return;
  if (existsSync(chromium.executablePath())) return;
  log.step('installing Playwright Chromium (first run only)');
  const cli = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
  try {
    await exec(process.execPath, [cli, 'install', 'chromium'], { timeoutMs: 10 * 60 * 1000 });
  } catch (error) {
    const detail = (error as Error).message.split('\n').find((l) => /error|ECONN|ENOTFOUND|EAI_AGAIN|timed out|403|404/i.test(l)) ?? 'download failed';
    throw new UiDiffError(`Chromium is not installed and could not be downloaded (${detail.trim()})`, { hint: BROWSER_HINT });
  }
}

export async function launchBrowser(choice: BrowserChoice = resolveBrowser()): Promise<Browser> {
  await ensureBrowser(choice);
  try {
    return await chromium.launch({
      headless: true,
      channel: choice.channel,
      executablePath: choice.executablePath,
      args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars', '--disable-skia-runtime-opts'],
    });
  } catch (error) {
    const lines = (error as Error).message.split('\n').filter((l) => l.trim() && !/^\s*at /.test(l));
    throw new UiDiffError(`Could not start ${choice.label === 'chromium' ? 'Chromium' : choice.label}: ${lines.slice(0, 6).join(' ').replace(/\s+/g, ' ').slice(0, 600)}`, {
      hint: choice.channel
        ? `Install that browser (channel "${choice.channel}"), or unset UI_DIFF_BROWSER_CHANNEL / browser.channel to use Playwright's Chromium.`
        : 'On Linux install the system libraries with `npx --prefix <skill folder> playwright install --with-deps chromium`, or set UI_DIFF_BROWSER_CHANNEL=chrome to use an installed Chrome.',
    });
  }
}

export interface SessionOptions {
  cfg: ResolvedConfig;
  auth?: ResolvedAuth;
  /** Instant used when freeze.time is "run-start". */
  runStart: Date;
  /** Fingerprint name of the browser (BrowserChoice.label); defaults to "chromium". */
  browserLabel?: string;
}

/** The instant Date is frozen at for still captures, or undefined when freeze.clock is off. */
export function frozenTime(cfg: ResolvedConfig, runStart: Date): Date | undefined {
  if (!cfg.freeze.clock) return undefined;
  return cfg.freeze.time === 'run-start' ? runStart : new Date(cfg.freeze.time);
}

export class CaptureSession {
  constructor(
    private readonly browser: Browser,
    private readonly opts: SessionOptions,
  ) {}

  async newContext(viewport: ViewportConfig, theme: ThemeConfig | undefined, extra: Partial<BrowserContextOptions> = {}, motion = false): Promise<BrowserContext> {
    const { cfg } = this.opts;
    // Motion clips always run with prefers-reduced-motion: no-preference; static captures may stay reduced.
    const context = await this.browser.newContext({ ...contextOptions(viewport, theme, cfg, motion), ...extra, ...(motion ? { reducedMotion: 'no-preference' as const } : {}) });
    const instant = frozenTime(cfg, this.opts.runStart);
    if (instant && !motion) {
      await context.clock.setFixedTime(instant);
    } else if (!motion) {
      // Time keeps flowing; installed up front so timers can be paused later without performance.now() jumping.
      await context.clock.install();
    }
    await context.addInitScript({ content: initScript({ seed: cfg.freeze.random ? cfg.freeze.seed : undefined, localStorage: theme?.localStorage }) });
    await applyAuth(context, this.opts.auth);
    context.setDefaultTimeout(cfg.capture.timeoutMs);
    return context;
  }

  /** Measured in the page where it can be: what this capture was rendered with. */
  private async environment(page: Page, target: CaptureTarget, fonts: FontState): Promise<Omit<SideFingerprint, 'commit' | 'data'>> {
    const { cfg } = this.opts;
    const measured = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      deviceScaleFactor: window.devicePixelRatio,
      userAgent: navigator.userAgent,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference',
      colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'no-preference',
    }));
    const clock = frozenTime(cfg, this.opts.runStart);
    return {
      viewport: { width: measured.width, height: measured.height, deviceScaleFactor: measured.deviceScaleFactor, isMobile: contextOptions(target.viewport, target.theme, cfg).isMobile ?? false },
      browser: { name: this.opts.browserLabel ?? 'chromium', version: this.browser.version(), userAgent: measured.userAgent },
      fonts,
      freeze: { clock: clock ? clock.toISOString() : null, seed: cfg.freeze.random ? cfg.freeze.seed : null, animations: cfg.freeze.animations, fonts: cfg.freeze.fonts },
      media: { reducedMotion: measured.reducedMotion, colorScheme: measured.colorScheme, locale: measured.locale, timezone: measured.timezone },
    };
  }

  private async waitForFonts(page: Page, timeoutMs: number): Promise<void> {
    await settleFonts(page, timeoutMs);
    await waitForFontsAndImages(page, timeoutMs);
  }

  /**
   * Navigates and brings the page to a settled, deterministic state: network idle, fonts, lazy
   * content loaded by scrolling through the page, and only then the route's actions, so they can
   * target lazy-loaded elements and an opened menu or hover is not undone by that scroll.
   */
  async openAndSettle(page: Page, url: string, route: ResolvedRoute, opts: { freeze: boolean; fullPage: boolean }): Promise<{ status?: number; skippedActions: string[] }> {
    const { cfg } = this.opts;
    const response = await page.goto(url, { waitUntil: cfg.capture.waitUntil, timeout: cfg.capture.timeoutMs });
    if (cfg.capture.networkIdleTimeoutMs > 0) {
      await page.waitForLoadState('networkidle', { timeout: cfg.capture.networkIdleTimeoutMs }).catch(() => undefined);
    }
    if (route.waitFor) await page.locator(route.waitFor).first().waitFor({ state: 'visible', timeout: cfg.capture.timeoutMs });
    if (opts.freeze) await freezeAnimations(page);
    if (cfg.freeze.fonts) await this.waitForFonts(page, cfg.freeze.fontTimeoutMs);
    if (opts.fullPage && cfg.capture.scrollToLoad) {
      await scrollThrough(page, cfg.capture.maxHeight);
      if (cfg.freeze.fonts) await this.waitForFonts(page, Math.min(5000, cfg.freeze.fontTimeoutMs));
    }
    let skippedActions: string[] = [];
    if (route.actions.length) {
      await page.evaluate(() => window.scrollTo(0, 0));
      // An element that exists on only one side (new on head, removed on base) skips the action there with a warning.
      skippedActions = await runSteps(page, route.actions, { timeoutMs: cfg.capture.timeoutMs, skipMissing: true, waitForMissingMs: Math.min(cfg.capture.timeoutMs, MISSING_ACTION_WAIT_MS) });
    }
    if (opts.freeze) await freezeAnimations(page);
    if (!route.actions.some((a) => 'scroll' in a)) await page.evaluate(() => window.scrollTo(0, 0));
    if (cfg.capture.settleMs) await page.waitForTimeout(cfg.capture.settleMs);
    return { status: response?.status(), skippedActions };
  }

  async screenshot(
    page: Page,
    route: ResolvedRoute,
    fullPage: boolean,
  ): Promise<{ buffer: Buffer; stable: boolean; attempts: number; truncated: boolean; unsettled?: UnsettledRegion[]; frozeTimers: boolean }> {
    const { cfg } = this.opts;
    const masks = [...cfg.capture.mask, ...route.mask, ...cfg.ignore, ...route.ignore];
    const hidden = [...cfg.capture.hide, ...route.hide, ...(cfg.capture.hideDevOverlays ? DEV_OVERLAY_SELECTORS : [])];
    const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
    let truncated = false;
    let clip: { x: number; y: number; width: number; height: number } | undefined;
    if (fullPage) {
      const height = await pageHeight(page);
      if (height > cfg.capture.maxHeight) {
        truncated = true;
        clip = { x: 0, y: 0, width: viewport.width, height: cfg.capture.maxHeight };
      }
    }
    const shoot = () =>
      page.screenshot({
        fullPage,
        clip,
        animations: cfg.freeze.animations ? 'disabled' : 'allow',
        caret: 'hide',
        scale: 'device',
        mask: masks.map((s) => page.locator(s)),
        maskColor: cfg.capture.maskColor,
        style: hideCss(hidden),
        timeout: cfg.capture.timeoutMs,
      });
    const wanted = cfg.capture.stableShots;
    let previous = await shoot();
    let attempts = 1;
    let streak = 1;
    let changes = 0;
    let moving: Box[] = [];
    let frozeTimers = false;
    while (streak < wanted && attempts < wanted + 3) {
      await page.waitForTimeout(120 * attempts);
      const next = await shoot();
      attempts++;
      if (next.equals(previous)) {
        streak++;
      } else {
        streak = 1;
        changes++;
        moving = changedRegions(previous, next);
        // Changing twice in a row is not a late image or font but something that keeps moving
        // (requestAnimationFrame, timers): pause the page clock so the screenshot is one frame.
        if (changes >= 2 && !frozeTimers) {
          frozeTimers = true;
          // pauseAt pauses first, so the clock is paused even if it throws because that time has already passed.
          await page.evaluate(() => Date.now() + 100).then((t) => page.context().clock.pauseAt(t)).catch(() => undefined);
        }
      }
      previous = next;
    }
    const stable = streak >= wanted;
    const unsettled = changes >= 2 || !stable ? await describeRegions(page, moving, fullPage) : undefined;
    // The caller resumes the clock once the element map describes this same frame.
    return { buffer: previous, stable, attempts, truncated, unsettled, frozeTimers };
  }

  /** A viewport area, shot like the full capture: same masks, hidden selectors and frozen animations. */
  private shootClip(page: Page, route: ResolvedRoute, clip: { x: number; y: number; width: number; height: number }): Promise<Buffer> {
    const { cfg } = this.opts;
    const masks = [...cfg.capture.mask, ...route.mask, ...cfg.ignore, ...route.ignore];
    const hidden = [...cfg.capture.hide, ...route.hide, ...(cfg.capture.hideDevOverlays ? DEV_OVERLAY_SELECTORS : [])];
    return page.screenshot({
      clip,
      animations: cfg.freeze.animations ? 'disabled' : 'allow',
      caret: 'hide',
      scale: 'device',
      mask: masks.map((s) => page.locator(s)),
      maskColor: cfg.capture.maskColor,
      style: hideCss(hidden),
      timeout: cfg.capture.timeoutMs,
    });
  }

  /**
   * The screenshot of a settled page and its element map, written where the target says; true when
   * the page clock was paused for the screenshot (the caller resumes it).
   */
  private async shootAndMap(page: Page, target: CaptureTarget, record: CaptureRecord, fullPage: boolean): Promise<boolean> {
    const { cfg } = this.opts;
    record.scale = await page.evaluate(() => window.devicePixelRatio);
    record.fonts = await fontState(page);
    record.environment = await this.environment(page, target, record.fonts);
    const shot = await this.screenshot(page, target.route, fullPage);
    mkdirSync(path.dirname(target.file), { recursive: true });
    writeFileSync(target.file, shot.buffer);
    Object.assign(record, { file: target.file, stable: shot.stable, attempts: shot.attempts, truncated: shot.truncated });
    if (shot.unsettled) record.unsettled = shot.unsettled;
    if (shot.frozeTimers) record.frozeTimers = true;
    if (target.styles) {
      const stylesStart = performance.now();
      const ignored = [...cfg.ignore, ...target.route.ignore];
      const focus = [...cfg.focus, ...target.route.focus];
      const masked = [...ignored, ...cfg.capture.mask, ...target.route.mask, ...cfg.capture.hide, ...target.route.hide, ...(cfg.capture.hideDevOverlays ? DEV_OVERLAY_SELECTORS : [])];
      const { snapshot, capped, hits } = await collectStyles(page, { maxElements: cfg.capture.styleMaxElements, ignore: cfg.tokens.ignoreSelectors, extraColors: target.styles.extraColors, masked, focus });
      if (!fullPage) toViewport(snapshot, await page.evaluate(() => [window.scrollX, window.scrollY] as [number, number]), record.scale);
      if (ignored.length || focus.length) {
        record.regionHits = { focus: Object.fromEntries(focus.map((sel, i) => [sel, hits.focus[i]])), ignore: Object.fromEntries(ignored.map((sel, i) => [sel, hits.masked[i]])) };
        record.focusBoxes = snapshot.elements.filter((e) => e.focus).map((e) => e.deviceBox!);
      }
      mkdirSync(path.dirname(target.styles.file), { recursive: true });
      writeFileSync(target.styles.file, JSON.stringify(snapshot));
      record.stylesFile = target.styles.file;
      if (capped) record.stylesCapped = true;
      record.stylesCount = snapshot.elements.length;
      record.stylesMs = Math.round(performance.now() - stylesStart);
    }
    return shot.frozeTimers;
  }

  /** After a flow step, before its checkpoint: the settle a page gets after opening, for the first viewport. */
  private async settleStep(page: Page): Promise<void> {
    const { cfg } = this.opts;
    if (cfg.capture.networkIdleTimeoutMs > 0) await page.waitForLoadState('networkidle', { timeout: cfg.capture.networkIdleTimeoutMs }).catch(() => undefined);
    if (cfg.freeze.animations) await freezeAnimations(page);
    if (cfg.freeze.fonts) await this.waitForFonts(page, Math.min(5000, cfg.freeze.fontTimeoutMs));
    if (cfg.capture.settleMs) await page.waitForTimeout(cfg.capture.settleMs);
  }

  /**
   * Replays a flow on one side: the page is opened and settled as for a capture (same context,
   * frozen inputs, network idle, fonts, animations), then the steps run, and at each checkpoint the
   * page is settled again and its first viewport shot and mapped like a capture. One record per
   * checkpoint, in order; those after the step where the flow stopped are not reached. Hover and
   * focus states are not recorded: they would move the pointer and focus the flow set up.
   */
  async flow(run: FlowTarget): Promise<CaptureRecord[]> {
    const { cfg } = this.opts;
    const started = Date.now();
    const records: CaptureRecord[] = run.checkpoints.map((t) => ({ id: t.id, side: t.side, ok: false, consoleErrors: [], pageErrors: [], truncated: false, stable: false, attempts: 0, durationMs: 0 }));
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const reached = new Set<number>();
    let result: Awaited<ReturnType<typeof runFlow>> = { names: run.flow.steps.map(() => null) };
    let context: BrowserContext | undefined;
    try {
      context = await this.newContext(run.viewport, run.theme);
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error' && consoleErrors.length < 10) consoleErrors.push(redact(msg.text()).slice(0, 300));
      });
      page.on('pageerror', (error) => {
        if (pageErrors.length < 10) pageErrors.push(redact(error.message).slice(0, 300));
      });
      const opened = await this.openAndSettle(page, run.url, { ...run.route, actions: [] }, { freeze: cfg.freeze.animations, fullPage: false });
      for (const r of records) r.httpStatus = opened.status;
      result = await runFlow(page, run.flow.steps, {
        timeoutMs: run.timeoutMs,
        onCheckpoint: async (_name, step) => {
          const i = run.flow.checkpoints.findIndex((c) => c.step === step);
          const [target, record] = [run.checkpoints[i], records[i]];
          const checkpointStart = Date.now();
          reached.add(i);
          try {
            await this.settleStep(page);
            if (await this.shootAndMap(page, target, record, false)) await page.context().clock.resume().catch(() => undefined);
            record.ok = true;
          } catch (error) {
            record.error = redact((error as Error).message.split('\n')[0]);
          }
          Object.assign(record, { consoleErrors: [...consoleErrors], pageErrors: [...pageErrors], durationMs: Date.now() - checkpointStart });
        },
      });
    } catch (error) {
      // The page did not open: a failed capture of every checkpoint, not a broken flow.
      const message = redact((error as Error).message.split('\n')[0]);
      records.forEach((r, i) => {
        if (reached.has(i)) return;
        reached.add(i);
        r.error = message;
      });
    } finally {
      await context?.close().catch(() => undefined);
    }
    const ms = Date.now() - started;
    records.forEach((r, i) => {
      r.flow = { name: run.flow.name, names: result.names, ...(result.stoppedAt ? { stoppedAt: result.stoppedAt } : {}), reached: reached.has(i), ms };
      if (!reached.has(i)) r.error = `not reached: the flow stopped at step ${result.stoppedAt?.step}`;
    });
    return records;
  }

  /**
   * Puts the component root in a state: the pointer on it, or keyboard focus on it (or on the
   * first focusable element inside it) so :focus-visible applies. True, or why it could not.
   */
  private async enterState(page: Page, root: Locator, state: ComponentState, timeoutMs: number): Promise<true | string> {
    if (state === 'default') return true;
    if (state === 'hover') {
      return root.hover({ timeout: timeoutMs }).then(
        () => true as const,
        (error: Error) => `the pointer could not reach it (${error.message.split('\n')[0]})`,
      );
    }
    const focused = await root.evaluate((el) => {
      const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
      const target = el.matches(FOCUSABLE) ? el : el.querySelector(FOCUSABLE);
      if (!target) return false;
      (target as HTMLElement).focus();
      return true;
    });
    if (!focused) return 'nothing in it can take keyboard focus';
    // Leaving and coming back with the keyboard is what makes :focus-visible apply after a click.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const reached = await root.evaluate((el) => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return Boolean(active) && (active === el || el.contains(active)) && active!.matches(':focus-visible');
    });
    return reached || 'keyboard focus did not come back to it with Tab';
  }

  /**
   * Captures one component on one side: the page opened and settled as for a capture (and, for a
   * component a flow shows, the flow replayed up to its checkpoint), the selector resolved to
   * exactly one visible element, then for each state the page settled, shot and mapped like a
   * capture, with the root's box and element-map selector. One record per state, in order; none is
   * captured when the selector matches nothing, several elements or a hidden one, or the flow stops.
   */
  async component(run: ComponentTarget): Promise<CaptureRecord[]> {
    const { cfg } = this.opts;
    const c = run.component;
    const started = Date.now();
    // A flow checkpoint is a capture of the first viewport, so a component it shows is too.
    const fullPage = !c.flow && (run.route.fullPage ?? cfg.capture.fullPage);
    const records: CaptureRecord[] = run.states.map((t) => ({ id: t.id, side: t.side, ok: false, consoleErrors: [], pageErrors: [], truncated: false, stable: false, attempts: 0, durationMs: 0 }));
    const infos: ComponentRunInfo[] = c.states.map((state) => ({ name: c.name, state, selector: c.selector, matches: 0, reached: false, ms: 0 }));
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const done = new Set<number>();
    let context: BrowserContext | undefined;
    try {
      context = await this.newContext(run.viewport, run.theme);
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error' && consoleErrors.length < 10) consoleErrors.push(redact(msg.text()).slice(0, 300));
      });
      page.on('pageerror', (error) => {
        if (pageErrors.length < 10) pageErrors.push(redact(error.message).slice(0, 300));
      });
      const opened = await this.openAndSettle(page, run.url, { ...run.route, actions: [] }, { freeze: cfg.freeze.animations, fullPage });
      for (const r of records) r.httpStatus = opened.status;
      let miss: { miss: ComponentRunInfo['miss']; note?: string } | undefined;
      if (c.flow) {
        const steps = c.flow.def.steps.slice(0, c.flow.checkpoint.step + 1);
        const { names, stoppedAt } = await runFlow(page, steps, { timeoutMs: run.timeoutMs, onCheckpoint: async () => undefined });
        if (stoppedAt) miss = { miss: 'flow', note: `flow '${c.flow.def.name}' stops at step ${stoppedAt.step} (${stopReason(stoppedAt, names[stoppedAt.step - 1])})` };
      }
      const root = page.locator(c.selector);
      if (!miss) {
        let count = await root.count();
        if (count === 0) count = await root.first().waitFor({ state: 'attached', timeout: run.timeoutMs }).then(() => root.count(), () => 0);
        for (const info of infos) info.matches = count;
        const unmatched = matchMiss(count) ?? ((await root.first().isVisible()) ? undefined : 'hidden');
        if (unmatched) miss = { miss: unmatched };
      }
      if (miss) {
        infos.forEach((info, i) => {
          Object.assign(info, miss);
          done.add(i);
        });
      }
      for (const [i, state] of c.states.entries()) {
        if (done.has(i)) continue;
        const [target, record, info] = [run.states[i], records[i], infos[i]];
        const stateStart = Date.now();
        done.add(i);
        try {
          const entered = await this.enterState(page, root.first(), state, run.timeoutMs);
          if (entered !== true) {
            Object.assign(info, { miss: 'state', note: entered });
            continue;
          }
          info.reached = true;
          await this.settleStep(page);
          if (await this.shootAndMap(page, target, record, fullPage)) await page.context().clock.resume().catch(() => undefined);
          info.root = await root.first().evaluate(
            (el, full) => {
              const r = el.getBoundingClientRect();
              const helpers = (window as unknown as { __uiDiff: { cssPath(e: Element): string } }).__uiDiff;
              return { selector: helpers.cssPath(el), box: { x: r.left + (full ? window.scrollX : 0), y: r.top + (full ? window.scrollY : 0), width: r.width, height: r.height } };
            },
            fullPage,
          );
          record.ok = true;
        } catch (error) {
          info.reached = true;
          record.error = redact((error as Error).message.split('\n')[0]);
        } finally {
          await page.mouse.move(-1, -1).catch(() => undefined);
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.()).catch(() => undefined);
          Object.assign(record, { consoleErrors: [...consoleErrors], pageErrors: [...pageErrors], durationMs: Date.now() - stateStart });
        }
      }
    } catch (error) {
      // The page did not open, or the selector is not valid CSS: a failed capture, not a missing component.
      const message = redact((error as Error).message.split('\n')[0]);
      records.forEach((r, i) => {
        if (done.has(i) && !infos[i].reached) return;
        done.add(i);
        infos[i].reached = true;
        if (!r.ok) r.error ??= message;
      });
    } finally {
      await context?.close().catch(() => undefined);
    }
    const ms = Date.now() - started;
    records.forEach((r, i) => {
      r.component = { ...infos[i], ms };
      if (!infos[i].reached) r.error = `not captured: ${infos[i].miss === 'none' ? `nothing matches ${c.selector}` : infos[i].miss === 'many' ? `${c.selector} matches ${infos[i].matches} elements` : infos[i].miss === 'hidden' ? `${c.selector} is not visible` : infos[i].note}`;
    });
    return records;
  }

  async capture(target: CaptureTarget): Promise<CaptureRecord> {
    const { cfg } = this.opts;
    const started = Date.now();
    const record: CaptureRecord = { id: target.id, side: target.side, ok: false, consoleErrors: [], pageErrors: [], truncated: false, stable: false, attempts: 0, durationMs: 0 };
    const fullPage = target.route.fullPage ?? cfg.capture.fullPage;
    let context: BrowserContext | undefined;
    try {
      context = await this.newContext(target.viewport, target.theme);
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error' && record.consoleErrors.length < 10) record.consoleErrors.push(redact(msg.text()).slice(0, 300));
      });
      page.on('pageerror', (error) => {
        if (record.pageErrors.length < 10) record.pageErrors.push(redact(error.message).slice(0, 300));
      });
      const opened = await this.openAndSettle(page, target.url, target.route, { freeze: cfg.freeze.animations, fullPage });
      record.httpStatus = opened.status;
      if (opened.skippedActions.length) record.skippedActions = opened.skippedActions;
      const frozeTimers = await this.shootAndMap(page, target, record, fullPage);
      if (target.states && target.styles) {
        const statesStart = performance.now();
        const masked = [...cfg.ignore, ...target.route.ignore, ...cfg.capture.mask, ...target.route.mask, ...cfg.capture.hide, ...target.route.hide, ...(cfg.capture.hideDevOverlays ? DEV_OVERLAY_SELECTORS : [])];
        record.states = await captureStates(page, {
          hover: cfg.states.hover,
          focus: cfg.states.focus,
          maxElements: cfg.states.maxElements,
          padding: cfg.states.padding,
          focusSelectors: [...cfg.focus, ...target.route.focus],
          masked,
          fonts: cfg.freeze.fonts,
          dir: target.states.dir,
          id: target.id,
          shoot: (clip) => this.shootClip(page, target.route, clip),
        });
        record.statesMs = Math.round(performance.now() - statesStart);
      }
      if (frozeTimers) await page.context().clock.resume().catch(() => undefined);
      const a11yStart = performance.now();
      if (target.a11y) record.axe = await runAxe(page, { tags: cfg.a11y.tags, rules: cfg.a11y.rules });
      if (target.focusOrder) record.focusOrder = await collectFocusOrder(page, cfg.a11y.maxTabStops);
      if (target.a11y || target.focusOrder) record.a11yMs = Math.round(performance.now() - a11yStart);
      record.ok = true;
    } catch (error) {
      record.error = redact((error as Error).message.split('\n')[0]);
    } finally {
      await context?.close().catch(() => undefined);
      record.durationMs = Date.now() - started;
    }
    return record;
  }
}
