# V7 · 图纸与注脚 — starter

`tools/new_film.sh v7-drafting <story> <project>` copies this folder and gives you a playable film of any story. The film is
one black drawing sheet with the crane camera, the ghost-letter headlines (this style's captions), the chapter chip,
leaders between figures, the closing line, the recap and a sound bed. Every narration line also gets a placeholder.
You only write `beats.js`.

## What the starter draws (index.html, all from `window.STORY`)

- **Figures.** One figure (a 1920×1080 cell with corner ticks and a 「n」 bubble) holds one or two narration lines.
  Two lines share a figure when `len(a)+len(b) ≤ 72` and both are `≤ 50` characters. A chapter always starts a new
  figure, and a **station** (= a chapter) is its run of one or more figures. Figures follow a snake on a grid
  sized from the figure count: ≤3 → one row, 4 → 2×2, 5–6 → 3×2, 7–8 → 4×2, 9 → 3×3, 10–12 → 4×3, 13–15 → 5×3,
  16 → 4×4, 17–20 → 5×4. The pitch is 2100 × 1300 px. The first free grid cell holds 图纸目录 + 图例 + the title block.
  When the grid is full, the legend and title block go in a band under it.
- **Inside a figure.** A solo line has its headline at the top (`y 120`) and its zone below. In a duo, line A's
  headline is at the top and line B's is anchored to `y 930`. The two zones stack between the headlines (A under
  A's headline, B over B's). `fig.free` is the whole free area between the headlines.
- **Headlines.** `planHeadline` breaks every line into rows that fit 1640 px. When there is an early 「，：；」, the
  first clause is set big (96/88 px) and the rest at 60–52 px (the KV film's hierarchy). Otherwise one size runs
  over ≤ 3 rows. Breaks are balanced and prefer punctuation, then Latin-word boundaries. A row never starts with
  punctuation. The glyphs wait at 17 % ink from the moment the camera heads for the figure, and each lights as it
  is spoken.
- **Camera.** It lands 0.1 s before a figure's first line and drifts toward the line being spoken (centre y
  472 → 524, scale 1.035 → 1.0, tilt 7° → 5°). It leaves on the figure's last spoken unit, at least 0.75 s before
  the next figure. Each move follows a leader (「→ / ↓ / ← 图 n」, sparks at its end) at scale 0.8 and tilt 14°.
  For the closing line it pulls back to the whole sheet, with `Kit.title` underneath. Then `Kit.recap` covers
  everything. Without `end`, the pull-back starts after the last line. Without `recap`, the film ends on the
  whole sheet.
- **Placeholder** (`api.placeholder(i)`). A construction-line hold box in non-photo blue (draft marks that don't
  print) with a 「待演绎 · Ln · start–end s」 tag. Inside it:
  - the beat note (`story.notes[chapterKey][j]`, else the line's key phrase), typed as the line starts
  - the line's phrases as drafted parts placed on the line's own time axis: a dashed slot each, inked when spoken,
    with the phrase being spoken in the accent
  - a time ruler with phrase ticks and a running playhead
- **Chrome.** `Kit.frame` (sheet number 「图 f / F · 全图 · 说明」), the chapter chip, and a 「草稿 · 无配音」 tag
  (bottom-left) when `story.draft`.

## The `api` passed to `window.Beats(api)`

| field | what |
| --- | --- |
| `story`, `C`, `Kit`, `T`, `U` | `ExplainerCore.Story`, `ExplainerCore`, the kit, `Kit.tokens`, `Kit.util` |
| `station(k)` | chapter k (1-based) → `{ k, chapter, n, title, lines, figs, el, x, y }` |
| `fig(n)`, `figs` | figure n → `{ n, el, svg, x, y, lines, ch, arrive, leave, show, free }`. `el` and `svg` are the cell's HTML and SVG layers in fig-local px (1920×1080). `x, y` is its world origin. |
| `slot(i)` | line i → `{ fig, pos: "solo"\|"top"\|"bottom", head, zone, appear }` (rects in fig-local px) |
| `headline(i, o)` | (re)build line i's ghost headline: `{ accent, warn, punch, rows, size, x, y, appear }`. Returns `{ el, rows, at(phrase), render }`. |
| `placeholder(i, { note })` | the draft beat for line i → `{ render(t), box, parts }` |
| `focus(a, b, { fig, x, y, s, tilt })` | lean the camera to a sub-spot of a figure between a and b (the base drift keeps running) |
| `add(fn)` | register a per-frame `fn(t)` |
| `at`, `ph` | `story.at(line, unit, n)`, `story.phrase(line, text)` |
| `put, txt, box, label, note, foot, cls, tr, xy` | the KV film's helpers. `label / note / foot` register their own render. |
| `camera`, `sparks`, `layers` | `Kit.camera` (keys, `at(t)`), `Kit.sparks` in **world** px, `{ world, cells, leaders, sparks, endwrap }` |

`Beats(api)` runs once, after the world is built and before default headlines are made, so `headline()` calls
take effect. Return `{ render(t) }`, which is called every frame (pure in `t`). To perform a line, stop calling
`placeholder(i)` for it and draw in `slot(i).zone`, or use `fig.free` for both lines of a duo.

## Idioms (from `examples/kv-cache/v7-drafting`)

```js
const { story, Kit, C, U } = api, S = api.slot(1), F = S.fig, Z = S.zone;
// 1 · a part pops out at its word; the newest one wears the accent
const t1 = api.at(1, "蹦"), t2 = api.at(2, "蹦");
const tok = api.box(F.el, "tok", Z.x + 40, Z.y + 60, 110, 74, "因为", "font-size:32px");
api.add((t) => {
  const u = C.E.io3(C.pr(t, t1, 0.32));
  U.show(tok, t >= t1 ? 1 : 0);
  api.tr(tok, `translateY(${(-(1 - u) * 46).toFixed(1)}px) scale(${(0.6 + 0.4 * u).toFixed(3)})`);
  api.cls(tok, t < t2 ? "tok new" : "tok");
});
// 2 · typed callout / 说明 / a true footnote, each at its phrase (they register themselves)
api.label(F.el, 1380, 568, { text: "回头看 = 注意力¹", sub: "attention", tone: "q" }, api.ph(2, "回头"));
api.note(F.el, 120, 952, "注意力", "新 token 要和前面每一个比一比", api.at(2, "token", 2) + 0.05);
api.foot(F.el, 1050, 956, "¹", "softmax(q·Kᵀ/√d)·V：q 给每个 k 打分，按分数取 V", api.at(2, "所") + 0.15);
// 3 · count-up, redline cloud for waste, a stamp, sparks (world px)
const n = Kit.number({ value: 4, unit: "K", caption: "上下文长度（token 数）", tone: "ink" });
api.put(F.el, n.el, 520, 420);
api.add((t) => n.render(t, C.pr(t, api.ph(6, "缓存"), 1.2)));
const cloud = Kit.revcloud(F.svg, { x: 330, y: 380, w: 520, h: 520, tag: "重复计算" });
api.add((t) => cloud.render(t, api.at(3, "算") + 0.05));
const st = Kit.stamp({ text: "×1", sub: "只算一次" });
api.put(F.el, st.el, 372, 608);
api.add((t) => st.render(t, api.at(4, "一")));
api.sparks.burst(F.x + 450, F.y + 660, api.at(4, "一"), 18);
// 4 · paint the headline (phrases may cross row breaks) and lean the camera to a sub-spot
api.headline(3, { warn: ["重新算", "越写越慢"], punch: [{ phrase: "慢", amp: 0.22, dur: 0.4 }] });
api.focus(api.ph(7, "拿"), story.line(7).end - 0.2, { fig: F, x: 1440, y: 560, s: 1.02 });
```

Rules of the style still apply (KIT.md):
- every keyword gets a visible step
- one 说明 per figure; footnotes must be true
- yellow means new/important, red means waste/cost, blue means construction/query
- labels ≥ 28 px and footnotes ≥ 24 px
- texts that only touch in the far pull-back get `data-layout-allow-overlap` on the text element itself

## Sound

`bash tools/sfx.sh` rebuilds `assets/audio/sfx.wav` from `lib/story.js`. It mirrors the driver's figure rule, the
camera travel windows and the placeholder phrases. The bed has:
- a whoosh, a leader stroke and a landing tick per move; a thump on a new chapter
- per line: a pen swipe for the hold box, typing for the note, a pop per phrase
- a swell and pull-back for the closing line
- a lifted recap

Add performed beats' sounds under the marked line in `tools/sfx.py`, using the same `story.at / phrase` times.
After any text change, run `python3 tools/fonts.py <film>`; it also scans `beats.js`.
