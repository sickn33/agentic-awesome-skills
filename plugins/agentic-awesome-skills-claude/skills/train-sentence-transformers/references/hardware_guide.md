# Hardware Guide

Training embedding models is memory-bound more often than compute-bound.

## If you hit OOM

Try in this order:

1. **Reduce `per_device_train_batch_size`**. Raise `gradient_accumulation_steps` to keep the effective batch size for regression losses. (For MNRL, effective batch via grad-accum is **not** equivalent — see point 3.)
2. **Enable `gradient_checkpointing=True`**. ~30% slower, ~40% less activation memory. Incompatible with `Cached*` losses.
3. **Switch to a `Cached*` loss**:
   - `CachedMultipleNegativesRankingLoss(model, mini_batch_size=32)` — forwards in mini-batches, accumulates the contrastive loss over the full batch. Can simulate batch sizes of 1024+ on a 24GB GPU.
   - `CachedSpladeLoss(model, loss=..., mini_batch_size=16)` — same trick for sparse.
   - `CachedGISTEmbedLoss(model, guide_model, mini_batch_size=32)` — GIST variant.
4. **Enable PEFT / LoRA** for decoder models >1B. `LoraConfig(r=64, lora_alpha=128, task_type="FEATURE_EXTRACTION")`. See `../scripts/train_sentence_transformer_with_lora_example.py` (docstring covers when to use, hyperparams, QLoRA, sharing).
5. **Move to multi-GPU**. See below.
6. **Shorten sequences**. If truncating to 128 is already sufficient for your task, set `max_seq_length` on the transformer module.

## Multi-GPU

`sentence-transformers` uses `accelerate` under the hood. Distributed training works without code changes.

### Data parallel (DDP)

Launch:

```bash
accelerate launch train.py

# or explicitly:
accelerate launch --multi_gpu --num_processes=4 train.py
```

`per_device_train_batch_size` stays per-GPU. Effective batch size scales linearly. MNRL's in-batch negatives remain **per-device**, not global, unless you pass `gather_across_devices=True` to losses that support it (`MultipleNegativesRankingLoss`, `CachedMultipleNegativesRankingLoss`, the symmetric variants, `GISTEmbedLoss`, `CachedGISTEmbedLoss`, `SparseMultipleNegativesRankingLoss`).

### FSDP / DeepSpeed

For models >3B, use `accelerate config` to enable FSDP or DeepSpeed ZeRO. Both are supported — `sentence-transformers` doesn't require any code changes, only the launch config.

```bash
accelerate config                   # interactive; choose FSDP or DeepSpeed
accelerate launch train.py
```

With FSDP full-shard: a 7B model trains on 4×24GB GPUs that would OOM on any single one of them.

**FSDP caveats** (from the [distributed training docs](https://sbert.net/docs/sentence_transformer/training/distributed.html)):
- **Evaluators don't run under FSDP** as of writing — the eval hooks call `model.encode()` which FSDP-wrapped modules can't service mid-training. Plan to evaluate post-training on a single-GPU load of the final checkpoint instead, or train with DDP if you need mid-training evaluation.
- **Layer wrapping must be specified**, e.g. `fsdp_config={"transformer_layer_cls_to_wrap": "BertLayer"}` (substitute the right layer class for your model: `BertLayer`, `LlamaDecoderLayer`, `Qwen2DecoderLayer`, etc.). Without this FSDP sharding can silently misbehave.
- **Slower than DDP** for models that fit on a single GPU — only reach for FSDP when you actually need the memory savings.

DeepSpeed ZeRO-2/3 is an alternative with its own config; works identically at the `accelerate config` level.

## Effective batch size for contrastive losses

For `MultipleNegativesRankingLoss` and its variants, **batch size is a quality knob**, not just a speed knob. Bigger batches = more in-batch negatives = richer gradients.

The effective pool of in-batch negatives per anchor:

| Setup | In-batch negatives per anchor |
|---|---|
| Single GPU, batch 64 | 63 |
| 4× DDP, per-device batch 64 | 63 local only by default; 255 with `MultipleNegativesRankingLoss(model, gather_across_devices=True)` |
| Single GPU, CachedMNRL, mini_batch 32, batch 256 | 255 |
| 4× DDP, CachedMNRL, per-device 256 | 255 local; 1023 with `gather_across_devices=True` |

For large corpora (retrieval), push toward 512+ effective negatives. For small, clean datasets (STS), 64 is plenty.

## Precision choice by GPU

| GPU generation | Recommended |
|---|---|
| T4, V100, GTX 1xxx, RTX 2xxx | `fp16=True` |
| RTX 3xxx, A10G, A100, L4 | `bf16=True` |
| RTX 4xxx, H100, B200 | `bf16=True` (or fp8 on H100 via specific kernels — not default) |
| Apple M-series / ROCm | MPS/ROCm support is variable; `fp16` or `fp32` most reliable |

bf16 is more numerically stable and almost always preferred when available.

## Hugging Face Jobs flavor guide

Hugging Face Jobs requires a Pro/Team/Enterprise plan. Pricing is approximate and subject to change — see the [Jobs pricing page](https://huggingface.co/docs/huggingface_hub/guides/jobs).

| Flavor | Memory | Typical use | Est. $/hr |
|---|---|---|---|
| `cpu-basic` | ~2 GB | Dataset prep, validation, hard-neg mining (small) | <$0.10 |
| `cpu-upgrade` | ~4 GB | Same, slightly bigger | $0.10 |
| `t4-small` | 16 GB | Demos, MiniLM/DistilBERT with small batches | ~$0.75 |
| `t4-medium` | 16 GB | MiniLM / DistilBERT with larger batch | ~$1.50 |
| `l4x1` | 24 GB | BERT-base, MPNet, ModernBERT-base | ~$2.50 |
| `a10g-small` | 24 GB | BERT-base to BERT-large | ~$3.50 |
| `a10g-large` | 48 GB | ModernBERT-large, Qwen3-0.6B | ~$5.00 |
| `a10g-largex2` | 96 GB (2× 48GB) | Mid-size multi-GPU | ~$10 |
| `a100-large` | 80 GB | Large models or big contrastive batches | ~$10–12 |
| `h100` | 80 GB | Biggest single-GPU | ~$12 |
| `h100x8` | 640 GB | LLM-scale distributed | ~$96 |

Defaults by base model:
- MiniLM / DistilBERT -> `t4-small`
- BERT-base / MPNet / ModernBERT-base -> `a10g-small` or `l4x1`
- BERT-large / ModernBERT-large -> `a10g-large`
- Qwen3-0.6B decoder base -> `a10g-large`
- 1B+ decoder bases with LoRA -> `a10g-large` or `a100-large`

Always start one flavor **smaller** than you think you need: OOM on Jobs is cheap ($0.50–$5 for a failed run). Underprovisioned is better than overprovisioned for the first attempt. When budgeting `timeout`, add **20–30% buffer** for model loading, checkpoint saving, and Hub push.
