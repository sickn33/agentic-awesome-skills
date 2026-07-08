#!/usr/bin/env python3
"""Flag platform/teardown facts whose `verified <YYYY-MM>` stamp has gone stale.

Every money-affecting platform fact in this skill is pinned with a `verified ... YYYY-MM`
stamp (references/self-improvement.md section 5). Billing verbs, spot rules, and auto-release
clocks drift silently; this scans every stamp and warns past an age threshold so the
quarterly re-verify is mechanical, not a memory ritual. It flags WHAT to re-check against
current platform docs -- it does NOT (and cannot) verify whether the fact is still true.
Pure stdlib, no network calls.

Usage:
    python scripts/check_staleness.py [--root .] [--max-age-months 6] [--today YYYY-MM]

Exit code: 0 = every stamp within the threshold; 1 = at least one stale stamp (or none found).
"""
from __future__ import annotations
import argparse
import re
import sys
from datetime import date
from pathlib import Path

# A stamp is a YYYY-MM token (2000-2099) sitting on a line that also says "verified".
DATE = re.compile(r"(20\d\d)-(0[1-9]|1[0-2])")


def main() -> int:
    ap = argparse.ArgumentParser(description="Warn on stale `verified YYYY-MM` platform-fact stamps.")
    ap.add_argument("--root", default=".", help="repo root to scan (default: cwd)")
    ap.add_argument("--max-age-months", type=int, default=6, help="warn past this many months (default: 6)")
    ap.add_argument("--today", help="override current month as YYYY-MM (default: system clock)")
    a = ap.parse_args()

    if a.today:
        ty, tm = (int(x) for x in a.today.split("-"))
    else:
        t = date.today()
        ty, tm = t.year, t.month
    now = ty * 12 + tm

    root = Path(a.root)
    stamps = 0
    stale = []
    for f in sorted(root.rglob("*.md")):
        if ".git" in f.parts:
            continue
        for n, line in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if "verified" not in line.lower():
                continue
            for m in DATE.finditer(line):
                stamps += 1
                age = now - (int(m.group(1)) * 12 + int(m.group(2)))
                if age > a.max_age_months:
                    stale.append((f.as_posix(), n, m.group(0), age))

    print(f"Scanned {stamps} `verified <YYYY-MM>` stamp(s); threshold = {a.max_age_months} months.")
    if stamps == 0:
        print("WARNING: no stamps found -- wrong --root, or stamps were dropped.")
        return 1
    if not stale:
        print("All stamps within threshold. (Still re-verify before betting money/data -- self-improvement.md section 5.)")
        return 0
    print(f"\n{len(stale)} STALE stamp(s) -- re-verify against current platform docs (self-improvement.md section 5):")
    for path, n, stamp, age in stale:
        print(f"  {path}:{n}  verified {stamp}  ({age} mo old)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
