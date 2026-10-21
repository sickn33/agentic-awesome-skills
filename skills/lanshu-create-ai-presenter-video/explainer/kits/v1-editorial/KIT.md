# V1 editorial 「留白」 — kit

Warm bone paper, ink, and **one** vermilion accent. Serif words (Noto Serif SC 500 / 900), Instrument Serif
numerals, IBM Plex Mono for real terms and readouts. The protagonist is always a set of **data blocks** (ink
squares) that the script acts on: they stream, split, get matched, get hatched as waste, slide into a store,
fill a container. Space is a material: few elements, each one large and deliberately placed; the camera pushes,
pulls back and turns pages to the right instead of crossfading.

Proved on two topics: HF Storage (34.5 s, not bundled) and
`examples/kv-cache/v1-editorial` (KV cache, 45 s).

## Files

| file | what |
| --- | --- |
| `kit.css` | tokens on `:root`, every contract class, the V1 extras, the recap layout |
| `kit.js` | `window.Kit` (needs `lib/core.js` loaded first) |
| `paper-grain.svg` | the paper texture (`.kit-grain`), deterministic feTurbulence |

Load order in a film: `lib/core.js`, `lib/story.js`, `lib/kit/kit.js`, then the scene script; link `lib/kit/kit.css`.
Fonts: `fonts.json` = `{"index.html": ["noto-serif-sc-900", "noto-serif-sc-500", "instrument-serif-400",
"instrument-serif-400i", "ibm-plex-mono-400"]}` and run `python3 tools/fonts.py <film>` after every text change.

## Tokens

| token | value | use |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` / `--kit-paper` | `#f2eee6` / `#fbf9f5` / `#fffdf8` | page, card, slip/tile |
| `--kit-ink` / `--kit-block` | `#16130f` / `#2b2723` | text / an ink data block |
| `--kit-muted` | `#5e584f` (6.1:1) | secondary text |
| `--kit-faint` | `#8a847a` | texture only, never meaning |
| `--kit-stone` | `#cfc8bc` | stored / old data |
| `--kit-accent` / `--kit-accent-ink` | `#d2462c` / `#b53a22` (5.1:1) | THE accent — the new / changed / important thing (fill / text) |
| `--kit-accent-2` | `#2b2723` | V1 has no second hue; the second voice is solid ink (ink pills) |
| `--kit-warn` / `--kit-warn-fill` | `#8a5512` / `#c99a55` | waste / cost: ochre text, ochre hatching |
| `--kit-ok` | `#2f6a4c` | solved / included (rarely) |
| type | display 132 · h1 84 · h2 48 · body 36 · label 30 · note 28 · cap 42 (px @1080p) | |

Rules of the look: one red meaning per film (the new thing); waste is **hatched ochre**, never a second red;
labels ≥ 28 px, captions 42 px, notes 28 px; mono only for real terms (K, V, FP16, model.safetensors…).

## Contract API (`window.Kit`)

Every factory returns `{ el, render(t, …) }`; `render` is a pure function of `t`. Options shared by most:
`x, y` (absolute top-left, `ax, ay` 0..1 to anchor elsewhere), `at, out` (entry / exit seconds → `render(t)`
animates itself), or call `render(t, u)` with an explicit entry progress `u` (wins over `at`).
Kit pieces own their opacity / transform — don't also tween them with GSAP (wrap them if you must move them).

| call | renders |
| --- | --- |
| `label({ text, sub, tone })` | pill; tone `default · accent · warn · ok · ink`; `.set(text, sub)`, `.tone(t)`; sub is mono (the real term / unit) |
| `note(text, { key })` | one plain-language line with a red-ruled key (default 「说明」; use 「注」「例」 for footnotes); wipes in left→right |
| `number({ value, unit, caption, decimals, from, prefix, tone })` | Instrument Serif numeral; `render(t, u)` counts `from → value`, or `.set(v)` for stepped values |
| `bars({ rows: [{ label, value, max, tone, valueText }], width })` | label · track · value grid; `render(t, u)` grows (u = number or per-row array); `valueText` may be `(k) => string` |
| `formula({ terms: [{ text, sub, t, kind: "op" \| "res", tone }] })` | an equation set in Instrument Serif; each term rises at its own `t`; `res` is red |
| `title(story, { x, y, out, rule })` | the closing line from `story.end`: units rise out of a mask at their word times, `story.end.emphasis` in red, a red rule draws after the last word; a short segment ending in 「：」 becomes a small kicker line |
| `recap(story, { figure, figureSize, enter, fit })` | ONE composed frame: kicker + `recap.center` + tagline on top, the figure in the middle, the numbered points around it (left column right-aligned, right column left-aligned), each tied to the figure by a hairline leader. Motion: page slides in from the right, title/figure/points build in, a red reading highlight steps through the points, slow push. Without a figure the title takes the centre. |

Captions and chapters come from core: `new ExplainerCore.Captions(container, story, { groups, lead, tail })`
(the kit styles `.kit-cap` — centred serif 42 px, unspoken words in warm grey, spoken words in ink) and
`new ExplainerCore.Chapters(el, story)` (`.kit-chap` — italic red numeral + serif 900 title + a hairline that draws).
V1 uses a bottom caption bar (not a headline karaoke); the closing line is `Kit.title`, so leave its line out of
the caption groups.

## V1 extras

| call | what |
| --- | --- |
| `paper(container)` | bone paper + grain behind a container (or put `<div class="kit-paper">` + `<div class="kit-grain">` first in the stage) |
| `block(kind, size)` | one data block; kind `ink · accent · stone · paper · ghost (dashed) · warn (ochre hatch)` |
| `blocks({ n, cols, size, gap, kind, kinds: (i) => kind, x, y })` | a grid of blocks → `{ el, cells, at(i), pitch }`; animate the cells yourself |
| `card({ title, meta, w, h, x, y })` | the paper card (serif 900 title + mono meta on its head) — a store, a file, a container, a ledger |
| `tile({ text, sub, tone })` | a word set in a paper tile (a token, a name); tone `default · accent · ink · ghost`; `.tone()` keeps extra classes |
| `stamp({ text, tone, at, out, rot })` | a rubber stamp that slams down |
| `receipt({ title, rows: [{ label, value, t, pre, swap, big, total, tone }], width })` | prints line by line and **the paper grows as it prints** (no mostly-empty slip); `value` may be a function of t; `pre` shows until `swap` |
| `hair({ d \| x1, y1, x2, y2, tone, dots, len })` | a hairline / leader that draws: `render(t, u)` |
| `util` | `h, svgEl, vis, enter, prog` helpers |

## Using it for a new topic

1. Write `<story>/story.json` (lines with word times, chapters, `end` + emphasis, `recap` points) and
   `tools/sync.sh <film> v1-editorial <story>`.
2. Pick the protagonist as **blocks**: what are the units the narration talks about (file chunks, tokens, K/V
   pairs, memory pages, requests)? Give each state a block kind: ink = data, red = the new / changed one,
   stone = already stored, hatched ochre = wasted work, dashed ghost = skipped / would-be.
3. Lay the film out as one wide world of 1920-wide "pages" (or one page with push / pull); every beat time is
   `story.at(line, unit)` / `story.phrase(line, text)` + a small offset. Camera = `ExplainerCore.track` keys with
   holds; page turns go right; carry something across each turn (blocks flying into the next page's container).
4. Per chapter: chip (core), one `Kit.note` as a standfirst at (96, 132) under the chip, labels / numbers / bars /
   formula for the terms the narration names, and blocks moving for every keyword.
5. End: `Kit.title(S, { x, y })` for the closing line, then `Kit.recap(S, { figure })` with a miniature of your
   hero built from `card` + `blocks` (the HF film uses the store grid, the KV film the K | V ledger). After
   `recap.start` fade/hide the world underneath (the check treats covered text as overlap otherwise).
6. Sound: `tools/sfx.py` with `lib/sfxlib.py` — paper clicks / soft pops for appearances, pen `swipe`s for drawn
   lines, `whoosh` for page turns, one `thump` per climax, a low `swell` under the closing line and recap,
   `Bed.write(…, lift_after=(recap.start, 8))`. Levels −32 … −50 dB.

## Do / don't

- Do keep the frame full with **few, big** things: hero grids at 48–56 px blocks, cards ~620 px, numerals 132 px+.
  Fill or tighten any card that holds after its action (the receipt grows; ledgers fill row by row).
- Do give every narrated keyword a visible step (a block changes, a line draws, a number counts).
- Do put explanations in words on screen once per chapter (`note`), footnote real-world caveats with key 「注」/「例」.
- Don't add a second accent hue, gradients, glows on text, or idle breathing; stillness only as a short comma.
- Don't put chips above cards in the top-left 820 × 185 px zone — that is the chapter chip + standfirst.
- Don't tween kit components with GSAP; don't use `✓` glyphs (not in the subset faces) — draw ticks with CSS borders.
- Waiting / inactive groups can sit at ~56 % opacity (lower fails contrast on white-on-ink text).

## Starter (2026-10-05)

`starter/` is the film minus the topic: one bone-paper page per chapter (+ a closing page), page turns to the right
at chapter changes, a slow push inside each page, chip / captions / `Kit.title` / `Kit.recap` / sound bed from the
story, and a draft beat per line in `beats.js`. `tools/new_film.sh v1-editorial <story> <project>` → a playable film; then
replace the placeholders (see `starter/STARTER.md`).

Kit additions for it (additive, opt-in — films without them render exactly as before):

| addition | what |
| --- | --- |
| `.kit-caps-wrap` (kit.css) | put it on the captions container: a long line wraps into two balanced rows (bottom-anchored) instead of running off the frame |
| `recap(story, { fit: true })` (kit.js) | sizes the recap title and tagline from wider Latin estimates so a long centre (e.g. "Hugging Face Storage" without a figure) stays inside the centre box instead of overlapping the point columns; without `fit` the sizing is unchanged |

## Review round 2026-10-05 (HF Storage film audit → what the kit now fixes)

Audited at 1.2 / 3.5 / 6.4 / 9.6 / 12.9 / 15.8 / 19.5 / 23.5 / 25.6 / 29.4 s (frames in `_backup/v1-editorial/audit-before/`):

| found | fixed by |
| --- | --- |
| chips 26 px shrunk to ≈ 22 px by the 0.86× pull-back; `hf sync` ≈ 19 px; mono notes 24 px; receipt header 20 px | kit labels 30 px, notes 28 px, receipt head 26 px; acts 4–5 framed at 1.0× (topology compacted) |
| hero grid 40 px blocks (460 px) in a mostly empty frame; opening = one small card on the right | 48 px blocks (552 px grid, 620 × 670 cards) + an opening push at 1.12× on the file that pulls back on 「为什么」 |
| receipt mostly empty at 12.9 s | `Kit.receipt` paper grows with each printed line |
| captions 40 px, phrase-static; act headers 24 / 30 px | core captions 42 px word-lit; chapter chip 34 px + 52 px numeral; one 28 px 「说明」 standfirst per chapter |
| ckpt chip on top of the GCP label; copies ghost shown for 0.2 s | ckpt rides above the line; copies hold until 「一份」 and clear the standfirst |
| no recap, no sound; IBM Plex Mono never loaded; ✓ from fallback fonts | `Kit.recap` 30–34.5 s; procedural bed; Plex Mono subset; ticks drawn in CSS |
