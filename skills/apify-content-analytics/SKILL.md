---
name: apify-content-analytics
description: Track engagement metrics, measure campaign ROI, and analyze content performance across Instagram, Facebook, YouTube, and TikTok.
risk: critical
source: community
date_added: "2026-03-01"
---

# Content Analytics

Track and analyze content performance using Apify Actors to extract engagement metrics from multiple platforms.

## When to Use
- You need engagement, growth, or ROI metrics for posts, reels, videos, ads, or hashtags.
- The task is to use Apify Actors to collect cross-platform content performance data.
- You need exported analytics results and a concise interpretation of what content is performing best.

## Prerequisites
Verify prerequisites before any paid run.

- `.env` file with `APIFY_TOKEN`
- Node.js 20.6+ (for native `--env-file` support)
- An approved Apify connector or Console access to inspect the chosen Actor and its schema; the bundled runner uses REST directly.
- Keep `.env` untracked and private; configure the token locally without pasting it into chat or command arguments.

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Identify content analytics type (select Actor)
- [ ] Step 2: Fetch Actor schema via an approved connector or Console
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

Inspect the current Actor details and input schema using the authenticated Apify connector available in the session, or its Console page. Discover actual tool names and parameters before calling them. Do not parse `.env` with shell substitution or pass a token as a CLI header argument. Treat the Actor table as discovery candidates, not verified availability or schemas.

This returns:
- Actor description and README
- Required and optional input parameters
- Output fields (if available)

### Step 3: Ask User Preferences

Before running, ask:
1. **Output format**:
   - **Quick answer** - Display top few results in chat (no file saved)
   - **CSV** - Bounded export, union of returned fields
   - **JSON** - Bounded export in JSON format
2. **Number of results**: Based on character of use case

### Step 4: Run the Script

**Quick answer (display in chat, no file):**
```bash
node --env-file=.env "<resolved-skill-directory>/reference/scripts/run_actor.js" \
  --actor "ACTOR_ID" \
  --input 'JSON_INPUT'
```

**CSV:**
```bash
node --env-file=.env "<resolved-skill-directory>/reference/scripts/run_actor.js" \
  --actor "ACTOR_ID" \
  --input 'JSON_INPUT' \
  --output YYYY-MM-DD_OUTPUT_FILE.csv \
  --format csv
```

**JSON:**
```bash
node --env-file=.env "<resolved-skill-directory>/reference/scripts/run_actor.js" \
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
`Connector unavailable` - Inspect the schema through the Console; do not claim an unavailable tool was called.
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - The local timeout does not abort the remote run. Inspect the printed run ID in Console before retrying to avoid duplicate charges.

## Run Boundaries

Before launch, confirm the selected Actor, authorized public-data scope, current input schema, result limits and pricing with the user’s request. Respect source terms and access controls; do not collect private group data or unnecessary personal contact information. Start with a small Actor-supported input limit. `--max-items` limits downloaded output only (default 1000); it does not cap Actor work or billing. The helper sends a skill-identifying User-Agent to Apify. Resolve the installed skill directory in the command placeholders. Output files must be new paths; exports preserve long values and heterogeneous fields. Quick answers fetch at most five records; minimize or redact personal fields before sharing.

Public engagement counts alone cannot establish campaign ROI, spend, revenue attribution, impressions or unique reach. Report those as unavailable unless supplied by authorized first-party data. Define engagement-rate denominator, observation window and collection time; compare like formats/platform metrics, preserve missing versus zero, and deduplicate by stable content ID. Follower growth needs repeated timestamped observations; a single profile snapshot cannot provide growth.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
