# Recipes

Each pattern below passed `check` and `review` with no findings. Whole
documents are in [../assets/examples/](../assets/examples/).

## Vertical promo with captions (9:16)

[assets/examples/vertical-promo.json](../assets/examples/vertical-promo.json): a title
block, a push transition to a stat block, karaoke captions from inline word
times, and grain.

```json
"title": { "op": "block", "params": { "kind": "title", "kicker": "SATURDAYS, 10 AM", "title": "Learn the wheel", "subtitle": "First class free" },
           "timing": { "offset": 0.3, "in": 0, "out": 4.2 } },
"stat":  { "op": "block", "params": { "kind": "stat", "value": 12, "label": "seats a class" },
           "timing": { "offset": 4.2, "in": 4.2, "out": 8 } },
"a":     { "op": "over", "inputs": { "fg": "title", "bg": "bg" } },
"b":     { "op": "over", "inputs": { "fg": "stat", "bg": "bg" } },
"cut":   { "op": "transition", "inputs": { "a": "a", "b": "b" }, "params": { "kind": "push", "at": 3.9, "duration": 0.6 } },
"words": { "op": "captions", "params": { "style": "karaoke", "safe": "social",
           "words": "0.4 0.8 Pottery\n0.8 1.1 class\n1.1 1.5 every\n1.5 2.1 Saturday." } },
"cap":   { "op": "over", "inputs": { "fg": "words", "bg": "cut" } }
```

- The block's `timing.offset` is when its entrance starts; `in`/`out` bound
  it, so it is gone before the next shot.
- On the first try, `"suffix": " seats"` on the stat ran off the frame. Short
  values and labels fit; review says by how much when they don't.
- `review` with `safe: "social"` keeps text clear of the apps' buttons.

## Captions over footage

```json
"clip":   { "op": "video", "params": { "src": "interview.mp4", "fit": "cover", "start": 1 } },
"graded": { "op": "grade", "inputs": { "source": "clip" }, "params": { "look": 2, "amount": 0.5 } },
"words":  { "op": "captions", "params": { "src": "words.json", "style": "pop", "safe": "social", "background": "#000000b0" } },
"sound":  { "op": "audio", "params": { "src": "interview.mp4", "start": 1 } },
"top":    { "op": "over", "inputs": { "fg": "words", "bg": "graded" } },
"out":    { "op": "vignette", "inputs": { "source": "top" } }
```

`words.json` is a list of `{"word", "start", "end"}` (Whisper-style); `.srt`
and `.vtt` work too.

- `fit: "cover"` fills a 9:16 frame from 16:9 footage; `rect` with `fit`
  places it in a box instead (a split screen, a framed speaker).
- Footage plays silent unless an `audio` node uses the same file with the
  same `start`.
- Without `background` (or a `stroke_outline` on the captions), white words
  over bright footage fail review for contrast.

## Explainer with a lower third and a chart (16:9, light background)

[assets/examples/explainer-chart.json](../assets/examples/explainer-chart.json):

```json
"paper":    { "op": "solid", "params": { "color": "#f3efe6" } },
"headline": { "op": "text", "params": {
  "text": "Rendering got *fast*", "font": "Fraunces", "weight": 600, "size": 120, "color": "#16140f",
  "em_color": "#e2443b", "align": "center", "valign": "middle",
  "position": { "keys": [ { "t": 0, "v": [960, 600], "ease": "out_expo" }, { "t": 0.8, "v": [960, 540] } ] },
  "opacity": { "keys": [ { "t": 0, "v": 0 }, { "t": 0.5, "v": 1 } ] } } },
"who":   { "op": "block", "params": { "kind": "lower_third", "name": "Mira Chen", "role": "Head of Product",
           "ink": "#16140f", "accent": "#e2443b" }, "timing": { "offset": 1, "in": 0, "out": 4.5 } },
"chart": { "op": "block", "params": { "kind": "bar_chart", "title": "Frames per second",
           "values": [24, 31, 58, 265], "labels": "2019, 2021, 2023, 2025",
           "ink": "#16140f", "accent": "#e2443b" }, "timing": { "offset": 5 } },
"cut":   { "op": "transition", "inputs": { "a": "s1", "b": "s2" },
           "params": { "kind": "dip", "color": "#f3efe6", "at": 4.5, "duration": 0.6 } }
```

- Blocks default to light ink for dark backgrounds; on paper, set `ink` and
  `accent` or the blocks are invisible (review reports "never shows").
- Charts build themselves on screen: give `values` and `labels`;
  `highlight` picks the bar called out (the largest by default).

## Podcast or interview clip, framed on the speaker (9:16)

```json
"cam":   { "op": "clip_camera", "params": { "src": "episode.mp4", "start": 754.2, "duration": 28 } },
"words": { "op": "captions", "params": { "src": "episode-words.json", "style": "karaoke", "background": "#000000b0" },
           "timing": { "offset": -754.2 } },
"sound": { "op": "audio", "params": { "src": "episode.mp4", "start": 754.2, "duration": 28 } },
"top":   { "op": "over", "inputs": { "fg": "words", "bg": "cam" } }
```

- `clip_camera` tracks faces in the footage, follows whoever is talking with
  a dead zone and eased pans, and cuts on shot and speaker changes.
- Word times in a full-episode transcript are in episode seconds: shift the
  captions with `timing.offset` (minus the clip's start) so they line up
  with the clip.
- Set the format's `duration` to the clip's length.

## One document, many videos

Review one document, then render a version per row:

```csv
name,title.text,format.width,format.height
ana,"Happy birthday, Ana",1080,1920
bo,"Happy birthday, Bo",1080,1080
```

`ultrafast_batch {"path": "card.json", "data": "rows.csv", "out": "out/{name}.mp4"}`
(remote: `{"document": ..., "rows": [{"name": "ana", "title.text": "..."}]}`,
up to 20 rows a call, each a download link). CLI:
`uf batch card.json --data rows.csv --out 'out/{name}.mp4'`.

- A key `node.param` sets a param; `format.*` changes the format; a JSON row
  can carry `edits`. Other keys only fill the output pattern.
- Every row is checked before anything renders, and two rows can't write
  the same file.
- Changing the size per row works because blocks, captions, stacks and `fit`
  follow the frame. Review one row at each size first.

## Know the cost first

`ultrafast_estimate` (or `uf estimate film.json`) renders a sample of frames
without encoding and reports rendered minutes (1080p minutes; 720p counts
half, 4K three), GPU seconds and the time to the first frame. Quote it before a long render or a big batch.

## Cuts on the beat

1. `ultrafast_beats {"path": "song.mp3"}` (remote: `{"audio": "asset://..."}`)
   returns `bpm`, and `beats`, `downbeats` and `onsets` in seconds.
2. Put each `transition`'s `at` half its `duration` before a downbeat, and
   start block entrances (`timing.offset`) on beats.
3. Make something pulse with the music:
   `"scale": { "audio": { "src": "song.mp3", "band": "low", "range": [1, 1.15] } }`.
4. Mix the track: `{ "op": "audio", "params": { "src": "song.mp3", "gain": 0.8 } }`.

## Voiceover with matching captions (local server)

1. `ultrafast_voiceover {"text": "...", "wav": "vo.wav", "words": "vo.json"}`
   writes the speech and every word's time (system voices on macOS,
   eSpeak NG on Linux).
2. Add `{ "op": "audio", "params": { "src": "vo.wav" } }` and
   `{ "op": "captions", "params": { "src": "vo.json", "style": "karaoke" } }`.
3. Cut scenes on the words that name them: read the times in `vo.json`.

## Footage-free motion

- Background worlds: `gradient`, `noise`, `marble`, `starfield`, or a
  `shader` (Slang `float4 shade(float2 pos, float px)`).
- Product shots: `raymarch` (a distance-function scene with soft shadows and
  reflections) composited over 2D with `background: transparent`.
- Simulations: `fluid` (ink, smoke, fire) and `feedback` (trails, growth).
- Ask `ultrafast_ops {"ops": ["raymarch", "fluid"]}` for their params before
  writing them.

## Changing an existing video

- Text: `ultrafast_inspect` at the moment shows each visible element's node
  and words; `set_param` on that node.
- Timing: `set_timing` on the node, or move the `transition` `at`.
- Size or aspect: `set_format` with the new width and height. Blocks,
  captions, stacks and `fit` follow; check hand-placed `position`s and run
  review.
