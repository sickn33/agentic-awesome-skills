# ZeroGPU and publishing

ZeroGPU is the default hardware target. It's a shared serverless GPU pool: GPU is allocated on each request, held for the duration of a `@spaces.GPU` function call, and released. The key implications for the demo's code shape:

## ZeroGPU rules

**Models go on `cuda` at module level, not lazy-loaded inside the GPU function.**

```python
import torch
import spaces
from diffusers import QwenImagePipeline

pipe = QwenImagePipeline.from_pretrained("Qwen/Qwen-Image", torch_dtype=torch.bfloat16)
pipe.to("cuda")
pipe.load_lora_weights("user/my-lora")

@spaces.GPU(duration=60)
def generate(prompt):
    return pipe(prompt).images[0]
```

ZeroGPU uses a CUDA emulation mode that lets `.to("cuda")` work outside `@spaces.GPU` functions during startup. Module-level placement is significantly faster than deferred placement because CUDA transfers are optimized for startup-time placement. Lazy-loading inside `@spaces.GPU` is discouraged.

**The `@spaces.GPU` decorator wraps the function that needs the GPU.**

The default duration is 60 seconds. Set it higher for longer tasks: `@spaces.GPU(duration=120)` or `@spaces.GPU(duration=300)`. Set it lower if the task reliably finishes faster — lower duration means higher queue priority. For tasks where duration varies with input, pass a function: `@spaces.GPU(duration=lambda *args: ...)`.

**GPU size: `large` (default, 48GB VRAM) or `xlarge` (96GB, full Blackwell).** Specify with `@spaces.GPU(size="xlarge")` when a single inference needs more than 48GB — large base video models, high-resolution generation, or heavy multi-stage pipelines. `xlarge` consumes 2× the daily quota per second and queues longer, so only reach for it when `large` actually OOMs.

Typical durations:

- Few-step T2I (4-8 steps): 30-60 seconds.
- Standard T2I (20-50 steps): 60-90 seconds.
- I2I / instruction edits: 60-90 seconds.
- Short video (3-5 seconds): 120-180 seconds.
- Long video / multi-stage: 180-300 seconds.

**Don't use `torch.compile`.** It's incompatible with ZeroGPU's process model (the GPU process forks per call). The decorator is a no-op outside ZeroGPU, so `pipe(...)` runs uncompiled in both environments.

**Validate inputs at the top of the GPU function.** Raising `gr.Error(...)` inside a `@spaces.GPU` function still consumes some GPU quota for the allocation. Validate before doing real work, or move validation into a non-decorated function called by the UI.

**Use `cache_examples=True` with `cache_mode="lazy"` on `gr.Examples`.** Plain `cache_examples=True` runs the function at build time, before a GPU is allocated, and will fail. `cache_mode="lazy"` defers caching to the first time a user clicks each example — the GPU is available, and subsequent clicks return the cached result instantly.

**Don't initialize CUDA from outside the controlled paths.** `pipe.to("cuda")` is fine (CUDA emulation handles it). Calling `torch.cuda.something()` directly at module level can break the process model — when in doubt, do it inside the GPU function or skip it.

**ZeroGPU requires PRO/Team/Enterprise.** A free-tier user can create a Space with `hardware: zero-a10g` in the README, but it'll fall back to CPU. If the user isn't on a supporting plan, mention this and point them at two paths: upgrade to PRO (unlocks ZeroGPU directly), or apply for a [community GPU grant](https://huggingface.co/docs/hub/spaces-gpus#community-gpu-grants) (request free paid GPU hardware via the Space's hardware settings, subject to approval).

## HF Hub patterns

### Authentication — check first, ask only if needed

Don't ask for a token reflexively. Check whether the user is already authenticated, and only prompt if there's no usable session.

```python
from huggingface_hub import HfApi, get_token

def resolve_auth():
    """Returns (token, username) or (None, None) if no usable auth."""
    cached = get_token()  # picks up HF_TOKEN env var or cached CLI login
    if not cached:
        return None, None
    try:
        info = HfApi().whoami(token=cached)
        return cached, info["name"]
    except Exception:
        return None, None  # token exists but is invalid/expired
```

Decision tree:

- **User already authenticated and the LoRA repo is public**: use the existing token. Confirm the username with the user before publishing ("I'll publish to `{username}` — confirm?").
- **User already authenticated and the LoRA repo is private**: try `api.repo_info(repo_id, token=cached)`. If it succeeds, the existing token has the right scope — proceed. If it fails (token doesn't have access to that repo), ask for a token with broader access.
- **No cached token**: ask the user. One ask, with the explanation: "I need a Hugging Face access token with **write** scope. Create one at https://huggingface.co/settings/tokens. Paste it here." The same token will be reused for publishing.

The default flow on a Hugging Face Space, in a logged-in user's local environment with `huggingface-cli login`, or in any environment with `HF_TOKEN` set, will *not* require asking the user for a token. Asking is the fallback, not the default.

### Reading the LoRA repo

```python
from huggingface_hub import HfApi, ModelCard

api = HfApi(token=hf_token)  # token may be None for public repos

try:
    info = api.repo_info(repo_id)  # 401/403 → private/gated; need token
except Exception as e:
    # Handle private/gated repo case
    ...

files = api.list_repo_files(repo_id)
card = ModelCard.load(repo_id, token=hf_token)
base_model = card.data.get("base_model")
pipeline_tag = card.data.get("pipeline_tag")
readme_text = card.text
```

### Picking the LoRA weights file

Many LoRA repos contain a single `.safetensors` file and the choice is trivial. But some contain several — variants (4-step / 8-step distillations, FP16 vs BF16, different ranks), training-history checkpoints (`epoch-10.safetensors`, `epoch-20.safetensors`), or genuinely different methods (`lora.safetensors` + `lora_dora.safetensors`). Pick in this order, stopping at the first match:

1. **The README recommends a specific file.** This is the strongest signal — if the author bothered to name a file, that's the choice. Look for filenames inside inference snippets (especially `weight_name="..."` arguments), in "recommended" or "best" callouts, in comparison tables ranking variants, or in any prose like "use X for Y." If the README clearly points at one file, use it without asking.

2. **No README recommendation, and `pytorch_lora_weights.safetensors` exists at the repo root.** Use it. This is the diffusers convention and a safe default.

3. **Neither, but the multiple files look like training checkpoints** (filenames with patterns like `epoch-N`, `step-N`, `checkpoint-N`, or a numeric progression like `lora-1.safetensors`, `lora-2.safetensors`, `lora-3.safetensors`). Default to the highest-numbered / latest one, but mention the choice in the response so the user can override: "Repo has epoch-10, epoch-20, epoch-30; using epoch-30 — let me know if you want a different one."

4. **Otherwise** — files look like alternative variants (`*-4steps` vs `*-8steps`, `*-fp16` vs `*-bf16`, `lora` vs `lora_dora`), or names are opaque (`v2.safetensors`, `final.safetensors`, `output.safetensors`), or there's no clear "latest." Ask, with a one-line description of each option based on what the filenames suggest. Don't pick blindly — the wrong choice produces a working Space that's silently using the wrong weights.

This reasoning happens once, in Phase 1. The chosen filename is then passed to `load_lora_weights` via `weight_name="..."` in `app.py`.

### Loading a private LoRA in `app.py`

```python
import os
pipe.load_lora_weights("user/private-lora", token=os.environ["HF_TOKEN"])
```

### Creating and publishing the Space

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

# Set HF token as a Space secret if the LoRA or base model is private/gated
api.add_space_secret(repo_id=repo_id, key="HF_TOKEN", value=hf_token)

# Upload files
for path in ["app.py", "requirements.txt", "README.md"]:
    api.upload_file(
        path_or_fileobj=path,
        path_in_repo=path,
        repo_id=repo_id,
        repo_type="space",
    )
```

The Space starts building automatically once files are pushed.

### `SpaceHardware.ZERO_A10G`

The string value is `"zero-a10g"`. This is a legacy name from when ZeroGPU ran on A10Gs; the actual hardware is NVIDIA RTX Pro 6000 Blackwell, but the identifier stuck. Both `SpaceHardware.ZERO_A10G` and the literal `"zero-a10g"` work. Prefer the enum for clarity.

If `create_repo` rejects the hardware (typically because the user isn't on PRO), retry without `space_hardware=`, set the README's `hardware: zero-a10g` anyway, and tell the user the Space will run on CPU until they either upgrade to PRO or apply for a [community GPU grant](https://huggingface.co/docs/hub/spaces-gpus#community-gpu-grants) (request form lives in the Space's hardware settings).

### Updating an existing Space

If the user already has a Space they want to update (rather than creating fresh), `create_repo` with `exist_ok=True` is a no-op on the existing repo. `upload_file` overwrites. Existing secrets and hardware settings are preserved. Don't delete and recreate the Space — they'll lose stars, comments, and any custom config.

## After publishing

The Space URL is `https://huggingface.co/spaces/{repo_id}`. Build logs are at `https://huggingface.co/spaces/{repo_id}/logs/container`. Runtime logs at `https://huggingface.co/spaces/{repo_id}/logs/run`.

When sharing the URL with the user:

- Note that the Space is private — they need to be logged in to view it.
- Note that the build takes a few minutes the first time.
- Offer to look at the logs if anything fails.
- Don't add a long postamble — they want to click the link, not read more text.

**Confirm a redeploy is actually live before testing it.** An `app.py`-only push does **not** change the Space's reported `runtime.stage` — the old replica keeps serving "RUNNING" while the new build swaps in, so a `gradio_client` test can silently hit **stale code**. To be sure: push → `api.restart_space(repo)` → poll until the stage leaves and returns to RUNNING → grep the boot logs (`/logs/run`) for a unique `[VERSION] …` marker you printed at module scope → then test. Also set `demo.launch(show_error=True)` so `gradio_client` surfaces the real traceback instead of a generic `AppError`.

## Publish-time failures (before the build starts)

These happen during `create_repo` or `upload_file`, *before* the Space build pipeline runs. Diagnose by reading the exception, not the container logs (the container hasn't started yet).

- **`HfHubHTTPError: 400 Bad Request` from `https://huggingface.co/api/validate-yaml`.** The README's YAML frontmatter failed server-side validation. By far the most common cause is `short_description` exceeding the server's length cap (the cap isn't documented and may change; targeting ~60 characters keeps you well clear). Other causes include typos in field names (`hardware` vs `hardwre`), invalid color values in `colorFrom`/`colorTo`, an unrecognized `hardware` string, or a malformed `models:` list. Fix: open `README.md`, shorten `short_description`, double-check the other YAML fields, retry. If the user gave you a long description for the Space, put the long version in the README body below the YAML — that's the right home for prose.

- **`HfHubHTTPError: 403 Forbidden` on `create_repo` with `space_hardware="zero-a10g"`.** The user's account can't request ZeroGPU at creation time (typically because they're not on PRO/Team/Enterprise). Fix: retry `create_repo` without the `space_hardware` argument; keep `hardware: zero-a10g` in the README YAML. The Space gets created on CPU. Point the user at two paths to get off CPU: upgrade to PRO (auto-promotes the Space to ZeroGPU), or apply for a [community GPU grant](https://huggingface.co/docs/hub/spaces-gpus#community-gpu-grants) (request via the Space's hardware settings).

- **`HfHubHTTPError: 401/403` on `upload_file`.** Token lacks write scope. Fix: ask the user for a write-scoped token (or use a fine-grained token with write permission on this specific Space).

- **`RepositoryNotFoundError` on `upload_file` immediately after `create_repo`.** Race condition; very rare. Fix: small `time.sleep(1)` between create and upload, or retry the upload.

## Common build failures

- **`weight_name` mismatch in `load_lora_weights`.** The actual file in the repo is named differently. Fix: `api.list_repo_files(repo_id)` to find the real filename; pass `weight_name=` explicitly.
- **Gated base model, no token.** The base model (e.g. `black-forest-labs/FLUX.1-dev`) requires accepting a license. Fix: ensure the user has accepted the license on the Hub, and the token is set as a Space secret.
- **Diffusers version too old for the pipeline class.** The base model was released after the latest pinned diffusers. Fix: change `requirements.txt` from `diffusers` to `git+https://github.com/huggingface/diffusers`.
- **CUDA OOM on first request.** The model is too big for the 48GB VRAM available on the default `large` size. Solutions, in order of preference: pick a smaller or quantized variant (FP8, smaller checkpoint); request `@spaces.GPU(size="xlarge")` to get the full 96GB (costs 2× quota and queues longer); enable model offloading (`pipe.enable_model_cpu_offload()` — conflicts with ZeroGPU's process model, last resort only).
- **`cache_examples=True` failure.** Build-time GPU isn't available on ZeroGPU. Fix: add `cache_mode="lazy"` so caching happens on first user click instead of at build.
- **Free-tier user, hardware not allocated.** Space falls back to CPU. The build succeeds but inference is unusably slow. Fix: user upgrades to PRO, or removes `hardware: zero-a10g` and lives with CPU.