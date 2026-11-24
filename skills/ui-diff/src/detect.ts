import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolveRoute, type ResolvedConfig, type ResolvedRoute } from './config.js';
import { inferFromPath, routeUnder } from './conventions.js';
import { describeDependency, diffDependencies, isDependencyFile, type DependencyChange, type DependencyDiff } from './deps.js';
import { changedFiles, defaultBaseRef, git, lsTree, mergeBase, readBlobs, revParse, type ChangedFile } from './git.js';
import { firstMatch, matchAny } from './glob.js';
import { addAssetMentions, aliasesFromPackageImports, aliasesFromTsconfig, buildReverseGraph, findEntries, isAssetFile, isSourceFile, parseJsonc, tsconfigLinks, type ResolveContext } from './imports.js';
import { log, UiDiffError } from './log.js';

export type Confidence = 'high' | 'medium' | 'low';

export interface RouteHit {
  route: ResolvedRoute;
  confidence: Confidence;
  reasons: string[];
  /** Changed files that affect this route (empty when only a dependency change does). */
  files: string[];
}

export interface MappingResult {
  uiFiles: string[];
  /** Dependency changes in the app's package.json and lockfiles; `ui` ones made every route (or detect.dependencyRoutes) affected. */
  dependencies: DependencyChange[];
  /** Changed lockfiles whose packages could not be compared. */
  unparsedLockfiles: string[];
  routes: RouteHit[];
  skippedRoutes: RouteHit[];
  unmatched: string[];
  needsExample: Array<{ file: string; route: string }>;
  globalFiles: string[];
  notes: string[];
}

export interface DetectResult extends MappingResult {
  base: { ref: string; sha: string };
  head: { ref: string; sha?: string; workingTree: boolean };
  mergeBase: string;
  changedFiles: ChangedFile[];
}

export interface MappingInput {
  cfg: ResolvedConfig;
  changed: ChangedFile[];
  headFiles: string[];
  readFiles: (paths: string[]) => Promise<Map<string, string>>;
  dependencies?: DependencyDiff;
}

const RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
const MAX_GRAPH_FILES = 12000;

export async function mapChangesToRoutes(input: MappingInput): Promise<MappingResult> {
  const { cfg, changed, headFiles } = input;
  const dirRel = cfg.dirRel;
  const inApp = (f: string) => !dirRel || f.startsWith(`${dirRel}/`);
  const appRel = (f: string) => (dirRel ? f.slice(dirRel.length + 1) : f);
  const configuredByPath = new Map(cfg.routes.map((r) => [r.path, r]));
  const adHoc = new Map<string, ResolvedRoute>();
  const routeFor = (routePath: string): ResolvedRoute => {
    const configured = configuredByPath.get(routePath);
    if (configured) return configured;
    let route = adHoc.get(routePath);
    if (!route) adHoc.set(routePath, (route = resolveRoute(routePath, dirRel, false)));
    return route;
  };

  const hits = new Map<string, RouteHit>();
  const linked = new Set<string>();
  const addHit = (route: ResolvedRoute, reason: string, confidence: Confidence, file?: string) => {
    if (file) {
      const key = `${file}\0${route.path}`;
      if (linked.has(key)) return;
      linked.add(key);
    }
    const existing = hits.get(route.path);
    if (existing) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      if (RANK[confidence] < RANK[existing.confidence]) existing.confidence = confidence;
      if (file && !existing.files.includes(file)) existing.files.push(file);
    } else {
      hits.set(route.path, { route, confidence, reasons: [reason], files: file ? [file] : [] });
    }
  };

  const notes: string[] = [];
  const uiFiles = changed
    .filter((f) => matchAny(f.path, cfg.detect.include) && !matchAny(f.path, cfg.detect.exclude))
    .map((f) => f.path);
  const deleted = new Set(changed.filter((f) => f.status === 'D').map((f) => f.path));

  const globalChanged: string[] = [];
  const layoutChanged: Array<{ file: string; scope: string }> = [];
  const needsExample: Array<{ file: string; route: string }> = [];
  const toTrace: string[] = [];
  const matchedFiles = new Set<string>();

  for (const file of uiFiles) {
    for (const route of cfg.routes) {
      const glob = firstMatch(file, route.files);
      if (glob) {
        addHit(route, `${file} matches ${glob.replace(/^\//, '')}`, 'high', file);
        matchedFiles.add(file);
      }
    }
    if (matchAny(file, cfg.globalFiles)) {
      globalChanged.push(file);
      matchedFiles.add(file);
      continue;
    }
    const hit = cfg.detect.conventions && inApp(file) ? inferFromPath(appRel(file)) : undefined;
    if (hit?.kind === 'page') {
      matchedFiles.add(file);
      if (hit.dynamic) needsExample.push({ file, route: hit.route });
      else addHit(routeFor(hit.route), `${file} is the ${hit.framework} page for ${hit.route}`, 'high', file);
      continue;
    }
    if (hit?.kind === 'layout') {
      layoutChanged.push({ file, scope: hit.route });
      matchedFiles.add(file);
      continue;
    }
    if (hit?.kind === 'global') {
      globalChanged.push(file);
      matchedFiles.add(file);
      continue;
    }
    if (!deleted.has(file)) toTrace.push(file);
  }

  // Entry files: configured route files and convention pages present at head.
  const entries = new Map<string, ResolvedRoute[]>();
  const conventionRoutes = new Set<string>();
  for (const file of headFiles) {
    const routes: ResolvedRoute[] = [];
    for (const route of cfg.routes) if (route.files.length && matchAny(file, route.files)) routes.push(route);
    if (cfg.detect.conventions && inApp(file)) {
      const hit = inferFromPath(appRel(file));
      if (hit?.kind === 'page' && !hit.dynamic) {
        conventionRoutes.add(hit.route);
        if (!routes.some((r) => r.path === hit.route)) routes.push(routeFor(hit.route));
      }
    }
    if (routes.length) entries.set(file, routes);
  }

  const knownRoutes = (): ResolvedRoute[] => {
    const all = new Map<string, ResolvedRoute>();
    for (const r of cfg.routes) all.set(r.path, r);
    for (const p of [...conventionRoutes].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))) {
      if (!all.has(p)) all.set(p, routeFor(p));
    }
    if (all.size === 0) all.set('/', routeFor('/'));
    return [...all.values()];
  };

  // Layouts and app-wide files are entries too: a component imported only by app/layout.tsx,
  // __root.tsx or pages/_app.tsx affects every route they wrap.
  if (cfg.detect.conventions) {
    for (const file of headFiles) {
      if (!inApp(file)) continue;
      const hit = inferFromPath(appRel(file));
      if (hit?.kind !== 'layout' && hit?.kind !== 'global') continue;
      const routes = entries.get(file) ?? [];
      for (const route of knownRoutes()) {
        if ((hit.kind === 'global' || routeUnder(route.path, hit.route)) && !routes.some((r) => r.path === route.path)) routes.push(route);
      }
      if (routes.length) entries.set(file, routes);
    }
  }

  if (cfg.detect.imports && toTrace.length > 0 && entries.size > 0) {
    const extraRoots = new Set<string>();
    for (const file of toTrace) {
      if (!inApp(file)) extraRoots.add(file.split('/').slice(0, 2).join('/') + '/');
    }
    const aliasTargets = Object.values(cfg.detect.aliases).map((t) => path.posix.normalize(path.posix.join(dirRel || '.', t)));
    const inUniverse = (f: string) =>
      inApp(f) || [...extraRoots].some((r) => f.startsWith(r)) || aliasTargets.some((t) => f.startsWith(t.replace(/\/?$/, '/')));
    let universe = headFiles.filter((f) => isSourceFile(f) && !matchAny(f, ['**/node_modules/**']) && inUniverse(f));
    if (universe.length > MAX_GRAPH_FILES) {
      notes.push(`Import graph limited to ${MAX_GRAPH_FILES} of ${universe.length} source files.`);
      universe = universe.slice(0, MAX_GRAPH_FILES);
    }
    const packageJsons = headFiles.filter((f) => f.endsWith('package.json') && !f.includes('node_modules/')).slice(0, 300);
    const contents = await input.readFiles([...universe, ...packageJsons]);

    const aliases: Record<string, string> = {};
    const appPackageJson = contents.get(dirRel ? `${dirRel}/package.json` : 'package.json');
    if (appPackageJson) Object.assign(aliases, aliasesFromPackageImports(appPackageJson, dirRel));
    Object.assign(aliases, await tsconfigAliases(input.readFiles, dirRel));
    for (const [key, target] of Object.entries(cfg.detect.aliases)) {
      aliases[key] = path.posix.normalize(path.posix.join(dirRel || '.', target)) + (target.endsWith('/') ? '/' : '');
    }
    const packages: Record<string, string> = {};
    for (const pj of packageJsons) {
      try {
        const name = (JSON.parse(contents.get(pj) ?? '{}') as { name?: string }).name;
        const dir = path.posix.dirname(pj);
        if (name && dir !== '.') packages[name] = dir;
      } catch {
        // ignore unparsable package.json
      }
    }
    const webRoots = [dirRel, dirRel ? `${dirRel}/public` : 'public', dirRel ? `${dirRel}/static` : 'static'];
    const ctx: ResolveContext = { files: new Set(headFiles), aliases, packages, webRoots };
    const universeSet = new Set(universe);
    const sources = new Map([...contents].filter(([f]) => universeSet.has(f)));
    const reverse = buildReverseGraph(sources, ctx);
    addAssetMentions(
      reverse,
      sources,
      toTrace.filter((f) => isAssetFile(f)),
    );

    for (const file of toTrace) {
      const found = findEntries(file, reverse, (f) => entries.has(f));
      if (found.size === 0) continue;
      matchedFiles.add(file);
      for (const [entry, chain] of found) {
        for (const route of entries.get(entry) ?? []) {
          const via = `${chain[0]} → ${chain.length > 2 ? '… → ' : ''}${entry}`;
          addHit(route, `imported: ${via}`, 'medium', file);
        }
      }
    }
  }

  for (const { file, scope } of layoutChanged) {
    for (const route of knownRoutes().filter((r) => routeUnder(r.path, scope))) {
      addHit(route, `layout ${file} wraps ${scope === '/' ? 'every route' : `${scope}/*`}`, 'medium', file);
    }
  }
  for (const file of globalChanged) {
    for (const route of knownRoutes()) addHit(route, `app-wide file ${file} changed`, 'medium', file);
  }
  const uiDeps = (input.dependencies?.changes ?? []).filter((d) => d.ui);
  if (uiDeps.length) {
    const listed = uiDeps.slice(0, 3).map(describeDependency).join(', ') + (uiDeps.length > 3 ? `, +${uiDeps.length - 3} more` : '');
    const targets = cfg.detect.dependencyRoutes ? cfg.detect.dependencyRoutes.map(routeFor) : knownRoutes();
    for (const route of targets) addHit(route, `UI dependency changed: ${listed}`, 'medium');
  }

  const unmatched = uiFiles.filter((f) => !matchedFiles.has(f) && !deleted.has(f));
  const sorted = [...hits.values()].sort(
    (a, b) =>
      RANK[a.confidence] - RANK[b.confidence] ||
      Number(b.route.configured) - Number(a.route.configured) ||
      a.route.path.localeCompare(b.route.path),
  );
  const max = cfg.detect.maxRoutes;
  if (sorted.length > max) notes.push(`${sorted.length - max} affected route(s) beyond detect.maxRoutes=${max} were not captured.`);
  return {
    uiFiles,
    dependencies: input.dependencies?.changes ?? [],
    unparsedLockfiles: input.dependencies?.unparsed ?? [],
    routes: sorted.slice(0, max),
    skippedRoutes: sorted.slice(max),
    unmatched,
    needsExample,
    globalFiles: globalChanged,
    notes,
  };
}

/**
 * Aliases from tsconfig.json / jsconfig.json in the app directory and every config they reference
 * or extend (e.g. Vite's tsconfig.app.json). Configs closer to the app directory win.
 */
export async function tsconfigAliases(readFiles: (paths: string[]) => Promise<Map<string, string>>, dirRel: string): Promise<Record<string, string>> {
  const aliases: Record<string, string> = {};
  const seen = new Set<string>();
  let queue = ['tsconfig.json', 'jsconfig.json'].map((f) => (dirRel ? `${dirRel}/${f}` : f));
  for (let depth = 0; depth < 6 && queue.length > 0; depth++) {
    const batch = queue.filter((f) => !seen.has(f));
    for (const f of batch) seen.add(f);
    queue = [];
    const contents = await readFiles(batch);
    for (const file of batch) {
      const text = contents.get(file);
      if (!text) continue;
      const parsed = parseJsonc(text);
      if (!parsed || typeof parsed !== 'object') continue;
      for (const [key, target] of Object.entries(aliasesFromTsconfig(parsed, path.posix.dirname(file)))) {
        if (!(key in aliases)) aliases[key] = target;
      }
      queue.push(...tsconfigLinks(parsed, file));
    }
  }
  return aliases;
}

async function workingTreeFiles(repo: string): Promise<string[]> {
  const out = await git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: repo });
  return [...new Set(out.split('\0').filter(Boolean))];
}

async function readFromDisk(repo: string, paths: string[], maxBytes = 512 * 1024): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  await Promise.all(
    paths.map(async (p) => {
      try {
        const text = await readFile(path.join(repo, p), 'utf8');
        if (text.length <= maxBytes) result.set(p, text);
      } catch {
        // deleted or unreadable
      }
    }),
  );
  return result;
}

export async function resolveBaseRef(repo: string, base: string | undefined): Promise<string> {
  if (base) return base;
  const fallback = await defaultBaseRef(repo);
  if (!fallback) throw new UiDiffError('Could not determine the base branch', { hint: 'Pass --base <ref> (e.g. origin/main) or --pr <number>.' });
  return fallback;
}

/** package.json files and lockfiles in the app's directory or above it (a monorepo root's). */
function governsApp(file: string, dirRel: string): boolean {
  const dir = path.posix.dirname(file);
  return dir === '.' || dir === dirRel || dirRel.startsWith(`${dir}/`);
}

/** Lockfiles are far larger than source files, so they are read without the usual size cap. */
const DEPENDENCY_FILE_MAX_BYTES = 64 * 1024 * 1024;

async function changedDependencies(cfg: ResolvedConfig, changed: ChangedFile[], refs: { base: string; head?: string }): Promise<DependencyDiff> {
  const files = changed.filter((f) => f.status !== 'R' && isDependencyFile(f.path) && governsApp(f.path, cfg.dirRel)).map((f) => f.path);
  if (files.length === 0) return { changes: [], unparsed: [] };
  const repo = cfg.repoRoot;
  const base = await readBlobs(refs.base, files, repo, DEPENDENCY_FILE_MAX_BYTES);
  const head = refs.head ? await readBlobs(refs.head, files, repo, DEPENDENCY_FILE_MAX_BYTES) : await readFromDisk(repo, files, DEPENDENCY_FILE_MAX_BYTES);
  return diffDependencies(
    files.map((file) => ({ file, base: base.get(file), head: head.get(file) })),
    cfg.detect.uiPackages,
  );
}

export async function detectChanges(cfg: ResolvedConfig, opts: { base?: string; head?: string }): Promise<DetectResult> {
  const repo = cfg.repoRoot;
  const baseRef = await resolveBaseRef(repo, opts.base);
  const baseSha = await revParse(baseRef, repo);
  const headSha = opts.head ? await revParse(opts.head, repo) : undefined;
  const mb = await mergeBase(baseSha, headSha ?? 'HEAD', repo);
  const changed = await changedFiles(headSha ? baseSha : mb, headSha, repo);
  const headFiles = headSha ? await lsTree(headSha, repo) : await workingTreeFiles(repo);
  const readFiles = headSha ? (paths: string[]) => readBlobs(headSha, paths, repo) : (paths: string[]) => readFromDisk(repo, paths);
  log.debug(`changed files: ${changed.length}, files at head: ${headFiles.length}`);
  const dependencies = await changedDependencies(cfg, changed, { base: mb, head: headSha });
  const mapping = await mapChangesToRoutes({ cfg, changed, headFiles, readFiles, dependencies });
  return {
    ...mapping,
    base: { ref: baseRef, sha: baseSha },
    head: { ref: opts.head ?? 'working tree', sha: headSha, workingTree: !headSha },
    mergeBase: mb,
    changedFiles: changed,
  };
}

/**
 * What a run would do with this change: capture routes, report UI files it could not map
 * ("nothing checked"), or nothing at all. CI preflight jobs branch on it.
 */
export type DetectStatus = 'capture' | 'nothing-mapped' | 'no-ui-changes';

export function detectStatus(result: Pick<MappingResult, 'routes' | 'uiFiles'>): DetectStatus {
  if (result.routes.length) return 'capture';
  if (result.uiFiles.length) return 'nothing-mapped';
  return 'no-ui-changes';
}

export function detectSummary(result: DetectResult): Record<string, unknown> {
  return {
    status: detectStatus(result),
    base: result.base,
    head: result.head,
    mergeBase: result.mergeBase,
    changedFiles: result.changedFiles.length,
    uiFiles: result.uiFiles,
    dependencies: result.dependencies,
    unparsedLockfiles: result.unparsedLockfiles,
    routes: result.routes.map((h) => ({ path: h.route.path, name: h.route.name, configured: h.route.configured, confidence: h.confidence, reasons: h.reasons })),
    skippedRoutes: result.skippedRoutes.map((h) => h.route.path),
    unmatched: result.unmatched,
    needsExample: result.needsExample,
    globalFiles: result.globalFiles,
    notes: result.notes,
  };
}
