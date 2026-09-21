---
name: monte-carlo-context-detection
description: Route data-related requests to the right Monte Carlo skill or workflow.
  USE WHEN alerts, incidents, data broken, stale, coverage gaps, data quality, or
  any ambiguous data observability request.
when_to_use: 'Invoke for ambiguous or incomplete data-observability requests that
  don''t clearly name a specific skill.

  Example triggers: "something is wrong with my data", "I have alerts firing", "check
  my pipelines", "what should I monitor?", "my data looks off".


  CRITICAL on vague first turns: ALWAYS ask 1–3 targeted clarifying questions FIRST
  (what symptom? which table/warehouse? when did it start?). Do NOT call Monte Carlo
  MCP tools (get_alerts, search, get_table, etc.) on turn 1 until the user has named
  a specific table, warehouse, or alert. Calling tools prematurely on a vague prompt
  wastes turns and frustrates the user.


  Do NOT invoke when the user''s intent clearly matches a single existing skill (e.g.
  "check health of orders table" → asset-health; "create a volume monitor on X" →
  monitoring-advisor).

  '
bucket: Agent-routing
version: 1.0.0
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
source: community
date_added: '2026-09-21'
risk: unknown
---

## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Monte Carlo Context Detection

This skill determines which Monte Carlo skill or workflow best fits the user's current context. It activates reactively for ambiguous or multi-step data-related messages, gathers signals, and routes to the right skill or workflow.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

Reference file for signal definitions: `references/signal-definitions.md` (relative to this file). Read it before routing.

## When to activate this skill

This skill is activated by the CLAUDE.md routing table when:

- The user's message relates to data quality, alerts, incidents, coverage, or Monte Carlo — but doesn't clearly match a single skill in the routing table
- The user's intent is ambiguous or could span multiple skills
- The user asks a broad question like "help me with my data" or "what's going on?"

## When NOT to activate this skill

- A skill or workflow is already active in the conversation — the active skill owns the conversation, do not intercept
- The user's message clearly matches a single skill in the CLAUDE.md routing table — route directly, no need for context detection
- The user is editing a dbt model — defer to the `prevent` skill which auto-activates via hooks
- The user's message is not data-related at all

---

## Workflow: Reactive Routing

This skill is purely reactive — it activates for ambiguous or multi-step data-related messages and routes them.

Follow these steps in order.

### Step 0: Fast-path clear intent (stop early if matched)

Before doing anything else, check whether the user's message unambiguously matches a single existing skill. If so, **skip the rest of this workflow** and immediately load that skill — do NOT read `references/signal-definitions.md`, do NOT make API probes.

| Clear user intent | Skill to load immediately |
|---|---|
| "Check health of [named table]" / "status of [named table]" | `../asset-health/SKILL.md` |
| "Create a [monitor type] on [named table]" | `../monitoring-advisor/SKILL.md` |
| "Investigate alert on [named table]" / "why is [named table] stale/broken?" | `../incident-response/SKILL.md` |
| "What should I monitor?" / "where are my coverage gaps?" | `../proactive-monitoring/SKILL.md` |
| "Instrument my agent" / "set up Monte Carlo tracing on [named framework] agent" / "setting up an agent" | `../instrument-agent/SKILL.md` |

Context-detection is for **ambiguous** requests only. If the request is clear, routing through this skill wastes turns and tokens.

If no clear match, proceed to Step 1.

### Step 1: Categorize intent

Read `references/signal-definitions.md` for the full signal catalog. Determine which category the user's message falls into:

| Category | Signals | Example messages |
|----------|---------|-----------------|
| **Specific asset** | User mentions a table name, or has a `.sql` model file open in their IDE | "what's wrong with stg_payments?", "check this table" |
| **Active incident** | Keywords: alert, broken, stale, failing, incident, triage, wrong data | "I have alerts firing", "data looks wrong", "something broke" |
| **Coverage/monitoring** | Keywords: monitor, coverage, gaps, unmonitored, what should I watch | "what should I monitor?", "where are my gaps?" |
| **Agent instrumentation** | Keywords: instrument, set up tracing, set up Monte Carlo tracing, setting up an agent. Often mentions an AI framework (LangChain, LangGraph, OpenAI, Anthropic, CrewAI, Bedrock, SageMaker, Vertex AI) | "instrument my agent", "set up MC tracing on my LangGraph agent", "setting up an agent" |
| **General/exploratory** | No clear category, broad question | "help me with data quality", "what can Monte Carlo do?" |

### Step 2: Gather scope (only if needed)

- **Specific asset known** (from file context or user mention) → proceed to Step 3
- **Active incident, no scope** → ask: "Want me to check recent alerts? Any specific time range or severity?"
- **Coverage/monitoring, no scope** → ask: "Which warehouse should I look at, or should I check across all?"
- **General/exploratory** → present the categories: "I can help with: (1) investigating active alerts or data issues, (2) analyzing monitoring coverage and creating monitors, or (3) checking the health of specific tables. What are you looking for?"

### Step 3: Scoped API probe (when scope is available)

Only make API calls when you have enough context to scope them:

- **Specific asset** → call `get_alerts` with the table's MCON or name filter, and `get_monitors` for that table
- **Active incident with scope** → call `get_alerts` with the user's time range / severity filters
- **Coverage/monitoring** → skip API probe, route directly to proactive monitoring workflow (it handles its own API calls)
- **If MCP tool calls fail** (auth not configured) → skip API, fall back to conversation intent alone

**Always scope MCP calls tightly.** Unscoped `get_alerts`, `search`, or `get_monitors` on large accounts can return hundreds of results, overflow the tool-result token limit, spill to disk, and force expensive chunk reads — burning user tokens and risking workflow failure. Minimum scoping:

- `get_alerts` → time filter (`created_after`, default last 7 days) + at least one of `warehouse`, `table_names`, `severity`
- `search` → needed to resolve a table name to its MCON (`get_table` requires MCON). ALWAYS pass `limit` (e.g. 5), the table name as `query`, and filter by `warehouse_uuid` or `database`/`schema`. `warehouse_types` alone ("snowflake") matches thousands of tables. Disambiguation rules when multiple matches return:
  1. If the user named a warehouse (e.g. "analytics-snowflake") → auto-pick the match whose `warehouse_display_name` matches and proceed. Do NOT stop to ask.
  2. If the user named a database/schema → auto-pick the match in that database/schema.
  3. If one match is flagged `is_key_asset: true` and others aren't → auto-pick the key asset.
  4. Only ask the user to disambiguate when none of the above resolve it.
- `get_monitors` → always filter by `mcons` (table MCON) or `warehouse_uuid`

If you don't have enough scope, ask the user before calling.

### Step 4: Route

Based on the combined signals from Steps 1-3:

| Combined signals | Confidence | Action |
|-----------------|------------|--------|
| Active alerts found + incident intent | High | **Auto-activate** incident response workflow: read and follow `../incident-response/SKILL.md` |
| Coverage intent + data project detected | High | **Auto-activate** proactive monitoring workflow: read and follow `../proactive-monitoring/SKILL.md` |
| User asks to create a specific monitor (type + table known) | High | **Auto-activate** monitoring-advisor: read and follow `../monitoring-advisor/SKILL.md` |
| Table mentioned + "health" / "status" / "check" intent | High | **Auto-activate** asset-health: read and follow `../asset-health/SKILL.md` |
| Agent instrumentation intent (instrument / set up tracing / setting up an agent) + Python codebase context | High | **Auto-activate** instrument-agent: read and follow `../instrument-agent/SKILL.md` |
| Ambiguous or conflicting signals | Low | **Suggest** options and wait for user to choose |

**High confidence = auto-activate.** Load the target skill's SKILL.md and begin executing it immediately. Do not ask for confirmation.

**Low confidence = suggest.** Present 2-3 options with brief descriptions and let the user choose. Example:

> "Based on what you've described, I can:
> 1. **Investigate alerts** — triage and fix active data issues (incident response workflow)
> 2. **Improve monitoring** — find coverage gaps and create monitors (proactive monitoring workflow)
>
> Which would be most helpful?"

### Prevent guardrail

If the user is **actively editing** a dbt model file (making code changes, not just viewing or asking about it) and the `prevent` skill's hooks are active, do NOT route to any other skill. Instead respond:

> "The prevent skill will automatically handle impact assessment for dbt model changes via its pre-edit hooks. No additional routing needed."

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
