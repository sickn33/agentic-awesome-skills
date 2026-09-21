# longbridge-coverage-initiation

Generates a structured initiating-coverage report framework for a single listed company, following a five-step institutional workflow.

## Workflow

Five-step coverage initiation process:

1. **Company overview** — business description, history, key products/services, geographic exposure
2. **Industry positioning** — sector dynamics, competitive landscape, market share, tailwinds/headwinds
3. **Financial modelling** — historical P&L, balance sheet health, free cash flow, key ratios
4. **Valuation analysis** — current multiples vs peers vs historical range, DCF considerations, target price rationale
5. **Investment conclusion** — rating (Buy / Hold / Sell), 12-month price target, key catalysts, key risks

Run these CLI commands (parallel is fine):

```bash
# Company profile (business overview, sector, executives)
longbridge company <SYMBOL> --format json

# Full financial report (IS + BS + CF — all periods available)
longbridge financial-report <SYMBOL> --kind ALL --format json

# Industry-level valuation comparison
longbridge industry-valuation <SYMBOL> --format json

# Recent news and regulatory filings for context
longbridge news <SYMBOL> --format json
```

> If you're unsure of exact flag names or defaults, run `longbridge <subcommand> --help` first.

## Symbol format

`<CODE>.<MARKET>` — e.g. `NVDA.US`, `700.HK`, `600519.SH`. If the market is ambiguous, ask the user.

## Output

Structure the output as a formatted research report with clearly labelled sections:

**Cover page metadata**: Symbol, company name, date, analyst note (LLM-generated)

**Section 1 — Company overview**: 2–3 paragraphs on business model, history, geography

**Section 2 — Industry positioning**: market size, growth drivers, Porter five-forces summary, competitive moat assessment

**Section 3 — Financial highlights** (table):

| Metric         | Year -2 | Year -1 | LTM |
| -------------- | ------- | ------- | --- |
| Revenue        |         |         |     |
| Net Income     |         |         |     |
| EPS            |         |         |     |
| Gross Margin % |         |         |     |
| ROE            |         |         |     |

**Section 4 — Valuation**:

- Current PE / PB / PS vs industry median
- Historical percentile (if available)
- Implied price target rationale

**Section 5 — Investment conclusion**:

- Rating, price target, upside/downside
- Top 3 catalysts (bull case)
- Top 3 risks (bear case)

## Error handling

| Situation                         | Simplified Chinese                           | Traditional Chinese / English                                                      |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `command not found: longbridge`   | 回退到 MCP；否则提示安装 longbridge-terminal | 回退到 MCP；否則提示安裝 / Fall back to MCP; prompt to install longbridge-terminal |
| `not logged in` / `unauthorized`  | 请运行 `longbridge auth login`               | 請運行 `longbridge auth login` / Run `longbridge auth login`                       |
| `company` subcommand missing data | 从其他子命令补充可用信息，标注缺失字段       | 從其他命令補充，標注缺失 / Supplement from other commands, flag missing fields     |
| Other stderr                      | 原样展示错误，不重试                         | 原樣展示，不重試 / Surface verbatim, no silent retry                               |
