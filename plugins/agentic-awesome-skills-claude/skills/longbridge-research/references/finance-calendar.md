# Financial Calendar Tracking & Insights

## Overview

This Skill targets general retail investors, proactively providing financial calendar summaries, impact analysis for holdings and watchlist, cross-market linkage conclusions — **and helping users discover market opportunities beyond their portfolio**. Users do not need professional financial knowledge; the system handles all reasoning from events to impacts. Conclusions cover all relevant securities — tagged if they belong to the user's holdings or watchlist — while also extending to noteworthy market highlights.

Prerequisite: The user must have completed Longbridge account authorization. See `references/data-fetching.md` for the degradation strategy when unauthorized.

Dependent files:

- `references/output-template.md` — Field specifications and templates for the four output card types
- `references/data-fetching.md` — Data source priorities, degradation rules, and CLI usage instructions

## Data-Driven, Not Pre-Configured

This Skill does not maintain separate user preference settings. All required information is obtained from the following sources:

- **Holdings & Watchlist**: Fetched in real time from the Longbridge account to automatically determine the securities and markets the user cares about. **Holdings and watchlist are equally important for event coverage — both must be fully scanned; neither source may be omitted.** Holdings and watchlist are not grouped separately; they are unified and sorted by event time, differentiated only by tags.
- **Market-Wide Events**: In addition to holdings and watchlist events, fetch high-importance market-wide events (without the `--filter` parameter). These events cover securities the user does not hold, tagged with "Market" to help users discover new opportunities. Selection criteria: high market attention (e.g., marquee earnings, hot IPOs, industry leader movements), relevance to current market themes, or potential to create trading opportunities.
- **Time Range**: Determined from the user's request, with the following defaults. The CLI may not support time parameters — fetch data first, then filter results by time.

| User Expression     | Scan Range                             |
| ------------------- | -------------------------------------- |
| Today               | Current day (T+0)                      |
| Tomorrow            | T+1                                    |
| This week           | Monday to Sunday of the current week   |
| Next week           | Monday to Sunday of the following week |
| Recently / Upcoming | T+0 ~ T+3 (next 3 calendar days)       |
| No time specified   | Default T+0 ~ T+3                      |

**Weekend & Non-Trading Day Rules:**

Time ranges are calculated in calendar days but must ensure coverage through the next trading day. Specific rules:

1. **Auto-Extension**: When the end of the time range falls on a weekend or holiday, automatically extend to that market's next trading day. For example, saying "next 3 days" on Friday (T+0 ~ T+3 = Friday to Monday) — if Monday is a trading day, cover through Monday's after-hours; if Monday is also a holiday, extend to Tuesday.
2. **Per-Market Judgment**: When a user's holdings span multiple markets (e.g., US + HK + A-shares), each market has a different trading calendar and must be evaluated separately. For example, US markets are closed on Christmas but HK markets are not — the effective time windows differ.
3. **Use Market Closure Calendar Data**: The data collection phase already fetches market closure calendars — use them to determine actual trading day boundaries for each market.
4. **Indicate in Output**: When the time window extends due to weekends/holidays, reflect the actual coverage range in the title (e.g., "May 8 to May 11" rather than "next 3 days"), and note weekend/holiday arrangements where appropriate.

- **Output Style**: Default to plain language (everyday terms, no jargon); if the user demonstrates professional background or explicitly requests it, switch to fundamental-style output (preserving raw data).
- **Filtering & Priority**: Prioritize high-importance events. Specific filtering strategies are determined based on the importance fields returned by data sources and the user's request. **Event scope is not limited to the user's holdings and watchlist**: major global events (e.g., Fed meetings, non-farm payrolls) and trending events related to the industries of the user's holdings/watchlist should also be included, to avoid missing important market information by focusing only on existing positions.
- **Market Opportunity Discovery**: Beyond scanning events for holdings and watchlist, proactively discover market-level opportunities and trends. This includes:
  - **Sector Rotation & Market Themes**: What themes/sectors the market is currently focused on (e.g., AI, tech, nuclear energy, GLP-1 weight-loss drugs), which sectors show significant capital inflows.
  - **Cross-Market Linkages & Arbitrage Opportunities**: Recent cross-market linkage signals (e.g., A/H share premium changes, Chinese ADR and HK stock correlations, commodity and related stock correlations, ADR and underlying share price differentials), which may not be in the user's current portfolio but are worth watching.
  - **Event-Driven Trading Opportunities**: Short-term trading windows potentially created by upcoming events (e.g., volatility trading around earnings, sector positioning before policy announcements).
  - This information is proactively obtained via WebSearch, independent of the user's holdings scope, with the goal of helping users discover "the world beyond their portfolio".

The above default behaviors require no pre-configuration by the user. If the user requests adjustments during a conversation, follow those instructions for the current session.

## Execution Flow

Each request executes the full flow, producing output in four sections. Each section is generated if data exists and omitted if not (but the first section must always be included). Generate as much content as possible, covering all dimensions the user might care about. The same event should appear only once and not be repeated across sections.

### Data Collection (Unified Upfront)

1. Retrieve the user's holdings and watchlist (if unauthorized, stop and prompt login)
2. Following the `data-fetching.md` specification, **fetch all data sources in parallel** (all without `--filter`, fetching market-wide data):
   - Earnings/performance calendar, macroeconomic calendar, dividend/ex-date calendar, market closure/trading calendar, stock split calendar, IPO/new listing calendar
   - **Market trends and opportunity data** (proactively searched via WebSearch, fetched in parallel with the CLI data above)
3. After obtaining the full dataset, **tag each event** based on the holdings and watchlist (Holdings / Watchlist / Market) — tags are classification labels only and do not affect data retrieval scope
4. Filter results by the user's requested time range (default T+0 ~ T+3)
5. **Time direction: Focus on the future.** Only retain events that **have not yet occurred** (from today onward). The sole exception is earnings results released "last night / pre-market today" (i.e., published between the previous trading day's close and today's open), which may be briefly mentioned in sections one and three. Earlier historical events are excluded entirely.
6. If the user specifies a particular stock, provide in-depth expansion on that stock's dimension

### Section 1: Event Overview (Template 1)

All events (macro, holdings, watchlist, **high-attention market-wide events**) are merged into a single timeline, sorted uniformly by date and time, without duplication:

- If there are earnings results released **last night or pre-market today** (limited to the period from the previous trading day's close to present), mention them briefly without expanding on history
- Group by calendar day (e.g., "May 12 (Monday)"), sorted chronologically within each day
- Macro events (CPI, PPI, Fed meetings, non-farm payrolls, etc.) and security-specific events are interleaved on the same timeline, not grouped separately
- Source tags for securities:
  - "Holdings" — currently held by the user
  - "Watchlist" — in the user's watchlist
  - "Market" — neither holdings nor watchlist, but a high-attention market event (e.g., marquee earnings, hot IPOs, industry leaders) included to help users discover opportunities
- **Source of "Market" securities**: These naturally emerge from the market-wide calendar data fetched without the `--filter` parameter. After fetching unfiltered data, exclude holdings and watchlist codes, then select noteworthy events from the remainder and tag them as "Market". No hard quantity requirement — event-heavy days will naturally produce more, quiet days fewer. The key is **not to lose the ability to discover opportunities by filtering on securities**
  - May include, but is not limited to, these types:
    - Earnings from large-cap, high-attention companies (industry leaders, recently trending companies)
    - Hot IPOs / new listings
    - Securities closely related to current market themes
    - Catalyst events for companies with recent price anomalies or heavy market discussion
- Securities with no events do not appear
- No cap on the number of events — list as many as there are
- Output following Template 1 format in `output-template.md`

### Section 2: Key Event Impact Analysis (Template 2)

- Extract high-importance events (e.g., major earnings, Fed meetings, non-farm payrolls, significant industry policies)
- Provide in-depth analysis for each key event:
  - Event content and core data
  - Impact classification for actually affected stocks (direct impact / indirect impact), tagged if they are watchlist/holdings, omitting unrelated securities
  - Action reference (no buy/sell instructions)
- If there are no high-importance events in the time range, this section may be omitted
- Output following Template 2 format in `output-template.md`

### Section 3: Earnings Results Express (Template 3)

- Cover earnings results released **last night or pre-market today** across all securities (from the previous trading day's close to today's open) — earlier results are excluded. Generate an earnings result card for each:
  - Beat/miss assessment and magnitude
  - Core business highlights
  - Market reaction (after-hours/pre-market price movement)
  - Next-day market closure notice (if applicable)
- If no earnings have been released, this section is omitted
- Output following Template 3 format in `output-template.md`

### Section 4: Market Trends & Opportunity Discovery (Template 4)

This section goes beyond the user's existing holdings and watchlist to proactively discover market-level opportunities:

- **Recent Market Trends & Sector Movements**: Search via WebSearch for currently trending themes, sector rotation directions, and capital flows. Not limited to securities the user already follows — the goal is to help users discover new opportunities.
- **Cross-Market Linkages & Arbitrage Signals**: Scan recent (especially yesterday's) cross-market linkage activity, including but not limited to:
  - A/H share premium anomalies (price spreads for the same company listed on both A-shares and HK)
  - Chinese ADR vs. HK underlying share price differentials
  - Commodity price fluctuations transmitting to related listed company stock prices (e.g., copper price rise → copper mining stocks)
  - Exchange rate movements creating cross-market impacts
  - "Time-zone arbitrage" windows where a policy/event has already been priced into one market but another market hasn't opened yet
- **Event-Driven Potential Opportunities**: Based on upcoming events (earnings, policies, data releases), identify potential short-term trading opportunity windows, even if the securities involved are not in the user's portfolio
- Each opportunity point must explain the logic and risks; no specific buy/sell recommendations
- If searches yield no valuable opportunity information, this section may be omitted
- Output following Template 4 format in `output-template.md`

### Wrap-Up

- Append disclaimer text at the end (see output specifications)
- Prompt the user that they can follow up: "If you'd like to dive deeper into any event, or when earnings results come out, feel free to ask me anytime."

## Output Specifications

### Language Rules

- Sentence length ≤ 30 words; avoid long compound sentences
- Each event conclusion should not exceed 2 lines
- Use hedging language such as "may", "likely", etc.; do not make definitive predictions
- Action suggestions should use phrases like "consider monitoring", "wait until after the open to assess" — not "you should buy/sell"
- Do not use jargon such as EPS, guidance, Beta, IV, etc.; convert all terms to everyday language

### Terminology Conversion Reference

| Professional Term          | Output Phrasing                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Ex-Dividend Date (Ex-Date) | Note: rules differ by market — buying after this date means you won't receive this dividend |
| Half-Day Trading           | HK stocks only trade until noon today                                                       |
| Supply Chain Transmission  | News from this company may cause related stocks to move together                            |
| Liquidity Risk             | Trading volume will be thin that day, so price swings may be larger                         |
| Macro Data Beat            | The economic data came in better than the market expected                                   |

### Prohibitions

- Never respond with "nothing important today" or empty results
- No specific price predictions
- No direct buy or sell recommendations
- Events must always display tags; securities with no events are simply omitted from the output
- Securities not held and not in the watchlist may appear in the following cases:
  - Major global events (e.g., Fed meetings, non-farm payrolls) should be displayed regardless of whether the user holds them
  - Securities tagged "Market" in Section 1 — high-attention events (marquee earnings, hot IPOs, industry leaders, etc.)
  - Trending event securities directly related to the industries of the user's holdings or watchlist
  - Securities in Section 4 (Market Trends & Opportunity Discovery) — this section is specifically designed to help users discover opportunities beyond their portfolio
- Overall principle: **Full coverage** for holdings and watchlist events (no omissions); **selective coverage** for Market-tagged events (only high-value ones)

### Disclaimer Text

Appended once at the end of each complete report (not repeated in each section):

> If you'd like to dive deeper into any event, or when earnings results come out, feel free to ask me anytime.
> The above content is compiled from Longbridge data sources and publicly available information, provided for reference only. It does not constitute investment advice. Please make decisions based on your own judgment.
