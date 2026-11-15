---
name: autorekt
description: "Read live market data with the autorekt CLI before answering questions about prices, market moves, liquidity, positioning, options or prediction-market odds"
category: data
risk: safe
source: self
source_type: self
date_added: "2026-11-05"
author: autorekt
tags: [market-data, finance, trading, macro, crypto, cli]
---

# autorekt market data

## Overview

Asked why a market moved, an agent without data falls back on stale training data and a few headlines. This skill makes the agent read current numbers first with [autorekt](https://github.com/autorekt/autorekt), an open-source (MIT) command-line tool. autorekt fetches data straight from free public sources: exchanges, the New York Fed, Treasury, FRED, CFTC, Cboe option chains, DTCC swap trades, the ECB, China's interbank market, Polymarket, Kalshi and news feeds. It prints them as compact text, each value with its age. The output is a data-backed answer that quotes values and timestamps and states which data is stale or delayed.

It differs from market-data skills built on one broker or vendor API, such as `longbridge-market-data`. It needs no account or API key, it covers cross-asset macro and funding data (repo rates against IORB, swap spreads, the Treasury General Account, dealer gamma, CFTC positioning) as well as prices, and it never trades.

## When to Use

- The user asks what is happening in markets, why an asset moved, or whether there is panic.
- The user asks about dollar liquidity, rates, credit, positioning, options, crypto funding and liquidations, China or Hong Kong markets, or prediction-market odds.
- The user wants to be alerted when a market condition holds, for example when the VIX curve inverts.
- Use a broker skill instead when the user wants account data or to place orders; autorekt only observes.

## Prerequisites

- The `autorekt` binary on PATH. If it is missing, ask the user before installing it; installation instructions and checksummed release binaries are at https://autorekt.com and https://github.com/autorekt/autorekt/releases.
- Network access to the public data sources. Every request goes to a data source itself; nothing is sent to a server run by the autorekt authors, and no account or key is needed.
- The first command starts a small local daemon that keeps fetched data fresh in `~/.autorekt`.

## How It Works

### 1. Establish the inputs

Identify the assets, the time window and the question. If the user names no asset, start from the briefing. Find unknown identifiers with `autorekt search <words>`; `autorekt --help` lists the providers and aliases.

### 2. Perform the task

Start broad, then drill into what stands out:

```sh
autorekt show                            # briefing: cross-asset moves, volatility, liquidity, crypto positioning, odds, calendar, headlines
autorekt show liquidity                  # repo vs IORB, swap spreads, TGA, reserves, credit spreads
autorekt show positioning                # CFTC, dealer gamma, put/call, ETF flows, short volume
autorekt show NQ -i 15m -r 1d            # one series: candles, swings, levels, events, data checks
autorekt show 'RSP / SPY' -i 1d -r 120d  # expressions work wherever an id does
autorekt why BTC -r 2d                   # the biggest move, what moved with it, dated news
autorekt why SPX BTC GOLD US10Y -r 30d   # correlations and which pairs broke
```

Only when the user asks for an alert, create a rule. Backtest it first, and show the user the hook command before saving it, because the daemon runs that command whenever the rule fires:

```sh
autorekt watch 'VIX - VIX3M > 1.5' --test -r 90d
autorekt watch vix_inv --expr 'VIX - VIX3M > 1.5' --tf 15m --for 30m --hook '<command the user approved>'
```

### 3. Verify the result

Answer from the printed numbers. Quote each value with its timestamp, call out values marked stale or delayed, and keep the caveats the output prints (for example, Yahoo and Cboe data lag about 15 minutes, and FRED and CFTC data lag days). If a source failed, the output lists it as missing with the reason. Report that gap; do not fill it from memory.

## Examples

```text
User request: Is there panic in markets right now, and what is being traded?
Inputs: none beyond the question
Expected result (illustrative): the agent runs `autorekt show`, `autorekt show positioning` and `autorekt why SPX -r 1d`, then reports with values and times that the VIX term structure is inverted, dealer gamma is negative and crypto liquidations spiked at the US open, and names the data that is stale.
```

## Limitations

- Free public sources only: some data is delayed (about 15 minutes for Yahoo and Cboe) and weekly or daily statistics are published with lags of days.
- Some sources block certain networks (for example, Binance from the US); the output names such sources as missing rather than failing silently.
- Dealer gamma assumes dealers are long calls and short puts; crypto positioning comes from OKX only.
- A missing or stale value means unknown; the agent must not infer it.

## Safety and side effects

Reading data (`show`, `search`, `why`) is read-only apart from the local cache in `~/.autorekt`. Creating a rule with `--hook` stores a command that the local daemon runs whenever the rule fires, so create one only at the user's request and with a command they approved. `autorekt show FILE.md --share` publishes a report through a public Cloudflare tunnel, so use it only when the user asks for a link. autorekt never places orders.

## Sources and related skills

- Repository and documentation: https://github.com/autorekt/autorekt
- Upstream skill maintained with the tool: https://github.com/autorekt/autorekt/blob/main/skills/autorekt/SKILL.md
- Related: `longbridge-market-data` for Longbridge account-based quotes in HK, US, A-share and SG markets.
