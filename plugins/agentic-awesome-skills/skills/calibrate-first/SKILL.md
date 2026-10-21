---
name: calibrate-first
description: "Measure a dataset's detection floor before reading any trading-signal result, pre-register every test, and report too-small-to-see as UNDECIDABLE, not 'no effect'."
category: finance
risk: critical
source: "https://github.com/assaylabdesk-sudo/assay-lite"
source_repo: assaylabdesk-sudo/assay-lite
source_type: community
date_added: "2026-10-21"
author: assaylabdesk-sudo
tags: [quant, backtesting, statistics, multiple-testing, factor-research]
tools: [claude]
license: MIT
license_source: "https://github.com/assaylabdesk-sudo/assay-lite/blob/main/LICENSE"
---

# Calibrate First

## Overview

A backtest result is only as good as the instrument that produced it. This skill
makes Claude measure the instrument before it measures the signal. It drives
[assay-lite](https://github.com/assaylabdesk-sudo/assay-lite), a single-file,
offline Python tool. `floor` injects synthetic signals of known strength into the
user's own returns to find the smallest effect the data can detect. `test` charges
every run to an append-only registry *before* computing, and a result below the
floor is reported as UNDECIDABLE rather than "the signal doesn't work".

## When to Use

- The user asks whether a trading signal, factor or ranking "works", is
  "significant", or has an "edge".
- The user wants to read an information coefficient (IC) or a cross-sectional
  backtest result, especially a null one.
- The user is about to try several variants of an idea and pick the best one.

Do not use it for single-asset timing signals, intraday data, live trading or
position sizing. assay-lite does not cover them.

## How It Works

Use only a previously reviewed local `assay_lite.py` at an explicit absolute path, verified against commit `78104a4356541affe2a469dfdf69cb1e418eb0c5`, together with a fully locked and reviewed numpy/pandas/scipy environment. This skill does not download code or resolve dependencies. If absent, stop before execution and return the input schema and analysis plan. Do not substitute a same-named project file. A separate installation task must stage and inspect every file and dependency with installation hooks disabled, verify immutable bytes, then obtain approval before executing or writing the trial registry. `uv` caching is not isolation.

Four rules:

1. **Run `floor` before interpreting any result.** Until the floor is measured for
   these prices and this horizon, a non-significant result means nothing either way.
2. **Never compare p with a conventional 0.05.** The only bars are the ones the
   registry prints: 0.05 divided by every trial ever charged. "Bar for the last
   trial charged" and "the NEXT test will face" are different bars. Quote the one
   that matches the question.
3. **Trials are never refunded.** Re-running a signal, tweaking a parameter or
   trying another horizon is a new trial. Never suggest deleting registry lines or
   using a fresh `--home` to reset the count.
4. **Below the floor is UNDECIDABLE, not "no effect".** Say "too small for this data
   to see", never "doesn't work".

Procedure:

1. Check the inputs. Prices are `date,asset,close`. The signal is
   `date,asset,signal`, known at that date's close.
2. Run `breadth`, and state the effective number of independent bets next to the
   asset count.
3. Run `floor` for the exact prices file and horizon you will test.
4. Write down in one sentence what you expect and why, then run `test` once.
5. Report the verdict line verbatim, with IC, p, the bar it faced, the dispersion
   ratio and the scaled floor.

## Examples

```bash
python /absolute/reviewed/assay_lite.py demo          # synthetic data; shows PASS, UNDECIDABLE, and a scaled floor
python /absolute/reviewed/assay_lite.py breadth  --prices prices.csv
python /absolute/reviewed/assay_lite.py floor    --prices prices.csv --horizon 1
python /absolute/reviewed/assay_lite.py test     --prices prices.csv --signal signal.csv --name momentum_12_1 --horizon 1
python /absolute/reviewed/assay_lite.py registry
```

| verdict | say this | not this |
|---|---|---|
| PASS | "cleared the multiple-testing bar" | "proven", "profitable" |
| UNDECIDABLE | "too small for this data to see" | "doesn't work" |
| FAIL | "large but unreliable" | "zero" |

## Limitations

- Cross-sectional and daily only, using Spearman IC. No timing signals and no
  portfolio simulation.
- No transaction costs. A PASS says nothing about profit after costs.
- Bonferroni is conservative when trials are correlated.
- The floor is calibrated with independent noise and then scaled up by each
  signal's daily-IC dispersion. That corrects for factor structure on average, not
  exactly.
- Nothing here is investment advice. A PASS is evidence of a ranking effect, not
  permission to trade.

## Security & Safety Notes

- assay-lite makes no network calls and needs no API keys. It reads the CSVs the
  user points it at and writes only to its own `.assay-lite/` folder.
- The registry is append-only on purpose. Don't edit or delete it on the user's
  behalf.
