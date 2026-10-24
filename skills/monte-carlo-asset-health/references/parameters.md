<!-- Locally modified 2026-10-23: timestamp semantics clarified. -->
# MCP Parameter Notes

Parameter details for the MCP tools used by the asset-health skill. Only covers
the tools relevant to this skill's workflows.

---

## `get_alerts` — use snake_case parameters

```
created_after
created_before
order_by
table_mcons
statuses
```

Always provide `created_after` and `created_before`. Max window is 60 days.
Pass ISO 8601 timestamps computed from the current date — e.g. for a 7-day
window ending now: `created_after="2026-07-03T00:00:00Z"`,
`created_before="2026-07-10T00:00:00Z"` (use the actual current date).

When requesting active alerts, pass these three statuses:

```
statuses: ["NOT_ACKNOWLEDGED", "ACKNOWLEDGED", "WORK_IN_PROGRESS"]
```

Response field mapping for the alert table:
- **Date** → `createdTime`
- **Type** → `alert_types` (array, e.g., "Volume", "Metric anomaly", "Freshness")
- **Priority** → `priority` (e.g., "P1", "P2", "P3")
- **Status** → `status` (e.g., "Not acknowledged", "Acknowledged", "Work in progress")
- **Link** → construct as `<MC_WEBAPP_URL>/alerts/<uuid>` where `MC_WEBAPP_URL`
  comes from `get_mc_webapp_url()` (called in Phase 1). Display as bare URL.

---

## `search` — finding the right table identifier

MC uses MCONs (Monte Carlo Object Names) as table identifiers. Always use
`search` first to resolve a table name to its MCON before calling `get_table`,
`get_asset_lineage`, or `get_alerts`.

```
search(query="orders_status") → returns mcon, full_table_id, warehouse, properties
```

The `properties` field contains tags (key-value pairs) associated with the asset.

---

## `get_table` — table metadata and stats

Pass the MCON as: `mcon="<mcon>"` (single string, not an array).

Key response fields used by this skill:
- Inspect the live schema: `last_activity` and `last_updated_on` have different meanings. Display the actual returned field and label; do not substitute one for the other or infer freshness without an expected update schedule.
- `importance_score` — float 0-1 (for Importance in header)
- `is_important` — boolean, true if key asset (for ⭐️ indicator)
- `table_stats.avg_reads_per_active_day` — average reads per active day
- `table_stats.avg_writes_per_active_day` — average writes per active day

---

## `get_monitors` — checking if monitors are paused

When filtering by table, pass MCONs via the `mcons` parameter (not `table_mcons`).
Check the `is_paused` field (boolean) on each monitor. Only count monitors where
`is_paused` is false as active coverage.

Response field mapping for the monitors table:
- **Type** → `monitor_type` (e.g., "TABLE", "METRIC", "BULK_METRIC")
- **Name** → `name` or `description`
- **Incidents (7d)** → `seven_days_incident_count`
- **Status** → derive from: `is_paused`, `next_execution_time`, `prev_execution_time`,
  `seven_days_error_count`, `seven_days_timeout_count`
  - If `is_paused` is true → "Paused"
  - If `prev_execution_time` is null → "Never executed"
  - If `seven_days_error_count` > 0 → "⚠️ N errors"
  - Otherwise → "Running" (include schedule info from `next_execution_time` if available)

---

## `get_mc_webapp_url` — get Monte Carlo base URL

Takes no arguments. Returns the regionalized base URL of the Monte Carlo web app
(e.g., `https://getmontecarlo.com` — the actual value depends on the customer's
environment). Call once in Phase 1 and store the result. Use it to construct all
Monte Carlo links — never hardcode the base URL:
- Assets/tables: `{result}/assets/{mcon}`
- Alerts: `{result}/alerts/{alert_uuid}`

---

## `get_asset_lineage` — direction and edge interpretation

Pass `direction` as `"UPSTREAM"` or `"DOWNSTREAM"` (uppercase).
Pass `mcons` as an array even for a single asset: `mcons=["<mcon>"]`.

Returns paginated edges (default 100 per page) where `source` and `target` are
MCONs representing data flow direction: `source` feeds data into `target`.

If `has_more` is true in the response, follow pagination using `next_offset` to
get remaining edges. For upstream health checks, all parents must be discovered
before Phase 3 can run — do not skip pages.

For an **UPSTREAM** query on asset X:
- Edges have `source = <upstream_parent>`, `target = X` (or intermediate nodes)
- Extract unique MCONs from the `source` field to get the upstream parents
- Exclude the queried asset's own MCON from the parent list
