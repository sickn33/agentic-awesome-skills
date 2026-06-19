"""
BigQuery — Metadata Collection and Push (combined)
===================================================
Imports ``collect()`` from ``collect_metadata`` and ``push()`` from
``push_metadata``, runs both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - BIGQUERY_PROJECT_ID   : GCP project ID to collect from
  - GOOGLE_APPLICATION_CREDENTIALS : path to service-account JSON key file
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the BigQuery connection in Monte Carlo
  - DATASET_EXCLUSIONS    : datasets to skip (informational / system datasets)

Prerequisites:
  pip install google-cloud-bigquery pycarlo
"""

from __future__ import annotations

import argparse
import os

from collect_metadata import collect
from push_metadata import push, _BATCH_SIZE


def main() -> None:
    parser = argparse.ArgumentParser(description="Push BigQuery metadata to Monte Carlo")
    parser.add_argument("--project-id", default=os.getenv("BIGQUERY_PROJECT_ID"))  # ← SUBSTITUTE
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--output-file", default="metadata_output.json")
    parser.add_argument("--push-result-file", default="metadata_push_result.json")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max assets per push batch (default: {_BATCH_SIZE})",
    )
    args = parser.parse_args()

    missing = [k for k, v in vars(args).items() if v is None and k not in ("output_file", "push_result_file", "batch_size")]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    # Step 1: Collect
    collect(
        project_id=args.project_id,
        output_file=args.output_file,
    )

    # Step 2: Push
    push(
        input_file=args.output_file,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        output_file=args.push_result_file,
    )


if __name__ == "__main__":
    main()
