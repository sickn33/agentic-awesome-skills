#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from common import SkillError, clipped, dump_json, load_json, now_iso


def trusted_search_timeout_seconds() -> float:
    raw = os.getenv("FACTCHECK_TRUSTED_SEARCH_TIMEOUT_SECONDS", "90").strip()
    try:
        return max(10.0, min(float(raw), 300.0))
    except ValueError:
        return 90.0


def trusted_search_ssl_context() -> ssl.SSLContext:
    candidates: list[str] = []
    try:
        import certifi

        candidates.append(certifi.where())
    except ImportError:
        pass
    defaults = ssl.get_default_verify_paths()
    candidates.extend(
        path
        for path in (
            defaults.cafile,
            "/etc/ssl/cert.pem",
            "/opt/homebrew/etc/openssl@3/cert.pem",
            "/usr/local/etc/openssl@3/cert.pem",
        )
        if path
    )
    for candidate in dict.fromkeys(candidates):
        if Path(candidate).is_file():
            return ssl.create_default_context(cafile=candidate)
    return ssl.create_default_context()


def validate_request(request: dict) -> None:
    if not isinstance(request, dict) or request.get("schemaVersion") != "fact-check-x/authority-request@1":
        raise SkillError("请求必须使用 fact-check-x/authority-request@1")
    request_id = str(request.get("requestId") or "").strip()
    point = request.get("knowledgePoint") or {}
    if not request_id or point.get("id") != request_id or not str(point.get("description") or "").strip():
        raise SkillError("requestId 与单知识点对象不一致")
    payload = request.get("cloudPayload")
    if not isinstance(payload, dict) or set(payload) - {"title", "knowledgePoint", "differingClaims"}:
        raise SkillError("cloudPayload 只能包含 title、knowledgePoint 和可选 differingClaims")
    if payload.get("title") != request.get("title") or (payload.get("knowledgePoint") or {}).get("id") != request_id:
        raise SkillError("cloudPayload 必须对应当前总标题和唯一知识点")
    differing = payload.get("differingClaims")
    status = request.get("comparisonStatus")
    if differing is not None and status not in ("conflict", "partial", "mostly_consensus"):
        raise SkillError("只有 conflict、partial 或 mostly_consensus 才能上传 differingClaims")
    if differing is not None:
        values = {str(item.get("claim") or "").strip() for item in differing if isinstance(item, dict)}
        if len(values - {""}) < 2:
            raise SkillError("differingClaims 必须包含至少两种不同主张")


def parse_articles(data: dict, limit: int) -> list[dict]:
    articles = (((data.get("content") or {}).get("data") or {}).get("检索文章") or [])
    output = []
    for index, article in enumerate(articles[:limit], 1):
        full = str(article.get("全文") or "").strip()
        segments = "\n".join(str(segment.get("内容") or "").strip() for segment in article.get("段落") or [] if isinstance(segment, dict) and str(segment.get("内容") or "").strip())
        body = (segments + "\n" + full).strip() if full and segments and segments not in full else (full or segments)
        if body:
            output.append({"id": f"E{index}", "title": clipped(article.get("文章标题"), 240), "url": str(article.get("源网址") or ""), "date": str(article.get("发布日期") or ""), "body": clipped(body, 6000)})
    return output


def build_query(payload: dict) -> str:
    point = payload.get("knowledgePoint") or {}
    parts = [str(payload.get("title") or "").strip(), str(point.get("description") or "").strip()]
    differing = payload.get("differingClaims")
    if differing:
        parts.append("；".join(f"{item.get('platform')}：{item.get('claim')}" for item in differing))
    return clipped(" ".join(part for part in parts if part), 500)


def trusted_search(query: str, service_area: str, limit: int) -> dict:
    key = os.getenv("TRUSTED_SEARCH_KEY", "").strip()
    if not key:
        raise SkillError("未配置 TRUSTED_SEARCH_KEY")
    endpoint = os.getenv("FACTCHECK_TRUSTED_SEARCH_URL", "https://open.dknowc.cn/dependable/search").strip()
    payload: dict[str, Any] = {"query": query, "segmentCount": 10, "simplified": True, "return_full_content": True}
    if service_area:
        payload["service_area"] = [service_area]
    request = urllib.request.Request(endpoint, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), method="POST", headers={"Content-Type": "application/json", "api-key": key})
    try:
        with urllib.request.urlopen(
            request,
            timeout=trusted_search_timeout_seconds(),
            context=trusted_search_ssl_context(),
        ) as response:
            raw = response.read().decode("utf-8")
            status = response.status
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        return {"status": "service_error", "error": f"HTTP {exc.code}: {detail}", "evidence": []}
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return {"status": "service_error", "error": str(exc), "evidence": []}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        return {"status": "service_error", "error": f"响应不是有效 JSON: {exc}", "evidence": []}
    code = data.get("code") if isinstance(data, dict) else None
    if not isinstance(data, dict) or status != 200 or code not in (None, 0, 200):
        return {"status": "service_error", "error": str(data.get("msg") if isinstance(data, dict) else "异常响应"), "evidence": []}
    evidence = parse_articles(data, limit)
    return {"status": "verified" if evidence else "no_evidence", "error": "", "evidence": evidence}


def fixture_search(fixture: object) -> dict:
    if isinstance(fixture, dict) and fixture.get("delayMs"):
        time.sleep(max(0, min(float(fixture["delayMs"]), 2000)) / 1000)
    if isinstance(fixture, dict) and fixture.get("status") == "service_error":
        return {"status": "service_error", "error": str(fixture.get("error") or "测试服务异常"), "evidence": []}
    raw = fixture if isinstance(fixture, list) else (fixture.get("evidence") if isinstance(fixture, dict) else [])
    evidence = []
    for index, item in enumerate(raw or [], 1):
        evidence.append({"id": str(item.get("id") or f"E{index}"), "title": clipped(item.get("title"), 240), "url": str(item.get("url") or ""), "date": str(item.get("date") or ""), "body": clipped(item.get("body"), 6000)})
    return {"status": "verified" if evidence else "no_evidence", "error": "", "evidence": evidence}


def anchor_evidence(anchor: dict) -> list[dict]:
    output = []
    for index, item in enumerate(anchor.get("evidence") or [], 1):
        output.append({
            "id": str(item.get("id") or f"E{index}"),
            "title": str(item.get("title") or "深知晓所附官方依据"),
            "url": str(item.get("url") or ""),
            "date": "",
            "body": str(item.get("excerpt") or ""),
            "contentAcquisition": str(item.get("contentAcquisition") or ""),
            "sameMaterialVerified": item.get("sameMaterialVerified") is True,
            "originAttributionStatus": str(item.get("originAttributionStatus") or ""),
            "platformUrl": str(item.get("platformUrl") or ""),
            "zone": str(item.get("zone") or ""),
            "platformTrustSource": str(item.get("platformTrustSource") or ""),
        })
    if not output:
        raise SkillError("eligible=true 的深知晓锚点缺少官方证据")
    return output


def valid_trusted_anchor(request: dict) -> bool:
    anchor = request.get("trustedAnchor") or {}
    claim = (request.get("claims") or {}).get("dknowc-chat") or {}
    if not (
        anchor.get("eligible")
        and anchor.get("platform") == "dknowc-chat"
        and anchor.get("trustedSearchUsed")
        and claim.get("covered")
        and claim.get("faithfulness") == "supported"
        and claim.get("sourceLevel") in {"official", "dknow_trusted_search_official"}
    ):
        return False
    evidence = anchor.get("evidence") or []
    if not evidence:
        return False
    for item in evidence:
        parsed = urlparse(str(item.get("url") or ""))
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return False
        if not isinstance(item.get("referenceIndex"), int) or item["referenceIndex"] < 1:
            return False
        if not str(item.get("excerpt") or "").strip():
            return False
        candidate_urls = [
            str(item.get("url") or ""),
            str(item.get("platformUrl") or ""),
        ]
        internal = any(
            (
                (
                    (urlparse(url).hostname or "").lower() == "dknowc.cn"
                    or (urlparse(url).hostname or "").lower().endswith(".dknowc.cn")
                )
                and (
                    "/wlcb/shenzhi-policy/" in (urlparse(url).path or "").lower()
                    or "/DT_DATA/" in url.upper()
                )
            )
            for url in candidate_urls
        ) or str(item.get("zone") or "").strip().upper() == "DT_DATA"
        internal = (
            internal
            and item.get("platformTrustSource") == "dknow_reference_capture"
        )
        captured_by_dknow = (
            item.get("platformTrustSource") == "dknow_reference_capture"
        )
        hydrated = (
            item.get("contentAcquisition") == "trusted_search_full_content"
            and item.get("sameMaterialVerified") is True
            and item.get("originAttributionStatus")
            in {"trusted_search_official_url", "trusted_search_no_source_url"}
        )
        if not (internal or captured_by_dknow or hydrated):
            return False
    selected = [
        {
            "id": str(item.get("id") or f"A{index}"),
            "body": str(item.get("excerpt") or ""),
        }
        for index, item in enumerate(evidence, 1)
    ]
    ids = [item["id"] for item in selected]
    if not evidence_supports_claim(claim, selected, ids):
        return False
    if not evidence_supports_claim(
        {"claim": str(anchor.get("officialAnswer") or "")}, selected, ids
    ):
        return False
    return True


def acquire(request: dict, service_area: str = "", limit: int = 6, fixture: object | None = None) -> dict:
    validate_request(request)
    anchor = request.get("trustedAnchor") or {}
    query = build_query(request["cloudPayload"])
    if valid_trusted_anchor(request):
        result = {"status": "verified", "error": "", "evidence": anchor_evidence(anchor)}
        mode = "dknow_exempt"
        count = 0
    else:
        result = fixture_search(fixture) if fixture is not None else trusted_search(query, service_area, limit)
        mode = "trusted_search"
        count = 1
    return {
        "schemaVersion": "fact-check-x/authority-evidence@1",
        "requestId": request["requestId"],
        "createdAt": now_iso(),
        "status": result["status"],
        "searchMode": mode,
        "requestCount": count,
        "query": query,
        "serviceArea": service_area,
        "error": result.get("error", ""),
        "evidence": result.get("evidence") or [],
    }


def normalize_verdict(item: dict, claim: dict, evidence_ids: set[str]) -> dict:
    verdict = item.get("verdict")
    if verdict not in ("supported", "contradicted", "insufficient"):
        verdict = "insufficient"
    ids = [evidence_id for evidence_id in item.get("evidenceIds") or [] if evidence_id in evidence_ids]
    if verdict in ("supported", "contradicted") and not ids:
        verdict = "insufficient"
    if verdict == "supported":
        if claim.get("faithfulness") == "supported" and claim.get("sourceLevel") in (
            "official",
            "dknow_trusted_search_official",
        ):
            category = "direct_accurate"
        elif claim.get("faithfulness") == "supported" and claim.get("sourceLevel") == "nonofficial":
            category = "indirect_accurate"
        else:
            category = "coincidental"
    elif verdict == "contradicted":
        category = "misleading"
    else:
        category = "unverified"
    return {"verdict": verdict, "category": category, "reason": clipped(item.get("reason"), 600), "evidenceIds": ids}


def evidence_supports_claim(claim: dict, evidence_items: list[dict], ids: list[str]) -> bool:
    selected = "\n".join(
        str(item.get("body") or "")
        for item in evidence_items
        if str(item.get("id")) in set(ids)
    )
    claim_text = str(claim.get("claim") or "")
    numeric = re.findall(r"\d+(?:\.\d+)?", claim_text)
    compact_claim = re.sub(r"\s+", "", claim_text)
    compact_selected = re.sub(r"\s+", "", selected)
    claim_context = re.sub(
        r"\d+(?:\.\d+)?|[^\w\u4e00-\u9fff]", "", compact_claim
    )
    selected_context = re.sub(
        r"\d+(?:\.\d+)?|[^\w\u4e00-\u9fff]", "", compact_selected
    )
    context_windows = {
        claim_context[index:index + 4]
        for index in range(max(1, len(claim_context) - 3))
        if len(claim_context[index:index + 4]) == 4
    }
    context_supported = bool(context_windows) and any(
        window in selected_context for window in context_windows
    )
    if numeric:
        contradictory = any(
            re.search(
                rf"(?:并非|不是|不再是|错误(?:地|为)?|已取消).{{0,8}}{re.escape(value)}"
                rf"|{re.escape(value)}.{{0,8}}(?:不适用|已取消|错误)",
                selected,
            )
            for value in numeric
        )
        if (
            not contradictory
            and context_supported
            and all(value in selected for value in numeric)
        ):
            return True
        premise = " ".join(str(item.get("excerpt") or "") for item in claim.get("evidence") or [])
        premise_numeric = re.findall(r"\d+(?:\.\d+)?", premise)
        premise_context = re.sub(
            r"\d+(?:\.\d+)?|[^\w\u4e00-\u9fff]",
            "",
            re.sub(r"\s+", "", premise),
        )
        premise_windows = {
            premise_context[index:index + 4]
            for index in range(max(1, len(premise_context) - 3))
            if len(premise_context[index:index + 4]) == 4
        }
        premise_context_supported = bool(premise_windows) and any(
            window in selected_context for window in premise_windows
        )
        return (
            not contradictory
            and premise_context_supported
            and bool(premise_numeric)
            and all(value in selected for value in premise_numeric)
        )
    return any(compact_claim[index:index + 4] in re.sub(r"\s+", "", selected) for index in range(max(0, len(compact_claim) - 3)))


def validate_assessment(request: dict, evidence: dict, assessment: dict) -> None:
    if evidence.get("status") != "verified":
        return
    anchor_mode = evidence.get("searchMode") == "dknow_exempt"
    if anchor_mode:
        anchor = request.get("trustedAnchor") or {}
        if not valid_trusted_anchor(request):
            raise SkillError("dknow_exempt 请求不再满足可信锚点条件")
        if evidence.get("evidence") != anchor_evidence(anchor):
            raise SkillError("dknow_exempt 证据包与可信锚点不一致")
    if not isinstance(assessment, dict) or not assessment:
        raise SkillError("已取得权威证据，但缺少裁决文件；必须提供 authoritativeFinding 和 verdicts")
    if "platformAssessment" in assessment or ("verdict" in assessment and "verdicts" not in assessment):
        raise SkillError("裁决文件结构错误：不接受 platformAssessment 或顶层 verdict；请使用 authoritativeFinding 和 verdicts")
    finding = assessment.get("authoritativeFinding")
    if not isinstance(finding, str) or not finding.strip():
        raise SkillError("裁决文件缺少非空 authoritativeFinding")
    verdicts = assessment.get("verdicts")
    if not isinstance(verdicts, dict):
        raise SkillError("裁决文件的 verdicts 必须是按平台 ID 组织的对象")

    claims = request.get("claims") or {}
    unknown_platforms = set(verdicts) - set(claims)
    if unknown_platforms:
        raise SkillError(f"裁决文件包含未知平台：{sorted(unknown_platforms)}")
    evidence_ids = {str(item.get("id")) for item in evidence.get("evidence") or []}
    for platform, claim in claims.items():
        if not claim.get("covered"):
            continue
        item = verdicts.get(platform)
        if not isinstance(item, dict):
            raise SkillError(f"裁决文件缺少已覆盖平台 {platform} 的 verdicts 条目")
        verdict = item.get("verdict")
        if verdict not in ("supported", "contradicted", "insufficient"):
            raise SkillError(f"{platform} 的 verdict 必须是 supported、contradicted 或 insufficient")
        if not isinstance(item.get("reason"), str) or not item["reason"].strip():
            raise SkillError(f"{platform} 的裁决缺少非空 reason")
        ids = item.get("evidenceIds")
        if not isinstance(ids, list) or any(not isinstance(value, str) or not value.strip() for value in ids):
            raise SkillError(f"{platform} 的 evidenceIds 必须是证据 ID 字符串数组")
        invalid_ids = set(ids) - evidence_ids
        if invalid_ids:
            raise SkillError(f"{platform} 引用了证据包中不存在的 evidenceIds：{sorted(invalid_ids)}")
        if verdict in ("supported", "contradicted") and not ids:
            raise SkillError(f"{platform} 的 {verdict} 裁决必须至少引用一个 evidenceId")
        if anchor_mode and platform == "dknowc-chat" and verdict != "supported":
            raise SkillError("合法 trustedAnchor 已建立，dknowc-chat 必须裁决为 supported；请在本阶段重写 assessment")
        if verdict == "supported" and not anchor_mode and not evidence_supports_claim(
            claim, evidence.get("evidence") or [], ids
        ):
            raise SkillError(f"{platform} 的 supported 裁决所引证据无法定位当前主张")


def finalize(request: dict, evidence: dict, assessment: dict) -> dict:
    validate_request(request)
    if evidence.get("schemaVersion") != "fact-check-x/authority-evidence@1" or evidence.get("requestId") != request.get("requestId"):
        raise SkillError("证据包与当前请求不一致")
    status = evidence.get("status")
    validate_assessment(request, evidence, assessment)
    evidence_ids = {str(item.get("id")) for item in evidence.get("evidence") or []}
    verdicts = {}
    needs_review = []
    for pid, claim in (request.get("claims") or {}).items():
        if not claim.get("covered"):
            verdicts[pid] = {"verdict": "omitted", "category": "omitted", "reason": "该平台未覆盖此知识点。", "evidenceIds": []}
        elif status == "no_evidence":
            verdicts[pid] = {
                "verdict": "insufficient",
                "category": "unverified",
                "reason": "本次可信搜索未返回可用于裁决的权威材料，不能据此判定主张真假。",
                "evidenceIds": [],
            }
            needs_review.append({
                "platform": pid,
                "reason": "可信搜索结果为空；未检索到证据不等于主张已被证伪",
            })
        elif status == "service_error":
            verdicts[pid] = {"verdict": "insufficient", "category": "unverified", "reason": evidence.get("error") or "可信搜索服务异常。", "evidenceIds": []}
            needs_review.append({"platform": pid, "reason": "可信搜索服务异常，不能据此判定主张真假"})
        elif status == "verified":
            verdicts[pid] = normalize_verdict(((assessment.get("verdicts") or {}).get(pid) or {}), claim, evidence_ids)
            if evidence.get("searchMode") == "dknow_exempt" and pid == "dknowc-chat":
                verdicts[pid]["verdict"] = "supported"
                verdicts[pid]["category"] = "direct_accurate"
            if verdicts[pid]["category"] == "unverified":
                needs_review.append({"platform": pid, "reason": "已取得权威证据，但当前智能体尚未完成有据裁决"})
        else:
            raise SkillError(f"未知证据状态: {status}")
    finding = clipped(assessment.get("authoritativeFinding"), 1200) if status == "verified" else ""
    if status == "verified" and not finding:
        needs_review.append({"reason": "缺少权威结论"})
    return {
        "schemaVersion": "fact-check-x/authority-result@1",
        "requestId": request["requestId"],
        "createdAt": now_iso(),
        "status": "needs_review" if needs_review else "completed",
        "searchStatus": status,
        "searchMode": evidence.get("searchMode"),
        "requestCount": evidence.get("requestCount"),
        "knowledgePoint": request.get("knowledgePoint"),
        "claims": request.get("claims") or {},
        "authoritativeFinding": finding,
        "evidence": evidence.get("evidence") or [],
        "verdicts": verdicts,
        "needsReview": needs_review,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="单知识点可信搜索与权威核验。")
    subparsers = parser.add_subparsers(dest="command", required=True)
    search = subparsers.add_parser("search")
    search.add_argument("--request", required=True)
    search.add_argument("--output", required=True)
    search.add_argument("--service-area", default="")
    search.add_argument("--limit", type=int, default=6)
    search.add_argument("--fixture")
    final = subparsers.add_parser("finalize")
    final.add_argument("--request", required=True)
    final.add_argument("--evidence", required=True)
    final.add_argument("--assessment")
    final.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        request = load_json(args.request)
        if args.command == "search":
            fixture = load_json(args.fixture) if args.fixture else None
            result = acquire(request, args.service_area.strip(), max(1, min(args.limit, 10)), fixture)
        else:
            evidence = load_json(args.evidence)
            assessment = load_json(args.assessment) if args.assessment else {}
            result = finalize(request, evidence, assessment)
        dump_json(args.output, result)
        print(json.dumps({"status": result.get("status"), "output": str(Path(args.output).resolve()), "searchMode": result.get("searchMode"), "requestCount": result.get("requestCount")}, ensure_ascii=False))
        return 0
    except (SkillError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
