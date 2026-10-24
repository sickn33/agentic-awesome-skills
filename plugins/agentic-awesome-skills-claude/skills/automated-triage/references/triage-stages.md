> Catalog review modification (2026-10-23): bounded async work and truthful write reporting; original attribution/license retained.

# Triage Stages

Each stage of a triage workflow is optional and customisable. Design your workflow around the stages that match how your team manually reviews alerts — automate the parts that are repetitive or time-consuming, and keep humans in the loop for the parts that need judgement.

---

## Stage 1: Fetching alerts

**Tool:** `get_alerts`

Collect the alerts you want to triage. `get_alerts` supports the following filters — combine them to define your triage scope:

**Status**
- `statuses` — filter by alert status. Pass `NOT_ACKNOWLEDGED` to only pick up alerts that haven't been triaged yet. Other values: `ACKNOWLEDGED`, `WORK_IN_PROGRESS`, `FIXED`, `EXPECTED`, `NO_ACTION_NEEDED`.

**Scope**
- `domain_ids` — limit to one or more Monte Carlo domains. Use `getDomains` to look up IDs. Useful if different teams own different parts of the data estate.
- `audience_ids`
- `owners`

**Alert Details**
- `alert_types` — filter by alert category.
- `priorities` — `P1` through `P5`.

**Asset**
- `table_mcons`, `table_names`, `table_schemas`, `table_databases` — narrow triage to specific tables or parts of the warehouse.

**Pagination**
- `first` — number of alerts per page (max 100, default 20). Check for a `truncation_note` in the response — if present, paginate using `cursor` to retrieve the remaining alerts.

Take care to avoid triaging too many alerts in one batch — where required, split alerts across multiple triage runs.

---

## Stage 2: Initial investigation (alert scoring)

**Tool:** `alert_assessment`

This stage replicates what a knowledgeable engineer does when scanning the alert feed — quickly assessing what's fired and how serious it looks. `alert_assessment` is lightweight enough to run on every alert.

It returns:
- **`incident_likelihood`** (HIGH/MEDIUM/LOW) — how likely the alert represents a real issue. Affected by: number of events, presence of concerning root causes (query changes, failures), how much thresholds were exceeded, and how noisy the monitor typically is.
- **`alert_impact`** (HIGH/MEDIUM/LOW) — how significant the potential downstream impact is.  Use cases impacted.  Dashboards affected etc.
- **`alert_description`** — plain-language description of what happened in the incident.
- **`triage_summary`** — the key reasoning behind the incident likelihood and potential impact scores.

**Run `alert_assessment` in parallel**, in batches of up to 10 at a time.

### Customising the scoring

`alert_assessment` runs with a default prompt but accepts a `user_instructions` parameter that lets you adjust the emphasis it places on different factors. For example:

- Increase the weight given to monitors that feed particular use cases
- Alter the emphasis placed on different features: for example historical noise
- Emphasise alerts involving specific tables or domains

Start with the defaults and tune `user_instructions` once you've seen real output.

### Scoring vs. persisting: `alert_assessment` vs `triage_alert`

`alert_assessment` is **read-only** — it returns a verdict but records nothing. That's exactly what you want for this stage: score every alert cheaply, then decide per alert whether it warrants troubleshooting and which action to take. The workflow persists outcomes later, in Stage 5, through the explicit action tools — so you stay in control of what gets written and when.

`triage_alert` is the **persisted** counterpart: it scores *and* writes the verdict back onto the alert (marks it triaged, posts a notification, records ML feedback), identical to the in-app Triage button. It's the right tool for interactive "triage this alert" requests where the user wants the result recorded, but it's a poor fit for the scoring stage of a batch workflow — it would mark every alert in the batch triaged and fire a notification for each. Keep batch scoring on `alert_assessment`, and reserve `triage_alert` for the case where recording a single alert's triage *is* the action. It's idempotent (re-running on an already-triaged alert returns the existing verdict) and requires the `mcp/edit` scope.

---

## Stage 3: Deep troubleshooting

**Tools:** `run_troubleshooting_agent`, `get_troubleshooting_agent_results`

`run_troubleshooting_agent` runs the Monte Carlo Troubleshooting Agent on a single alert. This is substantially more expensive than `alert_assessment` — it tracks the issue upstream through lineage, analyses all queries involved, examines relevant PRs, and samples affected tables to identify root cause.

**Only run `run_troubleshooting_agent` on alerts that warrant it.** A common filter: run troubleshooting only when BOTH `incident_likelihood` AND `alert_impact` are MEDIUM or HIGH. Skip any alert where either is LOW.

You can adjust this threshold based on your environment — for example, also running troubleshooting when either score is HIGH (even if the other is LOW), while still requiring MEDIUM/MEDIUM as the baseline.

**Use async mode for parallelism.** `run_troubleshooting_agent` defaults to `async_mode=True`, returning immediately with one of three statuses:
- `success` — a previous analysis already completed; results are available immediately, no polling needed
- `queued` — the job was accepted but hasn't started yet; wait ~30 seconds then start polling
- `running` — the job is in progress; poll with increasing intervals (30s, 60s, 60s…)

Use a bounded, approved concurrency for eligible alerts, then poll each with `get_troubleshooting_agent_results(incident_id=...)` until it returns `success` or `failed`. Classify each alert as its result arrives. Async calls still require concurrency and spend limits, bounded polling and cancellation/timeout handling.

---

## Stage 4: Classification

Classify each alert immediately after its troubleshooting result arrives. Use the troubleshooting output to determine which category fits best.

| Classification              | Description                                                                                                                    |
| --------------------------- |--------------------------------------------------------------------------------------------------------------------------------|
| **Intentional change**      | Planned migrations, feature releases, or bug fixes                                                                             |
| **Natural data variation**  | Seasonal patterns or expected volatility                                                                                       |
| **Possible data incident**  | Anything that requires further investigation                                                                                   |
| **Resolved incident**       | A real incident that has already been resolved                                                                                 |
| **Verified ongoing incident** | A clear incident that has not resolved, where troubleshooting identified the root cause (e.g. query change or infrastructure failure) |
| **Other**                   | Does not fit the above                                                                                                         |

These categories are a starting point. Adapt them to the language your team uses — if you have an internal classification scheme, map to that instead.

---

## Stage 5: Taking actions

What you do after triage depends on your integrations, your team's workflow, and the maturity of your automation process. Start conservative and expand as you validate results.

### Adding comments

`create_or_update_alert_comment` — always a good starting point. Comments provide a record of what the agent found and recommended, as an externally visible write that may notify people. Useful at every stage, regardless of whether you automate anything else.

Suggested comment content:
- **Scored but not troubleshot**: one sentence describing the anomaly and the incident likelihood/potential impact scores. Do not explain why it wasn't troubleshot. No recommendations.
- **Troubleshot alerts**: 2–4 sentences — classification, reasoning, action taken or recommended

### Updating alert status

`update_alert` — set status based on classification:

| Classification              | Status               |
| --------------------------- | -------------------- |
| Natural data variation      | `NO_ACTION_NEEDED`   |
| Intentional change          | `EXPECTED`           |
| Resolved incident           | `FIXED`              |
| Verified ongoing incident   | `ACKNOWLEDGED`       |
| Possible data incident      | *(leave unchanged)*  |
| Other                       | *(leave unchanged)*  |

Only update status for alerts that went through full troubleshooting. Leave untroubleshot alerts unchanged.

### Additional Monte Carlo actions

- **Mark events as normal** — for alerts classified as natural variation, marking the underlying events as normal allows the detector to adapt thresholds to prevent further alerts on similar patterns. Only applies to monitors using automated (ML-based) thresholds — has no effect on static-threshold monitors.
- **Declare an incident** (`update_alert` with `declared_incident_severity`) — promotes the alert to an incident, escalating visibility. Values: `SEV_1`–`SEV_4`. Use `NO_SEVERITY` to clear. Appropriate for verified ongoing incidents.
- **Assign ownership** (`set_alert_owner`) — route a confirmed incident or required investigation to the right person.

### External integrations

- **Slack** — message a channel or individual with a triage summary or escalation
- **Linear / Jira / Teams** — create a ticket for confirmed incidents

Introduce these actions incrementally. Start with comments, validate, then enable status updates and additional actions.
