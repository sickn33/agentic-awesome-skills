#!/usr/bin/env python3
"""Validate a multi-source research report without network access."""

import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


SOURCE_TYPES = {"primary", "secondary", "aggregator"}
CLAIM_KINDS = {"sourced", "inference"}
CONFIDENCE_MINIMUMS = {"low": 1, "medium": 2, "high": 3}


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def canonical_url(value):
    """Return a conservative identity for an HTTP(S) URL, or None if invalid."""
    if not nonempty(value):
        return None
    if any(
        character.isspace() or ord(character) < 0x20 or ord(character) == 0x7F
        for character in value
    ):
        return None
    try:
        parsed = urlsplit(value)
        hostname = parsed.hostname
        port = parsed.port
    except ValueError:
        return None
    if parsed.scheme.lower() not in {"http", "https"} or not hostname or "." not in hostname:
        return None
    if any(character.isspace() for character in parsed.netloc):
        return None
    if parsed.username is not None or parsed.password is not None:
        return None
    normalized_host = hostname.lower()
    if ":" in normalized_host:
        normalized_host = f"[{normalized_host}]"
    default_port = (parsed.scheme.lower() == "http" and port == 80) or (
        parsed.scheme.lower() == "https" and port == 443
    )
    netloc = normalized_host if port is None or default_port else f"{normalized_host}:{port}"
    path = parsed.path or "/"
    return urlunsplit((parsed.scheme.lower(), netloc, path, parsed.query, ""))


def validate(report):
    errors = []
    if not isinstance(report, dict):
        return ["report must be a JSON object"]

    if not nonempty(report.get("question")):
        errors.append("question must be a non-empty string")
    try:
        date.fromisoformat(report.get("searched_at", ""))
    except (TypeError, ValueError):
        errors.append("searched_at must be an ISO 8601 calendar date")

    providers = report.get("providers")
    if not isinstance(providers, list) or not all(nonempty(item) for item in providers):
        errors.append("providers must be an array of non-empty strings")
        providers = []
    if len(set(providers)) < 2:
        errors.append("providers must contain at least two unique capabilities")
    if len(set(providers)) != len(providers):
        errors.append("providers must not contain duplicates")

    unavailable = report.get("unavailable_providers")
    if not isinstance(unavailable, list) or not all(nonempty(item) for item in unavailable):
        errors.append("unavailable_providers must be an array of non-empty strings")

    sources = report.get("sources")
    if not isinstance(sources, list) or not sources:
        errors.append("sources must be a non-empty array")
        sources = []

    source_ids = set()
    source_urls = set()
    for index, source in enumerate(sources):
        label = f"sources[{index}]"
        if not isinstance(source, dict):
            errors.append(f"{label} must be an object")
            continue
        source_id = source.get("id")
        url = source.get("url")
        if not nonempty(source_id):
            errors.append(f"{label}.id must be a non-empty string")
        elif source_id in source_ids:
            errors.append(f"duplicate source id: {source_id}")
        else:
            source_ids.add(source_id)
        normalized_url = canonical_url(url)
        if normalized_url is None:
            errors.append(f"{label}.url must be an HTTP(S) URL")
        elif normalized_url in source_urls:
            errors.append(f"duplicate source URL after normalization: {url}")
        else:
            source_urls.add(normalized_url)
        if not nonempty(source.get("publisher")):
            errors.append(f"{label}.publisher must be a non-empty string")
        if source.get("source_type") not in SOURCE_TYPES:
            errors.append(f"{label}.source_type must be primary, secondary, or aggregator")

    claims = report.get("claims")
    if not isinstance(claims, list) or not claims:
        errors.append("claims must be a non-empty array")
        claims = []

    claim_ids = set()
    used_sources = set()
    for index, claim in enumerate(claims):
        label = f"claims[{index}]"
        if not isinstance(claim, dict):
            errors.append(f"{label} must be an object")
            continue
        claim_id = claim.get("id")
        if not nonempty(claim_id):
            errors.append(f"{label}.id must be a non-empty string")
        elif claim_id in claim_ids:
            errors.append(f"duplicate claim id: {claim_id}")
        else:
            claim_ids.add(claim_id)
        if not nonempty(claim.get("text")):
            errors.append(f"{label}.text must be a non-empty string")
        if claim.get("kind") not in CLAIM_KINDS:
            errors.append(f"{label}.kind must be sourced or inference")

        confidence = claim.get("confidence")
        if confidence not in CONFIDENCE_MINIMUMS:
            errors.append(f"{label}.confidence must be low, medium, or high")
        refs = claim.get("source_ids")
        if not isinstance(refs, list) or not refs or not all(nonempty(item) for item in refs):
            errors.append(f"{label}.source_ids must be a non-empty string array")
            refs = []
        if len(set(refs)) != len(refs):
            errors.append(f"{label}.source_ids must not contain duplicates")

        supporting_refs = claim.get("supporting_source_ids")
        if not isinstance(supporting_refs, list) or not supporting_refs or not all(
            nonempty(item) for item in supporting_refs
        ):
            errors.append(f"{label}.supporting_source_ids must be a non-empty string array")
            supporting_refs = []
        contradicting_refs = claim.get("contradicting_source_ids")
        if not isinstance(contradicting_refs, list) or not all(
            nonempty(item) for item in contradicting_refs
        ):
            errors.append(f"{label}.contradicting_source_ids must be a string array")
            contradicting_refs = []
        if len(set(supporting_refs)) != len(supporting_refs):
            errors.append(f"{label}.supporting_source_ids must not contain duplicates")
        if len(set(contradicting_refs)) != len(contradicting_refs):
            errors.append(f"{label}.contradicting_source_ids must not contain duplicates")
        overlap = set(supporting_refs) & set(contradicting_refs)
        if overlap:
            errors.append(f"{label} cannot classify the same source as supporting and contradicting")
        if set(refs) != set(supporting_refs) | set(contradicting_refs):
            errors.append(
                f"{label}.source_ids must equal the union of supporting_source_ids and contradicting_source_ids"
            )
        for source_id in refs:
            if source_id not in source_ids:
                errors.append(f"{label} references unknown source id: {source_id}")
            else:
                used_sources.add(source_id)

        count = claim.get("independent_source_count")
        if not isinstance(count, int) or isinstance(count, bool) or count < 0:
            errors.append(f"{label}.independent_source_count must be a non-negative integer")
        else:
            if count > len(set(refs)):
                errors.append(f"{label} independent source count exceeds its source references")
            minimum = CONFIDENCE_MINIMUMS.get(confidence)
            if minimum is not None and count < minimum:
                errors.append(
                    f"{label} confidence {confidence} requires at least {minimum} independent sources"
                )
        if not isinstance(claim.get("conflict"), bool):
            errors.append(f"{label}.conflict must be true or false")
        elif claim.get("conflict"):
            if confidence == "high":
                errors.append(f"{label} cannot be high confidence while conflict is true")
            if not contradicting_refs:
                errors.append(f"{label} conflict true requires a contradicting source")
        elif contradicting_refs:
            errors.append(f"{label} conflict false cannot include contradicting sources")

    for source_id in sorted(source_ids - used_sources):
        errors.append(f"source is not referenced by any claim: {source_id}")

    gaps = report.get("gaps")
    if not isinstance(gaps, list) or not all(nonempty(item) for item in gaps):
        errors.append("gaps must be an array of non-empty strings")
    return errors


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 1:
        print("usage: validate_report.py REPORT.json", file=sys.stderr)
        return 2
    try:
        report = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        print(f"INVALID: {error}", file=sys.stderr)
        return 1
    errors = validate(report)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"INVALID: {len(errors)} error(s)", file=sys.stderr)
        return 1
    print(
        f"VALID: {len(report['sources'])} source(s), "
        f"{len(report['claims'])} claim(s), {len(set(report['providers']))} provider(s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
