# v12-sitcom — 小剧场 (a sitcom set, seen straight on)

A flat, warm sitcom set: cream wall, mint wainscot, wood floor, a counter, a window, a chalk menu board. Rounded flat
characters with thick cocoa outlines (#3d2b22, 4 px), dot eyes and blush act the idea out; props are the **evidence** (a
receipt that unrolls row by row with red 又核一遍 tags, a notebook, a queue, a ticket-number screen). Speech and thought
bubbles pop on their words; captions sit in a white rounded box with an offset shadow and a dark 旁白 tag, the key span on
a yellow marker.

**What makes it a style, not a skin — the narrative shape:** a character meets a misconception (误区), finds the cause
through a bill, a queue or a side-by-side object comparison (账单 / 对照), and it ends in one sentence that maps the
analogy to the real term (小本本 = KV cache). It is for explaining abstract terms to newcomers. The set is generic: any
topic picks its life scene (a shop counter, a delivery station, a canteen line, a library desk …) from the set pieces,
the characters and the props below. Reference film: `examples/kv-cache/v12-sitcom` (a milk-tea shop, 50 s).

Files: `kit.css` (tokens + every component's look), `kit.js` (`window.Kit`), `sitcom_sfx.py` (the sound palette on top of
`lib/sfxlib.py`), this file. Fonts (the film's `fonts.json`):

```json
{ "index.html": ["noto-sans-sc-700", "noto-sans-sc-900", "zcool-qingke", "long-cang", "jetbrains-mono-700"],
  "extra": { "noto-sans-sc-700": {"family": "Noto Sans SC", "css": "Noto+Sans+SC:wght@700", "weight": 700},
             "noto-sans-sc-900": {"family": "Noto Sans SC", "css": "Noto+Sans+SC:wght@900", "weight": 900} } }
```

Noto Sans SC 700 / 900 = body, captions, labels; Long Cang = thoughts and chalk; ZCOOL QingKe HuangYou = only the
小剧场 tag; JetBrains Mono 700 = real terms and order numbers (`Kit.term()` wraps Latin / digit / `#008` runs).

## Tokens (`:root` in kit.css)

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` / `--kit-paper` | `#fbf3e4` / `#fff` / `#fffdf7` | cream wall / bubbles, cards, captions / receipts, notebook pages |
| `--kit-ink` / `--kit-muted` | `#3d2b22` (13.4:1) / `#6b5548` (6.3:1 on cream) | every outline and all text / secondary text |
| `--kit-dim` | `#94806f` (3.8:1, large text) | caption units not yet spoken |
| `--kit-accent` | `#ffcf5a` yellow | THE key thing — fills and the marker only; text on it is cocoa |
| `--kit-accent-2` / `--kit-mint` / `--kit-mint-2` | `#5fb88f` / `#cfe8dc` / `#a6e6cc` | matching, the second colour / wainscot / light mint fills |
| `--kit-coral` / `--kit-coral-d` | `#ef7d61` / `#e0694c` | the counter, the 小剧场 world colour / coral behind white text (3.3:1, large only) |
| `--kit-warn` / `--kit-warn-soft` / `--kit-warn-ink` | `#e2483d` / `#ffe1dc` / `#c8382e` | the mistake, the waste (又核一遍, 代价, 显存) |
| `--kit-ok` / `--kit-ok-ink` | `#5fb88f` / `#2f7a57` | solved |
| `--kit-board` / `--kit-chalk` | `#2f5a4b` / `#fff6d6` (7.2:1) | chalk board / chalk |
| `--kit-peach`, `--kit-wood`, `--kit-sky` | `#ffd9a8`, `#ecd0a8`, `#bfe3f5` | V / content cards, floor, windows |
| type scale | display 96 · h1 64 · h2 48 · body 34 · label 30 · note 28 · cap 40 | px at 1080p (closing line 56, chip 30, tags 26–28) |

## The contract (`window.Kit`)

Every factory returns `{ el, render(t, …) }`; `render` is a pure function of t and its explicit args. Pieces are placed
with `Kit.at(el, x, y)` (top-left, world px) or inside a holder; components pop with a back-eased scale (no cross-fades).

| call | look | render |
| --- | --- | --- |
| `label({ text, sub, tone, size })` | a pill sticker with an offset shadow; `sub` = the real term in mono. tones `default accent warn ok ink peach` | `render(t, at, out)` pops in / shrinks out |
| `note(text, { tag = "说明", w })` | a pale-yellow memo card taped to the set wall, dark 说明 tag; `[[word]]` on the marker | `render(t, at, out)` drops in with a small swing, falls away |
| `number({ value, unit, caption, decimals, tone, prefix })` | a big Noto 900 figure on a white card + a dark caption tag | `render(t, u, at)` counts `value × u`, or `.set(v)` + `render(t)` |
| `bars({ rows: [{ label, value, max, tone, valueText }], width })` | pill label + rounded outlined track + flat fill | `render(t, u, at)`, u a number or one per row |
| `formula({ terms: [{ text, sub, t, tone, op }] })` | pill terms and round cocoa operators (`× = ≈ + ÷ →`) | `render(t, out)`, each term pops at its `t` |
| `title(story, { tag })` | the closing line in a big caption box (56 px) with a dark 一句话 tag (a short leading clause ending in ：becomes the tag); every unit pops as spoken; `story.end.emphasis` on the yellow marker, swept in as spoken | `render(t)`; place it yourself (the starter centres it in the caption band via `.kit-title-wrap`) |
| `recap(story, { cast, hide, badge })` | ONE composed frame, a curtain call: coral curtains close over the film at `recap.start` and open on the set — the chalk board carries `recap.center` (+ tagline in chalk), numbered scene cards (left ⌈n/2⌉, right ⌊n/2⌋) tied to the board with dashed strings, the cast (`cast: [characterOpts]`) bows in front; a slow linear push-in | `render(t)`; `hide: [elements]` are switched off under it (pass non-`.clip` elements: HyperFrames owns a clip's visibility) |
| `captions(container, story, { includeEnd, tag, maxWidth })` | `core.Captions` in white rounded boxes with a dark 旁白 tag, unspoken units dim, Latin in mono; a long line is sized to balanced lines; boxes are set down with a small rise and cut (no fades) | `render(t)`; `caps.mark(line, "手太慢")` puts that span on the yellow marker, inked unit by unit as spoken |
| `chapters(el, story, { tag })` | `core.Chapters` as a white pill: coral 小剧场 tag (QingKe) + number disc + chapter title; pops per scene | `render(t)` |

## The set, the cast, the evidence (style extras)

- `Kit.backdrop({ x0, x1, rooms: [{ x0, x1, paper }], dividers: [x] })` — one long room: cornice 0–24, wall to 590,
  wainscot 590–760 (`Kit.WAIN`, `Kit.FLOOR`), wood floor below; `paper` = a striped wallpaper room; dividers = wall pillars.
- `Kit.piece(kind, o)` → `{ el, w, h, … }`: `counter {w, h, color}`, `board {w, h, title, rows: [[name, price]], titleSize}`
  (+ `.title`, `.rows`, `.area` to draw chalk in), `window`, `door`, `shelf {items: cups|books|jars}`, `plant`,
  `clock {r}` (+ `.hands(minutes)`), `lamp`, `frame`, `desk {monitor}`, `register`, `bench`, `stool`, `sign {text}`.
- `Kit.character(o)` → an actor (feet at `x, y`; `s` scale, customers ≈ 0.78; `flip`). Looks: `kind: "person" | "robot"`,
  `hair: short | bun | bob | spiky | ponytail | cap | long | bald`, `hairColor`, `skin`, `shirt`, `pants`, `apron`,
  `glasses`, `capColor`, `bow`, `seed` (picks unset colours). Faces: `smile happy worried surprised sad think flat proud oops`.
  Arm poses: `down front up wave hold hip point give write chin shrug cheer cheek tray bow`. Drive it with cues — all
  evaluated at render time:
  `.cue(t, { face, arms: [l, r], armL, armR, sweat, slump, tilt, headY, flip, lean })` (blends 0.24 s; a flip turns through
  edge-on), `.move(t0, t1, x, { y, walk })` (legs swing while walking), `.hop(t, h, d)` (landing squash),
  `.emote(t, "！", dur)` (a yellow badge over the head), `.show(t0, t1)`, `.hold(side, el, t0, t1, dx, dy)`,
  `.handAt(t, side)`, `.headAt(t)`, `.posAt(t)`.
- `Kit.queue({ front, y, gap, s, n0, seed, enterFrom, exitTo, looks })` — `.join(t)` walks one in at the back,
  `.serve(t)` sends the front one off (holding a tray) while the rest step up, `.face(t, face, { from, to, stagger, sweat })`,
  `.actor(k)`, `.count(t)`. Add every event before customising members (`q.actor(k).cue(…)` survives rebuilds).
- `Kit.bubble({ text, kind: say | think | shout, size, maxW, tail: down | up | left | right, along, tip: [dx, dy], times,
  write, mark, tag, todo })` → `.place(x, y)` puts the tail tip at a world point; `render(t, at, out)` pops it from the tip;
  units lit (or written, `write: true`) at `times`. Think = Long Cang in a cloud with trailing circles.
- `Kit.receipt({ title, rows: [{ no, item, tag, kind: old | new | ok }], footer, w })` — `render(t, { at, out, rows: [t],
  tags: [t], footer: t, hi: [0..1] })`: unrolls row by row, the torn edge follows, tags stamp on.
- `Kit.notebook({ w, h, rows: [[k, v]], cols, label })` — `render(t, { at, out, open, rows: [0..1], hiK, hiV, active,
  flip, thick })`: the cover swings open, rows are written on (clip), column highlights (mint = 单号 / K, peach = 内容 / V),
  the active row in yellow behind the writing, a page turns, page edges stack up underneath.
- `Kit.display({ label: "叫号", steps: [[t, "#008"]] })` — the ticket screen; the digits flip on each change.
- `Kit.chalk(text, { size, spans: [[sub, "kit-chalk-y" | "kit-chalk-r"]] })` — Long Cang chalk written unit by unit:
  `render(t, t0, t1)` or `render(t, [times])`.
- `Kit.termChip({ a, b, tone, aw })` — the analogy (left, coloured) = the real term (right, mono); `render(t, at, out)`
  slides in and lands. Tones `accent ok peach warn coral`.
- `Kit.prop(kind, o)` (bottom-centre anchored): `cup`, `slip`, `slipPile {n}`, `memory`, `tile`.
- Helpers: `Kit.P` (palette), `Kit.popScale(t, at, out)`, `Kit.hopY`, `Kit.land`, `Kit.bump`, `Kit.ladder`, `Kit.EZ`,
  `Kit.term`, `Kit.units`, `Kit.textW` (… and — count full width), `Kit.at`, `Kit.vis`, `Kit.xf`, `Kit.svgEl`, `Kit.mk`.
- Sound: `sitcom_sfx.py` → `ding door_bell step steps shuffle truck boing bloop pop2 scribble flip stamp printer curtain
  applause norm`; every sound peaks at 1.0 (`norm()` any `sfxlib` texture first), so the gain is the peak. With MiniMax
  narration (≈ −16 dB RMS) keep transients 10–15 dB under it; the recap is lifted 7 dB.

## A new topic in this style

Start from the starter: `tools/new_film.sh v12-sitcom <story> <project>` (see `starter/STARTER.md`). Then:

1. Write the analogy table first (比喻 → 真名, one row per narrated keyword) and pick ONE life scene that holds it.
2. Cast: one character who holds the misconception, one who knows (the manager, the librarian …), extras as a queue.
3. Chapter by chapter: 误区 (the character's wrong guess, a thought bubble, a red 误区 tag) → 账单 / 对照 (the
   evidence: a receipt, a staircase on the chalk board, a pile vs one object) → the fix in the same scene → 真名 (the real
   thing, term chips landing on the real words) → the closing line (side by side: the analogy and the real term).
4. Every narrated keyword gets an action (a cue, a hop, a stamp, a row unrolled, a chip landing) at `story.at()/phrase()`;
   one `Kit.note` per chapter; mark each line's key span in the caption with `caps.mark`.

## Do / don't

- Do keep one yellow meaning (the key thing / the new one), red = the mistake or the cost, mint = matching / solved.
- Do label every analogy with its real term (`termChip`, a `label` with `sub`, or a tag on the object).
- Do let characters react on words (face, pose, hop, sweat) — never idle wobble; motion comes from entering, reacting,
  writing, unrolling, walking, the camera trucking or pushing in.
- Don't let a bubble, tag or note sit over text you need to read; keep everything clear of the caption band (bottom ≈ 140 px)
  and 64 px from the sides (world-space things shift with the camera — check at the drifted end of a shot).
- Don't cross-fade: boxes are set down and cut, stickers pop; scene changes are camera trucks; the recap is a curtain.
- Text in a box whose border is the text colour (emotes, tags) goes in a span, or the contrast check reads the border as
  the background.
