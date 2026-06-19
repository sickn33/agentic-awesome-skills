#!/usr/bin/env python3
"""
Collect table metadata from a Hive Metastore — collection only.

Connects to HiveServer2 (default port 10000), discovers all databases and
tables via SHOW DATABASES / SHOW TABLES, reads schema and table statistics
via DESCRIBE FORMATTED, then writes a JSON manifest file.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points
-------------------
- HIVE_HOST         (env) / --hive-host   (CLI) : HiveServer2 hostname
- HIVE_PORT         (env) / --hive-port   (CLI) : HiveServer2 port (default 10000)

Prerequisites
-------------
    pip install pyhive python-dotenv

Usage
-----
    python collect_metadata.py \\
        --hive-host <HIVESERVER2_HOSTNAME> \\
        --output-file metadata_output.json
"""

import argparse
import json
import os
import re
from datetime import datetime, timezone

from pyhive import hive


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
        print(
            f"WARNING: Only {avail_gb:.1f} GB of memory available "
            f"(minimum recommended: {min_gb:.1f} GB). "
            f"Consider reducing the number of databases/tables or increasing available memory."
        )

# ← SUBSTITUTE: set RESOURCE_TYPE to match your Monte Carlo connection type
RESOURCE_TYPE = "data-lake"

# Map Hive native types to SQL-standard uppercase types expected by Monte Carlo
_HIVE_TYPE_MAP: dict[str, str] = {
    "tinyint": "TINYINT",
    "smallint": "SMALLINT",
    "int": "INTEGER",
    "integer": "INTEGER",
    "bigint": "BIGINT",
    "float": "FLOAT",
    "double": "DOUBLE",
    "double precision": "DOUBLE",
    "decimal": "DECIMAL",
    "numeric": "DECIMAL",
    "boolean": "BOOLEAN",
    "string": "VARCHAR",
    "varchar": "VARCHAR",
    "char": "CHAR",
    "binary": "BINARY",
    "timestamp": "TIMESTAMP",
    "date": "DATE",
    "interval": "INTERVAL",
    "array": "ARRAY",
    "map": "MAP",
    "struct": "STRUCT",
    "uniontype": "UNION",
}

# ← SUBSTITUTE: add any internal table name prefixes you want to skip
_INTERNAL_TABLE_PREFIXES = ("tmp_", "__", "hive_")


def _normalize_hive_type(hive_type: str) -> str:
    """Uppercase and normalize a Hive type string to a SQL-standard form.

    Parametrized types like ``decimal(10,2)`` or ``varchar(255)`` keep their
    suffix; the base type is mapped through ``_HIVE_TYPE_MAP``.
    """
    lower = hive_type.lower().strip()
    base = lower.split("(")[0].strip()
    suffix = hive_type[len(base):].strip()  # preserve original params, e.g. decimal(10,2)
    return _HIVE_TYPE_MAP.get(base, base.upper()) + suffix


def _connect(host: str, port: int) -> hive.Connection:
    # ← SUBSTITUTE: update username/auth if your cluster requires Kerberos or LDAP
    return hive.connect(host=host, port=port, username="hadoop", auth="NONE")


def _fetch_rows(cursor, query: str) -> list[tuple]:
    """Execute a query and fetch results in memory-safe chunks."""
    cursor.execute(query)
    rows: list[tuple] = []
    while True:
        chunk = cursor.fetchmany(1000)
        if not chunk:
            break
        rows.extend(chunk)
    return rows


def _parse_describe_formatted(rows: list[tuple]) -> dict:
    """
    Parse DESCRIBE FORMATTED <db>.<table> output into a structured dict:
      columns, row_count, total_size, last_modified, description, created_on
    """
    result: dict = {
        "columns": [],
        "row_count": None,
        "total_size": None,
        "last_modified": None,
        "description": None,
        "created_on": None,
    }
    in_col_info = False
    in_table_info = False

    for row in rows:
        col_name = (row[0] or "").strip()
        data_type = (row[1] or "").strip()
        comment = (row[2] or "").strip() if len(row) > 2 else ""

        if col_name.startswith("# col_name"):
            in_col_info = True
            in_table_info = False
            continue
        if col_name.startswith("# Detailed Table Information"):
            in_col_info = False
            in_table_info = True
            continue
        if col_name.startswith("#"):
            in_col_info = False
            continue

        if in_col_info and col_name and data_type:
            result["columns"].append(
                {
                    "name": col_name,
                    "type": _normalize_hive_type(data_type),
                    "description": comment or None,
                }
            )

        if in_table_info:
            # Table Parameters rows have an empty col_name; key is in data_type, value in comment
            param_key = data_type.strip() if not col_name else col_name.strip().rstrip(":")
            param_val = (comment.strip() if not col_name else data_type.strip()) or ""

            if re.search(r"numRows", param_key, re.IGNORECASE):
                try:
                    result["row_count"] = int(param_val)
                except (ValueError, TypeError):
                    pass
            elif re.search(r"totalSize", param_key, re.IGNORECASE):
                try:
                    result["total_size"] = int(param_val)
                except (ValueError, TypeError):
                    pass
            elif re.search(r"last_modified_time", param_key, re.IGNORECASE):
                try:
                    result["last_modified"] = datetime.fromtimestamp(
                        int(param_val), tz=timezone.utc
                    ).isoformat()
                except (ValueError, TypeError):
                    pass
            elif re.search(r"^CreateTime", param_key):
                # e.g. "Wed Mar 18 20:15:40 UTC 2026"
                try:
                    result["created_on"] = datetime.strptime(
                        param_val, "%a %b %d %H:%M:%S %Z %Y"
                    ).replace(tzinfo=timezone.utc).isoformat()
                except (ValueError, TypeError):
                    pass
            elif param_key == "comment" and not result["description"] and param_val:
                result["description"] = param_val

    return result


def collect(
    hive_host: str,
    hive_port: int = 10000,
) -> dict:
    """
    Connect to HiveServer2, discover all databases and tables, and return a
    manifest dict with collected asset metadata.

    Args:
        hive_host: HiveServer2 hostname.
        hive_port: HiveServer2 port (default 10000).

    Returns:
        Manifest dict with keys: resource_type, collected_at, assets.
    """
    _check_available_memory()
    print(f"Connecting to HiveServer2 at {hive_host}:{hive_port} ...")
    conn = _connect(hive_host, hive_port)
    cursor = conn.cursor()
    assets: list[dict] = []

    print("Collecting table metadata ...")
    databases = [row[0] for row in _fetch_rows(cursor, "SHOW DATABASES")]
    print(f"  Found databases: {databases}")

    for db in databases:
        # ← SUBSTITUTE: add any system databases you want to skip
        if db in ("information_schema",):
            continue

        tables = _fetch_rows(cursor, f"SHOW TABLES IN {db}")
        table_names = [row[0] for row in tables]
        print(f"  {db}: {len(table_names)} table(s)")

        for table in table_names:
            if any(table.startswith(p) for p in _INTERNAL_TABLE_PREFIXES):
                continue

            try:
                desc_rows = _fetch_rows(cursor, f"DESCRIBE FORMATTED {db}.{table}")
            except Exception as exc:
                print(f"    WARNING: could not describe {db}.{table}: {exc}")
                continue

            info = _parse_describe_formatted(desc_rows)

            row_count = info["row_count"] if info["row_count"] and info["row_count"] > 0 else None
            byte_count = info["total_size"] if info["total_size"] and info["total_size"] > 0 else None

            assets.append(
                {
                    "database": db,
                    "schema": db,
                    "name": table,
                    "description": info["description"],
                    "created_on": info["created_on"],
                    "row_count": row_count,
                    "byte_count": byte_count,
                    "last_modified": info["last_modified"],
                    "fields": [
                        {"name": col["name"], "type": col["type"], "description": col["description"]}
                        for col in info["columns"]
                    ],
                }
            )
            print(
                f"    + {db}.{table} ({len(info['columns'])} columns, "
                f"desc={info['description']!r}, created={info['created_on']})"
            )

    cursor.close()
    conn.close()
    print(f"\nCollected {len(assets)} table(s).")

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": datetime.now(tz=timezone.utc).isoformat(),
        "assets": assets,
    }
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Hive table metadata and write a JSON manifest",
    )
    parser.add_argument(
        "--hive-host",
        default=os.environ.get("HIVE_HOST"),
        help="HiveServer2 hostname (env: HIVE_HOST)",  # ← SUBSTITUTE: your EMR master DNS or Hive host
    )
    parser.add_argument(
        "--hive-port",
        type=int,
        default=10000,
        help="HiveServer2 port (default: 10000)",  # ← SUBSTITUTE if your cluster uses a non-standard port
    )
    parser.add_argument(
        "--output-file",
        default="metadata_output.json",
        help="Path to write the output manifest (default: metadata_output.json)",
    )
    args = parser.parse_args()

    if not args.hive_host:
        parser.error("--hive-host is required (or set HIVE_HOST)")

    manifest = collect(
        hive_host=args.hive_host,
        hive_port=args.hive_port,
    )

    with open(args.output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Asset manifest written to {args.output_file}")
    print("Done.")


if __name__ == "__main__":
    main()
