from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from . import __version__
from .config import ResolvedConfig
from .registry import OPTIONS, OPTIONS_BY_KEY
from .schema import SCHEMA_VERSION

REDACTED = "***REDACTED***"
SECRET_KEY_PARTS = (
    "password",
    "passwd",
    "secret",
    "token",
    "credential",
    "api_key",
    "apikey",
    "private_key",
    "dsn",
    "connection_string",
)
CREDENTIAL_URL = re.compile(r"://[^/\s:@]+:[^/\s@]+@")


def is_secret_key(key: str) -> bool:
    lowered = key.lower()
    return any(part in lowered for part in SECRET_KEY_PARTS)


def redact(key: str, value: Any) -> Any:
    if OPTIONS_BY_KEY[key].sensitive or is_secret_key(key):
        return REDACTED
    if isinstance(value, str) and CREDENTIAL_URL.search(value):
        return REDACTED
    return value


def build_manifest(config: ResolvedConfig) -> dict[str, Any]:
    options = []
    for item in sorted(OPTIONS, key=lambda entry: entry.key):
        entry = config.explanation(item.key)
        entry["key"] = item.key
        entry["value"] = redact(item.key, entry["value"])
        entry["redacted"] = entry["value"] == REDACTED
        entry["type"] = item.type
        options.append(entry)
    return {
        "schema": {"version": SCHEMA_VERSION},
        "generator": {"name": "docker-file-generator", "version": __version__},
        "options": options,
        "warnings": sorted(config.warnings),
    }


def manifest_json(manifest: dict[str, Any]) -> str:
    return json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n"


def write_manifest(config: ResolvedConfig, path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(manifest_json(build_manifest(config)), encoding="utf-8")
    return target