#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

from _safe_files import is_safe_regular_file
from _project_paths import find_repo_root
from validate_skills import configure_utf8_output, parse_frontmatter


ELLIPSIS_PATTERN = re.compile(r"(?:\.\.\.|…)\s*$")
MAX_DESCRIPTION_LENGTH = 300
MIN_PARAGRAPH_LENGTH = 40
TOP_LEVEL_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]+:\s*")
FRONTMATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
MARKDOWN_DECORATION_PATTERN = re.compile(r"[*_`]+")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
MULTISPACE_PATTERN = re.compile(r"\s+")


def strip_frontmatter(content: str) -> str:
    match = FRONTMATTER_PATTERN.search(content)
    if not match:
        return content
    return content[match.end():].lstrip()


def normalize_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^\s*>+\s?", "", text)
    text = MARKDOWN_DECORATION_PATTERN.sub("", text)
    text = HTML_TAG_PATTERN.sub("", text)
    text = MULTISPACE_PATTERN.sub(" ", text)
    return text.strip()


def split_candidate_paragraphs(body: str) -> list[str]:
    paragraphs: list[str] = []
    current: list[str] = []
    in_code_block = False

    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            in_code_block = not in_code_block
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue

        if in_code_block:
            continue

        if not stripped:
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue

        if stripped.startswith("#"):
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue

        if stripped.startswith(("- ", "* ", "|", "1. ", "2. ", "3. ", "4. ", "5. ")):
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue

        current.append(stripped)

    if current:
        paragraphs.append(" ".join(current))

    return [normalize_text(paragraph) for paragraph in paragraphs if normalize_text(paragraph)]


def is_usable_paragraph(paragraph: str) -> bool:
    lower = paragraph.lower()
    if len(paragraph) < MIN_PARAGRAPH_LENGTH:
        return False
    if lower.startswith(("role:", "works well with:", "capabilities:", "patterns:", "anti-patterns:")):
        return False
    if lower.startswith("this skill is applicable to execute the workflow"):
        return False
    return True


def normalize_for_match(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def pick_candidate(description: str, body: str) -> str | None:
    paragraphs = [paragraph for paragraph in split_candidate_paragraphs(body) if is_usable_paragraph(paragraph)]
    if not paragraphs:
        return None

    desc_prefix = ELLIPSIS_PATTERN.sub("", description).strip()
    normalized_prefix = normalize_for_match(desc_prefix)

    if normalized_prefix:
        for paragraph in paragraphs:
            normalized_paragraph = normalize_for_match(paragraph)
            if normalized_paragraph.startswith(normalized_prefix) or normalized_prefix in normalized_paragraph:
                return paragraph

    return paragraphs[0]


def clamp_description(text: str, max_length: int = MAX_DESCRIPTION_LENGTH) -> str:
    text = normalize_text(text)
    if len(text) <= max_length:
        return text

    sentence_candidates = [". ", "! ", "? "]
    best_split = -1
    for marker in sentence_candidates:
        split = text.rfind(marker, 0, max_length + 1)
        if split > best_split:
            best_split = split

    if best_split != -1:
        return text[: best_split + 1].strip()

    split = text.rfind(" ", 0, max_length + 1)
    if split == -1:
        return text[:max_length].strip()
    return text[:split].strip()


def escape_yaml_string(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


def replace_description(frontmatter_text: str, new_description: str) -> str:
    lines = frontmatter_text.splitlines()
    replacement = f'description: "{escape_yaml_string(new_description)}"'

    for index, line in enumerate(lines):
        if not re.match(r"^\s*description:\s*", line):
            continue

        current_indent = len(line) - len(line.lstrip(" "))
        end_index = index + 1
        while end_index < len(lines):
            candidate = lines[end_index]
            stripped = candidate.strip()
            candidate_indent = len(candidate) - len(candidate.lstrip(" "))
            if not stripped:
                end_index += 1
                continue
            if candidate_indent <= current_indent and TOP_LEVEL_KEY_PATTERN.match(stripped):
                break
            end_index += 1

        updated = lines[:index] + [replacement] + lines[end_index:]
        return "\n".join(updated)

    raise ValueError("Description field not found in frontmatter.")


def update_skill_file(skill_path: Path) -> tuple[bool, str | None]:
    if not is_safe_regular_file(skill_path):
        return False, None

    content = skill_path.read_text(encoding="utf-8")
    match = FRONTMATTER_PATTERN.search(content)
    if not match:
        return False, None

    metadata, _ = parse_frontmatter(content, skill_path.as_posix())
    if not metadata:
        return False, None

    description = metadata.get("description")
    if not isinstance(description, str) or not ELLIPSIS_PATTERN.search(description.strip()):
        return False, None

    candidate = pick_candidate(description, strip_frontmatter(content))
    if not candidate:
        return False, None

    new_description = clamp_description(candidate)
    if not new_description or new_description == normalize_text(description):
        return False, None

    updated_frontmatter = replace_description(match.group(1), new_description)
    updated_content = f"---\n{updated_frontmatter}\n---{content[match.end():]}"
    if updated_content == content:
        return False, None

    skill_path.write_text(updated_content, encoding="utf-8")
    return True, new_description


def main() -> int:
    configure_utf8_output()

    parser = argparse.ArgumentParser(description="Repair truncated SKILL.md frontmatter descriptions.")
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
        if not is_safe_regular_file(skill_path):
            print(f"SKIP {skill_path.relative_to(repo_root)} [symlinked_or_unreadable]")
            continue
        content = skill_path.read_text(encoding="utf-8")
        metadata, _ = parse_frontmatter(content, skill_path.as_posix())
        description = metadata.get("description") if metadata else None
        if not isinstance(description, str) or not ELLIPSIS_PATTERN.search(description.strip()):
            continue

        candidate = pick_candidate(description, strip_frontmatter(content))
        if not candidate:
            skipped += 1
            print(f"SKIP {skill_path.relative_to(repo_root)}")
            continue

        new_description = clamp_description(candidate)
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
