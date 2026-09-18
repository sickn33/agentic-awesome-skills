# Meteora screener script

Embedded copy of the read-only screener. Save the fenced Python block below as
`screen.py` in a scratch directory and run it with Python 3.10+.

```python
#!/usr/bin/env python3
"""Rank Meteora DLMM pools from public datapi. Stdlib only. Read-only GET."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

DISCOVERY = "https://pool-discovery-api.datapi.meteora.ag"
DLMM = "https://dlmm.datapi.meteora.ag"
UA = "Mozilla/5.0 (compatible; etemaro-skill/1.0; +https://etemaro.com)"
TIMEOUT = 25

PRESETS: dict[str, dict[str, Any]] = {
    "volatile": {
        "min_bin": 80,
        "max_bin": 125,
        "min_tvl": 10_000,
        "max_tvl": 150_000,
        "min_fee_tvl": 0.05,
        "min_organic": 60,
        "min_holders": 500,
        "min_volume": 500,
        "hard_warnings": True,
    },
    "stable": {
        "min_bin": 1,
        "max_bin": 50,
        "min_tvl": 100_000,
        "max_tvl": 5_000_000,
        "min_fee_tvl": 0.02,
        "min_organic": 70,
        "min_holders": 2_000,
        "min_volume": 5_000,
        "hard_warnings": True,
    },
    "bluechip": {
        "min_bin": 1,
        "max_bin": 25,
        "min_tvl": 500_000,
        "max_tvl": 10_000_000,
        "min_fee_tvl": 0.01,
        "min_organic": 80,
        "min_holders": 5_000,
        "min_volume": 10_000,
        "hard_warnings": True,
    },
    "loose": {
        "min_bin": None,
        "max_bin": None,
        "min_tvl": 1_000,
        "max_tvl": None,
        "min_fee_tvl": 0.0,
        "min_organic": 0,
        "min_holders": 0,
        "min_volume": 0,
        "hard_warnings": False,
    },
}


def get_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")[:200]
        raise SystemExit(f"HTTP {exc.code} {url}\n{body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"network error {url}: {exc.reason}") from exc


def num(value: Any) -> float | None:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n else None  # NaN check


def bucket(obj: Any, timeframe: str) -> float | None:
    if isinstance(obj, dict):
        return num(obj.get(timeframe))
    return num(obj)


def score(fee_tvl: float, organic: float, volume: float, holders: float) -> float:
    return fee_tvl * 1000 + organic * 10 + volume / 100 + holders / 100


def discovery_filters(p: dict[str, Any]) -> str:
    parts = ["pool_type=dlmm"]
    if p["hard_warnings"]:
        parts += [
            "base_token_has_critical_warnings=false",
            "quote_token_has_critical_warnings=false",
            "base_token_has_high_single_ownership=false",
        ]
    if p["min_tvl"] is not None:
        parts.append(f"tvl>={int(p['min_tvl'])}")
    if p["max_tvl"] is not None:
        parts.append(f"tvl<={int(p['max_tvl'])}")
    if p["min_bin"] is not None:
        parts.append(f"dlmm_bin_step>={int(p['min_bin'])}")
    if p["max_bin"] is not None:
        parts.append(f"dlmm_bin_step<={int(p['max_bin'])}")
    if p["min_fee_tvl"]:
        parts.append(f"fee_active_tvl_ratio>={p['min_fee_tvl']}")
    if p["min_organic"]:
        parts.append(f"base_token_organic_score>={int(p['min_organic'])}")
    if p["min_holders"]:
        parts.append(f"base_token_holders>={int(p['min_holders'])}")
    if p["min_volume"]:
        parts.append(f"volume>={int(p['min_volume'])}")
    return "&&".join(parts)


def reject_reason(row: dict[str, Any], p: dict[str, Any]) -> str | None:
    fee = row.get("fee_tvl")
    vol = row.get("volume")
    if (fee is None or fee <= 0) and (vol is None or vol <= 0):
        return "dead pool (zero volume and fee/TVL)"
    if p["hard_warnings"] and row.get("critical"):
        return "critical token warning"
    bin_step = row.get("bin_step")
    tvl = row.get("tvl")
    organic = row.get("organic")
    holders = row.get("holders")
    if p["min_bin"] is not None and (bin_step is None or bin_step < p["min_bin"]):
        return f"bin_step {bin_step} < {p['min_bin']}"
    if p["max_bin"] is not None and bin_step is not None and bin_step > p["max_bin"]:
        return f"bin_step {bin_step} > {p['max_bin']}"
    if tvl is None or tvl < p["min_tvl"]:
        return f"tvl {tvl} < {p['min_tvl']}"
    if p["max_tvl"] is not None and tvl is not None and tvl > p["max_tvl"]:
        return f"tvl {tvl} > {p['max_tvl']}"
    if fee is None or fee < p["min_fee_tvl"]:
        return f"fee/TVL {fee} < {p['min_fee_tvl']}"
    if vol is None or vol < p["min_volume"]:
        return f"volume {vol} < {p['min_volume']}"
    if organic is not None and organic < p["min_organic"]:
        return f"organic {organic} < {p['min_organic']}"
    if holders is not None and holders < p["min_holders"]:
        return f"holders {holders} < {p['min_holders']}"
    return None


def verdict(row: dict[str, Any], p: dict[str, Any]) -> str:
    if reject_reason(row, p):
        return "skip"
    warnings = row.get("warnings") or []
    unverified = any("NOT_VERIFIED" in str(w) for w in warnings)
    thin = (row.get("volume") or 0) < p["min_volume"] * 2 if p["min_volume"] else False
    no_yield = (row.get("fee_tvl") or 0) <= 0
    if unverified or thin or no_yield:
        return "watch"
    return "pass"


def from_discovery(raw: dict[str, Any], timeframe: str) -> dict[str, Any]:
    token_x = raw.get("token_x") or {}
    warnings = token_x.get("warnings") or []
    critical = bool(raw.get("base_token_has_critical_warnings")) or any(
        (w.get("severity") if isinstance(w, dict) else None) == "critical" for w in warnings if isinstance(w, dict)
    )
    bin_step = num((raw.get("dlmm_params") or {}).get("bin_step"))
    return {
        "name": raw.get("name"),
        "pool": raw.get("pool_address"),
        "bin_step": bin_step,
        "fee_tvl": num(raw.get("fee_active_tvl_ratio")),
        "tvl": num(raw.get("tvl")),
        "active_tvl": num(raw.get("active_tvl")),
        "volume": num(raw.get("volume")),
        "organic": num(token_x.get("organic_score")),
        "holders": num(raw.get("base_token_holders")),
        "mcap": num(token_x.get("market_cap")),
        "volatility": num(raw.get("volatility")),
        "mint": token_x.get("address"),
        "warnings": warnings,
        "critical": critical,
        "source": "discovery",
        "timeframe": timeframe,
    }


def from_dlmm(raw: dict[str, Any], timeframe: str) -> dict[str, Any]:
    token_x = raw.get("token_x") or {}
    cfg = raw.get("pool_config") or {}
    return {
        "name": raw.get("name"),
        "pool": raw.get("address"),
        "bin_step": num(cfg.get("bin_step")),
        "fee_tvl": bucket(raw.get("fee_tvl_ratio"), timeframe),
        "tvl": num(raw.get("tvl")),
        "active_tvl": num(raw.get("tvl")),
        "volume": bucket(raw.get("volume"), timeframe),
        "organic": None,
        "holders": num(token_x.get("holders")),
        "mcap": num(token_x.get("market_cap")),
        "volatility": None,
        "mint": token_x.get("address"),
        "warnings": [],
        "critical": bool(raw.get("is_blacklisted")),
        "source": "dlmm",
        "timeframe": timeframe,
    }


def fmt(n: float | None, digits: int = 2) -> str:
    if n is None:
        return "—"
    if abs(n) >= 1_000_000:
        return f"{n / 1_000_000:.{digits}f}M"
    if abs(n) >= 1_000:
        return f"{n / 1_000:.{digits}f}k"
    return f"{n:.{digits}f}"


def fmt_bin(n: float | None) -> str:
    if n is None:
        return "—"
    return str(int(n)) if float(n).is_integer() else fmt(n, 1)


def print_table(rows: list[dict[str, Any]], rejects: list[tuple[str, str]], meta: dict[str, Any]) -> None:
    print(f"# Meteora DLMM screening")
    print(
        f"Universe: {meta['universe']}   Timeframe: {meta['timeframe']}   "
        f"Preset: {meta['preset']}   Source: {meta['source']}"
    )
    proto = meta.get("protocol") or {}
    if proto:
        print(
            f"Protocol: tvl=${fmt(proto.get('total_tvl'))}  "
            f"vol_24h=${fmt(proto.get('volume_24h'))}  pools={proto.get('total_pools')}"
        )
    print(f"Fetched: {meta['fetched']}  Ranked: {len(rows)}  Rejected: {len(rejects)}")
    print()
    print("## Ranked")
    print("| # | name | bin | fee/TVL | tvl | vol | organic | holders | verdict | why |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for i, row in enumerate(rows, 1):
        why = (
            f"fee/TVL {fmt(row.get('fee_tvl'), 3)}, "
            f"bin {fmt_bin(row.get('bin_step'))}, "
            f"{row.get('pool')}"
        )
        print(
            f"| {i} | {row.get('name') or '?'} | {fmt_bin(row.get('bin_step'))} | "
            f"{fmt(row.get('fee_tvl'), 3)} | {fmt(row.get('tvl'))} | {fmt(row.get('volume'))} | "
            f"{fmt(row.get('organic'), 1)} | {fmt(row.get('holders'), 0)} | "
            f"{row.get('verdict')} | {why} |"
        )
    if not rows:
        print("_no pools passed gates — loosen max TVL or min fee/TVL, or try --preset loose_")
    if rejects:
        print()
        print("## Rejects (sample)")
        for name, reason in rejects[:12]:
            print(f"- {name} — {reason}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Screen Meteora DLMM pools (read-only).")
    parser.add_argument("--preset", choices=sorted(PRESETS), default="volatile")
    parser.add_argument("--query", help="Token symbol or mint (pair search via DLMM datapi)")
    parser.add_argument("--timeframe", default="30m", choices=["5m", "30m", "1h", "2h", "4h", "12h", "24h"])
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--page-size", type=int, default=50)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    # Pair search is "which pool for this token", not a trending meme screen.
    if args.query and "--preset" not in sys.argv:
        args.preset = "loose"
    preset = PRESETS[args.preset]

    protocol = get_json(f"{DLMM}/stats/protocol_metrics")

    if args.query:
        qs = urllib.parse.urlencode({"query": args.query, "sort_by": "tvl:desc"})
        payload = get_json(f"{DLMM}/pools?{qs}")
        raw_list = payload.get("data") or []
        rows = [from_dlmm(p, args.timeframe) for p in raw_list if isinstance(p, dict)]
        source = "dlmm"
        universe = f"query={args.query}"
        fetched = payload.get("total", len(rows))
    else:
        qs = urllib.parse.urlencode(
            {
                "page_size": args.page_size,
                "timeframe": args.timeframe,
                "category": "trending",
                "filter_by": discovery_filters(preset),
            }
        )
        payload = get_json(f"{DISCOVERY}/pools?{qs}")
        raw_list = payload.get("data") or []
        rows = [from_discovery(p, args.timeframe) for p in raw_list if isinstance(p, dict)]
        source = "discovery"
        universe = "trending"
        fetched = payload.get("total", len(rows))

    rejects: list[tuple[str, str]] = []
    kept: list[dict[str, Any]] = []
    for row in rows:
        reason = reject_reason(row, preset)
        if reason:
            rejects.append((str(row.get("name") or row.get("pool") or "?"), reason))
            continue
        row["score"] = score(
            row.get("fee_tvl") or 0,
            row.get("organic") or 0,
            row.get("volume") or 0,
            row.get("holders") or 0,
        )
        row["verdict"] = verdict(row, preset)
        kept.append(row)

    kept.sort(key=lambda r: r.get("score") or 0, reverse=True)
    kept = kept[: max(1, args.limit)]

    meta = {
        "universe": universe,
        "timeframe": args.timeframe,
        "preset": args.preset,
        "source": source,
        "fetched": fetched,
        "protocol": protocol if isinstance(protocol, dict) else {},
    }
    if args.json:
        json.dump({"meta": meta, "ranked": kept, "rejects": rejects[:20]}, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return
    print_table(kept, rejects, meta)


if __name__ == "__main__":
    main()
```
