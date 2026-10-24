---
name: backtesting-frameworks
description: "Build robust, production-grade backtesting systems that avoid common pitfalls and produce reliable strategy performance estimates."
risk: safe
source: community
date_added: "2026-02-27"
---

# Backtesting Frameworks

Build robust, production-grade backtesting systems that avoid common pitfalls and produce reliable strategy performance estimates.

## Use this skill when

- Developing trading strategy backtests
- Building backtesting infrastructure
- Validating strategy performance and robustness
- Avoiding common backtesting biases
- Implementing walk-forward analysis

## Do not use this skill when

- You need live trading execution or investment advice
- Historical data quality is unknown or incomplete
- The task is only a quick performance summary

## Instructions

- Define hypothesis, universe, timeframe, and evaluation criteria.
- Build point-in-time data pipelines and realistic cost models.
- Implement event-driven simulation and execution logic.
- Use train/validation/test splits and walk-forward testing.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Safety

- Do not present backtests as guarantees of future performance.
- Avoid providing financial or investment advice.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Simulation boundaries

The examples are incomplete educational engines, not production-grade or validated performance estimates. Event execution is single-symbol long-only and needs sorted unique timestamps, finite positive OHLC prices, valid cash/order quantities and explicit unsupported limit/stop handling; do not silently discard unsupported or final pending orders. State persists across run calls: create a fresh engine per experiment. Corporate actions, dividends, delistings, missing bars, borrow/funding/margin, latency, liquidity/partial fills and capacity remain unmodeled. A one-period signal shift does not cure a signal function that reads future data, and close-to-close attribution requires a precisely defined execution clock. Annualization must match sampling frequency; 252 assumes trading-day data and simple IID scaling may fail under autocorrelation. Nonzero return days are not trades, geometric annual return divided by volatility is not the standard arithmetic excess-return Sharpe, and a curve without initial capital can miss first-period drawdown. Preserve initial wealth in each metric and report undefined ratios rather than invented zero. Walk-forward needs train-only warm-up for test indicators, no overlapping test windows and consistent costs/capital chaining; repeated parameter search adds selection bias. IID bootstrap ignores serial dependence/regime shifts and produces conditional simulation quantiles, not a calibrated future-loss probability. Record data versions, all trials, seeds, cost assumptions, benchmarks and untouched holdout results; no live execution or investment recommendation is authorized.
