---
name: huggingface-spaces
description: Build, deploy, and maintain applications on Hugging Face Spaces — Gradio / Docker / Static SDKs, ZeroGPU and dedicated hardware, model loading, debugging, buckets, inference providers, community grants. Use whenever the user asks to create or host an app on Hugging Face, port code onto...
risk: unknown
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-spaces
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Hugging Face Spaces
## When to Use

Use this skill when you need build, deploy, and maintain applications on Hugging Face Spaces — Gradio / Docker / Static SDKs, ZeroGPU and dedicated hardware, model loading, debugging, buckets, inference providers, community grants. Use whenever the user asks to create or host an app on Hugging Face, port code onto...


Hugging Face Spaces host machine-learning applications. There are 1M+ today; each Space is a git repo. This skill covers creating, building, debugging, and maintaining them.

## 0. Getting ready

Before anything else:

1. Check the `hf` CLI is installed: `which hf`. If not, `pip install -U huggingface_hub`.
2. Check the user is logged in: `hf auth whoami`. If not, ask them to run `! hf auth login` in this session — they'll need a write-scoped token from https://huggingface.co/settings/tokens.
3. Note `whoami`'s `canPay` and `isPro` flags — they gate hardware choices below.

The `hf-cli` skill teaches an agent every `hf` command and is the recommended companion to this one. Install it with `hf skills add hf-cli` (add `--claude --global` to install for Claude Code as well, user-level).

## 1. What a Space is

A Space is a git repo with three possible SDKs:

- **Gradio** — most Spaces. Python, fast iteration, supports ZeroGPU.
- **Docker** — arbitrary container. Use when you need a non-Python stack or a pre-built template (Streamlit, Argilla, Shiny, etc. — full list at https://huggingface.co/docs/hub/spaces-sdks-docker). Does **not** support ZeroGPU.
- **Static** — plain HTML, or a React/Svelte/Vue project built at deploy time. Use for in-browser ML (transformers.js / WebGPU / WebAssembly / onnxruntime-web), project pages, interactive reports, or Spaces that orchestrate other Spaces. No hardware needed.

### Hardware tiers

Free, no creator cost: **`cpu-basic`** and **`zero-a10g`** (ZeroGPU). Static Spaces are also free and don't need hardware.

**`cpu-basic`** — 2 vCPU / 16 GB. For data viz, API-proxy Spaces, small CPU-bound models.

**ZeroGPU (`zero-a10g`)** — dynamic, per-request GPU allocation on NVIDIA RTX PRO 6000 Blackwell (sm_120). Two sizes: `large` (half MIG, 48 GB, 1× quota) and `xlarge` (full, 96 GB, 2× quota). Free for the Space creator; Space visitors consume their own daily quota (~5 min free / 40 min Pro / 60 min Enterprise). **Gradio-only**, **PyTorch-first**. Requires the creator to be on a PRO / Team / Enterprise plan.

**Dedicated GPU** (T4, L4, A10G, L40S, A100, H200) — billed to the Space creator by the hour. List + pricing: `hf spaces hardware`. Only the creator can attach these, and only if `canPay=True`. Use when ZeroGPU genuinely doesn't fit — non-PyTorch main model with heavy init, very-large-model long-context inference, etc.

If a non-PRO user has a use case that wants ZeroGPU, you can still build it: create a `cpu-basic` Space, code the app for ZeroGPU, push, then request a community grant. See [`references/grants.md`](references/grants.md).

For the authoritative reference: https://huggingface.co/docs/hub/spaces-overview

## 2. Look for an existing demo first

Before deciding how to build anything, search for prior art:

```bash
hf spaces search "<model name or task>" --sdk gradio --limit 10
```

If someone has built a similar Space, read its `app.py` and `requirements.txt` — that gives you the working pattern. Saves a lot of blind iteration. Mention to the user what you found before committing to an approach.

## 3. Decide SDK and hardware

Follow the user's explicit request first. If they were vague:

- **Default for a public ML demo**: Gradio + ZeroGPU. Use this unless something below applies.
- **The model's only inference path is non-PyTorch** (ONNX / TF / JAX / vLLM as the MAIN model, with heavy init): dedicated GPU.
  - But: marginal non-torch tools (a small ONNX preprocessor, a TF utility) inside a torch-main pipeline are fine on ZeroGPU. The hijack only patches torch; init the non-torch lib inside `@spaces.GPU` and pay the short per-call init cost.
- **Tiny / CPU-bound model, or API-proxy Space**: `cpu-basic` (`hardware`-free isn't applicable to Gradio).
- **Browser-side ML or project page**: Static.
- **Container with non-Python stack**: Docker.

### Sourcing the model

- **GitHub repo** — clone locally to read structure. If it already has a Gradio demo, the minimal viable path is to adapt it onto ZeroGPU (see [`references/zerogpu.md`](references/zerogpu.md)). Otherwise: read the README + inference code, prefer the PyTorch path, estimate VRAM (bf16 ≈ `params_B × 2` GB; 48 GB fits ≤24B params at bf16, or much larger with quantization — see [`references/zerogpu.md`](references/zerogpu.md) for quantization on ZeroGPU).
- **HF model repo** — read its README, follow any linked GitHub.
- **Paper / blog post** — look for an official or unofficial implementation. Don't reimplement unless trivial or the user explicitly asks.
- **Vague request** — search Spaces first; surface results.

If the model genuinely won't fit, check **Inference Providers** as an alternative: see [`references/inference-providers.md`](references/inference-providers.md). This avoids hosting the model at all.

## 4. Create the Space

```bash
hf repos create <namespace>/<name> --type space --space-sdk <gradio|docker|static> \
    [--flavor zero-a10g|cpu-basic|<paid-flavor>] \
    [--secrets KEY=val] [--env KEY=val] \
    --public|--private|--protected \
    --exist-ok
```

- `--space-sdk` is required.
- `--flavor` selects hardware. `zero-a10g` is the (legacy) identifier for ZeroGPU. Omit for `cpu-basic`. Run `hf spaces hardware` for the full paid list and pricing.
- Visibility: `--public` (anyone can view), `--private` (only you), `--protected` (app is reachable but git repo / Files tab is private).
- `--secrets KEY=val` becomes an environment variable inside the Space and is **not** visible to visitors. Use for API keys, gated-repo tokens (`HF_TOKEN=hf_…`), etc. Can also be set later via `hf spaces secrets set <id> KEY=val`.
- `--env KEY=val` is **visible to visitors** — use only for non-sensitive config (`GRADIO_SSR_MODE=false`, `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, etc.).

> Note: `hardware:` in the README YAML is silently ignored — hardware is only set via `--flavor` at creation, or later via `hf spaces settings <id> --hardware <name>`.

## 5. Build the app

The Space now exists at `https://huggingface.co/spaces/<namespace>/<name>` but is empty.

### README.md frontmatter

Always required:

```yaml
---
title: ...
emoji: 🚀                # pick something representative
colorFrom: blue          # red|yellow|green|blue|indigo|purple|pink|gray (only these)
colorTo: indigo
sdk: gradio              # gradio | docker | static
sdk_version: 6.15.1      # latest stable unless you have a reason*
app_file: app.py         # gradio only (docker / static use Dockerfile / index.html)
short_description: ...   # ≤ 60 chars (server rejects longer)
python_version: "3.12"   # ZeroGPU officially supports 3.10.13 and 3.12.12
startup_duration_timeout: 30m   # default; bump to 1h for big LLMs / heavy downloads
---
```

\* Reasons to use an older Gradio: a custom component pins it, or you're adapting an existing demo and don't want to rewrite for 5.x→6.x breaking changes. If you need a 5.x, pick `5.50.0` (latest of the series; still supports custom components).

All frontmatter options: https://huggingface.co/docs/hub/spaces-config-reference

### Minimal ZeroGPU Gradio app

```python
import spaces           # MUST come before torch / diffusers / transformers
import torch
import gradio as gr
from diffusers import DiffusionPipeline

pipe = DiffusionPipeline.from_pretrained("<repo>", torch_dtype=torch.bfloat16).to("cuda")

@spaces.GPU(duration=60)
def generate(prompt):
    return pipe(prompt).images[0]

gr.Interface(fn=generate, inputs=gr.Text(), outputs=gr.Image()).launch()
```

Three rules — full treatment in [`references/zerogpu.md`](references/zerogpu.md):

1. **`import spaces` before torch / any CUDA-touching import.** It monkey-patches `torch.cuda.*`; once CUDA is initialized in the main process, it's too late.
2. **Load the model at module scope, `.to("cuda")` eagerly.** ZeroGPU intercepts the call, packs weights to disk, and streams them into VRAM on the first `@spaces.GPU` entry. Lazy loading inside the decorator costs every user.
3. **Decorate the function Gradio binds.** Estimate `duration` to the realistic worst case (smaller = higher queue priority and tighter quota check). For input-dependent runtime, pass a callable.

### requirements.txt

Short version:

- **Do NOT list**: `gradio`, `spaces`, `huggingface_hub` (preinstalled and platform-managed; pinning them causes resolution failures or silently breaks the ZeroGPU runtime).
- **Do list if you use them**: `torchvision`, `torchaudio` (not preinstalled), plus everything else (`diffusers`, `transformers`, `accelerate`, `sentencepiece`, …).
- ZeroGPU only accepts torch `2.8.0`, `2.9.1`, `2.10.0`, `2.11.0`. Default to leaving torch unpinned (the runtime preinstalls the latest). Only pin when a dep forces it.
- For prebuilt CUDA-extension wheels (`flash_attn`, `xformers`, `pytorch3d`, `nvdiffrast`, `diff_gaussian_rasterization`, `torchmcubes`): use the prebuilt Blackwell wheels at `https://huggingface.co/datasets/multimodalart/zerogpu-blackwell-wheels/tree/main/wheels`. Full mapping + caveats in [`references/requirements.md`](references/requirements.md).

### Per-SDK depth

- **Gradio patterns** (themes, `gr.Examples`, streaming, custom HTML components, `gr.Server`): [`references/gradio.md`](references/gradio.md).
- **Docker**: https://huggingface.co/docs/hub/spaces-sdks-docker. Examples: `hf spaces list --filter docker`.
- **Static**: https://huggingface.co/docs/hub/spaces-sdks-static. For built SPAs, set `app_build_command: npm run build` and `app_file: dist/index.html` in frontmatter.
- **ZeroGPU specifics** (decorator semantics, sizing, AoTI, generators, concurrency, pickle / `gr.State` across the worker boundary): [`references/zerogpu.md`](references/zerogpu.md) — read this whenever the Space targets ZeroGPU.


## 6. Iterate on the Space, not locally

Try to build a release candidate from the user quest locally and push it — then use the live URL as your test loop. The Space environment is the only one that matters; do not try to test locally. `python3 -m py_compile app.py` is the maximum local check worth doing before pushing.

Once pushed, pick the cheapest update mechanism for each change — hot-reload for pure Python edits, `hf upload` for code-only files hot-reload can't touch, full rebuild only when `requirements.txt` / `Dockerfile` / README frontmatter actually changed. Full ladder + footguns (hot-reload poisoning factory reboot, runtime.sha lag, etc.) in [`references/debugging.md`](references/debugging.md).

## 7. Verify

Don't trust `RUNNING` alone — the app can be running but broken. Four steps, in order:

**A. Alive?** Stage + hardware:
```bash
hf spaces info <ns>/<name> --expand runtime
```

**B. Logs clean post-boot?** Read the run log to confirm startup finished without warnings or silent fallbacks:
```bash
hf spaces logs <ns>/<name> --tail 200
```
Look for model-load completion, no import warnings, no "falling back to CPU" / dtype downgrade messages, no `RUNNING` masking a half-broken app.

**C. API actually responds.** With logs still tailing in another terminal (`hf spaces logs <ns>/<name> --follow`), call the endpoint:
```python
from gradio_client import Client, handle_file
import os
c = Client("<ns>/<name>", token=os.environ["HF_TOKEN"], httpx_kwargs={"timeout": 600})
print(c.view_api())                    # discover endpoints — don't guess
result = c.predict(..., api_name="/generate")
```

**D. Sniff output AND logs.** HTTP 200 ≠ correct output. Check both:
```python
head = open(result, "rb").read(16)
# glTF / \x89PNG / RIFF…WEBP / RIFF…WAVE / [4:8]==b"ftyp" → png/jpg/webp/wav/mp4
```
And look at the run log emitted during the call — silent fallbacks (model snapping to a different size, missing optional dep, dtype downgrade) only show up there.

Full smoke-test patterns (streaming endpoints, OAuth-gated Spaces, `gr.Server` custom routes): [`references/debugging.md`](references/debugging.md).

## 8. Permanent storage (buckets)

Spaces are stateless — `/data` is wiped on restart. If the Space needs to persist user uploads, generations, logs, or interact with a long-lived store, mount a **bucket**:

```bash
hf buckets create <ns>/<bucket-name>                                          # --private optional
hf spaces volumes set <ns>/<space> -v hf://buckets/<ns>/<bucket-name>:/data   # read-write at /data
```

Buckets are paid storage; check `canPay` and confirm with the user. Full patterns (read-fast / write-durable, public bucket URLs, model-cache anti-pattern): [`references/buckets.md`](references/buckets.md).

## 9. When things break

Order of operations:

1. Read the logs: `hf spaces logs <id> --build --follow` (build error) or `hf spaces logs <id> --follow` (runtime error). Find the **first** error, not the last.
2. Grep [`references/known-errors.md`](references/known-errors.md) for the error string. Check if this is a known issue before trying your own fix — most common ZeroGPU / Gradio / dependency errors have a 1–2 line fix there.
3. Iterate using the cheapest rung from [`references/debugging.md`](references/debugging.md). The vast majority of issues resolve with log-reading + smoke-test loops; interactive dev mode + SSH is a heavy-hammer last resort.

If you solve an error that wasn't in the known-errors list, suggest the user PR it back to this skill so future runs benefit.

---

## Reference index

| When to read | File |
|---|---|
| **How ZeroGPU works** + correct patterns (decorator, sizing, pickle, generators, real-time, AoTI) | [`references/zerogpu.md`](references/zerogpu.md) |
| **Iterate + debug**: logs, rung ladder, smoke testing (and dev mode + SSH as a last resort) | [`references/debugging.md`](references/debugging.md) |
| **Error-string lookup** — the single place for all error symptoms (Spaces, ZeroGPU, Gradio, deps) | [`references/known-errors.md`](references/known-errors.md) |
| Pinning deps, picking wheels, torch-family alignment | [`references/requirements.md`](references/requirements.md) |
| `gr.Examples` caching, themes, custom HTML components, `gr.Server` | [`references/gradio.md`](references/gradio.md) |
| Persistent storage, public bucket URLs | [`references/buckets.md`](references/buckets.md) |
| Community grant requests (non-PRO needing ZeroGPU) | [`references/grants.md`](references/grants.md) |
| Provider proxy (zero-VRAM big LLM via Cerebras / Fireworks / Together / etc.) | [`references/inference-providers.md`](references/inference-providers.md) |

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
