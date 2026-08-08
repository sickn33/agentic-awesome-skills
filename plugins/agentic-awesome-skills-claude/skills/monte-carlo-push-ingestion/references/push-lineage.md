# Pushing Table and Column Lineage

## Overview

Both table-level and column-level lineage use the same endpoint: `POST /ingest/v1/lineage`.
The `event_type` field distinguishes them:
- `LINEAGE` — table-level: source table → destination table
- `COLUMN_LINEAGE` — column-level: source table.column → destination table.column
  (also automatically creates the parent table-level edge)

Push lineage is **typically visible in the MC lineage graph within seconds to a few minutes**
via the fast direct path (PushLineageProcessor → S3 CSVs → neo4jLineageLoaderPrivate → Neo4j).

**Expiration**:
- Pushed **table lineage does not expire** (`expire_at = 9999-12-31`).
- Pushed **column lineage expires after 10 days** (same as pulled column lineage).

**Batching**: For large numbers of lineage events, split into batches. The compressed request
body must not exceed **1MB** (Kinesis limit).

## pycarlo models

```python
from pycarlo.features.ingestion import (
    IngestionService,
    LineageEvent,
    LineageAssetRef,
    ColumnLineageField,
    ColumnLineageSourceField,
)
```

## Table lineage example

```python
event = LineageEvent(
    destination=LineageAssetRef(
        database="analytics",
        schema="public",
        table="customer_orders",
    ),
    sources=[
        LineageAssetRef(database="analytics", schema="public", table="customers"),
        LineageAssetRef(database="analytics", schema="public", table="orders"),
    ],
)

result = service.send_lineage(
    resource_uuid="<your-resource-uuid>",
    resource_type="data-lake",
    events=[event],
)
invocation_id = service.extract_invocation_id(result)
print("invocation_id:", invocation_id)
```

## Column lineage example

```python
event = LineageEvent(
    destination=LineageAssetRef(
        database="analytics",
        schema="public",
        table="customer_orders",
    ),
    sources=[
        LineageAssetRef(database="analytics", schema="public", table="customers"),
        LineageAssetRef(database="analytics", schema="public", table="orders"),
    ],
    # column mappings: dest_col ← src_table.src_col
    fields=[
        ColumnLineageField(
            destination_field="customer_id",
            source_fields=[
                ColumnLineageSourceField(
                    database="analytics", schema="public",
                    table="customers", field="customer_id",
                )
            ],
        ),
        ColumnLineageField(
            destination_field="order_amount",
            source_fields=[
                ColumnLineageSourceField(
                    database="analytics", schema="public",
                    table="orders", field="amount",
                )
            ],
        ),
    ],
)

result = service.send_lineage(
    resource_uuid=resource_uuid,
    resource_type="data-lake",
    events=[event],
)
```

Column lineage push automatically creates a table-level edge too, so you don't need to
send separate table and column lineage events for the same relationship.

## Extracting lineage from SQL logs

For warehouses that don't expose a native lineage table, extract lineage by parsing query
history SQL for `CREATE TABLE AS SELECT`, `INSERT INTO ... SELECT`, and `MERGE INTO` patterns.

Simplified example regex:
```python
import re

CTAS_PATTERN = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)\s+AS\s+SELECT",
    re.IGNORECASE,
)
INSERT_PATTERN = re.compile(
    r"INSERT\s+(?:OVERWRITE\s+)?(?:INTO\s+)?(\S+).*?FROM\s+(\S+)",
    re.IGNORECASE | re.DOTALL,
)
```

For Snowflake, BigQuery, and Redshift the query history tables provide this SQL.
For Databricks, use `system.access.table_lineage` directly (no parsing needed).
For Hive, parse the HiveServer2 log file.

## Output manifest (include invocation_id)

```python
manifest = {
    "resource_uuid": resource_uuid,
    "invocation_id": service.extract_invocation_id(result),   # ← save this
    "collected_at": datetime.now(tz=timezone.utc).isoformat(),
    "edges": [
        {
            "destination": {"database": e.destination.database, "table": e.destination.table},
            "sources": [{"database": s.database, "table": s.table} for s in e.sources],
        }
        for e in events
    ],
}
with open("lineage_output.json", "w") as f:
    json.dump(manifest, f, indent=2)
```

## How push lineage is distinguished from query-derived lineage

Push-ingested lineage nodes and edges carry `origin = push_ingest` in Neo4j and
`origin_type = DIRECT_LINEAGE` in the normalized lineage model. This prevents the lineage
DAG from overwriting them with query-log-derived edges and gives MC a clear audit trail.

## Neo4j node expiry

Push-ingested **table lineage** nodes and edges are written with `expire_at = 9999-12-31`
(never expire). This is handled internally by PushLineageProcessor — you do not need to set
this manually when using `send_lineage()`.

Push-ingested **column lineage** expires after **10 days**, same as pulled column lineage.

For custom nodes created via GraphQL mutations, you **do** need to set
`expireAt: "9999-12-31"` explicitly — see `references/custom-lineage.md`.
