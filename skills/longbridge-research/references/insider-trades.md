# insider-trades

```
SEC Form 4 insider trades for a US-listed company

Shows non-derivative transactions (direct stock buys, sells, grants, etc.) filed by corporate insiders (officers, directors, 10% owners) with the SEC. Only US-listed equities are supported (data source: SEC EDGAR Form 4).

Transaction types: BUY (P) | SELL (S) | GRANT (A) | DISP (D) | TAX (F) | EXERCISE (M/X) | GIFT (G)

Example: longbridge insider-trades TSLA.US Example: longbridge insider-trades AAPL.US --count 40 Example: longbridge insider-trades NVDA.US --format json

Usage: longbridge insider-trades [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format (US market only, e.g. TSLA.US AAPL.US)

Options:
      --count <COUNT>
          Number of Form 4 filings to fetch (default: 20)
          
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
longbridge insider-trades --format json

# See all options
longbridge insider-trades --help
```
