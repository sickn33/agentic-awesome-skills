#!/usr/bin/env python3
"""
Security Scanner — Antigravity Awesome Skills
Scans skill content for dangerous command patterns.

Can be used as a module or run standalone:
    node tools/scripts/run-python.js tools/scripts/security_scanner.py
    node tools/scripts/run-python.js tools/scripts/security_scanner.py --strict
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from _project_paths import find_repo_root
from validate_skills import configure_utf8_output, parse_frontmatter


# ---------------------------------------------------------------------------
# Security pattern definitions
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SecurityPattern:
    code: str
    regex: str
    severity: str          # error | warning | info
    description: str
    rationale: str


SECURITY_PATTERNS: list[SecurityPattern] = [
    SecurityPattern(
        code="SEC001",
        regex=r"rm\s+-[rf]{1,2}\s+/(?!\S)",
        severity="error",
        description="Destructive rm targeting root filesystem",
        rationale="rm -rf / deletes the entire filesystem; always destructive when unguarded.",
    ),
    SecurityPattern(
        code="SEC002",
        regex=r"curl\b[^\n]*\|\s*bash",
        severity="error",
        description="Remote code execution: curl | bash",
        rationale="Pipes untrusted remote content directly into a shell without integrity verification.",
    ),
    SecurityPattern(
        code="SEC003",
        regex=r"wget\b[^\n]*\|\s*(?:sh|bash|zsh)",
        severity="error",
        description="Remote code execution: wget | sh",
        rationale="Same class of risk as curl | bash — downloads and executes without verification.",
    ),
    SecurityPattern(
        code="SEC004",
        regex=r"\bInvoke-Expression\b",
        severity="error",
        description="PowerShell RCE: Invoke-Expression",
        rationale="Evaluates arbitrary strings as PowerShell code; classic RCE vector.",
    ),
    SecurityPattern(
        code="SEC005",
        regex=r"\biex\b",
        severity="warning",
        description="PowerShell alias: iex (Invoke-Expression)",
        rationale="Alias for Invoke-Expression; context-dependent but frequently abused.",
    ),
    SecurityPattern(
        code="SEC006",
        regex=r"chmod\s+[0-9]*7[0-9]*[0-9]*\s",
        severity="warning",
        description="World-writable permission (chmod 7xx / 777)",
        rationale="chmod 777 grants all users write+execute access — usually a misconfiguration.",
    ),
    SecurityPattern(
        code="SEC007",
        regex=r"\beval\s*\(",
        severity="warning",
        description="Dynamic eval() detected",
        rationale="eval() can execute arbitrary code; acceptable only in controlled contexts.",
    ),
    SecurityPattern(
        code="SEC008",
        regex=r"base64\s+-d\b[^\n]*\|",
        severity="warning",
        description="Possible obfuscation via base64 decode + pipe",
        rationale="Pattern commonly used to hide malicious payloads from static scanners.",
    ),
    SecurityPattern(
        code="SEC009",
        regex=r"(password|passwd|secret|api[_-]?key)\s*=\s*['\"][^'\"]{4,}['\"]",
        severity="error",
        description="Hardcoded credential detected",
        rationale="Credentials in source files get committed and exposed in version history.",
    ),
    SecurityPattern(
        code="SEC010",
        regex=r"sudo\s+rm\s+-[rf]{1,2}",
        severity="warning",
        description="Privileged destructive deletion: sudo rm -rf",
        rationale="Privileged deletion amplifies blast radius; requires explicit authorization context.",
    ),
    SecurityPattern(
        code="SEC011",
        regex=r":\s*\(\)\s*\{\s*:|fork\s+bomb",
        severity="error",
        description="Fork bomb or infinite process spawner",
        rationale="Fork bombs consume all system resources and force a reboot.",
    ),
    SecurityPattern(
        code="SEC012",
        regex=r"dd\s+if=/dev/(?:zero|random|urandom)\s+of=/dev/[sh]d[a-z]",
        severity="error",
        description="Disk overwrite via dd",
        rationale="Overwrites raw disk device, causing permanent data loss.",
    ),
]

# Lines containing this marker are excluded from scanning (project convention).
_ALLOWLIST_MARKERS = ("# security-allowlist", "<!-- security-allowlist -->")


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class SecurityFlag:
    code: str
    severity: str
    message: str
    line: int
    matched_text: str
    pattern_regex: str

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "severity": self.severity,
            "message": self.message,
            "line": self.line,
            "matched_text": self.matched_text,
        }


@dataclass
class ScanResult:
    skill_id: str
    flags: list[SecurityFlag] = field(default_factory=list)
    is_offensive: bool = False

    @property
    def error_count(self) -> int:
        return sum(1 for f in self.flags if f.severity == "error")

    @property
    def warning_count(self) -> int:
        return sum(1 for f in self.flags if f.severity == "warning")

    @property
    def status(self) -> str:
        if self.error_count > 0:
            return "error"
        if self.warning_count > 0:
            return "warning"
        return "ok"

    def to_dict(self) -> dict:
        return {
            "skill_id": self.skill_id,
            "status": self.status,
            "is_offensive": self.is_offensive,
            "error_count": self.error_count,
            "warning_count": self.warning_count,
            "flags": [f.to_dict() for f in self.flags],
        }


# ---------------------------------------------------------------------------
# Scanner
# ---------------------------------------------------------------------------

def _is_allowlisted(line: str) -> bool:
    return any(marker in line for marker in _ALLOWLIST_MARKERS)


def scan_content(
    skill_id: str,
    content: str,
    is_offensive: bool = False,
    patterns: list[SecurityPattern] | None = None,
) -> ScanResult:
    """
    Scan raw skill body text for security patterns.

    Args:
        skill_id: Identifier for the skill (used in result).
        content: Raw markdown body (without frontmatter).
        is_offensive: When True, errors are downgraded to warnings
            because offensive skills legitimately document dangerous commands.
        patterns: Override the default SECURITY_PATTERNS list (useful for testing).

    Returns:
        ScanResult with all detected flags.
    """
    active_patterns = patterns if patterns is not None else SECURITY_PATTERNS
    result = ScanResult(skill_id=skill_id, is_offensive=is_offensive)
    lines = content.splitlines()

    for line_no, line in enumerate(lines, start=1):
        if _is_allowlisted(line):
            continue

        for pattern in active_patterns:
            if not re.search(pattern.regex, line, re.IGNORECASE):
                continue

            # Offensive skills get errors downgraded to warnings
            severity = pattern.severity
            if is_offensive and severity == "error":
                severity = "warning"

            matched = re.search(pattern.regex, line, re.IGNORECASE)
            result.flags.append(
                SecurityFlag(
                    code=pattern.code,
                    severity=severity,
                    message=pattern.description,
                    line=line_no,
                    matched_text=(matched.group(0) if matched else "").strip(),
                    pattern_regex=pattern.regex,
                )
            )

    return result


def scan_skill_file(skill_path: Path) -> ScanResult | None:
    """
    Read and scan a SKILL.md file. Returns None if the file cannot be read
    or lacks valid frontmatter.
    """
    skill_file = skill_path / "SKILL.md"
    if not skill_file.exists():
        return None

    content = skill_file.read_text(encoding="utf-8")
    metadata, _ = parse_frontmatter(content)
    if metadata is None:
        metadata = {}

    is_offensive = str(metadata.get("risk", "")).lower() == "offensive"

    # Strip frontmatter from content before scanning
    body = re.sub(r"^---\s*\n.*?\n---\s*\n?", "", content, count=1, flags=re.DOTALL)

    return scan_content(
        skill_id=skill_path.name,
        content=body,
        is_offensive=is_offensive,
    )


def scan_all_skills(skills_dir: Path) -> list[ScanResult]:
    """Scan all skill directories under skills_dir (recursively)."""
    results: list[ScanResult] = []
    for skill_file in sorted(skills_dir.rglob("SKILL.md")):
        skill_path = skill_file.parent
        if any(part.startswith(".") for part in skill_path.parts):
            continue
        result = scan_skill_file(skill_path)
        if result is not None:
            results.append(result)
    return results


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_results(results: list[ScanResult], strict: bool = False) -> bool:
    configure_utf8_output()

    errors_total = sum(r.error_count for r in results)
    warnings_total = sum(r.warning_count for r in results)
    flagged = [r for r in results if r.status != "ok"]

    print(f"\n🔐 Security Scan — {len(results)} skills scanned")
    print(f"   Errors  : {errors_total}")
    print(f"   Warnings: {warnings_total}")

    if flagged:
        print(f"\n{'─' * 60}")
        for result in flagged:
            icon = "❌" if result.status == "error" else "⚠️ "
            label = " [offensive]" if result.is_offensive else ""
            print(f"\n{icon} {result.skill_id}{label}")
            for flag in result.flags:
                sev_icon = "❌" if flag.severity == "error" else "⚠️ "
                print(f"   {sev_icon} [{flag.code}] line {flag.line}: {flag.message}")
                print(f"      matched: {flag.matched_text!r}")
    else:
        print("\n✅ No security flags detected.")

    if errors_total > 0:
        return False
    if strict and warnings_total > 0:
        print("\n❌ STRICT MODE: Warnings treated as errors.")
        return False
    return True


def main(argv: list[str] | None = None) -> int:
    configure_utf8_output()
    parser = argparse.ArgumentParser(
        description="Scan Antigravity skills for dangerous security patterns."
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat warnings as errors (CI mode).",
    )
    args = parser.parse_args(argv)

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"

    print(f"🔍 Scanning: {skills_dir}")

    results = scan_all_skills(skills_dir)
    success = _print_results(results, strict=args.strict)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
