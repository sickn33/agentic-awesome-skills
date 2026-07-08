// Declarative metric-query registry. Single source for every `vercel metrics ...` call.
//
// CLI default --since is 1h. Mixing 1h with 14d windows silently produces incompatible rollups — every query MUST pass since: TIME_WINDOW. test/time-window.test.mjs enforces this.
// 14d: long enough for weekly cycles, short enough to surface recent regressions before stale data dilutes them.

import { normalizeSummary } from './vercel.mjs';

export const TIME_WINDOW = '14d';

// CLI default cardinality cap is 10 — too small for a typical app.
const ROUTE_LIMIT = 200;
const HOST_LIMIT = 50;
const DIM_LIMIT = 50;

// CLI emits value under `<metric_id_with_underscores>_<aggregation>` (e.g. `vercel_request_count_sum`).
function defaultNormalize(metricId, aggregation, groupBy) {
  return (resp) => ({ rows: normalizeSummary(resp, metricId, aggregation, groupBy) });
}

// Collapse (route × function_start_type) rows into one row per route. Observed values: "cold", "hot", "prewarmed".
function normalizeColdStart(metricId, aggregation) {
  return (resp) => {
    const rows = normalizeSummary(resp, metricId, aggregation, ['route', 'function_start_type']);
    const byRoute = new Map();
    for (const r of rows) {
      if (!r.route) continue;
      const prior = byRoute.get(r.route) ?? { route: r.route, total: 0, coldCount: 0, warmCount: 0, prewarmedCount: 0 };
      const v = r.value ?? 0;
      prior.total += v;
      if (r.function_start_type === 'cold') prior.coldCount += v;
      else if (r.function_start_type === 'hot') prior.warmCount += v;
      else if (r.function_start_type === 'prewarmed') prior.prewarmedCount += v;
      byRoute.set(r.route, prior);
    }
    return {
      rows: [...byRoute.values()].map((r) => ({
        ...r,
        coldPct: r.total > 0 ? r.coldCount / r.total : 0,
      })),
    };
  };
}

export const QUERIES = [
  {
    id: 'requestsByRouteCache',
    metricId: 'vercel.request.count',
    aggregation: 'sum',
    groupBy: ['route', 'cache_result'],
    limit: ROUTE_LIMIT,
    description: 'Request count per route × cache_result. Source of cache hit rate; total invocations folds across cache_result.',
  },
  {
    id: 'fnDurationP95ByRoute',
    metricId: 'vercel.function_invocation.function_duration_ms',
    aggregation: 'p95',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'p95 wall-clock function duration per route. Canonical slow-route signal.',
  },
  {
    id: 'requestsByRouteStatus',
    metricId: 'vercel.request.count',
    aggregation: 'sum',
    groupBy: ['route', 'http_status'],
    limit: ROUTE_LIMIT,
    description: 'Request count per route × http_status. Compatibility fallback for older route_errors fixtures.',
  },
  {
    id: 'fnStatusByRoute',
    metricId: 'vercel.function_invocation.count',
    aggregation: 'sum',
    groupBy: ['route', 'http_status'],
    limit: ROUTE_LIMIT,
    description: 'Function invocation count per route × http_status. Canonical 5xx source for slow_route disqualification and route_errors.',
  },
  {
    id: 'requestsByRouteMethod',
    metricId: 'vercel.request.count',
    aggregation: 'sum',
    groupBy: ['route', 'request_method'],
    limit: ROUTE_LIMIT,
    description: 'Request count per route × request_method. Uncached_route gate uses this to skip mostly-POST routes (Server Actions, mutations) where 0% cache is correct behavior.',
  },
  {
    id: 'externalApiP75',
    metricId: 'vercel.external_api_request.request_duration_ms',
    aggregation: 'p75',
    groupBy: ['origin_hostname'],
    limit: HOST_LIMIT,
    description: 'p75 external API duration per origin hostname.',
  },

  {
    id: 'fnStartTypeByRoute',
    metricId: 'vercel.function_invocation.count',
    aggregation: 'sum',
    groupBy: ['route', 'function_start_type'],
    limit: ROUTE_LIMIT,
    description: 'Function invocation count split by cold | hot | prewarmed. Feeds cold_start gate.',
    normalizer: normalizeColdStart('vercel.function_invocation.count', 'sum'),
  },
  {
    id: 'fnGbHrByRoute',
    metricId: 'vercel.function_invocation.function_duration_gbhr',
    aggregation: 'sum',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Billed GB-hours per route (function duration in Fluid billing).',
  },
  {
    id: 'fnCpuMsByRoute',
    metricId: 'vercel.function_invocation.function_cpu_time_ms',
    aggregation: 'sum',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Active CPU time per route. Fluid Compute bills on this; high CPU = expensive route.',
  },
  {
    id: 'fnPeakMemoryByRoute',
    metricId: 'vercel.function_invocation.peak_memory_mb',
    aggregation: 'max',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Peak memory observed per route. Compared against provisioned to right-size.',
  },
  {
    id: 'fnProvisionedMemoryByRoute',
    metricId: 'vercel.function_invocation.provisioned_memory_mb',
    aggregation: 'max',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Provisioned memory per route. Feeds oversized_memory gate.',
  },
  {
    id: 'fnTtfbP95ByRoute',
    metricId: 'vercel.function_invocation.ttfb_ms',
    aggregation: 'p95',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Server-measured time-to-first-byte per route. Complements function_duration_ms p95.',
  },

  {
    id: 'fdtByRoute',
    metricId: 'vercel.request.fdt_total_bytes',
    aggregation: 'sum',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Fast Data Transfer bytes per route. Bandwidth cost driver.',
  },
  {
    id: 'fdtByBot',
    metricId: 'vercel.request.fdt_total_bytes',
    aggregation: 'sum',
    groupBy: ['bot_category'],
    limit: DIM_LIMIT,
    description: 'FDT bytes by bot category. Empty `bot_category` = human traffic; non-empty = bots.',
  },
  {
    id: 'fdtByCache',
    metricId: 'vercel.request.fdt_total_bytes',
    aggregation: 'sum',
    groupBy: ['cache_result'],
    limit: DIM_LIMIT,
    description: 'FDT bytes by cache_result. Uncached vs cached bandwidth.',
  },

  {
    id: 'middlewareCount',
    metricId: 'vercel.middleware_invocation.count',
    aggregation: 'sum',
    groupBy: ['request_path'],
    limit: ROUTE_LIMIT,
    description: 'Middleware invocations per request_path. Heavy middleware traffic = missing matcher.',
  },
  {
    id: 'middlewareDurationP95',
    metricId: 'vercel.middleware_invocation.duration_ms',
    aggregation: 'p95',
    groupBy: ['request_path'],
    limit: ROUTE_LIMIT,
    description: 'p95 middleware duration per request_path.',
  },

  {
    id: 'isrReadsByRoute',
    metricId: 'vercel.isr_operation.read_units',
    aggregation: 'sum',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'ISR read units per route. Healthy when high relative to writes.',
  },
  {
    id: 'isrWritesByRoute',
    metricId: 'vercel.isr_operation.write_units',
    aggregation: 'sum',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'ISR write units per route. High writes/reads = over-aggressive revalidate.',
  },

  {
    id: 'imageCount',
    metricId: 'vercel.image_transformation.count',
    aggregation: 'sum',
    groupBy: [],
    limit: 1,
    description: 'Total image transformations performed.',
  },
  {
    id: 'imageByHost',
    metricId: 'vercel.image_transformation.count',
    aggregation: 'sum',
    groupBy: ['source_image_hostname'],
    limit: HOST_LIMIT,
    description: 'Image transformations per source hostname. Identify which hosts dominate the bill.',
  },
  {
    id: 'imageSourceBytes',
    metricId: 'vercel.image_transformation.source_size_bytes',
    aggregation: 'sum',
    groupBy: [],
    limit: 1,
    description: 'Bytes of source images optimized. High = ingress bandwidth cost.',
  },

  {
    id: 'cwvLcpByRoute',
    metricId: 'vercel.speed_insights_metric.lcp',
    aggregation: 'p75',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'p75 Largest Contentful Paint per route. > 2500ms = poor.',
  },
  {
    id: 'cwvInpByRoute',
    metricId: 'vercel.speed_insights_metric.inp',
    aggregation: 'p75',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'p75 Interaction to Next Paint per route. > 200ms = poor.',
  },
  {
    id: 'cwvClsByRoute',
    metricId: 'vercel.speed_insights_metric.cls',
    aggregation: 'p75',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'p75 Cumulative Layout Shift per route. > 0.1 = poor.',
  },
  {
    id: 'cwvTtfbByRoute',
    metricId: 'vercel.speed_insights_metric.ttfb_ms',
    aggregation: 'p75',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'p75 client-measured TTFB per route.',
  },
  {
    id: 'cwvCount',
    metricId: 'vercel.speed_insights_metric.count',
    aggregation: 'sum',
    groupBy: [],
    limit: 1,
    description: 'Total Speed Insights measurements. Use to decide whether CWV gates have enough signal.',
  },
  {
    id: 'cwvCountByRoute',
    metricId: 'vercel.speed_insights_metric.count',
    aggregation: 'sum',
    groupBy: ['route'],
    limit: ROUTE_LIMIT,
    description: 'Speed Insights measurements per route. CWV route gates require at least 50 samples on the specific route.',
  },

  {
    id: 'firewallByAction',
    metricId: 'vercel.firewall_action.count',
    aggregation: 'sum',
    groupBy: ['waf_action'],
    limit: DIM_LIMIT,
    description: 'Firewall action count per waf_action (allow | challenge | block | log).',
  },
  {
    id: 'botIdChecks',
    metricId: 'vercel.bot_id_check.count',
    aggregation: 'sum',
    groupBy: [],
    limit: 1,
    description: 'Total BotID checks. > 0 confirms BotID is wired up; = 0 confirms it is not.',
  },

  {
    id: 'externalApiCount',
    metricId: 'vercel.external_api_request.count',
    aggregation: 'sum',
    groupBy: ['origin_hostname'],
    limit: HOST_LIMIT,
    description: 'External API call count per origin hostname.',
  },
  {
    id: 'externalApiBytes',
    metricId: 'vercel.external_api_request.transfer_bytes',
    aggregation: 'sum',
    groupBy: ['origin_hostname'],
    limit: HOST_LIMIT,
    description: 'Outbound bytes per external API hostname.',
  },
];

export function normalizerFor(entry) {
  if (entry.normalizer) return entry.normalizer;
  return defaultNormalize(entry.metricId, entry.aggregation, entry.groupBy);
}
