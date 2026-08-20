---
name: beatra-ai-video-studio
description: "Generate, animate, edit, and extend short AI videos for ads, product stories, and social clips. Use for Beatra video work from text, images, frames, or footage."
category: marketing
risk: safe
source: https://github.com/beatra-ai/beatra-skills/tree/main/skills/beatra-ai-video-studio
source_repo: beatra-ai/beatra-skills
source_type: official
date_added: "2026-08-20"
author: Beatra
tags: [beatra, ai-media, marketing]
tools: [claude, cursor, gemini, copilot]
license: MIT-0
license_source: https://github.com/beatra-ai/beatra-skills/blob/main/LICENSE
---

# Beatra AI Video Studio

## Overview

Official Beatra short-video workspace. Start from a written shot, a supplied image, first and last frames, references, or existing footage, then review the real clip before another paid stage.

Install the full package from the official repository, including `SKILL.md` and the bundled client. Do not re-implement Beatra calls in the host.

- Source: [skills/beatra-ai-video-studio](https://github.com/beatra-ai/beatra-skills/tree/main/skills/beatra-ai-video-studio)
- Catalog: [beatra-ai/beatra-skills](https://github.com/beatra-ai/beatra-skills)

## When to Use This Skill

- The user wants a short ad, product, social, or cinematic clip.
- The input is text-to-video, image-to-video, frame interpolation, or a continuation.
- The job is video-only and should not open the image or music studios.

## How It Works

### Step 1: Install the official package

Copy or pin the skill from `skills/beatra-ai-video-studio` in `beatra-ai/beatra-skills`. Keep the bundled `scripts/mcp_client.py` — it is the only supported client.

### Step 2: Use the host to understand the brief

Read the user's outcome, source media, and constraints. Infer ordinary details. Ask only when a missing answer changes the result, cost, model, voice-owner consent, or another high-impact choice.

### Step 3: Run the smallest Beatra workflow

Follow the official `SKILL.md` in the installed package. Reuse destination, prompt, source media, and accepted results already in the conversation. Return only what the task produced.

## Examples

### Example 1: Reach for the official package

```text
Install beatra-ai/beatra-skills skills/beatra-ai-video-studio and use it for this brief.
```

### Example 2: Stay inside this studio

```text
Keep the job on Beatra AI Video Studio. Do not switch studios unless the user changes the deliverable.
```

## Best Practices

- ✅ Install from `beatra-ai/beatra-skills`, not a rewritten copy of the client.
- ✅ Prefer media the user already supplied.
- ✅ Review the real delivery before another paid stage.
- ❌ Don't invent a host Beatra connector.
- ❌ Don't silently replace a usable source with a new generation.

## Limitations

- This catalog entry points at the official Beatra package. It does not replace the installed `SKILL.md` or bundled client.
- Credit-consuming work follows Beatra's live pricing and approval flow.
- Stop and ask if required inputs, consent, or destination constraints are missing.

## Related Skills

- `@beatra` - Universal Beatra suite when the job spans media types
- `@beatra-ai-image-studio` - Still-image generation and editing
- `@beatra-ai-video-studio` - Short AI video generation and editing
- `@beatra-ai-music-creator` - Songs, instrumentals, and soundtracks
- `@beatra-ai-voice-studio` - Narration, voice-over, and custom voices

## Additional Resources

- [Official skill](https://github.com/beatra-ai/beatra-skills/tree/main/skills/beatra-ai-video-studio)
- [Beatra skills repository](https://github.com/beatra-ai/beatra-skills)
