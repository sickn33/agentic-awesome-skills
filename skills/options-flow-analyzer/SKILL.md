# Options Flow Analyzer

Analyze options chain data with real vs lottery call separation — the key insight that prevents P/C ratio misinterpretation. Uses Polygon.io API.

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

## Configuration

```
Analyze options flow for: AAPL, NVDA, TSLA, AMZN
Separate real vs lottery calls.
Show per-expiry breakdown.
Flag any anomalies in the last 24 hours.
```

## Requirements

- Polygon.io API key (free tier covers basic data; paid tier for full chain)
- WebSearch for cross-verification

## Key Discovery

This real/lottery separation was discovered during live portfolio management when RXRX showed P/C 0.35 (looks extremely bullish) but was actually 84% lottery calls at $0.01-$0.09. The "bullish signal" was noise. This skill prevents that mistake.

## Pricing

Free: Basic P/C ratio for 3 tickers
**Full bundle — $29 one-time**: Real/lottery separation + anomaly detection + per-expiry + unlimited tickers + all other skills
→ https://jaehyunpark.gumroad.com/l/tcyahy

## Author

Built from a real trading mistake that cost money. The real/lottery discovery is documented and battle-tested across 17 tickers over 2+ months.
