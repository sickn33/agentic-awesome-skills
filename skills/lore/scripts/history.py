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
import os as _os
import json as _json  # standard library; aliased to avoid clashing with future vars


# Entry ID pattern: LAYER-YYYY-MM-DD-xxxx (4 hex chars)
ENTRY_ID_RE = re.compile(r"^[A-Z]+-\d{4}-\d{2}-\d{2}-[a-f0-9]{4}$")


# Date-only ISO pattern (YYYY-MM-DD). Used to detect inputs that need
# normalization before being passed to `git log --since=` (see below).
_DATE_ONLY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def normalize_since(value):
    """Normalize a `--since` value to a precise timestamp before git log.

    `git log --since=YYYY-MM-DD` interpretation is version-dependent:
    older git versions parse it as the user's local-timezone midnight,
    newer versions as UTC midnight. A commit made early in the day in
    any timezone can therefore be silently dropped when filtering by a
    same-day `#added` tag.

    Defense: when the input is date-only (no time component), append
    `T00:00:00` so git's date parser treats it as a precise timestamp.
    Strings that already contain a time component (T or space) are
    passed through unchanged. None passes through unchanged.

    Refs: https://git-scm.com/docs/git-log#_date_formats
    """
    if value is None or not isinstance(value, str):
        return value
    if not _DATE_ONLY_RE.match(value):
        return value
    return value + "T00:00:00"


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
        "chain": meta.get("chain"),
        "commits": commits,
    }
    return _json.dumps(payload, indent=2, ensure_ascii=False)


def render_markdown(meta, commits):
    """Render the Markdown output for a `lore history` invocation.

    Args:
        meta: dict with keys entry_id, lore_file, code_file, since,
              since_source, and optionally _chain_entries (raw entry dicts).
        commits: list of commit dicts (see parse_commit_line + extract_refs).

    Returns:
        Markdown string ready for stdout.
    """
    lines = []
    title_suffix = ""
    if meta.get("_chain_entries"):
        title_suffix = " --follow-superseded"
    lines.append(f"# history: [{meta['entry_id']}]{title_suffix}")
    lines.append("")

    chain_entries = meta.get("_chain_entries")
    if chain_entries:
        lines.append("## Chain")
        for idx, e in enumerate(chain_entries, start=1):
            next_link = (
                f"\n   -> superseded-by -> {e.get('replaced_by')}"
                if e.get("replaced_by") else "\n   -> no successor"
            )
            lines.append(
                f"{idx}. [{e['id']}] ({e['file']}) - {e['text']}{next_link}"
            )
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


def walk_supersede_chain(entries_by_id, start_id, max_depth=20):
    """Follow #superseded-by links forward from start_id.

    Returns a list of entry dicts [start, successor1, successor2, ...].
    Stops when an entry has no replaced_by tag, the target is missing,
    or max_depth is reached (cycle protection).

    `entries_by_id` is a dict {id: entry_dict} from list_entries.py --json.
    """
    chain = []
    seen = set()
    current_id = start_id
    for _ in range(max_depth):
        if current_id in seen:
            break  # cycle; don't loop forever
        seen.add(current_id)
        entry = entries_by_id.get(current_id)
        if entry is None:
            break
        chain.append(entry)
        next_id = entry.get("replaced_by")
        if not next_id:
            break
        current_id = next_id
    return chain


def main():
    args = sys.argv[1:]
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:  # Python < 3.7
        pass
    json_mode = "--json" in args
    follow_superseded = "--follow-superseded" in args
    since_override = None
    for a in args:
        if a.startswith("--since="):
            since_override = a.split("=", 1)[1]

    positional = [
        a for a in args
        if a != "--json"
        and a != "--follow-superseded"
        and not a.startswith("--since=")
    ]
    if not positional:
        print(
            "usage: lore history <entry-id|file-path|--scope=NAME> "
            "[--follow-superseded] [--since=YYYY-MM-DD] [--json]",
            file=sys.stderr,
        )
        die(ERR_USAGE, "missing argument")

    parsed = parse_arg(positional[0])
    if parsed is None:
        die(ERR_USAGE, f"unrecognized argument: {positional[0]}")

    if follow_superseded and parsed["form"] != "entry":
        print("[WARN] --follow-superseded only applies to the entry form; ignored.",
              file=sys.stderr)

    project_root = _find_lore_root_or_die()

    if not _is_git_repo(project_root):
        die(ERR_NOT_GIT,
            "Not a git repository. 'lore history' requires git; "
            "use 'lore query' for in-memory answers.")

    if parsed["form"] == "entry":
        entries = _load_entries_via_subprocess()
        entries_by_id = {e["id"]: e for e in entries}
        entry = find_entry(entries, parsed["value"])
        if entry is None:
            ids = ", ".join(e["id"] for e in entries[:20])
            more = "" if len(entries) <= 20 else f" (and {len(entries)-20} more)"
            die(ERR_NO_ENTRY,
                f"Entry {parsed['value']} not found. Available: {ids}{more}")

        chain = ([entry] if not follow_superseded
                 else walk_supersede_chain(entries_by_id, entry["id"]))

        if not follow_superseded:
            since = since_override or extract_added_date(entry.get("tags", {}))
            use_full_history = since is None
            if since is None:
                print("warning: entry has no #added tag; using full history",
                      file=sys.stderr)
                since = "1970-01-01"
            since = normalize_since(since)
            code_file = resolve_code_file(entry)
            try:
                commits = run_git_log(
                    project_root,
                    None if use_full_history else since,
                    code_file,
                )
            except RuntimeError as exc:
                die(ERR_GIT_FAIL, str(exc))
            _enrich_commits_with_body_and_refs(project_root, commits)
            since_source = "user_arg" if since_override else "entry_added"
            meta = _build_meta_entry(entry, code_file, since, since_source)
            meta["chain"] = None
            meta["_chain_entries"] = None
            out = render_json(meta, commits) if json_mode else render_markdown(meta, commits)
            print(out)
            return

        # --follow-superseded: iterate over the entire chain and collect
        # per-entry logs. Each successor may point at a different file/date.
        per_entry = []
        for idx, e in enumerate(chain):
            if idx == 0 and since_override is not None:
                e_since_raw = since_override
                e_since_source = "user_arg"
            else:
                e_since_raw = extract_added_date(e.get("tags", {}))
                use_full_history = e_since_raw is None
                if e_since_raw is None:
                    print(f"warning: entry {e['id']} has no #added tag; using full history",
                          file=sys.stderr)
                    e_since_raw = "1970-01-01"
                e_since_source = "entry_added"
            if idx == 0 and since_override is not None:
                use_full_history = False
            e_since = normalize_since(e_since_raw)
            e_code_file = resolve_code_file(e)
            try:
                e_commits = run_git_log(
                    project_root,
                    None if use_full_history else e_since,
                    e_code_file,
                )
            except RuntimeError as exc:
                die(ERR_GIT_FAIL, str(exc))
            _enrich_commits_with_body_and_refs(project_root, e_commits)
            per_entry.append((e, e_since, e_code_file, e_since_source, e_commits))

        if json_mode:
            chain_meta = [
                {
                    "entry_id": e["id"],
                    "lore_file": e["file"],
                    "code_file": cf,
                    "since": s,
                }
                for (e, s, cf, _, _) in per_entry
            ]
            results = [
                {
                    "entry_id": e["id"],
                    "lore_file": e["file"],
                    "code_file": cf,
                    "since": s,
                    "since_source": ss,
                    "commits": commits,
                }
                for (e, s, cf, ss, commits) in per_entry
            ]
            # Top-level keeps first entry's fields for backward compat
            first_e, first_since, first_cf, first_ss, first_commits = per_entry[0]
            payload = {
                "entry_id": first_e["id"],
                "lore_file": first_e["file"],
                "code_file": first_cf,
                "since": first_since,
                "since_source": first_ss,
                "chain": chain_meta,
                "commits": first_commits,
                "results": results,
            }
            # Preserve _chain_entries style for any downstream that expects it
            payload["_chain_entries"] = None
            print(_json.dumps(payload, indent=2, ensure_ascii=False))
            return

        # Markdown: Chain section then per-entry blocks
        out_lines = []
        out_lines.append(f"# history: [{chain[0]['id']}] --follow-superseded")
        out_lines.append("")
        out_lines.append("## Chain")
        for idx, (e, _, _, _, _) in enumerate(per_entry, start=1):
            next_link = (
                f"\n   -> superseded-by -> {e.get('replaced_by')}"
                if e.get("replaced_by") else "\n   -> no successor"
            )
            out_lines.append(
                f"{idx}. [{e['id']}] ({e['file']}) - {e['text']}{next_link}"
            )
        out_lines.append("")
        for (e, e_since, e_code_file, e_since_source, e_commits) in per_entry:
            meta = _build_meta_entry(e, e_code_file, e_since, e_since_source)
            meta["_chain_entries"] = None
            # Render each entry's block without re-adding the Chain header
            block = render_markdown(meta, e_commits)
            # render_markdown starts with "# history: [id]" — keep it, but
            # the top already has the --follow-superseded title.
            out_lines.append(block.rstrip())
            out_lines.append("")
        print("\n".join(out_lines).rstrip() + "\n")
        return

    if parsed["form"] == "file":
        since = since_override or "1970-01-01"
        since = normalize_since(since)
        code_file = parsed["value"]
        try:
            commits = run_git_log(
                project_root,
                since if since_override else None,
                code_file,
            )
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
        scope_payloads = []  # only used when json_mode is True
        scope_since = normalize_since(since_override or "1970-01-01")
        for layer_name, md_path in layer_files:
            # For scope form we treat each .md file as a "code file" stand-in:
            # we git log the md file's project-relative path to find commits
            # that touched that lore file. (Useful for tracking lore edits.)
            rel = str(md_path.relative_to(project_root)).replace(
                _os.sep, "/"
            )
            try:
                commits = run_git_log(
                    project_root,
                    scope_since if since_override else None,
                    rel,
                )
            except RuntimeError as exc:
                die(ERR_GIT_FAIL, str(exc))
            _enrich_commits_with_body_and_refs(project_root, commits)
            if json_mode:
                meta = {
                    "entry_id": f"<scope:{parsed['value']}/{layer_name}>",
                    "lore_file": rel,
                    "code_file": rel,
                    "since": scope_since,
                    "since_source": "scope_form",
                }
                scope_payloads.append({
                    "layer": layer_name,
                    "payload": _json.loads(render_json(meta, commits)),
                })
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
        if json_mode:
            print(_json.dumps(
                {
                    "form": "scope",
                    "scope": parsed["value"],
                    "layers": [item["layer"] for item in scope_payloads],
                    "results": scope_payloads,
                },
                indent=2,
                ensure_ascii=False,
            ))
        return


if __name__ == "__main__":
    main()
