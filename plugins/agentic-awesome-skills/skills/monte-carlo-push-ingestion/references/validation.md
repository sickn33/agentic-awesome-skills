# Validation and evidence

Validate collection, acceptance and downstream state separately. Record dependency versions, source scope/window, limits, skipped/errors, manifest hash, destination UUID and invocation IDs. Use the GraphQL key only for authorized read-only checks on the intended resource. Check the current GraphQL schema; bundled queries are examples and can drift.

`scripts/sample_verify.py` resolves an asset and can inspect schema, metrics, detectors, lineage and query counts. It uses bounded query-log paging and exits nonzero for failed explicit schema/lineage expectations. Metrics/detector/query counts are observations, not comprehensive assertions of pipeline correctness. An empty result may reflect source lag, retention, missing permissions, wrong IDs or genuine absence. Do not label any of these a proven healthy pipeline.

Select the current schema version through a documented ordering/version field; the first unqualified version is not guaranteed latest. Preserve case-sensitive names and compare expected types, not just a subset of column names. Verify actual metric timestamps and zero values. Bound all pagination, reject repeated cursors and report incomplete first-page results. Column lineage's1000-edge example is not a complete graph without pagination.

For an initial push, compare a small set of known source query IDs, table/column identities and expected metric timestamps in a bounded time window. Then reconcile aggregate counts and rejected records. Separate API acceptance from downstream normalization, catalog visibility and monitor readiness. Fixed15–20-minute waits or inferred training thresholds are not validation.

Do not create/delete tables, delete push assets or modify monitors during verification. If cleanup is explicitly requested, first enumerate exact owned targets and dependencies, explain recovery limits and obtain destructive-action authorization. Never delete pull-ingested assets or another integration's nodes to repair this one.
