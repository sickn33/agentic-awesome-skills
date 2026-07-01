---
name: monte-carlo-analyze-root-cause
description: "Investigate data incidents and find root causes using Monte Carlo's observability data. Guides the agent through systematic investigation: alert lookup, lineage tracing, ETL checks, query analysis, and data profiling. Activates when a user asks about data issues, incidents, alerts, or..."
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/analyze-root-cause
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Monte Carlo Root Cause Analysis Skill

This skill helps investigate data incidents — freshness delays, volume anomalies, schema changes, field metric drift, and ETL failures — by guiding the agent through a systematic investigation using Monte Carlo's MCP tools. It combines observability metadata with optional direct data querying to find the root cause.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

Reference files live next to this skill file. **Use the Read tool** (not MCP resources) to access them:

- Investigation playbooks by issue type: `references/<type>-investigation.md`
- Data exploration patterns: `references/data-exploration.md`
- Intake when no incident ID: `references/intake-no-incident.md`
- Common root cause catalog: `references/common-root-causes.md`

## When to activate this skill

Activate when the user:

- Mentions a Monte Carlo alert, incident, or anomaly
- Asks "why is this table stale?" or "why did row count drop?"
- Wants to investigate a data quality issue
- Asks about freshness, volume, or schema problems
- Mentions pipeline failures (Airflow, dbt, Databricks)
- Says things like "debug this alert", "investigate this incident", "root cause analysis"

## When NOT to activate this skill

Do not activate when the user is:

- Creating monitors (use the monitoring-advisor skill)
- Running impact assessments before code changes (use the prevent skill)
- Looking at storage costs (use the storage-cost-analysis skill)
- Exploring pipeline performance without a specific incident (use the performance-diagnosis skill)

## Prerequisites

**Required:** Monte Carlo MCP server (`integrations.getmontecarlo.com/mcp`) must be configured and authenticated.

**Optional but recommended:**
- **Database MCP server** (Snowflake, BigQuery, Redshift, Databricks) — enables direct SQL queries for deeper data investigation. Without this, the skill can still analyze using MC's metadata tools but cannot profile actual data.
- **GitHub MCP server** — enables searching for recent PRs that may have caused the issue. Without this, the skill falls back to MC's query change detection.

## MCP Tools Used

### From Monte Carlo MCP server

| Tool | Purpose |
|------|---------|
| `get_alerts` | Fetch incident/alert details |
| `search` | Find tables by name or keyword |
| `get_table` | Table metadata and fields |
| `get_asset_lineage` | Table-level upstream/downstream lineage |
| `get_field_lineage` | Field-level lineage (trace bad data to source column) |
| `get_table_freshness` | Table update/freshness history |
| `get_table_size_history` | Row count and size history |
| `get_queries_for_table` | Read/write query history |
| `get_query_changes` | Detect SQL text modifications |
| `get_query_rca` | Root cause analysis for failed/futile/missed queries |
| `get_etl_issues` | ETL pipeline issues — pass `platform` ("airflow", "dbt", or "databricks") |
| `get_etl_jobs` | Find ETL jobs that write to specific tables — pass `platform` param |
| `get_github_prs` | Recent GitHub PRs from the account's MC GitHub integration |
| `get_jobs_performance` | Job runtime stats, failure rates, 7-day trends |
| `get_change_timeline` | Unified timeline: query changes + volume + ETL failures |
| `get_current_time` | Current timestamp for relative time ranges |
| `alert_assessment` | Optional ~2-min triage of an incident — returns HIGH/MEDIUM/LOW confidence and impact. Useful when you want a quick read before deciding to escalate to TSA. |
| `run_troubleshooting_agent` | Starts the Troubleshooting Agent (TSA) on an incident. Async by default; idempotent (returns existing results unless `force_rerun=True`). Auto-invoked at Step 1.5 when an incident UUID is present. |
| `get_troubleshooting_agent_results` | Polls TSA results for an incident (`status` is `not_found` / `running` / `success` / `failed`). Use to check on the async run started at Step 1.5. |

> **Credits:** `alert_assessment` and `run_troubleshooting_agent` consume Monte Carlo credits the same way the Troubleshooting Agent does when launched from the Monte Carlo UI. Each fresh `run_troubleshooting_agent` call is a billable run; reuse via the built-in idempotency (don't pass `force_rerun=True` unless the user explicitly asks for a fresh analysis).

### Optional external MCP tools

| Tool | Purpose |
|------|---------|
| Database MCP (Snowflake, BigQuery, etc.) | Run SQL queries for data profiling |
| GitHub MCP | Search for recent PRs (alternative to MC's `get_github_prs` — useful if the account has no MC GitHub integration) |

---

## Workflow

### Step 1: Understand the problem (intake)

**If the user provides an alert or incident ID:**
1. Call `get_alerts` with the alert ID to fetch details.
2. Identify: affected table(s), issue type (freshness, volume, schema, field metric), when it started.
3. Proceed to Step 2.

**If the user describes a problem WITHOUT an incident ID:**
Read `references/intake-no-incident.md` for the full intake flow. In short:
1. Ask clarifying questions: what table? what looks wrong? when did it start?
2. Search for the table: `search(query="table_name")`
3. Search for related alerts: `get_alerts` with a recent time range
4. Check table health: `get_table_freshness`, `get_table_size_history`
5. Narrow down the issue type and proceed to Step 2.

### Step 1.5: Auto-invoke TSA (when applicable)

When intake produces a Monte Carlo **incident UUID**, kick off the Troubleshooting Agent (TSA) **before** continuing to Step 2. TSA runs the same root-cause analysis the Monte Carlo UI uses; running it here in parallel with the manual investigation usually beats running either path alone.

**Skip TSA when any of these is true:**

1. **No incident UUID.** `run_troubleshooting_agent` requires a UUID. The no-incident intake path (`references/intake-no-incident.md`) does not feed TSA. If that path later identifies a matching alert, return to Step 1 with the alert's incident UUID — Step 1.5 then applies normally.
2. **Narrow scoped check.** The user wants a single fact, not an investigation. Examples: "is `analytics.orders` stale right now?", "what's the row count of X?", "show me the schema of Y", "did this query run today?". Answer the question with the relevant tool and stop. TSA is overkill for these.
3. **Explicit user opt-out.** The user says "skip TSA", "don't run TSA", "manual only", "just do it yourself", or similar. Honor the opt-out and proceed to Step 2 without invoking TSA.

**Default invocation (async, parallel):**

```
run_troubleshooting_agent(incident_id="<uuid>", async_mode=True)
```

- The tool is **idempotent** by default: if a previous successful TSA run exists for this incident, it returns those results immediately. Do **not** pass `force_rerun=True` unless the user explicitly asks for a fresh analysis (each fresh run is a billable Monte Carlo credit consumption).
- If status is `success` on the first call, you have results — fold them straight into Step 7's synthesis and continue Steps 2–6 to corroborate.
- If status is `queued` or `running`, continue to Step 2 immediately. TSA typically completes in 4–8 minutes; you'll poll for results via `get_troubleshooting_agent_results` later in the flow (see Step 4 and Step 7).
- If status is `failed`, note the error and continue with the manual investigation only — do not re-run automatically.

Tell the user what you started: "I've kicked off the Troubleshooting Agent on this incident — it usually finishes in 4–8 minutes. While it runs, I'll continue investigating manually so we have findings either way."

### Step 2: Map the blast radius

> **TSA in parallel:** if you started TSA at Step 1.5, it is running in the background while you do this step. Do not block on it.

1. Call `get_asset_lineage(mcons=[table_mcon], direction="UPSTREAM")` — what feeds this table?
2. Call `get_asset_lineage(mcons=[table_mcon], direction="DOWNSTREAM")` — what does this table feed?
3. If the issue involves specific fields, call `get_field_lineage` to trace which upstream fields feed the affected columns.

Report to the user: "This table is fed by X upstream sources and feeds Y downstream consumers. Here's what could be impacted."

**Ask for direction:** Before diving deeper, ask the user what they'd like to investigate first. They may already have a hunch ("I think it's the Airflow job" or "check if someone changed the SQL"). Follow their lead — don't run all investigation paths blindly. If they have no preference, proceed with the most likely path based on the issue type.

### Step 3: Investigate based on issue type

Read the appropriate reference file and follow its investigation playbook:

| Issue Type | Reference |
|-----------|-----------|
| Table not updating on schedule | `references/freshness-investigation.md` |
| Unexpected row count changes | `references/volume-investigation.md` |
| Columns added, removed, or type-changed | `references/schema-investigation.md` |
| Airflow/dbt/Databricks pipeline failures | `references/etl-failure-investigation.md` |
| SQL modifications causing data changes | `references/query-change-investigation.md` |
| Field-level metric drift (null rate, mean, etc.) | `references/field-anomaly-investigation.md` |

### Step 4: Check for upstream causes

Data issues often originate upstream. Walk the lineage chain:

1. For each direct upstream table from Step 2:
   - Check freshness: `get_table_freshness` — is the upstream table also stale?
   - Check size: `get_table_size_history` — did the upstream table's volume change?
   - Check ETL status: `get_etl_issues` with the relevant `platform`
2. Use `get_field_lineage` to trace the specific field that has bad data back to its source.
3. Check what upstream field values correlate with the anomaly (if DB connector is available — see Step 5).

**TSA poll #1.** If you started TSA at Step 1.5 and it has not yet returned `success`, call `get_troubleshooting_agent_results(incident_id=...)` once here (~30s after Step 1.5). If status is `success`, hold the result for Step 7. If still `running`, keep going — you'll poll again before Step 7. Don't block on it.

### Step 5: Profile data (if database MCP is available)

If the user has a database MCP server connected (Snowflake, BigQuery, Redshift, Databricks, etc.), read `references/data-exploration.md` for SQL investigation patterns including:
- Sample rows around the incident time
- Null rate and distribution checks
- Value correlation with upstream tables
- Before/after comparisons

**If no database MCP is available:** Tell the user: "I can't query the warehouse directly — for deeper data investigation, connect a database MCP server. I can still analyze using Monte Carlo's metadata and the tools available." Continue the investigation with MC tools only.

### Step 6: Check for code changes

Call `get_github_prs` with a time range around when the issue started to find recent PRs from the account's Monte Carlo GitHub integration. Look for PRs that modified dbt models, SQL files, or pipeline configs affecting the impacted table.

If the account has no GitHub integration (tool returns empty), or the user has a local GitHub MCP server they prefer, use that instead.

Also call `get_query_changes` with the affected table MCONs to detect SQL text modifications, and `get_change_timeline` for a unified view of all changes (query modifications + volume shifts + ETL failures) in one call.

### Step 7: Synthesize and present

**TSA poll #2.** If you started TSA at Step 1.5 and don't yet have results, call `get_troubleshooting_agent_results(incident_id=...)` one more time (~60–90s after poll #1). Stop on `success` or `failed`; if still `running` after this poll, present the manual findings now and tell the user TSA is still working ("TSA is still running on this incident — I'll fold its findings in once it completes if you'd like, or you can ask me to check back in a minute").

Read `references/common-root-causes.md` to match findings against known patterns. Present:

1. **Root cause** — what happened and when, with evidence from tools
2. **Evidence chain** — which tools confirmed each piece of the story
3. **Impact** — what downstream tables/consumers are affected (from Step 2)
4. **Recommended fix** — specific action to resolve the issue
5. **Prevention** — suggest monitoring to catch this earlier next time

**Merging TSA findings:**

- **TSA succeeded and agrees with the manual investigation** — lead with the unified root cause; cite both TSA's evidence chain and the corroborating manual findings.
- **TSA succeeded and contradicts the manual investigation** — surface both. Show TSA's verdict, show what the manual investigation found, and explain the disagreement (e.g. "TSA blames the upstream Airflow job, but `get_table_freshness` on that table is healthy"). Ask the user which thread they want to pull on.
- **TSA succeeded with low-signal output** (e.g. "no clear root cause") — present the manual findings as primary; cite TSA as a corroborating null result.
- **TSA failed or timed out** — present the manual findings only; mention TSA's failure briefly so the user knows it was tried.

---

## Important rules

- **Never fabricate data.** Only cite numbers and facts returned by tools. If a tool returned no data, say so.
- **Follow the evidence.** If upstream lineage shows no issues, the problem is likely in the table's own ETL. Don't chase phantom upstream causes.
- **Check the timeline.** The most common pattern is: "X changed at time T, and the anomaly started at time T+1." Use `get_change_timeline` for this.
- **Be specific about what you can't check.** If no DB connector is available, explain what additional investigation would be possible with one.
- **Never expose MCONs, UUIDs, or internal identifiers** to the user. Use human-readable table names.
- **Cross-platform awareness.** ETL issues can come from Airflow, dbt, or Databricks. Check all platforms that are relevant.
- **Do not invoke TSA without an incident UUID.** `run_troubleshooting_agent` requires one. If intake is on the no-incident path, skip TSA entirely until/unless an alert is identified.
- **Honor explicit user opt-outs.** If the user says "skip TSA", "manual only", or similar, do not call `run_troubleshooting_agent` or `alert_assessment` — proceed with the manual investigation only.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
