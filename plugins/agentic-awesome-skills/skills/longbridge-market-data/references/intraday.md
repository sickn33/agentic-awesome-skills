# intraday

```
Intraday minute-by-minute price and volume lines for today (or a historical date)

Returns: timestamp, price, volume, turnover, `avg_price`. Use `--session all` to include pre-market and post-market lines. Use `--date YYYYMMDD` to fetch a historical day's intraday data. Example: longbridge intraday TSLA.US Example: longbridge intraday TSLA.US --session all Example: longbridge intraday TSLA.US --date 20240115

Usage: longbridge intraday [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --session <SESSION>
          Trade session filter: `intraday` (default) | `all` (includes pre/post market)

          [default: intraday]

      --date <DATE>
          Historical date in YYYYMMDD format (omit for today's live data)

      --format <FORMAT>
          Output format: 'pretty' for human-readable, 'json' for AI agents and scripting

          [default: pretty]
          [possible values: table, json]

  -v, --verbose
          Print verbose request info (host, elapsed) to stderr, prefixed with `*` like curl -v

      --lang <LANG>
          Language for content fetched from longbridge.com: zh-CN or en. Defaults to system LANG env var, then en

  -h, --help
          Print help (see a summary with '-h')
```

## Usage

```bash
# Run with JSON output for AI agents
longbridge intraday 700.HK --format json

# See all options
longbridge intraday --help
```
