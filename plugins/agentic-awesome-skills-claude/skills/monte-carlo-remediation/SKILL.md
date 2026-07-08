---
name: monte-carlo-remediation
description: Investigate and remediate data quality alerts using Monte Carlo MCP tools. Runs root cause analysis, assesses blast radius, discovers available tools (MCP/CLI/API), proposes and executes fixes, or escalates with full context when uncertain.
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/remediation
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Monte Carlo Remediation Skill

This skill teaches you to investigate and remediate data quality issues detected by Monte Carlo. You use MC MCP tools to understand the alert context, run root cause analysis, assess blast radius, and then execute the appropriate remediation action using whatever external tools the user has connected.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

Reference files live next to this skill file. **Use the Read tool** (not MCP resources) to access them:

- Common remediation patterns and examples: `references/patterns.md` (relative to this file)
- How to discover available tools at runtime: `references/tool-discovery.md` (relative to this file)
- Safety rails and escalation criteria: `references/safety.md` (relative to this file)

## When to activate this skill

Activate when the user:

- Asks to remediate, fix, or respond to a data quality alert or incident
- Mentions a specific alert ID, incident, or data quality issue they want resolved
- Says something like "fix the freshness issue on X", "remediate this alert", "handle this incident"
- Asks to triage AND fix an alert (triage alone without remediation intent → use the prevent skill's Workflow 3 instead)
- Wants to automate a response to a recurring data quality pattern
- Asks "what should I do about this alert?" or "how do I fix this?"

## When NOT to activate this skill

Do not activate when the user is:

- Just triaging or investigating an alert without remediation intent (use prevent skill's Workflow 3)
- Creating or configuring monitors (use the monitoring-advisor skill)
- Running a change impact assessment before code changes (use the prevent skill's Workflow 4)
- Asking about general data quality best practices without a specific incident
- Exploring table health or lineage without an active issue to fix

---

## Available tools

### Monte Carlo MCP server (investigation + post-remediation)

The Monte Carlo MCP server (`monte-carlo-mcp`) provides the investigation tools used in the workflows below. The workflows reference key tools by name (e.g., `get_alerts`, `run_troubleshooting_agent`, `get_asset_lineage`), but **use any Monte Carlo tool that helps** — the server has additional tools beyond what the workflows explicitly call out. Explore what's available.

> **Note on tool call examples:** The code blocks below show key parameters to guide you. Always check the tool's own description for the complete parameter list and exact parameter names — they are authoritative.

### External tools (remediation execution)

Remediation actions are executed via whatever tools are available — MCP servers, CLI tools, or APIs. See Workflow 2 (Capability Discovery) and `references/tool-discovery.md` for how to detect and use them. Use whatever works; don't limit yourself to a prescribed list.

---

## Core workflow

Follow these workflows in order. Each workflow builds on the context gathered by the previous one.

### Workflow 1: Investigation

**Goal:** Understand what happened, why it happened, and what's affected.

Before proposing ANY remediation action, you MUST complete this investigation. Do not skip steps — incomplete context leads to wrong fixes.

#### Step 1: Get alert context

```
get_alerts(
  alert_ids=["<alert_id>"],
)
```

If the user provided a table name instead of an alert ID:
```
search(query="<table_name>")
→ extract MCON
get_alerts(
  table_mcons=["<mcon>"],
  created_after="<7 days ago>",
  created_before="<now>",
  order_by="-createdTime",
  statuses=["NOT_ACKNOWLEDGED", "WORK_IN_PROGRESS"]
)
```

Extract from the alert: `alert_type` (Freshness, Volume, Schema Changes, etc.), `severity`, affected table MCONs, `created_time`.

#### Step 2: Assess triage priority

```
alert_assessment(
  incident_id="<alert_uuid>"
)
```

This returns `incident_likelihood` (HIGH/MEDIUM/LOW), `alert_impact` (HIGH/MEDIUM/LOW), and a summary. Use this to decide urgency:

- **HIGH impact + HIGH incident likelihood** → proceed immediately to Troubleshooting Agent (TSA) analysis
- **LOW impact or LOW incident likelihood** → still run TSA, but note to the user that this may not warrant immediate remediation

#### Step 3: Root cause analysis (TSA)

**Always use async mode.** TSA analysis takes 4–8 minutes — sync mode will time out.

```
run_troubleshooting_agent(
  incident_id="<alert_uuid>",
  async_mode=true
)
```

**While TSA runs, proceed with Steps 4–6 in parallel** — gather lineage, table context, and query data while waiting. Then poll for TSA results:

```
get_troubleshooting_agent_results(
  incident_id="<alert_uuid>"
)
```

Status values:
- `not_found` → TSA hasn't been triggered yet
- `running` → still analyzing (wait 30s initially, then 60s intervals)
- `success` → results available
- `failed` → check `full_response` for error; proceed with manual investigation

**When TSA succeeds, read both the `tldr` and the verifications section.** The `tldr` summarizes the root cause — this is your primary input for choosing a remediation action. The `full_response` includes a "verifications to confirm the root cause" section with specific checks (queries to run, things to compare, upstream systems to inspect). These verifications are often actionable remediation steps themselves — use them to guide what to do next or present them to the user as concrete next steps.

#### Step 4: Assess blast radius

```
get_asset_lineage(
  mcons=["<affected_table_mcon>"],
  direction="DOWNSTREAM"
)
```

For BI report coverage:
```
get_downstream_bi_reports(
  mcon="<affected_table_mcon>"
)
```

Then for upstream investigation:
```
get_asset_lineage(
  mcons=["<affected_table_mcon>"],
  direction="UPSTREAM"
)
```

Note: `has_relationships=false` means no dependencies tracked — do not assume missing relationships.

#### Step 5: Gather table context

```
get_table(
  mcon="<affected_table_mcon>",
  include_fields=true,
  include_table_capabilities=true
)
```

Extract: last activity timestamps, row counts, schema, monitoring status, importance score.

For key downstream tables identified in Step 4, also fetch their details:
```
get_table(mcon="<downstream_mcon>")
```

#### Step 6: Check alert context, monitoring, and recent queries

```
get_monitors(mcons=["<affected_table_mcon>"])
```

For **Custom SQL** or **Validation** alerts, also fetch the monitor configuration to understand the exact rule that breached:
```
get_monitors(
  monitor_ids=["<monitor_id_from_alert>"],
  include_fields=["config"]
)
```
The config contains the SQL query or validation conditions — this tells you exactly what the monitor checks, which is essential for understanding what went wrong and what the fix should be.

```
get_queries_for_table(
  mcon="<affected_table_mcon>",
  query_type="destination",
  limit=10
)
```

Use `query_type="destination"` to find queries that write to this table (pipeline queries). This helps identify which pipeline or job is responsible for the data.

#### Investigation summary

**Wait for TSA to complete before presenting findings.** Do not present partial results — the TSA root cause analysis and its verifications section are critical for choosing the right remediation action. If TSA is still running, keep polling; gather Steps 4–6 in the meantime.

After all steps are complete, synthesize your findings into a clear summary:

1. **What happened:** alert type, when it fired, severity
2. **Root cause:** TSA findings (or your best assessment if TSA failed)
3. **TSA verifications:** specific checks from the TSA `full_response` that can confirm the root cause or serve as remediation steps
4. **Blast radius:** N downstream consumers, any key assets affected
5. **Pipeline context:** which queries/jobs write to this table, when they last ran
6. **Monitoring:** what monitors exist, any gaps. Note recurring patterns (e.g., "16 incidents in 30 days" signals a chronic issue, not a one-off)

Present this summary to the user before proceeding to remediation.

---

### Workflow 2: Capability discovery

**Goal:** Determine what remediation actions are possible given the tools you have available.

Before attempting any remediation action, you must know what tools you can use. You have three categories to check:

1. **MCP servers** — scan your tool list for `mcp__*__*` patterns (e.g., `mcp__airflow__trigger_dag_run`)
2. **CLI tools** — you have shell access; check for tools like `gh`, `dbt`, `airflow`, `curl` via `which <tool>`
3. **APIs** — any service with a REST API is reachable via `curl` if you have the right credentials

Don't assume any particular tool is available. But also don't assume MCP is the only option — a `gh pr create` via the CLI works just as well as a GitHub MCP tool.

For detailed guidance on discovery across all three categories, read `references/tool-discovery.md`.

#### Capability assessment

After checking, summarize what's available:

**Example:**
> "For this remediation, I can:
> - ✅ Investigate via Monte Carlo (MCP connected)
> - ✅ Restart the Airflow DAG (Airflow MCP connected)
> - ✅ Create a code fix (`gh` CLI available)
> - ❌ Rerun the dbt job (no dbt Cloud MCP or `dbt` CLI found)"

#### Graceful degradation

When no tool (MCP, CLI, or API) is available for a needed action:

1. **Always produce the remediation plan** — describe exactly what needs to happen, step by step
2. **Provide runnable commands** — give the user the exact commands they can run manually (e.g., `airflow dags trigger <dag_id>`, `dbt run --select <model>`)
3. **Present findings and ask for next steps** — tell the user what you found, what you recommend, and ask how they'd like to proceed
4. **Document on the alert** — use `create_or_update_alert_comment` to record the diagnosis and recommended fix

---

### Workflow 3: Remediation execution

**Goal:** Take the appropriate action to fix the root cause, with safety rails.

Read `references/patterns.md` for detailed examples of common remediation patterns.

#### Step 1: Select remediation action

Based on the TSA root cause and available tools, determine the action:

| Root Cause Signal (from TSA) | Typical Remediation | Required Capability |
| ---------------------------- | ------------------- | ------------------- |
| Pipeline/DAG failure or delay | Restart the failed pipeline or task | Pipeline orchestration |
| dbt model failure | Rerun the failed dbt job | dbt operations |
| Schema change (upstream) | Assess impact, update downstream models or revert | Code changes |
| Volume anomaly (missing data) | Check upstream pipeline, trigger backfill | Pipeline orchestration + warehouse |
| Volume anomaly (duplicate data) | Identify and remove duplicates, fix pipeline | Warehouse + code changes |
| Permission/access error | Present findings, recommend user escalates to data platform team | None (user decides) |
| Infrastructure issue | Present findings, recommend user escalates to platform/ops team | None (user decides) |
| Unknown or complex root cause | Present full context and ask user for next steps | None (user decides) |

**If the root cause maps to multiple possible actions**, present the options to the user with tradeoffs and let them choose.

**If the root cause doesn't clearly map to any pattern**, read `references/patterns.md` for the "Unknown / complex" pattern, which focuses on presenting full context to the user and asking for direction.

#### Step 2: Present the remediation plan

**BEFORE executing anything**, present the plan to the user:

> "Based on the investigation:
>
> **Root cause:** [TSA summary]
> **Proposed action:** [what you want to do]
> **Reasoning:** [why this action addresses the root cause]
> **Risk:** [what could go wrong, blast radius]
> **Rollback:** [how to undo if the fix causes new problems]"

#### Step 3: Execute (with safety rails)

Before executing, read `references/safety.md` for the full safety protocol. The essentials:

- **Explain before executing** — never take action without telling the user what and why
- **Confirm destructive operations** — wait for explicit user approval
- **Ask the user when uncertain** — don't guess at a fix
- **One action at a time** — execute one action, then decide next step
- **Log everything** — document each action on the alert via `create_or_update_alert_comment`

---

### Workflow 4: Post-remediation

**Goal:** Close out the incident properly — update status, document, and prevent recurrence.

#### Step 1: Update the alert

Ask the user what status to set:

- `FIXED` — the root cause was identified and remediated
- `EXPECTED` — the alert fired on expected behavior (e.g., planned maintenance)
- `NO_ACTION_NEEDED` — the issue resolved itself or is not actionable

Then call `update_alert(alert_id="<alert_uuid>", status="<chosen_status>")`.

#### Step 2: Document the remediation

```
create_or_update_alert_comment(
  alert_id="<alert_uuid>",
  comment="## Remediation Summary\n\n**Root cause:** [TSA findings]\n**Action taken:** [what was done]\n**Result:** [outcome]\n**Remediated by:** AI agent via remediation skill\n**Timestamp:** [ISO timestamp]"
)
```

#### Step 3: Consider prevention

After remediating, briefly assess whether this issue is likely to recur:

- **If the root cause is systemic** (e.g., a flaky pipeline, a missing monitor): suggest adding a monitor or creating a ticket to address the underlying issue
- **If it was a one-off** (e.g., infrastructure blip, manual error): document and move on

Do not automatically create monitors or tickets — suggest them and let the user decide.

---

## Common mistakes to avoid

- **NEVER execute a remediation action without presenting the plan first.** The user must understand what you're about to do.
- **NEVER skip the investigation phase.** A wrong diagnosis leads to a wrong fix — or worse, a fix that causes new problems.
- **NEVER assume external MCP tools are available.** Always check first. A missing tool is not an error — present findings to the user and ask for next steps.
- **NEVER chain multiple remediation actions without verifying each one.** One action at a time.
- **NEVER modify data directly** (DELETE, UPDATE, DROP) without explicit user confirmation AND a clearly stated rollback plan.
- **NEVER mark an alert as FIXED before verifying the fix.** Check that the underlying condition has actually improved.
- **NEVER remediate silently.** Always document what was done via `create_or_update_alert_comment`.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
