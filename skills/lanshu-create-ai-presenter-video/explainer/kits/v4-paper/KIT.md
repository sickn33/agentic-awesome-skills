# v4-paper — 纸艺「立体书」 (paper-cut pop-up book)

An open pop-up book. The whole explainer is ONE continuous paper world on a kraft page: white paper pieces **fold up**
off the page (hinge on their bottom edge), cast soft shadows whose length follows the fold angle, **ribbons unroll**
from paper rolls, **tapes are pulled out of slits**, hung pieces **swing twice and settle**. The camera travels along the
page; a far layer (sun, paper clouds, hills) moves at 0.4×, the page at 1×, the paper grass at 1.25×. No crossfades:
pieces arrive by folding up and leave by folding flat; the camera carries the eye between stations.

Files: `kit.css` (tokens + component looks), `kit.js` (`window.Kit`), `paper-grain.svg` (texture, referenced by
kit.css), `paper_sfx.py` (the paper sound palette on top of `lib/sfxlib.py`), this file.
Fonts (declare in the film's `fonts.json`): `zcool-kuaile` (ZCOOL KuaiLe — CJK display + body) and `archivo-black`
(Archivo Black — numbers, English, real terms; this kit's "mono").

## Tokens (`:root` in kit.css)

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` | `#e8dcc4` kraft | the book page |
| `--kit-surface` | `#fbf8f1` white paper | cards, tags, captions |
| `--kit-sand` | `#f1e6cf` | ribbons, boards (`.kit-sandp`) |
| `--kit-ink` / `--kit-muted` | `#26364a` navy / `#4f5d70` | text, roofs, slits / secondary text (4.9:1 on kraft) |
| `--kit-accent` / `--kit-accent-ink` | `#e27d60` coral / `#b8492f` | THE new / changed / important thing (fill / as text) |
| `--kit-accent-2` | `#bcd4e6` sky | second colour: matching, look-up, keys |
| `--kit-warn` / `--kit-warn-ink` | `#e3b448` mustard / `#8a5a0c` | waste, cost, memory |
| `--kit-ok` / `--kit-ok-ink` | `#9dba9a` sage / `#3e6a45` | solved, included, gain |
| type scale | display 112 · h1 80 · h2 56 · body 36 · label 32 · note 36 · cap 44 | px at 1080p |

Text on coral / mustard / sage / sky fills is always navy ink (≥ 4.3:1, large text). Coral as *text* uses `--kit-accent-ink`.

## Glyphs

ZCOOL KuaiLe has no `≈ → ∝ ✓`; Archivo Black has `≈ → × ÷` (not `∝ ✓`). `Kit.term()` puts every Latin/digit run and
`≈ → × ÷` into an Archivo span automatically. Never write `∝` or `✓` as text — say it in words (「随上下文线性增长」) or
draw a check as SVG.

## The contract (`window.Kit`)

Every factory returns `{ el, render(t, …) }`. `render` only touches the element's *inside* and sets inner visibility to
`inherit`/`hidden`, so you position `el` yourself (`style.left/top`, or `ExplainerCore.place()`), and hiding any
ancestor hides the component.

| call | look | timing |
| --- | --- | --- |
| `label({ text, sub, tone, size, at, out })` | paper tag with a punched hole; tones `default accent warn ok ink sky` | folds up at `at`, flat at `out`; or `render(t, u)` with explicit progress |
| `note(text, { at, out, kicker, small })` | one plain-language line on a sand ribbon that unrolls from a roll; `[[word]]` = accent ink | `render(t)` from at/out, or `render(t, u)` |
| `number({ value, unit, caption, decimals, tone, steps, at, out })` | big Archivo number on a pop-up card + caption strip | `render(t, u)` count-up; `.set(v)`; `steps: [[t, v]…]` flips a calendar page on each change |
| `bars({ rows: [{ label, value, max, tone, valueText }], width, labelWidth, at, out })` | each row a tape pulled out of a slit, a navy tab rides its end | `render(t, u)` (u or one per row); `.setValueText(i, s)` for stepping values |
| `formula({ terms: [{ text, sub, t, tone }, { text: "×", t }, { br: true }…], out })` | term cards fold up one by one; `× = ≈ + ÷ →` become navy discs | each term at its own `t` |
| `title(story, { kicker })` | the closing line on ribbons (one per clause) that unroll from the middle; every word is **printed** onto the ribbon the moment it is spoken; `story.end.emphasis` in accent ink; a short first clause ending in `：` (「一句话：」) becomes a navy kicker tab | `render(t)` |
| `recap(story, { hide, centerWidth, cardWidth, centerY, topY, bottomY })` | the last page folds up from the bottom edge over the film: one composed pop-up spread — navy/white centre placard (title + tagline) with numbered point cards around it (top row ⌈n/2⌉, bottom row under the gaps), tied by paper strings; a steady linear push-in so it never freezes | `story.recap.start → end`; pass `hide: [stage, closingTitle]` so the covered film is switched off |

Captions: `Kit.captions(container, story)` wraps `core.Captions` — a white paper label taped to the bottom of the page,
unspoken units in pencil grey, spoken units in ink (`--lit`), Latin units in Archivo; each new label is pasted over the
last. It **leaves out the closing line** (`story.end.line`) because `Kit.title` prints it word by word (pass
`{ includeEnd: true }` to keep it). Chapter chip: use `core.Chapters` on any element — the kit styles `.kit-chap` as a
navy bookmark hanging from the top edge with a paper tab (slides down with `--in`). No chip during the closing line.

## Extras (the paper physics)

- `Kit.world(root, { stage, span, sun, clouds, hillsUp, floorY, grass })` → `{ far, stage, near, floor, hills, grain,
  render(cam, t), toScreen(x, y) }`. Builds the book page; ONE camera `{x, y, s}` (world point at frame centre, scale)
  drives all layers. The paper grain is printed on the page and travels with the camera.
- `Kit.fold(t, tUp, dUp, tDown, dDown, ease)` → fold angle (88 = flat, 0 = standing); `Kit.alive(t, tUp, tDown, dDown)`;
  `Kit.foldCss(angle, eye, dist)` → the hinge transform; `Kit.floorShadow(el, angle, pre)` for a `.kit-shadow` div lying
  behind a standing piece; `Kit.cardShadow(angle)` → box-shadow of a standing card.
- `Kit.swing(t, t0, amp, per, dec, settle)` — decaying swing caused by hanging (settles to exactly 0).
- `Kit.ladder(t, [[t, v], [t, v, ease]…])` eased keyframes; `Kit.tw`, `Kit.EZ` (core eases + `sio b14 b16 b18 i3 i4 lin`).
- `Kit.string(pathEl, a, b, u, sag)` a sagging dashed paper string drawn to progress u (use an `<svg class="kit-strings">`);
  `Kit.bez2`, `Kit.subPath` for flights along arcs.
- `Kit.cloudSVG(w, h)`, `Kit.term(text)`, `Kit.h/esc/hsh`.
- CSS pieces: `.kit-piece` (hinge at bottom), `.kit-paper`, `.kit-sandp`, `.kit-face/.kit-back` (two-sided cards for
  flips), `.kit-shadow`, `.kit-thread`, `.kit-strings`, `.kit-nail`, `.kit-ribbon` + `.kit-roll`.
- Sound: `paper_sfx.py` → `fold(size) flip() slap(size) tap(bright) rustle(dur) tape(dur) unroll(dur) string(dur) hang()
  stamp() page_up(dur) tick_train(n, span)`; every sound peaks at 1.0, so the gain you pass to `Bed.place` is its peak.
  Keep the bed ~10–15 dB under the voice's RMS; one `page_up` swell for the recap; `Bed.write(lift_after=(recap.start, 6–8))`.

## A new topic in this style

1. `tools/sync.sh <film> v4-paper <story>`; `fonts.json` = `{"index.html": ["zcool-kuaile", "archivo-black"]}`.
2. In the film: link `lib/kit/kit.css`; load `lib/core.js`, `lib/story.js`, `lib/kit/kit.js`. A `#stage` clip holding an
   empty `#world` div, and a screen `#overlay` clip with a chip element and a caption container.
3. `const W = Kit.world($("stage"), { stage: $("world"), span: [x0, x1] })`. Lay the story out as **stations** along the
   page (≈ 1900 world px apart). Pick one paper protagonist per idea (here: token cards, K tags, V cards, a cabinet, a
   memory box, a balance) and give every narrated keyword a paper action — fold up, flip, pull a tape, hang a tag, stamp,
   fly along an arc into a slot. All times from `story.at()` / `story.phrase()` + small offsets.
4. Notes (`Kit.note`) go top-centre in screen space, one plain line per chapter; labels / bars / numbers / formulas live in
   the world next to what they explain. Captions `Kit.captions`, chip `core.Chapters`, closing line `Kit.title` at the top
   of the frame, recap `Kit.recap(story, { hide: [stage, title.el] })`.
5. Camera: an eased move (io3) between stations; **between moves never park** — drift linearly (≈ 10–30 px/s on screen)
   toward whatever the narration is about. Check stills: screenshot pairs 1/15 s apart in quiet stretches must differ.
6. `tools/sfx.py` with `paper_sfx`, timed from the same story calls. `fonts.py` after every text change. `check` → 0 errors.

## Starter (`starter/`)

`tools/new_film.sh v4-paper <story> <project>` builds a playable film from any story: one station per chapter along the page, a
camera shot per narration line, the chrome, the end plinth, the recap and the paper sound bed, with a pop-up storyboard
card (「待演绎」) for every line. The scene author only writes `beats.js` (+ `tools/sfx_beats.py`). See
`starter/STARTER.md` for the `api` and the idioms. Kit additions for it (additive): `Kit.textW`, `Kit.clauses`, `Kit.TERM`
are exported (the text-sizing helpers the recap already used; copy `TERM` with `new RegExp(Kit.TERM.source, "g")`).

## Do / don't

- Do: fold pieces up on their keyword and flat when they are done; let shadows follow the fold; hang things on strings;
  pull tapes for progress; print the closing words onto ribbons; keep one coral thing per beat (the new / important one).
- Do: label analogies with the real term (the cabinet says `KV cache`, the box says 显存).
- Don't: crossfade, float or idle-wobble pieces (a swing must be caused by hanging); don't park the camera; don't put
  meaningful text under 28 px *on screen* (world-space labels shrink with the camera — scale them up with `place(…, s)`);
  don't put anything important in the bottom caption band (bottom ≈ 140 px).
- `ExplainerCore.place()` sets `visibility: visible` on the element — for pieces nested in something you hide later, reset
  `el.style.visibility = ""` after placing (or the piece shows through its hidden parent when the renderer seeks).
- Overlapping-by-design text (the number's flip page) carries `data-layout-allow-overlap` on the text spans themselves.

## Polish round on the HF Storage film (audit → fixes)

Audit of the V4 HF Storage film (snapshots 1.5 … 29.6 s) against KITS.md §2 and the V4 review row:
- progress tape tab 22 px (「80%」) → 32 px on a 150×60 tab; tape / slit / 「整份重传·只传变化」 sign enlarged (38 px) and lifted
  out of the caption band;
- small chips: 「95 块已有 · 跳过」 28 → 34 px, scan tab 「去重」 28 → 32, 「上一版」 32, receipt header 22 → 28, envelope 「ckpt」
  24 → 32, 「hf sync」 32 → 40, dial 「完成」 34 → 40, flag 「智能体」 40 → 44, model filename 24 → 28;
- caption chip 40 px with no word timing → kit paper label 44 px, word-lit (karaoke), taped corners, pasted-on entry;
- no chapter chip → the navy bookmark chip (5 chapters);
- GCP house small / bottom row cramped (act 4/5 framed at 0.66–0.72×): houses moved closer to the store, act 4 framed at
  0.8×, the end at 0.79–0.8× and lower; the 「hf sync」 tag unclips at the conclusion; GCP lying flat fades its printed words
  (no squashed 「GCP」 on the floor);
- 「公有存储」 ribbon sat under where the chip goes and was cut by the frame edge → moved left of the price tag, rolls up before
  the camera pans on;
- no plain-language note for chapters 4–5 → 「不用每家云各存一份」, 「算力用完就走，检查点留下」;
- the end: two hand-built ribbons → `Kit.title` (word-printed), plus the new one-frame recap 30.0–34.5 (5 cards);
- the camera parked for up to 3.9 s (1.7–5.6) → every hold is now an intent-led drift; grain travels with the page;
- no sound → `tools/sfx.py` paper bed (folds, flips, taps, tape, stamp, swell; lifted 6 dB after 30.0 s).
