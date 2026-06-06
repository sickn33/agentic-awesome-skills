---
name: open-dynamic-workflows
description: "Plan, orchestrate, and adversarially verify parallel AI coding agents with a dynamic multi-agent workflow engine."
category: ai-agents
risk: safe
source: community
source_repo: Suraj1235/open-dynamic-workflows
source_type: community
date_added: "2026-06-06"
author: Suraj1235
tags: [multi-agent, orchestration, workflow, adversarial-verification, coding-agents]
tools: [claude, cursor, codex, gemini, antigravity]
# Optional: declare the upstream license if source_repo is set
license: "MIT"
license_source: "https://github.com/Suraj1235/open-dynamic-workflows/blob/main/LICENSE"
---

# Open Dynamic Workflows

## Overview

Open Dynamic Workflows (ODW) is an open-source dynamic multi-agent workflow engine for AI coding agents such as OpenCode, Codex, Antigravity, and VS Code. It lets you plan a task, orchestrate multiple agents working in parallel, and adversarially verify their output before it lands. ODW ships a Codex/Antigravity skill folder (`SKILL.md` plus a daemon bridge) and an OpenCode plugin, and it is bring-your-own-model (Anthropic, OpenAI-compatible, or Ollama). This skill is adapted from the community project at `Suraj1235/open-dynamic-workflows`.

## When to Use This Skill

- Use when you need to decompose a coding task into independent subtasks and run multiple agents in parallel.
- Use when working across more than one AI coding tool (OpenCode, Codex, Antigravity, VS Code) and want a single orchestration layer.
- Use when the user asks for adversarial review or verification of agent-generated changes before merging.

## How It Works

### Step 1: Plan

ODW takes a high-level goal and produces a dynamic workflow graph of subtasks, identifying which can run in parallel and which have dependencies.

### Step 2: Orchestrate

The engine dispatches subtasks to parallel agents through the OpenCode plugin or the Codex/Antigravity daemon bridge, using your configured model provider (Anthropic, OpenAI-compatible, or Ollama).

### Step 3: Adversarially Verify

Completed work is routed through an adversarial verification pass that challenges the output before results are synthesized and returned.

## Examples

### Example 1: Run a parallel workflow

ODW is installed from source (clone the repo, then `npm install`). The CLI is
`odw-daemon` — run it as `npm run odw -- <args>` from inside the repo, or as
`npx odw-daemon <args>` / a global `odw-daemon` if you link the bin.

```bash
# Configure your model provider (bring-your-own-model)
export ANTHROPIC_API_KEY=...        # or an OpenAI-compatible / Ollama endpoint

# Start the local workflow daemon (once)
npm run odw -- start

# Plan, orchestrate, and verify a task across parallel agents
npm run odw -- run --prompt "refactor the auth module and add tests"
```

### Example 2: Use the Codex/Antigravity skill bridge

```bash
# ODW ships a SKILL.md + daemon bridge consumed by Codex / Antigravity.
# Start the daemon, then run a saved orchestration script through it:
npm run odw -- start
npm run odw -- run --script examples/workflows/studio-prime.workflow.js --cwd .
```

## Best Practices

- ✅ Scope each subtask so agents can run without shared state.
- ✅ Keep the adversarial verification pass enabled before merging agent output.
- ❌ Don't run interdependent subtasks in parallel without declaring their dependencies.
- ❌ Don't commit provider API keys; use environment variables or a secrets manager.

## Limitations

- This skill does not replace environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, or safety boundaries are missing.

## Security & Safety Notes

- ODW executes agent-generated code and shell commands; run it only in an authorized, local, or sandboxed environment.
- Model provider credentials (Anthropic / OpenAI-compatible / Ollama) must be supplied via environment variables, never committed to source.
- Review adversarial-verification output before applying changes to a production branch.

## Common Pitfalls

- **Problem:** Parallel agents collide on the same files.
  **Solution:** Give each subtask exclusive file/module ownership and run conflicting tasks sequentially.

## Related Skills

- `@multi-agent-orchestration` - When coordinating multiple agents on one goal.
- `@code-review` - How adversarial verification complements human review.
