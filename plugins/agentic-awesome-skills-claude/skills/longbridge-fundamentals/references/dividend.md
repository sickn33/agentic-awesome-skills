# dividend

```
Dividend history and distribution details for a symbol

Example: longbridge dividend AAPL.US Example: longbridge dividend AAPL.US --page 2 Example: longbridge dividend AAPL.US --year 2025 Example: longbridge dividend detail AAPL.US

Usage: longbridge dividend [OPTIONS] [SYMBOL] [COMMAND]

Commands:
  detail  Dividend distribution scheme details
  help    Print this message or the help of the given subcommand(s)

Arguments:
  [SYMBOL]
          Symbol in <CODE>.<MARKET> format (omit when using a subcommand)

Options:
      --page <PAGE>
          Page number (default: 1)

          [default: 1]

      --year <YEAR>
          Filter by year (e.g. 2025)

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
longbridge dividend AAPL.US --format json

# See all options
longbridge dividend --help
```
