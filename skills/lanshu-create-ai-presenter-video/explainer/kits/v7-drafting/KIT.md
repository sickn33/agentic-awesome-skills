# V7 · 图纸与注脚 (drafting) — kit

One black drawing sheet that the camera cranes over in 2.5D. Every figure of the explainer is drawn on that one
sheet; leader lines carry the eye (and the camera) from figure to figure; at the end the camera pulls back and the
viewer sees the whole drawing at once. Text has two reading speeds: big **ghost-letter karaoke headlines** (the
narration itself, every glyph waiting at 17 % ink until it is spoken) and a small **annotation layer** — typed
labels, a plain-language 说明 per figure, and **insider footnotes that are true** (a decode loop, a revision cloud, a
dimension line, a parts list, a bill). The joke is always also the mechanism.

Load order: `lib/core.js` → `lib/story.js` → `lib/kit/kit.js` → the film's script; link `lib/kit/kit.css`.
Fonts (declare in `fonts.json`, subset with `tools/fonts.py`): `noto-sans-sc-900`, `noto-sans-sc-500`,
`noto-serif-sc-600`, `archivo-x-900` (Archivo wdth 125 / 900, see `extra` in the HF project's fonts.json),
`jetbrains-mono-400`, `instrument-serif-400i`.

## Tokens (`:root`)

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` | `#0b0b0c` / `#141416` | the sheet / a plate on it |
| `--kit-paper` / `--kit-paper-ink` | `#ece9e1` / `#141311` | the occasional paper flip (a bill, a parts list) |
| `--kit-ink` / `--kit-muted` | `#edebe6` / `#a6a39d` | text / secondary text (6.9:1 on bg) |
| `--kit-accent` | `#ffd21e` | THE accent: the new / changed / important thing (new token, changed block, ×1) |
| `--kit-accent-2` | `#7fc8f8` | non-photo blue: construction lines, the query / looking-up |
| `--kit-warn` | `#ff5b3a` | redline: waste, recomputation, cost |
| `--kit-ok` | `#7be0a0` | solved / included (use rarely) |
| fonts | display Noto Sans SC 900 · Latin Archivo expanded 900 · body Noto Sans SC 500 · mono JetBrains Mono · hand Instrument Serif italic (+ Noto Serif SC) | shout · machine · human/formula |
| scale | display 120 · h1 88 · h2 56 · body 32 · label 28 · note 26 · cap 44 px | footnotes 24 px minimum |

## API (`window.Kit`)

Contract — every factory returns `{ el, render(t, …) }`, pure in `t`:

- `label({ text, sub, tone })` → `render(t, a, b?, cps?)`: a callout typed in at `a` over a shoulder line, `sub` (the real
  term) typed after it; tones `default | accent | warn | ok | ink | q`.
- `note(text, { tag })` → `render(t, a, b?)`: the figure's plain-language line, yellow tag (default 「说明」) + typed text.
- `number({ value, unit, caption, decimals, tone, group })` → `render(t, u)` count-up, or `.set(v)` then `render(t)`.
- `bars({ rows: [{ label, value, max, tone, valueText }], width })` → `render(t, u)`: comparison meters, rows staggered.
- `formula({ terms: [{ text | html, t, tone, cls }] })` → `render(t)`: serif-italic formula, each term lands at its time.
- `title(story, { size, left, bottom, until, lead })` → `render(t)`: the closing line as the biggest ghost type, rows
  split after 「，」/「；」, emphasis from `story.end.emphasis`, a shade rising from the bottom. Mount in screen space.
- `recap(story, { kicker, titleBlock, push })` → `render(t)` + `covered(t)`: ONE composed frame — a fresh notes sheet
  wipes up over the drawing (opaque, a yellow edge, no crossfade); left: kicker, the center term (auto-sized), the
  tagline in ghost-lit accent, the drawing's **title block** (绘制：模型 · 审核：你); right: the numbered notes, each on an
  orthogonal leader from a shared spine. Then only a constant slow push and dots running the leaders move. While
  `covered(t)` is true the film should stop drawing its world (`display:none`), so nothing sits under the notes.

Captions: this style's caption **is** the ghost headline (KITS.md allows it). `.kit-cap` is still styled (ghost glyphs
in a plate at the bottom) for a film that prefers `core.Captions`. Chapters: `core.Chapters` on any element — the kit
styles `.kit-chap` as a detail bubble with the chapter number + title, top-left, with a yellow underline drawing in.

Extras:

- `ghost({ story, line, from, upto, range, accent, warn, marks, punch, size, lead })` → `render(t)`, `.at(phrase)`, `.glyphs`: one
  headline row made from a story line's units (`from` = first unit of a phrase, `upto` = last unit of a phrase; or
  `range: [a, b]` unit indices, and `marks: { index: "a" | "w" }` to paint a phrase a row break has split). Glyph
  times come from the word times (multi-char units spread over their span); Latin units get Archivo and a space;
  `accent`/`warn` paint phrases; `punch` scale-pulses a word when it is spoken; `lead` = how early the waiting
  glyphs appear (use 2–4 s to pre-print a lower row so the sheet is never half empty).
- `footnote({ mark, text, rule })` → `render(t, a, b?)` — the small, true insider note (24 px, typed, mark in serif).
- `stamp({ text, sub, tone, tilt })` → `render(t, a, b?)` — a rubber stamp that slams in (×1, ÷4, 按需).
- `leader(svg, { d, a, b, label, lx, ly, sparks, flow, tone })` → `render(t)`, `.point(u)` — the line between figures:
  draws with a glowing head, bursts at its end, label 「→ 图 n」, dots run along it after `flow`.
- `sparks(svg)` → `burst(x, y, t0, n, spread, up)`, `render(t)` — deterministic ember bursts.
- `camera(world, keys)` → `render(t)`, `at(t)` — keys `[t, cx, cy, scale, tilt°, roll°]` through `core.track`.
- `dim(svg, { x1, y1, x2, y2, text, off, tone })` → `render(t, a, b?)` — a dimension line with ticks and its measure.
- `revcloud(svg, { x, y, w, h | pts, r, tag, tx, ty })` → `render(t, a, b?)` — the checker's redline cloud (box or any
  clockwise polygon, e.g. a staircase) with a △ tag. Use it to mark waste.
- `titleBlock({ rows, w })` → `render(t, a)` — 标题 / 绘制 / 审核 / 张 / 版本 cells, values typed.
- `frame(container)` → `{ sheetno }` — spot, grain (`lib/kit/grain.svg`), vignette, crop marks, the sheet number (24 px).
- `cell(world, { x, y, n, title, bx, by })` — a figure on the sheet: corner ticks + the 「n」 detail bubble.
- `util` — `el, svg, op, show, draw, typed, setText, fmt, pulse, glow, findRange, E4`; `tokens` — the colours for JS.

CSS classes ready to use: `.kit-root .kit-stage .kit-world .kit-sheet .kit-cell .kit-fig .kit-paper .kit-paper-bar
.kit-hl` and `svg.kit-svg` with `.kit-ln .kit-thin .kit-acc .kit-red .kit-blue`.

## How a new topic uses it

Write the story (`story.json`: lines with word times, chapters, `end`, `recap`), run `tools/sync.sh`, then build the
sheet: lay out one `Kit.cell` per figure (1920×1080, 180 px gaps, a snake of 3 + 2 is a good default), give each
narration line one or more `Kit.ghost` rows inside its figure, and for every keyword draw the step that explains it
(an SVG/HTML drawing that moves at `story.at(line, unit)`). Add one `Kit.note` per figure, one true `Kit.footnote`
where an insider detail helps, `Kit.leader`s between figures, and key the `Kit.camera` to the same story times (arrive
on a figure ≈0.3 s before its first word, travel along the leader in the pause between lines, pull back for the
closing line). Finish with `Kit.title(story)` in screen space and `Kit.recap(story)` over everything.
`examples/kv-cache/v7-drafting/index.html` is the worked example (5 figures + pull-back + recap).

## Starter (`starter/`, used by `tools/new_film.sh v7-drafting <story> <project>`)

The film minus the topic: figures of 1–2 lines laid out as a snake (one station = a chapter's run of figures),
automatic ghost headlines that wrap any line, the crane camera keyed to the story, leaders, chip, closing pull-back,
recap, sound bed, and a 「待演绎」 construction-line placeholder per line. `beats.js` is the only topic file — see
`starter/STARTER.md` for the `api` and the idioms.

## Do / don't

- Do keep **every** narrated word in a ghost row (the headline is the caption); split long lines over rows.
- Do make each insider joke a mechanism and true (decode-loop pseudo-code, revision cloud = recomputation, the bill's
  arithmetic, a parts list = the cache). Put illustrative numbers under 「示意」.
- Do keep labels ≥ 28 px and footnotes ≥ 24 px **at the camera scale you show them** (world px × camera scale).
- Do frame so nothing important touches the frame edge (64 px) and nothing sits under the chapter chip (top-left
  64–480 × 44–106): keep headline tops ≥ 120 px on screen.
- Do keep the camera moving with intent (no parked keys) and something meaningful mid-motion every 0.4 s
  (typing, filling, flowing dots); verify by snapshot pairs 0.3–0.4 s apart. No idle wobble.
- Don't use the accent for decoration; don't use the redline for anything but waste / cost.
- Don't cover sheet text with a translucent plate — use an opaque plate and mark the plate's texts
  `data-layout-allow-overlap`; mark texts that only touch in the far pull-back projection the same way.
- Ghost glyphs at 17 % report contrast *warnings* in `check` (by design: they are unsung); errors must stay at 0.
