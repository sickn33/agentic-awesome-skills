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


FRONTMATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
TOP_LEVEL_KEY_PATTERN = re.compile(r"^[A-Za-z0-9_-]+:\s*")
SECURITY_DISCLAIMER_PATTERN = re.compile(r"AUTHORIZED USE ONLY", re.IGNORECASE)
SKILLS_ADD_PATTERN = re.compile(
    r"\b(?:npx|pnpm\s+dlx|yarn\s+dlx|bunx)?\s*skills\s+add\s+([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)"
)
SECTION_HEADING_PATTERN = re.compile(r"^##\s+", re.MULTILINE)
SOURCE_HEADING_PATTERN = re.compile(r"^##\s+Sources?\s*$", re.MULTILINE | re.IGNORECASE)
URL_PATTERN = re.compile(r"https?://[^\s)>'\"]+")
GITHUB_REPO_PATTERN = re.compile(r"^https?://github\.com/([^/\s]+)/([^/\s#?]+)")


def strip_frontmatter(content: str) -> tuple[str, str] | None:
    match = FRONTMATTER_PATTERN.search(content)
    if not match:
        return None
    return match.group(1), content[match.end():]


def repair_malformed_injected_metadata(content: str) -> str:
    pattern = re.compile(
        r"(^metadata:\n)(risk:\s+[^\n]+\nsource:\s+[^\n]+\n)((?:[ \t]+[^\n]*\n)+)",
        re.MULTILINE,
    )
    return pattern.sub(lambda match: match.group(2) + match.group(1) + match.group(3), content, count=1)


def normalize_github_url(url: str) -> str:
    match = GITHUB_REPO_PATTERN.match(url.rstrip("/"))
    if not match:
        return url.rstrip("/")
    owner, repo = match.groups()
    if repo.endswith(".git"):
        repo = repo[:-4]
    return f"https://github.com/{owner}/{repo}"


def extract_urls(text: str) -> list[str]:
    return [match.group(0).rstrip(".,:;") for match in URL_PATTERN.finditer(text)]


def extract_source_section(body: str) -> str | None:
    match = SOURCE_HEADING_PATTERN.search(body)
    if not match:
        return None

    remainder = body[match.end():]
    next_heading = SECTION_HEADING_PATTERN.search(remainder)
    if next_heading:
        return remainder[: next_heading.start()].strip()
    return remainder.strip()


def infer_source(skill_name: str, body: str) -> str:
    skills_add_match = SKILLS_ADD_PATTERN.search(body)
    if skills_add_match:
        return f"https://github.com/{skills_add_match.group(1)}"

    source_section = extract_source_section(body)
    if source_section:
        urls = [normalize_github_url(url) for url in extract_urls(source_section)]
        unique_urls = list(dict.fromkeys(urls))
        if len(unique_urls) == 1:
            return unique_urls[0]

        non_empty_lines = [
            line.strip(" -*`>")
            for line in source_section.splitlines()
            if line.strip() and not line.strip().startswith("```")
        ]
        if len(non_empty_lines) == 1 and len(non_empty_lines[0]) <= 120:
            return non_empty_lines[0]

    urls = [normalize_github_url(url) for url in extract_urls(body)]
    unique_urls = list(dict.fromkeys(urls))
    github_urls = [url for url in unique_urls if GITHUB_REPO_PATTERN.match(url)]

    normalized_skill_name = skill_name.lower().replace("-", "")
    github_matches = []
    for url in github_urls:
        github_match = GITHUB_REPO_PATTERN.match(url)
        if not github_match:
            continue
        owner, repo = github_match.groups()
        normalized_repo = repo.lower().replace("-", "").replace("_", "")
        if normalized_skill_name and normalized_skill_name in normalized_repo:
            github_matches.append(normalize_github_url(url))

    github_matches = list(dict.fromkeys(github_matches))
    if len(github_matches) == 1:
        return github_matches[0]

    if len(github_urls) == 1:
        github_match = GITHUB_REPO_PATTERN.match(github_urls[0])
        if github_match:
            _, repo = github_match.groups()
            normalized_repo = repo.lower().replace("-", "").replace("_", "")
            if normalized_skill_name and (
                normalized_skill_name in normalized_repo or normalized_repo in normalized_skill_name
            ):
                return github_urls[0]

    return "community"


def infer_risk(body: str) -> str:
    if SECURITY_DISCLAIMER_PATTERN.search(body):
        return "offensive"
    return "unknown"


def insert_metadata_keys(frontmatter_text: str, additions: dict[str, str]) -> str:
    lines = frontmatter_text.splitlines()
    insertion_index = len(lines)

    for index, line in enumerate(lines):
        stripped = line.strip()
        indent = len(line) - len(line.lstrip(" "))
        if not stripped:
            continue
        if indent == 0 and TOP_LEVEL_KEY_PATTERN.match(stripped) and not stripped.startswith(("name:", "description:")):
            insertion_index = index
            break

    new_lines = [f'{key}: "{value}"' if ":" in value or value.startswith("http") else f"{key}: {value}" for key, value in additions.items()]
    updated = lines[:insertion_index] + new_lines + lines[insertion_index:]
    return "\n".join(updated)


def update_skill_file(skill_path: Path) -> tuple[bool, list[str]]:
    if not is_safe_regular_file(skill_path):
        return False, []

    content = skill_path.read_text(encoding="utf-8")
    repaired_content = repair_malformed_injected_metadata(content)
    if repaired_content != content:
        skill_path.write_text(repaired_content, encoding="utf-8")
        content = repaired_content

    frontmatter = strip_frontmatter(content)
    if frontmatter is None:
        return False, []

    frontmatter_text, body = frontmatter
    metadata, _ = parse_frontmatter(content, skill_path.as_posix())
    if not metadata:
        return False, []

    additions: dict[str, str] = {}
    changes: list[str] = []
    skill_name = str(metadata.get("name") or skill_path.parent.name)

    if "risk" not in metadata:
        additions["risk"] = infer_risk(body)
        changes.append("added_risk")

    if "source" not in metadata:
        additions["source"] = infer_source(skill_name, body)
        changes.append("added_source")

    if not additions:
        return False, []

    updated_frontmatter = insert_metadata_keys(frontmatter_text, additions)
    updated_content = f"---\n{updated_frontmatter}\n---{body}"
    if updated_content == content:
        return False, []

    skill_path.write_text(updated_content, encoding="utf-8")
    return True, changes


def main() -> int:
    configure_utf8_output()

    parser = argparse.ArgumentParser(description="Add conservative defaults for missing skill risk/source metadata.")
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
        content = skill_path.read_text(encoding="utf-8")
        repaired_content = repair_malformed_injected_metadata(content)
        if repaired_content != content:
            if args.dry_run:
                modified += 1
                print(f"FIX  {skill_path.relative_to(repo_root)} [repaired_malformed_frontmatter]")
                continue
            skill_path.write_text(repaired_content, encoding="utf-8")
            content = repaired_content
            modified += 1
            print(f"FIX  {skill_path.relative_to(repo_root)} [repaired_malformed_frontmatter]")

        metadata, _ = parse_frontmatter(content, skill_path.as_posix())
        if not metadata:
            continue
        if "risk" in metadata and "source" in metadata:
            continue

        if args.dry_run:
            changes: list[str] = []
            frontmatter = strip_frontmatter(content)
            body = frontmatter[1] if frontmatter else ""
            if "risk" not in metadata:
                changes.append(f"added_risk={infer_risk(body)}")
            if "source" not in metadata:
                skill_name = str(metadata.get("name") or skill_path.parent.name)
                changes.append(f"added_source={infer_source(skill_name, body)}")
            modified += 1
            print(f"FIX  {skill_path.relative_to(repo_root)} [{', '.join(changes)}]")
            continue

        changed, changes = update_skill_file(skill_path)
        if changed:
            modified += 1
            print(f"FIX  {skill_path.relative_to(repo_root)} [{', '.join(changes)}]")

    print(f"\nModified: {modified}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
