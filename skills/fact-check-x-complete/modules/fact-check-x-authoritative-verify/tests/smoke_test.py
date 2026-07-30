#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures"
sys.path.insert(0, str(ROOT / "scripts"))
from authority_verify import trusted_search, trusted_search_timeout_seconds


def run(arguments: list[str]) -> None:
    proc = subprocess.run(arguments, text=True, capture_output=True, check=False)
    if proc.returncode:
        raise AssertionError(proc.stdout or proc.stderr)


def run_failed(arguments: list[str], environment: dict[str, str] | None = None) -> dict:
    proc = subprocess.run(arguments, text=True, capture_output=True, check=False, env=environment)
    if proc.returncode == 0:
        raise AssertionError("命令应拒绝无效裁决文件")
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    return json.loads(lines[-1])


def main() -> int:
    previous_timeout = os.environ.get("FACTCHECK_TRUSTED_SEARCH_TIMEOUT_SECONDS")
    os.environ["FACTCHECK_TRUSTED_SEARCH_TIMEOUT_SECONDS"] = "120"
    assert trusted_search_timeout_seconds() == 120.0
    os.environ["FACTCHECK_TRUSTED_SEARCH_TIMEOUT_SECONDS"] = "invalid"
    assert trusted_search_timeout_seconds() == 90.0
    if previous_timeout is None:
        os.environ.pop("FACTCHECK_TRUSTED_SEARCH_TIMEOUT_SECONDS", None)
    else:
        os.environ["FACTCHECK_TRUSTED_SEARCH_TIMEOUT_SECONDS"] = previous_timeout

    previous_key = os.environ.get("TRUSTED_SEARCH_KEY")
    os.environ["TRUSTED_SEARCH_KEY"] = "test-key"
    try:
        with patch(
            "authority_verify.urllib.request.urlopen",
            side_effect=OSError("The read operation timed out"),
        ):
            timeout_result = trusted_search("测试读取超时", "", 1)
        assert timeout_result["status"] == "service_error"
        assert "timed out" in timeout_result["error"]
    finally:
        if previous_key is None:
            os.environ.pop("TRUSTED_SEARCH_KEY", None)
        else:
            os.environ["TRUSTED_SEARCH_KEY"] = previous_key

    with tempfile.TemporaryDirectory(prefix="fact-check-authority-") as temp:
        out = Path(temp)
        k1_evidence = out / "K1-evidence.json"
        k1_result = out / "K1-result.json"
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "search", "--request", str(FIXTURES / "K1-request.json"), "--output", str(k1_evidence)])
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize", "--request", str(FIXTURES / "K1-request.json"), "--evidence", str(k1_evidence), "--assessment", str(FIXTURES / "K1-assessment.json"), "--output", str(k1_result)])
        k1 = json.loads(k1_result.read_text(encoding="utf-8"))
        assert k1["searchMode"] == "dknow_exempt" and k1["requestCount"] == 0
        assert k1["verdicts"]["dknowc-chat"]["category"] == "direct_accurate"
        assert k1["verdicts"]["doubao"]["category"] == "misleading"

        equivalent_request = json.loads(
            (FIXTURES / "K1-request.json").read_text(encoding="utf-8")
        )
        equivalent_request["claims"]["doubao"]["claim"] = (
            "广州按免租赁合同情形核定的月度提取上限为一千四百元。"
        )
        equivalent_request_path = out / "K1-equivalent-request.json"
        equivalent_request_path.write_text(
            json.dumps(equivalent_request, ensure_ascii=False),
            encoding="utf-8",
        )
        equivalent_evidence_path = out / "K1-equivalent-evidence.json"
        run([
            sys.executable,
            str(ROOT / "scripts" / "authority_verify.py"),
            "search",
            "--request",
            str(equivalent_request_path),
            "--output",
            str(equivalent_evidence_path),
        ])
        equivalent_assessment = json.loads(
            (FIXTURES / "K1-assessment.json").read_text(encoding="utf-8")
        )
        equivalent_assessment["verdicts"]["doubao"] = {
            "verdict": "supported",
            "reason": "该表达与可信锚点的月度上限结论语义等价。",
            "evidenceIds": ["A1"],
        }
        equivalent_assessment_path = out / "K1-equivalent-assessment.json"
        equivalent_assessment_path.write_text(
            json.dumps(equivalent_assessment, ensure_ascii=False),
            encoding="utf-8",
        )
        equivalent_result_path = out / "K1-equivalent-result.json"
        run([
            sys.executable,
            str(ROOT / "scripts" / "authority_verify.py"),
            "finalize",
            "--request",
            str(equivalent_request_path),
            "--evidence",
            str(equivalent_evidence_path),
            "--assessment",
            str(equivalent_assessment_path),
            "--output",
            str(equivalent_result_path),
        ])
        equivalent_result = json.loads(
            equivalent_result_path.read_text(encoding="utf-8")
        )
        assert equivalent_result["verdicts"]["doubao"]["verdict"] == "supported"

        contradicted_anchor_assessment = json.loads(
            (FIXTURES / "K1-assessment.json").read_text(encoding="utf-8")
        )
        contradicted_anchor_assessment["verdicts"]["dknowc-chat"]["verdict"] = "contradicted"
        contradicted_anchor_path = out / "K1-contradicted-anchor-assessment.json"
        contradicted_anchor_path.write_text(
            json.dumps(contradicted_anchor_assessment, ensure_ascii=False),
            encoding="utf-8",
        )
        rejected_anchor = run_failed([
            sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize",
            "--request", str(FIXTURES / "K1-request.json"),
            "--evidence", str(k1_evidence),
            "--assessment", str(contradicted_anchor_path),
            "--output", str(out / "K1-contradicted-anchor-result.json"),
        ])
        assert "必须裁决为 supported" in rejected_anchor["error"]

        invalid_anchor_request = json.loads(
            (FIXTURES / "K1-request.json").read_text(encoding="utf-8")
        )
        invalid_anchor_request["trustedAnchor"]["evidence"] = []
        invalid_anchor_request_path = out / "K1-invalid-anchor-request.json"
        invalid_anchor_request_path.write_text(
            json.dumps(invalid_anchor_request, ensure_ascii=False),
            encoding="utf-8",
        )
        invalid_anchor_evidence = out / "K1-invalid-anchor-evidence.json"
        run([
            sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "search",
            "--request", str(invalid_anchor_request_path),
            "--fixture", str(FIXTURES / "K2-evidence-fixture.json"),
            "--output", str(invalid_anchor_evidence),
        ])
        invalid_anchor_search = json.loads(invalid_anchor_evidence.read_text(encoding="utf-8"))
        assert invalid_anchor_search["searchMode"] == "trusted_search"
        assert invalid_anchor_search["requestCount"] == 1

        captured_external_request = json.loads(
            (FIXTURES / "K1-request.json").read_text(encoding="utf-8")
        )
        captured_external_item = captured_external_request["trustedAnchor"][
            "evidence"
        ][0]
        for key in (
            "contentAcquisition",
            "sameMaterialVerified",
            "originAttributionStatus",
        ):
            captured_external_item.pop(key, None)
        captured_external_item["platformTrustSource"] = "dknow_reference_capture"
        captured_external_path = out / "K1-captured-external-request.json"
        captured_external_path.write_text(
            json.dumps(captured_external_request, ensure_ascii=False),
            encoding="utf-8",
        )
        captured_external_evidence = out / "K1-captured-external-evidence.json"
        run([
            sys.executable,
            str(ROOT / "scripts" / "authority_verify.py"),
            "search",
            "--request",
            str(captured_external_path),
            "--output",
            str(captured_external_evidence),
        ])
        captured_external_search = json.loads(
            captured_external_evidence.read_text(encoding="utf-8")
        )
        assert captured_external_search["searchMode"] == "dknow_exempt"
        assert captured_external_search["requestCount"] == 0

        for case_name, excerpt in (
            ("missing-provenance", "每人每月最高提取额度为1400元。"),
            ("forged-internal", "每人每月最高提取额度为1400元。"),
            ("unrelated", "本服务支持线上办理和进度查询。"),
            ("same-number-unrelated", "2024年全市共办理其他业务1400件。"),
            ("contradicted", "每人每月最高提取额度不是1400元，而是2000元。"),
        ):
            forged_anchor_request = json.loads(
                (FIXTURES / "K1-request.json").read_text(encoding="utf-8")
            )
            anchor_item = forged_anchor_request["trustedAnchor"]["evidence"][0]
            anchor_item["excerpt"] = excerpt
            if case_name == "missing-provenance":
                for key in (
                    "contentAcquisition",
                    "sameMaterialVerified",
                    "originAttributionStatus",
                ):
                    anchor_item.pop(key, None)
            if case_name == "forged-internal":
                anchor_item["url"] = (
                    "https://yun.dknowc.cn/wlcb/ShenZhi-policy/"
                    "#/policyDetails?id=4973195"
                )
                for key in (
                    "contentAcquisition",
                    "sameMaterialVerified",
                    "originAttributionStatus",
                    "platformTrustSource",
                ):
                    anchor_item.pop(key, None)
            forged_anchor_path = out / f"K1-{case_name}-anchor-request.json"
            forged_anchor_path.write_text(
                json.dumps(forged_anchor_request, ensure_ascii=False),
                encoding="utf-8",
            )
            forged_anchor_evidence = out / f"K1-{case_name}-anchor-evidence.json"
            run([
                sys.executable,
                str(ROOT / "scripts" / "authority_verify.py"),
                "search",
                "--request",
                str(forged_anchor_path),
                "--fixture",
                str(FIXTURES / "K2-evidence-fixture.json"),
                "--output",
                str(forged_anchor_evidence),
            ])
            forged_search = json.loads(
                forged_anchor_evidence.read_text(encoding="utf-8")
            )
            assert forged_search["searchMode"] == "trusted_search"
            assert forged_search["requestCount"] == 1

        contradictory_evidence = json.loads(k1_evidence.read_text(encoding="utf-8"))
        contradictory_evidence["evidence"][0]["body"] = (
            "每人每月最高提取额度不是1400元，而是2000元。"
        )
        contradictory_evidence_path = out / "K1-contradictory-evidence.json"
        contradictory_evidence_path.write_text(
            json.dumps(contradictory_evidence, ensure_ascii=False), encoding="utf-8"
        )
        rejected_semantic_support = run_failed([
            sys.executable,
            str(ROOT / "scripts" / "authority_verify.py"),
            "finalize",
            "--request",
            str(FIXTURES / "K1-request.json"),
            "--evidence",
            str(contradictory_evidence_path),
            "--assessment",
            str(FIXTURES / "K1-assessment.json"),
            "--output",
            str(out / "K1-contradictory-result.json"),
        ])
        assert "证据包与可信锚点不一致" in rejected_semantic_support["error"]

        results = {
            "schemaVersion": "1",
            "question": "广州无合同租房提取住房公积金每月最高多少？",
            "platforms": [
                {"platform": "dknowc-chat", "label": "深知晓", "status": "success", "answerMarkdown": "每月最高1400元。[1]", "references": [{"title": "广州住房公积金官方规则", "url": "https://gjj.gz.gov.cn/example", "marker": "1", "snippet": "每人每月最高提取额度为1400元。"}]},
                {"platform": "doubao", "label": "豆包", "status": "success", "answerMarkdown": "每月最高2000元。", "references": [{"title": "租房提取介绍", "url": "https://example.com/article", "snippet": "每月2000元"}]},
            ],
        }
        results["platforms"][0]["references"].extend([
            {
                "title": "内部可信库条目",
                "url": "https://yun.dknowc.cn/wlcb/ShenZhi-policy/#/policyDetails?id=1",
                "marker": "2",
                "snippet": "只有内部库链接。",
            },
            {
                "title": "内部库官方原件",
                "url": "https://yun.dknowc.cn/wlcb/ShenZhi-policy/#/policyDetails?id=2",
                "marker": "3",
                "snippet": "带官网回链。",
                "resourceUrl": "https://gjj.gz.gov.cn/official/2",
            },
        ])
        comparison = {
            "schemaVersion": "fact-check-x/comparison@1",
            "question": results["question"],
            "coreQuestion": "广州无合同租房提取月上限",
            "platforms": [{"platform": "dknowc-chat", "label": "深知晓"}, {"platform": "doubao", "label": "豆包"}],
            "knowledgePoints": [{"id": "K1", "description": "广州无合同租房提取每人每月最高额度", "role": "direct", "core": True, "claims": json.loads((FIXTURES / "K1-request.json").read_text(encoding="utf-8"))["claims"], "comparison": {"status": "conflict", "summary": "1400元与2000元冲突"}, "trustedAnchor": json.loads((FIXTURES / "K1-request.json").read_text(encoding="utf-8"))["trustedAnchor"]}],
            "needsReview": [],
        }
        verification = {
            "schemaVersion": "fact-check-x/verification@2",
            "question": results["question"],
            "platforms": comparison["platforms"],
            "knowledgePoints": [
                {**comparison["knowledgePoints"][0], "authority": k1}
            ],
            "finalAnswer": {
                "status": "verified",
                "answer": k1["authoritativeFinding"],
                "knowledgePointIds": ["K1"],
            },
            "needsReview": [],
            "status": "completed",
        }
        results_path = out / "results.json"
        comparison_path = out / "comparison.json"
        verification_path = out / "verification.json"
        results_path.write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")
        comparison_path.write_text(json.dumps(comparison, ensure_ascii=False), encoding="utf-8")
        verification_path.write_text(json.dumps(verification, ensure_ascii=False), encoding="utf-8")
        authority_report = out / "权威证据核验报告.html"
        run([
            sys.executable,
            str(ROOT / "scripts" / "render_authority_report.py"),
            "--verification",
            str(verification_path),
            "--output",
            str(authority_report),
        ])
        authority_html = authority_report.read_text(encoding="utf-8")
        assert "权威证据核验报告" in authority_html
        assert "深知晓" in authority_html and "豆包" in authority_html
        assert "data-fcx-authority-binding-sha256" in authority_html
        assert k1["authoritativeFinding"] in authority_html
        assert k1["verdicts"]["doubao"]["reason"] in authority_html
        report = out / "事实核查报告.html"
        run([sys.executable, str(ROOT / "scripts" / "render_final_report.py"), "--results", str(results_path), "--comparison", str(comparison_path), "--verification", str(verification_path), "--output", str(report)])
        report_html = report.read_text(encoding="utf-8")
        baseline_html = (ROOT / "references" / "final-report-baseline.html").read_text(encoding="utf-8")
        for heading in ("① 参考性", "② 直接答案逐条判定", "②-补 补充参考分析", "③ 关键发现", "④ 原始答案与参考文献（存证）", "⑤ 指标口径速查", "⑥ 评测元信息"):
            assert heading in baseline_html and heading in report_html
        assert "https://gjj.gz.gov.cn/example" in report_html
        assert "官方原站" in report_html
        assert "官方来源" in report_html
        assert "由深知可信搜索收录" in report_html
        assert "可信库来源" not in report_html
        assert "DT库·gov一手收录" not in report_html
        assert 'class="kpi-grid"' in report_html
        assert ">覆盖率<" in report_html and ">准确率<" in report_html and ">幻觉率<" in report_html
        assert "溯源方式：未建立溯源" in report_html
        assert "局部角标绑定" not in report_html
        assert "平台声明全局来源" not in report_html
        assert "@media(max-width:720px)" in report_html
        assert 'class="platform-layout-compact platform-count-2"' in report_html
        assert "--platform-count:2;--kp-min-width:860px" in report_html
        assert 'class="kp-scroll"' in report_html
        assert ".kp-scroll{max-width:100%;overflow-x:auto" in report_html
        assert ".kc{width:auto" in report_html
        assert "各平台 AI 的完整原答案" in report_html
        assert ("claude" + "-opus") not in report_html and ("FACTCHECK" + "_MODEL") not in report_html

        long_anchor_verification = json.loads(
            json.dumps(verification, ensure_ascii=False)
        )
        long_anchor_point = long_anchor_verification["knowledgePoints"][0]
        long_anchor_body = "权威材料正文。" * 30 + "家庭提取额度上限提高至5600元/月。"
        long_anchor_point["trustedAnchor"]["evidence"][0]["excerpt"] = long_anchor_body
        long_anchor_authority = long_anchor_point["authority"]
        long_anchor_authority["evidence"][0]["body"] = long_anchor_body
        long_anchor_point["claims"]["doubao"] = {
            "covered": False,
            "claim": "",
            "answerExcerpt": "",
            "citedReferenceIndexes": [],
            "answerLevelReferenceIndexes": [],
            "referenceBinding": "none",
            "sourceLevel": "none",
            "faithfulness": "insufficient",
            "reason": "",
            "evidence": [],
        }
        long_anchor_authority["claims"]["doubao"] = json.loads(
            json.dumps(long_anchor_point["claims"]["doubao"], ensure_ascii=False)
        )
        long_anchor_authority["verdicts"]["doubao"] = {
            "verdict": "omitted",
            "category": "omitted",
            "reason": "该平台未覆盖此知识点。",
            "evidenceIds": [],
        }
        long_anchor_path = out / "long-anchor-verification.json"
        long_anchor_path.write_text(
            json.dumps(long_anchor_verification, ensure_ascii=False),
            encoding="utf-8",
        )
        long_anchor_report = out / "long-anchor-report.html"
        run([
            sys.executable,
            str(ROOT / "scripts" / "render_final_report.py"),
            "--results",
            str(results_path),
            "--comparison",
            str(comparison_path),
            "--verification",
            str(long_anchor_path),
            "--output",
            str(long_anchor_report),
        ])
        long_anchor_html = long_anchor_report.read_text(encoding="utf-8")
        assert long_anchor_body in long_anchor_html
        assert "该平台未覆盖此知识点。" in long_anchor_html

        reference_anchor_verification = json.loads(
            json.dumps(long_anchor_verification, ensure_ascii=False)
        )
        reference_anchor_verification["knowledgePoints"][0]["role"] = "reference"
        reference_anchor_verification["knowledgePoints"][0]["core"] = False
        reference_anchor_path = out / "reference-anchor-verification.json"
        reference_anchor_path.write_text(
            json.dumps(reference_anchor_verification, ensure_ascii=False),
            encoding="utf-8",
        )
        reference_anchor_report = out / "reference-anchor-report.html"
        run([
            sys.executable,
            str(ROOT / "scripts" / "render_final_report.py"),
            "--results",
            str(results_path),
            "--comparison",
            str(comparison_path),
            "--verification",
            str(reference_anchor_path),
            "--output",
            str(reference_anchor_report),
        ])
        reference_anchor_html = reference_anchor_report.read_text(encoding="utf-8")
        assert "官方依据原文" in reference_anchor_html
        assert long_anchor_body in reference_anchor_html

        fabricated_verification = json.loads(json.dumps(verification, ensure_ascii=False))
        fabricated_authority = fabricated_verification["knowledgePoints"][0]["authority"]
        fabricated_authority["searchStatus"] = "no_evidence"
        fabricated_authority["evidence"] = []
        for verdict in fabricated_authority["verdicts"].values():
            verdict["category"] = "fabricated"
            verdict["evidenceIds"] = []
            verdict["reason"] = "官方查无"
        fabricated_path = out / "fabricated-verification.json"
        fabricated_path.write_text(json.dumps(fabricated_verification, ensure_ascii=False), encoding="utf-8")
        fabricated_report = out / "fabricated-report.html"
        run([sys.executable, str(ROOT / "scripts" / "render_final_report.py"), "--results", str(results_path), "--comparison", str(comparison_path), "--verification", str(fabricated_path), "--output", str(fabricated_report)])
        fabricated_html = fabricated_report.read_text(encoding="utf-8")
        assert 'class="fabricated-alert"' in fabricated_html
        assert "高风险告警：检出编造" in fabricated_html

        evidence_mapping_verification = json.loads(json.dumps(verification, ensure_ascii=False))
        mapped_authority = evidence_mapping_verification["knowledgePoints"][0]["authority"]
        mapped_authority["evidence"] = [
            {"id": "E1", "title": "无关材料", "url": "https://example.gov.cn/unrelated", "body": "无关正文"},
            {"id": "E4", "title": "对应材料", "url": "https://example.gov.cn/matched", "body": "支持当前知识点的正文"},
        ]
        for verdict in mapped_authority["verdicts"].values():
            verdict["evidenceIds"] = ["E4"]
        evidence_mapping_path = out / "evidence-mapping-verification.json"
        evidence_mapping_path.write_text(json.dumps(evidence_mapping_verification, ensure_ascii=False), encoding="utf-8")
        evidence_mapping_report = out / "evidence-mapping-report.html"
        run([sys.executable, str(ROOT / "scripts" / "render_final_report.py"), "--results", str(results_path), "--comparison", str(comparison_path), "--verification", str(evidence_mapping_path), "--output", str(evidence_mapping_report)])
        evidence_mapping_html = evidence_mapping_report.read_text(encoding="utf-8")
        assert "https://example.gov.cn/matched" in evidence_mapping_html
        assert "支持当前知识点的正文" in evidence_mapping_html
        assert "https://example.gov.cn/unrelated" not in evidence_mapping_html

        k2_evidence = out / "K2-evidence.json"
        k2_result = out / "K2-result.json"
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "search", "--request", str(FIXTURES / "K2-request.json"), "--fixture", str(FIXTURES / "K2-evidence-fixture.json"), "--output", str(k2_evidence)])
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize", "--request", str(FIXTURES / "K2-request.json"), "--evidence", str(k2_evidence), "--assessment", str(FIXTURES / "K2-assessment.json"), "--output", str(k2_result)])
        k2 = json.loads(k2_result.read_text(encoding="utf-8"))
        assert k2["searchMode"] == "trusted_search" and k2["requestCount"] == 1
        assert all(item["category"] == "direct_accurate" for item in k2["verdicts"].values())

        boundary_request = json.loads((FIXTURES / "K2-request.json").read_text(encoding="utf-8"))
        boundary_request["claims"]["doubao"]["sourceLevel"] = "nonofficial"
        boundary_request_path = out / "K2-boundary-request.json"
        boundary_request_path.write_text(json.dumps(boundary_request, ensure_ascii=False), encoding="utf-8")
        boundary_result = out / "K2-boundary-result.json"
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize", "--request", str(boundary_request_path), "--evidence", str(k2_evidence), "--assessment", str(FIXTURES / "K2-assessment.json"), "--output", str(boundary_result)])
        boundary = json.loads(boundary_result.read_text(encoding="utf-8"))
        assert boundary["verdicts"]["doubao"]["category"] == "indirect_accurate"
        assert boundary["verdicts"]["dknowc-chat"]["category"] == "direct_accurate"

        unrelated_assessment = json.loads(
            (FIXTURES / "K2-assessment.json").read_text(encoding="utf-8")
        )
        unrelated_assessment["verdicts"]["doubao"]["verdict"] = "supported"
        unrelated_assessment["verdicts"]["doubao"]["evidenceIds"] = ["E1"]
        unrelated_evidence = json.loads(k2_evidence.read_text(encoding="utf-8"))
        unrelated_evidence["evidence"][0]["body"] = "这是一段与当前主张完全无关的材料。"
        unrelated_evidence_path = out / "K2-unrelated-evidence.json"
        unrelated_evidence_path.write_text(
            json.dumps(unrelated_evidence, ensure_ascii=False),
            encoding="utf-8",
        )
        unrelated_assessment_path = out / "K2-unrelated-assessment.json"
        unrelated_assessment_path.write_text(
            json.dumps(unrelated_assessment, ensure_ascii=False),
            encoding="utf-8",
        )
        rejected_unrelated = run_failed([
            sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize",
            "--request", str(boundary_request_path),
            "--evidence", str(unrelated_evidence_path),
            "--assessment", str(unrelated_assessment_path),
            "--output", str(out / "K2-unrelated-result.json"),
        ])
        assert "无法定位当前主张" in rejected_unrelated["error"]

        dknow_official_request = json.loads(json.dumps(boundary_request, ensure_ascii=False))
        dknow_official_request["claims"]["dknowc-chat"]["sourceLevel"] = "dknow_trusted_search_official"
        dknow_official_request_path = out / "K2-dknow-official-request.json"
        dknow_official_request_path.write_text(json.dumps(dknow_official_request, ensure_ascii=False), encoding="utf-8")
        dknow_official_result = out / "K2-dknow-official-result.json"
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize", "--request", str(dknow_official_request_path), "--evidence", str(k2_evidence), "--assessment", str(FIXTURES / "K2-assessment.json"), "--output", str(dknow_official_result)])
        dknow_official = json.loads(dknow_official_result.read_text(encoding="utf-8"))
        assert dknow_official["verdicts"]["dknowc-chat"]["category"] == "direct_accurate"

        invalid_assessment = out / "K2-invalid-assessment.json"
        invalid_assessment.write_text(json.dumps({
            "schemaVersion": "1",
            "requestId": "K2",
            "verdict": "supported",
            "officialAnswer": "官方结论",
            "platformAssessment": {
                "dknowc-chat": {"verdict": "supported", "reason": "旧结构"},
                "doubao": {"verdict": "supported", "reason": "旧结构"},
            },
        }, ensure_ascii=False), encoding="utf-8")
        invalid_result = out / "K2-invalid-result.json"
        rejected = run_failed([
            sys.executable,
            str(ROOT / "scripts" / "authority_verify.py"),
            "finalize",
            "--request",
            str(FIXTURES / "K2-request.json"),
            "--evidence",
            str(k2_evidence),
            "--assessment",
            str(invalid_assessment),
            "--output",
            str(invalid_result),
        ])
        assert rejected["status"] == "failed"
        assert "裁决文件结构错误" in rejected["error"]
        assert not invalid_result.exists()

        no_evidence_fixture = out / "none.json"
        no_evidence_fixture.write_text("[]\n", encoding="utf-8")
        no_evidence = out / "K2-none.json"
        no_evidence_result = out / "K2-none-result.json"
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "search", "--request", str(FIXTURES / "K2-request.json"), "--fixture", str(no_evidence_fixture), "--output", str(no_evidence)])
        run([sys.executable, str(ROOT / "scripts" / "authority_verify.py"), "finalize", "--request", str(FIXTURES / "K2-request.json"), "--evidence", str(no_evidence), "--output", str(no_evidence_result)])
        none = json.loads(no_evidence_result.read_text(encoding="utf-8"))
        assert none["status"] == "needs_review"
        assert none["needsReview"]
        assert all(item["category"] == "unverified" for item in none["verdicts"].values())
        assert all(item["verdict"] == "insufficient" for item in none["verdicts"].values())

        keyless_requests = out / "keyless-requests"
        keyless_requests.mkdir()
        (keyless_requests / "K2.json").write_text(
            (FIXTURES / "K2-request.json").read_text(encoding="utf-8"),
            encoding="utf-8",
        )
        keyless_output = out / "keyless-output"
        keyless = run_failed([
            sys.executable,
            str(ROOT / "scripts" / "batch_search.py"),
            "--requests-dir",
            str(keyless_requests),
            "--output-dir",
            str(keyless_output),
        ], {
            **os.environ,
            "TRUSTED_SEARCH_KEY": "",
            "FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE": str(
                out / "missing-trusted-search-key"
            ),
        })
        assert keyless["status"] == "failed"
        assert "MaaS 登录自动配置" in keyless["error"]
        assert "不得改用深知晓来源绕过" in keyless["error"]
        assert not keyless_output.exists()

        requests_dir = out / "requests"
        requests_dir.mkdir()
        fixtures = {}
        request_template = json.loads((FIXTURES / "K2-request.json").read_text(encoding="utf-8"))
        for index in range(1, 12):
            request = json.loads(json.dumps(request_template, ensure_ascii=False))
            request_id = f"P{index}"
            request["requestId"] = request_id
            request["knowledgePoint"]["id"] = request_id
            request["cloudPayload"]["knowledgePoint"]["id"] = request_id
            (requests_dir / f"{request_id}.json").write_text(json.dumps(request, ensure_ascii=False), encoding="utf-8")
            fixtures[request_id] = {"delayMs": 100, "evidence": [{"id": "E1", "title": "官方", "url": "https://example.gov.cn", "body": "证据"}]}
        fixtures_path = out / "fixtures.json"
        fixtures_path.write_text(json.dumps(fixtures, ensure_ascii=False), encoding="utf-8")
        batch_dir = out / "batch"
        run([sys.executable, str(ROOT / "scripts" / "batch_search.py"), "--requests-dir", str(requests_dir), "--output-dir", str(batch_dir), "--fixtures", str(fixtures_path), "--max-workers", "11"])
        batch = json.loads((batch_dir / "batch.json").read_text(encoding="utf-8"))
        assert batch["executionMode"] == "parallel" and batch["taskCount"] == 11
        assert batch["trustedSearchRequestCount"] == 11 and batch["elapsedMs"] < 700
    print("PASS 权威证据核验")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
