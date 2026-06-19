#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections.abc import Mapping
from datetime import date, datetime
from pathlib import Path

import yaml

from _project_paths import find_repo_root


GITHUB_REPO_PATTERN = re.compile(r"https://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)")
SOURCE_REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
VALID_SOURCE_TYPES = {"official", "community", "self"}


def normalize_yaml_value(value):
    if isinstance(value, Mapping):
        return {key: normalize_yaml_value(val) for key, val in value.items()}
    if isinstance(value, list):
        return [normalize_yaml_value(item) for item in value]
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def parse_frontmatter(content: str) -> dict[str, object]:
    match = re.search(r"^---\s*\n(.*?)\n?---(?:\s*\n|$)", content, re.DOTALL)
    if not match:
        return {}

    try:
        parsed = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError:
        return {}

    parsed = normalize_yaml_value(parsed)
    if not isinstance(parsed, Mapping):
        return {}
    return dict(parsed)


def normalize_repo_slug(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None

    candidate = value.strip().strip('"').strip("'")
    if candidate.startswith("https://github.com/"):
        candidate = candidate[len("https://github.com/") :]
    candidate = candidate.rstrip("/")
    candidate = candidate.removesuffix(".git")
    candidate = candidate.split("#", 1)[0]
    candidate = candidate.split("?", 1)[0]

    match = re.match(r"^([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)", candidate)
    if not match:
        return None
    return match.group(1).lower()


def run_git(args: list[str], cwd: str | Path, capture: bool = True) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        check=False,
        capture_output=capture,
        text=True,
    )
    if result.returncode != 0:
        stderr = result.stderr.strip() if capture and result.stderr else ""
        raise RuntimeError(stderr or f"git {' '.join(args)} failed with exit code {result.returncode}")
    return result.stdout.strip() if capture else ""


def get_changed_files(base_dir: str | Path, base_ref: str, head_ref: str) -> list[str]:
    output = run_git(["diff", "--name-only", f"{base_ref}...{head_ref}"], cwd=base_dir)
    files = []
    seen = set()
    for raw_line in output.splitlines():
        normalized = raw_line.replace("\\", "/").strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        files.append(normalized)
    return files


def is_skill_file(file_path: str) -> bool:
    normalized = file_path.replace("\\", "/")
    return normalized.startswith("skills/") and normalized.endswith("/SKILL.md")


def extract_credit_repos(readme_text: str) -> dict[str, set[str]]:
    credits = {"official": set(), "community": set()}
    current_section: str | None = None

    for line in readme_text.splitlines():
        heading = re.match(r"^(#{2,6})\s+(.*)$", line.strip())
        if heading:
            title = heading.group(2).strip()
            if title == "Official Sources":
                current_section = "official"
                continue
            if title == "Community Contributors":
                current_section = "community"
                continue
            current_section = None
            continue

        if current_section is None:
            continue

        for repo_match in GITHUB_REPO_PATTERN.finditer(line):
            credits[current_section].add(repo_match.group(1).lower())

    return credits


def classify_source(metadata: dict[str, object]) -> str | None:
    raw_source_type = metadata.get("source_type")
    if isinstance(raw_source_type, str) and raw_source_type.strip():
        source_type = raw_source_type.strip().lower()
        return source_type if source_type in VALID_SOURCE_TYPES else None

    raw_source = metadata.get("source")
    if isinstance(raw_source, str) and raw_source.strip().lower() == "self":
        return "self"

    if metadata.get("source_repo"):
        return "community"

    return None


def collect_reports(base_dir: str | Path, base_ref: str, head_ref: str) -> dict[str, object]:
    root = Path(base_dir)
    changed_files = get_changed_files(root, base_ref, head_ref)
    skill_files = [file_path for file_path in changed_files if is_skill_file(file_path)]
    readme_path = root / "README.md"
    readme_text = readme_path.read_text(encoding="utf-8")
    readme_credit_sets = extract_credit_repos(readme_text)

    warnings: list[str] = []
    errors: list[str] = []
    checked_skills: list[dict[str, object]] = []

    for rel_path in skill_files:
        skill_path = root / rel_path
        content = skill_path.read_text(encoding="utf-8")
        metadata = parse_frontmatter(content)

        source_type = classify_source(metadata)
        raw_source_repo = metadata.get("source_repo")
        source_repo = normalize_repo_slug(raw_source_repo)
        source_value = metadata.get("source")

        checked_skills.append(
            {
                "path": rel_path,
                "source": source_value,
                "source_type": source_type,
                "source_repo": source_repo,
            }
        )

        if source_type is None and metadata.get("source_type") is not None:
            errors.append(f"{rel_path}: invalid source_type {metadata.get('source_type')!r}")
            continue

        if raw_source_repo is not None and source_repo is None:
            errors.append(f"{rel_path}: invalid source_repo {raw_source_repo!r}; expected OWNER/REPO")
            continue

        if source_type == "self":
            continue

        if source_repo is None:
            if isinstance(source_value, str) and source_value.strip().lower() != "self":
                warnings.append(
                    f"{rel_path}: external source declared without source_repo; README credit check skipped"
                )
            continue

        if not SOURCE_REPO_PATTERN.match(source_repo):
            errors.append(f"{rel_path}: invalid source_repo {source_repo!r}; expected OWNER/REPO")
            continue

        bucket = "official" if source_type == "official" else "community"
        if source_repo not in readme_credit_sets[bucket]:
            location_hint = "### Official Sources" if bucket == "official" else "### Community Contributors"
            errors.append(
                f"{rel_path}: source_repo {source_repo} is missing from {location_hint} in README.md"
            )

        # If the source repo only exists in the wrong bucket, keep the failure focused on the missing
        # required attribution instead of reporting duplicate noise.

    return {
        "changed_files": changed_files,
        "skill_files": skill_files,
        "checked_skills": checked_skills,
        "warnings": warnings,
        "errors": errors,
        "readme_credits": {
            bucket: sorted(repos)
            for bucket, repos in readme_credit_sets.items()
        },
    }


def check_readme_credits(base_dir: str | Path, base_ref: str, head_ref: str) -> dict[str, object]:
    return collect_reports(base_dir, base_ref, head_ref)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate README credits for changed skills.")
    parser.add_argument("--base", default="origin/main", help="Base ref for git diff (default: origin/main)")
    parser.add_argument("--head", default="HEAD", help="Head ref for git diff (default: HEAD)")
    parser.add_argument("--json", action="store_true", help="Print the report as JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)
    report = check_readme_credits(root, args.base, args.head)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        if report["skill_files"]:
            print(f"[readme-credits] Changed skill files: {len(report['skill_files'])}")
        else:
            print("[readme-credits] No changed skill files detected.")

        for warning in report["warnings"]:
            print(f"⚠️  {warning}")
        for error in report["errors"]:
            print(f"❌ {error}")

    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as exc:
        print(f"❌ {exc}", file=sys.stderr)
        sys.exit(1)
