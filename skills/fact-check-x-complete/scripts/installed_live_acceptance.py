#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from release_gate_core import (
    conflicting_skill_roots,
    read_codex_task_attestation,
    validate_attestation_evidence,
)


def run(command: list[str], cwd: Path) -> dict:
    process = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)
    return {
        "command": command,
        "returncode": process.returncode,
        "outputTail": (process.stdout or process.stderr)[-4000:],
    }


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def managed_package_map(package: Path) -> dict[str, str]:
    result = {}
    with zipfile.ZipFile(package) as archive:
        names = [name for name in archive.namelist() if not name.endswith("/")]
        prefix = names[0].split("/", 1)[0] + "/"
        for name in names:
            relative = name[len(prefix):] if name.startswith(prefix) else name
            result[relative] = hashlib.sha256(archive.read(name)).hexdigest()
    return result


def installed_managed_map(root: Path) -> dict[str, str]:
    result = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if (
            "node_modules" in relative.parts
            or "__pycache__" in relative.parts
            or path.suffix == ".pyc"
            or relative.as_posix() == ".DS_Store"
        ):
            continue
        result[relative.as_posix()] = digest(path)
    return result


def managed_tree_sha(files: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for relative, file_sha in sorted(files.items()):
        digest.update(relative.encode())
        digest.update(b"\0")
        digest.update(file_sha.encode())
        digest.update(b"\n")
    return digest.hexdigest()


def valid_hashed_file(item: dict) -> bool:
    path = Path(str(item.get("path") or "")).expanduser().resolve()
    return path.is_file() and digest(path) == item.get("sha256")


def digest_if_file(path: Path) -> str:
    return digest(path) if path.is_file() else ""


def main() -> int:
    parser = argparse.ArgumentParser(description="从真实安装态和干净运行目录执行 WorkBuddy 在线验收。")
    parser.add_argument("--installed-skill", required=True)
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--question", required=True)
    parser.add_argument("--platform", action="append", required=True)
    parser.add_argument("--candidate-package", required=True)
    parser.add_argument("--candidate-sha256", required=True)
    parser.add_argument("--n2-run", required=True)
    parser.add_argument("--n3-run", required=True)
    parser.add_argument("--independent-audit-task-id", required=True)
    parser.add_argument("--n2-product-audit", required=True)
    parser.add_argument("--n3-product-audit", required=True)
    parser.add_argument("--workbuddy-session-evidence", required=True)
    parser.add_argument("--execute-online", action="store_true")
    args = parser.parse_args()
    root = Path(args.installed_skill).expanduser().resolve()
    run_dir = Path(args.run_dir).expanduser().resolve()
    n2_run = Path(args.n2_run).expanduser().resolve()
    n3_run = Path(args.n3_run).expanduser().resolve()
    failures = []
    workbuddy_skills = Path.home() / ".workbuddy/skills"
    if workbuddy_skills not in root.parents:
        failures.append("installed_skill_not_workbuddy_managed")
    conflicting_roots = conflicting_skill_roots(root)
    if conflicting_roots:
        failures.append("stale_skill_discovery_roots_present")
    if run_dir.exists() and any(run_dir.iterdir()):
        failures.append("acceptance_run_dir_not_clean")
    if not args.execute_online:
        failures.append("execute_online_required")
    if len(args.platform) < 3 or len(set(args.platform)) != len(args.platform):
        failures.append("three_platforms_required")
    package = Path(args.candidate_package).expanduser().resolve()
    package_sha = hashlib.sha256(package.read_bytes()).hexdigest() if package.exists() else ""
    if package_sha != args.candidate_sha256:
        failures.append("candidate_package_sha_mismatch")
    expected_managed = managed_package_map(package) if package.exists() else {}
    installed_managed = installed_managed_map(root)
    if not expected_managed or installed_managed != expected_managed:
        failures.append("candidate_install_managed_files_mismatch")
    manifest_path = root / "package-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    if manifest.get("schemaVersion") != "fact-check-x/workbuddy-package@1":
        failures.append("installed_package_manifest_invalid")
    installed_sha = managed_tree_sha(installed_managed)
    cli = root / "modules/llm-answer-reference-compare/assets/tool/dist/cli.js"
    scenarios = []
    browser_session = run(["node", "modules/llm-answer-reference-compare/tests/browser_session_test.mjs"], root)
    login_recovery = run(["node", "modules/llm-answer-reference-compare/tests/login_recovery_test.mjs"], root)
    capture_wait = run(["node", "modules/llm-answer-reference-compare/tests/capture_wait_test.mjs"], root)
    artifact_paths = run(["node", "modules/llm-answer-reference-compare/tests/artifact_path_test.mjs"], root)
    dknow_refs = run(["node", "modules/llm-answer-reference-compare/tests/dknow_reference_test.mjs"], root)
    doubao_refs = run(["node", "modules/llm-answer-reference-compare/tests/doubao_reference_test.mjs"], root)
    offline = run(["python3", "scripts/workbuddy_acceptance.py", "--run-dir", str(run_dir / "offline")], root)
    evidence_runs = [browser_session, login_recovery, capture_wait, artifact_paths, dknow_refs, doubao_refs, offline]
    if any(item["returncode"] for item in evidence_runs):
        failures.append("differentiating_regression_failed")
    n2_audit_path = Path(args.n2_product_audit).expanduser().resolve()
    n3_audit_path = Path(args.n3_product_audit).expanduser().resolve()
    session_path = Path(args.workbuddy_session_evidence).expanduser().resolve()
    n2_audit = json.loads(n2_audit_path.read_text(encoding="utf-8")) if n2_audit_path.exists() else {}
    n3_audit = json.loads(n3_audit_path.read_text(encoding="utf-8")) if n3_audit_path.exists() else {}
    session = json.loads(session_path.read_text(encoding="utf-8")) if session_path.exists() else {}
    question_sha = hashlib.sha256(args.question.encode("utf-8")).hexdigest()

    def validate_full_run(path: Path, count: int, product_audit: dict, product_audit_path: Path) -> bool:
        required = [
            "pipeline.json",
            "capture/results.json",
            "comparison.json",
            "verification.json",
            "01-capture-report.html",
            "02-comparison-report.html",
            "03-authority-report.html",
            "04-final-report.html",
            "05-complete-report-package.zip",
        ]
        if not all((path / name).exists() for name in required):
            return False
        pipeline = json.loads((path / "pipeline.json").read_text(encoding="utf-8"))
        results = json.loads((path / "capture/results.json").read_text(encoding="utf-8"))
        expected_ids = args.platform[:count]
        capture_sha = digest(path / "capture/results.json")
        return (
            pipeline.get("status") == "completed"
            and results.get("question") == args.question
            and [item.get("platform") for item in results.get("platforms") or []] == expected_ids
            and all(item.get("status") == "success" for item in results.get("platforms") or [])
            and product_audit.get("status") == "passed"
            and product_audit.get("candidateSha256") == args.candidate_sha256
            and Path(str(product_audit.get("runDir") or "")).resolve() == path
            and product_audit_path.is_file()
            and session.get(f"n{count}CaptureSha256") == capture_sha
        )

    n2_complete = validate_full_run(n2_run, 2, n2_audit, n2_audit_path)
    n3_complete = validate_full_run(n3_run, 3, n3_audit, n3_audit_path)
    browser_events = session.get("browserEvents") or []
    event_names = [item.get("event") for item in browser_events]
    required_events = {
        "page_retained", "automatic_capture_failed", "computer_use_takeover",
        "page_closed", "page_reopened", "question_replayed", "submitted",
        "generation_completed",
    }
    scenarios_by_id: dict[str, list[dict]] = {}
    for item in browser_events:
        scenarios_by_id.setdefault(str(item.get("scenarioId") or ""), []).append(item)
    retained_names = [item.get("event") for item in scenarios_by_id.get("retained-page", [])]
    recovery_names = [item.get("event") for item in scenarios_by_id.get("closed-recovery", [])]
    recovery_required = [
        "automatic_capture_failed", "computer_use_takeover", "page_closed",
        "page_reopened", "question_replayed", "submitted", "generation_completed",
    ]
    recovery_positions = [recovery_names.index(name) for name in recovery_required if name in recovery_names]
    event_evidence_valid = all(
        item.get("timestamp") and item.get("questionSha256") == question_sha and valid_hashed_file(item.get("evidence") or {})
        for item in browser_events
    )
    transcript = session.get("transcript") or {}
    auth_states = session.get("authStates") or []
    auth_valid = (
        any(item.get("state") == "logged_in" and valid_hashed_file(item.get("evidence") or {}) for item in auth_states)
        and any(
            item.get("state") == "login_required"
            and item.get("eventualState") == "completed"
            and valid_hashed_file(item.get("evidence") or {})
            for item in auth_states
        )
    )
    workbuddy_session = (
        session.get("schemaVersion") == "fact-check-x/workbuddy-session-evidence@1"
        and session.get("runtime") == "WorkBuddy"
        and bool(session.get("taskId"))
        and bool(session.get("sessionId"))
        and session.get("candidateSha256") == args.candidate_sha256
        and session.get("installedManagedTreeSha256") == installed_sha
        and session.get("questionSha256") == question_sha
        and session.get("n2RunDir") == str(n2_run)
        and session.get("n3RunDir") == str(n3_run)
        and required_events.issubset(event_names)
        and "page_retained" in retained_names
        and len(recovery_positions) == len(recovery_required)
        and recovery_positions == sorted(recovery_positions)
        and event_evidence_valid
        and valid_hashed_file(transcript)
        and auth_valid
        and session.get("startedAt")
        and session.get("endedAt")
    )
    evidence_hashes = {
        "n2ProductAudit": digest_if_file(n2_audit_path),
        "n3ProductAudit": digest_if_file(n3_audit_path),
        "workbuddySessionEvidence": digest_if_file(session_path),
    }
    audit = {}
    api_readback = {}
    try:
        audit, api_readback = read_codex_task_attestation(
            args.independent_audit_task_id, args.candidate_sha256
        )
        validate_attestation_evidence(audit, evidence_hashes)
        independent_passed = True
    except RuntimeError as exc:
        independent_passed = False
        failures.append(str(exc))
    if not (n2_complete and n3_complete and independent_passed and workbuddy_session):
        failures.append("real_workbuddy_full_pipeline_evidence_missing")
    offline_text = offline["outputTail"]
    coverage = {
        "normalTwoPlatformOnline": n2_complete,
        "normalThreePlatformOnline": n3_complete,
        "loggedInAndLoggedOut": auth_valid,
        "retainedPage": browser_session["returncode"] == 0
        and "Playwright 直接管理系统 Chromium 持久化会话" in browser_session["outputTail"]
        and "保留两平台登录状态" in browser_session["outputTail"],
        "closedReopenedQuestionReplay": capture_wait["returncode"] == 0 and "页面恢复测试" in capture_wait["outputTail"],
        "portableCaptureArtifactPaths": artifact_paths["returncode"] == 0
        and "Windows/POSIX 采集存证路径统一为安全相对路径" in artifact_paths["outputTail"],
        "missingLongAndMixedReferences": dknow_refs["returncode"] == 0 and doubao_refs["returncode"] == 0,
        "missingTrustedSearchKey": offline["returncode"] == 0 and "trustedSearchHardGate" in offline_text,
        "uniqueInstalledSkillRoot": not conflicting_roots,
        "realWorkBuddyFullPipeline": n2_complete and n3_complete and independent_passed and workbuddy_session
    }
    summary = {
        "schemaVersion": "fact-check-x/installed-live-acceptance@1",
        "status": "passed" if not failures and all(coverage.values()) else "failed",
        "installedSkill": str(root),
        "installedManagedTreeSha256": installed_sha,
        "conflictingSkillRoots": [str(path) for path in conflicting_roots],
        "managedManifestSha256": hashlib.sha256(
            json.dumps(expected_managed, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest(),
        "managedFileCount": len(installed_managed),
        "candidateSha256": args.candidate_sha256,
        "candidatePackageSha256": package_sha,
        "questionSha256": question_sha,
        "cleanRunDir": str(run_dir),
        "platforms": args.platform,
        "coverage": coverage,
        "onlineRuns": scenarios,
        "differentiatingRuns": evidence_runs,
        "n2Run": str(n2_run),
        "n3Run": str(n3_run),
        "independentAuditTaskId": args.independent_audit_task_id,
        "independentAuditAttestation": audit,
        "codexTaskApiReadback": api_readback,
        "n2ProductAudit": str(n2_audit_path),
        "n3ProductAudit": str(n3_audit_path),
        "workbuddySessionEvidence": str(session_path),
        "evidenceSha256": evidence_hashes,
        "failures": failures,
    }
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "installed-live-acceptance.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False))
    return 1 if summary["status"] != "passed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
