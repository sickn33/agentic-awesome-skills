---
name: daily-gift
description: "Relationship-aware daily gift engine with five-stage creative pipeline — editorial judgment, synthesis, concept generation, visual strategy, and rendering in H5, image, or video"
category: productivity
risk: unknown
source: community
source_repo: openclaw/skills
source_type: community
date_added: "2026-04-15"
author: jiawei248
tags: [creative, gift, personalization, h5, image-generation, video-generation, relationship]
tools: [openclaw]
license: "MIT-0"
license_source: "https://clawhub.ai/jiawei248/daily-gift"
---

# Daily Gift

## Overview

A relationship-aware gift engine that decides *whether* a gift should exist before deciding *what* it should be. Uses a five-stage creative pipeline to generate personalized daily gifts in H5 (interactive web pages), AI-generated images, or AI-generated videos. The core design principle is "idea before medium" — the creative concept is locked before the output format is chosen.

Published on ClawHub: https://clawhub.ai/jiawei248/daily-gift

## When to Use This Skill

- Use when the agent should autonomously decide whether today deserves a personalized gift
- Use when a milestone, anniversary, or emotionally meaningful moment should be marked with a creative artifact
- Use when the user manually requests a visual gift from a quote, poem, or creative brief
- Use when you want a daily cron-triggered creative output that avoids repetition and template fatigue

## How It Works

### Stage 1: Editorial Judgment

Decide whether a gift should exist today, how heavy it should be (skip / nudge / light / standard / heavy), and what content direction to take (reflect, extension, compass, mirror, play, curation, utility, etc.). Format is NOT chosen here.

### Stage 2: Synthesis + Gift Thesis

Extract six content slots from conversation context (today_theme, emotion_peaks, historical_echo, open_loop, lobster_judgment, preference_hint). Form a gift thesis = anchor (which moment deserves the center) + return (what new perspective the agent gives back). If the thesis has no return, it's not a gift — it's a decorated log entry.

### Stage 2.5: Creative Concept

Generate 5+ concept candidates using seven thinking angles (metaphor flip, format mashup, impossible action, scale shift, role reversal, time distortion, cultural remix). Cross-pollinate with a library of 73 creative seeds across 8 categories. Run three quality checks: concept quality, concept diversity (8 families), and visual/theme collision detection.

### Format Selection

Only after the concept is locked does the system choose the output format (H5, image, or video) based on what best serves the concept.

### Stage 3: Visual Strategy

Choose visual approach, plan assets (pure code, generated background, hybrid), select visual style, and run pre-visualization checks against recent gifts for anti-repetition.

### Stage 4: Rendering

Produce the final artifact. H5 gifts use p5.js/canvas with a quality floor set by built-in templates (300-400 lines of tuned code). Image and video gifts use AI generation APIs. All formats have fallback chains.

## Key Features

- **Five-stage creative pipeline** with explicit quality gates between stages
- **Multi-layer anti-repetition**: concept family, visual elements, theme, style, content direction — each tracked across sliding windows of recent gifts
- **Three-layer user taste profile**: Layer 1 (identity — stable), Layer 2 (context — updates every 5-7 gifts), Layer 3 (signals — auto-appended after every gift)
- **Three runtime modes**: onboarding setup, daily cron, and manual trigger
- **11 content directions**: reflect, extension, compass, mirror, gift-from-elsewhere, play, real-world-nudge, curation, delayed-payoff, openclaw-inner-life, utility
- **8 concept families**: borrowed-media, interactive-object, transformation, narrative, data-viz, game-puzzle, real-world, poetic-literary

## Best Practices

- ✅ Let the editorial judgment decide — not every day needs a gift
- ✅ Generate 5+ concept candidates before selecting one
- ✅ Check recent gifts for visual and thematic collision before rendering
- ✅ Use the taste profile to personalize over time
- ❌ Don't skip straight from thesis to rendering without a real creative concept
- ❌ Don't default to "reflect on today" every time — vary content direction
- ❌ Don't choose the format before locking the concept

## Limitations

- Requires API keys for image/video generation (optional — H5 works without them)
- Cron mode runs in the agent's main session for full conversation context access
- Shell scripts make external API calls for rendering and asset fetching
- The skill creates and manages local workspace files for state, history, and taste profiling

## Security & Safety Notes

- The skill creates a recurring cron job for daily gift delivery. Review and approve the cron setup step.
- Shell scripts in `scripts/` call external APIs (image generation, video generation, asset hosting). Supply API keys only after reviewing which scripts use them.
- User taste data and gift history are stored locally in `workspace/daily-gift/`. No data is sent to external services beyond the configured rendering APIs.
- The skill reads conversation context and memory files to inform editorial judgment — this is core to personalization but means it has broad read access within the agent's workspace.

## Related Skills

- Image generation skills — for standalone image creation without the gift pipeline
- Cron/scheduling skills — for understanding the daily trigger mechanism
