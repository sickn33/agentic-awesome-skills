#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "modules" if (ROOT / "modules").is_dir() else ROOT.parent
FIXTURES = SKILLS / "fact-check-x-knowledge-compare" / "tests" / "fixtures"
PIPELINE = ROOT / "scripts" / "fact_check_x.py"


def command(*arguments: str) -> list[str]:
    return [sys.executable, str(PIPELINE), *arguments]


def run(arguments: list[str], success: bool = True) -> dict:
    process = subprocess.run(arguments, text=True, capture_output=True, check=False)
    if success and process.returncode:
        raise AssertionError(process.stdout or process.stderr)
    if not success and process.returncode == 0:
        raise AssertionError("命令应被阶段门禁拒绝")
    return json.loads([line for line in process.stdout.splitlines() if line.strip()][-1])


def acknowledge(run_dir: Path, checkpoint: dict, decision: str = "continue") -> dict:
    return run(command(
        "acknowledge-stage",
        "--run-dir", str(run_dir),
        "--stage", checkpoint["stage"],
        "--token", checkpoint["acknowledgement"]["token"],
        "--decision", decision,
    ))


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="fcx-stage-gate-") as temporary:
        root = Path(temporary)
        run_dir = root / "interactive"
        results = FIXTURES / "results.json"
        analysis = FIXTURES / "comparison-analysis.json"
        capture = run(command(
            "prepare-comparison",
            "--results", str(results),
            "--run-dir", str(run_dir),
        ))
        assert capture["checkpoint"]["status"] == "awaiting_user"
        assert capture["checkpoint"]["acknowledgement"]["token"].startswith("fcx_")
        blocked = run(command(
            "complete-comparison",
            "--results", str(results),
            "--analysis", str(analysis),
            "--run-dir", str(run_dir),
        ), success=False)
        assert "尚未得到" in blocked["error"]

        wrong = run(command(
            "acknowledge-stage",
            "--run-dir", str(run_dir),
            "--stage", "capture",
            "--token", "wrong-token",
            "--decision", "continue",
        ), success=False)
        assert "令牌无效" in wrong["error"]
        assert acknowledge(run_dir, capture["checkpoint"])["nextStageAllowed"] is True

        comparison = run(command(
            "complete-comparison",
            "--results", str(results),
            "--analysis", str(analysis),
            "--run-dir", str(run_dir),
        ))
        assert comparison["checkpoint"]["status"] == "awaiting_user"
        authority_blocked = run(command(
            "prepare-authority", "--run-dir", str(run_dir),
        ), success=False)
        assert "尚未得到" in authority_blocked["error"]
        assert acknowledge(run_dir, comparison["checkpoint"], "stop")["nextStageAllowed"] is False
        stopped = run(command(
            "prepare-authority", "--run-dir", str(run_dir),
        ), success=False)
        assert "尚未得到" in stopped["error"]

        automatic_dir = root / "automatic"
        rejected = subprocess.run(command(
            "prepare-comparison",
            "--results", str(results),
            "--run-dir", str(automatic_dir),
            "--execution-mode", "full-auto",
        ), text=True, capture_output=True, check=False)
        assert rejected.returncode != 0
        assert "invalid choice" in rejected.stderr

    print("PASS 互动模式硬门禁且 full-auto 无法绕过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
