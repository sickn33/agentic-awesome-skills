# Tuning Metric Monitors

> Modified during local review: detection-signal, evidence and apply-verification constraints clarified; upstream attribution retained.

This reference covers type-specific tuning guidance for metric monitors. Read this file after
determining the monitor type in Phase 1.5.

## Config fields to extract

Extract these from the `get_monitors` config response for your Phase 2 analysis:

- Monitor metric (e.g., `RELATIVE_ROW_COUNT`, `NULL_RATE`, `NUMERIC_MEAN`)
- Segment field(s) (`segment_fields`)
- WHERE condition (`where_condition`)
- Aggregation bucket (`aggregate_by`: `hour`, `day`, `week`, `month`)
- Aggregation time field (`aggregate_time_field`)
- Collection lag (`collection_lag_minutes`)

---

## Threshold adjustment (explicit thresholds)

For metric monitors using explicit thresholds (`GT`, `LT`, `GTE`, `LTE`, `EQ`, `NE`) instead of
`AUTO`:

- If anomalies are consistently marginal — the observed value just barely crosses the threshold —
  recommend loosening the threshold based on observed values from the report.
- **CRITICAL:** Always explain what the threshold value represents in the context of the metric
  before recommending a change. For example, "NULL_RATE GT 0.05 means alert when more than 5% of
  values are null."
- **NEVER** recommend a threshold change without citing observed anomaly values from the report.

---

## WHERE condition / segment exclusion

**When to recommend a WHERE condition:**
- One or more specific segment values fire repeatedly and are assessed as expected behavior
  (e.g., a sparse/bursty event type, a scheduled batch event)
- The noisy segments are identifiable from the incident history

**Syntax examples:**
```yaml
where_condition: "(event_type IS NULL OR event_type NOT IN ('inactive_monitor', 'agent_evaluation_anom'))"
```
```yaml
where_condition: "(status IS NULL OR status <> 'test')"
```

**IMPORTANT:** Always verify the column name and values exist in the table before recommending a
WHERE condition. Reference specific segment values from the monitor report.

**High-cardinality segments:**
- If the segment field has very high cardinality with many sparse values → recommend
  `"high_segment_count": true` or consider removing segmentation entirely
- **NEVER** recommend removing segmentation without explaining what signal would be lost

---

## Aggregation bucket changes

If the monitor aggregates by `hour` and anomalies are caused by sparse or bursty segments
(e.g., event types that fire only at certain hours), switching to `"aggregate_by": "day"` can
dramatically reduce false positives. The daily bucket smooths out intra-day spikes that are
normal over a 24-hour window.

**When to recommend:**
- Anomaly values are marginal at the hour level but would be within range at the daily level
- The segment naturally has low and variable hourly counts

**Trade-off:** You lose hourly granularity and may detect issues later. Always state this.

**CRITICAL:** Do not recommend changing `aggregate_by` without also checking whether the
`interval_minutes` needs to align. Check the installed schema and collection-window semantics; aggregation bucket and execution cadence are distinct and this reference establishes no universal minimum cadence.

---

## Monitor restructure

Recommend splitting into separate monitors when:
- Different segment values have fundamentally different expected behaviors (e.g., one segment
  is bursty by design, another should be steady)
- No single `where_condition` can cleanly separate noisy segments from signal-carrying ones

Recommend reviewing whether the metric and field combination is the right approach when:
- The monitor consistently fires on patterns that are inherent to the data shape
- A different metric would better capture the actual data quality concern

---

## Applying changes

Use `create_or_update_metric_monitor` to update the monitor in place.

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
- **CRITICAL: PUT semantics.** `create_or_update_metric_monitor` with `monitor_uuid` fully
  replaces the monitor's configuration — fields you omit revert to tool defaults, they are NOT
  left untouched. The full config from Phase 1's `get_monitors(monitor_ids=[<uuid>],
  include_fields=["config"])` call is your source of truth: re-pass every field you want to
  keep (schedule, audiences, segment_fields, where_condition, sensitivity, collection lag in the installed schema's exact units,
  notes, priority, tags, etc.) alongside the ones you're changing.
- **Diff the preview against the original.** Before running `dry_run=False`, compare the
  rendered YAML returned in `result.yaml` against the original config — if anything you meant to
  preserve is missing or changed, fix the call before committing.
