---
name: vllm-server
description: Deploy and manage vLLM for high-throughput LLM inference. Configure continuous
  batching, tensor parallelism, quantization, and OpenAI-compatible API endpoints
  for production LLM serving.
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

# vLLM Server Management

Deploy production-grade LLM inference servers with vLLM — the fastest open-source LLM serving engine with PagedAttention and continuous batching.

## When to Use This Skill

Use this skill when:
- Serving open-source LLMs (Llama, Mistral, Qwen, Gemma) at scale
- Building an OpenAI-compatible API endpoint for self-hosted models
- Optimizing LLM throughput and latency for production traffic
- Running multi-GPU inference with tensor or pipeline parallelism
- Deploying quantized models to reduce GPU memory requirements

## Prerequisites

- NVIDIA GPU(s) with CUDA 12.1+ (A100/H100 recommended for production)
- Docker or Python 3.9+ with pip
- 40GB+ VRAM for 70B models; 8GB+ for 7B models
- `nvidia-container-toolkit` for Docker GPU passthrough

## Quick Start

```bash
# Install vLLM
pip install vllm

# Serve a model (OpenAI-compatible API)
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key your-secret-key

# Test the endpoint
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Docker Deployment

```bash
docker run --runtime nvidia --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8000:8000 \
  --ipc=host \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --api-key your-secret-key
```

## Docker Compose (Production)

```yaml
services:
  vllm:
    image: vllm/vllm-openai:latest
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - HUGGING_FACE_HUB_TOKEN=${HF_TOKEN}
    volumes:
      - model-cache:/root/.cache/huggingface
    ports:
      - "8000:8000"
    ipc: host
    command: >
      --model meta-llama/Llama-3.1-70B-Instruct
      --tensor-parallel-size 2
      --max-model-len 32768
      --gpu-memory-utilization 0.90
      --api-key ${VLLM_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  model-cache:
```

## Key Configuration Options

### Multi-GPU Tensor Parallelism

```bash
# Split one model across 4 GPUs
vllm serve meta-llama/Llama-3.1-70B-Instruct \
  --tensor-parallel-size 4 \
  --gpu-memory-utilization 0.90
```

### Quantization (Lower VRAM)

```bash
# AWQ quantization (70B on 2x A100 40GB)
vllm serve casperhansen/llama-3-70b-instruct-awq \
  --quantization awq \
  --tensor-parallel-size 2

# GPTQ quantization
vllm serve TheBloke/Llama-2-70B-Chat-GPTQ \
  --quantization gptq

# FP8 (H100 NVL native)
vllm serve meta-llama/Llama-3.1-405B-Instruct \
  --quantization fp8 \
  --tensor-parallel-size 8
```

### Structured Output & Tools

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --enable-auto-tool-choice \
  --tool-call-parser llama3_json \
  --guided-decoding-backend outlines
```

### LoRA Adapters

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --enable-lora \
  --lora-modules sql-lora=/path/to/sql-lora \
                 code-lora=/path/to/code-lora \
  --max-lora-rank 64
```

## Performance Tuning

```bash
# Maximize throughput for batch workloads
vllm serve <model> \
  --max-num-seqs 256 \          # max concurrent sequences
  --max-num-batched-tokens 8192 \ # tokens per batch
  --gpu-memory-utilization 0.95 \ # use 95% VRAM
  --swap-space 4                  # CPU swap (GiB)

# Minimize latency for interactive use
vllm serve <model> \
  --max-num-seqs 32 \
  --enforce-eager              # disable CUDA graph capture
```

## Benchmarking

```bash
# Install benchmark tool
pip install vllm

# Run throughput benchmark
python -m vllm.entrypoints.openai.run_batch \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --input-file prompts.jsonl \
  --output-file results.jsonl

# Benchmark with vllm bench
vllm bench throughput \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --num-prompts 1000 \
  --input-len 512 \
  --output-len 128
```

## Monitoring

```bash
# Check running server stats
curl http://localhost:8000/metrics  # Prometheus metrics

# Key metrics to watch:
# vllm:num_requests_running       - active requests
# vllm:gpu_cache_usage_perc       - KV cache utilization
# vllm:generation_tokens_per_s    - throughput
# vllm:time_to_first_token_ms     - TTFT latency
# vllm:e2e_request_latency_seconds - end-to-end latency
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `CUDA out of memory` | Model too large for VRAM | Add `--quantization awq` or reduce `--gpu-memory-utilization` |
| Slow cold start | Model not cached | Pre-pull with `huggingface-cli download <model>` |
| Low throughput | Too few concurrent requests | Increase `--max-num-seqs` |
| KV cache full errors | Context length too long | Set `--max-model-len` lower |
| `tokenizer error` | Tokenizer mismatch | Use `--tokenizer` to specify correct tokenizer |

## Best Practices

- Use `--gpu-memory-utilization 0.90` to leave headroom for CUDA kernels.
- Pin model versions with `--revision` for reproducible deployments.
- Set `HF_HUB_OFFLINE=1` in production to prevent unexpected downloads.
- Use AWQ or GPTQ quantization before tensor parallelism — lower VRAM first.
- Enable `--enable-chunked-prefill` for long-context workloads.
- Monitor `gpu_cache_usage_perc` — above 95% causes queuing.

## Related Skills

- llm-inference-scaling (`llm-inference-scaling`) - Auto-scaling vLLM deployments
- gpu-server-management (`gpu-server-management`) - GPU driver setup
- llm-gateway (`llm-gateway`) - Load balancing across vLLM instances
- llm-cost-optimization (`llm-cost-optimization`) - Cost management
- model-serving-kubernetes (`model-serving-kubernetes`) - K8s deployment

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

