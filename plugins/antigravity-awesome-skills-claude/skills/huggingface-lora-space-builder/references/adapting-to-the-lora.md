# Adapting the demo to the specific LoRA

The task category (T2I, I2I, T2V, I2V, V2V) gets you a starting shape. It does not get you a UI. Two LoRAs in the same task category can need very different demos. This file is about the reasoning that gets you from "I know the task" to "I know what this demo should look like."

## The core question

For each LoRA, ask: **what does this LoRA actually need from the user, and what's the most natural way for the user to provide it?**

These are different questions. The model might need a pose video as conditioning. That doesn't mean the user has to provide a pose video — they can provide a regular video and the demo extracts pose from it. The model might need a black-bordered video for outpainting. That doesn't mean the user uploads a pre-bordered video — they upload a normal video and pick an aspect ratio, and the demo adds the borders.

The job of the demo is to translate between what the user has (a video, a photo, an idea) and what the model wants (pose conditioning, padded frames, masked latents, a prompt prefixed with a trigger word).

## Reading what the LoRA needs

Sources, in order of usefulness:

1. **The model card's example code snippet — for *parameters*.** If the README has a Python block showing how to call the LoRA, trust it for inference parameters: pipeline class, step count, guidance scale, true CFG, LoRA scale, dtype, resolution, negative prompt. Trust it for inputs: if it passes `image=...`, the demo takes an image; if it passes `image=...` and `mask_image=...`, the demo needs both.

   **For *loading mechanics*, treat the snippet as a signal, not a directive.** Prefer the standard diffusers path: `pipe.load_lora_weights(repo_id, weight_name=...)`. This is the maintained, well-tested path that handles DoRA, rsLoRA, custom target modules, and most format variants when diffusers + PEFT are recent enough. If the model card uses something else — `PeftModel.from_pretrained(pipe.transformer, ...)`, `diffsynth_engine`, custom imports, manual state-dict surgery — that's a flag to investigate, not to copy.

   Reasons model card authors reach for non-standard loading paths often don't transfer: training-time conventions, environment quirks (older diffusers/PEFT versions, CPU offload patterns), or even malformed configs that pass silently in their setup but crash elsewhere. (Real example: an `adapter_config.json` with `task_type: "DIFFUSION"` works locally on some PEFT versions but crashes on current PEFT, because PEFT's `TaskType` enum only contains NLP tasks; diffusers' loader bypasses this validation by reading the safetensors directly.)

   Custom inference paths absolutely *can* work on ZeroGPU when needed (LTX-2.3 native pipeline is a real example). But default to diffusers because it's the standard, current, maintained path. Only adopt the model card's loading approach if `load_lora_weights` demonstrably can't handle this LoRA — and when you do, port it to the ZeroGPU constraints (module-level `.to('cuda')`, no `enable_model_cpu_offload`).

2. **Trigger words and prompt patterns.** "Use the trigger word X at the start of the prompt" → automatically prepend `X` to the user's prompt rather than asking them to type it. "Prompts should describe the scene as Y" → add prompt formatting examples or a placeholder. If the LoRA expects a structured input embedded in the prompt (like bounding-box coordinates or named regions), the UI should produce that structure for the user, not require them to type it.

3. **Example media in the repo.** Example outputs tell you what the LoRA does. Example inputs tell you what the user has to provide. Example *paired* inputs+outputs (input video → output video, input image → output image) tell you the transformation. Lift these into `gr.Examples` so the user can click through them.

4. **The model's task family.** A pose-conditioned model wants pose maps. A depth-conditioned model wants depth. An outpaint model wants padded frames with masked regions. Each implies preprocessing.

5. **Recommended hyperparameters.** Step count, guidance scale, true CFG, LoRA scale. Bake the recommended values in as defaults. Expose a slider only if the LoRA's behavior is sensitive to the value across a range (e.g. LoRA scale 0.7–1.3 produces meaningfully different results); otherwise it's just clutter.

When the model card has none of these, you have three options:

- **Infer from precedent.** If similar LoRAs exist for the same base model, study their demos.
- **Ask the user.** Once, batched, with concrete questions: "Does this LoRA have a trigger word? What's a recommended step count? Got an example prompt?"
- **Use sensible defaults from the base model.** Worse than the previous two; only fall back to this when nothing else is available.

## Verifying the pipeline class

The pipeline class is decided in Phase 2, not here. The procedure (read the base model's own card, trust its diffusers snippet over reference tables) is in `SKILL.md` under "Phase 2 — Pick the base pipeline." Mentioning it here as a pointer because skipping that verification is one of the most common ways to ship a broken Space — when in doubt, re-read Phase 2.

## From "what the LoRA needs" to UI shape

For each thing the LoRA expects as input, decide:

- **Where does the user get this from?** A pose video — extract from a regular video, or accept a pre-extracted pose video, or both? An aspect ratio — picker, sliders for width/height, or auto from input? A reference image — separate slot, or embedded in a "drag and drop here" area?

- **Can a more natural input be transformed into this?** Almost always yes. A user has a video, not a pose video. A user wants "wider", not "padded with black bars at these specific coordinates". The demo bridges the gap.

- **Should the user see the intermediate?** Often yes — a pose extraction preview, a letterbox preview, a generated mask preview. Showing the intermediate builds trust ("yes, the model is conditioning on what I expected") and helps the user iterate. But a preview that takes 10 seconds to generate every time the user changes a setting is a worse UX than no preview.

- **What's the smallest set of controls that lets the user actually drive this LoRA?** Anything beyond that is clutter. A LoRA that's only good at one specific transformation might need just an input slot and a Generate button.

## Examples of the reasoning, applied

**Pose-control video LoRA (V2V).**
The model conditions on pose video. The user has a regular video. The demo takes a video, extracts pose, optionally takes an appearance reference image (for "the character looks like *this*, doing *that* motion"), runs inference, returns a video. The pose extraction is shown as a preview so the user knows what's being used. Aspect-ratio picker is irrelevant — the output matches the source.

**Outpaint video LoRA (V2V).**
The model fills black-margined frames. The user has a video and wants it wider/taller. The demo takes a video, takes a target aspect ratio (dropdown: 16:9, 9:16, 1:1, etc.), pads frames with black bars to that aspect ratio, shows a preview of the padded first frame, runs inference. No appearance reference — the LoRA's job is to extend, not transform. If the LoRA's model card mentions that gamma correction helps for dark scenes, expose that as an Advanced toggle.

**Relight image LoRA (I2I).**
The model relights based on prompt. The user has a photo and an idea of what lighting they want. The demo takes an image, takes a brush canvas where the user paints colored strokes indicating where light should come from, takes an illumination style dropdown ("golden hour", "neon", "studio"), takes an optional background change, builds the prompt, runs inference. Brush color and position become structured prompt content.

**Style image LoRA (T2I).**
The model produces images in a specific style. The user has a prompt. The demo takes a prompt (with the trigger word auto-prepended), takes an aspect ratio, runs inference. That's the whole UI. No reference image, no brush canvas, no preprocessing — the LoRA does the work.

**Bounding-box drag-drop LoRA (I2I).**
The model moves and resizes objects between two bounding boxes drawn on the image. The user has an image and an intent ("move that vase from here to there"). The demo takes an image, lets the user draw two boxes (red for source, green for target) directly on the image with a custom canvas component, runs inference. The boxes become the structured input the model expects.

**Identity-preserving I2V.**
The model animates a character while preserving identity. The user has a still photo and a motion intent. The demo takes an image (the character), takes a prompt (the motion), runs inference. If the model also accepts a driving video for motion, expose that as an alternative input mode rather than a second mandatory input.

The pattern in all of these: start from what the user *has* and what they *want*, and build the UI that bridges to what the model needs.

## Things that change UI shape

Signals from the model card or the LoRA's behavior that should change the UI:

- **Few-step inference (≤ 8 steps).** Hide the steps slider — at this regime the model is recipe-locked. CFG is often 1.0 too. Lock these defaults rather than exposing them.
- **Recommended LoRA scale ≠ 1.0** or scale-sensitive behavior. Expose a LoRA-scale slider centered on the recommended value.
- **Multiple reference inputs.** Two image slots, clearly labeled (e.g. "appearance" and "pose source") with help text explaining the role of each.
- **Optional inputs.** Make optional clearly optional — placeholder text, "(optional)" in the label, the demo runs without it.
- **Multi-stage pipelines** (e.g. extract + generate, generate + refine). Show stage progress (`progress(0.3, desc="Extracting pose...")` then `progress(0.6, desc="Generating...")`). Otherwise the user stares at a blank progress bar for a long generation.
- **Output is video > 5s.** Bump `@spaces.GPU(duration=...)` higher and warn the user in the UI that generation takes longer.
- **LoRA expects structured prompt content** (coordinates, region tags, named entities). Build a small UI that produces that structure rather than asking the user to type it raw.

## Things that don't change UI shape

- The base model identity, beyond determining the pipeline class. A Qwen-Image style LoRA and a Flux style LoRA can have identical UIs.
- Pure performance details (dtype, device map, attention impl). These belong in the model load code, not the UI.
- The LoRA's training data composition. Interesting, not load-bearing.

## When LoRA loading fails

The right move when `pipe.load_lora_weights(...)` fails is to read the error and recognize the *category* of failure. Each category has a different fix path. Don't guess — different errors imply different things about whether the LoRA is salvageable on the diffusers path at all.

**Don't preemptively call conversion utilities.** `load_lora_weights` already calls the appropriate converters internally for the formats it knows about. Calling `convert_state_dict_to_diffusers` or similar before there's an error is redundant in the common case and risky if you guess wrong — you can mangle a state dict that would have loaded fine.

Failure categories:

- **Config-validation failure** (errors mentioning `task_type`, `peft_type`, "Invalid task type", `PeftConfig`, or anything from `peft/config.py`): the safetensors weights themselves may be fine; `adapter_config.json` is the problem. Fix paths: pass `weight_name=` explicitly so `load_lora_weights` reads the safetensors directly without going through PEFT's strict config parser; or download the safetensors and load via state dict. Falling back to `PeftModel.from_pretrained` will *not* help — that path crashes on the same config.

- **Missing keys / unexpected keys** ("Loading adapter weights from state_dict led to missing keys" or "led to unexpected keys"): the state dict's key naming doesn't match what diffusers' loader expects. This often means the LoRA was trained with a non-diffusers convention (kohya, ComfyUI, OneTrainer, custom training scripts), or with custom target modules. Fix paths: try diffusers' built-in conversion utilities (`convert_state_dict_to_diffusers`, base-model-specific converters in `diffusers.loaders`); if those don't help, the format may not be supported yet — surface this clearly to the user rather than silently using a partial load.

- **Shape mismatch errors**: the LoRA's tensor shapes don't match the base model's. Usually means the LoRA was trained against a different base model variant than the one being used (e.g. trained on Qwen-Image-Edit but loaded against Qwen-Image, or trained on FLUX.1-dev but loaded against FLUX.1-schnell). Fix: check the model card's `base_model` field carefully and switch to the correct base.

- **OOM during load or first inference**: not really a loading failure — the LoRA loaded but the combined base + LoRA + activations don't fit. Fix paths involve `pipe.enable_vae_tiling()`, smaller resolutions, FP8/quantized base variants. Not in scope for this section.

- **Missing keys for *some* weights only** (e.g. text encoder LoRA missing but transformer LoRA present): often a partial-coverage LoRA that only targets one component. May actually be intentional and may still work — generate a test image and see if the LoRA effect is present.

When none of these fit and `load_lora_weights` simply doesn't work, falling back to a non-diffusers path becomes a real option. At that point the model card's snippet becomes more useful — but port it to ZeroGPU constraints (no `enable_model_cpu_offload`, module-level `.to('cuda')`, models on `cuda` outside `@spaces.GPU`).