# V10 · 推演 (reasoning) — kit

**Derive it on one canvas.** A deep ink-blue sheet with a faint dot grid; one derivation station per chapter; the
camera glides between them and, at the end, pulls back so the whole derivation reads as one picture. Each chapter
goes question → construction → insight → result: every narrated step **adds or transforms geometry** (a dot grows, a
row lights, a vector rotates, a formula term lights when its shape is spoken) — nothing just appears as text. Colours
**bind a symbol to its shape**: the rose accent is the new / the thing being derived, teal and amber are two binding
colours (in the KV film q · k · v), vermilion is waste / cost. Math is set in STIX Two Text italic, statements in Noto
Serif SC 900, labels and captions in Noto Sans SC, numbers in JetBrains Mono. No idle wobble: motion is construction,
morphing and the glide.

Load order: `lib/core.js` → `lib/story.js` → `lib/kit/kit.js` → the film's script; link `lib/kit/kit.css`.
Fonts (`fonts.json`, subset with `tools/fonts.py`): `noto-serif-sc-900` plus these `extra` faces —
`noto-sans-sc-500` / `noto-sans-sc-700` (`Noto+Sans+SC:wght@500|700`), `stix-two-500i`
(`STIX+Two+Text:ital,wght@1,500`, style italic), `stix-two-500` (`STIX+Two+Text:wght@500`, upright operators ⇒ ⇓ ∎ Σ ×),
`jetbrains-mono-500` (`JetBrains+Mono:wght@500`). The starter's `fonts.json` has them ready to copy.

## Tokens (`:root`)

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-bg-glow` / `--kit-bg-edge` | `#12172a` / `#1c2446` / `#10142a` | the canvas: a radial glow from the centre (screen space) |
| `--kit-surface` / `--kit-surface-2` | `#1a2140` / `#222b52` | boxes and chips on the canvas |
| `--kit-ink` / `--kit-muted` | `#ece6d6` / `#9aa1b8` | cream text / secondary text (5.3:1 on the glow centre) |
| `--kit-faint` / `--kit-dot` | `#2f395e` / `#2b3558` | construction lines, axes, rings / the dot grid (no text) |
| `--kit-accent` | `#ff8ea6` rose | THE accent: the new / the thing being derived (KV: q, the new row, the diagonal) |
| `--kit-accent-2` | `#5fd3c2` teal | binding colour 1 (KV: k, the cache, "solved") — `--kit-ok` is the same teal |
| `--kit-accent-3` | `#ffc75e` amber | binding colour 2 (KV: v) |
| `--kit-warn` | `#ff6f5e` vermilion | waste, recomputation, cost |
| fonts | display Noto Serif SC 900 · body Noto Sans SC 500/700 · math STIX Two Text italic (+ upright) · mono JetBrains Mono 500 | statement · explanation · symbol · number |
| scale | display 96 · h1 72 (formula) · h2 52 (station statement) · body 34 · label 28 · note 28 · cap 42 px | the 24 px floor is for tags and ticks only |

Tone names everywhere (`tone:` options, `{tone:text}` markup, `.tone-*` classes): `q` / `accent` (rose), `k` (teal),
`v` (amber), `warn`, `ok`, `muted`, `ink`. `Kit.util.tone(name)` gives the colour for SVG work.

## API (`window.Kit`)

Contract — every factory returns `{ el, render(t, …) }`, pure in `t`. Text options accept the **markup**: `$n$` sets a
math symbol (STIX italic), `{k:text}` paints text in a tone (`{k:$k$}` = a teal italic k).

- `label({ text, sub, tone, size })` → `render(t, a, b?, cps?)`: written on glyph by glyph from `a` (each glyph rises
  into place), `sub` (the real term / unit, mono) after it; fades out at `b`.
- `note(text, { tag, mark })` → `render(t, a, b?)`: the chapter's plain-language line — a rose 「说明」 tag (or a math
  mark such as `∴`) + the sentence written on.
- `number({ value, unit, caption, decimals, tone, group, format })` → `render(t, u)` count-up, or `.set(v)` then `render(t)`.
- `bars({ rows: [{ label, value, max, tone, valueText }], width })` → `render(t, u)`: thin rounded meters, staggered.
- `formula({ terms, size, drop, labelSize, gap })` → `render(t)`; `.center(x, y)`. **The colour-bound formula**: each term
  `{ text | html, sub, t, tone, up, dim, label, labelAt, labelDx, pulse: [times], until }` rises in at `t` in its tone
  (`up` = upright for operators and numbers, `dim` = muted); `pulse` lights the term (scale + glow) when its shape is
  spoken; a term with `label` gets a curved leader **in its own colour** down to the label, written at `labelAt`.
  Labels are spread so they never collide; layout is reserved, so the formula builds in place without jumping.
- `title(story, { size, top, maxW, lead, until, qed })` → `render(t)`: the closing line as a statement (Noto Serif SC
  900) near the top over a shade; every glyph waits at 20 % and fills when spoken; `story.end.emphasis` in rose with a
  soft underline; a `∎` pops when the line is done (`qed: false` to drop it). One row when it fits at ≥ 84 px, else
  balanced rows after 「，」「；」「：」. `.bottom` = the y under the last row (frame the pulled-back canvas below it).
- `recap(story, { kicker, picture, anchor })` → `render(t)`, `.zone`: ONE composed frame. Left: kicker
  (「推演 · 回顾」), the centre term (STIX italic; a CJK term upright in the serif), the tagline written in rose; right: the
  numbered steps on a rose spine with ⇓ between them and a dot running down the spine once built. `picture: true |
  { aspect }` reserves `.zone` under the tagline (sized to the canvas aspect, the left block centred vertically): the
  film glides its whole canvas into that zone, so the recap **is** the derivation, pulled back. `anchor(i, t) →
  { x, y, w, h }` frames step i's region of that picture (dashed rose) and pins the step's number on its corner.
  With a picture the kit does not push its own layer (the frames must stay on their stations): the film pushes — the
  starter scales its whole stage 1 → 1.045 at a constant speed through the recap.

Captions and chapters come from core; the kit dresses them:

- `captions(container, story, opts)` = `core.Captions` with `skipEnd`, `air: 0.2`, `clamp` on by default. Bold cream
  text, no box (a soft screen shade sits under the band); unspoken units at 50 %; single lower-case letters
  (q, k, v, n) are set as math automatically; long lines wrap balanced (max 1640 px). `.keys(line, [phrase |
  { text, tone }])` paints a phrase in its binding colour with a soft underline (default rose).
- `chapters(el, story, { word, format })` = `core.Chapters` dressed as 「● 推演 01 · title」 (rose dot, mono number).

Extras (the geometry of a derivation):

- `write(host, text)` → `{ render(t, a, cps, b), n }`: glyph write-on with the markup (a Latin run stays one glyph,
  so wrapped text never breaks inside a word); `stmt(text, { size, tone })` → a statement in Noto Serif SC 900.
- `stroke(layer, { d, tone, width, dash, arrow, glow, opacity })` → `render(t, a, dur, b)` (returns progress),
  `point(u)`: a path that draws on — dashed ones are revealed through a mask so the dash pattern stays put; the
  arrowhead rides the tip.
- `brace(layer, { x1, y1, x2, y2, depth, tone })` → a curly brace that draws on; `.tip` for its label (swap ends to flip).
- `dots(layer, { x, y, n, cols, pitch, r, shape: "tri" | "grid" })` → `{ rows, dot(r, c), x(c), y(r), paint(d, p) }`:
  a lattice — `tri` is the triangle of a sum (row k has k + 1 dots). `paint(d, { s, fill, fillA, ring, ringA, dash,
  arc, glow, x, y })` sets one dot's state every frame: filled = computed, ring + ↻ arc = recomputed, dashed ring =
  a construction position waiting.
- `plane(layer, { cx, cy, R })` → `render(t, a)` draws the circle, half ring and axes; `vector({ ang, len, tone, width,
  label, labelSize, labelR, math, glow })` → `render(t, a, { ang, len, op, w })` grows an arrow (angles in degrees,
  counter-clockwise, len in R); `project(from, onto, { tone })` → `render(t, a, angFrom, lenFrom, angOnto)` drops the
  dashed perpendicular and lights the projection (the dot product, drawn).
- `plot(layer, { x, y, w, h, xMax, yMax, xLabel, yLabel, xTicks })` → `render(t, a)` axes with arrowheads,
  `px(v)`, `py(v)`, `line(pts | fn, { tone, width, dash, glow, from, to, samples })` → a stroke in data space.
- `box(parent, { x, y, w, h, text, html, tone, size, r, cls })` — a rounded box on the canvas (token, chip, cell).
- `camera(world, keys)` → `render(t)`, `at(t)`, `apply(c)`, `screen(c, wx, wy)`: keys `[t, cx, cy, scale, rot°]`
  through `core.track`; `screen()` maps a world point to the frame (for overlays pinned to the canvas).
- `canvas(world, { x, y, w, h })` — the dot-grid sheet (world px, moves with the camera); `backdrop(container)` —
  vignette + the caption-band shade (`.shade`).
- `util` — `el, svg, op, show, vis, attr, draw, setText, tr, fmt, pulse, findRange, tone, rgba, em, parse, esc`;
  `tokens` — the colours for JS (`T.q`, `T.k`, `T.v`, `T.warn` …).

CSS ready to use: `.kit-root .kit-stage .kit-world .kit-canvas .kit-station .kit-box (.ghost) .kit-math .kit-up
.kit-stmt .tone-*` and `svg.kit-svg` (`text.kit-tm` math, `text.kit-tn` mono ticks, `.kit-glow`).

## How a new topic uses it

Write the story, then `tools/new_film.sh v10-reasoning <story> <project>` (the starter below). In `beats.js`, for each
chapter decide the **figure being derived** (a formula, a lattice, vectors, a column of cells, a plot) and build it in
that chapter's station step by step: every keyword triggers the step that explains it, at `story.at` / `story.phrase`
times. Name symbols once in a colour-bound formula (leaders to plain-language labels) and keep those colours on the
shapes for the whole film (caption keys too). Give each chapter an **insight** beat where a pattern becomes visible
(repetition, symmetry, a sum) and a **result** (a statement, a number, its cost). One `note` per chapter. Let things
**morph across stations** in world coordinates (`api.world.svg`) instead of re-drawing them, and lean the camera with
`api.focus` to follow them. `examples/kv-cache/v10-reasoning` is the worked example.

## Starter (`starter/`, used by `tools/new_film.sh v10-reasoning <story> <project>`)

The film minus the topic: one station per chapter on a snake grid, the chapter's statement on each station, a slot per
line, ⇒ arrows the camera glides along, captions with keys, the chip, the closing statement over the pulled-back
canvas, the recap with the canvas as its picture, a sound bed, and a 「待演绎」 derivation-step placeholder per line.
`beats.js` is the only topic file — see `starter/STARTER.md`.

## Do / don't

- Do bind each symbol to one colour and keep it (rose = new / derived, teal / amber = the two bound things,
  vermilion = waste / cost). Don't use the accent for decoration.
- Do build the figure while it is spoken (dots grow, terms rise, leaders draw); pre-draw a faint dashed construction
  (a lattice, an empty column of cells) when the station would otherwise wait empty.
- Do label illustrative values 「示意」 (weights, 2D directions); only facts from the narration or `story.json → facts`.
- Do keep labels ≥ 28 px at the camera scale you show them, ticks / tags ≥ 24 px, and nothing important under the
  caption band (station content above y ≈ 860) or the chapter chip (keep station tops below y ≈ 120 on screen).
- Don't put an opaque or semi-opaque layer over text (the check reads it as occlusion); world text that only meets the
  chip during a glide is fine.
- No idle wobble: the camera always glides or pushes a little (`focus` adds a slow push while it holds), and the recap
  keeps a constant push and a running dot.
