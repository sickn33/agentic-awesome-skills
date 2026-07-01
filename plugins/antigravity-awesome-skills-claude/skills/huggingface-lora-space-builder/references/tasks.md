# Tasks: per-task baseline UI patterns

This file describes the *baseline* UI shape for each task category. Use it after the LoRA's task is identified, as a starting skeleton. Then read `adapting-to-the-lora.md` to shape the actual UI to the specific LoRA — the baseline is rarely the right final answer.

The five tasks: text-to-image, image-to-image, text-to-video, image-to-video, video-to-video.

## Common to all tasks

- Layout: two-column `gr.Row` with `equal_height=True`. Inputs on the left, outputs on the right.
- One primary `gr.Button("Generate", variant="primary", size="lg")`. No secondary buttons unless they do meaningfully different things.
- An `Advanced` accordion (`gr.Accordion("Advanced", open=False)`) for power-user controls that most users will never touch (seed, randomize seed, advanced sampler params).
- Always include a seed control with a "Randomize seed" checkbox, and return the actually-used seed alongside the result so users can reproduce.
- Wire up `prompt.submit` as well as button click for text inputs, so Enter works.
- Use `gr.Progress(track_tqdm=True)` so diffusers' internal progress bar surfaces.

## Text-to-image (T2I)

**Inputs:** prompt (`gr.Textbox`, `lines=2`, with example placeholder). Aspect ratio or resolution control. Optional: negative prompt for models that support it.

**Outputs:** `gr.Image` (or `gr.Gallery` if returning more than one).

**Standard advanced controls:** seed, randomize seed, num inference steps, guidance scale. Hide steps and guidance entirely for few-step LoRAs (Lightning, Turbo, schnell).

**Aspect ratio handling:** offer a dropdown of common ratios with width/height auto-derived. Snap dimensions to the model's native bucket size (16 for most diffusion transformers, 8 for older UNet-based). Show width/height as read-only display.

**Examples:** lift example prompts from the LoRA model card into a `gr.Examples` block. Use `cache_examples=True, cache_mode="lazy"` so caching defers to first click instead of failing at build time on ZeroGPU.

## Image-to-image (I2I)

**Inputs:** input image (`gr.Image(type="pil")` or `numpy` depending on what your processing wants), instruction or prompt (`gr.Textbox`).

**Outputs:** `gr.Image`. For edit LoRAs, consider `gr.ImageSlider` (built-in) for before/after comparison instead of a separate image.

**Resolution handling:** for instruction-edit pipelines (Qwen-Image-Edit, Flux Kontext, Flux.2 Klein), resize the input to the nearest multiple of the model's bucket size, preserving aspect. Don't crop unless the LoRA expects a specific aspect.

**Validation:** raise `gr.Error("Please upload an image first.")` when the input is empty. Consider disabling Generate until an image is loaded (`run_button.interactive = False`, flip on `input_image.change`).

**Sub-task variants change a lot here.** Read `adapting-to-the-lora.md` — relighting, face swap, object move, style transfer, instruction edits, inpainting all live under "I2I" but call for different UIs.

## Text-to-video (T2V)

**Inputs:** prompt. Duration slider (1–10 seconds typical, depending on the model's max). Resolution/aspect picker.

**Outputs:** `gr.Video(autoplay=True)`. Set `format="mp4"` and pick fps explicitly (24 is a safe default; some models prefer 16 or 30).

**Standard advanced controls:** seed, randomize seed, fps. Steps usually locked for distilled video models.

**Duration awareness:** set `@spaces.GPU(duration=...)` to comfortably exceed expected generation time. For 5-second 720p video, 180+ seconds of GPU time is realistic. Tell the user in the UI that generation takes a while ("Generating a 5s video takes about 2 minutes").

**Frame count math:** most video diffusion models want frame counts that are `8k+1` or similar. Compute `num_frames` from `duration * fps` and round to the nearest valid value rather than passing arbitrary frames. The base-model reference file says what's valid for each model.

## Image-to-video (I2V)

**Inputs:** input image (the first frame, or a stylistic reference depending on the LoRA), prompt describing the motion. Duration.

**Outputs:** `gr.Video`.

**Aspect ratio:** auto-detect from the input image and snap to the model's nearest bucket. Show the chosen resolution as info text.

**Variants:** some I2V LoRAs use the input image as the literal first frame; others use it as a stylistic reference and generate a new first frame from the prompt. The model card usually says which. The UI for both is similar; the difference is in how `image=` is passed to the pipeline and whether a "use as first frame" toggle makes sense.

## Video-to-video (V2V)

**Inputs:** at minimum, a source video. Almost always also a prompt. Often additional inputs depending on what the LoRA does (reference image for appearance, mask, control video, etc.).

**Outputs:** `gr.Video`. For LoRAs that do preprocessing on the input (pose extraction, depth estimation, padding), show the preprocessed intermediate as a second smaller video alongside the result, so the user sees what the model actually saw.

**This is where adaptation matters most.** "V2V" alone tells you almost nothing about the UI. Pose-control, depth-control, canny-control, outpainting, inpainting, style transfer, motion transfer, frame interpolation, and upscaling are all V2V and all need different UIs. Always read `adapting-to-the-lora.md` and the per-base-model file before designing.

**Common patterns:**

- Preprocessing preview: a small `gr.Video(height=240)` showing the extracted pose / depth / canny / padded video. Update it on input change so the user sees the preprocessed result before clicking Generate.
- Two-input layout for motion-transfer LoRAs: source video + appearance image, clearly labeled.
- Aspect-ratio picker only when the LoRA actually changes aspect (outpainting). For pose/depth/canny control, output aspect matches input.

## Picking components

Walk this ladder in order. Stop at the first rung that fits the LoRA's input shape.

**1. Stock Gradio components.** First choice almost always:

- `gr.ImageSlider` — built-in before/after comparison for edit LoRAs.
- `gr.ImageEditor` — upload + paint on top of an image. The right pick for any LoRA whose "input shape" is "a region of the image" expressed by painting — object removal trained on red-highlighted regions, relight trained on colored brush strokes, scribble-conditioned edits. Constrain the brush with `gr.Brush(default_color="#ff0000", colors=["#ff0000"])` so the user can only paint in the color the LoRA was trained on; the editor returns `{"background", "layers", "composite"}` and the `composite` is what you feed the pipeline. Used in production by `linoyts/QIE-2509-Object-Remover-Bbox-v3` (qie-2509-object-remover) — don't reach for `gradio_image_annotation` for these tasks just because the LoRA was trained "with bboxes"; the user-facing shape is a painted region, not a literal box.
- `@gr.render` — UI that changes shape based on input (e.g. show extra controls only when an input is uploaded).
- `gr.Examples` — clickable example inputs. Almost always worth including. Lift from the LoRA's model card.
- `gr.BrowserState` — persist user preferences (preferred aspect ratio, last seed, etc.) across sessions.
- `gr.DeepLinkButton` — share a specific generation as a URL.

**2. Hub custom components.** A `pip install` and an import, no JS to maintain:

- `gradio_image_annotation` — bbox/point annotation on top of an image. Right when the LoRA literally needs box *coordinates* as structured input (e.g. drag-and-drop "move from box A to box B" LoRAs, region-tagged edits). Wrong when the LoRA wants a painted region — use `gr.ImageEditor` instead.
- `gradio_imageslider` — alternative before/after slider with extra controls.
- `gradio_modal` — modal dialogs.
- `gradio_rangeslider` — dual-handle range slider.

Browse the rest at https://www.gradio.app/custom-components/gallery before going further down the ladder.

**3. Creative mode (custom HTML/JS).** When stock and Hub custom components both come up short — point sets, strokes, trajectories, region selections with metadata, 3D rotation gizmos, timeline scrubbers, anything where the user manipulates a thing on top of media. See `creative-mode.md` for the Gradio primitives, the JS↔Python communication contract, and the pitfalls. Don't skip rung 2 to get here — `gradio_image_annotation` already covers a lot of what looks like it needs custom HTML.

Themes: default to `gr.themes.Citrus()`.

Before defaulting to a plain component or guessing at a custom one, web-fetch the current Gradio docs at https://www.gradio.app/docs.

## Gradio 6.x gotchas

The current `sdk_version` (6.x at time of writing — verify with `pip index versions gradio`) changed a few things that older recipes get wrong. The failures are easy to miss because they happen at the Space's first import, not when you write the file locally.

- **`theme=` and `css=` moved from `gr.Blocks(...)` to `demo.launch(...)`.** Passing them to `Blocks` now emits a deprecation warning and the styling silently doesn't apply. Always:

  ```python
  with gr.Blocks(title="...") as demo:
      ...

  if __name__ == "__main__":
      demo.launch(theme=gr.themes.Citrus(), css=CSS)
  ```

  Spaces runs `app.py` as `__main__`, so the `launch()` call executes.

- **Some component kwargs were removed.** `gr.Image` no longer accepts `show_download_button` (the same change affects a handful of other components). The Space fails at import with `TypeError: __init__() got an unexpected keyword argument 'show_download_button'` — not surfaced until the container actually starts. When in doubt, web-fetch the current docs for the specific component before passing non-obvious kwargs.

- **The Gradio version the Space runs at is set by `sdk_version:` in the README YAML, *not* by `requirements.txt`.** Pinning `gradio` in `requirements.txt` is at best ignored and at worst causes a runtime mismatch; set the version once, in the README, and write `app.py` against that version.

If the first build fails on a `TypeError` or signature mismatch in a Gradio component, this is the most common cause — read `/logs/container` (build) or `/logs/run` (runtime), look at the line in `app.py`, and check the current component signature.