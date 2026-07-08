---
name: huggingface-best
description: 'Use when the user asks about finding the best, top, or recommended model for a task, wants to know what AI model to use, or wants to compare models by benchmark scores. Triggers on: "best model for X", "what model should I use for", "top models for [task]", "which model runs on my...'
risk: unknown
source: https://github.com/huggingface/skills/tree/main/skills/huggingface-best
source_repo: huggingface/skills
source_type: official
date_added: 2026-07-01
license: Apache-2.0
license_source: https://github.com/huggingface/skills/blob/main/LICENSE
---

# HuggingFace Best Model Finder
## When to Use

Use when the user asks about finding the best, top, or recommended model for a task, wants to know what AI model to use, or wants to compare models by benchmark scores. Triggers on: "best model for X", "what model should I use for", "top models for [task]", "which model runs on my...


Finds the best models for a task by querying official HF benchmark leaderboards, enriching
results with model size data, filtering for what fits on the user's device, and returning a
comparison table with benchmark scores.

---

## Step 1: Parse the request

Extract from the user's message:
- **Task**: what they want the model to do (coding, math/reasoning, chat, OCR, RAG/retrieval, speech recognition, image classification, multimodal, agents, etc.)
- **Device**: hardware constraints (MacBook M-series 8/16/32/64GB unified memory, RTX GPU with VRAM amount, CPU-only, cloud/no constraint, etc.)

If device is not mentioned, skip filtering entirely and return the highest-performing models regardless of size. If the task is genuinely ambiguous, ask one clarifying question.

### Device → max parameter budget

When a device is specified, extract its available memory (unified RAM for Apple Silicon, VRAM for discrete GPUs) and apply:

- **fp16 max params (B)** ≈ memory (GB) ÷ 2
- **Q4 max params (B)** ≈ memory (GB) × 2

Examples: 16GB → 8B fp16 / 32B Q4 — 24GB VRAM → 12B fp16 / 48B Q4 — 8GB → 4B fp16 / 16B Q4

---

## Step 2: Find relevant benchmark datasets

Fetch the full list of official HF benchmarks:

```bash
curl -s -H "Authorization: Bearer $(cat ~/.cache/huggingface/token)" \
  "https://huggingface.co/api/datasets?filter=benchmark:official&limit=500" | jq '[.[] | {id, tags, description}]'
```

Read the returned list and select the datasets most relevant to the user's task — match on dataset id, tags, and description. Use your judgment; don't limit yourself to 2-3. Aim for comprehensive coverage: if 5 benchmarks clearly cover the task, use all 5.

---

## Step 3: Fetch top models from leaderboards

For each selected benchmark dataset:

```bash
curl -s -H "Authorization: Bearer $(cat ~/.cache/huggingface/token)" \
  "https://huggingface.co/api/datasets/<namespace>/<repo>/leaderboard" | jq '[.[:15] | .[] | {rank, modelId, value, verified}]'
```

Collect model IDs and scores across all benchmarks. If a leaderboard returns an error (404, 401, etc.), skip it and note it in the output.

---

## Step 4: Enrich with model metadata

For the top 10-15 candidate model IDs, get model infos.

```bash
# REST API
curl -s -H "Authorization: Bearer $(cat ~/.cache/huggingface/token)" \
  "https://huggingface.co/api/models/org/model1" | jq '{safetensors, tags, cardData}'

# CLI (hf-cli)
hf models info org/model1 --json | jq '{safetensors, tags, cardData}'
```

Extract from each response:
- **Parameters**: `safetensors.total` → convert to B (e.g., 7_241_748_480 → "7.2B")
- **License**: from model card tags (look for `license:apache-2.0`, `license:mit`, etc.)
- If `safetensors` is absent, parse size from the model name (look for "7b", "8b", "13b", "70b", "72b", etc.)

---

## Step 5: Filter and rank

**If a device was specified:**
1. Remove models exceeding the fp16 parameter budget for the device
2. Flag models that fit only with Q4 quantization (multiply budget by ~4 for Q4 capacity)
3. If a highly-ranked model is slightly over budget, keep it with a "needs Q4" note — don't silently drop it

**If no device was mentioned:** skip all size filtering — just rank by benchmark score.

Then: rank by benchmark score (descending), keep top 5-8 models.

Include proprietary models (GPT-4, Claude, Gemini) if they appear on leaderboards, but flag them as "API only / not self-hostable". If the user explicitly asked for local/open models only, exclude them.

---

## Step 6: Output

### Comparison table

```markdown
| # | Model | Params | [Benchmark 1] | [Benchmark 2] | License | On device |
|---|-------|--------|--------------|--------------|---------|-----------|
| ⭐1 | [org/name](https://huggingface.co/org/name) | 7B | 85.2% | — | Apache 2.0 | Yes (fp16) |
| 2 | [org/name](https://huggingface.co/org/name) | 13B | 83.1% | 71.5% | MIT | Q4 only |
| 3 | [org/name](https://huggingface.co/org/name) | 70B | 90.0% | 81.0% | Llama | Too large |
```

- Link model names to `https://huggingface.co/<model_id>`
- Use `—` for benchmarks where the model wasn't evaluated
- Star the top recommended pick with ⭐
- "On device" values: `Yes (fp16)`, `Q4 only`, `Too large`, `API only`

### Follow-up

After presenting the table, ask the user: "Would you like to run **[top recommended model]**?"

If they say yes, ask whether they'd prefer to:
- **Run locally** — ask about their device if not already known, then give appropriate setup instructions
- **Run on HF Jobs** — point them to the HF Jobs guide: https://huggingface.co/docs/huggingface_hub/en/guides/jobs

---

## Error handling

- **Leaderboard not found**: skip, note "leaderboard unavailable" in output
- **Model missing from hub_repo_details**: fall back to parsing size from model name
- **No benchmarks found for task**: use the curated fallback table above, or try `hub_repo_search` with `filters=["<task>"]` sorted by `trendingScore`
- **All leaderboards fail**: fall back to `hub_repo_search` for popular models tagged with the task, note that results are by popularity rather than benchmark score

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
