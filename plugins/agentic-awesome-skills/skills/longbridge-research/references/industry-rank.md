# industry-rank

```
Industry ranking list by market and indicator

Returns a ranked list of industries. The "Counter ID" column contains BK `counter_ids` (e.g. BK/US/IN00258) that can be passed directly to `industry-peers` to explore the sub-sector hierarchy for that industry.

Example: longbridge industry-rank --market US Example: longbridge industry-rank --market HK --indicator market-cap Example: longbridge industry-rank --market US --indicator revenue --limit 10

Usage: longbridge industry-rank [OPTIONS] --market <MARKET>

Options:
      --market <MARKET>
          Market: US | HK | SG | CN
          
          [possible values: US, HK, SG, CN]

      --indicator <INDICATOR>
          Ranking indicator (default: leading-gainer)
          
          [default: leading-gainer]
          [possible values: leading-gainer, today-trend, popularity, market-cap, revenue, revenue-growth, net-profit, net-profit-growth]

      --sort-type <SORT_TYPE>
          Display mode: single (default, flat list) | multi (hierarchical)

          Possible values:
          - single: Flat single-level list (default)
          - multi:  Hierarchical multi-level tree
          
          [default: single]

      --count <COUNT>
          Number of results (default: 20)
          
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
longbridge industry-rank --format json

# See all options
longbridge industry-rank --help
```
