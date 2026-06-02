#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from _project_paths import find_repo_root
from update_readme import configure_utf8_output, load_metadata


CONTRIBUTOR_SECTION_HEADING = "## Repo Contributors"
CONTRIBUTOR_SECTION_START = "We officially thank the following contributors for their help in making this repository awesome!\n\n"
CONTRIB_ROCKS_MAX = 500
SPECIAL_LINK_OVERRIDES = {
    "Copilot": "https://github.com/apps/copilot-swe-agent",
    "github-actions[bot]": "https://github.com/apps/github-actions",
    "copilot-swe-agent[bot]": "https://github.com/apps/copilot-swe-agent",
}


def parse_existing_contributor_links(content: str) -> dict[str, str]:
    links: dict[str, str] = {}
    pattern = re.compile(r"^- \[@(?P<label>.+?)\]\((?P<url>https://github\.com/.+?)\)$")
    for line in content.splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        links[match.group("label")] = match.group("url")
    return links


def parse_existing_contributor_order(content: str) -> list[str]:
    order: list[str] = []
    seen: set[str] = set()
    pattern = re.compile(r"^- \[@(?P<label>.+?)\]\((?P<url>https://github\.com/.+?)\)$")
    for line in content.splitlines():
        match = pattern.match(line.strip())
        if not match:
            continue
        label = match.group("label")
        if label in seen:
            continue
        seen.add(label)
        order.append(label)
    return order


def parse_contributors_response(payload: list[dict]) -> list[str]:
    contributors: list[str] = []
    seen: set[str] = set()
    for entry in payload:
        login = entry.get("login")
        if not isinstance(login, str) or not login or login in seen:
            continue
        seen.add(login)
        contributors.append(login)
    return contributors


def order_contributors_for_render(contributors: list[str], existing_order: list[str]) -> list[str]:
    contributor_set = set(contributors)
    ordered_existing = [login for login in existing_order if login in contributor_set]
    new_contributors = sorted(
        (login for login in contributors if login not in existing_order),
        key=lambda login: login.casefold(),
    )
    return ordered_existing + new_contributors


def infer_contributor_url(login: str, existing_links: dict[str, str]) -> str:
    if login in existing_links:
        return existing_links[login]
    if login in SPECIAL_LINK_OVERRIDES:
        return SPECIAL_LINK_OVERRIDES[login]
    if login.endswith("[bot]"):
        app_name = login[: -len("[bot]")]
        return f"https://github.com/apps/{app_name}"
    return f"https://github.com/{login}"


def render_contributor_lines(contributors: list[str], existing_links: dict[str, str]) -> str:
    lines = []
    for login in contributors:
        url = infer_contributor_url(login, existing_links)
        lines.append(f"- [@{login}]({url})")
    return "\n".join(lines)


def render_repo_contributors_section(repo: str) -> str:
    return f"""{CONTRIBUTOR_SECTION_HEADING}

<a href="https://github.com/{repo}/graphs/contributors">
  <img src="https://contrib.rocks/image?repo={repo}&max={CONTRIB_ROCKS_MAX}" alt="Repository contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks). *(Image may be cached; [view live contributors](https://github.com/{repo}/graphs/contributors) on GitHub.)*

{CONTRIBUTOR_SECTION_START}The image above renders the repository contributor avatar grid with `max={CONTRIB_ROCKS_MAX}` so the README stays compact while keeping live contributor attribution linked.
"""


def update_repo_contributors_section(content: str, contributors: list[str], repo: str = "sickn33/antigravity-awesome-skills") -> str:
    if CONTRIBUTOR_SECTION_HEADING not in content or "\n## " not in content:
        raise ValueError("README.md does not contain the expected Repo Contributors section structure.")

    start_index = content.index(CONTRIBUTOR_SECTION_HEADING)
    end_index = content.index("\n## ", start_index + len(CONTRIBUTOR_SECTION_HEADING))
    return f"{content[:start_index]}{render_repo_contributors_section(repo).rstrip()}\n{content[end_index:]}"


def fetch_contributors(repo: str) -> list[str]:
    result = subprocess.run(
        [
            "gh",
            "api",
            f"repos/{repo}/contributors?per_page=100",
            "--paginate",
            "--slurp",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    flat_entries: list[dict] = []
    for page in payload:
        if isinstance(page, list):
            flat_entries.extend(entry for entry in page if isinstance(entry, dict))
    return parse_contributors_response(flat_entries)


def sync_contributors(base_dir: str | Path, dry_run: bool = False) -> bool:
    root = Path(base_dir)
    metadata = load_metadata(str(root))
    contributors = fetch_contributors(metadata["repo"])
    readme_path = root / "README.md"
    original = readme_path.read_text(encoding="utf-8")
    updated = update_repo_contributors_section(original, contributors, metadata["repo"])

    if updated == original:
        return False

    if dry_run:
        print(f"[dry-run] Would update contributors in {readme_path}")
        return True

    readme_path.write_text(updated, encoding="utf-8", newline="\n")
    print(f"✅ Updated contributors in {readme_path}")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synchronize the README Repo Contributors section.")
    parser.add_argument("--dry-run", action="store_true", help="Preview contributor changes without writing files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)
    sync_contributors(root, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
