#!/usr/bin/env python3
"""v4-paper starter — the paper sound bed, timed from the story (lib/story.js) with the same layout rules as index.html.

Run from the project dir (tools/sfx.sh does it):  python3 tools/sfx.py → assets/audio/sfx.wav
Chrome sounds (this file): the camera's page slides between stations and cards, the signposts folding up, the draft cards
(fold + stamp tap), the closing line (plinth, emphasis tags, ribbons unrolling, a word-printing tap per unit, a low swell),
the recap page (page_up + folds; the unvoiced tail is lifted). Topic sounds: tools/sfx_beats.py (the twin of beats.js).
Keep the timing constants below in step with the [sfx] marks in index.html.
"""
import importlib.util
import json
import re
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "lib"), str(ROOT / "lib" / "kit")]
import sfxlib as S  # noqa: E402
from sfxlib import Bed  # noqa: E402
import paper_sfx as P  # noqa: E402

story = json.loads(re.search(r"window\.STORY = (\{.*\});", (ROOT / "lib/story.js").read_text(encoding="utf-8"), re.S).group(1))
DUR = float(story["duration"])
LINES = {L["i"]: L for L in story["lines"]}
END = story.get("end")
END_LINE = END["line"] if END else None

# ---- index.html [sfx] constants ----
CARD_UP, STAMP = -0.25, 0.45
MOVE_FIRST, MOVE_NEXT, MOVE_END = (0.5, 1.05), (0.42, 0.85), (0.55, 1.15)


def at(line, unit, nth=1):
    k = 0
    for u, t in LINES[line]["words"]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError((line, unit, nth))


def ph(line, text):
    units = [u for u, _ in LINES[line]["words"]]
    want = re.sub(r"\s", "", text)
    for s in range(len(units)):
        acc = ""
        for e in range(s, len(units)):
            acc += units[e]
            if acc == want:
                return LINES[line]["words"][s][1]
            if len(acc) >= len(want):
                break
    raise KeyError((line, text))


# ---- the driver's layout: chapters → stations, lines → camera shots ----
chapters = story.get("chapters") or [{"n": 1, "key": "all", "title": "", "start": 0.0, "end": DUR}]


def chapter_of(L):
    for i, c in enumerate(chapters):
        if L["start"] >= c["start"] - 1e-6 and L["start"] < c["end"]:
            return i
    k = 0
    for i, c in enumerate(chapters):
        if c["start"] <= L["start"]:
            k = i
    return k


beat_lines = [L for L in story["lines"] if L["i"] != END_LINE]
station_lines = [[] for _ in chapters]
for L in beat_lines:
    station_lines[chapter_of(L)].append(L["i"])

shots, prev_t1 = [], -1.0
for idx, L in enumerate(beat_lines):
    k = chapter_of(L)
    first = station_lines[k].index(L["i"]) == 0
    lead, d = MOVE_FIRST if first else MOVE_NEXT
    t0 = L["start"] - lead
    if idx == 0:
        t0, d = 0.0, max(0.8, L["start"] + 0.7)
    t0 = max(t0, prev_t1 + 0.1)
    shots.append(dict(kind="line", line=L["i"], k=k, first=first, t0=t0, t1=t0 + d))
    prev_t1 = t0 + d
if END:
    te0 = max(LINES[END_LINE]["start"] - MOVE_END[0], prev_t1 + 0.1)
    shots.append(dict(kind="end", line=END_LINE, k=None, first=False, t0=te0, t1=te0 + MOVE_END[1]))

# ---- the topic hook ----
hook = None
hp = ROOT / "tools" / "sfx_beats.py"
if hp.exists():
    spec = importlib.util.spec_from_file_location("sfx_beats", hp)
    hook = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(hook)
ph_lines = getattr(hook, "PLACEHOLDERS", None) if hook else None
ph_lines = {L["i"] for L in beat_lines} if ph_lines is None else set(ph_lines)

G = -30  # the narration sits ≈ -19 dB RMS (active): paper transients peak ≈ 8–15 dB under it
bed = Bed(DUR, seed_value=20261005)

# camera: a soft page slide for every travel (louder between stations), signposts fold up as the camera sets off
for sh in shots[1:]:
    if sh["kind"] == "end" or sh["first"]:
        bed.place(P.unroll(0.9), sh["t0"], G - 9)
    else:
        bed.place(P.unroll(0.6), sh["t0"], G - 14)
for k in range(len(chapters)):
    if k == 0:
        t_sign = 0.1
    else:
        sh = next((x for x in shots if x["k"] == k and x["first"]), None)
        t_sign = sh["t0"] + 0.15 if sh else chapters[k]["start"] - 0.15
    bed.place(P.fold(1.2), t_sign, G - 3, pan=-0.45)

# draft cards: fold up as the line starts, the 「待演绎」 stamp comes down
for L in beat_lines:
    if L["i"] not in ph_lines:
        continue
    up = L["start"] + CARD_UP
    bed.place(P.fold(1.5), up, G - 2, pan=0.05)
    bed.place(P.tap(0.9), up + STAMP, G - 7, pan=0.45)

# the closing line: plinth, ribbons unrolling clause by clause, every printed unit a soft tap, emphasis tags, a low swell
if END:
    EL = LINES[END_LINE]
    es = shots[-1]
    bed.place(P.fold(1.8), es["t0"] + 0.4, G - 2)
    bed.place(S.swell(EL["end"] - EL["start"] + 1.2), EL["start"] - 0.3, G - 13)
    units = EL["words"]
    clauses, cur = [], []
    for u, t in units:
        cur.append((u, t))
        if re.fullmatch(r"[，,。：:；;！!？?]", u):
            clauses.append(cur)
            cur = []
    if cur:
        clauses.append(cur)
    for i, cl in enumerate(clauses):
        text = "".join(u for u, _ in cl)
        if i == 0 and len(clauses) >= 3 and re.search(r"[：:]$", text) and len(text) <= 5:
            bed.place(P.fold(0.6), cl[0][1] - 0.1, G - 5)          # the kicker tab
        else:
            bed.place(P.unroll(0.5), cl[0][1] - 0.16, G - 7)       # a ribbon unrolls from the middle
    for u, t in units:
        if not re.fullmatch(r"[，,。：:；;！!？?、]", u):
            bed.place(P.tap(0.55), t, G - 10)
    flat = [u for u, _ in units]
    flat_s = "".join(flat)

    def time_of(e):
        s = re.sub(r"\s", "", e)
        a = flat_s.find(s)
        if not s or a < 0:
            return None
        pos = 0
        for k, u in enumerate(flat):
            if pos + len(u) > a:
                return units[k][1]
            pos += len(u)
        return None

    ems = [time_of(e) for e in (END.get("emphasis") or [])]
    for i, t in enumerate([t for t in ems if t is not None][:4]):
        bed.place(P.fold(0.8), t - 0.06, G - 4, pan=-0.3 + 0.2 * i)

# the recap: the last page folds up (the voice is over, so the bed is lifted)
rc = story.get("recap")
if rc:
    bed.place(P.page_up(rc["end"] - rc["start"]), rc["start"], G - 6)
    bed.place(P.fold(1.2), rc["start"] + 0.45, G - 4)
    for i in range(len(rc["points"])):
        bed.place(P.fold(0.8), rc["start"] + 0.75 + i * 0.17, G - 6, pan=-0.45 + 0.9 * i / max(1, len(rc["points"]) - 1))

# the topic's own sounds
if hook and hasattr(hook, "place"):
    hook.place(bed, SimpleNamespace(story=story, at=at, ph=ph, line=lambda i: LINES[i], P=P, S=S, G=G))

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(rc["start"], 7) if rc else None))
