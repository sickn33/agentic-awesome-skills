#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse

from common import SkillError, clipped, dump_json, load_json, now_iso


OFFICIAL_MEDIA = ("people.com.cn", "xinhuanet.com", "qstheory.cn", "gmw.cn")
OFFICIAL_ORIGIN_KEYS = (
    "originUrl",
    "origin_url",
    "resourceUrl",
    "resource_url",
    "officialUrl",
    "official_url",
    "sourceUrl",
    "source_url",
)


def is_official_url(url: object) -> bool:
    host = (urlparse(str(url or "")).hostname or "").lower()
    if host == "gov.cn" or host.endswith(".gov.cn") or any(host == domain or host.endswith("." + domain) for domain in OFFICIAL_MEDIA):
        return True
    return False


def verified_official_origin(reference: dict) -> str:
    for key in OFFICIAL_ORIGIN_KEYS:
        candidate = str(reference.get(key) or "").strip()
        if candidate and is_official_url(candidate):
            return candidate
    return ""


def is_dknow_trusted_reference(reference: dict, platform_id: str = "") -> bool:
    if platform_id != "dknowc-chat":
        return False
    # 深知晓的来源列表本身由可信搜索生成。外部官方链接和深知内部
    # 收录链接均属于同一可信来源链，不因链接形态不同而降级。
    url = str(
        reference.get("url")
        or reference.get("platformUrl")
        or reference.get("platform_url")
        or reference.get("originalUrl")
        or reference.get("original_url")
        or ""
    ).strip()
    parsed = urlparse(url)
    return (
        parsed.scheme in {"http", "https"}
        and bool(parsed.netloc)
        and bool(reference_text(reference))
    )


def has_trusted_dknow_provenance(reference: dict, platform_id: str = "") -> bool:
    return is_dknow_trusted_reference(reference, platform_id)


def canonicalize_policy_expression(value: object) -> str:
    text = re.sub(r"\s+", "", str(value or "")).replace(",", "")
    text = re.sub(r"(\d+(?:\.\d+)?)元/(?:每)?人/(?:每)?月", r"\1元每人每月", text)
    text = text.replace("每月每人", "每人每月")
    for variant in (
        "最高可提取额度",
        "最高提取额度",
        "最高可提取",
        "最高提取",
        "可提取额度",
        "提取限额",
    ):
        text = text.replace(variant, "提取额度")
    return text


def text_supports_claim(claim: object, evidence: object) -> bool:
    claim_text = canonicalize_policy_expression(claim)
    evidence_text = canonicalize_policy_expression(evidence)
    if not claim_text or not evidence_text:
        return False
    if (
        re.search(r"(?:可能|或许|据称|通常|一般情况下)", evidence_text)
        and not re.search(r"(?:可能|或许|据称|通常|一般情况下)", claim_text)
    ):
        return False
    numeric = re.findall(r"\d+(?:\.\d+)?", claim_text)
    normalized_evidence = evidence_text
    claim_context = re.sub(
        r"\d+(?:\.\d+)?|[^\w\u4e00-\u9fff]",
        "",
        claim_text,
    )
    evidence_context = re.sub(
        r"\d+(?:\.\d+)?|[^\w\u4e00-\u9fff]",
        "",
        normalized_evidence,
    )
    context_windows = {
        claim_context[index:index + 4]
        for index in range(max(1, len(claim_context) - 3))
        if len(claim_context[index:index + 4]) == 4
    }
    context_supported = bool(context_windows) and any(
        window in evidence_context for window in context_windows
    )
    for value in numeric:
        if value not in normalized_evidence:
            return False
        escaped = re.escape(value)
        if re.search(
            rf"(?:并非|不是|不再是|错误(?:地|为)?|已取消).{{0,8}}{escaped}"
            rf"|{escaped}.{{0,8}}(?:不适用|已取消|错误)",
            normalized_evidence,
        ):
            return False
    if numeric:
        return context_supported
    windows = {
        claim_text[index:index + 4]
        for index in range(max(1, len(claim_text) - 3))
        if len(claim_text[index:index + 4]) == 4
    }
    return bool(windows) and any(window in evidence_text for window in windows)


def source_level(reference: dict, platform_id: str = "") -> str:
    url = str(reference.get("url") or "")
    host = (urlparse(url).hostname or "").lower()
    if is_dknow_trusted_reference(reference, platform_id):
        return "dknow_trusted_search_official"
    if is_official_url(url):
        return "official"
    return "nonofficial" if host else "none"


def reference_text(reference: dict) -> str:
    parts = []
    for key in ("snippet", "text", "content", "body"):
        value = str(reference.get(key) or "").strip()
        if value and value not in parts:
            parts.append(value)
    return "\n".join(parts)


def semantic_overlap_score(claim: str, evidence: str) -> tuple[float, int, int]:
    compact_claim = re.sub(r"\s+", "", claim)
    compact_evidence = re.sub(r"\s+", "", evidence)
    if not compact_claim or not compact_evidence:
        return (0.0, 0, 0)
    grams = {
        compact_claim[index:index + 2]
        for index in range(max(1, len(compact_claim) - 1))
        if len(compact_claim[index:index + 2]) == 2
    }
    overlap = sum(gram in compact_evidence for gram in grams)
    coverage = overlap / max(1, len(grams))
    numeric = re.findall(r"\d+(?:\.\d+)?", compact_claim.replace(",", ""))
    numeric_hits = sum(value in compact_evidence.replace(",", "") for value in numeric)
    return (coverage, numeric_hits, -len(evidence))


def evidence_windows(reference: dict, max_chars: int = 1800) -> list[str]:
    text = reference_text(reference)
    if not text:
        return []
    spans = [
        match.span()
        for match in re.finditer(r"[^。！？；!?\n]+(?:[。！？；!?]+|(?=\n|$))", text)
        if match.group(0).strip()
    ]
    candidates = []
    seen = set()
    for start_index, (start, _) in enumerate(spans):
        for end_index in range(start_index, min(len(spans), start_index + 6)):
            end = spans[end_index][1]
            candidate = text[start:end].strip()
            if not candidate or len(candidate) > max_chars:
                break
            if candidate not in seen:
                seen.add(candidate)
                candidates.append(candidate)
    for paragraph in text.splitlines():
        candidate = paragraph.strip()
        if candidate and len(candidate) <= max_chars and candidate not in seen:
            seen.add(candidate)
            candidates.append(candidate)
    return candidates


def supporting_excerpt(reference: dict, claim: str) -> str:
    candidates = [
        candidate
        for candidate in evidence_windows(reference)
        if text_supports_claim(claim, candidate)
    ]
    if not candidates:
        return ""
    return max(candidates, key=lambda item: semantic_overlap_score(claim, item))


def marker_occurs(answer: str, marker: str, known_markers: set[str] | None = None) -> bool:
    marker = marker.strip()
    if not marker:
        return False
    escaped = re.escape(marker)
    if re.search(rf"(?:\[{escaped}\]|【{escaped}】|〔{escaped}〕)", answer):
        return True
    if marker.isdigit() and len(marker) <= 3:
        # Some answer UIs emit a complete short marker such as 113, while others
        # flatten adjacent one/two-digit markers into a trailing cluster such as
        # 123. If the whole cluster is a known marker, exact-marker semantics win;
        # otherwise retain the legacy cluster decomposition for one/two-digit refs.
        clusters = re.findall(
            r"(?<!\d)(\d{1,3})(?=[。！？；，、!?:：;)]|[.,](?!\d)|$)",
            answer,
        )
        known = known_markers or set()
        for cluster in clusters:
            if cluster in known:
                if marker == cluster:
                    return True
                continue
            if len(marker) <= 2 and marker in cluster:
                return True
    return marker.isdigit() and len(marker) >= 5 and bool(re.search(rf"(?<!\d){escaped}(?!\d)", answer))


def inline_reference_indexes(text: str, references: list[dict]) -> set[int]:
    known_markers = {
        str(reference.get("marker") or "").strip()
        for reference in references
        if str(reference.get("marker") or "").strip()
    }
    return {
        index
        for index, reference in enumerate(references, 1)
        if marker_occurs(text, str(reference.get("marker") or ""), known_markers)
    }


def declared_cluster_reference_indexes(
    text: str,
    references: list[dict],
    declared_indexes: list[int],
) -> set[int]:
    if len(declared_indexes) < 2:
        return set()
    markers = [
        str(references[index - 1].get("marker") or "").strip()
        for index in declared_indexes
    ]
    if any(not marker.isdigit() or len(marker) > 2 for marker in markers):
        return set()
    combined = "".join(markers)
    if not 2 <= len(combined) <= 3:
        return set()
    clusters = re.findall(
        r"(?<![\d\[【〔])(\d{2,3})(?=[。！？；，、!?:：;)]|[.,](?!\d)|$)",
        text,
    )
    return set(declared_indexes) if combined in clusters else set()


def citation_scope(reference: dict, answer: str) -> str:
    declared = str(reference.get("citationScope") or "").strip().lower()
    if declared in ("inline", "global", "inline_and_global"):
        return declared
    return "inline"


def validate_results(data: dict) -> tuple[str, list[dict]]:
    if not isinstance(data, dict) or data.get("schemaVersion") != "1":
        raise SkillError("results.json 必须使用 schemaVersion=1")
    question = str(data.get("question") or "").strip()
    if not question:
        raise SkillError("results.json 缺少 question")
    successful = []
    seen = set()
    for platform in data.get("platforms") or []:
        pid = str(platform.get("platform") or "").strip()
        if not pid or pid in seen:
            raise SkillError("平台标识必须非空且唯一")
        seen.add(pid)
        if platform.get("status") == "success" and str(platform.get("answerMarkdown") or "").strip():
            successful.append(platform)
    if len(successful) < 1:
        raise SkillError("1.1 至少需要一个成功且非空的平台回答")
    return question, successful


def task_platform(platform: dict) -> dict:
    answer = str(platform.get("answerMarkdown") or "")
    references = []
    explicit = []
    known_markers = {
        str(reference.get("marker") or "").strip()
        for reference in platform.get("references") or []
        if str(reference.get("marker") or "").strip()
    }
    for index, reference in enumerate(platform.get("references") or [], 1):
        marker = str(reference.get("marker") or "").strip()
        scope = citation_scope(reference, answer)
        if marker_occurs(answer, marker, known_markers):
            explicit.append(index)
        normalized_reference = {
            "index": index,
            "title": str(reference.get("title") or reference.get("text") or reference.get("url") or ""),
            "originalUrl": str(reference.get("url") or ""),
            "normalizedUrl": str(reference.get("normalizedUrl") or ""),
            "marker": marker,
            "citationScope": scope,
            "sourceLevel": source_level(reference, str(platform.get("platform") or "")),
            "capturedText": reference_text(reference),
        }
        for field in (
            "platformTrustSource",
            "contentAcquisition",
            "originAttributionStatus",
            "zone",
        ):
            value = str(reference.get(field) or "").strip()
            if value:
                normalized_reference[field] = value
        if reference.get("sameMaterialVerified") is True:
            normalized_reference["sameMaterialVerified"] = True
        platform_url = str(
            reference.get("platformUrl")
            or reference.get("platform_url")
            or reference.get("originalUrl")
            or reference.get("original_url")
            or ""
        )
        if platform_url and platform_url != normalized_reference["originalUrl"]:
            normalized_reference["platformUrl"] = platform_url
        official_origin = verified_official_origin(reference)
        if official_origin:
            normalized_reference["verifiedOfficialOriginUrl"] = official_origin
        references.append(normalized_reference)
    global_indexes = [
        reference["index"]
        for reference in references
        if reference["citationScope"] in ("global", "inline_and_global")
    ]
    citation_mode = (
        "mixed"
        if explicit and global_indexes
        else "explicit"
        if explicit
        else "global"
        if global_indexes
        else "source_labels_only"
        if platform.get("sourceMentions")
        else "unmarked"
    )
    return {
        "platform": platform["platform"],
        "label": platform.get("label") or platform["platform"],
        "answerMarkdown": answer,
        "citationMode": citation_mode,
        "explicitCitationReferenceIndexes": explicit,
        "globalReferenceIndexes": global_indexes,
        "references": references,
        "sourceMentions": [
            {
                "label": str(item.get("label") or ""),
                "marker": str(item.get("marker") or ""),
                "occurrenceCount": int(item.get("occurrenceCount") or 1),
            }
            for item in platform.get("sourceMentions") or []
            if str(item.get("label") or "").strip()
        ],
    }


def build_task(question: str, platforms: list[dict]) -> dict:
    return {
        "schemaVersion": "fact-check-x/comparison-task@1",
        "task": "由当前运行载体完成知识点结构化对比",
        "question": question,
        "rules": [
            "只使用任务包中的原始回答和已捕获来源，不使用可信搜索、网络搜索或外部模型 API",
            "合并所有平台的原子事实；同一事实的不同值放在同一知识点",
            "role=direct 表示缺少该点就没有直接回答用户问题，其余为 reference",
            "每个平台逐点填写 covered、claim、citedReferenceIndexes、faithfulness、reason 和 evidence",
            "covered=true 时必须填写 answerExcerpt；它必须是原回答的连续原文子串，并覆盖当前原子主张",
            "逐句脚标来源只有在脚标实际出现在当前 answerExcerpt 内时才算与该主张局部绑定；不得用答案后段的脚标反向支持前段主张",
            "局部脚标优先：当前 answerExcerpt 已有局部脚标时，只能使用局部绑定来源，不得再用回答后段或回答级官方来源抬高该主张",
            "当前 answerExcerpt 没有局部脚标时，可填写 answerLevelReferenceIndexes，从本次回答明确返回的参考资料中逐主张做语义匹配；每个索引都必须提供 capturedText 原文证据",
            "回答级语义匹配不是整篇来源自动继承：只有证据原文实际支持当前主张才能判 supported，支持其他补充点的官方来源不得抬高核心点",
            "citationMode=mixed 表示平台同时提供逐句脚标与全局来源列表，不能因存在脚标就丢弃全局来源",
            "sourceMentions 只是页面显示但未暴露 URL 的来源标签，不是可回溯参考文献，不能用于来源忠实性证据",
            "深知晓可信搜索返回的 dknowc / DT_DATA 来源按产品规则属于官方来源，内部链接不构成降级理由；但仍必须与当前主张局部绑定或通过允许的回答级语义匹配绑定",
            "evidence.excerpt 必须是对应 capturedText 的原文子串",
            "comparison.status 只比较平台主张的事实语义；主张语义相同即 consensus，不得因来源忠实性等级不同降为 partial",
            "核心结论、适用对象和关键条件相同，仅有不改变结论的轻微措辞、范围说明或细节差异时使用 mostly_consensus（外显“基本一致”）",
            "存在会改变适用性、风险判断或结论的重要条件缺失或新增时使用 partial；结论互斥时使用 conflict",
            "不以 normalizedUrl 或重新搜索的 URL 替换 originalUrl",
            "trustedAnchor 只允许用于深知晓已使用可信搜索、回答忠实且有官方原文的知识点",
            "必须生成 synthesisDraft：它只综合本阶段知识点，不得冒充权威结论，status 固定为 unverified",
        ],
        "outputShape": {
            "coreQuestion": "核心问题",
            "synthesisDraft": {
                "status": "unverified",
                "answer": "基于各平台知识点合并形成的综合草案；明确保留冲突、缺口和条件",
                "basisKnowledgePointIds": ["K1"],
            },
            "knowledgePoints": [
                {
                    "description": "一个原子事实",
                    "role": "direct",
                    "core": True,
                    "claims": {"platform-id": {"covered": True, "claim": "...", "answerExcerpt": "包含当前主张及相连脚标的原回答子串", "citedReferenceIndexes": [1], "answerLevelReferenceIndexes": [], "faithfulness": "supported", "reason": "...", "evidence": [{"referenceIndex": 1, "excerpt": "原文"}]}},
                    "comparison": {"status": "consensus", "summary": "精确说明主张属于一致、基本一致、部分一致还是冲突"},
                    "trustedAnchor": {"eligible": True, "platform": "dknowc-chat", "trustedSearchUsed": True, "officialAnswer": "...", "evidence": [{"referenceIndex": 1, "excerpt": "官方原文"}]},
                }
            ],
        },
        "platforms": [task_platform(platform) for platform in platforms],
    }


def normalize_evidence(items: object, references: list[dict], allowed_indexes: set[int]) -> tuple[list[dict], bool]:
    evidence = []
    invalid = False
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            invalid = True
            continue
        index = item.get("referenceIndex")
        excerpt = str(item.get("excerpt") or "").strip()
        if not isinstance(index, int) or index not in allowed_indexes or not excerpt:
            invalid = True
            continue
        captured = reference_text(references[index - 1])
        if captured and excerpt in captured:
            evidence.append({"referenceIndex": index, "excerpt": excerpt})
        else:
            invalid = True
    return evidence, invalid


def normalize_claim(raw: object, platform: dict, kid: str, needs_review: list[dict]) -> dict:
    item = raw if isinstance(raw, dict) else {}
    references = platform.get("references") or []
    answer = str(platform.get("answerMarkdown") or "")
    explicit_indexes = inline_reference_indexes(answer, references)
    global_indexes = {
        index
        for index, ref in enumerate(references, 1)
        if citation_scope(ref, answer) in ("global", "inline_and_global")
    }
    citation_mode = (
        "mixed"
        if explicit_indexes and global_indexes
        else "explicit"
        if explicit_indexes
        else "global"
        if global_indexes
        else "unmarked"
    )
    requested = []
    for index in item.get("citedReferenceIndexes") or []:
        if isinstance(index, int) and 1 <= index <= len(references) and index not in requested:
            requested.append(index)
    answer_level_requested = []
    for index in item.get("answerLevelReferenceIndexes") or []:
        if isinstance(index, int) and 1 <= index <= len(references) and index not in answer_level_requested:
            answer_level_requested.append(index)
    claim_text = str(item.get("claim") or "").strip()
    answer_excerpt = str(item.get("answerExcerpt") or "").strip()
    excerpt_valid = bool(answer_excerpt) and answer_excerpt in answer
    covered = bool(item.get("covered")) and bool(claim_text)
    if covered and not excerpt_valid:
        needs_review.append({
            "stage": "comparison",
            "knowledgePointId": kid,
            "platform": platform["platform"],
            "reason": "当前主张缺少可定位的 answerExcerpt，或该片段不是原回答的连续子串",
        })
        answer_excerpt = ""
    declared_indexes = list(dict.fromkeys(requested + answer_level_requested))
    locally_bound_indexes = set()
    if excerpt_valid:
        # Some UIs flatten adjacent markers 1 and 2 into a naked trailing "12".
        # Prefer the carrier's declared split only when it exactly reconstructs
        # that cluster; bracketed 【12】 and a declared [12] remain marker 12.
        locally_bound_indexes = declared_cluster_reference_indexes(
            answer_excerpt,
            references,
            declared_indexes,
        ) or inline_reference_indexes(answer_excerpt, references)
    if locally_bound_indexes:
        candidate_indexes = sorted(locally_bound_indexes)
    else:
        candidate_indexes = declared_indexes
    raw_evidence_by_index = {}
    for evidence_item in item.get("evidence") or []:
        if not isinstance(evidence_item, dict):
            continue
        index = evidence_item.get("referenceIndex")
        excerpt = str(evidence_item.get("excerpt") or "").strip()
        if (
            isinstance(index, int)
            and 1 <= index <= len(references)
            and excerpt
            and excerpt in reference_text(references[index - 1])
        ):
            raw_evidence_by_index[index] = excerpt
    recovered_evidence = []
    supported_indexes = []
    if covered:
        for index in candidate_indexes:
            excerpt = supporting_excerpt(references[index - 1], claim_text)
            if not excerpt:
                excerpt = raw_evidence_by_index.get(index, "")
            if excerpt:
                supported_indexes.append(index)
                recovered_evidence.append({"referenceIndex": index, "excerpt": excerpt})
        if not recovered_evidence and not locally_bound_indexes:
            for index, reference in enumerate(references, 1):
                if index in candidate_indexes:
                    continue
                excerpt = supporting_excerpt(reference, claim_text)
                if excerpt:
                    supported_indexes.append(index)
                    recovered_evidence.append({"referenceIndex": index, "excerpt": excerpt})
    raw_faithfulness = item.get("faithfulness")
    if raw_faithfulness == "contradicted":
        allowed = set(candidate_indexes)
        evidence, invalid = normalize_evidence(item.get("evidence"), references, allowed)
        faithfulness = "contradicted" if evidence and not invalid else "insufficient"
        effective_indexes = [
            index for index in candidate_indexes
            if any(item["referenceIndex"] == index for item in evidence)
        ]
    else:
        evidence = recovered_evidence
        faithfulness = "supported" if evidence else "insufficient"
        effective_indexes = supported_indexes
    if faithfulness == "insufficient" and covered:
        needs_review.append({
            "stage": "comparison",
            "knowledgePointId": kid,
            "platform": platform["platform"],
            "reason": "当前回答所附来源中未定位到支持该主张的原文",
        })
    requested = [
        index for index in effective_indexes
        if index in locally_bound_indexes or index in global_indexes
    ]
    answer_level_requested = [
        index for index in effective_indexes if index not in requested
    ]
    levels = [source_level(references[index - 1], platform["platform"]) for index in effective_indexes]
    level = (
        "official"
        if "official" in levels
        else "dknow_trusted_search_official"
        if "dknow_trusted_search_official" in levels
        else "nonofficial"
        if levels
        else "none"
    )
    binding_mode = (
        "local"
        if any(index in locally_bound_indexes for index in requested)
        else "declared_global"
        if requested
        else "answer_level_semantic"
        if answer_level_requested
        else "none"
    )
    binding_reason = {
        "local": "逐段溯源",
        "declared_global": "无对应的清单",
        "answer_level_semantic": "全文语义溯源",
        "none": "未建立溯源",
    }[binding_mode]
    faithfulness_reason = {
        "supported": "来源原文支持当前主张",
        "contradicted": "来源原文与当前主张矛盾",
        "insufficient": "当前来源证据不足",
    }[faithfulness]
    normalized_reason = f"{binding_reason}；{faithfulness_reason}" if covered else ""
    return {
        "covered": covered,
        "claim": clipped(item.get("claim"), 1000) if covered else "",
        "answerExcerpt": clipped(answer_excerpt, 4000) if covered else "",
        "locallyBoundReferenceIndexes": sorted(locally_bound_indexes),
        "citationMode": citation_mode,
        "citedReferenceIndexes": effective_indexes,
        "answerLevelReferenceIndexes": answer_level_requested,
        "referenceBinding": binding_mode,
        "sourceLevel": level,
        "faithfulness": faithfulness if covered else "insufficient",
        "reason": normalized_reason,
        "evidence": evidence,
    }


def normalize_anchor(raw: object, point_claims: dict, platform_map: dict, kid: str, needs_review: list[dict]) -> dict:
    item = raw if isinstance(raw, dict) else {}
    pid = "dknowc-chat"
    claim = point_claims.get(pid) or {}
    platform = platform_map.get(pid)
    valid = pid == "dknowc-chat" and platform is not None
    valid = valid and claim.get("covered") and claim.get("faithfulness") == "supported"
    official_answer = clipped(claim.get("claim"), 1000)
    references = platform.get("references") or [] if platform else []
    allowed = set(claim.get("citedReferenceIndexes") or [])
    evidence = [
        evidence_item
        for evidence_item in claim.get("evidence") or []
        if evidence_item.get("referenceIndex") in allowed
    ]
    invalid = False
    evidence_levels = {source_level(references[e["referenceIndex"] - 1], pid) for e in evidence}
    trusted_provenance = bool(evidence) and all(
        has_trusted_dknow_provenance(
            references[evidence_item["referenceIndex"] - 1], pid
        )
        for evidence_item in evidence
    )
    combined_evidence = "\n".join(evidence_item["excerpt"] for evidence_item in evidence)
    semantic_support = (
        text_supports_claim(claim.get("claim"), combined_evidence)
        and text_supports_claim(claim.get("claim"), official_answer)
        and text_supports_claim(official_answer, combined_evidence)
    )
    valid = valid and bool(official_answer) and bool(evidence) and bool(
        evidence_levels & {"official", "dknow_trusted_search_official"}
    ) and trusted_provenance and semantic_support and not invalid
    if not valid:
        if item.get("eligible"):
            needs_review.append({"stage": "comparison", "knowledgePointId": kid, "platform": pid, "reason": "深知晓免查锚点未同时满足可信来源、忠实性与原文定位要求"})
        return {"eligible": False}
    anchor_evidence = []
    for index, evidence_item in enumerate(evidence, 1):
        reference = references[evidence_item["referenceIndex"] - 1]
        anchor_evidence.append({
            "id": f"A{index}",
            "title": str(reference.get("title") or reference.get("url") or ""),
            "url": str(reference.get("url") or ""),
            "excerpt": evidence_item["excerpt"],
            "referenceIndex": evidence_item["referenceIndex"],
            "contentAcquisition": str(reference.get("contentAcquisition") or ""),
            "sameMaterialVerified": reference.get("sameMaterialVerified") is True,
            "originAttributionStatus": str(reference.get("originAttributionStatus") or ""),
            "platformUrl": str(
                reference.get("platformUrl")
                or reference.get("platform_url")
                or reference.get("originalUrl")
                or reference.get("original_url")
                or ""
            ),
            "zone": str(reference.get("zone") or ""),
            "platformTrustSource": str(reference.get("platformTrustSource") or "dknow_reference_capture"),
        })
    return {"eligible": True, "platform": pid, "trustedSearchUsed": True, "officialAnswer": official_answer, "evidence": anchor_evidence}


def normalize_comparison_status(raw_status: object, summary: str, covered_count: int) -> str:
    status = str(raw_status or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "agreement": "consensus",
        "agree": "consensus",
        "agreed": "consensus",
        "consistent": "consensus",
        "same": "consensus",
        "一致": "consensus",
        "完全一致": "consensus",
        "mostly_consensus": "mostly_consensus",
        "mostly_consistent": "mostly_consensus",
        "substantially_consistent": "mostly_consensus",
        "minor_difference": "mostly_consensus",
        "basic_consensus": "mostly_consensus",
        "基本一致": "mostly_consensus",
        "partial_agreement": "partial",
        "partially_consistent": "partial",
        "difference": "partial",
        "disagreement": "conflict",
        "contradiction": "conflict",
        "冲突": "conflict",
    }
    status = aliases.get(status, status)
    if status in ("consensus", "mostly_consensus", "conflict", "partial", "single"):
        return status
    compact_summary = re.sub(r"\s+", "", summary)
    if "基本一致" in compact_summary and not any(term in compact_summary for term in ("部分一致", "不一致", "冲突")):
        return "mostly_consensus"
    if compact_summary and any(term in compact_summary for term in ("完全一致", "数值一致", "均回答", "均确认", "说法一致")):
        if not any(term in compact_summary for term in ("部分一致", "不一致", "冲突")):
            return "consensus"
    return "single" if covered_count <= 1 else "partial"


def validate_analysis_contract(raw: dict, platforms: list[dict]) -> None:
    """Require semantic decisions while leaving mechanical citation repair to code."""
    errors = []
    required_claim_fields = (
        "covered",
        "claim",
        "answerExcerpt",
        "faithfulness",
        "evidence",
    )
    platform_map = {platform["platform"]: platform for platform in platforms}
    platform_ids = list(platform_map)
    points = raw.get("knowledgePoints")
    if not isinstance(points, list) or not points:
        raise SkillError("1.1 分析未产生任何知识点")
    synthesis = raw.get("synthesisDraft")
    allowed_point_ids = {f"K{position}" for position in range(1, len(points) + 1)}
    if not isinstance(synthesis, dict):
        errors.append("synthesisDraft 缺失")
    else:
        if synthesis.get("status") != "unverified":
            errors.append("synthesisDraft.status 必须为 unverified")
        if not str(synthesis.get("answer") or "").strip():
            errors.append("synthesisDraft.answer 不能为空")
        basis_ids = synthesis.get("basisKnowledgePointIds")
        if not isinstance(basis_ids, list) or not basis_ids:
            errors.append("synthesisDraft.basisKnowledgePointIds 必须是非空数组")
        elif (
            any(not isinstance(item, str) or item not in allowed_point_ids for item in basis_ids)
            or len(basis_ids) != len(set(basis_ids))
        ):
            errors.append("synthesisDraft.basisKnowledgePointIds 含未知或重复知识点")
    total_covered = 0
    for position, point in enumerate(points, 1):
        path = f"knowledgePoints[{position - 1}]"
        if not isinstance(point, dict):
            errors.append(f"{path} 必须是对象")
            continue
        claims = point.get("claims")
        if not isinstance(claims, dict):
            errors.append(f"{path}.claims 缺失")
            continue
        for platform_id in platform_ids:
            claim = claims.get(platform_id)
            claim_path = f"{path}.claims.{platform_id}"
            if not isinstance(claim, dict):
                errors.append(f"{claim_path} 缺失")
                continue
            missing_fields = [
                field for field in required_claim_fields if field not in claim
            ]
            if missing_fields:
                errors.append(
                    f"{claim_path} 缺少必填字段：{','.join(missing_fields)}"
                )
            if not isinstance(claim.get("covered"), bool):
                errors.append(f"{claim_path}.covered 必须为布尔值")
            faithfulness = claim.get("faithfulness")
            if faithfulness not in ("supported", "contradicted", "insufficient"):
                errors.append(f"{claim_path}.faithfulness 非法")
            evidence = claim.get("evidence")
            if not isinstance(evidence, list):
                errors.append(f"{claim_path}.evidence 必须是数组")
                evidence = []
            answer = str(platform_map[platform_id].get("answerMarkdown") or "")
            claim_text = str(claim.get("claim") or "").strip()
            answer_excerpt = str(claim.get("answerExcerpt") or "").strip()
            if claim.get("covered") is True:
                total_covered += 1
                if not claim_text:
                    errors.append(f"{claim_path}.claim 不能为空")
                if not answer_excerpt or answer_excerpt not in answer:
                    errors.append(f"{claim_path}.answerExcerpt 必须是原回答的连续非空子串")
                references = platform_map[platform_id].get("references") or []
                requested = claim.get("citedReferenceIndexes") or []
                answer_level = claim.get("answerLevelReferenceIndexes") or []
                if not isinstance(requested, list) or not isinstance(answer_level, list):
                    errors.append(f"{claim_path} 引用索引必须是数组")
                    requested, answer_level = [], []
                for item in evidence:
                    if not isinstance(item, dict):
                        errors.append(f"{claim_path}.evidence 项必须是对象")
                        continue
        comparison = point.get("comparison")
        if "comparison" not in point:
            errors.append(f"{path}.comparison 缺失")
        elif (
            not isinstance(comparison, dict)
            or (
                comparison.get("status") not in {
                "consensus", "mostly_consensus", "partial", "conflict", "single",
                "agreement", "基本一致",
                }
                or not str(comparison.get("summary") or "").strip()
            )
        ):
            errors.append(f"{path}.comparison.status/summary 非法")
        anchor = point.get("trustedAnchor")
        if "trustedAnchor" not in point:
            errors.append(f"{path}.trustedAnchor 缺失")
        elif not isinstance(anchor, dict):
            errors.append(f"{path}.trustedAnchor 必须是对象")
        elif isinstance(anchor, dict) and anchor.get("eligible"):
            if (
                anchor.get("platform") != "dknowc-chat"
                or anchor.get("trustedSearchUsed") is not True
                or not str(anchor.get("officialAnswer") or "").strip()
                or not isinstance(anchor.get("evidence"), list)
                or not anchor.get("evidence")
            ):
                errors.append(f"{path}.trustedAnchor 合格声明字段不完整")
    if total_covered == 0:
        errors.append("knowledgePoints 所有平台均为 covered=false；至少一个真实主张必须被覆盖")
    if errors:
        preview = "；".join(errors[:12])
        suffix = f"；另有 {len(errors) - 12} 项" if len(errors) > 12 else ""
        raise SkillError(
            "1.1 载体输出不满足 fact-check-x/product-truth@1，"
            f"必须在本阶段修复或重试，禁止进入权威核验：{preview}{suffix}"
        )


def normalize(raw: dict, source: dict, question: str, platforms: list[dict]) -> dict:
    validate_analysis_contract(raw, platforms)
    platform_map = {platform["platform"]: platform for platform in platforms}
    needs_review = []
    points = []
    for position, raw_point in enumerate(raw.get("knowledgePoints") or [], 1):
        if not isinstance(raw_point, dict):
            raise SkillError(f"第 {position} 个知识点必须是对象")
        kid = f"K{position}"
        description = clipped(raw_point.get("description"), 500)
        if not description:
            raise SkillError(f"{kid} 缺少知识点描述")
        role = raw_point.get("role") if raw_point.get("role") in ("direct", "reference") else "direct"
        claims = {pid: normalize_claim((raw_point.get("claims") or {}).get(pid), platform, kid, needs_review) for pid, platform in platform_map.items()}
        comparison_raw = raw_point.get("comparison") if isinstance(raw_point.get("comparison"), dict) else {}
        covered_count = sum(claim["covered"] for claim in claims.values())
        comparison_summary = clipped(comparison_raw.get("summary"), 500)
        if not comparison_summary:
            comparison_summary = (
                "多个平台均覆盖该知识点，具体表述见逐平台主张。"
                if covered_count > 1
                else "该平台覆盖该知识点。"
            )
        status = normalize_comparison_status(
            comparison_raw.get("status"),
            comparison_summary,
            covered_count,
        )
        anchor = normalize_anchor(raw_point.get("trustedAnchor"), claims, platform_map, kid, needs_review)
        points.append({
            "id": kid,
            "description": description,
            "role": role,
            "core": bool(raw_point.get("core")) and role == "direct",
            "claims": claims,
            "comparison": {"status": status, "summary": comparison_summary},
            "trustedAnchor": anchor,
        })
    if not points:
        raise SkillError("1.1 分析未产生任何知识点")
    synthesis_raw = raw["synthesisDraft"]
    return {
        "schemaVersion": "fact-check-x/comparison@1",
        "question": question,
        "coreQuestion": clipped(raw.get("coreQuestion") or question, 500),
        "synthesisDraft": {
            "status": "unverified",
            "answer": clipped(synthesis_raw.get("answer"), 6000),
            "basisKnowledgePointIds": list(
                synthesis_raw.get("basisKnowledgePointIds") or []
            ),
        },
        "createdAt": now_iso(),
        "sourceSchemaVersion": source.get("schemaVersion"),
        "platforms": [{"platform": p["platform"], "label": p.get("label") or p["platform"]} for p in platforms],
        "knowledgePoints": points,
        "needsReview": needs_review,
    }


def canonical_analysis(comparison: dict) -> dict:
    return {
        "schemaVersion": "fact-check-x/comparison-analysis@1",
        "coreQuestion": comparison.get("coreQuestion"),
        "synthesisDraft": comparison.get("synthesisDraft") or {},
        "knowledgePoints": [
            {
                "id": point.get("id"),
                "description": point.get("description"),
                "role": point.get("role"),
                "core": point.get("core"),
                "claims": point.get("claims") or {},
                "comparison": point.get("comparison") or {},
                "trustedAnchor": point.get("trustedAnchor") or {"eligible": False},
            }
            for point in comparison.get("knowledgePoints") or []
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="生成或验收知识点结构化对比。")
    parser.add_argument("--input", required=True)
    parser.add_argument("--task-output")
    parser.add_argument("--analysis")
    parser.add_argument("--output")
    parser.add_argument("--canonical-analysis-output")
    args = parser.parse_args()
    try:
        source = load_json(args.input)
        question, platforms = validate_results(source)
        if args.task_output:
            dump_json(args.task_output, build_task(question, platforms))
        if args.analysis:
            if not args.output:
                raise SkillError("使用 --analysis 时必须提供 --output")
            raw = load_json(args.analysis)
            if not isinstance(raw, dict):
                raise SkillError("comparison-analysis.json 必须是对象")
            result = normalize(raw, source, question, platforms)
            if args.canonical_analysis_output:
                dump_json(args.canonical_analysis_output, canonical_analysis(result))
            dump_json(args.output, result)
            print(json.dumps({"status": "completed", "output": str(Path(args.output).resolve()), "knowledgePoints": len(result["knowledgePoints"]), "needsReview": len(result["needsReview"])}, ensure_ascii=False))
            return 0
        if args.task_output:
            print(json.dumps({"status": "prepared", "task": str(Path(args.task_output).resolve())}, ensure_ascii=False))
            return 0
        raise SkillError("至少提供 --task-output 或 --analysis")
    except (SkillError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
