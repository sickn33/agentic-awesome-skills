"""Thin wrapper around the `xctrace` CLI."""
from __future__ import annotations

import subprocess
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RunInfo:
    """Per-run metadata and schemas. Instruments traces can hold multiple runs."""
    number: int
    template_name: str | None
    duration_s: float | None
    start_date: str | None
    end_date: str | None
    schemas: frozenset[str]


@dataclass(frozen=True)
class TraceInfo:
    xctrace_version: str
    runs: tuple[RunInfo, ...]

    def get_run(self, number: int) -> RunInfo:
        for r in self.runs:
            if r.number == number:
                return r
        available = ", ".join(str(r.number) for r in self.runs)
        raise KeyError(f"run {number} not in trace (available: {available})")


def version() -> str:
    out = subprocess.run(
        ["xctrace", "version"], capture_output=True, text=True, check=True
    )
    return out.stdout.strip()


def toc(trace_path: Path) -> TraceInfo:
    """Export the trace's table of contents and return per-run metadata.

    The TOC is small (a few KB) so we load it fully rather than streaming.
    """
    xml_bytes = _run_export(trace_path, ["--toc"])
    root = ET.fromstring(xml_bytes)

    instruments = _find_text(root, ".//instruments-version") or ""

    runs: list[RunInfo] = []
    for run_el in root.iterfind("./run"):
        number_attr = run_el.get("number")
        if not number_attr:
            continue
        try:
            number = int(number_attr)
        except ValueError:
            continue
        if number <= 0:
            continue

        schemas: set[str] = set()
        for table in run_el.iterfind("./data/table"):
            schema = table.get("schema")
            if schema:
                schemas.add(schema)

        summary = run_el.find("./info/summary")
        if summary is not None:
            template = _find_text(summary, "./template-name")
            duration = _find_text(summary, "./duration")
            start = _find_text(summary, "./start-date")
            end = _find_text(summary, "./end-date")
        else:
            template = duration = start = end = None

        runs.append(RunInfo(
            number=number,
            template_name=template,
            duration_s=float(duration) if duration else None,
            start_date=start,
            end_date=end,
            schemas=frozenset(schemas),
        ))

    runs.sort(key=lambda r: r.number)
    return TraceInfo(
        xctrace_version=instruments,
        runs=tuple(runs),
    )


def export_schema(trace_path: Path, schema: str, run: int = 1) -> bytes:
    """Export one schema's data as XML bytes from the given run.

    Callers are expected to iterparse the result rather than build a full tree
    for large schemas (time-profile can be tens of MB).
    """
    xpath = f'/trace-toc/run[@number="{run}"]/data/table[@schema="{schema}"]'
    return _run_export(trace_path, ["--xpath", xpath])


def _run_export(trace_path: Path, extra_args: list[str]) -> bytes:
    cmd = ["xctrace", "export", "--input", str(trace_path), *extra_args]
    proc = subprocess.run(cmd, capture_output=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(
            f"xctrace export failed ({proc.returncode}): "
            f"{proc.stderr.decode(errors='replace').strip()}"
        )
    return proc.stdout


def _find_text(root: ET.Element, path: str) -> str | None:
    el = root.find(path)
    return el.text if el is not None and el.text else None
