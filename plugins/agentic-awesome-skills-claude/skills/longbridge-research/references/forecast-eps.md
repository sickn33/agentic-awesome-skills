# forecast-eps

Scope: read-only research template; verify current CLI flags/entitlements, cite actual sources and timestamps, and distinguish estimates from observations. Never expose account credentials or raw sensitive error output. Examples and thresholds are illustrative, not current quotes or validated trading signals. Account-specific data is optional and requires user-authorized minimum read access.

```
EPS forecasts and analyst consensus estimates for a symbol

Example: longbridge forecast-eps TSLA.US Example: longbridge forecast-eps TSLA.US --format json

Usage: longbridge forecast-eps [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format

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
longbridge forecast-eps AAPL.US --format json

# See all options
longbridge forecast-eps --help
```
