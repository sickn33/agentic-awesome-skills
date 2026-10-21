#!/usr/bin/env python3
"""V5 comic — the procedural sound bed, built from the story (lib/story.js).

    bash tools/sfx.sh            (= python3 tools/sfx.py)  ->  assets/audio/sfx.wav

Comic sounds (lib/sfxlib.py): a STAMP (low thump + paper snap) for every sticker that slams, a POP for things that
pop in, a WHOOSH under every halftone dot wipe and every camera whip, small pops while the key phrase is lettered,
a swell under the closing line and under the recap (lifted once the voice is done).

The times mirror index.html: stations (one per chapter + the closing station), the default camera whips panel to
panel at each line start, and the draft beat of every line (api.placeholder). When you perform a line in beats.js,
add its number to PERFORMED (its draft sounds go) and put your own sounds in the "your beats" section — the KV cache
film's tools/sfx.py (examples/kv-cache/v5-comic) is the vocabulary: stamp(), boing(), slide(), poof(), zap, chime.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib"))
from sfxlib import SR, Bed, chime, click, env, lowpass, pop, rng, shimmer, swell, swipe, thump, tick, tink, whoosh, zap  # noqa: E402,F401

STORY = json.loads(re.sub(r"^.*?window\.STORY = ", "", (ROOT / "lib/story.js").read_text(encoding="utf-8"), flags=re.S).rstrip().rstrip(";"))
DUR = float(STORY["duration"])
END = STORY.get("end")
R = STORY.get("recap")
NOTES = STORY.get("notes") or {}
bed = Bed(DUR, seed_value=20261005)

PERFORMED: set[int] = set()  # lines whose placeholder you replaced in beats.js (their draft sounds are dropped)
WHIPS = True                 # the default camera whips panel to panel at each line start (False if you set your own keys)


# ---------------- story helpers (same as core.js Story) ----------------
def line(i: int) -> dict:
    return STORY["lines"][i - 1]


def at(i: int, unit: str, nth: int = 1) -> float:
    k = 0
    for u, t in line(i)["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError(unit)


def phrase(i: int, text: str) -> float:
    units = [w[0] for w in line(i)["words"]]
    want = re.sub(r"\s", "", text)
    for s in range(len(units)):
        acc, e = "", s
        while e < len(units) and len(acc) < len(want):
            acc += units[e]
            e += 1
        if acc == want:
            return line(i)["words"][s][1]
    raise KeyError(text)


# ---------------- comic sounds ----------------
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
    """A slide whistle (falling: SLOW…, SQUEEZE; rising: growth)."""
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    f = f0 * (f1 / f0) ** u
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.25 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.minimum(1, u / 0.05) * np.minimum(1, (1 - u) / 0.15)


def poof(dur: float = 0.4) -> np.ndarray:
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    return lowpass(rng.standard_normal(n), 400 + 1800 * np.exp(-u * 5)) * np.minimum(1, u / 0.04) * np.exp(-u * 4) * 2.4


# ---------------- stations (mirror of index.html) ----------------
END_LINE = END["line"] if END else None
LINES = [L for L in STORY["lines"] if L["i"] != END_LINE]
CH = STORY.get("chapters") or [{"n": 1, "key": "all", "start": 0.0,
                                "end": (END["start"] - 0.2) if END else (R["start"] if R else DUR)}]
last_end = CH[-1]["end"]
END_START = (min(last_end, END["start"]) if last_end <= END["start"] + 0.05 else END["start"] - 0.2) if END else None
ST = [{"key": c["key"], "start": 0.0 if k == 0 else c["start"], "lines": []} for k, c in enumerate(CH)]
for L in LINES:
    k = -1
    for i, c in enumerate(CH):
        if L["start"] >= c["start"] - 0.25:
            k = i
    ST[max(0, k)]["lines"].append(L)
STARTS = [s["start"] for s in ST] + ([END_START] if END else [])
SEAMS = STARTS[1:] + ([R["start"]] if R else [])
for k, s in enumerate(ST):
    s["end"] = STARTS[k + 1] if k + 1 < len(STARTS) else (R["start"] if R else DUR)

# ---------------- the draft beat (mirror of api.placeholder) ----------------
SPLIT = re.compile(r"^[，。：；！？,;:!?]$")
PUNCT = re.compile(r"^[，。：；、！？,.;:!?…—–\-（）()「」『』《》“”\"'‘’·]+$")
TERMU = re.compile(r"^[A-Za-z0-9.%+–\-/]+$")
ALNUM = re.compile(r"[A-Za-z0-9]")


def em_width(s: str) -> float:
    w = 0.0
    for ch in s:
        o = ord(ch)
        w += 1 if (0x3000 <= o <= 0x303F or 0x3400 <= o <= 0x9FFF or 0xFF00 <= o <= 0xFFEF) else 0.26 if ch == " " else 0.58
    return w


def key_phrase(L: dict) -> list[int]:
    W = L["words"]
    cl, cur = [], []
    for k, w in enumerate(W):
        if SPLIT.match(w[0]):
            if cur:
                cl.append(cur)
            cur = []
        else:
            cur.append(k)
    if cur:
        cl.append(cur)
    out = []
    for c in cl:
        c = list(c)
        while c and PUNCT.match(W[c[0]][0]):
            c.pop(0)
        while c and PUNCT.match(W[c[-1]][0]):
            c.pop()
        if c:
            out.append(c)
    if not out:
        return []
    ws = [sum(em_width(W[k][0]) for k in c) for c in out]
    mx, pick = max(ws), 0
    for i, w in enumerate(ws):
        if w >= 0.6 * mx:
            pick = i
    return out[pick]


def terms(L: dict) -> list[dict]:
    W = L["words"]
    runs, cur = [], None
    for k, w in enumerate(W):
        if TERMU.match(w[0]):
            if cur is None:
                cur = []
                runs.append(cur)
            cur.append(k)
        else:
            cur = None
    out, seen = [], set()
    for r in runs:
        while r and not ALNUM.search(W[r[0]][0]):
            r.pop(0)
        while r and not ALNUM.search(W[r[-1]][0]):
            r.pop()
        if not r:
            continue
        text = ""
        for i, k in enumerate(r):
            u = W[k][0]
            if i and ALNUM.search(text[-1]) and ALNUM.search(u[0]):
                text += " "
            text += u
        num = bool(re.search(r"[0-9]", text))
        if len(re.sub(r"\s", "", text)) < 2 or (not num and len(re.sub(r"[^A-Za-z]", "", text)) < 2):
            continue
        if text in seen:
            continue
        seen.add(text)
        out.append({"text": text, "t": W[r[0]][1], "num": num, "k": r[0]})
    if len(out) > 4:
        out = sorted(([o for o in out if o["num"]] + [o for o in out if not o["num"]])[:4], key=lambda o: o["k"])
    pk = max([i for i, o in enumerate(out) if o["num"]], default=-1)
    for i, o in enumerate(out):
        o["pink"] = i == pk
    return out


def draft_beat(L: dict, st: dict, j: int) -> None:
    t0 = L["start"]
    pan = -0.25 + 0.5 * ((L["i"] % 3) / 2)
    bed.place(pop(1500), t0 - 0.1, -44, 0.6)                    # 待演绎 pops
    bed.place(boing(260, 0.26), t0 - 0.08, -38, pan)            # the balloon pops open
    bed.place(pop(620), t0 + 0.06, -36, pan)
    if (NOTES.get(st["key"]) or [])[j:j + 1]:
        stamp(t0 + 0.16, -36, -0.5)                             # the note box slams
    W = L["words"]
    for n, k in enumerate(key_phrase(L)):
        bed.place(pop(900 + 70 * (n % 5)), W[k][1] - 0.02, -42, pan)   # every lettered unit lights up
    for o in terms(L):
        stamp(o["t"] + 0.08, -29 if o["pink"] else -34, 0.5)
        bed.place(pop(1300), o["t"] - 0.06, -42, 0.5)
        if o["pink"]:
            bed.place(thump(55, 0.4), o["t"] + 0.08, -32, 0.4)


# ================= seams: the halftone dot wipe =================
for s in SEAMS:
    bed.place(whoosh(0.6, 0.45), s - 0.28, -31)

# ================= camera whips (default strip camera) =================
if WHIPS:
    for st in ST:
        last = st["start"]
        for j in range(1, len(st["lines"])):
            L = st["lines"][j]
            w0 = max(L["start"] - 0.42, last + 0.1)
            w1 = max(L["start"] + 0.06, w0 + 0.3)
            bed.place(whoosh(w1 - w0 + 0.1, 0.5), w0 - 0.02, -35, 0.0)
            last = w1

# ================= draft beats =================
for st in ST:
    for j, L in enumerate(st["lines"]):
        if L["i"] not in PERFORMED:
            draft_beat(L, st, j)

# ================= your beats: sounds for the lines you performed go here =================
# e.g. stamp(phrase(3, "越写越慢") + 0.46, -34)  ·  bed.place(whoosh(0.4, 0.5), at(5, "查") - 0.1, -34)

# ================= the closing station: Kit.title over a splash burst =================
if END:
    EL = line(END_LINE)
    W = EL["words"]
    bed.place(pop(520), END_START + 0.1, -36)
    bed.place(swell(max(1.0, EL["end"] + 0.6 - END["start"])), END["start"] - 0.1, -36)
    segs, cur = [], []
    for i, w in enumerate(W):
        cur.append(i)
        if re.match(r"^[，：；,;:]$", w[0]):
            segs.append(cur)
            cur = []
    if cur:
        if all(re.match(r"^[。！？.!?]$", W[i][0]) for i in cur) and segs:
            segs[-1].extend(cur)
        else:
            segs.append(cur)
    for seg in segs:
        stamp(W[seg[0]][1] + 0.04, -32, 0.0)                     # each row box slams
    for u, t in W:
        if not re.match(r"^[，。：；、！？,.;:!?]$", u):
            bed.place(click(0.9), t - 0.04, -40, 0.3)            # every unit lands
    emph = []
    for e in END.get("emphasis") or []:
        try:
            emph.append(phrase(END_LINE, e))
        except KeyError:
            pass
    emph.sort()
    for n, x in enumerate(emph):
        if n == len(emph) - 1:
            bed.place(thump(45, 0.6), x + 0.06, -24)
            bed.place(zap(0.24), x + 0.04, -32)
            stamp(x + 0.06, -26, 0.0, low=55)
        else:
            stamp(x + 0.06, -31, -0.3 + 0.3 * n)

# ================= recap: splash page + numbered points =================
if R:
    s = R["start"]
    stamp(s + 0.28, -27, 0.0, low=55)
    bed.place(swell(R["end"] - s), s, -34)
    stamp(s + 0.56, -32, 0.0)
    pts = R.get("points") or []
    for i in range(len(pts)):
        stamp(s + 0.72 + i * 0.3 + 0.14, -32, [-0.6, 0.6, -0.6, 0.6, 0.0, 0.0][i % 6])
    bed.place(chime(), s + 0.72 + len(pts) * 0.3 + 0.2, -36)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(R["start"], 8) if R else None))
