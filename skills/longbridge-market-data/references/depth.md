# longbridge-depth

Orderbook depth, broker queue (HK-only), and tick-by-tick trades.

## Subcommands

| Subcommand | Returns                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `depth`    | 5 / 10-level orderbook: per-level price / volume / order_num                                                     |
| `brokers`  | Per-level broker_id queue (**HK only**). Tell the user the queue is HK-only when they ask about a non-HK symbol. |
| `trades`   | Latest N trades: time / price / volume / direction / type. Pass `--count 1..1000`.                               |

`broker_id` integers can be translated to names via `longbridge-security-list` → `participants`.

## Workflow

1. Resolve the symbol to `<CODE>.<MARKET>`.
2. Pick the subcommand by user intent (table above). For an "overview" intent, run `depth` + `brokers` (HK-only) + `trades` and merge.
3. **Off-hours warning**: outside trading hours, inspect timestamps and session labels rather than assuming the payload is the closing snapshot or previous-session trades — call this out explicitly when responding.
4. Call the Longbridge CLI directly (preferred) or fall back to MCP.
5. Render `depth` as a bid / ask table; describe `trades` as a reported tick-direction summary (not proof of buyer/seller intent or institutional flows) plus the latest few rows. Cite Longbridge Securities.

## CLI

```bash
longbridge depth   700.HK                  --format json
longbridge brokers 700.HK                  --format json   # HK-only
longbridge trades  700.HK --count 50       --format json
```

Always pass `--format json` so the output is machine-parseable.

## Output

- `depth` / `brokers`: `{asks: [...], bids: [...]}` (`brokers[i]` includes a `broker_id` array)
- `trades`: array of trade rows (`time / price / volume / direction / type`)

## Error handling

If `longbridge` is missing, fall back to MCP. If stderr surfaces _"broker queue not supported"_ / _"non-HK"_ on a `brokers` call, explain that broker queues are HK-only and switch to `depth`. Other stderr messages (auth / invalid symbol) get relayed verbatim.
