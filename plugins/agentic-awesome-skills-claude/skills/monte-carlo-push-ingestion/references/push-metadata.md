# Pushing Table Metadata

## Overview

Metadata push sends three types of signals per table:
- **Schema** — column names and types
- **Volume** — row count and byte count
- **Freshness** — last update timestamp

All three travel together in a single `RelationalAsset` object via `POST /ingest/v1/metadata`.

**Expiration**: Pushed table metadata **does not expire**. Once pushed, it remains in Monte
Carlo until explicitly deleted via `deletePushIngestedTables`.

**Batching**: For large numbers of tables, split assets into batches. The compressed request
body must not exceed **1MB** (Kinesis limit).

## pycarlo models

```python
from pycarlo.features.ingestion import (
    IngestionService,
    RelationalAsset,
    AssetMetadata,
    AssetField,
    AssetVolume,
    AssetFreshness,
)
```

## Minimal example

```python
asset = RelationalAsset(
    type="TABLE",  # ONLY "TABLE" or "VIEW" — normalize warehouse-native values
    metadata=AssetMetadata(
        name="orders",
        database="analytics",
        schema="public",
        description="Order transactions",
    ),
    fields=[
        AssetField(name="order_id", type="INTEGER"),
        AssetField(name="amount",   type="DECIMAL"),
        AssetField(name="created_at", type="TIMESTAMP"),
    ],
    volume=AssetVolume(
        row_count=1_500_000,
        byte_count=250_000_000,
    ),
    freshness=AssetFreshness(
        last_update_time="2024-03-01T12:00:00Z",  # ISO 8601 string, NOT a datetime object
    ),
)

result = service.send_metadata(
    resource_uuid="<your-resource-uuid>",
    resource_type="data-lake",   # see note below on resource_type
    events=[asset],
)
invocation_id = service.extract_invocation_id(result)
print("invocation_id:", invocation_id)   # save this!
```

## resource_type

The `resource_type` value must match the type of the MC resource (warehouse connection) you
are pushing to. Use the same string that appears in the MC UI or the `connectionType` field
from `getUser { account { warehouses { connectionType } } }`.

Common values:
- `"data-lake"` — Hive, EMR, Glue, generic data lake connections
- `"snowflake"` — Snowflake
- `"bigquery"` — BigQuery
- `"databricks"` — Databricks Unity Catalog
- `"redshift"` — Redshift

## Asset type

The `type` parameter on `RelationalAsset` must be one of two values (uppercase):
- `"TABLE"` — tables, external tables, dynamic tables, materialized views, etc.
- `"VIEW"` — views, secure views

**Important**: Warehouse-native type values like `"BASE TABLE"` (Snowflake), `"MANAGED"` /
`"EXTERNAL"` (Databricks), or `"MATERIALIZED_VIEW"` (BigQuery) are **NOT accepted** by the
MC API and will cause a 400 error. Always normalize to `"TABLE"` or `"VIEW"` before pushing.

## Field types

Normalize to SQL-standard uppercase strings. Monte Carlo accepts any string but canonical
values like `INTEGER`, `BIGINT`, `VARCHAR`, `FLOAT`, `BOOLEAN`, `TIMESTAMP`, `DATE`,
`DECIMAL`, `ARRAY`, `STRUCT` work best with downstream features.

## Volume and freshness are optional

If your warehouse doesn't expose row counts or last-modified timestamps, omit `volume`
and/or `freshness` — schema-only metadata is valid.

If you send `freshness`, each push must carry a **changed** `last_update_time` to count as
a new data point for the anomaly detector (repeated identical timestamps don't advance the
training clock).

## Freshness + volume only mode (skip schema)

For periodic pushes (e.g. hourly cron), you often don't need to re-collect the full schema
on every run — field definitions rarely change. Collection scripts can support a
`--only-freshness-and-volume` flag that skips the `COLUMNS` / `INFORMATION_SCHEMA` query
and omits `fields` from the manifest. This is significantly faster on warehouses with many
tables. Use the full collection (with fields) on the first push and on a daily schedule,
and the freshness+volume only mode for hourly pushes in between. See the
[BigQuery Iceberg example](https://github.com/monte-carlo-data/mcd-public-resources/tree/main/examples/push-ingestion/bigquery/push-iceberg-tables)
for a working implementation of this pattern.

## Batch multiple tables

`events` accepts a list. Push all tables in a single call or in batches:

```python
result = service.send_metadata(
    resource_uuid=resource_uuid,
    resource_type="data-lake",
    events=[asset1, asset2, asset3, ...],
)
```

## Output manifest (include invocation_id)

Always write a local manifest so you can trace issues later:

```python
import json
from datetime import datetime, timezone

manifest = {
    "resource_uuid": resource_uuid,
    "invocation_id": service.extract_invocation_id(result),   # ← critical for debugging
    "collected_at": datetime.now(tz=timezone.utc).isoformat(),
    "assets": [
        {
            "database": a.metadata.database,
            "schema": a.metadata.schema,
            "table": a.metadata.name,
            "row_count": a.volume.row_count if a.volume else None,
            "fields": [{"name": f.name, "type": f.type} for f in a.fields],
        }
        for a in assets
    ],
}
with open("metadata_output.json", "w") as f:
    json.dump(manifest, f, indent=2)
```

## Push frequency for anomaly detection

To keep volume and freshness anomaly detectors active:
- Push **at most once per hour** (pushing more frequently produces unpredictable behavior)
- Push **consistently** — gaps longer than a few days will deactivate detectors
- See `references/anomaly-detection.md` for minimum sample requirements
