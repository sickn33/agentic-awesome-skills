---
name: mmx-cli
description: "Use mmx to generate text, images, video, speech, and music via the MiniMax AI platform. Use when the user wants to create media content, chat with MiniMax models, perform web search, or manage MiniMax API resources from the terminal."
risk: safe
source: "https://github.com/MiniMax-AI/cli"
date_added: "2026-04-14"
---

# MiniMax CLI — Agent Skill Guide

Use `mmx` to generate text, images, video, speech, music, and perform web search via the MiniMax AI platform.

## When to Use

Use this skill when the user wants to generate or inspect text, images, video, speech, music, web-search results, or MiniMax API resources through the `mmx` terminal CLI.

## Prerequisites

```bash
# Install
npm install -g mmx-cli

# Auth (OAuth persists to ~/.mmx/credentials.json, API key persists to ~/.mmx/config.json)
mmx auth login --api-key sk-xxxxx

# Verify active auth source
mmx auth status

# Or pass per-call
mmx text chat --api-key sk-xxxxx --message "Hello"
```

Region is auto-detected. Override with `--region global` or `--region cn`.

---

## Agent Flags

Always use these flags in non-interactive (agent/CI) contexts:

| Flag | Purpose |
|---|---|
| `--non-interactive` | Fail fast on missing args instead of prompting |
| `--quiet` | Suppress spinners/progress; stdout is pure data |
| `--output json` | Machine-readable JSON output |
| `--async` | Return task ID immediately (video generation) |
| `--dry-run` | Preview the API request without executing |
| `--yes` | Skip confirmation prompts |

---

## Commands

### text chat

Chat completion. Default model: `MiniMax-M2.7`.

```bash
mmx text chat --message <text> [flags]
```

```bash
# Single message
mmx text chat --message "user:What is MiniMax?" --output json --quiet

# Multi-turn with system prompt
mmx text chat \
  --system "You are a coding assistant." \
  --message "user:Write fizzbuzz in Python" \
  --output json

# From file
cat conversation.json | mmx text chat --messages-file - --output json
```

---

### image generate

Generate images. Model: `image-01`.

```bash
mmx image generate --prompt <text> [flags]
```

```bash
mmx image generate --prompt "A cat in a spacesuit" --output json --quiet
mmx image generate --prompt "Logo" --n 3 --out-dir ./gen/ --quiet
```

---

### video generate

Generate video. Default model: `MiniMax-Hailuo-2.3`. Async task — polls until completion by default.

```bash
mmx video generate --prompt <text> [flags]
```

```bash
# Non-blocking: get task ID
mmx video generate --prompt "A robot." --async --quiet

# Blocking: wait and save file
mmx video generate --prompt "Ocean waves." --download ocean.mp4 --quiet
```

---

### speech synthesize

Text-to-speech. Default model: `speech-2.8-hd`. Max 10k chars.

```bash
mmx speech synthesize --text <text> [flags]
```

```bash
mmx speech synthesize --text "Hello world" --out hello.mp3 --quiet
echo "Breaking news." | mmx speech synthesize --text-file - --out news.mp3
```

---

### music generate

Generate music. Model: `music-2.6-free`.

```bash
mmx music generate --prompt <text> [--lyrics <text>] [flags]
```

```bash
# Instrumental
mmx music generate --prompt "Cinematic orchestral, building tension" --instrumental --out bgm.mp3 --quiet

# With auto-generated lyrics
mmx music generate --prompt "Upbeat pop about summer" --lyrics-optimizer --out summer.mp3 --quiet
```

---

### search query

Web search via MiniMax.

```bash
mmx search query --q "MiniMax AI" --output json --quiet
```

---

### vision describe

Image understanding via VLM.

```bash
mmx vision describe --image photo.jpg --prompt "What breed?" --output json
```

---

## Piping Patterns

```bash
# Chain: generate image → describe it
URL=$(mmx image generate --prompt "A sunset" --quiet)
mmx vision describe --image "$URL" --quiet

# Async video workflow
TASK=$(mmx video generate --prompt "A robot" --async --quiet | jq -r '.taskId')
mmx video task get --task-id "$TASK" --output json
mmx video download --task-id "$TASK" --out robot.mp4
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Usage error |
| 3 | Authentication error |
| 4 | Quota exceeded |
| 5 | Timeout |
| 10 | Content filter triggered |

---

## Limitations

- Requires a configured MiniMax account and valid authentication before any API-backed command will work.
- Media-generation tasks can be async, quota-limited, or region-constrained; agents should handle delayed completion and provider-side failures explicitly.
- This skill documents CLI usage only and does not replace provider policy review, content-safety checks, or downstream file validation.
