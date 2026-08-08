"""
Databricks — Metadata Collection (collect-only)
=================================================
Collects table schemas, row counts, and byte sizes from Databricks Unity Catalog
using INFORMATION_SCHEMA and DESCRIBE DETAIL, then writes a JSON manifest file
that can be consumed by push_metadata.py.

Substitution points (search for "← SUBSTITUTE"):
  - DATABRICKS_HOST       : workspace hostname (e.g. adb-1234.azuredatabricks.net)
  - DATABRICKS_HTTP_PATH  : SQL warehouse HTTP path (e.g. /sql/1.0/warehouses/abc123)
  - DATABRICKS_TOKEN      : personal access token or service-principal secret
  - DATABRICKS_CATALOG    : catalog to collect from (default: "hive_metastore" or "main")
  - SCHEMA_EXCLUSIONS     : schemas to skip

Prerequisites:
  pip install databricks-sql-connector
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from databricks import sql
from _safe_paths import safe_existing_directory, safe_input_json_path, safe_output_json_path, write_json_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "databricks"
_SAFE_DATABRICKS_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

# Schemas to skip across all catalogs
SCHEMA_EXCLUSIONS: set[str] = {  # ← SUBSTITUTE: add any internal schemas to skip
    "information_schema",
    "__databricks_internal",
}


def _quote_identifier(identifier: str) -> str:
    value = str(identifier).strip()
    if not value:
        raise ValueError("Identifier must not be empty")
    if not _SAFE_DATABRICKS_IDENTIFIER_RE.fullmatch(value):
        raise ValueError(
            "Databricks identifier contains characters outside the safe default set"
        )
    return "`" + value.replace("`", "``") + "`"


def _sql_literal(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


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


def _fetch_dict_rows(cursor: Any) -> list[dict[str, Any]]:
    cols = [d[0] for d in cursor.description]
    rows = []
    while True:
        chunk = cursor.fetchmany(1000)
        if not chunk:
            break
        rows.extend(dict(zip(cols, row)) for row in chunk)
    return rows


def collect_tables(cursor: Any, catalog: str) -> list[dict[str, Any]]:
    exclusions = sorted(SCHEMA_EXCLUSIONS)
    placeholders = ", ".join(["%s"] * len(exclusions))
    cursor.execute(
        f"""
        SELECT table_catalog, table_schema, table_name, table_type, comment
        FROM system.information_schema.tables
        WHERE table_catalog = %s AND table_schema NOT IN ({placeholders})
        ORDER BY table_schema, table_name
        """,  # ← SUBSTITUTE: add additional WHERE filters if needed
        (catalog, *exclusions),
    )
    return _fetch_dict_rows(cursor)


def collect_columns(cursor: Any, catalog: str, schema: str, table: str) -> list[dict[str, Any]]:
    cursor.execute(
        """
        SELECT column_name, data_type, comment
        FROM system.information_schema.columns
        WHERE table_catalog = %s AND table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
        """,
        (catalog, schema, table),
    )
    return _fetch_dict_rows(cursor)


def collect_detail(cursor: Any, catalog: str, schema: str, table: str) -> dict[str, Any] | None:
    try:
        cursor.execute(
            "DESCRIBE DETAIL "
            f"{_quote_identifier(catalog)}.{_quote_identifier(schema)}.{_quote_identifier(table)}",
        )
        rows = _fetch_dict_rows(cursor)
        return rows[0] if rows else None
    except Exception:
        log.debug("DESCRIBE DETAIL failed for %s.%s.%s", catalog, schema, table, exc_info=True)
        return None


def collect(
    host: str,
    http_path: str,
    token: str,
    catalog: str,
    manifest_path: str = "manifest_metadata.json",
) -> list[dict[str, Any]]:
    """Connect to Databricks, collect metadata, write a JSON manifest, and return the asset dicts.

    The manifest contains serialised asset dicts that push_metadata.py can read.
    """
    _check_available_memory(min_gb=2.0)
    collected_at = datetime.now(timezone.utc).isoformat()
    assets: list[dict[str, Any]] = []

    with sql.connect(
        server_hostname=host,    # ← SUBSTITUTE
        http_path=http_path,     # ← SUBSTITUTE
        access_token=token,      # ← SUBSTITUTE
    ) as conn:
        with conn.cursor() as cursor:
            tables = collect_tables(cursor, catalog)
            log.info("Found %d tables in catalog %s", len(tables), catalog)

            for row in tables:
                schema = row["table_schema"]
                table_name = row["table_name"]

                columns = collect_columns(cursor, catalog, schema, table_name)
                fields = [
                    {
                        "name": col["column_name"],
                        "type": col["data_type"].upper(),
                        "description": col.get("comment") or None,
                    }
                    for col in columns
                ]

                detail = collect_detail(cursor, catalog, schema, table_name)
                row_count: int | None = None
                byte_count: int | None = None
                last_updated: str | None = None
                if detail:
                    row_count = detail.get("numRows")
                    byte_count = detail.get("sizeInBytes")
                    last_modified = detail.get("lastModified")
                    if last_modified:
                        last_updated = (
                            last_modified.isoformat()
                            if hasattr(last_modified, "isoformat")
                            else str(last_modified)
                        )

                asset = {
                    "asset_name": table_name,
                    "database": catalog,    # ← SUBSTITUTE: use catalog as database
                    "schema": schema,
                    "asset_type": "VIEW" if row.get("table_type", "").upper() == "VIEW" else "TABLE",
                    "description": row.get("comment") or None,
                    "fields": fields,
                    "row_count": row_count,
                    "byte_count": byte_count,
                    "last_updated": last_updated,
                }
                assets.append(asset)
                log.info("Collected %s.%s.%s", catalog, schema, table_name)

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": collected_at,
        "catalog": catalog,
        "asset_count": len(assets),
        "assets": assets,
    }
    write_json_file(manifest_path, manifest)
    log.info("Manifest written to %s (%d assets)", manifest_path, len(assets))

    return assets


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect Databricks metadata to a manifest file")
    parser.add_argument("--host", default=os.getenv("DATABRICKS_HOST"))           # ← SUBSTITUTE
    parser.add_argument("--http-path", default=os.getenv("DATABRICKS_HTTP_PATH")) # ← SUBSTITUTE
    parser.add_argument("--token", default=os.getenv("DATABRICKS_TOKEN"))         # ← SUBSTITUTE
    parser.add_argument("--catalog", default=os.getenv("DATABRICKS_CATALOG", "hive_metastore"))
    parser.add_argument("--manifest", default="manifest_metadata.json")
    args = parser.parse_args()

    required = ["host", "http_path", "token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    collect(
        host=args.host,
        http_path=args.http_path,
        token=args.token,
        catalog=args.catalog,
        manifest_path=args.manifest,
    )


if __name__ == "__main__":
    main()
