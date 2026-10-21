#!/usr/bin/env python3
"""Subtitles (SRT) from a story's word times — for Bilibili CC, YouTube, and platform auto-captions.

Usage: python3 tools/srt.py <story.json | project-dir> [out.srt] [--max 20]
  One cue per narration line; a line longer than --max characters is split at its commas (else at the middle),
  each part timed from its own first and last word. Trailing punctuation is dropped, as platforms expect.
"""
import argparse, json, re, sys
from pathlib import Path

SPOKEN = re.compile(r"[A-Za-z\d㐀-鿿]")
TRIM = "，。、；：！？,.;:!? "


def load(path):
    p = Path(path)
    if p.is_dir():
        text = (p / "lib" / "story.js").read_text(encoding="utf-8")
        return json.loads(re.search(r"window\.STORY = (.*);\s*$", text, re.S).group(1))
    return json.loads(p.read_text(encoding="utf-8"))


def stamp(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def spans(line):
    """each unit's [start, end) in the line's original text, so cue text keeps the script's own spacing"""
    out, pos, text = [], 0, line["text"]
    for u, _ in line["words"]:
        k = text.find(u, pos)
        k = pos if k < 0 else k
        out.append((k, k + len(u)))
        pos = k + len(u)
    return out


def width(s):
    """display width in CJK characters: a Latin letter or digit is about half a character, a space a third"""
    return sum(1.0 if "\u3400" <= c <= "\u9fff" or c in "，。、；：！？" else 0.33 if c == " " else 0.55 for c in s)


def cues(line, limit):
    words, text, sp = line["words"], line["text"], spans(line)
    size = lambda a, b: width(text[sp[a][0]: sp[b - 1][1]].strip(TRIM))

    def split(a, b):   # [a, b) word range → list of ranges, cut at commas when possible
        if size(a, b) <= limit or b - a < 4:
            return [(a, b)]
        commas = [k + 1 for k in range(a, b - 1) if words[k][0] in "，；：、,;:"]
        cands = [k for k in commas if size(a, k) >= 3 and size(k, b) >= 3]
        if not cands:   # no usable comma: cut near the middle, next to a Latin word if one is close
            mid = a + (b - a) // 2
            near = [k for k in range(max(a + 2, mid - 3), min(b - 2, mid + 3) + 1)
                    if re.match(r"[A-Za-z\d]", words[k - 1][0]) or re.match(r"[A-Za-z\d]", words[k][0])]
            cands = near or [mid]
        k = min(cands, key=lambda k: max(size(a, k), size(k, b)))
        return split(a, k) + split(k, b)

    ranges = split(0, len(words))
    out = []
    for n, (a, b) in enumerate(ranges):
        spoken = [w for w in words[a:b] if SPOKEN.match(w[0])] or words[a:b]
        start = spoken[0][1]
        end = words[ranges[n + 1][0]][1] if n + 1 < len(ranges) else line["end"]
        out.append((start, max(end, start + 0.4), text[sp[a][0]: sp[b - 1][1]].strip(TRIM)))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("story"); ap.add_argument("out", nargs="?"); ap.add_argument("--max", type=int, default=20)
    a = ap.parse_args()
    S = load(a.story)
    rows = [c for L in S["lines"] for c in cues(L, a.max)]
    srt = "".join(f"{k}\n{stamp(s)} --> {stamp(e)}\n{text}\n\n" for k, (s, e, text) in enumerate(rows, 1))
    if a.out:
        Path(a.out).write_text(srt, encoding="utf-8")
        print(f"{len(rows)} cues → {a.out}")
    else:
        sys.stdout.write(srt)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
