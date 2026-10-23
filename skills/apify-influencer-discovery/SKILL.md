---
name: apify-influencer-discovery
description: Find and evaluate influencers for brand partnerships, assess public authenticity signals, and track collaboration performance across Instagram, Facebook, YouTube, and TikTok.
risk: critical
source: community
date_added: "2026-03-01"
---

# Influencer Discovery

Discover and analyze influencers across multiple platforms using Apify Actors.

## When to Use
- You need to discover creators or influencers for outreach, partnerships, or campaign planning.
- The task is to evaluate authenticity, engagement, niche fit, or audience signals across social platforms.
- You need Apify-based extraction plus a shortlist or summary of suitable influencer candidates.

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
- [ ] Step 1: Determine discovery source (select Actor)
- [ ] Step 2: Fetch Actor schema via an approved connector or Console
- [ ] Step 3: Ask user preferences (format, filename)
- [ ] Step 4: Run the discovery script
- [ ] Step 5: Summarize results
```

### Step 1: Determine Discovery Source

Select the appropriate Actor based on user needs:

| User Need | Actor ID | Best For |
|-----------|----------|----------|
| Influencer profiles | `apify/instagram-profile-scraper` | Profile metrics, bio, follower counts |
| Find by hashtag | `apify/instagram-hashtag-scraper` | Discover influencers using specific hashtags |
| Reel engagement | `apify/instagram-reel-scraper` | Analyze reel performance and engagement |
| Discovery by niche | `apify/instagram-search-scraper` | Search for influencers by keyword/niche |
| Brand mentions | `apify/instagram-tagged-scraper` | Track who tags brands/products |
| Comprehensive data | `apify/instagram-scraper` | Full profile, posts, comments analysis |
| API-based discovery | `apify/instagram-api-scraper` | Fast API-based data extraction |
| Engagement analysis | `apify/export-instagram-comments-posts` | Export comments for sentiment analysis |
| Facebook content | `apify/facebook-posts-scraper` | Analyze Facebook post performance |
| Micro-influencers | `apify/facebook-groups-scraper` | Find influencers in niche groups |
| Influential pages | `apify/facebook-search-scraper` | Search for influential pages |
| YouTube creators | `streamers/youtube-channel-scraper` | Channel metrics and subscriber data |
| TikTok influencers | `clockworks/tiktok-scraper` | Comprehensive TikTok data extraction |
| TikTok (free) | `clockworks/free-tiktok-scraper` | Free TikTok data extractor |
| Live streamers | `clockworks/tiktok-live-scraper` | Discover live streaming influencers |

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

### Step 5: Summarize Results

After completion, report:
- Number of influencers found
- File location and name
- Key metrics available (followers, engagement rate, etc.)
- Suggested next steps (filtering, outreach, deeper analysis)

## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`Connector unavailable` - Inspect the schema through the Console; do not claim an unavailable tool was called.
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - The local timeout does not abort the remote run. Inspect the printed run ID in Console before retrying to avoid duplicate charges.

## Run Boundaries

Before launch, confirm the selected Actor, authorized public-data scope, current input schema, result limits and pricing with the user’s request. Respect source terms and access controls; do not collect private group data or unnecessary personal contact information. Start with a small Actor-supported input limit. `--max-items` limits downloaded output only (default 1000); it does not cap Actor work or billing. The helper sends a skill-identifying User-Agent to Apify. Resolve the installed skill directory in the command placeholders. Output files must be new paths; exports preserve long values and heterogeneous fields. Quick answers fetch at most five records; minimize or redact personal fields before sharing.

Define the partnership brief and comparison window before ranking. Deduplicate stable creator IDs; record metric retrieval dates, post sample and engagement denominator. Public follower/like counts cannot verify audience authenticity, demographic composition, reach or collaboration ROI. Label suspicious signals as uncertain and seek creator-authorized first-party evidence; do not accuse a person of fraud from scraped ratios. Do not infer sensitive traits or contact creators without separately authorized outreach.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
