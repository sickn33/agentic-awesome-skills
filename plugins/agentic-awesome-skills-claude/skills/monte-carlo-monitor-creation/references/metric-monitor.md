# Metric Monitor Reference

Detailed reference for building `createMetricMonitorMac` tool calls.

## When to Use

Use a metric monitor when the user wants to:

- Track row count changes over time
- Monitor null rates, unique counts, or other statistical metrics on specific fields
- Detect anomalies in numeric distributions (mean, max, min, percentiles)
- Monitor data freshness (time since last row count change)
- Segment metrics by dimensions (e.g., by country, status)

---

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Unique identifier for the monitor. Use a descriptive slug (e.g., `orders_null_check`). |
| `description` | string | Human-readable description of what the monitor checks. |
| `table` | string | Table MCON (preferred) or `database:schema.table` format. If not MCON, also pass `warehouse`. |
| `aggregate_time_field` | string | **MUST be a real timestamp/datetime column from the table.** NEVER guess this value. |
| `alert_conditions` | array | List of alert condition objects (see Alert Conditions below). |

## Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `warehouse` | string | auto-resolved | Warehouse name or UUID. Required if `table` is not an MCON. |
| `segment_fields` | array of string | none | Fields to group/segment metrics by (e.g., `["country", "status"]`). |
| `aggregate_by` | string | `"day"` | Time interval: `"hour"`, `"day"`, `"week"`, `"month"`. |
| `where_condition` | string | none | SQL WHERE clause (without `WHERE` keyword) to filter rows before computing metrics. |
| `interval_minutes` | int | auto | Schedule interval in minutes. Must be compatible with `aggregate_by` (see note below). If not specified, the tool defaults to the minimum valid interval for the chosen `aggregate_by`. |
| `domain_id` | string (uuid) | none | Domain UUID (use `getDomains` to list). |

---

## Schedule and Aggregation Compatibility

The schedule interval must be compatible with `aggregate_by`. Daily aggregation requires an interval that is a multiple of 1440 minutes (24 hours), weekly requires a multiple of 10080, etc. If you pass `interval_minutes`, make sure it satisfies this constraint. If you omit it, the tool picks a sensible default.

| `aggregate_by` | Minimum `interval_minutes` | Default if omitted |
|---|---|---|
| `hour` | 60 | 60 |
| `day` | 1440 | 1440 |
| `week` | 10080 | 10080 |
| `month` | 43200 | 43200 |

For example, to run a daily-aggregated monitor every other day, pass `aggregate_by: "day"` and `interval_minutes: 2880`.

---

## Choosing the Timestamp Field

The `aggregate_time_field` is the most critical parameter. It MUST be a real column from the table that contains timestamp or datetime values. This is the number one source of monitor creation failures.

### How to pick it

1. You should already have the column names from `getTable` with `include_fields: true` (done in Step 2 of the main skill).
2. Look for columns whose names suggest a timestamp: `created_at`, `updated_at`, `modified_at`, `timestamp`, `event_timestamp`, or columns with `_ts`, `_dt`, `_time` suffixes, or `date`, `datetime`.
3. If the user specified one, verify it exists in the column list.
4. If exactly one obvious candidate exists, suggest it.
5. If multiple candidates exist, present them and ask the user.
6. If NO obvious timestamp columns exist, suggest a custom SQL monitor instead (which does not need a timestamp field).

**NEVER** proceed without confirming the timestamp field exists in the table schema.

### Common timestamp field mistakes

- **Using a DATE column (not TIMESTAMP):** This may work, but aggregation granularity is limited. For example, `aggregate_by: "hour"` is meaningless on a DATE column because the time component is always midnight. Warn the user and default to `aggregate_by: "day"` or coarser.
- **Using a field that contains many nulls:** If the timestamp column has significant null values, rows with null timestamps are excluded from aggregation windows, producing unreliable or misleading results. Check the column's null rate from `getTable` field stats if available, and warn the user if it is high.
- **Guessing a field name that does not exist:** Always verify the column name against the `getTable` output. A typo or assumed name (e.g., `created_date` when the actual column is `created_at`) causes the monitor creation to fail silently or error.

---

## Field-Type-to-Metric Compatibility Matrix

**Before selecting a metric, check the column's data type from `getTable` results.** Passing a metric incompatible with the column type is the most common source of creation failures after timestamp issues.

| Column Type | Compatible Metrics |
|-------------|-------------------|
| **Numeric** (int, float, decimal, bigint) | `NUMERIC_MEAN`, `NUMERIC_MEDIAN`, `NUMERIC_MIN`, `NUMERIC_MAX`, `NUMERIC_STDDEV`, `SUM`, `ZERO_COUNT`, `ZERO_RATE`, `NEGATIVE_COUNT`, `NEGATIVE_RATE`, `NULL_COUNT`, `NULL_RATE`, `UNIQUE_COUNT`, `UNIQUE_RATE`, `DUPLICATE_COUNT` |
| **String / Text** (varchar, char, text) | `TEXT_MAX_LENGTH`, `TEXT_MIN_LENGTH`, `TEXT_MEAN_LENGTH`, `TEXT_INT_RATE`, `TEXT_NUMBER_RATE`, `TEXT_UUID_RATE`, `TEXT_EMAIL_ADDRESS_RATE`, `EMPTY_STRING_COUNT`, `EMPTY_STRING_RATE`, `NULL_COUNT`, `NULL_RATE`, `UNIQUE_COUNT`, `UNIQUE_RATE`, `DUPLICATE_COUNT` |
| **Boolean** | `TRUE_COUNT`, `FALSE_COUNT`, `NULL_COUNT`, `NULL_RATE` |
| **Timestamp / Date** | `FUTURE_TIMESTAMP_COUNT`, `PAST_TIMESTAMP_COUNT`, `UNIX_ZERO_TIMESTAMP_COUNT`, `NULL_COUNT`, `NULL_RATE`, `UNIQUE_COUNT`, `UNIQUE_RATE` |
| **Any type** | `NULL_COUNT`, `NULL_RATE`, `UNIQUE_COUNT`, `UNIQUE_RATE`, `DUPLICATE_COUNT` |

### Rules

- **NEVER** apply `NUMERIC_*`, `SUM`, `ZERO_*`, or `NEGATIVE_*` metrics to string, boolean, or timestamp columns.
- **NEVER** apply `TEXT_*` or `EMPTY_STRING_*` metrics to numeric, boolean, or timestamp columns.
- **NEVER** apply `TRUE_COUNT` or `FALSE_COUNT` to non-boolean columns.
- **NEVER** apply `FUTURE_TIMESTAMP_COUNT`, `PAST_TIMESTAMP_COUNT`, or `UNIX_ZERO_TIMESTAMP_COUNT` to non-timestamp columns.
- When in doubt, `NULL_COUNT`, `NULL_RATE`, `UNIQUE_COUNT`, and `UNIQUE_RATE` are safe for any column type.

---

## Alert Conditions

Each alert condition has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `metric` | string | Yes | The metric to monitor (see Metrics Reference below). |
| `operator` | string | Yes | `"AUTO"` (anomaly detection), `"GT"`, `"LT"`, `"EQ"`, `"GTE"`, `"LTE"`, `"NE"`. |
| `threshold` | number | For explicit operators | The threshold value. Required when using `GT`, `LT`, `EQ`, `GTE`, `LTE`, or `NE`. Not used with `AUTO`. |
| `fields` | array of string | Depends | Column names to apply the metric to. Required for field-level metrics. Not needed for table-level metrics. |

---

## Operator Guidance

### When to use `AUTO` (anomaly detection)

- Best when you do not know the expected range of values and want Monte Carlo's ML to learn normal patterns and alert on deviations.
- Works well for organic metrics that vary day-to-day (row counts, null rates on evolving data, numeric distributions).
- Some metrics **require** `AUTO` -- see the table below.

### When to use explicit thresholds (`GT`, `LT`, `EQ`, `GTE`, `LTE`, `NE`)

- Use when there is a known business rule or data contract (e.g., "null rate on `email` should never exceed 5%", "order amount must always be greater than 0").
- Provides deterministic alerting -- no training period needed, alerts fire immediately when the condition is met.
- Requires a `threshold` value in the alert condition.

### Operator restrictions by metric

| Metric | Allowed Operators | Notes |
|--------|-------------------|-------|
| `ROW_COUNT_CHANGE` | `AUTO` only | Anomaly detection on row count delta. |
| `TIME_SINCE_LAST_ROW_COUNT_CHANGE` | `AUTO` only | Anomaly detection on staleness duration. |
| `RELATIVE_ROW_COUNT` | `AUTO` only | Anomaly detection on segment distribution. Requires `segment_fields`. |
| All other metrics | `AUTO`, `GT`, `LT`, `EQ`, `GTE`, `LTE`, `NE` | Any operator is valid. |

---

## Metrics Reference

### Table-level metrics (no `fields` needed)

| Metric | Operator | Description |
|--------|----------|-------------|
| `ROW_COUNT_CHANGE` | Must use `AUTO` | Alert on anomalous changes in total row count. |
| `TIME_SINCE_LAST_ROW_COUNT_CHANGE` | Must use `AUTO` | Alert when the table has not been updated for an unusual duration. |

### Field-level metrics (must specify `fields`)

| Metric | Column Types | Description |
|--------|-------------|-------------|
| `NULL_COUNT` | Any | Count of null values. |
| `NULL_RATE` | Any | Rate of null values (0.0 to 1.0). |
| `UNIQUE_COUNT` | Any | Count of distinct values. |
| `UNIQUE_RATE` | Any | Rate of distinct values (0.0 to 1.0). |
| `DUPLICATE_COUNT` | Any | Count of duplicate (non-unique) values. |
| `EMPTY_STRING_COUNT` | String/Text | Count of empty string values. |
| `EMPTY_STRING_RATE` | String/Text | Rate of empty string values. |
| `NUMERIC_MEAN` | Numeric | Mean of numeric field. |
| `NUMERIC_MEDIAN` | Numeric | Median of numeric field. |
| `NUMERIC_MIN` | Numeric | Minimum value of numeric field. |
| `NUMERIC_MAX` | Numeric | Maximum value of numeric field. |
| `NUMERIC_STDDEV` | Numeric | Standard deviation of numeric field. |
| `SUM` | Numeric | Sum of numeric field. |
| `ZERO_COUNT` | Numeric | Count of zero values. |
| `ZERO_RATE` | Numeric | Rate of zero values. |
| `NEGATIVE_COUNT` | Numeric | Count of negative values. |
| `NEGATIVE_RATE` | Numeric | Rate of negative values. |
| `TRUE_COUNT` | Boolean | Count of true values. |
| `FALSE_COUNT` | Boolean | Count of false values. |
| `TEXT_MAX_LENGTH` | String/Text | Maximum string length. |
| `TEXT_MIN_LENGTH` | String/Text | Minimum string length. |
| `TEXT_MEAN_LENGTH` | String/Text | Mean string length. |
| `TEXT_INT_RATE` | String/Text | Rate of values parseable as integers. |
| `TEXT_NUMBER_RATE` | String/Text | Rate of values parseable as numbers. |
| `TEXT_UUID_RATE` | String/Text | Rate of values matching UUID format. |
| `TEXT_EMAIL_ADDRESS_RATE` | String/Text | Rate of values matching email format. |
| `FUTURE_TIMESTAMP_COUNT` | Timestamp/Date | Count of timestamps in the future. |
| `PAST_TIMESTAMP_COUNT` | Timestamp/Date | Count of timestamps unreasonably far in the past. |
| `UNIX_ZERO_TIMESTAMP_COUNT` | Timestamp/Date | Count of timestamps equal to Unix epoch zero (1970-01-01). |

### Segmentation metric

| Metric | Operator | Description |
|--------|----------|-------------|
| `RELATIVE_ROW_COUNT` | Must use `AUTO` | Alert on anomalous changes in distribution across segments. MUST use `segment_fields`. |

---

## Examples

### Row count anomaly detection

```json
{
  "name": "orders_row_count",
  "description": "Detect anomalous changes in daily order volume",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "aggregate_time_field": "created_at",
  "aggregate_by": "day",
  "alert_conditions": [
    {
      "metric": "ROW_COUNT_CHANGE",
      "operator": "AUTO"
    }
  ]
}
```

### Null monitoring on specific fields

```json
{
  "name": "orders_null_check",
  "description": "Alert when email or user_id nulls exceed 50 per day",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "aggregate_time_field": "created_at",
  "aggregate_by": "day",
  "alert_conditions": [
    {
      "metric": "NULL_COUNT",
      "operator": "GT",
      "threshold": 50,
      "fields": ["email", "user_id"]
    }
  ]
}
```

### Segmented monitoring

```json
{
  "name": "orders_by_country_distribution",
  "description": "Detect anomalous shifts in order distribution across countries",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "aggregate_time_field": "created_at",
  "aggregate_by": "day",
  "segment_fields": ["country"],
  "alert_conditions": [
    {
      "metric": "RELATIVE_ROW_COUNT",
      "operator": "AUTO"
    }
  ]
}
```

### Numeric range monitoring with filter

```json
{
  "name": "completed_orders_amount_check",
  "description": "Detect anomalous max order amounts for completed orders",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++analytics:core.orders",
  "aggregate_time_field": "created_at",
  "aggregate_by": "day",
  "where_condition": "status = 'completed'",
  "alert_conditions": [
    {
      "metric": "NUMERIC_MAX",
      "operator": "AUTO",
      "fields": ["amount"]
    }
  ]
}
```

### Multiple alert conditions in one monitor

```json
{
  "name": "payments_quality_check",
  "description": "Monitor payment amount stats and null rate on transaction_id",
  "table": "MCON++a1b2c3d4-e5f6-7890-abcd-ef1234567890++1++1++warehouse:billing.payments",
  "aggregate_time_field": "processed_at",
  "aggregate_by": "day",
  "domain_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "alert_conditions": [
    {
      "metric": "NUMERIC_MEAN",
      "operator": "AUTO",
      "fields": ["amount"]
    },
    {
      "metric": "NULL_RATE",
      "operator": "GT",
      "threshold": 0.01,
      "fields": ["transaction_id"]
    }
  ]
}
```
