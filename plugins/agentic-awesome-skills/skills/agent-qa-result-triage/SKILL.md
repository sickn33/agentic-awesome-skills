---
name: agent-qa-result-triage
description: "Triage failed Agent QA runs with MCP evidence, artifacts, logs, fixed failure categories, confidence, and actionable next steps."
category: testing
risk: safe
source: https://github.com/vostride/agent-qa/tree/main/skills/agent-qa-result-triage
source_repo: vostride/agent-qa
source_type: official
date_added: "2026-08-16"
author: Vostride
tags: [testing, qa, triage, mcp, debugging]
tools: [claude, cursor, gemini, codex]
license: FSL-1.1-ALv2
license_source: https://github.com/vostride/agent-qa/blob/main/LICENSE.md
---

# Agent QA Result Triage

## Overview

Classify a failed Agent QA run from its recorded evidence instead of guessing. Inspect the run, steps, artifacts, and logs; choose one fixed category; and return confidence, likely ownership, and the next evidence-backed action.

## When to Use

- Investigating a failed or interrupted Agent QA run.
- Inspecting run artifacts, step results, or execution logs.
- Comparing recent related runs for recurring failure patterns.
- Deciding whether a failure belongs to a test, product, hook, browser/mobile runtime, or infrastructure owner.

## Workflow

1. Start with `agent_qa_get_run` for run status, suite child context, steps, and attempts.
2. Fetch evidence before deciding:
   - `agent_qa_get_run_artifact`
   - `agent_qa_get_run_steps`
   - `agent_qa_get_run_logs`
   - `agent_qa_get_run_execution_logs`
3. Call `agent_qa_classify_failure` and use its category as the default classification unless stronger evidence contradicts it.
4. Compare recent related runs when they are available in the classifier output.
5. Return a concise triage result: category, confidence, evidence, likely fix area, and next action.
6. For code changes, switch to `agent-qa-debug-fix` after triage is complete.

## Categories

Use exactly one category from `references/triage-categories.md`:

- `timeout`
- `appium_startup`
- `browser_disconnect`
- `element_not_found`
- `assertion_failure`
- `hook_failure`
- `infrastructure`
- `unknown_failure`

## Evidence Rules

- Quote or summarize concrete artifact, log, or step evidence.
- Mention missing artifact sections when they limit confidence.
- Do not invent screenshots, videos, logs, or memory context that MCP did not return.
- If MCP is unavailable, use dashboard REST APIs or Agent QA CLI output as a fallback and state which evidence was unavailable.
- Redact credentials, session tokens, personal data, and unrelated application content from the report.

## Example

```json
{
  "category": "element_not_found",
  "confidence": "high",
  "evidence": ["Step 4 could not resolve the described checkout button"],
  "likely_fix_area": "test definition or changed product UI",
  "next_action": "Inspect the captured UI context, then compare the current checkout screen"
}
```

## Limitations

- Classification is only as reliable as the retained run artifacts and logs.
- A failure category identifies the most likely failure surface; it does not prove root cause.
- Missing screenshots, DOM/accessibility context, device logs, or prior runs must lower confidence.
- This skill does not modify tests or application code; use `agent-qa-debug-fix` for an authorized repair.
