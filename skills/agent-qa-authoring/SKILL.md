---
name: agent-qa-authoring
description: "Create, edit, validate, and run Agent QA tests, suites, and hooks through MCP or CLI while preserving canonical IDs and schema contracts."
category: testing
risk: critical
source: https://github.com/vostride/agent-qa/tree/main/skills/agent-qa-authoring
source_repo: vostride/agent-qa
source_type: official
date_added: "2026-08-16"
author: Vostride
tags: [testing, qa, mcp, web-testing, mobile-testing]
tools: [claude, cursor, gemini, codex]
license: FSL-1.1-ALv2
license_source: https://github.com/vostride/agent-qa/blob/main/LICENSE.md
---

# Agent QA Authoring

## Overview

Author Agent QA tests, suites, and hooks without inventing schema fields or identifiers. Prefer Agent QA's MCP tools, use the bundled contract reference for exact fields, and validate every definition before saving or running it.

## When to Use

- Creating or editing an Agent QA test, suite, or hook.
- Validating Agent QA YAML or canonical IDs.
- Running a newly authored Agent QA definition through MCP or CLI.
- Investigating which Agent QA configuration fields or workspace patterns apply.

## Preconditions and Approval Boundary

- Work only in a configured Agent QA workspace that the user has authorized.
- Inspect the requested scope before any create, update, delete, or test-run operation.
- Obtain explicit confirmation before deleting a definition or running a test that can change external application state.
- Keep credentials out of definitions and output; use the workspace's configured secret handling.

## Workflow

1. Discover the local surface with `agent_qa_discover`.
2. Inspect active config with `agent_qa_get_config`, especially targets, devices, providers, and `services.mcp`.
3. Load `references/agent-qa-contracts.json` when exact schema fields or ID contracts are needed.
4. Generate every new ID with Agent QA tooling:
   - MCP: `agent_qa_generate_id`
   - CLI fallback: `agent-qa ids generate <test|suite|hook|run|observation>`
   - If neither surface is already installed, stop and ask the user to approve
     an exact Agent QA installation. Do not fetch and execute the package at
     runtime through `npx` or another moving package reference.
5. Never hand-write IDs. Validate existing IDs with `agent_qa_validate_id` or `agent-qa ids validate <type> <id> --json`.
6. Validate definitions before saving:
   - Tests: `agent_qa_validate_test` or `agent_qa_validate_definition` with `kind: "test"`
   - Suites: `agent_qa_validate_suite` or `agent_qa_validate_definition` with `kind: "suite"`
   - Hooks: `agent_qa_validate_definition` with `kind: "hooks"`
7. Prefer MCP authoring mutations:
   - Tests: `agent_qa_create_test`, `agent_qa_update_test`, `agent_qa_delete_test`
   - Suites: `agent_qa_create_suite`, `agent_qa_update_suite`, `agent_qa_delete_suite`
   - Hooks: `agent_qa_create_hook`, `agent_qa_update_hook`, `agent_qa_delete_hook`
8. Use CLI or YAML fallback only when MCP is unavailable. Keep file paths matched by `workspace.testMatch` or `workspace.suiteMatch`.

## Required ID Contracts

- Test IDs: `t_` plus 10 id-agent words.
- Suite IDs: `s_` plus 10 id-agent words.
- Hook IDs: `h_` plus 10 id-agent words.
- Run IDs: `r_` plus 10 id-agent words.
- Observation IDs: `obs_` plus 10 id-agent words.

## Before Running

- Validate YAML first.
- Prefer `agent_qa_enqueue_test_run` and `agent_qa_enqueue_suite_run` over shelling out.
- If using the CLI fallback, run only after validation succeeds.
- Reconfirm the target and environment when a test may mutate real data or trigger external actions.

## Example

```text
User: Add an Agent QA checkout test for the staging target and validate it, but do not run it yet.

Expected handling: discover the workspace, inspect the staging target, generate the test ID,
create the smallest valid definition, validate it, and stop before enqueueing a run.
```

## Limitations

- Requires an installed and configured Agent QA workspace plus any browser, mobile, model-provider, or application dependencies used by the selected target.
- Does not infer undocumented config keys, selectors, UI states, credentials, or test data.
- MCP availability and permissions vary by workspace; state which CLI or YAML fallback was used.
- Validation proves schema compatibility, not that the application behavior or external environment is safe to exercise.

## Do Not

- Do not invent config keys or use legacy root config buckets.
- Do not hand-write IDs.
- Do not mutate files outside configured workspace patterns.
- Do not run destructive or production-facing scenarios without the user's explicit scope and confirmation.
