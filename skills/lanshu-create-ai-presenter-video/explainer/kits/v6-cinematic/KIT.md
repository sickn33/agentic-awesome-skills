# V6 cinematic — kit

A Three.js **one-take** in a graphite studio: porcelain props on a reflective floor, one emissive accent, bloom + shallow
focus, a camera that never cuts (monotone Hermite through keyframes), and HTML type projected from 3D points. The
explanation happens *in the world* — things are printed, stacked, poured, split and shrunk — and the overlay only names
what you are looking at.

Proven on two topics: HF Storage (34.5 s, not bundled) and `examples/kv-cache/v6-cinematic` (45 s).

## Files

| file | what |
| --- | --- |
| `kit.css` | tokens + every component style (captions, chip, progress, label, note, number, bars, formula, title, recap) |
| `kit.js` | `window.Kit` — the HTML components + `Kit.studio()` (the 3D world) |
| `grain.svg` | static film grain used by `.kit-grain` |

Load order in a film: `lib/core.js`, `lib/story.js`, `lib/kit/kit.js` (classic scripts), then the film's
`<script type="module">` that imports `three` and the addons and calls `Kit.studio()`. Link `lib/kit/kit.css`.
Fonts (written into `index.html` by `tools/fonts.py`, `fonts.json` lists them): Noto Sans SC 300/500, Geist 300/500,
Geist Mono 400.

## Tokens

| token | value | meaning |
| --- | --- | --- |
| `--kit-bg` / `--kit-surface` | `#0c0d11` / `rgba(18,19,25,.78)` | studio black (never flat: the 3D cove has a horizon glow) / glass panels |
| `--kit-ink` / `--kit-muted` | `#f6f5f1` / `#bdbcb6` | text / secondary text (≈ 9 : 1 on bg) |
| `--kit-accent` | `#ffd21e` | **the new / changed / computed-right-now thing** (HF yellow). One meaning per film, never decoration |
| `--kit-accent-2` | `#8fc6ff` | cool rim light: matching, links, queries, attention |
| `--kit-warn` | `#ff6b4a` | ember: waste, cost, memory spent |
| `--kit-ok` | `#6fe3b0` | solved / included / saved |
| type scale | display 132 · h1 92 · h2 60 · body 34 · label 36 · note 31 · cap 44 px | at 1080p |

The same palette is available in 3D as `S.col.{accent, accent2, warn, ok, porc, graph, ink}`.

## Overlay components (contract)

Every factory returns `{ el, render(t, …), presence(t, o), at(x, y, ax, ay, o, scale) }`; append `el` to a layer.

| call | look | notes |
| --- | --- | --- |
| `Kit.captions(container, story, opts)` | 44 px / 500, spoken words white with a soft glow, unspoken 60 %, dark scrim band | wraps `core.Captions`; skips `story.end.line` (the title performs it); Latin units touching CJK get breathing room; `wrap: true` (opt-in) lets a line too long for one row wrap into balanced rows (`.kit-cap.is-wrap`) |
| `new ExplainerCore.Chapters(el, story)` | `01` mono accent 28 px + title 32 px | styled by `.kit-chap` |
| `Kit.progress(story)` | chapter hairline at the top | extra |
| `Kit.label({ text, sub, tone, size, big, mark })` | 36 px term + 26 px mono sub; `big:true` = Geist 300 numerals (`×1`, `÷4`, `2 GB`) with a 36 px sub | tones: `default` (rule mark) · `ink` · `accent` · `warn` · `ok` · `cool` |
| `Kit.note(html, { slot, tag })` | boxed `说明` tag + 31 px line under the chip (`slot:"top"`) | `<b>` accents one phrase; `Kit.note.window(t, a, b)`; `note.rect()` → a keep-out box |
| `Kit.number({ value, unit, caption, decimals, tone, size })` | Geist 300 display numerals | `render(t, u, o)` count-up, or `.set(v)` (number or string) |
| `Kit.bars({ rows, width })` | glass panel, glowing tone fills | `render(t, u, o)`, `u` may be an array (one progress per row) |
| `Kit.formula({ terms, size })` | big numerals, muted operators, a sub-caption per term | each term `{ text, t, sub, tone }` rises at its own story time |
| `Kit.title(story, { left, bottom, top, size })` | 92 px light + accent emphasis, word-timed | lines break after `：，；`; a short first segment ending in `：` becomes a small lead-in |
| `Kit.recap(story, opts)` | ONE frame: centre title in a hairline ellipse, points around it with leaders | 2–6 points; title shrinks to fit; cards never overlap the title; slow push; the 3D world keeps drifting behind the scrim |

## `Kit.studio()` — the world (extra)

```js
const S = Kit.studio({ THREE, addons: { RoomEnvironment, EffectComposer, RenderPass, UnrealBloomPass, BokehPass, OutputPass, Reflector },
                       canvas, exposure: 1.0, fog: [48, 150] });
```

Returns `{ scene, camera, renderer, composer, bokeh, bloom, light, col, mat, sprite, surface, shoot, screen, place, keepOut, pool, render }`:

- the cove (screen-space graphite gradient with a horizon band, fog matched to it), a Reflector floor under an 80 % floor
  plane, key / rim / fill / hemi light, ACES at exposure 1.0, RenderPass → Bokeh → UnrealBloom (threshold 1.1) → Output on
  a 4× MSAA half-float target;
- `S.mat.porcelain() / accent(k) / graphite() / metal() / glass() / glow(color, o) / edge()`; `S.sprite` (soft dot);
- `S.surface(cw, ch, w, h, paint)` — canvas text living in 3D (draw it after the fonts load);
- `S.pool(x, z, r, o)` — a soft light pool on the floor: fills an empty floor without flattening the mood;
- `S.shoot(t, CAM, TGT, APT)` — camera from `[[t, x, y, z]…]` tracks via `core.track`, **calls `camera.updateMatrixWorld()`**,
  sets bokeh focus to the target distance and aperture from `APT`;
- `S.place(item, worldPos, o, { t, ax, ay, dx, dy, leader })` — pins any kit component to a world point with safe-area
  fades (64 px sides, chip strip, caption band) and the keep-out boxes from `S.keepOut(t, boxes)` (e.g. visible notes);
- `S.render()`.

## Using it for a new topic

**Start from the starter:** `tools/new_film.sh v6-cinematic <story> <project>` copies `kits/v6-cinematic/starter/` (the studio, one
station per chapter, the one-take camera, captions / chip / progress / closing line / recap, the sound bed, and a
placeholder beat per line), so a new film only needs its `beats.js` — see `starter/STARTER.md`. The steps below are
what the starter already does, for building a film by hand.


1. `bash tools/sync.sh <film> v6-cinematic <story>`; copy `index.html` skeleton from `examples/kv-cache/v6-cinematic`
   (DOM layers: `#stage` canvas + vignette/grain/shade + `#labels`; `#hud` chip + `#notes` + `#panels`; `#caps`; `#end`).
2. Write `T = { … story.at() / story.phrase() … }` — every beat time from the narration.
3. Build the protagonists out of porcelain (`S.mat.porcelain`, RoundedBox) and give each colour its one meaning.
4. Choreograph in one `renderAt(t)` (pure function of t): appear / move / split / shrink at `T.*` times; camera keys on
   `T.*` too (the camera carries the eye between beats — no cuts, no crossfades).
5. Pin labels with `S.place`, put screen-fixed panels (bars / formula / badges) in `#panels`, one `Kit.note` per beat or
   chapter, `Kit.captions`, `Chapters`, `Kit.progress`, `Kit.title`, `Kit.recap`.
6. `tools/sfx.py` from `lib/sfxlib.py`, reading `lib/story.js` for times (both films have one to copy).
7. `python3 tools/fonts.py <film>`, `hyperframes check`, snapshots.

## Do / don't

- Do frame the subject; the lifted cove + light pools keep empty floor from going black, but a wide shot with one small
  object is still dead space. Use the projection of key points to plan framing before snapshotting.
- Do keep hot (accent) props readable: colour them toward the accent with modest emission (≈ 0.3) — full emission blooms
  the text away.
- Do keep the title band clear: if the world sits mid-frame, use `Kit.title(story, { top: 112 })`.
- Don't put meaning in text smaller than 28 px (labels) / 24 px (notes); 3D canvas text should project ≥ ~28 px tall.
- Don't use the accent for decoration, and don't introduce a second meaning for a colour mid-film.
- Don't let an odometer show an empty / leading-zero column (roll 10 → 12, not 0 → 12).

## Gotchas

- `core.E` has no `o4` / `i3` / `back(u, s)` — films add them locally (`Object.assign({}, ExplainerCore.E, {...})`).
- Canvas surfaces must be drawn after `document.fonts.load(...)` resolves (do it inside `window.__hf.buildReady`).
- `alphaMap` reads the **green** channel — paint grey gradients, not white-with-alpha.
- Glass with clearcoat throws a bloomed specular blob under the key light: keep `clearcoat: 0`, `specularIntensity` low.
- Root needs `data-no-timeline` + `data-duration`; heavy setup goes in `window.__hf.buildReady`; render on `hf-seek`.
