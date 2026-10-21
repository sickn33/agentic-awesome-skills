#!/usr/bin/env python3
"""KV cache · v4-paper — procedural paper sound bed timed to the picture (45 s; voice ends ≈ 39.7 s, recap 40.3–45).

Run from the project dir:  python3 tools/sfx.py   → assets/audio/sfx.wav
Every time comes from the story (lib/story.js) with the same offsets index.html uses, so a re-timed story re-times the bed.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(ROOT / "lib"), str(ROOT / "lib" / "kit")]
from sfxlib import Bed  # noqa: E402
import paper_sfx as P  # noqa: E402

story = json.loads(re.search(r"window\.STORY = (\{.*\});", (ROOT / "lib/story.js").read_text(encoding="utf-8"), re.S).group(1))
W = {L["i"]: L["words"] for L in story["lines"]}


def at(line, unit, nth=1):
    k = 0
    for u, t in W[line]:
        if u == unit:
            k += 1
            if k == nth:
                return t
    raise KeyError((line, unit))


def ph(line, text):
    units = [u for u, _ in W[line]]
    for s in range(len(units)):
        acc = ""
        for e in range(s, len(units)):
            acc += units[e]
            if acc == text:
                return W[line][s][1]
            if len(acc) >= len(text):
                break
    raise KeyError((line, text))


L = {L["i"]: L for L in story["lines"]}
T = dict(
    answer=at(1, "回"), tok1=at(1, "token", 1), tok2=at(1, "token", 2), beng=at(1, "蹦"),
    newTok=at(2, "新"), lookBack=ph(2, "回头看"), all=ph(2, "所有"), l2end=L[2]["end"],
    ifEach=at(3, "要"), each=ph(3, "每次"), recompute=ph(3, "重新算"), slower=ph(3, "越写越慢"),
    kv=at(4, "KV"), key=at(4, "Key"), value=at(4, "Value"), once=ph(4, "只算一次"), store=ph(4, "存起来"),
    only=ph(5, "只算"), onlyNew=at(5, "新"), thatOne=ph(5, "那一个"), lookup=ph(5, "再去缓存里查"), query=at(5, "查"), l5end=L[5]["end"],
    cost=at(6, "代"), vram=ph(6, "显存"), ctx=[at(6, "跟"), at(6, "着"), at(6, "上"), at(6, "文")], rise=at(6, "涨"),
    llama=at(7, "Llama"), say=at(7, "说"), per=at(7, "每"), perGe=at(7, "个"), perTok=at(7, "token"), da=at(7, "大"), half=at(7, "0.5"),
    k4=at(7, "4K"), jiu=at(7, "就"), gb2=at(7, "2", 2), gb=at(7, "GB"),
    fixes=at(8, "所"), gqa=at(8, "GQA"), share=ph(8, "共用"), kAndV=at(8, "K"), vEnd=at(8, "V"), paged=at(8, "PagedAttention"),
    cut=at(8, "页"), sep=at(8, "分"), go=at(8, "配"), quant=ph(8, "量化"), compress=ph(8, "压缩"),
    one=at(9, "一"), vram9=ph(9, "显存"), swap=at(9, "换"), speed=ph(9, "速度"), only9=ph(9, "只算"), new9=at(9, "新"), that9=ph(9, "那一个"),
)
EMIT = [T["tok1"] - 0.3, T["tok2"] - 0.3, T["beng"] - 0.26, T["newTok"] - 0.28, T["onlyNew"] - 0.34]

G = -30  # the KV narration sits ≈ -19 dB RMS (active): paper transients peak ≈ 8–15 dB under it
bed = Bed(45.0, seed_value=20261005)

# beat 1 · the press stands up, the question is hung, tokens hop out one at a time
bed.place(P.fold(1.4), 0.08, G)
bed.place(P.hang(), T["answer"] + 0.15, G - 2, pan=0.1)
for i, te in enumerate(EMIT):
    if i < 4:
        bed.place(P.tick_train(1, 0.0, 1600), te - 0.18, G - 6, pan=-0.5)   # the crank turns
    bed.place(P.flip(), te, G - 4, pan=-0.3 + 0.12 * i)                     # 蹦: out of the slot
    bed.place(P.tap(0.9), te + 0.42, G - 1, pan=-0.2 + 0.12 * i)            # lands on the row
bed.place(P.unroll(0.5), T["beng"] - 0.5, G - 7)

# beat 2 · the new token looks back at every earlier one
bed.place(P.unroll(0.45), T["lookBack"] - 0.45, G - 8)
for j in range(3):
    bed.place(P.string(0.32), T["lookBack"] + j * 0.13, G - 7, pan=0.1 - 0.15 * j)
for i in range(3):
    bed.place(P.tap(0.5), T["all"] + (2 - i) * 0.05 + 0.05, G - 8, pan=-0.3 + 0.1 * i)

# beat 3 · the question is pulled up, the press lies down, the camera moves on; the staircase of recomputation
bed.place(P.string(0.5), T["ifEach"] - 0.45, G - 9, pan=0.1)
bed.place(P.slap(1.2), T["ifEach"] - 0.35, G - 4, pan=-0.5)
bed.place(P.unroll(0.8), 7.15, G - 10)   # the pan: a soft page slide
bed.place(P.fold(1.6), T["ifEach"], G - 1, pan=0.4)
for r in range(8):
    bed.place(P.tap(0.4 + 0.08 * r), T["each"] + r * 0.11, G - 7, pan=0.35)
bed.place(P.rustle(0.6, 40), T["recompute"], G - 6, pan=0.35)            # 重新算: the waste flashes
bed.place(P.fold(1.0), T["slower"] - 0.42, G - 4, pan=-0.05)
for k in range(8):
    bed.place(P.tick_train(1, 0.0, 2300 - 120 * k), T["slower"] - 0.05 + k * 0.085, G - 5, pan=0.0)
bed.place(P.unroll(0.5), T["recompute"] + 0.45, G - 8)

# beat 4 · the cabinet replaces the staircase; K and V pop out once; they are filed away
bed.place(P.slap(1.4), T["kv"] - 0.42, G - 3, pan=0.35)
bed.place(P.fold(1.6), T["kv"] - 0.05, G, pan=0.35)
for i in range(4):
    bed.place(P.tap(1.1), T["key"] + i * 0.07, G - 6, pan=-0.5 + 0.1 * i)
    bed.place(P.tap(0.8), T["value"] + i * 0.07, G - 6, pan=-0.45 + 0.1 * i)
bed.place(P.fold(1.0), T["once"], G - 2, pan=-0.05)
bed.place(P.unroll(0.5), T["value"] + 0.25, G - 8)
for i in range(4):
    bed.place(P.string(0.45), T["store"] + i * 0.12, G - 9, pan=-0.2)
    bed.place(P.tap(0.7), T["store"] + i * 0.12 + 0.5, G - 4, pan=0.35)

# beat 5 · only the new token computes; Q looks it up; the matching V's come back
bed.place(P.flip(), T["onlyNew"] - 0.34, G - 4, pan=-0.6)
bed.place(P.tap(0.9), T["onlyNew"] + 0.08, G - 2, pan=-0.2)
bed.place(P.tap(1.1), T["onlyNew"] + 0.22, G - 7, pan=-0.2)
bed.place(P.tap(0.8), T["onlyNew"] + 0.30, G - 7, pan=-0.2)
bed.place(P.string(0.45), T["thatOne"] + 0.02, G - 8, pan=0.1)
bed.place(P.tap(0.7), T["thatOne"] + 0.52, G - 4, pan=0.35)
bed.place(P.tap(1.2), T["lookup"], G - 5, pan=-0.2)
for r in range(5):
    bed.place(P.tick_train(1, 0.0, 2600), T["lookup"] + 0.45 + r * 0.13, G - 7, pan=0.35)
for j in range(4):
    bed.place(P.tap(0.5), T["query"] - 0.05 + j * 0.08 + 0.5, G - 8, pan=-0.2)
bed.place(P.tape(0.55), T["query"] + 0.2, G - 9, pan=-0.3)
bed.place(P.tape(0.55), T["query"] + 0.5, G - 9, pan=-0.3)
bed.place(P.unroll(0.45), T["only"] + 0.05, G - 9)

# beat 6 · the camera carries the cache to 显存; the cache grows with the context
bed.place(P.unroll(1.0), 19.95, G - 8)
bed.place(P.fold(1.8), T["vram"] - 0.12, G - 1, pan=-0.4)
for k, tc in enumerate(T["ctx"]):
    bed.place(P.slap(0.8), tc, G - 3, pan=-0.4)
    if k:
        bed.place(P.flip(), tc, G - 7, pan=0.2)
bed.place(P.tape(0.9), T["ctx"][0], G - 11, pan=0.2)
bed.place(P.slap(1.0), T["rise"], G - 2, pan=-0.3)
bed.place(P.unroll(0.5), T["rise"] - 0.65, G - 8)

# beat 7 · Llama 2 7B, the per-token bill, ×4K = 2 GB
bed.place(P.hang(), T["llama"] + 0.02, G - 2, pan=-0.1)
bed.place(P.fold(1.6), T["say"] - 0.1, G - 2, pan=0.2)
for tt in [T["per"], T["perGe"], T["perTok"], T["da"], T["half"], T["k4"] - 0.3, T["k4"], T["gb2"]]:
    bed.place(P.fold(0.6), tt, G - 5, pan=0.25)
for tt in [T["per"] + 0.1, T["perGe"] + 0.14, T["perTok"] + 0.14, T["half"] - 0.22, T["k4"] - 0.14, T["gb2"] - 0.25]:
    bed.place(P.tap(1.0), tt, G - 9, pan=0.25)
bed.place(P.fold(1.0), T["gb"], G - 1, pan=-0.4)
bed.place(P.unroll(0.4), T["jiu"] - 0.6, G - 10)

# beat 8 · three fixes, each shrinks the cache
bed.place(P.slap(1.6), T["fixes"] - 0.25, G - 3, pan=0.2)
bed.place(P.fold(1.6), T["fixes"] + 0.05, G - 2, pan=0.2)
for tt in [T["gqa"], T["paged"], T["quant"]]:
    bed.place(P.fold(0.6), tt - 0.1, G - 4, pan=0.1)
for i in range(4):
    bed.place(P.tap(0.8), T["gqa"] + i * 0.06, G - 9, pan=-0.1 + 0.1 * i)
    bed.place(P.string(0.3), T["share"] - 0.05 + i * 0.05, G - 10, pan=-0.1 + 0.1 * i)
for i in range(3):
    bed.place(P.slap(0.6), T["kAndV"] + 0.05 * i, G - 7, pan=0.2 + 0.1 * i)
bed.place(P.string(0.42), T["kAndV"], G - 9, pan=-0.5)                    # the memory slabs shrink
bed.place(P.stamp(), T["vEnd"], G - 2, pan=0.4)
bed.place(P.tape(0.4), T["paged"], G - 8, pan=0.1)
for k in range(5):
    bed.place(P.tap(1.3), T["cut"] - 0.12 + k * 0.04, G - 6, pan=-0.2 + 0.1 * k)  # snips
bed.place(P.rustle(0.3, 50), T["sep"], G - 8)
for k in range(4):
    bed.place(P.slap(0.5), T["go"] - 0.25 + k * 0.06, G - 9, pan=0.2 + 0.1 * k)
bed.place(P.fold(0.6), T["go"] + 0.12, G - 6)
for i in range(4):
    bed.place(P.tap(0.8), T["quant"] + i * 0.05, G - 9, pan=-0.2 + 0.1 * i)
bed.place(P.string(0.36), T["compress"], G - 7, pan=0.0)
bed.place(P.stamp(), T["compress"] + 0.25, G - 3, pan=0.4)

# beat 9 · the trade; only the newest token is computed
bed.place(P.unroll(0.8), 35.5, G - 9)
bed.place(P.fold(1.6), T["one"] - 0.2, G - 2, pan=-0.4)
for i in range(5):
    bed.place(P.tap(0.6), T["one"] - 0.25 + i * 0.07, G - 8, pan=0.1 + 0.1 * i)
end = story["end"]
for u, t in W[end["line"]]:
    if u not in "，。：":
        bed.place(P.tap(0.55), t, G - 9)
bed.place(P.unroll(0.5), ph(9, "用显存") - 0.16, G - 6)
bed.place(P.unroll(0.5), T["only9"] - 0.16, G - 6)
for k in range(4):
    bed.place(P.slap(0.6), T["vram9"] + k * 0.08, G - 5, pan=-0.5)
bed.place(P.slap(1.5), T["swap"], G - 2, pan=-0.3)
bed.place(P.flip(), T["speed"] - 0.1, G - 4, pan=0.0)
bed.place(P.fold(0.8), T["new9"] - 0.12, G - 3, pan=0.6)
bed.place(P.tap(1.0), T["that9"], G - 5, pan=0.6)

# recap · the last page folds up (the voice is over: the bed is lifted)
rc = story["recap"]
bed.place(P.page_up(rc["end"] - rc["start"]), rc["start"], G - 6)
bed.place(P.fold(1.2), rc["start"] + 0.45, G - 4)
for i in range(len(rc["points"])):
    bed.place(P.fold(0.8), rc["start"] + 0.75 + i * 0.17, G - 6, pan=-0.45 + 0.3 * i)

print(bed.write(str(ROOT / "assets/audio/sfx.wav"), lift_after=(rc["start"], 8)))
