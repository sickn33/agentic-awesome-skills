// Signal: `function_start_type` dimension on `vercel.function_invocation.count` (cold|hot|prewarmed).
// Threshold WHY: 40%+ cold is fixable via Fluid keep-warm; 30% is the noise floor for serverless without keep-warm.
// total>=1000/14d (~3/hr) keeps Poisson CI on cold rate at ~±5% near the 40% threshold.
export const metadata = {
  id: 'cold_start',
  threshold: 'coldPct > 0.4 AND total >= 1000',
  billingDimension: 'function-duration',
  scope: 'route',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Routes where > 40% of invocations are cold-start, at meaningful traffic (>=1,000 total invocations in window). Cold starts add 200-800ms per request and break the perceived latency budget on cache-miss paths. The 40% threshold is where cold-rate becomes a real signal vs Poisson noise on serverless. Sourced from vercel.function_invocation.count grouped by function_start_type.',
};

export function gate(signals) {
  const cs = extractColdStarts(signals);
  return cs
    .filter((r) => r.coldPct > 0.4 && r.total >= 1000)
    .map((r) => ({
      kind: metadata.id,
      scope: 'route',
      route: r.route,
      files: [],
      priority: Math.round(r.total * r.coldPct),
      confidence: 0.92,
      o11ySignal: `cold=${(r.coldPct * 100).toFixed(0)}%,inv=${r.total}`,
      reason: 'high cold-start rate on hot route',
      question: `What initialization or bundle overhead makes ${r.route} cold-start ${(r.coldPct * 100).toFixed(0)}% of ${r.total} invocations?`,
      evidence: { metric: 'fnStartTypeByRoute', route: r.route, coldPct: r.coldPct, total: r.total, coldCount: r.coldCount ?? null },
    }));
}

function extractColdStarts(signals) {
  const live = signals.metrics?.fnStartTypeByRoute;
  if (Array.isArray(live?.rows) && live.rows.some((r) => 'coldCount' in r || 'coldPct' in r)) {
    return live.rows
      .filter((r) => r.route)
      .map((r) => ({
        route: r.route,
        total: r.total ?? 0,
        coldCount: r.coldCount ?? 0,
        coldPct: r.coldPct ?? 0,
      }));
  }

  // Legacy fixture: pre-derived coldStartByRoute rows.
  const direct = signals.metrics?.coldStartByRoute;
  if (Array.isArray(direct?.rows)) {
    return direct.rows
      .filter((r) => r.route)
      .map((r) => ({ route: r.route, coldPct: r.coldPct ?? 0, total: r.total ?? 0 }));
  }

  // Older legacy fixture: series + summary shape.
  const legacy = signals.metrics?.coldStarts;
  if (Array.isArray(legacy?.series)) {
    return legacy.series
      .map((s) => {
        const total = s.summary?.count ?? 0;
        const coldCount = s.summary?.coldCount ?? s.summary?.sum ?? 0;
        return { route: s.groupValues?.route, total, coldPct: total > 0 ? coldCount / total : 0 };
      })
      .filter((r) => r.route);
  }

  return [];
}
