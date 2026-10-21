#!/usr/bin/env python3
"""V5 comic — procedural SFX bed for the KV cache film (45 s: narration to 39.7 s, unvoiced recap to 45 s).

    python3 tools/sfx.py      -> assets/audio/sfx.wav

Comic sound words get comic sounds: a BOING + POP for every token the model spits out, a STAMP (thump + paper
snap) for every sticker / burst that slams, ZIP / WHOOSH for movers and camera whips, a ZAP for 重算 and the
lightning, SQUEEZE for quantisation, a swell under the recap. Every time comes from lib/story.js with the same
offsets index.html uses, so a re-timed story re-times the bed. Levels sit well under the voice.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import SR, Bed, chime, click, env, lowpass, pop, rng, shimmer, swell, swipe, thump, tick, tink, whoosh, zap  # noqa: E402

STORY = json.loads(re.sub(r"^.*?window\.STORY = ", "", (ROOT / "lib/story.js").read_text(encoding="utf-8"), flags=re.S).rstrip().rstrip(";"))
LINES = STORY["lines"]
DUR = STORY["duration"]
bed = Bed(DUR, seed_value=20261005)


def at(line: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in LINES[line - 1]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(unit)


def phrase(line: int, text: str) -> float:
    units = [w[0] for w in LINES[line - 1]["words"]]
    target = text.replace(" ", "")
    for s in range(len(units)):
        acc = ""
        for e in range(s, len(units)):
            if len(acc) >= len(target):
                break
            acc += units[e]
        if acc == target:
            return LINES[line - 1]["words"][s][1]
    raise KeyError(text)


# ---- the same beat times index.html computes ----
T = dict(
    big=at(1, "大"), ask=phrase(1, "回答问题"), tk1=at(1, "token", 1), tk2=at(1, "token", 2), beng=at(1, "蹦"),
    nw=at(2, "新"), look=phrase(2, "回头看"), all=phrase(2, "所有"),
    l3=LINES[2]["start"], every=phrase(3, "每次"), redo=phrase(3, "重新算"), slow=phrase(3, "越写越慢"), slowE=at(3, "慢"),
    kv=at(4, "KV"), how=phrase(4, "办法"), each4=at(4, "每"), key=at(4, "Key"), val=at(4, "Value"), once=phrase(4, "只算一次"), store=phrase(4, "存起来"),
    only=phrase(5, "只算"), nw5=at(5, "新"), that=phrase(5, "那一个"), find=phrase(5, "再去缓存里查"), cha=at(5, "查"),
    cost=phrase(6, "代价"), vram=phrase(6, "显存"), cache6=phrase(6, "缓存"), rise=at(6, "涨"),
    l7=LINES[6]["start"], llama=at(7, "Llama"), b7=at(7, "7B"), every7=at(7, "每"), ge7=at(7, "个"), tok7=at(7, "token"), about=phrase(7, "大约"),
    half=at(7, "0.5"), k4=at(7, "4K"), ctx7=phrase(7, "上下文"), two=at(7, "2", 2), gb=at(7, "GB"),
    so=phrase(8, "所以"), gqa=at(8, "GQA"), share=phrase(8, "共用"), vv=at(8, "V"), paged=at(8, "PagedAttention"), page=phrase(8, "按页分配"),
    ye=at(8, "页"), fen=at(8, "分"), pei=at(8, "配"), quant=phrase(8, "量化"), press=phrase(8, "压缩"),
    mem9=phrase(9, "显存"), swap=at(9, "换"), spd=phrase(9, "速度"), onlyNew=phrase(9, "只算新的那一个"), nw9=at(9, "新"),
)
STEPS6 = [phrase(6, "跟着"), at(6, "着"), phrase(6, "上下文"), at(6, "下")]
CH = STORY["chapters"]
R = STORY["recap"]
SEAMS = [CH[1]["start"], CH[2]["start"], CH[3]["start"], CH[3]["end"], R["start"]]


# ---- comic sounds ----
def stamp(t: float, g: float = -30, pan: float = 0.0, low: float = 70) -> None:
    """A sticker slamming onto the page: a low thump with a paper snap on top."""
    bed.place(thump(low, 0.32), t, g, pan)
    bed.place(click(1.5), t, g - 2, pan)


def boing(f0: float = 300, dur: float = 0.24) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.9 * np.sin(np.pi * t / dur))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, dur / 3)


def slide(f0: float, f1: float, dur: float) -> np.ndarray:
    """A slide whistle (for SLOW… and SQUEEZE)."""
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** u
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.minimum(1, u / 0.05) * np.minimum(1, (1 - u) / 0.15)


def poof(dur: float = 0.4) -> np.ndarray:
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    return lowpass(rng.standard_normal(n), 400 + 1800 * np.exp(-u * 5)) * np.minimum(1, u / 0.04) * np.exp(-u * 4) * 2.4


# ---------------- S1 · the model pops tokens; without a cache it recomputes ----------------
stamp(T["big"] + 0.11, -30, -0.5)
bed.place(pop(640), T["ask"] - 0.06, -32, 0.2)
for k in range(5):
    bed.place(tick(2400), T["ask"] + 0.3 + k * 0.07, -42, 0.1 + k * 0.1)
TE = [x - 0.1 for x in (T["tk1"], T["tk2"], T["beng"], T["nw"])]
for k, te in enumerate(TE):
    bed.place(boing(280 if k != 2 else 220, 0.26 if k != 2 else 0.34), te, -33 if k != 2 else -30, -0.4)
    bed.place(pop(900 + 70 * k), te + 0.32, -30, -0.1 + 0.15 * k)
bed.place(pop(1400), T["look"] - 0.16, -38, 0.3)
for n in range(3):
    bed.place(swipe(0.26, 900, 4000), T["look"] + n * 0.12, -40, 0.3 - n * 0.2)
for k in range(3):
    bed.place(tink(1500 + 200 * (2 - k)), T["all"] + (2 - k) * 0.06, -38, -0.2 + 0.2 * k)
    bed.place(pop(1200), T["all"] + k * 0.06 + 0.05, -42, 0.0)
bed.place(whoosh(0.5, 0.4), T["l3"], -34, -0.4)
for j in range(4):
    bed.place(pop(800 + 60 * j), T["l3"] + 0.22 + j * 0.07, -40, 0.2 + 0.1 * j)
for i in range(8):
    bed.place(tick(1800 + 160 * i), T["every"] + 0.08 + i * 0.19, -36, -0.4 + 0.1 * i)
bed.place(zap(0.28), T["redo"], -30, 0.0)
stamp(T["redo"] + 0.16, -34, 0.5)
bed.place(swipe(0.45, 700, 3000), T["slow"], -38, 0.2)
bed.place(whoosh(0.4, 0.5), T["slow"] - 0.15, -40, 0.5)
stamp(T["slow"] + 0.46, -34, 0.0)
bed.place(slide(900, 240, 0.7), T["slowE"] - 0.04, -36, 0.2)

# ---------------- S2 · KV cache: compute once, store; later only the new token ----------------
stamp(T["kv"] + 0.08, -24, 0.0, low=55)
bed.place(zap(0.2), T["kv"] + 0.04, -34)
bed.place(whoosh(0.34, 0.5), T["how"], -36)
stamp(T["how"] + 0.34, -30, 0.1)
for i in range(4):
    bed.place(pop(700 + 50 * i), T["each4"] + i * 0.12, -36, -0.6)
for i in range(4):
    bed.place(tick(2600), T["key"] - 0.05 + i * 0.07, -38, -0.4)
    bed.place(tick(1900), T["val"] - 0.05 + i * 0.07, -38, -0.3)
stamp(T["once"] + 0.1, -28, -0.3)
for i in range(4):
    bed.place(whoosh(0.32, 0.5), T["store"] + i * 0.11, -38, -0.2)
    bed.place(click(1.1), T["store"] + i * 0.11 + 0.32, -38, 0.1)
bed.place(thump(60, 0.3), T["only"], -40, -0.5)
bed.place(whoosh(0.4, 0.5), T["only"] - 0.08, -42, 0.6)
stamp(T["nw5"] + 0.06, -30, -0.6)
bed.place(tick(2600), T["that"] - 0.06, -36, -0.5)
bed.place(tick(1900), T["that"] + 0.06, -36, -0.5)
bed.place(whoosh(0.3, 0.5), T["that"] + 0.3, -36, -0.2)
bed.place(pop(1300), T["find"] - 0.16, -34, -0.5)
QT = [T["find"] + 0.3 + q * 0.19 for q in range(5)]
for q, qt in enumerate(QT):
    bed.place(tick(3000 - 150 * q), qt, -38, 0.0)
stamp(QT[3] + 0.06, -32, -0.2)
bed.place(chime(), QT[3] + 0.1, -42, 0.0)
bed.place(whoosh(0.6, 0.5), T["cha"] - 0.1, -34, -0.3)
for j in range(5):
    bed.place(pop(900 + 60 * j), T["cha"] - 0.1 + j * 0.06 + 0.42, -42, -0.6)

# ---------------- S3 · the cost: 显存, Llama 2 7B's bill ----------------
stamp(T["cost"] + 0.08, -32, 0.6)
stamp(T["vram"] + 0.1, -27, 0.6, low=55)
bed.place(swipe(0.4, 700, 3000), T["cache6"] - 0.1, -40, -0.3)
for k, s0 in enumerate(STEPS6):
    bed.place(whoosh(0.26, 0.6), s0, -40, 0.6)
    bed.place(thump(80 - 5 * k, 0.3), s0 + 0.26, -31, 0.6)
    bed.place(pop(800 + 90 * k), s0 + 0.16, -38, -0.2 + 0.15 * k)
bed.place(boing(180, 0.4), T["rise"] - 0.04, -30, 0.3)
stamp(T["rise"] + 0.02, -27, 0.3)
bed.place(whoosh(0.3, 0.5), T["l7"] - 0.18, -38, -0.2)
stamp(T["llama"] + 0.08, -30, -0.5)
for i in range(3):
    bed.place(pop(900 + 100 * i), T["b7"] + 0.02 + i * 0.1, -38, -0.3 + 0.2 * i)
stamp(T["every7"] - 0.02, -36, -0.5)
for tt in (T["every7"] + 0.04, T["ge7"], T["tok7"], T["about"]):
    stamp(tt + 0.14, -34, -0.3)
for tt in (T["every7"] + 0.12, T["ge7"] + 0.12, T["tok7"] + 0.14, T["half"] - 0.22):
    bed.place(pop(1500), tt, -42, -0.1)
stamp(T["half"] + 0.12, -24, 0.0, low=50)
bed.place(zap(0.22), T["half"] + 0.08, -32, 0.0)
stamp(T["k4"] - 0.06, -36, -0.5)
for tt in (T["k4"] - 0.12, T["k4"] + 0.06):
    stamp(tt + 0.14, -34, -0.3)
for k in range(4):
    bed.place(tick(1600 + 200 * k), T["ctx7"] + 0.12 + k * 0.24, -38, 0.6)
bed.place(pop(1500), T["two"] - 0.26, -42)
bed.place(thump(45, 0.7), T["two"] + 0.1, -22, 0.2)
stamp(T["two"] + 0.1, -26, 0.2, low=50)
stamp(T["gb"] + 0.26, -30, 0.5)
bed.place(chime(), T["gb"] + 0.3, -36, 0.4)

# ---------------- S4 · three fixes ----------------
for i in range(3):
    stamp(T["so"] + i * 0.1 + 0.16, -34, -0.6 + 0.6 * i)
stamp(T["gqa"] + 0.08, -30, -0.5)
for i in range(4):
    bed.place(pop(1000 + 80 * i), T["gqa"] + i * 0.05, -40, -0.6)
bed.place(whoosh(0.55, 0.5), T["share"], -36, -0.5)
for i in range(3):
    bed.place(poof(0.35), T["share"] + 0.56 + i * 0.02, -38, -0.5)
stamp(T["share"] + 0.64, -34, -0.5)
stamp(T["vv"] + 0.16, -29, -0.4)
bed.place(whoosh(0.4, 0.5), T["vv"] + 0.1, -38, 0.0)
stamp(T["paged"] + 0.08, -30, 0.0)
bed.place(swipe(0.25, 500, 2500), T["page"] + 0.05, -36, 0.0)
for j in range(8):
    bed.place(tick(2200 + 60 * j), T["page"] + 0.02 + j * 0.03, -44, -0.2 + 0.05 * j)
for x in (T["page"] + 0.08, T["ye"] + 0.04, T["fen"] + 0.04, T["pei"] - 0.02):
    bed.place(pop(1100), x, -34, 0.0)
bed.place(whoosh(0.45, 0.5), T["pei"], -38, 0.4)
stamp(T["quant"] + 0.08, -30, 0.5)
bed.place(thump(90, 0.25), T["quant"] + 0.3, -38, 0.5)
bed.place(slide(620, 190, 0.34), T["press"], -32, 0.5)
stamp(T["press"] + 0.3, -28, 0.5)
stamp(T["press"] + 0.44, -32, 0.6)

# ---------------- S5 · 用显存换速度，只算新的那一个 ----------------
s5 = CH[3]["end"]
bed.place(thump(70, 0.3), s5 + 0.25, -38, -0.4)
bed.place(whoosh(0.3, 0.6), T["mem9"] - 0.12, -38, -0.6)
stamp(T["mem9"] + 0.12, -30, -0.6)
bed.place(whoosh(0.5, 0.5), T["swap"] - 0.06, -36, -0.2)
bed.place(zap(0.3), T["spd"] - 0.08, -30, 0.0)
stamp(T["spd"] + 0.14, -30, 0.0)
bed.place(click(1.3), T["onlyNew"] - 0.04, -32, 0.6)
bed.place(shimmer(0.9), T["onlyNew"], -40, 0.6)
stamp(T["nw9"] + 0.06, -26, 0.6, low=55)
for u, t in LINES[8]["words"]:
    if u in "，。：":
        continue
    bed.place(click(0.9), t - 0.04, -40, 0.3)

# ---------------- seams: the halftone dot wipes ----------------
for s in SEAMS:
    bed.place(whoosh(0.6, 0.45), s - 0.28, -31)
# ---------------- recap: splash page + four points ----------------
stamp(R["start"] + 0.2, -27, 0.0, low=55)
bed.place(swell(R["end"] - R["start"]), R["start"], -34)
stamp(R["start"] + 0.5, -32, 0.0)
for i in range(len(R["points"])):
    stamp(R["start"] + 0.72 + i * 0.3 + 0.14, -32, [-0.6, 0.6, -0.6, 0.6, 0.0][i % 5])
bed.place(chime(), R["start"] + 0.72 + len(R["points"]) * 0.3 + 0.2, -36)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(R["start"], 8)))
