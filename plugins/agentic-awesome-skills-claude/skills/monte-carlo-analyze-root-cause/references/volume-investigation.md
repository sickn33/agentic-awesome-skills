# Volume Investigation Playbook

Use this when a table's row count changed unexpectedly (spike or drop).

## Investigation steps

### 1. Quantify the change

Call `get_table_size_history` with the table's `full_table_id` and `resource_id`:
- What was the row count before and after?
- When exactly did the change occur?
- Is this a sudden jump or a gradual trend?
- Compare to the normal pattern (seasonality field may help)

### 2. Check for query changes

Call `get_query_changes` — did the ETL query change around the time of the volume shift?
- New or removed WHERE clauses can dramatically change row counts
- Changed JOINs (INNER → LEFT, or vice versa) affect output volume
- Modified deduplication logic

Call `get_change_timeline` for a unified view of all changes correlated with the volume shift.

### 3. Check upstream volume

Call `get_asset_lineage(mcons=[table_mcon], direction="UPSTREAM")` to find source tables.
For each upstream table:
- Call `get_table_size_history` — did the source data volume also change?
- Proportional upstream volume change suggests an upstream contribution; verify coverage, timing and transformation behavior before concluding

### 4. Check for failed/futile queries

Call `get_query_rca` with the table MCONs and a time range:
- **Failed queries** with new error types may indicate broken inserts
- **Futile queries** (ran but produced nothing) may explain missing rows
- **QDR (query didn't run)** may explain why expected data wasn't loaded

### 5. Profile the data (if DB connector available)

If a database MCP server is connected:
- Compare row counts by date partition: `SELECT date_col, COUNT(*) FROM table GROUP BY 1 ORDER BY 1`
- Check for duplicate rows that appeared: `SELECT *, COUNT(*) FROM table GROUP BY ALL HAVING COUNT(*) > 1`
- Check if specific segments grew/shrank: group by key dimensions
- See `references/data-exploration.md` for more SQL patterns

## Common root causes

- **Source data volume change** — upstream system sent more/fewer records than usual
- **Filter change** — ETL WHERE clause was modified, including/excluding different rows
- **Dedup logic change** — deduplication rules changed, producing more or fewer unique rows
- **Late-arriving data** — backfill or reprocessing loaded historical data
- **Partition swap** — a full partition was replaced with different data
- **Schema migration** — table was truncated and reloaded as part of a migration

<!-- Modified locally: evidence, SQL safety or paid-run corrections. -->
