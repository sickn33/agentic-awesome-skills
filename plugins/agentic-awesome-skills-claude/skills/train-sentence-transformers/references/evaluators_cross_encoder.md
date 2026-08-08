# Evaluators (Cross-Encoder)

All cross-encoder evaluators live in `sentence_transformers.cross_encoder.evaluation`.

## Choosing the right evaluator

| Task | Evaluator |
|---|---|
| Rerank retrieval results (nDCG@k on BM25 top-N) — fast default | `CrossEncoderNanoBEIREvaluator` |
| Rerank with custom candidates per query | `CrossEncoderRerankingEvaluator` |
| Binary / multi-class pair classification | `CrossEncoderClassificationEvaluator` |
| Continuous pair scoring (STS-style) | `CrossEncoderCorrelationEvaluator` |

Wrap multiple in `SequentialEvaluator` (from `sentence_transformers.base.evaluation`) to track them together:

```python
from sentence_transformers.base.evaluation import SequentialEvaluator
evaluator = SequentialEvaluator([nano_beir_eval, custom_rerank_eval])
```

## The default: `CrossEncoderNanoBEIREvaluator`

Analog of `NanoBEIREvaluator` for rerankers. Takes BM25 top-100 for each NanoBEIR query and measures how well the cross-encoder re-ranks them.

```python
from sentence_transformers.cross_encoder.evaluation import CrossEncoderNanoBEIREvaluator

evaluator = CrossEncoderNanoBEIREvaluator(
    dataset_names=["msmarco", "nfcorpus", "nq"],   # default: 11 of 13 NanoBEIR datasets (excludes "arguana", "touche2020")
    batch_size=64,
    rerank_k=100,                                   # rerank the BM25 top-K
)
```

Output key for `metric_for_best_model`: **`eval_NanoBEIR_R100_mean_ndcg@10`**. The `R100` signals "rerank top-100"; if you change `rerank_k`, the prefix changes (e.g. `R50`).

Each individual dataset contributes `eval_Nano{DatasetName}_R100_ndcg@10` (e.g. `eval_NanoMSMARCO_R100_ndcg@10`) too.

## Custom reranking with your own candidates

Use when you have query + positive + distractor candidates that aren't part of NanoBEIR:

```python
from sentence_transformers.cross_encoder.evaluation import CrossEncoderRerankingEvaluator

samples = [
    {"query": "...", "positive": ["the gold answer"], "documents": ["...", "...", ...]}
    for ...
]

evaluator = CrossEncoderRerankingEvaluator(
    samples=samples,
    batch_size=64,
    name="my-rerank",
    always_rerank_positives=False,   # default is True; override to False for realistic eval
)
```

- `always_rerank_positives=True` (the library default) forces the positive into the candidate pool even when the retriever missed it. The reranker is graded only on candidates it can actually score, so the metric reflects pure reranker quality.
- `always_rerank_positives=False`: the positive is only reranked if it's already in `documents`. If the retriever missed it, the rank counts as N+1. This reflects end-to-end retriever+reranker quality. A positive the retriever missed is lost, regardless of reranker skill.

Output key: `eval_{name}_ndcg@10`, `eval_{name}_map`, `eval_{name}_mrr@10`.

## Classification-style cross-encoders

### `CrossEncoderClassificationEvaluator`

Works for both binary (`num_labels=1`) and multi-class (`num_labels>=2`) cross-encoders. Branches internally:
- `num_labels=1`: binary mode. Sweeps thresholds to report accuracy, F1, precision, recall, and **average_precision** (primary).
- `num_labels>=2`: multi-class mode (e.g. NLI: entailment / neutral / contradiction). Reports **f1_macro** (primary), f1_micro, f1_weighted, and per-class precision / recall.

```python
from sentence_transformers.cross_encoder.evaluation import CrossEncoderClassificationEvaluator

evaluator = CrossEncoderClassificationEvaluator(
    sentence_pairs=[(premise, hypothesis), ...],
    labels=[0, 1, 2, ...],
    batch_size=64,
    name="nli-dev",
)
```

Output keys (binary, `num_labels=1`): `eval_{name}_accuracy`, `eval_{name}_f1`, `eval_{name}_average_precision` (primary).
Output keys (multi-class, `num_labels>=2`): `eval_{name}_f1_macro` (primary), `eval_{name}_f1_micro`, `eval_{name}_f1_weighted`.

### `CrossEncoderCorrelationEvaluator`

For continuous-score cross-encoders (like an STS cross-encoder outputting a similarity score). Reports Pearson/Spearman vs. gold scores.

```python
from sentence_transformers.cross_encoder.evaluation import CrossEncoderCorrelationEvaluator

evaluator = CrossEncoderCorrelationEvaluator(
    sentence_pairs=[(a, b), ...],
    scores=[0.4, 0.8, ...],
    name="stsb-dev",
)
```

Output keys: `eval_{name}_spearman`, `eval_{name}_pearson`.

## Writing `metric_for_best_model`

Pattern: `f"eval_{evaluator.primary_metric}"`. Inspect after construction: `print(evaluator.primary_metric)`. Common values:
- `eval_NanoBEIR_R100_mean_ndcg@10` — `CrossEncoderNanoBEIREvaluator` default
- `eval_{name}_ndcg@10` — `CrossEncoderRerankingEvaluator`
- `eval_{name}_average_precision` — `CrossEncoderClassificationEvaluator` (binary, `num_labels=1`)
- `eval_{name}_f1_macro` — `CrossEncoderClassificationEvaluator` (multi-class, `num_labels>=2`)
- `eval_{name}_spearman` — `CrossEncoderCorrelationEvaluator`

## Gotchas

- **Always run `evaluator(model)` once before training** — pre-training baseline. Tiny post-training delta means the loss/data/base is wrong.
- `CrossEncoderClassificationEvaluator` accepts both `num_labels=1` (binary, primary `average_precision`) and `num_labels>=2` (multi-class, primary `f1_macro`); `CrossEncoderCorrelationEvaluator` requires `num_labels=1`.
- The default `dataset_names=None` excludes `arguana` and `touche2020` (Argument-Retrieval task differs from the rest); pass `dataset_names=list(DATASET_NAME_TO_HUMAN_READABLE)` from `sentence_transformers.cross_encoder.evaluation.nano_beir` to actually run all 13.
- Subset NanoBEIR datasets during training (3–4) to keep eval cheap; run the broader set post-training.
