# compare

```
Multi-stock valuation comparison (price, market cap, PE/PB/PS, ROE, ROA, div yield, and more)

Without extra symbols: shows the stock alongside server-selected industry peers. With extra symbols: compares the specified stocks side by side.

Example: longbridge compare AAPL.US Example: longbridge compare 9988.HK 700.HK 9999.HK --currency HKD

Usage: longbridge compare [OPTIONS] <SYMBOL> [OTHERS]...

Arguments:
  <SYMBOL>
          Base symbol in <CODE>.<MARKET> format

  [OTHERS]...
          Additional symbols to compare (up to 4)

Options:
      --currency <CURRENCY>
          Currency: USD | HKD | CNY (default: USD)

          [default: USD]

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
longbridge compare AAPL.US --format json

# See all options
longbridge compare --help
```
