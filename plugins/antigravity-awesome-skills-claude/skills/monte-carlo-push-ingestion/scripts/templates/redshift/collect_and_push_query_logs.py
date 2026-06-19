"""
Redshift — Query Log Collect & Push (combined)
================================================
Collects completed query execution records from Redshift using sys_query_history
and sys_querytext, then pushes them to Monte Carlo for query-pattern analysis,
lineage derivation, and usage attribution.

This script imports and calls collect() from collect_query_logs and push() from
push_query_logs, running both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - REDSHIFT_HOST / REDSHIFT_DB / REDSHIFT_USER / REDSHIFT_PASSWORD : connection
  - LOOKBACK_HOURS    : hours back from [now - LAG_HOURS] to collect (default 25)
  - LOOKBACK_LAG_HOURS: lag behind now to avoid in-flight queries (default 1)
  - BATCH_SIZE        : number of query_ids to fetch texts for in one SQL call
  - MAX_QUERIES       : maximum query rows to process per run
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID  : UUID of the Redshift connection in Monte Carlo
  - PUSH_BATCH_SIZE   : number of entries per API call (default 250)

Prerequisites:
  pip install psycopg2-binary pycarlo
"""

from __future__ import annotations

import argparse
import logging
import os

from collect_query_logs import BATCH_SIZE, LOOKBACK_HOURS, LOOKBACK_LAG_HOURS, MAX_QUERIES, collect
from push_query_logs import DEFAULT_BATCH_SIZE, push

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect and push Redshift query logs to Monte Carlo")
    parser.add_argument("--host", default=os.getenv("REDSHIFT_HOST"))         # ← SUBSTITUTE
    parser.add_argument("--db", default=os.getenv("REDSHIFT_DB"))             # ← SUBSTITUTE
    parser.add_argument("--user", default=os.getenv("REDSHIFT_USER"))         # ← SUBSTITUTE
    parser.add_argument("--password", default=os.getenv("REDSHIFT_PASSWORD")) # ← SUBSTITUTE
    parser.add_argument("--port", type=int, default=int(os.getenv("REDSHIFT_PORT", "5439")))
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--lookback-lag-hours", type=int, default=LOOKBACK_LAG_HOURS)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--max-queries", type=int, default=MAX_QUERIES)
    parser.add_argument("--push-batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--manifest", default="manifest_query_logs.json")
    args = parser.parse_args()

    required = ["host", "db", "user", "password", "resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    log.info("Step 1: Collecting query logs …")
    collect(
        host=args.host,
        db=args.db,
        user=args.user,
        password=args.password,
        manifest_path=args.manifest,
        port=args.port,
        lookback_hours=args.lookback_hours,
        lookback_lag_hours=args.lookback_lag_hours,
        batch_size=args.batch_size,
        max_queries=args.max_queries,
    )

    log.info("Step 2: Pushing query logs to Monte Carlo …")
    push(
        manifest_path=args.manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.push_batch_size,
    )

    log.info("Done — collect and push complete.")


if __name__ == "__main__":
    main()
