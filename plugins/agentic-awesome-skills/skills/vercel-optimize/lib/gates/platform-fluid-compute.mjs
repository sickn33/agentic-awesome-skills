// Second branch (slow p95 + traffic floor) keeps the gate useful on teams where
// cold-start isn't directly observable — common on CLI v53 — trading specificity for coverage.
export const metadata = {
  id: 'platform_fluid_compute',
  threshold: 'fluid=false AND (any cold_start signal OR any route with p95>1000ms AND inv>1000)',
  billingDimension: 'function-duration',
  scope: 'account',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'When Fluid Compute is disabled on a project that shows cold-start pressure (high cold-start rate) or sustained slow function p95 on hot routes. Fluid Compute reduces cold starts via instance reuse — recommend turning it on at the project level rather than per-route.',
};

export function gate(signals) {
  // If project config failed to load we can't tell if Fluid is on; recommending it when already-on
  // erodes trust badly, so stay silent and let Strengths note the gap.
  if (signals.project?.error) return [];

  const fluidEnabled =
    signals.project?.resourceConfig?.fluid === true
    || signals.project?.defaultResourceConfig?.fluid === true;
  if (fluidEnabled) return [];

  const cold = extractHighColdRoutes(signals);
  const slow = extractSlowHotRoutes(signals);
  if (cold.length === 0 && slow.length === 0) return [];

  return [{
    kind: metadata.id,
    scope: 'account',
    files: [],
    priority: 50,
    confidence: cold.length > 0 ? 0.85 : 0.65,
    o11ySignal: cold.length > 0
      ? `${cold.length} route(s) with high cold-start rate`
      : `${slow.length} hot route(s) with p95>1s; cold-start not directly observable`,
    reason: cold.length > 0
      ? 'cold starts observed and Fluid Compute is disabled'
      : 'slow hot routes and Fluid Compute is disabled',
    question: 'Would enabling Fluid Compute reduce cold-start and warm-instance reuse overhead for the observed hot routes?',
    evidence: { fluidEnabled, highColdRoutes: cold.slice(0, 5), slowHotRoutes: slow.slice(0, 5) },
  }];
}

function extractHighColdRoutes(signals) {
  const live = signals.metrics?.fnStartTypeByRoute?.rows;
  if (Array.isArray(live) && live.some((r) => 'coldCount' in r || 'coldPct' in r)) {
    return live.filter((r) => r.route && (r.coldPct ?? 0) > 0.3 && (r.total ?? 0) > 100);
  }
  // Legacy pre-derived fixture shape.
  const direct = signals.metrics?.coldStartByRoute?.rows;
  if (Array.isArray(direct)) {
    return direct.filter((r) => r.route && (r.coldPct ?? 0) > 0.3 && (r.total ?? 0) > 100);
  }
  const legacy = signals.metrics?.coldStarts?.series;
  if (Array.isArray(legacy)) {
    return legacy
      .map((s) => {
        const total = s.summary?.count ?? 0;
        const coldCount = s.summary?.coldCount ?? s.summary?.sum ?? 0;
        return { route: s.groupValues?.route, total, coldPct: total > 0 ? coldCount / total : 0 };
      })
      .filter((r) => r.route && r.coldPct > 0.3 && r.total > 100);
  }
  return [];
}

function extractSlowHotRoutes(signals) {
  const dur = signals.metrics?.fnDurationP95ByRoute?.rows;
  const cache = signals.metrics?.requestsByRouteCache?.rows;
  if (!Array.isArray(dur)) return [];

  // Sum requests per route across cache_result.
  const inv = new Map();
  for (const r of (cache ?? [])) {
    if (!r.route) continue;
    inv.set(r.route, (inv.get(r.route) ?? 0) + (r.value ?? 0));
  }
  return dur
    .filter((r) => r.route)
    .map((r) => ({ route: r.route, p95Ms: Math.round(r.value ?? 0), invocations: inv.get(r.route) ?? 0 }))
    // inv>500 floor is the 14d-window equivalent of the old 1000/30d.
    .filter((r) => r.p95Ms > 1000 && r.invocations > 500);
}
