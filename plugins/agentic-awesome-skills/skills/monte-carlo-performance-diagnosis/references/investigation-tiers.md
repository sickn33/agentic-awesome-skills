# Investigation Tiers

The performance diagnosis workflow uses a three-tier approach to avoid unnecessary API calls.

## Tier 1 -- Discovery (no MCONs needed)

These tools work without knowing which specific tables or jobs to investigate. Use them first.

### `get_jobs_performance`

Find slow or failing jobs across all connected platforms.

**When to use:** Starting an investigation with no specific target.

**Key parameters:**
- `integration_type` (optional): Filter to AIRFLOW, DATABRICKS, or DBT
- Results include: job name, MCON, average duration, 7-day trend, run count, failure rate

**What to look for:**
- Jobs with `runDurationTrend7d` significantly negative (getting slower)
- Jobs with high `failureRate` (>10%)
- Jobs with high `avgDuration` relative to peers

### `get_query_perf_profile`

Find the slowest query groups by total runtime.

**When to use:** Finding which queries consume the most compute.

**Key parameters:**
- `start_time` (required): ISO 8601 start of the window to profile
- `end_time` (optional): ISO 8601 end of the window
- `warehouse_id` (optional): Scope to a specific warehouse
- `query_type` (optional): "read" for SELECT queries, "write" for INSERT/CREATE/MERGE
- `sort_field` (optional): defaults to `sum_runtime` (total execution time); also `avg_runtime`, `max_runtime`, `query_count`

**What to look for:**
- Query groups with high `sum_runtime` (total compute consumed)
- Query groups with high `max_runtime` relative to `avg_runtime` (outlier executions)

## Bridge -- Job to Tables

### `get_tables_for_job`

Convert a job MCON to the table MCONs it touches.

**When to use:** After Tier 1 identifies a problematic job, before Tier 2 diagnosis.

**Key parameters:**
- `job_mcon`: The job to look up
- `integration_type`: Must match the source (AIRFLOW, DATABRICKS, DBT)

## Tier 2 -- Diagnosis (MCONs required)

These tools need specific MCONs from Tier 1 or from the user's context.

### `get_tasks_performance`

Drill into a job's individual tasks to find the bottleneck.

**When to use:** Job is slow but you don't know which task.

### `get_change_timeline`

Unified "what changed?" timeline -- the most powerful investigation tool.

**When to use:** Something got slower and you want to know why.

**What it returns (in one call):**
- Query text changes (new JOINs, filter modifications, schema changes)
- Volume shifts (row count spikes or drops)
- Airflow task failures
- dbt model failures

**What to look for:** Correlations between changes and performance shifts.

### `get_query_rca`

Root cause analysis for query failures.

**When to use:** Queries are failing and you want to know why.

**What it returns:**
- **Failed** queries: grouped by error type (timeout, permission, syntax)
- **Futile** queries: queries that run but produce no useful output
- Pre-computed groupings -- patterns are already identified

### `get_query_latency_distribution`

Latency trend over time.

**When to use:** Detecting gradual degradation.

**What to look for:**
- Step-changes in latency (sudden increase requires investigation; code, workload, contention or capacity may have changed)
- A large p95/p50 ratio suggests tail variability; inspect distributions and comparable query groups before assigning cause
- Gradual upward trend means growing data volume or inefficient queries

**Key parameters:**
- `bucket` (optional): defaults to `1d` for windows ≥ 3 days, `1h` otherwise. Pass `bucket="1h"` explicitly when localizing a step change to a specific hour, or when investigating intermittent outlier patterns that vary by time of day.

### `get_asset_lineage`

Trace upstream/downstream impact.

**When to use:** Understanding what's affected by a slow table.

**Key parameters:**
- `direction="DOWNSTREAM"`: What depends on this table?
- `direction="UPSTREAM"`: What feeds this table?
