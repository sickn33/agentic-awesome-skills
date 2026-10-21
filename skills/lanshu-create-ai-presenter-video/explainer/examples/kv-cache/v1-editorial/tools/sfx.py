#!/usr/bin/env python3
"""V1 editorial — the restrained sound bed for the KV cache film (45 s).

    python3 tools/sfx.py     -> assets/audio/sfx.wav

Procedural (lib/sfxlib.py), timed from the same word anchors the picture uses (lib/story.js), so a re-timed story
re-times the sound. Editorial restraint: paper taps and soft pops for things that appear, pen strokes for lines that
draw, a slowing clock for 「越写越慢」, quiet air for page turns, one low swell under the closing line and the recap.
Everything sits far under the voice; the unvoiced recap is lifted.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import Bed, blip, chime, click, pop, swell, swipe, thump, tick, tink, whoosh  # noqa: E402

story = json.loads(re.search(r"window\.STORY = (.*);\s*$", (ROOT / "lib/story.js").read_text(encoding="utf-8"), re.S).group(1))
CH = story["chapters"]
R0 = story["recap"]["start"]
DUR = story["duration"]


def at(line: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in story["lines"][line - 1]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(unit)


T = dict(
    big=at(1, "大"), answer=at(1, "回"), tok1=at(1, "token", 1), tok2=at(1, "token", 2), beng=at(1, "蹦"),
    every2=at(2, "每"), xin=at(2, "新"), hui=at(2, "回"), tou=at(2, "头"), kan=at(2, "看"), all=at(2, "所"),
    yaoshi=at(3, "要"), meici=at(3, "每"), recompute=at(3, "重"), slow=at(3, "越", 1), slow2=at(3, "慢"),
    kv=at(4, "KV"), method=at(4, "办"), each=at(4, "每"), key=at(4, "Key"), value=at(4, "Value"), once=at(4, "只"), store=at(4, "存"),
    only=at(5, "只"), newTok=at(5, "新"), thatOne=at(5, "那"), again=at(5, "再"), look5=at(5, "缓"), query=at(5, "查"),
    vram=at(6, "显"), cache6=at(6, "缓"), follow=at(6, "着"), ctx=at(6, "下"), together=at(6, "起"), rise=at(6, "涨"),
    llama=at(7, "Llama"), per=at(7, "每"), tok7=at(7, "token"), about=at(7, "大"), half=at(7, "0.5"), k4=at(7, "4K"), gb2=at(7, "2", 2), gb=at(7, "GB"),
    so=at(8, "所"), gqa=at(8, "GQA"), share=at(8, "共"), vv=at(8, "V"), paged=at(8, "PagedAttention"), page=at(8, "按"), alloc=at(8, "配"),
    quant=at(8, "量"), compress=at(8, "压"),
    mem9=at(9, "显"), swap9=at(9, "换"), speed9=at(9, "速"), new9=at(9, "新"), that9=at(9, "那"),
)
tokAt = [T["tok1"] - 0.14, T["tok2"] - 0.14, T["beng"] - 0.14, T["xin"] - 0.1]
rowAt = lambda r: T["meici"] + r * 0.1

bed = Bed(DUR, seed_value=20261005)
P = bed.place

# ---- 1 · tokens one at a time, each fed back as input ----
P(pop(520), T["big"] - 0.08, -34, pan=-0.5)
bed.typing(T["answer"], 9, 18, -46, pan=-0.3)
for i, a in enumerate(tokAt):
    P(whoosh(0.3, 0.6), a, -48, pan=-0.4 + 0.15 * i)
    P(pop(820 + 60 * i), a + 0.28, -32, pan=-0.3 + 0.15 * i)
    P(swipe(0.45, 900, 3600), a + 0.3, -50, pan=-0.2)
    P(tick(2400), a + 0.3, -46, pan=0.6)  # the step counter moves on
P(tick(3000), T["every2"], -46, pan=0.0)
# ---- 2 · the new token looks back at every earlier one ----
P(blip(1047), T["xin"] - 0.1 + 0.3, -38, pan=0.1)
for a, pan in [(T["hui"], 0.0), (T["tou"], -0.2), (T["kan"], -0.4)]:
    P(swipe(0.35, 1400, 5200), a - 0.05, -44, pan=pan)
P(tink(1320), T["all"], -42, pan=-0.2)
P(tink(1760), T["all"] + 0.05, -46, pan=0.2)
# ---- 3 · without a cache the triangle of recomputation, and a slowing clock ----
P(whoosh(0.65, 0.5), T["yaoshi"], -42)
for r in range(7):
    P(click(0.7 + 0.04 * r), rowAt(r), -40, pan=-0.4 + 0.1 * r)
P(swipe(0.35, 500, 1800), T["recompute"], -40, pan=-0.2)
P(thump(58, 0.4), T["recompute"] + 0.12, -40)
tt, gap = T["slow"] - 0.05, 0.07
while tt < T["slow2"] + 0.5:  # ticks that space out: 越写越慢
    P(tick(2100), tt, -44, pan=0.5)
    tt += gap
    gap *= 1.28
# ---- 4 · KV cache: computed once, stored ----
P(thump(72, 0.45), T["kv"] - 0.05, -32)
P(tink(880), T["kv"], -40)
P(whoosh(0.45, 0.4), T["kv"] + 0.1, -48, pan=-0.2)
P(swipe(0.45, 800, 3000), T["method"] - 0.1, -44, pan=0.6)
P(swipe(0.6, 1600, 5600), T["each"] - 0.05, -48, pan=-0.2)
P(whoosh(0.45, 0.5), T["key"] - 0.5, -46, pan=0.5)
for r in range(7):
    P(tick(2600 + 40 * r), T["key"] + r * 0.04, -44, pan=-0.5 + 0.12 * r)
    P(tick(1900 + 30 * r), T["value"] + r * 0.04, -44, pan=-0.4 + 0.12 * r)
P(pop(980), T["once"] - 0.02, -32, pan=-0.4)
P(blip(1175), T["once"] + 0.05, -40, pan=-0.4)
for r in range(7):
    P(whoosh(0.4, 0.5), T["store"] + r * 0.07, -52, pan=0.3)
    P(click(0.9), T["store"] + r * 0.07 + 0.5, -40, pan=0.65)
# ---- 5 · only the new one, then look it up ----
for c in range(8):
    P(tick(1700 + 90 * c), T["only"] + c * 0.03, -48, pan=-0.6 + 0.15 * c)
P(pop(1050), T["newTok"] - 0.1 + 0.25, -32, pan=0.4)
P(swipe(0.3, 600, 2400), T["thatOne"], -46, pan=-0.2)
P(click(0.9), T["thatOne"] + 0.7, -40, pan=0.6)
P(blip(988), T["again"], -40, pan=0.3)
for r in range(8):
    P(tick(2000 + 120 * r), T["look5"] - 0.2 + r * 0.07 + 0.25, -46, pan=0.6)
P(whoosh(0.6, 0.6), T["query"] - 0.3, -46, pan=0.4)
P(pop(700), T["query"] + 0.25, -34, pan=0.3)
# ---- page turn A → B, then memory grows with context ----
P(whoosh(1.0, 0.45), CH[1]["end"] - 0.05, -38)
P(pop(560), CH[1]["end"] + 0.85, -38, pan=-0.6)
ctxAt = [T["cache6"], T["follow"], T["ctx"], T["together"]]
for k, a in enumerate(ctxAt):
    fill_at = CH[1]["end"] + 0.85 if k == 0 else a  # the first row is the carried-over cache
    for c in range(10):
        P(click(0.5 + 0.03 * c), fill_at + c * 0.025, -48, pan=-0.6)
    P(tick(2400 + 200 * k), a, -42, pan=0.2)
P(thump(60, 0.4), T["rise"] - 0.02, -34, pan=-0.5)
# ---- the Llama 2 7B bill ----
P(pop(760), T["llama"] - 0.06, -34, pan=0.4)
for a in [T["per"], T["per"] + 0.2, T["tok7"] - 0.02, T["about"] - 0.02]:
    P(click(0.8), a, -40, pan=0.2)
P(tink(1320), T["half"], -38, pan=0.3)
P(click(0.8), T["k4"], -40, pan=0.1)
P(click(0.8), T["k4"] + 0.06, -42, pan=0.2)
P(thump(64, 0.45), T["gb2"], -32, pan=0.0)
P(tink(1047), T["gb2"] + 0.02, -38, pan=0.0)
P(swipe(0.3, 1200, 4000), T["gb2"], -44, pan=-0.5)
# ---- page turn B → C: three fixes ----
P(whoosh(0.9, 0.45), CH[2]["end"] - 0.05, -40)
for i in range(3):
    P(pop(640 + 80 * i), T["so"] + 0.1 + i * 0.14, -42, pan=-0.6 + 0.6 * i)
P(whoosh(0.55, 0.6), T["share"], -44, pan=-0.6)
P(click(1.0), T["share"] + 0.55, -38, pan=-0.6)
P(blip(1175), T["vv"], -40, pan=-0.6)
P(swipe(0.3, 700, 2600), T["page"], -44)
for i in range(3):
    P(click(0.7), T["page"] + i * 0.06 + 0.15, -42)
for i in range(2):
    P(pop(900), T["alloc"] - 0.15 + i * 0.2 + 0.1, -40)
P(blip(1175), T["alloc"] + 0.05, -42)
P(swipe(0.4, 2400, 6000), T["compress"] - 0.05, -44, pan=0.6)
P(click(0.9), T["compress"] + 0.4, -40, pan=0.6)
P(blip(1319), T["compress"] + 0.05, -42, pan=0.6)
# ---- page turn C → D: the trade, the newest token ----
P(whoosh(0.8, 0.45), CH[3]["end"] - 0.1, -40)
for i in range(6):
    P(click(0.8), T["mem9"] - 0.1 + i * 0.05 + 0.25, -40, pan=0.2)
P(thump(55, 0.5), T["swap9"] - 0.05, -32, pan=0.3)
P(blip(1568), T["speed9"], -40, pan=0.6)
P(swipe(0.6, 1200, 4400), T["new9"], -44, pan=0.1)
P(swell(DUR - 35.9), 35.9, -40)
# ---- recap: a new page, leaders, a reading highlight ----
P(whoosh(0.7, 0.4), R0 - 0.05, -40, pan=0.5)
P(chime(), R0 + 0.45, -40)
n = len(story["recap"]["points"])
for i in range(n):
    P(click(0.7), R0 + 0.65 + i * 0.16, -42, pan=-0.4 if i < (n + 1) // 2 else 0.4)
ha = R0 + 0.75 + n * 0.16 + 0.25
step = max(0.45, (DUR - 0.35 - ha) / n)
for i in range(n):
    P(tick(2200 + 150 * i), ha + i * step, -44, pan=-0.3 if i < (n + 1) // 2 else 0.3)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(R0, 8)))
