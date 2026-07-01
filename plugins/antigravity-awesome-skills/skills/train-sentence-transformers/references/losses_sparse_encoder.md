# Sparse-Encoder Losses (SPLADE)

All losses live in `sentence_transformers.sparse_encoder.losses`.

This reference targets the **SPLADE** architecture (Transformer + SpladePooling). The sparse-encoder package also exports `CSRLoss` and `CSRReconstructionLoss` for the CSR architecture (Transformer + Pooling + SparseAutoEncoder); those are out of scope here — see the sbert.net docs if you're training a CSR model.

Choosing a loss means (a) pick a base loss (contrastive, regression, distillation) and (b) wrap it in `SpladeLoss` to add FLOPS regularization.

## Top-line decision table

| You have | Use |
|---|---|
| `(anchor, positive)` or triplet, SPLADE architecture | `SpladeLoss(loss=SparseMultipleNegativesRankingLoss(model), ...)` |
| Same, want effective batch size of 256+ | `CachedSpladeLoss(...)` |
| `(text1, text2, score)` labeled pairs | `SparseCoSENTLoss` or `SparseCosineSimilarityLoss` |
| Distillation from cross-encoder teacher | `SparseMarginMSELoss` |
| Listwise distillation | `SparseDistillKLDivLoss` |
| Explicit triplet | `SparseTripletLoss` |

## The core wrapper: `SpladeLoss`

`SpladeLoss` adds **FLOPS regularization** on top of another sparse loss. FLOPS regularization penalizes non-zero activations, keeping embeddings genuinely sparse.

```python
loss = SpladeLoss(
    model=model,
    loss=SparseMultipleNegativesRankingLoss(model=model),
    query_regularizer_weight=5e-5,
    document_regularizer_weight=3e-5,
)
```

- `query_regularizer_weight`: how much to penalize non-zero terms in query embeddings.
- `document_regularizer_weight`: same for documents.
- Typical range: 1e-5 to 1e-4. Higher = sparser embeddings, lower recall; lower = denser, possibly better recall.
- `SparseEncoderTrainer` automatically registers a `SpladeRegularizerWeightSchedulerCallback` whenever the loss is a `SpladeLoss`. The callback ramps the weights from 0 up to the target over the first ~33% of training; the default shape is `SchedulerType.QUADRATIC` (not linear). The ramp length and shape are configured on the callback (`SpladeRegularizerWeightSchedulerCallback(loss=..., warmup_ratio=..., scheduler_type=...)`), not on `SpladeLoss`; to override, instantiate the callback yourself and pass it via `callbacks=[...]`. This ramp is important; starting with full regularization from step 0 kills learning.

Use `CachedSpladeLoss` for the GradCache variant.

## Contrastive losses (no labels)

### `SparseMultipleNegativesRankingLoss`

Sparse analog of bi-encoder MNRL. In-batch contrastive.

```python
inner = SparseMultipleNegativesRankingLoss(model=model)
loss = SpladeLoss(model=model, loss=inner, query_regularizer_weight=5e-5, document_regularizer_weight=3e-5)
```

- **Always wrap in `SpladeLoss`** for SPLADE architectures.
- Set `batch_sampler=BatchSamplers.NO_DUPLICATES` on training args.

### `SparseTripletLoss`

Classic triplet margin loss on explicit `(anchor, positive, negative)`.

## Labeled regression losses

### `SparseCoSENTLoss`

Pairwise ranking loss for `(text1, text2, score)`. Mirrors bi-encoder `CoSENTLoss`.

### `SparseCosineSimilarityLoss`

MSE on cosine similarity. Simpler, usually worse than CoSENT.

### `SparseAnglELoss`

Angle-based loss in complex space. Alternative to CoSENT.

## Distillation losses

### `SparseMSELoss`

Embedding MSE. Student sparse embedding should match teacher embedding.

- **Data**: `(text, teacher_embedding)`.
- Teacher can be a dense bi-encoder or another sparse model.

### `SparseMarginMSELoss`

Margin MSE from a cross-encoder teacher.

- **Data**: `(query, positive, negative, score_diff)` where `score_diff = teacher_score(query, positive) - teacher_score(query, negative)`.
- Typical recipe for training SPLADE from cross-encoder labels (ms-marco distillation).
- Wrap in `SpladeLoss(model, loss=SparseMarginMSELoss(model), ...)` for SPLADE.

### `SparseDistillKLDivLoss`

Listwise KL-div distillation — student's softmax distribution over candidates should match teacher's.

## Independent regularizer

### `FlopsLoss`

Standalone FLOPS regularizer. Usually you use this via `SpladeLoss`, not directly.

For regularizer-weight tuning and dense-output recovery, see `troubleshooting.md` ("SPLADE embeddings are dense"). MLM-head requirement: `base_model_selection.md` (SPARSE section). Active-dim sparsity targets and how to monitor them: `evaluators_sparse_encoder.md` (Sparsity tracking).

## Gotchas

- **`SparseMultipleNegativesRankingLoss` without `SpladeLoss` wrapping on a SPLADE model**: no FLOPS regularization -> dense outputs defeating the purpose of SPLADE. Always wrap.
- **`CachedSpladeLoss` + `gradient_checkpointing=True`**: crash. Pick one.
- **Starting training with full FLOPS regularization at step 0**: the model outputs zero everywhere and gets stuck. The built-in scheduler avoids this — don't override it unless you know why.
- **`query_regularizer_weight` == `document_regularizer_weight`**: usually wrong. Queries should be sparser than documents (fewer terms per query). Since higher regularization drives more zeros, give the query weight the larger value. `query_regularizer_weight=5e-5`, `document_regularizer_weight=3e-5` is a good starting ratio.
