"""
Databricks — Query Log Collect & Push (combined)
==================================================
Collects finished query execution records from the Databricks system table
system.query.history and pushes them to Monte Carlo for query-pattern analysis,
lineage derivation, and usage attribution.

This script imports and calls collect() from collect_query_logs and push() from
push_query_logs, running both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - DATABRICKS_HOST       : workspace hostname
  - DATABRICKS_HTTP_PATH  : SQL warehouse HTTP path
  - DATABRICKS_TOKEN      : PAT or service-principal secret
  - LOOKBACK_HOURS        : hours back from [now - LAG_HOURS] to collect (default 25)
  - LOOKBACK_LAG_HOURS    : hours to lag behind now to avoid in-flight queries (default 1)
  - MAX_ROWS              : maximum query rows to collect per run (default 10000)
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the Databricks connection in Monte Carlo
  - PUSH_BATCH_SIZE       : number of entries per API call (default 250)

Prerequisites:
  pip install databricks-sql-connector pycarlo
"""

from __future__ import annotations

import argparse
import logging
import os

from collect_query_logs import LOOKBACK_HOURS, LOOKBACK_LAG_HOURS, MAX_ROWS, collect
from push_query_logs import DEFAULT_BATCH_SIZE, push

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect and push Databricks query logs to Monte Carlo")
    parser.add_argument("--host", default=os.getenv("DATABRICKS_HOST"))           # ← SUBSTITUTE
    parser.add_argument("--http-path", default=os.getenv("DATABRICKS_HTTP_PATH")) # ← SUBSTITUTE
    parser.add_argument("--token", default=os.getenv("DATABRICKS_TOKEN"))         # ← SUBSTITUTE
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--lookback-lag-hours", type=int, default=LOOKBACK_LAG_HOURS)
    parser.add_argument("--max-rows", type=int, default=MAX_ROWS)
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--manifest", default="manifest_query_logs.json")
    args = parser.parse_args()

    required = ["host", "http_path", "token", "resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    log.info("Step 1: Collecting query logs …")
    collect(
        host=args.host,
        http_path=args.http_path,
        token=args.token,
        manifest_path=args.manifest,
        lookback_hours=args.lookback_hours,
        lookback_lag_hours=args.lookback_lag_hours,
        max_rows=args.max_rows,
    )

    log.info("Step 2: Pushing query logs to Monte Carlo …")
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
