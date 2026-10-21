#!/usr/bin/env python3
"""V2 signal · KV cache — procedural HUD sound bed timed to the picture (45 s).

    python3 tools/sfx.py      -> assets/audio/sfx.wav

Every event time is derived from lib/story.js the same way index.html derives it (story.at / story.phrase +
the same small offsets), so a re-timed narration re-times the sound too. Levels sit far under the voice;
the unvoiced recap is lifted.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "lib"), str(ROOT / "lib" / "kit")]
from sfxlib import Bed  # noqa: E402
import sfx_signal as S  # noqa: E402

story = json.loads(re.sub(r"^/\*.*?\*/\s*window\.STORY = |;\s*$", "", (ROOT / "lib/story.js").read_text(encoding="utf-8"), flags=re.S))
LINES = story["lines"]


def at(line: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in LINES[line - 1]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(unit)


def phrase(line: int, text: str) -> float:
    units = LINES[line - 1]["words"]
    text = text.replace(" ", "")
    for s in range(len(units)):
        acc = ""
        for e in range(s, len(units)):
            acc += units[e][0]
            if len(acc) >= len(text):
                break
        if acc == text:
            return units[s][1]
    raise KeyError(text)


CH = story["chapters"]
CLOSE = CH[-1]["end"]
R0, R1 = story["recap"]["start"], story["recap"]["end"]
T = dict(
    prompt=LINES[0]["start"], tok1=at(1, "token", 1), tok2=at(1, "token", 2), beng=at(1, "蹦"), xin=at(2, "新"),
    huitou=phrase(2, "回头看"), suoyou=phrase(2, "所有"), meici=phrase(3, "每次"), chongxin=phrase(3, "重新算"), man=at(3, "慢"),
    kv=at(4, "KV"), meige=phrase(4, "每个"), key=at(4, "Key"), value=at(4, "Value"), zsyc=phrase(4, "只算一次"), cql=phrase(4, "存起来"),
    zhisuan=phrase(5, "只算"), xinlai=at(5, "新"), nayige=phrase(5, "那一个"), cha=phrase(5, "再去缓存里查"), chaEnd=at(5, "查"),
    xc=phrase(6, "显存"), hc=phrase(6, "缓存"), gz=phrase(6, "跟着上下文"), zhang=at(6, "涨"),
    llama=at(7, "Llama"), perTok=phrase(7, "每个token"), half=at(7, "0.5"), k4=at(7, "4K"), gb2=at(7, "2", 2),
    gqa=at(8, "GQA"), gongyong=phrase(8, "共用"), paged=at(8, "PagedAttention"), anye=phrase(8, "按页分配"), pei=at(8, "配"),
    lh=phrase(8, "量化"), ys=phrase(8, "压缩"),
    xc9=phrase(9, "显存"), huan=at(9, "换"), sd=phrase(9, "速度"), zsx=phrase(9, "只算新的那一个"), xin9=at(9, "新"), nyg=phrase(9, "那一个"),
)
# beat 3 rows, exactly as in index.html
ROWS = []
for n in range(1, 8):
    if n <= 4:
        b, d = T["meici"] + (n - 1) * 0.15, 0.1
    elif n == 5:
        b, d = T["chongxin"] + 0.32, 0.26
    elif n == 6:
        b, d = ROWS[4][1] + 0.12, 0.42
    else:
        b = ROWS[5][1] + 0.14
        d = T["man"] + 0.22 - b
    ROWS.append((b, b + d, d, n))
tokT = [T["tok1"], T["tok2"], T["beng"], T["xin"], ROWS[3][1] + 0.03, ROWS[4][1] + 0.03, ROWS[5][1] + 0.03, T["xinlai"]]
SEGT = [T["gz"], T["gz"] + 0.48, T["gz"] + 0.96, T["gz"] + 1.42]
SEAMS = [c["start"] for c in CH[1:]] + [CLOSE, R0]

bed = Bed(story["duration"], seed_value=20261005)

# ---- chapter seams: glitch cuts (the camera travels down a level at three of them)
for s in SEAMS:
    S.glitch(bed, s)
for s in SEAMS[1:4]:
    S.sweep(bed, s - 0.25, 0.7, g=-2)

# ---- beat 1: the prompt, the model, tokens popping one at a time
S.blip(bed, 0.05, 990, g=-2, pan=-0.3)
S.decode(bed, 0.18, n=9, dur=0.6, pan=-0.3)
S.blip(bed, 0.35, 660, g=-4, pan=-0.5)
S.sweep(bed, T["prompt"] + 0.5, 0.45, g=-8, pan=-0.4)
pend = [(T["prompt"] + 0.95, T["tok1"]), (T["tok1"] + 0.05, T["tok2"]), (T["tok2"] + 0.05, T["beng"]), (T["beng"] + 0.05, T["xin"])]
for a, b in pend:
    S.stream(bed, a, b, rate=10, g=-4, pan=-0.4)
for k, te in enumerate(tokT):
    pan = -0.6 + k * 0.16
    S.sweep(bed, te - 0.24, 0.24, g=-12, pan=pan)
    S.pop(bed, te, k=k, pan=pan)
    S.decode(bed, te + 0.04, n=3, g=-4, dur=0.2, pan=pan)

# ---- beat 2: look back — three arcs sweep left, every earlier token answers on "所有"
for j in (2, 1, 0):
    S.blip(bed, T["huitou"] + (2 - j) * 0.13, 1480 - (2 - j) * 180, g=-6, pan=-0.2 * j)
for j in range(3):
    S.blip(bed, T["suoyou"] + (2 - j) * 0.06 + 0.4, 1760, g=-10, pan=-0.3)
S.blip(bed, T["suoyou"], 880, g=-8, pan=-0.4)
S.sweep(bed, T["huitou"] + 0.3, T["suoyou"] - T["huitou"] - 0.3, g=-12, pan=-0.3)  # the look-back scan

# ---- beat 3: without a cache — every step recomputes everything, and each step takes longer
for b, e, d, n in ROWS:
    for j in range(n):
        S.blip(bed, b + d * j / n, 2200 + 60 * j, g=-14 - (0 if n > 4 else 3), pan=-0.6 + j * 0.15)
    S.blip(bed, e, 520 + 40 * n, g=-8, pan=0.6)
    if n >= 5:
        S.stream(bed, b, e, rate=14, g=-2)
S.stream(bed, ROWS[6][0], CH[1]["start"], rate=8, g=-6)
S.slam(bed, T["chongxin"], g=-9)
S.decode(bed, T["meici"], n=6, pan=0.6)

# ---- beat 4: KV cache — K and V come out of each token once, get stamped ×1, and are stored
S.decode(bed, T["kv"], n=9, dur=0.4, g=2)
S.slam(bed, T["kv"] + 0.05, g=-6)
S.blip(bed, T["kv"] + 0.15, 660, g=-4)
S.sweep(bed, T["meige"] - 0.15, 0.55, g=-8, pan=-0.6)
for k in range(7):
    S.blip(bed, T["meige"] + k * ((T["key"] - 0.35 - T["meige"]) / 6), 1320 + k * 40, g=-14, pan=-0.6 + k * 0.17)
    S.pop(bed, T["key"] + k * 0.05, k=k + 5, g=-6, pan=-0.6 + k * 0.17)
    S.pop(bed, T["value"] + k * 0.05, k=k, g=-6, pan=-0.6 + k * 0.17)
    S.blip(bed, T["cql"] + k * 0.07 + 0.4, 990, g=-10, pan=-0.6 + k * 0.17)
S.slam(bed, T["zsyc"], g=-2)
oa, ob = T["zsyc"] + 0.2, T["cql"] - 0.02  # the ×1 check line walks across the seven pairs
S.sweep(bed, oa, ob - oa, g=-12)
for k in range(7):
    S.blip(bed, oa + (k + 0.5) / 7.6 * (ob - oa), 1760, g=-16, pan=-0.6 + k * 0.17)
S.sweep(bed, T["cql"], 0.85, g=-4)

# ---- beat 5: only the new one computes; Q scans the K column; V flows back on the bus
S.sweep(bed, T["zhisuan"], 0.3, g=-10)
S.rise(bed, T["xinlai"] + 0.2, 0.7, 220, 660, pan=-0.3)
S.rise(bed, T["xinlai"] + 0.45, 0.5, 220, 300, g=-2, pan=-0.3)
S.pop(bed, T["nayige"], k=12, g=-4, pan=0.6)
S.pop(bed, T["nayige"] + 0.08, k=7, g=-4, pan=0.6)
S.blip(bed, T["nayige"] + 0.55, 990, g=-6, pan=0.6)
S.blip(bed, T["cha"], 1980, g=-4, pan=0.6)
s_start, s_end = T["cha"] + 0.42, T["chaEnd"] - 0.08
S.sweep(bed, s_start, s_end - s_start + 0.1, g=-6, pan=0.0)
for k in range(8):
    S.blip(bed, s_start + (7 - k) / 7 * (s_end - s_start), 1500 + 90 * k, g=-12, pan=0.6 - k * 0.17)
S.stream(bed, s_end - 0.05, s_end + 0.85, rate=26, g=0, f=2000, pan=0.4)

# ---- beat 6: the cost — context grows 1K → 4K, the gauge stacks, the line stays straight
S.blip(bed, T["xc"] - 0.05, 520, g=-2, pan=0.7)
S.decode(bed, T["xc"], n=4, pan=0.7)
S.rise(bed, T["hc"], SEGT[0] + 0.3 - T["hc"], 200, 500, g=-8, pan=-0.4)  # 8 tokens → 1K
for k, s in enumerate(SEGT):
    S.sweep(bed, s, 0.3, g=-10, pan=-0.6 + k * 0.3)
    S.blip(bed, s + 0.05, 880 + 110 * k, g=-6, pan=-0.6 + k * 0.3)
    S.sweep(bed, s + 0.12, 0.38, g=-8, pan=0.7)
    S.slam(bed, s + 0.5, g=-14, pan=0.7)
    S.blip(bed, s + 0.44, 1320, g=-12)
S.slam(bed, T["zhang"], g=-5, pan=0.7)

# ---- beat 7: the bill for Llama 2 7B
S.decode(bed, T["llama"], n=7, dur=0.35, pan=-0.5)
S.blip(bed, T["llama"], 1100, g=-6, pan=-0.5)
S.typing(bed, T["llama"] + 0.3, 24, 30, g=-2, pan=-0.2)  # the spec line
for dt in (0, 0.1, 0.22, 0.32, 0.46, 0.56, 0.7):
    S.blip(bed, T["perTok"] + dt, 1760, g=-12, pan=-0.4)
S.slam(bed, T["half"], g=-8, pan=0.0)
for dt in (-0.06, 0.06, 0.18):
    S.blip(bed, T["k4"] + dt, 1760, g=-12, pan=-0.3)
S.sweep(bed, T["half"] + 0.22, T["k4"] - T["half"] - 0.22, g=-10)  # × every token along the tape
S.rise(bed, T["k4"] + 0.2, T["gb2"] - T["k4"] - 0.3, 180, 520, g=-2)
ta, tb = T["k4"] + 0.25, T["gb2"] - 0.05  # the tally climbs the four 1K blocks
for k in range(4):
    S.blip(bed, ta + k * (tb - ta) / 4, 990 + 140 * k, g=-8, pan=0.7)
S.slam(bed, T["gb2"], g=0)
S.decode(bed, T["gb2"] + 0.25, n=6, pan=-0.4)

# ---- beat 8: three fixes, each shrinks the cache
for i in range(3):
    S.decode(bed, CH[3]["start"] + 0.35 + i * 0.14, n=4, g=-6, pan=-0.5)
S.lock(bed, T["gqa"])
S.sweep(bed, T["gongyong"], 0.5, g=-6)
S.rise(bed, T["gongyong"] + 0.25, 0.45, 900, 300, g=-2, pan=0.6)
S.stream(bed, T["gongyong"] + 0.35, CLOSE, rate=5, g=-10, pan=0.1)  # Q heads querying the shared pair
S.lock(bed, T["paged"])
S.sweep(bed, T["anye"], 0.4, g=-6)
for k in range(3):
    S.blip(bed, T["anye"] + 0.05 * k, 1200 + 120 * k, g=-10)
S.pop(bed, T["pei"] - 0.1, k=9, g=-4)
S.stream(bed, T["anye"] + 0.3, T["lh"], rate=6, g=-10, f=2200)  # tokens filling the pages
S.lock(bed, T["lh"])
S.rise(bed, T["lh"] + 0.1, 0.45, 1200, 600, g=-4)
S.rise(bed, T["ys"], 0.4, 900, 450, g=-2, pan=0.6)

# ---- beat 9: the closing line — memory for speed, only the new one
for w, t in LINES[story["end"]["line"] - 1]["words"]:
    if w not in "，。：":
        S.decode(bed, t - 0.1, n=3, g=-6, dur=0.2)
S.rise(bed, T["xc9"], 0.55, 160, 420, g=0, pan=0.4)
S.stream(bed, T["huan"], R0, rate=4, g=-4, pan=0.6)
S.rise(bed, T["sd"], 0.55, 440, 1320, g=-2, pan=0.8)
S.lock(bed, T["xin9"], g=2)
S.rise(bed, T["zsx"] + 0.1, 0.5, 300, 600, g=-6, pan=-0.4)

# ---- recap: one composed frame
S.close(bed, R0, R1 - R0)
for i in range(len(story["recap"]["points"])):
    S.blip(bed, R0 + 0.32 + i * 0.2 + 0.16, 1320 + 110 * i, g=-6)

# the KV narration is quiet (≈ -21 dB RMS): +4 dB keeps the bed ≥ 12 dB under the voice in every voiced half-second
print(bed.write(str(ROOT / "assets/audio/sfx.wav"), gain_db=4, lift_after=(R0, 8)))
