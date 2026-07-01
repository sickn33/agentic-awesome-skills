---
name: train-sentence-transformers
description: Train or fine-tune sentence-transformers models across `SentenceTransformer` (bi-encoder; dense or static embedding model; for retrieval, similarity, clustering, classification, paraphrase mining, dedup, multimodal), `CrossEncoder` (reranker; pair scoring for two-stage retrieval / pair...
risk: unknown
source: https://github.com/huggingface/skills/tree/main/skills/train-sentence-transformers
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Train a sentence-transformers Model
## When to Use

Use this skill when you need train or fine-tune sentence-transformers models across `SentenceTransformer` (bi-encoder; dense or static embedding model; for retrieval, similarity, clustering, classification, paraphrase mining, dedup, multimodal), `CrossEncoder` (reranker; pair scoring for two-stage retrieval / pair...


**This SKILL.md is a router, not a manual.** It tells you which references and example scripts to load for your task. The actual content — recommended losses, evaluators, training-script structure, model selection, training-arg knobs, troubleshooting — lives in `references/` and `scripts/`.

**Do not synthesize a training script from this file alone.** Open the per-type production template (`scripts/train_<type>_example.py`) and copy it as your starting point. The templates contain load-bearing scaffolding (autocast helper, model-card class, logger silencing list, `force=True`, `seed`, TF32, version-compatible imports, named-evaluator metric handling) that prior agent runs have repeatedly missed when rolling their own from a synthesized snippet.

## 1. Identify the model type

| Tag | Class | What it does | When to pick |
|---|---|---|---|
| **[SentenceTransformer]** | `SentenceTransformer` (bi-encoder) | Maps each input to a fixed-dim dense vector | Retrieval, similarity, clustering, classification, paraphrase mining, dedup |
| **[CrossEncoder]** | `CrossEncoder` (reranker) | Scores `(query, passage)` pairs jointly | Two-stage retrieval (rerank top-100 from bi-encoder), pair classification |
| **[SparseEncoder]** | `SparseEncoder` (SPLADE) | Sparse vectors over the vocabulary | Learned-sparse retrieval, inverted-index backends (Elasticsearch / OpenSearch / Lucene) |

Tiebreakers when the request is ambiguous: "embedding model" / "vector search" / "similarity" → **[SentenceTransformer]**. "rerank" / "ranker" / "two-stage" → **[CrossEncoder]**. "SPLADE" / "sparse" / "inverted index" → **[SparseEncoder]**. If still unclear, ask.

## 2. Required reading

**Read these in full before writing any code. Do not triage by perceived relevance.**

### Per-type — always required

**[SentenceTransformer]**
- `references/losses_sentence_transformer.md` — loss-to-data-shape mapping; `BatchSamplers.NO_DUPLICATES` requirement for MNRL-family; `Cached*` ↔ `gradient_checkpointing` incompatibility.
- `references/evaluators_sentence_transformer.md` — evaluator-to-task mapping; `metric_for_best_model` key construction (named vs unnamed); per-evaluator `primary_metric` values.
- `references/model_architectures.md` — encoder vs decoder vs static vs Router pipelines; pooling rules (mean / cls / lasttoken); auto-mean-pooling behavior for fresh-start MLM bases.
- `scripts/train_sentence_transformer_example.py` — production template; copy this as your starting point.

**[CrossEncoder]**
- `references/losses_cross_encoder.md` — pointwise / pairwise / listwise / distillation; `pos_weight` derivation; `activation_fn=Identity()` mandatory for non-BCE losses (silent eval-rank collapse otherwise).
- `references/evaluators_cross_encoder.md` — `CrossEncoderRerankingEvaluator` recipe; named-evaluator key format `eval_{name}_{primary_metric}`.
- `scripts/train_cross_encoder_example.py` — production template; copy this as your starting point.

**[SparseEncoder]**
- `references/losses_sparse_encoder.md` — `SpladeLoss` wrapper requirement; FLOPS regularizer weights; smoke-test active-dim ramp behavior.
- `references/evaluators_sparse_encoder.md` — `SparseNanoBEIREvaluator` (English-only) and the in-domain alternative; `eval_{name}_{primary_metric}` key format.
- `scripts/train_sparse_encoder_example.py` — production template; copy this as your starting point.

### Cross-cutting — always required (regardless of task)

- `references/training_args.md` — `TrainingArguments` knobs, precision rules (load fp32 + autocast bf16/fp16; never `torch_dtype=bfloat16`), `warmup_steps` (float) vs deprecated `warmup_ratio`, `save_steps` must be a multiple of `eval_steps` for `load_best_model_at_end`, schedulers, HPO, tracker, resume, hub-push variants.
- `references/dataset_formats.md` — column-matching rules (label name auto-detection; column-order-not-name); reshaping recipes; hard-negative mining options.
- `references/base_model_selection.md` — discovery commands; per-type model namespaces; ModernBERT-family `max_seq_length=8192` trap; `datasets >= 4` script-loader rejection; non-English starting-point shortcuts.
- `references/troubleshooting.md` — symptom-indexed failure recipes. Skim the section headings on every run, even a healthy one; the "Metrics don't improve" and "Hub push fails" entries cover bugs that bite frequently and are cheaper to recognize before they fire than to debug after.

### Cross-cutting — load when applicable

- `references/hardware_guide.md` — VRAM sizing, multi-GPU, FSDP / DeepSpeed, HF Jobs flavors. Required for >24GB models, multi-GPU, or HF Jobs runs.
- `references/hf_jobs_execution.md` — required when running on HF Jobs.
- `references/prompts_and_instructions.md` — required when using prompt-tuned bases (E5, BGE, GTE, Qwen3-Embedding, Instructor, Nomic, etc.) or adding `query: ` / `passage: ` style prefixes.

### Variant scripts (open when the task matches)
- **[SentenceTransformer]** `scripts/train_sentence_transformer_<matryoshka|multi_dataset|with_lora|distillation|make_multilingual|static_embedding>_example.py`.
- **[CrossEncoder]** `scripts/train_cross_encoder_<distillation|listwise>_example.py`.
- **[SparseEncoder]** `scripts/train_sparse_encoder_distillation_example.py`.
- Hard-negative mining CLI — `scripts/mine_hard_negatives.py`.

## 3. Defaults

Override only if the user specifies otherwise:
- **Local execution.** Pitch HF Jobs only if local hardware can't fit the job.
- **Single run.** After it completes, propose experimentation if the user would benefit (weak/marginal verdict, "see how high you can push it" framing, etc.). Iteration rules in `references/training_args.md` (Experimentation section).
- **Public Hub push at end-of-run, wrapped in try-except.** On HF Jobs (ephemeral env) ALSO enable in-trainer push (`push_to_hub=True` + `hub_strategy="every_save"`); details in `references/hf_jobs_execution.md`.

## 4. Constraints the produced script must satisfy

These are non-negotiable contracts. Implementation lives in the production templates and references — do not reinvent.

- Capture the pre-training evaluator score as `baseline_eval` **before** `trainer.train()`.
- Emit a single end-of-run line: `VERDICT: WIN|MARGINAL|REGRESSION | score=... | baseline=... | delta=...`. A monitor scrapes for this.
- Silence `httpx`, `httpcore`, `huggingface_hub`, `urllib3`, `filelock`, `fsspec` to WARNING (otherwise HF download URLs flood the agent's context).
- Tee logs to `logs/{RUN_NAME}.log`.
- End with `model.push_to_hub(...)` wrapped in `try/except`.
- Smoke-test before any long run (`max_steps=1` + tiny dataset slice). The production templates show one common pattern (`SMOKE_TEST` env var).
- **[CrossEncoder]** Include `EarlyStoppingCallback(patience>=3)` — CE rerankers often peak mid-training and regress.
- **[SparseEncoder]** Log `query_active_dims` / `corpus_active_dims` on the verdict line; high nDCG with collapsed sparsity is not a win. The keys come back name-prefixed (e.g. `..._query_active_dims`); use suffix matching to pluck them — see the SPARSE production template for the exact pattern.

## 5. Workflow

1. Identify the model type (§1). Ask if ambiguous.
2. Load the §2 required-reading files for that type.
3. Open `scripts/train_<type>_example.py` and copy it as your starting point.
4. Replace `MODEL_NAME`, `DATASET_NAME`, `RUN_NAME`, the loss, and the evaluator with the user's task. Cross-check loss/data-shape match against `references/losses_<type>.md`; cross-check the `metric_for_best_model` key against `references/evaluators_<type>.md` (named evaluators format the key as `eval_{name}_{primary_metric}`).
5. Smoke-test (`max_steps=1`).
6. Run.
7. After the run, append to `logs/experiments.md` and propose iteration if the verdict is weak/marginal.

## Prerequisites

```bash
pip install "sentence-transformers[train]>=5.0"        # add [train,image] / [audio] / [video] for [SentenceTransformer] multimodal
pip install trackio                                    # optional tracker; or wandb / tensorboard / mlflow
hf auth login                                          # or set HF_TOKEN with write scope (for Hub push)
```

GPU strongly recommended. CPU works only for demos and `[SentenceTransformer]` `StaticEmbedding`.

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
