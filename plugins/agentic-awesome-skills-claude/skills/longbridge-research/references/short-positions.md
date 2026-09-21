# short-positions

```
Short selling open interest — undisclosed short positions held over time

Supports US and HK markets; market is inferred from the symbol suffix.

US: bi-weekly FINRA short interest data (`short_interest`, `rate`, `days_to_cover`, `close`). HK: daily HKEX disclosed short positions (`open_short_shares`, `balance`, `cost`, `rate`).

For daily short sale volume (shares sold short each day), use `short-trades`.

Example: longbridge short-positions AAPL.US Example: longbridge short-positions 700.HK

Usage: longbridge short-positions [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format (US or HK, e.g. AAPL.US 700.HK)

Options:
      --count <COUNT>
          Number of records to return (1–100, default: 20)
          
          [default: 20]

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
longbridge short-positions --format json

# See all options
longbridge short-positions --help
```
