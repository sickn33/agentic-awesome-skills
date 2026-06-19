#!/usr/bin/env python3
"""
Push table metadata to Monte Carlo from a JSON manifest — push only.

Reads a manifest file produced by ``collect_metadata.py`` and sends the assets
to Monte Carlo as RelationalAsset events using the pycarlo push ingestion API.
Large payloads are split into batches to stay under the 1 MB compressed limit.

Can be run standalone via CLI or imported (use the ``push()`` function).

Substitution points
-------------------
- MCD_INGEST_ID     (env) / --key-id     (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN  (env) / --key-token  (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID     (env) / --resource-uuid (CLI) : MC resource UUID for this connection

Prerequisites
-------------
    pip install pycarlo

Usage
-----
    python push_metadata.py \\
        --key-id  <MCD_INGEST_ID> \\
        --key-token <MCD_INGEST_TOKEN> \\
        --resource-uuid <MCD_RESOURCE_UUID> \\
        --input-file metadata_output.json
"""

import argparse
import json
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

# ← SUBSTITUTE: set RESOURCE_TYPE to match your Monte Carlo connection type
RESOURCE_TYPE = "snowflake"

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
            database=d["database"],
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
    print(f"Loaded {len(assets)} asset(s) from {input_file}")

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
        print(f"  Pushed batch {batch_num}/{total_batches} ({len(batch)} assets) — invocation_id={invocation_id}")
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
                print(f"    ERROR pushing batch {idx + 1}: {exc}")
                raise

    print(f"  All {total_batches} batches pushed ({max_workers} workers)")

    push_result = {
        "resource_uuid": resource_uuid,
        "resource_type": resource_type,
        "invocation_ids": invocation_ids,
        "pushed_at": datetime.now(tz=timezone.utc).isoformat(),
        "total_assets": len(assets),
        "batch_count": total_batches,
        "batch_size": batch_size,
    }
    with open(output_file, "w") as fh:
        json.dump(push_result, fh, indent=2)
    print(f"Push result written to {output_file}")

    return push_result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Push Snowflake table metadata from a manifest to Monte Carlo",
    )
    parser.add_argument(
        "--key-id",
        default=os.environ.get("MCD_INGEST_ID"),
        help="Monte Carlo ingestion key ID (env: MCD_INGEST_ID)",
    )
    parser.add_argument(
        "--key-token",
        default=os.environ.get("MCD_INGEST_TOKEN"),
        help="Monte Carlo ingestion key token (env: MCD_INGEST_TOKEN)",
    )
    parser.add_argument(
        "--resource-uuid",
        default=os.environ.get("MCD_RESOURCE_UUID"),
        help="Monte Carlo resource UUID for this Snowflake connection (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--input-file",
        default="metadata_output.json",
        help="Path to the collect manifest to read (default: metadata_output.json)",
    )
    parser.add_argument(
        "--output-file",
        default="metadata_push_result.json",
        help="Path to write the push result (default: metadata_push_result.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=_BATCH_SIZE,
        help=f"Max assets per push batch (default: {_BATCH_SIZE})",
    )
    args = parser.parse_args()

    missing = [
        name
        for name, val in [
            ("--key-id", args.key_id),
            ("--key-token", args.key_token),
            ("--resource-uuid", args.resource_uuid),
        ]
        if not val
    ]
    if missing:
        parser.error(f"Missing required arguments: {', '.join(missing)}")

    push(
        input_file=args.input_file,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        output_file=args.output_file,
    )
    print("Done.")


if __name__ == "__main__":
    main()
