// Strip Cache-Control directives Vercel's CDN silently ignores
// (stale-if-error, proxy-revalidate, must-revalidate). s-maxage/max-age/
// stale-while-revalidate/no-store/private/public are honored — leave them.

import { escapeRegex } from '../util.mjs';

const STRIP_DIRECTIVES = ['stale-if-error', 'proxy-revalidate', 'must-revalidate'];

export const metadata = {
  id: 'vercel-directive-strip',
  description: 'Strip cache-control directives Vercel\'s CDN does not honor.',
};

export function apply(rec, _ctx = {}) {
  const fields = ['fix', 'currentBehavior', 'desiredBehavior'];
  const strippedSet = new Set();
  for (const f of fields) {
    if (typeof rec[f] !== 'string') continue;
    for (const directive of STRIP_DIRECTIVES) {
      const re = new RegExp(`(?:,\\s*)?\\b${escapeRegex(directive)}\\b(?:\\s*,)?`, 'g');
      if (re.test(rec[f])) {
        rec[f] = rec[f]
          .replace(new RegExp(`\\b${escapeRegex(directive)}\\b`, 'g'), '')
          .replace(/,\s*,/g, ',')
          .replace(/(['"])\s*,\s*/g, '$1, ')
          .replace(/,\s*(['"])/g, ', $1')
          .replace(/(['"])\s*,\s*(['"])/g, '$1, $2')
          .replace(/\b(Cache-Control|cache-control)\b:\s*,\s*/g, '$1: ')
          .replace(/(['"])\s*,\s*\1/g, '$1');
        strippedSet.add(directive);
      }
    }
  }
  const stripped = [...strippedSet];
  if (stripped.length === 0) return {};
  return { tags: stripped.map((d) => `vercel-directive-strip:${d}`) };
}
