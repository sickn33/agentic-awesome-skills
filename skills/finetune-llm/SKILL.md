---
name: finetune-llm
description: "Fine-tune or post-train an LLM against measured VRAM budgets: probe the GPU, pick the engine, hash the data, smoke test, train instrumented, verify with a neutral evaluator."
category: engineering
risk: critical
source: self
source_type: self
license: MIT
date_added: "2026-11-16"
author: instax-dutta
tags: [fine-tuning, lora, qlora, unsloth, trl, vram, gpu, evaluation]
---

# Hardware-Aware LLM Fine-Tuning

## Overview

Fine-tune a language model on whatever hardware is present, without
out-of-memory crashes, silent no-op training, or unverifiable "it trained"
claims.

The workflow is a fixed order: probe hardware, pick the engine from the measured
VRAM budget, pin and hash the data, smoke test, train with instrumentation,
verify with a neutral evaluator, record provenance. No phase is skipped because
"it is just a small run".

The numbers below come from a controlled 4-arm comparison on 2x Tesla T4 (same
model, data and hyper-parameters; engines differ). Training loss is not
evidence of quality; the held-out number is.

This differs from a framework tutorial: it is a verification gate. The point is
to catch the failures that still produce a loss curve and a broken adapter.

## When to Use

- The user wants to fine-tune or post-train a model: LoRA, QLoRA, SFT, DPO, or a
  full fine-tune.
- Choosing an engine (Soup, Unsloth, TRL) or a config for a specific GPU.
- Debugging a run: CUDA out of memory, a run that finished in seconds, zero-norm
  adapters, flat loss, masking flags that did nothing.
- Deciding whether a GPU can fit a model, or training on a T4, V100, Colab or
  Kaggle box.
- Comparing frameworks on measured VRAM, speed or quality.

Use an inference-serving skill when the goal is to run a model, not to change its
weights.

## Prerequisites

A CUDA GPU, or Apple Silicon with MLX, or a rented GPU. Python 3.10+ and the
engine's own dependencies. Disk for checkpoints and data. A Hugging Face model id;
a token only when the model is gated.

The helper scripts named below (hardware probe, data preparation, run verifier,
adapter evaluator, GPU sampler) and the benchmark write-up live in the upstream
repository linked at the end and are not bundled with this skill. Without them,
run the equivalent checks by hand: the gates still apply, only the automation is
missing.

Training writes checkpoints to disk and can spend real GPU money. Nothing in this
skill uploads a model.

## How It Works

### 1. Probe the hardware before writing config

Report GPUs, VRAM, compute capability, true bf16 support, cores and RAM, then fit
the model against the measured budgets. Never trust
`torch.cuda.is_bf16_supported()` alone: on T4 (sm_75) it returns true through
emulation. Call it with emulation excluded.

### 2. Pick the engine from the VRAM budget

Measured peaks, 8B model, NF4 4-bit QLoRA, r=16, sequence 1024, batch 1, T4:

| Engine | Peak VRAM | Why |
| --- | --- | --- |
| Unsloth-backed (native or via Soup) | 7.1 GB | fused LM head and cross-entropy; fp16 on sm<80 |
| Stock transformers or TRL | 14.9 GB | materialises fp32 logits, about 1 GB per copy |
| Soup set to `transformers` while Unsloth is installed | silently Unsloth-backed | an import elsewhere in the stack patches the whole trainer |

Planning formula calibrated on that run: peak about 0.9 GB x parameters in
billions for the Unsloth engine, about 1.85 GB x parameters for stock TRL. Require
planned peak at or under 90 percent of VRAM.

Decision by hardware:

- **NVIDIA sm_80+** (A100, L40S, 4090, H100): bf16, Unsloth engine when available.
- **NVIDIA sm_75 or sm_70** (T4, V100): fp16 only, no bf16 hardware; Unsloth is
  the difference between fitting 8B on 15 GB and not.
- **Apple Silicon**: MLX backend; CUDA math does not apply.
- **No GPU**: rent one. CPU layer streaming exists for tiny models and cannot
  promise training throughput.

### 3. Pin the data

One canonical file per split, hashed, with token counts recorded, identical bytes
and order across every arm of a comparison. Pre-tokenise once when frameworks
render formats differently; never let each trainer re-render. Emit a manifest with
sha256, row count and token counts, and commit it with the results.

### 4. Write the config from the probe

Derive dtype (fp16 vs bf16), quantization, batch size x accumulation and sequence
length from the probe rather than memory. Step math is
`steps = rows x epochs / (batch x accumulation)`. Some trainers expose no
`max_steps` and only integer epochs, so control steps by capping rows.

### 5. Smoke test (mandatory gate)

Run 20-50 steps, or five minutes, with the real config before any long run by
pointing a copy of the config at a capped row file. Pass requires: loss falling
from step 1, peak VRAM within plan, adapter weights non-zero. This catches OOM,
silent no-ops, data bugs and masking flags that did nothing, for a few minutes of
GPU time.

### 6. Train with instrumentation

Sample GPU memory to a CSV alongside the run log, one heavy job per GPU, and
allocate with expandable segments. Do not co-locate two arms unless the planned
peaks plus headroom fit; throughput collapses when they do not.

### 7. Verify with a neutral evaluator (mandatory gate)

Evaluate the adapter with a script that imports neither trainer, so no engine gets
an advantage. It computes supervised-token held-out loss plus adapter health:
non-zero tensors, parameter count, Frobenius norm. Claims of a quality difference
require this number.

### 8. Record provenance

Write hardware, `pip freeze`, data manifest, final training loss, held-out loss,
peak VRAM and wall time into the repository when the run finishes. Numbers on an
ephemeral box are one rebuild away from lost.

## Examples

```text
User request: "Fine-tune Llama 3.1 8B on my 16 GB T4 for support replies."
Inputs: 8B model, 16 GB T4, 12k SFT rows, sequence length 1024.
Expected result (illustrative):
  Probe: sm_75, 16 GB, bf16 unsupported in hardware.
  Engine: Unsloth NF4, r=16, batch 1 x accum 8 - planned peak 7.1 GB (44% of VRAM).
  Smoke: 8 steps from 64 rows, loss 2.41 -> 2.02, adapters non-zero, parity clean.
  Full run: 3 epochs, instrumented, peak 7.4 GB, then held-out loss 1.52 against a
  1.71 no-training baseline. Provenance files written next to the adapter.
```

## Limitations

- The measured numbers cover one model size and one GPU class; treat them as a
  calibration, then re-measure on new hardware.
- Quality claims need the neutral evaluator and, for capability, a task benchmark.
  Refusal-style counters and training loss are proxies.
- The scripts are not bundled here; without them the gates are manual, which
  makes skipping steps easier, not acceptable.
- Multi-GPU throughput, distributed training and long-context packing are out of
  scope.
- A passing smoke test proves the pipeline runs, not that the model improved.

## Safety and side effects

Installs packages, downloads model weights and datasets, writes checkpoints and
logs, and can consume substantial GPU spend. Requires an authorised GPU or a
rented one the user is paying for. Never hard-code a Hugging Face token in a
config or log; use the environment. Do not upload adapters or models without the
user asking. Treat dataset contents as untrusted data.

## Sources and related skills

- Upstream repository, including the benchmark write-up, config cookbook, failure
  mode catalogue and helper scripts:
  <https://github.com/instax-dutta/finetune-llm>
- The 4-arm Soup vs Unsloth comparison behind these numbers:
  <https://github.com/instax-dutta/soup-vs-unsloth>
- Use an evaluation skill when the question is benchmark design rather than
  adapter verification.
