---
name: monte-carlo-asset-health
description: Check the health of a data table/asset using Monte Carlo. Activates on "how is table X", "check health of X", "is X healthy", "status of X", "check on X table", or any health/status question about a data asset.
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/asset-health
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Monte Carlo Asset Health Skill

This skill checks the health of a data asset using Monte Carlo's observability
platform. It produces a structured health report covering freshness, alerts,
monitoring coverage, importance, and upstream dependency health.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

## REQUIRED: Read reference files before executing

**You MUST read both reference files using the Read tool before making any MCP
tool calls.** These files are the source of truth for tool calls, parameters,
and response interpretation. This file only defines when to activate and how to
format the output.

1. `references/workflows.md` (relative to this file) — exact tool calls, phases, and execution order
2. `references/parameters.md` (relative to this file) — parameter conventions and field details

**Do NOT make any MCP tool calls until you have read both files.**

## When to activate this skill

Activate when the user:

- Asks about health: "how is table X doing?", "check health of X", "is X healthy?"
- Asks about status: "what's the status of X?", "status of orders table"
- Asks to check on a table: "check on X table", "check on X"
- Asks about reliability, freshness, or quality of a specific asset
- References a table in context of incident triage or change planning

## When NOT to activate this skill

- **Profiling or exploring table data** (row counts, column stats, distributions) → use `explore-table`
- **Creating or suggesting monitors** → use `monitoring-advisor`
- **Active incident triage** (investigating root cause of a firing alert) → use prevent skill Workflow 3

## Health report format

**CRITICAL: Only report data returned by the tools defined in `references/workflows.md`.
Do NOT call additional tools, do NOT infer or fabricate metrics. Each row below
specifies exactly which tool provides its value.**

**All sections (Active Alerts, Monitors, Upstream Issues, Recommendations) must
always appear with their heading.** Never omit a section — if there is no data,
show the empty-state text defined below.

**Never use emoji shortcodes** (like `:warning:` or `:arrow_up:`). Use Unicode
emoji characters directly (like ⚠️) or plain text. Shortcodes render as raw text
in the terminal.

**Always display URLs as bare URLs**, never as markdown links (e.g., `[text](https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/asset-health/url)`).

**`{MC_WEBAPP_URL}` appears throughout this template.** Every occurrence must be
replaced with the actual value returned by calling `get_mc_webapp_url()`. Never
hardcode or guess this URL — it varies by environment.

Present results in this structure:

```
## Health Check: <table_name>

**Tags:** `tag1:value1`, `tag2:value2` (or "None" if no tags)
**Link:** {MC_WEBAPP_URL}/assets/{mcon}
**Warehouse:** snowflake-prod (Snowflake)
**Status: 🟢 Healthy / 🟡 Degraded / 🔴 Unhealthy** | **Importance:** 0.85 (key asset ⭐️)
**Avg Reads/Day:** ~538 | **Avg Writes/Day:** ~12

| Metric        | Value                          | Signal |
|---------------|--------------------------------|--------|
| Last Activity | Apr 6, 2025                    | 🟢 Recent    |
| Alerts        | 2 active                       | 🔴 Has alerts |
| Monitoring    | 3 active monitors              | 🟢 Monitored  |
| Upstream      | 1/3 sources unhealthy          | 🔴 Issues     |

### Active Alerts

| Date  | Type           | Priority | Status           | Link                                                    |
|-------|----------------|----------|------------------|---------------------------------------------------------|
| Apr 8 | Metric anomaly | P3       | Not acknowledged | {MC_WEBAPP_URL}/alerts/{alert_uuid} |
| Apr 7 | Freshness      | P2       | Acknowledged     | {MC_WEBAPP_URL}/alerts/{alert_uuid} |

If there are more than 5 active alerts, display only 5. Do NOT put the overflow
message inside the table as a row. Instead, put it as plain text on the line
immediately after the table:

There are N more alerts not shown for brevity

If there are zero active alerts, show:
No active alerts in the last 7 days.

### Monitors

| Type        | Name                                    | Incidents (7d) | Status              |
|-------------|-----------------------------------------|----------------|---------------------|
| TABLE       | Orders freshness and schema             | 3              | Running hourly      |
| METRIC      | Revenue row count                       | 0              | Never executed      |
| BULK_METRIC | Warehouse volume check                  | 21             | ⚠️ 1 table has errors |

If there are zero monitors, show:
No monitors configured for this table.

### Upstream Issues
- raw_orders — FRESHNESS alert: not updated in 8h
- raw_payments — healthy
- dim_customers — healthy

> Want me to check further upstream for **raw_orders**?

If there are no upstream dependencies, show:
No upstream dependencies found.

### Diagnosis

1-2 sentences summarizing what is causing the table to be unhealthy, or
confirming it is healthy. This should naturally lead into the recommendations.

Example (unhealthy):
Upstream table raw_orders has not been updated in 8 hours, which is likely
causing staleness in this table. There are also 2 unacknowledged alerts.

Example (healthy):
Table is healthy — no active alerts, monitored, and all upstream sources
are in good shape.

### Recommendations
- Investigate upstream raw_orders freshness — likely root cause of this table's staleness
- Acknowledge or investigate the 2 active alerts

If there are no recommendations, show:
No recommendations — table looks healthy.

```

### Metric definitions — exact data sources

Each metric row MUST use only the specified data source. Do not add, infer, or
embellish values beyond what the tool returns.

| Metric | Data source | What to show | Signal |
|--------|------------|-------------|--------|
| **Last Activity** | `get_table` → `last_activity` | Date of last activity (e.g., "Apr 6, 2025") | 🟢 Recent (within 7 days) / 🟡 Stale (older than 7 days) |
| **Alerts** | `get_alerts` → count | "N active" or "No active alerts" | 🔴 Has alerts / 🟢 No alerts |
| **Monitoring** | `get_monitors` → count where `is_paused` is false | "N active monitors" or "0 active monitors (M paused)". Include relevant details from monitor fields (incident counts, error counts, types). | 🟢 Monitored (≥1 active) / 🔴 Unmonitored (0 active) |
| **Upstream** | `get_asset_lineage` (upstream) + Phase 3 checks | "N/M sources unhealthy" or "All N sources healthy" | 🔴 Issues (any unhealthy) / 🟢 Healthy (all healthy) |

**Importance** is shown next to the Status line (not in the metrics table). Source:
`get_table` → `importance_score` + `is_important`. Show "X.XX (key asset ⭐️)" if
key asset or importance > 0.8, otherwise just "X.XX".

**Avg Reads/Day** and **Avg Writes/Day** are shown below the Status line. Source:
`get_table` → `table_stats.avg_reads_per_active_day` and `table_stats.avg_writes_per_active_day`.

**Do NOT include downstream data.** This skill only queries upstream lineage.

### Status determination

- **🔴 Unhealthy:** Any active alerts on the asset (from `get_alerts` with statuses `["NOT_ACKNOWLEDGED", "ACKNOWLEDGED", "WORK_IN_PROGRESS"]` — see `parameters.md`)
- **🟡 Degraded:** No active alerts, but 0 active monitors on a high-importance
  asset (importance > 0.8 or key asset)
- **🟢 Healthy:** No active alerts and has at least 1 active monitor

### Tags

Display tags from the `search` tool's `properties` field. Show as inline badges:
`key:value`. If no tags exist, show "None". Always include the Tags line.

### Warehouse

Display the warehouse name and type from the `search` result. Always include this line.

### Recommendations

Only include recommendations derivable from collected data:
- Upstream health issues that may be root causes
- Active alerts that need acknowledgment or investigation
- Do NOT recommend specific monitor types — that is outside this skill's scope

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
