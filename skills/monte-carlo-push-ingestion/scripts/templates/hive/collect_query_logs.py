#!/usr/bin/env python3
"""
Collect Hive query logs from a local HiveServer2 log file — collection only.

Parses a plain-text HiveServer2 log for "Executing/Starting command" entries
to extract query text, query ID, start time and end time.  Optionally reads
per-query operation logs to populate ``returned_rows`` from SelectOperator
``RECORDS_OUT`` counters.  Deduplicates entries by query ID.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points
-------------------
- --log-file       path to local HiveServer2 log (default: /tmp/root/hive.log)
- --op-logs-dir    optional directory of per-query <queryId>.log files

Prerequisites
-------------
    pip install python-dateutil python-dotenv

Usage
-----
    python collect_query_logs.py \\
        --log-file /tmp/root/hive.log \\
        [--op-logs-dir /var/log/hive/operation_logs] \\
        --output-file query_logs_output.json
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

from dateutil.parser import isoparse

# NOTE: the normalizer requires "hive-s3" — do not change to "hive" or "data-lake"
LOG_TYPE = "hive-s3"

# Matches the start of a new query block in the Hive log
_COMMAND_START_RE = re.compile(
    r"(Executing|Starting)\s+command\(queryId=(?P<query_id>\S*)\):\s+(?P<command>.*)$"
)

# Extracts returned row counts from per-query Hive operation logs
_RECORDS_OUT_RE = re.compile(r"RECORDS_OUT_OPERATOR_SEL_\d+:(\d+)")


def _parse_log_entries(log_text: str) -> list[dict]:
    """
    Parse a HiveServer2 log file and return a list of dicts:
      query_id, start_time (datetime), end_time (datetime), query (str)

    Each timestamped "Executing/Starting command" line starts a new entry.
    The previous entry's end_time is set to the timestamp of the next line.
    """
    entries = []
    query = ""
    query_id = ""
    start_time: datetime | None = None
    last_timestamp: datetime | None = None

    for line in StringIO(log_text):
        parts = line.split()
        if not parts:
            continue

        try:
            timestamp = isoparse(parts[0])
            if not timestamp.tzinfo:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
        except ValueError:
            # Continuation line for a multi-line query
            if query:
                query += "\n" + line.rstrip()
            continue

        command_start = _COMMAND_START_RE.search(line)
        if command_start:
            # Emit the previous entry before starting a new one
            if query and start_time:
                entries.append(
                    {
                        "query_id": query_id,
                        "start_time": start_time,
                        "end_time": timestamp,
                        "query": query,
                    }
                )
            query_id = command_start.group("query_id")
            start_time = timestamp
            query = command_start.group("command").strip()
        elif query and start_time:
            # A timestamped non-command line closes the current entry
            entries.append(
                {
                    "query_id": query_id,
                    "start_time": start_time,
                    "end_time": timestamp,
                    "query": query,
                }
            )
            query = ""
            query_id = ""
            start_time = None

        last_timestamp = timestamp

    # Flush any trailing entry
    if query and start_time:
        end_time = last_timestamp or start_time
        entries.append(
            {
                "query_id": query_id,
                "start_time": start_time,
                "end_time": end_time,
                "query": query,
            }
        )

    return entries


def _load_returned_rows(op_logs_dir: str) -> dict[str, int]:
    """
    Scan a directory of per-query Hive operation logs (named <queryId>.log) and
    return a mapping of query_id -> rows returned.

    The row count is taken from the last RECORDS_OUT_OPERATOR_SEL_N value in
    each file, which reflects the final number of rows delivered to the client.
    """
    rows_by_id: dict[str, int] = {}
    for log_file in Path(op_logs_dir).glob("*.log"):
        query_id = log_file.stem
        last_count: int | None = None
        try:
            text = log_file.read_text(errors="replace")
        except OSError:
            continue
        for m in _RECORDS_OUT_RE.finditer(text):
            last_count = int(m.group(1))
        if last_count is not None:
            rows_by_id[query_id] = last_count
    return rows_by_id


def _build_query_log_entries(
    raw_entries: list[dict],
    rows_by_id: dict[str, int] | None = None,
) -> list[dict]:
    """
    Deduplicate raw log entries by query_id and enrich with returned_rows.

    Returns plain dicts so that ``push_query_logs.py`` can reconstruct
    QueryLogEntry objects from the JSON manifest.
    """
    seen: set[str] = set()
    entries = []
    for r in raw_entries:
        qid = r["query_id"]
        if qid and qid in seen:
            continue
        if qid:
            seen.add(qid)

        returned_rows: int | None = rows_by_id.get(qid) if rows_by_id and qid else None

        entries.append(
            {
                "query_id": qid or None,
                "start_time": r["start_time"].isoformat(),
                "end_time": r["end_time"].isoformat(),
                "query_text": r["query"],
                "user": "hadoop",  # ← SUBSTITUTE: set the user appropriate for your cluster
                "returned_rows": returned_rows,
            }
        )
    return entries


def collect(
    log_file: str,
    op_logs_dir: str | None = None,
) -> dict:
    """
    Parse query log entries from a HiveServer2 log file and return a manifest dict.

    Args:
        log_file: Path to a local HiveServer2 log file.
        op_logs_dir: Optional directory containing per-query operation logs
                     (<queryId>.log). When provided, returned_rows is populated
                     from SelectOperator RECORDS_OUT counts.

    Returns:
        Manifest dict with keys: log_type, collected_at, entry_count,
        window_start, window_end, queries.
    """
    print(f"Reading Hive log file: {log_file} ...")
    with open(log_file, errors="replace") as fh:
        log_text = fh.read()

    raw_entries = _parse_log_entries(log_text)
    print(f"  Parsed {len(raw_entries)} query log entry/entries.")

    if not raw_entries:
        print("No query log entries found.")
        return {
            "log_type": LOG_TYPE,
            "collected_at": datetime.now(tz=timezone.utc).isoformat(),
            "entry_count": 0,
            "window_start": None,
            "window_end": None,
            "queries": [],
        }

    rows_by_id: dict[str, int] | None = None
    if op_logs_dir:
        rows_by_id = _load_returned_rows(op_logs_dir)
        print(f"  Loaded row counts for {len(rows_by_id)} query/queries from {op_logs_dir}")

    queries = _build_query_log_entries(raw_entries, rows_by_id)

    start_times = [r["start_time"] for r in raw_entries]
    end_times = [r["end_time"] for r in raw_entries]

    manifest = {
        "log_type": LOG_TYPE,
        "collected_at": datetime.now(tz=timezone.utc).isoformat(),
        "entry_count": len(queries),
        "window_start": min(start_times).isoformat() if start_times else None,
        "window_end": max(end_times).isoformat() if end_times else None,
        "queries": [
            {
                "query_id": q["query_id"],
                "start_time": q["start_time"],
                "end_time": q["end_time"],
                "query": q["query_text"],
                "user": q["user"],
                "returned_rows": q["returned_rows"],
            }
            for q in queries
        ],
    }
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect Hive query logs from a local log file and write a JSON manifest",
    )
    parser.add_argument(
        "--log-file",
        default="/tmp/root/hive.log",
        help="Path to local HiveServer2 log file (default: /tmp/root/hive.log)",  # ← SUBSTITUTE: your log path
    )
    parser.add_argument(
        "--op-logs-dir",
        default=None,
        help=(
            "Directory containing per-query Hive operation logs (<queryId>.log). "
            "When provided, returned_rows is populated from SelectOperator RECORDS_OUT counts."
        ),
        # ← SUBSTITUTE: e.g. /var/log/hive/operation_logs or wherever Hive writes op logs
    )
    parser.add_argument(
        "--output-file",
        default="query_logs_output.json",
        help="Path to write the output manifest (default: query_logs_output.json)",
    )
    args = parser.parse_args()

    manifest = collect(log_file=args.log_file, op_logs_dir=args.op_logs_dir)

    with open(args.output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Query log manifest written to {args.output_file}")
    print("Done.")


if __name__ == "__main__":
    main()
