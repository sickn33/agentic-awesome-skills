#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from _project_paths import find_repo_root
from fix_truncated_descriptions import (
    FRONTMATTER_PATTERN,
    clamp_description,
    is_usable_paragraph,
    normalize_for_match,
    normalize_text,
    replace_description,
    split_candidate_paragraphs,
    strip_frontmatter,
)
from validate_skills import configure_utf8_output, parse_frontmatter


USAGE_CUE_PATTERNS = (
    "use when",
    "when to use",
    "this skill should be used when",
    "use this skill when",
    "use this when",
    "use it to",
    "use for ",
    "trigger on",
    "triggers on",
)
WHEN_TO_USE_HEADINGS = {
    "when to use",
    "when to apply",
    "when to activate",
}
BULLET_PATTERN = re.compile(r"^(?:[-*]\s+|\d+\.\s+)(.+)$")
SENTENCE_PATTERN = re.compile(r"^(.+?[.!?])(?:\s|$)")


def first_usable_paragraph(body: str) -> str | None:
    paragraphs = [
        paragraph
        for paragraph in split_candidate_paragraphs(body)
        if is_usable_paragraph(paragraph)
    ]
    return paragraphs[0] if paragraphs else None


def has_explicit_usage_cue(description: str) -> bool:
    lower = description.lower()
    return any(phrase in lower for phrase in USAGE_CUE_PATTERNS)


def mirrors_intro_paragraph(description: str, body: str) -> bool:
    intro = first_usable_paragraph(body)
    if not intro:
        return False
    return normalize_for_match(description) == normalize_for_match(intro)


def extract_when_to_use_lines(body: str) -> list[str]:
    lines = body.splitlines()
    capturing = False
    captured: list[str] = []

    for raw_line in lines:
        stripped = raw_line.strip()
        heading_match = re.match(r"^(#{2,6})\s+(.*)$", stripped)
        if heading_match:
            heading = normalize_text(heading_match.group(2)).lower().rstrip(":")
            if capturing:
                break
            capturing = heading in WHEN_TO_USE_HEADINGS
            continue

        if capturing:
            captured.append(raw_line)

    return captured


def lower_first_fragment(text: str) -> str:
    if not text:
        return text
    first = text[0]
    second = text[1] if len(text) > 1 else ""
    if first.isupper() and second.islower():
        return first.lower() + text[1:]
    return text


def extract_usage_items(section_lines: list[str]) -> list[str]:
    items: list[str] = []
    for raw_line in section_lines:
        stripped = raw_line.strip()
        if not stripped:
            continue

        bullet_match = BULLET_PATTERN.match(stripped)
        if bullet_match:
            item = normalize_text(bullet_match.group(1)).rstrip(":.")
            if ":" in item:
                item = item.split(":", 1)[0].strip()
            item = re.sub(r"^(?:when|whenever)\s+", "", item, flags=re.IGNORECASE)
            if item:
                items.append(lower_first_fragment(item))
    return items


def build_usage_sentence(section_lines: list[str]) -> str | None:
    items = extract_usage_items(section_lines)
    if not items:
        return None

    items = items[:3]
    if len(items) == 1:
        return f"Use when {items[0]}."
    if len(items) == 2:
        return f"Use when {items[0]} or {items[1]}."
    return f"Use when {items[0]}, {items[1]}, or {items[2]}."


def first_sentence(text: str) -> str:
    normalized = normalize_text(text)
    match = SENTENCE_PATTERN.match(normalized)
    if match:
        return match.group(1).strip()
    return normalized


def is_substantial_capability(text: str) -> bool:
    words = re.findall(r"[A-Za-z0-9]+", text)
    stripped = text.strip()
    return len(words) >= 6 and not (stripped.startswith("(") and stripped.endswith(")"))


def select_capability_sentence(description: str, body: str) -> str:
    description_sentence = first_sentence(description)
    if is_substantial_capability(description_sentence):
        return description_sentence

    description_key = normalize_for_match(description)
    for paragraph in split_candidate_paragraphs(body):
        if not is_usable_paragraph(paragraph):
            continue
        if normalize_for_match(paragraph) == description_key:
            continue

        candidate = first_sentence(paragraph)
        if is_substantial_capability(candidate):
            return candidate

    return description_sentence


def ensure_terminal_punctuation(text: str) -> str:
    stripped = text.rstrip()
    if not stripped:
        return stripped
    if stripped.endswith((".", "!", "?")):
        return stripped
    return f"{stripped}."


def build_repaired_description(description: str, body: str) -> str | None:
    if has_explicit_usage_cue(description):
        return None
    if not mirrors_intro_paragraph(description, body):
        return None

    usage_sentence = build_usage_sentence(extract_when_to_use_lines(body))
    if not usage_sentence:
        return None

    capability_sentence = ensure_terminal_punctuation(select_capability_sentence(description, body))
    candidate = clamp_description(f"{capability_sentence} {usage_sentence}")
    if normalize_text(candidate) == normalize_text(description):
        return None
    return candidate


def update_skill_file(skill_path: Path) -> tuple[bool, str | None]:
    content = skill_path.read_text(encoding="utf-8")
    match = FRONTMATTER_PATTERN.search(content)
    if not match:
        return False, None

    metadata, _ = parse_frontmatter(content, skill_path.as_posix())
    if not metadata:
        return False, None

    description = metadata.get("description")
    if not isinstance(description, str):
        return False, None

    new_description = build_repaired_description(description, strip_frontmatter(content))
    if not new_description:
        return False, None

    updated_frontmatter = replace_description(match.group(1), new_description)
    updated_content = f"---\n{updated_frontmatter}\n---{content[match.end():]}"
    if updated_content == content:
        return False, None

    skill_path.write_text(updated_content, encoding="utf-8")
    return True, new_description


def main() -> int:
    configure_utf8_output()

    parser = argparse.ArgumentParser(
        description="Repair synthetic descriptions by adding concise when-to-use guidance.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Report planned fixes without writing files.")
    args = parser.parse_args()

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"

    fixed = 0
    skipped = 0
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [directory for directory in dirs if not directory.startswith(".")]
        if "SKILL.md" not in files:
            continue

        skill_path = Path(root) / "SKILL.md"
        content = skill_path.read_text(encoding="utf-8")
        metadata, _ = parse_frontmatter(content, skill_path.as_posix())
        description = metadata.get("description") if metadata else None
        if not isinstance(description, str):
            continue

        new_description = build_repaired_description(description, strip_frontmatter(content))
        if not new_description:
            continue

        if args.dry_run:
            fixed += 1
            print(f"FIX  {skill_path.relative_to(repo_root)} -> {new_description}")
            continue

        changed, _ = update_skill_file(skill_path)
        if changed:
            fixed += 1
            print(f"FIX  {skill_path.relative_to(repo_root)}")
        else:
            skipped += 1
            print(f"SKIP {skill_path.relative_to(repo_root)}")

    print(f"\nFixed: {fixed}")
    print(f"Skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
