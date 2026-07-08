---
name: agenttrace-session-audit
description: "Audit local AI coding-agent sessions with agenttrace for cost, tool failures, latency, anomalies, health, diffs, and CI gates."
category: development
risk: safe
source: community
source_repo: luoyuctl/agenttrace
source_type: community
date_added: "2026-05-10"
author: luoyuctl
tags: [ai-coding, observability, cost-tracking, session-analysis]
tools: [claude, cursor, gemini, codex-cli]
license: "MIT"
license_source: "https://github.com/luoyuctl/agenttrace/blob/master/LICENSE"
---

# agenttrace Session Audit

## Overview

Use this skill to inspect local AI coding-agent sessions with
[agenttrace](https://github.com/luoyuctl/agenttrace). It focuses on the process
behind a run: token and cost spikes, tool failures, retry loops, latency gaps,
anomalies, health scores, and session-to-session diffs.

agenttrace is local-first and reads session logs from tools such as Claude Code,
Codex CLI, Gemini CLI, Aider, Cursor exports, OpenCode, Qwen Code, Kimi, and
generic JSON or JSONL traces.

## When to Use This Skill

- Use when a user asks why an AI coding run was slow, expensive, shallow, or unreliable.
- Use when reviewing local agent logs before retrying a failed or suspicious task.
- Use when building a lightweight CI health gate for AI-assisted coding sessions.
- Use when comparing two attempts and looking for changed tool paths, retries, or cost patterns.

## How It Works

### Step 1: Discover Available Sessions

Prefer an installed `agenttrace` binary when it is available on `PATH`. If the
current repository is `luoyuctl/agenttrace`, use `go run ./cmd/agenttrace`
instead.

```bash
agenttrace --doctor
agenttrace --overview
```

If no sessions are detected, report the directories checked by `--doctor` and
ask for the exported session file or log directory.

### Step 2: Produce a Human-Readable Audit

Use Markdown when the user wants a concise report they can inspect or share.

```bash
agenttrace --overview -f markdown -o agenttrace-overview.md
```

In the report, lead with the highest-risk sessions and explain why they matter:
critical anomalies, repeated tool failures, token or cost waste, long latency
gaps, low health scores, and suspiciously shallow sessions.

### Step 3: Inspect One Session or Directory

Use the latest session for a quick check, or pass an explicit export path when
the user provides one.

```bash
agenttrace --latest
agenttrace --latest -f json
agenttrace path/to/session-or-export.json
agenttrace --overview -d path/to/session-dir
```

### Step 4: Compare Attempts When Semantics Matter

Token and latency metrics can look healthy even when an agent confidently takes
the wrong implementation path. When the risk is semantic drift, pair the trace
audit with a diff against a previous or known-good attempt.

Look for:

- changed files or commands that diverge from the intended task
- missing tests or verification steps compared with the reference attempt
- repeated edits around the same files without a clear reason
- lower cost that came from skipping necessary exploration

### Step 5: Add Automation Gates

For CI or repeatable team workflows, use JSON output or health thresholds.

```bash
agenttrace --overview -f json -o agenttrace-overview.json
agenttrace --overview --fail-under-health 80 --fail-on-critical --max-tool-fail-rate 15
```

Tune thresholds to the project. A strict gate is useful for critical workflows;
a reporting-only command is better while the team is learning its baseline.

## Examples

### Quick Local Review

```bash
agenttrace --overview
agenttrace --latest
```

Use this after a long coding-agent run to decide whether the next prompt should
split the task, avoid a failing tool path, add missing tests, or reset context.

### CI Health Check

```bash
agenttrace --overview --fail-under-health 80 --fail-on-critical
```

Use this when agent session logs are available in CI and the team wants a simple
guard against critical anomalies or unhealthy runs.

## Best Practices

- Start with `--doctor` when session discovery is uncertain.
- Report missing fields plainly; do not invent cost, model, latency, or health data.
- Treat prompts, code, and session contents as private local data.
- Prefer JSON output for automation and Markdown output for human review.
- Use trace metrics for process failures and diff/reference review for semantic drift.

## Limitations

- agenttrace can only analyze logs that are present locally or provided as exports.
- Some agents do not expose enough fields to infer cost, model, cache use, or latency.
- Healthy trace metrics do not prove the final code is correct; still run tests and review diffs.
- CI gates should start as advisory until the team understands normal baseline behavior.

## Security & Safety Notes

- Do not upload private session logs to external services unless the user explicitly approves it.
- Do not overwrite user reports unless they requested that exact output path.
- Avoid printing secrets found in prompts, tool output, environment variables, or logs.

## Common Pitfalls

- **Problem:** No sessions are found.
  **Solution:** Run `agenttrace --doctor`, then point agenttrace at the exported file or log directory.

- **Problem:** A run looks cheap and fast but produced the wrong refactor.
  **Solution:** Compare the session against a prior attempt or known-good diff; cost metrics alone will miss semantic drift.

- **Problem:** CI fails too often after adding a health gate.
  **Solution:** Start with JSON or Markdown reporting, inspect normal baselines, then tighten thresholds gradually.

## Related Skills

- `@langfuse` - Use for production LLM application tracing and evaluation.
- `@observability-engineer` - Use for broader service monitoring, SLOs, and incident workflows.
