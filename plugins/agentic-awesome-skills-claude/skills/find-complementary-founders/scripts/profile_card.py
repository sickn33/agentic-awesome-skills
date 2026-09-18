#!/usr/bin/env python3
"""Render a deterministic, privacy-minimized Markdown profile-card draft."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

PROTOCOL_URL = "https://github.com/merc1305/findMate"
CARD_MARKER = "FINDMATE_OWNER_PROFILE_CARD_V1"

STAGE_LABELS = {
    "zero_to_one": "0→1",
    "one_to_ten": "1→10",
    "ten_to_hundred": "10→100",
}

FUNCTION_LABELS = {
    "problem_discovery": "problem discovery",
    "product": "product",
    "engineering": "engineering",
    "design": "design",
    "go_to_market": "go-to-market",
    "operations": "operations",
    "people_leadership": "people leadership",
    "capital_partnerships": "capital & partnerships",
}

LEVELS = {"unknown", "observed", "practiced", "strong", "standout"}
CONFIDENCES = {"none", "low", "medium", "high"}

SENSITIVE_PATTERNS = {
    "email address": re.compile(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE
    ),
    "phone-like number": re.compile(r"(?<!\w)(?:\+?\d[\s().-]*){9,}(?!\w)"),
    "secret-like text": re.compile(
        r"(?:api[_ -]?key|password|passwd|private[_ -]?key|"
        r"authorization:\s*bearer|moltbook_[A-Za-z0-9_-]{8,}|"
        r"gh[opusr]_[A-Za-z0-9_]{12,})",
        re.IGNORECASE,
    ),
    "local filesystem path": re.compile(r"(?:/Users/|/home/|[A-Z]:\\Users\\)"),
}


class CardError(ValueError):
    """Raised when a public profile is invalid or unsafe to render."""


def load_profile(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CardError(f"Cannot load {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise CardError(f"{path} must contain a JSON object")
    return value


def safe_text(value: object, field: str, *, maximum: int = 100) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CardError(f"{field} must be a non-empty string")
    clean = " ".join(value.split())
    if len(clean) > maximum:
        raise CardError(f"{field} exceeds {maximum} characters")
    for label, pattern in SENSITIVE_PATTERNS.items():
        if pattern.search(clean):
            raise CardError(f"{field} appears to contain a {label}")
    return clean


def markdown_text(value: str) -> str:
    escaped = value.replace("\\", "\\\\")
    for character in ("`", "*", "_", "[", "]", "<", ">", "|"):
        escaped = escaped.replace(character, f"\\{character}")
    return escaped


def canonical_profile_bytes(profile: dict) -> bytes:
    return json.dumps(
        profile,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def validate_profile(profile: dict) -> None:
    if profile.get("schema_version") != "1.0":
        raise CardError("Profile schema_version must be 1.0")
    if profile.get("profile_type") != "founder-collaboration":
        raise CardError("Profile is not a founder-collaboration profile")

    alias = safe_text(profile.get("alias"), "profile.alias", maximum=50)
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{1,49}", alias):
        raise CardError("profile.alias is not a valid pseudonym")

    consent = profile.get("consent")
    if not isinstance(consent, dict):
        raise CardError("Profile lacks consent metadata")
    if consent.get("state") != "public_profile_approved":
        raise CardError("Profile lacks public-profile approval")

    expires = profile.get("expires_on")
    try:
        expires_on = date.fromisoformat(expires)
    except (TypeError, ValueError) as exc:
        raise CardError("Profile has invalid expires_on") from exc
    if expires_on < datetime.now(timezone.utc).date():
        raise CardError(f"Profile expired on {expires_on.isoformat()}")

    validate_vectors(
        profile.get("stage_contributions"),
        "stage_contributions",
        STAGE_LABELS,
    )
    validate_vectors(
        profile.get("functional_contributions"),
        "functional_contributions",
        FUNCTION_LABELS,
    )

    seeking = profile.get("seeking")
    if not isinstance(seeking, dict):
        raise CardError("Profile seeking section is invalid")
    sought_stages = validate_dimension_list(
        seeking.get("stages"),
        "seeking.stages",
        STAGE_LABELS,
        maximum=3,
    )
    sought_functions = validate_dimension_list(
        seeking.get("functions"),
        "seeking.functions",
        FUNCTION_LABELS,
        maximum=8,
    )
    if not sought_stages and not sought_functions:
        raise CardError(
            "seeking must name at least one stage or functional capability"
        )


def validate_vectors(
    values: object,
    field: str,
    labels: dict[str, str],
) -> None:
    if not isinstance(values, dict):
        raise CardError(f"{field} must be an object")
    for name, entry in values.items():
        if name not in labels or not isinstance(entry, dict):
            raise CardError(f"{field} contains an unsupported vector")
        score = entry.get("score")
        if (
            isinstance(score, bool)
            or not isinstance(score, (int, float))
            or not 0 <= score <= 100
        ):
            raise CardError(f"{field}.{name}.score must be between 0 and 100")
        if entry.get("level") not in LEVELS:
            raise CardError(f"{field}.{name}.level is invalid")
        if entry.get("confidence") not in CONFIDENCES:
            raise CardError(f"{field}.{name}.confidence is invalid")


def validate_dimension_list(
    values: object,
    field: str,
    labels: dict[str, str],
    *,
    maximum: int,
) -> list[str]:
    if not isinstance(values, list) or len(values) > maximum:
        raise CardError(f"{field} must contain at most {maximum} values")
    output: list[str] = []
    for value in values:
        if value not in labels:
            raise CardError(f"{field} contains an unsupported value")
        safe_text(labels[value], field)
        if value not in output:
            output.append(value)
    return output


def strongest_vectors(profile: dict, *, limit: int = 4) -> list[str]:
    ranked: list[tuple[float, str, str]] = []
    for section, labels in (
        ("stage_contributions", STAGE_LABELS),
        ("functional_contributions", FUNCTION_LABELS),
    ):
        for name, entry in profile[section].items():
            if entry["level"] == "unknown":
                continue
            label = labels[name]
            rendered = (
                f"{label} — {entry['level']} "
                f"({entry['confidence']} confidence)"
            )
            ranked.append((float(entry["score"]), label, rendered))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [item[2] for item in ranked[:limit]]


def render_card(profile: dict) -> str:
    validate_profile(profile)
    alias = markdown_text(safe_text(profile["alias"], "profile.alias", maximum=50))
    strengths = strongest_vectors(profile)
    if not strengths:
        strengths = ["evidence still limited"]

    seeking = profile["seeking"]
    sought = [
        STAGE_LABELS[name]
        for name in validate_dimension_list(
            seeking["stages"],
            "seeking.stages",
            STAGE_LABELS,
            maximum=3,
        )
    ]
    sought.extend(
        FUNCTION_LABELS[name]
        for name in validate_dimension_list(
            seeking["functions"],
            "seeking.functions",
            FUNCTION_LABELS,
            maximum=8,
        )
    )
    digest = hashlib.sha256(canonical_profile_bytes(profile)).hexdigest()

    return "\n".join(
        [
            f"<!-- {CARD_MARKER} -->",
            "> [!NOTE]",
            f"> ### FindMate owner profile · `{alias}`",
            ">",
            "> **Demonstrated:** "
            + " · ".join(markdown_text(value) for value in strengths),
            ">",
            "> **Seeking:** " + " · ".join(markdown_text(value) for value in sought),
            ">",
            f"> **Expires:** {profile['expires_on']}",
            f"> **Canonical profile SHA-256:** `{digest}`",
            ">",
            "> Owner-approved collaboration hypothesis. No identity, contact "
            "details, or raw evidence are included.",
            ">",
            f"> [Open FindMate protocol]({PROTOCOL_URL})",
            "",
            "_Local draft: share only after the owner approves this exact card._",
            "",
        ]
    )


def write_card(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        raise CardError(f"Refusing to write through symlink: {path}")
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o644)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        os.fchmod(handle.fileno(), 0o644)
        handle.write(content)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Render a deterministic Markdown card draft from an already "
            "owner-approved public FindMate profile."
        )
    )
    parser.add_argument("profile", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        help="Write the local Markdown draft here; otherwise print to stdout.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        content = render_card(load_profile(args.profile))
        if args.output:
            write_card(args.output, content)
        else:
            sys.stdout.write(content)
    except CardError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
