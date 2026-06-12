#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from _project_paths import find_repo_root
from risk_classifier import suggest_risk
from validate_skills import configure_utf8_output, has_when_to_use_section, parse_frontmatter


ELLIPSIS_PATTERN = re.compile(r"(?:\.\.\.|…)\s*$")
FENCED_CODE_BLOCK_PATTERN = re.compile(r"^```", re.MULTILINE)
EXAMPLES_HEADING_PATTERNS = [
    re.compile(r"^##\s+Example(s)?\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Usage\b", re.MULTILINE | re.IGNORECASE),
]
LIMITATIONS_HEADING_PATTERNS = [
    re.compile(r"^##\s+Limitations?\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Known\s+Limitations?\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Constraints?\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Out\s+of\s+Scope\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+What\s+(This\s+Skill\s+)?Does(?:\s+Not|n't)\s+Do\b", re.MULTILINE | re.IGNORECASE),
]
MARKDOWN_LINK_PATTERN = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SECURITY_DISCLAIMER_PATTERN = re.compile(r"AUTHORIZED USE ONLY", re.IGNORECASE)
VALID_RISK_LEVELS = {"none", "safe", "critical", "offensive", "unknown"}
DEFAULT_MARKDOWN_TOP_FINDINGS = 15
DEFAULT_MARKDOWN_TOP_SKILLS = 20
DEFAULT_MARKDOWN_TOP_RISK_SUGGESTIONS = 20
STRICT_BUDGET_PATH = Path("tools/config/audit-skills-strict-budget.json")


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return {
            "severity": self.severity,
            "code": self.code,
            "message": self.message,
        }
def has_examples(content: str) -> bool:
    return bool(FENCED_CODE_BLOCK_PATTERN.search(content)) or any(
        pattern.search(content) for pattern in EXAMPLES_HEADING_PATTERNS
    )


def has_limitations(content: str) -> bool:
    return any(pattern.search(content) for pattern in LIMITATIONS_HEADING_PATTERNS)


def find_dangling_links(content: str, skill_root: Path) -> list[str]:
    broken_links: list[str] = []
    for link in MARKDOWN_LINK_PATTERN.findall(content):
        link_clean = link.split("#", 1)[0].strip()
        if not link_clean or link_clean.startswith(("http://", "https://", "mailto:", "<", ">")):
            continue
        if os.path.isabs(link_clean):
            continue

        target_path = (skill_root / link_clean).resolve()
        if not target_path.exists():
            broken_links.append(link)
    return broken_links


def build_skill_report(skill_root: Path, skills_dir: Path) -> dict[str, object]:
    skill_file = skill_root / "SKILL.md"
    rel_dir = skill_root.relative_to(skills_dir).as_posix()
    rel_file = f"{rel_dir}/SKILL.md"
    findings: list[Finding] = []

    if skill_file.is_symlink():
        findings.append(
            Finding(
                "warning",
                "symlinked_skill_markdown",
                "SKILL.md is a symlink and was not audited for safety or usability.",
            )
        )
        return finalize_skill_report(rel_dir, rel_file, findings)

    try:
        content = skill_file.read_text(encoding="utf-8")
    except Exception as exc:  # pragma: no cover - defensive guard
        findings.append(Finding("error", "unreadable_file", f"Unable to read SKILL.md: {exc}"))
        return finalize_skill_report(rel_dir, rel_file, findings)

    metadata, fm_errors = parse_frontmatter(content, rel_file)
    if metadata is None:
        findings.append(Finding("error", "invalid_frontmatter", "Missing or malformed YAML frontmatter."))
        return finalize_skill_report(rel_dir, rel_file, findings)

    for error in fm_errors:
        findings.append(Finding("error", "invalid_frontmatter", error))

    name = metadata.get("name")
    description = metadata.get("description")
    risk = metadata.get("risk")
    source = metadata.get("source")
    date_added = metadata.get("date_added")
    risk_suggestion = suggest_risk(content, metadata)

    if name != skill_root.name:
        findings.append(
            Finding(
                "error",
                "name_mismatch",
                f"Frontmatter name '{name}' does not match folder name '{skill_root.name}'.",
            )
        )

    if description is None:
        findings.append(Finding("error", "missing_description", "Missing frontmatter description."))
    elif not isinstance(description, str):
        findings.append(
            Finding(
                "error",
                "invalid_description_type",
                f"Description must be a string, got {type(description).__name__}.",
            )
        )
    else:
        stripped_description = description.strip()
        if not stripped_description:
            findings.append(Finding("error", "empty_description", "Description is empty or whitespace only."))
        if len(description) > 300:
            findings.append(
                Finding(
                    "error",
                    "description_too_long",
                    f"Description is {len(description)} characters long; keep it concise.",
                )
            )
        if ELLIPSIS_PATTERN.search(stripped_description):
            findings.append(
                Finding(
                    "warning",
                    "description_truncated",
                    "Description ends with an ellipsis and likely needs cleanup for issue #365.",
                )
            )

    if risk is None:
        findings.append(Finding("warning", "missing_risk", "Missing risk classification."))
    elif risk not in VALID_RISK_LEVELS:
        findings.append(
            Finding(
                "error",
                "invalid_risk",
                f"Risk must be one of {sorted(VALID_RISK_LEVELS)}, got '{risk}'.",
            )
        )

    if risk_suggestion.risk not in ("unknown", "none"):
        risk_needs_review = risk is None or risk == "unknown" or risk != risk_suggestion.risk
        if risk_needs_review:
            findings.append(
                Finding(
                    "info" if risk in (None, "unknown") else "warning",
                    "risk_suggestion",
                    f"Suggested risk is {risk_suggestion.risk} based on: {', '.join(risk_suggestion.reasons[:3])}.",
                )
            )

    if source is None:
        findings.append(Finding("warning", "missing_source", "Missing source attribution."))

    if date_added is not None and not DATE_PATTERN.match(str(date_added)):
        findings.append(
            Finding(
                "error",
                "invalid_date_added",
                f"date_added must use YYYY-MM-DD format, got '{date_added}'.",
            )
        )

    if not has_when_to_use_section(content):
        findings.append(Finding("warning", "missing_when_to_use", "Missing a recognized 'When to Use' section."))

    if not has_examples(content):
        findings.append(Finding("warning", "missing_examples", "Missing an example section or fenced example block."))

    if not has_limitations(content):
        findings.append(Finding("warning", "missing_limitations", "Missing a limitations/constraints section."))

    line_count = content.count("\n") + 1
    if line_count > 500:
        findings.append(
            Finding(
                "warning",
                "skill_too_long",
                f"SKILL.md is {line_count} lines long; consider splitting into references/.",
            )
        )

    for broken_link in find_dangling_links(content, skill_root):
        findings.append(
            Finding(
                "error",
                "dangling_link",
                f"Broken relative markdown link: {broken_link}",
            )
        )

    if risk == "offensive" and not SECURITY_DISCLAIMER_PATTERN.search(content):
        findings.append(
            Finding(
                "error",
                "missing_authorized_use_only",
                "Offensive skill is missing the required 'AUTHORIZED USE ONLY' disclaimer.",
            )
        )

    return finalize_skill_report(
        rel_dir,
        rel_file,
        findings,
        risk=risk,
        suggested_risk=risk_suggestion.risk,
        suggested_risk_reasons=list(risk_suggestion.reasons),
    )


def finalize_skill_report(
    skill_id: str,
    rel_file: str,
    findings: list[Finding],
    *,
    risk: str | None = None,
    suggested_risk: str = "unknown",
    suggested_risk_reasons: list[str] | None = None,
) -> dict[str, object]:
    severity_counts = Counter(finding.severity for finding in findings)
    if severity_counts["error"] > 0:
        status = "error"
    elif severity_counts["warning"] > 0:
        status = "warning"
    else:
        status = "ok"

    return {
        "id": skill_id,
        "path": rel_file,
        "status": status,
        "error_count": severity_counts["error"],
        "warning_count": severity_counts["warning"],
        "info_count": severity_counts["info"],
        "risk": risk,
        "suggested_risk": suggested_risk,
        "suggested_risk_reasons": suggested_risk_reasons or [],
        "findings": [finding.to_dict() for finding in findings],
    }


def audit_skills(skills_dir: str | Path) -> dict[str, object]:
    configure_utf8_output()

    skills_root = Path(skills_dir).resolve()
    reports: list[dict[str, object]] = []

    for root, dirs, files in os.walk(skills_root):
        dirs[:] = [directory for directory in dirs if not directory.startswith(".")]
        if "SKILL.md" not in files:
            continue
        reports.append(build_skill_report(Path(root), skills_root))

    reports.sort(key=lambda report: str(report["id"]).lower())

    code_counts = Counter()
    severity_counts = Counter()
    risk_suggestion_counts = Counter()
    for report in reports:
        for finding in report["findings"]:
            code_counts[finding["code"]] += 1
            severity_counts[finding["severity"]] += 1
        if report["suggested_risk"] not in (None, "unknown", "none"):
            risk_suggestion_counts[report["suggested_risk"]] += 1

    summary = {
        "skills_scanned": len(reports),
        "skills_ok": sum(report["status"] == "ok" for report in reports),
        "skills_with_errors": sum(report["status"] == "error" for report in reports),
        "skills_with_warnings_only": sum(report["status"] == "warning" for report in reports),
        "skills_with_suggested_risk": sum(
            report["suggested_risk"] not in ("unknown", "none")
            for report in reports
        ),
        "errors": severity_counts["error"],
        "warnings": severity_counts["warning"],
        "infos": severity_counts["info"],
        "risk_suggestions": [
            {"risk": risk, "count": count}
            for risk, count in risk_suggestion_counts.most_common()
        ],
        "top_finding_codes": [
            {"code": code, "count": count}
            for code, count in code_counts.most_common()
        ],
    }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "skills_dir": str(skills_root),
        "summary": summary,
        "skills": reports,
    }


def write_markdown_report(report: dict[str, object], destination: str | Path) -> None:
    summary = report["summary"]
    skills = report["skills"]
    top_findings = summary["top_finding_codes"][:DEFAULT_MARKDOWN_TOP_FINDINGS]
    top_skills = [
        skill for skill in skills if skill["status"] != "ok"
    ][:DEFAULT_MARKDOWN_TOP_SKILLS]
    risk_suggestions = [
        skill
        for skill in skills
        if skill.get("suggested_risk") not in (None, "unknown", "none")
        and (
            skill.get("risk") in (None, "unknown")
            or skill.get("risk") != skill.get("suggested_risk")
        )
    ][:DEFAULT_MARKDOWN_TOP_RISK_SUGGESTIONS]

    lines = [
        "# Skills Audit Report",
        "",
        f"Generated at: `{report['generated_at']}`",
        "",
        "## Summary",
        "",
        f"- Skills scanned: **{summary['skills_scanned']}**",
        f"- Skills ready: **{summary['skills_ok']}**",
        f"- Skills with errors: **{summary['skills_with_errors']}**",
        f"- Skills with warnings only: **{summary['skills_with_warnings_only']}**",
        f"- Skills with suggested risk: **{summary['skills_with_suggested_risk']}**",
        f"- Total errors: **{summary['errors']}**",
        f"- Total warnings: **{summary['warnings']}**",
        f"- Total info findings: **{summary['infos']}**",
    ]

    if summary.get("risk_suggestions"):
        summary_text = ", ".join(
            f"{item['risk']}: {item['count']}" for item in summary["risk_suggestions"]
        )
        lines.append(f"- Suggested risks: **{summary_text}**")

    lines.extend(
        [
            "",
            "## Top Finding Codes",
            "",
            "| Code | Count |",
            "| --- | ---: |",
        ]
    )

    if top_findings:
        lines.extend(f"| `{item['code']}` | {item['count']} |" for item in top_findings)
    else:
        lines.append("| _none_ | 0 |")

    lines.extend(
        [
            "",
            "## Skills Needing Attention",
            "",
            "| Skill | Status | Errors | Warnings |",
            "| --- | --- | ---: | ---: |",
        ]
    )

    if top_skills:
        lines.extend(
            f"| `{skill['id']}` | {skill['status']} | {skill['error_count']} | {skill['warning_count']} |"
            for skill in top_skills
        )
    else:
        lines.append("| _none_ | ok | 0 | 0 |")

    lines.extend(
        [
            "",
            "## Risk Suggestions",
            "",
            "| Skill | Current | Suggested | Why |",
            "| --- | --- | --- | --- |",
        ]
    )

    if risk_suggestions:
        lines.extend(
            f"| `{skill['id']}` | {skill.get('risk') or 'unknown'} | {skill.get('suggested_risk') or 'unknown'} | {', '.join(skill.get('suggested_risk_reasons', [])[:3]) or '_n/a_'} |"
            for skill in risk_suggestions
        )
    else:
        lines.append("| _none_ | _none_ | _none_ | _n/a_ |")

    Path(destination).write_text("\n".join(lines) + "\n", encoding="utf-8")


def print_summary(report: dict[str, object]) -> None:
    summary = report["summary"]
    print("🔎 Skills audit completed")
    print(f"   Skills scanned: {summary['skills_scanned']}")
    print(f"   Ready: {summary['skills_ok']}")
    print(f"   Warning only: {summary['skills_with_warnings_only']}")
    print(f"   With errors: {summary['skills_with_errors']}")
    print(f"   With suggested risk: {summary['skills_with_suggested_risk']}")
    print(f"   Total warnings: {summary['warnings']}")
    print(f"   Total errors: {summary['errors']}")
    print(f"   Total info findings: {summary['infos']}")
    if summary.get("risk_suggestions"):
        risk_summary = ", ".join(
            f"{item['risk']}: {item['count']}"
            for item in summary["risk_suggestions"]
        )
        print(f"   Suggested risks: {risk_summary}")

    top_findings = summary["top_finding_codes"][:10]
    if top_findings:
        print("   Top findings:")
        for item in top_findings:
            print(f"   - {item['code']}: {item['count']}")


def load_strict_budget(repo_root: Path) -> dict[str, object]:
    budget_path = repo_root / STRICT_BUDGET_PATH
    try:
        budget = json.loads(budget_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"Missing strict audit budget: {STRICT_BUDGET_PATH}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid strict audit budget JSON: {STRICT_BUDGET_PATH}: {exc}") from exc

    max_warnings = budget.get("maxWarnings")
    max_warning_only_skills = budget.get("maxWarningOnlySkills")
    max_top_finding_codes = budget.get("maxTopFindingCodes")

    if not isinstance(max_warnings, int) or max_warnings < 0:
        raise ValueError(f"{STRICT_BUDGET_PATH} must define non-negative integer maxWarnings")
    if not isinstance(max_warning_only_skills, int) or max_warning_only_skills < 0:
        raise ValueError(f"{STRICT_BUDGET_PATH} must define non-negative integer maxWarningOnlySkills")
    if not isinstance(max_top_finding_codes, dict):
        raise ValueError(f"{STRICT_BUDGET_PATH} must define maxTopFindingCodes")
    for code, maximum in max_top_finding_codes.items():
        if not isinstance(code, str) or not isinstance(maximum, int) or maximum < 0:
            raise ValueError(f"{STRICT_BUDGET_PATH} maxTopFindingCodes values must be non-negative integers")

    return budget


def evaluate_strict_budget(summary: dict[str, object], budget: dict[str, object]) -> list[str]:
    issues: list[str] = []
    warnings = int(summary.get("warnings", 0))
    warning_only_skills = int(summary.get("skills_with_warnings_only", 0))
    errors = int(summary.get("errors", 0))
    max_warnings = int(budget["maxWarnings"])
    max_warning_only_skills = int(budget["maxWarningOnlySkills"])
    max_top_finding_codes = dict(budget["maxTopFindingCodes"])

    if errors > 0:
        issues.append(f"errors present: {errors}")
    if warnings > max_warnings:
        issues.append(f"warnings exceed budget: {warnings}/{max_warnings}")
    if warning_only_skills > max_warning_only_skills:
        issues.append(f"warning-only skills exceed budget: {warning_only_skills}/{max_warning_only_skills}")

    finding_counts = {
        item["code"]: item["count"]
        for item in summary.get("top_finding_codes", [])
        if isinstance(item, dict) and "code" in item and "count" in item
    }
    for code, maximum in max_top_finding_codes.items():
        actual = int(finding_counts.get(code, 0))
        if actual > maximum:
            issues.append(f"{code} findings exceed budget: {actual}/{maximum}")

    return issues


def print_strict_budget_status(summary: dict[str, object], budget: dict[str, object], issues: list[str]) -> None:
    print("   Strict audit budget:")
    print(f"   - warnings: {summary['warnings']}/{budget['maxWarnings']}")
    print(f"   - warning-only skills: {summary['skills_with_warnings_only']}/{budget['maxWarningOnlySkills']}")
    for code, maximum in budget["maxTopFindingCodes"].items():
        actual = next(
            (item["count"] for item in summary["top_finding_codes"] if item["code"] == code),
            0,
        )
        print(f"   - {code}: {actual}/{maximum}")
    if issues:
        print("   Strict audit budget exceeded:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("   Strict audit budget: within baseline")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit every SKILL.md for conformance and baseline usability.")
    parser.add_argument(
        "--json-out",
        help="Write the full machine-readable audit report to this path.",
    )
    parser.add_argument(
        "--markdown-out",
        help="Write a concise Markdown summary to this path.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with code 1 on errors or warning regressions above tools/config/audit-skills-strict-budget.json.",
    )
    args = parser.parse_args()

    repo_root = find_repo_root(__file__)
    report = audit_skills(repo_root / "skills")
    print_summary(report)

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"📝 Wrote JSON audit report to {args.json_out}")

    if args.markdown_out:
        write_markdown_report(report, args.markdown_out)
        print(f"📝 Wrote Markdown audit report to {args.markdown_out}")

    summary = report["summary"]
    if args.strict:
        try:
            budget = load_strict_budget(repo_root)
        except ValueError as exc:
            print(f"❌ {exc}", file=sys.stderr)
            return 1
        budget_issues = evaluate_strict_budget(summary, budget)
        print_strict_budget_status(summary, budget, budget_issues)
        if budget_issues:
            return 1
        return 0
    if summary["errors"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
