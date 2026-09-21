# longbridge-options-strategy

Prompt-only analysis skill. Recommends and explains common options strategies based on the user's market view (bullish/bearish/neutral) and current IV environment (rich/cheap).

## CLI

Run `longbridge <subcommand> --help` to verify exact flags.

```bash
# Underlying spot and context
longbridge quote <SYMBOL> --format json

# Option chain — expiry dates
longbridge option chain <SYMBOL> --format json

# Strikes for a specific expiry
longbridge option chain <SYMBOL> --date <YYYY-MM-DD> --format json

# Call / put volume ratio for sentiment
longbridge option volume <SYMBOL> --format json
```

## Strategy matrix

> 以下为不同市场环境下常见的期权策略介绍，仅供教育性参考，不构成操作建议。

| Market view             | IV level | 常见策略参考 / Common strategy reference | Risk profile                             |
| ----------------------- | -------- | ---------------------------------------- | ---------------------------------------- |
| Bullish                 | Any      | Long call / bull call spread             | Limited loss, capped or unlimited gain   |
| Bullish                 | Rich     | Bull put spread (sell put spread)        | Collect premium, limited risk            |
| Bearish                 | Any      | Long put / bear put spread               | Limited loss, capped or large gain       |
| Bearish                 | Rich     | Bear call spread (sell call spread)      | Collect premium, limited risk            |
| Neutral (range-bound)   | Rich     | Short strangle / short straddle          | Collect premium, unlimited risk          |
| Neutral (range-bound)   | Rich     | Iron condor                              | Collect premium, defined risk both sides |
| Neutral (vol expansion) | Cheap    | Long straddle / long strangle            | Pay premium, profit from large move      |
| Income on holding       | Any      | Covered call                             | Reduce cost basis, cap upside            |
| Downside protection     | Any      | Protective put                           | Insurance premium, preserve upside       |

## Workflow

1. **Clarify** user's market view (direction + conviction) and time horizon.
2. **Fetch** underlying spot (`longbridge quote`), option chain expiries, near-term strikes, and call/put volume.
3. **Assess IV** from ATM IV in chain vs rough HV proxy (see `longbridge-options-volatility`).
4. **Select 1–2 strategies** from the matrix; explain structure, legs, and cost.
5. **Show example legs** using live strikes from the chain (ATM and nearby).
6. **Output** structured recommendation (template below).

## Output template

```
{Symbol} options strategy recommendation — Source: Longbridge Securities

[Market context]
- Spot: ${S}  |  Nearest expiry: {date}  |  ATM IV: ~X%
- IV environment: {rich / fair / cheap}  |  P/C volume ratio: {X}

[Recommended strategy: {Name}]
Structure:
  Leg 1: {Buy/Sell} {N} {OCC} @ ${prem}
  Leg 2: ...

Key metrics (estimated):
  Max profit: ${X}
  Max loss:   ${X}
  Breakeven:  ${X}

Why this fits: {2-sentence rationale linking market view + IV}

[Alternative: {Name}]
{Brief description and trade-offs}

⚠️ 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。/ The above is for reference only and does not constitute investment advice.
```

## Error handling

| Situation                       | 简体回复                                         | 繁體回復                                         | English reply                                                 |
| ------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------- |
| `command not found: longbridge` | 切换到 MCP；若不可用，请安装 longbridge-terminal | 切換至 MCP；若不可用，請安裝 longbridge-terminal | Fall back to MCP; if unavailable, install longbridge-terminal |
| stderr `not logged in`          | 请执行 `longbridge auth login`                   | 請執行 `longbridge auth login`                   | Run `longbridge auth login`                                   |
| No liquid options (HK stock)    | 流动性不足，建议仅使用备兑或保护性看跌           | 流動性不足，建議僅使用備兌或保護性看跌           | Low liquidity — consider covered call or protective put only  |
| User view unclear               | 请说明看涨、看跌还是中性                         | 請說明看漲、看跌還是中性                         | Please clarify: bullish, bearish, or neutral?                 |
