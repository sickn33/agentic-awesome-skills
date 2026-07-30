#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "validate_results.py"), "--input", str(ROOT / "tests" / "fixtures" / "results.json")],
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode:
        raise AssertionError(proc.stdout or proc.stderr)
    result = json.loads(proc.stdout)
    assert result == {"status": "completed", "platforms": 2, "successes": 1, "references": 1}
    assert (ROOT / "assets" / "tool" / "dist" / "cli.js").exists()
    with tempfile.TemporaryDirectory(prefix="fact-check-x-capture-report-") as temp:
        report_input = json.loads((ROOT / "tests" / "fixtures" / "results.json").read_text(encoding="utf-8"))
        report_input["platforms"][1].update({
            "status": "success",
            "answerMarkdown": "每人每月最高 2000 元【1】",
            "sourceMentions": [
                {"label": "广州住房公积金管理中心", "marker": "1", "occurrenceCount": 2}
            ],
        })
        report_input["platforms"][1].pop("error", None)
        report_input["platforms"][0]["references"].extend([
            {
                "title": "内部库政策条目",
                "url": "https://yun.dknowc.cn/wlcb/ShenZhi-policy/#/policyDetails?id=1",
                "normalizedUrl": "https://yun.dknowc.cn/wlcb/ShenZhi-policy",
                "marker": "2",
                "snippet": "只有内部库链接。",
                "originAttributionStatus": "trusted_search_no_source_url",
            },
            {
                "title": "内部库官方原件",
                "url": "https://yun.dknowc.cn/wlcb/ShenZhi-policy/#/policyDetails?id=2",
                "normalizedUrl": "https://yun.dknowc.cn/wlcb/ShenZhi-policy",
                "marker": "3",
                "snippet": "包含官网回链。",
                "resourceUrl": "https://gjj.gz.gov.cn/official/2",
                "originAttributionStatus": "trusted_search_official_url",
            },
        ])
        deepseek = json.loads(json.dumps(report_input["platforms"][1], ensure_ascii=False))
        deepseek.update({
            "platform": "deepseek",
            "label": "DeepSeek",
            "url": "https://chat.deepseek.com/",
            "answerMarkdown": "每人每月最高 2000 元。",
            "references": [],
            "sourceMentions": [],
        })
        report_input["platforms"].append(deepseek)
        report_input_path = Path(temp) / "input.json"
        report_input_path.write_text(json.dumps(report_input, ensure_ascii=False), encoding="utf-8")
        report = subprocess.run(
            [
                "node",
                str(ROOT / "assets" / "tool" / "dist" / "report-cli.js"),
                "--input",
                str(report_input_path),
                "--out",
                temp,
            ],
            text=True,
            capture_output=True,
            check=False,
        )
        if report.returncode:
            raise AssertionError(report.stdout or report.stderr)
        html = (Path(temp) / "report.html").read_text(encoding="utf-8")
        assert "原始答案、参考文献与引用存证报告" in html
        assert "广州住房公积金管理中心" in html
        assert "无可访问 URL" in html
        assert "官方来源" in html
        assert "官方原站" not in html
        assert html.count("官方来源") >= 2
        assert "可信搜索返回官方来源链接" in html
        assert "可信搜索未返回源网址" in html
        assert "DeepSeek" in html and "3 个平台" in html
        assert 'platform-layout-compact platform-count-3' in html
        assert 'style="--platform-count:3"' in html
        assert "grid-template-columns: repeat(var(--platform-count), minmax(0, 1fr))" in html
        assert "grid-auto-columns: minmax(430px, 500px)" not in html
        assert "等宽展示全部平台" in html
        assert "table-layout: fixed" in html
        assert "#references th:first-child, #references td:first-child { width: 50%; }" in html
        assert "text-align: center" in html
        assert "#references table, #references thead" in html
        assert "min-width: 860px" not in html
        assert "可信库来源" not in html
        assert "DT库·gov一手收录" not in html
        markdown = (Path(temp) / "report.md").read_text(encoding="utf-8")
        assert "Source labels shown by the page without accessible URLs" in markdown
        assert markdown.count("【官方来源】") >= 2
        assert "DeepSeek" in markdown
        assert "可信库来源" not in markdown
        assert "DT库·gov一手收录" not in markdown
        assert (Path(temp) / "results.json").exists() and (Path(temp) / "report.md").exists()
    wait_test = subprocess.run(
        ["node", str(ROOT / "tests" / "capture_wait_test.mjs")],
        text=True,
        capture_output=True,
        check=False,
    )
    if wait_test.returncode:
        raise AssertionError(wait_test.stdout or wait_test.stderr)
    artifact_path_test = subprocess.run(
        ["node", str(ROOT / "tests" / "artifact_path_test.mjs")],
        text=True,
        capture_output=True,
        check=False,
    )
    if artifact_path_test.returncode:
        raise AssertionError(artifact_path_test.stdout or artifact_path_test.stderr)
    help_text = subprocess.run(
        ["node", str(ROOT / "assets" / "tool" / "dist" / "cli.js"), "run", "--help"],
        text=True,
        capture_output=True,
        check=False,
    ).stdout
    assert "--retries <count>" in help_text
    assert "180000" in help_text
    assert (ROOT / "assets" / "tool" / "package-lock.json").exists()
    if os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT"):
        Path(os.environ["FACT_CHECK_X_ASSERTIONS_OUTPUT"]).write_text(json.dumps({
            "schemaVersion": "fact-check-x/test-assertions@1",
            "actualAssertionIds": ["ui.official_source_label", "ui.source_matrix_layout"],
        }), encoding="utf-8")
    print("PASS 多平台回答与引用无损采集")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
