#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "sentence-transformers[train]>=5.0",
#     "datasets>=2.19.0",
#     "accelerate>=0.26.0",
#     "trackio",
# ]
# ///
"""Production-ready sparse-encoder (SPLADE) training template.

Demonstrates:
- SpladeLoss wrapping SparseMultipleNegativesRankingLoss
- FLOPS regularization (`query_regularizer_weight` / `document_regularizer_weight`)
- SparseNanoBEIREvaluator for sparse retrieval metrics
- load_best_model_at_end on the retrieval metric

Base model must expose a masked-LM head; any `AutoModelForMaskedLM`-compatible
checkpoint works (DistilBERT, BERT, MiniLM MLM variants, existing SPLADE models).

Run locally:
    pip install "sentence-transformers[train]>=5.0"
    python train_sparse_encoder_example.py

Multi-GPU:
    accelerate launch train_sparse_encoder_example.py

Hugging Face Jobs: paste this file's contents as the `script` in hf_jobs(...).
"""

from __future__ import annotations

import argparse
import logging
import os
from contextlib import nullcontext

import torch
from datasets import load_dataset

from sentence_transformers import (
    SparseEncoder,
    SparseEncoderModelCardData,
    SparseEncoderTrainer,
    SparseEncoderTrainingArguments,
)
from sentence_transformers.base.sampler import BatchSamplers
from sentence_transformers.sparse_encoder.evaluation import SparseNanoBEIREvaluator
from sentence_transformers.sparse_encoder.losses import (
    SparseMultipleNegativesRankingLoss,
    SpladeLoss,
)


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


MODEL_NAME = "distilbert/distilbert-base-uncased"
DATASET_NAME = "sentence-transformers/gooaq"
TRAIN_SIZE = 100_000
EVAL_SIZE = 1_000
OUTPUT_DIR = "models/distilbert-splade-gooaq"
RUN_NAME = "distilbert-splade-gooaq"

QUERY_REGULARIZER_WEIGHT = 5e-5
DOCUMENT_REGULARIZER_WEIGHT = 3e-5
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
        model = SparseEncoder(cli.eval_only)
        evaluator = SparseNanoBEIREvaluator(dataset_names=["msmarco", "nfcorpus", "nq"])
        with autocast_ctx():
            evaluator(model)
        return

    logging.info(f"Loading base model: {MODEL_NAME}")
    # Prompts are optional for SPLADE: most BERT-style MLM bases don't need them.
    # If you're starting from a CSR (`Transformer + Pooling + SparseAutoEncoder`)
    # base like `tomaarsen/csr-mxbai-embed-large-v1-nq` that *was* trained with
    # prompts, mirror them here to preserve quality:
    #   prompts={"query": "Represent this sentence for similarity: ", "document": ""},
    #   default_prompt_name="document",
    model = SparseEncoder(
        MODEL_NAME,
        model_card_data=SparseEncoderModelCardData(
            language="en",
            license="apache-2.0",
            model_name=f"SPLADE from {MODEL_NAME.split('/')[-1]} trained on GooAQ",
        ),
    )

    logging.info(f"Loading dataset: {DATASET_NAME}")
    train_size = 50 if SMOKE_TEST else TRAIN_SIZE
    eval_size = 20 if SMOKE_TEST else EVAL_SIZE
    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed dataset; will run max_steps=1 and skip Hub push")
    full = load_dataset(DATASET_NAME, split="train")
    split = full.train_test_split(test_size=eval_size, seed=12)
    train_dataset = split["train"].select(range(min(train_size, len(split["train"]))))
    eval_dataset = split["test"]
    logging.info(f"  train: {len(train_dataset):,} rows | eval: {len(eval_dataset):,} rows")
    logging.info(f"  columns: {train_dataset.column_names}")

    loss = SpladeLoss(
        model=model,
        loss=SparseMultipleNegativesRankingLoss(model=model),
        query_regularizer_weight=QUERY_REGULARIZER_WEIGHT,
        document_regularizer_weight=DOCUMENT_REGULARIZER_WEIGHT,
    )

    evaluator = SparseNanoBEIREvaluator(dataset_names=["msmarco", "nfcorpus", "nq"])
    logging.info("Baseline evaluation:")
    with autocast_ctx():
        # Must run before deriving metric_key: evaluator(model) mutates primary_metric to add the name_ prefix.
        baseline_result = evaluator(model)
        baseline_eval = baseline_result[evaluator.primary_metric]
    metric_key = f"eval_{evaluator.primary_metric}"

    args = SparseEncoderTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=1,
        max_steps=1 if SMOKE_TEST else -1,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=32,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_steps=0.1,
        lr_scheduler_type="linear",
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

    trainer = SparseEncoderTrainer(
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
        result = evaluator(model)
        score = result[evaluator.primary_metric]
    delta = score - baseline_eval
    verdict = "WIN" if delta >= 0.005 else "MARGINAL" if delta >= 0 else "REGRESSION"
    # Active-dim keys come back name-prefixed (e.g. "NanoBEIR_..._query_active_dims"); suffix-match for compat.
    qad = next((v for k, v in result.items() if k.endswith("query_active_dims")), "n/a")
    cad = next((v for k, v in result.items() if k.endswith("corpus_active_dims")), "n/a")
    logging.info(
        f"VERDICT: {verdict} | score={score:.4f} | baseline={baseline_eval:.4f} | delta={delta:+.4f} "
        f"| query_active={qad} corpus_active={cad}"
    )

    final_dir = f"{OUTPUT_DIR}/final"
    model.save_pretrained(final_dir)
    logging.info(f"Saved final model to {final_dir}")

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
