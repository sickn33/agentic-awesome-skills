# Creative mode: custom HTML/JS UIs in Gradio

When a LoRA's natural input shape doesn't fit any standard Gradio component or Hub custom component, you can drop down to plain HTML/CSS/JS inside a Gradio app. This file is about *how* — the Gradio primitives that make it work, and the discipline that keeps it from turning into a tangled mess.

This is the third rung of the component ladder (see `tasks.md` → "Picking components"):

1. **Stock Gradio components.** First choice. Almost always enough for T2I and a lot of I2I.
2. **Hub custom components.** `gradio_image_annotation`, `gradio_imageslider`, `gradio_modal`, `gradio_rangeslider`, etc. No JS, just a `pip install` and an import.
3. **Creative mode (this file).** Custom HTML/JS, when the user's input shape is something none of the above expresses well — point sets, trajectories, brush strokes, region selections with metadata, timeline scrubbing, 3D rotation gizmos, color picking on regions, drag-resize handles on media, keyframed inputs, anything where the user manipulates *a thing on top of media*.

Skipping rung 2 is a common mistake. If a Hub custom component fits, use it — `gradio_image_annotation` already covers bbox drawing, label assignment, and basic editing without a single line of JS.

But rung 2 has its own discipline (see "Hub custom components are fragile" below). The most common failure mode for these Spaces is **the custom component silently fails to render**: the Python side imports fine, the page loads, the API smoke-test in Phase 6 of `SKILL.md` passes — and yet the widget just isn't on the page. A user opening the Space sees the surrounding layout (buttons, accordions, outputs) but no upload zone, no annotator, nothing. If you don't actually look at the rendered page in a browser, you'll ship a broken Space and not know it.

## Hub custom components are fragile

Treat any `gradio_*` package from the Hub as load-bearing-and-untested-against-your-Gradio-version until you've seen it render. The most common failure modes:

- **Version mismatch silent breakage.** A Hub component built against Gradio N may load (because its declared `gradio<N+2,>=N` range covers your `sdk_version`) but mount to an empty DOM node on a slightly newer Gradio. No traceback in the build logs. No Python error. The component simply doesn't appear, and the rest of the column flows up around the gap. This is what produces "Generate button at the top of an empty left column" Spaces.
- **Stale releases.** Many Hub custom components were last published 1–2 years ago. The Gradio frontend has changed since. Check the package's release date against the Gradio version you're targeting; if there's a multi-major-version gap, expect breakage.
- **Mismatched param shapes.** The component's Python signature accepts a parameter the Svelte side no longer reads. Your `disable_edit_boxes=True` does nothing, or worse, throws on the JS side and the whole component fails to mount.

Discipline before committing to a Hub component:

1. **Check the package's last release date** (PyPI page or `pip index versions <pkg>`). If it's older than the Gradio release in your `sdk_version`, treat it as suspect.
2. **Smoke-test the component in isolation** — a five-line Gradio app with just that one component, locally, *before* integrating it into the full app. If it renders, fine. If it's missing or blank, you've caught the breakage cheaply.
3. **When a Hub component fails to render, don't iterate on its kwargs.** Drop to either (a) split stock components (e.g. `gr.Image` for upload + a sibling widget for the box coords) or (b) rung 3 (custom HTML/JS via `gr.HTML`). Twiddling `disable_edit_boxes` / `use_default_label` / `sources` is not going to bring a Svelte component back from a JS-side mount failure.

The same discipline applies to less obviously "custom" components if they were added recently — `gr.ImageSlider`, for example, can render unexpectedly when paired with a custom component on the same page.

## When creative mode is the right call

Reach for it when the user's *natural* input is structurally outside what stock components express:

- **Spatial input on top of media.** Drawing arrows on a frame, painting strokes on an image, dropping points along a trajectory, selecting irregular regions, drawing curves.
- **Multi-shape annotation.** Source-and-destination box pairs, multiple labeled regions, ordered sequences of points/boxes that are semantically distinct.
- **Continuous-with-snapping controls.** 3D rotation gizmos, dial/wheel controls, timeline scrubbers — anything where a slider would technically work but feel wrong.
- **Composite controls bound together.** A canvas plus a color picker plus a brush-size dial that all feed the same structured input, where binding three separate components and reasoning about their joint state is uglier than rolling one widget.
- **Live preview that depends on multiple inputs.** Something the user wants to see *immediately* as they manipulate, where a server roundtrip per change is too slow.

If the input is "a number," "a string," or "an image," you don't need this. Don't build a custom canvas because it would look cool — build it because the LoRA's input shape demands it.

## The Gradio primitives

Before reading the patterns below, it's worth re-checking the current Gradio docs for anything that landed recently:

- `gr.HTML` — https://www.gradio.app/docs/gradio/html
- Custom components — https://www.gradio.app/guides/custom-components-in-five-minutes
- `Blocks.launch(head=, css=)` — https://www.gradio.app/docs/gradio/blocks#blocks-launch

WebFetch these if you're unsure about a signature. The custom-HTML surface area evolves and lagging on it produces Spaces that "work" in stale ways.

The primitives that creative mode is built from:

### `gr.HTML` for arbitrary markup

Drop any HTML into the page. The block becomes a regular Gradio component, but its content is whatever you write. You're responsible for everything inside it: layout, styling, interactivity.

```python
gr.HTML("""
<div id="my-widget" style="...">
  <canvas id="my-canvas" width="512" height="512"></canvas>
  <div id="my-status"></div>
</div>
""")
```

### `demo.launch(head=..., css=...)`

Inject `<script>` and `<style>` tags into the page `<head>`. This is how you load external JS libraries (Three.js, p5, fabric, anime.js, …) or define page-wide CSS that needs to be in `<head>` rather than inline.

```python
head = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
css  = '.fillable {max-width: 1200px !important}'
demo.launch(head=head, css=css)
```

Use the highest-quality CDN you can (cdnjs, jsdelivr, unpkg). Pin the version (`/three.js/r128/`, not `/three.js/latest/`). Loading from the LoRA author's personal server is a recipe for the Space breaking when their server moves.

### `elem_id` and `elem_classes` for addressing

Every Gradio component accepts `elem_id="..."` and `elem_classes=[...]`. JS uses these to find the rendered DOM nodes:

```python
prompt_box = gr.Textbox(elem_id="my-prompt", elem_classes=["hidden-input"])
```

```javascript
const promptBox = document.getElementById("my-prompt");
// Note: the Gradio component wraps an <input> or <textarea>;
// you usually want the inner element:
const inner = promptBox.querySelector("input, textarea");
```

### Two ways JS pushes state into Python

This is the part that trips people up. Pick whichever fits your case and stick with it for the whole widget — mixing them in one app is confusing.

**Approach A — Hidden Gradio input + DOM event dispatch.** Define a hidden `gr.Textbox` (or `gr.JSON`, `gr.Number`, etc.). From JS, set its inner `<input>`/`<textarea>` value and dispatch synthetic `input` and `change` events so Gradio's reactivity fires.

```python
state_json = gr.Textbox(value="{}", elem_id="state-json", visible=False)
```

```javascript
function setGradioValue(elemId, value) {
  const container = document.getElementById(elemId);
  if (!container) return;
  const el = container.querySelector("input, textarea");
  if (!el) return;
  const proto = el.tagName === "TEXTAREA"
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  setter.call(el, value);
  el.dispatchEvent(new Event("input",  { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

setGradioValue("state-json", JSON.stringify(myState));
```

The native setter dance (`Object.getOwnPropertyDescriptor(...).set.call(el, value)`) is necessary because React intercepts plain `el.value = ...` assignments and they won't trigger a re-render. The DOM event dispatch is what makes Gradio see the change.

This approach works in any Gradio version, with any component type. Downsides: lots of glue, fragile to DOM structure changes, easy to write race conditions.

**Approach B — `gr.HTML` subclass with `html_template`/`js_on_load`.** Newer Gradio supports subclassing `gr.HTML` and providing custom props plus a `js_on_load` script. The script gets a `props` object with custom values and a `trigger()` function for emitting events back to Python. State binding is value-based (Gradio reads the `value` prop just like any other component).

```python
class PointPicker(gr.HTML):
    def __init__(self, value=None, image_url=None, **kwargs):
        super().__init__(
            value=value or {"points": []},
            html_template="<canvas id='pp-canvas' width='512' height='512'></canvas>",
            js_on_load="""
                const canvas = document.getElementById('pp-canvas');
                canvas.addEventListener('click', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top)  / rect.height;
                    props.value = {points: [...(props.value?.points || []), {x, y}]};
                    trigger('change', props.value);
                });
            """,
            image_url=image_url,
            **kwargs,
        )
```

Cleaner, value-based, no hidden inputs. Downsides: requires a Gradio version recent enough to support the subclass shape, and the JS lives inside a Python string, which IDEs don't lint.

**Picking between A and B:** if you're starting fresh and on current Gradio, prefer B — the binding semantics are saner. Reach for A when you need to integrate with already-existing Gradio components (sliders that should mirror the canvas state, prompt boxes the canvas writes into) or when the UI shell is large enough that putting it inside a `gr.HTML` subclass is awkward.

### Two ways Python pushes state into JS

- **For B (subclass):** return `gr.update(prop=value)` from an event handler. The widget's polling loop sees the prop change and reacts.
- **For A (hidden input):** write to a hidden Gradio Textbox from your event handler. JS polls the Textbox value (or hooks into Gradio's mutation observer) and reacts.

Either way, expect a small polling interval (50–200ms is typical). Don't poll faster — it will dominate CPU on weaker machines.

### `js=` on event handlers

For tiny JS-only transforms (e.g. "scroll to result on click"), event handlers accept a `js=` arg that runs in the browser without a server roundtrip:

```python
btn.click(fn=infer, inputs=[...], outputs=[...], js="() => { window.scrollTo(0, 0); }")
```

Useful for UI polish (scroll, focus, show/hide loaders), not for state management.

## The communication contract

The single most important discipline in creative mode: **define the JSON shape that flows between JS and Python, and treat it as the API.**

Write it down at the top of `app.py` as a comment, even one line. Pick names that survive translation between camelCase JS and snake_case Python (or commit to one and convert at the boundary):

```python
# State shape on the JS↔Python wire:
#   {
#     "src":    {"x1": float, "y1": float, "x2": float, "y2": float} | null,
#     "dst":    {"x1": float, "y1": float, "x2": float, "y2": float} | null,
#     "label":  string | null
#   }
```

Once it's written down, both sides have a target to conform to and you'll catch shape drift early.

Common shape archetypes — none of these are required, just illustrative:

- **Point set:** `{"points": [{"x": 0.3, "y": 0.4}, ...]}`
- **Stroke set:** `{"strokes": [{"color": "#ff0", "size": 12, "points": [...]}, ...]}`
- **Regions:** `{"regions": [{"label": "subject", "bbox": {...}}, ...]}`
- **Transform:** `{"azimuth": 45, "elevation": 0, "distance": 1.0}`
- **Trajectory with time:** `{"keyframes": [{"t": 0.0, "x": ...}, {"t": 0.5, ...}]}`

All coordinates normalized to `[0, 1]` is almost always the right call — it survives image resizing without rescaling math.

## External libraries

Use what helps. Stay light when you can.

- **Pure canvas + DOM** is enough for: drawing rectangles/points/lines, brush strokes, drag-and-drop handles, image overlays.
- **SVG** for: vector overlays, especially when the marks need to scale crisply or be styled with CSS.
- **Three.js** for: 3D rotation gizmos, depth visualizations, anything where you need WebGL rendering of a small scene. Pulled in via `head=` script tag.
- **fabric.js / paper.js / konva** for: complex shape-on-canvas interactions when raw canvas is getting ugly. Worth it once you've added more than ~200 lines of canvas glue.
- **p5.js** for: rapid prototyping of generative-art-style canvases. Heavier than necessary for production.

When in doubt, raw canvas. Pulling in fabric for a single rectangle is overkill; pulling in three.js because you wanted "fancier sliders" is a smell.

## Pitfalls

These bite repeatedly. Read before writing.

- **Silent mount failure of Hub custom components.** Covered in detail above. Worth restating because it's the failure mode that the API smoke-test cannot catch: the component imports, the page loads, and the widget is just absent from the DOM. Always verify in a browser; never trust "the build went green" as proof a Hub custom component renders.

- **Init race with Gradio mount.** The `js_on_load` (B) or a top-level `<script>` injected via `head` may run before Gradio has rendered the DOM nodes you're trying to hook into. Guard with a short `setTimeout` or wait for the element to exist:
  ```javascript
  function init() {
    const el = document.getElementById("my-widget");
    if (!el) { setTimeout(init, 50); return; }
    // ... do work
  }
  init();
  ```

- **Double init.** If the user navigates between tabs or Gradio re-renders, your init can fire twice. Stash a flag: `if (window.__myWidgetInited) return; window.__myWidgetInited = true;`.

- **Base64 image transfer cost.** Sending a full-resolution image as a base64 string through a hidden Textbox is fine for previews but punishingly slow for 4K images. Downscale on the JS side before stuffing into state, or pass the image through a real `gr.Image` component and only send the *interaction state* (boxes, points) through the hidden channel.

- **File inputs don't roundtrip through hidden Textboxes.** A hidden `gr.File` won't accept arbitrary JS-set values. If the user uploads via a custom `<input type="file">`, you have two options: (a) read the file in JS, base64-encode, and write to a hidden Textbox; (b) wire the custom file input to programmatically click a real `gr.File` (`document.querySelector("#real-file input").click()` is brittle but works).

- **Polling cadence.** 100ms is a reasonable default; 50ms feels snappy but burns CPU on weaker machines; 500ms feels laggy. Don't poll inside `requestAnimationFrame` for state sync — that's 60Hz and overkill.

- **Mobile / touch.** If the widget lives in a Space people will open on their phones, handle `touchstart`/`touchmove`/`touchend` alongside mouse events. The two-event-system thing is annoying but unavoidable.

- **ZeroGPU duration when payloads grow.** If the custom UI lets users submit large state (many points, big strokes, multiple boxes), the server-side processing time can grow with input size. Re-check `@spaces.GPU(duration=...)` against worst-case payloads.

- **Custom run buttons.** If you build your own "Run" button in HTML and have it trigger a real Gradio button via `.click()`, make sure state-sync (write to hidden inputs) happens *before* the click, with enough delay for events to propagate (`setTimeout(() => realBtn.click(), 50)` is the usual fix).

- **CSS isolation.** Spaces inject their own CSS. If your widget styles get clobbered, increase specificity (`#my-widget .foo` instead of `.foo`) or use `!important` sparingly. Don't fight it with inline styles for everything — that gets unreadable fast.

## Smoke-test caveat — applies to rung 2 AND rung 3

`gradio info` / `gradio predict` (Phase 6 of `SKILL.md`) only exercise the Python endpoint. They tell you nothing about what actually renders. For any Space that uses a Hub custom component (rung 2) or custom HTML/JS (rung 3), the Python side can be perfectly correct *and* the user can see a broken UI.

The two distinct failure modes:

- **Rung 2 silent mount failure.** Hub custom component imports cleanly, gets a slot in the Gradio config, and just doesn't appear in the rendered DOM. You see the components around it but the widget itself is gone — leaving e.g. a Generate button at the top of an otherwise empty column. No error anywhere. See "Hub custom components are fragile" above.
- **Rung 3 broken JS.** Server-side green, but `js_on_load` errored, or a CDN script failed to load, or your event handlers never bound. The widget mounts but doesn't do anything when clicked.

After the API smoke-test in Phase 6 passes, **open the Space URL in a browser and verify both that every component is visible and that one full interaction (upload → click Generate → see result) works** before sharing. This is not optional for these Spaces — it's the only check that catches the failure modes above.

If the user is in an environment where you can't drive a browser yourself, ask them to open the Space URL and confirm the upload zone is visible and accepts an image before declaring the Space done. The cost of asking is one extra message; the cost of skipping is shipping a Space that looks empty.

## Real-world examples

These two Spaces use the patterns above for very different LoRAs. They're useful as concrete proof the patterns work, not as templates to copy:

- **3D camera control via Three.js** (Approach B, `gr.HTML` subclass): https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera
- **Bounding-box drag/resize via canvas** (Approach A, hidden inputs + custom Run button): https://huggingface.co/spaces/linoyts/FLUX.2-klein-Move

A short look at each is worth it before designing a new widget — they show what "production polish" feels like in this register (snap-to-nearest animations, status overlays, cursor changes on hover, mobile-touch handling). But your widget will look different, because your LoRA wants different inputs.
