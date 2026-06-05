"""Show current user-thoughts runtime status."""
import sys
from pathlib import Path

from common import find_ustht, read_define_ini, is_processed

HELP = """Usage: python status.py [--help]

Show SKILL_STATUS, INSTANT_STATUS, LAST_SORTIN, raw file counts, and mdbase
dimension counts.
"""


def count_raw(raw_dir: Path):
    """Return total and unprocessed raw file counts."""
    if not raw_dir.exists():
        return 0, 0
    files = list(raw_dir.glob("*.md"))
    unprocessed = sum(1 for f in files if not is_processed(f))
    return len(files), unprocessed


def count_dims(mdbase: Path):
    """Count dimension files under mdbase/details/."""
    details = mdbase / "details"
    if not details.exists():
        return 0
    return len(list(details.rglob("*.md")))


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("Error: .ustht/ was not found. Run /ustht init first.")
        sys.exit(1)

    cfg = read_define_ini(ustht)
    skill_status = cfg.get("SKILL_STATUS", "unknown")
    instant_status = cfg.get("INSTANT_STATUS", "unknown")
    last_sortin = cfg.get("LAST_SORTIN", "never") or "never"
    total_raw, unprocessed_raw = count_raw(ustht / "raw")
    dims = count_dims(ustht / "mdbase")

    print(f"SKILL_STATUS={skill_status}")
    print(f"INSTANT_STATUS={instant_status}")
    print(f"LAST_SORTIN={last_sortin}")
    print(f"raw={unprocessed_raw} unprocessed / {total_raw} total")
    print(f"dims={dims}")


if __name__ == "__main__":
    main()
