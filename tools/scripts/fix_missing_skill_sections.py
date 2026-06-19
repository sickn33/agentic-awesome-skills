#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from _safe_files import is_safe_regular_file
from _project_paths import find_repo_root
from audit_skills import has_limitations
from validate_skills import configure_utf8_output, has_when_to_use_section, parse_frontmatter


FRONTMATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
WHEN_SECTION_VARIANT_PATTERNS = [
    (re.compile(r"^##\s*when to apply\s*$", re.MULTILINE | re.IGNORECASE), "## When to Use"),
    (re.compile(r"^##\s*when to activate\s*$", re.MULTILINE | re.IGNORECASE), "## When to Use"),
    (re.compile(r"^##\s*\d+[.)]?\s*when to use(?: this skill)?\s*$", re.MULTILINE | re.IGNORECASE), "## When to Use"),
    (re.compile(r"^##\s*when to use\s*$", re.MULTILINE | re.IGNORECASE), "## When to Use"),
]
EXAMPLES_HEADING_PATTERN = re.compile(r"^##\s+Example(s)?\b", re.MULTILINE | re.IGNORECASE)
USAGE_HEADING_PATTERN = re.compile(r"^##\s+Usage\b", re.MULTILINE | re.IGNORECASE)
FENCED_CODE_BLOCK_PATTERN = re.compile(r"^```", re.MULTILINE)
MULTISPACE_PATTERN = re.compile(r"\s+")


def has_examples(content: str) -> bool:
    return bool(
        FENCED_CODE_BLOCK_PATTERN.search(content)
        or EXAMPLES_HEADING_PATTERN.search(content)
        or USAGE_HEADING_PATTERN.search(content)
    )


def normalize_whitespace(text: str) -> str:
    return MULTISPACE_PATTERN.sub(" ", text.strip())


def normalize_when_heading_variants(content: str) -> str:
    updated = content
    for pattern, replacement in WHEN_SECTION_VARIANT_PATTERNS:
        updated = pattern.sub(replacement, updated)
    return updated


def normalize_description_for_prompt(description: str) -> str:
    text = normalize_whitespace(description).rstrip(".")
    if text.lower().startswith("this skill should be used when "):
        text = "Use this skill when " + text[len("this skill should be used when "):]
    elif text.lower().startswith("always use this skill when "):
        text = "Use this skill when " + text[len("always use this skill when "):]
    elif text.lower().startswith("use when "):
        text = "Use this skill when " + text[len("use when "):]
    return text


def build_when_section(skill_name: str, description: str) -> str:
    normalized = normalize_description_for_prompt(description)
    lower = normalized.lower()

    if lower.startswith("use this skill when "):
        sentence = normalized[0].upper() + normalized[1:]
    elif lower.startswith("use when "):
        sentence = "Use this skill when " + normalized[len("Use when "):]
    else:
        sentence = f"Use this skill when the task matches this description: {normalized}."

    return "\n".join(
        [
            "## When to Use",
            f"- {sentence}",
        ]
    )


def build_examples_section(skill_name: str, description: str) -> str:
    normalized = normalize_whitespace(description).rstrip(".")
    return "\n".join(
        [
            "## Examples",
            "```text",
            f"Use @{skill_name} for this task: {normalized}.",
            "",
            "Apply the skill to my current work and walk me through the safest next steps,",
            "key checks, and the concrete output I should produce.",
            "```",
        ]
    )


def build_limitations_section() -> str:
    return "\n".join(
        [
            "## Limitations",
            "- Use this skill only when the task clearly matches the scope described above.",
            "- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.",
            "- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.",
        ]
    )


def find_insert_after_intro(content: str) -> int:
    body_start = 0
    match = FRONTMATTER_PATTERN.search(content)
    if match:
        body_start = match.end()

    remainder = content[body_start:]
    section_match = re.search(r"^##\s+", remainder, re.MULTILINE)
    if section_match:
        return body_start + section_match.start()
    return len(content)


def insert_section_after_intro(content: str, section_text: str) -> str:
    insert_at = find_insert_after_intro(content)
    prefix = content[:insert_at].rstrip() + "\n\n"
    suffix = content[insert_at:].lstrip()
    if suffix:
        return prefix + section_text + "\n\n" + suffix
    return prefix + section_text + "\n"


def append_section(content: str, section_text: str) -> str:
    return content.rstrip() + "\n\n" + section_text + "\n"


def update_skill_file(
    skill_path: Path,
    *,
    add_missing: bool = False,
    add_limitations_only: bool = False,
) -> tuple[bool, list[str]]:
    if not is_safe_regular_file(skill_path):
        return False, []

    content = skill_path.read_text(encoding="utf-8")
    metadata, _ = parse_frontmatter(content, skill_path.as_posix())
    if not metadata:
        return False, []

    updated = normalize_when_heading_variants(content)
    changes: list[str] = []
    description = metadata.get("description")
    skill_name = str(metadata.get("name") or skill_path.parent.name)

    if isinstance(description, str):
        if updated != content:
            changes.append("normalized_when_heading")

        add_when = add_missing
        add_examples = add_missing
        add_limitations = add_missing or add_limitations_only

        if add_when and not has_when_to_use_section(updated):
            updated = insert_section_after_intro(updated, build_when_section(skill_name, description))
            changes.append("added_when_to_use")

        if add_examples and not has_examples(updated):
            updated = append_section(updated, build_examples_section(skill_name, description))
            changes.append("added_examples")

        if add_limitations and not has_limitations(updated):
            updated = append_section(updated, build_limitations_section())
            changes.append("added_limitations")

    if updated != content:
        skill_path.write_text(updated, encoding="utf-8")
        return True, changes

    return False, changes


def main() -> int:
    configure_utf8_output()

    parser = argparse.ArgumentParser(description="Normalize skill section headings and optionally add missing sections.")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing files.")
    parser.add_argument(
        "--add-missing",
        action="store_true",
        help="Also synthesize missing 'When to Use', 'Examples', and 'Limitations' sections from the description.",
    )
    parser.add_argument(
        "--add-limitations-only",
        action="store_true",
        help="Only synthesize missing 'Limitations' sections.",
    )
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
        content = skill_path.read_text(encoding="utf-8")
        metadata, _ = parse_frontmatter(content, skill_path.as_posix())
        if not metadata or not isinstance(metadata.get("description"), str):
            continue

        simulated = normalize_when_heading_variants(content)
        needs_when = args.add_missing and not has_when_to_use_section(simulated)
        needs_examples = args.add_missing and not has_examples(simulated)
        needs_limitations = (args.add_missing or args.add_limitations_only) and not has_limitations(simulated)
        if not needs_when and not needs_examples and not needs_limitations and simulated == content:
            continue

        if args.dry_run:
            change_labels: list[str] = []
            if simulated != content:
                change_labels.append("normalized_when_heading")
            if needs_when:
                change_labels.append("added_when_to_use")
            if needs_examples:
                change_labels.append("added_examples")
            if needs_limitations:
                change_labels.append("added_limitations")
            modified += 1
            print(f"FIX  {skill_path.relative_to(repo_root)} [{', '.join(change_labels)}]")
            continue

        changed, changes = update_skill_file(
            skill_path,
            add_missing=args.add_missing,
            add_limitations_only=args.add_limitations_only,
        )
        if changed:
            modified += 1
            print(f"FIX  {skill_path.relative_to(repo_root)} [{', '.join(changes)}]")

    print(f"\nModified: {modified}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
