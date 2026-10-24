# Freshness and volume monitor diagnosis

Inspect the actual monitor state, configuration, collection cadence and recent observations in the current account. Detector eligibility, training history, supported metrics and latency vary by integration and product version. This skill does not certify universal point counts, percentile ratios, hourly maxima or training windows.

Check in order: intended asset identity; observed real data-update timestamp; zero versus missing counts; stale source statistics; collection errors/limits; batch acceptance; downstream metric timestamps; monitor enablement and current product-reported training status. Keep collection time separate from source update time. A successful push or a large history count does not prove a detector is trained.

Do not fabricate timestamps, replay duplicate points as fresh data, backfill invented observations or change thresholds merely to make a monitor fire. For a test, use an authorized non-production asset with a known real data change and record the expected observation, time window and actual result. Production monitor changes require approval for the exact settings and effects.

Report measured evidence and unresolved causes. Use current official Monte Carlo documentation or account support for internal aggregation/retention/training behavior. A missing alert can reflect eligibility, configuration, data quality or training; it is not proof that ingestion failed.
