---
name: llm-cost-optimization
description: Reduce LLM API and infrastructure costs through model selection, prompt
  caching, batching, caching, quantization, and self-hosting strategies.
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

# LLM Cost Optimization

Cut LLM costs by 50–90% with the right combination of caching, model selection, prompt optimization, and self-hosting.

## When to Use This Skill

Use this skill when:
- LLM API spend is growing faster than revenue
- You need to attribute AI costs to teams, products, or customers
- Implementing caching to avoid redundant LLM calls
- Deciding when to switch from API providers to self-hosted models
- Optimizing prompt length without sacrificing quality

## Cost Levers by Impact

| Strategy | Typical Savings | Effort |
|----------|-----------------|--------|
| Semantic caching | 20–50% | Low |
| Model right-sizing | 30–70% | Low |
| Prompt compression | 10–30% | Medium |
| Provider caching (prompt cache) | 10–25% | Low |
| Batching offline workloads | 50% (Batch API) | Medium |
| Self-hosting 7–8B models | 80–95% at scale | High |
| Quantization | 30–50% VRAM cost | Medium |

## Track Costs First

```python
# Use LiteLLM's cost tracking (automatic per-model pricing)
import litellm

response = litellm.completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
cost = litellm.completion_cost(response)
print(f"Cost: ${cost:.6f}")

# Add custom cost callbacks
def log_cost(kwargs, completion_response, start_time, end_time):
    cost = kwargs.get("response_cost", 0)
    model = kwargs.get("model")
    user = kwargs.get("user")
    # Send to your analytics DB
    db.record_cost(user=user, model=model, cost=cost)

litellm.success_callback = [log_cost]
```

## Model Right-Sizing

```python
# Route by task complexity — don't use GPT-4o for everything
def get_model_for_task(task_type: str) -> str:
    routing = {
        "classification":     "gpt-4o-mini",      # ~30× cheaper than gpt-4o
        "summarization":      "gpt-4o-mini",
        "extraction":         "gpt-4o-mini",
        "simple_qa":          "gpt-4o-mini",
        "complex_reasoning":  "gpt-4o",
        "code_generation":    "claude-sonnet-4-6",
        "creative_writing":   "claude-opus-4-6",
    }
    return routing.get(task_type, "gpt-4o-mini")

# Cost comparison (per 1M tokens, 2025 approx.)
# gpt-4o-mini:          input $0.15 / output $0.60
# gpt-4o:               input $2.50 / output $10.00
# claude-sonnet-4-6:    input $3.00 / output $15.00
# llama-3.1-8b (self):  ~$0.05–0.10 all-in (GPU amortized)
```

## Prompt Caching (Provider-Side)

```python
# Anthropic — cache long system prompts (saves 90% on cached tokens)
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "You are a helpful assistant.",
        },
        {
            "type": "text",
            "text": open("large-context.txt").read(),  # large doc
            "cache_control": {"type": "ephemeral"},     # cache this!
        }
    ],
    messages=[{"role": "user", "content": "Summarize the key points."}],
)
# First call: full price. Subsequent calls: 90% discount on cached part.
print(f"Cache read tokens: {response.usage.cache_read_input_tokens}")

# OpenAI — prompt caching is automatic for repeated prefixes >1024 tokens
# No code change needed; check usage.prompt_tokens_details.cached_tokens
```

## Batching with OpenAI Batch API (50% Discount)

```python
import json
from openai import OpenAI

client = OpenAI()

# Prepare batch requests
requests = [
    {
        "custom_id": f"task-{i}",
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": f"Classify: {text}"}],
            "max_tokens": 50,
        }
    }
    for i, text in enumerate(texts)
]

# Write JSONL file
with open("batch.jsonl", "w") as f:
    for req in requests:
        f.write(json.dumps(req) + "\n")

# Upload and create batch
batch_file = client.files.create(file=open("batch.jsonl", "rb"), purpose="batch")
batch = client.batches.create(
    input_file_id=batch_file.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",
)
print(f"Batch ID: {batch.id}")  # poll status with client.batches.retrieve(batch.id)
```

## Semantic Caching

```python
import hashlib
import json
import redis
import numpy as np
from sentence_transformers import SentenceTransformer

r = redis.Redis(host="localhost", port=6379)
embed_model = SentenceTransformer("BAAI/bge-small-en-v1.5")

SIMILARITY_THRESHOLD = 0.92
CACHE_TTL = 3600 * 24  # 24 hours

def cached_llm_call(prompt: str, llm_fn) -> str:
    # 1. Exact match (free)
    exact_key = f"exact:{hashlib.sha256(prompt.encode()).hexdigest()}"
    if cached := r.get(exact_key):
        return cached.decode()

    # 2. Semantic match
    query_vec = embed_model.encode(prompt)
    cached_keys = r.keys("sem:*")
    for key in cached_keys:
        data = json.loads(r.get(key))
        similarity = np.dot(query_vec, data["embedding"]) / (
            np.linalg.norm(query_vec) * np.linalg.norm(data["embedding"])
        )
        if similarity >= SIMILARITY_THRESHOLD:
            return data["response"]

    # 3. Cache miss — call LLM
    response = llm_fn(prompt)

    # Store exact match
    r.setex(exact_key, CACHE_TTL, response)

    # Store semantic embedding
    sem_key = f"sem:{hashlib.sha256(prompt.encode()).hexdigest()}"
    r.setex(sem_key, CACHE_TTL, json.dumps({
        "embedding": query_vec.tolist(),
        "response": response,
        "prompt": prompt,
    }))
    return response
```

## Prompt Compression

```python
# LLMLingua — compress long prompts by 3–20× with minimal quality loss
from llmlingua import PromptCompressor

compressor = PromptCompressor(
    model_name="microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank",
    device_map="cpu",
)

compressed = compressor.compress_prompt(
    long_context,
    ratio=0.5,       # keep 50% of tokens
    rank_method="longllmlingua",
)
print(f"Original: {len(long_context.split())} words")
print(f"Compressed: {len(compressed['compressed_prompt'].split())} words")
print(f"Savings: {compressed['saving']}")
```

## Self-Hosting Break-Even Calculator

```python
def break_even_analysis(
    monthly_api_spend_usd: float,
    gpu_cost_per_hour_usd: float = 2.50,   # e.g., A10G on AWS
    utilization: float = 0.70,             # 70% GPU utilization
) -> dict:
    monthly_gpu_cost = gpu_cost_per_hour_usd * 24 * 30 * utilization
    break_even = monthly_gpu_cost / monthly_api_spend_usd
    recommendation = (
        "Self-host now — strong ROI" if break_even < 0.5 else
        "Self-host if traffic grows 2×" if break_even < 0.8 else
        "Stick with API — not enough scale yet"
    )
    return {
        "monthly_gpu_cost": f"${monthly_gpu_cost:.0f}",
        "monthly_api_spend": f"${monthly_api_spend_usd:.0f}",
        "gpu_as_pct_of_api": f"{break_even*100:.0f}%",
        "recommendation": recommendation,
    }

# Example: $5k/month on OpenAI, $2.50/hr A10G
print(break_even_analysis(5000))
# → gpu_cost ~$1,260/mo = 25% of API spend → self-host now
```

## Cost Dashboard (Grafana)

```python
# Emit cost metrics to Prometheus
from prometheus_client import Counter, Histogram

llm_cost_total = Counter(
    "llm_cost_usd_total",
    "Total LLM spend in USD",
    ["model", "team", "task_type"],
)
llm_tokens_total = Counter(
    "llm_tokens_total",
    "Total tokens used",
    ["model", "token_type"],  # token_type: prompt, completion, cached
)

def track_call(model, team, task_type, response):
    cost = calculate_cost(model, response.usage)
    llm_cost_total.labels(model=model, team=team, task_type=task_type).inc(cost)
    llm_tokens_total.labels(model=model, token_type="prompt").inc(
        response.usage.prompt_tokens)
    llm_tokens_total.labels(model=model, token_type="completion").inc(
        response.usage.completion_tokens)
```

## Best Practices

- Use `gpt-4o-mini` or `claude-haiku` for 80% of tasks — they're 10–30× cheaper.
- Enable prompt caching for system prompts >1,024 tokens (Anthropic) or >1,024 tokens (OpenAI).
- Audit your top 5 prompts by token count — compress or cache them.
- Set hard budget limits with LiteLLM virtual keys before costs spiral.
- Self-host 7B–8B models when monthly API spend exceeds $2k/month.

## Related Skills

- llm-gateway (`llm-gateway`) - Centralized cost control
- llm-caching (`llm-caching`) - Semantic caching patterns
- vllm-server (`vllm-server`) - Self-hosted inference
- agent-observability (`agent-observability`) - Token and cost telemetry

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
