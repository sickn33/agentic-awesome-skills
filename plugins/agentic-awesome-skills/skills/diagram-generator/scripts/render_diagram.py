#!/usr/bin/env python3
"""Render Mermaid, Graphviz DOT, PlantUML, or SVG diagram source to an output file.

The script is intentionally dependency-tolerant. It uses common command-line
renderers when available and prints actionable hints otherwise.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


MERMAID_EXTS = {".mmd", ".mermaid"}
GRAPHVIZ_EXTS = {".dot", ".gv"}
PLANTUML_EXTS = {".puml", ".plantuml"}
SVG_EXTS = {".svg"}


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("$ " + " ".join(cmd))
    completed = subprocess.run(cmd, cwd=str(cwd) if cwd else None, text=True, capture_output=True, timeout=60)
    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)
    if completed.returncode != 0:
        raise RuntimeError(f"command failed with exit code {completed.returncode}")


def infer_kind(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in MERMAID_EXTS:
        return "mermaid"
    if ext in GRAPHVIZ_EXTS:
        return "graphviz"
    if ext in PLANTUML_EXTS:
        return "plantuml"
    if ext in SVG_EXTS:
        return "svg"
    text = path.read_text(encoding="utf-8", errors="replace").lstrip()
    if text.startswith("@startuml"):
        return "plantuml"
    if text.startswith("digraph") or text.startswith("graph"):
        return "graphviz"
    if text.startswith("<svg"):
        return "svg"
    return "mermaid"


def render_mermaid(src: Path, out: Path, fmt: str) -> None:
    mmdc = shutil.which("mmdc")
    if not mmdc:
        raise RuntimeError(
            "Mermaid rendering requires the Mermaid CLI executable `mmdc`. "
            "Install it with `npm install -g @mermaid-js/mermaid-cli`, or return the Mermaid source only."
        )
    run([mmdc, "-i", str(src), "-o", str(out)])


def render_graphviz(src: Path, out: Path, fmt: str) -> None:
    dot = shutil.which("dot")
    if not dot:
        raise RuntimeError(
            "Graphviz rendering requires the `dot` executable. Install Graphviz, or return the DOT source only."
        )
    run([dot, f"-T{fmt}", str(src), "-o", str(out)])


def render_plantuml(src: Path, out: Path, fmt: str) -> None:
    plantuml = shutil.which("plantuml")
    java = shutil.which("java")
    if plantuml:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            temp_src = tmp_path / src.name
            temp_src.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
            run([plantuml, f"-t{fmt}", str(temp_src)], cwd=tmp_path)
            produced = temp_src.with_suffix("." + fmt)
            if not produced.exists():
                candidates = list(tmp_path.glob(f"*.{fmt}"))
                if not candidates:
                    raise RuntimeError("PlantUML completed but no output file was found")
                produced = candidates[0]
            shutil.copyfile(produced, out)
            return
    jar = os.environ.get("PLANTUML_JAR")
    if java and jar and Path(jar).exists():
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            temp_src = tmp_path / src.name
            temp_src.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
            run([java, "-jar", jar, f"-t{fmt}", str(temp_src)], cwd=tmp_path)
            produced = temp_src.with_suffix("." + fmt)
            if not produced.exists():
                candidates = list(tmp_path.glob(f"*.{fmt}"))
                if not candidates:
                    raise RuntimeError("PlantUML completed but no output file was found")
                produced = candidates[0]
            shutil.copyfile(produced, out)
            return
    raise RuntimeError(
        "PlantUML rendering requires `plantuml` on PATH, or Java plus PLANTUML_JAR pointing to plantuml.jar. "
        "Return the PlantUML source only if no renderer is available."
    )


def render_svg_source(src: Path, out: Path, fmt: str) -> None:
    if fmt == "svg":
        shutil.copyfile(src, out)
        return
    rsvg = shutil.which("rsvg-convert")
    if rsvg:
        run([rsvg, "-f", fmt, "-o", str(out), str(src)])
        return
    inkscape = shutil.which("inkscape")
    if inkscape:
        run([inkscape, str(src), f"--export-type={fmt}", f"--export-filename={out}"])
        return
    raise RuntimeError(
        "SVG conversion requires `rsvg-convert` or `inkscape`. The SVG source itself is usable as an image."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Render text diagram source to SVG, PNG, or PDF.")
    parser.add_argument("input", type=Path, help="Input .mmd, .dot/.gv, .puml, or .svg file")
    parser.add_argument("--format", choices=["svg", "png", "pdf"], default="svg", help="Output format")
    parser.add_argument("--out", type=Path, help="Output path. Defaults to input name with the selected extension")
    parser.add_argument("--kind", choices=["auto", "mermaid", "graphviz", "plantuml", "svg"], default="auto")
    args = parser.parse_args()

    src = args.input.resolve()
    if not src.exists():
        print(f"input file not found: {src}", file=sys.stderr)
        return 2
    out = (args.out or src.with_suffix("." + args.format)).resolve()
    if out == src or out.exists():
        print("output must be a fresh path distinct from input", file=sys.stderr)
        return 2
    if out.suffix.lower() != "." + args.format:
        print("output extension must match --format", file=sys.stderr)
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)
    kind = infer_kind(src) if args.kind == "auto" else args.kind

    try:
        if kind == "mermaid":
            render_mermaid(src, out, args.format)
        elif kind == "graphviz":
            render_graphviz(src, out, args.format)
        elif kind == "plantuml":
            render_plantuml(src, out, args.format)
        elif kind == "svg":
            render_svg_source(src, out, args.format)
        else:
            raise RuntimeError(f"unknown diagram kind: {kind}")
    except Exception as exc:
        print(f"render failed: {exc}", file=sys.stderr)
        return 1

    if not out.exists() or out.stat().st_size == 0:
        print(f"render failed: output missing or empty: {out}", file=sys.stderr)
        return 1
    print(f"rendered {kind} diagram to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
