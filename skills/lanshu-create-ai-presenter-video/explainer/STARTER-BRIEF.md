# Brief for building a style's starter (one agent per style)

This is the brief the nine starters were built from; reuse it to add a tenth style. You own ONE style of the
explainer series in this folder (`explainer/`). The style has a kit (`kits/<style>/`) and a finished film built on it
(`examples/kv-cache/<style>/`, 45 s). The user's goal is **"换题目也能直接套用"** — a new topic should become a film in any style
with as little work as possible. The story side is done (`tools/story.py`: script.md → voice → word times → story.json).
Your job: the **starter** for your style — the film minus the topic — so `tools/new_film.sh <style> <story> <project>` produces a
playable, on-style film for ANY story, and a scene author only writes `beats.js`.

Read first, in full: `KITS.md` (especially §5 and §6, the starter contract), `core/core.js` (core v2: note the new
Captions options `skipEnd` / `air` / `clamp`, `Story.span()` etc.), your `kits/<style>/KIT.md`, `kit.js`, `kit.css`, your KV
film `examples/kv-cache/<style>/index.html` (+ `tools/`), `tools/new_film.sh`, `tools/stamp.py`, `tools/sync.sh`, and
`GOTCHAS.md`. The standard for explainers: every narrated phrase is acted out on screen, word-timed — a page that only
reveals text reads as a slide.

## Build `kits/<style>/starter/`

Extract it from your KV film: keep the world, the stage / camera system, the chrome (captions, chapter chip, closing
line via `Kit.title`, recap via `Kit.recap`), the sound bed — and replace everything topic-specific with the story.

1. `index.html` — fonts block (`/* fonts:begin */ … /* fonts:end */`), `lib/kit/kit.css`, scripts in this order:
   `lib/core.js`, `lib/story.js`, `lib/kit/kit.js`, `beats.js`, then the driver. Root, stage and sfx `<audio>` carry
   `data-stamp="story"`, the narration `<audio>` carries `data-stamp="narration"` (stamp.py writes their `data-duration`).
   Layout: one **station per chapter** (a page region, board panel, 3D spot, …) sized from the number of chapters; the camera
   travels station to station at `story.chapters[k].start` and keeps a slow meaningful drift inside a station (never
   parks — freezedetect must read 0); the closing line (`story.end`) and the recap (`story.recap`) as in your KV film. A story
   without `end` / `recap` must still work (no title / no recap, film ends at `story.duration`). If `story.draft` is true,
   show a small 「草稿 · 无配音」 tag.
2. `beats.js` — `window.Beats = function (api) { …; return { render(t) } }`. The driver calls it once after building the
   world and calls `render(t)` every frame. Design the `api` from what your KV film's scene code needed (station
   containers / anchors, the camera, the kit, `THREE` + scene for 3D styles, the chalk writer for V8, the pen for V3 …) and
   always include `story`, `C` (ExplainerCore), `Kit`, `station(k)`, and `placeholder(line)`.
   The starter's `beats.js` builds `api.placeholder(L)` for every narration line (except the end line). A placeholder is an
   **on-style draft beat**: the line's beat note if `story.notes` has one for its chapter (else the line's key phrase), the
   spoken units lit or written as they are spoken, sitting in its chapter's station, with a small 「待演绎」 tag. It should
   look like a tasteful storyboard frame of your style, not an error box.
3. `tools/sfx.sh` (+ whatever it runs) — builds `assets/audio/sfx.wav` from the story: chapter changes, line starts, writing /
   typing textures if your style has them, a swell under the closing line, the unvoiced recap lifted. Python with numpy:
   `python3`. Read times from `lib/story.js` (and from page logs if your style does that today).
4. `fonts.json`, `package.json`, `hyperframes.json`, `meta.json`, `AGENTS.md`, `CLAUDE.md` copied from the KV film.
5. `STARTER.md` — what the starter draws, the `api` passed to `Beats`, how stations are laid out, and 3–4 short idioms
   (with code) for performing a beat in your style, taken from the KV film (e.g. a label pinned to a thing at
   `story.phrase()`, a count-up, a write-on, moving the camera to a sub-spot). Keep it short and exact.

Kit changes: only additive and backward-compatible (the HF and KV films hold their own `lib/` copies, but a later re-sync
must not change them). List every kit change in your report. Never edit `core/`, `tools/`, other kits, `examples/kv-cache/`
or the HF projects. If core or tools need a change, say so in the report.

## Verify (no rendering)

```bash
cd explainer
for story in kv-cache _test-dry; do FORCE=1 bash tools/new_film.sh <style> $story _work/$story/<style>; done
```

- `check` → 0 errors on both stories (warnings reviewed).
- Snapshots you actually look at: kv-cache at ≥ 8 times across all chapters + closing line + recap;
  `_test-dry` ≥ 6 including the long line (≈ 4–15 s: the caption must wrap cleanly, not overflow) and the recap.
  `snapshot -o <dir>` wipes that folder — use a fresh folder per run.
- Stillness self-check: for 6 times (mid-chapter, between lines, closing line, recap start, recap end − 0.5) compare
  snapshots 0.3 s apart; mean absolute pixel difference must be > 0.001. Fix any parked camera.
- Compare a kv-cache starter frame with the finished KV film at the same time: same world, same chrome, same quality bar.

## Report back (final message, concise)

- Files in `starter/`, the `api` you pass to `Beats`, how stations scale with the chapter count.
- Results: check (errors / warnings) for both stories, the stillness numbers, paths of the best snapshots.
- Kit changes (additive), and anything core / tools should change. Open issues.

Constraints: stay inside `kits/<style>/` and `_work/*/<style>/`. Don't render, don't ask the user anything, don't
push / publish / upload. The MiniMax key is not needed (stories are already built).
