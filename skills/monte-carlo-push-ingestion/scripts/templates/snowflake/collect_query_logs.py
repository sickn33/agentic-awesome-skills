#!/usr/bin/env python3
"""
Collect query logs from Snowflake ACCOUNT_USAGE.QUERY_HISTORY — collection only.

Queries a 24-hour window ending 1 hour ago (ACCOUNT_USAGE views have an
approximate 45-minute ingestion latency, so the last hour is intentionally
skipped to avoid incomplete data).  The collected query logs are written to a
JSON manifest file.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points
-------------------
- SNOWFLAKE_ACCOUNT    (env) / --account    (CLI) : Snowflake account identifier
- SNOWFLAKE_USER       (env) / --user       (CLI) : Snowflake username
- SNOWFLAKE_PASSWORD   (env) / --password   (CLI) : Snowflake password
- SNOWFLAKE_WAREHOUSE  (env) / --warehouse  (CLI) : Snowflake virtual warehouse

Prerequisites
-------------
    pip install snowflake-connector-python

Usage
-----
    python collect_query_logs.py \\
        --account  <SNOWFLAKE_ACCOUNT> \\
        --user     <SNOWFLAKE_USER> \\
        --password <SNOWFLAKE_PASSWORD> \\
        --warehouse <SNOWFLAKE_WAREHOUSE>
"""

import argparse
import json
import os
from datetime import datetime, timezone

import snowflake.connector

# ← SUBSTITUTE: set LOG_TYPE to match your warehouse type (query logs use log_type, not resource_type)
LOG_TYPE = "snowflake"


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

# How many hours to look back from the trailing-edge cutoff
# ← SUBSTITUTE: adjust to match your collection cadence (e.g. 2 for every-2-hours runs)
_WINDOW_HOURS = 25

# Hours to skip at the trailing edge — ACCOUNT_USAGE has ~45-minute latency;
# skipping 1 hour provides a comfortable buffer.
# ← SUBSTITUTE: lower to 0 if you have confirmed real-time access to ACCOUNT_USAGE
_TRAILING_SKIP_HOURS = 1

# Maximum rows to collect per run — increase if your warehouse has higher query volume
# ← SUBSTITUTE: adjust based on your Snowflake query volume
_QUERY_LIMIT = 10000


def _fetch_query_history(conn) -> list[dict]:
    """
    Fetch recent query history from SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY.

    Collection window: [NOW - _WINDOW_HOURS, NOW - _TRAILING_SKIP_HOURS]
    This intentionally excludes the most recent hour to avoid the ACCOUNT_USAGE
    ingestion latency gap.
    """
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT
            QUERY_ID,
            QUERY_TEXT,
            START_TIME,
            END_TIME,
            USER_NAME,
            DATABASE_NAME,
            WAREHOUSE_NAME,
            BYTES_SCANNED,
            ROWS_PRODUCED,
            EXECUTION_STATUS,
            QUERY_TAG,
            ROLE_NAME
        FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
        WHERE START_TIME >= DATEADD(hour, -{_WINDOW_HOURS}, CURRENT_TIMESTAMP())
          AND START_TIME <  DATEADD(hour, -{_TRAILING_SKIP_HOURS}, CURRENT_TIMESTAMP())
          AND EXECUTION_STATUS = 'SUCCESS'
        ORDER BY START_TIME
        LIMIT {_QUERY_LIMIT}
        """
        # ← SUBSTITUTE: add AND DATABASE_NAME = '<db>' or AND WAREHOUSE_NAME = '<wh>'
        #   to restrict collection to a specific database or warehouse
    )
    columns = [col[0] for col in cursor.description]
    rows = []
    while True:
        chunk = cursor.fetchmany(1000)
        if not chunk:
            break
        rows.extend(dict(zip(columns, row)) for row in chunk)
    cursor.close()
    return rows


def _iso(dt: object) -> str | None:
    if dt is None:
        return None
    return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)


def collect(
    account: str,
    user: str,
    password: str,
    warehouse: str,
    output_file: str = "query_logs_output.json",
) -> dict:
    """
    Connect to Snowflake, collect query logs, and write a JSON manifest.

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

    print(
        f"Fetching QUERY_HISTORY (last {_WINDOW_HOURS}h, excluding final {_TRAILING_SKIP_HOURS}h, "
        f"limit {_QUERY_LIMIT}) ..."
    )
    rows = _fetch_query_history(conn)
    conn.close()
    print(f"  Retrieved {len(rows)} query log row(s).")

    if not rows:
        print("No query log rows found in the specified window.")
        manifest = {
            "log_type": LOG_TYPE,
            "collected_at": datetime.now(tz=timezone.utc).isoformat(),
            "entry_count": 0,
            "window_start": None,
            "window_end": None,
            "queries": [],
        }
        with open(output_file, "w") as fh:
            json.dump(manifest, fh, indent=2, default=str)
        return manifest

    start_times = [r["START_TIME"] for r in rows if r.get("START_TIME") is not None]
    end_times = [r["END_TIME"] for r in rows if r.get("END_TIME") is not None]

    manifest = {
        "log_type": LOG_TYPE,
        "collected_at": datetime.now(tz=timezone.utc).isoformat(),
        "entry_count": len(rows),
        "window_start": _iso(min(start_times)) if start_times else None,
        "window_end": _iso(max(end_times)) if end_times else None,
        "queries": [
            {
                "query_id": r.get("QUERY_ID"),
                "query_text": r.get("QUERY_TEXT") or "",
                "start_time": _iso(r.get("START_TIME")),
                "end_time": _iso(r.get("END_TIME")),
                "user": r.get("USER_NAME"),
                "warehouse": r.get("WAREHOUSE_NAME"),
                "bytes_scanned": r.get("BYTES_SCANNED"),
                "rows_produced": r.get("ROWS_PRODUCED"),
            }
            for r in rows
        ],
    }
    with open(output_file, "w") as fh:
        json.dump(manifest, fh, indent=2, default=str)
    print(f"Query log manifest written to {output_file}")

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Snowflake query logs from ACCOUNT_USAGE and write to a manifest file",
    )
    parser.add_argument(
        "--account",
        default=os.environ.get("SNOWFLAKE_ACCOUNT"),
        help="Snowflake account identifier, e.g. xy12345.us-east-1 (env: SNOWFLAKE_ACCOUNT)",  # ← SUBSTITUTE
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
        help="Snowflake virtual warehouse (env: SNOWFLAKE_WAREHOUSE)",  # ← SUBSTITUTE
    )
    parser.add_argument(
        "--output-file",
        default="query_logs_output.json",
        help="Path to write the output manifest (default: query_logs_output.json)",
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
        output_file=args.output_file,
    )
    print("Done.")


if __name__ == "__main__":
    main()
