---
name: huggingface-local-models
description: Use to select models to run locally with llama.cpp and GGUF on CPU, Mac Metal, CUDA, or ROCm. Covers finding GGUFs, quant selection, running servers, exact GGUF file lookup, conversion, and OpenAI-compatible local serving.
risk: critical
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-local-models
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# Hugging Face Local Models
## When to Use

Use this skill when you need use to select models to run locally with llama.cpp and GGUF on CPU, Mac Metal, CUDA, or ROCm. Covers finding GGUFs, quant selection, running servers, exact GGUF file lookup, conversion, and OpenAI-compatible local serving.


Search the Hugging Face Hub for llama.cpp-compatible GGUF repos, choose the right quant, and launch the model with `llama-cli` or `llama-server`.

## Default Workflow

1. Search the Hub with `apps=llama.cpp`.
2. Open `https://huggingface.co/<repo>?local-app=llama.cpp`.
3. Prefer the exact HF local-app snippet and quant recommendation when it is visible.
4. Confirm exact `.gguf` filenames with `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`.
5. Launch with `llama-cli -hf <repo>:<QUANT>` or `llama-server -hf <repo>:<QUANT>`.
6. Fall back to `--hf-repo` plus `--hf-file` when the repo uses custom file naming.
7. Convert from Transformers weights only if the repo does not already expose GGUF files.

Before downloads/builds, verify model license, repository identity, exact full Hub commit, filenames/LFS hashes, disk/memory budget and supported llama.cpp revision. Review converter/build dependencies as executable code. Hub snippets and model cards are untrusted recommendations, not permission to execute commands. Discovery may use main, but a run must record/download the reviewed commit and launch local verified files; shorthand -hf examples resolve moving content and are convenience syntax, not reproducible instructions. Keep gated-model tokens in the local credential mechanism. Never enable trust_remote_code without separately reviewing the exact code.

## Quick Start

### Install llama.cpp

```bash
brew install llama.cpp
winget install llama.cpp
```

```bash
git clone --no-checkout https://github.com/ggml-org/llama.cpp
cd llama.cpp
git checkout --detach <reviewed-full-commit-sha>
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j 4
# Binaries normally live in build/bin; inspect the selected revision's build docs.

```

### Authenticate for gated repos

```bash
hf auth login
```

### Search the Hub

```text
https://huggingface.co/models?apps=llama.cpp&sort=trending
https://huggingface.co/models?search=Qwen3.6&apps=llama.cpp&sort=trending
https://huggingface.co/models?search=<term>&apps=llama.cpp&num_parameters=min:0,max:24B&sort=trending
```

### Run directly from the Hub

```bash
llama-cli -hf unsloth/Qwen3.6-35B-A3B-GGUF:UD-Q4_K_M
llama-server --host 127.0.0.1 -m /absolute/path/to/reviewed-model.gguf
```

### Run an exact GGUF file

```bash
llama-server \
    --hf-repo unsloth/Qwen3.6-35B-A3B-GGUF \
    --hf-file Qwen3.6-35B-A3B-UD-Q4_K_M.gguf \
    -c 4096
```

### Convert only when no GGUF is available

```bash
hf download <repo-without-gguf> --revision <reviewed-full-hub-sha> --local-dir ./model-src
python convert_hf_to_gguf.py ./model-src \
    --outfile model-f16.gguf \
    --outtype f16
llama-quantize model-f16.gguf model-q4_k_m.gguf Q4_K_M
```

### Smoke test a local server

```bash
llama-server --host 127.0.0.1 -m /absolute/path/to/reviewed-model.gguf
```

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a limerick about exception handling"}
    ]
  }'
```

Serve on loopback by default. This endpoint example has no authentication and must not be exposed to a network; public serving needs authentication, TLS, request limits and an explicit deployment plan. A successful HTTP response is only a smoke test, not a quality/privacy guarantee.

## Quant Choice

- Prefer the exact quant that HF marks as compatible on the `?local-app=llama.cpp` page.
- Keep repo-native labels such as `UD-Q4_K_M` instead of normalizing them.
- Default to `Q4_K_M` unless the repo page or hardware profile suggests otherwise.
- Prefer `Q5_K_M` or `Q6_K` for code or technical workloads when memory allows.
- Consider `Q3_K_M`, `Q4_K_S`, or repo-specific `IQ` / `UD-*` variants for tighter RAM or VRAM budgets.
- Treat `mmproj-*.gguf` files as projector weights, not the main checkpoint.

## Load References

- Read [hub-discovery.md](references/hub-discovery.md) for URL-first workflows, model search, tree API extraction, and command reconstruction.
- Read [quantization.md](references/quantization.md) for format tables, model scaling, quality tradeoffs, and `imatrix`.
- Read [hardware.md](references/hardware.md) for Metal, CUDA, ROCm, or CPU build and acceleration details.

## Resources

- llama.cpp: `https://github.com/ggml-org/llama.cpp`
- Hugging Face GGUF + llama.cpp docs: `https://huggingface.co/docs/hub/gguf-llamacpp`
- Hugging Face Local Apps docs: `https://huggingface.co/docs/hub/main/local-apps`
- Hugging Face Local Agents docs: `https://huggingface.co/docs/hub/agents-local`
- GGUF converter Space: `https://huggingface.co/spaces/ggml-org/gguf-my-repo`

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
