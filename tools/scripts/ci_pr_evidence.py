#!/usr/bin/env python3
"""Download advisory pr-evidence CI artifacts and summarize for maintainer triage.

CI artifacts are untrusted_advisory per pr-autonomy.md; merge:batch recomputes from main.
"""
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any


def run_gh(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["gh", *args],
        cwd=str(repo),
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def run_gh_optional(repo: Path, *args: str) -> tuple[int, str, str]:
    result = subprocess.run(
        ["gh", *args],
        cwd=str(repo),
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout, result.stderr


def _parse_run_list(stdout: str) -> list[dict[str, Any]]:
    try:
        runs = json.loads(stdout)
    except json.JSONDecodeError:
        return []
    return runs if isinstance(runs, list) else []


def is_skills_registry_ci_run(run: dict[str, Any]) -> bool:
    name = str(run.get("workflowName") or run.get("name") or "").lower()
    return "skills registry" in name


def find_ci_run_id_for_head(repo: Path, head_sha: str) -> int | None:
    """Return Skills Registry CI run databaseId for exact head SHA, if any."""
    code, stdout, _ = run_gh_optional(
        repo,
        "run",
        "list",
        "--commit",
        head_sha,
        "--json",
        "databaseId,headSha,conclusion,status,workflowName",
        "--limit",
        "20",
    )
    runs = _parse_run_list(stdout) if code == 0 else []
    if not runs:
        code, stdout, _ = run_gh_optional(
            repo,
            "run",
            "list",
            "--workflow",
            "ci.yml",
            "--json",
            "databaseId,headSha,conclusion,status,workflowName",
            "--limit",
            "60",
        )
        if code == 0:
            runs = [
                run
                for run in _parse_run_list(stdout)
                if str(run.get("headSha") or "").lower() == head_sha.lower()
            ]

    registry_runs = [run for run in runs if is_skills_registry_ci_run(run)]
    candidates = registry_runs or runs

    for run in candidates:
        conclusion = str(run.get("conclusion") or "").lower()
        status = str(run.get("status") or "").lower()
        if status == "completed" and conclusion in ("success", "neutral"):
            run_id = run.get("databaseId")
            if isinstance(run_id, int):
                return run_id
    for run in candidates:
        run_id = run.get("databaseId")
        if isinstance(run_id, int):
            return run_id
    return None


def download_pr_evidence_dir(repo: Path, pr_number: int, run_id: int, dest: Path) -> bool:
    artifact = f"pr-evidence-{pr_number}"
    dest.mkdir(parents=True, exist_ok=True)
    code, _, _ = run_gh_optional(
        repo,
        "run",
        "download",
        str(run_id),
        "-n",
        artifact,
        "-D",
        str(dest),
    )
    return code == 0 and (dest / "changed-skills.json").is_file()


def summarize_changed_skills(data: dict[str, Any]) -> dict[str, Any]:
    changes = data.get("changes") or []
    skill_ids: list[str] = []
    for change in changes:
        if not isinstance(change, dict):
            continue
        sid = change.get("new_skill_id") or change.get("old_skill_id")
        if sid:
            skill_ids.append(str(sid))
    return {
        "head_oid": data.get("head_oid"),
        "blocking": bool(data.get("blocking")),
        "reasons": list(data.get("reasons") or [])[:12],
        "changed_skill_count": len(changes),
        "skill_ids": sorted(set(skill_ids))[:20],
    }


def summarize_decision_manifest(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "route": data.get("route"),
        "mode": data.get("mode"),
        "untrusted_advisory": data.get("untrusted_advisory"),
    }


def load_json_file(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def fetch_ci_evidence_summary(
    repo: Path,
    pr_number: int,
    head_sha: str,
) -> dict[str, Any]:
    """Download pr-evidence artifact for PR head when a CI run exists."""
    result: dict[str, Any] = {
        "pr_number": pr_number,
        "head_sha": head_sha,
        "source": "ci_artifact",
        "available": False,
    }
    run_id = find_ci_run_id_for_head(repo, head_sha)
    if run_id is None:
        result["error"] = "no_matching_ci_run"
        return result
    result["workflow_run_id"] = run_id

    with tempfile.TemporaryDirectory(prefix="aas-pr-evidence-") as tmp:
        dest = Path(tmp)
        if not download_pr_evidence_dir(repo, pr_number, run_id, dest):
            result["error"] = "artifact_download_failed"
            result["hint"] = (
                "Artifact uploads only when pr-evidence job completed; failed CI or "
                "blocking changed-skill evidence may omit the bundle — use "
                "npm run pr:evidence locally before attestation."
            )
            return result

        changed = load_json_file(dest / "changed-skills.json")
        preflight = load_json_file(dest / "preflight.json")
        manifest = load_json_file(dest / "decision-manifest.json")

        if changed is None:
            result["error"] = "changed_skills_missing"
            return result

        if str(changed.get("head_oid") or "").lower() not in ("", head_sha.lower()):
            result["warning"] = "head_oid_mismatch"
            result["artifact_head_oid"] = changed.get("head_oid")

        result["available"] = True
        result["changed_skills"] = summarize_changed_skills(changed)
        if preflight:
            categories = preflight.get("categories") or preflight.get("classification")
            result["preflight_categories"] = categories
        if manifest:
            result["decision_manifest"] = summarize_decision_manifest(manifest)

    return result
