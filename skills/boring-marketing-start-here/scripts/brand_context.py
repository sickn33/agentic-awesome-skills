#!/usr/bin/env python3
"""
brand_context.py: brand-memory loader for Boring Marketing Skills.

Reads the calling skill's frontmatter `metadata.boring.reads` list, resolves the
active brand directory, and emits ONE markdown context block to stdout with
per-file freshness flags. Output order is: workspace MARKETING.md, brand
preferences.md, the business block from brand.yaml, declared reads, then a
key-presence status. Missing files are
listed as "absent", never errors.

Resolution order for the brand dir (per references/brand-memory.md in the start-here skill):
  1. --brand <slug>        -> <root>/brands/<slug>/
  2. <root>/brands/active  -> <root>/brands/<contents>/
  3. <root>/brand/

Usage:
  brand_context.py --for email-sequences
  brand_context.py --for seo-content --brand acme
  brand_context.py --skill-file /path/to/SKILL.md
  brand_context.py --dir                # just print the resolved brand dir

Python 3 stdlib only.
"""

import argparse
import datetime
import re
import sys
from pathlib import Path

# Brand-file tokens -> filenames (everything else is <token>.md)
TOKEN_FILES = {"brand-manifest": "brand.yaml", "preferences": "preferences.md"}

FRESH_DAYS = 7
DATE_FLAG_DAYS = 30
STALE_NOTE_DAYS = 90


def parse_args(argv):
    p = argparse.ArgumentParser(
        prog="brand_context.py",
        description="Emit the brand-memory context block declared by a skill's "
                    "frontmatter reads: list.",
        epilog="Missing brand files are reported as 'absent', not errors. "
               "Exit code is 0 unless arguments are invalid.",
    )
    p.add_argument("--for", dest="skill_name", metavar="SKILL",
                   help="skill name; SKILL.md is located at ../../skills/<SKILL>/SKILL.md "
                        "relative to this script")
    p.add_argument("--skill-file", metavar="PATH",
                   help="explicit path to a SKILL.md (overrides --for lookup)")
    p.add_argument("--brand", metavar="SLUG",
                   help="brand slug; resolves to ./brands/<SLUG>/")
    p.add_argument("--root", metavar="DIR", default=".",
                   help="project root containing ./brand/ or ./brands/ (default: cwd)")
    p.add_argument("--dir", dest="dir_only", action="store_true",
                   help="print the resolved brand directory and exit")
    return p.parse_args(argv)


def resolve_brand_dir(root: Path, brand_slug):
    """Resolution order: --brand arg > brands/active pointer > ./brand/."""
    if brand_slug:
        return root / "brands" / brand_slug
    pointer = root / "brands" / "active"
    if pointer.is_file():
        slug = pointer.read_text(encoding="utf-8").strip()
        if slug:
            return root / "brands" / slug
    return root / "brand"


def locate_skill_file(args) -> Path:
    if args.skill_file:
        return Path(args.skill_file)
    root = Path(__file__).resolve().parent.parent.parent
    path = root / "skills" / args.skill_name / "SKILL.md"
    # Repo layout keeps skills under <root>/skills; a copy installed beside its sibling
    # skill folders resolves them one level up, so fall back to <root>/<skill>.
    return path if path.is_file() else root / args.skill_name / "SKILL.md"


def extract_frontmatter(text: str):
    """Return the YAML frontmatter block between the leading --- fences, or None."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


def parse_reads(frontmatter: str):
    """Extract the metadata.boring.reads list. Handles flow ([a, b]) and block (- a) style."""
    lines = frontmatter.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r"^(\s*)reads:\s*(.*)$", line)
        if not m:
            continue
        indent, rest = m.group(1), m.group(2).strip()
        if rest.startswith("["):
            # flow style, possibly spanning lines until the closing bracket
            buf = rest
            j = i
            while "]" not in buf and j + 1 < len(lines):
                j += 1
                buf += " " + lines[j].strip()
            inner = buf[buf.index("[") + 1:buf.index("]")]
            return [t.strip().strip("'\"") for t in inner.split(",") if t.strip()]
        # block style: following "- item" lines more indented than the key
        items = []
        for follow in lines[i + 1:]:
            fm = re.match(r"^(\s*)-\s*(.+?)\s*$", follow)
            if fm and len(fm.group(1)) > len(indent):
                items.append(fm.group(2).strip().strip("'\""))
            elif follow.strip() == "":
                continue
            else:
                break
        return items
    return []


def parse_manifest_timestamps(brand_dir: Path):
    """Parse brand.yaml files: section -> {filename: (updated_date, owner)}.

    Handles both inline ({ updated: ..., owner: ... }) and block style. Returns {}
    if the manifest is missing or unparseable. Callers fall back to mtime.
    """
    manifest = brand_dir / "brand.yaml"
    out = {}
    if not manifest.is_file():
        return out
    try:
        lines = manifest.read_text(encoding="utf-8").splitlines()
    except OSError:
        return out
    in_files = False
    files_indent = None
    current = None
    for line in lines:
        if re.match(r"^files:\s*$", line):
            in_files = True
            files_indent = None
            continue
        if not in_files:
            continue
        if line.strip() == "" or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        if indent == 0:  # new top-level key ends the files: section
            in_files = False
            continue
        m = re.match(r"^(\s*)([\w.\-]+):\s*(.*)$", line)
        if not m:
            continue
        if files_indent is None:
            files_indent = len(m.group(1))
        if len(m.group(1)) == files_indent:
            current = m.group(2)
            rest = m.group(3).strip()
            out.setdefault(current, {})
            if rest.startswith("{"):
                for kv in re.finditer(r"([\w\-]+):\s*([^,}]+)", rest):
                    out[current][kv.group(1)] = kv.group(2).strip()
        elif current and len(m.group(1)) > files_indent:
            out[current][m.group(2)] = m.group(3).strip()
    result = {}
    for fname, props in out.items():
        updated = parse_date(props.get("updated", ""))
        result[fname] = (updated, props.get("owner"))
    return result


def manifest_brand_block(brand_dir: Path) -> str:
    """Return the raw `brand:` block of brand.yaml (name, url, trade, towns, phone), or ''."""
    try:
        lines = (brand_dir / "brand.yaml").read_text(encoding="utf-8").splitlines()
    except OSError:
        return ""
    block, inside = [], False
    for line in lines:
        if re.match(r"^brand:\s*$", line):
            inside = True
        elif inside and line.strip() and not line[0].isspace():
            break
        if inside:
            block.append(line)
    return "\n".join(block[:40]).rstrip() if len(block) > 1 else ""


def parse_date(s: str):
    s = (s or "").strip().strip("'\"")
    try:
        return datetime.date.fromisoformat(s[:10])
    except ValueError:
        return None


def slugify(heading: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", heading.strip().lower()).strip("-")


def extract_section(text: str, anchor: str):
    """Return only the ## section whose slugified heading matches anchor, or None."""
    lines = text.splitlines()
    start = None
    level = None
    for i, line in enumerate(lines):
        m = re.match(r"^(#{2,6})\s+(.*?)\s*$", line)
        if not m:
            continue
        if start is None:
            if slugify(m.group(2)) == anchor:
                start = i
                level = len(m.group(1))
        elif len(m.group(1)) <= level:
            return "\n".join(lines[start:i]).rstrip()
    if start is not None:
        return "\n".join(lines[start:]).rstrip()
    return None


def freshness(updated: datetime.date, owner):
    """Map a last-updated date to (label, note)."""
    age = (datetime.date.today() - updated).days
    datestr = updated.isoformat()
    if age < FRESH_DAYS:
        return f"updated {datestr}, fresh", None
    if age < DATE_FLAG_DAYS:
        return f"updated {datestr}", None
    if age < STALE_NOTE_DAYS:
        return (f"updated {datestr}, {age} days old",
                "Note: may be stale; sanity-check against the current session.")
    refresh_hint = f" (re-run /{owner})" if owner else ""
    return (f"updated {datestr}, {age} days old",
            f"STALE: recommend refreshing this file before relying on it{refresh_hint}.")


def main(argv=None):
    args = parse_args(argv)
    root = Path(args.root)
    brand_dir = resolve_brand_dir(root, args.brand)

    if args.dir_only:
        print(brand_dir)
        return 0

    if not args.skill_name and not args.skill_file:
        print("error: provide --for <skill-name>, --skill-file <path>, or --dir",
              file=sys.stderr)
        return 2

    skill_file = locate_skill_file(args)
    skill_label = args.skill_name or skill_file.parent.name
    if not skill_file.is_file():
        print(f"error: skill file not found: {skill_file}", file=sys.stderr)
        return 2

    fm = extract_frontmatter(skill_file.read_text(encoding="utf-8"))
    reads = parse_reads(fm) if fm else []

    print(f"# Brand Context (skill: {skill_label}, brand dir: {brand_dir})")
    print()

    marketing = brand_dir / "MARKETING.md" if (brand_dir / "MARKETING.md").is_file() else root / "MARKETING.md"
    if marketing.is_file():
        lines = marketing.read_text(encoding="utf-8").splitlines()
        print("## MARKETING.md (standing brief: the user's own words; honour it before every other input)")
        print()
        print("\n".join(lines[:300]))
        if len(lines) > 300:
            print("\n(truncated at 300 lines; ask the user to trim MARKETING.md)")
        print()
    prefs = brand_dir / "preferences.md"
    if brand_dir.is_dir() and prefs.is_file():
        print("## preferences.md (standing preferences: banned words, channels, review rules, budgets)")
        print()
        print(prefs.read_text(encoding="utf-8").rstrip())
        print()

    checks = brand_dir / "checks.md"
    if brand_dir.is_dir() and checks.is_file():
        mine = [ln.strip() for ln in checks.read_text(encoding="utf-8").splitlines()
                if (m := re.match(r"\s*- \[([a-z0-9-]+)\]", ln)) and m.group(1) in ("all", skill_label)]
        if mine:
            print(f"## checks.md ({len(mine)} yes/no checks from the user's own edits: "
                  "answer each against your draft before handing it over, fix every no, "
                  "never show the list; see start-here/references/taste-loop.md)")
            print()
            print("\n".join(mine))
            print()
    gold = brand_dir / "gold" / skill_label
    if gold.is_dir():
        cases = sorted(gold.glob("*.md"), reverse=True)[:3]
        if cases:
            print("## Gold cases for this skill (finished work the user shipped; read the "
                  "newest before writing the same kind of piece)")
            print()
            for c in cases:
                print(f"- {c.relative_to(brand_dir.parent) if brand_dir.parent in c.parents else c}")
            print()

    business = manifest_brand_block(brand_dir)
    if business:
        print("## Business (brand.yaml)")
        print()
        print(business)
        print()

    if not brand_dir.is_dir():
        print("No brand directory found. Proceed standalone. Ask only for what the "
              "task strictly requires.")
        return 0
    if not reads:
        print("This skill declares no brand reads (`metadata.boring.reads` is empty). "
              "Proceeding without brand context.")
        print(f"## Keys\nbrand .env present: {'yes' if (brand_dir / '.env').is_file() else 'no'} (per-client keys override the workspace .env; values are never shown)")
        return 0

    timestamps = parse_manifest_timestamps(brand_dir)
    absent = []

    for token in reads:
        name, _, anchor = token.partition("#")
        fname = TOKEN_FILES.get(name, f"{name}.md")
        path = brand_dir / fname
        if not path.is_file():
            absent.append(token)
            continue
        content = path.read_text(encoding="utf-8")
        if anchor:
            section = extract_section(content, anchor)
            if section is None:
                print(f"## {fname}#{anchor}: section not found "
                      f"(file exists; load the full file if the section matters)")
                print()
                continue
            content = section
        updated, owner = timestamps.get(fname, (None, None))
        if updated is None:
            try:
                updated = datetime.date.fromtimestamp(path.stat().st_mtime)
            except OSError:
                updated = datetime.date.today()
        label, note = freshness(updated, owner)
        suffix = f"#{anchor}" if anchor else ""
        print(f"## {fname}{suffix} ({label})")
        if note:
            print(f"> {note}")
        print()
        print(content.rstrip())
        print()

    if absent:
        print(f"## Absent: {', '.join(absent)}")
        print("(Not an error. Consolidate into one status line if mentioned; ask only "
              "what the task strictly requires.)")
    print(f"## Keys\nbrand .env present: {'yes' if (brand_dir / '.env').is_file() else 'no'} (per-client keys override the workspace .env; values are never shown)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
