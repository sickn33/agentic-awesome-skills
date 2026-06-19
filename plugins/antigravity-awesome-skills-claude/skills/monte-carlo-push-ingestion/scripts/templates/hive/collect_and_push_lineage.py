#!/usr/bin/env python3
"""
Extract Hive lineage from a local log file and push it to Monte Carlo in one step.

Thin wrapper that calls ``collect()`` from ``collect_lineage`` followed by
``push()`` from ``push_lineage``, then writes the final manifest (with
``resource_uuid`` and ``invocation_id``) to ``--output-file``.

Substitution points
-------------------
- MCD_INGEST_ID    (env) / --key-id        (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN (env) / --key-token      (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID    (env) / --resource-uuid  (CLI) : MC resource UUID for this connection
- --log-file                                         : path to local HiveServer2 log

Prerequisites
-------------
    pip install pycarlo python-dotenv

Usage (table-level):
    python collect_and_push_lineage.py \\
        --key-id  <MCD_INGEST_ID> \\
        --key-token <MCD_INGEST_TOKEN> \\
        --resource-uuid <MCD_RESOURCE_UUID> \\
        --log-file /tmp/root/hive.log

Usage (column-level):
    python collect_and_push_lineage.py ... --column-lineage
"""

import argparse
import json
import os

from collect_lineage import collect
from push_lineage import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_SECONDS, push


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract Hive lineage from a local log file and push to Monte Carlo",
    )
    # Collect args
    parser.add_argument(
        "--log-file",
        default="/tmp/root/hive.log",
        help="Path to local HiveServer2 log file (default: /tmp/root/hive.log)",  # ← SUBSTITUTE: your log path
    )
    # Push / MC args
    parser.add_argument(
        "--key-id",
        default=os.environ.get("MCD_INGEST_ID"),
        help="Monte Carlo ingestion key ID (env: MCD_INGEST_ID)",
    )
    parser.add_argument(
        "--key-token",
        default=os.environ.get("MCD_INGEST_TOKEN"),
        help="Monte Carlo ingestion key token (env: MCD_INGEST_TOKEN)",
    )
    parser.add_argument(
        "--resource-uuid",
        default=os.environ.get("MCD_RESOURCE_UUID"),
        help="Monte Carlo resource UUID for this Hive connection (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--column-lineage",
        action="store_true",
        help="Push column-level lineage instead of table-level",
    )
    parser.add_argument(
        "--output-file",
        default="lineage_output.json",
        help="Path to write the lineage manifest (default: lineage_output.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        metavar="N",
        help=f"Max events per POST (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        metavar="SEC",
        help=f"HTTP timeout per request in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
    )
    args = parser.parse_args()

    if not args.key_id or not args.key_token:
        parser.error("--key-id and --key-token are required (or set MCD_INGEST_ID / MCD_INGEST_TOKEN)")
    if not args.resource_uuid:
        parser.error("--resource-uuid is required (or set MCD_RESOURCE_UUID)")

    manifest = collect(log_file=args.log_file)

    if not manifest["edges"]:
        print("No lineage edges detected — no CTAS or INSERT INTO ... SELECT patterns found.")
        return

    push(
        manifest=manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        column_lineage=args.column_lineage,
        batch_size=args.batch_size,
        timeout_seconds=args.timeout,
    )

    with open(args.output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Lineage manifest written to {args.output_file}")
    print("Done.")


if __name__ == "__main__":
    main()
