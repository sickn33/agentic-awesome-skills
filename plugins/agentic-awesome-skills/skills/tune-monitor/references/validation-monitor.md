# Tuning Validation Monitors

> Modified during local review: detection-signal, evidence and apply-verification constraints clarified; upstream attribution retained.

This reference covers type-specific tuning guidance for validation monitors. Read this file after
determining the monitor type in Phase 1.5.

## Config fields to extract

Extract these from the `get_monitors` config response for your Phase 2 analysis:

- Alert condition tree (`alert_condition`) — a FilterGroup with UNARY, BINARY, SQL, and/or
  nested GROUP nodes
- Table being validated
- Schedule interval
- Whether conditions use simple predicates or SQL expressions

---

## Key constraint: limited incident detail

Validation incidents only report **invalid row counts** — not what the rows contained. This
fundamentally limits what you can recommend without troubleshooting analysis (TSA).

**Without TSA:** You cannot determine _why_ rows are invalid or whether the alert condition
itself is too broad. Schedule changes may be considered with an explicit detection-latency trade-off; none is automatically safe. Seek approved read-only sample evidence or domain-owner validation before suppressing conditions.

**With TSA:** If troubleshooting analysis identifies specific values, patterns, or root causes
for the invalid rows, you can recommend alert condition modifications.

---

## Schedule tuning (evaluate detection coverage)

- If the monitor fires repeatedly for the same underlying issue (e.g., the same batch of invalid
  rows detected on every run) → increase the schedule interval to reduce duplicate alerts.
- If invalid rows appear only after specific ETL jobs → align the schedule to run after those
  jobs complete.

---

## Alert condition modifications (requires troubleshooting analysis)

**IMPORTANT:** Do NOT recommend alert condition changes unless TSA is present and identifies the
root cause of the invalid rows. Without knowing _what_ the invalid data looks like, condition
changes risk masking real issues.

The alert condition is a FilterGroup tree. When tuning:

### Add exclusions

Confirm whether this tree selects invalid rows or valid rows before editing: an added AND can invert intended coverage. SQL NULL comparisons use three-valued logic; preserve NULL coverage deliberately.

Add SQL conditions or additional predicates to exclude known-valid edge cases that trigger
false positives:

```jsonc
{
  "type": "GROUP",
  "operator": "AND",
  "conditions": [
    // ... existing conditions ...
    {
      "type": "SQL",
      "sql": "(category IS NULL OR category <> 'legacy_import')"
    }
  ]
}
```

### Tighten or loosen existing predicates

- If a BINARY condition threshold is too tight (e.g., `greater_than 0` but 1-3 invalid rows
  is normal) → loosen the threshold based on observed values from TSA.
- If a UNARY null check fires on a column that is legitimately nullable for certain record
  types → add an exclusion condition rather than removing the null check.

### Produce the full FilterGroup tree

When recommending changes, always output the **complete** `alert_condition` tree — not just the
modified node. The tool replaces the full condition, not individual nodes.

**NEVER** simplify or restructure the condition tree beyond the targeted change. Preserve the
existing structure and only modify what's needed.

---

## What NOT to recommend without TSA

- Removing conditions from the alert condition tree
- Changing predicate logic (e.g., `null` to `not_null`, `in_set` to different values)
- Adding new conditions based on speculation about what the invalid data might look like

If TSA is absent and the monitor is noisy, say so explicitly:

> This validation monitor is firing frequently, but without troubleshooting analysis I cannot
> determine what the invalid rows contain. I can assess scheduling trade-offs, but cannot classify the rows as harmless. To enable
> deeper tuning, run troubleshooting on recent incidents to identify the root cause.

---

## Applying changes

Use `create_or_update_validation_monitor` to update the monitor in place.

1. **Always pass `monitor_uuid=<uuid>`** so the tool updates the existing monitor rather than
   creating a new one. Use the monitor UUID from Phase 1.
2. **Always dry-run first** (`dry_run=True`, the default) — show the user the YAML preview
   returned in `result.yaml`, including the full updated `alert_condition` tree, and ask for
   confirmation before applying.
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
- **CRITICAL: PUT semantics.** `create_or_update_validation_monitor` with `monitor_uuid` fully
  replaces the monitor's configuration — fields you omit revert to tool defaults, they are NOT
  left untouched. The full config from Phase 1's `get_monitors(monitor_ids=[<uuid>],
  include_fields=["config"])` call is your source of truth: re-pass every field you want to
  keep (the full alert_condition tree, schedule, table, audiences, notes, priority, tags, etc.)
  alongside the ones you're changing.
- **Diff the preview against the original.** Before running `dry_run=False`, compare the
  rendered YAML returned in `result.yaml` against the original config — if anything you meant to
  preserve is missing or changed, fix the call before committing.
- **CRITICAL:** The `alert_condition` must be a dict (JSON object), never a JSON-encoded string.
- **IMPORTANT:** Always produce the full `alert_condition` tree, not just the changed node.
  The tool replaces the entire condition tree.
- **NEVER** recommend condition changes without TSA evidence — schedule changes are the only
  available lever to assess without row-level cause evidence; it still changes detection risk.
