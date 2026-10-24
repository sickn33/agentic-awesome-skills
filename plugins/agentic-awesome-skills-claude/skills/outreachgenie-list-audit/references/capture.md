# Snapshot contract, version 1

The helper consumes captured results rather than authentication details. Preserve observed tool response data exactly; do not invent missing fields to make it pass. Save only the selected scope in a private local JSON file. The complete fictional example is `assets/fictional-snapshot.json`.

Snapshots must be valid UTF-8 JSON. Duplicate object keys, non-finite numbers and invalid Unicode are rejected rather than silently selecting or coercing ambiguous evidence.

Envelope:

```json
{
  "schema_version": 1,
  "source_kind": "mcp_snapshot",
  "captured_at": "2026-10-16T12:00:00Z",
  "workspace_id": "00000000-0000-4000-8000-000000000001",
  "flow_id": "00000000-0000-4000-8000-000000000002",
  "selected_list_ids": ["00000000-0000-4000-8000-000000000011"],
  "calls": [
    {"tool": "get_workspace_context", "arguments": {}, "result": {"workspace": {"id": "00000000-0000-4000-8000-000000000001"}}}
  ]
}
```

These UUIDs are fictional placeholders; the shortened example is not a complete runnable audit.

## Five captured read tools

| Tool | Arguments | Unwrapped result needed |
| --- | --- | --- |
| `get_workspace_context` | `{}` | `workspace.id` |
| `get_flow` | `{"flow_id":"…"}` | Matching `id`, `nodes`; preserve the remaining observed result |
| `list_flow_template_fields` | `{}` | `built_in_fields`, each with `key`; workspace `custom_fields` are contextual |
| `get_prospect_list` | `{"list_id":"…"}` | Matching `id`, `prospect_count`, `custom_field_metadata`, `active_campaign_count` |
| `list_prospects_in_list` | `{"list_id":"…","query":{"page":1,"page_size":100}}` | `items` and normalized `pagination` |

For product tools (`get_workspace_context`, `get_prospect_list`, `list_prospects_in_list`), take the payload from `structuredContent.result`. Legacy `get_flow` and `list_flow_template_fields` return their payload directly in `structuredContent`. Some hosts present the same JSON as text; parse the actual tool JSON, never prose or a guessed schema. `result` in this snapshot always means the already-unwrapped payload. Do not include error responses as successful calls.

Each selected list needs its own detail response and all intended pages in request order. Use unfiltered membership reads with a fixed page size from 1–100. Start at page 1 and follow `pagination.next_page` while `has_more` is true. Stop on errors, repeated/noncontiguous pages, contradictory totals, a workspace mismatch, or the package's input bound. Report the collection as partial when applicable.

Normalized pagination contains:

```json
{"total": 2, "page": 1, "page_size": 100, "has_more": false, "next_page": null, "previous_page": null}
```

Prospect `id` is required. Preserve captured `first_name`, `last_name`, `company`, `title`, `email`, `phone`, `linkedin_url` and `custom_fields` when supplied. Membership is established by the `list_id` used in that page request. `list_count` does not identify another list; do not invent other memberships.

An absent builtin property or absent/unsupported `custom_fields` container means **not captured or unsupported**, not a known blank. Within a captured custom-field dictionary, an absent referenced key is a known empty runtime value. A known `null`, `false` or zero renders empty under the current product rules. Non-scalar values are reported as unsupported by the helper.

## Collection bounds and interpretation

The helper accepts 5 MiB inputs, 20 selected lists, 1,000 captured calls, 1,000 total captured selected-list memberships (including duplicate rows), 200 nodes and 500 supported outbound text fields. It stops after 10,000 findings rather than producing an unbounded report. Partial pages may still be audited, but coverage is false. Duplicate prospects within one list count as a coverage issue; the same prospect appearing once in two selected lists is valid and checked for both memberships.

Do not silently remove duplicate rows, change totals, fill missing values or merge fields from another capture. The capture is not transactional: data may change between calls even when the numbers agree. `all_selected_memberships_captured` only describes internal coverage of the supplied snapshot. It cannot authenticate the file, prove live state or certify campaign readiness.
