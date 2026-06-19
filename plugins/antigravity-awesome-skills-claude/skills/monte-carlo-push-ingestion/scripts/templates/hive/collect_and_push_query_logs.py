#!/usr/bin/env python3
"""
Collect Hive query logs from a local log file and push them to Monte Carlo
in one step.

Thin wrapper that calls ``collect()`` from ``collect_query_logs`` followed by
``push()`` from ``push_query_logs``, then writes the final manifest (with
``resource_uuid`` and ``invocation_id``) to ``--output-file``.

Substitution points
-------------------
- MCD_INGEST_ID    (env) / --key-id        (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN (env) / --key-token      (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID    (env) / --resource-uuid  (CLI) : MC resource UUID (optional for query logs)
- --log-file                  path to local HiveServer2 log (default: /tmp/root/hive.log)
- --op-logs-dir               optional directory of per-query <queryId>.log files

Prerequisites
-------------
    pip install pycarlo python-dateutil python-dotenv

Usage
-----
    python collect_and_push_query_logs.py \\
        --key-id  <MCD_INGEST_ID> \\
        --key-token <MCD_INGEST_TOKEN> \\
        --resource-uuid <MCD_RESOURCE_UUID> \\
        --log-file /tmp/root/hive.log \\
        [--op-logs-dir /var/log/hive/operation_logs]
"""

import argparse
import json
import os

from collect_query_logs import collect
from push_query_logs import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_SECONDS, push


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Hive query logs from a local log file and push to Monte Carlo",
    )
    # Collect args
    parser.add_argument(
        "--log-file",
        default="/tmp/root/hive.log",
        help="Path to local HiveServer2 log file (default: /tmp/root/hive.log)",  # ← SUBSTITUTE: your log path
    )
    parser.add_argument(
        "--op-logs-dir",
        default=None,
        help=(
            "Directory containing per-query Hive operation logs (<queryId>.log). "
            "When provided, returned_rows is populated from SelectOperator RECORDS_OUT counts."
        ),
        # ← SUBSTITUTE: e.g. /var/log/hive/operation_logs or wherever Hive writes op logs
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
        help="Monte Carlo resource UUID (optional for query logs) (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--output-file",
        default="query_logs_output.json",
        help="Path to write the output manifest (default: query_logs_output.json)",
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

    manifest = collect(log_file=args.log_file, op_logs_dir=args.op_logs_dir)

    push(
        manifest=manifest,
        key_id=args.key_id,
        key_token=args.key_token,
        resource_uuid=args.resource_uuid,
        batch_size=args.batch_size,
        timeout_seconds=args.timeout,
    )

    with open(args.output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Query log manifest written to {args.output_file}")
    print("Done.")


if __name__ == "__main__":
    main()
