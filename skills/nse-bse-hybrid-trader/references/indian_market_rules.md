# Indian Market Rules & Regulatory Guardrails (NSE / BSE)

## 1. IST Session Architecture (`Asia/Kolkata`, UTC+05:30)

| Window (IST) | Session Phase | Operational Rule |
| :--- | :--- | :--- |
| `09:00 - 09:08` | Pre-open order entry / matching | Observe equilibrium & GIFT Nifty gap; **no market orders** |
| `09:08 - 09:15` | Pre-open buffer | Await regular open |
| `09:15 - 09:30` | **Opening Range / Initial Balance** | Record 15-minute `ORH` and `ORL` (bars `09:15`, `09:20`, `09:25`); avoid chasing opening spikes |
| `09:30 - 14:30` | **Primary Execution Window** | Valid window for new `EQ_INTRADAY` / `MIS` / `ROBO` entries |
| `14:30 - 15:10` | **Intraday Hazard Window** | **BLOCK** new intraday entries; prepare trailing exits |
| `15:10 - 15:20` | Broker Auto-Square-Off Zone | Exit all open intraday positions by `15:10 IST` (Time Machine truncates at `15:15 IST`) to avoid broker square-off charges (`Rs. 50 + GST`) |
| `15:15 - 15:30` | Closing 15m auction/VWAP | Only `CNC` / `DELIVERY` positional orders if intended for overnight hold |

---

## 2. SEBI & Exchange Guardrails

1. **Price Circuit Bands (`2%`, `5%`, `10%`, `20%`):**
   - Non-F&O equities have strict upper/lower circuit limits.
   - **Rule:** Block intraday longs within `1.0%` of Upper Circuit (liquidity freeze risk) and shorts within `1.0%` of
     Lower Circuit.
   - F&O stocks have dynamic price bands (typically 10% flexes after cooling-off) rather than static locks, though
     sudden >=5% intraday spikes warrant cooling checks.
2. **SEBI Surveillance (`ASM` / `GSM`):**
   - Stocks under Additional or Graded Surveillance Measures (`ASM` Stage I-IV, `GSM`) typically require `100%` upfront
     margin (Trade-to-Trade / `BE` series) and disallow `MIS`/`BO` intraday leverage.
   - Block `EQ_INTRADAY` on `ASM`/`GSM` flagged symbols.
3. **NSE F&O Ban List (`95% MWPL`):**
   - When aggregate open interest crosses `95%` of Market-Wide Position Limit (`MWPL`), fresh F&O positions are
     prohibited until OI drops below `80%`.
   - `indian_risk_gate.py` blocks `FNO_FUT` / `FNO_OPT` entries when `--fno-ban` is active.
4. **Expiry Day Dynamics:**
   - Weekly/monthly expiry days amplify gamma and pin risk around high Call/Put OI strikes.
   - Avoid tight stops (`< 1.0x ATR`) or naked option buying into late-day theta decay after `13:30 IST`.
5. **NSE Tick Size:**
   - Standard cash/F&O price tick is `Rs. 0.05` (or exchange-notified tick for sub-Rs. 250 / specific scrips). All
     generated entries, stops, and targets round cleanly to `Rs. 0.05`.

---

## 3. Indian Statutory Taxes & Broker Schedules (2026)

All statutory levies + per-broker fee overrides are enforced deterministically in `scripts/indian_risk_gate.py` via
`config/trading_rules.json` (`--broker <name>`):

### Statutory Levies (Common Across Brokers)

| Segment | STT (2026) | NSE Txn Fee | SEBI Fee | Stamp Duty (Buy) | GST |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `EQ_INTRADAY` | `0.025%` (Sell) | `0.00307%` | `Rs. 10/Cr` | `0.003%` | `18%` on (Brok + Txn + SEBI) |
| `EQ_DELIVERY` | `0.10%` (Buy & Sell) | `0.00307%` | `Rs. 10/Cr` | `0.015%` | `18%` on (Brok + Txn + SEBI) |
| `FNO_FUT` | `0.05%` (Sell, Apr 2026) | `0.00183%` | `Rs. 10/Cr` | `0.002%` | `18%` on (Brok + Txn + SEBI) |
| `FNO_OPT` | `0.15%` (Sell, Apr 2026) | `0.03553%` | `Rs. 10/Cr` | `0.003%` | `18%` on (Brok + Txn + SEBI) |

### Supported Broker Fee Profiles (`--broker`)

| Broker | Equity Delivery | Equity Intraday | Futures | Options | DP Sell Charge |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `angel_one` | `min(Rs.20, 0.1%)`, min `Rs.5` | `min(Rs.20, 0.1%)`, min `Rs.5` | `Rs. 20` | `Rs. 20` | `Rs. 23.60` |
| `zerodha` | `Rs. 0` | `min(Rs.20, 0.03%)` | `min(Rs.20, 0.03%)` | `Rs. 20` | `Rs. 15.34` |
| `upstox` | `Rs. 20` | `min(Rs.20, 0.1%)` | `min(Rs.20, 0.05%)` | `Rs. 20` | `Rs. 21.83` |
| `dhan` | `Rs. 0` | `min(Rs.20, 0.03%)` | `Rs. 20` | `Rs. 20` | `Rs. 14.75` |
| `fyers` | `min(Rs.20, 0.3%)` | `min(Rs.20, 0.03%)` | `min(Rs.20, 0.03%)` | `Rs. 20` | `Rs. 14.75` |
| `groww` | `min(Rs.20, 0.1%)` | `min(Rs.20, 0.1%)` | `Rs. 20` | `Rs. 20` | `Rs. 19.47` |
| `kotak_neo` | `0.20%` (Trade Free) | `min(Rs.10, 0.05%)` | `Rs. 10` | `Rs. 10` | `Rs. 15.34` |
| `icici_breeze` | `0.25%` | `0.025%` | `0.025%` | `Rs. 20` | `Rs. 23.60` |
| `shoonya` | `Rs. 0` | `Rs. 0` | `Rs. 0` | `Rs. 0` | `Rs. 10.62` |

*(Customize any tier/youth plan under `brokers.<name>.brokerage` in `config/trading_rules.json`.)*

---

## 4. Multi-Broker Order API, Product Mapping & `.env` Credentials

| Broker (`--broker`) | Endpoint & Format | Intraday Product | Delivery Product | F&O Product | Token Sync Mandatory | Required `.env` Variables (`--live`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `angel_one` | `apiconnect.angelone.in/.../placeOrder` (`json`) | `BO` (`ROBO`) / `INTRADAY` | `DELIVERY` | `CARRYFORWARD` | Yes (`OpenAPIScripMaster.json`) | `ANGEL_API_KEY`, `ANGEL_CLIENT_CODE`, `ANGEL_MPIN`, `ANGEL_TOTP_SECRET` |
| `zerodha` | `api.kite.trade/orders/regular` (`form`) | `MIS` | `CNC` | `NRML` | Recommended (`api.kite.trade/instruments`) | `ZERODHA_API_KEY`, `ZERODHA_ACCESS_TOKEN` |
| `upstox` | `api-hft.upstox.com/v3/order/place` (`json`) | `I` | `D` | `D` | Yes (`complete.json.gz`) | `UPSTOX_ACCESS_TOKEN` |
| `dhan` | `api.dhan.co/v2/orders` (`json`) | `INTRADAY` | `CNC` | `MARGIN` | Yes (`api-scrip-master.csv`) | `DHAN_CLIENT_ID`, `DHAN_ACCESS_TOKEN` |
| `fyers` | `api-t1.fyers.in/api/v3/orders/sync` (`json`) | `BO` / `INTRADAY` | `CNC` | `MARGIN` | Recommended (`NSE_CM.csv`, `NSE_FO.csv`) | `FYERS_APP_ID`, `FYERS_ACCESS_TOKEN` |
| `groww` | `api.groww.in/v1/order/create` (`json`) | `MIS` (`CASH`) | `CNC` (`CASH`) | `NRML` (`FNO`) | Recommended (`instrument.csv`) | `GROWW_ACCESS_TOKEN` |
| `kotak_neo` | `<base>/quick/order/rule/ms/place` (`form jData`) | `MIS` (`L`/`MKT`) | `CNC` | `NRML` | Optional (`--offline` CSV/JSON) | `KOTAK_ACCESS_TOKEN`, `KOTAK_SID`, `KOTAK_BASE_URL` |
| `icici_breeze` | `api.icicidirect.com/breezeapi/api/v1/order` (`json` + `X-Checksum`) | `margin` | `cash` | `futures` / `options` | Optional (`--offline` CSV/JSON) | `ICICI_API_KEY`, `ICICI_SECRET_KEY`, `ICICI_SESSION_TOKEN` |
| `shoonya` | `api.shoonya.com/NorenWClientAPI/PlaceOrder` (`form jData+jKey`) | `I` (`LMT`/`MKT`) | `C` | `M` | Optional (`--offline` CSV/JSON) | `SHOONYA_USER_ID`, `SHOONYA_SESSION_TOKEN` |

---

## 5. Free Indian Feeds, Series Filtering (`BE`/`BZ`) & Scanner Hygiene

1. **Equity Series Filtering (`EQUITY_L.csv`):**
   - `EQ`: Standard rolling-settlement equities eligible for intraday `MIS`/`BO` and delivery `CNC`.
   - `BE` / `BZ`: Trade-to-Trade (T2T) or surveillance-restricted series requiring 100% delivery settled gross (no
     intraday squaring off). `nse_scanner.py` excludes `BE` and `BZ` by default unless `--include-t2t` is passed.
2. **Verified Free Indian Data Sources (`config/trading_rules.json` `"feeds"`):**
   - **Universe & Exchange Lists:** NiftyIndices constituent CSVs (`ind_nifty50list.csv`, `ind_nifty200list.csv`,
     `ind_nifty500list.csv`) and NSE Archives CSVs (`EQUITY_L.csv`, `fo_mktlots.csv`, `fo_secban.csv`). Direct
     `nseindia.com/api/*` and `api.bseindia.com` JSON endpoints block headless clients with HTTP 403, so the scanner and
     news monitor avoid them in favor of static archive CSVs and public RSS feeds.
   - **News & Regulatory RSS (`nse_news.py`):** Google News India (`hl=en-IN&gl=IN&ceid=IN:en`), Economic Times Stocks
     RSS, LiveMint Markets RSS, SEBI RSS (`sebirss.xml`), RBI Press Releases RSS (`pressreleases_rss.xml`), and BSE
     Notices RSS (`notices.xml`). Yahoo Finance RSS returns empty results for `.NS` tickers and is therefore bypassed.
   - **Market Data (`nse_scanner.py` & `nse_alerts.py`):** Two-stage Yahoo Finance v8 (`spark` batch close screen of 20
     symbols per request -> parallel `v8/finance/chart` OHLCV, INR Cr turnover, RVOL, ATR, and Anchored VWAP).
