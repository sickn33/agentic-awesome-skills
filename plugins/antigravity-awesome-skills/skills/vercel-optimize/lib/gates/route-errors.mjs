// Errored function invocations still bill at full duration, so high-volume 5xx is a cost issue, not just reliability.
import { withRouteShapeWarnings } from '../route-normalize.mjs';

const MIN_VOLUME_FOR_RATE_EMISSION = 1000;

export const metadata = {
  id: 'route_errors',
  threshold: `count > 250 OR (totalRequests >= ${MIN_VOLUME_FOR_RATE_EMISSION} AND errorRate > 0.01)`,
  billingDimension: 'function-duration',
  scope: 'route',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'Routes producing > 250 5xx errors over the window, or with > 1% error rate on at least 1,000 total requests. Errored function invocations still bill at full duration; high error rates also poison user experience.',
};

export function gate(signals) {
  const errors = extractErrors(signals);
  return errors
    .filter((e) => e.count > 250 || (e.total >= MIN_VOLUME_FOR_RATE_EMISSION && (e.errorRate ?? 0) > 0.01))
    .map((e) => withRouteShapeWarnings({
      kind: metadata.id,
      scope: 'route',
      route: e.route,
      files: [],
      priority: e.count,
      confidence: 0.93,
      o11ySignal: e.errorRate != null
        ? `errs=${e.count},rate=${(e.errorRate * 100).toFixed(1)}%`
        : `errs=${e.count}`,
      reason: 'concentrated 5xx errors',
      question: `Why does ${e.route} produce ${e.count} 5xx errors over the window, and what code path is failing?`,
      evidence: { metric: e.metric, route: e.route, count: e.count, totalRequests: e.total, errorRate: e.errorRate },
    }, signals));
}

function extractErrors(signals) {
  const fnStatus = signals.metrics?.fnStatusByRoute;
  if (Array.isArray(fnStatus?.rows)) return extractFromStatusRows(fnStatus.rows, 'fnStatusByRoute');

  const m = signals.metrics?.requestsByRouteStatus;
  const cache = signals.metrics?.requestsByRouteCache;
  if (!m?.ok && !Array.isArray(m?.rows)) return [];

  const errors = extractFromStatusRows(m?.rows ?? [], 'requestsByRouteStatus');

  // cache rollup is summed across cache_result, giving per-route total request count.
  const totalByRoute = new Map();
  for (const row of (cache?.rows ?? [])) {
    if (!row.route) continue;
    totalByRoute.set(row.route, (totalByRoute.get(row.route) ?? 0) + (row.value ?? 0));
  }

  return errors.map((e) => {
    const total = totalByRoute.get(e.route) ?? 0;
    return {
      ...e,
      total,
      errorRate: total > 0 ? e.count / total : null,
    };
  });
}

function extractFromStatusRows(rows, metric) {
  const errByRoute = new Map();
  const totalByRoute = new Map();
  for (const row of rows) {
    const route = row.route;
    if (!route) continue;
    const v = row.value ?? 0;
    const status = String(row.http_status ?? '');
    if (/^5\d\d$/.test(status)) errByRoute.set(route, (errByRoute.get(route) ?? 0) + v);
    totalByRoute.set(route, (totalByRoute.get(route) ?? 0) + v);
  }

  return [...errByRoute.entries()].map(([route, count]) => {
    const total = totalByRoute.get(route) ?? 0;
    const errorRate = total > 0 ? count / total : null;
    return { route, count, total, errorRate, metric };
  });
}
