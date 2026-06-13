#!/usr/bin/env python3
"""
papers.py — Standalone academic paper toolkit (Skill-mode port of papers-mcp).
Original MCP project: https://github.com/xwmxcz/papers-mcp

Usage:
  python papers.py search <query> [--limit 10]
  python papers.py detail <paper_id>
  python papers.py citations <paper_id> [--limit 10]
  python papers.py arxiv <query> [--max-results 5]
  python papers.py download <arxiv_id> [--save-dir .]
  python papers.py read <pdf_path> [--max-pages 10]

Dependencies: httpx, arxiv, PyMuPDF
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

# Force UTF-8 stdout on Windows so Chinese strings render correctly when
# called via Bash / cmd / cron (Python 3.7+).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import httpx

S2_BASE = "https://api.semanticscholar.org/graph/v1"
S2_FIELDS = "paperId,title,abstract,year,citationCount,authors,externalIds,url"
S2_RETRIES = 3
S2_WAIT = 2  # seconds, exponential backoff base


# ---------- HTTP helpers ----------

def _s2_get(url: str, params: dict) -> dict:
    """GET with rate-limit retry. Returns parsed JSON or {'error': ...}."""
    for attempt in range(S2_RETRIES):
        try:
            r = httpx.get(
                url,
                params=params,
                timeout=30.0,
                headers={"User-Agent": "papers-skill/1.0"},
            )
            if r.status_code == 429:
                time.sleep(S2_WAIT * (attempt + 1))
                continue
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            if attempt == S2_RETRIES - 1:
                return {"error": f"HTTP error: {e}"}
            time.sleep(S2_WAIT * (attempt + 1))
    return {"error": "rate limit, retries exhausted"}


def _fmt_authors(authors: list, n: int = 3) -> str:
    if not authors:
        return "(unknown)"
    names = [a.get("name", "?") for a in authors[:n]]
    suffix = " et al." if len(authors) > n else ""
    return ", ".join(names) + suffix


# ---------- Commands ----------

def cmd_search(args) -> str:
    data = _s2_get(
        f"{S2_BASE}/paper/search",
        {"query": args.query, "limit": min(args.limit, 20), "fields": S2_FIELDS},
    )
    if "error" in data:
        return f"搜索失败: {data['error']}"
    papers = data.get("data", [])
    if not papers:
        return f"没有找到与 '{args.query}' 相关的论文"
    out = [f"# 搜索结果 ({len(papers)} 篇)\n"]
    for i, p in enumerate(papers, 1):
        title = p.get("title", "无标题")
        year = p.get("year", "?")
        citations = p.get("citationCount", 0)
        authors = _fmt_authors(p.get("authors", []))
        abstract = (p.get("abstract") or "").strip()[:200]
        ext = p.get("externalIds") or {}
        arxiv_id = ext.get("ArXiv", "")
        out.append(
            f"## {i}. {title}\n"
            f"**Authors:** {authors}  \n"
            f"**Year:** {year} | **Citations:** {citations}  \n"
            f"**S2 ID:** `{p.get('paperId')}`"
            + (f" | **arXiv:** `{arxiv_id}`" if arxiv_id else "")
            + "  \n"
            f"**Abstract:** {abstract}{'...' if abstract else '(无摘要)'}\n"
        )
    return "\n".join(out)


def cmd_detail(args) -> str:
    pid = args.paper_id
    # Auto-detect ID type
    if pid.startswith(("10.", "ARXIV:", "DOI:", "MAG:", "PMID:", "PMCID:")):
        lookup = pid
    elif pid.isdigit() and len(pid) >= 10:
        lookup = f"ARXIV:{pid}"
    else:
        lookup = pid  # assume raw S2 paperId
    fields = S2_FIELDS + ",references.title,references.year,tldr"
    data = _s2_get(f"{S2_BASE}/paper/{lookup}", {"fields": fields})
    if "error" in data:
        return f"查询失败: {data['error']}"
    title = data.get("title", "无标题")
    authors = _fmt_authors(data.get("authors", []), n=5)
    year = data.get("year", "?")
    citations = data.get("citationCount", 0)
    abstract = data.get("abstract") or "(无摘要)"
    tldr = (data.get("tldr") or {}).get("text") or "(无 TL;DR)"
    refs = (data.get("references") or [])[:10]
    out = [
        f"# {title}",
        f"**Authors:** {authors}  ",
        f"**Year:** {year} | **Citations:** {citations}  ",
        f"**ID:** `{data.get('paperId')}`  ",
        f"**URL:** {data.get('url', '')}",
        "",
        "## TL;DR",
        tldr,
        "",
        "## Abstract",
        abstract,
        "",
        f"## Top {len(refs)} References",
    ]
    for i, r in enumerate(refs, 1):
        out.append(f"{i}. {r.get('title', '?')} ({r.get('year', '?')})")
    return "\n".join(out)


def cmd_citations(args) -> str:
    data = _s2_get(
        f"{S2_BASE}/paper/{args.paper_id}/citations",
        {
            "limit": min(args.limit, 20),
            "fields": "title,year,authors",
        },
    )
    if "error" in data:
        return f"查询失败: {data['error']}"
    cites = data.get("data", [])
    if not cites:
        return "没有找到引用此论文的记录"
    out = [f"# 引用此论文的论文 ({len(cites)} 篇)\n"]
    for i, item in enumerate(cites, 1):
        p = item.get("citingPaper", {})
        title = p.get("title", "?")
        year = p.get("year", "?")
        authors = _fmt_authors(p.get("authors", []), n=2)
        out.append(f"{i}. **{title}** ({year}) — {authors}")
    return "\n".join(out)


def cmd_arxiv(args) -> str:
    try:
        import arxiv
    except ImportError:
        return "需要安装 arxiv: pip install arxiv"
    search = arxiv.Search(
        query=args.query,
        max_results=min(args.max_results, 10),
        sort_by=arxiv.SortCriterion.Relevance,
    )
    results = list(arxiv.Client().results(search))
    if not results:
        return f"没有找到与 '{args.query}' 相关的 arXiv 论文"
    out = [f"# arXiv 搜索结果 ({len(results)} 篇)\n"]
    for i, p in enumerate(results, 1):
        arxiv_id = p.entry_id.rsplit("/", 1)[-1]
        out.append(
            f"## {i}. {p.title}\n"
            f"**Authors:** {', '.join(a.name for a in p.authors[:3])}  \n"
            f"**arXiv ID:** `{arxiv_id}`  \n"
            f"**Published:** {p.published.strftime('%Y-%m-%d')}  \n"
            f"**Summary:** {p.summary[:200].strip()}...\n"
        )
    return "\n".join(out)


def cmd_download(args) -> str:
    try:
        import arxiv
    except ImportError:
        return "需要安装 arxiv: pip install arxiv"
    save_dir = Path(args.save_dir).resolve()
    save_dir.mkdir(parents=True, exist_ok=True)
    search = arxiv.Search(id_list=[args.arxiv_id])
    paper = next(arxiv.Client().results(search), None)
    if paper is None:
        return f"找不到 arXiv ID: {args.arxiv_id}"
    path = paper.download_pdf(dirpath=str(save_dir))
    return f"已下载: {path}"


def cmd_read(args) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return "需要安装 PyMuPDF: pip install PyMuPDF"
    pdf = Path(args.pdf_path)
    if not pdf.exists():
        return f"PDF 不存在: {pdf}"
    doc = fitz.open(str(pdf))
    pages = min(args.max_pages, doc.page_count)
    chunks = []
    for i in range(pages):
        text = doc.load_page(i).get_text().strip()
        if text:
            chunks.append(f"--- Page {i + 1} ---\n{text}")
    doc.close()
    if not chunks:
        return "PDF无法提取文本（可能是扫描件）"
    return "\n\n".join(chunks)


# ---------- CLI ----------

def main():
    parser = argparse.ArgumentParser(prog="papers", description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("search", help="Semantic Scholar 搜索")
    p.add_argument("query")
    p.add_argument("--limit", type=int, default=10)
    p.set_defaults(fn=cmd_search)

    p = sub.add_parser("detail", help="论文详情 (支持 DOI / ARXIV:id / S2 paperId)")
    p.add_argument("paper_id")
    p.set_defaults(fn=cmd_detail)

    p = sub.add_parser("citations", help="该论文的引用列表")
    p.add_argument("paper_id")
    p.add_argument("--limit", type=int, default=10)
    p.set_defaults(fn=cmd_citations)

    p = sub.add_parser("arxiv", help="arXiv 搜索")
    p.add_argument("query")
    p.add_argument("--max-results", type=int, default=5)
    p.set_defaults(fn=cmd_arxiv)

    p = sub.add_parser("download", help="下载 arXiv PDF")
    p.add_argument("arxiv_id")
    p.add_argument("--save-dir", default=".")
    p.set_defaults(fn=cmd_download)

    p = sub.add_parser("read", help="提取 PDF 文本 (PyMuPDF)")
    p.add_argument("pdf_path")
    p.add_argument("--max-pages", type=int, default=10)
    p.set_defaults(fn=cmd_read)

    args = parser.parse_args()
    try:
        print(args.fn(args))
    except Exception as e:
        print(f"错误: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
