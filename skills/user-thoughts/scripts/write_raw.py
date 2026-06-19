"""Append one thought to today's raw file."""
import sys
from datetime import datetime
from pathlib import Path

from common import (
    ensure_runtime_dir,
    safe_markdown_files,
    safe_read_text,
    safe_write_text,
    find_ustht,
    read_define_ini,
    validate_dim_name,
)

HELP = """Usage: python write_raw.py "thought text" [--dim dimension] [--help]

Append one thought to today's #raw/ markdown file.

Arguments:
  "thought text"     Thought text to record (required)
  --dim dimension    Suggested dimension, such as rules or ui/outline
  --help             Show this help text

Behavior:
  - If today's raw file is already processed, creates a numbered file such as 2026-06-01-2.md.
  - If the day has more than five raw entries, suggests /ustht sortin.
  - If SKILL_STATUS=off, exits without writing.
"""


def count_today_raw(ustht: Path, raw_dir: Path) -> int:
    """Count unprocessed entries across today's raw files."""
    today = datetime.now().strftime("%Y-%m-%d")
    count = 0
    for f in safe_markdown_files(ustht, raw_dir):
        if not f.name.startswith(today):
            continue
        content = safe_read_text(ustht, f)
        first_line = content.split("\n", 1)[0].strip()
        if first_line == "<!-- processed -->":
            continue
        count += sum(1 for line in content.splitlines() if line.strip().startswith("- ["))
    return count


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    cfg = read_define_ini(ustht)
    if cfg.get("SKILL_STATUS") == "off":
        print("SKILL is off; write ignored.")
        sys.exit(0)

    thought = None
    dim = None
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--dim" and i + 1 < len(args):
            dim = args[i + 1]
            i += 2
        elif thought is None:
            thought = args[i]
            i += 1
        else:
            i += 1

    if not thought:
        print("Error: missing thought text.")
        print(f"Usage: {sys.argv[0]} \"thought text\" [--dim dimension]")
        sys.exit(1)

    if dim and not validate_dim_name(dim):
        print(f"Invalid dimension name: {dim}. Use lowercase letters, digits, hyphens, and optional / subdirectories.")
        sys.exit(1)

    raw_dir = ensure_runtime_dir(ustht, ustht / "raw", create=True)

    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%H:%M")
    raw_file = raw_dir / f"{today}.md"

    if raw_file.exists():
        first_line = safe_read_text(ustht, raw_file).split("\n", 1)[0].strip()
        if first_line == "<!-- processed -->":
            seq = 2
            while (raw_dir / f"{today}-{seq}.md").exists():
                seq += 1
            raw_file = raw_dir / f"{today}-{seq}.md"

    thought_clean = thought.replace("\n", " ").replace("\r", "")
    suffix = f" | suggested-dim:{dim}" if dim else ""
    entry = f"- [{now}] {thought_clean}{suffix}"

    if raw_file.exists():
        content = safe_read_text(ustht, raw_file).rstrip()
        safe_write_text(ustht, raw_file, f"{content}\n{entry}\n")
    else:
        safe_write_text(ustht, raw_file, f"{entry}\n")

    count = count_today_raw(ustht, raw_dir)
    if count > 5:
        print(f"Today has {count} recorded thoughts. Consider running /ustht sortin.")


if __name__ == "__main__":
    main()
