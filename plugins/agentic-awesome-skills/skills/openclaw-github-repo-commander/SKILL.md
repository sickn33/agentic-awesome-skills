---
name: openclaw-github-repo-commander
description: "7-stage super workflow for GitHub repo audit, cleanup, PR review, and competitor analysis"
category: development-and-testing
risk: safe
source: community
date_added: "2026-03-18"
author: wd041216-bit
tags: [github, git, repository, audit, cleanup, workflow, devtools, automation, code-review, security]
tools: [claude, cursor]
---
# OpenClaw GitHub Repo Commander

## Overview

A structured 7-stage super workflow for comprehensive GitHub repository management. This skill automates repository auditing, cleanup, competitor benchmarking, and optimization — turning a messy repo into a clean, well-documented, production-ready project.

## When to Use This Skill

- Use when you need to audit a repository for secrets, junk files, or low-quality content
- Use when the user says "clean up my repo", "optimize my GitHub project", or "audit this library"
- Use when reviewing or creating pull requests with structured analysis
- Use when comparing your project against competitors on GitHub
- Use when running `/super-workflow` or `/openclaw-github-repo-commander` on a repo URL

## How It Works

### Stage 1: Intake
Clone the target repository, define success criteria, and establish baseline metrics.

### Stage 2: Execution
Run `scripts/repo-audit.sh <repo-path>` from this skill directory — automated read-only checks for:
- Hardcoded secrets (`ghp_`, `sk-`, `AKIA`, etc.)
- Tracked `node_modules/` or build artifacts
- Empty directories
- Large files (>1MB)
- Missing `.gitignore` coverage
- Broken internal README links

### Stage 3: Reflection
Deep manual review beyond automation: content quality, documentation consistency, structural issues, version mismatches.

### Stage 4: Competitor Analysis
Search GitHub for similar repositories. Compare documentation standards, feature coverage, star counts, and community adoption.

### Stage 5: Synthesis
Consolidate all findings into a prioritized action plan (P0 critical / P1 important / P2 nice-to-have).

### Stage 6: Iteration
Execute the plan: delete low-value files, fix security issues, upgrade documentation, add CI workflows, update changelogs.

### Stage 7: Validation
Re-run the audit script (target: 7/7 PASS), verify all changes, push to GitHub, and deliver a full report.

## Examples

### Example 1: Full Repo Audit

```
/openclaw-github-repo-commander https://github.com/owner/my-repo
```

Runs all 7 stages and produces a detailed before/after report.

### Example 2: Quick Cleanup

```
Clean up my GitHub repo — remove junk files, fix secrets, add .gitignore
```

### Example 3: Competitor Benchmarking

```
Compare my skill repo with the top 5 similar repos on GitHub
```

## Best Practices

- ✅ Always run Stage 7 validation before pushing
- ✅ Use semantic commit messages: `chore:`, `fix:`, `docs:`
- ✅ Check the `pr_todo.json` file for pending reviewer requests
- ❌ Don't skip Stage 4 — competitor analysis reveals blind spots
- ❌ Don't commit `node_modules/` or `.env` files

## Security & Safety Notes

- The audit script scans for common secret patterns but excludes `.github/workflows/` to avoid false positives
- The bundled script is read-only: it reports findings and never deletes, rewrites, stages, commits, or pushes files
- All `gh` CLI operations use the user's existing authentication — no credentials are stored by this skill
- The skill never modifies files without explicit user confirmation in Stage 6

## Source Attribution

Originally contributed by [@wd041216-bit](https://github.com/wd041216-bit) in [PR #340](https://github.com/sickn33/agentic-awesome-skills/pull/340). No standalone upstream repository is currently available for this skill.

**License**: MIT | **Version**: 4.0.0

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
