# business-segments

```
Business segment revenue breakdown for a symbol

Without --history: returns the current-period segment composition. With --history: returns historical segment trends by period and category.

Example: longbridge business-segments AAPL.US Example: longbridge business-segments AAPL.US --history --report qf

Usage: longbridge business-segments [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --history
          Fetch historical segment trends instead of current snapshot

      --report <REPORT>
          Report period for history mode: qf (quarterly) | saf (semi-annual) | af (annual)

      --cate <CATE>
          Segment category filter for history mode

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
longbridge business-segments AAPL.US --format json

# See all options
longbridge business-segments --help
```
