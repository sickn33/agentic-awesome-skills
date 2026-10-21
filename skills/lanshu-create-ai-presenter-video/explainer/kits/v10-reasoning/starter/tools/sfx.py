#!/usr/bin/env python3
"""V10 · 推演 starter — the procedural sound bed, built from the story alone (lib/story.js + lib/sfxlib.py).

    bash tools/sfx.sh            (= python3 tools/sfx.py)  -> assets/audio/sfx.wav

It mirrors the driver in index.html: the same stations (one per chapter), the same camera glide windows between them,
the same placeholder phrases. A restrained bed — soft tones and ticks on construction steps, nothing that competes
with the voice:
  - glide between stations: air along the ⇒ arrow and a soft rising fifth; a tink when it lands; a low warm tone on a
    new chapter; a faint pen stroke while the station's statement is written
  - each line: a soft blip as its step starts (pitch walks up a pentatonic scale), a tick per phrase as its dot grows
  - the closing statement: a swell under it, a shimmer on each emphasis, a small chime for the ∎
  - the recap: air as the canvas glides into its picture, a tink per step, a low swell; the unvoiced recap is lifted
Performed beats: set PERFORMED = True and add their sounds below the marked line with at() / ph() (= story.at /
story.phrase), see STARTER.md. Levels stay well under the voice (-30 … -44 dB).
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
import sfxlib  # noqa: E402
from sfxlib import SR, Bed, blip, chime, env, pop, shimmer, swell, swipe, thump, tick, tink, whoosh  # noqa: E402

STORY = json.loads(re.search(r"window\.STORY = (\{.*\});", (ROOT / "lib" / "story.js").read_text(encoding="utf-8"), re.S).group(1))
DUR = float(STORY["duration"])
END = STORY.get("end") if (STORY.get("end") or {}).get("line") else None
RECAP = STORY.get("recap") if (STORY.get("recap") or {}).get("points") else None
LINES = {L["i"]: L for L in STORY["lines"]}
SPOKEN = re.compile(r"[A-Za-z\d㐀-鿿]")
PUN = re.compile(r"^[，。、：；！？,.;:!?）)」』”\"'…—]$")
LAT = re.compile(r"^[A-Za-z0-9.%+×/–\-]+$")
PENTA = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]


def last_unit(i: int) -> float:
    s = [t for u, t in LINES[i]["words"] if SPOKEN.search(u)]
    return s[-1] if s else LINES[i]["end"]


# ---------------- chapters → stations (= the driver's rule) ----------------
chapters = [dict(c) for c in (STORY.get("chapters") or [{"n": 1, "key": "all", "title": STORY.get("title", ""), "start": 0, "end": END["start"] if END else DUR}])]
for c in chapters:
    c["lines"] = []
body = [L for L in STORY["lines"] if not END or L["i"] != END["line"]]
for L in body:
    c = next((x for x in chapters if L.get("chapter") and x.get("key") == L.get("chapter")), None)
    if c is None:
        c = chapters[0]
        for x in chapters:
            if L["start"] >= x["start"] - 0.25:
                c = x
    c["lines"].append(L["i"])
body_end = body[-1]["end"] if body else 0.0
for j, c in enumerate(chapters):
    c["arrive"] = 0.0 if j == 0 else (max(0.0, LINES[c["lines"][0]]["start"] - 0.15) if c["lines"] else c["start"])
for j, c in enumerate(chapters):
    nxt = chapters[j + 1] if j + 1 < len(chapters) else None
    hard = nxt["arrive"] if nxt else (END["start"] + 0.3 if END else body_end + 0.5)
    c["leave"] = min(last_unit(c["lines"][-1]) + 0.12, hard - 0.7) if c["lines"] else max(c["arrive"] + 0.5, hard - 0.7)
    c["leave"] = max(c["leave"], c["arrive"] + 0.3)
    c["show"] = 0.0 if j == 0 else chapters[j - 1]["leave"]


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
        tot = cum[-1]
        parts = min(len(ks), math.ceil(tot / max_em))
        s0 = 0
        for m in range(1, parts):
            target = m * tot / parts
            best, bs = -1, float("inf")
            for j in range(s0, len(ks) - (parts - m)):
                sc = abs(cum[j] - target) - (1.2 if is_lat(ks[j]) or is_lat(ks[j + 1]) else 0)
                if sc < bs:
                    bs, best = sc, j
            out.append(ks[s0 : best + 1])
            s0 = best + 1
        out.append(ks[s0:])
    return [W[p[0]][1] for p in out]


def glide(f0: float, f1: float, dur: float) -> np.ndarray:
    """A soft sine that slides from f0 to f1 (the camera riding an arrow)."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.sin(np.pi * t / dur) ** 1.5


def warm(f: float = 110.0, dur: float = 0.9) -> np.ndarray:
    """A low warm tone for a new station: root + fifth, slow attack."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * 1.5 * f * t) + 0.2 * np.sin(2 * np.pi * 2 * f * t)) * env(n, 0.06, dur / 3)


def at(line: int, unit: str, nth: int = 1) -> float:
    """= story.at(line, unit, nth): when the nth occurrence of a unit is spoken."""
    k = 0
    for u, t in LINES[line]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(f"{unit} #{nth} not in line {line}")


def ph(line: int, text: str) -> float:
    """= story.phrase(line, text): when the first unit of a phrase is spoken."""
    W = LINES[line]["words"]
    want = text.replace(" ", "")
    for s in range(len(W)):
        acc = ""
        for e in range(s, len(W)):
            acc += W[e][0]
            if len(acc) >= len(want):
                break
        if acc == want:
            return W[s][1]
    raise KeyError(f"{text} not in line {line}")


PERFORMED = False  # set True once beats.js performs every line (then no placeholder ticks; add the beats' sounds below)
bed = Bed(DUR, seed_value=20261008)
place = bed.place

# ---------------- stations: glide along the ⇒ arrows ----------------
for j, c in enumerate(chapters):
    if j > 0:
        a, b = chapters[j - 1]["leave"], c["arrive"]
        d = max(0.35, b - a)
        place(whoosh(d + 0.3, 0.5), a - 0.05, -31, 0.0)
        place(glide(330.0, 495.0, d + 0.2), a, -40, 0.15)
        place(tink(PENTA[(j + 2) % len(PENTA)] * 2), b + 0.02, -39, 0.2)
        place(warm(110.0 if j % 2 else 98.0), b + 0.05, -33)
    place(swipe(0.8, 900, 3600), c["show"] + 0.15, -44, -0.3)  # the station's statement is written

# ---------------- lines: a step starts, its phrases are built ----------------
for c in chapters:
    for k, i in enumerate(c["lines"]):
        L = LINES[i]
        place(blip(PENTA[(k + c.get("n", 1)) % len(PENTA)], 0.28), L["start"] - 0.02, -38 if not PERFORMED else -40, -0.2 + 0.1 * k)
        if not PERFORMED:  # placeholders: a tick as each phrase's dot grows
            for m, tc in enumerate(chunks(i)):
                place(tick(2400 + 160 * (m % 6)), tc - 0.02, -39, -0.3 + 0.12 * (m % 6))

# ---------------- the closing statement: the whole canvas, pulled back ----------------
if END:
    e0 = END["start"]
    place(whoosh(1.4, 0.35), e0 - 0.3, -30, 0.0)
    place(swell(min(4.2, DUR - e0 + 0.3)), e0 - 0.4, -28)
    W = LINES[END["line"]]["words"]
    units = [u for u, _ in W]
    for p in END.get("emphasis") or []:
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
    spoken = [t for u, t in W if SPOKEN.search(u)]
    if spoken:
        place(chime(), spoken[-1] + 0.35, -36, 0.1)  # ∎
elif body and DUR - chapters[-1]["leave"] > 1.2:
    place(whoosh(1.4, 0.35), chapters[-1]["leave"], -30, 0.0)

# ---------------- the recap: the canvas glides into its picture, the steps are built ----------------
if RECAP:
    r0 = RECAP["start"]
    place(whoosh(0.9, 0.5), r0 - 0.15, -32, 0.0)
    for k in range(len(RECAP["points"])):
        a = r0 + 0.7 + k * 0.32
        place(tink(PENTA[(k + 3) % len(PENTA)] * 2), a, -36, 0.3)
        place(tick(3000), a + 0.1, -42, -0.2)
    place(swell(min(3.8, max(0.5, DUR - r0 - 0.6))), r0 + 0.6, -34)

# ---------------- performed beats: add their sounds here (story.at / story.phrase times, see STARTER.md) ----------------

print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), lift_after=(RECAP["start"], 8) if RECAP and RECAP["start"] < DUR else None, fade=0.6))
