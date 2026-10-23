#!/usr/bin/env python3
"""Validate a verdict-override file against the canonical contract AND
cross-check it against the review-result it overrides.

Usage: python scripts/check_override.py path/to/override.json path/to/review.json
Exit 0 = valid; exit 1 = violations printed to stderr.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from check_review import check as check_review, load_artifact

ROOT = Path(__file__).resolve().parent.parent


def check(override, review, now=None):
    problems = ["review: " + problem for problem in check_review(review)]
    schema = json.loads(
        (ROOT / "schemas" / "verdict-override.schema.json").read_text()
    )
    for error in Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(override):
        problems.append(f"schema: {error.json_path}: failed {error.validator} constraint")
    if problems:
        return problems

    if override["review_id"] != review["review_id"]:
        problems.append(
            "review_id mismatch: override targets "
            f"{override['review_id']!r} but the review file is "
            f"{review['review_id']!r}"
        )
    if review["combined_verdict"] == "continue":
        problems.append(
            "a continue verdict needs no override; do not create one"
        )
    elif override["overridden_verdict"] != review["combined_verdict"]:
        problems.append(
            "overridden_verdict must equal the review's combined_verdict: "
            f"{override['overridden_verdict']!r} != "
            f"{review['combined_verdict']!r}"
        )
    if override["acknowledged_weakest_flow"] != review["weakest_flow"]:
        problems.append(
            "acknowledged_weakest_flow must equal the review's weakest_flow: "
            f"{override['acknowledged_weakest_flow']!r} != "
            f"{review['weakest_flow']!r}"
        )

    expires_at = datetime.fromisoformat(
        override["expires_at"].replace("Z", "+00:00")
    )
    if now is None:
        now = datetime.now(timezone.utc)
    if now.tzinfo is None or now.utcoffset() is None:
        return problems + ["Reference time must include a timezone"]
    if expires_at <= now:
        problems.append(
            f"override expired at {override['expires_at']}: the original "
            "verdict is in force again; renew through a new review"
        )

    banned = {
        entry.strip().casefold()
        for entry in review["execution_boundary"]["must_not_do"]
    }
    own_banned = {entry.strip().casefold() for entry in override["authorized_scope"]["must_not_do"]}
    for entry in override["authorized_scope"]["may_do"]:
        if entry.strip().casefold() in own_banned:
            problems.append("authorized_scope contains conflicting may_do/must_not_do entries")
        if entry.strip().casefold() in banned:
            problems.append(
                "authorized_scope.may_do repeats an entry from the review's "
                f"execution_boundary.must_not_do: {entry!r}"
            )
    return problems


def main():
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        raise SystemExit(2)
    try:
        override = load_artifact(sys.argv[1])
        review = load_artifact(sys.argv[2])
        problems = check(override, review)
    except (OSError, ValueError, RecursionError) as error:
        print(f"cannot validate artifacts: {error}", file=sys.stderr)
        raise SystemExit(1)
    if problems:
        for problem in problems:
            print(problem, file=sys.stderr)
        raise SystemExit(1)
    print("ok")


if __name__ == "__main__":
    main()
