#!/usr/bin/env python3
"""锚点模式门禁的非对称性回归。

比较阶段依据引用池认定「免搜索」，核验阶段可能独立判定该锚点撑不住主张而改走
可信搜索。多搜一次是保守方向，必须放行（否则整条流水线死锁）；反过来把本应搜索
的知识点降级成免搜索属于洗白，必须继续拦住。
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from common import PipelineError
from fact_check_x import merge_verification


def comparison_for(anchor: dict) -> dict:
    return {
        "knowledgePoints": [
            {
                "id": "K1",
                "role": "direct",
                "statement": "示例主张",
                "trustedAnchor": anchor,
                "claims": {"alpha": {"covered": True}},
            }
        ]
    }


def authority(search_mode: str, request_count: int) -> dict:
    return {
        "schemaVersion": "fact-check-x/authority-result@1",
        "requestId": "K1",
        "searchMode": search_mode,
        "requestCount": request_count,
        "authoritativeFinding": "示例权威结论",
        "verdicts": {"alpha": {"verdict": "supported", "category": "direct_accurate"}},
        "evidenceGaps": [],
    }


GOV_ANCHOR = {"eligible": True, "sourcePolicy": "gov_cn_reference"}
NO_ANCHOR: dict = {}


def run(anchor: dict, search_mode: str, request_count: int) -> dict:
    with tempfile.TemporaryDirectory(prefix="fcx-anchor-") as raw:
        results_dir = Path(raw)
        (results_dir / "K1.json").write_text(
            json.dumps(authority(search_mode, request_count), ensure_ascii=False),
            encoding="utf-8",
        )
        return merge_verification(comparison_for(anchor), results_dir)


# 1. 期望免搜 + 核验阶段判锚点无效改走可信搜索：放行并留痕
#    修复前这里直接 PipelineError，整条流水线停在合并阶段，第四步出不来
downgraded = run(GOV_ANCHOR, "trusted_search", 1)
assert downgraded["govExemptCount"] == 0, downgraded["govExemptCount"]
assert downgraded["trustedSearchRequestCount"] == 1
assert downgraded["anchorDowngrades"] == ["K1"], downgraded["anchorDowngrades"]

# 2. 期望免搜 + 实际免搜：正常，不留降级记录
ok = run(GOV_ANCHOR, "gov_exempt", 0)
assert ok["govExemptCount"] == 1, ok["govExemptCount"]
assert ok["anchorDowngrades"] == [], ok["anchorDowngrades"]

# 3. 期望搜索 + 实际降级成免搜索：洗白，必须继续拒绝
for forged_mode in ("gov_exempt", "dknow_exempt"):
    try:
        run(NO_ANCHOR, forged_mode, 0)
    except PipelineError:
        pass
    else:
        raise AssertionError(f"{forged_mode} 降级未被拦截")

# 4. 模式相符但请求数对不上：仍然拒绝
try:
    run(GOV_ANCHOR, "gov_exempt", 3)
except PipelineError:
    pass
else:
    raise AssertionError("免搜模式下的异常请求数未被拦截")

print("PASS 锚点门禁非对称：多搜放行、洗白拦截")
