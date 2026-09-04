#!/usr/bin/env python3
"""Create a stable symptom fingerprint from a validated JSON record."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any, Mapping


REQUIRED_FIELDS = (
    "schema_version",
    "command",
    "input_digest",
    "exit_code",
    "failure_class",
    "stable_excerpt",
    "real_path_state",
)
FAILURE_CLASS_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._:-]*$")


class RecordError(ValueError):
    """Raised when a record cannot produce a trustworthy fingerprint."""


def _normalize_text(value: str) -> str:
    """Normalize transport-only differences without deleting meaningful values."""
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    lines = value.split("\n")
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return "\n".join(lines)


def canonicalize(record: Mapping[str, Any]) -> dict[str, Any]:
    unknown = sorted(set(record) - set(REQUIRED_FIELDS))
    missing = sorted(set(REQUIRED_FIELDS) - set(record))
    if missing:
        raise RecordError(f"missing field(s): {', '.join(missing)}")
    if unknown:
        raise RecordError(f"unknown field(s): {', '.join(unknown)}")

    if (
        isinstance(record["schema_version"], bool)
        or not isinstance(record["schema_version"], int)
        or record["schema_version"] != 1
    ):
        raise RecordError("schema_version must be 1")
    if isinstance(record["exit_code"], bool) or not isinstance(record["exit_code"], int):
        raise RecordError("exit_code must be an integer")

    canonical: dict[str, Any] = {
        "schema_version": 1,
        "exit_code": record["exit_code"],
    }
    for field in REQUIRED_FIELDS:
        if field in ("schema_version", "exit_code"):
            continue
        value = record[field]
        if not isinstance(value, str):
            raise RecordError(f"{field} must be a string")
        value = _normalize_text(value)
        if not value:
            raise RecordError(f"{field} must not be empty")
        canonical[field] = value

    if not FAILURE_CLASS_PATTERN.fullmatch(canonical["failure_class"]):
        raise RecordError(
            "failure_class must use lowercase letters, numbers, dot, underscore, colon, or hyphen"
        )
    return canonical


def fingerprint(record: Mapping[str, Any]) -> str:
    payload = json.dumps(
        canonicalize(record), ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")
    return f"sha256:{hashlib.sha256(payload).hexdigest()}"


def load_record(path: str) -> Mapping[str, Any]:
    try:
        if path == "-":
            value = json.load(sys.stdin)
        else:
            with Path(path).open("r", encoding="utf-8") as handle:
                value = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise RecordError(str(error)) from error
    if not isinstance(value, dict):
        raise RecordError("record must be a JSON object")
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate a symptom record and print its canonical SHA-256 fingerprint."
    )
    parser.add_argument("record", help="JSON record path, or - to read standard input")
    args = parser.parse_args(argv)

    try:
        print(fingerprint(load_record(args.record)))
    except RecordError as error:
        print(f"fingerprint: {error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
