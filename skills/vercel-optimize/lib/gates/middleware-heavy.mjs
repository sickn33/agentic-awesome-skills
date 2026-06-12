// Middleware runs in front of every matching request and is billed as edge invocations.
// If >50% of traffic hits middleware, the matcher is probably broader than necessary.
export const metadata = {
  id: 'middleware_heavy',
  threshold: 'middlewareInv/totalInv > 0.5 AND middlewareInv > 1000',
  billingDimension: 'edge-requests',
  scope: 'account',
  sourceCitation: 'https://nextjs.org/docs/app/building-your-application/routing/middleware',
  description:
    'Middleware invocations cover > 50% of total requests at non-trivial volume. The matcher is probably broader than necessary; narrow it to the paths that actually need auth/rewrites/headers.',
};

export function gate(signals) {
  const middlewareInv = sumRows(signals.metrics?.middlewareCount?.rows);
  if (middlewareInv < 1000) return [];

  const totalInv = sumRows(signals.metrics?.requestsByRouteCache?.rows);
  if (totalInv === 0) return [];

  const ratio = middlewareInv / totalInv;
  if (ratio <= 0.5) return [];

  const top = [...(signals.metrics?.middlewareCount?.rows ?? [])]
    .filter((r) => r.request_path)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 5)
    .map((r) => ({ request_path: r.request_path, count: r.value ?? 0 }));

  return [{
    kind: metadata.id,
    scope: 'account',
    files: [],
    priority: Math.round(middlewareInv / 1000),
    confidence: 0.84,
    o11ySignal: `middleware_inv=${middlewareInv},total_req=${totalInv},ratio=${(ratio * 100).toFixed(0)}%`,
    reason: 'middleware ran on more than half of all requests',
    question: `Middleware invocations (${middlewareInv}) are ${(ratio * 100).toFixed(0)}% of all requests (${totalInv}). Which paths in middleware.ts require interception, and can the matcher be narrowed to exclude static assets, images, and routes that do not need rewriting?`,
    evidence: {
      metric: 'middlewareCount',
      middlewareInv,
      totalInv,
      ratio,
      topPaths: top,
    },
  }];
}

function sumRows(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((s, r) => s + (r.value ?? 0), 0);
}
