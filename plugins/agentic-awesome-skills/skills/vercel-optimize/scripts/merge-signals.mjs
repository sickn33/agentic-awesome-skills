#!/usr/bin/env node
// Deterministically combines Vercel metric collection with the local codebase
// scan. Keeps the merged artifact shape stable: collect-signals output at the
// top level, scan-codebase output under `codebase`.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { routePathMatchScore } from '../lib/investigation-brief.mjs';
import { canonicalizeRoute } from '../lib/route-normalize.mjs';

const log = (...args) => console.error('[merge-signals]', ...args);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.signalsPath || !args.codebasePath) {
    console.error('usage: node scripts/merge-signals.mjs <signals.json> <codebase.json> [--out merged.json] [--force]');
    process.exit(1);
  }

  const [signals, codebase] = await Promise.all([
    readJson(args.signalsPath, 'signals'),
    readJson(args.codebasePath, 'codebase scan'),
  ]);

  const merged = mergeSignals(signals, codebase);
  const body = JSON.stringify(merged, null, 2) + '\n';
  if (args.outPath) {
    await writeOutput(args.outPath, body, { force: args.force });
    log(`wrote ${args.outPath}`);
  } else {
    process.stdout.write(body);
  }
}

export function mergeSignals(signals, codebase) {
  assertObject(signals, 'signals');
  assertObject(codebase, 'codebase scan');

  if (!signals.schemaVersion) {
    throw new Error('signals.json is missing schemaVersion; pass collect-signals output as the first file.');
  }
  if (!Array.isArray(codebase.routes) || !Array.isArray(codebase.findings) || !codebase.stack) {
    throw new Error('codebase.json must be scan-codebase output with stack, routes[], and findings[].');
  }

  return {
    ...signals,
    codebase: annotateCodebaseScan(signals, codebase),
  };
}

export function annotateCodebaseScan(signals, codebase) {
  const index = buildRouteMetricIndex(signals);
  return {
    ...codebase,
    findings: (codebase.findings ?? []).map((finding) => annotateFinding(finding, index)),
  };
}

function annotateFinding(finding, index) {
  if (!finding || typeof finding !== 'object') return finding;
  if (finding.trafficIndependent) return finding;
  if (!finding.route) return { ...finding, o11ySignal: 'NO-ROUTE-MAPPING' };

  const summary = bestRouteSummary(finding.route, index);
  if (!summary || !hasTraffic(summary)) return { ...finding, o11ySignal: 'COLD-PATH' };
  return { ...finding, o11ySignal: formatRouteSignal(summary) };
}

function buildRouteMetricIndex(signals) {
  const out = new Map();
  const ensure = (route) => {
    const canonical = canonicalizeRoute(route);
    const existing = out.get(canonical) ?? { route: canonical };
    out.set(canonical, existing);
    return existing;
  };

  for (const row of rows(signals, 'fnStatusByRoute')) {
    if (!row.route) continue;
    const summary = ensure(row.route);
    summary.functionRuns = (summary.functionRuns ?? 0) + numeric(row.value);
  }
  for (const row of rows(signals, 'fnDurationP95ByRoute')) {
    if (!row.route) continue;
    ensure(row.route).p95Ms = numeric(row.value);
  }
  for (const row of rows(signals, 'requestsByRouteCache')) {
    if (!row.route) continue;
    const summary = ensure(row.route);
    const count = numeric(row.value);
    summary.requests = (summary.requests ?? 0) + count;
    if (String(row.cache_result).toUpperCase() === 'HIT') {
      summary.cacheHits = (summary.cacheHits ?? 0) + count;
    }
  }
  return out;
}

function rows(signals, metricId) {
  const rows = signals?.metrics?.[metricId]?.rows;
  return Array.isArray(rows) ? rows : [];
}

function numeric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function bestRouteSummary(route, index) {
  const canonical = canonicalizeRoute(route);
  const exact = index.get(canonical);
  if (exact) return exact;

  let best = null;
  for (const summary of index.values()) {
    const score = routePathMatchScore(canonical, summary.route);
    if (score <= 0) continue;
    if (!best || score > best.score) best = { score, summary };
  }
  return best?.summary ?? null;
}

function hasTraffic(summary) {
  return (summary.functionRuns ?? 0) > 0 || (summary.requests ?? 0) > 0;
}

function formatRouteSignal(summary) {
  const parts = [];
  if ((summary.functionRuns ?? 0) > 0) parts.push(`inv=${Math.round(summary.functionRuns)}`);
  else if ((summary.requests ?? 0) > 0) parts.push(`requests=${Math.round(summary.requests)}`);
  if ((summary.p95Ms ?? 0) > 0) parts.push(`p95=${Math.round(summary.p95Ms)}ms`);
  if ((summary.requests ?? 0) > 0 && summary.cacheHits != null) {
    const hitRate = Math.round((summary.cacheHits / summary.requests) * 100);
    parts.push(`cache=${hitRate}%`);
  }
  return parts.join(',') || 'COLD-PATH';
}

function parseArgs(argv) {
  const out = { positional: [], force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out.outPath = argv[++i];
    else if (a.startsWith('--out=')) out.outPath = a.slice('--out='.length);
    else if (a === '--force') out.force = true;
    else out.positional.push(a);
  }
  out.signalsPath = out.positional[0];
  out.codebasePath = out.positional[1];
  return out;
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch (err) {
    throw new Error(`Could not read ${label} JSON at ${path}: ${err.message}`);
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

async function writeOutput(path, body, { force }) {
  if (!force && await exists(path)) {
    throw new Error(`output file already exists: ${path}. Use a fresh run directory or pass --force to overwrite.`);
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error('[merge-signals] FAILED:', err.message);
    process.exit(1);
  });
}
