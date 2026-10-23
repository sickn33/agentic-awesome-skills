<!-- Locally modified 2026-10-23: missing-data and bounded-coverage semantics corrected. -->
# Workflow Details

Detailed step-by-step instructions for the Monte Carlo Asset Health skill.
Referenced from the main SKILL.md — consult when executing the workflow.

---

## Asset Health Check

When the user asks about the health or status of a data asset, run this sequence.

### Phase 1 — Resolve the asset

Run both calls in parallel:

```
search(query="<table_name>")
→ Returns MCON, full_table_id, and properties (tags)

get_mc_webapp_url()
→ Returns the base Monte Carlo webapp URL (MC_WEBAPP_URL)
```

Save the webapp URL for constructing alert links later.

Save the MCON for subsequent calls. Save properties for the Tags line in the
report. If multiple results are returned, present them in a table with these
exact columns and ask which one they want to check. Do not pick one automatically
or make assumptions.

```
| # | Table (full_table_id) | Warehouse | Importance | Key Asset |
|---|----------------------|-----------|------------|-----------|
| 1 | db:schema.table      | my-wh     | 0.99       | Yes       |
```

Every row must include the Warehouse column.

### Phase 2 — Gather health metrics (ALL in parallel)

Run all 4 calls in a single turn:

```
get_table(mcon="<mcon>")
→ last updated, row count, importance score, is_important (key asset flag)

get_alerts(created_after="<7 days ago>", created_before="<now>", table_mcons=["<mcon>"], statuses=["NOT_ACKNOWLEDGED", "ACKNOWLEDGED", "WORK_IN_PROGRESS"])
→ active alerts on this asset

get_monitors(mcons=["<mcon>"])
→ monitor configs — check status field for paused vs active

get_asset_lineage(mcons=["<mcon>"], direction="UPSTREAM", hops=1)
→ 1-hop upstream parent assets
```

For the `get_alerts` time range, compute ISO 8601 timestamps from the current
date — e.g. `created_before` = now (`2026-07-10T00:00:00Z`) and `created_after`
= 7 days earlier (`2026-07-03T00:00:00Z`), using the actual current date.

### Phase 3 — Check upstream health (ALL parents in parallel)

Check at most **10** upstream parents. If there are more than 10, check the first
10 and note: "N more upstream parents not checked — ask to see more."

For each upstream parent, run both calls in parallel:

```
get_table(mcon="<parent_mcon>")
→ freshness, importance

get_alerts(created_after="<7 days ago>", created_before="<now>", table_mcons=["<parent_mcon>"], statuses=["NOT_ACKNOWLEDGED", "ACKNOWLEDGED", "WORK_IN_PROGRESS"])
→ active alerts on this parent
```

All parents are checked in parallel with each other. Each parent's `get_table` and
`get_alerts` are also parallel (no dependency between them).

### Phase 4 — Synthesize the health report

Assemble findings into the report format defined in SKILL.md:

1. **Tags** — from `search` properties. Show None only after a successful result confirms no tags; otherwise Unknown.
2. **Status** — determine from alerts and monitoring:
   - 🔴 if any alerts returned (the statuses filter already limits to active alerts)
   - 🟡 if no alerts but 0 active monitors on a high-importance asset
   - 🟢 only when required queries succeed, coverage is present and no observed issue exists
   - Unknown/Unmonitored for other cases; do not turn missing data into green
4. **Metrics table** — Last Activity (only if returned), alerts, monitoring, upstream; put importance and read/write averages in the header
5. **Active Alerts** — list each with type and status
6. **Upstream Issues** — list each checked parent with observed alerts/metadata and identify unchecked parents; no-alert results do not prove health
   - If any parent is unhealthy, ask: "Want me to check further upstream for **\<parent\>**?"
7. **Recommendations** — only facts derivable from data:
   - Upstream issues that may explain this asset's problems
   - Alerts needing attention

### Monitoring assessment

When evaluating monitors from `get_monitors`:

- Count only **active** (non-paused) monitors
- A paused monitor does NOT count as active coverage
- Report: "N active monitors" or "N monitors (M paused)"
- Signal: ≥1 active = 🟢, 0 active = 🔴

---

## Upstream Drill-Down

When the user requests deeper upstream investigation for a specific parent:

### Phase 1 — Get upstream of the specified parent

```
get_asset_lineage(mcons=["<parent_mcon>"], direction="UPSTREAM", hops=1)
→ 1-hop upstream of the parent (grandparents of the original asset)
```

### Phase 2 — Check grandparent health (ALL in parallel)

For each grandparent:

```
get_table(mcon="<grandparent_mcon>")
get_alerts(created_after="<7 days ago>", created_before="<now>", table_mcons=["<grandparent_mcon>"], statuses=["NOT_ACKNOWLEDGED", "ACKNOWLEDGED", "WORK_IN_PROGRESS"])
```

### Phase 3 — Report

Present findings for this hop. If any grandparent has issues, again ask:
"Want me to check further upstream for **\<grandparent\>**?"

Each drill-down is exactly 1 hop. Never auto-cascade. Always wait for user request.
