#!/usr/bin/env python3
"""
Collect lineage from Snowflake and push it to Monte Carlo — combined.

Imports ``collect()`` from ``collect_lineage`` and ``push()`` from
``push_lineage``, runs both in sequence.

Substitution points
-------------------
- SNOWFLAKE_ACCOUNT    (env) / --account    (CLI) : Snowflake account identifier
- SNOWFLAKE_USER       (env) / --user       (CLI) : Snowflake username
- SNOWFLAKE_PASSWORD   (env) / --password   (CLI) : Snowflake password
- SNOWFLAKE_WAREHOUSE  (env) / --warehouse  (CLI) : Snowflake virtual warehouse
- MCD_INGEST_ID     (env) / --key-id     (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN  (env) / --key-token  (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID     (env) / --resource-uuid (CLI) : MC resource UUID for this connection

Prerequisites
-------------
    pip install pycarlo snowflake-connector-python

Usage (table-level):
    python collect_and_push_lineage.py \\
        --account  <SNOWFLAKE_ACCOUNT> \\
        --user     <SNOWFLAKE_USER> \\
        --password <SNOWFLAKE_PASSWORD> \\
        --warehouse <SNOWFLAKE_WAREHOUSE> \\
        --key-id  <MCD_INGEST_ID> \\
        --key-token <MCD_INGEST_TOKEN> \\
        --resource-uuid <MCD_RESOURCE_UUID>

Usage (column-level):
    python collect_and_push_lineage.py ... --column-lineage
"""

from __future__ import annotations

import argparse
import os

from collect_lineage import collect, _LOOKBACK_HOURS
from push_lineage import push, _BATCH_SIZE


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Snowflake lineage from ACCOUNT_USAGE and push to Monte Carlo",
    )
    parser.add_argument(
        "--account",
        default=os.environ.get("SNOWFLAKE_ACCOUNT"),
        help="Snowflake account identifier (env: SNOWFLAKE_ACCOUNT)",
    )
    parser.add_argument(
        "--user",
        default=os.environ.get("SNOWFLAKE_USER"),
        help="Snowflake username (env: SNOWFLAKE_USER)",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("SNOWFLAKE_PASSWORD"),
        help="Snowflake password (env: SNOWFLAKE_PASSWORD)",
    )
    parser.add_argument(
        "--warehouse",
        default=os.environ.get("SNOWFLAKE_WAREHOUSE"),
        help="Snowflake virtual warehouse (env: SNOWFLAKE_WAREHOUSE)",
    )
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
        help="Monte Carlo resource UUID for this Snowflake connection (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--lookback-hours",
        type=int,
        default=_LOOKBACK_HOURS,
        help=f"Hours of QUERY_HISTORY to scan (default: {_LOOKBACK_HOURS})",
    )
    parser.add_argument(
        "--column-lineage",
        action="store_true",
        help="Push column-level lineage instead of table-level",
    )
    parser.add_argument(
        "--output-file",
        default="lineage_output.json",
        help="Path for the intermediate collect manifest (default: lineage_output.json)",
    )
    parser.add_argument(
        "--push-result-file",
        default="lineage_push_result.json",
        help="Path to write the push result (default: lineage_push_result.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max events per push batch (default: {_BATCH_SIZE})",
    )
    args = parser.parse_args()

    missing = [
        name
        for name, val in [
            ("--account", args.account),
            ("--user", args.user),
            ("--password", args.password),
            ("--warehouse", args.warehouse),
            ("--key-id", args.key_id),
            ("--key-token", args.key_token),
            ("--resource-uuid", args.resource_uuid),
        ]
        if not val
    ]
    if missing:
        parser.error(f"Missing required arguments: {', '.join(missing)}")

    # Step 1: Collect
    collect(
        account=args.account,
        user=args.user,
        password=args.password,
        warehouse=args.warehouse,
        lookback_hours=args.lookback_hours,
        column_lineage=args.column_lineage,
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

    print("Done.")


if __name__ == "__main__":
    main()
