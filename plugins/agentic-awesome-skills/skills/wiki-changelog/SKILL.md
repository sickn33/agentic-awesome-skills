---
name: wiki-changelog
description: "Generate structured changelogs from git history. Use when user asks \"what changed recently\", \"generate a changelog\", \"summarize commits\" or user wants to understand recent development activity."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Wiki Changelog

Generate structured changelogs from git history.

## When to Use
- User asks "what changed recently", "generate a changelog", "summarize commits"
- User wants to understand recent development activity

## Procedure

1. Establish an explicit commit range or two tags with the user. If none is supplied, propose a precise range and confirm it before generating the changelog; record the resolved start and end revisions.
2. Examine the commits in that range, then inspect their diffs and changed files. Use relevant tests, release notes, issues, or documentation when available to verify behavior rather than relying on commit subjects alone.
3. Group by time period: daily (last 7 days), weekly (older).
4. Classify supported changes: Features (🆕), Fixes (🐛), Refactoring (🔄), Docs (📝), Config (🔧), Dependencies (📦), Breaking (⚠️).
5. Generate concise user-facing descriptions using project terminology. Label user impact as **inferred** when the diff or supporting evidence does not demonstrate it directly.

## Constraints

- Focus on user-facing changes
- Merge related commits into coherent descriptions
- Use project terminology from README
- Report the exact revision range used and keep factual change summaries distinct from inferred user impact
- Do not label a change as breaking or synthesize migration instructions from commit messages alone; require corroborating diff, test, documentation, issue, or release evidence. If that evidence is missing, state the uncertainty instead

### When to Use
This skill is applicable to execute the workflow or actions described in the overview.
