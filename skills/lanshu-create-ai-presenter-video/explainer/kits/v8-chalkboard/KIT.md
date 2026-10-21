# V8 黑板报 · chalkboard kit

One wooden-framed blackboard, divided into panels with distinct chalk borders and 美术字 badges. Everything on it
is written live by a visible chalk stick that sheds deterministic dust; the **felt eraser is the key prop** (it removes
what the idea makes unnecessary: duplicates, copies, waste, reserved space, half of every cell). The camera walks the
board panel by panel, steps back to show the whole board at the closing line, then crosses to the clean side where the
review is drawn as **one chalk mind map in a single frame**.

Proven on two topics: HF Storage (41 s, not bundled) and
`examples/kv-cache/v8-chalkboard` (KV cache, 45 s).

## Files

| file | what |
| --- | --- |
| `kit.css` | tokens, board / panel / chalk layer, chalk text classes, contract component classes |
| `kit.js` | `window.Kit` — the chalk engine + the contract components (needs `lib/core.js` first) |
| `chalk-mask.png`, `grain.svg` | the grain mask over everything chalk, the film grain over the stage |
| `chalklog.mjs` | `node lib/kit/chalklog.mjs <film>` → `assets/audio/chalk-log.json` (every chalk event, for `tools/sfx.py`) |

## Tokens

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` | `#1e3329` slate | the board |
| `--kit-ink` | `#f2efe6` white chalk | text, outlines |
| `--kit-muted` | `#d6d2c4` worn chalk | secondary notes — full opacity, never dimmed below it (≈ 10:1 on slate) |
| `--kit-accent` | `#f6d96b` yellow | THE accent: the new / important thing (the new token, ×1, the result) |
| `--kit-accent-2` | `#94cdea` blue | structure: the store, attention links, V |
| `--kit-warn` | `#f3a3ba` pink | waste / cost / problem (recomputed cells, memory used) |
| `--kit-ok` | `#aedb93` green | solved / included / the fixes |
| `--kit-orange` | `#f5b26b` | fifth chapter colour, the query Q |
| fonts | Long Cang (hand), Patrick Hand (Latin, digits), ZCOOL KuaiLe (美术字) | Latin / digits / ≈ · % $ switch to Patrick Hand automatically |
| type (1080p) | display 160 · h1 84 · h2 60 · body 46 · label 40 · note 38 · cap 44 | notes are never under 30 px (enforced in `note`, `bars`, `formula`, `label`) |

Chalk weight: every `.ln` carries a text-stroke in its own colour (Long Cang is a thin brush), so 34–40 px notes
read on video. Chapter colours cycle `p b y g o`, borders cycle `wave dash scallop dot zig double`.

## API

```js
const K = Kit, G = K.geo, story = new ExplainerCore.Story(window.STORY);
const B = K.board({ stage, cols: 4, rows: 2 });            // panels 1840×1020, gap 60 → board 7660×2220
const P1 = K.panel("p1", 1, 0, { span: 2 });               // P.ox / P.oy board offset, local coords 0..P.w × 0..P.h
```

**World** — `board(o)`, `panel(id, col, row, {span})`, `camera([[t, cx, cy, scale, yaw°, roll°], …])` (board coords,
core.track Hermite), `render(t)` (call every frame), `onRender(fn)` (per-frame film code, e.g. a gauge level),
`mark(name, t)` (named sound cue), `park(t, P, x, y, tone)` (where the stick rests after `t`), `log()`.

**Chalk primitives** (times are absolute seconds; take them from the story)
- `S(P, d | () => d, tone, width, t0, dur, {sprite, kind, dash})` — a stroke drawn on. `sprite:false` = no stick
  (use for strokes that happen while the stick writes the headline). `kind: "tick" | "tap" | "draw"` drives the sound.
  A function `d` is resolved after fonts load (for paths that follow written text).
- `T(P, x, y, size, [[text, a, b, cls], …], {sprite})` — characters revealed left→right between a and b.
  `cls`: colour `cw cm cy cp cb cg co`, face `kl` (美术字) / `mast` (heavy 美术字) / `lat`.
- `seq(P, x, y, size, [[text, cls], …], t0, cps)` — steady hand writing; returns `.end`.
- `X(P, targets, [x, y, w, h], t0, dur)` — the eraser sweeps the rect in three bands; each target fades as it passes.
- `fade(targets, t0, dur, to, back?)` — "the others stay dark" (e.g. only the new token computes).
- `flow(stroke, t0, {n, speed, tone, until})` — data dots ride a drawn link.
- `underline(P, chars, tone, t0)`, `ring(P, chars, tone, t0)` — emphasis on written characters (measured, not guessed).
- `geo`: `line rect circ scrib hatch arrow cloud star check cross keyIcon cardIcon fileIcon burst wave brace border`.
- Glyphs the chalk fonts lack are drawn: `→ ← ↑ ↓ ∝ ✓ ✗`, and `以` (Long Cang's cursive 以 reads like "rく").

**Narration + structure**
- `say(P, story, line, {rows: [{x, y, size, from | k}], tones: {phrase: tone}})` — **the captions**: the narration line in
  chalk, every unit at its spoken time; `from` starts a new row at a phrase (or `k`: at unit index k, used by the
  starter's automatic wrapping); spaces are added around Latin units.
  Returns `{rows, chars, end, charsOf(phrase)}`.
- `chapter(P, story, n, {t})` — the panel's chalk border + 美术字 badge from `story.chapters` ("二 · 方法" + the part
  after "："), drawn at the chapter start.

**Contract components** (all return `{el, render(t, …)}`; `at: [P, x, y]` places them on a panel; `t` = when written)
- `label({text, sub, tone, at, t, size, box, font})`, `note(text, {at, t, size, tone})` ("前缀：正文", prefix in 美术字
  with a wavy underline; a Latin prefix keeps the Latin face).
- `number({value, unit, caption, decimals, at, t, grow})` — `render(t, u)` count-up (default: grows over `grow` s).
- `bars({rows: [{label, value, max, tone, valueText}], at, t, w, h, labelW})` — hatched chalk bars, `render(t, u)`
  (u scalar or per row; pass a shrinking u to show a fix making something smaller).
- `formula({terms: [{text, t, tone, sub}], at, size})` — one line; `column: true` stacks it as a chalk 竖式 with ruled
  lines (`rules: [row indices]`) and annotations in a right column (`subX`).
- `title(story, {P, rows, rowTones})` — the closing line (story.end) in heavy 美术字, each `story.end.emphasis` phrase
  underlined in chalk the moment it is written.
- `recap(story, {P, t0, t1, hold, pace, cps, summaryBranch, size, doodles})` — ONE mind map: heading, ellipse with
  `story.recap.center` (+ tagline), the points as branches clockwise from one o'clock, texts wrapped at ，：；· (rows never
  run past ：；, trailing commas dropped), skeleton first, then each branch filled with its doodle, the key sentence
  boxed (summary branch) or underlined (tagline). With `t1` the writing speed is fitted so it ends `hold` s before t1.
  `centerFit: true` sizes any topic's centre (split at a space when long) and tagline (split at "，") to fit the ellipse,
  growing rx / ry a little if needed. Proven for 2–6 points (without a summary branch).

**Extras** — `Kit.BORDERS` (the chapter border cycle, matching `CHAPTER_TONES`), `gauge({at, w, h, tone, label, level: t => 0..1})` (a container with a hatched fill: 显存, a tank, a budget);
`wrap(text, em)`, `wlen(text)`.

**Captions / chapter chip choice.** V8 performs the narration as word-timed chalk headlines (`Kit.say`) and the chapter as
the in-panel badge (`Kit.chapter`) — both re-time from the story. `.kit-cap` / `.kit-chap` are styled too, so
`core.Captions` / `core.Chapters` work on a board if a film ever needs a bottom bar.

## A new topic: the starter

`tools/new_film.sh v8-chalkboard <story> <project>` builds a playable film from `starter/` (board laid out from the chapters,
headlines, badges, masthead, mind map, camera, sound) with a 「待演绎」 storyboard placeholder per line; a scene author
only writes `beats.js`. See `starter/STARTER.md`. The five steps below are the by-hand version.

## A new topic in five steps

1. `bash tools/sync.sh <film> v8-chalkboard <story>`; in `index.html` link `lib/kit/kit.css`, load GSAP, `lib/core.js`,
   `lib/story.js`, `lib/kit/kit.js`; one `<div id="stage" class="clip">` and the narration / sfx `<audio>`.
2. Lay out the board: one panel per chapter (a long chapter gets `span: 2` and the camera pans inside it), the masthead
   for the closing line, a clean panel off to the side for the recap.
3. Per panel: `chapter()`, `say()` for each narration line (the headline rows), then perform every keyword with
   S / T / X at `story.at(line, unit)` times: draw the thing, hatch the waste pink, ring the result yellow, erase what a
   fix removes. One `note()` per chapter. Diagram strokes written while the headline is being written: `sprite:false`.
4. Camera keys at chapter starts (leave ≈0.3 s before the next line starts so its first characters are seen), a pull-back
   to the whole board on the closing line, then `recap()` on the clean panel with a slow 1.05 → 1.0 settle.
5. `python3 tools/fonts.py <film>`, `node lib/kit/chalklog.mjs <film>`, then the film's `tools/sfx.py` (chars → `chalk`,
   long strokes → `chalk_line`, ticks / taps → `click`, erasures → `felt`, camera moves → `whoosh`, recap box → `bell`;
   `Bed.write(lift_after=(recap start, dB))`), `npx hyperframes@0.8.81 check`.

## Do / don't

- Do keep the headline line in frame while it is being written (it is the caption). Zoom ≤ 1.06 on a full panel.
- Do let the eraser carry meaning (remove duplicates / copies / waste / reserved space); don't erase just to tidy.
- Do write notes at 36–44 px in `cm` or a chapter colour; don't use opacity to make chalk "quiet".
- Do draw transient effects (token pops) and fade them; chalk that should stay must be readable as a drawing.
- Don't put text under 30 px except texture (none needed so far). Don't add facts the story does not have.
- Don't pre-write a step before it is spoken; do pre-draw the frame of a comparison (empty bars, slots marked "?") so a
  panel never sits half empty.
