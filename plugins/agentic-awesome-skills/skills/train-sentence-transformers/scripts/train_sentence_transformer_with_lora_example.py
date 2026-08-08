#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "sentence-transformers[train]>=5.0",
#     "peft>=0.7.0",
#     "datasets>=2.19.0",
#     "accelerate>=0.26.0",
#     "trackio",
# ]
# ///
"""LoRA / PEFT adapter training: memory-efficient fine-tuning.

Instead of training all parameters, LoRA injects small low-rank adapter
matrices and trains only those (~50-100x fewer trainable params). Works out
of the box with sentence-transformers via `peft`.

Use LoRA when: the base is a large decoder (Qwen3, Llama, Mistral, Gemma) and
a full fine-tune is VRAM-prohibitive; you want multiple task-specific adapters
on one base; you're nudging an existing strong retriever (E5-mistral,
Qwen3-Embedding) on domain data. Skip LoRA for small encoders (BERT-base,
MiniLM — full fine-tune is tractable and usually better) or tiny datasets
(<1k pairs — adapter rank becomes the bottleneck).

This template defaults to BERT-base for portability. Swap `MODEL_NAME` to a
decoder backbone for the use case LoRA actually shines on.

Architecture variants:
- Bi-encoder (this script): `TaskType.FEATURE_EXTRACTION`.
- Sparse-encoder: same pattern; `SparseEncoder` supports `add_adapter`. See
  `examples/sparse_encoder/training/peft/train_splade_gooaq_peft.py`.
- Cross-encoder: use `TaskType.SEQ_CLS` for `num_labels >= 1`. Community
  examples are sparse; smoke-test with `max_steps=1` first.

Key hyperparameters:
- `r` (rank): 8-128. Bigger = more capacity + memory. 64 is a strong default.
- `lora_alpha`: typically 2 x r (some teams use 1 x r for stability).
- `lora_dropout`: 0.05-0.1; raise to 0.1 for small datasets.
- `target_modules=None` auto-picks attention modules; pass
  `["q_proj", "k_proj", "v_proj", "o_proj"]` (attention) or
  `["gate_proj", "up_proj", "down_proj"]` (MLP) for explicit control.
- `modules_to_save=["pooler"]` for CLS-pooled bases — the pooler Dense should
  be trained too, not adapted.
- LR is HIGHER than full fine-tune: 1e-4 to 5e-4 for LoRA vs. 2e-5 full.

Rough memory savings on a 0.6B base (bf16, batch 64, seq 128): full fine-tune
~24 GB, LoRA r=64 ~10 GB (~12M trainable, 2%), LoRA r=16 ~8 GB (~3M, 0.5%).
Bigger savings on 7B+ models.

Saving / sharing: `model.save_pretrained("dir")` writes ONLY the adapter (few
MB) plus a reference to the base model. Loaders call the same one-liner;
`peft` is invoked and the base downloaded on demand. For a merged model that
loads without `peft` (needed for vLLM-style servers), call
`model.transformers_model.merge_and_unload()` then `save_pretrained` /
`push_to_hub`.

Swapping adapters at inference (the main multi-task deployment win):
    model = SentenceTransformer("base-model")
    model.load_adapter("adapter-a", adapter_name="a")
    model.load_adapter("adapter-b", adapter_name="b")
    model.set_adapter("a"); emb_a = model.encode([...])

QLoRA (4-bit base + LoRA) for 7B+ on consumer GPUs:
    from transformers import BitsAndBytesConfig
    bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                             bnb_4bit_compute_dtype=torch.bfloat16)
    model = SentenceTransformer("Qwen/Qwen3-Embedding-7B",
                                 model_kwargs={"quantization_config": bnb})
    model.add_adapter(LoraConfig(r=64, lora_alpha=128, ...))
`pip install bitsandbytes` first. Linux-only for bitsandbytes (Windows: the
fork or WSL).

Known issues:
- LoRA PEFT on Qwen2.5-VL / paligemma / gemma3 / internvl / aya_vision under
  transformers v5: `AutoModel.from_pretrained(peft_path)` crashes with
  `KeyError: 'qwen2_vl'`. Pin transformers to 4.x or wait for the upstream fix.
- `gradient_checkpointing=True` + LoRA: usually works; if you hit "None of
  the inputs have requires_grad=True", call
  `model.transformers_model.enable_input_require_grads()` after `add_adapter`.
- `add_adapter` before pooling: when building from scratch (not loading a
  pre-assembled checkpoint), call `add_adapter` AFTER
  `SentenceTransformer(modules=[...])` is complete.

Common gotchas: LR still at 2e-5 (LoRA needs higher); forgetting to merge for
vLLM-style servers (they don't load `peft`); `r=8` too small for retrievers
trained on millions of pairs (try 32 or 64); `modules_to_save` missing the
pooler on CLS-pooled bases.
"""

from __future__ import annotations

import argparse
import logging
import os
from contextlib import nullcontext

import torch
from datasets import load_dataset
from peft import LoraConfig, TaskType

from sentence_transformers import (
    SentenceTransformer,
    SentenceTransformerModelCardData,
    SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
)
from sentence_transformers.base.sampler import BatchSamplers
from sentence_transformers.sentence_transformer.evaluation import NanoBEIREvaluator
from sentence_transformers.sentence_transformer.losses import CachedMultipleNegativesRankingLoss


def autocast_ctx():
    """bf16/fp16 autocast for evaluator calls outside the trainer (which has its own autocast)."""
    if not torch.cuda.is_available():
        return nullcontext()
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    return torch.autocast("cuda", dtype=dtype)


def log_trackio_dashboard():
    """Surface the Trackio dashboard URL so the user can watch training live."""
    try:
        from huggingface_hub import whoami

        hf_user = whoami().get("name")
        if hf_user:
            logging.info(
                f"Trackio dashboard (live training progress): https://huggingface.co/spaces/{hf_user}/trackio"
            )
    except Exception:
        pass


MODEL_NAME = "google-bert/bert-base-uncased"
OUTPUT_DIR = "models/bert-base-gooaq-lora"
RUN_NAME = "bert-base-gooaq-lora"
SMOKE_TEST = os.environ.get("SMOKE_TEST") == "1"


def setup_logging():
    """Configure logging + TF32. Tees to logs/{RUN_NAME}.log and silences HTTP spam."""
    os.makedirs("logs", exist_ok=True)
    logging.basicConfig(
        format="%(asctime)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        level=logging.INFO,
        handlers=[logging.StreamHandler(), logging.FileHandler(f"logs/{RUN_NAME}.log")],
        force=True,
    )
    for noisy in ("httpx", "httpcore", "huggingface_hub", "urllib3", "filelock", "fsspec"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
    if torch.cuda.is_available():
        torch.set_float32_matmul_precision("high")  # TF32 on Ampere+, no quality loss


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--eval-only", type=str, default=None, help="Skip training; load this saved model and run only the evaluator."
    )
    cli, _ = parser.parse_known_args()

    setup_logging()

    if cli.eval_only:
        logging.info(f"Eval-only mode: loading model from {cli.eval_only}")
        model = SentenceTransformer(cli.eval_only)
        evaluator = NanoBEIREvaluator()
        with autocast_ctx():
            evaluator(model)
        return

    model = SentenceTransformer(
        MODEL_NAME,
        model_card_data=SentenceTransformerModelCardData(
            language="en",
            license="apache-2.0",
            model_name=f"{MODEL_NAME.split('/')[-1]} LoRA adapter on GooAQ",
        ),
    )

    peft_config = LoraConfig(
        task_type=TaskType.FEATURE_EXTRACTION,
        inference_mode=False,
        r=64,
        lora_alpha=128,
        lora_dropout=0.1,
    )
    model.add_adapter(peft_config)
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    logging.info(f"trainable params: {trainable:,} / {total:,} ({100 * trainable / total:.2f}%)")

    full = load_dataset("sentence-transformers/gooaq", split="train")
    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed dataset; will run max_steps=1 and skip Hub push")
        full = full.select(range(min(200, len(full))))
    eval_size = 20 if SMOKE_TEST else 10_000
    train_cap = 50 if SMOKE_TEST else 500_000
    split = full.train_test_split(test_size=eval_size, seed=12)
    train_dataset = split["train"].select(range(min(train_cap, len(split["train"]))))
    eval_dataset = split["test"]
    logging.info(f"train={len(train_dataset):,} eval={len(eval_dataset):,}")

    loss = CachedMultipleNegativesRankingLoss(model, mini_batch_size=32)

    evaluator = NanoBEIREvaluator()
    logging.info("Baseline:")
    with autocast_ctx():
        # Must run before deriving metric_key: evaluator(model) mutates primary_metric to add the name_ prefix.
        baseline_eval = evaluator(model)[evaluator.primary_metric]
    metric_key = f"eval_{evaluator.primary_metric}"

    args = SentenceTransformerTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=1,
        max_steps=1 if SMOKE_TEST else -1,
        per_device_train_batch_size=512,
        per_device_eval_batch_size=512,
        learning_rate=1e-4,
        weight_decay=0.01,
        warmup_steps=0.1,
        bf16=True,
        batch_sampler=BatchSamplers.NO_DUPLICATES,
        eval_strategy="steps",
        eval_steps=0.1,
        save_strategy="steps",
        save_steps=0.1,
        save_total_limit=2,
        logging_steps=0.01,
        logging_first_step=True,
        load_best_model_at_end=True,
        metric_for_best_model=metric_key,
        greater_is_better=True,
        report_to="none" if SMOKE_TEST else "trackio",
        run_name=RUN_NAME,
        seed=12,
    )

    trainer = SentenceTransformerTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        loss=loss,
        evaluator=evaluator,
    )
    if not SMOKE_TEST:
        log_trackio_dashboard()
    trainer.train()

    logging.info("Post-training evaluation:")
    with autocast_ctx():
        score = evaluator(model)[evaluator.primary_metric]
    delta = score - baseline_eval
    verdict = "WIN" if delta >= 0.005 else "MARGINAL" if delta >= 0 else "REGRESSION"
    logging.info(f"VERDICT: {verdict} | score={score:.4f} | baseline={baseline_eval:.4f} | delta={delta:+.4f}")

    model.save_pretrained(f"{OUTPUT_DIR}/final")

    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: skipping Hub push")
        return

    try:
        commit_url = model.push_to_hub(RUN_NAME)
        logging.info(f"Pushed model to {commit_url.rsplit('/commit/', 1)[0]}")
    except Exception:
        import traceback

        logging.error(f"Hub push failed:\n{traceback.format_exc()}")


if __name__ == "__main__":
    main()
