#!/usr/bin/env python3
"""Sound bed for KV cache · V8 黑板报, on the shared lib/sfxlib.py: every event is procedural and lands on the picture.

    node lib/kit/chalklog.mjs .                              # read the chalk event log back from the page
    python3 tools/sfx.py          # -> assets/audio/sfx.wav (48 kHz stereo, 45 s)

The chalk log (assets/audio/chalk-log.json, written by Kit.log()) holds every written character, long stroke, quick
tick, tap, erasure, camera move and named mark (token pops, the look-back, the pull-back, the recap box). The story
gives the closing line. The voice ends at 39.7 s; the unvoiced mind-map review after 40.3 s is lifted 8 dB.
Nothing is sampled or downloaded; a fixed seed keeps the file identical run to run. Levels sit under the narration.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
import sfxlib as sx  # noqa: E402

LOG = json.loads((ROOT / "assets/audio/chalk-log.json").read_text())
STORY = json.loads((ROOT / "lib/story.js").read_text(encoding="utf-8").split("window.STORY = ", 1)[1].strip().rstrip(";"))
DUR = float(STORY["duration"])
MARK = LOG["marks"]
RECAP = STORY["recap"]["start"]
END_START = STORY["end"]["start"]

bed = sx.Bed(DUR, seed_value=20261005)
rnd = lambda: float(sx.rng.random())

# chalk: one scrape per written character (characters landing within 25 ms share one scrape)
last = -1.0
for at in LOG["chars"]:
    if at - last < 0.025:
        continue
    last = at
    bed.place(sx.chalk(1 + int(rnd() * 3)), at, -34 + (rnd() - 0.5) * 4, (rnd() - 0.5) * 0.6)
for a, b in LOG["lines"]:  # long hand strokes: the cache table, the Q scan, axes, the mind-map branches
    bed.place(sx.chalk_line(b - a), a, -36, (rnd() - 0.5) * 0.4)
for a, b in LOG["quick"]:  # quick strokes drawn without the stick: a softer line
    if b - a >= 0.2:
        bed.place(sx.chalk_line(b - a), a, -41, (rnd() - 0.5) * 0.4)
last = -1.0
for at in LOG["ticks"]:  # triangle cells, hatching, chart points, pages: quick taps
    if at - last < 0.03:
        continue
    last = at
    bed.place(sx.click(0.9), at, -38, -0.2 + (rnd() - 0.5) * 0.3)
for at in LOG["taps"]:  # rings, stamps, ticks land with a firm tap
    bed.place(sx.click(1.5), at, -30, 0.0)
for a, b in LOG["erases"]:  # the felt eraser: GQA drops three K/V pairs, PagedAttention the reserved block, 量化 half of each cell
    bed.place(sx.felt(b - a + 0.08), a, -27, 0.1)
# camera moves: contiguous segments are one move, one whoosh panned toward where the board slides
moves = []
for m in LOG["moves"]:
    if moves and abs(m[0] - moves[-1][1]) < 1e-3:
        moves[-1] = [moves[-1][0], m[1], moves[-1][2] + m[4]]
    else:
        moves.append([m[0], m[1], m[4]])
for a, b, dx in moves:
    bed.place(sx.whoosh(b - a + 0.2), a, -33, max(-0.5, min(0.5, dx / 4000)))
# tokens pop out of the model one at a time
for k, at in enumerate(MARK.get("pop", [])):
    bed.place(sx.pop(820 + 60 * k), at, -29, 0.25)
for at in MARK.get("light", []):  # every earlier token lights up
    bed.place(sx.shimmer(0.6), at, -37, -0.2)
# the closing line: a low swell under 用显存换速度; the board steps back on 那一个
bed.place(sx.swell(3.6), END_START - 0.3, -30)
for at in MARK.get("pullback", []):
    bed.place(sx.thump(80, 0.35), at, -32)
# review: the tagline is underlined, a tap, a swell and the class bell (the 8 dB lift applies on top)
for at in MARK.get("recapBox", []):
    bed.place(sx.click(1.5), at + 0.4, -36, -0.2)
    bed.place(sx.swell(2.0), at - 0.6, -38)
    bed.place(sx.bell(), at + 0.45, -31)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(RECAP, 8), fade=0.35))
