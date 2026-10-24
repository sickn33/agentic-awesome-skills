# longbridge-kline

Historical candlesticks and today's intraday curve for Longbridge-supported securities (HK / US / A-share / Singapore). Does **not** support options, warrants, or indices — defer to `longbridge-derivatives` (derivatives) or `longbridge-quote` (indices).

## Subcommands

> Run `longbridge kline --help` to confirm current period values, defaults, and aliases.

| CLI command                                                                                        | Use when                                                                           |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `longbridge kline <SYMBOL> --period <P> --count <N> --format json`                                 | Latest N candles. Periods: `1m / 5m / 15m / 30m / 1h / day / week / month / year`. |
| `longbridge kline history <SYMBOL> --start YYYY-MM-DD --end YYYY-MM-DD --period <P> --format json` | OHLCV across an explicit date range (sub-subcommand).                              |
| `longbridge intraday <SYMBOL> --format json`                                                       | Today's per-minute curve (price + volume + avg_price).                             |

Period aliases: `minute=1m`, `hour=1h`, `d/1d=day`, `w=week`, `m/1mo=month`, `y=year`. `--adjust none` (default) or `--adjust forward` for 前复权 / 前復權.

## Workflow

1. Resolve the symbol to `<CODE>.<MARKET>` (see `longbridge-quote` for the rules).
2. Pick the form:
   - Explicit start/end dates → `kline history`.
   - "Today" / "intraday" → `intraday`.
   - Otherwise → `kline` with sensible defaults (`--period day --count 100`).
3. Map natural-language windows to (`period`, `count`). Examples: "last 7 trading bars" → `day,7`, "approximately one trading year" → `day,252`, "月 K" → `month,100`.
Use explicit dates for calendar weeks/years; trading-bar counts do not equal calendar duration. Record adjustment mode and incomplete current bars.
4. Call the Longbridge CLI directly (preferred) or fall back to MCP.
5. Translate datasets into prose (range high / low, net move, volume note); use ▲ / ▼ for direction. Cite **Longbridge Securities** / **数据来源:长桥证券** / **數據來源:長橋證券**.

## CLI

```bash
longbridge kline         NVDA.US --period day --count 100             --format json
longbridge kline         700.HK  --period 5m  --count 100 --adjust forward --format json
longbridge kline history NVDA.US --start 2025-01-01 --end 2025-12-31  --format json
longbridge intraday      700.HK                                       --format json
```

## Output

`longbridge kline ... --format json` returns a list of OHLCV rows:

```json
[
  {
    "time": "...",
    "open": "...",
    "high": "...",
    "low": "...",
    "close": "...",
    "volume": "...",
    "turnover": "..."
  }
]
```

`intraday` rows are `{time, price, volume, turnover, avg_price}`.

## Error handling

If `longbridge` is not installed, the shell returns a `command not found` error → fall back to MCP (see below) or tell the user to install longbridge-terminal. If `longbridge` prints `Error: ...` to stderr, surface the message to the user — common causes:

- `Error: not logged in` / `unauthorized` → user runs `longbridge auth login`.
- `Error: invalid symbol` / `param_error` → re-check the `<CODE>.<MARKET>` format.
