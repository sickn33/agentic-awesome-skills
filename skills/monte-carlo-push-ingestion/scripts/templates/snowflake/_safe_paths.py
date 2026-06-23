"""Path guards for local Monte Carlo template manifests."""

from __future__ import annotations

import json
import os
from pathlib import Path


def _allow_external_paths() -> bool:
    return os.getenv("MCD_ALLOW_EXTERNAL_PATHS", "").lower() in {"1", "true", "yes"}


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_local_path(raw_path: str, *, expect_file: bool = False, create_parent: bool = False) -> Path:
    value = str(raw_path).strip()
    if not value or "\0" in value:
        raise ValueError("Path must be a non-empty filesystem path")
    base = Path.cwd().resolve()
    candidate = Path(value).expanduser()
    resolved = (candidate if candidate.is_absolute() else base / candidate).resolve()
    if not _allow_external_paths() and not _is_relative_to(resolved, base):
        raise ValueError(f"Path must stay under the current working directory: {raw_path!r}")
    if expect_file and not resolved.is_file():
        raise FileNotFoundError(f"Input file not found: {resolved}")
    if create_parent:
        resolved.parent.mkdir(parents=True, exist_ok=True)
    return resolved


def safe_input_json_path(raw_path: str) -> Path:
    path = _resolve_local_path(raw_path, expect_file=True)
    if path.suffix.lower() != ".json":
        raise ValueError(f"Input manifest must be a .json file: {path}")
    return path


def safe_output_json_path(raw_path: str) -> Path:
    path = _resolve_local_path(raw_path, create_parent=True)
    if path.suffix.lower() != ".json":
        raise ValueError(f"Output manifest must be a .json file: {path}")
    return path


def safe_existing_directory(raw_path: str) -> Path:
    path = _resolve_local_path(raw_path)
    if not path.is_dir():
        raise NotADirectoryError(f"Directory not found: {path}")
    return path


def read_json_file(raw_path: str):
    with safe_input_json_path(raw_path).open() as fh:
        return json.load(fh)


def write_json_file(raw_path: str, payload, *, indent: int = 2, default=None) -> None:
    with safe_output_json_path(raw_path).open("w") as fh:
        json.dump(payload, fh, indent=indent, default=default)
