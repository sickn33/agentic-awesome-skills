#!/usr/bin/env python3
"""
Drift Detector — Agentic Awesome Skills
Detects when skill content changes significantly compared to a stored baseline.

Drift is computed via a normalized SHA-256 content hash. The baseline is stored
in data/drift-baseline.json and updated on demand.

Usage:
    # Check drift against stored baseline
    node tools/scripts/run-python.js tools/scripts/detect_drift.py

    # Update baseline (run after reviewing changes)
    node tools/scripts/run-python.js tools/scripts/detect_drift.py --update-baseline

    # Check a specific skill
    node tools/scripts/run-python.js tools/scripts/detect_drift.py --skill ab-test-setup
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from _project_paths import find_repo_root
from validate_skills import configure_utf8_output


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASELINE_FILE = Path("data") / "drift-baseline.json"
BASELINE_SCHEMA_VERSION = 1

# Fields excluded from hash to prevent false positives on metadata-only edits.
_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n?---(?:\s*\n|$)", re.DOTALL)
_STRIP_PATTERNS = [
    re.compile(r"^date_added:.*$", re.MULTILINE),
    re.compile(r"^author:.*$", re.MULTILINE),
]


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

class DriftEntry:
    __slots__ = ("skill_id", "hash", "length", "updated_at")

    def __init__(self, skill_id: str, hash_: str, length: int, updated_at: str) -> None:
        self.skill_id = skill_id
        self.hash = hash_
        self.length = length
        self.updated_at = updated_at

    def to_dict(self) -> dict:
        return {
            "skill_id": self.skill_id,
            "hash": self.hash,
            "length": self.length,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "DriftEntry":
        return cls(
            skill_id=d["skill_id"],
            hash_=d["hash"],
            length=d.get("length", 0),
            updated_at=d.get("updated_at", ""),
        )


class DriftReport:
    def __init__(self) -> None:
        self.added: list[str] = []       # skills in current state but not in baseline
        self.removed: list[str] = []     # skills in baseline but no longer present
        self.drifted: list[tuple[str, str, str]] = []  # (skill_id, old_hash, new_hash)
        self.unchanged: list[str] = []

    @property
    def has_drift(self) -> bool:
        return bool(self.added or self.removed or self.drifted)

    def to_dict(self) -> dict:
        return {
            "has_drift": self.has_drift,
            "added": self.added,
            "removed": self.removed,
            "drifted": [
                {"skill_id": s, "old_hash": old, "new_hash": new}
                for s, old, new in self.drifted
            ],
            "unchanged_count": len(self.unchanged),
        }


# ---------------------------------------------------------------------------
# Hash computation
# ---------------------------------------------------------------------------

def _normalize(content: str) -> str:
    """
    Normalize content before hashing to avoid false positives from
    whitespace changes or metadata-only edits (date_added, author).
    """
    normalized = content
    fm_match = _FRONTMATTER_RE.search(content)
    if fm_match:
        frontmatter = fm_match.group(1)
        for pattern in _STRIP_PATTERNS:
            frontmatter = pattern.sub("", frontmatter)
        normalized = f"---\n{frontmatter}\n---\n{content[fm_match.end():]}"
    # Collapse multiple blank lines and strip trailing whitespace per line
    lines = [line.rstrip() for line in normalized.splitlines()]
    normalized = "\n".join(line for line in lines if line or lines)
    return normalized.strip()


def compute_hash(content: str) -> str:
    """Return a 16-character hex SHA-256 of the normalized content."""
    normalized = _normalize(content)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def compute_skill_hash(skill_path: Path) -> tuple[str, int] | None:
    """
    Compute the content hash for a single skill directory.
    Returns (hash, length) or None if SKILL.md is absent.
    """
    skill_file = skill_path / "SKILL.md"
    if not skill_file.exists():
        return None
    content = skill_file.read_text(encoding="utf-8")
    return compute_hash(content), len(content)


# ---------------------------------------------------------------------------
# Baseline I/O
# ---------------------------------------------------------------------------

def load_baseline(baseline_path: Path) -> dict[str, DriftEntry]:
    """Load the stored baseline. Returns empty dict if not found."""
    if not baseline_path.exists():
        return {}
    try:
        raw = json.loads(baseline_path.read_text(encoding="utf-8"))
        return {
            entry["skill_id"]: DriftEntry.from_dict(entry)
            for entry in raw.get("skills", [])
        }
    except (json.JSONDecodeError, KeyError):
        return {}


def save_baseline(
    baseline_path: Path,
    entries: dict[str, DriftEntry],
    version: str,
) -> None:
    """Persist the baseline to disk."""
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": BASELINE_SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "skills_version": version,
        "skills": [e.to_dict() for e in sorted(entries.values(), key=lambda e: e.skill_id)],
    }
    baseline_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def build_current_entries(skills_dir: Path) -> dict[str, DriftEntry]:
    """Compute DriftEntry for every skill currently on disk (recursively)."""
    now = datetime.now(timezone.utc).isoformat()
    entries: dict[str, DriftEntry] = {}
    for skill_file in sorted(skills_dir.rglob("SKILL.md")):
        skill_path = skill_file.parent
        if any(part.startswith(".") for part in skill_path.parts):
            continue
        result = compute_skill_hash(skill_path)
        if result is None:
            continue
        hash_, length = result
        # Use path relative to skills_dir as ID to handle nested layouts uniquely
        skill_id = skill_path.relative_to(skills_dir).as_posix()
        entries[skill_id] = DriftEntry(
            skill_id=skill_id,
            hash_=hash_,
            length=length,
            updated_at=now,
        )
    return entries


# ---------------------------------------------------------------------------
# Diff
# ---------------------------------------------------------------------------

def compute_drift(
    baseline: dict[str, DriftEntry],
    current: dict[str, DriftEntry],
) -> DriftReport:
    """Compare baseline against current state and return a DriftReport."""
    report = DriftReport()
    baseline_ids = set(baseline)
    current_ids = set(current)

    report.added = sorted(current_ids - baseline_ids)
    report.removed = sorted(baseline_ids - current_ids)

    for skill_id in sorted(baseline_ids & current_ids):
        if baseline[skill_id].hash != current[skill_id].hash:
            report.drifted.append(
                (skill_id, baseline[skill_id].hash, current[skill_id].hash)
            )
        else:
            report.unchanged.append(skill_id)

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_report(report: DriftReport) -> None:
    configure_utf8_output()

    if not report.has_drift:
        print(f"\n✅ No drift detected. {len(report.unchanged)} skills unchanged.")
        return

    if report.added:
        print(f"\n➕ New skills ({len(report.added)}):")
        for s in report.added:
            print(f"   + {s}")

    if report.removed:
        print(f"\n➖ Removed skills ({len(report.removed)}):")
        for s in report.removed:
            print(f"   - {s}")

    if report.drifted:
        print(f"\n🔄 Modified skills ({len(report.drifted)}):")
        for skill_id, old_hash, new_hash in report.drifted:
            print(f"   ~ {skill_id}  ({old_hash} → {new_hash})")

    print(f"\n   {len(report.unchanged)} skills unchanged.")


def main(argv: list[str] | None = None) -> int:
    configure_utf8_output()
    parser = argparse.ArgumentParser(
        description="Detect content drift in Antigravity skills against a stored baseline."
    )
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="Recompute and save baseline from current skill state.",
    )
    parser.add_argument(
        "--skill",
        metavar="SKILL_ID",
        help="Limit scan to a specific skill folder name.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output drift report as JSON.",
    )
    args = parser.parse_args(argv)

    repo_root = find_repo_root(__file__)
    skills_dir = repo_root / "skills"
    baseline_path = repo_root / BASELINE_FILE

    # Read package.json for version
    pkg_path = repo_root / "package.json"
    version = "unknown"
    if pkg_path.exists():
        import json as _json
        try:
            version = _json.loads(pkg_path.read_text(encoding="utf-8")).get("version", "unknown")
        except Exception:
            pass

    if args.update_baseline:
        print(f"⚙️  Building baseline from: {skills_dir}")
        current = build_current_entries(skills_dir)
        if args.skill:
            current = {k: v for k, v in current.items() if k == args.skill}
        save_baseline(baseline_path, current, version)
        print(f"✅ Baseline saved → {baseline_path}")
        print(f"   {len(current)} skills indexed.")
        return 0

    print(f"🔍 Checking drift against: {baseline_path}")
    baseline = load_baseline(baseline_path)

    if not baseline:
        print("❌ No baseline found; drift was not evaluated. Run with --update-baseline to create one.")
        return 2

    current = build_current_entries(skills_dir)
    if args.skill:
        skill_id = args.skill
        baseline = {k: v for k, v in baseline.items() if k == skill_id}
        current = {k: v for k, v in current.items() if k == skill_id}

    report = compute_drift(baseline, current)

    if args.json:
        import json as _json
        print(_json.dumps(report.to_dict(), indent=2))
    else:
        _print_report(report)

    return 1 if report.has_drift else 0


if __name__ == "__main__":
    sys.exit(main())
