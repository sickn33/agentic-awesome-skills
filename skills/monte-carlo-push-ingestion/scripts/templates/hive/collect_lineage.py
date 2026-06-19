#!/usr/bin/env python3
"""
Extract table and column lineage from a local HiveServer2 log file — collection only.

Reads a plain-text Hive log file (not compressed), extracts SQL query blocks
from "Executing command" / "Starting command" entries, detects CTAS and
INSERT INTO ... SELECT patterns to build lineage edges, then writes a JSON
manifest file.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points
-------------------
- --log-file  path to local HiveServer2 log (default: /tmp/root/hive.log)

Prerequisites
-------------
    pip install python-dotenv

Usage
-----
    python collect_lineage.py \\
        --log-file /tmp/root/hive.log \\
        --output-file lineage_output.json
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

# ← SUBSTITUTE: set RESOURCE_TYPE to match your Monte Carlo connection type
RESOURCE_TYPE = "data-lake"

# Regex for CTAS: CREATE TABLE [IF NOT EXISTS] db.table AS SELECT ... FROM db.table
_CTAS_RE = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
    r"(?P<dest_db>\w+)\.(?P<dest_table>\w+)"
    r".*?AS\s+SELECT\s+(?P<select_cols>.+?)\s+FROM\s+(?P<src_db>\w+)\.(?P<src_table>\w+)",
    re.IGNORECASE | re.DOTALL,
)

# Regex for INSERT INTO/OVERWRITE db.table SELECT ... FROM db.table
_INSERT_RE = re.compile(
    r"INSERT\s+(?:INTO|OVERWRITE)\s+(?:TABLE\s+)?(?P<dest_db>\w+)\.(?P<dest_table>\w+)"
    r".*?SELECT\s+(?P<select_cols>.+?)\s+FROM\s+(?P<src_db>\w+)\.(?P<src_table>\w+)",
    re.IGNORECASE | re.DOTALL,
)

# Regex to detect additional JOIN sources beyond the primary FROM clause
_JOIN_RE = re.compile(r"JOIN\s+(?P<src_db>\w+)\.(?P<src_table>\w+)", re.IGNORECASE)

# Simple column alias extraction: [alias.]col [AS dest]
_COL_RE = re.compile(r"(?:(\w+)\.)?(\w+)(?:\s+AS\s+(\w+))?", re.IGNORECASE)

# Hive string literals — strip before scanning so words inside 'status' AS ...
# are not treated as column refs
_STR_LITERAL_RE = re.compile(r"'(?:''|[^'])*'")

# ROW_NUMBER() OVER (...) AS alias — whole expression has no single source column;
# removing it avoids bogus tokens in col_mappings
_WINDOW_AS_ALIAS_RE = re.compile(
    r"\b(?:ROW_NUMBER|RANK|DENSE_RANK|NTILE)\s*\(\s*\)\s+OVER\s*\([^)]*\)\s+AS\s+\w+",
    re.IGNORECASE,
)

# Regex to pull query text out of Hive log "Executing/Starting command" lines
_COMMAND_START_RE = re.compile(
    r"(?:Executing|Starting)\s+command\(queryId=\S*\):\s+(?P<query>.+?)(?=\n\d{4}-\d{2}-\d{2}|\Z)",
    re.DOTALL,
)

# Tokens that are almost never real column names — SQL keywords, functions, casts, etc.
_SQL_SCAN_NOISE = frozenset(
    {
        "ROW_NUMBER", "RANK", "DENSE_RANK", "NTILE", "OVER", "PARTITION",
        "ORDER", "BY", "CASE", "WHEN", "THEN", "ELSE", "END", "AND", "OR",
        "NOT", "IN", "IS", "DISTINCT", "CAST", "CONVERT", "CURRENT_TIMESTAMP",
        "CURRENT_DATE", "TRUE", "FALSE", "NULL", "BETWEEN", "LIKE", "EXISTS",
        "ASC", "DESC", "LIMIT", "OFFSET", "GROUP", "HAVING", "UNION", "ALL",
        "INNER", "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "JOIN", "ON",
        "WHERE", "SELECT", "FROM", "AS", "STRING", "BIGINT", "INT", "SMALLINT",
        "TINYINT", "DOUBLE", "FLOAT", "REAL", "DECIMAL", "BOOLEAN", "DATE",
        "TIMESTAMP", "VARCHAR", "CHAR", "BINARY", "ARRAY", "MAP", "STRUCT",
        "SUM", "AVG", "COUNT", "MIN", "MAX", "STDDEV", "VARIANCE", "VAR_POP",
        "COALESCE", "IF", "SUBSTRING", "YEAR", "MONTH", "DAY", "LEAD", "LAG",
        "FIRST_VALUE", "LAST_VALUE",
    }
)


@dataclass
class _LineageEdge:
    dest_db: str
    dest_table: str
    sources: list[tuple[str, str]] = field(default_factory=list)
    # col_mappings: (dest_col, src_table, src_col)
    col_mappings: list[tuple[str, str, str]] = field(default_factory=list)


def _prepare_select_for_col_scan(select_clause: str) -> str:
    """Remove literals and window headers so _COL_RE sees fewer false positives."""
    s = _STR_LITERAL_RE.sub(" ", select_clause)
    s = _WINDOW_AS_ALIAS_RE.sub(" ", s)
    return s


def _dedupe_col_mappings(mappings: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    seen: set[tuple[str, str, str]] = set()
    out: list[tuple[str, str, str]] = []
    for t in mappings:
        if t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def _extract_query_blocks(log_text: str) -> list[str]:
    """Extract individual SQL query strings from a Hive log file."""
    return [m.group("query").strip() for m in _COMMAND_START_RE.finditer(log_text)]


def _parse_select_cols(select_clause: str, src_table: str) -> list[tuple[str, str, str]]:
    """
    Lightweight column mapping: for each `alias.col AS dest` or `col AS dest`
    in the SELECT clause, return (dest_col, src_table, src_col).

    Strips string literals and window function headers first to reduce false
    positives, and filters out SQL keywords/noise tokens.
    """
    prepared = _prepare_select_for_col_scan(select_clause)
    mappings = []
    for m in _COL_RE.finditer(prepared):
        src_col = m.group(2)
        dest_col = m.group(3) or src_col
        if src_col.upper() in ("FROM", "SELECT", "WHERE", "JOIN", "ON", "AS", "*"):
            continue
        if src_col.upper() in _SQL_SCAN_NOISE or dest_col.upper() in _SQL_SCAN_NOISE:
            continue
        # After stripping 'literal' AS col, we get " AS col" — skip bare (col, col) with no source expr.
        if dest_col == src_col:
            prefix = prepared[: m.start()].rstrip()
            if prefix.upper().endswith("AS"):
                continue
        mappings.append((dest_col, src_table, src_col))
    return _dedupe_col_mappings(mappings)


def _parse_edges(queries: list[str]) -> list[_LineageEdge]:
    """Parse SQL query strings into _LineageEdge objects."""
    edges: dict[str, _LineageEdge] = {}

    for sql in queries:
        # Strip string literals to avoid false table/column matches inside quoted strings
        sql_clean = re.sub(r"\s+", " ", _STR_LITERAL_RE.sub(" ", sql)).strip()

        for pattern in (_CTAS_RE, _INSERT_RE):
            m = pattern.search(sql_clean)
            if not m:
                continue

            dest_db = m.group("dest_db").lower()
            dest_table = m.group("dest_table").lower()
            src_db = m.group("src_db").lower()
            src_table = m.group("src_table").lower()
            select_cols = m.group("select_cols")

            key = f"{dest_db}.{dest_table}"
            if key not in edges:
                edges[key] = _LineageEdge(dest_db=dest_db, dest_table=dest_table)

            edge = edges[key]
            src_pair = (src_db, src_table)
            if src_pair not in edge.sources:
                edge.sources.append(src_pair)

            # Pick up additional JOIN sources
            for jm in _JOIN_RE.finditer(sql_clean):
                jp = (jm.group("src_db").lower(), jm.group("src_table").lower())
                if jp not in edge.sources:
                    edge.sources.append(jp)

            edge.col_mappings.extend(_parse_select_cols(select_cols, src_table))
            break  # matched one pattern, move to next query

    # Deduplicate column mappings per edge (same INSERT may appear many times in HS2 logs)
    for e in edges.values():
        e.col_mappings = _dedupe_col_mappings(e.col_mappings)

    return list(edges.values())


def collect(log_file: str) -> dict:
    """
    Parse lineage edges from a HiveServer2 log file and return a manifest dict.

    Args:
        log_file: Path to a local HiveServer2 log file.

    Returns:
        Manifest dict with keys: resource_type, collected_at, edges.
        Each edge has destination, sources, and col_mappings lists.
    """
    print(f"Reading Hive log file: {log_file} ...")
    with open(log_file, errors="replace") as fh:
        log_text = fh.read()

    queries = _extract_query_blocks(log_text)
    print(f"  Extracted {len(queries)} query block(s).")

    edges = _parse_edges(queries)
    print(f"  Parsed {len(edges)} lineage edge(s).")

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": datetime.now(tz=timezone.utc).isoformat(),
        "edges": [
            {
                "destination": {"database": e.dest_db, "table": e.dest_table},
                "sources": [{"database": sdb, "table": stbl} for sdb, stbl in e.sources],
                "col_mappings": [
                    {"dest_col": dc, "src_table": st, "src_col": sc}
                    for dc, st, sc in e.col_mappings
                ],
            }
            for e in edges
        ],
    }
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract Hive lineage from a local log file and write a JSON manifest",
    )
    parser.add_argument(
        "--log-file",
        default="/tmp/root/hive.log",
        help="Path to local HiveServer2 log file (default: /tmp/root/hive.log)",  # ← SUBSTITUTE: your log path
    )
    parser.add_argument(
        "--output-file",
        default="lineage_output.json",
        help="Path to write the lineage manifest (default: lineage_output.json)",
    )
    args = parser.parse_args()

    manifest = collect(log_file=args.log_file)

    if not manifest["edges"]:
        print("No lineage edges detected — no CTAS or INSERT INTO ... SELECT patterns found.")
        return

    with open(args.output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Lineage manifest written to {args.output_file}")
    print("Done.")


if __name__ == "__main__":
    main()
