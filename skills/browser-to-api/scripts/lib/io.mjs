// File-IO helpers shared across the pipeline. Mirrors the conventions of
// browser-trace/scripts/lib.mjs. Node stdlib only.

import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readJsonl(p) {
  if (!fs.existsSync(p)) return [];
  const out = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return out;
}

export function writeJsonl(p, items) {
  ensureDir(path.dirname(p));
  const body = items.length ? items.map(o => JSON.stringify(o)).join('\n') + '\n' : '';
  fs.writeFileSync(p, body);
}

export function readJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

export function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

export function writeText(p, s) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, s);
}

export function resolveRun(runArg) {
  // Accept both bare run-id and full path.
  if (fs.existsSync(runArg) && fs.statSync(runArg).isDirectory()) return path.resolve(runArg);
  const root = process.env.O11Y_ROOT || '.o11y';
  const guess = path.join(root, runArg);
  if (fs.existsSync(guess)) return path.resolve(guess);
  throw new Error(`run path not found: ${runArg} (tried ${guess})`);
}

export function intermediatePath(outDir, name) {
  return path.join(outDir, 'intermediate', name);
}

export function samplePath(outDir, method, pathHash) {
  return path.join(outDir, 'samples', `${method.toLowerCase()}__${pathHash}.json`);
}
