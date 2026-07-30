#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "scripts/fact_check_x.py"
if not PIPELINE.is_file():
    PIPELINE = ROOT.parent / "fact-check-x-unified" / "scripts" / "fact_check_x.py"
FIXTURE = ROOT / "modules/fact-check-x-knowledge-compare/tests/fixtures"
if not FIXTURE.is_dir():
    FIXTURE = ROOT.parent / "fact-check-x-knowledge-compare" / "tests" / "fixtures"


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(PIPELINE), *args], text=True, capture_output=True, check=False)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="fact-check-x-contract-gate-") as temporary:
        run_dir = Path(temporary) / "run"
        results = FIXTURE / "results.json"
        assert run("prepare-comparison", "--results", str(results), "--run-dir", str(run_dir)).returncode == 0
        invalid = json.loads((FIXTURE / "comparison-analysis.json").read_text(encoding="utf-8"))
        invalid["knowledgePoints"][0]["claims"]["dknowc-chat"].pop("faithfulness")
        (run_dir / "comparison-analysis.json").write_text(json.dumps(invalid, ensure_ascii=False), encoding="utf-8")
        completed = run("complete-comparison", "--results", str(results), "--run-dir", str(run_dir))
        assert completed.returncode != 0 and "product-truth@1" in completed.stdout
        assert not (run_dir / "comparison-gate.json").exists()
        assert not (run_dir / "authority").exists()
        authority = run("prepare-authority", "--run-dir", str(run_dir))
        assert authority.returncode != 0
        all_uncovered_dir = Path(temporary) / "all-uncovered"
        assert run("prepare-comparison", "--results", str(results), "--run-dir", str(all_uncovered_dir)).returncode == 0
        all_uncovered = json.loads((FIXTURE / "comparison-analysis.json").read_text(encoding="utf-8"))
        for point in all_uncovered["knowledgePoints"]:
            for claim in point["claims"].values():
                claim["covered"] = False
                claim["claim"] = ""
                claim["answerExcerpt"] = ""
                claim["faithfulness"] = "insufficient"
                claim["evidence"] = []
        (all_uncovered_dir / "comparison-analysis.json").write_text(
            json.dumps(all_uncovered, ensure_ascii=False), encoding="utf-8"
        )
        uncovered_result = run(
            "complete-comparison", "--results", str(results), "--run-dir", str(all_uncovered_dir)
        )
        assert uncovered_result.returncode != 0
        assert "所有平台均为 covered=false" in uncovered_result.stdout
        assert not (all_uncovered_dir / "authority").exists()
        if os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT"):
            Path(os.environ["FACT_CHECK_X_ASSERTIONS_OUTPUT"]).write_text(json.dumps({
                "schemaVersion": "fact-check-x/test-assertions@1",
                "actualAssertionIds": [
                    "contract.missing_fields_blocked",
                    "contract.nonempty_coverage_required",
                    "contract.authority_not_entered",
                ],
            }), encoding="utf-8")
    print("PASS 1.1 契约失败未进入 authority")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
