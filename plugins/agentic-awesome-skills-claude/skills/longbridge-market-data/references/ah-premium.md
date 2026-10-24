# longbridge-ah-premium

A/H premium ratio for dual-listed Mainland-Chinese companies — historical kline or today's intraday curve.

## Symbol format

Always pass the **HK side** (`<CODE>.HK`) of the dual-listed pair. The Longbridge API maps internally to the A-share counterpart. Common pairs:

| Company               | HK        | A-share     |
| --------------------- | --------- | ----------- |
| 工商银行 / ICBC       | `1398.HK` | `601398.SH` |
| 建设银行 / CCB        | `939.HK`  | `601939.SH` |
| 中国平安 / Ping An    | `2318.HK` | `601318.SH` |
| 招商银行 / CMB        | `3968.HK` | `600036.SH` |
| 中国人寿 / China Life | `2628.HK` | `601628.SH` |

If the user gives an A-share symbol, translate to the HK side. If the stock is not dual-listed (e.g. `700.HK`), the API returns no data — report that, don't retry.

## Subcommands

> Run `longbridge ah-premium --help` (and `longbridge ah-premium intraday --help`) if unsure of current flags.

| CLI command                                                                 | Returns                              |
| --------------------------------------------------------------------------- | ------------------------------------ |
| `longbridge ah-premium <SYMBOL> [--kline-type T] [--count N] --format json` | Historical premium ratio kline       |
| `longbridge ah-premium intraday <SYMBOL> --format json`                     | Today's intraday premium time series |

`--kline-type`: `1m` / `5m` / `15m` / `30m` / `60m` / `day` (default) / `week` / `month` / `year`. `--count` defaults to 100.

## Workflow

1. Identify the dual-listed pair; pass the **HK** symbol.
2. Decide mode:
   - "近一年 / last year走势" → kline `--kline-type day --count 250`
   - "近一月 / past month" → kline `--kline-type day --count 22`
   - "今天 / 当日 / intraday" → `intraday` subcommand
3. Run the command, render the time series (table or summary: latest premium %, range, trend).
4. Cite source as **Longbridge Securities** / **数据来源:长桥证券** / **數據來源:長橋證券**.

## CLI examples

```bash
# Default daily kline (100 days)
longbridge ah-premium 939.HK                                       --format json

# Last year of daily premium
longbridge ah-premium 1398.HK --kline-type day --count 250         --format json

# Last 12 weeks
longbridge ah-premium 2318.HK --kline-type week --count 12         --format json

# Today's intraday premium curve
longbridge ah-premium intraday 939.HK                              --format json
```

## Output

Each row carries a timestamp and provider-defined premium ratio. Verify numerator/denominator, FX direction and percent-versus-ratio units from the returned schema before labeling discount/premium; A-over-H and H-over-A conventions have opposite signs. If unavailable, show the field unchanged and state that the convention is unresolved.

## Error handling

| Situation                             | LLM response                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| Shell `command not found: longbridge` | Fall back to MCP if configured; otherwise tell the user to install longbridge-terminal. |
| Empty array                           | "No A/H premium data — verify the dual-listing, coverage, date and entitlements before inferring why data is absent."               |
| stderr `param_error`                  | Verify the symbol is an HK ticker of a dual-listed pair.                                |
| Other stderr                          | Surface verbatim.                                                                       |
