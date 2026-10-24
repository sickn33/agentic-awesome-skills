# Query Analysis Patterns

## Reading performance data

### Runtime metrics

When presenting runtime data to the user, always cite the exact numbers from the tool:

- **Average runtime**: The typical execution time for a query group
- **Total runtime**: Sum of elapsed runtimes for the observed group/window; not necessarily billed compute or monetary cost
- **Runtime share**: Share of the reported runtime measure; do not equate elapsed time with billed warehouse cost
- **p50 / p95**: Median and 95th percentile latency -- a large p95/p50 ratio suggests tail variability, not a proven cause

### Trend analysis

- **7-day trend** (`runDurationTrend7d`): Positive = getting faster, negative = getting slower
- Values near 0 may indicate insufficient data -- flag if trend confidence is low (<0.1)
- Always compare current metrics to the 7-day baseline before making claims about regressions

### Common performance patterns

**Sudden spike**: Query changed (new JOIN, removed filter, different plan). Use `get_change_timeline` to find the change. When using `get_query_latency_distribution` to confirm timing, pass `bucket="1h"` to localize the step to a specific hour.

**Gradual degradation**: Data volume growing or query becoming less efficient over time. Use `get_query_latency_distribution` to confirm the trend.

**Intermittent slowness**: Outlier executions (p95 >> p50). Often caused by: resource contention, cold warehouse startup, large partition scans on specific date ranges. Pass `bucket="1h"` to `get_query_latency_distribution` to identify which hours are outlier-heavy.

**Failed/futile patterns**: Use `get_query_rca` to group failures by cause. Common causes:
- **Timeout**: Query takes too long -- needs optimization or larger warehouse
- **Permission**: Credentials or roles changed
- **Futile**: A tool-defined category to inspect; zero-row results may be correct and useful

## Read vs write queries

- When the user asks about "expensive" or "costly" queries, investigate using runtime data
- When the user asks about "reads" or "read queries", filter with `query_type="read"` (SELECT queries)
- When the user asks about "writes", filter with `query_type="write"` (INSERT, CREATE, MERGE)
- **Never mix reads and writes** in the same result unless the user explicitly asks for both

## Cross-platform considerations

Performance data comes from multiple platforms. Note which platform each finding is from:

| Platform | Job type | Task granularity |
|----------|----------|------------------|
| Airflow | DAG runs | Task instances within DAGs |
| dbt | Model runs | Individual model executions |
| Databricks | Job runs | Notebook/task runs within jobs |

Each platform has different performance characteristics. An Airflow task taking 5 minutes might be normal; a dbt model taking 5 minutes might indicate a problem.
