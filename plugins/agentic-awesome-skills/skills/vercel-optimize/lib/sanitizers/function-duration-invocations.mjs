// A function-duration optimization can reduce p95/CPU/GB-hr. It does not by
// itself reduce function invocation count unless the fix also adds CDN/static
// response caching.

export const metadata = {
  id: 'function-duration-invocations',
  description: 'Remove false claims that slow-route data-cache fixes reduce function invocation count.',
};

const STRING_FIELDS = [
  'what',
  'why',
  'fix',
  'currentBehavior',
  'desiredBehavior',
  'verify',
];

const BAD_INVOCATION_CLAIM =
  /\bfunction invocations?\b[^.!?\n]{0,120}\b(?:drop|drops|fall|falls|decrease|decreases|decline|declines|reduce|reduces|reduced|cut|cuts)\b[^.!?\n]*(?:[.!?]|$)|\b(?:drop|drops|fall|falls|decrease|decreases|decline|declines|reduce|reduces|reduced|cut|cuts)\b[^.!?\n]{0,120}\bfunction invocations?\b[^.!?\n]*(?:[.!?]|$)/gi;

const SAFE_REPLACEMENT =
  '95th percentile duration should drop; function invocation count may stay flat unless a separate CDN or static-rendering change is made.';

export function apply(rec) {
  if (!String(rec?.candidateRef ?? '').startsWith('slow_route:')) return {};
  const tags = [];
  for (const field of STRING_FIELDS) {
    if (typeof rec?.[field] !== 'string') continue;
    const before = rec[field];
    const after = before.replace(BAD_INVOCATION_CLAIM, SAFE_REPLACEMENT);
    if (after !== before) {
      rec[field] = after;
      tags.push(`function-duration-invocations:${field}`);
    }
  }
  return tags.length > 0 ? { tags } : {};
}
