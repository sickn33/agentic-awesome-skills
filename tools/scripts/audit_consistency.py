#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from _project_paths import find_repo_root
import sync_repo_metadata
from update_readme import configure_utf8_output, load_metadata, apply_metadata


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _read_json(path: Path):
    return json.loads(_read_text(path))


def _package_expected_description(metadata: dict) -> str:
    return (
        f"{metadata['total_skills_label']} agentic skills for Claude Code, Gemini CLI, "
        "Cursor, Antigravity & more. Installer CLI."
    )


def _expected_readme(content: str, metadata: dict) -> str:
    return sync_repo_metadata.sync_readme_copy(apply_metadata(content, metadata), metadata)


def _expected_getting_started(content: str, metadata: dict) -> str:
    return sync_repo_metadata.sync_getting_started(content, metadata)


def _expected_bundles(content: str, metadata: dict, root: Path) -> str:
    return sync_repo_metadata.sync_bundles_doc(content, metadata, root)


def _expected_regex_sync(content: str, replacements: list[tuple[str, str]]) -> str:
    return sync_repo_metadata.sync_regex_text(content, replacements)


def _expected_jetski_cortex(content: str, metadata: dict) -> str:
    return sync_repo_metadata.sync_jetski_cortex(content, metadata)


def _find_manifest_issues(root: Path) -> list[str]:
    issues: list[str] = []
    canonical_path = root / "skills_index.json"
    mirrored_path = root / "data" / "skills_index.json"
    web_copy_paths = [
        root / "apps" / "web-app" / "public" / "skills.json.backup",
        root / "apps" / "web-app" / "public" / "skills.json",
    ]

    if not canonical_path.is_file():
        return ["skills_index.json is missing"]

    try:
        manifest = _read_json(canonical_path)
    except json.JSONDecodeError as error:
        return [f"skills_index.json is invalid JSON: {error}"]

    if not isinstance(manifest, list) or not manifest:
        issues.append("skills_index.json must be a non-empty array")
        return issues

    required_fields = {
        "id",
        "path",
        "category",
        "name",
        "description",
        "risk",
        "source",
        "date_added",
    }
    for index, entry in enumerate(manifest):
        if not isinstance(entry, dict):
            issues.append(f"skills_index.json entry {index} must be an object")
            continue
        missing = sorted(field for field in required_fields if field not in entry)
        if missing:
            skill_id = entry.get("id", f"entry {index}")
            issues.append(f"skills_index.json {skill_id} missing required fields: {', '.join(missing)}")

    canonical_text = _read_text(canonical_path)
    if not mirrored_path.is_file():
        issues.append("data/skills_index.json mirror is missing")
    elif _read_text(mirrored_path) != canonical_text:
        issues.append("data/skills_index.json is not an exact mirror of skills_index.json")

    for copy_path in web_copy_paths:
        if copy_path.is_file() and _read_text(copy_path) != canonical_text:
            relative_copy = copy_path.relative_to(root).as_posix()
            issues.append(f"{relative_copy} is not an exact copy of skills_index.json")

    return issues


def find_local_consistency_issues(base_dir: str | Path) -> list[str]:
    root = Path(base_dir)
    metadata = load_metadata(str(root))
    issues: list[str] = []
    issues.extend(_find_manifest_issues(root))

    package_json = json.loads(_read_text(root / "package.json"))
    if package_json.get("description") != _package_expected_description(metadata):
        issues.append("package.json description is out of sync with the live skills count")

    file_checks = [
        ("README.md", _expected_readme),
        ("docs/users/getting-started.md", _expected_getting_started),
        ("docs/users/bundles.md", lambda content, current_metadata: _expected_bundles(content, current_metadata, root)),
        ("docs/integrations/jetski-cortex.md", _expected_jetski_cortex),
        (
            "docs/users/claude-code-skills.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [(r"\d[\d,]*\+ skills", f"{current_metadata['total_skills_label']} skills")],
            ),
        ),
        (
            "docs/users/gemini-cli-skills.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [(r"\d[\d,]*\+ files", f"{current_metadata['total_skills_label']} files")],
            ),
        ),
        (
            "docs/users/usage.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [
                    (r"\d[\d,]*\+ skill files", f"{current_metadata['total_skills_label']} skill files"),
                    (r"\d[\d,]*\+ tools", f"{current_metadata['total_skills_label']} tools"),
                    (r"all \d[\d,]*\+ skills", f"all {current_metadata['total_skills_label']} skills"),
                    (
                        r"have \d[\d,]*\+ skills installed locally",
                        f"have {current_metadata['total_skills_label']} skills installed locally",
                    ),
                ],
            ),
        ),
        (
            "docs/users/visual-guide.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [
                    (r"\d[\d,]*\+ skills live here", f"{current_metadata['total_skills_label']} skills live here"),
                    (r"\d[\d,]*\+ total", f"{current_metadata['total_skills_label']} total"),
                    (r"\d[\d,]*\+ SKILLS", f"{current_metadata['total_skills_label']} SKILLS"),
                ],
            ),
        ),
        (
            "docs/users/kiro-integration.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [(r"\d[\d,]*\+ specialized areas", f"{current_metadata['total_skills_label']} specialized areas")],
            ),
        ),
        (
            "docs/maintainers/repo-growth-seo.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [
                    (r"\d[\d,]*\+ agentic skills", f"{current_metadata['total_skills_label']} agentic skills"),
                    (r"\d[\d,]*\+ Agentic Skills", f"{current_metadata['total_skills_label']} Agentic Skills"),
                ],
            ),
        ),
        (
            "docs/maintainers/skills-update-guide.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [
                    (
                        r"All \d[\d,]*\+ skills from the skills directory",
                        f"All {current_metadata['total_skills_label']} skills from the skills directory",
                    )
                ],
            ),
        ),
        (
            "docs/integrations/jetski-gemini-loader/README.md",
            lambda content, current_metadata: _expected_regex_sync(
                content,
                [(r"\d[\d,]*\+ skills", f"{current_metadata['total_skills_label']} skills")],
            ),
        ),
    ]

    for relative_path, transform in file_checks:
        path = root / relative_path
        if not path.is_file():
            issues.append(f"{relative_path} is missing")
            continue
        original = _read_text(path)
        expected = transform(original, metadata)
        if original != expected:
            issues.append(f"{relative_path} contains stale or inconsistent generated claims")

    return issues


def find_github_about_issues(base_dir: str | Path) -> list[str]:
    root = Path(base_dir)
    metadata = load_metadata(str(root))
    result = subprocess.run(
        [
            "gh",
            "repo",
            "view",
            metadata["repo"],
            "--json",
            "description,homepageUrl,repositoryTopics",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    issues: list[str] = []

    if payload.get("description") != sync_repo_metadata.build_about_description(metadata):
        issues.append("GitHub About description is out of sync")
    if payload.get("homepageUrl") != sync_repo_metadata.GITHUB_HOMEPAGE_URL:
        issues.append("GitHub About homepage is out of sync")

    current_topics = sorted(
        entry["name"] for entry in payload.get("repositoryTopics", []) if isinstance(entry, dict) and "name" in entry
    )
    expected_topics = sorted(sync_repo_metadata.build_about_topics())
    if current_topics != expected_topics:
        issues.append("GitHub About topics are out of sync")

    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit repository consistency for generated claims.")
    parser.add_argument(
        "--check-github-about",
        action="store_true",
        help="Also verify the live GitHub About description, homepage, and topics via gh CLI.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)

    issues = find_local_consistency_issues(root)
    if args.check_github_about:
        issues.extend(find_github_about_issues(root))

    if issues:
        for issue in issues:
            print(f"❌ {issue}")
        return 1

    print("✅ Repository consistency audit passed.")
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
