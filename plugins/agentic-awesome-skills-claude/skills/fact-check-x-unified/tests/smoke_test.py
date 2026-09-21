#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from unittest.mock import patch


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
    payload = json.loads([line for line in process.stdout.splitlines() if line.strip()][-1])
    checkpoint = payload.get("checkpoint") or {}
    acknowledgement = checkpoint.get("acknowledgement") or {}
    if checkpoint.get("status") == "awaiting_user" and acknowledgement:
        acknowledged = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "fact_check_x.py"),
             "acknowledge-stage", "--run-dir", str(Path(checkpoint["path"]).parent),
             "--stage", checkpoint["stage"], "--token", acknowledgement["token"],
             "--decision", "continue"],
            text=True, capture_output=True, check=False, env=environment,
        )
        if acknowledged.returncode:
            raise AssertionError(acknowledged.stdout or acknowledged.stderr)
    return payload


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
        import fact_check_x
        from fact_check_x import (
            collect_technical_notices,
            merge_verification,
            normalize_report_navigation,
        )
        assert fact_check_x.file_uri_for_path(
            r"C:\WorkBuddy\fact-check-x\runs\sample run\02-comparison-report.html"
        ) == "file:///C:/WorkBuddy/fact-check-x/runs/sample%20run/02-comparison-report.html"
        assert fact_check_x.normalize_platform_path_text(
            "/c/WorkBuddy/fact-check-x/runs/sample run/02-comparison-report.html",
            "nt",
        ) == "C:/WorkBuddy/fact-check-x/runs/sample run/02-comparison-report.html"
        assert fact_check_x.file_uri_for_path(
            "/c/WorkBuddy/fact-check-x/runs/sample run/02-comparison-report.html",
            "nt",
        ) == "file:///C:/WorkBuddy/fact-check-x/runs/sample%20run/02-comparison-report.html"

        def assert_deliverable(item: dict, label: str, path: Path) -> None:
            uri = path.resolve().as_uri()
            assert item["label"] == label
            assert item["path"] == str(path.resolve())
            assert item["fileUri"] == uri
            assert item["markdownLink"] == f"[打开{label}](<{uri}>)"

        notice_run = Path(temp) / "technical-notice"
        (notice_run / "capture").mkdir(parents=True)
        (notice_run / "capture" / "results.json").write_text(
            json.dumps({
                "platforms": [{
                    "platform": "doubao",
                    "label": "豆包",
                    "references": [
                        {"sourceAcquisitionStatus": "blocked"},
                        {"contentAcquisition": "failed"},
                    ],
                }],
            }, ensure_ascii=False),
            encoding="utf-8",
        )
        notices = collect_technical_notices(notice_run)
        assert len(notices) == 1 and "豆包 2 条" in notices[0]
        notice_html = normalize_report_navigation(
            b"<html><head><style></style></head><body><main>test</main></body></html>",
            "01-capture-report.html",
            notices,
        ).decode("utf-8")
        assert 'data-fcx-run-notice="1"' in notice_html
        assert "受影响且无法核验的主张按“疑似误导”呈现" in notice_html

        merge_results = Path(temp) / "merge-results"
        merge_results.mkdir()
        (merge_results / "K1.json").write_text(json.dumps({
            "schemaVersion": "fact-check-x/authority-result@1",
            "requestId": "K1",
            "searchMode": "trusted_search",
            "requestCount": 1,
            "authoritativeFinding": "直接问题权威结论。",
            "claims": {
                "doubao": {"covered": True, "claim": "直接问题平台主张。"},
            },
            "verdicts": {
                "doubao": {"verdict": "contradicted"},
            },
            "evidenceGaps": [],
        }), encoding="utf-8")
        (merge_results / "K2.json").write_text(json.dumps({
            "schemaVersion": "fact-check-x/authority-result@1",
            "requestId": "K2",
            "searchMode": "trusted_search",
            "requestCount": 1,
            "authoritativeFinding": "补充参考权威结论。",
            "claims": {
                "doubao": {"covered": True, "claim": "补充参考平台主张。"},
            },
            "verdicts": {
                "doubao": {"verdict": "supported"},
            },
            "evidenceGaps": [],
        }), encoding="utf-8")
        merged = merge_verification({
            "question": "测试",
            "platforms": [{"platform": "doubao", "label": "豆包"}],
            "knowledgePoints": [{
                "id": "K1",
                "description": "直接问题",
                "role": "direct",
                "trustedAnchor": {"eligible": False},
            }, {
                "id": "K2",
                "description": "补充参考",
                "role": "reference",
                "trustedAnchor": {"eligible": False},
            }],
            "analysisGaps": [{
                "stage": "comparison",
                "knowledgePointId": "K1",
                "platform": "doubao",
                "reason": "原回答引用不足",
            }],
        }, merge_results)
        assert merged["status"] == "completed"
        assert merged["evidenceGaps"] == []
        assert merged["finalAnswer"]["knowledgePointIds"] == ["K1"]
        assert merged["supplementalFindings"]["knowledgePointIds"] == ["K2"]
        assert merged["finalAnswer"]["answer"] == "直接问题权威结论。"
        assert "补充参考权威结论" not in merged["finalAnswer"]["answer"]

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
        assert capture_stage["analysisExecution"]["mode"] == "single_pass"
        assert capture_stage["analysisExecution"]["maxToolCallsAfterStageAcknowledgement"] == 3
        assert len(capture_stage["analysisExecution"]["instructions"]) == 3
        assert capture_stage["artifacts"]["answerReferenceReport"] == str((run_dir / "capture" / "report.html").resolve())
        assert capture_stage["deliverables"][0]["path"] == str((run_dir / "01-capture-report.html").resolve())
        assert_deliverable(
            capture_stage["deliverables"][0],
            "各方答案汇总",
            run_dir / "01-capture-report.html",
        )
        assert capture_stage["checkpoint"]["mustPresentBeforeNextStage"] is True
        assert capture_stage["checkpoint"]["path"] == str(
            (run_dir / "01-capture-report.html").resolve()
        )
        assert "打开各方答案汇总" in capture_stage["checkpoint"]["message"]
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
        assert_deliverable(
            comparison_stage["deliverables"][0],
            "各方答案聚合（未核验）",
            run_dir / "02-comparison-report.html",
        )
        assert comparison_stage["checkpoint"]["mustPresentBeforeNextStage"] is True
        assert comparison_stage["checkpoint"]["path"] == str(
            (run_dir / "02-comparison-report.html").resolve()
        )
        overwide_analysis = json.loads(
            (COMPARE_FIXTURES / "comparison-analysis.json").read_text(encoding="utf-8")
        )
        overwide_analysis["knowledgePoints"][0]["claims"]["dknowc-chat"]["claim"] = (
            "每人每月最高提取1400元，并另有最高300万元研发资助"
        )
        overwide_path = Path(temp) / "overwide-comparison-analysis.json"
        overwide_path.write_text(
            json.dumps(overwide_analysis, ensure_ascii=False), encoding="utf-8"
        )
        overwide_run = Path(temp) / "overwide-run"
        run(command(
            "prepare-comparison",
            "--results", str(results),
            "--run-dir", str(overwide_run),
        ))
        overwide_failure = run_failed(command(
            "complete-comparison",
            "--results", str(results),
            "--analysis", str(overwide_path),
            "--run-dir", str(overwide_run),
        ))
        assert "原子性门禁" in json.dumps(overwide_failure, ensure_ascii=False)
        assert not (overwide_run / "comparison-gate.json").exists()
        assert "打开各方答案聚合（未核验）" in comparison_stage["checkpoint"]["message"]
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
        original_pipeline_run = fact_check_x.run

        def fail_authority_report(arguments, environment=None):
            if any(Path(str(item)).name == "render_authority_report.py" for item in arguments):
                raise fact_check_x.PipelineError("强制报告渲染失败")
            return original_pipeline_run(arguments, environment)

        with patch.object(fact_check_x, "run", side_effect=fail_authority_report):
            try:
                fact_check_x.finalize_authority(
                    type("Args", (), {"run_dir": str(run_dir), "assessments_dir": None})(),
                    {key: Path(value) for key, value in located["skills"].items()},
                )
            except fact_check_x.PipelineError as exc:
                assert "强制报告渲染失败" in str(exc)
            else:
                raise AssertionError("报告渲染失败应回滚权威核验事务")
        assert json.loads(
            (run_dir / "authority-gate.json").read_text(encoding="utf-8")
        )["status"] == "searched"
        assert not list((run_dir / "authority" / "results").glob("*.json"))
        assert not (run_dir / "verification.json").exists()
        assert not (run_dir / "03-authority-report.html").exists()
        finalized = run(command("finalize-authority", "--run-dir", str(run_dir)))
        assert finalized["status"] == "completed"
        assert finalized["stage"] == "authority_completed"
        assert finalized["deliverables"][0]["path"] == str(
            (run_dir / "03-authority-report.html").resolve()
        )
        assert_deliverable(
            finalized["deliverables"][0],
            "权威核验后的最终答案",
            run_dir / "03-authority-report.html",
        )
        assert finalized["checkpoint"]["mustPresentBeforeNextStage"] is True
        assert finalized["checkpoint"]["path"] == str(
            (run_dir / "03-authority-report.html").resolve()
        )
        assert "打开权威核验后的最终答案" in finalized["checkpoint"]["message"]
        assert (run_dir / "03-authority-report.html").exists()
        assert json.loads((run_dir / "authority-gate.json").read_text(encoding="utf-8"))["status"] == "finalized"
        reopened = run(command(
            "reopen-authority",
            "--run-dir", str(run_dir),
            "--reason", "修正被截断的权威结论",
        ))
        assert reopened["stage"] == "authority_reopened"
        assert reopened["revision"] == 1
        revision_dir = run_dir / "authority" / "revisions" / "revision-001"
        assert (revision_dir / "revision.json").is_file()
        assert (revision_dir / "verification.json").is_file()
        assert (revision_dir / "authority" / "results" / "K1.json").is_file()
        assert not list((run_dir / "authority" / "results").glob("*.json"))
        assert not (run_dir / "verification.json").exists()
        assert not (run_dir / "03-authority-report.html").exists()
        reopened_gate = json.loads((run_dir / "authority-gate.json").read_text(encoding="utf-8"))
        assert reopened_gate["status"] == "searched"
        comparison_data = json.loads((run_dir / "comparison.json").read_text(encoding="utf-8"))
        exact_title = comparison_data["knowledgePoints"][0]["description"]
        assessment["authoritativeFinding"] = f"{exact_title}：每人每月最高提取1400元。"
        (assessments / "K1.json").write_text(
            json.dumps(assessment, ensure_ascii=False), encoding="utf-8"
        )
        refinalized = run(command("finalize-authority", "--run-dir", str(run_dir)))
        assert refinalized["status"] == "completed"
        reopened_verification = json.loads(
            (run_dir / "verification.json").read_text(encoding="utf-8")
        )
        assert reopened_verification["finalAnswer"]["items"][0]["answer"] == assessment["authoritativeFinding"]
        locked_verification = (run_dir / "verification.json").read_bytes()
        locked_authority_report = (run_dir / "03-authority-report.html").read_bytes()
        (run_dir / "verification.json").write_bytes(locked_verification + b"\n")
        immutable_rejection = run_failed(command(
            "deliver", "--results", str(results), "--run-dir", str(run_dir)
        ))
        assert "第三步权威核验结果已被修改" in immutable_rejection["error"]
        (run_dir / "verification.json").write_bytes(locked_verification)
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
        with zipfile.ZipFile(deliverable_paths[4]) as report_archive:
            packaged_checkpoints = json.loads(
                report_archive.read(
                    "fact-check-x-report/data/stage-checkpoints.json"
                ).decode("utf-8")
            )
        assert list(packaged_checkpoints["stages"]) == [
            "capture", "comparison", "authority", "evaluation"
        ]
        assert packaged_checkpoints["stages"]["evaluation"]["status"] == "completed"
        for packaged_stage in packaged_checkpoints["stages"].values():
            for packaged_item in packaged_stage.get("deliverables") or []:
                assert packaged_item["fileUri"].startswith("../")
                assert "file://" not in packaged_item["markdownLink"]
                assert "file://" not in packaged_item["message"]
        assert delivered["checkpoint"]["mustPresentBeforeNextStage"] is True
        assert delivered["checkpoint"]["path"] == str(
            (run_dir / "04-final-report.html").resolve()
        )
        assert "打开各方答案测评报告" in delivered["checkpoint"]["message"]
        assert (run_dir / "verification.json").read_bytes() == locked_verification
        assert (run_dir / "03-authority-report.html").read_bytes() == locked_authority_report
        assert all(Path(item["path"]).exists() for item in delivered["deliverables"])
        for item, label, path in (
            (delivered["deliverables"][0], "各方答案汇总", run_dir / "01-capture-report.html"),
            (delivered["deliverables"][1], "各方答案聚合（未核验）", run_dir / "02-comparison-report.html"),
            (delivered["deliverables"][2], "权威核验后的最终答案", run_dir / "03-authority-report.html"),
            (delivered["deliverables"][3], "各方答案测评报告", run_dir / "04-final-report.html"),
            (delivered["deliverables"][4], "完整可分发报告包", Path(deliverable_paths[4])),
        ):
            assert_deliverable(item, label, path)
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
        assert "权威核验报告（问题：" in authority_report
        assert "权威核验后的最终答案" in authority_report
        assert "各平台裁决" not in authority_report
        assert "data-fcx-authority-binding-sha256" not in authority_report
        report_names = [
            "01-capture-report.html",
            "02-comparison-report.html",
            "03-authority-report.html",
            "04-final-report.html",
        ]
        for report_name in report_names:
            report_html = (run_dir / report_name).read_text(encoding="utf-8")
            assert report_html.count('data-fcx-report-nav="1"') == 1
            assert 'aria-current="page"' in report_html
            assert "来源链接待补" not in report_html
            assert all(
                f'href="{target}"' in report_html
                for target in report_names
                if target != report_name
            )
        assert all(
            f'href="{target}"' in comparison_deliverable
            for target in (
                "01-capture-report.html",
                "03-authority-report.html",
                "04-final-report.html",
            )
        )
        assert "① 平台表现概览" in report
        assert "② 逐知识点核验明细" in report
        assert "③ 原始答案与参考文献（存证）" in report
        assert "④ 指标口径速查" in report
        assert "⑤ 评测元信息" in report
        assert report.count("② 逐知识点核验明细") == 1
        assert 'data-fcx-locked-role="direct"' in report
        assert 'data-fcx-locked-role="reference"' in report
        assert "② 直接答案逐知识点测评" not in report
        assert "③ 补充参考逐知识点测评" not in report
        assert "② 直接答案逐条判定" not in report
        assert "②-补 补充参考分析" not in report
        assert (run_dir / "comparison.html").exists()
        capture_report = (run_dir / "capture" / "report.html").read_text(encoding="utf-8")
        assert "各方答案汇总（问题：" in capture_report
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
                "schemaVersion": "fact-check-x/capture-recovery@2",
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
        assert "缺少 authority 阶段产物交付记录" in bypass_delivery["error"]

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
        review_final = run(command("finalize-authority", "--run-dir", str(review_run)))
        assert review_final["status"] == "completed"
        assert review_final["stage"] == "authority_completed"
        assert review_final["evidenceGapCount"] == 1
        assert review_final["deliverables"][0]["path"] == str(
            (review_run / "03-authority-report.html").resolve()
        )
        review_authority_report = (
            review_run / "03-authority-report.html"
        ).read_text(encoding="utf-8")
        assert "证据不足项" in review_authority_report
        assert 'href="04-final-report.html"' in review_authority_report
        assert json.loads((review_run / "authority-gate.json").read_text(encoding="utf-8"))["status"] == "finalized"
        review_delivery = run(command("deliver", "--results", str(results), "--run-dir", str(review_run)))
        assert review_delivery["status"] == "completed"
        assert review_delivery["evidenceGapCount"] == 1
        assert (review_run / "04-final-report.html").is_file()
        review_verification = json.loads(
            (review_run / "verification.json").read_text(encoding="utf-8")
        )
        assert review_verification["status"] == "completed"
        assert review_verification["evidenceGapCount"] == 1
        assert review_verification["evidenceGaps"][0]["platform"] == "doubao"

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
                "schemaVersion": "fact-check-x/capture-recovery@2",
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
                "report.stage2_role_sections",
                "report.stage4_single_locked_detail",
                "report.technical_failure_notice",
                "report.renamed_four_stages",
                "authority.finalize_transaction_rollback",
                "comparison.overwide_claim_blocks_authority",
                "path.windows_drive_normalized",
            ],
        }), encoding="utf-8")
    print("PASS Fact-Check-X 统一入口")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
