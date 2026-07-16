#!/usr/bin/env python3
import argparse
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

GITHUB_REPO = "sickn33/agentic-awesome-skills"
SYNC_COMMENT_RE = re.compile(r"<!-- registry-sync: .*? -->")
SYNC_COMMENT_FIELDS_RE = re.compile(
    r"<!-- registry-sync: version=(?P<version>[^;]+); skills=(?P<skills>\d+); "
    r"stars=(?P<stars>\d+); updated_at=(?P<updated_at>[^ ]+) -->"
)
CURRENT_RELEASE_LINE_RE = re.compile(r"^\*\*Current release: V[\d.]+\.\*\* .*?$", re.MULTILINE)


def configure_utf8_output() -> None:
    """Best-effort UTF-8 stdout/stderr on Windows without dropping diagnostics."""
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


def find_repo_root(start_path: str) -> str:
    current = os.path.abspath(start_path)
    while True:
        if os.path.isfile(os.path.join(current, "package.json")) and os.path.isfile(
            os.path.join(current, "README.md")
        ):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            raise FileNotFoundError("Could not locate repository root from script path.")
        current = parent


def format_skill_count(total_skills: int) -> str:
    return f"{total_skills:,}+"


def format_star_badge_count(stars: int) -> str:
    if stars >= 1000:
        rounded = int(round(stars / 1000.0))
        return f"{rounded}%2C000%2B"
    return f"{stars}%2B"


def format_star_milestone(stars: int) -> str:
    if stars >= 1000:
        rounded = int(round(stars / 1000.0))
        return f"{rounded},000+"
    return f"{stars}+"


def format_star_celebration(stars: int) -> str:
    if stars >= 1000:
        rounded = int(round(stars / 1000.0))
        return f"{rounded}k"
    return str(stars)


def fetch_star_count(repo: str) -> int | None:
    url = f"https://api.github.com/repos/{repo}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "agentic-awesome-skills-readme-sync",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None
    stars = payload.get("stargazers_count")
    return int(stars) if isinstance(stars, int) else None


def parse_existing_sync_metadata(current_readme: str) -> dict[str, str | int] | None:
    match = SYNC_COMMENT_FIELDS_RE.search(current_readme)
    if not match:
        return None

    return {
        "version": match.group("version"),
        "skills": int(match.group("skills")),
        "stars": int(match.group("stars")),
        "updated_at": match.group("updated_at"),
    }


def load_metadata(
    base_dir: str, repo: str = GITHUB_REPO, refresh_volatile: bool = False
) -> dict:
    readme_path = os.path.join(base_dir, "README.md")
    package_path = os.path.join(base_dir, "package.json")
    index_path = os.path.join(base_dir, "skills_index.json")

    with open(index_path, "r", encoding="utf-8") as file:
        skills = json.load(file)

    with open(package_path, "r", encoding="utf-8") as file:
        package = json.load(file)

    with open(readme_path, "r", encoding="utf-8") as file:
        current_readme = file.read()

    existing_sync_metadata = parse_existing_sync_metadata(current_readme)
    current_star_match = re.search(r"⭐%20([\d%2C\+]+)%20Stars", current_readme)
    current_stars = None
    if current_star_match:
        compact = current_star_match.group(1).replace("%2C", "").replace("%2B", "")
        compact = compact.rstrip("+")
        if compact.isdigit():
            current_stars = int(compact)

    existing_stars = None
    existing_updated_at = None
    if existing_sync_metadata:
        stars = existing_sync_metadata.get("stars")
        updated_at = existing_sync_metadata.get("updated_at")
        if isinstance(stars, int):
            existing_stars = stars
        if isinstance(updated_at, str):
            existing_updated_at = updated_at

    live_stars = fetch_star_count(repo) if refresh_volatile else None
    total_stars = (
        live_stars
        if live_stars is not None
        else existing_stars
        if existing_stars is not None
        else current_stars or 0
    )
    updated_at = (
        datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        if refresh_volatile or existing_updated_at is None
        else existing_updated_at
    )

    return {
        "repo": repo,
        "version": str(package.get("version", "0.0.0")),
        "total_skills": len(skills),
        "total_skills_label": format_skill_count(len(skills)),
        "stars": total_stars,
        "star_badge_count": format_star_badge_count(total_stars),
        "star_milestone": format_star_milestone(total_stars),
        "star_celebration": format_star_celebration(total_stars),
        "updated_at": updated_at,
        "used_live_star_count": live_stars is not None,
        "refreshed_volatile": refresh_volatile,
    }


def apply_metadata(content: str, metadata: dict) -> str:
    total_skills = metadata["total_skills"]
    total_skills_label = metadata["total_skills_label"]
    version = metadata["version"]
    star_badge_count = metadata["star_badge_count"]
    star_milestone = metadata["star_milestone"]
    star_celebration = metadata["star_celebration"]
    sync_comment = (
        f"<!-- registry-sync: version={version}; skills={total_skills}; "
        f"stars={metadata['stars']}; updated_at={metadata['updated_at']} -->"
    )

    content = re.sub(
        r"^# 🌌 Agentic Awesome Skills: .*?$",
        (
            f"# 🌌 Agentic Awesome Skills: {total_skills_label} "
            "Agentic Skills for Claude Code, Gemini CLI, Cursor, Autohand Code, Copilot & More"
        ),
        content,
        count=1,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"^> \*\*The Ultimate Collection of .*?\*\*$",
        (
            f"> **The Ultimate Collection of {total_skills_label} Universal Agentic "
            "Skills for AI Coding Assistants — Claude Code, Gemini CLI, Codex CLI, "
            "Antigravity IDE, GitHub Copilot, Cursor, OpenCode, AdaL**"
        ),
        content,
        count=1,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"https://img\.shields\.io/badge/⭐%20[\dA-Fa-f%,\+]+%20Stars-gold\?style=for-the-badge",
        f"https://img.shields.io/badge/⭐%20{star_badge_count}%20Stars-gold?style=for-the-badge",
        content,
        count=1,
    )
    content = re.sub(
        CURRENT_RELEASE_LINE_RE,
        (
            f"**Current release: V{version}.** Trusted by {star_celebration}+ GitHub stargazers, "
            "this repository combines official and community skill collections with bundles, "
            "workflows, installation paths, and docs that help you go from first install to daily use quickly."
        ),
        content,
        count=1,
    )
    content = re.sub(
        r"^\*\*Agentic Awesome Skills\*\* is a curated, battle-tested library of \*\*.*?\*\* designed",
        (
            f"**Agentic Awesome Skills** is a curated, battle-tested library of "
            f"**{total_skills_label} high-performance agentic skills** designed"
        ),
        content,
        count=1,
        flags=re.MULTILINE,
    )
    content = re.sub(
        r"\[📚 Browse \d[\d,]*\+ Skills\]\(#browse-[^)]+\)",
        f"[📚 Browse {total_skills_label} Skills](#browse-{total_skills}-skills)",
        content,
        count=1,
    )
    content = re.sub(
        r"\*\*Welcome to the V[\d.]+ .*? Stars Celebration Release!\*\*",
        f"**Welcome to the V{version} {star_celebration} Stars Celebration Release!**",
        content,
        count=1,
    )
    content = re.sub(
        r"> \*\*🌟 .*? GitHub Stars Milestone!\*\*",
        f"> **🌟 {star_milestone} GitHub Stars Milestone!**",
        content,
        count=1,
    )
    content = re.sub(
        r"\*\*Agentic Awesome Skills\*\* \(Release [\d.]+\) is a massive upgrade to your AI's capabilities, now featuring \*\*.*?\*\* skills",
        (
            f"**Agentic Awesome Skills** (Release {version}) is a massive upgrade "
            f"to your AI's capabilities, now featuring **{total_skills_label} skills**"
        ),
        content,
        count=1,
    )
    content = re.sub(
        r"## Browse \d[\d,]*\+ Skills",
        f"## Browse {total_skills_label} Skills",
        content,
        count=1,
    )
    content = re.sub(
        r"<!-- registry-sync: .*? -->\n?",
        "",
        content,
        count=1,
    )
    return f"{sync_comment}\n{content.lstrip()}"


def update_readme(dry_run: bool = False, refresh_volatile: bool = False) -> dict:
    base_dir = find_repo_root(os.path.dirname(__file__))
    readme_path = os.path.join(base_dir, "README.md")
    metadata = load_metadata(base_dir, refresh_volatile=refresh_volatile)

    print(f"📖 Reading README from: {readme_path}")
    print(f"🔢 Total skills found: {metadata['total_skills']}")
    print(f"🏷️ Version found: {metadata['version']}")
    if metadata["used_live_star_count"]:
        print(f"⭐ Live GitHub stars found: {metadata['stars']}")
    else:
        print(f"⭐ Using existing README star count: {metadata['stars']}")

    with open(readme_path, "r", encoding="utf-8") as file:
        content = file.read()

    updated_content = apply_metadata(content, metadata)
    if dry_run:
        print("🧪 Dry run enabled; README.md not written.")
        return metadata

    with open(readme_path, "w", encoding="utf-8", newline="\n") as file:
        file.write(updated_content)

    print("✅ README.md updated successfully.")
    return metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync generated metadata into README.md.")
    parser.add_argument("--dry-run", action="store_true", help="Compute metadata without writing files.")
    parser.add_argument(
        "--refresh-volatile",
        action="store_true",
        help="Refresh live star count and updated_at instead of preserving existing values.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    configure_utf8_output()
    args = parse_args()
    update_readme(dry_run=args.dry_run, refresh_volatile=args.refresh_volatile)
