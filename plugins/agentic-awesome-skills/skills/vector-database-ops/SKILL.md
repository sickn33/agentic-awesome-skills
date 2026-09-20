---
name: vector-database-ops
description: Deploy, manage, and optimize vector databases for AI applications.
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

# Vector Database Operations

Run production vector databases for AI-powered search, RAG, and recommendation systems.

## When to Use This Skill

Use this skill when:
- Setting up a vector database for a RAG or semantic search application
- Choosing between Qdrant, Weaviate, pgvector, or Pinecone
- Managing collections, indexes, and data migrations
- Optimizing query performance and indexing for production loads
- Implementing multi-tenant vector search with namespace isolation

## Vector Database Comparison

| Database | Best For | Hosting | Filtering | Scale |
|----------|----------|---------|-----------|-------|
| **Qdrant** | High-performance, rich filtering, self-hosted | Self / Cloud | Excellent | Very High |
| **Weaviate** | Schema-first, hybrid search, multi-modal | Self / Cloud | Good | High |
| **pgvector** | Already on Postgres, simple use cases | Self | Good | Medium |
| **Pinecone** | Zero-ops managed, serverless | Managed only | Good | Very High |
| **Chroma** | Local dev, prototyping | Self only | Basic | Low-Medium |

## Qdrant — Production Deployment

```bash
# Docker (single node)
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant-data:/qdrant/storage \
  qdrant/qdrant:latest

# With custom config
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/qdrant-data:/qdrant/storage \
  -v $(pwd)/qdrant-config.yaml:/qdrant/config/production.yaml \
  qdrant/qdrant:latest
```

```yaml
# qdrant-config.yaml
storage:
  storage_path: /qdrant/storage
  on_disk_payload: true          # store payload on disk (saves RAM)

service:
  max_request_size_mb: 32

hnsw_index:
  m: 16                          # graph connections per node
  ef_construct: 100              # accuracy vs build time trade-off
  full_scan_threshold: 10000     # switch to brute force below this

quantization:
  scalar:
    type: int8
    quantile: 0.99
    always_ram: true             # keep quantized index in RAM

telemetry_disabled: true
```

## Qdrant Collection Management

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, HnswConfigDiff,
    ScalarQuantizationConfig, ScalarType, QuantizationConfig
)

client = QdrantClient("http://localhost:6333")

# Create optimized collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(
        size=1536,                         # OpenAI ada-002 / text-embedding-3-small
        distance=Distance.COSINE,
        on_disk=True,                      # save RAM — vectors stored on disk
    ),
    hnsw_config=HnswConfigDiff(
        m=32,                              # higher = better recall, more RAM
        ef_construct=200,
        on_disk=False,                     # keep HNSW graph in RAM for speed
    ),
    quantization_config=QuantizationConfig(
        scalar=ScalarQuantizationConfig(
            type=ScalarType.INT8,
            quantile=0.99,
            always_ram=True,
        )
    ),
)

# Create payload index for fast filtering
client.create_payload_index(
    collection_name="documents",
    field_name="tenant_id",
    field_schema="keyword",
)
client.create_payload_index(
    collection_name="documents",
    field_name="created_at",
    field_schema="datetime",
)

# Collection info
info = client.get_collection("documents")
print(f"Vectors: {info.vectors_count}, Status: {info.status}")
```

## Qdrant Filtered Search

```python
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

# Tenant-isolated search (multi-tenant RAG)
results = client.query_points(
    collection_name="documents",
    query=query_embedding,
    query_filter=Filter(
        must=[
            FieldCondition(key="tenant_id", match=MatchValue(value="acme-corp")),
            FieldCondition(key="doc_type", match=MatchValue(value="contract")),
        ],
        should=[
            FieldCondition(key="created_at", range=Range(gte="2024-01-01")),
        ],
    ),
    limit=10,
    with_payload=True,
)
```

## pgvector — PostgreSQL Extension

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with vector column
CREATE TABLE documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content     TEXT NOT NULL,
    embedding   VECTOR(1536),
    metadata    JSONB DEFAULT '{}',
    tenant_id   TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW index (faster queries, more memory)
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create IVFFlat index (less memory, slower build)
-- CREATE INDEX ON documents
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Semantic search with metadata filtering
SELECT id, content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM documents
WHERE tenant_id = 'acme-corp'
  AND metadata->>'doc_type' = 'contract'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

```bash
# Deploy pgvector via Docker
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=vectordb \
  -p 5432:5432 \
  -v pgvector-data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

## Weaviate Deployment

```yaml
# docker-compose for Weaviate
services:
  weaviate:
    image: semitechnologies/weaviate:latest
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "false"
      AUTHENTICATION_APIKEY_ENABLED: "true"
      AUTHENTICATION_APIKEY_ALLOWED_KEYS: "${WEAVIATE_API_KEY}"
      AUTHENTICATION_APIKEY_USERS: "admin"
      PERSISTENCE_DATA_PATH: /var/lib/weaviate
      ENABLE_MODULES: text2vec-openai,generative-openai
      OPENAI_APIKEY: "${OPENAI_API_KEY}"
      CLUSTER_HOSTNAME: node1
    volumes:
      - weaviate-data:/var/lib/weaviate
    restart: unless-stopped

volumes:
  weaviate-data:
```

## Backup and Restore

```bash
# Qdrant — snapshot backup
curl -X POST "http://localhost:6333/collections/documents/snapshots"
# Download snapshot
curl -O "http://localhost:6333/collections/documents/snapshots/documents-snapshot.snapshot"
# Restore
curl -X POST "http://localhost:6333/collections/documents/snapshots/recover" \
  -H "Content-Type: application/json" \
  -d '{"location": "/qdrant/snapshots/documents-snapshot.snapshot"}'

# pgvector — standard pg_dump
pg_dump -h localhost -U postgres -d vectordb \
  --table=documents --format=custom > documents-backup.dump

# Restore
pg_restore -h localhost -U postgres -d vectordb documents-backup.dump
```

## Performance Tuning

```python
# Qdrant — optimize collection after bulk load
client.update_collection(
    collection_name="documents",
    optimizer_config={"indexing_threshold": 0},  # force indexing now
)

# Wait for optimization to complete
import time
while True:
    info = client.get_collection("documents")
    if info.status.value == "green":
        break
    time.sleep(5)
    print(f"Optimizing... segments: {info.segments_count}")
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Slow queries | No HNSW index built yet | Wait for indexing; check `status == green` |
| High RAM usage | Vectors in memory | Enable `on_disk=True` for vectors |
| Poor recall | Low `ef` search param | Increase `ef` in search request (at query time) |
| pgvector slow | Using IVFFlat without vacuum | Run `VACUUM ANALYZE documents` |
| Weaviate OOM | Too many objects | Enable async indexing; increase heap |

## Best Practices

- Use cosine distance for normalized embeddings; dot product for unnormalized.
- Always create payload indexes on filter fields (`tenant_id`, `doc_type`).
- For datasets >10M vectors, use `on_disk` vectors + `always_ram` quantization.
- Benchmark with your actual query patterns before choosing IVFFlat vs HNSW.
- Snapshot before any bulk delete or migration operation.

## Related Skills

- rag-infrastructure (`rag-infrastructure`) - Full RAG pipeline
- [databases] (../) - General database management
- postgresql (`postgresql-devsec`) - pgvector host database ops

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

