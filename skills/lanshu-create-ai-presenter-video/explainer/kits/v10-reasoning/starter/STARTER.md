# V10 · 推演 — starter

`tools/new_film.sh v10-reasoning <story> <project>` copies this folder and gives you a playable film of any story: one
dot-grid canvas, a derivation station per chapter, the glide camera, captions, the chapter chip, the closing statement
over the whole canvas pulled back, the recap and a sound bed. Every narration line gets a placeholder. You only write
`beats.js`.

## What the starter draws (index.html, all from `window.STORY`)

- **Stations.** One 1920×1080 region per chapter on one infinite canvas, laid out as a snake grid sized from the
  chapter count: ≤ 3 → one row, 4 → 2×2, 5–6 → 3×2, 7–8 → 4×2 (more → 2+ rows), pitch 2300 × 1420 px. Each station
  writes its **statement** at the top (the chapter title after 「：」, Noto Serif SC 900, centred at y 140, ≤ 1300 px)
  while the camera is on its way. Its lines get **slots** in the area x 120–1800, y 262–852: ≤ 3 lines stack in one
  column, 4–5 lines take two columns (reading order row by row).
- **⇒ arrows.** A rose arrow from each station to the next draws while the camera glides along it; after the
  narration a dot runs every arrow, so the pulled-back canvas reads as one chain.
- **Camera.** Lands 0.15 s before a station's first line, drifts toward the slot being spoken with a slow push
  (scale 1.0 → ~1.04), leaves on the station's last spoken unit (≥ 0.7 s before the next one) and glides at scale 0.78.
  For the closing line it pulls back to the whole canvas under `Kit.title`; for the recap it glides the canvas into
  the recap's picture zone, and the whole stage then pushes in at a constant speed (1 → 1.045) so the last frames
  never settle. No `end` → the pull-back starts after the last line;
  no `recap` → the film ends on the whole canvas.
- **Placeholder** (`api.placeholder(i)`): a derivation step waiting to be performed — its number `(k)` in math italic,
  the beat note (`story.notes[chapterKey][j]`, else the line's key phrase) written as the line starts, a construction
  axis over the line's own time with a dot per phrase (arcs link step to step, a rose pen runs while it is spoken),
  the phrases as terms lit as they are spoken (the current one rose), and a dashed 「待演绎 Ln」 tag.
- **Chrome.** `Kit.captions` (keys via `api.keys`), `Kit.chapters`, the closing statement, `Kit.recap` (with the
  canvas as its picture; when there is one recap point per chapter each point frames its station), a
  「草稿 · 无配音」 tag top-right when `story.draft`.

## The `api` passed to `window.Beats(api)`

| field | what |
| --- | --- |
| `story`, `C`, `Kit`, `T`, `U` | `ExplainerCore.Story`, `ExplainerCore`, the kit, `Kit.tokens` (`T.q`, `T.k`, `T.v`, `T.warn` …), `Kit.util` |
| `station(k)`, `stations` | chapter k (1-based) → `{ k, n, key, title, lines, el, svg, x, y, w, h, arrive, leave, show, header }`. `el` / `svg` are the station's HTML and SVG layers in station-local px (1920×1080); `x, y` its world origin; `header` the statement (`header.el.style.display = "none"` to replace it) |
| `slot(i)` | line i → `{ line, station, k, rect: { x, y, w, h }, appear }` (station-local) |
| `placeholder(i, { note })` | the draft beat for line i → `{ render(t), rect, axis }` |
| `world` | `{ el, svg, w, h }` — `svg` is a world-px layer above every station: draw things that travel between stations here |
| `focus(a, b, { station, x, y, s, rot, amt, drift, ease })` | lean the camera to a spot (station-local x, y; world px without `station`) between a and b, with a slow push while it holds |
| `add(fn)` | register a per-frame `fn(t)` |
| `keys(line, [phrase \| { text, tone }])` | paint caption phrases in their binding colour (`captions` is the object) |
| `at`, `ph`, `span` | `story.at(line, unit, n)`, `story.phrase(line, text)`, `story.span(line, text)` |
| `put, txt, cls, label, note, stmt` | helpers: `label / note / stmt(parent, x, y, …, a)` register their own render |
| `camera`, `camAt(t)`, `layers` | `Kit.camera` (keys, `screen()`), the camera values with focus applied, `{ world, stations, wsvg, fx, caps, endwrap, recapwrap }` |

`Beats(api)` runs once, after the world is built. Return `{ render(t) }` (called every frame, pure in `t`). To perform
a line, stop calling `placeholder(i)` for it and build its figure in the station — the slots are only the draft layout.

## Idioms (from `examples/kv-cache/v10-reasoning`)

```js
const { story, Kit, C, U, T } = api, { E, pr } = C, S1 = api.station(1), at = api.at, ph = api.ph;
// 1 · the colour-bound formula, built term by term as each symbol is spoken; leaders in each term's colour
S1.header.el.style.display = "none";
const F = Kit.formula({ size: 72, drop: 50, terms: [
  { text: "out", t: at(1, "v") + 0.35 }, { text: " = ", up: true, t: at(1, "v") + 0.4 },
  { text: "q", tone: "q", t: at(1, "q"), label: "新 token 的提问", pulse: [ph(1, "比一比")] },
  { text: " · ", up: true, t: ph(1, "比一比") },
  { text: "k", sub: "i", tone: "k", t: at(1, "k"), label: "拿来匹配" },
] }).center(960, 92);
S1.el.appendChild(F.el);
api.add((t) => F.render(t));
api.keys(1, [{ text: "q", tone: "q" }, { text: "k", tone: "k" }]);        // the caption wears the same colours

// 2 · a lattice that grows row by row: dashed construction first, then computed (rose) / recomputed (vermilion ↻)
const S2 = api.station(2), tri = Kit.dots(S2.svg, { x: 360, y: 262, n: 8, pitch: 60, r: 12, shape: "tri" });
const dotAt = (r, c) => at(3, "第", 1) + 0.35 * r + 0.03 * c;           // from the words that name each step
api.add((t) => tri.rows.forEach((row, r) => row.forEach((d, c) => {
  const a = dotAt(r, c);
  if (t < a) return tri.paint(d, { s: t >= S2.show + 0.3 ? 0.75 : 0, ring: "muted", ringA: 0.55, dash: true });
  const g = E.back(pr(t, a, 0.3));
  tri.paint(d, c === r ? { s: g, fill: "q", glow: 0.3 } : { s: g, ring: "warn", arc: 1, fill: "warn", fillA: 0.12 });
})));

// 3 · morph across stations: a dot flies from one station's figure into the next (world px), the camera follows
const S3 = api.station(3), W = api.world.svg, tFly = at(5, "一");
const p = U.svg("path", { d: `M ${S2.x + 360} ${S2.y + 262} C ${S2.x + 420} ${S2.y + 780} ${S3.x + 580} ${S3.y - 300} ${S3.x + 615} ${S3.y + 291}`, fill: "none" }, W);
const dot = U.svg("circle", { r: 11, fill: T.k }, W), len = p.getTotalLength();
api.add((t) => { const u = E.io2(pr(t, tFly, 0.8)), q = p.getPointAtLength(u * len); U.attr(dot, "cx", q.x); U.attr(dot, "cy", q.y); U.vis(dot, t >= tFly && u < 1 ? 1 : 0); });
api.focus(S2.leave - 0.3, tFly + 0.95, { station: S2, x: 760, y: 520, s: 0.92, ease: 0.9 }); // hold on the source, glide down with it

// 4 · a result on a plot: points at (n, n) fall to y = 1 when 「变成」 is spoken; a statement + its cost
const S4 = api.station(4), PA = Kit.plot(S4.svg, { x: 170, y: 300, w: 480, h: 330, xMax: 8.6, yMax: 8.6, xTicks: [1, 2, 3, 4, 5, 6, 7, 8], yLabel: "这一步要算几份 k、v" });
api.add((t) => PA.render(t, at(7, "每")));
const pts = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => U.svg("circle", { r: 8, fill: T.warn }, PA.layer));
api.add((t) => pts.forEach((d, j) => { const n = j + 1, u = E.i2(pr(t, ph(7, "变成") + 0.05 * j, 0.45));
  U.attr(d, "cx", PA.px(n)); U.attr(d, "cy", C.lerp(PA.py(n), PA.py(1), u)); U.vis(d, t >= ph(7, "从算") ? 1 : 0); }));
api.label(S4.el, 190, 300, { text: "不缓存：第 $n$ 步算 $n$ 份", tone: "warn" }, at(7, "n"));
api.note(S4.el, 170, 760, "不再重算，代价是缓存一直占着显存", at(7, "缓"));
```

Rules of the style still apply (KIT.md): one colour per bound symbol (rose = new / derived, teal / amber = the two
bound things, vermilion = waste / cost); every keyword builds or transforms geometry; one 说明 per chapter; illustrative
values carry 「示意」; labels ≥ 28 px at the scale they are shown; station content above y ≈ 860 (the caption band).

## Sound

`bash tools/sfx.sh` rebuilds `assets/audio/sfx.wav` from `lib/story.js`. It mirrors the driver's stations and glide
windows: air and a soft rising fifth along each ⇒ arrow, a tink and a warm low tone on landing, a faint pen stroke for
each statement, a blip per line and a tick per placeholder phrase, a swell + shimmer + ∎ chime for the closing line,
and a lifted recap. When you perform the lines, set `PERFORMED = True` (no placeholder ticks) and add your beats'
sounds under the marked line with `at()` / `ph()` helpers that mirror `story.at` / `story.phrase` (the KV film's
`tools/sfx.py` is the worked example). After any text change run `python3 <skill>/explainer/tools/fonts.py .`; it also
scans `beats.js`.
