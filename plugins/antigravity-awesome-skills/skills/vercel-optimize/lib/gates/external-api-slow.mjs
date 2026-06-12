// Volume floor pairs p75 with call_count so a single 5s cron/day doesn't fire the gate.
const MIN_CALL_COUNT = 500;

export const metadata = {
  id: 'external_api_slow',
  threshold: `p75Ms > 2000 AND callCount >= ${MIN_CALL_COUNT}`,
  billingDimension: 'function-duration',
  scope: 'route',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'External API hostnames with p75 latency above 2 seconds AND at least 500 calls in the window. External API latency is a primary driver of function duration cost when the upstream is on a hot path; a single slow stale call isn\'t worth recommending against.',
};

export function gate(signals) {
  const apis = extractExternalApis(signals);
  const calls = extractCallCounts(signals);
  return apis
    .map((a) => ({ ...a, callCount: calls.get(a.hostname) ?? 0 }))
    .filter((a) => a.p75Ms > 2000 && a.callCount >= MIN_CALL_COUNT)
    .map((a) => ({
      kind: metadata.id,
      scope: 'route',
      route: null,
      files: [],
      hostname: a.hostname,
      // Weight by latency × call volume so 100k-call/2.1s outranks 1k-call/8s.
      priority: Math.round((a.p75Ms * a.callCount) / 1000),
      confidence: 0.88,
      o11ySignal: `host=${a.hostname},p75=${a.p75Ms}ms,calls=${a.callCount}`,
      reason: 'slow external dependency on hot path',
      question: `Which routes call ${a.hostname} (p75=${a.p75Ms}ms across ${a.callCount} calls), and can the call be parallelized, cached, or moved off the critical path?`,
      evidence: { metric: 'externalApiP75', hostname: a.hostname, p75Ms: a.p75Ms, callCount: a.callCount },
    }));
}

function extractExternalApis(signals) {
  const m = signals.metrics?.externalApiP75;
  if (!m?.ok && !Array.isArray(m?.rows)) return [];
  return (m?.rows ?? [])
    .map((r) => ({
      hostname: r.origin_hostname,
      p75Ms: Math.round(r.value ?? 0),
    }))
    .filter((a) => a.hostname);
}

function extractCallCounts(signals) {
  const m = signals.metrics?.externalApiCount;
  const out = new Map();
  if (!m) return out;
  for (const r of m.rows ?? []) {
    if (r?.origin_hostname) out.set(r.origin_hostname, r.value ?? 0);
  }
  return out;
}
