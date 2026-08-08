---
name: options-flow-analyzer
description: Real vs lottery call separation for options P/C ratio analysis — prevents signal inversion from deep OTM noise
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

Analyze options chain data with real vs lottery call separation — the key insight that prevents P/C ratio misinterpretation. Uses Polygon.io API.

## When to Use

- Use when raw put/call ratios appear bullish or bearish but may be distorted by cheap deep OTM contracts.
- Use when comparing options flow across watchlists, holdings, sectors, or event-driven names.
- Use when you need to separate institutional hedging from speculative lottery-ticket activity.
- Use when tracking options anomalies against a recent baseline.

## What it does

Standard P/C ratio analysis is misleading. A P/C of 0.35 looks "extremely bullish" but may be 84% lottery calls ($0.01-$0.09 OTM options).

This skill separates:
- **Real calls**: Strike price within 5% of stock price, meaningful premium
- **Lottery calls**: Deep OTM, cheap premium, speculative bets
- **Real puts**: Actual hedging activity
- **Lottery puts**: Cheap downside bets

## Analysis Output

For each ticker:
- Real P/C ratio (excludes lottery noise)
- Lottery percentage (what % of volume is speculation)
- Per-expiry breakdown (weekly vs monthly vs LEAPS)
- Anomaly detection: P/C shifts >0.3, Call OI surges >30%, IV spikes >20%
- Sentiment classification: Bullish/Bearish/Neutral with confidence

## Example Output

```
Options Flow Summary — 2026-05-13

HOLDINGS:
CEG  $299.69 | Raw P/C: 1.06 | Lottery: 61% | Adj P/C: 2.72  BEARISH (was neutral raw)
IREN $55.15  | Raw P/C: 0.83 | Lottery: 34% | Adj P/C: 0.55  BULLISH
KTOS $56.99  | Raw P/C: 0.53 | Lottery: 28% | Adj P/C: 0.38  EXTREME BULLISH
RXRX $3.26   | Raw P/C: 0.38 | Lottery: 84% | Adj P/C: 2.37  BEARISH (was extreme bullish raw)

SECTORS:
XLI  | Raw P/C: 5.32 | Lottery:  8% | Adj P/C: 4.89  INSTITUTIONAL HEDGE

ANOMALIES:
XLI: P/C 5.32 vs 30-day baseline 0.87 — 4.5 std deviations above normal
RXRX: 84% lottery calls — raw P/C signal completely inverted after filtering
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

- Polygon.io API key (free tier covers basic data; paid tier for full chain)
- WebSearch for cross-verification

## Limitations

- Options data can be delayed, incomplete, or unavailable depending on the Polygon.io plan.
- Heuristics such as premium and delta thresholds need adjustment for ticker price, volatility, and expiry.
- Sentiment classifications are analytical signals, not financial advice or trade recommendations.
- Always cross-check unusual flow against price action, news catalysts, liquidity, and risk controls.

## Key Discovery

This real/lottery separation was discovered during live portfolio management when RXRX showed P/C 0.35 (looks extremely bullish) but was actually 84% lottery calls at $0.01-$0.09. The "bullish signal" was noise. This skill prevents that mistake.

## Pricing

Free: Basic P/C ratio for 3 tickers
**Full bundle — $29 one-time**: Real/lottery separation + anomaly detection + per-expiry + unlimited tickers
→ https://jaehyunpark.gumroad.com/l/tcyahy

## Author

Built from a real trading mistake that cost money. The real/lottery discovery is documented and battle-tested across 17 tickers over 2+ months.
