"""Hangs lane parser (schema `potential-hangs`).

The schema lacks inline backtraces — stacks come from Time Profiler samples
that overlap each hang's window. Correlation is done later in correlate.py.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from . import xctrace, xml_utils

PREFERRED_SCHEMAS = ("potential-hangs",)
FALLBACK_SCHEMAS = ("main-thread-hang", "hang", "hangs")


def analyze(
    trace_path: Path,
    toc_schemas: frozenset[str],
    top_n: int = 10,
    window: tuple[int, int] | None = None,
    run: int = 1,
) -> dict[str, Any]:
    schema = _pick_schema(toc_schemas)
    if schema is None:
        return {
            "lane": "hangs",
            "available": False,
            "notes": ["Hangs data not present in trace."],
        }

    xml_bytes = xctrace.export_schema(trace_path, schema, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    hangs: list[dict] = []
    for row in stream:
        start_el = row.get("start")
        dur_el = row.get("duration")
        type_el = row.get("hang-type")
        thread_el = row.get("thread")
        if start_el is None or dur_el is None:
            continue
        start_ns = xml_utils.int_text(stream.resolve(start_el))
        duration_ns = xml_utils.int_text(stream.resolve(dur_el))
        if start_ns is None or duration_ns is None:
            continue
        if not xml_utils.event_overlaps_window(start_ns, start_ns + duration_ns, window):
            continue
        hang_type = xml_utils.str_text(stream.resolve(type_el)) if type_el is not None else None
        thread = xml_utils.extract_thread(thread_el, stream) if thread_el is not None else None

        hangs.append({
            "start_ns": start_ns,
            "duration_ns": duration_ns,
            "end_ns": start_ns + duration_ns,
            "duration_ms": round(duration_ns / 1_000_000, 2),
            "start_ms": round(start_ns / 1_000_000, 2),
            "hang_type": hang_type or "Hang",
            "thread": thread,
        })

    hangs.sort(key=lambda h: h["duration_ns"], reverse=True)

    total_ms = sum(h["duration_ms"] for h in hangs)
    worst = hangs[0] if hangs else None

    # Severity buckets per Apple docs (Microhang: 250ms–500ms, Hang: ≥500ms).
    # We bucket by raw duration so the agent can reason about it.
    buckets = {"lt_250ms": 0, "250ms_1s": 0, "gt_1s": 0}
    for h in hangs:
        if h["duration_ms"] < 250:
            buckets["lt_250ms"] += 1
        elif h["duration_ms"] < 1000:
            buckets["250ms_1s"] += 1
        else:
            buckets["gt_1s"] += 1

    top_offenders = [
        {
            "start_ms": h["start_ms"],
            "duration_ms": h["duration_ms"],
            "hang_type": h["hang_type"],
            "thread": (h["thread"] or {}).get("name", ""),
        }
        for h in hangs[:top_n]
    ]

    return {
        "lane": "hangs",
        "available": True,
        "schema_used": schema,
        "metrics": {
            "count": len(hangs),
            "total_duration_ms": round(total_ms, 2),
            "worst_duration_ms": worst["duration_ms"] if worst else 0,
            "severity_buckets": buckets,
        },
        "top_offenders": top_offenders,
        "notes": [],
        "_events": hangs,  # retained for correlation
    }


def _pick_schema(available: frozenset[str]) -> str | None:
    for s in PREFERRED_SCHEMAS + FALLBACK_SCHEMAS:
        if s in available:
            return s
    return None
