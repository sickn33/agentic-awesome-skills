#!/usr/bin/env python3
"""Find potential duplicate entries in .lore/.

Usage:
    python find_duplicates.py                       # default threshold 0.7
    python find_duplicates.py --threshold=0.85
    python find_duplicates.py --json

Detection strategies:
    1. Identical hash suffix (4 chars after the date) — these are exact
       text matches and indicate either a real duplicate or a hash
       collision. Always reported.
    2. Token-based Jaccard similarity above `--threshold` on the entry
       text. Catches rewrites that mean the same thing but produce a
       different hash (e.g. "use Zustand" vs "we chose Zustand").

Output is sorted by similarity (descending). Run from the project root.

This script is the mechanical part of `sync` step 5 (de-duplication).
The agent still decides what to do with each pair.
"""
import json
import re
import subprocess
import sys
from pathlib import Path


def get_entries():
    """Invoke list_entries.py --json to get parsed entries."""
    script = Path(__file__).parent / "list_entries.py"
    r = subprocess.run(
        [sys.executable, str(script), "--json"],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        sys.exit(1)
    return json.loads(r.stdout)


def tokenize(text: str):
    return set(re.findall(r"\w+", text.lower()))


def jaccard(a: set, b: set):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def hash_suffix(eid: str):
    return eid.split("-")[-1]


def main():
    threshold = 0.7
    json_output = "--json" in sys.argv[1:]

    for arg in sys.argv[1:]:
        if arg.startswith("--threshold="):
            threshold = float(arg.split("=", 1)[1])

    entries = get_entries()
    pairs = []

    for i, a in enumerate(entries):
        for b in entries[i + 1:]:
            # Only compare entries in the same layer (ARCH vs DEC, etc.)
            if a["layer"] != b["layer"]:
                continue
            # Identical hash
            if hash_suffix(a["id"]) == hash_suffix(b["id"]):
                pairs.append((a, b, 1.0, "identical hash"))
                continue
            # Text similarity
            sim = jaccard(tokenize(a["text"]), tokenize(b["text"]))
            if sim >= threshold:
                pairs.append((a, b, sim, f"similar text (≥{threshold})"))

    pairs.sort(key=lambda x: -x[2])

    if json_output:
        out = [
            {
                "similarity": round(sim, 3),
                "reason": reason,
                "a": a,
                "b": b,
            }
            for a, b, sim, reason in pairs
        ]
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return

    if not pairs:
        print("No potential duplicates found.")
        return

    for a, b, sim, reason in pairs:
        print(f"[{sim:.2f}] {reason}")
        print(f"  A: [{a['file']}] {a['id']} {a['text']}")
        print(f"  B: [{b['file']}] {b['id']} {b['text']}")
        print()


if __name__ == "__main__":
    main()
