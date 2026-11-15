---
name: restosignals
description: "Find US restaurants and bars before they open, as scored leads fused from liquor-license, food-permit and business-filing records, via the RestoSignals MCP server or REST API."
category: mcp
risk: safe
source: "https://restosignals.com"
source_repo: paperandbeyond23-gif/restosignals-mcp
source_type: community
date_added: "2026-10-26"
author: paperandbeyond23-gif
tags: [mcp, restaurants, leads, public-records, liquor-license, prospecting]
tools: [claude, cursor, gemini]
license: "MIT"
license_source: "https://github.com/paperandbeyond23-gif/restosignals-mcp/blob/main/LICENSE"
---

# RestoSignals

## Overview

RestoSignals turns public government records into a scored list of US restaurants and bars that are about to open. Each lead is one deduped venue with an `opening_score` (0-100), built by fusing up to three signal types: `liquor` (a liquor-license application or issuance), `food_permit` (a new food or health permit) and `business` (a new LLC or corporation filing). More independent signals give a higher score. The data is served through a hosted MCP server and a REST API with the same key.

## When to Use This Skill

- Use when the user wants restaurants, bars or cafes that are opening soon in a US city or state.
- Use when the user is prospecting new food and beverage venues before they open (POS, beverage distribution, insurance, equipment).
- Use when the user wants to be alerted when a new venue files in an area.
- Use when the user asks why a venue is considered close to opening and wants to see the underlying filings.
- Do not use for restaurants that are already open, reviews, menus or reservations.

## How It Works

### Step 1: Connect and authenticate

The MCP endpoint is `https://api.restosignals.com/mcp` (streamable HTTP). `initialize` and `tools/list` work without a key; every `tools/call` needs an API key in the `x-api-key` header. A free key with 100 lead credits is available at https://restosignals.com/signup.

```json
{
  "mcpServers": {
    "restosignals": {
      "url": "https://api.restosignals.com/mcp",
      "headers": { "x-api-key": "YOUR_RESTOSIGNALS_KEY" }
    }
  }
}
```

### Step 2: Check coverage first

Call the free `coverage` tool before anything else. It returns the live states with venue and hot-lead counts. Query only states it returns. Today that is New York, Texas, Illinois and California (deepest), plus Oregon, Colorado and Washington (lighter).

### Step 3: Pull leads

- `new_openings` with `{state, min_score, limit}` returns scored venues. Each returned lead costs 1 credit, and empty results are free, so keep `limit` small while testing.
- `venue_signals` with `{venue_id}` returns the raw liquor, permit and filing rows fused into one venue.
- `watch_area` with `{url, criteria}` registers a webhook that fires when a new matching venue appears. Free.

### Step 4: Present the result

Show business name, city, `opening_score` and `signal_types` for each lead, strongest first. `signal_types` values are exactly `liquor`, `food_permit` and `business`.

## Examples

### Example 1: Restaurants opening soon in New York

> "Which restaurants are about to open in New York? Strongest leads first."

The agent calls `coverage`, then `new_openings(state="NY", min_score=40, limit=10)`, and lists name, city, score and signal types.

### Example 2: Only multi-signal leads

> "Give me only the strongest Illinois leads."

Call `new_openings(state="IL", min_score=80)`. A venue with fused signals always outranks a single-signal one.

### Example 3: Watch an area

> "Alert me when a new bar files in Brooklyn."

Call `watch_area(url="<your webhook endpoint>", criteria={"state": "NY", "city": "Brooklyn", "signal_type": "liquor"})`.

### Example 4: REST call

```bash
curl -s "https://api.restosignals.com/v1/openings?state=NY&min_opening_score=40&limit=5" \
  -H "x-api-key: $RESTOSIGNALS_API_KEY"
```

Full REST docs: https://restosignals.com/docs/

## Best Practices

- ✅ Call `coverage` first and only query states it returns.
- ✅ Start with a small `limit`, since each returned lead uses a credit.
- ✅ Use `venue_signals` to explain a score instead of guessing.
- ❌ Don't promise coverage for states that `coverage` does not list.
- ❌ Don't put the API key in prompts, logs or committed files; keep it in the MCP client config or an environment variable.

## Limitations

- US only, and only the states returned by `coverage` (NY, TX, IL, CA deepest; OR, CO, WA lighter).
- Owner contact details are for subscribers. Free keys see whether a contact exists on each lead, not the contact itself.
- Data comes from public government open-data. RestoSignals is not affiliated with any government agency, and a filing does not guarantee a venue will open.
- Not a directory of open restaurants; no reviews, menus or reservations.

## Security & Safety Notes

- Every tool call sends the API key to `api.restosignals.com`. Use a key scoped to this purpose and revoke it if exposed.
- `watch_area` registers a webhook that posts lead data to the URL you give it. Only register endpoints you control, and confirm with the user before creating one.
- Lead pulls consume credits on the user's account; confirm large `limit` values before running them.

## Common Pitfalls

- **Problem:** `tools/call` returns an auth error.
  **Solution:** Add the `x-api-key` header to the MCP client config. `initialize` and `tools/list` work without it, tool calls do not.
- **Problem:** A state returns no leads.
  **Solution:** Check `coverage`; the state may not be live yet.

## Related Skills

- `@apify-lead-generation` - General lead scraping across web sources, when you need venues that are already open.

## Additional Resources

- [RestoSignals](https://restosignals.com)
- [API docs](https://restosignals.com/docs/)
- [RestoAPI](https://restosignals.com/restoapi/)
- [GitHub repository](https://github.com/paperandbeyond23-gif/restosignals-mcp)
