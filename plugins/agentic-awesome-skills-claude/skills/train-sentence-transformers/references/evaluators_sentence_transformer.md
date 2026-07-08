# Evaluators (Bi-Encoder)

All bi-encoder evaluators live in `sentence_transformers.sentence_transformer.evaluation`.

## Choosing the right evaluator

| Task | Evaluator |
|---|---|
| Retrieval (nDCG, MRR, Recall) — fast default | `NanoBEIREvaluator` |
| Retrieval on your own corpus / qrels | `InformationRetrievalEvaluator` |
| STS / continuous similarity | `EmbeddingSimilarityEvaluator` |
| Binary classification | `BinaryClassificationEvaluator` |
| Triplet accuracy | `TripletEvaluator` |
| Reranking (from retrieval candidates) | `RerankingEvaluator` |
| MSE vs. teacher (distillation) | `MSEEvaluator`, `MSEEvaluatorFromDataFrame` |
| Paraphrase mining | `ParaphraseMiningEvaluator` |
| Translation (cross-lingual alignment) | `TranslationEvaluator` |
| Label accuracy (classification during training) | `LabelAccuracyEvaluator` |

Wrap multiple evaluators in `SequentialEvaluator` to track all of them together:

```python
from sentence_transformers.sentence_transformer.evaluation import SequentialEvaluator
evaluator = SequentialEvaluator([evaluator1, evaluator2, evaluator3])
```

## The big three

### `NanoBEIREvaluator` (retrieval)

Small, fast subset of BEIR. Typically runs in <1 minute on a mid-range GPU. Default choice for retrieval training.

```python
from sentence_transformers.sentence_transformer.evaluation import NanoBEIREvaluator

evaluator = NanoBEIREvaluator(
    dataset_names=["msmarco", "nfcorpus", "nq"],   # default: all 13 NanoBEIR datasets
    batch_size=128,
    show_progress_bar=False,
)
```

- Default dataset list covers 13 tasks; pick a subset for speed during training.
- Output key for `metric_for_best_model`: **`eval_NanoBEIR_mean_cosine_ndcg@10`** (bi-encoder default = cosine similarity).

### `EmbeddingSimilarityEvaluator` (STS-style)

Computes Pearson/Spearman correlation between model cosine similarities and gold labels.

```python
from sentence_transformers.sentence_transformer.evaluation import EmbeddingSimilarityEvaluator
from sentence_transformers.util.similarity import SimilarityFunction

evaluator = EmbeddingSimilarityEvaluator(
    sentences1=stsb["sentence1"],
    sentences2=stsb["sentence2"],
    scores=stsb["score"],
    main_similarity=SimilarityFunction.COSINE,
    name="sts-dev",
)
```

- `main_similarity` can be `COSINE`, `DOT_PRODUCT`, `EUCLIDEAN`, `MANHATTAN`.
- `name` is used in the output key: `eval_sts-dev_spearman_cosine`, `eval_sts-dev_pearson_cosine`, etc.

### `InformationRetrievalEvaluator` (full retrieval)

Use when you have your **own** corpus + queries + qrels (not one of the NanoBEIR tasks).

```python
from sentence_transformers.sentence_transformer.evaluation import InformationRetrievalEvaluator

evaluator = InformationRetrievalEvaluator(
    queries={qid: query_text for qid, query_text in ...},
    corpus={doc_id: doc_text for doc_id, doc_text in ...},
    relevant_docs={qid: {doc_id, ...} for qid in ...},   # qid -> set of relevant doc_ids
    name="my-retrieval",
    mrr_at_k=[10],
    ndcg_at_k=[10],
    accuracy_at_k=[1, 5, 10],
    precision_recall_at_k=[1, 5, 10],
    map_at_k=[100],
    show_progress_bar=False,
    batch_size=64,
)
```

Output keys: `eval_{name}_cosine_ndcg@10`, `eval_{name}_cosine_mrr@10`, etc.

Heavy for large corpora — each eval encodes the full corpus. Don't run it every 100 steps. Use `NanoBEIREvaluator` for frequent evaluation during training and reserve full IR for milestones / post-training.

## Other bi-encoder evaluators

### `BinaryClassificationEvaluator`

For labeled pair classification (e.g. duplicate detection, entailment as binary). Reports accuracy, F1, precision/recall, AP. Supports all distance metrics — finds the best threshold per metric.

### `TripletEvaluator`

For `(anchor, positive, negative)` triplets. Reports the fraction of triplets where the positive is closer to the anchor than the negative.

### `RerankingEvaluator`

For custom re-ranking datasets: you provide candidates per query, the evaluator computes MAP and MRR. Good for measuring retrieval-quality on a held-out set.

### `MSEEvaluator` / `MSEEvaluatorFromDataFrame`

For distillation setups. Compares student embeddings against teacher embeddings (or teacher scores), reports MSE.

### `ParaphraseMiningEvaluator`

For paraphrase-mining tasks. Given a corpus of labeled paraphrase pairs, computes mining quality (F1 at various thresholds).

### `TranslationEvaluator`

For cross-lingual / `make_multilingual`-style alignment checking. Measures whether the student aligns sentences across languages.

### `LabelAccuracyEvaluator`

For a `SoftmaxLoss`-trained classifier head. Reports accuracy on held-out data.

## Writing `metric_for_best_model`

Pattern: `f"eval_{evaluator.primary_metric}"`. Inspect after construction: `print(evaluator.primary_metric)`. Common values:
- `eval_NanoBEIR_mean_cosine_ndcg@10` — `NanoBEIREvaluator`
- `eval_sts-dev_spearman_cosine` — `EmbeddingSimilarityEvaluator(name="sts-dev")`
- `eval_{name}_cosine_ndcg@10` — `InformationRetrievalEvaluator(name=...)`

## Multi-dimensional evaluation (Matryoshka)

For Matryoshka-trained models, evaluate at each target dimension:

```python
per_dim_evaluators = [
    EmbeddingSimilarityEvaluator(
        sentences1=..., sentences2=..., scores=...,
        main_similarity=SimilarityFunction.COSINE,
        name=f"sts-dev-{dim}",
        truncate_dim=dim,
    ) for dim in [768, 512, 256, 128, 64]
]
evaluator = SequentialEvaluator(per_dim_evaluators, main_score_function=lambda scores: scores[0])
```

The first evaluator's score drives `load_best_model_at_end`.

## Gotchas

- **Always run `evaluator(model)` once before training** — pre-training baseline. If the post-training delta is tiny, the loss/data/base is wrong.
- Don't run `InformationRetrievalEvaluator` with a large corpus (>100k docs) at frequent `eval_steps` — use `NanoBEIREvaluator` during training, reserve full IR for end-of-training.
- `greater_is_better=True` is the default; right for nDCG / MRR / accuracy.
