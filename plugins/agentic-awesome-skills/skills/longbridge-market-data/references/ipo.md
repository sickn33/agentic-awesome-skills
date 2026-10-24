# ipo

```
IPO (new listings) commands — subscriptions, calendar, orders, profit/loss

Example: longbridge ipo subscriptions Example: longbridge ipo calendar

Usage: longbridge ipo [OPTIONS] <COMMAND>

Commands:
  subscriptions     List IPO stocks currently in filing or subscription stage
  wait-listing      List IPO stocks in wait-listing (grey market) stage
  listed            List recently listed IPO stocks
  calendar          Show the IPO calendar (all upcoming and recent IPOs)
  detail            Show IPO detail: profile and timeline for a symbol
  orders            IPO orders (active + history) for the current account
  profit-loss       Show IPO profit/loss summary and items for a period
  us-subscriptions  List US IPO stocks currently in subscription stage
  us-wait-listing   List US IPO stocks in wait-listing stage
  us-listed         List recently listed US IPO stocks
  help              Print this message or the help of the given subcommand(s)

Options:
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
longbridge ipo calendar --format json

# See all options
longbridge ipo --help
```
