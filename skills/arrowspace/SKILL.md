---
name: arrowspace
description: "Spectral vector search using graph Laplacian eigenstructure. Use when cosine/L2 similarity misses latent structure in your embeddings."
category: data
risk: safe
source: self
source_repo: Genefold/arrowspace-skills
source_type: community
date_added: "2026-06-25"
author: Genefold AI
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
pip install arrowspace
```

```python
from arrowspace import ArrowSpaceBuilder
import numpy as np
```

### Step 2: Prepare your data

Pass an (N, d) float64 NumPy array of embedding vectors:

```python
items = np.array([[0.1, 0.2, 0.3],
                  [0.0, 0.5, 0.1],
                  [0.9, 0.1, 0.0]], dtype=np.float64)
```

### Step 3: Configure graph parameters

```python
graph_params = {"eps": 0.2, "k": 6, "topk": 3, "p": 2.0, "sigma": 1.0}
builder = ArrowSpaceBuilder(items, graph_params=graph_params)
aspace = builder.build()
```

### Step 4: Query

```python
lambdas = aspace.lambdas()           # array indexed by insertion order
sorted_res = aspace.lambdas_sorted()  # (score, index) pairs ascending
```

Higher λτ values indicate items that are both semantically close and structurally central.

## Examples

### Example 1: Basic spectral retrieval

```python
items = np.random.randn(100, 64).astype(np.float64)
builder = ArrowSpaceBuilder(items, graph_params={"eps": 0.5, "k": 10, "topk": 5, "p": 2.0, "sigma": None})
aspace = builder.build()
scores = aspace.lambdas()
top_indices = np.argsort(scores)[-5:]
```

### Example 2: Compare spectral vs cosine ranking

```python
from sklearn.metrics.pairwise import cosine_similarity
cos_sim = cosine_similarity(items)
cosine_order = np.argsort(cos_sim[0])[::-1]
spectral_order = np.argsort(aspace.lambdas())[::-1]
```

## Best Practices

- ✅ Normalise embeddings to unit norm before passing to ArrowSpace
- ✅ Start with eps proportional to 1/sqrt(dim) and tune from there
- ✅ Use k between 3 and 25 depending on dataset size (rule: N/50)
- ✅ Set sigma=None to auto-select kernel width from distance distribution
- ❌ Don't use with fewer than 10 items (graph structure is not meaningful)
- ❌ Don't use for real-time streaming data (ArrowSpace is batch-oriented)

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- ArrowSpace is batch-oriented and not designed for real-time indexing of streaming data.

## Common Pitfalls

- **Problem:** eps is too small, producing a disconnected graph
  **Solution:** Increase eps, or set it proportional to 1/sqrt(embedding_dim)

- **Problem:** k is too large, producing a dense graph with washed-out spectral features
  **Solution:** Keep k ≤ 25 for most datasets

## Related Skills

- `vector-database-engineer` — General vector database expertise
- `embedding-strategies` — Embedding model selection and chunking
- `similarity-search-patterns` — Semantic search implementation patterns
- `hybrid-search-implementation` — Combined semantic + keyword search
