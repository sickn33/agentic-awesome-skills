#!/usr/bin/env python3
"""Find stale entries in .lore/.

Usage:
    python find_stale.py                  # default: 90-day threshold
    python find_stale.py --days=180
    python find_stale.py --json

Reports two categories:

  Stale           : entry has not been `#verified` within the threshold
                    (or has no #verified at all, and was added > threshold
                    days ago).
  Pending review  : entry is superseded (carries `#stale`, or carries
                    `#superseded-by` which implies staleness). (The skill
                    does not auto-archive; this category is a heads-up that
                    the entry is no longer accurate and should be reviewed
                    or left as historical record.)

Output is plain text by default, JSON with --json.

Used by:
    - `audit` workflow (read-only)
    - `compress` workflow (advisory)
"""
import json
import os
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
        encoding="utf-8",
        errors="replace",
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
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:  # Python < 3.7
        pass

    days = 90
    json_output = "--json" in sys.argv[1:]

    for arg in sys.argv[1:]:
        if arg.startswith("--days="):
            days = int(arg.split("=", 1)[1])

    today = date.today()
    cutoff = today - timedelta(days=days)

    entries = get_entries()
    stale = []
    pending_review = []

    # Build a quick lookup for chain validation.
    by_id = {e["id"]: e for e in entries}

    broken_chains = []
    pending_by_chain = {}  # replaced_by -> [entry, ...]

    for e in entries:
        # Superseded (tagged #stale, or carrying #superseded-by which
        # implies staleness per references/entry-format.md) -> pending
        # review (and maybe broken chain)
        if "stale" in e["tags"] or e.get("replaced_by"):
            target = e.get("replaced_by")
            if target and target not in by_id:
                broken_chains.append({
                    "id": e["id"],
                    "file": e["file"],
                    "text": e["text"],
                    "missing_target": target,
                })
            if target:
                pending_by_chain.setdefault(target, []).append(e)
            else:
                # No chain info — keep under a sentinel so the existing
                # output still includes it.
                pending_by_chain.setdefault(None, []).append(e)
            pending_review.append(e)
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
            "pending_review": pending_review,
            "chains": {target: [e["id"] for e in entries_]
                       for target, entries_ in pending_by_chain.items()
                       if target is not None},
            "broken_chains": broken_chains,
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
    print("=== Pending review (tagged #stale, grouped by replacement) ===")
    if not pending_by_chain:
        print("  (none)")
    for target, entries_ in sorted(
        pending_by_chain.items(), key=lambda kv: (kv[0] is None, kv[0] or "")
    ):
        if target is None:
            print("  (no #superseded-by chain):")
        else:
            print(f"  -> superseded-by {target}:")
        for e in entries_:
            chain = (
                f" -> {e['replaced_by']}" if e.get("replaced_by") else ""
            )
            print(f"    [{e['file']}] {e['id']} {e['text']}{chain}")

    if broken_chains:
        print()
        print("=== Broken chains (#superseded-by target not found) ===")
        for b in broken_chains:
            print(f"  [{b['file']}] {b['id']} {b['text']}")
            print(f"    missing: {b['missing_target']}")


if __name__ == "__main__":
    main()
