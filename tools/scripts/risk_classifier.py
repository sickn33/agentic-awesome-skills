#!/usr/bin/env python3
from __future__ import annotations

import re
from dataclasses import dataclass
from collections.abc import Mapping


@dataclass(frozen=True)
class RiskSuggestion:
    risk: str
    reasons: tuple[str, ...]


OFFENSIVE_HINTS = [
    (re.compile(r"AUTHORIZED USE ONLY", re.IGNORECASE), "explicit offensive disclaimer"),
    (
        re.compile(
            r"\b(?:pentest(?:ing)?|penetration testing|red team(?:ing)?|exploit(?:ation)?|malware|phishing|sql injection|xss|csrf|jailbreak|sandbox escape|credential theft|exfiltrat\w*|prompt injection)\b",
            re.IGNORECASE,
        ),
        "offensive security language",
    ),
]

CRITICAL_HINTS = [
    (re.compile(r"\bcurl\b[^\n]*\|\s*(?:bash|sh)\b", re.IGNORECASE), "curl pipes into a shell"),
    (re.compile(r"\bwget\b[^\n]*\|\s*(?:bash|sh)\b", re.IGNORECASE), "wget pipes into a shell"),
    (re.compile(r"\birm\b[^\n]*\|\s*iex\b", re.IGNORECASE), "PowerShell invoke-expression"),
    (re.compile(r"\brm\s+-rf\b", re.IGNORECASE), "destructive filesystem delete"),
    (re.compile(r"\bgit\s+(?:commit|push|merge|reset)\b", re.IGNORECASE), "git mutation"),
    (re.compile(r"\b(?:npm|pnpm|yarn|bun)\s+publish\b", re.IGNORECASE), "package publication"),
    (re.compile(r"\b(?:kubectl\s+apply|terraform\s+apply|ansible-playbook|docker\s+push)\b", re.IGNORECASE), "deployment or infrastructure mutation"),
    (
        re.compile(r"\b(?:POST|PUT|PATCH|DELETE)\b", re.IGNORECASE),
        "mutating HTTP verb",
    ),
    (
        re.compile(r"\b(?:insert|update|upsert|delete|drop|truncate|alter)\b", re.IGNORECASE),
        "state-changing data operation",
    ),
    (
        re.compile(r"\b(?:api key|api[_ -]?key|token|secret|password|bearer token|oauth token)\b", re.IGNORECASE),
        "secret or token handling",
    ),
    (
        re.compile(
            r"\b(?:write|overwrite|append|create|modify|remove|rename|move)\b[^\n]{0,60}\b(?:file|files|directory|repo|repository|config|skill|document|artifact|database|table|record|row|branch|release|production|server|endpoint|resource)\b",
            re.IGNORECASE,
        ),
        "state-changing instruction",
    ),
]

SAFE_HINTS = [
    (
        re.compile(
            r"\b(?:echo|cat|ls|rg|grep|find|sed\s+-n|git\s+status|git\s+diff|pytest|npm\s+test|ruff|eslint|tsc)\b",
            re.IGNORECASE,
        ),
        "non-mutating command example",
    ),
    (re.compile(r"^```", re.MULTILINE), "contains fenced examples"),
    (
        re.compile(r"\b(?:read|inspect|analyze|audit|validate|test|search|summarize|monitor|review|list|fetch|get|query|lint)\b", re.IGNORECASE),
        "read-only or diagnostic language",
    ),
    (
        re.compile(r"\b(?:api|http|graphql|webhook|endpoint|cli|sdk|docs?|database|log|logs)\b", re.IGNORECASE),
        "technical or integration language",
    ),
]


def _collect_reasons(text: str, patterns: list[tuple[re.Pattern[str], str]]) -> list[str]:
    return [reason for pattern, reason in patterns if pattern.search(text)]


def suggest_risk(content: str, metadata: Mapping[str, object] | None = None) -> RiskSuggestion:
    text = content if isinstance(content, str) else str(content or "")
    if metadata:
        if isinstance(metadata.get("description"), str):
            text = f"{metadata['description']}\n{text}"
        if isinstance(metadata.get("name"), str):
            text = f"{metadata['name']}\n{text}"

    offensive_reasons = _collect_reasons(text, OFFENSIVE_HINTS)
    if offensive_reasons:
        return RiskSuggestion("offensive", tuple(offensive_reasons))

    critical_reasons = _collect_reasons(text, CRITICAL_HINTS)
    if critical_reasons:
        return RiskSuggestion("critical", tuple(critical_reasons))

    safe_reasons = _collect_reasons(text, SAFE_HINTS)
    if safe_reasons:
        return RiskSuggestion("safe", tuple(safe_reasons))

    return RiskSuggestion("none", ())
