<#
.SYNOPSIS
  NSE/BSE Hybrid Trader - Full 6-Step Pipeline Launcher
  Runs: Clock -> News -> Market Structure -> Time Machine -> Risk Gate -> Alerts

.EXAMPLES
  # News + Market analysis only
  .\trade.ps1 BANKBARODA

  # Full pipeline with trade coordinates
  .\trade.ps1 HDFCBANK -Entry 1750 -Stop 1700 -Target 1850

  # Delivery trade with capital settings
  .\trade.ps1 RELIANCE -Entry 1335 -Stop 1300 -Target 1420 -Segment EQ_DELIVERY -Capital 100000

  # F&O futures
  .\trade.ps1 NIFTY -Entry 24000 -Stop 23800 -Target 24400 -Segment FNO_FUT -Broker zerodha

  # Intraday mode
  .\trade.ps1 TCS -Entry 3800 -Stop 3760 -Target 3880 -Mode INTRADAY -Segment EQ_INTRADAY

  # Skip news for faster run
  .\trade.ps1 TATAMOTORS -Entry 820 -Stop 800 -Target 860 -SkipNews

  # With live watch after staging
  .\trade.ps1 BANKBARODA -WatchAlerts
#>

param (
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Symbol,

    [string]$Entry   = "",
    [string]$Stop    = "",
    [string]$Target  = "",

    [int]   $Capital  = 50000,
    [double]$RiskPct  = 1.0,

    [ValidateSet("EQ_INTRADAY","EQ_DELIVERY","FNO_FUT","FNO_OPT")]
    [string]$Segment  = "EQ_DELIVERY",

    [ValidateSet("INTRADAY","SWING")]
    [string]$Mode     = "SWING",

    [ValidateSet("angel_one","zerodha","upstox","dhan","fyers","groww","kotak_neo","icici_breeze","shoonya")]
    [string]$Broker   = "zerodha",

    [string]$Now        = "",
    [int]   $NewsHours  = 72,
    [int]   $Replays    = 10000,

    [switch]$FnoBan,
    [switch]$AsmGsm,
    [string]$CircuitBand = "",
    [string]$DeliveryPct = "",

    [switch]$SkipNews,
    [switch]$SkipTimeMachine,
    [switch]$SkipRiskGate,
    [switch]$WatchAlerts,

    [ValidateSet("NSE","BSE")]
    [string]$Exchange = "NSE"
)

# Resolve skill directory (repo-local first, then global ~/.agents fallback)
$LocalSkillRoot  = Join-Path $PSScriptRoot ".agents\skills\nse-bse-hybrid-trader"
$GlobalSkillRoot = Join-Path $HOME ".agents\skills\nse-bse-hybrid-trader"
$SkillRoot       = if (Test-Path (Join-Path $LocalSkillRoot "scripts\nse_data_loader.py")) {
    $LocalSkillRoot
} else {
    $GlobalSkillRoot
}

$SKILL     = Join-Path $SkillRoot "scripts"
$STATE_DIR = Join-Path $SkillRoot "state"
$env:PYTHONPATH = $SKILL

$SymbolNS = if ($Symbol -match '\^') {
    $Symbol
} elseif ($Symbol -match '^(NIFTY|NIFTY50)$') {
    "^NSEI"
} elseif ($Symbol -match '^BANKNIFTY$') {
    "^NSEBANK"
} elseif ($Symbol -match '^FINNIFTY$') {
    "NIFTY_FIN_SERVICE.NS"
} elseif ($Symbol -match '^SENSEX$') {
    "^BSESN"
} elseif ($Symbol -match '\.NS$|\.BO$') {
    $Symbol
} else {
    "$Symbol.NS"
}
$TM_JSON   = Join-Path $STATE_DIR "timemachine_result.json"
$RISK_JSON = Join-Path $STATE_DIR "risk_verdict.json"

$nowArg     = if ($Now)         { @("--now",          $Now)         } else { @() }
$brokerArg  = if ($Broker)      { @("--broker",       $Broker)      } else { @() }
$fnoBanArg  = if ($FnoBan)      { @("--fno-ban")                    } else { @() }
$asmArg     = if ($AsmGsm)      { @("--asm-gsm")                    } else { @() }
$circuitArg = if ($CircuitBand) { @("--circuit-band", $CircuitBand) } else { @() }
$delivArg   = if ($DeliveryPct) { @("--delivery-pct", $DeliveryPct) } else { @() }

$hasCoords  = ($Entry -ne "") -and ($Stop -ne "") -and ($Target -ne "")

function Show-Step([int]$n, [string]$title, [string]$color = "Cyan") {
    $bar = "-" * 62
    Write-Host ""
    Write-Host $bar -ForegroundColor $color
    Write-Host "  STEP $n  :  $title" -ForegroundColor $color
    Write-Host $bar -ForegroundColor $color
    Write-Host ""
}

function Show-Skip([string]$msg) {
    Write-Host "  >> SKIPPED: $msg" -ForegroundColor DarkGray
    Write-Host ""
}

function Show-Err([string]$msg) {
    Write-Host "  !! ERROR  : $msg" -ForegroundColor Red
    Write-Host ""
}

function Show-Done([string]$msg) {
    Write-Host "  OK : $msg" -ForegroundColor Green
    Write-Host ""
}

$ts = Get-Date -Format "yyyy-MM-dd HH:mm"
$bar2 = "=" * 64
Write-Host ""
Write-Host $bar2 -ForegroundColor Yellow
Write-Host "   NSE/BSE HYBRID TRADER  --  FULL PIPELINE" -ForegroundColor Yellow
Write-Host $bar2 -ForegroundColor Yellow
Write-Host ("   Stock    : " + $Symbol)   -ForegroundColor Yellow
Write-Host ("   Segment  : " + $Segment + "   Mode : " + $Mode) -ForegroundColor Yellow
Write-Host ("   Capital  : Rs." + $Capital.ToString("N0") + "   Risk : " + $RiskPct + "%   Broker : " + $Broker) -ForegroundColor Yellow
if ($hasCoords) {
    Write-Host ("   Entry    : " + $Entry + "   Stop : " + $Stop + "   Target : " + $Target) -ForegroundColor Yellow
} else {
    Write-Host "   Coords   : Not provided (Steps 3-5 will be skipped)" -ForegroundColor DarkGray
}
Write-Host ("   Time     : " + $ts + " IST") -ForegroundColor Yellow
Write-Host $bar2 -ForegroundColor Yellow

# STEP 0 - Market Clock
Show-Step 0 "NSE/BSE Market Clock & Session Phase" "Magenta"
python "$SKILL\nse_alerts.py" clock @nowArg

# STEP 1 - News & Regulatory Feed
Show-Step 1 "News, Earnings & Regulatory Briefing (Last $NewsHours hrs)" "Cyan"
if ($SkipNews) {
    Show-Skip "News skipped. Remove -SkipNews to include."
} else {
    python "$SKILL\nse_news.py" `
        --tickers  $Symbol `
        --hours    $NewsHours `
        --all `
        --market `
        @nowArg
    if ($LASTEXITCODE -ne 0) { Show-Err "News fetch failed (non-critical, continuing)" }
    else { Show-Done "News briefing complete" }
}

# STEP 2 - TradingView Cloud Technical Indicators (32+ Indicators, 0% CPU Load)
Show-Step 2 "TradingView Cloud Scanner: RSI, MACD, Stoch, ADX, Ichimoku, Pivot Points" "Cyan"
python "$SKILL\tv_indicators.py" `
    --symbol $Symbol

if ($LASTEXITCODE -ne 0) {
    Show-Err "TradingView cloud scanner failed (check internet). Continuing with local analysis..."
} else {
    Show-Done "TradingView cloud technical analysis complete"
}

# STEP 3 - Local Market Structure & Multi-Timeframe Confluence
Show-Step 2 "Market Structure: EMAs / VWAP / RSI / MACD / ATR / Confluence" "Cyan"
python "$SKILL\nse_data_loader.py" `
    --symbol   $Symbol `
    --exchange $Exchange `
    --with-news `
    @nowArg `
    @fnoBanArg `
    @asmArg `
    @circuitArg `
    @delivArg

if ($LASTEXITCODE -ne 0) {
    Show-Err "Data loader failed. Check symbol name or internet. Try symbol with .NS (e.g. BANKBARODA.NS)"
} else {
    Show-Done "Market structure analysis complete"
}

# STEP 4 - Time Machine: 10,000-Path Monte Carlo
Show-Step 4 "Time Machine -- $Replays-Path Monte Carlo ($Mode)" "Cyan"
if ($SkipTimeMachine) {
    Show-Skip "Time Machine skipped. Remove -SkipTimeMachine to run."
} elseif (-not $hasCoords) {
    Show-Skip "No trade coordinates. Provide -Entry -Stop -Target to run."
    Write-Host ("  Example: .\trade.ps1 " + $Symbol + " -Entry 275 -Stop 265 -Target 295") -ForegroundColor DarkGray
    Write-Host ""
} else {
    python "$SKILL\nse_timemachine.py" `
        --symbol    $SymbolNS `
        --entry     $Entry `
        --stop      $Stop `
        --target    $Target `
        --mode      $Mode `
        --replays   $Replays `
        --capital   $Capital `
        --risk-pct  $RiskPct `
        --segment   $Segment `
        --write `
        --state-dir $STATE_DIR `
        @brokerArg `
        @nowArg

    if ($LASTEXITCODE -ne 0) {
        Show-Err "Time Machine: NO-TRADE or failed. Review output above."
        Write-Host "  Pipeline paused at Step 3. Adjust coordinates or use -SkipTimeMachine." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Show-Done "Time Machine passed. Result saved -> state/timemachine_result.json"
    }
}

# STEP 5 - Indian Risk & Tax Gate
Show-Step 5 "Indian Risk Gate, Tax Sizing & 2026 Statutory Charges" "Cyan"
if ($SkipRiskGate) {
    Show-Skip "Risk Gate skipped. Remove -SkipRiskGate to run."
} elseif (-not $hasCoords) {
    Show-Skip "No trade coordinates. Provide -Entry -Stop -Target to run."
} else {
    $tmArg = if (Test-Path $TM_JSON) { @("--timemachine-json", $TM_JSON) } else { @() }

    python "$SKILL\indian_risk_gate.py" `
        --symbol    $Symbol `
        --capital   $Capital `
        --risk-pct  $RiskPct `
        --entry     $Entry `
        --stop      $Stop `
        --target    $Target `
        --segment   $Segment `
        --write `
        --state-dir $STATE_DIR `
        @tmArg `
        @brokerArg `
        @fnoBanArg `
        @asmArg `
        @nowArg

    if ($LASTEXITCODE -ne 0) {
        Show-Err "Risk Gate BLOCKED. Do NOT trade. See reason above."
    } else {
        Show-Done "Risk Gate PASSED. Verdict saved -> state/risk_verdict.json"
    }
}

# STEP 6 - Paper Order Staging Ticket
Show-Step 6 "Paper Order Staging Command (Copy and Run)" "Green"
if (-not $hasCoords) {
    Show-Skip "No coordinates provided. Add -Entry -Stop -Target to generate."
} else {
    Write-Host "  Copy and run this command to stage a PAPER order:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  python `"$SKILL\broker_bridge.py`" stage ``" -ForegroundColor White
    Write-Host "    --broker   $Broker ``" -ForegroundColor White
    Write-Host "    --symbol   $Symbol ``" -ForegroundColor White
    Write-Host "    --segment  $Segment ``" -ForegroundColor White
    Write-Host "    --entry    $Entry ``" -ForegroundColor White
    Write-Host "    --stop     $Stop ``" -ForegroundColor White
    Write-Host "    --target   $Target ``" -ForegroundColor White
    Write-Host "    --risk-json `"$RISK_JSON`" ``" -ForegroundColor White
    Write-Host "    --paper" -ForegroundColor White
    Write-Host ""
    Write-Host "  WARNING: Replace --paper with --live --confirm ""CONFIRM LIVE"" for real money orders." -ForegroundColor Yellow
    Write-Host "  Always verify levels directly on your broker terminal before going live." -ForegroundColor Yellow
}

# STEP 7 - Live Quotes + Alerts
Show-Step 7 "Live Quote & Alert Watch" "Cyan"
Write-Host "  Live quote for $Symbol :" -ForegroundColor Cyan
python "$SKILL\nse_alerts.py" quote $SymbolNS @nowArg
Write-Host ""

if ($WatchAlerts) {
    Write-Host "  Syncing IST bells and alerts from paper ledger..." -ForegroundColor Cyan
    python "$SKILL\nse_alerts.py" add --from-ledger --ist-bell @nowArg
    Write-Host ""
    Write-Host "  Active alert rules:" -ForegroundColor Cyan
    python "$SKILL\nse_alerts.py" list @nowArg
    Write-Host ""
    Write-Host "  Starting live price watch (Ctrl+C to stop)..." -ForegroundColor Green
    python "$SKILL\nse_alerts.py" watch --interval 30 --until 15:15 --beep @nowArg
} else {
    Write-Host "  To start live watch    : .\trade.ps1 $Symbol -WatchAlerts" -ForegroundColor DarkGray
    Write-Host "  To list active alerts  : python `"$SKILL\nse_alerts.py`" list" -ForegroundColor DarkGray
    Write-Host "  To reset all alerts    : python `"$SKILL\nse_alerts.py`" reset" -ForegroundColor DarkGray
}

$bar3 = "=" * 64
Write-Host ""
Write-Host $bar3 -ForegroundColor Yellow
Write-Host ("  PIPELINE DONE  --  " + $Symbol + "  --  " + (Get-Date -Format "HH:mm") + " IST") -ForegroundColor Yellow
Write-Host $bar3 -ForegroundColor Yellow
Write-Host ""
Write-Host "  State files:" -ForegroundColor DarkGray
Write-Host "    $TM_JSON" -ForegroundColor DarkGray
Write-Host "    $RISK_JSON" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Other useful commands:" -ForegroundColor DarkGray
Write-Host "    Scan NIFTY50 daily setups    : python `"$SKILL\nse_scanner.py`" daily --pool nifty50" -ForegroundColor DarkGray
Write-Host "    Scan ORB breakouts (intraday): python `"$SKILL\nse_scanner.py`" orb   --pool nifty50" -ForegroundColor DarkGray
Write-Host "    View all broker fee profiles : python `"$SKILL\broker_bridge.py`" brokers" -ForegroundColor DarkGray
Write-Host "    View paper trade ledger      : python `"$SKILL\broker_bridge.py`" ledger" -ForegroundColor DarkGray
Write-Host ""

# MANDATORY REGULATORY DISCLAIMER
python -c "import os, sys; from nse_ui import UI; print(UI().disclaimer())"
