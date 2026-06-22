"""007 Full Audit -- Comprehensive 6-phase security audit orchestrator.

Executes the complete 007 security audit pipeline:
  Phase 1: Surface Mapping      -- file inventory, entry points, dependencies
  Phase 2: Threat Modeling Hints -- identify components for STRIDE analysis
  Phase 3: Security Checklist    -- run all scanners, compile results
  Phase 4: Red Team Scenarios    -- template-based attack scenarios
  Phase 5: Blue Team Recs        -- hardening recommendations per finding
  Phase 6: Verdict               -- compute score and emit final verdict

Generates a comprehensive Markdown report saved to data/reports/ and prints
a summary to stdout.

Usage:
    python full_audit.py --target /path/to/project
    python full_audit.py --target /path/to/project --output markdown
    python full_audit.py --target /path/to/project --phase 3 --verbose
    python full_audit.py --target /path/to/project --output json
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Imports from the 007 config hub (same directory)
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import (  # noqa: E402
    BASE_DIR,
    DATA_DIR,
    REPORTS_DIR,
    SCANNABLE_EXTENSIONS,
    SKIP_DIRECTORIES,
    SCORING_WEIGHTS,
    SCORING_LABELS,
    SEVERITY,
    LIMITS,
    ensure_directories,
    get_verdict,
    get_timestamp,
    log_audit_event,
    setup_logging,
    calculate_weighted_score,
)

# ---------------------------------------------------------------------------
# Import scanners
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent / "scanners"))

import secrets_scanner  # noqa: E402
import dependency_scanner  # noqa: E402
import injection_scanner  # noqa: E402
import quick_scan  # noqa: E402
import score_calculator  # noqa: E402

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = setup_logging("007-full-audit")


# =========================================================================
# RED TEAM SCENARIO TEMPLATES
# =========================================================================
# Mapping from finding type/pattern -> attack scenario template.

_RED_TEAM_TEMPLATES: dict[str, dict] = {
    # --- Secrets ---
    "secret": {
        "title": "Credential Theft via Leaked Secret",
        "persona": "External attacker / Insider",
        "scenario": (
            "Attacker discovers leaked credential ({pattern}) in {file} "
            "and uses it to gain unauthorized access to the associated "
            "service or resource. Depending on the credential scope, "
            "the attacker may escalate to full account takeover."
        ),
        "impact": "Unauthorized access, data exfiltration, lateral movement",
        "difficulty": "Easy (if credential is in public repo) / Medium (if private)",
    },
    # --- Injection ---
    "code_injection": {
        "title": "Remote Code Execution via Code Injection",
        "persona": "Malicious user / Compromised agent",
        "scenario": (
            "Attacker crafts malicious input targeting {pattern} in {file}. "
            "The injected code executes in the server context, allowing "
            "arbitrary command execution, data access, or system compromise."
        ),
        "impact": "Full server compromise, data breach, service disruption",
        "difficulty": "Medium",
    },
    "command_injection": {
        "title": "System Compromise via Command Injection",
        "persona": "Malicious user / API abuser",
        "scenario": (
            "Attacker injects OS commands through {pattern} in {file}. "
            "The shell executes attacker-controlled commands, enabling "
            "file access, reverse shells, or privilege escalation."
        ),
        "impact": "Full system compromise, lateral movement",
        "difficulty": "Medium",
    },
    "sql_injection": {
        "title": "Data Breach via SQL Injection",
        "persona": "Malicious user / Bot",
        "scenario": (
            "Attacker crafts SQL payload targeting {pattern} in {file}. "
            "The malformed query bypasses authentication, extracts sensitive "
            "data, modifies records, or drops tables."
        ),
        "impact": "Data breach, data loss, authentication bypass",
        "difficulty": "Easy to Medium",
    },
    "prompt_injection": {
        "title": "AI Manipulation via Prompt Injection",
        "persona": "Malicious user / Compromised data source",
        "scenario": (
            "Attacker injects adversarial prompt through {pattern} in {file}. "
            "The LLM follows injected instructions, potentially exfiltrating "
            "data, bypassing safety controls, or performing unauthorized actions."
        ),
        "impact": "Data leakage, unauthorized actions, reputation damage",
        "difficulty": "Easy to Medium",
    },
    "xss": {
        "title": "User Account Takeover via XSS",
        "persona": "Malicious user",
        "scenario": (
            "Attacker injects JavaScript through {pattern} in {file}. "
            "The script executes in victim browsers, stealing session tokens, "
            "redirecting users, or performing actions on their behalf."
        ),
        "impact": "Session hijacking, credential theft, phishing",
        "difficulty": "Easy",
    },
    "ssrf": {
        "title": "Internal Network Scanning via SSRF",
        "persona": "External attacker",
        "scenario": (
            "Attacker manipulates server-side request through {pattern} in {file}. "
            "The server makes requests to internal services, cloud metadata endpoints, "
            "or other internal resources on the attacker's behalf."
        ),
        "impact": "Internal network exposure, cloud credential theft, data access",
        "difficulty": "Medium",
    },
    "path_traversal": {
        "title": "Sensitive File Access via Path Traversal",
        "persona": "Malicious user",
        "scenario": (
            "Attacker uses directory traversal sequences (../) through {pattern} "
            "in {file} to access files outside the intended directory, "
            "including configuration files, credentials, or system files."
        ),
        "impact": "Credential exposure, configuration leak, source code theft",
        "difficulty": "Easy",
    },
    # --- Dependencies ---
    "dependency": {
        "title": "Supply Chain Attack via Vulnerable Dependency",
        "persona": "Supply chain attacker",
        "scenario": (
            "Attacker compromises a dependency ({pattern}) used in {file}. "
            "Malicious code in the dependency executes during install or runtime, "
            "exfiltrating secrets, installing backdoors, or modifying behavior."
        ),
        "impact": "Full compromise, backdoor installation, data exfiltration",
        "difficulty": "Hard (requires compromising upstream package)",
    },
    # --- Auth missing ---
    "no_auth": {
        "title": "Unauthorized Access to Unprotected Endpoints",
        "persona": "Any external attacker / Bot",
        "scenario": (
            "Attacker discovers unprotected API endpoints or routes "
            "with no authentication middleware. Direct access allows "
            "data extraction, modification, or service abuse without credentials."
        ),
        "impact": "Data breach, unauthorized actions, resource abuse",
        "difficulty": "Easy",
    },
    # --- Dangerous code ---
    "dangerous_code": {
        "title": "Exploitation of Dangerous Code Pattern",
        "persona": "Malicious user / Insider",
        "scenario": (
            "Attacker exploits dangerous code construct ({pattern}) in {file}. "
            "The construct allows unintended behavior such as arbitrary code "
            "execution, deserialization attacks, or unsafe data processing."
        ),
        "impact": "Code execution, data manipulation, service disruption",
        "difficulty": "Medium",
    },
}

# Fallback template for finding types not explicitly mapped
_RED_TEAM_FALLBACK = {
    "title": "Exploitation of Security Weakness",
    "persona": "Opportunistic attacker",
    "scenario": (
        "Attacker discovers and exploits security weakness ({pattern}) "
        "in {file}. The specific impact depends on the context and "
        "the attacker's capabilities."
    ),
    "impact": "Variable -- depends on finding severity and context",
    "difficulty": "Variable",
}


# =========================================================================
# BLUE TEAM RECOMMENDATION TEMPLATES
# =========================================================================

_BLUE_TEAM_TEMPLATES: dict[str, dict] = {
    "secret": {
        "recommendation": (
            "Move secrets to environment variables, a secrets manager (e.g. AWS "
            "Secrets Manager, HashiCorp Vault), or a .env file excluded from "
            "version control. Add a pre-commit hook (e.g. detect-secrets, "
            "gitleaks) to prevent future leaks. Rotate the compromised credential "
            "immediately."
        ),
        "priority": "CRITICAL",
        "effort": "Low",
    },
    "code_injection": {
        "recommendation": (
            "Remove all uses of eval(), exec(), and Function(). If dynamic "
            "code execution is absolutely necessary, use a sandboxed environment "
            "(e.g. RestrictedPython, vm2 in strict mode) with allowlisted "
            "operations only. Never pass user input to code execution functions."
        ),
        "priority": "CRITICAL",
        "effort": "Medium",
    },
    "command_injection": {
        "recommendation": (
            "Replace os.system(), os.popen(), and subprocess with shell=True "
            "with subprocess.run() using shell=False and a list of arguments. "
            "Never concatenate user input into shell commands. Validate and "
            "sanitize all inputs. Use shlex.quote() if shell is unavoidable."
        ),
        "priority": "CRITICAL",
        "effort": "Low to Medium",
    },
    "sql_injection": {
        "recommendation": (
            "Use parameterized queries (placeholders) for ALL database operations. "
            "Never use f-strings, .format(), or string concatenation in SQL. "
            "Use an ORM (SQLAlchemy, Django ORM) when possible. Add input "
            "validation and type checking before database operations."
        ),
        "priority": "CRITICAL",
        "effort": "Low",
    },
    "prompt_injection": {
        "recommendation": (
            "Separate system prompts from user content using proper message "
            "structure (system/user/assistant roles). Never concatenate user "
            "input directly into system prompts. Add input sanitization, "
            "output filtering, and content safety guardrails. Limit tool "
            "access and implement output validation."
        ),
        "priority": "HIGH",
        "effort": "Medium",
    },
    "xss": {
        "recommendation": (
            "Never set innerHTML or use dangerouslySetInnerHTML with user content. "
            "Use textContent for safe text insertion. Implement Content Security "
            "Policy (CSP) headers. Use template engines with auto-escaping "
            "(Jinja2 with autoescape, React JSX). Sanitize user HTML with "
            "DOMPurify or bleach."
        ),
        "priority": "HIGH",
        "effort": "Low to Medium",
    },
    "ssrf": {
        "recommendation": (
            "Implement URL allowlisting for outbound requests. Block requests "
            "to private IP ranges (10.x, 172.16-31.x, 192.168.x), localhost, "
            "and cloud metadata endpoints (169.254.169.254). Validate and "
            "parse URLs before making requests. Use a dedicated HTTP client "
            "with SSRF protections."
        ),
        "priority": "HIGH",
        "effort": "Medium",
    },
    "path_traversal": {
        "recommendation": (
            "Use Path.resolve() and verify the resolved path starts with the "
            "expected base directory. Never pass raw user input to open() or "
            "file operations. Use os.path.realpath() followed by a prefix check. "
            "Implement a file access allowlist."
        ),
        "priority": "HIGH",
        "effort": "Low",
    },
    "dependency": {
        "recommendation": (
            "Pin all dependency versions with exact versions (not ranges). "
            "Use lock files (pip freeze, package-lock.json, poetry.lock). "
            "Run regular vulnerability scans (safety, npm audit, Snyk). "
            "Remove unused dependencies. Verify package integrity with hashes."
        ),
        "priority": "MEDIUM",
        "effort": "Low",
    },
    "dangerous_code": {
        "recommendation": (
            "Replace dangerous constructs with safe alternatives: "
            "pickle -> json, yaml.load -> yaml.safe_load, eval -> ast.literal_eval "
            "(for literals only). Add input validation before any dynamic operation. "
            "Implement proper error handling and type checking."
        ),
        "priority": "HIGH",
        "effort": "Low to Medium",
    },
    "no_auth": {
        "recommendation": (
            "Add authentication middleware to all endpoints except public "
            "health checks. Implement RBAC/ABAC for authorization. Use "
            "established auth libraries (Flask-Login, Passport.js, Django auth). "
            "Add rate limiting to prevent brute force attacks."
        ),
        "priority": "CRITICAL",
        "effort": "Medium",
    },
    "permission": {
        "recommendation": (
            "Set restrictive file permissions (600 for secrets, 644 for configs, "
            "755 for executables). Never use 777. Run services as non-root users. "
            "Use chown/chmod to enforce ownership."
        ),
        "priority": "MEDIUM",
        "effort": "Low",
    },
    "large_file": {
        "recommendation": (
            "Investigate oversized files for accidentally committed binaries, "
            "databases, or data dumps. Add them to .gitignore. Use Git LFS "
            "for legitimate large files."
        ),
        "priority": "LOW",
        "effort": "Low",
    },
}

_BLUE_TEAM_FALLBACK = {
    "recommendation": (
        "Review the finding in context and apply the principle of least "
        "privilege. Add input validation, proper error handling, and "
        "logging. Consult OWASP guidelines for the specific vulnerability type."
    ),
    "priority": "MEDIUM",
    "effort": "Variable",
}


# =========================================================================
# PHASE IMPLEMENTATIONS
# =========================================================================

def _phase1_surface_mapping(target: Path, verbose: bool = False) -> dict:
    """Phase 1: Surface Mapping -- inventory files, entry points, dependencies."""
    logger.info("Phase 1: Surface Mapping")

    files_by_type: dict[str, int] = {}
    entry_points: list[str] = []
    dependency_files: list[str] = []
    config_files: list[str] = []
    total_files = 0

    _entry_point_patterns = [
        re.compile(r"""(?i)(?:^main\.py|^app\.py|^server\.py|^index\.\w+|^manage\.py)"""),
        re.compile(r"""(?i)(?:^wsgi\.py|^asgi\.py|^gunicorn|^uvicorn)"""),
        re.compile(r"""(?i)(?:^Dockerfile|^docker-compose)"""),
        re.compile(r"""(?i)(?:\.github[/\\]workflows|Jenkinsfile|\.gitlab-ci)"""),
    ]

    _dep_file_names = {
        "requirements.txt", "requirements-dev.txt", "requirements-test.txt",
        "setup.py", "setup.cfg", "pyproject.toml", "Pipfile", "Pipfile.lock",
        "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "go.mod", "go.sum", "Cargo.toml", "Cargo.lock",
        "Gemfile", "Gemfile.lock", "composer.json", "composer.lock",
    }

    _config_extensions = {".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".env"}

    for root, dirs, filenames in os.walk(target):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRECTORIES]

        for fname in filenames:
            total_files += 1
            fpath = Path(root) / fname
            suffix = fpath.suffix.lower()

            # Categorize by extension
            ext_key = suffix if suffix else "(no extension)"
            files_by_type[ext_key] = files_by_type.get(ext_key, 0) + 1

            # Detect entry points
            for pat in _entry_point_patterns:
                if pat.search(fname) or pat.search(str(fpath)):
                    entry_points.append(str(fpath))
                    break

            # Detect dependency files
            if fname.lower() in _dep_file_names:
                dependency_files.append(str(fpath))

            # Detect config files
            if suffix in _config_extensions or fname.lower().startswith(".env"):
                config_files.append(str(fpath))

    # Sort by count descending
    sorted_types = sorted(files_by_type.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_files": total_files,
        "files_by_type": dict(sorted_types),
        "entry_points": sorted(set(entry_points)),
        "dependency_files": sorted(set(dependency_files)),
        "config_files": sorted(set(config_files)),
    }


def _phase2_threat_modeling_hints(surface_map: dict, findings: list[dict]) -> dict:
    """Phase 2: Threat Modeling Hints -- identify components for STRIDE analysis."""
    logger.info("Phase 2: Threat Modeling Hints")

    components: list[dict] = []

    # Entry points are high-value STRIDE targets
    for ep in surface_map.get("entry_points", []):
        components.append({
            "component": ep,
            "type": "entry_point",
            "stride_focus": ["Spoofing", "Tampering", "Elevation of Privilege"],
            "reason": "Application entry point -- critical for authentication and authorization",
        })

    # Dependency files = supply chain
    for dep_file in surface_map.get("dependency_files", []):
        components.append({
            "component": dep_file,
            "type": "dependency_manifest",
            "stride_focus": ["Tampering", "Elevation of Privilege"],
            "reason": "Dependency manifest -- supply chain attack vector",
        })

    # Config files = information disclosure
    for cfg in surface_map.get("config_files", []):
        components.append({
            "component": cfg,
            "type": "configuration",
            "stride_focus": ["Information Disclosure", "Tampering"],
            "reason": "Configuration file -- may contain secrets or security settings",
        })

    # Files with critical findings
    critical_files: set[str] = set()
    for f in findings:
        if f.get("severity") in ("CRITICAL", "HIGH"):
            critical_files.add(f.get("file", ""))

    for cf in sorted(critical_files):
        if cf:
            components.append({
                "component": cf,
                "type": "high_risk_source",
                "stride_focus": [
                    "Spoofing", "Tampering", "Repudiation",
                    "Information Disclosure", "Denial of Service",
                    "Elevation of Privilege",
                ],
                "reason": "Source file with CRITICAL/HIGH severity findings",
            })

    return {
        "components_for_stride": components,
        "total_components": len(components),
        "recommendation": (
            "Run a formal STRIDE analysis on each component above. "
            "For each STRIDE category, document: attack vector, impact (1-5), "
            "probability (1-5), and proposed mitigation."
        ),
    }


def _phase3_security_checklist(
    secrets_report: dict,
    dep_report: dict,
    inj_report: dict,
    quick_report: dict,
) -> dict:
    """Phase 3: Security Checklist -- compile all scanner results."""
    logger.info("Phase 3: Security Checklist")

    checklist: list[dict] = []

    # Secrets check
    secrets_count = secrets_report.get("total_findings", 0)
    checklist.append({
        "check": "No hardcoded secrets in source code",
        "status": "PASS" if secrets_count == 0 else "FAIL",
        "details": f"{secrets_count} secret(s) detected",
        "scanner": "secrets_scanner",
    })

    # Dependency check
    dep_score = dep_report.get("score", 0)
    dep_count = dep_report.get("total_findings", 0)
    checklist.append({
        "check": "Dependencies are secure and pinned",
        "status": "PASS" if dep_score >= 80 else ("WARN" if dep_score >= 50 else "FAIL"),
        "details": f"{dep_count} finding(s), score={dep_score}",
        "scanner": "dependency_scanner",
    })

    # Injection check
    inj_count = inj_report.get("total_findings", 0)
    inj_critical = inj_report.get("severity_counts", {}).get("CRITICAL", 0)
    checklist.append({
        "check": "No injection vulnerabilities",
        "status": "PASS" if inj_count == 0 else ("FAIL" if inj_critical > 0 else "WARN"),
        "details": f"{inj_count} finding(s), {inj_critical} CRITICAL",
        "scanner": "injection_scanner",
    })

    # Quick scan check
    quick_score = quick_report.get("score", 0)
    quick_count = quick_report.get("total_findings", 0)
    checklist.append({
        "check": "No dangerous code patterns",
        "status": "PASS" if quick_score >= 80 else ("WARN" if quick_score >= 50 else "FAIL"),
        "details": f"{quick_count} finding(s), score={quick_score}",
        "scanner": "quick_scan",
    })

    # Summary counts
    pass_count = sum(1 for c in checklist if c["status"] == "PASS")
    warn_count = sum(1 for c in checklist if c["status"] == "WARN")
    fail_count = sum(1 for c in checklist if c["status"] == "FAIL")

    return {
        "checklist": checklist,
        "summary": {
            "pass": pass_count,
            "warn": warn_count,
            "fail": fail_count,
            "total": len(checklist),
        },
    }


def _phase4_red_team_scenarios(all_findings: list[dict], auth_score: float) -> dict:
    """Phase 4: Red Team Scenarios -- generate attack scenarios from findings."""
    logger.info("Phase 4: Red Team Scenarios")

    scenarios: list[dict] = []
    seen_types: set[str] = set()

    # Generate scenarios from findings (one per unique type+file combination,
    # capped to keep the report manageable)
    MAX_SCENARIOS = 20

    # Sort by severity so we get the most critical first
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
    sorted_findings = sorted(
        all_findings,
        key=lambda f: severity_order.get(f.get("severity", "INFO"), 5),
    )

    for finding in sorted_findings:
        if len(scenarios) >= MAX_SCENARIOS:
            break

        # Determine the template key
        finding_type = finding.get("type", "")
        injection_type = finding.get("injection_type", "")
        pattern = finding.get("pattern", "unknown")
        file_path = finding.get("file", "unknown")

        # Choose best template
        if injection_type and injection_type in _RED_TEAM_TEMPLATES:
            template_key = injection_type
        elif finding_type in _RED_TEAM_TEMPLATES:
            template_key = finding_type
        else:
            template_key = None

        template = (
            _RED_TEAM_TEMPLATES.get(template_key, _RED_TEAM_FALLBACK)
            if template_key
            else _RED_TEAM_FALLBACK
        )

        # Deduplicate: one scenario per (template_key, file) pair
        dedup_key = f"{template_key or finding_type}:{file_path}"
        if dedup_key in seen_types:
            continue
        seen_types.add(dedup_key)

        # Interpolate template
        scenario_text = template["scenario"].format(
            pattern=pattern,
            file=file_path,
        )

        scenarios.append({
            "title": template["title"],
            "persona": template["persona"],
            "scenario": scenario_text,
            "impact": template["impact"],
            "difficulty": template["difficulty"],
            "severity": finding.get("severity", "MEDIUM"),
            "source_finding": {
                "type": finding_type,
                "pattern": pattern,
                "file": file_path,
                "line": finding.get("line", 0),
            },
        })

    # Add no-auth scenario if auth score is low
    if auth_score < 40 and "no_auth" not in seen_types:
        template = _RED_TEAM_TEMPLATES["no_auth"]
        scenarios.append({
            "title": template["title"],
            "persona": template["persona"],
            "scenario": template["scenario"],
            "impact": template["impact"],
            "difficulty": template["difficulty"],
            "severity": "HIGH",
            "source_finding": {
                "type": "architectural",
                "pattern": "missing_auth",
                "file": "(project-wide)",
                "line": 0,
            },
        })

    return {
        "scenarios": scenarios,
        "total_scenarios": len(scenarios),
    }


def _phase5_blue_team_recommendations(all_findings: list[dict], auth_score: float) -> dict:
    """Phase 5: Blue Team Recommendations -- hardening advice per finding type."""
    logger.info("Phase 5: Blue Team Recommendations")

    recommendations: list[dict] = []
    seen_types: set[str] = set()

    # Group findings by type for consolidated recommendations
    for finding in all_findings:
        finding_type = finding.get("type", "")
        injection_type = finding.get("injection_type", "")

        # Choose best template key
        if injection_type and injection_type in _BLUE_TEAM_TEMPLATES:
            rec_key = injection_type
        elif finding_type in _BLUE_TEAM_TEMPLATES:
            rec_key = finding_type
        else:
            rec_key = None

        if rec_key and rec_key not in seen_types:
            seen_types.add(rec_key)
            template = _BLUE_TEAM_TEMPLATES[rec_key]

            # Count affected findings
            affected = [
                f for f in all_findings
                if f.get("injection_type", "") == rec_key
                or f.get("type", "") == rec_key
            ]

            recommendations.append({
                "category": rec_key,
                "recommendation": template["recommendation"],
                "priority": template["priority"],
                "effort": template["effort"],
                "affected_findings": len(affected),
                "example_files": sorted(set(
                    f.get("file", "") for f in affected[:5]
                )),
            })

    # Add no-auth recommendation if applicable
    if auth_score < 40 and "no_auth" not in seen_types:
        template = _BLUE_TEAM_TEMPLATES["no_auth"]
        recommendations.append({
            "category": "no_auth",
            "recommendation": template["recommendation"],
            "priority": template["priority"],
            "effort": template["effort"],
            "affected_findings": 0,
            "example_files": [],
        })

    # Sort by priority (CRITICAL first)
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    recommendations.sort(key=lambda r: priority_order.get(r["priority"], 5))

    return {
        "recommendations": recommendations,
        "total_recommendations": len(recommendations),
    }


def _phase6_verdict(
    target_str: str,
    all_findings: list[dict],
    source_files: list[Path],
    total_source_files: int,
    secrets_report: dict,
    dep_report: dict,
    inj_report: dict,
    quick_report: dict,
) -> dict:
    """Phase 6: Verdict -- compute score and emit final verdict."""
    logger.info("Phase 6: Verdict")

    domain_scores = score_calculator.compute_domain_scores(
        secrets_findings=secrets_report.get("findings", []),
        injection_findings=inj_report.get("findings", []),
        dependency_report=dep_report,
        quick_findings=quick_report.get("findings", []),
        source_files=source_files,
        total_source_files=total_source_files,
    )

    final_score = calculate_weighted_score(domain_scores)
    verdict = get_verdict(final_score)

    return {
        "domain_scores": domain_scores,
        "final_score": final_score,
        "verdict": {
            "label": verdict["label"],
            "description": verdict["description"],
            "emoji": verdict["emoji"],
        },
    }


# =========================================================================
# REPORT GENERATION
# =========================================================================

def _generate_markdown_report(
    target: str,
    phases: dict,
    elapsed: float,
    phases_run: list[int],
) -> str:
    """Generate a comprehensive Markdown audit report."""
    lines: list[str] = []
    ts = get_timestamp()

    lines.append("# 007 -- Full Security Audit Report")
    lines.append("")
    lines.append(f"**Target:** `{target}`")
    lines.append(f"**Timestamp:** {ts}")
    lines.append(f"**Duration:** {elapsed:.2f}s")
    lines.append(f"**Phases executed:** {', '.join(str(p) for p in phases_run)}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # Phase 1: Surface Mapping
    if 1 in phases_run and "phase1" in phases:
        p1 = phases["phase1"]
        lines.append("## Phase 1: Surface Mapping")
        lines.append("")
        lines.append(f"**Total files:** {p1.get('total_files', 0)}")
        lines.append("")

        # Files by type
        fbt = p1.get("files_by_type", {})
        if fbt:
            lines.append("### File Types")
            lines.append("")
            lines.append("| Extension | Count |")
            lines.append("|-----------|-------|")
            for ext, count in list(fbt.items())[:20]:
                lines.append(f"| `{ext}` | {count} |")
            lines.append("")

        # Entry points
        eps = p1.get("entry_points", [])
        if eps:
            lines.append("### Entry Points")
            lines.append("")
            for ep in eps:
                lines.append(f"- `{ep}`")
            lines.append("")

        # Dependency files
        dfs = p1.get("dependency_files", [])
        if dfs:
            lines.append("### Dependency Files")
            lines.append("")
            for df in dfs:
                lines.append(f"- `{df}`")
            lines.append("")

        lines.append("---")
        lines.append("")

    # Phase 2: Threat Modeling Hints
    if 2 in phases_run and "phase2" in phases:
        p2 = phases["phase2"]
        lines.append("## Phase 2: Threat Modeling Hints")
        lines.append("")
        lines.append(f"**Components identified for STRIDE analysis:** {p2.get('total_components', 0)}")
        lines.append("")

        for comp in p2.get("components_for_stride", [])[:30]:
            lines.append(f"- **`{comp['component']}`** ({comp['type']})")
            lines.append(f"  - STRIDE focus: {', '.join(comp['stride_focus'])}")
            lines.append(f"  - Reason: {comp['reason']}")
        lines.append("")
        lines.append(f"> {p2.get('recommendation', '')}")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Phase 3: Security Checklist
    if 3 in phases_run and "phase3" in phases:
        p3 = phases["phase3"]
        summary = p3.get("summary", {})
        lines.append("## Phase 3: Security Checklist")
        lines.append("")
        lines.append(
            f"**Results:** {summary.get('pass', 0)} PASS / "
            f"{summary.get('warn', 0)} WARN / "
            f"{summary.get('fail', 0)} FAIL"
        )
        lines.append("")
        lines.append("| Check | Status | Details | Scanner |")
        lines.append("|-------|--------|---------|---------|")
        def format_status(status: str) -> str:
            if status == "PASS":
                return "[PASS]"
            if status == "WARN":
                return "[WARN]"
            if status == "FAIL":
                return "[FAIL]"
            return status

        for item in p3.get("checklist", []):
            status_icon = format_status(item["status"])
            lines.append(
                f"| {item['check']} | {status_icon} | {item['details']} | {item['scanner']} |"
            )
        lines.append("")
        lines.append("---")
        lines.append("")

    # Phase 4: Red Team Scenarios
    if 4 in phases_run and "phase4" in phases:
        p4 = phases["phase4"]
        lines.append("## Phase 4: Red Team Scenarios")
        lines.append("")
        lines.append(f"**Total scenarios:** {p4.get('total_scenarios', 0)}")
        lines.append("")

        for i, sc in enumerate(p4.get("scenarios", []), start=1):
            lines.append(f"### Scenario {i}: {sc['title']}")
            lines.append("")
            lines.append(f"- **Persona:** {sc['persona']}")
            lines.append(f"- **Severity:** {sc['severity']}")
            lines.append(f"- **Difficulty:** {sc['difficulty']}")
            lines.append(f"- **Impact:** {sc['impact']}")
            lines.append(f"- **Description:** {sc['scenario']}")
            src = sc.get("source_finding", {})
            if src.get("file"):
                lines.append(f"- **Source:** `{src['file']}`:L{src.get('line', 0)} ({src.get('pattern', '')})")
            lines.append("")

        lines.append("---")
        lines.append("")

    # Phase 5: Blue Team Recommendations
    if 5 in phases_run and "phase5" in phases:
        p5 = phases["phase5"]
        lines.append("## Phase 5: Blue Team Recommendations")
        lines.append("")
        lines.append(f"**Total recommendations:** {p5.get('total_recommendations', 0)}")
        lines.append("")

        for rec in p5.get("recommendations", []):
            lines.append(f"### [{rec['priority']}] {rec['category'].replace('_', ' ').title()}")
            lines.append("")
            lines.append(f"**Affected findings:** {rec['affected_findings']}")
            lines.append(f"**Effort:** {rec['effort']}")
            lines.append("")
            lines.append(f"{rec['recommendation']}")
            lines.append("")
            if rec.get("example_files"):
                lines.append("**Example files:**")
                for ef in rec["example_files"]:
                    if ef:
                        lines.append(f"- `{ef}`")
                lines.append("")

        lines.append("---")
        lines.append("")

    # Phase 6: Verdict
    if 6 in phases_run and "phase6" in phases:
        p6 = phases["phase6"]
        domain_scores = p6.get("domain_scores", {})
        final_score = p6.get("final_score", 0)
        verdict = p6.get("verdict", {})

        lines.append("## Phase 6: Verdict")
        lines.append("")
        lines.append("### Domain Scores")
        lines.append("")
        lines.append("| Domain | Weight | Score |")
        lines.append("|--------|--------|-------|")
        for domain, weight in SCORING_WEIGHTS.items():
            score = domain_scores.get(domain, 0.0)
            label = SCORING_LABELS.get(domain, domain)
            lines.append(f"| {label} | {weight * 100:.0f}% | {score:.1f} |")
        lines.append("")

        lines.append(f"### Final Score: **{final_score:.1f} / 100**")
        lines.append("")
        lines.append(
            f"### Verdict: **{verdict.get('emoji', '')} {verdict.get('label', 'N/A')}**"
        )
        lines.append("")
        lines.append(f"> {verdict.get('description', '')}")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("*Generated by 007 -- Licenca para Auditar*")
    lines.append("")

    return "\n".join(lines)


def _generate_text_summary(
    target: str,
    phases: dict,
    elapsed: float,
    phases_run: list[int],
) -> str:
    """Generate a concise text summary for stdout."""
    lines: list[str] = []

    lines.append("=" * 72)
    lines.append("  007 FULL SECURITY AUDIT -- SUMMARY")
    lines.append("=" * 72)
    lines.append("")
    lines.append(f"  Target:     {target}")
    lines.append(f"  Timestamp:  {get_timestamp()}")
    lines.append(f"  Duration:   {elapsed:.2f}s")
    lines.append(f"  Phases:     {', '.join(str(p) for p in phases_run)}")
    lines.append("")

    # Phase 1 summary
    if "phase1" in phases:
        p1 = phases["phase1"]
        lines.append(f"  Phase 1 -- Surface: {p1.get('total_files', 0)} files, "
                      f"{len(p1.get('entry_points', []))} entry points, "
                      f"{len(p1.get('dependency_files', []))} dep files")

    # Phase 2 summary
    if "phase2" in phases:
        p2 = phases["phase2"]
        lines.append(f"  Phase 2 -- Threat Model Hints: "
                      f"{p2.get('total_components', 0)} components for STRIDE")

    # Phase 3 summary
    if "phase3" in phases:
        p3 = phases["phase3"]
        summary = p3.get("summary", {})
        lines.append(
            f"  Phase 3 -- Checklist: "
            f"{summary.get('pass', 0)} PASS / "
            f"{summary.get('warn', 0)} WARN / "
            f"{summary.get('fail', 0)} FAIL"
        )

    # Phase 4 summary
    if "phase4" in phases:
        p4 = phases["phase4"]
        lines.append(f"  Phase 4 -- Red Team: {p4.get('total_scenarios', 0)} attack scenarios")

    # Phase 5 summary
    if "phase5" in phases:
        p5 = phases["phase5"]
        lines.append(f"  Phase 5 -- Blue Team: {p5.get('total_recommendations', 0)} recommendations")

    # Phase 6 verdict
    if "phase6" in phases:
        p6 = phases["phase6"]
        final_score = p6.get("final_score", 0)
        verdict = p6.get("verdict", {})
        lines.append("")
        lines.append("-" * 72)
        lines.append(f"  FINAL SCORE:  {final_score:.1f} / 100")
        lines.append(f"  VERDICT:      {verdict.get('emoji', '')} {verdict.get('label', 'N/A')}")
        lines.append(f"                {verdict.get('description', '')}")

    lines.append("=" * 72)
    lines.append("")

    return "\n".join(lines)


# =========================================================================
# MAIN ENTRY POINT
# =========================================================================

def run_audit(
    target_path: str,
    output_format: str = "text",
    phases_to_run: str = "all",
    verbose: bool = False,
) -> dict:
    """Execute the full 6-phase security audit.

    Args:
        target_path:    Path to the directory to audit.
        output_format:  'text', 'json', or 'markdown'.
        phases_to_run:  'all' or a comma-separated list of phase numbers (e.g. '1,3,6').
        verbose:        Enable debug-level logging.

    Returns:
        JSON-compatible audit report dict.
    """
    if verbose:
        logger.setLevel("DEBUG")

    ensure_directories()

    target = Path(target_path).resolve()
    if not target.exists():
        logger.error("Target path does not exist: %s", target)
        sys.exit(1)
    if not target.is_dir():
        logger.error("Target is not a directory: %s", target)
        sys.exit(1)

    # Parse phases
    if phases_to_run == "all":
        phases_list = [1, 2, 3, 4, 5, 6]
    else:
        try:
            phases_list = sorted(set(int(p.strip()) for p in phases_to_run.split(",")))
            if not all(1 <= p <= 6 for p in phases_list):
                logger.error("Phase numbers must be between 1 and 6.")
                sys.exit(1)
        except ValueError:
            logger.error("Invalid --phase value. Use 'all' or comma-separated numbers (1-6).")
            sys.exit(1)

    logger.info("Starting full audit of %s (phases: %s)", target, phases_list)
    start_time = time.time()
    target_str = str(target)

    # ------------------------------------------------------------------
    # Run scanners if needed (phases 3-6 need scanner data)
    # ------------------------------------------------------------------
    need_scanners = any(p in phases_list for p in [3, 4, 5, 6])

    secrets_report: dict = {"findings": [], "score": 100, "total_findings": 0}
    dep_report: dict = {"findings": [], "score": 100, "total_findings": 0}
    inj_report: dict = {"findings": [], "score": 100, "total_findings": 0}
    quick_report: dict = {"findings": [], "score": 100, "total_findings": 0}
    all_findings: list[dict] = []
    report_findings: list[dict] = []

    if need_scanners:
        logger.info("Running scanners for phases %s...", [p for p in phases_list if p >= 3])

        try:
            secrets_report = secrets_scanner.run_scan(
                target_path=target_str, output_format="json", verbose=verbose,
            )
        except SystemExit:
            pass

        try:
            dep_report = dependency_scanner.run_scan(
                target_path=target_str, output_format="json", verbose=verbose,
            )
        except SystemExit:
            pass

        try:
            inj_report = injection_scanner.run_scan(
                target_path=target_str, output_format="json", verbose=verbose,
            )
        except SystemExit:
            pass

        try:
            quick_report = quick_scan.run_scan(
                target_path=target_str, output_format="json", verbose=verbose,
            )
        except SystemExit:
            pass

        # Aggregate and deduplicate
        raw = (
            secrets_report.get("findings", [])
            + dep_report.get("findings", [])
            + inj_report.get("findings", [])
            + quick_report.get("findings", [])
        )
        all_findings = score_calculator._deduplicate_findings(raw)
        report_findings = score_calculator.redact_findings_for_report(all_findings)

    # ------------------------------------------------------------------
    # Collect source files if needed for phase 6
    # ------------------------------------------------------------------
    source_files: list[Path] = []
    total_source_files = 0
    if 6 in phases_list:
        source_files = score_calculator._collect_source_files(target)
        total_source_files = len(source_files)

    # ------------------------------------------------------------------
    # Execute phases
    # ------------------------------------------------------------------
    phases_data: dict = {}

    if 1 in phases_list:
        phases_data["phase1"] = _phase1_surface_mapping(target, verbose=verbose)

    if 2 in phases_list:
        # Phase 2 benefits from phase 1 data and findings
        surface = phases_data.get("phase1") or _phase1_surface_mapping(target, verbose=verbose)
        phases_data["phase2"] = _phase2_threat_modeling_hints(surface, report_findings)

    if 3 in phases_list:
        phases_data["phase3"] = _phase3_security_checklist(
            secrets_report, dep_report, inj_report, quick_report,
        )

    # Auth score for phases 4 and 5
    auth_score = 50.0
    if 6 in phases_list or 4 in phases_list or 5 in phases_list:
        if source_files:
            auth_count = score_calculator._count_pattern_matches(
                source_files, score_calculator._AUTH_PATTERNS,
            )
            if auth_count == 0:
                auth_score = 25.0
            else:
                auth_score = score_calculator._score_from_positive_signals(
                    auth_count, total_source_files, base_score=40, max_score=95,
                )

    if 4 in phases_list:
        phases_data["phase4"] = _phase4_red_team_scenarios(report_findings, auth_score)

    if 5 in phases_list:
        phases_data["phase5"] = _phase5_blue_team_recommendations(report_findings, auth_score)

    if 6 in phases_list:
        phases_data["phase6"] = _phase6_verdict(
            target_str=target_str,
            all_findings=all_findings,
            source_files=source_files,
            total_source_files=total_source_files,
            secrets_report=secrets_report,
            dep_report=dep_report,
            inj_report=inj_report,
            quick_report=quick_report,
        )

    elapsed = time.time() - start_time

    # ------------------------------------------------------------------
    # Generate and save Markdown report
    # ------------------------------------------------------------------
    md_report = _generate_markdown_report(target_str, phases_data, elapsed, phases_list)

    ts_file = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    report_filename = f"audit_{ts_file}.md"
    report_path = REPORTS_DIR / report_filename

    try:
        report_path.write_text(md_report, encoding="utf-8")
        logger.info("Markdown report saved to %s", report_path)
    except OSError as exc:
        logger.warning("Could not save report: %s", exc)

    # ------------------------------------------------------------------
    # Audit log
    # ------------------------------------------------------------------
    verdict_data = phases_data.get("phase6", {}).get("verdict", {})
    final_score = phases_data.get("phase6", {}).get("final_score", "N/A")

    log_audit_event(
        action="full_audit",
        target=target_str,
        result=f"score={final_score}, verdict={verdict_data.get('label', 'N/A')}",
        details={
            "phases_run": phases_list,
            "total_findings": len(all_findings),
            "report_path": str(report_path),
            "duration_seconds": round(elapsed, 3),
        },
    )

    # ------------------------------------------------------------------
    # Build final report dict
    # ------------------------------------------------------------------
    full_report = {
        "report": "full_audit",
        "target": target_str,
        "timestamp": get_timestamp(),
        "duration_seconds": round(elapsed, 3),
        "phases_run": phases_list,
        "phases": phases_data,
        "total_findings": len(all_findings),
        "findings": report_findings,
        "report_path": str(report_path),
    }

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------
    if output_format == "json":
        print(json.dumps(full_report, indent=2, ensure_ascii=False))
    elif output_format == "markdown":
        print(md_report)
    else:
        print(_generate_text_summary(target_str, phases_data, elapsed, phases_list))
        print(f"  Full report saved to: {report_path}")
        print("")

    return full_report


# =========================================================================
# CLI
# =========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "007 Full Audit -- Comprehensive 6-phase security audit.\n\n"
            "Phases:\n"
            "  1: Surface Mapping       -- file inventory, entry points, deps\n"
            "  2: Threat Modeling Hints  -- STRIDE analysis targets\n"
            "  3: Security Checklist     -- run all scanners\n"
            "  4: Red Team Scenarios     -- attack scenario generation\n"
            "  5: Blue Team Recs         -- hardening recommendations\n"
            "  6: Verdict                -- scoring and final verdict"
        ),
        epilog=(
            "Examples:\n"
            "  python full_audit.py --target ./my-project\n"
            "  python full_audit.py --target ./my-project --output markdown\n"
            "  python full_audit.py --target ./my-project --phase 1,3,6\n"
            "  python full_audit.py --target ./my-project --output json --verbose"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Path to the directory to audit (required).",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json", "markdown"],
        default="text",
        help="Output format: 'text' (default), 'json', or 'markdown'.",
    )
    parser.add_argument(
        "--phase",
        default="all",
        help=(
            "Which phases to run: 'all' (default) or comma-separated numbers "
            "(e.g. '1,3,6'). Range: 1-6."
        ),
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Enable verbose/debug logging.",
    )

    args = parser.parse_args()
    run_audit(
        target_path=args.target,
        output_format=args.output,
        phases_to_run=args.phase,
        verbose=args.verbose,
    )
