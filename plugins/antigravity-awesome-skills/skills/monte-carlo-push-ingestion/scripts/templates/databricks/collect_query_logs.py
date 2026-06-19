"""
Databricks — Query Log Collection (collect-only)
==================================================
Collects finished query execution records from the Databricks system table
system.query.history and writes a JSON manifest file that can be consumed
by push_query_logs.py.

Substitution points (search for "← SUBSTITUTE"):
  - DATABRICKS_HOST       : workspace hostname
  - DATABRICKS_HTTP_PATH  : SQL warehouse HTTP path
  - DATABRICKS_TOKEN      : PAT or service-principal secret
  - LOOKBACK_HOURS        : hours back from [now - LAG_HOURS] to collect (default 25)
  - LOOKBACK_LAG_HOURS    : hours to lag behind now to avoid in-flight queries (default 1)
  - MAX_ROWS              : maximum query rows to collect per run (default 10000)

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

LOG_TYPE = "databricks"

LOOKBACK_HOURS: int = int(os.getenv("LOOKBACK_HOURS", "25"))        # ← SUBSTITUTE
LOOKBACK_LAG_HOURS: int = int(os.getenv("LOOKBACK_LAG_HOURS", "1")) # ← SUBSTITUTE
MAX_ROWS: int = int(os.getenv("MAX_ROWS", "10000"))                  # ← SUBSTITUTE

_QUERY_LOG_SQL = """\
SELECT
    statement_id       AS query_id,
    statement_text     AS query_text,
    start_time,
    end_time,
    executed_by        AS user_name,
    produced_rows      AS returned_rows,
    total_task_duration_ms,
    read_rows,
    read_bytes
FROM system.query.history
WHERE start_time >= DATEADD(HOUR, -{lookback_hours}, NOW())
  AND start_time <  DATEADD(HOUR, -{lag_hours}, NOW())
  AND status = 'FINISHED'
ORDER BY start_time
LIMIT {max_rows}
"""  # ← SUBSTITUTE: adjust status filter or add warehouse_id filter as needed


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


def _safe_isoformat(dt: Any) -> str | None:
    if dt is None:
        return None
    if hasattr(dt, "isoformat"):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return str(dt)


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


def collect_query_logs(
    cursor: Any,
    lookback_hours: int,
    lag_hours: int,
    max_rows: int,
) -> list[dict[str, Any]]:
    rendered_sql = _QUERY_LOG_SQL.format(
        lookback_hours=lookback_hours + lag_hours,  # offset from NOW() to cover the window
        lag_hours=lag_hours,
        max_rows=max_rows,
    )
    rows = _query(cursor, rendered_sql)
    log.info("Retrieved %d query log rows from system.query.history", len(rows))

    entries: list[dict[str, Any]] = []
    for row in rows:
        query_text: str = row.get("query_text") or ""
        if not query_text.strip():
            continue  # ← SUBSTITUTE: decide whether to skip empty-text rows

        entry = {
            "query_id": row.get("query_id"),
            "query_text": query_text,
            "start_time": _safe_isoformat(row.get("start_time")),
            "end_time": _safe_isoformat(row.get("end_time")),
            "user": row.get("user_name"),
            "returned_rows": row.get("returned_rows"),
            "total_task_duration_ms": row.get("total_task_duration_ms"),
            "read_rows": row.get("read_rows"),
            "read_bytes": row.get("read_bytes"),
        }
        entries.append(entry)

    return entries


def collect(
    host: str,
    http_path: str,
    token: str,
    manifest_path: str = "manifest_query_logs.json",
    lookback_hours: int = LOOKBACK_HOURS,
    lookback_lag_hours: int = LOOKBACK_LAG_HOURS,
    max_rows: int = MAX_ROWS,
) -> list[dict[str, Any]]:
    """Connect to Databricks, collect query logs, write a JSON manifest, and return entries."""
    _check_available_memory(min_gb=2.0)
    collected_at = datetime.now(timezone.utc).isoformat()

    with sql.connect(
        server_hostname=host,    # ← SUBSTITUTE
        http_path=http_path,     # ← SUBSTITUTE
        access_token=token,      # ← SUBSTITUTE
    ) as conn:
        with conn.cursor() as cursor:
            entries = collect_query_logs(cursor, lookback_hours, lookback_lag_hours, max_rows)

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
    parser = argparse.ArgumentParser(description="Collect Databricks query logs to a manifest file")
    parser.add_argument("--host", default=os.getenv("DATABRICKS_HOST"))           # ← SUBSTITUTE
    parser.add_argument("--http-path", default=os.getenv("DATABRICKS_HTTP_PATH")) # ← SUBSTITUTE
    parser.add_argument("--token", default=os.getenv("DATABRICKS_TOKEN"))         # ← SUBSTITUTE
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--lookback-lag-hours", type=int, default=LOOKBACK_LAG_HOURS)
    parser.add_argument("--max-rows", type=int, default=MAX_ROWS)
    parser.add_argument("--manifest", default="manifest_query_logs.json")
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
        lookback_hours=args.lookback_hours,
        lookback_lag_hours=args.lookback_lag_hours,
        max_rows=args.max_rows,
    )


if __name__ == "__main__":
    main()
