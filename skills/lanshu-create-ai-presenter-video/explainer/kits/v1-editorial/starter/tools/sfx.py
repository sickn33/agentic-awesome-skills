#!/usr/bin/env python3
"""V1 editorial 「留白」 — the restrained sound bed, built from the story alone (lib/story.js).

    bash tools/sfx.sh            (= python3 tools/sfx.py)  -> assets/audio/sfx.wav

Procedural (lib/sfxlib.py), timed from the same anchors the picture uses, so a re-timed story re-times the sound.
Editorial restraint: quiet air for page turns, a pen stroke for the chip's rule and for notes that write on, soft
paper pops for things that appear, one low swell under the closing line and the recap. Everything sits far under
the voice; the unvoiced recap is lifted. A draft story (story.draft, silent narration) gets a soft tick per spoken
unit so the timing can be heard.

Two sections:
  CHROME — page turns, chapter chips, closing line, recap: keep.
  BEATS  — the placeholder beats' sounds: replace with your scene's sounds as you replace the placeholders
           (paper `pop` for appearances, pen `swipe` for drawn lines, `click` for blocks landing, `thump` for one climax
           per chapter; times = story anchors, exactly as in beats.js). Levels −32 … −50 dB.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import Bed, chime, click, pop, swell, swipe, tick, tink, whoosh  # noqa: E402

story = json.loads(re.search(r"window\.STORY = (.*);\s*$", (ROOT / "lib/story.js").read_text(encoding="utf-8"), re.S).group(1))
DUR = float(story["duration"])
LINES = story["lines"]
line = lambda i: LINES[i - 1]
END = story.get("end") or {}
END_LINE = END.get("line") if END.get("line") and END.get("line") <= len(LINES) else None
REC = story.get("recap") if story.get("recap") and story["recap"].get("points") and story["recap"]["start"] < DUR - 0.05 else None
CH = story.get("chapters") or [{"n": 1, "key": "", "title": story.get("title", ""), "start": 0.0,
                                "end": line(END_LINE)["start"] if END_LINE else DUR}]
N = len(CH)
LAT = re.compile(r"[A-Za-z\d]")
SPOKEN = re.compile(r"[A-Za-z\d㐀-鿿]")


def span(i: int, text: str):
    """story.span(line, text) → (start, end) or None (as core.js)."""
    L = line(i)
    units = [w[0] for w in L["words"]]
    want = re.sub(r"\s", "", text)
    for s in range(len(units)):
        acc, e = "", s
        while e < len(units) and len(acc) < len(want):
            acc += units[e]
            e += 1
        if acc == want:
            n = e
            while n < len(units) and not SPOKEN.search(units[n]):
                n += 1
            return L["words"][s][1], (L["words"][n][1] if n < len(units) else L["end"])
    return None


def terms(L: dict) -> list[float]:
    """start times of the line's Latin / number runs (the pinned labels in beats.js), first occurrence of each."""
    out, cur, seen = [], None, set()
    words = L["words"]
    for k, (u, t) in enumerate(words):
        latin = bool(LAT.search(u)) and not re.search(r"[⺀-鿿]", u)
        join = cur is not None and re.fullmatch(r"[–\-/.×+]", u) and k + 1 < len(words) and LAT.search(words[k + 1][0])
        if latin or join:
            if cur is None:
                cur = [t, ""]
            cur[1] += u
        elif cur is not None:
            out.append(tuple(cur))
            cur = None
    if cur is not None:
        out.append(tuple(cur))
    res = []
    for t, txt in out:
        if txt not in seen:
            seen.add(txt)
            res.append(t)
    return res[:5]


# ---- stations and page turns: the same rule as the driver in index.html ----
chap_of, lines_of = {}, [[] for _ in range(N)]
for L in LINES:
    if L["i"] == END_LINE:
        continue
    k = 0
    for c in range(N):
        if CH[c]["start"] <= L["start"] + 0.05:
            k = c
    chap_of[L["i"]] = k
    lines_of[k].append(L["i"])
turns = [CH[k]["start"] - 0.3 for k in range(1, N)] + ([line(END_LINE)["start"] - 0.45] if END_LINE else [])
for i in range(len(turns)):
    if i:
        turns[i] = max(turns[i], turns[i - 1] + 0.4)
    turns[i] = max(0.1, turns[i])
durs = [max(0.35, min(0.9, ((turns[i + 1] if i + 1 < len(turns) else DUR) - turns[i]) * 0.6)) for i in range(len(turns))]

bed = Bed(DUR, seed_value=20261005)
P = bed.place
draft = bool(story.get("draft"))

# =============================== CHROME ===============================
P(pop(560), 0.05, -46, pan=-0.3)                                   # the first page settles
for t, d in zip(turns, durs):                                      # page turns to the right
    P(whoosh(d + 0.15, 0.45), t, -40, pan=0.3)
    P(pop(600), t + d - 0.05, -46, pan=0.4)
for c in CH:                                                       # the chapter chip: numeral + a hairline that draws
    P(tick(2600), c["start"] + 0.05, -46, pan=-0.7)
    P(swipe(0.45, 1400, 4800), c["start"] + 0.1, -50, pan=-0.7)
    P(swipe(0.5, 1200, 4200), c["start"] + 0.45, -52, pan=-0.6)    # the standfirst wipes in
if END_LINE:                                                       # the closing line: a low swell, the red rule
    EL = line(END_LINE)
    s0 = EL["start"] - 0.3
    s1 = min(DUR, (REC["start"] + 2.0) if REC else DUR)
    P(swell(s1 - s0), s0, -40)
    for e in END.get("emphasis") or []:
        sp = span(END_LINE, e)
        if sp:
            P(tink(1047), sp[0], -44, pan=-0.3)
    last = [w[1] for w in EL["words"] if SPOKEN.search(w[0])]
    if last:
        P(swipe(0.6, 1600, 5200), last[-1], -46, pan=-0.4)
if REC:                                                            # recap: a new page, leaders, a reading highlight
    R0, R1 = REC["start"], REC.get("end", DUR)
    P(whoosh(0.7, 0.4), R0 - 0.05, -40, pan=0.5)
    P(chime(), R0 + 0.45, -40)
    n = len(REC["points"])
    for i in range(n):
        P(click(0.7), R0 + 0.65 + i * 0.16, -42, pan=-0.4 if i < (n + 1) // 2 else 0.4)
    ha = R0 + 0.75 + n * 0.16 + 0.25
    step = max(0.45, (R1 - 0.35 - ha) / n)
    for i in range(n):
        P(tick(2200 + 150 * i), ha + i * step, -44, pan=-0.3 if i < (n + 1) // 2 else 0.3)

# =============================== BEATS (placeholders — replace with your scene's sounds) ===============================
notes = story.get("notes") or {}
for k in range(N):
    ln = lines_of[k]
    key_notes = notes.get(CH[k].get("key", ""), []) if CH[k].get("key") else []
    for j, i in enumerate(ln):
        L = line(i)
        t_in = L["start"] - 0.3
        P(click(0.6), t_in, -46, pan=-0.6)                         # the 「待演绎」 tag lands
        if j < len(key_notes):
            P(swipe(0.6, 1200, 4600), t_in + 0.1, -48, pan=-0.4)   # the beat note writes on
        span_t = max(0.5, L["end"] - L["start"])
        for t in terms(L):                                         # a term pinned to the strip
            pan = -0.8 + 1.6 * min(1.0, max(0.0, (t - L["start"]) / span_t))
            P(pop(820), t - 0.1, -40, pan=pan)
            P(swipe(0.25, 1800, 5200), t, -50, pan=pan)
        if j + 1 < len(ln):                                        # the beat files into the ledger row
            tf = line(ln[j + 1])["start"] - 0.3
            P(whoosh(0.5, 0.5), tf, -50, pan=0.2)
            P(click(0.9), tf + 0.5, -46, pan=-0.6)
        if draft:                                                  # no voice: let the timing be heard
            for u, t in L["words"]:
                if SPOKEN.search(u):
                    P(tick(1900), t, -44, pan=-0.8 + 1.6 * min(1.0, max(0.0, (t - L["start"]) / span_t)))
if END_LINE and END.get("emphasis"):                               # the closing card's tiles
    for e in END["emphasis"]:
        sp = span(END_LINE, e)
        if sp:
            P(pop(900), sp[0] - 0.12, -42, pan=0.5)
if END_LINE and draft:
    EL = line(END_LINE)
    for u, t in EL["words"]:
        if SPOKEN.search(u):
            P(tick(1900), t, -46, pan=0.0)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(REC["start"], 8) if REC else None))
