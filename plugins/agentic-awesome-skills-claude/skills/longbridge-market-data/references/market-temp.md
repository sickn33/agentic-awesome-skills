# longbridge-market-temp

Market-level state: open / close, calendar, sentiment temperature. Symbol-level questions belong in `longbridge-quote`.

## Subcommands

> The `MARKET` argument is **positional** (not a `--market` flag). Run `longbridge <subcommand> --help` to confirm.

| CLI command                                                      | Returns                                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `longbridge market-temp <MARKET> --format json`                  | Today's market temperature (0–100). Add `--history --start --end` for a time series. Default market = `HK`. |
| `longbridge trading session --format json`                       | Trading sessions for all markets (open / close times).                                                      |
| `longbridge trading days <MARKET> [--start --end] --format json` | Trading day calendar with half-days. Default market = `HK`.                                                 |

## Market mapping

LLM maps colloquial names to the positional `<MARKET>`:

| User says                              | `<MARKET>`                 |
| -------------------------------------- | -------------------------- |
| 美股 / US / Nasdaq / S&P / Dow         | `US`                       |
| 港股 / HK / Hang Seng / 恒生 / 恆生    | `HK`                       |
| A 股 / 沪 / 深 / 上证 / 深证 / SH / SZ | `CN` (aliases: `SH`, `SZ`) |
| 新加坡 / SG / Straits / 海峡 / 海峽    | `SG`                       |

`trading session` does not take a market argument; it returns all markets in one call.

## Workflow

1. Pick the subcommand (table above).
2. Resolve the positional `<MARKET>` if needed.
3. For "is the market open?" — prefer the returned `market-status`, and reconcile its timestamp with `trading days` (holidays/half-days), sessions and the exchange time zone. A wall-clock weekday comparison alone is insufficient.
4. Call the Longbridge CLI directly (preferred) or fall back to MCP.
5. Treat the following temperature bands as illustrative labels, not calibrated forecasts or trade signals: 0–30 _偏空_, 30–50 _中性偏空_, 50–70 _中性偏多_, 70–100 _偏多_ (translate into the user's language).

## CLI

```bash
longbridge market-temp     HK                                          --format json
longbridge trading session                                              --format json
longbridge trading days    US --start 2026-04-28 --end 2026-05-31       --format json
longbridge market-temp     HK --history --start 2026-01-01 --end 2026-04-28 --format json
```

## Output

- `market-temp` (snapshot): single object with the temperature value. With `--history`, an array of historical points.
- `trading session`: array spanning all markets.
- `trading days`: `{trading_days, half_trading_days}` arrays for the selected market.

## Error handling

If `longbridge` is missing, fall back to MCP. Other stderr messages get relayed verbatim to the user.
