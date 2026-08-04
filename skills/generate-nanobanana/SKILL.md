---
name: generate-nanobanana
description: "Generate and edit images/video with Google's Gemini media models (Nano Banana 2/Pro, Gemini Omni Flash), with cost-approval gates, reference-image support, and a prompt/output log per call."
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

`generate-nanobanana` calls Google's Gemini media models directly through the Gemini API — no third-party routing layer — to generate and edit images and video. It routes each request to the right model tier (draft, standard, quality, or video), loads real reference images instead of relying on text descriptions, gates every paid call behind explicit user approval, and writes a JSON sidecar next to every output recording the exact prompt, model, and cost. It registers a single `/generate` command.

This skill adapts the workflow (model routing, reference-image handling, sidecar logging) from [AntonioCardenas/generate-nanobanana](https://github.com/AntonioCardenas/generate-nanobanana). The actual request shapes in `references/` were independently verified against the live [Gemini API docs](https://ai.google.dev/gemini-api/docs/image-generation) rather than copied from that upstream repo, whose examples predate Google's migration to the Interactions API and use stale, non-functional request methods. Model IDs, request contracts, and pricing all change on Google's own schedule — re-verify against the docs linked from each reference file before relying on this skill in a new session.

## When to Use This Skill

- Use when the user asks to generate, create, or make an image or video, or wants a thumbnail.
- Use when the user wants to animate a still image, or says "generate on brand" or "generate from reference".
- Use when the user wants to link or import a folder of reference images (logos, faces, product shots) for reuse across generations.
- Use when the user invokes `/generate` or `/generate frf <set>`, even without naming a specific model.

## How It Works

### Step 1: Route to a model

Pick the model for the job and read its reference file under [`references/`](references/) before calling anything — each file holds the current, verified request shape for that model.

| Task | Model | Model ID | Reference |
| --- | --- | --- | --- |
| Image (draft) | Nano Banana 2 Lite | `gemini-3.1-flash-lite-image` | [`references/gemini-3.1-flash-lite-image.md`](references/gemini-3.1-flash-lite-image.md) |
| Image (standard) | Nano Banana 2 | `gemini-3.1-flash-image` | [`references/gemini-3.1-flash-image.md`](references/gemini-3.1-flash-image.md) |
| Image (quality, multi-image fusion) | Nano Banana Pro | `gemini-3-pro-image` | [`references/gemini-3-pro-image.md`](references/gemini-3-pro-image.md) |
| Video | Gemini Omni Flash | `gemini-omni-flash-preview` | [`references/gemini-omni-flash-preview.md`](references/gemini-omni-flash-preview.md) |

All four models are called through the **Interactions API** (`client.interactions.create(...)`, REST `POST /v1beta/interactions`) — see each reference file for the exact shape, including reference-image input and, for video, large-output retrieval. Every call is billable; see Step 3.

Draft on Nano Banana 2 Lite first and rerun the picked favorite on Nano Banana 2 or Pro; reserve Pro for heavy multi-image fusion, character-consistent series, or dense on-image text.

### Step 2: Load references

Pull real reference images from `generations/refs/`, or from a named reference set when the request says "on brand" or invokes `/generate frf <set>`. Never substitute a text description for a reference image (logo, face, brand mark) that already exists — stop and ask if a named reference is missing instead of approximating it.

Reference sets are registered by **importing** (copying files into `generations/refs/<set>/`, a snapshot) or **linking** (recording the source path in `generations/refs/sets.json`, read live at generation time). A set may carry a `style.md` whose contents are prepended verbatim to every prompt generated from that set.

### Step 3: Generate

Call the Gemini API per the model's reference file. **Every generation — image or video — is billable and requires an explicit approval gate**: quote the current per-unit price from the live [pricing page](https://ai.google.dev/gemini-api/docs/pricing) for the selected model and get explicit user go-ahead before that specific call. One approval covers exactly one call; a rerun needs its own. Run generations one at a time, never in parallel, so approval and cost tracking stay accurate.

No model in this skill documents a `seed` or reproducibility parameter — do not promise an identical re-roll. For "same image but change X" requests, reuse the exact original prompt and reference images (from the sidecar log) and change only the requested delta; for video, chain edits via `previous_interaction_id` where supported (see the Omni Flash reference).

### Step 4: Verify and log

Confirm the generated file is on disk and non-empty, then write a matching `.json` sidecar next to it (see Examples) recording the exact model ID, prompt, references used, response `id`, cost, and timestamp. Never log a generation whose file isn't there, and never write a sidecar for a failed or safety-blocked call.

## Examples

### Example 1: On-brand thumbnail from a linked reference set

```
User: generate a thumbnail on brand for the new pricing page
```

The skill resolves the `brand` reference set from `generations/refs/sets.json`, prepends its `style.md` (if present), picks the relevant reference images (e.g. the logo and a style shot), quotes the current Nano Banana 2 Lite price and gets approval, then saves the result to `generations/pricing_page_thumbnail_<timestamp>.png` with a sidecar.

### Example 2: Sidecar log written beside an output

```json
{
  "model": "gemini-3.1-flash-lite-image",
  "prompt": "the exact prompt sent",
  "reference_images": ["generations/refs/brand/logo_dark.png"],
  "reference_set": "brand",
  "response_id": "v1_...",
  "params": { "aspect_ratio": "16:9", "image_size": "1K" },
  "cost": "{price quoted from the live pricing page before running}",
  "created": "2026-07-31T14:20:00Z",
  "approved_by_user": true
}
```

## Best Practices

- ✅ Quote the current price and get explicit approval before **every** paid generation — image or video, not just video. A quote is not approval, and each rerun needs its own.
- ✅ Use real reference images for faces, logos, and brand marks instead of describing them in text.
- ✅ Read the model's reference file in `references/` before calling it — model IDs and request shapes have already changed once in this skill's lifetime (Interactions API migration, `gemini-3-pro-image-preview` shutdown).
- ❌ Don't generate "on brand" from an empty or nonexistent reference set — bootstrap the folder and stop until it has at least one real image.
- ❌ Don't claim a generation is exactly reproducible — no model here documents a seed parameter. Reuse the exact prompt and references instead of promising identical output.
- ❌ Don't run generations in parallel or reconstruct a prompt from memory when the original's sidecar still has the exact text.

## Limitations

- Covers Google Gemini models only; there is no multi-provider routing to other image/video generators.
- Requires a Google AI Studio API key (`GEMINI_API_KEY`) and, outside Antigravity's native tool fallback, the `google-genai` Python package.
- No model documents a seed or reproducibility guarantee; reruns are best-effort via the saved prompt and references, not identical output.
- Model IDs and pricing are Google's to change; the reference files carry the model IDs verified at the time this skill was last updated, and each links to the live docs to re-verify against.
- This skill does not replace environment-specific validation, testing, or expert review of generated assets.
- Stop and ask for clarification if a required reference image, permission, or the API key is missing.

## Security & Safety Notes

- **Network** — Generation and file-transfer calls go to `generativelanguage.googleapis.com`; checking current docs or pricing contacts `ai.google.dev`, and an explicitly approved package install contacts the configured PyPI index. Never send prompts or reference media to any other endpoint.
- **Secrets** — `GEMINI_API_KEY` is only ever read from the environment or a workspace `.env` the user already set up; it is never logged, printed, or written into a sidecar, prompt, or committed file. The skill never creates or edits `.env`, `.env.example`, or `.gitignore` itself.
- **File writes** — skill-authored project outputs are confined to the workspace's `generations/` folder (including `generations/refs/`, REST request/response files, and `sets.json`); nothing is written outside the current project except an explicitly approved package installation in its selected environment.
- **Package installs** — only the official `google-genai` PyPI package, and only when missing; never installed silently or alongside any other package.
- **Cost** — every call spends real money against the user's Google AI Studio billing; that, plus filesystem writes, is why this skill is `risk: critical` rather than `safe`.
- Treat any change that would add a new network endpoint, a new package install, or a write outside `generations/` as a design decision for the user to approve, not something to do quietly.

## Common Pitfalls

- **Problem:** Requesting "on brand" generation before any reference images exist.
  **Solution:** Create `generations/refs/<name>/`, tell the user its path, and wait for at least one image before generating.
- **Problem:** Varying an existing image by re-describing it from memory.
  **Solution:** Read the original's sidecar for its exact prompt and references, and change only the requested delta.
- **Problem:** Running an image or video generation without a cost quote.
  **Solution:** Always quote the current per-unit price from the live pricing page and get explicit approval before submitting any paid call.
- **Problem:** Calling a model ID from memory instead of the reference file.
  **Solution:** Model IDs shift (e.g. `gemini-3-pro-image-preview` was shut down and replaced by `gemini-3-pro-image`) — always read `references/<model>.md` first.

## Related Skills

- `@image-generator` - Nano Banana Pro image generation and editing without the multi-model routing, reference-set library, or cost-gate workflow.
- `@nanobanana-ppt-skills` - AI-powered PPT generation with document analysis and styled images.
- `@2slides-ppt-generator` - Presentation generation via 2slides API.
