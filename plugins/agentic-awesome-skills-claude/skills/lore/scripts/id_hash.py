#!/usr/bin/env python3
"""Compute the 4-char content hash for a lore entry ID.

Usage:
    python id_hash.py "Use Next.js App Router; reason: streaming + RSC"

Output:
    The 4-char lowercase hex hash that goes into an entry's ID, e.g. `a3f2`.

The hash is `sha256(text).hexdigest()[:4]`. This matches the algorithm
in `references/entry-format.md` and what `list_entries.py` uses when
re-reading an entry from disk (it strips `#tag:value` pairs before
hashing). To stay consistent, **pass the entry body WITHOUT the inline
tags** — i.e. the text that goes between the `[ID]` and the first `#`.
Including tags in the input here will produce a different hash than the
file's stored ID, breaking round-trip verification.

Cross-platform: works on Windows / Linux / macOS with Python 3.6+.
"""
import sys
import hashlib


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__, file=sys.stderr)
        sys.exit(0)

    text = sys.argv[1]
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:4]
    print(h)


if __name__ == "__main__":
    main()
