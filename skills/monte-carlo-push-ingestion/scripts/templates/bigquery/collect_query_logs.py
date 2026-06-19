"""
BigQuery — Query Log Collection (collect only)
================================================
Collects completed job query logs from BigQuery job history and writes them to
a JSON manifest file for later push to Monte Carlo.

Can be run standalone via CLI or imported (use the ``collect()`` function).

Substitution points (search for "← SUBSTITUTE"):
  - BIGQUERY_PROJECT_ID   : GCP project ID to collect query logs from
  - GOOGLE_APPLICATION_CREDENTIALS : path to service-account JSON key file
  - LOOKBACK_HOURS        : how many hours back to collect (default 25, skip last 1 h)
  - STATEMENT_TYPE_FILTER : restrict to specific statement types, or leave empty for all
  - MAX_JOBS              : cap on number of jobs to collect per run

Prerequisites:
  pip install google-cloud-bigquery
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timedelta, timezone

from google.cloud import bigquery

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

LOG_TYPE = "bigquery"

# Collect jobs from [now - LOOKBACK_HOURS] to [now - LOOKBACK_LAG_HOURS].
# The lag avoids collecting in-flight jobs that have not yet completed.
LOOKBACK_HOURS: int = int(os.getenv("LOOKBACK_HOURS", "25"))        # ← SUBSTITUTE
LOOKBACK_LAG_HOURS: int = int(os.getenv("LOOKBACK_LAG_HOURS", "1")) # ← SUBSTITUTE

# Limit statement types — e.g. ["SELECT", "CREATE_TABLE_AS_SELECT", "INSERT"]
# Set to an empty list to collect all statement types.
STATEMENT_TYPE_FILTER: list[str] = []  # ← SUBSTITUTE

# Maximum number of jobs to collect in a single run to avoid runaway costs
MAX_JOBS: int = int(os.getenv("MAX_JOBS", "10000"))  # ← SUBSTITUTE


def _safe_isoformat(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _collect_query_logs(
    bq_client: bigquery.Client,
    project_id: str,
    start_dt: datetime,
    end_dt: datetime,
) -> list[dict]:
    """Collect query logs from BigQuery job history and return as a list of dicts."""
    entries: list[dict] = []

    log.info(
        "Listing jobs for project=%s from %s to %s",
        project_id, start_dt.isoformat(), end_dt.isoformat(),
    )

    for job in bq_client.list_jobs(
        project=project_id,
        all_users=True,
        min_creation_time=start_dt,
        max_creation_time=end_dt,
    ):
        # Only process query jobs that have SQL text
        sql: str = getattr(job, "query", None) or ""
        if not sql.strip():
            continue

        statement_type: str = getattr(job, "statement_type", None) or ""
        if STATEMENT_TYPE_FILTER and statement_type not in STATEMENT_TYPE_FILTER:
            continue  # ← SUBSTITUTE: adjust filter as needed

        total_bytes_billed: int | None = getattr(job, "total_bytes_billed", None)

        entries.append(
            {
                "query_id": job.job_id,
                "query_text": sql,
                "start_time": _safe_isoformat(getattr(job, "created", None)),
                "end_time": _safe_isoformat(getattr(job, "ended", None)),
                "user": getattr(job, "user_email", None),
                "total_bytes_billed": total_bytes_billed,
                "statement_type": statement_type or None,
            }
        )

        if len(entries) >= MAX_JOBS:
            log.warning("Reached MAX_JOBS=%d — stopping early", MAX_JOBS)
            break

    return entries


def collect(
    project_id: str,
    lookback_hours: int = LOOKBACK_HOURS,
    lookback_lag_hours: int = LOOKBACK_LAG_HOURS,
    output_file: str = "query_logs_output.json",
) -> dict:
    """
    Connect to BigQuery, collect query logs, and write a JSON manifest.

    Returns the manifest dict.
    """
    bq_client = bigquery.Client(project=project_id)  # ← SUBSTITUTE: adjust auth if needed

    end_dt = datetime.now(timezone.utc) - timedelta(hours=lookback_lag_hours)
    start_dt = end_dt - timedelta(hours=lookback_hours)

    entries = _collect_query_logs(bq_client, project_id, start_dt, end_dt)
    log.info("Collected %d query log entries.", len(entries))

    manifest = {
        "log_type": LOG_TYPE,
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "window_start": start_dt.isoformat(),
        "window_end": end_dt.isoformat(),
        "query_log_count": len(entries),
        "queries": entries,
    }
    with open(output_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    log.info("Query log manifest written to %s", output_file)

    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect BigQuery query logs and write to a manifest file",
    )
    parser.add_argument("--project-id", default=os.getenv("BIGQUERY_PROJECT_ID"))  # ← SUBSTITUTE
    parser.add_argument("--lookback-hours", type=int, default=LOOKBACK_HOURS)
    parser.add_argument("--lookback-lag-hours", type=int, default=LOOKBACK_LAG_HOURS)
    parser.add_argument("--output-file", default="query_logs_output.json")
    args = parser.parse_args()

    required = ["project_id"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    collect(
        project_id=args.project_id,
        lookback_hours=args.lookback_hours,
        lookback_lag_hours=args.lookback_lag_hours,
        output_file=args.output_file,
    )


if __name__ == "__main__":
    main()
