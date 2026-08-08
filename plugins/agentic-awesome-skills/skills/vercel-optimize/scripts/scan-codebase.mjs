#!/usr/bin/env node
// Walks the repo, runs every scanner in lib/scanners/, emits findings + routes
// + stack as JSON. Output is merged into signals.codebase.*. New scanners drop
// into lib/scanners/ + the barrel; this file is closed for modification.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { scanners } from '../lib/scanners/index.mjs';
import { detectStack } from '../lib/vercel.mjs';
import {
  detectMonorepoRoot,
  listWorkspacePackages,
  buildResolver,
  resolveWorkspaceImports,
} from '../lib/workspace-resolver.mjs';

const SCHEMA_VERSION = '1.0';
const SKIP_DIRS = new Set(['node_modules', '.next', '.vercel', 'dist', 'build', '.git', 'coverage', '.turbo', '__tests__', 'cypress']);
const SKIP_FILE_PATTERNS = [/\.test\./, /\.spec\./, /\.d\.ts$/];

async function main() {
  const rootDir = process.argv[2] || process.cwd();
  process.stderr.write(`[scan-codebase] scanning ${rootDir}\n`);

  const [stack, files, routes] = await Promise.all([
    detectStack(rootDir),
    collectFiles(rootDir),
    enumerateRoutes(rootDir),
  ]);

  // In a monorepo, route files often re-export from workspace packages. Without
  // resolving those, sub-agents abstain because the workspace path is outside
  // their read scope.
  const monorepoRoot = await detectMonorepoRoot(rootDir);
  let workspacePackages = [];
  let resolver = () => null;
  if (monorepoRoot) {
    workspacePackages = await listWorkspacePackages(monorepoRoot);
    resolver = buildResolver(workspacePackages);
    process.stderr.write(`[scan-codebase] monorepo root: ${monorepoRoot} (${workspacePackages.length} workspace packages)\n`);
  }
  await enrichRoutesWithWorkspaceImports(routes, rootDir, resolver, monorepoRoot);

  process.stderr.write(`[scan-codebase] ${files.length} files, ${routes.length} routes, ${scanners.length} scanners\n`);

  const findings = [];
  for (const scanner of scanners) {
    try {
      const applicable = filterApplicable(files, scanner.metadata);
      // Scanners may be sync or async (large-static-asset does fs.stat walks).
      const found = await scanner.scan({ files: applicable, rootDir, routes, stack });
      for (const f of (found ?? [])) {
        findings.push({
          ...f,
          route: mapFileToRoute(f.file, routes),
        });
      }
    } catch (err) {
      process.stderr.write(`[scan-codebase] scanner ${scanner.metadata?.id} threw: ${err.message}\n`);
    }
  }

  findings.sort((a, b) =>
    a.file.localeCompare(b.file)
    || (a.line ?? 0) - (b.line ?? 0)
    || a.pattern.localeCompare(b.pattern)
  );

  process.stdout.write(JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    scannedAt: new Date().toISOString(),
    rootDir,
    monorepoRoot: monorepoRoot ?? null,
    workspacePackages: workspacePackages.map((p) => ({ name: p.name, dir: relative(monorepoRoot ?? rootDir, p.dir) })),
    stack,
    routes,
    findings,
    scannerMetadata: scanners.map((s) => ({
      id: s.metadata.id,
      title: s.metadata.title,
      severity: s.metadata.severity,
      billingDimension: s.metadata.billingDimension,
      trafficIndependent: s.metadata.trafficIndependent,
    })),
  }, null, 2) + '\n');

  process.stderr.write(`[scan-codebase] ${findings.length} finding(s)\n`);
}

// Record workspace-package imports per route so the brief allowlists them and
// sub-agents can investigate the real source rather than abstaining on a thin
// re-export shell. Capped to keep the brief focused (source order ≈ import order,
// so the primary view component usually leads).
const WORKSPACE_IMPORT_LIMIT_PER_ROUTE = 12;
async function enrichRoutesWithWorkspaceImports(routes, scanRootDir, resolver, monorepoRoot) {
  if (!monorepoRoot) return;
  for (const r of routes) {
    if (!r?.file) continue;
    const abs = join(scanRootDir, r.file);
    const resolved = await resolveWorkspaceImports(abs, resolver, {
      pureBarrelDepth: 3,
      suffixFanoutDepth: 2,
      perSpecifierCap: 3,
    });
    if (resolved.length === 0) continue;
    // Paths must be relative to the monorepo root so they align between signals + verifier.
    r.workspaceImports = resolved
      .slice(0, WORKSPACE_IMPORT_LIMIT_PER_ROUTE)
      .map((abs) => relative(monorepoRoot, abs));
  }
}

async function collectFiles(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const segments = (e.parentPath ?? e.path ?? root).split('/');
    if (segments.some((s) => SKIP_DIRS.has(s))) continue;
    if (SKIP_FILE_PATTERNS.some((re) => re.test(e.name))) continue;
    if (!/\.(tsx?|jsx?|mjs|cjs|html|svelte|astro|vue|json)$/.test(e.name)) continue;

    const full = join(e.parentPath ?? e.path ?? root, e.name);
    try {
      const content = await readFile(full, 'utf-8');
      if (content.length > 500_000) continue;
      out.push({ path: relative(root, full), content });
    } catch {}
  }
  return out;
}

function filterApplicable(files, meta) {
  const incl = meta.includeGlobs ?? ['**/*'];
  return files.filter((f) => incl.some((g) => globMatch(g, f.path)));
}

// Tiny glob → regex. Supports **, *, and {a,b} alternation.
function globMatch(pattern, path) {
  const re = new RegExp(
    '^' +
    pattern
      .replace(/[.+^$()|[\]\\]/g, '\\$&')
      .replace(/\{([^}]+)\}/g, (_, inner) => '(' + inner.split(',').join('|') + ')')
      .replace(/\*\*/g, '__GLOBSTAR__')
      .replace(/\*/g, '[^/]*')
      .replace(/__GLOBSTAR__/g, '.*')
    + '$'
  );
  return re.test(path);
}

async function enumerateRoutes(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const routes = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const segments = (e.parentPath ?? e.path ?? root).split('/');
    if (segments.some((s) => SKIP_DIRS.has(s))) continue;

    const full = join(e.parentPath ?? e.path ?? root, e.name);
    const rel = relative(root, full);

    // App Router: route groups ((name)), parallel routes (@slot), private folders
    // (_name), and the top-level page.tsx (no path segment) all need explicit handling.
    let m = rel.match(/^(?:src\/)?app\/(.*)\/(page|route|layout)\.(tsx?|jsx?)$/);
    if (!m) {
      const top = rel.match(/^(?:src\/)?app\/(page|route|layout)\.(tsx?|jsx?)$/);
      if (top) {
        routes.push({
          routePath: '/',
          file: rel,
          type: routeEntryType(top[1]),
        });
        continue;
      }
    }
    if (m) {
      const stripped = m[1]
        .split('/')
        .filter((seg) => !/^\([^)]+\)$/.test(seg) && !/^@/.test(seg) && !/^_/.test(seg))
        .join('/')
        .replace(/^\/+|\/+$/g, '');
      const routePath = stripped === '' ? '/' : `/${stripped}`;
      routes.push({
        routePath,
        file: rel,
        type: routeEntryType(m[2]),
      });
      continue;
    }

    // Astro endpoint filenames commonly include the response extension
    // (`feed.xml.ts`, `robots.txt.ts`). Handle these before the generic
    // `src/pages` rule, which otherwise treats them as page components.
    m = rel.match(/^src\/pages\/(.*\.(?:xml|json|txt|rss|atom|svg|png|jpg|jpeg|webp))\.(tsx?|jsx?|mjs|cjs)$/);
    if (m) {
      const name = normalizeRouteFileStem(m[1]);
      routes.push({
        routePath: name === '' ? '/' : '/' + name,
        file: rel,
        type: 'route',
      });
      continue;
    }

    m = rel.match(/^(?:src\/)?pages\/(.*)\.(tsx?|jsx?)$/);
    if (m) {
      const name = m[1].replace(/\/index$/, '').replace(/^index$/, '');
      const isApi = /^api\//.test(name);
      routes.push({
        routePath: name === '' ? '/' : '/' + name,
        file: rel,
        type: isApi ? 'route' : 'page',
      });
      continue;
    }

    // Nuxt 3/4 pages. Dynamic segments use the same bracket shape as metrics
    // (`[id]`, `[...slug]`), so keep them intact for route matching.
    m = rel.match(/^(?:app\/)?pages\/(.*)\.vue$/);
    if (m) {
      const name = normalizeRouteFileStem(m[1]);
      routes.push({
        routePath: name === '' ? '/' : '/' + name,
        file: rel,
        type: 'page',
      });
      continue;
    }

    // Nuxt server routes: server/api/foo.get.ts -> /api/foo,
    // server/routes/rss.xml.ts -> /rss.xml.
    m = rel.match(/^server\/(api|routes)\/(.*)\.(tsx?|jsx?|mjs|cjs)$/);
    if (m) {
      const base = m[1] === 'api' ? 'api/' : '';
      const name = normalizeRouteFileStem(`${base}${m[2]}`);
      routes.push({
        routePath: name === '' ? '/' : '/' + name,
        file: rel,
        type: 'route',
      });
      continue;
    }

    // Astro pages and endpoints. This is limited framework support, but route
    // mapping still improves reports when Vercel metrics use user-facing paths.
    m = rel.match(/^src\/pages\/(.*)\.(astro|tsx?|jsx?|mjs|cjs)$/);
    if (m) {
      const name = normalizeRouteFileStem(m[1]);
      routes.push({
        routePath: name === '' ? '/' : '/' + name,
        file: rel,
        type: m[2] === 'astro' ? 'page' : 'route',
      });
      continue;
    }

    // SvelteKit: +page.svelte = page, +page.server.{ts,js} pairs with it (treat
    // as page), +server.{ts,js} = API route, +layout.* = ancestor layout context.
    // Route groups (auth) stripped like Next; dynamic segments [slug]/[...rest]/[[opt]] preserved.
    m = rel.match(/^src\/routes\/(.*)\/\+(page\.svelte|page\.server\.(?:ts|js)|server\.(?:ts|js)|layout\.svelte|layout\.server\.(?:ts|js))$/);
    if (m || /^src\/routes\/\+(page\.svelte|page\.server\.(?:ts|js)|server\.(?:ts|js)|layout\.svelte|layout\.server\.(?:ts|js))$/.test(rel)) {
      const fileTypeMatch = rel.match(/\+(page\.svelte|page\.server\.(?:ts|js)|server\.(?:ts|js)|layout\.svelte|layout\.server\.(?:ts|js))$/);
      const fileType = fileTypeMatch?.[1] ?? '';
      const segs = (m?.[1] ?? '').split('/').filter(Boolean)
        .filter((seg) => !/^\([^)]+\)$/.test(seg));
      const routePath = segs.length === 0 ? '/' : '/' + segs.join('/');
      const type = fileType.startsWith('server') ? 'route' : fileType.startsWith('layout') ? 'layout' : 'page';
      // When +page.svelte AND +page.server.ts both exist, +page.svelte wins ownership.
      const existing = type === 'layout' ? null : routes.find((r) => r.routePath === routePath && r.type !== 'layout');
      if (existing) {
        if (fileType === 'page.svelte' && existing.type === 'page') {
          existing.file = rel;
        }
        continue;
      }
      routes.push({ routePath, file: rel, type });
      continue;
    }
  }
  return routes.sort((a, b) =>
    a.routePath.localeCompare(b.routePath)
    || routeTypeOrder(a.type) - routeTypeOrder(b.type)
    || a.file.localeCompare(b.file)
  );
}

function routeEntryType(name) {
  return name === 'route' ? 'route' : name === 'layout' ? 'layout' : 'page';
}

function normalizeRouteFileStem(stem) {
  return String(stem ?? '')
    .replace(/\/index$/, '')
    .replace(/^index$/, '')
    .replace(/\.(?:get|post|put|patch|delete|options|head)$/, '')
    .replace(/^\/+|\/+$/g, '');
}

function routeTypeOrder(type) {
  return type === 'page' ? 0 : type === 'route' ? 1 : type === 'layout' ? 2 : 3;
}

function mapFileToRoute(filePath, routes) {
  const r = routes.find((rt) => rt.file === filePath);
  return r?.routePath ?? null;
}

main().catch((err) => {
  process.stderr.write(`[scan-codebase] FAILED: ${err.message}\n`);
  process.exit(1);
});
