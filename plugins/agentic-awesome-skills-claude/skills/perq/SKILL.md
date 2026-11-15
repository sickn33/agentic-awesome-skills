---
name: perq
description: "Find verified free AI credits, free tiers, startup programs and student perks for AI APIs, GPUs and dev tools, each with the vendor's source link and a last-verified date."
category: research
risk: safe
source: "https://github.com/f-o-x11/perq-skill"
source_repo: "f-o-x11/perq-skill"
source_type: official
date_added: "2026-10-24"
author: Avatar 8 LLC
tags: [credits, free-tier, startups, students, mcp]
tools: [claude, cursor, codex, gemini]
license: "MIT"
license_source: "https://github.com/f-o-x11/perq-skill/blob/main/LICENSE"
---

# Perq

## Overview

Perq (https://perq.sh) is a read-only directory of free AI credits, free tiers, signup credits, startup programs, student and research perks. Each offer is copied from the vendor's own page and carries that page's URL (`source_url`), a verbatim quote from it (`source_snippet`) and a `last_verified` timestamp. Search needs no account or API key. Risk is `safe`: the search, offer and pack calls only read public data.

## When to Use This Skill

- Use when the user asks what free credits they can get for something (speech-to-text, GPUs, LLM APIs, vector DBs, web search, sandboxes, observability).
- Use when the user wants the cheapest way to try a model, API or vendor.
- Use when the user asks which startup, student or research programs apply to them, or how to claim one.
- Use when the user asks whether a specific offer is still live.

## How It Works

### Step 1: Search

Describe the need in plain words; the API ranks offers against it.

```bash
curl -sS -G "https://perq.sh/api/search" --data-urlencode "q=free speech to text credits" -d limit=5
```

Optional filters: `category` (for example `cloud-gpu`, `llm-api`, `voice-audio`, `vector-db`, `dev-tools`), `type` (`startup-program`, `free-tier`, `signup-credit`, `student-education`, ...), `student=true`, `no_application=true` (usable right after signup), `include_closed=true`, `limit` (1 to 50).

### Step 2: Answer with sources

For each offer, show the vendor and `credit_value` in the exact wording returned, the eligibility and how to claim, the `claim_url`, and `Source: <source_url> (verified <last_verified date>)`. If `status` is `closed`, say when it closed.

### Step 3: Details and packs

```bash
curl -sS "https://perq.sh/api/offers/deepgram-200-credit"   # one offer with recorded changes
curl -sS "https://perq.sh/api/packs.json"                   # curated bundles
```

MCP alternative: the same data is served at `https://perq.sh/mcp` (Streamable HTTP, no auth) with tools such as `find_credits`, `get_offer`, `list_packs`, `get_pack` and `recently_changed`.

## Examples

**User**: "I'm a student building a voice agent. What can I get for free?"

The agent calls `/api/search` with `q=voice agent` and `student=true`, then lists the returned offers with exact amounts, eligibility, claim links and source links with verification dates, and notes that terms are set by each vendor.

## Best Practices

- Never invent offers, amounts or eligibility. Report only what the API returned; if nothing matches, say so.
- Do not add up, round or convert amounts yourself. For packs, quote the pack's `headline`.
- Always include the source link and last-verified date, and tell the user to confirm terms on the vendor's page before relying on an offer.

## Limitations

- Coverage is a curated list, not every offer on the internet. Vendors change or close programs without notice; `last_verified` shows how fresh each record is.
- Eligibility (funding stage, student status, region) is decided by the vendor, not by Perq.
- Needs network access to `https://perq.sh`.

## Privacy

Searches send only the query text and filters. Perq also offers an optional early-access subscription (email or webhook) at `/api/subscribe`; that sends contact data and should be used only when the user explicitly asks and gives the address. This skill does not need it.

## Resources

- Agent docs: https://perq.sh/agents
- Source skill (MIT): https://github.com/f-o-x11/perq-skill
- Official MCP Registry id: `sh.perq/perq`
