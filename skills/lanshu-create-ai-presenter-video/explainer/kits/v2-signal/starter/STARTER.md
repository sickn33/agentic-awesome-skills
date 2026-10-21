# V2 signal 「信号」 — starter

The KV film minus the topic. `tools/new_film.sh v2-signal <story> <project>` copies this folder, syncs core + kit + story, stamps
the durations, subsets the fonts and builds the sound bed. The result plays end to end for any story; you only write
`beats.js` (and the per-beat part of `tools/sfx.py`).

## What the starter draws (index.html — the driver)

- **One big `#world`, one station per chapter, side by side**: station *k* is a 1920 × 1080 zone at world x = k × 2400
  (`api.station(k)`), so the world is as wide as the story has chapters; a story with `end` gets one more station for
  the closing line (`api.closing`). Same coordinates as a KV-film zone: KV scene code ports by swapping `$("zA")` for
  `api.station(0)`.
- **Camera**: one writer (`core.track`), keys in look space `[t, world x, world y, s]` built from *shots*. Each chapter has
  a default shot (the zone at s = 1 drifting to 1.03, from `chapter.start + 0.45` to `chapter.end − 0.25`); between
  shots the camera travels, so it rides to the next station across every chapter seam (glitch cut on the seam), and it
  never parks (the last key keeps pushing to the end). Shots you add replace the defaults where they overlap.
- **Chrome**: dot-field backdrop with parallax, `Kit.hud` (corners, timecode, chapter segments), `core.Chapters` chip in
  `#head`, `core.Captions` (`skipEnd`, `clamp`, long lines wrap balanced via `.kit-caps-wrap`), `Kit.glitch` on every seam
  (chapter starts, the closing line, the recap), the closing line with `Kit.title` centred in the closing station (breaks
  after `，` — and after `：；` when a half is long — sized to fit), `Kit.recap` from `story.recap.start` (the world hides).
  No `end` → no closing station; no `recap` → the film ends on the last beat. `story.draft` → a 「草稿 · 无配音」 tag.

## The placeholder (`api.placeholder(L)`) — one storyboard frame per narration line

A 1560-wide chamfered monitor frame in its chapter's station (frames stack downward in a chapter, 260 apart; heights
come from the text, no DOM measuring). It waits dashed; as its line starts a lime scan line runs down it and it goes
live: `L04 · CH 02 · BEAT 1/2` header + 「待演绎」 tag; the headline (the chapter's `story.notes[key][j]` beat note, else the
line's key phrase — the clause with the most Latin / number terms, else the last clause — or, when the line is one
clause, the line itself written on word by word) decodes in without reflow; the line's Latin / number terms decode in as
chips at the moment they are spoken; the line writes itself on unit by unit (current unit lime); a signal trace (one
spike per spoken unit at its time) lights up to a moving playhead with a `+02.31 s` clock. Done frames dim to 62 %. A
lime packet hops on a wire from each frame to the next while the camera travels with it (out of the right side across
the station gap at a chapter change). The camera frames the live frame (s ≤ 1.1) and pushes in 3.5 % while it plays.

## The `api` passed to `window.Beats(api)`

| key | what |
| --- | --- |
| `story`, `C`, `Kit` | the `core.Story`, `ExplainerCore`, `window.Kit` |
| `lines`, `chapters` | narration lines except the closing line · `story.chapters` (or one chapter spanning the film) |
| `chapterOf(L \| i)`, `linesOf(k)` | chapter index of a line · the lines of chapter k |
| `station(k)`, `closing` | the 1920 × 1080 zone of chapter k (0-based) · the closing station (or `null`) |
| `world`, `head`, `hud` | `#world` · the HUD header row (chip; append notes) · `#hud` (screen space) |
| `title` | the `Kit.title` of the closing line (or `null`) — reposition it if you perform the closing yourself |
| `cam.shot(t0, t1, k, [cx, cy, s], [cx, cy, s]?)` | during t0…t1 frame station-local (cx, cy) of station k at scale s, drifting to the second view |
| `cam.at(t)`, `cam.keys` | world → screen `{ tx, ty, s }` at t (for screen-space overlays) · the final keys (after `Beats` returns) |
| `placeholder(L, { x, y, station, cam })` | the draft beat above → `{ el, line, slot, shot, render(t) }`; `cam: false` adds no shot |
| `closingChain()` | one node per chapter under the closing line, lit in turn while it is spoken → `{ render(t) }` |
| `note(text, { at, until, tag })` | a `Kit.note` in the header row (render it yourself) |
| `termsOf(L)`, `keyPhrase(L)`, `noteOf(L)` | what the placeholder reads from a line |
| `seams`, `close`, `recapStart`, `SW` | glitch times · closing seam · recap start · station pitch (2400) |
| `h` | the KV film's cached DOM helpers: `mk(tag, cls, parent, css, html)`, `css`, `op(el, o)`, `mv(el, x, y, s, sx)`, `cls`, `sv(tag, attrs, parent)`, `u3`/`io(t, a, d)` (eased progress), `win`, `polyAt`, `ems`, `joinUnits` |

`Beats(api)` returns `{ render(t) }`; render everything you created (placeholders, chain, notes, your scene) from it.
To perform a chapter, drop its placeholders: `api.lines.filter((L) => api.chapterOf(L) !== 1).map((L) => api.placeholder(L))`.
The kit owns an element's opacity, content and (for `tracker` / `stamp`) its transform; you own its position (`left` /
`top`, or a transform on a wrapper). Every time comes from `story.at / phrase / span` + small offsets.

## Idioms (from the KV film)

```js
const { story: S, Kit: K, h } = api, Z = api.station(3);
// 1 · a label pinned to its spot, decoding in when its word is spoken (scan line crosses it once)
const gqa = K.label({ text: "GQA", sub: "共用 K 和 V", at: S.at(8, "GQA") });
Z.appendChild(gqa.el); gqa.el.style.left = "180px"; gqa.el.style.top = "200px";          // render: gqa.render(t)
// 2 · a count-up that runs while a phrase is spoken
const n = K.number({ caption: "上下文长度", value: 4096, unit: "tokens" });
Z.appendChild(n.el); n.el.style.left = "180px"; n.el.style.top = "100px";
const a = S.phrase(6, "跟着上下文"), b = S.at(6, "涨");                                   // render: n.render(t, h.io(t, a, b - a), t >= a ? 1 : 0)
// 3 · data travels: packets on a wire, drawn then live from a word
const w = K.wire(h.sv("svg", { class: "svgl", viewBox: "0 0 1920 1080" }, Z), { packets: 3 });
const pts = K.link({ x: 1550, y: 420 }, { x: 1690, y: 420 }, 40), t0 = S.at(9, "换");
// render: w.render(t, pts, { draw: h.io(t, t0 - 0.1, 0.25), live: t >= t0, t0, speed: 90, rate: 1.4, op: t >= t0 - 0.1 ? 1 : 0 })
// 4 · a tracker locks on, and the camera leans to that sub-spot while it is named
const trk = K.tracker({ w: 330, h: 80, big: true });
Z.appendChild(trk.el); trk.el.style.left = "1285px"; trk.el.style.top = "572px";        // render: trk.render(t, S.phrase(8, "量化"))
api.cam.shot(S.phrase(8, "量化") + 0.2, api.chapters[3].end - 0.25, 3, [1300, 620, 1.2], [1310, 610, 1.25]);
```

Also from the kit: `K.put(el, K.dec(text, t, t0, 0.4, seed))` (decode any text), `K.typed(text, t, t0, cps)`,
`K.formula({ terms })`, `K.bars({ rows })`, `K.stamp({ text })`, `K.panel(host, w, h)` — see `lib/kit/KIT.md`.
Keep the accent for the one active thing; dim what is not computing; nothing meaningful under 28 px.

## Sound and fonts

`tools/sfx.sh` → `tools/sfx.py` re-derives every time from `lib/story.js`: the chrome part (power-on, glitch + sweep at
seams, closing decode chatter over a low swell, recap swell + card blips, lifted 8 dB) stays; replace the "draft beats"
part with your scenes' sounds (`sfx_signal`: `decode`, `blip`, `pop`, `lock`, `slam`, `glitch`, `stream`, `sweep`,
`typing`, `rise`, `close`). The level is set from the narration (≥ 12 dB under the voice in every voiced half-second).
After editing text (beats.js included) run `python3 <skill>/explainer/tools/fonts.py <project>`.
