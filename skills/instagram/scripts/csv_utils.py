"""CSV helpers that keep exported cells inert in spreadsheet applications."""

from __future__ import annotations

from typing import Any, Mapping


def spreadsheet_safe_cell(value: Any) -> Any:
    """Prefix formula-like strings so spreadsheet software treats them as text."""
    if not isinstance(value, str):
        return value
    candidate = value.lstrip(" \t\r\n")
    if candidate.startswith(("=", "+", "-", "@")):
        return "'" + value
    return value


def spreadsheet_safe_record(record: Mapping[str, Any]) -> dict[str, Any]:
    """Return a copy of *record* with every string cell neutralized."""
    return {key: spreadsheet_safe_cell(value) for key, value in record.items()}
