#!/usr/bin/env python3
"""Synthesize the V9「一柜」(KV cache, clay) sound bed on the shared procedural library (lib/sfxlib.py).

    python3 tools/sfx.py        -> assets/audio/sfx.wav (48 kHz stereo, 45 s)

The town is the soundtrack: a robot boops, clay tiles plop onto the desk, noodles of attention stretch, the re-do
staircase clatters slower and slower, a cabinet thuds down, tags and cards pop and slide into drawers, a magnifier
ticks down the K column, a glass storeroom rises and the cabinet stretches with each 1K, pages flip, a balance tips.
Every time is read from lib/story.js (the same story calls as the picture), so a re-timed story re-times the bed.
Nothing is sampled or downloaded; a fixed seed keeps the file identical run to run. Levels sit well under the voice.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
import sfxlib as S  # noqa: E402
from sfxlib import Bed, blip, chime, click, pop, shimmer, swell, swipe, thump, tick, tink, whoosh, zap  # noqa: E402

raw = (ROOT / "lib" / "story.js").read_text(encoding="utf-8")
STORY = json.loads(raw[raw.index("{") : raw.rindex("}") + 1])


def at(line: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in STORY["lines"][line - 1]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(f"{unit} #{nth} not in line {line}")


def start(line: int) -> float:
    return STORY["lines"][line - 1]["start"]


def end(line: int) -> float:
    return STORY["lines"][line - 1]["end"]


DUR = STORY["duration"]
bed = Bed(DUR, seed_value=20261005)
place = bed.place


def plop(t: float, gain: float, pan: float = 0.0, f0: float = 150) -> None:
    """A clay thing landing: a soft low body and a little tap."""
    place(thump(f0, 0.2), t, gain, pan)
    place(click(0.6), t, gain - 4, pan)


# ---------------- 1: the robot writes one tile at a time ----------------
place(blip(660, 0.18), at(1, "大"), -34, -0.5)
place(blip(880, 0.14), at(1, "大") + 0.12, -36, -0.5)
place(pop(1250), at(1, "问") - 0.1, -34, -0.6)  # the question bubble
POP = [at(1, "token", 1), at(1, "token", 2), at(1, "蹦"), at(2, "新"), at(5, "新"), at(9, "新")]
for k, land in enumerate(POP):
    pan = -0.6 + 0.15 * k
    place(swipe(0.3, 1500, 5200), land - 0.38, -40, pan)  # out of the robot's hand
    plop(land, -31, pan)
# ---------------- 2: the new tile looks back along three clay noodles ----------------
for j in range(3):
    place(swipe(0.32, 700, 2600), at(2, "回") + j * 0.13, -38, -0.1 - 0.15 * j)
for k in range(3):
    place(tink(1568 + 220 * k), at(2, "所") + k * 0.06, -37, -0.4 + 0.1 * k)
# ---------------- 3: without a cache, every step re-makes all earlier cards (and slows down) ----------------
place(whoosh(0.9, 0.5), at(3, "要") - 0.1, -40, 0.2)
w = [0.18 + 0.05 * n for n in range(8)]
span = at(3, "慢") + 0.14 - at(3, "每")
kk = span / sum(w[1:])
steps, a = [], at(3, "每")
for n in range(8):
    if n:
        a += w[n] * kk
    steps.append(a)
for n, s in enumerate(steps):
    for k in range(n + 1):
        place(click(0.7 + 0.03 * k), s + k * 0.025 + 0.2, -37 - 0.4 * k, -0.5 + 0.12 * k)
    place(thump(120 - 6 * n, 0.22), s + 0.2, -36, -0.2)
place(zap(0.22), at(3, "重"), -38, 0.0)  # waste flashes
place(blip(520, 0.2), at(3, "越", 1), -36, -0.6)  # the robot gets tired
place(blip(390, 0.3), at(3, "越", 1) + 0.18, -36, -0.6)
# ---------------- 4: the card cabinet (KV cache) lands; each token makes K and V once; they go into drawers ----------------
kv = at(4, "KV")
place(whoosh(0.6, 0.7), kv - 0.2, -36, 0.4)
place(thump(70, 0.45), kv + 0.42, -28, 0.4)
place(chime(), kv + 0.45, -36, 0.4)
for k in range(4):
    place(tick(2400 + 200 * k), at(4, "每") + 0.2 * k, -40, -0.5 + 0.1 * k)
for k in range(4):
    place(pop(1400 + 60 * k), at(4, "Key") + 0.07 * k, -34, -0.5 + 0.1 * k)
    place(pop(1000 + 50 * k), at(4, "Value") + 0.07 * k, -34, -0.4 + 0.1 * k)
    place(click(1.4), at(4, "只") + 0.09 * k, -36, -0.4 + 0.1 * k)
    fly = at(4, "存") + 0.16 * k
    place(swipe(0.42, 1200, 4800), fly, -40, -0.3 + 0.15 * k)
    place(thump(170, 0.16), fly + 0.5, -34, 0.4)
    place(click(1.0), fly + 0.5, -36, 0.4)
# ---------------- 5: only the new one computes; its Q scans the K column; the V's flow back ----------------
place(pop(1450), at(5, "那"), -34, 0.0)
place(pop(1050), at(5, "那") + 0.14, -34, 0.0)
place(swipe(0.42, 1200, 4800), at(5, "个") + 0.02, -40, 0.2)
place(thump(170, 0.16), at(5, "个") + 0.52, -34, 0.4)
place(zap(0.18), at(5, "再"), -37, 0.1)
huan, cha = at(5, "缓"), at(5, "查")
for r in range(5):
    place(tick(3000 - 150 * r), huan - 0.05 + (cha - huan - 0.05) * r / 4, -36, 0.3)
for r in range(5):
    place(pop(900 + 80 * r), cha + 0.04 * r + 0.45, -38, 0.0 - 0.1 * r)
place(chime(), cha + 0.55, -38, -0.1)
# ---------------- 6: the cost — a glass storeroom (显存) rises; the cabinet stretches with every 1K ----------------
xian = at(6, "显")
place(whoosh(0.8, 0.4), xian - 0.3, -38, 0.3)
place(swell(1.6), xian - 0.1, -36, 0.3)
for t in (at(6, "缓"), at(6, "跟"), at(6, "上"), at(6, "下")):
    place(tick(2200), t, -36, 0.3)
for t in (at(6, "跟"), at(6, "上"), at(6, "下")):
    place(swipe(0.36, 400, 1800), t - 0.18, -38, 0.3)
    place(thump(95, 0.28), t + 0.05, -32, 0.3)
place(thump(60, 0.5), at(6, "涨"), -29, 0.3)
# ---------------- 7: Llama 2 7B — one token's pair opened up, then × 4096 ----------------
place(pop(1100), at(7, "Llama"), -34, -0.6)
for t in (at(7, "每"), at(7, "个"), at(7, "token"), at(7, "大"), at(7, "0.5")):
    place(pop(1300), t, -35, -0.6)
for k in range(32):  # the drawer fans into 32 layers
    place(tick(2000 + 40 * k), at(7, "个") + 0.012 * k, -42, 0.3)
place(whoosh(0.35, 0.5), at(7, "0.5") - 0.15, -40, 0.3)
place(tink(2093), at(7, "0.5"), -35, 0.3)
place(pop(1300), at(7, "4K"), -35, -0.6)
for t in (at(7, "上"), at(7, "下"), at(7, "文")):
    place(tink(1318.5), t, -37, 0.3)
place(thump(55, 0.6), at(7, "2", 2), -29, 0.3)
place(blip(330, 0.4), at(7, "2", 2) + 0.05, -36, 0.3)
# ---------------- 8: GQA shares one K/V; PagedAttention hands out pages; quantization thins the cards ----------------
gqa, gong = at(8, "GQA"), at(8, "共")
place(whoosh(0.7, 0.5), gqa - 0.5, -38, 0.4)
for k in range(4):
    place(pop(800 + 120 * k), gqa - 0.12 + 0.07 * k, -34, 0.3 + 0.15 * k)
place(whoosh(0.5, 0.5), gong, -38, 0.5)
for k in range(4):
    place(swipe(0.3, 700, 2600), gong + 0.32 + 0.06 * k, -40, 0.4)
for k, t in enumerate((gong + 0.05, gong + 0.22, gong + 0.39)):
    place(S.lowpass(S.rng.standard_normal(int(0.4 * S.SR)), 1400) * S.env(int(0.4 * S.SR), 0.01, 0.12) * 1.4, t, -34, 0.1)
place(tink(1760), at(8, "V"), -34, 0.1)
paged, an = at(8, "PagedAttention"), at(8, "按")
place(swipe(0.4, 900, 3600), paged, -38, 0.1)
for i in range(8):
    place(swipe(0.06, 2500, 7000), an + 0.035 * i, -40, 0.1)
for i in range(8):
    place(pop(1500 - 70 * i), an + 0.32 + (7 - i) * 0.07, -38, 0.1)
place(tink(2349), at(8, "配") - 0.05, -36, 0.1)
place(blip(600, 0.12), at(8, "量") + 0.05, -36, 0.1)
place(blip(450, 0.2), at(8, "量") + 0.2, -36, 0.1)
place(tink(1760), at(8, "压"), -34, 0.1)
# ---------------- 9: the closing — a balance (memory for speed); a spotlight on the newest tile ----------------
e9 = start(9)
place(swell(4.2), e9 - 0.3, -32, 0.0)
place(pop(900), e9 - 0.05, -34, -0.3)
place(thump(110, 0.3), at(9, "显") + 0.03, -32, -0.4)
place(swipe(0.3, 500, 1600), at(9, "显") + 0.05, -40, -0.3)
place(zap(0.2), at(9, "速"), -36, -0.1)
place(thump(130, 0.25), at(9, "速") + 0.03, -33, -0.1)
place(shimmer(1.4), at(9, "新") - 0.05, -36, -0.2)
place(chime(), at(9, "新") + 0.05, -34, -0.2)
# ---------------- review: the centre sticker, then four numbered cards on the town ----------------
rc = STORY["recap"]["start"]
place(whoosh(1.0, 0.4), rc - 0.4, -38)
place(pop(700), rc, -30)
for k in range(len(STORY["recap"]["points"])):
    place(pop(820 + k * 110), rc + 0.25 + k * 0.32, -30, -0.45 + k * 0.3)
place(chime(), rc + 1.75, -32)
place(swell(DUR - rc + 0.2), rc - 0.2, -31)  # a warm bed under the review so it never drops to silence

print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), gain_db=8, lift_after=(rc, 8)))
