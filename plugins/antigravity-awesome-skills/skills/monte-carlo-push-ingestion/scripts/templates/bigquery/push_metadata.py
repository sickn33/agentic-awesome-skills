"""
BigQuery — Metadata Push (push only)
=====================================
Reads a manifest file produced by ``collect_metadata.py`` and pushes the assets
to Monte Carlo using the pycarlo push ingestion API.  Large payloads are split
into batches to stay under the 1 MB compressed limit.

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
    AssetField,
    AssetFreshness,
    AssetMetadata,
    AssetVolume,
    RelationalAsset,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

RESOURCE_TYPE = "bigquery"

# Maximum assets per batch — conservative default to keep compressed payload under 1 MB
# ← SUBSTITUTE: tune based on average asset size (fields per table, description length, etc.)
_BATCH_SIZE = 500


def _asset_from_dict(d: dict) -> RelationalAsset:
    """Reconstruct a RelationalAsset from a manifest dict entry."""
    fields = [
        AssetField(
            name=f["name"],
            type=f.get("type"),
            description=f.get("description"),
        )
        for f in d.get("fields", [])
    ]

    volume = None
    if d.get("volume"):
        volume = AssetVolume(
            row_count=d["volume"].get("row_count"),
            byte_count=d["volume"].get("byte_count"),
        )

    freshness = None
    if d.get("freshness"):
        freshness = AssetFreshness(
            last_update_time=d["freshness"].get("last_update_time"),
        )

    return RelationalAsset(
        type=d.get("type", "TABLE"),
        metadata=AssetMetadata(
            name=d["name"],
            database=d["database"],  # ← SUBSTITUTE: use project or dataset as database
            schema=d["schema"],
            description=d.get("description"),
        ),
        fields=fields,
        volume=volume,
        freshness=freshness,
    )


def push(
    input_file: str,
    resource_uuid: str,
    key_id: str,
    key_token: str,
    batch_size: int = _BATCH_SIZE,
    output_file: str = "metadata_push_result.json",
) -> dict:
    """
    Read a metadata manifest and push assets to Monte Carlo in batches.

    Returns a result dict with invocation IDs for each batch.
    """
    with open(input_file) as fh:
        manifest = json.load(fh)

    asset_dicts = manifest.get("assets", [])
    resource_type = manifest.get("resource_type", RESOURCE_TYPE)
    assets = [_asset_from_dict(d) for d in asset_dicts]
    log.info("Loaded %d asset(s) from %s", len(assets), input_file)

    # Split into batches
    batches = []
    for i in range(0, max(len(assets), 1), batch_size):
        batches.append(assets[i : i + batch_size])
    total_batches = len(batches)

    def _push_batch(batch: list, batch_num: int) -> str | None:
        """Push a single batch using a dedicated Session (thread-safe)."""
        client = Client(session=Session(mcd_id=key_id, mcd_token=key_token, scope="Ingestion"))
        service = IngestionService(mc_client=client)
        result = service.send_metadata(
            resource_uuid=resource_uuid,
            resource_type=resource_type,
            events=batch,
        )
        invocation_id = service.extract_invocation_id(result)
        log.info("Pushed batch %d/%d (%d assets) — invocation_id=%s", batch_num, total_batches, len(batch), invocation_id)
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
        "total_assets": len(assets),
        "batch_count": total_batches,
        "batch_size": batch_size,
    }
    with open(output_file, "w") as fh:
        json.dump(push_result, fh, indent=2)
    log.info("Push result written to %s", output_file)

    return push_result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Push BigQuery metadata from a manifest to Monte Carlo",
    )
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--input-file", default="metadata_output.json")
    parser.add_argument("--output-file", default="metadata_push_result.json")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max assets per push batch (default: {_BATCH_SIZE})",
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
