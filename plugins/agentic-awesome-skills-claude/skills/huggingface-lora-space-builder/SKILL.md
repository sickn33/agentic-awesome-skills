---
name: huggingface-lora-space-builder
description: Build and publish a Gradio demo on Hugging Face Spaces for a user-provided LoRA. Use when someone asks to create, generate, ship, or publish a Space, demo, Gradio app, or playground for a LoRA — including LoRAs for Qwen-Image, Qwen-Image-Edit, LTX-Video, Wan, FLUX, SDXL, or other...
risk: unknown
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-lora-space-builder
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Gradio LoRA Space Builder
## When to Use

Use this skill when you need build and publish a Gradio demo on Hugging Face Spaces for a user-provided LoRA. Use when someone asks to create, generate, ship, or publish a Space, demo, Gradio app, or playground for a LoRA — including LoRAs for Qwen-Image, Qwen-Image-Edit, LTX-Video, Wan, FLUX, SDXL, or other...


Build and publish a Gradio demo on Hugging Face Spaces that runs inference with a user-provided LoRA. Use whenever someone asks to create, generate, ship, or publish "a Space", "a demo", "a Gradio app", or "a playground" for a LoRA — whether the base model is Qwen-Image, Qwen-Image-Edit, LTX, or another diffusion model. Also use when someone describes a LoRA they trained or hosts on the Hub and wants to share it. The default target is ZeroGPU hardware and the default inference library is `diffusers` when the base model supports it.

The output is a real, published Space (private by default) that the user can try in the browser, not a local script.

## What "good" looks like for these demos

The demo should feel handcrafted for this specific LoRA, not a generic template with the LoRA bolted on. Two LoRAs that share a task can still need different demos: a pose-control video LoRA and an outpainting video LoRA both take video in and produce video out, but the inputs the user provides, the preprocessing, and the controls are completely different. Recognizing that is the central job here.

Concretely, a good demo:

- Loads fast and runs fast — minimal model loading, sensible step count, no wasted computation per call.
- Has a UI with exactly the controls this LoRA needs and nothing else. Excess sliders are a cost, not a feature.
- Shows the user what's happening — progress, intermediate outputs where useful, the seed used, a clear error when input is missing.
- Honors the LoRA's own recommendations from its model card: trigger words, recommended step count, recommended guidance scale, recommended LoRA scale, example inputs.
- Is creative where creativity helps — interactive canvases, before/after sliders, side-by-side previews of intermediate processing — and plain where plainness is right.

## Workflow

Work through these phases in order. Information gathered in one phase decides the next.

1. Gather the LoRA info needed to pick a pipeline and design a UI.
2. Pick the base pipeline and inference recipe.
3. Design the UI for this specific LoRA's task and inputs.
4. Write `app.py`, `requirements.txt`, and `README.md` together; show all three to the user for one batched approval.
5. Publish the Space (private).

Don't drip-feed questions across multiple turns. Batch them.

---

## Phase 1 — Gather LoRA info

Required: a LoRA repo on the Hub (e.g. `username/my-lora`).

**First, try to read the repo without a token.** If it succeeds, the repo is public — proceed. If it fails with 401/403, the repo is private/gated and you need an authenticated session to read it. **Don't immediately ask for a token.** Check first whether the user is already authenticated.

```python
from huggingface_hub import HfApi, get_token

cached_token = get_token()  # picks up HF_TOKEN env var or cached CLI login
if cached_token:
    try:
        info = HfApi().whoami(token=cached_token)
        username = info["name"]
        # info also has fine-grained token scope info if applicable
    except Exception:
        cached_token = None  # token exists but is invalid/expired
```

Then:

- If a valid cached token exists *and* it can read the repo, use it. No prompt needed.
- If no cached token, or the cached token can't read this private repo, ask the user for a token — once, with the explanation below.

When asking for a token (and only when you actually need to ask):

> I need a Hugging Face access token with **write** scope (to read the LoRA if it's private/gated, and to publish the Space). Create one at https://huggingface.co/settings/tokens. Paste it here.

The same token will be reused for publishing in the final phase, so this is a one-time ask.

**Then read what's in the repo:**

- List the repo files (`huggingface_hub.HfApi().list_repo_files(repo_id)`). Look for `.safetensors`, `README.md`, example images/videos, multiple checkpoints.
- Fetch the model card (`huggingface_hub.ModelCard.load(repo_id)`). The `data` dict has structured fields; the `text` has the README body.
- If multiple `.safetensors` files exist, pick the right one — see "Picking the LoRA weights file" in `references/zerogpu-and-publishing.md`. Briefly: README-recommended file wins, then `pytorch_lora_weights.safetensors`, then latest training checkpoint, otherwise ask.

**From the model card, try to determine:**

- **Base model** — the `base_model` field, or text mentions in the README. Usually present. Use it to pick the pipeline reference file (see Phase 2).
- **Task** — `pipeline_tag` if set, otherwise inferred from the base model and README text. The five tasks this skill handles: `text-to-image`, `image-to-image`, `text-to-video`, `image-to-video`, `video-to-video`.
- **Trigger words** — often called "trigger word", "instance prompt", "activation word"; sometimes embedded in example prompts.
- **Recommended inference recipe** — step count, guidance scale, true CFG scale, LoRA scale, resolution. Many LoRA cards include a Python snippet; trust its *parameters* (steps, guidance, CFG, LoRA scale, dtype). For *loading mechanics*, see `adapting-to-the-lora.md` — prefer `pipe.load_lora_weights(...)` over whatever loading approach the snippet uses.
- **Example prompts and example media** — use these as Gradio examples in the UI.
- **Sub-task / specific use case** — for image edits and video LoRAs, "what does this LoRA actually do" matters as much as the task category. A relighting LoRA, a face-swap LoRA, and a style LoRA all might be image-to-image, but the UI for each is different.

**When something can't be inferred, ask the user — once, in a single batched message.** Format the question to make answering trivial. For task category, list the five options as a numbered choice. For sub-task, give a one-line description ("what does this LoRA do? e.g. 'relight portraits', 'apply manga style', 'extend videos to wider aspect ratios'"). Don't ask if you can already infer it confidently from the base model or README.

If the model card has nothing helpful at all — no base model, no task, no example — surface that clearly: "The model card has no usable info. I'll need you to tell me: (1) base model, (2) what this LoRA does, (3) recommended step count and guidance scale if you know them."

---

## Phase 2 — Pick the base pipeline

Two things to decide here: which reference file to load, and which pipeline class to use. They're not the same question — a base-model family file (e.g. `qwen-image.md`) covers multiple variants, and variants in the same family don't always share a pipeline class. Get this wrong and the Space loads but produces wrong output, or fails at startup.

**Step 1 — Load the reference file for this base model family.**

- `references/base-models/qwen-image.md` — covers Qwen-Image and Qwen-Image-Edit family (text-to-image and image-to-image).
- `references/base-models/ltx.md` — covers LTX family (text-to-video, image-to-video, video-to-video, including IC-LoRAs).
- `references/base-models/krea-2.md` — covers Krea 2 (K2), text-to-image (train on RAW, run inference/LoRAs on the Turbo distilled checkpoint).

If the base model isn't in one of these files, this skill doesn't have first-class support yet. Tell the user, and ask whether they want to proceed by analogy (use the closest model's recipe and adjust) or stop. Don't guess silently.

**Step 2 — Verify the pipeline class against the base model's own card. This step is mandatory, not optional.**

A new base model variant might use the same pipeline class with a different repo path, or a new pipeline class entirely. Don't trust the reference file's table alone — it's best-effort and can lag a recent release. Verify before committing:

```python
from huggingface_hub import ModelCard
base_card = ModelCard.load(base_model_id)
# Read base_card.text — find the diffusers inference snippet, note the pipeline class it imports.
```

The class imported in the base model card's diffusers snippet is the source of truth. Real examples where this matters:

- `Qwen-Image-Edit` uses `QwenImageEditPipeline`. `Qwen-Image-Edit-2509` and `Qwen-Image-Edit-2511` use `QwenImageEditPlusPipeline` — different class, different default parameters, takes a list of images instead of one. A LoRA targeting 2511 loaded onto `QwenImageEditPipeline` produces broken output.
- LTX-Video uses `LTXPipeline`/`LTXImageToVideoPipeline`/`LTXConditionPipeline`. LTX-2 uses `LTX2Pipeline` from a different module path. LTX-2.3 sometimes needs a native pipeline outside diffusers.

If the base model card has no diffusers snippet at all, fall back to the reference file's table — and tell the user you're falling back, in case they know something the table doesn't.

The cost of this verification is one Hub fetch and a few seconds of reading. The cost of skipping it is the failure mode the previous bullet describes — a "working" Space that's quietly using the wrong class.

**Step 3 — Diffusers vs native pipeline.** Default to `diffusers` when the base model has a diffusers pipeline class. That's the case for Qwen-Image and Qwen-Image-Edit and most of LTX. Some LTX variants (notably LTX-2.3 with certain IC-LoRAs) need a native pipeline; the LTX reference says when. Diffusers gives standard `load_lora_weights` / `set_adapters` semantics; the native path needs LoRA-specific glue.

---

## Phase 3 — Design the UI for this LoRA

Don't reach for a template. Reason from the LoRA's task and inputs to a UI.

Read `references/tasks.md` for the per-task baseline UI patterns (what the standard inputs/outputs look like for T2I, I2I, T2V, I2V, V2V).

Then read `references/adapting-to-the-lora.md`, which is about *thinking through what this specific LoRA needs* — beyond the task category. That file is the most important one in this skill. The same task can need very different UIs: a pose-control LTX LoRA needs a video input and a pose-extraction preview; an outpaint LTX LoRA needs an aspect-ratio picker and a black-margin preview; a relighting Flux LoRA needs an image and a brush canvas for indicating where to add light. None of those reduce to "the V2V template" or "the I2I template".

**Self-check before writing the UI.** Write one sentence describing what a user does with this Space in 10 seconds. If that sentence doesn't distinguish this LoRA from any other LoRA of the same task, the UI isn't shaped enough yet.

Examples that pass the self-check:

- "Upload a video, pick a target aspect ratio, click Generate; the model fills the empty margins."
- "Draw colored brush strokes where you want light, pick an illumination style, click Generate; the model relights the photo."
- "Upload a video of someone moving and an image of a different character; the model produces a video of the character doing the motion."

Examples that fail:

- "Type a prompt and click generate." (Generic T2I — say more.)
- "Upload an image and an instruction." (Generic edit — what kind of edit?)

**Gradio component freshness.** Gradio's component set evolves. Before defaulting to plain components, consider whether something newer fits better — for example `gr.ImageSlider` for before/after on edit LoRAs, `gr.BrowserState` for persistent prefs, `@gr.render` for UIs that change based on input. If you're unsure whether a component exists or what its signature is, web-fetch the current Gradio docs at https://www.gradio.app/docs rather than guessing.

**When stock and Hub custom components aren't enough — creative mode.** If the LoRA's natural input is a shape no Gradio component (built-in or on the Hub) expresses well — point sets, strokes, trajectories, multi-region annotations with metadata, 3D rotation gizmos, timeline scrubbers, anything where the user manipulates a thing on top of media — drop down to custom HTML/JS via `gr.HTML`. See `references/creative-mode.md` for the Gradio primitives (`gr.HTML`, `head=` injection, `elem_id` addressing, the two JS↔Python state-sync approaches), the discipline around defining a JSON wire format, and the pitfalls. Don't reach for creative mode just because it would be cool — reach for it when the LoRA's input shape demands it. And don't skip the Hub custom components rung above (e.g. `gradio_image_annotation`) before going fully bespoke.

**`gr.Examples` for media-input Spaces.** When no fitting example media is available from the model's own repo, pull from the shared input pools — split by modality so the HF dataset viewer can render proper thumbnails: images at [`linoyts/repo-to-space-example-inputs`](https://huggingface.co/datasets/linoyts/repo-to-space-example-inputs), videos at [`linoyts/repo-to-space-example-videos`](https://huggingface.co/datasets/linoyts/repo-to-space-example-videos). Both are CC0 with `categories` + natural-language `caption` metadata and the same filter/rank recipe in each dataset README. Pick 2–3 that fit the task, preprocess to the shapes the model expects, and bake the copies into the Space. Set `cache_examples=True, cache_mode="lazy"` so the first click caches without running examples at build time (see `references/zerogpu-and-publishing.md`).

---

## Phase 4 — Write the Space files

Before writing, tell the user concretely what's about to happen — name the actual files. Not "I'll write the three files" but something like:

> "Now I'll write the three files needed to publish a Space: **`app.py`** (the Gradio demo and inference code), **`requirements.txt`** (Python dependencies), and **`README.md`** (Space configuration including ZeroGPU hardware setting). Then I'll show all three for your review before publishing."

This anchors the user in what's being produced. Don't say "three files" without naming them — it's vague and signals lack of commitment to the deliverable.

The three files are tightly coupled: `requirements.txt` is determined by what `app.py` imports, and the `README.md` YAML frontmatter sets the SDK version, hardware, and Space title that have to match. Write them together, then show all three to the user for approval in **one batched message** before publishing.

Read `references/zerogpu-and-publishing.md` for the ZeroGPU rules. The non-obvious ones:

- Models go on `cuda` at module level (not lazy-loaded inside the GPU function). ZeroGPU has a CUDA emulation that makes this work pre-allocation, and module-level placement is significantly faster than deferred placement.
- The function that runs inference is decorated with `@spaces.GPU(duration=...)`. Pick a duration appropriate for the task — short for image generation, longer for video.
- Don't use `torch.compile` — it's incompatible with ZeroGPU's process model.

### `app.py`

Compose from the pieces decided in Phases 1–3. Don't paste from a template. Each section should be there because it's needed:

- Imports — `gradio as gr`, `torch`, `spaces`, the pipeline class, anything the preprocessing needs.
- Constants — `LORA_REPO`, `BASE_MODEL`, recommended step count, guidance, LoRA scale, trigger word.
- Module-level model load — pipeline `from_pretrained`, `.to("cuda")`, `load_lora_weights`. If the LoRA repo is private, pass `token=os.environ["HF_TOKEN"]`.
- Preprocessing functions (if any) — pose extraction, padding, mask building, etc. CPU code can run at module level; GPU code needs to be inside a `@spaces.GPU` function.
- The inference function — decorated with `@spaces.GPU(duration=...)`. Validates inputs, applies trigger word, builds the pipeline kwargs, returns outputs.
- The Gradio Blocks — the UI from Phase 3, wired to the inference function.

Common things to get right:

- Return the actually-used seed alongside the result so the user can reproduce.
- `gr.Progress(track_tqdm=True)` on the inference function surfaces diffusers' internal progress bar.
- Validate inputs — raise `gr.Error("Please upload an image first.")` when a required input is missing, rather than letting the pipeline fail with a cryptic error.
- On `gr.Examples`, use `cache_examples=True, cache_mode="lazy"` — plain `cache_examples=True` runs examples at build time and fails on ZeroGPU; lazy mode defers caching to the first user click.

### `requirements.txt`

Don't ship a fixed minimal list and hope for the best. The "minimal" list works for plain T2I LoRAs and breaks the moment the base model has a vision-language text encoder, video output, or any non-trivial preprocessing. **Derive `requirements.txt` from what the Space actually needs**, in this order:

1. **Every top-level non-stdlib import in `app.py`.** If `app.py` does `import cv2`, `requirements.txt` has `opencv-python`. If it does `from controlnet_aux import OpenposeDetector`, `requirements.txt` has `controlnet-aux`. Walk the imports mechanically. (Note the exclusions in the next paragraph — some imports are runtime built-ins and don't need to be listed.)
2. **What the base-model reference's "Required dependencies" subsection says.** Each base-model file lists the non-obvious extras the pipeline pulls in — `torchvision` for Qwen-Image (Qwen 2.5-VL text encoder), `imageio[ffmpeg]` for LTX (video export), etc. Include all of them. These are the deps that aren't picked up from imports because the pipeline's components import them transitively at load time.
3. **What the LoRA's own model card explicitly mentions installing.** If the LoRA README has its own `pip install` block, lift the deps from there.
4. **The diffusers/ML stack:** `diffusers`, `transformers`, `accelerate`, `peft`, `safetensors`. Default to plain (unpinned). Switch `diffusers` to `git+https://github.com/huggingface/diffusers` if the base-model reference says the model needs it (recent releases often do — Qwen-Image-Edit-2511 is a current example).

**What *not* to list in `requirements.txt`:**

- **`gradio`** — controlled by the `sdk_version:` field in `README.md`'s YAML frontmatter, not by `requirements.txt`. Listing it in requirements is at best ignored, at worst causes a version conflict with the SDK. Set the version in the README only.
- **`torch`** — provided by the Space runtime. Only add if you need a specific version pinned (rare, and usually a sign something else is wrong).
- **`spaces`** — provided by the Space runtime. Only add if you need a specific version pinned.
- **`huggingface_hub`** — provided by the Space runtime. Only add if you need a specific version pinned.

These four come pre-installed in the ZeroGPU container. Listing them anyway is the kind of "include rather than skip" instinct that's right for non-baseline deps but wrong for baseline ones, because pinning conflicts with the runtime's managed versions.

**Bias for everything else: include rather than skip when uncertain.** A package the Space doesn't actually use causes a slightly slower build. A missing required package causes a startup-time crash that's much harder for the user to diagnose. These costs aren't symmetric — the test failure that prompted this rule was exactly the second kind.

**But two specific deps are *not* safe to add reflexively** because they routinely cause more problems than they solve on ZeroGPU:

- `xformers` — pinned to specific torch versions, frequent source of conflicts. The ZeroGPU runtime ships torch 2.8+, so any pinned `xformers` version must support that. Additional gotcha on Blackwell: xformers' FA3 dispatch mis-gates the hardware (FA3 kernels are Hopper-only at `sm_90a`, but the dispatcher gates on `device_capability >= (9, 0)`, which also matches Blackwell) and crashes at kernel launch with `CUDA invalid argument`. If a Space using xformers attention hits this, disable FA3 dispatch at module load:

  ```python
  try:
      from xformers.ops.fmha import _set_use_fa3
      _set_use_fa3(False)
  except Exception:
      pass
  ```

  Only include `xformers` if `app.py` actually uses it.
- `flash-attn` — needs a build step, often fails to install. Same torch 2.8+ alignment caveat as `xformers`. Only include if `app.py` actually uses it.

**Pin other versions only when you have a reason** (e.g. a known incompatibility, or matching a recipe from the model card).

### `README.md`

Spaces are configured by the YAML frontmatter at the top of `README.md`. This frontmatter is what selects ZeroGPU.

```
---
title: <human-readable title>
emoji: 🎨
colorFrom: pink
colorTo: purple
sdk: gradio
sdk_version: <current Gradio version>
app_file: app.py
pinned: false
hardware: zero-a10g
short_description: <one short line for the Space tile, ~60 chars max>
models:
  - <base model repo>
  - <lora repo>
---

# <title>

A short description with links to the LoRA and base model.
```

Key fields:

- `sdk: gradio` — required for ZeroGPU.
- `sdk_version` — match the Gradio version you wrote against. Look up the current version (`pip index versions gradio`, or check https://www.gradio.app) rather than guessing.
- `hardware: zero-a10g` — the legacy string for ZeroGPU. The actual hardware is NVIDIA RTX Pro 6000 Blackwell, but the identifier is `zero-a10g`. ZeroGPU is available to PRO, Team, and Enterprise accounts; if the user isn't subscribed, the Space will fall back to CPU. Mention this if you suspect they aren't on PRO.
- `models:` — list base and LoRA repos. This enables Hub caching and discovery.
- `short_description` — appears on the Space tile. **Keep it short (~60 characters or less).** The Hub's YAML validator rejects long values with a 400 from `https://huggingface.co/api/validate-yaml`, which surfaces as an `HfHubHTTPError` during `create_repo` or `upload_file`. The exact server-side limit isn't documented and may change, so target the visible-tile-length range rather than pushing right up to a cap. If you do hit the 400, the fix is almost always to shorten this field. One sentence describing what the Space does is plenty — the README body below the YAML is where you put longer prose.

### Single batched approval — order of operations matters

The discipline here is **write all three files first, then show them all together in one message**. Not "write app.py → talk about it → write requirements → talk about it → write README → talk about it." That rhythm produces three approval moments even if you don't explicitly ask for approval, because the user is being asked to react after each file.

Concretely:

1. **Write `app.py`, `requirements.txt`, and `README.md` in succession with no intervening prose.** No commentary between files. No "Now I'll write the next one." No description of what each file does as you produce it. Just the three files, back to back.
2. **Then, in a single message, ask for approval covering all three at once.** Something like: "Here's the Space — `app.py` (N lines), `requirements.txt`, and `README.md`. Review and confirm to publish, or tell me what to change."
3. The user responds once, covering whatever they want changed across any of the three files.

What to avoid:

- Walking through `app.py`'s structure or design choices after writing it but before writing the others. Save commentary for either the pre-writing announcement (Phase 4 opening) or the single approval message after all three exist.
- Asking "ready for the next one?" or "want me to continue with requirements?" — those are implicit per-file approvals.
- Showing one file inline and offering to "show the next when you're ready" — same trap.
- Treating any of the three files as optional or as a follow-up. They are produced together as one deliverable.

If the user interrupts after seeing the first file with feedback or a question, that's fine — engage with it — but the rule still applies: the next time you produce code, produce all remaining files together, not one at a time.

---

## Phase 5 — Publish the Space

Use the authenticated session from Phase 1. Default to **private**, so the user can vet the Space before flipping it public. Confirm the target username with the user before creating: "I'll publish to `{username}/{space_name}` — confirm?"

```python
from huggingface_hub import HfApi, SpaceHardware

api = HfApi(token=hf_token)
username = api.whoami()["name"]
repo_id = f"{username}/{space_name}"

api.create_repo(
    repo_id=repo_id,
    repo_type="space",
    space_sdk="gradio",
    space_hardware=SpaceHardware.ZERO_A10G,
    private=True,
    exist_ok=True,
)

# Upload files
for path in ["app.py", "requirements.txt", "README.md"]:
    api.upload_file(path_or_fileobj=path, path_in_repo=path,
                    repo_id=repo_id, repo_type="space")
```

If the LoRA repo itself is private/gated, the Space needs the token at runtime to download the LoRA. Set it as a Space secret:

```python
api.add_space_secret(repo_id=repo_id, key="HF_TOKEN", value=HF_TOKEN)
```

…and in `app.py`, load the LoRA with `token=os.environ["HF_TOKEN"]`.

**After upload**, run the smoke-test below before sharing — the build runs asynchronously and silent failures (wrong `weight_name`, missing dep, wrong pipeline class) only surface at first inference. **Once the smoke-test passes**, share the Space URL (`https://huggingface.co/spaces/{repo_id}`) and tell the user the Space is private — they'll need to be logged in to view it. Note that the build takes a few minutes; the logs are at `https://huggingface.co/spaces/{repo_id}/logs/container` if anything fails.

**Publish-time failures (before the build starts):**

- **`HfHubHTTPError: 400 Bad Request` from `https://huggingface.co/api/validate-yaml`** during `create_repo` or `upload_file`. The README YAML failed server-side validation. By far the most common cause is a `short_description` that's too long; sometimes a stray field or malformed value. Fix: shorten `short_description` to ~60 characters and retry. If shortening doesn't fix it, look for typos in field names or invalid values (e.g. unsupported colors in `colorFrom`/`colorTo`, an invalid `hardware` string).
- **403 on `create_repo`** with `space_hardware="zero-a10g"`: user isn't on PRO/Team/Enterprise, so they can't request ZeroGPU at creation time. Fix: retry `create_repo` without `space_hardware`, leave `hardware: zero-a10g` in the README YAML — the Space gets created on CPU. The user can then either upgrade to PRO (auto-promotes to ZeroGPU) or apply for a [community GPU grant](https://huggingface.co/docs/hub/spaces-gpus#community-gpu-grants) (request via the Space's hardware settings).
- **401/403 on `upload_file`**: token doesn't have write scope. Fix: ask the user for a write-scoped token.

**Common build failures (after the build starts):**

- LoRA `weight_name` mismatch in `load_lora_weights` → check the actual filename via `list_repo_files`.
- Base model is gated and the token wasn't set as a Space secret.
- ZeroGPU not allocated (user not on PRO) → Space falls back to CPU and is unusably slow.
- Diffusers version doesn't recognize the pipeline class → pin to git diffusers in `requirements.txt`.
- Missing dependency at module load → see `requirements.txt` derivation rules above; the most common case is a transitive dep like `torchvision` for Qwen-Image's text encoder.

If a build fails, offer to read the logs and propose a fix.

---

## Phase 6 — Smoke-test the Space

Before declaring the Space done and handing the URL to the user, exercise it once end-to-end. Several failure modes (wrong `weight_name`, wrong pipeline class, missing transitive dep, gated-base-model token issue) build cleanly and only surface at first inference. The `gradio` Python package ships a CLI that does exactly this — `gradio info` returns the endpoint signature, `gradio predict` runs an actual inference. Both ship with the `gradio` pip dependency the Space already needs, so they're available in any environment where this skill ran.

**Step 1 — Wait for the build.** `create_repo` returns immediately, but the container image is still building. Poll `HfApi().get_space_runtime(repo_id).stage` until it reaches `RUNNING`:

```python
import time
from huggingface_hub import HfApi
api = HfApi(token=hf_token)
while True:
    stage = api.get_space_runtime(repo_id).stage
    if stage == "RUNNING": break
    if stage in {"BUILD_ERROR", "RUNTIME_ERROR", "CONFIG_ERROR"}:
        raise RuntimeError(f"Build failed: {stage}. Logs: https://huggingface.co/spaces/{repo_id}/logs/container")
    time.sleep(15)
```

If the build fails, fetch the container logs (`https://huggingface.co/spaces/{repo_id}/logs/container`), read the traceback, and propose a fix. Don't run `gradio info` against a Space that isn't running — it'll hang or 503.

**Step 2 — Verify the endpoint signature.** `gradio info {repo_id} --token {hf_token}` returns the exposed endpoints and their parameter types. Read the output and confirm: (a) the endpoint exists (default is `/predict`, but Blocks Spaces often have a custom name from the Python function name), (b) the parameters in order match what `app.py` declares, (c) file-typed params show `"type": "filepath"` as expected. If any of this is off, the user-facing UI may still appear correct but API calls will fail — fix and re-upload.

**Step 3 — Run one real inference.** Pick the lightest viable input — the simplest example from the LoRA card, or one of the `gr.Examples` entries. Pass `--token` for private Spaces. For file inputs, the payload uses `{"path": "...", "meta": {"_type": "gradio.FileData"}}`.

```bash
# Text-to-image:
gradio predict {repo_id} /predict '{"prompt": "...", "aspect_ratio": "1:1", ...}' --token $HF_TOKEN

# Image-to-image (file input):
gradio predict {repo_id} /predict '{"input_image": {"path": "/tmp/sample.jpg", "meta": {"_type": "gradio.FileData"}}, "prompt": "..."}' --token $HF_TOKEN
```

If you don't have a local sample image for I2I, lift one from the LoRA repo (`hf_hub_download(repo_id, filename="example.png")`) or the base model card.

**Caveat for creative-mode Spaces.** `gradio info` and `gradio predict` only exercise the Python endpoint — they tell you nothing about whether custom JS in a `gr.HTML` widget works. If the Space uses creative mode (see `references/creative-mode.md`), after the API smoke-test passes, **open the Space URL in a browser and verify the interaction once** before sharing. Server-side green plus broken JS is the most common failure mode for these.

**Step 4 — Interpret the result.**

- **Returns successfully and the output looks plausible** → done. Share the URL.
- **HTTPError 503 / "Space is sleeping"** → the Space spun down between steps 1 and 3. Wake it (`api.restart_space(repo_id)`) and retry.
- **Inference error mentioning `weight_name` / `safetensors`** → the LoRA filename in `app.py` doesn't match the actual file in the LoRA repo. Re-check `list_repo_files`, fix `weight_name=`, re-upload `app.py`.
- **Inference error mentioning a missing pipeline class or attribute** → diffusers version too old. Switch `requirements.txt` to `git+https://github.com/huggingface/diffusers` and re-upload.
- **`ImportError` at module load** → missing dep. Add it to `requirements.txt` and re-upload. The runtime logs (`/logs/run`) name the missing package.
- **OOM** → reduce default resolution or step count, or pick a smaller base variant.
- **Timeout / hangs** → bump `@spaces.GPU(duration=...)` and re-upload.

The smoke-test exists to convert these from "user discovers it and reports back" to "you discover it and fix it before sharing." Don't skip it because the build went green — green-build-broken-inference is the most common failure mode for Spaces with a non-trivial pipeline.

---

## What to avoid

- A generic "one demo for all LoRAs" template. The whole point of this skill is to tailor.
- Lazy-loading the model inside the GPU function. Slow on ZeroGPU, and hides startup errors until first request.
- `torch.compile`. Not supported on ZeroGPU.
- `cache_examples=True` without `cache_mode="lazy"` on ZeroGPU.
- Uploading the LoRA weights into the Space repo. Pull from the LoRA's own Hub repo at runtime.
- Asking for the HF token only at the end, then discovering the LoRA was private all along and you couldn't read the model card.
- Exposing every diffusers knob. Pick the 1–3 controls that matter for this LoRA.
- Long preambles in the chat reply once the Space is published. The Space URL is the deliverable; keep the wrap-up brief.

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
