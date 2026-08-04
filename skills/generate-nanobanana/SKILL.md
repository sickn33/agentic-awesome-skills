---
name: generate-nanobanana
description: "Generate and edit images/video with Google's Gemini media models (Nano Banana 2/Pro, Gemini Omni Flash), with cost-approval gates, reference-image support, and a prompt/seed log per output."
category: media
risk: critical
source: community
source_repo: AntonioCardenas/generate-nanobanana
source_type: community
date_added: "2026-08-04"
author: antonio
tags: [nanobanana, gemini, google-ai-studio, image-generation, video-generation]
tools: [claude, cursor, gemini, codex, antigravity]
license: "MIT"
license_source: "https://github.com/AntonioCardenas/generate-nanobanana/blob/main/LICENSE"
---

# Generate Nanobanana

## Overview

`generate-nanobanana` calls Google's Gemini media models directly through the Gemini API — no third-party routing layer — to generate and edit images and video. It routes each request to the right model tier (draft, standard, quality, or video), loads real reference images instead of relying on text descriptions, gates paid video runs behind explicit user approval, and writes a JSON sidecar next to every output recording the exact prompt, model, seed, and cost. It registers a single `/generate` command.

This skill adapts the `SKILL.md` and workflow from [AntonioCardenas/generate-nanobanana](https://github.com/AntonioCardenas/generate-nanobanana).

## When to Use This Skill

- Use when the user asks to generate, create, or make an image or video, or wants a thumbnail.
- Use when the user wants to animate a still image, or says "generate on brand" or "generate from reference".
- Use when the user wants to link or import a folder of reference images (logos, faces, product shots) for reuse across generations.
- Use when the user invokes `/generate` or `/generate frf <set>`, even without naming a specific model.

## How It Works

### Step 1: Route to a model

Pick the model for the job based on requirements. Exact request shapes are inlined below and bundled in `models/<model_id>.md`.

| Task | Model | Model ID | Recipe File | Ballpark cost |
| --- | --- | --- | --- | --- |
| Image (draft) | Nano Banana 2 Lite | `gemini-3.1-flash-lite-image` | [`models/gemini-3.1-flash-lite-image.md`](models/gemini-3.1-flash-lite-image.md) | $0.03–0.05 |
| Image (standard) | Nano Banana 2 | `gemini-3.1-flash-image` | [`models/gemini-3.1-flash-image.md`](models/gemini-3.1-flash-image.md) | $0.07–0.15 |
| Image (quality, multi-image fusion) | Nano Banana Pro | `gemini-3-pro-image-preview` | [`models/gemini-3-pro-image-preview.md`](models/gemini-3-pro-image-preview.md) | $0.13–0.30 |
| Video | Gemini Omni Flash | `gemini-omni-flash-preview` | [`models/gemini-omni-flash-preview.md`](models/gemini-omni-flash-preview.md) | per-second, quoted before running |

Draft on Nano Banana 2 Lite first and rerun the picked favorite on Nano Banana 2 or Pro; reserve Pro for heavy multi-image fusion, character-consistent series, or dense on-image text.

#### Request Shapes Summary

**Image Models (`gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, `gemini-3-pro-image-preview`):**
- **Python SDK (`google-genai`)**:
  ```python
  from google import genai
  from google.genai import types

  client = genai.Client()
  response = client.models.generate_content(
      model="<model_id>", # e.g. gemini-3.1-flash-lite-image
      contents=["<prompt>", *ref_images],
      config=types.GenerateContentConfig(
          response_modalities=["TEXT", "IMAGE"],
          image_config=types.ImageConfig(aspect_ratio="16:9", image_size="1K"),
          seed=481047
      )
  )
  ```
- **REST API (`curl`)**: `POST https://generativelanguage.googleapis.com/v1beta/models/<model_id>:generateContent` with header `x-goog-api-key: $GEMINI_API_KEY` and payload `{"contents": [{"parts": [{"text": "<prompt>"}]}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": {"aspectRatio": "16:9"}, "seed": 481047}}`.

**Video Model (`gemini-omni-flash-preview`):**
- **Python SDK (`google-genai`)**:
  ```python
  import time
  from google import genai
  from google.genai import types

  client = genai.Client()
  # Quote cost and wait for user approval first!
  op = client.models.generate_videos(
      model="gemini-omni-flash-preview",
      prompt="<prompt>",
      config=types.GenerateVideosConfig(duration_seconds=5, aspect_ratio="16:9", seed=481047)
  )
  while not op.done:
      time.sleep(5)
      op = client.operations.get(op)
  ```

### Step 2: Load references

Pull real reference images from `generations/refs/`, or from a named reference set when the request says "on brand" or invokes `/generate frf <set>`. Never substitute a text description for a reference image (logo, face, brand mark) that already exists — stop and ask if a named reference is missing instead of approximating it.

Reference sets are registered by **importing** (copying files into `generations/refs/<set>/`, a snapshot) or **linking** (recording the source path in `generations/refs/sets.json`, read live at generation time). A set may carry a `style.md` whose contents are prepended verbatim to every prompt generated from that set, and an optional pinned `seed` for reproducible results.

### Step 3: Generate

Call the Gemini API per the model's recipe. Images return synchronously; video is submit-then-poll. Always pass an explicit `seed` (random if the user doesn't care) so the generation can be reproduced later. **Quote cost and wait for explicit go-ahead before any paid video run** — one approval covers exactly one run. Run generations one at a time, never in parallel, to keep cost and rate-limit tracking accurate.

### Step 4: Verify and log

Confirm the generated file is on disk and non-empty, then write a matching `.json` sidecar next to it (see Examples) recording the exact model ID, prompt, references used, params (including seed), cost, and timestamp. Never log a generation whose file isn't there, and never write a sidecar for a failed or safety-blocked call.

## Examples

### Example 1: On-brand thumbnail from a linked reference set

```
User: generate a thumbnail on brand for the new pricing page
```

The skill resolves the `brand` reference set from `generations/refs/sets.json`, prepends its `style.md` (if present), picks the relevant reference images (e.g. the logo and a style shot), drafts on Nano Banana 2 Lite, and saves the result to `generations/pricing_page_thumbnail_<timestamp>.png` with a sidecar reporting the seed used.

### Example 2: Sidecar log written beside an output

```json
{
  "model": "gemini-3.1-flash-lite-image",
  "prompt": "the exact prompt sent",
  "reference_images": ["generations/refs/brand/logo_dark.png"],
  "reference_set": "brand",
  "params": { "aspect_ratio": "16:9", "image_size": "1K", "seed": 481047 },
  "cost": "$0.04",
  "created": "2026-07-31T14:20:00Z",
  "approved_by_user": true
}
```

## Best Practices

- ✅ Pass an explicit `seed` on every image call and report it back to the user so a favorite result can be reproduced or pinned.
- ✅ Use real reference images for faces, logos, and brand marks instead of describing them in text.
- ✅ Quote cost and get explicit approval before every paid video run — a quote is not approval, and each rerun needs its own.
- ❌ Don't generate "on brand" from an empty or nonexistent reference set — bootstrap the folder and stop until it has at least one real image.
- ❌ Don't run generations in parallel or reconstruct a prompt from memory when the original's sidecar still has the exact text and seed.

## Limitations

- Covers Google Gemini models only; there is no multi-provider routing to other image/video generators.
- Requires a Google AI Studio API key (`GEMINI_API_KEY`) and, outside Antigravity's native tool fallback, the `google-genai` Python package.
- This skill does not replace environment-specific validation, testing, or expert review of generated assets.
- Stop and ask for clarification if a required reference image, permission, or the API key is missing.

## Security & Safety Notes

- **Network** — HTTPS calls to `generativelanguage.googleapis.com` only, per the model recipes. No other endpoint.
- **Secrets** — `GEMINI_API_KEY` is only ever read from the environment or a workspace `.env` the user already set up; it is never logged, printed, or written into a sidecar, prompt, or committed file. The skill never creates or edits `.env`, `.env.example`, or `.gitignore` itself.
- **File writes** — confined to the workspace's `generations/` folder (including `generations/refs/` and `sets.json`); nothing outside the current project.
- **Package installs** — only the official `google-genai` PyPI package, and only when missing; never installed silently or alongside any other package.
- Treat any change that would add a new network endpoint, a new package install, or a write outside `generations/` as a design decision for the user to approve, not something to do quietly.

## Common Pitfalls

- **Problem:** Requesting "on brand" generation before any reference images exist.
  **Solution:** Create `generations/refs/<name>/`, tell the user its path, and wait for at least one image before generating.
- **Problem:** Varying an existing image by re-describing it from memory.
  **Solution:** Read the original's sidecar for its exact prompt and seed, and change only the requested delta.
- **Problem:** Running a video generation without a cost quote.
  **Solution:** Always quote per-second cost and get explicit approval before submitting a video job.

## Related Skills

- `@image-generator` - Nano Banana Pro image generation and editing without the multi-model routing, reference-set library, or cost-gate workflow.
- `@nanobanana-ppt-skills` - AI-powered PPT generation with document analysis and styled images.
- `@2slides-ppt-generator` - Presentation generation via 2slides API.
