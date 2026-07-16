# LTX reference

The LTX family covers `LTX-Video` (0.9.x series), `LTX-2`, and `LTX-2.3`. All target text-to-video, image-to-video, and video-to-video.

Diffusers support varies across versions:

| Base model series         | Diffusers support                        | LoRA loading via diffusers? |
|---------------------------|------------------------------------------|-----------------------------|
| `Lightricks/LTX-Video` (0.9.x) | Yes — `LTXPipeline`, `LTXImageToVideoPipeline`, `LTXConditionPipeline` | Yes |
| `Lightricks/LTX-2`        | Yes — `LTX2Pipeline` from `diffusers.pipelines.ltx2` | Yes (recent diffusers) |
| `Lightricks/LTX-2.3`      | Partial — diffusers support is still limited overall, so the original `Lightricks/LTX-2.3` repo can still be used via the native path. Diffusers-converted variants exist at `dg845/LTX-2.3-Diffusers` and `dg845/LTX-2.3-Distilled-Diffusers`, supporting regular LoRAs via the standard pipelines, IC LoRAs via `LTX2InContextPipeline`, and HDR IC-LoRAs via `LTX2HDRPipeline` (PR #13572, merged 2026-05-15; needs `git+https://github.com/huggingface/diffusers`) | Yes on the diffusers variants — standard `load_lora_weights` + `set_adapters`. Native path still required for some configurations. |

When in doubt about LTX-2.3, check the LoRA's model card for an example snippet. If it imports from `ltx_video` or a native module rather than `diffusers`, use the native path.

## Pipelines (diffusers path)

> **Before using this table, verify against the base model's own card on the Hub.** This table is best-effort and can lag a recent release (LTX moves fast). The diffusers snippet on the base model's Hub page is source of truth. See `SKILL.md` Phase 2 for the procedure.

| Task                    | Pipeline                          | Pretrained ID                                        |
|-------------------------|-----------------------------------|------------------------------------------------------|
| Text-to-video           | `LTXPipeline`                     | `Lightricks/LTX-Video`                               |
| Image-to-video          | `LTXImageToVideoPipeline`         | `Lightricks/LTX-Video`                               |
| Video-to-video / keyframes | `LTXConditionPipeline`         | `Lightricks/LTX-Video-0.9.5` or later                |
| Spatial upscale         | `LTXLatentUpsamplePipeline`       | `Lightricks/ltxv-spatial-upscaler-0.9.8`             |
| LTX-2 T2V/I2V           | `LTX2Pipeline`                    | `Lightricks/LTX-2`                                   |
| LTX-2.3 in-context (IC LoRAs) | `LTX2InContextPipeline`     | `dg845/LTX-2.3-Distilled-Diffusers` (preferred for demos; non-distilled `dg845/LTX-2.3-Diffusers` also works) |

`LTXConditionPipeline` is the workhorse for V2V — it takes a `LTXVideoCondition` (or list of them) plus optional first-frame image, and produces a video conditioned on the input.

## Required dependencies

LTX pipelines need extras beyond the standard diffusers/transformers/peft set, because video output requires file-format support:

- **`imageio`** and **`imageio-ffmpeg`** — required by `diffusers.utils.export_to_video`. Without them, video export fails at runtime even though model loading succeeds. Always include both.
- **`sentencepiece`** — required by the T5 text encoder some LTX variants use. Include if you see tokenizer-related ImportErrors at startup.
- **`av`** — `pyav`, useful when reading input videos in non-trivial formats. Include for V2V pipelines that take video input via `load_video`.

For LTX-2 and LTX-2.3, the latest diffusers from git is often required since pipeline classes (`LTX2Pipeline`, conditioning APIs) land before pip releases:

```
git+https://github.com/huggingface/diffusers
```

For LTX-2.3 native path:

```
git+https://github.com/Lightricks/LTX-Video.git
```

If `from_pretrained` fails with class-not-found errors for a recent LTX variant, switch to git diffusers.

## Default load (T2V)

```python
import torch
from diffusers import LTXPipeline
from diffusers.utils import export_to_video

pipe = LTXPipeline.from_pretrained(
    "Lightricks/LTX-Video",
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.load_lora_weights("user/my-ltx-lora")
```

## Default load (V2V via LTXConditionPipeline)

```python
import torch
from diffusers import LTXConditionPipeline
from diffusers.pipelines.ltx.pipeline_ltx_condition import LTXVideoCondition
from diffusers.utils import load_video, export_to_video

pipe = LTXConditionPipeline.from_pretrained(
    "Lightricks/LTX-Video-0.9.5",
    torch_dtype=torch.bfloat16,
)
pipe.to("cuda")
pipe.load_lora_weights("user/my-ltx-vlora")

video = load_video("input.mp4")
condition = LTXVideoCondition(video=video, frame_index=0)

frames = pipe(
    conditions=[condition],
    prompt="...",
    negative_prompt="worst quality, jittery, blurry",
    width=768, height=512,
    num_frames=121,
    num_inference_steps=50,
).frames[0]
export_to_video(frames, "out.mp4", fps=24)
```

## LTX-2 (diffusers path)

```python
from diffusers.pipelines.ltx2 import LTX2Pipeline
pipe = LTX2Pipeline.from_pretrained("Lightricks/LTX-2", torch_dtype=torch.bfloat16)
```

LTX-2 supports a two-stage pipeline (base + latent upsample) for production quality. For a demo, the single-stage pipeline is usually sufficient and faster.

**Don't default two-stage on for IC-LoRAs — check the card.** The common LTX-2.3 two-stage recipe runs stage 2 as an x2 latent-upsample + refine **with the IC-LoRA disabled** (`disable_lora()`), re-rendering on the bare base — which re-degrades exactly the LoRA-conditioned detail (text, identity). Whether two-stage is appropriate is per-LoRA, per the card: e.g. the *In/Out-painting* card explicitly says "both tasks use a two-stage pipeline," whereas the *Ingredients* card recommends a single-pass 30-step recipe and never mentions two stages. Single-stage is the safer demo default unless the card calls for two-stage.

## Inference defaults

- **Resolution**: typically multiples of 32. Common sizes: 768×512, 1216×704, 704×480.
- **Frame count**: typically `8k+1` (e.g. 121, 161, 257). Compute from `duration_seconds * fps` and round.
- **fps**: 24 by default; some LoRAs are trained at different rates (16, 30) — check the model card.
- **`num_inference_steps`**: 30–50 for non-distilled. Distilled checkpoints (look for "distilled" in the name) often run at 8–12.
- **`negative_prompt`**: LTX is sensitive to negative prompts. A good default: `"worst quality, inconsistent motion, blurry, jittery, distorted"`.
- **Distilled IC-LoRA — disable audio guidance too, not just `guidance_scale`.** `LTX2InContextPipeline` computes `do_classifier_free_guidance = guidance_scale > 1 OR audio_guidance_scale > 1`, and **`audio_guidance_scale` defaults to `7.0`**. So `guidance_scale=1.0` is not enough — CFG stays on via audio (and `stg_scale` defaults on), which doubles/mis-batches the forward against the in-context reference tokens (wrong recipe, sometimes a runtime error). For a distilled IC-LoRA pass all four: `pipe(..., guidance_scale=1.0, stg_scale=0.0, audio_guidance_scale=1.0, audio_stg_scale=0.0)`.

## Frame-count helper

```python
def num_frames_for_duration(seconds, fps=24, base=8):
    raw = seconds * fps
    return ((int(raw) - 1) // base) * base + 1
```

## Native pipeline path (LTX-2.3 fallback)

The native repo is a fallback when the diffusers path doesn't work, or for specific conditionings that diffusers may not support yet. Try `LTX2InContextPipeline` on the diffusers path first (see the IC-LoRAs section above).

**The native repo depends on the model generation** — pick by the LoRA's base model (and what its card's snippet imports):

| Base model | Native repo | Package(s) / import | Pipeline classes |
|---|---|---|---|
| `LTX-Video` (0.9.x) | `github.com/Lightricks/LTX-Video` | `ltx_video` | `from ltx_video.pipelines import LTXPipeline` |
| `LTX-2`, `LTX-2.3` | `github.com/Lightricks/LTX-2` | `ltx-core` + `ltx-pipelines` (editable) | `ltx_pipelines.ic_lora.ICLoraPipeline`, `TI2VidOneStagePipeline`, … |

For the 0.9.x series the pattern looks like:

```bash
# in requirements.txt
git+https://github.com/Lightricks/LTX-Video.git
```

```python
from ltx_video.pipelines import LTXPipeline as NativeLTXPipeline
# ... model loading per the native repo's README
```

The native path doesn't use `load_lora_weights`. Instead, LoRAs are usually wired in at pipeline construction time, often via a list of LoRA configurations or by pointing at a fused checkpoint.

When the LoRA's model card has a Python snippet using the native repo, copy its construction pattern verbatim. The native API changes more often than diffusers' does, so don't paraphrase.

### LTX-2.x native path on ZeroGPU — gotchas

For `LTX-2` / `LTX-2.3` (the `ltx-core` + `ltx-pipelines` repo), clone + `pip install -e packages/ltx-core packages/ltx-pipelines` at runtime in `app.py` and pin a commit. Three things bite on ZeroGPU:

- **Native loader bypasses ZeroGPU virtualization → "No CUDA GPUs available" at startup.** The native safetensors loader does `safe_open(path, device="cuda")` and copies host→device inside safetensors' own C++ (`cudaMemcpy`), **bypassing `torch.Tensor.to`** — the call ZeroGPU patches to virtualize + pack module-scope weights. Nothing packs and module-scope placement raises *"No CUDA GPUs are available."* Fix: monkeypatch the loader to open on CPU then move with `.to`:
  ```python
  with safetensors.safe_open(shard, framework="pt", device="cpu") as f:
      value = f.get_tensor(name).to(device=device)   # torch path → ZeroGPU-virtualisable
  ```
  Also: patch attention to **SDPA** (FA3 crashes on Blackwell ZeroGPU), and **never call `torch.cuda.*` / `get_device_capability()` at module scope** (it poisons virtualization).
- **Native two-stage pins two 22B transformers → offload-disk overflow.** `ICLoraPipeline` builds two independent `ModelLedger`s (stage-1 with the LoRA, stage-2 without), each loading its **own** full transformer. The CLI loads them sequentially, but ZeroGPU pins all weights at module scope, so enabling stage 2 pins **both** (~143G) and overflows the offload disk (`OSError: [Errno 28] No space left on device`, ~96G cap). For a demo: pin stage 1, then have stage 2 **reuse stage 1's pinned modules** (`for n in [...]: setattr(s2, n, getattr(s1, n))`) so only one transformer is resident (~71G).
- **`ICLoraPipeline` is distilled-only.** Per the LTX-2 `ltx-pipelines` guide, IC-LoRA inference runs in distilled-only mode (fixed 8-step sigmas, no `num_inference_steps`/`guidance_scale`/`negative_prompt`); the docs do not describe non-distilled IC-LoRA or IC-LoRA + CFG/STG (guidance lives only on full-model pipelines like `TI2VidOneStagePipeline`, and in two-stage is stage-1-only). So if a card recommends a *non-distilled* recipe (e.g. 30 steps + guidance + STG on a `…-dev` base), there is no stock IC-LoRA pipeline for it — use the supported distilled `ICLoraPipeline` and note the recipe difference, or fall back to the diffusers `LTX2InContextPipeline` (which exposes steps/guidance).

## IC-LoRAs (in-context conditioning)

LTX IC-LoRAs condition the model on a reference video alongside a first-frame image. The diffusers path uses `LTX2InContextPipeline` with standard `load_lora_weights` + `set_adapters`.

Common flavors:

- **Pose / depth / canny IC-LoRAs**: the reference video must be preprocessed into the control signal (pose skeletons, depth maps, edge maps) before being passed as conditioning. Passing a raw video with appearance information leaks color/style through.
- **Outpaint IC-LoRAs**: the input video is padded with black margins to a target aspect ratio and passed as conditioning. The model fills the black regions.
- **Frame interpolation / extension IC-LoRAs**: the input is a sparse set of keyframes; the model fills in between or extends.
- **Audio-driven lip-sync IC-LoRAs**: take a reference video and a new audio track; the model re-syncs lip motion to match the new audio. UI needs both a video input and an audio input (e.g. for video translation, voiceover replacement, multilingual dubbing).

Each of these implies different preprocessing in the demo and different UI shape (an aspect-ratio picker for outpaint, a pose preview for pose-control, a frame-pair input for keyframe extension). Read `references/adapting-to-the-lora.md` and shape the UI to the specific IC-LoRA.

## Quantization gotcha (LTX-2.3, native path only)

On the native path, some LTX-2.3 IC-LoRAs ship with FP8 quantization policies that fuse LoRA deltas into transformer weights at model-load time, using a Triton CUDA kernel. ZeroGPU has no real CUDA at module-load time (only the emulation layer) — this can crash the Space at startup. The diffusers path via `LTX2InContextPipeline` does not hit this: LoRAs are loaded through PEFT as separate adapter weights and applied at runtime rather than fused into the base transformer at load.

Two workarounds when the user hits this on the native path:

- **Skip quantization for the LoRA-fusion stage.** LTX-2.3 has a two-stage pipeline; apply quantization only to the second (non-LoRA) stage. Set `stage_1_quantization=None`.
- **Pre-fuse the LoRA into a standalone checkpoint.** Download base + LoRA, fuse on a dev GPU, push the fused checkpoint to the Hub under the user's namespace, and have the Space load the fused checkpoint with no LoRA.

The second option is preferable when the user plans to demo the same LoRA repeatedly — Space startup is much faster.

## ZeroGPU duration guidance for LTX

- Short T2V (3 seconds, 24fps, distilled): 60–90 seconds.
- Standard T2V (5 seconds, 50 steps): 120–180 seconds.
- I2V: similar to T2V at the same duration.
- V2V with preprocessing (pose extraction, etc.): add 10–30 seconds for preprocessing overhead. Set duration to 180+.
- LTX-2.3 two-stage: 240–360 seconds.

Set `@spaces.GPU(duration=...)` to comfortably exceed expected generation time.

## Things to watch

- **Latest pipelines often need git diffusers.** Pin to `git+https://github.com/huggingface/diffusers` in `requirements.txt` for any LTX variant released in the last few weeks.
- **`git+diffusers` is a moving target — verify LTX2 output quality.** Bare `@main` inherits whatever's there. The LTX2 text connector carried a token-reversal regression (PR #13564) that scrambled prompt tokens/registers — degrading prompt adherence and fine detail (e.g. garbled on-screen text), worst on short prompts — until **PR #13931 (merged 2026-06-19)** fixed it. If LTX2 output looks weak or garbled, confirm the installed diffusers commit is **at or past #13931**, and prefer pinning to a known-good commit (`git+https://github.com/huggingface/diffusers@<sha>`) over bare `@main` for reproducibility.
- **Don't `torch.compile`.** LTX is fast enough on ZeroGPU without it; compile is incompatible anyway.
- **`enable_vae_tiling()` for higher resolutions.** LTX VAE memory grows with resolution; enable tiling for outputs above 768px on either axis.
- **Negative prompts matter more than for image models.** Don't ship with an empty negative_prompt unless the LoRA's model card says so.
- **Frame-rate mismatch can produce glitches.** If the LoRA was trained at 24 fps and the demo passes 30, motion looks wrong. Use the LoRA's recommended fps.