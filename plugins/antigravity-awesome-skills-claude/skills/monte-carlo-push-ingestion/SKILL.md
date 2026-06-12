---
name: monte-carlo-push-ingestion
description: "Expert guide for pushing metadata, lineage, and query logs to Monte Carlo from any data warehouse."
category: data
risk: safe
source: community
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: "2026-04-08"
author: monte-carlo-data
tags: [data-observability, ingestion, monte-carlo, pycarlo, metadata]
tools: [claude, cursor, codex]
---

# Monte Carlo Push Ingestion

You are an agent that helps customers collect metadata, lineage, and query logs from their
data warehouses and push that data to Monte Carlo via the push ingestion API. The push model
works with **any data source** — if the customer's warehouse does not have a ready-made
template, derive the appropriate collection queries from that warehouse's system catalog or
metadata APIs. The push format and pycarlo SDK calls are the same regardless of source.

Monte Carlo's push model lets customers send metadata, lineage, and query logs directly to
Monte Carlo instead of waiting for the pull collector to gather it. It fills gaps the pull
model cannot always cover — integrations that don't expose query history, custom lineage
between non-warehouse assets, or customers who already have this data and want to send it
directly.

## When to Use

Use this skill when the user needs to collect metadata, lineage, freshness, volume, or query-log data from a warehouse or adjacent system and push it into Monte Carlo through the push-ingestion API.

Push data travels through the integration gateway → dedicated Kinesis streams → thin
adapter/normalizer code → the same downstream systems that power the pull model. The only
new infrastructure is the ingress layer; everything after it is shared.

## MANDATORY — Always start from templates

When generating any push-ingestion script, you MUST:

1. **Read the corresponding template** before writing any code. Templates live in this skill's
   directory under `scripts/templates/<warehouse>/`. To find them, glob for
   `**/push-ingestion/scripts/templates/<warehouse>/*.py` — this works regardless of where the
   skill is installed. Do NOT search from the current working directory alone.
2. **Adapt the template** to the customer's needs — do not write pycarlo imports, model constructors,
   or SDK method calls from memory.
3. If no template exists for the target warehouse, read the **Snowflake template** as the canonical
   reference and adapt only the warehouse-specific collection queries.

Template files follow this naming pattern:
- `collect_<flow>.py` — collection only (queries the warehouse, writes a JSON manifest)
- `push_<flow>.py` — push only (reads the manifest, sends to Monte Carlo)
- `collect_and_push_<flow>.py` — combined (imports from both, runs in sequence)

**After running any push script**, you MUST surface the `invocation_id`(s) returned by the API
to the user. The invocation ID is the only way to trace pushed data through downstream systems
and is required for validation. Never let a push complete without showing the user the
invocation IDs — they need them for `/mc-validate-metadata`, `/mc-validate-lineage`, and
debugging.

## Canonical pycarlo API — authoritative reference

The following imports, classes, and method signatures are the **ONLY** correct pycarlo API for
push ingestion. If your training data suggests different names, **it is wrong**. Use exactly
what is listed here.

### Imports and client setup

```python
from pycarlo.core import Client, Session
from pycarlo.features.ingestion import IngestionService
from pycarlo.features.ingestion.models import (
    # Metadata
    RelationalAsset, AssetMetadata, AssetField, AssetVolume, AssetFreshness, Tag,
    # Lineage
    LineageEvent, LineageAssetRef, ColumnLineageField, ColumnLineageSourceField,
    # Query logs
    QueryLogEntry,
)

client = Client(session=Session(mcd_id=key_id, mcd_token=key_token, scope="Ingestion"))
service = IngestionService(mc_client=client)
```

### Method signatures

```python
# Metadata
service.send_metadata(resource_uuid=..., resource_type=..., events=[RelationalAsset(...)])

# Lineage (table or column)
service.send_lineage(resource_uuid=..., resource_type=..., events=[LineageEvent(...)])

# Query logs — note: log_type, NOT resource_type
service.send_query_logs(resource_uuid=..., log_type=..., events=[QueryLogEntry(...)])

# Extract invocation ID from any response
service.extract_invocation_id(result)
```

### RelationalAsset structure (nested, NOT flat)

```python
RelationalAsset(
    type="TABLE",  # ONLY "TABLE" or "VIEW" (uppercase) — normalize warehouse-native values
    metadata=AssetMetadata(
        name="my_table",
        database="analytics",
        schema="public",
        description="optional description",
    ),
    fields=[
        AssetField(name="id", type="INTEGER", description=None),
        AssetField(name="amount", type="DECIMAL(10,2)"),
    ],
    volume=AssetVolume(row_count=1000000, byte_count=111111111),  # optional
    freshness=AssetFreshness(last_update_time="2026-03-12T14:30:00Z"),  # optional
)
```

## Environment variable conventions

All generated scripts MUST use these exact variable names. Do NOT invent alternatives like
`MCD_KEY_ID`, `MC_TOKEN`, `MONTE_CARLO_KEY`, etc.

| Variable | Purpose | Used by |
|---|---|---|
| `MCD_INGEST_ID` | Ingestion key ID (scope=Ingestion) | push scripts |
| `MCD_INGEST_TOKEN` | Ingestion key secret | push scripts |
| `MCD_ID` | GraphQL API key ID | verification scripts |
| `MCD_TOKEN` | GraphQL API key secret | verification scripts |
| `MCD_RESOURCE_UUID` | Warehouse resource UUID | all scripts |

## What this skill can build for you

Tell Claude your warehouse or data platform and Monte Carlo resource UUID and this skill will
generate a ready-to-run Python script that:
- Connects to your warehouse using the idiomatic driver for that platform
- Discovers databases, schemas, and tables
- Extracts the right columns — names, types, row counts, byte counts, last modified time, descriptions
- Builds the correct pycarlo `RelationalAsset`, `LineageEvent`, or `QueryLogEntry` objects
- Pushes to Monte Carlo and saves an output manifest with the `invocation_id` for tracing

Templates are available for common warehouses (Snowflake, BigQuery, BigQuery Iceberg,
Databricks, Redshift, Hive). For any other platform, Claude will derive the appropriate
collection queries from the warehouse's system catalog or metadata APIs and generate an
equivalent script.

### Ready-to-run examples

Production-ready example scripts built from these templates are published in the
[mcd-public-resources](https://github.com/monte-carlo-data/mcd-public-resources) repo:

- **[BigQuery Iceberg (BigLake) tables](https://github.com/monte-carlo-data/mcd-public-resources/tree/main/examples/push-ingestion/bigquery/push-iceberg-tables)** —
  metadata and query log collection for BigQuery Iceberg tables that are invisible to Monte
  Carlo's standard pull collector (which uses `__TABLES__`). Includes a `--only-freshness-and-volume`
  flag for fast periodic pushes that skip the schema/fields query — useful for hourly cron jobs
  after the initial full metadata push.

## Reference docs — when to load

| Reference file | Load when… |
|---|---|
| `references/prerequisites.md` | Customer is setting up for the first time, has auth errors, or needs help creating API keys |
| `references/push-metadata.md` | Building or debugging a metadata collection script |
| `references/push-lineage.md` | Building or debugging a lineage collection script |
| `references/push-query-logs.md` | Building or debugging a query log collection script |
| `references/custom-lineage.md` | Customer needs custom lineage nodes or edges via GraphQL |
| `references/validation.md` | Verifying pushed data, running GraphQL checks, or deleting push-ingested tables |
| `references/direct-http-api.md` | Customer wants to call push APIs directly via curl/HTTP without pycarlo |
| `references/anomaly-detection.md` | Customer asks why freshness or volume detectors aren't firing |

## Prerequisites — read this first

→ Load `references/prerequisites.md`

Two separate API keys are required. This is the most common setup stumbling block:
- **Ingestion key** (scope=Ingestion) — for pushing data
- **GraphQL API key** — for verification queries

Both use the same `x-mcd-id` / `x-mcd-token` headers but point to different endpoints.

## What you can push

| Flow | pycarlo method | Push endpoint | Type field | Expiration |
|---|---|---|---|---|
| Table metadata | `send_metadata()` | `/ingest/v1/metadata` | `resource_type` (e.g. `"data-lake"`) | **Never expires** |
| Table lineage | `send_lineage()` | `/ingest/v1/lineage` | `resource_type` (same as metadata) | **Never expires** |
| Column lineage | `send_lineage()` (events include `fields`) | `/ingest/v1/lineage` | `resource_type` (same as metadata) | **Expires after 10 days** |
| Query logs | `send_query_logs()` | `/ingest/v1/querylogs` | **`log_type`** (not `resource_type`!) | Same as pulled |
| Custom lineage | GraphQL mutations | `api.getmontecarlo.com/graphql` | N/A — uses GraphQL API key | 7 days default; set `expireAt: "9999-12-31"` for permanent |

**Important**: Query logs use `log_type` instead of `resource_type`. This is the only push
endpoint where the field name differs. See `references/push-query-logs.md` for the full list
of supported `log_type` values.

The pycarlo SDK is optional — you can also call the push APIs directly via HTTP/curl. See
`references/direct-http-api.md` for examples.

Every push returns an `invocation_id` — save it. It is your primary debugging handle across
all downstream systems.

## Step 1 — Generate your collection scripts

Ask Claude to build the script for your warehouse:

> "Build me a metadata collection script for Snowflake. My MC resource UUID is `abc-123`."

The script templates in `**/push-ingestion/scripts/templates/` (Snowflake, BigQuery, BigQuery Iceberg, Databricks, Redshift, Hive)
are the **mandatory starting point** for script generation — they contain the correct pycarlo
imports, model constructors, and SDK calls. **They are not an exhaustive list.** If the
customer's warehouse is not listed, use the templates as a guide and determine the appropriate
queries or file-collection approach for their platform. For file-based sources (like Hive
Metastore logs), provide the command to retrieve the file, parse it, and transform it into the
format required by the push APIs. The push format and SDK calls are identical regardless of
source; only the collection queries change.

**Batching**: For large payloads, split events into batches. Use a batch size of **50 assets**
per push call. The pycarlo HTTP client has a hardcoded 10-second read timeout that cannot be
overridden (`Session` and `Client` do not accept a `timeout` parameter) — larger batches (200+)
will timeout on warehouses with thousands of tables. The compressed request body must also not
exceed **1MB** (Kinesis limit). All push endpoints support batching.

**Push frequency**: Push at most **once per hour**. Sub-hourly pushes produce unpredictable
anomaly detector behavior because the training pipeline aggregates into hourly buckets.

**Per flow, see:**
- Metadata (schema + volume + freshness): `references/push-metadata.md`
- Table and column lineage: `references/push-lineage.md`
- Query logs: `references/push-query-logs.md`

## Step 2 — Validate pushed data

After pushing, verify data is visible in Monte Carlo using the GraphQL API (GraphQL API key).

→ `references/validation.md` — all verification queries (getTable, getMetricsV4,
getTableLineage, getDerivedTablesPartialLineage, getAggregatedQueries)

Timing expectations:
- **Metadata**: visible within a few minutes
- **Table lineage**: visible within seconds to a few minutes (fast direct path to Neo4j)
- **Column lineage**: a few minutes
- **Query logs**: at least **15-20 minutes** (async processing pipeline)

## Step 3 — Anomaly detection (optional)

If you want Monte Carlo's freshness and volume detectors to fire on pushed data, you need to
push consistently over time — detectors require historical data to train.

→ `references/anomaly-detection.md` — recommended push frequency, minimum samples,
training windows, and what to tell customers who ask why detectors aren't activating

## Custom lineage nodes and edges

For non-warehouse assets (dbt models, Airflow DAGs, custom ETL pipelines) or cross-resource
lineage, use the GraphQL mutations directly:

→ `references/custom-lineage.md` — `createOrUpdateLineageNode`, `createOrUpdateLineageEdge`,
`deleteLineageNode`, and the critical `expireAt: "9999-12-31"` rule

## Deleting push-ingested tables

Push tables are excluded from the normal pull-based deletion flow (intentionally). To delete
them explicitly, use `deletePushIngestedTables` — covered in `references/validation.md`
under "Table management operations".

## Available slash commands

Customers can invoke these explicitly instead of describing their intent in prose:

| Command | Purpose |
|---|---|
| `/mc-build-metadata-collector` | Generate a metadata collection script |
| `/mc-build-lineage-collector` | Generate a lineage collection script |
| `/mc-build-query-log-collector` | Generate a query log collection script |
| `/mc-validate-metadata` | Verify pushed metadata via the GraphQL API |
| `/mc-validate-lineage` | Verify pushed lineage via the GraphQL API |
| `/mc-validate-query-logs` | Verify pushed query logs via the GraphQL API |
| `/mc-create-lineage-node` | Create a custom lineage node |
| `/mc-create-lineage-edge` | Create a custom lineage edge |
| `/mc-delete-lineage-node` | Delete a custom lineage node |
| `/mc-delete-push-tables` | Delete push-ingested tables |

## Debugging checkpoints

When pushed data isn't appearing, work through these five checkpoints in order:

1. **Did the SDK return a `202` and an `invocation_id`?**
   If not, the gateway rejected the request — check auth headers and `resource.uuid`.

2. **Is the integration key the right type?**
   Must be scope `Ingestion`, created via `montecarlo integrations create-key --scope Ingestion`.
   A standard GraphQL API key will not work for push.

3. **Is `resource.uuid` correct and authorized?**
   The key can be scoped to specific warehouse UUIDs. If the UUID doesn't match, you get `403`.

4. **Did the normalizer process it?**
   Use the `invocation_id` to search CloudWatch logs for the relevant Lambda. For query logs,
   check the `log_type` — Hive requires `"hive-s3"`, not `"hive"`.

5. **Did the downstream system pick it up?**
   - Metadata: query `getTable` in GraphQL
   - Table lineage: check Neo4j within seconds–minutes (fast path via PushLineageProcessor)
   - Query logs: wait at least 15-20 minutes; check `getAggregatedQueries`

## Known gotchas

- **`log_type` vs `resource_type`**: metadata and lineage use `resource_type` (e.g. `"data-lake"`);
  query logs use **`log_type`** — the only endpoint where the field name differs. Wrong value →
  `Unsupported ingest query-log log_type` error.
- **`invocation_id` must be saved**: every output manifest should include it — it's your
  only tracing handle once the request leaves the SDK.
- **Query log async delay**: at least 15-20 minutes. `getAggregatedQueries` will return 0 until
  processing completes — this is expected, not a bug.
- **Custom lineage `expireAt` defaults to 7 days**: nodes vanish silently unless you set
  `expireAt: "9999-12-31"` for permanent nodes.
- **Push tables are never auto-deleted**: the periodic cleanup job excludes them by default
  (`exclude_push_tables=True`). Delete them explicitly via `deletePushIngestedTables` (max
  1,000 MCONs per call; also deletes lineage nodes and all edges touching those nodes).
- **Anomaly detectors need history**: pushing once is not enough. Freshness needs 7+ pushes
  over ~2 weeks; volume needs 10–48 samples over ~42 days. Push at most once per hour.
- **Batching required for large payloads**: the compressed request body must not exceed 1MB.
  Split large event lists into batches.
- **Column lineage expires after 10 days**: unlike table metadata and table lineage (which
  never expire), column lineage has a 10-day TTL, same as pulled column lineage.
- **Quote SQL identifiers in warehouse queries**: database, schema, and table names must be
  quoted to handle mixed-case or special characters. The quoting syntax varies by warehouse —
  Snowflake and Redshift use double quotes (`"{db}"`), BigQuery/Databricks/Hive use backticks
  (`` `db` ``). The templates already handle this correctly for each warehouse — follow the
  same quoting pattern when adapting.

## Memory safety

Generated scripts must include a startup memory check. The collection phase loads query history
rows into memory for parsing — on large warehouses with long lookback windows, this can exhaust
available RAM and cause the process to be silently killed (SIGKILL / exit 137) with no traceback.

Add this pattern near the top of every generated script, after imports:

```python
import os

def _check_available_memory(min_gb: float = 2.0) -> None:
    """Warn if available memory is below the threshold."""
    try:
        if hasattr(os, "sysconf"):  # Linux / macOS
            page_size = os.sysconf("SC_PAGE_SIZE")
            avail_pages = os.sysconf("SC_AVPHYS_PAGES")
            avail_gb = (page_size * avail_pages) / (1024 ** 3)
        else:
            return  # Windows — skip check
    except (ValueError, OSError):
        return
    if avail_gb < min_gb:
        print(
            f"WARNING: Only {avail_gb:.1f} GB of memory available "
            f"(minimum recommended: {min_gb:.1f} GB). "
            f"Consider reducing the lookback window or increasing available memory."
        )
```

Call `_check_available_memory()` before connecting to the warehouse.

Additionally, when fetching query history:
- Use `cursor.fetchmany(batch_size)` in a loop instead of `cursor.fetchall()` when possible
- For very large result sets, consider adding a LIMIT clause and processing in windows

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
