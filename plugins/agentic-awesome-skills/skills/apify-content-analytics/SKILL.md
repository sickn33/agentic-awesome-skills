---
name: apify-content-analytics
description: Track engagement metrics, measure campaign ROI, and analyze content performance across Instagram, Facebook, YouTube, and TikTok.
risk: unknown
source: community
---

# Content Analytics

Track and analyze content performance using Apify Actors to extract engagement metrics from multiple platforms.

## When to Use
- You need engagement, growth, or ROI metrics for posts, reels, videos, ads, or hashtags.
- The task is to use Apify Actors to collect cross-platform content performance data.
- You need exported analytics results and a concise interpretation of what content is performing best.

## Prerequisites
(No need to check it upfront)

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Identify content analytics type (select Actor)
- [ ] Step 2: Fetch Actor schema via mcpc
- [ ] Step 3: Ask user preferences (format, filename)
- [ ] Step 4: Run the analytics script
- [ ] Step 5: Summarize findings
```

### Step 1: Identify Content Analytics Type

Select the appropriate Actor based on analytics needs:

| User Need | Actor ID | Best For |
|-----------|----------|----------|
| Post engagement metrics | `apify/instagram-post-scraper` | Post performance |
| Reel performance | `apify/instagram-reel-scraper` | Reel analytics |
| Follower growth tracking | `apify/instagram-followers-count-scraper` | Growth metrics |
| Comment engagement | `apify/instagram-comment-scraper` | Comment analysis |
| Hashtag performance | `apify/instagram-hashtag-scraper` | Branded hashtags |
| Mention tracking | `apify/instagram-tagged-scraper` | Tag tracking |
| Comprehensive metrics | `apify/instagram-scraper` | Full data |
| API-based analytics | `apify/instagram-api-scraper` | API access |
| Facebook post performance | `apify/facebook-posts-scraper` | Post metrics |
| Reaction analysis | `apify/facebook-likes-scraper` | Engagement types |
| Facebook Reels metrics | `apify/facebook-reels-scraper` | Reels performance |
| Ad performance tracking | `apify/facebook-ads-scraper` | Ad analytics |
| Facebook comment analysis | `apify/facebook-comments-scraper` | Comment engagement |
| Page performance audit | `apify/facebook-pages-scraper` | Page metrics |
| YouTube video metrics | `streamers/youtube-scraper` | Video performance |
| YouTube Shorts analytics | `streamers/youtube-shorts-scraper` | Shorts performance |
| TikTok content metrics | `clockworks/tiktok-scraper` | TikTok analytics |

### Step 2: Fetch Actor Schema

Fetch the Actor's input schema and details dynamically using mcpc:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call fetch-actor-details actor:="ACTOR_ID" | jq -r ".content"
```

Replace `ACTOR_ID` with the selected Actor (e.g., `apify/instagram-post-scraper`).

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

### Step 5: Summarize Findings

After completion, report:
- Number of content pieces analyzed
- File location and name
- Key performance insights
- Suggested next steps (deeper analysis, content optimization)

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
