#!/usr/bin/env python3
"""
Push a collected Hive metadata manifest to Monte Carlo — push only.

Reads a JSON manifest produced by ``collect_metadata.py``, builds
RelationalAsset objects, and calls ``send_metadata`` in batches.  The manifest
is updated in-place with ``resource_uuid`` and ``invocation_id`` after a
successful push.

Can be run standalone via CLI or imported (use the ``push()`` function).

Substitution points
-------------------
- MCD_INGEST_ID    (env) / --key-id        (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN (env) / --key-token      (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID    (env) / --resource-uuid  (CLI) : MC resource UUID for this connection

Prerequisites
-------------
    pip install pycarlo python-dotenv

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

# ← SUBSTITUTE: default batch size for metadata push (assets per request)
DEFAULT_BATCH_SIZE = 500

# ← SUBSTITUTE: HTTP timeout for MC ingestion requests (seconds)
DEFAULT_TIMEOUT_SECONDS = 120


def _build_assets(manifest: dict) -> list[RelationalAsset]:
    """Rebuild RelationalAsset objects from a collected metadata manifest."""
    assets = []
    for a in manifest.get("assets", []):
        fields = [
            AssetField(
                name=f["name"],
                type=f["type"],
                description=f.get("description"),
            )
            for f in a.get("fields", [])
        ]

        volume = None
        row_count = a.get("row_count")
        byte_count = a.get("byte_count")
        if row_count or byte_count:
            volume = AssetVolume(
                row_count=row_count if row_count and row_count > 0 else None,
                byte_count=byte_count if byte_count and byte_count > 0 else None,
            )

        freshness = None
        last_modified = a.get("last_modified")
        if last_modified:
            freshness = AssetFreshness(last_update_time=last_modified)

        assets.append(
            RelationalAsset(
                type="TABLE",
                metadata=AssetMetadata(
                    name=a["name"],
                    database=a["database"],
                    schema=a["schema"],
                    description=a.get("description"),
                    created_on=a.get("created_on"),
                ),
                fields=fields,
                volume=volume,
                freshness=freshness,
            )
        )
    return assets


def push(
    manifest: dict,
    resource_uuid: str,
    key_id: str,
    key_token: str,
    batch_size: int = DEFAULT_BATCH_SIZE,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
) -> str | None:
    """
    Push collected metadata to Monte Carlo and update the manifest in-place.

    Assets are sent in batches of ``batch_size`` (default 500) to avoid
    oversized payloads.  The manifest is enriched with ``resource_uuid``
    and the last ``invocation_id`` from the response.

    Args:
        manifest: Dict loaded from a ``collect_metadata.py`` output file.
        resource_uuid: MC resource UUID for this Hive connection.
        key_id: MC ingestion key ID.
        key_token: MC ingestion key token.
        batch_size: Assets per POST request (default 500).
        timeout_seconds: HTTP timeout per request (default 120).

    Returns:
        The last invocation ID string if returned by MC, otherwise None.
    """
    resource_type = manifest.get("resource_type", "data-lake")

    assets = _build_assets(manifest)
    n = len(assets)

    print(f"Loaded {n} asset(s) from manifest")

    # Split into batches
    batch_list = []
    for i in range(0, max(n, 1), batch_size):
        batch_list.append(assets[i : i + batch_size])
    total_batches = len(batch_list)

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
            for i, batch in enumerate(batch_list)
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                invocation_ids[idx] = future.result()
            except Exception as exc:
                print(f"    ERROR pushing batch {idx + 1}: {exc}")
                raise

    print(f"  All {total_batches} batches pushed ({max_workers} workers)")

    manifest["resource_uuid"] = resource_uuid
    manifest["invocation_id"] = invocation_ids[-1] if invocation_ids else None
    if len([i for i in invocation_ids if i]) > 1:
        manifest["invocation_ids"] = invocation_ids
    elif "invocation_ids" in manifest:
        del manifest["invocation_ids"]

    return manifest.get("invocation_id")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Push a collected Hive metadata manifest to Monte Carlo",
    )
    parser.add_argument(
        "--key-id",
        default=os.environ.get("MCD_INGEST_ID"),
        help="Monte Carlo ingestion key ID (env: MCD_INGEST_ID)",  # ← SUBSTITUTE env var name if different
    )
    parser.add_argument(
        "--key-token",
        default=os.environ.get("MCD_INGEST_TOKEN"),
        help="Monte Carlo ingestion key token (env: MCD_INGEST_TOKEN)",  # ← SUBSTITUTE env var name if different
    )
    parser.add_argument(
        "--resource-uuid",
        default=os.environ.get("MCD_RESOURCE_UUID"),
        required=False,
        help="Monte Carlo resource UUID for this Hive connection (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--input-file",
        default="metadata_output.json",
        help="Path to the JSON manifest written by collect_metadata.py (default: metadata_output.json)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        metavar="N",
        help=f"Max assets per POST (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT_SECONDS,
        metavar="SEC",
        help=f"HTTP timeout per request in seconds (default: {DEFAULT_TIMEOUT_SECONDS})",
    )
    args = parser.parse_args()

    if not args.key_id or not args.key_token:
        parser.error("--key-id and --key-token are required (or set MCD_INGEST_ID / MCD_INGEST_TOKEN)")
    if not args.resource_uuid:
        parser.error("--resource-uuid is required (or set MCD_RESOURCE_UUID)")

    with open(args.input_file) as fh:
        manifest = json.load(fh)

    push(
        manifest=manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        batch_size=args.batch_size,
        timeout_seconds=args.timeout,
    )

    with open(args.input_file, "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"Manifest updated in-place: {args.input_file}")
    print("Done.")


if __name__ == "__main__":
    main()
