"""
BigQuery — Lineage Collection and Push (combined)
===================================================
Imports ``collect()`` from ``collect_lineage`` and ``push()`` from
``push_lineage``, runs both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - BIGQUERY_PROJECT_ID   : GCP project ID to collect from
  - BIGQUERY_REGION       : BigQuery region for INFORMATION_SCHEMA queries (e.g. "us", "eu")
  - LOOKBACK_HOURS        : how far back to scan job history (default 24 h)
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the BigQuery connection in Monte Carlo

Prerequisites:
  pip install google-cloud-bigquery pycarlo
"""

from __future__ import annotations

import argparse
import os

from collect_lineage import LOOKBACK_HOURS, _bounded_int, _require_bq_identifier, collect
from push_lineage import push, _BATCH_SIZE
from _safe_paths import safe_output_json_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Push BigQuery lineage to Monte Carlo")
    parser.add_argument("--project-id", default=os.getenv("BIGQUERY_PROJECT_ID"))  # ← SUBSTITUTE
    parser.add_argument("--region", default=os.getenv("BIGQUERY_REGION", "us"))    # ← SUBSTITUTE
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--output-file", default="lineage_output.json")
    parser.add_argument("--push-result-file", default="lineage_push_result.json")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max events per push batch (default: {_BATCH_SIZE})",
    )
    args = parser.parse_args()

    required = ["project_id", "resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    output_path = str(safe_output_json_path(args.output_file))
    push_result_path = str(safe_output_json_path(args.push_result_file))

    args.project_id = _require_bq_identifier(args.project_id, "project_id")
    args.region = _require_bq_identifier(args.region, "region")
    args.lookback_hours = _bounded_int(args.lookback_hours, "lookback_hours", minimum=1, maximum=24 * 31)

    # Step 1: Collect
    collect(
        project_id=args.project_id,
        region=args.region,
        lookback_hours=args.lookback_hours,
        output_file=output_path,
    )

    # Step 2: Push
    push(
        input_file=output_path,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        output_file=push_result_path,
    )


if __name__ == "__main__":
    main()
