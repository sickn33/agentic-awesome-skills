// The metrics window is fixed by collect-signals (currently 14d). Do not let
// agent prose turn observed counts into monthly counts.

import { normalizeObservedWindowUnits } from '../display-labels.mjs';

export const metadata = {
  id: 'window-units',
  description: 'Rewrite observed /mo or monthly count units to /window so reports do not imply extrapolated monthly data.',
};

const STRING_FIELDS = [
  'what',
  'why',
  'fix',
  'currentBehavior',
  'desiredBehavior',
  'verify',
];

export function apply(rec) {
  const tags = [];
  for (const field of STRING_FIELDS) {
    if (typeof rec?.[field] !== 'string') continue;
    const before = rec[field];
    const after = normalizeObservedWindowUnits(before);
    if (after !== before) {
      rec[field] = after;
      tags.push(`window-units:${field}`);
    }
  }
  return tags.length > 0 ? { tags } : {};
}
