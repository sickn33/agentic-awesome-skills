"""
BigQuery Iceberg — Metadata Collection (collect only)
=====================================================
Collects table schemas, row counts, byte sizes, and freshness for BigQuery
Iceberg (BigLake-managed) tables using INFORMATION_SCHEMA.TABLE_STORAGE and
INFORMATION_SCHEMA.COLUMNS. Standard BigQuery collection uses __TABLES__ which
does not include Iceberg tables — this template fills that gap.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Supports a ``--only-freshness-and-volume`` flag to skip the COLUMNS query for
fast periodic pushes after the initial full metadata push.

Substitution points (search for "← SUBSTITUTE"):
  - BIGQUERY_PROJECT_ID                : GCP project ID to collect from
  - GOOGLE_APPLICATION_CREDENTIALS     : path to service-account JSON key file
  - REGION                             : BigQuery region (default "us")

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
    base = bq_type.split("(")[0].strip().upper()
    return BQ_TYPE_MAP.get(base, bq_type.upper())


def _fetch_iceberg_tables(
    client: bigquery.Client,
    project_id: str,
    datasets: list[str] | None = None,
    tables: list[str] | None = None,
) -> list[dict]:
    """Query TABLE_STORAGE for BigLake (Iceberg) tables."""
    conditions = [
        "managed_table_type = 'BIGLAKE'",
        "deleted = FALSE",
    ]
    if datasets:
        ds_list = ", ".join(f"'{d}'" for d in datasets)
        conditions.append(f"table_schema IN ({ds_list})")
    if tables:
        tbl_list = ", ".join(f"'{t}'" for t in tables)
        conditions.append(f"table_name IN ({tbl_list})")

    where = " AND ".join(conditions)
    query = f"""
        SELECT
            table_schema,
            table_name,
            total_rows,
            current_physical_bytes,
            storage_last_modified_time,
            creation_time
        FROM `{project_id}.region-us`.INFORMATION_SCHEMA.TABLE_STORAGE  -- ← SUBSTITUTE: change region if needed
        WHERE {where}
        ORDER BY table_schema, table_name
    """
    log.info("Querying TABLE_STORAGE for Iceberg tables ...")
    rows = list(client.query(query).result())
    log.info("Found %d Iceberg table(s).", len(rows))
    return [dict(row) for row in rows]


def _fetch_columns(
    client: bigquery.Client,
    project_id: str,
    dataset: str,
    table_name: str,
) -> list[dict]:
    """Fetch column metadata for a specific table."""
    query = f"""
        SELECT column_name, data_type, ordinal_position, is_nullable, column_default
        FROM `{project_id}.{dataset}.INFORMATION_SCHEMA.COLUMNS`
        WHERE table_name = '{table_name}'
        ORDER BY ordinal_position
    """
    return [
        {
            "name": row["column_name"],
            "type": map_bq_type(row["data_type"]),
        }
        for row in client.query(query).result()
    ]


def _resolve_freshness(row: dict) -> str:
    """Return the best available freshness timestamp as ISO8601.

    Uses storage_last_modified_time if Google has populated it (expected
    early April 2026). Falls back to current time with a warning.
    """
    if row.get("storage_last_modified_time"):
        return row["storage_last_modified_time"].isoformat()

    log.warning(
        "storage_last_modified_time is NULL for %s.%s — "
        "falling back to current time. Google's TABLE_STORAGE update "
        "for Iceberg tables may not have shipped yet.",
        row["table_schema"],
        row["table_name"],
    )
    return datetime.now(timezone.utc).isoformat()


def collect(
    project_id: str,
    datasets: list[str] | None = None,
    tables: list[str] | None = None,
    only_freshness_and_volume: bool = False,
    output_file: str = "metadata_output.json",
) -> dict:
    """Collect Iceberg table metadata and write a JSON manifest.

    When only_freshness_and_volume is True, skips the COLUMNS query and
    omits fields from the manifest. Use this for periodic hourly pushes
    after the initial full metadata push.
    """
    client = bigquery.Client(project=project_id)  # ← SUBSTITUTE: adjust auth if needed

    if only_freshness_and_volume:
        log.info("Running in freshness+volume only mode (skipping fields).")

    iceberg_tables = _fetch_iceberg_tables(client, project_id, datasets, tables)
    if not iceberg_tables:
        log.warning("No Iceberg tables found matching the criteria.")
        return {"resource_type": RESOURCE_TYPE, "assets": []}

    assets: list[dict] = []
    for row in iceberg_tables:
        dataset = row["table_schema"]
        name = row["table_name"]

        asset = {
            "name": name,
            "database": project_id,
            "schema": dataset,
            "type": "TABLE",
            "volume": {
                "row_count": row["total_rows"],
                "byte_count": row["current_physical_bytes"],
            },
            "freshness": {
                "last_updated_time": _resolve_freshness(row),
            },
        }

        if not only_freshness_and_volume:
            asset["description"] = None
            asset["fields"] = _fetch_columns(client, project_id, dataset, name)

        assets.append(asset)
        log.info(
            "Collected %s.%s.%s — rows=%s, bytes=%s",
            project_id, dataset, name,
            row["total_rows"], row["current_physical_bytes"],
        )

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "assets": assets,
    }
    with open(output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Manifest written to %s (%d assets)", output_file, len(assets))

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect BigQuery Iceberg table metadata into a JSON manifest",
    )
    parser.add_argument(
        "--project-id",
        default=os.getenv("BIGQUERY_PROJECT_ID"),  # ← SUBSTITUTE
        help="GCP project ID (or set BIGQUERY_PROJECT_ID env var)",
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        default=None,
        help="Limit to specific dataset(s). Omit to scan all datasets.",
    )
    parser.add_argument(
        "--tables",
        nargs="+",
        default=None,
        help="Limit to specific table name(s) within the datasets.",
    )
    parser.add_argument(
        "--only-freshness-and-volume",
        action="store_true",
        help="Skip field/schema collection — only collect freshness and volume. "
             "Use for periodic hourly pushes after the initial full metadata push.",
    )
    parser.add_argument("--output-file", default="metadata_output.json")
    args = parser.parse_args()

    if not args.project_id:
        parser.error("--project-id or BIGQUERY_PROJECT_ID env var is required")

    collect(
        project_id=args.project_id,
        datasets=args.datasets,
        tables=args.tables,
        only_freshness_and_volume=args.only_freshness_and_volume,
        output_file=args.output_file,
    )


if __name__ == "__main__":
    main()
