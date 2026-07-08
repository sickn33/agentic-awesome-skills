---
name: monte-carlo-performance-diagnosis
description: "Diagnoses pipeline performance issues -- slow jobs, expensive queries, latency trends -- using Monte Carlo's cross-platform observability. Uses a tiered investigation approach: discover problems, bridge to affected tables, then drill into root causes. Activates when a user asks about..."
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/performance-diagnosis
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Monte Carlo Performance Diagnosis Skill

This skill helps diagnose data pipeline performance issues using Monte Carlo's cross-platform observability data. It works across Airflow, dbt, Databricks, and warehouse query engines to find bottlenecks, detect regressions, and identify root causes.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

Reference files live next to this skill file. **Use the Read tool** (not MCP resources) to access them:

- Tiered investigation approach: `references/investigation-tiers.md` (relative to this file)
- Query analysis patterns: `references/query-analysis.md` (relative to this file)

## When to activate this skill

Activate when the user:

- Asks about slow pipelines, jobs, or queries
- Wants to find expensive or costly queries
- Mentions performance regressions or degradation
- Asks "why is this pipeline slow?" or "what's using the most compute?"
- Wants to compare performance over time or find bottleneck tasks
- Asks about failed or futile query patterns

## When NOT to activate this skill

Do not activate when the user is:

- Investigating data quality issues (use the prevent skill)
- Looking at storage costs (use the storage-cost-analysis skill)
- Creating monitors (use the monitoring-advisor skill)
- Just querying data or exploring table contents

## Prerequisites

The following MCP tools must be available (connect to Monte Carlo's MCP server):

**Discovery tools (Tier 1):**
- `get_jobs_performance` -- find slow/failing jobs across Airflow, dbt, Databricks
- `get_top_slow_queries` -- find slowest query groups by total runtime

**Bridge tool:**
- `get_tables_for_job` -- convert job MCONs to table MCONs

**Diagnosis tools (Tier 2):**
- `get_tasks_performance` -- drill into a job's individual tasks
- `get_change_timeline` -- unified timeline of query changes, volume shifts, Airflow/dbt failures
- `get_query_rca` -- root cause analysis for failed/futile queries
- `get_query_latency_distribution` -- latency trend over time
- `get_asset_lineage` -- trace upstream/downstream impact

**Supporting tools:**
- `get_warehouses` -- list available warehouses

## Workflow

### Step 1: Identify the scope

Determine what the user wants to investigate:
- **Specific job/pipeline**: User mentions a job name or pipeline
- **Specific table**: User mentions a table that's slow to update
- **General discovery**: User wants to find what's slow

Call `get_warehouses` to list available warehouses. Match the user's context to a warehouse.

### Step 2: Tier 1 -- Discovery

If you don't have specific MCONs to investigate, start with discovery:

1. **Find slow jobs**: Call `get_jobs_performance` with optional `integration_type` filter (AIRFLOW, DATABRICKS, DBT) if the user specifies a platform.
   - Results include: job name, average duration, trend (7-day), run count, failure rate
   - Look for: high `avgDuration`, negative `runDurationTrend7d`, high failure rates

2. **Find expensive queries**: Call `get_top_slow_queries` with optional `warehouse_id` and `query_type` ("read" for SELECTs, "write" for INSERT/CREATE/MERGE).
   - Results include: query hash, total runtime, average runtime, run count
   - Look for: queries with high total runtime or high individual execution time

Present the top findings to the user before drilling deeper. A typical investigation needs only 3-7 tool calls.

**If both discovery tools return no results:** Tell the user no performance issues were found in the current time window. Suggest broadening the scope (different warehouse, longer time range, or a different platform filter).

### Step 3: Bridge -- Job to Tables

After Tier 1 identifies problematic jobs, convert to table MCONs:

Call `get_tables_for_job(job_mcon=..., integration_type=...)` using the `integration_type` from the job performance results.

This gives you the table MCONs needed for Tier 2 investigation.

### Step 4: Tier 2 -- Diagnosis

Now drill into root causes using the MCONs from discovery or the bridge:

1. **Task bottleneck**: Call `get_tasks_performance` to find which specific task in a job is the bottleneck.

2. **What changed?** Call `get_change_timeline` -- this is your most powerful tool. It returns a unified timeline of:
   - Query text changes (schema modifications, new JOINs, filter changes)
   - Volume shifts (row count spikes/drops)
   - Airflow task failures
   - dbt model failures
   All in one call. Look for correlations: "query changed on day X, runtime doubled on day X+1."

3. **Why are queries failing?** Call `get_query_rca` to get root cause analysis:
   - **Failed** queries: errors, timeouts, permission issues
   - **Futile** queries: queries that run but produce no useful output
   - Patterns are pre-computed -- the tool groups failures by cause

4. **Is latency degrading?** Call `get_query_latency_distribution` to see the trend:
   - Compare p50 vs p95 -- if p95 >> p50 (>5x), the problem is outlier queries
   - Look for step-changes in latency (sudden increase = regression)
   - For step-change / regression-time-localization use cases, pass `bucket="1h"`. The default downsamples to daily on windows ≥ 3 days, which hides hour-level steps.

5. **Trace impact**: Call `get_asset_lineage` with `direction="DOWNSTREAM"` to see what's affected by a slow table, or `direction="UPSTREAM"` to find what feeds it.

### Step 5: Present findings

Structure your response as:

1. **Problem summary**: What's slow and by how much (with exact numbers from tools)
2. **Root cause**: What changed or what's causing the issue
3. **Impact**: What downstream systems are affected
4. **Recommendations**: Specific actions to fix the issue

### Important rules

- **Quote tool numbers exactly.** If a tool returns "1282 runs, avg 22.5s", say exactly that. Never round, estimate, or fabricate numbers.
- **Always compare to baselines.** Use 7-day trend data (`runDurationTrend7d`) to distinguish regressions from normal variance. Flag if trend data has less than 0.1 confidence.
- **Stop when you have a root cause.** 3-7 tool calls is typical. More than 10 means you're over-investigating.
- **Read vs write queries**: When the user asks about "reads" or "read queries", filter with `query_type="read"`. When they ask about "writes", use `query_type="write"`. Do NOT mix them.
- **Never expose MCONs, UUIDs, or internal identifiers** to the user. Use human-readable names.
- **Cross-platform**: This skill works across Airflow, dbt, and Databricks. Note which platform each finding comes from.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
