#!/usr/bin/env python3
"""`lore history` — list git commits related to an entry, file, or scope.

Usage:
    lore history <entry-id>
    lore history <file-path>
    lore history --scope=<name>
    lore history --since=<YYYY-MM-DD>
    lore history --json

See references/history-command.md for the full specification.
"""
import re
import subprocess
import sys
from pathlib import Path
import json as _json  # standard library; aliased to avoid clashing with future vars


# Entry ID pattern: LAYER-YYYY-MM-DD-xxxx (4 hex chars)
ENTRY_ID_RE = re.compile(r"^[A-Z]+-\d{4}-\d{2}-\d{2}-[a-f0-9]{4}$")


def parse_arg(arg: str):
    """Dispatch the first positional argument to entry / file / scope form.

    Returns a dict {"form": "entry"|"file"|"scope", "value": str}, or None
    if the argument matches none of the recognized patterns.
    """
    if not arg:
        return None
    if arg.startswith("--scope="):
        return {"form": "scope", "value": arg.split("=", 1)[1]}
    if ENTRY_ID_RE.match(arg):
        return {"form": "entry", "value": arg}
    if "/" in arg or arg.startswith("."):
        return {"form": "file", "value": arg}
    return None


def find_entry(entries, entry_id):
    """Look up an entry by ID in the list from list_entries.py --json.

    Returns the entry dict, or None if not found.
    """
    for e in entries:
        if e.get("id") == entry_id:
            return e
    return None


def extract_added_date(tags):
    """Return the value of the 'added' tag, or None if absent.

    The entry dict's `tags` field is {name: value, ...} as produced
    by list_entries.py.
    """
    if not tags:
        return None
    return tags.get("added")


# Match a backtick-quoted path inside an entry's text. The path must
# contain at least one slash OR start with a dot OR end with a common
# code extension, to avoid false positives like `Zustand`.
BACKTICK_PATH_RE = re.compile(
    r"`([^\s`]+\.[a-zA-Z0-9]{1,8}(?:\.[a-zA-Z0-9]{1,8})*"
    r"|[^\s`]+/[^\s`]+"
    r"|\.[a-zA-Z][^\s`]*)`"
)


def resolve_code_file(entry):
    """Decide which file path to git-log for this entry.

    Priority:
      1. First backtick-quoted path in entry.text (looks like a file).
      2. Scope directory at project root (e.g. "frontend" for scope "frontend").
      3. "." for the _global scope (project root).

    The path returned is relative to the project root. git log handles
    "." to mean the whole repo.
    """
    if entry.get("text"):
        m = BACKTICK_PATH_RE.search(entry["text"])
        if m:
            return m.group(1)
    scope = entry.get("scope", "_global")
    if scope == "_global":
        return "."
    return scope


# Single-line per commit. The trailing %s for body is multi-line content
# that we capture separately (not in the delimited format string) by
# running a second pass with a different format. For v1 we use a simple
# format and parse body via a follow-up `git show` only if needed.
#
# To keep parsing simple, we use a delimiter unlikely to appear in real
# commit metadata: ASCII Unit Separator (\x1f).
COMMIT_DELIM = "\x1f"

# git log format: hash\x1fauthor\x1fdate(iso)\x1fsubject
# We use %x1f (the same delimiter) inline so the format string is portable.
# The body is fetched separately via the second invocation below.
FORMAT_STRING = "%H%x1f%an%x1f%ai%x1f%s"


def run_git_log(project_root, since, code_file, n=None):
    """Run `git log` and return a list of commit dicts.

    Args:
        project_root: Path to the git repo root.
        since: ISO date string, or None for full history.
        code_file: Path relative to project_root to filter by.
        n: Optional int cap on number of commits.

    Returns:
        List of dicts as produced by parse_commit_line + body-fetch.

    Raises:
        RuntimeError: if git exits non-zero or is missing.
    """
    cmd = [
        "git",
        "-C", str(project_root),
        "log",
        f"--pretty=format:{FORMAT_STRING}",
    ]
    if since:
        cmd.append(f"--since={since}")
    if n is not None:
        cmd.append(f"-n{n}")
    cmd.extend(["--", code_file])

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"git executable not found on PATH: {exc}")

    if proc.returncode != 0:
        raise RuntimeError(f"git log failed: {proc.stderr.strip()}")

    commits = []
    for line in proc.stdout.splitlines():
        if not line:
            continue
        parsed = parse_commit_line(line)
        if parsed is None:
            continue
        parsed["body"] = ""  # filled in by fetch_body if requested later
        commits.append(parsed)
    return commits


def parse_commit_line(line):
    """Parse one delimited git log line. Returns dict or None on malformed input."""
    parts = line.split(COMMIT_DELIM)
    if len(parts) != 4:
        return None
    full_hash, author, date, subject = parts
    if len(full_hash) < 7:
        return None
    return {
        "hash": full_hash,
        "short": full_hash[:7],
        "author": author,
        "date": date[:10],  # take YYYY-MM-DD from full ISO timestamp
        "subject": subject,
        "body": "",  # populated by fetch_commit_body
    }


# Match PR/issue references. Order matters: longer keywords first so
# "Closes" doesn't get eaten by "#NNN" alone. We require word boundary
# (or start of string) before the keyword to avoid matching substrings
# like "address#N" mid-word.
REFS_RE = re.compile(
    r"(?:\(|\b(?:Closes|Refs|Fixes|Resolves)\s+)"
    r"(#\d+)",
    re.IGNORECASE,
)


def extract_refs(message):
    """Return a list of PR/issue references found in a commit message.

    Each item is either "#NNN" (from parens form) or "Keyword #NNN"
    (from Closes/Refs/Fixes/Resolves form). Duplicates are removed
    in order of appearance.
    """
    matches = []
    seen = set()
    for m in REFS_RE.finditer(message):
        prefix = m.group(0).split("#")[0]
        ref = "#" + m.group(1)[1:]  # normalize to "#NNN"
        if ref in seen:
            continue
        seen.add(ref)
        if prefix.startswith("("):
            matches.append(ref)
        else:
            matches.append(f"{prefix.strip()} {ref}")
    return matches


def truncate_body(body, max_lines=3):
    """Trim a multi-line string to at most `max_lines`, stripping blank tails.

    Used to keep commit bodies short in the Markdown output. The subject
    is already shown separately; the body is supplementary context.
    """
    lines = body.splitlines()
    trimmed = lines[:max_lines]
    while trimmed and not trimmed[-1].strip():
        trimmed.pop()
    return "\n".join(trimmed)


def fetch_commit_body(project_root, commit_hash):
    """Fetch the full commit message (subject + body) via `git show`.

    Returns a string with the subject as the first line and the body
    (if any) following a blank line. Trailing blank lines are removed.
    """
    cmd = [
        "git", "-C", str(project_root),
        "show", "-s", "--format=%B", commit_hash,
    ]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True,
            encoding="utf-8", errors="replace", check=False,
        )
    except FileNotFoundError:
        return ""
    if proc.returncode != 0:
        return ""
    return proc.stdout.rstrip()


def render_json(meta, commits):
    """Render the JSON output for a `lore history` invocation.

    Output matches the schema documented in the spec.
    """
    payload = {
        "entry_id": meta["entry_id"],
        "lore_file": meta["lore_file"],
        "code_file": meta["code_file"],
        "since": meta["since"],
        "since_source": meta["since_source"],
        "commits": commits,
    }
    return _json.dumps(payload, indent=2, ensure_ascii=False)


def render_markdown(meta, commits):
    """Render the Markdown output for a `lore history` invocation.

    Args:
        meta: dict with keys entry_id, lore_file, code_file, since,
              since_source.
        commits: list of commit dicts (see parse_commit_line + extract_refs).

    Returns:
        Markdown string ready for stdout.
    """
    lines = []
    lines.append(f"# history: [{meta['entry_id']}]")
    lines.append("")
    lines.append(f"> Entry: {meta['lore_file']}")
    since_suffix = " (entry #added date)" if meta.get("since_source") == "entry_added" else ""
    lines.append(f"> Since: {meta['since']}{since_suffix}")
    lines.append(f"> File: {meta['code_file']}")
    lines.append(f"> Commits: {len(commits)} (showing all)")
    lines.append("")

    if not commits:
        return "\n".join(lines) + "\n"

    for c in commits:
        lines.append(f"## {c['short']} ({c['date']}, {c['author']})")
        lines.append(c["subject"])
        if c.get("body"):
            body = truncate_body(c["body"], max_lines=3)
            lines.append(f'  Body: "{body}"')
        if c.get("refs"):
            lines.append(f"  Refs: {', '.join(c['refs'])}")
        lines.append("")

    lines.append("## Suggested next step")
    lines.append("Run `lore sync` to check whether any of these commits")
    lines.append("introduce a [REFINED] candidate for this entry.")
    lines.append("")
    return "\n".join(lines)


# Exit codes per spec section "Error handling".
ERR_USAGE      = 2  # no arg / unrecognized arg (also used by argparse path)
ERR_NO_LORE    = 2  # .lore/ not found
ERR_NO_ENTRY   = 3  # entry ID not in index
ERR_NOT_GIT    = 4  # not a git repository
ERR_NO_GIT     = 5  # git CLI missing
ERR_BAD_SCOPE  = 6  # scope name not in scopes/
ERR_GIT_FAIL   = 7  # git log returned non-zero for other reasons


def die(code, message):
    """Print message to stderr and exit with the given code."""
    print(f"error: {message}", file=sys.stderr)
    sys.exit(code)


def _load_entries_via_subprocess():
    """Run scripts/list_entries.py --json and return the parsed list.

    Mirrors the pattern in find_duplicates.py / find_stale.py.
    Returns [] if no entries.
    """
    here = Path(__file__).resolve().parent
    cmd = [sys.executable, str(here / "list_entries.py"), "--json"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              encoding="utf-8", errors="replace", check=False)
    except FileNotFoundError as exc:
        die(ERR_NO_GIT, f"python executable not found: {exc}")
    if proc.returncode != 0:
        die(ERR_NO_LORE, f"list_entries.py failed: {proc.stderr.strip()}")
    try:
        return _json.loads(proc.stdout)
    except _json.JSONDecodeError as exc:
        die(ERR_NO_LORE, f"list_entries.py returned invalid JSON: {exc}")


def _find_lore_root_or_die():
    """Walk up from CWD to find .lore/. Die with ERR_NO_LORE if not found."""
    p = Path(".").resolve()
    while p != p.parent:
        if (p / ".lore").is_dir():
            return p
        p = p.parent
    die(ERR_NO_LORE, ".lore/ not found. Run 'lore init' first.")


def _build_meta_entry(entry, code_file, since, since_source):
    return {
        "entry_id": entry["id"],
        "lore_file": entry["file"],
        "code_file": code_file,
        "since": since,
        "since_source": since_source,
    }


def _resolve_scope_to_md_files(project_root, scope_name):
    """For scope form: list the (layer_file, md_path) tuples under the scope."""
    scopes_dir = project_root / ".lore" / "scopes" / scope_name
    if not scopes_dir.is_dir():
        available = sorted(
            p.name for p in (project_root / ".lore" / "scopes").iterdir()
            if p.is_dir()
        ) if (project_root / ".lore" / "scopes").is_dir() else []
        available_display = ", ".join(available) if available else "(none)"
        die(ERR_BAD_SCOPE, f"Scope '{scope_name}' not found. Available: {available_display}")
    files = []
    for md in sorted(scopes_dir.glob("*.md")):
        files.append((md.stem, md))
    return files


def _is_git_repo(project_root):
    try:
        proc = subprocess.run(
            ["git", "-C", str(project_root), "rev-parse", "--git-dir"],
            capture_output=True, text=True, check=False,
        )
    except FileNotFoundError:
        die(ERR_NO_GIT, "git executable not found on PATH.")
    return proc.returncode == 0


def _enrich_commits_with_body_and_refs(project_root, commits):
    """For each commit, fetch body and extract refs. Mutates in place."""
    for c in commits:
        msg = fetch_commit_body(project_root, c["hash"])
        if msg:
            # Body is everything after the first line.
            parts = msg.split("\n", 1)
            subject = parts[0]
            body = parts[1].strip() if len(parts) > 1 else ""
            c["subject"] = subject
            c["body"] = truncate_body(body, max_lines=3)
            c["refs"] = extract_refs(msg)


def main():
    args = sys.argv[1:]
    json_mode = "--json" in args
    since_override = None
    for a in args:
        if a.startswith("--since="):
            since_override = a.split("=", 1)[1]

    positional = [a for a in args if a != "--json" and not a.startswith("--since=")]
    if not positional:
        print("usage: lore history <entry-id|file-path|--scope=NAME>",
              file=sys.stderr)
        die(ERR_USAGE, "missing argument")

    parsed = parse_arg(positional[0])
    if parsed is None:
        die(ERR_USAGE, f"unrecognized argument: {positional[0]}")

    project_root = _find_lore_root_or_die()

    if not _is_git_repo(project_root):
        die(ERR_NOT_GIT,
            "Not a git repository. 'lore history' requires git; "
            "use 'lore query' for in-memory answers.")

    if parsed["form"] == "entry":
        entries = _load_entries_via_subprocess()
        entry = find_entry(entries, parsed["value"])
        if entry is None:
            ids = ", ".join(e["id"] for e in entries[:20])
            more = "" if len(entries) <= 20 else f" (and {len(entries)-20} more)"
            die(ERR_NO_ENTRY,
                f"Entry {parsed['value']} not found. Available: {ids}{more}")
        since = since_override or extract_added_date(entry.get("tags", {}))
        if since is None:
            print("warning: entry has no #added tag; using full history",
                  file=sys.stderr)
            since = "1970-01-01"
        code_file = resolve_code_file(entry)
        try:
            commits = run_git_log(project_root, since, code_file)
        except RuntimeError as exc:
            die(ERR_GIT_FAIL, str(exc))
        _enrich_commits_with_body_and_refs(project_root, commits)
        meta = _build_meta_entry(entry, code_file, since, "entry_added")
        out = render_json(meta, commits) if json_mode else render_markdown(meta, commits)
        print(out)
        return

    if parsed["form"] == "file":
        since = since_override or "1970-01-01"
        code_file = parsed["value"]
        try:
            commits = run_git_log(project_root, since, code_file)
        except RuntimeError as exc:
            die(ERR_GIT_FAIL, str(exc))
        _enrich_commits_with_body_and_refs(project_root, commits)
        meta = {
            "entry_id": f"<file:{code_file}>",
            "lore_file": "(direct file query)",
            "code_file": code_file,
            "since": since,
            "since_source": "user_arg" if since_override else "default",
        }
        out = render_json(meta, commits) if json_mode else render_markdown(meta, commits)
        print(out)
        return

    if parsed["form"] == "scope":
        layer_files = _resolve_scope_to_md_files(project_root, parsed["value"])
        for layer_name, md_path in layer_files:
            # For scope form we treat each .md file as a "code file" stand-in:
            # we git log the md file's project-relative path to find commits
            # that touched that lore file. (Useful for tracking lore edits.)
            rel = str(md_path.relative_to(project_root))
            try:
                commits = run_git_log(project_root, "1970-01-01", rel)
            except RuntimeError as exc:
                die(ERR_GIT_FAIL, str(exc))
            _enrich_commits_with_body_and_refs(project_root, commits)
            if json_mode:
                meta = {
                    "entry_id": f"<scope:{parsed['value']}/{layer_name}>",
                    "lore_file": rel,
                    "code_file": rel,
                    "since": "1970-01-01",
                    "since_source": "scope_form",
                }
                print(render_json(meta, commits))
            else:
                print(f"## Scope: {parsed['value']} / {layer_name}")
                print("")
                if not commits:
                    print("(no commits)")
                    print("")
                    continue
                for c in commits:
                    print(f"### {c['short']} ({c['date']}, {c['author']})")
                    print(c["subject"])
                    if c.get("body"):
                        print(f'  Body: "{c["body"]}"')
                    if c.get("refs"):
                        print(f"  Refs: {', '.join(c['refs'])}")
                    print("")
        return


if __name__ == "__main__":
    main()
