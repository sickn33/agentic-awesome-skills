#!/usr/bin/env python3
"""Mechanical sweep for the humanize skill. Stdlib only.

Usage: python check.py <file>   (or - for stdin)

Counts what eyes miss in a final read: dashes, semicolons, stock AI words,
filler transitions, pause-and-point lines, closers, bold-label starts, and the
sentence-length band. It flags; it never rewrites. A hit is a prompt to look,
not a verdict.
"""
import re
import statistics
import sys

AI_WORDS = ("delve bolster illuminate elucidate transcend intertwine espouse exemplify "
            "underpin underscore tapestry synergy beacon interplay intricacies intricate "
            "symphony kaleidoscope myriad plethora advancements vibrant meticulous "
            "cutting-edge game-changing unparalleled commendable indelible poignant "
            "tireless unwavering unyielding timeless ever-evolving").split()
AI_PHRASES = ["shed light on", "grapple with", "important to note", "stands as a testament",
              "navigate the complexities", "key takeaway", "paving the way", "look no further",
              "that being said", "in today's fast-paced", "ever-changing landscape",
              "harness the power", "thrilled to announce", "excited to announce"]
MARKETING = ["empower", "unlock", "elevate", "seamless", "streamline", "revolutioniz",
             "supercharge", "next-level", "best-in-class", "world-class", "game-changer"]
TRANSITIONS = ["Additionally", "Furthermore", "Moreover", "However", "Importantly", "Critically",
               "Notably", "Ultimately", "Therefore", "In fact", "In conclusion", "Lastly",
               "That said", "Needless to say", "In other words"]
POINTING = [r"here'?s (the thing|what|why)", r"let me (be clear|explain)", r"let'?s (break|dive)",
            r"^[A-Z][^.:!?\n]{2,40}: [a-z]", r"notice how", r"as you can see", r"this means that",
            r"what do you think\?", r"\bthoughts\?\s*$", r"the bottom line", r"let that sink in",
            r"it'?s not (just )?(about )?[^.]{1,40}[,.;] it'?s", r"\bnot just\b[^.]{1,60}\bbut\b"]
HEDGES = ["arguably", "it's worth noting", "it is worth noting", "could potentially",
          "it's important to note", "it is important to note"]
OPENER_WORDS = {"the", "it's", "that's", "this", "you", "it", "these"}


def sentences(text):
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [p.strip() for p in parts if len(p.strip().split()) >= 2]


def check(text):
    low = text.lower()
    out = []
    n_words = len(text.split()) or 1

    def flag(label, hits):
        if hits:
            out.append(f"{label}: {hits}")

    flag("em/en dashes", text.count("—") + len(re.findall(r" – | -- ", text)))
    flag("semicolons", text.count(";"))
    flag("AI words", [w for w in AI_WORDS if re.search(r"\b" + re.escape(w), low)])
    flag("AI phrases", [p for p in AI_PHRASES if p in low])
    flag("marketing words", [w for w in MARKETING if w in low])
    flag("filler transitions", [t for t in TRANSITIONS
                                if re.search(r"(^|[.!?]\s+|\n)" + t + r"\b", text)])
    flag("pause-and-point / closers / contrasts",
         [m.group(0)[:50] for p in POINTING for m in re.finditer(p, text, re.I | re.M)])
    flag("filler hedges", [h for h in HEDGES if h in low])
    flag("bold-label starts", len(re.findall(r"^\s*\*\*[^*]{1,60}(?:\*\*[.:]|[.:]\*\*)", text, re.M)))
    flag("exclamation marks", text.count("!"))

    lens = [len(s.split()) for s in sentences(text)]
    if len(lens) >= 4:
        med = statistics.median(lens)
        band = sum(1 for x in lens if abs(x - med) <= 5) / len(lens)
        mean = statistics.mean(lens)
        note = ""
        if band >= 0.7:
            note = " (uniform: merge short ones)" if mean < 11 else " (uniform: vary)"
        out.append(f"sentences: {len(lens)}, mean {mean:.1f} words, "
                   f"{band:.0%} within 5 words of the median{note}")
        starts = [s.split()[0].lower().strip('"\'') for s in sentences(text)]
        share = sum(1 for s in starts if s in OPENER_WORDS) / len(starts)
        if share >= 0.4:
            out.append(f"openers: {share:.0%} of sentences start with The/It/This/That/You")
    out.append(f"words: {n_words}")
    return out


if __name__ == "__main__":
    sys.stdin.reconfigure(encoding="utf-8")
    src = sys.stdin.read() if len(sys.argv) < 2 or sys.argv[1] == "-" else \
        open(sys.argv[1], encoding="utf-8").read()
    print("\n".join(check(src)))
