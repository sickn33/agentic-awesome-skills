# CUDA Dependencies on ZeroGPU

Detailed guidance for installing CUDA-dependent packages on ZeroGPU. SKILL.md establishes the bottom line — wheels are the recommended path because the ZeroGPU build phase has no `nvcc`. This document covers wheel filename tag reading, the kernels-community fallback, and torch-family side-car drift.

## When no wheel is available on PyPI

Common workarounds, in preference order:

1. **Pre-built wheel via direct URL.** For `flash-attn`, the upstream project ships a fairly complete matrix at https://github.com/Dao-AILab/flash-attention/releases — check there first and pin the matching wheel URL.
2. **Build the wheel yourself and host it** (e.g. on a public HF Hub repo) when no upstream wheel matches the Space environment.
3. **Use a kernels-community kernel** (see below) — handles ABI matching for you, no version pinning needed.

## Reading a CUDA wheel filename

A wheel filename like

```
flash_attn-2.8.0.post2+cu12torch2.8cxx11abiFALSE-cp312-cp312-linux_x86_64.whl
```

encodes four build-time choices:

| Tag | Meaning |
|-----|---------|
| `cu12` | CUDA major version |
| `torch2.8` | torch major.minor the wheel was compiled against |
| `cxx11abiFALSE` | C++ stdlib ABI choice (`TRUE` or `FALSE`) |
| `cp312-cp312` | CPython version (3.12) |

The wheel's compiled C-extension will `ImportError` on ABI/symbol mismatches if any of these drift at install time.

If you hand pip a wheel URL without pinning the surrounding environment, pip may resolve `torch` to a version different from the wheel's build target, and the Space will fail on first import. Therefore:

- Pin `torch==X.Y.Z` in `requirements.txt` to match the wheel's `torch2.X` tag.
- Set `python_version:` in the Space frontmatter to match the `cp3XX` tag.
- Check the runtime's cxx11-ABI choice against the wheel; if unsure, try the opposite ABI wheel.

## Prefer kernels-community when unsure

If you are not sure about the ZeroGPU runtime's torch / Python / ABI combination, prefer a [kernels-community](https://huggingface.co/kernels-community) kernel (e.g. `kernels-community/flash-attn2`) instead of a raw wheel URL. The kernels runtime handles ABI matching on your behalf, so no version pinning is required in your Space.

## torch-family side-car drift

`torchvision`, `torchaudio`, `torchcodec`, and similar side-car packages are built against a specific `torch` major.minor (and CUDA major). On ZeroGPU, the runtime's supported `torch` list lags behind PyPI, so projects often pin a non-latest `torch` — and a bare `uv add <side-car>` can silently resolve to a newer release that targets a different `torch` / CUDA, producing ABI/import failures even though `uv lock` succeeded without warnings.

Concretely observed (2026-04) with `torch==2.9.1` pinned:

- `torchaudio` resolves to `2.11.0`, which targets torch 2.11 / CUDA 13. The `2.11.0` release **dropped the `Requires-Dist: torch==X.Y.Z` line** that every earlier release had, so uv sees no constraint and picks it.
- `torchcodec` resolves to a release targeting torch 2.11. No torchcodec release on PyPI declares a `torch` dependency at all; the compatibility table lives only in the project README.
- `torchvision` happens to resolve correctly because torchvision still declares `Requires-Dist: torch==X.Y.Z`. Which side-cars are affected changes over time — treat every torch-family package as suspect, not just these.

### Verify at add/upgrade time

After any `uv add <torch-side-car>` or `uv lock --upgrade`, verify the resolved version targets the same `torch` major.minor as pinned. Two-step fallback because PyPI metadata is not always sufficient:

1. Query PyPI for the resolved version's `requires_dist`:
   ```bash
   curl -s https://pypi.org/pypi/<pkg>/<version>/json \
     | python3 -c "import json,sys,re; rd=json.load(sys.stdin)['info'].get('requires_dist') or []; print('\n'.join(x for x in rd if re.match(r'^torch(?![a-z])', x)) or '(no torch constraint declared)')"
   ```
   If a `torch==X.Y.Z` line appears and matches the pinned torch, good. If it appears and does NOT match, the side-car is wrong — pin it down explicitly.
2. If the query prints `(no torch constraint declared)`, PyPI metadata is silent and cannot be trusted. Fall back to the project's own compatibility table (GitHub README / docs site) — torchcodec, for example, maintains one at https://github.com/pytorch/torchcodec. Pick the side-car version the table maps to the pinned torch major.minor, and pin it explicitly.

### Preventive pin

Once the correct side-car version is known, pin it in `pyproject.toml` alongside torch so uv cannot drift on future `uv lock --upgrade`. The side-car version numbers for a given torch major.minor change each release; always re-verify, do not copy a mapping from an older project.
