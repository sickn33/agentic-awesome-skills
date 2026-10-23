# Data Exploration Patterns

Use this reference when a database MCP server is available (Snowflake, BigQuery, Redshift, Databricks) for direct SQL investigation. These patterns are modeled after Monte Carlo's internal data exploration agent.

**Important:** Always use fully qualified table names (`database.schema.table`). The session may not have a default database or schema.

## Dialect awareness

Adjust SQL syntax based on the warehouse type. Common differences:

| Pattern | Snowflake | BigQuery | Redshift |
|---------|-----------|----------|----------|
| Date subtraction | `DATEADD('day', -7, CURRENT_TIMESTAMP())` | `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)` | `DATEADD(day, -7, GETDATE())` |
| Timestamp truncation | `DATE_TRUNC('hour', ts)` | `TIMESTAMP_TRUNC(ts, HOUR)` | `DATE_TRUNC('hour', ts)` |
| String concatenation | `col1 || col2` | `CONCAT(col1, col2)` | `col1 || col2` |
| Approximate count | `APPROX_COUNT_DISTINCT(col)` | `APPROX_COUNT_DISTINCT(col)` | `SELECT COUNT(DISTINCT col)` |

Identify the warehouse and dialect before running SQL; do not probe production with guessed syntax.

## Investigation queries

### Sample recent rows

```sql
SELECT * FROM database.schema.table
ORDER BY timestamp_col DESC
LIMIT 20
```

Gives a quick feel for what the data looks like right now.

### Row count over time

```sql
SELECT DATE_TRUNC('hour', timestamp_col) AS period,
       COUNT(*) AS row_count
FROM database.schema.table
WHERE timestamp_col >= DATEADD('day', -7, CURRENT_TIMESTAMP())
GROUP BY 1 ORDER BY 1
```

Reveals when volume changed — look for sudden spikes or drops.

### Null rate analysis

```sql
SELECT DATE_TRUNC('day', timestamp_col) AS day,
       COUNT(*) AS total_rows,
       COUNT(suspect_column) AS non_null,
       ROUND(1.0 - COUNT(suspect_column)::FLOAT / NULLIF(COUNT(*), 0), 4) AS null_rate
FROM database.schema.table
WHERE timestamp_col >= DATEADD('day', -14, CURRENT_TIMESTAMP())
GROUP BY 1 ORDER BY 1
```

Shows whether null rate changed at a specific point in time.

### Value distribution

```sql
SELECT suspect_column, COUNT(*) AS cnt
FROM database.schema.table
WHERE timestamp_col >= DATEADD('day', -1, CURRENT_TIMESTAMP())
GROUP BY 1 ORDER BY 2 DESC
LIMIT 30
```

Reveals if unexpected values appeared or common values disappeared.

### Before vs after comparison

```sql
-- "Before" window (known good period)
SELECT 'before' AS period,
       COUNT(*) AS rows,
       COUNT(DISTINCT key_col) AS unique_keys,
       AVG(metric_col) AS avg_metric,
       COUNT(suspect_col) AS non_null_count
FROM database.schema.table
WHERE timestamp_col BETWEEN 'good_start' AND 'good_end'

UNION ALL

-- "After" window (when issue started)
SELECT 'after' AS period,
       COUNT(*) AS rows,
       COUNT(DISTINCT key_col) AS unique_keys,
       AVG(metric_col) AS avg_metric,
       COUNT(suspect_col) AS non_null_count
FROM database.schema.table
WHERE timestamp_col BETWEEN 'bad_start' AND 'bad_end'
```

Compares key metrics between a known-good period and the anomaly period.

### Upstream correlation

When field lineage points to an upstream source, check what upstream values correlate with the anomaly:

```sql
SELECT upstream.category_field,
       COUNT(*) AS affected_rows,
       AVG(downstream.anomalous_field) AS avg_value,
       SUM(CASE WHEN downstream.anomalous_field IS NULL THEN 1 ELSE 0 END) AS null_count
FROM database.schema.downstream_table downstream
JOIN database.schema.upstream_table upstream
  ON downstream.foreign_key = upstream.primary_key
WHERE downstream.timestamp_col >= 'anomaly_start_time'
GROUP BY 1 ORDER BY 2 DESC
LIMIT 20
```

This reveals which upstream segments are driving the anomaly.

### Duplicate detection

```sql
SELECT key_col1, key_col2, COUNT(*) AS cnt
FROM database.schema.table
WHERE timestamp_col >= DATEADD('day', -1, CURRENT_TIMESTAMP())
GROUP BY 1, 2
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 20
```

Checks if deduplication logic broke, introducing duplicates.

### Missing expected rows

```sql
-- Find keys present yesterday but missing today
SELECT yesterday.key_col
FROM (SELECT DISTINCT key_col FROM database.schema.table
      WHERE DATE(timestamp_col) = CURRENT_DATE - 1) yesterday
LEFT JOIN (SELECT DISTINCT key_col FROM database.schema.table
           WHERE DATE(timestamp_col) = CURRENT_DATE) today
  ON yesterday.key_col = today.key_col
WHERE today.key_col IS NULL
LIMIT 20
```

## Rules for data exploration

- **Bound query cost and disclosure** — LIMIT bounds returned rows, not bytes scanned or sort/aggregation cost. Use partition filters, query estimates, timeouts and read-only credentials. Select necessary columns instead of sensitive SELECT * samples.
- **Use time filters** — always scope to the relevant time window around the incident.
- **Start broad, then narrow** — sample rows first, then targeted aggregations.
- **Compare before vs after** — the most powerful investigation pattern.
- **Follow the data upstream** — if this table looks wrong, check the source it reads from.

<!-- Modified locally: evidence, SQL safety or paid-run corrections. -->
