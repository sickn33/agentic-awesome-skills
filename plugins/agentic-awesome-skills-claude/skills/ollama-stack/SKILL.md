---
name: ollama-stack
description: Run local LLM workloads with Ollama, Open WebUI, and GPU-aware tuning
  for private development environments.
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

# Ollama Stack

Deploy a local LLM stack for offline and privacy-first workflows.

## When to Use This Skill

Use this skill when:
- Setting up private/local LLM inference for development
- Building air-gapped AI environments
- Running models on personal hardware (Mac, Linux, Windows with GPU)
- Creating team-shared inference endpoints
- Prototyping before committing to cloud LLM APIs

## Prerequisites

- 8 GB+ RAM (16 GB+ recommended for 7B+ models)
- For GPU acceleration: NVIDIA GPU with 6 GB+ VRAM, or Apple Silicon Mac
- Docker (for containerized deployment)
- 20 GB+ disk for model storage

## Quick Start

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh -o /tmp/install-ollama.sh && sh /tmp/install-ollama.sh && rm /tmp/install-ollama.sh

# Start the server
ollama serve

# Pull and run a model
ollama pull llama3.1:8b
ollama run llama3.1:8b "Explain Kubernetes pods in one paragraph"

# List available models
ollama list

# Pull specific quantization
ollama pull llama3.1:8b-instruct-q4_K_M
```

## Model Selection Guide

| Model | Size | VRAM | Best For |
|-------|------|------|----------|
| `llama3.1:8b` | 4.7 GB | 6 GB | General chat, coding |
| `llama3.1:70b` | 40 GB | 48 GB | Complex reasoning |
| `codellama:13b` | 7.4 GB | 10 GB | Code generation |
| `mistral:7b` | 4.1 GB | 6 GB | Fast general tasks |
| `mixtral:8x7b` | 26 GB | 32 GB | High-quality MoE |
| `nomic-embed-text` | 274 MB | 1 GB | Embeddings for RAG |
| `llava:13b` | 8 GB | 10 GB | Vision + text |
| `deepseek-coder-v2:16b` | 9 GB | 12 GB | Code generation |
| `qwen2.5:14b` | 9 GB | 12 GB | Multilingual, reasoning |

## Docker Compose — Full Stack

```yaml
# docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
      - OLLAMA_NUM_PARALLEL=4
      - OLLAMA_MAX_LOADED_MODELS=2
      - OLLAMA_FLASH_ATTENTION=1
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: unless-stopped
    ports:
      - "3000:8080"
    volumes:
      - webui_data:/app/backend/data
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_AUTH=true
      - WEBUI_SECRET_KEY=${WEBUI_SECRET_KEY:-change-me-in-production}
      - DEFAULT_MODELS=llama3.1:8b
    depends_on:
      ollama:
        condition: service_healthy

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm
    restart: unless-stopped
    ports:
      - "4000:4000"
    volumes:
      - ./litellm-config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml"]
    depends_on:
      ollama:
        condition: service_healthy

volumes:
  ollama_data:
  webui_data:
```

### LiteLLM Proxy Config

```yaml
# litellm-config.yaml
model_list:
  - model_name: llama3
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: http://ollama:11434
  - model_name: codellama
    litellm_params:
      model: ollama/codellama:13b
      api_base: http://ollama:11434
  - model_name: embeddings
    litellm_params:
      model: ollama/nomic-embed-text
      api_base: http://ollama:11434

general_settings:
  master_key: sk-local-dev-key
  max_budget: 0  # unlimited for local
```

## API Usage

Ollama exposes an OpenAI-compatible API:

```bash
# Chat completion
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'

# Embeddings
curl http://localhost:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "input": "The quick brown fox"
  }'

# List models
curl http://localhost:11434/api/tags
```

### Python Client

```python
# pip install ollama
import ollama

# Chat
response = ollama.chat(
    model="llama3.1:8b",
    messages=[{"role": "user", "content": "Explain Docker in 3 sentences"}],
)
print(response["message"]["content"])

# Streaming
for chunk in ollama.chat(
    model="llama3.1:8b",
    messages=[{"role": "user", "content": "Write a haiku about containers"}],
    stream=True,
):
    print(chunk["message"]["content"], end="", flush=True)

# Embeddings
result = ollama.embed(model="nomic-embed-text", input="Hello world")
print(f"Embedding dimensions: {len(result['embeddings'][0])}")
```

### OpenAI SDK Compatibility

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:11434/v1", api_key="..." # local endpoint requires no real key)

response = client.chat.completions.create(
    model="llama3.1:8b",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)
```

## Custom Modelfiles

Create specialized models with custom system prompts and parameters:

```dockerfile
# Modelfile.devops-assistant
FROM llama3.1:8b

SYSTEM """You are a DevOps expert assistant. You provide concise, production-ready
advice about infrastructure, CI/CD, containers, and cloud services.
Always include relevant commands and config examples."""

PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 8192
PARAMETER repeat_penalty 1.1
```

```bash
# Build and use custom model
ollama create devops-assistant -f Modelfile.devops-assistant
ollama run devops-assistant "Set up a GitHub Actions workflow for Docker builds"
```

## GPU Configuration

### NVIDIA

```bash
# Verify GPU access
nvidia-smi
ollama run llama3.1:8b --verbose  # Shows GPU layers loaded

# Environment tuning
export OLLAMA_NUM_PARALLEL=4          # Concurrent requests
export OLLAMA_MAX_LOADED_MODELS=2     # Models in VRAM
export OLLAMA_FLASH_ATTENTION=1       # Faster attention
export CUDA_VISIBLE_DEVICES=0,1       # Multi-GPU
```

### Apple Silicon

```bash
# Metal acceleration is automatic on macOS
# Verify with:
ollama run llama3.1:8b --verbose
# Look for: "metal" in the output

# Optimize for unified memory
export OLLAMA_NUM_PARALLEL=2          # Keep memory headroom
export OLLAMA_MAX_LOADED_MODELS=1     # One model at a time on 16GB
```

## Monitoring

```bash
# Check running models and memory usage
curl http://localhost:11434/api/ps

# Prometheus metrics (if enabled)
curl http://localhost:11434/metrics

# Quick health check script
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:11434/api/tags)
if [ "$response" = "200" ]; then
    echo "Ollama is healthy"
    curl -s http://localhost:11434/api/ps | python3 -m json.tool
else
    echo "Ollama is down (HTTP $response)"
    exit 1
fi
```

## Systemd Service

```ini
# /etc/systemd/system/ollama.service
[Unit]
Description=Ollama LLM Server
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0"
Environment="OLLAMA_NUM_PARALLEL=4"
Environment="OLLAMA_FLASH_ATTENTION=1"
LimitNOFILE=65535

[Install]
WantedBy=default.target
```

```bash
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama
sudo systemctl daemon-reload
sudo systemctl enable --now ollama
sudo systemctl status ollama
```

## Security

- Bind to `127.0.0.1` in production (default), use reverse proxy for remote access
- Set `WEBUI_AUTH=true` on Open WebUI
- Use nginx with TLS for remote access:

```nginx
server {
    listen 443 ssl;
    server_name llm.internal.example.com;
    ssl_certificate /etc/ssl/certs/llm.pem;
    ssl_certificate_key /etc/ssl/private/llm.key;

    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_set_header Host $host;
        proxy_buffering off;              # Required for streaming
        proxy_read_timeout 600s;          # Long model responses
        allow 10.0.0.0/8;
        deny all;
    }
}
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Model too slow | Use smaller quantization (`q4_K_M`), enable flash attention |
| Out of memory | Reduce `num_ctx`, use smaller model, set `OLLAMA_MAX_LOADED_MODELS=1` |
| GPU not detected | Check `nvidia-smi`, reinstall CUDA drivers, verify Docker GPU runtime |
| Connection refused | Check `OLLAMA_HOST` setting, verify firewall rules |
| Model download fails | Check disk space, retry with `ollama pull --insecure` for self-signed registries |

## Related Skills

- mac-mini-llm-lab (`mac-mini-llm-lab`) — Apple Silicon optimization
- docker-compose (`docker-compose`) — Service orchestration
- vllm-server (`vllm-server`) — High-throughput production inference
- llm-gateway (`llm-gateway`) — Unified API routing

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

