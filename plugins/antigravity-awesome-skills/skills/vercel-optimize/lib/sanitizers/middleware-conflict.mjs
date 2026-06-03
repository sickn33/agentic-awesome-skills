// Append a caveat when a rec targets a route covered by middleware: e.g.
// middleware setting Set-Cookie downstream poisons cache headers the rec
// adds. Trusts finding.routesCovered rather than re-implementing Next's
// matcher algorithm.

import { extractRoute } from '../util.mjs';

export const metadata = {
  id: 'middleware-conflict',
  description: 'Append caveat when rec targets a route covered by middleware.',
};

export function apply(rec, ctx = {}) {
  const findings = ctx?.signals?.codebase?.findings ?? [];
  const middlewareFinding = findings.find((f) => f?.scannerId === 'middleware-broad-matcher' || f?.id === 'middleware-broad-matcher');
  if (!middlewareFinding) return {};

  const route = extractRoute(rec);
  if (!route) return {};

  const matcher = middlewareFinding.detail?.matcher
    ?? middlewareFinding.matcher
    ?? '(unspecified matcher)';
  const middlewareFile = middlewareFinding.file ?? middlewareFinding.path ?? 'middleware.ts';

  const covered = middlewareFinding.detail?.routesCovered ?? middlewareFinding.routesCovered;
  if (Array.isArray(covered) && covered.length > 0 && !covered.includes(route)) {
    return {};
  }

  const tag = `middleware-conflict:${matcher}`;
  const caveat = `\n\n_Caveat: Middleware at \`${middlewareFile}\` (matcher: \`${matcher}\`) may intercept \`${route}\` and alter request/response before this fix takes effect. Verify the middleware does not set headers (e.g. \`Set-Cookie\`) that would invalidate caching._`;

  if (typeof rec.fix === 'string') rec.fix += caveat;
  return { tag, needsReview: true };
}
