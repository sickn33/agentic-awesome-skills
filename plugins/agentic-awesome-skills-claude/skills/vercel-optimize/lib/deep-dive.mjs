// Per-candidate deep-dive query specs. Runs after gate, before sub-agent reads source.
//
// CLI quirks:
//   - Multi `-a` flag is NOT supported. One percentile per query.
//   - External-API "calling route" dim is `origin_route` (NOT `route`).

// Same window as broad pass so rolls are comparable.
import { TIME_WINDOW } from './queries.mjs';

export { TIME_WINDOW };

// Per-query is scoped to one route/hostname, so cardinality stays small — higher than broad-pass caps.
const DEPLOYMENT_LIMIT = 10;
const ERROR_DEPLOYMENT_LIMIT = 30;
const ERROR_CODE_LIMIT = 50;
const WAF_RULE_LIMIT = 20;
const MIDDLEWARE_PATH_LIMIT = 50;
const CALLER_LIMIT = 20;

// OData escapes a literal `'` inside a string by doubling it (`it's` → `it''s`).
export function escapeODataString(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/'/g, "''");
}

export function odataEq(dim, value) {
  return `${dim} eq '${escapeODataString(value)}'`;
}

export function odataAnd(...conds) {
  return conds.filter(Boolean).join(' and ');
}

export const SPEC_GENERATORS = {
  slow_route(c) {
    const route = c.route;
    if (!route) return [];
    const f = odataEq('route', route);
    // cacheBreakdown/bandwidthByCache let sub-agent see miss-path cost on static routes (dynamic='error' can still show p95=900ms over millions of requests).
    return [
      ...latencyPercentiles('latency', 'vercel.function_invocation.function_duration_ms', f),
      ...latencyPercentiles('ttfb', 'vercel.function_invocation.ttfb_ms', f),
      ...latencyPercentiles('cpu', 'vercel.function_invocation.function_cpu_time_ms', f, ['p95']),
      {
        id: 'startTypeSplit',
        metricId: 'vercel.function_invocation.count',
        aggregation: 'sum',
        groupBy: ['function_start_type'],
        filter: f,
        broadPassEquivalent: { key: 'fnStartTypeByRoute', routeFilter: route, projectDims: ['function_start_type'] },
      },
      // function-invocation status (5xx from function) — distinct from request-level status, can't reuse broad-pass.
      {
        id: 'statusDistribution',
        metricId: 'vercel.function_invocation.count',
        aggregation: 'sum',
        groupBy: ['http_status'],
        filter: f,
      },
      {
        id: 'perDeployment',
        metricId: 'vercel.function_invocation.function_duration_ms',
        aggregation: 'p95',
        groupBy: ['deployment_id'],
        filter: f,
        limit: DEPLOYMENT_LIMIT,
      },
      {
        id: 'cacheBreakdown',
        metricId: 'vercel.request.count',
        aggregation: 'sum',
        groupBy: ['cache_result'],
        filter: f,
        broadPassEquivalent: { key: 'requestsByRouteCache', routeFilter: route, projectDims: ['cache_result'] },
      },
      // broad-pass bandwidthByCacheResult is account-wide, so per-route still required.
      {
        id: 'bandwidthByCache',
        metricId: 'vercel.request.fdt_total_bytes',
        aggregation: 'sum',
        groupBy: ['cache_result'],
        filter: f,
      },
    ];
  },

  uncached_route(c) {
    const route = c.route;
    if (!route) return [];
    const f = odataEq('route', route);
    return [
      {
        id: 'cacheBreakdown',
        metricId: 'vercel.request.count',
        aggregation: 'sum',
        groupBy: ['cache_result'],
        filter: f,
        broadPassEquivalent: { key: 'requestsByRouteCache', routeFilter: route, projectDims: ['cache_result'] },
      },
      {
        id: 'methodDistribution',
        metricId: 'vercel.request.count',
        aggregation: 'sum',
        groupBy: ['request_method'],
        filter: f,
        broadPassEquivalent: { key: 'requestsByRouteMethod', routeFilter: route, projectDims: ['request_method'] },
      },
      {
        id: 'botShare',
        metricId: 'vercel.request.fdt_total_bytes',
        aggregation: 'sum',
        groupBy: ['bot_category'],
        filter: f,
      },
      {
        id: 'bandwidthByCache',
        metricId: 'vercel.request.fdt_total_bytes',
        aggregation: 'sum',
        groupBy: ['cache_result'],
        filter: f,
      },
    ];
  },

  cold_start(c) {
    const route = c.route;
    if (!route) return [];
    const f = odataEq('route', route);
    return [
      {
        id: 'startTypeSplit',
        metricId: 'vercel.function_invocation.count',
        aggregation: 'sum',
        groupBy: ['function_start_type'],
        filter: f,
      },
      {
        id: 'coldVsWarmLatencyP95',
        metricId: 'vercel.function_invocation.function_duration_ms',
        aggregation: 'p95',
        groupBy: ['function_start_type'],
        filter: f,
      },
      {
        id: 'coldByDeployment',
        metricId: 'vercel.function_invocation.count',
        aggregation: 'sum',
        groupBy: ['deployment_id'],
        filter: odataAnd(f, odataEq('function_start_type', 'cold')),
        limit: DEPLOYMENT_LIMIT,
      },
    ];
  },

  route_errors(c) {
    const route = c.route;
    if (!route) return [];
    const f = odataEq('route', route);
    return [
      {
        id: 'errorStatusPattern',
        metricId: 'vercel.request.count',
        aggregation: 'sum',
        groupBy: ['http_status'],
        filter: odataAnd(f, "http_status ge '500'"),
      },
      {
        id: 'errorCodes',
        metricId: 'vercel.function_invocation.count',
        aggregation: 'sum',
        groupBy: ['error_code'],
        filter: f,
        limit: ERROR_CODE_LIMIT,
      },
      {
        id: 'errorsByDeployment',
        metricId: 'vercel.function_invocation.count',
        aggregation: 'sum',
        groupBy: ['deployment_id', 'http_status'],
        filter: f,
        limit: ERROR_DEPLOYMENT_LIMIT,
      },
    ];
  },

  external_api_slow(c) {
    const host = c.hostname;
    if (!host) return [];
    const f = odataEq('origin_hostname', host);
    return [
      ...latencyPercentiles('latency', 'vercel.external_api_request.request_duration_ms', f),
      {
        // "calling route" dim is origin_route (verified via metrics schema).
        id: 'callersByRoute',
        metricId: 'vercel.external_api_request.count',
        aggregation: 'sum',
        groupBy: ['origin_route'],
        filter: f,
        limit: CALLER_LIMIT,
      },
      {
        id: 'transferBytes',
        metricId: 'vercel.external_api_request.transfer_bytes',
        aggregation: 'sum',
        groupBy: [],
        filter: f,
      },
    ];
  },

  isr_overrevalidation(c) {
    const route = c.route;
    if (!route) return [];
    const f = odataEq('route', route);
    return [
      {
        id: 'writePattern',
        metricId: 'vercel.isr_operation.write_units',
        aggregation: 'sum',
        groupBy: ['cache_result'],
        filter: f,
      },
      {
        id: 'readPattern',
        metricId: 'vercel.isr_operation.read_units',
        aggregation: 'sum',
        groupBy: ['cache_result'],
        filter: f,
      },
    ];
  },

  cwv_poor(c) {
    const route = c.route;
    if (!route) return [];
    const f = odataEq('route', route);
    return [
      ...latencyPercentiles('lcp', 'vercel.speed_insights_metric.lcp', f, ['p50', 'p75', 'p95']),
      ...latencyPercentiles('inp', 'vercel.speed_insights_metric.inp', f, ['p50', 'p75', 'p95']),
      ...latencyPercentiles('cls', 'vercel.speed_insights_metric.cls', f, ['p50', 'p75', 'p95']),
    ];
  },

  middleware_heavy(_c) {
    // Account-scope. Surface top middleware-paths so recommender has named targets.
    return [
      {
        id: 'topMiddlewarePaths',
        metricId: 'vercel.middleware_invocation.count',
        aggregation: 'sum',
        groupBy: ['request_path'],
        limit: MIDDLEWARE_PATH_LIMIT,
      },
    ];
  },

  platform_fluid_compute(_c) {
    // Broad-pass fnStartTypeByRoute already covers this account-scope rec; runner notes reuse.
    return [];
  },

  platform_bot_protection(_c) {
    return [
      {
        id: 'wafRuleFirings',
        metricId: 'vercel.firewall_action.count',
        aggregation: 'sum',
        groupBy: ['waf_rule_id'],
        limit: WAF_RULE_LIMIT,
      },
    ];
  },

  observability_events_attribution(_c) {
    // Account-scope billing signal; broad-pass usage and existing route/cache/middleware metrics carry the evidence.
    return [];
  },

  usage_spike_triage(_c) {
    // Daily billing breakdown is already in the gate evidence; no per-candidate metrics query exists.
    return [];
  },

  build_minutes_fanout(_c) {
    // Account-scope billing signal + scanner findings carry the evidence; no per-candidate query.
    return [];
  },

  region_misconfig(_c) {
    // Branch 2 (scanner-only) — per-region TTFB metric unavailable today, so no deep-dive query.
    return [];
  },
};

// Scanner-driven kinds skip deep-dive — evidence already in scanner findings (file + line).
export const SCANNER_KINDS = new Set([
  'image_optimization',
  'cache_header_gap',
  'rendering_candidate',
  'use_cache_date_stamp',
  'cache_components_suspense_dedupe',
]);

export function specsForCandidate(candidate) {
  const kind = candidate?.kind;
  if (!kind) return [];
  if (SCANNER_KINDS.has(kind)) return [];
  const gen = SPEC_GENERATORS[kind];
  if (!gen) return [];
  return gen(candidate).map((s) => ({ since: TIME_WINDOW, ...s }));
}

// One spec per percentile — CLI does not support `-a p50 -a p95` multi-aggregation.
function latencyPercentiles(idPrefix, metricId, filter, percentiles = ['p50', 'p75', 'p95', 'p99']) {
  return percentiles.map((p) => ({
    id: `${idPrefix}.${p}`,
    metricId,
    aggregation: p,
    groupBy: [],
    filter,
  }));
}

// Dot-notation spec ids (`latency.p95`) nest under their group prefix.
export function mergeIntoEvidence(results) {
  const out = {};
  for (const r of results) {
    const id = r?.spec?.id;
    if (!id) continue;
    const dot = id.indexOf('.');
    if (dot > -1) {
      const head = id.slice(0, dot);
      const leaf = id.slice(dot + 1);
      if (!out[head]) out[head] = {};
      out[head][leaf] = simplify(r);
    } else {
      out[id] = simplify(r);
    }
  }
  return out;
}

// Avoid leaking raw CLI payload / candidate+spec wrapper into evidence — keep summary-only.
function simplify(r) {
  if (!r || r.ok === false) return { error: r?.error ?? 'unknown' };
  // Check rows before value so tabular results with both stay tabular.
  if (Array.isArray(r.rows)) return r.rows;
  if ('value' in r) return r.value;
  return null;
}
