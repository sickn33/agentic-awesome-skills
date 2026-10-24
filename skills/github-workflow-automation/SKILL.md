---
name: github-workflow-automation
description: "Patterns for automating GitHub workflows with AI assistance, inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) and modern DevOps practices."
risk: critical
source: community
date_added: "2026-02-27"
---

# 🔧 GitHub Workflow Automation

> Patterns for automating GitHub workflows with AI assistance, inspired by [Gemini CLI](https://github.com/google-gemini/gemini-cli) and modern DevOps practices.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use this skill when:

- Automating PR reviews with AI
- Setting up issue triage automation
- Creating GitHub Actions workflows
- Integrating AI into CI/CD pipelines
- Automating Git operations (rebases, cherry-picks)

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Trust boundaries and missing implementations

These are partial design sketches, not ready-to-enable workflows: analyzeIssue/callAI/ai/execFile and the provider SDK setup are not supplied, example model/action versions are historical, multiline-output handling is incomplete, and deploy/rebase/rollback are deliberately disabled until concrete safeguards exist. Obtain authorization before enabling comments, labels, stale closure, schedules, branch pushes or protection changes. Never interpolate issue/comment/diff/file/branch text into shell or JavaScript source; pass data via environment or private files and use argument arrays with validated full SHAs. Use NUL-delimited Git filenames, random output delimiters or bounded artifact files instead of fixed EOF/multiline one-line outputs. Treat model inputs/results as untrusted; validate structured labels and bounded markdown and never let prompt text authorize tools or approve a PR. Do not execute fork/PR code, package scripts or checked-out actions in a secret/write-token context; use a trusted isolated reviewer, minimal permissions, pinned reviewed action SHAs and restricted network/data transfer. Public/fork PRs normally lack provider secrets/write tokens: fail/skip honestly rather than switching to an unsafe pull_request_target checkout. Check actual maintainer permission via GitHub API, exact command syntax, same-repo branch ownership and current head before any rebase; use an explicit expected-head lease and report conflicts without forceful resolution. Highest version tag is not last successful deployment, AI risk scores do not satisfy deterministic gates, and commit summaries do not describe all deploy changes. Preserve existing protection/ruleset requirements instead of replacing them with an example context list. Unknown changed paths/config/lockfile changes must trigger the full relevant test set; path selection alone is not dependency analysis.
