---
name: options-flow-analyzer
description: Compare raw and explicitly filtered options put/call ratios with documented premium, delta and expiry assumptions
category: finance
risk: safe
source: community
source_type: community
date_added: "2026-05-13"
author: tellmefrankie
tags: [options, sentiment-analysis, trading, polygon, market-analysis]
tools: [websearch]
---
# Options Flow Analyzer

Analyze options chain data with explicitly labeled heuristic filters. The historical upstream calls these “real” and “lottery” buckets; those names do not establish trader intent, trade quality or a predictive signal. Verify the current data provider (Polygon.io/Massive), plan and schema.

## When to Use

- Use when raw put/call ratios appear bullish or bearish but may be distorted by cheap deep OTM contracts.
- Use when comparing options flow across watchlists, holdings, sectors, or event-driven names.
- Use when you need to compare low-premium/deep-OTM activity with other contracts, without inferring institutional identity or hedging intent.
- Use when tracking options anomalies against a recent baseline.

## What it does

Raw put/call ratios can change materially after filtering. A filter can also remove legitimate hedges or parts of multi-leg positions. Report both views and sensitivity to the chosen thresholds.

1. Record provider, retrieval time, session, underlying price time and entitlement/delay. Paginate the complete selected chain and identify missing quotes/Greeks rather than silently dropping them.
2. Choose one measurement: session contract volume or open interest; never mix their numerators/denominators. Compute raw P/C = sum(put measure) / sum(call measure), returning undefined when call measure is zero.
3. Define the heuristic explicitly for both puts and calls, for example OTM contracts with premium < $0.10 per share AND absolute delta < 0.05. State whether premium means bid, ask, midpoint or last trade and reject stale/crossed quotes. Missing delta stays unknown, not zero. Strike distance alone is not interchangeable with delta.
4. Compute filtered P/C using retained contracts and report excluded share by side, expiry and measurement. Compare reasonable alternative thresholds.
5. Compare matched-expiry/session baselines only when historical observations exist. Open interest is a daily outstanding-contract measure; an intraday snapshot does not supply its history. Volume/OI alone cannot establish opening versus closing, buyer versus seller initiation, or institutional hedging.

See [OIC explanation of open interest](https://www.optionseducation.org/referencelibrary/faq/general-information) and [provider data coverage](https://massive.com/knowledge-base/categories/options).

## Analysis Output

For each ticker:
- Filtered P/C ratio with exact filter and coverage
- Excluded percentage by side (a heuristic bucket, not measured speculation)
- Per-expiry breakdown (weekly vs monthly vs LEAPS)
- Anomaly detection: P/C shifts >0.3, Call OI surges >30%, IV spikes >20%
- Conditional interpretation with uncertainty; no unsupported confidence probability

## Example Output

```
Illustrative calculation — synthetic, not live prices or a trade signal
Raw put volume: 120; raw call volume: 200 → raw P/C 0.60
Excluded puts: 20; excluded calls: 150
Retained puts: 100; retained calls: 50 → filtered P/C 2.00
Excluded volume share: 170/320 = 53.1%
Interpretation: the ratio is sensitive to this filter; direction and trader intent are unknown.
```

## Configuration

```
Analyze options flow for my watchlist:
Holdings: CEG, IREN, KTOS, RXRX, TEM
Sectors: SPY, QQQ, XLI, XLK
Separate real vs lottery calls (threshold: premium < $0.10, delta < 0.05).
Flag anomalies vs 30-day baseline.
```

## Requirements

- Authorized provider credential in a private host secret store; verify current plan entitlements for snapshots, quotes and Greeks before promising chain analysis
- WebSearch for cross-verification

## Limitations

- Options data can be delayed, incomplete, or unavailable depending on the Polygon.io plan.
- Heuristics such as premium and delta thresholds need adjustment for ticker price, volatility, and expiry.
- Sentiment classifications are analytical signals, not financial advice or trade recommendations.
- Always cross-check unusual flow against price action, news catalysts, liquidity, and risk controls.

## Upstream claims and commercial offer

The upstream author attributes this heuristic to a trading experience and links a paid bundle at https://jaehyunpark.gumroad.com/l/tcyahy. Those performance, validation, pricing and package-scope claims are not independently verified here. This AAS entry is a guide, not that commercial implementation. Do not infer a reliable trading edge from the anecdote or purchase anything as part of analysis without authorization.
