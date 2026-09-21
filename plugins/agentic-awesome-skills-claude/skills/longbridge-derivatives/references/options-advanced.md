# longbridge-options-advanced

Prompt-only analysis skill. Covers advanced options and volatility strategies for experienced traders — calendar/diagonal spreads, dynamic delta hedging, vol arbitrage, and skew trading — grounded in live Longbridge data.

## CLI

Run `longbridge <subcommand> --help` to verify exact flags.

```bash
# Option chain across expiries — compare IV term structure
longbridge option chain <SYMBOL> --format json
longbridge option chain <SYMBOL> --date <NEAR_EXPIRY> --format json
longbridge option chain <SYMBOL> --date <FAR_EXPIRY> --format json

# Historical price for realized vol and HV regime
longbridge kline <SYMBOL> --period day --count 120 --format json

# Underlying spot
longbridge quote <SYMBOL> --format json
```

## Strategy reference

### Calendar spread (时间价差 / 日曆價差)

- **Structure**: sell near-month option, buy same-strike far-month option (both calls or both puts).
- **Profit from**: near-month IV rich vs far-month, or time decay differential.
- **Risk**: large underlying move before near expiry; vega risk if far-month IV drops.
- **Check**: compare ATM IV for near vs far expiry from chain; enter when near/far IV ratio > 1.1.

### Diagonal spread (对角价差 / 對角價差)

- **Structure**: sell near-month OTM option, buy far-month different-strike option.
- **vs Calendar**: directional bias added via strike selection.

### Dynamic Delta hedging (动态 Delta 对冲 / 動態 Delta 對沖)

- Hold option position; hedge Delta with underlying shares or futures.
- Re-hedge when Delta drifts beyond a threshold (e.g. ±0.05) or on a time schedule.
- **Gamma scalping**: long gamma + delta-neutral → profit from re-hedging realised vol > IV paid.
- **Short gamma**: short options + hedged → profit if realised vol < IV collected.

### Vol arbitrage — Long Vol / Short Vol

- **Long Vol**: buy options (straddle/strangle) when IV cheap vs expected realised vol.
- **Short Vol**: sell options (strangle/condor) when IV rich; manage gamma risk with hedges.
- Signal: IV/HV ratio. IV/HV > 1.3 → rich (short vol candidate); < 0.8 → cheap (long vol candidate).

### Skew trade (偏斜交易 / 偏斜交易)

- OTM put IV > OTM call IV = positive skew (norm for equities, fear-driven).
- **Fade skew**: sell OTM puts, buy OTM calls (risk-reversal) when skew excessive.
- **Follow skew**: buy OTM puts when tail risk underpriced.
- Measure: compare 25-delta put IV vs 25-delta call IV from the chain.

### SABR model (conceptual)

- Stochastic Alpha Beta Rho — captures vol smile dynamics analytically.
- Parameters: α (vol level), β (CEV exponent), ρ (spot-vol correlation), ν (vol of vol).
- Longbridge data supports manual calibration: extract IV smile from chain, fit SABR numerically.

## Workflow

1. Identify the strategy type from the user's question.
2. Fetch chain for relevant expiries + kline for HV calculation.
3. Compute the key signal (IV term structure ratio / IV-HV ratio / skew spread).
4. Explain structure, entry signal, risk, and exit criteria.
5. Show example legs with live strikes from the chain.
6. Output structured response (template below).

## Output template

```
{Symbol} advanced options analysis — Source: Longbridge Securities

[Vol regime]
- ATM near-month IV: X%  |  ATM far-month IV: X%  |  Term ratio: X
- 60-day HV: X%  |  IV/HV: X  → {rich / fair / cheap}
- Put skew (25Δ put − 25Δ call): +X pp

[Strategy: {Name}]
Rationale: {1-2 sentences}
Legs:
  Sell: {OCC} @ ${prem}  (IV: X%)
  Buy:  {OCC} @ ${prem}  (IV: X%)
Net debit/credit: ${X}
Max profit: ${X}  |  Max loss: ${X}
Key risk: {describe}
Re-hedge trigger (if delta-hedged): Delta drift ±{threshold}

⚠️ 以上分析仅供参考，不构成投资建议。/ 以上分析僅供參考，不構成投資建議。/ For reference only. Not investment advice.
```

## Error handling

| Situation                       | 简体回复                                         | 繁體回復                                         | English reply                                                 |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------- |
| `command not found: longbridge` | 切换到 MCP；若不可用，请安装 longbridge-terminal | 切換至 MCP；若不可用，請安裝 longbridge-terminal | Fall back to MCP; if unavailable, install longbridge-terminal |
| stderr `not logged in`          | 请执行 `longbridge auth login`                   | 請執行 `longbridge auth login`                   | Run `longbridge auth login`                                   |
| Only one expiry available       | 无法构建日历价差，仅有单一到期日                 | 無法構建日曆價差，僅有單一到期日                 | Cannot build calendar spread — only one expiry available      |
| Kline < 60 bars                 | HV 样本不足，波动率比较仅供参考                  | HV 樣本不足，波動率比較僅供參考                  | HV sample insufficient; vol comparison is indicative only     |
