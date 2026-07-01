"""Animation hitches lane parser.

Xcode 26 schema `hitches` columns: start, duration (hitch time), process,
is-system, swap-id, label, display, narrative-description. The
narrative-description field carries Apple's own attribution (e.g.
"Potentially expensive app update(s)") which is the highest-signal column.
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from . import xctrace, xml_utils

CANDIDATE_SCHEMAS = ("hitches", "animation-hitch", "hitch")

START_KEYS = ("start", "time", "sample-time")
DURATION_KEYS = ("duration", "hitch-duration", "frame-duration")


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
            "lane": "hitches",
            "available": False,
            "notes": ["Animation hitches not present in trace."],
        }

    xml_bytes = xctrace.export_schema(trace_path, schema, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    events: list[dict] = []
    narrative_counts: Counter[str] = Counter()
    system_count = 0

    for row in stream:
        start_ns = _first_int(row, stream, START_KEYS)
        duration_ns = _first_int(row, stream, DURATION_KEYS)
        if start_ns is None or duration_ns is None:
            continue
        if not xml_utils.event_overlaps_window(start_ns, start_ns + duration_ns, window):
            continue

        process_el = row.get("process")
        process = (
            xml_utils.extract_process(process_el, stream)
            if process_el is not None else None
        )

        narrative_el = row.get("narrative-description")
        narrative = xml_utils.str_text(stream.resolve(narrative_el)) if narrative_el is not None else None
        if narrative:
            narrative_counts[narrative] += 1

        is_system_el = row.get("is-system")
        is_system = _bool_text(stream.resolve(is_system_el)) if is_system_el is not None else None
        if is_system:
            system_count += 1

        events.append({
            "start_ns": start_ns,
            "end_ns": start_ns + duration_ns,
            "duration_ns": duration_ns,
            "hitch_duration_ns": duration_ns,  # Xcode 26 `duration` == hitch time
            "frame_duration_ns": None,
            "hitch_duration_ms": round(duration_ns / 1_000_000, 2),
            "frame_duration_ms": None,
            "start_ms": round(start_ns / 1_000_000, 2),
            "process": (process or {}).get("name"),
            "narrative": narrative,
            "is_system": bool(is_system) if is_system is not None else None,
        })

    events.sort(key=lambda e: e["duration_ns"], reverse=True)

    total_hitch_ms = sum(e["hitch_duration_ms"] for e in events)
    worst = events[0] if events else None

    per_process: dict[str, int] = {}
    for e in events:
        key = e["process"] or "unknown"
        per_process[key] = per_process.get(key, 0) + 1

    top_offenders = [
        {
            "start_ms": e["start_ms"],
            "hitch_duration_ms": e["hitch_duration_ms"],
            "frame_duration_ms": e["frame_duration_ms"],
            "process": e["process"],
            "narrative": e["narrative"],
            "is_system": e["is_system"],
        }
        for e in events[:top_n]
    ]

    return {
        "lane": "hitches",
        "available": True,
        "schema_used": schema,
        "metrics": {
            "count": len(events),
            "total_hitch_ms": round(total_hitch_ms, 2),
            "worst_hitch_ms": worst["hitch_duration_ms"] if worst else 0,
            "per_process": per_process,
            "system_hitches": system_count,
            "app_hitches": len(events) - system_count,
            "narrative_breakdown": dict(narrative_counts.most_common()),
        },
        "top_offenders": top_offenders,
        "notes": [],
        "_events": events,
    }


def _pick_schema(available: frozenset[str]) -> str | None:
    for s in CANDIDATE_SCHEMAS:
        if s in available:
            return s
    return None


def _first_int(row, stream, keys):
    for key in keys:
        el = row.get(key)
        if el is None:
            continue
        val = xml_utils.int_text(stream.resolve(el))
        if val is not None:
            return val
    return None


def _bool_text(elem) -> bool | None:
    txt = xml_utils.str_text(elem)
    if txt is None:
        return None
    return txt.strip() in ("1", "true", "True", "YES", "Yes")
