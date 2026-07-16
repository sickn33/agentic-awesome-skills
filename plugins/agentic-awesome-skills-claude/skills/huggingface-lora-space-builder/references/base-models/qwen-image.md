# Qwen-Image and Qwen-Image-Edit reference

The Qwen-Image family is fully supported in `diffusers`. Both base and edit variants accept LoRAs via the standard `load_lora_weights` interface.

## Pipelines

> **Before using this table, verify against the base model's own card on the Hub.** This table is best-effort and can lag a recent release. The diffusers snippet on the base model's Hub page is source of truth for which pipeline class to import. See `SKILL.md` Phase 2 for the procedure.

| Base model                            | Pipeline class                | Task                                |
|---------------------------------------|-------------------------------|-------------------------------------|
| `Qwen/Qwen-Image`                     | `QwenImagePipeline`           | Text-to-image                       |
| `Qwen/Qwen-Image-Edit`                | `QwenImageEditPipeline`       | Image editing (instruction-driven)  |
| `Qwen/Qwen-Image-Edit-2509`           | `QwenImageEditPlusPipeline`   | Image editing, multi-image input    |
| `Qwen/Qwen-Image-Edit-2511`           | `QwenImageEditPlusPipeline`   | Image editing, latest variant       |

The 2509 and 2511 variants use a *different* pipeline class than the original `QwenImageEditPipeline` — they take a list of input images and have different default parameters. Don't assume that variants in the same family share a pipeline class. Loading a 2511-trained LoRA onto `QwenImageEditPipeline` produces broken output; the failure is silent (no exception), so verifying against the base model card is the only way to catch it.

The 2511 variant integrates several popular community LoRAs into the base, which can mean a LoRA trained against earlier Qwen-Image-Edit may behave subtly differently when loaded against 2511; if the LoRA's model card specifies which Edit variant it was trained on, match it.

## Required dependencies

Qwen-Image and Qwen-Image-Edit pipelines need extras beyond the standard diffusers/transformers/peft set, because the text encoder is `Qwen2_5_VLForConditionalGeneration` (Qwen 2.5-VL):

- **`torchvision`** — required by `Qwen2VLVideoProcessor`, which the text encoder's processor pulls in transitively. Missing this is a startup-time `ImportError` ("Qwen2VLVideoProcessor requires the Torchvision library"). Always include in `requirements.txt` for any Qwen-Image Space.
- **`sentencepiece`** — required by some Qwen tokenizer paths. Include if you see tokenizer-related ImportErrors at startup.

The 2511 variant in particular often requires the latest `diffusers` from git, since `QwenImageEditPlusPipeline` and 2511-specific fixes land before pip releases:

```
git+https://github.com/huggingface/diffusers
```

If `from_pretrained("Qwen/Qwen-Image-Edit-2511", ...)` fails with a class-not-found or attribute error, switch the requirement to git.

## Default load (T2I)

```python
import torch
from diffusers import QwenImagePipeline

pipe = QwenImagePipeline.from_pretrained(
    "Qwen/Qwen-Image",
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.load_lora_weights("user/my-qwen-lora")
```

`pytorch_lora_weights.safetensors` is the conventional filename. If the repo has a different name, pass `weight_name="..."`.

For multiple adapters or when you want to control LoRA scale at inference time, use `set_adapters`:

```python
pipe.load_lora_weights("user/my-qwen-lora", adapter_name="mylora")
pipe.set_adapters(["mylora"], adapter_weights=[0.9])
```

## Default load (Image Edit)

For original `Qwen-Image-Edit`:

```python
import torch
from diffusers import QwenImageEditPipeline

pipe = QwenImageEditPipeline.from_pretrained(
    "Qwen/Qwen-Image-Edit",
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.load_lora_weights("user/my-qwen-edit-lora")
```

For `Qwen-Image-Edit-2509` and `Qwen-Image-Edit-2511`:

```python
import torch
from diffusers import QwenImageEditPlusPipeline

pipe = QwenImageEditPlusPipeline.from_pretrained(
    "Qwen/Qwen-Image-Edit-2511",  # or 2509
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.load_lora_weights("user/my-qwen-edit-lora")
```

`QwenImageEditPlusPipeline` accepts `image=<PIL>` or `image=[<PIL>, <PIL>, ...]` for multi-image edits. `QwenImageEditPipeline` accepts a single image. Default parameters differ slightly between the two — see "Inference defaults" below.

## Inference defaults

For non-distilled Qwen-Image:
- `num_inference_steps`: 50 by default; the LoRA's model card may recommend lower.
- `true_cfg_scale`: typical 4.0.
- `width`/`height`: multiples of 16, ideally 1024 or 1328 along the long axis.

For Qwen-Image-Edit (original):
- `num_inference_steps`: 30–50 typical, often less for distilled variants.
- `true_cfg_scale`: 4.0 typical.
- Input image gets internally resized; passing a reasonable resolution (1024px on the long side) is fine.

For Qwen-Image-Edit-2509 / 2511 (`QwenImageEditPlusPipeline`):
- `num_inference_steps`: 40 typical for 2511; 50 for 2509.
- `true_cfg_scale`: 4.0.
- `guidance_scale`: 1.0 (the new pipeline uses `true_cfg_scale` as the active CFG; standard `guidance_scale` is kept at 1.0).
- Input is a list of one or more PIL images.

For Lightning / few-step LoRAs (e.g. `lightx2v/Qwen-Image-Lightning-*`):
- `num_inference_steps`: 4 or 8 (read the LoRA's model card — they ship 4-step and 8-step variants).
- `true_cfg_scale`: usually 1.0 (CFG disabled).
- Often comes with a custom scheduler config — see the lightx2v README for the exact `FlowMatchEulerDiscreteScheduler` config to use.

## Resolution buckets

Qwen-Image uses 16-pixel-aligned resolutions. When the user picks an aspect ratio, compute `width` and `height` as multiples of 16. A helper:

```python
def round_to_bucket(w, h, multiple=16):
    return (w // multiple) * multiple, (h // multiple) * multiple
```

For image-edit pipelines, resize the input image to the nearest bucket while preserving aspect; don't crop.

## ZeroGPU duration guidance

- Standard 50-step Qwen-Image T2I at 1024×1024: 60–90 seconds.
- 4-step Lightning Qwen-Image: 15–25 seconds.
- Qwen-Image-Edit 30 steps: 60–90 seconds.

Set `@spaces.GPU(duration=...)` accordingly.

## Common LoRA patterns on Qwen-Image

- **Style LoRAs (T2I).** Standard load. Trigger word usually present. UI: prompt + aspect ratio.
- **Subject / character LoRAs (T2I).** Standard load. Trigger word almost always present. UI: prompt with the trigger pre-prepended in code, possibly an example prompt highlighting the trigger.
- **Lighting / aesthetic LoRAs (T2I).** Often paired with a recommended LoRA scale ≠ 1.0 — check the model card.
- **Edit LoRAs (image-to-image, on Qwen-Image-Edit).** Specific instructions baked in. The LoRA might require a specific instruction phrasing — match the pattern from the model card. UI: input image + instruction textbox.
- **Lightning-distilled LoRAs.** Lock step count and CFG to recommended values; hide the sliders.

## Things to watch

- **VAE memory.** For 1328×1328 outputs, consider `pipe.enable_vae_tiling()` and `pipe.enable_vae_slicing()` after loading. Keep them off for smaller resolutions to avoid quality loss.
- **Don't compile the transformer on ZeroGPU.** `torch.compile` won't work; the speedup options on ZeroGPU are limited to reducing steps or using FP8-distilled variants.
- **Negative prompts work** but defaults are often empty string. Don't expose a negative prompt in the UI unless the LoRA's behavior actually benefits from it.