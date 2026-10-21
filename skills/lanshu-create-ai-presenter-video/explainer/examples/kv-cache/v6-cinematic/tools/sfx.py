#!/usr/bin/env python3
"""V6 cinematic sound bed for the KV cache film (45 s): a low room, swells on the reveals, whooshes on the
camera moves, pops / ticks / tinks on every on-screen action, a lift for the unvoiced recap.

    python3 tools/sfx.py      -> assets/audio/sfx.wav

All times come from lib/story.js through the same at() / phrase() the picture uses, so a re-timed narration
re-times the sound. Procedural only (lib/sfxlib.py); levels sit far under the voice.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import SR, Bed, blip, chime, lowpass, pop, rng, shimmer, swell, thump, tick, tink, whoosh, zap  # noqa: E402

story = json.loads((ROOT / "lib/story.js").read_text(encoding="utf-8").split("window.STORY = ", 1)[1].rstrip().rstrip(";"))
LINES = story["lines"]


def at(line: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in LINES[line - 1]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(f"{unit} #{nth} not in line {line}")


def ph(line: int, text: str) -> float:
    w = LINES[line - 1]["words"]
    units = [u for u, _ in w]
    for s in range(len(units)):
        acc = ""
        for e in range(s, len(units)):
            acc += units[e]
            if len(acc) >= len(text):
                break
        if acc == text:
            return w[s][1]
    raise KeyError(f"{text} not in line {line}")


start = lambda i: LINES[i - 1]["start"]
end = lambda i: LINES[i - 1]["end"]
DUR = story["duration"]
REC = story["recap"]["start"]
bed = Bed(DUR, seed_value=20261005)


def room(dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = lowpass(rng.standard_normal(n), 170) * 2.4 + 0.16 * np.sin(2 * np.pi * 41 * t)
    return x * np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 1.5)


def sub_hit(f0: float = 58) -> np.ndarray:
    n = int(0.9 * SR)
    return thump(f0, 0.9) * 1.2 + lowpass(rng.standard_normal(n), 600) * np.exp(-np.arange(n) / SR / 0.25) * 0.5


TE = [at(1, "token", 1), at(1, "token", 2), at(1, "蹦"), ph(2, "新"), ph(3, "前面"), at(3, "就"), at(3, "写"), ph(5, "新来")]

# ---- room + swells
bed.place(room(DUR), 0.0, -40)
bed.place(swell(3.6), 0.0, -32)
bed.place(swell(3.0), at(4, "KV") - 0.4, -31)
bed.place(swell(3.2), ph(6, "显存") - 0.3, -32)
bed.place(swell(2.6), at(7, "2", 2) - 0.8, -31)
bed.place(swell(4.2), start(9) - 0.2, -31)
bed.place(swell(4.8), REC - 0.1, -29)

# ---- camera moves (the CAM keys in index.html sit on these story times)
moves = [
    (ph(2, "新"), ph(2, "所有") + 0.4, 0.2), (ph(2, "所有") + 0.4, ph(3, "每次"), -0.2), (end(3) + 0.25, at(4, "KV") + 0.7, -0.4),
    (ph(4, "存起来"), start(5), 0.3), (end(5), ph(6, "显存"), 0.5), (at(6, "涨"), ph(7, "每个"), 0.3), (at(7, "GB"), at(8, "GQA"), 0.3),
    (at(8, "GQA"), at(8, "PagedAttention"), 0.2), (end(8), ph(9, "显存"), -0.3), (end(9), REC + 0.5, -0.2),
]
for a, b, pan in moves:
    d = max(0.6, min(1.6, b - a))
    bed.place(whoosh(d), a, -34, pan)

# ---- beat 1–2: the model prints tokens; the new one looks back
bed.place(blip(440, 0.5), start(1), -38)                     # the prompt is read
for i, t0 in enumerate(TE):
    bed.place(pop(820 + 40 * i), t0 - 0.05, -32, -0.3 + 0.08 * i)
    bed.place(thump(110, 0.18), t0 + 0.25, -38, -0.3 + 0.08 * i)
for k in range(4):
    bed.place(blip(660 + 110 * k, 0.25), ph(2, "回头看") + k * 0.12, -38, 0.2 - 0.15 * k)
bed.place(shimmer(0.9), ph(2, "所有"), -40)

# ---- beat 3: the triangle builds, the waste flashes, every step costs more
rows = [ph(3, "每次") + n * 0.13 for n in range(4)] + [TE[4] + 0.12, TE[5] + 0.12, TE[6] + 0.12]
for n, r0 in enumerate(rows):
    for i in range(n + 1):
        bed.place(tick(2400 + 150 * i), r0 + i * 0.035, -44, -0.4 + 0.1 * i)
bed.place(zap(0.35), ph(3, "重新算"), -36)
for k, t0 in enumerate([at(3, "越", 1), at(3, "写"), at(3, "越", 2)]):
    bed.place(thump(95 - 15 * k, 0.4), t0, -35, 0.5)

# ---- beat 4: KV cache — shelves, K, V, ×1, stored
bed.place(sub_hit(), at(4, "KV"), -31)
bed.place(whoosh(0.9, 0.4), at(4, "KV") + 0.2, -38, -0.5)
bed.place(whoosh(0.9, 0.4), at(4, "KV") + 0.35, -38, -0.3)
for i in range(7):
    bed.place(tink(1568 + 60 * i), at(4, "Key") + i * 0.07, -41, -0.4 + 0.12 * i)
    bed.place(tink(1046 + 40 * i), at(4, "Value") + i * 0.07, -41, -0.4 + 0.12 * i)
bed.place(chime(), ph(4, "只算一次"), -37)
for i in range(7):
    bed.place(tick(1800), ph(4, "存起来") + i * 0.06 + 0.33, -40, -0.4 + 0.12 * i)
    bed.place(tick(1500), ph(4, "存起来") + i * 0.06 + 0.37, -41, -0.4 + 0.12 * i)

# ---- beat 5: only the new one; Q scans K; V flows back
bed.place(tink(1760), ph(5, "那一个"), -38, 0.4)
bed.place(tink(1175), ph(5, "一个"), -38, 0.4)
bed.place(blip(990, 0.35), at(5, "再"), -37, 0.4)
qa, qd = at(5, "去") + 0.05, max(0.5, at(5, "查") - 0.15 - at(5, "去") - 0.05)
for i in range(8):
    bed.place(tick(3000 - 120 * i), qa + (1 - i / 8) * qd, -40, 0.4 - 0.1 * (7 - i))
bed.place(shimmer(0.8), at(5, "查"), -38)
bed.place(whoosh(0.7, 0.7), at(5, "查"), -38, 0.3)

# ---- beat 6: 显存 — the tank, the pour, slabs as the context grows, 涨
bed.place(thump(70, 0.5), ph(6, "显存"), -33, 0.4)
for j in range(16):
    bed.place(tick(2600 + 50 * j), ph(6, "缓存") + j * 0.022 + 0.45, -43, 0.5)
for k, t0 in enumerate([ph(6, "跟着"), at(6, "上"), at(6, "下"), ph(6, "一起")]):
    bed.place(thump(80 + 12 * k, 0.32), t0 + 0.28, -34, 0.4)
bed.place(sub_hit(52), at(6, "涨"), -32, 0.3)

# ---- beat 7: Llama 2 7B — the bill
bed.place(blip(523, 0.3), at(7, "Llama"), -38)
for t0 in [ph(7, "每个"), ph(7, "个"), at(7, "token"), ph(7, "大约")]:
    bed.place(tick(2200), t0, -40)
bed.place(shimmer(0.6), ph(7, "个") + 0.05, -41)
bed.place(tink(1319), at(7, "0.5"), -36)
bed.place(whoosh(0.6, 0.6), at(7, "4K"), -37, 0.3)
for j in range(14):
    bed.place(tick(2000 + 90 * j), at(7, "4K") + 0.12 + j * 0.06 + 0.5, -43, 0.4)
bed.place(sub_hit(48), at(7, "2", 2), -30)

# ---- beat 8: three fixes, each shrinks the block
for k in range(4):
    bed.place(blip(880 + 90 * k, 0.2), at(8, "GQA") + k * 0.06, -40, -0.3)
bed.place(whoosh(0.6, 0.5), ph(8, "共用") + 0.05, -38)
bed.place(tink(1568), at(8, "V"), -37)
bed.place(zap(0.25), at(8, "PagedAttention") + 0.1, -40, 0.4)
for k in range(4):
    bed.place(tick(1900 + 100 * k), ph(8, "按页") + 0.1 + k * 0.1, -40, 0.4)
bed.place(zap(0.2), ph(8, "量化"), -41)
bed.place(thump(120, 0.3), ph(8, "压缩"), -36)

# ---- beat 9: memory traded for speed, the spotlight
bed.place(whoosh(1.0, 0.6), at(9, "换"), -36, -0.2)
for i in range(8):
    bed.place(tick(2600 + 100 * i), ph(9, "速度") + i * 0.045, -42, -0.5 + 0.13 * i)
bed.place(shimmer(1.4), ph(9, "只算") - 0.05, -38)
bed.place(tink(1760), ph(9, "新的"), -37)

# ---- recap
bed.place(chime(), REC + 0.05, -34)
for k in range(len(story["recap"]["points"])):
    bed.place(tick(2000 + 200 * k), REC + 0.35 + k * 0.3, -38)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), gain_db=0.0, lift_after=(REC, 7)))
