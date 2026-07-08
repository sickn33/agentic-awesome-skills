# Known errors

Check if this is a known issue before trying your own fix. Entries are keyed by the substring that actually appears in `runtime.errorMessage`, the build log, or a Python traceback — grep this file for the error you saw.

If you hit something not listed here and figure out a fix, please ask your human to PR it back so future runs benefit.

---

## Build / config errors

These come from the Space build pipeline before the app starts. Read with `hf spaces logs <id> --build --tail 500` — find the **first** error, not the last.

### `CONFIG_ERROR: torch version in requirements.txt is not compatible with ZeroGPU`

**Cause**: `requirements.txt` pins `torch==X.Y.Z` to a version outside the supported set (`2.8.0`, `2.9.1`, `2.10.0`, `2.11.0`).
**Fix**: Unpin torch (preferred — the runtime preinstalls the latest supported version), or pin to one of the supported values.

### `Cannot install … because these package versions have conflicting dependencies` / `ResolutionImpossible`

**Cause**: A dep conflicts with the Gradio SDK pinned by `sdk_version:` in README. Most commonly `pydantic`, `uvicorn`, `huggingface_hub`, or `jinja2` pinned to old values that the SDK no longer accepts.
**Fix**: Unpin the offender. For `gradio[mcp]` specifically, `uvicorn>=0.31.1` and `pydantic>=2.11.10` are required.

### Build hangs in dependency resolution > 10 min

**Cause**: pip backtracking through a deep version space.
**Fix**: Pin the conflicting transitive dep. The `--build` logs will show which one. Bump `startup_duration_timeout: 1h` in README frontmatter if heavy downloads are expected.

### `ModuleNotFoundError: No module named 'pkg_resources'`

**Cause**: setuptools 81 dropped `pkg_resources`; an old package's `setup.py` imports it.
**Fix**: Bump or unpin the offender. Typical culprits: `deepspeed==0.15.x` (training-only — usually safe to drop from inference Spaces), `openai-whisper==20231117`.

### `400 Bad Request` from `/api/validate-yaml` during `create_repo` / `upload_file`

**Cause**: README frontmatter failed server validation. Most common: `short_description` over the (undocumented) character cap — target ≤ 60.
**Fix**: Shorten `short_description`. Long descriptions go in the README body. Also double-check `colorFrom`/`colorTo` are one of `red|yellow|green|blue|indigo|purple|pink|gray`.

### `403 Forbidden` from `create_repo` with `space_hardware="zero-a10g"`

**Cause**: The user isn't on PRO / Team / Enterprise so the API rejects ZeroGPU at creation.
**Fix**: Retry without `space_hardware=`. Keep `hardware:` out of README frontmatter (silently ignored anyway). The Space is created on CPU; point the user at PRO upgrade or [community grant](grants.md).

### `403 Forbidden` from `create_commit(..., create_pr=True)`

**Cause**: Upstream Space has Discussions disabled.
**Fix**: Ask the maintainer to enable Discussions, or push directly if you have write access.

---

## Startup / RUNTIME_ERROR

These come from `hf spaces logs <id> --tail 500`.

### `RuntimeError: CUDA has been initialized before importing the spaces package`

**Cause**: Something triggered CUDA init in the main process before `import spaces`. Usually wrong import order; sometimes a third-party lib eagerly initializing CUDA at import time (e.g. `numba.cuda`).
**Fix**: Reorder so `import spaces` is first. For numba-using stacks (NeMo, RAPIDS bits):
```python
import os
os.environ.setdefault("NUMBA_DISABLE_CUDA", "1")
import spaces
```

### `RuntimeError: No @spaces.GPU function detected during startup`

**Cause**: The function bound to `.click(fn=...)` / `.submit(...)` isn't decorated. Decorating an inner helper doesn't count — the startup scan only walks Gradio's registered handlers.
**Fix**: Decorate the function Gradio binds. If that conflicts with another decorator, wrap explicitly:
```python
@spaces.GPU(duration=60)
def gpu_inner(...): ...
def gradio_handler(...): return gpu_inner(...)
```
(Or just decorate `gradio_handler` directly.)

### `ImportError: cannot import name 'HfFolder' from 'huggingface_hub'`

**Cause**: Old gradio (`4.44` and similar) imports `HfFolder` from `huggingface_hub`, which was removed in recent hub releases.
**Fix**: Two options.
- Pin `huggingface-hub==0.25.0` in `requirements.txt` (keeps old gradio happy).
- Bump `sdk_version` in README to `5.x` or `6.x` (also fixes a lot of other API breaks).
If a Gradio custom component locks the major (`gradio-image-prompter`, `gradio_litmodel3d`, …), install it with `--no-deps` so its `gradio<5.0` requirement doesn't bind.

### `ImportError: cannot import name 'is_traceable_wrapper_subclass' from 'torch.utils._python_dispatch'`

**Cause**: A dep with `torchaudio<2.1` / `torch<2` in its `setup.py` (e.g. `demucs`, `audiocraft`) downgraded torch silently. The build succeeded, the app booted, and `import spaces` then died on a missing torch symbol.
**Fix**: Install the offender from `app.py` with `--no-deps` *before* `import spaces`:
```python
import subprocess, sys
subprocess.run([sys.executable, "-m", "pip", "install", "--no-deps",
                "git+https://github.com/facebookresearch/demucs"], check=True)
import spaces
```
List its actual runtime deps (`dora-search einops julius lameenc openunmix pyyaml tqdm` for demucs) yourself in `requirements.txt`.

### `_pickle.UnpicklingError: Weights only load failed`

**Cause**: `torch.load` weights-only default flipped to `True` in torch 2.6. Old checkpoints pickling numpy/object globals fail.
**Fix**: For trusted upstream checkpoints, monkey-patch before the package import:
```python
import torch
_orig = torch.load
torch.load = lambda *a, **k: _orig(*a, **{**k, "weights_only": k.get("weights_only", False)})
```

### Stuck at `ZeroGPU init – 10.0%` then 60 s timeout

**Cause**: A library called `cuInit` in the parent process, poisoning the fork (most often `numba.cuda` via NeMo). The actual `@spaces.GPU` body never starts.
**Fix**: `os.environ.setdefault("NUMBA_DISABLE_CUDA", "1")` as the first line of `app.py`, before `import spaces`.

### `RUNTIME_ERROR` right after long `APP_STARTING`, logs sparse

**Cause**: Boot exceeded `startup_duration_timeout` (default 30 min). Big-model loads commonly trigger this.
**Fix**: Bump `startup_duration_timeout: 1h` in README frontmatter. For Gradio 6 specifically, also set `GRADIO_SSR_MODE=false` via `hf spaces variables add <id> --env GRADIO_SSR_MODE=false` to dodge SSR health-check timeouts during slow boot.

### `RUNNING` but the public URL returns 404

**Cause**: The Space is private. Anonymous Client / browser hits return 404.
**Fix**: Authenticate. `gradio_client.Client(space, token=os.environ["HF_TOKEN"])`. The kwarg is `token=`, not `hf_token=`.

### `workload was not healthy after 30 min`

**Cause**: Infra-side scheduling or a build that genuinely can't finish in time.
**Fix**: Usually not actionable in code. Bump `startup_duration_timeout` if heavy downloads are expected; otherwise wait or report.

### Exit code 128 / containerd / scheduling failure

**Cause**: HF infra glitch.
**Fix**: `hf spaces restart <id> --factory-reboot`. If it persists, retry later or report. Not fixable in code.

---

## Inference-time errors

These appear in `hf spaces logs <id> --follow` while a request is running.

### `ZeroGPU illegal duration`

**Cause**: `@spaces.GPU(duration=N)` is larger than the visitor's tier per-call cap.
**Fix**: Lower `N`. Tier caps live in the [ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu).

### `ZeroGPU quota exceeded (X requested vs Y left)`

**Cause**: The visitor's remaining quota < `requested duration`. The comparison is `requested vs remaining`, not `actual vs remaining` — a 10-second task left at the default 60 s blocks the user as soon as their remaining drops below 60 s.
**Fix**: Lower `duration` to the realistic worst case. For input-dependent runtime, use a callable estimator.

### `RuntimeError: NVML_SUCCESS == r INTERNAL ASSERT FAILED at .../CUDACachingAllocator.cpp`

**Cause**: Allocator fragmentation under transient memory spikes (high-res pixel-space ops, large attention activations, SR models, video DiTs). Not a clean OOM.
**Fix**: Set expandable segments at the **very top** of `app.py`, before any torch import:
```python
import os
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")
import spaces
import torch
```
Usually a single-line fix that replaces lowering resolution or moving to `xlarge`.

### Call hangs forever on first `@spaces.GPU` entry

**Cause**: The decorated function returned a CUDA tensor. Unpickling it in the main process triggers `torch.cuda._lazy_init()`, which ZeroGPU blocks.
**Fix**: Convert to CPU before returning: `return tensor.cpu()` or `.cpu().numpy()`. For `gr.State`, scrub before yielding.

### `PicklingError` at call entry

**Cause**: An argument crossing the fork boundary contains an unpicklable object — file handle, lock, lambda, closure, or `gr.SelectData`.
**Fix**: Extract the picklable fields in a thin un-decorated wrapper, pass plain values to the `@spaces.GPU` function. For `gr.SelectData` specifically, pull out `evt.index[0]`, `evt.index[1]` etc. outside the decorator.

### `RecursionError` inside `gr.SelectData.__getattr__`

**Cause**: Same as above — `gr.SelectData` doesn't survive pickle.
**Fix**: Same — extract its fields before crossing the boundary.

### `CUDA error … flash_fwd_launch_template.h: no kernel image is available for execution on the device` (or `:188: invalid argument`)

**Cause**: A Flash Attention 3 kernel was loaded — directly via `kernels-community/{flash-attn3,vllm-flash-attn3,sgl-flash-attn3}`, or indirectly via an old `xformers` wheel that auto-dispatched to FA3. FA3 has no Blackwell sm_120 build.
**Fix**: Use `attn_implementation="sdpa"`, or `"flash_attention_2"` with the FA2 wheel from `multimodalart/zerogpu-blackwell-wheels`. For xformers, the prebuilt wheel from the same dataset auto-dispatches to FA2 — no monkey-patch.

### `NotImplementedError: sgl_flash_attn3 is only supported on sm80 and above with CUDA >= 12.3`

**Cause**: `kernels-community/sgl-flash-attn3` rejects sm_120 at runtime despite the error wording. Same root cause as the FA3 entry above.
**Fix**: Same — SDPA or FA2.

### `ImportError: cannot import name 'flash_attn_varlen_func' from 'flash_attn'` / model insists on `attn_implementation="flash_attention_2"`

**Cause**: The model imports flash_attn at module top with no escape hatch, and the runtime doesn't ship it.
**Fix**: Install the prebuilt `flash_attn-2.8.3-cp310-cp310-linux_x86_64.whl` from `multimodalart/zerogpu-blackwell-wheels`. Requires `python_version: "3.10"` in README (wheel is cp310 only). Real `flash_attn_2_cuda` satisfies xformers' `flash_attn_gpu` probe too.

For transformers `AutoModel`-style configs that aren't a hard import, swap `attn_implementation="flash_attention_2"` → `"sdpa"`. Torch-native, zero deps.

### `selective_scan_cuda.so undefined symbol` / `_torchaudio.abi3.so undefined symbol`

**Cause**: A direct-URL prebuilt CUDA wheel pinned to an old torch ABI (`cu12torch2.4cxx11abiFALSE`, etc.) — won't load on the current runtime.
**Fix**: Drop the URL-pinned wheel from `requirements.txt`. Use a torch-current wheel from `multimodalart/zerogpu-blackwell-wheels`, kernels-community, or upstream's release page.

### `TypeError: 'dict' object is not hashable` inside `jinja2/utils.py:get`

**Cause**: Old gradio (4.44) + modern starlette / jinja2 cache clash.
**Fix**: Either pin `jinja2<3.2` + `starlette<0.40` (keeps old gradio), or bump `sdk_version` past 5.0.

---

## Smoke-test / client errors

### `Client.__init__() got an unexpected keyword argument 'hf_token'`

**Cause**: Older `gradio_client` API used `hf_token=`; current uses `token=`.
**Fix**: `Client(space, token=os.environ["HF_TOKEN"])`.

### `httpx.ReadTimeout` on `client.predict(...)`

**Cause**: Default timeout too small for the GPU duration.
**Fix**: `Client(..., httpx_kwargs={"timeout": 600})`. Set this to at least your `@spaces.GPU(duration=N)` plus 60 s.

### `404` on what looks like a valid endpoint name

**Cause**: Streaming endpoint (function uses `yield`), or a custom `gr.Server` `@app.get/post` route that doesn't appear in `view_api()`.
**Fix**: For streaming, use `client.submit(...).result()` (or iterate the job). For custom routes, use `httpx.post(base_url + "/route", ...)` directly — bypass `gradio_client`.

### Result file looks empty / dimensions wrong

**Cause**: HTTP 200 ≠ correct output. The model snapped to a different size, or the wrong endpoint was hit.
**Fix**: Sniff the returned file's magic bytes (`glTF`, `\x89PNG`, `RIFF…WEBP`, `RIFF…WAVE`, `[4:8]==b"ftyp"`) and check returned dimensions match what was requested.

---

## Submitting new entries

If you hit an error not in this file and figure out the fix, please ask your human to PR it back to this skill. Format:

- A 1-line heading with the exact error substring an agent would grep for.
- **Cause**: one sentence on what triggered it.
- **Fix**: concrete commands or code. If the fix needs more than 5 lines of narrative, point to another reference file (e.g. [`debugging.md`](debugging.md), [`zerogpu.md`](zerogpu.md)) for depth.
