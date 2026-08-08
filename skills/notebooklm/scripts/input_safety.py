"""Trust-boundary helpers for NotebookLM URLs, metadata, and responses."""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f-\x9f]")
NOTEBOOK_ID = re.compile(r"[A-Za-z0-9_-]+")


def validate_notebook_url(value: str) -> str:
    """Return a canonical URL only for an exact HTTPS NotebookLM notebook host."""
    raw = str(value).strip()
    if not raw or CONTROL_CHARACTERS.search(raw):
        raise ValueError("Notebook URL contains invalid characters")
    try:
        parsed = urlsplit(raw)
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Notebook URL is malformed") from exc
    if (
        parsed.scheme != "https"
        or (parsed.hostname or "").lower() != "notebooklm.google.com"
        or parsed.username is not None
        or parsed.password is not None
        or port not in (None, 443)
    ):
        raise ValueError("Notebook URL must use https://notebooklm.google.com")
    path_parts = [part for part in parsed.path.split("/") if part]
    if len(path_parts) != 2 or path_parts[0] != "notebook" or not NOTEBOOK_ID.fullmatch(path_parts[1]):
        raise ValueError("Notebook URL must point to one /notebook/<id> resource")
    return urlunsplit(("https", "notebooklm.google.com", f"/notebook/{path_parts[1]}", parsed.query, ""))


def validate_metadata_text(value: object, field: str, max_length: int, *, required: bool = True) -> str:
    """Reject terminal controls and unreasonable metadata lengths."""
    text = str(value).strip()
    if required and not text:
        raise ValueError(f"{field} is required")
    if CONTROL_CHARACTERS.search(text):
        raise ValueError(f"{field} contains control characters")
    if len(text) > max_length:
        raise ValueError(f"{field} exceeds {max_length} characters")
    return text


def validate_metadata_list(values: object, field: str, *, required: bool = False) -> list[str]:
    """Validate a bounded list of short metadata values."""
    if values is None:
        values = []
    if not isinstance(values, (list, tuple)):
        raise ValueError(f"{field} must be a list")
    if len(values) > 50:
        raise ValueError(f"{field} exceeds 50 entries")
    cleaned = [validate_metadata_text(value, field, 120) for value in values]
    if required and not cleaned:
        raise ValueError(f"{field} requires at least one entry")
    return cleaned


def notebook_id_from_name(name: str) -> str:
    """Derive one portable library identifier from a validated display name."""
    notebook_id = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:64].rstrip("-")
    if not notebook_id:
        raise ValueError("Notebook name must contain at least one ASCII letter or digit")
    return notebook_id


def format_untrusted_content(answer: object) -> str:
    """Serialize a remote answer as data, separate from trusted workflow guidance."""
    encoded = json.dumps(str(answer), ensure_ascii=False)
    return (
        "--- BEGIN UNTRUSTED NOTEBOOKLM CONTENT (JSON STRING) ---\n"
        f"{encoded}\n"
        "--- END UNTRUSTED NOTEBOOKLM CONTENT ---"
    )


def write_private_answer(directory: Path, answer: object, question: object) -> Path:
    """Persist remote content to a private file instead of terminal logs."""
    target_dir = Path(directory)
    target_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    if target_dir.is_symlink() or not target_dir.is_dir():
        raise ValueError("NotebookLM data directory must be a real private directory")
    target_dir.chmod(0o700)
    descriptor, raw_path = tempfile.mkstemp(
        prefix="notebooklm-answer-",
        suffix=".json",
        dir=target_dir,
    )
    path = Path(raw_path)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump({
                "classification": "untrusted_notebooklm_content",
                "question": str(question),
                "content": str(answer),
            }, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
    except Exception:
        try:
            os.close(descriptor)
        except OSError:
            pass
        path.unlink(missing_ok=True)
        raise
    return path
