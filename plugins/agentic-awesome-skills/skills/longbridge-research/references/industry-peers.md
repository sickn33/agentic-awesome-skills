# industry-peers

```
Industry peer group tree for a BK `counter_id`

Returns the hierarchical sub-sector tree for an industry group, with stock count, daily change, and YTD change at each level.

Use `industry-rank` to discover industry Counter IDs, then pass one here.

Example: longbridge industry-peers BK/US/IN00258 Example: longbridge industry-peers BK/HK/IN20337

Usage: longbridge industry-peers [OPTIONS] <SYMBOL>

Arguments:
  <SYMBOL>
          BK `counter_id` from `industry-rank`, e.g. BK/US/IN00258

Options:
      --market <MARKET>
          Market override (default: inferred from symbol suffix)

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
longbridge industry-peers --format json

# See all options
longbridge industry-peers --help
```
