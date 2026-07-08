// Primary threshold (p95>500 AND inv>=1400) WHY: 1.4k/14d is the floor where p95 stabilizes statistically
// and a 3-5x performance win still pays for engineering time. Secondary (p95>1500 AND inv>=250) catches "catastrophically
// slow at any volume" — usually a broken sync call or cold-start chain the customer wants to know about.
//
// 5xx disqualifier: when error rate >50% the route is failing, not slow — latency reflects crash time,
// not work time. route_errors covers it independently; we disqualify here so budget isn't spent on a
// sub-agent that will correctly abstain.

import { withRouteShapeWarnings } from '../route-normalize.mjs';

const ERROR_RATE_DISQUALIFY_THRESHOLD = 0.5;

export const metadata = {
  id: 'slow_route',
  threshold: '(p95 > 500 AND inv >= 1400) OR (p95 > 1500 AND inv >= 250); disqualified when 5xx rate > 50%; Vercel Workflow runtime endpoints are hard-gated',
  billingDimension: 'function-duration',
  scope: 'route',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Routes with p95 function duration above 500ms at meaningful traffic (>=1,400 invocations in window), OR catastrophically slow routes (>1500ms p95 at any volume >=250). High duration drives both function-duration cost and user-perceived latency. Investigate sequential awaits, slow external APIs, missing caching, N+1 patterns. Routes with >50% 5xx rate are disqualified — those are reliability problems, not performance tuning targets, and surface via route_errors instead. Vercel Workflow runtime endpoints (`/.well-known/workflow/v1/*`) are hard-gated before launch because long-running step/flow requests are expected orchestration, not app-route bottlenecks.',
};

export function gate(signals) {
  const routes = extractFunctionRoutes(signals);
  const errorRates = extractErrorRatesByRoute(signals);
  return routes
    .filter((r) => (r.p95Ms > 500 && r.invocations >= 1400) || (r.p95Ms > 1500 && r.invocations >= 250))
    .map((r) => {
      const errorRate = errorRates.get(r.route);
      const candidate = {
        kind: metadata.id,
        scope: 'route',
        route: r.route,
        files: [],
        priority: Math.round(r.p95Ms * Math.max(r.invocations, 1) / 1000),
        confidence: 0.94,
        o11ySignal: `inv=${r.invocations},p95=${r.p95Ms}ms${errorRate != null ? `,5xx=${(errorRate * 100).toFixed(0)}%` : ''}`,
        reason: 'slow high-traffic route',
        question: `What is the concrete bottleneck in ${r.route} (p95=${r.p95Ms}ms over ${r.invocations} invocations), and which file-level change would reduce it?`,
        evidence: { metric: 'fnDurationP95ByRoute', route: r.route, p95Ms: r.p95Ms, invocations: r.invocations, errorRate },
      };
      if (errorRate != null && errorRate > ERROR_RATE_DISQUALIFY_THRESHOLD) {
        candidate.disqualified = true;
        candidate.disqualifyReason = `high error rate (${(errorRate * 100).toFixed(0)}% 5xx — reliability issue, not performance; covered by route_errors gate)`;
      }
      return withRouteShapeWarnings(candidate, signals);
    });
}

// Routes without status data are absent from the map → gate falls back to "no disqualification".
function extractErrorRatesByRoute(signals) {
  const m = signals.metrics?.fnStatusByRoute;
  const out = new Map();
  if (!Array.isArray(m?.rows)) return out;
  const perRoute = new Map();
  for (const row of m.rows) {
    if (!row?.route) continue;
    const v = row.value ?? 0;
    const prior = perRoute.get(row.route) ?? { errors5xx: 0, total: 0 };
    if (/^5/.test(String(row.http_status ?? ''))) prior.errors5xx += v;
    prior.total += v;
    perRoute.set(row.route, prior);
  }
  for (const [route, r] of perRoute) {
    if (r.total > 0) out.set(route, r.errors5xx / r.total);
  }
  return out;
}

function extractFunctionRoutes(signals) {
  const dur = signals.metrics?.fnDurationP95ByRoute;
  if (!dur?.ok && !Array.isArray(dur?.rows)) return [];
  const req = signals.metrics?.requestsByRouteCache;

  const invByRoute = new Map();
  for (const row of (req?.rows ?? [])) {
    if (!row.route) continue;
    invByRoute.set(row.route, (invByRoute.get(row.route) ?? 0) + (row.value ?? 0));
  }

  return (dur?.rows ?? [])
    .filter((r) => r.route)
    .map((r) => ({
      route: r.route,
      p95Ms: Math.round(r.value ?? 0),
      invocations: invByRoute.get(r.route) ?? 0,
    }));
}
