# V1 editorial 「留白」 — starter

The V1 film minus the topic. `tools/new_film.sh v1-editorial <story> <project>` copies this folder, syncs core + kit + story,
stamps durations, subsets fonts and builds the sound bed. The result plays end to end; the only topic file is
`beats.js`.

## What the starter draws (all from `window.STORY`)

- **World:** one 1920 × 1080 bone-paper page (**station**) per chapter, side by side (`station k` at world
  x = k · 1920), plus a **closing page** after them when the story has an `end` line. 1–8 chapters → 1–9 pages.
- **Camera:** turns the page to the right at each chapter change (0.3 s before the chip changes, ≈ 0.9 s, eased;
  the closing page turns in 0.45 s before the closing line) and pushes slowly inside a page (3.5–7 %, linear, toward
  the station's focus point) — it never parks. A story without chapters is one page.
- **Chrome:** chapter chip (core `Chapters`, top-left), captions (core `Captions` with `skipEnd`, `air: 0.2`,
  `clamp`; `.kit-caps-wrap` lets a long line wrap into two balanced rows), `Kit.title` on the closing page (left,
  vertically centred, scaled down if a clause is very long), `Kit.recap` on its own page (`fit: true`, the world fades
  under it), 「草稿 · 无配音」 top-right when `story.draft`. No `end` → no closing page; no `recap` → the film ends at
  `story.duration` on the last page.
- **Placeholders (beats.js):** per line, in its chapter's page: a 「待演绎」 tag + `L# · start–end s`, the line's
  beat note (`story.notes[chapter.key][j]`, else the line's key clause, lit as spoken) as a 48–72 px headline, the
  Latin / number terms as paper tiles pinned to a **timing strip** (one block per spoken unit, as wide as its time;
  dashed → red while spoken → ink; a red playhead) — a term tile is red while it is new. When the chapter's next
  line starts, the beat files into a ledger row at the top of the page (numeral + headline + mini strip). Per
  chapter a 「分镜」 standfirst (`本章 N 句 · M 秒 · 待演绎`). On the closing page a dashed 「结尾图」 card: the
  `end.emphasis` words as ghost tiles that turn red as they are spoken, plus the closing line's strip.
- **Sound (`tools/sfx.sh` → `tools/sfx.py`):** CHROME (page-turn air + pop, chip tick + pen stroke, a low swell
  under the closing line through the recap, tinks on the emphasis words, recap whoosh / chime / clicks / ticks,
  `lift_after` the recap) and BEATS (the placeholders' taps, pen strokes, term pops, filing whoosh; a tick per
  spoken unit when the story is a silent draft). Replace BEATS as you replace placeholders.

## The `api` passed to `window.Beats(api)`

| member | what |
| --- | --- |
| `story`, `C`, `Kit`, `W`, `H` | `ExplainerCore.Story`, `ExplainerCore`, `window.Kit`, 1920, 1080 |
| `station(k)` | chapter k's page (0-based, = `story.chapters[k]`): `{ el, x, k, chapter, lines, arrive, leave }`. Put things in `el` in **page coords** (0…1920 × 0…1080). `station("end")` = the closing page (or null) |
| `stations`, `chapterOf(i)`, `linesOf(k)` | all pages; line → chapter index (undefined for the closing line); chapter → line numbers |
| `world`, `hud`, `stage` | the world (world coords — use it for things that travel between pages), screen-space overlay above the world, the stage (recap level) |
| `end` | closing-page layout `{ station, title: { x, y, scale }, free: { x, w } }` (null without `end`); edit `end.title.x/y` inside `Beats` to move the title |
| `kit(component, parent)` | append a Kit component (`{ el, render }`) and render it every frame (the KV film's `kit()`) |
| `each(fn)` | per-frame updater `fn(t)` (or do everything in your `render(t)`) |
| `note(text, at, out, key)` | the chapter standfirst under the chip (`Kit.note` at 96, 132 in the hud); key 「说明」 by default |
| `focus(k, [[t, x, y], …])` | the point (page coords) the page's push leans toward, interpolated with `C.track` — move the camera to a sub-spot |
| `push(k, amount)` | total push over the page (default 0.035 + 0.0025 × seconds, max 0.07); never 0 — the camera must not park |
| `recapFigure(el, [w, h])` | a figure for `Kit.recap` (a miniature of your hero); without one the recap title takes the centre |
| `placeholder(i)`, `placeholderChapter(k)`, `placeholderEnd()` | the draft beats; each returns `{ render(t) }` (render them yourself) |
| `track(parent, i, x, y, w, { h, at })` | the timing strip on its own — handy as a storyboard aid while building |
| `mk, vis, tf, svg, sv, draw` | the KV film's DOM helpers: `mk(cls, parent, x, y, text)`, `vis(el, o)`, `tf(el, x, y, s)`, `svg(parent, w, h)`, `sv(svg, tag, attrs)`, `draw(path, len, u)` |

Page layout to respect: the top-left 820 × 185 px is the chip + standfirst; captions own the bottom band (keep
content above y ≈ 880 — two-row captions start ≈ 917); 96 px side margins. Kit components own their opacity /
transform — wrap them in a holder to move them.

## Performing a beat (idioms from `examples/kv-cache/v1-editorial`)

Replace a chapter's placeholders: drop `api.placeholder(i)` for its lines, build the figure in `api.station(k).el`.

```js
const S = api.story, K = api.Kit, C = api.C, { pr, E, lerp } = C;
const A = api.station(1).el;                       // chapter 2's page
// 1 · a label pinned at the word that names it (labels/tiles/numbers take at/out and animate themselves)
api.kit(K.label({ text: "×1", sub: "每个 token 只算一次", tone: "accent", x: 440, y: 690,
                  at: S.phrase(4, "只算一次") - 0.02, out: S.phrase(4, "存") + 0.6 }), A);
// 2 · an equation whose terms rise on their own words (the result in red)
api.kit(K.formula({ x: 800, y: 470, terms: [
  { text: "2", sub: "K 和 V", t: S.at(7, "每") }, { text: "×", kind: "op", t: S.at(7, "每") + 0.1 },
  { text: "0.5 MB", sub: "每个 token", kind: "res", t: S.at(7, "0.5") } ] }), api.station(2).el);
// 3 · data blocks that change state on keywords (ink = data, accent = the new one, warn = waste, stone = stored)
const grid = K.blocks({ n: 40, cols: 10, size: 48, x: 1100, y: 300 });
A.appendChild(grid.el);
api.each((t) => grid.cells.forEach((c, i) => {
  api.vis(c, pr(t, S.at(6, "缓") + i * 0.02, 0.2));
  c.classList.toggle("is-accent", t >= S.phrase(7, "2 GB") && i < 40 * pr(t, S.at(7, "4K"), 1.2));
}));
// 4 · lean the camera toward a sub-spot of the page while a phrase is spoken
api.focus(1, [[S.line(4).start, 760, 560], [S.phrase(5, "缓存"), 1500, 560]]);
api.push(1, 0.06);
```

Carrying something across a page turn: build it in `api.world` and move it from `station(k).x + …` to
`station(k + 1).x + …` between `S.chapters[k + 1].start - 0.3` and `+ 0.6` (the turn).
Recap figure: `api.recapFigure(fig, [470, 540])` with a miniature built from `K.card` + `K.blocks`.

After editing: `python3 <skill>/explainer/tools/fonts.py .` (it scans `beats.js` too),
`bash tools/sfx.sh` (add your beat sounds to the BEATS section of `tools/sfx.py`), `npx --yes hyperframes@0.8.81 check`,
snapshots.
