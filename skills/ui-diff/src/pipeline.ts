import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import { diffFocusOrder, diffViolations, type A11yIssue } from './a11y.js';
import { baseCacheKey, restoreBaseCache, storeBaseCache, type BaseCacheEntry, type BaseCacheKey } from './cache.js';
import { resolveAuth, sanitizeUrl, type ResolvedAuth } from './auth.js';
import { CaptureSession, ensureBrowser, frozenTime, launchBrowser, resolveBrowser, routeUrl, type CaptureRecord, type CaptureTarget } from './capture.js';
import { componentCrop, componentOutcome, rootChange, scopeChanges, shiftSnapshot, toDevice } from './components.js';
import { parseVariantFlag, pickThemes, pickViewports, resolveRoute, type ComponentState, type FlowCheckpoint, type ResolvedComponent, type ResolvedConfig, type ResolvedFlow, type ResolvedRoute, type Step, type ThemeConfig, type VariantSpec, type ViewportConfig } from './config.js';
import { detectChanges, resolveBaseRef, type DetectResult } from './detect.js';
import { blinkFrames, clipToFocus, composeCompare, composePair, diffPngs, focusBoxes } from './diff.js';
import { diffElements, explainRegions, matchElements, onlyEffects, verifyChanges, type ElementChange } from './elements.js';
import { describeFlowStep, flowOutcome, stopReason } from './flows.js';
import { changedLines, git, gitCommonDir, mergeBase, revParse, shortSha } from './git.js';
import { measureText } from './font.js';
import { COLORS, composeRow, crop as cropPng, padTo, readPng, resizeToWidth, writePng, type Box } from './image.js';
import { captureKey, keyId, type CaptureKey } from './key.js';
import { log, noteAfterError, UiDiffError, writeRedacted } from './log.js';
import { duration, renderComment } from './markdown.js';
import { cropsDiffer, diffStates, stateCounts, verifyStateChanges } from './states.js';
import { measuredGroups } from './verdict.js';
import { distinctFrames, encodeBlinkGif, encodeSideBySideGif, isAnimationPackage, motionWarning, recordFrames, stepTokens, touchesAnimation, writeFile, type RawFrame } from './motion.js';
import { realpathIfExists } from './paths.js';
import { autoSummary, comparability, computeStats, fingerprintDifferences, notCheckedReason, pct, REPORT_VERSION, truncationWarning, type CaptureFingerprint, type CaptureResult, type ComponentResult, type FlowResult, type MotionResult, type Report, type BaseCacheInfo, type SideFingerprint, type SideSummary, type Timings, type VariantGroup } from './report.js';
import { killAllServers, serverLogWarnings } from './server.js';
import { SideManager, sideLabel, type Side, type SideRequest } from './sides.js';
import { describeStep } from './steps.js';
import { styleCapWarning } from './styles.js';
import { aggregateFindings, auditSnapshot, buildTokenSet, detectTokenFiles, findingKeys, hasCategory, loadTokenFiles, tokenColorStrings, type StyleSnapshot, type TokenSet } from './tokens.js';
import { onlyInUnsettled, unsettledWarning } from './unsettled.js';
import { VERSION } from './version.js';

export interface RunOptions {
  cfg: ResolvedConfig;
  outDir: string;
  base?: string;
  head?: string;
  baseUrl?: string;
  headUrl?: string;
  routes?: string[];
  allRoutes?: boolean;
  viewports?: string[];
  themes?: string[];
  variants?: string[];
  motion?: boolean;
  /** Record motion clips for routes without visual changes too. */
  motionAll?: boolean;
  tokens?: string[];
  a11y?: boolean;
  keepWorktrees?: boolean;
  /** Internal: record computed styles of every capture even without the token audit (which always records them). */
  collectStyles?: boolean;
  /** Reuse base captures from the base cache when the key matches (default true; --no-cache sets false). */
  cache?: boolean;
  /** Where base captures are cached (default <repo>/.ui-diff/cache). */
  cacheDir?: string;
}

export interface RunOutcome {
  report: Report;
  reportFile: string;
  previewFile: string;
  noChanges: boolean;
}

const FAILED_MARKER = 'last-run-failed.json';
// comment.preview.md comes from `render`; a new successful run makes it stale, so it is dropped with the rest.
const OUTPUT_ENTRIES = ['captures', 'diff', 'compare', 'variants', 'motion', 'styles', 'states', 'report.json', 'comment.local.md', 'comment.md', 'comment.preview.md', 'summary.auto.md', FAILED_MARKER];

export interface RunFailure {
  failedAt: string;
  error: string;
  /** `createdAt` of the report that was kept. */
  previousReport?: string;
}

function processAlive(pid: number): boolean {
  if (pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Creates the directory a run writes into, inside `outDir`. The previous results stay untouched
 * until `commitOutDir`; only `logs/` is reset, so it always holds the latest run, failed or not.
 */
export function stageOutDir(outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  for (const entry of readdirSync(outDir)) {
    const pid = /^\.(?:run|old)-(\d+)$/.exec(entry)?.[1];
    if (pid && !processAlive(Number(pid))) rmSync(path.join(outDir, entry), { recursive: true, force: true });
  }
  rmSync(path.join(outDir, 'logs'), { recursive: true, force: true });
  const stage = path.join(outDir, `.run-${process.pid}`);
  mkdirSync(stage, { recursive: true });
  return stage;
}

/** Replaces the previous results in `outDir` with the staged ones. */
export function commitOutDir(stage: string, outDir: string): void {
  const old = path.join(outDir, `.old-${process.pid}`);
  rmSync(old, { recursive: true, force: true });
  mkdirSync(old);
  const staged = readdirSync(stage);
  for (const entry of new Set([...OUTPUT_ENTRIES, ...staged])) {
    if (existsSync(path.join(outDir, entry))) renameSync(path.join(outDir, entry), path.join(old, entry));
  }
  for (const entry of staged) renameSync(path.join(stage, entry), path.join(outDir, entry));
  rmSync(stage, { recursive: true, force: true });
  rmSync(old, { recursive: true, force: true });
}

/**
 * Leaves a note next to the kept report so `render` and `publish` can say it is not from the latest run.
 * Returns the warning to show the user, if a report was kept.
 */
export function markRunFailed(outDir: string, error: unknown): string | undefined {
  const reportFile = path.join(outDir, 'report.json');
  if (!existsSync(reportFile)) return undefined;
  let previousReport: string | undefined;
  try {
    previousReport = (JSON.parse(readFileSync(reportFile, 'utf8')) as Report).createdAt;
  } catch {
    // unreadable report: still record the failure
  }
  const failure: RunFailure = { failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error), previousReport };
  writeRedacted(path.join(outDir, FAILED_MARKER), `${JSON.stringify(failure, null, 2)}\n`);
  const shown = path.relative(process.cwd(), outDir);
  return `kept the previous report in ${shown.startsWith('..') ? outDir : shown || '.'} (from ${previousReport ?? 'an earlier run'}); it does not include this run`;
}

export function lastRunFailure(outDir: string): RunFailure | undefined {
  const file = path.join(outDir, FAILED_MARKER);
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as RunFailure;
  } catch {
    return { failedAt: 'unknown', error: 'unknown error' };
  }
}

/** Keeps the output directory out of `git status` without touching tracked files. */
export async function excludeFromGit(repoRoot: string, outDir: string): Promise<void> {
  // Both sides resolved: on macOS a /tmp or /var path and its /private target would differ.
  const rel = path.relative(realpathIfExists(repoRoot), realpathIfExists(outDir)).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) return;
  try {
    const exclude = path.join(await gitCommonDir(repoRoot), 'info', 'exclude');
    const current = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
    const line = `/${rel}/`;
    if (!current.split('\n').includes(line)) {
      mkdirSync(path.dirname(exclude), { recursive: true });
      appendFileSync(exclude, `${current.endsWith('\n') || !current ? '' : '\n'}# ui-diff output\n${line}\n`);
    }
  } catch {
    // not fatal
  }
}

function sideSummary(side: Side): SideSummary {
  return { label: side.label, mode: side.mode, sha: side.sha, shortSha: side.shortSha, ref: side.ref, url: side.mode === 'url' ? sanitizeUrl(side.url) : undefined, includesUncommitted: side.includesUncommitted };
}

function captureId(route: ResolvedRoute, viewport: ViewportConfig, theme: ThemeConfig, variant?: CaptureKey['variant']): string {
  return keyId(captureKey(route, viewport, theme, variant));
}

function rel(outDir: string, file: string): string {
  return path.relative(outDir, file).split(path.sep).join('/');
}

interface Plan {
  route: ResolvedRoute;
  viewport: ViewportConfig;
  theme: ThemeConfig;
  key: CaptureKey;
  /** `keyId(key)`: the capture id in the report and the stem of its file names. */
  id: string;
  a11y: boolean;
  focus: boolean;
  /** A checkpoint of a flow; `run` groups the checkpoints of one replay (flow, viewport, theme). */
  flow?: { def: ResolvedFlow; checkpoint: FlowCheckpoint; run: string };
  /** A component in one state; `run` groups the states of one component capture (component, viewport, theme). */
  component?: { def: ResolvedComponent; state: ComponentState; run: string };
}

/** Where base and head come from, after detection. */
interface Detected {
  detection?: DetectResult;
  baseUrl?: string;
  headUrl?: string;
  baseRequest: SideRequest;
  headRequest: SideRequest;
}

/** What will be captured and with which extras; no app is running yet. */
interface Prepared {
  routes: ResolvedRoute[];
  viewports: ViewportConfig[];
  themes: ThemeConfig[];
  plans: Plan[];
  reportBase: Omit<Report, 'base' | 'head' | 'captures' | 'variants' | 'motion' | 'warnings' | 'stats'>;
  motionOn: boolean;
  a11yOn: boolean;
  tokens?: { set: TokenSet; files: string[] };
  stylesOn: boolean;
  auth?: ResolvedAuth;
  detection?: DetectResult;
  /** Flows not run because of flowLimits, for the report's warnings. */
  flowNotes: string[];
  /** Components not run because of componentLimits, for the report's warnings. */
  componentNotes: string[];
}

interface Booted {
  base: Side;
  head: Side;
  browser: Browser;
  session: CaptureSession;
  /** Wall-clock time of preparing base and head together. */
  prepareMs: number;
  browserMs: number;
  /** Set when the base cache applies: the key, and the reused entry on a hit. */
  cache?: { key: BaseCacheKey; entry?: BaseCacheEntry; dir: string };
  /** The base app, started on demand when its captures came from the cache (motion clips replay it). */
  liveBase: () => Promise<Side>;
}

function since(start: number): number {
  return Math.round(performance.now() - start);
}

function slowestCapture(records: Map<string, CaptureRecord>): NonNullable<Timings['capture']>['slowest'] {
  let slowest: CaptureRecord | undefined;
  for (const r of records.values()) if (!slowest || r.durationMs > slowest.durationMs) slowest = r;
  return slowest && { id: slowest.id, side: slowest.side, ms: slowest.durationMs };
}

async function selectRoutes(opts: RunOptions, detection: DetectResult | undefined): Promise<ResolvedRoute[]> {
  const { cfg } = opts;
  if (opts.routes?.length) {
    return opts.routes.map((p) => cfg.routes.find((r) => r.path === p) ?? resolveRoute(p, cfg.dirRel, false));
  }
  if (opts.allRoutes || !detection) {
    if (cfg.routes.length === 0) throw new UiDiffError('No routes to capture', { hint: 'Pass --routes "/,/pricing" or add "routes" to ui-diff.config.json.' });
    return cfg.routes;
  }
  return detection.routes.map((h) => h.route);
}

function variantSpecs(opts: RunOptions, routes: ResolvedRoute[]): Map<string, VariantSpec> {
  const specs = new Map<string, VariantSpec>();
  if (!opts.cfg.variants.enabled && !opts.variants?.length) return specs;
  if (opts.cfg.variants.enabled) for (const r of routes) if (r.variants) specs.set(r.path, r.variants);
  for (const flag of opts.variants ?? []) {
    const { route, spec } = parseVariantFlag(flag);
    const targets = route ? routes.filter((r) => r.path === route) : routes;
    if (route && targets.length === 0) throw new UiDiffError(`--variants targets ${route}, which is not among the captured routes`);
    for (const r of targets) specs.set(r.path, { ...r.variants, ...spec, viewports: r.variants?.viewports, themes: r.variants?.themes });
  }
  return specs;
}

/** Runs into a staging directory and swaps the results in only on success, so a failed run keeps the previous report. */
export async function runPipeline(opts: RunOptions): Promise<RunOutcome> {
  const stage = stageOutDir(opts.outDir);
  await excludeFromGit(opts.cfg.repoRoot, opts.outDir);
  await excludeFromGit(opts.cfg.repoRoot, opts.cacheDir ?? path.join(opts.cfg.repoRoot, '.ui-diff', 'cache'));
  try {
    const outcome = await runStaged({ ...opts, outDir: stage }, opts.outDir);
    commitOutDir(stage, opts.outDir);
    const final = (file: string) => path.join(opts.outDir, path.relative(stage, file));
    return { ...outcome, reportFile: final(outcome.reportFile), previewFile: final(outcome.previewFile) };
  } catch (error) {
    rmSync(stage, { recursive: true, force: true });
    const kept = markRunFailed(opts.outDir, error);
    if (kept) noteAfterError(error, kept);
    throw error;
  }
}

/**
 * The base cache key a run with these options would use, without building or capturing anything
 * (detection, the capture plan and the browser version). Undefined when the base cache does not
 * apply: nothing to capture, or base is a deployed preview.
 */
export async function baseCacheKeyFor(opts: RunOptions): Promise<BaseCacheKey | undefined> {
  const detected = await detectStage(opts, []);
  const prepared = await prepareStage(opts, detected, new Date());
  if (prepared.routes.length === 0 || !detected.baseRequest.ref) return undefined;
  const choice = resolveBrowser(opts.cfg.browser.channel);
  const browser = await launchBrowser(choice);
  try {
    return baseCacheKey({ baseSha: detected.baseRequest.ref, config: baseCaptureConfig(opts.cfg, prepared), browser: { name: choice.label, version: browser.version() }, uiDiffVersion: VERSION });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** `opts.outDir` is the staging directory; server logs go to `finalDir/logs`, where error hints point. */
async function runStaged(opts: RunOptions, finalDir: string): Promise<RunOutcome> {
  const { cfg, outDir } = opts;
  const runStart = new Date();
  const started = performance.now();
  const warnings: string[] = [];
  const detected = await detectStage(opts, warnings);
  const detectMs = since(started);
  const prepared = await prepareStage(opts, detected, runStart);
  if (prepared.routes.length === 0) {
    const report = await emptyReport(cfg, prepared, detected, warnings);
    report.timings = { totalMs: since(started), detectMs };
    return writeOutputs(report, outDir, true);
  }

  const sides = new SideManager(cfg, { outDir: finalDir, keepWorktrees: opts.keepWorktrees });
  const onSignal = () => {
    killAllServers();
    sides.cleanupSync();
    rmSync(outDir, { recursive: true, force: true });
    const kept = markRunFailed(finalDir, 'interrupted');
    if (kept) log.warn(kept);
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  let booted: Booted | undefined;
  try {
    booted = await bootStage(sides, detected, prepared, { cfg, runStart, opts, outDir });
    const { base, head } = booted;
    const captureStart = performance.now();
    const records = await captureStage(booted, prepared, outDir, cfg);
    const captureMs = since(captureStart);
    const baseCache = booted.cache ? storeOrReport(booted.cache, base, records, cfg, runStart) : undefined;
    // Records restored from the base cache were not captured by this run, nor were flow checkpoints or component states never reached.
    const taken = new Map([...records].filter(([, r]) => !(booted!.cache?.entry && r.side === 'base') && r.flow?.reached !== false && r.component?.reached !== false));
    const diffStart = performance.now();
    const captures = diffStage(prepared.plans, records, { base, head, cfg, outDir, cache: baseCache });
    const diffMs = since(diffStart);
    const flows = flowResults(prepared.plans, records, captures, { cachedBase: Boolean(booted.cache?.entry), themes: prepared.themes.length });
    const components = componentResults(prepared.plans, records, captures, { cachedBase: Boolean(booted.cache?.entry), themes: prepared.themes.length, cfg, outDir, base, head });
    warnings.push(...prepared.flowNotes, ...flows.warnings, ...prepared.componentNotes, ...components.warnings);
    const flowsMs = flows.flows.reduce((n, f) => n + (f.base.cached ? 0 : f.base.ms) + f.head.ms, 0);
    // A component's ms covers its whole capture run, once per state record: count each run once.
    const componentsMs = componentRuns(prepared.plans).reduce((n, states) => n + (['base', 'head'] as const).reduce((m, side) => m + (side === 'base' && booted!.cache?.entry ? 0 : (records.get(`${side}:${states[0].id}`)?.component?.ms ?? 0)), 0), 0);
    const styleDiffStart = performance.now();
    if (cfg.styleDiff.enabled) {
      styleDiffStage(captures, records, cfg);
      statePairs(captures, records, { cfg, outDir, base, head });
    }
    const styleDiffMs = since(styleDiffStart);
    const { extras, timings: extrasTimings } = await extrasStage(opts, booted, prepared, captures, records);
    const cutWarning = truncationWarning(captures, cfg.capture.maxHeight);
    if (cutWarning) warnings.push(cutWarning);
    for (const side of [base, head]) if (side.server) warnings.push(...serverLogWarnings(side.server.logFile, side.name));
    const report: Report = {
      ...prepared.reportBase,
      base: sideSummary(base),
      head: sideSummary(head),
      captures,
      ...extras,
      ...(flows.flows.length ? { flows: flows.flows } : {}),
      ...(components.components.length ? { components: components.components } : {}),
      ...(baseCache ? { baseCache } : {}),
      ...reportRegions(cfg, prepared.routes),
      ...comparability(captures),
      warnings,
      stats: computeStats(captures),
    };
    const measured = measuredGroups(report);
    if (measured.length) report.measured = measured;
    report.timings = {
      totalMs: since(started),
      detectMs,
      prepare: { wallMs: booted.prepareMs, base: base.timings, head: head.timings },
      browserMs: booted.browserMs,
      capture: { ms: captureMs, count: taken.size, slowest: slowestCapture(taken) },
      diffMs,
      extras: { ...extrasTimings, ...(cfg.styleDiff.enabled ? { styleDiffMs, elementMapMs: [...records.values()].reduce((n, r) => n + (r.stylesMs ?? 0), 0) } : {}), ...(flows.flows.length ? { flowsMs } : {}), ...(components.components.length ? { componentsMs } : {}) },
    };
    return writeOutputs(report, outDir, false);
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    await booted?.browser.close().catch(() => undefined);
    await sides.cleanup();
  }
}

/** Detection (changed files → routes) and the refs or URLs each side is built from. */
async function detectStage(opts: RunOptions, warnings: string[]): Promise<Detected> {
  const { cfg } = opts;
  const baseUrl = opts.baseUrl ?? cfg.preview.base;
  const headUrl = opts.headUrl ?? cfg.preview.head;
  let detection: DetectResult | undefined;
  let baseRequest: SideRequest = { name: 'base', url: baseUrl };
  let headRequest: SideRequest = { name: 'head', url: headUrl };

  const wantsDetect = !opts.routes?.length && !opts.allRoutes;
  const canDetect = !baseUrl || !headUrl || Boolean(opts.base);
  if (wantsDetect && canDetect) {
    log.step('detecting changed UI files');
    detection = await detectChanges(cfg, { base: opts.base, head: opts.head });
    log.info(`${detection.uiFiles.length} UI file(s) changed → ${detection.routes.length} route(s): ${detection.routes.map((r) => r.route.path).join(', ') || 'none'}`);
    for (const note of detection.notes) warnings.push(note);
  }
  if (!baseUrl) {
    const baseRef = await resolveBaseRef(cfg.repoRoot, opts.base);
    const baseSha = await revParse(baseRef, cfg.repoRoot);
    const headSha = await revParse(opts.head ?? 'HEAD', cfg.repoRoot);
    const mb = detection?.mergeBase ?? (await mergeBase(baseSha, headSha, cfg.repoRoot));
    baseRequest = { name: 'base', ref: mb, displayRef: baseRef };
  }
  if (!headUrl) headRequest = opts.head ? { name: 'head', ref: opts.head, displayRef: opts.head } : { name: 'head', workingTree: true };
  return { detection, baseUrl, headUrl, baseRequest, headRequest };
}

/** Routes, viewports, themes, the capture plan, token set and credentials. Runs nothing. */
async function prepareStage(opts: RunOptions, detected: Detected, runStart: Date): Promise<Prepared> {
  const { cfg } = opts;
  const { detection } = detected;
  const routes = await selectRoutes(opts, detection);
  const viewports = pickViewports(cfg, opts.viewports);
  const themes = pickThemes(cfg, opts.themes);
  const reportBase: Prepared['reportBase'] = {
    version: REPORT_VERSION,
    tool: { name: 'ui-diff' as const, version: VERSION },
    createdAt: runStart.toISOString(),
    routes: routes.map((r) => {
      const hit = detection?.routes.find((h) => h.route.path === r.path);
      return { path: r.path, name: r.name, reasons: hit?.reasons ?? [opts.routes?.length ? 'requested' : 'configured'], confidence: hit?.confidence ?? 'high' };
    }),
    detect: detection
      ? {
          uiFiles: detection.uiFiles,
          unmatched: detection.unmatched,
          skippedRoutes: detection.skippedRoutes.map((h) => h.route.path),
          needsExample: detection.needsExample,
          notes: detection.notes,
          ...(detection.dependencies.length ? { dependencies: detection.dependencies } : {}),
          ...(detection.unparsedLockfiles.length ? { unparsedLockfiles: detection.unparsedLockfiles } : {}),
        }
      : undefined,
    viewports: viewports.map((v) => v.name),
    themes: themes.map((t) => t.name),
  };
  const motionOn = cfg.motion.enabled || Boolean(opts.motion);
  const a11yOn = cfg.a11y.enabled || Boolean(opts.a11y);
  if (routes.length === 0) return { routes, viewports, themes, plans: [], reportBase, motionOn, a11yOn, stylesOn: false, flowNotes: [], componentNotes: [] };

  const tokens = cfg.tokens.enabled || Boolean(opts.tokens?.length) ? await loadTokens(opts) : undefined;
  const previewUrls = [detected.baseUrl, detected.headUrl].filter((u): u is string => Boolean(u));
  const auth = previewUrls.length || cfg.auth?.origins?.length ? resolveAuth(cfg.auth, previewUrls) : undefined;
  if (cfg.auth && !auth && previewUrls.length === 0) log.debug('auth configured but both sides run locally; credentials not used');
  const flows = planFlows(cfg, routes, viewports, themes);
  const components = planComponents(cfg, routes, viewports, themes);
  return {
    routes,
    viewports,
    themes,
    plans: [...planCaptures(cfg, routes, viewports, themes, a11yOn), ...flows.plans, ...components.plans],
    reportBase,
    motionOn,
    a11yOn,
    tokens,
    stylesOn: Boolean(tokens) || Boolean(opts.collectStyles) || cfg.styleDiff.enabled || routes.some((r) => regionsOf(cfg, r).focus.length + regionsOf(cfg, r).ignore.length > 0),
    auth,
    detection,
    flowNotes: flows.notes,
    componentNotes: components.notes,
  };
}

/**
 * A plan per state of every component whose route is captured, at the route's viewports and
 * themes (or the component's or its flow's own). At most componentLimits.maxComponents, in config
 * order; those left out are named in the notes.
 */
function planComponents(cfg: ResolvedConfig, routes: ResolvedRoute[], viewports: ViewportConfig[], themes: ThemeConfig[]): { plans: Plan[]; notes: string[] } {
  const runnable: Array<{ def: ResolvedComponent; route: ResolvedRoute }> = [];
  for (const def of cfg.components) {
    const route = routes.find((r) => r.path === def.route);
    if (route) runnable.push({ def, route });
    else log.info(`component '${def.name}': ${def.route} is not captured in this run, so the component is not captured`);
  }
  const max = cfg.componentLimits.maxComponents;
  const over = runnable.slice(max);
  const notes = over.length ? [`${over.length} component${over.length === 1 ? '' : 's'} over componentLimits.maxComponents (${max}) not captured: ${over.map((c) => `'${c.def.name}'`).join(', ')}`] : [];
  const plans: Plan[] = [];
  for (const { def, route } of runnable.slice(0, max)) {
    const vNames = def.viewports ?? route.viewports;
    const tNames = def.themes ?? route.themes;
    for (const viewport of vNames ? viewports.filter((v) => vNames.includes(v.name)) : viewports) {
      for (const theme of tNames ? themes.filter((t) => tNames.includes(t.name)) : themes) {
        const run = `${captureId(route, viewport, theme)}__component-${def.slug}`;
        for (const state of def.states) {
          const key = captureKey(route, viewport, theme, undefined, undefined, { name: def.slug, state });
          plans.push({ route, viewport, theme, key, id: keyId(key), a11y: false, focus: false, component: { def, state, run } });
        }
      }
    }
  }
  return { plans, notes };
}

/** Component plans by capture run, in plan order. */
function componentRuns(plans: Plan[]): Plan[][] {
  const runs = new Map<string, Plan[]>();
  for (const p of plans) if (p.component) runs.set(p.component.run, [...(runs.get(p.component.run) ?? []), p]);
  return [...runs.values()];
}

/**
 * A plan per checkpoint of every flow whose route is captured, at the route's viewports and themes
 * (or the flow's own). At most flowLimits.maxFlows flows, in config order, and none longer than
 * flowLimits.maxSteps; those left out are named in the notes.
 */
function planFlows(cfg: ResolvedConfig, routes: ResolvedRoute[], viewports: ViewportConfig[], themes: ThemeConfig[]): { plans: Plan[]; notes: string[] } {
  const notes: string[] = [];
  const runnable: Array<{ flow: ResolvedFlow; route: ResolvedRoute }> = [];
  for (const flow of cfg.flows) {
    const route = routes.find((r) => r.path === flow.route);
    if (!route) {
      log.info(`flow '${flow.name}': ${flow.route} is not captured in this run, so the flow is not run`);
      continue;
    }
    if (flow.steps.length > cfg.flowLimits.maxSteps) {
      notes.push(`flow '${flow.name}' has ${flow.steps.length} steps, more than flowLimits.maxSteps (${cfg.flowLimits.maxSteps}), so it was not run`);
      continue;
    }
    runnable.push({ flow, route });
  }
  const over = runnable.slice(cfg.flowLimits.maxFlows);
  if (over.length) notes.push(`${over.length} flow${over.length === 1 ? '' : 's'} over flowLimits.maxFlows (${cfg.flowLimits.maxFlows}) not run: ${over.map((f) => `'${f.flow.name}'`).join(', ')}`);
  const plans: Plan[] = [];
  for (const { flow, route } of runnable.slice(0, cfg.flowLimits.maxFlows)) {
    const vNames = flow.viewports ?? route.viewports;
    const tNames = flow.themes ?? route.themes;
    for (const viewport of vNames ? viewports.filter((v) => vNames.includes(v.name)) : viewports) {
      for (const theme of tNames ? themes.filter((t) => tNames.includes(t.name)) : themes) {
        const run = `${captureId(route, viewport, theme)}__flow-${flow.slug}`;
        for (const checkpoint of flow.checkpoints) {
          const key = captureKey(route, viewport, theme, undefined, { name: flow.slug, checkpoint: checkpoint.slug });
          plans.push({ route, viewport, theme, key, id: keyId(key), a11y: false, focus: false, flow: { def: flow, checkpoint, run } });
        }
      }
    }
  }
  return { plans, notes };
}

/** Flow plans by replay, in plan order. */
function flowRuns(plans: Plan[]): Plan[][] {
  const runs = new Map<string, Plan[]>();
  for (const p of plans) if (p.flow) runs.set(p.flow.run, [...(runs.get(p.flow.run) ?? []), p]);
  return [...runs.values()];
}

async function loadTokens(opts: RunOptions): Promise<{ set: TokenSet; files: string[] }> {
  const { cfg } = opts;
  const requested = (opts.tokens ?? []).filter((f) => f !== 'auto');
  let files = (requested.length ? requested.map((f) => realpathIfExists(path.resolve(process.cwd(), f))) : cfg.tokens.files.map((f) => path.resolve(cfg.dir, f))).filter(Boolean);
  if (files.length === 0) {
    const tracked = (await git(['ls-files', '-z'], { cwd: cfg.dir })).split('\0').filter(Boolean);
    files = detectTokenFiles(cfg.dir, tracked).map((f) => path.join(cfg.dir, f));
    if (files.length) log.info(`auto-detected token files: ${files.map((f) => path.relative(cfg.repoRoot, f)).join(', ')}`);
  }
  if (files.length === 0) throw new UiDiffError('Token audit is enabled but no token files were configured or found', { hint: 'Set tokens.files in ui-diff.config.json or pass --tokens path/to/tokens.json (JSON, CSS or StyleX *.stylex.ts)' });
  const set = buildTokenSet(loadTokenFiles(files), cfg.tokens.remBase, cfg.tokens.categories);
  log.info(`loaded ${set.values.length} design tokens from ${files.map((f) => path.relative(cfg.repoRoot, f)).join(', ')}`);
  return { set, files };
}

function planCaptures(cfg: ResolvedConfig, routes: ResolvedRoute[], viewports: ViewportConfig[], themes: ThemeConfig[], a11yOn: boolean): Plan[] {
  const plans: Plan[] = [];
  for (const route of routes) {
    const vps = route.viewports ? viewports.filter((v) => route.viewports!.includes(v.name)) : viewports;
    const ths = route.themes ? themes.filter((t) => route.themes!.includes(t.name)) : themes;
    for (const viewport of vps) {
      for (const theme of ths) {
        const a11y = a11yOn && (!cfg.a11y.viewports || cfg.a11y.viewports.includes(viewport.name)) && (!cfg.a11y.themes || cfg.a11y.themes.includes(theme.name));
        const key = captureKey(route, viewport, theme);
        plans.push({ route, viewport, theme, key, id: keyId(key), a11y, focus: a11y && cfg.a11y.focusOrder && theme.name === ths[0].name });
      }
    }
  }
  return plans;
}

/** Report for a run that captured nothing (no route was affected or selected). */
async function emptyReport(cfg: ResolvedConfig, prepared: Prepared, detected: Detected, warnings: string[]): Promise<Report> {
  const { baseRequest, headRequest, detection } = detected;
  const shas = async (sha: string | undefined) => (sha ? { sha, shortSha: await shortSha(sha, cfg.repoRoot) } : {});
  const report: Report = {
    ...prepared.reportBase,
    base: { label: baseRequest.ref ?? baseRequest.url ?? 'base', mode: baseRequest.url ? 'url' : 'worktree', ...(await shas(baseRequest.ref)) },
    head: { label: headRequest.ref ?? headRequest.url ?? 'working tree', mode: headRequest.url ? 'url' : 'worktree', ...(await shas(detection?.head.sha)) },
    captures: [],
    variants: [],
    motion: [],
    warnings,
    stats: computeStats([]),
  };
  report.notChecked = notCheckedReason(report);
  return report;
}

/** Worktrees, installs and dev servers (or preview URLs) for both sides, then the browser. */
async function bootStage(
  sides: SideManager,
  detected: Detected,
  prepared: Prepared,
  ctx: { cfg: ResolvedConfig; runStart: Date; opts: RunOptions; outDir: string },
): Promise<Booted> {
  const ensureStart = performance.now();
  const choice = resolveBrowser(ctx.cfg.browser.channel);
  await ensureBrowser(choice);
  const browser = await launchBrowser(choice);
  const browserMs = since(ensureStart);
  log.info(`browser: ${choice.label} ${browser.version()}`);
  try {
    return await bootSides(sides, detected, prepared, { ...ctx, browser, browserLabel: choice.label, browserMs });
  } catch (error) {
    await browser.close().catch(() => undefined);
    throw error;
  }
}

async function bootSides(
  sides: SideManager,
  detected: Detected,
  prepared: Prepared,
  ctx: { cfg: ResolvedConfig; runStart: Date; opts: RunOptions; outDir: string; browser: Browser; browserLabel: string; browserMs: number },
): Promise<Booted> {
  const { browser, browserMs } = ctx;
  const choice = { label: ctx.browserLabel };
  let cache: Booted['cache'];
  if (detected.baseRequest.ref) {
    const dir = ctx.opts.cacheDir ?? path.join(ctx.cfg.repoRoot, '.ui-diff', 'cache');
    const key = baseCacheKey({ baseSha: detected.baseRequest.ref, config: baseCaptureConfig(ctx.cfg, prepared), browser: { name: choice.label, version: browser.version() }, uiDiffVersion: VERSION });
    let entry = ctx.opts.cache === false ? undefined : restoreBaseCache(dir, key.key, ctx.outDir);
    if (entry && !prepared.plans.every((p) => entry!.records.some((r) => r.id === p.id))) entry = undefined;
    cache = { key, entry, dir };
    log.info(`base cache: ${entry ? 'hit' : ctx.opts.cache === false ? 'skipped (--no-cache)' : 'miss'} (${key.key})`);
  }

  const prepareStart = performance.now();
  const cached = cache?.entry;
  const results = await Promise.allSettled([cached ? Promise.resolve(cachedBase(detected.baseRequest, cached, prepareStart)) : sides.prepare(detected.baseRequest), sides.prepare(detected.headRequest)]);
  const prepareMs = since(prepareStart);
  const failed = results.find((p): p is PromiseRejectedResult => p.status === 'rejected');
  if (failed) throw failed.reason;
  const [base, head] = results.map((p) => (p as PromiseFulfilledResult<Side>).value);
  log.info(`base: ${base.label} (${cached ? 'cached' : base.mode}) · head: ${head.label} (${head.mode})`);
  // Head is frozen at the instant the reused base captures were, so clocks match on both sides.
  const frozenStart = cached?.frozenAt ? new Date(cached.frozenAt) : ctx.runStart;
  let live: Promise<Side> | undefined;
  return {
    base,
    head,
    browser,
    session: new CaptureSession(browser, { cfg: ctx.cfg, auth: prepared.auth, runStart: frozenStart, browserLabel: choice.label }),
    prepareMs,
    browserMs,
    cache,
    liveBase: () => (cached ? (live ??= sides.prepare(detected.baseRequest)) : Promise.resolve(base)),
  };
}

/** The base side when its captures come from the cache: nothing is checked out or started. */
function cachedBase(request: SideRequest, entry: BaseCacheEntry, started: number): Side {
  return {
    name: 'base',
    label: sideLabel(request, entry.side.sha, entry.side.shortSha),
    mode: 'worktree',
    sha: entry.side.sha,
    shortSha: entry.side.shortSha,
    ref: request.ref,
    url: '',
    timings: { mode: 'worktree', cached: true, totalMs: since(started) },
  };
}

function reportRegions(cfg: ResolvedConfig, routes: ResolvedRoute[]): Pick<Report, 'regions'> {
  const focus = [...new Set(routes.flatMap((r) => regionsOf(cfg, r).focus))];
  const ignore = [...new Set(routes.flatMap((r) => regionsOf(cfg, r).ignore))];
  return focus.length || ignore.length ? { regions: { focus, ignore } } : {};
}

/** The focus and ignore selectors that apply to a route: the top-level ones plus its own. */
export function regionsOf(cfg: ResolvedConfig, route: ResolvedRoute): { focus: string[]; ignore: string[] } {
  return { focus: [...new Set([...cfg.focus, ...route.focus])], ignore: [...new Set([...cfg.ignore, ...route.ignore])] };
}

/** Everything besides the base commit and the browser that changes what base captures look like. */
function baseCaptureConfig(cfg: ResolvedConfig, prepared: Prepared): unknown {
  const copied = cfg.copyFiles.map((f) => {
    const file = path.join(cfg.dir, f);
    return [f, existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex') : null];
  });
  const flows = prepared.plans.some((p) => p.flow);
  return {
    plans: prepared.plans.map((p) => ({
      id: p.id,
      route: p.route.path,
      actions: p.route.actions,
      waitFor: p.route.waitFor,
      mask: p.route.mask,
      hide: p.route.hide,
      fullPage: p.route.fullPage,
      viewport: p.viewport,
      theme: p.theme,
      a11y: p.a11y,
      focusOrder: p.focus,
      regions: regionsOf(cfg, p.route),
      flow: p.flow && { steps: p.flow.def.steps, checkpoint: p.flow.checkpoint.slug },
      component: p.component && { selector: p.component.def.selector, state: p.component.state, flow: p.component.def.flow && p.component.def.flow.def.steps.slice(0, p.component.def.flow.checkpoint.step + 1) },
    })),
    ...(flows || prepared.plans.some((p) => p.component) ? { flowStepTimeoutMs: cfg.flowLimits.stepTimeoutMs } : {}),
    capture: cfg.capture,
    freeze: cfg.freeze,
    styles: prepared.stylesOn,
    states: prepared.stylesOn && cfg.states.enabled ? cfg.states : false,
    tokens: prepared.tokens ? { colors: tokenColorStrings(prepared.tokens.set), ignore: cfg.tokens.ignoreSelectors } : null,
    a11y: { tags: cfg.a11y.tags, rules: cfg.a11y.rules, maxTabStops: cfg.a11y.maxTabStops },
    app: { startCommand: cfg.startCommand, buildCommand: cfg.buildCommand, install: cfg.install, dirRel: cfg.dirRel, cwd: cfg.cwd, baseUrl: cfg.baseUrl, readyPath: cfg.readyPath, env: cfg.env, copied },
  };
}

/** After capture: store a fresh base capture set on a miss; the cache info for the report either way. */
function storeOrReport(cache: NonNullable<Booted['cache']>, base: Side, records: Map<string, CaptureRecord>, cfg: ResolvedConfig, runStart: Date): BaseCacheInfo {
  const info: BaseCacheInfo = { key: cache.key.key, hit: Boolean(cache.entry), configHash: cache.key.configHash, browser: cache.key.browser, uiDiffVersion: cache.key.uiDiffVersion };
  if (cache.entry) return { ...info, capturedAt: cache.entry.createdAt };
  const baseRecords = [...records.values()].filter((r) => r.side === 'base');
  const stored = storeBaseCache(cache.dir, {
    key: cache.key.key,
    createdAt: new Date().toISOString(),
    frozenAt: frozenTime(cfg, runStart)?.toISOString(),
    side: { sha: base.sha!, shortSha: base.shortSha! },
    records: baseRecords,
  });
  log.info(stored ? `base cache: stored ${cache.key.key}` : 'base cache: not stored (a base capture failed)');
  return { ...info, stored };
}

/** Screenshots (and style, axe and focus-order data) of every plan on both sides, keyed `<side>:<id>`. */
async function captureStage(booted: Booted, prepared: Prepared, outDir: string, cfg: ResolvedConfig): Promise<Map<string, CaptureRecord>> {
  const { plans, stylesOn, tokens } = prepared;
  const records = new Map<string, CaptureRecord>();
  const extraColors = tokens ? tokenColorStrings(tokens.set) : [];
  let n = 0;
  const cached = booted.cache?.entry;
  for (const record of cached?.records ?? []) records.set(`base:${record.id}`, record);
  const sides = cached ? [booted.head] : [booted.base, booted.head];
  const target = (plan: Plan, side: Side): CaptureTarget => ({
    id: plan.id,
    side: side.name,
    route: plan.route,
    viewport: plan.viewport,
    theme: plan.theme,
    url: routeUrl(side.url, plan.route.path, plan.theme.query),
    file: path.join(outDir, 'captures', side.name, `${plan.id}.png`),
    styles: stylesOn ? { file: path.join(outDir, 'styles', side.name, `${plan.id}.json`), extraColors } : undefined,
    states: stylesOn && cfg.states.enabled && !plan.flow ? { dir: path.join(outDir, 'states', side.name) } : undefined,
    a11y: plan.a11y,
    focusOrder: plan.focus,
  });
  const stills = plans.filter((p) => !p.flow);
  for (const plan of stills) {
    for (const side of sides) {
      n++;
      log.step(`capture ${n}/${stills.length * sides.length}: ${side.name} ${plan.route.path} (${plan.viewport.name}, ${plan.theme.name})`);
      const record = await booted.session.capture(target(plan, side));
      if (!record.ok) log.warn(`${side.name} ${plan.id}: ${record.error}`);
      else if (!record.stable || record.unsettled) log.warn(unsettledWarning(`${side.name} ${plan.id}`, record));
      for (const action of record.skippedActions ?? []) log.warn(`${plan.id}: ${skippedActionWarning(side.name, action)}`);
      if (record.states) log.info(`${side.name} ${plan.id}: hover and focus states: ${stateCounts(record.states)}`);
      records.set(`${side.name}:${plan.id}`, record);
    }
  }
  const runs = flowRuns(plans);
  let f = 0;
  for (const checkpoints of runs) {
    const { route, viewport, theme } = checkpoints[0];
    const flow = checkpoints[0].flow!.def;
    for (const side of sides) {
      f++;
      log.step(`flow ${f}/${runs.length * sides.length}: ${side.name} '${flow.name}' on ${route.path} (${viewport.name}, ${theme.name})`);
      const recs = await booted.session.flow({
        side: side.name,
        route,
        viewport,
        theme,
        url: routeUrl(side.url, route.path, theme.query),
        flow,
        checkpoints: checkpoints.map((p) => target(p, side)),
        timeoutMs: cfg.flowLimits.stepTimeoutMs,
      });
      const info = recs[0].flow!;
      const stop = info.stoppedAt ? `stopped at step ${info.stoppedAt.step} (${stopReason(info.stoppedAt, info.names[info.stoppedAt.step - 1])})` : `${recs.length} checkpoint${recs.length === 1 ? '' : 's'}`;
      log.info(`flow '${flow.name}' ${side.name} (${viewport.name}, ${theme.name}): ${duration(info.ms)}, ${stop}`);
      for (const r of recs) {
        if (!r.ok && r.flow?.reached) log.warn(`${side.name} ${r.id}: ${r.error}`);
        else if (r.ok && (!r.stable || r.unsettled)) log.warn(unsettledWarning(`${side.name} ${r.id}`, r));
        records.set(`${side.name}:${r.id}`, r);
      }
    }
  }
  const components = componentRuns(plans);
  let k = 0;
  for (const states of components) {
    const { route, viewport, theme } = states[0];
    const component = states[0].component!.def;
    for (const side of sides) {
      k++;
      log.step(`component ${k}/${components.length * sides.length}: ${side.name} '${component.name}' on ${route.path} (${viewport.name}, ${theme.name})`);
      const recs = await booted.session.component({
        side: side.name,
        route,
        viewport,
        theme,
        url: routeUrl(side.url, route.path, theme.query),
        component,
        states: states.map((p) => target(p, side)),
        timeoutMs: cfg.flowLimits.stepTimeoutMs,
      });
      const info = recs[0].component!;
      const missed = recs.filter((r) => r.component?.reached === false);
      log.info(`component '${component.name}' ${side.name} (${viewport.name}, ${theme.name}): ${duration(info.ms)}, ${missed.length ? missed.map((r) => `${r.component!.state}: ${r.error}`).join('; ') : `${recs.length} state${recs.length === 1 ? '' : 's'}`}`);
      for (const r of recs) {
        if (!r.ok && r.component?.reached) log.warn(`${side.name} ${r.id}: ${r.error}`);
        else if (r.ok && (!r.stable || r.unsettled)) log.warn(unsettledWarning(`${side.name} ${r.id}`, r));
        records.set(`${side.name}:${r.id}`, r);
      }
    }
  }
  return records;
}

/** A flow checkpoint or component state one side never reached: its flow or component result reports it, not a capture. */
function notReached(plan: Plan, records: Map<string, CaptureRecord>): boolean {
  const missed = (r: CaptureRecord | undefined) => r?.flow?.reached === false || r?.component?.reached === false;
  return Boolean(plan.flow || plan.component) && (['base', 'head'] as const).some((side) => missed(records.get(`${side}:${plan.id}`)));
}

/**
 * Each component state with what its selector matched on each side: removed, added or not
 * compared (a finding) when only one side has it, a problem with the entry (a warning) when
 * neither does. A removed or added one gets a crop of the side that has it.
 */
function componentResults(plans: Plan[], records: Map<string, CaptureRecord>, captures: CaptureResult[], ctx: { cachedBase: boolean; themes: number; cfg: ResolvedConfig; outDir: string; base: Side; head: Side }): { components: ComponentResult[]; warnings: string[] } {
  const components: ComponentResult[] = [];
  const problems = new Map<string, string[]>();
  for (const plan of plans) {
    if (!plan.component) continue;
    const { def, state } = plan.component;
    const [br, hr] = [records.get(`base:${plan.id}`), records.get(`head:${plan.id}`)];
    const [b, h] = [br?.component, hr?.component];
    if (!b || !h) continue;
    const outcome = componentOutcome({ name: def.name, state }, b, h);
    const result: ComponentResult = {
      name: def.name,
      state,
      selector: def.selector,
      route: { path: plan.route.path, name: plan.route.name, slug: plan.route.slug },
      ...(def.flow ? { flow: { name: def.flow.def.name, checkpoint: def.flow.checkpoint.name } } : {}),
      viewport: plan.viewport.name,
      theme: plan.theme.name,
      matches: { base: b.matches, head: h.matches },
      ...(captures.some((c) => c.id === plan.id) ? { capture: plan.id } : {}),
      base: { ms: b.ms, ...(ctx.cachedBase ? { cached: true } : {}) },
      head: { ms: h.ms },
      ...outcome,
    };
    const shown = outcome.change === 'removed' ? br : outcome.change === 'added' ? hr : undefined;
    if (shown?.ok && shown.file && shown.component?.root) {
      const png = readPng(shown.file);
      const scale = shown.scale ?? 1;
      const crop = componentCrop(shown.component.root.box, shown.component.root.box, ctx.cfg.componentLimits.padding, { base: { width: png.width / scale, height: png.height / scale }, head: { width: png.width / scale, height: png.height / scale } }).base;
      const side = outcome.change === 'removed' ? ctx.base : ctx.head;
      const label = `${outcome.change === 'removed' ? 'BEFORE' : 'AFTER'} ${side.shortSha ?? side.name.toUpperCase()} · ${outcome.change!.toUpperCase()} ON HEAD`;
      const image = composeRow([{ image: cropPng(png, toDevice(crop, scale, png), COLORS.background), label, accent: outcome.change === 'removed' ? COLORS.before : COLORS.after }], { maxWidth: ctx.cfg.diff.compositeMaxWidth });
      const file = path.join(ctx.outDir, 'compare', `${plan.id}.png`);
      writePng(file, image);
      result.image = rel(ctx.outDir, file);
    }
    components.push(result);
    if (outcome.problem) problems.set(outcome.problem, [...(problems.get(outcome.problem) ?? []), `${plan.viewport.name}${ctx.themes > 1 ? `/${plan.theme.name}` : ''}`]);
  }
  return { components, warnings: [...problems].map(([problem, where]) => `${problem} (${where.join(', ')})`) };
}

/**
 * Each replayed flow with where it stopped on each side: a finding when one side stops where the
 * other goes on, a problem with the flow (a warning) when both stop at the same step.
 */
function flowResults(plans: Plan[], records: Map<string, CaptureRecord>, captures: CaptureResult[], ctx: { cachedBase: boolean; themes: number }): { flows: FlowResult[]; warnings: string[] } {
  const flows: FlowResult[] = [];
  const problems = new Map<string, string[]>();
  for (const checkpoints of flowRuns(plans)) {
    const { route, viewport, theme } = checkpoints[0];
    const def = checkpoints[0].flow!.def;
    const [b, h] = [records.get(`base:${checkpoints[0].id}`)?.flow, records.get(`head:${checkpoints[0].id}`)?.flow];
    if (!b || !h) continue;
    const outcome = flowOutcome(def.name, b, h);
    const side = (info: typeof b, cached: boolean) => ({ ms: info.ms, ...(info.stoppedAt ? { stoppedAt: info.stoppedAt } : {}), ...(cached ? { cached } : {}) });
    flows.push({
      name: def.name,
      route: { path: route.path, name: route.name, slug: route.slug },
      viewport: viewport.name,
      theme: theme.name,
      steps: def.steps.map(describeFlowStep),
      checkpoints: checkpoints.map((p) => ({ name: p.flow!.checkpoint.name, step: p.flow!.checkpoint.step + 1, ...(captures.some((c) => c.id === p.id) ? { capture: p.id } : {}) })),
      base: side(b, ctx.cachedBase),
      head: side(h, false),
      ...outcome,
    });
    if (outcome.problem) problems.set(outcome.problem, [...(problems.get(outcome.problem) ?? []), `${viewport.name}${ctx.themes > 1 ? `/${theme.name}` : ''}`]);
  }
  return { flows, warnings: [...problems].map(([problem, where]) => `${problem} (${where.join(', ')})`) };
}

/** Pixel diffs and composites per plan, plus the warnings each side's capture left. */
function diffStage(plans: Plan[], records: Map<string, CaptureRecord>, ctx: { base: Side; head: Side; cfg: ResolvedConfig; outDir: string; cache?: BaseCacheInfo }): CaptureResult[] {
  const { cfg } = ctx;
  const captures = plans.filter((plan) => !notReached(plan, records)).map((plan) => compareCapture(plan, records.get(`base:${plan.id}`)!, records.get(`head:${plan.id}`)!, ctx));
  for (const c of captures) {
    const b = records.get(`base:${c.id}`);
    const h = records.get(`head:${c.id}`);
    for (const [label, r] of [['base', b], ['head', h]] as const) {
      for (const action of r?.skippedActions ?? []) c.warnings.push(skippedActionWarning(label, action));
      if (r?.stylesCapped) c.warnings.push(styleCapWarning(label, cfg.capture.styleMaxElements));
      if (r?.stylesCount !== undefined) {
        c.elementMap ??= {};
        c.elementMap[label] = { elements: r.stylesCount, ...(r.stylesCapped ? { capped: true } : {}) };
      }
      if (r?.pageErrors.length) c.warnings.push(`${label}: uncaught page error: ${r.pageErrors[0]}`);
      if (r && r.ok && (!r.stable || r.unsettled)) c.warnings.push(unsettledWarning(label, r));
    }
    const plan = plans.find((p) => p.id === c.id)!;
    const regions = regionsOf(cfg, plan.route);
    // A component is its own focus; its route's still capture reports the regions.
    if ((regions.focus.length || regions.ignore.length) && !plan.component) {
      c.regions = { ...regions, focusOnly: Boolean(focusArea(plan, b ?? ({} as CaptureRecord), h ?? ({} as CaptureRecord), cfg)) };
      c.warnings.push(...regionWarnings(regions, { base: b?.regionHits, head: h?.regionHits }));
    }
    if (b?.truncated || h?.truncated) {
      c.truncated = true;
      c.warnings.push(`page is taller than capture.maxHeight (${cfg.capture.maxHeight}px); only the top part was compared`);
    }
  }
  return captures;
}

/**
 * Element-level explanation of each capture: base and head element maps matched, their measured
 * style differences, and each changed pixel area named after its element.
 */
/**
 * A still before | after pair of each verified hover or focus change: the two sides' crops of the
 * element in that state, side by side, small ones enlarged.
 */
function statePairs(captures: CaptureResult[], records: Map<string, CaptureRecord>, ctx: { cfg: ResolvedConfig; outDir: string; base: Side; head: Side }): void {
  for (const c of captures) {
    const changes = (c.styleDiff?.changes ?? []).filter((x) => x.state && x.stateCrops && x.verified !== false);
    const scale = records.get(`head:${c.id}`)?.scale ?? 1;
    changes.forEach((x, i) => {
      let [before, after] = [readPng(x.stateCrops!.base), readPng(x.stateCrops!.head)];
      const small = 240 * scale;
      if (Math.max(before.width, after.width) < small) [before, after] = [resizeToWidth(before, before.width * 2), resizeToWidth(after, after.width * 2)];
      const labels = [`BEFORE ${ctx.base.shortSha ?? 'BASE'} · ${x.state!.toUpperCase()}`, `AFTER ${ctx.head.shortSha ?? 'HEAD'} · ${x.state!.toUpperCase()}`];
      // A small element still gets its whole label: the crop is padded, not enlarged further.
      const wide = Math.max(...labels.map((l) => measureText(l, 2))) + 12;
      [before, after] = [before, after].map((p) => padTo(p, Math.max(p.width, wide), p.height, COLORS.background));
      const image = composeRow(
        [
          { image: before, label: labels[0], accent: COLORS.before },
          { image: after, label: labels[1], accent: COLORS.after },
        ],
        { maxWidth: ctx.cfg.diff.compositeMaxWidth },
      );
      // Not "__focus-N": that is the name of the default state's zoomed crops.
      const file = path.join(ctx.outDir, 'compare', `${c.id}__state-${x.state}-${i + 1}.png`);
      writePng(file, image);
      (c.images.states ??= []).push({ file: rel(ctx.outDir, file), name: x.name, state: x.state!, text: x.changes.map((p) => `${p.property} ${p.before} → ${p.after}`).join(' · ') });
    });
  }
}

/** Elements kept per capture whose every change is an effect of a kept cause. */
const EFFECTS_KEPT = 200;

function styleDiffStage(captures: CaptureResult[], records: Map<string, CaptureRecord>, cfg: ResolvedConfig): void {
  const read = (file: string | undefined) => (file && existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as StyleSnapshot) : undefined);
  for (const c of captures) {
    if (c.status !== 'changed' && c.status !== 'unchanged') continue;
    const [base, head] = [read(records.get(`base:${c.id}`)?.stylesFile), read(records.get(`head:${c.id}`)?.stylesFile)];
    if (!base || !head) continue;
    const [baseRec, headRec] = [records.get(`base:${c.id}`)!, records.get(`head:${c.id}`)!];
    let roots: { base: number; head: number } | undefined;
    if (c.component) {
      // The diff is of the crops: boxes become crop coordinates, and only the component's elements count.
      shiftSnapshot(base, c.component.crop.base, baseRec.scale ?? 1);
      shiftSnapshot(head, c.component.crop.head, headRec.scale ?? 1);
      roots = { base: base.elements.findIndex((e) => e.selector === baseRec.component?.root?.selector), head: head.elements.findIndex((e) => e.selector === headRec.component?.root?.selector) };
      if (roots.base < 0 || roots.head < 0) c.warnings.push('the component root is not in the element map (not visible, or past capture.styleMaxElements), so no measured change is listed');
    }
    const match = matchElements(base.elements, head.elements);
    // A flow checkpoint shows the first viewport only: what changed below it is the still capture's to report.
    const view = c.flow && c.diff ? { width: Math.max(c.diff.sizeBefore[0], c.diff.sizeAfter[0]), height: Math.max(c.diff.sizeBefore[1], c.diff.sizeAfter[1]) } : undefined;
    const inView = (x: ElementChange) => !view || Boolean(x.deviceBox && x.deviceBox.x < view.width && x.deviceBox.y < view.height && x.deviceBox.x + x.deviceBox.width > 0 && x.deviceBox.y + x.deviceBox.height > 0);
    const diffed = diffElements(base, head, match, { focusOnly: c.regions?.focusOnly }).filter(inView);
    const all = roots ? scopeChanges(diffed, base.elements, head.elements, roots) : diffed;
    // maxChanges limits the elements that count; effects stay when their cause does.
    const counted = all.filter((x) => !onlyEffects(x));
    const top = counted.slice(0, cfg.styleDiff.maxChanges);
    const ids = new Set(top.flatMap((x) => [x.id, ...x.changes.map((p) => p.id)]));
    const kept = [...top, ...all.filter((x) => onlyEffects(x) && x.changes.every((p) => ids.has(p.cause))).slice(0, EFFECTS_KEPT)];
    const regions = c.diff ? explainRegions(c.diff.regions, c.diff.scale, head, base, kept) : [];
    verifyChanges(kept, c.status === 'changed' ? (c.diff?.regions ?? []) : [], cfg.styleDiff.minConfidence);
    const states = diffStates(records.get(`base:${c.id}`)?.states, records.get(`head:${c.id}`)?.states, base, head, match, { focusOnly: c.regions?.focusOnly });
    verifyStateChanges(states, cfg.styleDiff.minConfidence, (a, b) => cropsDiffer(a, b));
    kept.push(...states);
    const count = (level: string) => match.pairs.filter((p) => p.confidence === level).length;
    c.styleDiff = {
      matched: { high: count('high'), medium: count('medium'), low: count('low') },
      changes: kept,
      ...(counted.length > top.length ? { omitted: counted.length - top.length } : {}),
      regions,
    };
  }
}

/** Variants, motion clips, the token audit and the accessibility delta, with how long each took. */
async function extrasStage(
  opts: RunOptions,
  booted: Booted,
  prepared: Prepared,
  captures: CaptureResult[],
  records: Map<string, CaptureRecord>,
): Promise<{ extras: Pick<Report, 'variants' | 'motion' | 'motionSkipped' | 'motionNoAnimation' | 'tokens' | 'a11y'>; timings: NonNullable<Timings['extras']> }> {
  const { cfg, outDir } = opts;
  const { routes, viewports, themes } = prepared;
  const { session, base, head } = booted;
  const timings: NonNullable<Timings['extras']> = {};
  const sum = (pick: (r: CaptureRecord) => number | undefined) => [...records.values()].reduce((n, r) => n + (pick(r) ?? 0), 0);

  let start = performance.now();
  const specs = variantSpecs(opts, routes);
  const variants = await captureVariants(session, { routes, viewports, themes, head, outDir, cfg, specs });
  if (specs.size) timings.variantsMs = since(start);
  const changedRoutes = new Set(captures.filter((c) => c.status === 'changed' || c.status === 'added' || c.status === 'removed').map((c) => c.route.path));
  const motionSkipped: string[] = [];
  const motionNoAnimation: string[] = [];
  let motion: MotionResult[] = [];
  if (prepared.motionOn) {
    start = performance.now();
    const animated = prepared.detection ? await animatedRoutes(prepared.detection, cfg) : undefined;
    motion = await captureMotion(session, {
      routes,
      viewports,
      themes,
      base: booted.liveBase,
      head,
      outDir,
      cfg,
      explicit: Boolean(opts.motion),
      all: cfg.motion.all || Boolean(opts.motionAll),
      changedRoutes,
      animated,
      skipped: motionSkipped,
      noAnimation: motionNoAnimation,
    });
    timings.motionMs = since(start);
  }
  let tokens: Report['tokens'];
  if (prepared.tokens) {
    start = performance.now();
    tokens = auditTokens(captures, { outDir, tokenSet: prepared.tokens.set, cfg, files: prepared.tokens.files });
    timings.tokensMs = since(start) + (cfg.styleDiff.enabled ? 0 : sum((r) => r.stylesMs));
  }
  let a11y: Report['a11y'];
  if (prepared.a11yOn) {
    start = performance.now();
    a11y = a11yDelta(captures, prepared.plans, records, cfg);
    timings.a11yMs = since(start) + sum((r) => r.a11yMs);
  }
  return {
    extras: { variants, motion, motionSkipped: motionSkipped.length ? motionSkipped : undefined, motionNoAnimation: motionNoAnimation.length ? motionNoAnimation : undefined, tokens, a11y },
    timings,
  };
}

function captureFingerprint(baseRec: CaptureRecord, headRec: CaptureRecord, ctx: { base: Side; head: Side; cfg: ResolvedConfig; cache?: BaseCacheInfo }): CaptureFingerprint | undefined {
  const side = (rec: CaptureRecord, s: Side): SideFingerprint | undefined =>
    rec.environment ? { ...(s.sha ? { commit: s.sha } : {}), ...rec.environment, data: ctx.cfg.fingerprint.dataLabel ?? 'not declared' } : undefined;
  const states = (rec: CaptureRecord) => (rec.states ? { states: { checked: rec.states.checked, skipped: rec.states.skipped, skippedWhy: rec.states.skippedWhy } } : {});
  const base = side(baseRec, ctx.base);
  if (base) Object.assign(base, states(baseRec));
  if (base && ctx.cache) base.cache = { hit: ctx.cache.hit, key: ctx.cache.key };
  const head = side(headRec, ctx.head);
  if (head) Object.assign(head, states(headRec));
  if (!base && !head) return undefined;
  return { base, head, differences: base && head ? fingerprintDifferences(base, head) : [] };
}

export function skippedActionWarning(side: string, action: string): string {
  return `${side}: route action "${action}" skipped: no element matches it on ${side}`;
}

/**
 * The boxes the diff is limited to when the route has focus selectors: every matching element on
 * either side. Undefined (the whole page) without focus, or when focus matched nothing (warned).
 */
function focusArea(plan: Plan, baseRec: CaptureRecord, headRec: CaptureRecord, cfg: ResolvedConfig): Box[] | undefined {
  if (regionsOf(cfg, plan.route).focus.length === 0) return undefined;
  const boxes = [...(baseRec.focusBoxes ?? []), ...(headRec.focusBoxes ?? [])];
  return boxes.length ? boxes : undefined;
}

/** Warnings for focus and ignore selectors that matched nothing on a side, and for a focus that fell back to the whole page. */
export function regionWarnings(regions: { focus: string[]; ignore: string[] }, hits: Partial<Record<'base' | 'head', CaptureRecord['regionHits']>>): string[] {
  const out: string[] = [];
  for (const kind of ['focus', 'ignore'] as const) {
    for (const selector of regions[kind]) {
      const missing = (['base', 'head'] as const).filter((side) => hits[side] && (hits[side]![kind][selector] ?? 0) === 0);
      if (missing.length) out.push(`${kind} selector \`${selector}\` matched nothing on ${missing.join(' and ')}`);
    }
  }
  const anyFocus = (['base', 'head'] as const).some((side) => regions.focus.some((sel) => (hits[side]?.focus[sel] ?? 0) > 0));
  if (regions.focus.length && !anyFocus) out.push('no focus selector matched, so the whole page was compared');
  return out;
}

/** Comparing two error pages says nothing about the UI, so HTTP errors fail the capture. */
export function httpProblem(side: 'base' | 'head', status: number | undefined): string | undefined {
  if (status === undefined || status < 400) return undefined;
  if (status === 401 || status === 403) return `${side} returned HTTP ${status} (protected page? configure auth.headers / auth.cookies)`;
  if (status === 404 || status === 410) return `${side} returned HTTP ${status} (check the route path)`;
  return `${side} returned HTTP ${status}`;
}

function compareCapture(plan: Plan, baseRec: CaptureRecord, headRec: CaptureRecord, ctx: { base: Side; head: Side; cfg: ResolvedConfig; outDir: string; cache?: BaseCacheInfo }): CaptureResult {
  const { cfg, outDir } = ctx;
  const result: CaptureResult = {
    id: plan.id,
    route: { path: plan.route.path, name: plan.route.name, slug: plan.route.slug },
    viewport: plan.viewport.name,
    theme: plan.theme.name,
    ...(plan.flow ? { flow: { name: plan.flow.def.name, checkpoint: plan.flow.checkpoint.name } } : {}),
    status: 'error',
    urls: {
      base: ctx.base.mode === 'url' ? sanitizeUrl(routeUrl(ctx.base.url, plan.route.path, plan.theme.query)) : undefined,
      head: ctx.head.mode === 'url' ? sanitizeUrl(routeUrl(ctx.head.url, plan.route.path, plan.theme.query)) : undefined,
    },
    images: { focus: [] },
    warnings: [],
    truncated: false,
  };
  result.fingerprint = captureFingerprint(baseRec, headRec, ctx);
  if (baseRec.file) result.images.base = rel(outDir, baseRec.file);
  if (headRec.file) result.images.head = rel(outDir, headRec.file);
  const missing = (r: CaptureRecord) => r.httpStatus === 404 || r.httpStatus === 410;
  if (!baseRec.ok || !headRec.ok) {
    result.error = [!baseRec.ok && `base: ${baseRec.error}`, !headRec.ok && `head: ${headRec.error}`].filter(Boolean).join('; ');
    return result;
  }
  if (missing(baseRec) && !missing(headRec) && (headRec.httpStatus ?? 200) < 400) {
    result.status = 'added';
    return result;
  }
  if (!missing(baseRec) && missing(headRec) && (baseRec.httpStatus ?? 200) < 400) {
    result.status = 'removed';
    return result;
  }
  const httpErrors = [httpProblem('base', baseRec.httpStatus), httpProblem('head', headRec.httpStatus)].filter(Boolean);
  if (httpErrors.length) {
    result.error = httpErrors.join('; ');
    return result;
  }
  const scale = headRec.scale ?? baseRec.scale ?? 1;
  if (baseRec.scale !== undefined && headRec.scale !== undefined && baseRec.scale !== headRec.scale) {
    result.warnings.push(`base and head rendered at different device pixel ratios (${baseRec.scale}× and ${headRec.scale}×); sizes use head's`);
  }
  let [before, after] = [readPng(baseRec.file!), readPng(headRec.file!)];
  if (plan.component) {
    const [b, h] = [baseRec.component?.root, headRec.component?.root];
    if (!b || !h) {
      result.error = 'the component root box was not recorded';
      return result;
    }
    const [bs, hs] = [baseRec.scale ?? scale, headRec.scale ?? scale];
    const crop = componentCrop(b.box, h.box, cfg.componentLimits.padding, { base: { width: before.width / bs, height: before.height / bs }, head: { width: after.width / hs, height: after.height / hs } });
    [before, after] = [cropPng(before, toDevice(crop.base, bs, before), COLORS.background), cropPng(after, toDevice(crop.head, hs, after), COLORS.background)];
    const { def, state } = plan.component;
    const moved = rootChange(b.box, h.box);
    result.component = { name: def.name, state, selector: def.selector, ...(def.flow ? { flow: { name: def.flow.def.name, checkpoint: def.flow.checkpoint.name } } : {}), crop, root: { before: b.box, after: h.box }, ...(moved ? { rootChange: moved } : {}) };
  }
  const only = plan.component ? undefined : focusArea(plan, baseRec, headRec, cfg);
  const diff = diffPngs(before, after, {
    threshold: cfg.diff.threshold,
    includeAA: cfg.diff.includeAA,
    minChangedPixels: cfg.diff.minChangedPixels,
    highlight: cfg.diff.highlightColor,
    scale,
    // Both crops are the same box around the component: nothing to realign.
    alignShifts: plan.component ? false : cfg.diff.alignShifts,
    only,
  });
  const css = (n: number) => Math.round(n / scale);
  result.status = diff.changed ? 'changed' : 'unchanged';
  result.diff = {
    changedPixels: diff.changedPixels,
    ratio: diff.ratio,
    regions: diff.regions,
    scale,
    sizeBefore: [diff.before.width, diff.before.height],
    sizeAfter: [diff.after.width, diff.after.height],
    sizeChanged: diff.sizeChanged,
  };
  if (diff.shifted.length) result.diff.shifted = diff.shifted.map((r) => ({ beforeY: css(r.beforeY), afterY: css(r.afterY), height: css(r.height), dy: css(r.dy) }));
  if (diff.removedRows) result.diff.removedHeight = css(diff.removedRows);
  if (!diff.changed) return result;
  if (onlyInUnsettled(diff.regions, [...(baseRec.unsettled ?? []), ...(headRec.unsettled ?? [])], scale)) {
    result.warnings.push('every difference is inside an area that kept changing by itself (see "page did not settle"), so it is probably not caused by this change');
  }
  const labels = {
    before: `BEFORE ${ctx.base.shortSha ?? 'BASE'}`,
    after: `AFTER ${ctx.head.shortSha ?? 'HEAD'}`,
    diff: `DIFF ${pct(diff.ratio)}`,
  };
  const diffFile = path.join(outDir, 'diff', `${plan.id}.png`);
  writePng(diffFile, diff.diffImage);
  result.images.diff = rel(outDir, diffFile);
  const compareFile = path.join(outDir, 'compare', `${plan.id}.png`);
  writePng(compareFile, composeCompare(diff, labels, { maxWidth: cfg.diff.compositeMaxWidth }));
  result.images.compare = rel(outDir, compareFile);
  // With focus selectors, crops stay inside the focused elements (ignored areas are already painted over).
  // A component's crop is already the close-up: its pair, blink and zoom show the whole crop.
  const boxes = plan.component ? [{ x: 0, y: 0, width: diff.width, height: diff.height }] : focusBoxes(diff.regions, diff.width, diff.height, { max: cfg.diff.maxFocusCrops, padding: cfg.diff.focusPadding * scale, scale }).map((b) => clipToFocus(b, only));
  if (boxes.length) result.diff.focusBoxes = boxes.map((b) => ({ x: css(b.x), y: css(b.y), width: css(b.width), height: css(b.height) }));
  boxes.forEach((box, i) => {
    const file = path.join(outDir, 'compare', `${plan.id}__focus-${i + 1}.png`);
    writePng(file, composeCompare(diff, labels, { box, maxWidth: cfg.diff.compositeMaxWidth, upscaleBelow: 360 * scale }));
    result.images.focus.push(rel(outDir, file));
    const pairFile = path.join(outDir, 'compare', `${plan.id}__pair-${i + 1}.png`);
    writePng(pairFile, composePair(diff, box, labels, { highlight: cfg.diff.highlightColor, scale, maxWidth: cfg.diff.compositeMaxWidth, upscaleBelow: 360 * scale }));
    (result.images.pairs ??= []).push(rel(outDir, pairFile));
    const blinkFile = path.join(outDir, 'compare', `${plan.id}__blink-${i + 1}.gif`);
    writeFile(blinkFile, encodeBlinkGif(blinkFrames(diff, box, labels, { highlight: cfg.diff.highlightColor, scale, maxWidth: 800 })));
    (result.images.blinks ??= []).push(rel(outDir, blinkFile));
  });
  return result;
}

async function captureVariants(
  session: CaptureSession,
  ctx: { routes: ResolvedRoute[]; viewports: ViewportConfig[]; themes: ThemeConfig[]; head: Side; outDir: string; cfg: ResolvedConfig; specs: Map<string, VariantSpec> },
): Promise<VariantGroup[]> {
  const groups: VariantGroup[] = [];
  for (const route of ctx.routes) {
    const spec = ctx.specs.get(route.path);
    if (!spec) continue;
    const vps = spec.viewports ? ctx.viewports.filter((v) => spec.viewports!.includes(v.name)) : ctx.viewports;
    const ths = spec.themes ? ctx.themes.filter((t) => spec.themes!.includes(t.name)) : ctx.themes.slice(0, 1);
    for (const viewport of vps) {
      for (const theme of ths) {
        const id = captureId(route, viewport, theme, { param: spec.param });
        const group: VariantGroup = { id, route: { path: route.path, name: route.name, slug: route.slug }, param: spec.param, viewport: viewport.name, theme: theme.name, items: [] };
        for (const value of spec.values) {
          log.step(`variant ${route.path} ${spec.param}=${value} (${viewport.name}, ${theme.name})`);
          const file = path.join(ctx.outDir, 'variants', `${captureId(route, viewport, theme, { param: spec.param, value })}.png`);
          const record = await session.capture({
            id: `${id}=${value}`,
            side: 'head',
            route,
            viewport,
            theme,
            url: routeUrl(ctx.head.url, route.path, { ...theme.query, [spec.param]: value }),
            file,
          });
          const problem = httpProblem('head', record.httpStatus);
          group.items.push(record.ok && !problem ? { value, image: rel(ctx.outDir, file) } : { value, error: record.error ?? problem });
        }
        const images = group.items.filter((i) => i.image).map((i) => ({ value: i.value, png: readPng(path.join(ctx.outDir, i.image!)) }));
        if (images.length > 1) {
          const panelWidth = Math.min(...images.map((i) => i.png.width), 720);
          const strip = composeRow(
            images.map((i) => ({ image: resizeToWidth(i.png, panelWidth), label: `${spec.param}=${i.value}`, accent: COLORS.variant })),
            { maxWidth: ctx.cfg.diff.compositeMaxWidth },
          );
          const stripFile = path.join(ctx.outDir, 'variants', `${id}__strip.png`);
          writePng(stripFile, strip);
          group.strip = rel(ctx.outDir, stripFile);
        }
        groups.push(group);
      }
    }
  }
  return groups;
}

async function captureMotion(
  session: CaptureSession,
  ctx: {
    routes: ResolvedRoute[];
    viewports: ViewportConfig[];
    themes: ThemeConfig[];
    /** The running base app; started on demand when base captures came from the cache. */
    base: () => Promise<Side>;
    head: Side;
    outDir: string;
    cfg: ResolvedConfig;
    explicit: boolean;
    all: boolean;
    changedRoutes: Set<string>;
    /** Routes whose changed files touch motion; undefined when that is unknown (no detection). */
    animated?: Set<string>;
    skipped: string[];
    noAnimation: string[];
  },
): Promise<MotionResult[]> {
  const { cfg } = ctx;
  const declared = ctx.routes.filter((r) => r.motion);
  const candidates = declared.length ? declared : ctx.explicit ? ctx.routes : [];
  // With detection, the changed files decide: a transition-only change leaves the still capture
  // unchanged but needs a clip, and a text change needs none. Without it, routes with a visual change get one.
  let targets: ResolvedRoute[];
  if (ctx.all) targets = candidates;
  else if (ctx.animated) {
    targets = candidates.filter((r) => ctx.animated!.has(r.path));
    for (const route of candidates) if (!targets.includes(route)) ctx.noAnimation.push(route.path);
    if (ctx.noAnimation.length) log.info(`motion: skipping ${ctx.noAnimation.join(', ')}: no animation-related change in their files (use --motion-all to record them)`);
  } else {
    targets = motionTargets(candidates, ctx.changedRoutes, false);
    for (const route of candidates) if (!targets.includes(route)) ctx.skipped.push(route.path);
    if (ctx.skipped.length) log.info(`motion: skipping unchanged route(s) ${ctx.skipped.join(', ')} (use --motion-all to record them)`);
  }
  const results: MotionResult[] = [];
  const baseSide = targets.length ? await ctx.base() : undefined;
  for (const route of targets) {
    const m = route.motion ?? {};
    const viewport = ctx.viewports.find((v) => v.name === (m.viewport ?? cfg.motion.viewport)) ?? ctx.viewports[0];
    const theme = ctx.themes.find((t) => t.name === (m.theme ?? cfg.motion.theme)) ?? ctx.themes[0];
    const steps = m.steps ?? cfg.motion.steps;
    const durationMs = m.durationMs ?? cfg.motion.durationMs;
    const id = captureId(route, viewport, theme);
    const result: MotionResult = { id, route: { path: route.path, name: route.name, slug: route.slug }, viewport: viewport.name, theme: theme.name, steps: steps.map(describeStep) };
    log.step(`motion ${route.path} (${viewport.name}): ${result.steps.join(', ') || 'page load'}`);
    try {
      const video = (side: Side) => (cfg.motion.format === 'gif' ? undefined : path.join(ctx.outDir, 'motion', `${id}__${side.name === 'base' ? 'before' : 'after'}.webm`));
      const record = (side: Side) => recordMotionSide(session, side, { route, viewport, theme, steps, durationMs, fromNavigation: Boolean(m.fromNavigation), cfg, video: video(side) });
      const [base, head] = cfg.motion.parallel ? await Promise.all([record(baseSide!), record(ctx.head)]) : [await record(baseSide!), await record(ctx.head)];
      for (const [side, rec] of [['base', base], ['head', head]] as const) {
        if (rec.reduced) (result.warnings ??= []).push(`${side}: the page saw prefers-reduced-motion: reduce while recording`);
        for (const s of rec.skipped) result.steps = result.steps.map((d) => (d === s ? `${d} (not on ${side})` : d));
      }
      result.frames = { base: distinctFrames(base.frames), head: distinctFrames(head.frames) };
      const still = motionWarning(result.frames);
      if (still) {
        (result.warnings ??= []).push(still);
        log.warn(`motion ${route.path}: ${still}`);
      }
      if (cfg.motion.format !== 'webm') {
        const gif = encodeSideBySideGif(base.frames, head.frames, {
          fps: cfg.motion.fps,
          durationMs,
          scale: cfg.motion.scale,
          labels: { before: `BEFORE ${baseSide!.shortSha ?? ''}`.trim(), after: `AFTER ${ctx.head.shortSha ?? ''}`.trim() },
        });
        const file = path.join(ctx.outDir, 'motion', `${id}.gif`);
        writeFile(file, gif);
        result.gif = rel(ctx.outDir, file);
      }
      if (cfg.motion.format !== 'gif') result.webm = { base: base.video && rel(ctx.outDir, base.video), head: head.video && rel(ctx.outDir, head.video) };
    } catch (error) {
      result.error = (error as Error).message.split('\n')[0];
      log.warn(`motion ${route.path}: ${result.error}`);
    }
    results.push(result);
  }
  return results;
}

/**
 * One side of a motion clip from a single page load: PNG frames of the steps for the GIF (CDP
 * screencast) and, at the same time, the WebM (Playwright's screencast, from before navigation
 * so it shows the load like a recorded context did).
 */
async function recordMotionSide(
  session: CaptureSession,
  side: Side,
  ctx: { route: ResolvedRoute; viewport: ViewportConfig; theme: ThemeConfig; steps: Step[]; durationMs: number; fromNavigation: boolean; cfg: ResolvedConfig; video?: string },
): Promise<{ frames: RawFrame[]; skipped: string[]; reduced: boolean; video?: string }> {
  const { cfg } = ctx;
  const context = await session.newContext(ctx.viewport, ctx.theme, { deviceScaleFactor: 1 }, true);
  try {
    const page = await context.newPage();
    const url = routeUrl(side.url, ctx.route.path, ctx.theme.query);
    const size = page.viewportSize() ?? { width: 1280, height: 800 };
    if (ctx.video) {
      mkdirSync(path.dirname(ctx.video), { recursive: true });
      await page.screencast.start({ path: ctx.video, size });
    }
    const recordOpts = { durationMs: ctx.durationMs, width: size.width, height: size.height, timeoutMs: cfg.capture.timeoutMs };
    let recorded: Awaited<ReturnType<typeof recordFrames>>;
    if (ctx.fromNavigation) {
      await page.goto('about:blank');
      recorded = await recordFrames(page, ctx.steps, { ...recordOpts, beforeSteps: async () => void (await page.goto(url, { waitUntil: 'load' })) });
    } else {
      await session.openAndSettle(page, url, { ...ctx.route, actions: [] }, { freeze: false, fullPage: false });
      recorded = await recordFrames(page, ctx.steps, recordOpts);
    }
    if (ctx.video) await page.screencast.stop();
    const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches).catch(() => false);
    return { frames: recorded.frames, skipped: recorded.skipped, reduced, video: ctx.video && existsSync(ctx.video) ? ctx.video : undefined };
  } finally {
    await context.close().catch(() => undefined);
  }
}

/**
 * Detected routes whose changed files touch motion (transitions, keyframes, :hover, motion
 * libraries...). Undefined, meaning "all of them", when an animation package changed.
 */
async function animatedRoutes(detection: DetectResult, cfg: ResolvedConfig): Promise<Set<string> | undefined> {
  if (detection.dependencies.some((d) => isAnimationPackage(d.name))) return undefined;
  const files = [...new Set(detection.routes.flatMap((h) => h.files))];
  const lines = await changedLines(detection.mergeBase, detection.head.sha, files, cfg.repoRoot);
  const animated = new Set<string>();
  for (const hit of detection.routes) {
    const tokens = stepTokens(hit.route.motion?.steps ?? cfg.motion.steps);
    // A file without a text diff (renamed, binary, odd path) cannot be ruled out.
    if (hit.files.some((f) => !lines.has(f) || touchesAnimation(f, lines.get(f)!, tokens))) animated.add(hit.route.path);
  }
  return animated;
}

/** Routes that get a motion clip: those with a visual change, or all of them with --motion-all. */
export function motionTargets<T extends { path: string }>(candidates: T[], changedRoutes: Set<string>, all: boolean): T[] {
  return all ? candidates : candidates.filter((r) => changedRoutes.has(r.path));
}

function auditTokens(captures: CaptureResult[], ctx: { outDir: string; tokenSet: TokenSet; cfg: ResolvedConfig; files: string[] }): Report['tokens'] {
  const { cfg, tokenSet } = ctx;
  const perCapture: Array<{ capture: string; findings: ReturnType<typeof auditSnapshot>; baseValues?: Set<string> }> = [];
  const audited: string[] = [];
  const opts = { properties: cfg.tokens.properties, colorTolerance: cfg.tokens.colorTolerance, pxTolerance: cfg.tokens.pxTolerance, allow: cfg.tokens.allow };
  for (const c of captures) {
    if (c.status !== 'changed' && c.status !== 'added') continue;
    const headFile = path.join(ctx.outDir, 'styles', 'head', `${c.id}.json`);
    if (!existsSync(headFile)) continue;
    const head = JSON.parse(readFileSync(headFile, 'utf8')) as StyleSnapshot;
    const scale = c.diff?.scale ?? 1;
    const regions =
      cfg.tokens.scope === 'changed-regions' && c.status === 'changed' && c.diff
        ? c.diff.regions.map((r) => ({ x: r.x / scale, y: r.y / scale, width: r.width / scale, height: r.height / scale }))
        : undefined;
    const findings = auditSnapshot(head, tokenSet, { ...opts, regions });
    const baseFile = path.join(ctx.outDir, 'styles', 'base', `${c.id}.json`);
    const baseValues = c.status === 'changed' && existsSync(baseFile) ? findingKeys(auditSnapshot(JSON.parse(readFileSync(baseFile, 'utf8')) as StyleSnapshot, tokenSet, opts)) : undefined;
    perCapture.push({ capture: `${c.route.path} ${c.viewport}/${c.theme}`, findings, baseValues });
    audited.push(c.id);
  }
  const categories: Array<[string, Parameters<typeof hasCategory>[1]]> = [
    ['color', 'color'],
    ['spacing', 'spacing'],
    ['radius', 'radius'],
    ['font-size', 'fontSize'],
    ['font-weight', 'fontWeight'],
    ['font-family', 'fontFamily'],
  ];
  const skipped = categories.filter(([, cat]) => !hasCategory(tokenSet, cat)).map(([name]) => name);
  return {
    files: ctx.files.map((f) => path.relative(cfg.repoRoot, f).split(path.sep).join('/')),
    scope: cfg.tokens.scope,
    audited,
    skipped,
    findings: aggregateFindings(perCapture).slice(0, cfg.tokens.maxFindings),
  };
}

function a11yDelta(captures: CaptureResult[], plans: Plan[], records: Map<string, CaptureRecord>, cfg: ResolvedConfig): Report['a11y'] {
  const added = new Map<string, A11yIssue & { captures: string[] }>();
  const fixed = new Map<string, A11yIssue & { captures: string[] }>();
  const focus: Array<{ capture: string; delta: ReturnType<typeof diffFocusOrder> }> = [];
  const audited: string[] = [];
  const errors: string[] = [];
  for (const plan of plans.filter((p) => p.a11y)) {
    const b = records.get(`base:${plan.id}`);
    const h = records.get(`head:${plan.id}`);
    const label = `${plan.route.path} ${plan.viewport.name}/${plan.theme.name}`;
    const status = captures.find((c) => c.id === plan.id)?.status;
    if (!h?.axe || status === 'error') {
      errors.push(label);
      continue;
    }
    audited.push(plan.id);
    const delta = diffViolations(status === 'added' ? [] : (b?.axe ?? []), h.axe);
    for (const [list, map] of [
      [delta.added, added],
      [delta.fixed, fixed],
    ] as const) {
      for (const issue of list) {
        const key = `${issue.rule}|${issue.target}`;
        const existing = map.get(key);
        if (existing) {
          if (!existing.captures.includes(label)) existing.captures.push(label);
        } else {
          map.set(key, { ...issue, captures: [label] });
        }
      }
    }
    if (plan.focus && b?.focusOrder && h.focusOrder) {
      focus.push({ capture: `${plan.route.path} ${plan.viewport.name}`, delta: diffFocusOrder(b.focusOrder, h.focusOrder) });
    }
  }
  const impactRank: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const sort = (list: Array<A11yIssue & { captures: string[] }>) => list.sort((a, b) => (impactRank[a.impact ?? 'minor'] ?? 4) - (impactRank[b.impact ?? 'minor'] ?? 4) || a.rule.localeCompare(b.rule));
  return { tags: cfg.a11y.tags, audited, added: sort([...added.values()]), fixed: sort([...fixed.values()]), focus, errors };
}

function writeOutputs(report: Report, outDir: string, noChanges: boolean): RunOutcome {
  const reportFile = path.join(outDir, 'report.json');
  writeRedacted(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  writeRedacted(path.join(outDir, 'summary.auto.md'), `${autoSummary(report)}\n`);
  const previewFile = path.join(outDir, 'comment.local.md');
  writeRedacted(previewFile, renderComment(report, { id: 'preview', title: 'UI diff (local preview)', link: (p) => p, storageNote: 'local preview — nothing uploaded' }));
  return { report, reportFile, previewFile, noChanges };
}
