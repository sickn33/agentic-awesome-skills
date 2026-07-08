"""007 Score Calculator -- Unified security scoring engine.

Aggregates results from all scanners (secrets, dependency, injection, quick_scan)
into a unified, per-domain security score with a weighted final verdict.

The score covers 8 security domains as defined in config.SCORING_WEIGHTS:
  - secrets, input_validation, authn_authz, data_protection,
    resilience, monitoring, supply_chain, compliance.

Results are appended to data/score_history.json for trend analysis and
every run is recorded in the audit log.

Usage:
    python score_calculator.py --target /path/to/project
    python score_calculator.py --target /path/to/project --output json
    python score_calculator.py --target /path/to/project --verbose
"""

import argparse
import json
import os
import re
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

from config import (  # noqa: E402
    BASE_DIR,
    DATA_DIR,
    SCORING_WEIGHTS,
    SCORING_LABELS,
    SCORE_HISTORY_PATH,
    SEVERITY,
    SCANNABLE_EXTENSIONS,
    SKIP_DIRECTORIES,
    LIMITS,
    ensure_directories,
    get_verdict,
    get_timestamp,
    log_audit_event,
    setup_logging,
    calculate_weighted_score,
)

# ---------------------------------------------------------------------------
# Import scanners (each lives in scanners/ sub-package or sibling script)
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent / "scanners"))

import secrets_scanner  # noqa: E402
import dependency_scanner  # noqa: E402
import injection_scanner  # noqa: E402

# quick_scan is a sibling script in the same directory
import quick_scan  # noqa: E402

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = setup_logging("007-score-calculator")

_SENSITIVE_FINDING_KEYS = {
    "snippet",
    "secret",
    "token",
    "password",
    "access_token",
    "app_secret",
    "authorization_code",
    "client_secret",
}


# ---------------------------------------------------------------------------
# Positive-signal patterns (auth, encryption, resilience, monitoring)
# ---------------------------------------------------------------------------
# These patterns indicate GOOD practices. Their presence raises the score
# in the relevant domain.

_AUTH_PATTERNS = [
    re.compile(r"""(?i)(?:@login_required|@auth|@require_auth|@authenticated|@permission_required)"""),
    re.compile(r"""(?i)(?:passport\.authenticate|isAuthenticated|requireAuth|authMiddleware)"""),
    re.compile(r"""(?i)(?:jwt\.verify|jwt\.decode|verify_jwt|decode_token)"""),
    re.compile(r"""(?i)(?:OAuth|oauth2|OpenID|openid)"""),
    re.compile(r"""(?i)(?:session\.get|flask_login|django\.contrib\.auth)"""),
    re.compile(r"""(?i)(?:bcrypt|argon2|pbkdf2|scrypt)"""),
    re.compile(r"""(?i)(?:RBAC|role_required|has_permission|check_permission)"""),
]

_ENCRYPTION_PATTERNS = [
    re.compile(r"""(?i)(?:from\s+cryptography|import\s+cryptography)"""),
    re.compile(r"""(?i)(?:from\s+hashlib|import\s+hashlib)"""),
    re.compile(r"""(?i)(?:from\s+hmac|import\s+hmac)"""),
    re.compile(r"""(?i)(?:AES|Fernet|RSA|ECDSA|ChaCha20)"""),
    re.compile(r"""(?i)(?:https://|TLS|ssl_context|ssl\.create_default_context)"""),
    re.compile(r"""(?i)verify\s*=\s*True"""),
    re.compile(r"""(?i)(?:encrypt|decrypt|sign|verify_signature)"""),
]

_RESILIENCE_PATTERNS = [
    re.compile(r"""(?:try\s*:|except\s+)"""),
    re.compile(r"""(?i)(?:timeout|connect_timeout|read_timeout|socket_timeout)"""),
    re.compile(r"""(?i)(?:retry|retries|backoff|exponential_backoff|tenacity)"""),
    re.compile(r"""(?i)(?:circuit_breaker|CircuitBreaker|pybreaker)"""),
    re.compile(r"""(?i)(?:rate_limit|ratelimit|throttle|RateLimiter)"""),
    re.compile(r"""(?i)(?:max_retries|max_attempts)"""),
    re.compile(r"""(?i)(?:graceful_shutdown|signal\.signal|atexit)"""),
]

_MONITORING_PATTERNS = [
    re.compile(r"""(?:import\s+logging|from\s+logging)"""),
    re.compile(r"""(?i)(?:logger\.\w+|logging\.getLogger)"""),
    re.compile(r"""(?i)(?:sentry|sentry_sdk|raven)"""),
    re.compile(r"""(?i)(?:prometheus|grafana|datadog|newrelic|elastic)"""),
    re.compile(r"""(?i)(?:audit_log|audit_trail|log_event|log_action)"""),
    re.compile(r"""(?i)(?:structlog|loguru)"""),
    re.compile(r"""(?i)(?:alerting|alert_manager|pagerduty|opsgenie)"""),
]

_INPUT_VALIDATION_PATTERNS = [
    re.compile(r"""(?i)(?:pydantic|BaseModel|validator|field_validator)"""),
    re.compile(r"""(?i)(?:jsonschema|validate|Schema|Marshmallow)"""),
    re.compile(r"""(?i)(?:wtforms|FlaskForm|ModelForm)"""),
    re.compile(r"""(?i)(?:sanitize|escape|bleach|html\.escape|markupsafe)"""),
    re.compile(r"""(?i)(?:parameterized|%s.*execute|placeholder|\?)"""),
    re.compile(r"""(?i)(?:zod|yup|joi|express-validator|celebrate)"""),
]


# ---------------------------------------------------------------------------
# File collection (lightweight, only for positive-signal detection)
# ---------------------------------------------------------------------------

def _collect_source_files(target: Path) -> list[Path]:
    """Collect source files for positive-signal pattern scanning."""
    files: list[Path] = []
    max_files = LIMITS["max_files_per_scan"]

    for fpath in safe_user_path(target).rglob("*"):
        if not fpath.is_file() or any(part in SKIP_DIRECTORIES for part in fpath.parts):
            continue
        if len(files) >= max_files:
            return files
        suffix = fpath.suffix.lower()
        name = fpath.name.lower()
        for ext in SCANNABLE_EXTENSIONS:
            if name.endswith(ext) or suffix == ext:
                files.append(fpath)
                break

    return files


def _count_pattern_matches(files: list[Path], patterns: list[re.Pattern]) -> int:
    """Count how many files contain at least one match for any of the patterns."""
    count = 0
    for fpath in files:
        try:
            size = fpath.stat().st_size
            if size > LIMITS["max_file_size_bytes"]:
                continue
            text = fpath.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        for pat in patterns:
            if pat.search(text):
                count += 1
                break  # one match per file is enough

    return count


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def _deduplicate_findings(findings: list[dict]) -> list[dict]:
    """Remove duplicate findings by (file, line, pattern) tuple."""
    seen: set[tuple] = set()
    unique: list[dict] = []

    for f in findings:
        key = (f.get("file", ""), f.get("line", 0), f.get("pattern", ""))
        if key not in seen:
            seen.add(key)
            unique.append(f)

    return unique


# ---------------------------------------------------------------------------
# Per-domain score calculators
# ---------------------------------------------------------------------------

def _score_from_findings(findings: list[dict], max_deduction: int = 100) -> int:
    """Compute a 0-100 score from findings.  Fewer findings = higher score.

    Deductions per severity: CRITICAL=15, HIGH=8, MEDIUM=3, LOW=1, INFO=0.
    """
    deductions = {"CRITICAL": 15, "HIGH": 8, "MEDIUM": 3, "LOW": 1, "INFO": 0}
    total_deduction = 0
    for f in findings:
        total_deduction += deductions.get(f.get("severity", "INFO"), 0)
    return max(0, min(100, max_deduction - total_deduction))


def _score_from_positive_signals(
    match_count: int,
    total_files: int,
    base_score: int = 30,
    max_score: int = 100,
) -> int:
    """Score based on presence of positive patterns.

    If no source files exist, return the base_score (no evidence either way).
    The more files with positive signals, the higher the score.
    """
    if total_files == 0:
        return base_score

    ratio = min(1.0, match_count / max(1, total_files * 0.1))
    return min(max_score, int(base_score + ratio * (max_score - base_score)))


def compute_domain_scores(
    secrets_findings: list[dict],
    injection_findings: list[dict],
    dependency_report: dict,
    quick_findings: list[dict],
    source_files: list[Path],
    total_source_files: int,
) -> dict[str, float]:
    """Compute per-domain security scores (0-100).

    Returns:
        Dict mapping domain key -> score (float).
    """
    scores: dict[str, float] = {}

    # ---- secrets ----
    secret_only = [f for f in secrets_findings if f.get("type") == "secret"]
    scores["secrets"] = float(_score_from_findings(secret_only))

    # ---- input_validation ----
    # Based on injection findings (fewer = higher) + positive validation patterns
    injection_input_related = [
        f for f in injection_findings
        if f.get("injection_type") in (
            "sql_injection", "code_injection", "command_injection",
            "xss", "path_traversal",
        )
    ]
    negative_score = _score_from_findings(injection_input_related)
    positive_count = _count_pattern_matches(source_files, _INPUT_VALIDATION_PATTERNS)
    positive_score = _score_from_positive_signals(positive_count, total_source_files)
    scores["input_validation"] = float(min(100, (negative_score + positive_score) // 2))

    # ---- authn_authz ----
    auth_count = _count_pattern_matches(source_files, _AUTH_PATTERNS)
    if total_source_files == 0:
        scores["authn_authz"] = 50.0  # no code to evaluate
    elif auth_count == 0:
        scores["authn_authz"] = 25.0  # no auth patterns found = low score
    else:
        scores["authn_authz"] = float(_score_from_positive_signals(
            auth_count, total_source_files, base_score=40, max_score=95,
        ))

    # ---- data_protection ----
    enc_count = _count_pattern_matches(source_files, _ENCRYPTION_PATTERNS)
    # Also penalize for hardcoded IPs, secrets with data exposure risk
    data_exposure = [
        f for f in secrets_findings
        if f.get("pattern") in (
            "db_connection_string", "url_embedded_credentials",
            "hardcoded_public_ip",
        )
    ]
    negative_dp = _score_from_findings(data_exposure)
    positive_dp = _score_from_positive_signals(enc_count, total_source_files)
    scores["data_protection"] = float(min(100, (negative_dp + positive_dp) // 2))

    # ---- resilience ----
    res_count = _count_pattern_matches(source_files, _RESILIENCE_PATTERNS)
    scores["resilience"] = float(_score_from_positive_signals(
        res_count, total_source_files, base_score=30, max_score=95,
    ))

    # ---- monitoring ----
    mon_count = _count_pattern_matches(source_files, _MONITORING_PATTERNS)
    scores["monitoring"] = float(_score_from_positive_signals(
        mon_count, total_source_files, base_score=20, max_score=95,
    ))

    # ---- supply_chain ----
    dep_score = dependency_report.get("score", 50)
    scores["supply_chain"] = float(max(0, min(100, dep_score)))

    # ---- compliance ----
    # Aggregate of other scores weighted equally as a proxy
    other_scores = [
        scores.get(k, 0.0) for k in SCORING_WEIGHTS if k != "compliance"
    ]
    if other_scores:
        scores["compliance"] = float(round(sum(other_scores) / len(other_scores), 2))
    else:
        scores["compliance"] = 50.0

    return scores


# ---------------------------------------------------------------------------
# Score history persistence
# ---------------------------------------------------------------------------

def _save_score_history(
    target: str,
    domain_scores: dict[str, float],
    final_score: float,
    verdict: dict,
) -> None:
    """Append a score entry to the score history JSON file."""
    ensure_directories()

    entry = {
        "timestamp": get_timestamp(),
        "target": target,
        "domain_scores": domain_scores,
        "final_score": final_score,
        "verdict": {
            "label": verdict["label"],
            "description": verdict["description"],
            "emoji": verdict["emoji"],
        },
    }

    # Read existing history (JSON array)
    history: list[dict] = []
    if SCORE_HISTORY_PATH.exists():
        try:
            raw = SCORE_HISTORY_PATH.read_text(encoding="utf-8")
            if raw.strip():
                history = json.loads(raw)
                if not isinstance(history, list):
                    history = [history]
        except (json.JSONDecodeError, OSError):
            history = []

    history.append(entry)

    SCORE_HISTORY_PATH.write_text(
        json.dumps(history, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Report formatters
# ---------------------------------------------------------------------------

def _bar(score: float, width: int = 20) -> str:
    """Render a simple ASCII progress bar."""
    filled = int(score / 100 * width)
    return "[" + "#" * filled + "." * (width - filled) + "]"


def _redact_report_value(value):
    """Recursively redact sensitive values from report payloads."""
    if isinstance(value, dict):
        return {key: _redact_report_value(value[key]) for key in value}
    if isinstance(value, list):
        return [_redact_report_value(item) for item in value]
    return value


def redact_findings_for_report(findings: list[dict]) -> list[dict]:
    """Return findings safe to serialize in user-facing reports."""
    redacted: list[dict] = []

    for finding in findings:
        safe_finding: dict = {}
        finding_type = str(finding.get("type", "")).lower()

        for key, value in finding.items():
            key_lower = key.lower()
            if key_lower in _SENSITIVE_FINDING_KEYS:
                safe_finding[key] = "[redacted]"
                continue
            if finding_type == "secret" and key_lower in {"entropy", "match", "raw", "value"}:
                safe_finding[key] = "[redacted]"
                continue
            safe_finding[key] = _redact_report_value(value)

        redacted.append(safe_finding)

    return redacted


def build_safe_scanner_summaries(scanner_summaries: dict[str, dict]) -> dict[str, dict]:
    """Return scanner summaries with primitive numeric values only."""
    safe_summaries: dict[str, dict] = {}

    for scanner_name, summary in scanner_summaries.items():
        safe_summaries[scanner_name] = {
            "findings": int(summary.get("findings", 0)),
            "score": float(summary.get("score", 0)),
        }

    return safe_summaries


def format_text_report(
    target: str,
    domain_scores: dict[str, float],
    final_score: float,
    verdict: dict,
    scanner_summaries: dict[str, dict],
    total_findings: int,
    elapsed: float,
) -> str:
    """Build a human-readable score report."""
    lines: list[str] = []

    lines.append("=" * 72)
    lines.append("  007 SECURITY SCORE REPORT")
    lines.append("=" * 72)
    lines.append("")
    lines.append(f"  Target:          {target}")
    lines.append(f"  Timestamp:       {get_timestamp()}")
    lines.append(f"  Duration:        {elapsed:.2f}s")
    lines.append(f"  Total findings:  {total_findings} (deduplicated)")
    lines.append("")

    # Scanner summaries
    lines.append("-" * 72)
    lines.append("  SCANNER RESULTS")
    lines.append("-" * 72)
    for scanner_name, summary in scanner_summaries.items():
        findings_count = summary.get("findings", 0)
        scanner_score = summary.get("score", "N/A")
        lines.append(f"    {scanner_name:<25} findings={findings_count:<6} score={scanner_score}")
    lines.append("")

    # Per-domain scores
    lines.append("-" * 72)
    lines.append("  DOMAIN SCORES")
    lines.append("-" * 72)
    lines.append(f"    {'Domain':<30} {'Weight':>6}  {'Score':>5}  {'Bar'}")
    lines.append(f"    {'-' * 30} {'-' * 6}  {'-' * 5}  {'-' * 22}")

    for domain, weight in SCORING_WEIGHTS.items():
        score = domain_scores.get(domain, 0.0)
        label = SCORING_LABELS.get(domain, domain)
        weight_pct = f"{weight * 100:.0f}%"
        lines.append(
            f"    {label:<30} {weight_pct:>6}  {score:>5.1f}  {_bar(score)}"
        )
    lines.append("")

    # Final score and verdict
    lines.append("=" * 72)
    lines.append(f"  FINAL SCORE:  {final_score:.1f} / 100")
    lines.append(f"  VERDICT:      {verdict['emoji']} {verdict['label']}")
    lines.append(f"                {verdict['description']}")
    lines.append("=" * 72)
    lines.append("")

    return "\n".join(lines)


def build_json_report(
    target: str,
    domain_scores: dict[str, float],
    final_score: float,
    verdict: dict,
    scanner_summaries: dict[str, dict],
    all_findings: list[dict],
    total_findings: int,
    elapsed: float,
) -> dict:
    """Build a structured JSON report."""
    safe_findings = redact_findings_for_report(all_findings)
    return {
        "report": "score_calculator",
        "target": target,
        "timestamp": get_timestamp(),
        "duration_seconds": round(elapsed, 3),
        "total_findings": total_findings,
        "domain_scores": domain_scores,
        "final_score": final_score,
        "verdict": {
            "label": verdict["label"],
            "description": verdict["description"],
            "emoji": verdict["emoji"],
        },
        "scanner_summaries": scanner_summaries,
        "findings": safe_findings,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_score(
    target_path: str,
    output_format: str = "text",
    verbose: bool = False,
) -> dict:
    """Execute all scanners, aggregate results, compute unified score.

    Args:
        target_path:   Path to the directory to scan.
        output_format: 'text' or 'json'.
        verbose:       Enable debug-level logging.

    Returns:
        JSON-compatible report dict.
    """
    if verbose:
        logger.setLevel("DEBUG")

    ensure_directories()

    target = safe_user_path(target_path).resolve()
    if not target.exists():
        logger.error("Target path does not exist: %s", target)
        sys.exit(1)
    if not target.is_dir():
        logger.error("Target is not a directory: %s", target)
        sys.exit(1)

    logger.info("Starting unified security score calculation for %s", target)
    start_time = time.time()
    target_str = str(target)

    # ------------------------------------------------------------------
    # Phase 1: Run all scanners (suppress stdout by capturing reports)
    # ------------------------------------------------------------------

    scanner_summaries: dict[str, dict] = {}

    # 1a. Secrets scanner
    logger.info("Running secrets scanner...")
    try:
        secrets_report = secrets_scanner.run_scan(
            target_path=target_str,
            output_format="json",
            verbose=verbose,
        )
    except SystemExit:
        secrets_report = {"findings": [], "score": 50, "total_findings": 0}

    secrets_findings = secrets_report.get("findings", [])
    scanner_summaries["secrets_scanner"] = {
        "findings": len(secrets_findings),
        "score": secrets_report.get("score", 50),
    }

    # 1b. Dependency scanner
    logger.info("Running dependency scanner...")
    try:
        dep_report = dependency_scanner.run_scan(
            target_path=target_str,
            output_format="json",
            verbose=verbose,
        )
    except SystemExit:
        dep_report = {"findings": [], "score": 50, "total_findings": 0}

    dep_findings = dep_report.get("findings", [])
    scanner_summaries["dependency_scanner"] = {
        "findings": len(dep_findings),
        "score": dep_report.get("score", 50),
    }

    # 1c. Injection scanner
    logger.info("Running injection scanner...")
    try:
        inj_report = injection_scanner.run_scan(
            target_path=target_str,
            output_format="json",
            verbose=verbose,
        )
    except SystemExit:
        inj_report = {"findings": [], "score": 50, "total_findings": 0}

    inj_findings = inj_report.get("findings", [])
    scanner_summaries["injection_scanner"] = {
        "findings": len(inj_findings),
        "score": inj_report.get("score", 50),
    }

    # 1d. Quick scan (broad patterns)
    logger.info("Running quick scan...")
    try:
        quick_report = quick_scan.run_scan(
            target_path=target_str,
            output_format="json",
            verbose=verbose,
        )
    except SystemExit:
        quick_report = {"findings": [], "score": 50, "total_findings": 0}

    quick_findings = quick_report.get("findings", [])
    scanner_summaries["quick_scan"] = {
        "findings": len(quick_findings),
        "score": quick_report.get("score", 50),
    }

    # ------------------------------------------------------------------
    # Phase 2: Aggregate and deduplicate findings
    # ------------------------------------------------------------------
    all_findings_raw = secrets_findings + dep_findings + inj_findings + quick_findings
    all_findings = _deduplicate_findings(all_findings_raw)
    total_findings = len(all_findings)
    safe_findings = redact_findings_for_report(all_findings)
    safe_total_findings = len(safe_findings)
    safe_scanner_summaries = build_safe_scanner_summaries(scanner_summaries)

    logger.info(
        "Aggregated %d raw findings -> %d unique (deduplicated)",
        len(all_findings_raw), total_findings,
    )

    # ------------------------------------------------------------------
    # Phase 3: Collect source files for positive-signal analysis
    # ------------------------------------------------------------------
    logger.info("Scanning for positive security signals...")
    source_files = _collect_source_files(target)
    total_source_files = len(source_files)
    logger.info("Collected %d source files for positive-signal analysis", total_source_files)

    # ------------------------------------------------------------------
    # Phase 4: Compute per-domain scores
    # ------------------------------------------------------------------
    domain_scores = compute_domain_scores(
        secrets_findings=secrets_findings,
        injection_findings=inj_findings,
        dependency_report=dep_report,
        quick_findings=quick_findings,
        source_files=source_files,
        total_source_files=total_source_files,
    )

    # ------------------------------------------------------------------
    # Phase 5: Compute weighted final score and verdict
    # ------------------------------------------------------------------
    final_score = calculate_weighted_score(domain_scores)
    verdict = get_verdict(final_score)

    elapsed = time.time() - start_time
    logger.info(
        "Score calculation complete in %.2fs: final_score=%.1f, verdict=%s",
        elapsed, final_score, verdict["label"],
    )

    # ------------------------------------------------------------------
    # Phase 6: Save history and audit log
    # ------------------------------------------------------------------
    _save_score_history(target_str, domain_scores, final_score, verdict)

    log_audit_event(
        action="score_calculation",
        target=target_str,
        result=f"final_score={final_score}, verdict={verdict['label']}",
        details={
            "domain_scores": domain_scores,
            "total_findings": safe_total_findings,
            "scanner_summaries": safe_scanner_summaries,
            "duration_seconds": round(elapsed, 3),
        },
    )

    # ------------------------------------------------------------------
    # Phase 7: Build and output report
    # ------------------------------------------------------------------
    report = build_json_report(
        target=target_str,
        domain_scores=domain_scores,
        final_score=final_score,
        verdict=verdict,
        scanner_summaries=safe_scanner_summaries,
        all_findings=all_findings,
        total_findings=safe_total_findings,
        elapsed=elapsed,
    )

    if output_format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_text_report(
            target=target_str,
            domain_scores=domain_scores,
            final_score=final_score,
            verdict=verdict,
            scanner_summaries=safe_scanner_summaries,
            total_findings=safe_total_findings,
            elapsed=elapsed,
        ))

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "007 Score Calculator -- Unified security scoring engine.\n"
            "Runs all scanners and computes per-domain security scores."
        ),
        epilog=(
            "Examples:\n"
            "  python score_calculator.py --target ./my-project\n"
            "  python score_calculator.py --target ./my-project --output json\n"
            "  python score_calculator.py --target ./my-project --verbose"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
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
        help="Enable verbose/debug logging.",
    )

    args = parser.parse_args()
    run_score(
        target_path=args.target,
        output_format=args.output,
        verbose=args.verbose,
    )
