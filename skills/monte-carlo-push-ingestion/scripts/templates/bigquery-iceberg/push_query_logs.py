"""
BigQuery Iceberg — Query Log Push (push only)
=============================================
Reads a JSON manifest produced by collect_query_logs.py and pushes query
log entries to Monte Carlo using the pycarlo SDK's IngestionService.

Uses dateutil.isoparse() to convert ISO8601 strings back to datetime
objects (QueryLogEntry requires datetime, not str).

Can be run standalone via CLI or imported (use the ``push()`` function).

Substitution points (search for "← SUBSTITUTE"):
  - MCD_INGEST_ID      : Monte Carlo Ingestion API key ID
  - MCD_INGEST_TOKEN   : Monte Carlo Ingestion API key token
  - MCD_RESOURCE_UUID  : Monte Carlo warehouse resource UUID

Prerequisites:
  pip install pycarlo>=0.12.251 python-dateutil>=2.8.0
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from dateutil.parser import isoparse

from pycarlo.core import Client, Session
from pycarlo.features.ingestion import IngestionService
from pycarlo.features.ingestion.models import QueryLogEntry

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

LOG_TYPE = "bigquery"

# Query logs include full SQL text — keep batches small to stay under the
# 1 MB compressed payload limit.
_BATCH_SIZE = 100

# Truncate very long SQL to prevent 413 errors.
_MAX_QUERY_TEXT_LEN = 10_000

_ENDPOINT = "https://integrations.getmontecarlo.com"


def _build_query_log_entries(queries: list[dict]) -> list[QueryLogEntry]:
    """Convert manifest query dicts into QueryLogEntry objects."""
    entries = []
    truncated = 0
    for q in queries:
        query_text = q.get("query_text") or ""

        if len(query_text) > _MAX_QUERY_TEXT_LEN:
            query_text = query_text[:_MAX_QUERY_TEXT_LEN] + "... [TRUNCATED]"
            truncated += 1

        extra = {}
        if q.get("total_bytes_billed") is not None:
            extra["total_bytes_billed"] = q["total_bytes_billed"]
        if q.get("statement_type") is not None:
            extra["statement_type"] = q["statement_type"]

        start_time = q.get("start_time")
        end_time = q.get("end_time")

        entry = QueryLogEntry(
            query_id=q.get("query_id"),
            query_text=query_text,
            start_time=isoparse(start_time) if start_time else None,
            end_time=isoparse(end_time) if end_time else None,
            user=q.get("user"),
            extra=extra or None,
        )
        entries.append(entry)

    if truncated:
        log.info("Truncated %d query text(s) exceeding %d chars", truncated, _MAX_QUERY_TEXT_LEN)
    return entries


def push(
    input_file: str,
    resource_uuid: str,
    key_id: str,
    key_token: str,
    batch_size: int = _BATCH_SIZE,
    output_file: str = "query_logs_push_result.json",
) -> dict:
    """Read a query log manifest and push entries to Monte Carlo in batches."""
    endpoint = _ENDPOINT
    log.info("Using endpoint: %s", endpoint)

    with open(input_file) as fh:
        manifest = json.load(fh)

    queries = manifest.get("queries", [])
    log_type = manifest.get("log_type", LOG_TYPE)
    entries = _build_query_log_entries(queries)
    log.info("Loaded %d query log entry/entries from %s", len(entries), input_file)

    if not entries:
        log.info("No query log entries to push.")
        push_result = {
            "resource_uuid": resource_uuid,
            "log_type": log_type,
            "invocation_ids": [],
            "pushed_at": datetime.now(timezone.utc).isoformat(),
            "total_entries": 0,
            "batch_count": 0,
            "batch_size": batch_size,
        }
        with open(output_file, "w") as fh:
            json.dump(push_result, fh, indent=2)
        return push_result

    batches = [entries[i : i + batch_size] for i in range(0, len(entries), batch_size)]
    total_batches = len(batches)

    def _push_batch(batch: list[QueryLogEntry], batch_num: int) -> str | None:
        client = Client(session=Session(
            mcd_id=key_id, mcd_token=key_token, scope="Ingestion", endpoint=endpoint,
        ))
        service = IngestionService(mc_client=client)
        result = service.send_query_logs(
            resource_uuid=resource_uuid,
            log_type=log_type,
            events=batch,
        )
        invocation_id = service.extract_invocation_id(result)
        log.info(
            "Pushed batch %d/%d (%d entries) — invocation_id=%s",
            batch_num, total_batches, len(batch), invocation_id,
        )
        return invocation_id

    max_workers = min(4, total_batches)
    invocation_ids: list[str | None] = [None] * total_batches

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(_push_batch, batch, i + 1): i
            for i, batch in enumerate(batches)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                invocation_ids[idx] = future.result()
            except Exception as exc:
                log.error("ERROR pushing batch %d: %s", idx + 1, exc)
                raise

    log.info("All %d batch(es) pushed.", total_batches)

    push_result = {
        "resource_uuid": resource_uuid,
        "log_type": log_type,
        "invocation_ids": invocation_ids,
        "pushed_at": datetime.now(timezone.utc).isoformat(),
        "total_entries": len(entries),
        "batch_count": total_batches,
        "batch_size": batch_size,
    }
    with open(output_file, "w") as fh:
        json.dump(push_result, fh, indent=2)
    log.info("Push result written to %s", output_file)

    return push_result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Push BigQuery query logs from a manifest to Monte Carlo",
    )
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--input-file", default="query_logs_output.json")
    parser.add_argument("--output-file", default="query_logs_push_result.json")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max entries per push batch (default: {_BATCH_SIZE})",
    )
    args = parser.parse_args()

    required = ["resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    push(
        input_file=args.input_file,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        output_file=args.output_file,
    )


if __name__ == "__main__":
    main()
