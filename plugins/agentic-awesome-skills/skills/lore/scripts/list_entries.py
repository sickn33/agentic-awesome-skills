#!/usr/bin/env python3
"""List all lore entries in `.lore/` as JSON or human-readable text.

Usage:
    python list_entries.py                 # human-readable
    python list_entries.py --json          # JSON output
    python list_entries.py --scope=frontend
    python list_entries.py --layer=ARCH

Walks `.lore/_global/*` and `.lore/scopes/*/*` and parses every
Markdown bullet that matches the entry format. Output is one record per
entry with these fields:

    id              full ID, e.g. "ARCH-2026-07-09-a3f2"
    layer           prefix, e.g. "ARCH" / "DEC" / "CONV"
    layer_file      source file stem, e.g. "ARCHITECTURE"
    scope           scope name, or "_global"
    file            path relative to .lore/, e.g. "scopes/frontend/ARCHITECTURE.md"
    text            entry body, with tags stripped
    tags            dict of tag name -> value, e.g. {"added": "2026-07-09", "verified": "2026-07-15"}
    last_verified   value of #verified tag, or None
    replaced_by     value of #superseded-by tag (replacement entry ID), or None

Used by:
    - query / audit / compress / history workflows (pre-step enumeration)
    - find_duplicates.py
    - find_stale.py
"""
import json
import os
import re
import sys
from pathlib import Path


# Schema version this skill understands. Bumped only on breaking
# config changes; see references/compatibility.md.
KNOWN_SCHEMA_VERSION = 1


def check_schema_version(lore_root: Path) -> None:
    """Warn if .lore/.config.json is missing or has an unknown schema_version.

    Output goes to stderr so it does not pollute --json consumers.
    Idempotent and best-effort: any failure (missing file, malformed
    JSON, permission error) is silent — config is optional and the
    user can address it separately.
    """
    cfg_path = lore_root / ".config.json"
    if not cfg_path.exists():
        return
    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return

    version = cfg.get("schema_version")
    if version is None:
        print(
            "[WARN] .lore/.config.json has no schema_version field. "
            "Add \"schema_version\": 1 so future lore upgrades can detect "
            "this config and prompt for migrations when they exist.",
            file=sys.stderr,
        )
    elif isinstance(version, int) and version > KNOWN_SCHEMA_VERSION:
        print(
            f"[WARN] .lore/.config.json#schema_version={version} is newer "
            f"than this lore skill expects (max: {KNOWN_SCHEMA_VERSION}). "
            "Pull the latest lore from upstream.",
            file=sys.stderr,
        )


def find_lore_root(start: Path) -> Path:
    """Walk up from start to find the project root containing .lore/."""
    p = start.resolve()
    while p != p.parent:
        if (p / ".lore").is_dir():
            return p / ".lore"
        p = p.parent
    return None


def parse_entry(line: str):
    """Parse one Markdown bullet line. Returns dict or None if not an entry."""
    m = re.match(
        r"^\s*-\s*\[([A-Z]+)-(\d{4}-\d{2}-\d{2})-([a-f0-9]{4})\]\s+(.*?)\s*$",
        line,
    )
    if not m:
        return None

    layer, date, h, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    eid = f"{layer}-{date}-{h}"

    # Extract #tag:value pairs.
    # #superseded-by:<id> is special: its value is an entry ID, not a date,
    # so we keep it on a separate `replaced_by` field rather than in `tags`.
    ENTRY_ID = r"[A-Z]+-\d{4}-\d{2}-\d{2}-[a-f0-9]{4}"
    tag_re = re.compile(
        r"#(added|verified|stale):(\S+)"
        r"|#superseded-by:(" + ENTRY_ID + r")"
    )
    tags = {}
    replaced_by = None
    for m in tag_re.finditer(rest):
        if m.group(1):
            tags[m.group(1)] = m.group(2)
        elif m.group(3):
            if replaced_by is None:
                replaced_by = m.group(3)
            else:
                print(
                    f"[WARN] entry {eid} carries multiple #superseded-by "
                    "tags; keeping the first only.",
                    file=sys.stderr,
                )
    text = tag_re.sub("", rest).strip()
    # Any #superseded-by still present after the valid-tag strip is
    # malformed (value is not LAYER-YYYY-MM-DD-xxxx). Warn instead of
    # dropping it silently: the entry stays intact in the file, but the
    # chain cannot be resolved and replaced_by stays None.
    for m in re.finditer(r"#superseded-by:(\S+)", text):
        print(
            f"[WARN] entry {eid} has a malformed #superseded-by value "
            f"'{m.group(1)}' (expected LAYER-YYYY-MM-DD-xxxx); chain not "
            "resolved.",
            file=sys.stderr,
        )

    return {
        "id": eid,
        "layer": layer,
        "layer_file": None,  # filled in by caller
        "scope": None,       # filled in by caller
        "file": None,        # filled in by caller
        "text": text,
        "tags": tags,
        "last_verified": tags.get("verified"),
        "replaced_by": replaced_by,
    }


def collect_entries(root: Path):
    entries = []
    layers_dirs = [("_global", root / "_global"), ("scopes", root / "scopes")]

    for section_name, section_path in layers_dirs:
        if not section_path.exists():
            continue
        for md_file in sorted(section_path.rglob("*.md")):
            if section_name == "_global":
                scope = "_global"
            else:
                scope = md_file.parent.name
            layer_file = md_file.stem
            try:
                with open(md_file, encoding="utf-8") as f:
                    lines = f.readlines()
                if lines:
                    # Strip a UTF-8 BOM (Windows editors / PowerShell
                    # Set-Content add one); otherwise the first entry of
                    # the file would fail to parse and be silently skipped.
                    lines[0] = lines[0].lstrip("\ufeff")
                i = 0
                while i < len(lines):
                    # Join wrapped continuation lines into one logical
                    # bullet before parsing. A continuation is a non-blank
                    # line starting with 2+ spaces (or a tab) that is not
                    # itself a new entry bullet. This matches the documented
                    # "2 lines or fewer" bullet format without silently
                    # truncating the entry text.
                    joined = lines[i].rstrip("\n")
                    j = i + 1
                    while j < len(lines):
                        nxt = lines[j].rstrip("\n")
                        if nxt.strip() == "":
                            break
                        if not re.match(r"^\s{2,}", nxt):
                            break
                        if re.match(r"^\s*-\s*\[", nxt):
                            break
                        joined += " " + nxt.strip()
                        j += 1
                    e = parse_entry(joined)
                    if e is None:
                        i += 1
                        continue
                    e["scope"] = scope
                    e["layer_file"] = layer_file
                    e["file"] = str(md_file.relative_to(root)).replace(
                        os.sep, "/"
                    )
                    entries.append(e)
                    i = j
            except OSError as exc:
                print(f"warning: cannot read {md_file}: {exc}", file=sys.stderr)
    return entries


def main():
    args = sys.argv[1:]
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:  # Python < 3.7
        pass

    scope_filter = None
    layer_filter = None
    json_output = "--json" in args

    for arg in args:
        if arg.startswith("--scope="):
            scope_filter = arg.split("=", 1)[1]
        elif arg.startswith("--layer="):
            layer_filter = arg.split("=", 1)[1]

    root = find_lore_root(Path("."))
    if root is None:
        print("error: .lore/ not found (run from project root or below)",
              file=sys.stderr)
        sys.exit(1)

    check_schema_version(root)
    entries = collect_entries(root)

    if scope_filter:
        entries = [e for e in entries if e["scope"] == scope_filter]
    if layer_filter:
        entries = [e for e in entries if e["layer"] == layer_filter]

    if json_output:
        print(json.dumps(entries, indent=2, ensure_ascii=False))
        return

    if not entries:
        print("(no entries)")
        return

    for e in entries:
        verified = (
            f" [verified:{e['last_verified']}]" if e["last_verified"] else ""
        )
        stale = " [STALE]" if "stale" in e["tags"] else ""
        chain = (
            f" -> {e['replaced_by']}" if e.get("replaced_by") else ""
        )
        print(f"[{e['file']}] {e['id']} {e['text']}{verified}{stale}{chain}")


if __name__ == "__main__":
    main()
