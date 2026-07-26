#!/usr/bin/env python3
"""Verify one untrusted FindMate GitHub owner-profile submission safely."""

from __future__ import annotations

import argparse
import hmac
import importlib.util
import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

REPOSITORY = "merc1305/findMate"
ISSUE_NUMBER = 2
PROFILE_REPLY_MARKER = "FINDMATE_OWNER_PROFILE_V1"
MAX_PROFILE_BYTES = 65_536
GITHUB_BLOB_PATTERN = re.compile(
    r"^/"
    r"(?P<owner>[A-Za-z0-9][A-Za-z0-9-]{0,38})/"
    r"(?P<repo>[A-Za-z0-9._-]{1,100})/"
    r"blob/"
    r"(?P<commit>[0-9a-fA-F]{40})/"
    r"(?P<path>[A-Za-z0-9._/-]+\.json)$"
)

REASON_MESSAGES = {
    "comment_deleted": (
        "The source owner-profile comment was deleted and is revoked."
    ),
    "comment_shape": (
        "The marked comment is missing its own-owner declaration, inline or "
        "linked profile, canonical SHA-256, or expiry."
    ),
    "event_scope": "The event does not belong to the canonical FindMate issue.",
    "profile_download_failed": (
        "The immutable GitHub profile could not be downloaded within the safety limits."
    ),
    "profile_expiry_mismatch": (
        "The expiry in the comment does not match the validated profile."
    ),
    "profile_hash_mismatch": (
        "The canonical SHA-256 in the comment does not match the validated profile."
    ),
    "profile_json_invalid": (
        "The linked or inline profile is not a valid JSON object."
    ),
    "profile_too_large": (
        "The linked or inline profile exceeds its safety limit."
    ),
    "profile_url_requires_immutable_github_blob": (
        "The profile URL must be a github.com blob URL pinned to a full 40-character "
        "commit SHA."
    ),
    "profile_validation_failed": (
        "The profile failed schema, privacy, consent, or expiry validation."
    ),
}


class SubmissionError(ValueError):
    """Raised for a bounded, public-safe submission validation failure."""

    def __init__(self, code: str):
        if code not in REASON_MESSAGES:
            raise ValueError(f"Unsupported submission error code: {code}")
        super().__init__(REASON_MESSAGES[code])
        self.code = code


def load_sibling_module(module_name: str, filename: str):
    path = Path(__file__).with_name(filename)
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load required module: {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


GITHUB_THREAD = load_sibling_module("_findmate_github_thread", "github_thread.py")
PROFILE_VALIDATOR = load_sibling_module(
    "_findmate_profile_validator",
    "validate_profile.py",
)


def immutable_raw_profile_url(profile_url: str) -> str:
    parsed = urlparse(profile_url)
    try:
        port = parsed.port
    except ValueError as exc:
        raise SubmissionError(
            "profile_url_requires_immutable_github_blob"
        ) from exc
    if (
        parsed.scheme != "https"
        or parsed.hostname != "github.com"
        or port is not None
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise SubmissionError("profile_url_requires_immutable_github_blob")
    match = GITHUB_BLOB_PATTERN.fullmatch(parsed.path)
    if match is None:
        raise SubmissionError("profile_url_requires_immutable_github_blob")
    path_parts = match.group("path").split("/")
    if any(part in {"", ".", ".."} for part in path_parts):
        raise SubmissionError("profile_url_requires_immutable_github_blob")
    return (
        "https://raw.githubusercontent.com/"
        f"{match.group('owner')}/{match.group('repo')}/"
        f"{match.group('commit').lower()}/{match.group('path')}"
    )


def download_profile(raw_url: str) -> dict:
    request = Request(
        raw_url,
        headers={
            "Accept": "application/json,text/plain;q=0.9",
            "User-Agent": "findmate-owner-profile-verifier/1.0",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            final = urlparse(response.geturl())
            if (
                final.scheme != "https"
                or final.hostname != "raw.githubusercontent.com"
                or final.username
                or final.password
            ):
                raise SubmissionError("profile_download_failed")
            declared_length = response.headers.get("Content-Length")
            if declared_length:
                try:
                    if int(declared_length) > MAX_PROFILE_BYTES:
                        raise SubmissionError("profile_too_large")
                except ValueError as exc:
                    raise SubmissionError("profile_download_failed") from exc
            raw = response.read(MAX_PROFILE_BYTES + 1)
    except SubmissionError:
        raise
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise SubmissionError("profile_download_failed") from exc
    if len(raw) > MAX_PROFILE_BYTES:
        raise SubmissionError("profile_too_large")
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SubmissionError("profile_json_invalid") from exc
    if not isinstance(value, dict):
        raise SubmissionError("profile_json_invalid")
    return value


def rejected(code: str) -> dict:
    return {
        "eligible": False,
        "reason_code": code,
        "message": REASON_MESSAGES[code],
    }


def verify_comment(body: str, *, profile_loader=download_profile) -> dict:
    _, inline_error = GITHUB_THREAD.extract_inline_profile(body)
    if inline_error:
        return rejected(inline_error)
    submissions = GITHUB_THREAD.extract_marked_comments([{"body": body}])
    if len(submissions) != 1 or not submissions[0]["syntactically_eligible"]:
        return rejected("comment_shape")
    submission = submissions[0]
    try:
        if submission["profile_source"] == "inline":
            profile = submission["inline_profile"]
        else:
            raw_url = immutable_raw_profile_url(submission["profile_url"])
            profile = profile_loader(raw_url)
        validation = PROFILE_VALIDATOR.validate_profile(profile)
    except SubmissionError as exc:
        return rejected(exc.code)
    except PROFILE_VALIDATOR.ValidationError:
        return rejected("profile_validation_failed")

    if not hmac.compare_digest(
        submission["canonical_profile_sha256"],
        validation["canonical_sha256"],
    ):
        return rejected("profile_hash_mismatch")
    if submission["expires_on"] != validation["expires_on"]:
        return rejected("profile_expiry_mismatch")
    return {
        "eligible": True,
        "reason_code": None,
        "message": (
            "Schema, privacy, consent, expiry, source, and canonical hash "
            "checks passed."
        ),
        "profile_source": submission["profile_source"],
        "alias": validation["alias"],
        "expires_on": validation["expires_on"],
        "canonical_sha256": validation["canonical_sha256"],
    }


def verify_event(event: dict, *, profile_loader=download_profile) -> dict:
    repository = event.get("repository")
    issue = event.get("issue")
    comment = event.get("comment")
    if (
        not isinstance(repository, dict)
        or repository.get("full_name") != REPOSITORY
        or not isinstance(issue, dict)
        or issue.get("number") != ISSUE_NUMBER
        or not isinstance(comment, dict)
        or isinstance(comment.get("id"), bool)
        or not isinstance(comment.get("id"), int)
    ):
        return rejected("event_scope")
    if event.get("action") == "deleted":
        result = rejected("comment_deleted")
        result["revoked"] = True
        result["source_marked"] = False
        result.update(
            {
                "repository": REPOSITORY,
                "issue_number": ISSUE_NUMBER,
                "source_comment_id": comment["id"],
            }
        )
        return result
    body = comment.get("body")
    if not isinstance(body, str):
        result = rejected("comment_shape")
        source_marked = False
    else:
        source_marked = body.startswith(f"{PROFILE_REPLY_MARKER}\n")
        result = verify_comment(body, profile_loader=profile_loader)
    result.update(
        {
            "revoked": False,
            "source_marked": source_marked,
            "repository": REPOSITORY,
            "issue_number": ISSUE_NUMBER,
            "source_comment_id": comment["id"],
        }
    )
    return result


def read_event(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read GitHub event: {exc}") from exc
    if not isinstance(value, dict):
        raise RuntimeError("GitHub event must be a JSON object")
    return value


def write_result(path: Path, result: dict) -> None:
    if path.is_symlink():
        raise RuntimeError(f"Refusing to write through symlink: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--event", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        result = verify_event(read_event(args.event))
        write_result(args.output, result)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
