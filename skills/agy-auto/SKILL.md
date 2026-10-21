---
name: agy-auto
description: "Configure agy-auto PreToolUse security gate to run Antigravity CLI (agy) unattended with layered policy controls instead of --dangerously-skip-permissions."
category: security
risk: critical
source: community
source_repo: onkarbadve/agy-auto
source_type: community
date_added: "2026-09-11"
author: onkarbadve
tags: [antigravity, agy, security, permissions, sandboxing, guardrails, cli]
license: "MIT"
license_source: "https://github.com/onkarbadve/agy-auto/blob/main/LICENSE"
tools: [antigravity]
---

# agy-auto — Antigravity Auto-Permission & Security Gate

## External tool prerequisite

Use only an already installed tool whose exact version, complete dependency tree and integrity have been reviewed. This skill does not bootstrap tools or activate external plugins. If the prerequisite is missing, stop that executable path and report it; continue with static analysis when possible. A separate installation task must pin immutable artifacts, stage them outside active agent directories with lifecycle scripts disabled, inspect every bundled file and executable entry point (including tests and hooks), and obtain approval before activation or host configuration changes. Do not substitute a same-named workspace script or fetch a moving branch.


## Overview

`agy-auto` is a PreToolUse hook and security harness for Google Antigravity CLI (`agy`) that supports a reviewed unattended-execution policy without relying on `--dangerously-skip-permissions`. It passes every pending tool call through a multi-layered policy gate: deterministic hard-deny rules, deterministic fast-allow for workspace-scoped and read-only operations, an LLM classifier fallback (Gemini Flash Lite or local llama.cpp), and single-use scoped token approvals with Zero Ambient Authority.

## When to Use This Skill

- Use when running Antigravity CLI (`agy`) unattended or in background agent loops and you want automated tool permissions without exposing system files or credentials.
- Use when you need granular, auditable controls over shell commands, file modifications, and network egress during `agy` workflows.
- Use when setting up a secure pair-programming environment with Antigravity that reduces tool-call exposure within a verified workspace boundary.

## How It Works

### Step 1: Review, Pin, and Install agy-auto

> [!IMPORTANT]
> Because `agy-auto` installs as an active PreToolUse hook on the permission evaluation path, never clone a mutable branch directly into your live plugin directory. Always clone to a temporary staging folder, pin an immutable release tag or commit SHA, and inspect the codebase before making the hook executable.

**Option A: Native Antigravity Plugin (Recommended)**
Use an existing reviewed immutable installation; no upstream code, tests or installer may run during preparation.

Only if the exact CLI/hook combination has been verified to fail closed on missing, failed and tampered hooks, and the user explicitly approves this host permission change, configure `toolPermission: "always-proceed"` in `~/.gemini/antigravity-cli/settings.json` so hooks can gate tool calls:
```json
{
  "toolPermission": "always-proceed"
}
```

**Option B: Global Hook via Installer**
Use an existing reviewed immutable installation; no upstream code, tests or installer may run during preparation.

### Step 2: Policy Evaluation Layers

`agy-auto` evaluates each tool invocation through sequential layers (first match wins):

1. **Hard Deny**: Immediately blocks recursive deletes outside workspace, credential reads (`~/.ssh`, `.env`, cloud tokens), git history rewrites (`push --force`, `rebase`), package publishing, system file writes (`/etc`, shell rc), and gate tampering.
2. **Fast Allow**: Immediately permits parsed read-only commands (`cat`, `grep`, `git status`) and workspace-confined writes without invoking an LLM.
3. **Classifier**: Ambiguous or grey-area commands fall through to an LLM classifier (a configured currently available provider model (verify pricing and private-context transmission), or a local `llama.cpp` / Ollama endpoint) that reviews the pending call against conversation context and fail-closes on timeout.
4. **Scoped Action Approval**: If a command is denied or needs human judgment, the engine issues a single-use 6-character action token bound strictly to `(tool, normalized_cmd, cwd)`. You approve it by replying `> agy-approve <token>` in chat. Conversational phrases like "yes" or "proceed" are ignored to prevent ambient authority leakage.

Before activation, test allowed and denied operations in disposable fixtures, including symlink/path escapes, shell expansions, network requests, missing hook, classifier timeout and token replay. A unit-test pass is not proof all host access is intercepted. Preserve a verified disable/rollback path. No model classifier is merge or policy authority.

## Examples

### Example 1: Approving a Blocked Command

When an unclassified command is blocked, `agy-auto` outputs a token:
```text
tool call denied by pre-tool hook: [agy-auto/classifier] needs human approval: pip install requests. Reply '> agy-approve a1b2c3' in chat to proceed.
```
To authorize this specific command for a single run, reply directly in the chat:
```text
> agy-approve a1b2c3
```

### Example 2: Configuring a Local Model Backend

To run `agy-auto` completely offline using llama.cpp or Ollama instead of cloud APIs, edit `~/.gemini/config/agy-auto/policy.toml`:
```toml
[classifier]
endpoint = "http://127.0.0.1:8080/v1/chat/completions"
model = "qwen2.5-coder:7b"
timeout_s = 20
```

### Example 3: Running Headless Invocations

When invoking `agy` in headless mode (`-p`), always pass `--add-dir` so `agy-auto` recognizes the workspace boundaries:
```bash
agy --add-dir . -p "Run test suite and fix failing cases"
```

## Best Practices

- ✅ Retain the native permission gate unless a reviewed fail-closed hook integration and explicit host-change authorization justify the documented setting. A missing hook with always-proceed may remove the effective gate.
- ✅ Add custom repetitive dev tools (e.g. specialized compilers, formatters) to `[fast_allow]` in `~/.gemini/config/agy-auto/policy.toml` for instant sub-millisecond execution.
- ✅ Pass `--add-dir <path>` when running headless commands (`agy -p`) to prevent false-positive path denials.
- ❌ Do not use `--dangerously-skip-permissions`; `agy-auto` provides safe autonomous execution without removing safety guardrails.
- ❌ Do not attempt conversational approval words ("approve", "proceed", "yes"); approvals strictly require the ephemeral action token.

## Common Pitfalls

- **Problem:** Commands fail with `path is outside the workspace` when running `agy -p`.
  **Solution:** Headless `agy` does not infer workspace roots automatically. Pass `--add-dir .` (e.g. `agy --add-dir . -p "..."`).
- **Problem:** Classifier fails closed with `policy classifier unavailable (The read operation timed out)`.
  **Solution:** Increase `timeout_s` in `~/.gemini/config/agy-auto/policy.toml` (especially when running local LLMs on integrated graphics), or verify your `GEMINI_API_KEY`.
- **Problem:** Changes to `policy.toml` or `hook.sh` are blocked by `[agy-auto/hard_deny]`.
  **Solution:** `agy-auto` enforces self-protection against agents tampering with the security gate. Edit policy files directly from your own shell.

## Limitations

- `agy-auto` only intercepts actions performed via tool calls (e.g. `run_command`, `write_to_file`); it cannot restrict internal LLM network reasoning or Antigravity's own internal context-gathering file reads.
- Requires `toolPermission: "always-proceed"` in Antigravity settings to ensure the PreToolUse hook intercepts all tool invocations.
- Shell parsing is conservative: complex pipelines with computed variable expansions that cannot be statically resolved will fall through to the LLM classifier or require manual token approval.

## Additional Resources

- [agy-auto GitHub Repository](https://github.com/onkarbadve/agy-auto)
- [Antigravity CLI Documentation](https://github.com/google-gemini/antigravity-cli)
