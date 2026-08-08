# ZeroGPU

Read this whenever the Space targets ZeroGPU (`zero-a10g` flavor). The SKILL.md's 3-rule summary is a starting point; this file covers the model in enough detail to debug and design.

For numerical limits (per-tier daily quota minutes, runs-per-day caps, current backing GPU, supported Python / torch versions): https://huggingface.co/docs/hub/spaces-zerogpu. Those values change over time and are deliberately kept out of this skill.

## The mental model

A ZeroGPU Space runs as **two processes**:

- **Main web process** — long-lived. Imports `app.py`, launches Gradio. Holds no VRAM and, after the startup "pack" step, no model weights in RAM either.
- **GPU worker** — short-lived. Forked per `@spaces.GPU` request (or reused if warm). Eventually killed by the ZeroGPU scheduler when another Space needs the slot. Your code never kills its own worker.

`import spaces` monkey-patches `torch.cuda.*` in the main process so that `.to("cuda")` and `torch.cuda.is_available()` work at module scope **without** a real GPU attached. Module-level `model.to("cuda")` is intercepted: the tensor data physically stays in main-process RAM at this point, with a CUDA-presenting "fake" tensor registered alongside. At a startup "pack" step, the backend writes those original CPU tensors to disk via `O_DIRECT` and frees the RAM. After pack, main holds no weights anywhere.

When a `@spaces.GPU` call lands, the scheduler routes it to a worker:

- **Cold worker** — forked from the main process; torch is unpatched; real CUDA is initialized; weights are streamed disk → pinned host → VRAM via a double-buffered pipeline. This is the cold-start cost.
- **Warm worker** — alive worker bound to the same slot; init is skipped; weights stay on VRAM from the previous call.

A warm worker eventually dies when another Space needs the slot. Occasional cold starts on a low-traffic Space are normal.

## The three rules

### 1. `import spaces` before any CUDA-touching import

```python
import spaces      # FIRST
import torch       # then this
```

If something initializes CUDA before `import spaces`, the patch can't apply and you get `RuntimeError: CUDA has been initialized before importing the spaces package`. For libraries that eagerly init CUDA on import (e.g. `numba.cuda`, NeMo via numba), set the disable env *before* the import:

```python
import os
os.environ.setdefault("NUMBA_DISABLE_CUDA", "1")
import spaces
```

### 2. Load models at module scope, `.to("cuda")` eagerly

```python
pipe = DiffusionPipeline.from_pretrained("...", torch_dtype=torch.bfloat16).to("cuda")
```

Do **not** lazy-load inside `@spaces.GPU`. The hijack is designed for module-level placement; deferring it puts tens of seconds of checkpoint I/O + dtype cast + GPU move inside every cold request.

Use the **string `"cuda"`** — never an integer device id. ZeroGPU re-allocates device ids per request, so `.to(0)`, `device_map={"": 0}`, `torch.cuda.set_device(0)` silently break.

For plain `from_pretrained` loads, use `.to("cuda")`, **not** `device_map="cuda"` (which routes through `accelerate.set_module_tensor_to_device` and calls `torch._C._cuda_init()` at load time, bypassing the hijack). The exception is loaders that are ZeroGPU-aware — notably the `bitsandbytes` quantization path; `from_pretrained(..., quantization_config=BitsAndBytesConfig(...))` works with `device_map="cuda"`.

**Preloading multiple variants** (e.g. base + refiner, image + video model) is fine as long as their combined VRAM fits. Load all of them sequentially at module scope into a dict, then key per request. Don't unload/reload between requests — that puts the load cost back on the user.

### 3. Decorate the function Gradio binds

ZeroGPU's startup scan walks Gradio's registered event handlers for `@spaces.GPU`-marked functions. If you decorate `inner_helper` but `click(fn=outer)` is what's wired up, you get `RuntimeError: No @spaces.GPU function detected during startup`. Always decorate the function passed to the event handler.

```python
@spaces.GPU(duration=60)
def generate(prompt):
    return pipe(prompt).images[0]

btn.click(fn=generate, inputs=prompt_box, outputs=image_out)
```

## Sizing duration

`@spaces.GPU(duration=N)` means "reserve N seconds of GPU time." Two failure modes:

- **`ZeroGPU illegal duration`** — `N` exceeds the visitor's tier cap. Lowering `duration` is the only fix.
- **`ZeroGPU quota exceeded`** — the visitor's remaining quota is less than `requested`. Compared as `requested vs remaining`, not `actual vs remaining` — so a 10-second task left at the default 60 s blocks the user as soon as their remaining drops below 60 s.

Smaller `duration` also ranks **higher** in the queue. Both reasons push toward declaring the realistic worst case, not a comfortable margin.

**Pick the value — don't guess.** A too-high duration deploys cleanly then errors on the first call; too-low silently truncates. Methodology:

1. Ship with a placeholder (e.g. 180 s).
2. Instrument with `time.perf_counter()` and return the seconds in the response.
3. Run 2–3 representative calls via `gradio_client`.
4. Set `duration = round(measured_max × 1.4)`.

For input-dependent runtime, pass a **callable**:

```python
def _estimate(prompt, steps, *args, **kwargs):
    # Swallow extras with *args, **kwargs — Gradio passes progress= positionally
    # and a strict signature will raise "takes 5 positional arguments but 6 were given"
    return min(240, 60 + int(steps * 3.5))

@spaces.GPU(duration=_estimate)
def generate(prompt, steps, ..., progress=gr.Progress(track_tqdm=True)):
    ...
```

## Sizing memory: `large` vs `xlarge`

`size="large"` (default) is half the backing card (48 GB on Blackwell). `size="xlarge"` is the full card (96 GB) and costs **2× quota** per second — plus higher queue waits. Use `large` unless the workload genuinely OOMs.

Rough VRAM sizing:

| Mode | Memory rule | 7B | 27B | 70B |
|------|------------|------|------|------|
| bf16 | `params × 2` GB | 14 GB ✓ large | 54 GB → xlarge | 140 GB → quant + xlarge |
| int8 | `params × 1` GB | 7 GB ✓ large | 27 GB ✓ large | 70 GB → xlarge |
| 4-bit (NF4 / int4) | `params × ~0.55` GB | 4 GB ✓ large | 15 GB ✓ large | 40 GB ✓ large |

Numbers are for weights only; activations and KV cache add on top (significant for long context).

## Quantization

ZeroGPU supports two quantization stacks: **`bitsandbytes`** (drop-in for transformers, well-trodden) and **`torchao`** (torch-native, newer, smaller install). Pick by what your model's `from_pretrained` actually wires up; if both work, default to `bitsandbytes` for transformers LLMs and `torchao` for diffusers.

### bitsandbytes (NF4 / int8)

```python
import spaces, torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb,
    device_map="cuda",            # OK here — bnb's loader is ZeroGPU-aware
    dtype=torch.bfloat16,
).eval()
```

This is the one case where `device_map="cuda"` is **safe** on ZeroGPU at module scope (bitsandbytes' loader path intercepts cleanly). For non-bnb loads, stick to `.to("cuda")`.

`load_in_8bit=True` swaps the 4-bit block for int8 — same hijack-safe loader. Bigger but higher quality, no `compute_dtype` knob.

### torchao

```python
import spaces, torch
from diffusers import DiffusionPipeline
from torchao.quantization import quantize_, Int8WeightOnlyConfig

pipe = DiffusionPipeline.from_pretrained(MODEL_ID, torch_dtype=torch.bfloat16).to("cuda")
quantize_(pipe.transformer, Int8WeightOnlyConfig())   # mutates in place
```

`torchao` is more flexible (fine-grained per-module quantization, `Int4WeightOnlyConfig`, `Float8WeightOnlyConfig`, etc.) and works with diffusers' `from_pretrained(..., quantization_config=TorchAoConfig(...))` integration too. No CUDA build dependency — installs as a wheel.

### Attention backends

Default to `attn_implementation="sdpa"` — torch-native, works everywhere. Reach for an FA backend only when the upstream repo uses it by default or strongly recommends it. If it breaks on Blackwell, fall back to SDPA.

**Flash Attention 2** works via the prebuilt wheel at `multimodalart/zerogpu-blackwell-wheels` ([`requirements.md`](requirements.md)). The wheel's real `flash_attn_2_cuda` also satisfies xformers' import-time probes.

**Flash Attention 3** is not currently usable on Blackwell sm_120. `kernels-community/flash-attn3`, `vllm-flash-attn3`, and `sgl-flash-attn3` all fail with `no kernel image is available` or `NotImplementedError`. Use SDPA or FA2 instead.

**xformers** is available via the prebuilt wheel — auto-dispatch picks FA2 on sm_120 with no monkey-patch.

## Concurrency

Handlers run **concurrently by default**. Three rules:

1. **No mutable global state.** Handlers writing to a module-level dict / list race each other.
2. **No fixed output paths.** Two concurrent calls writing to `output.png` clobber each other (and leak data across users). Use `tempfile.NamedTemporaryFile(suffix=...)`.
3. **Read-only globals are safe** — models, tokenizers, configs loaded once and only read inside handlers.

## Process isolation and pickle

`@spaces.GPU` runs in a separate fork. Arguments and return values cross via pickle:

- **Only picklable objects** in/out. File handles, locks, lambdas, closures over unpicklable state → `PicklingError`.
- **Never return CUDA tensors.** Unpickling in the main process triggers `torch.cuda._lazy_init()`, which ZeroGPU blocks → the call hangs. Convert to CPU first: `return tensor.cpu()` or `.cpu().numpy()`.
- CPU tensors, numpy arrays, PIL Images, plain Python objects work fine.
- `gr.SelectData` is a special case — its `__getattr__` recurses under pickle. Extract the fields you need (`evt.index[0]`, etc.) in a thin un-decorated wrapper, pass plain values to the `@spaces.GPU` function.

### `gr.State` across the fork

`gr.State` is pickled on every yield. The handler receives a **copy**:

- In-place mutations inside the fork are invisible to other handlers until you explicitly `yield` the mutated value back.
- Yielding `gr.update()` for a state slot **skips** the update — other handlers continue to see pre-yield value.
- For large state, minimize how often you yield it — ideally once at the end.
- CUDA tensors inside state must be CPU-d before yielding (same `_lazy_init` issue).

## Generators and streaming

`@spaces.GPU` supports generator functions — first-class for progressive UI updates:

```python
@spaces.GPU(duration=120)
def generate(prompt):
    yield gr.update(value=None, label="Starting…")
    for step in range(num_steps):
        latent = step_fn(...)
        yield gr.update(value=preview(latent), label=f"Step {step+1}/{num_steps}")
    yield gr.update(value=final_image, label="Done")
```

`gr.Progress(track_tqdm=True)` and `yield` compete with each other — pick one.

For streaming previews **inside** a diffusers `callback_on_step_end`, use a thread + queue inside the decorator (forks share threads):

```python
@spaces.GPU(duration=180)
def generate(prompt, num_steps):
    q = queue.Queue()
    DONE = object()
    def cb(pipe, step, t, kw):
        q.put((step, taef1_preview(kw["latents"])))
        return kw
    def run():
        out = pipeline(prompt=prompt, num_inference_steps=num_steps,
                       callback_on_step_end=cb,
                       callback_on_step_end_tensor_inputs=["latents"])
        q.put((DONE, out))
    threading.Thread(target=run, daemon=True).start()
    while True:
        idx, payload = q.get()
        if idx is DONE: break
        yield gr.update(value=payload, label=f"Step {idx+1}/{num_steps}")
```

**Do not** use `ProcessPoolExecutor` / `multiprocessing.Pool` inside `@spaces.GPU` — the daemonic fork can't spawn children (`AssertionError: daemonic processes are not allowed to have children`). Threads only.

## Compilation

`torch.compile` is **not supported** on ZeroGPU. Use PyTorch ahead-of-time inductor (AoTI), supported from torch 2.8+. Full guide: https://huggingface.co/blog/zerogpu-aoti. The `spaces` package exposes `aoti_capture`, `aoti_compile`, `aoti_apply`, `aoti_blocks_load` for the workflow.

## Local development

**Do NOT** wrap `import spaces` in `try/except` with a no-op fallback. Off-ZeroGPU, the `spaces` package is *already* a true no-op — the heavyweight behavior is gated on `SPACES_ZERO_GPU=1`, set only on ZeroGPU. `@spaces.GPU` returns the undecorated function unchanged elsewhere. The Gradio base image installs `spaces` on every hardware tier, so a duplicate onto T4 / A10G / CPU works without code changes too.

That said: **iterate ON the Space, not locally.** The Space environment (Python, torch, CUDA, drivers, env vars) differs from yours; passing local tests doesn't prove the Space works. Push early — even with the app not fully polished — and use the rung ladder ([`debugging.md`](debugging.md)) against the live URL.

## Allocator config for memory pressure

If your workload hits transient allocation spikes (high-res pixel-space ops, large attention activations, SR models, video DiTs) and you see:

```
RuntimeError: NVML_SUCCESS == r INTERNAL ASSERT FAILED at .../CUDACachingAllocator.cpp
```

set expandable segments at the **very top** of `app.py`, before any torch import:

```python
import os
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
import spaces
import torch
```

Often single-line fix for what looks like an OOM. See [`known-errors.md`](known-errors.md).

## Example caching

`gr.Examples` defaults on ZeroGPU:

- `cache_examples=True`
- `cache_mode="lazy"` (eager would pre-run examples at startup, but no GPU is attached at startup)

Don't override to `cache_mode="eager"` on ZeroGPU — it will fail or burn the creator's daily quota. The cache is keyed by example **file path**, not content hash: regenerating an asset in place serves the stale cached output. Bump a `cache_version` constant if you replace example files.

## Real-time sessions

For real-time apps (webcam, audio streaming), the per-call fork model is too costly. ZeroGPU supports reusable "real-time sessions" — one GPU allocation amortized across many small requests. Reference Spaces:

- https://huggingface.co/spaces/diffusers/unofficial-SDXL-Turbo-i2i-t2i
- https://huggingface.co/spaces/huggingface-projects/rf-detr-realtime-webcam

## When things go wrong

For specific error strings (CUDA init order, illegal duration, allocator asserts, PicklingError, returning CUDA tensors, …): [`known-errors.md`](known-errors.md). It covers the ZeroGPU-specific patterns alongside everything else and is the single error lookup for the skill.

When the log endpoint can't explain a failure (device-side asserts, OOM under specific shapes, race conditions in pickle), dev mode + SSH is the last-resort tool — see [`debugging.md`](debugging.md).
