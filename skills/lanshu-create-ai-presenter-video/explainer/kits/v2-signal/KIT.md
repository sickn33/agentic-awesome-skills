# V2 signal 「信号」 — kit

A live monitoring HUD. Every idea is something being **measured, decoded and transmitted**: labels decode in from
scramble glyphs, numbers roll, data travels as packets on wires, chapters change with a 2–4-frame chromatic glitch
cut, and the camera rides one big world (zones stacked or side by side) instead of cutting between slides.
Dark blue-black, one acid-lime accent, a cool blue for keys / second series, orange for cost.

Proven on two topics: HF Storage (34.5 s, not bundled) and
`examples/kv-cache/v2-signal` (KV cache, 45 s).

## Files

| file | what |
| --- | --- |
| `kit.css` | tokens on `:root`, the contract classes, the extras (panels, trackers, stamps, HUD, dots) |
| `kit.js` | `window.Kit` (needs `lib/core.js` first) |
| `sfx_signal.py` | the style's sound palette on top of `lib/sfxlib.py` |

## Tokens

| token | value | use |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` / `--kit-surface-2` | `#080B10` / `#0F1620` / `#131D29` | page / panels / cells |
| `--kit-line` / `--kit-line-2` | `#34445A` / `#4A5D73` | structure lines, panel outlines |
| `--kit-ink` / `--kit-ink-2` / `--kit-muted` | `#E8F1F8` / `#C9D6E3` / `#8FA1B5` (6.9:1 on surface) | text / body text / secondary |
| `--kit-accent` | `#C8FF3E` acid lime | **the new / changed / active thing** — nothing else |
| `--kit-accent-2` | `#6CB6FF` signal blue | a second series (KV film: the Keys) |
| `--kit-warn` | `#FF7A45` | waste, cost, the problem |
| `--kit-ok` | `#7CEBB0` | solved / included (use sparingly — the accent usually carries it) |
| fonts | Smiley Sans (display: chapter titles, hero words, closing line) · Noto Sans SC 500 (captions, labels, notes, body) · JetBrains Mono 400/700 (numbers, units, real terms, HUD) |
| type scale | hero 150 · display 92 · h1 64 · h2 44 · caption 44 · body 34 · label 30 · note 30 · HUD texture 20 |

Rule of thumb: anything that carries meaning is ≥ 28 px; the 20 px mono (timecode, `PROMPT`, `ROWS 08 / 08`,
dedup log rows) is texture only and kept sparse.

## Contract (`window.Kit`)

All factories return `{ el, render(t, …) }`. The kit owns the element's opacity / visibility / inner content; **the
film owns its position** (inline `left/top`, or a transform on a wrapper). Nothing reads the clock: pass `t`.

| call | render | notes |
| --- | --- | --- |
| `label({ text, sub, tone, at, until })` | `render(t, at?, until?)` → opacity | chamfered chip; text and sub decode in at `at`; a lime scan line crosses it once; tones `default · accent · line · warn · ok · ink · k` (k = accent-2). `.set(text, sub)` |
| `note(text, { tag = "说明", at, until })` | `render(t, at?, until?)` | one plain-language line; wipes + decodes in; inactive notes are `display:none`, so several can share one slot |
| `number({ value, unit, caption, decimals, format, tone })` | `render(t, u, op = 1)` | hero mono numeral (150 px) — `u` is count-up progress; `.set(v)` pins a value (then `format(v)` prints it) |
| `bars({ rows: [{ label, value, max, tone, valueText }], width })` | `render(t, u \| u[], op = 1)` | segmented tick bars; `u` eased inside (o2); a negative row entry hides that row; `valueText` may be a function of progress |
| `formula({ terms: [{ text, sub, tone, t, op }] })` | `render(t, until?)` | each term decodes in at its own `t`, layout reserved (nothing jumps); `× = ≈ ÷ →` are operators automatically |
| `title(story, { breakAfter = ["，"] })` | `render(t, until?)` | the closing line, **word-timed** from `story.end.line`: each unit is a ghost until spoken, scrambles for 0.2 s, resolves; `story.end.emphasis` words in lime |
| `recap(story, { cx, cy, cw, ch, cardWidth })` | `render(t)` | one composed frame from `story.recap`: a lime center node (title + tagline) wired to numbered cards (left column gets the extra one); wires draw, cards CRT-open and decode, data pulses travel center → cards, slow 1.6 % push. Card heights come from the text (no DOM measuring) |

Captions and chapter chip are **core's** (`core.Captions`, `core.Chapters`); the kit only styles them:

- `.kit-cap` — bottom-center bar, Noto Sans SC 500 at 44 px on a solid panel with a lime left rule; each unit goes
  muted → ink with `--lit`. Call `Kit.dressCaptions(caps)` once: Latin / number units are set in mono with a little air.
  (Smiley Sans is oblique and thin at caption size — that was the V2 review complaint — so it is display-only now.)
- `.kit-caps-wrap` (opt-in, on the captions container) — a long line wraps into balanced lines (max 1640 px) instead
  of running off the frame; the box still sits on the bottom band. The starter uses it; older films are unchanged.
- `.kit-chap` — `CH 0n` lime chip + the chapter title in Smiley Sans 40 px, wiped in by `--in`, underlined.
- `.kit-head` — put the chip and the notes in one flex row (`<div class="kit-head"><div id="chap"></div></div>`, then
  append each `Kit.note(...).el`): chapter + its 说明 read as one HUD header line.

## Extras (the style's own tools)

| extra | what |
| --- | --- |
| `dec(text, t, t0, dur, seed, hot)` | the decode effect as HTML (scramble glyphs from a seeded hash, resolving left → right; `hot` = char ranges in lime) |
| `ticker(el, [[t, text \| (t)=>text], …], dur)` | a read-out that decodes each new entry in (live counters: `RECV 095 / 100`) |
| `typed(text, t, t0, cps, cursor)` | terminal typing |
| `panel(host, w, h, chamfer, { fill, stroke, sw, dash })` | chamfered SVG panel behind a host; `.resize(w, h)` (consoles that grow with their content) |
| `tracker({ w, h, tone, big })` | four-corner brackets that lock onto a target: `render(t, at, until, from = 2.6)` |
| `stamp({ text, sub, tone })` | a badge that slams down (scale 1.9 → 1, −14° → −5°): `render(t, at, until)` |
| `wire(svg, { color, packets, dash })` | a data wire: base line + flowing dashes + packets with trails: `render(t, bezierPts, { draw, live, t0, speed, rate, dir, op })` |
| `hud(story)` | corner brackets + `T+00:12.34` timecode + one progress segment per chapter (texture) |
| `glitch(host, seams)` | the chapter-seam cut: RGB split + slice displacement + a scan line, 4 frames at each seam (SVG filter on `host`) |
| `backdrop(host)` | 40 px dot field + vignette; `render(cam)` moves it at half the camera's travel (wraps, so any travel works) |
| `bez`, `pathD`, `blen`, `link(a, b, bend)` | Bézier helpers for wires; `put`, `vis`, `esc`, `pad`, `fmtTC` small DOM helpers |
| `sfx_signal.py` | `decode`, `blip`, `pop(k)`, `lock`, `slam`, `glitch`, `stream`, `sweep`, `typing`, `rise(f0→f1)` (falling = shrinking), `close` |

## Using it for a new topic

Fastest: `tools/new_film.sh v2-signal <story> <project>` builds a playable film from `starter/` (one station per chapter, a
storyboard-frame placeholder per line, camera, chrome, closing line, recap, sound) — then perform `beats.js`
chapter by chapter (`starter/STARTER.md`). By hand:

Sync it in (`tools/sync.sh <film> v2-signal <story>`), link `lib/kit/kit.css`, load `lib/core.js`, `lib/story.js`,
`lib/kit/kit.js`, and add Noto Sans SC to `fonts.json` (`"extra": {"noto-sans-sc-500": {"family": "Noto Sans SC",
"css": "Noto+Sans+SC:wght@500", "weight": 500}}` next to `smiley-sans`, `jetbrains-mono-400/700`). Then think of the
topic as **an instrument panel for the mechanism**: name the protagonists as things a monitor would show (cells,
tokens, blocks, packets, gauges, logs), give each chapter a zone of one big `#world`, and let one camera writer
(`core.track` keys, `look(zone, cx, cy, s)`) carry the eye between zones while `Kit.glitch` marks the chapter seams.
Derive every beat time from `story.at / story.phrase` (+ small offsets) and drive the whole film from one paused GSAP
driver tween calling `frame(tl.time())`. Each keyword gets a measured action (a tracker locks, a counter rolls, a bar
grows, a packet flies); every chapter gets one `Kit.note` in the header; numbers that matter are `Kit.number` /
`Kit.formula`; comparisons are `Kit.bars`; the narration's last line is `Kit.title(story)` and the film ends on
`Kit.recap(story)` in its own clip. Sound: `tools/sfx.py` imports `sfx_signal` and re-derives the same times from
`lib/story.js`, then `bed.write(..., gain_db=…, lift_after=(recap.start, 8))` — set `gain_db` so the bed stays
≥ 12 dB under the voice in every voiced half-second (narration loudness differs a lot between stories).

## Do / don't

- **Do** decode text in, roll numbers, send data as packets, lock with trackers — motion that *measures* something.
- **Do** keep the accent for the one active / new thing in a beat (the new token, the 5 changed blocks, `0.5 MB`).
- **Do** grow containers with their content (the billing console) instead of drawing big empty cards.
- **Do** dim what is not computing (beat-5 tokens) rather than hiding it — the contrast is the explanation.
- **Don't** use Smiley Sans for captions or small labels; don't put meaningful text under 28 px.
- **Don't** loop idle animation (blinking cursors, breathing glows, spinning rings); the only constant motion is data
  that is actually flowing or the camera.
- **Don't** introduce cyan + purple neon; don't add a second accent.
- **Don't** let a scramble glyph sit on a lime chip in lime — `.kit-tone-accent .kit-s` handles it; do the same for
  your own lime elements (`.your-chip .kit-s { color: var(--kit-accent-dim) }`).

## Round-2 audit of the HF Storage film (before → after)


| finding (before) | fix (after) |
| --- | --- |
| HUD micro-text everywhere: act id 22 px, panel headers 20–25 px, stat lines 22 px, Δ / NEW tags 20 px, log 20 px, console header 20 px, readouts 24–25 px, `hf sync` / `ckpt` / `checkpoint saved` 24–26 px | stats 28, tags 26, panel titles 30–36, readouts 28, `hf sync` / `ckpt` 30, `checkpoint saved` / price tag 28, console rows 36; only timecode, `REMOTE · UPLOAD`, filename and dedup log rows stay small as texture |
| billing console 640 × 560 and ~55 % empty at 12.9 s; price 100 px | console grows row by row with what it has printed (140 → 628 px); price 150 px with glow; badge moved below the rows |
| captions Smiley Sans (oblique, thin) 40 px on a translucent bar | core captions + kit: Noto Sans SC 500 44 px, solid bar, word-timed muted → ink, Latin in mono; lines 2–3 and 4–5 grouped (no overlapping fades) |
| act title decoded in the HUD (not from the story) | `core.Chapters` chip from `story.chapters` + one `Kit.note` per chapter in the header |
| closing line two hand-placed decode tickers | `Kit.title(story)`: word-timed from line 8, emphasis 一处 / 自由 / 流动 |
| no recap, 30 s | glitch cut at 30.0 s into `Kit.recap(story)` (30.0–34.5 s), all durations 34.5 s, narration stays 30 s |
| no sound bed | `tools/sfx.py` → `assets/audio/sfx.wav` (34.5 s, `+14 dB` for this loud narration, recap lifted) |
