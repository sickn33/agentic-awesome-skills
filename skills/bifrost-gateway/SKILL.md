---
name: bifrost-gateway
description: "Run and configure Bifrost, the open-source AI gateway: one OpenAI-compatible API for 20+ LLM providers with fallbacks, virtual keys and budgets, semantic caching, observability and an MCP gateway."
category: ai-ml
risk: safe
source: self
source_type: self
date_added: "2026-10-27"
author: Swpn0neel
tags: [bifrost, ai-gateway, llm-gateway, openai-compatible, mcp-gateway, llm-routing]
tools: [claude, cursor, gemini, codex]
---

# Bifrost AI Gateway

## Overview

[Bifrost](https://github.com/maximhq/bifrost) is an open-source (Apache-2.0), self-hosted AI gateway written in Go. It puts 20+ providers (OpenAI, Anthropic, AWS Bedrock, Google Vertex and Gemini, Azure OpenAI, Mistral, Groq, Ollama, vLLM and others) behind one OpenAI-compatible API, and adds fallbacks, weighted load balancing, virtual keys with budgets and rate limits, semantic caching, request logging, Prometheus and OpenTelemetry export, and an MCP gateway. Applications keep their existing SDKs and change only the base URL. Documentation: https://docs.getbifrost.ai

## When to Use This Skill

- One application or agent needs several LLM providers behind a single endpoint
- Provider failover, retries or key load balancing should live in config, not application code
- Teams, customers or apps need their own keys with spend budgets and rate limits
- Repeated or similar prompts should be served from a cache
- LLM traffic needs request logs, cost tracking, Prometheus metrics or OpenTelemetry traces
- Several MCP servers should be exposed to agents through one governed endpoint
- Claude Code, Codex CLI or another coding agent should run through a self-hosted gateway

Not a fit when the user cannot run a service at all (Bifrost is self-hosted), or for model training and fine-tuning.

## How It Works

### 1. Start the gateway

```bash
# Node.js: download and run the binary
npx -y @maximhq/bifrost

# Docker: persist config and logs in ./data
docker run -p 8080:8080 -v $(pwd)/data:/app/data maximhq/bifrost
```

- The gateway and web UI listen on port 8080 (`-port` with npx; `-e APP_PORT=...` plus `-p` with Docker). Open http://localhost:8080.
- Pin a version for anything beyond local evaluation: `maximhq/bifrost:<version>` or `npx -y @maximhq/bifrost --transport-version <version>`.
- A fresh instance has no dashboard password. Before exposing it beyond localhost, start it with `BIFROST_SETUP_TOKEN` set and enable password protection under Workspace → Config → Security.

### 2. Add providers

Use the web UI (Model Providers page), the management API, or `config.json` in the app directory (the mounted `./data` folder for Docker; `~/.config/bifrost` for npx unless `-app-dir` is set):

```json
{
  "$schema": "https://www.getbifrost.ai/schema",
  "providers": {
    "openai": {
      "keys": [{ "name": "openai-1", "value": "env.OPENAI_API_KEY", "models": ["*"], "weight": 1.0 }]
    },
    "anthropic": {
      "keys": [{ "name": "anthropic-1", "value": "env.ANTHROPIC_API_KEY", "models": ["*"], "weight": 1.0 }]
    }
  }
}
```

```bash
curl -X POST http://localhost:8080/api/providers \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "keys": [{"name": "openai-1", "value": "env.OPENAI_API_KEY", "models": ["*"], "weight": 1.0}]}'
```

- `env.VAR_NAME` reads the secret from the gateway's environment. Never inline real keys.
- `"models": ["*"]` allows every model on that key; an empty list denies all models.

### 3. Send requests

Address models as `provider/model` on the OpenAI-compatible endpoint:

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'
```

Existing SDKs only change their base URL:

| Client | Base URL |
|---|---|
| Any OpenAI-compatible client | `http://localhost:8080/v1` |
| OpenAI SDK | `http://localhost:8080/openai` |
| Anthropic SDK | `http://localhost:8080/anthropic` |
| Google GenAI SDK | `http://localhost:8080/genai` |
| LangChain | `http://localhost:8080/langchain` |

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/openai",
    api_key=os.environ["BIFROST_VIRTUAL_KEY"],
)
reply = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-6",  # any configured provider through the same client
    messages=[{"role": "user", "content": "Summarize this ticket in one line."}],
)
```

### 4. Add fallbacks, retries and load balancing

- **Fallbacks:** list backup models in the request body. Each is tried in order after the primary fails, with its own retry budget.

  ```json
  {"model": "openai/gpt-4o-mini", "messages": [{"role": "user", "content": "Hi"}], "fallbacks": ["anthropic/claude-sonnet-4-6", "gemini/gemini-2.5-flash"]}
  ```

- **Retries:** set per provider in `network_config` (`"max_retries": 3`, `"retry_backoff_initial": 500`, `"retry_backoff_max": 5000`). The default is 0 retries. Keys rejected for credentials, quota or model access always move on to the next key; rotating away from a rate-limited (`429`) key needs `max_retries` above 0 and more than one key.
- **Key load balancing:** give a provider several keys with different `weight` values; Bifrost picks keys by weighted random selection.
- **Provider load balancing:** weight providers inside a virtual key's `provider_configs` (next step).

### 5. Govern access with virtual keys

Virtual keys (`sk-bf-...`) carry provider and model allowlists, budgets and rate limits:

```bash
curl -X POST http://localhost:8080/api/governance/virtual-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "support-bot",
    "provider_configs": [
      {"provider": "openai", "weight": 0.7, "allowed_models": ["gpt-4o-mini"], "key_ids": ["*"]},
      {"provider": "anthropic", "weight": 0.3, "allowed_models": ["claude-sonnet-4-6"], "key_ids": ["*"]}
    ],
    "budgets": [{"max_limit": 100.00, "reset_duration": "1M"}],
    "rate_limit": {"request_max_limit": 100, "request_reset_duration": "1m", "token_max_limit": 10000, "token_reset_duration": "1h"},
    "is_active": true
  }'
```

- Clients send the key as `x-bf-vk`, `Authorization: Bearer`, `x-api-key` (Anthropic style) or `x-goog-api-key` (Gemini style). In examples, use visible placeholders such as `<BIFROST_VIRTUAL_KEY>` rather than realistic secret-shaped values.
- Virtual keys are optional until you enforce them: set `"client": {"enforce_auth_on_inference": true}` in `config.json`, or turn on Enforce Virtual Keys on Inference in Settings → Security.
- A virtual key with no `provider_configs` denies every provider. Budgets can also be set on teams and customers above the key.

### 6. Enable semantic caching

Caching needs a vector store (Redis/Valkey, Weaviate, Qdrant or Pinecone) and the `semantic_cache` plugin:

```json
{
  "vector_store": {"enabled": true, "type": "redis", "config": {"addr": "localhost:6379"}},
  "plugins": [{
    "name": "semantic_cache",
    "enabled": true,
    "config": {"provider": "openai", "embedding_model": "text-embedding-3-small", "dimension": 1536, "threshold": 0.85, "ttl": 300}
  }]
}
```

- A request is cached only when it carries an `x-bf-cache-key` header (or the plugin sets `default_cache_key`). This is the most common reason nothing gets cached.
- For exact-match caching with no embedding calls, use hash mode: `"config": {"dimension": 1, "ttl": 1800}`.

### 7. Observe traffic

- Every request is logged with provider, model, tokens, cost and latency in the web UI at http://localhost:8080/logs.
- Prometheus metrics are served at `/metrics`.
- The `otel` plugin exports GenAI-convention spans to any OTLP collector (Grafana, Datadog, Honeycomb, Langfuse and others):

  ```json
  {"plugins": [{"name": "otel", "enabled": true, "config": {"collector_url": "http://otel-collector:4318/v1/traces", "trace_type": "genai_extension", "protocol": "http"}}]}
  ```

### 8. Use the MCP gateway

Bifrost connects to MCP servers (STDIO, HTTP or SSE) and re-exposes their tools at `/mcp`:

```json
{
  "mcp": {
    "client_configs": [
      {"name": "docs", "connection_type": "http", "connection_string": "https://mcp.example.com/mcp", "auth_type": "none", "tools_to_execute": ["*"]}
    ]
  }
}
```

```bash
# Connect Claude Code to every tool Bifrost exposes
claude mcp add --transport http bifrost http://localhost:8080/mcp
```

- When the gateway enforces virtual keys, pass one as a header (`claude mcp add-json bifrost '{"type":"http","url":"http://localhost:8080/mcp","headers":{"Authorization":"Bearer <BIFROST_VIRTUAL_KEY>"}}'`). The key's MCP tool permissions decide which tools the client sees.
- On `/v1/chat/completions`, tool calls are returned to the caller and run only through an explicit `POST /v1/mcp/tool/execute`, unless Agent Mode auto-execution is configured.

### 9. Route coding agents through Bifrost

**Claude Code** (Anthropic-compatible route), in `~/.claude/settings.json` or the shell:

```json
{"env": {"ANTHROPIC_BASE_URL": "http://localhost:8080/anthropic", "ANTHROPIC_AUTH_TOKEN": "<BIFROST_VIRTUAL_KEY>"}}
```

**Codex CLI** (Responses API provider), in `~/.codex/config.toml`, with the virtual key exported as `OPENAI_API_KEY`:

```toml
model = "openai/gpt-5"
model_provider = "bifrost"

[model_providers.bifrost]
name = "Bifrost"
base_url = "http://localhost:8080/openai/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = false
supports_websockets = false
```

Keep the trailing `/v1` (Codex appends `/responses`), and run `/logout` in Codex first if it is signed in with an OpenAI account.

## Examples

### Example 1: Failover from OpenAI to Anthropic

User: "Our support bot goes down whenever OpenAI rate-limits us. Add a backup."

1. Add `openai` and `anthropic` providers (step 2) and set `"max_retries": 2` in the OpenAI `network_config`.
2. Point the bot's OpenAI client at `http://localhost:8080/openai`.
3. Send `"model": "openai/gpt-4o-mini"` with `"fallbacks": ["anthropic/claude-sonnet-4-6"]`.

Result: a 429 rotates to another OpenAI key if one exists, then falls back to Claude. The `x-bifrost-routing-info-provider` and `x-bifrost-fallback-index` response headers and the request log show which provider served it.

### Example 2: Monthly budget per team

User: "Cap the data team at $200 a month and 60 requests per minute."

1. Create a virtual key named `data-team` with `"budgets": [{"max_limit": 200, "reset_duration": "1M"}]` and `"rate_limit": {"request_max_limit": 60, "request_reset_duration": "1m"}`.
2. Turn on `enforce_auth_on_inference` so requests without a key are rejected.
3. Give the team the generated virtual-key value as their API key.

Result: requests over the rate limit return `429`, requests after the budget is spent return `402`, spend is tracked per key in the dashboard, and the budget resets monthly.

## Production Checklist

Score one point per item before calling a deployment production-ready (8/8 is the target):

- [ ] Image or npx version pinned
- [ ] Dashboard password set (setup token used) and TLS in front of the gateway
- [ ] Provider secrets supplied as `env.` references, not literals
- [ ] Virtual keys enforced on inference, one key per app or team
- [ ] Budgets and rate limits set on every virtual key
- [ ] Fallbacks or retries configured for each critical model
- [ ] Logs, `/metrics` or OTel export wired to existing monitoring
- [ ] Config and log storage persisted (Docker volume, or PostgreSQL for larger setups)

## Best Practices

- Prefer `env.` references and a secrets manager for provider keys; never paste real keys into prompts, docs or committed `config.json`. Client examples read `BIFROST_VIRTUAL_KEY` from the process environment.
- Use the `provider/model` form everywhere, so a model change is a one-line config edit.
- Start with a virtual key per application. A new key with no `provider_configs` blocks every request, so allow at least one provider.
- Semantic caching adds an embedding call on every cache miss. Enable it only where prompts actually repeat, and use hash mode for exact repeats.
- OSS Bifrost keeps provider config, budgets and usage in memory on each node and does not sync them. For several OSS nodes, share one `config.json` with `"config_store": {"enabled": false}` (multi-node with a shared Postgres store is not supported); real-time state sync across nodes is an Enterprise feature.
- Verify behaviour against the current docs before production; features and defaults change between releases.

## Limitations

- Bifrost is self-hosted: someone has to run, upgrade and secure the gateway process and its storage.
- Provider accounts and API keys are still required; the gateway does not supply model access.
- Feature behaviour and defaults change between releases. Check https://docs.getbifrost.ai for the version in use before relying on a specific setting.
- Some features described in the docs (clustering, adaptive routing, advanced guardrails, SSO) are Enterprise-only and are not covered here.

## Security & Safety Notes

- The commands above run a local service on port 8080 and call `localhost` management APIs. Run them only on a machine or environment you control.
- Keep provider keys in the gateway's environment and reference them as `env.VAR_NAME`; never paste real keys into chat, docs or committed `config.json`. Key values in examples must be descriptive placeholders.
- A fresh instance has no dashboard password and does not require virtual keys. Set `BIFROST_SETUP_TOKEN`, enable dashboard auth and enforce virtual keys before exposing the gateway beyond localhost.
- MCP tools reached through the gateway can act on external systems. Keep explicit tool execution (the default) unless the user has approved auto-execution for specific tools.

## Common Pitfalls

- **Nothing is cached:** the request has no `x-bf-cache-key` header and no `default_cache_key` is configured.
- **`403` with a virtual key:** the key's `provider_configs` do not allow that provider or model, the key is inactive or expired, or the requested MCP tool is blocked for that key.
- **Codex requests fail:** the provider `base_url` is missing the trailing `/v1` (Codex appends `/responses` to it).
- **All models rejected on a key:** the key's `models` list is empty; use `["*"]` or list models explicitly.
- **Dashboard open to the network:** a fresh instance has no password; set `BIFROST_SETUP_TOKEN` and enable auth before exposing it.

## Related Skills

- `@llm-gateway` - Compare gateway options (LiteLLM, Bifrost, OpenRouter) before choosing one
- `@llm-caching` - Caching strategies beyond gateway-level semantic caching
- `@llm-cost-optimization` - Broader cost controls that pair with virtual-key budgets

## References

- Repository: https://github.com/maximhq/bifrost
- Gateway setup: https://docs.getbifrost.ai/quickstart/gateway/setting-up
- Retries and fallbacks: https://docs.getbifrost.ai/features/retries-and-fallbacks
- Virtual keys: https://docs.getbifrost.ai/features/governance/virtual-keys
- Semantic caching: https://docs.getbifrost.ai/features/semantic-caching
- MCP gateway: https://docs.getbifrost.ai/mcp/overview
- Coding agents: https://docs.getbifrost.ai/cli-agents/overview
