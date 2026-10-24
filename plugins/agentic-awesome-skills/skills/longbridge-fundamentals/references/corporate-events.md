# longbridge-corporate-events

Event-driven analysis for a single listed company: identifies, classifies, and scores corporate events that may create short- to medium-term pricing dislocations.

> Simplified Chinese / Traditional Chinese / English.

## Workflow

1. Resolve the user's symbol to `<CODE>.<MARKET>` (e.g. `AAPL.US`, `700.HK`, `600519.SH`).
2. Run `longbridge --help` to see available subcommands; run `longbridge <subcommand> --help` to confirm current flags for each.
3. Fetch **latest news and announcements** using the news subcommand with `--format json`.
4. Fetch **regulatory filings** using the filings subcommand with `--format json`.
5. Fetch **corporate actions** (dividends, splits, rights, buyback notices) using the corporate-actions subcommand with `--format json`.
6. Fetch **major shareholder changes** using the shareholder subcommand with `--format json`.
7. Optionally fetch **earnings / event calendar** using the finance-calendar subcommand with `--format json` to surface upcoming catalysts.
8. Classify each event into one of the standard types (see Output), assess sentiment (+/−/neutral), and estimate the expected price-impact window.
9. Output the event ledger and a summary directional signal.

## CLI

```bash
# Discover available subcommands and their flags
longbridge --help
longbridge <subcommand> --help   # run for each subcommand before use

# Latest news and announcements
longbridge <news-subcommand> AAPL.US --format json

# Regulatory filings (SEC 8-K, HKEx announcements, CSRC disclosures)
longbridge <filing-subcommand> AAPL.US --format json

# Corporate actions (dividends, splits, rights, buybacks)
longbridge <corp-action-subcommand> AAPL.US --format json

# Major shareholder changes
longbridge <shareholder-subcommand> AAPL.US --format json

# Upcoming earnings / event calendar
longbridge <finance-calendar-subcommand> --format json
```

## Output

### Event classification table

Classify each event found into one of these types:

| Type        | 简体        | 繁體        | English                          | Typical signal                       |
| ----------- | ----------- | ----------- | -------------------------------- | ------------------------------------ |
| `increase`  | 大股东增持  | 大股東增持  | Insider / major-shareholder buy  | Bullish                              |
| `decrease`  | 大股东减持  | 大股東減持  | Insider / major-shareholder sell | Bearish                              |
| `buyback`   | 股份回购    | 股份回購    | Share buyback                    | Bullish                              |
| `placement` | 定增 / 配股 | 定增 / 配股 | Private placement / rights issue | Dilutive / context-dependent         |
| `incentive` | 股权激励    | 股權激勵    | Equity incentive plan            | Moderately bullish                   |
| `ma`        | 并购重组    | 併購重組    | M&A / restructuring              | Event-specific                       |
| `index`     | 指数调整    | 指數調整    | Index inclusion / exclusion      | Inclusion bullish; exclusion bearish |
| `mgmt`      | 管理层变更  | 管理層變更  | Management change                | Context-dependent                    |
| `pledge`    | 股权质押    | 股權質押    | Share pledge (high ratio)        | Bearish risk flag                    |
| `st`        | ST / 摘帽   | ST / 摘帽   | A-share ST status change         | ST bearish; removal bullish          |
| `other`     | 其他公告    | 其他公告    | Other filing                     | Neutral until assessed               |

### Output structure

1. **Event ledger** — chronological list: date / type / headline / sentiment (+/−/neutral) / expected impact window.
2. **Top signal** — the single most market-moving event from the list, with a one-sentence rationale.
3. **Directional bias** — net assessment (accumulation / distribution / neutral), based on the balance of bullish vs bearish events in the last 30 days.
4. **Watch window** — suggest the next 1–4 weeks if a pending event (placement lock-up expiry, buyback completion deadline, index review date) is identified.

When no significant events are found, state so explicitly — do not invent signals.

**A-share-specific notes**:

- ST / 摘帽 events have mandatory trading limits and announcement timing rules; flag these clearly.
- Northbound (沪深港通) quota changes and index-rebalancing announcements (CSI 300 / SSE 50) are high-impact for A-share mid/large caps.

**HK-specific notes**:

- General mandate issuances (general mandate for new shares) are common HK dilution signals.
- Connected-transaction / related-party announcements require regulatory approval and carry governance risk.

## Error handling

| Situation                       | 简体回复                                    | 繁體回復                                    | English reply                                         |
| ------------------------------- | ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| `command not found: longbridge` | 请安装 longbridge-terminal，或使用 MCP 回退 | 請安裝 longbridge-terminal，或使用 MCP 回退 | Install longbridge-terminal or use MCP fallback       |
| stderr `not logged in`          | 请运行 `longbridge auth login`              | 請執行 `longbridge auth login`              | Run `longbridge auth login`                           |
| No events found                 | 所查时段内无重大公司事件                    | 所查時段內無重大公司事件                    | No significant corporate events in the queried period |
| Symbol mapping fails            | 请提供 `代码.市场` 格式，如 AAPL.US         | 請提供 `代碼.市場` 格式，如 AAPL.US         | Provide `<CODE>.<MARKET>`, e.g. AAPL.US               |
| Other stderr                    | 原样转述，不静默重试                        | 原樣轉述，不靜默重試                        | Relay a redacted error summary, no silent retry                       |
