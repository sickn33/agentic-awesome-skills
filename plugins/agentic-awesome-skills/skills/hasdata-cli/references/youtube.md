# YouTube reference

Subcommands: `youtube-search-api`, `youtube-video-api`, `youtube-channel-api`, `youtube-transcript-api`. 10 credits each.

`*-search-api` is keyword-driven; the others target a specific video, channel, or transcript. Most workflows chain search → video → transcript.

---

## youtube-search-api

```bash
hasdata youtube-search-api --q "QUERY" [--sort-by relevance|date|views|rating|popularity] \
  [--length under4|between420|plus20] [--date hour|today|week|month|year] \
  [--video-type video|shorts|channel|playlist|movie] \
  [--gl us] [--hl en] [--device-type desktop|mobile] \
  [--pagination-token TOKEN] --raw | jq .
```

Common flags:
- `--q TEXT` (required)
- `--sort-by relevance|date|views|rating|popularity`
- `--date hour|today|week|month|year` — upload-recency window
- `--length under4|between420|plus20` — duration bucket (`<4m`, `4–20m`, `>20m`)
- `--video-type video|shorts|channel|playlist|movie`
- `--filters hd,k4,hdr,subtitles,cc,d3,d360,vr180,live,bought,location` — feature flags ANDed
- `--gl`, `--hl` — country / language
- `--pagination-token` — copy from previous response's `pagination.nextPageToken`
- `--sp` — raw YouTube `sp=` filter token (overrides `sort-by` / `date` / `video-type` / `length` / `filters`)

Top-level response keys: `videoResults`, `shortsResults`, `channelResults`, `playlistResults`, `adsResults`, `sponsoredResults`, `searchInformation`, `pagination`.

Per-video result: `videoId`, `title`, `link`, `channel`, `description`, `length`, `views`, `viewsOriginal`, `publishedDate`, `thumbnail`, `positionOnPage`.

```bash
# Latest videos for a topic
hasdata youtube-search-api --q "$Q" --sort-by date --date week --raw \
  | jq -c '.videoResults[] | {title, channel: .channel.name, views, publishedDate, link}'
```

## youtube-video-api

```bash
hasdata youtube-video-api --v-param VIDEO_ID [--gl us] [--hl en] --raw | jq .
```

- `--v-param` (required) — 11-char video ID (the `v=` part of the watch URL)
- `--device-type desktop|mobile`
- `--gl`, `--hl`

Top-level fields: `videoId`, `title`, `description`, `channel`, `views`, `extractedViews`, `likes`, `extractedLikes`, `lengthSeconds`, `publishedDate`, `keywords[]`, `captions`, `socialLinks`, `music`, `category`, `thumbnail`, `isFamilySafe`, `isUnlisted`, `relatedVideos[]`, `relatedShorts[]`, `endScreenVideos[]`.

```bash
# Quick stats
hasdata youtube-video-api --v-param "$VID" --raw \
  | jq '{title, views: .extractedViews, likes: .extractedLikes, length: .lengthSeconds, published: .publishedDate, channel: .channel.name}'
```

## youtube-channel-api

```bash
hasdata youtube-channel-api --channel-id "@HANDLE_OR_UCID" \
  [--tab featured|videos|shorts|streams|playlists|posts|community|podcasts|releases|about|store] \
  [--gl us] [--hl en] [--pagination-token TOKEN] --raw | jq .
```

- `--channel-id` (required) — `@handle`, `UC…` canonical ID, or legacy `/c/<custom>` / `/user/<name>` URL slug
- `--tab` — which tab to scrape; default `featured` (Home page)
- `--pagination-token` — for tabs that paginate (`videos`, `shorts`, etc.)

Top-level response: `channelInfo`, `featuredVideo`, `sections[]`.

`channelInfo` carries: `name`, `handle`, `channelId`, `channelUrl`, `avatar`, `banner`, `description`, `subscribers`, `extractedSubscribers`, `videosCount`, `extractedVideosCount`, `keywords[]`, `availableTabs[]`, `verified`, `websiteUrl`, `rssUrl`, `isFamilySafe`.

```bash
# All uploads (paginated)
hasdata youtube-channel-api --channel-id "@MrBeast" --tab videos --raw \
  | jq -c '.sections[].items[]? | {title, videoId, views, publishedDate}'
```

## youtube-transcript-api

```bash
hasdata youtube-transcript-api --v-param VIDEO_ID [--language-code en] [--type asr] --raw | jq .
```

- `--v-param` (required) — 11-char video ID
- `--language-code` — BCP-47 / YouTube code (`en`, `de`, `en-US`, `pt-BR`); must match a track the video actually has
- `--type asr` — fetch the auto-generated speech-recognition track (omit for human-authored)

Response: `transcript[]` and `availableTranscripts[]`.

Each `transcript[]` entry: `startMs`, `endMs`, `snippet`, `startTimeText`. Join `snippet`s to reconstruct the full text.

```bash
# Flatten to plain text
hasdata youtube-transcript-api --v-param "$VID" --raw \
  | jq -r '.transcript[].snippet' | tr '\n' ' '
```

---

## Non-obvious use cases

- **"What is this video actually about?"** — `youtube-transcript-api --v-param X --raw | jq -r '.transcript[].snippet'` → feed to an LLM for a real summary, not a thumbnail / title guess.
- **Cite YouTube content in a brief** — transcript + timestamps lets you quote with `(02:14)` accuracy. `--type asr` fills the gap when the creator never uploaded captions.
- **Channel growth audit** — `youtube-channel-api --channel-id @X --tab videos` paginated; `jq '.sections[].items[] | {publishedDate, views: .extractedViews}'` gives a velocity-over-time table.
- **Trend discovery** — `youtube-search-api --q "TOPIC" --sort-by views --date month` returns the highest-viewed videos in the last month — a leading indicator for cultural trends well before they hit Google News.
- **Competitor content map** — `youtube-channel-api --channel-id @competitor --tab videos --raw | jq -r '.sections[].items[].title'` enumerates every published title, useful for content-gap analysis.
- **Brand-safety scan** — `youtube-search-api --q "BRAND" --sort-by date --date week --raw | jq '.videoResults[] | select(.title | test("BRAND"; "i"))'` catches new mentions before they go viral.
- **Influencer due diligence** — combine `youtube-channel-api` for subscriber/video counts with `youtube-video-api` on their top videos (engagement rate ≈ `likes / views`).
- **"Find the moment they said X"** — `youtube-transcript-api` then `jq -r '.transcript[] | select(.snippet | test("X"; "i")) | "\(.startTimeText): \(.snippet)"'` returns timestamps of every mention.
- **Music-licensing lookup** — `youtube-video-api --v-param X --raw | jq .music` returns identified tracks (artist, title) when YouTube's Content ID matched.
- **Translate / re-localize a video** — pull the English transcript with `youtube-transcript-api`, translate via LLM, regenerate subtitles. Cheaper than re-transcribing audio.
- **Build a podcast / RSS feed for a channel** — `youtube-channel-api --raw | jq -r .channelInfo.rssUrl` returns the official RSS URL; subscribe in any podcast app.
- **Detect deleted videos** — `youtube-video-api --v-param X` returns an error for removed videos; useful for catching takedowns in archival pipelines.
- **Bulk research → transcript chain** — `youtube-search-api --q "$Q" --raw | jq -r '.videoResults[].videoId' | xargs -I{} hasdata youtube-transcript-api --v-param {} --raw` builds a research corpus from a topic search.
- **Shorts-only / long-form-only feeds** — `--video-type shorts` vs `--length plus20` to bias toward one format.
- **Live-stream discovery** — `--filters live` returns only currently live broadcasts; pair with `--sort-by date` for fresh streams.

## Pipelines

```bash
# Search → top 5 video transcripts as a corpus
hasdata youtube-search-api --q "$Q" --sort-by views --raw \
  | jq -r '.videoResults[:5][].videoId' \
  | while read -r vid; do
      echo "=== $vid ==="
      hasdata youtube-transcript-api --v-param "$vid" --raw \
        | jq -r '.transcript[].snippet'
    done > corpus.txt

# Channel → CSV of all videos
hasdata youtube-channel-api --channel-id "@$HANDLE" --tab videos --raw \
  | jq -r '.sections[].items[]? | [.videoId, .title, (.extractedViews // 0), .publishedDate] | @csv' \
  > channel_videos.csv
```

## Gotchas

- **`--v-param` is exactly 11 chars** — not the full watch URL. Strip the `v=` value or use `jq -r '.videoResults[0].videoId'` from a prior search.
- **`--language-code` must exist on the video.** Pass one of the codes listed in `availableTranscripts[]`, or omit for the default track.
- **`--type asr` is needed when no human-authored captions exist.** Without it the API returns the default human track and errors if there isn't one.
- **`@handle` is preferred over `UC…`** — easier to read, same result. Legacy `/c/` and `/user/` slugs also resolve.
- **`pagination.nextPageToken` is opaque** — pass it back via `--pagination-token` verbatim; don't try to decode.
- **`views` vs `extractedViews`** — `views` is the formatted string (`"1.2M views"`), `extractedViews` is the integer. Use the integer for math.
