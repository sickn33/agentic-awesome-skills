"""007 Quick Scan -- Fast automated security scan of a target directory.

Recursively scans files in a target directory for secret patterns, dangerous
code constructs, permission issues, and oversized files.  Produces a scored
summary report in text or JSON format.

Usage:
    python quick_scan.py --target /path/to/project
    python quick_scan.py --target /path/to/project --output json --verbose
"""

import argparse
import json
import os
import stat
import sys
import time
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

# ---------------------------------------------------------------------------
# Imports from the 007 config hub (same directory)
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (
    SCANNABLE_EXTENSIONS,
    SKIP_DIRECTORIES,
    SECRET_PATTERNS,
    DANGEROUS_PATTERNS,
    LIMITS,
    SEVERITY,
    ensure_directories,
    get_verdict,
    get_timestamp,
    log_audit_event,
    setup_logging,
)

# ---------------------------------------------------------------------------
# Constants local to the quick scan
# ---------------------------------------------------------------------------

SCORE_DEDUCTIONS = {
    "CRITICAL": 10,
    "HIGH": 5,
    "MEDIUM": 2,
    "LOW": 1,
    "INFO": 0,
}

REDACT_KEEP_CHARS = 6  # Number of leading chars to keep in redacted snippets


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _redact(text: str) -> str:
    """Return a redacted version of *text*, keeping only the first few chars."""
    text = text.strip()
    if len(text) <= REDACT_KEEP_CHARS:
        return text
    return text[:REDACT_KEEP_CHARS] + "****"


def _snippet(line: str, match_start: int, context: int = 40) -> str:
    """Extract a short redacted snippet around the match position."""
    start = max(0, match_start - context // 2)
    end = min(len(line), match_start + context)
    raw = line[start:end].strip()
    return _redact(raw)


def _should_skip_dir(name: str) -> bool:
    """Return True if directory *name* should be skipped."""
    return name in SKIP_DIRECTORIES


def _is_scannable(path: Path) -> bool:
    """Return True if the file extension is in the SCANNABLE_EXTENSIONS set."""
    # Handle compound suffixes like .env.example
    name = path.name
    for ext in SCANNABLE_EXTENSIONS:
        if name.endswith(ext):
            return True
    # Also check the normal suffix
    return path.suffix.lower() in SCANNABLE_EXTENSIONS


def _check_permissions(filepath: Path) -> dict | None:
    """Check for overly permissive file modes on Unix-like systems.

    Returns a finding dict or None.
    """
    # Only meaningful on systems that implement os.stat st_mode properly
    if sys.platform == "win32":
        return None
    try:
        mode = filepath.stat().st_mode
        perms = stat.S_IMODE(mode)
        if perms & 0o777 == 0o777:
            return {
                "type": "permission",
                "pattern": "world_rwx_0777",
                "severity": "HIGH",
                "file": str(filepath),
                "line": 0,
                "snippet": f"mode={oct(perms)}",
            }
        if perms & 0o666 == 0o666:
            return {
                "type": "permission",
                "pattern": "world_rw_0666",
                "severity": "MEDIUM",
                "file": str(filepath),
                "line": 0,
                "snippet": f"mode={oct(perms)}",
            }
    except OSError:
        pass
    return None


# ---------------------------------------------------------------------------
# Core scanning logic
# ---------------------------------------------------------------------------

def collect_files(target: Path, logger) -> list[Path]:
    """Walk *target* recursively and return scannable file paths.

    Respects SKIP_DIRECTORIES and SCANNABLE_EXTENSIONS from config.
    Stops at LIMITS['max_files_per_scan'] with a warning.
    """
    files: list[Path] = []
    max_files = LIMITS["max_files_per_scan"]

    for fpath in safe_user_path(target).rglob("*"):
        if not fpath.is_file() or any(_should_skip_dir(part) for part in fpath.parts):
            continue
        if len(files) >= max_files:
            logger.warning(
                "Reached max_files_per_scan limit (%d). Stopping collection.", max_files
            )
            return files
        if _is_scannable(fpath):
            files.append(fpath)

    return files


def scan_file(filepath: Path, verbose: bool = False, logger=None) -> list[dict]:
    """Scan a single file for secrets and dangerous patterns.

    Returns a list of finding dicts.
    """
    findings: list[dict] = []
    max_findings = LIMITS["max_findings_per_file"]

    try:
        size = filepath.stat().st_size
    except OSError:
        return findings

    # Large file check
    if size > LIMITS["max_file_size_bytes"]:
        findings.append({
            "type": "large_file",
            "pattern": "exceeds_max_size",
            "severity": "INFO",
            "file": str(filepath),
            "line": 0,
            "snippet": f"size={size} bytes (limit={LIMITS['max_file_size_bytes']})",
        })
        return findings

    # Permission check
    perm_finding = _check_permissions(filepath)
    if perm_finding:
        findings.append(perm_finding)

    # Read file content
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose and logger:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return findings

    lines = text.splitlines()

    for line_num, line in enumerate(lines, start=1):
        if len(findings) >= max_findings:
            break

        # -- Secret patterns --
        for pattern_name, regex, severity in SECRET_PATTERNS:
            m = regex.search(line)
            if m:
                findings.append({
                    "type": "secret",
                    "pattern": pattern_name,
                    "severity": severity,
                    "file": str(filepath),
                    "line": line_num,
                    "snippet": _snippet(line, m.start()),
                })

        # -- Dangerous code patterns --
        for pattern_name, regex, severity in DANGEROUS_PATTERNS:
            m = regex.search(line)
            if m:
                findings.append({
                    "type": "dangerous_code",
                    "pattern": pattern_name,
                    "severity": severity,
                    "file": str(filepath),
                    "line": line_num,
                    "snippet": "",
                })

    return findings


def compute_score(findings: list[dict]) -> int:
    """Compute a quick score starting at 100, deducting by severity.

    Returns an integer score clamped between 0 and 100.
    """
    score = 100
    for f in findings:
        deduction = SCORE_DEDUCTIONS.get(f["severity"], 0)
        score -= deduction
    return max(0, score)


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def aggregate_by_severity(findings: list[dict]) -> dict[str, int]:
    """Count findings per severity level."""
    counts: dict[str, int] = {sev: 0 for sev in SEVERITY}
    for f in findings:
        sev = f.get("severity", "INFO")
        if sev in counts:
            counts[sev] += 1
    return counts


def top_critical_findings(findings: list[dict], n: int = 10) -> list[dict]:
    """Return the top *n* most critical findings, sorted by severity weight."""
    sorted_findings = sorted(
        findings,
        key=lambda f: SEVERITY.get(f.get("severity", "INFO"), 0),
        reverse=True,
    )
    return sorted_findings[:n]


# ---------------------------------------------------------------------------
# Report formatters
# ---------------------------------------------------------------------------

def format_text_report(
    target: str,
    total_files: int,
    findings: list[dict],
    severity_counts: dict[str, int],
    score: int,
    verdict: dict,
    elapsed: float,
) -> str:
    """Build a human-readable text report."""
    lines: list[str] = []

    lines.append("=" * 70)
    lines.append("  007 QUICK SCAN REPORT")
    lines.append("=" * 70)
    lines.append("")

    # Metadata
    lines.append(f"  Target:       {target}")
    lines.append(f"  Timestamp:    {get_timestamp()}")
    lines.append(f"  Duration:     {elapsed:.2f}s")
    lines.append(f"  Files scanned: {total_files}")
    lines.append(f"  Total findings: {len(findings)}")
    lines.append("")

    # Severity breakdown
    lines.append("-" * 70)
    lines.append("  FINDINGS BY SEVERITY")
    lines.append("-" * 70)
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
        count = severity_counts.get(sev, 0)
        bar = "#" * min(count, 40)
        lines.append(f"    {sev:<10} {count:>5}  {bar}")
    lines.append("")

    # Top critical findings
    top = top_critical_findings(findings)
    if top:
        lines.append("-" * 70)
        lines.append("  TOP FINDINGS (most critical first)")
        lines.append("-" * 70)
        for i, f in enumerate(top, start=1):
            loc = f"{f['file']}:{f['line']}"
            snippet_part = f"  [{_redact(f['snippet'])}]" if f.get("snippet") else ""
            lines.append(
                f"    {i:>2}. [{f['severity']:<8}] {f['type']}/{f['pattern']}"
            )
            lines.append(
                f"        {loc}{snippet_part}"
            )
        lines.append("")

    # Score and verdict
    lines.append("=" * 70)
    lines.append(f"  QUICK SCORE:  {score} / 100")
    lines.append(f"  VERDICT:      {verdict['emoji']} {verdict['label']}")
    lines.append(f"                {verdict['description']}")
    lines.append("=" * 70)
    lines.append("")

    return "\n".join(lines)


def build_json_report(
    target: str,
    total_files: int,
    findings: list[dict],
    severity_counts: dict[str, int],
    score: int,
    verdict: dict,
    elapsed: float,
) -> dict:
    """Build a structured JSON-serializable report dict."""
    return {
        "scan": "quick_scan",
        "target": target,
        "timestamp": get_timestamp(),
        "duration_seconds": round(elapsed, 3),
        "total_files_scanned": total_files,
        "total_findings": len(findings),
        "severity_counts": severity_counts,
        "score": score,
        "verdict": {
            "label": verdict["label"],
            "description": verdict["description"],
            "emoji": verdict["emoji"],
        },
        "findings": findings,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_scan(target_path: str, output_format: str = "text", verbose: bool = False) -> dict:
    """Execute the quick scan and return the JSON-style report dict.

    Also prints the report to stdout in the requested format.
    """
    logger = setup_logging("007-quick-scan")
    ensure_directories()

    target = safe_user_path(target_path).resolve()
    if not target.exists():
        logger.error("Target path does not exist: %s", target)
        sys.exit(1)
    if not target.is_dir():
        logger.error("Target is not a directory: %s", target)
        sys.exit(1)

    logger.info("Starting quick scan of %s", target)
    start_time = time.time()

    # Collect files
    files = collect_files(target, logger)
    total_files = len(files)
    logger.info("Collected %d scannable files", total_files)

    # Scan each file
    all_findings: list[dict] = []
    max_report_findings = LIMITS["max_report_findings"]

    for fpath in files:
        if len(all_findings) >= max_report_findings:
            logger.warning(
                "Reached max_report_findings limit (%d). Truncating.", max_report_findings
            )
            break

        file_findings = scan_file(fpath, verbose=verbose, logger=logger)
        remaining = max_report_findings - len(all_findings)
        all_findings.extend(file_findings[:remaining])

    elapsed = time.time() - start_time
    logger.info(
        "Scan complete: %d files, %d findings in %.2fs",
        total_files, len(all_findings), elapsed,
    )

    # Aggregation
    severity_counts = aggregate_by_severity(all_findings)
    score = compute_score(all_findings)
    verdict = get_verdict(score)

    # Audit log
    log_audit_event(
        action="quick_scan",
        target=str(target),
        result=f"score={score}, findings={len(all_findings)}, verdict={verdict['label']}",
        details={
            "total_files": total_files,
            "severity_counts": severity_counts,
            "duration_seconds": round(elapsed, 3),
        },
    )

    # Build structured report (always, for return value)
    report = build_json_report(
        target=str(target),
        total_files=total_files,
        findings=all_findings,
        severity_counts=severity_counts,
        score=score,
        verdict=verdict,
        elapsed=elapsed,
    )

    # Output
    if output_format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_text_report(
            target=str(target),
            total_files=total_files,
            findings=all_findings,
            severity_counts=severity_counts,
            score=score,
            verdict=verdict,
            elapsed=elapsed,
        ))

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="007 Quick Scan -- Fast automated security scan of a target directory.",
        epilog="Example: python quick_scan.py --target ./my-project --output json --verbose",
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Path to the directory to scan (required).",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json"],
        default="text",
        help="Output format: 'text' (default) or 'json'.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Enable verbose logging (debug-level messages).",
    )

    args = parser.parse_args()
    run_scan(target_path=args.target, output_format=args.output, verbose=args.verbose)
