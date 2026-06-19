# Garbage Collection Templates

> "Documentation entropy compounds. A single outdated comment erodes trust in all docs."

Templates for automated documentation hygiene — detecting stale docs, broken links, interface drift,
and other forms of documentation rot before they erode agent trust.

## Table of Contents

- [Why Garbage Collection](#why-garbage-collection)
- [Stale Doc Detector](#1-stale-doc-detector)
- [Broken Link Checker](#2-broken-link-checker)
- [Interface Drift Detector](#3-interface-drift-detector)
- [Unified GC Runner](#4-unified-gc-runner)
- [CI Integration](#5-ci-integration)
- [Scheduling Guide](#6-scheduling-guide)

---

## Why Garbage Collection

Every outdated doc is a trap for agents. When an agent reads stale architecture docs, it makes
decisions based on fiction — then validation catches the mismatch 30 tool calls later, wasting
tokens and time. Proactive garbage collection prevents this by catching documentation rot
at the source.

| Problem | Impact on Agents | Detection Method |
|---------|-----------------|------------------|
| Stale doc (code changed, doc didn't) | Makes decisions on outdated architecture | Compare timestamps |
| Broken link (target moved/deleted) | Dead-end navigation, wasted context | Crawl internal links |
| Interface drift (doc says X, code does Y) | Writes code against wrong interface | Parse code vs doc |
| Orphan doc (no code references it) | Clutters context, wastes tokens | Reverse reference check |

---

## 1. Stale Doc Detector

Compares documentation timestamps against the code they describe. If the code changed significantly
after the doc was last updated, the doc is potentially stale.

```python
#!/usr/bin/env python3
"""
scripts/gc-stale-docs.py

Detects documentation that may be stale relative to the code it describes.

Usage:
    python3 scripts/gc-stale-docs.py .
    python3 scripts/gc-stale-docs.py . --json
    python3 scripts/gc-stale-docs.py . --threshold 30  # days
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def get_git_last_modified(filepath: str) -> Optional[datetime]:
    """Get the last git commit date for a file."""
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%aI", "--", filepath],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return datetime.fromisoformat(result.stdout.strip())
    except Exception:
        pass
    return None


def extract_code_references(doc_path: str) -> List[str]:
    """Extract file paths referenced in a markdown document.

    Looks for patterns like:
    - `internal/core/service.go`
    - `internal/core/service.go:25-48`
    - [link text](../internal/core/service.go)
    - Sources: [`internal/types/token.go:10-15`]()
    """
    references = []
    try:
        content = Path(doc_path).read_text()
    except Exception:
        return references

    # Match backtick-quoted file paths
    backtick_pattern = r'`([a-zA-Z0-9_./\-]+\.(go|ts|tsx|js|jsx|py|rs))(?::\d+(?:-\d+)?)?`'
    references.extend(m[0] for m in re.findall(backtick_pattern, content))

    # Match markdown link targets
    link_pattern = r'\]\((?:\.\.?/)*([a-zA-Z0-9_./\-]+\.(go|ts|tsx|js|jsx|py|rs))(?::\d+(?:-\d+)?)?\)'
    references.extend(m[0] for m in re.findall(link_pattern, content))

    # Deduplicate, strip line numbers
    cleaned = set()
    for ref in references:
        clean = re.sub(r':\d+(-\d+)?$', '', ref)
        cleaned.add(clean)
    return list(cleaned)


def find_doc_to_code_mapping(project_root: Path) -> Dict[str, List[str]]:
    """Map each doc file to the code files it references."""
    mapping = {}
    doc_dirs = ["docs", "docs/design-docs", "docs/references"]
    doc_files = []

    for d in doc_dirs:
        doc_dir = project_root / d
        if doc_dir.exists():
            for f in doc_dir.glob("*.md"):
                doc_files.append(f)

    # Also check AGENTS.md
    agents_md = project_root / "AGENTS.md"
    if agents_md.exists():
        doc_files.append(agents_md)

    for doc_file in doc_files:
        refs = extract_code_references(str(doc_file))
        if refs:
            rel_doc = str(doc_file.relative_to(project_root))
            mapping[rel_doc] = refs

    return mapping


def check_staleness(
    project_root: Path,
    threshold_days: int = 14
) -> List[Dict]:
    """Check all docs for staleness relative to referenced code."""
    mapping = find_doc_to_code_mapping(project_root)
    threshold = timedelta(days=threshold_days)
    findings = []

    for doc_path, code_refs in mapping.items():
        doc_modified = get_git_last_modified(doc_path)
        if not doc_modified:
            continue

        stale_refs = []
        for code_ref in code_refs:
            code_path = str(project_root / code_ref)
            if not os.path.exists(code_path):
                stale_refs.append({
                    "file": code_ref,
                    "reason": "file_deleted",
                    "detail": f"Referenced file no longer exists"
                })
                continue

            code_modified = get_git_last_modified(code_ref)
            if code_modified and code_modified > doc_modified + threshold:
                days_behind = (code_modified - doc_modified).days
                stale_refs.append({
                    "file": code_ref,
                    "reason": "code_newer",
                    "detail": f"Code updated {days_behind} days after doc",
                    "code_date": code_modified.isoformat(),
                    "doc_date": doc_modified.isoformat()
                })

        if stale_refs:
            findings.append({
                "doc": doc_path,
                "doc_last_modified": doc_modified.isoformat(),
                "stale_references": stale_refs,
                "severity": "high" if any(r["reason"] == "file_deleted" for r in stale_refs) else "medium"
            })

    return findings


def main():
    parser = argparse.ArgumentParser(description="Detect stale documentation")
    parser.add_argument("project_root", help="Project root directory")
    parser.add_argument("--threshold", type=int, default=14,
                        help="Days threshold for staleness (default: 14)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    findings = check_staleness(project_root, args.threshold)

    if args.json:
        print(json.dumps({"stale_docs": findings, "threshold_days": args.threshold}, indent=2))
    else:
        if not findings:
            print("✓ No stale documentation detected")
            return

        print(f"⚠ Found {len(findings)} potentially stale document(s):\n")
        for f in findings:
            severity_icon = "🔴" if f["severity"] == "high" else "🟡"
            print(f"{severity_icon} {f['doc']} (last updated: {f['doc_last_modified'][:10]})")
            for ref in f["stale_references"]:
                if ref["reason"] == "file_deleted":
                    print(f"   ✗ {ref['file']} — DELETED (reference is broken)")
                else:
                    print(f"   ✗ {ref['file']} — code updated {ref['detail']}")
            print()

    sys.exit(1 if findings else 0)


if __name__ == "__main__":
    main()
```

---

## 2. Broken Link Checker

Validates all internal markdown links (to other docs, to code files, to anchors) are still valid.

```python
#!/usr/bin/env python3
"""
scripts/gc-broken-links.py

Checks all markdown files for broken internal links.

Usage:
    python3 scripts/gc-broken-links.py .
    python3 scripts/gc-broken-links.py . --json
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List


def find_markdown_files(root: Path) -> List[Path]:
    """Find all markdown files in the project."""
    md_files = []
    for pattern in ["*.md", "docs/**/*.md"]:
        md_files.extend(root.glob(pattern))
    return sorted(set(md_files))


def extract_links(md_path: Path) -> List[Dict]:
    """Extract all internal links from a markdown file."""
    content = md_path.read_text()
    links = []

    # [text](target) — skip external URLs
    link_pattern = r'\[([^\]]*)\]\(([^)]+)\)'
    for match in re.finditer(link_pattern, content):
        target = match.group(2)
        if target.startswith(("http://", "https://", "mailto:")):
            continue
        line_num = content[:match.start()].count('\n') + 1
        links.append({
            "text": match.group(1),
            "target": target,
            "line": line_num
        })

    return links


def resolve_link(md_path: Path, target: str, project_root: Path) -> Dict:
    """Check if a link target is valid. Returns status dict."""
    # Split anchor from path
    if "#" in target:
        path_part, anchor = target.rsplit("#", 1)
    else:
        path_part, anchor = target, None

    if not path_part:
        # Pure anchor link (#section) — check current file
        if anchor:
            return check_anchor(md_path, anchor)
        return {"valid": True}

    # Resolve relative path from the markdown file's directory
    resolved = (md_path.parent / path_part).resolve()

    if not resolved.exists():
        return {
            "valid": False,
            "reason": "file_not_found",
            "resolved_path": str(resolved.relative_to(project_root))
        }

    if anchor and resolved.suffix == ".md":
        return check_anchor(resolved, anchor)

    return {"valid": True}


def check_anchor(md_path: Path, anchor: str) -> Dict:
    """Check if an anchor exists in a markdown file."""
    try:
        content = md_path.read_text()
    except Exception:
        return {"valid": False, "reason": "cannot_read_file"}

    # Generate anchors from headings (GitHub-style)
    headings = re.findall(r'^#{1,6}\s+(.+)$', content, re.MULTILINE)
    anchors = set()
    for h in headings:
        slug = re.sub(r'[^\w\s-]', '', h.lower())
        slug = re.sub(r'[\s]+', '-', slug).strip('-')
        anchors.add(slug)

    if anchor.lower() in anchors:
        return {"valid": True}
    return {
        "valid": False,
        "reason": "anchor_not_found",
        "anchor": anchor,
        "available_anchors": sorted(anchors)[:10]
    }


def check_all_links(project_root: Path) -> List[Dict]:
    """Check all internal links in all markdown files."""
    findings = []
    md_files = find_markdown_files(project_root)

    for md_file in md_files:
        links = extract_links(md_file)
        broken = []
        for link in links:
            result = resolve_link(md_file, link["target"], project_root)
            if not result["valid"]:
                broken.append({**link, **result})

        if broken:
            findings.append({
                "file": str(md_file.relative_to(project_root)),
                "broken_links": broken
            })

    return findings


def main():
    parser = argparse.ArgumentParser(description="Check for broken internal links")
    parser.add_argument("project_root", help="Project root directory")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    findings = check_all_links(project_root)

    if args.json:
        print(json.dumps({"broken_links": findings}, indent=2))
    else:
        if not findings:
            print("✓ No broken internal links found")
            return

        total = sum(len(f["broken_links"]) for f in findings)
        print(f"✗ Found {total} broken link(s) in {len(findings)} file(s):\n")
        for f in findings:
            print(f"  {f['file']}:")
            for link in f["broken_links"]:
                print(f"    Line {link['line']}: [{link['text']}]({link['target']})")
                print(f"      → {link['reason']}")
            print()

    sys.exit(1 if findings else 0)


if __name__ == "__main__":
    main()
```

---

## 3. Interface Drift Detector

Detects when documented interfaces no longer match the actual code — the most insidious form
of documentation rot because the doc looks legitimate but leads agents astray.

```python
#!/usr/bin/env python3
"""
scripts/gc-interface-drift.py

Detects drift between documented interfaces and actual code definitions.

Usage:
    python3 scripts/gc-interface-drift.py .
    python3 scripts/gc-interface-drift.py . --json
    python3 scripts/gc-interface-drift.py . --doc docs/ARCHITECTURE.md
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set


def extract_documented_interfaces(doc_path: Path) -> List[Dict]:
    """Extract interface/type names mentioned in documentation."""
    content = doc_path.read_text()
    interfaces = []

    # Match backtick-quoted type names with file references
    # Pattern: `TypeName` ... `file.go:line`
    type_pattern = r'`([A-Z][a-zA-Z0-9]+(?:Interface|Service|Provider|Handler|Repository|Store|Manager|Client)?)`'
    for match in re.finditer(type_pattern, content):
        name = match.group(1)
        line_num = content[:match.start()].count('\n') + 1
        interfaces.append({
            "name": name,
            "doc_file": str(doc_path),
            "doc_line": line_num
        })

    return interfaces


def find_type_in_code_go(project_root: Path, type_name: str) -> Optional[Dict]:
    """Find a Go type/interface definition in code."""
    try:
        result = subprocess.run(
            ["grep", "-rn", f"type {type_name} ", "--include=*.go",
             str(project_root)],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            first_match = result.stdout.strip().split('\n')[0]
            parts = first_match.split(':', 2)
            if len(parts) >= 2:
                return {
                    "file": str(Path(parts[0]).relative_to(project_root)),
                    "line": int(parts[1]),
                    "definition": parts[2].strip() if len(parts) > 2 else ""
                }
    except Exception:
        pass
    return None


def find_type_in_code_ts(project_root: Path, type_name: str) -> Optional[Dict]:
    """Find a TypeScript interface/class/type definition in code."""
    try:
        patterns = [
            f"(export )?interface {type_name}",
            f"(export )?class {type_name}",
            f"(export )?type {type_name}"
        ]
        for pattern in patterns:
            result = subprocess.run(
                ["grep", "-rn", "-E", pattern, "--include=*.ts", "--include=*.tsx",
                 str(project_root)],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                first_match = result.stdout.strip().split('\n')[0]
                parts = first_match.split(':', 2)
                if len(parts) >= 2:
                    return {
                        "file": str(Path(parts[0]).relative_to(project_root)),
                        "line": int(parts[1]),
                        "definition": parts[2].strip() if len(parts) > 2 else ""
                    }
    except Exception:
        pass
    return None


def find_type_in_code_py(project_root: Path, type_name: str) -> Optional[Dict]:
    """Find a Python class definition in code."""
    try:
        result = subprocess.run(
            ["grep", "-rn", f"class {type_name}", "--include=*.py",
             str(project_root)],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            first_match = result.stdout.strip().split('\n')[0]
            parts = first_match.split(':', 2)
            if len(parts) >= 2:
                return {
                    "file": str(Path(parts[0]).relative_to(project_root)),
                    "line": int(parts[1]),
                    "definition": parts[2].strip() if len(parts) > 2 else ""
                }
    except Exception:
        pass
    return None


def detect_project_lang(project_root: Path) -> str:
    """Auto-detect project language."""
    if (project_root / "go.mod").exists():
        return "go"
    if (project_root / "package.json").exists():
        return "ts"
    if (project_root / "pyproject.toml").exists() or (project_root / "requirements.txt").exists():
        return "py"
    return "go"  # default


def check_interface_drift(project_root: Path, doc_path: Optional[str] = None) -> List[Dict]:
    """Check for interface drift between docs and code."""
    lang = detect_project_lang(project_root)
    finder = {"go": find_type_in_code_go, "ts": find_type_in_code_ts, "py": find_type_in_code_py}[lang]

    # Collect docs to check
    if doc_path:
        doc_files = [project_root / doc_path]
    else:
        doc_files = []
        for pattern in ["docs/*.md", "docs/**/*.md", "AGENTS.md"]:
            doc_files.extend(project_root.glob(pattern))

    findings = []
    seen_types: Set[str] = set()

    for df in doc_files:
        if not df.exists():
            continue
        documented = extract_documented_interfaces(df)

        for iface in documented:
            if iface["name"] in seen_types:
                continue
            seen_types.add(iface["name"])

            code_loc = finder(project_root, iface["name"])
            if not code_loc:
                findings.append({
                    "type_name": iface["name"],
                    "documented_in": str(df.relative_to(project_root)),
                    "doc_line": iface["doc_line"],
                    "status": "not_found_in_code",
                    "severity": "high",
                    "suggestion": f"Type '{iface['name']}' referenced in docs but not found in code. "
                                  f"It may have been renamed, deleted, or the doc is outdated."
                })

    return findings


def main():
    parser = argparse.ArgumentParser(description="Detect interface drift between docs and code")
    parser.add_argument("project_root", help="Project root directory")
    parser.add_argument("--doc", help="Check a specific doc file only")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    findings = check_interface_drift(project_root, args.doc)

    if args.json:
        print(json.dumps({"interface_drift": findings}, indent=2))
    else:
        if not findings:
            print("✓ No interface drift detected")
            return

        print(f"⚠ Found {len(findings)} potential interface drift issue(s):\n")
        for f in findings:
            icon = "🔴" if f["severity"] == "high" else "🟡"
            print(f"{icon} {f['type_name']}")
            print(f"   Documented in: {f['documented_in']}:{f['doc_line']}")
            print(f"   Status: {f['status']}")
            print(f"   → {f['suggestion']}")
            print()

    sys.exit(1 if findings else 0)


if __name__ == "__main__":
    main()
```

---

## 4. Unified GC Runner

Runs all garbage collection checks in one pass. Produces a combined report.

```python
#!/usr/bin/env python3
"""
scripts/gc-docs.py

Unified documentation garbage collection runner.
Runs stale doc detection, broken link checking, and interface drift detection.

Usage:
    python3 scripts/gc-docs.py .
    python3 scripts/gc-docs.py . --json
    python3 scripts/gc-docs.py . --checks stale,links  # selective checks
"""

import argparse
import json
import sys
from pathlib import Path
from datetime import datetime

# Import the individual checkers (when used as a unified runner,
# these would be in the same scripts/ directory)
# For template purposes, showing the integration pattern:


def run_gc(project_root: Path, checks: list, threshold_days: int = 14) -> dict:
    """Run selected garbage collection checks."""
    report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "project_root": str(project_root),
        "checks_run": checks,
        "results": {},
        "summary": {"total_issues": 0, "high": 0, "medium": 0, "low": 0}
    }

    if "stale" in checks:
        # Run stale doc detection
        from gc_stale_docs import check_staleness
        stale = check_staleness(project_root, threshold_days)
        report["results"]["stale_docs"] = stale
        for item in stale:
            report["summary"]["total_issues"] += 1
            report["summary"][item.get("severity", "medium")] += 1

    if "links" in checks:
        # Run broken link detection
        from gc_broken_links import check_all_links
        broken = check_all_links(project_root)
        report["results"]["broken_links"] = broken
        for item in broken:
            count = len(item.get("broken_links", []))
            report["summary"]["total_issues"] += count
            report["summary"]["high"] += count  # broken links are always high severity

    if "drift" in checks:
        # Run interface drift detection
        from gc_interface_drift import check_interface_drift
        drift = check_interface_drift(project_root)
        report["results"]["interface_drift"] = drift
        for item in drift:
            report["summary"]["total_issues"] += 1
            report["summary"][item.get("severity", "medium")] += 1

    return report


def main():
    parser = argparse.ArgumentParser(description="Documentation garbage collection")
    parser.add_argument("project_root", help="Project root directory")
    parser.add_argument("--checks", default="stale,links,drift",
                        help="Comma-separated checks to run (default: all)")
    parser.add_argument("--threshold", type=int, default=14,
                        help="Staleness threshold in days")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("-o", "--output", help="Write report to file")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    checks = [c.strip() for c in args.checks.split(",")]
    report = run_gc(project_root, checks, args.threshold)

    output = json.dumps(report, indent=2) if args.json else format_report(report)

    if args.output:
        Path(args.output).write_text(output)
        print(f"Report written to {args.output}")
    else:
        print(output)

    sys.exit(1 if report["summary"]["total_issues"] > 0 else 0)


def format_report(report: dict) -> str:
    """Human-readable report format."""
    lines = []
    s = report["summary"]
    total = s["total_issues"]

    if total == 0:
        return "✓ Documentation is clean — no issues found"

    lines.append(f"Documentation GC Report — {report['timestamp'][:10]}")
    lines.append(f"{'=' * 50}")
    lines.append(f"Total issues: {total} (🔴 {s['high']} high, 🟡 {s['medium']} medium, 🟢 {s['low']} low)")
    lines.append("")

    for check_name, results in report["results"].items():
        if results:
            lines.append(f"## {check_name.replace('_', ' ').title()}")
            lines.append(f"   {len(results)} issue(s) found")
            lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    main()
```

---

## 5. CI Integration

### GitHub Actions

```yaml
# .github/workflows/doc-gc.yml
name: Documentation GC
on:
  push:
    branches: [main]
    paths: ['docs/**', 'AGENTS.md', '*.md']
  schedule:
    - cron: '0 9 * * 1'  # Weekly Monday 9am

jobs:
  doc-gc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for git log dates

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run documentation GC
        run: python3 scripts/gc-docs.py . --json -o gc-report.json

      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: doc-gc-report
          path: gc-report.json
```

### Makefile Target

```makefile
.PHONY: gc-docs
gc-docs:
	@echo "Running documentation garbage collection..."
	@python3 scripts/gc-docs.py . || true
	@echo ""
	@echo "To fix: review stale docs and update or delete them"
```

---

## 6. Scheduling Guide

| Check | Frequency | Trigger | Rationale |
|-------|-----------|---------|-----------|
| Broken links | Per-commit (CI) | Push to main | Catches renames/deletes immediately |
| Stale docs | Weekly | Scheduled CI | Balances signal vs noise |
| Interface drift | Per-PR | PR check | Prevents drift from entering main |
| Full GC | Weekly + on-demand | Manual or scheduled | Comprehensive health check |

### Running from Harness Executor

After completing a task that creates or modifies code, the executor can run a quick GC check:

```bash
# Quick post-task check — just broken links on changed docs
python3 scripts/gc-broken-links.py . --json | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['broken_links']:
    print('⚠ Task may have introduced broken doc links — review before committing')
"
```

### Running from ECL Harness Engineer (Improve Mode)

During a harness audit, run the full GC suite to assess documentation health:

```bash
python3 scripts/gc-docs.py . --json -o harness/trace/gc-report.json
```

The GC report feeds into the audit score (Documentation dimension) and helps prioritize
which docs to fix first.
