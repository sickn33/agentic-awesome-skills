---
name: nse-bse-hybrid-trader
description: >-
  Institutional-grade Indian stock market (NSE/BSE) intraday, swing, and F&O analysis
  and deterministic execution engine. Use whenever the user asks to analyze an Indian
  stock or index (NIFTY, BANKNIFTY, FINNIFTY, SENSEX, or NSE/BSE tickers), evaluate
  intraday/swing setups (ORB, VWAP, RSI Divergence, Fibonacci), calculate exact INR
  position sizes with STT/GST/SEBI/stamp duty taxes, run Monte Carlo historical intraday
  simulations, or stage paper/live orders across major Indian brokers (Zerodha Kite,
  Angel One SmartAPI, Upstox, Dhan, Fyers, Groww, Kotak Neo, ICICI Breeze, Shoonya).
---

# NSE/BSE Hybrid Trader

A decoupled trading intelligence and execution skill for Indian equities and derivatives. The LLM performs
probabilistic technical and market-structure reasoning (`nse-trading-skills` synthesis), while deterministic Python
scripts enforce INR sizing, broker-accurate brokerage & Indian statutory tax math, 10,000-path Monte Carlo
simulation, and multi-broker paper/live execution gating (`day-trader-skill` architecture).

## Supported Indian Brokers

Select any broker via `--broker <name>` (or set `"default_broker"` in
[trading_rules.json](./config/trading_rules.json)):

- `angel_one` — Angel One SmartAPI (`--broker angel_one`, default)
- `zerodha` — Zerodha Kite Connect v3 (`--broker zerodha` / alias `kite`)
- `upstox` — Upstox API v3 (`--broker upstox`)
- `dhan` — DhanHQ API v2 (`--broker dhan`)
- `fyers` — Fyers API v3 (`--broker fyers`)
- `groww` — Groww Trading API v1 (`--broker groww`)
- `kotak_neo` — Kotak Neo Trade API (`--broker kotak_neo` / alias `kotak`)
- `icici_breeze` — ICICI Direct Breeze API v1 (`--broker icici_breeze` / alias `breeze`)
- `shoonya` — Finvasia Shoonya Noren API (`--broker shoonya` / alias `finvasia`)

Inspect fee profiles, endpoints, and required `.env` keys anytime with:

```bash
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py brokers
```

## Configuration & References

- Defaults, broker fee profiles & tax schedule: [trading_rules.json](./config/trading_rules.json)
- NSE/BSE holiday calendar: [nse_holidays.json](./config/nse_holidays.json)
- Technical frameworks (3-Screen MTF, Confluence 0-6, RSI Divergence, Fibonacci, Hybrid Trailing):
  [technical_frameworks.md](./references/technical_frameworks.md)
- Indian regulatory rules & multi-broker API/product matrix:
  [indian_market_rules.md](./references/indian_market_rules.md)

## Core 5-Step Operational Pipeline (+ Optional Discovery & Post-Entry Alerts)

Never rely on mental math for position sizing, tax drag, or probability estimation. Run this sequence from
`.agents/skills/nse-bse-hybrid-trader/` (or pass the script paths from workspace root).

- **Display vs Pipeline Mode:** Omitting `--json` renders colored Unicode/ASCII terminal tables, visual progress bars,
  Indian INR lakh/crore formatting, and plain-English beginner guides via [nse_ui.py](./scripts/nse_ui.py). Keep
  `--json` when piping structured data between steps.

### Optional Step 0: Universe Screening & News Catalyst Briefing

Use [nse_scanner.py](./scripts/nse_scanner.py) and [nse_news.py](./scripts/nse_news.py) when discovering setups
across NSE indices (`nifty50`, `nifty200`, `nifty500`, `fno`, `all_eq`) or auditing headlines/regulatory notices before
entering a trade:

```bash
# Scan NIFTY 50 daily swing setups (auto-filters Trade-to-Trade BE/BZ scrips & checks F&O ban)
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_scanner.py daily --pool nifty50 --setup all --min-turnover-cr 20

# Intraday 15m Opening Range Breakout + Anchored VWAP scan (run after 09:30 IST)
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_scanner.py orb --pool nifty50

# Check Indian news, earnings, SEBI/RBI/BSE regulatory RSS & NSE F&O ban list
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_news.py --tickers "<TICKER>" --all --hours 72
```

- **Headlines are leads, not facts:** Treat `nse_news.py` output as warning flags; verify material corporate filings,
  results, and regulatory circulars directly before trading.

### Step 1 & 2: Indian Market Structure & Multi-Timeframe Confluence

Run [nse_data_loader.py](./scripts/nse_data_loader.py) to fetch live NSE/BSE `5m`, `1d`, and `1wk` data and compute EMA
20/50/200, PDH/PDL/PDC, 15m Opening Range (`ORH`/`ORL`), Anchored Intraday VWAP, RSI(14) + divergences, MACD, ADX,
Bollinger Bands, ATR(14), Fibonacci retracements/extensions, RVOL, and a 0-6 Confluence Score (pass `--with-news` to
include Indian RSS news & automatic NSE `fo_secban.csv` F&O ban detection):

```bash
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_data_loader.py --symbol "<TICKER>" --with-news --json
```

Apply the guardrails in [indian_market_rules.md](./references/indian_market_rules.md) and frameworks in
[technical_frameworks.md](./references/technical_frameworks.md):

- **IST Timing:** Observe only during `09:00-09:15` (pre-open) and `09:15-09:30` (Opening Range). Primary intraday
  execution runs `09:30-14:30 IST`. Block new intraday entries after `14:30 IST`; flatten open intraday positions by
  `15:10 IST`.
- **Regulatory Checks:** Verify circuit bands (`2%/5%/10%/20%`), SEBI `ASM`/`GSM` status, NSE `F&O Ban` (>95% MWPL),
  and expiry-day pin/gamma risk. Pass `--fno-ban`, `--asm-gsm`, `--circuit-band`, or `--delivery-pct` when known.
- **Coordinates:** Establish concrete `entry`, structural `stop_loss` (invalidation + ATR buffer, rounded to `Rs. 0.05`
  ticks), `target_1` (>= 1.5 net R:R), and `target_2`. Skip setups scoring `< 3/6` on confluence.

### Step 3: Intraday / Swing Time Machine ([nse_timemachine.py](./scripts/nse_timemachine.py))

Test the trade coordinates against 10,000 bootstrapped paths drawn from the ticker's recent 60-day `5m` intraday
sessions (truncated strictly at `15:15 IST`, conservative stop-first check, 1-tick slippage) or 2-year daily pool
(`--mode SWING`), plus historical 15m ORB replay (pass `--broker <BROKER>` for broker-specific fee drag):

```bash
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_timemachine.py --symbol "<TICKER>.NS" --entry <ENTRY> --stop <STOP> --target <TARGET_1> --mode <INTRADAY|SWING> --broker <BROKER> --write --json
```

- **Gate Requirement:** Require positive tax-adjusted Expectancy (`avg_net_r > 0`) plus clearing the active probability
  threshold in [trading_rules.json](./config/trading_rules.json):
  - `r_breakeven` (default): `target_first_resolved_pct >= (1 + tax_drag_r) / (1 + R)` — realistic R-scaled edge after
    Indian charges.
  - `strict_55` (override via `--gate-mode strict_55`): `target_first_resolved_pct >= 55%` — ultra-selective
    high-win-rate filter.
  - Both thresholds are always reported; if the active gate returns `NO-TRADE`, downgrade the setup immediately.

### Step 4: Deterministic Risk, Broker Fee & Tax Gate ([indian_risk_gate.py](./scripts/indian_risk_gate.py))

Compute exact INR share/lot sizing, broker-specific brokerage (e.g., zero delivery fee on Zerodha/Dhan/Shoonya vs
Rs. 10/order on Kotak Neo vs percentage/capped plans on Angel One/Groww/ICICI Breeze), statutory friction (STT 2026
rates, NSE Transaction Fee, SEBI Fee, Stamp Duty, DP charge, 18% GST), and verify all hard circuit breakers:

```bash
python .agents/skills/nse-bse-hybrid-trader/scripts/indian_risk_gate.py --broker <BROKER> --symbol "<TICKER>" --capital <CAPITAL_INR> --risk-pct <RISK_PCT> --entry <ENTRY> --stop <STOP> --target <TARGET_1> --segment <EQ_INTRADAY|EQ_DELIVERY|FNO_FUT|FNO_OPT> --timemachine-json .agents/skills/nse-bse-hybrid-trader/state/timemachine_result.json --write --json
```

- **Hard Circuit Breakers:** Max risk/trade `1.0%` default (`2.0%` hard ceiling), tax-inclusive sizing, min net R:R
  `>= 1.5`, max daily drawdown `3.0%` (auto-checked against SQLite paper ledger), exact whole-share / F&O lot rounding,
  IST window lock, and circuit/ban checks.
- **Never override a `BLOCK` verdict.**

### Step 5: Multi-Broker Order Staging & Paper/Live Dispatch ([broker_bridge.py](./scripts/broker_bridge.py))

Only after Steps 3 and 4 return `PASS`:

1. *(Optional, once daily per broker)* Sync instrument master to local SQLite (`<2ms` symbol/token/lot-size lookup —
   supports `.json`, `.json.gz`, and `.csv`):

   ```bash
   python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py sync-scrip --broker <BROKER>
   ```

   *(Pass `--offline <path>` for custom/exported CSV or JSON masters, e.g. Kotak Neo / ICICI Breeze / Shoonya.)*
2. **Paper Ledger (Default):** Stage with verified risk fingerprint, broker-native payload, and simulated `Rs. 0.05`
   tick slippage:

   ```bash
   python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py stage --broker <BROKER> --symbol "<TICKER>" --segment <SEGMENT> --entry <ENTRY> --stop <STOP> --target <TARGET_1> --risk-json .agents/skills/nse-bse-hybrid-trader/state/risk_verdict.json --paper
   ```

3. **Live Multi-Broker Dispatch (`--live`):** Requires open IST execution window, resolved token (for `angel_one`,
   `upstox`, `dhan`, or any F&O contract), broker credentials in `.env` (check `brokers` subcommand), and explicit
   confirmation passing `--live --confirm "CONFIRM LIVE"`.
   - [smartapi_bridge.py](./scripts/smartapi_bridge.py) remains a full backward-compatible alias defaulting to
     `angel_one`.
4. **Post-Entry IST Bells, Price Alerts & Live Watch ([nse_alerts.py](./scripts/nse_alerts.py)):** After staging a
   paper trade or placing a non-bracket live order (whose attached SL/target were stripped on entry), sync alerts from
   `state/paper_trades.db` + IST session bells (`09:15`, `09:30`, `14:30`, `15:10`) and run `check` or `watch`:

   ```bash
   python .agents/skills/nse-bse-hybrid-trader/scripts/nse_alerts.py add --from-ledger --ist-bell
   python .agents/skills/nse-bse-hybrid-trader/scripts/nse_alerts.py watch --interval 30 --until 15:15 --beep
   ```

## Required Output Format

Always present final trade analyses in a clean, beginner-friendly visual layout (short scannable Markdown **tables**,
status badges like `[PASS]` / `[BLOCK]` / `[NO-TRADE]`, confluence meter like `4/6 [████░░]`, Indian `Rs.` formatting,
and 1-line plain-English explanations next to jargon like ORH/ORL, VWAP, Tax Breakeven, and Net R:R — avoid dense walls
of plain text) organized into these 4 blocks:

1. **Market & Regulatory Context:** Summary table with Ticker, Broker, Segment, IST Phase, LTP vs PDC, Circuit/ASM/F&O
   Ban status, News/Catalyst leads, HTF Bias, RVOL & Delivery % (plus a 1-line plain-English takeaway).
2. **Technical Setup Matrix:** Coordinates table with Side, Entry, Stop-Loss, Target 1, Target 2 (`Rs. 0.05` tick
   aligned), Risk/Share, Confluence Score (`X/6`), and exact triggers (VWAP, 15m ORH/ORL, Fib pocket, RSI Divergence).
3. **Time Machine & Tax-Adjusted Risk Gate:** Clear sizing & edge table with Position Size (Shares/Lots), Margin
   Required, Broker Fee + 2026 Statutory Charges & Tax Breakeven Move (INR), Gross vs Net R:R, Monte Carlo Target-First
   % & Net EV, and an unmistakable Verdict (`PASS` / `BLOCK` / `NO-TRADE`).
4. **Actionable Execution Ticket:** Clean ready-to-run `broker_bridge.py` CLI command (`--paper` default), broker-native
   payload, non-bracket SL/GTT reminder when applicable, and optional `nse_alerts.py` stop/target/15:10 IST setup.
5. **Mandatory SEBI Regulatory Disclaimer & Risk Warning:** Every final response, report, and script output MUST conclude with the prominent disclaimer that the author/skill is NOT a SEBI-registered Research Analyst (RA) or Investment Advisor (IA), that all scans, indicators, and simulations are educational tools only, that capital is at risk, and that the user must independently verify orders on their broker terminal.

## What It Never Does

- Never places a live order automatically or from a scheduled/background run (`--paper` is always the default).
- Never overrides a `BLOCK` verdict from `indian_risk_gate.py` or a `NO-TRADE` verdict from `nse_timemachine.py`.
- Never asks for, stores, or echoes broker API keys, MPINs, or TOTP secrets in chat (keys stay in local `.env`).
- Never relies on mental math for INR position sizing, statutory taxes, or win-rate estimation.
- Never treats a historical Time Machine simulation or stop-loss level as a guaranteed fill or prediction.

## Safety, Code Review & Risk Disclaimer

- **Trade at your own risk — author is not responsible:** Educational and automation tooling only, NOT SEBI-registered
  investment, financial, or tax advice. You assume 100% responsibility for any trades, bugs, API errors, slippage,
  circuit freezes, or financial losses.
- **Review every file before running:** Inspect `config/trading_rules.json` (brokerage/STT/GST rates),
  `config/nse_holidays.json` (exchange holidays), and `scripts/broker_bridge.py` before live execution. Note that
  `_strip_attached_fields()` strips `attached_stoploss_trigger` and `attached_target_price` on non-ROBO/non-BO live
  orders, so traders using non-bracket order modes must place and verify separate stop-loss/target/GTT orders on
  their broker terminal.
- **Unofficial data disclaimer:** Built-in live candles use Yahoo Finance's free unofficial chart endpoint (5m/1d/1wk),
  which can lag, rate-limit, or miss corporate actions. Verify live quotes directly with your broker before acting.
