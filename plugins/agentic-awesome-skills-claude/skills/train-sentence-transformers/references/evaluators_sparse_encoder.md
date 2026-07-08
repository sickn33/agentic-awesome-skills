# Evaluators (Sparse Encoder)

All sparse-encoder evaluators live in `sentence_transformers.sparse_encoder.evaluation`. They mirror the bi-encoder versions with a `Sparse` prefix and default to **dot product** similarity (cosine on sparse vectors is less meaningful).

## Choosing the right evaluator

| Task | Evaluator |
|---|---|
| Retrieval (nDCG, MRR, Recall) — fast default | `SparseNanoBEIREvaluator` |
| Retrieval on your own corpus / qrels | `SparseInformationRetrievalEvaluator` |
| STS / continuous similarity | `SparseEmbeddingSimilarityEvaluator` |
| Binary classification | `SparseBinaryClassificationEvaluator` |
| Triplet accuracy | `SparseTripletEvaluator` |
| Reranking (from retrieval candidates) | `SparseRerankingEvaluator` |
| MSE vs. teacher (distillation) | `SparseMSEEvaluator` |
| Translation (cross-lingual alignment) | `SparseTranslationEvaluator` |
| Hybrid BM25 + sparse retrieval | `ReciprocalRankFusionEvaluator` |

Wrap multiple in `SequentialEvaluator` (from `sentence_transformers.base.evaluation`):

```python
from sentence_transformers.base.evaluation import SequentialEvaluator
evaluator = SequentialEvaluator([sparse_nano_beir, my_custom_ir])
```

## The default: `SparseNanoBEIREvaluator`

Small, fast subset of BEIR adapted for sparse retrieval. Typical runtime <1 minute on a mid-range GPU.

```python
from sentence_transformers.sparse_encoder.evaluation import SparseNanoBEIREvaluator

evaluator = SparseNanoBEIREvaluator(
    dataset_names=["msmarco", "nfcorpus", "nq"],   # default: all 13 NanoBEIR datasets
    batch_size=32,
    show_progress_bar=False,
)
```

Output key for `metric_for_best_model`: **`eval_NanoBEIR_mean_dot_ndcg@10`** (sparse defaults to dot product).

### Sparsity tracking

Unlike the dense variant, the sparse evaluator also reports **active dimension counts** so you can monitor sparsity during training:

- `query_active_dims` — non-zero entries per query vector
- `document_active_dims` — non-zero entries per document vector

A healthy SPLADE checkpoint typically shows ~30–50 active dims for queries and ~150–250 for documents. If these drift toward the vocab size (~30k), the FLOPS regularization isn't doing its job — raise `query_regularizer_weight` / `document_regularizer_weight` in `SpladeLoss`.

## Retrieval on your own corpus

### `SparseInformationRetrievalEvaluator`

Same shape as the dense version but operates on sparse vectors internally:

```python
from sentence_transformers.sparse_encoder.evaluation import SparseInformationRetrievalEvaluator

evaluator = SparseInformationRetrievalEvaluator(
    queries={qid: text for qid, text in ...},
    corpus={doc_id: text for doc_id, text in ...},
    relevant_docs={qid: {doc_id, ...} for qid in ...},
    name="my-sparse-ir",
    ndcg_at_k=[10],
    mrr_at_k=[10],
    accuracy_at_k=[1, 5, 10],
    map_at_k=[100],
    batch_size=32,
)
```

Output keys: `eval_{name}_dot_ndcg@10`, `eval_{name}_dot_mrr@10`, etc. Also reports active-dims.

Heavy for large corpora. Use `SparseNanoBEIREvaluator` during training; reserve full IR for post-training.

## Hybrid retrieval

### `ReciprocalRankFusionEvaluator`

Measures the performance of combining your sparse encoder with BM25 (or any other retriever) via reciprocal-rank fusion. Useful when shipping a hybrid system is the actual deployment target.

## Other sparse evaluators

### `SparseEmbeddingSimilarityEvaluator`

STS-style. Computes Pearson/Spearman between sparse vector similarities and gold labels. Uses dot product by default.

### `SparseBinaryClassificationEvaluator`

For labeled pair classification with sparse embeddings.

### `SparseTripletEvaluator`

For `(anchor, positive, negative)` triplets — reports fraction where the positive is closer than the negative (by dot product).

### `SparseRerankingEvaluator`

For custom re-ranking with sparse embeddings. Same semantics as the dense `RerankingEvaluator`.

### `SparseMSEEvaluator`

For distillation setups. Compares sparse student embeddings against teacher outputs.

### `SparseTranslationEvaluator`

For cross-lingual / `make_multilingual`-style alignment checking with sparse embeddings.

## Writing `metric_for_best_model`

Pattern: `f"eval_{evaluator.primary_metric}"`. Inspect after construction: `print(evaluator.primary_metric)`. Common values:
- `eval_NanoBEIR_mean_dot_ndcg@10` — `SparseNanoBEIREvaluator` default
- `eval_{name}_dot_ndcg@10` — `SparseInformationRetrievalEvaluator`
- `eval_{name}_spearman_dot` — `SparseEmbeddingSimilarityEvaluator`

## Gotchas

- **Always run `evaluator(model)` once before training** — confirms the pipeline works (a fill-mask base scores ~0 on retrieval until trained).
- Sparse evaluators default to dot product; cosine on sparse vectors isn't meaningful.
- Don't compare dense and sparse metrics directly — different scales (cosine ∈ [-1, 1] vs. dot ∈ [0, ∞)).
- Always check `query_active_dims` / `document_active_dims` — thousands of active dims per doc means the FLOPS regularizer is mistuned, even if nDCG looks OK.
