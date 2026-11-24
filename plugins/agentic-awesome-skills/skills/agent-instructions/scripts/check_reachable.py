#!/usr/bin/env python3
"""check_reachable.py — find instruction and doc files no session can reach.

A rule an agent never opens is not a rule it follows. This walks the chain an
agent walks: it starts at the entry files every session loads (AGENTS.md,
CLAUDE.md), follows every reference to another file — markdown links, paths in
backticks, `@path` imports — and reports the markdown files under the scope
directories that no chain reaches.

    python <skill dir>/scripts/check_reachable.py <repo>
    python <skill dir>/scripts/check_reachable.py <repo> --scope docs --scope .claude/skills
    python <skill dir>/scripts/check_reachable.py <repo> --exclude "knowledge/raw/**"
    python <skill dir>/scripts/check_reachable.py <repo> --entry AGENTS.md --why docs/TESTS.md

Defaults: entries are AGENTS.md and CLAUDE.md at the repository root (whichever
exist); scope is every existing one of docs/ and knowledge/. A reference to a
directory reaches its README.md, SKILL.md or INDEX.md, or, when it has none, every
.md file directly inside it. --exclude drops data files (fixtures, raw captures)
from the scope by glob, relative to the root. Exit 0 when every file in
scope is reachable, 1 when some are not, 2 on a usage error. Standard library
only; it reads files and writes nothing.
"""
import argparse
import re
import sys
from collections import deque
from fnmatch import fnmatch
from pathlib import Path

LINK = re.compile(r"\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")       # [text](path "title")
TICK = re.compile(r"`([^`\n]+)`")                             # `path § section`
IMPORT = re.compile(r"(?:^|\s)@([\w./-]+\.md)\b", re.M)       # @AGENTS.md
INDEX_NAMES = ("README.md", "SKILL.md", "INDEX.md", "index.md")
SKIP_DIRS = {".git", "node_modules", ".next", "dist", "build", ".venv", "venv"}


def candidates(text):
    """Every string in a markdown file that might name another file."""
    for m in LINK.finditer(text):
        yield m.group(1)
    for m in TICK.finditer(text):
        token = m.group(1).strip().split()[0] if m.group(1).strip() else ""
        yield token
    for m in IMPORT.finditer(text):
        yield m.group(1)


def resolve(raw, here, root):
    """Resolve one reference to existing files, or nothing."""
    ref = raw.split("#", 1)[0].split("?", 1)[0].strip().strip(",;:.)(\"'")
    if not ref or "://" in ref or ref.startswith("mailto:") or "<" in ref or "*" in ref:
        return []
    if ref.startswith("/"):
        ref = ref.lstrip("/")
        bases = [root]
    else:
        bases = [here, root]
    out = []
    for base in bases:
        try:
            target = (base / ref).resolve()
        except (OSError, ValueError):
            continue
        if root not in target.parents and target != root:
            continue
        if target.is_file():
            out.append(target)
            break
        if target.is_dir():
            index = [target / n for n in INDEX_NAMES if (target / n).is_file()]
            out.extend(index or sorted(target.glob("*.md")))
            break
    return out


def walk(root, entries):
    """Breadth-first over references; returns {file: the file that reached it}."""
    reached = {e: None for e in entries}
    queue = deque(entries)
    while queue:
        current = queue.popleft()
        if current.suffix.lower() != ".md":
            continue
        try:
            text = current.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for raw in candidates(text):
            for target in resolve(raw, current.parent, root):
                if target not in reached:
                    reached[target] = current
                    queue.append(target)
    return reached


def in_scope(root, scopes, excludes):
    files = []
    for scope in scopes:
        base = (root / scope).resolve()
        if not base.exists():
            continue
        for path in base.rglob("*.md"):
            rel = path.relative_to(root)
            if any(part in SKIP_DIRS for part in rel.parts):
                continue
            if any(rel.match(pattern) or fnmatch(rel.as_posix(), pattern) for pattern in excludes):
                continue
            files.append(path.resolve())
    return sorted(set(files))


def chain(file, reached, root):
    steps = []
    while file is not None:
        steps.append(file.relative_to(root).as_posix())
        file = reached.get(file)
    return " <- ".join(steps)


def main():
    ap = argparse.ArgumentParser(description="Report markdown files no entry file reaches.")
    ap.add_argument("repo", help="repository root")
    ap.add_argument("--entry", action="append", help="entry file, relative to the root (repeatable)")
    ap.add_argument("--scope", action="append", help="directory whose .md files must be reachable (repeatable)")
    ap.add_argument("--exclude", action="append", default=[], help="glob of files to leave out of the scope (repeatable)")
    ap.add_argument("--why", help="print the chain that reaches this file, then exit")
    args = ap.parse_args()

    root = Path(args.repo).resolve()
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        return 2
    names = args.entry or ["AGENTS.md", "CLAUDE.md"]
    entries = [(root / n).resolve() for n in names if (root / n).is_file()]
    if not entries:
        print(f"no entry file found among {names} in {root}", file=sys.stderr)
        return 2
    reached = walk(root, entries)

    if args.why:
        target = (root / args.why).resolve()
        if target in reached:
            print(chain(target, reached, root))
            return 0
        print(f"{args.why}: not reached from {', '.join(names)}")
        return 1

    scopes = args.scope or [s for s in ("docs", "knowledge") if (root / s).is_dir()]
    if not scopes:
        print("no scope: pass --scope <dir> (no docs/ or knowledge/ here)", file=sys.stderr)
        return 2
    files = in_scope(root, scopes, args.exclude)
    orphans = [f for f in files if f not in reached]
    print(f"entries: {', '.join(e.relative_to(root).as_posix() for e in entries)}")
    print(f"scope: {', '.join(scopes)} - {len(files)} files, {len(files) - len(orphans)} reachable, {len(orphans)} not")
    for f in orphans:
        print(f"  unreachable: {f.relative_to(root).as_posix()}")
    if orphans:
        print("\nEach one needs a reference from the file an agent has open at the moment the rule applies -")
        print("a router row in the entry file, or a link from the entry file's chain - or it is proposed to the owner for retiring.")
    return 1 if orphans else 0


if __name__ == "__main__":
    sys.exit(main())
