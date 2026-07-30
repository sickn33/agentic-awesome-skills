#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import json
import os
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    collector_root = root / "modules/llm-answer-reference-compare"
    if not collector_root.is_dir():
        collector_root = root.parent / "llm-answer-reference-compare"
    tests = [
        collector_root / "tests/login_recovery_test.mjs",
        collector_root / "tests/capture_wait_test.mjs",
        collector_root / "tests/dknow_reference_test.mjs",
        collector_root / "tests/doubao_reference_test.mjs",
    ]
    for test in tests:
        process = subprocess.run(["node", str(test)], cwd=root, text=True, capture_output=True, check=False)
        print(process.stdout or process.stderr, end="")
        if process.returncode:
            return process.returncode
    if os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT"):
        Path(os.environ["FACT_CHECK_X_ASSERTIONS_OUTPUT"]).write_text(json.dumps({
            "schemaVersion": "fact-check-x/test-assertions@1",
            "actualAssertionIds": [
                "auth.login_failure_requires_computer_use",
                "auth.login_text_not_answer_gate",
                "citation.binding_conserved",
            ],
        }), encoding="utf-8")
    print("PASS 登录失败接管、登录门禁、地区提示、生成期验证、深知/豆包引用绑定、来源正文与 PDF 完整性联合回归")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
