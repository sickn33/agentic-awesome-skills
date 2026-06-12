// Deterministic post-deep-dive reconciliation.
//
// Runs after metrics deep-dive and before investigation briefs. Its job is to
// prevent weak candidates from consuming investigator budget when the
// follow-up metric evidence already disproves or reframes the gate hypothesis.

const SLOW_ROUTE_P95_THRESHOLD_MS = 500;
const ERROR_RATE_DOMINATES_THRESHOLD = 0.5;
const DEPLOYMENT_OUTLIER_MULTIPLE = 2;
const DEPLOYMENT_OUTLIER_MIN_MS = 1000;
const ROUTE_ERROR_CONFIRMATION_RATIO = 0.1;
const UNCACHED_HEALTHY_HIT_RATE = 0.9;
const UNCACHED_MIN_GET_SHARE = 0.2;
const ISR_WRITE_FLOOR = 100;
const ISR_WRITE_READ_RATIO_THRESHOLD = 0.5;

const SCANNER_ONLY_KINDS = new Set([
  'cache_header_gap',
  'image_optimization',
  'rendering_candidate',
]);

export function reconcileInvestigation(investigation, { gate = null } = {}) {
  if (!investigation || typeof investigation !== 'object') {
    throw new TypeError('reconcileInvestigation investigation must be an object');
  }

  const preResolvedRecords = [];
  const reconciliation = {
    droppedBeforeInvestigation: 0,
    reasons: {},
  };

  const reconcilePool = (pool, group) => {
    if (!Array.isArray(pool)) return [];
    const kept = [];
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const decision = reconcileCandidate(candidate, { group, index: i, gate });
      if (decision.keep) {
        kept.push(candidate);
        continue;
      }
      reconciliation.droppedBeforeInvestigation++;
      reconciliation.reasons[decision.reasonCode] = (reconciliation.reasons[decision.reasonCode] ?? 0) + 1;
      preResolvedRecords.push(decision.record);
    }
    return kept;
  };

  const priorPreResolved = Array.isArray(investigation.preResolvedRecords)
    ? investigation.preResolvedRecords
    : [];

  return {
    ...investigation,
    toLaunch: reconcilePool(investigation.toLaunch, 'toLaunch'),
    platform: reconcilePool(investigation.platform, 'platform'),
    preResolvedRecords: [...priorPreResolved, ...preResolvedRecords],
    reconciliation: {
      ...(investigation.reconciliation ?? {}),
      ...reconciliation,
    },
  };
}

export function reconcileCandidate(candidate, ctx = {}) {
  if (!candidate || typeof candidate !== 'object') return { keep: true };

  const scannerOnly = scannerOnlyDecision(candidate, ctx);
  if (scannerOnly) return scannerOnly;

  if (candidate.kind === 'slow_route') {
    const errorDecision = slowRouteErrorDecision(candidate, ctx);
    if (errorDecision) return errorDecision;

    const mismatchDecision = slowRouteMetricMismatchDecision(candidate, ctx);
    if (mismatchDecision) return mismatchDecision;

    const regressionDecision = deploymentRegressionDecision(candidate, ctx);
    if (regressionDecision) return regressionDecision;
  }

  if (candidate.kind === 'route_errors') {
    const mismatchDecision = routeErrorsMetricMismatchDecision(candidate, ctx);
    if (mismatchDecision) return mismatchDecision;
  }

  if (candidate.kind === 'uncached_route') {
    const cacheDecision = uncachedRouteCacheDecision(candidate, ctx);
    if (cacheDecision) return cacheDecision;
    const methodDecision = uncachedRouteMethodDecision(candidate, ctx);
    if (methodDecision) return methodDecision;
  }

  if (candidate.kind === 'isr_overrevalidation') {
    const isrDecision = isrOverrevalidationDecision(candidate, ctx);
    if (isrDecision) return isrDecision;
  }

  return { keep: true };
}

function scannerOnlyDecision(candidate, ctx) {
  if (!SCANNER_ONLY_KINDS.has(candidate.kind)) return null;
  if (candidate.o11ySignal !== 'scanner-only') return null;
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'scanner_only_no_metric',
    reason: 'Static scanner found a possible optimization, but no Vercel metric tied traffic or cost to this target.',
    observation: {
      kind: 'scanner_only_no_metric',
      summary: `${targetLabel(candidate)} has a static scanner finding, but no route-level Vercel metric signal.`,
      evidence: `gate signal=${candidate.o11ySignal}`,
      suggestedAction: 'Do not ship a recommendation from this finding unless a Vercel metric shows material traffic, cost, or latency for the same target.',
    },
  });
}

function slowRouteMetricMismatchDecision(candidate, ctx) {
  const p95 = numberAt(candidate, ['evidence', 'deepDive', 'latency', 'p95']);
  if (p95 == null) return null;
  if (p95 >= SLOW_ROUTE_P95_THRESHOLD_MS) return null;
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'metric_mismatch',
    reason: `Deep-dive p95 (${formatMs(p95)}) is below the slow-route threshold, so the broad gate did not survive follow-up verification.`,
    observation: {
      kind: 'metric_mismatch',
      summary: `${targetLabel(candidate)} was flagged as slow in the broad pass, but follow-up p95 is below threshold.`,
      evidence: `${candidate.o11ySignal ?? 'gate signal unavailable'}; deepDive.latency.p95=${formatMs(p95)}`,
      suggestedAction: 'Skip code investigation for this run. Re-check only if the broad and follow-up windows converge in a later run.',
    },
  });
}

function slowRouteErrorDecision(candidate, ctx) {
  const rows = arrayAt(candidate, ['evidence', 'deepDive', 'statusDistribution']);
  if (rows.length === 0) return null;
  let total = 0;
  let errors = 0;
  for (const row of rows) {
    const value = numberValue(row?.value);
    if (value == null) continue;
    total += value;
    if (/^5/.test(String(row.http_status ?? ''))) errors += value;
  }
  if (total <= 0) return null;
  const rate = errors / total;
  if (rate <= ERROR_RATE_DOMINATES_THRESHOLD) return null;
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'error_storm',
    reason: `Function-level 5xx responses dominate this route (${formatPct(rate)}), so this is a reliability finding rather than a slow-route finding.`,
    observation: {
      kind: 'error_storm',
      summary: `${targetLabel(candidate)} latency is dominated by function-level 5xx responses.`,
      evidence: `deepDive.statusDistribution: ${formatInteger(errors)} 5xx of ${formatInteger(total)} function invocations (${formatPct(rate)})`,
      suggestedAction: 'Investigate as route_errors with runtime logs and error classification before making performance recommendations.',
    },
  });
}

function deploymentRegressionDecision(candidate, ctx) {
  const rows = arrayAt(candidate, ['evidence', 'deepDive', 'perDeployment'])
    .filter((row) => row && typeof row.deployment_id === 'string' && numberValue(row.value) != null)
    .map((row) => ({ deploymentId: row.deployment_id, p95: numberValue(row.value) }))
    .sort((a, b) => b.p95 - a.p95);

  if (rows.length < 3) return null;
  const [worst, second] = rows;
  if (!worst || !second || worst.p95 < DEPLOYMENT_OUTLIER_MIN_MS) return null;
  if (worst.p95 < second.p95 * DEPLOYMENT_OUTLIER_MULTIPLE) return null;

  return dropWithObservation(candidate, ctx, {
    reasonCode: 'deployment_regression',
    reason: `One deployment is a large latency outlier (${worst.deploymentId} at ${formatMs(worst.p95)}), so the next action is regression triage rather than generic code optimization.`,
    observation: {
      kind: 'deployment_regression',
      summary: `${targetLabel(candidate)} p95 is concentrated in one deployment.`,
      evidence: `${worst.deploymentId} p95=${formatMs(worst.p95)} vs next highest ${second.deploymentId} p95=${formatMs(second.p95)}`,
      suggestedAction: 'Compare the outlier deployment against the prior deployment and inspect runtime logs before recommending a code-level performance change.',
    },
  });
}

function routeErrorsMetricMismatchDecision(candidate, ctx) {
  const broadErrors = numberAt(candidate, ['evidence', 'count']) ?? parseSignalNumber(candidate.o11ySignal, 'errs');
  if (broadErrors == null || broadErrors < 1000) return null;
  const rows = [
    ...arrayAt(candidate, ['evidence', 'deepDive', 'errorStatusPattern']),
    ...arrayAt(candidate, ['evidence', 'deepDive', 'errorsByDeployment']),
  ];
  if (rows.length === 0) return null;
  let confirmed5xx = 0;
  for (const row of rows) {
    if (!/^5\d\d$/.test(String(row?.http_status ?? ''))) continue;
    const value = numberValue(row?.value);
    if (value != null) confirmed5xx += value;
  }
  // errorStatusPattern and errorsByDeployment can both be present; avoid
  // double-count inflation by taking the lower non-zero route-level view when available.
  const statusRows = arrayAt(candidate, ['evidence', 'deepDive', 'errorStatusPattern']);
  const status5xx = sumRows(statusRows, (row) => /^5\d\d$/.test(String(row?.http_status ?? '')));
  if (status5xx > 0) confirmed5xx = status5xx;
  if (confirmed5xx >= broadErrors * ROUTE_ERROR_CONFIRMATION_RATIO) return null;
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'metric_mismatch',
    reason: `Deep-dive 5xx volume (${formatInteger(confirmed5xx)}) does not confirm the broad route_errors gate (${formatInteger(broadErrors)}).`,
    observation: {
      kind: 'metric_mismatch',
      summary: `${targetLabel(candidate)} was flagged for 5xx errors, but follow-up status data did not confirm the volume.`,
      evidence: `${candidate.o11ySignal ?? 'gate signal unavailable'}; deepDive.confirmed5xx=${formatInteger(confirmed5xx)}`,
      suggestedAction: 'Skip code recommendations from this run. Re-run with refreshed status metrics or runtime logs if the route is still suspected.',
    },
  });
}

function uncachedRouteCacheDecision(candidate, ctx) {
  const rows = arrayAt(candidate, ['evidence', 'deepDive', 'cacheBreakdown']);
  if (rows.length === 0) return null;
  const total = sumRows(rows);
  if (total <= 0) return null;
  const hits = sumRows(rows, (row) => ['HIT', 'STALE'].includes(String(row?.cache_result ?? '').toUpperCase()));
  const hitRate = hits / total;
  if (hitRate < UNCACHED_HEALTHY_HIT_RATE) return null;
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'metric_mismatch',
    reason: `Deep-dive cache hit rate (${formatPct(hitRate)}) is already healthy, so the uncached-route gate did not survive follow-up verification.`,
    observation: {
      kind: 'metric_mismatch',
      summary: `${targetLabel(candidate)} was flagged as low-cache, but follow-up cache data is already healthy.`,
      evidence: `${candidate.o11ySignal ?? 'gate signal unavailable'}; deepDive.cacheHitRate=${formatPct(hitRate)}`,
      suggestedAction: 'Skip cache recommendations for this candidate unless a later run shows sustained MISS/BYPASS traffic.',
    },
  });
}

function uncachedRouteMethodDecision(candidate, ctx) {
  const rows = arrayAt(candidate, ['evidence', 'deepDive', 'methodDistribution']);
  if (rows.length === 0) return null;
  const total = sumRows(rows);
  if (total <= 0) return null;
  const gets = sumRows(rows, (row) => String(row?.request_method ?? '').toUpperCase() === 'GET');
  const getShare = gets / total;
  if (getShare >= UNCACHED_MIN_GET_SHARE) return null;
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'protocol_mismatch',
    reason: `Deep-dive GET share (${formatPct(getShare)}) is below the cacheable-route floor, so this is not a good shared-cache candidate.`,
    observation: {
      kind: 'protocol_mismatch',
      summary: `${targetLabel(candidate)} is not GET-heavy enough for a shared-cache recommendation.`,
      evidence: `${candidate.o11ySignal ?? 'gate signal unavailable'}; deepDive.getShare=${formatPct(getShare)}`,
      suggestedAction: 'Do not recommend CDN caching for this route from aggregate traffic alone. Investigate write-path cost only if another metric gate fires.',
    },
  });
}

function isrOverrevalidationDecision(candidate, ctx) {
  const writeRows = arrayAt(candidate, ['evidence', 'deepDive', 'writePattern']);
  const readRows = arrayAt(candidate, ['evidence', 'deepDive', 'readPattern']);
  if (writeRows.length === 0 && readRows.length === 0) return null;
  const writes = sumRows(writeRows);
  const reads = sumRows(readRows);
  const ratio = reads > 0 ? writes / reads : (writes > 0 ? Infinity : 0);
  if (reads <= 0) {
    return dropWithObservation(candidate, ctx, {
      reasonCode: 'metric_mismatch',
      reason: 'Deep-dive ISR read units were not present, so the write/read over-revalidation signal was not confirmed.',
      observation: {
        kind: 'metric_mismatch',
        summary: `${targetLabel(candidate)} was flagged for ISR over-revalidation, but follow-up ISR read data was empty.`,
        evidence: `${candidate.o11ySignal ?? 'gate signal unavailable'}; deepDive.isrWrites=${formatInteger(writes)}; deepDive.isrReads=${formatInteger(reads)}`,
        suggestedAction: 'Skip ISR recommendations for this candidate unless a later run confirms both ISR writes and reads for the same route.',
      },
    });
  }
  if (writes >= ISR_WRITE_FLOOR && ratio > ISR_WRITE_READ_RATIO_THRESHOLD) return null;
  const ratioLabel = ratio === Infinity ? 'Infinity' : ratio.toFixed(2);
  return dropWithObservation(candidate, ctx, {
    reasonCode: 'metric_mismatch',
    reason: `Deep-dive ISR writes per read (${ratioLabel}) no longer crosses the over-revalidation threshold.`,
    observation: {
      kind: 'metric_mismatch',
      summary: `${targetLabel(candidate)} was flagged for ISR over-revalidation, but follow-up ISR data did not confirm it.`,
      evidence: `${candidate.o11ySignal ?? 'gate signal unavailable'}; deepDive.isrWrites=${formatInteger(writes)}; deepDive.isrReads=${formatInteger(reads)}; ratio=${ratioLabel}`,
      suggestedAction: 'Skip ISR recommendations for this candidate unless a later run shows sustained write amplification.',
    },
  });
}

function dropWithObservation(candidate, ctx, { reasonCode, reason, observation }) {
  return {
    keep: false,
    reasonCode,
    record: {
      abstain: true,
      candidateRef: candidateRefFor(candidate),
      reason,
      observation,
      reconciliation: {
        droppedBeforeInvestigation: true,
        reasonCode,
        group: ctx.group ?? null,
        index: Number.isInteger(ctx.index) ? ctx.index : null,
      },
    },
  };
}

export function candidateRefFor(candidate, files = candidate?.files) {
  if (!candidate || typeof candidate !== 'object') return 'unknown:<unknown>';
  const target = candidate.route
    ?? candidate.hostname
    ?? (Array.isArray(files) && files.length > 0 ? `<account>#${files[0]}` : '<account>');
  return `${candidate.kind ?? 'unknown'}:${target}`;
}

function targetLabel(candidate) {
  return candidate.route ?? candidate.hostname ?? candidate.files?.[0] ?? 'account-level target';
}

function arrayAt(obj, path) {
  let cur = obj;
  for (const p of path) cur = cur?.[p];
  return Array.isArray(cur) ? cur : [];
}

function numberAt(obj, path) {
  let cur = obj;
  for (const p of path) cur = cur?.[p];
  return numberValue(cur);
}

function numberValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sumRows(rows, predicate = () => true) {
  if (!Array.isArray(rows)) return 0;
  let total = 0;
  for (const row of rows) {
    if (!predicate(row)) continue;
    const value = numberValue(row?.value);
    if (value != null) total += value;
  }
  return total;
}

function parseSignalNumber(signal, key) {
  if (typeof signal !== 'string') return null;
  const re = new RegExp(`(?:^|,)${key}=([\\d,.]+)`);
  const m = signal.match(re);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatMs(value) {
  const n = numberValue(value);
  if (n == null) return String(value);
  return `${Math.round(n)}ms`;
}

function formatPct(value) {
  const n = numberValue(value);
  if (n == null) return String(value);
  return `${(n * 100).toFixed(n >= 0.1 ? 1 : 2)}%`;
}

function formatInteger(value) {
  const n = numberValue(value);
  if (n == null) return String(value);
  return Math.round(n).toLocaleString('en-US');
}
