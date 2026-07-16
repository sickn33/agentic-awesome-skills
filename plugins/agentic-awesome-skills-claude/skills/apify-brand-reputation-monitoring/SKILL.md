---
name: apify-brand-reputation-monitoring
description: "Scrape reviews, ratings, and brand mentions from multiple platforms using Apify Actors."
risk: unknown
source: community
---

# Brand Reputation Monitoring

Scrape reviews, ratings, and brand mentions from multiple platforms using Apify Actors.

## When to Use
- You need to monitor reviews, ratings, or brand mentions across social, travel, or map platforms.
- The task is to select and run an Apify Actor for brand sentiment or reputation tracking.
- You need exported monitoring results and a summary of reputation signals.

## Prerequisites
(No need to check it upfront)

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Determine data source (select Actor)
- [ ] Step 2: Fetch Actor schema via mcpc
- [ ] Step 3: Ask user preferences (format, filename)
- [ ] Step 4: Run the monitoring script
- [ ] Step 5: Summarize results
```

### Step 1: Determine Data Source

Select the appropriate Actor based on user needs:

| User Need | Actor ID | Best For |
|-----------|----------|----------|
| Google Maps reviews | `compass/crawler-google-places` | Business reviews, ratings |
| Google Maps review export | `compass/Google-Maps-Reviews-Scraper` | Dedicated review scraping |
| Booking.com hotels | `voyager/booking-scraper` | Hotel data, scores |
| Booking.com reviews | `voyager/booking-reviews-scraper` | Detailed hotel reviews |
| TripAdvisor reviews | `maxcopell/tripadvisor-reviews` | Attraction/restaurant reviews |
| Facebook reviews | `apify/facebook-reviews-scraper` | Page reviews |
| Facebook comments | `apify/facebook-comments-scraper` | Post comment monitoring |
| Facebook page metrics | `apify/facebook-pages-scraper` | Page ratings overview |
| Facebook reactions | `apify/facebook-likes-scraper` | Reaction type analysis |
| Instagram comments | `apify/instagram-comment-scraper` | Comment sentiment |
| Instagram hashtags | `apify/instagram-hashtag-scraper` | Brand hashtag monitoring |
| Instagram search | `apify/instagram-search-scraper` | Brand mention discovery |
| Instagram tagged posts | `apify/instagram-tagged-scraper` | Brand tag tracking |
| Instagram export | `apify/export-instagram-comments-posts` | Bulk comment export |
| Instagram comprehensive | `apify/instagram-scraper` | Full Instagram monitoring |
| Instagram API | `apify/instagram-api-scraper` | API-based monitoring |
| YouTube comments | `streamers/youtube-comments-scraper` | Video comment sentiment |
| TikTok comments | `clockworks/tiktok-comments-scraper` | TikTok sentiment |

### Step 2: Fetch Actor Schema

Fetch the Actor's input schema and details dynamically using mcpc:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call fetch-actor-details actor:="ACTOR_ID" | jq -r ".content"
```

Replace `ACTOR_ID` with the selected Actor (e.g., `compass/crawler-google-places`).

This returns:
- Actor description and README
- Required and optional input parameters
- Output fields (if available)

### Step 3: Ask User Preferences

Before running, ask:
1. **Output format**:
   - **Quick answer** - Display top few results in chat (no file saved)
   - **CSV** - Full export with all fields
   - **JSON** - Full export in JSON format
2. **Number of results**: Based on character of use case

### Step 4: Run the Script

**Quick answer (display in chat, no file):**
```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "ACTOR_ID" \
  --input 'JSON_INPUT'
```

**CSV:**
```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "ACTOR_ID" \
  --input 'JSON_INPUT' \
  --output YYYY-MM-DD_OUTPUT_FILE.csv \
  --format csv
```

**JSON:**
```bash
node --env-file=.env ${CLAUDE_PLUGIN_ROOT}/reference/scripts/run_actor.js \
  --actor "ACTOR_ID" \
  --input 'JSON_INPUT' \
  --output YYYY-MM-DD_OUTPUT_FILE.json \
  --format json
```

### Step 5: Summarize Results

After completion, report:
- Number of reviews/mentions found
- File location and name
- Key fields available
- Suggested next steps (sentiment analysis, filtering)

## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`mcpc not found` - Ask user to install `npm install -g @apify/mcpc`
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - Reduce input size or increase `--timeout`

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
