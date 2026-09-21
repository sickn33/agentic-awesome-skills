# longbridge-thesis-tracker

Checks whether an investment thesis for a given stock is intact by pulling the latest financial data, analyst revisions, news, and regulatory filings, then rendering a structured verdict.

## Workflow

1. Ask the user to state their thesis pillars if not already provided (e.g. _"AI capex supercycle"_, _"margin expansion to 30%"_, _"China re-opening"_).
2. Map each pillar to one or more measurable data points.
3. Run CLI commands to fetch the latest evidence.
4. For each pillar, render: **Still intact / Weakened / Broken** with supporting data.
5. Overall verdict: thesis confidence score (High / Medium / Low) + recommended action.

## CLI

> If you're unsure of exact flag names or defaults, run `longbridge <subcommand> --help` first.

```bash
# Recent news and regulatory filings (catalyst/risk updates)
longbridge news <SYMBOL> --format json

# Latest income statement (revenue growth, margin trends)
longbridge financial-report <SYMBOL> --kind IS --format json

# Analyst consensus (EPS revisions, target price changes, rating)
longbridge consensus <SYMBOL> --format json

# SEC / HKEx regulatory filings (material disclosures)
longbridge filing <SYMBOL> --format json
```

## Output

Structure the tracker output as follows:

**Header**: Symbol, company name, today's date, thesis check date

**Thesis pillars status table**:

| Pillar                    | Data Point         | Last Value | vs Expectation | Status   |
| ------------------------- | ------------------ | ---------- | -------------- | -------- |
| e.g. Revenue acceleration | YoY revenue growth | +24%       | >20% target    | Intact   |
| e.g. Margin expansion     | Gross margin %     | 61%        | >65% target    | Weakened |

**Catalyst tracking**:

- List of expected catalysts, whether they have materialised, and market reaction

**Risk monitoring**:

- Key risks flagged at thesis initiation and current status

**Overall verdict**:

> **Thesis confidence: Medium** — 2 of 4 pillars intact. Core AI-driven revenue growth on track; margin expansion lagging. No thesis-breaking events in filings. Suggest hold and monitor next earnings.

## Error handling

| Situation                        | Simplified Chinese                           | Traditional Chinese / English                                  |
| -------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP；否则提示安装 longbridge-terminal | 回退到 MCP；否則提示安裝 / Fall back to MCP; prompt to install |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`               | 請運行 `longbridge auth login` / Run `longbridge auth login`   |
| No thesis pillars provided       | 请告知您的核心买入逻辑（2–5条）              | 請提供核心買入邏輯 / Please state 2–5 thesis pillars           |
| `filing` subcommand unavailable  | 跳过监管文件检索，标注缺失                   | 跳過文件檢索，標注缺失 / Skip filing fetch, flag as missing    |
| Other stderr                     | 原样展示错误，不重试                         | 原樣展示，不重試 / Surface verbatim, no silent retry           |
