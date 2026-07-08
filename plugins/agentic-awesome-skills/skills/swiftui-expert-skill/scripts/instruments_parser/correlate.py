"""Cross-lane correlation: for each hang and top-N worst hitches, aggregate
Time Profiler samples and SwiftUI updates whose timestamps fall inside the
event window [start, start+duration]. Uses bisect so lookups stay O(log N)
per event.
"""
from __future__ import annotations

from bisect import bisect_left, bisect_right
from collections import defaultdict
from typing import Any


def build(lanes: dict[str, dict], top_hitches: int = 5, top_symbols: int = 5) -> list[dict]:
    """Produce a list of correlation entries.

    `lanes` is a dict keyed by lane name (time-profiler, hangs, hitches,
    swiftui) of their analyzer outputs.
    """
    tp = lanes.get("time-profiler")
    hangs = lanes.get("hangs")
    hitches = lanes.get("hitches")
    swiftui = lanes.get("swiftui")

    tp_index = _build_time_profile_index(tp)
    sui_events = (swiftui or {}).get("_events") if swiftui and swiftui.get("available") else None

    correlations: list[dict] = []

    if hangs and hangs.get("available"):
        for h in hangs.get("_events", []):
            correlations.append(
                _correlate_event(
                    trigger_lane="hangs",
                    start_ns=h["start_ns"],
                    end_ns=h["end_ns"],
                    extra={"hang_type": h["hang_type"]},
                    tp_index=tp_index,
                    sui_events=sui_events,
                    top_symbols=top_symbols,
                )
            )

    if hitches and hitches.get("available"):
        worst_hitches = hitches.get("_events", [])[:top_hitches]
        for hi in worst_hitches:
            correlations.append(
                _correlate_event(
                    trigger_lane="hitches",
                    start_ns=hi["start_ns"],
                    end_ns=hi["end_ns"],
                    extra={
                        "frame_duration_ms": hi["frame_duration_ms"],
                        "hitch_duration_ms": hi["hitch_duration_ms"],
                    },
                    tp_index=tp_index,
                    sui_events=sui_events,
                    top_symbols=top_symbols,
                )
            )

    return correlations


# --- Internal -------------------------------------------------------------

def _build_time_profile_index(tp: dict | None):
    if not tp or not tp.get("available"):
        return None
    samples = tp.get("_samples") or []
    if not samples:
        return None
    # Samples are already sorted by time in time_profiler.analyze.
    times = [s["time_ns"] for s in samples]
    return {"times": times, "samples": samples}


def _correlate_event(
    trigger_lane: str,
    start_ns: int,
    end_ns: int,
    extra: dict,
    tp_index: dict | None,
    sui_events: list[dict] | None,
    top_symbols: int,
) -> dict[str, Any]:
    entry: dict[str, Any] = {
        "trigger": {
            "lane": trigger_lane,
            "start_ms": round(start_ns / 1_000_000, 2),
            "end_ms": round(end_ns / 1_000_000, 2),
            "duration_ms": round((end_ns - start_ns) / 1_000_000, 2),
            **extra,
        },
    }

    if tp_index is not None:
        tp = _time_profile_hot_symbols(
            tp_index, start_ns, end_ns, top_symbols
        )
        duration_ns = end_ns - start_ns
        # Sample rate is 1ms/sample on standard Time Profiler. If the window
        # is N ms long we'd expect ~N main-thread samples if main was fully
        # running; fewer means main was blocked (I/O, lock, etc.).
        expected_if_running = max(1, duration_ns // 1_000_000)
        coverage_pct = min(100.0, 100.0 * tp["samples_main"] / expected_if_running)
        entry["time_profiler_main_thread"] = {
            "samples_in_window": tp["samples_total"],
            "samples_on_main": tp["samples_main"],
            "main_running_coverage_pct": round(coverage_pct, 1),
            "hot_symbols": tp["hot_symbols"],
        }

    if sui_events is not None:
        sui_overlap = _swiftui_overlaps(sui_events, start_ns, end_ns)
        entry["swiftui_overlapping_updates"] = sui_overlap

    return entry


def _time_profile_hot_symbols(
    tp_index: dict, start_ns: int, end_ns: int, top_n: int
) -> dict:
    """Return main-thread hot symbols in the given window.

    Hang/hitch/SwiftUI correlations are all main-thread responsiveness
    problems, so worker-thread symbols are noise. We also return a coverage
    metric — when main was blocked on I/O or a lock, the window will have
    far fewer samples than its duration would predict, and that signal is
    what tells the agent "this was blocked, not CPU-bound".
    """
    times = tp_index["times"]
    samples = tp_index["samples"]
    lo = bisect_left(times, start_ns)
    hi = bisect_right(times, end_ns)
    window = samples[lo:hi]
    if not window:
        return {"samples_total": 0, "samples_main": 0, "hot_symbols": []}

    main_samples = [s for s in window if s["is_main"]]
    weight_by_symbol: dict[str, int] = defaultdict(int)
    count_by_symbol: dict[str, int] = defaultdict(int)
    for s in main_samples:
        weight_by_symbol[s["leaf_symbol"]] += s["weight_ns"]
        count_by_symbol[s["leaf_symbol"]] += 1
    total_weight = sum(weight_by_symbol.values()) or 1

    ranked = sorted(weight_by_symbol.items(), key=lambda kv: kv[1], reverse=True)
    hot = []
    for symbol, weight in ranked[:top_n]:
        hot.append({
            "symbol": symbol,
            "samples": count_by_symbol[symbol],
            "weight_ms": round(weight / 1_000_000, 2),
            "percent_of_main": round(100.0 * weight / total_weight, 2),
        })
    return {
        "samples_total": len(window),
        "samples_main": len(main_samples),
        "hot_symbols": hot,
    }


def _swiftui_overlaps(
    events: list[dict], start_ns: int, end_ns: int
) -> list[dict]:
    # Events aren't guaranteed sorted by start_ns here (we sort by duration in
    # swiftui.analyze). Linear scan; SwiftUI event counts are typically small.
    out: list[dict] = []
    for e in events:
        if e["end_ns"] < start_ns or e["start_ns"] > end_ns:
            continue
        out.append({
            "view": e["view"],
            "duration_ms": e["duration_ms"],
            "start_ms": e["start_ms"],
        })
    # Worst first.
    out.sort(key=lambda x: x["duration_ms"], reverse=True)
    return out[:10]
