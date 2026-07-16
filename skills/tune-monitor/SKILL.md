---
name: tune-monitor
description: Analyze a Monte Carlo monitor and recommend config changes to reduce alert noise. Supports metric, custom SQL, validation, and table monitors. Fetches the report, identifies patterns, and suggests tuning.
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/tune-monitor
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Tune Monitor: Noise Reduction Analysis
## When to Use

Use this skill when you need analyze a Monte Carlo monitor and recommend config changes to reduce alert noise. Supports metric, custom SQL, validation, and table monitors. Fetches the report, identifies patterns, and suggests tuning.


You are a Monte Carlo monitor tuning agent. Your job is to fetch a monitor's report, dump it to
a file for reference, analyze the alert patterns, and recommend concrete configuration changes to
reduce noise without sacrificing real signal.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

**Arguments:** $ARGUMENTS

Reference files live next to this skill file. **Use the Read tool** (not MCP resources) to access
them:

- Metric monitor tuning: `references/metric-monitor.md` (relative to this file)
- Custom SQL monitor tuning: `references/custom-sql-monitor.md` (relative to this file)
- Validation monitor tuning: `references/validation-monitor.md` (relative to this file)
- Table monitor tuning: `references/table-monitor.md` (relative to this file)

---

## Prerequisites

- **Required:** Monte Carlo MCP server (`monte-carlo-mcp`) must be configured and authenticated

---

## Available MCP tools

| Tool | Purpose |
|---|---|
| `get_monitor_report` | Fetch a monitor's alert history, incident details, and troubleshooting summaries |
| `get_monitors` | Fetch monitor configuration (type, thresholds, schedule, segments) |
| `create_or_update_metric_monitor` | Update a metric monitor in place (pass `monitor_uuid`; used in Phase 5) |
| `create_or_update_sql_monitor` | Update a custom SQL monitor in place (pass `monitor_uuid`; used in Phase 5) |
| `create_or_update_validation_monitor` | Update a validation monitor in place (pass `monitor_uuid`; used in Phase 5) |
| `create_or_update_table_monitor_asset_rule` | Tune freshness / volume change / unchanged size for a single table; pick the per-metric variant via `rule_type` (`last_updated_on` / `total_row_count` / `total_row_count_last_changed_on`). One call per `(table, metric)` pair (used in Phase 5). |

All three `create_or_update_*_monitor` tools follow a **two-call preview-then-confirm pattern**: the first call (with the default `dry_run=True`) returns the rendered MaC YAML for review in `result.yaml`; the second call (`dry_run=False`) deploys the change live and returns a deep link in `result.instructions`. **Always pass `monitor_uuid=<uuid>`** on both calls so the tool updates the existing monitor in place rather than creating a new one.

---

## Phase 0: Validate Input

Extract the monitor UUID from `$ARGUMENTS`. It must be a valid UUID (format:
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

If no UUID is provided or it doesn't look like a UUID, stop and tell the user:

> Please provide a monitor UUID. Example: `/tune-monitor 94c2dd3a-ef49-40f8-b1c1-741ba057cabf`

---

## Phase 1: Fetch Monitor Report

Call `get_monitor_report` with:
- `monitor_uuid`: the UUID from `$ARGUMENTS`
- `max_incidents`: 50

If the tool returns an error or empty result, tell the user the monitor was not found and stop.

Also fetch the monitor's full config via `get_monitors` with:
- `monitor_ids`: [`{monitor_uuid}`]
- `include_fields`: [`config`]

Run both calls in parallel.

---

## Phase 1.5: Determine Monitor Type and Load Reference

From the `get_monitors` config response, determine the monitor type:

| Config indicator | Type | Reference file |
|---|---|---|
| Monitor type is a metric monitor variant (e.g., metric, field health) | Metric | `references/metric-monitor.md` |
| Monitor type is a custom SQL rule / custom monitor | Custom SQL | `references/custom-sql-monitor.md` |
| Monitor type is a validation rule / validation monitor | Validation | `references/validation-monitor.md` |
| Monitor type is a table monitor (freshness, volume, schema across tables) | Table | `references/table-monitor.md` |

**Read** the appropriate reference file using the Read tool with the path relative to this skill
file. The reference contains type-specific config fields to extract, recommendation guidance, and
apply-changes instructions.

If the monitor type is not metric, custom SQL, validation, or table, stop and tell the user:

> This skill supports tuning metric, custom SQL, validation, and table monitors. This monitor
> is a {type} monitor, which is not supported.

---

## Phase 2: Analyze the Report

Analyze the monitor report and config together. Focus on:

### 2a. Alert volume & frequency
- How many incidents in the last 30 days? Last 7 days?
- What is the firing cadence — multiple times per day? Daily? Sporadic?
- Are incidents clustered in time (bursts) or spread evenly?

### 2b. Anomaly patterns
- Which segments (field values) are firing most? Are they the same segments repeatedly?
- Are anomalies consistently marginal (just above threshold) or severe?
- Are any anomalies from sparse/bursty event types that naturally spike?
- Are anomalies caused by known operational events (deployments, batch jobs, bulk user actions)?
- For validation monitors: how many invalid rows per incident? Is the count stable or growing?
- For table monitors: which (table, metric) pairs are firing most? Are they the same repeatedly?

### 2c. Current configuration
Extract the current configuration. The specific fields to look for are documented in the per-type
reference loaded in Phase 1.5. At minimum, extract:
- Monitor type and what it measures
- Schedule interval
- Audiences / notification channels
- Whether the monitor uses ML thresholds or explicit thresholds

### 2d. Troubleshooting analysis (if available)
Look at any troubleshooting TL;DRs in the report. Note:
- Are most anomalies assessed as "likely normal data variation"?
- Are there recurring root causes?
- Is there a blind spot (e.g., no upstream metadata)?

---

## Phase 3: Generate Recommendations

Based on the analysis, produce a prioritized list of recommendations. For each recommendation:
- State the **problem** it solves
- Give the **specific config change** (use exact field names from the MC config schema)
- Explain the **trade-off** (what signal might be lost)

### General recommendations (all monitor types)

#### Sensitivity tuning (ML thresholds only)
This applies to any monitor that uses ML thresholds — both metric monitors and custom SQL monitors.
Skip this section for validation monitors (they don't use ML thresholds), for table monitors
(they have their own per-metric sensitivity — see the table monitor reference), and for monitors
with explicit thresholds (for custom SQL monitors, see threshold adjustment in the per-type
reference instead).

- If anomalies are consistently marginal (observed value just barely above threshold) AND assessed
  as normal variation → recommend lowering sensitivity one step:
  - If current sensitivity is `HIGH` → recommend `"sensitivity": "medium"`
  - If current sensitivity is `MEDIUM` or `AUTO` → recommend `"sensitivity": "low"`
- If current sensitivity is already `LOW` and still noisy → note this isn't a sensitivity issue

#### Schedule / interval
- If the monitor fires multiple times per day but anomalies always resolve within hours → recommend
  increasing schedule interval (e.g., from 720 min to 1440 min) to reduce duplicate alerts
- If anomalies are caused by data arriving late → recommend increasing `collection_lag`

#### Snooze / training period
- If the monitor was recently created (<30 days) and is still learning patterns → recommend
  waiting for the model to stabilize before tuning

#### Audience / notification routing
- If the monitor has no audiences configured and is generating noise → recommend adding audiences
  only for high-severity anomalies, or removing notifications entirely for known-noisy monitors

### Type-specific recommendations

For type-specific recommendations (WHERE conditions, segment exclusion, aggregation changes,
threshold adjustment, SQL modifications, alert condition modifications, per-table-metric
sensitivity tuning), follow the guidance in the per-type reference loaded in Phase 1.5.

---

## Phase 4: Present the Report

Output a structured analysis. **This is the primary output — include it in full.**

```markdown
## Monitor Tune Report: {monitor_uuid}

**Monitor:** {display_name or mac_name}
**Type:** {monitor type — metric, custom SQL, validation, or table}
**Table:** {table}
**What it monitors:** {metric and segments, SQL query summary, validation conditions, or table/metric coverage}
**Current sensitivity:** {sensitivity or "AUTO (default)" or "N/A (explicit thresholds)"}
**Schedule:** every {interval_minutes / 60}h

### Alert Summary (last 30 days)
- Total alerts: {count}
- Firing frequency: {e.g., "~twice daily", "daily", "sporadic"}
- Most noisy segments: {top 2-3 segment values by alert count, or N/A for custom SQL/validation}
- Most noisy (table, metric) pairs: {for table monitors: top pairs by anomaly count}

### Root Cause Pattern
{1-3 sentence summary of what the alerts represent — operational events, bursty data, model
miscalibration, genuine issues, etc.}

### Recommendations

#### 1. {Highest-impact change} [RECOMMENDED]
**Problem:** ...
**Change:**
```yaml
{specific config field}: {new value}
```
**Trade-off:** ...

#### 2. {Second change} [OPTIONAL]
...

#### 3. {Third change} [OPTIONAL]
...

### What NOT to change
{Any configurations that look correct and should be left alone — avoid over-tuning.}

### If these changes are made
{Predict the expected outcome: estimated alert reduction, what genuine anomalies would still fire.}
```

**Next step:** "Want me to apply any of these changes to the monitor config, or explore the alert
history further?"

---

## Phase 5: Apply Changes (if user requests)

To apply changes, follow the apply-changes instructions in the per-type reference loaded in
Phase 1.5. Each reference specifies the correct tool and constraints for that monitor type.

General rules for all types:
1. **Always preview first** — show the user what will change before applying.
2. **Get explicit confirmation** before applying any change.
3. **Validate the preview YAML against the schema** — before presenting the preview YAML to the user, fetch the published MaC JSON Schema from `https://clidocs.getmontecarlo.com/mac/schema.json` (WebFetch) and check the preview YAML against it. If any field in the YAML does not appear in the schema for the given monitor type, flag it and correct it. Note: the schema validates field names, types, and enum values only — cross-field semantic constraints are enforced by the backend at apply time, not by the schema.
4. **MaC-managed monitors** — if `get_monitors` returns a `mac_name` or the user mentions the monitor is managed via a MaC YAML file, note this before applying: changes made via the API will be overwritten the next time `montecarlo monitors apply` runs. Offer to hand off to `/manage-mac` (edit workflow) instead so the YAML file stays the source of truth.

---

## Guidelines

- **Be specific.** Generic advice like "reduce sensitivity" is less useful than exact config changes.
- **Prefer surgical changes.** A targeted WHERE condition beats a blunt sensitivity reduction.
- **Preserve signal.** Always explain what genuine anomalies would still be caught after tuning.
- **Cite evidence.** Reference specific incident dates, segment values, and counts from the report.
- **Degrade gracefully.** If troubleshooting runs are missing, note the limited context and
  reason from alert patterns alone.
- **Add `$schema` when saving YAML to a file.** If the user asks to save the MaC YAML to a file, add `# yaml-language-server: $schema=https://clidocs.getmontecarlo.com/mac/schema.json` as the first line of that file.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
