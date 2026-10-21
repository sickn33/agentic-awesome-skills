#!/usr/bin/env python3
"""V7 · KV cache — procedural sound bed on the shared library (lib/sfxlib.py).

    python3 tools/sfx.py        -> assets/audio/sfx.wav (48 kHz stereo, 45 s)

Every event time is read from the same story the picture uses (lib/story.js), with the same small offsets as
index.html, so a re-timed narration re-times the sound too. Levels sit well under the voice; the unvoiced recap
(40.3 s →) is lifted.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
import sfxlib  # noqa: E402
from sfxlib import Bed, blip, chime, click, pop, shimmer, swell, swipe, thump, tick, tink, whoosh, zap  # noqa: E402

STORY = json.loads(re.search(r"window\.STORY = (\{.*\});", (ROOT / "lib" / "story.js").read_text(encoding="utf-8"), re.S).group(1))
LINES = {L["i"]: L for L in STORY["lines"]}


def at(line: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in LINES[line]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(f"{unit!r} #{nth} not in line {line}")


DUR = STORY["duration"]
RECAP = STORY["recap"]["start"]
END = STORY["end"]["start"]
bed = Bed(DUR, seed_value=20261005)
place = bed.place


def typing(t0: float, n: int, cps: float, gain: float, every: int = 2, pan: float = -0.3) -> None:
    bed.typing(t0, max(1, n // every), cps / every, gain, pan)


def travel(a: float, b: float, pan: float) -> None:
    place(whoosh(b - a + 0.25), a - 0.05, -27, pan)


# ---------------- 图 1 · tokens pop out one at a time; the new one looks back ----------------
t_emit = [at(1, "token", 1), at(1, "token", 2), at(1, "蹦"), at(2, "蹦")]
place(swipe(0.45, 600, 3000), 0.4, -35, -0.2)  # the model box is drawn
typing(at(1, "回"), 9, 16, -38, every=1, pan=-0.5)  # the prompt
typing(1.0, 60, 60, -42, every=3, pan=-0.5)  # the decode loop
for i, te in enumerate(t_emit):
    place(blip(523.3 + 60 * i, 0.16), te - 0.06, -33, -0.1)  # the model fires
    place(pop(820 + 110 * i), te + 0.05, -26, -0.1 + 0.15 * i)  # a token pops out
    place(tick(2600), te + 0.3, -38, 0.1 + 0.15 * i)  # it lands in its slot
t_back, t_all = at(2, "回"), at(2, "所")
for k in range(4):  # one look-back arc per earlier token, sweeping left
    place(swipe(0.3, 1500, 6000), t_back + k * 0.13, -36, 0.3 - 0.25 * k)
place(shimmer(0.6), t_all - 0.05, -34, -0.2)  # everything earlier lights at once
place(blip(1046.5, 0.2), t_all, -33)
typing(t_emit[1] + 0.3, 12, 32, -40)  # note: 自回归
typing(at(2, "token", 2) + 0.15, 15, 32, -40)  # note: 注意力
typing(t_all + 0.23, 36, 40, -42, every=3, pan=0.4)  # footnote ¹
travel(at(2, "token", 2) + 0.25, 7.74, 0.4)

# ---------------- 图 2 · no cache: the triangle of recomputation ----------------
t_row0, t_re, t_slow = at(3, "每"), at(3, "重"), at(3, "越")
for r in range(8):
    place(tick(1800 + 160 * r), t_row0 + r * 0.1, -36, -0.4)  # step n: n cells
    place(click(0.5), t_row0 + r * 0.1 + 0.02, -40, 0.4)  # its bar in the chart
place(thump(80, 0.35), t_re, -25)  # 重新算: the repeats go red
for r in range(1, 8):
    place(tick(1400), t_re + r * 0.035, -38, -0.3)
place(swipe(0.45, 1200, 4500), at(3, "算") + 0.05, -34, -0.3)  # the checker's revision cloud
place(tick(3000), t_row0 + 1.25, -40, -0.2)  # dimension ticks
gap, t = 0.06, t_slow  # 越写越慢: a clock that keeps slowing down
while t < t_slow + 1.2:
    place(tick(2200), t, -35, 0.4)
    t += gap
    gap *= 1.28
place(swipe(0.6, 900, 3500), t_slow, -36, 0.4)  # the ramp is drawn
typing(at(3, "慢") + 0.25, 14, 32, -40)  # note
travel(at(3, "慢") + 0.4, at(4, "KV"), 0.4)

# ---------------- 图 3 · KV cache: compute once, store; the new token only computes itself, then looks up ----------------
t_kv = at(4, "KV")
place(thump(70, 0.4), t_kv, -24)  # title moment
place(swipe(0.6, 500, 3000), t_kv, -36, 0.2)  # the cache table is drawn
for i in range(4):
    place(click(0.7), at(4, "每") + i * 0.08, -36, -0.5)  # tokens arrive
    place(pop(1180 + 40 * i), at(4, "Key") + i * 0.07, -31, -0.3)  # K
    place(pop(760 + 30 * i), at(4, "Value") + i * 0.07, -31, -0.2)  # V
t_once = at(4, "一")
place(thump(110, 0.25), t_once, -24, -0.3)  # ×1 stamp
place(click(1.4), t_once, -27, -0.3)
for i in range(4):  # 存起来: each pair slides into its row
    place(swipe(0.4, 800, 3200), at(4, "存") + i * 0.09, -37, -0.2 + 0.1 * i)
    place(tick(2400), at(4, "存") + i * 0.09 + 0.42, -38, 0.2)
typing(at(4, "来") + 0.3, 16, 32, -40)  # note K / V
t_new, t_that, t_go, t_scan, t_look = at(5, "新"), at(5, "那"), at(5, "再"), at(5, "缓"), at(5, "查")
place(pop(1400), t_new - 0.05, -25, -0.5)  # the new token
for k, f in enumerate([1600, 1180, 760]):  # its Q, K, V
    place(pop(f), t_new + 0.12 * k, -31, -0.4)
place(blip(880, 0.2), t_new + 0.2, -34, 0.5)  # the contrast bars
place(swipe(0.42, 800, 3200), t_that + 0.02, -35, 0.0)  # appended as a new row
place(whoosh(0.42, 0.4), t_go, -32, -0.1)  # Q goes to the cache
for i in range(5):
    place(tick(3600), t_scan + i * 0.12, -36, 0.0)  # scanning the keys
place(shimmer(0.8), t_look, -31, -0.3)  # the values flow back
place(whoosh(0.4, 0.3), at(5, "个") + 0.05, -38, 0.5)  # the mini triangle collapses
typing(t_look + 0.18, 30, 40, -42, every=3)  # footnote
travel(t_look + 0.35, at(6, "代"), 0.0)

# ---------------- 图 4 · the cost: memory grows with context; the Llama 2 7B bill ----------------
place(swipe(0.5, 600, 3000), at(6, "显") - 0.3, -35, -0.4)  # the vessel is drawn
for b, tb in enumerate([at(6, "缓"), at(6, "跟"), at(6, "上"), at(6, "下")]):
    place(thump(58 + 12 * b, 0.3), tb, -29, -0.4)  # a band of cache fills in
    place(pop(600 + 90 * b), tb + 0.02, -34, 0.2)  # the counter steps
place(thump(95, 0.35), at(6, "涨"), -24, -0.4)  # 涨
place(zap(0.15), at(6, "涨") + 0.02, -36, -0.4)
typing(at(6, "涨") + 0.35, 11, 32, -40)  # note
t_bill = at(7, "拿")
place(swipe(0.6, 400, 2500), t_bill, -31, 0.5)  # the bill slides in
for k, ta in enumerate([at(7, "每"), at(7, "每") + 0.3, at(7, "token") + 0.05, at(7, "大")]):
    place(click(1.0), ta, -32, 0.5)
    typing(ta + 0.05, 8, 40, -40, pan=0.5)
place(thump(120, 0.2), at(7, "0.5"), -28, 0.4)  # = 524,288 B ≈ 0.5 MB
place(swipe(0.35, 1500, 6000), at(7, "MB"), -35, 0.4)  # highlighter
place(click(1.0), at(7, "4K"), -32, 0.5)
typing(at(7, "4K") + 0.05, 14, 30, -40, pan=0.5)  # × 4,096 个 token
place(swipe(0.35, 1500, 6000), at(7, "2", 2), -35, 0.4)
t_gb = at(7, "GB")
place(whoosh(0.55, 0.5), t_gb, -29, 0.0)  # 2 GB leaves the bill for the vessel
place(thump(70, 0.35), t_gb + 0.55, -25, -0.4)
typing(t_gb + 0.35, 30, 36, -42, every=3, pan=0.5)  # bill footnotes
travel(t_gb + 0.35, at(8, "所"), -0.4)

# ---------------- 图 5 · three revisions that shrink the cache ----------------
place(whoosh(0.5, 0.5), at(8, "共"), -31, -0.5)  # GQA: four K/V merge into one
place(thump(110, 0.25), at(8, "V"), -25, -0.5)  # ÷4
place(click(1.3), at(8, "V"), -28, -0.5)
for k in range(3):
    place(tick(2800), at(8, "PagedAttention") + 0.08 * k, -35, 0.0)  # pages cut
place(whoosh(0.5, 0.4), at(8, "页"), -34, 0.2)  # the unused page is released
for g in range(2):
    place(pop(900 + 200 * g), at(8, "页") + 0.5 + 0.18 * g, -31, 0.0)  # pages land in blocks
place(thump(110, 0.25), at(8, "配"), -25, 0.0)  # 按需
for k in range(8):
    place(tick(4000 - 200 * k), at(8, "量") + 0.15 + 0.03 * k, -37, 0.5)  # 16 bits → 8
place(blip(660, 0.2), at(8, "压"), -33, 0.5)
place(thump(110, 0.25), at(8, "缩"), -25, 0.5)  # ÷2
typing(at(8, "缩") + 0.2, 18, 32, -41)

# ---------------- closing line: the whole sheet, the trade, the newest token ----------------
place(swell(3.6), END - 0.4, -27)
place(whoosh(1.0, 0.4), END - 0.4, -32, 0.0)  # the camera pulls back over the sheet
for k in range(3):
    place(thump(90 - 10 * k, 0.2), at(9, "显") + 0.1 * k + 0.2, -31, 0.5)  # memory blocks drop
place(swipe(0.5, 500, 2000), at(9, "换"), -36, 0.5)  # the beam tips
place(chime(), at(9, "速"), -30, 0.5)  # speed rises
place(shimmer(0.9), at(9, "新"), -32, 0.3)  # the newest token lights
typing(at(9, "新") + 0.15, 20, 40, -42, every=3, pan=-0.3)

# ---------------- recap: a notes sheet is laid over the drawing (no voice: the bed is lifted) ----------------
place(whoosh(0.5, 0.7), RECAP - 0.15, -30, 0.0)
place(thump(70, 0.3), RECAP + 0.3, -32)
typing(RECAP + 0.3, 18, 48, -40, pan=-0.3)
for i in range(len(STORY["recap"]["points"])):
    a = RECAP + 0.75 + i * 0.16
    place(swipe(0.3, 1500, 5000), a, -40, 0.3)
    place(tink(1568 + 120 * i), a + 0.3, -36, 0.4)
typing(RECAP + 1.2, 28, 30, -42, every=3, pan=-0.4)
place(swell(3.6), RECAP + 0.9, -34)

print(bed.write(str(ROOT / "assets" / "audio" / "sfx.wav"), lift_after=(RECAP, 8), fade=0.6))
