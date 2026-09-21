# longbridge-investment-proposal

Generate a structured investment proposal for a single stock opportunity.

## Workflow

1. Extract the target symbol; normalise to `<CODE>.<MARKET>`.
2. Gather data in parallel:
   - Company profile (name, business, employees, founding, IPO date)
   - Latest financials (revenue, net income, EPS, ROE, gross margin, FCF)
   - Valuation multiples (PE, PB, EV-EBITDA, PEG)
   - Analyst consensus (target price, rating distribution)
   - Recent news and catalysts
3. Synthesise into the proposal structure below.
4. Flag data gaps explicitly rather than fabricating figures.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Company profile
longbridge company <SYMBOL> --format json

# Financial statements
longbridge financial-report <SYMBOL> --kind ALL --format json

# Valuation multiples
longbridge valuation <SYMBOL> --format json

# Analyst consensus
longbridge consensus <SYMBOL> --format json

# Recent news
longbridge news <SYMBOL> --format json
```

## Output structure

```
# Investment Proposal: <Company Name> (<SYMBOL>)
Date: <today>

## Executive Summary
One-paragraph verdict: Buy / Hold / Avoid, price target, key thesis.

## Company Overview
Business description, market, employees, listing date.

## Investment Thesis
1. <Core point 1>
2. <Core point 2>
3. <Core point 3>
[4–5 if applicable]

## Financial Analysis
| Metric        | LTM     | YoY Δ |
|---------------|---------|--------|
| Revenue       |         |        |
| Net Income    |         |        |
| EPS           |         |        |
| Gross Margin  |         |        |
| ROE           |         |        |
| FCF           |         |        |

## Valuation
| Multiple   | Current | Industry Median | Assessment |
|------------|---------|-----------------|------------|
| PE         |         |                 |            |
| PB         |         |                 |            |
| EV/EBITDA  |         |                 |            |

Target price rationale and upside / downside.

## Catalysts & Timeline
- Near-term (0–3 months): ...
- Medium-term (3–12 months): ...

## Risk Factors
- <Risk 1>
- <Risk 2>
- <Risk 3>

## Position Recommendation
Suggested entry range, position size, stop-loss level, review trigger.
```

## Error handling

| Situation                       | 简体回复                                     | 繁體回復                                     | English reply                                             |
| ------------------------------- | -------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| Symbol not found                | 未找到该代码，请确认市场和代码格式。         | 找不到該代碼，請確認市場和代碼格式。         | Symbol not found — verify the exchange and ticker.        |
| Financials unavailable          | 财务数据暂不可用，提案中该部分留空。         | 財務數據暫不可用，提案中該部分留空。         | Financials unavailable — that section will be left blank. |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。 | 請安裝 longbridge-terminal 或透過 MCP 連線。 | Install longbridge-terminal or connect via MCP.           |
| `not logged in`                 | 请运行 `longbridge auth login`。             | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                              |
