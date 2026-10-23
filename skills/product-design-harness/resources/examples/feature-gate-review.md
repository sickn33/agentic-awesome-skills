# Example: Feature Gate Review

## Product Brief

| Field | Answer |
|---|---|
| Product direction | Add automated weekly report export for team managers. |
| Stage | Prototype |
| Claimed user | Team manager. |
| Current evidence | Support team reports that managers ask for weekly summaries. No behavior data yet. |
| Proposed next step | Build the export feature. |

## User Flow Review

| Field | Answer |
|---|---|
| Verdict | Verify |
| Strongest user signal | Support reports mention repeated requests for weekly summaries. |
| Weakest user assumption | Managers need export, not just better in-product visibility. |
| Affected people | Team members whose activity may appear in the report. |
| Excluded groups | Managers who do not use spreadsheet workflows. |
| Disconfirming evidence | Managers only need occasional screenshots or dashboards; exports are for one large account only. |
| Stop condition | Stop if the request is not repeated across accounts or if reports expose sensitive data without review. |
| Next smallest action | Interview five managers using their current weekly reporting workflow. |

## Evidence Flow Review

| Field | Answer |
|---|---|
| Verdict | Verify |
| Evidence tier | t2 |
| Strongest evidence | Support requests are real, but not yet tied to frequency or value. |
| Weakest evidence assumption | Support volume represents broad demand. |
| Missing measurement | Number of accounts requesting reports, current workaround time, weekly recurrence. |
| Failure criteria | Fewer than 3 of 5 managers currently create weekly reports manually. |
| Trace requirement | Record source account, current workaround, time cost, and requested format. |
| Next smallest action | Count requests and observe one current manual reporting workflow. |

## Business Flow Review

| Field | Answer |
|---|---|
| Verdict | Verify |
| Strongest business signal | Reporting may improve account retention for manager-heavy teams. |
| Weakest business assumption | Export feature creates retention rather than support burden. |
| Cost risks | Permission rules, data privacy, support for formats, scheduled delivery, data correctness. |
| Retention logic | Managers may return weekly if reports become part of team rituals. |
| Defensibility | Weak unless report templates reflect domain-specific management insight. |
| Disconfirming evidence | Users export once, then churn; exports create compliance concerns; dashboard improvements solve the issue. |
| Next smallest action | Test one static report sample before building scheduled export. |

## Council Decision

| Field | Answer |
|---|---|
| Combined verdict | Verify |
| Weakest flow | Evidence |
| Main conflict | Support requests suggest need, but the requested solution may be wrong. |
| Human-owned decision | Risk |
| Trade-off | Delay automation to protect data correctness and learn the actual reporting job. |
| Execution boundary | Do not build scheduled export yet. Create a static report mock and test workflow fit. |
| Next smallest action | Run five workflow interviews and one static report test. |

This is a `verify` result. The allowed work is the proof step, not a context
pack or implementation handoff.

## Handoff Boundary

Execution may create:

- one static report sample
- interview guide
- evidence table

Execution must not create:

- scheduled export
- live customer data access
- permission model changes
- external delivery

## Stop Conditions

- Report need is not repeated across accounts.
- Users cannot name a weekly decision the report supports.
- Data sensitivity requires permissions not yet designed.
- Dashboard changes solve the problem with less cost.
