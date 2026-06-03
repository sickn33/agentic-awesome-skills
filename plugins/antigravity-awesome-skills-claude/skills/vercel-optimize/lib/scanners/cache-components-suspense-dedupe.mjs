// Detects the Cache Components anti-pattern where `'use cache'` doesn't dedupe across
// separate `<Suspense>` boundaries — each boundary triggers a separate evaluation of the
// "shared" cached function, multiplying invocations and ISR write pressure.
//
// Simplified single-file heuristic (cross-file segment analysis is out of scope):
//   File contains `'use cache'` directive (or `use cache` keyword)
//   AND file has 2+ `<Suspense ...>` boundaries
//   AND a repeated fetch URL or function call appears in the body.
//
// False positives are tolerable: the support-topic body recommends a known-good remediation
// (hoist promise to page, or move to `'use cache: remote'`) whether or not the specific call
// site is the exact one paying the cost. The verifier abstains when the file structure
// doesn't match the pitfall.

import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'cache-components-suspense-dedupe',
  title: "'use cache' with multiple Suspense boundaries on the same data",
  severity: 'medium',
  billingDimension: 'function-duration',
  trafficIndependent: false,
  description:
    "Default `'use cache'` does not dedupe identical calls across separate `<Suspense>` boundaries on the same render. Each boundary re-invokes the cached function, multiplying function-duration cost and inflating ISR write churn when the output is large.",
  fix:
    "Hoist the promise to the page level (`const dataPromise = fetchData()` at the top, passed down to each Suspense child) OR move the shared fetch into a `'use cache: remote'` data-access layer so cross-request and cross-boundary dedupe applies.",
  citations: [
    'https://nextjs.org/docs/app/api-reference/directives/use-cache',
    'https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents',
    'https://nextjs.org/docs/app/guides/migrating-to-cache-components',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**', '**/*.test.*', '**/*.spec.*'],
  includeGlobs: [
    '**/page.{ts,tsx,js,jsx}',
    '**/layout.{ts,tsx,js,jsx}',
    '**/components/**/*.{tsx,jsx}',
  ],
};

const USE_CACHE_RE = /^[\t ]*['"]use cache['"]/m;
const SUSPENSE_TAG_RE = /<Suspense\b/g;
const FETCH_LITERAL_RE = /fetch\s*\(\s*(['"`])([^'"`]{6,200})\1/g;
// Helper function calls that look like data-fetchers (lowercase camel, no JSX/HTML noise).
const HELPER_CALL_RE = /\b(get|fetch|load|find|query|read)[A-Z][A-Za-z0-9_]+\s*\(/g;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!USE_CACHE_RE.test(content)) continue;

    const suspenseCount = countMatches(content, SUSPENSE_TAG_RE);
    if (suspenseCount < 2) continue;

    const repeated = findRepeated(content);
    if (repeated.length === 0) continue;

    // Anchor the finding to the first repeated call site so the customer
    // can locate the duplicate quickly.
    const first = repeated[0];
    out.push({
      pattern: metadata.id,
      file: path,
      line: lineOf(content, first.firstIdx),
      evidence: first.kind === 'fetch'
        ? `fetch("${truncate(first.token, 60)}") called ${first.count}× across Suspense boundaries`
        : `${first.token}() called ${first.count}× across Suspense boundaries`,
      trafficIndependent: metadata.trafficIndependent,
      subtype: first.kind === 'fetch' ? 'fetch-literal' : 'helper-call',
    });
  }
  return out;
}

function countMatches(content, re) {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(content) !== null) n++;
  return n;
}

function findRepeated(content) {
  const tokens = new Map(); // token -> { kind, count, firstIdx }
  let m;
  FETCH_LITERAL_RE.lastIndex = 0;
  while ((m = FETCH_LITERAL_RE.exec(content)) !== null) {
    record(tokens, m[2], 'fetch', m.index);
  }
  HELPER_CALL_RE.lastIndex = 0;
  while ((m = HELPER_CALL_RE.exec(content)) !== null) {
    const name = m[0].replace(/\s*\($/, '').trim();
    record(tokens, name, 'helper', m.index);
  }
  return [...tokens.values()]
    .filter((t) => t.count >= 2)
    .sort((a, b) => b.count - a.count);
}

function record(map, token, kind, idx) {
  if (!token) return;
  if (!map.has(token)) {
    map.set(token, { token, kind, count: 0, firstIdx: idx });
  }
  map.get(token).count++;
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}
