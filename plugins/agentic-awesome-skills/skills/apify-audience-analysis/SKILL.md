---
name: apify-audience-analysis
description: Understand audience demographics, preferences, behavior patterns, and engagement quality across Facebook, Instagram, YouTube, and TikTok.
risk: critical
source: community
date_added: "2026-03-01"
---

# Audience Analysis

Analyze and understand your audience using Apify Actors to extract follower demographics, engagement patterns, and behavior data from multiple platforms.

## When to Use
- You need audience demographics, engagement patterns, or follower behavior from social platforms.
- The task is to choose and run Apify Actors for audience analysis across Facebook, Instagram, YouTube, or TikTok.
- You need structured extraction plus a summarized interpretation of audience findings.

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
- [ ] Step 1: Identify market research type (select Actor)
- [ ] Step 2: Fetch Actor schema via an approved connector or Console
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
- Key market insights
- Suggested next steps (deeper analysis, validation)

## Error Handling

`APIFY_TOKEN not found` - Ask user to create `.env` with `APIFY_TOKEN=your_token`
`Connector unavailable` - Inspect the schema through the Console; do not claim an unavailable tool was called.
`Actor not found` - Check Actor ID spelling
`Run FAILED` - Ask user to check Apify console link in error output
`Timeout` - The local timeout does not abort the remote run. Inspect the printed run ID in Console before retrying to avoid duplicate charges.

## Run Boundaries

Before launch, confirm the selected Actor, authorized public-data scope, current input schema, result limits and pricing with the user’s request. Respect source terms and access controls; do not collect private group data or unnecessary personal contact information. Start with a small Actor-supported input limit. `--max-items` limits downloaded output only (default 1000); it does not cap Actor work or billing. The helper sends a skill-identifying User-Agent to Apify. Resolve the installed skill directory in the command placeholders. Output files must be new paths; exports preserve long values and heterogeneous fields. Quick answers fetch at most five records; minimize or redact personal fields before sharing.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Audience inference limits

Public followers, comments and profile counts are partial samples, not verified viewer demographics. Do not infer sensitive traits from names, photos or handles. Distinguish observed interactions from unique people, bots and actual reach. Report platform, date window, missing fields, sample denominator and coverage before comparing segments; aggregate and suppress small identifying groups.
