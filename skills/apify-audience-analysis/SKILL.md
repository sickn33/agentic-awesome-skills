---
name: apify-audience-analysis
description: Understand audience demographics, preferences, behavior patterns, and engagement quality across Facebook, Instagram, YouTube, and TikTok.
risk: unknown
source: community
---

# Audience Analysis

Analyze and understand your audience using Apify Actors to extract follower demographics, engagement patterns, and behavior data from multiple platforms.

## When to Use
- You need audience demographics, engagement patterns, or follower behavior from social platforms.
- The task is to choose and run Apify Actors for audience analysis across Facebook, Instagram, YouTube, or TikTok.
- You need structured extraction plus a summarized interpretation of audience findings.

## Prerequisites
(No need to check it upfront)

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)
- `mcpc` CLI tool: `npm install -g @apify/mcpc`

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Identify audience analysis type (select Actor)
- [ ] Step 2: Fetch Actor schema via mcpc
- [ ] Step 3: Ask user preferences (format, filename)
- [ ] Step 4: Run the analysis script
- [ ] Step 5: Summarize findings
```

### Step 1: Identify Audience Analysis Type

Select the appropriate Actor based on analysis needs:

| User Need | Actor ID | Best For |
|-----------|----------|----------|
| Facebook follower demographics | `apify/facebook-followers-following-scraper` | FB followers/following lists |
| Facebook engagement behavior | `apify/facebook-likes-scraper` | FB post likes analysis |
| Facebook video audience | `apify/facebook-reels-scraper` | FB Reels viewers |
| Facebook comment analysis | `apify/facebook-comments-scraper` | FB post/video comments |
| Facebook content engagement | `apify/facebook-posts-scraper` | FB post engagement metrics |
| Instagram audience sizing | `apify/instagram-profile-scraper` | IG profile demographics |
| Instagram location-based | `apify/instagram-search-scraper` | IG geo-tagged audience |
| Instagram tagged network | `apify/instagram-tagged-scraper` | IG tag network analysis |
| Instagram comprehensive | `apify/instagram-scraper` | Full IG audience data |
| Instagram API-based | `apify/instagram-api-scraper` | IG API access |
| Instagram follower counts | `apify/instagram-followers-count-scraper` | IG follower tracking |
| Instagram comment export | `apify/export-instagram-comments-posts` | IG comment bulk export |
| Instagram comment analysis | `apify/instagram-comment-scraper` | IG comment sentiment |
| YouTube viewer feedback | `streamers/youtube-comments-scraper` | YT comment analysis |
| YouTube channel audience | `streamers/youtube-channel-scraper` | YT channel subscribers |
| TikTok follower demographics | `clockworks/tiktok-followers-scraper` | TT follower lists |
| TikTok profile analysis | `clockworks/tiktok-profile-scraper` | TT profile demographics |
| TikTok comment analysis | `clockworks/tiktok-comments-scraper` | TT comment engagement |

### Step 2: Fetch Actor Schema

Fetch the Actor's input schema and details dynamically using mcpc:

```bash
export $(grep APIFY_TOKEN .env | xargs) && mcpc --json mcp.apify.com --header "Authorization: Bearer $APIFY_TOKEN" tools-call fetch-actor-details actor:="ACTOR_ID" | jq -r ".content"
```

Replace `ACTOR_ID` with the selected Actor (e.g., `apify/facebook-followers-following-scraper`).

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
- Number of audience members/profiles analyzed
- File location and name
- Key demographic insights
- Suggested next steps (deeper analysis, segmentation)

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
