# Comparison Monitor Reference

Detailed reference for building `createComparisonMonitorMac` tool calls.

## When to Use

Use a comparison monitor when the user wants to:

- Compare data between two tables (e.g., source vs target, dev vs prod)
- Validate data consistency after migration or replication
- Check row count parity across environments
- Compare field-level metrics between tables (null counts, sums, distributions)

---

## Pre-Step: Verify Both Tables and Fields

Before constructing alert conditions, you MUST verify that both tables exist and that any referenced fields are real columns. This is the most common source of comparison monitor failures.

1. **Resolve both MCONs.** Use `search` to find the source and target tables. If the user provided `database:schema.table` format, search for each to get the MCON.
2. **Get full schemas.** Call `getTable` with `include_fields: true` on BOTH the source table and the target table. You need the column lists from both.
3. **For field-level metrics, verify fields exist on both sides.** Confirm that `sourceField` exists in the source table's column list AND `targetField` exists in the target table's column list. Field names are case-sensitive on most warehouses.
4. **Check field type compatibility.** The metric must be compatible with the column types on both sides. For example, `NUMERIC_MEAN` requires numeric columns in both the source and target tables. If the source column is numeric but the target is a string, the comparison will fail.
5. If any field does not exist or types are incompatible, stop and ask the user to clarify. Do not guess.

---

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Unique identifier for the monitor. Use a descriptive slug (e.g., `orders_dev_prod_compare`). |
| `description` | string | Human-readable description of what the monitor checks. |
| `source_table` | string | Source table MCON (preferred) or `database:schema.table` format. If not MCON, also pass `source_warehouse`. |
| `target_table` | string | Target table MCON (preferred) or `database:schema.table` format. If not MCON, also pass `target_warehouse`. |
| `alert_conditions` | array | List of comparison conditions (see Alert Conditions below). |

## Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `source_warehouse` | string | Warehouse name or UUID for the source table. Required if `source_table` is not an MCON. |
| `target_warehouse` | string | Warehouse name or UUID for the target table. Required if `target_table` is not an MCON. |
| `segment_fields` | array of string | Fields to segment the comparison by. Must exist in BOTH tables with the same name. |
| `domain_id` | string (uuid) | Domain UUID (use `getDomains` to list). Only one domain can be assigned per monitor. |

---

## Cross-Warehouse Comparisons

When the source and target tables live in different warehouses (e.g., comparing a Snowflake staging table against a BigQuery production table), you MUST provide both `source_warehouse` and `target_warehouse` explicitly. The tool cannot auto-resolve warehouses when tables are in different environments.

Even when both tables are MCONs, if they belong to different warehouses, pass both warehouse parameters to be safe. Omitting them in cross-warehouse scenarios causes silent failures or incorrect results.

Common cross-warehouse patterns:
- **Dev vs prod:** same warehouse type, different databases or schemas
- **Migration validation:** source in old warehouse, target in new warehouse
- **Replication checks:** primary warehouse vs replica or downstream warehouse

---

## Alert Conditions

Each condition compares a metric between the source and target tables.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metric` | string | Yes | The metric to compare (see Metrics Reference below). |
| `sourceField` | string | For field-level metrics | Column in the source table. Required for ALL metrics except `ROW_COUNT`. |
| `targetField` | string | For field-level metrics | Column in the target table. Required for ALL metrics except `ROW_COUNT`. |
| `thresholdValue` | number | No | Threshold for acceptable difference between source and target. |
| `isThresholdRelative` | boolean | No | `false` = absolute difference (default), `true` = percentage difference. |
| `customMetric` | object | No | Custom SQL expressions for source and target (see Custom Metrics below). |

---

## ROW_COUNT and Fields: A Critical Rule

> **NEVER pass `sourceField` or `targetField` when using the `ROW_COUNT` metric.**

`ROW_COUNT` is a table-level metric -- it counts all rows in the table, not values in a column. Passing field names with `ROW_COUNT` causes the API call to fail or produce unexpected behavior.

This is the single most common mistake with comparison monitors. Before submitting any alert condition with `ROW_COUNT`, verify that `sourceField` and `targetField` are both absent from the condition object.

| Metric | Fields needed? | What happens if you pass fields? |
|--------|---------------|----------------------------------|
| `ROW_COUNT` | **No -- NEVER pass fields** | API error or undefined behavior |
| All other metrics | **Yes -- always pass both fields** | Required for the comparison to work |

---

## Metrics Reference

### Table-level metric (no fields needed)

| Metric | Description |
|--------|-------------|
| `ROW_COUNT` | Compare total row counts between source and target. |

### Field-level metrics (require `sourceField` and `targetField`)

#### Uniqueness and duplicates

| Metric | Description |
|--------|-------------|
| `UNIQUE_COUNT` | Count of distinct values. |
| `DUPLICATE_COUNT` | Count of duplicate (non-unique) values. |
| `APPROX_DISTINCT_COUNT` | Approximate distinct count (faster on large tables). |

#### Null and empty checks

| Metric | Description |
|--------|-------------|
| `NULL_COUNT` | Count of null values. |
| `NON_NULL_COUNT` | Count of non-null values. |
| `EMPTY_STRING_COUNT` | Count of empty string values. |
| `TEXT_ALL_SPACES_COUNT` | Count of values that are all whitespace. |
| `NAN_COUNT` | Count of NaN values. |
| `TEXT_NULL_KEYWORD_COUNT` | Count of values containing null-like keywords (e.g., "NULL", "None"). |

#### Numeric statistics

| Metric | Description |
|--------|-------------|
| `NUMERIC_MEAN` | Mean of numeric field. |
| `NUMERIC_MEDIAN` | Median of numeric field. |
| `NUMERIC_MIN` | Minimum value. |
| `NUMERIC_MAX` | Maximum value. |
| `NUMERIC_STDDEV` | Standard deviation. |
| `SUM` | Sum of numeric field. |
| `ZERO_COUNT` | Count of zero values. |
| `NEGATIVE_COUNT` | Count of negative values. |

#### Percentiles

| Metric | Description |
|--------|-------------|
| `PERCENTILE_20` | 20th percentile value. |
| `PERCENTILE_40` | 40th percentile value. |
| `PERCENTILE_60` | 60th percentile value. |
| `PERCENTILE_80` | 80th percentile value. |

#### Text statistics

| Metric | Description |
|--------|-------------|
| `TEXT_MAX_LENGTH` | Maximum string length. |
| `TEXT_MIN_LENGTH` | Minimum string length. |
| `TEXT_MEAN_LENGTH` | Mean string length. |
| `TEXT_STD_LENGTH` | Standard deviation of string length. |

#### Text format checks

| Metric | Description |
|--------|-------------|
| `TEXT_NOT_INT_COUNT` | Count of values not parseable as integers. |
| `TEXT_NOT_NUMBER_COUNT` | Count of values not parseable as numbers. |
| `TEXT_NOT_UUID_COUNT` | Count of values not matching UUID format. |
| `TEXT_NOT_SSN_COUNT` | Count of values not matching SSN format. |
| `TEXT_NOT_US_PHONE_COUNT` | Count of values not matching US phone format. |
| `TEXT_NOT_US_STATE_CODE_COUNT` | Count of values not matching US state codes. |
| `TEXT_NOT_US_ZIP_CODE_COUNT` | Count of values not matching US zip codes. |
| `TEXT_NOT_EMAIL_ADDRESS_COUNT` | Count of values not matching email format. |
| `TEXT_NOT_TIMESTAMP_COUNT` | Count of values not parseable as timestamps. |

#### Boolean

| Metric | Description |
|--------|-------------|
| `TRUE_COUNT` | Count of true values. |
| `FALSE_COUNT` | Count of false values. |

#### Timestamp

| Metric | Description |
|--------|-------------|
| `FUTURE_TIMESTAMP_COUNT` | Count of timestamps in the future. |
| `PAST_TIMESTAMP_COUNT` | Count of timestamps unreasonably far in the past. |
| `UNIX_ZERO_COUNT` | Count of timestamps equal to Unix epoch zero (1970-01-01). |

---

## Choosing the Right Metric

| User intent | Correct metric | Fields needed? |
|-------------|---------------|----------------|
| Row count parity | `ROW_COUNT` | **No** -- never pass fields |
| Distinct values in a column | `UNIQUE_COUNT` | Yes |
| Null values in a column | `NULL_COUNT` | Yes |
| Sum, average, min, max | `SUM`, `NUMERIC_MEAN`, `NUMERIC_MIN`, `NUMERIC_MAX` | Yes |
| Data completeness | `NON_NULL_COUNT` | Yes |
| String format validation | `TEXT_NOT_EMAIL_ADDRESS_COUNT`, `TEXT_NOT_UUID_COUNT`, etc. | Yes |
| Custom computed expressions | Use `customMetric` instead of `metric` | No (SQL handles it) |

---

## Custom Metrics

Use custom metrics when:

- **Column names differ** between source and target and you need a computed expression (not just a direct field comparison).
- **You need a derived calculation** like `SUM(quantity * unit_price)` rather than a simple column metric.
- **Standard metrics do not cover the comparison** (e.g., comparing a ratio, a conditional aggregate, or a windowed calculation).

If the columns simply have different names but you want a standard metric (e.g., compare `SUM` of `revenue` in source vs `total_revenue` in target), you do NOT need a custom metric -- just use the standard metric with different `sourceField` and `targetField` values.

Custom metric structure:

```json
{
  "customMetric": {
    "displayName": "Revenue Sum",
    "sourceSqlExpression": "SUM(revenue)",
    "targetSqlExpression": "SUM(total_revenue)"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | string | Yes | Human-readable name for the metric in alerts and dashboards. |
| `sourceSqlExpression` | string | Yes | SQL expression evaluated against the source table. |
| `targetSqlExpression` | string | Yes | SQL expression evaluated against the target table. |

When using `customMetric`, do NOT also pass `metric`, `sourceField`, or `targetField` in the same alert condition. The custom metric replaces all of those.

---

## Threshold Guidance

### Absolute thresholds (`isThresholdRelative: false` or omitted)

The `thresholdValue` is the maximum acceptable absolute difference between the source and target metric values.

- `thresholdValue: 0` -- source and target must match exactly.
- `thresholdValue: 100` -- up to 100 units of difference is acceptable.

### Relative (percentage) thresholds (`isThresholdRelative: true`)

The `thresholdValue` is the maximum acceptable percentage difference.

- `thresholdValue: 5` -- up to 5% difference is acceptable.
- `thresholdValue: 0.1` -- up to 0.1% difference is acceptable.

### When to use each

| Scenario | Recommended threshold type |
|----------|---------------------------|
| Exact replication (row counts must match) | Absolute, `thresholdValue: 0` |
| Near-real-time sync with small lag | Absolute, small value (e.g., 10-100) |
| Tables at different scales | Relative, percentage-based |
| Aggregated metrics (sums, means) | Relative, to handle floating-point differences |

---

## Examples

### Row count parity with absolute threshold

Compare row counts between dev and prod, alerting if they differ by more than 100 rows.

```json
{
  "name": "orders_dev_prod_row_count",
  "description": "Verify dev and prod orders tables have similar row counts",
  "source_table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++dev_warehouse:core.orders",
  "target_table": "MCON++b2c3d4e5-f6a7-8901-bcde-f12345678901++1++1++prod_warehouse:core.orders",
  "alert_conditions": [
    {
      "metric": "ROW_COUNT",
      "thresholdValue": 100,
      "isThresholdRelative": false
    }
  ]
}
```

Note: no `sourceField` or `targetField` -- `ROW_COUNT` is table-level.

### Row count parity with percentage threshold

Alert if row counts differ by more than 5%.

```json
{
  "name": "orders_replication_check",
  "description": "Verify replicated orders table is within 5% of source row count",
  "source_table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++primary:sales.orders",
  "target_table": "MCON++b2c3d4e5-f6a7-8901-bcde-f12345678901++1++1++replica:sales.orders",
  "alert_conditions": [
    {
      "metric": "ROW_COUNT",
      "thresholdValue": 5,
      "isThresholdRelative": true
    }
  ]
}
```

### Field-level comparison (different column names)

Compare the sum of `revenue` in the source table against `total_revenue` in the target table.

```json
{
  "name": "revenue_source_target_sum",
  "description": "Verify revenue sums match between staging and production",
  "source_table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++staging:finance.transactions",
  "target_table": "MCON++b2c3d4e5-f6a7-8901-bcde-f12345678901++1++1++production:finance.transactions",
  "alert_conditions": [
    {
      "metric": "SUM",
      "sourceField": "revenue",
      "targetField": "total_revenue",
      "thresholdValue": 1,
      "isThresholdRelative": true
    }
  ]
}
```

### Segmented comparison

Compare null counts on `email` between source and target, segmented by `country`. The `country` field must exist in both tables.

```json
{
  "name": "email_nulls_by_country",
  "description": "Compare email null counts by country between ETL source and target",
  "source_table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++raw:crm.contacts",
  "target_table": "MCON++b2c3d4e5-f6a7-8901-bcde-f12345678901++1++1++analytics:crm.contacts",
  "segment_fields": ["country"],
  "alert_conditions": [
    {
      "metric": "NULL_COUNT",
      "sourceField": "email",
      "targetField": "email",
      "thresholdValue": 0,
      "isThresholdRelative": false
    }
  ]
}
```

### Cross-warehouse comparison with explicit warehouses

When source and target are in different warehouses, both warehouse parameters must be provided.

```json
{
  "name": "migration_users_row_count",
  "description": "Validate user row counts match after Snowflake to BigQuery migration",
  "source_table": "snowflake_db:public.users",
  "source_warehouse": "snowflake-prod",
  "target_table": "bigquery_project:public.users",
  "target_warehouse": "bigquery-prod",
  "alert_conditions": [
    {
      "metric": "ROW_COUNT",
      "thresholdValue": 0,
      "isThresholdRelative": false
    }
  ]
}
```

### Custom metric comparison

Compare a computed revenue expression when the SQL differs between source and target.

```json
{
  "name": "computed_revenue_compare",
  "description": "Compare total revenue computation between legacy and new schema",
  "source_table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++warehouse:legacy.orders",
  "target_table": "MCON++b2c3d4e5-f6a7-8901-bcde-f12345678901++1++1++warehouse:v2.orders",
  "alert_conditions": [
    {
      "customMetric": {
        "displayName": "Total Revenue",
        "sourceSqlExpression": "SUM(quantity * unit_price)",
        "targetSqlExpression": "SUM(total_amount)"
      },
      "thresholdValue": 0.01,
      "isThresholdRelative": true
    }
  ]
}
```

### Multiple alert conditions

Compare both row counts and field-level metrics in a single monitor.

```json
{
  "name": "orders_full_comparison",
  "description": "Full comparison of orders between staging and production",
  "source_table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++staging:core.orders",
  "target_table": "MCON++b2c3d4e5-f6a7-8901-bcde-f12345678901++1++1++production:core.orders",
  "domain_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "alert_conditions": [
    {
      "metric": "ROW_COUNT",
      "thresholdValue": 0,
      "isThresholdRelative": false
    },
    {
      "metric": "NULL_COUNT",
      "sourceField": "customer_id",
      "targetField": "customer_id",
      "thresholdValue": 0,
      "isThresholdRelative": false
    },
    {
      "metric": "SUM",
      "sourceField": "amount",
      "targetField": "amount",
      "thresholdValue": 0.1,
      "isThresholdRelative": true
    }
  ]
}
```

Note: the `ROW_COUNT` condition has no fields, while the field-level conditions each specify both `sourceField` and `targetField`.
