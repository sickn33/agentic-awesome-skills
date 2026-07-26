#!/usr/bin/env python3
"""Create private evidence scores and a privacy-minimized public profile."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

SCHEMA_VERSION = "1.0"

STAGES = (
    "zero_to_one",
    "one_to_ten",
    "ten_to_hundred",
)

FUNCTIONS = (
    "problem_discovery",
    "product",
    "engineering",
    "design",
    "go_to_market",
    "operations",
    "people_leadership",
    "capital_partnerships",
)

EVIDENCE_WEIGHTS = {
    "customer_outcome": 5,
    "operational_outcome": 5,
    "shipped_artifact": 4,
    "repeated_responsibility": 4,
    "peer_feedback": 2,
    "preference": 1,
}

HIGH_QUALITY_KINDS = {
    "customer_outcome",
    "operational_outcome",
    "shipped_artifact",
    "repeated_responsibility",
}

SENSITIVE_PATTERNS = {
    "email address": re.compile(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE
    ),
    "phone-like number": re.compile(r"(?<!\w)(?:\+?\d[\s().-]*){9,}(?!\w)"),
    "IP address": re.compile(
        r"\b(?:25[0-5]|2[0-4]\d|1?\d?\d)"
        r"(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b"
    ),
    "secret-like text": re.compile(
        r"(?:api[_ -]?key|password|passwd|private[_ -]?key|"
        r"authorization:\s*bearer|moltbook_[A-Za-z0-9_-]{8,}|"
        r"gh[opusr]_[A-Za-z0-9_]{12,})",
        re.IGNORECASE,
    ),
    "local filesystem path": re.compile(r"(?:/Users/|/home/|[A-Z]:\\Users\\)"),
}


class ProfileError(ValueError):
    """Raised for invalid or unsafe profile input."""


def load_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ProfileError(f"Input file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ProfileError(f"Invalid JSON in {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise ProfileError("Profile input must be a JSON object")
    return data


def require_string(value: object, field: str, *, maximum: int = 500) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ProfileError(f"{field} must be a non-empty string")
    clean = value.strip()
    if len(clean) > maximum:
        raise ProfileError(f"{field} exceeds {maximum} characters")
    return clean


def validate_public_text(value: str, field: str) -> str:
    for label, pattern in SENSITIVE_PATTERNS.items():
        if pattern.search(value):
            raise ProfileError(f"{field} appears to contain a {label}")
    return value


def validate_alias(value: object) -> str:
    alias = require_string(value, "alias", maximum=50)
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{1,49}", alias):
        raise ProfileError(
            "alias must be a 2-50 character pseudonym using letters, digits, _ or -"
        )
    return alias


def validate_url(value: object, field: str, *, contact: bool = False) -> str:
    url = require_string(value, field, maximum=500)
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username:
        raise ProfileError(f"{field} must be a credential-free HTTPS URL")
    if parsed.query or parsed.fragment:
        raise ProfileError(f"{field} must not contain a query string or fragment")
    if contact:
        if parsed.hostname.lower() != "github.com":
            raise ProfileError(f"{field} must use github.com")
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) < 3 or parts[2] not in {"issues", "discussions"}:
            raise ProfileError(
                f"{field} must point to a GitHub issues or discussions page"
            )
    return url


def validate_dimension_list(
    values: object, field: str, allowed: tuple[str, ...]
) -> list[str]:
    if values is None:
        return []
    if not isinstance(values, list):
        raise ProfileError(f"{field} must be a list")
    result: list[str] = []
    for value in values:
        if value not in allowed:
            raise ProfileError(
                f"{field} contains unsupported value {value!r}; "
                f"allowed: {', '.join(allowed)}"
            )
        if value not in result:
            result.append(value)
    return result


def validate_string_list(values: object, field: str, *, limit: int = 10) -> list[str]:
    if values is None:
        return []
    if not isinstance(values, list) or len(values) > limit:
        raise ProfileError(f"{field} must be a list with at most {limit} items")
    result: list[str] = []
    for index, value in enumerate(values):
        item = require_string(value, f"{field}[{index}]", maximum=80)
        validate_public_text(item, f"{field}[{index}]")
        if item not in result:
            result.append(item)
    return result


def parse_iso_date(value: object, field: str) -> date:
    text = require_string(value, field, maximum=10)
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise ProfileError(f"{field} must use YYYY-MM-DD") from exc


def validate_consent(value: object) -> dict:
    if not isinstance(value, dict):
        raise ProfileError("consent must be an object")
    if value.get("public_profile") is not True:
        raise ProfileError(
            "consent.public_profile must be true before generating a public profile"
        )
    approved = parse_iso_date(value.get("approved_at"), "consent.approved_at")
    expires = parse_iso_date(value.get("expires_on"), "consent.expires_on")
    today = datetime.now(timezone.utc).date()
    if expires < today:
        raise ProfileError("consent.expires_on is already past")
    if expires < approved:
        raise ProfileError("consent.expires_on must not precede approved_at")
    if (expires - approved).days > 180:
        raise ProfileError("public profile consent may cover at most 180 days")
    scope = validate_public_text(
        require_string(value.get("scope"), "consent.scope", maximum=180),
        "consent.scope",
    )
    return {
        "state": "public_profile_approved",
        "approved_at": approved.isoformat(),
        "expires_on": expires.isoformat(),
        "scope": scope,
    }


def score_label(score: int) -> str:
    if score == 0:
        return "unknown"
    if score < 25:
        return "observed"
    if score < 50:
        return "practiced"
    if score < 75:
        return "strong"
    return "standout"


def confidence_label(evidence_count: int, strong_count: int) -> str:
    if evidence_count >= 3 and strong_count >= 2:
        return "high"
    if evidence_count >= 2 and strong_count >= 1:
        return "medium"
    if evidence_count >= 1:
        return "low"
    return "none"


def validate_evidence(values: object) -> tuple[list[dict], list[dict]]:
    if not isinstance(values, list) or not values:
        raise ProfileError("evidence must be a non-empty list")
    if len(values) > 50:
        raise ProfileError("evidence may contain at most 50 items")

    private_items: list[dict] = []
    public_items: list[dict] = []
    seen_ids: set[str] = set()

    for index, raw in enumerate(values):
        if not isinstance(raw, dict):
            raise ProfileError(f"evidence[{index}] must be an object")
        evidence_id = require_string(raw.get("id"), f"evidence[{index}].id", maximum=60)
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}", evidence_id):
            raise ProfileError(f"evidence[{index}].id has invalid characters")
        if evidence_id in seen_ids:
            raise ProfileError(f"duplicate evidence id: {evidence_id}")
        seen_ids.add(evidence_id)

        kind = raw.get("kind")
        if kind not in EVIDENCE_WEIGHTS:
            raise ProfileError(
                f"evidence[{index}].kind must be one of {', '.join(EVIDENCE_WEIGHTS)}"
            )
        stages = validate_dimension_list(
            raw.get("stages"), f"evidence[{index}].stages", STAGES
        )
        functions = validate_dimension_list(
            raw.get("functions"), f"evidence[{index}].functions", FUNCTIONS
        )
        if not stages and not functions:
            raise ProfileError(
                f"evidence[{index}] must tag at least one stage or function"
            )
        note = require_string(
            raw.get("private_note"), f"evidence[{index}].private_note", maximum=1000
        )
        share = raw.get("share") is True
        private_items.append(
            {
                "id": evidence_id,
                "kind": kind,
                "weight": EVIDENCE_WEIGHTS[kind],
                "stages": stages,
                "functions": functions,
                "private_note": note,
                "share": share,
            }
        )

        if share:
            claim = validate_public_text(
                require_string(
                    raw.get("public_claim"),
                    f"evidence[{index}].public_claim",
                    maximum=180,
                ),
                f"evidence[{index}].public_claim",
            )
            proof = validate_url(
                raw.get("public_proof"), f"evidence[{index}].public_proof"
            )
            public_items.append(
                {
                    "id": evidence_id,
                    "claim": claim,
                    "proof": proof,
                    "supports": stages + functions,
                }
            )

    return private_items, public_items


def compute_vectors(evidence: list[dict], dimensions: tuple[str, ...]) -> dict:
    raw_scores: defaultdict[str, int] = defaultdict(int)
    counts: defaultdict[str, int] = defaultdict(int)
    strong_counts: defaultdict[str, int] = defaultdict(int)
    ids: defaultdict[str, list[str]] = defaultdict(list)

    dimension_key = "stages" if dimensions == STAGES else "functions"
    for item in evidence:
        if item["kind"] == "preference":
            continue
        for dimension in item[dimension_key]:
            raw_scores[dimension] += item["weight"]
            counts[dimension] += 1
            ids[dimension].append(item["id"])
            if item["kind"] in HIGH_QUALITY_KINDS:
                strong_counts[dimension] += 1

    output: dict[str, dict] = {}
    for dimension in dimensions:
        score = min(100, round(raw_scores[dimension] / 15 * 100))
        output[dimension] = {
            "score": score,
            "level": score_label(score),
            "confidence": confidence_label(counts[dimension], strong_counts[dimension]),
            "evidence_count": counts[dimension],
            "evidence_ids": ids[dimension],
        }
    return output


def validate_preferences(value: object) -> dict:
    if value is None:
        value = {}
    if not isinstance(value, dict):
        raise ProfileError("preferences must be an object")
    return {
        "stages": validate_dimension_list(
            value.get("stages"), "preferences.stages", STAGES
        ),
        "functions": validate_dimension_list(
            value.get("functions"), "preferences.functions", FUNCTIONS
        ),
    }


def validate_seeking(value: object) -> dict:
    if not isinstance(value, dict):
        raise ProfileError("seeking must be an object")
    stages = validate_dimension_list(value.get("stages"), "seeking.stages", STAGES)
    functions = validate_dimension_list(
        value.get("functions"), "seeking.functions", FUNCTIONS
    )
    if not stages and not functions:
        raise ProfileError("seeking must name at least one stage or function")
    return {
        "stages": stages,
        "functions": functions,
        "project_themes": validate_string_list(
            value.get("project_themes"), "seeking.project_themes"
        ),
        "collaboration_modes": validate_string_list(
            value.get("collaboration_modes"), "seeking.collaboration_modes", limit=5
        ),
        "shared_principles": validate_string_list(
            value.get("shared_principles"), "seeking.shared_principles"
        ),
    }


def validate_contact(value: object) -> dict:
    if not isinstance(value, dict):
        raise ProfileError("public_contact must be an object")
    contact_type = value.get("type")
    if contact_type not in {"github_issues", "github_discussions"}:
        raise ProfileError(
            "public_contact.type must be github_issues or github_discussions"
        )
    return {
        "type": contact_type,
        "url": validate_url(value.get("url"), "public_contact.url", contact=True),
    }


def public_vectors(vectors: dict) -> dict:
    return {
        name: {
            "score": values["score"],
            "level": values["level"],
            "confidence": values["confidence"],
            "evidence_count": values["evidence_count"],
        }
        for name, values in vectors.items()
    }


def write_json(path: Path, data: dict, *, private: bool) -> None:
    if private and not path.name.endswith(".private.json"):
        raise ProfileError("private output filename must end in .private.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        raise ProfileError(f"Refusing to write through symlink: {path}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600 if private else 0o644)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        os.fchmod(handle.fileno(), 0o600 if private else 0o644)
        json.dump(data, handle, indent=2, ensure_ascii=False, sort_keys=True)
        handle.write("\n")


def build_profiles(data: dict) -> tuple[dict, dict]:
    alias = validate_alias(data.get("alias"))
    summary = validate_public_text(
        require_string(data.get("summary"), "summary", maximum=280), "summary"
    )
    evidence, public_evidence = validate_evidence(data.get("evidence"))
    preferences = validate_preferences(data.get("preferences"))
    seeking = validate_seeking(data.get("seeking"))
    contact = validate_contact(data.get("public_contact"))
    consent = validate_consent(data.get("consent"))

    stage_vectors = compute_vectors(evidence, STAGES)
    function_vectors = compute_vectors(evidence, FUNCTIONS)
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    public_profile = {
        "schema_version": SCHEMA_VERSION,
        "profile_type": "founder-collaboration",
        "alias": alias,
        "summary": summary,
        "generated_at": generated_at,
        "expires_on": consent["expires_on"],
        "stage_contributions": public_vectors(stage_vectors),
        "functional_contributions": public_vectors(function_vectors),
        "preferences": preferences,
        "seeking": seeking,
        "public_evidence": public_evidence,
        "contact": contact,
        "consent": consent,
        "interpretation": {
            "status": "owner-approved collaboration hypothesis",
            "not_for": [
                "employment screening",
                "psychometric diagnosis",
                "sensitive-trait inference",
            ],
        },
    }

    private_assessment = {
        "schema_version": SCHEMA_VERSION,
        "alias": alias,
        "generated_at": generated_at,
        "evidence": evidence,
        "stage_contributions": stage_vectors,
        "functional_contributions": function_vectors,
        "preferences": preferences,
        "seeking": seeking,
        "public_profile_preview": public_profile,
    }
    return public_profile, private_assessment


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Score owner-selected evidence and produce a safe public profile."
    )
    parser.add_argument("input", type=Path, help="Private owner input JSON")
    parser.add_argument(
        "--public-output", type=Path, help="Write the public profile JSON here"
    )
    parser.add_argument(
        "--private-output",
        type=Path,
        help="Optional private assessment; filename must end in .private.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        public_profile, private_assessment = build_profiles(load_json(args.input))
        if args.public_output:
            write_json(args.public_output, public_profile, private=False)
        if args.private_output:
            write_json(args.private_output, private_assessment, private=True)
        if not args.public_output:
            json.dump(
                public_profile,
                sys.stdout,
                indent=2,
                ensure_ascii=False,
                sort_keys=True,
            )
            sys.stdout.write("\n")
    except ProfileError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
