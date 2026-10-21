# v9-clay starter: the clay town minus the topic

`tools/new_film.sh v9-clay <story> <project>` copies this folder, syncs core + kit + story, stamps durations, subsets fonts and builds
the sound bed. The film plays end to end from `window.STORY` alone; **`beats.js` is the only file a scene author writes.**

## What the driver (`index.html`) draws

- **The town.** A three-layer cream cake base, lilac streets with dashes, lollipop trees and cottages around the rim, and
  **one pastel plot (station) per chapter**. Each plot has a smiling yellow pin with the chapter number at its back-right
  corner. The pin pops up when the chapter starts. Cells that no chapter uses become parks (lawn, pond, cottage).
- **Layout from the chapter count.** N ≤ 2: one row. N 3–6: two rows. N 7–8: a 3×3 grid with the plaza in the middle
  cell. The camera walks the cells as a snake (column 0 back→front, column 1 front→back…), so every next plot is a
  neighbour. All plots are the same size, set by the longest chapter: the width fits a 9.2-unit row plus a ST step per
  extra line, and the depth fits 2.4 units per line.
- **Rows.** Line j of a chapter sits on row j of its plot. Each row is DZ = 2.4 nearer than the one before and
  ST = DZ·tan 34° to the right, so the rows of a plot stack straight down the screen like lines of text.
  `station.slot(j)` gives the row's centre.
- **The plaza.** A round square at the town centre with a flagpole. The yellow flag, which has a face, rises on the closing line.
- **The camera** (orthographic iso, azimuth 34° plus a slow 0.05°/s turn, so it never parks). At each `chapter.start` it
  travels to the next plot, lifting (zooming out) for long hops, and lands on the whole plot as the pin pops. It then
  pushes in on row 0 and drifts down each row while that row is spoken. On the closing line it frames the plaza under
  the title. On the recap it pulls back to the whole town. Phantom keys sit before 0 and after the end.
- **Chrome.** `Kit.captions` (a line longer than about 1720 px wraps into balanced lines), `Kit.chapters`, `Kit.title` for
  the closing line (shrinks or wraps if it is too long) over a paper haze, and `Kit.recap` as one composed frame. In
  the recap the centre sticker sits on the plaza as the flagpole's sign. Each numbered card goes above (back row),
  below (front row) or beside (middle row) its district, with a leader to the district's centre. Cards in a crowded
  band switch to narrow text. A story without `end` gets no title. A story without `recap` gets no recap: the camera
  keeps drifting to `story.duration`. `story.draft` adds 「草稿 · 无配音」 at the top right.
- **Sound** (`tools/sfx.sh` → `tools/plan.mjs` + `tools/sfx.py`):
  - a whoosh between plots and a plop when each pin lands;
  - a pad sliding in under each row, and one clay plop per type tile;
  - a swell under the closing line, the flag sweeping up, and a chime at the top;
  - the recap lifted: whoosh, centre pop, one pop per card, chime, warm bed.

  Once the scenes are performed, set `PLACEHOLDERS = False` in `sfx.py` and add the scene's sounds in the marked section.

## The `api` passed to `window.Beats(api)`

| key | what |
| --- | --- |
| `story`, `C`, `Kit`, `THREE` | the Story, ExplainerCore (`pr`, `E`, `lerp`, `track` …), the kit, three.js |
| `CL` | the `Kit.clay` stage and makers: `M`, `rbox`, `mesh`, `slab`, `tree`, `eyes`, `dotFace`, `textTexture`, `canvasTex`, `clayMap`, `squash`, `hop`, `puffs`, `poof`, `noAO`, `noShadow`, `toScreen`, `P` (palette) |
| `scene`, `camera`, `V`, `M`, `rbox`, `mesh` | shortcuts |
| `AZ` / `AZd`, `Y0`, `W`, `H` | camera azimuth (rad / deg; text-bearing props turn to it with `api.face(obj)`), plot top (0.3), frame size |
| `stations`, `station(k)` | per chapter: `{ k, n, chapter, lines, cx, cz, w, d, color, group, slot(j), pin, head, plaque, pinTop(), center, band, rowLen }`. `group` sits at the plot centre at plot level: build the chapter's props in it |
| `stationOf(i)`, `slotOf(i)` | line i → station index / `{ k, j }` (null for the closing line) |
| `plaza` | `{ group, flag, center, top }` (hide `plaza.group` to take over the close) |
| `town` | `{ x0, x1, z0, z1, cx, cz, rows, cols, cells, plotW, plotD }` |
| `cam` | `cam.station(k, [[t, dx, dy, dz, width], …])` replaces station k's default shots (offsets from the plot centre). `cam.add(t, x, y, z, width, azDeg?)` adds an absolute key, and default keys within 0.3 s of it are dropped. `cam.keys` holds the final track |
| `stick(widget, anchor, draw?)` | pins any Kit widget to a world anchor (a `Vector3` or `t => Vector3`), projected every frame; pass `null` for widgets with fixed x, y; `draw(t, x, y)` replaces `widget.render` |
| `toScreen(v)`, `face(obj)` | world → screen px; turn a prop to face the camera |
| `placeholder(i, { units, note })` | the draft beat for line i (call it during setup). Returns `{ tiles, strip, card, slot, render(t) }` |
| `notes`, `noteFor(i)` | `story.notes` and the beat note of line i (note j of its chapter) |

**The placeholder.** The line's key phrase (`Kit.keyPhrase`, or `units`) is set in clay movable type on its row. Each
spoken unit drops in as it is spoken, the newest is yellow, and the tiles shrink to fit the row. A storyboard slip hangs
from the row with 「待演绎」 and 镜 k·j. If there is a beat note, the slip also shows it, written on across the line.

## Performing a beat: idioms (from the KV film)

All times come from the story (`story.at`, `story.phrase`, `story.span`, `story.line(i).start/end`). Every frame is a pure function of t.

**1. A prop lands on its word.** It drops in on the phrase and squashes on landing:
```js
const S = api.station(1), T = { kv: story.phrase(4, "KV cache") };
const cab = api.mesh(api.rbox(3.1, 2.2, 1.4), api.M("#fff6ea"), 0, 0, 0, S.group);
api.face(cab);
// render(t):
const u = C.E.i2(C.pr(t, T.kv - 0.05, 0.47));
cab.visible = t >= T.kv - 0.05;
cab.position.set(0, 1.1 + 7 * (1 - u), 0);
cab.scale.setScalar(1);
if (u >= 1) api.CL.squash(cab, t, T.kv + 0.42, 0.8);
```

**2. Analogy sticker + real term**, pinned to the prop, live while it matters:
```js
api.stick(Kit.label({ text: "卡片柜", sub: "= KV cache", tone: "accent", stem: true, win: [T.kv + 0.15, story.line(4).end] }),
  () => cab.localToWorld(api.V(0, 1.6, 0)));
api.stick(Kit.note("K 用来匹配，V 是被取走的内容", { win: [story.phrase(4, "Key"), story.line(5).end] })); // one 说明 per chapter
```

**3. A count that follows the narration.** A number plaque steps on each spoken beat:
```js
const STEPS = [story.at(3, "每"), story.at(3, "重"), story.at(3, "慢")];
const n = Kit.number({ value: 1, unit: "张", caption: "这一步要重算的 K/V", size: "md", tone: "warn", plaque: true,
  win: [STEPS[0], story.line(4).start], ax: 0, ay: 0.5, dx: 30 });
api.stick(n, () => api.V(S.cx + 4, 1.4, S.cz), (t, x, y) => { n.set(Math.max(1, STEPS.filter((s) => t >= s).length)); n.render(t, null, x, y); });
```

**4. A formula that writes itself** term by term as the terms are spoken (fixed on screen):
```js
const f = Kit.formula({ terms: [
  { text: "2", sub: "K、V", t: story.at(7, "每") }, { op: "×", text: "32", sub: "层", t: story.at(7, "个") },
  { op: "≈", text: "0.5 MB", sub: "每个 token", t: story.at(7, "0.5"), tone: "accent" } ],
  win: [story.at(7, "每") - 0.1, story.chapters[2].end], x: 96, y: 330, ax: 0, ay: 0.5, clamp: false });
api.stick(f, null, (t) => f.render(t));
```

**5. Move the camera to a sub-spot.** Keep the keys monotonic and slow inside a beat. Hermite stops where every axis reverses:
```js
api.cam.station(1, [[story.line(4).start + 0.3, -3, 0.6, 0.4, 15], [story.phrase(4, "存"), -1, 0.8, 0.6, 16.5],
  [story.phrase(5, "查"), 3, 1.0, 0.8, 13.5], [story.line(5).end - 0.2, 3.6, 1.0, 1.0, 13]]);
```

To drop a placeholder, remove its line from `DRAFT` in `beats.js`. Then run `python3 tools/fonts.py <film>` (it scans
`beats.js` too), `bash tools/sfx.sh`, and `npx --yes hyperframes@0.8.81 check`. Snapshot each beat, and pairs 0.3 s apart
in quiet stretches.
