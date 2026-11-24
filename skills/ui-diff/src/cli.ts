import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { resolveBrowser } from './capture.js';
import { CHECK_EXIT, checkSummary } from './check.js';
import { openOutputs } from './open.js';
import { CONFIG_FILENAME, loadConfig, type ResolvedConfig } from './config.js';
import { inferFromPath } from './conventions.js';
import { detectChanges, detectSummary } from './detect.js';
import { exec } from './exec.js';
import { git, repoRoot } from './git.js';
import { createGhClient, findStickyComment, getPullRequest, prState, publishDecision, repoVisibility, uploadGuard, upsertStickyComment } from './github.js';
import type { RemoteInfo } from './git.js';
import { configureLog, log, notesAfter, redact, UiDiffError, writeRedacted } from './log.js';
import { noUiChangeComment, referencedImages, renderComment, timingLine } from './markdown.js';
import { baseCacheKeyFor, lastRunFailure, runPipeline } from './pipeline.js';
import { encodePath, linkBaseFor, listAssetPrs, publishToBranch, pruneBranch, resolveRemote } from './publish.js';
import { noUiChange, parseReport, type Report } from './report.js';
import { killAllServers } from './server.js';
import { detectTokenFiles } from './tokens.js';
import { VERSION } from './version.js';

const HELP = `ui-diff ${VERSION} — before/after screenshots, pixel diffs and a UX summary for UI changes in a PR

Usage: ui-diff <command> [options]

Commands
  init        Write a starter ui-diff.config.json for this repository
  doctor      Check git, gh, Playwright and the config
  detect      List changed UI files and the routes they affect
  run         Capture base and head, diff them and write .ui-diff/report.json
  check       Diff your working tree against the merge base locally; prints a summary, posts nothing
              (exit 0: no visual changes, 1: changes, 2: errors)
  cache-key   Print the base cache key a run would use (for actions/cache)
  render      Render the PR comment locally (with your summary) without uploading anything
  publish     Upload images to the private assets branch and create/update the sticky PR comment
  prune       Remove images of closed (or given) PRs from the assets branch

Common options
  --config <file>        ui-diff.config.json to use (default: nearest one)
  --out <dir>            Output directory (default: <repo>/.ui-diff)
  --verbose | --quiet

detect / run
  --pr <n>               Compare the PR's base branch and head commit (uses gh)
  --base <ref>           Base ref (default: the default branch; captured at the merge base)
  --head <ref>           Head ref (default: the working tree, including uncommitted changes)
  --base-url <url>       Use a deployed preview for base instead of a local worktree
  --head-url <url>       Use a deployed preview for head
  --routes <list>        Comma-separated routes (skips detection)
  --all-routes           Capture every configured route
  --viewports <list>     e.g. desktop,mobile or tablet:820x1180@2
  --themes <list>        e.g. light,dark
  --variants <spec>      Variant compare, e.g. hero=1..4 or /pricing:plan=a,b (repeatable)
  --motion               Record before/after motion clips (routes whose changed files touch motion)
  --motion-all           Record motion clips for every route, changed or not
  --tokens <files>       Design-token audit against JSON, CSS or StyleX (*.stylex.ts) token files
                         (comma-separated; "auto" finds them)
  --a11y                 Accessibility delta: new and fixed axe issues, focus order
  --keep-worktrees       Keep the temporary worktrees for inspection
  --no-cache             Capture base again instead of reusing it from the base cache (.ui-diff/cache)

check (also takes the run options except --pr, --head and the preview URLs)
  --base <ref>           Compare with this ref (default: the merge base with the default branch)
  --out <dir>            Output directory (default: <repo>/.ui-diff/out)
  --json                 Print the summary as JSON instead of text
  --open                 Open the images folder and report.json with the default app

render
  --summary <file>       UX summary markdown (default: .ui-diff/summary.md when present)
  --output <file>        Where to write the markdown (default: .ui-diff/comment.preview.md)
  --copy-images          Copy the referenced images next to the output file

publish
  --pr <n>               Pull request (default: the PR of the current branch)
  --summary <file>       UX summary markdown (default: .ui-diff/summary.md when present)
  --dry-run              Render the comment and list uploads; touches no remote and no PR
  --no-upload            Text-only comment, nothing uploaded
  --no-comment           Upload images and write the comment file without posting
  --allow-public-repo    Permit uploading screenshots to a public repository
  --assume-private       Skip the visibility check when gh cannot read it
  --remote <name|url>    Git remote for the assets branch (default: origin)
  --branch <name>        Assets branch (default: ui-diff-assets)
  --link-base <url>      Override the image URL prefix
  --repo <owner/name>    Repository that holds the PR (default: from the remote)

prune
  --pr <n>               PR(s) to prune (comma-separated)
  --closed               Prune every closed or merged PR
  --dry-run              Only list what would be removed
`;

type Values = Record<string, string | boolean | string[] | undefined>;

/** Parses the arguments; throws on an unknown option, so docs can be checked against it. */
export function parse(argv: string[]): { command: string; values: Values } {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      out: { type: 'string' },
      verbose: { type: 'boolean' },
      quiet: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean' },
      pr: { type: 'string' },
      base: { type: 'string' },
      head: { type: 'string' },
      'base-url': { type: 'string' },
      'head-url': { type: 'string' },
      routes: { type: 'string' },
      'all-routes': { type: 'boolean' },
      viewports: { type: 'string' },
      themes: { type: 'string' },
      variants: { type: 'string', multiple: true },
      motion: { type: 'boolean' },
      'motion-all': { type: 'boolean' },
      tokens: { type: 'string' },
      a11y: { type: 'boolean' },
      'keep-worktrees': { type: 'boolean' },
      summary: { type: 'string' },
      'dry-run': { type: 'boolean' },
      'no-upload': { type: 'boolean' },
      'no-comment': { type: 'boolean' },
      'no-cache': { type: 'boolean' },
      json: { type: 'boolean' },
      open: { type: 'boolean' },
      'allow-public-repo': { type: 'boolean' },
      'assume-private': { type: 'boolean' },
      remote: { type: 'string' },
      branch: { type: 'string' },
      'link-base': { type: 'string' },
      repo: { type: 'string' },
      closed: { type: 'boolean' },
      force: { type: 'boolean' },
      output: { type: 'string' },
      'copy-images': { type: 'boolean' },
    },
  });
  return { command: positionals[0] ?? (values.version ? 'version' : 'help'), values };
}

function list(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function print(data: unknown): void {
  process.stdout.write(`${redact(JSON.stringify(data, null, 2))}\n`);
}

async function context(values: Values): Promise<{ root: string; cfg: ResolvedConfig; outDir: string }> {
  const root = await repoRoot(process.cwd());
  const cfg = loadConfig(root, process.cwd(), values.config as string | undefined);
  if (cfg.file) log.debug(`config: ${path.relative(root, cfg.file)}`);
  const outDir = path.resolve(process.cwd(), (values.out as string | undefined) ?? path.join(root, '.ui-diff'));
  return { root, cfg, outDir };
}

async function prRefs(values: Values, root: string): Promise<{ base?: string; head?: string; pr?: number }> {
  if (!values.pr) return { base: values.base as string | undefined, head: values.head as string | undefined };
  const number = Number(values.pr);
  if (!Number.isInteger(number) || number <= 0) throw new UiDiffError(`--pr must be a number, got ${values.pr}`);
  const pr = await getPullRequest(number, values.repo as string | undefined);
  log.step(`PR #${pr.number}: ${pr.baseRefName} ← ${pr.headRefName} (${pr.headRefOid.slice(0, 7)})`);
  await exec('git', ['fetch', '--no-tags', '--quiet', 'origin', pr.baseRefName, `refs/pull/${pr.number}/head`], { cwd: root, allowFailure: true });
  return { base: (values.base as string | undefined) ?? `origin/${pr.baseRefName}`, head: (values.head as string | undefined) ?? pr.headRefOid, pr: pr.number };
}

/**
 * The working tree (uncommitted changes included) against the merge base, captured and diffed like
 * a PR run, with a terminal summary. Never posts or pushes. Exit 0, 1 or 2 (see CHECK_EXIT).
 */
async function cmdCheck(values: Values): Promise<number> {
  for (const flag of ['pr', 'head', 'base-url', 'head-url'] as const) {
    if (values[flag]) throw new UiDiffError(`check compares your working tree, so --${flag} does not apply`, { hint: 'Use `ui-diff run` to compare commits, a PR or deployed previews.', exitCode: CHECK_EXIT.error });
  }
  const root = await repoRoot(process.cwd());
  const cfg = loadConfig(root, process.cwd(), values.config as string | undefined);
  const outDir = path.resolve(process.cwd(), (values.out as string | undefined) ?? path.join(root, '.ui-diff', 'out'));
  const outcome = await runPipeline({
    cfg,
    outDir,
    base: values.base as string | undefined,
    routes: list(values.routes),
    allRoutes: Boolean(values['all-routes']),
    viewports: list(values.viewports),
    themes: list(values.themes),
    variants: values.variants as string[] | undefined,
    motion: Boolean(values.motion) || Boolean(values['motion-all']),
    motionAll: Boolean(values['motion-all']),
    tokens: list(values.tokens),
    a11y: Boolean(values.a11y),
    keepWorktrees: Boolean(values['keep-worktrees']),
    cache: !values['no-cache'],
  });
  const summary = checkSummary(outcome.report, outDir);
  const opened = values.open ? openCheckOutput(outDir) : undefined;
  if (values.json) print({ verdict: summary.verdict, exitCode: summary.exitCode, report: path.relative(process.cwd(), outcome.reportFile), stats: outcome.report.stats, timing: outcome.report.timings ? timingLine(outcome.report.timings) : undefined, ...(opened ? { opened } : {}) });
  else process.stdout.write(summary.text);
  return summary.exitCode;
}

/** `check --open`: the images folder and report.json, with the default app; says what it opened. */
function openCheckOutput(outDir: string): string[] {
  const where = path.relative(process.cwd(), outDir) || '.';
  const result = openOutputs(outDir);
  if (!result.opener) {
    log.info(`nothing to open in ${where}: no images in compare/ and no report.json`);
    return [];
  }
  if (result.opened.length) log.info(`opened ${result.opened.join(' and ')} with ${result.opener}`);
  for (const f of result.failed) log.warn(`could not open ${f}`);
  return result.opened;
}

async function cmdCacheKey(values: Values): Promise<void> {
  const { root, cfg, outDir } = await context(values);
  const refs = await prRefs(values, root);
  const key = await baseCacheKeyFor({ cfg, outDir, base: refs.base, head: refs.head, baseUrl: values['base-url'] as string | undefined, headUrl: values['head-url'] as string | undefined, routes: list(values.routes), allRoutes: Boolean(values['all-routes']), viewports: list(values.viewports), themes: list(values.themes), tokens: list(values.tokens), a11y: Boolean(values.a11y) });
  print(key ? { ...key, cacheDir: path.relative(process.cwd(), path.join(root, '.ui-diff', 'cache')) || '.' } : { key: null, reason: 'the base cache does not apply: nothing to capture, or base is a deployed preview' });
}

async function cmdDetect(values: Values): Promise<void> {
  const { root, cfg } = await context(values);
  const refs = await prRefs(values, root);
  const result = await detectChanges(cfg, { base: refs.base, head: refs.head });
  print(detectSummary(result));
}

async function cmdRun(values: Values): Promise<void> {
  const { root, cfg, outDir } = await context(values);
  const refs = await prRefs(values, root);
  const outcome = await runPipeline({
    cfg,
    outDir,
    base: refs.base,
    head: refs.head,
    baseUrl: values['base-url'] as string | undefined,
    headUrl: values['head-url'] as string | undefined,
    routes: list(values.routes),
    allRoutes: Boolean(values['all-routes']),
    viewports: list(values.viewports),
    themes: list(values.themes),
    variants: values.variants as string[] | undefined,
    motion: Boolean(values.motion) || Boolean(values['motion-all']),
    motionAll: Boolean(values['motion-all']),
    tokens: list(values.tokens),
    a11y: Boolean(values.a11y),
    keepWorktrees: Boolean(values['keep-worktrees']),
    cache: !values['no-cache'],
  });
  const r = outcome.report;
  print({
    // "no-ui-changes" only when no UI file changed; UI files that map to no route are "nothing-mapped".
    status: !outcome.noChanges ? 'ok' : r.detect?.uiFiles.length ? 'nothing-mapped' : 'no-ui-changes',
    notChecked: r.notChecked,
    report: path.relative(process.cwd(), outcome.reportFile),
    preview: path.relative(process.cwd(), outcome.previewFile),
    summaryTemplate: path.relative(process.cwd(), path.join(outDir, 'summary.auto.md')),
    base: r.base.label,
    head: r.head.label,
    stats: r.stats,
    changed: r.captures
      .filter((c) => c.status !== 'unchanged')
      .map((c) => ({ id: c.id, status: c.status, ratio: c.diff?.ratio, styleChanges: c.styleDiff?.changes.length, images: [...c.images.focus, c.images.compare ?? c.images.head].filter(Boolean), error: c.error })),
    variants: r.variants.map((v) => ({ id: v.id, images: v.items.map((i) => i.image ?? i.error) })),
    motion: r.motion.map((m) => ({ id: m.id, gif: m.gif, webm: m.webm, frames: m.frames, warnings: m.warnings, error: m.error })),
    components: r.components?.map((c) => ({ name: c.name, state: c.state, viewport: c.viewport, theme: c.theme, capture: c.capture, status: r.captures.find((x) => x.id === c.capture)?.status, matches: c.matches, finding: c.finding, problem: c.problem, image: c.image, ms: { base: c.base.ms, head: c.head.ms } })),
    flows: r.flows?.map((f) => ({ name: f.name, route: f.route.path, viewport: f.viewport, theme: f.theme, checkpoints: f.checkpoints.map((c) => c.capture ?? `${c.name} (not reached)`), finding: f.finding, problem: f.problem, ms: { base: f.base.ms, head: f.head.ms } })),
    motionSkipped: r.motionSkipped,
    motionNoAnimation: r.motionNoAnimation,
    a11y: r.a11y ? { new: r.a11y.added.length, fixed: r.a11y.fixed.length, focusChanges: r.a11y.focus.filter((f) => f.delta.changed).length } : undefined,
    tokens: r.tokens ? { new: r.tokens.findings.filter((f) => f.isNew).length, existing: r.tokens.findings.filter((f) => !f.isNew).length, notAudited: r.tokens.skipped } : undefined,
    timing: r.timings ? timingLine(r.timings) : undefined,
    baseCache: r.baseCache,
    warnings: r.warnings,
    captureWarnings: r.captures.filter((c) => c.warnings.length).map((c) => ({ id: c.id, warnings: c.warnings })),
    notCaptured: [...(r.detect?.skippedRoutes ?? []), ...(r.detect?.needsExample.map((n) => n.route) ?? [])],
    unmatchedFiles: r.detect?.unmatched ?? [],
  });
}

function runStamp(report: Report): string {
  return report.createdAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

async function currentPr(root: string): Promise<number> {
  const result = await exec('gh', ['pr', 'view', '--json', 'number', '--jq', '.number'], { cwd: root, allowFailure: true });
  const n = Number(result.stdout.trim());
  if (result.code !== 0 || !n) throw new UiDiffError('No pull request found for the current branch', { hint: 'Pass --pr <number>.' });
  return n;
}

function loadReport(outDir: string, summaryOption: unknown): { report: Report; summary?: string } {
  const reportFile = path.join(outDir, 'report.json');
  if (!existsSync(reportFile)) throw new UiDiffError(`No report at ${reportFile}`, { hint: 'Run `ui-diff run` first.' });
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(reportFile, 'utf8'));
  } catch (error) {
    throw new UiDiffError(`Could not parse ${reportFile}: ${(error as Error).message}`, { hint: 'Rerun `ui-diff run`.' });
  }
  const report = parseReport(raw, reportFile);
  const failure = lastRunFailure(outDir);
  if (failure) log.warn(`the last run failed (${failure.failedAt}: ${failure.error.split('\n')[0]}); this report is from an earlier run (${report.createdAt}). Rerun \`ui-diff run\` before publishing.`);
  const summaryFile = (summaryOption as string | undefined) ?? (existsSync(path.join(outDir, 'summary.md')) ? path.join(outDir, 'summary.md') : undefined);
  if (!summaryFile) {
    log.info('no summary.md found, so the comment has no written summary: it starts with the verdict and the measured changes');
    return { report };
  }
  if (!existsSync(summaryFile)) throw new UiDiffError(`Summary file not found: ${summaryFile}`);
  if (statSync(summaryFile).mtimeMs < statSync(reportFile).mtimeMs) log.warn(`${path.relative(process.cwd(), summaryFile)} is older than the report; make sure it describes this run`);
  return { report, summary: readFileSync(summaryFile, 'utf8') };
}

async function cmdRender(values: Values): Promise<void> {
  const { cfg, outDir } = await context(values);
  const { report, summary } = loadReport(outDir, values.summary);
  const output = path.resolve(process.cwd(), (values.output as string | undefined) ?? path.join(outDir, 'comment.preview.md'));
  const outputDir = path.dirname(output);
  const copy = Boolean(values['copy-images']);
  const toOut = path.relative(outputDir, outDir).split(path.sep).join('/');
  const link = (p: string) => (copy || !toOut ? p : `${toOut}/${p}`);
  const opts = { id: cfg.comment.id, title: cfg.comment.title, summary, storageNote: 'rendered locally — nothing uploaded', showUnchanged: cfg.comment.showUnchanged };
  const body = renderComment(report, { ...opts, link });
  mkdirSync(outputDir, { recursive: true });
  const images = referencedImages(report, opts);
  if (copy) {
    for (const p of images) {
      mkdirSync(path.dirname(path.join(outputDir, p)), { recursive: true });
      copyFileSync(path.join(outDir, p), path.join(outputDir, p));
    }
  }
  writeRedacted(output, body);
  print({ output: path.relative(process.cwd(), output), images: images.length, copied: copy, length: body.length });
}

async function cmdPublish(values: Values): Promise<void> {
  const { root, cfg, outDir } = await context(values);
  const { report, summary } = loadReport(outDir, values.summary);
  const dryRun = Boolean(values['dry-run']);
  const upload = !values['no-upload'] && cfg.publish.mode === 'branch';

  const remoteName = (values.remote as string | undefined) ?? cfg.publish.remote;
  const branch = (values.branch as string | undefined) ?? cfg.publish.branch;
  const { info } = await resolveRemote(root, remoteName);
  const prNumber = values.pr ? Number(values.pr) : dryRun ? undefined : await currentPr(root);
  if (noUiChange(report)) {
    await publishNoUiChange(report, { values, cfg, outDir, info, prNumber, dryRun });
    return;
  }
  const groupDir = `pr-${prNumber ?? 'local'}/${cfg.comment.id}`;
  const runDir = `${groupDir}/${runStamp(report)}-${report.head.shortSha ?? 'preview'}`;
  const linkOverride = (values['link-base'] as string | undefined) ?? cfg.publish.linkBase;
  const linkBase = upload ? (info ? linkBaseFor(info, branch, linkOverride) : linkOverride) : undefined;
  const noLinkProblem = `Cannot derive image links from remote "${remoteName}" (missing or not a GitHub URL)`;
  const noLinkHint = 'Add a GitHub remote, or set publish.linkBase / pass --link-base. `ui-diff render` previews the comment without a remote.';
  if (upload && !linkBase && !dryRun) throw new UiDiffError(noLinkProblem, { hint: noLinkHint });
  const link = (p: string) => (linkBase ? `${linkBase}/${encodePath(`${runDir}/${p}`)}` : p);
  const storageNote = upload ? `images stored on the \`${branch}\` branch of this repository (visible to people with read access)` : 'images not uploaded';
  const renderOpts = { id: cfg.comment.id, title: cfg.comment.title, summary, storageNote, showUnchanged: cfg.comment.showUnchanged, images: upload };
  const uploads = upload ? referencedImages(report, renderOpts) : [];
  const commentFile = path.join(outDir, 'comment.md');
  const guard = upload
    ? uploadGuard(info ? await repoVisibility(info).catch(() => undefined) : undefined, { allowPublic: Boolean(values['allow-public-repo'] || cfg.publish.allowPublicRepo), assumePrivate: Boolean(values['assume-private']) })
    : undefined;

  if (dryRun) {
    const body = renderComment(report, { ...renderOpts, link });
    writeRedacted(commentFile, body);
    const problems = [upload && !linkBase && noLinkProblem, guard && !guard.allowed && guard.reason].filter((p): p is string => Boolean(p));
    for (const problem of problems) log.warn(`a real publish would stop here: ${problem}`);
    print({
      dryRun: true,
      pr: prNumber ?? null,
      publishable: problems.length === 0,
      problems,
      hints: [upload && !linkBase && noLinkHint, guard && !guard.allowed && guard.hint].filter(Boolean),
      visibility: guard ? (guard.visibility ?? 'unknown') : null,
      wouldUpload: uploads.map((p) => ({ file: path.relative(process.cwd(), path.join(outDir, p)), to: `${branch}:${runDir}/${p}` })),
      comment: path.relative(process.cwd(), commentFile),
      length: body.length,
      note: 'Nothing was pushed and no PR was contacted; only the repository visibility was read.',
    });
    return;
  }

  if (guard && !guard.allowed) throw new UiDiffError(guard.reason!, { hint: guard.hint });
  if (guard?.warning) log.warn(guard.warning);

  const repoSlug = (values.repo as string | undefined) ?? (info ? `${info.owner}/${info.repo}` : undefined);
  if (!repoSlug && !values['no-comment']) throw new UiDiffError('Cannot tell which repository the PR belongs to', { hint: 'Pass --repo owner/name.' });
  const client = createGhClient(info?.host);
  const existing = values['no-comment'] ? undefined : await findStickyComment(client, repoSlug!, prNumber!, cfg.comment.id);

  let pushed = false;
  if (upload && uploads.length) {
    log.step(`uploading ${uploads.length} image(s) to ${branch}:${runDir}`);
    const result = await publishToBranch({
      repoRoot: root,
      remote: remoteName,
      branch,
      runDir,
      groupDir,
      keepRuns: cfg.publish.keepRuns,
      files: uploads.map((p) => ({ local: path.join(outDir, p), dest: p })),
      message: `ui-diff: PR #${prNumber} ${report.head.shortSha ?? ''}`.trim(),
    });
    pushed = result.pushed;
  }
  const body = renderComment(report, { ...renderOpts, link, previousBody: existing?.body });
  writeRedacted(commentFile, body);
  if (values['no-comment']) {
    print({ pushed, images: uploads.length, comment: path.relative(process.cwd(), commentFile), posted: false });
    return;
  }
  const { action, comment } = await upsertStickyComment(client, { repo: repoSlug!, pr: prNumber!, body, existing });
  log.info(`comment ${action}${comment.url ? `: ${comment.url}` : ''}`);
  print({ action, url: comment.url, pushed, images: uploads.length, branch: upload ? branch : undefined, runDir: upload ? runDir : undefined });
}

/** No changed UI file: never create a comment; reduce an existing one to a one-line note. Nothing is uploaded. */
async function publishNoUiChange(
  report: Report,
  ctx: { values: Values; cfg: ResolvedConfig; outDir: string; info?: RemoteInfo; prNumber?: number; dryRun: boolean },
): Promise<void> {
  const { values, cfg, outDir, info, prNumber } = ctx;
  const commentFile = path.join(outDir, 'comment.md');
  const rule = 'no UI files changed: no comment is created, and an existing ui-diff comment is reduced to a one-line note';
  if (ctx.dryRun || values['no-comment']) {
    writeRedacted(commentFile, noUiChangeComment(report, cfg.comment));
    log.info(rule);
    print({ dryRun: ctx.dryRun, pr: prNumber ?? null, noUiChange: true, publishable: true, problems: [], wouldUpload: [], comment: path.relative(process.cwd(), commentFile), posted: false, note: rule });
    return;
  }
  const repoSlug = (values.repo as string | undefined) ?? (info ? `${info.owner}/${info.repo}` : undefined);
  if (!repoSlug) throw new UiDiffError('Cannot tell which repository the PR belongs to', { hint: 'Pass --repo owner/name.' });
  const client = createGhClient(info?.host);
  const existing = await findStickyComment(client, repoSlug, prNumber!, cfg.comment.id);
  const decision = publishDecision(report, existing, cfg.comment);
  if (decision.action === 'skip') {
    log.info(`not commenting: ${decision.reason}`);
    print({ action: 'skipped', reason: decision.reason, noUiChange: true, pushed: false, images: 0 });
    return;
  }
  if (decision.action !== 'note') return;
  writeRedacted(commentFile, decision.body);
  const { action, comment } = await upsertStickyComment(client, { repo: repoSlug, pr: prNumber!, body: decision.body, existing });
  log.info(`comment ${action} (no UI files changed)${comment.url ? `: ${comment.url}` : ''}`);
  print({ action, url: comment.url, noUiChange: true, pushed: false, images: 0 });
}

async function cmdPrune(values: Values): Promise<void> {
  const { root, cfg } = await context(values);
  const remoteName = (values.remote as string | undefined) ?? cfg.publish.remote;
  const branch = (values.branch as string | undefined) ?? cfg.publish.branch;
  const present = await listAssetPrs(root, remoteName, branch);
  let selected: number[] = [];
  if (values.pr) selected = (list(values.pr) ?? []).map(Number).filter((n) => present.includes(n));
  else if (values.closed) {
    const { info } = await resolveRemote(root, remoteName);
    const repoSlug = (values.repo as string | undefined) ?? (info ? `${info.owner}/${info.repo}` : undefined);
    if (!repoSlug) throw new UiDiffError('Cannot tell which repository to query', { hint: 'Pass --repo owner/name.' });
    for (const n of present) {
      const state = await prState(n, repoSlug, info?.host);
      if (state && state !== 'open') selected.push(n);
    }
  } else {
    throw new UiDiffError('Nothing to prune', { hint: 'Pass --pr <n> or --closed.' });
  }
  if (values['dry-run'] || selected.length === 0) {
    print({ dryRun: Boolean(values['dry-run']), present, wouldRemove: selected });
    return;
  }
  const result = await pruneBranch({ repoRoot: root, remote: remoteName, branch, prs: selected });
  print({ removedPrs: selected, files: result.removed.length, pushed: result.pushed });
}

/** Package manager of the app, from the nearest lockfile in `dir` or up to `root`. */
export function detectPackageManager(dir: string, root = dir): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    if (existsSync(path.join(d, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(path.join(d, 'yarn.lock'))) return 'yarn';
    if (existsSync(path.join(d, 'bun.lock')) || existsSync(path.join(d, 'bun.lockb'))) return 'bun';
    if (existsSync(path.join(d, 'package-lock.json'))) return 'npm';
    if (d === path.resolve(root) || d === path.dirname(d)) return 'npm';
  }
}

/**
 * Suggests a start command. The project's own `dev` script wins (it carries the right config,
 * env and plugins); `--port {port}` is appended when the framework accepts it.
 */
export function suggestStartCommand(dir: string, root = dir): { startCommand?: string; framework: string } {
  const pkgFile = path.join(dir, 'package.json');
  if (existsSync(pkgFile)) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const framework = deps.next
      ? 'Next.js'
      : deps.nuxt
        ? 'Nuxt'
        : deps.astro
          ? 'Astro'
          : deps['@remix-run/dev'] || deps['@react-router/dev']
            ? 'Remix / React Router'
            : deps['@sveltejs/kit']
              ? 'SvelteKit'
              : deps['@tanstack/react-start'] || deps['@tanstack/solid-start']
                ? 'TanStack Start'
                : deps.vite
                  ? 'Vite'
                  : deps['react-scripts']
                    ? 'Create React App'
                    : undefined;
    const takesPort = Boolean(framework && framework !== 'Create React App');
    const pm = detectPackageManager(dir, root);
    const dev = pkg.scripts?.dev;
    if (dev) {
      const run = pm === 'npm' ? 'npm run dev' : `${pm} run dev`;
      const ownPort = /(?:^|\s)(?:--port|-p)(?:[\s=]|$)/.test(dev);
      if (takesPort && !ownPort) return { startCommand: `${run}${pm === 'npm' ? ' --' : ''} --port {port}`, framework: `${framework} (dev script)` };
      return { startCommand: run, framework: `${framework ?? 'npm script'} (dev script${ownPort ? ' sets its own port; match baseUrl to it' : ' uses PORT'})` };
    }
    if (deps.next) return { startCommand: 'npx next dev --port {port}', framework: 'Next.js' };
    if (deps.nuxt) return { startCommand: 'npx nuxi dev --port {port}', framework: 'Nuxt' };
    if (deps.astro) return { startCommand: 'npx astro dev --port {port}', framework: 'Astro' };
    if (deps['@sveltejs/kit'] || deps.vite) return { startCommand: 'npx vite --port {port} --strictPort', framework: deps['@sveltejs/kit'] ? 'SvelteKit' : 'Vite' };
    if (deps['react-scripts']) return { startCommand: 'npx react-scripts start', framework: 'Create React App (uses PORT)' };
    if (pkg.scripts?.start) return { startCommand: pm === 'npm' ? 'npm start' : `${pm} start`, framework: 'npm script (uses PORT)' };
  }
  if (existsSync(path.join(dir, 'index.html'))) return { startCommand: 'python3 -m http.server {port} --bind 127.0.0.1', framework: 'static HTML' };
  return { framework: 'unknown' };
}

async function cmdInit(values: Values): Promise<void> {
  const root = await repoRoot(process.cwd());
  const file = path.resolve(process.cwd(), (values.config as string | undefined) ?? CONFIG_FILENAME);
  if (existsSync(file) && !values.force) throw new UiDiffError(`${path.relative(process.cwd(), file)} already exists`, { hint: 'Pass --force to overwrite.' });
  const dir = path.dirname(file);
  const { startCommand, framework } = suggestStartCommand(dir, root);
  const dirRel = path.relative(root, dir).split(path.sep).join('/');
  const files = (await git(['ls-files', '-z'], { cwd: root })).split('\0').filter((f) => f && (!dirRel || f.startsWith(`${dirRel}/`)));
  const routes = new Set<string>();
  for (const f of files) {
    const hit = inferFromPath(dirRel ? f.slice(dirRel.length + 1) : f);
    if (hit?.kind === 'page' && !hit.dynamic) routes.add(hit.route);
  }
  const config = {
    startCommand: startCommand ?? 'npm run dev -- --port {port}',
    baseUrl: 'http://localhost:{port}',
    routes: [...routes].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b)).slice(0, 8),
    globalFiles: [],
    viewports: [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    ],
    themes: [{ name: 'light', colorScheme: 'light' }],
    capture: { mask: [] },
    a11y: { enabled: true },
  };
  if (config.routes.length === 0) config.routes = ['/'];
  const tokenFiles = detectTokenFiles(dir, dirRel ? files.map((f) => f.slice(dirRel.length + 1)) : files);
  const written: Record<string, unknown> = tokenFiles.length ? { ...config, tokens: { enabled: true, files: tokenFiles } } : config;
  writeFileSync(file, `${JSON.stringify(written, null, 2)}\n`);
  print({ written: path.relative(process.cwd(), file), framework, startCommand: config.startCommand, routes: config.routes, tokens: tokenFiles.length ? tokenFiles : undefined, next: 'Review startCommand and routes, then run `ui-diff doctor`.' });
}

export interface DoctorCheck {
  check: string;
  ok: boolean;
  detail: string;
  /** Problems the tool fixes on its own (e.g. Chromium is downloaded on first run): WARN, not FAIL. */
  optional?: boolean;
}

export function doctorLine(c: DoctorCheck): string {
  return `${c.ok ? 'ok  ' : c.optional ? 'WARN' : 'FAIL'} ${c.check}: ${c.detail}`;
}

export function doctorOk(checks: DoctorCheck[]): boolean {
  return checks.every((c) => c.ok || c.optional);
}

async function cmdDoctor(values: Values): Promise<void> {
  const checks: DoctorCheck[] = [];
  const add = (check: string, ok: boolean, detail: string, optional = false) => checks.push({ check, ok, detail, ...(optional ? { optional } : {}) });
  const [major, minor] = process.versions.node.split('.').map(Number);
  add('node', major > 20 || (major === 20 && minor >= 10), process.versions.node);
  let root: string | undefined;
  let configChannel: string | undefined;
  try {
    root = await repoRoot(process.cwd());
    add('git repository', true, root);
  } catch (error) {
    add('git repository', false, (error as Error).message);
  }
  if (root) {
    try {
      const cfg = loadConfig(root, process.cwd(), values.config as string | undefined);
      configChannel = cfg.browser.channel;
      add('config', true, cfg.file ? `${path.relative(root, cfg.file)}: ${cfg.routes.length} route(s), ${cfg.viewports.length} viewport(s), ${cfg.themes.length} theme(s)` : 'none found (defaults; run `ui-diff init`)');
      add('start command', Boolean(cfg.startCommand || (cfg.preview.base && cfg.preview.head)), cfg.startCommand ?? (cfg.preview.base ? 'preview URLs' : 'missing: set startCommand or preview URLs'));
      const { url, info } = await resolveRemote(root, cfg.publish.remote);
      add(
        'remote',
        Boolean(info),
        info
          ? `${info.host}/${info.owner}/${info.repo}`
          : url
            ? `remote "${cfg.publish.remote}" is not a GitHub URL; publishing needs publish.linkBase (detect, run and render work)`
            : `no git remote "${cfg.publish.remote}"; publishing needs one (detect, run and render work without it)`,
        true,
      );
      const gh = await exec('gh', ['auth', 'status'], { allowFailure: true }).catch(() => ({ code: 1, stdout: '', stderr: 'gh not installed' }));
      // Only publish and --pr talk to GitHub, so a missing login is a WARN like the remote, not a broken setup.
      const ghProblem = (gh.stderr || gh.stdout).trim().split('\n')[0] || 'not signed in';
      add('gh auth', gh.code === 0, gh.code === 0 ? 'authenticated' : `${ghProblem}; only publish and --pr need it`, true);
      if (info && gh.code === 0) {
        const visibility = await repoVisibility(info);
        add('repo visibility', visibility === 'PRIVATE' || visibility === 'INTERNAL', visibility ?? 'unknown');
      }
    } catch (error) {
      add('config', false, (error as Error).message);
    }
  }
  const choice = resolveBrowser(configChannel);
  const custom = choice.executablePath ? `custom: ${choice.executablePath}` : choice.channel ? `channel: ${choice.channel} (installed browser, nothing to download)` : undefined;
  const installed = existsSync(chromium.executablePath());
  add('browser', Boolean(custom) || installed, custom ?? (installed ? chromium.executablePath() : 'Playwright Chromium not installed yet (downloaded automatically on the first run)'), !custom);
  for (const c of checks) log.info(doctorLine(c));
  print({ ok: doctorOk(checks), checks });
}

function commands(): Record<(typeof COMMANDS)[number], (v: Values) => Promise<void | number>> {
  return { init: cmdInit, doctor: cmdDoctor, detect: cmdDetect, 'cache-key': cmdCacheKey, run: cmdRun, check: cmdCheck, render: cmdRender, publish: cmdPublish, prune: cmdPrune };
}

export const COMMANDS = ['init', 'doctor', 'detect', 'cache-key', 'run', 'check', 'render', 'publish', 'prune'] as const;

export async function main(argv = process.argv.slice(2)): Promise<number> {
  let command = 'help';
  try {
    const parsed = parse(argv);
    command = parsed.command;
    configureLog({ quiet: Boolean(parsed.values.quiet), verbose: Boolean(parsed.values.verbose) });
    if (parsed.values.help || command === 'help') {
      process.stdout.write(HELP);
      return 0;
    }
    if (command === 'version') {
      process.stdout.write(`${VERSION}\n`);
      return 0;
    }
    const fn = (commands() as Record<string, ((v: Values) => Promise<void | number>) | undefined>)[command];
    if (!fn) throw new UiDiffError(`Unknown command "${command}"`, { hint: 'Run `ui-diff help`.' });
    const code = await fn(parsed.values);
    return typeof code === 'number' ? code : 0;
  } catch (error) {
    killAllServers();
    if (error instanceof UiDiffError) {
      log.error(error.message);
      if (error.hint) log.hint(error.hint);
    } else {
      log.error(redact((error as Error).stack ?? String(error)));
    }
    for (const note of notesAfter(error)) log.warn(note);
    // check promises 0/1 for its verdict, so every failure is 2.
    if (command === 'check') return CHECK_EXIT.error;
    return error instanceof UiDiffError ? error.exitCode : 1;
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]).replace(/\.ts$/, '.js') === fileURLToPath(import.meta.url).replace(/\.ts$/, '.js');
if (invokedDirectly) {
  main().then((code) => process.exit(code));
}
