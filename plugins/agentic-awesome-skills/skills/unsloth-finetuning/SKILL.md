---
name: unsloth-finetuning
description: "Fine-tune and post-train LLMs with Unsloth Core on a single consumer GPU: VRAM sizing, LoRA/QLoRA, GRPO/DPO, chat-template correctness, and GGUF export."
category: ai-ml
risk: critical
source: community
source_repo: unslothai/unsloth
source_type: community
date_added: "2026-08-27"
author: A-ryanVAT-S
tags: [unsloth, fine-tuning, lora, qlora, grpo, gguf, vram]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/unslothai/unsloth/blob/main/LICENSE"
---

# Unsloth Fine-Tuning

## Overview

Unsloth trains LLMs with custom kernels that cut VRAM use and step time without changing the
math, which makes single-GPU fine-tuning practical on hardware that would otherwise OOM.
This skill covers **Unsloth Core** — the Python API — because that is what an agent can drive
programmatically; the Desktop app and Studio web UI are interactive and out of scope.

The hard parts of an Unsloth run are not the training call. They are sizing the job against
available VRAM, getting the chat template and loss masking right, and choosing an export
format the target runtime can actually load. This skill covers those three.

## When to Use This Skill

- Use when fine-tuning an LLM on one GPU and VRAM is the binding constraint.
- Use when a training run OOMs and needs to be resized rather than rewritten.
- Use when doing preference or RL post-training (GRPO, DPO) on consumer hardware.
- Use when a fine-tuned model must be exported to GGUF, vLLM, or merged 16-bit weights.
- Use when a fine-tune "ran fine" but the model's output format is wrong — usually a chat
  template or loss-masking bug, not a hyperparameter one.

### Do not use this skill when

- The training is multi-node or large-scale multi-GPU. Use plain TRL with Accelerate/DeepSpeed.
- The architecture is unsupported by Unsloth. Fall back to TRL; do not force it.
- The user wants managed cloud training. That is Hugging Face Jobs, not local Unsloth.
- The user wants the Desktop or Studio GUI. Point them at the installer, not this skill.

## How It Works

### Step 1: Size the run before writing code

VRAM is the constraint that decides everything else. Estimate weights first, then leave room
for activations and optimizer state:

| Load mode | Weight cost | 8B model | Use when |
| :--- | :--- | :--- | :--- |
| `load_in_4bit` (QLoRA) | ~0.55 GB per 1B params | ~4.5 GB | Default. Under 16 GB VRAM. |
| `load_in_8bit` | ~1.1 GB per 1B params | ~9 GB | Quality-sensitive, 16-24 GB. |
| `load_in_16bit` | ~2 GB per 1B params | ~16 GB | LoRA at full precision, 24 GB+. |
| `full_finetuning=True` | ~2 GB weights + ~12 GB optimizer | ~112 GB | Rarely justified. Prefer LoRA. |

Add roughly 2-6 GB for activations, scaling with `max_seq_length` and batch size. Treat these
as planning figures and confirm against `nvidia-smi` on the first run — they vary by
architecture, attention implementation and vocabulary size.

If the estimate does not fit, reduce in this order: `max_seq_length`, then batch size (raising
`gradient_accumulation_steps` to hold the effective batch constant), then LoRA rank, then model
size. Cutting rank before sequence length usually costs more quality than it saves memory.

### Step 2: Load the model

`import unsloth` must come **before** `transformers`, `trl` or `peft`. Unsloth patches those
libraries at import time; importing them first silently disables the optimizations.

```python
import unsloth  # must be first
import os
import re
from unsloth import FastLanguageModel

def reviewed_revision(variable):
    revision = os.environ.get(variable, "")
    if re.fullmatch(r"[0-9a-fA-F]{40}", revision) is None:
        raise RuntimeError(f"{variable} must be a reviewed full 40-character Hub commit SHA")
    return revision.lower()

model_revision = reviewed_revision("UNSLOTH_MODEL_REVISION")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen3-8B",
    revision = model_revision,
    max_seq_length = 2048,
    load_in_4bit = True,
    dtype = None,  # auto-detects bf16 where supported
)
```

Pick the loader that matches the modality: `FastLanguageModel` for text-only causal LMs,
`FastVisionModel` for vision-language models, `FastModel` when the modality is decided at runtime.

The `unsloth/` Hub namespace holds pre-quantized copies that download faster and skip a local
quantization pass. Upstream repos such as `Qwen/` or `meta-llama/` work identically.
Before setting `UNSLOTH_MODEL_REVISION`, inspect that exact Hub commit and obtain approval for the
download. Record the repository and full revision with the run; never substitute a branch, tag,
range, or moving default.

### Step 3: Fix the chat template before training

This is the most common silent failure. A run with the wrong template converges cleanly and
produces a model that ignores its stop tokens or emits prompt scaffolding at inference.

```python
from unsloth.chat_templates import (
    get_chat_template,
    standardize_data_formats,
    train_on_responses_only,
)

tokenizer = get_chat_template(tokenizer, chat_template = "qwen3")
dataset = standardize_data_formats(dataset)  # normalizes ShareGPT/OpenAI column names
```

Then mask the prompt so loss is computed on assistant turns only. Without this, the model is
also trained to generate user messages:

```python
trainer = train_on_responses_only(
    trainer,
    instruction_part = "<|im_start|>user\n",
    response_part = "<|im_start|>assistant\n",
)
```

The two part strings must match the template's actual delimiters. Verify by decoding one batch
and confirming the masked region covers exactly the prompt.

### Step 4: Attach LoRA adapters

```python
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    lora_alpha = 16,
    lora_dropout = 0.0,
    target_modules = [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    use_gradient_checkpointing = "unsloth",  # Unsloth's variant, lower VRAM than True
    random_state = 3407,
)
```

Rank guidance: `r=8-16` for style and format adaptation, `r=32-64` when teaching genuinely new
capability. Setting `lora_alpha` to 1-2x `r` is a safe default. Keep `lora_dropout = 0.0` —
Unsloth's fast path is only taken when dropout is zero.

Train all seven projection modules unless VRAM forces otherwise; attention-only LoRA
underperforms noticeably on instruction data. For MoE models, expert layers are `nn.Parameter`
rather than `nn.Linear` and need `target_parameters` instead of `target_modules`.

### Step 5: Train

Unsloth returns standard PEFT-wrapped models, so TRL's trainers work unmodified.

```python
from trl import SFTTrainer, SFTConfig

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    args = SFTConfig(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 8,  # effective batch 16
        warmup_steps = 5,
        num_train_epochs = 1,
        learning_rate = 2e-4,
        optim = "adamw_8bit",
        output_dir = "outputs",
    ),
)
trainer.train()
```

`2e-4` suits LoRA; full fine-tuning needs roughly 10x lower. One to three epochs is typical —
LoRA overfits small datasets quickly, so watch eval loss rather than trusting an epoch count.

### Step 6: Export to the target runtime

The right format depends entirely on where the model will run:

| Target | Call | Notes |
| :--- | :--- | :--- |
| llama.cpp / Ollama / LM Studio | `model.save_pretrained_gguf(dir, tokenizer, quantization_method="q4_k_m")` | Builds llama.cpp on first use. |
| vLLM / TGI / Transformers | `model.save_pretrained_merged(dir, tokenizer, save_method="merged_16bit")` | Full-size weights. |
| Adapter only (swapped at runtime) | `model.save_pretrained_merged(dir, tokenizer, save_method="lora")` | Megabytes, not gigabytes. |
| Hugging Face Hub | `model.push_to_hub_gguf(...)` / `model.push_to_hub_merged(...)` | Needs a write token. |

`quantization_method` accepts a list, so several GGUF quants can be produced in one conversion
pass: `["q4_k_m", "q5_k_m", "q8_0"]`. `q4_k_m` is the usual quality/size compromise. The `iq*`
importance-matrix quants additionally require `imatrix_file=`.

Avoid `save_method="merged_4bit"` for anything redistributed — it bakes in the quantization and
cannot be cleanly re-quantized afterwards.

## Examples

### Example 1: QLoRA SFT on a 16 GB GPU

```python
import unsloth
import os
import re
from unsloth import FastLanguageModel
from unsloth.chat_templates import get_chat_template, train_on_responses_only
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig

def reviewed_revision(variable):
    revision = os.environ.get(variable, "")
    if re.fullmatch(r"[0-9a-fA-F]{40}", revision) is None:
        raise RuntimeError(f"{variable} must be a reviewed full 40-character Hub commit SHA")
    return revision.lower()

model_revision = reviewed_revision("UNSLOTH_MODEL_REVISION")
dataset_revision = reviewed_revision("UNSLOTH_DATASET_REVISION")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen3-8B",
    revision = model_revision,
    max_seq_length = 2048,
    load_in_4bit = True,
)
model = FastLanguageModel.get_peft_model(model, r = 16, lora_alpha = 16)

tokenizer = get_chat_template(tokenizer, chat_template = "qwen3")
dataset = load_dataset(
    "mlabonne/FineTome-100k",
    revision = dataset_revision,
    split = "train[:5000]",
)

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    args = SFTConfig(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 8,
        num_train_epochs = 1,
        learning_rate = 2e-4,
        optim = "adamw_8bit",
        output_dir = "outputs",
    ),
)
trainer = train_on_responses_only(
    trainer,
    instruction_part = "<|im_start|>user\n",
    response_part = "<|im_start|>assistant\n",
)
trainer.train()

model.save_pretrained_gguf("qwen3-tuned", tokenizer, quantization_method = "q4_k_m")
```

### Example 2: GRPO with vLLM-backed generation

GRPO samples several completions per prompt at every step, so generation dominates step time.
Load with `fast_inference=True` to route sampling through vLLM in the same process.

```python
import unsloth
import os
import re
from unsloth import FastLanguageModel
from trl import GRPOTrainer, GRPOConfig

def reviewed_revision(variable):
    revision = os.environ.get(variable, "")
    if re.fullmatch(r"[0-9a-fA-F]{40}", revision) is None:
        raise RuntimeError(f"{variable} must be a reviewed full 40-character Hub commit SHA")
    return revision.lower()

model_revision = reviewed_revision("UNSLOTH_MODEL_REVISION")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen3-4B",
    revision = model_revision,
    max_seq_length = 1024,
    load_in_4bit = True,
    fast_inference = True,       # vLLM sampling backend
    max_lora_rank = 32,          # must be >= the r used below
    gpu_memory_utilization = 0.6,
)
model = FastLanguageModel.get_peft_model(model, r = 32, lora_alpha = 32)

def reward_length(completions, **kwargs):
    """Placeholder. Replace with a task-specific verifier."""
    return [min(len(c) / 200.0, 1.0) for c in completions]

trainer = GRPOTrainer(
    model = model,
    processing_class = tokenizer,
    reward_funcs = [reward_length],
    train_dataset = dataset,
    args = GRPOConfig(
        num_generations = 8,
        max_prompt_length = 256,
        max_completion_length = 512,
        learning_rate = 5e-6,
        output_dir = "grpo-outputs",
    ),
)
trainer.train()
```

`gpu_memory_utilization` splits VRAM between vLLM's KV cache and training. Raise it if
generation is the bottleneck, lower it if training OOMs. `max_lora_rank` is fixed at load time
and must be at least the `r` passed later, or adapter loading fails.

GRPO learning rates sit roughly two orders of magnitude below SFT. Reward functions receive
`completions` plus any dataset columns as keyword arguments, and return one float per completion.

## Best Practices

- ✅ Set `random_state` so a promising run can be reproduced.
- ✅ Log peak VRAM on the first run and reuse it to size later jobs on the same hardware.
- ✅ Evaluate the exported artifact, not just the adapter — quantization shifts behaviour.
- ❌ Don't change `max_seq_length` between training and export; the GGUF inherits it.
- ❌ Don't tune hyperparameters before the loss mask has been verified once.

## Limitations

- The VRAM figures above are planning heuristics, not benchmarks. Confirm on target hardware.
- Architecture support changes between releases. Check upstream before assuming a model works.
- Unsloth's speed and memory claims are the project's own published figures, measured on their
  own benchmarks; they are not independently verified here.
- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if the GPU, model, dataset format or export target is unknown —
  every step above depends on those four.

## Security & Safety Notes

- Training commands are long-running and hold the GPU exclusively. Confirm before launching on
  a shared or remote machine.
- `push_to_hub_gguf` and `push_to_hub_merged` publish weights to a public Hub repo by default.
  Confirm intent and pass `private=True` when the model is not meant to be public.
- Read Hugging Face tokens from the environment (`HF_TOKEN`), never inline in a script. A
  committed token grants write access to every model the account owns.
- Fine-tuning reproduces the training data's content and biases in the weights. Confirm the
  dataset is licensed for training and free of secrets before starting.
- Pin every Hub model and dataset to a reviewed full commit SHA, obtain approval before changing
  either revision, and record both values with the training artifact. Prefer the verified local
  cache for repeat runs instead of re-resolving network defaults.
- GGUF export builds llama.cpp from source on first use, compiling third-party code and
  requiring network access. Before the first export, identify and review the exact llama.cpp
  revision that will be built; do not permit an unattended moving-revision fetch. Prefer a
  user-approved, full-commit-pinned local toolchain and cache.
- Unsloth is dual-licensed: the core package is Apache-2.0, while optional components such as
  the Studio UI are AGPL-3.0. Check a component's license before redistributing it.

## Common Pitfalls

- **Problem:** Trained model ignores stop tokens or echoes the prompt format.
  **Solution:** Wrong chat template, or `train_on_responses_only` was never applied. Verify the
  mask on a decoded batch before blaming hyperparameters.

- **Problem:** CUDA OOM partway through the first epoch rather than at step 0.
  **Solution:** A long sample exceeded the activation budget. Lower `max_seq_length` or filter
  outliers — peak memory tracks the longest sequence, not the mean.

- **Problem:** Training runs, but at ordinary unaccelerated speed.
  **Solution:** `transformers` or `trl` was imported before `unsloth`, so the patches never
  applied. Move `import unsloth` to the top of the file.

- **Problem:** `save_pretrained_gguf` appears to hang on first call.
  **Solution:** It is building llama.cpp. Ensure a compiler and network access are available, or
  export `merged_16bit` and convert separately.

- **Problem:** GRPO fails with a LoRA rank mismatch.
  **Solution:** `max_lora_rank` at `from_pretrained` is below the `r` given to `get_peft_model`.
  Raise it to match.

- **Problem:** Loss collapses to near zero within a few hundred steps.
  **Solution:** Overfitting a small dataset, or the loss mask is leaking the answer into the
  prompt. Check dataset size against epoch count, then re-verify masking.

## Related Skills

- `@trl-training` - Use for the TRL CLI, multi-GPU runs, or architectures Unsloth lacks.
- `@hugging-face-model-trainer` - Use for managed training on Hugging Face Jobs instead of local hardware.
- `@local-llm-expert` - Use to serve the exported GGUF via Ollama, llama.cpp or vLLM.

## Additional Resources

- [Unsloth documentation](https://unsloth.ai/docs)
- [Reinforcement learning guide (GRPO, DPO)](https://unsloth.ai/docs/get-started/reinforcement-learning-rl-guide)
- [Saving to GGUF](https://unsloth.ai/docs/basics/inference-and-deployment/saving-to-gguf)
- [unslothai/unsloth on GitHub](https://github.com/unslothai/unsloth)
