# Pushing Query Logs

## Overview

Query logs let Monte Carlo build table usage history, populate query lineage, and surface
query-level insights in the catalog. Push them via `POST /ingest/v1/querylogs`.

**Important timing note**: MC processes pushed query logs asynchronously. Logs pushed now
may not be visible in `getAggregatedQueries` for **at least 15-20 minutes**. This is expected
behavior, not a bug.

**Expiration**: Pushed query logs expire on the same schedule as pulled query logs.

**Batching**: For large query log sets, split events into batches. The compressed request body
must not exceed **1MB** (Kinesis limit). A conservative default is 250 entries per batch.

## pycarlo model

```python
from pycarlo.features.ingestion import IngestionService, QueryLogEntry
```

`QueryLogEntry` required fields:
- `start_time` (`datetime`) — when the query started
- `end_time` (`datetime`) — when the query finished (**required**, easy to miss)
- `query_text` (`str`) — the SQL statement

Optional fields:
- `query_id` (`str`) — warehouse-assigned query ID
- `user` (`str`) — user/email who ran the query
- `returned_rows` (`int`) — rows returned to the client
- `default_database` (`str`) — default database context

## Basic example

```python
from datetime import datetime, timezone

entries = [
    QueryLogEntry(
        start_time=datetime(2024, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 3, 1, 10, 0, 5, tzinfo=timezone.utc),
        query_text="SELECT * FROM analytics.public.orders WHERE status = 'pending'",
        query_id="query-abc-123",
        user="analyst@company.com",
        returned_rows=847,
    ),
]

result = service.send_query_logs(
    resource_uuid="<your-resource-uuid>",
    log_type="snowflake",   # ← warehouse-specific! see table below
    entries=entries,
)
invocation_id = service.extract_invocation_id(result)
print("invocation_id:", invocation_id)
```

## log_type per warehouse

**Important**: the query-log endpoint uses `log_type`, not `resource_type`. This is the only
push endpoint where the field name differs from metadata/lineage. The `log_type` value must
match what the MC normalizer expects for your warehouse. Using the wrong value causes:
`ValueError: Unsupported ingest query-log log_type: <value>`

| Warehouse | log_type |
|---|---|
| Snowflake | `"snowflake"` |
| BigQuery | `"bigquery"` |
| Databricks | `"databricks"` |
| Redshift | `"redshift"` |
| Hive (EMR/S3) | `"hive-s3"` |
| Athena | `"athena"` |
| Teradata | `"teradata"` |
| ClickHouse | `"clickhouse"` |
| Databricks (SQL Warehouse) | `"databricks-metastore-sql-warehouse"` |
| S3 | `"s3"` |
| Presto (S3) | `"presto-s3"` |

## Warehouse-specific fields

Some warehouses support extra fields beyond the base `QueryLogEntry`. Pass them as keyword
arguments — the normalizer knows which fields are valid per warehouse.

**Snowflake extras:**
```python
QueryLogEntry(
    ...
    bytes_scanned=1024000,
    warehouse_name="COMPUTE_WH",
    warehouse_size="X-Small",
    role_name="ANALYST",
    query_tag="reporting",
    execution_status="SUCCESS",
)
```

**BigQuery extras:**
```python
QueryLogEntry(
    ...
    total_bytes_billed=10485760,
    statement_type="SELECT",
    job_type="QUERY",
    default_dataset="analytics.public",
)
```

**Athena extras:**
```python
QueryLogEntry(
    ...
    bytes_scanned=2048000,
    catalog="AwsDataCatalog",
    database="analytics",
    output_location="s3://my-bucket/results/",
    state="SUCCEEDED",
)
```

## Collecting query logs per warehouse

### Snowflake
```sql
SELECT
    query_id,
    query_text,
    start_time,
    end_time,
    user_name,
    database_name,
    warehouse_name,
    bytes_scanned,
    rows_produced AS returned_rows,
    execution_status
FROM snowflake.account_usage.query_history
WHERE start_time >= DATEADD(hour, -24, CURRENT_TIMESTAMP())
  AND execution_status = 'SUCCESS'
ORDER BY start_time
```

Note: `ACCOUNT_USAGE` views have up to 45 minutes of latency. Don't collect the last hour.

### BigQuery
```python
from google.cloud import bigquery
client = bigquery.Client(project=project_id)
jobs = client.list_jobs(all_users=True, min_creation_time=start_dt, max_creation_time=end_dt)
for job in jobs:
    if hasattr(job, 'query') and job.query:
        # job.job_id, job.query, job.created, job.ended, job.user_email
```

### Databricks
```sql
SELECT
    statement_id AS query_id,
    statement_text AS query_text,
    start_time,
    end_time,
    executed_by AS user,
    produced_rows AS returned_rows
FROM system.query.history
WHERE start_time >= DATEADD(HOUR, -24, NOW())
  AND status = 'FINISHED'
```

### Redshift (modern clusters)
```sql
SELECT
    query_id,
    query_text,   -- may need text assembly from SYS_QUERYTEXT for long queries
    start_time,
    end_time,
    user_id,
    status
FROM sys_query_history
WHERE start_time >= DATEADD(hour, -24, GETDATE())
  AND status = 'success'
```

For long queries (text > 4000 chars), assemble from `SYS_QUERYTEXT`:
```sql
SELECT query_id, LISTAGG(text, '') WITHIN GROUP (ORDER BY sequence) AS full_text
FROM sys_querytext
WHERE query_id = <id>
GROUP BY query_id
```

### Hive
Parse the HiveServer2 log file (default: `/tmp/root/hive.log`) for lines matching:
```
(Executing|Starting) command\(queryId=(\S*)\): (?P<command>.*)
```

## Output manifest (include invocation_id)

```python
manifest = {
    "resource_uuid": resource_uuid,
    "invocation_id": service.extract_invocation_id(result),   # ← save this
    "collected_at": datetime.now(tz=timezone.utc).isoformat(),
    "entry_count": len(entries),
    "window_start": min(e.start_time for e in entries).isoformat(),
    "window_end": max(e.end_time for e in entries).isoformat(),
    "queries": [
        {
            "query_id": e.query_id,
            "start_time": e.start_time.isoformat(),
            "end_time": e.end_time.isoformat(),
            "returned_rows": e.returned_rows,
            "query": e.query_text[:200],   # truncate for readability
        }
        for e in entries
    ],
}
with open("query_logs_output.json", "w") as f:
    json.dump(manifest, f, indent=2)
```
