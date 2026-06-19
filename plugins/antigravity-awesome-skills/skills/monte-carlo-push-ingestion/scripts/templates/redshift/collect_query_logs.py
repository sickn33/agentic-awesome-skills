"""
Redshift — Query Log Collection (collect-only)
================================================
Collects completed query execution records from Redshift using sys_query_history
and sys_querytext (modern RA3/serverless), assembles full SQL text from
multi-row text chunks, and writes a JSON manifest file that can be consumed
by push_query_logs.py.

Substitution points (search for "← SUBSTITUTE"):
  - REDSHIFT_HOST / REDSHIFT_DB / REDSHIFT_USER / REDSHIFT_PASSWORD : connection
  - LOOKBACK_HOURS    : hours back from [now - LAG_HOURS] to collect (default 25)
  - LOOKBACK_LAG_HOURS: lag behind now to avoid in-flight queries (default 1)
  - BATCH_SIZE        : number of query_ids to fetch texts for in one SQL call
  - MAX_QUERIES       : maximum query rows to process per run

Prerequisites:
  pip install psycopg2-binary
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

LOG_TYPE = "redshift"

LOOKBACK_HOURS: int = int(os.getenv("LOOKBACK_HOURS", "25"))        # ← SUBSTITUTE
LOOKBACK_LAG_HOURS: int = int(os.getenv("LOOKBACK_LAG_HOURS", "1")) # ← SUBSTITUTE
BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "200"))               # ← SUBSTITUTE
MAX_QUERIES: int = int(os.getenv("MAX_QUERIES", "10000"))           # ← SUBSTITUTE


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


def _safe_isoformat(dt: Any) -> str | None:
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return str(dt)


def fetch_query_metadata(
    cursor: Any,
    lookback_hours: int,
    lag_hours: int,
    max_queries: int,
) -> list[dict[str, Any]]:
    """Fetch query execution metadata from sys_query_history."""
    return _dictfetch(
        cursor,
        f"""
        SELECT
            query_id,
            start_time,
            end_time,
            status,
            user_id,
            database_name,
            elapsed_time
        FROM sys_query_history
        WHERE start_time >= DATEADD(hour, -{lookback_hours}, GETDATE())
          AND start_time <  DATEADD(hour, -{lag_hours},      GETDATE())
          AND status = 'success'
        ORDER BY start_time
        LIMIT {max_queries}
        """,  # ← SUBSTITUTE: add AND database_name = 'mydb' to narrow scope
    )


def fetch_query_texts_batch(cursor: Any, query_ids: list[int]) -> dict[int, str]:
    """Batch-fetch and assemble multi-row query texts for a list of query_ids."""
    if not query_ids:
        return {}

    # Build a VALUES list for the IN clause to avoid large parameter arrays
    id_list = ", ".join(str(qid) for qid in query_ids)
    rows = _dictfetch(
        cursor,
        f"""
        SELECT
            query_id,
            LISTAGG(
                CASE WHEN LEN(text) <= 200 THEN text ELSE LEFT(text, 200) END,
                ''
            ) WITHIN GROUP (ORDER BY sequence) AS query_text
        FROM sys_querytext
        WHERE query_id IN ({id_list})
        GROUP BY query_id
        """,
    )
    return {r["query_id"]: r["query_text"] for r in rows if r.get("query_text")}


def collect(
    host: str,
    db: str,
    user: str,
    password: str,
    manifest_path: str = "manifest_query_logs.json",
    port: int = 5439,
    lookback_hours: int = LOOKBACK_HOURS,
    lookback_lag_hours: int = LOOKBACK_LAG_HOURS,
    batch_size: int = BATCH_SIZE,
    max_queries: int = MAX_QUERIES,
) -> list[dict[str, Any]]:
    """Connect to Redshift, collect query logs, write a JSON manifest, and return entries."""
    _check_available_memory()
    collected_at = datetime.now(timezone.utc).isoformat()

    conn = psycopg2.connect(
        host=host, port=port, dbname=db, user=user, password=password, connect_timeout=30,
    )
    try:
        with conn.cursor() as cursor:
            query_meta = fetch_query_metadata(cursor, lookback_hours, lookback_lag_hours, max_queries)
            log.info("Retrieved %d query metadata rows", len(query_meta))

            # Batch-fetch texts to avoid enormous single queries
            query_ids = [r["query_id"] for r in query_meta]
            text_map: dict[int, str] = {}
            for i in range(0, len(query_ids), batch_size):
                batch = query_ids[i : i + batch_size]
                text_map.update(fetch_query_texts_batch(cursor, batch))
                log.debug("Fetched texts for batch %d–%d", i, i + len(batch))
    finally:
        conn.close()

    entries: list[dict[str, Any]] = []
    for row in query_meta:
        qid = row["query_id"]
        query_text = text_map.get(qid, "")
        if not query_text.strip():
            continue  # ← SUBSTITUTE: decide whether to push rows with missing text

        entry = {
            "query_id": str(qid),
            "query_text": query_text,
            "start_time": _safe_isoformat(row.get("start_time")),
            "end_time": _safe_isoformat(row.get("end_time")),
            "user": str(row.get("user_id")) if row.get("user_id") is not None else None,
            "database_name": row.get("database_name"),
            "elapsed_time_us": row.get("elapsed_time"),
        }
        entries.append(entry)

    log.info("Collected %d query log entries", len(entries))

    manifest = {
        "log_type": LOG_TYPE,
        "collected_at": collected_at,
        "lookback_hours": lookback_hours,
        "lookback_lag_hours": lookback_lag_hours,
        "query_log_count": len(entries),
        "entries": entries,
    }
    with open(manifest_path, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Manifest written to %s (%d entries)", manifest_path, len(entries))

    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect Redshift query logs to a manifest file")
    parser.add_argument("--host", default=os.getenv("REDSHIFT_HOST"))         # ← SUBSTITUTE
    parser.add_argument("--db", default=os.getenv("REDSHIFT_DB"))             # ← SUBSTITUTE
    parser.add_argument("--user", default=os.getenv("REDSHIFT_USER"))         # ← SUBSTITUTE
    parser.add_argument("--password", default=os.getenv("REDSHIFT_PASSWORD")) # ← SUBSTITUTE
    parser.add_argument("--port", type=int, default=int(os.getenv("REDSHIFT_PORT", "5439")))
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--lookback-lag-hours", type=int, default=LOOKBACK_LAG_HOURS)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--max-queries", type=int, default=MAX_QUERIES)
    parser.add_argument("--manifest", default="manifest_query_logs.json")
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
        lookback_lag_hours=args.lookback_lag_hours,
        batch_size=args.batch_size,
        max_queries=args.max_queries,
    )


if __name__ == "__main__":
    main()
