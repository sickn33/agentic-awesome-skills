// Observability Events is the metered SKU under Observability Plus.
// Threshold at >20% surfaces material spend; >30% is the critical band.
// Drivers correlate with low cache hit rate, high middleware invocation, and high custom-span cardinality.
export const metadata = {
  id: 'observability_events_attribution',
  threshold: 'observabilityEventsShare > 0.20 (critical at > 0.30)',
  billingDimension: 'observability-events',
  scope: 'account',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Observability Events line item exceeds 20% of total billed cost. High share usually traces to low cache hit rate, middleware-heavy traffic, or unconstrained custom-span cardinality. No sampling lever exists for Observability Plus; reduce upstream invocations instead.',
};

const EVENTS_RE = /^Observability Events$/i;

export function gate(signals) {
  const services = signals?.usage?.services;
  if (!Array.isArray(services) || services.length === 0) return [];

  const total = sumBilled(services);
  if (total <= 0) return [];

  const eventsBilled = services
    .filter((s) => EVENTS_RE.test(String(s?.name ?? '')))
    .reduce((acc, s) => acc + Number(s.billedCost ?? s.cost ?? 0), 0);
  if (eventsBilled <= 0) return [];

  const share = eventsBilled / total;
  if (share <= 0.20) return [];

  const critical = share > 0.30;

  return [{
    kind: metadata.id,
    scope: 'account',
    files: [],
    priority: critical ? 70 : 55,
    confidence: 0.82,
    o11ySignal: `observability_events_share=${(share * 100).toFixed(0)}%`,
    reason: critical
      ? 'observability events exceed 30% of total billed cost'
      : 'observability events exceed 20% of total billed cost',
    question: `Observability Events are ${(share * 100).toFixed(0)}% of the bill. Which routes drive event volume — low-cache-hit traffic, broad middleware invocation, or high custom-span cardinality — and can event volume be reduced upstream of the meter?`,
    evidence: {
      metric: 'usage.services',
      eventsBilled,
      totalBilled: total,
      observabilityEventsShare: share,
      critical,
    },
  }];
}

function sumBilled(services) {
  return services.reduce((acc, s) => acc + Number(s.billedCost ?? s.cost ?? 0), 0);
}
