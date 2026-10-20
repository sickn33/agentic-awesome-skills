# Gotchas — harshmaur/tiktok-scraper

## Counts

- `resultsPerPage` applies to each profile, hashtag, keyword and sound separately. 3 hashtags × `resultsPerPage: 100` is up to 300 videos.
- `maxItems` caps all rows of the run together: videos, comments, profiles and followers. With comments on, a low `maxItems` can stop the run before every target has its videos.
- The free Apify plan searches at most 40 keywords per run.
- Some feeds return fewer rows than requested, even when `resultsPerPage` is large.

## Cost examples

| Run | Rows | Cost |
|---|---|---|
| 5 creators × 20 latest videos | 100 videos + 5 profiles | $0.055 |
| 1 hashtag, 1,000 videos, exact match | 1,000 videos | $0.35 |
| 1,000 videos with `aiAnalysis` | 1,000 videos | $1.85 |
| 50 videos × 100 comments | 50 videos + 5,000 comments | about $1.02 |
| 20 videos of 45 s with `aiVideoSummary` | 20 videos, 40 blocks | about $1.01 |
| 100 watermark-free downloads | 100 videos | $1.04 |

AI video options count started 30-second blocks: a 45-second video is 2 blocks.

## Date filter forms

`oldestPostDateUnified` takes `"2026-09-01"`, `"30"` (days), `"30 days"`, `"2 weeks"`, `"3 months"` or `"1 year"`. `newestPostDate` takes a date.

## Media links

TikTok's own video and image links expire within hours. When the user needs the files later, turn on the download options. The saved files stay in the run's key-value store and their links are in `mediaUrls`.

## Fields kept for clockworks compatibility

`commentsDatasetUrl` and `followDatasetUrl` are `null`: comments and followers are rows in the same dataset. `profileScrapeSections: ["stories"]` is accepted but returns nothing.

## MCP connector delivery

| Field | Meaning |
|---|---|
| `mcpConnector` | Connector ID that the user created in Apify Console. |
| `mcpTarget` | Channel, page or sheet. |
| `mcpMode` | `perPost` (default) or `summary`. |
| `mcpMessage` | Template with `{{field}}` placeholders, for example `*@{{authorMeta.name}}* — {{diggCount}} likes\n{{webVideoUrl}}`. |
| `mcpMaxItems` | Most videos to send. Default 50. |

A delivery problem never fails the scrape.
