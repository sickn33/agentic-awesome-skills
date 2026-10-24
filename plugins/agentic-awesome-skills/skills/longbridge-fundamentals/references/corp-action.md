# corp-action

```
Corporate actions (splits, dividends, rights, etc.)

Example: longbridge corp-action 700.HK Example: longbridge corp-action 700.HK --all

Usage: longbridge corp-action [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --all
          Show all records instead of the default 30

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
longbridge corp-action 700.HK --format json

# See all options
longbridge corp-action --help
```
