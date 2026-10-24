#!/usr/bin/env python3
"""
Push a collected Hive lineage manifest to Monte Carlo — push only.

Reads a JSON manifest produced by ``collect_lineage.py``, builds LineageEvent
objects (table-level or column-level), and calls ``send_lineage`` in batches.
A separate result manifest records ``resource_uuid`` and ``invocation_id``
after a successful push.

Can be run standalone via CLI or imported (use the ``push()`` function).

Substitution points
-------------------
- MCD_INGEST_ID    (env) / --key-id        (CLI) : Monte Carlo ingestion key ID
- MCD_INGEST_TOKEN (env) / --key-token      (CLI) : Monte Carlo ingestion key token
- MCD_RESOURCE_UUID    (env) / --resource-uuid  (CLI) : MC resource UUID for this connection

Prerequisites
-------------
    python -m pip install pycarlo==0.15.491 python-dotenv

Usage (table-level):
    python push_lineage.py \\
        --key-id  <MCD_INGEST_ID> \\
        --resource-uuid <MCD_RESOURCE_UUID> \\
        --input-file lineage_output.json

Usage (column-level):
    python push_lineage.py ... --column-lineage
"""

import argparse
import json
import os

from pycarlo.core import Client, Session
from pycarlo.features.ingestion import IngestionService
from pycarlo.features.ingestion.models import (
    ColumnLineageField,
    ColumnLineageSourceField,
    LineageAssetRef,
    LineageEvent,
)
from _safe_paths import validate_push, checked_send, safe_existing_directory, safe_input_json_path, safe_output_json_path, read_json_file, write_json_file

# ← SUBSTITUTE: set RESOURCE_TYPE to match your Monte Carlo connection type
RESOURCE_TYPE = "data-lake"

# ← SUBSTITUTE: default batch size for lineage push (events per request)
DEFAULT_BATCH_SIZE = 500



def _build_table_lineage(edges_data: list[dict]) -> list[LineageEvent]:
    """Build table-level LineageEvent objects from raw edge dicts."""
    events = []
    for edge in edges_data:
        sources = edge.get("sources", [])
        if not sources:
            continue
        dest = edge["destination"]
        events.append(
            LineageEvent(
                destination=LineageAssetRef(
                    type="TABLE",
                    name=dest["table"],
                    database=dest["database"],
                    schema=dest["database"],
                ),
                sources=[
                    LineageAssetRef(
                        type="TABLE",
                        name=src["table"],
                        database=src["database"],
                        schema=src["database"],
                    )
                    for src in sources
                ],
            )
        )
    return events


def _build_column_lineage(edges_data: list[dict]) -> list[LineageEvent]:
    """Build column-level LineageEvent objects from raw edge dicts."""
    events = []
    for edge in edges_data:
        sources = edge.get("sources", [])
        if not sources:
            continue

        dest = edge["destination"]
        dest_asset_id = f"{dest['database']}__{dest['table']}"
        source_asset_ids = {
            (src["database"], src["table"]): f"{src['database']}__{src['table']}"
            for src in sources
        }

        col_fields: dict[str, ColumnLineageField] = {}
        for mapping in edge.get("col_mappings", []):
            dest_col = mapping["dest_col"]
            src_table = mapping["src_table"]
            src_col = mapping["src_col"]
            matches = [src for src in sources if src["table"] == src_table]
            if len(matches) != 1:
                raise ValueError("Column source must resolve to exactly one qualified asset")
            src_db = matches[0]["database"]
            src_aid = source_asset_ids.get((src_db, src_table), f"{src_db}__{src_table}")
            if dest_col not in col_fields:
                col_fields[dest_col] = ColumnLineageField(name=dest_col, source_fields=[])
            col_fields[dest_col].source_fields.append(
                ColumnLineageSourceField(asset_id=src_aid, field_name=src_col)
            )

        events.append(
            LineageEvent(
                destination=LineageAssetRef(
                    type="TABLE",
                    name=dest["table"],
                    database=dest["database"],
                    schema=dest["database"],
                    asset_id=dest_asset_id,
                ),
                sources=[
                    LineageAssetRef(
                        type="TABLE",
                        name=src["table"],
                        database=src["database"],
                        schema=src["database"],
                        asset_id=source_asset_ids[(src["database"], src["table"])],
                    )
                    for src in sources
                ],
                fields=list(col_fields.values()) if col_fields else None,
            )
        )
    return events


def push(
    manifest: dict,
    resource_uuid: str,
    key_id: str,
    key_token: str,
    column_lineage: bool = False,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> str | None:
    """
    Push collected lineage to Monte Carlo and update the manifest in-place.

    Events are sent in batches of ``batch_size`` (default 500) to avoid
    oversized payloads.  Supports both table-level and column-level lineage.

    Args:
        manifest: Dict loaded from a ``collect_lineage.py`` output file.
        resource_uuid: MC resource UUID for this Hive connection.
        key_id: MC ingestion key ID.
        key_token: MC ingestion key token.
        column_lineage: When True, push column-level lineage; otherwise table-level.
        batch_size: Events per POST request (default 500).

    Returns:
        The last invocation ID string if returned by MC, otherwise None.
    """
    validate_push(manifest, resource_uuid, batch_size)
    resource_type = manifest.get("resource_type", RESOURCE_TYPE)
    edges_data = manifest.get("edges", [])

    if column_lineage:
        events = _build_column_lineage(edges_data)
        label = "column-level"
    else:
        events = _build_table_lineage(edges_data)
        label = "table-level"

    print(f"Loaded {len(events)} {label} lineage event(s) from manifest")

    if not events:
        print("No lineage events to push.")
        manifest["resource_uuid"] = resource_uuid
        manifest["invocation_id"] = None
        return None

    # Split into batches
    batch_list = []
    for i in range(0, len(events), batch_size):
        batch_list.append(events[i : i + batch_size])
    total_batches = len(batch_list)

    def _push_batch(batch: list, batch_num: int) -> str | None:
        """Push a single batch using a dedicated Session (thread-safe)."""
        print(f"  Pushing batch {batch_num}/{total_batches} ({len(batch)} events) ...")
        client = Client(session=Session(mcd_id=key_id, mcd_token=key_token, scope="Ingestion"))
        service = IngestionService(mc_client=client)
        result = checked_send(service, "send_lineage",
            resource_uuid=resource_uuid,
            resource_type=resource_type,
            events=batch,
        )
        invocation_id = service.extract_invocation_id(result)
        if invocation_id:
            print(f"    Batch {batch_num}: invocation_id={invocation_id}")
        return invocation_id

    # Deliver sequentially; preserve each accepted result before the next request.
    max_workers = 1
    invocation_ids: list[str | None] = [None] * total_batches

    # Sequential delivery stops immediately after an ambiguous/failed batch.
    for idx, batch in enumerate(batch_list):
        invocation_ids[idx] = _push_batch(batch, idx + 1)

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
        description="Push a collected Hive lineage manifest to Monte Carlo",
    )
    parser.add_argument(
        "--key-id",
        default=os.environ.get("MCD_INGEST_ID"),
        help="Monte Carlo ingestion key ID (env: MCD_INGEST_ID)",
    )
    parser.add_argument(
        "--key-token", choices=[],
        default=os.environ.get("MCD_INGEST_TOKEN"),
        help="Monte Carlo ingestion key token (env: MCD_INGEST_TOKEN)",
    )
    parser.add_argument(
        "--resource-uuid",
        default=os.environ.get("MCD_RESOURCE_UUID"),
        help="Monte Carlo resource UUID for this Hive connection (env: MCD_RESOURCE_UUID)",
    )
    parser.add_argument(
        "--input-file",
        default="lineage_output.json",
        help="Path to the JSON manifest written by collect_lineage.py (default: lineage_output.json)",
    )
    parser.add_argument(
        "--column-lineage",
        action="store_true",
        help="Push column-level lineage instead of table-level",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        metavar="N",
        help=f"Max events per POST (default: {DEFAULT_BATCH_SIZE})",
    )
    args = parser.parse_args()

    if not args.key_id or not args.key_token:
        parser.error("--key-id and --key-token are required (or set MCD_INGEST_ID / MCD_INGEST_TOKEN)")
    if not args.resource_uuid:
        parser.error("--resource-uuid is required (or set MCD_RESOURCE_UUID)")

    manifest = read_json_file(args.input_file)

    push(
        manifest=manifest,
        resource_uuid=args.resource_uuid,
        key_id=args.key_id,
        key_token=args.key_token,
        column_lineage=args.column_lineage,
        batch_size=args.batch_size,
    )

    write_json_file(args.input_file[:-5] + "_push_result.json", manifest)
    print(f"Push receipt saved separately for: {args.input_file}")
    print("Done.")


if __name__ == "__main__":
    main()
