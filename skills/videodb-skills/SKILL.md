---
name: videodb-skills
description: "Upload, stream, search, edit, transcribe, and generate AI video and audio using the VideoDB SDK."
category: media
risk: critical
source: community
tags: "[video, editing, transcription, subtitles, search, streaming, ai-generation, media]"
date_added: "2026-02-27"
---

# VideoDB Skills

## Purpose

Use the VideoDB integration to upload supported video, connect real-time streams, search inside by what was said or shown, build complex editing workflows with overlays, generate AI media, add subtitles, and get instant streaming links — all via the VideoDB Python SDK.

## When to Use This Skill

- User wants to upload and process videos from YouTube, URLs, or local files
- User needs to search for moments by speech or visual scenes
- User asks for transcription, subtitles, or subtitle styling
- User wants to edit clips — trim, combine, add text/image/audio overlays
- User needs AI-generated media (images, video, music, sound effects, voiceovers)
- User wants to transcode, change resolution, or reframe for social platforms
- User needs real-time screen or audio capture with AI transcription
- User asks for playable streaming links for any video output

## Setup

### Step 1: Install the skill

```bash
npx skills add video-db/skills
```

### Step 2: Run setup

```
/videodb setup
```

The external skill may guide API key setup and SDK installation. Verify current provider pricing, credits and requirements rather than relying on a historical promotion. This catalog entry does not bundle the `/videodb setup` command.

Alternatively, set the API key manually:

```bash
read -rsp "VideoDB API key: " VIDEO_DB_API_KEY
echo
export VIDEO_DB_API_KEY
```

### Step 3: Install the SDK

```bash
pip install "videodb[capture]" python-dotenv
```

Before sending media, confirm the user has rights to the source and authorization for hosted processing and any charges. Screen/audio capture requires explicit scope, participant consent where applicable, and a defined stop condition. Avoid capturing unrelated windows or credentials. Keep API keys out of source/logs and review provider retention and stream-link access before sharing. Verify installed SDK capabilities; the table is an integration overview, not a tested compatibility matrix.

## Capabilities

| Capability  | Description                                                               |
| ----------- | ------------------------------------------------------------------------- |
| Upload      | Ingest videos from YouTube, URLs, or local files                          |
| Search      | Find moments by speech (semantic/keyword) or visual scenes                |
| Transcripts | Generate timestamped transcripts from any video                           |
| Edit        | Combine clips, trim, add text/image/audio overlays                        |
| Subtitles   | Auto-generate and style subtitles                                         |
| AI Generate | Create images, video, music, sound effects, and voiceovers from text      |
| Capture     | Real-time screen and audio capture with AI transcription                  |
| Transcode   | Change resolution, quality, aspect ratio, or reframe for social platforms |
| Stream      | Get playable HLS links for anything you build                             |

## Examples

**Upload and transcribe:**

```
"Upload https://www.youtube.com/watch?v=FgrO9ADPZSA and give me a transcript"
```

**Search across videos:**

```
"Search for 'product demo' in my latest video"
```

**Add subtitles:**

```
"Add subtitles with white text on black background"
```

**Multi-clip editing:**

```
"Take clips from 10s-30s and 45s-60s, add a title card, and combine them"
```

**AI media generation:**

```
"Generate background music and overlay it on my video"
```

**Real-time capture:**

```
"Capture my screen and transcribe it in real-time"
```

**Reframe for social:**

```
"Convert this to vertical for Instagram Reels"
```

## Repository

https://github.com/video-db/skills

**Version:** 1.1.0
**Maintained By:** [VideoDB](https://github.com/video-db)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
