# Troubleshooting

Common failures in sentence-transformers training, with root causes and fixes. Organized by symptom.

## Out of memory (OOM)

**Symptom:** `torch.cuda.OutOfMemoryError` or `CUDA out of memory`.

**Fixes in order:**

1. Reduce `per_device_train_batch_size`. For MNRL, compensate via `CachedMultipleNegativesRankingLoss(model, mini_batch_size=...)` with a large outer batch.
2. Set `gradient_accumulation_steps` to accumulate gradients over multiple smaller batches (for non-contrastive losses).
3. Enable `gradient_checkpointing=True`. ~30% slower, ~40% less activation memory. **Incompatible with `Cached*` losses.**
4. Use `bf16=True` instead of fp32 (if your GPU supports Ampere+).
5. Reduce `max_seq_length` on the transformer module: `model[0].max_seq_length = 128`.
6. Use LoRA (`peft`) for large decoder bases. See `../scripts/train_sentence_transformer_with_lora_example.py` (docstring covers when to use, hyperparams, QLoRA, gotchas).
7. Move to a bigger GPU or multi-GPU (`accelerate launch`).

**See also**: `hardware_guide.md` for VRAM estimates by batch size.

## Loss is NaN or Inf

**Symptom:** training loss printed as `nan` or `inf`, or suddenly jumps to a huge value.

**Fixes:**

1. **Drop learning rate** first. Try `5e-6` or `1e-6`.
2. Enable `warmup_steps=0.1` (a float `< 1` is interpreted as a fraction of total steps), or set an absolute `warmup_steps=500`.
3. Switch fp16 -> bf16 (more numerically stable). If stuck on fp16 (older GPU), try disabling fp16 for a sanity run.
4. Check the dataset for broken rows: empty strings, NaN label values, mismatched column counts. Inspect a few rows with `print(dataset[:5])`.
5. For custom losses or unusual base models (very long context), consider adding `max_grad_norm=1.0` to the training args.
6. Check tokenization: some tokenizers emit no tokens for certain unicode / whitespace-only inputs, which can cause downstream NaN in mean pooling.

## Metrics don't improve / are at baseline

**Symptom:** eval metrics after training are the same as before.

**Fixes:**

1. **Re-run dataset inspector** with `--loss <your-loss>`. Most likely cause: column order wrong, label column not detected, or loss expects a different shape.
2. For retrieval: **your negatives are too easy**. Mine hard negatives (`scripts/mine_hard_negatives.py`).
3. Check `metric_for_best_model` — if the key doesn't match what the evaluator writes, the trainer silently uses the final checkpoint (not the best).
4. Confirm `BatchSamplers.NO_DUPLICATES` is set for MNRL-style losses. Without it, the in-batch negative signal is corrupted.
5. Base model is wrong for the task (e.g. decoder-only LLM for short-text STS). Try a different base.
6. Learning rate too low. Default `2e-5` works for encoders; LoRA wants `1e-4+`; static embeddings want about `2e-1` (much higher than transformers).
7. Dataset too small for the chosen loss. Contrastive losses need >10k pairs to be meaningful.

## Training hangs at the first eval

**Symptom:** training starts, then hangs indefinitely at the first evaluation step.

**Fix:** you set `eval_strategy="steps"` or `"epoch"` but either didn't pass `eval_dataset` or passed an empty one. Either provide an `eval_dataset` or set `eval_strategy="no"`.

## Training hangs at startup (multi-GPU)

**Symptom:** `accelerate launch` runs, prints "Found X GPUs" + model-loading messages, then hangs.

**Fixes:**

1. If using a custom dataset class, ensure `__len__` is implemented and returns a consistent length across processes.
2. If using `batch_sampler=BatchSamplers.NO_DUPLICATES` with a very small dataset relative to the world size, batches may not form. Use a larger dataset or smaller per-device batch.
3. Check for mismatched PyTorch / CUDA versions across nodes. `nvidia-smi` + `python -c "import torch; print(torch.version.cuda)"` on each node.
4. NCCL timeout. Set `NCCL_TIMEOUT=300` (seconds) env var.

## `CachedMultipleNegativesRankingLoss` crashes

**Symptom:** error like "element 0 of tensors does not require grad", or a cryptic autograd error.

**Fix:** you have `gradient_checkpointing=True`. The cached losses do their own forward/backward orchestration; gradient checkpointing conflicts with it. Disable `gradient_checkpointing`.

Same applies to `CachedSpladeLoss`, `CachedGISTEmbedLoss`, and any other `Cached*` loss.

## Hub push fails

**Symptom:** `HTTPError: 401` or `403` during `push_to_hub`.

**Fixes:**

1. Run `hf auth whoami`. If it fails, run `hf auth login`.
2. Token needs **write** permission. Regenerate from https://huggingface.co/settings/tokens.
3. Repo either must exist and you have write access, or `hub_private_repo=True`/`False` is set so the library can create it.
4. On HF Jobs: pass `secrets={"HF_TOKEN": "$HF_TOKEN"}` on the job submission.

## Tracker (Trackio / W&B / TensorBoard) not logging

**Symptom:** training runs but no metrics appear in the tracker UI.

**Fixes:**

- Trackio: confirm `pip install trackio` succeeded. No login step — trackio uses your `HF_TOKEN` (set by `hf auth login` or the `HF_TOKEN` env var). On HF Jobs, `HF_TOKEN` must be in `secrets`.
- W&B: confirm `wandb login` succeeded, or `WANDB_API_KEY` env var is set. On HF Jobs, `WANDB_API_KEY` must be in `secrets`.
- `report_to` not set to the right tracker: `report_to="trackio"` (or `"wandb"`, or a list like `["trackio", "tensorboard"]`).
- TensorBoard: check `logging_dir` (defaults to `output_dir/runs/<timestamp>`); point TB at the parent.

## Base model loads but `encode` produces garbage

**Symptom:** `model.encode(["test"])` returns constant vectors, or all-zeros, or NaN.

**Fixes:**

1. You loaded a classification fine-tune as a base (e.g. a BERT fine-tuned on SQuAD). The CLS head is a QA head, not a usable pooling layer. Use the underlying pretrained encoder (`bert-base-uncased`), not the task-specific checkpoint.
2. For decoder models: you're using mean pooling on causal attention. Switch to last-token pooling.
3. For SPLADE: the model's MLM head isn't initialized properly. Make sure the base has `AutoModelForMaskedLM` compatibility.

## Dataset loads but eval is trivially correct

**Symptom:** eval metric is 1.0 (perfect) from the first evaluation step.

**Fix:** your eval set overlaps the train set. Check `dataset.train_test_split(test_size=...)` was called correctly, or that the Hub dataset's `train` vs. `dev` splits are actually disjoint.

## Model-card generation fails

**Symptom:** warning about model-card generation, or `README.md` is missing after `save_pretrained`.

**Fixes:**

- `codecarbon` may be attempting to write emissions and failing. Set `CODECARBON_LOG_LEVEL=error` or uninstall codecarbon.
- Some training state couldn't be serialized (custom objects with unusual types). Pass `model_card_data=SentenceTransformerModelCardData(...)` with explicit fields to bypass inference.

## `num_labels` mismatch on CrossEncoder

**Symptom:** `BinaryCrossEntropyLoss` raises about mismatched dims, or `CrossEntropyLoss` complains.

**Fix:** `num_labels=1` goes with `BinaryCrossEntropyLoss`; `num_labels>=2` goes with `CrossEntropyLoss`. Set `CrossEncoder("...", num_labels=1)` for BCE.

## CrossEncoder eval nDCG crashes after distillation / listwise / pairwise training

**Symptom:** training loss looks healthy, baseline eval looked fine, but post-training eval nDCG drops a lot (e.g. 0.59 → 0.14). Every checkpoint after the first eval is below baseline.

**Root cause:** the default `Sigmoid` activation function on `CrossEncoder(num_labels=1, ...)` saturates raw logits >5 to ~1.0. Distillation/listwise/pairwise losses (`MSELoss`, `MarginMSELoss`, `LambdaLoss`, `RankNetLoss`, `ListNetLoss`, `ListMLELoss`, `PListMLELoss`, `ADRMSELoss`) operate on raw logits — once the model learns to push positives past the saturation point, ranking information is lost.

**Fix:** construct the model with an `Identity` activation:

```python
import torch.nn as nn
model = CrossEncoder("...", num_labels=1, activation_fn=nn.Identity())
```

Keep the default `Sigmoid` only for `BinaryCrossEntropyLoss` (which uses BCE-with-logits internally and wants sigmoidable inputs).

## LambdaLoss training loss is tiny (e.g. 1e-4): is training broken?

**Symptom:** with `LambdaLoss(model, weighting_scheme=NDCGLoss2PPScheme())` and large `K` (>=64), training loss prints in the 1e-3 to 1e-5 range.

**Root cause:** `NDCGLoss2PPScheme` normalizes by the discount-weighted pair count, which scales roughly with K. The numeric magnitude of the loss isn't the signal you should track.

**Fix:** ignore training loss for LambdaLoss; watch the eval metric (`eval_NanoBEIR_R100_mean_ndcg@10` or your `metric_for_best_model`) instead. If eval is moving in the right direction and loss is "too small", that's expected.

## LambdaLoss OOM: what to drop first

**Symptom:** `CUDA out of memory` during a `LambdaLoss` training step, especially at K>=64.

**Recovery order:**

1. **Lower `mini_batch_size`** on the loss first. The internal forward chunking preserves the K-list semantic — this is the cheapest knob and doesn't change the experiment.
2. Lower `per_device_train_batch_size` and compensate with `gradient_accumulation_steps` to keep total batch fixed.
3. **Reduce K (the candidate-list length per query) only as a last resort.** Lowering K changes what the loss is computing; this is an experimental change, not a memory tweak.

For very large K (>=128), `NDCGLoss2PPScheme` materializes O(K²) weight buffers per query that aren't covered by the forward chunking, so even small `mini_batch_size` may not be enough — at that point K is the right knob.

## Loading a model with a custom inline `nn.Module` raises `ImportError`

**Symptom:** training and saving via `train.py` works fine; loading the saved model from any other script (`predict.py`, a notebook, or another package) fails with:

```
ImportError: Module "__main__" does not define a "ClassifierHead" attribute
```

**Root cause:** when a custom `nn.Module` is defined inline in a script, Python records its qualname as `__main__.ClassifierHead`. ST writes that qualname into `modules.json` at save time. Loading from a different entry point can't resolve `__main__.ClassifierHead` — the class doesn't exist in the loader's `__main__`.

**Fixes (any one):**

1. Move the class to an importable module: `from my_pkg.heads import ClassifierHead`. Save again so `modules.json` records `my_pkg.heads.ClassifierHead`.
2. Build the same shape using stock ST modules (`Dense + LayerNorm + Dense`) instead of a custom class — those are always loadable.
3. Document that the model is only loadable from the same script (acceptable for one-off experiments, not for shipping models).

## SPLADE embeddings are dense (not sparse)

**Symptom:** after training, `(embedding != 0).sum(dim=-1)` is in the thousands, not ~30-250.

**Fixes:**

1. You're missing the `SpladeLoss` wrapper. `SparseMultipleNegativesRankingLoss` alone doesn't add FLOPS regularization. Wrap: `SpladeLoss(model, loss=inner_loss, query_regularizer_weight=5e-5, document_regularizer_weight=3e-5)`.
2. Regularizer weights too low. Increase to 1e-4 or higher.
3. Scheduler wiped out early. `SpladeRegularizerWeightSchedulerCallback` ramps weights from 0 to target over the first ~33% of training (`warmup_ratio=1/3` by default; configurable). On very short runs this never reaches target. Either train longer or set `query_regularizer_weight` / `document_regularizer_weight` higher to compensate.

## `ValueError: The dataset has ... columns but the loss expects N`

**Fix:** column count mismatch. Drop extra columns (`dataset.remove_columns([...])`) or reorder with `select_columns`. Names don't matter; count and order do.

## Encoding on CPU is painfully slow

**Symptom:** a few dozen sentences per second instead of 1000s.

**Fixes:**

- Ensure the model is on GPU: `model.to("cuda")` (or `device_map="auto"` when loading).
- For genuine CPU inference (no GPU available), consider switching to a `StaticEmbedding`-based model — ~1000x faster on CPU than a transformer.

## Hub model loads, but `model.encode(prompt_name="query")` acts like no prompt was applied

**Fix:** the saved model doesn't have `prompts` in `config_sentence_transformers.json`. When training, set `model.prompts = args.prompts` before `save_pretrained`, or use `SentenceTransformerModelCardData(prompts=...)`.

## `accelerate launch` runs only on one GPU

**Fix:** run `accelerate config` first, set number of GPUs and precision. Or pass explicitly: `accelerate launch --multi_gpu --num_processes=4 train.py`.

## Cached loss + PEFT adapter fails to backprop

**Symptom:** "None of the inputs have requires_grad=True" when using Cached* loss with a LoRA adapter.

**Fix:** after `add_adapter`, call:

```python
model.transformers_model.enable_input_require_grads()
```

This ensures gradient flow through the frozen base + trainable adapter.

## Related reference docs

- `training_args.md` (shared) — the args that affect all of the above.
- `hardware_guide.md` (shared) — VRAM sizing and multi-GPU.
- `dataset_formats.md` (shared) — column/loss validation.
- `losses_sentence_transformer.md` / `losses_cross_encoder.md` / `losses_sparse_encoder.md` (per-model-type catalogs) — loss-specific quirks.
