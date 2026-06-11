---
name: papers-skill
description: "Skill for academic research workflows: search Semantic Scholar (200M+ papers), inspect citations, download arXiv PDFs, and extract PDF text. Bundles a self-contained Python CLI."
category: research
risk: safe
source: community
source_repo: xwmxcz/papers-skill
source_type: community
date_added: "2026-06-11"
author: xwmxcz
tags: [research, academic, papers, citations, arxiv, semantic-scholar, pdf]
tools: [claude-code, antigravity, cursor, gemini-cli, codex-cli, opencode]
license: "MIT"
license_source: "https://github.com/xwmxcz/papers-skill/blob/main/LICENSE"
---

# Papers Skill

## Overview

Papers Skill turns a coding agent into a literature-research assistant. It
orchestrates a bundled Python CLI (`scripts/papers.py`) that hits the free
Semantic Scholar and arXiv APIs, downloads arXiv PDFs, and extracts text with
PyMuPDF. The agent decides which subcommand to invoke and how to combine
results into a literature scan, a deep read of one paper, an impact analysis,
or a reading list.

This skill is the Skill-mode port of the
[papers-mcp](https://github.com/xwmxcz/papers-mcp) MCP server by the same
author. Both projects share the same feature set; this one ships as a
Claude Code plugin so it can be installed with a single command and needs no
long-running MCP process.

## When to Use This Skill

- Use when the user asks to search academic papers by topic, author, or venue.
- Use when the user names a specific paper (by DOI, arXiv ID, or title) and
  wants metadata, the abstract, the TL;DR, or its reference list.
- Use when the user wants to find work that **cites** a known paper (impact
  analysis, follow-up tracking).
- Use when the user wants to download an arXiv PDF and have it summarized.
- Use when the user asks to build a reading list around a topic.

## Do Not Use This Skill When

- The user wants paywalled non-arXiv full text. This skill cannot bypass
  publisher paywalls; it can only fetch arXiv PDFs and metadata everywhere.
- The user wants OCR over scanned PDFs. PyMuPDF extracts embedded text only;
  scanned image-PDFs return the fallback message and need a separate OCR step.
- The user wants real-time citation alerts or RSS-style watching. This skill
  is request-driven.

## How It Works

### Step 1: Verify dependencies

Three Python packages are required. The skill should check once per session:

```bash
python -c "import httpx, arxiv, fitz" 2>&1 || pip install httpx arxiv PyMuPDF
```

If `python` is not on PATH, fall back to `py` (Windows launcher) or the
absolute interpreter path.

### Step 2: Invoke the bundled CLI

The script lives at `${CLAUDE_PLUGIN_ROOT}/scripts/papers.py` when installed
as a Claude Code plugin, or wherever you placed it in standalone use. Always
quote the path so it survives spaces.

```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" <subcommand> [args]
```

### Step 3: Pick the right subcommand

| Subcommand | Purpose | Example |
|---|---|---|
| `search <query> [--limit N]` | Semantic Scholar search, max 20 | `search "diffusion models" --limit 5` |
| `detail <paper_id>` | Full metadata, TL;DR, top references | `detail 10.48550/arXiv.2310.06825` |
| `citations <paper_id> [--limit N]` | Papers citing this one, max 20 | `citations <id> --limit 15` |
| `arxiv <query> [--max-results N]` | arXiv preprint search, max 10 | `arxiv "RLHF" --max-results 5` |
| `download <arxiv_id> [--save-dir D]` | Save PDF locally | `download 2310.06825 --save-dir ./pdfs` |
| `read <pdf_path> [--max-pages N]` | Extract PDF text via PyMuPDF | `read ./pdfs/foo.pdf --max-pages 20` |

`detail` and `citations` auto-detect the ID type: DOIs starting with `10.`
are used as-is, bare numeric IDs of 10+ digits are treated as arXiv IDs, and
long hex strings are treated as Semantic Scholar `paperId`s.

## Examples

### Example 1: Literature scan on a topic

```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" search "retrieval augmented generation" --limit 10
```

Present results as a ranked table with **# | Title | Year | Citations | ID**,
then ask the user which papers to dig into.

### Example 2: Deep-read one paper

```bash
# 1. Confirm match
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" detail 2005.11401
# 2. Download
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" download 2005.11401 --save-dir ./pdfs
# 3. Extract abstract + intro + conclusion
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" read ./pdfs/2005.11401v4.RAG.pdf --max-pages 10
```

Summarize as: **problem · method · key result · limitations**.

### Example 3: Impact analysis on an anchor paper

```bash
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" detail 10.48550/arXiv.2005.11401
python "${CLAUDE_PLUGIN_ROOT}/scripts/papers.py" citations 10.48550/arXiv.2005.11401 --limit 20
```

Cluster the citing papers by year/theme and highlight the most-cited
follow-ups.

## Best Practices

- ✅ Always call `detail` before `download` to confirm the paper matches user
  intent. Skipping this leads to wrong PDFs being fetched.
- ✅ Include the paper ID alongside every title in your output so the user
  can re-query precisely.
- ✅ Cite as `[FirstAuthor et al., Year] *Title* (cites: N)`.
- ✅ For PDFs you download, always report the absolute save path.
- ❌ Don't crawl. The script auto-retries 429s with exponential backoff;
  don't pile on parallel queries.
- ❌ Don't raise `--max-pages` to 100+ without warning the user — it can
  consume a large amount of context.

## Limitations

- The skill cannot fetch full text from paywalled publishers (Elsevier,
  Springer, Wiley, etc.). It can only read open arXiv PDFs.
- PyMuPDF extracts embedded text only. Scanned image-PDFs return the
  fallback message `PDF无法提取文本（可能是扫描件）`; offer the user an
  alternative version or note that OCR is required.
- Semantic Scholar's anonymous tier rate-limits aggressively. The script
  retries 3× with exponential backoff; persistent 429s during heavy use
  surface as `搜索失败: rate limit, retries exhausted`.
- This skill does not replace environment-specific validation, testing, or
  expert review. Stop and ask for clarification if required inputs are
  missing.

## Security & Safety Notes

- The CLI performs **outbound HTTPS only** to `api.semanticscholar.org` and
  `arxiv.org` (and the arXiv-listed mirror for the bundled `arxiv` package).
  No authentication tokens are sent.
- `download` writes a PDF to the directory the user specifies (default: the
  current working directory). Confirm the save path with the user before
  downloading to an unexpected location.
- `read` opens a local PDF file with PyMuPDF — make sure the path the user
  supplies is one they trust.
- No credentials or API keys are needed or stored anywhere.

## Common Pitfalls

- **Problem:** `需要安装 arxiv: pip install arxiv` or `需要安装 PyMuPDF: pip install PyMuPDF`.
  **Solution:** The script returns this friendly message instead of crashing
  when an optional dependency is missing. Offer to run the install command.

- **Problem:** `搜索失败: rate limit, retries exhausted` from `search` or
  `detail` or `citations`.
  **Solution:** Semantic Scholar is rate-limiting. Wait ~10 seconds and
  retry once. For repeated runs, fall back to `arxiv` for arXiv-indexed work.

- **Problem:** `download` fails with `找不到 arXiv ID: …`.
  **Solution:** The user gave a non-arXiv ID (likely a DOI for a non-arXiv
  paper). Use `detail` to inspect; only papers with an `externalIds.ArXiv`
  field can be downloaded.

- **Problem:** Garbled Chinese output on Windows.
  **Solution:** The script already forces UTF-8 stdout. If the host
  terminal is still misconfigured, set `PYTHONIOENCODING=utf-8` in the
  shell environment.

## Additional Resources

- Skill home (this plugin): https://github.com/xwmxcz/papers-skill
- Upstream MCP server: https://github.com/xwmxcz/papers-mcp
- Semantic Scholar API docs: https://api.semanticscholar.org/
- arXiv API docs: https://info.arxiv.org/help/api/
- PyMuPDF docs: https://pymupdf.readthedocs.io/
