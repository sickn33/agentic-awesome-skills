# Common Root Cause Catalog

After gathering evidence, match your findings against these known root cause patterns. Each pattern has a signature (what the evidence looks like) and a typical fix.

## ETL & Pipeline Causes

### Pipeline scheduling failure
**Signature:** Table freshness delayed. No write queries in the expected window. ETL platform shows task failure or no task execution.
**Fix:** Check pipeline scheduler (cron, Airflow scheduler, dbt Cloud). Restart the job. Check for permission changes on the service account.

### Upstream cascade
**Signature:** Table is stale AND at least one upstream table is also stale. The upstream staleness started first.
**Fix:** Fix the upstream table first — verify whether this pipeline retries automatically or requires an authorized replay.

### Resource contention / timeout
**Signature:** Queries are running but taking much longer than usual. Pipeline timeouts. Warehouse queue depth is high.
**Fix:** Scale the warehouse, optimize the query, or schedule during off-peak hours.

### Permission / credential change
**Signature:** Queries fail with "access denied" or "permission denied" errors. Worked fine before a specific date.
**Fix:** Check service account permissions. Re-grant access to the source data.

---

## Query & Code Causes

### Query regression
**Signature:** Query text changed around the time of the incident. New SQL produces different output (more/fewer rows, different values, nulls).
**Fix:** Review the query change. Revert or fix the SQL. Compare old vs new output.

### JOIN cardinality change
**Signature:** Row count changed dramatically. Query change shows JOIN modification (INNER ↔ LEFT, new JOIN added, JOIN key changed).
**Fix:** Review the JOIN logic. Check for fanout (1-to-many producing duplicates) or dropped rows (INNER JOIN filtering more than expected).

### Filter/WHERE clause change
**Signature:** Row count dropped or spiked. Query change shows WHERE clause modification.
**Fix:** Review the filter logic. Check if the filter is too restrictive or too permissive.

---

## Data Quality Causes

### Source data quality issue
**Signature:** Upstream table has unexpected values. Field lineage traces the bad data to a specific upstream column. The upstream column has new NULL values, outliers, or unexpected categories.
**Fix:** Fix the upstream data. Add data quality checks (validation monitors) at the source.

### Late-arriving data / backfill
**Signature:** Volume spike. New rows have old timestamps (data arrived late). No query change.
**Fix:** This may be intentional (backfill). Verify with the team. Adjust monitoring windows if needed.

### Schema drift
**Signature:** Source system changed its schema (added/removed columns, changed types). Downstream ETL failed or produced wrong results.
**Fix:** Update the ETL to handle the new schema. Add schema change monitors on the source.

---

## Infrastructure Causes

### Warehouse suspension / auto-suspend
**Signature:** Queries queued for a long time, then ran. Freshness delay matches the warehouse suspension period.
**Fix:** Adjust warehouse auto-suspend settings, or schedule a warm-up query before the critical pipeline.

### Cluster/compute failure
**Signature:** Databricks cluster failed to start, Airflow worker crashed, dbt Cloud runner timed out.
**Fix:** Check infrastructure logs. Scale the compute. Retry the job.

### Network / connectivity issue
**Signature:** Intermittent failures across multiple tables. Error messages mention timeouts, connection refused, or DNS resolution.
**Fix:** Check network connectivity. Review cloud provider status page.

---

## How to use this catalog

1. After gathering evidence in Steps 1-6 of the main workflow, review the signatures above.
2. Match your evidence to the closest pattern.
3. Present the root cause with the specific evidence that matched.
4. Suggest the fix from the catalog, adapted to the user's specific situation.
5. If no pattern matches, say so — novel root causes do exist. Present the evidence and let the user draw conclusions.

<!-- Modified locally: evidence, SQL safety or paid-run corrections. -->
