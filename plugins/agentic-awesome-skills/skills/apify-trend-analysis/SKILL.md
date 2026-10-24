---
name: apify-trend-analysis
description: Discover and track emerging trends across Google Trends, Instagram, Facebook, YouTube, and TikTok to inform content strategy.
risk: critical
source: community
date_added: "2026-03-01"
---

# Trend Analysis

Discover and track emerging trends using Apify Actors to extract data from multiple platforms.

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
- [ ] Step 1: Identify trend type (select Actor)
- [ ] Step 2: Fetch Actor schema via an approved connector or Console
- [ ] Step 3: Ask user preferences (format, filename)
- [ ] Step 4: Run the analysis script
- [ ] Step 5: Summarize findings
```

### Step 1: Identify Trend Type

Select the appropriate Actor based on research needs:

| User Need | Actor ID | Best For |
|-----------|----------|----------|
| Search trends | `apify/google-trends-scraper` | Google Trends data |
| Hashtag tracking | `apify/instagram-hashtag-scraper` | Hashtag content |
| Hashtag metrics | `apify/instagram-hashtag-stats` | Performance stats |
| Visual trends | `apify/instagram-post-scraper` | Post analysis |
| Trending discovery | `apify/instagram-search-scraper` | Search trends |
| Comprehensive tracking | `apify/instagram-scraper` | Full data |
| API-based trends | `apify/instagram-api-scraper` | API access |
| Engagement trends | `apify/export-instagram-comments-posts` | Comment tracking |
| Product trends | `apify/facebook-marketplace-scraper` | Marketplace data |
| Visual analysis | `apify/facebook-photos-scraper` | Photo trends |
| Community trends | `apify/facebook-groups-scraper` | Group monitoring |
| YouTube Shorts | `streamers/youtube-shorts-scraper` | Short-form trends |
| YouTube hashtags | `streamers/youtube-video-scraper-by-hashtag` | Hashtag videos |
| TikTok hashtags | `clockworks/tiktok-hashtag-scraper` | Hashtag content |
| Trending sounds | `clockworks/tiktok-sound-scraper` | Audio trends |
| TikTok ads | `clockworks/tiktok-ads-scraper` | Ad trends |
| Discover page | `clockworks/tiktok-discover-scraper` | Discover trends |
| Explore trends | `clockworks/tiktok-explore-scraper` | Explore content |
| Trending content | `clockworks/tiktok-trends-scraper` | Viral content |

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
- Number of results found
- File location and name
- Key trend insights
- Suggested next steps (deeper analysis, content opportunities)


## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`Connector unavailable` - Inspect the schema through the Console; do not claim an unavailable tool was called.
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - The local timeout does not abort the remote run. Inspect the printed run ID in Console before retrying to avoid duplicate charges.

## Run Boundaries

Before launch, confirm the selected Actor, authorized public-data scope, current input schema, result limits and pricing with the user’s request. Respect source terms and access controls; do not collect private group data or unnecessary personal contact information. Start with a small Actor-supported input limit. `--max-items` limits downloaded output only (default 1000); it does not cap Actor work or billing. The helper sends a skill-identifying User-Agent to Apify. Resolve the installed skill directory in the command placeholders. Output files must be new paths; exports preserve long values and heterogeneous fields. Quick answers fetch at most five records; minimize or redact personal fields before sharing.

## When to Use
Use for comparing search interest, public hashtags, sounds or content over defined time windows and regions. Keep normalized trend indices distinct from absolute audience or sales counts; state collection dates, sample bias and platform coverage.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
