#!/usr/bin/env python3
"""v12-sitcom starter — the 小剧场 sound bed, timed from the story (lib/story.js) with the same layout rules as index.html.

Run from the project dir (tools/sfx.sh does it):  python3 tools/sfx.py → assets/audio/sfx.wav
Chrome sounds (this file): the camera dolly rolling to each set (+ a soft register ding as it arrives), small shifts between
lines, the draft bubbles (pop, 待演绎 tick, the listener's hop), the end set (chalk words, the cast's hop, a low swell under
the closing line, a tick per printed unit), the curtain-call recap (curtains close / open, light applause, card pops; the
unvoiced tail is lifted). Topic sounds: tools/sfx_beats.py (the twin of beats.js).
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
import sitcom_sfx as SS  # noqa: E402

story = json.loads(re.search(r"window\.STORY = (\{.*\});", (ROOT / "lib/story.js").read_text(encoding="utf-8"), re.S).group(1))
DUR = float(story["duration"])
LINES = {L["i"]: L for L in story["lines"]}
END = story.get("end")
END_LINE = END["line"] if END else None
RC = story.get("recap")
PUNCT = re.compile(r"^[，,。：:；;！!？?、「」『』（）()…—\-]+$")

# ---- index.html [sfx] constants ----
BUBBLE, GESTURE = -0.12, -0.18
MOVE_FIRST, MOVE_NEXT, MOVE_END = (0.6, 1.15), (0.4, 0.75), (0.6, 1.2)


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


def spoken(L):
    return [w for w in L["words"] if not PUNCT.match(w[0])]


# ---- the driver's layout: chapters → sets, lines → shots ----
chapters = story.get("chapters") or [{"n": 1, "key": "all", "title": "", "start": 0.0, "end": DUR}]


def chapter_of(L):
    if L.get("chapter"):
        for i, c in enumerate(chapters):
            if c.get("key") == L["chapter"]:
                return i
    for i, c in enumerate(chapters):
        if L["start"] >= c["start"] - 0.25 and L["start"] < c["end"]:
            return i
    k = 0
    for i, c in enumerate(chapters):
        if c["start"] <= L["start"]:
            k = i
    return k


beat_lines = [L for L in story["lines"] if L["i"] != END_LINE]
set_lines = [[] for _ in chapters]
for L in beat_lines:
    set_lines[chapter_of(L)].append(L["i"])

shots, prev_t1 = [], -1.0
for idx, L in enumerate(beat_lines):
    k = chapter_of(L)
    first = set_lines[k].index(L["i"]) == 0
    lead, d = MOVE_FIRST if first else MOVE_NEXT
    t0 = L["start"] - lead
    if idx == 0:
        t0, d = 0.0, max(0.8, L["start"] + 0.8)
    t0 = max(t0, prev_t1 + 0.1)
    shots.append(dict(kind="line", line=L["i"], k=k, first=first and idx > 0, t0=t0, t1=t0 + d))
    prev_t1 = t0 + d
if END:
    te0 = max(LINES[END_LINE]["start"] - MOVE_END[0], prev_t1 + 0.1)
    shots.append(dict(kind="end", line=END_LINE, k=None, first=True, t0=te0, t1=te0 + MOVE_END[1]))

# ---- the topic hook ----
hook = None
hp = ROOT / "tools" / "sfx_beats.py"
if hp.exists():
    spec = importlib.util.spec_from_file_location("sfx_beats", hp)
    hook = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(hook)
ph_lines = getattr(hook, "PLACEHOLDERS", None) if hook else None
ph_lines = {L["i"] for L in beat_lines} if ph_lines is None else set(ph_lines)
end_on = getattr(hook, "END_STAGE", True) if hook else True

G = -22  # the MiniMax narration sits ≈ -16 dB RMS (active): the bed's transients peak ≈ 8–15 dB under it
bed = Bed(DUR, seed_value=20261008)

# the camera: a dolly roll to every new set (+ a ding on arrival), a soft slide between lines of one set
for sh in shots[1:]:
    if sh["first"]:
        bed.place(SS.truck(sh["t1"] - sh["t0"] + 0.15), sh["t0"], G - 8)
        bed.place(SS.ding(1318.5 if sh["kind"] == "line" else 1567.98), sh["t1"] - 0.12, G - 9, pan=0.25)
    else:
        bed.place(SS.norm(S.whoosh(sh["t1"] - sh["t0"], 0.5)), sh["t0"], G - 16)

# draft bubbles: pop as the line starts, the 待演绎 tag ticks, the speaker shuffles, the listener hops on the last word
for k, ids in enumerate(set_lines):
    for j, i in enumerate(ids):
        if i not in ph_lines:
            continue
        L = LINES[i]
        left = j % 2 == 0
        pan = -0.35 if left else 0.35
        t_in = L["start"] + BUBBLE
        bed.place(SS.pop2(620), t_in, G - 4, pan=pan * 0.6)
        bed.place(S.tick(2600), t_in + 0.25, G - 16, pan=0.5)
        bed.place(SS.shuffle(0.35), L["start"] + GESTURE, G - 16, pan=pan)
        sp = spoken(L)
        t_last = sp[-1][1] if sp else L["end"] - 0.3
        bed.place(SS.boing(300, 0.28), t_last - 0.02, G - 11, pan=-pan)

# the end set: chalk words written as spoken, the cast hops on the last one, a low swell, a tick per printed unit
if END:
    EL = LINES[END_LINE]
    bed.place(SS.norm(S.swell(EL["end"] - EL["start"] + 1.4)), EL["start"] - 0.3, G - 9)
    for u, t in EL["words"]:
        if not PUNCT.match(u):
            bed.place(S.tick(2200), t - 0.05, G - 18, pan=0.1)
    if end_on:
        flat = [u for u, _ in EL["words"]]
        flat_s = "".join(flat)

        def times_of(e):
            s = re.sub(r"\s", "", e)
            a = flat_s.find(s)
            if not s or a < 0:
                return None
            out, pos = [], 0
            for k, u in enumerate(flat):
                if pos + len(u) > a and pos < a + len(s):
                    out.append(EL["words"][k][1])
                pos += len(u)
            return out

        ems = [ts for ts in (times_of(e) for e in (END.get("emphasis") or [])) if ts]
        ems = sorted(ems[:3], key=lambda ts: ts[0])
        for i, ts in enumerate(ems):
            bed.place(SS.norm(S.chalk_line(max(0.25, ts[-1] - ts[0] + 0.2))), ts[0], G - 12, pan=-0.2 + 0.2 * i)
        if ems:
            bed.place(SS.boing(340, 0.42), ems[-1][0], G - 8)

# the recap: curtains close and open, a light audience, cards pop, the cast hops (the voice is over: the bed is lifted)
if RC:
    s0 = RC["start"]
    bed.place(SS.curtain(0.45), s0 - 0.05, G - 6)
    bed.place(SS.curtain(0.6), s0 + 0.42, G - 7)
    bed.place(SS.applause(3.0), s0 + 0.55, G - 13)
    for i in range(len(RC.get("points") or [])):
        bed.place(SS.pop2(560 + 60 * i), s0 + 0.42 + 0.3 + i * 0.16, G - 7, pan=-0.5 if i < (len(RC["points"]) + 1) // 2 else 0.5)
    bed.place(SS.ding(1567.98), s0 + 0.5, G - 10)
    for i in range(2):
        bed.place(SS.boing(300 + 40 * i, 0.3), s0 + 0.42 + 0.55 + i * 0.1, G - 12, pan=-0.2 + 0.4 * i)

# the topic's own sounds
if hook and hasattr(hook, "place"):
    hook.place(bed, SimpleNamespace(story=story, at=at, ph=ph, line=lambda i: LINES[i], spoken=spoken, SS=SS, S=S, G=G))

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(RC["start"], 7) if RC else None))
