---
name: arrowspace
description: "Spectral vector search using graph Laplacian eigenstructure. Use when cosine/L2 similarity misses latent structure in your embeddings."
category: data
risk: safe
source: community
source_repo: Genefold/arrowspace-skills
source_type: community
date_added: "2026-06-25"
author: Genefold AI
license: Apache-2.0
license_source: "https://github.com/Genefold/arrowspace-skills/blob/main/LICENSE"
tags: [vector-search, spectral-analysis, graph-laplacian, embeddings, lambda-tau]
tools: [claude, cursor, codex, gemini, opencode]
---

# ArrowSpace

Spectral vector search that augments nearest-neighbour search with graph Laplacian features. Computes a Laplacian over the item graph and uses the Rayleigh quotient to produce a λτ (lambda-tau) score per item, enabling search that respects both semantic similarity and structural role.

## When to Use This Skill

- Cosine or L2 similarity misses latent structure in your embeddings
- You want graph-based retrieval with spectral awareness
- You need to characterise the spectral properties of an embedding space
- You are building RAG pipelines where contextual role matters alongside semantic content

## How It Works

### Step 1: Install and import

```bash
python3 -m pip install "arrowspace==0.28.1" numpy  # review/pin remaining dependencies in an isolated environment
```

```python
from arrowspace import ArrowSpaceBuilder
import numpy as np
```

### Step 2: Prepare your data

Pass an (N, d) float64 NumPy array of embedding vectors:

```python
rng = np.random.default_rng(7)
items = rng.normal(size=(32, 8)).astype(np.float64)
items /= np.linalg.norm(items, axis=1, keepdims=True)
```

### Step 3: Configure graph parameters

```python
graph_params = {"eps": 0.5, "k": 6, "topk": 3, "p": 2.0, "sigma": None}
aspace, graph = ArrowSpaceBuilder().build(graph_params, items)
```

### Step 4: Query

```python
lambdas = aspace.lambdas()           # array indexed by insertion order
sorted_res = aspace.lambdas_sorted()  # (score, index) pairs ascending
```

These are per-item spectral signatures, not graph eigenvalues or query-dependent relevance scores. Sorting them alone is not nearest-neighbor retrieval; do not infer closeness to a query or graph centrality from a large signature.

## Examples

### Example 1: Basic spectral retrieval

```python
# Reuse the normalized corpus and graph above; verify degenerate scores first.
if np.any(np.abs(aspace.lambdas()) < 1e-12):
    raise ValueError("Tune graph parameters for this corpus before searching")
query = items[0].copy()
hits = aspace.search(query, graph, tau=0.7, k=5)
# hits contains query-dependent (item_index, score) pairs, not a lambda-only ranking.
```

### Example 2: Compare spectral vs cosine ranking

```python
from sklearn.metrics.pairwise import cosine_similarity
cos_sim = cosine_similarity(items)
cosine_order = np.argsort(cos_sim[0])[::-1][:5]
spectral_order = [index for index, score in aspace.search(items[0], graph, tau=0.7, k=5)]
# For retrieval evaluation, exclude self-matches and use held-out relevance labels.
```

## Best Practices

- ✅ Normalise embeddings to unit norm before passing to ArrowSpace
- ✅ Treat graph parameters as corpus-dependent; inspect disconnected/degenerate scores and tune using an explicitly selected objective
- ✅ Choose k relative to the actual corpus and library constraints; N/50 is not a universal quality guarantee
- ✅ In the reviewed 0.28 API, sigma=None uses the eps-dependent default; it is not automatic distribution fitting
- ✅ Small corpora can illustrate the API, but retrieval quality requires corpus-appropriate evaluation; ten items is not a mathematical validity threshold
- ❌ Don't use for real-time streaming data (ArrowSpace is batch-oriented)

## Limitations

- API examples target the reviewed 0.28 interface; [immutable upstream skill](https://github.com/Genefold/arrowspace-skills/blob/8d9e8e30be314292e2ee60b84f0c163963660d41/SKILL.md) documents the builder, graph return value and query-aware search. These examples were checked against source documentation, not executed here.
- Fit graph parameters and tau on held-out retrieval evidence; λτ signatures alone do not prove better recall or structural importance.
- ArrowSpace is batch-oriented and not designed for real-time indexing of streaming data.

## Common Pitfalls

- **Problem:** eps is too small, producing a disconnected graph
  **Solution:** Inspect graph connectivity and degenerate scores, then tune eps against the actual data; no dimension-only formula is guaranteed

- **Problem:** k is too large, producing a dense graph with washed-out spectral features
  **Solution:** Tune k against actual corpus size, graph connectivity, library bounds and held-out relevance; no universal cap of 25 establishes quality

## Related Skills

- `vector-database-engineer` — General vector database expertise
- `embedding-strategies` — Embedding model selection and chunking
- `similarity-search-patterns` — Semantic search implementation patterns
- `hybrid-search-implementation` — Combined semantic + keyword search
