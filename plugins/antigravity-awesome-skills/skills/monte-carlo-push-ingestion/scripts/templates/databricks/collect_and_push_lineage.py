"""
Databricks — Lineage Collect & Push (combined)
================================================
Collects table-level and (optionally) column-level lineage from Databricks Unity
Catalog system tables, then pushes them to Monte Carlo via the push ingestion API.

This script imports and calls collect() from collect_lineage and push() from
push_lineage, running both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - DATABRICKS_HOST       : workspace hostname
  - DATABRICKS_HTTP_PATH  : SQL warehouse HTTP path
  - DATABRICKS_TOKEN      : PAT or service-principal secret
  - LOOKBACK_DAYS         : how many days back to collect lineage (default 30)
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the Databricks connection in Monte Carlo
  - PUSH_BATCH_SIZE       : number of events per API call (default 500)

Use the --column-lineage flag to also push column-level lineage (disabled by default).

Prerequisites:
  pip install databricks-sql-connector pycarlo
"""

from __future__ import annotations

import argparse
import logging
import os

from collect_lineage import LOOKBACK_DAYS, collect
from push_lineage import DEFAULT_BATCH_SIZE, push

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect and push Databricks lineage to Monte Carlo")
    parser.add_argument("--host", default=os.getenv("DATABRICKS_HOST"))           # ← SUBSTITUTE
    parser.add_argument("--http-path", default=os.getenv("DATABRICKS_HTTP_PATH")) # ← SUBSTITUTE
    parser.add_argument("--token", default=os.getenv("DATABRICKS_TOKEN"))         # ← SUBSTITUTE
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--lookback-days", type=int, default=LOOKBACK_DAYS)
    parser.add_argument(
        "--column-lineage", action="store_true",
        help="Also collect column-level lineage (requires system.access.column_lineage access)",
    )
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--manifest", default="manifest_lineage.json")
    args = parser.parse_args()

    required = ["host", "http_path", "token", "resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    log.info("Step 1: Collecting lineage …")
    collect(
        host=args.host,
        http_path=args.http_path,
        token=args.token,
        manifest_path=args.manifest,
        include_column_lineage=args.column_lineage,
        lookback_days=args.lookback_days,
    )

    log.info("Step 2: Pushing lineage to Monte Carlo …")
    push(
        manifest_path=args.manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
    )

    log.info("Done — collect and push complete.")


if __name__ == "__main__":
    main()
