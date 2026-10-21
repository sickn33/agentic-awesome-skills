#!/usr/bin/env python3
"""The v9-clay starter's sound bed, on the shared procedural library (lib/sfxlib.py).

    bash tools/sfx.sh        (= python3 tools/sfx.py)  ->  assets/audio/sfx.wav (48 kHz stereo)

The town is the soundtrack. From the story alone (tools/plan.mjs reads lib/story.js and the kit's key phrase, exactly as
the picture does): the camera's whoosh between plots and a pin that plops up as each chapter begins; a soft pad sliding
in under each new row; one clay plop per type tile landing as its unit is spoken (the style's "writing" texture); a swell
under the closing line with the flag sweeping up and a chime at the top; then the unvoiced recap lifted — a pull-out
whoosh, a pop for the centre sticker, one pop per card, a chime and a warm bed so it never drops to silence.

When beats.js performs real scenes: set PLACEHOLDERS = False (no row pads / type plops) and add the scene's own sounds in
the marked section, with times from the same story (see the KV film's tools/sfx.py for a fully performed bed).
Nothing is sampled or downloaded; a fixed seed keeps the file identical run to run. Levels sit well under the voice.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import Bed, chime, click, pop, swell, swipe, thump, tink, whoosh  # noqa: E402

PLACEHOLDERS = True  # the starter's draft beats (row pads + clay type); False once beats.js performs the scenes

PLAN = json.loads(subprocess.check_output(["node", str(ROOT / "tools" / "plan.mjs")], cwd=ROOT))
DUR = PLAN["duration"]
LINE = {L["i"]: L for L in PLAN["lines"]}
bed = Bed(DUR, seed_value=20261005)
place = bed.place


def plop(t: float, gain: float, pan: float = 0.0, f0: float = 150) -> None:
    """A clay thing landing: a soft low body and a little tap."""
    place(thump(f0, 0.2), t, gain, pan)
    place(click(0.6), t, gain - 4, pan)


# ---------------- chapters: the camera walks to the next plot, its pin plops up (same times as index.html) ----------------
for k, ch in enumerate(PLAN["chapters"]):
    pan = -0.5 + (k % 4) * 0.33
    if k:
        prev = [LINE[i] for i in PLAN["chapters"][k - 1]["lines"]]
        depart = prev[-1]["end"] - 0.3 if prev else ch["start"] - 0.6
        place(whoosh(max(0.7, min(1.6, ch["start"] + 0.9 - depart)), 0.5), depart, -37, pan)
    land = ch["start"] + 0.45  # pin pops at start + 0.1 over 0.35 s
    plop(land, -31, pan, 170)
    place(pop(1180 + 60 * (k % 4)), ch["start"] + 0.12, -36, pan)

# ---------------- draft beats: a pad slides in under each row, then one clay type tile per spoken key-phrase unit ----------------
if PLACEHOLDERS:
    for L in PLAN["lines"]:
        place(swipe(0.32, 600, 2200), L["start"] - 0.22, -42, -0.1)
        for n, t in enumerate(L["tiles"]):
            plop(t + 0.08, -34 - 0.3 * (n % 3), -0.35 + 0.07 * (n % 10), 140 + 12 * (n % 4))

# ---------------- your scene's sounds (times from the same story: LINE[i]["start"], PLAN["lines"] …) ----------------

# ---------------- the closing line: a swell, the flag sweeping up the pole, a chime when it tops out ----------------
if PLAN["end"]:
    e = PLAN["end"]
    fa, fd = e["start"] - 0.1, max(0.8, (e["end"] - e["start"]) * 0.8)
    place(swell(e["end"] - e["start"] + 1.0), e["start"] - 0.3, -32, 0.0)
    place(pop(900), fa - 0.15, -34, 0.1)
    place(swipe(fd, 500, 1700), fa, -40, 0.1)
    place(chime(), fa + fd, -33, 0.1)
    place(tink(2093), fa + fd + 0.05, -38, 0.2)

# ---------------- recap: pull-out, centre sticker, one pop per card, a chime, a warm bed ----------------
rc = None
if PLAN["recap"]:
    rc = PLAN["recap"]["start"]
    place(whoosh(1.0, 0.4), rc - 0.4, -38)
    place(pop(700), rc, -30)
    for k in range(PLAN["recap"]["points"]):
        place(pop(820 + (k % 5) * 110), rc + 0.25 + k * 0.32, -30, -0.45 + (k % 4) * 0.3)
    place(chime(), rc + 0.25 + PLAN["recap"]["points"] * 0.32 + 0.3, -32)
    if DUR > rc:
        place(swell(DUR - rc + 0.2), rc - 0.2, -31)

print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), gain_db=8, lift_after=(rc, 8) if rc is not None and rc < DUR else None))
