#!/usr/bin/env python3
"""Find town pages that are the same page with the city swapped. Stdlib only.

Reads every page given (files or directories of .md, .html, .htm, .txt), masks
the town names you pass, splits each page into sentences, and reports, for every
pair of pages, the share of the smaller page's sentences that also appear on the
other page.

Usage:
    python3 overlap.py pages/ --names "Garland,Mesquite,Richardson,Dallas"
    python3 overlap.py a.md b.md c.html --threshold 0.25 --format json

Options:
    --names NAMES      Comma-separated town (and neighborhood) names to mask before
                       comparing, so "plumber in Garland" matches "plumber in Mesquite".
    --threshold X      Flag pairs at or above this shared share. Default: 0.30
    --min-words N      Ignore sentences shorter than N words (nav, buttons). Default: 6
    --format FMT       text (default) | json

Exit codes: 0 no pair at or above threshold, 1 at least one flagged pair,
2 bad input (fewer than two readable pages).
"""

import argparse
import html
import itertools
import json
import os
import re
import sys

EXTS = (".md", ".markdown", ".html", ".htm", ".txt")


def collect(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            for root, _, names in os.walk(p):
                for n in sorted(names):
                    if n.lower().endswith(EXTS):
                        files.append(os.path.join(root, n))
        elif os.path.isfile(p):
            files.append(p)
    return files


def to_text(raw, path):
    if path.lower().endswith((".html", ".htm")):
        raw = re.sub(r"(?is)<(script|style|nav|footer|header)\b.*?</\1>", " ", raw)
        raw = re.sub(r"(?s)<[^>]+>", " ", raw)
        raw = html.unescape(raw)
    else:
        raw = re.sub(r"(?s)^---\n.*?\n---\n", " ", raw)          # frontmatter
        raw = re.sub(r"(?s)```.*?```", " ", raw)                   # code blocks (JSON-LD)
        raw = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", raw)            # images
        raw = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", raw)         # links keep text
        raw = re.sub(r"[#>*_`|]", " ", raw)
    return raw


def sentences(text, names, min_words):
    for name in sorted(names, key=len, reverse=True):
        text = re.sub(r"\b" + re.escape(name) + r"\b", "TOWN", text, flags=re.I)
    parts = re.split(r"(?<=[.!?])\s+|\n\s*\n|\n[-*]\s", text)
    out = set()
    for s in parts:
        s = re.sub(r"[^a-z0-9 ]+", " ", s.lower())
        s = re.sub(r"\s+", " ", s).strip()
        if len(s.split()) >= min_words:
            out.add(s)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--names", default="")
    ap.add_argument("--threshold", type=float, default=0.30)
    ap.add_argument("--min-words", type=int, default=6)
    ap.add_argument("--format", choices=["text", "json"], default="text")
    a = ap.parse_args(argv)

    names = [n.strip() for n in a.names.split(",") if n.strip()]
    pages = {}
    for f in collect(a.paths):
        try:
            with open(f, encoding="utf-8", errors="replace") as fh:
                sents = sentences(to_text(fh.read(), f), names, a.min_words)
        except OSError as e:
            print(f"skip {f}: {e}", file=sys.stderr)
            continue
        if sents:
            pages[f] = sents
    if len(pages) < 2:
        print("need at least two readable pages", file=sys.stderr)
        return 2

    pairs = []
    for (fa, sa), (fb, sb) in itertools.combinations(pages.items(), 2):
        shared = len(sa & sb)
        share = shared / min(len(sa), len(sb))
        pairs.append({"a": fa, "b": fb, "shared_sentences": shared, "share": round(share, 3)})
    pairs.sort(key=lambda p: p["share"], reverse=True)
    flagged = [p for p in pairs if p["share"] >= a.threshold]

    worst = {}
    for p in pairs:
        for k in ("a", "b"):
            worst[p[k]] = max(worst.get(p[k], 0), p["share"])

    if a.format == "json":
        print(json.dumps({"pages": len(pages), "threshold": a.threshold,
                          "flagged": flagged, "pairs": pairs,
                          "worst_per_page": worst}, indent=2))
    else:
        print(f"{len(pages)} pages, {len(pairs)} pairs, threshold {a.threshold:.0%}")
        print(f"{len(flagged)} pair(s) at or above threshold")
        for p in flagged:
            print(f"  {p['share']:.0%}  {p['a']}  <->  {p['b']}  ({p['shared_sentences']} shared sentences)")
        print("worst overlap per page:")
        for f, w in sorted(worst.items(), key=lambda x: x[1], reverse=True):
            print(f"  {w:.0%}  {f}")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main())
