# longbridge-post-investment

Quarterly / monthly post-investment monitoring — track KPIs, flag deviations, and generate action recommendations.

## Workflow

1. Extract symbol(s) from the prompt.
2. Fetch latest financial results: revenue, gross margin, net income, EPS, FCF.
3. Fetch analyst consensus for the same period (expected vs actual).
4. Fetch recent price performance (60 days).
5. Fetch recent news for qualitative context.
6. For each KPI: compare actual vs consensus; flag as Beat / In-Line / Miss with magnitude.
7. Assess price action relative to the fundamental outcome.
8. Generate monitoring report with action recommendation.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Latest income statement
longbridge financial-report <SYMBOL> --kind IS --format json

# Analyst consensus (expected vs actual)
longbridge consensus <SYMBOL> --format json

# Recent news and management commentary
longbridge news <SYMBOL> --format json

# Price performance (60-day)
longbridge kline <SYMBOL> --period day --count 60 --format json
```

## Output structure

```
# Post-Investment Monitor: <Company> (<SYMBOL>)
Review date: <today>  Period: <quarter/month>

## KPI Scorecard
| KPI             | Expected   | Actual     | Δ      | Signal  |
|-----------------|------------|------------|--------|---------|
| Revenue         |            |            |        | ✓ Beat  |
| Gross Margin    |            |            |        | ✗ Miss  |
| EPS             |            |            |        | ~ In-line |
| FCF             |            |            |        |         |

## Price Action
Entry price: $xx.xx  Current: $xx.xx  Return: ±x.x%
vs market: ±x.x%  vs sector: ±x.x%

## Qualitative Check
Management tone, guidance revision, key risks materialised / resolved.

## 指标变化摘要 / Key Metrics Update

| 维度 | 预期 | 实际 | 偏差 |
|---|---|---|---|
| (根据实际分析填写) | | | |

> 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。
> The above is for reference only and does not constitute investment advice. Investment decisions should be made based on your own risk tolerance.

Rationale: ...
Next review trigger: ...
```

## Error handling

| Situation                       | 简体回复                                     | 繁體回復                                     | English reply                                                           |
| ------------------------------- | -------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| No recent earnings data         | 暂无最新财报数据，无法完成 KPI 对比。        | 暫無最新財報數據，無法完成 KPI 對比。        | No recent earnings data available — KPI comparison cannot be completed. |
| Consensus data unavailable      | 分析师预期数据不可用，仅展示实际数据。       | 分析師預期數據不可用，僅展示實際數據。       | Consensus data unavailable — showing actuals only.                      |
| Symbol not found                | 未找到该代码，请确认市场和格式。             | 找不到該代碼，請確認市場和格式。             | Symbol not found — verify the exchange and ticker.                      |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。 | 請安裝 longbridge-terminal 或透過 MCP 連線。 | Install longbridge-terminal or connect via MCP.                         |
| `not logged in`                 | 请运行 `longbridge auth login`。             | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                                            |
