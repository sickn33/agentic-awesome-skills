#!/usr/bin/env python3
"""Find potential duplicate entries in .lore/.

Usage:
    python find_duplicates.py                       # default threshold 0.7
    python find_duplicates.py --threshold=0.85
    python find_duplicates.py --json
    python find_duplicates.py --candidate "<text>"
    python find_duplicates.py --candidate-file path/to/candidate.txt
    echo '<text>' | python find_duplicates.py --candidate-stdin

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

When a candidate is supplied (via --candidate, --candidate-file, or
--candidate-stdin), the candidate is also included in the comparison
set so sync step 5 can detect "this proposed entry duplicates an
existing one" before appending. Without a candidate, only
already-appended entries are compared.
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


def read_candidate(args):
    """Return the candidate text or None.

    Sources, in priority order:
      1. --candidate "<text>"
      2. --candidate-file <path>
      3. --candidate-stdin (reads entire stdin)
    """
    inline = None
    file_path = None
    use_stdin = False
    i = 0
    while i < len(args):
        a = args[i]
        if a.startswith("--candidate="):
            inline = a.split("=", 1)[1]
        elif a.startswith("--candidate-file="):
            file_path = a.split("=", 1)[1]
        elif a in ("--candidate", "--candidate-file"):
            if i + 1 >= len(args) or args[i + 1].startswith("--"):
                die(2, f"{a} requires a value")
            i += 1
            if a == "--candidate":
                inline = args[i]
            else:
                file_path = args[i]
        elif a == "--candidate-stdin":
            use_stdin = True
        i += 1
    if inline is not None:
        return inline
    if file_path is not None:
        try:
            return Path(file_path).read_text(encoding="utf-8")
        except OSError as exc:
            die(2, f"failed to read candidate file {file_path}: {exc}")
    if use_stdin:
        if sys.stdin.isatty():
            die(2, "--candidate-stdin given but stdin is a TTY")
        return sys.stdin.read()
    return None


def die(code, message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(code)


def synthetic_candidate_entry(text):
    """Build a candidate entry dict shaped like list_entries.py output.

    The synthetic entry has layer "CANDIDATE" so it compares only against
    existing entries on the same layer when the agent supplies --layer.
    """
    return {
        "id": "CANDIDATE-unsaved",
        "layer": "CANDIDATE",
        "scope": "_candidate",
        "file": "<candidate>",
        "text": text.strip(),
        "tags": {},
    }


def tokenize(text: str):
    return set(re.findall(r"\w+", text.lower()))


def jaccard(a: set, b: set):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def hash_suffix(eid: str):
    return eid.split("-")[-1]


def main():
    args = sys.argv[1:]
    threshold = 0.7
    json_output = "--json" in args
    layer_filter = None

    for arg in args:
        if arg.startswith("--threshold="):
            threshold = float(arg.split("=", 1)[1])
        elif arg.startswith("--layer="):
            layer_filter = arg.split("=", 1)[1]

    candidate_text = read_candidate(args)

    entries = get_entries()
    if layer_filter is not None:
        entries = [e for e in entries if e.get("layer") == layer_filter]

    candidates = []
    if candidate_text:
        candidates.append(synthetic_candidate_entry(candidate_text))

    pairs = []

    # existing-vs-existing pairs (unchanged behavior)
    for i, a in enumerate(entries):
        for b in entries[i + 1:]:
            if a["layer"] != b["layer"]:
                continue
            if hash_suffix(a["id"]) == hash_suffix(b["id"]):
                pairs.append((a, b, 1.0, "identical hash"))
                continue
            sim = jaccard(tokenize(a["text"]), tokenize(b["text"]))
            if sim >= threshold:
                pairs.append((a, b, sim, f"similar text (≥{threshold})"))

    # candidate-vs-existing pairs
    if candidates:
        # --layer narrows entries above; without it, compare the proposed
        # entry with every layer because the candidate has not been assigned
        # a canonical layer yet.
        compare_set = entries
        for a in compare_set:
            sim = jaccard(
                tokenize(candidates[0]["text"]),
                tokenize(a["text"]),
            )
            if sim >= threshold:
                pairs.append((candidates[0], a, sim,
                              f"candidate similar to existing (≥{threshold})"))

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
        if candidate_text:
            print("No potential duplicates found for the candidate.")
        else:
            print("No potential duplicates found.")
        return

    for a, b, sim, reason in pairs:
        print(f"[{sim:.2f}] {reason}")
        print(f"  A: [{a['file']}] {a['id']} {a['text']}")
        print(f"  B: [{b['file']}] {b['id']} {b['text']}")
        print()


if __name__ == "__main__":
    main()
