---
name: ingest-youtube
description: "Pull a YouTube video transcript into a queryable markdown vault with yt-dlp subtitle discovery, VTT cleanup, metadata frontmatter, and capture-seed stubs."
risk: safe
source: community
source_repo: adelaidasofia/ai-brain-starter
source_type: community
date_added: "2026-05-09"
license: MIT
license_source: "https://github.com/adelaidasofia/ai-brain-starter/blob/main/LICENSE"
upstream: "https://github.com/adelaidasofia/ai-brain-starter/tree/main/skills/ingest-youtube"
---

# ingest-youtube — YouTube-to-vault connector

Pulls YouTube transcripts into a markdown vault as queryable typed-memory entries that downstream skills (knowledge graph extraction, voice-fingerprint training, content repurposing, action-item extraction) can act on.

Same pattern as ingest-slack, ingest-whatsapp, ingest-notion, ingest-linear, ingest-github, ingest-gmail. Adding YouTube means a new normalizer, not a new architecture.

## When to use

- User pastes a YouTube URL and asks for a transcript or summary
- User says `/ingest-youtube <url>` for a single video
- User asks to capture, sync, ingest, transcribe, or pull a talk/podcast/keynote into the vault

Do NOT use for:
- Downloading the actual video file (use `yt-dlp` directly with `-f best`)
- Channel-wide ingestion or `--days` windows; this script ingests one video URL at a time
- Live streams (transcripts are not stable)
- Non-YouTube sources (Vimeo, Twitch, Twitter Spaces have their own connectors)
- One-off transcript reads where the user does not want a vault file (run `yt-dlp --write-auto-sub` directly and pipe to stdout)

## How it works

1. Parse the input as one YouTube video URL.
2. Verify `yt-dlp` is installed. If not, the script exits with install instructions: `brew install yt-dlp` (macOS) or `pip3 install --user yt-dlp`.
3. Call `yt-dlp --list-subs <url>` to enumerate available subtitles.
4. Subtitle priority: manual subs > auto-generated captions. Manual subs preserve creator-provided punctuation and speaker labels; auto-gen is uppercase + no punctuation.
5. Download the highest-priority subtitle as VTT via `yt-dlp --write-sub --sub-lang <lang> --skip-download`. Default language preference: `en,es` (English first, Spanish second).
6. Strip VTT timing markers and merge into clean prose paragraphs. Deduplicate repeated lines (auto-generated VTTs are line-doubled). Preserve speaker labels if the source had them.
7. Pull video metadata (title, channel, upload date, duration, video_id, URL) via `yt-dlp --print-json --skip-download`.
8. Slugify the channel name and video title. Write to `External Inputs/YouTube/<channel-slug>/<YYYY-MM-DD>-<video-slug>.md`.
9. Scan transcript for trigger keywords (decision, framework, model, principle, "the lesson is", playbook, anti-pattern, case study). For each match, create a writing-seed stub at `Meta/Captures/<YYYY-MM-DD>-youtube-<channel-slug>-<video-id>.md` so the seed lands in the captures aggregator.
10. Print summary: file path, transcript word count, language, seeds detected.

## Invocation

```bash
python3 ingest.py <youtube-url> [--vault <path>] [--lang <code>]
```

Defaults:
- `--vault`: `$VAULT_ROOT` env var or current directory
- `--lang`: `en,es` (English first, Spanish second; matches a common bilingual default)
- `--whisper`: accepted as a future fallback flag, but this version writes a stub when no subtitles are available

## Output contract

The vault file at `External Inputs/YouTube/<channel-slug>/<YYYY-MM-DD>-<video-slug>.md` has frontmatter:

```yaml
---
type: external-input
source: youtube
video_id: <11-char ID>
url: https://www.youtube.com/watch?v=<id>
channel: <channel-name>
channel_url: https://www.youtube.com/<handle>
title: <video title>
upload_date: <YYYY-MM-DD>
duration_seconds: <int>
language: <ISO code>
subtitle_source: manual | auto | whisper
word_count: <int>
ingested_at: <ISO 8601 timestamp>
---
```

Body is the cleaned transcript as paragraph prose. If the source had speaker labels, format as `**<speaker>:** <text>` per turn.

## Idempotency

Re-ingesting the same video URL overwrites the same vault file. The seed stub filenames hash the video_id, so the same source video produces the same stub filename across re-runs. Re-runs refresh, never duplicate.

## Missing subtitles

If `yt-dlp --list-subs` returns no manual or auto subtitles, the script writes a stub vault note with the video metadata and source URL instead of failing silently. The `--whisper` flag is reserved for a future local transcription fallback and currently reports that the fallback is not implemented.

For a manual fallback today, download audio with `yt-dlp`, transcribe it with your local Whisper workflow, and add captions or transcript text before rerunning the ingest.

## Limitations

- Ingests one YouTube video URL per run; channel handles, playlists, and `--days` windows are out of scope.
- Depends on subtitles returned by `yt-dlp`; videos without subtitles produce a metadata stub, not a transcript.
- Does not download video files or perform built-in Whisper transcription in this version.
- Network availability, YouTube subtitle access, and local `yt-dlp` behavior determine whether ingest succeeds.

## Acceptance test

Run against the first YouTube video ever uploaded:

```bash
python3 ingest.py "https://www.youtube.com/watch?v=jNQXAC9IVRw" --vault /tmp/test
```

Expected output:
```
Wrote 39 words to /tmp/test/External Inputs/YouTube/jawed/2005-04-24-me-at-the-zoo.md. Language: en. Subtitle source: manual.
```

The output file contains valid frontmatter and a clean prose body.

## Dependencies

- `yt-dlp` (required): install via `brew install yt-dlp` or `pip3 install --user yt-dlp`
- `whisper-cpp` (optional for a manual fallback outside this script)

## Source

Bundled in [adelaidasofia/ai-brain-starter](https://github.com/adelaidasofia/ai-brain-starter), a verification harness around an AI agent so memory compounds instead of corrupts. The skill is part of the ingest-* family of vault connectors.
