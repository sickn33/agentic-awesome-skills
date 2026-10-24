# trading

```
Trading session schedule and trading calendar

Subcommands: session  days Example: longbridge trading session Example: longbridge trading days HK --start 2024-01-01 --end 2024-03-31

Usage: longbridge trading [OPTIONS] <COMMAND>

Commands:
  session  Trading session schedule (open/close times) for all markets
  days     Trading days and half-trading days for a market
  help     Print this message or the help of the given subcommand(s)

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
longbridge trading session --format json

# See all options
longbridge trading --help
```
