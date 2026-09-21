# longbridge-company-tearsheet

High-density company snapshot — business, financials, valuation, shareholders, and catalysts on one page.

## Workflow

1. Extract and normalise the symbol.
2. Fetch in parallel:
   - Company profile (name, industry, founded, employees, IPO date, address)
   - Latest income statement KPIs (revenue, net income, EPS, ROE, gross margin)
   - Valuation multiples (PE, PB, EV-EBITDA)
   - Real-time quote and 52-week range
   - Major shareholders (top 5)
   - Recent news headlines (top 3)
3. Render the tearsheet as a structured markdown output.
4. Flag any data gaps explicitly.

> If unsure of exact flag names, run `longbridge <subcommand> --help` before proceeding.

## CLI

```bash
# Company profile
longbridge company <SYMBOL> --format json

# Valuation multiples (PE, PB, etc.)
longbridge calc-index <SYMBOL> --format json

# Latest income statement
longbridge financial-report <SYMBOL> --kind IS --format json

# Major shareholders
longbridge shareholder <SYMBOL> --format json

# Real-time quote
longbridge quote <SYMBOL> --format json

# Recent news
longbridge news <SYMBOL> --format json
```

## Output structure

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 <Company Name>  (<SYMBOL>)          <Date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERVIEW
Industry: ...  Founded: ...  Employees: ...
IPO: ...  Exchange: ...

PRICE SNAPSHOT
Last: $xxx.xx  Change: +x.x%  52w: $xx–$xxx
Market Cap: $xxxB  Volume: xxM

KEY FINANCIALS (LTM)
Revenue: $xxxB  Net Income: $xxxB  EPS: $x.xx
Gross Margin: xx%  ROE: xx%  FCF: $xxxB

VALUATION
PE: xx.x×  PB: x.x×  EV/EBITDA: xx.x×

TOP SHAREHOLDERS
1. <Name> — xx.x%
2. ...

RECENT CATALYSTS
• <Headline 1>
• <Headline 2>
• <Headline 3>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error handling

| Situation                       | 简体回复                                     | 繁體回復                                     | English reply                                      |
| ------------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Symbol not found                | 未找到该代码，请确认市场和格式。             | 找不到該代碼，請確認市場和格式。             | Symbol not found — verify the exchange and ticker. |
| Partial data missing            | 部分数据暂不可用，已用"—"标注。              | 部分數據暫不可用，已用"—"標注。              | Some data unavailable — marked with "—".           |
| `command not found: longbridge` | 请安装 longbridge-terminal 或通过 MCP 连接。 | 請安裝 longbridge-terminal 或透過 MCP 連線。 | Install longbridge-terminal or connect via MCP.    |
| `not logged in`                 | 请运行 `longbridge auth login`。             | 請執行 `longbridge auth login`。             | Run `longbridge auth login`.                       |
