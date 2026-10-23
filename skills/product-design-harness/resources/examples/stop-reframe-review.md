# Stop / Reframe Review Example

A standard gate review that ends in `stop_reframe`: the evidence lane finds
only untraceable founder impressions (tier `t0`), which forces the stop and
produces one better product question instead of any execution work.

Machine-checkable version: `stop-reframe-review.json` (validates against
`../schemas/review-result.schema.json` and `../scripts/check_review.py`).

Key mechanics on display:

| Mechanic | Where |
|---|---|
| Lane-level stop with a machine-readable reason | the evidence lane carries stop_reason_class core_evidence |
| Weakest flow decides; no averaging | two `verify` lanes cannot rescue a `t0` evidence lane |
| Tier gate | headline tier `t0` forces `stop_reframe` by contract |
| No execution scope on a stop | the boundary allows research actions only |
| The single output of a stop | one reframed question, not a plan and not a backlog |
