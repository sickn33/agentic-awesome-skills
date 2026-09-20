---
name: rag-infrastructure
description: Build and operate Retrieval-Augmented Generation (RAG) infrastructure
  with vector stores, embedding pipelines, and hybrid search.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# RAG Infrastructure

Production infrastructure for Retrieval-Augmented Generation: ingest documents, generate embeddings, store in vector databases, and serve grounded LLM responses.

## When to Use This Skill

Use this skill when:
- Building a knowledge base Q&A system over internal documents
- Implementing semantic search over large document collections
- Reducing LLM hallucinations with retrieved context
- Setting up embedding pipelines and vector store infrastructure
- Deploying hybrid search (dense + sparse/BM25)

## Prerequisites

- Python 3.10+ with `pip`
- A vector database (Qdrant, Weaviate, Pinecone, or pgvector)
- An embedding model (OpenAI, Cohere, or local via `sentence-transformers`)
- An LLM endpoint (OpenAI API or self-hosted vLLM)
- Docker for local vector DB deployment

## Architecture Overview

```
Documents → Chunker → Embedder → Vector Store
                                      ↓
User Query → Embedder → Vector Store (search) → Reranker → LLM → Answer
```

## Embedding Pipeline

```python
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid

# Local embedding model (no API cost)
model = SentenceTransformer("BAAI/bge-large-en-v1.5")

# Connect to Qdrant
client = QdrantClient("http://localhost:6333")

# Create collection
client.create_collection(
    collection_name="knowledge-base",
    vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
)

def ingest_documents(docs: list[dict]):
    """Chunk, embed, and upsert documents."""
    points = []
    for doc in docs:
        chunks = chunk_text(doc["text"], chunk_size=512, overlap=50)
        embeddings = model.encode(chunks, batch_size=32, show_progress_bar=True)
        for chunk, embedding in zip(chunks, embeddings):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding.tolist(),
                payload={"text": chunk, "source": doc["source"], "title": doc["title"]},
            ))
    client.upsert(collection_name="knowledge-base", points=points)
    print(f"Ingested {len(points)} chunks")
```

## Chunking Strategies

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_text(text: str, chunk_size: int = 512, overlap: int = 50) -> list[str]:
    """Recursive character splitter — best general-purpose strategy."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)

# For code/markdown — use language-aware splitter
from langchain.text_splitter import MarkdownHeaderTextSplitter

headers = [("#", "H1"), ("##", "H2"), ("###", "H3")]
md_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers)
```

## Hybrid Search (Dense + Sparse)

```python
from qdrant_client.models import SparseVector, SparseVectorParams, NamedSparseVector
from fastembed import SparseTextEmbedding

# Qdrant hybrid collection (dense + BM25 sparse)
client.create_collection(
    collection_name="hybrid-kb",
    vectors_config={"dense": VectorParams(size=1024, distance=Distance.COSINE)},
    sparse_vectors_config={"sparse": SparseVectorParams()},
)

sparse_model = SparseTextEmbedding("prithivida/Splade_PP_en_v1")

def hybrid_search(query: str, top_k: int = 10) -> list[dict]:
    dense_vec = model.encode(query).tolist()
    sparse_vec = list(sparse_model.embed(query))[0]

    results = client.query_points(
        collection_name="hybrid-kb",
        prefetch=[
            {"query": dense_vec, "using": "dense", "limit": 20},
            {"query": SparseVector(indices=sparse_vec.indices.tolist(),
                                   values=sparse_vec.values.tolist()),
             "using": "sparse", "limit": 20},
        ],
        query={"fusion": "rrf"},   # Reciprocal Rank Fusion
        limit=top_k,
    )
    return [{"text": p.payload["text"], "score": p.score} for p in results.points]
```

## Reranking

```python
import cohere

co = cohere.Client("your-api-key")

def rerank(query: str, candidates: list[str], top_n: int = 5) -> list[str]:
    """Rerank retrieved chunks for relevance (improves RAG quality ~20-30%)."""
    response = co.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=candidates,
        top_n=top_n,
    )
    return [candidates[r.index] for r in response.results]

# Alternative: local reranker (no API cost)
from sentence_transformers import CrossEncoder
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def local_rerank(query: str, candidates: list[str], top_n: int = 5) -> list[str]:
    pairs = [[query, c] for c in candidates]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [text for text, _ in ranked[:top_n]]
```

## RAG Query Pipeline

```python
from openai import OpenAI

llm = OpenAI(base_url="http://localhost:8000/v1", api_key="..." # no real key needed for local endpoints)

def rag_query(user_question: str) -> str:
    # 1. Retrieve
    candidates = hybrid_search(user_question, top_k=20)
    texts = [c["text"] for c in candidates]

    # 2. Rerank
    top_chunks = local_rerank(user_question, texts, top_n=5)

    # 3. Generate
    context = "\n\n---\n\n".join(top_chunks)
    response = llm.chat.completions.create(
        model="meta-llama/Llama-3.1-8B-Instruct",
        messages=[
            {"role": "system", "content": (
                "Answer the question using only the provided context. "
                "If the answer isn't in the context, say so.\n\nContext:\n" + context
            )},
            {"role": "user", "content": user_question},
        ],
        temperature=0.1,
        max_tokens=1024,
    )
    return response.choices[0].message.content
```

## Docker Compose: Full RAG Stack

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant-data:/qdrant/storage
    ports:
      - "6333:6333"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

  ingestion-worker:
    build: ./ingestion
    environment:
      - QDRANT_URL=http://qdrant:6333
      - REDIS_URL=redis://redis:6379
    depends_on: [qdrant, redis]
    restart: unless-stopped

  rag-api:
    build: ./api
    ports:
      - "8080:8080"
    environment:
      - QDRANT_URL=http://qdrant:6333
      - LLM_BASE_URL=http://vllm:8000/v1
    depends_on: [qdrant]
    restart: unless-stopped

volumes:
  qdrant-data:
  redis-data:
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Poor retrieval quality | Chunk size too large | Try 256–512 tokens; overlap 10–15% |
| LLM ignores retrieved context | Context too long | Rerank and keep top 3–5 chunks |
| Slow ingestion | Sequential embedding | Use `batch_size=64` and async upserts |
| Stale documents | No re-ingestion pipeline | Track `doc_hash`; re-embed on change |
| High embedding costs | All chunks re-embedded | Cache embeddings with hash-based dedup |

## Best Practices

- Use `BAAI/bge-large-en-v1.5` or `nomic-embed-text` for strong free embeddings.
- Always rerank before passing to LLM — 5 precise chunks beat 20 noisy ones.
- Store source metadata (URL, page, section) in vector payloads for citations.
- Use namespace/tenant isolation in the vector store for multi-tenant RAG.
- Evaluate with RAGAS metrics: faithfulness, answer relevancy, context precision.

## Related Skills

- vector-database-ops (`vector-database-ops`) - Qdrant/Weaviate management
- vllm-server (`vllm-server`) - Self-hosted LLM endpoint
- ollama-stack (`ollama-stack`) - Local LLM for development
- ai-pipeline-orchestration (`ai-pipeline-orchestration`) - Ingestion pipelines

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

