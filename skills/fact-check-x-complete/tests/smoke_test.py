#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    instructions = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    assert "最多自动修复 2 次" in instructions
    assert "禁止进入 `prepare-authority`" in instructions
    assert "禁止静默结束任务" in instructions
    with tempfile.TemporaryDirectory(prefix="fact-check-x-workbuddy-") as temp:
        process = subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "workbuddy_acceptance.py"),
                "--run-dir",
                str(Path(temp) / "run"),
            ],
            text=True,
            capture_output=True,
            check=False,
        )
        if process.returncode:
            raise AssertionError(process.stdout or process.stderr)
        summary = json.loads(process.stdout)
        assert summary["status"] == "passed"
        assert all(summary["checks"].values())
    print("PASS Fact-Check-X WorkBuddy 完整技能")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
