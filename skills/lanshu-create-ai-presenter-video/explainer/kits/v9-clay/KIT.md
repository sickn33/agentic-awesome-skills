# v9-clay — 黏土小城 kit

An isometric **plasticine diorama** in Three.js: one small town on a three-layer cream base, filmed in one take by an
orthographic iso camera. Every concept is an **everyday analogy labelled with its real term** (比喻 → 真名: 「卡片柜 = KV cache」),
the hero objects have kawaii faces, labels are stickers in 站酷快乐体, everything lands with a squash, and the film ends on the
whole town with numbered cards pinned to its districts. Reference films: HF Storage (not bundled,
34.5 s) and `examples/kv-cache/v9-clay` (KV cache, 45 s).

Files: `kit.css` (tokens + every sticker component), `kit.js` (`window.Kit`, DOM components + `Kit.clay` 3D toolkit + `Kit.boot`).

## Tokens (`:root` in kit.css)

| token | value | use |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` / `--kit-paper` | `#fbeee0` / `#fff` / `#fffaf3` | page / sticker / caption & chip & note pill |
| `--kit-rim` | `#ffe4c8` | the 4 px peach sticker outline |
| `--kit-ink` / `--kit-muted` | `#4a3a31` (10.4:1) / `#6b5a50` (6.6:1) | cocoa text, never black / secondary text |
| `--kit-term` | `#5a6678` (5.8:1) | the real term, in mono |
| `--kit-cap-dim` | `#957f71` (3.6:1, large text) | caption words not yet spoken |
| `--kit-accent` | `#ffd23f` | THE accent — the new / changed / important thing (fills and highlighter only; text on it is ink) |
| `--kit-accent-2` | `#8fc8ff` | sky clay (second colour; V cards, questions) |
| `--kit-warn` / `--kit-warn-text` | `#d94436` / `#c2412f` | waste / cost (white on warn 4.35:1) |
| `--kit-ok` / `--kit-mint` | `#0b8a5d` / `#bfeed5` | solved / included |
| fonts | 得意黑 Smiley Sans (display: closing line, numbers, chip bead) · 站酷快乐体 ZCOOL KuaiLe (`--kit-font-hand`: stickers, chip title, card heads) · Noto Sans SC 500/800 (body: captions, notes, rows) · Geist Mono 500 (the real term) | |
| type scale | cap 42 · label 34 · note / sub 28 · body 30 · h2 40 · h1 64 · display 88 · hero 150 | ≤ 3 sizes on screen: 42 / 34 / 28 |

Project `fonts.json`: `["smiley-sans", "zcool-kuaile", "noto-sans-sc-500", "noto-sans-sc-800", "geist-mono-500"]` with the
three Google extras (see either reference film). Run `tools/fonts.py` after any text change — it also scans `lib/**/*.js`, so
story text and kit strings are covered; canvas textures need their characters somewhere in `index.html` (e.g. a token array).

## API (`window.Kit`)

All overlays are HTML stickers moved by a transform. Factories take a `win: [a, b]` (fade in/out, a soft back-eased pop),
placement `x, y, ax, ay, dx, dy`, and return `{ el, live(t), render(t, …, x, y) }`. Pass the screen point of a 3D anchor to
`render` every frame (`C.toScreen(worldPoint)`), or give fixed `x, y` in the options. While an anchor is on screen the sticker
is clamped into `Kit.safe` (64 px sides, clear of the chip / notes band at the top and the caption band at the bottom); an
anchor the camera has left takes its sticker with it.

| call | what it draws |
| --- | --- |
| `Kit.layer = el` | default parent for new overlays |
| `Kit.captions(container, story)` | `core.Captions` for every line except the closing line; Latin words get air next to CJK |
| `Kit.chapters(el, story)` | `core.Chapters` styled as a clay chip (yellow bead + sticker title) |
| `Kit.label({ text, sub, tone, icon, stem, size, win, … })` | the analogy sticker + real term in mono. `tone`: default / accent / warn / ok / ink / sky; `icon`: dot / tick; `stem`: true (stick down to the anchor) / "up"; `size: "sm"` |
| `Kit.note(text, { key, win, x, y, clamp })` | one plain-language line on a paper slip with a yellow 「说明」 bead; top-right by default, or pinned to the scene |
| `Kit.number({ value, unit, caption, decimals, prefix, size: "md", tone, plaque, win })` | 得意黑 hero figure on a highlighter stroke; `render(t, u)` counts `value × u`, or `.set(v)` (number or string like `"3K"`) + `render(t)` |
| `Kit.bars({ title, rows: [{ label, value, max, tone, valueText }], win })` | a clay meter card; `render(t, u)` with `u` a number or one per row |
| `Kit.formula({ terms: [{ text, sub, t, tone, op }], win })` | clay tiles joined by operators; each term pops at its spoken time and the strip grows rightwards |
| `Kit.title(story, { top, until })` | the word-timed closing line (from `story.end`), emphasis on a yellow highlighter, each word lands with a squash; soft paper halo for legibility over the town |
| `Kit.recap(story, { analogies, tagline, stagger })` | ONE composed frame: the centre sticker (`recap.center`, + tagline unless `tagline:false`) and one numbered card per point, titled 「问题：重算台阶」 (story title + analogy). `render(t, { center: {x,y}, points: [{x,y,ax,ay}] })` — project a world anchor per district every frame so the cards ride the camera's slow pull |
| `Kit.sticker(html, opts)` / `Kit.card(html, opts)` | any one-off panel on a sticker / white clay plaque (`.kit-card`, `.kit-card-hd`, `.kit-card-row`) |
| `Kit.boot(id, renderAt, { story, text, afterFonts })` | HyperFrames `three` adapter: loads the five faces for the story text, calls `afterFonts` (redraw canvas textures), renders, then renders on every `hf-seek` |
| `Kit.keyPhrase(story, i, { max })` | indices into `story.line(i).words` of the line's key phrase: the clause (cut at ，。；：！？) scoring highest on Latin words / numbers, last-clause bonus and length, minus a leading connective and trailing particles. Pure (no DOM): the starter's draft beats and its sound plan (Node) both use it |

A new topic starts from `starter/` (`tools/new_film.sh v9-clay <story> <project>`). See `starter/STARTER.md` for the town layout, the `api`
passed to `beats.js` and the idioms.

### Extras — `Kit.clay(THREE, addons, opts)`

`const C = Kit.clay(THREE, { RoundedBoxGeometry, EffectComposer, RenderPass, GTAOPass, OutputPass }, { canvas })` builds the
stage and returns the makers:

- **stage**: `renderer` (Neutral tone mapping), `scene` (peach→lilac sky), ortho `camera`, `sun` (VSM soft shadows, radius 9),
  `composer` with **GTAO** contact shading; `C.render()`. Options: `sky`, `sunPos`, `sunTarget`, `shadowExtent`, `exposure`, `palette`.
- **clay**: `C.M(color, overrides)` (MeshPhysical, roughness .7, velvet sheen, thumb-pressed bump), `C.clayMap(texture)` (a painted
  clay side with a free emissive for glows), `C.rbox(w, h, d)` (corners ≈ ¼ of the shortest side), `C.mesh(geo, mat, x, y, z, parent, cast)`,
  `C.slab(...)` pads, `C.diorama(cx, cz, w, d)` the three-layer cream base, `C.tree(x, z, s)` lollipop trees, `C.P` the pastel palette.
- **faces**: `C.boxTexture(base, tape, face)`, `C.textTexture(base, word, { face, size, w, h })`, `C.paintFace(ctx, face, cx, cy, s)`
  with faces `open | happy | tired | lookL | lookR`; `C.eyes(parent, x, y, dz, s, rotY)` big 3D eyes + blush; `C.dotFace(parent, y, z, spread, s)`;
  `C.redraw()` repaints text textures once fonts are in.
- **motion**: `C.squash(mesh, t, land, amt)` landing squash, `C.hop(a, b, u, h)` parabolic hops, `C.bez`, `C.polyAt / polyLen`
  (belts), `C.puffs(parent, x, y, z)` chimney clouds, `C.poof(parent)` a vanishing burst.
- **camera**: `C.setIso(keys, t)` with keys `[t, x, y, z, frustumWidth, azimuthDeg]` through `core.track` (calls
  `camera.updateMatrixWorld()` so labels project with this frame's camera), `C.toScreen(v)`.
- **see-through props**: `C.noAO(...meshes)` hides glass / light cones from the GTAO pass; `C.noShadow(...meshes)` stops them casting
  **and receiving** (with VSM, three.js draws every *receiving* mesh into the shadow map, so `castShadow = false` alone still throws
  shadows — that is what turned the cabinet crown olive behind the glass case).

## Using it for a new topic

1. `bash tools/sync.sh <film> v9-clay <story>`; copy `fonts.json`; load `lib/core.js`, `lib/story.js`, `lib/kit/kit.js` and link
   `lib/kit/kit.css`; root `data-no-timeline` + `data-duration`, one `.clip` stage holding `<canvas id="gl">`, a `#labels` layer,
   `#caps` and `#chap`.
2. Write the analogy table first (比喻 → 真名, one row per narrated keyword) and lay the town out as **districts**, one per chapter,
   so the recap can pin one card on each. Text-bearing props (tiles, drawers, signs) turn to face the camera azimuth.
3. Take every beat time from `story.at / story.phrase` (`const T = { … }` at the top), build the props with `Kit.clay`, and write
   `renderAt(t)` as a pure function of t. Keep a small `stick(widget, worldAnchorFn)` list for the stickers.
4. Captions / chip / closing line / recap from the kit; one `Kit.note` per chapter (more where a step needs a plain sentence).
5. `tools/sfx.py` on `lib/sfxlib.py` reading the same times from `lib/story.js` (pops, plops, ticks, whooshes, a swell for the
   close, a lifted review). `check`, then snapshot every beat **and** pairs 0.4 s apart in quiet stretches.

## Do / don't

- Do label every analogy with its real term; facts only from the narration / `story.json → facts`.
- Do keep one accent meaning: yellow = the new / the one that matters; red = waste / cost; mint = solved.
- Do keep the camera moving with intent: phantom keys before t=0 and after the end, monotonic slow pushes through explanation
  holds, and avoid keys where every axis reverses between two slow segments (Hermite stops there). Measure: no 0.4 s window
  without ≥ 2–3 px of frame-wide motion.
- Do frame below the title band during the closing (the closing line sits at the top) and keep labels off the focal prop —
  anchor them below the row, beside the stack, or above it with a stem.
- Don't let a sticker sit on a moving focal object; don't park overlays over the caption band; don't use pure black.
- Don't add idle wobble (bobbing, breathing). Motion comes from things landing, growing, flying, scanning, and the camera.
- Don't stack a prop on top of a face that must stay on top (grow sections in place under a crown instead of dropping them through it).
