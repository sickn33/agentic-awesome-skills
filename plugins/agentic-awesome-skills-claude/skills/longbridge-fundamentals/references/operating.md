# operating

```
Operating reviews and financial indicators by report period (HK stocks only)

Example: longbridge operating 700.HK Example: longbridge operating 700.HK --report q1

Usage: longbridge operating [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --report <REPORT>
          Report kind filter: af | saf | q1 | q3 (comma-separated for multiple)

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
longbridge operating 700.HK --format json

# See all options
longbridge operating --help
```
