> Catalog review modification (2026-10-23): bounded async work and truthful write reporting; original attribution/license retained.

# Triage Example Workflow

This is a complete triage workflow that supports two modes:

- **Recommendation mode** — runs the full investigation and tells you what it would do, without writing anything to your environment. Use this while tuning your triage prompt.
- **Action mode** — runs the full workflow and applies actions (comments, status updates) for real.

Run in recommendation mode first. Once the classifications and recommendations match how your team would respond manually, switch to action mode.

---

## What this workflow does

1. Asks whether to run in recommendation or action mode
2. Fetches all alerts from the last 3 hours
3. Scores every alert by incident likelihood and potential impact (in parallel)
4. Fires deep troubleshooting on all high-signal alerts simultaneously, classifying each as results arrive
5. In **action mode**: posts a triage comment on every alert and updates statuses
   In **recommendation mode**: outputs what it would comment and what status it would set — no writes

---

## Procedure

### Step 1: Choose mode

Ask: "Run in **recommendation mode** (no writes — I'll show you what actions would be taken) or **action mode** (comments and status updates applied for real)?"

Also ask: "Run all stages **straight through**, or **step by step** — pausing after each stage to show results before continuing?"

Wait for both answers before proceeding. In step-by-step mode, after each stage completes, summarise what it produced, proactively suggest alternatives or adjustments based on what you observed, and wait for confirmation before moving to the next.

### Step 2: Fetch alerts

Call `get_alerts` for the last 3 hours.

If no alerts are returned, report: "No alerts in the last 3 hours." and stop.

### Step 3: Score each alert

Call `alert_assessment` in parallel for every alert from step 2, in batches of up to 10 at a time. Each result includes `incident_likelihood`, `alert_impact` (HIGH/MEDIUM/LOW each), `alert_description` (plain-language description of what happened in the incident), and `triage_summary` (the key reasoning behind the incident likelihood and potential impact scores). Use `alert_description` and `triage_summary` to inform the triage comment in step 4 for alerts that don't go through troubleshooting.

### Step 4: Troubleshoot and classify high-signal alerts

For each alert where BOTH `incident_likelihood` AND `alert_impact` are MEDIUM or HIGH, call `run_troubleshooting_agent` (default `async_mode=True`). Use a bounded, approved concurrency for eligible alerts — each call returns immediately with one of: `success` (previous results available immediately), `queued` (accepted, not started yet), or `running` (in progress).

Skip any alert where either value is LOW — troubleshooting is expensive and not warranted for low-signal alerts.

For each job that returned `queued` or `running`, poll with `get_troubleshooting_agent_results(incident_id=...)` — start at ~30 seconds, then increase to 60s intervals. Classify each alert as its result arrives (`success`), before moving on. If a job returns `failed`, note it and continue.

**Classifications:**

| Classification                | When to use                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Intentional change**        | Planned migrations, feature releases, or bug fixes                                                                    |
| **Natural data variation**    | Seasonal patterns or expected volatility                                                                              |
| **Possible data incident**    | Anything that requires further investigation                                                                          |
| **Resolved incident**         | A real incident that has already been resolved                                                                        |
| **Verified ongoing incident** | A clear incident that has not resolved, where troubleshooting identified the root cause (e.g. query change or infrastructure failure) |
| **Other**                     | Does not fit the above                                                                                                |

Alerts that did not go through troubleshooting are left unclassified.

### Step 5: Comments and status updates

**Action mode:**

Call `create_or_update_alert_comment` for each alert:
- **Untroubleshot alerts**: one sentence describing the anomaly and the incident likelihood/potential impact scores. Do not explain why it wasn't troubleshot. No recommendations.
- **Troubleshot alerts**: 2–4 sentences covering classification, reasoning from the troubleshooting output, any action taken, and a recommendation.

Then call `update_alert` for each classified alert:

| Classification              | Status               |
| --------------------------- | -------------------- |
| Natural data variation      | `NO_ACTION_NEEDED`   |
| Intentional change          | `EXPECTED`           |
| Resolved incident           | `FIXED`              |
| Verified ongoing incident   | `ACKNOWLEDGED`       |
| Possible data incident      | *(no change)*        |
| Other                       | *(no change)*        |

For alerts classified as **natural data variation**, also call `mark_event_as_normal` — this signals the ML threshold detector to recalibrate and avoid re-alerting on the same pattern. Only has an effect on monitors using automated (ML-based) thresholds.

Do not update status for untroubleshot alerts.

**Recommendation mode:**

Do not call any write tools. Instead, for each alert output:
- The comment you would post
- The status you would set (or "no change")
- Whether you would call `mark_event_as_normal`

---

## Output

After completing all steps, produce a summary table:

| Alert ID | Type | Incident Likelihood | Potential Impact | Classification | Action Taken |
|----------|------|---------------------|------------------|----------------|--------------|

Include every alert from step 1. For untroubleshot alerts, leave Classification blank and set Action Taken to "Comment only" only after a successful authorized write; in recommendation mode use "No write — recommendation".

---

## Adapting this example

Common adjustments:

- **Change the time window** in step 2 (e.g. last 1 hour for a continuous loop, last 24 hours for a daily run)
- **Adjust the troubleshooting filter** in step 4
- **Add Slack or ticket creation** in step 5 for confirmed incidents
- **Customise `alert_assessment` scoring** via `user_instructions` to tune emphasis for your environment (see `triage-stages.md`)
- **Run step-by-step when tuning** — a useful pattern is to run the full workflow straight through first to see end-to-end behaviour, then re-run in step-by-step mode to inspect each stage's output and make decisions before proceeding
