---
name: modellix
description: "Integrate Modellix unified API/CLI for async AI image and video generation (model run --wait, task download)."
category: creative
risk: critical
source: community
source_repo: Modellix/modellix-skill
source_type: official
date_added: "2026-07-16"
author: Modellix
tags: [image-generation, video-generation, modellix, cli, api]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Modellix/modellix-skill/blob/main/LICENSE"
---

# Modellix

## Overview

Modellix is a Model-as-a-Service platform for AI image and video generation. This skill teaches agents to use the official `modellix-cli` workflow (doctor → model run --wait → task download).

Upstream package: https://github.com/Modellix/modellix-skill/tree/main/modellix-skill

## When to Use This Skill

- Generate images from text prompts
- Generate or edit videos from text or images
- Call Modellix models through a unified API/CLI
- The user mentions Modellix, Seedream, Seedance, Nano Banana, or similar providers via Modellix

## How It Works

1. Authenticate with `MODELLIX_API_KEY` or `modellix-cli auth login`
2. Run `modellix-cli doctor --json`
3. Use default models when unspecified (T2I: `google/nano-banana-2-lite`, T2V: `bytedance/seedance-2.0-mini-t2v`)
4. Submit with `modellix-cli model run --wait --json`
5. Persist outputs with `modellix-cli task download`

## Examples

### Text-to-image

```bash
modellix-cli model run \
  --model-slug google/nano-banana-2-lite \
  --body '{"prompt":"A cinematic sunset over a futuristic city"}' \
  --wait --timeout 5m --json
```

### Text-to-video

```bash
modellix-cli model run \
  --model-slug bytedance/seedance-2.0-mini-t2v \
  --body '{"prompt":"Ocean waves under a cloudy sunset"}' \
  --wait --timeout 10m --json
```

## Best Practices

- Prefer CLI `model run --wait` over hand-rolled polling
- Before a paid submission, disclose the provider, model, prompt or source media that will leave the machine, expected cost, and output path; obtain explicit user approval
- Prefer session-scoped API-key use; run `modellix-cli auth login` only when the user approves persistent local credential storage
- Do not blindly retry paid submissions after unknown outcomes — check `task history`
- Confirm the destination and overwrite policy before `task download`; never replace an existing file without explicit approval
- Fetch request schemas from `model describe` `docs_url` or https://docs.modellix.ai/llms.txt

## Security & Safety Notes

- Requires a Modellix API key; never print secrets in logs
- Prompts and uploaded source media leave the machine for `api.modellix.ai` and Modellix CDN processing
- Paid generation consumes account balance and must not be submitted or retried without the approval described above

## Limitations

- Requires a Modellix account, network access, a valid API key, and sufficient account balance.
- Model availability, request schemas, pricing, quotas, moderation, and generation time are controlled by Modellix and may change.
- Generated outputs require human review for quality, rights, privacy, and policy compliance before publication.
- This skill documents the CLI workflow only; it does not define a REST fallback or guarantee that a completed remote task downloads successfully.
