#!/usr/bin/env python3
"""Render a Bumblebee NDJSON scan into a human-readable Markdown report.

Bumblebee emits one JSON record per line. Record types we know about:

- package           — an inventory record for a discovered package
- finding           — an exposure-catalog match (high signal)
- scan_summary      — emitted once at end of run, contains counts/duration
- diagnostic        — non-fatal warnings (skipped roots, parse errors)

Unknown record types are bucketed under "other" and counted but not
rendered in detail. The script never imports anything outside the
standard library — it has to run on whatever Python 3 ships with the
developer's machine.

Usage:
    python3 render_report.py <input.ndjson> <output.md>

Exit codes:
    0  success
    1  usage error
    2  input file unreadable or empty
    3  no records parsed (likely malformed file)
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path
from typing import Any


SEVERITY_ORDER = ["critical", "high", "medium", "low", "info", "unknown"]


def severity_rank(value: str | None) -> int:
    """Return a sort key for severities; unknown values sort last."""
    if not value:
        return len(SEVERITY_ORDER)
    try:
        return SEVERITY_ORDER.index(value.lower())
    except ValueError:
        return len(SEVERITY_ORDER)


def load_records(path: Path) -> list[dict[str, Any]]:
    """Parse NDJSON, tolerating blank lines and trailing whitespace.

    Malformed lines are reported on stderr but do not abort the run —
    Bumblebee can interleave records from multiple goroutines and a single
    truncated line should not lose the rest of the report.
    """
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            line = raw.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                print(
                    f"warning: skipping malformed line {lineno}: {exc}",
                    file=sys.stderr,
                )
    return records


def group_by_kind(records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for rec in records:
        kind = rec.get("record_type") or rec.get("type") or "unknown"
        groups[kind].append(rec)
    return groups


def render_findings(findings: list[dict[str, Any]]) -> str:
    """Findings are the most important section — render them first.

    Each finding carries the matched package's identity (Bumblebee uses
    `normalized_name` / `source_file` per docs/state-model.md) plus
    catalog metadata. We look up by the canonical Bumblebee names first
    and keep a small set of fallbacks so the helper still works against
    older schemas or hand-rolled fixtures.
    """
    if not findings:
        return "## Findings\n\nNo exposure-catalog matches.\n"

    # Sort by severity (critical first) then by package name.
    sorted_findings = sorted(
        findings,
        key=lambda f: (
            severity_rank(_get(f, "severity", "catalog_severity")),
            _get(f, "normalized_name", "package", "name", "package_name") or "",
        ),
    )

    out = [f"## Findings\n\n**{len(sorted_findings)} match(es) against exposure catalog.**\n"]
    for finding in sorted_findings:
        severity = _get(finding, "severity", "catalog_severity") or "unknown"
        catalog_id = _get(finding, "catalog_id", "advisory_id", "id") or "—"
        catalog_name = _get(finding, "catalog_name", "advisory", "name") or ""
        ecosystem = _get(finding, "ecosystem") or "?"
        pkg = _get(finding, "normalized_name", "package", "name", "package_name") or "?"
        version = _get(finding, "version", "matched_version") or "?"
        # Bumblebee emits `source_file` (and often a `project_path`);
        # legacy / demo records may use `source_path`. Render both when
        # available — responders need that traceability.
        source_file = _get(finding, "source_file", "source_path", "evidence_path", "path") or ""
        project_path = _get(finding, "project_path") or ""
        finding_type = _get(finding, "finding_type") or ""

        out.append(f"### [{severity.upper()}] {pkg}@{version} ({ecosystem})")
        out.append("")
        out.append(f"- Catalog entry: `{catalog_id}`" + (f" — {catalog_name}" if catalog_name else ""))
        if finding_type:
            out.append(f"- Finding type: {finding_type}")
        if source_file:
            out.append(f"- Source file: `{source_file}`")
        if project_path and project_path != source_file:
            out.append(f"- Project path: `{project_path}`")
        confidence = _get(finding, "confidence")
        if confidence:
            out.append(f"- Confidence: {confidence}")
        root_kind = _get(finding, "root_kind")
        if root_kind:
            out.append(f"- Root kind: {root_kind}")
        evidence = _get(finding, "evidence")
        if evidence and isinstance(evidence, (str, int, float)):
            out.append(f"- Evidence: {evidence}")
        out.append("")
    return "\n".join(out)


def render_inventory(packages: list[dict[str, Any]]) -> str:
    if not packages:
        return "## Inventory\n\nNo package records emitted (findings-only mode?).\n"

    by_ecosystem: Counter[str] = Counter()
    by_root_kind: Counter[str] = Counter()
    by_confidence: Counter[str] = Counter()
    for pkg in packages:
        by_ecosystem[pkg.get("ecosystem", "unknown")] += 1
        by_root_kind[pkg.get("root_kind", "unknown")] += 1
        by_confidence[pkg.get("confidence", "unknown")] += 1

    lines = [
        "## Inventory",
        "",
        f"Total package records: **{len(packages):,}**",
        "",
        "### By ecosystem",
        "",
        "| Ecosystem | Count |",
        "| --- | ---: |",
    ]
    for eco, count in by_ecosystem.most_common():
        lines.append(f"| {eco} | {count:,} |")

    lines += [
        "",
        "### By root kind",
        "",
        "| Root kind | Count |",
        "| --- | ---: |",
    ]
    for kind, count in by_root_kind.most_common():
        lines.append(f"| {kind} | {count:,} |")

    lines += [
        "",
        "### By confidence",
        "",
        "| Confidence | Count |",
        "| --- | ---: |",
    ]
    for conf, count in by_confidence.most_common():
        lines.append(f"| {conf} | {count:,} |")
    lines.append("")
    return "\n".join(lines)


def render_summary(summary_records: list[dict[str, Any]]) -> str:
    """Render scan_summary record(s).

    Bumblebee's real scan_summary (per docs/state-model.md) is flat —
    `scan_time`, `end_time`, `status`, `package_records_emitted`,
    `findings_emitted`, `diagnostics_count`, `roots`, plus HTTP-sink
    counters when applicable. We render those canonical fields first
    and still fall back to the older `counts`/`totals` shape for
    backwards compatibility with hand-rolled fixtures.
    """
    if not summary_records:
        return "## Scan summary\n\n_No `scan_summary` record found — the run may not have completed cleanly._\n"

    # Bumblebee canonical scan_summary fields (per docs/state-model.md).
    # Order matters: identity → status → timing → counts → delivery → versioning.
    canonical_fields = (
        "endpoint_id",
        "profile",
        "run_id",
        "status",
        "scan_time",
        "end_time",
        "timed_out",
        "package_records_emitted",
        "package_records_suppressed",
        "findings_emitted",
        "diagnostics_count",
        "http_batches_attempted",
        "http_batches_succeeded",
        "http_batches_failed",
        "http_last_status",
        "scanner_version",
        "schema_version",
    )

    out = ["## Scan summary", ""]
    for idx, rec in enumerate(summary_records, start=1):
        if len(summary_records) > 1:
            out.append(f"### Summary {idx}")
            out.append("")

        status = rec.get("status")
        if status and status != "complete":
            out.append(f"> **Status `{status}`** — this run is not a trustworthy complete snapshot. Treat as raw evidence only.")
            out.append("")

        # Canonical fields
        for key in canonical_fields:
            if key in rec and rec[key] not in (None, ""):
                out.append(f"- **{key}**: `{rec[key]}`")

        # Roots can be a list of objects; render compactly.
        roots = rec.get("roots")
        if roots:
            if isinstance(roots, list):
                out.append(f"- **roots**: {len(roots)} root(s) scanned")
                for r in roots[:20]:
                    if isinstance(r, dict):
                        # Common shape: {kind, path}
                        kind = r.get("kind") or r.get("root_kind") or "?"
                        path = r.get("path") or r.get("root") or "?"
                        out.append(f"  - `{kind}`: `{path}`")
                    else:
                        out.append(f"  - `{r}`")
                if len(roots) > 20:
                    out.append(f"  - _… {len(roots) - 20} more truncated_")
            else:
                out.append(f"- **roots**: `{roots}`")

        # Legacy / fixture shape: nested counts dict
        counts = rec.get("counts") or rec.get("totals") or {}
        if counts:
            out.append("- **counts** (legacy):")
            for k, v in counts.items():
                out.append(f"  - {k}: {v}")

        # Surface any remaining fields we didn't recognize so the helper
        # never silently drops data when the schema gains new keys.
        rendered = set(canonical_fields) | {"roots", "counts", "totals", "record_type", "type", "record_id"}
        extras = {k: v for k, v in rec.items() if k not in rendered and v not in (None, "", [], {})}
        if extras:
            out.append("- **other fields**:")
            for k, v in extras.items():
                out.append(f"  - {k}: `{v}`")

        out.append("")
    return "\n".join(out)


def render_diagnostics(diagnostics: list[dict[str, Any]]) -> str:
    if not diagnostics:
        return ""
    out = ["## Diagnostics", "", f"{len(diagnostics)} diagnostic record(s) emitted on stdout."]
    out.append("")
    for diag in diagnostics[:50]:  # Cap output — log file has full detail.
        level = diag.get("level", "info")
        msg = diag.get("message") or diag.get("msg") or json.dumps(diag, sort_keys=True)
        path = diag.get("path") or diag.get("source_path") or ""
        suffix = f" — `{path}`" if path else ""
        out.append(f"- **{level}**: {msg}{suffix}")
    if len(diagnostics) > 50:
        out.append("")
        out.append(f"_… {len(diagnostics) - 50} more diagnostic record(s) truncated. See the `.log` file for the full list._")
    out.append("")
    return "\n".join(out)


def _get(record: dict[str, Any], *keys: str) -> Any:
    """Return the first non-empty value found for any of the candidate keys."""
    for key in keys:
        value = record.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def build_report(records: list[dict[str, Any]], source_path: Path) -> str:
    groups = group_by_kind(records)
    findings = groups.get("finding", []) + groups.get("findings", [])
    packages = groups.get("package", []) + groups.get("packages", [])
    summaries = groups.get("scan_summary", [])
    diagnostics = groups.get("diagnostic", []) + groups.get("diagnostics", [])

    other_kinds = {
        kind: len(items)
        for kind, items in groups.items()
        if kind not in {"finding", "findings", "package", "packages", "scan_summary", "diagnostic", "diagnostics"}
    }

    generated = datetime.now(timezone.utc).isoformat(timespec="seconds")
    header = [
        "# Bumblebee Scan Report",
        "",
        f"- Source: `{source_path}`",
        f"- Generated: `{generated}`",
        f"- Total records: **{len(records):,}**",
    ]
    if other_kinds:
        header.append(f"- Other record types: {', '.join(f'{k} ({v})' for k, v in sorted(other_kinds.items()))}")
    header.append("")

    sections = [
        "\n".join(header),
        render_findings(findings),
        render_summary(summaries),
        render_inventory(packages),
        render_diagnostics(diagnostics),
    ]
    return "\n".join(s for s in sections if s).rstrip() + "\n"


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(f"usage: {safe_user_path(argv[0]).name} <input.ndjson> <output.md>", file=sys.stderr)
        return 1

    input_path = safe_user_path(argv[1])
    output_path = safe_user_path(argv[2])

    if not input_path.exists() or input_path.stat().st_size == 0:
        print(f"error: {input_path} is missing or empty", file=sys.stderr)
        return 2

    records = load_records(input_path)
    if not records:
        print("error: no JSON records parsed from input", file=sys.stderr)
        return 3

    report = build_report(records, input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    print(f"wrote {output_path} ({len(records)} records)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
