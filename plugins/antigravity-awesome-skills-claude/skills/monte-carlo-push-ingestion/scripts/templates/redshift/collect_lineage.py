"""
Redshift — Lineage Collection (collect-only)
==============================================
Collects table-level lineage from Redshift by fetching recent successful query
history from sys_query_history + sys_querytext and parsing CREATE TABLE AS SELECT
(CTAS) and INSERT INTO SELECT patterns to derive source->destination relationships.

Writes a JSON manifest file that can be consumed by push_lineage.py.

Substitution points (search for "← SUBSTITUTE"):
  - REDSHIFT_HOST / REDSHIFT_DB / REDSHIFT_USER / REDSHIFT_PASSWORD : connection
  - LOOKBACK_HOURS    : how far back to scan query history (default 24 h)

Prerequisites:
  pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "redshift"
LOOKBACK_HOURS: int = int(os.getenv("LOOKBACK_HOURS", "24"))  # ← SUBSTITUTE


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


# Regex: CTAS — CREATE [OR REPLACE] TABLE <dest> AS SELECT
_CTAS_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW)\s+(?P<dest>\"?[\w.\"]+\"?)\s*(?:\([^)]*\))?\s*AS\s+SELECT\b",
    re.IGNORECASE | re.DOTALL,
)
# Regex: INSERT INTO <dest> … SELECT
_INSERT_RE = re.compile(
    r"INSERT\s+INTO\s+(?P<dest>\"?[\w.\"]+\"?)\s.*?SELECT\b",
    re.IGNORECASE | re.DOTALL,
)
# Matches any schema.table or database.schema.table reference in the query
_TABLE_REF_RE = re.compile(r'"?([\w]+)"?\."?([\w]+)"?(?:\."?([\w]+)"?)?', re.IGNORECASE)


def _clean_name(name: str) -> str:
    return name.strip('"').strip()


def _parse_ref(ref: str) -> tuple[str, str, str]:
    """Parse 'db.schema.table' or 'schema.table' -> (database, schema, table)."""
    parts = [_clean_name(p) for p in ref.split(".")]
    if len(parts) == 3:
        return parts[0], parts[1], parts[2]
    if len(parts) == 2:
        return "", parts[0], parts[1]
    return "", "", parts[0]


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


def fetch_query_texts(cursor: Any, lookback_hours: int) -> list[str]:
    """Assemble full query texts from sys_query_history + sys_querytext."""
    rows = _dictfetch(
        cursor,
        f"""
        SELECT
            sq.query_id,
            LISTAGG(
                CASE WHEN LEN(st.text) <= 200 THEN st.text ELSE LEFT(st.text, 200) END,
                ''
            ) WITHIN GROUP (ORDER BY st.sequence) AS full_text
        FROM sys_query_history sq
        JOIN sys_querytext st ON sq.query_id = st.query_id
        WHERE sq.start_time >= DATEADD(hour, -{lookback_hours}, GETDATE())
          AND sq.status = 'success'
        GROUP BY sq.query_id
        LIMIT 50000
        """,  # ← SUBSTITUTE: adjust lookback_hours, LIMIT, or add user/database filters
    )
    return [r["full_text"] for r in rows if r.get("full_text")]


def parse_lineage_from_sql(sql_text: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []

    dest_match = _CTAS_RE.search(sql_text) or _INSERT_RE.search(sql_text)
    if not dest_match:
        return events

    dest_raw = dest_match.group("dest")
    dest_db, dest_schema, dest_table = _parse_ref(dest_raw)
    if not dest_table:
        return events

    # Find all schema.table refs in the query, excluding the destination
    source_refs: list[str] = []
    for m in _TABLE_REF_RE.finditer(sql_text):
        if m.group(3):
            ref = f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
        else:
            ref = f"{m.group(1)}.{m.group(2)}"

        db, schema, table = _parse_ref(ref)
        if not table or (db == dest_db and schema == dest_schema and table == dest_table):
            continue
        source_refs.append(ref)

    if not source_refs:
        return events

    # Deduplicate sources while preserving order
    seen: set[str] = set()
    sources: list[dict[str, str]] = []
    for ref in source_refs:
        if ref not in seen:
            seen.add(ref)
            db, schema, table = _parse_ref(ref)
            sources.append({"database": db, "schema": schema, "asset_name": table})

    events.append({
        "sources": sources,
        "destination": {"database": dest_db, "schema": dest_schema, "asset_name": dest_table},
    })
    return events


def collect(
    host: str,
    db: str,
    user: str,
    password: str,
    manifest_path: str = "manifest_lineage.json",
    port: int = 5439,
    lookback_hours: int = LOOKBACK_HOURS,
) -> list[dict[str, Any]]:
    """Connect to Redshift, collect lineage, write a JSON manifest, and return events."""
    _check_available_memory()
    collected_at = datetime.now(timezone.utc).isoformat()

    conn = psycopg2.connect(
        host=host, port=port, dbname=db, user=user, password=password, connect_timeout=30,
    )
    try:
        with conn.cursor() as cursor:
            query_texts = fetch_query_texts(cursor, lookback_hours)
    finally:
        conn.close()

    log.info("Parsing lineage from %d query texts …", len(query_texts))
    all_events: list[dict[str, Any]] = []
    for sql_text in query_texts:
        all_events.extend(parse_lineage_from_sql(sql_text))

    log.info("Collected %d lineage events", len(all_events))

    manifest = {
        "resource_type": RESOURCE_TYPE,
        "collected_at": collected_at,
        "lookback_hours": lookback_hours,
        "queries_scanned": len(query_texts),
        "lineage_event_count": len(all_events),
        "events": all_events,
    }
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Manifest written to %s (%d events)", manifest_path, len(all_events))

    return all_events


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect Redshift lineage to a manifest file")
    parser.add_argument("--host", default=os.getenv("REDSHIFT_HOST"))         # ← SUBSTITUTE
    parser.add_argument("--db", default=os.getenv("REDSHIFT_DB"))             # ← SUBSTITUTE
    parser.add_argument("--user", default=os.getenv("REDSHIFT_USER"))         # ← SUBSTITUTE
    parser.add_argument("--password", default=os.getenv("REDSHIFT_PASSWORD")) # ← SUBSTITUTE
    parser.add_argument("--port", type=int, default=int(os.getenv("REDSHIFT_PORT", "5439")))
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--manifest", default="manifest_lineage.json")
    args = parser.parse_args()

    required = ["host", "db", "user", "password"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    collect(
        host=args.host,
        db=args.db,
        user=args.user,
        password=args.password,
        manifest_path=args.manifest,
        port=args.port,
        lookback_hours=args.lookback_hours,
    )


if __name__ == "__main__":
    main()
