# longbridge-smallcap-growth

Screens for overlooked small/mid-cap high-growth stocks across US, HK, and A-share markets using quantitative filters (market cap, revenue growth, ROE) and qualitative overlays (sector focus, 专精特新 category for A-shares).

## Default screening criteria

| Criterion               | Default threshold      | User-adjustable |
| ----------------------- | ---------------------- | --------------- |
| Market cap (US/HK)      | < USD 10B              | Yes             |
| Market cap (A-share)    | < CNY 50B              | Yes             |
| Revenue YoY growth      | > 30%                  | Yes             |
| ROE                     | > 15%                  | Yes             |
| Institutional ownership | Low (qualitative flag) | Note only       |

Ask the user if they want to adjust any threshold before running.

## Workflow

1. Clarify market (US / HK / A-share / all) and any sector preference.
2. Fetch index constituents for the relevant small/mid-cap indices (e.g. a provider-supported Russell 2000 index (IWM.US is an ETF and its holdings are not an identical index snapshot), `399006.SZ` for ChiNext, `399005.SZ` for SME Board).
3. For each constituent, fetch market cap via `calc-index` and filter by size.
4. For size-passing candidates, fetch the latest income statement to check revenue growth.
5. Further filter by ROE from the balance sheet / financial-report data.
6. Return the top 10 candidates ranked by revenue growth rate, with a brief profile for each.

## CLI

> If you're unsure of exact flag names or defaults, run `longbridge <subcommand> --help` first.

```bash
# Small/mid-cap index constituents
longbridge constituent <INDEX_SYMBOL> --format json
# Examples: IWM.US (Russell 2000), 399006.SZ (ChiNext), a verified small/mid-cap index; HSI.HK is not a small-cap universe

# Market cap and valuation indices per symbol
longbridge calc-index <SYMBOL> --format json

# Latest income statement (revenue growth)
longbridge financial-report <SYMBOL> --kind IS --format json

# News / recent catalysts for top candidates
longbridge news <SYMBOL> --format json
```

## Output

**Screening parameters**: market, sector, market cap threshold, revenue growth threshold, ROE threshold

**Top candidates table**:

| Rank | Symbol | Company | Market Cap | Rev Growth YoY | ROE | Sector | Thesis |
| ---- | ------ | ------- | ---------- | -------------- | --- | ------ | ------ |

For each top 5 candidate, include a brief (3–4 sentence) investment thesis:

- Business model and competitive advantage
- Growth driver and runway
- Key risk
- Catalyst to watch

**A-share note**: For 专精特新 (specialized, sophisticated, distinctive, innovative) classification, note if the company holds a national-level 专精特新小巨人 designation when mentioned in filings/news.

**Disclaimer**: Small-cap stocks carry higher liquidity and volatility risk. Not a buy recommendation.

## Error handling

| Situation                        | Simplified Chinese                           | Traditional Chinese / English                                  |
| -------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP；否则提示安装 longbridge-terminal | 回退到 MCP；否則提示安裝 / Fall back to MCP; prompt to install |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`               | 請運行 `longbridge auth login` / Run `longbridge auth login`   |
| No market specified              | 请告知目标市场（美股/港股/A股）              | 請告知目標市場 / Please specify market (US/HK/A-share)         |
| Other stderr                     | 原样展示错误，不重试                         | 原樣展示，不重試 / Surface a redacted error summary, no silent retry           |
