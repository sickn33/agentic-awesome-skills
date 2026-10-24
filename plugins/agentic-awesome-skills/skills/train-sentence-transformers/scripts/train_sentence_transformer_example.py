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
"""Adaptable example bi-encoder (SentenceTransformer) training template.

This script demonstrates a recommended setup:
- MultipleNegativesRankingLoss on (anchor, positive, negative) triplets
- NanoBEIREvaluator for retrieval metrics during training
- BatchSamplers.NO_DUPLICATES (critical for MNRL)
- load_best_model_at_end with a retrieval metric
- Auto model card + optional Hub push

Runs identically in two modes:

    # Local
    pip install "sentence-transformers[train]>=5.0"
    python train_sentence_transformer_example.py

    # Or with uv (no explicit install needed)
    uv run train_sentence_transformer_example.py

    # Multi-GPU
    accelerate launch train_sentence_transformer_example.py

    # Hugging Face Jobs (paste the entire file contents as `script`)
    hf_jobs("uv", {
        "script": "<contents of this file>",
        "flavor": "a10g-large",
        "timeout": "3h",
        "secrets": {"HF_TOKEN": "$HF_TOKEN"},
    })

Adjust MODEL_NAME, DATASET_NAME, OUTPUT_DIR, RUN_NAME at the top of the script.
This AAS adaptation saves locally only. Publication and Jobs are separate reviewed actions.
Copy the sibling training_safety.py with this template; audit cached revisions first.
"""

from __future__ import annotations

# AAS adaptation: local-only explicit run gate; no automatic publication or telemetry.
import os as _offline_env
_offline_env.environ["HF_HUB_OFFLINE"] = "1"
_offline_env.environ["HF_DATASETS_OFFLINE"] = "1"
_offline_env.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
from training_safety import prepare_run, safe_model, load_dataset, group_split

import argparse
import logging
import os
from contextlib import nullcontext

import torch

from sentence_transformers import (
    SentenceTransformer,
    SentenceTransformerModelCardData,
    SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
)
from sentence_transformers.base.sampler import BatchSamplers
from sentence_transformers.sentence_transformer.evaluation import NanoBEIREvaluator
from sentence_transformers.sentence_transformer.losses import MultipleNegativesRankingLoss


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


MODEL_NAME = "microsoft/mpnet-base"
DATASET_NAME = "sentence-transformers/all-nli"
DATASET_SUBSET = "triplet"
TRAIN_SIZE = 50_000
EVAL_SIZE = 1_000
OUTPUT_DIR = "models/mpnet-base-all-nli"
RUN_NAME = "mpnet-base-all-nli"
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
        torch.set_float32_matmul_precision("high")  # TF32 changes numerical precision; benchmark on this task.


def main() -> None:
    prepare_run()
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--eval-only", type=str, default=None, help="Skip training; load this saved model and run only the evaluator."
    )
    cli, _ = parser.parse_known_args()

    setup_logging()

    if cli.eval_only:
        logging.info(f"Eval-only mode: loading model from {cli.eval_only}")
        model = safe_model(SentenceTransformer, cli.eval_only)
        evaluator = NanoBEIREvaluator()
        with autocast_ctx():
            evaluator(model)
        return

    logging.info(f"Loading base model: {MODEL_NAME}")
    model = safe_model(SentenceTransformer,
        MODEL_NAME,
        model_card_data=SentenceTransformerModelCardData(
            language="en",
            license="apache-2.0",
            model_name=f"{MODEL_NAME.split('/')[-1]} finetuned on AllNLI",
        ),
    )

    logging.info(f"Loading dataset: {DATASET_NAME} ({DATASET_SUBSET})")
    train_size = 50 if SMOKE_TEST else TRAIN_SIZE
    eval_size = 20 if SMOKE_TEST else min(EVAL_SIZE, 40)
    train_dataset = load_dataset(DATASET_NAME, DATASET_SUBSET, split="train").select(range(min(train_size, int(os.environ.get("ST_MAX_ROWS", "200")))))
    eval_dataset = load_dataset(DATASET_NAME, DATASET_SUBSET, split="dev").select(range(min(eval_size, int(os.environ.get("ST_MAX_ROWS", "200")))))
    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed dataset; will run max_steps=1 and skip Hub push")
    logging.info(f"  train: {len(train_dataset):,} examples")
    logging.info(f"  eval:  {len(eval_dataset):,} examples")

    loss = MultipleNegativesRankingLoss(model)

    evaluator = NanoBEIREvaluator()
    logging.info("Baseline evaluation (before training):")
    with autocast_ctx():
        # Must run before deriving metric_key: evaluator(model) mutates primary_metric to add the name_ prefix.
        baseline_eval = evaluator(model)[evaluator.primary_metric]
    metric_key = f"eval_{evaluator.primary_metric}"

    args = SentenceTransformerTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=1,
        max_steps=1 if SMOKE_TEST else int(os.environ["ST_MAX_STEPS"]),
        per_device_train_batch_size=64,
        per_device_eval_batch_size=64,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_steps=0,
        lr_scheduler_type="linear",
        bf16=torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
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
        report_to="none",
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

    trainer.train()

    logging.info("Post-training evaluation:")
    with autocast_ctx():
        score = evaluator(model)[evaluator.primary_metric]
    delta = score - baseline_eval
    verdict = "SMOKE_ONLY" if SMOKE_TEST else "OBSERVED_GAIN" if delta >= 0.005 else "MARGINAL" if delta >= 0 else "REGRESSION"
    logging.info(f"VERDICT: {verdict} | score={score:.4f} | baseline={baseline_eval:.4f} | delta={delta:+.4f}")

    final_dir = f"{OUTPUT_DIR}/final"
    model.save_pretrained(final_dir)
    logging.info(f"Saved final model to {final_dir}")

    logging.info("Saved locally; publication is a separate explicitly authorized action.")


if __name__ == "__main__":
    main()
