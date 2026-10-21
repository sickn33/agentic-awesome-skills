# V3 notebook starter · 手帐

`tools/new_film.sh v3-notebook <story> <project>` → a playable film for any story: one sheet of grid paper, a live pen, the
chapter chip, captions, the closing line written on the page, the turned-page mind-map recap, and the pen / paper
sound bed. The only topic file is `beats.js`. Reference scenes: `examples/kv-cache/v3-notebook/index.html`.

## What the starter draws

- **Stations.** One per chapter: a screen-sized region of the page (2000 × 1125 page px, seen whole at scale 0.96).
  Laid out on a grid read as a snake: 1–2 chapters in one row, 3 → 2 × 2, 4 → 2 × 2, 5–6 → 3 × 2, 7–8 → 4 × 2.
  Inside a station keep content in `st.use` (station-local 150, 150, 1770 × 765): clear of the chip, the caption band
  (two-line captions included) and the red margin line.
- **Placeholders** (`api.placeholder(i)`, one per narration line except the closing line): an index card slapped on just
  before the line (red line number, ruled lines, a pink 「待演绎」 tab). On it, the chapter's beat note (`story.notes[key][k]`,
  handwritten, Long Cang) is written by the pen spread over the line's spoken words; without notes, the line's key phrase
  (the whole line if ≤ 16 characters, else its weightiest clause) is pre-printed in graphite and inked by the pen word by
  word as it is spoken. Cards fill the station in slots: 1–2 stacked, 3–4 in rows of two, 5 in rows of three.
- **Camera.** Beats request shots with `api.focus()`; the driver turns them into eased moves plus slow drifts (≤ 2.5 %
  push toward the next shot), so it never parks. Each chapter gets a default shot of its station at its first line
  (`weak`: any beat shot near it replaces it). Moves across the page lift the camera (a short zoom-out arc). Placeholders
  lean toward their card while keeping the station's cards so far inside the safe area (the camera pulls back as cards
  accumulate). At the closing line it pulls back over the whole page (scale ≥ 0.4).
- **Closing line** (`story.end`): `Kit.title` written by the pen ≈ 100 px a character on screen — on the grid's free cell
  (3, 5, 7 chapters), in a band above a wide storyboard (1, 2, 6, 8) or across the middle (4) on a paper clearing; the
  storyboard is washed back. No `end` → no title, the camera keeps drifting. **Recap** (`story.recap`): `Kit.recap` turns a
  fresh page in at `recap.start`. Film length = max(`duration`, `recap.end`), as `tools/stamp.py` stamps it.
- `story.draft` → a small 「草稿 · 无配音」 tag top-right. Sound: `tools/sfx.sh` = `node lib/kit/events.mjs .` (the page's own cue
  log: every pen write / stroke, card slap, camera travel, page turn) → `tools/sfx.py` (`notebook_sfx.bed` + a paper slide
  per chapter change, a swell under the closing line, the recap finale, the unvoiced recap lifted; the bed tracks the
  narration's loudness). Re-run `bash tools/sfx.sh` after any change to `beats.js`.

## `api` (passed to `window.Beats(api)`)

| key | what |
| --- | --- |
| `story`, `C`, `Kit` / `K`, `E`, `pr`, `clamp01`, `geo`, `D` | the story (core `Story`), core, the kit, eases, envelope, `Kit.geo`, film length |
| `at(l, unit, n)`, `phrase(l, text)`, `span(l, text)` | narration times — every beat time comes from these (+ small offsets) |
| `world`, `ink`, `inkTop`, `pen`, `eraser`, `scene` | the page layer (page px), ink SVG under props / above the closing wash, the pen, the eraser, the `Kit.scene()` |
| `W(cls, x, y, size, html)` | an absolutely placed text div on the page (class `abs` + `kit-serif` / `kit-hand` / `kit-cv` / `kit-tone-*`) |
| `write(el, at, dur, color, o)`, `draw(d, at, dur, color, width, o)` | pen-written text / pen-drawn path (`color: null` = no pen; `o.nopen`, `o.layer`, `o.dash`, `o.out`) |
| `put(el, x, y, parent)`, `note(text, x, y, o)`, `up(t, a, d, e)`, `add(item)`, `fn(render)` | place an element, sticky note, eased 0..1, add a `{render}` item, add a render function |
| `station(k)` → `{ k, chapter, x, y, w, h, el, svg, lines, slots, local, use, view }` | chapter k (1-based): page origin, station-local layers (`el`, `svg`), its line numbers, card slots (page / local px), usable area, overview view |
| `stations`, `lines(k)`, `chapterOf(i)`, `isEnd(i)` | all stations, line numbers of chapter k, chapter of line i, is i the closing line |
| `focus(at, target, o)` | camera shot starting at `at`: target = station number, page rect `{x,y,w,h}` (fit into the safe area), or a view `{x,y,s}` / `{cx,cy,s}`; `o: { dur, ease, fill, min, max, weak }` |
| `fit(rect, o)`, `lean(box, rect, o)`, `view(cx, cy, s)`, `screen`, `camAt(t)` | view helpers; the safe screen rect; the camera at t (render time) |
| `closing` | `{ at, view, title: {x,y,w,h}, wash }` (null without `end`); set `api.closing.wash = false` (or return `{ closingWash: false }`) to keep the storyboard bright |
| `placeholder(i)`, `beatNote(i)`, `keyPhrase(i)`, `cardPlan(i)` | the draft card for line i (returns `{ card, rect, … }`); the texts it would use; its layout |

## Idioms (from the KV film)

**Write a word the moment it is spoken; box it with the pen first.**
```js
const g = api.geo, s1 = api.station(1), t = api.at(1, "大");
api.draw(g.rect(s1.x + 200, s1.y + 272, 280, 106, 11, 3), t + 0.02, 0.24, "ink", 3.4);
api.write(api.W("kit-serif", s1.x + 262, s1.y + 293, 52, "大模型"), t + 0.27, 0.18);
```

**One sticky note per chapter carries the plain-language sentence; peel it when the next one comes.**
```js
api.note("自回归：\n每次只生成\n1 个 token", s1.x + 176, s1.y + 440,
  { at: api.at(1, "蹦") + 0.3, width: 440, rot: -1.5, out: [api.at(2, "token", 2) - 0.34, 0.3] });
```

**A formula written term by term at the spoken times, the result ringed; a term highlighted after it is written.**
```js
const s2 = api.station(2), s3 = api.station(3), t7 = api.at(7, "每"), tKV = api.at(4, "KV");
const bill = api.K.formula({ pen: api.pen, terms: [
  { text: "2", sub: "K 和 V", t: t7 }, { text: "×", t: t7 + 0.2, dur: 0.06 }, { text: "32", sub: "层", t: t7 + 0.27 },
  { text: "≈ 0.5 MB", t: api.phrase(7, "0.5") - 0.02, tone: "accent", ring: true }] });
api.put(bill.el, s3.x + 240, s3.y + 200);
api.add(bill);
const term = api.W("kit-cv kit-tone-accent", s2.x + 1300, s2.y + 200, 76, "KV cache");
api.write(term, tKV - 0.02, 0.34, "accent");
api.add(api.K.highlight(api.world, { x: s2.x + 1294, y: s2.y + 248, w: 300, h: 34, at: tKV + 0.36, dur: 0.2, pen: api.pen, under: term }));
```

**Move the camera to a sub-spot of a station (and let it drift there).**
```js
api.focus(api.at(3, "每") - 0.3, { x: s1.x + 640, y: s1.y + 380, w: 1300, h: 560 });   // fit this rect
api.focus(api.at(5, "再") - 0.2, 2);                                                     // back to station 2's overview
```

Replace placeholders chapter by chapter: drop the `api.placeholder(i)` calls for that chapter's lines and draw its scene
in `api.station(k)` (page px = `st.x + local x`). Keep text ≥ 28 px on screen (page px × camera scale), let the pen do
every stroke it can (never two pen jobs at once), and re-run `python3 <skill>/explainer/tools/fonts.py .` and `bash tools/sfx.sh`.
