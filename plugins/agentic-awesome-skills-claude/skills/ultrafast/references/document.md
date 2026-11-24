# The ultrafast document

One JSON file is one video. The engine reloads it when it changes, so you
can write it directly or change it with edit batches.

```json
{
  "version": 1,
  "format": { "width": 1080, "height": 1920, "fps": 30, "duration": 10,
              "motion_blur": { "samples": 6, "shutter": 0.5 } },
  "nodes": {
    "<id>": { "op": "<op>", "params": { }, "inputs": { }, "timing": { } }
  },
  "components": { },
  "output": "<id>"
}
```

## format

- `width`, `height`: any size in pixels. Common: 1080x1920 (9:16 Reels,
  TikTok, Shorts), 1080x1080 (1:1), 1080x1350 (4:5), 1920x1080 (16:9),
  3840x2160 (4K). Blocks, captions, stacks and `fit` follow the frame.
- `fps`, `duration` (seconds).
- `motion_blur`: `samples` and `shutter` (0..1), plus `max_samples` for whip
  pans. Each moving layer is blurred on its own; footage and shaders hold at
  the frame's time.

## nodes

Each node has an `op`, its `params`, its `inputs` (other node ids on named
ports) and optional `timing`.

- **Sources** have no inputs: `solid`, `gradient`, `noise`, `text`, `shape`,
  `path`, `image`, `video`, `svg`, `lottie`, `block`, `captions`, `code`,
  shaders, 3D scenes, particles.
- **Effects** take `source`: `transform`, `crop`, `grade`, `adjust`, `blur`,
  `grain`, `bloom`, `vignette`, `stroke_outline`, `drop_shadow`, and more.
- **Composites** take `fg` and `bg`: `over` (and blend modes); `transition`
  takes `a` and `b`; `stack` takes `in0`, `in1`, ...
- `audio` nodes are mixed into the export wherever they are in the graph.

`ultrafast_ops` (or `uf ops --markdown`) lists every op with its ports and
params (type, default, what it does). Ask for full detail on a few ops with
`ultrafast_ops {"ops": ["text", "captions"]}`.

Generators (`solid`, `gradient`, `noise`, shaders) are infinite: crop or
transform them to make panels. Text and paths stay vector until rasterized,
so a `transform` placed directly on them stays sharp at any scale.

## Params and animation

A param is a constant or animated:

```json
"size": 64
"position": { "keys": [ { "t": 0, "v": [540, 2100], "ease": "out_expo" },
                        { "t": 0.8, "v": [540, 960] } ] }
"rotation": { "keys": [ { "t": 0, "v": 0 }, { "t": 1, "v": 10 } ], "repeat": "pingpong" }
"position": { "wiggle": { "frequency": 2, "amplitude": 10, "base": [540, 960] } }
"scale":    { "oscillate": { "frequency": 0.5, "amplitude": 0.05, "base": 1 } }
"opacity":  { "expr": "0.5 + 0.5 * sin(t * 3)" }
"scale":    { "audio": { "src": "song.mp3", "band": "low", "range": [1, 1.15] } }
```

- **Keys**: `t` in seconds (the node's local time), `v` the value, `ease`
  for the segment that starts at this key. Eases: `linear`, `hold`,
  `in_quad`, `out_quad`, `in_out_quad`, `in_cubic`, `out_cubic`,
  `in_out_cubic`, `in_sine`, `out_sine`, `in_out_sine`, `in_expo`,
  `out_expo`, `in_out_expo`, `in_back`, `out_back`, `in_out_back`,
  `out_elastic`, `out_bounce`, `spring`, `{"bezier": [x1, y1, x2, y2]}` or
  `{"spring": [damping, stiffness]}`. `repeat`: `cycle` or `pingpong`.
- **Drivers**: `wiggle` (smooth noise: `frequency`, `amplitude`, `base`,
  `seed`, `octaves`), `oscillate` (`frequency`, `amplitude`, `base`,
  `phase`, `wave`), `audio` (follows a soundtrack band: `src`, `band`
  all|low|mid|high, `range` [silent, loudest], `smooth`, `start`).
- **Expressions**: `{"expr": "..."}`, a formula of `t`; a list of formulas
  for vectors.

## timing

```json
"timing": { "in": 2, "out": 6, "offset": 2, "speed": 0.5 }
```

- `in`, `out`: when the node is on screen. Outside its window a composite
  passes its background through and an effect passes its source; neither
  costs anything.
- `offset`: where the node's local time zero sits in its parent's time
  (keys and block entrances are in local time). `speed`: local seconds per
  parent second (negative plays backwards). `loop`: local time wraps.
- Windows compose through nesting. For cuts between shots, use `transition`
  nodes: each shot renders only while it is on screen.

## components

A component is a small document with its own params and inputs, used like
an op. Inside it, `"$name"` refers to one of its params. SVG artwork and
Lottie animations import as components with every part editable
(`ultrafast_import_svg`, `uf import-svg`, `uf import-lottie`).

## Assets, colour and type

- Paths (footage, images, fonts, SVG, Lottie, audio, captions) are relative
  to the document on the local server and CLI. On a remote server, use
  `asset://` ids from uploads or https URLs.
- Colours: `#rrggbb`, `#rrggbbaa`, or 0..1 arrays with straight alpha.
  Compositing is in linear light; `"space": "srgb"` on a node blends the way
  CSS and Figma do.
- Fonts: a family name (any Google Font is fetched once by name), a font
  file, or a bundled face: `ultrafast:display`, `ultrafast:sans`,
  `ultrafast:serif`, `ultrafast:mono`, `ultrafast:wide`. Variable fonts
  animate `weight` and any axis with `axis_<tag>`.
- Text spans: `*word*` takes the `em_` params (`em_color`, `em_font`,
  `em_weight`, `em_highlight`, `em_underline`, ...);
  `[300 fps]{color=#7cf underline=4}` styles a one-off span.

## Edit batches

`ultrafast_edit` (and `uf edit doc.json edits.json`) applies a list of edits
in order, all or nothing:

```json
[
  { "edit": "set_param", "node": "title", "param": "title", "value": "Spin something new" },
  { "edit": "add_layer", "id": "who", "node": { "op": "block", "params": { "kind": "lower_third", "name": "Mira Chen", "role": "Producer" }, "timing": { "offset": 1 } } },
  { "edit": "set_timing", "node": "who", "timing": { "offset": 1, "in": 0, "out": 5 } },
  { "edit": "remove_node", "id": "old_logo" }
]
```

| edit | fields |
|---|---|
| `set_param` | `node`, `param`, `value` (a constant or animated param) |
| `remove_param` | `node`, `param` |
| `add_node` | `id`, `node` |
| `add_layer` | `id`, `node`: added over the current output (an `over` named `<id>_over` becomes the output), the quickest way to put something on screen |
| `remove_node` | `id` |
| `connect` | `node`, `port`, `source` |
| `disconnect` | `node`, `port` |
| `set_output` | `node` |
| `set_format` | `format` (the whole format object) |
| `set_timing` | `node`, `timing` (`null` clears it) |
| `set_component` | `name`, `component` (`null` removes it) |

The reply lists problems on the nodes you touched.

## Schema

Documents carry `"version": 1`. The JSON Schema is at
https://ultrafast.mov/schema/v1.json (`uf schema` prints it). Changes within
a version only add things.
