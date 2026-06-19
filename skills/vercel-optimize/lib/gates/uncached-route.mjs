// getShare>0.20 filter WHY: a route that's >80% POST/PUT/DELETE is a mutation endpoint
// where 0% cache is correct — recommending caching there is wrong.
// cache_result values STALE/REVALIDATED/BYPASS fold into "total but not HIT" — matches the "uncached" framing.

import { withRouteShapeWarnings } from '../route-normalize.mjs';

const MIN_GET_SHARE = 0.20;

/** @type {import('./types.d.ts').GateMetadata} */
export const metadata = {
  id: 'uncached_route',
  threshold: `requests > 500 AND hitRate < 0.5 AND getShare > ${MIN_GET_SHARE} (missing getShare is gated)`,
  billingDimension: 'edge-requests',
  scope: 'route',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Routes serving > 500 requests/period at < 50% cache hit AND at least 20% GET traffic. Each uncached GET request reaches the function, costing edge requests + function duration. Routes that are mostly POST/PUT/DELETE (Server Actions, mutations) are skipped — 0% cache is correct behavior there. Routes with missing method-share data are gated instead of launched. Auth-gated routes are disqualified separately.',
};

/**
 * @param {import('./types.d.ts').Signals} signals
 * @returns {import('./types.d.ts').Candidate[]}
 */
export function gate(signals) {
  const rates = extractCacheHitRates(signals);
  const methods = extractMethodShares(signals);
  return rates
    .map((r) => ({ ...r, getShare: methods.get(r.route) ?? null }))
    .filter((r) => r.requests > 500 && r.hitRate < 0.5)
    .filter((r) => r.getShare === null || r.getShare > MIN_GET_SHARE)
    .map((r) => {
      const candidate = withRouteShapeWarnings({
        kind: metadata.id,
        scope: 'route',
        route: r.route,
        files: [],
        priority: Math.round(r.requests * (1 - r.hitRate)),
        confidence: r.getShare === null ? 0.5 : 0.92,
        o11ySignal: `requests=${r.requests},cache=${(r.hitRate * 100).toFixed(0)}%${r.getShare !== null ? `,get=${(r.getShare * 100).toFixed(0)}%` : ''}`,
        reason: 'uncached high-traffic route',
        question: `Why does ${r.route} have ${(r.hitRate * 100).toFixed(0)}% cache hit rate on ${r.requests} requests in this metrics window, and is it safe to cache at the edge?`,
        evidence: { metric: 'requestsByRouteCache', route: r.route, requests: r.requests, hitRate: r.hitRate, getShare: r.getShare },
      }, signals);
      if (r.getShare !== null) return candidate;
      return {
        ...candidate,
        disqualified: true,
        disqualifyReason: 'missing GET-share data — route method mix is required before recommending edge caching',
        warnings: [...new Set([...(candidate.warnings ?? []), 'method-share:missing'])],
      };
    });
}

function extractCacheHitRates(signals) {
  const m = signals.metrics?.requestsByRouteCache;
  if (!m?.ok && !Array.isArray(m?.rows)) return [];

  const perRoute = new Map();
  for (const row of (m?.rows ?? [])) {
    const route = row.route;
    if (!route) continue;
    const value = row.value ?? 0;
    const prior = perRoute.get(route) ?? { route, hits: 0, total: 0 };
    if (row.cache_result === 'HIT') prior.hits += value;
    prior.total += value;
    perRoute.set(route, prior);
  }

  return [...perRoute.values()].map((r) => ({
    route: r.route,
    requests: r.total,
    hitRate: r.total > 0 ? r.hits / r.total : 0,
  }));
}

function extractMethodShares(signals) {
  const m = signals.metrics?.requestsByRouteMethod;
  const out = new Map();
  if (!Array.isArray(m?.rows)) return out;
  const perRoute = new Map();
  for (const row of m.rows) {
    if (!row?.route) continue;
    const v = row.value ?? 0;
    const prior = perRoute.get(row.route) ?? { gets: 0, total: 0 };
    if ((row.request_method ?? '').toUpperCase() === 'GET') prior.gets += v;
    prior.total += v;
    perRoute.set(row.route, prior);
  }
  for (const [route, r] of perRoute) {
    if (r.total > 0) out.set(route, r.gets / r.total);
  }
  return out;
}
