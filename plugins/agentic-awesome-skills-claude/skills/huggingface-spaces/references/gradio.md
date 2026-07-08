# Gradio for Spaces

Patterns and quirks specific to running Gradio inside a Space. Assumes you're already comfortable with stock Gradio components and `gr.Blocks` / `gr.Interface`.

For deeper Gradio API guidance — components, layouts, event listeners, chatbots, the Gradio 5→6 migration — use the dedicated `huggingface-gradio` skill. Install it with `hf skills add huggingface-gradio` (add `--claude --global` to also install for Claude Code, user-level).

For ZeroGPU-specific decorator + worker semantics, see [`zerogpu.md`](zerogpu.md).

## Themes and layout

- Default theme preference: `gr.themes.Soft()`. Alternatives: no theme, or `gr.themes.Citrus()`. Pick once and don't over-style.
- For apps that don't need full-width, constrain with CSS so they're readable on 4K displays:
  ```python
  CSS = """
  #col-container { max-width: 1100px; margin: 0 auto; }
  .dark .gradio-container { color: var(--body-text-color); }
  """
  with gr.Blocks(theme=gr.themes.Soft(), css=CSS) as demo: ...
  ```
  The dark-mode override fixes a recurring Gradio bug where dark text inherits unset colors.
- Width-cap with `!important` if Gradio 6's own breakpoints fight you — target `main`, `.gradio-container`, and the inner fillable wrapper, otherwise the width caps but goes flush-left.

## Minimal layout most demos converge to

```python
with gr.Row():
    prompt = gr.Textbox(show_label=False, placeholder="…", container=False, scale=4)
    run = gr.Button("Run", variant="primary", scale=1)
output = gr.Image(...)
with gr.Accordion("Advanced settings", open=False):
    ...
```

`container=False` on the inline Textbox removes the default outer border for a tighter look.

## `gr.Markdown` for the intro

Be succinct. Title, one-line description, a links section. Don't over-explain how it works — that's what the model card is for.

## `gr.Examples`

The pattern that doesn't trip people up:

```python
gr.Examples(
    examples=[
        ["a cat sitting on a windowsill", 42],
        ["mountains at sunset, photorealistic", 7],
    ],
    inputs=[prompt, seed],
    outputs=output,
    fn=generate,
    cache_examples=True,
    cache_mode="lazy",
)
```

Why these flags:

- `cache_examples=True` makes example clicks instant (no re-inference per visitor).
- **`cache_mode="lazy"`** — caches on first user click for each example. **Required on ZeroGPU** (Gradio's default on ZeroGPU is already lazy via `GRADIO_CACHE_MODE=lazy`). Eager would pre-run every example at app startup, but ZeroGPU has no GPU attached at startup — it'd fail and burn the creator's daily quota.
- `cache_examples=True` silently disables `run_on_click` / `run_examples_on_click`. If your app relies on click-only behavior, set `cache_examples=False`.

The cache key is the **example row's file path**, not a content hash. Regenerating an asset in place serves the stale cached output forever. If you replace example files, bump a `cache_version` marker or wipe `.gradio/cached_examples/<id>/`.

Hot-reload (rung 1) does **not** rebuild the cache. A `cache_version` bump needs a real commit + restart.

## Streaming and generators

`gr.Interface(fn=...)` and `.click(fn=...)` both accept generator functions. Each `yield` pushes a new value:

```python
@spaces.GPU(duration=120)
def generate(prompt):
    yield gr.update(value=None, label="Starting…")
    for k in range(num_steps):
        yield gr.update(value=preview(k), label=f"Step {k+1}/{num_steps}")
    yield gr.update(value=final, label="Done")
```

Use `gr.update(label=...)` for status narration — feels like a status line without a separate component.

**Caveat**: `gr.Progress(track_tqdm=True)` and `yield` partial outputs fight each other — pick one streaming mechanism.

## Useful UX bits

- `progress=gr.Progress(track_tqdm=True)` in the GPU function gives a free tqdm-driven progress bar.
- Pair a "Randomize seed" checkbox with the seed input, and write the actually-used seed back so users can re-run deterministically:
  ```python
  randomize = gr.Checkbox(label="Randomize seed", value=True)
  seed = gr.Number(label="Seed", value=0, precision=0)

  @spaces.GPU
  def gen(..., seed, randomize_seed):
      if randomize_seed:
          seed = random.randint(0, 2**31 - 1)
      seed = int(seed)
      yield ..., gr.update(value=seed)   # write back into the Seed input
      ...

  run.click(gen, inputs=[..., seed, randomize], outputs=[..., seed])
  ```

## Custom HTML components

Stock Gradio components cover 95% of cases. When they don't, `gr.HTML(...)` lets you build contextual custom UI without leaving the Gradio Space (no need to switch to Docker).

Guide: https://www.gradio.app/guides/custom-HTML-components
Example with a 3D camera-angle picker that makes sense in context: https://huggingface.co/spaces/multimodalart/qwen-image-multiple-angles-3d-camera

Don't reach for this if a stock component covers the need.

## Custom frontends — `gr.Server`

For fully custom frontends with their own HTML/JS, while keeping Gradio's queue + GPU scheduling:

```python
from gradio import Server
from fastapi.responses import HTMLResponse

app = Server(title="my-app")

@spaces.GPU(duration=60)
def _run_gpu(prompt): return inference(prompt)

@app.api(name="generate", concurrency_limit=1, time_limit=180)
def generate(prompt: str) -> str:
    return _run_gpu(prompt)        # @app.api wraps, doesn't stack with @spaces.GPU

@app.get("/", response_class=HTMLResponse)
async def homepage():
    return open("index.html").read()

demo = app                          # HF runtime expects `demo`
if __name__ == "__main__":
    demo.launch(ssr_mode=False)
```

Required for the custom `/` route to actually serve:

```bash
hf spaces variables add <ns>/<name> --env GRADIO_SSR_MODE=false
```

`launch(ssr_mode=False)` is ignored on HF — must be the env var.

Valid `@app.api` kwargs: `name`, `description`, `concurrency_limit`, `concurrency_id`, `queue`, `batch`, `max_batch_size`, `api_visibility`, `time_limit`, `stream_every`.

**Don't stack `@spaces.GPU` and `@app.api`** on the same function — silently breaks request flow. Keep them on separate functions.

**Two-ceiling coordination**: both `@spaces.GPU(duration=N)` and `@app.api(time_limit=M)` apply; the lower wins. Set `time_limit` to your max duration across modes — a too-low `time_limit` kills the request even if GPU duration would have allowed it.

Hot-reload (rung 1 in [`debugging.md`](debugging.md)) does **not** work with `gr.Server` — always `hf upload` or commit.

Reference Space: https://huggingface.co/spaces/huggingface-projects/rf-detr-realtime-webcam

## Slow-startup Gradio (big-model Spaces)

For Spaces that take 10–20 min to load weights:

- Set `startup_duration_timeout: 1h` in README frontmatter (default 30 min).
- Disable SSR: `hf spaces variables add <id> --env GRADIO_SSR_MODE=false`. Otherwise the SSR health check times out before the app finishes loading.

## Don't

- `gr.Button(text="X")` — `text=` was removed; use `gr.Button("X")`.
- `gr.Button(type="button")` — drop the kwarg.
- `.click(..., _js=share_js)` — renamed to `js=`.
- `.style(height=...)` — removed in gradio 4+.
- `gr.ImageMask(brush_color=...)` — kwarg removed.
- `demo.launch(mcp_server=True)` on gradio 4.x — only valid on 5+.
