# Base Model Selection

Leaderboards rotate every few months; don't trust any hardcoded "best" pick. Discover current options live — run **both** sort orders since most-downloaded surfaces proven options and trending surfaces recent SOTA that may not have download volume yet.

## Discovery commands

**[BI]**:
```bash
hf models list --filter sentence-transformers --sort downloads --limit 20
hf models list --filter sentence-transformers --sort trending  --limit 20
```

**[CE]**:
```bash
hf models list --filter sentence-transformers --filter text-ranking --sort downloads --limit 20
hf models list --filter sentence-transformers --filter text-ranking --sort trending  --limit 20
```

**[SPARSE]**:
```bash
hf models list --filter sentence-transformers --filter sparse-encoder --sort downloads --limit 20
hf models list --filter sentence-transformers --filter sparse-encoder --sort trending  --limit 20
```

Optional language narrowing (any type): add `--filter <language-code>`. Not all multilingual models tag each language, so missing matches doesn't mean the model can't handle that language — re-run without the filter to compare.

```bash
hf models card <id> --text                        # confirm dimensions, max_seq_length, license, languages
```

Cross-check the [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) (pick the relevant tab) before committing to a multi-hour run.

## [BI] Bi-Encoder

Continue from an existing retriever beats fresh-start + 100k–500k pairs. Common namespaces as of 2026-Q2 (verify against discovery commands — the field rotates):

- **English encoder retrievers**: `sentence-transformers/all-*` (MiniLM-L6-v2, mpnet-base-v2 still the most-downloaded models on the Hub), `BAAI/bge-*-en-v1.5`, `nomic-ai/nomic-embed-text-v1.5`, `mixedbread-ai/mxbai-embed-large-v1`, `Alibaba-NLP/gte-*`, `Snowflake/snowflake-arctic-embed-*`, `jinaai/jina-embeddings-v5-text-small` / `-nano`, `microsoft/harrier-oss-v1-270m` / `-0.6b`.
- **Multilingual encoder retrievers**: `sentence-transformers/paraphrase-multilingual-*`, `intfloat/multilingual-e5-*`, `ibm-granite/granite-embedding-*-multilingual-r2`, `google/embeddinggemma-300m`, `voyageai/voyage-4-nano`.
- **Long documents (8k+)**: `nomic-ai/modernbert-embed-*`, `answerdotai/ModernBERT-large`.
- **Decoder LLM retrievers** (multilingual; **need last-token pooling**): `Qwen/Qwen3-Embedding-*` (0.6B / 4B / 8B), `Qwen/Qwen3-VL-Embedding-*` (multimodal), `codefuse-ai/F2LLM-v2-*`.
- **Fresh-start English** (≥500k pairs + domain-fit reason): `microsoft/mpnet-base`, `answerdotai/ModernBERT-base`, `google-bert/bert-base-uncased`, `jhu-clsp/ettin-encoder-*` (17m / 32m / 68m / 150m / 400m / 1b — paired ModernBERT encoder family).
- **Fresh-start multilingual**: `FacebookAI/xlm-roberta-base` (MLM-only, needs contrastive training), `microsoft/mdeberta-v3-base`, `jhu-clsp/mmBERT-base` / `-small`.
- **CPU / small footprint** (`StaticEmbedding`): `StaticEmbedding(tokenizer, embedding_dim=...)`. **Model size = `vocab_size × dim × 4 bytes`** — pick a small-vocab tokenizer or you get a giant model: 30k-vocab `bert-base-uncased` × 128 dim ≈ 15 MB; **250k-vocab `paraphrase-multilingual-MiniLM-L12-v2` × 256 dim ≈ 256 MB**. Random init needs 1M+ pairs; warm-start (`StaticEmbedding.from_distillation(...)`) helps under ~100k pairs.

Architecture variants (encoder / decoder / static / Router), pooling rules, and decoder-vs-encoder setup paths: `model_architectures.md`.

**ModernBERT-family bases default to `max_seq_length=8192`.** That allocates activation memory for 8192-token sequences regardless of your data length and silently drives Windows VRAM into "shared memory" spillover. After loading any ModernBERT / mmBERT / Ettin / gte-modernbert / nomic-modernbert base, **explicitly set `model.max_seq_length = 256` (or 512 for documents)** unless you actually need long context.

## [CE] Cross-Encoder

Continue from an existing reranker beats fresh-start + 100k–500k pairs in most domains; default to this unless you have a strong reason otherwise. Common namespaces as of 2026-Q2:

- **English encoder rerankers**: `cross-encoder/ms-marco-*`, `BAAI/bge-reranker-*`, `mixedbread-ai/mxbai-rerank-*-v1` / `-v2`, `Alibaba-NLP/gte-reranker-modernbert-*`, `ibm-granite/granite-embedding-reranker-english-*`.
- **Multilingual encoder rerankers**: `cross-encoder/mmarco-*`, `BAAI/bge-reranker-v2-m3`, `Alibaba-NLP/gte-multilingual-reranker-*`, `ibm-granite/granite-embedding-reranker-multilingual-*`.
- **Decoder LLM rerankers** (multilingual; `num_labels=1` last-token-style scoring): `Qwen/Qwen3-Reranker-*` (0.6B / 4B / 8B), `Qwen/Qwen3-VL-Reranker-*` (multimodal).
- **Fresh-start**: `microsoft/MiniLM-L12-H384-uncased`, `answerdotai/ModernBERT-base` / `-large`, `jhu-clsp/ettin-encoder-*`, `FacebookAI/xlm-roberta-base` (multilingual), `microsoft/mdeberta-v3-base` (multilingual), `jhu-clsp/mmBERT-base` / `-small` (multilingual). Pass `num_labels >= 2` for classification cross-encoders.

Encoder-only bases are still the latency-efficient default (bidirectional attention is well-suited to the reranking use case at small parameter counts), but decoder LLM rerankers are now competitive at the top of MTEB Reranking when latency / memory budget allows.

**Minimum dataset:** 500k+ labeled `(query, passage, label)` tuples for production; 10k–100k labeled pairs for continue-training on domain data. Low-resource languages may have less than 10k labeled pairs; in that case lean on a multilingual base's pretraining and accept a noisier signal.

**"Small" multilingual is ~100M+ params**, not 17M-50M like the English small models. mMiniLMv2-L12-H384 (~117M) is roughly the small-end for usable multilingual rerankers.

## [SPARSE] Sparse Encoder (SPLADE)

SPLADE requires a fill-mask / `AutoModelForMaskedLM`-compatible checkpoint. Encoder-only MLM models work out of the box; **decoder LLMs do not**.

- **Continue from existing SPLADE — English**: `naver/splade-*` (the canonical family), `opensearch-project/opensearch-neural-sparse-encoding-*` (incl. `-doc-v2-distill`, `-doc-v3-distill` / `-doc-v3-gte`), `prithivida/Splade_PP_en_v*`, `ibm-granite/granite-embedding-30m-sparse`.
- **Continue from existing SPLADE — multilingual**: `opensearch-project/opensearch-neural-sparse-encoding-multilingual-v1`.
- **Fresh-start English** (≥500k pairs): any encoder with an MLM head — `distilbert/distilbert-base-uncased`, `google-bert/bert-base-uncased`. Pure `AutoModel` checkpoints without MLM won't work. Discover MLM bases: `hf models list --filter fill-mask --sort downloads --limit 20`.
- **Fresh-start multilingual**: `FacebookAI/xlm-roberta-base` (has MLM head). For other multilingual MLM bases: add `--filter <language-code>`.

**Minimum dataset:** 500k+ triplets (with mined hard negatives) for a competitive SPLADE; 50k+ triplets for domain adaptation on existing SPLADE.

## Cross-cutting tips

- **Non-English retrieval starting points** (when language tag returns 0 results): check `intfloat/multilingual_e5_train_data` for parallel pair data; MIRACL via the `sentence-transformers/miracl` mirror for multilingual retrieval; mMARCO via `unicamp-dl/mmarco` (14 languages, parquet-backed).
- **Avoid script-based dataset loaders.** `datasets >= 4` rejects them with `RuntimeError: Dataset scripts are no longer supported`. Look for parquet-backed mirrors (e.g. `sentence-transformers/miracl` instead of `miracl/miracl`).
- **`hf datasets sql` requires DuckDB** (`pip install duckdb`). Without it, fall back to `python -c "from datasets import load_dataset; ds = load_dataset('<id>', ...); print(ds.column_names, ds[0])"`.
