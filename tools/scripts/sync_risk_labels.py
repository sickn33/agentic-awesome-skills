#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import sys
from collections import Counter
from pathlib import Path

from _project_paths import find_repo_root
from _safe_files import is_safe_regular_file
from risk_classifier import suggest_risk
from validate_skills import configure_utf8_output, parse_frontmatter


FRONTMATTER_PATTERN = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
AUTHORIZED_USE_ONLY_PATTERN = re.compile(r"AUTHORIZED USE ONLY", re.IGNORECASE)
SAFE_BLOCKLIST_PATTERN = re.compile(
    r"\b(?:"
    r"create|write|overwrite|append|modify|update|delete|remove|deploy|publish|"
    r"push|commit|merge|install|token|secret|password|oauth|api[_ -]?key|"
    r"POST|PUT|PATCH|DELETE"
    r")\b",
    re.IGNORECASE,
)
STRONG_CRITICAL_REASONS = {
    "curl pipes into a shell",
    "wget pipes into a shell",
    "PowerShell invoke-expression",
    "destructive filesystem delete",
    "git mutation",
    "package publication",
    "deployment or infrastructure mutation",
}
SAFE_ALLOWED_REASONS = {
    "non-mutating command example",
    "contains fenced examples",
    "read-only or diagnostic language",
    "technical or integration language",
}
EXPLICIT_OFFENSIVE_REASON = "explicit offensive disclaimer"
CRITICAL_ID_PATTERN = re.compile(
    r"(?:^|/)(?:"
    r".+-automation|"
    r"git-.+|"
    r"create-branch|"
    r"using-git-worktrees|"
    r".+-deploy(?:ment)?(?:-.+)?|"
    r"deployment-.+|"
    r"workflow-automation|"
    r"github-workflow-automation|"
    r"gitops-workflow|"
    r"dependency-upgrade|"
    r"framework-migration-deps-upgrade|"
    r"finishing-a-development-branch|"
    r"conductor-revert|"
    r"conductor-implement|"
    r"personal-tool-builder|"
    r"release-.+|"
    r"makepad-deployment|"
    r"azd-deployment|"
    r"deployment-engineer|"
    r"git-pr-workflows-git-workflow"
    r")$",
    re.IGNORECASE,
)
OFFENSIVE_ID_PATTERN = re.compile(
    r"(?:^|/)(?:"
    r"pentest-.+|"
    r".+-penetration-testing|"
    r"red-team-.+|"
    r"xss-.+|"
    r"sql-injection-.+|"
    r"idor-testing|"
    r"file-path-traversal|"
    r"linux-privilege-escalation|"
    r"windows-privilege-escalation|"
    r"html-injection-testing|"
    r"burp-suite-testing|"
    r"api-fuzzing-bug-bounty|"
    r"active-directory-attacks|"
    r"attack-tree-construction|"
    r"cloud-penetration-testing"
    r")$",
    re.IGNORECASE,
)
NONE_ID_PATTERN = re.compile(
    r"(?:^|/)(?:"
    r"file-uploads|"
    r"architecture-patterns|"
    r"cc-skill-strategic-compact|"
    r"nextjs-supabase-auth|"
    r"inngest|"
    r"dbt-transformation-patterns|"
    r"avalonia-viewmodels-zafiro|"
    r"microservices-patterns|"
    r"cc-skill-continuous-learning|"
    r"azure-functions|"
    r"email-systems|"
    r"prompt-caching|"
    r"bullmq-specialist|"
    r"game-development/2d-games"
    r")$",
    re.IGNORECASE,
)
AUTHORIZED_USE_ONLY_NOTICE = (
    "> AUTHORIZED USE ONLY: Use this skill only for authorized security assessments, "
    "defensive validation, or controlled educational environments."
)


def strip_frontmatter(content: str) -> tuple[str, str] | None:
    match = FRONTMATTER_PATTERN.search(content)
    if not match:
        return None
    return match.group(1), content[match.end():]


def replace_risk_value(content: str, new_risk: str) -> str:
    frontmatter = strip_frontmatter(content)
    if frontmatter is None:
        return content

    frontmatter_text, body = frontmatter
    lines = frontmatter_text.splitlines()
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("risk:"):
            indent = line[: len(line) - len(line.lstrip())]
            lines[index] = f"{indent}risk: {new_risk}"
            break
    else:
        return content

    updated_frontmatter = "\n".join(lines)
    return f"---\n{updated_frontmatter}\n---{body}"


def matches_explicit_pattern(
    pattern: re.Pattern[str],
    *,
    skill_id: str,
    metadata: dict[str, object],
) -> bool:
    haystacks = [
        skill_id,
        str(metadata.get("name") or ""),
        str(metadata.get("description") or ""),
    ]
    return any(pattern.search(value) for value in haystacks if value)


def ensure_authorized_use_only_notice(content: str) -> str:
    if AUTHORIZED_USE_ONLY_PATTERN.search(content):
        return content

    frontmatter = strip_frontmatter(content)
    if frontmatter is None:
        return content

    frontmatter_text, body = frontmatter
    body_content = body.lstrip("\n")
    return f"---\n{frontmatter_text}\n---\n\n{AUTHORIZED_USE_ONLY_NOTICE}\n\n{body_content}"


def choose_synced_risk(
    content: str,
    metadata: dict[str, object] | None,
    *,
    skill_id: str | None = None,
) -> tuple[str, tuple[str, ...]] | None:
    if not metadata or metadata.get("risk") != "unknown":
        return None

    suggestion = suggest_risk(content, metadata)
    reasons = tuple(suggestion.reasons)
    reason_set = set(reasons)
    resolved_skill_id = skill_id or str(metadata.get("name") or "")

    if suggestion.risk == "offensive":
        if EXPLICIT_OFFENSIVE_REASON in reason_set:
            return "offensive", reasons
        if matches_explicit_pattern(OFFENSIVE_ID_PATTERN, skill_id=resolved_skill_id, metadata=metadata):
            return "offensive", reasons
        return None

    if suggestion.risk == "critical":
        if reason_set & STRONG_CRITICAL_REASONS:
            return "critical", reasons
        if matches_explicit_pattern(CRITICAL_ID_PATTERN, skill_id=resolved_skill_id, metadata=metadata):
            return "critical", reasons
        return None

    if suggestion.risk == "none":
        if matches_explicit_pattern(NONE_ID_PATTERN, skill_id=resolved_skill_id, metadata=metadata):
            return "none", reasons
        return None

    if suggestion.risk == "safe":
        if not reason_set:
            return None
        if not reason_set.issubset(SAFE_ALLOWED_REASONS):
            return None
        if SAFE_BLOCKLIST_PATTERN.search(content):
            return None
        return "safe", reasons

    return None


def update_skill_file(
    skill_path: Path,
    *,
    skill_id: str | None = None,
) -> tuple[bool, str | None, tuple[str, ...]]:
    if not is_safe_regular_file(skill_path):
        return False, None, ()

    content = skill_path.read_text(encoding="utf-8")
    metadata, _ = parse_frontmatter(content, skill_path.as_posix())
    decision = choose_synced_risk(content, metadata, skill_id=skill_id or skill_path.parent.name)
    if decision is None:
        return False, None, ()

    new_risk, reasons = decision
    updated_content = content
    if new_risk == "offensive":
        updated_content = ensure_authorized_use_only_notice(updated_content)
    updated_content = replace_risk_value(updated_content, new_risk)
    if updated_content == content:
        return False, None, ()

    skill_path.write_text(updated_content, encoding="utf-8")
    return True, new_risk, reasons


def iter_skill_files(skills_dir: Path):
    for root, dirs, files in os.walk(skills_dir):
        dirs[:] = [directory for directory in dirs if not directory.startswith(".")]
        if "SKILL.md" in files:
            yield Path(root) / "SKILL.md"


def main() -> int:
    configure_utf8_output()

    parser = argparse.ArgumentParser(
        description="Conservatively sync legacy risk: unknown labels to concrete values.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing files.")
    args = parser.parse_args()

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"

    updated_count = 0
    by_risk: Counter[str] = Counter()

    for skill_path in iter_skill_files(skills_dir):
        content = skill_path.read_text(encoding="utf-8")
        metadata, _ = parse_frontmatter(content, skill_path.as_posix())
        skill_id = skill_path.parent.relative_to(skills_dir).as_posix()
        decision = choose_synced_risk(content, metadata, skill_id=skill_id)
        if decision is None:
            continue

        new_risk, reasons = decision
        rel_path = skill_path.relative_to(repo_root)

        if args.dry_run:
            print(f"SYNC {rel_path} [risk={new_risk}; reasons={', '.join(reasons[:3])}]")
            updated_count += 1
            by_risk[new_risk] += 1
            continue

        changed, applied_risk, applied_reasons = update_skill_file(skill_path, skill_id=skill_id)
        if changed and applied_risk is not None:
            print(
                f"SYNC {rel_path} [risk={applied_risk}; reasons={', '.join(applied_reasons[:3])}]"
            )
            updated_count += 1
            by_risk[applied_risk] += 1

    print(f"\nUpdated: {updated_count}")
    if updated_count:
        print(f"By risk: {dict(sorted(by_risk.items()))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
