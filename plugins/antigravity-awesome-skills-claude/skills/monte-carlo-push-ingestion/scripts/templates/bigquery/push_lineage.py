"""
BigQuery — Lineage Push (push only)
====================================
Reads a manifest file produced by ``collect_lineage.py`` and pushes the lineage
events to Monte Carlo using the pycarlo push ingestion API.  Large payloads are
split into batches to stay under the 1 MB compressed limit.

Can be run standalone via CLI or imported (use the ``push()`` function).

Substitution points (search for "← SUBSTITUTE"):
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the BigQuery connection in Monte Carlo

Prerequisites:
  pip install pycarlo
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from pycarlo.core import Client, Session
from pycarlo.features.ingestion import IngestionService
from pycarlo.features.ingestion.models import (
    LineageAssetRef,
    LineageEvent,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "bigquery"

# Maximum events per batch — conservative default to keep compressed payload under 1 MB
# ← SUBSTITUTE: tune based on average edge complexity (number of sources per event)
_BATCH_SIZE = 500


def _make_ref(database: str, schema: str, table: str) -> LineageAssetRef:
    return LineageAssetRef(
        type="TABLE",
        name=table,
        database=database,
        schema=schema,
    )


def _build_events(edges: list[dict]) -> list[LineageEvent]:
    """Build LineageEvent objects from manifest edge dicts."""
    events = []
    for edge in edges:
        dest = edge["destination"]
        sources = edge.get("sources", [])
        if not sources:
            continue
        events.append(
            LineageEvent(
                destination=_make_ref(dest["database"], dest["schema"], dest["table"]),
                sources=[
                    _make_ref(s["database"], s["schema"], s["table"])
                    for s in sources
                ],
            )
        )
    return events


def push(
    input_file: str,
    resource_uuid: str,
    key_id: str,
    key_token: str,
    batch_size: int = _BATCH_SIZE,
    output_file: str = "lineage_push_result.json",
) -> dict:
    """
    Read a lineage manifest and push events to Monte Carlo in batches.

    Returns a result dict with invocation IDs for each batch.
    """
    with open(input_file) as fh:
        manifest = json.load(fh)

    edges = manifest.get("edges", [])
    resource_type = manifest.get("resource_type", RESOURCE_TYPE)
    events = _build_events(edges)
    log.info("Loaded %d lineage event(s) from %s", len(events), input_file)

    if not events:
        log.info("No lineage events to push.")
        push_result = {
            "resource_uuid": resource_uuid,
            "resource_type": resource_type,
            "invocation_ids": [],
            "pushed_at": datetime.now(timezone.utc).isoformat(),
            "total_events": 0,
            "batch_count": 0,
            "batch_size": batch_size,
        }
        with open(output_file, "w") as fh:
            json.dump(push_result, fh, indent=2)
        return push_result

    # Split into batches
    batches = []
    for i in range(0, len(events), batch_size):
        batches.append(events[i : i + batch_size])
    total_batches = len(batches)

    def _push_batch(batch: list, batch_num: int) -> str | None:
        """Push a single batch using a dedicated Session (thread-safe)."""
        log.info("Pushing batch %d/%d (%d events) ...", batch_num, total_batches, len(batch))
        client = Client(session=Session(mcd_id=key_id, mcd_token=key_token, scope="Ingestion"))
        service = IngestionService(mc_client=client)
        result = service.send_lineage(
            resource_uuid=resource_uuid,
            resource_type=resource_type,
            events=batch,
        )
        invocation_id = service.extract_invocation_id(result)
        if invocation_id:
            log.info("  Batch %d: invocation_id=%s", batch_num, invocation_id)
        return invocation_id

    # Push batches in parallel (each thread gets its own pycarlo Session)
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

    log.info("All %d batches pushed (%d workers)", total_batches, max_workers)

    push_result = {
        "resource_uuid": resource_uuid,
        "resource_type": resource_type,
        "invocation_ids": invocation_ids,
        "pushed_at": datetime.now(timezone.utc).isoformat(),
        "total_events": len(events),
        "batch_count": total_batches,
        "batch_size": batch_size,
    }
    with open(output_file, "w") as fh:
        json.dump(push_result, fh, indent=2)
    log.info("Push result written to %s", output_file)

    return push_result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Push BigQuery lineage from a manifest to Monte Carlo",
    )
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--input-file", default="lineage_output.json")
    parser.add_argument("--output-file", default="lineage_push_result.json")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max events per push batch (default: {_BATCH_SIZE})",
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
