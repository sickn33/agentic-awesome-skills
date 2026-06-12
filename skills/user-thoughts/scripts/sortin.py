"""Soft-maintain raw user-thought entries into mdbase."""
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from common import (
    ensure_runtime_dir,
    safe_markdown_files,
    safe_markdown_tree,
    safe_read_text,
    safe_write_text,
    find_ustht,
    read_define_ini,
    write_define_ini,
    is_processed,
    validate_dim_name,
)

HELP = """Usage: python sortin.py [--dry] [--help]

Soft maintenance: parse unprocessed #raw/*.md files, append entries to matching
mdbase dimensions, mark raw files as processed, and update LAST_SORTIN.

Options:
  --dry   Preview changes without writing
  --help  Show this help text
"""


def parse_raw_file(ustht: Path, filepath: Path):
    """Parse raw entries from one file."""
    entries = []
    date = filepath.stem.split("-", 3)
    if len(date) >= 3:
        date = "-".join(date[:3])
    else:
        date = datetime.now().strftime("%Y-%m-%d")

    for line in safe_read_text(ustht, filepath).splitlines():
        line = line.strip()
        match = re.match(r"^- \[(\d{2}:\d{2})\] (.*)$", line)
        if not match:
            continue
        time, content = match.groups()
        dim = "general"
        text = content
        if " | suggested-dim:" in content:
            text, dim = content.rsplit(" | suggested-dim:", 1)
            dim = dim.strip()
            if not validate_dim_name(dim):
                dim = "general"
        entries.append({"time": time, "text": text.strip(), "dimension": dim, "date": date})
    return entries


def dim_path(mdbase: Path, dim: str) -> Path:
    """Return the target file path for a dimension."""
    if dim == "backlog":
        return mdbase / "backlog.md"
    return mdbase / "details" / f"{dim}.md"


def count_entries(ustht: Path, path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for line in safe_read_text(ustht, path).splitlines() if line.strip().startswith("- "))


def append_entries(ustht: Path, path: Path, entries):
    """Append entries grouped by date to one dimension file."""
    by_date = defaultdict(list)
    for entry in entries:
        by_date[entry["date"]].append(entry)

    ensure_runtime_dir(ustht, path.parent, create=True)
    if not path.exists():
        title = path.stem.replace("-", " ").title()
        safe_write_text(ustht, path, f"# {title}\n\n> Project memory for `{path.stem}`.\n\n")

    content = safe_read_text(ustht, path).rstrip()
    for date, date_entries in sorted(by_date.items()):
        lines = [f"- {entry['text']}" for entry in date_entries]
        block = "\n".join(lines)
        heading = f"## {date}"
        content_lines = content.splitlines()
        heading_idx = next((i for i, line in enumerate(content_lines) if line.strip() == heading), None)
        if heading_idx is not None:
            insert_idx = len(content_lines)
            for i in range(heading_idx + 1, len(content_lines)):
                if content_lines[i].startswith("## "):
                    insert_idx = i
                    break
            before = content_lines[:insert_idx]
            after = content_lines[insert_idx:]
            if before and before[-1].strip():
                before.append("")
            before.extend(lines)
            if after:
                before.append("")
                before.extend(after)
            content = "\n".join(before).rstrip()
        else:
            content = f"{content}\n\n{heading}\n\n{block}".rstrip()
    safe_write_text(ustht, path, content + "\n")


def mark_processed(ustht: Path, filepath: Path):
    """Insert the processed marker at the top of a raw file."""
    content = safe_read_text(ustht, filepath)
    if content.split("\n", 1)[0].strip() != "<!-- processed -->":
        safe_write_text(ustht, filepath, "<!-- processed -->\n" + content)


def update_index(ustht: Path, mdbase: Path):
    """Rebuild mdbase/README.ai.md with dimension counts."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    details = mdbase / "details"
    dims = []
    if details.exists():
        dims = sorted(p.relative_to(details).with_suffix("").as_posix() for p in safe_markdown_tree(ustht, details))

    rows = ["| File | Dimension | Entries |", "|------|-----------|---------|"]
    backlog = mdbase / "backlog.md"
    if backlog.exists():
        rows.append(f"| [backlog.md](backlog.md) | backlog | {count_entries(ustht, backlog)} |")
    for dim in dims:
        path = details / f"{dim}.md"
        rows.append(f"| [details/{dim}.md](details/{dim}.md) | {dim} | {count_entries(ustht, path)} |")

    content = "\n".join([
        "# user-thoughts mdbase Index",
        "",
        "This directory stores user-provided project decisions, constraints, preferences, and plans.",
        "",
        f"Last updated: {now}",
        "",
        "## Maintenance Rules",
        "",
        "- Preserve user wording and constraints.",
        "- Append entries by date under `## yyyy-mm-dd` headings.",
        "- Prefer existing dimensions before creating new ones.",
        "- Mark deprecated content instead of silently deleting history.",
        "",
        "## Document Index",
        "",
        *rows,
        "",
    ])
    safe_write_text(ustht, mdbase / "README.ai.md", content)


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    dry = "--dry" in sys.argv
    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    cfg = read_define_ini(ustht)
    if cfg.get("SKILL_STATUS") == "off":
        print("SKILL is off; write ignored. Run /ustht skill on to enable it.")
        sys.exit(0)

    raw_dir = ustht / "raw"
    if not raw_dir.exists():
        print("No unprocessed records.")
        return

    raw_files = [f for f in safe_markdown_files(ustht, raw_dir) if not is_processed(f, ustht)]
    if not raw_files:
        print("No unprocessed records. All raw files are marked processed.")
        return

    all_entries = []
    entries_by_file = {}
    for f in raw_files:
        entries = parse_raw_file(ustht, f)
        entries_by_file[f] = entries
        all_entries.extend(entries)

    if not all_entries:
        print("No valid entries found in raw files.")
        return

    grouped = defaultdict(list)
    for entry in all_entries:
        grouped[entry["dimension"]].append(entry)

    print("Preview mode:" if dry else f"Soft maintenance complete. Processed {len(all_entries)} thoughts:")
    mdbase = ustht / "mdbase"
    for dim, entries in sorted(grouped.items()):
        target = dim_path(mdbase, dim)
        label = f"{dim}.md" if target.exists() else f"{dim}.md [new dimension]"
        sample = entries[0]["text"][:60]
        print(f"  -> {label}: +{len(entries)} ({sample})")

    if dry:
        print(f"  {len(all_entries)} total entries; no files were changed.")
        return

    for dim, entries in grouped.items():
        append_entries(ustht, dim_path(mdbase, dim), entries)

    for f in raw_files:
        if entries_by_file.get(f):
            mark_processed(ustht, f)

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    cfg["LAST_SORTIN"] = now
    write_define_ini(ustht, cfg)
    update_index(ustht, mdbase)
    print(f"  LAST_SORTIN updated to {now}")


if __name__ == "__main__":
    main()
