# longbridge-quote

Real-time quote, static info, and valuation indices for Longbridge-supported securities (HK / US / A-share / Singapore).

## Symbol format

`<CODE>.<MARKET>`. Normalise before calling:

| Pattern                        | Market        | Example                                                     |
| ------------------------------ | ------------- | ----------------------------------------------------------- |
| Uppercase ticker (US)          | `.US`         | `NVDA.US`, `AAPL.US`                                        |
| 4-digit numeric                | `.HK`         | `700.HK`, `9988.HK`                                         |
| 6-digit, starts `60`           | `.SH`         | `600519.SH`                                                 |
| 6-digit, starts `00`/`30`      | `.SZ`         | `300750.SZ`                                                 |
| Singapore ticker               | `.SG`         | `D05.SG`                                                    |
| Chinese / English company name | verify instrument mapping | 腾讯 → `700.HK`, 特斯拉 → `TSLA.US`, 贵州茅台 → `600519.SH` |

If the market is ambiguous, **ask the user** rather than guessing.

## Subcommands

Run `longbridge --help` to see all available subcommands, then `longbridge <subcommand> --help` before calling. Types of data needed:

- Real-time quote data (last price, open, high, low, prev close, volume, turnover, trade status)
- Static reference data (name, industry, lot size, total/circulating shares, EPS, BPS, dividend yield, currency)
- Valuation indices (PE, PB, turnover rate, total market cap, change rates, etc.)

> **Always run `longbridge <subcommand> --help` first** — every Longbridge CLI subcommand self-documents its arguments, defaults, and examples. Do not hard-code flag names from this SKILL.md if the CLI version may have evolved.

## Workflow

1. Extract symbol(s) from the prompt; normalise each to `<CODE>.<MARKET>`.
2. Run `longbridge --help` to identify available subcommands, then `longbridge <subcommand> --help` to confirm flags.
3. Decide which subset of data is needed:
   - **Quote only** (price / change / volume) → real-time quote subcommand
   - **Static** (industry, market cap, EPS, BPS, dividend yield) → static reference subcommand
   - **Indices** (PE, PB, turnover rate, etc.) → valuation index subcommand (check `--help` for supported field names)
   - **Combined** ("full snapshot") → all three
4. Run them (parallel is fine when supported by the agent runtime). Each command returns a JSON array keyed by symbol.
5. Merge the per-symbol rows by `symbol` into a single object per security.
6. Translate to natural language; cite the source as **Longbridge Securities** / **数据来源:长桥证券** / **數據來源:長橋證券**.

## CLI examples

```bash
# Always check available flags first:
longbridge <subcommand> --help

# Then call with --format json — example structure (verify subcommand names and flags with --help):
longbridge <quote-subcommand>      NVDA.US --format json
longbridge <quote-subcommand>      NVDA.US 700.HK 600519.SH --format json   # multi-symbol
longbridge <static-subcommand>     600519.SH --format json
longbridge <calc-index-subcommand> NVDA.US --format json   # valuation indices; use --help for index field names
```

Run `longbridge <calc-index-subcommand> --help` to see all supported index field names. The upstream field cheat-sheet is not bundled; use the installed CLI help and returned field names, preserving missing values.

## Output

Each subcommand returns a JSON array, one object per requested symbol. Missing per-symbol values appear as `"-"` or `null` (not an error). When merging, key by `symbol` and emit a structure like:

```jsonc
{
  "symbol": "NVDA.US",
  "quote":      { "last": "...", "prev_close": "...", "volume": "...", ... },
  "static":     { "industry": "...", "eps": "...", "bps": "...", ... },
  "calc_index": { "pe_ttm": "...", "pb": "...", "total_market_value": "...", ... }
}
```

## Error handling

| Situation                                         | LLM response                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell `command not found: longbridge`             | Fall back to MCP if configured (see below); otherwise tell the user to install [longbridge-terminal](https://github.com/longportapp/longbridge-terminal). |
| stderr contains `not logged in` / `unauthorized`  | Tell the user to run `longbridge auth login`.                                                                                                             |
| stderr contains `param_error` or "invalid symbol" | Re-check the `<CODE>.<MARKET>` format with the user.                                                                                                      |
| Other stderr                                      | Surface verbatim — never silently retry.                                                                                                                  |
