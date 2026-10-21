# v12-sitcom starter — 小剧场, minus the topic

`tools/new_film.sh v12-sitcom <story> <project>` copies this folder, syncs core + kit + story, stamps durations, subsets
fonts and builds the sound bed. The film plays end to end from `window.STORY` alone. You write `beats.js` (and its sound
twin `tools/sfx_beats.py`); `index.html` stays topic-free.

## What the starter draws

- **One long sitcom set** (`Kit.backdrop`): cream wall, mint wainscot (590–760), wood floor; characters stand with their
  feet at `api.FEET` (905; staff behind a counter at ≈ 790).
- **One set (station) per chapter**, side by side: set k spans `x0 = k × 2400 … x0 + 2240` (`api.PITCH`, `api.SW`), centre
  `cx = x0 + 1120`; a wall pillar stands in the 160 px between sets; odd sets get striped wallpaper. Each set is dressed
  from a rotation of four layouts (`shop` counter + menu board + window, `office` shelf + desk + clock, `lobby` door +
  bench + picture, `library` jar shelf + window + clock) that keep the upper centre free for bubbles. With 8 chapters the
  room is 8 × 2400 px long (+ the end set); nothing else changes.
- **The camera**: one shot per narration line. A new chapter = a dolly truck to the next set (1.15 s, starting 0.6 s
  before its first line, with a small pull-back mid-truck); a later line in the same set shifts to its own spot (the lines' spots
  spread over the middle 280 px of the set, left to right; 0.75 s). Between moves it always drifts (≈ 18 px/s on screen, slight push-in) so it never parks. Framing: the whole set
  at scale 1.0. `camera.frame(line, …)` and `camera.focus(t0, t1, …)` change it.
- **The closing line** (`story.end`): the camera trucks on to an **end set** — a chalk board with `story.title` on top and
  one dashed chalk blank per `story.end.emphasis` word, chalked in as the word is spoken; two characters cheer on the last
  one. `Kit.title` performs the line in the caption band (一句话 tag, emphasis on the marker).
- **The recap** (`story.recap`): `Kit.recap` — coral curtains close and open on one composed curtain-call frame.
- **Chrome**: 小剧场 chip (`Kit.chapters`), captions with the 旁白 tag (`Kit.captions`; the closing line is left out),
  「草稿 · 无配音」 top-right when `story.draft`. No `end` → no end set and no title; no `recap` → the film ends at
  `story.duration` with the camera still drifting.
- **Placeholders**: `api.placeholder(line)` — one of the set's two stand-ins (left for even lines, right for odd) speaks
  the beat in a speech bubble: the beat note (`story.notes[chapter.key][j]`, else the line's key phrase), every unit lit
  as the voice says it (characters shared with the line take their spoken time), a dark 「分镜 NN」 tag and a dashed
  「待演绎」 tag. The speaker points while the line runs; the other one reacts (surprised + a hop) on the line's last
  word. The caption marks the line's key phrase.

## The `api` passed to `window.Beats(api)`

| member | what it is |
| --- | --- |
| `story`, `C`, `Kit`, `EZ` | `ExplainerCore.Story`, `ExplainerCore`, `window.Kit`, `Kit.EZ` (eases) |
| `at(l, unit, n)`, `ph(l, text)`, `span(l, text)` | story shorthands — every beat time comes from these (+ small offsets) |
| `world`, `overlay` | the camera layer (append set pieces / actors here), the screen layer above it |
| `FEET`, `WAIN`, `FLOOR`, `SW`, `PITCH` | feet y (905), wainscot top (590), floor line (760), set width (2240), set pitch (2400) |
| `station(k)`, `stations`, `stationOf(line)`, `spot(line)` | set k = `story.chapters[k]` (**0-based**): `{ k, n, chapter, title, key, start, end, x0, x1, cx, w, layout, lines, spots: [{ line, x }], dress, cast }`; `dress` = the default furniture (hide it to redress: `S.dress.style.display = "none"`) |
| `cast(S)` | the set's two stand-ins `[left, right]` (created on first use; rendered for you) |
| `endStage` | `{ x0, cx, el, board, words, cast, on }` or null; `api.endStage.on = false` hides it so you can perform your own ending |
| `cam`, `camera`, `toScreen(x, y)` | the live camera `{ x, y, s }`; `camera.frame(line, { x, y, s, dx, dy, ds })` (call while building), `camera.focus(t0, t1, { x, y, s }, { dIn, dOut })` pushes toward a point on top of the drift, `camera.shots` |
| `caps`, `mark(line, text)` | the `Kit.captions` object; put a span of a line's caption on the yellow marker |
| `el(tag, cls, html, parent)`, `z(e, n)`, `css(text)` | DOM helpers (`parent` defaults to `world`), z-index, topic CSS from beats.js |
| `piece(kind, x, y, o, parent, z)` | a `Kit.piece` placed at (x, y) |
| `actor(o, parent, z)`, `bubble(o, parent, z)`, `note(k, text, o)` | a `Kit.character` / `Kit.bubble` appended to the world; a `Kit.note` on set k's wall (`o.x, o.y`) |
| `live(obj, …args)` | the driver calls `obj.render(t, …args)` every frame for you |
| `placeholder(line, { text })`, `beatNote(line)`, `keyPhrase(line)`, `alignTimes(units, L)` | the draft beat; the text it would use; spoken time per unit of any text (for chalk / bubbles that follow the voice) |
| `recapCast` | set to `[characterOpts …]` to put your own cast in the curtain call |

`Beats` returns `{ render(t) }`; render everything you created (actors, bubbles, labels) from it, or hand it to `api.live`.

## Replacing a placeholder

```js
var performed = { 1: myth1(api), 2: myth2(api) };   // each returns { render(t) }
var beats = story.lines.filter(function (L) { return L.i !== endLine; })
  .map(function (L) { return performed[L.i] || api.placeholder(L.i); });
```
Then list the lines that are still placeholders in `tools/sfx_beats.py` (`PLACEHOLDERS = [3, 4]`, `[]` when all are
performed; `END_STAGE = False` if you switched the end set off) and add the performed beats' sounds in its
`place(bed, T)` with the same story calls (`T.at`, `T.ph`, `T.SS.stamp()` …). `tools/fonts.py` scans `beats.js`, so re-run
it after any text change there.

## Idioms (from the KV cache film)

**A character reacts on a word** (cues blend 0.24 s; faces switch on the cue; hops land with a squash):
```js
var lin = api.actor({ x: X(1380), y: 790, hair: "short", shirt: "#fff", apron: "#5fb88f" }, null, 20);   // behind the counter
lin.move(api.ph(1, "新来的店员") - 0.3, api.ph(1, "新来的店员") + 0.55, X(1380));                     // walks in on 新来的
lin.cue(api.at(1, "发"), { face: "surprised", tilt: -6 }).emote(api.at(1, "发") + 0.05, "？", 1.0);
lin.cue(api.at(2, "手"), { arms: ["hold", "hold"], sweat: true, face: "oops" });                       // looks at his hands
lin.cue(api.at(2, "慢"), { slump: 1, face: "sad", arms: ["down", "down"] });
```

**The queue grows on 客人越多, faces fall on 越慢** (and is served later: `q.serve(t)` walks the front one off):
```js
var q = api.Kit.queue({ front: X(900), y: 900, gap: 110, s: 0.78, n0: 2, seed: 7, enterFrom: X(-240) });
api.z(q.el, 40); api.world.appendChild(q.el);
[0, 0.17, 0.34, 0.5, 0.66].forEach(function (d) { q.join(api.ph(1, "客人越多") + d); });
q.face(api.at(1, "越", 2), "worried", { from: 1, stagger: 0.05 });
api.live(q);
```

**Evidence: a receipt unrolls as it is read, every old row stamped 又核一遍 on 又…一遍, the camera pushes in on it:**
```js
var rc = api.Kit.receipt({ title: "第 8 位客人 · 出单记录", rows: rows, w: 470, footer: "这一位：核了 8 张，<b>7 张是重核</b>" });
// render(t):
rc.render(t, { at: api.at(3, "第"), rows: rowTimes, tags: tagTimes, footer: api.at(3, "遍") });
api.camera.focus(api.at(3, "前") - 0.35, api.at(3, "遍") + 0.25, { x: X(560), y: 470, s: 1.3 });
api.mark(3, "又全部核对了一遍");
```

**The analogy lands on the real word** (a term chip per real term, the object gets its real name):
```js
var chip = api.Kit.termChip({ a: "小本本", b: "KV cache", tone: "accent", aw: 150 });
api.world.appendChild(chip.el); api.Kit.at(chip.el, X(150), 420);
// render(t):  chip.render(t, api.at(7, "KV"));
var real = api.Kit.label({ text: "KV cache", tone: "ink" });   // stamped onto the notebook on the same word
```

Rules of the style (KIT.md): one yellow thing per beat (the key thing / the new one), red = the mistake or the cost;
every analogy labelled with its real term; meaningful text ≥ 28 px on screen (tags 26–28); nothing important in the
bottom 140 px; no cross-fades — pop, cut, truck, curtain.
