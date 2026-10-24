# Metadata ingestion

Read the selected metadata collector, pusher and `_safe_paths.py` before adapting them. Use a filtered collect-only run, inspect a private JSON manifest, then push only the approved fields/resource. The SDK contract is version-specific; see the parent skill and official pycarlo distribution.

`RelationalAsset` contains `type`, nested `AssetMetadata(name, database, schema, ...)`, optional `AssetField` entries, `AssetVolume(row_count, byte_count)` and `AssetFreshness(last_update_time=...)`. Normalize supported asset types against the actual integration. Preserve source case and namespaces. Do not collapse catalogs or datasets based on convenience.

Missing is different from zero, an empty schema, and a deleted table. Preserve zero counts. Omit unknown freshness rather than using current time; Snowflake LAST_ALTERED includes metadata activity and is not proof of data modification. Hive stats may be absent or stale. BigQuery Iceberg storage timestamps may be null. An empty collection must produce a new empty manifest, never reuse a previous file.

Confirm whether omitted fields are merged, replaced or ignored by the deployed API before enabling freshness/volume-only pushes. Failed schema collection must be reported as incomplete, not an empty authoritative schema. Source permissions and catalog visibility limit completeness.

Send with `send_metadata(resource_uuid=..., resource_type=..., events=assets)`. Empty lists are local no-ops. Count batches and exact serialized bytes separately; never invent rows, timestamps or fields to satisfy validation. Keep each invocation ID and inspect downstream names/types/counts/timestamps. A transport acknowledgment does not prove metrics or monitors are correct. Retention, refresh cadence and replacement behavior must come from the current account contract.
