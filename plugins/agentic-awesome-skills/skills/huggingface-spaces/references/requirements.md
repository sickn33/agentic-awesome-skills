# requirements.txt for Spaces

Rules for what to pin, what to leave alone, where to source CUDA wheels, and which torch-side-cars drift silently.

## What's preinstalled (do not list)

The Gradio SDK base image already installs these on every hardware tier — listing them in `requirements.txt` causes resolution failures or, worse, lets pip silently drift the runtime out of compatibility:

| Package | Pinning rules |
|---|---|
| `gradio` | Don't list. Locked by `sdk_version:` in README frontmatter; pinning here is ignored or breaks. |
| `spaces` | Don't list. Platform-pinned; a user pin always loses. |
| `huggingface_hub` | Don't list by default. Pin only as a workaround for old `gradio<5` that imports the removed `HfFolder` symbol (see [`known-errors.md`](known-errors.md)). |
| `torch` | **Pinnable, but only within `{2.8.0, 2.9.1, 2.10.0, 2.11.0}`.** Anything outside causes `CONFIG_ERROR: torch version in requirements.txt is not compatible`. Default is to leave unpinned (runtime preinstalls 2.11), but pinning is appropriate when (a) a specific version is known-good for your model, (b) you're matching a CUDA-extension wheel's `torch2.X` tag, or (c) a dep would otherwise drag torch outside the supported set. When you pin torch, also pin `torchvision` / `torchaudio` to the matching minor — see the "Torch-family side-car drift" section below. |

## What to list

Everything you actually `import`, including the often-forgotten:

- `torchvision`, `torchaudio` — **not** preinstalled. Leave unpinned; pip resolves against the installed `torch` major.minor.
- `accelerate` — needed whenever you use `device_map=`. Listing it also silences `low_cpu_mem_usage=False` warnings.
- `sentencepiece` — required by most LLM tokenizers; rarely transitive.
- `einops` — required by `flash_attn.layers.rotary` and many model repos.
- Domain libs: `diffusers`, `transformers`, `safetensors`, `pillow`, `numpy`, etc.

If a research repo ships a Python package directory (`models/`, `pipeline/`, …), just upload the directory with the rest of the Space — the whole repo root is importable as `/home/user/app`. **Do not** try to reference local paths from `requirements.txt`.

## Pinning torch

ZeroGPU accepts only `2.8.0`, `2.9.1`, `2.10.0`, `2.11.0`. Default is unpinned (runtime preinstalls the latest). Pinning is fine — and sometimes warranted — within that set:

- A specific torch is known-good for your model (numerics, attention kernel availability, etc.).
- A direct-URL CUDA wheel encodes a `torch2.X` tag (see "Prebuilt CUDA wheels" below) — pin torch to match.
- A dep's `setup.py` would otherwise downgrade torch outside the supported set.

`2.8.0` is the safest fallback for old requirements that refuse modern torch. `2.10.0` / `2.11.0` is the sweet spot for new code. When you pin torch, also pin `torchvision` / `torchaudio` to the matching minor — see the side-car drift section.

When a dep would silently downgrade torch (e.g. some forks of `demucs`, `audiocraft` pin `torchaudio<2.1`), install the offender from `app.py` with `--no-deps` rather than pinning torch around it:

```python
import subprocess, sys
subprocess.run([sys.executable, "-m", "pip", "install", "--no-deps",
                "git+https://github.com/facebookresearch/demucs"], check=True)
import spaces  # safe now — torch wasn't touched
```

List the offender's real runtime deps yourself in `requirements.txt`.

## Torch-family side-car drift

`torchvision`, `torchaudio`, `torchcodec` are built against a specific `torch` major.minor. Listing them unpinned **usually** works, but two known drift patterns:

- `torchaudio==2.11.0` (and later) **dropped its `Requires-Dist: torch==X.Y.Z` line**. With torch pinned to 2.10, pip silently resolves torchaudio to 2.11.0 and the import fails on ABI mismatch.
- `torchcodec` declares no torch dependency in PyPI metadata at all.

Verification after `pip install` or `uv lock --upgrade`:

```bash
curl -s https://pypi.org/pypi/<pkg>/<version>/json \
  | python3 -c "import json,sys,re; rd=json.load(sys.stdin)['info'].get('requires_dist') or []; \
                print('\n'.join(x for x in rd if re.match(r'^torch(?![a-z])', x)) or '(no torch constraint)')"
```

When PyPI is silent, fall back to the project's README compatibility table (torchcodec's lives at https://github.com/pytorch/torchcodec).

## Prebuilt CUDA wheels — the Blackwell wheels dataset

For CUDA-extension packages without an upstream wheel matching the ZeroGPU torch / cuda / cxx11-abi cell, use the canonical prebuilt wheels at:

> https://huggingface.co/datasets/multimodalart/zerogpu-blackwell-wheels

Wheels live at `wheels/<cell>/<package>-<ver>-<tag>.whl`. Current cells:

- `pt212-cu130-cp310` — built against torch 2.12 / CUDA 13.0 / Python 3.10. **Works on the live ZeroGPU runtime (torch 2.11)** for all packages below.
- `pt212-cu130-cp312`, `pt212-cu130-cp313` — same matrix at other Python versions.
- `pt28-cu128-cp310` — older fallback for Spaces stuck on torch 2.8 / CUDA 12.8.

Reference by direct URL in `requirements.txt`:

```
https://huggingface.co/datasets/multimodalart/zerogpu-blackwell-wheels/resolve/main/wheels/pt212-cu130-cp310/<wheel>
```

### Per-package status

Verified empirically against the live runtime + the real Spaces that previously shipped runtime patches:

| Package | Wheel | Replaces | Caveats |
|---|---|---|---|
| `xformers` | `xformers-0.0.34+3da0fc92.d20260528-cp39-abi3-linux_x86_64.whl` | MEA→SDPA monkey-patch shim; Cutlass-force shim | `Requires: torch>=2.10`. Auto-dispatch picks FA2 (`fa2F@2.5.7-pt`) on sm_120. Classic Cutlass / FA3 still reject sm_120 but auto-dispatch never selects them now. |
| `flash_attn` | `flash_attn-2.8.3-cp310-cp310-linux_x86_64.whl` | Committed `flash_attn/` stub package; `sys.modules["flash_attn"] = ...` injection | **cp310 only** — requires `python_version: "3.10"` in README. Needs `einops` for `flash_attn.layers.rotary`. Real `flash_attn_2_cuda` satisfies xformers' `hasattr(flash_attn.flash_attn_interface, "flash_attn_gpu")` probe. |
| `pytorch3d` | `pytorch3d-0.7.9-cp310-cp310-linux_x86_64.whl` | Runtime `pip install git+...pytorch3d.git` inside `@spaces.GPU` | Needs `numpy`, `iopath`, `fvcore` listed. No torch pin in metadata; loads cleanly on torch 2.11. |
| `nvdiffrast` | `nvdiffrast-0.4.0-cp310-cp310-linux_x86_64.whl` | Runtime build with `TORCH_CUDA_ARCH_LIST=12.0` | Needs `numpy`. `RasterizeGLContext` in 0.4.0 is a deprecation alias for `RasterizeCudaContext` — no headless-GL footgun. |
| `diff_gaussian_rasterization` | `diff_gaussian_rasterization-0.0.0-cp310-cp310-linux_x86_64.whl` | Runtime build from `graphdeco-inria/diff-gaussian-rasterization.git` | **Upstream Inria API only** (returns 2-tuple `(color, radii)`). Does NOT match the ashawkey fork (4-tuple including alpha+depth) used by `ashawkey/LGM`, `dylanebert/LGM-mini`, etc. Forks need their own wheel. |
| `torchmcubes` | `torchmcubes-0.1.0-cp310-cp310-linux_x86_64.whl` | Runtime `pip install git+...torchmcubes.git` | **sm_120 only** (no fatbin for older archs). Works on ZeroGPU / Blackwell; not portable to a dedicated T4 / L4 / A10G Space. |

### Pattern

```
# requirements.txt
numpy
einops
https://huggingface.co/datasets/multimodalart/zerogpu-blackwell-wheels/resolve/main/wheels/pt212-cu130-cp310/flash_attn-2.8.3-cp310-cp310-linux_x86_64.whl
https://huggingface.co/datasets/multimodalart/zerogpu-blackwell-wheels/resolve/main/wheels/pt212-cu130-cp310/xformers-0.0.34+3da0fc92.d20260528-cp39-abi3-linux_x86_64.whl
```

```yaml
# README frontmatter — pin Python to match wheel cell
python_version: "3.10"
```

**Do not** install these from `@spaces.GPU` startup. The previous "subprocess.check_call pip install at first GPU acquire" pattern is now strictly worse than the wheel URL — slower cold start, eats `duration` budget, breaks reproducibility, and the build sometimes exceeds the `@spaces.GPU(duration=1500)` cap.

### When you need a wheel that's not in the dataset

Three options, in preference order:

1. **kernels-community** — https://huggingface.co/kernels-community handles ABI matching for you. Often the simplest path; no version pinning needed.
2. **Upstream wheel matrix** — e.g. flash-attention's releases page ships a fairly complete `cu12 / torch / Python` matrix at https://github.com/Dao-AILab/flash-attention/releases. Pin `torch==X.Y.Z` in `requirements.txt` to match the wheel's `torch2.X` tag.
3. **Build it yourself and host on HF Hub.** Last resort — see [`debugging.md`](debugging.md) for the in-`@spaces.GPU` source-build pattern as a stopgap while a wheel is being built.

## Reading a CUDA wheel filename

```
flash_attn-2.8.3+cu130torch2.12cxx11abiFALSE-cp310-cp310-linux_x86_64.whl
```

| Tag | Meaning |
|---|---|
| `cu130` | CUDA major version (13.0) |
| `torch2.12` | torch major.minor the wheel was compiled against |
| `cxx11abiFALSE` | C++ stdlib ABI choice (`TRUE` or `FALSE`) |
| `cp310-cp310` | CPython version (3.10) |

ABI / symbol mismatches at any of these → `ImportError` on first import. Pin `torch` to match `torch2.X`. Set `python_version:` to match `cp3XX`.

## Don't pin `xformers`

Leave bare in `requirements.txt` (or use the prebuilt URL above). Pip picks the wheel matching your installed torch.

## Don't pin `spaces`

Even if a `uv export` produces it, exclude with `--no-emit-package spaces`. The platform always pins its own version.

## Specifically about Python version

Pinning `python_version:` is effectively required:

- ZeroGPU officially supports **3.10.13** and **3.12.12**.
- The runtime default is 3.10.
- Pinning to a `cp3XX` wheel matrix (e.g. `cp310` flash_attn wheel) forces matching Python.

Both `"3.12"` and `"3.12.12"` forms are accepted in YAML.
