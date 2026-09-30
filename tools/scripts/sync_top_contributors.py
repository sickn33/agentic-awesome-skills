#!/usr/bin/env python3
"""Synchronize the README Top Contributors rankings.

Two rankings are maintained:

* **Most Commits** - GitHub's own contributor count per account.
* **Most Skills Added** - every current ``skills/**/SKILL.md`` counted once at
  the commit that introduced it, resolved to the pull-request author so a
  contributor who opened the PR is credited even when the squash commit carries
  the maintainer's identity.

Both rankings exclude the repository maintainer accounts and automation, and
both are recomputed from Git history plus the GitHub API. The canonical-sync
lane owns README.md, so this script is what keeps the tables current; it is
invoked by ``npm run sync:repo-state``.

When the GitHub API is unavailable (no ``gh``, no token, fork checkout) the
ranking is left untouched instead of being blanked, so local runs and fork CI
never publish an empty leaderboard.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

from _project_paths import find_repo_root
from update_readme import configure_utf8_output, load_metadata

TOP_CONTRIBUTORS_HEADING = "## Top Contributors"
NEXT_SECTION_HEADING = "## Repo Contributors"
TOP_N = 10

# Maintainer handles and automation never appear in either ranking: the point
# is to thank external contributors, and bot/infra commits would otherwise
# dominate both tables.
EXCLUDED_LOGINS = frozenset({
    "sickn33",
    "sck_0",
    "sck000",
    "github-actions[bot]",
    "copilot-swe-agent[bot]",
    "dependabot[bot]",
})

# Accounts whose commits are authored under a non-noreply address. Git cannot
# resolve these on its own, so the mapping is explicit and reviewed.
AUTHOR_LOGIN_OVERRIDES = {
    "niccolo.lucioli@hotmail.com": "sickn33",
}

PR_NUMBER_PATTERN = re.compile(r"\(#(\d+)\)\s*$")
NOREPLY_PATTERN = re.compile(r"^(?:\d+\+)?([^@+]+)@users\.noreply\.github\.com$")


class GithubUnavailable(RuntimeError):
    """Raised when the GitHub API cannot be queried."""


def _run(cmd: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(cmd, cwd=str(cwd) if cwd else None,
                            capture_output=True, text=True)
    if result.returncode != 0:
        raise GithubUnavailable(result.stderr.strip() or f"command failed: {' '.join(cmd)}")
    return result.stdout


def login_from_email(email: str) -> str | None:
    match = NOREPLY_PATTERN.match(email or "")
    if match:
        return match.group(1)
    return AUTHOR_LOGIN_OVERRIDES.get(email)


def fetch_commit_ranking(repo: str) -> list[tuple[str, int]]:
    """Return GitHub's contributor counts, highest first, maintainers removed."""
    payload = json.loads(_run([
        "gh", "api", f"repos/{repo}/contributors?per_page=100", "--paginate", "--slurp",
    ]))
    entries: list[dict] = []
    for page in payload:
        if isinstance(page, list):
            entries.extend(item for item in page if isinstance(item, dict))
    ranked = Counter()
    for entry in entries:
        login = entry.get("login")
        if isinstance(login, str) and login and login not in EXCLUDED_LOGINS:
            ranked[login] += int(entry.get("contributions") or 0)
    return [(login, count) for login, count in ranked.most_common(TOP_N)]


def fetch_pull_request_authors(repo: str) -> dict[int, str]:
    """Map merged pull-request number to its author login."""
    payload = json.loads(_run([
        "gh", "pr", "list", "--repo", repo, "--state", "merged",
        "--limit", "3000", "--json", "number,author",
    ]))
    authors: dict[int, str] = {}
    for entry in payload:
        number = entry.get("number")
        author = (entry.get("author") or {}).get("login")
        if isinstance(number, int) and isinstance(author, str) and author:
            authors[number] = author
    return authors


def compute_skill_ranking(root: Path, pr_authors: dict[int, str]) -> list[tuple[str, int]]:
    """Count each current canonical skill once, credited to its PR author."""
    present = {
        path for path in _run(["git", "ls-tree", "-r", "--name-only", "HEAD", "skills/"], root).splitlines()
        if path.endswith("/SKILL.md")
    }
    log = _run(
        ["git", "log", "HEAD", "--diff-filter=A", "--format=@@%s", "--name-only",
         "--", "skills/*/SKILL.md"],
        root,
    )
    seen: set[str] = set()
    counts: Counter = Counter()
    subject: str | None = None
    for line in log.splitlines():
        if line.startswith("@@"):
            subject = line[2:]
            continue
        if not line.endswith("/SKILL.md") or line not in present or line in seen:
            continue
        seen.add(line)
        match = PR_NUMBER_PATTERN.search(subject or "")
        if not match:
            continue
        login = pr_authors.get(int(match.group(1)))
        if login and login not in EXCLUDED_LOGINS:
            counts[login] += 1
    return counts.most_common(TOP_N)


def _avatar(login: str) -> str:
    return (
        f'<a href="https://github.com/{login}">'
        f'<img src="https://github.com/{login}.png?size=48" width="32" height="32" alt="" /></a> '
        f'[@{login}](https://github.com/{login})'
    )


def render_table(rows: list[tuple[str, int]], value_heading: str) -> str:
    lines = [
        "| # | Contributor | " + value_heading + " |",
        "|---:|---|---:|",
    ]
    for index, (login, value) in enumerate(rows, start=1):
        lines.append(f"| {index} | {_avatar(login)} | {value} |")
    return "\n".join(lines)


def render_section(commit_rows: list[tuple[str, int]], skill_rows: list[tuple[str, int]]) -> str:
    commit_rows = [row for row in commit_rows if row[0] not in EXCLUDED_LOGINS]
    skill_rows = [row for row in skill_rows if row[0] not in EXCLUDED_LOGINS]
    return f"""{TOP_CONTRIBUTORS_HEADING}

Thanks to everyone who has helped build this project\u2014especially the contributors below.

<table>
<tr>
<td valign="top" width="50%">

### Most Commits

Contributors ranked by the number of commits.

{render_table(commit_rows, "Commits")}

</td>
<td valign="top" width="50%">

### Most Skills Added

Contributors ranked by the number of skills they added.

{render_table(skill_rows, "Skills added")}

</td>
</tr>
</table>

"""


def update_top_contributors_section(
    content: str,
    commit_rows: list[tuple[str, int]],
    skill_rows: list[tuple[str, int]],
) -> str:
    if TOP_CONTRIBUTORS_HEADING not in content or NEXT_SECTION_HEADING not in content:
        raise ValueError("README.md does not contain the expected Top Contributors section structure.")
    start = content.index(TOP_CONTRIBUTORS_HEADING)
    end = content.index(NEXT_SECTION_HEADING, start)
    if end < start:
        raise ValueError("README.md Top Contributors section is out of order.")
    return f"{content[:start]}{render_section(commit_rows, skill_rows)}{content[end:]}"


def sync_top_contributors(base_dir: str | Path, dry_run: bool = False) -> bool:
    root = Path(base_dir)
    metadata = load_metadata(str(root))
    repo = metadata["repo"]
    try:
        commit_rows = fetch_commit_ranking(repo)
        pr_authors = fetch_pull_request_authors(repo)
    except GithubUnavailable as error:
        print(f"[top-contributors] skipped; GitHub API unavailable ({error})")
        return False

    skill_rows = compute_skill_ranking(root, pr_authors)
    if not commit_rows or not skill_rows:
        print("[top-contributors] skipped; ranking came back empty")
        return False

    readme_path = root / "README.md"
    original = readme_path.read_text(encoding="utf-8")
    updated = update_top_contributors_section(original, commit_rows, skill_rows)
    if updated == original:
        return False
    if dry_run:
        print("[dry-run] Would update Top Contributors in README.md")
        return True
    readme_path.write_text(updated, encoding="utf-8", newline="\n")
    print("✅ Updated Top Contributors in README.md")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synchronize the README Top Contributors rankings.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview ranking changes without writing files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sync_top_contributors(find_repo_root(__file__), dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
