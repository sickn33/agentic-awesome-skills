# short-trades

```
Daily short sale volume — shares sold short each trading day

Supports US and HK markets; market is inferred from the symbol suffix.

US: FINRA/NASDAQ daily short volume (`nus_amount`, `ny_amount`, `total_amount`, `rate`, `close`). Data source: NASDAQ + NYSE consolidated short sale reports. HK: HKEX daily short sale volume (`amount`, `balance`, `total_amount`, `rate`, `close`). Data source: HKEX daily short selling disclosure.

For total open short interest (cumulative undisclosed positions), use `short-positions`.

Example: longbridge short-trades AAPL.US Example: longbridge short-trades 700.HK

Usage: longbridge short-trades [OPTIONS] <SYMBOL>

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
longbridge short-trades --format json

# See all options
longbridge short-trades --help
```
