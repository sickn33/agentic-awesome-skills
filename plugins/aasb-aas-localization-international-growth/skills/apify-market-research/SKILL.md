---
name: apify-market-research
description: Analyze market conditions, geographic opportunities, pricing, consumer behavior, and product validation across Google Maps, Facebook, Instagram, Booking.com, and TripAdvisor.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-03-01'
---

# Market Research

Conduct market research using Apify Actors to extract data from multiple platforms.

## When to Use
- You need market sizing, regional demand, pricing, trend, or consumer behavior data.
- The task is to gather research inputs from maps, travel, Facebook, Instagram, or trend sources with Apify.
- You need structured market data plus a synthesized view of opportunities or risks.

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

### Step 1: Identify Market Research Type

Select the appropriate Actor based on research needs:

| User Need | Actor ID | Best For |
|-----------|----------|----------|
| Market density | `compass/crawler-google-places` | Location analysis |
| Geospatial analysis | `compass/google-maps-extractor` | Business mapping |
| Regional interest | `apify/google-trends-scraper` | Trend data |
| Pricing and demand | `apify/facebook-marketplace-scraper` | Market pricing |
| Event market | `apify/facebook-events-scraper` | Event analysis |
| Consumer needs | `apify/facebook-groups-scraper` | Group research |
| Market landscape | `apify/facebook-pages-scraper` | Business pages |
| Business density | `apify/facebook-page-contact-information` | Contact data |
| Cultural insights | `apify/facebook-photos-scraper` | Visual research |
| Niche targeting | `apify/instagram-hashtag-scraper` | Hashtag research |
| Hashtag stats | `apify/instagram-hashtag-stats` | Market sizing |
| Market activity | `apify/instagram-reel-scraper` | Activity analysis |
| Market intelligence | `apify/instagram-scraper` | Full data |
| Product launch research | `apify/instagram-api-scraper` | API access |
| Hospitality market | `voyager/booking-scraper` | Hotel data |
| Tourism insights | `maxcopell/tripadvisor-reviews` | Review analysis |

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
