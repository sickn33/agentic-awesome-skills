#!/usr/bin/env python3
"""Validate a review-result file against the canonical contract AND the
semantic rules that JSON Schema alone cannot fully express.

Usage: python scripts/check_review.py path/to/review.json [--context-pack path/to/pack.json]
Exit 0 = valid; exit 1 = violations printed to stderr.
"""
import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parent.parent
SEVERITY = {"stop_reframe": 2, "verify": 1, "continue": 0}
PRIORITY = {"evidence": 0, "user": 1, "business": 2}
VERDICTS = ["continue", "verify", "stop_reframe"]


def load_artifact(path):
    """Bounded regular UTF-8 JSON; duplicate keys/nonfinite values fail closed."""
    path = Path(path)
    if not path.is_file():
        raise ValueError("Artifact must be a regular file")
    with path.open('rb') as handle:
        raw = handle.read(2 * 1024 * 1024 + 1)
    if len(raw) > 2 * 1024 * 1024:
        raise ValueError("Artifact exceeds 2 MiB")
    def pairs(entries):
        result = {}
        for key, value in entries:
            if key in result:
                raise ValueError("Duplicate JSON object key")
            result[key] = value
        return result
    def reject_constant(value):
        raise ValueError("Nonfinite JSON number")
    def finite_float(value):
        import math
        number = float(value)
        if not math.isfinite(number):
            raise ValueError("Nonfinite JSON number")
        return number
    try:
        result = json.loads(raw.decode('utf-8'), object_pairs_hook=pairs,
                            parse_constant=reject_constant, parse_float=finite_float)
    except (UnicodeError, RecursionError) as exc:
        raise ValueError("Artifact encoding/nesting is unsupported") from exc
    return result


def expected_weakest_flow(reviews):
    def sort_key(lane):
        review = reviews[lane]
        return (
            -SEVERITY[review["verdict"]],
            review["evidence_tier"],
            PRIORITY[lane],
        )

    return sorted(reviews, key=sort_key)[0]


def schema_errors(document, schema_name):
    schema = json.loads(
        (ROOT / "schemas" / schema_name).read_text()
    )
    resources = []
    for external_name in sorted(p.name for p in (ROOT / "schemas").glob("*.schema.json")):
        external_schema = json.loads((ROOT / "schemas" / external_name).read_text())
        resource = Resource.from_contents(external_schema)
        resources.extend(
            [
                (external_schema["$id"], resource),
                (external_name, resource),
                (
                    f"https://cis2042.github.io/ux3-product-design-harness/schemas/{external_name}",
                    resource,
                ),
            ]
        )
    registry = Registry().with_resources(resources)
    return [
        f"schema: {error.json_path}: failed {error.validator} constraint"
        for error in Draft202012Validator(schema, registry=registry, format_checker=FormatChecker()).iter_errors(document)
    ]


def check(document):
    problems = schema_errors(document, "review-result.schema.json")
    if problems:
        return problems

    reviews = document["reviews"]
    severities = [SEVERITY[lane["verdict"]] for lane in reviews.values()]
    expected_combined = VERDICTS[max(severities)]
    if document["combined_verdict"] != expected_combined:
        problems.append(
            "combined_verdict must equal the worst lane verdict: "
            f"expected {expected_combined}, got {document['combined_verdict']}"
        )

    expected_weakest = expected_weakest_flow(reviews)
    if document["weakest_flow"] != expected_weakest:
        problems.append(
            "weakest_flow must follow the deterministic selection: "
            f"expected {expected_weakest}, got {document['weakest_flow']}"
        )

    min_lane_tier = min(lane["evidence_tier"] for lane in reviews.values())
    if document["evidence_tier"] != min_lane_tier:
        problems.append(
            "headline evidence_tier must equal the lowest lane tier: "
            f"expected {min_lane_tier}, got {document['evidence_tier']}"
        )

    tier = document["evidence_tier"]
    verdict = document["combined_verdict"]
    if tier == "t0" and verdict != "stop_reframe":
        problems.append(
            "evidence tier t0 forces stop_reframe: internal belief with no "
            f"traceable source cannot authorize {verdict}"
        )
    if tier == "t1" and verdict == "continue":
        problems.append(
            "evidence tier t1 can never return continue: stated opinion or "
            "isolated signals support at most a verify"
        )

    boundary = document.get("execution_boundary", {})
    allowed = {entry.strip().casefold() for entry in boundary.get("may_do", [])}
    forbidden = {entry.strip().casefold() for entry in boundary.get("must_not_do", [])}
    contradictions = sorted(allowed & forbidden)
    if contradictions:
        problems.append(
            "execution_boundary contradicts itself; the same entry appears in "
            f"may_do and must_not_do: {contradictions}"
        )

    if document.get("mode") == "ux3_council":
        challenges = document.get("council_record", {}).get("challenges", [])
        if len(challenges) != 3 or {challenge["reviewer"] for challenge in challenges} != {
            "user_flow", "evidence_flow", "business_flow"
        }:
            problems.append(
                "council challenge round must include exactly one reviewer per flow"
            )
    return problems


def check_handoff(document, context_pack):
    """Validate an entire handoff once; no persistent cache or authorization."""
    problems = check(document)
    problems.extend(schema_errors(context_pack, "context-pack.schema.json"))
    if problems:
        return problems
    if document["combined_verdict"] != "continue":
        problems.append("context pack requires a continue review")
    fields = [
        "schema_version", "session_config", "review_id", "stage",
        "combined_verdict", "actor_boundary", "product_organization",
        "stakeholder_effects", "human_judgment_boundary", "unresolved_assumptions",
        "execution_boundary", "human_approval_gates", "high_risk_actions",
        "stop_conditions",
    ]
    for field in fields:
        if context_pack.get(field) != document.get(field):
            problems.append(f"context pack {field} must match the review")
    if context_pack["scope"] != document["execution_boundary"]["may_do"]:
        problems.append("context pack scope must match review execution_boundary.may_do")
    if context_pack.get("evidence_snapshot_ids") != document.get("evidence_receipt_ids"):
        problems.append("context pack evidence_snapshot_ids must match review evidence_receipt_ids")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review")
    parser.add_argument("--context-pack", help="Validate the review and linked handoff together")
    args = parser.parse_args()
    try:
        document = load_artifact(args.review)
        if args.context_pack:
            context_pack = load_artifact(args.context_pack)
            problems = check_handoff(document, context_pack)
        else:
            problems = check(document)
    except (OSError, ValueError, RecursionError) as error:
        print(f"cannot read artifact: {error}", file=sys.stderr)
        return 1
    if problems:
        for problem in problems:
            print(problem, file=sys.stderr)
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
