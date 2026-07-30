#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def command(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, capture_output=True, check=False)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="fact-check-x-golden-negative-") as temporary:
        temp = Path(temporary)
        true_result = temp / "true.json"
        true_case = command(
            sys.executable, str(ROOT / "scripts/run_golden_case.py"),
            "--case-id", "GR-001", "--skill-root", str(ROOT),
            "--work-dir", str(temp / "true-work"), "--output", str(true_result),
            "--command-override", "/usr/bin/true",
        )
        assert true_case.returncode != 0
        assert json.loads(true_result.read_text(encoding="utf-8"))["actualAssertionIds"] == []

        fake = temp / "fake"
        (fake / "scripts").mkdir(parents=True)
        (fake / "references").mkdir()
        shutil.copy2(ROOT / "scripts/golden_regression_gate.py", fake / "scripts/golden_regression_gate.py")
        shutil.copy2(ROOT / "scripts/run_golden_case.py", fake / "scripts/run_golden_case.py")
        ledger = fake / "ledger.ndjson"
        ledger.write_text('{"feedback_id":"F1"}\n', encoding="utf-8")
        catalog = fake / "references/golden-regressions.json"
        catalog.write_text('{"schemaVersion":"x","cases":[],"feedbackCoverage":{}}\n', encoding="utf-8")
        empty_catalog = command(
            sys.executable, str(fake / "scripts/golden_regression_gate.py"),
            "--skill-root", str(fake), "--feedback-ledger", str(ledger),
            "--output", str(fake / "empty.json"), "--evidence-dir", str(fake / "evidence-empty"),
        )
        assert empty_catalog.returncode != 0
        empty_ledger = fake / "empty-ledger.ndjson"
        empty_ledger.write_text("", encoding="utf-8")
        catalog.write_text((ROOT / "references/golden-regressions.json").read_text(encoding="utf-8"), encoding="utf-8")
        no_ledger = command(
            sys.executable, str(fake / "scripts/golden_regression_gate.py"),
            "--skill-root", str(fake), "--feedback-ledger", str(empty_ledger),
            "--output", str(fake / "no-ledger.json"), "--evidence-dir", str(fake / "evidence-ledger"),
        )
        assert no_ledger.returncode != 0

        one_way_catalog = json.loads((ROOT / "references/golden-regressions.json").read_text(encoding="utf-8"))
        first_case = one_way_catalog["cases"][0]
        removed_feedback = first_case["feedbackIds"].pop()
        assert first_case["id"] in one_way_catalog["feedbackCoverage"][removed_feedback]["caseIds"]
        catalog.write_text(json.dumps(one_way_catalog, ensure_ascii=False), encoding="utf-8")
        one_way = command(
            sys.executable, str(fake / "scripts/golden_regression_gate.py"),
            "--skill-root", str(fake), "--feedback-ledger", str(ledger),
            "--output", str(fake / "one-way.json"), "--evidence-dir", str(fake / "evidence-one-way"),
        )
        assert one_way.returncode != 0
        assert "feedback_mapping_not_bidirectional" in json.loads(
            (fake / "one-way.json").read_text(encoding="utf-8")
        )["failures"]

        catalog.write_text(json.dumps({
            "schemaVersion": "fact-check-x/golden-regressions@1",
            "cases": [{
                "id": "GR-IDEMPOTENT",
                "status": "required",
                "expected": "每次调用使用全新工作目录",
                "feedbackIds": ["F1"],
                "assertionIds": ["run.fresh_work_dir"],
            }],
            "feedbackCoverage": {
                "F1": {
                    "class": "knownRegression",
                    "caseIds": ["GR-IDEMPOTENT"],
                }
            },
        }), encoding="utf-8")
        (fake / "scripts/run_golden_case.py").write_text(
            """#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--case-id", required=True)
parser.add_argument("--skill-root", required=True)
parser.add_argument("--work-dir", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()
work = Path(args.work_dir)
work.mkdir(parents=True, exist_ok=False)
proof = work / "proof.txt"
proof.write_text("fresh", encoding="utf-8")
payload = {
    "schemaVersion": "fact-check-x/golden-case-result@1",
    "caseId": args.case_id,
    "status": "passed",
    "actualAssertionIds": ["run.fresh_work_dir"],
    "evidence": [{
        "path": str(proof.resolve()),
        "sha256": hashlib.sha256(proof.read_bytes()).hexdigest(),
    }],
}
Path(args.output).write_text(json.dumps(payload), encoding="utf-8")
""",
            encoding="utf-8",
        )
        repeat_evidence = fake / "evidence-repeat"
        invocation_roots = []
        for index in range(2):
            repeated = command(
                sys.executable, str(fake / "scripts/golden_regression_gate.py"),
                "--skill-root", str(fake), "--feedback-ledger", str(ledger),
                "--output", str(fake / f"repeat-{index}.json"),
                "--evidence-dir", str(repeat_evidence),
            )
            assert repeated.returncode == 0, repeated.stdout or repeated.stderr
            repeated_result = json.loads(
                (fake / f"repeat-{index}.json").read_text(encoding="utf-8")
            )
            invocation_roots.append(repeated_result["invocationEvidenceRoot"])
        assert len(set(invocation_roots)) == 2
    print("PASS golden gate fail-closed negative cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
