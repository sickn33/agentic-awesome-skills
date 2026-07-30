#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
def load_core():
    scripts = ROOT / "scripts"
    sys.path.insert(0, str(scripts))
    try:
        target = scripts / "release_gate_core.py"
        spec = importlib.util.spec_from_file_location("fact_check_x_release_gate_core", target)
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)


def main() -> int:
    release = load_core()

    with tempfile.TemporaryDirectory(prefix="fact-check-x-release-governance-") as temporary:
        temp = Path(temporary)
        protected = temp / "dist"
        protected.mkdir()
        (protected / "baseline.zip").write_bytes(b"baseline")
        protected_before = release.tree_sha(protected)
        try:
            release.validate_build_destination(protected, protected)
            raise AssertionError("ordinary builder destination passed")
        except RuntimeError:
            pass
        assert release.tree_sha(protected) == protected_before

        skill_parent = temp / ".workbuddy" / "skills"
        installed_skill = skill_parent / "fact-check-x-complete"
        installed_skill.mkdir(parents=True)
        release.validate_unique_skill_install(installed_skill)
        stale_skill = skill_parent / "fact-check-x-complete.backup-old"
        stale_skill.mkdir()
        try:
            release.validate_unique_skill_install(installed_skill)
            raise AssertionError("stale skill discovery root passed")
        except RuntimeError as exc:
            assert str(exc).startswith("stale_skill_discovery_roots_present:")

        previous_authorization = os.environ.get("FACT_CHECK_X_RELEASE_DRIVER")
        os.environ["FACT_CHECK_X_RELEASE_DRIVER"] = "authorized"
        try:
            release.validate_build_destination(protected, protected)
            raise AssertionError("environment authorization bypassed destination guard")
        except RuntimeError:
            pass
        finally:
            if previous_authorization is None:
                os.environ.pop("FACT_CHECK_X_RELEASE_DRIVER", None)
            else:
                os.environ["FACT_CHECK_X_RELEASE_DRIVER"] = previous_authorization
        assert release.tree_sha(protected) == protected_before
        sensitive_root = temp / "sensitive"
        sensitive_root.mkdir()
        (sensitive_root / "api-key.txt").write_text(
            "sk-" + ("A" * 24) + "\n", encoding="utf-8"
        )
        (sensitive_root / "bearer.txt").write_text(
            "Bearer " + ("b" * 24) + "\n", encoding="utf-8"
        )
        (sensitive_root / "env.txt").write_text(
            "TRUSTED_SEARCH_KEY=" + ("c" * 24) + "\n", encoding="utf-8"
        )
        (sensitive_root / "project-key.txt").write_text(
            "sk-proj-" + ("D" * 24) + "\n", encoding="utf-8"
        )
        (sensitive_root / "slash-bearer.txt").write_text(
            "Bearer " + ("e+/" * 10) + "\n", encoding="utf-8"
        )
        assert release.scan_sensitive(sensitive_root) == [
            "api-key.txt",
            "bearer.txt",
            "env.txt",
            "project-key.txt",
            "slash-bearer.txt",
        ]
        bad_live = {
            "schemaVersion": "fact-check-x/installed-live-acceptance@1",
            "status": "passed",
            "candidateSha256": "forged",
            "managedManifestSha256": "forged",
            "installedSkill": str(Path.home() / ".workbuddy/skills/forged"),
        }
        try:
            release.validate_live_evidence(bad_live, "real", "real-manifest")
            raise AssertionError("forged live evidence passed")
        except RuntimeError as exc:
            assert str(exc) == "live_evidence_not_bound_to_candidate"
        evidence_paths = {
            "n2ProductAudit": temp / "n2-product-audit.json",
            "n3ProductAudit": temp / "n3-product-audit.json",
            "workbuddySessionEvidence": temp / "workbuddy-session-evidence.json",
        }
        for name, path in evidence_paths.items():
            path.write_text(f"{name}\n", encoding="utf-8")
        evidence_hashes = {
            name: release.sha256(path)
            for name, path in evidence_paths.items()
        }
        valid_audit = {
            "schemaVersion": "fact-check-x/independent-release-audit@1",
            "status": "passed",
            "candidateSha256": "real",
            "taskId": "T1",
            "blockingFindings": [],
            "n2ProductAuditSha256": evidence_hashes["n2ProductAudit"],
            "n3ProductAuditSha256": evidence_hashes["n3ProductAudit"],
            "sessionEvidenceSha256": evidence_hashes["workbuddySessionEvidence"],
        }
        valid_live = {
            "schemaVersion": "fact-check-x/installed-live-acceptance@1",
            "status": "passed",
            "candidateSha256": "real",
            "candidatePackageSha256": "real",
            "managedManifestSha256": "real-manifest",
            "installedSkill": str(
                Path.home() / ".workbuddy/skills/fact-check-x-complete"
            ),
            "coverage": {
                "normalTwoPlatformOnline": True,
                "normalThreePlatformOnline": True,
                "loggedInAndLoggedOut": True,
                "retainedPage": True,
                "closedReopenedQuestionReplay": True,
                "portableCaptureArtifactPaths": True,
                "missingLongAndMixedReferences": True,
                "missingTrustedSearchKey": True,
                "uniqueInstalledSkillRoot": True,
                "realWorkBuddyFullPipeline": True,
            },
            "evidenceSha256": evidence_hashes,
            **{
                name: str(path)
                for name, path in evidence_paths.items()
            },
            "independentAuditAttestation": valid_audit,
            "codexTaskApiReadback": {
                "schemaVersion": "fact-check-x/codex-task-api-readback@1",
                "taskId": "T1",
                "candidateSha256": "real",
                "finalMessageSha256": "final",
                "attestationSha256": "attestation",
            },
        }
        release.validate_live_evidence(valid_live, "real", "real-manifest")
        try:
            release.validate_independent_audit(
                {"status": "passed", "candidateSha256": "real", "taskId": "T1"},
                "real",
            )
            raise AssertionError("forged audit readback passed")
        except RuntimeError as exc:
            assert str(exc) == "independent_audit_attestation_failed"
        audit_payload = {
            "schemaVersion": "fact-check-x/independent-release-audit@1",
            "status": "passed",
            "candidateSha256": "real",
            "blockingFindings": [],
            "n2ProductAuditSha256": "n2",
            "n3ProductAuditSha256": "n3",
            "sessionEvidenceSha256": "session",
        }
        audit_message = (
            "审计完成\nFACT_CHECK_X_AUDIT_ATTESTATION\n"
            + json.dumps(audit_payload, ensure_ascii=False)
        )
        attestation, extracted_message = release.extract_codex_task_attestation(
            {
                "id": "T1",
                "turns": [
                    {
                        "items": [
                            {"type": "agentMessage", "text": audit_message}
                        ]
                    }
                ],
            },
            "T1",
            "real",
        )
        assert extracted_message == audit_message
        assert attestation["taskId"] == "T1"
        release.validate_attestation_evidence(
            attestation,
            {
                "n2ProductAudit": "n2",
                "n3ProductAudit": "n3",
                "workbuddySessionEvidence": "session",
            },
        )
        try:
            release.validate_attestation_evidence(
                attestation,
                {
                    "n2ProductAudit": "forged",
                    "n3ProductAudit": "n3",
                    "workbuddySessionEvidence": "session",
                },
            )
            raise AssertionError("forged audit evidence hashes passed")
        except RuntimeError as exc:
            assert str(exc) == "independent_audit_evidence_hash_mismatch"

        parent = temp / "promotion"
        official_test = parent / "dist"
        staged = temp / "staged"
        official_test.mkdir(parents=True)
        staged.mkdir()
        (official_test / "baseline.txt").write_text("baseline\n", encoding="utf-8")
        (staged / "candidate.txt").write_text("candidate\n", encoding="utf-8")
        (staged / "release-receipt.json").write_text(
            '{"status":"promoted"}\n', encoding="utf-8"
        )
        tree_before = release.tree_sha(official_test)
        try:
            release.transactional_promote(
                staged, official_test, inject_failure_after_backup=True
            )
            raise AssertionError("injected promotion failure did not fail")
        except RuntimeError as exc:
            assert str(exc) == "injected_promotion_failure"
        assert release.tree_sha(official_test) == tree_before
        assert (official_test / "baseline.txt").read_text(encoding="utf-8") == "baseline\n"
        assert not (official_test / "candidate.txt").exists()

        try:
            release.transactional_promote(
                staged, official_test, inject_failure_before_backup=True
            )
            raise AssertionError("pre-backup promotion failure did not fail")
        except RuntimeError as exc:
            assert str(exc) == "injected_pre_backup_failure"
        assert release.tree_sha(official_test) == tree_before

        try:
            release.transactional_promote(
                staged, official_test, inject_interruption_after_backup=True
            )
            raise AssertionError("promotion interruption did not interrupt")
        except KeyboardInterrupt as exc:
            assert str(exc) == "injected_promotion_interruption"
        assert not official_test.exists()
        assert release.recover_pending_promotion(official_test) is True
        assert release.tree_sha(official_test) == tree_before
        assert (official_test / "baseline.txt").read_text(encoding="utf-8") == "baseline\n"

        try:
            release.transactional_promote(
                staged, official_test, inject_interruption_after_commit=True
            )
            raise AssertionError("commit interruption did not interrupt")
        except KeyboardInterrupt as exc:
            assert str(exc) == "injected_commit_interruption"
        candidate_tree = release.tree_sha(staged)
        assert release.tree_sha(official_test) == candidate_tree
        assert release.recover_pending_promotion(official_test) is True
        assert release.tree_sha(official_test) == candidate_tree
        assert (official_test / "candidate.txt").read_text(encoding="utf-8") == "candidate\n"
        assert json.loads(
            (official_test / "release-receipt.json").read_text(encoding="utf-8")
        )["status"] == "promoted"

    output = os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT")
    if output:
        Path(output).write_text(json.dumps({
            "schemaVersion": "fact-check-x/test-assertions@1",
            "actualAssertionIds": [
                "process.release_driver_fail_closed",
                "process.independent_audit_readback_required",
                "process.unique_install_root_required",
            ],
        }), encoding="utf-8")
    print("PASS release-loop behavioral fail-closed gates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
