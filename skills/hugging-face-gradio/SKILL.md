---
source: "https://github.com/huggingface/skills/tree/main/skills/huggingface-gradio"
name: hugging-face-gradio
description: Build or edit Gradio apps, layouts, components, and chat interfaces in Python.
risk: unknown
---

# Gradio

## When to Use
Use this skill when a user wants a Gradio demo, UI prototype, or Python-based ML interface.

Gradio is a Python library for building interactive web UIs and ML demos. This skill covers the core API, patterns, and examples.

## Guides

Detailed guides on specific topics (read these when relevant):

- [Quickstart](https://www.gradio.app/guides/quickstart)
- [The Interface Class](https://www.gradio.app/guides/the-interface-class)
- [Blocks and Event Listeners](https://www.gradio.app/guides/blocks-and-event-listeners)
- [Controlling Layout](https://www.gradio.app/guides/controlling-layout)
- [More Blocks Features](https://www.gradio.app/guides/more-blocks-features)
- [Custom CSS and JS](https://www.gradio.app/guides/custom-CSS-and-JS)
- [Streaming Outputs](https://www.gradio.app/guides/streaming-outputs)
- [Streaming Inputs](https://www.gradio.app/guides/streaming-inputs)
- [Sharing Your App](https://www.gradio.app/guides/sharing-your-app)
- [Custom HTML Components](https://www.gradio.app/guides/custom-HTML-components)
- [Getting Started with the Python Client](https://www.gradio.app/guides/getting-started-with-the-python-client)
- [Getting Started with the JS Client](https://www.gradio.app/guides/getting-started-with-the-js-client)

## Core Patterns

**Interface** (high-level): wraps a function with input/output components.

```python
import gradio as gr

def greet(name):
    return f"Hello {name}!"

gr.Interface(fn=greet, inputs="text", outputs="text").launch()
```

**Blocks** (low-level): flexible layout with explicit event wiring.

```python
import gradio as gr

with gr.Blocks() as demo:
    name = gr.Textbox(label="Name")
    output = gr.Textbox(label="Greeting")
    btn = gr.Button("Greet")
    btn.click(fn=lambda n: f"Hello {n}!", inputs=name, outputs=output)

demo.launch()
```

**ChatInterface**: high-level wrapper for chatbot UIs.

```python
import gradio as gr

def respond(message, history):
    return f"You said: {message}"

gr.ChatInterface(fn=respond).launch()
```

## Key Component Signatures

### `Textbox(value: str | I18nData | Callable | None = None, type: Literal['text', 'password', 'email'] = "text", lines: int = 1, max_lines: int | None = None, placeholder: str | I18nData | None = None, label: str | I18nData | None = None, info: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, autofocus: bool = False, autoscroll: bool = True, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", text_align: Literal['left', 'right'] | None = None, rtl: bool = False, buttons: list[Literal['copy'] | Button] | None = None, max_length: int | None = None, submit_btn: str | bool | None = False, stop_btn: str | bool | None = False, html_attributes: InputHTMLAttributes | None = None)`
Creates a textarea for user to enter string input or display string output..

### `Number(value: float | Callable | None = None, label: str | I18nData | None = None, placeholder: str | I18nData | None = None, info: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", buttons: list[Button] | None = None, precision: int | None = None, minimum: float | None = None, maximum: float | None = None, step: float = 1)`
Creates a numeric field for user to enter numbers as input or display numeric output..

### `Slider(minimum: float = 0, maximum: float = 100, value: float | Callable | None = None, step: float | None = None, precision: int | None = None, label: str | I18nData | None = None, info: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", randomize: bool = False, buttons: list[Literal['reset']] | None = None)`
Creates a slider that ranges from {minimum} to {maximum} with a step size of {step}..

### `Checkbox(value: bool | Callable = False, label: str | I18nData | None = None, info: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", buttons: list[Button] | None = None)`
Creates a checkbox that can be set to `True` or `False`.

### `Dropdown(choices: Sequence[str | int | float | tuple[str, str | int | float]] | None = None, value: str | int | float | Sequence[str | int | float] | Callable | DefaultValue | None = DefaultValue(), type: Literal['value', 'index'] = "value", multiselect: bool | None = None, allow_custom_value: bool = False, max_choices: int | None = None, filterable: bool = True, label: str | I18nData | None = None, info: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", buttons: list[Button] | None = None)`
Creates a dropdown of choices from which a single entry or multiple entries can be selected (as an input component) or displayed (as an output component)..

### `Radio(choices: Sequence[str | int | float | tuple[str, str | int | float]] | None = None, value: str | int | float | Callable | None = None, type: Literal['value', 'index'] = "value", label: str | I18nData | None = None, info: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", rtl: bool = False, buttons: list[Button] | None = None)`
Creates a set of (string or numeric type) radio buttons of which only one can be selected..

### `Image(value: str | PIL.Image.Image | np.ndarray | Callable | None = None, format: str = "webp", height: int | str | None = None, width: int | str | None = None, image_mode: Literal['1', 'L', 'P', 'RGB', 'RGBA', 'CMYK', 'YCbCr', 'LAB', 'HSV', 'I', 'F'] | None = "RGB", sources: list[Literal['upload', 'webcam', 'clipboard']] | Literal['upload', 'webcam', 'clipboard'] | None = None, type: Literal['numpy', 'pil', 'filepath'] = "numpy", label: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, buttons: list[Literal['download', 'share', 'fullscreen'] | Button] | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, streaming: bool = False, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", webcam_options: WebcamOptions | None = None, placeholder: str | None = None, watermark: WatermarkOptions | None = None)`
Creates an image component that can be used to upload images (as an input) or display images (as an output)..

### `Audio(value: str | Path | tuple[int, np.ndarray] | Callable | None = None, sources: list[Literal['upload', 'microphone']] | Literal['upload', 'microphone'] | None = None, type: Literal['numpy', 'filepath'] = "numpy", label: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, streaming: bool = False, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", format: Literal['wav', 'mp3'] | None = None, autoplay: bool = False, editable: bool = True, buttons: list[Literal['download', 'share'] | Button] | None = None, waveform_options: WaveformOptions | dict | None = None, loop: bool = False, recording: bool = False, subtitles: str | Path | list[dict[str, Any]] | None = None, playback_position: float = 0)`
Creates an audio component that can be used to upload/record audio (as an input) or display audio (as an output)..

### `Video(value: str | Path | Callable | None = None, format: str | None = None, sources: list[Literal['upload', 'webcam']] | Literal['upload', 'webcam'] | None = None, height: int | str | None = None, width: int | str | None = None, label: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", webcam_options: WebcamOptions | None = None, include_audio: bool | None = None, autoplay: bool = False, buttons: list[Literal['download', 'share'] | Button] | None = None, loop: bool = False, streaming: bool = False, watermark: WatermarkOptions | None = None, subtitles: str | Path | list[dict[str, Any]] | None = None, playback_position: float = 0)`
Creates a video component that can be used to upload/record videos (as an input) or display videos (as an output).

### `File(value: str | list[str] | Callable | None = None, file_count: Literal['single', 'multiple', 'directory'] = "single", file_types: list[str] | None = None, type: Literal['filepath', 'binary'] = "filepath", label: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, height: int | str | float | None = None, interactive: bool | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", allow_reordering: bool = False, buttons: list[Button] | None = None)`
Creates a file component that allows uploading one or more generic files (when used as an input) or displaying generic files or URLs for download (as output).

### `Chatbot(value: list[MessageDict | Message] | Callable | None = None, label: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, container: bool = True, scale: int | None = None, min_width: int = 160, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, autoscroll: bool = True, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", height: int | str | None = 400, resizable: bool = False, max_height: int | str | None = None, min_height: int | str | None = None, editable: Literal['user', 'all'] | None = None, latex_delimiters: list[dict[str, str | bool]] | None = None, rtl: bool = False, buttons: list[Literal['share', 'copy', 'copy_all'] | Button] | None = None, watermark: str | None = None, avatar_images: tuple[str | Path | None, str | Path | None] | None = None, sanitize_html: bool = True, render_markdown: bool = True, feedback_options: list[str] | tuple[str, ...] | None = ('Like', 'Dislike'), feedback_value: Sequence[str | None] | None = None, line_breaks: bool = True, layout: Literal['panel', 'bubble'] | None = None, placeholder: str | None = None, examples: list[ExampleMessage] | None = None, allow_file_downloads: <class 'inspect._empty'> = True, group_consecutive_messages: bool = True, allow_tags: list[str] | bool = True, reasoning_tags: list[tuple[str, str]] | None = None, like_user_message: bool = False)`
Creates a chatbot that displays user-submitted messages and responses.

### `Button(value: str | I18nData | Callable = "Run", every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, variant: Literal['primary', 'secondary', 'stop', 'huggingface'] = "secondary", size: Literal['sm', 'md', 'lg'] = "lg", icon: str | Path | None = None, link: str | None = None, link_target: Literal['_self', '_blank', '_parent', '_top'] = "_self", visible: bool | Literal['hidden'] = True, interactive: bool = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", scale: int | None = None, min_width: int | None = None)`
Creates a button that can be assigned arbitrary .click() events.

### `Markdown(value: str | I18nData | Callable | None = None, label: str | I18nData | None = None, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool | None = None, rtl: bool = False, latex_delimiters: list[dict[str, str | bool]] | None = None, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", sanitize_html: bool = True, line_breaks: bool = False, header_links: bool = False, height: int | str | None = None, max_height: int | str | None = None, min_height: int | str | None = None, buttons: list[Literal['copy']] | None = None, container: bool = False, padding: bool = False)`
Used to render arbitrary Markdown output.

### `HTML(value: Any | Callable | None = None, label: str | I18nData | None = None, html_template: str = "${value}", css_template: str = "", js_on_load: str | None = "element.addEventListener('click', function() { trigger('click') });", apply_default_css: bool = True, every: Timer | float | None = None, inputs: Component | Sequence[Component] | set[Component] | None = None, show_label: bool = False, visible: bool | Literal['hidden'] = True, elem_id: str | None = None, elem_classes: list[str] | str | None = None, render: bool = True, key: int | str | tuple[int | str, ...] | None = None, preserved_by_key: list[str] | str | None = "value", min_height: int | None = None, max_height: int | None = None, container: bool = False, padding: bool = False, autoscroll: bool = False, buttons: list[Button] | None = None, server_functions: list[Callable] | None = None, props: Any)`
Creates a component with arbitrary HTML.


## Custom HTML Components

If a task requires significant customization of an existing component or a component that doesn't exist in Gradio, you can create one with `gr.HTML`. It supports `html_template` (with `${}` JS expressions and `{{}}` Handlebars syntax), `css_template` for scoped styles, and `js_on_load` for interactivity — where `props.value` updates the component value and `trigger('event_name')` fires Gradio events. For reuse, subclass `gr.HTML` and define `api_info()` for API/MCP support. See the [full guide](https://www.gradio.app/guides/custom-HTML-components).

Here's an example that shows how to create and use these kinds of components:

```python
import gradio as gr

class StarRating(gr.HTML):
    def __init__(self, label, value=0, **kwargs):
        html_template = """
        <h2>${label} rating:</h2>
        ${Array.from({length: 5}, (_, i) => `<img class='${i < value ? '' : 'faded'}' src='https://upload.wikimedia.org/wikipedia/commons/d/df/Award-star-gold-3d.svg'>`).join('')}
        """
        css_template = """
            img { height: 50px; display: inline-block; cursor: pointer; }
            .faded { filter: grayscale(100%); opacity: 0.3; }
        """
        js_on_load = """
            const imgs = element.querySelectorAll('img');
            imgs.forEach((img, index) => {
                img.addEventListener('click', () => {
                    props.value = index + 1;
                });
            });
        """
        super().__init__(value=value, label=label, html_template=html_template, css_template=css_template, js_on_load=js_on_load, **kwargs)

    def api_info(self):
        return {"type": "integer", "minimum": 0, "maximum": 5}


with gr.Blocks() as demo:
    gr.Markdown("# Restaurant Review")
    food_rating = StarRating(label="Food", value=3)
    service_rating = StarRating(label="Service", value=3)
    ambience_rating = StarRating(label="Ambience", value=3)
    average_btn = gr.Button("Calculate Average Rating")
    rating_output = StarRating(label="Average", value=3)
    def calculate_average(food, service, ambience):
        return round((food + service + ambience) / 3)
    average_btn.click(
        fn=calculate_average,
        inputs=[food_rating, service_rating, ambience_rating],
        outputs=rating_output
    )

demo.launch()
```

## Event Listeners

All event listeners share the same signature:

```python
component.event_name(
    fn: Callable | None | Literal["decorator"] = "decorator",
    inputs: Component | Sequence[Component] | set[Component] | None = None,
    outputs: Component | Sequence[Component] | set[Component] | None = None,
    api_name: str | None = None,
    api_description: str | None | Literal[False] = None,
    scroll_to_output: bool = False,
    show_progress: Literal["full", "minimal", "hidden"] = "full",
    show_progress_on: Component | Sequence[Component] | None = None,
    queue: bool = True,
    batch: bool = False,
    max_batch_size: int = 4,
    preprocess: bool = True,
    postprocess: bool = True,
    cancels: dict[str, Any] | list[dict[str, Any]] | None = None,
    trigger_mode: Literal["once", "multiple", "always_last"] | None = None,
    js: str | Literal[True] | None = None,
    concurrency_limit: int | None | Literal["default"] = "default",
    concurrency_id: str | None = None,
    api_visibility: Literal["public", "private", "undocumented"] = "public",
    time_limit: int | None = None,
    stream_every: float = 0.5,
    key: int | str | tuple[int | str, ...] | None = None,
    validator: Callable | None = None,
) -> Dependency
```

Supported events per component:

- **AnnotatedImage**: select
- **Audio**: stream, change, clear, play, pause, stop, pause, start_recording, pause_recording, stop_recording, upload, input
- **BarPlot**: select, double_click
- **BrowserState**: change
- **Button**: click
- **Chatbot**: change, select, like, retry, undo, example_select, option_select, clear, copy, edit
- **Checkbox**: change, input, select
- **CheckboxGroup**: change, input, select
- **ClearButton**: click
- **Code**: change, input, focus, blur
- **ColorPicker**: change, input, submit, focus, blur
- **Dataframe**: change, input, select, edit
- **Dataset**: click, select
- **DateTime**: change, submit
- **DeepLinkButton**: click
- **Dialogue**: change, input, submit
- **DownloadButton**: click
- **Dropdown**: change, input, select, focus, blur, key_up
- **DuplicateButton**: click
- **File**: change, select, clear, upload, delete, download
- **FileExplorer**: change, input, select
- **Gallery**: select, upload, change, delete, preview_close, preview_open
- **HTML**: change, input, click, double_click, submit, stop, edit, clear, play, pause, end, start_recording, pause_recording, stop_recording, focus, blur, upload, release, select, stream, like, example_select, option_select, load, key_up, apply, delete, tick, undo, retry, expand, collapse, download, copy
- **HighlightedText**: change, select
- **Image**: clear, change, stream, select, upload, input
- **ImageEditor**: clear, change, input, select, upload, apply
- **ImageSlider**: clear, change, stream, select, upload, input
- **JSON**: change
- **Label**: change, select
- **LinePlot**: select, double_click
- **LoginButton**: click
- **Markdown**: change, copy
- **Model3D**: change, upload, edit, clear
- **MultimodalTextbox**: change, input, select, submit, focus, blur, stop
- **Navbar**: change
- **Number**: change, input, submit, focus, blur
- **ParamViewer**: change, upload
- **Plot**: change
- **Radio**: select, change, input
- **ScatterPlot**: select, double_click
- **SimpleImage**: clear, change, upload
- **Slider**: change, input, release
- **State**: change
- **Textbox**: change, input, select, submit, focus, blur, stop, copy
- **Timer**: tick
- **UploadButton**: click, upload
- **Video**: change, clear, start_recording, stop_recording, stop, play, pause, end, upload, input

## Prediction CLI

The `gradio` CLI includes `info` and `predict` commands for interacting with Gradio apps programmatically. These are especially useful for coding agents that need to use Spaces in their workflows.

### `gradio info` — Discover endpoints and parameters

```bash
gradio info <space_id_or_url>
```

Returns a JSON payload describing all endpoints, their parameters (with types and defaults), and return values.

```bash
gradio info gradio/calculator
# {
#   "/predict": {
#     "parameters": [
#       {"name": "num1", "required": true, "default": null, "type": {"type": "number"}},
#       {"name": "operation", "required": true, "default": null, "type": {"enum": ["add", "subtract", "multiply", "divide"], "type": "string"}},
#       {"name": "num2", "required": true, "default": null, "type": {"type": "number"}}
#     ],
#     "returns": [{"name": "output", "type": {"type": "number"}}],
#     "description": ""
#   }
# }
```

File-type parameters show `"type": "filepath"` with instructions to include `"meta": {"_type": "gradio.FileData"}` — this signals the file will be uploaded to the remote server.

### `gradio predict` — Send predictions

```bash
gradio predict <space_id_or_url> <endpoint> <json_payload>
```

Returns a JSON object with named output keys.

```bash
# Simple numeric prediction
gradio predict gradio/calculator /predict '{"num1": 5, "operation": "multiply", "num2": 3}'
# {"output": 15}

# Image generation
gradio predict black-forest-labs/FLUX.2-dev /infer '{"prompt": "A majestic dragon"}'
# {"Result": "/tmp/gradio/.../image.webp", "Seed": 1117868604}

# File upload (must include meta key)
gradio predict gradio/image_mod /predict '{"image": {"path": "/path/to/image.png", "meta": {"_type": "gradio.FileData"}}}'
# {"output": "/tmp/gradio/.../output.png"}
```

Both commands accept `--token` for accessing private Spaces.

## Additional Reference

- [End-to-End Examples](examples.md) — complete working apps

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
