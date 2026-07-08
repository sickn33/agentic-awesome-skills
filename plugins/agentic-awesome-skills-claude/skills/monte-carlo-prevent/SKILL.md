---
name: monte-carlo-prevent
description: "Surfaces Monte Carlo data observability context (table health, alerts, lineage, blast radius) before SQL/dbt edits."
category: data
risk: safe
source: community
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: "2026-04-08"
author: monte-carlo-data
tags: [data-observability, dbt, schema, monte-carlo, lineage]
tools: [claude, cursor, codex]
---

# Monte Carlo Prevent Skill

This skill brings Monte Carlo's data observability context directly into your editor. When you're modifying a dbt model or SQL pipeline, use it to surface table health, lineage, active alerts, and to generate monitors-as-code without leaving Claude Code.

Reference files live next to this skill file. **Use the Read tool** (not MCP resources) to access them:

- Full workflow step-by-step instructions: `references/workflows.md` (relative to this file)
- MCP parameter details: `references/parameters.md` (relative to this file)
- Troubleshooting: `references/TROUBLESHOOTING.md` (relative to this file)

## When to activate this skill

**Do not wait to be asked.** Run the appropriate workflow automatically whenever the user:

- References or opens a `.sql` file or dbt model (files in `models/`) → run Workflow 1
- Mentions a table name, dataset, or dbt model name in passing → run Workflow 1

- Describes a planned change to a model (new column, join update, filter change, refactor) → **STOP — run Workflow 4 before writing any code**
-
- Adds a new column, metric, or output expression to an existing
  model → run Workflow 4 first, then ALWAYS offer Workflow 2
  regardless of risk tier — do not skip the monitor offer
- Asks about data quality, freshness, row counts, or anomalies → run Workflow 1
- Wants to triage or respond to a data quality alert → run Workflow 3

Present the results as context the engineer needs before proceeding — not as a response to a question.

## When NOT to activate this skill

Do not invoke Monte Carlo tools for:

- Seed files (files in seeds/ directory)
- Analysis files (files in analyses/ directory)
- One-off or ad-hoc SQL scripts not part of a dbt project
- Configuration files (dbt_project.yml, profiles.yml, packages.yml)
- Test files unless the user is specifically asking about data quality

If uncertain whether a file is a dbt model, check for {{ ref() }} or {{ source() }}
Jinja references — if absent, do not activate.

### Macros and snapshots — gate edits, skip auto-context

Macro files (`macros/`) and snapshot files (`snapshots/`) are **not** models, so
do not auto-fetch Monte Carlo context (Workflow 1) when they are opened. However,
macros are inlined into every model that calls them at compile time — a one-line
macro change can silently alter dozens of models. Snapshots control historical
tracking and are similarly sensitive.

**The pre-edit hook gates these files.** If the hook fires for a macro or snapshot,
identify which models are affected and run the change impact assessment (Workflow 4)
for those models before proceeding with the edit.

---

## REQUIRED: Change impact assessment before any SQL edit

**Before editing or writing any SQL for a dbt model or pipeline, you MUST run Workflow 4.**

This applies whenever the user expresses intent to modify a model — including phrases like:

- "I want to add a column…"
- "Let me add / I'm adding…"
- "I'd like to change / update / rename…"
- "Can you add / modify / refactor…"
- "Let's add…" / "Add a `<column>` column"
- Any other description of a planned schema or logic change
- "Exclude / filter out / remove [records/customers/rows]…"
- "Adjust / increase / decrease [threshold/parameter/value]…"
- "Fix / bugfix / patch [issue/bug]…"
- "Revert / restore / undo [change/previous behavior]…"
- "Disable / enable [feature/logic/flag]…"
- "Clean up / remove [references/columns/code]…"
- "Implement [backend/feature] for…"
- "Create [models/dbt models] for…" (when modifying existing referenced tables)
- "Increase / decrease / change [max_tokens/threshold/date constant/numeric parameter]…"
- Any change to a hardcoded value, constant, or configuration parameter within SQL
- "Drop / remove / delete [column/field/table]"
- "Rename [column/field] to [new name]"
- "Add [column]" (short imperative form, e.g. "add a created_at column")
- Any single-verb imperative command targeting a column, table, or model
  (e.g. "drop X", "rename Y", "add Z", "remove W")

Parameter changes (threshold values, date constants, numeric limits) appear
safe but silently change model output. Treat them the same as logic changes
for impact assessment purposes.

**Do not write or edit any SQL until the change impact assessment (Workflow 4) has been presented to the user.** The assessment must come first — not after the edit, not in parallel.

---

## Pre-edit gate — check before modifying any file

**Before calling Edit, Write, or MultiEdit on any `.sql` or dbt model
file, you MUST check:**

1. Has the synthesis step been run for THIS SPECIFIC CHANGE in the
   current prompt?
2. **If YES** → proceed with the edit
3. **If NO** → stop immediately, run Workflow 4, present the full
   report with synthesis connected to this specific change.
   **If risk is High or Medium:** ask "Do you want me to proceed
   with the edit?" and wait for explicit confirmation.
   **If risk is Low:** use judgment — proceed if straightforward
   and no concerns found, otherwise ask before editing.

**Important: "Workflow 4 already ran this session" is NOT sufficient
to proceed.** Each distinct change prompt requires its own synthesis
step connecting the MC findings to that specific change.

The synthesis must reference the specific columns, filters, or logic
being changed in the current prompt — not just general table health.

Example:

- ✅ "Given 34 downstream models depend on is_paying_workspace,
  adding 'MC Internal' to the exclusion list will exclude these
  workspaces from all downstream health scores and exports.
  Confirm?"
- ❌ "Workflow 4 already ran. Making the edit now."

The only exception: if the user explicitly acknowledges the risk
and confirms they want to skip (e.g. "I know the risks, just make
the change") — proceed but note the skipped assessment.

## Available MCP tools

All tools are available via the `monte-carlo` MCP server.

| Tool                         | Purpose                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `testConnection`             | Verify auth and connectivity                                         |
| `search`                     | Find tables/assets by name                                           |
| `getTable`                   | Schema, stats, metadata for a table                                  |
| `getAssetLineage`            | Upstream/downstream dependencies (call with mcons array + direction) |
| `getAlerts`                  | Active incidents and alerts                                          |
| `getMonitors`                | Monitor configs — filter by table using mcons array                  |
| `getQueriesForTable`         | Recent query history                                                 |
| `getQueryData`               | Full SQL for a specific query                                        |
| `createValidationMonitorMac` | Generate validation monitors-as-code YAML                            |
| `createMetricMonitorMac`     | Generate metric monitors-as-code YAML                                |
| `createComparisonMonitorMac` | Generate comparison monitors-as-code YAML                            |
| `createCustomSqlMonitorMac`  | Generate custom SQL monitors-as-code YAML                            |
| `getValidationPredicates`    | List available validation rule types                                 |
| `updateAlert`                | Update alert status/severity                                         |
| `setAlertOwner`              | Assign alert ownership                                               |
| `createOrUpdateAlertComment` | Add comments to alerts                                               |
| `getAudiences`               | List notification audiences                                          |
| `getDomains`                 | List MC domains                                                      |
| `getUser`                    | Current user info                                                    |
| `getCurrentTime`             | ISO timestamp for API calls                                          |

## Core workflows

Each workflow has detailed step-by-step instructions in `references/workflows.md` (Read tool).

### 1. Table health check

**When:** User opens a dbt model or mentions a table.
**What:** Surfaces health, lineage, alerts, and risk signals. Auto-escalates to Workflow 4 if change intent is detected and risk signals are present.

### 2. Add a monitor

**When:** New column, filter, or business rule is added to a model.
**What:** Suggests and generates monitors-as-code YAML using the appropriate `create*MonitorMac` tool. Saves to `monitors/<table_name>.yml`.

### 3. Alert triage

**When:** User is investigating an active data quality incident.
**What:** Lists open alerts, checks table state, traces lineage for root cause, reviews recent queries.

### 4. Change impact assessment — REQUIRED before modifying a model

**When:** Any intent to modify a dbt model's logic, columns, joins, or filters.
**What:** Surfaces blast radius, downstream dependencies, active incidents, monitor coverage, and query exposure. Produces a risk-tiered report with synthesis connecting findings to specific code recommendations. See `references/workflows.md` for the full assessment sequence, report format, and synthesis rules.

### 5. Change validation queries

**When:** Explicit engineer request only (e.g. "validate this change", "ready to commit").
**What:** Generates 3-5 targeted SQL queries to verify the change behaved as intended. Uses Workflow 4 context — requires both impact assessment and file edit in session.

---

## Post-synthesis confirmation rules

Always end the synthesis with one clear, specific recommendation in plain English:
"Given the above, I recommend: [specific action]"

**If the risk is High or Medium:** STOP and wait for confirmation before editing
any file. You must ask the engineer and receive an explicit "yes", "go ahead",
"proceed", or similar confirmation before making code changes.
Say: "Do you want me to proceed with the edit?"
Do NOT say: "Proceeding with the edit." — that skips the engineer's decision.

**If the risk is Low:** Use your judgment based on the synthesis findings. If
the change is straightforward and the synthesis found no concerns, you may
proceed. If anything is surprising or worth flagging, ask before editing.

---

## Session markers

These markers coordinate between the skill and the plugin's hooks. Output each
on its own line when the condition is met.

### Impact check complete

After the engineer confirms (High/Medium) or after presenting the synthesis (Low),
output one marker per assessed table. **IMPORTANT: use only the table/model name, not the full MCON:**

<!-- MC_IMPACT_CHECK_COMPLETE: <table_name> -->

(Use the model filename without .sql extension — NOT "acme.analytics.orders" or "prod.public.client_hub")

How many markers to emit depends on how the assessment was triggered:

**Hook-triggered** (the pre-edit hook blocked an edit and instructed you to run
the assessment): Be strict — only emit markers for tables whose lineage **and**
monitor coverage were fetched directly via Monte Carlo tools in this session. If
the engineer describes changes to multiple tables but only one was formally
assessed, emit only one marker. The pre-edit hook will gate the other tables and
prompt for their own Workflow 4 runs.

**Voluntarily invoked** (the engineer proactively asked for an impact assessment):
Be looser — emit markers for all tables the assessment meaningfully covered, even
if some were assessed via lineage context rather than direct MC tool calls. The
engineer is already safety-conscious; don't force redundant assessments for tables
they clearly considered.

### Monitor coverage gap

When Workflow 4 finds zero custom monitors on a table's affected columns, output:

<!-- MC_MONITOR_GAP: <table_name> -->

Use only the table/model name (NOT the full MCON). This allows the plugin's hooks
to remind the engineer about monitor coverage at commit time. Only output this
marker when the gap is specifically about the columns or logic being changed —
not for general table-level monitor absence.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
