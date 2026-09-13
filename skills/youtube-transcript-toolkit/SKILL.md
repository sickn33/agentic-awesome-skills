---
name: youtube-transcript-toolkit
description: "Fetch YouTube video transcripts, search videos/channels, browse channels, and extract playlists via getyoutubetranscript.com — free API tier, no card required."
category: api-integration
risk: safe
source: community
source_repo: tubeagentkit/youtube-transcript-skills
source_type: official
date_added: "2026-09-13"
author: tubeagentkit
tags: [youtube, transcripts, video-search, channels, playlists, api]
tools: [claude, cursor, gemini, codex, antigravity]
license: MIT
license_source: "https://github.com/tubeagentkit/youtube-transcript-skills/blob/main/LICENSE"
upstream: "https://github.com/tubeagentkit/youtube-transcript-skills"
---

# youtube-transcript-toolkit — transcripts, search, channels & playlists via getyoutubetranscript.com

Fetches transcripts, search results, and channel/playlist data from YouTube via the [getyoutubetranscript.com](https://getyoutubetranscript.com) REST API, so an agent can summarize, quote, search, or analyze a video's spoken content without the user copy-pasting it in by hand.

No yt-dlp, no headless browser, no Google Cloud API key or quota setup. The skill can also provision a fresh API key for the user itself, by email, entirely inside the conversation — no dashboard visit required to get started.

## When to Use This Skill

- User asks to get, fetch, or summarize a YouTube video's transcript
- User asks to search YouTube for videos or channels on a topic
- User wants a channel handle resolved to its channel ID, or a channel's recent or full upload history
- User wants to search inside one specific channel's videos
- User wants the contents of a YouTube playlist
- Building a research corpus or monitoring competitor/creator channels for new uploads

Do NOT use for:
- Downloading actual video or audio files (not offered by this API)
- YouTube comments, likes, or other engagement data (not in the API)
- Private or age-restricted videos (not accessible without user authentication)
- Per-line timestamped transcripts — the API returns the full spoken text as one plain string, not a segmented/timestamped list

## How It Works

### Step 1: Install the skill

```bash
npx skills add tubeagentkit/youtube-transcript-skills --skill youtube-transcript
```

Or via ClawHub (OpenClaw/ClawdBot/Moltbot):

```bash
npx clawhub@latest install tubeagentkit/youtube-transcript
```

### Step 2: Get an API key (no dashboard visit required)

Every call needs an API key. If `YOUTUBE_TRANSCRIPT_API_KEY` isn't already set and the user hasn't pasted one in, the skill gets one directly: it asks for explicit consent and an email address, sends it to `POST /api/v1/signup` to create a free account (100 credits, no card), and exchanges the 6-digit code the user receives for a real key via `POST /api/v1/signup/verify`. The key is shown once; the skill asks before persisting it anywhere beyond the current session.

Already have an account? Grab the key from the [dashboard](https://getyoutubetranscript.com/dashboard) instead.

### Step 3: Use it by asking the agent

```text
Summarize this video: https://www.youtube.com/watch?v=VIDEO_ID
Find videos about machine learning
What has @veritasium posted recently?
Search MKBHD's channel for iPhone reviews
List all videos in this playlist: https://www.youtube.com/playlist?list=PLAYLIST_ID
```

### Step 4: Available endpoints

Base URL: `https://getyoutubetranscript.com/api/v1`. Auth via `Authorization: Bearer <key>` or `x-api-key: <key>`.

| Endpoint | Cost | What it does |
|---|---|---|
| `GET /transcript` | 1 credit | Full transcript + title/author/thumbnail for one video |
| `GET /search` | 1 credit/page | Search YouTube for videos or channels, paginated |
| `GET /resolve` | Free | Resolve a channel handle/URL/ID to its canonical channel ID |
| `GET /channel/latest` | Free | Channel metadata + its home tab's "Latest Videos" |
| `GET /channel/videos` | 1 credit/page | Every video a channel has ever uploaded, fully paginated |
| `GET /channel/search` | 1 credit/page | Search within one channel's videos, fully paginated |
| `GET /playlist` | 1 credit/page | Every video in a playlist, fully paginated |

Only successful calls are charged — failed or rate-limited calls cost zero credits.

## Examples

### Example 1: Research corpus from conference talks

```text
Search YouTube for "NeurIPS 2025 keynote" and get transcripts for the top 5 results.
Summarize the main themes across all talks.
```

The agent calls `/search`, selects the top results, calls `/transcript` for each, and synthesizes.

### Example 2: Channel monitoring

```text
Check @AnthropicAI and @OpenAI for any new videos this week, and summarize each one.
```

The agent calls `/channel/latest` (free) for each handle, fetches `/transcript` for new uploads, and summarizes.

### Example 3: Playlist bulk transcripts

```text
Get transcripts for every video in this playlist: https://www.youtube.com/playlist?list=PLAYLIST_ID
```

The agent paginates `/playlist` via `continuation`, then calls `/transcript` for each video ID found.

## Best Practices

- Use `/channel/latest` or `/resolve` (both free) before spending credits on `/channel/videos` or `/search`
- Reuse a fetched transcript within the same task instead of re-requesting it — each `/transcript` call costs 1 credit
- Use `/channel/search` when the channel is already known, instead of a broad `/search`
- Never persist the API key to a shell profile or config file without the user's explicit go-ahead
- Don't invent timestamps — this API returns plain transcript text, not timestamped segments

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.
- Transcripts are only available when YouTube has captions (manual or auto-generated) in the requested language.
- Beyond the free 100-credit signup tier, continued use requires a paid plan (see the [dashboard](https://getyoutubetranscript.com/dashboard) for current pricing).
- Rate limits apply per plan tier; back off on `429 RATE_LIMITED` instead of retrying in a loop.

## Security & Safety Notes

- This skill makes outbound HTTPS calls only to `getyoutubetranscript.com` endpoints, plus — during first-time key setup — sends an email address the user explicitly provides. It runs no other shell commands and installs nothing.
- The API key is held as an environment variable / the agent's credential store, never written to this file or logged.
- No local file mutation, no destructive actions. Risk level: `safe`.

## Common Pitfalls

- **Problem:** `401 MISSING_API_KEY` / `INVALID_API_KEY`.
  **Solution:** Confirm `YOUTUBE_TRANSCRIPT_API_KEY` is actually set and starts with `sk_live_`, or run the key-provisioning flow in Step 2.

- **Problem:** `402 PAYMENT_REQUIRED`.
  **Solution:** Out of credits — point the user to the dashboard to top up or upgrade; don't retry the same call.

- **Problem:** `404 TRANSCRIPT_NOT_FOUND` / `TRANSCRIPT_DISABLED`.
  **Solution:** The video has no captions in the requested language. Report it rather than guessing at the content.

- **Problem:** Signup email never arrives.
  **Solution:** Check spam first; disposable/throwaway email domains are rejected outright, so ask for a real address.

## Related Skills

- `@ingest-youtube` — yt-dlp-based local ingestion; works locally but not from most cloud server IPs
- `@video-content-extractor` — broader video content extraction workflows that can use this skill as a transcript source
