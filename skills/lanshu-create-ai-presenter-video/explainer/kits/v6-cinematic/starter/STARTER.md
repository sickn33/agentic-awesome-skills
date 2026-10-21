# V6 cinematic — starter

`tools/new_film.sh v6-cinematic <story> <project>` → a playable one-take film for any story. You write only `beats.js`.

## What the starter draws (index.html, driven only by `window.STORY`)

- **The studio** (`Kit.studio()`): graphite cove, mirror floor, key / rim / fill, bokeh + bloom, one warm accent light
  that follows whatever is hottest this frame (`api.hot`).
- **One station per chapter** on +x: station k (0-based, `story.chapters[k]`) has its origin at `(k · 20, 0, 0)`, a
  floor light pool, and a `THREE.Group` to build in. A chapter's content centres on y ≈ 5.8 and fits in ~16 × 7 units.
- **The camera** (one take, monotone Hermite through `core.track`): leaves 0.4 s before `story.chapters[k].start`,
  arrives 0.75 s after it, and inside a station trucks right + pushes in slowly (never parks). Each framing segment
  (`st.fit(box, a, b)`, which every placeholder registers) sets distance and height for its stretch, so the camera
  re-frames as each beat begins. Closing line: pulls back so the last chapter's exhibit sits lower-right and
  `Kit.title` owns the dark top-left; the stations' floor pools flare first → last. Recap: crane up over the row behind
  `Kit.recap`'s scrim, constant speed to the last frame.
- **Chrome**: `Kit.captions` (`wrap`, `clamp`; no box for the closing line), chapter chip, progress hairline,
  `Kit.title` (shrinks if too wide), `Kit.recap`; no `end` / `recap` → none, the film runs to `story.duration`.
  `story.draft` → a 「草稿 · 无配音」 tag top-right.
- **Placeholders** (`api.placeholder(i)`): a metal plaque rises with the beat note (`story.notes[chapter.key][j]` for
  the chapter's j-th line, else the line's longest clause; one or two fitted lines), and every spoken unit is printed
  out of the plaque as a porcelain tile, hot yellow while it is spoken, landing in balanced rows. The chapter's next
  line pushes it back into the dark; a chapter's last line stays. A small 「L3 待演绎」 tag rides the plaque.
- **Sound** (`tools/sfx.sh` → `tools/sfx.py`): room, opening swell, a whoosh per station move + a hit and a swell on
  arrival, a thump + blip per plaque, a porcelain tick per spoken unit, a whoosh + swell under the closing line with a
  shimmer on each emphasis, a chime + ticks + lift for the recap. Add a performed line's number to `PERFORMED` to drop its
  placeholder sounds, and place the scene's own sounds at the bottom.

## The api passed to `window.Beats(api)`

| key | what |
| --- | --- |
| `story`, `C`, `Kit`, `E`, `pulse`, `V`, `hash`, `track` | the Story, ExplainerCore, the kit, eases (+ `E.back(u, s)`), `pulse(t, a, d)`, `V(x, y, z)` |
| `THREE`, `RoundedBoxGeometry`, `S`, `scene`, `camera`, `col`, `mat` | three, the studio (`S.place`, `S.screen`, `S.pool`, `S.surface` …), palette `col.{accent, accent2, warn, ok, porc}`, materials `mat.{porcelain, accent, metal, graphite, glass, glow}` |
| `stations`, `station(k)`, `stationOf(line)` | `{ k, n, chapter, key, title, origin, group, lines, start, end, arrive, depart, at(x, y, z), fit(box, a?, b?), box, segs, pool }` — `k` is 0-based; `at()` gives world points from station-local ones |
| `placeholder(line)` | the draft beat above → `{ render(t), group, tiles, box, head }` |
| `pin(item, at, win, opts)` | a kit component pinned to a world point every frame: `at` Vector3 or `(t) => Vector3`, `win` `[a, b]` or `(t) => o`, `opts` `{ ax, ay, dx, dy, fi, fo }` (safe-area + note keep-out handled) |
| `panel(item, x, y, ax, ay, win)` | a screen-fixed component (bars, formula, badge) |
| `note(html, a, b, opts)` | one `Kit.note` under the chip from a to b (`<b>` = the accented phrase) |
| `shot(t, pos, tgt, apt?)`, `own(a, b)`, `frame(st, u, box?)` | camera: add a key; drop the driver's keys in [a, b]; a station's default shot at progress u |
| `text(str, w, h, opts)`, `grow(tube, u)`, `hot(v, worldPos)` | canvas text in 3D (drawn at once — fonts are loaded), grow a TubeGeometry, feed the accent light |
| `layers`, `GAP`, `CY` | `{ labels, panels, notes }` DOM layers; station spacing; placeholder centre height |

Order each frame: camera (`S.shoot`) → `beats.render(t)` → pins / panels / notes → chrome → `S.render()`.
`window.__v6` (console) exposes `api`, `renderAt(t)`, `CAM`, `TGT` for debugging.

## Idioms (from the KV film)

All inside `window.Beats = function (api) { const { story, C, E, THREE, Kit, V } = api; … }`.

**Print a porcelain thing at a word** (tokens out of the head): born at the word, drops in with a little overshoot,
hot yellow that cools.

```js
const st = api.station(0), te = story.at(1, "token");
const tok = new THREE.Mesh(new api.RoundedBoxGeometry(2.0, 1.2, 0.42, 3, 0.1), api.mat.porcelain());
tok.castShadow = true; st.group.add(tok);
// render(t):
tok.visible = t >= te - 0.05;
const u = C.pr(t, te - 0.05, 0.38), hot = Math.exp(-Math.max(0, t - te) / 0.85);
tok.position.set(0, C.lerp(7.6, 6.2, E.back(u, 1.2)), 0);
tok.material.color.copy(api.col.porc).lerp(api.col.accent, 0.72 * hot);
tok.material.emissive.copy(api.col.accent).multiplyScalar(0.3 * hot); // modest: full emission blooms the text away
api.hot(hot, st.at(0, 6.2, 0));
```

**A label pinned to the thing at its phrase** (one plain note per chapter beside it):

```js
const a = story.phrase(6, "显存");
api.pin(Kit.label({ text: "显存", sub: "GPU 显存", tone: "warn" }), () => tank.getWorldPosition(V(0, 0, 0)).add(V(-2.8, 4.6, 1.7)), [a, st.end], { ax: 1, ay: 0.5 });
api.note("显存占用 <b>∝ 上下文长度</b>", story.phrase(6, "跟着"), st.end);
```

**Count-up / formula at story times** (render them yourself in `render(t)`; the driver places them):

```js
const n = api.pin(Kit.number({ value: 2, unit: "GB", caption: "单条请求", tone: "warn" }), st.at(-3, 6, 1.7), [story.at(7, "2", 2), st.end], { ax: 1 });
const f = api.panel(Kit.formula({ size: 64, terms: [{ text: "0.5 MB", sub: "每个 token", t: story.at(7, "0.5"), tone: "accent" }, { text: "×", t: story.at(7, "4K") }, { text: "4096", sub: "4K 上下文", t: story.at(7, "4K") + 0.12 }] }), 96, 226, 0, 0, [story.at(7, "0.5") - 0.2, story.line(7).end + 0.4]);
// render(t):  n.render(t, C.pr(t, story.at(7, "2", 2), 0.8), 1);  f.render(t, 1);
```

**Move the camera to a sub-spot** (keys come from the story; the driver's drift resumes after):

```js
const a = story.phrase(7, "每个") - 0.2, b = story.line(7).end;
api.own(a - 0.5, b);                                       // drop the driver's keys in this stretch
api.shot(a, st.at(-2, 6.4, 15), st.at(-2, 5.2, 0), 0.0012); // push in on the left half
api.shot(b, st.at(1.5, 6.6, 17), st.at(1.5, 5.0, 0));       // slide right as the bill lands
// or just frame a box and keep the driver's drift: st.fit({ x0: -7, x1: 7, y0: 1.5, y1: 9.5 }, a, b);
```

To perform a line: build it in `Beats`, remove its number from `DRAFT`, add it to `PERFORMED` in `tools/sfx.py`, then
`python3 tools/fonts.py <film>` (it scans `beats.js` too), `bash tools/sfx.sh`, `npx --yes hyperframes@0.8.81 check`.
