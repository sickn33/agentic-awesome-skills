# longbridge-competitive-analysis

Constructs a competitive landscape analysis for a company, covering Porter five-forces dynamics, peer financial and valuation benchmarking, moat assessment, and disruptor identification.

## Workflow

1. Parse the anchor company symbol and normalise to `<CODE>.<MARKET>`.
2. If the user provides peer symbols, use them; otherwise identify top 3–5 peers from the industry-valuation data.
3. Fetch comparative financials and valuation for the anchor + peers.
4. Fetch recent news for competitive dynamics (M&A, product launches, pricing moves).
5. Synthesise into a competitive analysis report (see Output section).

## CLI

> If you're unsure of exact flag names or defaults, run `longbridge <subcommand> --help` first.

```bash
# Industry-level valuation (includes peer list and sector medians)
longbridge industry-valuation <SYMBOL> --format json

# Income statement for anchor + each peer (revenue growth, margins)
longbridge financial-report <SYMBOL> --kind IS --format json

# Recent competitive news (product launches, pricing, M&A)
longbridge news <SYMBOL> --format json

# Valuation snapshot per company
longbridge valuation <SYMBOL> --format json
```

## Output

Structure the competitive analysis report:

**1. Company profile** — anchor company name, sector, primary market, brief business description

**2. Competitive universe** — list of identified peers with rationale for inclusion

**3. Porter five-forces summary**:

| Force                         | Intensity (High/Med/Low) | Evidence |
| ----------------------------- | ------------------------ | -------- |
| Threat of new entrants        |                          |          |
| Bargaining power of suppliers |                          |          |
| Bargaining power of buyers    |                          |          |
| Threat of substitutes         |                          |          |
| Rivalry among incumbents      |                          |          |

**4. Peer benchmarking table**:

| Company         | Symbol | Market Cap | Rev Growth | Gross Margin | PE  | PB  | ROE |
| --------------- | ------ | ---------- | ---------- | ------------ | --- | --- | --- |
| Anchor          |        |            |            |              |     |     |     |
| Peer 1          |        |            |            |              |     |     |     |
| ...             |        |            |            |              |     |     |     |
| Industry median | —      | —          |            |              |     |     |     |

**5. Moat assessment**:

- **Type**: Network effects / Cost advantages / Switching costs / Intangibles / Efficient scale
- **Strength**: Wide / Narrow / None
- **Durability**: 1–3 year evidence

**6. Disruptor watch**:

- List 2–3 potential disruptors (startups, adjacent-market entrants, technology shifts) with brief rationale

**7. Competitive positioning verdict**:

- Overall competitive position: Leader / Strong / Moderate / Weak
- Key competitive advantages and vulnerabilities

## Error handling

| Situation                        | Simplified Chinese                           | Traditional Chinese / English                                     |
| -------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP；否则提示安装 longbridge-terminal | 回退到 MCP；否則提示安裝 / Fall back to MCP; prompt to install    |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`               | 請運行 `longbridge auth login` / Run `longbridge auth login`      |
| Invalid symbol / `param_error`   | 请确认股票代码，如 NVDA.US                   | 請確認股票代碼 / Check symbol format e.g. NVDA.US                 |
| Peer data partially unavailable  | 展示可用数据并标注缺失字段                   | 展示可用資料並標注缺失 / Show available data, flag missing fields |
| Other stderr                     | 原样展示错误，不重试                         | 原樣展示，不重試 / Surface verbatim, no silent retry              |
