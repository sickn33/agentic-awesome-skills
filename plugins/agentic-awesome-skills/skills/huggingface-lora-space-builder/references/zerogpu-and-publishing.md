_Modified in the local catalog review: corrected authority, credential, reproducibility and runtime guidance; examples remain environment-dependent._

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

**Don't use `torch.compile`.** It's incompatible with ZeroGPU's process model (the GPU process forks per call). The decorator does not itself compile or remove compilation; outside ZeroGPU it is effect-free.

**Validate inputs at the top of the GPU function.** Raising `gr.Error(...)` inside a `@spaces.GPU` function still consumes some GPU quota for the allocation. Validate before doing real work, or move validation into a non-decorated function called by the UI.

**Use `cache_examples=True` with `cache_mode="lazy"` on `gr.Examples`.** Plain `cache_examples=True` runs the function at build time, before a GPU is allocated, and will fail. `cache_mode="lazy"` defers caching to the first time a user clicks each example — the GPU is available, and subsequent clicks return the cached result instantly.

**Don't initialize CUDA from outside the controlled paths.** `pipe.to("cuda")` is fine (CUDA emulation handles it). Calling `torch.cuda.something()` directly at module level can break the process model — when in doubt, do it inside the GPU function or skip it.

**Check current hosting eligibility.** Qualifying free personal accounts can host a limited number of ZeroGPU Spaces. Paid tiers have different limits; inspect current official docs and actual Space hardware. README hints do not allocate hardware, and failure does not guarantee an automatic CPU fallback.

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
- **No cached token**: ask the user. One ask, with the explanation: "Reading needs a scoped read credential; separately authorized publishing needs scoped write permission. Create one at https://huggingface.co/settings/tokens. Configure it through local `hf auth login` or an approved secret store; never paste a token into chat." Use a separate scoped write credential for publication and a read credential for app runtime when needed.

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

### Creating or updating the Space

Follow the current SKILL.md scope: `exist_ok=False` for a new private target, explicit inspection for an existing target, one atomic upload of reviewed files/assets, and a dedicated model-read secret when needed. An existing public repository is not made private by `create_repo(private=True, exist_ok=True)`. Use Space settings or hardware API to select allocation; `suggested_hardware` is only a duplication hint. Diagnose 401/403 before retrying. Do not change hardware, visibility, model or account silently.


## After publishing

The Space URL is `https://huggingface.co/spaces/{repo_id}`. Build logs are at `https://huggingface.co/spaces/{repo_id}/logs/container`. Runtime logs at `https://huggingface.co/spaces/{repo_id}/logs/run`.

When sharing the URL with the user:

- Note that the Space is private — they need to be logged in to view it.
- Note that the build takes a few minutes the first time.
- Offer to look at the logs if anything fails.
- Don't add a long postamble — they want to click the link, not read more text.

**Confirm a redeploy is actually live before testing it.** An `app.py`-only push does **not** change the Space's reported `runtime.stage` — the old replica keeps serving "RUNNING" while the new build swaps in, so a `gradio_client` test can silently hit **stale code**. To be sure: verify the deployed commit and a non-sensitive `[VERSION]` marker in protected logs, using bounded polling. Restart only if needed within scope. Keep shared `demo.launch(show_error=False)` and inspect protected redacted errors.

## Failure handling

Read the exact service response and distinguish YAML, permissions, gating, package compatibility, quota and runtime errors. A short-description field error is only one possible 400 cause. Never assume all 403 responses require a subscription. Pin a reviewed compatible Diffusers release/commit; do not switch to moving git main automatically. For OOM, measure weights and activation requirements, use supported VAE tiling or bounded dimensions, and report when the selected hardware cannot support the recipe. Model offload is not a generic ZeroGPU fix. Preserve visibility, account and budget; report partial deployment explicitly.
