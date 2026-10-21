#!/usr/bin/env python3
"""V6 cinematic sound bed for any story: a low room, whooshes on the camera's station-to-station moves, a soft
hit as each station is reached, a thump + read blip when a line's plaque rises, a porcelain tick as each spoken
unit lands as a tile, a swell and a look-back whoosh under the closing line (a shimmer on each emphasis), and a
chime + lift for the unvoiced recap.

    bash tools/sfx.sh            (or python3 tools/sfx.py)  -> assets/audio/sfx.wav

Every time comes from lib/story.js, with the same offsets index.html uses, so a re-timed story re-times the
sound. When a line gets a performed scene in beats.js, add its number to PERFORMED (drops its placeholder sounds)
and place sounds for that scene's actions at the bottom, the way the KV film's tools/sfx.py does. Procedural only (lib/sfxlib.py); levels sit far under the voice.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import SR, Bed, blip, chime, lowpass, rng, shimmer, swell, thump, tick, whoosh  # noqa: E402

story = json.loads((ROOT / "lib/story.js").read_text(encoding="utf-8").split("window.STORY = ", 1)[1].rstrip().rstrip(";"))
LINES = story["lines"]
DUR = float(story["duration"])
END = story.get("end")
REC = story.get("recap")
END_LINE = END["line"] if END else None
CH = story.get("chapters") or [{"n": 1, "start": 0.0}]
SPOKEN = re.compile(r"[A-Za-z\d\u3400-\u9fff]")
# line numbers that have a performed scene in beats.js: their placeholder sounds are dropped (add the scene's own below)
PERFORMED: set[int] = set()
bed = Bed(DUR, seed_value=20261005)


def put(sig: np.ndarray, t: float, gain_db: float, pan: float = 0.0) -> None:
    """bed.place, but a sound asked for before 0 s starts at 0 s (lead-ins near the top of the film)."""
    bed.place(sig, max(0.0, t), gain_db, pan)


def room(dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = lowpass(rng.standard_normal(n), 170) * 2.4 + 0.16 * np.sin(2 * np.pi * 41 * t)
    return x * np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 1.5)


def phrase_time(line: dict, text: str) -> float | None:
    """When the first unit of `text` is spoken in `line` (core Story.span, punctuation ignored in the match)."""
    units = [u for u, _ in line["words"]]
    want = re.sub(r"\s", "", text)
    for s in range(len(units)):
        acc = ""
        for e in range(s, len(units)):
            acc += units[e]
            if len(acc) >= len(want):
                break
        if acc == want:
            return line["words"][s][1]
    return None


# ---- room + the opening swell
put(room(DUR), 0.0, -40)
put(swell(min(3.6, DUR)), 0.0, -32)

# ---- camera: station to station (index.html: depart = chapter start - 0.4, arrive = chapter start + 0.75), a swell
#      under each new chapter
for k in range(1, len(CH)):
    s = float(CH[k]["start"])
    put(whoosh(1.15), s - 0.4, -34, 0.3 if k % 2 else 0.15)
    put(thump(72, 0.45), s + 0.62, -37, 0.1)
    put(swell(2.8), s + 0.2, -35)

# ---- lines: the plaque rises and is read; every spoken unit lands as a porcelain tile (placeholder beats)
for L in LINES:
    if L["i"] == END_LINE or L["i"] in PERFORMED:
        continue
    put(thump(118, 0.2), L["start"] - 0.22, -37)
    put(blip(440, 0.4), L["start"] - 0.05, -44, -0.2)
    units = [t for u, t in L["words"] if SPOKEN.search(u)]
    for k, t0 in enumerate(units):
        pan = -0.45 + 0.9 * k / max(1, len(units) - 1)
        put(tick(2300 + 160 * (k % 4)), t0 + 0.15, -43, pan)

# ---- closing line: the look-back move, a swell under the line, a shimmer on each emphasis
if END:
    a = float(END["start"])
    line = LINES[END_LINE - 1]
    put(whoosh(1.7, 0.45), a - 0.25, -34, -0.3)
    put(swell(max(2.5, line["end"] - a + 1.6)), a - 0.4, -30)
    for e in END.get("emphasis") or []:
        t0 = phrase_time(line, e)
        if t0 is not None:
            put(shimmer(0.6), t0, -41)

# ---- recap: the card lands, its points tick in (Kit.recap: point k at start + 0.35 + 0.3·k)
if REC:
    r0 = float(REC["start"])
    put(swell(max(1.0, min(4.8, DUR - r0))), r0 - 0.1, -31)
    put(chime(), r0 + 0.05, -34)
    for k in range(len(REC.get("points") or [])):
        put(tick(2000 + 200 * k), r0 + 0.35 + k * 0.3, -38)

# ---- performed scenes: their own sounds go here (story times via phrase_time(LINES[i - 1], "…"))

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), gain_db=0.0, lift_after=(float(REC["start"]), 7) if REC else None))
