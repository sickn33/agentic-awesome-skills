`	ext
[menu.py] / [run_all.py] / [trade.ps1]
        │
        ├──> [nse_alerts.py clock]     (IST Market Clock & Session Phase)
        ├──> [nse_news.py]             (Google News IN, ET/LiveMint, SEBI, RBI, BSE Notices & NSE F&O Ban)
        ├──> [tv_indicators.py]        (TradingView Cloud Scanner: 32+ Indicators with 0% Local CPU Load)
        ├──> [nse_data_loader.py]      (Multi-Timeframe Confluence, VWAP, 15m ORH/ORL, Delivery %)
        ├──> [nse_timemachine.py]      (10,000-Path Monte Carlo Probabilistic Simulation)
        ├──> [indian_risk_gate.py]     (April 2026 STT/GST/SEBI/Stamp Duty Sizing & Circuit Breakers)
        ├──> [broker_bridge.py]        (Multi-Broker Staging: Zerodha, Angel One, Upstox, Dhan, Groww, etc.)
        └──> [nse_alerts.py watch]     (Live Quotes, Target/Stop Alerts & 15:10 IST Auto-Squareoff Warning)
`

### Master Launchers & Interactive Terminal Menu

- **Interactive Menu (menu.py):** Run python menu.py to interactively select skills, view the 32+ TradingView indicators catalog with plain-English beginner interpretation, and execute individual scripts or full pipelines.
- **Cross-Platform CLI Runner (
un_all.py):** Run python run_all.py SUZLON to execute all 8 pipeline steps sequentially (with auto-derived swing coordinates if not specified).
- **PowerShell Full Pipeline (	rade.ps1):** Run .\trade.ps1 SUZLON -Entry 54.81 -Stop 50.0 -Target 62.0 in PowerShell.
- **Mandatory SEBI Regulatory Disclaimer:** Every tool and report concludes with an educational disclaimer notice.# Indian Day Trader Skill (`nse-bse-hybrid-trader`)

An AI agent skill for Indian NSE & BSE intraday, swing, and F&O traders. Combines Indian multi-timeframe technical
intelligence with a zero-dependency Python 3.10+ execution engine: 10,000-path Monte Carlo Time Machine replays,
April 2026 Indian statutory tax math, hard risk circuit breakers, and gated paper/live staging across 9 major Indian
brokers.

> [!CAUTION]
> **TRADE AT YOUR OWN RISK — THE AUTHOR IS NOT RESPONSIBLE.**
>
> This repository is educational and workflow-automation software only. It is **not** SEBI-registered financial,
> investment, tax, or legal advice. Most day traders lose money. **You trade strictly at your own risk** — the author
> and contributors accept **zero responsibility or liability** for any financial losses, bugs, API failures, stale or
> delayed market data, slippage, circuit locks, margin shortfalls, misconfigured brokerage/tax rates, or live orders
> placed using this skill.
>
> **Review every line of code, every JSON tax/holiday schedule, and every broker payload before running or enabling
> live execution.** Paper trading (`--paper`) is the default.

---

## What Is This?

AI coding assistants are great at reading market context and terrible at mental arithmetic. **Indian Day Trader Skill**
decouples the two:

1. **The AI Agent (`SKILL.md` + `references/`)** applies structured NSE/BSE trading frameworks — 3-screen
   multi-timeframe bias, 0-6 confluence scoring, RSI divergences, Fibonacci pockets, SEBI surveillance checks, and
   progressive trailing stop rules.
2. **Deterministic Python Scripts (`scripts/`)** run on Python 3.10+ standard library only (`0` required `pip`
   packages for the core engine) to fetch market bars, replay 10,000 bootstrapped intraday or swing sessions, compute
   exact INR position sizing after Indian statutory taxes and broker fees, enforce hard risk circuit breakers, and stage
   orders into a local SQLite paper ledger (or explicitly confirmed live broker REST APIs).

```text
[nse_scanner.py] + [nse_news.py] --> nse_data_loader.py --> nse_timemachine.py --> indian_risk_gate.py --> broker_bridge.py --> [nse_alerts.py]
(NSE Universe +    (Google News IN,   (MTF + Confluence    (10k Monte Carlo +    (INR Sizing + Taxes       (SQLite Paper      (IST Clock, SL/TP
 Daily & ORB        ET/LiveMint/SEBI/  + --with-news)       15m ORB Backtest)     + Circuit Breakers        & Live REST         & 15:10 IST Flatten
 Screener)          RBI/BSE/F&O Ban)                                              + SHA-256 Fingerprint)    across 9 Brokers)    Live Watch)
```

---

## Complete Feature Breakdown

### 1. Zero-Dependency Core Engine (Python 3.10+ Stdlib Only)

- **No Mandatory Third-Party Runtime Dependencies:** Technical loading, indicator math, 10,000-run Monte Carlo
  simulations, Indian tax math, RFC-6238 TOTP generation, SQLite scrip-master caching, SQLite paper-trade accounting,
  all 9 live broker REST dispatchers (`urllib.request` + HMAC-SHA1/SHA-256), and the terminal UI renderer (`nse_ui.py`)
  run using only Python's standard library.
- **Beginner-Friendly Terminal Tables (`nse_ui.py`):** Running any script without `--json` renders colored Unicode
  tables (with automatic ASCII & Windows VT100 fallback, plus `NO_COLOR`/`FORCE_COLOR` support), progress bars, Indian
  lakh/crore INR formatting, status badges (`PASS`/`BLOCK`/`OPEN`/`CLOSED`), and plain-English callouts. Pass
  `--json` anytime for raw structured JSON.
- **Optional Packages (`requirements.txt`):** `pytest` for running the test suite, `requests`, and optional
  `smartapi-python` / `pyotp` if you prefer Angel One's official SDK transport over the built-in direct REST client.

### 2. Multi-Timeframe NSE/BSE Technical & Structure Loader (`nse_data_loader.py`)

- **Ticker & Index Alias Normalization (`nse_common.py`):** Maps `NIFTY` / `NIFTY50` (`^NSEI`), `BANKNIFTY`
  (`^NSEBANK`), `FINNIFTY` (`NIFTY_FIN_SERVICE.NS`), `SENSEX` (`^BSESN`), `INDIAVIX` (`^INDIAVIX`), `.NS` (NSE), `.BO`
  (BSE), and `-EQ` suffixes cleanly.
- **Live & Offline Chart Loading:** Fetches Yahoo Finance v8 `5m` (60-day), `1d` (1-year), and `1wk` (2-year) bars
  with automatic `query2 -> query1` host failover and HTTP 429 retry/backoff, or reads saved `.json` / `.json.gz` files
  via `--offline-5m`, `--offline-1d`, `--offline-1wk`.
- **3-Screen Multi-Timeframe Dashboard:** Evaluates Weekly bias, Daily trend/momentum, and `5m` / aggregated `15m`
  intraday price action.
- **Pure-Python Technical Indicator Suite:**
  - `EMA(20/50/200)` & `SMA(20/50/200)` (daily and weekly)
  - Wilder `RSI(14)` (daily and weekly)
  - `MACD(12, 26, 9)` (line, signal, histogram)
  - `Bollinger Bands(20, 2)` (upper, middle, lower, `%B`)
  - `ADX(14)` with `+DI` / `-DI`
  - `ATR(14)` on both `1d` and `15m` timeframes
  - Relative Volume (`RVOL` vs 20-day average) and `PDH` / `PDL` / `PDC` + `% change`
- **IST Intraday Microstructure:** Computes 15-minute Opening Range (`ORH` / `ORL` with status `ABOVE_ORH`, `BELOW_ORL`,
  `INSIDE_OR`, `FORMING`), Anchored Intraday Session `VWAP` + `% diff`, and session Day High/Low.
- **Automated Pattern Engines:**
  - **Fibonacci Engine:** Auto-detects `UPSWING` vs `DOWNSWING` across the last 60 daily candles and calculates
    retracements (`23.6%`, `38.2%`, `50.0%`, `61.8%`, `78.6%`), Golden Pocket (`50%-61.8%`) check, and extensions
    (`127.2%`, `161.8%`).
  - **RSI(14) Divergence Detector:** Scans swing highs/lows for `REGULAR_BULLISH`, `REGULAR_BEARISH`, `HIDDEN_BULLISH`,
    and `HIDDEN_BEARISH` divergences.
  - **0-6 Confluence Scorer & Candidate Setup:** Scores HTF alignment, intraday structure, RSI, MACD/ADX momentum,
    Fib/EMA200 support, and Volume/Delivery confirmation, then emits `Rs. 0.05` tick-aligned `entry`, `stop_loss`,
    `target_1` (`1.6R`), and `target_2` (`2.5R`).
- **Regulatory & Surveillance Flags:** Supports `--with-news` (auto-reads Indian RSS news + live NSE `fo_secban.csv`),
  `--fno-ban` (`>95% MWPL`), `--asm-gsm` (SEBI ASM/GSM), `--circuit-band` (`2%`/`5%`/`10%`/`20%` proximity check
  within 1% or `>= 4.5%` PDC move warning), and `--delivery-pct` NSE delivery confirmation.

### 3. 10,000-Path Monte Carlo Time Machine & ORB Backtester (`nse_timemachine.py`)

- **Intraday Mode (`--mode INTRADAY`):**
  - Keeps only complete 5-minute NSE sessions (default `72` bars up to `15:15 IST`, rejecting half/incomplete sessions;
    requires at least `20` full sessions).
  - Replays **10,000 bootstrapped price paths** (deterministic `seed=19` so anyone can reproduce exact results) drawing
    returns from time-of-day matched bars (`slot +/- 2` bars).
  - Checks **conservative stop-first** on every 5m bar, models **adverse 1-tick (`Rs. 0.05`) slippage**, and truncates
    every simulation cleanly at **`15:15 IST`** before broker auto-square-off.
- **Automatic Historical 15m ORB Replay:** Re-runs a 15-minute Opening Range Breakout rule across every real historical
  session in the pool and reports `orb_signals_fired`, `target_hits`, `stop_hits`, `cutoff_closes`, `avg_R`, and the
  last 5 trades.
- **Swing Mode (`--mode SWING`):** Simulates N trading days forward (`--horizon-days`, default `10`) from the ticker's
  2-year daily return pool (`>= 60` bars).
- **Broker-Aware Tax Drag & Dual Probability Gates:**
  - Estimates exact round-trip statutory charges + broker fees (`--broker <name>`) expressed as `estimated_tax_drag_r`.
  - **`r_breakeven` (default):** Passes only if `target_first_resolved_pct >= (1 + tax_drag_r) / (1 + R)` **and**
    `avg_net_r > 0`.
  - **`strict_55` (`--gate-mode strict_55`):** Stricter filter requiring `target_first_resolved_pct >= 55%` **and**
    `avg_net_r > 0`.
  - Prints `p_target_pct`, `p_stop_pct`, `p_neither_pct`, `p_green_pct`, `avg_gross_r`, `avg_net_r`, `net_ev_inr`, and
    `5th` / `50th` / `95th` percentile cutoff closes (plus a warning when `>40%` of paths remain open at cutoff).

### 4. Deterministic INR Sizing, April 2026 Indian Taxes & Hard Risk Gate (`indian_risk_gate.py`)

- **Precision Tick & Lot Math:** Uses `Decimal` arithmetic (`nse_common.py`) to align prices to `Rs. 0.05` ticks, rounds
  stops conservatively away from entry (`round_stop_away`), and supports whole-share equities plus F&O lot rounding
  (`--lot-size`, `--margin-per-lot`, or configured segment leverage `5x` intraday / `1x` delivery & F&O).
- **Tax-Inclusive Position Sizing:** Iteratively scales quantity down until `(qty * stop_distance) + round_trip_charges`
  fits strictly inside your INR risk budget (`--no-tax-sizing` disables this step if comparing raw qty).
- **April 2026 Indian Statutory Tax Engine (`EQ_INTRADAY`, `EQ_DELIVERY`, `FNO_FUT`, `FNO_OPT`):**
  - **STT (2026 schedule):** `0.025%` intraday sell, `0.10%` delivery buy+sell, `0.05%` futures sell, `0.15%` options
    sell premium
  - **NSE Exchange Transaction Fees:** `0.00307%` equity, `0.00183%` futures, `0.03553%` options
  - **SEBI Turnover Fee:** `Rs. 10/Cr` (`0.0001%`)
  - **Stamp Duty (Buy):** `0.003%` intraday/options, `0.015%` delivery, `0.002%` futures
  - **DP Sell Charge:** Per-broker depository participant fee on `EQ_DELIVERY` sells
  - **GST:** `18%` on `(Brokerage + Exchange Txn + SEBI Fee)`
  - Outputs **Gross R:R vs Net R:R**, **Breakeven Move & Breakeven Price**, **Statutory Tax Drag %**, and full
    line-item charges at both target and stop.
- **Hard Circuit Breakers (`PASS` / `BLOCK`):**
  - **Risk Cap:** `1.0%` default risk/trade, **`2.0%` hard ceiling** (`RISK_CAP_EXCEEDED`).
  - **Minimum Net R:R:** Blocks trades below **`1.5` Net R:R after taxes** (`NET_RR_TOO_LOW`).
  - **Daily Drawdown & Open Risk Lock:** Automatically reads `state/paper_trades.db` for today's realized P&L + open
    risk and blocks if **`3.0%` daily drawdown** would be breached (`DAILY_DRAWDOWN_LOCK` /
    `DAILY_RISK_BUDGET_EXCEEDED`).
  - **Daily Trade Cap:** Max **`5` trades/day** default (`MAX_TRADES_EXCEEDED`).
  - **IST Session & 2026 Holiday Enforcer (`config/nse_holidays.json`):** Blocks intraday entries during `09:00-09:15`
    Pre-Open, `09:15-09:30` Opening Range, `14:30-15:10` Hazard Window, and `15:10-15:30` Auto-Squareoff Zone; marks
    weekends, 2026 NSE/BSE holidays, and special Muhurat sessions (`--strict-session` blocks closed-market planning).
  - **Regulatory Blocks:** Circuit proximity (`<= 1.0%` of `--upper-circuit` / `--lower-circuit`), `--asm-gsm` intraday
    block, and `--fno-ban` F&O block.
  - **Time Machine Integration:** Validates `--timemachine-json` probability threshold, positive Net EV, and broker
    match.
  - **SHA-256 Order Verdict Fingerprint:** Signs every verdict (`fingerprint`) so `broker_bridge.py` rejects any edited
    or mismatched order.

### 5. Multi-Broker Execution Bridge, ScripMaster SQLite Cache & Paper Ledger (`broker_bridge.py`)

- **9 Major Indian Brokers Supported (`brokers` subcommand):**
  - `angel_one` (aliases: `angel`, `angelone`, `smartapi`) — Angel One SmartAPI JSON + `ROBO`/`BO` or `NORMAL` +
    built-in RFC-6238 stdlib TOTP + optional `SmartConnect` SDK
  - `zerodha` (aliases: `kite`, `kiteconnect`) — Zerodha Kite Connect v3 form-encoded `MIS`/`CNC`/`NRML` + CSV master
  - `upstox` — Upstox API v3 HFT JSON + `.json.gz` complete instrument master
  - `dhan` (alias: `dhanhq`) — DhanHQ API v2 JSON + CSV scrip master
  - `fyers` — Fyers API v3 JSON + `BO`/`INTRADAY`/`CNC`/`MARGIN` + multi-file (`NSE_CM`/`NSE_FO`/`BSE_CM`) CSV master
  - `groww` — Groww Trading API v1 JSON + CSV instrument master
  - `kotak_neo` (aliases: `kotak`, `kotakneo`) — Kotak Neo Trade API (`Trade Free Plan` Rs. 10/order) + form `jData`
  - `icici_breeze` (aliases: `icici`, `breeze`) — ICICI Direct Breeze API v1 JSON + SHA-256 `X-Checksum` signing
  - `shoonya` (alias: `finvasia`) — Finvasia Shoonya Noren API (Rs. 0 brokerage) + form `jData` & `jKey`
- **SQLite ScripMaster Cache (`sync-scrip`, `lookup`):** Downloads or imports local `.json`, `.json.gz`, and `.csv`
  instrument masters (`--offline <path>`) into `state/scrip_master.db` for `<2ms` token, trading symbol, lot size, and
  tick lookups.
- **SQLite Paper Trading Ledger (`stage --paper`, `close`, `ledger`):**
  - Default execution mode (`--paper`) — works completely free with **no demat account and no broker API keys**.
  - Simulates conservative 1-tick (`Rs. 0.05`) adverse fill slippage, logs full broker-native JSON/form payloads to
    `state/paper_trades.db`, validates SHA-256 risk fingerprints (rejecting tampered JSON or broker/symbol/segment/side/
    price/qty mismatches), settles exact tax-adjusted Net P&L on `close`, and supports filtering by `--date` or
    `--broker`.
- **Gated Live Order Dispatch (`--live`):**
  - Refuses execution unless: (1) market & intraday IST windows are open, (2) mandatory instrument tokens are synced or
    supplied via `--symboltoken`, (3) local `.env` broker credentials are loaded, and (4) the exact phrase
    `--confirm "CONFIRM LIVE"` is passed.
  - `smartapi_bridge.py` provides a backward-compatible facade defaulting to `angel_one`.

### 6. Indian Universe & 2-Stage NSE Scanner (`nse_scanner.py`)

- **NiftyIndices & NSE Archives Universe (`universe`):** Downloads and caches `nifty50`, `niftynext50`, `niftybank`,
  `nifty200`, `nifty500`, `fno` (from `fo_mktlots.csv`), or `all_eq` (from `EQUITY_L.csv`), enriching each symbol with
  series (`EQ` vs Trade-to-Trade `BE`/`BZ`), front-month F&O lot size, and live NSE F&O ban status (`fo_secban.csv`).
- **2-Stage Fast Screening (`daily` & `orb`):** Sweeps batches of 20 `.NS` tickers via Yahoo Finance `v8/finance/spark`,
  then confirms volume, `RVOL`, `ATR(14)`, INR Crore turnover, and Anchored VWAP via parallel `v8/finance/chart` calls
  with automatic exclusion of Trade-to-Trade `BE`/`BZ` scrips (`--include-t2t` overrides).
- **Setups Supported:** Daily (`breakout_20d`, `bull_flag`, `reclaim_sma20`, `oversold`, `oversold_bounce`, `near_high`)
  and Intraday (`15m` Opening Range Breakout + Anchored VWAP + missing-bar circuit check).

### 7. Indian News, Earnings & Regulatory Feed Monitor (`nse_news.py`)

- **Fast Free Indian Feeds:** Combines **Google News India RSS** (`hl=en-IN&gl=IN&ceid=IN:en`, with company-name query
  expansion), **Economic Times Stocks RSS**, **LiveMint Markets RSS**, **SEBI RSS** (`sebirss.xml`), **RBI Press Releases
  RSS**, **BSE Notices RSS**, live **NSE `fo_secban.csv`**, and a Yahoo v8 `>= 3%` move check. *(Yahoo Finance RSS
  returns 0 items for `.NS` tickers and NSE/BSE JSON APIs block HTTP 403, so direct public XML/RSS and Archive CSV
  feeds are used instead.)*
- **Indian Catalyst Tagging & Stateful Dedupe:** Flags `earnings`, `order_win`, `analyst`, `deal_qip`, `capital_corp`,
  `regulatory`, `legal_risk`, `management`, and `circuit_halt` leads, auto-discovers symbols from `state/watchlist.json`,
  `state/risk_verdict.json`, and `OPEN` SQLite `paper_orders`, and suppresses already-seen items (`--all` shows all).

### 8. IST Clock, Non-Bracket Alerts & Live Watcher (`nse_alerts.py`)

- **IST Market Clock (`clock`):** Reports NSE/BSE phases (`PRE_OPEN`, `OPENING_RANGE`, `PRIMARY_EXECUTION`,
  `HAZARD_WINDOW_NO_NEW_ENTRY`, `AUTO_SQUAREOFF_ZONE`, `POST_MARKET`), 2026 holidays, Muhurat sessions, and next open.
- **SQLite Paper Ledger & Non-Bracket Protection (`add --from-ledger --ist-bell`):** Auto-registers direction-aware
  `stop` and `target` alerts (handling both long and short trades) plus `15:10 IST` flatten warnings for all `OPEN` rows
  in `paper_trades.db`, protecting orders on brokers where `attached_stoploss_trigger` / `attached_target_price` are
  stripped on non-bracket live orders.
- **Cron `check` & Split-Screen `watch`:** Use `check --beep` (`exit 0` on alert / `1` quiet) for scheduled automation,
  or `watch --interval 30 --until 15:15` alongside Angel One / TradingView for continuous terminal monitoring.

### 9. Curated Indian Market Playbooks (`references/`)

- [`technical_frameworks.md`](.agents/skills/nse-bse-hybrid-trader/references/technical_frameworks.md): 3-screen MTF
  rules, 0-6 confluence rubric, volume vs NSE delivery % matrix, RSI divergence confirmation rules, Fibonacci Golden
  Pocket zones, 4-stage progressive hybrid trailing stop (`0R` -> `1R` tax-adjusted BE -> `2R` ATR trail -> `3R+` swing
  trail), and portfolio concentration limits (`<= 20%` single stock, `<= 35%` single sector, `<= 6%` total open risk).
- [`indian_market_rules.md`](.agents/skills/nse-bse-hybrid-trader/references/indian_market_rules.md): Full IST session
  schedule, SEBI/NSE regulatory guardrails, 2026 statutory tax table, 9-broker fee comparison, and API/product matrix.

---

## Supported Indian Brokers Matrix

Inspect live configs anytime with `python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py brokers`:

| Broker (`--broker`) | Equity Delivery | Equity Intraday | Futures | Options | DP Sell | Required `.env` Keys (`--live` only) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `angel_one` *(default)* | `min(Rs.20, 0.1%)`, min `Rs.5` | `min(Rs.20, 0.1%)`, min `Rs.5` | `Rs. 20` | `Rs. 20` | `Rs. 23.60` | `ANGEL_API_KEY`, `ANGEL_CLIENT_CODE`, `ANGEL_MPIN`, `ANGEL_TOTP_SECRET` |
| `zerodha` (`kite`) | `Rs. 0` | `min(Rs.20, 0.03%)` | `min(Rs.20, 0.03%)` | `Rs. 20` | `Rs. 15.34` | `ZERODHA_API_KEY`, `ZERODHA_ACCESS_TOKEN` |
| `upstox` | `Rs. 20` | `min(Rs.20, 0.1%)` | `min(Rs.20, 0.05%)` | `Rs. 20` | `Rs. 21.83` | `UPSTOX_ACCESS_TOKEN` |
| `dhan` | `Rs. 0` | `min(Rs.20, 0.03%)` | `Rs. 20` | `Rs. 20` | `Rs. 14.75` | `DHAN_CLIENT_ID`, `DHAN_ACCESS_TOKEN` |
| `fyers` | `min(Rs.20, 0.3%)` | `min(Rs.20, 0.03%)` | `min(Rs.20, 0.03%)` | `Rs. 20` | `Rs. 14.75` | `FYERS_APP_ID`, `FYERS_ACCESS_TOKEN` |
| `groww` | `min(Rs.20, 0.1%)` | `min(Rs.20, 0.1%)` | `Rs. 20` | `Rs. 20` | `Rs. 19.47` | `GROWW_ACCESS_TOKEN` |
| `kotak_neo` (`kotak`) | `0.20%` | `min(Rs.10, 0.05%)` | `Rs. 10` | `Rs. 10` | `Rs. 15.34` | `KOTAK_ACCESS_TOKEN`, `KOTAK_SID`, `KOTAK_BASE_URL` |
| `icici_breeze` (`breeze`) | `0.25%` | `0.025%` | `0.025%` | `Rs. 20` | `Rs. 23.60` | `ICICI_API_KEY`, `ICICI_SECRET_KEY`, `ICICI_SESSION_TOKEN` |
| `shoonya` (`finvasia`) | `Rs. 0` | `Rs. 0` | `Rs. 0` | `Rs. 0` | `Rs. 10.62` | `SHOONYA_USER_ID`, `SHOONYA_SESSION_TOKEN` |

*(Customize brokerage tiers or youth/discount plans in
`.agents/skills/nse-bse-hybrid-trader/config/trading_rules.json`.)*

---

## Installation

### Option 1: Using the Skills CLI (Antigravity / Cursor / Claude / Copilot / Cline)

```bash
npx skills add aryanpardeshi11/indian-day-trader-skill
```

### Option 2: Claude Code Plugin Marketplace

```text
/plugin marketplace add aryanpardeshi11/indian-day-trader-skill
/plugin install indian-day-trader-skill@indian-day-trader-skill
```

### Option 3: Antigravity IDE / Manual Clone

```bash
git clone https://github.com/aryanpardeshi11/indian-day-trader-skill.git
cd indian-day-trader-skill
```

- **Antigravity IDE:** Open this repo as your workspace; `.agents/skills/nse-bse-hybrid-trader/SKILL.md` is discovered
  automatically.
- **Claude Code / Cursor / Other Agents:** Copy `.agents/skills/nse-bse-hybrid-trader` into your project's
  `.claude/skills/` or global `~/.claude/skills/` folder.
- **Prompt-only fallback:** Paste `.agents/skills/nse-bse-hybrid-trader/SKILL.md` plus files in `references/` into any
  chat (you lose automated Python execution unless run locally).

### Optional Dev/Test Dependencies

```bash
pip install -r requirements.txt
```

*(Only `pytest` is needed for tests; the entire trading & broker engine works without installing external packages.)*

---

## Compatible AI Agents

Follows the open Agent Skills (`SKILL.md`) specification:

- **Google Antigravity IDE** (primary `.agents/skills/` workspace layout)
- **Claude Code** (`.claude-plugin/` + `.claude/skills/`)
- **Cursor**, **GitHub Copilot**, **Cline**, and any tool compatible with [skills.sh](https://skills.sh)

---

## Natural Language Usage Examples

Once installed in your AI IDE, talk naturally:

```text
"Analyze RELIANCE for an intraday setup using Zerodha"
"Run the 10,000-path Time Machine on SBIN: entry 850, stop 843, target 862"
"Calculate exact INR position size and 2026 taxes for HDFCBANK with Rs. 1,00,000 capital"
"Check NIFTY and BANKNIFTY multi-timeframe confluence and Fibonacci golden pocket"
"Stage a paper trade on Zerodha for TATAMOTORS and show the broker payload"
"Show today's SQLite paper trading ledger and remaining daily drawdown budget"
```

---

## CLI Quick Start & Worked Example

### One-Command PowerShell Pipeline (`trade.ps1` on Windows)

Run the full 6-step workflow (`Clock -> News -> Market Structure -> Time Machine -> Risk Gate -> Paper Staging & Alerts`)
from the repository root with one command:

```powershell
# Allow local PowerShell scripts once (if blocked by Windows ExecutionPolicy)
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# 1. Quickest — market clock, news & technical scan for any stock
.\trade.ps1 HDFCBANK

# 2. Full pipeline with trade coordinates
.\trade.ps1 BANKBARODA -Entry 275 -Stop 265 -Target 295

# 3. Delivery trade with custom capital & broker
.\trade.ps1 RELIANCE -Entry 1335 -Stop 1300 -Target 1420 -Segment EQ_DELIVERY -Capital 100000 -Broker zerodha

# 4. Intraday mode
.\trade.ps1 TCS -Entry 3800 -Stop 3760 -Target 3880 -Mode INTRADAY -Segment EQ_INTRADAY

# 5. F&O Futures trade
.\trade.ps1 NIFTY -Entry 24000 -Stop 23800 -Target 24400 -Segment FNO_FUT -Broker zerodha

# 6. Skip news for a faster run, or launch live alert watch at the end
.\trade.ps1 TATAMOTORS -Entry 820 -Stop 800 -Target 860 -SkipNews
.\trade.ps1 BANKBARODA -WatchAlerts
```

| Step | What `trade.ps1` Runs | Toggle / Notes |
| :--- | :--- | :--- |
| **0** | NSE/BSE market clock & IST session phase | Always runs |
| **1** | 72h ticker news, market headlines, SEBI/RBI/BSE RSS & F&O ban | `-SkipNews` to skip |
| **2** | EMAs, VWAP, 15m ORB, RSI, MACD, ADX, ATR, Fib & 0-6 Confluence | Always runs |
| **3** | 10,000-path Monte Carlo Time Machine (`SWING` or `INTRADAY`) | Runs with `-Entry -Stop -Target`; `-SkipTimeMachine` to skip |
| **4** | INR sizing, 2026 statutory taxes & hard risk gate | Runs with `-Entry -Stop -Target`; `-SkipRiskGate` to skip |
| **5** | Copy-pasteable `broker_bridge.py stage --paper` command | Printed when coordinates are given |
| **6** | Live quote snapshot + optional price/IST bell watch | Add `-WatchAlerts` for continuous watch |

### End-to-End Discovery, Gating & Alerts Pipeline (Cross-Platform Python)

```bash
# 0. Optional discovery & news briefing (nifty50 / nifty200 / fno)
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_scanner.py daily --pool nifty50 --min-turnover-cr 20
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_news.py --tickers RELIANCE SBIN --all

# 1. Multi-timeframe technicals, VWAP, 15m ORB, Fibonacci, RSI divergence, 0-6 confluence & news
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_data_loader.py --symbol RELIANCE --with-news

# 2. 10,000-path Monte Carlo Time Machine + Historical 15m ORB Replay (15:15 IST cutoff)
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_timemachine.py \
  --symbol RELIANCE.NS --entry 1324 --stop 1310 --target 1352 \
  --mode INTRADAY --broker zerodha --write

# 3. Deterministic INR sizing, 2026 Indian taxes & risk circuit breakers
python .agents/skills/nse-bse-hybrid-trader/scripts/indian_risk_gate.py \
  --broker zerodha --symbol RELIANCE --capital 50000 --risk-pct 1.0 \
  --entry 1324 --stop 1310 --target 1352 --segment EQ_INTRADAY \
  --timemachine-json .agents/skills/nse-bse-hybrid-trader/state/timemachine_result.json --write

# 4. Stage paper trade in local SQLite ledger (default safe mode) & sync IST alerts
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py stage \
  --broker zerodha --symbol RELIANCE --entry 1324 --stop 1310 --target 1352 \
  --risk-json .agents/skills/nse-bse-hybrid-trader/state/risk_verdict.json --paper
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_alerts.py add --from-ledger --ist-bell
python .agents/skills/nse-bse-hybrid-trader/scripts/nse_alerts.py watch --interval 30 --until 15:15 --beep

# 5. Close paper trade & inspect settled tax-adjusted P&L
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py close --trade-id 1 --exit-price 1352 --reason TARGET
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py ledger
```

### Real Example: Catching Hidden Tax Drag & Coin-Flip Odds Before Risking INR

When testing `SBIN.NS` (`entry=850`, `stop=843`, `target=862`, `Rs. 50,000` capital, `1%` risk):

- Mental math says Gross R:R is `12 / 7 = 1.71` — looks like a valid `>= 1.5` trade.
- **`nse_timemachine.py`** replays 10,000 sessions from 59 full NSE `5m` sessions (`seed=19`, `15:15 IST` cutoff) and
  reveals only **17.94%** target-first odds (`-0.2893R` net EV after `0.1292R` tax drag) and `4/34` historical ORB hits.
- **`indian_risk_gate.py`** caps sizing at `63` shares (`Rs. 497.63` max stop loss including `Rs. 56.63` round-trip
  charges), computes **`Rs. 57.40` charges at target** (`7.59%` tax drag), exposes **`Net R:R = 1.404 < 1.50`**, and
  returns **`BLOCK`** with a signed SHA-256 fingerprint so `broker_bridge.py` refuses to stage it.

### Paper vs Live Broker Commands

```bash
# List all 9 brokers, endpoints, brokerage profiles, and required .env vars
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py brokers

# Sync instrument master locally for <2ms token/lot-size lookup (supports online or --offline CSV/JSON/.gz)
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py sync-scrip --broker zerodha
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py lookup --broker zerodha --symbol RELIANCE --exchange NSE

# Live order (ONLY after reviewing every line of code, testing in paper, populating .env, and during open IST market)
python .agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py stage \
  --broker zerodha --symbol RELIANCE --entry 1324 --stop 1310 --target 1352 \
  --risk-json .agents/skills/nse-bse-hybrid-trader/state/risk_verdict.json \
  --live --confirm "CONFIRM LIVE"
```

---

## Automated Tests

Run the full 18-test offline unit & integration suite (synthetic NSE 5m/1d fixtures, Indian news/SEBI/RBI/BSE RSS &
XXE sanitization, 2-stage scanner & T2T filtering, IST clock & SQLite ledger alerts, RFC-6238 TOTP vectors, ScripMaster
CSV/JSON/GZIP parsing, SQLite paper ledger, tamper-fingerprint rejection, mocked live HTTP dispatch across all 9
brokers, and stdlib terminal UI / ASCII fallback checks):

```bash
python -m pytest -v
```

---

## Indian Market Focus

- **Currency & Tick Grid:** All calculations in INR (`Rs.`), `Decimal`-rounded to `Rs. 0.05` NSE/BSE ticks.
- **Exchanges & Indices:** NSE (`.NS`), BSE (`.BO`), `NIFTY 50`, `BANKNIFTY`, `FINNIFTY`, `SENSEX`, `INDIAVIX`.
- **IST Market Windows:** Enforces `09:00-09:15` Pre-Open, `09:15-09:30` Initial Balance, `09:30-14:30` Primary
  Execution, `14:30-15:10` Hazard Lock, `15:10-15:30` Broker Square-Off Zone, and 2026 NSE/BSE holiday calendar.
- **Segments:** `EQ_INTRADAY`, `EQ_DELIVERY`, `FNO_FUT`, and `FNO_OPT`.

---

## Review Every File Before Running (Code & Logic Audit Guide)

**Do not blindly trust any trading script — including this one.** Before using this skill for real analysis or real
capital, inspect every file yourself:

| File | What to Review & Verify |
| :--- | :--- |
| [SKILL.md](.agents/skills/nse-bse-hybrid-trader/SKILL.md) | AI workflow instructions, gate rules, output format, and safety constraints |
| [config/trading_rules.json](.agents/skills/nse-bse-hybrid-trader/config/trading_rules.json) | Verify **2026 STT, GST, SEBI, NSE exchange txn, stamp duty, DP charges, brokerage tiers, leverage, and risk limits** match your broker plan and latest SEBI/Union Budget rules |
| [config/nse_holidays.json](.agents/skills/nse-bse-hybrid-trader/config/nse_holidays.json) | Verify official NSE/BSE holiday dates and Muhurat sessions for the current year |
| [scripts/nse_common.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_common.py) | IST clock, `Decimal` Rs. 0.05 ticks, symbol aliases, NSE holiday/F&O ban CSV, and Yahoo Spark/v8 helpers |
| [scripts/nse_ui.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_ui.py) | Zero-dependency ANSI/Unicode/ASCII table, banner, progress bar, Indian INR formatting & safe output helpers |
| [scripts/nse_scanner.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_scanner.py) | NiftyIndices + `EQUITY_L.csv` universe builder (`BE`/`BZ` filter), 2-stage Yahoo Spark -> v8 daily & 15m ORB+VWAP screener |
| [scripts/nse_news.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_news.py) | Google News India, ET Stocks, LiveMint, SEBI, RBI & BSE RSS parser, NSE `fo_secban.csv`, move check & 30-day dedupe |
| [scripts/nse_alerts.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_alerts.py) | IST market clock, SQLite `paper_orders` stop/target/15:10 flatten alerts, IST bells, cron `check` & live `watch` loop |
| [scripts/nse_data_loader.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_data_loader.py) | Indicator formulas (EMA, SMA, Wilder RSI, MACD, Bollinger, ADX, ATR, VWAP), Fib swings, divergence rules, `--with-news`, and 0-6 confluence scoring |
| [scripts/nse_timemachine.py](.agents/skills/nse-bse-hybrid-trader/scripts/nse_timemachine.py) | Bootstrap pool filtering, slot window sampling, conservative stop-first check, 15:15 IST cutoff, ORB replay, and `r_breakeven` / `strict_55` math |
| [scripts/indian_risk_gate.py](.agents/skills/nse-bse-hybrid-trader/scripts/indian_risk_gate.py) | Position sizing decrement loop, statutory charge formula, daily drawdown SQLite query, circuit/F&O ban/ASM/IST blocks, and SHA-256 fingerprint |
| [scripts/broker_bridge.py](.agents/skills/nse-bse-hybrid-trader/scripts/broker_bridge.py) | **CRITICAL:** Inspect `build_broker_payload()`, `_dispatch_*_live()`, and `_strip_attached_fields()`. Non-bracket orders (`zerodha`, `upstox`, `dhan`, `groww`, `kotak_neo`, `icici_breeze`, `shoonya`, `angel_one` `NORMAL`, `fyers` non-BO) record `attached_stoploss_trigger` / `attached_target_price` in the staged ticket and strip them on live entry dispatch — **you must place and verify separate stop-loss/GTT/target orders directly with your broker** |
| [scripts/smartapi_bridge.py](.agents/skills/nse-bse-hybrid-trader/scripts/smartapi_bridge.py) | Backward-compatible `angel_one` facade delegating to `broker_bridge.py` |
| [references/technical_frameworks.md](.agents/skills/nse-bse-hybrid-trader/references/technical_frameworks.md) | 3-screen MTF rules, trailing stop stages, and portfolio concentration guidelines |
| [references/indian_market_rules.md](.agents/skills/nse-bse-hybrid-trader/references/indian_market_rules.md) | Session windows, regulatory notes, tax tables, and broker API reference |
| [tests/test_hybrid_trader.py](tests/test_hybrid_trader.py) | Offline test fixtures, assertions, and mocked HTTP checks |
| [trade.ps1](trade.ps1) | Windows PowerShell 6-step pipeline launcher wrapping all scripts above |
| [.env.example](.env.example) | Broker environment variable names (copy to `.env` locally; never commit `.env`) |

---

## Fine Print & Disclaimer

- **Not Financial Advice / Not SEBI Registered:** This software reads public market data and performs deterministic
  arithmetic. Nothing here is a buy/sell recommendation, tip, or investment advice. Consult a SEBI-registered financial
  advisor before trading.
- **Trade at Your Own Risk:** You are solely responsible for verifying every calculation, inspecting every script, and
  managing your capital. The author and contributors are not responsible for any losses or damages of any kind.
- **Paper First:** `--paper` is the default and logs trades locally to `state/paper_trades.db` with zero broker calls
  and zero demat account required. Enabling `--live` requires `--confirm "CONFIRM LIVE"`, an open IST window, synced
  tokens where applicable, and your own `.env` credentials.
- **Time Machine Is a Simulation, Not a Prediction:** Replays bootstrap from up to 60 trading days of 5-minute bars (or
  2 years of daily bars). Earnings, RBI announcements, corporate actions, halts, and macro shocks can cause moves those
  historical sessions never saw.
- **A Stop-Loss Is a Plan, Not a Guarantee:** Overnight gaps, circuit locks (`2%`/`5%`/`10%`/`20%`), illiquidity, and
  volatility spikes can fill orders well beyond your stop price.
- **Free & Unofficial Market Data:** Built-in live candles use Yahoo Finance's unofficial chart endpoint
  (`5m`/`1d`/`1wk`), which can lag, change, rate-limit (`HTTP 429`), or differ slightly from NSE/BSE exchange feeds.
  Always verify live quotes, margins, freeze quantities, and circuit bands on your broker terminal before acting.
- **Taxes, Fees & Holidays Change:** Indian STT rates, exchange transaction fees, DP charges, broker plans, and NSE/BSE
  holidays change periodically. Keep `config/trading_rules.json` and `config/nse_holidays.json` updated.
- **Keep Secrets Local:** Broker API keys, MPINs, and TOTP secrets belong only in your local `.env` file (which is
  gitignored). Never paste credentials into AI chats or commit them to GitHub.

---

## Repository Structure

```text
.
├── .agents/skills/nse-bse-hybrid-trader/
│   ├── SKILL.md                          # Core AI agent workflow & safety rules
│   ├── config/
│   │   ├── nse_holidays.json             # 2026 NSE/BSE holidays & Muhurat session
│   │   └── trading_rules.json            # Risk caps, IST windows, 2026 taxes, 9 broker profiles
│   ├── references/
│   │   ├── indian_market_rules.md        # IST sessions, SEBI rules & broker API matrix
│   │   └── technical_frameworks.md       # 3-screen MTF, confluence, RSI div, Fib & trailing stops
│   └── scripts/
│       ├── nse_common.py                 # IST clock, Decimal Rs. 0.05 ticks, Yahoo Spark/v8 & F&O ban helpers
│       ├── nse_ui.py                     # Stdlib terminal tables, banners, progress bars & Indian INR formatters
│       ├── nse_scanner.py                # Universe builder, BE/BZ filter & 2-stage daily / 15m ORB+VWAP scanner
│       ├── nse_news.py                   # Google News IN, ET/LiveMint/SEBI/RBI/BSE RSS, F&O ban & move monitor
│       ├── nse_alerts.py                 # IST clock, SQLite paper_orders SL/TP/15:10 flatten & live watch loop
│       ├── nse_data_loader.py            # MTF indicators, VWAP, 15m ORB, Fib, divergence, --with-news & score
│       ├── nse_timemachine.py            # 10,000-path Monte Carlo Time Machine & 15m ORB replay
│       ├── indian_risk_gate.py           # INR sizing, 2026 taxes, circuit breakers & SHA-256 fingerprint
│       ├── broker_bridge.py              # 9-broker ScripMaster SQLite cache, paper ledger & live REST
│       └── smartapi_bridge.py            # Backward-compatible Angel One facade
├── .claude-plugin/
│   ├── marketplace.json                  # Claude Code plugin marketplace manifest
│   └── plugin.json                       # Plugin package metadata
├── tests/
│   └── test_hybrid_trader.py             # 18 offline unit & end-to-end integration tests
├── .env.example                          # Template for local broker API keys (never commit .env)
├── .gitignore                            # Ignores .env, *.db, state/, caches
├── LICENSE                               # MIT License
├── pyproject.toml                        # Project metadata, pytest, ruff & type-checker config
├── README.md                             # Documentation, features, audit guide & disclaimers
├── requirements.txt                      # Optional test/SDK packages (core uses stdlib only)
└── trade.ps1                             # Windows PowerShell all-in-one 6-step pipeline launcher
```

---

## Credits & Inspiration

Built by taking inspiration from and unifying the best ideas of two open-source MIT-licensed GitHub skill repositories:

- **[nse-trading-skills](https://github.com/Bhala-Srinivash/nse-trading-skills)** by Bhala Srinivash — Indian NSE/BSE
  technical analysis frameworks, 3-screen multi-timeframe confluence, RSI divergence rules, Fibonacci Golden Pocket
  playbooks, and Indian equity market conventions.
- **[day-trader-skill](https://github.com/Jakeschincariol/day-trader-skill)** by Jake Schincariol — Zero-dependency
  standard-library Python architecture, 10,000-path Monte Carlo Time Machine replays, historical ORB verification,
  SHA-256 fingerprint risk gating, and strict paper-first / explicit-confirmation safety design.

---

## Contributing

PRs and issues are welcome (updated holiday calendars, verified broker fee schedules, additional indicator/scanner
modules, or improved tests). Please ensure `python -m pytest -v` passes and keep all core logic dependency-free on
Python 3.10+ stdlib.

## License

[MIT](LICENSE)
