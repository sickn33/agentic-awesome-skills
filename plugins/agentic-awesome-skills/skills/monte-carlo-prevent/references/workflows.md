# Workflow Details

Detailed step-by-step instructions for each Monte Carlo Prevent workflow.
These are referenced from the main SKILL.md — consult the relevant section when
executing a workflow.

---

## Workflow 1: Table health check — when opening or editing a model

When the user opens a dbt model or mentions a table, run this sequence automatically:

```
1. search(query="<table_name>") → get the full MCON/table identifier
2. getTable(mcon="<mcon>") → schema, freshness, row count, importance score, monitoring status
3. getAssetLineage(mcon="<mcon>") → upstream sources, downstream dependents
4. getAlerts(created_after="<7 days ago>", created_before="<now>", table_mcons=["<mcon>"]) → active alerts
```

Summarize for the user:
- **Health**: last updated, row count, is it monitored?
- **Lineage**: N upstream sources, M downstream consumers (name the important ones)
- **Alerts**: any active/unacknowledged incidents — lead with these if present
- **Risk signals** (lite): flag if importance score is high, if key assets are downstream, or if alerts are already firing — these indicate the table warrants extra care before modification

Example summary to offer unprompted when a dbt model file is opened:
> "The table `orders_status` was last updated 2 hours ago with 142K rows. It has 3 downstream dependents including `order_status_snapshot` (key asset). There are 2 active freshness alerts — this table warrants extra care before modification. Want me to run a full change impact assessment?"

**Auto-escalation rule — after completing steps 1–4 above:**

First, check whether the user has expressed intent to modify the model
in this session (e.g. mentioned a change, asked to add/edit/fix something).

IF change intent has been expressed AND any of the following are true:
  - One or more active/unacknowledged alerts exist on the table
  - One or more downstream dependents are key assets
  - The table's importance score is above 0.8
→ Ask the user before running Workflow 4:
  "This is a high-importance table with [N active alerts / key asset
  dependents / importance score 0.989]. Do you want me to run a full
  change impact assessment before proceeding? (yes/no)"
→ Wait for confirmation. If yes → run Workflow 4.
  If no → proceed but note: "Skipping impact assessment at your request."

IF risk signals exist but NO change intent has been expressed:
→ Surface the health summary and note the risk signals only:
  "This is a high-importance table with key asset dependents. When
  you're ready to make changes, say 'run impact assessment' or just
  describe your change and I'll run it automatically."
→ Do NOT run Workflow 4. Do NOT ask about running Workflow 4.

### New model creation variant

When the user is creating a new .sql dbt model file (not editing an existing one):

1. Parse all {{ ref('...') }} and {{ source('...', '...') }} calls from the SQL
2. For each referenced table, run the standard Workflow 1 health check:
   search() → getTable() → getAlerts()
3. Surface a consolidated upstream health summary:
   "Your new model references N upstream tables. Here's their current health:"
   - List each with: last updated, active alerts (if any), key asset flag
4. Flag any upstream table with active alerts as a risk:
   "⚠️ <table_name> has <N> active alerts — your new model will inherit this data quality issue"

Skip getAssetLineage for new models — they have no downstream dependents yet.
Skip Workflow 4 for new models — there is no existing blast radius to assess.

---

## Workflow 2: Add a monitor — when new transformation logic is added

> **For detailed monitor creation guidance** — including parameter validation, field-type compatibility checks, and common error prevention — see the `monitor-creation` skill (`skills/monitor-creation/SKILL.md`). The workflow below is a quick-path for the common "just added a column, offer a monitor" case within a prevent session.

When the user adds a new column, filter, or business rule, suggest adding a monitor. First, choose the monitor type based on what the new logic does:

```
- New column with a row-level condition (null check, range, regex)
  → createValidationMonitorMac

- New aggregate metric (row count, sum, average, percentile over time)
  → createMetricMonitorMac

- Logic that should match another table or a prior time period
  → createComparisonMonitorMac

- Complex business rule that doesn't fit the above
  → createCustomSqlMonitorMac
```

Then run the appropriate sequence:

```
1. Read the SQL file being edited to extract the specific transformation logic:
   - Confirm the file path from conversation context (do not guess or assume)
   - If no file path is clear, ask the engineer: "Which file contains the new logic?"
   - Extract the specific new column definition, filter condition, or business rule
   - Use this logic directly when constructing the monitor condition in step 3

2. For validation monitors: getValidationPredicates() → show what validation types are available
   For all types: determine the right tool from the selection guide above
3. Call the selected create*MonitorMac tool:
   - createValidationMonitorMac(mcon, description, condition_sql) → returns YAML
   - createMetricMonitorMac(mcon, description, metric, operator) → returns YAML
   - createComparisonMonitorMac(source_table, target_table, metric) → returns YAML
   - createCustomSqlMonitorMac(mcon, description, sql) → returns YAML
   ⚠ If createValidationMonitorMac fails (e.g. column doesn't exist yet in the live table),
     fall back to createCustomSqlMonitorMac with an explicit SQL query instead.
3. Save the YAML to <project>/monitors/<table_name>.yml
4. Run: montecarlo monitors apply --dry-run (to preview)
5. Run: montecarlo monitors apply --auto-yes (to apply)
```

**Important — YAML format for `monitors apply`:**
All `create*MonitorMac` tools return YAML that is not directly compatible with `montecarlo monitors apply`. Reformat the output into a standalone monitor file with `montecarlo:` as the root key. The second-level key matches the monitor type: `custom_sql:`, `validation:`, `metric:`, or `comparison:`. The example below shows `custom_sql:` — substitute the appropriate key for other monitor types.

```yaml
# monitors/<table_name>.yml  ← monitor definitions only, NOT montecarlo.yml
montecarlo:
  custom_sql:
    - warehouse: <warehouse_name>
      name: <monitor_name>
      description: <description>
      schedule:
        interval_minutes: 720
        start_time: '<ISO timestamp>'
      sql: <your validation SQL>
      alert_conditions:
        - operator: GT
          threshold_value: 0.0
```

The `montecarlo.yml` project config is a **separate file** in the project root containing only:
```yaml
# montecarlo.yml  ← project config only, NOT monitor definitions
version: 1
namespace: <your-namespace>
default_resource: <warehouse_name>
```

Do NOT put `version:`, `namespace:`, or `default_resource:` inside monitor definition files.

---

## Workflow 3: Alert triage — when investigating an active incident

```
1. getAlerts(
     created_after="<start>",
     created_before="<end>",
     order_by="-createdTime",
     statuses=["NOT_ACKNOWLEDGED"]
   ) → list open alerts
2. getTable(mcon="<affected_table_mcon>") → check current table state
3. getAssetLineage(mcon="<mcon>") → identify upstream cause or downstream blast radius
4. getQueriesForTable(mcon="<mcon>") → recent queries that might explain the anomaly
```

To respond to an alert:
- `updateAlert(alert_id="<id>", status="ACKNOWLEDGED")` — acknowledge it
- `setAlertOwner(alert_id="<id>", owner="<email>")` — assign ownership
- `createOrUpdateAlertComment(alert_id="<id>", comment="<text>")` — add context

---

## Workflow 4: Change impact assessment — REQUIRED before modifying a model

**Trigger:** Any expressed intent to add, rename, drop, or change a column, join, filter, or model logic. Run this immediately — before writing any code — even if the user hasn't asked for it.

### Bugfixes and reverts require impact assessment too

When the user says "fix", "revert", "restore", or "undo", run this workflow
before writing any code — even if the change seems small or safe.

A revert that undoes a column addition or changes join logic has the same
blast radius as the original change. Downstream models may have already
adapted to the "incorrect" behavior, meaning the fix itself could break them.

Pay special attention to:
- Whether the revert removes a column other models now depend on
- Whether downstream models reference the specific logic being reverted
- Whether active alerts may be related to the change being reverted

When the user is about to rename or drop a column, change a join condition, alter a filter, or refactor a model's logic, run this sequence to surface the blast radius before any changes are committed:

```
1. search(query="<table_name>") + getTable(mcon="<mcon>")
   → importance score, query volume (reads/writes per day), key asset flag

2. getAssetLineage(mcon="<mcon>")
   → full list of downstream dependents; for each, note whether it is a key asset

3. getTable(mcon="<downstream_mcon>") for each key downstream asset
   → importance score, last updated, monitoring status

4. getAlerts(
     created_after="<7 days ago>",
     created_before="<now>",
     table_mcons=["<mcon>", "<downstream_mcon_1>", ...],
     statuses=["NOT_ACKNOWLEDGED"]
   )
   → any active incidents already affecting this table or its dependents

5. getQueriesForTable(mcon="<mcon>")
   → recent queries; scan for references to the specific columns being changed
   → use getQueryData(query_id="<id>") to fetch full SQL for ambiguous cases

5b. Supplementary local search for downstream dbt refs:
   - Search the local models/ directory for ref('<table_name>') (single-hop only)
   - Compare results against getAssetLineage output from step 2
   - If any local models reference this table but are NOT in MC's lineage results:
     "⚠️ Found N local model(s) referencing this table not yet in MC's lineage: [list]"
   - If no models/ directory exists in the current project, skip silently
   - MC lineage remains the authoritative source — local grep is supplementary only

6. getMonitors(mcon="<mcon>")
   → which monitors are watching columns or metrics affected by the change
```

### Risk tier assessment

| Tier | Conditions |
|---|---|
| 🔴 High | Key asset downstream, OR active alerts already firing, OR >50 reads/day |
| 🟡 Medium | Non-key assets downstream, OR monitors on affected columns, OR moderate query volume |
| 🟢 Low | No downstream dependents, no active alerts, low query volume |

### Multi-model changes

When the user is changing multiple models in the same session or same domain
(e.g., 3 timeseries models, 4 criticality_score models):

- Run a single consolidated impact assessment across all changed tables
- Deduplicate downstream dependents — if two changed tables share a downstream
  dependent, count it once and note that it's affected by multiple upstream changes
- Present a unified blast radius report rather than N separate reports
- Escalate risk tier if the combined blast radius is larger than any individual table

Example consolidated report header:
"## Change Impact: 3 models in timeseries domain
Combined downstream blast radius: 28 tables (deduplicated)
Highest risk table: timeseries_detector_routing (22 downstream refs)"

### Report format

```
## Change Impact: <table_name>

Risk: 🔴 High / 🟡 Medium / 🟢 Low

Downstream blast radius:
  - <N> tables depend on this model
  - Key assets affected: <list or "none">

Active incidents:
  - <alert title, status> or "none"

Column exposure (for columns being changed):
  - Found in <N> recent queries (e.g. <query snippet>)

Monitor coverage:
  - <monitor name> watches <metric> — will be affected by this change
  - If zero custom monitors exist → append:
    "⚠️ No custom monitors on this table. After making your changes,
    I'll suggest a monitor for the new logic — or say 'add a monitor'
    to do it now."

Recommendation:
  - <specific callout, e.g. "Notify owners of downstream_table before deploying",
     "Coordinate with the freshness alert owner", "Add a monitor for the new column">
```

If risk is 🔴 High:
1. Call `getAudiences()` to retrieve configured notification audiences
2. Include in the recommendation: "Notify: <audience names / channels>"
3. Proactively suggest:
   - Notifying owners of downstream key assets (`setAlertOwner` / `createOrUpdateAlertComment` on active alerts)
   - Adding a monitor for the new logic before deploying (Workflow 2)
   - Running `montecarlo monitors apply --dry-run` after changes to verify nothing breaks

### Synthesis: translate findings into code recommendations

After presenting the impact report, use the findings to shape your code suggestion.
Do not present MC data and then write code as if the data wasn't there.
Explicitly connect each key finding to a specific recommendation:

- Active alerts firing on the table:
  → Recommend deferring or minimally scoping the change until alerts are resolved
  → Explain: "There are N active alerts on this table — making this change now
     risks compounding an existing data quality issue"

- Key assets downstream:
  → Recommend defensive coding patterns: null guards, backward-compatible changes,
     additive-only schema changes where possible
  → Explain: "X downstream key assets depend on this table — I'd recommend
     writing this as [specific pattern] to avoid breaking [specific dependent]"

- Monitors on affected columns:
  → Call out that the change will affect monitor coverage
  → Recommend updating monitors alongside the code change (offer Workflow 2)
  → Explain: "The existing monitor on [column] will need to be updated to
     account for this change"

- New output column or logic being added:
  → Always offer Workflow 2 after the impact assessment, regardless
    of existing monitor coverage
  → Do not skip this step even if risk tier is 🟢 Low
  → Say explicitly: "This adds new output logic — would you like me
    to generate a monitor for it? I can add a null check, range
    validation, or custom SQL rule."
  → Wait for the user's response before proceeding with the edit

- High read volume (>50 reads/day):
  → Recommend extra caution around column renames or removals
  → Suggest backward-compatible transition (add new column, deprecate old one)
  → Explain: "This table has [N] reads/day — a column rename without a
     transition period would break downstream consumers immediately"

- Column renames, even inside CTEs:
  → Never assume a CTE-internal rename is safe. Always check:
    1. Does this column appear in the final SELECT, directly or
       via a CTE that feeds into the final SELECT?
    2. If yes — treat as a breaking change. Recommend a
       backward-compatible transition: add the correctly-named
       column, keep the old one temporarily, remove in a
       follow-up PR.
    3. If truly internal and never surfaces in output — confirm
       this explicitly before proceeding.
  → Explain: "Even though this column is defined in a CTE, if it
    surfaces in the final SELECT it is a public output column —
    renaming it breaks any downstream model selecting it by name."

---

## Workflow 5: Change validation queries — after a code change is made

**Trigger:** Explicit engineer intent only. Activate when the engineer says something like:
- "generate validation queries", "validate this change", "I'm done with this change"
- "let me test this", "write queries to check this", "ready to commit"

**Required session context — do not activate without both:**
1. Workflow 4 (change impact assessment) has run for this table in this session
2. A file edit was made to a `.sql` or dbt model file for that same table

**Do NOT activate automatically after file edits. Do NOT proactively offer after Workflow 4 or file edits. The engineer asks when they are ready.**

---

### What this workflow does

Using the context already in the session — the Workflow 4 findings, the file diff, and the `getTable` result — generate 3–5 targeted SQL validation queries that directly test whether this specific change behaved as intended.

These are not generic templates. Use the semantic meaning of the change from Workflow 4 context: which columns changed and why, what business logic was affected, what downstream models depend on this table, and what monitors exist. A null check on a new `days_since_contract_start` column should verify it is never negative and never null for rows with a `contract_start_date` — not just check for nulls generically.

---

### Step 1 — Identify the change type from session context

From Workflow 4 findings and the file diff, classify the primary change. A change may span multiple types — classify the dominant one and note secondaries:

- **New column** — a new output column was added to the SELECT
- **Filter change** — a WHERE clause, IN-list, or CASE condition was modified
- **Join change** — a JOIN condition or join target was modified
- **Column rename or drop** — an existing output column was renamed or removed
- **Parameter change** — a hardcoded threshold, constant, or numeric value was changed
- **New model** — the file was newly created, no production baseline exists

---

### Step 2 — Determine warehouse context from Workflow 4

From the `getTable` result already in session context, extract:
- **Fully qualified table name** — e.g. `analytics.prod_internal_bi.client_hub_master`
- **Warehouse type** — Snowflake, BigQuery, Redshift, Databricks
- **Schema** — already resolved, do not re-derive

Use the correct SQL dialect for the warehouse type. Key differences:

| Warehouse | Date diff | Current timestamp | Notes |
|---|---|---|---|
| Snowflake | `DATEDIFF('day', a, b)` | `CURRENT_TIMESTAMP()` | `QUALIFY` supported |
| BigQuery | `DATE_DIFF(a, b, DAY)` | `CURRENT_TIMESTAMP()` | Use subquery instead of `QUALIFY` |
| Redshift | `DATEDIFF('day', a, b)` | `GETDATE()` | |
| Databricks | `DATEDIFF(a, b)` | `CURRENT_TIMESTAMP()` | |

For the dev database, use the placeholder `<YOUR_DEV_DATABASE>` with a comment instructing the engineer to replace it. Do not guess the dev database name.

---

### Step 3 — Apply database targeting rules (mandatory)

These rules are not negotiable — violating them produces queries that will fail at runtime:

- **Columns or logic that only exist post-change** → dev database only. Never query production for a column that doesn't exist there yet.
- **Comparison queries (before vs after)** → both production and dev databases
- **New model (no production baseline)** → dev database only for all queries
- **Row count comparison** → always include, always query both databases

---

### Step 4 — Generate targeted validation queries

Always include a row count comparison regardless of change type — it's the baseline signal that something unexpected happened.

Then generate change-specific queries based on what needs to be validated for this change type. Use the exact conditions, column names, and business logic from the diff and Workflow 4 findings — not generic placeholders. The goal for each change type:

**New column:** Verify the column is non-null where it should be non-null (based on its business meaning), that its value range is plausible, and that its distribution makes sense given the underlying data. Query dev only.

**Filter change:** Verify that only the intended rows were reclassified — generate a before/after count showing how many rows were added or removed by the new condition using the exact filter logic from the diff, and a sample of the rows that changed classification. The sample helps the engineer confirm the right records moved.

**Join change:** Verify that the join didn't introduce duplicates — a uniqueness check on the join key is essential. Also verify row count didn't change unexpectedly. Query dev for uniqueness, both databases for row count.

**Column rename or drop:** Verify the old column name is absent and the new column (if renamed) is present in the dev schema. Also verify that downstream models referencing the old column name are identified — use the local ref() grep results from Workflow 4 if available.

**Parameter or threshold change:** Verify the distribution of values affected by the change — how many rows moved above or below the new threshold, and whether the count matches the engineer's expectation. Query both databases to compare before and after.

**New model:** No production comparison possible. Verify row count is non-zero and plausible, sample rows look correct, and key columns are non-null. Query dev only.

---

### Step 5 — Add change-specific context to each query

For every query, include a SQL comment block that explains:
- What the query is checking
- What a healthy result looks like **for this specific change**
- What would indicate a problem

Derive this context from Workflow 4 findings. Use the business meaning of the change, not generic descriptions. For example, for adding `days_since_contract_start`:

```sql
/*
Null rate check: days_since_contract_start (new column, dev only)
What to look for:
  - Null count should equal workspaces with no contract_start_date
  - All rows with contract_start_date should have a non-null, non-negative value
  - Values above 3650 (~10 years) are suspicious and may indicate a data issue
*/
```

This is what differentiates these queries from generic validation — the comment tells the engineer exactly what pass and fail look like for their specific change.

---

### Step 6 — Save to local file

Save all generated queries to:
```
validation/<table_name>_<YYYYMMDD_HHMM>.sql
```

Include a header at the top of the file:
```sql
/*
Validation queries for: <fully_qualified_table>
Change type: <change type from Step 1>
Generated: <timestamp>
Workflow 4 risk tier: <tier from this session>

Instructions:
1. Replace <YOUR_DEV_DATABASE> with your personal or branch database
2. Run the row count comparison first
3. Run change-specific queries to validate intended behavior
4. Unexpected results should be investigated before merging
*/
```

Then tell the engineer:
> "Validation queries saved to `validation/<table_name>_<timestamp>.sql`.
> Replace `<YOUR_DEV_DATABASE>` with your dev database and run in Snowflake
> or your preferred SQL client to verify the change behaved as expected."

---

### What this workflow does NOT do
- Does not execute queries (Phase 2)
- Does not require warehouse MCP connection
- Does not generate Monte Carlo notebook YAML
- Does not trigger automatically — only on explicit engineer request
- Does not activate if Workflow 4 has not run for this table in this session
