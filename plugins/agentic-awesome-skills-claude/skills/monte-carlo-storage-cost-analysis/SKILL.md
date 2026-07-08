---
name: monte-carlo-storage-cost-analysis
description: Analyze a warehouse for stale, unused, or redundant tables via the analyze_storage_costs MCP tool. Classifies waste patterns and table categories, computes safety tiers, and handles category drill-downs and lineage follow-ups.
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/storage-cost-analysis
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Monte Carlo Storage Cost Analysis Skill

This skill analyzes a data warehouse for stale tables that can be removed to reduce storage costs. It delegates classification, safety scoring, and formatting to the `analyze_storage_costs` MCP tool, then presents the pre-formatted result verbatim and handles follow-up questions (category drill-downs, lineage checks).

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

Reference file (use the Read tool to access it):

- Output contract and category keywords: `references/output-structure.md`

## When to activate this skill

Activate when the user:

- Asks about storage costs, waste, or cleanup opportunities
- Wants to find unused, unread, or stale tables
- Asks "which tables can I drop?" or "what's costing us money?"
- Mentions storage optimization, cost reduction, or warehouse cleanup
- Wants to identify zombie tables, dead-end pipelines, or temporary/archive tables

## When NOT to activate this skill

Do not activate when the user is:

- Just querying data or exploring table contents
- Creating or modifying monitors (use the monitoring-advisor skill)
- Investigating data quality incidents (use the prevent skill)
- Looking at pipeline performance or query cost (use the performance-diagnosis skill)

## Prerequisites

The following MCP tools must be available (connect to Monte Carlo's MCP server):

- `analyze_storage_costs` -- runs the full analysis pipeline and returns pre-formatted output
- `get_asset_lineage` -- used only for follow-up lineage checks

The `analyze_storage_costs` tool supports **Snowflake, BigQuery, Redshift, and Databricks** warehouses only. Other warehouse types are out of scope.

## Workflow

**Important:** These steps are internal instructions for you. Do NOT expose step numbers, step names, or the procedural structure to the user. Just act naturally.

### Step 1: Identify the warehouse

You need a warehouse to proceed.

- **If the user specified a warehouse** (by name or UUID), use it.
- **If not:** call `analyze_storage_costs` with no `warehouse_id`. The tool will either auto-pick when only one supported warehouse exists, or return a list of supported warehouses — let the user choose one, then call the tool again with the chosen `warehouse_id`.

### Step 2: Run the analysis

Call `analyze_storage_costs` with:

- `warehouse_id`: the warehouse UUID

The tool fetches candidates, classifies them into waste patterns (Unread, Write-only, Dead-end, Static waste, Zombie, Other stale) and table categories (Temporary, Archive/Snapshot, Production, Other), computes safety tiers, and returns a formatted analysis.

- If the tool returns an error, report it to the user and stop.
- If no candidates are found, tell the user and stop.

### Step 3: Present the initial summary

The tool output contains two regions:

1. A `<!-- PRESENT_AS_IS -->` block with a condensed summary, a Top-N table, and a drill-down prompt.
2. A `<!-- CATEGORY_DETAILS -->` block with per-category tables wrapped in `<!-- CATEGORY:<key> -->` markers. Do NOT present these yet.

Present ONLY the `<!-- PRESENT_AS_IS -->` block — copy it verbatim, preserving every column, row, and value. Add a brief intro sentence if needed, then paste the block unchanged. The user will see the summary and top tables, then choose a category to drill into.

**CRITICAL — do NOT call any other tool after `analyze_storage_costs` succeeds.** No `search`, no `get_table`, no troubleshooting agents, no cross-checks. The analysis result IS the final answer; your only remaining job is to present the `<!-- PRESENT_AS_IS -->` block verbatim.

**CRITICAL — preserve markdown-linked MCONs verbatim.** The pre-formatted tables already contain properly linked MCONs (e.g., `` [`db:schema.table`](https://getmontecarlo.com/assets/MCON++...) ``). Never output bare MCON strings as plain text.

### Step 4: Handle follow-up requests

**Category drill-downs.** When the user asks about a specific category ("show me temporary tables", "what about production?", "tell me more about archive"):

1. Find the matching `<!-- CATEGORY:<key> -->` section in the `analyze_storage_costs` result already in the conversation. **Do NOT re-invoke `analyze_storage_costs`** — the data is already there.
2. Present that section's content verbatim — every column, row, and value.
3. After presenting, remind the user of remaining categories they haven't explored yet.

Category keywords (see `references/output-structure.md` for the full list):

- "temporary", "staging", "tmp", "stg" → `CATEGORY:temporary`
- "archive", "snapshot", "backup", "old" → `CATEGORY:archive_snapshot`
- "uncategorized", "other", "unknown" → `CATEGORY:other`
- "production", "prod", "critical", "important" → `CATEGORY:production`

If the user says "show me everything" or "all categories", present all category sections in order: temporary → archive → uncategorized → production.

**Lineage checks.** When the user asks what consumes a specific table ("check lineage for X", "is it safe to remove Y?", "what depends on this table?"):

1. Call `get_asset_lineage` with `mcons: [<table mcon>]` and `direction: "DOWNSTREAM"`.
2. If `has_relationships: false` → the table's consumers are likely BI dashboards or tools (not other tables). Mention this — it may still be safe to remove, but the user should verify with dashboard owners.
3. If downstream tables exist AND are also stale → recommend removing both.
4. If downstream tables are active → flag as risky, do NOT recommend removal.

**Note:** The `N consumers` flag in the Usage & Risk column counts ALL consumers, including BI dashboards (Looker, Tableau, Power BI) and other non-table assets. The lineage tool only returns table-to-table edges, so lineage results may show fewer consumers than the count. When that happens, explain the gap to the user.

## Reading the Usage & Risk column

Each row's final `Usage & Risk` cell combines read-side activity with risk flags. Format:

```
{activity}                          # no flags fire
{activity}; {flag1, flag2, ...}     # one or more flags fire
```

**Activity values** (always present):

- `No reads` -- no recorded reads
- `180d · 0 reads` -- last read N days ago, zero total reads
- `2d · 580 reads / 14 users` -- recent reads, total reads and distinct reading users

A low `days since read` is only meaningful when paired with the read count — a single backup job or security scanner can make a cold table look "1d". Always weigh staleness against reads + users.

**Risk flags** (appended after `; ` in this fixed order when any fire):

- `high criticality` / `medium criticality` -- pre-computed criticality
- `N consumers` -- has active consumers (tables, views, or BI dashboards); verify before removing
- `high importance score` -- `is_important` is a thresholded `importance_score ≥ 0.6` computed upstream in Databricks, **not** a user-applied tag
- `has monitors` -- actively monitored by Monte Carlo

## Table categories

Tables are automatically classified for prioritized review:

- **Temporary/Staging** -- Short-lived ETL/test tables (safest to drop)
- **Archive/Snapshot** -- Historical copies, date-suffixed tables (verify retention policies)
- **Production** -- Monitored, critical, or lineage-important tables (highest risk)
- **Other** -- No strong signal either way (needs manual review)

## Scope limitations

- **Storage** costs only -- not compute, query optimization, or billing
- One warehouse per analysis
- **Snowflake, BigQuery, Redshift, and Databricks** only
- **Recommendations only** -- never execute DROP TABLE or destructive actions

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
