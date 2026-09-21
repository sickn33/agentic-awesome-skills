# shareholder

```
Institutional shareholders for a symbol

Without flags: institution list (change direction, sort). --top: Top20 major shareholders across multiple periods (includes individuals and insiders). --object-id: Holding history and trade detail for a specific shareholder (use `object_id` from --top).

Example: longbridge shareholder AAPL.US Example: longbridge shareholder AAPL.US --top Example: longbridge shareholder AAPL.US --object-id 1001 Example: longbridge shareholder AAPL.US --range inc --sort owned

Usage: longbridge shareholder [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --top
          Show Top20 major shareholders (multi-period, includes individuals and insiders)

      --object-id <ID>
          Show holding and trade detail for a specific shareholder ID (from --top output)

      --range <RANGE>
          Filter by change direction: all | inc (increase) | dec (decrease)
          
          [default: all]

      --sort <SORT>
          Sort field: chg (change) | owned (holdings) | time (report date)
          
          [default: chg]

      --order <ORDER>
          Sort order: desc | asc
          
          [default: desc]

      --count <COUNT>
          Max number of institutions to show (default mode)
          
          [default: 50]

      --periods <PERIODS>
          Number of reporting periods to show with --top (default: 1 = Latest only)
          
          [default: 1]

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
longbridge shareholder --format json

# See all options
longbridge shareholder --help
```
