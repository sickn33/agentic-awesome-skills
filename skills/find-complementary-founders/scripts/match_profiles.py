#!/usr/bin/env python3
"""Rank eligible own-owner thread submissions by complementarity and alignment."""

from __future__ import annotations

import argparse
import glob
import importlib.util
import json
import sys
from pathlib import Path

LEVEL_VALUE = {
    "unknown": 0.0,
    "observed": 0.2,
    "practiced": 0.5,
    "strong": 0.8,
    "standout": 1.0,
}

CONFIDENCE_VALUE = {
    "none": 0.0,
    "low": 0.35,
    "medium": 0.7,
    "high": 1.0,
}


class MatchError(ValueError):
    """Raised for an invalid public profile."""


_PROFILE_VALIDATOR = None


def profile_validator():
    global _PROFILE_VALIDATOR
    if _PROFILE_VALIDATOR is not None:
        return _PROFILE_VALIDATOR
    path = Path(__file__).with_name("validate_profile.py")
    spec = importlib.util.spec_from_file_location("findmate_profile_validator", path)
    if spec is None or spec.loader is None:
        raise MatchError("Cannot load the FindMate public-profile validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _PROFILE_VALIDATOR = module
    return module


def load_profile(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise MatchError(f"Cannot load {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise MatchError(f"{path} must contain a JSON object")
    validate_profile(value, path)
    value["_source_path"] = str(path.resolve())
    return value


def validate_profile(profile: dict, path: Path) -> None:
    validator = profile_validator()
    try:
        validator.validate_profile(profile)
    except validator.ValidationError as exc:
        raise MatchError(f"{path} failed public-profile validation: {exc}") from exc


def normalized_strings(values: object) -> set[str]:
    if not isinstance(values, list):
        return set()
    return {str(value).strip().casefold() for value in values if str(value).strip()}


def overlap_score(left: object, right: object) -> float:
    left_set = normalized_strings(left)
    right_set = normalized_strings(right)
    if not left_set or not right_set:
        return 0.0
    return len(left_set & right_set) / len(left_set | right_set)


def contribution_value(profile: dict, section: str, dimension: str) -> float:
    entry = profile.get(section, {}).get(dimension, {})
    level = LEVEL_VALUE.get(entry.get("level"), 0.0)
    confidence = CONFIDENCE_VALUE.get(entry.get("confidence"), 0.0)
    return level * (0.5 + 0.5 * confidence)


def requested_coverage(owner: dict, candidate: dict) -> tuple[float, list[str]]:
    seeking = owner.get("seeking", {})
    checks: list[float] = []
    reasons: list[str] = []
    for dimension in seeking.get("stages", []):
        value = contribution_value(candidate, "stage_contributions", dimension)
        checks.append(value)
        if value >= 0.5:
            reasons.append(f"covers stage gap: {dimension}")
    for dimension in seeking.get("functions", []):
        value = contribution_value(candidate, "functional_contributions", dimension)
        checks.append(value)
        if value >= 0.5:
            reasons.append(f"covers capability gap: {dimension}")
    return (sum(checks) / len(checks) if checks else 0.0), reasons


def reciprocal_coverage(owner: dict, candidate: dict) -> float:
    seeking = candidate.get("seeking", {})
    checks: list[float] = []
    for dimension in seeking.get("stages", []):
        checks.append(contribution_value(owner, "stage_contributions", dimension))
    for dimension in seeking.get("functions", []):
        checks.append(contribution_value(owner, "functional_contributions", dimension))
    return sum(checks) / len(checks) if checks else 0.0


def evidence_quality(candidate: dict) -> float:
    entries = list(candidate.get("stage_contributions", {}).values())
    entries += list(candidate.get("functional_contributions", {}).values())
    relevant = [entry for entry in entries if entry.get("level") != "unknown"]
    if not relevant:
        return 0.0
    confidence = sum(
        CONFIDENCE_VALUE.get(entry.get("confidence"), 0.0) for entry in relevant
    ) / len(relevant)
    proof_bonus = min(len(candidate.get("public_evidence", [])) / 3, 1.0)
    return 0.75 * confidence + 0.25 * proof_bonus


def score_match(owner: dict, candidate: dict) -> dict:
    coverage, reasons = requested_coverage(owner, candidate)
    reciprocal = reciprocal_coverage(owner, candidate)
    owner_seek = owner.get("seeking", {})
    candidate_seek = candidate.get("seeking", {})

    themes = overlap_score(
        owner_seek.get("project_themes"), candidate_seek.get("project_themes")
    )
    principles = overlap_score(
        owner_seek.get("shared_principles"), candidate_seek.get("shared_principles")
    )
    modes = overlap_score(
        owner_seek.get("collaboration_modes"),
        candidate_seek.get("collaboration_modes"),
    )
    alignment = 0.4 * themes + 0.35 * principles + 0.25 * modes
    evidence = evidence_quality(candidate)

    final = round(
        100
        * (0.50 * coverage + 0.15 * reciprocal + 0.25 * alignment + 0.10 * evidence),
        1,
    )
    if themes > 0:
        reasons.append("shares project themes")
    if principles > 0:
        reasons.append("shares operating principles")
    if modes > 0:
        reasons.append("shares collaboration mode")

    return {
        "alias": candidate["alias"],
        "score": final,
        "reasons": reasons,
        "contact": candidate["contact"],
        "profile_source": candidate["_source_path"],
        "components": {
            "gap_coverage": round(coverage, 3),
            "reciprocal_coverage": round(reciprocal, 3),
            "alignment": round(alignment, 3),
            "evidence_quality": round(evidence, 3),
        },
        "review_required": [
            "verify public evidence",
            "discuss commitment and decision rights",
            "obtain both humans' consent before direct contact",
        ],
    }


def expand_candidate_paths(patterns: list[str]) -> list[Path]:
    paths: list[Path] = []
    for pattern in patterns:
        matches = [Path(item) for item in glob.glob(pattern)]
        if not matches and Path(pattern).is_file():
            matches = [Path(pattern)]
        for match in matches:
            if match not in paths:
                paths.append(match)
    return paths


def exclude_owner_source(owner: dict, candidates: list[dict]) -> list[dict]:
    owner_source = owner.get("_source_path")
    if not isinstance(owner_source, str):
        raise MatchError("Owner profile lacks source identity")
    return [
        candidate
        for candidate in candidates
        if candidate.get("_source_path") != owner_source
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Rank owner-approved profiles obtained from marked FindMate thread "
            "submissions by capability gaps and alignment."
        )
    )
    parser.add_argument("owner", type=Path)
    parser.add_argument(
        "--candidate",
        action="append",
        required=True,
        help="Candidate file or glob; repeat as needed",
    )
    parser.add_argument("--limit", type=int, default=10)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        owner = load_profile(args.owner)
        candidates = [
            load_profile(path) for path in expand_candidate_paths(args.candidate)
        ]
        if not candidates:
            raise MatchError("No candidate profiles found")
        results = [
            score_match(owner, candidate)
            for candidate in exclude_owner_source(owner, candidates)
        ]
        results.sort(key=lambda item: item["score"], reverse=True)
        output = {
            "owner_alias": owner["alias"],
            "method": "heuristic shortlist; not a compatibility verdict",
            "matches": results[: max(1, args.limit)],
        }
        json.dump(output, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    except MatchError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
