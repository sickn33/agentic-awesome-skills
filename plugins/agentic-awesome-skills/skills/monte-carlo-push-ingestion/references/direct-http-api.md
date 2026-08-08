# Direct HTTP API (without pycarlo)

The `pycarlo` SDK is optional. You can call the push APIs directly over HTTPS from any
language or tool (curl, Postman, etc.) as long as you:
- authenticate with an integration key whose scope is `Ingestion`
- send a JSON body that matches the ingest schema
- send to the correct integration gateway endpoint

## Endpoint

The host is environment-specific:
- **Production**: `https://integrations.getmontecarlo.com`

## Authentication headers

All requests use the same headers:
```
x-mcd-id:       <integration-key-id>
x-mcd-token:    <integration-key-secret>
Content-Type:   application/json
```

## Response

On success, all endpoints return:
```json
{"invocation_id": "<uuid>"}
```

Save the `invocation_id` — it is the primary trace ID for debugging across downstream systems.

---

## Metadata example

`POST /ingest/v1/metadata`

```bash
curl -X POST "https://integrations.getmontecarlo.com/ingest/v1/metadata" \
  -H "Content-Type: application/json" \
  -H "x-mcd-id: <integration-key-id>" \
  -H "x-mcd-token: <integration-key-secret>" \
  -d '{
    "event_type": "RELATIONAL_ASSET",
    "resource": {
      "uuid": "<warehouse-uuid>",
      "resource_type": "snowflake"
    },
    "events": [
      {
        "type": "TABLE",
        "metadata": {
          "name": "orders",
          "database": "analytics",
          "schema": "public",
          "description": "Orders table"
        },
        "fields": [
          {"name": "id", "type": "INTEGER"},
          {"name": "amount", "type": "DECIMAL(10,2)"}
        ],
        "volume": {
          "row_count": 1000000,
          "byte_count": 111111111
        },
        "freshness": {
          "last_update_time": "2026-03-12T14:30:00Z"
        }
      }
    ]
  }'
```

`volume` and `freshness` are optional — you can push schema-only metadata.

---

## Table lineage example

`POST /ingest/v1/lineage` with `event_type: "LINEAGE"`

```bash
curl -X POST "https://integrations.getmontecarlo.com/ingest/v1/lineage" \
  -H "Content-Type: application/json" \
  -H "x-mcd-id: <integration-key-id>" \
  -H "x-mcd-token: <integration-key-secret>" \
  -d '{
    "event_type": "LINEAGE",
    "resource": {
      "uuid": "<warehouse-uuid>",
      "resource_type": "snowflake"
    },
    "events": [
      {
        "source": {
          "name": "orders_raw",
          "database": "analytics",
          "schema": "public"
        },
        "destination": {
          "name": "orders_curated",
          "database": "analytics",
          "schema": "public"
        }
      }
    ]
  }'
```

---

## Column lineage example

`POST /ingest/v1/lineage` with `event_type: "COLUMN_LINEAGE"`

Same endpoint as table lineage. Column lineage automatically creates the parent table-level
edge too.

```bash
curl -X POST "https://integrations.getmontecarlo.com/ingest/v1/lineage" \
  -H "Content-Type: application/json" \
  -H "x-mcd-id: <integration-key-id>" \
  -H "x-mcd-token: <integration-key-secret>" \
  -d '{
    "event_type": "COLUMN_LINEAGE",
    "resource": {
      "uuid": "<warehouse-uuid>",
      "resource_type": "snowflake"
    },
    "events": [
      {
        "source": {
          "name": "customers",
          "database": "analytics",
          "schema": "public"
        },
        "destination": {
          "name": "customer_orders",
          "database": "analytics",
          "schema": "public"
        },
        "col_mappings": [
          {
            "destination_col": "customer_id",
            "source_cols": ["customer_id"]
          },
          {
            "destination_col": "full_name",
            "source_cols": ["first_name", "last_name"]
          }
        ]
      }
    ]
  }'
```

---

## Query log example

`POST /ingest/v1/querylogs`

**Important**: this endpoint uses `log_type` instead of `resource_type` in the resource object.
This is the only endpoint where the field name differs.

```bash
curl -X POST "https://integrations.getmontecarlo.com/ingest/v1/querylogs" \
  -H "Content-Type: application/json" \
  -H "x-mcd-id: <integration-key-id>" \
  -H "x-mcd-token: <integration-key-secret>" \
  -d '{
    "event_type": "QUERY_LOG",
    "resource": {
      "uuid": "<warehouse-uuid>",
      "log_type": "snowflake"
    },
    "events": [
      {
        "start_time": "2026-03-02T12:00:00Z",
        "end_time": "2026-03-02T12:00:05Z",
        "query_text": "SELECT * FROM analytics.public.orders",
        "query_id": "query-123",
        "user": "analyst@company.com",
        "returned_rows": 10
      }
    ]
  }'
```

Supported `log_type` values: `snowflake`, `bigquery`, `databricks`, `redshift`, `hive-s3`,
`athena`, `teradata`, `clickhouse`, `databricks-metastore-sql-warehouse`, `s3`, `presto-s3`.

---

## Batching

The compressed request body must not exceed **1MB** (Kinesis limit). For large payloads, split
events into multiple requests. Each request returns its own `invocation_id`.

## Expiration summary

| Flow | Expiration |
|---|---|
| Table metadata | Never expires |
| Table lineage | Never expires |
| Column lineage | Expires after 10 days |
| Query logs | Same as pulled query logs |
