---
name: llm-gateway
description: Deploy an API gateway for LLM traffic with load balancing, rate limiting,
  key management, semantic caching, fallback routing, and cost tracking.
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

# LLM Gateway

A unified API gateway that routes LLM requests across providers and self-hosted models — with rate limiting, cost tracking, caching, and failover.

## When to Use This Skill

Use this skill when:
- Running multiple LLM backends (OpenAI, Anthropic, vLLM, Ollama) behind a single endpoint
- Enforcing per-team or per-user rate limits and spend budgets
- Implementing automatic fallback when a provider is down
- Adding semantic caching to reduce repeated-request costs when workload measurements support it
- Centralizing API key management instead of distributing keys to every app

## Prerequisites

- Docker and Docker Compose
- A PostgreSQL or SQLite database (for LiteLLM state)
- LLM API keys (OpenAI, Anthropic, etc.) or self-hosted vLLM endpoints
- Optional: Redis for caching and rate limiting

## LiteLLM Proxy — Quick Start

LiteLLM is an open-source LLM gateway with OpenAI-compatible API.

```bash
# Run with Docker
docker run -d \
  --name litellm-proxy \
  -p 127.0.0.1:4000:4000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -v $(pwd)/litellm-config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

## LiteLLM Configuration

```yaml
# litellm-config.yaml
model_list:
  # OpenAI models
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY
      rpm: 10000
      tpm: 2000000

  - model_name: gpt-4o-mini
    litellm_params:
      model: openai/gpt-4o-mini
      api_key: os.environ/OPENAI_API_KEY

  # Anthropic
  - model_name: claude-sonnet-4-6
    litellm_params:
      model: anthropic/claude-sonnet-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  # Self-hosted vLLM instances (load balanced)
  - model_name: llama-3.1-8b
    litellm_params:
      model: openai/meta-llama/Llama-3.1-8B-Instruct
      api_base: http://vllm-1:8000/v1
      api_key: fake                    # vLLM key
  - model_name: llama-3.1-8b
    litellm_params:
      model: openai/meta-llama/Llama-3.1-8B-Instruct
      api_base: http://vllm-2:8000/v1  # second replica — auto load balanced
      api_key: fake


router_settings:
  routing_strategy: least-busy         # or: latency-based, simple-shuffle
  num_retries: 3
  retry_after: 5
  allowed_fails: 2
  cooldown_time: 60

  # Fallback configuration
  fallbacks:
    - gpt-4o: [gpt-4o-mini]

litellm_settings:
  # Semantic caching
  cache: true
  cache_params:
    type: redis
    host: redis
    port: 6379

  # Logging
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]
  langfuse_public_key: os.environ/LANGFUSE_PUBLIC_KEY
  langfuse_secret_key: os.environ/LANGFUSE_SECRET_KEY

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: postgresql://litellm:password@postgres:5432/litellm
  store_model_in_db: true
```

## Docker Compose: Full Gateway Stack

```yaml
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
      - DATABASE_URL=postgresql://litellm:password@postgres:5432/litellm
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: litellm
      POSTGRES_USER: litellm
      POSTGRES_PASSWORD: password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U litellm"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  postgres-data:
  redis-data:
```

## Virtual Keys & Rate Limiting

```bash
# Create a virtual API key for a team (via LiteLLM API)
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "team-backend",
    "key_alias": "backend-team-key",
    "models": ["gpt-4o-mini", "llama-3.1-8b"],
    "max_budget": 100,
    "budget_duration": "monthly",
    "rpm_limit": 100,
    "tpm_limit": 500000
  }'

# View spend
curl http://localhost:4000/spend/keys \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## Bifrost (Alternative Open-Source Gateway)

[Bifrost](https://github.com/maximhq/bifrost) is an open-source (Apache-2.0) LLM gateway written in Go that you run yourself. Like LiteLLM, it puts an OpenAI-compatible API in front of multiple providers and handles fallbacks, load balancing, virtual keys with budgets and rate limits, and an optional semantic cache. Providers and their API keys are configured in its web UI or in `config.json`.

```bash
# Run with Docker (web UI and API on port 8080, state persisted in ./bifrost-data)
docker run -d \
  --name bifrost \
  -p 127.0.0.1:8080:8080 \
  -v $(pwd)/bifrost-data:/app/data \
  maximhq/bifrost:v2.3.0               # pin a release tag
```

Existing OpenAI SDK code only needs a new base URL and a Bifrost virtual key:

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/openai",
    api_key=os.environ["BIFROST_VIRTUAL_KEY"],  # sk-bf-...
)
response = client.chat.completions.create(
    model="openai/gpt-4o-mini",                 # provider/model
    messages=[{"role": "user", "content": "Hello"}],
)
```

Create a virtual key with a monthly budget and request/token rate limits:

```bash
curl -X POST http://localhost:8080/api/governance/virtual-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "backend-team-key",
    "provider_configs": [{"provider": "openai", "allowed_models": ["gpt-4o-mini"], "key_ids": ["*"]}],
    "budgets": [{"max_limit": 100, "reset_duration": "1M"}],
    "rate_limit": {
      "request_max_limit": 100, "request_reset_duration": "1m",
      "token_max_limit": 500000, "token_reset_duration": "1m"
    }
  }'
```

Requests without a virtual key are still accepted unless "Enforce Virtual Keys on Inference" (`enforce_auth_on_inference`) is turned on. A fresh instance has no dashboard password, so enable authentication before exposing it beyond localhost. See the [Bifrost docs](https://docs.getbifrost.ai) for fallbacks, semantic caching and Kubernetes (Helm) deployment.

## Nginx Load Balancer (Alternative/Complement)

```nginx
# nginx.conf — round-robin across vLLM replicas
upstream vllm_backends {
    least_conn;
    server vllm-1:8000 max_fails=3 fail_timeout=30s;
    server vllm-2:8000 max_fails=3 fail_timeout=30s;
    server vllm-3:8000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Place this directive in the surrounding http context:
limit_req_zone $http_authorization zone=per_key:10m rate=100r/m;

server {
    listen 80;
    server_name llm-api.internal;

    # Rate limiting zone is declared at http context above.
    limit_req zone=per_key burst=20 nodelay;

    location /v1/ {
        proxy_pass http://vllm_backends;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_read_timeout 300s;        # long timeout for streaming
        proxy_buffering off;            # required for SSE streaming
        proxy_cache_bypass 1;
    }
}
```

## Monitoring Gateway Health

```bash
# Check LiteLLM health
curl http://localhost:4000/health

# Model-level health
curl http://localhost:4000/health/liveliness

# Spend by model
curl http://localhost:4000/spend/models \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"

# Active virtual keys
curl http://localhost:4000/key/list \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `ConnectionRefusedError` to backend | Backend not reachable | Check `api_base` URL; verify backend is healthy |
| Rate limit errors (429) | Budget/RPM exceeded | Increase limits or rotate to fallback model |
| Slow streaming responses | `proxy_buffering` enabled | Set `proxy_buffering off` in Nginx |
| Cache miss rate high | Threshold too strict | Lower `similarity_threshold` to `0.85` |
| Postgres connection errors | DB not ready | Add `depends_on` with `condition: service_healthy` |

## Best Practices

- Use virtual keys per team/app — never expose raw provider API keys.
- Measure cache correctness and hit rate on the workload; no fixed savings percentage is guaranteed.
- Set `num_retries: 3` with fallbacks to handle provider outages gracefully.
- Log allowlisted operational metadata; private prompt/response tracing requires explicit data-transfer and retention scope.
- Use `least-busy` routing strategy for self-hosted models to avoid GPU saturation.

## Related Skills

- vllm-server (`vllm-server`) - Backend inference server
- llm-inference-scaling (`llm-inference-scaling`) - Auto-scaling backends
- llm-caching (`llm-caching`) - Semantic cache patterns
- llm-cost-optimization (`llm-cost-optimization`) - Cost management

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

This stack is illustrative, not production-secured: pin reviewed image digests, require a strong configured gateway master key and authenticated TLS ingress, replace sample database credentials, and protect database/Redis networks. A duplicate `model_name` entry load-balances deployments; it does not guarantee ordered fallback. Configure acyclic fallback policy explicitly and disclose provider/model substitution. Ordinary Redis caching is not automatically semantic vector caching; verify the chosen backend/schema. Partition cache keys by tenant, authorization, model/config and content version; do not cache sensitive or action-bearing responses across users. Header-based Nginx rate keys do not validate authentication or stop clients changing arbitrary headers. Quota errors require budget review, not automatic limit increases.
