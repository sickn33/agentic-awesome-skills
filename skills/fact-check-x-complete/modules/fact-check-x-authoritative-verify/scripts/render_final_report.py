#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from common import SkillError, dump_json, load_json


CATEGORY = {
    "direct_accurate": "直接准确",
    "indirect_accurate": "间接准确",
    "coincidental": "巧合式幻觉",
    "misleading": "误导式幻觉",
    "fabricated": "编造式幻觉",
    "unverified": "待复核",
    "omitted": "答案遗漏",
}


def original_platforms(results: dict) -> dict[str, dict]:
    return {str(platform.get("platform")): platform for platform in results.get("platforms") or []}

def reference_primary_url(reference: dict) -> str:
    if reference.get("originAttributionStatus") == "trusted_search_no_source_url":
        return str(reference.get("url") or "")
    for key in ("officialUrl", "official_url", "resourceUrl", "resource_url", "sourceUrl", "source_url", "url"):
        candidate = str(reference.get(key) or "").strip()
        if candidate.startswith(("http://", "https://")):
            return candidate
    return ""


def attached_provenance(claim: dict, platform: dict) -> list[dict]:
    references = platform.get("references") or []
    evidence = {item.get("referenceIndex"): item.get("excerpt") for item in claim.get("evidence") or []}
    output = []
    for index in claim.get("citedReferenceIndexes") or []:
        if not isinstance(index, int) or not (1 <= index <= len(references)):
            continue
        reference = references[index - 1]
        primary_url = reference_primary_url(reference)
        platform_url = str(
            reference.get("platformUrl")
            or reference.get("platform_url")
            or reference.get("originalUrl")
            or reference.get("original_url")
            or (reference.get("url") if reference.get("url") != primary_url else "")
            or ""
        )
        output.append(
            {
                "label": str(reference.get("title") or reference.get("text") or reference.get("url") or ""),
                "url": primary_url,
                "platform_url": platform_url,
                "origin_attribution_status": str(reference.get("originAttributionStatus") or ""),
                "origin_attribution_reason": str(reference.get("originAttributionReason") or ""),
                "excerpt": str(evidence.get(index) or reference.get("snippet") or ""),
            }
        )
    return output


def official_basis(authority: dict, evidence_ids: list[str] | None = None) -> dict:
    evidence_items = authority.get("evidence") or []
    evidence_by_id = {str(item.get("id") or ""): item for item in evidence_items}
    selected = []
    if evidence_ids is None:
        selected = evidence_items[:1]
    else:
        selected = [evidence_by_id[evidence_id] for evidence_id in evidence_ids if evidence_id in evidence_by_id]
    if authority.get("searchMode") != "dknow_exempt":
        selected = selected[:1]
    evidence = selected[0] if selected else {}
    status = authority.get("searchStatus")
    verify_result = (
        "通过"
        if status == "verified" and evidence
        else "待复核"
        if status == "verified"
        else "找不到"
        if status == "no_evidence"
        else "服务异常"
    )
    return {
        "verify_result": verify_result,
        "source_id": "、".join(
            str(item.get("id") or "") for item in selected if item.get("id")
        ) or "—",
        "gov_url": str(evidence.get("url") or ""),
        "excerpt": "\n\n".join(
            str(item.get("body") or "") for item in selected if item.get("body")
        ),
    }


def source_label(level: str) -> str:
    return {
        "official": "官方原站",
        "dknow_trusted_search_official": "官方来源",
        "nonofficial": "非官方来源",
        "none": "无所附来源",
    }.get(level, level or "无所附来源")


def faithful_label(value: str) -> str:
    return {"supported": "符合", "contradicted": "不符合", "insufficient": "证据不足"}.get(value, "证据不足")


def metrics(points: list[dict], platforms: list[dict]) -> dict:
    output = {}
    legal_direct = [
        point
        for point in points
        if point.get("role") == "direct" and (point.get("authority") or {}).get("searchStatus") != "no_evidence"
    ]
    for platform in platforms:
        pid = platform["platform"]
        direct_entries = []
        for point in legal_direct:
            claim = (point.get("claims") or {}).get(pid) or {}
            verdict = ((point.get("authority") or {}).get("verdicts") or {}).get(pid) or {}
            direct_entries.append((claim, verdict.get("category") or "omitted"))
        covered = [(claim, category) for claim, category in direct_entries if claim.get("covered")]
        denominator = len(covered)

        def count(category: str) -> int:
            return sum(item_category == category for _, item_category in covered)

        accurate = count("direct_accurate") + count("indirect_accurate")
        hallucinated = count("coincidental") + count("misleading")
        fabricated = sum(
            ((((point.get("authority") or {}).get("verdicts") or {}).get(pid) or {}).get("category") == "fabricated")
            for point in points
        )
        reference_accurate = sum(
            point.get("role") == "reference"
            and ((((point.get("authority") or {}).get("verdicts") or {}).get(pid) or {}).get("category") in ("direct_accurate", "indirect_accurate"))
            for point in points
        )
        reference_hallucinated = sum(
            point.get("role") == "reference"
            and ((((point.get("authority") or {}).get("verdicts") or {}).get(pid) or {}).get("category") in ("coincidental", "misleading"))
            for point in points
        )
        output[pid] = {
            "覆盖率": denominator / len(legal_direct) if legal_direct else 0,
            "遗漏率": (len(legal_direct) - denominator) / len(legal_direct) if legal_direct else 0,
            "准确率": accurate / denominator if denominator else 0,
            "直接准确率": count("direct_accurate") / denominator if denominator else 0,
            "间接准确率": count("indirect_accurate") / denominator if denominator else 0,
            "官方证据支持率": (
                sum(
                    claim.get("sourceLevel") in ("official", "dknow_trusted_search_official")
                    and claim.get("faithfulness") == "supported"
                    for claim, _ in covered
                ) / denominator
                if denominator else 0
            ),
            "局部角标覆盖率": (
                sum(claim.get("referenceBinding") == "local" for claim, _ in covered) / denominator
                if denominator else 0
            ),
            "幻觉率": hallucinated / denominator if denominator else 0,
            "巧合式幻觉率": count("coincidental") / denominator if denominator else 0,
            "误导式幻觉率": count("misleading") / denominator if denominator else 0,
            "编造率": fabricated / max(1, len(points)),
            "编造数": fabricated,
            "编造式幻觉率": fabricated / max(1, len(points)),
            "参考_有价值正确": reference_accurate,
            "参考_幻觉式提醒": reference_hallucinated,
            "_N": len(legal_direct),
            "_covered": denominator,
            "_claims": len(points),
            "_fabricated": fabricated,
            "_ref_total": sum(point.get("role") == "reference" for point in points),
        }
    return output


def build_legacy(results: dict, comparison: dict, verification: dict) -> tuple[dict, dict]:
    if results.get("question") != comparison.get("question") or results.get("question") != verification.get("question"):
        raise SkillError("results、comparison、verification 的问题不一致")
    platforms = verification.get("platforms") or comparison.get("platforms") or []
    originals = original_platforms(results)
    points = verification.get("knowledgePoints") or []
    answer_points = []
    side_evaluation = {platform["platform"]: {} for platform in platforms}
    for point in points:
        authority = point.get("authority") or {}
        verdicts = authority.get("verdicts") or {}
        referenced_ids = []
        for platform in platforms:
            for evidence_id in (verdicts.get(platform["platform"]) or {}).get("evidenceIds") or []:
                if evidence_id not in referenced_ids:
                    referenced_ids.append(evidence_id)
        basis = official_basis(authority, referenced_ids)
        answer_points.append(
            {
                "id": point.get("id"),
                "desc": point.get("description"),
                "role": point.get("role"),
                "tier": "core" if point.get("core") else ("support" if point.get("role") == "direct" else "edge"),
                "official_basis": basis,
                "authoritative_finding": str(
                    authority.get("authoritativeFinding") or ""
                ),
            }
        )
        for platform in platforms:
            pid = platform["platform"]
            claim = (point.get("claims") or {}).get(pid) or {}
            verdict = verdicts.get(pid) or {}
            platform_basis = official_basis(authority, verdict.get("evidenceIds") or [])
            binding_payload = {
                "pointId": point.get("id"),
                "platform": pid,
                "claim": claim,
                "verdict": verdict,
            }
            semantic_binding_sha256 = hashlib.sha256(
                json.dumps(
                    binding_payload,
                    ensure_ascii=False,
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode("utf-8")
            ).hexdigest()
            side_evaluation[pid][point["id"]] = {
                "covered": bool(claim.get("covered")),
                "category": CATEGORY.get(verdict.get("category"), "待复核"),
                "claim": str(claim.get("claim") or ""),
                "source_type": source_label(str(claim.get("sourceLevel") or "none")),
                "reference_binding": str(claim.get("referenceBinding") or "none"),
                "faithful": faithful_label(str(claim.get("faithfulness") or "insufficient")),
                "verdict_reason": str(verdict.get("reason") or ""),
                "semantic_binding_sha256": semantic_binding_sha256,
                "verify_result": platform_basis["verify_result"],
                "provenance_attached": attached_provenance(claim, originals.get(pid, {})),
                "provenance_verify": {
                    "result": platform_basis["verify_result"],
                    "source_id": platform_basis["source_id"],
                    "gov_url": platform_basis["gov_url"],
                    "excerpt": platform_basis["excerpt"],
                },
            }
    metric_data = metrics(points, platforms)
    category_counts = {category: 0 for category in CATEGORY}
    for point in points:
        for verdict in ((point.get("authority") or {}).get("verdicts") or {}).values():
            category = verdict.get("category")
            if category in category_counts:
                category_counts[category] += 1
    summary = (
        f"共核验 {len(points)} 个知识点；直接准确 {category_counts['direct_accurate']} 项，"
        f"间接准确 {category_counts['indirect_accurate']} 项，结果巧合 {category_counts['coincidental']} 项，"
        f"严重误导 {category_counts['misleading']} 项，凭空编造 {category_counts['fabricated']} 项，"
        f"待复核 {category_counts['unverified']} 项。"
    )
    reference_analysis = {}
    for platform in platforms:
        pid = platform["platform"]
        metric = metric_data[pid]
        valuable = metric["参考_有价值正确"]
        risky = metric["参考_幻觉式提醒"]
        reference_analysis[pid] = "参考有价值" if valuable and not risky else ("参考疑似有误导" if risky else "无额外参考")
        reference_analysis[f"{pid}_note"] = f"有价值正确 {valuable} 项 · 幻觉式提醒 {risky} 项"
    findings = []
    for point in points[:8]:
        authority = point.get("authority") or {}
        finding = authority.get("authoritativeFinding") or ("官方查无" if authority.get("searchStatus") == "no_evidence" else "待复核")
        findings.append(f"{point.get('id')}：{point.get('description')}。权威结论：{finding}")
    verdict_sides = {}
    core_point = next((point for point in points if point.get("core")), points[0] if points else None)
    if core_point:
        for platform in platforms:
            pid = platform["platform"]
            verdict = (((core_point.get("authority") or {}).get("verdicts") or {}).get(pid) or {})
            category = verdict.get("category")
            verdict_sides[pid] = {
                "level": "supported" if category in ("direct_accurate", "indirect_accurate") else ("error" if category == "misleading" else ("coincidental" if category == "coincidental" else "missing")),
                "headline": verdict.get("reason") or verdict.get("category") or "待复核",
            }
    analysis = {
        "query": results.get("question"),
        "ai_info": {platform["platform"]: {"size": "当前承载智能体完成语义分析"} for platform in platforms},
        "answer_knowledge_points": answer_points,
        "side_evaluation": side_evaluation,
        "platform_metrics": metric_data,
        "head_to_head": {},
        "verdict": {"core_question": comparison.get("coreQuestion") or results.get("question"), "sides": verdict_sides} if verdict_sides else {},
        "reference_analysis": reference_analysis,
        "summary": summary,
        "key_findings": findings,
        "llm_health": {"total": len(points), "failed": category_counts["unverified"], "failures": verification.get("needsReview") or []},
        "agent_todo": verification.get("needsReview") or [],
    }
    scraped = {}
    for platform in platforms:
        pid = platform["platform"]
        original = originals.get(pid, {})
        scraped[f"{pid}_answer"] = str(original.get("answerMarkdown") or "")
        scraped[f"{pid}_refs"] = [
            {
                "webTitle": reference.get("title") or reference.get("text") or reference.get("url"),
                "url": reference_primary_url(reference),
                **{
                    key: reference.get(key)
                    for key in (
                        "originUrl",
                        "origin_url",
                        "resourceUrl",
                        "resource_url",
                        "officialUrl",
                        "official_url",
                        "sourceUrl",
                        "source_url",
                        "platformUrl",
                        "platform_url",
                        "originalUrl",
                        "original_url",
                        "contentAcquisition",
                        "originAttributionStatus",
                        "originAttributionReason",
                        "sameMaterialVerified",
                        "trustedSearchCandidateUrl",
                        "trustedSearchPublisher",
                        "trustedSearchRegion",
                        "trustedSearchDataSource",
                    )
                    if reference.get(key)
                },
                **(
                    {
                        "originalUrl": str(reference.get("url") or ""),
                    }
                    if reference_primary_url(reference)
                    and reference_primary_url(reference) != str(reference.get("url") or "")
                    and not (
                        reference.get("platformUrl")
                        or reference.get("platform_url")
                        or reference.get("originalUrl")
                        or reference.get("original_url")
                    )
                    else {}
                ),
            }
            for reference in original.get("references") or []
        ]
    return analysis, {"scraped": scraped}


def main() -> int:
    parser = argparse.ArgumentParser(description="生成平台表现与完整证据报告。")
    parser.add_argument("--results", required=True)
    parser.add_argument("--comparison", required=True)
    parser.add_argument("--verification", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--intermediate-dir")
    args = parser.parse_args()
    try:
        results = load_json(args.results)
        comparison = load_json(args.comparison)
        verification = load_json(args.verification)
        if verification.get("schemaVersion") != "fact-check-x/verification@2":
            raise SkillError("verification 必须使用 fact-check-x/verification@2")
        analysis, legacy_result = build_legacy(results, comparison, verification)
        output = Path(args.output).resolve()
        intermediate = Path(args.intermediate_dir).resolve() if args.intermediate_dir else output.parent / "report-input"
        intermediate.mkdir(parents=True, exist_ok=True)
        analysis_path = intermediate / "legacy-analysis.json"
        result_path = intermediate / "legacy-result.json"
        dump_json(analysis_path, analysis)
        dump_json(result_path, legacy_result)
        generator = Path(__file__).resolve().parent / "render_platform_report.py"
        proc = subprocess.run(
            [sys.executable, str(generator), "--analysis", str(analysis_path), "--result", str(result_path), "--out", str(output), "--no-open"],
            text=True,
            capture_output=True,
            check=False,
        )
        if proc.returncode:
            raise SkillError(proc.stdout or proc.stderr or "平台表现与完整证据报告生成失败")
        metrics_json = json.dumps(analysis["platform_metrics"], ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        metrics_sha256 = hashlib.sha256(metrics_json.encode("utf-8")).hexdigest()
        html = output.read_text(encoding="utf-8")
        marker = f'<meta name="fact-check-x-metrics-sha256" content="{metrics_sha256}" />'
        output.write_text(html.replace("</head>", f"  {marker}\n</head>", 1), encoding="utf-8")
        print(json.dumps({"status": "completed", "output": str(output), "analysis": str(analysis_path), "result": str(result_path)}, ensure_ascii=False))
        return 0
    except (SkillError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
