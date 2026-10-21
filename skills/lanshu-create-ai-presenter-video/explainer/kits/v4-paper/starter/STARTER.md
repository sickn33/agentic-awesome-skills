# v4-paper starter — 纸艺立体书, minus the topic

`tools/new_film.sh v4-paper <story> <project>` copies this folder, syncs core + kit + story, stamps durations, subsets fonts and
builds the sound bed. The film plays end to end from `window.STORY` alone. You write `beats.js` (and its sound twin
`tools/sfx_beats.py`); `index.html` stays topic-free.

## What the starter draws

- **The book page** (`Kit.world`): far layer at 0.4× (sun, paper clouds, sky and sage hills), the page at 1× (floor + every
  piece), paper grass at 1.25×, grain printed on the page. Pieces stand on `api.FLOOR` (world y 840).
- **One station per chapter**, left to right along the page. A station is as wide as its lines need
  (`max(1900, m × 1360 − 260)` world px for m narration lines) with 900 px between stations. Each narration line owns a
  **spot** (a card-sized place, 1100 × 500, centres 1360 px apart). A navy **signpost** (「02 方法」: chapter number + the
  title's head before 「：」) stands at the station's left edge and folds up as the camera sets off toward it.
- **The camera**: one shot per narration line. It moves to the line's spot (io3; 0.85 s inside a station starting 0.42 s
  before the line, 1.05 s to a new station starting 0.5 s before), then drifts linearly (≈ 22 px/s on screen, slight
  lift and push-in) until the next move, so it never parks. Framing: scale 1.15, the card's foot at ≈ 890 px on screen,
  lifted automatically when the line's caption wraps to two lines.
- **The closing line** (`story.end`): the camera travels on to the end station, a paper plinth with `story.title` as its
  nameplate under a paper spotlight. `Kit.title` prints the line on ribbons at the top of the frame; each
  `story.end.emphasis` word folds up on the plinth as a paper tag the moment it is spoken (spoken order, the last one coral).
- **The recap** (`story.recap`): `Kit.recap` folds the last page up over the film (one composed spread, steady push-in).
- **Chrome**: navy bookmark chip (`core.Chapters`), paper captions (`Kit.captions`, which leave out the closing line),
  「草稿 · 无配音」 tag top-right when `story.draft`. No `end` → no end station / title; no `recap` → the film ends at
  `story.duration` with the camera still drifting.
- **Placeholders**: `api.placeholder(line)` stands a pop-up storyboard card on the line's spot: frame number tab, a
  「待演绎」 stamp, the beat note (`story.notes[chapter.key][j]` for the chapter's j-th line, else the line's key clause) in
  pencil that is **inked unit by unit as the voice says it** (characters shared with the line take their spoken time),
  and a timing tape pulled out of a slit across the line with one little flag per spoken unit.

## The `api` passed to `window.Beats(api)`

| member | what it is |
| --- | --- |
| `story`, `C`, `Kit`, `EZ` | `ExplainerCore.Story`, `ExplainerCore`, `window.Kit`, `Kit.EZ` (eases) |
| `at(l, unit, n)`, `ph(l, text)` | `story.at` / `story.phrase` shorthands — every beat time comes from these (+ small offsets) |
| `world`, `overlay`, `W` | the 1× page layer (append world pieces here), the screen overlay (notes), the `Kit.world` object (`toScreen`) |
| `FLOOR`, `CARD` | world y pieces stand on (840); the spot size `{ w: 1100, h: 500 }` |
| `station(k)`, `stations`, `stationOf(line)` | station k = `story.chapters[k]` (**0-based**): `{ k, n, chapter, title, key, start, end, x0, x1, x, w, lines, spots: [{ line, x, y }], sign }` |
| `spot(line)` | `{ line, x, y }`: the centre-bottom of that line's card place on the floor |
| `cam`, `camera` | the live camera `{ x, y, s }`; `camera.frame(line, { x, y, s, dx, dy, ds })` changes a line's shot (call while building); `camera.focus(t0, t1, { x, y, s }, { dIn, dOut })` pushes toward a sub-spot on top of the drift; `camera.shots` |
| `endStage` | `{ x, y, w, h, plinth, spot, tags, on }` or null; set `api.endStage.on = false` to perform your own closing scene |
| `el(tag, cls, html, parent)`, `box(e, x, y, w, h)`, `vis(e, on)`, `put(e, x, y, ax, ay, s)` | DOM helpers (`parent` defaults to `world`; `put` = `place()` that keeps visibility inherited) |
| `shadowFor(x, w, h)`, `standUp(e, sh, t, up, dUp, down, dDown, eye, dist)` | a floor shadow behind a piece; fold a piece (+ shadow) up at `up`, flat at `down` → fold angle |
| `flight(A, B, lift, u)` | a point on an arc from A to B lifted by `lift` px (hops, flights into slots) |
| `note(text, { at, out, small })` | a `Kit.note` ribbon placed top-centre on the overlay (render it yourself) |
| `css(text)` | add topic CSS from beats.js |
| `placeholder(line, { text })`, `beatNote(line)`, `keyPhrase(line)` | the draft beat; the text it would use |

`Beats` returns `{ render(t) }`; render everything you created (placeholders, labels, notes) from it.

## Replacing a placeholder

```js
var performed = { 4: beat4(api) };   // each returns { render(t) }
var beats = story.lines.filter(function (L) { return L.i !== endLine; })
  .map(function (L) { return performed[L.i] || api.placeholder(L.i); });
```
Then list the lines that are still placeholders in `tools/sfx_beats.py` (`PLACEHOLDERS = [1, 2, 3]`) and add the
performed beats' sounds in its `place(bed, T)` with the same story calls (`T.at`, `T.ph`, `T.P.fold() …`).
Fonts: `tools/fonts.py` also scans `beats.js`, so re-run it after any text change there.

## Idioms (from the KV film)

**A piece folds up on its keyword** (hinge at the bottom, the shadow grows with it), flat again when done:
```js
api.css(".bhead { position: absolute; left: 0; right: 0; top: 0; height: 66px; border-radius: 12px 12px 0 0; background: var(--kit-ink);" +
  " color: var(--kit-surface); display: flex; align-items: center; justify-content: center; font-size: 38px; }");
var sp = api.spot(4);
var cab = api.el("div", "a kit-sandp", '<div class="bhead">' + api.Kit.term("KV cache") + '</div>');
api.box(cab, sp.x - 390, api.FLOOR - 510, 780, 510);
var cabSh = api.shadowFor(sp.x - 390, 780, 120);
// render(t):
api.standUp(cab, cabSh, t, api.at(4, "KV") - 0.05, 0.5, /* down */ null, 0, 360, 1500);
```

**A tag pinned to a thing at `story.phrase()`**, and a calendar number that flips on spoken words:
```js
var once = api.Kit.label({ text: "只算一次", tone: "accent", at: api.ph(4, "只算一次") + 0.18 });
api.world.appendChild(once.el); api.put(once.el, sp.x - 300, api.FLOOR - 260, 0.5, 1, 1.12); once.el.style.zIndex = "900";
var ctx = api.Kit.number({ unit: "K", caption: "上下文长度 · token", at: api.at(6, "跟") - 0.4,
  steps: [[api.at(6, "跟"), 1], [api.at(6, "着"), 2], [api.at(6, "上"), 3], [api.at(6, "文"), 4]] });
// render(t): once.render(t); ctx.render(t);
```

**A flight along an arc into a slot** (K/V tags filed into the cache rows on 「存起来」):
```js
var p = api.C.pr(t, api.ph(4, "存起来") + i * 0.12, 0.45), q = api.flight(A, B, 220, api.EZ.io2(p));
tag.style.transform = "translate(" + (q.x - A.x).toFixed(1) + "px," + (q.y - A.y).toFixed(1) + "px) rotate(" +
  (-20 * Math.sin(Math.PI * p)).toFixed(1) + "deg)";
```

**Move the camera to a sub-spot** for a phrase, then let the line's drift carry on (or reframe a whole line):
```js
api.camera.focus(api.ph(5, "再去缓存里查"), story.line(5).end, { x: sp.x + 280, s: 1.3 });
api.camera.frame(7, { s: 1.0, y: 560 });   // a wider shot for a busy line
```

Rules of the style (KIT.md): fold, don't fade; one coral thing per beat; swings only when something is hung; tapes for
progress; real terms in Archivo via `Kit.term`; meaningful text ≥ 28 px on screen; nothing important in the bottom 140 px.
