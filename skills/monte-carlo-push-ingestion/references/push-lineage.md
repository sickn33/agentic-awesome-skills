# Lineage ingestion

Use full qualified source/destination identities with source case preserved. The inspected SDK uses `LineageAssetRef(type="TABLE", name=..., database=..., schema=..., asset_id=...)` and `LineageEvent(destination=..., sources=[...], fields=...)`. Column mappings use `ColumnLineageField(name=..., source_fields=[ColumnLineageSourceField(asset_id=..., field_name=...)])`; every referenced asset ID must identify a source in that event. Generate collision-free local IDs from complete qualified tuples.

Databricks system lineage is preferable to guessing SQL relationships when available and authorized. It is still bounded by permissions, region, retention and LIMITs. Combine multiple source columns for each destination column; reject missing names or ambiguous references.

The BigQuery, Hive, Redshift and Snowflake regex collectors produce **candidates**, not verified lineage. They cannot reliably resolve aliases, CTEs, comments, quoted identifiers, dynamic SQL, default schema, joins or expressions. Hive/Snowflake column guesses may assign every expression to the first source. Do not publish these guesses automatically. Independently confirm every edge and column or remove uncertain mappings before setting `MCD_REVIEWED_LINEAGE=1`. That switch is explicit operator intent, not evidence supplied by a manifest.

Do not publish dataset-share wildcard edges as ordinary TABLE `*` assets. Use only a confirmed provider-supported wildcard type/schema or exclude them. For unsupported syntax or unresolved names, report unknown and use an approved dialect parser/catalog source; never silently default to public schema.

Push with `send_lineage(resource_uuid=..., resource_type=..., events=...)` for same-resource lineage. Cross-resource references require the installed SDK's explicit per-asset resource contract and separate approval for every resource. Confirm expiration and refresh semantics with current Monte Carlo documentation/account settings; do not promise permanent edges or invent far-future expiry. Save invocation IDs and verify exact direction, source columns and destination columns downstream.
