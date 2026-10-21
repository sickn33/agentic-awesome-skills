#!/usr/bin/env python3
"""V7 · 图纸与注脚 starter — the procedural sound bed, built from the story alone (lib/story.js + lib/sfxlib.py).

    bash tools/sfx.sh            (= python3 tools/sfx.py)  -> assets/audio/sfx.wav

It mirrors the driver in index.html: the same figures (one or two lines each, a chapter always starts a new one),
the same camera travel windows between figures, the same placeholder phrases. Events:
  - travel between figures: a whoosh along the leader + a tick and a small spark when it lands; a low thump on a new chapter
  - each line: the hold box is drawn (a pen swipe), the beat note is typed, each phrase pops into its slot as it is spoken
  - the closing line: the camera pulls back over the whole sheet (whoosh + swell), the title block is typed
  - the recap: a notes sheet wipes up (whoosh + thump), its points tink in; the unvoiced recap is lifted
When beats.js replaces placeholders with performed scenes, add their sounds below the marked line (or keep this file
as the bed and write tools/sfx_beats.py — see STARTER.md). Levels stay well under the voice (-30 … -42 dB).
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
import sfxlib  # noqa: E402
from sfxlib import Bed, click, pop, shimmer, swell, swipe, thump, tick, tink, whoosh  # noqa: E402

STORY = json.loads(re.search(r"window\.STORY = (\{.*\});", (ROOT / "lib" / "story.js").read_text(encoding="utf-8"), re.S).group(1))
DUR = float(STORY["duration"])
END = STORY.get("end") if (STORY.get("end") or {}).get("line") else None
RECAP = STORY.get("recap") if (STORY.get("recap") or {}).get("points") else None
NOTES = STORY.get("notes") or {}
LINES = {L["i"]: L for L in STORY["lines"]}
SPOKEN = re.compile(r"[A-Za-z\d㐀-鿿]")
PUN = re.compile(r"^[，。、：；！？,.;:!?）)」』”\"'…—]$")
LAT = re.compile(r"^[A-Za-z0-9.%+×/–\-]+$")


def last_unit(i: int) -> float:
    s = [t for u, t in LINES[i]["words"] if SPOKEN.search(u)]
    return s[-1] if s else LINES[i]["end"]


# ---------------- chapters → figures (= the driver's rule) ----------------
chapters = STORY.get("chapters") or [{"n": 1, "key": "all", "title": STORY.get("title", ""), "start": 0, "end": END["start"] if END else DUR}]
body = [L for L in STORY["lines"] if not END or L["i"] != END["line"]]
ch_lines: dict[int, list[int]] = {k: [] for k in range(len(chapters))}
ch_of: dict[int, int] = {}
for L in body:
    k = 0
    for j, c in enumerate(chapters):
        if L["start"] >= c["start"] - 0.25:
            k = j
    ch_lines[k].append(L["i"])
    ch_of[L["i"]] = k
tlen = lambda i: len(LINES[i]["text"])  # noqa: E731
figs: list[dict] = []
for k in range(len(chapters)):
    ls = list(ch_lines[k])
    while ls:
        a = ls.pop(0)
        b = ls[0] if ls else None
        two = b is not None and tlen(a) + tlen(b) <= 72 and max(tlen(a), tlen(b)) <= 50
        if two:
            ls.pop(0)
        figs.append({"ch": k, "lines": [a, b] if two else [a]})
body_end = body[-1]["end"] if body else 0.0
for j, f in enumerate(figs):
    f["arrive"] = 0.0 if j == 0 else LINES[f["lines"][0]]["start"] - 0.1
for j, f in enumerate(figs):
    nxt = figs[j + 1] if j + 1 < len(figs) else None
    hard = nxt["arrive"] if nxt else (END["start"] + 0.4 if END else body_end + 0.5)
    f["leave"] = max(min(last_unit(f["lines"][-1]) + 0.1, hard - 0.75), f["arrive"] + 0.2)
for j, f in enumerate(figs):
    f["show"] = 0.0 if j == 0 else figs[j - 1]["leave"] + 0.1


def chunks(i: int, max_em: float = 7) -> list[float]:
    """Start times of the placeholder's phrases (the driver's chunksOf)."""
    W = LINES[i]["words"]
    groups, cur = [], []
    for k, (u, _) in enumerate(W):
        if PUN.match(u):
            if cur:
                groups.append(cur)
            cur = []
        else:
            cur.append(k)
    if cur:
        groups.append(cur)
    uem = lambda k: 0.6 * len(W[k][0]) if LAT.match(W[k][0]) else len(W[k][0])  # noqa: E731
    is_lat = lambda k: bool(LAT.match(W[k][0]))  # noqa: E731
    out = []
    for ks in groups:
        cum, n = [], 0.0
        for k in ks:
            n += uem(k)
            cum.append(n)
        em = cum[-1]
        parts = min(len(ks), math.ceil(em / max_em))
        s0 = 0
        for m in range(1, parts):
            target = m * em / parts
            best, bs = -1, float("inf")
            for j in range(s0, len(ks) - (parts - m)):
                sc = abs(cum[j] - target) - (1.2 if is_lat(ks[j]) or is_lat(ks[j + 1]) else 0)
                if sc < bs:
                    bs, best = sc, j
            out.append(ks[s0 : best + 1])
            s0 = best + 1
        out.append(ks[s0:])
    return [W[p[0]][1] for p in out]


def note_len(i: int) -> int:
    c = chapters[ch_of[i]]
    lst = NOTES.get(c.get("key", "")) if isinstance(NOTES, dict) else None
    j = ch_lines[ch_of[i]].index(i)
    if isinstance(lst, list) and j < len(lst) and lst[j]:
        return len(lst[j])
    return 12


bed = Bed(DUR, seed_value=20261005)
place = bed.place

# ---------------- figures: travel along the leaders ----------------
for j, f in enumerate(figs):
    if j == 0:
        continue
    prev = figs[j - 1]
    a, b = prev["leave"], f["arrive"]
    place(whoosh(b - a + 0.3), a - 0.05, -27, 0.0)
    place(swipe(min(0.6, b - a), 900, 3600), a + 0.02, -38, 0.3)  # the leader is drawn
    place(tick(2600), b, -33, 0.0)  # it lands: a small spark
    place(tink(1760), b + 0.02, -41, 0.2)
    if f["ch"] != prev["ch"]:
        place(thump(72, 0.35), f["arrive"] + 0.12, -29)  # a new chapter

# ---------------- lines: hold box, beat note, phrases ----------------
for f in figs:
    for n, i in enumerate(f["lines"]):
        L = LINES[i]
        appear = f["show"] + 0.25 * n
        place(swipe(0.45, 1200, 4800), max(0.0, appear), -39, -0.3 + 0.6 * n)  # the construction box is drawn
        bed.typing(L["start"] + 0.05, max(1, note_len(i) // 2), 20, -41, -0.4)  # the beat note is typed
        for k, tc in enumerate(chunks(i)):
            place(pop(760 + 70 * (k % 6)), tc - 0.02, -33, -0.2 + 0.08 * (k % 6))  # a phrase is inked into its slot
            place(click(0.7), tc + 0.01, -40, 0.3)

# ---------------- the closing line: pull back over the whole drawing ----------------
if END:
    e0 = END["start"]
    place(whoosh(1.4, 0.35), e0 - 0.45, -29, 0.0)
    place(swell(min(4.0, DUR - e0 + 0.3)), e0 - 0.4, -28)
    W = LINES[END["line"]]["words"]
    for p in END.get("emphasis") or []:
        units = [u for u, _ in W]
        target = p.replace(" ", "")
        for s in range(len(units)):
            acc = ""
            for e in range(s, len(units)):
                acc += units[e]
                if len(acc) >= len(target):
                    break
            if acc == target:
                place(shimmer(0.6), W[s][1] - 0.03, -35, 0.2)
                break
    bed.typing(e0 + 0.3, 14, 30, -42, 0.4)  # the title block
elif body and DUR - figs[-1]["leave"] > 1.2:
    place(whoosh(1.4, 0.35), figs[-1]["leave"], -29, 0.0)

# ---------------- the recap: a notes sheet over the drawing (no voice: the bed is lifted) ----------------
if RECAP:
    r0 = RECAP["start"]
    place(whoosh(0.5, 0.7), r0 - 0.15, -30, 0.0)
    place(thump(70, 0.3), r0 + 0.3, -32)
    bed.typing(r0 + 0.3, 18, 48, -40, -0.3)
    for k in range(len(RECAP["points"])):
        a = r0 + 0.75 + k * 0.16
        place(swipe(0.3, 1500, 5000), a, -40, 0.3)
        place(tink(1568 + 120 * k), a + 0.3, -36, 0.4)
    bed.typing(r0 + 1.2, 28, 30, -42, -0.4)
    place(swell(min(3.6, max(0.5, DUR - r0 - 0.9))), r0 + 0.9, -34)

# ---------------- performed beats: add their sounds here (story.at / story.phrase times, see STARTER.md) ----------------

print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), lift_after=(RECAP["start"], 8) if RECAP and RECAP["start"] < DUR else None, fade=0.6))
