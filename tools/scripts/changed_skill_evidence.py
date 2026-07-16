#!/usr/bin/env python3
"""Deterministic before/after evidence for canonical skills changed by a PR."""
from __future__ import annotations

import argparse
import json
import math
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from _project_paths import find_repo_root
from audit_skills import build_skill_report
from check_readme_credits import (
    SOURCE_REPO_PATTERN,
    extract_credit_repos,
    normalize_repo_slug,
    parse_frontmatter,
)
from git_change_records import ChangeRecord, list_tree, materialize_tree, read_change_records, read_path
from score_skills import score_skill
from security_scanner import scan_skill_file


SCHEMA_VERSION = 1
RISK_RANK = {"unknown": -1, "none": 0, "safe": 1, "critical": 2, "offensive": 3}
SEVERITY_RANK = {"info": 0, "warning": 1, "error": 2}


def canonical_skill_roots(repo: Path, commit_oid: str) -> set[str]:
    roots: set[str] = set()
    for entry in list_tree(repo, commit_oid, "skills"):
        if entry.path.startswith("skills/") and entry.path.endswith("/SKILL.md"):
            roots.add(entry.path[len("skills/") : -len("/SKILL.md")])
    return roots


def canonical_skill_id(path: str | None, roots: set[str]) -> str | None:
    """Resolve a path to its nearest canonical SKILL.md ancestor."""
    if path is None or not path.startswith("skills/"):
        return None
    relative = path[len("skills/") :]
    candidates = [
        root
        for root in roots
        if relative == f"{root}/SKILL.md" or relative.startswith(f"{root}/")
    ]
    return max(candidates, key=lambda root: (root.count("/"), len(root))) if candidates else None


def skill_pairs(
    records: list[ChangeRecord],
    old_roots: set[str],
    new_roots: set[str],
) -> list[tuple[str | None, str | None, list[ChangeRecord]]]:
    affected: set[str] = set()
    rename_pairs: dict[tuple[str, str], list[ChangeRecord]] = defaultdict(list)
    for record in records:
        old_id = canonical_skill_id(record.old_path, old_roots)
        new_id = canonical_skill_id(record.new_path, new_roots)
        if old_id:
            affected.add(old_id)
        if new_id:
            affected.add(new_id)
        if record.status in {"R", "C"} and old_id and new_id and old_id != new_id:
            rename_pairs[(old_id, new_id)].append(record)

    result: list[tuple[str | None, str | None, list[ChangeRecord]]] = []
    consumed: set[str] = set()
    for (old_id, new_id), pair_records in sorted(rename_pairs.items()):
        if old_id in consumed or new_id in consumed:
            continue
        is_copy = any(record.status == "C" for record in pair_records)
        if is_copy:
            relevant = [
                record
                for record in records
                if canonical_skill_id(record.new_path, new_roots) == new_id
            ]
        else:
            relevant = [
                record
                for record in records
                if (
                    canonical_skill_id(record.new_path, new_roots) == new_id
                    or (
                        canonical_skill_id(record.old_path, old_roots) == old_id
                        and not (
                            record.status in {"R", "C"}
                            and canonical_skill_id(record.new_path, new_roots) not in {old_id, new_id}
                        )
                    )
                )
            ]
        result.append((old_id, new_id, relevant or pair_records))
        consumed.add(new_id)
        if not is_copy:
            consumed.add(old_id)

    for skill_id in sorted(affected - consumed):
        relevant = [
            record
            for record in records
            if (
                canonical_skill_id(record.new_path, new_roots) == skill_id
                or (
                    canonical_skill_id(record.old_path, old_roots) == skill_id
                    and not (
                        record.status in {"R", "C"}
                        and canonical_skill_id(record.new_path, new_roots) != skill_id
                    )
                )
            )
        ]
        if relevant:
            result.append((skill_id, skill_id, relevant))
    return result


def _findings_by_severity_and_code(findings: list[dict[str, object]]) -> dict[str, dict[str, list[str]]]:
    grouped: dict[str, dict[str, list[str]]] = {}
    for finding in findings:
        severity = str(finding.get("severity", "unknown"))
        code = str(finding.get("code", "unknown"))
        grouped.setdefault(severity, {}).setdefault(code, []).append(str(finding.get("message", "")))
    return {
        severity: {
            code: sorted(messages)
            for code, messages in sorted(codes.items())
        }
        for severity, codes in sorted(grouped.items())
    }


def _metadata(skill_file: Path) -> dict[str, object]:
    try:
        return parse_frontmatter(skill_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeError):
        return {}


def _safe_metadata_value(value: object) -> object:
    if value is None or isinstance(value, (str, bool, int, float)):
        return value
    return {"invalid_type": type(value).__name__}


def evaluate_snapshot(snapshot_root: Path, skill_id: str) -> dict[str, object]:
    skills_root = snapshot_root / "skills"
    skill_root = skills_root / skill_id
    audit = build_skill_report(skill_root, skills_root, snapshot_root=snapshot_root)
    evaluator_errors: list[str] = []
    try:
        score = score_skill(skill_root, skill_id=skill_id)
        score_payload = score.to_dict() if score is not None else None
    except (OSError, UnicodeError, TypeError, ValueError):
        score_payload = {"error": "unreadable_skill_content"}
        evaluator_errors.append("score_evaluator_failed")
    try:
        security = scan_skill_file(skill_root)
        security_payload = security.to_dict() if security is not None else None
    except (OSError, UnicodeError, TypeError, ValueError):
        security_payload = {
            "skill_id": skill_id,
            "status": "error",
            "is_offensive": False,
            "error_count": 1,
            "warning_count": 0,
            "flags": [
                {
                    "code": "INVALID_SKILL_ENCODING",
                    "severity": "error",
                    "message": "SKILL.md is not valid UTF-8.",
                    "line": 0,
                    "matched_text": "",
                }
            ],
        }
    audit_findings = _findings_by_severity_and_code(audit["findings"])
    if evaluator_errors:
        audit_findings.setdefault("error", {})["evaluator_failure"] = sorted(evaluator_errors)
    audit_error_count = audit["error_count"] + len(evaluator_errors)
    metadata = _metadata(skill_root / "SKILL.md")
    source_repo = normalize_repo_slug(metadata.get("source_repo"))
    raw_source_type = metadata.get("source_type")
    source_type = raw_source_type.strip().lower() if isinstance(raw_source_type, str) else None
    return {
        "audit": {
            "status": "error" if audit_error_count else audit["status"],
            "counts": {
                "error": audit_error_count,
                "warning": audit["warning_count"],
                "info": audit["info_count"],
            },
            "findings": audit_findings,
        },
        "score": score_payload,
        "security": security_payload,
        "risk": {
            "declared": _safe_metadata_value(metadata.get("risk")),
            "suggested": audit.get("suggested_risk"),
            "suggested_reasons": audit.get("suggested_risk_reasons", []),
        },
        "provenance": {
            "source": _safe_metadata_value(metadata.get("source")),
            "source_type": source_type,
            "source_repo": source_repo,
        },
    }


def _audit_severities(snapshot: dict[str, object] | None) -> dict[str, list[str]]:
    severities: dict[str, list[str]] = defaultdict(list)
    if not snapshot:
        return severities
    findings = snapshot["audit"]["findings"]
    for severity, by_code in findings.items():
        for code, messages in by_code.items():
            severities[code].extend([severity] * len(messages))
    return severities


def _security_severities(snapshot: dict[str, object] | None) -> dict[str, list[str]]:
    severities: dict[str, list[str]] = defaultdict(list)
    if not snapshot or snapshot.get("security") is None:
        return severities
    for flag in snapshot["security"]["flags"]:
        severities[str(flag["code"])].append(str(flag["severity"]))
    return severities


def _worsened_codes(
    before: dict[str, list[str]],
    after: dict[str, list[str]],
) -> list[tuple[str, str, int]]:
    worsened: list[tuple[str, str, int]] = []
    for code, after_values in sorted(after.items()):
        after_ranks = [SEVERITY_RANK.get(value, 0) for value in after_values]
        before_ranks = [SEVERITY_RANK.get(value, 0) for value in before.get(code, [])]
        if not after_ranks or max(after_ranks) == 0:
            continue
        maximum_increased = max(after_ranks) > max(before_ranks, default=0)
        weight_increased = sum(after_ranks) > sum(before_ranks)
        if maximum_increased or weight_increased:
            highest = max(after_ranks)
            severity = "error" if highest >= 2 else "warning"
            worsened.append((severity, code, max(1, sum(after_ranks) - sum(before_ranks))))
    return worsened


def _risk_gap(snapshot: dict[str, object] | None) -> int:
    if not snapshot:
        return 0
    risk = snapshot["risk"]
    declared = str(risk.get("declared") or "unknown").lower()
    suggested = str(risk.get("suggested") or "unknown").lower()
    if suggested in {"unknown", "none"}:
        return 0
    return max(0, RISK_RANK.get(suggested, -1) - RISK_RANK.get(declared, -1))


def regression_reasons(
    skill_id: str,
    change_type: str,
    before: dict[str, object] | None,
    after: dict[str, object] | None,
) -> list[str]:
    if change_type == "deleted" or after is None:
        return []
    reasons: list[str] = []
    for severity, code, increase in _worsened_codes(_audit_severities(before), _audit_severities(after)):
        reasons.append(f"{skill_id}:audit_{severity}_regression:{code}:+{increase}")

    for severity, code, increase in _worsened_codes(
        _security_severities(before), _security_severities(after)
    ):
        reasons.append(f"{skill_id}:security_{severity}_regression:{code}:+{increase}")

    before_score = before.get("score") if before else None
    after_score = after.get("score")
    if (
        before_score
        and after_score
        and "scores" in before_score
        and "scores" in after_score
        and after_score["scores"]["total"] < before_score["scores"]["total"]
    ):
        reasons.append(
            f"{skill_id}:score_decreased:{before_score['scores']['total']}->{after_score['scores']['total']}"
        )
    if before_score and after_score and "scores" in before_score and "scores" in after_score:
        before_components = before_score["scores"]
        after_components = after_score["scores"]
        for component in sorted(set(before_components) | set(after_components)):
            if component == "total":
                continue
            before_value = before_components.get(component)
            after_value = after_components.get(component)
            if (
                isinstance(before_value, (int, float))
                and not isinstance(before_value, bool)
                and isinstance(after_value, (int, float))
                and not isinstance(after_value, bool)
                and math.isfinite(before_value)
                and math.isfinite(after_value)
                and after_value < before_value
            ):
                reasons.append(
                    f"{skill_id}:score_component_decreased:{component}:{before_value}->{after_value}"
                )

    before_declared = str(before["risk"].get("declared") or "unknown").lower() if before else "unknown"
    after_declared = str(after["risk"].get("declared") or "unknown").lower()
    if before and RISK_RANK.get(after_declared, -1) < RISK_RANK.get(before_declared, -1):
        reasons.append(f"{skill_id}:risk_downgrade:{before_declared}->{after_declared}")
    if _risk_gap(after) > _risk_gap(before):
        reasons.append(f"{skill_id}:risk_mismatch_worsened")
    return reasons


def provenance_reasons(
    skill_id: str,
    change_type: str,
    before: dict[str, object] | None,
    after: dict[str, object] | None,
    readme_credits: dict[str, set[str]],
) -> list[str]:
    if change_type == "deleted" or after is None:
        return []
    provenance = after["provenance"]
    source = provenance.get("source")
    source_type = provenance.get("source_type")
    source_repo = provenance.get("source_repo")
    reasons: list[str] = []
    source_is_self = isinstance(source, str) and source.strip().lower() == "self"
    before_provenance = before.get("provenance") if before else None
    before_source = before_provenance.get("source") if before_provenance else None
    before_is_self = (
        isinstance(before_source, str) and before_source.strip().lower() == "self"
    )

    if change_type in {"modified", "renamed"} and before_provenance:
        if not before_is_self or not source_is_self:
            for field in ("source", "source_type", "source_repo"):
                if before_provenance.get(field) != provenance.get(field):
                    reasons.append(f"{skill_id}:provenance_identity_changed:{field}")

    needs_full_validation = change_type in {"added", "copied"} or (
        before_provenance is not None and before_is_self and not source_is_self
    )
    if not source_is_self and needs_full_validation:
        if source_type not in {"official", "community"}:
            reasons.append(f"{skill_id}:new_external_skill_invalid_source_type")
        if not isinstance(source_repo, str) or not SOURCE_REPO_PATTERN.fullmatch(source_repo):
            reasons.append(f"{skill_id}:new_external_skill_invalid_source_repo")
        elif source_type in readme_credits and source_repo not in readme_credits[source_type]:
            reasons.append(
                f"{skill_id}:new_external_skill_missing_readme_credit:{source_type}:{source_repo}"
            )
    return reasons


def _unsafe_counter(entries: list[dict[str, str]], skill_id: str | None) -> Counter[tuple[str, str, str]]:
    prefix = f"skills/{skill_id}/" if skill_id else ""
    return Counter(
        (
            item["path"][len(prefix) :] if prefix and item["path"].startswith(prefix) else item["path"],
            item["mode"],
            item["oid"],
        )
        for item in entries
    )


def build_report(repo: str | Path, base_ref: str, head_ref: str) -> dict[str, object]:
    root = Path(repo)
    base_oid, head_oid, records = read_change_records(root, base_ref, head_ref, merge_base=True)
    old_roots = canonical_skill_roots(root, base_oid)
    new_roots = canonical_skill_roots(root, head_oid)
    readme_bytes = read_path(root, head_oid, "README.md") or b""
    readme_credits = extract_credit_repos(readme_bytes.decode("utf-8", "replace"))
    changes: list[dict[str, object]] = []
    all_reasons: list[str] = []

    with tempfile.TemporaryDirectory(prefix="changed-skill-evidence-") as temporary:
        temp_root = Path(temporary)
        for index, (old_id, new_id, pair_records) in enumerate(skill_pairs(records, old_roots, new_roots)):
            # Tree membership, rather than blob readability, distinguishes a
            # deleted skill from a SKILL.md replaced by a symlink or gitlink.
            base_exists = bool(old_id and old_id in old_roots)
            head_exists = bool(new_id and new_id in new_roots)
            if not base_exists and not head_exists:
                continue
            copied = any(record.status == "C" for record in pair_records) and old_id != new_id
            if copied:
                change_type = "copied"
            elif base_exists and head_exists and old_id != new_id:
                change_type = "renamed"
            elif base_exists and head_exists:
                change_type = "modified"
            elif head_exists:
                change_type = "added"
            else:
                change_type = "deleted"

            before = None
            after = None
            before_unsafe: list[dict[str, str]] = []
            after_unsafe: list[dict[str, str]] = []
            if base_exists and old_id:
                before_root = temp_root / f"{index}-before"
                before_unsafe = materialize_tree(root, base_oid, f"skills/{old_id}", before_root / "skills" / old_id)
                if (before_root / "skills" / old_id / "SKILL.md").is_file():
                    before = evaluate_snapshot(before_root, old_id)
            if head_exists and new_id:
                after_root = temp_root / f"{index}-after"
                after_unsafe = materialize_tree(root, head_oid, f"skills/{new_id}", after_root / "skills" / new_id)
                if (after_root / "skills" / new_id / "SKILL.md").is_file():
                    after = evaluate_snapshot(after_root, new_id)

            effective_id = new_id or old_id or "unknown"
            reasons: list[str] = []
            if change_type != "deleted":
                before_modes = (
                    Counter()
                    if change_type in {"added", "copied"}
                    else _unsafe_counter(before_unsafe, old_id)
                )
                after_modes = _unsafe_counter(after_unsafe, new_id)
                for (relative_path, mode, oid), count in sorted(after_modes.items()):
                    increase = count - before_modes[(relative_path, mode, oid)]
                    if increase > 0:
                        reasons.append(
                            f"{effective_id}:unsafe_snapshot_regression:{mode}:{relative_path}:{oid}:+{increase}"
                        )
            comparison_before = None if change_type in {"added", "copied"} else before
            reasons.extend(regression_reasons(effective_id, change_type, comparison_before, after))
            reasons.extend(
                provenance_reasons(
                    effective_id,
                    change_type,
                    comparison_before,
                    after,
                    readme_credits,
                )
            )
            reasons = sorted(set(reasons))
            all_reasons.extend(reasons)
            changes.append(
                {
                    "change_type": change_type,
                    "old_skill_id": old_id if base_exists else None,
                    "new_skill_id": new_id if head_exists else None,
                    "records": [record.to_dict() for record in pair_records],
                    "before": before,
                    "after": after,
                    "unsafe_entries": {"before": before_unsafe, "after": after_unsafe},
                    "blocking": bool(reasons),
                    "reasons": reasons,
                }
            )

    changes.sort(key=lambda item: (str(item["new_skill_id"] or item["old_skill_id"]), item["change_type"]))
    reasons = sorted(set(all_reasons))
    return {
        "schema_version": SCHEMA_VERSION,
        "base_ref": base_ref,
        "head_ref": head_ref,
        "base_oid": base_oid,
        "head_oid": head_oid,
        "changes": changes,
        "blocking": bool(reasons),
        "reasons": reasons,
    }


def stable_json(report: dict[str, object]) -> str:
    return json.dumps(report, indent=2, sort_keys=True, ensure_ascii=True) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build changed-skill before/after evidence.")
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--repo",
        type=Path,
        help="Repository whose immutable Git objects should be evaluated (defaults to the script checkout).",
    )
    parser.add_argument("--json", action="store_true", help="Also print the report to stdout.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.repo.resolve() if args.repo else find_repo_root(__file__)
    report = build_report(root, args.base, args.head)
    payload = stable_json(report)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(payload, encoding="utf-8")
    if args.json:
        print(payload, end="")
    return 1 if report["blocking"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
