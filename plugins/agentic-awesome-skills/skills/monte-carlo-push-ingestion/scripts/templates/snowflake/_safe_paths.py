"""Local manifest and explicit push guards for the Monte Carlo examples.

These are adaptation templates, not an unattended production ingestion service.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from datetime import datetime, timezone

MAX_MANIFEST_BYTES = 32 * 1024 * 1024
MAX_PAYLOAD_BYTES = 900_000  # conservative uncompressed bytes, including envelope
_RECEIPT = None


def _allow_external_paths() -> bool:
    return os.getenv("MCD_ALLOW_EXTERNAL_PATHS", "").lower() in {"1", "true", "yes"}


def _resolve_local_path(raw_path: str, *, expect_file=False, create_parent=False) -> Path:
    value = str(raw_path).strip()
    if not value or "\0" in value:
        raise ValueError("Path must be non-empty")
    base = Path.cwd().resolve()
    candidate = Path(value).expanduser()
    unresolved = candidate if candidate.is_absolute() else base / candidate
    # Reject symlinks even when their destination is inside the permitted workspace.
    if any(p.is_symlink() for p in [unresolved, *unresolved.parents]):
        raise ValueError("Symlink paths are not supported")
    resolved = unresolved.resolve()
    if not _allow_external_paths():
        try:
            resolved.relative_to(base)
        except ValueError as exc:
            raise ValueError("Path must remain under the current working directory") from exc
    if expect_file and not resolved.is_file():
        raise FileNotFoundError("Input file not found")
    if create_parent:
        resolved.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    return resolved


def safe_input_json_path(raw_path: str) -> Path:
    path = _resolve_local_path(raw_path, expect_file=True)
    if path.suffix.lower() != ".json":
        raise ValueError("Input manifest must be a .json file")
    return path


def safe_output_json_path(raw_path: str) -> Path:
    path = _resolve_local_path(raw_path)
    if path.suffix.lower() != ".json":
        raise ValueError("Output manifest must be a .json file")
    if path.exists():
        raise FileExistsError("Choose a new output name; manifests are never overwritten")
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    return path


def safe_existing_directory(raw_path: str) -> Path:
    path = _resolve_local_path(raw_path)
    if not path.is_dir():
        raise NotADirectoryError("Directory not found")
    return path


def read_json_file(raw_path: str):
    path = safe_input_json_path(raw_path)
    with path.open("rb") as fh:
        raw = fh.read(MAX_MANIFEST_BYTES + 1)
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ValueError("Manifest exceeds the 32 MiB template limit; narrow the collection")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError("Manifest must contain a JSON object")
    return value


def read_text_file(raw_path: str) -> str:
    path = _resolve_local_path(raw_path, expect_file=True)
    with path.open("rb") as fh:
        raw = fh.read(MAX_MANIFEST_BYTES + 1)
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ValueError("Log exceeds the 32 MiB template limit; use an approved bounded extract")
    return raw.decode("utf-8", errors="replace")


def write_json_file(raw_path: str, payload, *, indent=2, default=None):
    path = safe_output_json_path(raw_path)
    raw = json.dumps(payload, indent=indent, default=default, allow_nan=False).encode("utf-8")
    if len(raw) > MAX_MANIFEST_BYTES:
        raise ValueError("Manifest exceeds the 32 MiB template limit")
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as fh:
        fh.write(raw)


def validate_push(manifest, resource_uuid, batch_size):
    """Require approved destination, finite batches and a new private receipt."""
    global _RECEIPT
    if not resource_uuid or os.getenv("MCD_APPROVED_RESOURCE_UUID") != resource_uuid:
        raise ValueError("Set MCD_APPROVED_RESOURCE_UUID to the explicitly approved destination")
    if isinstance(batch_size, bool) or not isinstance(batch_size, int) or not 1 <= batch_size <= 500:
        raise ValueError("batch_size must be between 1 and 500")
    if manifest.get("lineage_candidates") and os.getenv("MCD_REVIEWED_LINEAGE") != "1":
        raise ValueError("Review every inferred lineage edge before setting MCD_REVIEWED_LINEAGE=1")
    if manifest.get("requires_verified_completion"):
        raise ValueError("Log parser has no authoritative completion times; adapt and verify before pushing")
    receipt = os.getenv("MCD_PUSH_RECEIPT")
    if not receipt:
        raise ValueError("MCD_PUSH_RECEIPT must name a new private .json batch journal")
    _RECEIPT = safe_output_json_path(receipt)
    write_json_file(str(_RECEIPT), {"resource_uuid": resource_uuid, "batches": []})


def checked_send(service, method, **kwargs):
    """Check exact SDK wire bytes and journal each attempt before another batch."""
    from pycarlo.features.ingestion.models import (
        build_metadata_payload, build_lineage_payload, build_query_log_payload,
    )
    builders = {"send_metadata": build_metadata_payload, "send_lineage": build_lineage_payload,
                "send_query_logs": build_query_log_payload}
    payload = builders[method](**kwargs)
    raw = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
    if len(raw) > MAX_PAYLOAD_BYTES:
        raise ValueError("Serialized payload exceeds 900000 bytes; use smaller batches without truncating SQL")
    if _RECEIPT is None:
        raise RuntimeError("Push was not initialized")
    record = {"method": method, "payload_sha256": hashlib.sha256(raw).hexdigest(),
              "event_count": len(kwargs["events"]), "started_at": datetime.now(timezone.utc).isoformat(),
              "status": "attempted_outcome_unknown"}
    def persist():
        # This journal is created exclusively by validate_push; never store SQL or credentials.
        fd = os.open(_RECEIPT, os.O_WRONLY | os.O_TRUNC | getattr(os, "O_NOFOLLOW", 0))
        with os.fdopen(fd, "w") as fh:
            json.dump(journal, fh, indent=2)
            fh.flush()
            os.fsync(fh.fileno())
    journal = read_json_file(str(_RECEIPT))
    journal["batches"].append(record)
    persist()
    try:
        result = getattr(service, method)(**kwargs)
    except Exception:
        raise RuntimeError("Request failed or outcome ambiguous; consult the private receipt before retrying") from None
    record["invocation_id"] = service.extract_invocation_id(result)
    record["status"] = "accepted_unverified" if record["invocation_id"] else "response_without_invocation_id"
    persist()
    if not record["invocation_id"]:
        raise RuntimeError("No invocation ID returned; stop and investigate without automatic retry")
    return result
