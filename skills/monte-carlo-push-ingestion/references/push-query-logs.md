# Query-log ingestion

Collect only an approved source/window/principal. Query text, usernames, tags and error messages may contain credentials or personal data. Review which fields may be transmitted before external ingestion. Use a least-privilege filtered system view where possible; do not broaden role access to bypass masking. A `<REDACTED>` query is unavailable content, not usable SQL.

Use actual aware UTC start/end datetimes in `QueryLogEntry`, stable source query IDs and `extra` for provider-specific metrics. Never infer completion time from the next unrelated log line or invent a user. Omit or quarantine records without authoritative required timestamps. Rows scanned/produced/operator counters are not automatically rows delivered to the client; retain their original metric names in `extra` unless the provider definition matches `returned_rows`.

Send `send_query_logs(resource_uuid=..., log_type=..., events=entries)`. The parameter is `events`, not `entries`; connector-specific `log_type` values must be verified for the integration. Do not assume a resource UUID is optional.

Keep SQL intact. Reject oversized entries and reduce batch size; never truncate statements to avoid HTTP413. The helper checks SDK-generated wire bytes before sending. Provider text may already be truncated: record this limitation instead of claiming full history. AWS SYS_QUERY_TEXT uses sequence-ordered4000-character chunks; retain each chunk in full. LISTAGG has its own aggregate limit, so large statements need a reviewed row-by-row assembly adaptation.

Use bounded windows and deterministic paging/ordering, preserve a durable checkpoint only after a complete window, and explicitly handle pagination saturation, retention gaps, permission gaps, failed jobs and overlap/deduplication. Fixed LIMIT outputs are partial until proven otherwise. BigQuery may list in-flight jobs even with a lag: require completed jobs and actual ended timestamps. Databricks uses `system.query.history.execution_status`; masked statement text must remain unavailable. Snowflake account usage has deployment-specific lag; a fixed one-hour skip is not a guarantee.

Manifests and journals remain private with an agreed retention policy. Report counts, window, rejected/partial records and invocation IDs without printing raw SQL. Verify downstream counts/IDs within a bounded window; acceptance alone does not establish completeness or exactly-once ingestion.

The Hive log parser marks output `requires_verified_completion`: its generic activity log has no authoritative completion event, so pushing is intentionally blocked. Adapt the parser to verified cluster completion records and user identity before clearing this marker; never clear it merely to bypass the guard. Local log reads are bounded to32 MiB and reject symlinks.
