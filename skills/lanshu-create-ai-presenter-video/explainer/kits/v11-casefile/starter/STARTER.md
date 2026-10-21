# V11 casefile starter · 案卷

`tools/new_film.sh v11-casefile <story> <project>` → a playable film for any story: one cork board under a desk lamp,
one station per chapter, a masking-tape timeline under each station, red string carried from station to station while
the camera rides it, the chapter tab, label-maker captions with a yellow key span, the closing line typed on a sheet
pinned over the pulled-back board, the case-folder recap, and the pin / paper / typewriter / stamp sound bed. The only
topic file is `beats.js`. Reference scenes: `examples/kv-cache/v11-casefile/beats.js`.

## What the starter draws

- **Stations.** One per chapter: a screen-sized region of the board (2000 × 1125 board px, seen whole at 0.96), laid out
  as a snake: 1–2 chapters in a row, 3–4 → 2 × 2, 5–6 → 3 × 2, 7–8 → 4 × 2 (gaps 220 / 170). Cards go in `st.use`
  (station-local 120, 150, 1760 × 650: clear of the chapter tab and the tape); the tape runs along `st.tapeRect`
  (local 110, 852, 1780 × 58). Dense chapters expand the station height and move its tape down so draft cards stay
  readable and clear of one another; the camera uses the expanded board bounds.
- **Draft cards** (`api.placeholder(i)`, every narration line except the closing one): an index card slapped on and
  pinned 0.3 s before the line, tagged 「线索 n · start s」; the chapter's beat note (`story.notes[key][k]`) typed on,
  its characters spread over the spoken words — or, without notes, the line's key phrase pre-printed faintly and typed
  over unit by unit as spoken; a small blue 「待演绎」 stamp. Red string ties each card to the previous one in its
  station, corner to nearest corner. Slots: 1–2 stacked, 3–4 in rows of two, 5 in rows of three.
- **Tapes.** Under each station: T{i} + the line's opening words per narration line, lit red while the line is
  spoken (a red dot stays), a red marker arrow riding along. `st.marks = [...]` replaces the marks, `st.tape = false`
  drops it, `st.tapeRect.y` moves it (all before `Beats` returns).
- **Camera.** Beats request shots with `api.focus()`; the driver turns them into eased moves plus slow linear drifts (≤ 2.5 %
  push toward the next shot), so it never parks. Each chapter gets a weak shot of its station before its first line.
  Entering the next station the camera **rides the red string**: it is pulled from the last station's exit to this
  station's entry over the move (the camera dips along its sag, a short pull-back). Draft cards lean the camera toward
  themselves, keeping the station's cards and its tape inside the safe area.
- **Closing line** (`story.end`): the camera pulls back over the whole board (scale ≥ 0.2), the board dims and every
  card's text fades (paper, pins, the string stay), and `Kit.title` types the line ≈ 100 px a character on a lined sheet
  — in the grid's free cell (3, 5, 7 chapters), in a band above a wide board (1, 2, 6, 8) or over the middle (4).
  **Recap** (`story.recap`): `Kit.recap` lays the case folder + point cards over the whole board at `recap.start`. No
  `end` → no sheet (a recap then pulls back by itself); no `recap` → the film ends at `story.duration`. Film length =
  max(`duration`, `recap.end`), as `tools/stamp.py` stamps it.
- `story.draft` → a blue 「草稿 · 无配音」 stamp top-right. Sound: `tools/sfx.sh` = `node lib/kit/events.mjs .` (the board's
  own cue log: every slap, pin, typed run, handwriting, marker, highlighter, stamp, string, tape, camera travel) →
  `tools/sfx.py` (`casefile_sfx.bed` + a folder slide per chapter change, a swell under the closing line, the recap
  finale, the unvoiced recap lifted; the bed follows the narration's loudness). Re-run it after editing `beats.js`.

## `api` (passed to `window.Beats(api)`)

| key | what |
| --- | --- |
| `story`, `C`, `Kit` / `K`, `E`, `pr`, `clamp01`, `geo`, `D` | the story (core `Story`), core, the kit, eases, envelope, `Kit.geo`, film length |
| `at(l, unit, n)`, `phrase(l, text)`, `span(l, text)` | narration times — every beat time comes from these (+ small offsets) |
| `desk`, `world`, `cards`, `strings`, `pins`, `top`, `ink`, `scene` | the `Kit.desk` and its layers (board px), a board-wide marker svg under the cards, the scene |
| `card(k, o)` | `Kit.card` with `o.x / o.y` **station-local**; registered to station k (its first / last card are the string's default entry / exit) |
| `note(k, text, x, y, o)`, `pin(k, x, y, o)`, `wp(k, x, y)` | a sticky note card in station k, a pin, a station-local point → board point |
| `string(a, b, o)`, `stamp(parent, o)`, `typed(parent, text, o)`, `hand(parent, text, o)`, `type(el, o)`, `write(el, o)`, `mark(svg, d, o)`, `highlight(parent, o)`, `tapeline(parent, o)` | the kit factories, already added to the scene |
| `add(item)`, `fn(render)`, `up(t, a, d, e)` | add a `{ render }` item / a render function; eased 0..1 |
| `station(k)` → `{ k, chapter, x, y, w, h, lines, slots, local, use, tapeRect, view, cards, entry, exit, ride, tape, marks }` | chapter k (1-based). Set `entry` / `exit` (a card or a board point) to choose where the travelling string ties; `ride: { a, b, via, sag }` to route it yourself |
| `stations`, `lines(k)`, `chapterOf(i)`, `isEnd(i)` | all stations, line numbers of chapter k, chapter of line i, is i the closing line |
| `focus(at, target, o)` | a camera shot starting at `at`: station number, board rect `{x,y,w,h}` (fit into the safe area), or a view; `o: { dur, ease, fill, min, max, weak, station }` |
| `fit(rect, o)`, `lean(box, rect, o)`, `view(cx, cy, s)`, `screen`, `safe`, `camAt(t)` | view helpers, the safe screen rect, the camera at t |
| `keys` | `keys[i] = "phrase"` → the yellow span of line i's caption (`null`: none; default `Kit.keyPhrase`) |
| `closing` | `{ at, view, title: {x,y,w,h}, dim, tag, stamp, stampText }` (null without `end`) — set `tag` / `stamp: false` / `dim` before returning |
| `placeholder(i)`, `beatNote(i)`, `keyPhrase(i)`, `cardPlan(i)` | the draft card for line i; the texts it would use; its layout |

## Idioms (from the KV film)

**Pin an exhibit and type on it as the words are spoken; stamp the moment.**
```js
const tAnom = api.at(1, "异"), tModel = api.span(1, "同一个模型");
const folder = api.card(1, { kind: "manila", x: 130, y: 190, w: 930, h: 300, tab: "案卷 07", pin: "red", at: 0.06 });
api.typed(folder.el, "模型：同一个", { x: 48, y: 178, size: 38, at: tModel.start, dur: tModel.end - tModel.start });
api.stamp(folder.el, { text: "立案", tone: "accent", x: 800, y: 70, rot: 10, size: 64, at: tAnom + 0.04 });
```

**Rule a suspect out or in: a blue strike + 排除, a red ring + 已证实, a pin swapped from blue to red.**
```js
const x1 = api.span(5, "机器旧"), svg1 = api.K.svg(sus1.el, 0, 0, 540, 210);
api.mark(svg1, api.geo.line(36, 136, 400, 128, 9, 3), { at: x1.start - 0.05, dur: 0.24, tone: "accent-2", width: 7 });
api.stamp(sus1.el, { text: "排除", tone: "accent-2", x: 420, y: 120, rot: -12, size: 58, at: x1.start + 0.22 });
api.stamp(sus3.el, { text: "已证实", tone: "accent", x: 400, y: 128, size: 54, at: api.at(5, "算") + 0.12 });
```

**String evidence to the cause — round the cards, not across their text; blue for a hunch, red once proven.**
```js
const [a, b] = api.K.ties(exhibitA, suspects);                    // nearest corners of two cards
api.string(a, b, { at: api.span(2, "每一步都在做重复的事").start + 0.4, dur: 0.5, tone: "accent-2", ends: ["blue", "blue"] });
api.string(ledger.tie("tr"), sus3.tie("tl"), { at: tLink + 0.3, dur: 0.6, ends: true, via: api.wp(3, 700, 90) });
api.station(3).entry = sus3;  api.station(3).ride = { a: reTag.tie("tr"), b: sus3.tie("bl"), via: api.wp(3, 330, 404) };
```

**Lean the camera to an exhibit (station-local rect), keep a token tape, light the yellow caption span.**
```js
const R = (k, x, y, w, h) => ({ x: api.station(k).x + x, y: api.station(k).y + y, w, h });
api.focus(api.story.line(4).start - 0.1, R(2, 110, 130, 1120, 700), { fill: 0.98 });
api.station(2).marks = ["因为", "空气", "把", "蓝光", "散射", "得", "更", "多"].map((w, i) => ({ html: `<b>T${i + 1}</b>${w}`, t: tok[i], tone: "accent" }));
api.station(1).tape = false;
api.keys[4] = "又被重新算了一遍";
```

Replace placeholders chapter by chapter: drop the `api.placeholder(i)` calls for that chapter's lines and pin its
exhibits with `api.card(k, …)`. Keep text on paper, ≥ 32 board px (handwriting ≥ 48) at a camera scale ≥ 0.9; keep
board text out from under the chapter tab and the caption strip in every shot (`npx hyperframes check` reports the
times); then `python3 <skill>/explainer/tools/fonts.py .` and `bash tools/sfx.sh`.
