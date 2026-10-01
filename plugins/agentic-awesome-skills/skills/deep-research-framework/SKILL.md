---
name: deep-research-framework
description: "Framework for deep research reports: define the question and tier sources first, cross-verify, then write conclusion-first reports with explicit uncertainty statements. Use when the user asks for a research report, topic investigation, or competitive analysis."
category: research
risk: safe
source: https://github.com/alapha888/agent-skills-en
source_repo: alapha888/agent-skills-en
source_type: community
date_added: "2026-10-01"
author: alapha888
tags: [research-reports, source-verification, analysis]
tools: [claude, cursor, gemini, codex]
license: MIT
license_source: https://github.com/alapha888/agent-skills-en/blob/main/LICENSE
---

# Deep Research Report Framework

Produce a report whose "conclusions are trustworthy, process is traceable, and the unknowns are explicitly marked." The quality floor of research is set by its sources, not its prose.

## When to Use

- Use when the user asks for a research report, topic investigation, or competitive analysis.
- Use when sources need tiering and cross-verification before writing conclusions.

## Workflow

1. **Define the question**: write in one sentence what the report must answer. Add at most 3 sub-questions. Starting before the question is clear guarantees the research will sprawl.
2. **Tier your sources** (tier before you search, so you don't believe whatever you find first):
   - Primary: official docs, original papers, original filings, protocol/legal texts, measured data.
   - Secondary: reputable press, industry reports, expert interviews.
   - Tertiary: social-media posts, forum threads, aggregator sites — leads only, never evidence.
3. **Cross-verify**: key conclusions need two or more independent sources. Two sources quoting the same origin don't count as independent. If no second source exists, downgrade the conclusion to "single-source claim" and mark it as such.
4. **Writing structure** (conclusion first):
   - Opening: 3–5 lines stating the core conclusions.
   - Body: one section per sub-question, each in "conclusion → evidence → sources" order.
   - Closing: uncertainty statement — "what wasn't found, what's speculation, under what conditions the conclusions change."
5. **Timestamps**: date every key fact ("as of Sep 2026"). Undated information is treated as "possibly stale" by default.

## Rules

- Mark speculation as speculation. Use "may", "likely", "unverified" — never dress speculation up with "clearly" or "it is well known".
- No tertiary source supports a core conclusion. A forum thread can point a direction, never serve as evidence.
- Every number in the report has a source. A number without a source is deleted, not rewritten.
- State "what you don't know" before "what you know" — honest uncertainty beats pretty certainty.

## Minimal example (report outline template)

```markdown
# Research Report: <Topic> (example outline)

**Core conclusions** (3–5 lines): …

## 1. Sub-question one
- Conclusion: …
- Evidence: … (source: primary/secondary, as of …)
- Evidence: … (second independent source)

## 2. Sub-question two
…

## Uncertainty statement
- Not found: …
- Single-source claims: … (one source only, pending verification)
- Invalidation conditions: if … changes, conclusion X in this report needs reassessment.
```

## Limitations

- Source quality is the ceiling of the report. Declared "primary sources" cannot be verified for authenticity by this skill; it only enforces the tiering and cross-verification discipline.
- Independent-source requirements are a judgment call. Two outlets quoting the same wire story or press release count as one origin, and the skill cannot detect shared-origin syndication automatically.
- Web access is required for source-backed research. Without search or fetch tools the skill stops rather than writing a report from memory, or marks every external fact `[UNVERIFIED]` and warns on the cover.
- Recency claims expire. A dated fact ("as of Sep 2026") is only valid until the underlying source changes; the skill does not re-verify older reports.

## Anti-patterns

- ❌ Single-source verdicts: one social-media post becomes "research shows".
- ❌ Speculation as fact: "clearly" and "it is well known" are the most dangerous words in a research report.
- ❌ Undated facts: 2023 data presented as the current state; the conclusion quietly expires.
- ❌ Evidence pile with no conclusion: 20 sources listed, and the reader still can't tell what the author believes.
- ❌ Hiding the unknowns: burying what wasn't found makes the report look omniscient and plants landmines.
