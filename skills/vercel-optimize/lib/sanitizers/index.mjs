// Sanitizer orchestrator. Order matters: citation strippers must run
// before missing-citation so an emptied citations[] still drops the rec.

import { applyDollarStrip } from '../impact-magnitude.mjs';
import { sanitizeCitations } from '../citations.mjs';
import * as vercelDirectiveStrip from './vercel-directive-strip.mjs';
import * as rateLimit from './rate-limit.mjs';
import * as preRelease from './pre-release.mjs';
import * as middlewareConflict from './middleware-conflict.mjs';
import * as undeclaredDep from './undeclared-dep.mjs';
import * as countCorrect from './count-correct.mjs';
import * as renderingModeMislabel from './rendering-mode-mislabel.mjs';
import * as windowUnits from './window-units.mjs';
import * as functionDurationInvocations from './function-duration-invocations.mjs';
import * as botProtectionCertainty from './bot-protection-certainty.mjs';
import * as cacheTagInvalidationCertainty from './cache-tag-invalidation-certainty.mjs';
import * as missingCitation from './missing-citation.mjs';

export const SANITIZERS = [
  vercelDirectiveStrip,
  rateLimit,
  preRelease,
  middlewareConflict,
  undeclaredDep,
  countCorrect,
  renderingModeMislabel,
  windowUnits,
  functionDurationInvocations,
  botProtectionCertainty,
  cacheTagInvalidationCertainty,
];

export function recordSanitizer(rec, tag) {
  rec.sanitizerTrail = rec.sanitizerTrail ?? [];
  rec.sanitizerTrail.push(tag);
}

export async function applySanitizers(rec, ctx = {}) {
  applyDollarStrip(rec);

  for (const s of SANITIZERS) {
    const result = s.apply(rec, ctx) ?? {};
    const tags = result.tags ?? (result.tag ? [result.tag] : []);
    for (const t of tags) recordSanitizer(rec, t);
    if (result.needsReview) rec.needsReview = true;
    if (result.dropped) {
      return { kept: false, rec, dropReason: tags[0] ?? `dropped-by:${s.metadata?.id ?? 'unknown'}` };
    }
  }

  if (ctx.framework && ctx.version) {
    const before = (rec.citations ?? []).slice();
    const { strippedUnknown, strippedVersion } = await sanitizeCitations(rec, ctx.framework, ctx.version);
    for (const u of strippedUnknown) recordSanitizer(rec, `unknown-citation:${u}`);
    for (const u of strippedVersion) recordSanitizer(rec, `version-mismatch:${u}`);
    const lostAny = strippedUnknown.length > 0 || strippedVersion.length > 0;
    const lostAll = lostAny && (rec.citations ?? []).length === 0 && before.length > 0;
    if (lostAll) rec.needsReview = true;
  }

  // missing-citation runs LAST so citation strippers above can starve a rec.
  const missing = missingCitation.apply(rec, ctx) ?? {};
  if (missing.dropped) {
    return { kept: false, rec, dropReason: missing.tag ?? 'missing-citation' };
  }

  return { kept: true, rec };
}

export async function applySanitizersBatch(recs, ctx = {}) {
  const kept = [];
  const dropped = [];
  for (const rec of recs) {
    const r = await applySanitizers(rec, ctx);
    if (r.kept) kept.push(r.rec);
    else dropped.push({ rec: r.rec, dropReason: r.dropReason });
  }
  return { kept, dropped };
}
