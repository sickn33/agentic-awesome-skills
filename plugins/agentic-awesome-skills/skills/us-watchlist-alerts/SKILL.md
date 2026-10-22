---
name: us-watchlist-alerts
description: "Free US stock watchlists, price alerts and daily briefs; no API key, NYSE-holiday aware. Informational only, never places trades."
category: data
risk: safe
source: community
source_repo: eli-alvarado/us-watchlist-alerts
source_type: community
date_added: "2026-10-21"
author: eli-alvarado
tags: [stocks, watchlist, price-alerts, market-brief, finance]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/eli-alvarado/us-watchlist-alerts/blob/main/LICENSE"
---

# US Watchlist Alerts

## Overview

Keeps a US stock/ETF watchlist in a local JSON file, checks it for price alerts, and writes a short morning or after-close brief. It uses Python 3 standard library scripts and free public quotes, so no API key is needed. Alerts follow NYSE market hours and holidays and are de-duplicated between runs. The full scripts live in the upstream repository [eli-alvarado/us-watchlist-alerts](https://github.com/eli-alvarado/us-watchlist-alerts); this skill explains how to install and use them.

## When to Use This Skill

- Use when the user asks to add, remove, tag or list tickers on a watchlist ("add NVDA to my watchlist", "set a stop on AAPL at 210").
- Use when the user asks "any alerts?" or wants a scheduled check of price levels, daily % moves, 52-week highs/lows, moving-average crosses, RSI or earnings dates.
- Use when the user asks for a morning brief or a recap of how their watchlist did today.

## How It Works

### Step 1: Install the upstream skills

Ask the user before installing. Then run from the project root:

```bash
npx skills add eli-alvarado/us-watchlist-alerts
```

This installs three skills (`watchlist-manager`, `price-alerts`, `watchlist-brief`) with their `scripts/` folders into `.claude/skills/` or `.agents/skills/`. Requires Python 3.10+.

### Step 2: Create or edit the watchlist

```bash
python3 .claude/skills/watchlist-manager/scripts/watchlist.py init
python3 .claude/skills/watchlist-manager/scripts/watchlist.py add NVDA
```

The file is `$WATCHLIST_FILE` if set, else `./watchlist.json`, else `~/.config/us-watchlist-alerts/watchlist.json`. `init --preset` offers starter lists (mega-cap tech, index ETFs, sector ETFs, dividend staples). `add` checks that the ticker exists; `--no-verify` skips that check offline.

### Step 3: Check alerts

```bash
python3 .claude/skills/price-alerts/scripts/alerts.py --dry-run --format json
```

Only new alerts are reported. Outside market hours the last regular close is used and labeled as such.

### Step 4: Write a brief

```bash
python3 .claude/skills/watchlist-brief/scripts/brief.py --kind morning
```

Use `--kind close` after 16:05 ET. On weekends and NYSE holidays, say the market is closed and give the next session.

## Examples

### Example 1: Add a ticker with a stop

User: "Add AAPL to my watchlist with a stop at 210."
Run `watchlist.py add AAPL`, then set the stop with the `watchlist-manager` update command and confirm the saved values back to the user.

### Example 2: Morning check

User: "Anything I should know before the open?"
Run `alerts.py --dry-run --format json` and `brief.py --kind morning`, then summarize the table and any alerts in a few lines.

## Best Practices

- ✅ Run scripts from the project root by path; do not `cd` into the skill folder.
- ✅ Say that free quotes may be delayed about 15 minutes.
- ❌ Do not place, modify or cancel orders, even if a broker tool is connected.
- ❌ Do not present alerts or briefs as financial advice or trade signals.

## Limitations

- US markets only (NYSE/Nasdaq hours and holidays).
- The default quote source is the unofficial Yahoo Finance chart endpoint, which can be delayed or rate-limited.
- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- Installing runs `npx skills add`, which downloads files from GitHub; ask the user before running it and let them review the scripts.
- The scripts make outbound HTTPS requests for quotes only. Optional ntfy/Slack/webhook delivery sends alert text to the configured endpoint; only enable it when the user sets it up.
- Optional providers (Alpaca, Finnhub, Alpha Vantage) read keys from environment variables. Never print or log those keys.
- The skill only edits the local watchlist and alert-state files. It never trades.
