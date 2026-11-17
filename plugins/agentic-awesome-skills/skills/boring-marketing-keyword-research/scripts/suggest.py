#!/usr/bin/env python3
"""Google autocomplete mining via the public suggest endpoint. Stdlib only.

Pulls real autocomplete suggestions (the same ones Google shows in the search
box) for a seed keyword, expanded across alphabet, question, preposition, and
comparison probes. Fast, free, no API key.

Usage:
    python3 suggest.py "ai marketing" [options]

Options:
    --mode MODE     Probe set: all (default) | base | alphabet | questions |
                    prepositions | comparisons. Comma-combine: questions,prepositions
    --lang LANG     Interface language hint (hl param). Default: en
    --format FMT    Output: json (default) | lines (suggestions only, one per line)
    --delay SECS    Seconds between requests. Default: 0.12
    --max-probes N  Safety cap on number of probes. Default: 60

Output (json):
    {"keyword": ..., "probes_run": N, "unique_suggestions": N,
     "suggestions": [{"suggestion": ..., "probe": ..., "probe_type": ...}, ...]}

Exit codes: 0 ok, 1 bad args, 2 network failure on every probe.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ENDPOINT = "https://suggestqueries.google.com/complete/search"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

QUESTION_PREFIXES = [
    "what", "how", "why", "when", "where", "who", "which",
    "can", "is", "does", "should", "will",
]
PREPOSITION_SUFFIXES = ["for", "with", "without", "vs", "to", "near", "like"]
COMPARISON_PROBES = [
    ("best {kw}", "comparison"),
    ("{kw} alternatives", "comparison"),
    ("{kw} review", "comparison"),
    ("{kw} pricing", "comparison"),
]
ALPHABET = "abcdefghijklmnopqrstuvwxyz"


def build_probes(keyword, modes):
    """Return list of (probe_query, probe_type) preserving order, deduped."""
    probes = []
    if "base" in modes or "all" in modes:
        probes.append((keyword, "base"))
    if "alphabet" in modes or "all" in modes:
        probes.extend((f"{keyword} {ch}", "alphabet") for ch in ALPHABET)
    if "questions" in modes or "all" in modes:
        probes.extend((f"{p} {keyword}", "question") for p in QUESTION_PREFIXES)
    if "prepositions" in modes or "all" in modes:
        probes.extend((f"{keyword} {s}", "preposition") for s in PREPOSITION_SUFFIXES)
    if "comparisons" in modes or "all" in modes:
        probes.extend((t.format(kw=keyword), pt) for t, pt in COMPARISON_PROBES)
    seen, out = set(), []
    for q, t in probes:
        if q not in seen:
            seen.add(q)
            out.append((q, t))
    return out


def fetch_suggestions(query, lang):
    """One suggest request. Returns list of suggestion strings."""
    params = urllib.parse.urlencode({"client": "firefox", "hl": lang, "q": query})
    req = urllib.request.Request(
        f"{ENDPOINT}?{params}", headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read()
    # Response is JSON: [query, [suggestion, ...], ...]. Encoding varies; try
    # utf-8 first, fall back to latin-1 (endpoint sometimes serves ISO-8859-1).
    try:
        data = json.loads(raw.decode("utf-8"))
    except UnicodeDecodeError:
        data = json.loads(raw.decode("latin-1"))
    if isinstance(data, list) and len(data) >= 2 and isinstance(data[1], list):
        return [s for s in data[1] if isinstance(s, str)]
    return []


def main():
    ap = argparse.ArgumentParser(description="Google autocomplete miner")
    ap.add_argument("keyword")
    ap.add_argument("--mode", default="all")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--format", default="json", choices=["json", "lines"])
    ap.add_argument("--delay", type=float, default=0.12)
    ap.add_argument("--max-probes", type=int, default=60)
    args = ap.parse_args()

    keyword = args.keyword.strip().lower()
    if not keyword:
        print("error: empty keyword", file=sys.stderr)
        return 1

    modes = {m.strip() for m in args.mode.split(",") if m.strip()}
    valid = {"all", "base", "alphabet", "questions", "prepositions", "comparisons"}
    if not modes or modes - valid:
        print(f"error: invalid --mode (valid: {sorted(valid)})", file=sys.stderr)
        return 1

    probes = build_probes(keyword, modes)[: args.max_probes]
    results = {}  # suggestion -> (probe, probe_type); first probe wins
    errors = 0
    for i, (probe, ptype) in enumerate(probes):
        try:
            for s in fetch_suggestions(probe, args.lang):
                s_norm = s.strip().lower()
                if s_norm and s_norm != keyword and s_norm not in results:
                    results[s_norm] = (probe, ptype)
        except (urllib.error.URLError, OSError, json.JSONDecodeError) as e:
            errors += 1
            print(f"warn: probe '{probe}' failed: {e}", file=sys.stderr)
        if i < len(probes) - 1:
            time.sleep(args.delay)

    if errors == len(probes):
        print("error: all probes failed (network/endpoint unavailable)", file=sys.stderr)
        return 2

    if args.format == "lines":
        for s in sorted(results):
            print(s)
    else:
        payload = {
            "keyword": keyword,
            "probes_run": len(probes),
            "probes_failed": errors,
            "unique_suggestions": len(results),
            "suggestions": [
                {"suggestion": s, "probe": p, "probe_type": t}
                for s, (p, t) in sorted(results.items())
            ],
        }
        print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
