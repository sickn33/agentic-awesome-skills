#!/usr/bin/env python3
"""Find stale entries in .lore/.

Usage:
    python find_stale.py                  # default: 90-day threshold
    python find_stale.py --days=180
    python find_stale.py --json

Reports two categories:

  Stale        : entry has not been `#verified` within the threshold
                 (or has no #verified at all, and was added > threshold
                 days ago).
  Pending arch : entry already carries a `#stale:` tag and is waiting
                 to be moved into .lore/archive/.

Output is plain text by default, JSON with --json.

Used by:
    - `audit` workflow (read-only)
    - `compress` workflow (advisory)
    - `lore mirror` (sanity check before regenerating)
"""
import json
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path


def get_entries():
    script = Path(__file__).parent / "list_entries.py"
    r = subprocess.run(
        [sys.executable, str(script), "--json"],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print(r.stderr.strip(), file=sys.stderr)
        sys.exit(1)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError as exc:
        print(f"error: list_entries.py returned invalid JSON: {exc}",
              file=sys.stderr)
        sys.exit(1)


def parse_date(s: str):
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def main():
    days = 90
    json_output = "--json" in sys.argv[1:]

    for arg in sys.argv[1:]:
        if arg.startswith("--days="):
            days = int(arg.split("=", 1)[1])

    today = date.today()
    cutoff = today - timedelta(days=days)

    entries = get_entries()
    stale = []
    pending_arch = []

    for e in entries:
        # Already marked stale → pending archive
        if "stale" in e["tags"]:
            pending_arch.append(e)
            continue

        # Determine the entry's freshness date
        last_v = parse_date(e["last_verified"])
        added = parse_date(e["tags"].get("added"))
        ref_date = last_v or added

        if ref_date is None:
            continue  # no date info, can't decide

        if ref_date < cutoff:
            stale.append(e)

    if json_output:
        out = {
            "threshold_days": days,
            "as_of": today.isoformat(),
            "stale": stale,
            "pending_archive": pending_arch,
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return

    print(f"=== Stale (unverified > {days} days, as of {today}) ===")
    if not stale:
        print("  (none)")
    for e in stale:
        ref = e["last_verified"] or e["tags"].get("added", "unknown")
        print(f"  [{e['file']}] {e['id']} {e['text']}")
        print(f"    ref date: {ref}")

    print()
    print("=== Pending archive (tagged #stale) ===")
    if not pending_arch:
        print("  (none)")
    for e in pending_arch:
        print(f"  [{e['file']}] {e['id']} {e['text']}")
        print(f"    marked stale: {e['tags']['stale']}")


if __name__ == "__main__":
    main()
