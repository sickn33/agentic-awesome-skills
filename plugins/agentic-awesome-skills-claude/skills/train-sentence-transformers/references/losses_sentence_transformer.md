# Bi-Encoder Losses (SentenceTransformer)

All losses live in `sentence_transformers.sentence_transformer.losses`.

Losses are grouped by data shape. The #1 rule: **pick a loss that matches your data**, not the other way around.

## Top-line decision table

| You have | Use |
|---|---|
| `(anchor, positive)` pairs | `MultipleNegativesRankingLoss` (or Cached variant for large batches) |
| `(anchor, positive, negative)` triplets | `MultipleNegativesRankingLoss` — it handles triplets natively |
| `(text1, text2, score)` with `score ∈ [-1, 1]` or `[0, 1]` | `CoSENTLoss` (strongly recommended) |
| `(text1, text2, label)` with `label ∈ {0, 1}` | `OnlineContrastiveLoss` |
| `(text, class_id)` single-column with integer class | `BatchAllTripletLoss` |
| `(query, positive, negative, score_diff)` | `MarginMSELoss` (distillation) |
| `(text, teacher_embedding)` | `MSELoss` (embedding distillation) |
| Want multiple output dims from one training | Wrap any of the above in `MatryoshkaLoss` |
| No labels at all, just sentences | `DenoisingAutoEncoderLoss` or `ContrastiveTensionLossInBatchNegatives` |

## Contrastive losses (pairs + triplets, no labels)

### `MultipleNegativesRankingLoss` (MNRL)

The default bi-encoder loss. Uses **in-batch negatives**: every other `positive` in the batch acts as a negative for the current `anchor`.

```python
loss = MultipleNegativesRankingLoss(model, scale=20.0)  # similarity_fct defaults to cos_sim
```

- **Data**: `(anchor, positive)` or `(anchor, positive, negative)`. More columns = more explicit hard negatives per row.
- **Scale**: temperature. Default `scale=20.0` multiplies similarities by 20 (equivalent to softmax temperature 0.05). Tune only if cosine similarities end up saturated.
- **Critical**: set `batch_sampler=BatchSamplers.NO_DUPLICATES` on training args. Otherwise duplicate anchors create false negatives.
- **Tip**: batch size matters a lot — more in-batch negatives = better gradients.

### `CachedMultipleNegativesRankingLoss`

Same loss, but with gradient caching (GradCache): forwards in mini-batches but computes the contrastive loss over the full batch. Use this when you want effective batch size of 256+ but your GPU can only fit 32 forwards.

```python
loss = CachedMultipleNegativesRankingLoss(model, mini_batch_size=32)
```

- **Incompatible with `gradient_checkpointing=True`**.
- Set `mini_batch_size` to whatever `per_device_train_batch_size` would be if you couldn't use this. Then crank the actual `per_device_train_batch_size` to what you want the effective batch to be (256+, 1024+).

### `MultipleNegativesSymmetricRankingLoss`

MNRL computed bidirectionally — scores positives from both (anchor -> positive) and (positive -> anchor) directions. Slightly better on retrieval tasks where the "anchor" and "positive" distinctions are soft (paraphrase, deduplication).

### `CachedMultipleNegativesSymmetricRankingLoss`

Cached variant of the above.

### `GISTEmbedLoss`

Like MNRL, but uses a **guide model** (a separate pretrained Sentence Transformer) to **filter out false negatives** before computing the contrastive loss. The guide model scores each potential negative; if it looks too similar to the positive, it's excluded.

```python
guide = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
loss = GISTEmbedLoss(model, guide=guide)
```

- Expensive: guide model does a forward pass per batch.
- Strong when your in-batch negatives are noisy (e.g. small corpus with many near-duplicates).

### `CachedGISTEmbedLoss`

Cached + GIST.

### `MegaBatchMarginLoss`

In-batch margin-based triplet: for each anchor, find the hardest negative in the batch and apply a margin loss. Older pattern, usually outperformed by MNRL.

### `TripletLoss`

Classic triplet margin loss on explicit `(anchor, positive, negative)`. Uses a fixed margin and the hardest in-batch is not considered — only the provided triplet.

```python
loss = TripletLoss(model, distance_metric=TripletDistanceMetric.EUCLIDEAN, triplet_margin=5)
```

- Simpler than MNRL; less powerful when the batch has useful negatives.
- Good for cases where you have *trusted* pre-mined triplets and want to avoid in-batch noise.

## Batch-triplet losses (single column + integer label)

These mine triplets *within* the batch from samples sharing a label.

### `BatchAllTripletLoss`

For each anchor, form triplets with all positive/negative combinations in the batch. Max signal per batch.

```python
loss = BatchAllTripletLoss(model, margin=5)
```

- **Data**: single text column + integer `label`. Needs multiple samples per label in each batch (set `batch_sampler=BatchSamplers.GROUP_BY_LABEL`).

### `BatchHardTripletLoss`

Same, but only the single hardest positive + hardest negative per anchor.

### `BatchSemiHardTripletLoss`

Semi-hard mining: negatives harder than the positive but easier than the margin. Often more stable than fully-hard.

### `BatchHardSoftMarginTripletLoss`

Variant with a soft margin (log-sum-exp) instead of a fixed margin hinge.

**When to use batch-triplet losses**: classification-style datasets (labels are class IDs, not pair annotations). E.g. "train an embedder where samples from the same class are close."

## Scored regression losses (labeled pairs, float score)

### `CoSENTLoss`

**The recommended regression loss** for `(text1, text2, score)`. Trains on pairwise ranking: for any two pairs `(a, b)` and `(c, d)` with `score(a,b) > score(c,d)`, the model should score `(a, b)` higher. Much better than squared error.

```python
loss = CoSENTLoss(model, scale=20.0)
```

- **Data**: `(text1, text2, float_score)`. Labels can be `[0, 1]` or `[-1, 1]`.
- Works well with small datasets (STS-B, 5k pairs).

### `AnglELoss`

Similar to CoSENT but uses angle-based optimization in complex space. Sometimes outperforms CoSENT on tasks with fine-grained similarity gradations. Strong alternative.

### `CosineSimilarityLoss`

Squared-error loss on cosine similarity: `mse(cos(text1, text2), label)`. Simpler than CoSENT, usually worse. Keep for legacy / reproducibility.

## Contrastive labeled losses (labeled pairs, binary label)

### `ContrastiveLoss`

For `(text1, text2, label)` where `label ∈ {0, 1}`. Minimizes distance for positives; pushes negatives past a margin.

```python
loss = ContrastiveLoss(model, margin=0.5, distance_metric=SiameseDistanceMetric.COSINE_DISTANCE)
```

### `OnlineContrastiveLoss`

Same setup but **ignores "easy" pairs** (positives already close, negatives already far) and only optimizes hard ones. Much more robust to label noise.

```python
loss = OnlineContrastiveLoss(model, margin=0.5)
```

**Preferred over `ContrastiveLoss`** for most practical labeled pair datasets.

### `SoftmaxLoss`

A classifier head on concatenated `(u, v, |u-v|)` embeddings, trained with cross-entropy. Useful when you have NLI-style multi-class labels (entailment / neutral / contradiction) and want a categorical loss. Historically important (it trained the first popular sentence embedding models) but **generally outperformed by MNRL**.

## Distillation losses

### `MSELoss`

Regress the student's embedding to match a teacher's embedding.

- **Data**: `(text, teacher_embedding)`. The teacher embedding is a fixed vector per row.
- Use when distilling a smaller bi-encoder from a larger one.

### `MarginMSELoss`

For `(query, positive, negative, score_diff)`: minimize `mse(student_score_diff, teacher_score_diff)`. The teacher is typically a cross-encoder that produced the score differences.

- **Data**: 3 text columns + 1 float column.
- Workhorse of dense retriever training from cross-encoder teachers (ms-marco distillation).

### `DistillKLDivLoss`

KL-divergence distillation: student's softmax distribution over candidates should match teacher's.

- **Data**: `(query, passages[], teacher_scores[])`.
- Good for list-wise distillation when you have multiple candidates per query.

See `../scripts/train_sentence_transformer_distillation_example.py` for the end-to-end pattern (its docstring covers Embedding MSE / Margin MSE / Listwise KL with full recipes).

## Regularizer / wrapper losses

These don't have their own data shape — they wrap another loss and add a regularization objective.

### `MatryoshkaLoss`

Train **once**, deploy at any of several dimensions. Wraps any loss and computes it at multiple truncated dimensions, adding them weighted.

```python
base_loss = MultipleNegativesRankingLoss(model)
loss = MatryoshkaLoss(
    model,
    base_loss,
    matryoshka_dims=[768, 512, 256, 128, 64],
    matryoshka_weights=[1, 1, 1, 1, 1],   # relative weighting per dim
)
```

- At inference, `SentenceTransformer(..., truncate_dim=128)` gives 128-dim output with ~95% of full quality.
- Default matryoshka_dims: pick the dims you want to deploy at. Smaller dims improve compression at the cost of slight quality drop.

### `Matryoshka2dLoss`

2D-Matryoshka: reduce dimension **and** number of transformer layers in a single wrapper. Internally composes `MatryoshkaLoss` + `AdaptiveLayerLoss`, so you only need this one (don't wrap it in AdaptiveLayerLoss yourself). Deploy at any (dim, layer) pair at inference.

### `AdaptiveLayerLoss`

Wrap any loss; adds a term that trains each of the transformer's layers to be a valid exit point. Deploy with fewer layers at inference for faster encoding.

```python
loss = AdaptiveLayerLoss(
    model,
    base_loss,
    n_layers_per_step=1,
    last_layer_weight=1.0,
    prior_layers_weight=1.0,
)
```

### `GlobalOrthogonalRegularizationLoss` (GOR)

Stand-alone regularizer (not a wrapper, despite living in this section). Penalizes embedding pairs whose dot product deviates from orthogonality, encouraging the model to spread embeddings across the full vector space. Use it alongside a primary contrastive loss by summing the two outputs in your own training step; can help with downstream retrieval diversity.

## Unsupervised losses

### `DenoisingAutoEncoderLoss` (TSDAE)

Sentence-level denoising autoencoder: corrupt a sentence (drop tokens), force the model to reconstruct it. Pretraining-style — useful for domain adaptation when you have unlabeled in-domain sentences.

### `ContrastiveTensionLoss`

Unsupervised contrastive: two copies of the model encode the same sentence; they should agree. Pure self-supervised.

### `ContrastiveTensionLossInBatchNegatives`

CT with in-batch negatives. Stronger than vanilla CT.

## Gotchas

- **`MultipleNegativesRankingLoss` without `BatchSamplers.NO_DUPLICATES`** will include duplicate anchors in the same batch, destroying training signal. Always set the sampler.
- **Any `Cached*` loss + `gradient_checkpointing=True` = crash.** Pick one.
- **`TripletLoss` with bad negatives** (too easy) = loss hits zero fast and model stops learning. Mine hard negatives first.
- **Matryoshka wrapping `CachedMultipleNegativesRankingLoss`**: supported, but the cached-loss's mini-batch semantics apply to the base loss only. Think twice before combining.
