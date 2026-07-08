# YouTube APIs

| Endpoint | Returns |
|---|---|
| `/scrape/youtube/search` | Search results — videos, shorts, channels, playlists |
| `/scrape/youtube/video` | Single video metadata (stats, captions, related) |
| `/scrape/youtube/channel` | Channel home / videos / shorts / playlists / community |
| `/scrape/youtube/transcript` | Full transcript with millisecond offsets |

All synchronous `GET`. 10 credits each.

## YouTube Search

```python
import requests

resp = requests.get(
    "https://api.hasdata.com/scrape/youtube/search",
    headers={"x-api-key": API_KEY},
    params={"q": "anthropic claude", "sortBy": "views", "date": "month"},
    timeout=300,
)
for v in resp.json().get("videoResults", []):
    print(v["title"], v.get("extractedViews"), v["link"])
```

### Query parameters

| Param | Notes |
|---|---|
| `q` | **Required.** Free-text query. |
| `sortBy` | `relevance` (default), `date`, `views`, `rating`, `popularity`. |
| `date` | Upload window: `hour`, `today`, `week`, `month`, `year`. |
| `length` | Duration bucket: `under4`, `between420`, `plus20`. |
| `videoType` | `video`, `shorts`, `channel`, `playlist`, `movie`. |
| `filters[]` | Feature flags ANDed: `hd`, `k4`, `hdr`, `subtitles`, `cc`, `d3`, `d360`, `vr180`, `live`, `bought`, `location`. |
| `gl` / `hl` | Two-letter country / language codes. |
| `deviceType` | `desktop`, `mobile`. |
| `paginationToken` | Opaque cursor from the previous `pagination.nextPageToken`. |
| `sp` | Raw YouTube `sp=` token (overrides `sortBy`, `date`, `videoType`, `length`, `filters[]`). |

Response: `videoResults`, `shortsResults`, `channelResults`, `playlistResults`, `adsResults`, `sponsoredResults`, `searchInformation`, `pagination`.

Per-video result keys (verified live): `videoId`, `title`, `link`, `channel`, `description`, `length`, `views`, `viewsOriginal`, `publishedDate`, `thumbnail`, `positionOnPage`. `channel` is an object — read `.channel.name` and `.channel.link`.

## YouTube Video

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/youtube/video",
    headers={"x-api-key": API_KEY},
    params={"v": "dQw4w9WgXcQ"},
    timeout=300,
)
```

| Param | Notes |
|---|---|
| `v` | **Required.** 11-character YouTube video ID — the `v=` query value. |
| `gl` / `hl` | Country / language. |
| `deviceType` | `desktop` / `mobile`. |

Top-level keys: `videoId`, `title`, `description`, `channel`, `views`, `extractedViews`, `likes`, `extractedLikes`, `lengthSeconds`, `publishedDate`, `keywords`, `captions`, `socialLinks`, `music`, `category`, `thumbnail`, `isFamilySafe`, `isUnlisted`, `relatedVideos`, `relatedShorts`, `endScreenVideos`, `requestMetadata`.

Use `extractedViews` / `extractedLikes` (integers) for math; `views` / `likes` are the formatted strings.

## YouTube Channel

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/youtube/channel",
    headers={"x-api-key": API_KEY},
    params={"channelId": "@MrBeast", "tab": "videos"},
    timeout=300,
)
```

| Param | Notes |
|---|---|
| `channelId` | **Required.** `@handle`, canonical `UC…` ID, or legacy `/c/<custom>` / `/user/<name>` slug. |
| `tab` | `featured` (default), `videos`, `shorts`, `streams`, `playlists`, `posts` / `community`, `podcasts`, `releases`, `about`, `store`. |
| `paginationToken` | Cursor for tabs that paginate. |
| `gl` / `hl` / `deviceType` | Standard. |

Response: `channelInfo`, `featuredVideo`, `sections[]`.

`channelInfo` (verified live): `name`, `handle`, `channelId`, `channelUrl`, `avatar`, `banner`, `description`, `subscribers`, `extractedSubscribers`, `videosCount`, `extractedVideosCount`, `keywords[]`, `availableTabs[]`, `verified`, `websiteUrl`, `rssUrl`, `isFamilySafe`.

`sections[]` each have `title` + `items[]` — shape depends on the tab. Iterate generically:

```python
for sec in resp.json().get("sections", []):
    for item in sec.get("items", []):
        ...
```

## YouTube Transcript

```python
resp = requests.get(
    "https://api.hasdata.com/scrape/youtube/transcript",
    headers={"x-api-key": API_KEY},
    params={"v": "dQw4w9WgXcQ", "languageCode": "en"},
    timeout=300,
)
text = " ".join(seg["snippet"] for seg in resp.json().get("transcript", []))
```

| Param | Notes |
|---|---|
| `v` | **Required.** 11-character video ID. |
| `languageCode` | BCP-47 / YouTube code (`en`, `de`, `en-US`, `pt-BR`). Must exist on the video. |
| `type` | `asr` to fetch the auto-generated speech-recognition track when no human captions exist. |

Response: `transcript[]` and `availableTranscripts[]`.

Each `transcript[]` entry: `startMs`, `endMs`, `snippet`, `startTimeText` (e.g. `"0:18"`).

## Patterns

### Search → video → transcript fan-out

```python
def topic_corpus(query, k=5):
    search = requests.get(
        "https://api.hasdata.com/scrape/youtube/search",
        headers={"x-api-key": API_KEY},
        params={"q": query, "sortBy": "views"}, timeout=300,
    ).json()
    docs = []
    for v in search.get("videoResults", [])[:k]:
        tr = requests.get(
            "https://api.hasdata.com/scrape/youtube/transcript",
            headers={"x-api-key": API_KEY},
            params={"v": v["videoId"]}, timeout=300,
        ).json()
        docs.append({
            "videoId": v["videoId"],
            "title":   v["title"],
            "url":     v["link"],
            "text":    " ".join(s["snippet"] for s in tr.get("transcript", [])),
        })
    return docs
```

### Channel velocity

```python
def channel_velocity(handle):
    page = requests.get(
        "https://api.hasdata.com/scrape/youtube/channel",
        headers={"x-api-key": API_KEY},
        params={"channelId": handle, "tab": "videos"}, timeout=300,
    ).json()
    return [
        {"date": it.get("publishedDate"),
         "views": it.get("extractedViews"),
         "title": it.get("title")}
        for sec in page.get("sections", [])
        for it in sec.get("items", [])
    ]
```

### Timestamp search inside a transcript

```python
def mentions(video_id, needle):
    tr = requests.get(
        "https://api.hasdata.com/scrape/youtube/transcript",
        headers={"x-api-key": API_KEY},
        params={"v": video_id}, timeout=300,
    ).json()
    return [(s["startTimeText"], s["snippet"])
            for s in tr.get("transcript", [])
            if needle.lower() in s["snippet"].lower()]
```

## Gotchas

- **`v` is the 11-char ID, not the URL.** Strip the `v=` value first.
- **`languageCode` must exist on the video.** Inspect `availableTranscripts[]` if a fetch fails, then retry.
- **`type=asr` is required when no human-authored caption track exists.** Otherwise the API errors on videos with auto-only captions.
- **`@handle` resolves to the same channel as the canonical `UC…` ID.** Prefer handles for readability.
- **Pagination tokens are opaque** — pass them back verbatim via `paginationToken`.
- **`extractedViews` / `extractedLikes`** are integers; `views` / `likes` are formatted strings. Use the integer fields for arithmetic.
- **`channelInfo.rssUrl`** is the canonical RSS feed for the channel — use it to subscribe in podcast clients without scraping.
