# quant

Quantitative analysis: run indicator scripts against K-line data

Subcommands: run Example: longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 --script "..." Example: cat script.nv | longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31

Usage: longbridge quant [OPTIONS] <COMMAND>

Commands:
  run   Run a quant indicator script against historical K-line data on the server
  help  Print this message or the help of the given subcommand(s)

Options:
      --format <FORMAT>
          Output format: 'pretty' for human-readable, 'json' for AI agents and scripting
          
          [default: pretty]
          [possible values: table, json]

  -v, --verbose
          Print verbose request info (host, elapsed) to stderr, prefixed with `*` like curl -v

      --lang <LANG>
          Language for content fetched from longbridge.com: zh-CN or en. Defaults to system LANG env var, then en

      --schema
          Show response fields for this command and exit

  -h, --help
          Print help (see a summary with '-h')

---

## `quant run` — run an indicator script

```
Run a quant indicator script against historical K-line data on the server

Executes the script server-side and returns the computed indicator/plot values as JSON. Scripts are written in Navi (.nv); pass --language pine for PineScript compatibility.

Periods: 1m  5m  15m  30m  1h  day  week  month  year

Script source (--script takes priority over stdin): --script TEXT   inline script text stdin           cat script.nv | longbridge quant run TSLA.US ...

The optional --input flag accepts a JSON array matching the order of input.*() calls in the script, e.g. --input '[14,2.0]'

Example: longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 --script "..." Example: cat script.nv | longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 Example: longbridge quant run 700.HK --period 1h --start 2024-01-01 --end 2024-06-30 --script "..." --input '[14]' Example: longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 --script "..." --format json Example: longbridge quant run 700.HK --period 1m --start "2024-01-02 09:30" --end "2024-01-02 16:00" --script "..." Example: cat script.pine | longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 --language pine

Usage: longbridge quant run [OPTIONS] --start <START> --end <END> <SYMBOL>

Arguments:
  <SYMBOL>
          Symbol in <CODE>.<MARKET> format, e.g. TSLA.US 700.HK

Options:
      --period <PERIOD>
          K-line period: 1m 5m 15m 30m 1h day week month year (default: day)
          
          [default: day]

      --start <START>
          Start date/time for the K-line range (local YYYY-MM-DD, local "YYYY-MM-DD HH:MM", or RFC 3339)

      --end <END>
          End date/time for the K-line range (local YYYY-MM-DD, local "YYYY-MM-DD HH:MM", or RFC 3339)

      --script <SCRIPT>
          Script text. Omit to read from stdin (e.g. echo "..." | longbridge quant run ...)

      --input <INPUT>
          Script input values as a JSON array, e.g. '[14,2.0]' Must match the order of input.*() calls in the script

      --language <LANGUAGE>
          Script language: `navi` (default), or `pine` for PineScript compatibility
          
          [default: navi]

      --format <FORMAT>
          Output format: 'pretty' for human-readable, 'json' for AI agents and scripting
          
          [default: pretty]
          [possible values: table, json]

  -v, --verbose
          Print verbose request info (host, elapsed) to stderr, prefixed with `*` like curl -v

      --lang <LANG>
          Language for content fetched from longbridge.com: zh-CN or en. Defaults to system LANG env var, then en

      --schema
          Show response fields for this command and exit

  -h, --help
          Print help (see a summary with '-h')
```

## Example script (Navi)

```nv
indicator("RSI");

let length = input.int(14, "Length", minval: 1);
let rsi = ta.rsi(close, length);

plot(rsi, "RSI");
plot(70.0, "OB");
plot(30.0, "OS");
```

```bash
cat rsi.nv | longbridge quant run AAPL.US --start 2025-01-01 --end 2026-01-31
```

## Usage patterns

```bash
# Run an inline script against a symbol
longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 --script "..."

# Pipe a script file
cat my_strategy.nv | longbridge quant run NVDA.US --start 2024-01-01 --end 2024-12-31

# Always add --format json for AI agent processing
longbridge quant run TSLA.US --start 2024-01-01 --end 2024-12-31 --script "..." --format json
```

## Notes

- Script language: **Navi** (`.nv`) by default; `--language pine` for PineScript compatibility. Any unrecognised value falls back to Navi.
- Navi syntax and standard library: <https://navi-lang.org> is authoritative. Install its CLI (<https://navi-lang.org/docs/install.md>) and run `navi lint script.nv` before sending — the API only reports script errors as an opaque error code.
- `--format json` sets `exclude_chart`, so series values are absent from the JSON response; backtest metrics still come back via `.report_json`.
- Run `longbridge quant run --help` for all current flags
- Use `longbridge kline` to preview the underlying OHLCV data first
