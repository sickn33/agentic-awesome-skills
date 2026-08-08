# Cross-Encoder Losses (reranker)

All losses live in `sentence_transformers.cross_encoder.losses`.

Cross-encoder losses fall into three families: **pointwise** (score each pair independently), **pairwise** (score pairs of pairs), and **listwise** (score a whole ranked list at once). Plus contrastive/distillation variants for specific setups.

## Top-line decision table

| You have | Use | Family |
|---|---|---|
| `(query, passage, label)` with `label ∈ {0, 1}` or `[0, 1]` | `BinaryCrossEntropyLoss` | Pointwise |
| `(query, passage, class_id)` multi-class | `CrossEntropyLoss` | Pointwise |
| `(query, passage)` with implicit positives, want contrastive | `CachedMultipleNegativesRankingLoss` | Contrastive |
| `(query, passages, labels)` (one row per query, with parallel lists of candidate passages and their relevance scores) | `LambdaLoss` | Listwise |
| Same listwise shape, want well-tested simpler loss | `ListNetLoss` or `ListMLELoss` | Listwise |
| `(query, positive, negative)` pairwise | `RankNetLoss` | Pairwise |
| `(query, passage, teacher_score)` distillation from stronger reranker | `MSELoss` or `MarginMSELoss` | Distillation |

## Pointwise losses

### `BinaryCrossEntropyLoss`

**The default cross-encoder loss.** For `(query, passage, label)` where label is 0/1 or a continuous [0, 1] relevance score.

```python
loss = BinaryCrossEntropyLoss(model, pos_weight=torch.tensor(5.0))
```

- `pos_weight`: upweight positives when your dataset is imbalanced (e.g. 1 positive + N hard negatives). A good default is `pos_weight = num_hard_negatives`.
- Handles both binary labels and continuous relevance scores — if you have graded relevance (0.0, 0.5, 1.0) BCE still works.

### `CrossEntropyLoss`

Multi-class classification over passages. Use with `CrossEncoder("...", num_labels=N)` where N is the number of classes (e.g. 3 for NLI: entailment / neutral / contradiction).

## Contrastive losses (for reranker training)

### `MultipleNegativesRankingLoss` (cross-encoder)

Contrastive training mirroring bi-encoder MNRL. Applies in-batch negatives: for each `(query, positive)`, every other `positive` in the batch is used as a negative.

- **Data**: `(query, positive)` or `(query, positive, negative_0, negative_1, ...)`.
- For CrossEncoder training, **prefer `BinaryCrossEntropyLoss` with mined hard negatives** as the default; MNRL is the fallback when you only have `(query, positive)` pairs and want to avoid a separate mining pass.

### `CachedMultipleNegativesRankingLoss`

Cached variant (GradCache) — decouples per-device batch size from effective in-batch negatives, same as the bi-encoder cached version.

```python
loss = CachedMultipleNegativesRankingLoss(model, mini_batch_size=16)
```

- Incompatible with `gradient_checkpointing=True`.
- Key choice for training rerankers with effective batch 256+ on a single GPU.

## Distillation losses

> **`activation_fn=nn.Identity()` is mandatory** for all distillation, listwise, and pairwise losses below — only `BinaryCrossEntropyLoss` and `CrossEntropyLoss` tolerate the default `Sigmoid`. The loss sees raw logits during training, but the model's `activation_fn` is applied at evaluation via `predict()`; the default `Sigmoid` (with `num_labels=1`) saturates raw logits >5 to ~1.0 inside `predict()`, silently collapsing eval ranking (training loss looks healthy while nDCG crashes from ~0.59 to ~0.14). Construct as `CrossEncoder("...", num_labels=1, activation_fn=torch.nn.Identity())`. See `troubleshooting.md` ("CrossEncoder eval nDCG crashes after distillation / listwise / pairwise training") for the failure-mode walkthrough.

### `MSELoss` (cross-encoder)

Regress the student's output score to the teacher's score. Construct the model with `activation_fn=nn.Identity()` (see callout above).

- **Data**: `(query, passage, teacher_score)`.
- The teacher is typically a larger/stronger cross-encoder. Precompute its scores once, store as the label.

### `MarginMSELoss` (cross-encoder)

Regress the **difference** between positive and negative scores against the teacher's margin. Typically gives better distillation than plain MSE.

- **Data**: `(query, positive, negative, score_diff)` where `score_diff = teacher_score(query, positive) - teacher_score(query, negative)`.
- Popular recipe for MS MARCO-style distillation.

## Listwise losses

All listwise losses expect the dataset to have per-query **lists** of candidate passages and their scores — typically via a collator that groups rows by query.

> Listwise and pairwise losses below also require `activation_fn=nn.Identity()` (see the Distillation-section callout above).

### `LambdaLoss`

The state-of-the-art listwise ranking loss. Optimizes a surrogate of nDCG via weighted pairwise comparisons.

**Data shape**: `(query, [doc1...docN], [score1...scoreN])` per row; One query, a list of candidate documents, and a parallel list of relevance scores. Use `mine_hard_negatives(..., output_format="labeled-list", ...)` to build this from `(query, positive)` pairs.

```python
import torch.nn as nn
from sentence_transformers.cross_encoder.losses import LambdaLoss, NDCGLoss2PPScheme

model = CrossEncoder("...", num_labels=1, activation_fn=nn.Identity())
loss = LambdaLoss(model, weighting_scheme=NDCGLoss2PPScheme())
```

- Strong default when you have multiple candidates per query and graded relevance.
- `weighting_scheme`: `NDCGLoss2PPScheme` (default), `NDCGLoss2Scheme`, `LambdaRankScheme`. The `NDCGLoss2PPScheme` default was shown to reach the strongest performance in the original LambdaLoss paper.

#### LambdaLoss-specific operational notes

- **OOM recovery order**: drop `mini_batch_size` first (chunking inside the loss preserves the K-list semantic), then `per_device_train_batch_size` paired with `gradient_accumulation_steps`, then reduce K (the per-query candidate-list length) only as a last resort. Lowering K changes the experiment; the others don't.
- **Tiny loss at large K is expected.** With `NDCGLoss2PPScheme`, the loss normalizes by the discount-weighted pair count — at K=128 the loss can scale to ~`1e-4` numerically. That's not "training broken"; read `eval_NanoBEIR_R100_mean_ndcg@10` (or your equivalent) instead of the training loss to judge progress.
- For very large K (>=128), the O(K²) weight buffer per query is materialized outside of the forward chunking, so even small `mini_batch_size` may not be enough. Consider scoring strategy: top-K hard negatives often beat random K.

### `ListNetLoss`

Treats the ranking as a probability distribution (via softmax) and minimizes cross-entropy against the teacher distribution.

### `ListMLELoss`

Maximum-likelihood estimation over permutations. Simpler than LambdaLoss; decent default.

### `PListMLELoss`

Position-aware ListMLE — weights higher-ranked items more heavily. Often outperforms plain ListMLE on top-k metrics.

### `RankNetLoss`

Pairwise classification: for each pair of candidates, predict which is ranked higher via cross-entropy.

- Simpler and faster than LambdaLoss.
- Scales quadratically with list length; not great for long candidate lists (>20).

### `ADRMSELoss`

Alternative listwise formulation (Approx Discounted Rank MSE) from the Rank-DistiLLM paper. Same data shape as `LambdaLoss`. In practice LambdaLoss is the stronger default; `RankNetLoss` was reported as marginally more effective (~0.002 nDCG@10) than ADRMSELoss on the paper's LLM-distillation setup, and LambdaLoss generally beats both.

Hard-negative mining is essential for any contrastive reranker (random negatives teach nothing). See `dataset_formats.md` (Hard-negative mining section) and `../scripts/mine_hard_negatives.py`.

## Gotchas

- **`BinaryCrossEntropyLoss` without `pos_weight`** when you have 5+ hard negatives per positive: the loss under-weights the positive signal. Set `pos_weight=num_hard_negatives`.
- **`CachedMultipleNegativesRankingLoss` + `gradient_checkpointing=True`**: crash. Pick one.
- **Listwise losses with wildly different list lengths per query**: some losses don't handle ragged lists well. Pad or truncate to a fixed length.
- **`MarginMSELoss` without precomputed teacher score diffs**: this loss needs the `score_diff` label column populated from a teacher pass; it does not compute the teacher internally.
- **Training a cross-encoder with `num_labels=1` then using `CrossEntropyLoss`**: mismatch — BCE is for num_labels=1, CE is for num_labels>=2.
- **Default `Sigmoid` activation under any non-BCE loss**: silently destroys eval ranking. Pass `activation_fn=torch.nn.Identity()` to `CrossEncoder(...)` for distillation, listwise, and pairwise losses (everything except BCE/CE). See the callouts in the Distillation and Listwise sections.
- **Custom CE head writing to the wrong feature key**: a custom scoring head must populate `features["scores"]` (not `features["sentence_embedding"]`). Otherwise `CrossEncoder.predict()` raises `KeyError: 'scores'` at inference time, even though training succeeds.
- **Loading a CE with a custom-class head fails from a different script**: if you defined a `class ClassifierHead(nn.Module)` inline in `train.py` and saved the model, `modules.json` records `__main__.ClassifierHead`. Loading via `CrossEncoder("path")` from any other entry point raises `ImportError: Module '__main__' does not define a 'ClassifierHead' attribute`. Either move the class into an importable file (`my_pkg/heads.py`), build the same shape from stock ST modules (`Dense + LayerNorm + Dense`), or document that the model is only loadable from the same script.
