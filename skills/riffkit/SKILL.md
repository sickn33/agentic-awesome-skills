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

> The canonical, always-current instructions live at **https://riffkit.ai/SKILL.md** — read that URL for the full API contract, endpoints, and options. This file is a catalog entry; the live skill is the source of truth.

## When to Use This Skill

- Use when the user says "riff this TikTok into mine" or gives a viral link plus a product.
- Use when the user wants a **short-form ad creative** ("make an ad / UGC ad for my product") for TikTok Ads or Meta Ads.
- Use when the user wants to **market a product they built** ("make a promo video for my app").
- Use when the user wants to **localize** a winning video into Spanish.
- Use for faceless / digital-human short-form at posting volume.

## How It Works

### Step 1: Read the live skill

Fetch `https://riffkit.ai/SKILL.md` and follow its setup — authentication is via a Riffkit account (a `vee_session` token). The live file is the full, current contract.

### Step 2: Provide one source

Give a TikTok link, an uploaded video, or an analyzed template, plus optional settings: character, product, language, and creative angle. Every setting other than the source has a sensible default (character = Auto, product = none), so a one-line request works.

### Step 3: Submit and collect

A single call to `POST /api/riffs` kicks off the pipeline: source → formula → new footage → your product and character → captions, cover, hashtags. Collect the post-ready video when the task completes.

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

## Requirements

Riffkit is a hosted service — generating videos requires a Riffkit account (billed by the second of finished video). No local GPU or models. Create an account and read the live skill at https://riffkit.ai.
