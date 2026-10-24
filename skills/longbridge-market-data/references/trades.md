# trades

```
Recent tick-by-tick trades

Returns: timestamp, price, volume, direction (up/down/neutral), `trade_type`. Example: longbridge trades TSLA.US --count 50

Usage: longbridge trades [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --count <COUNT>
          Number of trades to return (default: 20, max: 1000)

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
longbridge trades TSLA.US --format json

# See all options
longbridge trades --help
```
