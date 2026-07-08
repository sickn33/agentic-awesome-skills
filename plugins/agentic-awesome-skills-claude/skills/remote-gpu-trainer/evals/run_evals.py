#!/usr/bin/env python3
"""
Structural retrieval-reachability check for the remote-gpu-trainer skill.

For each scenario in cases.jsonl, assert that the answer is actually PRESENT in the
skill, at the documented location, with the expected entry IDs / keywords intact:

  - every `expect_files` path exists
  - every `expect_ids` appears as a `### <ID>` header in one of those files
  - every `expect_grep` keyword appears (case-insensitive) in one of those files

This is the cheap, no-API-key tier: it does NOT prove an agent *navigates* there
(that is the agentic tier — see RESULTS.md), and it does NOT prove the platform
FACTS are correct on a live box (see the README "Verification status"). What it
DOES catch is drift: a renamed/removed entry ID, a moved section, a deleted file,
or a fact rewritten away from a key term — i.e. a regression in the skill's known
load-bearing capabilities.

Usage:  python evals/run_evals.py            # exits 1 if any case fails
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CASES = Path(__file__).resolve().parent / "cases.jsonl"


def header_present(text, id_):
    # match `### O1 ...` but not `### O10 ...`
    return re.search(r"(?m)^###\s+" + re.escape(id_) + r"\b", text) is not None


def main():
    cases = [json.loads(l) for l in CASES.read_text(encoding="utf-8").splitlines() if l.strip()]
    passed = failed = 0
    for c in cases:
        problems = []
        blobs = []
        for f in c.get("expect_files", []):
            p = REPO / f
            if not p.exists():
                problems.append(f"missing file: {f}")
            else:
                blobs.append(p.read_text(encoding="utf-8"))
        joined = "\n".join(blobs)
        low = joined.lower()
        for i in c.get("expect_ids", []):
            if not any(header_present(b, i) for b in blobs):
                problems.append(f"missing entry id: {i}")
        for kw in c.get("expect_grep", []):
            if kw.lower() not in low:
                problems.append(f"missing keyword: {kw!r}")
        status = "PASS" if not problems else "FAIL"
        if problems:
            failed += 1
        else:
            passed += 1
        print(f"[{status}] {c['id']}")
        for pr in problems:
            print(f"         - {pr}")
    print(f"\n{passed}/{passed + failed} cases reachable" + ("" if not failed else f"  ({failed} FAILED)"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
