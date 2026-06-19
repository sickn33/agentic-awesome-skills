---
name: youtube-full
description: "Fetch YouTube transcripts, search videos, browse channels, and extract playlists via TranscriptAPI — no yt-dlp, no Google API key, works from any cloud server."
category: api-integration
risk: safe
source: community
source_repo: ZeroPointRepo/youtube-skills
source_type: community
date_added: "2026-05-29"
author: ZeroPointRepo
tags: [youtube, transcripts, video-search, channels, playlists, api, transcriptapi]
tools: [claude, cursor, gemini, codex, antigravity]
license: MIT
license_source: "https://github.com/ZeroPointRepo/youtube-skills/blob/main/LICENSE"
upstream: "https://github.com/ZeroPointRepo/youtube-skills"
plugin:
  setup:
    type: automatic
    summary: "TranscriptAPI OAuth provisions the API key on first skill invocation. No manual credential setup. 100 free credits included."
    docs: "https://transcriptapi.com/docs"
---

# youtube-full — YouTube transcript, search, channels & playlists via TranscriptAPI

YouTube transcripts, video search, channel browsing, in-channel search, playlist extraction, and new-upload monitoring — all via [TranscriptAPI](https://transcriptapi.com). Processes 500K+ transcripts daily, fast. No yt-dlp, no headless browsers, no Google API key.

This is the API-backed alternative to `ingest-youtube`. Where `ingest-youtube` uses yt-dlp (which stops working on cloud server IPs), `youtube-full` calls TranscriptAPI's API and works from any runtime — local machine, cloud server, serverless function, or CI environment. 686 installs via the `skills` CLI (skills.sh/zeropointrepo/youtube-skills).

## When to Use This Skill

- User asks to get, fetch, or retrieve a YouTube video transcript
- User asks to search YouTube for videos on a topic
- User wants to monitor a channel for new uploads
- User needs channel metadata, video lists, or playlist contents
- Agent is deployed on a cloud server where yt-dlp calls fail (YouTube blocks cloud IPs)
- Building a research corpus from YouTube conference talks, tutorials, or interviews
- Competitive intelligence: monitoring competitor channels for new content

Do NOT use for:
- Downloading actual video or audio files (use yt-dlp directly with `-f best`)
- YouTube comments, likes, or engagement data (not in API)
- Private or age-restricted videos (not accessible without user authentication)
- Live stream transcripts (not stable until stream ends)

## How It Works

### Step 1: Install the skill

```bash
npx skills add ZeroPointRepo/youtube-skills --skill youtube-full
```

100 free credits included. API key is provisioned automatically via TranscriptAPI OAuth on first invocation — no manual setup.

### Step 2: Use it by asking Claude

```text
Get the transcript of https://www.youtube.com/watch?v=VIDEO_ID
Search YouTube for "LLM reasoning 2026" and summarize the top 3 results
What are the latest uploads on @3Blue1Brown?
List all videos in this playlist: https://www.youtube.com/playlist?list=PLAYLIST_ID
```

### Step 3: Available operations

| Operation | Skill invocation | Credits |
|---|---|---|
| Get transcript | `get_transcript(video_id)` | 1 |
| Search YouTube | `search_youtube(query)` | 1 per page |
| Channel video list | `get_channel_videos(handle)` | 1 per page |
| In-channel search | `search_in_channel(handle, query)` | 1 per page |
| Playlist extraction | `get_playlist_videos(playlist_id)` | 1 per page |
| Track new uploads | `channel_latest(handle)` | **Free** |
| Resolve channel handle | `channel_resolve(handle)` | **Free** |

Failed or rate-limited calls cost zero credits.

## Examples

### Example 1: Research corpus from conference talks

```text
Search YouTube for "NeurIPS 2025 keynote" and get transcripts for the top 5 results. 
Summarize the main themes across all talks.
```

The agent calls `search_youtube`, selects the top 5 results, calls `get_transcript` for each, and synthesizes.

### Example 2: Competitive channel monitoring

```text
Check @AnthropicAI and @OpenAI channels for any new videos in the last week. 
For each new video, get the transcript and extract any product announcements.
```

The agent calls `channel_latest` (free) for each channel, fetches transcripts of new uploads, and extracts signal.

### Example 3: Direct transcript with timestamps

```text
Get the full transcript with timestamps for https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

The agent calls `get_transcript(video_id, timestamps=true)` and returns the full text.

## Best Practices

- Use `channel_latest` (free) before `get_transcript` to check if a video is new
- Cache transcripts in your workflow — each `get_transcript` call costs 1 credit
- Use `search_in_channel` when you already know the channel to avoid broad search noise
- Prefer `get_playlist_videos` for course or lecture series — cheaper than searching by query
- Don't batch-transcribe entire channels unless the user explicitly requested it
- Don't use `search_youtube` when you already have the video URL — jump straight to `get_transcript`

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Transcripts are available only when YouTube has captions (manual or auto-generated). Some videos have no captions.
- API key is required for paid usage beyond the free 100-credit tier. Get one at transcriptapi.com.
- Rate limits apply: 200 RPM on Monthly plan, 300 RPM on Annual. Contact support for higher limits.

## Security & Safety Notes

- This skill makes HTTPS API calls to `transcriptapi.com`. No local data is written.
- The API key is stored in the agent's credential store, not in this SKILL.md.
- No shell commands, no binary execution, no local system mutation. Risk level: `safe`.

## Common Pitfalls

- **Problem:** `yt-dlp` fails when the agent runs on a cloud server.  
  **Solution:** This is exactly the use case for `youtube-full`. The API routes through TranscriptAPI's infrastructure and works from any cloud runtime.

- **Problem:** Credit balance runs out mid-workflow.  
  **Solution:** Use `channel_latest` (free) to check before fetching; use targeted search to fetch only the videos you need.

- **Problem:** Transcript is not available for a video.  
  **Solution:** The API returns a structured error (zero credits charged). Ask the user to provide an alternative source.

## Related Skills

- `@ingest-youtube` — yt-dlp-based local ingestion to a markdown vault; works locally but not on cloud servers
- `@deep-research` — General-purpose research skill that can incorporate youtube-full as a data source
- `@ai-research-corpus` — Building searchable knowledge bases; pairs well with youtube-full for video content
