"""
Databricks — Metadata Collect & Push (combined)
=================================================
Collects table schemas, row counts, and byte sizes from Databricks Unity Catalog,
then pushes them to Monte Carlo via the push ingestion API.

This script imports and calls collect() from collect_metadata and push() from
push_metadata, running both in sequence.

Substitution points (search for "← SUBSTITUTE"):
  - DATABRICKS_HOST       : workspace hostname (e.g. adb-1234.azuredatabricks.net)
  - DATABRICKS_HTTP_PATH  : SQL warehouse HTTP path (e.g. /sql/1.0/warehouses/abc123)
  - DATABRICKS_TOKEN      : personal access token or service-principal secret
  - DATABRICKS_CATALOG    : catalog to collect from (default: "hive_metastore" or "main")
  - SCHEMA_EXCLUSIONS     : schemas to skip
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the Databricks connection in Monte Carlo
  - PUSH_BATCH_SIZE       : number of assets per API call (default 500)

Prerequisites:
  pip install databricks-sql-connector pycarlo
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
    parser = argparse.ArgumentParser(description="Collect and push Databricks metadata to Monte Carlo")
    parser.add_argument("--host", default=os.getenv("DATABRICKS_HOST"))           # ← SUBSTITUTE
    parser.add_argument("--http-path", default=os.getenv("DATABRICKS_HTTP_PATH")) # ← SUBSTITUTE
    parser.add_argument("--token", default=os.getenv("DATABRICKS_TOKEN"))         # ← SUBSTITUTE
    parser.add_argument("--catalog", default=os.getenv("DATABRICKS_CATALOG", "hive_metastore"))
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--manifest", default="manifest_metadata.json")
    args = parser.parse_args()

    required = ["host", "http_path", "token", "resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    log.info("Step 1: Collecting metadata …")
    collect(
        host=args.host,
        http_path=args.http_path,
        token=args.token,
        catalog=args.catalog,
        manifest_path=args.manifest,
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
