#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

from _safe_files import is_safe_regular_file
from _project_paths import find_repo_root
from fix_missing_skill_sections import (
    build_examples_section,
    build_when_section,
    has_examples,
    has_when_to_use_section,
)
from validate_skills import configure_utf8_output, parse_frontmatter


def get_head_content(repo_root: Path, relative_path: Path) -> str | None:
    result = subprocess.run(
        ["git", "show", f"HEAD:{relative_path.as_posix()}"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return None
    return result.stdout


def remove_exact_section(content: str, section_text: str) -> str:
    normalized = content
    escaped = re.escape(section_text.strip())
    patterns = [
        re.compile(rf"\n\n{escaped}\n(?=\n##\s|\n#\s|\Z)", re.DOTALL),
        re.compile(rf"\n{escaped}\n(?=\n##\s|\n#\s|\Z)", re.DOTALL),
    ]
    for pattern in patterns:
        normalized, count = pattern.subn("\n", normalized, count=1)
        if count:
            break
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.rstrip() + "\n"


def cleanup_skill_file(repo_root: Path, skill_path: Path) -> tuple[bool, list[str]]:
    if not is_safe_regular_file(skill_path):
        return False, []

    current_content = skill_path.read_text(encoding="utf-8")
    metadata, _ = parse_frontmatter(current_content, skill_path.as_posix())
    if not metadata:
        return False, []

    description = metadata.get("description")
    if not isinstance(description, str):
        return False, []

    relative_path = skill_path.relative_to(repo_root)
    head_content = get_head_content(repo_root, relative_path)
    if head_content is None:
        return False, []

    skill_name = str(metadata.get("name") or skill_path.parent.name)
    generated_when = build_when_section(skill_name, description)
    generated_examples = build_examples_section(skill_name, description)

    updated = current_content
    changes: list[str] = []

    if generated_when in updated and not has_when_to_use_section(head_content):
        updated = remove_exact_section(updated, generated_when)
        changes.append("removed_synthetic_when_to_use")

    if generated_examples in updated and not has_examples(head_content):
        updated = remove_exact_section(updated, generated_examples)
        changes.append("removed_synthetic_examples")

    if updated != current_content:
        skill_path.write_text(updated, encoding="utf-8")
        return True, changes

    return False, []


def main() -> int:
    configure_utf8_output()

    parser = argparse.ArgumentParser(description="Remove synthetic generic sections previously generated from descriptions.")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing files.")
    args = parser.parse_args()

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"

    modified = 0
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [directory for directory in dirs if not directory.startswith(".")]
        if "SKILL.md" not in files:
            continue

        skill_path = Path(root) / "SKILL.md"
        if not is_safe_regular_file(skill_path):
            print(f"SKIP {skill_path.relative_to(repo_root)} [symlinked_or_unreadable]")
            continue
        current_content = skill_path.read_text(encoding="utf-8")
        metadata, _ = parse_frontmatter(current_content, skill_path.as_posix())
        if not metadata or not isinstance(metadata.get("description"), str):
            continue

        relative_path = skill_path.relative_to(repo_root)
        head_content = get_head_content(repo_root, relative_path)
        if head_content is None:
            continue

        skill_name = str(metadata.get("name") or skill_path.parent.name)
        generated_when = build_when_section(skill_name, metadata["description"])
        generated_examples = build_examples_section(skill_name, metadata["description"])
        changes: list[str] = []
        if generated_when in current_content and not has_when_to_use_section(head_content):
            changes.append("removed_synthetic_when_to_use")
        if generated_examples in current_content and not has_examples(head_content):
            changes.append("removed_synthetic_examples")
        if not changes:
            continue

        if args.dry_run:
            modified += 1
            print(f"FIX  {relative_path} [{', '.join(changes)}]")
            continue

        changed, actual_changes = cleanup_skill_file(repo_root, skill_path)
        if changed:
            modified += 1
            print(f"FIX  {relative_path} [{', '.join(actual_changes)}]")

    print(f"\nModified: {modified}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
