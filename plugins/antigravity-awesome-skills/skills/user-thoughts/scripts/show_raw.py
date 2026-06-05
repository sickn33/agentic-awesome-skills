"""Show unprocessed raw files."""
import sys
from pathlib import Path

from common import find_ustht, is_processed

HELP = """Usage: python show_raw.py [--help]

Show unprocessed #raw/ files, including filenames, entry counts, and content.
"""


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    raw_dir = ustht / "raw"
    if not raw_dir.exists():
        print("No unprocessed records.")
        return

    files = [f for f in sorted(raw_dir.glob("*.md"), reverse=True) if not is_processed(f)]
    if not files:
        print("No unprocessed records. All raw files are marked processed.")
        return

    for f in files:
        content = f.read_text(encoding="utf-8").strip()
        entry_count = sum(1 for line in content.splitlines() if line.strip().startswith("- ["))
        print(f"#{f.name} ({entry_count} unprocessed entries):")
        print(content)
        print()


if __name__ == "__main__":
    main()
