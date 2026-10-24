#!/usr/bin/env python3
"""slideops check: report which slides cite code that has changed since the deck was built.

A deck rots the moment it is exported. This turns that from a hope into a check: every
quoted snippet carries the file and line range it came from, plus a hash of those source
lines at build time. This re-reads the repository at its current state and tells you,
slide by slide, what is still true.

    python3 check.py <deck.html|dir> [more...] [--repo PATH] [--suggest] [--json]
                     [--quiet] [--exit-zero]

Deterministic and dependency-free: standard library only, no model, no network, no tokens.
Running it costs milliseconds, so run it often. Spending tokens is a separate, later
decision: `--json` hands an agent the complete repair brief (what changed, the diff, the
commits that did it, the corrected citation) so a refresh reads only the slides that
actually drifted.

Statuses:
    CURRENT       normalized decoded text lines match the recorded hash prefix
    MOVED         the same lines still exist, at different line numbers (update data-src)
    CHANGED       the cited lines differ; the slide may now be wrong
    MISSING       the file is gone
    UNVERIFIED    the citation has no hash, or the build commit is not in this repo

Exit codes: 0 nothing stale, 1 stale citations found, 2 a deck or the repo could not be
read. `--exit-zero` forces 0 whenever the run completed, for report-only CI jobs that
should annotate a pull request without failing it.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import html
from html.parser import HTMLParser
import json
import re
import subprocess
import sys
from collections.abc import Sequence
from dataclasses import dataclass, field
from pathlib import Path

CITATION_RE = re.compile(
    r'<[a-zA-Z][^<>]*?data-src="(?P<src>[^"]+)"'
    r'(?:[^<>]*?data-sha256="(?P<sha>[0-9a-f]{6,64})")?[^<>]*>',
    re.I | re.S,
)
BUILD_META_RE = re.compile(r'<meta name="slideops-build" content="(?P<content>[^"]*)"', re.I)
SLIDE_COMMENT_RE = re.compile(r"<!--\s*(?P<index>\d+):\s*(?P<label>.+?)\s*-->")
HASH_LENGTH = 12
MAX_COMMITS = 10


@dataclass
class Citation:
    src: str
    path: str
    start: int | None
    end: int | None
    recorded_sha: str | None
    slide_index: int | None
    slide_label: str
    status: str = "UNVERIFIED"
    detail: str = ""
    new_range: tuple[int, int] | None = None
    diff: list[str] = field(default_factory=list)
    current_lines: list[str] = field(default_factory=list)
    commits: list[str] = field(default_factory=list)

    @property
    def display_slide(self) -> str:
        return str(self.slide_index + 1) if self.slide_index is not None else "?"

    @property
    def is_stale(self) -> bool:
        return self.status in {"CHANGED", "MISSING", "MOVED"}

    @property
    def suggested_src(self) -> str:
        if self.new_range:
            return f"{self.path}:{self.new_range[0]}-{self.new_range[1]}"
        return self.src


@dataclass
class DeckReport:
    """One deck's worth of results, so a run can span a whole docs/slides/ folder."""

    deck: Path
    build: dict[str, str] = field(default_factory=dict)
    citations: list[Citation] = field(default_factory=list)
    error: str = ""

    @property
    def stale(self) -> list[Citation]:
        return [c for c in self.citations if c.is_stale]

    @property
    def unverified(self) -> list[Citation]:
        return [c for c in self.citations if c.status == "UNVERIFIED"]


def hash_lines(lines: Sequence[str]) -> str:
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()[:HASH_LENGTH]


def parse_src(src: str) -> tuple[str, int | None, int | None]:
    """'path/to/file.py:40-58' -> ('path/to/file.py', 40, 58). Range is optional."""
    match = re.match(r"^(?P<path>.+?)(?::(?P<start>\d+)(?:-(?P<end>\d+))?)?$", src.strip())
    if not match:
        return src.strip(), None, None
    path = match.group("path")
    start = int(match.group("start")) if match.group("start") else None
    end = int(match.group("end")) if match.group("end") else start
    return path, start, end


def slice_lines(text: str, start: int | None, end: int | None) -> list[str] | None:
    lines = text.splitlines()
    if start is None:
        return lines
    if start < 1 or end is None or end > len(lines) or start > end:
        return None
    return lines[start - 1 : end]


def git(repo: Path, *args: str) -> str | None:
    result = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, timeout=30)
    return result.stdout if result.returncode == 0 else None


def find_citations(deck_html: str) -> list[Citation]:
    """Parse real HTML attributes in either order; ignore commented-out examples."""
    class CitationParser(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.index = None
            self.label = ""
            self.citations = []

        def handle_comment(self, data):
            match = re.fullmatch(r"\s*(\d+):\s*(.+?)\s*", data)
            if match:
                self.index, self.label = int(match[1]), match[2]

        def handle_starttag(self, tag, attrs):
            values = dict(attrs)
            src = values.get("data-src")
            if src is None:
                return
            path, start, end = parse_src(src)
            sha = values.get("data-sha256") or ""
            sha = sha.lower() if re.fullmatch(r"[0-9a-fA-F]{12,64}", sha) else None
            self.citations.append(Citation(src=src, path=path, start=start, end=end,
                recorded_sha=sha, slide_index=self.index, slide_label=self.label))

        handle_startendtag = handle_starttag

    parser = CitationParser()
    parser.feed(deck_html)
    return parser.citations


def locate_moved(current_text: str, original: list[str]) -> tuple[int, int] | None:
    """If the cited block still exists verbatim elsewhere in the file, find where."""
    current = current_text.splitlines()
    if not original or len(original) > len(current):
        return None
    first = original[0]
    for offset, line in enumerate(current):
        if line == first and current[offset : offset + len(original)] == original:
            return offset + 1, offset + len(original)
    return None


def commits_since(repo: Path, path: str, build_commit: str | None) -> list[str]:
    """The commits that touched this file since the deck was built, newest first.

    This is the 'why' a diff cannot give you: a rename reads very differently from a
    behaviour change, and the subject line is usually enough to tell them apart before
    anyone reads a single line of code.
    """
    if not build_commit:
        return []
    log = git(repo, "log", "--oneline", f"-{MAX_COMMITS}", f"{build_commit}..HEAD", "--", path)
    if not log:
        return []
    return [line.strip() for line in log.splitlines() if line.strip()]


def check_citation(citation: Citation, repo: Path, build_commit: str | None) -> None:
    root = repo.resolve()
    candidate = Path(citation.path)
    file_path = root / candidate
    sensitive = {'.git', '.env', '.npmrc', '.pypirc', '.ssh', '.aws', '.azure'}
    if (candidate.is_absolute() or '..' in candidate.parts
            or any(part in sensitive or part.startswith('.env.') for part in candidate.parts)
            or not file_path.resolve().is_relative_to(root)
            or any((root.joinpath(*candidate.parts[:i])).is_symlink() for i in range(1, len(candidate.parts) + 1))
            or not git(root, 'ls-files', '--error-unmatch', '--', citation.path)):
        citation.status = "UNVERIFIED"
        citation.detail = "citation source is outside approved tracked repository files"
        return
    if not file_path.is_file():
        citation.status = "MISSING"
        citation.detail = "file no longer exists"
        citation.commits = commits_since(repo, citation.path, build_commit)
        return

    current_text = file_path.read_text(errors="replace")
    current = slice_lines(current_text, citation.start, citation.end)
    if current is None:
        citation.status = "CHANGED"
        citation.detail = f"file is now {len(current_text.splitlines())} lines; cited range is past the end"
        citation.commits = commits_since(repo, citation.path, build_commit)
        return

    citation.current_lines = current
    if not citation.recorded_sha:
        citation.status = "UNVERIFIED"
        citation.detail = "no data-sha256 recorded at build time"
        return

    if hash_lines(current).startswith(citation.recorded_sha[:HASH_LENGTH]):
        citation.status = "CURRENT"
        return

    original: list[str] | None = None
    if build_commit:
        blob = git(repo, "show", f"{build_commit}:{citation.path}")
        if blob is not None:
            original = slice_lines(blob, citation.start, citation.end)

    citation.commits = commits_since(repo, citation.path, build_commit)

    if original is not None:
        moved_to = locate_moved(current_text, original)
        if moved_to and hash_lines(original) == citation.recorded_sha[:HASH_LENGTH]:
            citation.status = "MOVED"
            citation.new_range = moved_to
            citation.current_lines = original
            citation.detail = f"same content, now at lines {moved_to[0]}-{moved_to[1]}"
            return
        citation.status = "CHANGED"
        citation.diff = list(
            difflib.unified_diff(
                original, current, fromfile=f"{citation.src} @ build", tofile=f"{citation.src} @ now", lineterm="", n=1
            )
        )
        changed = sum(
            1 for line in citation.diff if line.startswith(("+", "-")) and not line.startswith(("+++", "---"))
        )
        citation.detail = f"{changed} line(s) differ"
    else:
        citation.status = "CHANGED"
        citation.detail = "content differs (build commit unavailable, cannot diff)"


def parse_build_meta(deck_html: str) -> dict[str, str]:
    build: dict[str, str] = {}
    meta = BUILD_META_RE.search(deck_html)
    if meta:
        for part in meta.group("content").split():
            key, _, value = part.partition("=")
            if value:
                build[key] = value
    return build


def check_deck(deck: Path, repo: Path) -> DeckReport:
    report = DeckReport(deck=deck)
    try:
        deck_html = deck.read_text(errors="replace")
    except OSError as exc:
        report.error = f"could not read: {exc}"
        return report

    report.build = parse_build_meta(deck_html)
    build_commit = report.build.get("commit")
    if build_commit and git(repo, "cat-file", "-e", f"{build_commit}^{{commit}}") is None:
        build_commit = None

    report.citations = find_citations(deck_html)
    if not report.citations:
        report.error = "No verifiable citations found"
    for citation in report.citations:
        check_citation(citation, repo, build_commit)
    return report


def looks_like_deck(path: Path) -> bool:
    """Used only when expanding a directory, so pointing at docs/ does not flood output."""
    try:
        head = path.read_text(errors="replace")
    except OSError:
        return False
    return bool(BUILD_META_RE.search(head) or find_citations(head))


def collect_decks(targets: list[Path]) -> tuple[list[Path], list[str]]:
    """Expand files and directories into a deduplicated, sorted list of decks."""
    decks: list[Path] = []
    problems: list[str] = []
    for target in targets:
        if target.is_dir():
            found = [p for p in sorted(target.rglob("*.html")) if looks_like_deck(p)]
            if not found:
                problems.append(f"{target}: no decks with citations found")
            decks.extend(found)
        elif target.is_file():
            decks.append(target)
        else:
            problems.append(f"{target}: not found")

    seen: set[Path] = set()
    unique: list[Path] = []
    for deck in decks:
        resolved = deck.resolve()
        if resolved not in seen:
            seen.add(resolved)
            unique.append(deck)
    return unique, problems


def print_deck(report: DeckReport, repo: Path, quiet: bool, multi: bool) -> None:
    shown = report.stale + report.unverified if quiet else report.citations
    if quiet and not shown:
        return

    if multi:
        print(f"{report.deck}")
    else:
        print(f"Deck: {report.deck.name}")
        if report.build:
            print("Built: " + " ".join(f"{k}={v}" for k, v in report.build.items()))
        head = (git(repo, "rev-parse", "--short", "HEAD") or "unknown").strip()
        print(f"Repo: {repo} @ {head}")
        print()

    if report.error:
        print(f"  {report.error}")
        return

    if not report.citations:
        print("  No citations found in this deck.")
        if not multi:
            print("  Add data-src (and data-sha256) to quoted snippets so freshness can be checked;")
            print("  see references/freshness.md.")
        return

    width = max((len(c.src) for c in shown), default=0)
    for citation in shown:
        line = (
            f"  slide {citation.display_slide:>3}  {citation.slide_label:<14} "
            f"{citation.src:<{width}}  {citation.status:<10} {citation.detail}"
        )
        print(line.rstrip())
    if multi:
        print()


def print_suggestions(report: DeckReport, multi: bool) -> None:
    for citation in report.stale:
        print()
        print("=" * 78)
        where = f"{report.deck}: " if multi else ""
        headline = f"slide {citation.display_slide} ({citation.slide_label})"
        print(f"{where}{headline} — {citation.src} — {citation.status}")
        print("=" * 78)
        if citation.commits:
            print("Commits that touched it since the deck was built:")
            for commit in citation.commits:
                print(f"  {commit}")
            print()
        if citation.status == "MISSING":
            print("The file is gone. Either the slide is obsolete, or the code moved:")
            print(f"  git log --diff-filter=D -- {citation.path}")
            continue
        if citation.status == "MOVED" and citation.new_range:
            start, end = citation.new_range
            print("Content is unchanged; only the line numbers moved. Update the citation:")
            print(f'  data-src="{citation.path}:{start}-{end}"')
            print(f'  data-sha256="{hash_lines(citation.current_lines)}"')
            continue
        if citation.diff:
            print("What changed:")
            for line in citation.diff:
                print(f"  {line}")
            print()
        print("Current source, HTML-escaped and ready to paste into the <pre>:")
        print(f'  data-src="{citation.src}" data-sha256="{hash_lines(citation.current_lines)}"')
        print()
        for line in citation.current_lines:
            print(f"  {html.escape(line)}")
        longest = max((len(line) for line in citation.current_lines), default=0)
        if longest > 65:
            print()
            print(
                f"  Note: longest line is {longest} chars. Half-width columns fit ~65 and"
                " full-width ~95, so this may need a full-width pre or a different pattern."
            )


def citation_json(citation: Citation) -> dict[str, object]:
    """Stale citations carry the full repair brief; current ones stay one line each.

    An agent asked to refresh a deck should need this payload and nothing else: what
    drifted, how, who changed it, and the exact attributes to write back.
    """
    payload: dict[str, object] = {
        "slide": citation.display_slide,
        "label": citation.slide_label,
        "src": citation.src,
        "status": citation.status,
        "detail": citation.detail,
    }
    if not citation.is_stale:
        return payload
    payload.update(
        {
            "suggested_src": citation.suggested_src,
            "suggested_sha256": hash_lines(citation.current_lines) if citation.current_lines else None,
            "new_range": list(citation.new_range) if citation.new_range else None,
            "diff": citation.diff,
            "commits": citation.commits,
            "current_source": citation.current_lines,
        }
    )
    return payload


def emit_json(reports: list[DeckReport], repo: Path) -> None:
    head = (git(repo, "rev-parse", "--short", "HEAD") or "unknown").strip()
    print(
        json.dumps(
            {
                "repo": str(repo),
                "head": head,
                "checked": len(reports),
                "stale": sum(len(r.stale) for r in reports),
                "unverified": sum(len(r.unverified) for r in reports),
                "decks": [
                    {
                        "deck": str(r.deck),
                        "build": r.build,
                        "error": r.error or None,
                        "stale": len(r.stale),
                        "citations": [citation_json(c) for c in r.citations],
                    }
                    for r in reports
                ],
            },
            indent=2,
        )
    )


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Report slides whose cited code has changed.")
    parser.add_argument("targets", type=Path, nargs="+", help="deck HTML files, or directories to sweep")
    parser.add_argument("--repo", type=Path, default=Path(), help="repository the decks cite (default: cwd)")
    parser.add_argument("--suggest", action="store_true", help="print current source and updated citations")
    parser.add_argument("--json", action="store_true", help="machine-readable repair brief, for CI or an agent")
    parser.add_argument("--quiet", action="store_true", help="list only stale citations; silent when all are current")
    parser.add_argument("--exit-zero", action="store_true", help="always exit 0 when the run completed (report-only)")
    args = parser.parse_args(argv[1:])

    repo: Path = args.repo.resolve()
    if not repo.is_dir():
        print(f"Repo not found: {repo}", file=sys.stderr)
        return 2

    decks, problems = collect_decks(args.targets)
    for problem in problems:
        print(problem, file=sys.stderr)
    if not decks:
        return 2

    reports = [check_deck(deck, repo) for deck in decks]
    multi = len(reports) > 1

    if args.json:
        emit_json(reports, repo)
    else:
        for report in reports:
            print_deck(report, repo, args.quiet, multi)

        total = sum(len(r.citations) for r in reports)
        stale = sum(len(r.stale) for r in reports)
        unverified = sum(len(r.unverified) for r in reports)
        if not (args.quiet and not stale):
            if not multi:
                print()
            deck_count = f" across {len(reports)} decks" if multi else ""
            print(
                f"{total - stale - unverified} current, {stale} stale"
                + (f", {unverified} unverified" if unverified else "")
                + f", {total} cited in total{deck_count}."
            )
            if stale and not args.suggest:
                print("Run again with --suggest for the current source and a ready-to-paste snippet,")
                print("or --json to hand an agent the whole repair brief.")

        if args.suggest:
            for report in reports:
                print_suggestions(report, multi)

    if problems or any(r.error for r in reports):
        return 2
    if args.exit_zero:
        return 0
    return 1 if any(r.stale or r.unverified for r in reports) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
