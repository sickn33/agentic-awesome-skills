#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT.parent
PIPELINE = ROOT / "scripts" / "fact_check_x.py"
if not PIPELINE.exists():
    PIPELINE = SOURCE_ROOT / "fact-check-x-unified" / "scripts" / "fact_check_x.py"
FIXTURES = ROOT / "tests" / "fixtures"
RESULTS_FIXTURE = FIXTURES / "results.json"
ANALYSIS_FIXTURE = FIXTURES / "comparison-analysis.json"
ASSESSMENT_FIXTURE = FIXTURES / "K1-assessment.json"
if not RESULTS_FIXTURE.exists():
    RESULTS_FIXTURE = SOURCE_ROOT / "fact-check-x-knowledge-compare" / "tests" / "fixtures" / "results.json"
    ANALYSIS_FIXTURE = SOURCE_ROOT / "fact-check-x-knowledge-compare" / "tests" / "fixtures" / "comparison-analysis.json"
    ASSESSMENT_FIXTURE = SOURCE_ROOT / "fact-check-x-authoritative-verify" / "tests" / "fixtures" / "K1-assessment.json"


def run(*arguments: str, environment: dict[str, str] | None = None) -> dict:
    process = subprocess.run(
        [sys.executable, str(PIPELINE), *arguments],
        text=True,
        capture_output=True,
        check=False,
        env=environment,
    )
    if process.returncode:
        raise RuntimeError(process.stdout.strip() or process.stderr.strip())
    lines = [line for line in process.stdout.splitlines() if line.strip()]
    return json.loads(lines[-1]) if lines else {"status": "completed"}


def run_blocked(*arguments: str, environment: dict[str, str] | None = None) -> dict:
    process = subprocess.run(
        [sys.executable, str(PIPELINE), *arguments],
        text=True,
        capture_output=True,
        check=False,
        env=environment,
    )
    if process.returncode == 0:
        raise RuntimeError("命令应被配置门禁阻止")
    lines = [line for line in process.stdout.splitlines() if line.strip()]
    return json.loads(lines[-1])


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="执行 Fact-Check-X WorkBuddy 完整离线验收。")
    parser.add_argument("--run-dir", required=True)
    args = parser.parse_args()

    run_dir = Path(args.run_dir).expanduser().resolve()
    if run_dir.exists() and any(run_dir.iterdir()):
        raise SystemExit("验收目录必须为空；禁止覆盖真实运行证据或复用旧验收目录")
    run_dir.mkdir(parents=True, exist_ok=True)
    results = RESULTS_FIXTURE

    located = run("locate")
    capture_stage = run("prepare-comparison", "--results", str(results), "--run-dir", str(run_dir))
    shutil.copyfile(ANALYSIS_FIXTURE, run_dir / "comparison-analysis.json")
    comparison_stage = run("complete-comparison", "--results", str(results), "--run-dir", str(run_dir))
    run("prepare-authority", "--run-dir", str(run_dir))
    searched = run("search-authority", "--run-dir", str(run_dir), "--max-workers", "12")

    assessments = run_dir / "authority" / "assessments"
    assessments.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ASSESSMENT_FIXTURE, assessments / "K1.json")
    run("finalize-authority", "--run-dir", str(run_dir))
    delivered = run("deliver", "--results", str(results), "--run-dir", str(run_dir))

    with tempfile.TemporaryDirectory(prefix="fact-check-x-key-gate-") as gate_temp:
        gate_run = Path(gate_temp) / "run"
        run("prepare-comparison", "--results", str(results), "--run-dir", str(gate_run))
        gate_analysis = load(ANALYSIS_FIXTURE)
        gate_analysis["knowledgePoints"][0]["trustedAnchor"] = {"eligible": False}
        gate_analysis["knowledgePoints"][0]["claims"]["dknowc-chat"] = {
            "covered": False,
            "claim": "",
            "answerExcerpt": "",
            "citedReferenceIndexes": [],
            "answerLevelReferenceIndexes": [],
            "faithfulness": "insufficient",
            "reason": "",
            "evidence": [],
        }
        (gate_run / "comparison-analysis.json").write_text(
            json.dumps(gate_analysis, ensure_ascii=False),
            encoding="utf-8",
        )
        run("complete-comparison", "--results", str(results), "--run-dir", str(gate_run))
        keyless_environment = {
            **os.environ,
            "TRUSTED_SEARCH_KEY": "",
            "FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE": str(
                Path(gate_temp) / "missing-trusted-search-key"
            ),
        }
        configuration_gate = run_blocked(
            "prepare-authority",
            "--run-dir",
            str(gate_run),
            environment=keyless_environment,
        )
        search_gate = run_blocked(
            "search-authority",
            "--run-dir",
            str(gate_run),
            environment=keyless_environment,
        )

    comparison = load(run_dir / "comparison.json")
    verification = load(run_dir / "verification.json")
    pipeline = load(run_dir / "pipeline.json")
    report_package = run_dir / "05-complete-report-package.zip"
    workbuddy_instructions = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    with zipfile.ZipFile(report_package) as archive:
        package_names = set(archive.namelist())
        packaged_comparison = archive.read("fact-check-x-report/02-comparison-report.html")
        packaged_authority = archive.read("fact-check-x-report/03-authority-report.html")
        package_has_host_path = any(
            str(run_dir).encode("utf-8") in archive.read(name)
            for name in package_names
            if not name.endswith("/")
        )
    point = verification["knowledgePoints"][0]
    verdicts = point["authority"]["verdicts"]

    checks = {
        "modulesLocated": set(located.get("skills") or {}) == {"collector", "comparison", "authority"},
        "oneKnowledgePoint": len(comparison.get("knowledgePoints") or []) == 1,
        "conflictDetected": point["comparison"]["status"] == "conflict",
        "noTrustedSearchRequest": searched.get("trustedSearchRequestCount") == 0,
        "dknowExempt": searched.get("dknowExemptCount") == 1,
        "dknowDirectAccurate": verdicts["dknowc-chat"]["category"] == "direct_accurate",
        "doubaoMisleading": verdicts["doubao"]["category"] == "misleading",
        "pipelineVersion": pipeline.get("schemaVersion") == "fact-check-x/pipeline@2",
        "captureGate": (run_dir / "capture-gate.json").exists(),
        "comparisonReport": (run_dir / "comparison.html").exists(),
        "rawResultsArchive": (run_dir / "capture" / "results.json").exists(),
        "answerReferenceReport": (run_dir / "capture" / "report.html").exists(),
        "answerReferenceMarkdown": (run_dir / "capture" / "report.md").exists(),
        "finalReport": (run_dir / "report.html").exists(),
        "captureDeliverable": (run_dir / "01-capture-report.html").exists()
        and capture_stage.get("deliverables", [{}])[0].get("path") == str((run_dir / "01-capture-report.html").resolve()),
        "captureDeliverableEvidenceLinks": all(
            (run_dir / "artifacts" / platform["platform"] / name).is_file()
            for platform in load(run_dir / "capture/results.json").get("platforms") or []
            for name in ("screenshot.png", "page.html")
            if (platform.get("artifacts") or {}).get(
                "screenshot" if name == "screenshot.png" else "html"
            )
        ),
        "comparisonDeliverable": (run_dir / "02-comparison-report.html").exists()
        and comparison_stage.get("deliverables", [{}])[0].get("path") == str((run_dir / "02-comparison-report.html").resolve()),
        "comparisonAnalysisArchived": (
            comparison_stage.get("artifacts", {}).get("comparisonAnalysis")
            == str((run_dir / "comparison-analysis.json").resolve())
            and delivered.get("artifacts", {}).get("comparisonAnalysis")
            == str((run_dir / "comparison-analysis.json").resolve())
            and (run_dir / "comparison-analysis.json").is_file()
        ),
        "authorityDeliverable": (run_dir / "03-authority-report.html").exists()
        and delivered.get("deliverables", [{}, {}, {}])[2].get("path") == str((run_dir / "03-authority-report.html").resolve()),
        "finalDeliverable": (run_dir / "04-final-report.html").exists()
        and delivered.get("deliverables", [{}, {}, {}, {}])[3].get("path") == str((run_dir / "04-final-report.html").resolve()),
        "portableReportPackage": report_package.exists()
        and delivered.get("deliverables", [{}, {}, {}, {}, {}])[4].get("path") == str(report_package.resolve())
        and delivered.get("deliverables", [{}, {}, {}, {}, {}])[4].get("portable") is True,
        "portablePackageReports": {
            "fact-check-x-report/01-capture-report.html",
            "fact-check-x-report/02-comparison-report.html",
            "fact-check-x-report/03-authority-report.html",
            "fact-check-x-report/04-final-report.html",
            "fact-check-x-report/data/pipeline.json",
        }.issubset(package_names),
        "portablePackageNavigation": b'href="01-capture-report.html"' in packaged_comparison
        and b'href="03-authority-report.html"' in packaged_comparison
        and b'href="04-final-report.html"' in packaged_comparison
        and b'href="01-capture-report.html"' in packaged_authority
        and b'href="02-comparison-report.html"' in packaged_authority
        and b'href="04-final-report.html"' in packaged_authority,
        "comparisonDeliverableNavigation": all(
            target in (run_dir / "02-comparison-report.html").read_text(encoding="utf-8")
            for target in (
                'href="01-capture-report.html"',
                'href="03-authority-report.html"',
                'href="04-final-report.html"',
            )
        ),
        "portablePackageNoHostPath": not package_has_host_path,
        "captureStageIndexed": capture_stage.get("stage") == "capture_completed"
        and capture_stage.get("artifacts", {}).get("answerReferenceReport") == str((run_dir / "capture" / "report.html").resolve()),
        "comparisonStageIndexed": comparison_stage.get("stage") == "comparison_completed"
        and comparison_stage.get("artifacts", {}).get("comparisonReport") == str((run_dir / "comparison.html").resolve()),
        "allStagesDelivered": delivered.get("answerReferenceReport") == str((run_dir / "capture" / "report.html").resolve())
        and delivered.get("comparisonReport") == str((run_dir / "comparison.html").resolve())
        and delivered.get("artifacts", {}).get("authorityReport") == str((run_dir / "03-authority-report.html").resolve())
        and delivered.get("artifacts", {}).get("report") == str((run_dir / "report.html").resolve()),
        "pipelineCompleted": pipeline.get("status") == "completed" and delivered.get("status") == "completed",
        "authorityGateFinalized": load(run_dir / "authority-gate.json").get("status") == "finalized",
        "trustedSearchConfigurationPrompt": configuration_gate.get("status") == "configuration_required"
        and configuration_gate.get("action") == "configure_trusted_search"
        and "您只需完成登录" in configuration_gate.get("userPrompt", "")
        and configuration_gate.get("configuration", {}).get("interaction")
        == "browser_login_only"
        and configuration_gate.get("configuration", {}).get("requiresChatSecret")
        is False
        and configuration_gate.get("configuration", {}).get("sharedAcrossCarriers")
        is True,
        "trustedSearchHardGate": search_gate.get("status") == "configuration_required"
        and search_gate.get("action") == "configure_trusted_search",
        "anchorSemanticEquivalencePolicy": all(
            phrase in workbuddy_instructions
            for phrase in (
                "`trustedAnchor.officialAnswer` 是当前知识点的权威结论",
                "必须裁决为 `supported`",
                "知识点对比阶段的引用忠实性和本阶段的事实正确性必须分别保留",
            )
        ),
        "atomicMaterialAdditionPolicy": all(
            phrase in workbuddy_instructions
            for phrase in (
                "原子性必须落实到每个平台的 `claim`",
                "仅个别平台增加的实质事实也要单独成点",
                "超出该变量的主张必须成为无锚点知识点",
            )
        ),
    }
    failed = [name for name, passed in checks.items() if not passed]
    summary = {
        "status": "passed" if not failed else "failed",
        "runDir": str(run_dir),
        "checks": checks,
        "trustedSearchRequestCount": delivered.get("trustedSearchRequestCount"),
        "dknowExemptCount": delivered.get("dknowExemptCount"),
        "comparisonReport": str(run_dir / "comparison.html"),
        "answerReferenceReport": str(run_dir / "capture" / "report.html"),
        "finalReport": str(run_dir / "report.html"),
        "artifacts": delivered.get("artifacts") or {},
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
