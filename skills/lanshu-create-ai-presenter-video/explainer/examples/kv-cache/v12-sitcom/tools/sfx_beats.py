"""Topic sounds for the KV cache 小剧场 — the sound twin of beats.js (same story calls, same offsets).

tools/sfx.py places the chrome (the dolly between sets + its ding, the closing swell and title ticks, the curtain-call recap)
and then calls place(bed, T) below.
"""

PLACEHOLDERS = []     # every line is performed in beats.js
END_STAGE = False     # beats.js builds its own closing scene (api.endStage.on = false)


def place(bed, T):
    SS, S, G, at, ph = T.SS, T.S, T.G, T.at, T.ph
    ch = {c["key"]: c for c in T.story["chapters"]}

    def steps(t, n=4, cps=5.0, g=-13, pan=0.0):
        bed.place(SS.steps(n, cps), t, G + g, pan=pan)

    # ---------------- 1 · 误区 ----------------
    bed.place(SS.pop2(700), at(1, "奶") - 0.05, G - 8)                       # the board's title pops
    steps(ph(1, "新来的店员") - 0.3, 5, 5.5, -12, 0.5)                       # 小林 walks in behind the counter
    bed.place(SS.pop2(900), at(1, "小") - 0.05, G - 8, pan=0.4)              # name tag
    bed.place(SS.bloop(), at(1, "发") + 0.05, G - 10, pan=0.4)               # ？
    more = ph(1, "客人越多")
    bed.place(SS.door_bell(), more - 0.08, G - 10, pan=-0.7)
    for d in (0, 0.17, 0.34, 0.5, 0.66):                                     # five more walk in
        steps(more + d, 3, 5.5, -16, -0.6)
    for t in (0.9, 2.2, 3.95):                                               # 叫号 flips, slower and slower
        bed.place(S.tick(1800), t, G - 13, pan=0.1)
    slower = at(1, "越", 2)
    for i in range(7):                                                       # the clock races
        bed.place(S.tick(3000), slower - 0.1 + i * 0.13, G - 17, pan=-0.1)
    bed.place(SS.shuffle(1.2), at(1, "出"), G - 17, pan=0.4)                 # busy hands
    bed.place(SS.pop2(800), at(1, "出") + 0.2, G - 12, pan=-0.6)             # the note
    bed.place(SS.pop2(520), at(2, "他") - 0.02, G - 6)                       # the thought bubble
    bed.place(SS.scribble(0.9), at(2, "是"), G - 16)
    bed.place(SS.bloop(), at(2, "手"), G - 8, pan=0.4)                       # sweat
    bed.place(SS.boing(170, 0.4), at(2, "慢"), G - 12, pan=0.4)              # slump
    bed.place(SS.stamp(), at(2, "。") - 0.02, G - 6, pan=-0.2)               # 误区

    # ---------------- 2 · 账单 ----------------
    s1 = ch["receipt"]["start"]
    steps(s1 - 0.05, 5, 6.0, -13, -0.3)                                      # 小林 hurries in
    bed.place(SS.flip(), at(3, "拿"), G - 12, pan=0.5)                       # she lifts the slip
    bed.place(SS.pop2(650), at(3, "第") - 0.05, G - 6, pan=-0.4)             # the close-up
    bed.place(S.tick(1800), at(3, "第") + 0.1, G - 13, pan=0.1)              # 叫号 #008
    bed.place(SS.pop2(1000), at(3, "第") + 0.12, G - 10, pan=-0.2)           # #008 tag
    rec = ph(3, "出单记录")
    bed.place(SS.printer(at(3, "7") + 0.1 - rec), rec + 0.1, G - 13, pan=-0.4)
    bed.place(S.tick(2400), at(3, "单", 2), G - 12, pan=-0.4)                # the new order's row
    bed.place(SS.norm(S.whoosh(0.7, 0.5)), at(3, "前") - 0.35, G - 20)                # push in on the slip
    again, done = at(3, "又"), at(3, "遍")
    for i in range(7):                                                       # 又核一遍 × 7
        bed.place(SS.stamp(), again + i * (done - again) / 7, G - 10, pan=-0.5 + 0.06 * i)
    bed.place(SS.norm(S.thump(80, 0.3)), done + 0.05, G - 10, pan=-0.4)               # footer
    aha = at(4, "原")
    bed.place(SS.pop2(520), aha - 0.04, G - 6, pan=0.2)                      # 原来是这样！
    bed.place(SS.boing(380, 0.3), aha + 0.02, G - 10, pan=0.3)
    newc = ph(4, "新客人")
    bed.place(SS.door_bell(), newc - 0.2, G - 10, pan=-0.7)
    steps(newc - 0.15, 4, 5.5, -15, -0.6)
    bed.place(S.tick(1800), newc + 0.2, G - 13, pan=0.0)                     # #009
    every = ph(4, "前面所有人")
    bed.place(SS.norm(S.felt(0.4)), every - 0.45, G - 11, pan=0.3)                    # the board is wiped
    bed.place(SS.norm(S.chalk_line(0.6)), every - 0.1, G - 12, pan=0.3)               # chalk title
    rech = ph(4, "重核")
    for c in range(8):                                                       # the staircase, column by column
        tc = newc + 0.55 + c * ((rech + 0.4 - newc - 0.55) / 7)
        bed.place(SS.pop2(560 + 40 * c), tc, G - 13, pan=0.1 + 0.05 * c)
    bed.place(SS.norm(S.blip(880, 0.3)), rech, G - 13, pan=0.3)                       # the re-checks flash
    later, slow = at(4, "越"), at(4, "慢")
    bed.place(SS.norm(S.chalk_line(slow - later)), later, G - 11, pan=0.3)            # 越往后越慢
    bed.place(SS.norm(S.chalk_line(0.4)), slow - 0.05, G - 12, pan=0.5)
    bed.place(SS.norm(S.chalk_line(0.45)), slow + 0.3, G - 12, pan=0.5)
    bed.place(SS.ding(1567.98), slow + 0.05, G - 11, pan=0.4)                # 36 / 28
    bed.place(SS.pop2(800), every, G - 12, pan=-0.6)                         # the note

    # ---------------- 3 · 对照 ----------------
    s2 = ch["notebook"]["start"]
    steps(s2 - 0.05, 5, 6.0, -13, -0.3)
    bed.place(SS.flip(), s2 + 0.25, G - 11, pan=-0.1)                        # the slip pile
    hand, him, book, each = at(5, "递"), at(5, "他"), ph(5, "小本本"), at(5, "每")
    bed.place(SS.norm(S.whoosh(him + 0.25 - hand, 0.5)), hand, G - 16, pan=0.3)       # handed over
    bed.place(SS.norm(S.thump(110, 0.25)), him + 0.25, G - 12, pan=0.2)
    bed.place(SS.pop2(760), hand + 0.1, G - 10, pan=-0.1)                    # 一堆重核的小票
    bed.place(SS.pop2(980), book - 0.02, G - 10, pan=0.2)                    # 一个小本本
    bed.place(SS.norm(S.whoosh(0.45, 0.4)), each - 0.1, G - 17, pan=-0.3)             # the pile slides away
    bed.place(SS.norm(S.whoosh(0.55, 0.5)), each - 0.15, G - 14, pan=-0.2)            # the book flies up
    bed.place(SS.flip(), each + 0.15, G - 8, pan=-0.4)                       # and opens
    for i in range(5):
        bed.place(SS.scribble(0.26), each + 0.25 + i * 0.2, G - 14, pan=-0.5)
    bed.place(SS.stamp(), ph(5, "只记一次"), G - 8, pan=0.1)
    no, match = ph(5, "单号"), at(5, "对")
    bed.place(SS.norm(S.blip(660, 0.25)), no, G - 14, pan=-0.5)
    bed.place(SS.pop2(1100), no + 0.1, G - 12, pan=-0.3)                     # her ticket
    bed.place(SS.ding(1760.0), match, G - 10, pan=-0.3)                      # matched
    content, take = ph(5, "内容"), at(5, "取")
    bed.place(SS.norm(S.blip(880, 0.25)), content, G - 14, pan=-0.4)
    bed.place(SS.norm(S.whoosh(0.45, 0.5)), take - 0.1, G - 16, pan=-0.3)             # the tea comes out of the book
    bed.place(SS.pop2(620), take + 0.35, G - 10, pan=-0.3)
    steps(take + 0.35, 4, 4.5, -15, -0.6)                                    # she walks off with it
    bed.place(SS.pop2(800), match + 0.2, G - 12, pan=0.6)                    # the note
    newc = ph(6, "新客人")
    bed.place(SS.door_bell(), newc - 0.15, G - 10, pan=-0.7)
    steps(newc - 0.1, 4, 5.5, -15, -0.6)
    bed.place(S.tick(1800), newc + 0.3, G - 13, pan=0.4)                     # #006
    write, this = ph(6, "只写"), ph(6, "这一张")
    bed.place(SS.scribble(this + 0.3 - write), write + 0.1, G - 12, pan=-0.4)
    bed.place(SS.pop2(900), this, G - 10, pan=0.1)
    flip, look, ok = at(6, "翻"), at(6, "查"), ph(6, "就行")
    bed.place(SS.flip(), flip, G - 6, pan=-0.4)
    for i in range(5):
        bed.place(S.tick(2600), look - 0.1 + i * 0.08, G - 16, pan=-0.4)
    bed.place(SS.boing(320, 0.4), ok, G - 8, pan=0.2)
    steps(ok - 0.05, 4, 4.5, -15, -0.6)
    steps(ok + 0.45, 4, 4.5, -16, -0.6)

    # ---------------- 4 · 真名 ----------------
    model = at(7, "大")
    bed.place(SS.boing(260, 0.4), model - 0.12, G - 6, pan=-0.2)             # the model hops in
    bed.place(SS.norm(S.blip(1200, 0.12)), model + 0.05, G - 14, pan=-0.2)
    bed.place(SS.norm(S.blip(1500, 0.12)), model + 0.16, G - 14, pan=-0.2)
    bed.place(SS.pop2(900), model, G - 10, pan=-0.2)                         # 大模型 tag
    bed.typing(ph(7, "写字"), 5, 6.25, G - 10, pan=0.3)                      # tokens 1–5
    same = ph(7, "一样")
    bed.place(SS.pop2(600), same - 0.06, G - 8, pan=-0.3)                    # 我也一样！
    bed.place(SS.flip(), same - 0.05, G - 13, pan=0.2)                       # the notebook
    each = ph(7, "前面每个")
    for i in range(5):
        bed.place(S.tick(2000), each + i * 0.14, G - 16, pan=0.3)
    for t in (at(7, "token"), at(7, "Key"), at(7, "Value"), at(7, "KV")):    # the four name chips land
        bed.place(SS.norm(S.whoosh(0.3, 0.6)), t - 0.05, G - 18, pan=-0.6)
        bed.place(SS.stamp(), t + 0.28, G - 9, pan=-0.6)
    for j in range(5):
        bed.place(SS.pop2(1200), at(7, "Key") + j * 0.06, G - 15, pan=0.3)
        bed.place(SS.pop2(900), at(7, "Value") + j * 0.06, G - 15, pan=0.3)
    into = at(7, "记")
    bed.place(SS.norm(S.whoosh(1.0, 0.5)), into, G - 14, pan=0.3)                     # K and V filed into the book
    for j in range(10):
        bed.place(S.tick(2400), into + 0.45 + j * 0.065, G - 17, pan=0.3)
    kv = at(7, "KV")
    bed.place(SS.stamp(), kv - 0.04, G - 4, pan=0.3)                         # KV cache
    bed.place(SS.ding(1318.5), kv + 0.05, G - 10, pan=0.3)
    cost = at(8, "代")
    bed.place(SS.stamp(), cost, G - 6, pan=0.3)                              # 代价
    bed.place(SS.pop2(800), cost + 0.1, G - 12, pan=-0.6)                    # the note
    thick = ph(8, "越记越厚")
    bed.typing(thick, 4, 4.2, G - 11, pan=0.4)                               # tokens 6–9
    for i in range(3):
        bed.place(SS.flip(), thick + 0.2 + i * 0.35, G - 15, pan=0.3)        # the book thickens
    takes, vram = at(8, "占"), at(8, "显")
    bed.place(SS.pop2(500), takes - 0.15, G - 8, pan=0.3)                    # the memory stick
    for i in range(6):
        bed.place(SS.norm(S.blip(330, 0.14)), cost + 0.2 + i * ((vram - cost) / 6), G - 15, pan=0.3)
    bed.place(SS.bloop(), takes, G - 10, pan=-0.2)                           # the model sweats
    bed.place(SS.stamp(), vram - 0.04, G - 6, pan=0.1)                       # 显存

    # ---------------- 结尾 ----------------
    EL = T.line(T.story["end"]["line"])
    words = [w for w in EL["words"] if w[0] not in "，。：；！？、"]
    for u, t in words[3:]:                                                   # the board is chalked as it is spoken
        bed.place(SS.norm(S.chalk(2)), t + 0.02, G - 17, pan=0.0)
    only, new1 = ph(9, "只算"), ph(9, "新来的")
    bed.place(SS.pop2(900), only - 0.2, G - 12, pan=0.5)                     # the KV cache tag
    for i in range(3):                                                       # the three name chips are recalled
        bed.place(SS.norm(S.whoosh(0.3, 0.6)), EL["start"] + 0.05 + 0.15 * i - 0.05, G - 18, pan=-0.6)
        bed.place(SS.stamp(), EL["start"] + 0.05 + 0.15 * i + 0.28, G - 10, pan=-0.6)
    bed.place(SS.scribble(0.6), new1, G - 12, pan=-0.5)                      # the new row
    bed.place(S.tick(2600), new1 + 0.05, G - 12, pan=0.5)                    # the new token
    bed.place(SS.pop2(1000), new1 + 0.08, G - 10, pan=0.0)
    cache, look = ph(9, "缓存"), at(9, "查")
    bed.place(SS.flip(), cache - 0.05, G - 8, pan=-0.5)
    bed.place(SS.flip(), cache, G - 8, pan=0.5)
    bed.place(SS.boing(330, 0.4), look + 0.1, G - 8, pan=-0.3)
    bed.place(SS.boing(300, 0.4), look + 0.16, G - 8, pan=0.3)
