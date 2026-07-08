"""SwiftUI cause-graph lane (`swiftui-causes` schema).

Instruments emits one row per edge in SwiftUI's dependency graph: every time
a source node (a state change, user defaults observer, system event, etc.)
propagates to a destination node (a body evaluation, layout, creation), a
row is written with both endpoints as metadata values.

This lane aggregates those edges two ways:

- **By source node** — which attribute graph nodes are driving the most
  updates overall. The canonical "why is my app thrashing?" view; a
  `UserDefaultObserver.send()` showing up with 11k outgoing edges is a
  feedback storm.
- **By destination node** — which views/modifiers receive the most
  invalidations, and from whom. Use this to trace a hot view back to the
  source that keeps poking it.

The analyzer's main lane (`swiftui`) tells you *what* updates are
expensive; this lane tells you *why* they keep happening.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from . import xctrace, xml_utils

SCHEMA = "swiftui-causes"

# Metadata nodes render as space-separated field dumps ("A gray icon n/a n/a").
# We aggregate on the full fmt string so callers can spot specific edges like
# "@AppStorage TextStyleModifier.fontOption", but also expose the short head
# ("@AppStorage", "Creation of App", ...) for coarser grouping.


def analyze(
    trace_path: Path,
    toc_schemas: frozenset[str],
    top_n: int = 10,
    top_k_per_node: int = 5,
    window: tuple[int, int] | None = None,
    run: int = 1,
) -> dict[str, Any]:
    if SCHEMA not in toc_schemas:
        return {
            "lane": "swiftui-causes",
            "available": False,
            "notes": [
                "SwiftUI causes data not present (requires SwiftUI template on a real device).",
            ],
        }

    xml_bytes = xctrace.export_schema(trace_path, SCHEMA, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    source_edges: Counter[str] = Counter()
    destination_edges: Counter[str] = Counter()
    fanout: dict[str, Counter[str]] = defaultdict(Counter)
    fanin: dict[str, Counter[str]] = defaultdict(Counter)
    label_counts: Counter[str] = Counter()
    total_edges = 0

    for row in stream:
        time_el = xml_utils.first_present(row, "timestamp", "time")
        if time_el is not None:
            t_ns = xml_utils.int_text(stream.resolve(time_el))
            if t_ns is not None and not xml_utils.in_window(t_ns, window):
                continue

        src = _fmt(row, stream, "source-node")
        dst = _fmt(row, stream, "destination-node")
        if not src or not dst:
            continue

        source_edges[src] += 1
        destination_edges[dst] += 1
        fanout[src][dst] += 1
        fanin[dst][src] += 1

        label = _fmt(row, stream, "label")
        if label:
            label_counts[label] += 1

        total_edges += 1

    top_sources = [
        {
            "source": src,
            "edges": count,
            "top_destinations": [
                {"destination": d, "edges": c}
                for d, c in fanout[src].most_common(top_k_per_node)
            ],
        }
        for src, count in source_edges.most_common(top_n)
    ]

    top_destinations = [
        {
            "destination": dst,
            "edges": count,
            "top_sources": [
                {"source": s, "edges": c}
                for s, c in fanin[dst].most_common(top_k_per_node)
            ],
        }
        for dst, count in destination_edges.most_common(top_n)
    ]

    return {
        "lane": "swiftui-causes",
        "available": True,
        "schema_used": SCHEMA,
        "metrics": {
            "total_edges": total_edges,
            "unique_sources": len(source_edges),
            "unique_destinations": len(destination_edges),
            "top_labels": dict(label_counts.most_common(top_n)),
        },
        "top_sources": top_sources,
        "top_destinations": top_destinations,
        "notes": [],
    }


def fanin_for(
    trace_path: Path,
    toc_schemas: frozenset[str],
    destination_contains: str,
    top_k: int = 10,
    window: tuple[int, int] | None = None,
    run: int = 1,
) -> dict[str, Any]:
    """Return the top source nodes feeding any destination whose fmt string
    contains `destination_contains` (case-insensitive substring).

    Used when the agent has a suspect view from the `swiftui` lane and wants
    to know *who keeps invalidating it*. Does a full pass over the causes
    schema each time — cheap enough at typical trace sizes.
    """
    if SCHEMA not in toc_schemas:
        return {"available": False, "matches": []}

    needle = destination_contains.lower()
    xml_bytes = xctrace.export_schema(trace_path, SCHEMA, run=run)
    stream = xml_utils.RowStream(xml_bytes)

    matches: dict[str, Counter[str]] = defaultdict(Counter)
    totals: Counter[str] = Counter()

    for row in stream:
        time_el = xml_utils.first_present(row, "timestamp", "time")
        if time_el is not None:
            t_ns = xml_utils.int_text(stream.resolve(time_el))
            if t_ns is not None and not xml_utils.in_window(t_ns, window):
                continue

        dst = _fmt(row, stream, "destination-node")
        if not dst or needle not in dst.lower():
            continue
        src = _fmt(row, stream, "source-node")
        if not src:
            continue

        matches[dst][src] += 1
        totals[dst] += 1

    out = []
    for dst, count in totals.most_common(top_k):
        out.append({
            "destination": dst,
            "total_incoming_edges": count,
            "top_sources": [
                {"source": s, "edges": c}
                for s, c in matches[dst].most_common(top_k)
            ],
        })
    return {"available": True, "matches": out}


def _fmt(row, stream, key: str) -> str | None:
    el = row.get(key)
    if el is None:
        return None
    resolved = stream.resolve(el)
    return resolved.get("fmt") or xml_utils.str_text(resolved)
