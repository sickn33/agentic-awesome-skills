#!/usr/bin/env python3
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from collections.abc import Mapping
from datetime import date, datetime
from pathlib import Path
from typing import Any

import yaml

from _project_paths import find_repo_root


PLUGIN_COMPATIBILITY_PATH = Path("data") / "plugin-compatibility.json"
SKILL_RUNTIME_FILES = (
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
)
LOCAL_LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
ABSOLUTE_HOST_PATH_RE = re.compile(r"(/Users/|[A-Za-z]:/Users/)")
AGENT_HOME_PATTERNS = {
    "claude": re.compile(r"~/.claude(?:/|$)"),
    "codex": re.compile(r"~/.codex(?:/|$)"),
    "cursor": re.compile(r"~/.cursor(?:/|$)"),
    "gemini": re.compile(r"~/.gemini(?:/|$)"),
}
SUPPORTED_TARGETS = ("codex", "claude")
SUPPORTED_PLUGIN_STATES = {"supported", "blocked"}


def configure_utf8_output() -> None:
    if sys.platform != "win32":
        return

    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name)
        try:
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")
            continue
        except Exception:
            pass

        buffer = getattr(stream, "buffer", None)
        if buffer is not None:
            setattr(
                sys,
                stream_name,
                io.TextIOWrapper(buffer, encoding="utf-8", errors="backslashreplace"),
            )


def _normalize_yaml_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {key: _normalize_yaml_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_normalize_yaml_value(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray)):
        return bytes(value).decode("utf-8", errors="replace")
    return value


def parse_frontmatter(content: str) -> dict[str, Any]:
    match = re.search(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return {}

    try:
        parsed = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}

    if not isinstance(parsed, Mapping):
        return {}

    return dict(_normalize_yaml_value(parsed))


def _iter_skill_dirs(skills_root: Path) -> list[Path]:
    skill_dirs: list[Path] = []

    for root, dirs, files in os.walk(skills_root):
        dirs[:] = [directory for directory in dirs if not directory.startswith(".")]
        if "SKILL.md" in files:
            skill_dirs.append(Path(root))

    return sorted(skill_dirs)


def _skill_id_from_dir(skills_root: Path, skill_dir: Path) -> str:
    return str(skill_dir.relative_to(skills_root)).replace(os.sep, "/")


def _skill_repo_path(skills_root: Path, skill_dir: Path) -> str:
    parent = skills_root.parent
    return str(skill_dir.relative_to(parent)).replace(os.sep, "/")


def _runtime_dependency_files(skill_dir: Path) -> list[str]:
    return sorted(
        file_name
        for file_name in SKILL_RUNTIME_FILES
        if (skill_dir / file_name).is_file()
    )


def _local_link_reasons(content: str, skill_dir: Path) -> set[str]:
    reasons: set[str] = set()
    resolved_skill_dir = skill_dir.resolve()

    for link in LOCAL_LINK_RE.findall(content):
        link_clean = link.split("#", 1)[0].strip()
        if not link_clean:
            continue
        if link_clean.startswith(("http://", "https://", "mailto:", "<", ">")):
            continue
        if os.path.isabs(link_clean):
            continue

        target_path = (skill_dir / link_clean).resolve(strict=False)
        try:
            target_path.relative_to(resolved_skill_dir)
        except ValueError:
            reasons.add("escaped_local_reference")
            continue
        if not target_path.exists():
            reasons.add("broken_local_reference")

    return reasons


def _setup_from_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    plugin_data = metadata.get("plugin")
    if not isinstance(plugin_data, Mapping):
        return {
            "type": "none",
            "summary": "",
            "docs": None,
        }

    setup = plugin_data.get("setup")
    if not isinstance(setup, Mapping):
        return {
            "type": "none",
            "summary": "",
            "docs": None,
        }

    setup_type = str(setup.get("type", "none")).strip().lower() or "none"
    if setup_type not in {"none", "manual"}:
        setup_type = "none"

    summary = str(setup.get("summary", "")).strip()
    docs = setup.get("docs")
    docs_value = str(docs).strip() if isinstance(docs, str) and docs.strip() else None

    return {
        "type": setup_type,
        "summary": summary,
        "docs": docs_value,
    }


def _explicit_target_restrictions(metadata: dict[str, Any]) -> dict[str, str | None]:
    restrictions = {target: None for target in SUPPORTED_TARGETS}
    plugin_data = metadata.get("plugin")
    if not isinstance(plugin_data, Mapping):
        return restrictions

    targets = plugin_data.get("targets")
    if not isinstance(targets, Mapping):
        return restrictions

    for target in SUPPORTED_TARGETS:
        value = targets.get(target)
        if value is None:
            continue
        state = str(value).strip().lower()
        if state in SUPPORTED_PLUGIN_STATES:
            restrictions[target] = state

    return restrictions


def _setup_is_valid(setup: dict[str, Any], skill_dir: Path) -> bool:
    if setup["type"] != "manual":
        return False

    if not setup["summary"]:
        return False

    docs = setup.get("docs")
    if not docs:
        return False

    docs_path = (skill_dir / docs).resolve(strict=False)
    try:
        docs_path.relative_to(skill_dir.resolve())
    except ValueError:
        return False

    return docs_path.is_file()


def _initial_target_reasons() -> dict[str, set[str]]:
    return {target: set() for target in SUPPORTED_TARGETS}


def analyze_skill(skill_dir: Path, skills_root: Path) -> dict[str, Any]:
    content = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
    metadata = parse_frontmatter(content)
    setup = _setup_from_metadata(metadata)
    restrictions = _explicit_target_restrictions(metadata)
    target_reasons = _initial_target_reasons()

    if ABSOLUTE_HOST_PATH_RE.search(content):
        for target in SUPPORTED_TARGETS:
            target_reasons[target].add("absolute_host_path")

    local_link_reasons = _local_link_reasons(content, skill_dir)
    for reason in local_link_reasons:
        for target in SUPPORTED_TARGETS:
            target_reasons[target].add(reason)

    for agent_name, pattern in AGENT_HOME_PATTERNS.items():
        if not pattern.search(content):
            continue

        if agent_name == "claude":
            target_reasons["codex"].add("target_specific_home_path")
        elif agent_name == "codex":
            target_reasons["claude"].add("target_specific_home_path")
        else:
            for target in SUPPORTED_TARGETS:
                target_reasons[target].add("target_specific_home_path")

    runtime_files = _runtime_dependency_files(skill_dir)
    if runtime_files and not _setup_is_valid(setup, skill_dir):
        for target in SUPPORTED_TARGETS:
            target_reasons[target].add("undeclared_runtime_dependency")

    for target, explicit_state in restrictions.items():
        if explicit_state == "blocked":
            target_reasons[target].add("explicit_target_restriction")

    statuses = {
        target: "blocked" if target_reasons[target] else "supported"
        for target in SUPPORTED_TARGETS
    }

    union_reasons = sorted({reason for reasons in target_reasons.values() for reason in reasons})

    return {
        "id": _skill_id_from_dir(skills_root, skill_dir),
        "path": _skill_repo_path(skills_root, skill_dir),
        "targets": statuses,
        "setup": setup,
        "reasons": union_reasons,
        "blocked_reasons": {
            target: sorted(target_reasons[target])
            for target in SUPPORTED_TARGETS
        },
        "runtime_files": runtime_files,
    }


def build_report(skills_root: Path) -> dict[str, Any]:
    skills_root = Path(skills_root)
    skills = [analyze_skill(skill_dir, skills_root) for skill_dir in _iter_skill_dirs(skills_root)]

    summary = {
        "total_skills": len(skills),
        "supported": {
            target: sum(1 for skill in skills if skill["targets"][target] == "supported")
            for target in SUPPORTED_TARGETS
        },
        "blocked": {
            target: sum(1 for skill in skills if skill["targets"][target] == "blocked")
            for target in SUPPORTED_TARGETS
        },
        "manual_setup": sum(1 for skill in skills if skill["setup"]["type"] == "manual"),
    }

    return {
        "skills": skills,
        "summary": summary,
    }


def sync_plugin_compatibility(root: Path) -> dict[str, Any]:
    root = Path(root)
    skills_root = root / "skills"
    report = build_report(skills_root)
    output_path = root / PLUGIN_COMPATIBILITY_PATH
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


def load_plugin_compatibility(root: Path) -> dict[str, Any]:
    root = Path(root)
    path = root / PLUGIN_COMPATIBILITY_PATH
    if path.is_file():
        return json.loads(path.read_text(encoding="utf-8"))
    return sync_plugin_compatibility(root)


def compatibility_by_skill_id(report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {skill["id"]: skill for skill in report.get("skills", [])}


def compatibility_by_path(report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {skill["path"]: skill for skill in report.get("skills", [])}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate plugin compatibility status for skills.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate that data/plugin-compatibility.json is in sync without writing files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)
    expected_report = build_report(root / "skills")
    report_path = root / PLUGIN_COMPATIBILITY_PATH

    if args.check:
        if not report_path.is_file():
            raise SystemExit("data/plugin-compatibility.json is missing")

        current_report = json.loads(report_path.read_text(encoding="utf-8"))
        if current_report != expected_report:
            raise SystemExit("data/plugin-compatibility.json is out of sync")
        print("✅ Plugin compatibility report is in sync.")
        return 0

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(expected_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("✅ Plugin compatibility report synced.")
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    raise SystemExit(main())
