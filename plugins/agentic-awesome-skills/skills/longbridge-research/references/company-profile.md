# longbridge-company-profile

Professional pitch-book company profile page — positioning, financials, shareholders, and catalysts formatted for investment-banking presentations.

## Workflow

1. Extract and normalise the symbol (e.g. `TSLA.US`, `700.HK`).
2. Fetch in parallel:
   - Company profile (business description, industry, founded, employees, IPO)
   - Income statement KPIs (revenue, EBITDA, net income, EPS — last 3 years)
   - Valuation multiples (PE, PB, EV, EV/EBITDA)
   - 1-year daily price history (OHLCV, for trend description)
   - Executive team (CEO, CFO, key officers)
   - Major shareholders (top 5)
   - Latest news / catalysts (top 5)
3. Synthesise a positioning quadrant narrative (market position vs. growth rate).
4. Render the profile in structured markdown — headline block, financial matrix, shareholder table, catalyst bullets.
5. Flag any data gaps with "—".

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Company profile (description, industry, IPO, address)
longbridge company <SYMBOL> --format json

# Income statement (revenue, net income, EPS)
longbridge financial-report <SYMBOL> --kind IS --format json

# Valuation multiples (PE, PB, EV/EBITDA)
longbridge calc-index <SYMBOL> --format json

# 1-year daily OHLCV for trend description
longbridge kline <SYMBOL> --period day --count 252 --format json

# Executive team
longbridge executive <SYMBOL> --format json

# Major shareholders
longbridge shareholder <SYMBOL> --format json

# Recent news / catalysts
longbridge news <SYMBOL> --format json
```

## Output structure

```
╔══════════════════════════════════════════════════════╗
  <Company Name>  (<SYMBOL>)        [Sector / Industry]
╚══════════════════════════════════════════════════════╝

COMPANY OVERVIEW
<2–3 sentence business description>
Founded: ...  Employees: ...  HQ: ...  IPO: ...

POSITIONING
Market Position: [Leader / Challenger / Niche]
Growth Profile:  [High / Moderate / Mature]
Competitive Moat: <key differentiator>

FINANCIAL MATRIX
Year        Revenue    EBITDA    Net Income   EPS
FY-2         $xxxB     $xxxB      $xxxB      $x.xx
FY-1         $xxxB     $xxxB      $xxxB      $x.xx
LTM          $xxxB     $xxxB      $xxxB      $x.xx

VALUATION
PE: xx.x×   PB: x.x×   EV: $xxxB   EV/EBITDA: xx.x×

PRICE PERFORMANCE (1Y)
Range: $xx – $xxx   Current: $xxx   Change: +x.x%
Trend: <brief narrative of price trajectory>

KEY MANAGEMENT
CEO: <Name>   CFO: <Name>   Other: ...

MAJOR SHAREHOLDERS
1. <Name> — xx.x%
2. ...

RECENT CATALYSTS
• <Catalyst 1>
• <Catalyst 2>
• <Catalyst 3>
```

## Error handling

| Situation                       | 简体回复                                     | 繁體回復                                     | English reply                                      |
| ------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Symbol not found                | 未找到该代码，请确认市场和格式。             | 找不到該代碼，請確認市場和格式。             | Symbol not found — verify the exchange and ticker. |
| Partial data missing            | 部分数据暂不可用，已用"—"标注。              | 部分數據暫不可用，已用"—"標注。              | Some data unavailable — marked with "—".           |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。 | 請安裝 longbridge-terminal 或透過 MCP 連線。 | Install longbridge-terminal or connect via MCP.    |
| `not logged in`                 | 请运行 `longbridge auth login`。             | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                       |
