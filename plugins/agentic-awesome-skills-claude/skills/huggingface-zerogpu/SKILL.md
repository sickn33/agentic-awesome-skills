---
name: huggingface-zerogpu
description: AI demos and GPU compute with Gradio Spaces and Hugging Face Spaces ZeroGPU. Use when writing or reviewing code that uses `@spaces.GPU`, configuring `python_version` or `requirements.txt` for a ZeroGPU Space, or handling ZeroGPU-specific code constraints — pickle-based process...
risk: unknown
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-zerogpu
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Hugging Face ZeroGPU
## When to Use

Use this skill when you need aI demos and GPU compute with Gradio Spaces and Hugging Face Spaces ZeroGPU. Use when writing or reviewing code that uses `@spaces.GPU`, configuring `python_version` or `requirements.txt` for a ZeroGPU Space, or handling ZeroGPU-specific code constraints — pickle-based process...


Rules and patterns for ML demos on Hugging Face Spaces with **ZeroGPU** hardware. Covers `@spaces.GPU`, duration and quota tuning, process isolation, the CUDA availability model, concurrency safety, and CUDA build constraints.

## Scope

This skill is for **Gradio SDK Spaces using ZeroGPU hardware**. Docker and Static Spaces cannot schedule onto ZeroGPU, and Streamlit apps now run as Docker Spaces — so this skill applies only to Gradio. For general Gradio coding (components, layouts, event listeners), see the `huggingface-gradio` skill in this repo. The authoritative ZeroGPU docs live at https://huggingface.co/docs/hub/spaces-zerogpu — refer to them for the current backing GPU, runtime version lists, and tier thresholds, all of which change over time.

## Reference Files

| Reference | When to read |
|-----------|--------------|
| `references/concurrency.md` | Always read alongside SKILL.md when writing ZeroGPU code — handlers run in parallel by default |
| `references/how-zerogpu-works.md` | When reasoning about cold-starts, worker reuse, why module-scope warmup does not carry to requests, or why returning CUDA tensors hangs |
| `references/how-quota-works.md` | When choosing `duration` values, debugging `illegal duration` vs `quota exceeded` errors, or explaining why default 60s blocks short tasks |
| `references/cuda-and-deps.md` | When installing CUDA-dependent packages (e.g. `flash-attn`), pinning torch side-cars, or reading wheel filename tags |

## Hardware

ZeroGPU exposes two GPU sizes that map to a fraction of the backing card:

| `size` | Slice of backing GPU | Quota cost |
|--------|----------------------|------------|
| `large` *(default)* | Half | 1x |
| `xlarge` | Full | 2x |

Default `large` gives half a physical GPU, so memory bandwidth and compute are significantly lower than the full card's specs. Use `xlarge` only when the workload genuinely needs the extra memory or compute.

> **Backing GPU changes without notice.** ZeroGPU has already migrated across GPU generations several times; older write-ups may name A100 or H200, but those are outdated. For the current backing GPU and exact per-size VRAM, always check the [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) before sizing workloads.

## Basic Pattern

```python
import spaces
import torch
from transformers import pipeline

pipe = pipeline("text-generation", model="...", device="cuda")

@spaces.GPU
def generate(prompt: str) -> str:
    return pipe(prompt, max_new_tokens=100)[0]["generated_text"]
```

Key rules:

1. **Instantiate models at module scope** and call `.to("cuda")` eagerly. ZeroGPU handles the actual device mapping transparently (see CUDA availability model below).
2. **Decorate GPU functions with `@spaces.GPU`**. The decorator is a no-op outside ZeroGPU, so it is safe to keep in all environments.
3. **Set `duration` to match the realistic worst-case workload** (default 60s). The platform pre-checks `requested duration` against the user's `remaining quota` — not against the actual run time — so a 10-second task left at the 60s default fails with `quota exceeded` as soon as the user's remaining quota drops below 60s. Smaller declared `duration` also ranks higher in the node-level queue. See "Duration and Quota" below.
4. **`torch.compile` is NOT supported.** Use PyTorch [ahead-of-time compilation (AoTI)](https://huggingface.co/blog/zerogpu-aoti) (torch 2.8+) instead.
5. **Use `size="xlarge"` sparingly.** It allocates the full backing GPU, but costs 2x quota and tends to queue longer.

```python
@spaces.GPU(duration=120)
def generate_image(prompt: str):
    return pipe(prompt).images[0]
```

## CUDA Availability Model

Real GPU access is **only** available inside `@spaces.GPU`-decorated functions. Outside those functions, the GPU is not attached to the process.

However, `import spaces` **monkey-patches `torch`** so that:

- `torch.cuda.is_available()` returns `True` globally.
- `.to("cuda")` / `device="cuda"` calls at module scope succeed without error.

This is intentional. Module-scope `model.to("cuda")` calls register tensors with the ZeroGPU backend, which writes them to a disk offload directory at a startup "pack" step and frees the corresponding RAM. When a `@spaces.GPU` call lands, a forked GPU worker process streams those weights from disk into VRAM via a pinned-memory pipeline. Warm workers (reused across requests on the same GPU slot) keep weights resident on the GPU and skip the disk → VRAM step. The user-facing rule: write `device="cuda"` at module scope and it works — see `references/how-zerogpu-works.md` for the full lifecycle.

| Action | Where | Why |
|--------|-------|-----|
| `model.to("cuda")` / `pipe(..., device="cuda")` | **Module scope** | ZeroGPU registers the tensor and manages device migration |
| Actual CUDA computation (inference, etc.) | **Inside `@spaces.GPU`** | Real GPU is only attached during the decorated call |
| Branching on `torch.cuda.is_available()` | Avoid relying on it | Always returns `True` due to the monkey-patch |

Do not run inference or CUDA kernels at module scope — the real GPU is not attached, so operations either silently run on CPU or fail.

### Device selection idiom still works

The standard idiom remains correct under ZeroGPU:

```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = AutoModel.from_pretrained("...").to(device)
```

- **ZeroGPU** — `is_available()` is `True` (monkey-patched), so the model is registered for automatic device migration.
- **Dedicated GPU Spaces / local GPU** — `is_available()` is genuinely `True`.
- **CPU Spaces / local CPU** — resolves to `"cpu"`.

Do not hardcode `device="cuda"` — it breaks on CPU-only environments.

### Eager loading is the right default

Load models at module scope, not lazily on first request. The Space process starts before any user arrives, so cold-start cost is paid once. Lazy loading (`global model; if model is None: ...`, `@lru_cache` wrappers, factory functions instantiating on first call) just pushes that cost onto the first user.

## Local Development: Just Install `spaces`

Do **not** wrap `import spaces` in `try/except` and redefine `spaces.GPU` as a no-op fallback for local runs. Off-ZeroGPU, the `spaces` package is already a true no-op:

- Heavyweight behavior (CUDA monkey-patching, client init, startup hooks) is gated on the `SPACES_ZERO_GPU` env var, set only on ZeroGPU.
- `@spaces.GPU` returns the undecorated function unchanged off-ZeroGPU.
- Top-level `import spaces` performs only lightweight imports.

The Gradio SDK base image installs `spaces` on every hardware tier. So even after duplicating a Space onto a dedicated GPU (T4, L4, A10G, etc.) or CPU basic, no code changes are needed — `import spaces` still succeeds and `@spaces.GPU` becomes a transparent passthrough.

### Anti-pattern

```python
try:
    import spaces
except ImportError:
    class spaces:  # type: ignore
        @staticmethod
        def GPU(func=None, **kwargs):
            return func if func else (lambda f: f)
```

Problems:

1. The fallback must mimic every `@spaces.GPU` call shape — bare decorator, `duration=...`, `size=...`, generators, `aoti_*` helpers — and drifts as the `spaces` API grows.
2. It hides `spaces` from `requirements.txt`, even though the Space needs it at deploy time.
3. It solves a non-problem: the real package is already a no-op locally.

### Do this instead

Add `spaces` to dependencies and import it unconditionally:

```python
import spaces

@spaces.GPU
def generate(prompt: str) -> str:
    ...
```

## Duration and Quota

Three things happen when you declare `@spaces.GPU(duration=N)`:

1. **Tier-max check** — each visitor tier has a per-call `duration` cap. Declaring `duration` larger than the cap fails immediately with `ZeroGPU illegal duration`, regardless of remaining quota. (Tier numbers change over time — see the [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu).)
2. **Quota pre-check** — the platform compares `requested duration` against the user's `remaining quota`. If `remaining < requested`, the call fails with `ZeroGPU quota exceeded` — even if the actual work would have fit. The error message shows the explicit numbers, e.g. `"60s requested vs. 30s left"`. A 10-second task left at the default 60s therefore blocks the user once their remaining quota drops below 60s.
3. **Queue priority** — the queue is node-level (requests from all Spaces on the same node compete for GPU slots), and shorter declared `duration` ranks higher.

All three favor declaring the smallest realistic `duration` — including for short tasks. Explicit `@spaces.GPU(duration=15)` on a 10-second task avoids premature `quota exceeded` rejections and ranks higher in the queue.

> **`xlarge` doubles the request.** `requested = N * 2` when `size="xlarge"`, both for the tier-max check and the quota pre-check. So `@spaces.GPU(duration=60, size="xlarge")` is internally a 120s request.

### Dynamic duration for variable workloads

For workloads whose runtime depends on inputs, pass a callable that estimates per request. A static high `duration` locks out low-tier users (whose tier cap may be smaller than the static value) and unnecessarily reserves quota for light inputs.

```python
def estimate_duration(prompt, steps):
    return int(steps * 3.5)

@spaces.GPU(duration=estimate_duration)
def generate(prompt, steps):
    return pipe(prompt, num_inference_steps=steps).images[0]
```

For the full distinction between `illegal duration` vs `quota exceeded`, runs-per-day limits, the 24h quota window, and pay-as-you-go billing, see `references/how-quota-works.md`.

## Process Isolation and Pickle

`@spaces.GPU`-decorated functions run in a **separate process** managed by the ZeroGPU scheduler. Arguments and return values cross the process boundary via **pickle serialization**.

Consequences:

- **Only picklable objects** can be passed in or returned. Open file handles, database connections, locks, lambdas, and closures over unpicklable state will raise `PicklingError`.
- **Do NOT return CUDA tensors directly.** Unpickling a CUDA tensor in the main process triggers `torch.cuda._lazy_init()`, which ZeroGPU blocks. Convert to CPU first: return `tensor.cpu()` or `tensor.cpu().numpy()`.
- CPU tensors, numpy arrays, PIL Images, and plain Python objects work fine.
- Large objects incur serialization overhead. Prefer lightweight returns (tensors, arrays, file paths, base64 strings) over complex object graphs.

### `gr.State` semantics across the boundary

Because handlers run in a separate process, `gr.State` values are **pickled on every yield** — they are NOT shared by reference.

- The generator receives a **copy** of the state (`id()` differs from the caller's).
- In-place mutations inside the generator are **invisible** to other handlers until the mutated state is explicitly yielded back.
- Yielding `gr.update()` for a `gr.State` slot **skips the update** — other handlers continue to see the pre-yield value.
- Each yield that returns the state object creates a **new copy** via pickle.

Practical guidance:

- **Do NOT assume reference semantics for `gr.State`** on ZeroGPU. Code that mutates state in a generator and expects another handler to see those mutations will silently use stale data.
- **Every yield including a `gr.State` value triggers a full pickle round-trip.** For large state (model sessions, frame buffers), minimize how often you yield it — ideally once at the end. Use `gr.update()` for the state slot on intermediate yields.
- **CUDA tensors inside state must be moved to CPU before yielding** — same `torch.cuda._lazy_init()` issue as above.

## Concurrency

Handlers run **concurrently by default** on ZeroGPU. This is not opt-in. Code that worked in single-user testing can silently corrupt or leak data in production.

Three rules. Full treatment with examples in `references/concurrency.md`.

1. **No mutable global state.** Concurrent requests overwrite each other.
2. **No fixed file paths for outputs.** Concurrent requests clobber the same file. Use `tempfile` for unique paths.
3. **Read-only globals are safe.** Model objects, tokenizers, configs loaded once at startup and only read during requests are safe and encouraged.

## Call Granularity

Each entry into a `@spaces.GPU` function carries non-trivial cost — pickle round-trip across the process boundary, worker warm-up, CUDA re-attach, and a fresh pass through the node-level queue. Calling a decorated function from inside a hot loop multiplies these costs and adds a new failure mode: a later iteration may fail to acquire a GPU slot, stalling the whole job mid-way.

Decorate the outer function that owns the loop, not the per-iteration worker:

```python
# Avoid — N GPU entries for N frames
def process_video(frames):
    return [process_frame(f) for f in frames]

@spaces.GPU(duration=...)
def process_frame(frame):
    ...

# Prefer — one GPU entry for the whole video
@spaces.GPU(duration=...)
def process_video(frames):
    return [process_frame(f) for f in frames]

def process_frame(frame):
    ...
```

If the loop mixes heavy CPU work with GPU work, wrapping the whole loop charges that CPU time against the user's quota. When that cost is material, batching the GPU work so CPU pre/post-processing stays outside the decorator is a situational optimization — not the default.

## CUDA Build Constraints

HF Spaces builds Docker images in a CPU-only environment. **On ZeroGPU, the build phase has no `nvcc`** because the base image is `python:3.13` (dedicated-GPU Spaces use `nvidia/cuda:*-devel-*` and have `nvcc` at build time). A CUDA-dependent package whose only distribution is sdist — e.g. bare `flash-attn` — therefore cannot be installed via `requirements.txt` on ZeroGPU. Only pre-built wheels work.

ZeroGPU **runtime** does have `nvcc` available, mounted from a CUDA devel image at `/cuda-image` since 2025-07 (originally added for AoTI support). This is what makes `torch.export` / AoTI workflows possible inside `@spaces.GPU` calls.

**Bottom line**: install every CUDA-dependent package from a pre-built wheel. If no wheel is available on PyPI, build one externally (e.g. host on HF Hub) and pin the URL. For `flash-attn`, the upstream releases page ships a fairly complete wheel matrix covering most Python × CUDA × torch combinations.

For wheel-tag reading (cxx11 ABI, `cu12torch2.X`, `cp3XX`), torch-family side-car drift, and the kernels-community fallback, see `references/cuda-and-deps.md`.

## Example Caching

`gr.Examples` behavior is environment-dependent. On ZeroGPU specifically:

- `cache_examples` defaults to `True` (Spaces sets `GRADIO_CACHE_EXAMPLES=true`).
- `cache_mode` defaults to `"lazy"` (Spaces sets `GRADIO_CACHE_MODE=lazy` only on ZeroGPU).

ZeroGPU defaults to `lazy` because eager caching pre-runs every example at app startup, but ZeroGPU has **no GPU attached at startup** — only during request handling. Eager caching of GPU-bound examples would fail there.

When `cache_examples=True`, the `run_on_click` / `run_examples_on_click` parameter is silently ignored. If your app relies on click-populates-only behavior, set `cache_examples=False` explicitly to preserve it.

To reproduce ZeroGPU example-caching behavior locally:

```bash
GRADIO_CACHE_EXAMPLES=true GRADIO_CACHE_MODE=lazy python app.py
```

## Dependency Management

### `python_version` pin in README frontmatter

Pinning `python_version` is **effectively required** for ZeroGPU. The runtime default is currently Python 3.10, so a local environment using 3.11+ will fail to install on the Space without an explicit pin. Pin to a ZeroGPU-supported version (3.12 is a reasonable default); the authoritative supported list lives in the [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) — do not hardcode the full list, refer to the docs.

```yaml
# README.md frontmatter
python_version: "3.12"
```

Both `"3.12"` and `"3.12.12"` forms are accepted.

### Do not pin `spaces` in `requirements.txt`

The Space platform pins its own `spaces` version. A conflicting pin in `requirements.txt` causes pip resolution to fail at build time.

> **Rule**: Do not include `spaces` in `requirements.txt`.

How to achieve this depends on your tooling:

- **Hand-written `requirements.txt`**: simply omit `spaces`.
- **uv** (`pyproject.toml`-managed): declare `spaces` in `pyproject.toml` so uv co-resolves transitive constraints (notably `psutil`, which `spaces` pins), then exclude it from the export:
  ```bash
  uv export --no-hashes --no-dev --no-emit-package spaces -o requirements.txt
  ```
  Without `spaces` in `pyproject.toml`, uv cannot see its transitive constraints and may resolve incompatible versions at build time.
- **pip-tools** (`pip-compile`) / **Poetry**: use the equivalent exclude mechanism.

### Pin `torch` to match wheel tags

If you install a CUDA-dependent wheel via direct URL, the wheel filename encodes the `torch` major.minor it was built against (e.g. `cu12torch2.8`). Pin `torch==X.Y.Z` in `requirements.txt` to match — otherwise pip may resolve `torch` to a different version and the Space fails on first import. Details and the kernels-community alternative are in `references/cuda-and-deps.md`.

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
