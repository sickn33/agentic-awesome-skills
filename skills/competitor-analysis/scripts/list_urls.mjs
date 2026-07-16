#!/usr/bin/env node

// Deduplicates discovery URLs from `browse cloud search` JSON output files.
// Usage: node list_urls.mjs /tmp [--prefix competitor]
// Reads all {prefix}_discovery_batch_*.json files, deduplicates by domain,
// outputs one URL per line to stdout, stats to stderr.

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
  console.error(`Usage: node list_urls.mjs <directory> [--prefix <prefix>]

Reads all <prefix>_discovery_batch_*.json files from <directory>,
deduplicates URLs by domain, and outputs one URL per line to stdout.

Options:
  --prefix <prefix>  Batch file prefix (default: "competitor")
  --help, -h         Show this help message

Examples:
  node list_urls.mjs /tmp
  node list_urls.mjs /tmp --prefix competitor`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const dir = safeCliPath(args[0]);
const prefixIdx = args.indexOf('--prefix');
const prefix = prefixIdx !== -1 && args[prefixIdx + 1] ? args[prefixIdx + 1] : 'competitor';

// Escape regex metacharacters in the user-supplied prefix so a value like
// "comp.+" matches the literal filename, not as a regex pattern.
const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`^${escapedPrefix}_discovery_batch_.*\\.json$`);

let files;
try {
  files = readdirSync(dir)
    .filter(f => pattern.test(f))
    .sort();
} catch (err) {
  console.error(`Error reading directory ${dir}: ${err.message}`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No ${prefix}_discovery_batch_*.json files found in ${dir}`);
  process.exit(1);
}

// Dedup by hostname, but prefer the site root over a deep link. The first search hit for a
// domain is often a blog/doc/comparison path; gating + enrichment want the homepage, so when
// multiple URLs share a host we keep the shallowest path (fewest segments). First-seen host
// order is preserved (Map.set on an existing key keeps its position).
const byDomain = new Map(); // hostname -> { url, depth }
let totalResults = 0;

for (const file of files) {
  try {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
    const results = Array.isArray(data) ? data : (data.results || []);
    totalResults += results.length;

    for (const result of results) {
      const url = result.url;
      if (!url) continue;

      try {
        const u = new URL(url);
        const hostname = u.hostname.replace(/^www\./, '');
        const depth = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean).length;
        const existing = byDomain.get(hostname);
        if (!existing || depth < existing.depth) byDomain.set(hostname, { url, depth });
      } catch {
        // Skip invalid URLs
      }
    }
  } catch (err) {
    console.error(`Warning: Failed to parse ${file}: ${err.message}`);
  }
}

const urls = [...byDomain.values()].map(v => v.url);
for (const url of urls) {
  console.log(url);
}

console.error(`\n${files.length} files, ${totalResults} total results, ${urls.length} unique domains`);
