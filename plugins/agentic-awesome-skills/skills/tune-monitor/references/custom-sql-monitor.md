# Tuning Custom SQL Monitors

> Modified during local review: detection-signal, evidence and apply-verification constraints clarified; upstream attribution retained.

This reference covers type-specific tuning guidance for custom SQL monitors (custom rules).
Read this file after determining the monitor type in Phase 1.5.

## Config fields to extract

Extract these from the `get_monitors` config response for your Phase 2 analysis:

- SQL query text (`sql` or `custom_sql`)
- Alert conditions — each has an `operator` and either a `threshold_value` (explicit) or ML
  threshold configuration
- Warehouse name
- Schedule interval

**IMPORTANT:** Determine whether the monitor uses **ML thresholds** or **explicit thresholds**.
This affects which tuning levers are available. ML-threshold monitors support sensitivity tuning
(covered in Phase 3 of SKILL.md). Explicit-threshold monitors require direct threshold adjustment
(covered below).

---

## Threshold adjustment (explicit thresholds)

For monitors with explicit thresholds (`GT`, `LT`, `GTE`, `LTE`, `EQ`, `NE`):

**When to recommend loosening a threshold:**
- Anomalies are consistently marginal — the observed value just barely crosses the threshold
- The margin between observed and threshold is small relative to the metric's natural variance
- Most alerts are assessed as normal variation, not genuine issues

**CRITICAL:** Always explain what the threshold value represents in business terms before
recommending a change. The user needs to understand what "changing GT 0 to GT 5" means for their
data quality.

**Common pattern:** If the query returns a count of "bad" rows and the threshold is 0, but normal
operations produce 1-3 rows that match the condition (e.g., stale records, delayed updates),
recommend raising the threshold to a reasonable floor based on observed values.

**Examples:**
```yaml
# Before: fires on any bad row
alert_conditions:
  - operator: GT
    threshold_value: 0

# After: tolerates up to 5 (based on observed noise floor of 1-3)
alert_conditions:
  - operator: GT
    threshold_value: 5
```

**NEVER** recommend a threshold change without citing the observed anomaly values from the report.

---

## SQL query modifications

When the SQL itself contributes to noise, recommend targeted modifications:

**When to recommend SQL changes:**
- The query lacks time-window filters and picks up stale data
- Certain dimensions or categories are known-noisy and should be excluded
- NULL handling is missing and causes spurious results
- The query could benefit from a more targeted WHERE clause

Validate time zones, timestamp/date casts, NULL behavior and late-arrival windows against the warehouse and business definition. A narrower WHERE condition can hide genuine historical defects.

**NEVER** rewrite the full SQL without showing a diff. Present the original query and the proposed
change side by side so the user can review exactly what changed.

**IMPORTANT:** SQL syntax varies by warehouse. When suggesting modifications, match the warehouse
dialect:

| Warehouse | Date arithmetic example |
|-----------|------------------------|
| Snowflake | `DATEADD('day', -7, CURRENT_TIMESTAMP())` |
| BigQuery | `TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)` |
| Redshift | `DATEADD(day, -7, GETDATE())` |
| Databricks | `DATE_SUB(CURRENT_TIMESTAMP(), 7)` |

---

## Applying changes

Use `create_or_update_sql_monitor` to update the monitor in place.

1. **Always pass `monitor_uuid=<uuid>`** so the tool updates the existing monitor rather than
   creating a new one. Use the monitor UUID from Phase 1.
2. **Always dry-run first** (`dry_run=True`, the default) — show the user the YAML preview
   returned in `result.yaml` and ask for confirmation before applying.
3. **On confirmation**, call again with `dry_run=False` (and the same `monitor_uuid` plus the
   same other parameters). The response carries the monitor's UUID in `result.monitor_uuid` and
   a deep link in `result.instructions` — surface that to the user. `result.yaml` is `None` on
   the live call by design.
4. **Stale-uuid handling.** If the monitor was deleted between read and write, the tool raises a
   clear error instructing you to retry without `monitor_uuid` (turning the intent from "update"
   into "create"). Confirm with the user before recreating.

### Common mistakes

- **NEVER** omit `monitor_uuid` — this creates a duplicate monitor instead of updating.
- **NEVER** apply changes without showing the dry-run preview first.
- **CRITICAL: PUT semantics.** `create_or_update_sql_monitor` with `monitor_uuid` fully replaces
  the monitor's configuration — fields you omit revert to tool defaults, they are NOT left
  untouched. The full config from Phase 1's `get_monitors(monitor_ids=[<uuid>],
  include_fields=["config"])` call is your source of truth: re-pass every field you want to
  keep (sql, all alert_conditions, schedule, warehouse, audiences, notes, priority, tags, etc.)
  alongside the ones you're changing.
- **Diff the preview against the original.** Before running `dry_run=False`, compare the
  rendered YAML returned in `result.yaml` against the original config — if anything you meant to
  preserve is missing or changed, fix the call before committing.
- **CRITICAL:** When modifying the SQL query, ensure the query still returns a single numeric
  value. A query that returns multiple rows or non-numeric data will break the monitor.
