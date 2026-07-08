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
"""Matryoshka (MRL) training: train once, deploy at multiple embedding dimensions.

MatryoshkaLoss wraps a base loss and optimizes it at several truncated dimensions
simultaneously. At inference, load with `truncate_dim=<target>` to get that size
with ~95% of full-dim quality.

Typical use: train at [768, 512, 256, 128, 64], deploy at 128 for 6x smaller
index + 6x faster ANN with minimal quality loss.

Run locally:
    pip install "sentence-transformers[train]>=5.0"
    python train_sentence_transformer_matryoshka_example.py
"""

from __future__ import annotations

import argparse
import logging
import os
from contextlib import nullcontext

import torch
from datasets import load_dataset

from sentence_transformers import (
    SentenceTransformer,
    SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
)
from sentence_transformers.base.sampler import BatchSamplers
from sentence_transformers.sentence_transformer.evaluation import (
    EmbeddingSimilarityEvaluator,
    NanoBEIREvaluator,
    SequentialEvaluator,
)
from sentence_transformers.sentence_transformer.losses import MatryoshkaLoss, MultipleNegativesRankingLoss
from sentence_transformers.util.similarity import SimilarityFunction


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
MATRYOSHKA_DIMS = [768, 512, 256, 128, 64]
OUTPUT_DIR = "models/mpnet-matryoshka"
RUN_NAME = "mpnet-matryoshka"
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

    model = SentenceTransformer(MODEL_NAME)

    train_size = 50 if SMOKE_TEST else 50_000
    eval_size = 20 if SMOKE_TEST else 1_000
    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed dataset; will run max_steps=1 and skip Hub push")
    train_dataset = load_dataset("sentence-transformers/all-nli", "triplet", split="train").select(range(train_size))
    eval_dataset = load_dataset("sentence-transformers/all-nli", "triplet", split="dev").select(range(eval_size))

    inner_loss = MultipleNegativesRankingLoss(model)
    loss = MatryoshkaLoss(model, inner_loss, matryoshka_dims=MATRYOSHKA_DIMS)

    stsb = load_dataset("sentence-transformers/stsb", split="validation")
    per_dim_evaluators = [
        EmbeddingSimilarityEvaluator(
            sentences1=stsb["sentence1"],
            sentences2=stsb["sentence2"],
            scores=stsb["score"],
            main_similarity=SimilarityFunction.COSINE,
            name=f"sts-dev-{dim}",
            truncate_dim=dim,
        )
        for dim in MATRYOSHKA_DIMS
    ]
    evaluator = SequentialEvaluator(
        [*per_dim_evaluators, NanoBEIREvaluator()],
        main_score_function=lambda scores: scores[0],
    )
    logging.info("Baseline evaluation (before training):")
    with autocast_ctx():
        # Must run before deriving metric_key: each sub-evaluator mutates its primary_metric to add the name_ prefix.
        baseline_result = evaluator(model)
    # Drive on the first per-dim evaluator's metric (matches main_score_function above).
    metric_key = f"eval_{per_dim_evaluators[0].primary_metric}"
    baseline_eval = baseline_result[per_dim_evaluators[0].primary_metric]

    args = SentenceTransformerTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=1,
        max_steps=1 if SMOKE_TEST else -1,
        per_device_train_batch_size=128,
        per_device_eval_batch_size=128,
        learning_rate=2e-5,
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
        score = evaluator(model)[per_dim_evaluators[0].primary_metric]
    delta = score - baseline_eval
    verdict = "WIN" if delta >= 0.005 else "MARGINAL" if delta >= 0 else "REGRESSION"
    logging.info(f"VERDICT: {verdict} | score={score:.4f} | baseline={baseline_eval:.4f} | delta={delta:+.4f}")

    final_dir = f"{OUTPUT_DIR}/final"
    model.save_pretrained(final_dir)
    logging.info(f"Saved to {final_dir}")
    logging.info(f"To use at a specific dimension, load with: SentenceTransformer({final_dir!r}, truncate_dim=128)")

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
