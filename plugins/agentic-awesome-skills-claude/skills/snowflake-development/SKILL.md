---
name: snowflake-development
description: "Comprehensive Snowflake development assistant covering SQL best practices, data pipeline design (Dynamic Tables, Streams, Tasks, Snowpipe), Cortex AI functions, Cortex Agents, Snowpark Python, dbt integration, performance tuning, and security hardening."
category: data-engineering
risk: safe
source: community
date_added: "2026-03-24"
---

# Snowflake Development

You are a Snowflake development expert. Apply these rules when writing SQL, building data pipelines, using Cortex AI, or working with Snowpark Python on Snowflake.

## When to Use
- When the user asks for help with Snowflake SQL, data pipelines, Cortex AI, or Snowpark Python.
- When you need Snowflake-specific guidance for dbt, performance tuning, or security hardening.

## SQL Best Practices

### Naming and Style

- Use `snake_case` for all identifiers. Avoid double-quoted identifiers — they create case-sensitive names requiring constant quoting.
- Use CTEs (`WITH` clauses) over nested subqueries.
- Use `CREATE OR REPLACE` for idempotent DDL.
- Use explicit column lists — never `SELECT *` in production (Snowflake's columnar storage scans only referenced columns).

### Stored Procedures — Colon Prefix Rule

In SQL stored procedures (BEGIN...END blocks), variables and parameters **must** use the colon `:` prefix inside SQL statements. Without it, Snowflake raises "invalid identifier" errors.

BAD:
```sql
CREATE PROCEDURE my_proc(p_id INT) RETURNS STRING LANGUAGE SQL AS
BEGIN
    LET result STRING;
    SELECT name INTO result FROM users WHERE id = p_id;
    RETURN result;
END;
```

GOOD:
```sql
CREATE PROCEDURE my_proc(p_id INT) RETURNS STRING LANGUAGE SQL AS
BEGIN
    LET result STRING;
    SELECT name INTO :result FROM users WHERE id = :p_id;
    RETURN result;
END;
```

### Semi-Structured Data

- VARIANT, OBJECT, ARRAY for JSON/Avro/Parquet/ORC.
- Access nested fields: `src:customer.name::STRING`. Always cast: `src:price::NUMBER(10,2)`.
- VARIANT null vs SQL NULL: JSON `null` is stored as `"null"`. Use `STRIP_NULL_VALUE = TRUE` on load.
- Flatten arrays: `SELECT f.value:name::STRING FROM my_table, LATERAL FLATTEN(input => src:items) f;`

### MERGE for Upserts

```sql
MERGE INTO target t USING source s ON t.id = s.id
WHEN MATCHED THEN UPDATE SET t.name = s.name, t.updated_at = CURRENT_TIMESTAMP()
WHEN NOT MATCHED THEN INSERT (id, name, updated_at) VALUES (s.id, s.name, CURRENT_TIMESTAMP());
```

## Data Pipelines

### Choosing Your Approach

| Approach | When to Use |
|----------|-------------|
| Dynamic Tables | Declarative transformations. **Default choice.** Define the query, Snowflake handles refresh. |
| Streams + Tasks | Imperative CDC. Use for procedural logic, stored procedure calls. |
| Snowpipe | Continuous file loading from S3/GCS/Azure. |

### Dynamic Tables

```sql
CREATE OR REPLACE DYNAMIC TABLE cleaned_events
    TARGET_LAG = '5 minutes'
    WAREHOUSE = transform_wh
    AS
    SELECT event_id, event_type, user_id, event_timestamp
    FROM raw_events
    WHERE event_type IS NOT NULL;
```

Key rules:
- Set `TARGET_LAG` progressively: tighter at top, looser at bottom.
- Incremental DTs **cannot** depend on Full refresh DTs.
- `SELECT *` breaks on schema changes — use explicit column lists.
- Change tracking must stay enabled on base tables.
- Views cannot sit between two Dynamic Tables.

### Streams and Tasks

```sql
CREATE OR REPLACE STREAM raw_stream ON TABLE raw_events;

CREATE OR REPLACE TASK process_events
    WAREHOUSE = transform_wh
    SCHEDULE = 'USING CRON 0 */1 * * * America/Los_Angeles'
    WHEN SYSTEM$STREAM_HAS_DATA('raw_stream')
    AS INSERT INTO cleaned_events SELECT ... FROM raw_stream;

-- Tasks start SUSPENDED — you MUST resume them
ALTER TASK process_events RESUME;
```

## Cortex AI

### Function Reference

| Function | Purpose |
|----------|---------|
| `AI_COMPLETE` | LLM completion (text, images, documents) |
| `AI_CLASSIFY` | Classify into categories (up to 500 labels) |
| `AI_FILTER` | Boolean filter on text/images |
| `AI_EXTRACT` | Structured extraction from text/images/documents |
| `AI_SENTIMENT` | Sentiment score (-1 to 1) |
| `AI_PARSE_DOCUMENT` | OCR or layout extraction |
| `AI_REDACT` | PII removal |

**Deprecated (do NOT use):** `COMPLETE`, `CLASSIFY_TEXT`, `EXTRACT_ANSWER`, `PARSE_DOCUMENT`, `SUMMARIZE`, `TRANSLATE`, `SENTIMENT`, `EMBED_TEXT_768`.

### TO_FILE — Common Error Source

Stage path and filename are **SEPARATE** arguments:

```sql
-- BAD: TO_FILE('@stage/file.pdf')
-- GOOD:
TO_FILE('@db.schema.mystage', 'invoice.pdf')
```

### Use AI_CLASSIFY for Classification (Not AI_COMPLETE)

```sql
SELECT AI_CLASSIFY(ticket_text,
    ['billing', 'technical', 'account']):labels[0]::VARCHAR AS category
FROM tickets;
```

### Cortex Agents

```sql
CREATE OR REPLACE AGENT my_db.my_schema.sales_agent
FROM SPECIFICATION $spec$
{
    "models": {"orchestration": "auto"},
    "instructions": {
        "orchestration": "You are SalesBot...",
        "response": "Be concise."
    },
    "tools": [{"tool_spec": {"type": "cortex_analyst_text_to_sql", "name": "Sales", "description": "Queries sales..."}}],
    "tool_resources": {"Sales": {"semantic_model_file": "@stage/model.yaml"}}
}
$spec$;
```

Agent rules:
- Use `$spec$` delimiter (not `$$`).
- `models` must be an object, not an array.
- `tool_resources` is a separate top-level object, not nested inside tools.
- Do NOT include empty/null values in edit specs — clears existing values.
- Tool descriptions are the #1 quality factor.
- Never modify production agents directly — clone first.

## Snowpark Python

```python
from snowflake.snowpark import Session
import os

session = Session.builder.configs({
    "account": os.environ["SNOWFLAKE_ACCOUNT"],
    "user": os.environ["SNOWFLAKE_USER"],
    "password": os.environ["SNOWFLAKE_PASSWORD"],
    "role": "my_role", "warehouse": "my_wh",
    "database": "my_db", "schema": "my_schema"
}).create()
```

- Never hardcode credentials.
- DataFrames are lazy — executed on `collect()`/`show()`.
- Do NOT use `collect()` on large DataFrames — process server-side.
- Use **vectorized UDFs** (10-100x faster) for batch/ML workloads instead of scalar UDFs.

## dbt on Snowflake

Dynamic table materialization (streaming/near-real-time marts):
```sql
{{ config(materialized='dynamic_table', snowflake_warehouse='transforming', target_lag='1 hour') }}
```

Incremental materialization (large fact tables):
```sql
{{ config(materialized='incremental', unique_key='event_id') }}
```

Snowflake-specific configs (combine with any materialization):
```sql
{{ config(transient=true, copy_grants=true, query_tag='team_daily') }}
```

- Do NOT use `{{ this }}` without `{% if is_incremental() %}` guard.
- Use `dynamic_table` materialization for streaming/near-real-time marts.

## Performance

- **Cluster keys**: Only multi-TB tables, on WHERE/JOIN/GROUP BY columns.
- **Search Optimization**: `ALTER TABLE t ADD SEARCH OPTIMIZATION ON EQUALITY(col);`
- **Warehouse sizing**: Start X-Small, scale up. `AUTO_SUSPEND = 60`, `AUTO_RESUME = TRUE`.
- **Separate warehouses** per workload.
- Estimate AI costs first: `SELECT SUM(AI_COUNT_TOKENS('claude-4-sonnet', text)) FROM table;`

## Security

- Follow least-privilege RBAC. Use database roles for object-level grants.
- Audit ACCOUNTADMIN regularly: `SHOW GRANTS OF ROLE ACCOUNTADMIN;`
- Use network policies for IP allowlisting.
- Use masking policies for PII columns and row access policies for multi-tenant isolation.

## Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| "Object does not exist" | Wrong context or missing grants | Fully qualify names, check grants |
| "Invalid identifier" in proc | Missing colon prefix | Use `:variable_name` |
| "Numeric value not recognized" | VARIANT not cast | `src:field::NUMBER(10,2)` |
| Task not running | Forgot to resume | `ALTER TASK ... RESUME` |
| DT refresh failing | Schema change or tracking disabled | Use explicit columns, check change tracking |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
