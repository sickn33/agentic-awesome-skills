# Query Change Investigation Playbook

Use this when SQL modifications are suspected of causing a data issue.

## Investigation steps

### 1. Detect query changes

Call `get_query_changes(mcons=[table_mcon], start_time=..., end_time=...)`:
- Look at the time range around when the issue started
- Compare old vs new SQL text — what changed?
- Focus on: WHERE clauses, JOINs, GROUP BY, column selections, CTEs

### 2. Correlate with the incident timeline

Call `get_change_timeline` for a unified view:
- Did the query change happen right before the anomaly?
- Was there also a volume shift at the same time?
- Were there ETL failures immediately after the query change?

### 3. Understand the impact

For each detected query change:
- **Added/removed JOINs**: Can change cardinality (row count) dramatically
- **Changed WHERE clause**: Can include/exclude different data subsets
- **Modified GROUP BY**: Can change aggregation granularity
- **New columns or removed columns**: Schema change
- **Changed UNION**: Can add or remove entire data sources

### 4. Trace to code changes

**If GitHub MCP is available:**
Search for PRs merged around the time of the query change. Look for:
- dbt model modifications (`.sql` files in `models/`)
- Stored procedure changes
- ETL script updates
- Configuration changes (e.g., different source tables)

**If no GitHub MCP:**
The `get_query_changes` output should include enough SQL diff information to understand what changed. Ask the user if they know who made the change.

### 5. Verify the fix

If the root cause is a bad query change:
- Show the user the before/after SQL
- Suggest reverting the change or fixing the query
- If DB connector is available, inspect both statements first; compare only read-only SELECTs in a bounded safe environment, never replay arbitrary historical DML/DDL

## Common patterns

- **Accidental filter removal** — WHERE clause removed, producing more rows than expected
- **JOIN type change** — INNER → LEFT JOIN introduces NULLs; LEFT → INNER drops rows
- **Dedup logic change** — DISTINCT or ROW_NUMBER window changed, altering unique row count
- **Source table swap** — query now reads from a different source table
- **Aggregation change** — GROUP BY granularity changed, producing different row counts

<!-- Modified locally: evidence, SQL safety or paid-run corrections. -->
