#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT.parent
if (ROOT / "modules").exists():
    SKILLS = ROOT / "modules"
COMPARE_FIXTURES = SKILLS / "fact-check-x-knowledge-compare" / "tests" / "fixtures"
AUTHORITY_FIXTURES = SKILLS / "fact-check-x-authoritative-verify" / "tests" / "fixtures"


def run(arguments: list[str], environment: dict[str, str] | None = None) -> dict:
    process = subprocess.run(arguments, text=True, capture_output=True, check=False, env=environment)
    if process.returncode:
        raise AssertionError(process.stdout or process.stderr)
    return json.loads([line for line in process.stdout.splitlines() if line.strip()][-1])


def run_failed(arguments: list[str], environment: dict[str, str] | None = None) -> dict:
    process = subprocess.run(arguments, text=True, capture_output=True, check=False, env=environment)
    if process.returncode == 0:
        raise AssertionError("命令应以非零状态结束")
    return json.loads([line for line in process.stdout.splitlines() if line.strip()][-1])


def command(*arguments: str) -> list[str]:
    return [sys.executable, str(ROOT / "scripts" / "fact_check_x.py"), *arguments]


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="fact-check-x-unified-") as temp:
        sys.path.insert(0, str(ROOT / "scripts"))
        from fact_check_x import merge_verification

        merge_results = Path(temp) / "merge-results"
        merge_results.mkdir()
        (merge_results / "K1.json").write_text(json.dumps({
            "schemaVersion": "fact-check-x/authority-result@1",
            "requestId": "K1",
            "searchMode": "trusted_search",
            "requestCount": 1,
            "verdicts": {
                "doubao": {"verdict": "contradicted"},
            },
            "needsReview": [],
        }), encoding="utf-8")
        merged = merge_verification({
            "question": "测试",
            "platforms": [{"platform": "doubao", "label": "豆包"}],
            "knowledgePoints": [{
                "id": "K1",
                "trustedAnchor": {"eligible": False},
            }],
            "needsReview": [{
                "stage": "comparison",
                "knowledgePointId": "K1",
                "platform": "doubao",
                "reason": "原回答引用不足",
            }],
        }, merge_results)
        assert merged["status"] == "completed"
        assert merged["needsReview"] == []

        run_dir = Path(temp) / "run"
        results = COMPARE_FIXTURES / "results.json"
        keyless_environment = {
            **os.environ,
            "TRUSTED_SEARCH_KEY": "",
            "FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE": str(
                Path(temp) / "missing-trusted-search-key"
            ),
        }
        located = run(command("locate"))
        assert set(located["skills"]) == {"collector", "comparison", "authority"}
        capture_stage = run(command("prepare-comparison", "--results", str(results), "--run-dir", str(run_dir)))
        assert capture_stage["stage"] == "capture_completed"
        assert capture_stage["artifacts"]["answerReferenceReport"] == str((run_dir / "capture" / "report.html").resolve())
        assert capture_stage["deliverables"][0]["path"] == str((run_dir / "01-capture-report.html").resolve())
        assert (run_dir / "01-capture-report.html").exists()
        assert len(capture_stage["platforms"]) == 2
        comparison_stage = run(command("complete-comparison", "--results", str(results), "--analysis", str(COMPARE_FIXTURES / "comparison-analysis.json"), "--run-dir", str(run_dir)))
        assert comparison_stage["stage"] == "comparison_completed"
        assert comparison_stage["knowledgePointCount"] == 1
        assert comparison_stage["artifacts"]["comparisonAnalysis"] == str(
            (run_dir / "comparison-analysis.json").resolve()
        )
        assert (run_dir / "comparison-analysis.json").is_file()
        assert comparison_stage["artifacts"]["comparisonReport"] == str((run_dir / "comparison.html").resolve())
        assert comparison_stage["deliverables"][0]["path"] == str((run_dir / "02-comparison-report.html").resolve())
        assert (run_dir / "02-comparison-report.html").exists()
        prepared = run(command("prepare-authority", "--run-dir", str(run_dir)), keyless_environment)
        assert prepared["taskCount"] == 1
        assert prepared["status"] == "prepared" and prepared["trustedSearchRequiredCount"] == 0
        request = json.loads((run_dir / "authority" / "requests" / "K1.json").read_text(encoding="utf-8"))
        assert set(request["cloudPayload"]) == {"title", "knowledgePoint", "differingClaims"}
        assert "answerMarkdown" not in json.dumps(request["cloudPayload"], ensure_ascii=False)
        searched = run(command("search-authority", "--run-dir", str(run_dir), "--max-workers", "12"), keyless_environment)
        assert searched["trustedSearchRequestCount"] == 0 and searched["dknowExemptCount"] == 1
        assessments = run_dir / "authority" / "assessments"
        assessments.mkdir(parents=True)
        assessment = json.loads((AUTHORITY_FIXTURES / "K1-assessment.json").read_text(encoding="utf-8"))
        (assessments / "K1.json").write_text(json.dumps(assessment, ensure_ascii=False), encoding="utf-8")
        finalized = run(command("finalize-authority", "--run-dir", str(run_dir)))
        assert finalized["status"] == "completed"
        assert finalized["stage"] == "authority_completed"
        assert finalized["deliverables"][0]["path"] == str(
            (run_dir / "03-authority-report.html").resolve()
        )
        assert (run_dir / "03-authority-report.html").exists()
        assert json.loads((run_dir / "authority-gate.json").read_text(encoding="utf-8"))["status"] == "finalized"
        delivered = run(command("deliver", "--results", str(results), "--run-dir", str(run_dir)))
        assert delivered["status"] == "completed"
        assert delivered["trustedSearchRequestCount"] == 0 and delivered["dknowExemptCount"] == 1
        assert delivered["answerReferenceReport"] == str((run_dir / "capture" / "report.html").resolve())
        assert delivered["comparisonReport"] == str((run_dir / "comparison.html").resolve())
        assert delivered["artifacts"]["report"] == str((run_dir / "report.html").resolve())
        deliverable_paths = [item["path"] for item in delivered["deliverables"]]
        assert deliverable_paths[:4] == [
            str((run_dir / "01-capture-report.html").resolve()),
            str((run_dir / "02-comparison-report.html").resolve()),
            str((run_dir / "03-authority-report.html").resolve()),
            str((run_dir / "04-final-report.html").resolve()),
        ]
        assert deliverable_paths[4] == delivered["artifacts"]["reportPackage"]
        assert all(Path(item["path"]).exists() for item in delivered["deliverables"])
        manifest = json.loads((run_dir / "pipeline.json").read_text(encoding="utf-8"))
        verification = json.loads((run_dir / "verification.json").read_text(encoding="utf-8"))
        report = (run_dir / "report.html").read_text(encoding="utf-8")
        authority_report = (run_dir / "03-authority-report.html").read_text(
            encoding="utf-8"
        )
        comparison_deliverable = (run_dir / "02-comparison-report.html").read_text(
            encoding="utf-8"
        )
        assert manifest["schemaVersion"] == "fact-check-x/pipeline@2"
        assert verification["finalAnswer"]["status"] == "verified"
        assert verification["finalAnswer"]["knowledgePointIds"] == ["K1"]
        assert verification["knowledgePoints"][0]["authority"]["verdicts"]["doubao"]["category"] == "misleading"
        assert "权威证据核验报告" in authority_report
        assert "权威核验后的最终答案" in authority_report
        assert "深知晓" in authority_report and "豆包" in authority_report
        assert "data-fcx-authority-binding-sha256" in authority_report
        assert all(
            f'href="{target}"' in comparison_deliverable
            for target in (
                "01-capture-report.html",
                "03-authority-report.html",
                "04-final-report.html",
            )
        )
        assert "① 参考性" in report and "④ 原始答案与参考文献（存证）" in report
        assert (run_dir / "comparison.html").exists()
        capture_report = (run_dir / "capture" / "report.html").read_text(encoding="utf-8")
        assert "原始答案、参考文献与引用存证报告" in capture_report
        assert "每人每月最高提取 1400 元" in capture_report
        assert (run_dir / "capture" / "report.md").exists()
        assert manifest["artifacts"]["answerReferenceReport"] == str((run_dir / "capture" / "report.html").resolve())
        assert manifest["artifacts"]["captureGate"] == str((run_dir / "capture-gate.json").resolve())
        assert manifest["artifacts"]["comparisonAnalysis"] == str(
            (run_dir / "comparison-analysis.json").resolve()
        )
        assert manifest["artifacts"]["authorityGate"] == str((run_dir / "authority-gate.json").resolve())

        artifact_source = Path(temp) / "artifact-source"
        artifact_source.mkdir()
        artifact_results = json.loads(results.read_text(encoding="utf-8"))
        for platform in artifact_results["platforms"]:
            platform_id = platform["platform"]
            platform["artifacts"] = {
                "screenshot": f"artifacts/{platform_id}/screenshot.png",
                "html": f"artifacts/{platform_id}/page.html",
            }
            artifact_dir = artifact_source / "artifacts" / platform_id
            artifact_dir.mkdir(parents=True)
            (artifact_dir / "screenshot.png").write_bytes(f"png:{platform_id}".encode())
            (artifact_dir / "page.html").write_text(
                f"<html>{platform_id}</html>", encoding="utf-8"
            )
        artifact_results_path = artifact_source / "results.json"
        artifact_results_path.write_text(
            json.dumps(artifact_results, ensure_ascii=False), encoding="utf-8"
        )
        (artifact_source / "capture-recovery.json").write_text(
            json.dumps({
                "schemaVersion": "fact-check-x/capture-recovery@1",
                "status": "completed",
            }, ensure_ascii=False),
            encoding="utf-8",
        )
        artifact_run = Path(temp) / "artifact-run"
        run(command(
            "prepare-comparison",
            "--results",
            str(artifact_results_path),
            "--run-dir",
            str(artifact_run),
        ))
        artifact_gate = json.loads(
            (artifact_run / "capture-gate.json").read_text(encoding="utf-8")
        )
        assert len(artifact_gate["artifactSha256"]) == 4
        assert artifact_gate["recoverySha256"]
        assert (artifact_run / "capture/capture-recovery.json").is_file()
        for platform in artifact_results["platforms"]:
            platform_id = platform["platform"]
            assert (
                artifact_run / f"capture/artifacts/{platform_id}/screenshot.png"
            ).is_file()
            assert (
                artifact_run / f"capture/artifacts/{platform_id}/page.html"
            ).is_file()
            assert (
                artifact_run / f"artifacts/{platform_id}/screenshot.png"
            ).is_file()
            assert (
                artifact_run / f"artifacts/{platform_id}/page.html"
            ).is_file()
        missing_artifact_results = json.loads(
            artifact_results_path.read_text(encoding="utf-8")
        )
        (
            artifact_source
            / missing_artifact_results["platforms"][0]["artifacts"]["screenshot"]
        ).unlink()
        missing_artifact_run = Path(temp) / "missing-artifact-run"
        missing_artifact = run_failed(command(
            "prepare-comparison",
            "--results",
            str(artifact_results_path),
            "--run-dir",
            str(missing_artifact_run),
        ))
        assert "存证文件不存在" in missing_artifact["error"]

        configuration_run = Path(temp) / "configuration-run"
        run(command("prepare-comparison", "--results", str(results), "--run-dir", str(configuration_run)))
        configuration_analysis = json.loads((COMPARE_FIXTURES / "comparison-analysis.json").read_text(encoding="utf-8"))
        configuration_analysis["knowledgePoints"][0]["trustedAnchor"] = {"eligible": False}
        configuration_analysis["knowledgePoints"][0]["claims"]["dknowc-chat"] = {
            "covered": False,
            "claim": "",
            "answerExcerpt": "",
            "citedReferenceIndexes": [],
            "answerLevelReferenceIndexes": [],
            "faithfulness": "insufficient",
            "reason": "",
            "evidence": [],
        }
        configuration_analysis_path = configuration_run / "comparison-analysis.json"
        configuration_analysis_path.write_text(json.dumps(configuration_analysis, ensure_ascii=False), encoding="utf-8")
        run(command("complete-comparison", "--results", str(results), "--analysis", str(configuration_analysis_path), "--run-dir", str(configuration_run)))
        configuration_required = run_failed(command(
            "prepare-authority",
            "--run-dir",
            str(configuration_run),
        ), keyless_environment)
        assert configuration_required["status"] == "configuration_required"
        assert configuration_required["action"] == "configure_trusted_search"
        assert configuration_required["trustedSearchRequiredCount"] == 1
        assert "您只需完成登录" in configuration_required["userPrompt"]
        assert "自动读取已有的可用 Key" in configuration_required["userPrompt"]
        assert configuration_required["configuration"]["providerUrl"] == "https://platform.dknowc.cn/auth/#/login"
        assert configuration_required["configuration"]["interaction"] == "browser_login_only"
        assert configuration_required["configuration"]["requiresChatSecret"] is False
        assert configuration_required["configuration"]["autoResume"] is True
        assert configuration_required["configuration"]["sharedAcrossCarriers"] is True
        assert configuration_required["configuration"]["command"][-1] == "configure"
        assert configuration_required["configuration"]["command"][-2].endswith(
            "trusted_search_config.py"
        )
        assert json.loads((configuration_run / "authority-gate.json").read_text(encoding="utf-8"))["status"] == "configuration_required"
        search_blocked = run_failed(command(
            "search-authority",
            "--run-dir",
            str(configuration_run),
            "--max-workers",
            "12",
        ), keyless_environment)
        assert search_blocked["status"] == "configuration_required"
        assert search_blocked["action"] == "configure_trusted_search"
        assert not (configuration_run / "authority" / "evidence" / "batch.json").exists()
        bypass_attempt = run_failed(command(
            "finalize-authority",
            "--run-dir",
            str(configuration_run),
        ), keyless_environment)
        assert bypass_attempt["status"] == "failed"
        assert "禁止写入裁决" in bypass_attempt["error"]
        bypass_delivery = run_failed(command(
            "deliver",
            "--results",
            str(results),
            "--run-dir",
            str(configuration_run),
        ), keyless_environment)
        assert bypass_delivery["status"] == "failed"
        assert "禁止生成最终报告" in bypass_delivery["error"]

        tamper_run = Path(temp) / "tamper-run"
        run(command("prepare-comparison", "--results", str(results), "--run-dir", str(tamper_run)))
        run(command("complete-comparison", "--results", str(results), "--analysis", str(COMPARE_FIXTURES / "comparison-analysis.json"), "--run-dir", str(tamper_run)))
        tampered = json.loads((tamper_run / "comparison.json").read_text(encoding="utf-8"))
        tampered["knowledgePoints"][0]["claims"]["doubao"]["sourceLevel"] = "official"
        (tamper_run / "comparison.json").write_text(json.dumps(tampered, ensure_ascii=False), encoding="utf-8")
        tamper_rejected = run_failed(command("prepare-authority", "--run-dir", str(tamper_run)))
        assert "被修改" in tamper_rejected["error"]

        pollution_run = Path(temp) / "pollution-run"
        run(command("prepare-comparison", "--results", str(results), "--run-dir", str(pollution_run)))
        run(command("complete-comparison", "--results", str(results), "--analysis", str(COMPARE_FIXTURES / "comparison-analysis.json"), "--run-dir", str(pollution_run)))
        run(command("prepare-authority", "--run-dir", str(pollution_run)))
        run(command("search-authority", "--run-dir", str(pollution_run), "--max-workers", "12"))
        pollution_assessments = pollution_run / "authority" / "assessments"
        pollution_assessments.mkdir(parents=True)
        shutil.copyfile(AUTHORITY_FIXTURES / "K1-assessment.json", pollution_assessments / "K1.json")
        pollution_results = pollution_run / "authority" / "results"
        pollution_results.mkdir(parents=True)
        (pollution_results / "KP-001.json").write_text("{}\n", encoding="utf-8")
        pollution_rejected = run_failed(command("finalize-authority", "--run-dir", str(pollution_run)))
        assert "results 目录必须为空" in pollution_rejected["error"]

        invalid_assessments = Path(temp) / "invalid-assessments"
        invalid_assessments.mkdir()
        (invalid_assessments / "K1.json").write_text(json.dumps({
            "requestId": "K1",
            "verdict": "supported",
            "officialAnswer": "旧结构结论",
            "platformAssessment": {
                "dknowc-chat": {"verdict": "supported", "reason": "旧结构"},
                "doubao": {"verdict": "supported", "reason": "旧结构"},
            },
        }, ensure_ascii=False), encoding="utf-8")
        invalid_run = Path(temp) / "invalid-run"
        run(command("prepare-comparison", "--results", str(results), "--run-dir", str(invalid_run)))
        run(command("complete-comparison", "--results", str(results), "--analysis", str(COMPARE_FIXTURES / "comparison-analysis.json"), "--run-dir", str(invalid_run)))
        run(command("prepare-authority", "--run-dir", str(invalid_run)))
        run(command("search-authority", "--run-dir", str(invalid_run), "--max-workers", "12"))
        invalid_final = run_failed(command(
            "finalize-authority",
            "--run-dir",
            str(invalid_run),
            "--assessments-dir",
            str(invalid_assessments),
        ))
        assert invalid_final["status"] == "failed"
        assert "裁决文件结构错误" in invalid_final["error"]
        assert not (invalid_run / "authority" / "results" / "K1.json").exists()

        review_run = Path(temp) / "review-run"
        run(command("prepare-comparison", "--results", str(results), "--run-dir", str(review_run)))
        run(command("complete-comparison", "--results", str(results), "--analysis", str(COMPARE_FIXTURES / "comparison-analysis.json"), "--run-dir", str(review_run)))
        run(command("prepare-authority", "--run-dir", str(review_run)))
        run(command("search-authority", "--run-dir", str(review_run), "--max-workers", "12"))
        review_assessments = review_run / "authority" / "assessments"
        review_assessments.mkdir(parents=True)
        review_assessment = json.loads((AUTHORITY_FIXTURES / "K1-assessment.json").read_text(encoding="utf-8"))
        review_assessment["verdicts"]["doubao"] = {
            "verdict": "insufficient",
            "reason": "当前证据不足以完成裁决",
            "evidenceIds": [],
        }
        (review_assessments / "K1.json").write_text(json.dumps(review_assessment, ensure_ascii=False), encoding="utf-8")
        review_final = run_failed(command("finalize-authority", "--run-dir", str(review_run)))
        assert review_final["status"] == "needs_review"
        assert review_final["stage"] == "authority_needs_review"
        assert review_final["needsReviewCount"] == 1
        assert review_final["deliverables"][0]["path"] == str(
            (review_run / "03-authority-report.html").resolve()
        )
        review_authority_report = (
            review_run / "03-authority-report.html"
        ).read_text(encoding="utf-8")
        assert "当前核验结论（待复核）" in review_authority_report
        assert "最终裁决报告待复核完成后生成" in review_authority_report
        assert 'href="04-final-report.html"' not in review_authority_report
        assert json.loads((review_run / "authority-gate.json").read_text(encoding="utf-8"))["status"] == "review_pending"
        review_delivery = run_failed(command("deliver", "--results", str(results), "--run-dir", str(review_run)))
        assert review_delivery["status"] == "failed"
        assert "禁止生成最终报告" in review_delivery["error"]
        shutil.copyfile(AUTHORITY_FIXTURES / "K1-assessment.json", review_assessments / "K1.json")
        retried = run(command("finalize-authority", "--run-dir", str(review_run)))
        assert retried["status"] == "completed"
        assert json.loads((review_run / "authority-gate.json").read_text(encoding="utf-8"))["status"] == "finalized"

        failed_results = json.loads(results.read_text(encoding="utf-8"))
        failed_results["platforms"][0]["answerMarkdown"] = "为您智能匹配到当前所在区域为“北京市”，如想咨询其他区域可点击修改"
        failed_results["platforms"][1]["status"] = "failed"
        failed_results["platforms"][1]["answerMarkdown"] = ""
        failed_results["platforms"][1]["error"] = "No answer text detected."
        failed_path = Path(temp) / "failed-results.json"
        failed_path.write_text(json.dumps(failed_results, ensure_ascii=False), encoding="utf-8")
        failed_run = Path(temp) / "failed-run"
        rejected = run_failed(command("prepare-comparison", "--results", str(failed_path), "--run-dir", str(failed_run)))
        assert rejected["status"] == "failed"
        assert "禁止进入知识点对比" in rejected["error"]
        assert not (failed_run / "comparison-task.json").exists()

        answered_with_region_footer = json.loads(results.read_text(encoding="utf-8"))
        answered_with_region_footer["platforms"][0]["answerMarkdown"] = (
            "北京市高考报名资格、网上申请、填报缴费和现场确认的完整政策回答。" * 10
            + "页面底部：为您智能匹配到当前所在区域为“北京市”，如想咨询其他区域可点击修改"
        )
        answered_with_region_footer_path = Path(temp) / "answered-with-region-footer.json"
        answered_with_region_footer_path.write_text(
            json.dumps(answered_with_region_footer, ensure_ascii=False),
            encoding="utf-8",
        )
        answered_with_region_footer_run = Path(temp) / "answered-with-region-footer-run"
        accepted_with_footer = run(command(
            "prepare-comparison",
            "--results",
            str(answered_with_region_footer_path),
            "--run-dir",
            str(answered_with_region_footer_run),
        ))
        assert accepted_with_footer["stage"] == "capture_completed"
        assert (answered_with_region_footer_run / "comparison-task.json").exists()

        recovery_capture = Path(temp) / "recovery-capture"
        recovery_capture.mkdir()
        recovery_results = recovery_capture / "results.json"
        recovery_results.write_text(results.read_text(encoding="utf-8"), encoding="utf-8")
        (recovery_capture / "capture-recovery.json").write_text(
            json.dumps({
                "schemaVersion": "fact-check-x/capture-recovery@1",
                "status": "required",
                "action": "computer_use",
            }, ensure_ascii=False),
            encoding="utf-8",
        )
        recovery_run = Path(temp) / "recovery-run"
        recovery_rejected = run_failed(command(
            "prepare-comparison",
            "--results",
            str(recovery_results),
            "--run-dir",
            str(recovery_run),
        ))
        assert "Computer Use" in recovery_rejected["error"]
        assert not (recovery_run / "comparison-task.json").exists()
        assert not (ROOT / "assets").exists()
    if os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT"):
        Path(os.environ["FACT_CHECK_X_ASSERTIONS_OUTPUT"]).write_text(json.dumps({
            "schemaVersion": "fact-check-x/test-assertions@1",
            "actualAssertionIds": [
                "report.stage_artifacts_visible",
                "report.checkpoints_indexed",
                "report.unverified_draft_visible",
                "report.verified_final_answer_visible",
            ],
        }), encoding="utf-8")
    print("PASS Fact-Check-X 统一入口")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
