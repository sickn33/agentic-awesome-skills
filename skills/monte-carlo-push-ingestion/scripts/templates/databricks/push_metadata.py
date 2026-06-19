"""
Databricks — Metadata Push (push-only)
========================================
Reads a JSON manifest file produced by collect_metadata.py and pushes the assets
to Monte Carlo via the push ingestion API, with configurable batching to keep
compressed payloads under 1 MB.

Substitution points (search for "← SUBSTITUTE"):
  - MCD_INGEST_ID / MCD_INGEST_TOKEN : Monte Carlo API credentials
  - MCD_RESOURCE_UUID      : UUID of the Databricks connection in Monte Carlo
  - PUSH_BATCH_SIZE       : number of assets per API call (default 500)

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
from typing import Any

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

RESOURCE_TYPE = "databricks"
DEFAULT_BATCH_SIZE = 500  # ← SUBSTITUTE: conservative default to stay under 1 MB compressed


def _asset_from_dict(d: dict[str, Any]) -> RelationalAsset:
    """Reconstruct a RelationalAsset from a manifest dict."""
    fields = [
        AssetField(
            name=f["name"],
            type=f.get("type"),
            description=f.get("description"),
        )
        for f in d.get("fields", [])
    ]

    volume = None
    if d.get("row_count") is not None or d.get("byte_count") is not None:
        volume = AssetVolume(row_count=d.get("row_count"), byte_count=d.get("byte_count"))

    freshness = None
    if d.get("last_updated") is not None:
        freshness = AssetFreshness(last_update_time=d.get("last_updated"))

    return RelationalAsset(
        type=d.get("asset_type", "TABLE"),
        metadata=AssetMetadata(
            name=d["asset_name"],
            database=d["database"],    # ← SUBSTITUTE: use catalog as database
            schema=d["schema"],
            description=d.get("description"),
        ),
        fields=fields,
        volume=volume,
        freshness=freshness,
    )


def push(
    manifest_path: str,
    resource_uuid: str,
    key_id: str,
    key_token: str,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> dict[str, Any]:
    """Read a collect manifest and push assets to Monte Carlo in batches.

    Returns a summary dict with invocation IDs and counts.
    """
    with open(manifest_path) as fh:
        manifest = json.load(fh)

    asset_dicts: list[dict[str, Any]] = manifest["assets"]
    assets = [_asset_from_dict(d) for d in asset_dicts]
    log.info("Loaded %d assets from %s", len(assets), manifest_path)

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
            resource_type=RESOURCE_TYPE,
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

    pushed_at = datetime.now(timezone.utc).isoformat()
    summary = {
        "resource_uuid": resource_uuid,
        "resource_type": RESOURCE_TYPE,
        "invocation_ids": invocation_ids,
        "pushed_at": pushed_at,
        "asset_count": len(assets),
        "batch_count": total_batches,
        "batch_size": batch_size,
        "catalog": manifest.get("catalog"),
    }

    # Write push result alongside the collect manifest
    push_manifest_path = manifest_path.replace(".json", "_push_result.json")
    with open(push_manifest_path, "w") as fh:
        json.dump(summary, fh, indent=2)
    log.info("Push result written to %s", push_manifest_path)

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Push Databricks metadata to Monte Carlo from manifest")
    parser.add_argument("--manifest", default="manifest_metadata.json")
    parser.add_argument("--resource-uuid", default=os.getenv("MCD_RESOURCE_UUID"))
    parser.add_argument("--key-id", default=os.getenv("MCD_INGEST_ID"))
    parser.add_argument("--key-token", default=os.getenv("MCD_INGEST_TOKEN"))
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    args = parser.parse_args()

    required = ["resource_uuid", "key_id", "key_token"]
    missing = [k for k in required if getattr(args, k) is None]
    if missing:
        parser.error(f"Missing required arguments/env vars: {missing}")

    push(
        manifest_path=args.manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
