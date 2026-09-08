---
name: audio-transcriber
description: "Transform audio recordings into professional Markdown documentation with intelligent summaries using LLM integration"
category: content
risk: safe
source: community
tags: "[audio, transcription, whisper, meeting-minutes, speech-to-text]"
date_added: "2026-02-27"
---

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
Invoke this skill when:

- User needs to transcribe audio/video files to text
- User wants meeting minutes automatically generated from recordings
- User requires speaker identification (diarization) in conversations
- User needs subtitles/captions (SRT, VTT formats)
- User wants executive summaries of long audio content
- User asks variations of "transcribe this audio", "convert audio to text", "generate meeting notes from recording"
- User has audio files in common formats (MP3, WAV, M4A, OGG, FLAC, WEBM)

## Example Usage

### **Example 1: Basic Transcription**

**User Input:**
```bash
copilot> transcribe audio to markdown: meeting-2026-02-02.mp3
```

**Skill Output:**

```bash
✅ Faster-Whisper detected (optimized)
✅ ffmpeg available (format conversion enabled)

📂 File: meeting-2026-02-02.mp3
📊 Size: 12.3 MB
⏱️  Duration: 00:45:32

🎙️  Processing...
[████████████████████] 100%

✅ Language detected: Portuguese (pt-BR)
👥 Speakers identified: 4
📝 Generating Markdown output...

✅ Transcription Complete!

📊 Results:
  File: meeting-2026-02-02.md
  Language: pt-BR
  Duration: 00:45:32
  Speakers: 4
  Words: 6,842
  Processing time: 127s

📝 Generated:
  - meeting-2026-02-02.md (Markdown report)

🎯 Next steps:
  1. Review meeting minutes and action items
  2. Share report with participants
  3. Track action items to completion
```


### **Example 3: Batch Processing**

**User Input:**
```bash
copilot> transcreva estes áudios: recordings/*.mp3
```

**Skill Output:**

```bash
📦 Batch mode: 5 files found
  1. team-standup.mp3
  2. client-call.mp3
  3. brainstorm-session.mp3
  4. product-demo.mp3
  5. retrospective.mp3

🎙️  Processing batch...

[1/5] team-standup.mp3 ✅ (2m 34s)
[2/5] client-call.mp3 ✅ (15m 12s)
[3/5] brainstorm-session.mp3 ✅ (8m 47s)
[4/5] product-demo.mp3 ✅ (22m 03s)
[5/5] retrospective.mp3 ✅ (11m 28s)

✅ Batch Complete!
📝 Generated 5 Markdown reports
⏱️  Total processing time: 6m 15s
```


### **Example 5: Large File Warning**

**User Input:**
```bash
copilot> transcribe audio to markdown: conference-keynote.mp3
```

**Skill Output:**

```bash
✅ Faster-Whisper detected (optimized)

📂 File: conference-keynote.mp3
📊 Size: 87.2 MB
⏱️  Duration: 02:15:47
⚠️  Large file (87.2 MB) - processing may take several minutes

Continue? [Y/n]:
```

**User:** `Y`

```bash
🎙️  Processing... (this may take 10-15 minutes)
[████░░░░░░░░░░░░░░░░] 20% - Estimated time remaining: 12m
```


This skill is **platform-agnostic** and works in any terminal context where GitHub Copilot CLI is available. It does not depend on specific project configurations or external APIs, following the zero-configuration philosophy.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
