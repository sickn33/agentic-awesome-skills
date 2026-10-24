# Schema Investigation Playbook

Use this when columns were added, removed, or had their types changed.

## Investigation steps

### 1. Identify what changed

Call `get_table(mcon=table_mcon, include_fields=true)` to see the current schema.
Compare against the alert details — what columns were added/removed/modified?

### 2. Check for query changes

Call `get_query_changes` — schema changes may come from ETL, DDL, source evolution, or connector inference:
- New SELECT columns → column additions
- Removed SELECT columns → column removals
- CAST or type conversion changes → type modifications
- CREATE TABLE AS SELECT with different schema

### 3. Check downstream impact

Call `get_asset_lineage(mcons=[table_mcon], direction="DOWNSTREAM")`:
- Which downstream tables depend on the changed columns?
- Call `get_field_lineage` to trace exactly which downstream fields are affected

### 4. Check ETL pipeline

Schema changes often happen during deployments:
- Call `get_etl_issues` with `platform="dbt"` — dbt model changes are the most common source
- Call `get_etl_issues` with `platform="airflow"` — pipeline deployment may have changed the schema
- Check `get_change_timeline` for a correlated view

### 5. Check for code changes

If GitHub MCP is available, search for recent PRs that modified:
- dbt models (`.sql` files in `models/`)
- SQL migration scripts
- Schema definition files

If no GitHub MCP, `get_query_changes` will show the SQL modifications.

## Common root causes

- **dbt model change** — column added/removed in a model definition
- **Migration script** — ALTER TABLE or CREATE TABLE AS SELECT with new schema
- **Source schema change** — upstream system changed its schema, propagating downstream
- **Type promotion** — implicit type coercion changed (e.g., INT → FLOAT)
- **Column rename** — a column was renamed, breaking downstream references

<!-- Modified locally: evidence, SQL safety or paid-run corrections. -->
