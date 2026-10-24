# financial-statement

```
Financial statement (income / balance sheet / cash flow) for a symbol

Example: longbridge financial-statement TSLA.US --kind IS --report af Example: longbridge financial-statement 700.HK --kind BS --format json

Usage: longbridge financial-statement [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

Options:
      --kind <TYPE>
          Statement type: IS (income), BS (balance sheet), CF (cash flow), ALL

          [default: IS]

      --report <REPORT>
          Report period: af (annual), saf (semi-annual), qf (quarterly), cumul (cumulative)

          [default: af]

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
longbridge financial-statement AAPL.US --format json

# See all options
longbridge financial-statement --help
```
