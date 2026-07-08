# Custom SQL Monitor Reference

Detailed reference for building `createCustomSqlMonitorMac` tool calls.

## When to Use

Use a custom SQL monitor when the user wants to:

- Run a specific SQL query and alert on its result
- Implement cross-table logic (joins, subqueries, CTEs)
- Apply business-specific aggregations or calculations that don't map to a single metric
- Monitor a condition that spans multiple columns or tables
- Use a SQL query they already have in mind

---

## The Universal Fallback

Custom SQL is the fallback monitor type. Reach for it whenever another monitor type cannot express what the user needs:

- **Validation monitor won't work** because the column doesn't exist yet, or the logic requires joins across tables.
- **Metric monitor can't express the business logic** -- for example, a ratio between two columns, a conditional aggregation, or a calculation that spans multiple tables.
- **Cross-table joins are needed** -- metric and validation monitors operate on a single table. If the check requires data from two or more tables, custom SQL is the only option.
- **The user already has a SQL query** -- don't force it into another monitor type. Wrap it in a custom SQL monitor.

If you find yourself contorting another monitor type to fit the user's intent, stop and use custom SQL instead.

---

## Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Unique identifier for the monitor. Use a descriptive slug (e.g., `orphan_orders_check`). |
| `description` | string | Human-readable description of what the monitor checks. |
| `warehouse` | string | Warehouse name or UUID where the SQL query will be executed. |
| `sql` | string | SQL query that returns a **single numeric value** (one row, one column). |
| `alert_conditions` | array | List of threshold conditions (see Alert Conditions below). |

## Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `domain_id` | string (uuid) | Domain UUID (use `getDomains` to list). Only one domain can be assigned per monitor. |

---

## Alert Conditions

Each alert condition compares the query result against a threshold.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `operator` | string | Yes | `"GT"`, `"LT"`, `"EQ"`, `"GTE"`, `"LTE"`, `"NE"` |
| `thresholdValue` | number | Yes | Numeric threshold to compare the query result against. |

### No AUTO Support

Custom SQL monitors do **NOT** support `AUTO` (anomaly detection). You must specify an explicit operator and threshold for every alert condition. This is a common mistake -- if the user asks for anomaly detection, steer them toward a metric monitor instead, which does support `AUTO`.

If the user is unsure what threshold to set, help them reason about it: "What value would indicate a problem? If the query returns X, should that fire an alert?"

---

## SQL Query Requirements

The SQL query MUST return exactly **one row with one numeric column**. This is non-negotiable -- the monitor compares that single value against the alert conditions.

### Rules

- Use aggregate functions: `COUNT(*)`, `SUM()`, `AVG()`, `MAX()`, `MIN()`, or similar.
- Can reference any table, view, or materialized view accessible in the warehouse.
- Can use joins, subqueries, CTEs, window functions -- any valid SQL.
- Do **NOT** include trailing semicolons.
- Do **NOT** include comments (`--` or `/* */`) -- some warehouses strip them inconsistently.

### SQL Validation Tips

These are the most common mistakes that cause custom SQL monitors to fail or produce misleading results:

1. **Handle NULLs with COALESCE.** If your aggregate could return NULL (e.g., `SUM(amount)` on an empty result set), wrap it: `SELECT COALESCE(SUM(amount), 0) FROM ...`. A NULL result cannot be compared against a threshold and will not trigger alerts.

2. **Ensure exactly one row, one column.** If your query could return zero rows (e.g., a filtered `SELECT` with no `GROUP BY`), wrap it in an outer aggregate: `SELECT COUNT(*) FROM (SELECT ...) sub`. If it returns multiple columns, select only the one you need.

3. **Test the query mentally.** Before finalizing, ask: "If this query returns 5, will the alert condition fire correctly?" Walk through the logic with a concrete number.

4. **For time-windowed checks, use appropriate date functions.** SQL syntax for date arithmetic varies by warehouse (see Warehouse-Specific SQL Notes below). Always scope time windows to avoid scanning the entire table history.

5. **Avoid non-deterministic results.** Queries using `LIMIT` without `ORDER BY`, or `RANDOM()`, produce unpredictable results that make alerting unreliable.

---

## Warehouse-Specific SQL Notes

SQL syntax for date arithmetic and functions varies across warehouses. When writing time-windowed queries, use the correct syntax for the user's warehouse:

| Operation | Snowflake | BigQuery | Redshift |
|-----------|-----------|----------|----------|
| Subtract 1 day from now | `DATEADD(day, -1, CURRENT_TIMESTAMP())` | `DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)` | `DATEADD(day, -1, GETDATE())` |
| Subtract 1 hour from now | `DATEADD(hour, -1, CURRENT_TIMESTAMP())` | `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)` | `DATEADD(hour, -1, GETDATE())` |
| Current timestamp | `CURRENT_TIMESTAMP()` | `CURRENT_TIMESTAMP()` | `GETDATE()` |
| Date truncation | `DATE_TRUNC('day', col)` | `DATE_TRUNC(col, DAY)` | `DATE_TRUNC('day', col)` |

When unsure which warehouse the user is on, ask. Getting the syntax wrong causes the monitor to fail on every scheduled run.

---

## Examples

### Orphan records (GT 0)

Alert when orders reference customers that don't exist.

```json
{
  "name": "orphan_orders_check",
  "description": "Detect orders referencing non-existent customers",
  "warehouse": "production_snowflake",
  "sql": "SELECT COUNT(*) FROM analytics.core.orders o LEFT JOIN analytics.core.customers c ON o.customer_id = c.id WHERE c.id IS NULL",
  "alert_conditions": [
    {
      "operator": "GT",
      "thresholdValue": 0
    }
  ]
}
```

### Daily revenue floor (LT threshold)

Alert when total revenue for the past 24 hours drops below a minimum.

```json
{
  "name": "daily_revenue_floor",
  "description": "Alert when daily revenue falls below $10,000",
  "warehouse": "production_snowflake",
  "sql": "SELECT COALESCE(SUM(amount), 0) FROM analytics.billing.transactions WHERE created_at >= DATEADD(day, -1, CURRENT_TIMESTAMP())",
  "alert_conditions": [
    {
      "operator": "LT",
      "thresholdValue": 10000
    }
  ]
}
```

### Duplicate rate exceeds threshold

Alert when the duplicate rate on a key field exceeds 1%.

```json
{
  "name": "order_id_duplicate_rate",
  "description": "Alert when order_id duplicate rate exceeds 1%",
  "warehouse": "production_snowflake",
  "sql": "SELECT COALESCE(1.0 - (COUNT(DISTINCT order_id) * 1.0 / NULLIF(COUNT(*), 0)), 0) FROM analytics.core.orders WHERE created_at >= DATEADD(day, -1, CURRENT_TIMESTAMP())",
  "alert_conditions": [
    {
      "operator": "GT",
      "thresholdValue": 0.01
    }
  ]
}
```

### Multiple threshold conditions (range check)

Alert when a value falls outside an acceptable range. Multiple conditions act as independent checks -- each one that evaluates to true fires its own alert.

```json
{
  "name": "avg_order_amount_range",
  "description": "Alert when average order amount is outside the $20-$500 range",
  "warehouse": "production_snowflake",
  "sql": "SELECT COALESCE(AVG(amount), 0) FROM analytics.core.orders WHERE created_at >= DATEADD(day, -1, CURRENT_TIMESTAMP()) AND status = 'completed'",
  "alert_conditions": [
    {
      "operator": "LT",
      "thresholdValue": 20
    },
    {
      "operator": "GT",
      "thresholdValue": 500
    }
  ]
}
```

### Cross-table freshness check (BigQuery syntax)

Alert when the latest row in a downstream table is more than 2 hours behind the source.

```json
{
  "name": "pipeline_lag_check",
  "description": "Alert when downstream table lags source by more than 2 hours",
  "warehouse": "production_bigquery",
  "sql": "SELECT COALESCE(TIMESTAMP_DIFF(s.max_ts, t.max_ts, MINUTE), 9999) FROM (SELECT MAX(event_timestamp) AS max_ts FROM project.raw.events) s CROSS JOIN (SELECT MAX(processed_at) AS max_ts FROM project.analytics.events_processed) t",
  "alert_conditions": [
    {
      "operator": "GT",
      "thresholdValue": 120
    }
  ]
}
```
