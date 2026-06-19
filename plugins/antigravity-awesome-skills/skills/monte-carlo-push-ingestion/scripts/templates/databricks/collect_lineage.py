"""
Databricks — Lineage Collection (collect-only)
================================================
Collects table-level and (optionally) column-level lineage from Databricks Unity
Catalog system tables (system.access.table_lineage and system.access.column_lineage).
No SQL parsing required — Databricks provides first-class lineage metadata.

Writes a JSON manifest file that can be consumed by push_lineage.py.

Substitution points (search for "← SUBSTITUTE"):
  - DATABRICKS_HOST       : workspace hostname
  - DATABRICKS_HTTP_PATH  : SQL warehouse HTTP path
  - DATABRICKS_TOKEN      : PAT or service-principal secret
  - LOOKBACK_DAYS         : how many days back to collect lineage (default 30)

Use the --column-lineage flag to also collect column-level lineage (disabled by default).

Prerequisites:
  pip install databricks-sql-connector
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from databricks import sql

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "databricks"
LOOKBACK_DAYS: int = int(os.getenv("LOOKBACK_DAYS", "30"))  # ← SUBSTITUTE


def _check_available_memory(min_gb: float = 2.0) -> None:
    """Warn if available memory is below the threshold."""
    try:
        if hasattr(os, "sysconf"):  # Linux / macOS
            page_size = os.sysconf("SC_PAGE_SIZE")
            avail_pages = os.sysconf("SC_AVPHYS_PAGES")
            avail_gb = (page_size * avail_pages) / (1024 ** 3)
        else:
            return  # Windows — skip check
    except (ValueError, OSError):
        return
    if avail_gb < min_gb:
        log.warning(
            "Only %.1f GB of memory available (minimum recommended: %.1f GB). "
            "Consider reducing the collection scope or increasing available memory.",
            avail_gb,
            min_gb,
        )


def _query(cursor: Any, sql_text: str) -> list[dict[str, Any]]:
    cursor.execute(sql_text)
    cols = [d[0] for d in cursor.description]
    rows = []
    while True:
        chunk = cursor.fetchmany(1000)
        if not chunk:
            break
        rows.extend(dict(zip(cols, row)) for row in chunk)
    return rows


def _parse_full_name(full_name: str) -> tuple[str, str, str]:
    """Split 'catalog.schema.table' into (catalog, schema, table)."""
    parts = (full_name or "").split(".")
    if len(parts) == 3:
        return parts[0], parts[1], parts[2]
    if len(parts) == 2:
        return "", parts[0], parts[1]
    return "", "", full_name


def collect_table_lineage(cursor: Any, lookback_days: int) -> list[dict[str, Any]]:
    rows = _query(
        cursor,
        f"""
        SELECT DISTINCT
            source_table_full_name,
            target_table_full_name,
            created_by,
            MAX(event_time) AS last_seen
        FROM system.access.table_lineage
        WHERE event_time >= DATEADD(DAY, -{lookback_days}, CURRENT_TIMESTAMP())
          AND source_table_full_name IS NOT NULL
          AND target_table_full_name IS NOT NULL
        GROUP BY source_table_full_name, target_table_full_name, created_by
        LIMIT 50000
        """,  # ← SUBSTITUTE: adjust lookback_days, LIMIT, or add catalog/schema filters
    )

    events: list[dict[str, Any]] = []
    for row in rows:
        src_catalog, src_schema, src_table = _parse_full_name(row["source_table_full_name"])
        dst_catalog, dst_schema, dst_table = _parse_full_name(row["target_table_full_name"])

        if not src_table or not dst_table:
            continue

        events.append({
            "sources": [{"database": src_catalog, "schema": src_schema, "asset_name": src_table}],
            "destination": {"database": dst_catalog, "schema": dst_schema, "asset_name": dst_table},
            "lineage_type": "table",
        })
    return events


def collect_column_lineage(cursor: Any, lookback_days: int) -> list[dict[str, Any]]:
    rows = _query(
        cursor,
        f"""
        SELECT DISTINCT
            source_table_full_name,
            source_column_name,
            target_table_full_name,
            target_column_name
        FROM system.access.column_lineage
        WHERE event_time >= DATEADD(DAY, -{lookback_days}, CURRENT_TIMESTAMP())
          AND source_table_full_name IS NOT NULL
          AND target_table_full_name IS NOT NULL
        LIMIT 50000
        """,  # ← SUBSTITUTE: adjust LIMIT or add catalog/schema filters if needed
    )

    # Group by destination table so we can build one event per destination
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        dst_key = row["target_table_full_name"]
        if dst_key not in grouped:
            grouped[dst_key] = {"dst_full": dst_key, "columns": []}
        grouped[dst_key]["columns"].append(row)

    events: list[dict[str, Any]] = []
    for dst_key, group in grouped.items():
        dst_catalog, dst_schema, dst_table = _parse_full_name(group["dst_full"])
        if not dst_table:
            continue

        col_fields: list[dict[str, Any]] = []
        for row in group["columns"]:
            src_catalog, src_schema, src_table = _parse_full_name(row["source_table_full_name"])
            col_fields.append({
                "destination_field": row["target_column_name"],
                "sources": [{
                    "database": src_catalog,
                    "schema": src_schema,
                    "asset_name": src_table,
                    "field": row["source_column_name"],
                }],
            })

        events.append({
            "sources": [],  # column lineage carries source refs inside col_fields
            "destination": {"database": dst_catalog, "schema": dst_schema, "asset_name": dst_table},
            "column_lineage": col_fields,
            "lineage_type": "column",
        })
    return events


def collect(
    host: str,
    http_path: str,
    token: str,
    manifest_path: str = "manifest_lineage.json",
    include_column_lineage: bool = False,
    lookback_days: int = LOOKBACK_DAYS,
) -> list[dict[str, Any]]:
    """Connect to Databricks, collect lineage, write a JSON manifest, and return events."""
    _check_available_memory(min_gb=2.0)
    collected_at = datetime.now(timezone.utc).isoformat()

    with sql.connect(
        server_hostname=host,    # ← SUBSTITUTE
        http_path=http_path,     # ← SUBSTITUTE
        access_token=token,      # ← SUBSTITUTE
    ) as conn:
        with conn.cursor() as cursor:
            table_events = collect_table_lineage(cursor, lookback_days)
            col_events = collect_column_lineage(cursor, lookback_days) if include_column_lineage else []

    all_events = table_events + col_events
    log.info(
        "Collected %d lineage events (%d table, %d column)",
        len(all_events), len(table_events), len(col_events),
    )

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": collected_at,
        "lookback_days": lookback_days,
        "table_lineage_events": len(table_events),
        "column_lineage_events": len(col_events),
        "events": all_events,
    }
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Manifest written to %s (%d events)", manifest_path, len(all_events))

    return all_events


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect Databricks lineage to a manifest file")
    parser.add_argument("--host", default=os.getenv("DATABRICKS_HOST"))           # ← SUBSTITUTE
    parser.add_argument("--http-path", default=os.getenv("DATABRICKS_HTTP_PATH")) # ← SUBSTITUTE
    parser.add_argument("--token", default=os.getenv("DATABRICKS_TOKEN"))         # ← SUBSTITUTE
    parser.add_argument("--lookback-days", type=int, default=LOOKBACK_DAYS)
    parser.add_argument(
        "--column-lineage", action="store_true",
        help="Also collect column-level lineage (requires system.access.column_lineage access)",
    )
    parser.add_argument("--manifest", default="manifest_lineage.json")
    args = parser.parse_args()

    required = ["host", "http_path", "token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    collect(
        host=args.host,
        http_path=args.http_path,
        token=args.token,
        manifest_path=args.manifest,
        include_column_lineage=args.column_lineage,
        lookback_days=args.lookback_days,
    )


if __name__ == "__main__":
    main()
