# longbridge-volatility-strategy

Computes 20-day and 60-day historical volatility (HV) for a stock, ranks the current level as a percentile over the trailing year, identifies the vol regime (low / normal / high), and recommends a corresponding options strategy.

## Workflow

1. Fetch 252 daily candles (≈ 1 year): `longbridge kline <SYMBOL> --period day --count 252 --format json`
2. Compute daily log-returns: `r_t = ln(close_t / close_{t-1})`
3. HV20 = annualised std of last 20 returns × √252; HV60 = last 60 returns × √252
4. HV percentile: rank current HV20 among all rolling-20 HV values in the 252-day window
5. Regime:
   - HV percentile < 25% → 历史波动率处于低位区间，Long vega 策略（如跨式/宽跨式）在此环境下具有较低权利金成本 / HV at low percentile — long vega strategies (straddle/strangle) tend to have lower premium cost in this environment
   - HV percentile > 75% → 历史波动率处于高位区间，Short vega 策略（如铁鹰式）在此环境下权利金收入较高 / HV at high percentile — short vega strategies (iron condor) tend to collect higher premium in this environment
   - Otherwise → Neutral — vol is within normal historical range
6. Output the table below and a 2–3 sentence description of the current vol environment

All computation is done by the LLM in Python (inline, no scripts/ needed for simple numpy/pandas math). If the user's environment does not have numpy, approximate HV using the close-to-close Parkinson estimate.

## CLI

```bash
# Run --help first to confirm flag names
longbridge kline --help

# Fetch 252 daily candles
longbridge kline <SYMBOL> --period day --count 252 --format json
```

The JSON array returns rows with fields `time`, `open`, `high`, `low`, `close`, `volume`.

## Output

| Metric        | 简体           | 繁體           | English                   |
| ------------- | -------------- | -------------- | ------------------------- |
| HV20          | 20日历史波动率 | 20日歷史波動率 | 20-day HV                 |
| HV60          | 60日历史波动率 | 60日歷史波動率 | 60-day HV                 |
| HV Percentile | 波动率百分位   | 波動率百分位   | HV Percentile             |
| Regime        | 波动率状态     | 波動率狀態     | Vol Regime                |
| Signal        | 波动率环境参考 | 波動率環境參考 | Vol Environment Reference |

Present results as a compact table followed by a description of the current vol environment and relevant strategy characteristics. Cite data source as **Longbridge Securities** / **数据来源：长桥证券** / **數據來源：長橋證券**.

> 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。/ The above is for reference only and does not constitute investment advice.

## Error handling

| Situation                        | 简体回复                                  | 繁體回復                                  | English reply                                               |
| -------------------------------- | ----------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP 或提示安装 longbridge-terminal | 回退到 MCP 或提示安裝 longbridge-terminal | Fall back to MCP or ask user to install longbridge-terminal |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`            | 請執行 `longbridge auth login`            | Run `longbridge auth login`                                 |
| Insufficient data (< 60 candles) | 数据不足，无法计算60日波动率              | 數據不足，無法計算60日波動率              | Not enough data for HV60                                    |
| Other stderr                     | 直接显示原始错误                          | 直接顯示原始錯誤                          | Surface verbatim                                            |
