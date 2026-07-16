#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from _project_paths import find_repo_root
from update_readme import configure_utf8_output
from validate_skills import collect_validation_results


def load_warning_budget(base_dir: str | Path) -> int:
    root = Path(base_dir)
    budget_path = root / "tools" / "config" / "validation-budget.json"
    payload = json.loads(budget_path.read_text(encoding="utf-8"))
    max_warnings = payload.get("maxWarnings")
    if not isinstance(max_warnings, int) or max_warnings < 0:
        raise ValueError("tools/config/validation-budget.json must define a non-negative integer maxWarnings")
    return max_warnings


def check_warning_budget(base_dir: str | Path) -> dict[str, int | bool]:
    root = Path(base_dir)
    skills_dir = root / "skills"
    actual = len(collect_validation_results(str(skills_dir))["warnings"])
    maximum = load_warning_budget(root)
    return {
        "actual": actual,
        "max": maximum,
        "within_budget": actual <= maximum,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fail if validation warnings exceed the repository budget.")
    parser.add_argument("--json", action="store_true", help="Print the budget summary as JSON.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = find_repo_root(__file__)
    summary = check_warning_budget(root)

    if args.json:
        print(json.dumps(summary, indent=2))
    elif summary["within_budget"]:
        print(f"✅ Validation warnings within budget: {summary['actual']}/{summary['max']}")
    else:
        print(f"❌ Validation warnings exceed budget: {summary['actual']}/{summary['max']}")

    return 0 if summary["within_budget"] else 1


if __name__ == "__main__":
    configure_utf8_output()
    sys.exit(main())
