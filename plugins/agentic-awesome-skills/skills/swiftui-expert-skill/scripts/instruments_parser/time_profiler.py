"""Time Profiler lane parser (schema `time-profile`).

Aggregates CPU samples by leaf symbol, keeps per-sample rows so that other
lanes can correlate by timestamp window.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

from . import xctrace, xml_utils

PREFERRED_SCHEMAS = ("time-profile",)
FALLBACK_SCHEMAS = ("time-sample",)  # no symbolication; used only if nothing else


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
            "lane": "time-profiler",
            "available": False,
            "notes": ["Time Profiler data not present in trace."],
        }

    xml_bytes = xctrace.export_schema(trace_path, schema, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    samples: list[dict] = []
    symbol_weight: dict[str, int] = defaultdict(int)
    symbol_samples: dict[str, int] = defaultdict(int)
    symbol_thread: dict[str, str] = {}
    processes: set[str] = set()
    total_weight = 0
    min_time: int | None = None
    max_time: int | None = None

    for row in stream:
        time_el = row.get("time")
        weight_el = row.get("weight")
        thread_el = row.get("thread")
        stack_el = row.get("stack")
        if stack_el is None or time_el is None or thread_el is None:
            continue

        sample_time_ns = xml_utils.int_text(stream.resolve(time_el))
        if not xml_utils.in_window(sample_time_ns, window):
            continue
        weight_ns = xml_utils.int_text(stream.resolve(weight_el)) or 0
        frames = xml_utils.extract_backtrace(stack_el, stream, max_frames=20)
        if not frames:
            continue

        thread = xml_utils.extract_thread(thread_el, stream)
        process_name = (thread.get("process") or {}).get("name")
        if process_name:
            processes.add(process_name)

        leaf = xml_utils.top_symbol(frames)
        symbol_weight[leaf] += weight_ns
        symbol_samples[leaf] += 1
        symbol_thread.setdefault(
            leaf, "main" if thread["is_main"] else thread.get("name", "")
        )
        total_weight += weight_ns

        if sample_time_ns is not None:
            min_time = sample_time_ns if min_time is None else min(min_time, sample_time_ns)
            max_time = sample_time_ns if max_time is None else max(max_time, sample_time_ns)

            samples.append({
                "time_ns": sample_time_ns,
                "weight_ns": weight_ns,
                "thread_name": thread["name"],
                "is_main": thread["is_main"],
                "process": process_name,
                "leaf_symbol": leaf,
                "frames": frames[:5],
            })

    samples.sort(key=lambda s: s["time_ns"])

    top = sorted(
        symbol_weight.items(), key=lambda kv: kv[1], reverse=True
    )[:top_n]
    top_offenders = [
        {
            "symbol": sym,
            "weight_ns": w,
            "weight_ms": round(w / 1_000_000, 2),
            "samples": symbol_samples[sym],
            "percent": round(100.0 * w / total_weight, 2) if total_weight else 0.0,
            "thread": symbol_thread.get(sym, ""),
        }
        for sym, w in top
    ]

    notes: list[str] = []
    if schema in FALLBACK_SCHEMAS:
        notes.append(
            f"Using fallback schema `{schema}`; backtraces may be unsymbolicated."
        )

    return {
        "lane": "time-profiler",
        "available": True,
        "schema_used": schema,
        "metrics": {
            "total_samples": len(samples),
            "total_weight_ns": total_weight,
            "total_weight_ms": round(total_weight / 1_000_000, 2),
            "window_start_ns": min_time,
            "window_end_ns": max_time,
            "processes": sorted(processes),
        },
        "top_offenders": top_offenders,
        "notes": notes,
        # Internal: retained for correlation. Stripped before JSON emission
        # if --slim is requested by the orchestrator.
        "_samples": samples,
    }


def _pick_schema(available: frozenset[str]) -> str | None:
    for s in PREFERRED_SCHEMAS + FALLBACK_SCHEMAS:
        if s in available:
            return s
    return None
