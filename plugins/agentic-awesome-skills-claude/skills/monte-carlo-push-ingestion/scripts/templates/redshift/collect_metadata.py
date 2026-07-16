"""
Redshift — Metadata Collection (collect-only)
===============================================
Collects table schemas, row counts, and byte sizes from Amazon Redshift using
SVV system views, then writes a JSON manifest file that can be consumed by
push_metadata.py.

Substitution points (search for "← SUBSTITUTE"):
  - REDSHIFT_HOST     : Redshift cluster endpoint or serverless workgroup endpoint
  - REDSHIFT_DB       : database name to connect to
  - REDSHIFT_USER     : database user (or IAM role user)
  - REDSHIFT_PASSWORD : database password
  - DB_EXCLUSIONS     : databases to skip
  - SCHEMA_EXCLUSIONS : schemas to skip in every database

Prerequisites:
  pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras
from _safe_paths import safe_existing_directory, safe_input_json_path, safe_output_json_path, write_json_file

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "redshift"

DB_EXCLUSIONS: set[str] = {"dev", "padb_harvest"}  # ← SUBSTITUTE: add internal databases

SCHEMA_EXCLUSIONS: set[str] = {  # ← SUBSTITUTE: add internal schemas
    "information_schema",
    "pg_catalog",
    "pg_internal",
    "catalog_history",
}

_ALLOWED_REDSHIFT_HOST_RE = re.compile(
    r"^[a-z0-9][a-z0-9.-]*\.(?:redshift|redshift-serverless)\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$",
    re.IGNORECASE,
)


def _sql_literal(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def _explicitly_allowed_redshift_hosts() -> set[str]:
    raw_hosts = os.getenv("REDSHIFT_ALLOWED_HOSTS", "")
    return {host.strip().lower().rstrip(".") for host in raw_hosts.split(",") if host.strip()}


def validate_redshift_host(host: str, *, allow_private: bool = False) -> str:
    value = str(host).strip()
    if not value or any(part in value for part in ("/", "\\", "@", ":")):
        raise ValueError(f"Invalid Redshift host: {host!r}")
    hostname = value.lower().rstrip(".")
    allowed_hosts = _explicitly_allowed_redshift_hosts()
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        if hostname in allowed_hosts:
            return hostname
        match = _ALLOWED_REDSHIFT_HOST_RE.fullmatch(hostname)
        if match:
            return match.group(0)
        raise ValueError(
            "Redshift host must be an AWS Redshift endpoint or be listed in REDSHIFT_ALLOWED_HOSTS"
        )
    if hostname not in allowed_hosts:
        raise ValueError("Redshift IP hosts must be listed in REDSHIFT_ALLOWED_HOSTS")
    blocked = (
        address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_unspecified
        or address.is_reserved
        or (address.is_private and not allow_private)
    )
    if blocked:
        raise ValueError(f"Redshift host address is not allowed: {host!r}")
    return str(address)


def _bounded_int(value: int, field: str, *, minimum: int, maximum: int) -> int:
    value = int(value)
    if value < minimum or value > maximum:
        raise ValueError(f"{field} must be between {minimum} and {maximum}")
    return value


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


def _dictfetch(cursor: Any, sql: str, params: tuple | None = None) -> list[dict[str, Any]]:
    cursor.execute(sql, params)
    cols = [d.name for d in cursor.description]
    rows = []
    while True:
        chunk = cursor.fetchmany(1000)
        if not chunk:
            break
        rows.extend(dict(zip(cols, row)) for row in chunk)
    return rows


def collect_databases(cursor: Any) -> list[str]:
    rows = _dictfetch(
        cursor,
        "SELECT database_name FROM svv_redshift_databases ORDER BY database_name",
    )
    return [r["database_name"] for r in rows if r["database_name"] not in DB_EXCLUSIONS]


def collect_tables(cursor: Any, db: str) -> list[dict[str, Any]]:
    schema_list = ", ".join(_sql_literal(s) for s in sorted(SCHEMA_EXCLUSIONS))
    return _dictfetch(
        cursor,
        f"""
        SELECT
            database      AS db,
            schema,
            "table"       AS table_name,
            "rows"        AS row_count,
            size * 1024 * 1024 AS byte_count
        FROM svv_table_info
        WHERE database = %s
          AND schema NOT IN ({schema_list})
        ORDER BY schema, "table"
        """,  # ← SUBSTITUTE: add additional WHERE clauses to narrow scope
        (db,),
    )


def collect_columns(cursor: Any, db: str, schema: str, table: str) -> list[dict[str, Any]]:
    return _dictfetch(
        cursor,
        """
        SELECT column_name, data_type, remarks AS comment
        FROM svv_columns
        WHERE table_catalog = %s
          AND table_schema  = %s
          AND table_name    = %s
        ORDER BY ordinal_position
        """,
        (db, schema, table),
    )


def collect(
    host: str,
    db: str,
    user: str,
    password: str,
    manifest_path: str = "manifest_metadata.json",
    port: int = 5439,
) -> list[dict[str, Any]]:
    """Connect to Redshift, collect metadata, write a JSON manifest, and return asset dicts."""
    _check_available_memory()
    allow_private_host = os.getenv("REDSHIFT_ALLOW_PRIVATE_HOST", "").lower() in {"1", "true", "yes"}
    host = validate_redshift_host(host, allow_private=allow_private_host)
    port = _bounded_int(port, "port", minimum=1, maximum=65535)
    collected_at = datetime.now(timezone.utc).isoformat()
    assets: list[dict[str, Any]] = []

    conn = psycopg2.connect(
        host=host,          # ← SUBSTITUTE
        port=port,
        dbname=db,          # ← SUBSTITUTE
        user=user,          # ← SUBSTITUTE
        password=password,  # ← SUBSTITUTE
        connect_timeout=30,
    )
    try:
        with conn.cursor() as cursor:
            databases = collect_databases(cursor)
            log.info("Found databases: %s", databases)

            for database in databases:
                tables = collect_tables(cursor, database)
                log.info("Database %s — %d tables", database, len(tables))

                for t in tables:
                    schema = t["schema"]
                    table_name = t["table_name"]

                    columns = collect_columns(cursor, database, schema, table_name)
                    fields = [
                        {
                            "name": col["column_name"],
                            "type": col["data_type"].upper(),
                            "description": col.get("comment") or None,
                        }
                        for col in columns
                    ]

                    asset = {
                        "asset_name": table_name,
                        "database": database,   # ← SUBSTITUTE: use database as top-level namespace
                        "schema": schema,
                        "asset_type": "TABLE",
                        "fields": fields,
                        "row_count": t.get("row_count"),
                        "byte_count": t.get("byte_count"),
                    }
                    assets.append(asset)
                    log.info("Collected %s.%s.%s", database, schema, table_name)
    finally:
        conn.close()

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": collected_at,
        "asset_count": len(assets),
        "assets": assets,
    }
    write_json_file(manifest_path, manifest)
    log.info("Manifest written to %s (%d assets)", manifest_path, len(assets))

    return assets


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect Redshift metadata to a manifest file")
    parser.add_argument("--db", default=os.getenv("REDSHIFT_DB"))             # ← SUBSTITUTE
    parser.add_argument("--user", default=os.getenv("REDSHIFT_USER"))         # ← SUBSTITUTE
    parser.add_argument("--password", default=os.getenv("REDSHIFT_PASSWORD")) # ← SUBSTITUTE
    parser.add_argument("--port", type=int, default=int(os.getenv("REDSHIFT_PORT", "5439")))
    parser.add_argument("--manifest", default="manifest_metadata.json")
    args = parser.parse_args()

    required = ["db", "user", "password"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    redshift_host = os.getenv("REDSHIFT_HOST")
    if not redshift_host:
        parser.error("Missing required env var: REDSHIFT_HOST")
    redshift_host = validate_redshift_host(
        redshift_host,
        allow_private=os.getenv("REDSHIFT_ALLOW_PRIVATE_HOST", "").lower() in {"1", "true", "yes"},
    )

    collect(
        host=redshift_host,
        db=args.db,
        user=args.user,
        password=args.password,
        manifest_path=args.manifest,
        port=args.port,
    )


if __name__ == "__main__":
    main()
