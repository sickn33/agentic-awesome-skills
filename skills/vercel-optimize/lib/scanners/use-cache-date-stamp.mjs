// Detects time/randomness primitives that destabilize `'use cache'` cache keys,
// which manifests as ISR write amplification when the cached output embeds a timestamp
// that changes per request.
//
// Triggers when a file contains the `'use cache'` directive AND uses `new Date(`,
// `Date.now(`, or `Math.random(` outside client-only hooks (useEffect / useCallback /
// useMemo). Replacing module-scope `new Date().getFullYear()` with a build-time
// `buildYear` constant, and removing dates passed as `'use cache'` function
// arguments, prevents repeated writes when the rendered output is otherwise stable.

import { lineOf } from '../util.mjs';

export const metadata = {
  id: 'use-cache-date-stamp',
  title: "new Date() / Date.now() / Math.random() inside a 'use cache' file",
  severity: 'high',
  billingDimension: 'isr',
  trafficIndependent: false,
  description:
    "Cache keys include function/build identity and serialized inputs, not returned output. A changing date/random input can fragment keys; a changing returned value alone does not establish repeated cache misses or ISR amplification. Prove the actual regeneration mechanism and writes.",
  fix:
    "Verify the timestamp purpose and invalidation path. Preserve freshness and hydration semantics; module-level new Date() is evaluated at module initialization, not guaranteed build time. Change keys or UI placement only when measured duplicate work is avoidable.",
  citations: [
    'https://nextjs.org/docs/app/api-reference/directives/use-cache',
    'https://nextjs.org/docs/app/api-reference/functions/cacheLife',
  ],
  excludeGlobs: ['node_modules/**', '.next/**', 'dist/**', '__tests__/**', '**/*.test.*', '**/*.spec.*'],
  includeGlobs: [
    '**/page.{ts,tsx,js,jsx}',
    '**/layout.{ts,tsx,js,jsx}',
    '**/route.{ts,tsx,js,jsx}',
    '**/lib/**/*.{ts,tsx,js,jsx}',
    '**/app/**/*.{ts,tsx,js,jsx}',
    '**/components/**/*.{ts,tsx,js,jsx}',
  ],
};

const USE_CACHE_RE = /^[\t ]*['"]use cache['"]/m;
const SUSPECT_RE = /\b(new Date\(|Date\.now\(|Math\.random\()/g;
// Client-only hooks that don't affect server-side cache keys.
const CLIENT_HOOK_RE = /\b(useEffect|useCallback|useMemo|useLayoutEffect)\s*\(/g;

export function scan({ files }) {
  const out = [];
  for (const { path, content } of files) {
    if (!USE_CACHE_RE.test(content)) continue;

    const clientHookRanges = collectRanges(content, CLIENT_HOOK_RE);
    let match;
    SUSPECT_RE.lastIndex = 0;
    while ((match = SUSPECT_RE.exec(content)) !== null) {
      if (isInsideAnyRange(match.index, clientHookRanges)) continue;
      out.push({
        pattern: metadata.id,
        file: path,
        line: lineOf(content, match.index),
        evidence: match[0],
        trafficIndependent: metadata.trafficIndependent,
        subtype: classifySubtype(content, match.index),
      });
    }
  }
  return out;
}

function collectRanges(content, hookRe) {
  const ranges = [];
  hookRe.lastIndex = 0;
  let m;
  while ((m = hookRe.exec(content)) !== null) {
    const open = content.indexOf('(', m.index);
    if (open < 0) continue;
    const close = findMatchingParen(content, open);
    if (close < 0) continue;
    ranges.push([open, close]);
  }
  return ranges;
}

function findMatchingParen(content, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < content.length; i++) {
    const c = content[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function isInsideAnyRange(idx, ranges) {
  for (const [a, b] of ranges) {
    if (idx >= a && idx <= b) return true;
  }
  return false;
}

// `module-scope` if the suspect appears before the first function/class declaration.
// `in-cache-fn` otherwise (likely inside a render or helper function body).
function classifySubtype(content, idx) {
  const head = content.slice(0, idx);
  if (!/\bfunction\b|\bclass\b|=>\s*\{/.test(head)) return 'module-scope';
  return 'in-cache-fn';
}
