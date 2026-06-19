#!/usr/bin/env python3
"""
Collect table and column lineage from Snowflake — collection only.

Queries ACCOUNT_USAGE for DML/DDL statements in the last 24 hours, parses each
QUERY_TEXT with regex to extract source and destination tables, then writes the
resulting lineage edges to a JSON manifest file.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Note: ACCOUNT_USAGE views have an approximate latency of 45 minutes, so very
recent queries may not yet appear.

Substitution points
-------------------
- SNOWFLAKE_ACCOUNT    (env) / --account    (CLI) : Snowflake account identifier
- SNOWFLAKE_USER       (env) / --user       (CLI) : Snowflake username
- SNOWFLAKE_PASSWORD   (env) / --password   (CLI) : Snowflake password
- SNOWFLAKE_WAREHOUSE  (env) / --warehouse  (CLI) : Snowflake virtual warehouse

Prerequisites
-------------
    pip install snowflake-connector-python

Usage (table-level):
    python collect_lineage.py \\
        --account  <SNOWFLAKE_ACCOUNT> \\
        --user     <SNOWFLAKE_USER> \\
        --password <SNOWFLAKE_PASSWORD> \\
        --warehouse <SNOWFLAKE_WAREHOUSE>

Usage (column-level):
    python collect_lineage.py ... --column-lineage
"""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

import snowflake.connector

# ← SUBSTITUTE: set RESOURCE_TYPE to match your Monte Carlo connection type
RESOURCE_TYPE = "snowflake"


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
            f"Consider reducing the lookback window or increasing available memory."
        )

# Hours to look back in ACCOUNT_USAGE.QUERY_HISTORY
# ← SUBSTITUTE: adjust the lookback window to match your collection cadence
_LOOKBACK_HOURS = 24

# Regex for CTAS: CREATE [OR REPLACE] [TRANSIENT] TABLE [IF NOT EXISTS] [db.][schema.]table AS SELECT
_CTAS_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
    r"(?:(?P<dest_db>\w+)\.)?(?:(?P<dest_schema>\w+)\.)?(?P<dest_table>\w+)"
    r".*?AS\s+SELECT\s+(?P<select_cols>.+?)\s+FROM\s+"
    r"(?:(?P<src_db>\w+)\.)?(?:(?P<src_schema>\w+)\.)?(?P<src_table>\w+)",
    re.IGNORECASE | re.DOTALL,
)

# Regex for INSERT INTO [db.][schema.]table SELECT ... FROM [db.][schema.]table
_INSERT_RE = re.compile(
    r"INSERT\s+(?:INTO|OVERWRITE)\s+"
    r"(?:(?P<dest_db>\w+)\.)?(?:(?P<dest_schema>\w+)\.)?(?P<dest_table>\w+)"
    r".*?SELECT\s+(?P<select_cols>.+?)\s+FROM\s+"
    r"(?:(?P<src_db>\w+)\.)?(?:(?P<src_schema>\w+)\.)?(?P<src_table>\w+)",
    re.IGNORECASE | re.DOTALL,
)

# Regex for CREATE [OR REPLACE] VIEW [db.][schema.]view AS SELECT ... FROM ...
_CREATE_VIEW_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?(?:SECURE\s+)?VIEW\s+"
    r"(?:(?P<dest_db>\w+)\.)?(?:(?P<dest_schema>\w+)\.)?(?P<dest_table>\w+)"
    r".*?AS\s+SELECT\s+(?P<select_cols>.+?)\s+FROM\s+"
    r"(?:(?P<src_db>\w+)\.)?(?:(?P<src_schema>\w+)\.)?(?P<src_table>\w+)",
    re.IGNORECASE | re.DOTALL,
)

# Additional JOIN sources
_JOIN_RE = re.compile(
    r"JOIN\s+(?:(?P<src_db>\w+)\.)?(?:(?P<src_schema>\w+)\.)?(?P<src_table>\w+)",
    re.IGNORECASE,
)

# Simple column alias extraction from SELECT clause
_COL_RE = re.compile(r"(?:(\w+)\.)?(\w+)(?:\s+AS\s+(\w+))?", re.IGNORECASE)
_SQL_KEYWORDS = {
    "FROM", "SELECT", "WHERE", "JOIN", "ON", "AS", "*", "AND", "OR",
    "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "DISTINCT", "CASE", "WHEN",
    "THEN", "ELSE", "END", "NULL", "NOT", "IN", "IS", "BETWEEN",
}


@dataclass
class _LineageEdge:
    dest_db: str
    dest_schema: str
    dest_table: str
    sources: list[tuple[str, str, str]] = field(default_factory=list)
    # col_mappings: (dest_col, src_table, src_col)
    col_mappings: list[tuple[str, str, str]] = field(default_factory=list)


def _parse_select_cols(select_clause: str, src_table: str) -> list[tuple[str, str, str]]:
    mappings = []
    for m in _COL_RE.finditer(select_clause):
        src_col = m.group(2)
        dest_col = m.group(3) or src_col
        if src_col.upper() in _SQL_KEYWORDS:
            continue
        mappings.append((dest_col, src_table, src_col))
    return mappings


def _parse_edges(rows: list[dict]) -> list[_LineageEdge]:
    """Parse QUERY_HISTORY rows into _LineageEdge objects."""
    edges: dict[str, _LineageEdge] = {}

    for row in rows:
        query_text = row.get("QUERY_TEXT") or ""
        default_db = (row.get("DATABASE_NAME") or "").lower()
        sql_clean = re.sub(r"\s+", " ", query_text).strip()

        for pattern in (_CTAS_RE, _INSERT_RE, _CREATE_VIEW_RE):
            m = pattern.search(sql_clean)
            if not m:
                continue

            dest_db = (m.group("dest_db") or default_db).lower()
            dest_schema = (m.group("dest_schema") or "public").lower()
            dest_table = m.group("dest_table").lower()
            src_db = (m.group("src_db") or default_db).lower()
            src_schema = (m.group("src_schema") or "public").lower()
            src_table = m.group("src_table").lower()
            select_cols = m.group("select_cols")

            key = f"{dest_db}.{dest_schema}.{dest_table}"
            if key not in edges:
                edges[key] = _LineageEdge(
                    dest_db=dest_db, dest_schema=dest_schema, dest_table=dest_table
                )

            edge = edges[key]
            src_triple = (src_db, src_schema, src_table)
            if src_triple not in edge.sources:
                edge.sources.append(src_triple)

            for jm in _JOIN_RE.finditer(sql_clean):
                jt = jm.group("src_table").lower()
                jschema = (jm.group("src_schema") or src_schema).lower()
                jdb = (jm.group("src_db") or src_db).lower()
                jp = (jdb, jschema, jt)
                if jp not in edge.sources:
                    edge.sources.append(jp)

            edge.col_mappings.extend(_parse_select_cols(select_cols, src_table))
            break

    return list(edges.values())


def _fetch_query_history(conn, lookback_hours: int) -> list[dict]:
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT QUERY_ID, QUERY_TEXT, START_TIME, END_TIME, USER_NAME, DATABASE_NAME, EXECUTION_STATUS
        FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
        WHERE START_TIME >= DATEADD(hour, -{lookback_hours}, CURRENT_TIMESTAMP())
          AND EXECUTION_STATUS = 'SUCCESS'
          AND QUERY_TYPE IN ('CREATE_TABLE_AS_SELECT', 'INSERT', 'MERGE', 'CREATE_VIEW')
        ORDER BY START_TIME
        LIMIT 50000
        """
        # ← SUBSTITUTE: adjust QUERY_TYPE list, LIMIT, or add a WHERE clause to scope to specific databases
    )
    columns = [col[0] for col in cursor.description]
    rows = []
    while True:
        batch = cursor.fetchmany(1000)
        if not batch:
            break
        rows.extend(dict(zip(columns, row)) for row in batch)
    cursor.close()
    return rows


def collect(
    account: str,
    user: str,
    password: str,
    warehouse: str,
    lookback_hours: int = _LOOKBACK_HOURS,
    column_lineage: bool = False,
    output_file: str = "lineage_output.json",
) -> dict:
    """
    Connect to Snowflake, collect lineage edges, and write a JSON manifest.

    Returns the manifest dict.
    """
    _check_available_memory()
    print(f"Connecting to Snowflake account: {account} ...")
    conn = snowflake.connector.connect(
        account=account,
        user=user,
        password=password,
        warehouse=warehouse,
    )

    print(f"Fetching QUERY_HISTORY for the last {lookback_hours} hour(s) ...")
    rows = _fetch_query_history(conn, lookback_hours)
    conn.close()
    print(f"  Retrieved {len(rows)} qualifying query/queries.")

    if not rows:
        print("No lineage queries found in the specified window.")
        manifest = {
            "resource_type": RESOURCE_TYPE,
            "collected_at": datetime.now(tz=timezone.utc).isoformat(),
            "column_lineage": column_lineage,
            "edges": [],
        }
        with open(output_file, "w") as fh:
            json.dump(manifest, fh, indent=2)
        return manifest

    edges = _parse_edges(rows)
    print(f"  Parsed {len(edges)} lineage edge(s).")

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": datetime.now(tz=timezone.utc).isoformat(),
        "column_lineage": column_lineage,
        "edges": [
            {
                "destination": {
                    "database": e.dest_db,
                    "schema": e.dest_schema,
                    "table": e.dest_table,
                },
                "sources": [
                    {"database": sdb, "schema": sschema, "table": stbl}
                    for sdb, sschema, stbl in e.sources
                ],
                "col_mappings": [
                    {"dest_col": dc, "src_table": st, "src_col": sc}
                    for dc, st, sc in e.col_mappings
                ],
            }
            for e in edges
        ],
    }
    with open(output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Lineage manifest written to {output_file}")

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Snowflake lineage from ACCOUNT_USAGE and write to a manifest file",
    )
    parser.add_argument(
        "--account",
        default=os.environ.get("SNOWFLAKE_ACCOUNT"),
        help="Snowflake account identifier (env: SNOWFLAKE_ACCOUNT)",
    )
    parser.add_argument(
        "--user",
        default=os.environ.get("SNOWFLAKE_USER"),
        help="Snowflake username (env: SNOWFLAKE_USER)",
    )
    parser.add_argument(
        "--password",
        default=os.environ.get("SNOWFLAKE_PASSWORD"),
        help="Snowflake password (env: SNOWFLAKE_PASSWORD)",
    )
    parser.add_argument(
        "--warehouse",
        default=os.environ.get("SNOWFLAKE_WAREHOUSE"),
        help="Snowflake virtual warehouse (env: SNOWFLAKE_WAREHOUSE)",
    )
    parser.add_argument(
        "--lookback-hours",
        type=int,
        default=_LOOKBACK_HOURS,
        help=f"Hours of QUERY_HISTORY to scan (default: {_LOOKBACK_HOURS})",
    )
    parser.add_argument(
        "--column-lineage",
        action="store_true",
        help="Include column-level lineage mappings in the manifest",
    )
    parser.add_argument(
        "--output-file",
        default="lineage_output.json",
        help="Path to write the lineage manifest (default: lineage_output.json)",
    )
    args = parser.parse_args()

    missing = [
        name
        for name, val in [
            ("--account", args.account),
            ("--user", args.user),
            ("--password", args.password),
            ("--warehouse", args.warehouse),
        ]
        if not val
    ]
    if missing:
        parser.error(f"Missing required arguments: {', '.join(missing)}")

    collect(
        account=args.account,
        user=args.user,
        password=args.password,
        warehouse=args.warehouse,
        lookback_hours=args.lookback_hours,
        column_lineage=args.column_lineage,
        output_file=args.output_file,
    )
    print("Done.")


if __name__ == "__main__":
    main()
