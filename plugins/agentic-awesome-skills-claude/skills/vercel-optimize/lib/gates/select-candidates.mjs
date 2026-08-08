// Deterministic launch selection for the code-scope investigation budget.
//
// Raw priority still orders candidates inside each pass. The default budget is
// impact-first, with failure-mode diversity when a kind's top signal is large
// enough to justify taking a first-pass slot.

const DEFAULT_KIND_CAPS = new Map([
  ['slow_route', 2],
  ['uncached_route', 2],
  ['route_errors', 2],
]);

const DIVERSITY_ELIGIBILITY = new Map([
  // A handful of 5xx errors can pass the route_errors gate because the rate is
  // high, but that should not displace much larger cost/performance signals in
  // the default six-candidate pass.
  ['route_errors', (candidate) => numberFromEvidence(candidate, 'count') >= 1000],

  // Scanner-driven cache findings are valuable, but the default pass should
  // spend a slot only when observability shows meaningful route traffic or a
  // very slow route handler.
  ['cache_header_gap', (candidate) => {
    const invocations = numberFromSignal(candidate?.o11ySignal, 'inv');
    const p95Ms = durationMsFromSignal(candidate?.o11ySignal, 'p95');
    return invocations >= 50_000 || p95Ms >= 2000;
  }],
  ['rendering_candidate', (candidate) => numberFromSignal(candidate?.o11ySignal, 'inv') >= 50_000],
]);

export function selectLaunchCandidates(candidates, budget, { diversify = false } = {}) {
  const pool = Array.isArray(candidates) ? candidates : [];
  if (budget === Infinity) {
    return { selected: pool, skipped: [], selectionMode: 'all' };
  }
  if (!Number.isInteger(budget) || budget < 1) {
    throw new TypeError('selectLaunchCandidates budget must be a positive integer or Infinity');
  }
  if (!diversify) {
    return {
      selected: pool.slice(0, budget),
      skipped: pool.slice(budget),
      selectionMode: 'priority',
    };
  }

  const selected = [];
  const selectedKeys = new Set();
  const countsByKind = new Map();

  const add = (candidate) => {
    const key = candidateIdentity(candidate);
    if (selectedKeys.has(key)) return false;
    selectedKeys.add(key);
    selected.push(candidate);
    const kind = candidate.kind ?? '<unknown>';
    countsByKind.set(kind, (countsByKind.get(kind) ?? 0) + 1);
    return true;
  };

  // First pass: one candidate per failure mode, preserving the existing sorted
  // order. This is where the default run gets broad coverage, but only for
  // kinds whose signal is strong enough for a default slot.
  for (const candidate of pool) {
    if (selected.length >= budget) break;
    const kind = candidate.kind ?? '<unknown>';
    if ((countsByKind.get(kind) ?? 0) > 0) continue;
    if (!isDiversityEligible(candidate)) continue;
    add(candidate);
  }

  // Second pass: allow a second entry for high-frequency families, but avoid
  // letting slow_route consume the entire default budget when other kinds exist.
  for (const candidate of pool) {
    if (selected.length >= budget) break;
    const kind = candidate.kind ?? '<unknown>';
    const cap = DEFAULT_KIND_CAPS.get(kind) ?? 1;
    if ((countsByKind.get(kind) ?? 0) >= cap) continue;
    if (!isDiversityEligible(candidate)) continue;
    add(candidate);
  }

  // Final fill: if the project only has one or two candidate kinds, use the
  // whole requested budget rather than leaving slots empty.
  for (const candidate of pool) {
    if (selected.length >= budget) break;
    add(candidate);
  }

  return {
    selected,
    skipped: pool.filter((candidate) => !selectedKeys.has(candidateIdentity(candidate))),
    selectionMode: 'diverse-default',
  };
}

function candidateIdentity(candidate) {
  return [
    candidate?.kind ?? '',
    candidate?.route ?? '',
    candidate?.hostname ?? '',
    candidate?.scope ?? '',
    candidate?.o11ySignal ?? '',
  ].join('\u0000');
}

function isDiversityEligible(candidate) {
  const fn = DIVERSITY_ELIGIBILITY.get(candidate?.kind);
  return fn ? fn(candidate) : true;
}

function numberFromEvidence(candidate, key) {
  const value = candidate?.evidence?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function numberFromSignal(signal, key) {
  if (typeof signal !== 'string') return 0;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|,)${escaped}=([\\d.]+)`);
  const m = re.exec(signal);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

function durationMsFromSignal(signal, key) {
  if (typeof signal !== 'string') return 0;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|,)${escaped}=([\\d.]+)ms`);
  const m = re.exec(signal);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}
