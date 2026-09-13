---
name: youtube-transcript-skills
description: "Fetch YouTube video transcripts, search videos/channels, browse channels, and extract playlists via the getyoutubetranscript.com API - free tier, no card required."
category: api-integration
risk: safe
source: community
source_repo: tubeagentkit/youtube-transcript-skills
source_type: community
date_added: "2026-09-13"
author: tubeagentkit
tags: [youtube, transcripts, video-search, channels, playlists, api]
tools: [claude, cursor, codex, gemini]
license: "MIT"
license_source: "https://github.com/tubeagentkit/youtube-transcript-skills/blob/main/LICENSE"
upstream: "https://github.com/tubeagentkit/youtube-transcript-skills"
---

# YouTube Transcript

## Overview

Fetches transcripts, search results, and playlist/channel data from YouTube
via the [getyoutubetranscript.com](https://getyoutubetranscript.com) REST
API, so an agent can summarize, quote, search, or analyze a video's actual
spoken content without the user copy-pasting it in by hand. No `yt-dlp` and
no Google API key required.

- `source_repo: tubeagentkit/youtube-transcript-skills`
- `source_type: community`

## When to Use This Skill

- Use when the user wants a YouTube video's transcript fetched, summarized, quoted, or analyzed.
- Use when the user wants to search YouTube (globally, or within one channel by handle).
- Use when the user wants a channel handle resolved to a channel ID, or wants a channel's info and upload history.
- Use when the user wants the videos in a YouTube playlist.

## How It Works

### Step 1: Get an API key

Every call needs an API key: the `YOUTUBE_TRANSCRIPT_API_KEY` environment
variable, or one the user has already provided. If neither exists, the skill
can sign the user up for a free account (100 credits, no card required) via a
two-step email + verification-code flow against the API - only after the
user has explicitly given consent and an email address to use.

### Step 2: Call the API

Base URL: `https://getyoutubetranscript.com/api/v1`. Send the key as
`Authorization: Bearer <API_KEY>` or `x-api-key: <API_KEY>`.

- `GET /transcript?v=<VIDEO_ID_OR_URL>&language=en` - fetch a transcript.
- `GET /search?q=<query>&type=video|channel` - search YouTube.
- `GET /resolve?handle=@name` - resolve a channel handle to a channel ID (free).
- `GET /channel/latest?channel=@name` - channel info and latest videos (free).
- `GET /channel/videos?channel=@name` - a channel's full upload history (paginated).
- `GET /channel/search?channel=@name&q=<query>` - search within a channel (paginated).
- `GET /playlist?list=<playlist ID or URL>` - playlist videos (paginated).

### Step 3: Handle errors and pagination

Every error is JSON with a stable `code` (e.g. `TRANSCRIPT_NOT_FOUND`,
`PAYMENT_REQUIRED`, `RATE_LIMITED`) and a matching HTTP status - relay the
`message` field to the user rather than guessing at a fix. Paginated
endpoints return an opaque `data.continuation_token`; pass it back verbatim
as `continuation` to get the next page, `null` means no more pages.

## Examples

### Example 1: Summarize a video

```bash
curl -s "https://getyoutubetranscript.com/api/v1/transcript?v=jNQXAC9IVRw&language=en" \
  -H "Authorization: Bearer $YOUTUBE_TRANSCRIPT_API_KEY"
```

### Example 2: Browse a channel's uploads

```bash
curl -s "https://getyoutubetranscript.com/api/v1/channel/videos?channel=@mkbhd" \
  -H "Authorization: Bearer $YOUTUBE_TRANSCRIPT_API_KEY"
```

## Best Practices

- Do reuse an existing `YOUTUBE_TRANSCRIPT_API_KEY` before offering to create a new account.
- Do ask explicit consent before sending an email address anywhere during signup.
- Don't retry a `402 PAYMENT_REQUIRED` response - direct the user to top up instead.
- Don't hammer a `429 RATE_LIMITED` response in a retry loop - back off.

## Limitations

- The transcript endpoint returns the full spoken text as one string; there is no per-line timestamp breakdown.
- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- This skill only makes outbound HTTPS requests to `getyoutubetranscript.com` endpoints, plus - during first-time setup - an email address the user explicitly provides. It runs no other shell commands and installs nothing.
- Never persist a newly issued API key to a shell profile or other file without the user's explicit confirmation first.

## Common Pitfalls

- **Problem:** Assuming the transcript response includes timestamps.
  **Solution:** Tell the user timestamps aren't available from this endpoint rather than inventing them.

## Related Skills

- `@youtube-full` - an alternative YouTube transcript/search/channel/playlist skill backed by a different upstream API.
