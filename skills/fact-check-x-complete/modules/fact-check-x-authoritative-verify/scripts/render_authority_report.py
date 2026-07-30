#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
from urllib.parse import urlparse


CATEGORY_LABELS = {
    "direct_accurate": "直接准确",
    "indirect_accurate": "间接准确",
    "coincidental": "结果巧合",
    "fabricated": "官方查无",
    "misleading": "严重误导",
    "unverified": "无法核验",
    "omitted": "未覆盖",
}

CATEGORY_CLASSES = {
    "direct_accurate": "ok",
    "indirect_accurate": "info",
    "coincidental": "warn",
    "fabricated": "bad",
    "misleading": "bad",
    "unverified": "muted",
    "omitted": "muted",
}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def escaped(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def compact(value: object) -> str:
    return " ".join(str(value or "").split())


def safe_url(value: object) -> str:
    url = str(value or "").strip()
    parsed = urlparse(url)
    return url if parsed.scheme in {"http", "https"} and parsed.netloc else ""


def canonical_sha256(value: object) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def authority_binding_sha256(
    point_id: str,
    platform: str,
    claim: dict,
    verdict: dict,
) -> str:
    return canonical_sha256(
        {
            "pointId": point_id,
            "platform": platform,
            "claim": claim,
            "verdict": verdict,
        }
    )


def validate(verification: dict) -> None:
    if verification.get("schemaVersion") != "fact-check-x/verification@2":
        raise ValueError("verification 必须使用 fact-check-x/verification@2")
    platforms = verification.get("platforms") or []
    points = verification.get("knowledgePoints") or []
    platform_ids = [str(item.get("platform") or "") for item in platforms]
    if not platform_ids or any(not value for value in platform_ids):
        raise ValueError("权威报告缺少平台清单")
    if len(platform_ids) != len(set(platform_ids)):
        raise ValueError("权威报告平台清单存在重复项")
    if not points:
        raise ValueError("权威报告缺少知识点")
    final_answer = verification.get("finalAnswer")
    point_ids = [str(point.get("id") or "") for point in points]
    if (
        not isinstance(final_answer, dict)
        or final_answer.get("status") not in {"verified", "needs_review"}
        or not compact(final_answer.get("answer"))
        or final_answer.get("knowledgePointIds") != point_ids
    ):
        raise ValueError("权威报告缺少与知识点完整绑定的最终答案")
    for point in points:
        point_id = str(point.get("id") or "")
        authority = point.get("authority") or {}
        claims = authority.get("claims") or {}
        verdicts = authority.get("verdicts") or {}
        if not point_id or authority.get("requestId") != point_id:
            raise ValueError("权威报告知识点与核验结果 ID 不一致")
        if set(claims) != set(platform_ids) or set(verdicts) != set(platform_ids):
            raise ValueError(f"{point_id} 的用户所选平台权威裁决集合不完整")
        if not compact(authority.get("authoritativeFinding")):
            raise ValueError(f"{point_id} 缺少权威结论")


def render_evidence(authority: dict) -> str:
    items = []
    for evidence in authority.get("evidence") or []:
        evidence_id = escaped(evidence.get("id"))
        title = escaped(evidence.get("title") or evidence.get("url") or evidence_id)
        body = escaped(evidence.get("body"))
        url = safe_url(evidence.get("url"))
        heading = (
            f'<a href="{escaped(url)}" target="_blank" rel="noreferrer">{title}</a>'
            if url
            else title
        )
        items.append(
            '<article class="evidence">'
            f'<div class="evidence-id">{evidence_id}</div>'
            f"<h4>{heading}</h4>"
            f"<blockquote>{body}</blockquote>"
            "</article>"
        )
    return "".join(items) or '<p class="empty">未取得可交付的权威证据。</p>'


def render_platform_rows(point: dict, platforms: list[dict]) -> str:
    authority = point.get("authority") or {}
    claims = authority.get("claims") or {}
    verdicts = authority.get("verdicts") or {}
    point_id = str(point.get("id") or "")
    rows = []
    for platform in platforms:
        platform_id = str(platform.get("platform") or "")
        label = platform.get("label") or platform_id
        claim = claims.get(platform_id) or {}
        verdict = verdicts.get(platform_id) or {}
        category = str(verdict.get("category") or "unverified")
        binding = authority_binding_sha256(point_id, platform_id, claim, verdict)
        evidence_ids = "、".join(
            escaped(item) for item in verdict.get("evidenceIds") or []
        ) or "无"
        rows.append(
            "<tr>"
            f'<th scope="row">{escaped(label)}</th>'
            f'<td data-fcx-point="{escaped(point_id)}" '
            f'data-fcx-platform="{escaped(platform_id)}" '
            f'data-fcx-authority-binding-sha256="{binding}">'
            f'<p class="claim">{escaped(claim.get("claim") or "未覆盖")}</p>'
            f'<p class="excerpt">{escaped(claim.get("answerExcerpt"))}</p>'
            "</td>"
            f'<td><span class="verdict {CATEGORY_CLASSES.get(category, "muted")}">'
            f'{escaped(CATEGORY_LABELS.get(category, category))}</span></td>'
            f"<td>{escaped(verdict.get('reason'))}</td>"
            f"<td>{evidence_ids}</td>"
            "</tr>"
        )
    return "".join(rows)


def render_point(point: dict, platforms: list[dict]) -> str:
    authority = point.get("authority") or {}
    mode = (
        "深知可信材料直接核验，免重复搜索"
        if authority.get("searchMode") == "dknow_exempt"
        else "可信搜索独立核验"
    )
    point_id = escaped(point.get("id"))
    return (
        f'<section class="point" id="{point_id}">'
        '<div class="point-head">'
        f"<div><span class=\"point-id\">{point_id}</span>"
        f"<h2>{escaped(point.get('description'))}</h2></div>"
        f'<span class="mode">{escaped(mode)}</span>'
        "</div>"
        '<div class="finding">'
        '<span class="finding-label">权威结论</span>'
        f"<p>{escaped(authority.get('authoritativeFinding'))}</p>"
        "</div>"
        '<h3>权威证据</h3>'
        f'<div class="evidence-grid">{render_evidence(authority)}</div>'
        '<h3>各平台裁决</h3>'
        '<div class="table-wrap"><table>'
        "<thead><tr><th>平台</th><th>平台主张与原文</th><th>结论</th>"
        "<th>裁决理由</th><th>权威证据</th></tr></thead>"
        f"<tbody>{render_platform_rows(point, platforms)}</tbody>"
        "</table></div>"
        "</section>"
    )


def render(verification: dict) -> str:
    validate(verification)
    platforms = verification.get("platforms") or []
    points = verification.get("knowledgePoints") or []
    verdicts = [
        verdict
        for point in points
        for verdict in ((point.get("authority") or {}).get("verdicts") or {}).values()
    ]
    direct_count = sum(
        1 for verdict in verdicts if verdict.get("category") == "direct_accurate"
    )
    review_count = len(verification.get("needsReview") or [])
    verification_sha = canonical_sha256(verification)
    point_sections = "".join(render_point(point, platforms) for point in points)
    final_answer = verification.get("finalAnswer") or {}
    final_status = (
        "权威核验完成"
        if final_answer.get("status") == "verified"
        else "仍有知识点待复核"
    )
    final_answer_title = (
        "权威核验后的最终答案"
        if final_answer.get("status") == "verified"
        else "当前核验结论（待复核）"
    )
    final_report_nav = (
        '<a href="04-final-report.html">最终裁决报告</a>'
        if final_answer.get("status") == "verified"
        else '<span class="nav-pending">最终裁决报告待复核完成后生成</span>'
    )
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="fact-check-x-authority-report" content="1">
  <meta name="fact-check-x-verification-sha256" content="{verification_sha}">
  <title>Fact-Check-X 权威证据核验报告</title>
  <style>
    * {{ box-sizing: border-box; }}
    html {{ background: #eef1f5; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    body {{ margin: 0; letter-spacing: 0; }}
    a {{ color: #1458a6; overflow-wrap: anywhere; }}
    .top {{ background: #172033; color: #fff; padding: 28px max(24px, calc((100vw - 1440px) / 2 + 24px)); }}
    .eyebrow {{ color: #9bd4ca; font-size: 13px; font-weight: 700; margin: 0 0 8px; }}
    h1 {{ font-size: 30px; line-height: 1.25; margin: 0; }}
    .question {{ color: #d8e0ec; font-size: 16px; line-height: 1.6; margin: 12px 0 0; max-width: 940px; }}
    .nav {{ background: #fff; border-bottom: 1px solid #d7dde7; padding: 11px max(24px, calc((100vw - 1440px) / 2 + 24px)); }}
    .nav a {{ font-size: 14px; font-weight: 650; margin-right: 22px; text-decoration: none; }}
    .nav-pending {{ color: #7a5200; font-size: 14px; font-weight: 650; }}
    main {{ margin: 0 auto; max-width: 1440px; padding: 24px; }}
    .metrics {{ display: grid; gap: 12px; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-bottom: 22px; }}
    .metric {{ background: #fff; border: 1px solid #d7dde7; border-radius: 6px; padding: 16px; }}
    .metric b {{ display: block; font-size: 24px; }}
    .metric span {{ color: #637083; display: block; font-size: 13px; margin-top: 5px; }}
    .final-answer {{ background: #fff; border: 1px solid #9dcfbe; border-left: 5px solid #148266; border-radius: 6px; margin-bottom: 22px; padding: 20px; }}
    .final-answer-head {{ align-items: center; display: flex; gap: 12px; justify-content: space-between; }}
    .final-answer h2 {{ font-size: 20px; margin: 0; }}
    .final-status {{ background: #e7f5f1; border: 1px solid #a8d8ca; border-radius: 4px; color: #17624f; font-size: 12px; font-weight: 750; padding: 4px 7px; }}
    .final-answer-body {{ font-size: 17px; font-weight: 650; line-height: 1.75; margin: 14px 0 0; white-space: pre-wrap; }}
    .point {{ background: #fff; border: 1px solid #d7dde7; border-radius: 6px; margin-bottom: 20px; padding: 22px; }}
    .point-head {{ align-items: flex-start; display: flex; gap: 16px; justify-content: space-between; }}
    .point-head h2 {{ display: inline; font-size: 19px; line-height: 1.45; margin: 0 0 0 8px; }}
    .point-id {{ background: #172033; border-radius: 4px; color: #fff; display: inline-block; font-size: 12px; font-weight: 750; padding: 4px 7px; }}
    .mode {{ background: #e7f5f1; border: 1px solid #a8d8ca; border-radius: 4px; color: #17624f; flex: 0 0 auto; font-size: 12px; font-weight: 700; padding: 6px 8px; }}
    .finding {{ border-left: 4px solid #148266; margin: 18px 0 22px; padding: 4px 0 4px 14px; }}
    .finding-label {{ color: #17624f; font-size: 12px; font-weight: 750; }}
    .finding p {{ font-size: 17px; font-weight: 650; line-height: 1.6; margin: 5px 0 0; }}
    h3 {{ font-size: 15px; margin: 22px 0 10px; }}
    .evidence-grid {{ display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }}
    .evidence {{ border: 1px solid #d7dde7; border-radius: 5px; padding: 14px; }}
    .evidence-id {{ color: #637083; font-size: 12px; font-weight: 750; }}
    .evidence h4 {{ font-size: 14px; line-height: 1.45; margin: 5px 0 8px; }}
    blockquote {{ background: #f6f8fb; border-left: 3px solid #aab5c4; color: #344054; line-height: 1.55; margin: 0; padding: 9px 11px; }}
    .table-wrap {{ overflow-x: auto; width: 100%; }}
    table {{ border-collapse: collapse; min-width: 900px; table-layout: fixed; width: 100%; }}
    th, td {{ border: 1px solid #d7dde7; font-size: 13px; line-height: 1.5; padding: 10px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }}
    thead th {{ background: #f0f3f7; color: #344054; }}
    th:first-child {{ width: 10%; }}
    th:nth-child(2) {{ width: 28%; }}
    th:nth-child(3) {{ width: 12%; }}
    th:nth-child(4) {{ width: 36%; }}
    th:nth-child(5) {{ width: 14%; }}
    .claim {{ font-weight: 700; margin: 0 0 6px; }}
    .excerpt {{ color: #637083; margin: 0; }}
    .verdict {{ border-radius: 4px; display: inline-block; font-size: 12px; font-weight: 750; padding: 4px 7px; }}
    .verdict.ok {{ background: #dff3eb; color: #17624f; }}
    .verdict.info {{ background: #e3eefb; color: #174f8a; }}
    .verdict.warn {{ background: #fff0c7; color: #7a5200; }}
    .verdict.bad {{ background: #fde4e2; color: #9b2c25; }}
    .verdict.muted {{ background: #e9edf2; color: #526071; }}
    .empty {{ color: #637083; }}
    footer {{ color: #637083; font-size: 12px; padding: 0 24px 28px; text-align: center; }}
    @media (max-width: 760px) {{
      .top {{ padding: 22px 18px; }}
      h1 {{ font-size: 24px; }}
      .nav {{ overflow-x: auto; padding: 11px 18px; white-space: nowrap; }}
      main {{ padding: 16px 12px; }}
      .metrics {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
      .point {{ padding: 16px 12px; }}
      .point-head {{ display: block; }}
      .mode {{ margin-top: 10px; }}
      .evidence-grid {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <header class="top">
    <p class="eyebrow">Fact-Check-X · 第三阶段</p>
    <h1>权威证据核验报告</h1>
    <p class="question">{escaped(verification.get("question"))}</p>
  </header>
  <nav class="nav">
    <a href="01-capture-report.html">原始答案与引用</a>
    <a href="02-comparison-report.html">知识点对比</a>
    {final_report_nav}
  </nav>
  <main>
    <section class="final-answer" aria-label="{escaped(final_answer_title)}">
      <div class="final-answer-head">
        <h2>{escaped(final_answer_title)}</h2>
        <span class="final-status">{escaped(final_status)}</span>
      </div>
      <p class="final-answer-body">{escaped(final_answer.get("answer"))}</p>
    </section>
    <section class="metrics" aria-label="权威核验摘要">
      <div class="metric"><b>{len(points)}</b><span>核验知识点</span></div>
      <div class="metric"><b>{len(platforms)}</b><span>参与平台</span></div>
      <div class="metric"><b>{direct_count}</b><span>直接准确裁决</span></div>
      <div class="metric"><b>{verification.get("trustedSearchRequestCount", 0)}</b><span>可信搜索请求</span></div>
      <div class="metric"><b>{review_count}</b><span>待人工复核</span></div>
    </section>
    {point_sections}
  </main>
  <footer>报告由已锁定的 comparison、authority evidence、assessment 与 result 生成；不得脱离原始存证单独解释。</footer>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="生成独立权威证据核验报告。")
    parser.add_argument("--verification", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    verification = load_json(Path(args.verification).resolve())
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render(verification), encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "completed",
                "report": str(output),
                "platformCount": len(verification.get("platforms") or []),
                "knowledgePointCount": len(
                    verification.get("knowledgePoints") or []
                ),
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
