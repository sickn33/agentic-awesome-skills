#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    process = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        capture_output=True,
        check=False,
    )
    if process.returncode:
        raise AssertionError(process.stderr or process.stdout)
    return process


def main() -> int:
    python_config_test = ROOT / "tests" / "trusted_search_config_test.py"
    if not python_config_test.is_file():
        python_config_test = (
            ROOT.parent
            / "fact-check-x-unified"
            / "tests"
            / "trusted_search_config_test.py"
        )
    node_onboarding_test = (
        ROOT
        / "modules"
        / "llm-answer-reference-compare"
        / "tests"
        / "trusted_search_onboarding_test.mjs"
    )
    if not node_onboarding_test.is_file():
        node_onboarding_test = (
            ROOT.parent
            / "llm-answer-reference-compare"
            / "tests"
            / "trusted_search_onboarding_test.mjs"
        )
    pipeline_script = ROOT / "scripts" / "fact_check_x.py"
    if not pipeline_script.is_file():
        pipeline_script = (
            ROOT.parent
            / "fact-check-x-unified"
            / "scripts"
            / "fact_check_x.py"
        )
    authority_script = (
        ROOT
        / "modules"
        / "fact-check-x-authoritative-verify"
        / "scripts"
        / "authority_verify.py"
    )
    if not authority_script.is_file():
        authority_script = (
            ROOT.parent
            / "fact-check-x-authoritative-verify"
            / "scripts"
            / "authority_verify.py"
        )

    python_result = run([sys.executable, str(python_config_test)], ROOT)
    node_result = run(["node", str(node_onboarding_test)], ROOT)
    with tempfile.TemporaryDirectory(prefix="fact-check-x-key-product-") as temp:
        acceptance_result = run(
            [
                sys.executable,
                "scripts/workbuddy_acceptance.py",
                "--run-dir",
                str(Path(temp) / "run"),
            ],
            ROOT,
        )
    acceptance = json.loads(acceptance_result.stdout)
    checks = acceptance.get("checks") or {}
    instructions = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    combined_output = "\n".join(
        (
            python_result.stdout,
            python_result.stderr,
            node_result.stdout,
            node_result.stderr,
            acceptance_result.stdout,
            acceptance_result.stderr,
        )
    )

    assert checks.get("trustedSearchHardGate") is True
    assert checks.get("trustedSearchConfigurationPrompt") is True
    assert "用户只完成登录，技能自动获取或创建专用 Key" in instructions
    assert "Codex、Claude Code、WorkBuddy 等载体共同复用" in instructions
    assert "不需要编辑 shell 文件、执行环境变量命令或回复“已配置”" in instructions
    assert "launchctl setenv" not in instructions
    assert "~/.zshenv" not in instructions
    assert "export TRUSTED_SEARCH_KEY" not in instructions
    assert "trusted_search_key_for_execution" in pipeline_script.read_text(encoding="utf-8")
    spec = importlib.util.spec_from_file_location(
        "fact_check_x_authority_verify",
        authority_script,
    )
    if spec is None or spec.loader is None:
        raise AssertionError("无法加载权威核验模块")
    authority_module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(authority_script.parent))
    spec.loader.exec_module(authority_module)
    request = {
        "schemaVersion": "fact-check-x/authority-request@1",
        "requestId": "K1",
        "title": "测试空搜索结果不得直接裁决",
        "comparisonStatus": "conflict",
        "knowledgePoint": {
            "id": "K1",
            "description": "待核验事实",
            "role": "direct",
            "core": True,
        },
        "claims": {
            "platform-a": {
                "covered": True,
                "claim": "结论甲",
                "sourceLevel": "nonofficial",
                "faithfulness": "supported",
                "evidence": [],
            },
            "platform-b": {
                "covered": True,
                "claim": "结论乙",
                "sourceLevel": "nonofficial",
                "faithfulness": "supported",
                "evidence": [],
            },
        },
        "cloudPayload": {
            "title": "测试空搜索结果不得直接裁决",
            "knowledgePoint": {"id": "K1", "description": "待核验事实"},
            "differingClaims": [
                {"platform": "platform-a", "claim": "结论甲"},
                {"platform": "platform-b", "claim": "结论乙"},
            ],
        },
    }
    no_evidence_result = authority_module.finalize(
        request,
        {
            "schemaVersion": "fact-check-x/authority-evidence@1",
            "requestId": request["requestId"],
            "status": "no_evidence",
            "searchMode": "trusted_search",
            "requestCount": 1,
            "evidence": [],
        },
        {},
    )
    assert no_evidence_result["status"] == "needs_review"
    assert no_evidence_result["needsReview"]
    assert all(
        item["category"] == "unverified"
        for item in no_evidence_result["verdicts"].values()
        if item["verdict"] != "omitted"
    )
    assert "fixture_fact_check_x_key_123456" not in combined_output
    assert "fixture_fact_check_x_onboarding_123456" not in combined_output

    assertion_ids = [
        "secret.missing_key_blocked",
        "secret.maas_login_only_config",
        "secret.existing_config_skips_login",
        "secret.cross_carrier_reuse",
        "secret.local_credential_private",
        "secret.no_chat_secret",
        "secret.service_error_no_relogin",
        "authority.no_evidence_needs_review",
    ]
    output = os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT")
    if output:
        Path(output).write_text(
            json.dumps(
                {
                    "schemaVersion": "fact-check-x/test-assertions@1",
                    "actualAssertionIds": assertion_ids,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
    print("PASS 可信搜索仅登录自动配置、已有配置跳过、跨载体复用与秘密不外显")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
