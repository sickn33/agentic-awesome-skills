# Training Arguments

`SentenceTransformerTrainingArguments`, `CrossEncoderTrainingArguments`, and `SparseEncoderTrainingArguments` all inherit from Hugging Face's `TrainingArguments`, so 95% of the arguments are the same.

This reference covers the arguments that actually matter for embedding-model training.

## The recommended default set

Start with this and adjust only what you have a reason to change:

```python
from sentence_transformers import SentenceTransformerTrainingArguments
from sentence_transformers.base.sampler import BatchSamplers

args = SentenceTransformerTrainingArguments(
    output_dir="models/my-model",

    # Duration
    num_train_epochs=1,
    # max_steps=10_000,                    # alternative to epochs

    # Batch size
    per_device_train_batch_size=64,
    per_device_eval_batch_size=64,
    gradient_accumulation_steps=1,

    # Optimizer
    learning_rate=2e-5,
    warmup_steps=0.1,                      # transformers v5.2 deprecated `warmup_ratio`; pass the ratio as a float directly to `warmup_steps`
    lr_scheduler_type="linear",
    weight_decay=0.0,

    # Precision
    bf16=True,                             # fp16=True on older GPUs (T4, V100)

    # Sampler (bi-encoder + sparse-encoder)
    batch_sampler=BatchSamplers.NO_DUPLICATES,

    # Eval + checkpointing
    eval_strategy="steps",
    eval_steps=0.1,                        # fraction: 10 evals/epoch, scales with dataset size
    save_strategy="steps",
    save_steps=0.1,                        # keep aligned with eval_steps for load_best_model_at_end
    save_total_limit=2,
    load_best_model_at_end=True,
    metric_for_best_model="eval_NanoBEIR_mean_cosine_ndcg@10",
    greater_is_better=True,

    # Logging
    logging_steps=0.01,                    # fraction: ~100 log lines/epoch
    logging_first_step=True,
    run_name="my-model",
    report_to="trackio",                   # or "wandb", "tensorboard", "mlflow", "none"
)
```

## Duration

- `num_train_epochs` — most common. 1 for large datasets (>500k), 3–10 for small.
- `max_steps` — use instead of epochs when you want a fixed compute budget. Overrides `num_train_epochs`.
- For huge datasets where 1 epoch is overkill, pick `max_steps` matching your compute plan.

## Batch size

Effective batch size = `per_device_train_batch_size × num_gpus × gradient_accumulation_steps`.

Rules of thumb:
- **Contrastive losses (MNRL, GIST, SMNRL)**: push `per_device_train_batch_size` as high as VRAM allows. Larger in-batch negatives = better gradients. 64–256 typical.
- **Regression losses (CoSENTLoss, CosineSimilarityLoss, etc.)**: batch size matters less. 16–64 works.
- **Cross-encoders**: batch size is less critical for quality. 32–128 typical.
- If you can't fit the desired per-device batch, use `gradient_accumulation_steps` to simulate it — but for MNRL-family losses this **does not** provide the same benefit as a real batch (in-batch negatives are still only per-device). Use `CachedMultipleNegativesRankingLoss` instead.

## Learning rate and schedule

- `2e-5` is the safe default for full fine-tuning of BERT-family encoders.
- `1e-4` to `5e-4` for LoRA / PEFT adapters.
- `2e-1` for training a `StaticEmbedding` model from scratch (much higher than transformers because each token is a free-floating vector with no upstream gradients).
- `lr_scheduler_type="linear"` with `warmup_steps=0.1` is standard (a float `< 1` is interpreted as a fraction of total steps). `"cosine"` works equally well; `"constant_with_warmup"` is fine for very short runs. The legacy `warmup_ratio` was deprecated in transformers v5.2 in favor of `warmup_steps` accepting floats; passing `warmup_ratio=...` still works but emits a DeprecationWarning.
- If loss goes NaN, **drop LR first** before anything else.

## Precision

**The non-negotiable rule:** load the model in **fp32** (the default — don't pass `torch_dtype=torch.bfloat16` to the model constructor or `model_kwargs`). Use the `bf16=True` / `fp16=True` flags below to enable **autocast**, not a weight cast. The trainer keeps the model and optimizer state in fp32 and autocasts activations to bf16/fp16 at forward/backward time. This preserves Adam's full-precision moments while giving you most of the bf16 throughput.

Casting weights to bf16 *before* the optimizer is created puts the Adam state (`exp_avg`, `exp_avg_sq`) in bf16 too — bf16's 7-bit mantissa is too coarse for small gradient moments and you get silent quality regressions across runs.

| Flag | When to use |
|---|---|
| `bf16=True` | Ampere (A10G, A100, 3090) and newer (Hopper, Ada). Preferred when supported — more numerically stable than fp16. Activations only; weights stay fp32. |
| `fp16=True` | Older GPUs (T4, V100, 2080, Titan V). Be prepared to drop LR or enable loss scaling if you see NaN. Activations only; weights stay fp32. |
| Neither | fp32 throughout. Slow; only useful for debugging numerical issues. |

Do not set both `bf16=True` and `fp16=True`.

**Evaluator calls outside the trainer** (typically the pre-training baseline + a final post-training pass) don't get the trainer's autocast. Wrap them manually for the speedup — and note that the wrap is **only strictly required when the model uses `attn_implementation="flash_attention_2"`**, since FA2 kernels need bf16/fp16 inputs to function. Without FA2 the wrap is a throughput optimization, not a correctness requirement:

```python
import torch
from contextlib import nullcontext

def autocast_ctx():
    if not torch.cuda.is_available():
        return nullcontext()
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    return torch.autocast("cuda", dtype=dtype)

with autocast_ctx():
    evaluator(model)            # baseline
trainer.train()
with autocast_ctx():
    evaluator(model)            # post-training
```

**FlashAttention 2** wants bf16/fp16 inputs but doesn't require bf16 weights. Pass `model_kwargs={"attn_implementation": "flash_attention_2"}` *without* `torch_dtype`, and let `bf16=True` autocast feed bf16 activations to FA2. Weights stay fp32, optimizer state stays fp32.

## Batch sampler (bi-encoder + sparse-encoder)

`batch_sampler=BatchSamplers.NO_DUPLICATES` is critical for contrastive losses. Without it, the same (anchor, positive) can appear multiple times in one batch, turning legitimate positives into false negatives.

Use `BatchSamplers.NO_DUPLICATES` for MNRL / SMNRL / CachedMNRL / GIST (the default recommendation); `BatchSamplers.GROUP_BY_LABEL` for batch-triplet losses (`BatchAllTripletLoss`, `BatchHardTripletLoss`); `BatchSamplers.NO_DUPLICATES_HASHED` only for very large datasets where per-batch string comparison gets slow.

For multi-dataset training, the analogous `MultiDatasetBatchSamplers` class controls how to draw from each dataset (`ROUND_ROBIN`, `PROPORTIONAL`). Under DDP, each dataset is sharded automatically per process — no extra config needed; set `multi_dataset_batch_sampler=...` once and it works for 1-GPU and N-GPU runs identically.

## Evaluation and checkpointing

```python
eval_strategy="steps",
eval_steps=0.1,                        # evaluate every 10% of training
save_strategy="steps",
save_steps=0.1,                        # save at the same cadence (required for load_best_model_at_end)
save_total_limit=2,
load_best_model_at_end=True,
metric_for_best_model="eval_<EvaluatorName>_<metric>",
greater_is_better=True,
```

**Prefer fractional values over absolute step counts.** `eval_steps=0.1` / `save_steps=0.1` / `logging_steps=0.01` are interpreted as fractions of total training steps (10 evals per epoch, 100 log lines per epoch) and auto-scale when the dataset size or epoch count changes. The HF Trainer converts a `float < 1` to `int(total_steps * fraction)` at init time, so the same config works whether you're training on 10k or 10M rows — no need to recompute absolute step counts each time.

Use an absolute integer (e.g. `eval_steps=500`) only when you have a specific reason: comparing runs at known step counts, or when `max_steps` is set to an unusual value that makes fractions awkward.

Non-negotiable rules:
1. `save_steps` must be a multiple of `eval_steps` (or equal) when `load_best_model_at_end=True`, so the best-eval checkpoint is actually on disk. Matching them is the simplest path (e.g. both at `0.1`).
2. If `eval_strategy="steps"` and you don't pass `eval_dataset`, training hangs. Either provide an eval dataset or set `eval_strategy="no"`.
3. `metric_for_best_model` must match the exact key the evaluator writes. The pattern is usually `f"eval_{evaluator.primary_metric}"`. Common values:
   - `NanoBEIREvaluator` (bi-encoder, cosine): `eval_NanoBEIR_mean_cosine_ndcg@10`
   - `SparseNanoBEIREvaluator` (sparse, dot): `eval_NanoBEIR_mean_dot_ndcg@10`
   - `CrossEncoderNanoBEIREvaluator` (rerank from BM25 top-100): `eval_NanoBEIR_R100_mean_ndcg@10`
   - `EmbeddingSimilarityEvaluator(name="sts-dev")`: `eval_sts-dev_spearman_cosine`

## Early stopping

Add `EarlyStoppingCallback` via `callbacks=[...]`:

```python
from transformers import EarlyStoppingCallback

trainer = SentenceTransformerTrainer(
    ..., callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
)
```

This requires `load_best_model_at_end=True` and `metric_for_best_model=...` to be set.

`early_stopping_patience=3` means "stop if the best metric hasn't improved in 3 consecutive eval rounds." Use `early_stopping_threshold=0.001` to require a minimum improvement.

**When it actually matters:**
- **Cross-encoders**: strongly recommended. CE rerankers typically peak mid-training and then degrade — the best checkpoint is rarely the last. Early stopping saves compute *and* guards against quality regression.
- **Bi-encoders and sparse encoders**: usually plateau rather than regress, so early stopping fires much less often. `load_best_model_at_end=True` alone gives you the right final model; adding the callback is a belt-and-suspenders safety net.

## Resuming training

`trainer.train(resume_from_checkpoint=True)` resumes from the latest checkpoint in `output_dir`. Pass a specific path to resume from a specific step: `resume_from_checkpoint="models/my-model/checkpoint-500"`.

State that persists across resumption: optimizer, scheduler, random seeds, trainer step counter. State that does **not**: dataset iteration order for `IterableDataset` — if you use streaming datasets, you must handle resumption yourself.

## Hub push

`push_to_hub=True` + `hub_model_id="your-username/my-model"` + `hub_strategy="every_save"` is the standard pattern. On HF Jobs, also pass `secrets={"HF_TOKEN": "$HF_TOKEN"}` on the job submission. The four `hub_strategy` values: `"every_save"` (each checkpoint, mandatory for HF Jobs), `"end"` (final only), `"checkpoint"` (latest, overwrite), `"all_checkpoints"` (each as a separate commit).

## Logging

```python
logging_steps=0.01,             # fraction: ~100 log lines per epoch (use an int for a fixed cadence)
logging_first_step=True,        # log before any training; useful sanity check
logging_dir=None,               # defaults to output_dir/runs
report_to="trackio",            # or ["trackio", "tensorboard"] for multiple; "none" disables all
run_name="meaningful-name",     # shown in the tracker UI
```

**Tracker recommendation:**
- **Trackio** (default) for solo / small-team work: zero friction beyond `HF_TOKEN`. Auto-creates a Space at `https://huggingface.co/spaces/<your-username>/trackio` on the first run; subsequent runs append and group by `run_name`.
- **W&B** for larger teams or sweep / report features. `pip install wandb && wandb login` (or set `WANDB_API_KEY`).
- **TensorBoard** for air-gapped environments. No remote dashboard.
- **MLflow** when it's already the org standard.

For trackio sweeps / ablations, use `trackio.init(project="...", name="...", group="v1", config={...})` before training to group related runs side-by-side. Without `trackio.init()`, defaults are derived from `run_name` and HF username.

**Tracker gotchas:**
- `report_to="all"` enables every installed integration (usually more than you want); `"none"` disables everything (the current `transformers` default). Always set explicitly.
- Trackio on HF Jobs without `secrets={"HF_TOKEN": "$HF_TOKEN"}` fails silently. W&B on HF Jobs needs `WANDB_API_KEY` in `secrets`.
- The HF Trainer logs only on rank 0 under DDP; custom logging in your script may need explicit rank checks to avoid duplicate writes.

## Memory-saving arguments

```python
gradient_checkpointing=True,    # trades compute for memory. ~30% slowdown, ~40% less memory.
gradient_checkpointing_kwargs={"use_reentrant": False},
torch_empty_cache_steps=1000,   # periodically clear PyTorch allocator cache
dataloader_num_workers=2,       # parallel data loading; 2-4 is usually enough
dataloader_pin_memory=True,
```

Do **not** combine `gradient_checkpointing=True` with any `Cached*` loss — they conflict.

## Hyperparameter search

`trainer.hyperparameter_search(...)` is supported for all three trainers via Hugging Face's `Trainer` API (uses Optuna, Ray Tune, Sigopt, or W&B as backends).

Minimal example:

```python
def model_init(trial):
    return SentenceTransformer("microsoft/mpnet-base")

def hp_space(trial):
    return {
        "learning_rate": trial.suggest_float("learning_rate", 1e-6, 1e-4, log=True),
        "num_train_epochs": trial.suggest_int("num_train_epochs", 1, 3),
        "per_device_train_batch_size": trial.suggest_categorical(
            "per_device_train_batch_size", [32, 64, 128]
        ),
    }

trainer = SentenceTransformerTrainer(
    model=None, model_init=model_init,
    args=args, train_dataset=train_dataset, eval_dataset=eval_dataset,
    loss=lambda model: MultipleNegativesRankingLoss(model),   # function that takes model -> loss
    evaluator=evaluator,
)

best_run = trainer.hyperparameter_search(
    hp_space=hp_space,
    direction="maximize",
    n_trials=10,
    backend="optuna",
)
print(best_run)
```

Install a backend: `pip install optuna` (or `ray[tune]`).

HPO is expensive. Don't reach for it until a single manually-tuned run is working end-to-end. For most production models, picking a reasonable LR from the range above and tuning batch size is enough.

## Multi-task training args (brief)

When training on a dict of datasets with a dict of losses, add:

```python
multi_dataset_batch_sampler=MultiDatasetBatchSamplers.PROPORTIONAL,  # or ROUND_ROBIN
```

See `../scripts/train_sentence_transformer_multi_dataset_example.py` (docstring covers per-dataset losses, single-loss + DatasetDict variant, samplers, gotchas).

## Don't

- Don't set `eval_strategy="epoch"` without setting `save_strategy="epoch"` — checkpoint/eval alignment matters for `load_best_model_at_end`.
- Don't set `remove_unused_columns=False` unless you have a custom collator that consumes metadata columns the loss doesn't see. The default (True) is safer — it drops unused columns automatically.
- Don't set `seed` to verify reproducibility and then expect bit-for-bit identical runs on different GPUs or across PyTorch versions — exact reproducibility across hardware is not guaranteed.
- Don't tune `adam_beta1` / `adam_beta2` / `adam_epsilon` unless you have a specific reason. The defaults are fine for 99% of cases.
