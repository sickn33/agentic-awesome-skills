---
name: llm-caching
description: Implement multi-layer LLM caching with exact match, semantic similarity,
  and provider-side prompt caching.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# LLM Caching

Cut LLM costs and latency with exact match, semantic, and provider-side caching layers.

## When to Use This Skill

Use this skill when:
- The same or similar queries are asked repeatedly (FAQ bots, support tools)
- LLM API costs are growing and you need immediate savings
- Serving high request volumes where repeated queries cause bottlenecks
- Implementing prompt caching for long system prompts (Anthropic/OpenAI)
- Building offline-capable AI features that need response persistence

## Caching Layers

```
Request → Exact Cache → Semantic Cache → Provider Cache → LLM API
             ↓ hit            ↓ hit             ↓ hit
           instant          ~5ms           50-80% cheaper
```

## Layer 1: Exact Match Cache (Redis)

```python
import hashlib
import json
import redis
from openai import OpenAI

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
client = OpenAI()

def build_cache_key(model: str, messages: list, temperature: float) -> str:
    """Deterministic key from request parameters."""
    payload = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }, sort_keys=True)
    return f"llm:exact:{hashlib.sha256(payload.encode()).hexdigest()}"

def cached_completion(model: str, messages: list, temperature: float = 0.0,
                      ttl: int = 3600) -> dict:
    key = build_cache_key(model, messages, temperature)

    # Check cache
    if cached := r.get(key):
        return json.loads(cached)

    # Call API
    response = client.chat.completions.create(
        model=model, messages=messages, temperature=temperature
    )
    result = response.model_dump()

    # Cache result (only cache deterministic responses)
    if temperature == 0.0:
        r.setex(key, ttl, json.dumps(result))

    return result
```

## Layer 2: Semantic Cache (GPTCache)

```python
from gptcache import cache, Config
from gptcache.adapter import openai
from gptcache.embedding import Onnx
from gptcache.manager import CacheBase, VectorBase, get_data_manager
from gptcache.similarity_evaluation.distance import SearchDistanceEvaluation

# Configure GPTCache with Qdrant backend
def init_gptcache(cache_obj, llm: str):
    onnx = Onnx()                              # local embedding model
    data_manager = get_data_manager(
        CacheBase("redis"),                    # metadata store
        VectorBase("qdrant",
                   host="localhost",
                   port=6333,
                   collection_name=f"llm-cache-{llm}",
                   dimension=onnx.dimension),
    )
    cache_obj.init(
        embedding_func=onnx.to_embeddings,
        data_manager=data_manager,
        similarity_evaluation=SearchDistanceEvaluation(),
        config=Config(similarity_threshold=0.80),  # 80% similarity = cache hit
    )

cache.set_openai_key()
init_gptcache(cache, "gpt-4o-mini")

# Now openai calls are automatically cached
response = openai.ChatCompletion.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "What is machine learning?"}],
)
# Second call with similar question ("Explain machine learning") → cache hit
```

## Custom Semantic Cache (Production-Grade)

```python
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, Range
import numpy as np
import uuid
import time

embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5")  # fast, 33M params
qdrant = QdrantClient("http://localhost:6333")

CACHE_COLLECTION = "semantic-cache"
SIMILARITY_THRESHOLD = 0.88
CACHE_TTL_SECONDS = 86400  # 24h

# Create collection once
qdrant.create_collection(
    collection_name=CACHE_COLLECTION,
    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    on_disk_payload=True,
)

def semantic_cache_lookup(query: str, model: str) -> str | None:
    embedding = embed_model.encode(query).tolist()
    results = qdrant.query_points(
        collection_name=CACHE_COLLECTION,
        query=embedding,
        query_filter=Filter(must=[
            FieldCondition(key="model", match={"value": model}),
            FieldCondition(key="expires_at", range=Range(gte=time.time())),
        ]),
        limit=1,
        score_threshold=SIMILARITY_THRESHOLD,
    )
    if results.points:
        return results.points[0].payload["response"]
    return None

def semantic_cache_store(query: str, response: str, model: str):
    embedding = embed_model.encode(query).tolist()
    qdrant.upsert(
        collection_name=CACHE_COLLECTION,
        points=[PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={
                "query": query,
                "response": response,
                "model": model,
                "created_at": time.time(),
                "expires_at": time.time() + CACHE_TTL_SECONDS,
            },
        )],
    )

def smart_llm_call(query: str, model: str = "gpt-4o-mini") -> dict:
    # 1. Semantic lookup
    if cached_response := semantic_cache_lookup(query, model):
        return {"response": cached_response, "source": "semantic_cache", "cost": 0}

    # 2. LLM call
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": query}],
    )
    text = response.choices[0].message.content
    cost = litellm.completion_cost(response)

    # 3. Store in cache
    semantic_cache_store(query, text, model)

    return {"response": text, "source": "llm_api", "cost": cost}
```

## Layer 3: Provider-Side Prompt Caching

```python
# Anthropic — cache long system prompts (saves 90% on cached input tokens)
import anthropic

client = anthropic.Anthropic()

# Long system prompt — mark for caching
SYSTEM_PROMPT = open("knowledge-base.txt").read()  # e.g., 50k tokens

def call_with_prompt_cache(user_question: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[
            {"type": "text", "text": "You are a helpful assistant."},
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},  # cache this block
            }
        ],
        messages=[{"role": "user", "content": user_question}],
    )
    # Log cache efficiency
    usage = response.usage
    cache_savings = usage.cache_read_input_tokens * 0.9  # 90% discount on cached
    print(f"Cache hits: {usage.cache_read_input_tokens} tokens "
          f"(saved ~${cache_savings * 3.0 / 1_000_000:.4f})")
    return response.content[0].text

# OpenAI — automatic for repeated prefixes (≥1,024 tokens)
# No code change needed; cached tokens appear in usage.prompt_tokens_details
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": LONG_SYSTEM_PROMPT},  # auto-cached
        {"role": "user", "content": user_question},
    ]
)
cached = response.usage.prompt_tokens_details.cached_tokens
print(f"OpenAI cached {cached} tokens")
```

## Cache Warming

```python
async def warm_cache(common_queries: list[str], model: str):
    """Pre-populate cache with known frequent queries."""
    import asyncio
    from openai import AsyncOpenAI

    aclient = AsyncOpenAI()

    async def warm_single(query: str):
        if not semantic_cache_lookup(query, model):
            response = await aclient.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": query}],
            )
            text = response.choices[0].message.content
            semantic_cache_store(query, text, model)
            print(f"Warmed: {query[:50]}...")

    await asyncio.gather(*[warm_single(q) for q in common_queries])

# Warm on startup
import asyncio
asyncio.run(warm_cache(FREQUENT_QUERIES, "gpt-4o-mini"))
```

## Cache Metrics

```python
from prometheus_client import Counter, Histogram

cache_hits = Counter("llm_cache_hits_total", "Cache hits", ["cache_layer", "model"])
cache_misses = Counter("llm_cache_misses_total", "Cache misses", ["model"])
cache_savings_usd = Counter("llm_cache_savings_usd_total", "USD saved by cache", ["model"])

# Use in your smart_llm_call function
if source == "semantic_cache":
    cache_hits.labels(cache_layer="semantic", model=model).inc()
    cache_savings_usd.labels(model=model).inc(estimated_cost)
else:
    cache_misses.labels(model=model).inc()
```

## Redis Configuration for LLM Caching

```bash
# redis.conf tuning for LLM cache workload
maxmemory 8gb
maxmemory-policy allkeys-lru    # evict least-recently-used when full
save ""                          # disable persistence (cache is ephemeral)
appendonly no
tcp-keepalive 60
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Low cache hit rate | Threshold too strict | Lower `SIMILARITY_THRESHOLD` to 0.82–0.85 |
| Stale cached responses | Long TTL | Use topic-specific TTLs; invalidate on data updates |
| Cache serving wrong answers | Threshold too loose | Raise threshold or add model-name filtering |
| Redis OOM | No eviction policy | Set `maxmemory` + `allkeys-lru` |
| Slow semantic lookup | Large cache collection | Add payload index on `model` + `expires_at` |

## Best Practices

- Start with exact cache — zero cost, instant wins for identical queries.
- Semantic threshold of 0.88–0.92 balances hit rate vs. accuracy; tune with your data.
- Set per-model TTLs: longer for stable knowledge (1 week), shorter for news/events (1 hour).
- Always filter by model name in semantic cache — different models give different answers.
- Log cache hit rate as a KPI; target 30%+ for FAQ-style applications.

## Related Skills

- llm-cost-optimization (`llm-cost-optimization`) - Full cost strategy
- llm-gateway (`llm-gateway`) - Gateway-level caching
- vector-database-ops (`vector-database-ops`) - Qdrant setup
- agent-observability (`agent-observability`) - Cache metrics dashboards

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
