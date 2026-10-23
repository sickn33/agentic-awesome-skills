"""Generated documentation from the option registry.

Both artifacts are derived from docker_file_generator/registry.py, so they
cannot drift from the code: the reference table and the resolved-JSON example
are produced by the same walk over OPTIONS.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .manifest import build_manifest, manifest_json
from .registry import OPTIONS, Option


def _env_cell(item: Option) -> str:
    return f"`{item.env}`" if item.env else "-"


def reference_markdown(title: str = "Configuration reference") -> str:
    """Markdown table of every option, generated from the registry."""
    lines = [
        f"# {title}",
        "",
        "Generated from `docker_file_generator/registry.py` - do not edit by hand.",
        "Every option below has a type, a default, an explanation and the",
        "Dockerfile section it affects.",
        "",
        "| Option | Type | Default | Environment | Affects | Explanation |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for item in sorted(OPTIONS, key=lambda entry: entry.key):
        default = json.dumps(item.default)
        affects = ", ".join(item.affects)
        lines.append(f"| `{item.key}` | {item.type} | `{default}` | {_env_cell(item)} | {affects} | {item.description} |")
    lines.append("")
    return "\n".join(lines)


def resolved_example(config: Any, keys: tuple[str, ...] = (), portable: bool = False) -> str:
    """A resolved-JSON example, trimmed to `keys` when given.

    `portable=True` rewrites absolute source paths to repository-relative ones,
    so the checked-in example is byte-identical no matter which mirror (or
    checkout) generated it.
    """
    manifest = build_manifest(config)
    if keys:
        wanted = set(keys)
        manifest["options"] = [entry for entry in manifest["options"] if entry.get("key") in wanted]
    if portable:
        root = Path(__file__).resolve().parent.parent
        for entry in manifest["options"]:
            source = entry.get("source_path")
            if source:
                try:
                    entry["source_path"] = str(Path(source).resolve().relative_to(root))
                except ValueError:
                    entry["source_path"] = Path(source).name
    return manifest_json(manifest)


def sample_keys() -> tuple[str, ...]:
    """One representative option per section, for the docs example."""
    seen: set[str] = set()
    keys: list[str] = []
    for item in sorted(OPTIONS, key=lambda entry: entry.key):
        section = item.key.split(".")[0]
        if section not in seen:
            seen.add(section)
            keys.append(item.key)
    return tuple(keys)


def starter_yaml() -> str:
    """A commented starter dockerfile.yaml, derived from the registry defaults."""
    lines = [
        "# dockerfile.yaml - project configuration for Docker File Generator",
        "#",
        "# Only the values you change need to be here: everything omitted falls",
        "# back to config/defaults.yaml. Strict validation means a typo is an",
        "# error with a file and line, never a silently ignored key.",
        "schema:",
        "  version: 1",
        "",
        "defaults:",
    ]
    for key in ("defaults.port", "defaults.health", "defaults.health_start", "defaults.stopsignal", "defaults.compose_bind"):
        item = next(entry for entry in OPTIONS if entry.key == key)
        lines.append(f"  # {item.description}")
        lines.append(f"  # affects: {', '.join(item.affects)}")
        lines.append(f"  {key.split('.')[1]}: {json.dumps(item.default)}")
    lines.append("")
    return "\n".join(lines)
