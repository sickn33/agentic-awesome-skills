"""Discovery helpers for os_log messages and os_signpost intervals.

These let an agent locate a focus window (e.g. "after the log saying X",
"during signpost Y") before running the main lane analysis.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from . import xctrace, xml_utils

OS_LOG_SCHEMA = "os-log"
OS_SIGNPOST_SCHEMA = "os-signpost"
OS_SIGNPOST_INTERVAL_SCHEMA = "os-signpost-interval"


def list_logs(
    trace_path: Path,
    toc_schemas: frozenset[str],
    subsystem: str | None = None,
    category: str | None = None,
    message_contains: str | None = None,
    message_type: str | None = None,
    limit: int | None = None,
    window_ns: tuple[int, int] | None = None,
    run: int = 1,
) -> list[dict[str, Any]]:
    """Return os_log entries, optionally filtered. Case-insensitive contains.

    `limit` counts *post-filter* matches — including the window filter — so
    the caller gets N matching logs inside the window rather than the first
    N matching logs that might all fall outside it.
    """
    if OS_LOG_SCHEMA not in toc_schemas:
        return []
    xml_bytes = xctrace.export_schema(trace_path, OS_LOG_SCHEMA, run=run)
    stream = xml_utils.RowStream(xml_bytes)
    needle = message_contains.lower() if message_contains else None

    out: list[dict[str, Any]] = []
    for row in stream:
        time_el = row.get("time")
        if time_el is None:
            continue
        time_ns = xml_utils.int_text(stream.resolve(time_el))
        if time_ns is None:
            continue
        if not xml_utils.in_window(time_ns, window_ns):
            continue

        sub = _str_of(row, stream, "subsystem")
        cat = _str_of(row, stream, "category")
        typ = _str_of(row, stream, "message-type")
        fmt = _str_of(row, stream, "format-string")
        msg = _str_of(row, stream, "message") or fmt

        if subsystem and (sub or "") != subsystem:
            continue
        if category and (cat or "") != category:
            continue
        if message_type and (typ or "") != message_type:
            continue
        if needle and needle not in (msg or "").lower() and needle not in (fmt or "").lower():
            continue

        process_el = row.get("process")
        process = (
            xml_utils.extract_process(process_el, stream).get("name")
            if process_el is not None else None
        )

        out.append({
            "time_ns": time_ns,
            "time_ms": round(time_ns / 1_000_000, 3),
            "type": typ,
            "subsystem": sub,
            "category": cat,
            "process": process,
            "message": msg,
            "format_string": fmt,
        })
        if limit is not None and len(out) >= limit:
            break

    out.sort(key=lambda e: e["time_ns"])
    return out


def list_signposts(
    trace_path: Path,
    toc_schemas: frozenset[str],
    name_contains: str | None = None,
    subsystem: str | None = None,
    category: str | None = None,
    window_ns: tuple[int, int] | None = None,
    run: int = 1,
) -> dict[str, list[dict[str, Any]]]:
    """Return signpost intervals (paired begin/end) plus single-point events.

    Shape: { "intervals": [...], "events": [...] }. Intervals have
    start_ms/end_ms/duration_ms; events have a single time_ms.

    Reads two complementary schemas:
      * `os-signpost-interval`: already-paired intervals (this is where
        user-emitted signposts like com.example.MyApp typically land).
      * `os-signpost`: raw begin/end/event rows; we pair begins with ends
        ourselves and fall back to point events for unpaired rows. Most
        Apple-framework signposts (CloudKit, AppKit, …) live here.

    Filters are AND-combined. `name_contains` is a case-insensitive substring
    match. `window_ns` keeps intervals that overlap the window (not strict
    containment) and point events whose timestamp falls inside it.
    """
    # The two signpost schemas overlap: every paired begin/end in `os-signpost`
    # also shows up as a row in `os-signpost-interval`. To avoid duplicates we
    # prefer the pre-paired schema for intervals and only mine `os-signpost`
    # for point events (and for begin/end pairing as a fallback when the
    # interval schema is missing — older traces).
    intervals: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []

    has_intervals = OS_SIGNPOST_INTERVAL_SCHEMA in toc_schemas
    if has_intervals:
        intervals.extend(_read_interval_schema(trace_path, run=run))

    if OS_SIGNPOST_SCHEMA in toc_schemas:
        more_intervals, more_events = _read_event_schema(trace_path, run=run)
        if not has_intervals:
            intervals.extend(more_intervals)
        events.extend(more_events)

    intervals.sort(key=lambda i: i["start_ns"])
    events.sort(key=lambda e: e["time_ns"])

    needle = name_contains.lower() if name_contains else None

    def _matches(entry: dict) -> bool:
        if subsystem and (entry.get("subsystem") or "") != subsystem:
            return False
        if category and (entry.get("category") or "") != category:
            return False
        if needle and needle not in (entry.get("name") or "").lower():
            return False
        return True

    if subsystem or category or needle:
        intervals = [i for i in intervals if _matches(i)]
        events = [e for e in events if _matches(e)]

    if window_ns is not None:
        s, e = window_ns
        intervals = [
            i for i in intervals
            if not (i["end_ns"] < s or i["start_ns"] > e)
        ]
        events = [ev for ev in events if s <= ev["time_ns"] <= e]

    return {"intervals": intervals, "events": events}


def _read_interval_schema(trace_path: Path, run: int = 1) -> list[dict[str, Any]]:
    """Read the os-signpost-interval schema (pre-paired intervals)."""
    xml_bytes = xctrace.export_schema(trace_path, OS_SIGNPOST_INTERVAL_SCHEMA, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    out: list[dict[str, Any]] = []
    for row in stream:
        start_el = xml_utils.first_present(row, "start", "time")
        dur_el = row.get("duration")
        if start_el is None or dur_el is None:
            continue
        start_ns = xml_utils.int_text(stream.resolve(start_el))
        dur_ns = xml_utils.int_text(stream.resolve(dur_el))
        if start_ns is None or dur_ns is None:
            continue
        end_ns = start_ns + dur_ns

        name = _str_of(row, stream, "name")
        sub = _str_of(row, stream, "subsystem")
        cat = _str_of(row, stream, "category")
        signpost_id = _str_of(row, stream, "identifier") or _str_of(row, stream, "signpost-id")
        process_el = row.get("process")
        process = (
            xml_utils.extract_process(process_el, stream).get("name")
            if process_el is not None else None
        )

        out.append({
            "start_ns": start_ns,
            "end_ns": end_ns,
            "duration_ns": dur_ns,
            "start_ms": round(start_ns / 1_000_000, 3),
            "end_ms": round(end_ns / 1_000_000, 3),
            "duration_ms": round(dur_ns / 1_000_000, 3),
            "name": name,
            "subsystem": sub,
            "category": cat,
            "process": process,
            "signpost_id": signpost_id,
        })
    return out


def _read_event_schema(
    trace_path: Path,
    run: int = 1,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Read the os-signpost schema and pair begin/end rows into intervals."""
    xml_bytes = xctrace.export_schema(trace_path, OS_SIGNPOST_SCHEMA, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    pending: dict[tuple, dict] = {}
    intervals: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []

    for row in stream:
        time_el = xml_utils.first_present(row, "time", "start")
        if time_el is None:
            continue
        time_ns = xml_utils.int_text(stream.resolve(time_el))
        if time_ns is None:
            continue

        name = _str_of(row, stream, "name")
        sub = _str_of(row, stream, "subsystem")
        cat = _str_of(row, stream, "category")
        event_type = _str_of(row, stream, "event-type") or _str_of(row, stream, "message-type")
        signpost_id = _str_of(row, stream, "signpost-id") or _str_of(row, stream, "identifier")
        process_el = row.get("process")
        process = (
            xml_utils.extract_process(process_el, stream).get("name")
            if process_el is not None else None
        )

        key = (process, sub, cat, name, signpost_id)
        etype = (event_type or "").lower()

        if etype in ("begin", "interval begin", "start"):
            pending[key] = {"start_ns": time_ns, "name": name,
                            "subsystem": sub, "category": cat,
                            "process": process, "signpost_id": signpost_id}
        elif etype in ("end", "interval end", "stop"):
            start = pending.pop(key, None)
            if start is not None:
                dur_ns = time_ns - start["start_ns"]
                intervals.append({
                    **start,
                    "end_ns": time_ns,
                    "duration_ns": dur_ns,
                    "start_ms": round(start["start_ns"] / 1_000_000, 3),
                    "end_ms": round(time_ns / 1_000_000, 3),
                    "duration_ms": round(dur_ns / 1_000_000, 3),
                })
            else:
                events.append(_point_event(time_ns, name, sub, cat,
                                            process, signpost_id, event_type))
        else:
            events.append(_point_event(time_ns, name, sub, cat,
                                        process, signpost_id, event_type))

    # Unclosed begins are surfaced as point events so nothing is silently dropped.
    for info in pending.values():
        events.append(_point_event(info["start_ns"], info["name"],
                                    info["subsystem"], info["category"],
                                    info["process"], info["signpost_id"],
                                    "Begin (unclosed)"))

    return intervals, events


def _point_event(time_ns, name, subsystem, category, process, signpost_id, event_type):
    return {
        "time_ns": time_ns,
        "time_ms": round(time_ns / 1_000_000, 3),
        "name": name,
        "subsystem": subsystem,
        "category": category,
        "process": process,
        "signpost_id": signpost_id,
        "event_type": event_type,
    }


def _str_of(row, stream, key):
    el = row.get(key)
    if el is None:
        return None
    resolved = stream.resolve(el)
    txt = xml_utils.str_text(resolved) or resolved.get("fmt")
    return txt
