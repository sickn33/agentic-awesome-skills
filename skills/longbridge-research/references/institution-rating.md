# institution-rating

```
Institution rating overview and target price summary

Without a subcommand: returns rating distribution (Strong Buy / Buy / Hold / Underperform / Sell) and the current average target price. Subcommands: detail Example: longbridge institution-rating TSLA.US Example: longbridge institution-rating detail TSLA.US Example: longbridge institution-rating TSLA.US --views Example: longbridge institution-rating TSLA.US --format json

Usage: longbridge institution-rating [OPTIONS] [SYMBOL] [COMMAND]

Commands:
  detail  Historical institution rating and target price detail
  help    Print this message or the help of the given subcommand(s)

Arguments:
  [SYMBOL]
          Symbol in <CODE>.<MARKET> format. Omit when using a subcommand

Options:
      --history
          Show rating history (target price and rating changes over time)

      --views
          Show monthly buy/hold/sell distribution timeline instead of latest snapshot

      --industry-rank
          Show industry-wide rating ranking instead of per-symbol summary

      --page <PAGE>
          Page number for --industry-rank results (default: 1)
          
          [default: 1]

      --count <COUNT>
          Number of records to show (default: 20); applies to --history and --industry-rank
          
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
longbridge institution-rating --format json

# See all options
longbridge institution-rating --help
```
