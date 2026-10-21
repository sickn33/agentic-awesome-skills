# V3 notebook · 手帐 kit

A teacher explains on one sheet of grid paper. Every line is drawn by a **live pen**, every word is **written at pen
speed**, plain-language explanations arrive as **sticky notes slapped on**, waste is rubbed out with an **eraser**, and a
camera looks down at the desk and follows the pen across the page. The film ends with the closing line written on the
page, then a **fresh page is turned in** and the pen draws a one-frame mind map.

Reference films: HF Storage (34.5 s, not bundled) and
`examples/kv-cache/v3-notebook` (KV cache, 45 s).

## Files

| file | what |
| --- | --- |
| `kit.css` | tokens + component styles (page, ink, writing window, pen, captions, chip, label, note, number, bars, formula, title, recap) |
| `kit.js` | `window.Kit` (needs `lib/core.js` first) |
| `paper-grain.svg` | the paper grain (feTurbulence) used by the page and the recap sheet |
| `fix-56de.woff2` | one-glyph Noto Serif SC subset: ZCOOL XiaoWei's 回 renders with a solid inner square, so 回 is borrowed (wired in kit.css) |
| `events.mjs` | `node lib/kit/events.mjs <film>` → `tools/events.json`: reads the kit's sound-cue log out of the composition (headless Chrome that `npx hyperframes` installed) |
| `starter/` | the film minus the topic: `index.html` (page, stations, camera, chrome), `beats.js` (placeholders), `tools/sfx.sh` + `sfx.py`, `STARTER.md` |
| `notebook_sfx.py` | builds the procedural bed from that log with `lib/sfxlib.py`: pen scratches per written character, line strokes, highlighter squeak, paper slaps, taps, eraser rub, page turn, a swell for the recap |

## Tokens

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` | `#f4ede0` / `#fbf8f1` | the page / index cards and the caption strip |
| `--kit-ink` / `--kit-muted` | `#2a2320` / `#6e655c` | ink / graphite (4.9:1 on the page) |
| `--kit-accent` | `#c63d2f` red pen | **the new / changed / important thing** (the new token, ×1, rings, the closing emphasis) |
| `--kit-accent-2` | `#2e5a9c` blue pen | annotation, data flow, matching (K tags, links, fills) |
| `--kit-warn` | `#a9531a` orange marker | waste / cost (recomputed cells, "预留了却空着") |
| `--kit-ok` | `#2f6b43` green pen | solved / included ("1 份", "少浪费") |
| `--kit-pencil` | `#9c9186` | what already exists, ghosts, skipped cells — never text |
| `--kit-hl`, `--kit-sticky`, `--kit-tape`, `--kit-grid` | | highlighter (multiply), sticky yellow, tape, grid lines |
| fonts | ZCOOL XiaoWei (display + body), Long Cang (`--kit-font-hand`), Caveat 700 (`--kit-font-mono`: numbers and real terms) | `fonts.json`: `["zcool-xiaowei", "long-cang", "caveat-700"]` |
| sizes | display 140 · h1 96 · h2 64 · body 44 · label 46 · note 44 · caption 42 | px at 1080p; on the page they are **page px × camera scale** |

Long Cang draws small (46 px reads like a ~34 px sans) and some of its glyphs are drawn in a plainer style — keep
hand-written lines short. Latin and digits inside handwriting are lettered in Caveat automatically (`Kit.hand`).

## API (KITS.md contract + notebook extras)

Every factory returns `{ el, render(t, ...) }`; `render` is a pure function of `t`. Collect them in a `Kit.scene()` and
call `scene.render(t)` from one GSAP driver (`tl.fromTo(drive, …, { onUpdate: () => frame(tl.time()) })`).

**Shared components**

- `Kit.label({ text, sub, tone, serif, inline, at, dur, pen, out })` — handwriting + the real term in Caveat (muted).
- `Kit.note(text, { at, pen, width, rot, fontSize, speed, out })` — a sticky note is slapped on (tape, shadow) and the
  sentence is written line by line; `"\n"` forces a break. `out: [t, dur]` peels it off. One per chapter.
- `Kit.number({ value, unit, caption, decimals, tone, at, format })` — `render(t, u)` counts up; `.set(v)` pins a value.
- `Kit.bars({ rows: [{ label, value, max, tone, valueText }], width, rowH, labelW, stagger, at, dur })` — hand-drawn tubes
  filled with marker hatching; `render(t, u)` or `render(t)` (grows over `[at, at + dur]`).
- `Kit.formula({ terms: [{ text, t, sub, tone, hand, ring, size, dur }], pen })` — each term written at its own spoken
  time, the unit / meaning (`sub`) written under it, `ring` circles a result in red.
- `Kit.title(story, { pen, breaks })` — the closing line (`story.end.line`), written unit by unit at the spoken times,
  `story.end.emphasis` in red with a wavy underline drawn right after it is spoken; breaks after "，" / "；".
  Put it **on the page** (it is the caption for the last line — leave that line out of `core.Captions` groups).
- `Kit.recap(story, { at, end, covers: [world] })` — a full-frame screen layer: a fresh sheet slides in like a turned
  page, its own pen writes `recap.center` (auto-sized, split on a space), rings it, writes the tagline with a
  highlighter, then wires each point (1–6) on an index card around it, clockwise from the top-left. A linear push keeps
  it moving to the end. `covers` are hidden (`display: none`) once the sheet has landed.

**Captions / chapters** come from core: `new C.Captions(capsEl, story, { groups })`, `new C.Chapters(chipEl, story)`.
The kit styles `.kit-cap` as a paper strip with a 46 px red tick; unspoken words are graphite and ink in as they are
spoken (`--lit`). The chapter chip is a red Caveat number + serif title written on (`--in`) with a red pen underline.

**Notebook extras**

- `Kit.page(world, { x, y, w, h, margin, holes, holeX })` — the grid-paper sheet (grain, red margin line, punch holes).
- `Kit.camera(world, startView)` with `.move(view, at, dur, ease, { sound })` and `Kit.view(cx, cy, s)` — piecewise dolly
  moves (log-scale zoom, centre-interpolated). **Never park it:** chain a `"linear"` drift between the eased moves.
  Moves ≥ 0.4 s log a `cam` sound cue; pass `{ sound: false }` to keep a slow drift out of the log.
- `Kit.pen(layer, { enter, rest })` — the pen. Strokes / writes / highlights given `pen` register a job; between jobs it
  lifts, travels and rests beside the last stroke. `pen.trace(t0, dur, color, u => {x, y})`, `pen.hover(...)`,
  `pen.away(t0, t1)`. Re-append `pen.el` last so it stays on top.
- `Kit.stroke(svg, d, { at, dur, color, width, pen, dash, ease, out })` — a path drawn at pen speed (dash-offset; dashed
  lines are revealed through a mask). `Kit.write(el, { at, dur, pen, color, out })` — text uncovered left-to-right.
- `Kit.geo` — seeded hand-drawn geometry: `line, rect, loop, scribble, tick, cross, wavy, star, arrow, brace, hatch, tag`.
- `Kit.highlight(parent, { x, y, w, h, at, dur, pen, tone, under })` — highlighter swipe (`under`: the text element it
  marks, so ink stays on top). `Kit.hatchRect(svg, x, y, w, h, { color, step, wash })` — clipped marker fill.
- `Kit.slap(el, { at, rot, from, out })`, `Kit.tape(parent, x, y, w, h, rot)`, `Kit.eraser(layer).rub(t0, t1, points)`.
- `Kit.svg(parent, x, y, w, h)` (user units = parent px), `Kit.path`, `Kit.el`, `Kit.hand`, `Kit.lines`, `Kit.offsetIn`.
- `Kit.events` / `Kit.event(kind, t, d)` — the sound-cue log (`window.__kitEvents`); pen jobs log themselves.

## Using it for a new topic

**Start from the starter:** `tools/new_film.sh v3-notebook <story> <project>` builds a playable draft (stations, storyboard
cards per line, camera, chip, captions, closing line, recap, sound) from `kits/v3-notebook/starter/`; then perform the
scenes in its `beats.js` — see `starter/STARTER.md` for the `api` and idioms. By hand:

Make the story (`<story>/story.json` with word times, chapters, `end`, `recap`), sync it
(`tools/sync.sh <film> v3-notebook <story>`), and lay the explanation out on **one big page** (≈ 4400 × 2400 page px):
one region per chapter, the protagonist drawn once and reused (the model file in HF, the token row in KV), the camera
dollying from region to region and pulling back to the whole page for the closing line. For each narrated keyword pick
one pen action — write the word, draw the thing, tick / ring / cross it, hatch the waste, slap a note — and time it with
`story.at(line, unit)` / `story.phrase(line, text)` plus small offsets, so a new narration re-times itself. One sticky note
per chapter carries the plain-language sentence. Finish with `Kit.title` written on the page and `Kit.recap`. Sound:
`node lib/kit/events.mjs .` then a 15-line `tools/sfx.py` around `notebook_sfx.bed(...)` (see either film).

## Do / don't

- **Do** let the pen write what is being said, at the moment it is said; keep the pen in frame and never let two pen
  jobs overlap (it jumps). Strokes the pen does not draw can still be dash-revealed.
- **Do** keep every meaningful text ≥ 28 px on screen (page px × camera scale): Long Cang notes ≥ 40 px on screen,
  formula subs ≥ 34 px. Captions are 42 px.
- **Do** keep content out of the chip zone (top-left ~760 × 120 px) and the caption band (bottom ~130 px), 64 px margins.
- **Do** peel or erase what a later beat replaces (sticky out, eraser rub, fade to pencil ghost) — the page accumulates.
- **Don't** park the camera or let the page sit: drift linearly between moves; check with snapshots 0.2 s apart.
- **Don't** fake handwriting with fades, and don't wobble or float paper idly; slaps settle once, that is all.
- **Don't** use characters the fonts lack: arrows (→) must be drawn (`geo.arrow`); ≈ × ÷ · are fine in Caveat.
