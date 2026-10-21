# V11 casefile · 案卷 kit

The topic is **investigated like a case** on one cork board under a desk lamp. 立案: the anomaly is filed in a manila
case folder and the suspects are listed. 取证: each exhibit is slapped onto the board and pinned on its line (证物 A, B,
C…). 查明: red string ties the evidence to the cause; wrong suspects are stamped 排除, the right one 已证实. 修复 / 结案:
the fix is filed (已存档), a typed report states 原因 / 修复 / 代价, stamped 结案. The camera moves over the board like an
investigator's eye — leaning in to an exhibit, riding the red string from one region to the next — and pulls back to
the whole board for the closing line and the recap.

Reference film: `examples/kv-cache/v11-casefile` (KV cache, 61 s, story `stories/kv-cache-casefile`).

## Files

| file | what |
| --- | --- |
| `kit.css` | tokens + component styles: desk (cork, walnut frame, lamp, wash), cards, pins, stamps, tape, typed / hand text, captions, chip, label, note, number, bars, formula, title, recap |
| `kit.js` | `window.Kit` (needs `lib/core.js` first) |
| `cork.svg` | the cork tile (feTurbulence, stitched; 384 px) · `stamp-ink.svg`: the stamps' worn-ink alpha mask |
| `events.mjs` | `node lib/kit/events.mjs <film>` → `tools/events.json`: the kit's sound-cue log read out of the composition (headless Chrome that `npx hyperframes` installed; same reader as V3) |
| `casefile_sfx.py` | the procedural bed from that log (`lib/sfxlib.py`): push pins, paper slaps, typewriter keys, marker, highlighter, rubber stamps, string pulled taut, masking tape, camera air; `finale()` for the recap |
| `starter/` | the film minus the topic — see `starter/STARTER.md` |

## Tokens

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` | `#b5844f` cork / `#fbf6ea` paper | the board / exhibits, index cards, the report |
| `--kit-ink` / `--kit-muted` | `#2b211a` / `#5e4c3a` | typed ink / secondary text (7.6:1 on paper, 5.5:1 on manila — **not** on cork: put text on paper) |
| `--kit-accent` | `#c8352b` red | **the finding / the culprit**: red pin, red string, 已证实, 结案, the closing emphasis |
| `--kit-accent-2` | `#2f5d8a` blue | a hypothesis / under investigation: blue pin, blue string (a hunch), 推测 · 排除 stamps |
| `--kit-warn` | `#a24a10` rust | waste / cost: recomputed rows, memory |
| `--kit-ok` | `#2f6b43` | solved / included (rare) |
| `--kit-hl` | yellow, multiply | the highlighter: **the evidence that matters** |
| `--kit-sticky`, `--kit-manila`, `--kit-photo`, `--kit-tape`, `--kit-string`, `--kit-walnut` | | sticky note, case folder, polaroid, masking tape, red string, the frame |
| `--kit-label-bg / -ink / -off / -key` | `#161514` / `#f3f1ec` / `#7b766d` / `#ffd84d` | the label-maker strip: spoken, unspoken (3.9:1, large), the key span |
| fonts | Noto Serif SC 900 (display) · typed = Special Elite (Latin) + Noto Serif SC 500 (CJK) · Long Cang (hand) · Noto Sans SC 700 (tags, chip, captions) · JetBrains Mono 700 (real terms) | `fonts.json` (starter): `noto-serif-sc-900`, `noto-serif-sc-500`, `special-elite`*, `long-cang`, `noto-sans-sc-700`*, `jetbrains-mono-700` (*via `extra`) |
| sizes | display 120 · h1 88 · h2 60 · body 40 · label 34 · note 50 · caption 40 | px at 1080p; on the board they are **board px × camera scale** (stations are seen at ≈ 0.9–1.25) |

Special Elite is Latin-only; it is declared at weight 500 so the typed stack falls back to Noto Serif SC 500 for CJK.
Long Cang draws small: handwriting ≥ 48 board px (≥ 40 on screen). Long Cang's 1 reads like l — write numbers typed.

## API

Every factory returns `{ el, render(t, ...) }`; `render` is a pure function of `t`. Collect them in `Kit.scene()` (the
starter's `api.add`) and render from one GSAP driver.

**Shared components (KITS.md §1)**

- `Kit.label({ text, sub, tone, at, cps, rot, out })` — an evidence slip slapped on: the text typed, the real term (mono) under it.
- `Kit.note(text, { at, width, rot, fontSize, speed, out, desk, x, y, pin })` — the plain-language sentence on a yellow
  sticky note, handwritten line by line (`"\n"` breaks; lines are balanced, no widows). With `desk` it is a card on the
  board (`pin` optional); without, place `note.el` yourself. One per chapter.
- `Kit.number({ value, unit, caption, decimals, tone, at, format, paper })` — a typed count-up; `render(t, u)` or `.set(v)`.
- `Kit.bars({ rows: [{ label, value, max, tone, valueText }], width, rowH, labelW, at, dur, stagger, paper })` — marker-hatched bars.
- `Kit.formula({ terms: [{ text, t, sub, tone, ring, size, cps }], paper })` — terms typed at their spoken times, the
  meaning handwritten under each, `ring` circles the result in red. number / bars / formula sit on a paper slip
  (`paper: false` when they are already on a card) — muted text does not pass contrast on cork.
- `Kit.title(story, { tag, stamp, stampText, breaks })` — the closing line on a lined sheet: each unit strikes as it is
  spoken (display serif), `story.end.emphasis` red and ringed in red marker right after it is said, then a 结案 stamp
  (`stamp: false` to skip; `tag` defaults to 「结论」). Its font size is the display size — the starter sizes it ≈ 100 px
  on screen over the pulled-back board.
- `Kit.recap(story, { at, end, center, tagline, covers })` — ONE composed frame in screen space over the pulled-back,
  hushed board: a manila case folder slaps down in the middle (recap.center, auto-sized; the tagline in red marker),
  every point (1–6) is an index card pinned round it and tied from the folder's nearest corner with red string, then
  结案 is stamped on the folder. A linear push keeps it moving; `covers` fade out under the folder.

**Captions / chapters.** `Kit.captions(container, story, { skipEnd, air, clamp, keys })` = `core.Captions` on black
label-maker strips (every wrapped row its own strip, embossed white letters, unspoken units grey). `keys: { line:
"phrase" }` lights that phrase **yellow** as it is spoken (`.key(line, phrase)` later; `Kit.keyPhrase(story, i)` = the
line's last clause of 4–16 em, the default). `Kit.chapters(el, story)` = `core.Chapters` with a two-digit number on a
label strip, the title in display serif, on a manila index tab top-left (`--in` reveals it).

**Casefile extras**

- `Kit.desk(stage, { x0, y0, x1, y1, frame })` → `D`: layers board (cork + walnut frame) → lamp (screen: warm pool,
  dark corners) → world: `D.cards` → `D.wash` → `D.strings` (svg) → `D.pins` → `D.top`. `D.view(v)` moves board and
  world together and keeps strings ≈ 3.4 px on screen (`--kit-sw`); `D.dim(u)` dims the board; `D.hush(u)` fades every
  card's contents (tags, text, stamps; paper, pins, strings and tape strips stay) so a sheet or the recap can lie over
  the board without covering text.
- `Kit.card(D, { x, y, w, h, kind, rot, tag, tagTone, tab, pin, pinX, pinY, pad, rule, ruleTop, at, dur, from, out })` —
  kinds `paper | lined | index | manila | photo | sticky`; slaps down at `at` (from above, larger, turned) and its pin is
  pushed in as it lands. It turns about its pin, so `card.pt` never moves; the pin sits right of a long tag.
  `card.tie(where, inset)` = a board point on its edge (`t | tl | tr | bl | br | l | r | b`) for strings.
- `Kit.pin(D, x, y, { color: red | yellow | blue | white, at, size, out })` — a glossy push pin pushed into the cork.
- `Kit.string(D, a, b, { at, dur, sag, bend, via, tone, width, ease, ends, out })` — red string pulled from a to b,
  sagging, with a shadow; `via` routes it through a point (round a card), `ends: true` pushes small white pins at both
  ends, `tone: "accent-2"` = a blue hunch. `.point(u)` / `.head(t)`. `Kit.ties(A, B)` = the nearest corner pair of two
  cards, so a string runs round their text instead of across it.
- `Kit.stamp(parent, { text, tone, x, y | place: { left|right, top|bottom }, rot, size, at, opacity })` — a rubber
  stamp thumps down (fast, a small bounce), multiply-blended, worn ink. Its text waives the overlap check (stamps land
  on text by design).
- `Kit.type(el, { at, dur | cps })` — typewriter: characters strike in place (one text node + a hidden rest, so the
  layout audit sees one block). `Kit.typed(parent, text, { x, y, size, tone, at, dur })`, `Kit.typer(el)` → `set(k)`
  for custom per-character timing.
- `Kit.write(el, { at, dur })` / `Kit.hand(parent, text, { x, y, size, tone, rot, at, dur })` — handwriting (Long
  Cang) uncovered left to right at marker speed. `Kit.highlight(parent, { x, y, w, h, at, dur, under })` — yellow
  swipe under a text. `Kit.mark(svg, d, { at, dur, tone, width })` with `Kit.geo` (`loop`, `line`, `under`, `wavy`,
  `cross`, `tick`, `arrow`, `brace`) — marker rings, strikes, ticks, arrows.
- `Kit.tapeline(parent, { x, y, w, h, marks: [{ label | html, t, until, tone, p }], at, head: [t0, t1], check })` —
  the masking-tape timeline: it unrolls at `at`; T marks light in their tone at `t` (a red dot), go back to ink after
  `until`; `head` rides a red marker arrow along it. Its labels waive the layout checks (board texture once the camera
  leans past them) unless `check: true`. `Kit.tape(parent, x, y, w, h, rot)` — a plain strip.
- `Kit.camera(target, startView)` with `.move(view, at, dur, ease)` and `Kit.view(cx, cy, s)` — piecewise dolly moves
  (log-scale zoom); never park it: chain linear drifts between moves (the starter's planner does).
- `Kit.lines(text, maxEm)` / `Kit.balanced(text, maxEm)` (no 1–2 character widow), `Kit.emOf`, `Kit.el`, `Kit.svg`,
  `Kit.path`, `Kit.slap`, `Kit.events` / `Kit.event(kind, t, d)` — the sound-cue log (`window.__kitEvents`).

## Using it for a new topic

`tools/new_film.sh v11-casefile <story> <project>` builds the playable draft from `starter/` (board, stations, tapes,
draft cards, the travelling string, camera, chip, captions, closing sheet, recap, sound). Then perform `beats.js`
(`starter/STARTER.md`). For each chapter decide what the investigator pins: the anomaly in a case folder, exhibits on
lined paper / polaroids / index cards, a ledger of the numbers, the suspects as a list or a lineup. For each narrated
keyword pick one board action — type it, write it, pin it, string it, stamp it, ring it, highlight it — timed with
`story.at` / `phrase` / `span`. Facts only from the narration or `story.json → facts`; illustrative numbers say 「示意」 in
their tag. Sound: `bash tools/sfx.sh` (the log captures every kit cue; add film extras in `tools/sfx.py`).

## Do / don't

- **Do** keep text on paper (cards, slips, notes): muted text fails contrast on cork. Labels ≥ 32 board px, handwriting
  ≥ 48, at a camera scale ≥ 0.9.
- **Do** tie strings to card corners (`Kit.ties`, `card.tie`) or route them with `via` — a string across typed text is
  noise. Red = proven, blue = a hunch.
- **Do** keep one meaning per colour: red the culprit, blue the hypothesis, yellow the evidence that matters, rust the
  waste. Stamps: 推测 / 调查中 / 排除 blue; 已证实 / 已存档 / 结案 red.
- **Do** frame shots so no board text sits under the chapter tab (top-left) or the caption strip; check with
  `hyperframes check` (it reports the times).
- **Don't** park the camera or wobble anything idly: cards slap once, pins push once, stamps thump once.
- **Don't** type text in per-character spans yourself (use `Kit.type` / `typer`): spans clipped at the frame edge read
  as overlapping text in the layout audit.
