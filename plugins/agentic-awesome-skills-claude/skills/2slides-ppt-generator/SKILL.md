---
name: 2slides-ppt-generator
description: "AI-powered presentation generation via the 2slides API — create slides from text, match a reference image style, summarize documents into decks, add AI voice narration, and export pages/audio. Use for any \"make slides\", \"create a deck\", or \"slides from this document\" request."
category: api-integration
risk: safe
source: community
source_repo: 2slides/slides-generation-2slides-skills
source_type: community
date_added: "2026-06-05"
author: 2slides
tags: [presentations, slides, powerpoint, ai, api-integration, pdf, narration, document-summarization]
tools: [claude, cursor, gemini, codex, antigravity]
plugin:
  setup:
    type: manual
    summary: "Install Python requirements and configure a 2slides API key before running generation scripts."
    docs: SKILL.md
---

# 2slides Presentation Generation

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Use when the user asks to "create a presentation", "make slides", or "generate a deck" from text or an outline.
- Use when the user wants slides that match the style of a reference image ("create slides like this image").
- Use when the user wants custom-designed PDF slides without a reference image.
- Use when the user uploads a document and asks to "create slides from this document".
- Use when the user wants to add AI voice narration to generated slides, or export slides as PNG images and narration as WAV audio.
- Use when the user asks "what themes are available?" or wants to browse/select a theme.

## Security & Safety Notes

- **Credentials:** This skill reads the API key from the `SLIDES_2SLIDES_API_KEY` environment variable. Never hard-code the key in commands, commit it, or echo it back to the user. The scripts send it as a bearer/`apikey` value to `https://2slides.com` over HTTPS only.
- **Network + paid mutations:** Every generation call makes an outbound network request to the 2slides API and **spends the user's credits** (10–210 credits/page depending on mode). Treat generation, reference-image, custom-PDF, and narration calls as billable actions — confirm intent before generating large or high-resolution (4K) decks, and surface the expected page count/cost when it is non-trivial.
- **No destructive local actions:** The scripts only read content/files the user points to and write generated output (e.g. a downloaded ZIP) to the path the user specifies. They do not modify or delete unrelated files.
- **Input handling:** Reference-image and document inputs are sent to the 2slides service for processing. Do not submit confidential material the user has not authorized for third-party processing.
- **Download URLs expire in 1 hour** — fetch artifacts promptly and do not treat the URLs as durable storage.

## Limitations

- Requires a valid 2slides account, API key, and sufficient credits; this skill does not provision or pay for credits.
- Results are AI-generated drafts intended as a starting point, not a final, fact-checked deliverable — review content before use.
- This skill does not replace environment-specific validation or expert review. Stop and ask for clarification if the API key, required inputs, or intended cost/scope are missing.
- Rate limits apply (Fast PPT 10/min, Nano Banana 6/min); poll async jobs every 20–30s rather than tight-looping.
