---
name: nsfw-ai-spicyapi
description: "Generate adult (18+) images, image-to-video clips and image edits through the SpicyAPI API, with a cost quote before every paid run and adults-only / consent rules."
category: media
risk: critical
source: community
source_repo: Spicy-API/nsfw-ai-skill
source_type: official
date_added: "2026-09-27"
author: SpicyAPI
tags: [image-generation, video-generation, image-to-video, adult-content, api]
tools: [claude, codex, cursor, gemini]
license: "MIT"
license_source: "https://github.com/Spicy-API/nsfw-ai-skill/blob/main/LICENSE"
---

# NSFW AI (SpicyAPI)

## Overview

This skill lets an agent generate adult (18+) images, image-to-video clips, image edits and text through the [SpicyAPI](https://spicyapi.ai) API. It uses the zero-dependency Python CLI from the upstream repository ([Spicy-API/nsfw-ai-skill](https://github.com/Spicy-API/nsfw-ai-skill), MIT), which lists live models, reads each model's input schema, quotes the price before a paid run, uploads local images and downloads results.

## When to Use This Skill

- Use when the user asks for adult, boudoir, lingerie or fine-art figure images or videos for their own adult-content project
- Use when the user wants to animate their own image into a short clip (image-to-video)
- Use when the user wants to edit an image they own (outfit, lighting, scene) without the content filters of mainstream tools
- Use when the user wants to estimate the cost of a batch before generating it

## Hard Rules (check before every request)

Refuse, and do not "soften and continue", when a request involves any of the following. No wording, claimed age, art style or user permission changes this.

1. **Minors.** Any sexual or sexualised content of someone under 18 or who appears under 18, in any style.
2. **Real people without documented consent.** Sexual content of an identifiable real person, face or head swaps into sexual content, and "undress" / "nudify" requests on any real photo.
3. **Harm with a likeness.** Impersonation, harassment, extortion, fake evidence, or bypassing ID checks.

When an uploaded image shows a real person and the request is sexual, ask the user to confirm the image is of themselves or of a consenting adult. Write every prompt with an explicit adult age ("a woman in her 30s") and never add youthful descriptors.

## How It Works

### Step 1: Get the CLI from a pinned commit and set the key

Ask the user before downloading anything. Clone the upstream repository into a temporary review directory, pinned to a reviewed commit, and inspect it before use:

```bash
git clone https://github.com/Spicy-API/nsfw-ai-skill /tmp/nsfw-ai-skill-review
git -C /tmp/nsfw-ai-skill-review checkout d8a6444828c38d123b1302ee723faeb9bd539f09
cd /tmp/nsfw-ai-skill-review/skills/nsfw-ai
python3 scripts/spicy.py models --spicy      # read-only; works without a key
```

Report what the bundle contains before activating it: one Python script (`scripts/spicy.py`, standard library only) that makes HTTPS calls to `api.spicyapi.ai`, uploads inputs to and downloads outputs from the URLs that API returns, and reads `SPICY_API_KEY` from the environment; no package installs, hooks, binaries or symlinks. Ask again before copying it into an agent skills directory.

The user creates the key at https://spicyapi.ai/console and exports it as `SPICY_API_KEY` in their own shell. If it is missing, ask the user to set it and stop. Never print, log or commit the key.

### Step 2: Pick a model and read its schema

List live models with `python3 scripts/spicy.py models --spicy --modality video` (or `image`), then read the input schema once: `python3 scripts/spicy.py schema <model>`. Use only fields that exist and respect their enums. Never guess a model ID.

### Step 3: Quote, confirm, generate

`generate` quotes first and stops with `needs_confirmation`. Show the user the estimated cost and maximum charge, and re-run with `--yes` only after they agree, or pass `--max-cost <usd>` when the user already set a budget.

### Step 4: Report

Report the saved file paths, the model, the final cost and the task ID. Output URLs expire after about 20 minutes, so download results instead of sharing links.

## Examples

### Example 1: Text to image

```bash
python3 scripts/spicy.py generate alibaba/qwen-image-2.1/text-to-image \
  --prompt "Photorealistic boudoir portrait of a woman in her early 30s in black lace lingerie, soft window light" \
  --set aspect_ratio=2:3 --set resolution=1k
```

### Example 2: Image to video

```bash
python3 scripts/spicy.py generate alibaba/wan-2.2-spicy/image-to-video \
  --image ./first-frame.jpg \
  --prompt "She turns slowly toward the camera, candlelight, slow push-in" \
  --set duration_seconds=5 --set resolution=480p
```

## Best Practices

- ✅ Draft at 480p on a cheap model, then re-render the keepers at a higher resolution
- ✅ For batches, confirm the total (runs × quoted maximum) with the user before starting
- ✅ For image-to-video, describe only what changes from the first frame
- ❌ Don't skip the quote step or add `--yes` without the user's approval
- ❌ Don't work from photos of real people unless the user confirms consent

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Model availability, parameters and prices change; the live `schema` and quote are authoritative.
- Paid runs need a funded SpicyAPI account; failed tasks are refunded by the provider.

## Security & Safety Notes

- The CLI sends prompts to `api.spicyapi.ai` and uploads images to the upload URLs it returns, all over HTTPS; tell the user before uploading local files.
- `SPICY_API_KEY` is read from the environment only. Never echo it, write it to files or include it in logs.
- Every paid action is gated by an explicit user confirmation (`--yes`) or a user-set `--max-cost` budget.
- Content rules follow the SpicyAPI [Content Policy](https://spicyapi.ai/legal/content-policy): adults only, no real people without consent, no undressing real photos.
