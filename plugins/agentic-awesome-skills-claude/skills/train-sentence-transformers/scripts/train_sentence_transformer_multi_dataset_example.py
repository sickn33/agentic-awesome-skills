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
"""Multi-dataset / multi-task training: train one model on several datasets at once.

Pass `train_dataset` (and optionally `eval_dataset`) as dicts. Pass `loss` as
either a dict keyed by the same names (one loss per dataset, this script's
default — Variant A) or a single loss instance applied to every dataset
(Variant B). Dict keys are arbitrary but must match exactly across all three
dicts; they show up in log output as `loss_all-nli=...`, `loss_stsb=...`.

Three reasons to use multi-dataset training:
- Multi-task: combine datasets with different signals (retrieval + STS +
  classification) into a single general-purpose embedder.
- Data augmentation: add a supplementary dataset (STS labels alongside your
  main retrieval pairs) as a regularizer.
- Domain coverage: train on several domains at once rather than sequentially.

Variant A (this script): different shapes per dataset, so each needs its own
matching loss. Pass `loss` as a dict; the trainer dispatches per-dataset and
mixing loss arities (MNRL with 3 inputs + CoSENTLoss with 2+label) is fine.

Variant B: same shape, same loss, but you want each mini-batch drawn from a
single domain (so MNRL in-batch negatives stay in-domain and remain genuinely
hard). Pass ONE loss and a dict of datasets:

    train_datasets = {"medical": medical_pairs, "legal": legal_pairs, "code": code_pairs}
    loss = MultipleNegativesRankingLoss(model)
    trainer = SentenceTransformerTrainer(model=model, args=args,
        train_dataset=train_datasets, loss=loss, ...)

The multi-dataset batch sampler draws each batch from a single dataset, so a
3-domain MNRL run gets in-domain negatives by construction. Counter-intuitive
benefit: DatasetDict can outperform `concatenate_datasets` even with losses
that don't share across the batch (e.g. LambdaLoss in cross-encoder training).

Multi-dataset samplers:
- `PROPORTIONAL` (default): sample from each dataset in proportion to its size.
  Every row is seen ~once per epoch. Bias toward the largest dataset.
- `ROUND_ROBIN`: alternate evenly; training stops when the SMALLEST is
  exhausted. Equal screen-time per task.
Common pattern: `PROPORTIONAL` for 1 epoch, then `ROUND_ROBIN` for a second
if a smaller task's loss is still decreasing.

Per-dataset prompts (bi-encoder, sparse-encoder): pass `prompts={"all-nli": "",
"stsb": "Represent ...: ", "msmarco": {"query": "query: ", "positive":
"passage: ", ...}}` to TrainingArguments. The nested per-column form works for
bi-encoder and sparse-encoder; cross-encoders support single-value or
per-dataset only. See `../references/prompts_and_instructions.md`.

Eval metric aggregation: with a dict `eval_dataset`, each dataset's loss is
logged separately (`eval_loss_all-nli`, `eval_loss_stsb`). The evaluator runs
on the full model, so its metrics aren't per-dataset unless you wrap a
`SequentialEvaluator` with per-dataset sub-evaluators. Set
`metric_for_best_model` to a single evaluator metric, NOT a per-dataset loss.

Gotchas: keys must match EXACTLY across all three dicts (train/eval/loss) or
training fails at step 0; `NO_DUPLICATES` + `PROPORTIONAL` works (deduplicates
within each batch regardless of source dataset); `ROUND_ROBIN` with uneven
dataset sizes means `num_train_epochs=N` is N passes over the SMALLEST — use
`PROPORTIONAL` or `max_steps` if you want N passes over the largest.
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
)
from sentence_transformers.sentence_transformer.losses import (
    CoSENTLoss,
    MultipleNegativesRankingLoss,
)
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


RUN_NAME = "mpnet-nli-stsb"
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

    model = SentenceTransformer("microsoft/mpnet-base")

    if SMOKE_TEST:
        logging.info("SMOKE_TEST=1: trimmed datasets; will run max_steps=1 and skip Hub push")
    nli_train_size = 50 if SMOKE_TEST else 50_000
    nli_eval_size = 20 if SMOKE_TEST else 500
    nli_train = load_dataset("sentence-transformers/all-nli", "triplet", split="train").select(range(nli_train_size))
    stsb_train = load_dataset("sentence-transformers/stsb", split="train")
    if SMOKE_TEST:
        stsb_train = stsb_train.select(range(min(50, len(stsb_train))))
    nli_eval = load_dataset("sentence-transformers/all-nli", "triplet", split="dev").select(range(nli_eval_size))
    stsb_eval = load_dataset("sentence-transformers/stsb", split="validation")
    if SMOKE_TEST:
        stsb_eval = stsb_eval.select(range(min(20, len(stsb_eval))))

    train_datasets = {"all-nli": nli_train, "stsb": stsb_train}
    eval_datasets = {"all-nli": nli_eval, "stsb": stsb_eval}

    losses = {
        "all-nli": MultipleNegativesRankingLoss(model),
        "stsb": CoSENTLoss(model),
    }

    evaluator = EmbeddingSimilarityEvaluator(
        sentences1=stsb_eval["sentence1"],
        sentences2=stsb_eval["sentence2"],
        scores=stsb_eval["score"],
        main_similarity=SimilarityFunction.COSINE,
        name="sts-dev",
    )
    logging.info("Baseline evaluation (before training):")
    with autocast_ctx():
        # Must run before deriving metric_key: evaluator(model) mutates primary_metric to add the name_ prefix.
        baseline_eval = evaluator(model)[evaluator.primary_metric]
    metric_key = f"eval_{evaluator.primary_metric}"

    # multi_dataset_batch_sampler defaults to PROPORTIONAL (samples each dataset
    # in proportion to its size). To force equal alternation between datasets:
    #   from sentence_transformers.base.sampler import MultiDatasetBatchSamplers
    #   ... multi_dataset_batch_sampler=MultiDatasetBatchSamplers.ROUND_ROBIN ...
    args = SentenceTransformerTrainingArguments(
        output_dir="models/mpnet-nli-stsb",
        num_train_epochs=1,
        max_steps=1 if SMOKE_TEST else -1,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=32,
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
        run_name="mpnet-nli-stsb",
        seed=12,
    )

    trainer = SentenceTransformerTrainer(
        model=model,
        args=args,
        train_dataset=train_datasets,
        eval_dataset=eval_datasets,
        loss=losses,
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

    model.save_pretrained("models/mpnet-nli-stsb/final")

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
