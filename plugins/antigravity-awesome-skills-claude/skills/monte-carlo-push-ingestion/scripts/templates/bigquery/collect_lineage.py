"""
BigQuery — Lineage Collection (collect only)
=============================================
Collects table-level lineage from two sources:
  1. INFORMATION_SCHEMA.SCHEMATA_LINKS — cross-project dataset shares (per region)
  2. Job query history — SQL parsing for CREATE TABLE AS SELECT and INSERT INTO
     SELECT patterns to derive source->destination relationships.

Writes the collected lineage edges to a JSON manifest file.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points (search for "← SUBSTITUTE"):
  - BIGQUERY_PROJECT_ID   : GCP project ID to collect from
  - BIGQUERY_REGION       : BigQuery region for INFORMATION_SCHEMA queries (e.g. "us", "eu")
  - LOOKBACK_HOURS        : how far back to scan job history (default 24 h)

Prerequisites:
  pip install google-cloud-bigquery
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
from datetime import datetime, timedelta, timezone

from google.cloud import bigquery

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "bigquery"
LOOKBACK_HOURS = int(os.getenv("LOOKBACK_HOURS", "24"))  # ← SUBSTITUTE: adjust lookback window

# Regex patterns to detect CTAS and INSERT INTO SELECT in BigQuery SQL
_CTAS_PATTERN = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW)\s+`?(?P<dest>[\w.\-]+)`?"
    r".*?(?:AS\s+)?SELECT\b",
    re.IGNORECASE | re.DOTALL,
)
_INSERT_PATTERN = re.compile(
    r"INSERT\s+(?:INTO\s+)?`?(?P<dest>[\w.\-]+)`?.*?SELECT\b",
    re.IGNORECASE | re.DOTALL,
)
_TABLE_REF_PATTERN = re.compile(r"`?([\w\-]+\.[\w\-]+\.[\w\-]+)`?", re.IGNORECASE)


def _parse_full_name(full_name: str) -> tuple[str, str, str]:
    """Split 'project.dataset.table' into (project, dataset, table)."""
    parts = full_name.replace("`", "").split(".")
    if len(parts) == 3:
        return parts[0], parts[1], parts[2]
    if len(parts) == 2:
        return "", parts[0], parts[1]
    return "", "", parts[0]


def _collect_schema_link_lineage(
    bq_client: bigquery.Client,
    project_id: str,
    region: str,
) -> list[dict]:
    """Collect cross-project lineage from INFORMATION_SCHEMA.SCHEMATA_LINKS."""
    query = f"""
        SELECT
            CATALOG_NAME            AS source_project,
            SCHEMA_NAME             AS source_dataset,
            LINKED_SCHEMA_CATALOG_NAME AS destination_project,
            LINKED_SCHEMA_NAME      AS destination_dataset
        FROM `{project_id}`.`{region}`.INFORMATION_SCHEMA.SCHEMATA_LINKS
    """  # ← SUBSTITUTE: update project_id and region as needed
    edges: list[dict] = []
    try:
        for row in bq_client.query(query).result():
            edges.append(
                {
                    "destination": {
                        "database": row.destination_project,
                        "schema": row.destination_dataset,
                        "table": "*",
                    },
                    "sources": [
                        {
                            "database": row.source_project,
                            "schema": row.source_dataset,
                            "table": "*",
                        }
                    ],
                }
            )
    except Exception:
        log.warning("SCHEMATA_LINKS query failed — skipping dataset-share lineage", exc_info=True)
    return edges


def _collect_query_lineage(
    bq_client: bigquery.Client,
    project_id: str,
    lookback_hours: int,
) -> list[dict]:
    """Derive lineage by parsing CTAS/INSERT patterns in job query history."""
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(hours=lookback_hours)

    edges: list[dict] = []
    for job in bq_client.list_jobs(all_users=True, min_creation_time=start_dt, max_creation_time=end_dt):
        sql: str = getattr(job, "query", None) or ""
        if not sql.strip():
            continue

        dest_match = _CTAS_PATTERN.search(sql) or _INSERT_PATTERN.search(sql)
        if not dest_match:
            continue

        dest_full = dest_match.group("dest")
        dest_project, dest_dataset, dest_table = _parse_full_name(dest_full)
        if not dest_table:
            continue

        # Collect all 3-part table references in the query as sources, excluding destination
        source_refs = [
            m.group(1)
            for m in _TABLE_REF_PATTERN.finditer(sql)
            if m.group(1) != dest_full
        ]
        if not source_refs:
            continue

        unique_sources = list(dict.fromkeys(source_refs))
        sources = []
        for ref in unique_sources:
            p, d, t = _parse_full_name(ref)
            sources.append({"database": p, "schema": d, "table": t})

        edges.append(
            {
                "destination": {
                    "database": dest_project or project_id,
                    "schema": dest_dataset,
                    "table": dest_table,
                },
                "sources": sources,
            }
        )

    return edges


def collect(
    project_id: str,
    region: str = "us",
    lookback_hours: int = LOOKBACK_HOURS,
    output_file: str = "lineage_output.json",
) -> dict:
    """
    Connect to BigQuery, collect lineage edges, and write a JSON manifest.

    Returns the manifest dict.
    """
    bq_client = bigquery.Client(project=project_id)

    log.info("Collecting lineage from project %s ...", project_id)
    schema_edges = _collect_schema_link_lineage(bq_client, project_id, region)
    query_edges = _collect_query_lineage(bq_client, project_id, lookback_hours)
    all_edges = schema_edges + query_edges

    log.info(
        "Collected %d lineage edges (%d schema-link, %d query-derived)",
        len(all_edges), len(schema_edges), len(query_edges),
    )

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "schema_link_edges": len(schema_edges),
        "query_derived_edges": len(query_edges),
        "edges": all_edges,
    }
    with open(output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Lineage manifest written to %s", output_file)

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect BigQuery lineage and write to a manifest file",
    )
    parser.add_argument("--project-id", default=os.getenv("BIGQUERY_PROJECT_ID"))  # ← SUBSTITUTE
    parser.add_argument("--region", default=os.getenv("BIGQUERY_REGION", "us"))    # ← SUBSTITUTE
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--output-file", default="lineage_output.json")
    args = parser.parse_args()

    required = ["project_id"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    collect(
        project_id=args.project_id,
        region=args.region,
        lookback_hours=args.lookback_hours,
        output_file=args.output_file,
    )


if __name__ == "__main__":
    main()
