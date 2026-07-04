---
name: time-ledger
description: "Natural-language time tracking: parse what the user says they did into Activity/Minutes/Date rows in their own Notion database — asking instead of guessing when unsure."
category: productivity
risk: critical
source: community
source_repo: cruisekkk/time-ledger
source_type: community
date_added: "2026-07-04"
author: cruisekkk
tags: [time-tracking, notion, quantified-self, productivity, journaling]
tools: [claude]
license: "MIT"
license_source: "https://github.com/cruisekkk/time-ledger/blob/main/LICENSE"
---

# Time Ledger

## Overview

Conversational time tracking. The user reports time in plain language — *"read papers 2h, gym 1h, did a leetcode"* — and the agent parses it into structured rows (activity, minutes, date, an optional compounding tag) and writes them to the user's own Notion database through the official Notion connector. The core design is an honesty contract: **anything uncertain becomes a `To-confirm` row and gets batch-asked — never fabricated.** A log that quietly invents durations is worse than no log.

## When to Use This Skill

- Use when the user reports time spent ("read papers for two hours", "hit the gym for an hour", "coded all morning")
- Use when the user says "log it", "log my time", "time ledger", or "tidy up my time ledger"
- Use when the user asks where their time went or for a time review

## How It Works

### Step 1: Find the database (zero-config)

On the first write of a session, use Notion `search` to find the **database** (type `database`, not a page) whose title contains **"time-ledger"**. Read its `data_source_id` (the `collection://...` UUID) and use it as the parent for `create-pages` / `query` for the rest of the session. If more than one matches, ask the user which to use. Nothing is pasted or configured.

The companion Notion template (free, linked in the source repo) ships this field schema — select values are a controlled enum, copy them exactly:

- `Entry` (title) — the user's words or a clear title
- `Activity` (select): Reading / Coding / Practice / Fitness / Investing / Meeting / Writing / Life / Other
- `Minutes` (number)
- `Date` (date) — expand to `"date:Date:start": "YYYY-MM-DD"` (a bare value 400s)
- `Status` (select): To-sort / To-confirm / Done
- `Compounding` (select): Compounding / Consuming / Neutral
- `Notes` (text) — clue from the user's words / your question

### Step 2: Direct report mode

Parse the report → `create-pages` (parent = the data source id above). Set `Status=Done` for what is certain; for anything uncertain set `Status=To-confirm`, write the specific question in `Notes`, and ask it once in your reply.

Parsing rules:

- **Activity**: books/technical material → Reading; coding/building → Coding; leetcode → Practice; gym/running → Fitness; markets/research → Investing; meetings → Meeting; docs → Writing; meals/commute/chores → Life; otherwise → Other. Unsure → To-confirm.
- **Duration cues**: "two hours"=120, "an hour"=60, "half an hour"=30, "a while"≈30 (mark To-confirm, note it is an estimate), "all morning"≈180. Use exact numbers when given.
- **Date**: "today" = the user's local date; "yesterday" = prior day; unspecified = today. Unsure which day → ask.
- **One report, multiple blocks**: "two hours on X, one hour on Y" → split into rows, but confirm whether the totals are additive (a frequent ambiguity) — default additive + one To-confirm row.
- **Compounding tag**: only tag the obvious — Compounding = leaves a reusable asset (learning, building, writing); Consuming = forget-on-sight entertainment (only if the user volunteers it); leave ambiguous blank.

### Step 3: Batch reconcile mode

When the user says "tidy up my time ledger": query rows where `Status` ∈ {To-sort, To-confirm} or empty → parse each → `update-page` the certain ones to `Done`; batch **all** remaining questions into one message; fill answers in when the user replies.

## Examples

### Example 1: Direct report

```text
User:  log it: read ML system design 2h, gym 1h, did a leetcode
Agent: Logged 3 entries ✅
       · Reading · ML system design · 120min · Compounding
       · Fitness · gym · 60min
       · Practice · LeetCode · ~20min ❓ To-confirm: you didn't say how long — I guessed 20min, right?
```

### Example 2: Batch reconcile

```text
User:  tidy up my time ledger
Agent: 3 rows need confirmation — answering in one go works:
       1. Tue "LeetCode" — how many minutes?
       2. Wed "reading" — book or papers (Reading), or course exercises (Practice)?
       3. "all afternoon on the deck" — Wed or Thu?
```

## Best Practices

- ✅ Batch all questions into one message; never interrogate item by item
- ✅ Give a short receipt after logging (rows written, which are To-confirm, what the questions are)
- ✅ Copy select values from the enum exactly
- ❌ Don't fabricate a duration, category, or date when unsure — To-confirm + ask
- ❌ Don't write a bare `Date` property; use the `date:Date:start` expansion
- ❌ Don't judge the user's Consuming hours; the ledger is a mirror, not a critic

## Limitations

- Requires the user's own Notion workspace, the companion database (duplicate the template from the source repo), and the official Notion connector granted access to that database — connector/skill setups currently live on paid Claude tiers.
- Self-report only, by design: it does not auto-track apps or screens (an auto-tracker knows what was open, not *why* the time was spent).
- The Compounding/Consuming tags are hand rules, not a learned model.
- Select enums must match the template; if the user renames fields, the instructions above must be mirrored to match.

## Security & Safety Notes

- **Mutation scope**: writes and updates rows only in the single user-granted Notion database, via the official Notion connector (MCP) — no shell commands, no network fetches, no credentials handled by the skill.
- On claude.ai, Notion's write tools default to *needs approval* — the first write pops an approval prompt; this is expected, not a hang.
- The honesty contract is also a safety property: when parsing confidence is low, the skill records `To-confirm` and asks, rather than writing invented data into the user's records.

## Common Pitfalls

- **Problem:** Notion API returns 400 on the date field.
  **Solution:** Expand to `"date:Date:start": "YYYY-MM-DD"` — a bare `Date` value fails.
- **Problem:** Search returns example-row pages instead of the database.
  **Solution:** Filter for type `database` when resolving "time-ledger".
- **Problem:** Model clock vs user timezone differ around midnight.
  **Solution:** Treat "today" as the user's local date; ask when it could go either way.

## Related Skills

- `@trading-ledger` - The same "parse plain language → own Notion DB → ask instead of guessing" pattern applied to trading journals (entry thesis, plan, emotion).
