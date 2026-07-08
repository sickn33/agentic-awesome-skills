# Dataset Formats

This reference covers: how datasets map to losses, how to reshape data when it doesn't fit, and how to mine hard negatives.

## The two rules

From the sentence-transformers training overview:

1. If the loss requires a label, the dataset must have a column named **`label`, `labels`, `score`, or `scores`**. Any column with one of these names is the label.
2. All other columns are **inputs**. The loss defines how many input columns it expects. Column **names don't matter; order does**.

Example: `CoSENTLoss` expects 2 inputs + a float label. A dataset with columns `["premise", "hypothesis", "score"]` works. A dataset with `["score", "premise", "hypothesis"]` does not — reorder first.

## Per-loss data shapes

The per-type loss references (`losses_sentence_transformer.md`, `losses_cross_encoder.md`, `losses_sparse_encoder.md`) are the canonical mappings from data shape to loss. Cross-cutting recipe bits those tables don't show:

- **`CosineSimilarityLoss`** wants `score` normalized to `[0, 1]`; `CoSENTLoss` / `AnglELoss` are pairwise-ranking and ignore absolute scale, so on `stsb` (raw 0-5) divide by 5 only when using cosine-similarity.
- **`BatchAllTripletLoss` / `BatchHardTripletLoss` / `BatchSemiHardTripletLoss`** need `batch_sampler=BatchSamplers.GROUP_BY_LABEL` so multiple samples per label appear in the same batch.
- **`MSELoss` (distillation)** label is the teacher's full embedding vector (a list of floats), not a scalar score.
- **`MarginMSELoss` (distillation)** label is `teacher_score(q, pos) - teacher_score(q, neg)`, precomputed per row.
- **N-tuple shape** for MNRL `(anchor, positive, negative_1, negative_2, ..., negative_N)` (1-indexed) is produced by `mine_hard_negatives(..., output_format="n-tuple")`; "labeled-list" output_format produces the CrossEncoder listwise shape.

## Reshaping operations

If your data doesn't fit the loss's expected shape:

### Reorder columns

```python
# Columns are ["hypothesis", "premise", "score"] but CoSENTLoss expects premise first.
dataset = dataset.select_columns(["premise", "hypothesis", "score"])
```

### Rename label column

```python
# Your label is called "relevance" but ST wants "label".
dataset = dataset.rename_column("relevance", "label")
```

### Drop extra columns

```python
# ST will treat every non-label column as an input. Drop metadata.
dataset = dataset.remove_columns(["source_id", "created_at", "language"])
```

### Convert dtypes

```python
# Label is str, need float for CoSENTLoss.
dataset = dataset.map(lambda x: {"label": float(x["label"])})
```

## Hard-negative mining

`mine_hard_negatives` (in `sentence_transformers.util`) produces a training dataset with mined negatives using a retriever. Hard negatives are the single highest-leverage lever for retrieval-model quality.

### Basic usage

```python
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import mine_hard_negatives

retriever = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

mined = mine_hard_negatives(
    dataset=train_pairs,                # has (anchor, positive) or (q, a) columns
    model=retriever,
    num_negatives=5,
    range_min=0, range_max=100,         # rank window to sample hard negatives from
    sampling_strategy="top",            # "top" = rank-1 hardest; "random" = random in window
    output_format="n-tuple",            # "triplet" | "n-tuple" | "labeled-pair" | "labeled-list"
    use_faiss=True,
)
```

### Output formats

- `"triplet"` — `(anchor, positive, negative)` triplets. One row per `(query, negative)` pair.
- `"n-tuple"` — `(anchor, positive, negative_1, negative_2, ..., negative_N)` (1-indexed) — one row per query.
- `"labeled-pair"` — `(anchor, text, label)` with `label=1` for positives and `label=0` for negatives. Good for `BinaryCrossEntropyLoss`.
- `"labeled-list"` — `(anchor, texts, labels)` — one row per query with a list of candidates. Good for listwise losses.

### Filtering false negatives

If the retriever returns "negatives" that are actually relevant, they become false negatives and hurt training. Filter them:

```python
mined = mine_hard_negatives(
    dataset=train_pairs,
    model=retriever,
    cross_encoder=CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2"),   # score candidates
    num_negatives=5,
    max_score=0.9,                      # drop candidates scoring above 0.9
    relative_margin=0.05,               # require neg_score < pos_score * (1 - 0.05)
    absolute_margin=0.2,                # require neg_score < pos_score - 0.2
    output_format="n-tuple",
    use_faiss=True,
)
```

Use **either** `relative_margin` or `absolute_margin`, usually not both. `max_score` is independently useful as a hard ceiling.

### CLI

`scripts/mine_hard_negatives.py` is a CLI wrapper — see it for a ready-to-run command.

## Choosing the right `range_min` / `range_max`

`range_max=None` is the default; pass an integer to cap how far down the ranked list to sample from.

- `range_min=0`, `range_max=100` — sample from the top-100 retrieved. Good default.
- `range_min=10`, `range_max=100` — skip the top-10 (often contains true positives). Safer if you lack a cross-encoder.
- `range_min=0`, `range_max=1000` — wider net, more diverse negatives, slower.
- `sampling_strategy="top"` — always pick the rank-1 hardest. Maximum training signal per row.
- `sampling_strategy="random"` — pick randomly within the range. More robust if your retriever is itself noisy.

## Quick Hub-side dataset checks

`hf datasets sql "SELECT * FROM 'hf://datasets/<id>/<split>' LIMIT 5"` streams rows via DuckDB without `load_dataset(...)` — the fastest way to confirm column names match your loss before a full validation run. `hf datasets info <id>` shows config / splits / size; `hf datasets card <id> --text` renders the README.

## Gotchas

- **`remove_unused_columns=True` (default)**: the trainer drops columns that aren't passed to the model's forward. Usually fine, but if you rely on a custom collator that uses metadata columns, set `remove_unused_columns=False`.
- **Floats stored as strings after CSV load**: `load_dataset("csv", ...)` keeps columns as strings by default. Cast with `.map(lambda x: {"label": float(x["label"])})`.
- **Mined hard negatives with `include_positives=True`** include the positive as a negative in the output list — only useful when you're building an evaluator or want to measure rank of the positive. For training, leave it `False`.
