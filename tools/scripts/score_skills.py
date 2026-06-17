#!/usr/bin/env python3
"""
Skill Quality Scorer — Antigravity Awesome Skills
Computes a quality score for each skill across three dimensions:
  - Metadata completeness (30%)
  - Documentation structure (40%)
  - Security posture (30%)

Scores are informational only — never blocking in CI.

Usage:
    node tools/scripts/run-python.js tools/scripts/score_skills.py
    node tools/scripts/run-python.js tools/scripts/score_skills.py --json
    node tools/scripts/run-python.js tools/scripts/score_skills.py --output data/scores.json
    node tools/scripts/run-python.js tools/scripts/score_skills.py --threshold 60
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _project_paths import find_repo_root
from validate_skills import (
    configure_utf8_output,
    parse_frontmatter,
    has_when_to_use_section,
)
from security_scanner import scan_content, ScanResult

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

VALID_RISKS = {"none", "safe", "critical", "offensive", "unknown"}

OPTIONAL_BONUS_FIELDS = ("category", "tags", "author", "tools", "license")

DOCUMENTATION_SECTIONS = [
    re.compile(r"^##\s+Overview\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+How\s+It\s+Works\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Example(s)?\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Usage\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Best\s+Practices\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+Limitation(s)?\b", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^##\s+When\s+to\s+Use", re.MULTILINE | re.IGNORECASE),
]

FENCED_CODE_BLOCK = re.compile(r"^```", re.MULTILINE)

# Score weights (must sum to 1.0)
_W_METADATA = 0.30
_W_DOCS = 0.40
_W_SECURITY = 0.30

# Score thresholds for display labels
LABEL_EXCELLENT = 85
LABEL_GOOD = 65
LABEL_NEEDS_IMPROVEMENT = 45


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class ScoreDimensions:
    metadata: float
    documentation: float
    security: float
    total: float


@dataclass
class SkillScore:
    skill_id: str
    risk: str
    metadata_score: float
    documentation_score: float
    security_score: float
    total_score: float
    label: str
    flags: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "skill_id": self.skill_id,
            "risk": self.risk,
            "scores": {
                "metadata": round(self.metadata_score, 1),
                "documentation": round(self.documentation_score, 1),
                "security": round(self.security_score, 1),
                "total": round(self.total_score, 1),
            },
            "label": self.label,
            "flags": self.flags,
        }


# ---------------------------------------------------------------------------
# Scoring functions
# ---------------------------------------------------------------------------

def _label_for(score: float) -> str:
    if score >= LABEL_EXCELLENT:
        return "excellent"
    if score >= LABEL_GOOD:
        return "good"
    if score >= LABEL_NEEDS_IMPROVEMENT:
        return "needs_improvement"
    return "critical"


def score_metadata(metadata: dict, folder_name: str) -> float:
    """
    Score metadata completeness on a 0–100 scale.

    Penalties:
      -25  name missing or mismatch with folder
      -20  description missing
      -10  description too short (<20 chars)
      -15  risk missing
      -10  risk is 'unknown' (unclassified)
      -15  source missing
      -10  date_added missing
      -10  per validation error (capped at 30)

    Bonuses:
      +5   per optional field filled (category, tags, author, tools, license)
    """
    score = 100.0

    name = metadata.get("name", "")
    if not name:
        score -= 25
    elif name != folder_name:
        score -= 25

    desc = metadata.get("description", "")
    if not desc:
        score -= 20
    elif len(str(desc)) < 20:
        score -= 10

    risk = metadata.get("risk", "")
    if not risk:
        score -= 15
    elif risk == "unknown":
        score -= 10

    if not metadata.get("source"):
        score -= 15

    if not metadata.get("date_added"):
        score -= 10

    # Bonuses for optional fields
    for bonus_field in OPTIONAL_BONUS_FIELDS:
        val = metadata.get(bonus_field)
        if val and (not isinstance(val, list) or len(val) > 0):
            score += 5

    return max(0.0, min(100.0, score))


def score_documentation(content: str, body: str) -> float:
    """
    Score documentation quality on a 0–100 scale.

    Section coverage (up to 60 pts):
      Each recognized section contributes equally to section coverage.

    Content depth (up to 40 pts):
      - Has When to Use: 10 pts
      - Has code examples: 10 pts
      - Body length >= 500 chars: 10 pts
      - Body length >= 1000 chars: 10 additional pts
    """
    section_hits = sum(
        1 for pattern in DOCUMENTATION_SECTIONS if pattern.search(content)
    )
    section_ratio = section_hits / len(DOCUMENTATION_SECTIONS)
    section_score = section_ratio * 60.0

    depth_score = 0.0
    if has_when_to_use_section(content):
        depth_score += 10.0
    if FENCED_CODE_BLOCK.search(body):
        depth_score += 10.0
    body_len = len(body)
    if body_len >= 500:
        depth_score += 10.0
    if body_len >= 1000:
        depth_score += 10.0

    return max(0.0, min(100.0, section_score + depth_score))


def score_security(scan_result: ScanResult, metadata: dict) -> float:
    """
    Score security posture on a 0–100 scale.

    Penalties:
      -20  per error flag
      -10  per warning flag
      -3   per info flag

    Bonus:
      +5   risk is explicit and not 'unknown'
    """
    score = 100.0

    for flag in scan_result.flags:
        if flag.severity == "error":
            score -= 20.0
        elif flag.severity == "warning":
            score -= 10.0
        else:
            score -= 3.0

    risk = metadata.get("risk", "unknown")
    if risk in VALID_RISKS and risk != "unknown":
        score = min(100.0, score + 5.0)

    return max(0.0, score)


def score_skill(skill_path: Path) -> SkillScore | None:
    """
    Read a skill directory and compute its quality score.
    Returns None if the skill cannot be read or parsed.
    """
    skill_file = skill_path / "SKILL.md"
    if not skill_file.exists():
        return None

    try:
        content = skill_file.read_text(encoding="utf-8")
    except OSError:
        return None

    metadata, _ = parse_frontmatter(content)
    if metadata is None:
        metadata = {}

    # Strip frontmatter to get body for documentation scoring
    body = re.sub(r"^---\s*\n.*?\n---\s*\n?", "", content, count=1, flags=re.DOTALL)

    is_offensive = str(metadata.get("risk", "")).lower() == "offensive"
    scan_result = scan_content(
        skill_id=skill_path.name,
        content=body,
        is_offensive=is_offensive,
    )

    meta_score = score_metadata(metadata, skill_path.name)
    doc_score = score_documentation(content, body)
    sec_score = score_security(scan_result, metadata)

    total = (meta_score * _W_METADATA) + (doc_score * _W_DOCS) + (sec_score * _W_SECURITY)

    return SkillScore(
        skill_id=skill_path.name,
        risk=metadata.get("risk", "unknown"),
        metadata_score=round(meta_score, 1),
        documentation_score=round(doc_score, 1),
        security_score=round(sec_score, 1),
        total_score=round(total, 1),
        label=_label_for(total),
        flags=[f.to_dict() for f in scan_result.flags],
    )


def score_all_skills(skills_dir: Path) -> list[SkillScore]:
    """Score every skill directory found under skills_dir."""
    scores: list[SkillScore] = []
    for entry in sorted(skills_dir.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue
        result = score_skill(entry)
        if result is not None:
            scores.append(result)
    return scores


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def build_summary(scores: list[SkillScore]) -> dict[str, Any]:
    if not scores:
        return {}

    totals = [s.total_score for s in scores]
    avg = sum(totals) / len(totals)

    distribution: dict[str, int] = {
        "excellent": 0,
        "good": 0,
        "needs_improvement": 0,
        "critical": 0,
    }
    for s in scores:
        distribution[s.label] += 1

    risk_breakdown: dict[str, int] = {}
    for s in scores:
        risk_breakdown[s.risk] = risk_breakdown.get(s.risk, 0) + 1

    flag_errors = sum(
        1 for s in scores for f in s.flags if f["severity"] == "error"
    )
    flag_warnings = sum(
        1 for s in scores for f in s.flags if f["severity"] == "warning"
    )

    return {
        "total_skills": len(scores),
        "average_score": round(avg, 1),
        "min_score": round(min(totals), 1),
        "max_score": round(max(totals), 1),
        "score_distribution": distribution,
        "risk_breakdown": risk_breakdown,
        "flag_errors": flag_errors,
        "flag_warnings": flag_warnings,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_table(scores: list[SkillScore], threshold: float | None = None) -> None:
    configure_utf8_output()
    label_icon = {
        "excellent": "✅",
        "good": "🟢",
        "needs_improvement": "⚠️ ",
        "critical": "❌",
    }

    flagged = [s for s in scores if threshold is not None and s.total_score < threshold]
    display = flagged if threshold is not None else scores

    header = f"{'Skill':<50} {'Total':>6} {'Meta':>6} {'Docs':>6} {'Sec':>6}  Label"
    print(f"\n{'─' * len(header)}")
    print(header)
    print(f"{'─' * len(header)}")

    for s in display:
        icon = label_icon.get(s.label, " ")
        print(
            f"{s.skill_id:<50} {s.total_score:>6.1f} "
            f"{s.metadata_score:>6.1f} {s.documentation_score:>6.1f} "
            f"{s.security_score:>6.1f}  {icon} {s.label}"
        )


def _print_summary(summary: dict) -> None:
    dist = summary.get("score_distribution", {})
    print(f"\n{'═' * 60}")
    print("📊 SKILL QUALITY REPORT")
    print(f"{'─' * 60}")
    print(f"  Skills scored : {summary.get('total_skills', 0)}")
    print(f"  Average score : {summary.get('average_score', 0):.1f}")
    print(f"  Min / Max     : {summary.get('min_score', 0):.1f} / {summary.get('max_score', 0):.1f}")
    print(f"  ✅ Excellent  : {dist.get('excellent', 0)}")
    print(f"  🟢 Good       : {dist.get('good', 0)}")
    print(f"  ⚠️  Needs work : {dist.get('needs_improvement', 0)}")
    print(f"  ❌ Critical   : {dist.get('critical', 0)}")
    print(f"  Security flags: {summary.get('flag_errors', 0)} errors, {summary.get('flag_warnings', 0)} warnings")
    print(f"{'═' * 60}\n")


def main(argv: list[str] | None = None) -> int:
    configure_utf8_output()
    parser = argparse.ArgumentParser(
        description="Score Antigravity skill quality (metadata, documentation, security)."
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full results as JSON instead of table.",
    )
    parser.add_argument(
        "--output",
        metavar="FILE",
        help="Write JSON results to FILE (e.g. data/scores.json).",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=None,
        metavar="N",
        help="Only display skills with total score below N.",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=None,
        metavar="N",
        help="Only display the top N lowest-scoring skills.",
    )
    args = parser.parse_args(argv)

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"

    print(f"📐 Scoring skills in: {skills_dir}")
    scores = score_all_skills(skills_dir)
    summary = build_summary(scores)

    if args.json or args.output:
        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "skills": [s.to_dict() for s in scores],
        }
        if args.json:
            print(json.dumps(payload, indent=2, ensure_ascii=False))
        if args.output:
            output_path = repo_root / args.output
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            print(f"\n💾 Saved to: {output_path}")
    else:
        display = scores
        if args.top:
            display = sorted(scores, key=lambda s: s.total_score)[: args.top]
        elif args.threshold is not None:
            display = [s for s in scores if s.total_score < args.threshold]
        _print_table(display)
        _print_summary(summary)

    return 0


if __name__ == "__main__":
    sys.exit(main())
