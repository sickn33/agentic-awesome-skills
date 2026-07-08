---
name: monte-carlo-validation-notebook
description: "Generates SQL validation notebooks for dbt PR changes with before/after comparison queries."
category: data
risk: safe
source: community
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: "2026-04-08"
author: monte-carlo-data
tags: [data-observability, validation, dbt, monte-carlo, sql-notebook]
tools: [claude, cursor, codex]
---

> **Tip:** This skill works well with Sonnet. Run `/model sonnet` before invoking for faster generation.

Generate a SQL Notebook with validation queries for dbt changes.

**Arguments:** $ARGUMENTS

## When to Use

Use this skill when the user wants to validate dbt model or snapshot changes with Monte Carlo SQL Notebook queries, either from a GitHub PR or a local dbt repository.

Parse the arguments:
- **Target** (required): first argument — a GitHub PR URL or local dbt repo path
- **MC Base URL** (optional): `--mc-base-url <URL>` — defaults to `https://getmontecarlo.com`
- **Models** (optional): `--models <model1,model2,...>` — comma-separated list of model filenames (without `.sql` extension) to generate queries for. Only these models will be included. By default, all changed models are included up to a maximum of 10.

---

# Setup

**Prerequisites:**
- **`gh`** (GitHub CLI) — required for PR mode. Must be authenticated (`gh auth status`).
- **`python3`** — required for helper scripts.
- **`pyyaml`** — install with `pip3 install pyyaml` (or `pip install pyyaml`, `uv pip install pyyaml`, etc.)

**Note:** Generated SQL uses ANSI-compatible syntax that works across Snowflake, BigQuery, Redshift, and Athena. Minor adjustments may be needed for specific warehouse quirks.

This skill includes two helper scripts in `${CLAUDE_PLUGIN_ROOT}/skills/monte-carlo-validation-notebook/scripts/`:

- **`resolve_dbt_schema.py`** - Resolves dbt model output schemas from `dbt_project.yml` routing rules and model config overrides.
- **`generate_notebook_url.py`** - Encodes notebook YAML into a base64 import URL and opens it in the browser.

# Mode Detection

Auto-detect mode from the target argument:
- If target looks like a URL (contains `://` or `github.com`) -> **PR mode**
- If target is a path (`.`, `/path/to/repo`, relative path) -> **Local mode**

---

# Context

This command generates a SQL Notebook containing validation queries for dbt changes. The notebook can be opened in the MC Bridge SQL Notebook interface for interactive validation.

The output is an import URL that opens directly in the notebook interface:
```
<MC_BASE_URL>/notebooks/import#<base64-encoded-yaml>
```

**Key Features:**
- **Database Parameters**: Two `text` parameters (`prod_db` and `dev_db`) for selecting databases
- **Schema Inference**: Automatically infers schema per model from `dbt_project.yml` and model configs
- **Single-table queries**: Basic validation queries using `{{prod_db}}.<SCHEMA>.<TABLE>`
- **Comparison queries**: Before/after queries comparing `{{prod_db}}` vs `{{dev_db}}`
- **Flexible usage**: Users can set both parameters to the same database for single-database analysis

# Notebook YAML Spec Reference

Key structure:
```yaml
version: 1
metadata:
  id: string           # kebab-case + random suffix
  name: string         # display name
  created_at: string   # ISO 8601
  updated_at: string   # ISO 8601
default_context:       # optional database/schema context
  database: string
  schema: string
cells:
  - id: string
    type: sql | markdown | parameter
    content: string    # SQL, markdown, or parameter config (JSON)
    display_type: table | bar | timeseries
```

## Parameter Cell Spec

Parameter cells allow defining variables referenced in SQL via `{{param_name}}` syntax:

```yaml
- id: param-prod-db
  type: parameter
  content:
    name: prod_db              # variable name
    config:
      type: text                   # free-form text input
      default_value: "ANALYTICS"
      placeholder: "Prod database"
  display_type: table
```

Parameter types:
- `text`: Free-form text input (used for database names)
- `schema_selector`: Two dropdowns (database -> schema), value stored as `DATABASE.SCHEMA`
- `dropdown`: Select from predefined options

# Task

Generate a SQL Notebook with validation queries based on the mode and target.

## Phase 1: Get Changed Files

The approach differs based on mode:

### If PR mode (GitHub PR):

1. Extract the PR number and repo from the target URL.
   - Example: `https://github.com/monte-carlo-data/dbt/pull/3386` -> owner=`monte-carlo-data`, repo=`dbt`, PR=`3386`

2. Fetch PR metadata using `gh`:
```bash
gh pr view <PR#> --repo <owner>/<repo> --json number,title,author,mergedAt,headRefOid
```

3. Fetch the list of changed files:
```bash
gh pr view <PR#> --repo <owner>/<repo> --json files --jq '.files[].path'
```

4. Fetch the diff:
```bash
gh pr diff <PR#> --repo <owner>/<repo>
```

5. Filter the changed files list to only `.sql` files under `models/` or `snapshots/` directories (at any depth — e.g., `models/`, `analytics/models/`, `dbt/models/`). These are the dbt models to analyze. If no model SQL files were changed, report that and stop.

6. For each changed model file, fetch the full file content at the head SHA:
```bash
gh api repos/<owner>/<repo>/contents/<file_path>?ref=<head_sha> --jq '.content' | python3 -c "import sys,base64; sys.stdout.write(base64.b64decode(sys.stdin.read()).decode())"
```

7. **Fetch dbt_project.yml** for schema resolution. Detect the dbt project root by looking at the changed file paths — find the common parent directory that contains `dbt_project.yml`. Try these paths in order until one succeeds:
```bash
gh api repos/<owner>/<repo>/contents/<dbt_root>/dbt_project.yml?ref=<head_sha> --jq '.content' | python3 -c "import sys,base64; sys.stdout.write(base64.b64decode(sys.stdin.read()).decode())"
```
Common `<dbt_root>` locations: `analytics`, `.` (repo root), `dbt`, `transform`. Try each until found.

Save `dbt_project.yml` to `/tmp/validation_notebook_working/<PR#>/dbt_project.yml`.

### If Local mode (Local Directory):

1. Change to the target directory.

2. Get current branch info:
```bash
git rev-parse --abbrev-ref HEAD
```

3. Detect base branch - try `main`, `master`, `develop` in order, or use upstream tracking branch.

4. Get the list of changed SQL files compared to base branch:
```bash
git diff --name-only <base_branch>...HEAD -- '*.sql'
```

5. Filter to only `.sql` files under `models/` or `snapshots/` directories (at any depth — e.g., `models/`, `analytics/models/`, `dbt/models/`). If no model SQL files were changed, report that and stop.

6. Get the diff for each changed file:
```bash
git diff <base_branch>...HEAD -- <file_path>
```

7. Read model files directly from the filesystem.

8. **Find dbt_project.yml**:
```bash
find . -name "dbt_project.yml" -type f | head -1
```

9. For notebook metadata in local mode, use:
   - **ID**: `local-<branch-name>-<timestamp>`
   - **Title**: `Local: <branch-name>`
   - **Author**: Output of `git config user.name`
   - **Merged**: "N/A (local)"

### Model Selection (applies to both modes)

After filtering to `.sql` files under `models/` or `snapshots/`:

1. **If `--models` was specified:** Filter the changed files list to only include models whose filename (without `.sql` extension, case-insensitive) matches one of the specified model names. If any specified model is not found in the changed files, warn the user but continue with the models that were found. If none match, report that and stop.

2. **Model cap:** If more than 10 models remain after filtering, select the first 10 (by file path order) and warn the user:
   ```
   ⚠️ <total_count> models changed — generating validation queries for the first 10 only.
   To generate for specific models, re-run with: --models <model1,model2,...>
   Skipped models: <list of skipped model filenames>
   ```

## Phase 2: Parse Changed Models

For EACH changed dbt model `.sql` file, parse and extract:

### 2a. Model Metadata

**Output table name** -- Derive from file name:
- `<any_path>/models/<subdir>/<model_name>.sql` -> table is `<MODEL_NAME>` (uppercase, taken from the filename)

**Output schema** -- Use the schema resolution script:

1. **Setup**: Save `dbt_project.yml` and model files to `/tmp/validation_notebook_working/<id>/` preserving paths:
   ```
   /tmp/validation_notebook_working/<id>/
   +-- dbt_project.yml
   +-- models/
       +-- <path>/<model>.sql
   ```

2. **Run the script** for each model:
   ```bash
   python3 ${CLAUDE_PLUGIN_ROOT}/skills/monte-carlo-validation-notebook/scripts/resolve_dbt_schema.py /tmp/validation_notebook_working/<id>/dbt_project.yml /tmp/validation_notebook_working/<id>/models/<path>/<model>.sql
   ```

3. **Error handling**: If the script fails, **STOP immediately** and report the error. Do NOT proceed with notebook generation if schema resolution fails.

4. **Output**: The script prints the resolved schema (e.g., `PROD`, `PROD_STAGE`, `PROD_LINEAGE`)

**Note**: Do NOT manually parse dbt_project.yml or model configs for schema -- always use the script. It handles model config overrides, dbt_project.yml routing rules, PROD_ prefix for custom schemas, and defaults to `PROD`.

**Config block** -- Look for `{{ config(...) }}` and extract:
- `materialized` -- 'table', 'view', 'incremental', 'ephemeral'
- `unique_key` -- the dedup key (may be a string or list)
- `cluster_by` -- clustering fields (may contain the time axis)

**Core segmentation fields** -- Scan the entire model SQL for fields likely to be business keys:
- Fields named `*_id` (e.g., `account_id`, `resource_id`, `monitor_id`) that appear in JOIN ON, GROUP BY, PARTITION BY, or `unique_key`
- Deduplicate and rank by frequency. Take the top 3.

**Time axis field** -- Detect the model's time dimension (in priority order):
1. `is_incremental()` block: field used in the WHERE comparison
2. `cluster_by` config: timestamp/date fields
3. Field name conventions: `ingest_ts`, `created_time`, `date_part`, `timestamp`, `run_start_time`, `export_ts`, `event_created_time`
4. ORDER BY DESC in QUALIFY/ROW_NUMBER

If no time axis is found, skip time-axis queries for this model.

### 2b. Diff Analysis

Parse the diff hunks for this file. Classify each changed line:

- **Changed fields** -- Lines added/modified in SELECT clauses or CTE definitions. Extract the output column name.
- **Changed filters** -- Lines added/modified in WHERE clauses.
- **Changed joins** -- Lines added/modified in JOIN ON conditions.
- **Changed unique_key** -- If `unique_key` in config was modified, note both old and new values.
- **New columns** -- Columns in "after" SELECT that don't appear in "before" (pure additions).

### 2c. Model Classification

Classify each model as **new** or **modified** based on the diff:
- If the diff for this file contains `new file mode` → classify as **new**
- Otherwise → classify as **modified**

This classification determines which query patterns are generated in Phase 3.

**Note:** For **new models**, Phase 2b diff analysis is skipped (there is no "before" to compare against). Phase 2a metadata extraction still applies.

## Phase 3: Generate Validation Queries

For each changed model, generate the applicable queries based on its classification (new vs modified).

**CRITICAL: Parameter Placeholder Syntax**

Use **double curly braces** `{{...}}` for parameter placeholders. Do NOT use `${...}` or any other syntax.

Correct: `{{prod_db}}.PROD.AGENT_RUNS`
Wrong: `${prod_db}.PROD.AGENT_RUNS`

**Table Reference Format:**
- Use `{{prod_db}}.<SCHEMA>.<TABLE_NAME>` for prod queries
- Use `{{dev_db}}.<SCHEMA>.<TABLE_NAME>` for dev queries
- `<SCHEMA>` is **hardcoded per-model** using the output from the schema resolution script

---

### Query Patterns for NEW Models

For new models, all queries target `{{dev_db}}` only. No comparison queries are generated since no prod table exists.

#### Pattern 7-new: Total Row Count
**Trigger:** Always.

```sql
SELECT COUNT(*) AS total_rows
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

#### Pattern 9: Sample Data Preview
**Trigger:** Always.

```sql
SELECT *
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
LIMIT 20
```

#### Pattern 2-new: Core Segmentation Counts
**Trigger:** Always.

```sql
SELECT
    <segmentation_field>,
    COUNT(*) AS row_count
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
GROUP BY <segmentation_field>
ORDER BY row_count DESC
LIMIT 100
```

#### Pattern 5: Uniqueness Check
**Trigger:** Always for new models (verify unique_key constraint from the start).

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT <key_fields>) AS distinct_keys,
    COUNT(*) - COUNT(DISTINCT <key_fields>) AS duplicate_count
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

```sql
SELECT <key_fields>, COUNT(*) AS n
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
GROUP BY <key_fields>
HAVING COUNT(*) > 1
ORDER BY n DESC
LIMIT 100
```

#### Pattern 6-new: NULL Rate Check (all columns)
**Trigger:** Always. Checks all output columns since everything is new.

```sql
SELECT
    COUNT(*) AS total_rows,
    SUM(CASE WHEN <col1> IS NULL THEN 1 ELSE 0 END) AS <col1>_null_count,
    ROUND(100.0 * SUM(CASE WHEN <col1> IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS <col1>_null_pct,
    SUM(CASE WHEN <col2> IS NULL THEN 1 ELSE 0 END) AS <col2>_null_count,
    ROUND(100.0 * SUM(CASE WHEN <col2> IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS <col2>_null_pct
    -- repeat for each output column
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

#### Pattern 8: Time-Axis Continuity
**Trigger:** Model is `materialized='incremental'` OR a time axis field was identified.

```sql
SELECT
    CAST(<time_axis> AS DATE) AS day,
    COUNT(*) AS row_count
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
WHERE <time_axis> >= CURRENT_TIMESTAMP - INTERVAL '14' DAY
GROUP BY day
ORDER BY day DESC
LIMIT 30
```

---

### Query Patterns for MODIFIED Models

For modified models, single-table queries use `{{prod_db}}` and comparison queries use both.

#### Pattern 7: Total Row Count
**Trigger:** Always.

```sql
SELECT COUNT(*) AS total_rows
FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
```

#### Pattern 9: Sample Data Preview
**Trigger:** Always.

```sql
SELECT *
FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
LIMIT 20
```

#### Pattern 2: Core Segmentation Counts
**Trigger:** Always.

```sql
SELECT
    <segmentation_field>,
    COUNT(*) AS row_count
FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
GROUP BY <segmentation_field>
ORDER BY row_count DESC
LIMIT 100
```

#### Pattern 1: Changed Field Distribution
**Trigger:** Changed fields found in Phase 2b. **Exclude added columns** (from "New columns" in Phase 2b) — only include fields that exist in prod.

```sql
SELECT
    <changed_field>,
    COUNT(*) AS row_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS pct
FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
GROUP BY <changed_field>
ORDER BY row_count DESC
LIMIT 100
```

#### Pattern 5: Uniqueness Check
**Trigger:** JOIN condition changed, `unique_key` changed, or model is incremental.

```sql
SELECT
    COUNT(*) AS total_rows,
    COUNT(DISTINCT <key_fields>) AS distinct_keys,
    COUNT(*) - COUNT(DISTINCT <key_fields>) AS duplicate_count
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

```sql
SELECT <key_fields>, COUNT(*) AS n
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
GROUP BY <key_fields>
HAVING COUNT(*) > 1
ORDER BY n DESC
LIMIT 100
```

#### Pattern 6: NULL Rate Check
**Trigger:** New column added, or column wrapped in COALESCE/NULLIF.

**Important:** Added columns (from "New columns" in Phase 2b) do NOT exist in prod yet. For added columns, query `{{dev_db}}` only. For modified columns (COALESCE/NULLIF changes), compare both databases.

**For added columns** (dev only):
```sql
SELECT
    COUNT(*) AS total_rows,
    SUM(CASE WHEN <column> IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(100.0 * SUM(CASE WHEN <column> IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS null_pct
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

**For modified columns** (prod vs dev):
```sql
SELECT
    'prod' AS source,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN <column> IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(100.0 * SUM(CASE WHEN <column> IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS null_pct
FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
UNION ALL
SELECT
    'dev' AS source,
    COUNT(*) AS total_rows,
    SUM(CASE WHEN <column> IS NULL THEN 1 ELSE 0 END) AS null_count,
    ROUND(100.0 * SUM(CASE WHEN <column> IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS null_pct
FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

#### Pattern 8: Time-Axis Continuity
**Trigger:** Model is `materialized='incremental'` OR a time axis field was identified.

```sql
SELECT
    CAST(<time_axis> AS DATE) AS day,
    COUNT(*) AS row_count
FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
WHERE <time_axis> >= CURRENT_TIMESTAMP - INTERVAL '14' DAY
GROUP BY day
ORDER BY day DESC
LIMIT 30
```

#### Pattern 3: Before/After Comparison
**Trigger:** Always (for changed fields + top segmentation field). **Modified models only.**

**Important:** Exclude added columns (from "New columns" in Phase 2b) from `<group_fields>`. Only use fields that exist in BOTH prod and dev. Added columns don't exist in prod and will cause query errors.

```sql
WITH prod AS (
    SELECT <group_fields>, COUNT(*) AS cnt
    FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
    GROUP BY <group_fields>
),
dev AS (
    SELECT <group_fields>, COUNT(*) AS cnt
    FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
    GROUP BY <group_fields>
)
SELECT
    COALESCE(b.<field>, d.<field>) AS <field>,
    COALESCE(b.cnt, 0) AS cnt_prod,
    COALESCE(d.cnt, 0) AS cnt_dev,
    COALESCE(d.cnt, 0) - COALESCE(b.cnt, 0) AS diff
FROM prod b
FULL OUTER JOIN dev d ON b.<field> = d.<field>
ORDER BY ABS(diff) DESC
LIMIT 100
```

#### Pattern 7b: Row Count Comparison
**Trigger:** Always. **Modified models only.**

```sql
SELECT 'prod' AS source, COUNT(*) AS row_count FROM {{prod_db}}.<SCHEMA>.<TABLE_NAME>
UNION ALL
SELECT 'dev' AS source, COUNT(*) AS row_count FROM {{dev_db}}.<SCHEMA>.<TABLE_NAME>
```

## Phase 4: Build Notebook YAML

### 4a. Metadata
```yaml
version: 1
metadata:
  id: validation-pr-<PR_NUMBER>-<random_suffix>
  name: "Validation: PR #<PR_NUMBER> - <PR_TITLE_TRUNCATED>"
  created_at: "<current_iso_timestamp>"
  updated_at: "<current_iso_timestamp>"
```

### 4b. Parameter Cells

**Only include `prod_db` if there are modified models.** If all models are new, only include `dev_db`.

```yaml
# Include ONLY if there are modified models:
- id: param-prod-db
  type: parameter
  content:
    name: prod_db
    config:
      type: text
      default_value: "ANALYTICS"
      placeholder: "Prod database (e.g., ANALYTICS)"
  display_type: table

# Always include:
- id: param-dev-db
  type: parameter
  content:
    name: dev_db
    config:
      type: text
      default_value: "PERSONAL_<USER>"
      placeholder: "Dev database (e.g., PERSONAL_JSMITH)"
  display_type: table
```

### 4c. Markdown Summary Cell
```yaml
- id: cell-summary
  type: markdown
  content: |
    # Validation Queries for <PR or Local Branch>
    ## Summary
    - **Title:** <title>
    - **Author:** <author>
    - **Source:** <PR URL or "Local branch: <branch>">
    - **Status:** <merge_timestamp or "Not yet merged" or "N/A (local)">
    ## Changes
    <brief description based on diff analysis>
    ## Changed Models
    - `<SCHEMA>.<TABLE_NAME>` (from `<file_path>`)
    ## How to Use
    1. Select your Snowflake connector above
    2. Set **dev_db** to your dev database (e.g., `PERSONAL_JSMITH`)
    3. If modified models are present, set **prod_db** to your prod database (e.g., `ANALYTICS`)
    4. Run single-table queries first, then comparison queries
  display_type: table
```

### 4d. SQL Cell Format
```yaml
- id: cell-<pattern>-<model>-<index>
  type: sql
  content: |
    /*
    ========================================
    <Pattern Name (human-readable, e.g. "Total Row Count" — do NOT include pattern numbers like "Pattern 7:")>
    ========================================
    Model: <SCHEMA>.<TABLE_NAME>
    Triggered by: <why this pattern was generated>
    What to look for: <interpretation guidance>
    ----------------------------------------
    */
    <actual_sql_query>
  display_type: table
```

### 4e. Cell Organization

Cells are ordered consistently for both model types, following this sequence:

**New models:**
1. Summary markdown cell (note that model is new)
2. Parameter cells (dev_db only — no prod_db if all models are new)
3. Total row count (Pattern 7-new)
4. Sample data preview (Pattern 9)
5. Core segmentation counts (Pattern 2-new)
6. Uniqueness check (Pattern 5), NULL rate check (Pattern 6-new), Time-axis continuity (Pattern 8)

**Modified models:**
1. Summary markdown cell
2. Parameter cells (prod_db, dev_db)
3. Total row count (Pattern 7)
4. Sample data preview (Pattern 9)
5. Core segmentation counts (Pattern 2)
6. Changed field distribution (Pattern 1)
7. Uniqueness check (Pattern 5), NULL rate check (Pattern 6), Time-axis continuity (Pattern 8)
8. Before/after comparisons (Pattern 3), Row count comparison (Pattern 7b)

## Phase 5: Generate Import URL

1. Write notebook YAML to `/tmp/validation_notebook_working/<id>/notebook.yaml`
2. Run the URL generation script:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/monte-carlo-validation-notebook/scripts/generate_notebook_url.py /tmp/validation_notebook_working/<id>/notebook.yaml --mc-base-url <MC_BASE_URL>
```
3. The script validates both YAML syntax and notebook schema (required fields on metadata and cells). If validation fails, read the error messages carefully, fix the YAML to match the spec in Phase 4, and re-run.

## Phase 6: Output

Present:
```markdown
# Validation Notebook Generated
## Summary
- **Source:** PR #<number> - <title> OR Local: <branch>
- **Author:** <author>
- **Changed Models:** <count> models (of <total_count> changed)
- **Generated Queries:** <count> queries

> ⚠️ If models were capped: "Only the first 10 of <total_count> changed models were included. Re-run with `--models` to select specific models."

## Notebook Opened
The notebook has been opened directly in your browser.
Select your Snowflake connector in the notebook interface to begin running queries.
*Make sure MC Bridge is running. Let me know if you want tips on how to install this locally*
```

## Important Guidelines

1. **Do NOT execute queries** -- only generate the notebook
2. **Keep SQL readable** -- proper formatting and meaningful aliases
3. **Include LIMIT 100** on queries that could return many rows
4. **Use double curly braces** -- `{{prod_db}}` NOT `${prod_db}`
5. **Use correct table format** -- `{{prod_db}}.<SCHEMA>.<TABLE>` and `{{dev_db}}.<SCHEMA>.<TABLE>`
6. **Always use the schema resolution script** -- do NOT manually parse dbt_project.yml
7. **Schema is NOT a parameter** -- only `prod_db` and `dev_db` are parameters
8. **Skip ephemeral models** -- they have no physical table
9. **Truncate notebook name** -- keep under 50 chars
10. **Generate unique cell IDs** -- use pattern like `cell-p3-model-1`
11. **YAML multiline content** -- use `|` block scalar for SQL with comments
12. **ASCII-only YAML** -- the script sanitizes and validates before encoding

## Query Pattern Reference

| Pattern | Name | Trigger | Model Type | Database | Order |
|---------|------|---------|------------|----------|-------|
| 7 / 7-new | Total Row Count | Always | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 1 |
| 9 | Sample Data Preview | Always | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 2 |
| 2 / 2-new | Core Segmentation Counts | Always | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 3 |
| 1 | Changed Field Distribution | Column modified in diff (not added) | Modified only | `{{prod_db}}` | 4 |
| 5 | Uniqueness Check | JOIN/unique_key changed (modified) / Always (new) | Both | `{{dev_db}}` | 5 |
| 6 / 6-new | NULL Rate Check | New column or COALESCE (modified) / Always (new) | Both | Added col: `{{dev_db}}` only; COALESCE: Both (modified) / `{{dev_db}}` (new) | 5 |
| 8 | Time-Axis Continuity | Incremental or time field | Both | `{{prod_db}}` (modified) / `{{dev_db}}` (new) | 5 |
| 3 | Before/After Comparison | Changed fields (not added) | Modified only | Both | 6 |
| 7b | Row Count Comparison | Always | Modified only | Both | 6 |

## MC Bridge Setup Help

If the user asks how to install or set up MC Bridge, fetch the README from the mc-bridge repo and show the relevant quick start / setup instructions:

```bash
gh api repos/monte-carlo-data/mc-bridge/readme --jq '.content' | base64 --decode
```

Focus on: how to install, configure connections, and run MC Bridge. Don't dump the entire README — extract just the setup-relevant sections.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
