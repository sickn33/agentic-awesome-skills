# fund-holder

```
Funds and ETFs that hold a given symbol

Returns: fund name, ticker, currency, weight (position ratio), and report date. Pass --count -1 to return all holders. Example: longbridge fund-holder AAPL.US Example: longbridge fund-holder AAPL.US --count 20 Example: longbridge fund-holder AAPL.US --format json

Usage: longbridge fund-holder [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --count <COUNT>
          Number of results to return (-1 for all)
          
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
longbridge fund-holder --format json

# See all options
longbridge fund-holder --help
```
