#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import select
import shutil
import subprocess
import time
import uuid
from pathlib import Path


SENSITIVE_PATTERN = re.compile(
    r"sk-(?:proj-)?[A-Za-z0-9_-]{20,}"
    r"|Bearer\s+[A-Za-z0-9._+/-]{20,}"
    r"|TRUSTED_SEARCH_KEY\s*=\s*[\"']?[A-Za-z0-9._+/-]{16,}",
    re.IGNORECASE,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree_sha(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        if any(part in {"node_modules", "__pycache__"} for part in path.parts):
            continue
        digest.update(str(path.relative_to(root)).encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def validate_build_destination(out_dir: Path, official_dist: Path) -> None:
    if out_dir.resolve() == official_dist.resolve():
        raise RuntimeError("正式 dist 已受保护；请使用 release_fact_check_x.py 完成全部 fail-closed 门禁")


def validate_live_evidence(live: dict, candidate_sha: str, manifest_sha: str) -> None:
    required_coverage = {
        "normalTwoPlatformOnline",
        "normalThreePlatformOnline",
        "loggedInAndLoggedOut",
        "retainedPage",
        "closedReopenedQuestionReplay",
        "portableCaptureArtifactPaths",
        "missingLongAndMixedReferences",
        "missingTrustedSearchKey",
        "uniqueInstalledSkillRoot",
        "realWorkBuddyFullPipeline",
    }
    coverage = live.get("coverage") or {}
    artifacts = live.get("evidenceSha256") or {}
    artifact_paths = {
        "n2ProductAudit": live.get("n2ProductAudit"),
        "n3ProductAudit": live.get("n3ProductAudit"),
        "workbuddySessionEvidence": live.get("workbuddySessionEvidence"),
    }
    artifacts_valid = bool(artifacts) and all(
        Path(str(path or "")).expanduser().resolve().is_file()
        and artifacts.get(name)
        == sha256(Path(str(path)).expanduser().resolve())
        for name, path in artifact_paths.items()
    )
    attestation = live.get("independentAuditAttestation") or {}
    api_readback = live.get("codexTaskApiReadback") or {}
    try:
        validate_independent_audit(attestation, candidate_sha)
        validate_attestation_evidence(attestation, artifacts)
        api_valid = (
            api_readback.get("schemaVersion")
            == "fact-check-x/codex-task-api-readback@1"
            and api_readback.get("taskId") == attestation.get("taskId")
            and api_readback.get("candidateSha256") == candidate_sha
            and bool(api_readback.get("finalMessageSha256"))
            and bool(api_readback.get("attestationSha256"))
        )
    except RuntimeError:
        api_valid = False
    if (
        live.get("schemaVersion") != "fact-check-x/installed-live-acceptance@1"
        or live.get("status") != "passed"
        or live.get("candidateSha256") != candidate_sha
        or live.get("candidatePackageSha256") != candidate_sha
        or live.get("managedManifestSha256") != manifest_sha
        or not str(live.get("installedSkill") or "").startswith(
            str(Path.home() / ".workbuddy/skills/")
        )
        or set(coverage) != required_coverage
        or not all(coverage.values())
        or not artifacts_valid
        or not api_valid
    ):
        raise RuntimeError("live_evidence_not_bound_to_candidate")


def validate_independent_audit(audit: dict, candidate_sha: str) -> None:
    if (
        audit.get("schemaVersion")
        != "fact-check-x/independent-release-audit@1"
        or audit.get("status") != "passed"
        or audit.get("candidateSha256") != candidate_sha
        or not audit.get("taskId")
        or audit.get("blockingFindings")
    ):
        raise RuntimeError("independent_audit_attestation_failed")


def validate_attestation_evidence(audit: dict, artifacts: dict) -> None:
    expected = {
        "n2ProductAuditSha256": artifacts.get("n2ProductAudit"),
        "n3ProductAuditSha256": artifacts.get("n3ProductAudit"),
        "sessionEvidenceSha256": artifacts.get("workbuddySessionEvidence"),
    }
    if not all(expected.values()) or any(
        audit.get(field) != value for field, value in expected.items()
    ):
        raise RuntimeError("independent_audit_evidence_hash_mismatch")


def extract_codex_task_attestation(
    thread: dict, task_id: str, candidate_sha: str
) -> tuple[dict, str]:
    if thread.get("id") != task_id or not thread.get("turns"):
        raise RuntimeError("codex_task_api_readback_failed")
    marker = "FACT_CHECK_X_AUDIT_ATTESTATION"
    message = ""
    for turn in reversed(thread.get("turns") or []):
        for item in reversed(turn.get("items") or []):
            text = str(item.get("text") or "")
            if item.get("type") == "agentMessage" and marker in text:
                message = text
                break
        if message:
            break
    if not message:
        raise RuntimeError("codex_task_attestation_missing")
    tail = message.split(marker, 1)[1]
    start = tail.find("{")
    if start < 0:
        raise RuntimeError("codex_task_attestation_invalid")
    try:
        attestation, _ = json.JSONDecoder().raw_decode(tail[start:])
    except json.JSONDecodeError as exc:
        raise RuntimeError("codex_task_attestation_invalid") from exc
    attestation["taskId"] = task_id
    validate_independent_audit(attestation, candidate_sha)
    return attestation, message


def read_codex_task_attestation(task_id: str, candidate_sha: str) -> tuple[dict, dict]:
    codex = shutil.which("codex")
    if not codex:
        raise RuntimeError("codex_task_api_unavailable")
    process = subprocess.Popen(
        [codex, "app-server", "--stdio"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    assert process.stdin and process.stdout and process.stderr
    requests = [
        {
            "id": 1,
            "method": "initialize",
            "params": {
                "clientInfo": {
                    "name": "fact-check-x-release-gate",
                    "version": "1",
                },
                "capabilities": {"experimentalApi": True},
            },
        },
        {
            "id": 2,
            "method": "thread/read",
            "params": {"threadId": task_id, "includeTurns": True},
        },
    ]
    for request in requests:
        process.stdin.write(json.dumps(request, separators=(",", ":")) + "\n")
    process.stdin.flush()
    responses: dict[int, dict] = {}
    deadline = time.monotonic() + 15
    try:
        while time.monotonic() < deadline and 2 not in responses:
            ready, _, _ = select.select(
                [process.stdout, process.stderr], [], [], 0.5
            )
            for stream in ready:
                line = stream.readline()
                if not line or stream is process.stderr:
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(item.get("id"), int):
                    responses[item["id"]] = item
    finally:
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
    thread = ((responses.get(2) or {}).get("result") or {}).get("thread") or {}
    attestation, message = extract_codex_task_attestation(
        thread, task_id, candidate_sha
    )
    readback = {
        "schemaVersion": "fact-check-x/codex-task-api-readback@1",
        "taskId": task_id,
        "candidateSha256": candidate_sha,
        "threadSessionId": thread.get("sessionId"),
        "threadUpdatedAt": thread.get("updatedAt"),
        "threadSource": thread.get("threadSource"),
        "finalMessageSha256": hashlib.sha256(message.encode()).hexdigest(),
        "attestationSha256": hashlib.sha256(
            json.dumps(attestation, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest(),
        "apiUserAgent": ((responses.get(1) or {}).get("result") or {}).get(
            "userAgent"
        ),
    }
    return attestation, readback


def conflicting_skill_roots(installed_skill: Path) -> list[Path]:
    installed = installed_skill.expanduser().resolve()
    parent = installed.parent
    if not parent.is_dir():
        return []
    prefix = installed.name
    return sorted(
        path.resolve()
        for path in parent.iterdir()
        if path.is_dir()
        and path.resolve() != installed
        and path.name.lstrip(".").startswith(prefix)
    )


def validate_unique_skill_install(installed_skill: Path) -> None:
    conflicts = conflicting_skill_roots(installed_skill)
    if conflicts:
        names = ", ".join(path.name for path in conflicts)
        raise RuntimeError(f"stale_skill_discovery_roots_present: {names}")


def scan_sensitive(root: Path) -> list[str]:
    matches = []
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        if any(part in {".git", "node_modules", "__pycache__"} for part in path.parts):
            continue
        try:
            if path.stat().st_size > 4 * 1024 * 1024:
                continue
            content = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if SENSITIVE_PATTERN.search(content):
            matches.append(str(path.relative_to(root)))
    return matches


def _write_promotion_journal(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, sort_keys=True) + "\n", encoding="utf-8")
    with temporary.open("rb") as handle:
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def recover_pending_promotion(official: Path) -> bool:
    official = official.resolve()
    journal = official.parent / f".{official.name}.promotion.json"
    if not journal.exists():
        return False
    payload = json.loads(journal.read_text(encoding="utf-8"))
    backup = Path(str(payload.get("backup") or "")).resolve()
    staged = Path(str(payload.get("staged") or "")).resolve()
    before = str(payload.get("beforeTreeSha256") or "")
    staged_sha = str(payload.get("stagedTreeSha256") or "")
    state = str(payload.get("state") or "")
    if (
        Path(str(payload.get("official") or "")).resolve() != official
        or backup.parent != official.parent
        or staged.parent != official.parent
        or not before
        or not staged_sha
    ):
        raise RuntimeError("promotion_journal_invalid")
    if state == "committed" and official.exists() and tree_sha(official) == staged_sha:
        if backup.exists():
            shutil.rmtree(backup)
        if staged.exists():
            shutil.rmtree(staged)
        journal.unlink()
        return True
    if backup.exists():
        if official.exists():
            shutil.rmtree(official)
        os.replace(backup, official)
    if staged.exists():
        shutil.rmtree(staged)
    if not official.exists() or tree_sha(official) != before:
        raise RuntimeError("promotion_recovery_tree_mismatch")
    journal.unlink()
    return True


def transactional_promote(
    staged_source: Path,
    official: Path,
    *,
    inject_failure_before_backup: bool = False,
    inject_failure_after_backup: bool = False,
    inject_interruption_after_backup: bool = False,
    inject_interruption_after_commit: bool = False,
) -> None:
    recover_pending_promotion(official)
    parent = official.parent
    staged = parent / f".{official.name}.staged-{uuid.uuid4()}"
    backup = parent / f".{official.name}.backup-{uuid.uuid4()}"
    journal = parent / f".{official.name}.promotion.json"
    before = tree_sha(official)
    shutil.copytree(staged_source, staged)
    staged_sha = tree_sha(staged)
    payload = {
        "schemaVersion": "fact-check-x/promotion-journal@1",
        "official": str(official.resolve()),
        "staged": str(staged.resolve()),
        "backup": str(backup.resolve()),
        "beforeTreeSha256": before,
        "stagedTreeSha256": staged_sha,
        "state": "prepared",
    }
    _write_promotion_journal(journal, payload)
    backup_created = False
    try:
        if inject_failure_before_backup:
            raise RuntimeError("injected_pre_backup_failure")
        os.replace(official, backup)
        backup_created = True
        payload["state"] = "backed_up"
        _write_promotion_journal(journal, payload)
        if inject_interruption_after_backup:
            raise KeyboardInterrupt("injected_promotion_interruption")
        if inject_failure_after_backup:
            raise RuntimeError("injected_promotion_failure")
        os.replace(staged, official)
        payload["state"] = "promoted"
        _write_promotion_journal(journal, payload)
        if tree_sha(official) != staged_sha:
            raise RuntimeError("promoted_dist_tree_mismatch")
        payload["state"] = "committed"
        _write_promotion_journal(journal, payload)
        shutil.rmtree(backup)
        if inject_interruption_after_commit:
            raise KeyboardInterrupt("injected_commit_interruption")
        journal.unlink()
    except Exception:
        if backup_created and backup.exists():
            if official.exists():
                shutil.rmtree(official)
            os.replace(backup, official)
        if staged.exists():
            shutil.rmtree(staged)
        if journal.exists():
            journal.unlink()
        if not official.exists() or tree_sha(official) != before:
            raise RuntimeError("promotion_rollback_tree_mismatch")
        raise
