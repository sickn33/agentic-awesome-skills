# Explainer styles: twelve style kits, one contract

Twelve styles for one narrated explainer — nine visual languages and three narrative styles (推演, 案卷, 小剧场: a look
that comes with a way of telling) — each turned into a **kit** that works for any topic. They were
proved on two topics (HF Storage, not bundled, and KV cache, bundled under `examples/`); the starters make a new topic
a few commands. This file is the engine reference; the workflow lives in `../references/styled-explainer.md`, the style
chooser in `STYLES.md`.

```
explainer/
  core/core.js        style-agnostic runtime: time, eases, track(), Story, Captions, Chapters, place()
  core/sfxlib.py      procedural sound library (numpy): Bed + one-shots + textures
  kits/<style>/       kit.css + kit.js + KIT.md — one look, the shared component API — and starter/ (the film minus the topic)
  stories/<topic>/    script.md → story.json (bundled: kv-cache, _test-dry)
  examples/kv-cache/<style>/   the finished KV cache film per style (the source of every STARTER.md idiom)
  tools/story.py      script.md → voice → word times → story.json  (--audio for your own narration, --dry for a draft)
  tools/new_film.sh   a playable film for any story in any style;  new_topic.sh = the nine visual styles at once
  tools/docs.py       SCRIPT / BEAT_SHEET / TIMELINE / STORYBOARD documents from the story
  tools/qa.py         check + snapshots + stillness + cover.png → composition.json (one command)
  tools/render.sh     render + finalize + SRT + freeze log  (DRAFT=1: a 720p review copy for a phone)
  tools/srt.py        subtitles from the word times
  tools/sync.sh, stamp.py, fonts.py, still_grid.py, grid.py
```

Style keys (= kit folder names): `v1-editorial`, `v2-signal`, `v3-notebook`, `v4-paper`, `v5-comic`,
`v6-cinematic`, `v7-drafting`, `v8-chalkboard`, `v9-clay`; the narrative styles `v10-reasoning`, `v11-casefile`,
`v12-sitcom` (their KV films use the stories `kv-cache-reasoning`, `kv-cache-casefile`, `kv-cache-sitcom`, the same topic
written in each style's arc).

## 1. The kit contract

A film loads, in order: `lib/core.js`, `lib/story.js` (defines `window.STORY`), `lib/kit/kit.js`, then its own
scene script. `lib/kit/kit.css` is linked in `<head>`.

### CSS tokens (on `:root`, in kit.css)

| token | meaning |
| --- | --- |
| `--kit-bg`, `--kit-surface` | page background, card / panel surface |
| `--kit-ink`, `--kit-muted` | primary text, secondary text (muted must still pass 4.5:1 on its background) |
| `--kit-accent` | THE accent: the new / changed / important thing. One meaning, never decoration |
| `--kit-accent-2`, `--kit-warn`, `--kit-ok` | second colour, waste / cost / problem, solved / included |
| `--kit-font-display`, `--kit-font-body`, `--kit-font-mono` | families (`--kit-font-hand` optional) |
| `--kit-t-display`, `--kit-t-h1`, `--kit-t-h2`, `--kit-t-body`, `--kit-t-label`, `--kit-t-note`, `--kit-t-cap` | type scale in px at 1080p |

### Classes kit.css must style (core.js creates some of them)

- `.kit-cap` caption box; `.kit-cap > span` one spoken unit, with `--lit` 0..1 (unspoken → spoken)
- `.kit-chap` chapter chip with `.kit-chap-n` (number) and `.kit-chap-t` (title); `--in` 0..1 entry progress
- `.kit-label` (+ `.kit-label-sub` for the real term / unit), `.kit-note`, `.kit-num` (`.kit-num-v`, `.kit-num-u`, `.kit-num-c`),
  `.kit-bars`, `.kit-formula`, `.kit-title`, `.kit-recap`

### kit.js exports `window.Kit`

```js
Kit = {
  name: "v8-chalkboard",
  // every factory returns { el, render(t, ...) }; render is a pure function of t (and its explicit args)
  label({ text, sub, tone }),            // tone: "default" | "accent" | "warn" | "ok" | "ink"
  note(text),                            // one plain-language explanation line ("说明")
  number({ value, unit, caption, decimals }),  // render(t, u) — count-up progress u 0..1 (or render(t) with .set(v))
  bars({ rows: [{ label, value, max, tone, valueText }] }),   // render(t, u) — grow progress
  formula({ terms: [{ text, t }] }),      // render(t) — each term appears at its time
  title(story),                          // the word-timed closing line from story.end (emphasis from story.end.emphasis)
  recap(story),                          // ONE composed frame summarising story.recap: center + numbered points
  // optional style extras (chalk write(), drafting leader(), clay sticker()...) — document them in KIT.md
};
```

Styles whose main text already *is* the word-timed narration — V7's ghost-letter karaoke headline, V8's chalk
headlines — may render captions that way instead of a bottom bar, but the words and times must still come from the
story (so a new topic re-times itself). Document the choice in KIT.md.

Pure-DOM kits (V1–V5, V7) render these as HTML/SVG. V8 may draw them in chalk (write-on) and V6/V9 overlay HTML
on Three.js — any technique is fine as long as the API and the determinism hold. Captions and chapters come
from `core.Captions` / `core.Chapters`; the kit only styles them.

### Story API (core.js)

`const story = new ExplainerCore.Story(window.STORY)` → `story.at(line, unit, nth)`, `story.phrase(line, "只算一次")`,
`story.line(i).start/.end`, `story.chapters`, `story.recap`, `story.duration`. **Every beat time in a scene comes from
these calls**, plus small offsets — never hard-code narration times. That is what makes a scene re-timeable.

## 2. Aesthetic baseline (all nine, both topics)

1. **Readable sizes at 1080p:** captions 38–46 px; labels ≥ 28 px; notes / footnotes ≥ 24 px. Smaller text is allowed
   only as texture that carries no meaning (grid coordinates, sheet numbers, HUD noise) — and then keep it sparse.
2. **Contrast:** body text ≥ 4.5:1, large text ≥ 3:1. `npx hyperframes check` must pass with 0 errors.
3. **Safe areas:** 64 px side margins; captions in the bottom band (bottom edge 40–60 px up); chapter chip top-left;
   nothing important under the caption band or cut by the frame edge (V7's bill card was cut — not allowed).
4. **One accent with one meaning** per style (the new / changed / important thing). Warn colour = waste / cost.
5. **Hierarchy:** at most 3 text sizes and 2 families (+ mono for real terms) on screen at once. One focal point per beat.
6. **No dead space:** a card that is mostly empty, a big empty half of the frame, or a page that holds after its action
   is a bug. Fill it with the explanation, or frame tighter.
7. **Motion:** every second something meaningful is mid-motion; no idle wobble (breathing, floating); stillness only as a
   0.3–0.7 s comma before a climax; the camera carries the eye between beats (no crossfades).
8. **Teach every keyword:** each narrated keyword triggers a visible step that explains it (perform the content, don't
   decorate it). One plain-language note per chapter.
9. **Every film ends the same way:** the word-timed closing line, then a ≈4.5 s one-frame recap (a single composed
   picture — mind map, annotated diagram or card set — never a multi-panel grid), with gentle motion so it never freezes.
10. **Truth:** only facts from the narration or `story.json → facts`. Analogies must be labelled with the real term.
11. **Determinism:** pure functions of t; no `Math.random`, `Date`, network fetches; fonts subset with `tools/fonts.py`.
12. **Sound:** a procedural bed from `lib/sfxlib.py` timed to the picture, under the voice (if the style had none, add a
    restrained one: pops, ticks, whooshes, one swell for the end).

## 3. Per-style notes from the review of the nine HF films

| style | keep | fix in this round |
| --- | --- | --- |
| V1 editorial | warm paper, serif + mono restraint, red accent | most labels and chips are 14–20 px; hero grid and receipt are small in a big empty frame; the receipt card is mostly empty at 12.9 s. Scale the hero 1.3–1.5×, labels ≥ 28 px, captions ≥ 40 px, fill or tighten empty cards |
| V2 signal | dark HUD, neon accent, data pulses | HUD micro-text everywhere (14–18 px mono); billing console card mostly empty; captions italic and thin. Keep a few HUD textures, make every meaningful label ≥ 28 px, bigger hero numbers |
| V3 notebook | grid paper, handwriting + serif, pen, sticky notes | some handwritten notes ~20 px ("不用每朵云各存一份", "只传 5%"); caption tick small. Notes ≥ 26 px, caption ≥ 38 px, keep the pen alive |
| V4 paper | paper diorama, pop-up cards, soft shadows | progress-bar labels tiny ("51%"); GCP house small / cramped at the bottom; caption chip small. Bigger chips, fix the cramped bottom row |
| V5 comic | halftone, bursts, bold panels | the condensed comic font makes CJK captions squeezed and hard to read; some tiny labels in the grid header. Use a legible CJK face for captions / body, keep the comic face for bursts |
| V6 cinematic | Three.js one-take, bloom, porcelain tiles | captions grey and small on black; labels 16–20 px; long stretches of near-black. Brighter caption treatment ≥ 40 px, labels ≥ 28 px, lift exposure where the frame is empty |
| V7 drafting | one drawing sheet, leaders, ghost karaoke, footnotes | many annotations 16–20 px; the bill card is cut by the frame edge at 12.9 s; footer text tiny. Re-frame, annotations ≥ 24 px |
| V8 chalkboard | live chalk, eraser, one board, one-frame mind-map recap | some chalk notes thin / dim and small; keep the recap; make notes ≥ 30 px chalk with enough weight |
| V9 clay | plasticine diorama, analogy + real term, sticker labels, card recap | already close; check label sizes ≥ 28 px, caption contrast, make sure no label overlaps the scene's focal point |

## 4. Rules for changing a style or adding a new one

- A kit change must be additive: films keep their own `lib/` copy, but a later `sync.sh` must not change how an existing
  film looks. Prove it by re-syncing an example film and comparing snapshots (mean |Δ| = 0).
- Verify with `npx --yes hyperframes@0.8.81 check` (0 errors) and `snapshot --at … --describe false` frames you actually
  look at (`--describe false` keeps frames local; `-o <dir>` empties that folder first).
- Python with numpy for sound beds (`PYTHON=…` to choose it). Fonts: `python3 tools/fonts.py <project-dir>` after any text
  change (it needs a `fonts.json` in the project).
- HyperFrames gotchas that bite these kits are collected in `GOTCHAS.md`.
- A new style = a kit (§1) + a starter (§6), built and verified the way `STARTER-BRIEF.md` describes.

## 5. A new topic

```bash
X=<skill>/explainer
# 1. write <story>/script.md (chapters, one narration line per line, end line, recap, facts) — see stories/kv-cache/script.md
python3 $X/tools/story.py <story> --check             # parse only: chapters and lines as the pipeline sees them
python3 $X/tools/story.py <story> --dry               # optional: silent draft with estimated times (no API)
python3 $X/tools/story.py <story>                     # MiniMax voice per line (cached), word timestamps from the engine
python3 $X/tools/story.py <story> --audio narr.wav    # …or time a narration you voiced yourself (any TTS or a recording)
# 2. a playable film in any style, end to end (captions, chapter chip, closing line, recap, sound bed, a placeholder beat per line)
bash $X/tools/new_film.sh <style> <story> <project>   # or new_topic.sh <story> to try the nine visual styles
# 3. replace the placeholders in <project>/beats.js with the performed scenes (kits/<style>/starter/STARTER.md)
python3 $X/tools/fonts.py <project> && (cd <project> && bash tools/sfx.sh && npx --yes hyperframes@0.8.81 check)
bash $X/tools/render.sh <project> <name> [out-dir]
```

`tools/story.py` caches each line's voice and word timestamps by (model, voice, speed, text), so editing one
line re-voices only that line. Pauses: 0.4 s lead, 0.3 s between lines, 0.55 s after a chapter, 0.6 s tail; a chapter chip
changes 0.2 s before its first line; the recap starts when the narration ends. `> notes` under a chapter go to
`story.notes[<key>]` (beat notes for the storyboard; starters may show them in placeholders). Every line carries
`chapter` (the chapter key, or `"end"` for the closing line), so code never has to infer it from times.
After a story changes, re-run `tools/sync.sh <film> <style> <story>` then `python3 tools/stamp.py <film>` (durations).

### core v2 (opt-in additions; old films keep their own `lib/core.js` copy and the defaults are unchanged)

- `Story`: `span(line, text)` → `{start, end}`, `idx(line, unit, nth)`, `word(line, k)`, `lineAt(t)`, `spoken(line)`, `chapterOf(line)`.
- `Captions(container, story, { skipEnd, air, clamp, lead, tail, groups })`: `skipEnd` drops the closing line's box (Kit.title
  performs it), `air: 0.2` puts 0.2 em where Latin / numbers touch CJK (+ classes `.kit-air-l/.kit-air-r`), `clamp` stops
  neighbouring boxes from overlapping during fades.
- `Chapters(el, story, { format })`, e.g. `format: (n) => String(n).padStart(2, "0")`.
- `place(el, x, y, ax, ay, o, s, { inherit: true })` shows with `visibility: inherit` so a hidden parent still hides it.
- Eases `E.o4`, `E.i3`, `E.io4`.

## 6. The starter contract (`kits/<style>/starter/`)

A starter is the style's film **minus the topic**: the world, the camera, the chrome and the sound, driven only by
`window.STORY`. `tools/new_film.sh` copies it, syncs, stamps, subsets fonts and builds the sound bed.

| file | role |
| --- | --- |
| `index.html` | the composition: fonts block, kit.css, the world / stage, captions, chapter chip, closing title, recap, camera — all from the story. Timed elements carry `data-stamp="story"` (root, stage, sfx) or `data-stamp="narration"` (voice) |
| `beats.js` | **the only topic file**: `window.Beats = function (api) { …; return { render(t) } }` — the starter's version builds one placeholder beat per narration line via `api.placeholder(line)` |
| `tools/sfx.sh` (+ `sfx.py` …) | builds `assets/audio/sfx.wav` from the story's times (chapter changes, line starts, closing line, recap lift) |
| `fonts.json`, `package.json`, `hyperframes.json`, `meta.json`, `AGENTS.md`, `CLAUDE.md` | project files (`new_film.sh` renames package / meta) |
| `STARTER.md` | the `api` passed to `Beats`, where each chapter's stage is, and 3–4 idioms for performing a beat in this style (from the KV film) |

Rules: works for any valid story (1–8 chapters, 1–5 lines per chapter, lines up to ~45 characters, 15–120 s, with or
without `end` / `recap` / `facts` / `notes`, `story.draft` = silent narration); the camera travels chapter to chapter
from `story.chapters` and never parks (freezedetect 0); placeholders are on-style and tasteful but clearly marked as a
draft (a small 「待演绎」 tag), so a reviewer can watch the whole timing before any scene exists.

### The nine starters (built and verified 2026-10-05)

`tools/new_topic.sh <story>` builds all nine (`JOBS=3` in parallel, `DEST_ROOT=` elsewhere, `FORCE=1` to rebuild);
`python3 tools/still_grid.py <films-root> 9.5,32.5` makes 3×3 stills to compare them. Each style's `STARTER.md`
has its full `api` and idioms. Verified on kv-cache, hf-storage and the awkward `_test-dry` story (+ synthetic stories of
up to 8 chapters × 5 lines, no end / no recap) — `check` 0 errors, stillness > 0.001 everywhere.

| style | a station is… | draft beat (`placeholder`) | camera |
| --- | --- | --- | --- |
| V1 editorial | one page per chapter, side by side | serif headline lit as spoken, term tiles on a timing strip; files into a ledger row | page turns right, slow push |
| V2 signal | a 1920×1080 HUD zone per chapter (x = k·2400) | storyboard frame: scan-line on, decoded headline, term chips, signal trace, packet to the next frame | shots in look space, glitch at seams |
| V3 notebook | a screen of grid page per chapter, snake grid | index card slapped on, the pen writes the beat note | leans to the active card, arc between stations, pull back for the closing line |
| V4 paper | a run of card spots along the page | pop-up storyboard card, note inked as spoken, timing tape pulled out | one shot per line + drift; signpost per chapter |
| V5 comic | one comic page per chapter, a panel per line | shout balloon + term stickers + halftone dot strip | cut under the dot wipe, whip panel to panel |
| V6 cinematic | a spot on the studio floor, 20 units apart | metal plaque with the note, words printed out as porcelain tiles | travel between stations, truck + push inside |
| V7 drafting | figures (1–2 lines each) on one sheet, snake grid | construction-line box: note typed, phrases on a time ruler | lands per figure, rides a leader to the next, pull back to the sheet |
| V8 chalkboard | panels round the board (2 lines per page) | chalk frame, note underlined as spoken, timing ruler | page to page with a zoom-out, masthead last, whole-board pull back, mind map |
| V9 clay | a pastel plot of the clay town per chapter | clay type tiles drop in per spoken unit, 「待演绎」 slip | plot to plot, pull back to the town for the recap |

### The three narrative starters (built and verified 2026-10-08)

Built the same way, each with a finished film of its own KV story (`stories/kv-cache-reasoning`, `-casefile`,
`-sitcom`). `new_topic.sh` builds them only when named. Verified on their KV story, `kv-cache`, `_test-dry`, an
8-chapter dry story and stories without `end` / `recap` — `check` 0 errors, stillness > 0.001 everywhere.

| style | a station is… | draft beat (`placeholder`) | camera |
| --- | --- | --- | --- |
| V10 reasoning | a 1920×1080 region of one ink-blue canvas per chapter, snake grid | the chapter's statement written on; the beat note set as a derivation step, terms lit in their binding colour as spoken | glides along ⇒ arrows between stations, drifts toward the spoken line, pulls back to the whole canvas; recap = a proof spine beside the canvas |
| V11 casefile | a region of one cork board per chapter, snake grid | an index card per line (「线索 n」), the beat note typed on as spoken, red string card to card, a blue 「待演绎」 stamp | leans to each new card, rides the red string between stations, pulls back to the whole board; recap = case folder + point cards over the dimmed board |
| V12 sitcom | a sitcom set per chapter, side by side (shop / office / lobby / library dressing) | a stand-in says the beat note in a speech bubble, lit as spoken; the other stand-in reacts | dolly truck set to set, a shift per line, drift + push in between; curtain-call recap |

Common follow-ups the agents noted: long-caption wrapping is done four ways (V1/V2 `.kit-caps-wrap`, V5
`Kit.wrapCaptions`, V6 `Kit.captions({wrap})`, V3/V9 starter CSS) — fold into one core option next time; the
key-phrase heuristic (when a chapter has no `> notes`) sometimes picks the set-up clause — write notes in script.md.
