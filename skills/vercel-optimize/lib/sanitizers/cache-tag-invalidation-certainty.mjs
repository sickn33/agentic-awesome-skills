// A cacheTag() in the cached function is not proof that CMS edits invalidate it.
// The report must not claim "existing tags preserve instant updates" unless the
// investigation verifies matching revalidateTag/updateTag paths.

export const metadata = {
  id: 'cache-tag-invalidation-certainty',
  description: 'Remove unsupported certainty that existing cache tags already preserve CMS/on-demand invalidation.',
};

const STRING_FIELDS = ['what', 'why', 'fix', 'currentBehavior', 'desiredBehavior', 'verify'];
const UNSUPPORTED_TAG_CERTAINTY =
  /\b(?:existing|current)\s+(?:cache\s+)?tags?\b[^.!?\n]{0,160}\b(?:preserve|keep|cover|maintain|ensure)\b[^.!?\n]{0,160}\b(?:instant|on-demand|CMS|content|publish|update|updates|invalidation|revalidation)\b[^.!?\n]*(?:[.!?]|$)/gi;
const SAFE_REPLACEMENT =
  'Confirm a matching revalidateTag() or updateTag() path for each cacheTag() before increasing the cache lifetime.';

export function apply(rec) {
  const text = STRING_FIELDS.map((field) => rec?.[field]).filter((s) => typeof s === 'string').join('\n');
  if (!/\bcache(?:Life|Tag)\b/.test(text)) return {};
  const tags = [];
  for (const field of STRING_FIELDS) {
    if (typeof rec?.[field] !== 'string') continue;
    const before = rec[field];
    const after = before.replace(UNSUPPORTED_TAG_CERTAINTY, SAFE_REPLACEMENT);
    if (after !== before) {
      rec[field] = after;
      tags.push(`cache-tag-invalidation-certainty:${field}`);
    }
  }
  return tags.length > 0 ? { tags, needsReview: true } : {};
}
