// Resolve workspace-package imports to actual source files. Sub-agents need this when the route file is a thin shell that re-exports from a workspace package.
//
// Bounded expansion keeps the brief allowlist small: package export resolution, pure-barrel
// traversal, and suffix fan-out for likely data-loading modules. This stays string-based
// and falls through ("couldn't resolve") on shapes that need a full TS resolver.

import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve as pathResolve } from 'node:path';

const DEFAULT_RESOLVE_OPTIONS = {
  pureBarrelDepth: 3,
  suffixFanoutDepth: 2,
  perSpecifierCap: 3,
};
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mjs'];
const SUFFIX_FANOUT_RE = /(^|\/)(content|data|loader|fetch|service|metadata|actions)\.tsx?$/;
const EXPORT_FORWARD_RE = /export\s+(?:type\s+)?(?:\*|\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\})\s+from\s+['"][^'"\n]+['"]\s*;?/gs;

export async function detectMonorepoRoot(startDir) {
  let dir = pathResolve(startDir);
  for (let depth = 0; depth < 15; depth++) {
    if (await fileExists(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const pkg = await tryReadJson(join(dir, 'package.json'));
    if (pkg && (Array.isArray(pkg.workspaces) || Array.isArray(pkg.workspaces?.packages))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

// Zero-dependency — pnpm-workspace.yaml shape is predictable; not pulling in js-yaml.
export async function readWorkspaceGlobs(monorepoRoot) {
  const pnpmPath = join(monorepoRoot, 'pnpm-workspace.yaml');
  if (await fileExists(pnpmPath)) {
    const text = await readFile(pnpmPath, 'utf-8');
    return parsePnpmWorkspaceYaml(text);
  }
  const pkg = await tryReadJson(join(monorepoRoot, 'package.json'));
  if (Array.isArray(pkg?.workspaces)) return pkg.workspaces;
  if (Array.isArray(pkg?.workspaces?.packages)) return pkg.workspaces.packages;
  return [];
}

// Handles `packages:` block with `- glob` entries. Not full YAML grammar.
export function parsePnpmWorkspaceYaml(text) {
  const out = [];
  let inPackages = false;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    if (/^packages\s*:/.test(line)) { inPackages = true; continue; }
    if (!inPackages) continue;
    if (!/^\s/.test(line)) { inPackages = false; continue; }
    const m = line.match(/^\s*-\s+['"]?([^'"\s]+)['"]?\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
}

export async function listWorkspacePackages(monorepoRoot) {
  const globs = await readWorkspaceGlobs(monorepoRoot);
  const dirs = new Set();
  for (const g of globs) {
    const expanded = await expandWorkspaceGlob(monorepoRoot, g);
    for (const d of expanded) dirs.add(d);
  }
  const out = [];
  for (const dir of dirs) {
    const pkg = await tryReadJson(join(dir, 'package.json'));
    if (pkg?.name) out.push({ name: pkg.name, dir, pkg });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// Handles workspace-shape globs only. `**` collapses to one level — npm/pnpm don't document deep `**`.
async function expandWorkspaceGlob(root, glob) {
  const parts = glob.replace(/\\/g, '/').split('/');
  return await expandParts(root, parts);
}

async function expandParts(currentDir, parts) {
  if (parts.length === 0) return [currentDir];
  const [head, ...rest] = parts;
  if (head === '' || head === '.') return await expandParts(currentDir, rest);
  if (head === '*' || head === '**') {
    let entries = [];
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch { return []; }
    const childDirs = entries.filter((e) => e.isDirectory()).map((e) => join(currentDir, e.name));
    const out = [];
    for (const d of childDirs) {
      const more = await expandParts(d, rest);
      out.push(...more);
    }
    return out;
  }
  const next = join(currentDir, head);
  try {
    const s = await stat(next);
    if (!s.isDirectory()) return [];
  } catch {
    return [];
  }
  return await expandParts(next, rest);
}

export function buildResolver(packages) {
  const byName = new Map();
  for (const p of packages) {
    byName.set(p.name, buildPackageLookup(p));
  }
  return function resolveSpecifier(specifier) {
    if (typeof specifier !== 'string' || !specifier.length) return null;
    // Longest-name match first so `@vercel/foo-bar` wins over `@vercel/foo`.
    const candidates = [...byName.keys()]
      .filter((name) => specifier === name || specifier.startsWith(name + '/'))
      .sort((a, b) => b.length - a.length);
    if (candidates.length === 0) return null;
    const pkgName = candidates[0];
    const subpath = specifier === pkgName ? '.' : './' + specifier.slice(pkgName.length + 1);
    const lookup = byName.get(pkgName);
    return lookup.resolveSubpath(subpath);
  };
}

// Node spec: pattern key has exactly one `*`; target may have one or zero.
function buildPackageLookup(p) {
  const exact = new Map();
  const wildcards = [];
  const exports = p.pkg.exports;
  if (exports && typeof exports === 'object' && !Array.isArray(exports)) {
    for (const [key, value] of Object.entries(exports)) {
      const target = pickConditionalTarget(value);
      if (typeof target !== 'string') continue;
      if (key.includes('*')) {
        const keyStarIdx = key.indexOf('*');
        if (keyStarIdx !== key.lastIndexOf('*')) continue;
        wildcards.push({
          keyPrefix: key.slice(0, keyStarIdx),
          keySuffix: key.slice(keyStarIdx + 1),
          valueTemplate: target,
        });
      } else {
        exact.set(key, target);
      }
    }
  }
  return {
    resolveSubpath(subpath) {
      const exactHit = exact.get(subpath);
      if (exactHit) return joinPackagePath(p.dir, exactHit);
      for (const w of wildcards) {
        if (subpath.startsWith(w.keyPrefix) && subpath.endsWith(w.keySuffix)) {
          const star = subpath.slice(w.keyPrefix.length, subpath.length - w.keySuffix.length);
          if (!star) continue;
          const target = w.valueTemplate.replace('*', star);
          return joinPackagePath(p.dir, target);
        }
      }
      // Unsafe to guess when no exports declared.
      if (exact.size === 0 && wildcards.length === 0 && subpath !== '.') {
        return null;
      }
      return null;
    },
  };
}

// Condition order matches what Next.js / Vite / esbuild would resolve.
function pickConditionalTarget(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const target = pickConditionalTarget(item);
      if (typeof target === 'string') return target;
    }
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  for (const cond of ['default', 'import', 'node', 'browser', 'require', 'types']) {
    const v = value[cond];
    if (typeof v === 'string') return v;
  }
  return null;
}

export async function resolveWorkspaceImports(sourceFilePath, resolver, options = {}) {
  let text;
  try {
    text = await readFile(sourceFilePath, 'utf-8');
  } catch {
    return [];
  }
  const opts = { ...DEFAULT_RESOLVE_OPTIONS, ...options };
  const refs = extractModuleReferences(text);
  const out = [];
  const seen = new Set();
  for (const ref of refs) {
    const resolved = await resolveModuleSpecifier(sourceFilePath, ref.specifier, resolver);
    if (!resolved) continue;
    const expanded = await expandResolvedSpecifier(resolved, ref.importedNames, resolver, opts);
    for (const file of expanded) {
      if (seen.has(file)) continue;
      seen.add(file);
      out.push(file);
    }
  }
  return out;
}

// Skips CommonJS `require('foo')` and template-literal dynamic imports (statically unresolvable).
export function extractImportSpecifiers(text) {
  return [...new Set(extractModuleReferences(text).map((ref) => ref.specifier))];
}

function joinPackagePath(packageDir, relativeTarget) {
  return join(packageDir, relativeTarget.replace(/^\.\//, ''));
}

async function expandResolvedSpecifier(startFile, importedNames, resolver, opts) {
  const out = [];
  const seen = new Set();
  const barrelVisited = new Set();
  const fanoutVisited = new Set();

  const add = (file) => {
    if (seen.has(file)) return false;
    if (out.length > 0 && out.length - 1 >= opts.perSpecifierCap) return false;
    seen.add(file);
    out.push(file);
    return true;
  };

  add(startFile);
  await expandPureBarrel(startFile, importedNames, 0);
  const fanoutSeeds = out.slice();
  for (const file of fanoutSeeds) {
    await expandSuffixFanout(file, 0);
  }
  return out;

  async function expandPureBarrel(file, requestedNames, depth) {
    if (depth >= opts.pureBarrelDepth) return;
    if (barrelVisited.has(file)) return;
    barrelVisited.add(file);
    const text = await tryReadText(file);
    if (text == null || !isPureBarrel(text)) return;
    const refs = await selectRelevantForwards(file, extractExportForwardRefs(text), requestedNames, resolver);
    for (const { ref, next } of refs) {
      if (!add(next)) return;
      await expandPureBarrel(next, requestedNamesForForward(ref, requestedNames), depth + 1);
    }
  }

  async function expandSuffixFanout(file, depth) {
    if (depth >= opts.suffixFanoutDepth) return;
    if (!isSuffixFanoutFile(file)) return;
    const visitKey = `${file}:${depth}`;
    if (fanoutVisited.has(visitKey)) return;
    fanoutVisited.add(visitKey);
    const text = await tryReadText(file);
    if (text == null) return;
    for (const ref of extractModuleReferences(text)) {
      const next = await resolveModuleSpecifier(file, ref.specifier, resolver);
      if (!next) continue;
      if (!add(next)) return;
      if (isSuffixFanoutFile(next)) await expandSuffixFanout(next, depth + 1);
    }
  }
}

async function selectRelevantForwards(fromFile, refs, requestedNames, resolver) {
  const resolved = [];
  for (const [index, ref] of refs.entries()) {
    const next = await resolveModuleSpecifier(fromFile, ref.specifier, resolver);
    if (!next) continue;
    let score = requestedNames && requestedNames.size > 0
      ? forwardRelevanceScore(ref, requestedNames, refs.length)
      : 1;
    if (requestedNames && requestedNames.size > 0 && await fileExportsAnyName(next, requestedNames)) {
      score = Math.max(score, 75);
    }
    resolved.push({ ref, next, index, score });
  }
  if (!requestedNames || requestedNames.size === 0) return resolved;
  const ranked = resolved
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.length > 0 ? ranked : resolved;
}

function forwardRelevanceScore(ref, requestedNames, siblingCount) {
  if (!requestedNames || requestedNames.size === 0) return 1;
  if (ref.exportedNames) {
    for (const name of requestedNames) {
      if (ref.exportedNames.has(name)) return 100;
    }
  }
  if (specifierMatchesNames(ref.specifier, requestedNames)) return 50;
  return siblingCount === 1 ? 1 : 0;
}

function requestedNamesForForward(ref, requestedNames) {
  if (!requestedNames || requestedNames.size === 0) return null;
  if (ref.star) return requestedNames;
  const out = new Set();
  for (const name of requestedNames) {
    const source = ref.sourceNamesByExported?.get(name);
    if (source) out.add(source);
  }
  return out.size > 0 ? out : requestedNames;
}

async function resolveModuleSpecifier(fromFile, specifier, resolver) {
  const raw = specifier.startsWith('.')
    ? join(dirname(fromFile), specifier)
    : resolver(specifier);
  if (!raw) return null;
  return await resolveExistingPath(raw);
}

async function resolveExistingPath(basePath) {
  for (const ext of EXTENSIONS) {
    const candidate = ext === '' ? basePath : basePath + ext;
    if (!isSourcePath(candidate)) continue;
    if (await isFile(candidate)) return candidate;
  }
  for (const indexFile of INDEX_FILES) {
    const candidate = join(basePath, indexFile);
    if (await isFile(candidate)) return candidate;
  }
  return null;
}

function extractModuleReferences(text) {
  return [
    ...extractImportReferences(text),
    ...extractExportForwardRefs(text).map((ref) => ({
      specifier: ref.specifier,
      importedNames: ref.star ? null : ref.exportedNames,
    })),
    ...extractDynamicImportReferences(text),
  ];
}

function extractImportReferences(text) {
  const out = [];
  const fromRe = /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+['"]([^'"\n]+)['"]/g;
  let m;
  while ((m = fromRe.exec(text)) !== null) {
    out.push({ specifier: m[2], importedNames: parseImportNames(m[1]) });
  }
  const sideEffectRe = /import\s+['"]([^'"\n]+)['"]/g;
  while ((m = sideEffectRe.exec(text)) !== null) {
    out.push({ specifier: m[1], importedNames: null });
  }
  return out;
}

function extractDynamicImportReferences(text) {
  const out = [];
  const re = /import\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ specifier: m[1], importedNames: null });
  }
  return out;
}

function extractExportForwardRefs(text) {
  const out = [];
  const re = /export\s+(?:type\s+)?(\*|\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\})\s+from\s+['"]([^'"\n]+)['"]\s*;?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const clause = m[1].trim();
    const star = clause.startsWith('*');
    const names = star ? null : parseExportNames(clause);
    out.push({
      specifier: m[2],
      star,
      exportedNames: names?.exportedNames ?? null,
      sourceNamesByExported: names?.sourceNamesByExported ?? null,
    });
  }
  return out;
}

function parseImportNames(clause) {
  const names = new Set();
  const trimmed = clause.trim();
  if (!trimmed) return null;
  const named = /\{([^}]+)\}/s.exec(trimmed);
  if (named) {
    for (const part of splitImportList(named[1])) {
      const cleaned = part.replace(/^type\s+/, '').trim();
      if (!cleaned) continue;
      const [source] = cleaned.split(/\s+as\s+/i);
      if (source?.trim()) names.add(source.trim());
    }
  }
  const withoutNamed = trimmed.replace(/\{[^}]*\}/s, '').replace(/,\s*$/, '').trim();
  if (withoutNamed && !withoutNamed.startsWith('*')) names.add('default');
  return names.size > 0 ? names : null;
}

function parseExportNames(clause) {
  const body = clause.replace(/^\{|\}$/g, '');
  const exportedNames = new Set();
  const sourceNamesByExported = new Map();
  for (const part of splitImportList(body)) {
    const cleaned = part.replace(/^type\s+/, '').trim();
    if (!cleaned) continue;
    const [sourceRaw, exportedRaw] = cleaned.split(/\s+as\s+/i);
    const source = sourceRaw.trim();
    const exported = (exportedRaw ?? sourceRaw).trim();
    if (!source || !exported) continue;
    exportedNames.add(exported);
    sourceNamesByExported.set(exported, source);
  }
  return { exportedNames, sourceNamesByExported };
}

function splitImportList(value) {
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

function isPureBarrel(text) {
  const refs = extractExportForwardRefs(text);
  if (refs.length === 0) return false;
  const withoutComments = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  return withoutComments.replace(EXPORT_FORWARD_RE, '').trim() === '';
}

function specifierMatchesNames(specifier, names) {
  const normalizedSpecifier = normalizeName(specifier.split('/').at(-1) ?? specifier);
  for (const name of names) {
    const normalizedName = normalizeName(name);
    if (normalizedSpecifier === normalizedName || normalizedSpecifier.endsWith(normalizedName)) {
      return true;
    }
  }
  return false;
}

function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSuffixFanoutFile(file) {
  return SUFFIX_FANOUT_RE.test(file.replace(/\\/g, '/'));
}

async function fileExportsAnyName(file, names) {
  const text = await tryReadText(file);
  if (text == null) return false;
  for (const name of names) {
    if (textExportsName(text, name)) return true;
  }
  return false;
}

function textExportsName(text, name) {
  const escaped = escapeRegExp(name);
  const declaration = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class|interface|type)\\s+${escaped}\\b`);
  if (declaration.test(text)) return true;
  const listRe = /export\s+\{([^}]+)\}(?!\s+from\b)/gs;
  let m;
  while ((m = listRe.exec(text)) !== null) {
    const names = parseExportNames(`{${m[1]}}`).exportedNames;
    if (names.has(name)) return true;
  }
  return false;
}

function isSourcePath(path) {
  const match = /\.([A-Za-z0-9]+)$/.exec(path);
  if (!match) return true;
  return SOURCE_EXTENSIONS.has('.' + match[1]);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function tryReadText(path) {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

async function fileExists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function isFile(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

async function tryReadJson(path) {
  try {
    const text = await readFile(path, 'utf-8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}
