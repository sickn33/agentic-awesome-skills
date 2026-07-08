#!/usr/bin/env python3
"""
Registry Report Generator — Agentic Awesome Skills
Generates a consolidated health report for the skill registry.

Combines scoring, security scanning, and drift detection into a single
data/registry-report.json file suitable for dashboards and CI monitoring.

Usage:
    node tools/scripts/run-python.js tools/scripts/generate_registry_report.py
    node tools/scripts/run-python.js tools/scripts/generate_registry_report.py --output custom/path.json
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _project_paths import find_repo_root
from validate_skills import configure_utf8_output
from score_skills import score_all_skills, build_summary, SkillScore
from detect_drift import (
    load_baseline,
    build_current_entries,
    compute_drift,
    BASELINE_FILE,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_OUTPUT = Path("data") / "registry-report.json"
REPORT_SCHEMA_VERSION = 1


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------

def _risk_breakdown_sorted(summary: dict) -> list[dict]:
    return [
        {"risk": k, "count": v}
        for k, v in sorted(
            summary.get("risk_breakdown", {}).items(),
            key=lambda kv: -kv[1],
        )
    ]


def _score_distribution_list(summary: dict) -> list[dict]:
    order = ["excellent", "good", "needs_improvement", "critical"]
    dist = summary.get("score_distribution", {})
    return [{"label": label, "count": dist.get(label, 0)} for label in order]


def build_report(
    scores: list[SkillScore],
    version: str,
    drift_summary: dict | None = None,
) -> dict[str, Any]:
    summary = build_summary(scores)

    skills_payload = sorted(
        [s.to_dict() for s in scores],
        key=lambda s: s["scores"]["total"],
    )

    report: dict[str, Any] = {
        "schema_version": REPORT_SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "skills_version": version,
        "summary": {
            "total_skills": summary.get("total_skills", 0),
            "average_score": summary.get("average_score", 0.0),
            "min_score": summary.get("min_score", 0.0),
            "max_score": summary.get("max_score", 0.0),
            "score_distribution": _score_distribution_list(summary),
            "risk_breakdown": _risk_breakdown_sorted(summary),
            "security": {
                "flag_errors": summary.get("flag_errors", 0),
                "flag_warnings": summary.get("flag_warnings", 0),
            },
        },
        "skills": skills_payload,
    }

    if drift_summary is not None:
        report["drift"] = drift_summary

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_summary_banner(report: dict) -> None:
    configure_utf8_output()
    s = report["summary"]
    dist = {d["label"]: d["count"] for d in s["score_distribution"]}
    sec = s["security"]

    print(f"\n{'═' * 60}")
    print("📋 REGISTRY REPORT GENERATED")
    print(f"{'─' * 60}")
    print(f"  Version        : {report['skills_version']}")
    print(f"  Skills         : {s['total_skills']}")
    print(f"  Avg score      : {s['average_score']:.1f}")
    print(f"  ✅ Excellent   : {dist.get('excellent', 0)}")
    print(f"  🟢 Good        : {dist.get('good', 0)}")
    print(f"  ⚠️  Needs work  : {dist.get('needs_improvement', 0)}")
    print(f"  ❌ Critical    : {dist.get('critical', 0)}")
    print(f"  Security errors: {sec['flag_errors']}")
    print(f"  Security warns : {sec['flag_warnings']}")

    if "drift" in report:
        d = report["drift"]
        print(f"  Drift detected : {'yes' if d.get('has_drift') else 'no'}")
        if d.get("has_drift"):
            print(f"    Added    : {len(d.get('added', []))}")
            print(f"    Removed  : {len(d.get('removed', []))}")
            print(f"    Modified : {len(d.get('drifted', []))}")
    print(f"{'═' * 60}\n")


def main(argv: list[str] | None = None) -> int:
    configure_utf8_output()
    parser = argparse.ArgumentParser(
        description="Generate a consolidated Antigravity skill registry health report."
    )
    parser.add_argument(
        "--output",
        metavar="FILE",
        default=str(DEFAULT_OUTPUT),
        help=f"Output path for JSON report (default: {DEFAULT_OUTPUT}).",
    )
    parser.add_argument(
        "--no-drift",
        action="store_true",
        help="Skip drift detection (faster, useful when no baseline exists).",
    )
    args = parser.parse_args(argv)

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"
    output_path = repo_root / args.output

    # Read version from package.json
    version = "unknown"
    pkg_path = repo_root / "package.json"
    if pkg_path.exists():
        try:
            version = json.loads(pkg_path.read_text(encoding="utf-8")).get("version", "unknown")
        except Exception:
            pass

    print(f"📐 Scoring {skills_dir} ...")
    scores = score_all_skills(skills_dir)
    print(f"   {len(scores)} skills scored.")

    drift_summary: dict | None = None
    if not args.no_drift:
        baseline_path = repo_root / BASELINE_FILE
        if baseline_path.exists():
            print("🔍 Computing drift ...")
            baseline = load_baseline(baseline_path)
            current = build_current_entries(skills_dir)
            drift_report = compute_drift(baseline, current)
            drift_summary = drift_report.to_dict()
        else:
            print("ℹ️  No drift baseline found — skipping drift check.")
            print("   Run: npm run drift:update  to create one.")

    report = build_report(scores, version, drift_summary)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"💾 Report saved → {output_path}")
    _print_summary_banner(report)

    return 0


if __name__ == "__main__":
    sys.exit(main())
