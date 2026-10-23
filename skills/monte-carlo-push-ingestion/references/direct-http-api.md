# Direct HTTP ingestion

Prefer the pinned SDK's payload builders to handwritten wire schemas. In pycarlo0.15.491, `build_metadata_payload`, `build_lineage_payload` and `build_query_log_payload` live in `pycarlo.features.ingestion.models`. They produce different event envelopes: metadata wraps each asset in `relational_asset`; lineage has source/destination refs and optional fields; query logs use `resource.log_type`.

Inspect the builder output locally with synthetic data, then check the current integration contract for endpoint, supported types, exact serialized/compressed byte limits, timeout and response semantics. Do not copy ETL/BI payloads or limits to relational flows. Relational paths in the inspected SDK are `/ingest/v1/metadata`, `/ingest/v1/lineage` and `/ingest/v1/querylogs`. Confirm region/account routing before credentials are used.

A reviewed HTTP adaptation must use an approved fixed HTTPS host, TLS verification, credentials inherited from a secret manager/environment, connect/read timeouts, bounded body/response sizes and `allow_redirects=False`. Avoid curl `-H` token values, shell tracing and command-line secrets. Never send credentials to a URL from source logs or manifest fields.

Measure the exact request after serialization and any compression. Reject a single oversized event; reduce batches without truncating SQL. Save each batch's payload hash, resource, event count, response status and invocation ID in a private journal.202 means accepted for asynchronous processing, not verified catalog state.

Bound retries and backoff only for provider-defined retryable outcomes, after resolving whether the prior write was accepted. A timeout or disconnected response can be ambiguous; do not blindly resend an entire collection. Never bypass authentication, create broader keys or disable TLS to make delivery work. The bundled pusher intentionally stops on uncertain outcomes and keeps its batch journal.
