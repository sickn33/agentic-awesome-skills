#!/usr/bin/env python3
"""NUL-safe, mode-aware Git change records and snapshot helpers."""
from __future__ import annotations

import argparse
import json
import os
import posixpath
import re
import subprocess
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path, PurePosixPath


RAW_HEADER = re.compile(
    rb"^:([0-7]{6}) ([0-7]{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])([0-9]*)$"
)
SAFE_BLOB_MODES = {"100644"}
SUPPORTED_STATUSES = {"A", "C", "D", "M", "R", "T"}


@dataclass(frozen=True)
class ChangeRecord:
    status: str
    old_path: str | None
    new_path: str | None
    old_mode: str
    new_mode: str
    old_oid: str
    new_oid: str
    similarity: int | None = None

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


@dataclass(frozen=True)
class TreeEntry:
    path: str
    mode: str
    object_type: str
    oid: str


def _run_git(repo: str | Path, args: list[str], *, input_bytes: bytes | None = None) -> bytes:
    result = subprocess.run(
        ["git", *args],
        cwd=str(repo),
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(message or f"git {' '.join(args)} failed ({result.returncode})")
    return result.stdout


def resolve_commit(repo: str | Path, ref: str) -> str:
    value = _run_git(repo, ["rev-parse", "--verify", f"{ref}^{{commit}}"]).strip().decode("ascii")
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", value):
        raise RuntimeError(f"Git returned a non-full commit object ID for {ref!r}")
    return value


def resolve_merge_base(repo: str | Path, base_ref: str, head_ref: str) -> str:
    value = _run_git(repo, ["merge-base", base_ref, head_ref]).strip().decode("ascii")
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", value):
        raise RuntimeError(f"Git returned a non-full merge base for {base_ref!r} and {head_ref!r}")
    return value


def parse_raw_diff(payload: bytes) -> list[ChangeRecord]:
    """Parse ``git diff --raw -z`` without interpreting path bytes as separators."""
    if not payload:
        return []
    fields = payload.split(b"\0")
    if fields[-1] != b"":
        raise ValueError("raw Git diff is not NUL terminated")
    fields.pop()
    records: list[ChangeRecord] = []
    index = 0
    while index < len(fields):
        match = RAW_HEADER.fullmatch(fields[index])
        if not match:
            raise ValueError(f"malformed raw Git diff header at field {index}")
        index += 1
        old_mode, new_mode, old_oid, new_oid, status_raw, similarity_raw = match.groups()
        if len(old_oid) not in {40, 64} or len(new_oid) != len(old_oid):
            raise ValueError("raw Git diff contains a truncated or mixed-width object ID")
        status = status_raw.decode("ascii")
        if status not in SUPPORTED_STATUSES:
            raise ValueError(f"unsupported raw Git diff status {status!r}")
        if status in {"R", "C"}:
            if not similarity_raw or int(similarity_raw) > 100:
                raise ValueError(f"raw Git {status} record has invalid similarity")
        elif similarity_raw:
            raise ValueError(f"raw Git {status} record unexpectedly has similarity")
        path_count = 2 if status in {"R", "C"} else 1
        if index + path_count > len(fields):
            raise ValueError("raw Git diff ended before all path fields")
        decoded = [field.decode("utf-8", "surrogateescape") for field in fields[index : index + path_count]]
        if any(not path for path in decoded):
            raise ValueError("raw Git diff contains an empty path")
        index += path_count
        old_path = decoded[0] if status != "A" else None
        new_path = decoded[-1] if status != "D" else None
        records.append(
            ChangeRecord(
                status=status,
                old_path=old_path,
                new_path=new_path,
                old_mode=old_mode.decode("ascii"),
                new_mode=new_mode.decode("ascii"),
                old_oid=old_oid.decode("ascii"),
                new_oid=new_oid.decode("ascii"),
                similarity=int(similarity_raw) if similarity_raw else None,
            )
        )
    return records


def read_change_records(
    repo: str | Path,
    base_ref: str,
    head_ref: str,
    *,
    merge_base: bool = True,
) -> tuple[str, str, list[ChangeRecord]]:
    """Return immutable endpoints and their complete raw change records.

    ``merge_base=True`` is the PR evidence mode. ``False`` is the explicit
    base/head security mode and resolves both endpoints directly.
    """
    head_oid = resolve_commit(repo, head_ref)
    base_oid = resolve_merge_base(repo, base_ref, head_oid) if merge_base else resolve_commit(repo, base_ref)
    payload = _run_git(
        repo,
        [
            "diff",
            "--raw",
            "--no-abbrev",
            "-z",
            "-M",
            "--find-copies-harder",
            base_oid,
            head_oid,
            "--",
        ],
    )
    return base_oid, head_oid, parse_raw_diff(payload)


def read_blob(repo: str | Path, oid: str) -> bytes:
    if not re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", oid):
        raise ValueError("blob object ID must be a full hexadecimal object ID")
    return _run_git(repo, ["cat-file", "blob", oid])


def read_path(repo: str | Path, commit_oid: str, path: str) -> bytes | None:
    encoded_path = path.encode("utf-8", "surrogateescape")
    spec = commit_oid.encode("ascii") + b":" + encoded_path
    result = subprocess.run(
        ["git", "cat-file", "blob", spec],
        cwd=str(repo),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode == 0:
        return result.stdout
    return None


def list_tree(repo: str | Path, commit_oid: str, prefix: str) -> list[TreeEntry]:
    raw = _run_git(repo, ["ls-tree", "-r", "-z", "--full-tree", commit_oid, "--", prefix])
    entries: list[TreeEntry] = []
    for item in raw.split(b"\0"):
        if not item:
            continue
        metadata, separator, path_bytes = item.partition(b"\t")
        if not separator:
            raise ValueError("malformed ls-tree record")
        mode, object_type, oid = metadata.decode("ascii").split(" ", 2)
        entries.append(
            TreeEntry(
                path=path_bytes.decode("utf-8", "surrogateescape"),
                mode=mode,
                object_type=object_type,
                oid=oid,
            )
        )
    return entries


def validate_repo_path(path: str) -> str | None:
    if not path or path.startswith("/") or "\\" in path or "\x00" in path:
        return "path is absolute, empty, contains NUL, or contains a literal backslash"
    if any(unicodedata.category(character) in {"Cc", "Cs"} for character in path):
        return "path contains a control character or invalid UTF-8 byte"
    normalized = posixpath.normpath(path)
    if normalized != path or normalized == ".." or normalized.startswith("../"):
        return "path is not a normalized repository-relative path"
    return None


def materialize_tree(
    repo: str | Path,
    commit_oid: str,
    prefix: str,
    destination: str | Path,
) -> list[dict[str, str]]:
    """Materialize regular non-executable blobs; report every unsafe entry."""
    root = Path(destination).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    unsafe: list[dict[str, str]] = []
    prefix_root = PurePosixPath(prefix)
    for entry in list_tree(repo, commit_oid, prefix):
        reason = validate_repo_path(entry.path)
        try:
            relative = PurePosixPath(entry.path).relative_to(prefix_root)
        except ValueError:
            reason = reason or "tree entry is outside the requested prefix"
            relative = None
        if entry.object_type != "blob":
            reason = reason or f"unsupported Git object type {entry.object_type}"
        if entry.mode not in SAFE_BLOB_MODES:
            mode_kind = {
                "100755": "executable file",
                "120000": "symlink",
                "160000": "gitlink",
            }.get(entry.mode, "unrecognized mode")
            reason = reason or f"unsafe {mode_kind} ({entry.mode})"
        if reason or relative is None or not relative.parts:
            unsafe.append(
                {
                    "path": entry.path,
                    "mode": entry.mode,
                    "oid": entry.oid,
                    "reason": reason or "unsafe tree entry",
                }
            )
            continue

        target = root.joinpath(*relative.parts)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        resolved_parent = target.parent.resolve()
        try:
            resolved_parent.relative_to(root)
        except ValueError:
            unsafe.append(
                {
                    "path": entry.path,
                    "mode": entry.mode,
                    "oid": entry.oid,
                    "reason": "destination escapes snapshot root",
                }
            )
            continue
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        descriptor = os.open(target, flags, 0o600)
        try:
            with os.fdopen(descriptor, "wb", closefd=False) as handle:
                handle.write(read_blob(repo, entry.oid))
        finally:
            os.close(descriptor)
    return sorted(unsafe, key=lambda item: (item["path"], item["mode"], item["oid"], item["reason"]))


def main() -> int:
    parser = argparse.ArgumentParser(description="Emit complete mode-aware Git change records.")
    parser.add_argument("--repo", default=".")
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--mode", choices=("merge-base", "explicit"), default="merge-base")
    args = parser.parse_args()
    base_oid, head_oid, records = read_change_records(
        args.repo, args.base, args.head, merge_base=args.mode == "merge-base"
    )
    print(
        json.dumps(
            {
                "schema_version": 1,
                "mode": args.mode,
                "base_oid": base_oid,
                "head_oid": head_oid,
                "changes": [record.to_dict() for record in records],
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
