# longbridge-stock-research

Generates a concise equity research snapshot for a single stock by aggregating analyst consensus, key financials, valuation, 60-day price performance, and recent news — structured like a sell-side research brief.

## Workflow

1. Parse the symbol and normalise to `<CODE>.<MARKET>` (see symbol format below).
2. Run all five CLI commands (parallel is fine):
   - Analyst consensus estimates
   - Income statement (latest 4 quarters or annual)
   - Valuation snapshot
   - Recent news (latest 10 items)
   - 60-day daily candlestick
3. Synthesise into a structured research brief (see Output section).
4. Cite data source as **Longbridge Securities** / **数据来源：长桥证券** / **數據來源：長橋證券**.

## Symbol format

`<CODE>.<MARKET>` — e.g. `NVDA.US`, `700.HK`, `600519.SH`, `300750.SZ`, `D05.SG`. If the market is ambiguous, ask the user.

## CLI

> If you're unsure of exact flag names or defaults, run `longbridge <subcommand> --help` first.

```bash
# Analyst consensus (target price, EPS estimates, rating distribution)
longbridge consensus <SYMBOL> --format json

# Income statement (revenue, net income, EPS — quarterly)
longbridge financial-report <SYMBOL> --kind IS --format json

# Valuation snapshot (PE / PB / PS / EV-EBITDA)
longbridge valuation <SYMBOL> --format json

# Recent news (latest 10 items)
longbridge news <SYMBOL> --format json

# 60-day daily OHLCV
longbridge kline <SYMBOL> --period day --count 60 --format json
```

## Output

Structure the response as a research brief with these sections:

1. **Company snapshot** — name, market, sector, market cap, current price + 60-day change
2. **Financial highlights** — revenue / net income / EPS (last reported + YoY growth)
3. **Valuation** — PE / PB / PS vs industry median (if available)
4. **Analyst consensus** — avg target price, buy/hold/sell count, implied upside
5. **Price performance** — 60-day return, high/low range
6. **Key news** — top 3–5 items with date and one-line summary
7. **Investment considerations** — balanced bull/bear summary (2–3 points each)

## Error handling

| Situation                        | Simplified Chinese                               | Traditional Chinese / English                                                                |
| -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `command not found: longbridge`  | 回退到 MCP；否则提示用户安装 longbridge-terminal | 回退到 MCP；否則提示安裝 / Fall back to MCP; otherwise prompt to install longbridge-terminal |
| `not logged in` / `unauthorized` | 请运行 `longbridge auth login`                   | 請運行 `longbridge auth login` / Run `longbridge auth login`                                 |
| Invalid symbol / `param_error`   | 请确认股票代码格式，例如 NVDA.US                 | 請確認股票代碼格式 / Check symbol format e.g. NVDA.US                                        |
| Other stderr                     | 原样展示错误信息，不重试                         | 原樣展示錯誤，不重試 / Surface verbatim, no silent retry                                     |
