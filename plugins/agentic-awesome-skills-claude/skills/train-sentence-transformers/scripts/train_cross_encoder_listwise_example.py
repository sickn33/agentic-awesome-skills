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
"""CrossEncoder listwise training with LambdaLoss.

LambdaLoss is the state-of-the-art listwise ranking loss — it optimizes a
surrogate of nDCG via weighted pairwise comparisons over a per-query candidate
list. Use this when you have multiple candidates per query with graded
relevance, and you want a stronger ranker than pointwise BCE.

Data shape: `(query, [doc_1, ..., doc_K], [score_1, ..., score_K])` per row.
This script builds it via `mine_hard_negatives(..., output_format="labeled-list")`
starting from `(question, answer)` pairs: each row gets the positive plus K
hard negatives, with binary scores (1 for positive, 0 for negatives).

CRITICAL: `activation_fn=nn.Identity()` is mandatory for LambdaLoss / ListNet /
ListMLE / PListMLE / RankNet / MarginMSE / MSE — anything that's not
`BinaryCrossEntropyLoss` or `CrossEntropyLoss`. The default `Sigmoid` (with
`num_labels=1`) saturates raw logits >5 to ~1.0 inside `predict()`, silently
collapsing eval ranking. See `../references/troubleshooting.md` ("CrossEncoder
eval nDCG crashes after distillation / listwise / pairwise training").

OOM recovery for LambdaLoss: drop `mini_batch_size` first (chunking inside the
loss preserves the K-list semantic), then `per_device_train_batch_size` paired
with `gradient_accumulation_steps`, then reduce K (the per-query candidate-list
length) only as a last resort. Lowering K changes the experiment.

Run locally:
    pip install "sentence-transformers[train]>=5.0"
    python train_cross_encoder_listwise_example.py

Multi-GPU:
    accelerate launch train_cross_encoder_listwise_example.py

Hugging Face Jobs: paste this file's contents as the `script` in hf_jobs(...).
"""

from __future__ import annotations

import argparse
import logging
import os
from contextlib import nullcontext

import torch
import torch.nn as nn
from datasets import load_dataset, load_from_disk
from transformers import EarlyStoppingCallback

from sentence_transformers import (
    CrossEncoder,
    CrossEncoderModelCardData,
    CrossEncoderTrainer,
    CrossEncoderTrainingArguments,
    SentenceTransformer,
)
from sentence_transformers.base.evaluation import SequentialEvaluator
from sentence_transformers.cross_encoder.evaluation import (
    CrossEncoderNanoBEIREvaluator,
    CrossEncoderRerankingEvaluator,
)
from sentence_transformers.cross_encoder.losses import LambdaLoss
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


MODEL_NAME = "answerdotai/ModernBERT-base"
DATASET_NAME = "sentence-transformers/gooaq"
RETRIEVER_NAME = "sentence-transformers/static-retrieval-mrl-en-v1"
TRAIN_SIZE = 100_000
EVAL_SIZE = 1_000
NUM_NEGATIVES = 7  # K-1 negatives + 1 positive per row
EVAL_RERANK_DEPTH = 30  # candidates per query in the in-domain eval set
OUTPUT_DIR = "models/modernbert-gooaq-lambda"
RUN_NAME = "modernbert-gooaq-lambda"
HARD_NEG_CACHE = f"data/{RUN_NAME}-hard-negatives"
HARD_EVAL_CACHE = f"data/{RUN_NAME}-hard-eval"
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
        torch.set_float32_matmul_precision("high")


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
        activation_fn=nn.Identity(),  # Mandatory for LambdaLoss; Sigmoid would saturate eval logits.
        model_card_data=CrossEncoderModelCardData(
            language="en",
            license="apache-2.0",
            model_name=f"{MODEL_NAME.split('/')[-1]} reranker trained with LambdaLoss on GooAQ",
        ),
    )
    # ModernBERT defaults to max_seq_length=8192, which allocates activation memory
    # for 8192-token sequences regardless of input length. Pin to a (q, doc) cap.
    model.max_seq_length = 512

    full_dataset = load_dataset(DATASET_NAME, split="train").select(range(TRAIN_SIZE))
    split = full_dataset.train_test_split(test_size=EVAL_SIZE, seed=12)
    train_pairs, eval_pairs = split["train"], split["test"]

    if os.path.isdir(HARD_NEG_CACHE) and os.path.isdir(HARD_EVAL_CACHE):
        logging.info("Loading cached mined hard-negative datasets")
        hard_train = load_from_disk(HARD_NEG_CACHE)
        hard_eval = load_from_disk(HARD_EVAL_CACHE)
    else:
        logging.info(f"Mining hard negatives with {RETRIEVER_NAME}")
        retriever = SentenceTransformer(RETRIEVER_NAME)
        hard_train = mine_hard_negatives(
            train_pairs,
            retriever,
            num_negatives=NUM_NEGATIVES,
            range_min=10,
            range_max=100,
            sampling_strategy="top",
            output_format="labeled-list",  # Listwise: (query, [docs], [scores])
            use_faiss=True,
            batch_size=4096,
        )
        hard_eval = mine_hard_negatives(
            eval_pairs,
            retriever,
            corpus=full_dataset["answer"],
            num_negatives=EVAL_RERANK_DEPTH,
            output_format="n-tuple",
            use_faiss=True,
            batch_size=4096,
        )
        hard_train.save_to_disk(HARD_NEG_CACHE)
        hard_eval.save_to_disk(HARD_EVAL_CACHE)
        del retriever
        torch.cuda.empty_cache()
    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed mined datasets; will run max_steps=1 and skip Hub push")
        hard_train = hard_train.select(range(min(50, len(hard_train))))
        hard_eval = hard_eval.select(range(min(20, len(hard_eval))))
    logging.info(f"  train: {len(hard_train):,} rows | columns: {hard_train.column_names}")

    loss = LambdaLoss(model=model, mini_batch_size=16)  # mini_batch_size: drop first if OOM

    nano_beir = CrossEncoderNanoBEIREvaluator(dataset_names=["msmarco", "nfcorpus", "nq"])
    # Pure reranker quality: positive is in `documents` and `always_rerank_positives=True` (default).
    in_domain = CrossEncoderRerankingEvaluator(
        samples=[
            {
                "query": row["question"],
                "positive": [row["answer"]],
                "documents": [row["answer"]] + [row[col] for col in hard_eval.column_names[2:]],
            }
            for row in hard_eval
        ],
        batch_size=64,
        name="gooaq-dev",
    )
    evaluator = SequentialEvaluator([in_domain, nano_beir])
    logging.info("Baseline evaluation:")
    with autocast_ctx():
        baseline_eval = evaluator(model)[in_domain.primary_metric]

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
        metric_for_best_model=f"eval_{in_domain.primary_metric}",  # in-domain reranker > NanoBEIR
        greater_is_better=True,
        report_to="none" if SMOKE_TEST else "trackio",
        run_name=RUN_NAME,
        seed=12,
    )

    trainer = CrossEncoderTrainer(
        model=model,
        args=args,
        train_dataset=hard_train,
        loss=loss,
        evaluator=evaluator,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )
    if not SMOKE_TEST:
        log_trackio_dashboard()
    trainer.train()

    logging.info("Post-training evaluation:")
    with autocast_ctx():
        score = evaluator(model)[in_domain.primary_metric]
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
