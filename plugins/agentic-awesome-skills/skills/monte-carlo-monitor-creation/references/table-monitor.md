# Table Monitor Reference

Detailed reference for building `createTableMonitorMac` tool calls.

## When to Use

Use a table monitor when the user wants to:

- Monitor many tables at once across an entire database or schema
- Track freshness (when was each table last updated?)
- Detect schema changes (columns added, removed, or type-changed)
- Monitor volume changes (row count anomalies) across a broad set of tables
- Apply broad coverage with anomaly detection (no custom thresholds needed)

**Do NOT use a table monitor when the user wants to:**

- Track field-level metrics on a single table (use a metric monitor)
- Apply custom thresholds or explicit operators like GT/LT (use a metric monitor)
- Validate row-level business rules or referential integrity (use a validation monitor)

---

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Unique identifier for the table monitor. Must be unique across all table monitors in the same namespace. |
| `description` | string | Human-readable description of what the monitor checks (max 512 characters). |
| `warehouse` | string | Warehouse name or UUID. Use `getTable` or `search` to find it. |
| `asset_selection` | object | Asset selection config defining which tables to monitor (see Asset Selection below). |

## Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `alert_conditions` | array of strings | `["last_updated_on", "schema", "total_row_count", "total_row_count_last_changed_on"]` | Metric names to monitor (see Alert Conditions below). |
| `domain_id` | string (uuid) | none | Domain UUID (use `getDomains` to list). |

---

## Pre-Step: Verify Warehouse

Before creating a table monitor, resolve the warehouse name or UUID. The `warehouse` parameter is required and must match an existing warehouse in the Monte Carlo account.

1. If the user provides a table name, call `getTable` to retrieve the table details -- the response includes the warehouse name and UUID.
2. If the user provides a database or schema name without a specific table, call `search` with the database or schema name to find assets and identify the warehouse.
3. Use either the warehouse name or UUID in the `warehouse` parameter.

**NEVER guess the warehouse value.** If you cannot resolve it, ask the user.

---

## Asset Selection

The `asset_selection` object defines which tables the monitor covers. It must include a `databases` list.

**Use database and schema scoping to select which tables to monitor.** This is the reliable approach and covers most use cases.

> **Known limitation:** The MCP tool supports `filters` and `exclusions` parameters, but the tool's schema describes the wrong format for them. Until this is fixed ([K2-269](https://linear.app/montecarlodata/issue/K2-269)), **do not pass `filters` or `exclusions`** — they will cause errors. Use database/schema scoping instead to narrow the set of monitored tables. If the user needs regex or pattern-based filtering, explain this limitation and suggest either (a) using schema-level scoping to get close, or (b) creating individual metric monitors for specific tables.

### Database-Level Selection

To monitor all tables in an entire database, specify only the database name with no `schemas` list:

```json
{
  "databases": [
    {"name": "analytics"}
  ]
}
```

This monitors every table in every schema within the `analytics` database.

### Schema-Level Selection

To monitor all tables in specific schemas, include the `schemas` list:

```json
{
  "databases": [
    {
      "name": "analytics",
      "schemas": ["core", "staging"]
    }
  ]
}
```

This monitors every table in the `core` and `staging` schemas within `analytics`, but not tables in other schemas.

### Multiple Databases

You can monitor tables across multiple databases in a single monitor:

```json
{
  "databases": [
    {"name": "analytics", "schemas": ["core"]},
    {"name": "raw_data"},
    {"name": "reporting", "schemas": ["public", "internal"]}
  ]
}
```

---

## Alert Conditions

Alert conditions define which metrics the table monitor tracks. The operator is always AUTO (anomaly detection) -- custom thresholds are not available for table monitors.

| Metric | Description |
|--------|-------------|
| `last_updated_on` | Freshness monitoring. Alerts when a table has not been updated within its normal cadence. |
| `schema` | Any schema change. Alerts when columns are added, removed, or their types change. |
| `schema_fields_added` | New columns detected. Alerts only when new columns appear in the table. |
| `schema_fields_removed` | Columns removed. Alerts only when existing columns are dropped from the table. |
| `schema_fields_type_change` | Column type changes. Alerts only when a column's data type changes. |
| `total_row_count` | Row count changes. Alerts on anomalous changes in total row count. |
| `total_row_count_last_changed_on` | Time since last volume change. Alerts when the row count has not changed for an unusual duration. |

### Notes

- **All operators are AUTO (anomaly detection).** Table monitors do not support custom thresholds like GT, LT, or explicit operators. If the user needs custom thresholds, use a metric monitor instead.
- **No `schedule` field.** Table monitors do not support the `schedule` field in MaC YAML. Adding it will cause a validation error on `montecarlo monitors apply`. Table monitor scheduling is managed automatically by Monte Carlo. Do NOT add a schedule block to the generated YAML.
- The default set (`last_updated_on`, `schema`, `total_row_count`, `total_row_count_last_changed_on`) provides broad coverage and is appropriate for most use cases. Only override the defaults when the user specifically requests a subset.
- `schema` is a superset of `schema_fields_added`, `schema_fields_removed`, and `schema_fields_type_change`. If using `schema`, there is no need to also include the granular schema metrics.

---

## Examples

### Monitor all tables in a database (minimal config)

```json
{
  "name": "analytics_db_monitor",
  "description": "Monitor all tables in the analytics database for freshness, schema changes, and volume",
  "warehouse": "production_warehouse",
  "asset_selection": {
    "databases": [
      {"name": "analytics"}
    ]
  }
}
```

Uses the default alert conditions (`last_updated_on`, `schema`, `total_row_count`, `total_row_count_last_changed_on`).

### Monitor specific schemas with default alerts

```json
{
  "name": "core_schemas_monitor",
  "description": "Monitor all tables in core and reporting schemas",
  "warehouse": "production_warehouse",
  "asset_selection": {
    "databases": [
      {
        "name": "analytics",
        "schemas": ["core", "reporting"]
      }
    ]
  }
}
```

Monitors every table in the `core` and `reporting` schemas, leaving other schemas unmonitored.

### Monitor multiple schemas across databases

```json
{
  "name": "prod_tables_monitor",
  "description": "Monitor production tables across analytics and raw_data databases",
  "warehouse": "production_warehouse",
  "asset_selection": {
    "databases": [
      {
        "name": "analytics",
        "schemas": ["core", "reporting"]
      },
      {
        "name": "raw_data",
        "schemas": ["ingestion"]
      }
    ]
  }
}
```

Monitors tables in specific production schemas, leaving development and staging schemas unmonitored.

### Schema change monitoring only

```json
{
  "name": "warehouse_schema_watch",
  "description": "Track schema changes across the entire data warehouse",
  "warehouse": "production_warehouse",
  "asset_selection": {
    "databases": [
      {"name": "analytics"},
      {"name": "raw_data"}
    ]
  },
  "alert_conditions": [
    "schema_fields_added",
    "schema_fields_removed",
    "schema_fields_type_change"
  ]
}
```

Monitors only schema changes (not freshness or volume) across multiple databases. Uses the granular schema metrics instead of `schema` to allow selectively enabling/disabling each type.

---

## Table Monitor vs Metric Monitor

| Aspect | Table Monitor | Metric Monitor |
|--------|---------------|----------------|
| **Scope** | Multiple tables (database/schema level) | Single table |
| **Metrics** | Freshness, schema changes, row count | Field-level metrics (null rate, mean, sum, etc.) |
| **Operator** | AUTO only (anomaly detection) | AUTO or explicit thresholds (GT, LT, EQ, etc.) |
| **Asset selection** | Database/schema with filters and exclusions | Single table specified by MCON or name |
| **Timestamp field** | Not required | Required (`aggregate_time_field`) |
| **Segmentation** | Not available | Available via `segment_fields` |
| **Best for** | Broad coverage, freshness, schema drift | Targeted field-level data quality checks |

**Rule of thumb:** If the user wants to monitor a specific field on a specific table with specific thresholds, use a metric monitor. If the user wants broad monitoring across many tables with automatic anomaly detection, use a table monitor.
