"""SwiftUI lane parser (Xcode 26+).

Primary schema is `swiftui-updates` with columns: start, duration, id,
update-type, allocations, description, category, view-hierarchy, module,
view-name, process, thread, root-causes, severity, cause-graph-node,
full-cause-graph-node.

We aggregate by view-name across all SwiftUI schemas (future-proofing against
schema renames) and break severity out separately so the agent can focus on
the high-severity rows.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from . import xctrace, xml_utils

START_KEYS = ("start", "time", "sample-time", "timestamp")
DURATION_KEYS = ("duration", "body-duration", "update-duration")
VIEW_KEYS = ("view-name", "view", "view-type", "name", "type")
MODULE_KEYS = ("module",)
CATEGORY_KEYS = ("category",)
UPDATE_TYPE_KEYS = ("update-type",)
SEVERITY_KEYS = ("severity",)
DESCRIPTION_KEYS = ("description",)

HIGH_SEVERITIES = {"High", "Very High", "Severe", "Critical"}

# Ongoing / unterminated updates carry a sentinel duration (≈ UINT64_MAX-ish).
# Any duration longer than an hour is almost certainly that sentinel and would
# break aggregates + the correlation overlap check.
_SENTINEL_DURATION_NS = 60 * 60 * 1_000_000_000  # 1 hour


def analyze(
    trace_path: Path,
    toc_schemas: frozenset[str],
    top_n: int = 10,
    window: tuple[int, int] | None = None,
    run: int = 1,
) -> dict[str, Any]:
    schemas = sorted(
        s for s in toc_schemas
        if s.startswith("swiftui") and not s.endswith("-causes")
    )
    if not schemas:
        return {
            "lane": "swiftui",
            "available": False,
            "notes": ["SwiftUI lane not in trace (Xcode 26+ SwiftUI template required)."],
        }

    events: list[dict] = []
    per_view_total_ns: dict[str, int] = defaultdict(int)
    per_view_count: dict[str, int] = defaultdict(int)
    severity_counts: Counter[str] = Counter()
    update_type_counts: Counter[str] = Counter()
    category_counts: Counter[str] = Counter()

    for schema in schemas:
        xml_bytes = xctrace.export_schema(trace_path, schema, run=run)
        stream = xml_utils.RowStream(xml_bytes)
        for row in stream:
            start_ns = _first_int(row, stream, START_KEYS)
            dur_ns = _first_int(row, stream, DURATION_KEYS)
            if start_ns is None or dur_ns is None:
                continue
            if dur_ns < 0 or dur_ns > _SENTINEL_DURATION_NS:
                # Unterminated / ongoing update; skip so it doesn't poison
                # totals and the correlation overlap check.
                continue
            if not xml_utils.event_overlaps_window(start_ns, start_ns + dur_ns, window):
                continue

            view = _first_str(row, stream, VIEW_KEYS)
            module = _first_str(row, stream, MODULE_KEYS)
            category = _first_str(row, stream, CATEGORY_KEYS)
            update_type = _first_str(row, stream, UPDATE_TYPE_KEYS)
            severity = _first_str(row, stream, SEVERITY_KEYS)
            description = _first_str(row, stream, DESCRIPTION_KEYS)
            # Fall back through description → category → update-type so the
            # agent sees "EnvironmentWriter: RootEnvironment" instead of
            # "<unknown>" when SwiftUI doesn't record a view type.
            if not view:
                view = description or category or update_type or "<unknown>"

            per_view_total_ns[view] += dur_ns
            per_view_count[view] += 1
            if severity:
                severity_counts[severity] += 1
            if update_type:
                update_type_counts[update_type] += 1
            if category:
                category_counts[category] += 1

            events.append({
                "schema": schema,
                "start_ns": start_ns,
                "end_ns": start_ns + dur_ns,
                "duration_ns": dur_ns,
                "duration_ms": round(dur_ns / 1_000_000, 2),
                "start_ms": round(start_ns / 1_000_000, 2),
                "view": view,
                "module": module,
                "category": category,
                "update_type": update_type,
                "severity": severity,
                "description": description,
            })

    events.sort(key=lambda e: e["duration_ns"], reverse=True)

    top_by_total = sorted(
        per_view_total_ns.items(), key=lambda kv: kv[1], reverse=True
    )[:top_n]
    top_offenders = [
        {
            "view": view,
            "total_ms": round(total_ns / 1_000_000, 2),
            "count": per_view_count[view],
            "avg_ms": round(total_ns / per_view_count[view] / 1_000_000, 2),
        }
        for view, total_ns in top_by_total
    ]

    high_severity = [
        {
            "view": e["view"],
            "severity": e["severity"],
            "duration_ms": e["duration_ms"],
            "start_ms": e["start_ms"],
            "category": e["category"],
            "update_type": e["update_type"],
            "description": e["description"],
        }
        for e in events if e["severity"] in HIGH_SEVERITIES
    ][:top_n]

    longest = [
        {
            "view": e["view"],
            "duration_ms": e["duration_ms"],
            "start_ms": e["start_ms"],
            "category": e["category"],
            "update_type": e["update_type"],
            "severity": e["severity"],
        }
        for e in events[:top_n]
    ]

    return {
        "lane": "swiftui",
        "available": True,
        "schemas_used": schemas,
        "metrics": {
            "total_events": len(events),
            "unique_views": len(per_view_total_ns),
            "total_duration_ms": round(
                sum(per_view_total_ns.values()) / 1_000_000, 2
            ),
            "severity_breakdown": dict(severity_counts.most_common()),
            "update_type_breakdown": dict(update_type_counts.most_common()),
            "category_breakdown": dict(category_counts.most_common()),
        },
        "top_offenders": top_offenders,
        "longest_single_events": longest,
        "high_severity_events": high_severity,
        "notes": [],
        "_events": events,
    }


def _first_int(row, stream, keys):
    for key in keys:
        el = row.get(key)
        if el is None:
            continue
        val = xml_utils.int_text(stream.resolve(el))
        if val is not None:
            return val
    return None


def _first_str(row, stream, keys):
    for key in keys:
        el = row.get(key)
        if el is None:
            continue
        resolved = stream.resolve(el)
        txt = xml_utils.str_text(resolved) or resolved.get("fmt")
        if txt:
            return txt
    return None
