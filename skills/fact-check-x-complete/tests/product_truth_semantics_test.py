#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    knowledge_root = (
        ROOT / "modules/fact-check-x-knowledge-compare"
        if (ROOT / "modules/fact-check-x-knowledge-compare").is_dir()
        else ROOT.parent / "fact-check-x-knowledge-compare"
    )
    smoke = subprocess.run(
        [sys.executable, str(knowledge_root / "tests/smoke_test.py")],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert smoke.returncode == 0, smoke.stderr or smoke.stdout
    target = ROOT / "scripts/product_truth_audit.py"
    spec = importlib.util.spec_from_file_location("product_truth_audit", target)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    raw = {"citedReferenceIndexes": [], "answerLevelReferenceIndexes": [2]}
    normalized = {"citedReferenceIndexes": [2], "answerLevelReferenceIndexes": [], "referenceBinding": "answer_level_semantic"}
    assert module.effective_reference_indexes(raw) == module.effective_reference_indexes(normalized) == [2]
    assert module.canonical_comparison({"status": "agreement", "summary": "一致"}) == {
        "status": "consensus", "summary": "一致",
    }
    assert module.canonical_comparison({"status": "基本一致", "summary": "基本一致"}) == {
        "status": "mostly_consensus", "summary": "基本一致",
    }
    with tempfile.TemporaryDirectory(prefix="fact-check-x-artifacts-") as temp:
        capture_dir = Path(temp)
        capture = {
            "platforms": [{
                "platform": "qianwen",
                "artifacts": {
                    "screenshot": "artifacts/qianwen/screenshot.png",
                    "html": "artifacts/qianwen/page.html",
                },
            }],
        }
        assert module.capture_artifact_failures(capture, capture_dir) == [
            "qianwen:screenshot_artifact_missing:artifacts/qianwen/screenshot.png",
            "qianwen:html_artifact_missing:artifacts/qianwen/page.html",
        ]
        (capture_dir / "artifacts/qianwen").mkdir(parents=True)
        (capture_dir / "artifacts/qianwen/screenshot.png").write_bytes(b"png")
        (capture_dir / "artifacts/qianwen/page.html").write_text(
            "<html></html>", encoding="utf-8"
        )
        assert module.capture_artifact_failures(capture, capture_dir) == []
        report = capture_dir / "01-capture-report.html"
        report.write_text(
            '<a href="artifacts/qianwen/screenshot.png">截图</a>'
            '<a href="https://example.com">外部来源</a>',
            encoding="utf-8",
        )
        assert module.report_local_link_failures(report) == []
        (capture_dir / "artifacts/qianwen/screenshot.png").unlink()
        assert module.report_local_link_failures(report) == [
            "01-capture-report.html:local_link_missing:artifacts/qianwen/screenshot.png"
        ]
    output = os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT")
    if output:
        Path(output).write_text(json.dumps({
            "schemaVersion": "fact-check-x/test-assertions@1",
            "actualAssertionIds": [
                "normalization.answer_level_semantic_conserved",
                "normalization.agreement_alias_conserved",
            ],
        }), encoding="utf-8")
    print("PASS product-truth semantic normalization")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
