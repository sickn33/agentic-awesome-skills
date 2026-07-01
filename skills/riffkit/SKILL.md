---
name: riffkit
description: "Riff a winning TikTok into your own short video — study a proven video's emotion formula and regenerate it with your product, character, and language (EN/ES). Also makes UGC ad creative."
category: api-integration
risk: safe
source: community
source_repo: riffkit/skill
source_type: community
date_added: "2026-07-01"
author: riffkit
tags: [video, short-form, tiktok, ai-video, marketing, ads, ecommerce, api-integration]
tools: [claude, cursor, gemini, codex, antigravity]
plugin:
  setup:
    type: manual
    summary: "Sign in to a Riffkit account and pass a vee_session token; the skill calls the hosted Riffkit backend (rendering is billed by the second)."
    docs: SKILL.md
license: "MIT"
license_source: "https://github.com/riffkit/skill/blob/main/LICENSE"
---

# Riffkit — riff winning TikToks into your own short videos

## Overview

Riffkit takes one winning short video, studies its *formula* — the hook, pacing, and emotional beats that made it retain viewers — and generates a brand-new video around your product, character, and language (English or Spanish). It never re-uploads the source; the output is your own original. Rendering runs on Riffkit's hosted backend.

This file is self-contained for the core workflow below. The full, always-current API contract (every endpoint, param, and response) lives at **https://riffkit.ai/SKILL.md** — read it when you need exhaustive detail.

## When to Use This Skill

- Use when the user says "riff this TikTok into mine" or gives a viral link plus a product.
- Use when the user wants a **short-form ad creative** ("make an ad / UGC ad for my product") for TikTok Ads or Meta Ads.
- Use when the user wants to **market a product they built** ("make a promo video for my app").
- Use when the user wants to **localize** a winning video into Spanish.
- Use for faceless / digital-human short-form at posting volume.

## How It Works

### Step 1: Authenticate

Riffkit uses a Riffkit account session — a `vee_session` token (sign in at https://riffkit.ai). Pass it on API requests. Treat it as a secret: never print, log, or persist it beyond the request.

### Step 2: Pick exactly one source (required)

One of: a TikTok link (`tiktok_url`), an uploaded video (`video`, ≤100MB), or an already-analyzed template (`formula_id`). This is the only required input.

### Step 3: Optional settings (all have sensible defaults)

- **character** — default **Auto** (AI-generated on-camera person; no avatar needed)
- **product** — default **none**; attach a product to place it into the scene
- **language** — default **English**; English or Spanish
- **content_anchor** — optional creative direction (which selling point / angle)

### Step 4: Confirm, then submit

Restate the plan (source / character / product / language) and get **explicit confirmation** — the submit is the one financial commitment, since rendering is billed. Then make a single call: `POST /api/riffs`. If the account balance is insufficient, the API returns HTTP 402 with a top-up URL; relay it and stop (no silent retry).

### Step 5: Monitor and collect

Poll `GET /api/tasks/batch/{batch_id}` (every ~10–15s) until complete, then `GET /api/assets` for the finished video, caption, and hashtags.

## Examples

### Example 1: Riff a proven format for your product

```
riff https://www.tiktok.com/@user/video/123 into a video for my product, in English
```

### Example 2: Make a UGC ad creative

```
riff this winning ad into a branded creative for my product
```

### Example 3: Localize to native Spanish

```
riff https://www.tiktok.com/@user/video/123 into my product video, in Spanish
```

## Best Practices

- ✅ Lock the source first; everything else has a sensible default, so a one-line request works.
- ✅ Confirm exactly once before submitting (rendering is billed by the second).
- ❌ Never auto-submit, and never auto-retry a failed task (a retry re-charges).
- ✅ Keep the `vee_session` token out of logs and output.
- ✅ Defer to https://riffkit.ai/SKILL.md for the exhaustive, current API contract.

## Security & Safety Notes

- **Auth:** the `vee_session` token is tied to the user's Riffkit account. Treat it as a secret — never log, echo, or persist it beyond the API request.
- **Billing:** `POST /api/riffs` starts a paid render (billed by the second). Always get explicit user confirmation before submitting, and do not auto-retry failed tasks (a retry re-charges).
- **No destructive or privileged actions:** the skill only reads account data and submits render jobs a normal authenticated user can make. It calls no staff/admin or destructive endpoints, and it never publishes output to any platform — it returns a download link and lets the user post.

## Limitations

- Makes **riff videos only** — it analyzes a source video's formula and regenerates it. It does not do unrelated content formats or features the product doesn't have.
- Output language is **English or Spanish only**.
- **Hosted service:** requires an active Riffkit account; rendering is billed by the second (no local/self-hosted mode and no free tier).
- **Never publishes** to any platform — it returns a video + caption; posting is the user's action.
- Stop and ask for clarification when a required input, permission, or the pre-submit confirmation is missing.

## Common Pitfalls

- **Problem:** Auto-submitting as soon as the user says "riff this."
  **Solution:** Decide the source and config, but wait for an explicit go-ahead before calling `POST /api/riffs`.
- **Problem:** Treating character or product selection as a mandatory step.
  **Solution:** Use the defaults — character = Auto, product = none — unless the user asks for either.
- **Problem:** Proactively querying or reporting the credit balance.
  **Solution:** Only surface balance on an HTTP 402 or when the user explicitly asks.

## Requirements

Riffkit is a hosted service — generating videos requires a Riffkit account (billed by the second of finished video). No local GPU or models. Create an account and read the live skill at https://riffkit.ai.
