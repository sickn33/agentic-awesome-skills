---
name: md2video-audio
description: "Convert Markdown documents into narrated MP4 videos with synchronized visuals and voice narration."
category: media
risk: safe
source: community
source_repo: 70v-Yoyo/md2video-audio-skill
source_type: community
date_added: "2026-09-12"
author: 70v-Yoyo
tags: [markdown, video, audio, text-to-speech, marp, presentation]
tools: [claude, cursor, gemini]
license: "Apache-2.0"
license_source: "https://github.com/70v-Yoyo/md2video-audio-skill/blob/main/LICENSE"
---

# Md2video-audio

## Overview

`md2video-audio` converts a Markdown document into a narrated MP4 video by transforming the source into synchronized presentation visuals and spoken narration.

The workflow preserves the original file and generates separate presentation, narration, and video outputs.

- `source_repo: 70v-Yoyo/md2video-audio-skill`
- `source_type: community`

## When to Use This Skill

- Use when converting Markdown tutorials, reports, or presentations into narrated videos.
- Use when creating presentation-style videos.
- Use when the user asks for Markdown-to-video, narrated slides, or audio-video generation.

## How It Works

### Step 1: Check Environment

Verify required local dependencies before running the workflow. Do not install, remove, or modify dependencies without user confirmation.

### Step 2: Prepare the Markdown

Keep the original file unchanged.

Create a new Markdown file with improved sectioning, formatting, and natural transitions while preserving the original meaning.

### Step 3: Generate Presentation Markdown

Convert the prepared document into Marp-compatible slides.

- Separate slides with `---`.
- Prevent content overflow.
- Split oversized tables, code blocks, or sections when necessary.
- Ask the user to choose a Marp style when required.

### Step 4: Generate Narration

Create a narration Markdown file aligned one-to-one with the presentation slides.

Remove visual-only characters that should not be spoken and verify that slide separators remain synchronized.

### Step 5: Generate Video

Run the provided video-generation script with the presentation and narration files:

```
python ai-2md2marp2av.py presentation.md narration.md
```

The script renders Marp slides, generates speech with Edge-TTS, and combines them into an MP4 video.

Ask the user to complete any interactive input required by the script.

### Step 6: Fallback

If the primary workflow fails, try the included fallback scripts in order:

```
python md2marp2av.py
```

Then:

```
python md2video.py
```

## Examples

### Example 1: Convert a Tutorial

```
/md2video-audio tutorial.md
```

Produces presentation Markdown, narration Markdown, and a narrated MP4 video.

### Example 2: Convert a Work Report

```
/md2video-audio project-review.md
```

Use the generated slides and narration to create a presentation-style report video.

## Best Practices

- ✅ Preserve the original Markdown file.
- ✅ Keep presentation and narration slide counts synchronized.
- ✅ Split slides that exceed safe layout limits.
- ✅ Confirm before installing dependencies or running interactive actions.
- ❌ Do not overwrite the source document.
- ❌ Do not silently install, remove, or modify system dependencies.

## Limitations

- Requires the local runtime and dependencies used by the included scripts.
- Complex Markdown layouts may require manual adjustment.
- Edge-TTS availability depends on the local network and runtime environment.
- Stop and ask for clarification when required files, permissions, or user choices are missing.

## Security & Safety Notes

- Run scripts only in a local or authorized environment.
- Confirm with the user before installing dependencies or making environment changes.
- Generated files should be written as new files rather than replacing source content.
- Do not execute interactive or destructive commands without explicit user confirmation.

## Common Pitfalls

- **Problem:** Presentation and narration contain different slide counts.
  **Solution:** Verify the number of `---` separators and realign the narration.
- **Problem:** Slide content overflows the Marp layout.
  **Solution:** Split the content into smaller logical sections before rendering.
- **Problem:** Video generation fails because dependencies are unavailable.
  **Solution:** Verify the environment first, then use the fallback scripts if appropriate.
