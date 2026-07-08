---
name: ii-commons
description: "Deterministic search across arXiv, PubMed/PMC, and US policy corpora with daily freshness cutoffs."
category: research
risk: safe
source: community
source_repo: Intelligent-Internet/II-Commons-Skills
source_type: community
date_added: "2026-05-26"
author: Intelligent Internet
tags: [research, arxiv, pubmed, pmc, policy, retrieval, cli, codex]
tools: [claude, cursor, gemini, codex, antigravity]
license: "Apache-2.0"
license_source: "https://github.com/Intelligent-Internet/II-Commons-Skills/blob/main/LICENSE"
---

# II-Commons

## Overview

II-Commons provides deterministic retrieval for research agents across arXiv, PubMed/PMC, and supported US policy corpora. Use it when a task needs reproducible search, metadata lookup, full-document Markdown retrieval, or a freshness check before answering with recent evidence.

The upstream project publishes a Node.js CLI as `@intelligentinternet/ii-commons` and a full agent skill at `skills/ii-commons/`.

## When to Use This Skill

- Use when searching arXiv, PubMed/PMC, or supported US policy corpora for evidence.
- Use when the user asks for latest or recent research and corpus freshness matters.
- Use when you need stable identifiers, metadata, or full-document Markdown for downstream analysis.
- Use when comparing evidence across scientific literature and policy documents.

## How It Works

### Step 1: Check Corpus Freshness

Run `cutoff` before freshness-sensitive searches:

```bash
npx @intelligentinternet/ii-commons cutoff
```

Report the relevant cutoff date before interpreting recent results.

### Step 2: Search the Right Corpus

Use this argv shape. Literal examples can be typed as shown, but when the query
comes from a user prompt, pass it as an argument array through the runner API
instead of interpolating it into a shell string. Double quotes do not protect
against command substitution in generated shell commands.

```bash
npx @intelligentinternet/ii-commons search arxiv "large language model inference" --max-results 10
npx @intelligentinternet/ii-commons search pubmed "type 2 diabetes review" --start 20240000 --max-results 10
npx @intelligentinternet/ii-commons search policy "state overtime rule for agricultural workers" --jurisdictions US-CA --max-results 10
```

```js
spawnSync("npx", [
  "@intelligentinternet/ii-commons",
  "search",
  "arxiv",
  userQuery,
  "--max-results",
  "10",
]);
```

Choose `arxiv` for preprints and technical research, `pubmed` for biomedical and clinical literature, and `policy` for supported US policy corpora.

### Step 3: Retrieve Metadata or Markdown

Use stable identifiers from search results:

```bash
npx @intelligentinternet/ii-commons meta "arXiv:2402.03578"
npx @intelligentinternet/ii-commons markdown "PMCID:PMC11152602"
```

Build summaries from search results first, then request Markdown when detailed inspection or full-document grounding is needed.

## Installation

Run the CLI with `npx`:

```bash
npx @intelligentinternet/ii-commons --help
```

Or install globally:

```bash
npm install -g @intelligentinternet/ii-commons
ii-commons cutoff
```

To install the full upstream agent skill, install the `skills/ii-commons/` folder from:

```text
https://github.com/Intelligent-Internet/II-Commons-Skills
```

## Best Practices

- Prefer server-side date filters such as `--start` and `--end` for time-bounded arXiv and PubMed searches.
- Preserve canonical identifiers such as `arXiv:<id>`, `PMID:<id>`, `PMCID:PMC<id>`, and `policy:<jurisdiction>:<id>`.
- Use `cutoff` as the authoritative freshness boundary for each corpus.
- Keep non-time filters conservative until initial search results show the right scope.

## Limitations

- Requires Node.js 18 or newer and outbound network access to `commons.ii.inc`.
- Basic usage works without authentication; higher usage limits may require an API token from `https://commons.ii.inc/`.
- Supported policy coverage is limited to the policy corpora exposed by II-Commons.

## Security & Safety Notes

- Do not print or expose `II_COMMONS_API_KEY` values.
- Treat outputs as retrieval evidence, not expert review. For medical, legal, or policy-sensitive work, cite sources and preserve uncertainty.
- Commands call an external API service; confirm network access is allowed in the user's environment before running them.

## Related Skills

- Use broader web-search or deep-research skills when evidence is outside arXiv, PubMed/PMC, or supported policy corpora.
- Use citation-management skills after II-Commons has identified stable source records.
