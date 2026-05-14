#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from plugin_compatibility import compatibility_by_skill_id, load_plugin_compatibility
from sync_editorial_bundles import load_editorial_bundles, render_bundles_doc
from update_readme import configure_utf8_output, find_repo_root, load_metadata, update_readme


ABOUT_DESCRIPTION_RE = re.compile(r'"description"\s*:\s*"([^"]*)"')
GITHUB_HOMEPAGE_URL = "https://sickn33.github.io/antigravity-awesome-skills/"
RECOMMENDED_TOPICS = [
    "antigravity",
    "antigravity-skills",
    "claude-code",
    "claude-code-skills",
    "cursor",
    "cursor-skills",
    "codex-cli",
    "codex-skills",
    "gemini-cli",
    "gemini-skills",
    "kiro",
    "ai-agents",
    "ai-agent-skills",
    "agent-skills",
    "agentic-skills",
    "developer-tools",
    "skill-library",
    "ai-workflows",
    "ai-coding",
    "mcp",
]
README_TAGLINE_RE = re.compile(
    r"^> \*\*Installable GitHub library of \d[\d,]*\+ agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants\.\*\*$",
    re.MULTILINE,
)
README_RELEASE_RE = re.compile(r"^\*\*Current release: V[\d.]+\.\*\* .*?$", re.MULTILINE)
README_BROAD_COVERAGE_RE = re.compile(
    r"^- \*\*Broad coverage with real utility\*\*: \d[\d,]*\+ skills across development, testing, security, infrastructure, product, and marketing\.$",
    re.MULTILINE,
)
README_NEW_HERE_RE = re.compile(
    r"^\*\*Antigravity Awesome Skills\*\* \(Release [\d.]+\) is a large, installable skill library.*$",
    re.MULTILINE,
)
README_BROWSE_RE = re.compile(
    r'^If you want a faster answer than "browse all \d[\d,]*\+ skills", start with a tool-specific guide:$',
    re.MULTILINE,
)
README_TOC_BROWSE_RE = re.compile(
    r"^- \[Browse \d[\d,]*\+ Skills\]\(#browse-\d+-skills\)$",
    re.MULTILINE,
)
GETTING_STARTED_TITLE_RE = re.compile(
    r"^# Getting Started with Antigravity Awesome Skills \(V[\d.]+\)$", re.MULTILINE
)
BUNDLES_FOOTER_RE = re.compile(
    r"^_Last updated: .*? \| Total Skills: \d[\d,]*\+ \| Total Bundles: \d+_$",
    re.MULTILINE,
)


def build_about_description(metadata: dict) -> str:
    return (
        f"Installable GitHub library of {metadata['total_skills_label']} agentic skills for "
        "Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and more. "
        "Includes installer CLI, bundles, workflows, and official/community skill collections."
    )


def build_about_topics() -> list[str]:
    return list(RECOMMENDED_TOPICS)


def run_cli_command(args: list[str], dry_run: bool = False) -> None:
    if dry_run:
        print(f"[dry-run] {' '.join(args)}")
        return

    subprocess.run(args, check=True)


def sync_github_about(
    metadata: dict,
    dry_run: bool,
    runner=run_cli_command,
) -> None:
    description = build_about_description(metadata)
    repo = metadata["repo"]

    runner(
        [
            "gh",
            "repo",
            "edit",
            repo,
            "--description",
            description,
            "--homepage",
            GITHUB_HOMEPAGE_URL,
        ],
        dry_run=dry_run,
    )

    topic_command = [
        "gh",
        "api",
        f"repos/{repo}/topics",
        "--method",
        "PUT",
    ]
    for topic in build_about_topics():
        topic_command.extend(["-f", f"names[]={topic}"])
    runner(topic_command, dry_run=dry_run)

    if not dry_run:
        print(f"[ok] Synced GitHub About settings for {repo}")


def replace_if_present(content: str, pattern: re.Pattern[str], replacement: str) -> tuple[str, bool]:
    updated_content, count = pattern.subn(replacement, content, count=1)
    return updated_content, count > 0


def count_documented_bundles(content: str) -> int:
    return len(re.findall(r'^### .*".*" Pack$', content, flags=re.MULTILINE))


def sync_readme_copy(content: str, metadata: dict) -> str:
    star_celebration = metadata.get("star_celebration", "25k")
    replacements = [
        (
            README_TAGLINE_RE,
            (
                f"> **Installable GitHub library of {metadata['total_skills_label']} agentic skills "
                "for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.**"
            ),
        ),
        (
            README_RELEASE_RE,
            (
                f"**Current release: V{metadata['version']}.** Trusted by {star_celebration}+ GitHub stargazers, "
                "this repository combines official and community skill collections with bundles, "
                "workflows, installation paths, and docs that help you go from first install to daily use quickly."
            ),
        ),
        (
            README_BROAD_COVERAGE_RE,
            (
                f"- **Broad coverage with real utility**: {metadata['total_skills_label']} skills across "
                "development, testing, security, infrastructure, product, and marketing."
            ),
        ),
        (
            README_NEW_HERE_RE,
            (
                f"**Antigravity Awesome Skills** (Release {metadata['version']}) is a large, installable "
                "skill library for AI coding assistants. It includes onboarding docs, bundles, workflows, "
                "generated catalogs, and a CLI installer so you can move from discovery to actual usage "
                "without manually stitching together dozens of repos."
            ),
        ),
        (
            README_BROWSE_RE,
            f'If you want a faster answer than "browse all {metadata["total_skills_label"]} skills", start with a tool-specific guide:',
        ),
        (
            README_TOC_BROWSE_RE,
            f"- [Browse {metadata['total_skills_label']} Skills](#browse-{metadata['total_skills']}-skills)",
        ),
    ]

    for pattern, replacement in replacements:
        content, _ = replace_if_present(content, pattern, replacement)

    return content


def sync_getting_started(content: str, metadata: dict) -> str:
    content, _ = replace_if_present(
        content,
        GETTING_STARTED_TITLE_RE,
        f"# Getting Started with Antigravity Awesome Skills (V{metadata['version']})",
    )
    return content


def sync_bundles_doc(content: str, metadata: dict, base_dir: str | Path | None = None) -> str:
    root = Path(base_dir) if base_dir is not None else Path(find_repo_root(__file__))
    manifest_path = root / "data" / "editorial-bundles.json"
    template_path = root / "tools" / "templates" / "editorial-bundles.md.tmpl"
    if manifest_path.is_file() and template_path.is_file():
        bundles = load_editorial_bundles(root)
        compatibility = compatibility_by_skill_id(load_plugin_compatibility(root))
        return render_bundles_doc(root, metadata, bundles, compatibility)

    bundle_count = count_documented_bundles(content)
    if bundle_count == 0:
        bundle_count = 36
    content, _ = replace_if_present(
        content,
        BUNDLES_FOOTER_RE,
        f"_Last updated: March 2026 | Total Skills: {metadata['total_skills_label']} | Total Bundles: {bundle_count}_",
    )
    return content


def sync_jetski_cortex(content: str, metadata: dict) -> str:
    skill_label = metadata["total_skills_label"]
    replacements = [
        (r"\d[\d,.]*\+ skill", f"{skill_label} skill"),
        (r"\d[\d,.]* skill", f"{skill_label} skill"),
    ]
    return sync_regex_text(
        content,
        replacements,
    )


def sync_simple_text(content: str, replacements: list[tuple[str, str]]) -> str:
    for old_text, new_text in replacements:
        content = content.replace(old_text, new_text)
    return content


def sync_regex_text(content: str, replacements: list[tuple[str, str]]) -> str:
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    return content


def update_text_file(path: Path, transform, metadata: dict, dry_run: bool) -> bool:
    if not path.is_file() or path.is_symlink():
        return False

    original = path.read_text(encoding="utf-8")
    updated = transform(original, metadata)
    if updated == original:
        return False

    if dry_run:
        print(f"[dry-run] Would update {path}")
        return True

    path.write_text(updated, encoding="utf-8", newline="\n")
    print(f"[ok] Updated {path}")
    return True


def sync_curated_docs(base_dir: str, metadata: dict, dry_run: bool) -> int:
    root = Path(base_dir)

    regex_text_replacements = [
        (
            root / "docs" / "users" / "claude-code-skills.md",
            [
                (r"\d[\d,]*\+ skills", f"{metadata['total_skills_label']} skills"),
            ],
        ),
        (
            root / "docs" / "users" / "gemini-cli-skills.md",
            [
                (r"\d[\d,]*\+ files", f"{metadata['total_skills_label']} files"),
            ],
        ),
        (
            root / "docs" / "users" / "usage.md",
            [
                (r"\d[\d,]*\+ skill files", f"{metadata['total_skills_label']} skill files"),
                (r"\d[\d,]*\+ tools", f"{metadata['total_skills_label']} tools"),
                (r"all \d[\d,]*\+ skills", f"all {metadata['total_skills_label']} skills"),
                (r"have \d[\d,]*\+ skills installed locally", f"have {metadata['total_skills_label']} skills installed locally"),
            ],
        ),
        (
            root / "docs" / "users" / "visual-guide.md",
            [
                (r"\d[\d,]*\+ skills live here", f"{metadata['total_skills_label']} skills live here"),
                (r"\d[\d,]*\+ total", f"{metadata['total_skills_label']} total"),
                (r"\d[\d,]*\+ SKILLS", f"{metadata['total_skills_label']} SKILLS"),
            ],
        ),
        (
            root / "docs" / "users" / "kiro-integration.md",
            [
                (r"\d[\d,]*\+ specialized areas", f"{metadata['total_skills_label']} specialized areas"),
            ],
        ),
        (
            root / "docs" / "maintainers" / "repo-growth-seo.md",
            [
                (r"\d[\d,]*\+ agentic skills", f"{metadata['total_skills_label']} agentic skills"),
                (r"\d[\d,]*\+ Agentic Skills", f"{metadata['total_skills_label']} Agentic Skills"),
            ],
        ),
        (
            root / "docs" / "maintainers" / "skills-update-guide.md",
            [
                (r"All \d[\d,]*\+ skills from the skills directory", f"All {metadata['total_skills_label']} skills from the skills directory"),
            ],
        ),
        (
            root / "docs" / "integrations" / "jetski-gemini-loader" / "README.md",
            [
                (r"\d[\d,]*\+ skills", f"{metadata['total_skills_label']} skills"),
            ],
        ),
    ]

    updated_files = 0
    updated_files += int(update_text_file(root / "README.md", sync_readme_copy, metadata, dry_run))
    updated_files += int(update_text_file(root / "docs" / "users" / "getting-started.md", sync_getting_started, metadata, dry_run))
    updated_files += int(
        update_text_file(
            root / "docs" / "users" / "bundles.md",
            lambda content, current_metadata: sync_bundles_doc(content, current_metadata, root),
            metadata,
            dry_run,
        )
    )
    updated_files += int(update_text_file(root / "docs" / "integrations" / "jetski-cortex.md", sync_jetski_cortex, metadata, dry_run))

    for path, replacements in regex_text_replacements:
        updated_files += int(
            update_text_file(
                path,
                lambda content, current_metadata, repl=replacements: sync_regex_text(content, repl),
                metadata,
                dry_run,
            )
        )

    return updated_files


def update_package_description(base_dir: str, metadata: dict, dry_run: bool) -> bool:
    package_path = os.path.join(base_dir, "package.json")
    with open(package_path, "r", encoding="utf-8") as file:
        content = file.read()

    new_description = (
        f"{metadata['total_skills_label']} agentic skills for Claude Code, Gemini CLI, "
        "Cursor, Antigravity & more. Installer CLI."
    )
    updated_content = ABOUT_DESCRIPTION_RE.sub(
        f'"description": "{new_description}"', content, count=1
    )

    if updated_content == content:
        return False

    if dry_run:
        print(f"[dry-run] Would update package description in {package_path}")
        return True

    with open(package_path, "w", encoding="utf-8", newline="\n") as file:
        file.write(updated_content)
    print(f"[ok] Updated package description in {package_path}")
    return True


def print_manual_github_about(metadata: dict) -> None:
    description = build_about_description(metadata)
    print("\nManual GitHub repo settings update:")
    print(f"- About description: {description}")
    print(f"- Homepage: {GITHUB_HOMEPAGE_URL}")
    print(f"- Suggested topics: {', '.join(build_about_topics())}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Synchronize repository metadata across README and package.json."
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview updates without writing files.")
    parser.add_argument(
        "--refresh-volatile",
        action="store_true",
        help="Refresh live star count and updated_at when syncing README metadata.",
    )
    parser.add_argument(
        "--apply-github-about",
        action="store_true",
        help="Apply the GitHub About description, homepage, and topics to the remote repository via gh CLI.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_dir = find_repo_root(os.path.dirname(__file__))
    metadata = load_metadata(base_dir, refresh_volatile=args.refresh_volatile)

    print("Repository metadata")
    print(json.dumps(metadata, indent=2))

    readme_metadata = update_readme(
        dry_run=args.dry_run, refresh_volatile=args.refresh_volatile
    )
    package_updated = update_package_description(base_dir, metadata, args.dry_run)
    docs_updated = sync_curated_docs(base_dir, metadata, args.dry_run)
    if args.apply_github_about:
        sync_github_about(metadata, dry_run=args.dry_run)
    print_manual_github_about(readme_metadata)

    if args.dry_run and not package_updated:
        print("\n[dry-run] No package.json description changes required.")
    if args.dry_run and docs_updated == 0:
        print("[dry-run] No curated docs changes required.")

    return 0


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
