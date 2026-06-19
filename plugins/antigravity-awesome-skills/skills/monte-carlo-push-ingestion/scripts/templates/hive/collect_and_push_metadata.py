#!/usr/bin/env python3
"""
Collect Hive table metadata and push it to Monte Carlo in one step.

Thin wrapper that calls ``collect()`` from ``collect_metadata`` followed by
``push()`` from ``push_metadata``, then writes the final manifest (with
``resource_uuid`` and ``invocation_id``) to ``--output-file``.

Substitution points
-------------------
- HIVE_HOST           (env) / --hive-host      (CLI) : HiveServer2 hostname
- MCD_INGEST_ID    (env) / --key-id         (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN (env) / --key-token      (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID    (env) / --resource-uuid  (CLI) : MC resource UUID for this connection

Prerequisites
-------------
    pip install pycarlo pyhive python-dotenv

Usage
-----
    python collect_and_push_metadata.py \\
        --key-id  <MCD_INGEST_ID> \\
        --key-token <MCD_INGEST_TOKEN> \\
        --resource-uuid <MCD_RESOURCE_UUID> \\
        --hive-host <HIVESERVER2_HOSTNAME>
"""

import argparse
import json
import os

from collect_metadata import collect
from push_metadata import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_SECONDS, push


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Hive table metadata and push to Monte Carlo",
    )
    # Hive / collect args
    parser.add_argument(
        "--hive-host",
        default=os.environ.get("HIVE_HOST"),
        help="HiveServer2 hostname (env: HIVE_HOST)",  # ← SUBSTITUTE: your EMR master DNS or Hive host
    )
    parser.add_argument(
        "--hive-port",
        type=int,
        default=10000,
        help="HiveServer2 port (default: 10000)",  # ← SUBSTITUTE if your cluster uses a non-standard port
    )
    # Push / MC args
    parser.add_argument(
        "--key-id",
        default=os.environ.get("MCD_INGEST_ID"),
        help="Monte Carlo ingestion key ID (env: MCD_INGEST_ID)",  # ← SUBSTITUTE env var name if different
    )
    parser.add_argument(
        "--key-token",
        default=os.environ.get("MCD_INGEST_TOKEN"),
        help="Monte Carlo ingestion key token (env: MCD_INGEST_TOKEN)",  # ← SUBSTITUTE env var name if different
    )
    parser.add_argument(
        "--resource-uuid",
        default=os.environ.get("MCD_RESOURCE_UUID"),
        required=False,
        help="Monte Carlo resource UUID for this Hive connection (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--output-file",
        default="metadata_output.json",
        help="Path to write the output manifest (default: metadata_output.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        metavar="N",
        help=f"Max assets per POST (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        metavar="SEC",
        help=f"HTTP timeout per request in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
    )
    args = parser.parse_args()

    if not args.hive_host:
        parser.error("--hive-host is required (or set HIVE_HOST)")
    if not args.key_id or not args.key_token:
        parser.error("--key-id and --key-token are required (or set MCD_INGEST_ID / MCD_INGEST_TOKEN)")
    if not args.resource_uuid:
        parser.error("--resource-uuid is required (or set MCD_RESOURCE_UUID)")

    manifest = collect(
        hive_host=args.hive_host,
        hive_port=args.hive_port,
    )

    push(
        manifest=manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        timeout_seconds=args.timeout,
    )

    with open(args.output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Manifest written to {args.output_file}")
    print("Done.")


if __name__ == "__main__":
    main()
