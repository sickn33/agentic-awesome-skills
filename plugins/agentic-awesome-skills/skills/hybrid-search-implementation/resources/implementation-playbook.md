# Hybrid Search Implementation Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Hybrid Search Implementation

Patterns for combining vector similarity and keyword-based search.

## When to Use This Skill

- Building RAG systems with improved recall
- Combining semantic understanding with exact matching
- Handling queries with specific terms (names, codes)
- Improving search for domain-specific vocabulary
- When pure vector search misses keyword matches

## Core Concepts

### 1. Hybrid Search Architecture

```
Query → ┬─► Vector Search ──► Candidates ─┐
        │                                  │
        └─► Keyword Search ─► Candidates ─┴─► Fusion ─► Results
```

### 2. Fusion Methods

| Method | Description | Best For |
|--------|-------------|----------|
| **RRF** | Reciprocal Rank Fusion | General purpose |
| **Linear** | Weighted sum of scores | Tunable balance |
| **Cross-encoder** | Rerank with neural model | Highest quality |
| **Cascade** | Filter then rerank | Efficiency |

## Templates

### Template 1: Reciprocal Rank Fusion

```python
from typing import List, Dict, Tuple
from collections import defaultdict

def reciprocal_rank_fusion(
    result_lists: List[List[Tuple[str, float]]],
    k: int = 60,
    weights: List[float] = None
) -> List[Tuple[str, float]]:
    """
    Combine multiple ranked lists using RRF.

    Args:
        result_lists: List of (doc_id, score) tuples per search method
        k: RRF constant (higher = more weight to lower ranks)
        weights: Optional weights per result list

    Returns:
        Fused ranking as (doc_id, score) tuples
    """
    if weights is None:
        weights = [1.0] * len(result_lists)

    scores = defaultdict(float)

    for result_list, weight in zip(result_lists, weights):
        for rank, (doc_id, _) in enumerate(result_list):
            # RRF formula: 1 / (k + rank)
            scores[doc_id] += weight * (1.0 / (k + rank + 1))

    # Sort by fused score
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def linear_combination(
    vector_results: List[Tuple[str, float]],
    keyword_results: List[Tuple[str, float]],
    alpha: float = 0.5
) -> List[Tuple[str, float]]:
    """
    Combine results with linear interpolation.

    Args:
        vector_results: (doc_id, similarity_score) from vector search
        keyword_results: (doc_id, bm25_score) from keyword search
        alpha: Weight for vector search (1-alpha for keyword)
    """
    # Normalize scores to [0, 1]
    def normalize(results):
        if not results:
            return {}
        scores = [s for _, s in results]
        min_s, max_s = min(scores), max(scores)
        range_s = max_s - min_s if max_s != min_s else 1
        return {doc_id: (score - min_s) / range_s for doc_id, score in results}

    vector_scores = normalize(vector_results)
    keyword_scores = normalize(keyword_results)

    # Combine
    all_docs = set(vector_scores.keys()) | set(keyword_scores.keys())
    combined = {}

    for doc_id in all_docs:
        v_score = vector_scores.get(doc_id, 0)
        k_score = keyword_scores.get(doc_id, 0)
        combined[doc_id] = alpha * v_score + (1 - alpha) * k_score

    return sorted(combined.items(), key=lambda x: x[1], reverse=True)
```

### Template 2: PostgreSQL Hybrid Search

```python
import asyncpg
from typing import List, Dict, Optional
import numpy as np

class PostgresHybridSearch:
    """Hybrid search with pgvector and full-text search."""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def setup_schema(self):
        """Create tables and indexes."""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE EXTENSION IF NOT EXISTS vector;

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    embedding vector(1536),
                    metadata JSONB DEFAULT '{}',
                    ts_content tsvector GENERATED ALWAYS AS (
                        to_tsvector('english', content)
                    ) STORED
                );

                -- Vector index (HNSW)
                CREATE INDEX IF NOT EXISTS documents_embedding_idx
                ON documents USING hnsw (embedding vector_cosine_ops);

                -- Full-text index (GIN)
                CREATE INDEX IF NOT EXISTS documents_fts_idx
                ON documents USING gin (ts_content);
            """)

    async def hybrid_search(
        self,
        query: str,
        query_embedding: List[float],
        limit: int = 10,
        vector_weight: float = 0.5,
        filter_metadata: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Perform hybrid search combining vector and full-text.

        Uses RRF fusion for combining results.
        """
        async with self.pool.acquire() as conn:
            # Build filter clause
            where_clause = "1=1"
            params = [query_embedding, query, limit * 3]

            if filter_metadata:
                for key, value in filter_metadata.items():
                    params.append(value)
                    where_clause += f" AND metadata->>'{key}' = ${len(params)}"

            results = await conn.fetch(f"""
                WITH vector_search AS (
                    SELECT
                        id,
                        content,
                        metadata,
                        ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) as vector_rank,
                        1 - (embedding <=> $1::vector) as vector_score
                    FROM documents
                    WHERE {where_clause}
                    ORDER BY embedding <=> $1::vector
                    LIMIT $3
                ),
                keyword_search AS (
                    SELECT
                        id,
                        content,
                        metadata,
                        ROW_NUMBER() OVER (ORDER BY ts_rank(ts_content, websearch_to_tsquery('english', $2)) DESC) as keyword_rank,
                        ts_rank(ts_content, websearch_to_tsquery('english', $2)) as keyword_score
                    FROM documents
                    WHERE ts_content @@ websearch_to_tsquery('english', $2)
                      AND {where_clause}
                    ORDER BY ts_rank(ts_content, websearch_to_tsquery('english', $2)) DESC
                    LIMIT $3
                )
                SELECT
                    COALESCE(v.id, k.id) as id,
                    COALESCE(v.content, k.content) as content,
                    COALESCE(v.metadata, k.metadata) as metadata,
                    v.vector_score,
                    k.keyword_score,
                    -- RRF fusion
                    COALESCE(1.0 / (60 + v.vector_rank), 0) * $4::float +
                    COALESCE(1.0 / (60 + k.keyword_rank), 0) * (1 - $4::float) as rrf_score
                FROM vector_search v
                FULL OUTER JOIN keyword_search k ON v.id = k.id
                ORDER BY rrf_score DESC
                LIMIT $3 / 3
            """, *params, vector_weight)

            return [dict(row) for row in results]

    async def search_with_rerank(
        self,
        query: str,
        query_embedding: List[float],
        limit: int = 10,
        rerank_candidates: int = 50
    ) -> List[Dict]:
        """Hybrid search with cross-encoder reranking."""
        from sentence_transformers import CrossEncoder

        # Get candidates
        candidates = await self.hybrid_search(
            query, query_embedding, limit=rerank_candidates
        )

        if not candidates:
            return []

        # Rerank with cross-encoder
        model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

        pairs = [(query, c["content"]) for c in candidates]
        scores = model.predict(pairs)

        for candidate, score in zip(candidates, scores):
            candidate["rerank_score"] = float(score)

        # Sort by rerank score and return top results
        reranked = sorted(candidates, key=lambda x: x["rerank_score"], reverse=True)
        return reranked[:limit]
```

### Template 3: Elasticsearch Hybrid Search

```python
from elasticsearch import Elasticsearch
from typing import List, Dict, Optional

class ElasticsearchHybridSearch:
    """Hybrid search with Elasticsearch and dense vectors."""

    def __init__(
        self,
        es_client: Elasticsearch,
        index_name: str = "documents"
    ):
        self.es = es_client
        self.index_name = index_name

    def create_index(self, vector_dims: int = 1536):
        """Create index with dense vector and text fields."""
        mapping = {
            "mappings": {
                "properties": {
                    "content": {
                        "type": "text",
                        "analyzer": "english"
                    },
                    "embedding": {
                        "type": "dense_vector",
                        "dims": vector_dims,
                        "index": True,
                        "similarity": "cosine"
                    },
                    "metadata": {
                        "type": "object",
                        "enabled": True
                    }
                }
            }
        }
        self.es.indices.create(index=self.index_name, body=mapping, ignore=400)

    def hybrid_search(
        self,
        query: str,
        query_embedding: List[float],
        limit: int = 10,
        boost_vector: float = 1.0,
        boost_text: float = 1.0,
        filter: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Hybrid search using Elasticsearch's built-in capabilities.
        """
        # Build the hybrid query
        search_body = {
            "size": limit,
            "query": {
                "bool": {
                    "should": [
                        # Vector search (kNN)
                        {
                            "script_score": {
                                "query": {"match_all": {}},
                                "script": {
                                    "source": f"cosineSimilarity(params.query_vector, 'embedding') * {boost_vector} + 1.0",
                                    "params": {"query_vector": query_embedding}
                                }
                            }
                        },
                        # Text search (BM25)
                        {
                            "match": {
                                "content": {
                                    "query": query,
                                    "boost": boost_text
                                }
                            }
                        }
                    ],
                    "minimum_should_match": 1
                }
            }
        }

        # Add filter if provided
        if filter:
            search_body["query"]["bool"]["filter"] = filter

        response = self.es.search(index=self.index_name, body=search_body)

        return [
            {
                "id": hit["_id"],
                "content": hit["_source"]["content"],
                "metadata": hit["_source"].get("metadata", {}),
                "score": hit["_score"]
            }
            for hit in response["hits"]["hits"]
        ]

    def hybrid_search_rrf(
        self,
        query: str,
        query_embedding: List[float],
        limit: int = 10,
        window_size: int = 100
    ) -> List[Dict]:
        """
        Hybrid search using Elasticsearch 8.x RRF.
        """
        search_body = {
            "size": limit,
            "sub_searches": [
                {
                    "query": {
                        "match": {
                            "content": query
                        }
                    }
                },
                {
                    "query": {
                        "knn": {
                            "field": "embedding",
                            "query_vector": query_embedding,
                            "k": window_size,
                            "num_candidates": window_size * 2
                        }
                    }
                }
            ],
            "rank": {
                "rrf": {
                    "window_size": window_size,
                    "rank_constant": 60
                }
            }
        }

        response = self.es.search(index=self.index_name, body=search_body)

        return [
            {
                "id": hit["_id"],
                "content": hit["_source"]["content"],
                "score": hit["_score"]
            }
            for hit in response["hits"]["hits"]
        ]
```

### Template 4: Custom Hybrid RAG Pipeline

```python
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass

@dataclass
class SearchResult:
    id: str
    content: str
    score: float
    source: str  # "vector", "keyword", "hybrid"
    metadata: Dict = None


class HybridRAGPipeline:
    """Complete hybrid search pipeline for RAG."""

    def __init__(
        self,
        vector_store,
        keyword_store,
        embedder,
        reranker=None,
        fusion_method: str = "rrf",
        vector_weight: float = 0.5
    ):
        self.vector_store = vector_store
        self.keyword_store = keyword_store
        self.embedder = embedder
        self.reranker = reranker
        self.fusion_method = fusion_method
        self.vector_weight = vector_weight

    async def search(
        self,
        query: str,
        top_k: int = 10,
        filter: Optional[Dict] = None,
        use_rerank: bool = True
    ) -> List[SearchResult]:
        """Execute hybrid search pipeline."""

        # Step 1: Get query embedding
        query_embedding = self.embedder.embed(query)

        # Step 2: Execute parallel searches
        vector_results, keyword_results = await asyncio.gather(
            self._vector_search(query_embedding, top_k * 3, filter),
            self._keyword_search(query, top_k * 3, filter)
        )

        # Step 3: Fuse results
        if self.fusion_method == "rrf":
            fused = self._rrf_fusion(vector_results, keyword_results)
        else:
            fused = self._linear_fusion(vector_results, keyword_results)

        # Step 4: Rerank if enabled
        if use_rerank and self.reranker:
            fused = await self._rerank(query, fused[:top_k * 2])

        return fused[:top_k]

    async def _vector_search(
        self,
        embedding: List[float],
        limit: int,
        filter: Dict
    ) -> List[SearchResult]:
        results = await self.vector_store.search(embedding, limit, filter)
        return [
            SearchResult(
                id=r["id"],
                content=r["content"],
                score=r["score"],
                source="vector",
                metadata=r.get("metadata")
            )
            for r in results
        ]

    async def _keyword_search(
        self,
        query: str,
        limit: int,
        filter: Dict
    ) -> List[SearchResult]:
        results = await self.keyword_store.search(query, limit, filter)
        return [
            SearchResult(
                id=r["id"],
                content=r["content"],
                score=r["score"],
                source="keyword",
                metadata=r.get("metadata")
            )
            for r in results
        ]

    def _rrf_fusion(
        self,
        vector_results: List[SearchResult],
        keyword_results: List[SearchResult]
    ) -> List[SearchResult]:
        """Fuse with RRF."""
        k = 60
        scores = {}
        content_map = {}

        for rank, result in enumerate(vector_results):
            scores[result.id] = scores.get(result.id, 0) + 1 / (k + rank + 1)
            content_map[result.id] = result

        for rank, result in enumerate(keyword_results):
            scores[result.id] = scores.get(result.id, 0) + 1 / (k + rank + 1)
            if result.id not in content_map:
                content_map[result.id] = result

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        return [
            SearchResult(
                id=doc_id,
                content=content_map[doc_id].content,
                score=scores[doc_id],
                source="hybrid",
                metadata=content_map[doc_id].metadata
            )
            for doc_id in sorted_ids
        ]

    async def _rerank(
        self,
        query: str,
        results: List[SearchResult]
    ) -> List[SearchResult]:
        """Rerank with cross-encoder."""
        if not results:
            return results

        pairs = [(query, r.content) for r in results]
        scores = self.reranker.predict(pairs)

        for result, score in zip(results, scores):
            result.score = float(score)

        return sorted(results, key=lambda x: x.score, reverse=True)
```

## Best Practices

### Do's
- **Tune weights empirically** - Test on your data
- **Use RRF for simplicity** - Works well without tuning
- **Add reranking** - Significant quality improvement
- **Log both scores** - Helps with debugging
- **A/B test** - Measure real user impact

### Don'ts
- **Don't assume one size fits all** - Different queries need different weights
- **Don't skip keyword search** - Handles exact matches better
- **Don't over-fetch** - Balance recall vs latency
- **Don't ignore edge cases** - Empty results, single word queries

## Resources

- [RRF Paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Vespa Hybrid Search](https://blog.vespa.ai/improving-text-ranking-with-few-shot-prompting/)
- [Cohere Rerank](https://docs.cohere.com/docs/reranking)
