#!/bin/bash

# Path-aware, deterministic link validation for repository documentation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_FILE="$PROJECT_ROOT/docs_zh-CN/link-validation-report.txt"

cd "$PROJECT_ROOT"

python3 - <<'PY'
from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote
import re
import sys

PROJECT_ROOT = Path.cwd()
OUTPUT_FILE = PROJECT_ROOT / "docs_zh-CN" / "link-validation-report.txt"
SCAN_ROOTS = [Path("README.md"), Path("docs"), Path("docs_zh-CN")]
LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")


def iter_markdown_files() -> list[Path]:
    files: list[Path] = []
    for root in SCAN_ROOTS:
        if root.is_file():
            files.append(root)
        elif root.is_dir():
            files.extend(sorted(root.rglob("*.md")))
    return sorted(files)


def strip_code_fences(text: str) -> str:
    lines: list[str] = []
    in_fence = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            lines.append("")
            continue
        lines.append("" if in_fence else line)
    return "\n".join(lines)


def normalize_target(raw_target: str) -> str:
    target = raw_target.strip()
    if target.startswith("<") and target.endswith(">"):
        target = target[1:-1].strip()
    return unquote(target.split("#", 1)[0].strip())


def is_external_or_anchor(raw_target: str) -> bool:
    target = raw_target.strip().lower()
    return (
        not target
        or target.startswith("#")
        or target.startswith("http://")
        or target.startswith("https://")
        or target.startswith("mailto:")
    )


def resolve_link(source_file: Path, target: str) -> Path:
    if target.startswith("/"):
        return (PROJECT_ROOT / target.lstrip("/")).resolve()
    return (source_file.parent / target).resolve()


def relative_to_root(path: Path) -> str:
    try:
        return path.relative_to(PROJECT_ROOT).as_posix()
    except ValueError:
        return str(path)


def main() -> int:
    checked = 0
    broken: list[tuple[str, str, str]] = []
    external: set[str] = set()

    for source in iter_markdown_files():
        text = strip_code_fences(source.read_text(encoding="utf-8", errors="replace"))
        for match in LINK_RE.finditer(text):
            raw_target = match.group(1)
            if is_external_or_anchor(raw_target):
                if raw_target.strip().lower().startswith(("http://", "https://")):
                    external.add(raw_target.strip())
                continue

            target = normalize_target(raw_target)
            if not target:
                continue

            checked += 1
            resolved = resolve_link(source, target)
            if not resolved.exists():
                broken.append((source.as_posix(), raw_target.strip(), relative_to_root(resolved)))

    report_lines = [
        "Link Validation Report",
        "======================",
        "Generated: deterministic",
        "",
        "Scanned roots:",
        "- README.md",
        "- docs",
        "- docs_zh-CN",
        "",
        "Internal links:",
        f"- Checked: {checked}",
        f"- Broken: {len(broken)}",
    ]

    if broken:
        report_lines.extend(["", "Broken internal links:"])
        for source, raw_target, resolved in broken:
            report_lines.append(f"- {source}: {raw_target} -> {resolved}")

    report_lines.extend(
        [
            "",
            "External links:",
            "- Sample only; not fetched by this local validator.",
        ]
    )
    for url in sorted(external)[:20]:
        report_lines.append(f"- {url}")

    OUTPUT_FILE.write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    print(f"Link validation complete. Report saved to: {relative_to_root(OUTPUT_FILE)}")
    print(f"Internal links checked: {checked}")
    print(f"Broken internal links: {len(broken)}")
    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(main())
PY
