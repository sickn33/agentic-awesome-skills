# longbridge-corporate

Single-symbol corporate profile: who owns the company, who runs it, what corporate actions it has taken, and how it relates to its parent / subsidiaries.

## Subcommands

> Run `longbridge <subcommand> --help` if unsure of current flags. The CLI's built-in help is the canonical source.

| Capability                   | Returns                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| Institutional shareholders   | Name, related ticker, % held, share change, report date. Run `--help` for available filter/sort flags. |
| Executives and key personnel | Officers, directors, key roles.                                                                        |
| Company overview             | Founding date, employees, IPO price, listing date, address, business description.                      |
| Corporate actions            | Stock splits, dividends, rights issues, bonus issues.                                                  |
| Investment relations         | Parent company / subsidiaries / sister listings.                                                       |

Single symbol per call. The CLI accepts `--lang zh-CN` or `--lang en` for content fetched from longbridge.com (defaults to system `LANG`).

## Workflow

1. Resolve to `<CODE>.<MARKET>` (e.g. `AAPL.US`, `700.HK`).
2. Pick the matching subcommand from the prompt cue (table above).
3. For composite questions ("give me a full picture of X as a company") — call several subcommands concurrently and merge.
4. Render a structured summary; cite **Longbridge Securities** and the report date when applicable.

## CLI

```bash
# Discover available subcommands and their flags first
longbridge --help
longbridge <subcommand> --help   # run for each subcommand before use

longbridge <shareholder-subcommand> AAPL.US --format json           # run --help for filter/sort flags
longbridge <executive-subcommand> 700.HK --format json
longbridge <company-subcommand> NVDA.US --format json
longbridge <corp-action-subcommand> 700.HK --format json
longbridge <invest-relation-subcommand> 700.HK --format json
```

## Output

Render results in the user's language. Suggested layouts:

**`shareholder`** — table of name / % held / change / report date. Highlight the top 3 by holding and any change > ±10% if `--range` is `all`.

**`executive`** — list of name / title / appointment date (if available). Group by role (CEO / CFO / Chair / others).

**`company`** — short profile paragraph: founding year, headquarters, employees, IPO date + price, business description.

**`corp-action`** — chronological list (most recent first): date / type (split / dividend / rights / bonus) / ratio or amount. Annotate split adjustments.

**`invest-relation`** — tree-like list: parent → company → subsidiaries (with stake % when available). Note cross-listed sister tickers.

When data is empty, state so explicitly (e.g. _"No corporate actions on record."_) — do not invent.

## Error handling

| Situation                                   | Reply                                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Shell `command not found: longbridge`       | Fall back to MCP if configured; otherwise tell the user to install longbridge-terminal.       |
| stderr `not logged in` / `unauthorized`     | These subcommands are public quote scope; if auth is requested, hint `longbridge auth login`. |
| Empty result (no shareholders / no actions) | State explicitly: _"No data for this symbol."_ Do not invent.                                 |
| Symbol mapping fails                        | Ask the user for the `<CODE>.<MARKET>` form.                                                  |
| Other stderr                                | Relay a redacted error summary — never silently retry.                                                        |
