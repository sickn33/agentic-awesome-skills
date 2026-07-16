#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from _project_paths import find_repo_root
from audit_consistency import find_local_consistency_issues
from check_validation_warning_budget import check_warning_budget
from update_readme import configure_utf8_output, load_metadata


def get_git_status(base_dir: str | Path) -> list[str]:
    result = subprocess.run(
        ["git", "status", "--short"],
        cwd=str(base_dir),
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def build_audit_summary(
    base_dir: str | Path,
    warning_budget_checker=check_warning_budget,
    consistency_finder=find_local_consistency_issues,
    git_status_resolver=get_git_status,
) -> dict:
    root = Path(base_dir)
    metadata = load_metadata(str(root))
    consistency_issues = consistency_finder(root)
    git_status = git_status_resolver(root)

    return {
        "repo": metadata["repo"],
        "version": metadata["version"],
        "total_skills": metadata["total_skills"],
        "total_skills_label": metadata["total_skills_label"],
        "warning_budget": warning_budget_checker(root),
        "consistency_issues": consistency_issues,
        "git": {
            "clean": len(git_status) == 0,
            "changed_files": git_status,
        },
    }


def print_human_summary(summary: dict) -> None:
    warning_budget = summary["warning_budget"]
    warning_status = "within budget" if warning_budget["within_budget"] else "over budget"
    consistency_status = "clean" if not summary["consistency_issues"] else f"{len(summary['consistency_issues'])} issue(s)"
    git_status = "clean" if summary["git"]["clean"] else f"{len(summary['git']['changed_files'])} changed file(s)"

    print(f"Repository: {summary['repo']}")
    print(f"Version: {summary['version']}")
    print(f"Skills: {summary['total_skills_label']}")
    print(f"Warning budget: {warning_status} ({warning_budget['actual']}/{warning_budget['max']})")
    print(f"Consistency: {consistency_status}")
    print(f"Git working tree: {git_status}")

    if summary["consistency_issues"]:
        print("\nConsistency issues:")
        for issue in summary["consistency_issues"]:
            print(f"- {issue}")

    if summary["git"]["changed_files"]:
        print("\nChanged files:")
        for line in summary["git"]["changed_files"]:
            print(f"- {line}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Print a maintainer-friendly repository health summary.")
    parser.add_argument("--json", action="store_true", help="Print the full audit summary as JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)
    summary = build_audit_summary(root)

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print_human_summary(summary)

    if not summary["warning_budget"]["within_budget"]:
        return 1
    if summary["consistency_issues"]:
        return 1
    if not summary["git"]["clean"]:
        return 1
    return 0


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
