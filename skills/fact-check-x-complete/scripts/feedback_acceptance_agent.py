#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def reference_text(reference: dict) -> str:
    values = []
    for key in ("snippet", "text", "capturedText", "content", "body"):
        value = str(reference.get(key) or "").strip()
        if value and value not in values:
            values.append(value)
    return "\n".join(values)


def valid_url(value: object) -> bool:
    parsed = urlparse(str(value or ""))
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="自动验收 Fact-Check-X 用户反馈涉及的产品真值、来源与流程门禁。"
    )
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--output")
    parser.add_argument("--require-final", action="store_true")
    args = parser.parse_args()

    run_dir = Path(args.run_dir).expanduser().resolve()
    failures: list[str] = []
    required = [
        "capture/results.json",
        "capture-gate.json",
        "comparison-analysis.json",
        "comparison.json",
        "comparison-gate.json",
        "01-capture-report.html",
        "02-comparison-report.html",
    ]
    if args.require_final:
        required.extend(
            [
                "authority-gate.json",
                "verification.json",
                "pipeline.json",
                "03-authority-report.html",
                "04-final-report.html",
                "05-complete-report-package.zip",
            ]
        )
    for relative in required:
        if not (run_dir / relative).is_file():
            failures.append(f"missing_artifact:{relative}")

    metrics = {
        "platformCount": 0,
        "knowledgePointCount": 0,
        "needsReviewCount": 0,
        "coveredClaimCount": 0,
        "supportedClaimCount": 0,
        "dknowAnchorCount": 0,
        "trustedSearchRequestCount": None,
    }
    if not failures:
        capture = load(run_dir / "capture/results.json")
        analysis = load(run_dir / "comparison-analysis.json")
        comparison = load(run_dir / "comparison.json")
        platforms = capture.get("platforms") or []
        metrics["platformCount"] = len(platforms)
        if len(platforms) < 1:
            failures.append("minimum_platforms_not_met")
        capture_map = {
            str(platform.get("platform") or ""): platform for platform in platforms
        }
        for platform_id, platform in capture_map.items():
            if (
                platform.get("status") != "success"
                or not str(platform.get("answerMarkdown") or "").strip()
            ):
                failures.append(f"{platform_id}:capture_not_completed")

        capture_html = (run_dir / "01-capture-report.html").read_text(
            encoding="utf-8"
        )
        for retired in ("深知可信搜索官方来源", "可信搜索官方来源", "官方原站"):
            if retired in capture_html:
                failures.append(f"retired_source_label:{retired}")
        if "官方来源" not in capture_html:
            failures.append("official_source_label_missing")
        if (
            "#references th:first-child, #references td:first-child { width: 50%; }"
            not in capture_html
        ):
            failures.append("source_matrix_title_width")
        if "text-align: center" not in capture_html:
            failures.append("source_matrix_alignment")

        points = comparison.get("knowledgePoints") or []
        metrics["knowledgePointCount"] = len(points)
        metrics["needsReviewCount"] = len(comparison.get("needsReview") or [])
        if not points:
            failures.append("knowledge_points_missing")
        if comparison.get("needsReview"):
            failures.append("comparison_needs_review")
        analysis_points = analysis.get("knowledgePoints") or []
        if len(analysis_points) != len(points):
            failures.append("canonical_analysis_point_count_mismatch")
        for index, point in enumerate(points):
            point_id = str(point.get("id") or f"K{index + 1}")
            if index < len(analysis_points):
                stage_point = analysis_points[index]
                for field in ("claims", "comparison", "trustedAnchor"):
                    if stage_point.get(field) != point.get(field):
                        failures.append(f"{point_id}:canonical_{field}_mismatch")
            claims = point.get("claims") or {}
            for platform_id, claim in claims.items():
                if not claim.get("covered"):
                    continue
                metrics["coveredClaimCount"] += 1
                if claim.get("faithfulness") == "supported":
                    metrics["supportedClaimCount"] += 1
                references = (capture_map.get(platform_id) or {}).get("references") or []
                for evidence in claim.get("evidence") or []:
                    reference_index = evidence.get("referenceIndex")
                    excerpt = str(evidence.get("excerpt") or "").strip()
                    if (
                        not isinstance(reference_index, int)
                        or not (1 <= reference_index <= len(references))
                        or not excerpt
                        or excerpt not in reference_text(references[reference_index - 1])
                    ):
                        failures.append(
                            f"{point_id}.{platform_id}:evidence_not_locatable"
                        )
            dknow_claim = claims.get("dknowc-chat") or {}
            anchor = point.get("trustedAnchor") or {}
            if dknow_claim.get("covered"):
                if dknow_claim.get("faithfulness") != "supported":
                    failures.append(f"{point_id}:dknow_claim_not_supported")
                if not anchor.get("eligible"):
                    failures.append(f"{point_id}:dknow_anchor_missing")
            if anchor.get("eligible"):
                metrics["dknowAnchorCount"] += 1
                if anchor.get("platform") != "dknowc-chat":
                    failures.append(f"{point_id}:anchor_platform_invalid")
                for evidence in anchor.get("evidence") or []:
                    if not valid_url(evidence.get("url")):
                        failures.append(f"{point_id}:anchor_url_invalid")

        if (
            metrics["coveredClaimCount"]
            and metrics["supportedClaimCount"] == 0
        ):
            failures.append("all_claims_insufficient_flood")

        skill_text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        for guard in (
            "**语言硬门禁**",
            "不得输出英文句子",
            "`login` 是可见浏览器命令",
            "不得添加 `--headed` 或其他未列出的参数",
            "精确命令尚未失败时，不得先检查 CLI 帮助",
            "所有流水线命令必须前台直接执行",
            "`| tail`",
            "`| tee`",
            "`|| true`",
            "程序负责从已捕获来源中校验脚标",
        ):
            if guard not in skill_text:
                failures.append(f"instruction_guard_missing:{guard}")

        if args.require_final:
            verification = load(run_dir / "verification.json")
            pipeline = load(run_dir / "pipeline.json")
            metrics["trustedSearchRequestCount"] = verification.get(
                "trustedSearchRequestCount"
            )
            if verification.get("status") != "completed":
                failures.append("verification_not_completed")
            if pipeline.get("status") != "completed":
                failures.append("pipeline_not_completed")
            if verification.get("dknowExemptCount") != metrics["dknowAnchorCount"]:
                failures.append("dknow_exempt_count_mismatch")
            for point in verification.get("knowledgePoints") or []:
                if not (point.get("trustedAnchor") or {}).get("eligible"):
                    continue
                authority = point.get("authority") or {}
                verdict = (authority.get("verdicts") or {}).get("dknowc-chat") or {}
                if (
                    authority.get("searchMode") != "dknow_exempt"
                    or authority.get("requestCount") != 0
                    or verdict.get("category") != "direct_accurate"
                ):
                    failures.append(
                        f"{point.get('id')}:dknow_direct_accurate_not_conserved"
                    )

    result = {
        "schemaVersion": "fact-check-x/feedback-acceptance@1",
        "status": "passed" if not failures else "failed",
        "runDir": str(run_dir),
        "metrics": metrics,
        "failures": sorted(set(failures)),
    }
    output = (
        Path(args.output).expanduser().resolve()
        if args.output
        else run_dir / "feedback-acceptance.json"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
