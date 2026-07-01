---
name: automated-triage
description: Triage Monte Carlo alerts interactively or build an automated workflow. Fetch, score, and troubleshoot alerts using MCP tools now, or design a reusable workflow that runs on a schedule.
risk: unknown
source: https://github.com/monte-carlo-data/mc-agent-toolkit/tree/main/skills/automated-triage
source_repo: monte-carlo-data/mc-agent-toolkit
source_type: community
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/monte-carlo-data/mc-agent-toolkit/blob/main/LICENSE
---

# Monte Carlo Automated Triage

This skill helps you design, test, and deploy an automated triage agent for Monte Carlo alerts. Rather than a fixed workflow, it gives you the building blocks — a set of MCP tools, a description of each triage stage, and a working example — so you can build a process that matches how your team actually responds to alerts.

> **Monte Carlo tool routing (required):** Always call Monte Carlo MCP tools through this plugin's
> bundled server, whose fully-qualified tool names are
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__<tool>` (e.g.
> `mcp__plugin_mc-agent-toolkit_monte-carlo-mcp__get_alerts`). Bare tool names used in this skill
> (`get_alerts`, `search`, `get_table`, …) refer to that bundled server. If the session also has a
> separately-configured `monte-carlo-mcp` server, do **not** route to it — it may point at a
> different endpoint or credentials.

Read the reference files before proceeding:

- Triage stages and customisation: `references/triage-stages.md` (relative to this file)
- Working example workflow: `references/triage-example.md` (relative to this file)

---

## When to activate this skill

Activate when the user:

- Wants to triage or investigate recent Monte Carlo alerts (interactively or automated)
- Wants to set up automated triage for Monte Carlo alerts
- Asks to run agentic triage or investigate recent alert activity
- Wants to understand what triage tools are available and how to use them
- Is building or refining a triage prompt for their environment
- Wants to move from manual alert review to automated or semi-automated triage

## When NOT to activate this skill

Do not activate when the user is:

- Investigating a specific known incident (help them directly)
- Creating or configuring monitors (use the monitoring-advisor skill)
- Running impact analysis before a code change (use the prevent skill)

---

## Available MCP tools

All tools are available via the `monte-carlo-mcp` MCP server.

| Tool                             | Toolset  | Purpose                                                         |
| -------------------------------- | -------- | --------------------------------------------------------------- |
| `get_alerts`                          | default  | Fetch recent alerts for a time window                                                                             |
| `alert_assessment`                    | default  | Score an alert by incident likelihood and potential impact (HIGH/MEDIUM/LOW each)                                 |
| `run_troubleshooting_agent`           | default  | Run the Monte Carlo Troubleshooting Agent on a single alert; async by default — returns immediately, reuses existing results when available |
| `get_troubleshooting_agent_results`   | default  | Poll an async troubleshooting run by `incident_id`; returns status (`not_found`/`running`/`success`/`failed`) and results when complete |
| `update_alert`                        | default  | Update an alert's status and/or declare an incident by setting severity                                           |
| `set_alert_owner`                     | default  | Assign an owner to an alert by email                                                                              |
| `create_or_update_alert_comment`      | default  | Post or update a triage comment on an alert                                                                       |
| `mark_event_as_normal`                | default  | Mark all anomaly events in an alert as normal, triggering ML threshold recalibration to prevent re-alerting on the same pattern |

---

## How to approach automated triage

Read `references/triage-stages.md` for a full description of each stage and how to customise it. The high-level flow is:

1. **Fetch alerts** — decide which alerts to triage and over what time window
2. **Initial investigation** — score every alert by incident likelihood and potential impact using `alert_assessment`
3. **Deep troubleshooting** — run `run_troubleshooting_agent` on high-signal alerts to get root cause analysis
4. **Classify** — use the troubleshooting output to classify each alert
5. **Take actions** — post comments, update statuses, message Slack, create tickets

The triage process is not fixed. Read the stages reference to understand the options and tradeoffs at each step, then design a workflow that fits your team's needs.

## The longer-term direction

Most teams move through roughly the same arc, though the pace and path vary:

- **Start with recommendations.** Run manually and have the agent post comments describing what it found and what it would do — no actual status changes or external actions. Use this to tune the workflow until the output matches how your team would respond manually.
- **Automate, still in recommendation mode.** Once the output looks right, put it on a schedule. Keep it in recommendation mode while you validate it's behaving well on real traffic.
- **Replace recommendations with actions.** When you're confident, swap the comment recommendations for real actions — status updates, Slack messages, ticket creation.

Don't force this progression — it's a direction, not a checklist. The path will depend on how your environment behaves and how much trust you want to build before each step.

---

## Activation flow

When this skill is activated, follow this sequence in order.

### Step 1: Check MCP tools

Verify that `get_alerts`, `alert_assessment`, and `run_troubleshooting_agent` are accessible. If any are missing, check that the Monte Carlo MCP server is configured and authenticated, then stop.

### Step 2: Determine intent

Ask:

> "Are you looking to **triage some alerts right now** (I'll investigate them with you using the triage tools), or **set up / refine an automated triage workflow** (I'll help you design a process that can run on a schedule)?"

If the user's request already makes the intent clear — e.g. "triage my freshness alerts from today" vs. "help me build a triage workflow" — skip the question and proceed directly.

---

#### Branch A: Interactive triage

The user wants to look at specific alerts now. Use the triage tools directly to investigate and report findings. Do not frame this as workflow-building.

1. Clarify the scope (Ask about the time window and whether the user is interested in a specific domain, audience or alert type).
2. Fetch alerts with `get_alerts` (applying any domain or audience filter from step 1), run `alert_assessment` in parallel on all of them, and report the results clearly.
3. For any alert where both incident likelihood and potential impact are MEDIUM or higher, offer to run `run_troubleshooting_agent` for a deeper root cause analysis. Wait for confirmation before running it.
4. Summarise findings. Do not prompt to save a workflow file or set up automation unless the user brings it up.

**Write tools in interactive triage:** After findings are clear, proactively offer relevant actions — updating status, declaring a severity, assigning an owner, posting a comment, or marking events as normal (for alerts that are natural data variation). Ask before executing.

---

#### Branch B: Automated workflow

The user wants to build, test, or refine a triage workflow that can run on a schedule.

Ask how they'd like to get started:

> "How would you like to approach this?
> - **Use the built-in example** — start from a working triage workflow ready to run as-is and adapt it as you go.
> - **Adapt an existing workflow** — point me to a file you already have and we'll review and run it.
> - **Build from scratch** — describe what you want your triage to do and I'll help design a workflow tailored to it."

**Using the built-in example:**

1. Read `references/triage-example.md` (relative to this skill file). Give a brief description: it fetches alerts from the last 3 hours, scores every alert, runs deep troubleshooting on high-signal ones, and shows what actions it would take — no writes on a first run.
2. Run in recommendation mode, step by step (see Step 3). No need to ask.

**Adapting an existing file:**

1. Read the file and confirm the key settings: time window, filter threshold, and whether it includes a mode-selection step.
2. Summarise what it will do, then ask: **"Run straight through, or step through each stage one at a time? And recommendation or action mode?"**

**Building from scratch:**

1. Ask the user to describe what they want: which alerts to triage, what actions they want to take, how much they want to automate, and any constraints (e.g. specific domains, teams, or tables).
2. Draw on `references/triage-stages.md` to propose a workflow structure that fits their goals. Present it for review — not as a finished document, but as a proposed approach — and iterate until they're happy.
3. Run it step by step in recommendation mode (see Step 3) so they can validate each stage before committing to the design. Expect to refine as you go.

### Step 3: Run the workflow (Branch B only)

Execute the workflow from the file, following its instructions exactly. Do not improvise steps or add actions not described in the file.

**Action guard — workflow mode:** Never call write tools (`update_alert`, `set_alert_owner`, `create_or_update_alert_comment`) while building or testing a workflow, regardless of what the workflow document says. Only describe what would be done. This guard exists to prevent accidental writes on real alerts during development; lift it only when the user explicitly switches to action mode for a production run.

**For first runs (starting fresh):** always run step by step — after each stage completes, summarise what it produced, proactively suggest alternatives or adjustments based on what you observed, and wait for confirmation before continuing.

At each stage, draw on the options in `references/triage-stages.md` to make concrete suggestions:

- **After fetching alerts** — suggest filter adjustments if the set looks too broad or narrow: `NOT_ACKNOWLEDGED` to skip already-triaged alerts, domain/audience filters if alerts span multiple teams, a slightly longer time window for the initial testing if we need more examples to work with.
- **After scoring** — Suggest whether to adjust the troubleshooting filter (e.g. run when either score is HIGH, not just both MEDIUM+) or tune `alert_assessment` via `user_instructions`.
- **After troubleshooting** — if the TSA found a clear root cause, suggest whether to declare an incident severity, assign an owner.
- **After actions** — note cases where the default action mapping may not fit, e.g. a verified incident that warrants a Slack message or ticket rather than just a status update.

**For existing-file runs:** use whichever mode the user chose in Step 2.

### Step 4: Wrap up

After the workflow completes:

1. Ask: **"Want me to save a copy of our workflow to your project (e.g. `triage.md`) so you can customise it?"** If yes, write it to the path they choose.

2. Then present next steps based on what just happened and what you were asked to do in the first place.  For example:

   > "What would you like to do next?
   > - **Refine the workflow** — walk through the stages and tune what's not working (filter, scoring weights, troubleshooting threshold, action mapping)
   > - **Test on a different alert set** — re-run on a different time window or day to see how it handles a different set of alerts
   > - **Set up a schedule** — automate this to run on a fixed cadence using the `/schedule` skill
   > - **Something else** — just tell me"

   Adapt the options to context — if the run had many LOW-scoring alerts with no troubleshooting, lean towards refinement; if results looked solid, lean towards scheduling.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
