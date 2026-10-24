# Risk math for position checks

Entry, side and leverage come from the user; mark is the current `price` from the data tools.

## P&L

- Price move % = (mark − entry) / entry × 100, sign-flipped for a SHORT.
- Return on margin % ≈ price move % × leverage (isolated margin; for cross margin the same figure
  describes the position, not the account).
- Unrealized P&L in USD needs the size; compute it only when the user gave one, and say so.

## Liquidation

- Exact: the liquidation price the user's exchange shows → distance % = |liq − mark| / mark × 100.
- If no exchange liquidation price is supplied, report it as unavailable. Leverage alone is insufficient: collateral mode/balance, contract type, fees, maintenance tiers and other positions affect liquidation.

Distance bands are illustrative attention labels, not calibrated safety thresholds or recommendations. A distant liquidation level does not make a position safe.

## Stop sanity

- Stop distance % = |stop − mark| / mark × 100.
- In ATRs = |stop − mark| / ATR(14) on the timeframe the user trades (use the 4h if unstated).
  ATR is a historical volatility measure, not a probability or guarantee that a stop is safe; compare only matching instrument/timeframe data.
- Reward-to-risk = |target − mark| / |stop − mark| from the CURRENT mark (the original R:R from
  entry is history).

## Funding

- Per-day cost ≈ (`funding.ratePct` / 100) × 3 (only when the contract settles every 8 hours) × notional; a positive rate is paid
  by longs to shorts. Quote it as "≈ $x/day" or "≈ y% APR against / for this side".
- `avg3dPct` says whether today's rate is typical.

## Reading the chart against the position

- Same-side confluence (a LONG with 1h/4h/1d bullish) → the chart supports the position; the risk
  is the distance to the stop and to liquidation, not the direction.
- Opposite-side confluence → the chart is against it; name the level that would have to reclaim.
- Mixed → identify which timeframe is the user's and lead with that one.
- Nearest level against the position vs stop: if the stop is beyond a well-touched support (for a
  long), the plan has structure; if it sits above it, note that the level may be tested first.

## Worked example

LONG ETH 10x cross, entry 2,434, mark 2,534, liq 2,290, stop 2,380, ATR(4h) 62, funding
+0.002%/8h, OI regime `new_longs`, top traders 55% long.

- Price move +4.1%, on margin ≈ +41%.
- Liquidation 9.6% away → watch.
- Stop 6.1% / 2.5 ATR away → outside 4h noise.
- Funding ≈ 0.006% of notional/day at this fixed rate/interval; annualization is arithmetic, not a prediction, and is not margin APR.
- Chart 4h bullish, 1d neutral → mixed; the 4h is doing the work.
- Derivatives: new longs entering; leaders lean long only mildly (55%).
- Thesis check: the position needs the 4h uptrend to hold; a 4h close below the nearest support
  (say 2,470) would put the stop in play; above 2,600 resistance the next level is …
- Scenarios: at 2,470 → +1.5% on price (+15% on margin); at 2,380 (stop) → −2.2% / −22%; at 2,290
  → liquidated.

Reported as facts and scenarios — no instruction about what to do.
