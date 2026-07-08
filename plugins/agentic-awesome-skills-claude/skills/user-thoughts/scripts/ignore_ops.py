"""Manage ignored user-thought entries."""
import sys
from datetime import datetime
from pathlib import Path

from common import ensure_runtime_dir, find_ustht, safe_markdown_files, safe_read_text, safe_write_text

HELP = """Usage: python ignore_ops.py show|remove_last|add_suffix "text" [--help]

Subcommands:
  show                List entries under #ignored/
  remove_last         Remove the latest raw entry and move it to #ignored/
  add_suffix "text"   Add a suffix-ignored entry to #ignored/
"""


def find_last_raw_entry(ustht: Path, raw_dir: Path):
    """Return (file path, line index, entry text) for the latest raw entry."""
    files = safe_markdown_files(ustht, raw_dir, reverse=True)
    for f in files:
        lines = safe_read_text(ustht, f).splitlines()
        if lines and lines[0].strip() == "<!-- processed -->":
            continue
        for idx in range(len(lines) - 1, -1, -1):
            if lines[idx].strip().startswith("- ["):
                return f, idx, lines[idx]
    return None, None, None


def remove_line(ustht: Path, filepath: Path, idx: int):
    """Remove one line from a file."""
    lines = safe_read_text(ustht, filepath).splitlines()
    del lines[idx]
    safe_write_text(ustht, filepath, "\n".join(lines) + ("\n" if lines else ""))


def append_to_ignored(ustht: Path, ignored_dir: Path, text: str, reason: str):
    """Append one ignored entry to today's ignored file."""
    ignored_dir = ensure_runtime_dir(ustht, ignored_dir, create=True)
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now().strftime("%H:%M")
    f = ignored_dir / f"{today}.md"
    clean = text.strip()
    if " | suggested-dim:" in clean:
        clean = clean.rsplit(" | suggested-dim:", 1)[0]
    entry = f"- [{now}] {clean} ({reason})"
    if f.exists():
        content = safe_read_text(ustht, f).rstrip()
        safe_write_text(ustht, f, f"{content}\n{entry}\n")
    else:
        safe_write_text(ustht, f, f"{entry}\n")


def show_ignored(ustht: Path, ignored_dir: Path):
    """Print all ignored entries."""
    if not ignored_dir.exists():
        print("No ignored entries.")
        return
    files = safe_markdown_files(ustht, ignored_dir, reverse=True)
    if not files:
        print("No ignored entries.")
        return
    for f in files:
        entries = [line for line in safe_read_text(ustht, f).splitlines() if line.strip().startswith("- [")]
        if entries:
            print(f"#{f.name} ({len(entries)} entries):")
            for entry in entries:
                print(entry)


def remove_last(ustht: Path):
    raw_dir = ustht / "raw"
    if not raw_dir.exists():
        print("No previous thought to ignore.")
        return
    filepath, idx, entry = find_last_raw_entry(ustht, raw_dir)
    if filepath is None:
        print("No previous thought to ignore.")
        return
    remove_line(ustht, filepath, idx)
    append_to_ignored(ustht, ustht / "ignored", entry, "ignored with --last")
    display = entry
    if "] " in display:
        display = display.split("] ", 1)[1]
    if " | suggested-dim:" in display:
        display = display.rsplit(" | suggested-dim:", 1)[0]
    print(f"Ignored previous thought: {display}")


def add_suffix(ustht: Path, text: str):
    append_to_ignored(ustht, ustht / "ignored", text, "ignored by suffix")
    print("Ignored current message.")


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} show|remove_last|add_suffix \"text\"")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "show":
        show_ignored(ustht, ustht / "ignored")
    elif cmd == "remove_last":
        remove_last(ustht)
    elif cmd == "add_suffix":
        if len(sys.argv) < 3:
            print("Error: add_suffix requires text.")
            sys.exit(1)
        add_suffix(ustht, sys.argv[2])
    else:
        print(f"Unknown command: {cmd}. Available: show, remove_last, add_suffix")
        sys.exit(1)


if __name__ == "__main__":
    main()
