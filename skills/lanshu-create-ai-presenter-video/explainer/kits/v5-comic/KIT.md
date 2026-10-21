# V5 comic — 波普漫画「爆款」 kit

One animated pop-art comic page. Every idea is a **sticker that slams onto the page**: halftone dots, 5–8 px ink
outlines, hard offset shadows, starbursts, onomatopoeia (POW! ZIP! SNIP! BOOM!), a two-frame impact flash on the
big hits, seeded screen shake, speed lines behind movers, and a **halftone dot wipe** at every chapter seam.
Characters are allowed when they *perform* the idea (the KV film's model has eyes; the newest token grows eyes and
"looks back"), never as decoration.

Reference films: HF Storage (34.5 s, not bundled) and `examples/kv-cache/v5-comic` (45 s).

## Tokens (`kit.css` `:root`)

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` | `#fff6e0` comic paper / `#ffffff` | page / panels, cards, caption box |
| `--kit-ink` / `--kit-muted` | `#141414` / `#5e5850` (6.6:1 on paper) | lettering, outlines / unspoken caption words, dimmed things |
| `--kit-accent` | `#ff4fa3` process pink | THE new / changed / important thing (the newest token, the changed block, the result) |
| `--kit-accent-2` | `#1c7bd1` process blue | structure: stores, the model, V cards |
| `--kit-warn` / `--kit-ok` | `#ff5a36` / `#2fbf5a` | waste, cost, recomputation / solved, gained (sparingly) |
| `--kit-yellow` | `#ffe14d` | stickers, narration boxes, bursts |
| `--kit-font-display` | Bangers | Latin display, numbers, sound words |
| `--kit-font-body` | Noto Sans SC 700 (body, captions) / 900 (labels, titles) | **every CJK word** |
| `--kit-font-mono` | Bangers | comic has no mono: real terms (FP16, KV CACHE) are lettered |
| type scale | display 150 · h1 84 · h2 56 · body 34 · label 32 · note 30 · cap 42 | px at 1080p |

Fonts (`fonts.json` of a film):

```json
{ "index.html": ["noto-sans-sc-700", "noto-sans-sc-900", "bangers"],
  "extra": { "noto-sans-sc-700": {"family": "Noto Sans SC", "css": "Noto+Sans+SC:wght@700", "weight": 700},
             "noto-sans-sc-900": {"family": "Noto Sans SC", "css": "Noto+Sans+SC:wght@900", "weight": 900} } }
```

## API (`window.Kit`, after `lib/core.js` + `lib/story.js`)

Every factory returns `{ el, render(t, …) }`; `render` is a pure function of `t` and its arguments. Position an
element with `el.style.left/top` (all kit pieces are `position: absolute`) and append it where it belongs (world
layer if it should ride the camera, HUD if it is screen-space).

| call | what it draws | render |
| --- | --- | --- |
| `Kit.label({text, sub, tone})` | a sticker; `sub` = real term / unit (Bangers, or Noto if CJK). tone `default`(yellow) `accent` `warn` `ok` `ink` `blue` `white` | `render(t, at, end, o)` slams in at `at`, shrinks out at `end`; `o` = slam options (`s0, r0, r, d, kind`) |
| `Kit.note(text, {tag})` | the yellow narration box with an ink "说明" tag (`tag` overrides: 例 / 注). `\n` forces a line break; lines wrap at phrase boundaries | `render(t, at, end, o)` |
| `Kit.number({value, unit, caption, decimals, prefix, burst})` | a lettered pink figure with ink stroke; `burst: {w,h,seed}` puts a starburst behind | `render(t, u, at, end, o)` — `u` count-up 0..1 (omit to keep `.set(v)`); `.set(v)` takes a number or a string |
| `Kit.bars({rows, width, ease})` | striped gauges; row `{label, value, max, tone, valueText, unit, decimals}` | `render(t, u, at, end, o)` — rows stagger; no `valueText` → value counts with the fill |
| `Kit.formula({terms})` | stickers + lettered operators; term `{text, t, sub, tone, op}`; `× = ≈ + ÷ →` are operators | `render(t, end)` — each term slams at its own `t` |
| `Kit.title(story, {bang, maxWidth})` | the closing line (`story.end`), split after ，：； into boxes (yellow / ink alternating; a short "一句话：" lead becomes an ink tag); `story.end.emphasis` units pink; final 。 → ！; opt-in `maxWidth` shrinks (≥ 60 px) or wraps a row that would be wider | `render(t, end)` — every unit slams in when spoken |
| `Kit.recap(story, {badge, seed})` | ONE splash page: starburst with `recap.center` (+ `tagline` box), numbered point cards around it (3–6 handled), ink links from the burst, a "RECAP!" badge | `render(t)` — slams in from `recap.start`, then a slow push (×1.025) and a slow ray turn; boxes keep 64 px margins |
| `Kit.dressCaptions(caps)` | call once on a `core.Captions`: quarter-em air where Latin / numbers meet CJK (core v2 films can use `Captions({air: 0.22})` instead) | — |
| `Kit.wrapCaptions(caps, {maxWidth})` | opt-in: caption boxes wrap onto balanced lines (`.kit-cap-wrap`, max 1640 px) so a 4–15 s line never leaves the frame; punctuation stays glued to the unit before it | — |
| `Kit.glue(spans, cls, {latin})` | wrap a unit with its trailing punctuation (and Latin runs like "128 GB", unless `latin: false`) in one nowrap inline-block | — |
| `Kit.emWidth(text)` | estimated width in em (CJK 1, Latin ≈ 0.58) for sizing lettering without layout reads | — |

Captions (`.kit-cap`) are white comic boxes, 42 px Noto 700, unspoken words muted, spoken words ink.
The chapter chip (`.kit-chap`) is a yellow tab with an ink number disc, 34 px Noto 900, slammed in via `--in`.

### Motion (pure)

`Kit.slam(t, at, {s0=2.3, r0=-14, r=0, d=0.16, x0, y0})` (power4.in drop, squash, back.out rebound) ·
`Kit.pop(t, at, {s0, r0, r, d})` (back.out grow) · `Kit.rise(t, at, {y0, d})` · `Kit.gone(t, end, d)` ·
`Kit.show(el, t, at, end, o)` writes any of them (`o.kind`) plus an exit, `o.base` keeps a transform prefix.
Each returns `null` before its time so a caller can hide things. No idle motion anywhere.

### Extras

- `Kit.burst(svg, w, h, {n, inner, seed, fill, sw, shadow})`, `Kit.makeBurst(parent, w, h, o)`, `Kit.starPts(...)` — seeded starbursts.
- `Kit.shout(svg, w, h, {seed, tail:[x1,y1,tipx,tipy,x2,y2]})` jagged shout balloon; `Kit.balloon(svg, w, h, {tail:[baseX, tipX, tipY]})` round speech balloon (flip the svg with `scaleY(-1)` for a tail at the top).
- `Kit.sfx(text, {color, size, rot})` → `render(t, at, end, o)` — onomatopoeia (Bangers, or Noto 900 for CJK like 涨!).
- `Kit.Shake(fps)` → `add(t, amp, dur)`, `offset(t)` — seeded, decaying, frame-quantised.
- `Kit.Rays(svg)` → `add(t, x, y)`, `render(t)` — two-frame impact flash (yellow field + ink rays) for the 2–4 biggest hits per film.
- `Kit.Wipe(canvas, [{s, col, c:[x,y], r:[x,y]}])` → `render(t)` — the halftone dot wipe: dots grow from `c` to cover in 0.26 s before `s`, shrink from `r` 0.33 s after. Put one on every chapter seam and on `recap.start`; swap scenes and jump the camera under the full cover.
- `Kit.Speed(svg, n)` → `flush(segs)`, `trail(segs, a, b, u)` — speed lines behind movers.
- CSS: `.kit-page` + `.kit-page-frame` (the panel border), `.kit-dots` + `-pink/-blue/-yellow` (vignetted halftone ground, one colour per chapter), `.kit-panel`, `.kit-halftone-blue/-pink/-paper`, `.kit-box`, `.kit-bang`, `.kit-sfx`, `.kit-wipe`, `.kit-rays`, `.kit-speed`.

## Using it for a new topic

Write `<story>/story.json`, run `tools/sync.sh <film> v5-comic <story>`, copy the page skeleton of
`examples/kv-cache/v5-comic/index.html` (stage → shake → page dots → view (rays + world) → frame → HUD; then chip,
recap layer, wipe canvas, captions, narration + sfx audio). Keep its helpers (`put`, `enter`, a `T` table of
`story.at()/phrase()` times, one camera key list per scene through `core.track`, `sceneAt(t)` switching scenes on
chapter seams under the dot wipe) and replace the five `renderSx(t)` functions with your beats: decide the
protagonist (a token, a block, a file…), give every narrated keyword one slam / pop / hop / scan, one `Kit.note` per
chapter in the space the action leaves free, `Kit.label`s for real terms, `Kit.number` / `Kit.bars` /
`Kit.formula` for any figure, then `Kit.title(story)` for the closing line and `Kit.recap(story)` — both are
data-driven and re-time themselves. Copy `tools/sfx.py`: it parses `lib/story.js` with the same `at/phrase`
helpers, so the bed (stamp = thump + snap, boing + pop for things that appear, whoosh / zip for movers, zap,
slide whistle, swell under the recap, `lift_after=(recap.start, 8)`) follows the new narration.

## Starter (any topic, no scene code yet)

`kits/v5-comic/starter/` is this style minus the topic: `tools/new_film.sh v5-comic <story> <project>` gives a playable film —
one comic page per chapter, one panel per narration line (a draft beat: beat note, key phrase lettered word by word in
a shout balloon, real terms as stickers, a 「待演绎」 tag), camera whips panel to panel and cuts page to page under
the dot wipe, captions / chip / closing splash / recap / sound bed all from the story. Scene authors write only
`beats.js`; see `starter/STARTER.md` for the api and idioms.

## Do / don't

- **Do** slam every sticker on its word (`story.at`), land movers with a squash, shake only on real impacts
  (≤ 14 px, ≤ 0.32 s), and keep one pink thing per beat — the new / changed / important one.
- **Do** use Noto Sans SC for every CJK word (captions 42 px, labels ≥ 32 px, notes 28–30 px); Bangers only for
  Latin display, numbers and sound words. Break notes with `\n` at phrase boundaries.
- **Do** fill the frame: if half the page is empty, park the chapter note, a counter, a gauge or a legend there.
- **Don't** let a sticker cover a label you need to read (the HF "5%?!" burst still clips the file name — texture only).
- **Don't** wobble, breathe or loop anything; a caused swing (a tag hung on a file, a balance settling) decays and stops.
- **Don't** fade between scenes — the dot wipe is the only transition; the camera carries the eye inside a scene.
- **Don't** invent figures: weights / bars without numbers are fine as illustration, numbers come from the story's facts.
- Containers that hold explicitly-shown children must be hidden with `display: none` (a parent's `visibility:
  hidden` does not hide a child set to `visible`) — the recap and the page under it do this.

## Review round (HF Storage film, Oct 2026)

Audit of the 30 s film against the baseline and KITS.md §3, with the fix applied:

| finding (before) | after |
| --- | --- |
| CJK lettered in ZCOOL QingKe HuangYou (condensed): captions, chips, boxes squeezed and hard to read | all CJK in Noto Sans SC 700/900; Bangers kept for Latin display, numbers and SFX |
| 7 static caption boxes (sentence appears whole) | `core.Captions` word-timed (unspoken muted → spoken ink), 42 px, Latin/CJK spacing; lines 2+3 and 4+5 share a box |
| act chips: own wording, 32 px condensed | `core.Chapters` from the story (问题 / 方法 / 价格 / 架构 / 持久), 34 px Noto 900, gone during the closing line |
| no plain-language note per chapter | five `Kit.note`s parked in the empty space (bottom-left, the gap between store and file) |
| dead space: centre gap at 6.4 s, bottom-left at 3.7 s, right half at 19 s | filled by the chapter notes |
| bars custom, both pink | `Kit.bars`: 整份重传 in warn (waste), 只上传变化的块 in accent |
| closing line = two static boxes | `Kit.title(story)` — word-timed slams, 一处 / 自由 / 流动 emphasised |
| no recap, film ended at 30 s on the title | `Kit.recap` 30.0–34.5 s behind a pink dot wipe; all clips / drive 34.5 s; narration still 30 s |
| no sound bed | `tools/sfx.py` → `assets/audio/sfx.wav` (34.5 s), ~25 dB under the voice, recap lifted 8 dB |
| shapes, shake, rays, wipe, speed lines inlined | the same code now lives in the kit (`Kit.burst/shout/Shake/Rays/Wipe/Speed`) and the film calls it |
