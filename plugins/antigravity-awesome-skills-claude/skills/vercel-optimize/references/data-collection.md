# Data collection

What the skill collects in Step 1, where each signal comes from, and how it degrades when a capability is missing.

All shapes here are covered by sanitized CLI fixtures in `packages/vercel-optimize-tests/test/fixtures/real-cli-output/`.

## Table of contents

- [The `signals.json` shape](#the-signalsjson-shape)
- [Per-signal source matrix](#per-signal-source-matrix)
- [Error states and fallbacks](#error-states-and-fallbacks)
- [Real JSON shapes](#real-json-shapes)
- [Why we avoid stderr grep](#why-we-avoid-stderr-grep)

## The `signals.json` shape

`node scripts/collect-signals.mjs` emits the Vercel-side signal document. `node scripts/scan-codebase.mjs <repo-root>` emits the local codebase scan. `node scripts/merge-signals.mjs vercel-signals.json codebase.json --out signals.json` combines them into the artifact consumed by the gate, deep-dive, verifier, and renderer. The merge step also annotates scanner findings with route-level observability, `COLD-PATH`, or `NO-ROUTE-MAPPING`; scanner gates reject non-traffic-independent findings that do not carry one of those deterministic annotations.

The merged `signals.json` has this top-level shape:

```json
{
  "schemaVersion": "1.2",
  "collectedAt": "2026-05-12T20:48:44.123Z",
  "timeWindow": "14d",
  "projectId": "prj_xxx",
  "orgId": "team_xxx",
  "projectIdSource": "repo.json" | "project.json" | "arg" | "env" | "arg+repo.json" | "arg+project.json" | "env+repo.json" | "env+project.json",
  "commandScope": {
    "ok": true,
    "cliScope": "team-slug-or-username",
    "source": "team-api" | "whoami-current-team" | "whoami-user" | "linked-org-scope" | "missing-org-scope",
    "required": true,
    "detail": "..."
  },
  "frameworkSupport": {
    "ok": true,
    "status": "supported" | "limited" | "unsupported",
    "blocker": null | "unsupported_framework",
    "framework": "next",
    "label": "Next.js",
    "detail": "..."
  },
  "frameworkSupportBlocker": null | "unsupported_framework",
  "frameworkSupportDetail": "...",
  "observabilityPlus": true | false | null,
  "observabilityPlusPreflight": { /* CLI/API configuration probe result */ },
  "observabilityPlusUsable": true | false | null,
  "observabilityPlusBlocker": null | "no_oplus_probe" | "project_disabled" | "payment_required" | "forbidden" | "daily_quota_exceeded" | "project_not_found" | "not_linked" | "all_failed_other" | "no_traffic",
  "observabilityPlusBlockerDetail": "...",
  "plan": { "plan": "hobby" | "pro" | "enterprise" | "uncertain", "reason": "..." },
  "project": { /* /v9/projects/:id response; team-owned projects include ?teamId */ },
  "contract": { "context": "...", "commitments": [], "totalCommitments": 0 },
  "usage": { /* vercel usage --format json --breakdown daily, or null */ },
  "usageError": null | "USAGE_UNAVAILABLE" | "USAGE_CONTEXT_MISMATCH" | "NOT_COLLECTED_OBSERVABILITY_BLOCKED" | "NOT_COLLECTED_UNSUPPORTED_FRAMEWORK" | "EXIT_<n>" | "UNKNOWN",
  "stack": { /* framework + version + router + ORM + monorepo */ },
  "codebase": { /* scan-codebase output: stack + routes + findings */ },
  "metrics": { /* per-metric query results (only when observabilityPlus=true) */ },
  "metricsSchema": [ /* array of {id, description} */ ]
}
```

All metric queries use the same `timeWindow` constant (`14d`) — defined as `TIME_WINDOW` in [lib/queries.mjs](../lib/queries.mjs) and covered by the repo test suite. Mixing windows silently produces incompatible rollups; never pin a per-query `since`.

All Vercel CLI commands that accept scope must use `commandScope.cliScope` (`--scope <team-slug-or-username>`). Linked project files often contain raw `team_...` or `usr_...` IDs, but several CLI subcommands silently fall back to the current team when `--scope` receives a raw account ID. `collect-signals.mjs` resolves raw team IDs to slugs and raw user IDs to usernames before running `vercel metrics`, `vercel usage`, or `vercel contract`; `deep-dive.mjs` reuses the same scope for follow-up metric queries. If the project link lacks an owner account or the CLI-safe scope cannot be resolved, stop and ask the user which Vercel project and team/personal scope they want audited. Do not infer scope from the current `vercel whoami` team.

Downstream consumers reference `signals.<field>` paths verbatim. Bumping `schemaVersion` is required when any consumed path is renamed or removed.

## Per-signal source matrix

| Signal | CLI command | Required for | Fallback when missing |
|---|---|---|---|
| Auth | `vercel whoami` | Everything | Exit with "run `vercel login`" |
| CLI version | `vercel --version` | Everything | Exit with "upgrade to v53+" — v53 is the skill's compatibility floor |
| Project ID + Org ID | `.vercel/repo.json` (newer) or `.vercel/project.json` (legacy) → `VERCEL_PROJECT_ID` + `VERCEL_ORG_ID` → argv. When the user passes a project ID and multi-project `repo.json` contains exactly one matching entry, the collector uses that entry's owner account. | Everything | Exit with "run `vercel link` or pass projectId". Multi-project `repo.json` without an explicit matching project ID, or any project ID without owner account scope, is ambiguous; ask the user to clarify the intended project/account |
| Framework support | local `package.json` via `detectStack()` + `classifyFrameworkSupport()` | Code-backed route recommendations | Stop before metric fan-out on unsupported frameworks unless the user chooses `--continue-unsupported-framework` |
| CLI command scope | `vercel whoami --format json`, then `vercel api /v2/teams/:orgId` when a linked `team_...` ID must be converted to a slug | Keeps `vercel metrics`, `vercel usage`, and `vercel contract` on the linked project's account instead of the user's current/personal scope | `PROJECT_SCOPE_UNRESOLVED` or `SCOPE_UNRESOLVED`; stop and ask the user to clarify the intended project/account, then re-link under the intended team or personal account |
| Project/scope verification | `vercel api /v9/projects/:id?teamId=<orgId>` for team-owned projects; omit `teamId` for `usr_...` user-owned projects | Proves the resolved account can read the resolved project before Observability Plus or billing conclusions | `PROJECT_SCOPE_MISMATCH`; stop and ask the user to confirm the exact project and team/personal scope. Do not report Observability Plus as missing until this check passes |
| Observability Plus configuration | Vercel CLI/API probe plus one metric access check; user-owned projects skip the team configuration endpoint and rely on the scoped metrics probe | All `metrics.*` signals | Stop early when the account lacks Observability Plus or this project is disabled |
| Observability Plus metrics access | One canary `vercel metrics vercel.request.count --since 14d --limit 1`, then full fan-out only if it succeeds | All `metrics.*` signals | Set `observabilityPlusUsable=false` with blocker detail; emit a blocker document after project/scope verification but before billing collection unless `--continue-without-observability` is passed |
| Project config | Verified project API response from project/scope verification | Fluid Compute, BotID, Speed Insights, security flags | Stop on ownership mismatch; otherwise gates that need missing optional fields skip |
| Plan tier | `vercel api /v2/teams/:orgId` (or `/v2/user` for user-owned projects) → `billing.plan`, then scoped `vercel contract --format json` fallback → `inferPlan()` | Cost-context framing only | `plan="uncertain"`; cost magnitudes still computed from `usage.services[].billedCost` |
| Billing usage | Scoped `vercel usage --format json --from <14d> --to <today>` with best-effort project grouping when supported by the installed CLI | Cost magnitude framing, billing-driven candidates | `null` + `usageError` set when queried and unavailable; `NOT_COLLECTED_*` when a preflight stop happened before billing collection |
| Stack | local `package.json` + dir scan | Version-aware citation filtering, scanner gating | "unknown" framework → all framework-specific citations filtered |
| `metrics.fnDurationP95ByRoute` | `vercel metrics vercel.function_invocation.function_duration_ms -a p95 --group-by route --since 14d` | `slow_route`, `platform_fluid_compute` gates | `{ok:false}`; gate emits no candidates |
| `metrics.requestsByRouteCache` | `vercel metrics vercel.request.count --group-by route --group-by cache_result --since 14d` | `uncached_route`, traffic-total computation | `{ok:false}` |
| `metrics.fnStatusByRoute` | `vercel metrics vercel.function_invocation.count --group-by route --group-by http_status --since 14d` | Canonical function-level 5xx source for `route_errors` and `slow_route` error disqualification | `{ok:false}`; fall back to `requestsByRouteStatus` only for older fixtures |
| `metrics.requestsByRouteStatus` | `vercel metrics vercel.request.count --group-by route --group-by http_status --since 14d` | Compatibility fallback for request-level status | `{ok:false}` |
| `metrics.externalApiP75` | `vercel metrics vercel.external_api_request.request_duration_ms -a p75 --group-by origin_hostname --since 14d` | `external_api_slow` gate | `{ok:false}` |
| `metrics.fnStartTypeByRoute` | `vercel metrics vercel.function_invocation.count -a sum --group-by route --group-by function_start_type --since 14d` | `cold_start`, `platform_fluid_compute` | `{ok:false}`; gate dormant. **`function_start_type` ∈ {cold,hot,prewarmed}** is the public way to read cold-start rate on CLI v53.4.0+ (replaces the old "not derivable" gap). |
| `metrics.fnGbHrByRoute` | `vercel metrics vercel.function_invocation.function_duration_gbhr -a sum --group-by route --since 14d` | Cost ranking / report breakdown | `{ok:false}` |
| `metrics.fnCpuMsByRoute` | `vercel metrics vercel.function_invocation.function_cpu_time_ms -a sum --group-by route --since 14d` | Active CPU ranking (Fluid Compute billing unit) | `{ok:false}` |
| `metrics.fnPeakMemoryByRoute` | `vercel metrics vercel.function_invocation.peak_memory_mb -a max --group-by route --since 14d` | `oversized_memory` gate | `{ok:false}` |
| `metrics.fnProvisionedMemoryByRoute` | `vercel metrics vercel.function_invocation.provisioned_memory_mb -a max --group-by route --since 14d` | `oversized_memory` gate | `{ok:false}` |
| `metrics.fnTtfbP95ByRoute` | `vercel metrics vercel.function_invocation.ttfb_ms -a p95 --group-by route --since 14d` | TTFB cross-check for slow routes | `{ok:false}` |
| `metrics.fdtByRoute` | `vercel metrics vercel.request.fdt_total_bytes -a sum --group-by route --since 14d` | Bandwidth-cost ranking | `{ok:false}` |
| `metrics.fdtByBot` | `vercel metrics vercel.request.fdt_total_bytes -a sum --group-by bot_category --since 14d` | Strengthens `platform_bot_protection` with observed bot bandwidth share | `{ok:false}`; gate falls back to config-only signal |
| `metrics.fdtByCache` | `vercel metrics vercel.request.fdt_total_bytes -a sum --group-by cache_result --since 14d` | Uncached-bandwidth narrative | `{ok:false}` |
| `metrics.middlewareCount` | `vercel metrics vercel.middleware_invocation.count -a sum --group-by request_path --since 14d` | `middleware_heavy` gate | `{ok:false}`; gate dormant |
| `metrics.middlewareDurationP95` | `vercel metrics vercel.middleware_invocation.duration_ms -a p95 --group-by request_path --since 14d` | Middleware latency narrative | `{ok:false}` |
| `metrics.isrReadsByRoute` | `vercel metrics vercel.isr_operation.read_units -a sum --group-by route --since 14d` | `isr_overrevalidation` gate (denominator) | `{ok:false}` |
| `metrics.isrWritesByRoute` | `vercel metrics vercel.isr_operation.write_units -a sum --group-by route --since 14d` | `isr_overrevalidation` gate (numerator) | `{ok:false}` |

**ISR read:write ratio caveat.** `isrReadsByRoute` exposes the **origin-tier** read count only. CDN-tier reads (regional cache hits that never reach the ISR origin) are not separately surfaced today and can dominate total read volume. Before flagging "writes > reads" as inverted, the gate and report must (a) acknowledge CDN-tier reads aren't included, (b) corroborate with `requestsByRouteCache` `cache_result=HIT` share before alarming. A high origin-write rate alone does not imply pathological over-revalidation if the CDN is absorbing the steady-state read traffic.
| `metrics.imageCount`, `imageByHost`, `imageSourceBytes` | `vercel metrics vercel.image_transformation.*` | Image-optimization narrative | `{ok:false}` |
| `metrics.cwvLcpByRoute`, `cwvInpByRoute`, `cwvClsByRoute`, `cwvTtfbByRoute`, `cwvCount`, `cwvCountByRoute` | `vercel metrics vercel.speed_insights_metric.*` (`p75` for vitals, `sum` for counts) `--since 14d` | `cwv_poor` gate | Empty when no Speed Insights measurements are returned for the 14-day window — gate stays dormant; do not infer disabled vs no traffic unless another signal proves it |
| `metrics.firewallByAction` | `vercel metrics vercel.firewall_action.count -a sum --group-by waf_action --since 14d` | Bot-protection narrative; shows existing managed rule activity | `{ok:false}` |
| `metrics.botIdChecks` | `vercel metrics vercel.bot_id_check.count -a sum --since 14d` | Confirms whether BotID is actively running | `{ok:false}` |
| `metrics.externalApiCount`, `externalApiBytes` | `vercel metrics vercel.external_api_request.*` grouped by `origin_hostname` | External-dependency cost narrative | `{ok:false}` |

## Error states and fallbacks

`lib/vercel.mjs`'s `runVercelJson()` parses stdout as JSON first (the most reliable signal — the CLI emits structured error payloads even when exit code is non-zero), and only falls back to stderr substring matching when JSON parsing fails:

| Code | Meaning | Skill behavior |
|---|---|---|
| `unsupported_framework` | Detected framework cannot reliably map Vercel route metrics back to source files | Stop before metric fan-out; ask whether to continue with a limited platform/scanner audit |
| `PROJECT_SCOPE_UNRESOLVED` | The project was found without an owner account, or `.vercel/repo.json` contains multiple linked projects and no explicit matching project ID was supplied | Stop before `vercel metrics`, `vercel usage`, or `vercel contract`; ask the user which Vercel project and team/personal scope to audit |
| `SCOPE_UNRESOLVED` | The linked project belongs to a specific team/user, but the collector could not resolve a CLI-safe `--scope` value | Stop before `vercel metrics`, `vercel usage`, or `vercel contract`; ask the user to switch/re-link with the correct team |
| `PROJECT_SCOPE_MISMATCH` | The resolved team/personal account cannot read the resolved project, or the project API returns a different owner/project | Stop before Observability Plus, metrics, usage, or contract checks; ask the user to confirm the exact Vercel project and team/personal scope |
| `no_oplus_probe` | Observability Plus not enabled on team | Stop before full metric fan-out; ask whether to enable Observability Plus or run scanner-only |
| `project_disabled` | Observability Plus enabled for team but disabled for project | Stop before full metric fan-out; ask the user to enable Observability Plus for this project or continue scanner-only |
| `daily_quota_exceeded` | Observability Plus query quota is exhausted for the day | Stop before full metric fan-out; tell the user to retry after the next UTC midnight reset or ask whether to continue scanner-only |
| `USAGE_UNAVAILABLE` | `vercel usage` returned no Costs payload after billing usage was actually queried | `usage=null`; cost-tier gates emit lower-priority candidates; billing section of the report shows the exact usage error |
| `PROJECT_NOT_FOUND` | `vercel api /v9/projects/<id>` 404 (typically wrong scope) | `project={error}`; platform gates that depend on project config skip; report flags the data gap |
| `invalid_filter_dimension` / `invalid_dimension` | Metric query used a dimension the metric doesn't support | Metric returns `{ok:false, code, allowedValues}`; consumer can introspect and adjust |
| `NOT_LINKED` | The app directory is not linked in the way `vercel metrics` requires | Run `vercel link --yes --project <project-name-or-id> --cwd <app-dir>`; add `--team <team-id-or-slug>` when known. Passing only `VERCEL_PROJECT_ID` is not enough for route metrics if cwd is unlinked |
| `NOT_AUTH` | Session expired | Caller exits with "run `vercel login`" |
| `FORBIDDEN` | 403 — role lacks permission | Skip that endpoint; continue with degraded signal; surface in report |
| `RATE_LIMIT` | 429 from API | Treat as "missing data" (no retry implemented yet) |
| `EXIT_N` | Anything else | Treat as missing data; continue |

The skill never crashes the entire collection on a single endpoint failure. Every catch-block uses `?? null` or `?? {}` so the JSON output is always well-shaped.

## Real JSON shapes

### `vercel metrics <id> --format json`

```jsonc
{
  "query": {
    "metric": "vercel.request.count",
    "aggregation": "sum",
    "groupBy": ["route"],
    "startTime": "2026-04-13T04:00:00.000Z",
    "endTime": "2026-05-13T08:00:00.000Z",
    "granularity": { "hours": 4 }
  },
  "summary": [
    { "route": "/dashboard/[sessionId]", "vercel_request_count_sum": 4923 },
    { "route": "/sw.js",               "vercel_request_count_sum": 872 }
  ],
  "data": [
    { "timestamp": "2026-04-13T04:00:00.000Z", "vercel_request_count_sum": 0, "route": "/dashboard/[sessionId]" }
    /* ... */
  ],
  "statistics": { "bytesRead": 10267, "rowsRead": 947, "dbTimeSeconds": 0 }
}
```

Field naming rule: the metric ID's dots become underscores, and the aggregation suffix is appended — `vercel.request.count` + `sum` → `vercel_request_count_sum`. `lib/vercel.mjs::normalizeSummary()` flattens `summary[]` into `[{<dim>: v, ..., value: <n>}]`.

### `vercel metrics schema --format json`

Array of `{id, description}` entries — NOT an object. Many metric IDs in earlier docs don't exist: there is no `vercel.function.cold_starts`, no `vercel.cache.hits`. Cache state is the `cache_result` dimension on `vercel.request.count`.

### `vercel metrics <id> --filter "<bad>"`

```jsonc
{
  "error": {
    "code": "invalid_filter_dimension",
    "message": "Filter uses invalid dimension \"status\" for metric \"vercel.request.count\".",
    "allowedValues": [ "asn_id", ..., "http_status", ..., "route" ]
  }
}
```

Status filtering uses `http_status` (not `status`). Both `http_status eq '500'` and `http_status ge 500` work.

### `vercel api /v9/projects/<id>` / `?teamId=<orgId>`

Top-level keys relevant to the skill (real, verified):
- `framework` (string, e.g. `"nextjs"`)
- `resourceConfig.fluid` (boolean) — **Fluid Compute toggle**
- `defaultResourceConfig.fluid` — template for new functions
- `security.botIdEnabled` (boolean) — **BotID toggle**
- `security.managedRules.bot_filter` (`{active, action}`) — firewall rule
- `speedInsights` (`{id, hasData}`)
- `webAnalytics` (`{id}`) — installed but `features.webAnalytics` says enabled state
- `nodeVersion` (e.g. `"22.x"`)

Calling without `?teamId=` returns 404 when the project belongs to a team other than the user's `currentTeam`. For user-owned projects (`orgId` starts with `usr_`), omit `teamId` and let the CLI use the authenticated user context.

### `vercel contract --format json`

```jsonc
{ "context": "example-team", "commitments": [], "totalCommitments": 0 }
```

The direct account billing record is the primary plan signal: `billing.plan` from `vercel api /v2/teams/:orgId` or `vercel api /v2/user` is expected to be `hobby`, `pro`, or `enterprise`.

`vercel contract` is only a fallback. `commitments[]` field names are not stable, so `inferPlan()` tries `category`, `commitmentCategory`, and `type`; category `Spend` means Pro and `Usage` means Enterprise. Empty commitments no longer imply Hobby by themselves.

### `vercel usage --format json`

May return `Error: Costs not found (404)`. Treat that queried error as `USAGE_UNAVAILABLE` and degrade — the skill can still produce a useful report from metrics + scanner. Do not use this explanation when `usageError` is `NOT_COLLECTED_OBSERVABILITY_BLOCKED` or another `NOT_COLLECTED_*` value; those mean the audit stopped before `vercel usage` ran.

## Why we avoid stderr grep

CLI error message strings are not stable contracts — they can change between versions. Detecting `OPLUS_REQUIRED` by greping `stderr.includes('Observability Plus')` will break the moment Vercel rewords the message.

`runVercelJson()` therefore:
1. Always tries to **parse stdout as JSON** first. Most failures emit a structured `{error:{code,message,allowedValues}}` payload that's deterministic.
2. Only falls back to a lower-case stderr substring match when stdout was not parseable JSON.
3. Categorizes anything unrecognized as `EXIT_N` and treats it as "missing data, continue."

The skill is correct without precise category detection. The categories exist to give the user better error messages, not to drive control flow.
