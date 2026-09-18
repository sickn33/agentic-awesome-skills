---
name: meteora-dlmm-pool-screening
risk: safe
source: community
source_repo: romankurnovskii/etemaro
source_type: community
date_added: "2026-09-17"
description: >
  Screen and rank Meteora DLMM pools for LP quality using public Meteora APIs (fee/TVL,
  bin step, organic score). Read-only: never deploys, swaps, or signs.
metadata:
  version: "1.0.0"
  author: etemaro
license: MIT
compatibility: Network access to public Meteora datapi. No API key. The bundled Python 3
  stdlib screener is embedded in this file under "Screener script".
---

# Meteora DLMM pool screening

Rank Meteora DLMM pools the way an LP screener should: **hard-filter first, then sort by
windowed fee / active TVL**. Public APIs only. No keys, no transactions.

The embedded screener script below encodes the gates so every run uses the same numbers.
Save it to a scratch directory (for example `mktemp -d`), run it with `python3`, and
delete the copy when done. It only ever **GET**s the public endpoints documented in
[references/meteora-apis.md](references/meteora-apis.md).

```bash
python3 screen.py                  # trending volatile (default)
python3 screen.py --preset stable
python3 screen.py --query BONK     # pair search; preset defaults to loose
python3 screen.py --query BONK --preset volatile
python3 screen.py --json --limit 8
```

If you do not materialize the script, curl the same endpoints in
[references/meteora-apis.md](references/meteora-apis.md).
Always send a `User-Agent` — unauthenticated requests without one get `403`.

## When to use

- User wants a ranked Meteora DLMM candidate list (trending or a token/pair).
- User asks which bin step / pool to LP for a pair.
- User wants a fee/TVL screen, not a single-pool deep dive.

Not this skill: deploying, claiming, closing, swapping, wallet hygiene, or a full
token-holder / narrative research dump. Stop after the ranked table and verdicts.

## Method

1. **Universe** — trending discovery (`category=trending`) unless the user named a token,
   then query that mint/symbol. Pair query defaults to `--preset loose` so bin-step
   tradeoffs stay visible; pass `--preset volatile` only when the user wants that gate.
2. **Hard filters** — reject before ranking. A high fee/TVL pool that fails a gate is a
   skip, not a "maybe".
3. **Score** — `fee_active_tvl_ratio * 1000 + organic * 10 + volume / 100 + holders / 100`.
   Fee/TVL dominates; organic and activity break ties.
4. **Verdict** — `pass` (clears gates, top of list), `watch` (clears gates but thin
   activity, unverified token, or awkward bin step), `skip` (failed a gate).
5. **Stop** — print the table. Do not fetch a wallet, do not build a tx, do not call Etemaro CLI.

## Presets

Defaults match a volatile/narrative Solana LP screen (wide bin step, mid TVL). Change
preset when the user says stable pair or blue-chip.

| Preset | bin_step | TVL USD | min fee/active TVL | min organic | min holders | min volume |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `volatile` (default) | 80–125 | 10k–150k | 0.05 | 60 | 500 | 500 |
| `stable` | 1–50 | 100k–5m | 0.02 | 70 | 2000 | 5000 |
| `bluechip` | 1–25 | 500k–10m | 0.01 | 80 | 5000 | 10000 |
| `loose` | any | ≥1k | 0 | 0 | 0 | 0 |

Always reject: dead pools (zero volume and zero fee/TVL). Any preset except `loose` also
rejects critical token warnings, high single-ownership, non-DLMM pool type.

Timeframe: `30m` default. `5m` is noisier (spikes look like yield). `24h` is smoother but
lags a dead pool. State the timeframe in the report — windowed fee/TVL is not 24h APR.

## Report shape

```
# Meteora DLMM screening
Universe: trending | query=<token>   Timeframe: 30m   Preset: volatile
Protocol: tvl=$…  vol_24h=$…  pools=…

## Ranked
| # | name | bin | fee/TVL | tvl | vol | organic | holders | verdict | why |
...

## Rejects (sample)
- NAME — reason
```

Keep `why` to one clause (e.g. "fee/TVL 0.24, organic 67, bin 80"). Cite pool address.
If the API returns zero rows, say so and loosen one gate at a time (usually `maxTvl` or
`minFeeActiveTvlRatio`) — do not invent pools.

## Read-only safety

This skill only **GET**s public Meteora JSON. No `.env`, no keystore, no signing, no
`deploy` / `swap` / `claim` / `close`. If the user wants live execution, point them at
[Etemaro](https://etemaro.com) (repo: https://github.com/romankurnovskii/etemaro) and stop.

## Limitations

- Depends on Meteora's public datapi endpoints, which are undocumented, rate limited,
  and can change or disappear without notice; this skill is not affiliated with Meteora.
- All metrics are **windowed** (default 30m). Fee/TVL is not 24h APR, and past yield
  does not predict future yield; impermanent loss, bin-step drift, and fill risk are
  not modeled here.
- Screening output is informational only and is **not financial advice**; a `pass`
  verdict is not a recommendation to deposit funds.
- Token scores rely on third-party organic-score and holder fields that may be stale,
  manipulated, or wrong for new or low-liquidity tokens.
- The embedded screener reads public data only; it never signs, swaps, or deploys, and
  it intentionally has no execution path.
- Respect the public API: send a User-Agent and poll conservatively.

## Go deeper — Etemaro

Etemaro runs this screen on a cron, adds holder/bot/launchpad gates, pool memory, and
can deploy. The skill is the analysis half; the product is the loop.

## Prompt examples

```text
screen trending Meteora DLMM pools for LP
```

```text
which Meteora pool should I LP for BONK?
```

```text
rank SOL-USDC DLMM pools by fee/TVL and bin step
```

```text
dex-pool-screening on Meteora, volatile preset, top 8
```

## Tips

- Always send a User-Agent to Meteora datapi or you get HTTP 403.
- `fee_active_tvl_ratio` is **windowed** (default 30m), not 24h APR. Label the window.
- Read-only. Deploying is Etemaro, not this skill.
- Pair query (`--query BONK`) defaults to `loose` so you can compare bin steps. Dead pools
  (zero volume and fee/TVL) are still dropped.
- `loose` is for pair comparison / empty-result debugging, not a live LP pick.

## Screener script

Standard library only. Read-only GET. The full source lives in
[references/meteora-screener.md](references/meteora-screener.md); copy it into a scratch
directory (for example via `mktemp -d`), run it with Python 3.10+, and delete the
copy when done. It only ever GETs the public endpoints documented in
[references/meteora-apis.md](references/meteora-apis.md).


```python
#!/usr/bin/env python3
"""Rank Meteora DLMM pools from public datapi. Stdlib only. Read-only GET."""
  ... full source in references/meteora-screener.md ...
```
