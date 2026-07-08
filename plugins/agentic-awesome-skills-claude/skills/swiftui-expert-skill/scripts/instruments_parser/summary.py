"""Markdown summary renderer for the combined trace analysis."""
from __future__ import annotations


def render(result: dict) -> str:
    lines: list[str] = []
    trace = result.get("trace", "?")
    header = result.get("xctrace_version") or ""
    template = result.get("template") or ""
    duration_s = result.get("duration_s")
    lines.append(f"# Instruments Trace Analysis")
    meta = [p for p in [f"Trace: `{trace}`", header, template] if p]
    lines.append("  •  ".join(meta))
    if duration_s is not None:
        lines.append(f"Recording duration: {duration_s:.2f}s")
    lines.append("")

    lanes_by_name = {lane["lane"]: lane for lane in result.get("lanes", [])}

    _render_time_profiler(lines, lanes_by_name.get("time-profiler"))
    _render_hangs(lines, lanes_by_name.get("hangs"))
    _render_hitches(lines, lanes_by_name.get("hitches"))
    _render_swiftui(lines, lanes_by_name.get("swiftui"))
    _render_causes(lines, lanes_by_name.get("swiftui-causes"))
    _render_correlations(lines, result.get("correlations", []))

    return "\n".join(lines).rstrip() + "\n"


def _skipped_block(title: str, lane: dict | None) -> list[str]:
    if lane is None:
        return [f"## {title} — skipped (lane module not run)", ""]
    notes = lane.get("notes") or []
    note_text = f" — {notes[0]}" if notes else ""
    return [f"## {title} — skipped{note_text}", ""]


def _render_time_profiler(lines: list[str], lane: dict | None) -> None:
    if not lane or not lane.get("available"):
        lines.extend(_skipped_block("Time Profiler", lane))
        return
    m = lane["metrics"]
    lines.append(
        f"## Time Profiler — {m['total_samples']:,} samples, "
        f"{m['total_weight_ms']:.0f}ms CPU time"
    )
    if m.get("processes"):
        lines.append(f"Processes: {', '.join(m['processes'])}")
    lines.append("")
    if lane["top_offenders"]:
        lines.append("Top offenders:")
        for i, o in enumerate(lane["top_offenders"], 1):
            lines.append(
                f"{i}. `{_truncate(o['symbol'], 90)}` — "
                f"{o['percent']:.1f}% ({o['weight_ms']:.0f}ms, "
                f"{o['samples']} samples, {_short_thread(o['thread'])})"
            )
    for note in lane.get("notes") or []:
        lines.append(f"> {note}")
    lines.append("")


def _render_hangs(lines: list[str], lane: dict | None) -> None:
    if not lane or not lane.get("available"):
        lines.extend(_skipped_block("Hangs", lane))
        return
    m = lane["metrics"]
    buckets = m["severity_buckets"]
    lines.append(
        f"## Hangs — {m['count']} hangs, {m['total_duration_ms']:.0f}ms total, "
        f"worst {m['worst_duration_ms']:.0f}ms"
    )
    lines.append(
        f"Severity: <250ms={buckets['lt_250ms']}, "
        f"250ms–1s={buckets['250ms_1s']}, >1s={buckets['gt_1s']}"
    )
    lines.append("")
    for i, h in enumerate(lane["top_offenders"], 1):
        lines.append(
            f"{i}. {h['duration_ms']:.0f}ms {h['hang_type']} at "
            f"{h['start_ms']:.2f}ms on {_short_thread(h['thread'])}"
        )
    lines.append("")


def _render_hitches(lines: list[str], lane: dict | None) -> None:
    if not lane or not lane.get("available"):
        lines.extend(_skipped_block("Animation Hitches", lane))
        return
    m = lane["metrics"]
    lines.append(
        f"## Animation Hitches — {m['count']} hitches, "
        f"{m['total_hitch_ms']:.0f}ms total, worst {m['worst_hitch_ms']:.0f}ms"
    )
    if m.get("per_process"):
        pp = ", ".join(f"{k}={v}" for k, v in m["per_process"].items())
        lines.append(f"By process: {pp}")
    lines.append("")
    if m.get("narrative_breakdown"):
        nb = ", ".join(f"{k}={v}" for k, v in m["narrative_breakdown"].items() if k)
        if nb:
            lines.append(f"Apple attribution: {nb}")
    if m.get("system_hitches") is not None:
        lines.append(
            f"System vs app: system={m['system_hitches']}, app={m['app_hitches']}"
        )
    lines.append("")
    for i, h in enumerate(lane["top_offenders"], 1):
        narrative = f" — {h['narrative']}" if h.get("narrative") else ""
        src = " [system]" if h.get("is_system") else ""
        proc = f" ({h['process']})" if h.get("process") else ""
        lines.append(
            f"{i}. {h['hitch_duration_ms']:.0f}ms at {h['start_ms']:.2f}ms"
            f"{proc}{src}{narrative}"
        )
    lines.append("")


def _render_swiftui(lines: list[str], lane: dict | None) -> None:
    if not lane or not lane.get("available"):
        lines.extend(_skipped_block("SwiftUI", lane))
        return
    m = lane["metrics"]
    lines.append(
        f"## SwiftUI — {m['total_events']:,} updates across "
        f"{m['unique_views']} views, {m['total_duration_ms']:.0f}ms total"
    )
    if m.get("severity_breakdown"):
        sb = ", ".join(f"{k}={v}" for k, v in m["severity_breakdown"].items())
        lines.append(f"Severity: {sb}")
    if m.get("update_type_breakdown"):
        ub = ", ".join(f"{k}={v}" for k, v in m["update_type_breakdown"].items())
        lines.append(f"Update types: {ub}")
    lines.append("")
    if lane["top_offenders"]:
        lines.append("Heaviest views (by total body time):")
        for i, v in enumerate(lane["top_offenders"], 1):
            lines.append(
                f"{i}. `{_truncate(v['view'], 80)}` — {v['total_ms']:.0f}ms total, "
                f"{v['count']} updates (avg {v['avg_ms']:.2f}ms)"
            )
    if lane.get("high_severity_events"):
        lines.append("")
        lines.append("High-severity updates:")
        for i, e in enumerate(lane["high_severity_events"][:5], 1):
            cat = f" [{e['category']}]" if e.get("category") else ""
            lines.append(
                f"{i}. `{_truncate(e['view'], 60)}` — "
                f"{e['severity']} ({e['duration_ms']:.2f}ms at {e['start_ms']:.2f}ms){cat}"
            )
    lines.append("")


def _render_causes(lines: list[str], lane: dict | None) -> None:
    if not lane or not lane.get("available"):
        lines.extend(_skipped_block("SwiftUI Cause Graph", lane))
        return
    m = lane["metrics"]
    lines.append(
        f"## SwiftUI Cause Graph — {m['total_edges']:,} edges, "
        f"{m['unique_sources']} sources → {m['unique_destinations']} destinations"
    )
    lines.append("")
    if lane.get("top_sources"):
        lines.append("Top sources (who's driving the most updates):")
        for i, s in enumerate(lane["top_sources"][:5], 1):
            lines.append(f"{i}. `{_truncate(s['source'], 80)}` — {s['edges']:,} edges")
            for d in s["top_destinations"][:3]:
                lines.append(
                    f"    → `{_truncate(d['destination'], 70)}` {d['edges']:,}"
                )
    if lane.get("top_destinations"):
        lines.append("")
        lines.append("Top destinations (who's being invalidated most):")
        for i, d in enumerate(lane["top_destinations"][:5], 1):
            lines.append(f"{i}. `{_truncate(d['destination'], 80)}` — {d['edges']:,} edges")
            for s in d["top_sources"][:3]:
                lines.append(
                    f"    ← `{_truncate(s['source'], 70)}` {s['edges']:,}"
                )
    lines.append("")


def _render_correlations(lines: list[str], correlations: list[dict]) -> None:
    if not correlations:
        return
    lines.append("## Correlations")
    lines.append("")
    for c in correlations:
        t = c["trigger"]
        head = (
            f"- **{t['lane']}** at {t['start_ms']:.2f}ms "
            f"({t['duration_ms']:.0f}ms)"
        )
        if t.get("hang_type"):
            head += f" — {t['hang_type']}"
        lines.append(head)

        tp = c.get("time_profiler_main_thread")
        if tp is not None:
            cov = tp["main_running_coverage_pct"]
            lines.append(
                f"  - Main thread: {tp['samples_on_main']} running samples "
                f"({cov:.0f}% coverage — "
                f"{'blocked' if cov < 25 else 'mostly running'})"
            )
            for s in tp["hot_symbols"][:3]:
                lines.append(
                    f"    · `{_truncate(s['symbol'], 80)}` "
                    f"{s['percent_of_main']:.0f}% ({s['samples']} samples)"
                )
            if not tp["hot_symbols"]:
                lines.append("    · no main-thread samples in window")

        sui = c.get("swiftui_overlapping_updates")
        if sui:
            for s in sui[:3]:
                lines.append(
                    f"  - SwiftUI: `{s['view']}` {s['duration_ms']:.2f}ms "
                    f"(at {s['start_ms']:.2f}ms)"
                )
    lines.append("")


def _short_thread(name: str) -> str:
    if not name:
        return ""
    if name.startswith("Main Thread") or name == "main":
        return "main"
    # "NowPlaying Gigs (0x251990d) (NowPlaying Gigs, pid: 28401)" -> "tid 0x251990d"
    tid_start = name.find("(0x")
    if tid_start != -1:
        start = tid_start + 1
        end = name.find(")", start)
        if end != -1:
            return f"tid {name[start:end]}"
    return name[:40]


def _truncate(s: str, n: int) -> str:
    if len(s) <= n:
        return s
    return s[: n - 1] + "…"
