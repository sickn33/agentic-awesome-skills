#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
from urllib.parse import urlparse

from common import SkillError, load_json
from knowledge_compare import source_level


STATUS = {
    "consensus": "一致",
    "mostly_consensus": "基本一致",
    "conflict": "冲突",
    "partial": "部分一致",
    "single": "单方覆盖",
}
ROLE = {"direct": "直接答案", "reference": "补充参考"}
FAITH = {"supported": "忠实", "contradicted": "不忠实", "insufficient": "依据不足"}
SOURCE_LEVEL = {
    "official": "官方原站",
    "dknow_trusted_search_official": "官方来源",
    "nonofficial": "非官方来源",
    "none": "无所附来源",
}


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def safe_url(value: object) -> str:
    url = str(value or "").strip()
    return url if urlparse(url).scheme in ("http", "https") else "#"


def claim_binding_sha256(claim: dict) -> str:
    payload = json.dumps(
        claim,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def reference_primary_url(reference: dict) -> str:
    if reference.get("originAttributionStatus") == "trusted_search_no_source_url":
        return str(reference.get("url") or "")
    for key in ("officialUrl", "official_url", "resourceUrl", "resource_url", "sourceUrl", "source_url", "url"):
        candidate = str(reference.get(key) or "").strip()
        if safe_url(candidate) != "#":
            return candidate
    return ""


def render_references(platform: dict) -> str:
    items = []
    for index, reference in enumerate(platform.get("references") or [], 1):
        marker = reference.get("marker") or index
        title = reference.get("title") or reference.get("text") or reference.get("url")
        original = reference.get("url") or ""
        primary = reference_primary_url(reference)
        platform_url = (
            reference.get("platformUrl")
            or reference.get("platform_url")
            or reference.get("originalUrl")
            or reference.get("original_url")
            or (original if primary != original else "")
        )
        excerpt = reference.get("snippet") or reference.get("text") or reference.get("content") or ""
        level_label = SOURCE_LEVEL.get(source_level(reference, str(platform.get("platform") or "")), "非官方来源")
        secondary = (
            f' <a href="{esc(safe_url(platform_url))}" target="_blank" rel="noreferrer">深知收录页</a>'
            if platform_url and platform_url != primary
            else ""
        )
        attribution = (
            ' <span class="source-level">官方来源</span>'
            if reference.get("originAttributionStatus") == "trusted_search_official_url"
            else ' <span class="source-level">可信搜索未返回源网址·保留收录页</span>'
            if reference.get("originAttributionStatus") == "trusted_search_no_source_url"
            else ""
        )
        items.append(f'<li><span class="source-level">{esc(level_label)}</span>{attribution} <a href="{esc(safe_url(primary))}" target="_blank" rel="noreferrer">[{esc(marker)}] {esc(title)}</a>{secondary}<blockquote>{esc(excerpt)}</blockquote></li>')
    return "".join(items) or "<li>未捕获来源</li>"


def render_answer(platform: dict) -> str:
    return f'''<section class="answer-panel">
      <header><h2>{esc(platform.get("label") or platform.get("platform"))}</h2><span>{len(platform.get("references") or [])} 条来源</span></header>
      <div class="answer-text">{esc(platform.get("answerMarkdown"))}</div>
      <details><summary>原始来源</summary><ol>{render_references(platform)}</ol></details>
    </section>'''


def render_overview(comparison: dict, single_platform: bool) -> str:
    rows = []
    for point in comparison.get("knowledgePoints") or []:
        status = (point.get("comparison") or {}).get("status")
        status_label = (
            "单平台结果"
            if single_platform and status == "single"
            else STATUS.get(status, status)
        )
        anchor = point.get("trustedAnchor") or {}
        anchor_text = " · 深知晓权威锚点" if anchor.get("eligible") else ""
        rows.append(f'<li><b>{esc(point.get("id"))}</b><span class="state {esc(status)}">{esc(status_label)}</span><p>{esc(point.get("description"))}</p><small>{esc(ROLE.get(point.get("role"), point.get("role")))}{anchor_text}<br>{esc((point.get("comparison") or {}).get("summary"))}</small></li>')
    title = "知识点结构化" if single_platform else "知识点对比"
    return f'''<section class="overview-panel"><header><h2>{title}</h2><span>{len(rows)} 个知识点</span></header><ol class="overview">{"".join(rows)}</ol></section>'''


def render_synthesis_draft(comparison: dict) -> str:
    draft = comparison.get("synthesisDraft") or {}
    basis = "、".join(str(item) for item in draft.get("basisKnowledgePointIds") or [])
    return f'''<section class="draft-panel" aria-label="未核验综合草案">
      <header><div><p class="draft-kicker">综合草案</p><h2>基于多平台知识点合并，尚未经过权威核验</h2></div><span class="draft-status">未核验</span></header>
      <div class="draft-answer">{esc(draft.get("answer"))}</div>
      <p class="draft-basis">依据知识点：{esc(basis)}</p>
    </section>'''


def render_detail(
    point: dict,
    platforms: list[dict],
    single_platform: bool,
) -> str:
    cells = []
    for platform in platforms:
        pid = platform["platform"]
        claim = (point.get("claims") or {}).get(pid) or {}
        attributes = (
            f'data-fcx-point="{esc(point.get("id"))}" '
            f'data-fcx-platform="{esc(pid)}" '
            f'data-fcx-claim-sha256="{claim_binding_sha256(claim)}"'
        )
        if not claim.get("covered"):
            cells.append(f'<td {attributes}><span class="muted">未覆盖</span></td>')
            continue
        indexes = "、".join(str(i) for i in claim.get("citedReferenceIndexes") or []) or "无"
        citation_label = {
            "explicit": "直接展示",
            "global": "来源清单",
            "mixed": "间接查找",
            "source_labels_only": "仅显示来源名称",
            "unmarked": "未展示",
        }.get(claim.get("citationMode"), claim.get("citationMode") or "未展示")
        binding_label = {
            "local": "逐段溯源",
            "declared_global": "无对应的清单",
            "answer_level_semantic": "全文语义溯源",
            "none": "未建立溯源",
        }.get(claim.get("referenceBinding"), claim.get("referenceBinding") or "未建立溯源")
        source_label = SOURCE_LEVEL.get(claim.get("sourceLevel"), claim.get("sourceLevel") or "无所附来源")
        cells.append(f'''<td {attributes}><b>{esc(claim.get("claim"))}</b><dl><dt>依据索引</dt><dd>{esc(indexes)}</dd><dt>依据展示</dt><dd>{esc(citation_label)}</dd><dt>溯源方式</dt><dd>{esc(binding_label)}</dd><dt>来源层级</dt><dd>{esc(source_label)}</dd><dt>忠实性</dt><dd>{esc(FAITH.get(claim.get("faithfulness"), claim.get("faithfulness")))}</dd></dl><p>{esc(claim.get("reason"))}</p></td>''')
    comparison_cell = ""
    if not single_platform:
        state = (point.get("comparison") or {}).get("status")
        comparison_cell = (
            f'<td><span class="state {esc(state)}">'
            f'{esc(STATUS.get(state, state))}</span>'
            f'<p>{esc((point.get("comparison") or {}).get("summary"))}</p></td>'
        )
    return f'<tr><th><b>{esc(point.get("id"))}</b><span>{esc(ROLE.get(point.get("role"), point.get("role")))}</span><p>{esc(point.get("description"))}</p></th>{"".join(cells)}{comparison_cell}</tr>'


def build_html(results: dict, comparison: dict) -> str:
    originals = {platform.get("platform"): platform for platform in results.get("platforms") or []}
    ordered = [originals[p["platform"]] for p in comparison.get("platforms") or [] if p.get("platform") in originals]
    single_platform = len(ordered) == 1
    answer_panels = "".join(render_answer(platform) for platform in ordered)
    headers = "".join(f'<th>{esc(p.get("label") or p["platform"])}</th>' for p in comparison.get("platforms") or [])
    rows = "".join(
        render_detail(
            point,
            comparison.get("platforms") or [],
            single_platform,
        )
        for point in comparison.get("knowledgePoints") or []
    )
    report_title = (
        "知识点结构化"
        if single_platform
        else "知识点结构化对比"
    )
    detail_title = (
        "逐知识点结构化结果"
        if single_platform
        else "逐知识点完整对照"
    )
    comparison_header = "" if single_platform else "<th>差异</th>"
    platform_count = len(ordered)
    platform_layout = "platform-layout-compact" if platform_count <= 3 else "platform-layout-dense"
    main_class = (
        f"{'single-platform' if single_platform else 'multi-platform'} "
        f"{platform_layout} platform-count-{platform_count}"
    )
    table_min_width = max(
        980,
        440 + 240 * platform_count,
    )
    return f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{report_title}</title><style>
    :root{{--ink:#1f2933;--muted:#68737f;--line:#d9dee4;--paper:#fff;--soft:#f4f6f8;--blue:#285a9f;--red:#b33b32;--green:#187454;--amber:#946200}}*{{box-sizing:border-box}}body{{margin:0;color:var(--ink);background:var(--soft);font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;letter-spacing:0}}main{{max-width:1440px;margin:auto;background:var(--paper);min-height:100vh}}.title{{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:20px 24px;border-bottom:1px solid var(--line)}}.title-copy{{min-width:0}}h1{{font-size:24px;margin:0 0 4px}}h2{{font-size:16px;margin:0}}.title p{{margin:0;color:var(--muted);word-break:break-word}}.report-nav{{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;flex:none}}.report-nav a{{display:inline-flex;align-items:center;min-height:34px;padding:5px 10px;border:1px solid var(--line);border-radius:4px;background:var(--paper);color:var(--ink);text-decoration:none;white-space:nowrap}}.report-nav a:first-child{{border-color:#8ba8cc;color:#194d8c;background:#f5f9fe}}.report-nav a:hover{{border-color:var(--blue);color:var(--blue)}}.platform-grid{{display:grid;grid-template-columns:repeat(var(--platform-count),minmax(0,1fr));border-bottom:1px solid var(--line)}}.platform-grid>section{{min-width:0;padding:18px;border-right:1px solid var(--line)}}.platform-grid>section:last-child{{border-right:0}}section header{{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:10px}}section header span{{color:var(--muted);white-space:nowrap}}.answer-text{{height:48vh;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:14px 2px;font-size:14px}}details{{border-top:1px solid var(--line);padding-top:10px}}details ol{{padding-left:20px}}details li{{margin:10px 0}}.source-level{{display:inline-block;padding:1px 5px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;color:#475569;font-size:11px}}blockquote{{margin:5px 0;padding-left:10px;border-left:2px solid var(--line);color:var(--muted);white-space:pre-wrap}}a{{color:var(--blue)}}.overview-panel{{padding:20px 24px;background:#f8fafc;border-bottom:1px solid var(--line)}}.overview{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 24px;padding-left:22px}}.overview li{{padding:8px 0;border-bottom:1px solid var(--line)}}.overview p{{margin:3px 0}}small,.muted{{color:var(--muted)}}.state{{display:inline-block;margin-left:7px;padding:1px 6px;border:1px solid currentColor;border-radius:4px;font-size:11px}}.state.conflict{{color:var(--red)}}.state.consensus,.state.mostly_consensus{{color:var(--green)}}.state.partial{{color:var(--amber)}}.draft-panel{{padding:22px 24px;border-bottom:1px solid var(--line);background:#fff8e8}}.draft-panel header{{align-items:flex-start;border-bottom:0;padding:0}}.draft-kicker{{margin:0 0 2px;color:#7a5200;font-size:12px;font-weight:750}}.draft-panel h2{{font-size:18px}}.draft-status{{display:inline-block;padding:3px 7px;border:1px solid #d2a94d;border-radius:4px;background:#fff;color:#7a5200;font-size:12px;font-weight:750}}.draft-answer{{margin-top:14px;white-space:pre-wrap;font-size:16px;line-height:1.75}}.draft-basis{{margin:12px 0 0;color:var(--muted);font-size:12px}}.details{{padding:28px 24px 48px}}.details h2{{font-size:20px;margin-bottom:14px}}.table-wrap{{overflow:auto}}table{{width:100%;border-collapse:collapse;table-layout:fixed;min-width:{table_min_width}px}}.single-platform table{{min-width:0}}.single-platform tbody th{{width:42%}}th,td{{padding:11px;border:1px solid var(--line);text-align:left;vertical-align:top;overflow-wrap:anywhere}}thead th{{background:var(--soft)}}thead th:first-child,tbody th{{width:220px}}.multi-platform thead th:last-child{{width:220px}}tbody th span{{display:block;color:var(--muted);font-size:11px}}tbody th p,td p{{margin:5px 0}}dl{{display:grid;grid-template-columns:70px 1fr;margin:8px 0;font-size:12px}}dt{{color:var(--muted)}}dd{{margin:0}}@media(max-width:1200px){{.platform-count-4 .platform-grid{{grid-template-columns:repeat(2,minmax(0,1fr))}}.platform-count-5 .platform-grid{{grid-template-columns:repeat(3,minmax(0,1fr))}}}}@media(max-width:900px){{.title{{display:block}}.report-nav{{justify-content:flex-start;margin-top:12px}}.platform-grid{{grid-template-columns:1fr!important}}.platform-grid>section{{border-right:0;border-bottom:1px solid var(--line)}}.answer-text{{height:auto;max-height:50vh}}}}@media(max-width:600px){{.single-platform table,.single-platform tbody,.single-platform tr,.single-platform th,.single-platform td{{display:block;width:100%}}.single-platform thead{{display:none}}.single-platform tbody th{{background:var(--soft)}}}}
</style></head><body><main class="{main_class}" style="--platform-count:{platform_count}"><header class="title"><div class="title-copy"><h1>{report_title}</h1><p>{esc(results.get("question"))}</p></div><nav class="report-nav" aria-label="核验报告导航"><a href="capture/report.html">原始答案与引用存证</a><a href="report.html">最终核查报告</a></nav></header><div class="platform-grid">{answer_panels}</div>{render_overview(comparison, single_platform)}{render_synthesis_draft(comparison)}<section class="details"><h2>{detail_title}</h2><div class="table-wrap"><table><thead><tr><th>知识点</th>{headers}{comparison_header}</tr></thead><tbody>{rows}</tbody></table></div></section></main></body></html>'''


def main() -> int:
    parser = argparse.ArgumentParser(description="渲染 1.1 三栏中间报告。")
    parser.add_argument("--results", required=True)
    parser.add_argument("--comparison", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        results = load_json(args.results)
        comparison = load_json(args.comparison)
        if comparison.get("schemaVersion") != "fact-check-x/comparison@1":
            raise SkillError("comparison.json 版本不正确")
        if results.get("question") != comparison.get("question"):
            raise SkillError("results 与 comparison 的问题不一致")
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(build_html(results, comparison), encoding="utf-8")
        print(json.dumps({"status": "completed", "output": str(output.resolve())}, ensure_ascii=False))
        return 0
    except (SkillError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
