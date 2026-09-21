# Signal Definitions

This file documents each signal used by the context detection skill, its source,
reliability, and what it maps to. Update this file when adding a new skill or
workflow to the routing system.

## Workspace Signals (detected via file system)

| Signal | Detection method | Reliability | Meaning |
|--------|-----------------|-------------|---------|
| `dbt_project.yml` exists | Glob from workspace root | High | This is a dbt project — `prevent` skill is relevant for model edits |
| `montecarlo.yml` exists | Glob from workspace root | High | Monte Carlo monitors-as-code is configured — monitoring skills are relevant |
| User has a `.sql` model file open | IDE context / file path in conversation | High | Specific table context available — extract table name from filename |

## Conversation Signals (detected from user message)

| Signal | Keywords / patterns | Maps to |
|--------|-------------------|---------|
| Incident intent | "alert", "broken", "stale", "failing", "incident", "triage", "wrong data", "data issue" | Incident response workflow |
| Coverage intent | "monitor", "coverage", "gaps", "unmonitored", "what should I watch", "what should I monitor" | Proactive monitoring workflow |
| Specific monitor creation | "create a monitor", "add a freshness check", "set up validation" + specific table | monitoring-advisor (direct) |
| Table health | "health", "status", "check on", "how is table X" + specific table | asset-health (direct) |
| Storage/cost | "cost", "storage", "unused tables", "zombie tables" | storage-cost-analysis (direct) |
| Performance | "slow", "performance", "expensive query", "pipeline taking long" | performance-diagnosis (direct) |
| Validation notebook | "validation notebook", "generate validation", "compare baseline" | generate-validation-notebook (direct) |
| Push ingestion | "push ingestion", "metadata collector", "lineage collector" | push-ingestion (direct) |
| Agent instrumentation | "instrument my agent", "instrument", "set up tracing", "set up Monte Carlo tracing", "setting up an agent", "add MC tracing" | instrument-agent (direct) |
| Agent alert / trace investigation | "agent alert", "eval score drop", "agent trace", "agent conversation", "why is my agent failing" | troubleshoot-agent-traces (direct) |
| Agent reinforcement / fix | "fix my agent", "reinforce my agent", "improve my agent's health", "what should I fix in my agent", "open a PR for my agent" | reinforce-agent (direct) |

## API Signals (detected via scoped MCP tool calls)

These signals are only gathered when a specific table or scope is known. Never
call these without scope.

| Signal | MCP tool call | What it returns | Maps to |
|--------|--------------|-----------------|---------|
| Active alerts on table | `get_alerts` with table filter | Unresolved alerts for the specific table | Incident response workflow (if alerts found) |
| Monitor coverage on table | `get_monitors` with table MCON | Existing monitors for the table | Informs whether to suggest coverage analysis |

## Routing Priority

1. **Prevent guardrail** — If user is editing a dbt model, `prevent` owns the session. Do not route.
2. **Active skill** — If a skill or workflow is already active, do not re-route. The active skill owns the conversation.
3. **High-confidence match** — Auto-activate the matched skill/workflow.
4. **Low-confidence match** — Suggest options, let user choose.
