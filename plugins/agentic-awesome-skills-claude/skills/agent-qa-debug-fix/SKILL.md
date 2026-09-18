---
name: agent-qa-debug-fix
description: "Debug, patch, and verify failed Agent QA runs from MCP evidence, artifacts, logs, and local code without hiding product or infrastructure defects."
category: testing
risk: critical
source: https://github.com/vostride/agent-qa/tree/main/skills/agent-qa-debug-fix
source_repo: vostride/agent-qa
source_type: official
date_added: "2026-08-16"
author: Vostride
tags: [testing, qa, debugging, mcp, self-healing]
tools: [claude, cursor, gemini, codex]
license: FSL-1.1-ALv2
license_source: https://github.com/vostride/agent-qa/blob/main/LICENSE.md
---

# Agent QA Debug Fix

## Overview

Repair a failed Agent QA run from recorded evidence and the relevant local source. Treat the classifier as a hypothesis, make the smallest justified change, and verify the narrowest affected behavior without rewriting a test merely to conceal a real defect.

## When to Use

- A failed Agent QA run has already been triaged and now requires a code or YAML repair.
- Artifacts and logs point to a test, hook, product, runtime, or agent-behavior defect.
- A proposed fix must be verified with the narrowest Agent QA or unit-test rerun.
- The user asks to self-heal or update a stale Agent QA definition from evidence.

## Preconditions and Approval Boundary

- Confirm the repository, workspace, target environment, and files the user authorizes you to modify.
- Inspect the planned test's external side effects before rerunning it; obtain explicit confirmation for production-facing, destructive, or irreversible actions.
- Preserve unrelated user changes and keep the patch limited to the evidenced failure.
- Do not expose credentials or sensitive application data from artifacts and logs.

## Workflow

1. Start with evidence collection:
   - `agent_qa_get_run`
   - `agent_qa_get_run_steps`
   - `agent_qa_get_run_artifact`
   - `agent_qa_get_run_logs`
   - `agent_qa_get_run_execution_logs`
2. Call `agent_qa_classify_failure` and treat its category as a hypothesis, not a verdict.
3. Identify the failing surface: test definition, hook, application under test, runtime infrastructure, or agent behavior.
4. Inspect the relevant local files directly. Do not infer patches from artifacts alone.
5. Explain the evidence-to-change link, then apply the smallest code or YAML change that accounts for the evidence.
6. Validate any changed Agent QA definition before execution.
7. Re-run the narrowest affected Agent QA test, suite, hook, or unit test within the approved environment.
8. Report the root cause, changed files, verification command or MCP action, result, and remaining risk.

## Fix Rules

- Do not invent selectors, screen states, screenshots, logs, or source files.
- Do not rewrite a test merely to make it pass when the artifact shows a product or runtime defect.
- Preserve canonical Agent QA IDs when editing tests, suites, hooks, or memory files.
- Prefer `agent_qa_validate_test`, `agent_qa_validate_suite`, and `agent_qa_validate_definition` before rerunning edited YAML.
- When MCP is unavailable, use dashboard REST APIs or local `.agent-qa` artifacts and state that MCP evidence was unavailable.
- Stop and report the blocker when evidence cannot distinguish between materially different fixes.

## Example

```text
User: Fix the failed staging checkout run, but do not touch production.

Expected handling: collect the failed run evidence, classify it, inspect the implicated local
definition and application code, patch only the evidenced cause, validate, rerun the single
staging test, and report changed files plus remaining uncertainty.
```

## Limitations

- Requires access to the relevant run evidence and local source; artifacts alone may not establish root cause.
- Cannot guarantee that an intermittent browser, device, network, or provider failure is fixed after one successful rerun.
- Does not authorize production changes, data mutation, dependency installation, or broader refactoring beyond the user's approved scope.
- A passing narrow rerun does not replace the repository's normal test suite or human review.
