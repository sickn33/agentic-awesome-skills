"""
BigQuery — Metadata Collection (collect only)
==============================================
Collects table schemas, row counts, byte sizes, and descriptions from all
datasets in a BigQuery project and writes them to a JSON manifest file.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points (search for "← SUBSTITUTE"):
  - BIGQUERY_PROJECT_ID   : GCP project ID to collect from
  - GOOGLE_APPLICATION_CREDENTIALS : path to service-account JSON key file
  - DATASET_EXCLUSIONS    : datasets to skip (informational / system datasets)

Prerequisites:
  pip install google-cloud-bigquery
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone

from google.cloud import bigquery

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "bigquery"

# Datasets to skip — add any internal / system datasets here
DATASET_EXCLUSIONS = {  # ← SUBSTITUTE: add datasets to exclude
    "_bqc_",
    "INFORMATION_SCHEMA",
}

# BigQuery type → Monte Carlo canonical type
BQ_TYPE_MAP: dict[str, str] = {
    "INT64": "INTEGER",
    "INTEGER": "INTEGER",
    "FLOAT64": "FLOAT",
    "FLOAT": "FLOAT",
    "BOOL": "BOOLEAN",
    "BOOLEAN": "BOOLEAN",
    "STRING": "VARCHAR",
    "BYTES": "BINARY",
    "DATE": "DATE",
    "DATETIME": "DATETIME",
    "TIMESTAMP": "TIMESTAMP",
    "TIME": "TIME",
    "NUMERIC": "DECIMAL",
    "BIGNUMERIC": "DECIMAL",
    "RECORD": "STRUCT",
    "STRUCT": "STRUCT",
    "REPEATED": "ARRAY",
    "JSON": "JSON",
    "GEOGRAPHY": "GEOGRAPHY",
}


def map_bq_type(bq_type: str) -> str:
    return BQ_TYPE_MAP.get(bq_type.upper(), bq_type.upper())


def _collect_assets(bq_client: bigquery.Client, project_id: str) -> list[dict]:
    """Collect table metadata from BigQuery and return as a list of dicts."""
    assets: list[dict] = []

    for dataset_item in bq_client.list_datasets():
        dataset_id = dataset_item.dataset_id

        if any(exc in dataset_id for exc in DATASET_EXCLUSIONS):
            log.info("Skipping dataset %s", dataset_id)
            continue

        dataset_ref = bq_client.dataset(dataset_id)

        for table_item in bq_client.list_tables(dataset_ref):
            table_ref = dataset_ref.table(table_item.table_id)
            table = bq_client.get_table(table_ref)

            fields = [
                {
                    "name": field.name,
                    "type": map_bq_type(field.field_type),
                    "description": field.description or None,
                }
                for field in table.schema
            ]

            asset = {
                "name": table.table_id,
                "database": project_id,  # ← SUBSTITUTE: use project or dataset as database
                "schema": dataset_id,
                "type": "VIEW" if table.table_type == "VIEW" else "TABLE",
                "description": table.description or None,
                "fields": fields,
                "volume": {
                    "row_count": table.num_rows,
                    "byte_count": table.num_bytes,
                },
                "freshness": {
                    "last_updated_time": table.modified.isoformat() if table.modified else None,
                },
            }
            assets.append(asset)
            log.info("Queued %s.%s.%s", project_id, dataset_id, table.table_id)

    return assets


def collect(
    project_id: str,
    output_file: str = "metadata_output.json",
) -> dict:
    """
    Connect to BigQuery, collect table metadata, and write a JSON manifest.

    Returns the manifest dict.
    """
    bq_client = bigquery.Client(project=project_id)  # ← SUBSTITUTE: adjust auth if needed

    log.info("Collecting metadata from project %s ...", project_id)
    assets = _collect_assets(bq_client, project_id)
    log.info("Collected %d asset(s).", len(assets))

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "assets": assets,
    }
    with open(output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Asset manifest written to %s", output_file)

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect BigQuery metadata and write to a manifest file",
    )
    parser.add_argument("--project-id", default=os.getenv("BIGQUERY_PROJECT_ID"))  # ← SUBSTITUTE
    parser.add_argument("--output-file", default="metadata_output.json")
    args = parser.parse_args()

    missing = [k for k, v in vars(args).items() if v is None and k != "output_file"]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    collect(
        project_id=args.project_id,
        output_file=args.output_file,
    )


if __name__ == "__main__":
    main()
