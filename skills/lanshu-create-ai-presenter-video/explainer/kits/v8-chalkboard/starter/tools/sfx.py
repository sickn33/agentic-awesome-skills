#!/usr/bin/env python3
"""Sound bed for a V8 黑板报 film, on the shared lib/sfxlib.py: every event is procedural and lands on the picture.

    bash tools/sfx.sh        # = node lib/kit/chalklog.mjs . && <numpy python> tools/sfx.py  → assets/audio/sfx.wav

The chalk log (assets/audio/chalk-log.json, written by Kit.log() via lib/kit/chalklog.mjs) holds every written
character, long stroke, quick stroke, tick, tap, erasure, camera move and named mark (Kit.mark / api.mark). The story
(lib/story.js) gives the chapter changes, the line starts, the closing line and the recap. Known marks: pop, light,
pullback, recapBox, lessonEnd, thump, bell; any other mark name gets a soft knock. The unvoiced recap is lifted 8 dB.
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
MARK = LOG.get("marks", {})
END = STORY.get("end") or None
REC = STORY.get("recap") or None
if REC and not (REC.get("points") and REC["start"] < DUR - 1):
    REC = None

bed = sx.Bed(DUR, seed_value=20261005)
rnd = lambda: float(sx.rng.random())

# chalk: one scrape per written character (characters landing within 25 ms share one scrape)
last = -1.0
for at in LOG["chars"]:
    if at - last < 0.025:
        continue
    last = at
    bed.place(sx.chalk(1 + int(rnd() * 3)), at, -34 + (rnd() - 0.5) * 4, (rnd() - 0.5) * 0.6)
for a, b in LOG["lines"]:  # long hand strokes with the stick
    bed.place(sx.chalk_line(b - a), a, -36, (rnd() - 0.5) * 0.4)
for a, b in LOG["quick"]:  # strokes drawn without the stick (frames, borders, rulers): a softer line
    if b - a >= 0.2:
        bed.place(sx.chalk_line(b - a), a, -41, (rnd() - 0.5) * 0.4)
last = -1.0
for at in LOG["ticks"]:  # tallies, hatching, chart points: quick taps
    if at - last < 0.03:
        continue
    last = at
    bed.place(sx.click(0.9), at, -38, -0.2 + (rnd() - 0.5) * 0.3)
for at in LOG["taps"]:  # rings, stamps, the 「待演绎」 tag: a firm tap
    bed.place(sx.click(1.5), at, -30, 0.0)
for a, b in LOG["erases"]:  # the felt eraser
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

# the story: a knock on the board at every chapter change, the chalk touching down at every line start
for c in STORY.get("chapters", [])[1:]:
    bed.place(sx.thump(120, 0.22), c["start"] + 0.05, -40)
end_line = END["line"] if END else None
for L in STORY["lines"]:
    if L["i"] != end_line:
        bed.place(sx.click(0.7), max(0.0, L["start"] - 0.02), -42, -0.1)

# named marks from the page
KNOWN = {"pop", "light", "pullback", "recapBox", "lessonEnd", "thump", "bell"}
for k, at in enumerate(MARK.get("pop", [])):  # things that pop out
    bed.place(sx.pop(820 + 60 * (k % 6)), at, -29, 0.25)
for at in MARK.get("light", []):  # things light up together
    bed.place(sx.shimmer(0.6), at, -37, -0.2)
for at in MARK.get("thump", []):
    bed.place(sx.thump(80, 0.35), at, -32)
for at in MARK.get("bell", []):
    bed.place(sx.bell(), at, -31)
for name, times in MARK.items():
    if name not in KNOWN:
        for at in times:
            bed.place(sx.click(1.2), at, -34, 0.1)

# the closing line: a low swell under it; the board steps back near its end
if END:
    bed.place(sx.swell(3.6), END["start"] - 0.3, -30)
for at in MARK.get("pullback", []):
    bed.place(sx.thump(80, 0.35), at, -32)
# review: the key sentence is underlined / boxed — a tap, a swell and the class bell (the lift applies on top)
for at in MARK.get("recapBox", []):
    bed.place(sx.click(1.5), at + 0.4, -36, -0.2)
    bed.place(sx.swell(2.0), at - 0.6, -38)
    bed.place(sx.bell(), at + 0.45, -31)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(REC["start"], 8) if REC else None, fade=0.35))
