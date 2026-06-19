"""
Redshift — Metadata Collect & Push (combined)
===============================================
Collects table schemas, row counts, and byte sizes from Amazon Redshift,
then pushes them to Monte Carlo via the push ingestion API.

This script imports and calls collect() from collect_metadata and push() from
push_metadata, running both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - REDSHIFT_HOST     : Redshift cluster endpoint or serverless workgroup endpoint
  - REDSHIFT_DB       : database name to connect to
  - REDSHIFT_USER     : database user (or IAM role user)
  - REDSHIFT_PASSWORD : database password
  - DB_EXCLUSIONS     : databases to skip
  - SCHEMA_EXCLUSIONS : schemas to skip in every database
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID  : UUID of the Redshift connection in Monte Carlo
  - PUSH_BATCH_SIZE   : number of assets per API call (default 500)

Prerequisites:
  pip install psycopg2-binary pycarlo
"""

from __future__ import annotations

import argparse
import logging
import os

from collect_metadata import collect
from push_metadata import DEFAULT_BATCH_SIZE, push

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect and push Redshift metadata to Monte Carlo")
    parser.add_argument("--host", default=os.getenv("REDSHIFT_HOST"))         # ← SUBSTITUTE
    parser.add_argument("--db", default=os.getenv("REDSHIFT_DB"))             # ← SUBSTITUTE
    parser.add_argument("--user", default=os.getenv("REDSHIFT_USER"))         # ← SUBSTITUTE
    parser.add_argument("--password", default=os.getenv("REDSHIFT_PASSWORD")) # ← SUBSTITUTE
    parser.add_argument("--port", type=int, default=int(os.getenv("REDSHIFT_PORT", "5439")))
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--manifest", default="manifest_metadata.json")
    args = parser.parse_args()

    required = ["host", "db", "user", "password", "resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    log.info("Step 1: Collecting metadata …")
    collect(
        host=args.host,
        db=args.db,
        user=args.user,
        password=args.password,
        manifest_path=args.manifest,
        port=args.port,
    )

    log.info("Step 2: Pushing metadata to Monte Carlo …")
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
