# V5 comic starter — the film minus the topic

`tools/new_film.sh v5-comic <story> <project>` copies this folder, syncs core + kit + story, stamps durations, subsets fonts and
builds the sound bed. The result plays end to end for any story; you then perform the lines in **`beats.js`** (the only
topic file) and add their sounds in `tools/sfx.py`.

## What it draws

- **World**: the comic page of the KV film — paper, halftone ground (one colour per station: pink / blue / yellow),
  8 px page frame with a hard shadow, two-frame impact rays, seeded shake, speed lines, the halftone **dot wipe**.
- **Stations**: one comic page per chapter, plus a closing page when the story has `end`. Every station is a
  horizontal strip of panels, **one 1720 × 740 panel per narration line**, 1920 px apart (station coordinates: panel
  `j` at `x = 100 + 1920·j`, `y = 110`). Only the active station is displayed; stations swap under the dot wipe at
  each `story.chapters[k].start` (and at the closing line, and at `recap.start`).
- **Camera** (`[t, x, y, zoom]` keys per station, `(x, y)` = station point at the screen centre): holds panel 0, whips
  panel `j−1 → j` from `L.start − 0.42` to `L.start + 0.06` (smoothstep, ink speed streaks, whoosh), and always
  drifts (zoom × `1 + 0.05u`, x + `34(u − ½)`, `u` = station progress) so it never parks.
- **Chrome**: word-timed captions (`core.Captions({skipEnd, air: 0.22, clamp})` + `Kit.wrapCaptions` → a long line
  wraps onto two balanced lines), chapter chip, the closing line (`Kit.title` over a white splash burst + rays, sized
  to the title, rays flash + shake on the last emphasis), the one-frame recap (`Kit.recap`), 「草稿 · 无配音」 when
  `story.draft`. No `end` → no closing page; no `recap` → the film ends on the last station at `story.duration`.
- **Draft beat** (`api.placeholder(line)`): the line's panel with its number disc, a 「待演绎」 tag, the beat note
  (`story.notes[chapter.key][j]`) in a yellow 分镜 box, the line's **key phrase** (last clause ≥ 0.6× the widest)
  in a shout balloon — muted from the line start, every unit lights and stamps as it is spoken —, its real terms
  (Latin / number runs, ≤ 4, the last number pink) slammed as stickers on their words, and a halftone timing strip
  (one dot per spoken unit).

## The api passed to `window.Beats(api)`

| api | what |
| --- | --- |
| `story`, `C`, `Kit` | `ExplainerCore.Story` (core v2: `at / phrase / span / spoken / line`), `ExplainerCore`, `window.Kit` |
| `stations`, `station(k)`, `end`, `all` | chapter stations, `station("end")` = closing station; each `{k, kind, n, key, title, chapter, start, end, lines, el, color, panels}` — `panels[j] = {x, y, w, h, cx, cy, line}` |
| `stationOf(line)`, `panel(line)`, `note(line)` | the station a line lives in, its panel rect (station coords), its beat note |
| `frame(line)` | the line's comic panel `{el, w: 1704, h: 724, rect, cull()}` — draw inside `el` (inner coords); `cull()` hides it off camera and returns whether it is on |
| `placeholder(line)` | the draft beat → `{el, line, frame, note, keyPhrase, terms, render(t)}` |
| `active(st)` | true while station `st` is on screen (skip work otherwise) |
| `world`, `hud` | the camera layer (stations live in it) / a screen-space layer above the page |
| `camera` | `keys(st)`, `set(st, keys)`, `add(st, key)`, `drift(st, {z, x, y})`, `now` (= `[x, y, zoom]` this frame), `sees(x0, x1)` |
| `shake`, `rays`, `boom(at, amp, dur, rx, ry)` | `Kit.Shake` / `Kit.Rays`; `boom` = shake + (with `rx, ry`) a two-frame ray flash. Add at build time |
| `trail(ax, ay, bx, by, u)`, `streak(seg)` | speed lines for this frame (station coords) |
| `el, svg, put, enter, off, cls, bump, land, place, sfx` | the KV film's helpers: `put(e, x, y, sx, sy, r, o)`, `enter(e, t, at, end, x, y, {kind, s0, r0, r, d})`, `place(comp, parent, x, y)`, `sfx("POW!", parent, x, y, o)` |
| `colors` | `ink, pink, blue, yellow, warn, ok` |

## Performing a line

1. In `beats.js` replace `api.placeholder(i)` for line `i` with your beat; keep the rest as placeholders.
2. Draw in the line's panel (`api.frame(i).el`, or station coords via `api.panel(i)`) — the camera already visits it
   at the line start — or take a whole chapter on one page with `api.camera.set(st, …)`.
3. In `tools/sfx.py` add `i` to `PERFORMED` (its draft sounds go) and write its sounds in "your beats"
   (`stamp`, `boing`, `slide`, `poof`, `whoosh`, `zap`, `chime`; see `examples/kv-cache/v5-comic/tools/sfx.py`).
   Set `WHIPS = False` if you replace the default camera keys.
4. `python3 tools/fonts.py <film>` (it scans `index.html` + `lib/**/*.js`, **not `beats.js`**: until it does, copy
   `beats.js` to `lib/beats.fonts.js` first), `bash tools/sfx.sh`, `npx --yes hyperframes@0.8.81 check`.

## Idioms (from the KV cache film)

**A sticker slams on its word** (every keyword gets one; `Kit.label` / `Kit.note` / `Kit.number` all render this way):

```js
var st = api.stationOf(3), P = api.panel(3);
var slow = api.place(K.label({ text: "越写越慢", tone: "warn" }), st.el, P.x + 780, P.y + 240);
// render(t):
slow.render(t, S.phrase(3, "越写越慢") + 0.32, null, { s0: 2, r0: 14, r: 4 });
```

**A counter that bumps on every step** (count-up driven by word times):

```js
var STEPS = [S.phrase(6, "跟着"), S.at(6, "着"), S.phrase(6, "上下文"), S.at(6, "下")];
var ctr = api.place(K.number({ value: 4, unit: "K", caption: "上下文" }), st.el, P.x + 460, P.y + 30);
// render(t):
var n = STEPS.filter(function (s) { return t >= s; }).length, b = 0;
STEPS.forEach(function (s) { b = Math.max(b, api.bump(t, s, 0.18)); });
ctr.set(Math.max(1, n));
ctr.render(t, undefined, STEPS[0] - 0.08, null, { s0: 1.8, r0: -8, r: -2 });
if (ctr.el.style.visibility === "visible") ctr.el.style.transform += " scale(" + (1 + 0.12 * b).toFixed(3) + ")";
```

**A mover hops, lands with a squash, trails speed lines** (a token out of the model's mouth into its slot):

```js
var at = S.at(1, "token") - 0.1, fu = C.clamp01((t - at) / 0.32), e = C.E.io2(fu);
var x = C.lerp(ax, bx, e), y = C.lerp(ay, by, e) - Math.sin(Math.PI * fu) * 170;
var L = fu >= 1 ? api.land(t, at + 0.32) : [1, 1];
api.put(tok, x, y, L[0], L[1], (1 - fu) * -14, fu > 0 ? 1 : 0);
if (fu > 0.2 && fu < 0.85) api.trail(ax, ay, bx, by, e);
```

**A line that draws itself** (look-back arcs, axes, brackets: `pathLength="1"` + dash):

```js
var arc = K.svgEl("path", { d: "M 1314 536 C 1314 360, 700 360, 700 526", pathLength: "1", fill: "none",
  stroke: api.colors.ink, "stroke-width": 9, "stroke-linecap": "round" }, api.svg(st.el));
// render(t):
var u = C.E.o2(C.clamp01((t - S.phrase(2, "回头看")) / 0.26));
arc.style.strokeDasharray = u.toFixed(4) + " 2";
arc.style.opacity = u > 0.002 ? "1" : "0";
```

**Camera to a sub-spot / one page for a whole chapter, and the big hit**:

```js
api.camera.set(st, [[st.start, 960, 540, 1.0], [S.phrase(3, "每次"), 980, 520, 1.0], [st.end, 990, 520, 1.03]]);
api.camera.drift(st, { z: 0.02, x: 10 });                    // keep a drift: the camera must never park
api.boom(S.at(7, "2", 2) + 0.1, 14, 0.32, 1500, 520);        // shake + ray flash (2–4 per film)
var pow = api.sfx("BOOM!", st.el, 1150, 214, { color: api.colors.yellow, size: 104, rot: -8 });
// render(t): pow.render(t, S.at(7, "2", 2) + 0.06, null, { s0: 2.6, r0: -24 });
```

Rules of the kit still hold: one pink thing per beat, Noto Sans SC for every CJK word (Bangers for Latin display,
numbers, sound words), no idle wobble, the dot wipe is the only transition, numbers only from `story.facts`.
