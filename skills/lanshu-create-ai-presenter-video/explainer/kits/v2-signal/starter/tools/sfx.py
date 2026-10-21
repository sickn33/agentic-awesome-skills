#!/usr/bin/env python3
"""V2 signal starter — the procedural HUD sound bed, timed from lib/story.js (any topic).

    bash tools/sfx.sh            (runs this with python3)  -> assets/audio/sfx.wav

Two parts:
  * chrome (keep): the film-start power-on, a glitch zap + camera sweep at every chapter seam, the closing line's
    decode chatter over a low swell, the recap's swell + card blips (lifted: the voice is done by then).
  * draft beats (replace with your scenes' sounds): per narration line the frame powers on, the headline decodes,
    a soft tick per spoken unit (the write-on), a pop + lock per Latin / number term, a packet on the wire between beats.
Every time is re-derived from the story exactly the way index.html derives it, so a re-timed story re-times the bed.
The bed's level is set from the narration: ≥ 12 dB under the voice in every voiced half-second (draft: fixed).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "lib"), str(ROOT / "lib" / "kit")]
import sfxlib as X  # noqa: E402
from sfxlib import Bed  # noqa: E402
import sfx_signal as S  # noqa: E402

story = json.loads(re.sub(r"^/\*.*?\*/\s*window\.STORY = |;\s*$", "", (ROOT / "lib/story.js").read_text(encoding="utf-8"), flags=re.S))
DUR = max(float(story["duration"]), float((story.get("recap") or {}).get("end") or 0))  # as index.html
LINES = story["lines"]
CHS = story.get("chapters") or [{"n": 1, "key": "all", "title": story.get("title", ""), "start": 0.0, "end": DUR}]
NCH = len(CHS)
END = LINES[story["end"]["line"] - 1] if story.get("end") and story["end"].get("line") else None
RC = story["recap"] if story.get("recap") and story["recap"].get("points") is not None else None
R0 = RC["start"] if RC else DUR
CLOSE = min(CHS[-1]["end"], END["start"] - 0.05) if END else None
BEAT_LINES = [L for L in LINES if not END or L["i"] != END["i"]]

LAT = re.compile(r"^[A-Za-z0-9.%+\-/$€£¥]+$")
is_lat = lambda u: bool(re.search(r"[A-Za-z0-9]", u)) and bool(LAT.match(u))  # noqa: E731
is_join = lambda u: bool(re.match(r"^[–—\-~/×+.]$", u))  # noqa: E731
spoken = lambda u: bool(re.search(r"[A-Za-z\d㐀-鿿]", u))  # noqa: E731


def chapter_of(L: dict) -> int:
    for c in range(NCH - 1, -1, -1):
        if L["start"] >= CHS[c]["start"] - 0.05:
            return c
    return 0


def terms_of(L: dict) -> list[float]:
    """times of the Latin / number terms (same grouping and dedupe as index.html termsOf)"""
    W, out, seen, i = L["words"], [], set(), 0
    while i < len(W):
        if not is_lat(W[i][0]):
            i += 1
            continue
        txt, t0, j = W[i][0], W[i][1], i + 1
        while j < len(W):
            if is_lat(W[j][0]):
                txt += " " + W[j][0]
                j += 1
            elif is_join(W[j][0]) and j + 1 < len(W) and is_lat(W[j + 1][0]):
                txt += W[j][0] + W[j + 1][0]
                j += 2
            else:
                break
        if txt.lower() not in seen and not re.match(r"^\d$", txt):
            seen.add(txt.lower())
            out.append(t0)
        i = j
    return out[:6]


BYCH: list[list[dict]] = [[] for _ in CHS]
for L in BEAT_LINES:
    BYCH[chapter_of(L)].append(L)


# the camera window that frames each draft beat (index.html PLAN → placeholder → cam.shot); the camera travels between
SHOT: dict[int, list[float]] = {}
for c, ls in enumerate(BYCH):
    for j, L in enumerate(ls):
        t0 = (0.0 if c == 0 else CHS[c]["start"] + 0.45) if j == 0 else L["start"] + 0.2
        t1 = max(L["end"] + 0.05, DUR if (c == NCH - 1 and not END) else CHS[c]["end"] - 0.25) if j == len(ls) - 1 else L["end"] + 0.05
        SHOT[L["i"]] = [t0, t1]
    for j in range(1, len(ls)):
        a, b = SHOT[ls[j - 1]["i"]], SHOT[ls[j]["i"]]
        if b[0] - a[1] < 0.5:  # a tight gap still gets 0.5 s of travel
            m = (a[1] + b[0]) / 2
            a[1], b[0] = m - 0.25, m + 0.25
shot = lambda L: tuple(SHOT[L["i"]])  # noqa: E731


SEAMS = [c["start"] for c in CHS[1:]] + ([CLOSE] if END else []) + ([R0] if RC else [])
bed = Bed(DUR, seed_value=20261005)
pan_of = lambda c: -0.5 + (c / max(1, NCH - 1)) if NCH > 1 else 0.0  # noqa: E731  stations left → right

# ================= chrome =================
S.blip(bed, 0.05, 990, g=-4)  # the first frame powers on
S.decode(bed, 0.1, n=6, dur=0.4, g=-2)
for s in SEAMS:
    S.glitch(bed, s)
for c in CHS[1:]:
    S.sweep(bed, c["start"] - 0.25, 0.7, g=-2)  # the camera rides to the next station
if END:
    S.sweep(bed, CLOSE - 0.25, 0.7, g=-2)
    for u, t in END["words"]:
        if spoken(u):
            S.decode(bed, t - 0.1, n=3, g=-6, dur=0.2)  # the closing line decodes word by word
    bed.place(X.swell(max(1.0, R0 - CLOSE)), CLOSE, -38)  # a low swell under the closing line
    n = NCH
    span = max(0.6, END["end"] - END["start"])
    for i in range(n):  # api.closingChain(): the chapters light in turn
        S.blip(bed, END["start"] + (i / n) * span * 0.85, 990 + 110 * i, g=-8, pan=-0.6 + 1.2 * (i + 0.5) / n)
if RC:
    S.close(bed, R0, RC["end"] - R0)
    for i in range(len(RC["points"])):
        S.blip(bed, R0 + 0.32 + i * 0.2 + 0.16, 1320 + 110 * i, g=-6)

# ================= draft beats (replace with the sounds of your performed scenes) =================
prev = None
for L in BEAT_LINES:
    c = chapter_of(L)
    pan = pan_of(c)
    t0, t1 = shot(L)
    if prev is not None and chapter_of(prev[0]) == c:  # the packet hops down the wire to this beat
        a, b = prev[1], max(prev[1] + 0.2, t0)
        S.sweep(bed, a, b - a, g=-12, pan=pan)
        S.stream(bed, a, b, rate=16, g=-8, pan=pan)
    S.blip(bed, L["start"] - 0.25, 1320, g=-8, pan=pan)  # the frame goes live (scan line)
    S.decode(bed, L["start"] + 0.02, n=6, dur=0.45, g=-4, pan=pan)  # the headline decodes in
    for u, t in L["words"]:
        if spoken(u):
            S.decode(bed, t - 0.08, n=2, dur=0.1, g=-10, pan=pan)  # the line writes itself on
    for k, t in enumerate(terms_of(L)):
        S.pop(bed, t, k=2 * k, g=-6, pan=pan)
        S.lock(bed, t + 0.04, g=-10, pan=pan)
    prev = (L, t1)


# ================= level: from the narration =================
def windows_db(x: np.ndarray, sr: int, win: float = 0.5, hop: float = 0.25) -> np.ndarray:
    n, h = int(win * sr), int(hop * sr)
    if len(x) < n:
        return np.array([])
    idx = range(0, len(x) - n + 1, h)
    return np.array([10 * np.log10(np.mean(x[i : i + n] ** 2) + 1e-12) for i in idx])


def auto_gain() -> tuple[float, str]:
    narr = ROOT / "assets/audio/narration.wav"
    if story.get("draft") or not narr.exists():
        return 4.0, "draft / no narration: fixed +4 dB"
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(narr), "-f", "f32le", "-ac", "1", "-ar", str(X.SR), "-"], capture_output=True, check=True).stdout
    voice = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    m = min(len(voice), bed.n)
    vdb = windows_db(voice[:m], X.SR)
    bdb = windows_db(np.sqrt((bed.L[:m] ** 2 + bed.R[:m] ** 2) / 2), X.SR)
    if not len(vdb):
        return 4.0, "narration too short: fixed +4 dB"
    voiced = (vdb > -45) & (vdb > vdb.max() - 20) & (bdb > -100)  # speech, not the tails of words
    if not voiced.any():
        return 4.0, "no voiced window: fixed +4 dB"
    g = float(np.clip(np.min(vdb[voiced] - bdb[voiced]) - 12.5, -12, 14))
    return g, f"auto {g:+.1f} dB (voice RMS {10 * np.log10(np.mean(voice ** 2) + 1e-12):.1f} dB; ≥ 12 dB under it in every voiced half-second)"


gain, why = auto_gain()
print(bed.write(str(ROOT / "assets/audio/sfx.wav"), gain_db=gain, lift_after=(R0, 8) if RC else None), "·", why)
