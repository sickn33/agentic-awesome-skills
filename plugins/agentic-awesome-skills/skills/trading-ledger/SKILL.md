---
name: trading-ledger
description: "A trading journal that captures the decision, not just the fill: thesis, plan, and emotion at the moment of entry, written to the user's own Notion database; reviews grade decisions, not P&L."
category: productivity
risk: critical
source: community
source_repo: cruisekkk/trading-ledger
source_type: community
date_added: "2026-07-04"
author: cruisekkk
tags: [trading-journal, notion, journaling, market-wizards, decision-making]
tools: [claude]
license: "MIT"
license_source: "https://github.com/cruisekkk/trading-ledger/blob/main/LICENSE"
---

# Trading Ledger

## Overview

A journaling skill in the tradition of the *Market Wizards* interviews: a written record of every trade's decision process, reviewed on a schedule. The user reports a trade in plain language — *"bought 500 NVDA at 135, stop at 128, betting the post-earnings dip fills"* — and the agent writes ticker, size, and price to the user's own Notion database **plus the part every spreadsheet journal loses: the thesis, the plan, and the emotion.** If no reason is stated, it asks on the spot, because entry reasons decay overnight. Reviews grade decision quality against the user's own plan — a per-plan loss scores better than a lucky win. Core contract: never fabricate when unsure; mark `To-confirm` and batch-ask.

## When to Use This Skill

- Use when the user reports a trade fill ("bought 500 NVDA at 135", "closed my TSLA position", "opened 2 ES contracts short")
- Use when the user says "log a trade" or "trading ledger", or "tidy up my trading ledger"
- Use when the user asks to "review my trades"

## How It Works

### Step 1: Find the database (zero-config)

On the first write of a session, use Notion `search` to find the **database** (type `database`, not a page) whose title contains **"trading-ledger"**. Read its `data_source_id` (`collection://...` UUID) and use it as the parent for `create-pages` / `query` for the session. More than one match → ask which.

The companion Notion template (free, linked in the source repo) ships this schema — select values are a controlled enum, copy them exactly:

- `Entry` (title); `Ticker` (text — strikes/expiries here: NVDA / NVDA 0620C150 / ESU6)
- `Market` (select): US Stocks / US Options / US Futures / A-Shares / HK Stocks / CN Futures / Crypto / Other
- `Direction` (select): Long / Short · `Size` (text, with units)
- `Entry Price` / `Exit Price` (number) · `Entry Date` / `Exit Date` (date — expand to `"date:Entry Date:start": "YYYY-MM-DD"`; a bare value fails with HTTP 400)
- `Thesis` (text) — **the soul of the journal; if missing, ask on the spot**
- `Plan` (text) — stop / target / contingency; ask if missing
- `Emotion` (select): Calm / FOMO / Panic / Revenge / Boredom / Overconfidence — tag only what the user admits or what is plain in their words; don't diagnose
- `Execution` (select): Per plan / Early exit / Delayed stop / Impulse / Unplanned add — filled at close
- `P&L` (number, realized) · `Status` (select): Open / Closed / To-confirm / Reviewed · `Review` (text) · `Notes` (text)

### Step 2: Opening a trade

Parse → create a row with `Status=Open`. A missing thesis is the one field worth interrupting for — ask immediately. Anything else uncertain: record what you have, put the question in `Notes`, mark `To-confirm`.

### Step 3: Closing or adjusting

Find that ticker's `Status=Open` row → fill Exit Price / Exit Date / P&L / Execution → set `Closed`. Grade `Execution` against the user's own `Plan`: stopped where planned = Per plan; ran before the target = Early exit; held through the stop = Delayed stop. No matching open row → create one marked `To-confirm` and ask whether the entry was never logged.

### Step 4: Batch reconcile and review

- "tidy up my trading ledger" → query `Status=To-confirm` rows → collect **all** open questions into one message.
- "review my trades" → query recent `Closed` + all `Open` rows. For each closed trade, three questions: **Did the thesis play out?** (wrong thesis + profit = luck — say so). **How was the execution?** (a per-plan loss is a good trade). **What share of trades were emotion-tagged?** Write conclusions into `Review`, move `Closed` → `Reviewed`, and for every open position ask: *does the entry thesis still hold today?*

Parsing rules: infer `Market` from symbol and context (ambiguous → ask); bought put = Short exposure + note it is a long put; record only given prices/sizes — **never look up market prices to fill gaps**; "today" = the user's local trading date — confirm before writing.

## Examples

### Example 1: Opening with a missing plan

```text
User:  picked up some TSM July calls this morning, same thesis as before earnings
Agent: Logged ✅ TSM July calls · Long · Open
       ❓ To-confirm: which strike/expiry, how many contracts, at what price?
       ❓ And the plan — holding through earnings, or is there a stop?
User:  0731 475C, 1 contract at 18.50, holding to earnings
Agent: Updated ✅ Ticker: TSM 0731C475 · Thesis: pre-earnings run-up · Plan: hold through earnings
```

### Example 2: Review day

```text
User:  review my trades
Agent: 3 closed since last review:
       · NVDA long — thesis played out, exited per plan. Good trade.
       · TSLA short — thesis wrong, but stopped exactly where planned. Good trade, bad outcome.
       · SPY calls — profitable, but Entry was tagged FOMO and there was no plan. Lucky, not good.
       Open positions: TSM call — earnings run-up thesis still holds until the 7/29 print.
```

## Best Practices

- ✅ Ask for the thesis at entry time — it decays overnight and memory flatters
- ✅ Grade execution against the user's own plan, never against hindsight
- ✅ Batch all questions into one message; give a short receipt after logging
- ❌ Don't compute P&L you are unsure of — options and futures have multipliers; use the user's numbers
- ❌ Don't invent select values; copy the enum
- ❌ A review is not a P&L total — it grades thesis and execution

## Limitations

- Requires the user's own Notion workspace, the companion database (duplicate the template from the source repo), and the official Notion connector granted access — connector/skill setups currently live on paid Claude tiers.
- Close, reconcile, and review flows require reliable Notion database query/search access to open, closed, and `To-confirm` rows. If the connector cannot query the ledger, stop after logging the user's new facts and ask them to provide the relevant row details instead of guessing matches.
- No broker integration, by design: the broker knows the fills; only the user knows the reasons. The user must self-report.
- Grading honesty depends on input honesty: a thesis backfilled three days later defeats the point (the skill nags, but cannot prevent it).

## Security & Safety Notes

- **Mutation scope**: writes and updates rows only in the single user-granted Notion database via the official Notion connector (MCP) — no shell commands, no network fetches, no market-data lookups, no credentials.
- **This skill must never produce trading signals, price data, or buy/sell recommendations.** It records and mirrors the user's own decisions; the review asks questions, it does not advise. Nothing it writes is financial advice, and it should say so if asked for a recommendation.
- On claude.ai, Notion's write tools default to *needs approval* — the first write pops an approval prompt; expected, not a hang.

## Common Pitfalls

- **Problem:** Notion API 400 on date fields.
  **Solution:** Expand to `"date:Entry Date:start": "YYYY-MM-DD"`.
- **Problem:** `create-pages` succeeds but the date column is empty (known Notion MCP issue: [notion-mcp-server#121](https://github.com/makenotion/notion-mcp-server/issues/121) — expanded date fields silently dropped).
  **Solution:** After the session's first create, read the row back; if the date is empty, fill it with `update-page`.
- **Problem:** Close matched to the wrong row when the same ticker was traded twice.
  **Solution:** Match on `Status=Open` + ticker; if multiple open rows match, ask which one.
- **Problem:** Overnight US fills dated to the wrong day for non-US users.
  **Solution:** Overnight fills belong to the US trading date; confirm the date before writing.

## Related Skills

- `@time-ledger` - The same "parse plain language → own Notion DB → ask instead of guessing" pattern applied to time tracking.
