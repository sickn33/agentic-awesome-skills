#!/usr/bin/env python3
"""Mechanical scan of a long-form draft (Markdown). Stdlib only.

Reports what a human gate shouldn't have to hunt for:
  - word count and read time (about 240 words a minute)
  - every em dash and en dash, with line numbers
  - leftover placeholders: [confirm], TODO, TK, $X, [NEEDS ...]
  - paragraphs that state a number with no source in parentheses
  - paragraphs with more than one link
  - the H2 list (read it alone: does the argument survive a skim?)

It flags, it doesn't judge. A flagged number may be the author's own count or
plain arithmetic; check each one.

Usage:
    python3 scan.py article.md
Exit codes: 0 clean, 1 bad args, 3 something to fix (dashes or placeholders).
"""

import re
import sys

PLACEHOLDER = re.compile(r"\[confirm\]|\bTODO\b|\bTK\b|\$X\b|\[NEEDS[^\]]*\]", re.I)
NUMBER = re.compile(r"(\$\s?\d[\d,.]*|\d[\d,.]*\s?%|\b\d{1,3}(,\d{3})+\b|\b\d{3,}\b|\b\d+(\.\d+)?\s?(million|billion|x)\b)", re.I)
YEARISH = re.compile(r"^(19|20)\d\d$")
SOURCE = re.compile(r"\([^()]*[A-Za-z][^()]*\)")
LINK = re.compile(r"\[[^\]]+\]\([^)]+\)|https?://\S+")


def paragraphs(lines):
    block, start, in_code = [], None, False
    for i, line in enumerate(lines, 1):
        if line.strip().startswith("```"):
            in_code = not in_code
            if block:
                yield start, " ".join(block)
                block, start = [], None
            continue
        if in_code:
            continue
        if line.strip() == "" or line.startswith("#"):
            if block:
                yield start, " ".join(block)
                block, start = [], None
            continue
        if start is None:
            start = i
        block.append(line.strip())
    if block:
        yield start, " ".join(block)


def main(argv):
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 1
    try:
        text = open(argv[1], encoding="utf-8").read()
    except OSError as e:
        print(f"Cannot read {argv[1]}: {e.strerror}", file=sys.stderr)
        return 1
    lines = text.splitlines()

    prose = re.sub(r"```.*?```", " ", text, flags=re.S)
    words = len(re.findall(r"[A-Za-z0-9$%'][A-Za-z0-9$%',.\-]*", prose))
    minutes = max(1, round(words / 240))
    print(f"Words: {words} · about a {minutes} minute read")

    problems = 0
    dashes = [(i, l) for i, l in enumerate(lines, 1) if "\u2014" in l or "\u2013" in l]
    print(f"\nDashes (em or en): {len(dashes)}")
    for i, l in dashes:
        print(f"  line {i}: {l.strip()[:100]}")
    problems += len(dashes)

    ph = [(i, m.group(0)) for i, l in enumerate(lines, 1) for m in PLACEHOLDER.finditer(l)]
    print(f"\nPlaceholders left: {len(ph)}")
    for i, m in ph:
        print(f"  line {i}: {m}")
    problems += len(ph)

    unsourced, multilink = [], []
    for start, para in paragraphs(lines):
        bare = LINK.sub(" ", para)
        nums = [m.group(0) for m in NUMBER.finditer(bare) if not YEARISH.match(m.group(0).strip())]
        if nums and not SOURCE.search(bare):
            unsourced.append((start, nums[:3], para))
        links = LINK.findall(para)
        if len(links) > 1:
            multilink.append((start, len(links)))

    print(f"\nParagraphs with a number and no source in parentheses: {len(unsourced)} (check each)")
    for start, nums, para in unsourced:
        print(f"  line {start}: {', '.join(n.strip() for n in nums)} :: {para[:80]}")

    print(f"\nParagraphs with more than one link: {len(multilink)}")
    for start, n in multilink:
        print(f"  line {start}: {n} links")

    h2 = [l[3:].strip() for l in lines if l.startswith("## ")]
    print(f"\nH2 skim ({len(h2)}):")
    for h in h2:
        print(f"  - {h}")

    return 3 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
