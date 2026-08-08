// Rewrite verifier-failed count claims to ground truth (or "a number of"
// when actual isn't numeric) so we don't ship false precision.

import { escapeRegex } from '../util.mjs';

export const metadata = {
  id: 'count-correct',
  description: 'Rewrite count claims to verified ground truth (count-correct) or "a number of" (count-strip) when verifier disagrees.',
};

const COUNT_CLAIM_TYPES = new Set(['pattern_count', 'repo_count', 'cited_count_literal']);

export function apply(rec, ctx = {}) {
  const results = ctx.verifyResults ?? rec.verifyResults ?? rec.verification?.failed ?? null;
  if (!Array.isArray(results) || results.length === 0) return {};

  const tags = [];

  for (const r of results) {
    if (!r) continue;
    const type = r.type ?? r.claimType;
    if (!COUNT_CLAIM_TYPES.has(type)) continue;
    const disp = r.disposition ?? (r.actual !== r.expected ? 'failed' : 'verified');
    if (disp !== 'failed') continue;
    const expected = r.expected;
    const actual = r.actual;
    const token = r.token ?? r.text ?? expected;
    if (expected == null || token == null) continue;

    if (typeof actual === 'number' && Number.isFinite(actual)) {
      rewriteCount(rec, token, expected, `~${actual}`);
      tags.push(`count-correct:${token}:${expected}->${actual}`);
    } else {
      rewriteCount(rec, token, expected, 'a number of');
      tags.push(`count-strip:${token}`);
    }
  }

  if (tags.length === 0) return {};
  return { tags };
}

function rewriteCount(rec, token, oldCount, replacement) {
  const fields = ['what', 'why', 'fix', 'currentBehavior', 'desiredBehavior'];
  // Matches "60", "~60", and "60+" — LLM commonly writes "60+ icons".
  const oldEsc = escapeRegex(String(oldCount));
  const re = new RegExp(`\\b~?${oldEsc}\\+?\\s+${escapeRegex(token)}\\b`, 'g');
  for (const f of fields) {
    if (typeof rec[f] !== 'string') continue;
    rec[f] = rec[f].replace(re, `${replacement} ${token}`);
  }
}
