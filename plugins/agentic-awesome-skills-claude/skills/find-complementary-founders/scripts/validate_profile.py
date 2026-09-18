#!/usr/bin/env python3
"""Validate a public FindMate owner profile without network access."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

SCHEMA_VERSION = "1.0"
SCHEMA_URL = (
    "https://raw.githubusercontent.com/merc1305/findMate/main/"
    "schemas/findmate-owner-profile-v1.schema.json"
)

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

DIMENSIONS = STAGES + FUNCTIONS
LEVELS = ("unknown", "observed", "practiced", "strong", "standout")
CONFIDENCE_LEVELS = ("none", "low", "medium", "high")

ROOT_KEYS = {
    "schema_version",
    "profile_type",
    "alias",
    "summary",
    "generated_at",
    "expires_on",
    "stage_contributions",
    "functional_contributions",
    "preferences",
    "seeking",
    "public_evidence",
    "contact",
    "consent",
    "interpretation",
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


class ValidationError(ValueError):
    """Raised when a public profile is malformed, unsafe, or expired."""


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValidationError(f"Cannot load {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise ValidationError("profile must be a JSON object")
    return value


def exact_object(value: object, field: str, keys: set[str]) -> dict:
    if not isinstance(value, dict):
        raise ValidationError(f"{field} must be an object")
    actual = set(value)
    missing = sorted(keys - actual)
    extra = sorted(actual - keys)
    if missing:
        raise ValidationError(f"{field} is missing: {', '.join(missing)}")
    if extra:
        raise ValidationError(f"{field} has unsupported fields: {', '.join(extra)}")
    return value


def text(value: object, field: str, *, maximum: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{field} must be a non-empty string")
    clean = value.strip()
    if clean != value:
        raise ValidationError(f"{field} must not have surrounding whitespace")
    if len(clean) > maximum:
        raise ValidationError(f"{field} exceeds {maximum} characters")
    return clean


def public_text(value: object, field: str, *, maximum: int) -> str:
    clean = text(value, field, maximum=maximum)
    for label, pattern in SENSITIVE_PATTERNS.items():
        if pattern.search(clean):
            raise ValidationError(f"{field} appears to contain a {label}")
    return clean


def alias(value: object, field: str = "alias") -> str:
    clean = public_text(value, field, maximum=50)
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{1,49}", clean):
        raise ValidationError(
            f"{field} must be a 2-50 character pseudonym using letters, "
            "digits, _ or -"
        )
    return clean


def evidence_identifier(value: object, field: str) -> str:
    clean = public_text(value, field, maximum=60)
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}", clean):
        raise ValidationError(
            f"{field} must use letters, digits, _ or - and begin with "
            "a letter or digit"
        )
    return clean


def iso_date(value: object, field: str) -> date:
    raw = text(value, field, maximum=10)
    try:
        parsed = date.fromisoformat(raw)
    except ValueError as exc:
        raise ValidationError(f"{field} must use YYYY-MM-DD") from exc
    if parsed.isoformat() != raw:
        raise ValidationError(f"{field} must use canonical YYYY-MM-DD")
    return parsed


def iso_datetime(value: object, field: str) -> datetime:
    raw = text(value, field, maximum=35)
    normalized = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValidationError(f"{field} must be an ISO 8601 timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValidationError(f"{field} must include a UTC offset")
    return parsed.astimezone(timezone.utc)


def https_url(
    value: object,
    field: str,
    *,
    github_contact_type: str | None = None,
) -> str:
    raw = public_text(value, field, maximum=500)
    parsed = urlparse(raw)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValidationError(
            f"{field} must be a credential-free HTTPS URL without query or fragment"
        )
    if github_contact_type:
        if parsed.hostname.lower() != "github.com":
            raise ValidationError(f"{field} must use github.com")
        parts = [part for part in parsed.path.split("/") if part]
        expected = "issues" if github_contact_type == "github_issues" else "discussions"
        if len(parts) < 3 or parts[2] != expected:
            raise ValidationError(f"{field} must point to a GitHub {expected} page")
    return raw


def unique_enum_list(
    value: object,
    field: str,
    allowed: tuple[str, ...],
    *,
    required: bool = False,
) -> list[str]:
    if not isinstance(value, list):
        raise ValidationError(f"{field} must be a list")
    if required and not value:
        raise ValidationError(f"{field} must not be empty")
    if len(value) != len(set(value)):
        raise ValidationError(f"{field} must not contain duplicates")
    for item in value:
        if item not in allowed:
            raise ValidationError(f"{field} contains unsupported value {item!r}")
    return value


def public_string_list(
    value: object,
    field: str,
    *,
    limit: int,
) -> list[str]:
    if not isinstance(value, list) or len(value) > limit:
        raise ValidationError(f"{field} must be a list with at most {limit} items")
    output: list[str] = []
    for index, item in enumerate(value):
        output.append(public_text(item, f"{field}[{index}]", maximum=80))
    if len(output) != len(set(output)):
        raise ValidationError(f"{field} must not contain duplicates")
    return output


def score_level(score: int) -> str:
    if score == 0:
        return "unknown"
    if score < 25:
        return "observed"
    if score < 50:
        return "practiced"
    if score < 75:
        return "strong"
    return "standout"


def contribution_vectors(
    value: object,
    field: str,
    dimensions: tuple[str, ...],
) -> None:
    vectors = exact_object(value, field, set(dimensions))
    vector_keys = {"score", "level", "confidence", "evidence_count"}
    for dimension in dimensions:
        prefix = f"{field}.{dimension}"
        item = exact_object(vectors[dimension], prefix, vector_keys)
        score = item["score"]
        count = item["evidence_count"]
        if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
            raise ValidationError(f"{prefix}.score must be an integer from 0 to 100")
        if (
            isinstance(count, bool)
            or not isinstance(count, int)
            or not 0 <= count <= 50
        ):
            raise ValidationError(
                f"{prefix}.evidence_count must be an integer from 0 to 50"
            )
        if item["level"] not in LEVELS:
            raise ValidationError(f"{prefix}.level is unsupported")
        expected_level = score_level(score)
        if item["level"] != expected_level:
            raise ValidationError(
                f"{prefix}.level must be {expected_level!r} for score {score}"
            )
        if item["confidence"] not in CONFIDENCE_LEVELS:
            raise ValidationError(f"{prefix}.confidence is unsupported")
        if count == 0 and (score != 0 or item["confidence"] != "none"):
            raise ValidationError(
                f"{prefix} with no evidence must have score 0 and confidence none"
            )
        if count > 0 and item["confidence"] == "none":
            raise ValidationError(
                f"{prefix} with evidence must not use confidence none"
            )


def validate_profile(profile: dict) -> dict:
    exact_object(profile, "profile", ROOT_KEYS)
    if profile["schema_version"] != SCHEMA_VERSION:
        raise ValidationError(f"schema_version must be {SCHEMA_VERSION}")
    if profile["profile_type"] != "founder-collaboration":
        raise ValidationError("profile_type must be founder-collaboration")

    profile_alias = alias(profile["alias"])
    public_text(profile["summary"], "summary", maximum=280)
    generated_at = iso_datetime(profile["generated_at"], "generated_at")
    expires_on = iso_date(profile["expires_on"], "expires_on")
    today = datetime.now(timezone.utc).date()
    if expires_on < today:
        raise ValidationError(f"profile expired on {expires_on.isoformat()}")
    if generated_at.date() > expires_on:
        raise ValidationError("generated_at must not be after expires_on")

    contribution_vectors(
        profile["stage_contributions"],
        "stage_contributions",
        STAGES,
    )
    contribution_vectors(
        profile["functional_contributions"],
        "functional_contributions",
        FUNCTIONS,
    )

    preferences = exact_object(
        profile["preferences"],
        "preferences",
        {"stages", "functions"},
    )
    unique_enum_list(preferences["stages"], "preferences.stages", STAGES)
    unique_enum_list(preferences["functions"], "preferences.functions", FUNCTIONS)

    seeking = exact_object(
        profile["seeking"],
        "seeking",
        {
            "stages",
            "functions",
            "project_themes",
            "collaboration_modes",
            "shared_principles",
        },
    )
    sought_stages = unique_enum_list(seeking["stages"], "seeking.stages", STAGES)
    sought_functions = unique_enum_list(
        seeking["functions"],
        "seeking.functions",
        FUNCTIONS,
    )
    if not sought_stages and not sought_functions:
        raise ValidationError(
            "seeking must name at least one stage or functional capability"
        )
    public_string_list(
        seeking["project_themes"],
        "seeking.project_themes",
        limit=10,
    )
    public_string_list(
        seeking["collaboration_modes"],
        "seeking.collaboration_modes",
        limit=5,
    )
    public_string_list(
        seeking["shared_principles"],
        "seeking.shared_principles",
        limit=10,
    )

    evidence = profile["public_evidence"]
    if not isinstance(evidence, list) or len(evidence) > 50:
        raise ValidationError("public_evidence must be a list with at most 50 items")
    evidence_ids: set[str] = set()
    for index, raw in enumerate(evidence):
        prefix = f"public_evidence[{index}]"
        item = exact_object(raw, prefix, {"id", "claim", "proof", "supports"})
        evidence_id = evidence_identifier(item["id"], f"{prefix}.id")
        if evidence_id in evidence_ids:
            raise ValidationError(f"duplicate public evidence id: {evidence_id}")
        evidence_ids.add(evidence_id)
        public_text(item["claim"], f"{prefix}.claim", maximum=180)
        https_url(item["proof"], f"{prefix}.proof")
        unique_enum_list(
            item["supports"],
            f"{prefix}.supports",
            DIMENSIONS,
            required=True,
        )

    contact = exact_object(profile["contact"], "contact", {"type", "url"})
    if contact["type"] not in {"github_issues", "github_discussions"}:
        raise ValidationError("contact.type is unsupported")
    https_url(
        contact["url"],
        "contact.url",
        github_contact_type=contact["type"],
    )

    consent = exact_object(
        profile["consent"],
        "consent",
        {"state", "approved_at", "expires_on", "scope"},
    )
    if consent["state"] != "public_profile_approved":
        raise ValidationError("consent.state must be public_profile_approved")
    approved_at = iso_date(consent["approved_at"], "consent.approved_at")
    consent_expires = iso_date(consent["expires_on"], "consent.expires_on")
    if approved_at > today:
        raise ValidationError("consent.approved_at must not be in the future")
    if approved_at > generated_at.date():
        raise ValidationError(
            "consent.approved_at must not be after generated_at"
        )
    if consent_expires != expires_on:
        raise ValidationError("consent.expires_on must equal profile expires_on")
    if consent_expires < approved_at:
        raise ValidationError("consent.expires_on must not precede approved_at")
    if (consent_expires - approved_at).days > 180:
        raise ValidationError("public profile consent may cover at most 180 days")
    public_text(consent["scope"], "consent.scope", maximum=180)

    interpretation = exact_object(
        profile["interpretation"],
        "interpretation",
        {"status", "not_for"},
    )
    if interpretation["status"] != "owner-approved collaboration hypothesis":
        raise ValidationError("interpretation.status is unsupported")
    required_exclusions = {
        "employment screening",
        "psychometric diagnosis",
        "sensitive-trait inference",
    }
    excluded = unique_enum_list(
        interpretation["not_for"],
        "interpretation.not_for",
        tuple(sorted(required_exclusions)),
        required=True,
    )
    if set(excluded) != required_exclusions:
        raise ValidationError(
            "interpretation.not_for must contain all protocol exclusions"
        )

    canonical = json.dumps(
        profile,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return {
        "valid": True,
        "schema": SCHEMA_URL,
        "schema_version": SCHEMA_VERSION,
        "alias": profile_alias,
        "expires_on": expires_on.isoformat(),
        "canonical_sha256": hashlib.sha256(canonical).hexdigest(),
        "network_access": False,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate a privacy-minimized FindMate owner profile and print its "
            "canonical SHA-256. Performs no network access."
        )
    )
    parser.add_argument("profile", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        result = validate_profile(load_json(args.profile))
    except ValidationError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    json.dump(result, sys.stdout, indent=2, ensure_ascii=False, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
