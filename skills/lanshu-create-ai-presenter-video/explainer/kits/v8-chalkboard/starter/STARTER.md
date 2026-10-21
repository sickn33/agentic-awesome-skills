# V8 黑板报 starter

The V8 film minus the topic. `tools/new_film.sh v8-chalkboard <story> <project>` copies this folder, syncs core + kit + story,
stamps durations, subsets fonts and builds the sound bed. The result plays end to end; you replace the placeholders in
`beats.js` with performed beats. Workflow after editing `beats.js`:

```bash
python3 tools/fonts.py <project>          # subsets index.html + beats.js + lib text
(cd <project> && bash tools/sfx.sh && npx --yes hyperframes@0.8.81 check)
```

## What the starter draws (all from `window.STORY`)

- **One wooden-framed board.** One panel ("station") per chapter with its chalk border and 美术字 badge
  (`Kit.chapter`, drawn at the chapter start). A chapter has ⌈lines / 2⌉ pages (max 3) of 1840 × 1020, ≤ 2 lines per page.
- **The captions are chalk headlines** (`Kit.say`): every narration line written at its spoken times at the top of its
  page, wrapped by estimated width (rows run to the edge, break after a clause), 64 / 56 / 50 / 44 px so the headlines
  take ≤ 42 % of the page. Default colours: number runs yellow, Latin terms blue.
- **A slot per line** under the headlines (side by side when a page has two lines). The starter's `beats.js` puts a
  storyboard placeholder there: a chalk frame (all frames of a page drawn when the page's first line starts), a
  「待演绎」 stamp with a clapperboard and 「第 n 句」, the line's beat note (`story.notes[chapterKey][j]`, else the line's
  key phrase; a short term after the last "：" gets its own row in yellow 美术字) with each spoken word underlined in
  yellow the moment it is said, and a beat ruler: one tick per spoken unit at its time (terms taller, yellow), with the
  line's start / end times.
- **The 报头 masthead** (if `story.end`): double border, ribbon 「知识小课堂 · title」, the closing line in heavy 美术字
  (`Kit.title`, rows balanced, emphasis underlined as written), a chalk light bulb if the line leaves room on the right,
  and the lesson in one row: a mini panel per chapter in its colour and border.
- **The one-frame mind map** (if `story.recap`, 2–6 points): `Kit.recap` with `centerFit`, each branch carrying a strip
  of its chapter's border as the cue back to its panel.
- `story.draft` → a 「草稿 · 无配音」 tag top-right. No `end` → no masthead / pull-back; no `recap` → the film ends on
  the board at `story.duration`.

## How stations are laid out

Panels go on a **ring**: top row left → right, then bottom row right → left, the masthead top-left (written last, after
the walk comes back to it). Columns = ⌈(pages + masthead) / 2⌉; a chapter never straddles the row turn (the chapter
before a gap is widened to 1 line per page when it has lines to spare). The review goes on the clean panel left at the
end of the ring, else on an extra column to the right of the lesson (outside the pull-back). ≤ 3 pages in all → one row.

| story | layout |
| --- | --- |
| kv-cache (pages 2 1 1 1) | `[报头][一 (2 pages)][复习]` / `[四][三][二]` — exactly the KV film |
| hf-storage (1 1 1 1 1) | `[报头][一][二][复习]` / `[五][四][三]` — exactly the HF film |
| _test-dry (1 1 2) | `[报头][一][二]` / `[复习][三 (2 pages)]` |

**Camera** (`Kit.camera`, keys in board coordinates): t = 0 at 1.06 on the first page; per line a key on the headline
at its start (scale 1.0) and a lean toward its slot at its end (1.03); a travel between pages (0.6–1.3 s by distance,
mid-way zoom-out 0.86 → 0.4, yaw ±6° sideways / roll ±0.8° up-down) arriving at the next line's start; the masthead at
the closing line; the pull-back to the whole lesson near its end; a drifting hold; the cross to the review and a
1.05 → 1.0 settle. It never parks.

## The `api` passed to `Beats(api)`

| member | what |
| --- | --- |
| `story`, `C`, `Kit` / `K`, `G` | the Story, ExplainerCore, the kit, `Kit.geo` |
| `S T X seq wlen` | chalk primitives (stroke, text, eraser, steady writing, width estimate) |
| `at(l, unit, n)`, `phrase(l, text)`, `span(l, text)`, `lineStart(l)`, `lineEnd(l)`, `chap(n)` | times — every beat time comes from these |
| `station(n)`, `stations`, `stationOf(l)` | `{ n, title, key, start, end, P, pages[{x, y, w, h, bx, by, lines}], lines, tone, border, notes }` |
| `slot(l)` | where line l's beat goes: `{ P, x, y, w, h, page, station }` (panel coords); `slot(story.end.line)` = the masthead's free corner (or null) |
| `area(l)` | all slots of l's page together (a beat that uses the whole page under its headlines) |
| `page(l)` | the page `{ x, y, w, h, bx, by, lines }` (bx, by = its centre on the board) |
| `head(l, { tones })` | the line's chalk headline (built once; call it in `Beats` to recolour phrases or reach `.charsOf(text)`) |
| `placeholder(l)` | the storyboard placeholder; returns `{ rect, frame, tag, num, note, lit, ruler, parts }` (erase `parts` with `X`) |
| `look(t, P, x, y, s, { free })` | a camera key on a panel point; replaces the drift keys within 0.35 s; kept inside the page unless `free` |
| `mark(name, t)` | a sound cue: `pop`, `light`, `thump`, `bell` (anything else: a soft knock) |
| `masthead`, `recapPanel`, `board`, `DUR`, `end`, `recap`, `draft`, `isEnd(l)` | the rest of the world |
| `options` | set inside `Beats`: `tones[l]`, `title` (→ `Kit.title`), `recap` (→ `Kit.recap`, e.g. `doodles`), `bulb: false`, `outline: false` |

`Beats` runs once after the board and the slots exist and before the driver writes the headlines, badges, masthead and
review; `render(t)` runs every frame after `Kit.render(t)` (or use `Kit.onRender`).

## Idioms (from the KV film)

**Things pop out on their words** (the tokens in 一 · 问题):

```js
var A = api.area(1), P = A.P, tt = [api.at(1, "token", 1), api.at(1, "token", 2), api.at(1, "蹦")];
["因为", "空气", "把"].forEach(function (w, i) {
  var x = A.x + 60 + i * 230, y = A.y + 60;
  api.S(P, api.G.rect(x, y, 190, 100), "w", 3.6, tt[i], 0.12, { sprite: false });
  api.T(P, Math.round(x + 95 - api.wlen(w) * 25), y + 22, 50, [[w, tt[i] + 0.08, tt[i] + 0.3, "cw"]], { sprite: false });
  api.mark("pop", tt[i]);
});
api.K.note("自回归：每次只生成 1 个 token", { at: [P, A.x + 60, A.y + 260], t: api.at(1, "的") + 0.08, size: 44 }); // one per chapter
```

**The eraser removes what the fix makes unnecessary** (GQA: three of four K/V pairs go):

```js
var s = api.slot(8), pairs = [];
for (var i = 0; i < 4; i++) pairs.push(api.S(s.P, api.G.keyIcon(s.x + 100 + i * 150, s.y + 200, 70), "y", 3.6, api.at(8, "所") + i * 0.07, 0.12, { sprite: false }));
api.X(s.P, pairs.slice(1), [s.x + 230, s.y + 170, 470, 110], api.at(8, "共"), 0.42);
```

**A level / count-up driven by the words** (显存 fills as the context grows; 2 GB counts up on "2 GB"):

```js
var s = api.slot(6), steps = [api.at(6, "跟"), api.at(6, "着"), api.at(6, "上"), api.at(6, "下")];
api.K.gauge({ at: [s.P, s.x + 300, s.y + 90], w: 200, h: s.h - 150, tone: "warn", label: "显存", t: api.at(6, "显"),
  level: function (t) { var v = 0; steps.forEach(function (a, k) { v = Math.max(v, 0.2 * (k + 1) * api.C.E.o3(api.C.pr(t, a, 0.22))); }); return v; } });
api.K.number({ value: 2, unit: "GB", at: [api.slot(7).P, api.slot(7).x + 220, api.slot(7).y + 160], t: api.at(7, "2", 2), size: 120 });
```

**Colour and ring the headline itself; move the camera to a sub-spot** (ring / underline a phrase that sits on one row;
zoom > 1.05 only once the headline is written — it is the caption):

```js
var h = api.head(4, { tones: { "KV cache": "y", Key: "y", Value: "b", 只算一次: "y" } });
api.K.ring(h.rows[0].P, h.charsOf("只算一次"), "y", api.span(4, "只算一次").end + 0.05);
api.look(api.lineEnd(7) + 0.05, api.slot(7).P, api.slot(7).x + 300, api.slot(7).y + 200, 1.2);
```

Rules of the style: write a step only when it is spoken (`api.at`), pre-draw the frame of a comparison so a page never
sits half empty, draw diagram strokes during a headline with `sprite: false`, notes ≥ 36 px in `cm` or a chapter colour,
no opacity to make chalk quiet. Remove a line's placeholder by not calling `api.placeholder(l)` for it.
