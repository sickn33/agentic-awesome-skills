---
name: perp-dex-costs
description: "Before a perpetual futures trade, find which perp DEX is cheapest now for the size (fees plus slippage on the live book) and compare funding across 25+ venues."
category: finance
risk: safe
source: self
source_type: self
date_added: "2026-11-16"
author: dineroenlamesa
tags: [crypto, defi, perpetuals, perp-dex, funding-rates, trading-costs, market-data]
tools: [claude, codex, cursor, gemini]
---

# Perp DEX Costs: Pre-trade Cost and Funding Check

## Overview

Fees on decentralised perpetual exchanges differ by venue, and the real cost of a market order also depends on slippage in the order book at that moment. This skill reads the Dinero en la Mesa API (https://dineroenlamesa.com/agents) to answer, before a trade: which venue is cheapest for this size right now, what funding each venue pays or charges, how deep each book is, and which long/short venue couple collects a funding gap net of opening and closing both legs.

Costs are round trips at market (open and close): taker fees verified in each venue's documentation plus slippage walked on the live order book. Funding is normalised to 8 hours. Every figure carries the time it was read. It covers 25+ perp DEXs, including Hyperliquid, Lighter, dYdX, Extended and Paradex.

Unlike skills that prepare or sign swaps on spot DEXs, this skill only reads data and never places, signs or pays for anything.

## When to Use This Skill

- The user asks where to open a perpetual position (for example "where is it cheapest to long 25k of BTC?") or compares perp DEX fees.
- The user wants funding rates for a pair across venues, or a delta-neutral funding trade between two venues.
- The user asks whether a venue's order book can take a given size.
- The user farms airdrop points on perp DEXs and wants open campaigns or recent rule changes.
- Do not use it for centralised exchanges, spot swaps or placing orders: hand the chosen venue to a trading skill or to the user.

## Prerequisites

- Network access to `https://dineroenlamesa.com` and `curl` (or any HTTP client). No account, no API key.
- Each request sends the pair, the order size and the other parameters you pass to dineroenlamesa.com. Nothing else is sent, and no wallet or key is involved.
- The free endpoints cost nothing. The paid endpoints (below) only return their price and a preview unless an x402 payment is attached, which this skill never does.

## How It Works

### 1. Pick the endpoint, then ask only for its inputs

Choose the endpoint from the table in step 2 by what the user asks, then collect only what that endpoint needs:

- `pair` (base asset: `BTC`, `ETH`, `SOL`, `XRP`, `BNB`, `DOGE`, `HYPE`, `SUI`, `LINK`, `AAVE`, `ENA`, `LTC`) for `best_venue`, `trading_cost`, `funding_rates`, `depth` and `delta_neutral`.
- Order size in USD notional for `best_venue` and `trading_cost`; size per leg and holding days (default 7) for `delta_neutral`. Never assume a size for a cost calculation: if it is missing, ask.
- `list_venues` and `live_airdrops` need nothing; `changes` takes optional `days`; `signup_link` takes `venue`.

### 2. Call the matching endpoint

All endpoints are `GET https://dineroenlamesa.com/agents/api/<endpoint>` and return JSON. Add `c=agentic-skills` so the API can count calls from this skill.

| Endpoint | Parameters | Returns |
|----------|------------|---------|
| `best_venue` | `pair`, `size_usd`, optional `monthly_volume_usd` | Cheapest venue for the round trip, cost in USD and bps, runners-up |
| `trading_cost` | `pair`, `size_usd`, optional `monthly_volume_usd` | Every venue ranked, fees and slippage split, venues with no figure and why |
| `funding_rates` | `pair` | Funding per venue normalised to 8 h, APR, who pays |
| `delta_neutral` | `pair`, `size_usd_per_leg`, `days` | Best long/short venue couple: funding earned minus entry and exit cost |
| `depth` | `pair` | Spread in bps and USD resting within 0.5% and 1% of mid, per side |
| `list_venues` | none | Venues covered, book type, entry-tier maker/taker fees and the date they were checked |
| `live_airdrops` | none | Open airdrop and points campaigns, next hard date first |
| `changes` | `days` | What changed in tracked campaigns (dates, rules, rewards) |
| `signup_link` | `venue` | Account-opening link for one venue |

```bash
curl -s "https://dineroenlamesa.com/agents/api/best_venue?pair=BTC&size_usd=25000&c=agentic-skills"
curl -s "https://dineroenlamesa.com/agents/api/funding_rates?pair=SOL&c=agentic-skills"
curl -s "https://dineroenlamesa.com/agents/api/delta_neutral?pair=BTC&size_usd_per_leg=10000&days=7&c=agentic-skills"
```

Paid endpoints (USDC on Base through x402, no account): `execution_plan` (`pair`, `size_usd`, `side`) splits a large order across venues, 1 USDC and charged only if the split saves 20 USD or more; `delta_neutral_scanner` (`size_usd_per_leg`, `days`) scans every pair and venue couple every minute, 0.10 USDC; `cost_per_point` estimates airdrop points per dollar of fees, 0.05 USDC; `farming_route` (`weekly_budget_usd`, `trade_size_usd`) shows what a weekly farming budget buys on each venue, 0.50 USDC. Without payment they answer HTTP 402 with what the call would deliver right now and its price: report that to the user and stop. Paying requires the user's own x402-capable wallet or an agent connected to the MCP server `https://dineroenlamesa.com/agents/mcp`; never attempt payment from this skill.

### 3. Verify and report the result

- Report the venue, its cost in USD and bps, and the time the book was read (`book.as_of`). If the reading is old or a venue gives no figure, say so instead of filling the gap.
- For funding, state who pays (longs or shorts) and that rates change every hour: a reading, not a forecast.
- If the response is an HTTP error or empty, report the error; do not estimate costs from memory.

## Examples

```text
User request: Where is it cheapest to open and close a 25,000 USD BTC long right now?
Inputs: pair=BTC, size_usd=25000
Call: GET /agents/api/best_venue?pair=BTC&size_usd=25000&c=agentic-skills
Expected result (illustrative, not a measured test): the cheapest venue with its round-trip
cost in USD and bps, the two runners-up, and the time each book was read.
```

```text
User request: Is there a funding trade on ETH this week with 10k per side?
Inputs: pair=ETH, size_usd_per_leg=10000, days=7
Call: GET /agents/api/delta_neutral?pair=ETH&size_usd_per_leg=10000&days=7&c=agentic-skills
Expected result (illustrative): the long venue, the short venue, funding earned over 7 days,
entry and exit cost of both legs, and the net amount; or that no couple nets a positive amount.
```

## Limitations

- Costs are for market (taker) orders. Limit orders that fill as maker usually cost less.
- Fees are entry-tier unless `monthly_volume_usd` is given; VIP or negotiated tiers are not covered.
- Slippage is measured on the book at read time; a fast market can move before the order is placed.
- Funding is the current rate projected over the holding period, not a prediction.
- Venues and pairs outside the covered list return no figure; that is not evidence the venue is expensive.

## Safety and side effects

Read-only HTTP GET requests to dineroenlamesa.com; no writes, no orders, no signatures, no payments. Each venue in the output carries an account-opening link and, when there is one, what the user gets by opening the account that way (for example a fee rebate): these are Dinero en la Mesa referral links. They never change the ranking, which is by cost only. Present them as optional. Affiliation: this skill is published by Dinero en la Mesa, the operator of the API. Terms of use: https://dineroenlamesa.com/agents/terms/

## Sources and related skills

- API and MCP server documentation: https://dineroenlamesa.com/agents
- Terms of use: https://dineroenlamesa.com/agents/terms/
- Related: `chord-onchain-trading` (spot swaps on EVM chains), `blockchain-developer`.
