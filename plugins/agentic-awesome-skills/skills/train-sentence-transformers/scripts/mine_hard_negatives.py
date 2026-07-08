#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "sentence-transformers[train]>=5.0",
#     "datasets>=2.19.0",
# ]
# ///
"""Mine hard negatives as a pre-training step for contrastive losses.

Hard negatives are the single highest-leverage lever for retrieval quality.
This script is a thin, CLI-friendly wrapper around
`sentence_transformers.util.mine_hard_negatives`.

Typical workflow:
1. Start from a dataset of (anchor, positive) pairs.
2. Pick a retriever model (can be your current base model or a stronger one).
3. Run this script to produce a new dataset with N mined negatives per anchor.
4. Train with MultipleNegativesRankingLoss or CachedMultipleNegativesRankingLoss.

Usage:
    python mine_hard_negatives.py \\
        --dataset sentence-transformers/gooaq \\
        --model sentence-transformers/all-MiniLM-L6-v2 \\
        --num-negatives 5 \\
        --output-path data/gooaq-hard-negatives

    # Mine from a separate document corpus (recommended for production):
    python mine_hard_negatives.py \\
        --dataset sentence-transformers/gooaq \\
        --model sentence-transformers/all-MiniLM-L6-v2 \\
        --corpus-dataset sentence-transformers/wikipedia-en-passages \\
        --corpus-column text \\
        --num-negatives 5 \\
        --output-path data/gooaq-hn-wiki

    # With a cross-encoder as an "oracle" to filter negatives by score:
    python mine_hard_negatives.py \\
        --dataset sentence-transformers/gooaq \\
        --model sentence-transformers/all-MiniLM-L6-v2 \\
        --cross-encoder cross-encoder/ms-marco-MiniLM-L-6-v2 \\
        --num-negatives 5 \\
        --max-score 0.9 \\
        --relative-margin 0.05 \\
        --output-path data/gooaq-hn-filtered

    # Push the mined dataset to the Hub:
    python mine_hard_negatives.py \\
        --dataset sentence-transformers/gooaq --model ... --num-negatives 5 \\
        --push-to-hub your-username/gooaq-hard-negatives

Key options:
    --num-negatives     How many hard negatives to mine per anchor (default 3).
    --range-min/max     Which retrieval-rank window to sample from (default 0..100).
    --sampling-strategy "top" (rank-1 hardest) or "random" (within the window).
    --relative-margin   Require that negative_score < positive_score * (1 - margin).
    --max-score         Filter candidates above this score (likely false negatives).
    --cross-encoder     Use a cross-encoder to re-score candidates before filtering.
    --corpus-dataset    Mine from a separate document pool instead of the input
                        dataset's positives. Recommended for production: typical
                        retrieval corpora (Wikipedia, MSMARCO passages) are far
                        larger than your training-pair pool, giving harder negatives.

See the `mine_hard_negatives` API reference for full semantics and all flags.
"""

from __future__ import annotations

import argparse
import logging
import sys

from datasets import load_dataset

from sentence_transformers import CrossEncoder, SentenceTransformer
from sentence_transformers.util import mine_hard_negatives

logging.basicConfig(format="%(asctime)s - %(message)s", datefmt="%Y-%m-%d %H:%M:%S", level=logging.INFO)
for _noisy in ("httpx", "httpcore", "huggingface_hub", "urllib3", "filelock", "fsspec"):
    logging.getLogger(_noisy).setLevel(logging.WARNING)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dataset", required=True)
    p.add_argument("--subset", default=None)
    p.add_argument("--split", default="train")
    p.add_argument("--model", required=True, help="Retriever / bi-encoder used to score candidates")
    p.add_argument("--cross-encoder", default=None, help="Optional CrossEncoder to re-score and filter")
    p.add_argument("--anchor-column", default=None)
    p.add_argument("--positive-column", default=None)
    p.add_argument(
        "--num-negatives",
        type=int,
        default=3,
        help="Number of hard negatives to mine per anchor. Default 3 matches the library.",
    )
    p.add_argument("--range-min", type=int, default=0)
    p.add_argument("--range-max", type=int, default=100)
    p.add_argument("--sampling-strategy", choices=["top", "random"], default="top")
    p.add_argument(
        "--max-score", type=float, default=None, help="Drop candidates scoring above this (likely false negatives)"
    )
    p.add_argument("--min-score", type=float, default=None)
    p.add_argument("--absolute-margin", type=float, default=None)
    p.add_argument("--relative-margin", type=float, default=None)
    p.add_argument(
        "--output-format",
        choices=["triplet", "n-tuple", "labeled-pair", "labeled-list"],
        default="triplet",
    )
    p.add_argument("--include-positives", action="store_true")
    p.add_argument("--output-scores", action="store_true")
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--use-faiss", action="store_true")
    p.add_argument(
        "--corpus-dataset",
        default=None,
        help="Optional Hub dataset id or local path for a separate document pool to mine from. "
        "If unset, mines negatives from the input dataset's positives.",
    )
    p.add_argument("--corpus-subset", default=None, help="Subset of --corpus-dataset (optional)")
    p.add_argument("--corpus-split", default="train", help="Split of --corpus-dataset (default 'train')")
    p.add_argument(
        "--corpus-column", default="text", help="Text column to extract from --corpus-dataset (default 'text')"
    )
    p.add_argument("--output-path", default=None, help="Local directory to save the mined dataset to")
    p.add_argument("--push-to-hub", default=None, help="Hub repo id to push the mined dataset to (optional)")
    p.add_argument("--private", action="store_true", help="Push as a private repo")
    return p


def main() -> int:
    args = build_parser().parse_args()

    dataset = (
        load_dataset(args.dataset, args.subset, split=args.split)
        if args.subset
        else load_dataset(args.dataset, split=args.split)
    )
    print(f"Loaded {len(dataset):,} rows from {args.dataset} (split={args.split})")

    model = SentenceTransformer(args.model)
    cross_encoder = CrossEncoder(args.cross_encoder) if args.cross_encoder else None

    corpus = None
    if args.corpus_dataset:
        corpus_ds = (
            load_dataset(args.corpus_dataset, args.corpus_subset, split=args.corpus_split)
            if args.corpus_subset
            else load_dataset(args.corpus_dataset, split=args.corpus_split)
        )
        if args.corpus_column not in corpus_ds.column_names:
            raise SystemExit(
                f"--corpus-column '{args.corpus_column}' not in {args.corpus_dataset} columns: "
                f"{corpus_ds.column_names}"
            )
        corpus = list(corpus_ds[args.corpus_column])
        print(f"Loaded corpus: {len(corpus):,} documents from {args.corpus_dataset}.{args.corpus_column}")

    mined = mine_hard_negatives(
        dataset=dataset,
        model=model,
        corpus=corpus,
        cross_encoder=cross_encoder,
        anchor_column_name=args.anchor_column,
        positive_column_name=args.positive_column,
        num_negatives=args.num_negatives,
        range_min=args.range_min,
        range_max=args.range_max,
        sampling_strategy=args.sampling_strategy,
        max_score=args.max_score,
        min_score=args.min_score,
        absolute_margin=args.absolute_margin,
        relative_margin=args.relative_margin,
        output_format=args.output_format,
        include_positives=args.include_positives,
        output_scores=args.output_scores,
        batch_size=args.batch_size,
        use_faiss=args.use_faiss,
    )
    print(f"Mined dataset: {len(mined):,} rows | columns: {mined.column_names}")

    if args.output_path:
        mined.save_to_disk(args.output_path)
        print(f"Saved to {args.output_path}")

    if args.push_to_hub:
        mined.push_to_hub(args.push_to_hub, private=args.private)
        print(f"Pushed to https://huggingface.co/datasets/{args.push_to_hub}")

    if not args.output_path and not args.push_to_hub:
        print("No --output-path or --push-to-hub provided; nothing persisted.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
