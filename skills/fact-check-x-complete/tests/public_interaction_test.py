#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    instructions = (ROOT / "SKILL.md").read_text(encoding="utf-8")
    assert "**语言硬门禁**" in instructions
    assert "第一句话、过程更新、命令说明、阶段检查点、错误说明和最终答复全部只使用简体中文" in instructions
    assert "不得输出英文句子" in instructions
    assert "第一条回复直接使用“我会核验这个问题" in instructions
    assert "原始答案与引用、知识点对比（未核验）、权威证据核验、平台表现与完整证据" in instructions
    assert "不存在固定“五平台模式”或固定上限" in instructions
    assert "平台组合完全按用户输入决定" in instructions
    assert "**分阶段交付门禁**" in instructions
    for choice in ("继续下一步", "修正当前结果", "到此结束并保留产物"):
        assert choice in instructions
    assert "完整跑完、无需逐步确认" in instructions
    assert "逐阶段发送可打开产物和状态" in instructions
    assert "综合草案（未核验）" in instructions
    assert "权威核验后的最终答案" in instructions
    assert "`dknowc-deep-research`" in instructions
    assert "用户只完成登录，技能自动获取或创建专用 Key" in instructions
    assert "Codex、Claude Code、WorkBuddy 等载体共同复用" in instructions
    assert "python3 scripts/trusted_search_config.py configure" in instructions
    assert "不需要编辑 shell 文件、执行环境变量命令或回复“已配置”" in instructions
    assert "launchctl setenv" not in instructions
    assert "~/.zshenv" not in instructions
    assert "export TRUSTED_SEARCH_KEY" not in instructions
    assert "所有面向用户的提示、阶段检查点、错误说明和最终答复必须使用中文" in instructions
    assert "包内 Playwright 直接启动并控制系统 Chrome" in instructions
    assert "Computer Use 不是正常采集的前置条件" in instructions
    assert "只有命令工具时可以前台执行一次 `login`" in instructions
    assert "禁止使用 shell 后台任务" in instructions
    assert "禁止给任何流水线命令添加 `| tail`、`| tee`、`|| true`" in instructions
    assert "`login` 是可见浏览器命令" in instructions
    assert "不得添加 `--headed` 或其他未列出的参数" in instructions
    assert "精确命令尚未失败时，不得先检查 CLI 帮助、源码或浏览器环境" in instructions
    assert "未看到 `login` 成功" in instructions
    assert "禁止告诉用户“浏览器已启动”“采集已在后台运行”" in instructions
    assert "运行期间出现登录、短信验证码、人机验证或 CAPTCHA" in instructions
    assert "保持命令和当前 Playwright 页面运行" in instructions
    assert "禁止改用 headless/无头浏览器" in instructions
    assert "当前载体无法调用 Computer Use，原始答案采集已停止" in instructions
    for browser_name in ("Google Chrome", "Microsoft Edge", "Brave", "Chromium"):
        assert browser_name in instructions
    assert "不得反复启动 Chrome for Testing" in instructions
    live_acceptance = (ROOT / "scripts/installed_live_acceptance.py").read_text(
        encoding="utf-8"
    )
    trusted_search_config_path = ROOT / "scripts/trusted_search_config.py"
    if not trusted_search_config_path.is_file():
        trusted_search_config_path = (
            ROOT.parent
            / "fact-check-x-unified"
            / "scripts"
            / "trusted_search_config.py"
        )
    trusted_search_config = trusted_search_config_path.read_text(encoding="utf-8")
    assert "https://platform.dknowc.cn/auth/#/login" in trusted_search_config
    assert "shared_local_credential" in trusted_search_config
    assert "trusted-search-onboarding.js" in trusted_search_config
    onboarding = (
        ROOT
        / "modules"
        / "llm-answer-reference-compare"
        / "assets"
        / "tool"
        / "dist"
        / "trusted-search-onboarding.js"
    )
    if not onboarding.is_file():
        onboarding = (
            ROOT.parent
            / "llm-answer-reference-compare"
            / "assets"
            / "tool"
            / "dist"
            / "trusted-search-onboarding.js"
        )
    onboarding_text = onboarding.read_text(encoding="utf-8")
    assert 'name: "Fact-Check-X"' in onboarding_text
    assert '"/auth/maas"' in onboarding_text
    assert "/api-key/list" in onboarding_text
    assert "/api-key/create" in onboarding_text
    assert 'name: "创建 API Key"' in onboarding_text
    assert 'hasText: "新的API Key"' in onboarding_text
    assert "console.log(JSON.stringify" in onboarding_text
    platform_registry = onboarding.parent / "capture" / "platform-registry.js"
    registry_text = platform_registry.read_text(encoding="utf-8")
    assert 'name: "dknowc-deep-research"' in registry_text
    assert 'label: "深知晓（深度研究）"' in registry_text
    assert "https://poc1.dknowc.cn/wlcb/shenzhimini-test5/" in registry_text
    for platform in (
        "dknowc-chat",
        "dknowc-deep-research",
        "doubao",
        "yuanbao",
        "deepseek",
        "qianwen",
    ):
        assert f'name: "{platform}"' in registry_text
    for unsupported in ("kimi", "chatgpt", "claude", "gemini", "zhipu"):
        assert f'name: "{unsupported}"' not in registry_text
    for public_only_term in (
        "V8",
        "1.0 原始",
        "1.1 知识",
        "云端权威核验",
        "定稿报告",
        "[WorkBuddy 验收标准]",
    ):
        assert public_only_term not in instructions
    assert "](references/" not in instructions
    assert "Playwright 直接管理系统 Chromium 持久化会话" in live_acceptance
    assert "保留两平台登录状态" in live_acceptance
    assert "保留两平台主页面" not in live_acceptance
    truth_contract = json.loads(
        (ROOT / "references/product-truth-contract.json").read_text(
            encoding="utf-8"
        )
    )
    direct_conditions = truth_contract["trustedSearch"]["directAccurateWhen"]
    assert "trusted_search_used" not in direct_conditions
    assert "reference_has_valid_http_url" in direct_conditions
    assert (
        truth_contract["trustedSearch"]["dknowReferenceScope"]
        == "external_official_url_or_dknow_internal_collection_url"
    )
    assert "03-authority-report.html" in truth_contract["stageArtifacts"]
    assert "04-final-report.html" in truth_contract["stageArtifacts"]
    assert "05-complete-report-package.zip" in truth_contract["stageArtifacts"]
    stage_interaction = truth_contract["stageInteraction"]
    assert (
        stage_interaction["default"]
        == "deliver_openable_artifact_then_wait_for_user"
    )
    assert stage_interaction["choices"] == [
        "继续下一步",
        "修正当前结果",
        "到此结束并保留产物",
    ]
    assert stage_interaction["autoRunOnlyWhenInitiallyExplicit"] is True
    assert stage_interaction["autoRunStillEmitsCheckpoints"] is True
    assert instructions.index("强制执行门禁") < instructions.index("本技能是对外唯一入口")
    collector_test = ROOT / "modules/llm-answer-reference-compare/tests/smoke_test.py"
    if not collector_test.is_file():
        collector_test = ROOT.parent / "llm-answer-reference-compare/tests/smoke_test.py"
    collector = subprocess.run(
        [sys.executable, str(collector_test)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert collector.returncode == 0, collector.stderr or collector.stdout
    output = os.getenv("FACT_CHECK_X_ASSERTIONS_OUTPUT")
    if output:
        Path(output).write_text(
            json.dumps(
                {
                    "schemaVersion": "fact-check-x/test-assertions@1",
                    "actualAssertionIds": [
                        "ui.chinese_interaction_required",
                        "ui.official_source_label",
                        "ui.preflight_no_false_start",
                        "ui.source_matrix_layout",
                        "ui.stage_confirmation_choices",
                    ],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
    print("PASS 中文交互、载体能力预检、真实启动状态、官方来源标签和来源矩阵布局")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
