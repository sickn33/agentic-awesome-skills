"""
007 Security Skill - Central Configuration Hub
================================================

Central configuration for all 007 security scanners, analyzers, and reporting
tools. Every script in the 007 ecosystem imports from here to ensure consistent
behavior, scoring, severity levels, detection patterns, and output paths.

Designed to run with Python stdlib only -- no external dependencies required.

Usage:
    from config import (
        BASE_DIR, DATA_DIR, REPORTS_DIR,
        SEVERITY, SCORING_WEIGHTS, VERDICT_THRESHOLDS,
        SECRET_PATTERNS, DANGEROUS_PATTERNS,
        TIMEOUTS, get_timestamp,
    )
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Directory Layout
# ---------------------------------------------------------------------------
# All paths use pathlib for Windows / Linux portability.

BASE_DIR = Path(__file__).resolve().parent.parent          # 007/
SCRIPTS_DIR = BASE_DIR / "scripts"
SCANNERS_DIR = SCRIPTS_DIR / "scanners"
ANALYZERS_DIR = SCRIPTS_DIR / "analyzers"
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = DATA_DIR / "reports"
PLAYBOOKS_DIR = DATA_DIR / "playbooks"
REFERENCES_DIR = BASE_DIR / "references"
ASSETS_DIR = BASE_DIR / "assets"

# Audit log written by every 007 operation for full traceability.
AUDIT_LOG_PATH = DATA_DIR / "audit_log.json"

# Historical scores for trend analysis.
SCORE_HISTORY_PATH = DATA_DIR / "score_history.json"


# ---------------------------------------------------------------------------
# Ensure required directories exist (safe to call repeatedly)
# ---------------------------------------------------------------------------

def ensure_directories() -> None:
    """Create data directories if they do not already exist."""
    for directory in (DATA_DIR, REPORTS_DIR, PLAYBOOKS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Severity Levels
# ---------------------------------------------------------------------------
# Numeric weights enable arithmetic comparison and sorting.
# Higher weight = more severe.

SEVERITY = {
    "CRITICAL": 5,
    "HIGH":     4,
    "MEDIUM":   3,
    "LOW":      2,
    "INFO":     1,
}

# Reverse lookup: weight -> label
SEVERITY_LABEL = {v: k for k, v in SEVERITY.items()}


# ---------------------------------------------------------------------------
# Scoring Weights by Security Domain (sum = 1.0)
# ---------------------------------------------------------------------------
# Weights mirror the SKILL.md Phase 6 scoring table exactly.

SCORING_WEIGHTS = {
    "secrets":         0.20,   # Secrets & Credentials  (20%)
    "input_validation": 0.15,  # Input Validation       (15%)
    "authn_authz":     0.15,   # Authentication & AuthZ (15%)
    "data_protection":  0.15,  # Data Protection        (15%)
    "resilience":      0.10,   # Resilience             (10%)
    "monitoring":      0.10,   # Monitoring             (10%)
    "supply_chain":    0.10,   # Supply Chain           (10%)
    "compliance":      0.05,   # Compliance             ( 5%)
}

# Human-readable labels for reports
SCORING_LABELS = {
    "secrets":          "Segredos & Credenciais",
    "input_validation": "Input Validation",
    "authn_authz":      "Autenticacao & Autorizacao",
    "data_protection":  "Protecao de Dados",
    "resilience":       "Resiliencia",
    "monitoring":       "Monitoramento",
    "supply_chain":     "Supply Chain",
    "compliance":       "Compliance",
}


# ---------------------------------------------------------------------------
# Verdict Thresholds
# ---------------------------------------------------------------------------
# Applied to the weighted final score (0-100).

VERDICT_THRESHOLDS = {
    "approved": {
        "min": 90,
        "max": 100,
        "label": "Aprovado",
        "description": "Pronto para producao",
        "emoji": "[PASS]",
    },
    "approved_with_caveats": {
        "min": 70,
        "max": 89,
        "label": "Aprovado com Ressalvas",
        "description": "Pode ir para producao com mitigacoes documentadas",
        "emoji": "[WARN]",
    },
    "partial_block": {
        "min": 50,
        "max": 69,
        "label": "Bloqueado Parcial",
        "description": "Precisa correcoes antes de producao",
        "emoji": "[BLOCK]",
    },
    "total_block": {
        "min": 0,
        "max": 49,
        "label": "Bloqueado Total",
        "description": "Inseguro, requer redesign",
        "emoji": "[CRITICAL]",
    },
}


def get_verdict(score: float) -> dict:
    """Return the verdict dict that matches the given score (0-100).

    Args:
        score: Weighted security score between 0 and 100.

    Returns:
        A dict with keys: min, max, label, description, emoji.
    """
    score = max(0.0, min(100.0, score))
    for verdict in VERDICT_THRESHOLDS.values():
        if verdict["min"] <= score <= verdict["max"]:
            return verdict
    # Fallback (should never happen)
    return VERDICT_THRESHOLDS["total_block"]


# ---------------------------------------------------------------------------
# Secret Detection Patterns
# ---------------------------------------------------------------------------
# Compiled regexes for high-speed scanning of source files.
# Each entry: (pattern_name, compiled_regex, severity)

_SECRET_PATTERN_DEFS = [
    # Generic API keys (long hex/base64 strings assigned to key-like variables)
    (
        "generic_api_key",
        r"""(?i)(?:api[_-]?key|apikey|api[_-]?secret|api[_-]?token)\s*[:=]\s*['\"]\S{8,}['\"]""",
        "HIGH",
    ),
    # AWS Access Key ID
    (
        "aws_access_key",
        r"""(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}""",
        "CRITICAL",
    ),
    # AWS Secret Access Key (40 chars base64)
    (
        "aws_secret_key",
        r"""(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['\"]\S{40}['\"]""",
        "CRITICAL",
    ),
    # Generic passwords in assignments
    (
        "password_assignment",
        r"""(?i)(?:password|passwd|pwd|senha)\s*[:=]\s*['\"][^'\"]{4,}['\"]""",
        "HIGH",
    ),
    # Generic token assignments
    (
        "token_assignment",
        r"""(?i)(?:token|bearer|auth[_-]?token|access[_-]?token|refresh[_-]?token)\s*[:=]\s*['\"][^'\"]{8,}['\"]""",
        "HIGH",
    ),
    # Private key blocks (PEM)
    (
        "private_key",
        r"""-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE\s+KEY-----""",
        "CRITICAL",
    ),
    # GitHub personal access tokens
    (
        "github_token",
        r"""(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}""",
        "CRITICAL",
    ),
    # Slack tokens
    (
        "slack_token",
        r"""xox[bpors]-[0-9]{10,}-[A-Za-z0-9-]+""",
        "CRITICAL",
    ),
    # Generic secret assignments (broad catch-all, lower severity)
    (
        "generic_secret",
        r"""(?i)(?:secret|client[_-]?secret|signing[_-]?key|encryption[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}['\"]""",
        "MEDIUM",
    ),
    # Database connection strings with embedded credentials
    (
        "db_connection_string",
        r"""(?i)(?:mysql|postgres|postgresql|mongodb|redis|amqp):\/\/[^:]+:[^@]+@""",
        "HIGH",
    ),
    # .env-style secrets (KEY=value in non-.env source files)
    (
        "env_inline_secret",
        r"""(?i)^(?:DATABASE_URL|SECRET_KEY|JWT_SECRET|ENCRYPTION_KEY)\s*=\s*\S+""",
        "HIGH",
    ),
]

SECRET_PATTERNS = [
    (name, re.compile(pattern), severity)
    for name, pattern, severity in _SECRET_PATTERN_DEFS
]
"""List of (name: str, regex: re.Pattern, severity: str) tuples for secret detection."""


# ---------------------------------------------------------------------------
# Dangerous Code Patterns
# ---------------------------------------------------------------------------
# Patterns that indicate risky constructs. Each scanner may apply its own
# context-aware filtering on top of these to reduce false positives.

_DANGEROUS_PATTERN_DEFS = [
    # Python dangerous functions
    ("eval_usage",              r"""\beval\s*\(""",                                    "CRITICAL"),
    ("exec_usage",              r"""\bexec\s*\(""",                                    "CRITICAL"),
    ("subprocess_shell_true",   r"""subprocess\.\w+\(.*shell\s*=\s*True""",            "CRITICAL"),
    ("os_system",              r"""\bos\.system\s*\(""",                               "HIGH"),
    ("os_popen",               r"""\bos\.popen\s*\(""",                                "HIGH"),
    ("pickle_loads",           r"""\bpickle\.loads?\s*\(""",                            "HIGH"),
    ("yaml_unsafe_load",       r"""\byaml\.load\s*\((?!.*Loader\s*=)""",               "HIGH"),
    ("marshal_loads",          r"""\bmarshal\.loads?\s*\(""",                           "MEDIUM"),
    ("shelve_open",            r"""\bshelve\.open\s*\(""",                              "MEDIUM"),
    ("compile_usage",          r"""\bcompile\s*\([^)]*\bexec\b""",                      "HIGH"),

    # Dynamic imports
    ("importlib_import",       r"""\b__import__\s*\(""",                                "MEDIUM"),
    ("importlib_module",       r"""\bimportlib\.import_module\s*\(""",                  "MEDIUM"),

    # Shell/command injection vectors
    ("shell_injection",        r"""\bos\.(?:system|popen|exec\w*)\s*\(""",              "CRITICAL"),

    # File operations with external input (heuristic)
    ("open_write",             r"""\bopen\s*\([^)]*['\"]\s*w""",                        "LOW"),

    # Network without TLS verification
    ("requests_no_verify",     r"""verify\s*=\s*False""",                               "HIGH"),
    ("ssl_no_verify",          r"""(?i)ssl[_.]?verify\s*=\s*(?:False|0|None)""",        "HIGH"),

    # SQL injection indicators
    ("sql_string_format",      r"""(?i)(?:execute|cursor\.execute)\s*\(\s*[f'\"]+.*\{""", "CRITICAL"),
    ("sql_percent_format",     r"""(?i)(?:execute|cursor\.execute)\s*\(\s*['\"].*%s.*%""","MEDIUM"),

    # JavaScript / Node.js dangerous patterns
    ("js_eval",                r"""\beval\s*\(""",                                      "CRITICAL"),
    ("child_process_exec",     r"""\bchild_process\.\s*exec\s*\(""",                    "CRITICAL"),
    ("innerHTML_assignment",   r"""\.innerHTML\s*=""",                                   "HIGH"),

    # Dangerous deserialization (general)
    ("deserialize_untrusted",  r"""(?i)\b(?:unserialize|deserialize|fromjson)\s*\(""",  "MEDIUM"),
]

DANGEROUS_PATTERNS = [
    (name, re.compile(pattern), severity)
    for name, pattern, severity in _DANGEROUS_PATTERN_DEFS
]
"""List of (name: str, regex: re.Pattern, severity: str) tuples for dangerous code detection."""


# ---------------------------------------------------------------------------
# File Extension Filters
# ---------------------------------------------------------------------------
# Which files to scan by default. Others are ignored unless explicitly included.

SCANNABLE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".mjs", ".cjs",
    ".java", ".kt", ".scala",
    ".go", ".rs", ".rb", ".php",
    ".sh", ".bash", ".zsh", ".ps1",
    ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
    ".json", ".env", ".env.example",
    ".sql",
    ".html", ".htm", ".xml",
    ".md",       # may contain inline code or secrets
    ".txt",      # may contain secrets
    ".dockerfile", ".docker-compose.yml",
}

# Directories to always skip during recursive scans
SKIP_DIRECTORIES = {
    ".git", ".hg", ".svn",
    "__pycache__", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "node_modules", "bower_components",
    "venv", ".venv", "env", ".env",
    ".tox", ".nox",
    "dist", "build", "egg-info",
    ".next", ".nuxt",
    "vendor",
    "coverage", ".coverage",
    ".terraform",
}


# ---------------------------------------------------------------------------
# Default Timeouts & Limits
# ---------------------------------------------------------------------------

TIMEOUTS = {
    "file_read_seconds":   10,    # Max time to read a single file
    "scan_total_seconds":  300,   # Max time for a full scan operation
    "network_seconds":     30,    # Max time for any network call
}

LIMITS = {
    "max_file_size_bytes": 5 * 1024 * 1024,   # 5 MB -- skip larger files
    "max_files_per_scan":  10_000,              # Safety cap
    "max_findings_per_file": 200,               # Truncate findings beyond this
    "max_report_findings":  1_000,              # Total findings cap per report
}


# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------

LOG_FORMAT = "%(asctime)s | %(name)s | %(levelname)s | %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"

def setup_logging(name: str = "007", level: int = logging.INFO) -> logging.Logger:
    """Configure and return a logger for 007 scripts.

    The logger writes to stderr (console). Audit events are written
    separately to AUDIT_LOG_PATH via ``log_audit_event()``.

    Args:
        name:  Logger name (appears in log lines).
        level: Logging level (default INFO).

    Returns:
        Configured ``logging.Logger`` instance.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
        logger.addHandler(handler)
    logger.setLevel(level)
    return logger


# ---------------------------------------------------------------------------
# Audit Log Utilities
# ---------------------------------------------------------------------------

def get_timestamp() -> str:
    """Return current UTC timestamp in ISO 8601 format.

    Example:
        '2026-02-26T14:30:00Z'
    """
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def log_audit_event(
    action: str,
    target: str,
    result: str,
    details: dict | None = None,
) -> None:
    """Append an audit event to the JSON audit log.

    Each event is a JSON object on its own line (JSON Lines format) so the
    file can be appended to atomically without reading the whole log.

    Args:
        action:  What was done (e.g. 'quick_scan', 'full_audit', 'score').
        target:  Path or identifier of what was scanned/audited.
        result:  Outcome summary (e.g. 'approved', 'blocked', '3 findings').
        details: Optional dict with extra context.
    """
    ensure_directories()
    event = {
        "timestamp": get_timestamp(),
        "action": action,
        "target": str(target),
        "result": result,
    }
    if details:
        event["details"] = details

    with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(event, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Score Calculation Helpers
# ---------------------------------------------------------------------------

def calculate_weighted_score(domain_scores: dict[str, float]) -> float:
    """Compute the weighted final security score.

    Args:
        domain_scores: Mapping of domain key -> score (0-100).
                       Keys must be from SCORING_WEIGHTS.
                       Missing domains are treated as 0.

    Returns:
        Weighted score between 0.0 and 100.0.
    """
    total = 0.0
    for domain, weight in SCORING_WEIGHTS.items():
        score = domain_scores.get(domain, 0.0)
        total += score * weight
    return round(total, 2)


# ---------------------------------------------------------------------------
# Module Self-Test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Quick sanity check when run directly
    print(f"BASE_DIR:       {BASE_DIR}")
    print(f"DATA_DIR:       {DATA_DIR}")
    print(f"REPORTS_DIR:    {REPORTS_DIR}")
    print(f"AUDIT_LOG_PATH: {AUDIT_LOG_PATH}")
    print()

    # Verify scoring weights sum to 1.0
    total_weight = sum(SCORING_WEIGHTS.values())
    assert abs(total_weight - 1.0) < 1e-9, f"Weights sum to {total_weight}, expected 1.0"
    print(f"Scoring weights sum: {total_weight} [OK]")

    # Verify all patterns compile successfully (they already are, but double-check)
    print(f"Secret patterns loaded:    {len(SECRET_PATTERNS)}")
    print(f"Dangerous patterns loaded: {len(DANGEROUS_PATTERNS)}")

    # Test verdict thresholds
    for test_score in (95, 75, 55, 30):
        v = get_verdict(test_score)
        print(f"Score {test_score}: {v['emoji']} {v['label']}")

    # Test timestamp
    print(f"Timestamp: {get_timestamp()}")

    print("\n007 config.py -- all checks passed.")
