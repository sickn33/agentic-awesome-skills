#!/usr/bin/env node

// Parses "X vs Y" patterns from `browse cloud search` result titles across discovery batch files.
// Produces a ranked list of candidate competitor names, with an example title each,
// and attempts to resolve each name to a domain from the result URL pool.
//
// Usage: node extract_vs_names.mjs <directory> [--prefix competitor] [--seed "Exa,Tavily,SerpAPI"]
//
// Output: newline-delimited JSON to stdout, one object per candidate:
//   { "name": "serper", "hits": 3, "domain": "serper.dev", "example": "Tavily vs Serper..." }

import sanitizeFilename from 'sanitize-filename';
import { readdirSync, readFileSync } from 'fs';
import { isAbsolute, join, relative, resolve } from 'path';

const args = process.argv.slice(2);
function sanitizePathSegments(pathValue) {
  return String(pathValue ?? '').split(/[\\/]+/).filter(Boolean).map((segment) => {
    const sanitized = sanitizeFilename(segment);
    if (sanitized !== segment || !sanitized) {
      throw new Error(`Unsafe path segment: ${segment}`);
    }
    return sanitized;
  });
}

function safeCliPath(pathValue, baseDir = process.cwd()) {
  const root = resolve(baseDir);
  const target = resolve(root, ...sanitizePathSegments(pathValue));
  const rel = relative(root, target);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Path escapes allowed directory: ${pathValue}`);
  }
  return target;
}


if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.error(`Usage: node extract_vs_names.mjs <directory> [--prefix <prefix>] [--seed "<csv>"]

Reads all <prefix>_discovery_batch_*.json files, parses "X vs Y" patterns from result
titles, and outputs a ranked list of candidate competitor names as newline-delimited JSON.

Options:
  --prefix <prefix>   Batch file prefix (default: "competitor")
  --seed "<csv>"      Comma-separated list of seed names to exclude from output
                      (you already know these; want the OTHER side of the comparison)
  --help, -h          Show this help message`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const dir = safeCliPath(args[0]);
const prefixIdx = args.indexOf('--prefix');
const prefix = prefixIdx !== -1 && args[prefixIdx + 1] ? args[prefixIdx + 1] : 'competitor';
const seedIdx = args.indexOf('--seed');
const seeds = seedIdx !== -1 && args[seedIdx + 1]
  ? args[seedIdx + 1].split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : [];
const seedSet = new Set(seeds);

// Escape regex metacharacters in the user-supplied prefix so a value like
// "comp.+" matches the literal filename, not as a regex pattern.
const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`^${escapedPrefix}_discovery_batch_.*\\.json$`);

let files;
try {
  files = readdirSync(dir).filter(f => pattern.test(f)).sort();
} catch (err) {
  console.error(`Error reading directory ${dir}: ${err.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No ${prefix}_discovery_batch_*.json files found in ${dir}`);
  process.exit(1);
}

const allResults = [];
for (const f of files) {
  try {
    const d = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
    const rs = Array.isArray(d) ? d : d.results || [];
    allResults.push(...rs);
  } catch {}
}

// Build a lookup of hostname -> candidate root domain from all result URLs.
// Used later to try to resolve "serper" -> "serper.dev".
// Exclude any host whose root-base equals a seed name — otherwise a short extracted token
// like "exa" can match the user's own domain (exa.ai).
const hostMap = new Map();
for (const r of allResults) {
  if (!r.url) continue;
  try {
    const h = new URL(r.url).hostname.replace(/^www\./, '');
    const root = h.split('.').slice(-2).join('.');
    const rootBase = root.split('.')[0];
    if (seedSet.has(rootBase)) continue;
    if (!hostMap.has(root)) hostMap.set(root, h);
  } catch {}
}

// Extract names from "X vs Y" patterns.
const counts = new Map();
for (const r of allResults) {
  const title = (r.title || '').toLowerCase();
  const ms = [...title.matchAll(/\b([a-z][\w.\-]{2,})\s+(?:vs\.?|versus)\s+([a-z][\w.\-]{2,})/g)];
  for (const m of ms) {
    for (const raw of [m[1], m[2]]) {
      const name = raw.replace(/[^a-z0-9.\-]/g, '').trim();
      if (!name || name.length < 3) continue;
      if (seedSet.has(name)) continue;
      // Reject obvious non-product tokens
      if (['the', 'and', 'for', 'with', 'best', 'top', 'better', 'using', 'choosing'].includes(name)) continue;
      if (!counts.has(name)) counts.set(name, { name, hits: 0, example: r.title });
      counts.get(name).hits += 1;
    }
  }
}

// Try to resolve each name to a domain.
// Strategy:
//   1. Exact match on rootBase wins outright.
//   2. Otherwise allow rootBase.startsWith(needle) ONLY when the suffix is a known
//      branding token (e.g. "serp" → "serpapi.com"). Bidirectional startsWith
//      was too loose: "serp" matched serpstack.com, "exa" matched example.com.
//   3. Among multiple suffix matches, prefer the shortest suffix (most specific —
//      "serp" should match "serpapi" before "serpapilabs"). Deterministic.
const BRAND_SUFFIXES = ['api','search','app','ai','io','hq','co','dev','tech','cloud','agent','agents','labs','lab'];

function resolveDomain(name) {
  const needle = name.replace(/\./g, '');
  let exact = null;
  let bestSuffix = null; // { host, suffixLen }
  for (const [root, host] of hostMap.entries()) {
    const rootBase = root.split('.')[0];
    if (rootBase === needle) { exact = host; break; }
    if (rootBase.length > needle.length && rootBase.startsWith(needle)) {
      const suffix = rootBase.slice(needle.length).replace(/^[\-_]/, '');
      if (BRAND_SUFFIXES.includes(suffix)) {
        if (!bestSuffix || suffix.length < bestSuffix.suffixLen) {
          bestSuffix = { host, suffixLen: suffix.length };
        }
      }
    }
  }
  if (exact) return exact;
  if (bestSuffix) return bestSuffix.host;
  return null;
}

const ranked = [...counts.values()]
  .map(c => ({ ...c, domain: resolveDomain(c.name) }))
  .sort((a, b) => b.hits - a.hits);

for (const c of ranked) {
  console.log(JSON.stringify(c));
}

console.error(`Extracted ${ranked.length} candidate names from ${files.length} batch files`);
