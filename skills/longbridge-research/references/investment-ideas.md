# longbridge-investment-ideas

Surfaces actionable investment ideas through a multi-lens screening process: value, momentum, fundamental improvement, and thematic catalysts — outputting a prioritised candidate list with brief rationale for each idea.

## Workflow

1. Clarify parameters with the user if not provided:
   - **Market**: US / HK / A-share / SG (or multiple)
   - **Theme / sector** (optional): e.g. AI, EV, healthcare, energy
   - **Style**: value / growth / momentum / contrarian / short ideas
2. Fetch the relevant universe (index constituents or sector ETF).
3. For top candidates, fetch valuation indices and recent 60-day price momentum.
4. Apply the selected screening lens (see below) to rank candidates.
5. For top 5–8 ideas, fetch news to validate the narrative.
6. Output a ranked candidate list with rationale.

## Screening lenses

| Lens                    | Signal                                        | CLI data                                   |
| ----------------------- | --------------------------------------------- | ------------------------------------------ |
| Value                   | Low PE / PB vs industry median                | `longbridge industry-valuation`            |
| Momentum                | Top 60-day price return in universe           | `longbridge kline --period day --count 60` |
| Fundamental improvement | Revenue acceleration / margin expansion (QoQ) | `longbridge financial-report --kind IS`    |
| Thematic                | Recent policy / product catalyst in news      | `longbridge news`                          |

## CLI

> If you're unsure of exact flag names or defaults, run `longbridge <subcommand> --help` first.

```bash
# Fetch universe (index constituents)
longbridge constituent <INDEX_SYMBOL> --format json

# Valuation indices for screening (PE, PB, momentum)
longbridge calc-index <SYMBOL> --format json

# 60-day daily price for momentum calculation
longbridge kline <SYMBOL> --period day --count 60 --format json

# News for narrative validation
longbridge news <SYMBOL> --format json
```

## Output

**Screening parameters**: market, theme, style lens, date

**Idea candidate table**:

| Rank | Symbol  | Company | Market Cap | Lens                | Key Signal                  | Rationale |
| ---- | ------- | ------- | ---------- | ------------------- | --------------------------- | --------- |
| 1    | NVDA.US | NVIDIA  | $2.5T      | Momentum + Thematic | +40% in 60d; AI capex cycle | ...       |

For each top idea, add a one-paragraph 分析摘要 / Analysis summary covering:

- 近期催化剂或关注事项 / Recent catalysts or watchpoints（供参考）
- 关键指标与事件 / Key metrics and events
- Key risk (one-liner bear case)

> 以上内容仅供参考，不构成投资建议。投资决策请结合自身风险承受能力独立判断。/ The above is for reference only and does not constitute investment advice.

## Error handling

| Situation                        | Simplified Chinese                           | Traditional Chinese / English                                     |
| -------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP；否则提示安装 longbridge-terminal | 回退到 MCP；否則提示安裝 / Fall back to MCP; prompt to install    |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`               | 請運行 `longbridge auth login` / Run `longbridge auth login`      |
| No market or theme specified     | 请告知目标市场和投资风格                     | 請告知目標市場和投資風格 / Please specify target market and style |
| Other stderr                     | 原样展示错误，不重试                         | 原樣展示，不重試 / Surface verbatim, no silent retry              |
