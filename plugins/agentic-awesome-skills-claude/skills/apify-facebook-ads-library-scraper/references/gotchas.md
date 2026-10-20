# Gotchas — harshmaur/facebook-ads-library-scraper

## What Meta discloses

| Data | Which ads have it |
|---|---|
| Copy, headline, call to action, media, dates, platforms | All ads |
| `ad_duration_days`, `is_long_running` | All ads. For active ads, duration ends at the date of the run. |
| `spend_*`, `impressions_*` | Political and social-issue ads (`ad_type=political_and_issue_ads`) |
| `reach_*`, `audience_*` | Ads shown in the EU or UK, with `scrapeAdDetails: true` |

Say clearly in the report when a number is missing because Meta does not publish it. Do not estimate spend for commercial ads.

## Counts

- `count` is shared by all URLs. Use `limitPerSource` to give each URL a fair part.
- `count` defaults to 100. `0` means every ad: a big brand can have thousands.
- One ad can show as several rows with one `collation_id`.

## Cost examples (Free plan price, $0.50 per 1,000)

| Run | Ads | Cost |
|---|---|---|
| One advertiser, active ads | 200 | $0.10 |
| 5 advertisers, `limitPerSource: 300` | 1,500 | $0.75 |
| One keyword in one country | 2,000 | $1.00 |
| Weekly watch of 10 brands | about 500 per week | about $1.00 per month |

Paid plans pay $0.40 to $0.47 per 1,000.

## Media links

`image_urls` and `video_urls` are Meta CDN links that expire after some time. Download the files soon if the user needs them later.

## MCP connector delivery

| Field | Meaning |
|---|---|
| `mcpConnector` | Connector ID that the user created in Apify Console. |
| `mcpTarget` | Channel, page or sheet. |
| `mcpMode` | `perPost` (one message per ad, default) or `summary`. |
| `mcpMessage` | Template with `{{field}}` placeholders, for example `*{{page_name}}*\n{{ad_text}}\n{{ad_library_url}}`. |
| `mcpMaxItems` | Most ads to send. Default 50. |

A delivery problem never fails the scrape.
