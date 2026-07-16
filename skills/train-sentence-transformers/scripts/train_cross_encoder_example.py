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
"""Production-ready cross-encoder (reranker) training template.

Demonstrates:
- BinaryCrossEntropyLoss on (query, passage, label) pointwise data
- Hard-negative mining (`mine_hard_negatives` with `output_format="labeled-pair"`)
  to produce the labeled training data BCE needs, starting from (question, answer)
  pairs
- `pos_weight=num_negatives` to offset the positive/negative imbalance
- CrossEncoderNanoBEIREvaluator for retrieval reranking metrics
- load_best_model_at_end on the retrieval metric
- Auto model card + optional Hub push

Run locally:
    pip install "sentence-transformers[train]>=5.0"
    python train_cross_encoder_example.py

Multi-GPU:
    accelerate launch train_cross_encoder_example.py

Hugging Face Jobs: paste this file's contents as the `script` in hf_jobs(...).
"""

from __future__ import annotations

import argparse
import logging
import os
from contextlib import nullcontext

import torch
from datasets import load_dataset, load_from_disk
from transformers import EarlyStoppingCallback

from sentence_transformers import (
    CrossEncoder,
    CrossEncoderModelCardData,
    CrossEncoderTrainer,
    CrossEncoderTrainingArguments,
    SentenceTransformer,
)
from sentence_transformers.cross_encoder.evaluation import CrossEncoderNanoBEIREvaluator
from sentence_transformers.cross_encoder.losses import BinaryCrossEntropyLoss
from sentence_transformers.util import mine_hard_negatives


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


MODEL_NAME = "microsoft/MiniLM-L12-H384-uncased"
DATASET_NAME = "sentence-transformers/gooaq"
RETRIEVER_NAME = "sentence-transformers/static-retrieval-mrl-en-v1"
TRAIN_SIZE = 100_000
EVAL_SIZE = 1_000
NUM_NEGATIVES = 5
OUTPUT_DIR = "models/minilm-gooaq-ce"
RUN_NAME = "minilm-gooaq-ce"
HARD_NEG_CACHE = f"data/{RUN_NAME}-hard-negatives"  # delete this dir to remine
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
        model = CrossEncoder(cli.eval_only)
        evaluator = CrossEncoderNanoBEIREvaluator(dataset_names=["msmarco", "nfcorpus", "nq"])
        with autocast_ctx():
            evaluator(model)
        return

    logging.info(f"Loading base model: {MODEL_NAME}")
    model = CrossEncoder(
        MODEL_NAME,
        num_labels=1,
        model_card_data=CrossEncoderModelCardData(
            language="en",
            license="apache-2.0",
            model_name=f"{MODEL_NAME.split('/')[-1]} reranker finetuned on GooAQ",
        ),
    )

    logging.info(f"Loading dataset: {DATASET_NAME}")
    train_size = 50 if SMOKE_TEST else TRAIN_SIZE
    eval_size = 20 if SMOKE_TEST else EVAL_SIZE
    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed dataset; will run max_steps=1 and skip Hub push")
    pairs = load_dataset(DATASET_NAME, split="train").select(range(train_size + eval_size))

    if os.path.isdir(HARD_NEG_CACHE):
        logging.info(f"Loading cached mined hard negatives from {HARD_NEG_CACHE}")
        labeled = load_from_disk(HARD_NEG_CACHE)
    else:
        logging.info(f"Mining hard negatives with {RETRIEVER_NAME}")
        retriever = SentenceTransformer(RETRIEVER_NAME)
        labeled = mine_hard_negatives(
            dataset=pairs,
            model=retriever,
            num_negatives=NUM_NEGATIVES,
            range_min=10,  # skip the top-10 (likely to contain true positives)
            range_max=100,
            sampling_strategy="top",
            output_format="labeled-pair",
            use_faiss=True,
        )
        labeled.save_to_disk(HARD_NEG_CACHE)
        logging.info(f"Saved mined dataset to {HARD_NEG_CACHE} (delete to remine)")
        del retriever
        torch.cuda.empty_cache()
    # EVAL_SIZE here counts labeled-pair rows, not distinct queries: each
    # query contributes 1 positive + NUM_NEGATIVES negatives, so e.g. 1000
    # rows is approximately 1000 / (1 + NUM_NEGATIVES) distinct queries.
    split = labeled.train_test_split(test_size=eval_size, seed=12)
    train_dataset = split["train"]
    eval_dataset = split["test"]
    logging.info(f"  train: {len(train_dataset):,} rows | eval: {len(eval_dataset):,} rows")
    logging.info(f"  columns: {train_dataset.column_names}")

    # pos_weight = negatives / positives, derived from the actual label distribution
    # so it stays correct if rows get filtered or the mining ratio drifts.
    n_pos = sum(1 for label in train_dataset["label"] if label > 0.5)
    n_neg = len(train_dataset) - n_pos
    pos_weight_value = n_neg / max(n_pos, 1)
    logging.info(f"  positives: {n_pos:,} | negatives: {n_neg:,} | pos_weight: {pos_weight_value:.2f}")
    loss = BinaryCrossEntropyLoss(model, pos_weight=torch.tensor(pos_weight_value))

    evaluator = CrossEncoderNanoBEIREvaluator(dataset_names=["msmarco", "nfcorpus", "nq"])
    logging.info("Baseline evaluation:")
    with autocast_ctx():
        # Must run before deriving metric_key: evaluator(model) mutates primary_metric to add the name_ prefix.
        baseline_eval = evaluator(model)[evaluator.primary_metric]
    metric_key = f"eval_{evaluator.primary_metric}"

    args = CrossEncoderTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=1,
        max_steps=1 if SMOKE_TEST else -1,
        per_device_train_batch_size=64,
        per_device_eval_batch_size=64,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_steps=0.1,
        lr_scheduler_type="linear",
        bf16=True,
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

    # EarlyStoppingCallback earns its keep for cross-encoders: CE rerankers
    # typically peak mid-training and then degrade, so stopping at the best
    # eval checkpoint is load-bearing (unlike bi-encoders, which tend to
    # plateau rather than regress).
    trainer = CrossEncoderTrainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        loss=loss,
        evaluator=evaluator,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
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
