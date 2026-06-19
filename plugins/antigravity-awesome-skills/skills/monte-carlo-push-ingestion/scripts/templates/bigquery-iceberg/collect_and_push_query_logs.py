"""
BigQuery Iceberg — Query Log Collect & Push (combined)
=====================================================
Convenience wrapper that runs collect_query_logs.collect() followed by
push_query_logs.push() in a single invocation.

Prerequisites:
  pip install google-cloud-bigquery pycarlo>=0.12.251 python-dateutil>=2.8.0
"""

from __future__ import annotations

import argparse
import os

from collect_query_logs import LOOKBACK_HOURS, LOOKBACK_LAG_HOURS, collect
from push_query_logs import push


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect BigQuery query logs and push to Monte Carlo",
    )
    # Collection args
    parser.add_argument("--project-id", default=os.getenv("BIGQUERY_PROJECT_ID"))
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--lookback-lag-hours", type=int, default=LOOKBACK_LAG_HOURS)
    parser.add_argument("--manifest-file", default="query_logs_output.json")

    # Push args
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--push-result-file", default="query_logs_push_result.json")

    args = parser.parse_args()

    if not args.project_id:
        parser.error("--project-id or BIGQUERY_PROJECT_ID env var is required")
    required_push = ["resource_uuid", "key_id", "key_token"]
    missing = [k for k in required_push if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required push arguments/env vars: {missing}")

    collect(
        project_id=args.project_id,
        lookback_hours=args.lookback_hours,
        lookback_lag_hours=args.lookback_lag_hours,
        output_file=args.manifest_file,
    )

    push(
        input_file=args.manifest_file,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        output_file=args.push_result_file,
    )


if __name__ == "__main__":
    main()
