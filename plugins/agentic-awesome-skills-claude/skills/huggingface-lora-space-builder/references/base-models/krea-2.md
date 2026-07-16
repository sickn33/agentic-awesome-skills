# Krea 2 reference

Krea 2 (K2) is a flow-matching **text-to-image** model: a 12B dense DiT (grouped-query attention) with a **Qwen3-VL** text encoder (multi-layer feature aggregation) and the **Qwen-Image VAE** (`AutoencoderKLQwenImage`). Pipeline class: `Krea2Pipeline`. It ships as two checkpoints designed to work together:

| Repo | Role | Use it for |
|------|------|------------|
| [`krea/Krea-2-Turbo`](https://huggingface.co/krea/Krea-2-Turbo) | 8-step **distilled** | **Inference / demos** |
| [`krea/Krea-2-Raw`](https://huggingface.co/krea/Krea-2-Raw) | base, non-distilled | **LoRA training** — *not* for inference |

**For a LoRA Space, load Turbo.** Krea 2 LoRAs are *trained on RAW but run on Turbo* (they "express strongly on Turbo"), and RAW is explicitly not meant for inference — expect poor quality if you load it directly. So a demo should almost always use `krea/Krea-2-Turbo`. The official LoRA cards confirm this ("To be used on `krea/Krea-2-Turbo`").

> Needs a `diffusers` build that includes `Krea2Pipeline` (both repos are `library_name: diffusers`). If `from diffusers import Krea2Pipeline` fails, the installed `diffusers` predates the integration — update it.

## Required dependencies

- `diffusers` with `Krea2Pipeline`.
- `transformers` recent enough for **Qwen3-VL** (the text encoder is a `Qwen3VLModel`, e.g. `Qwen/Qwen3-VL-4B-Instruct`).
- **`torchvision`** — the Qwen3-VL processor pulls it in transitively; missing it is a startup `ImportError`. Always include it.
- `sentencepiece` if you see tokenizer-related ImportErrors at startup.

## Default load + LoRA (Turbo)

```python
import torch
from diffusers import Krea2Pipeline

pipe = Krea2Pipeline.from_pretrained("krea/Krea-2-Turbo", torch_dtype=torch.bfloat16).to("cuda")
pipe.transformer.load_lora_adapter("user/my-krea2-lora", weight_name="my_lora.safetensors")
pipe.transformer.set_adapters("default", weights=1.0)

# include the LoRA's trigger word(s) from its card
image = pipe(
    "a deer grazing in a forest, <trigger words>",
    num_inference_steps=8, guidance_scale=0.0,
    generator=torch.Generator("cuda").manual_seed(0),
).images[0]
```

Krea 2 LoRAs load through the **transformer's** adapter API (`pipe.transformer.load_lora_adapter(...)` + `pipe.transformer.set_adapters("default", weights=1.0)`), per the official LoRA cards — not the pipeline-level `pipe.load_lora_weights`. Honor the LoRA's **trigger word(s)** and recommended weight (1.0 by default).

## Inference recipe

- **Turbo (the demo default):** `num_inference_steps=8`, **`guidance_scale=0.0`** (guidance disabled), LoRA weight `1.0`.
- **RAW:** training only — don't ship a RAW inference demo; its quality is intentionally low (it's the malleable base you fine-tune on, then run on Turbo).

## `guidance_scale` convention (gotcha)

Krea 2 enables guidance whenever **`guidance_scale > 0`** and computes velocity as `cond + guidance_scale * (cond − uncond)` (≡ the usual CFG formulation with scale `1 + guidance_scale`). So Turbo disables guidance with **`guidance_scale=0.0`** — not `1.0`.

## Resolution

`height`/`width` must be divisible by **16** (`vae_scale_factor * patch_size`); the pipeline rounds up to a multiple of 16 (with a warning) otherwise. Default 1024×1024.

## ZeroGPU duration

Standard T2I: place modules at module scope, `pipe.to("cuda")`, no `torch.compile`. Turbo 8-step 1024² is fast (≈ 20–40s) — set `@spaces.GPU(duration=...)` comfortably above that. The 12B DiT + Qwen3-VL encoder fits ZeroGPU; if you OOM on the default size, try `@spaces.GPU(size="xlarge")`.

## Things to watch

- **Load Turbo, not RAW, for demos.** RAW is the training base and not meant for inference.
- **`guidance_scale=0` disables guidance** (Krea convention, unlike pipelines where 1.0 is "off"). Turbo = 8 steps, `guidance_scale=0.0`.
- **LoRAs use `pipe.transformer.load_lora_adapter` + `set_adapters("default", …)`** (transformer-level), and have **trigger words** — read the card.
- **New pipeline → update diffusers** if `from diffusers import Krea2Pipeline` fails.
