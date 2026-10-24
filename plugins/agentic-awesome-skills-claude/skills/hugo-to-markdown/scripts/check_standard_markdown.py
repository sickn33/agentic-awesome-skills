#!/usr/bin/env python3

import argparse
import json
import re
from pathlib import Path


ACTIVE_PATTERNS = {
    "hugo_shortcode": re.compile(r"\{\{(?:<|%)"),
    "go_template_action": re.compile(r"\{\{\s*(?:\.|if\b|with\b|range\b|end\b|partial\b|site\b|warnf\b|errorf\b)"),
    "local_absolute_path": re.compile(r"(?:/Users/|/home/|/private/var/folders/)"),
    "script_tag": re.compile(r"<script\b", re.IGNORECASE),
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Detect leftover Hugo syntax and unsafe residue in Markdown output.",
    )
    parser.add_argument("--root", required=True, help="Directory containing Markdown output")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    return parser.parse_args()


def markdown_files(root: Path):
    return sorted(
        p for p in root.rglob("*") if p.is_file() and not p.is_symlink()
        and p.resolve().is_relative_to(root) and p.suffix.lower() in {".md", ".markdown", ".mdown"}
    )


def scan_file(path: Path):
    findings = []
    fence = None
    for lineno, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), start=1):
        stripped = line.lstrip()
        marker = re.match(r"^ {0,3}(`{3,}|~{3,})(.*)$", line)
        if fence:
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= fence[1] and not marker[2].strip():
                fence = None
            continue
        if marker and not (marker[1][0] == "`" and "`" in marker[2]):
            fence = (marker[1][0], len(marker[1]))
            continue
        for rule, pattern in ACTIVE_PATTERNS.items():
            if pattern.search(line):
                findings.append({"line": lineno, "rule": rule, "text": line.strip()})
    if fence:
        findings.append({"line": lineno, "rule": "unclosed_fence", "text": "Unclosed fenced code block"})
    return findings


def main():
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {root}")

    report = []
    for path in markdown_files(root):
        findings = scan_file(path)
        if findings:
            report.append({"path": str(path), "findings": findings})

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        if not report:
            print("No heuristic matches found outside recognized fenced code blocks; manual review remains required.")
        for item in report:
            print(item["path"])
            for finding in item["findings"]:
                print(f"  L{finding['line']}: {finding['rule']}: {finding['text']}")

    raise SystemExit(1 if report else 0)
