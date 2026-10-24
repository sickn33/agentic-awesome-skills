---
name: hugging-face-model-trainer
description: "Train or fine-tune language and vision models using TRL (Transformer Reinforcement Learning) or Unsloth with Hugging Face Jobs infrastructure. Covers SFT, DPO, GRPO and reward modeling training methods, plus GGUF conversion for local deployment."
risk: critical
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-llm-trainer
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Hugging Face Model Training

## When to Use

Use for planning and running language-model SFT, DPO or GRPO training with
TRL or Unsloth, and for preparing GGUF conversion. The bundled Unsloth example
is a text-training example; it is not an implementation of vision training or
streaming support. Read [the detailed guide](references/detailed-guide.md) and
only the method-specific references needed for the task.

## Before Execution

The user must approve the exact training data and model revisions, destination,
hardware, duration and compute budget before a paid job. Training authorization
does not automatically authorize public Hub repositories, telemetry, tracking
Spaces, or uploading private datasets. Confirm current account eligibility,
quotas and prices through the actual provider; do not infer them from old tables.

Use whichever supported Jobs interface is actually available. Inspect its current
schema before submitting. The string `$HF_TOKEN` is not a universal secret
interpolation protocol. Use the host's documented secret binding without printing
credentials, putting them in source, or changing an unrelated login session.
Read-only operations need no write token. Grant write access only to an approved
artifact destination.

Validate sample values, types, chat roles, model chat templates and the complete
bounded training subset before reserving compute. Column names alone do not prove
compatibility. GRPO additionally needs an explicit, tested reward function. Pin
reviewed dependency versions and immutable model/dataset revisions. Review any
required remote model code separately; default to `trust_remote_code=False`.

## Workflow

1. Confirm the method and baseline; inspect the bundled example before adapting it.
2. Run a bounded pilot with an explicit maximum number of steps and examples.
   Verify memory use on the actual sequence length, precision and optimizer.
   Multiple GPUs require a supported distributed launch; their memory is not
   automatically a shared pool.
3. Use measured pilot duration and a current user-supplied rate with
   `scripts/estimate_cost.py --measured-hours 0.1 --hourly-rate 2`.
   The numbers in this example are arithmetic inputs, not provider prices.
4. Choose a deadline within the approved budget. Configure private durable
   checkpoints or an approved storage destination before an ephemeral job starts.
   Uploading to the Hub is one option; public publishing is never required.
5. Inspect job state and sanitized logs. Check checkpoint recovery and evaluate
   on held-out data before calling a run successful. Do not resubmit a job with an
   uncertain outcome until its status is known.

## Examples

For SFT, adapt `scripts/train_sft_example.py` to the approved model and text or
chat dataset. For preference learning inspect `scripts/train_dpo_example.py`;
for online rewards inspect `scripts/train_grpo_example.py`. These are examples
requiring environment-specific verification, not certified production jobs.

For local conversion inspect `scripts/convert_to_gguf.py` before use. Review and
pin llama.cpp and its dependencies. Keep intermediate artifacts until conversion
and any separately approved upload succeed. Respect base-model, adapter and data
licenses; a generated model card cannot grant rights you do not have.

## Limitations

Unsloth performance and supported architectures depend on versions, kernels,
hardware and workload; percentages are not guarantees. The cost helper performs
arithmetic only, not memory sizing, runtime prediction or live quoting. GPU
training, model loading, uploads and external tracking have not been executed as
part of this source review. References may show older API versions: resolve them
against your pinned environment before executing. Do not disable the MPS memory
watermark as a generic out-of-memory workaround.
