#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT.parent
if (ROOT / "modules").exists():
    SKILLS = ROOT / "modules"
COMPARE = SKILLS / "fact-check-x-knowledge-compare" / "tests" / "fixtures"
AUTHORITY = SKILLS / "fact-check-x-authoritative-verify" / "tests" / "fixtures"


def command(*arguments: str) -> list[str]:
    return [sys.executable, str(ROOT / "scripts" / "fact_check_x.py"), *arguments]


def run(arguments: list[str], environment: dict[str, str] | None = None) -> dict:
    process = subprocess.run(
        arguments,
        text=True,
        capture_output=True,
        check=False,
        env=environment,
    )
    if process.returncode:
        raise AssertionError(process.stdout or process.stderr)
    return json.loads([line for line in process.stdout.splitlines() if line.strip()][-1])


def run_failed(arguments: list[str]) -> dict:
    process = subprocess.run(
        arguments,
        text=True,
        capture_output=True,
        check=False,
    )
    if process.returncode == 0:
        raise AssertionError("命令应以非零状态拒绝无平台输入")
    return json.loads([line for line in process.stdout.splitlines() if line.strip()][-1])


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")


def complete_pipeline(
    root: Path,
    case_name: str,
    results: dict,
    analysis: dict,
    assessment: dict,
) -> Path:
    run_dir = root / f"{case_name}-run"
    results_path = root / f"{case_name}-results.json"
    analysis_path = root / f"{case_name}-analysis.json"
    write_json(results_path, results)
    write_json(analysis_path, analysis)

    prepared = run(
        command(
            "prepare-comparison",
            "--results",
            str(results_path),
            "--run-dir",
            str(run_dir),
        )
    )
    assert len(prepared["platforms"]) == len(results["platforms"])
    completed = run(
        command(
            "complete-comparison",
            "--results",
            str(results_path),
            "--analysis",
            str(analysis_path),
            "--run-dir",
            str(run_dir),
        )
    )
    assert completed["stage"] == "comparison_completed"
    assert completed["artifacts"]["comparisonAnalysis"] == str(
        (run_dir / "comparison-analysis.json").resolve()
    )
    assert (run_dir / "comparison-analysis.json").is_file()

    keyless = {
        **os.environ,
        "TRUSTED_SEARCH_KEY": "",
        "FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE": str(
            run_dir / "missing-trusted-search-key"
        ),
    }
    run(command("prepare-authority", "--run-dir", str(run_dir)), keyless)
    run(
        command(
            "search-authority",
            "--run-dir",
            str(run_dir),
            "--max-workers",
            "12",
        ),
        keyless,
    )
    assessments = run_dir / "authority" / "assessments"
    assessments.mkdir(parents=True)
    write_json(assessments / "K1.json", assessment)
    run(command("finalize-authority", "--run-dir", str(run_dir)), keyless)
    delivered = run(
        command(
            "deliver",
            "--results",
            str(results_path),
            "--run-dir",
            str(run_dir),
        ),
        keyless,
    )
    assert delivered["status"] == "completed"
    pipeline = json.loads((run_dir / "pipeline.json").read_text(encoding="utf-8"))
    assert pipeline["artifacts"]["comparisonAnalysis"] == str(
        (run_dir / "comparison-analysis.json").resolve()
    )
    assert all(
        (run_dir / name).is_file()
        for name in (
            "01-capture-report.html",
            "02-comparison-report.html",
            "03-authority-report.html",
            "04-final-report.html",
            "05-complete-report-package.zip",
        )
    )
    comparison_deliverable = (run_dir / "02-comparison-report.html").read_text(
        encoding="utf-8"
    )
    assert all(
        f'href="{target}"' in comparison_deliverable
        for target in (
            "01-capture-report.html",
            "03-authority-report.html",
            "04-final-report.html",
        )
    )
    return run_dir


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="fact-check-x-dynamic-platform-") as temp:
        root = Path(temp)
        results_fixture = json.loads(
            (COMPARE / "results.json").read_text(encoding="utf-8")
        )
        analysis_fixture = json.loads(
            (COMPARE / "comparison-analysis.json").read_text(encoding="utf-8")
        )
        assessment_fixture = json.loads(
            (AUTHORITY / "K1-assessment.json").read_text(encoding="utf-8")
        )

        empty_results = json.loads(
            json.dumps(results_fixture, ensure_ascii=False)
        )
        empty_results["platforms"] = []
        empty_results_path = root / "empty-results.json"
        write_json(empty_results_path, empty_results)
        rejected = run_failed(
            command(
                "prepare-comparison",
                "--results",
                str(empty_results_path),
                "--run-dir",
                str(root / "empty-run"),
            )
        )
        assert "至少需要 1 个采集平台" in rejected["error"]

        single_results = json.loads(
            json.dumps(results_fixture, ensure_ascii=False)
        )
        single_results["platforms"] = single_results["platforms"][:1]
        single_analysis = json.loads(
            json.dumps(analysis_fixture, ensure_ascii=False)
        )
        single_point = single_analysis["knowledgePoints"][0]
        single_point["claims"] = {
            "dknowc-chat": single_point["claims"]["dknowc-chat"]
        }
        single_point["comparison"] = {
            "status": "single",
            "summary": "深知晓单平台知识点结构化结果",
        }
        single_analysis["synthesisDraft"] = {
            "status": "unverified",
            "answer": "深知晓给出的综合草案为每人每月最高提取1400元，尚未经过后续权威核验。",
            "basisKnowledgePointIds": ["K1"],
        }
        single_assessment = json.loads(
            json.dumps(assessment_fixture, ensure_ascii=False)
        )
        single_assessment["verdicts"] = {
            "dknowc-chat": single_assessment["verdicts"]["dknowc-chat"]
        }
        single_run = complete_pipeline(
            root,
            "single-platform",
            single_results,
            single_analysis,
            single_assessment,
        )
        single_comparison = json.loads(
            (single_run / "comparison.json").read_text(encoding="utf-8")
        )
        assert [item["platform"] for item in single_comparison["platforms"]] == [
            "dknowc-chat"
        ]
        assert (
            single_comparison["knowledgePoints"][0]["comparison"]["status"]
            == "single"
        )
        single_verification = json.loads(
            (single_run / "verification.json").read_text(encoding="utf-8")
        )
        assert [item["platform"] for item in single_verification["platforms"]] == [
            "dknowc-chat"
        ]
        assert set(
            single_verification["knowledgePoints"][0]["authority"]["verdicts"]
        ) == {"dknowc-chat"}
        for report_name in (
            "02-comparison-report.html",
            "03-authority-report.html",
            "04-final-report.html",
        ):
            report = (single_run / report_name).read_text(encoding="utf-8")
            assert "深知晓" in report
            assert "豆包" not in report
        single_comparison_html = (
            single_run / "02-comparison-report.html"
        ).read_text(encoding="utf-8")
        assert single_comparison_html.count('class="answer-panel"') == 1
        assert "知识点结构化</h1>" in single_comparison_html
        assert "逐知识点结构化结果" in single_comparison_html
        assert "<th>差异</th>" not in single_comparison_html
        assert "跨平台" not in single_comparison_html

        results = json.loads(json.dumps(results_fixture, ensure_ascii=False))
        deepseek = json.loads(json.dumps(results["platforms"][1], ensure_ascii=False))
        deepseek.update(
            {
                "platform": "deepseek",
                "label": "DeepSeek",
                "url": "https://chat.deepseek.com/",
                "answerMarkdown": "每人每月最高提取 2000 元。",
            }
        )
        results["platforms"].append(deepseek)

        analysis = json.loads(
            json.dumps(analysis_fixture, ensure_ascii=False)
        )
        analysis["knowledgePoints"][0]["claims"]["deepseek"] = json.loads(
            json.dumps(
                analysis["knowledgePoints"][0]["claims"]["doubao"],
                ensure_ascii=False,
            )
        )
        assessment = json.loads(
            json.dumps(assessment_fixture, ensure_ascii=False)
        )
        assessment["verdicts"]["deepseek"] = json.loads(
            json.dumps(assessment["verdicts"]["doubao"], ensure_ascii=False)
        )
        run_dir = complete_pipeline(
            root,
            "three-platform",
            results,
            analysis,
            assessment,
        )
        comparison = json.loads(
            (run_dir / "comparison.json").read_text(encoding="utf-8")
        )
        assert [item["platform"] for item in comparison["platforms"]] == [
            "dknowc-chat",
            "doubao",
            "deepseek",
        ]
        comparison_html = (run_dir / "comparison.html").read_text(encoding="utf-8")
        assert comparison_html.count('class="answer-panel"') == 3
        assert "DeepSeek" in comparison_html

        verification = json.loads(
            (run_dir / "verification.json").read_text(encoding="utf-8")
        )
        assert [item["platform"] for item in verification["platforms"]] == [
            "dknowc-chat",
            "doubao",
            "deepseek",
        ]
        final_html = (run_dir / "report.html").read_text(encoding="utf-8")
        authority_html = (run_dir / "03-authority-report.html").read_text(
            encoding="utf-8"
        )
        capture_html = (run_dir / "01-capture-report.html").read_text(
            encoding="utf-8"
        )
        assert "DeepSeek" in final_html
        assert "DeepSeek" in authority_html
        assert (
            'class="shell platform-layout-compact platform-count-3" '
            'style="--platform-count:3"'
        ) in capture_html
        assert "repeat(var(--platform-count), minmax(0, 1fr))" in capture_html
        assert "repeat(3, 500px)" not in capture_html
        assert (
            '<main class="multi-platform platform-layout-compact '
            'platform-count-3" style="--platform-count:3">'
        ) in comparison_html
        assert (
            '<body class="platform-layout-compact platform-count-3" '
            'style="--platform-count:3;'
        ) in final_html
        assert '<div class="kp-scroll"' in final_html
        assert ".platform-layout-dense table.kp" in final_html

    if os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT"):
        Path(os.environ["FACT_CHECK_X_ASSERTIONS_OUTPUT"]).write_text(json.dumps({
            "schemaVersion": "fact-check-x/test-assertions@1",
            "actualAssertionIds": [
                "platform.minimum_one",
                "platform.single_full_pipeline",
                "platform.three_full_pipeline",
                "platform.dynamic_layout",
            ],
        }), encoding="utf-8")
    print("PASS Fact-Check-X N≥1 动态单/多平台完整流水线")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
