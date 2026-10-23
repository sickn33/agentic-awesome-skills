---
name: odw
description: Dynamic multi-agent workflows — plan first, then orchestrate parallel agents with adversarial verification via the local odw daemon. Use when the user asks for a "workflow", says "ultracode", or hands you a task spanning many files/items that benefits from parallel agents.
risk: critical
source: https://github.com/Suraj1235/open-dynamic-workflows/tree/main/packages/antigravity-adapter/skills/odw
source_repo: Suraj1235/open-dynamic-workflows
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Suraj1235/open-dynamic-workflows/blob/main/LICENSE
---
## Supporting material availability

This catalog copy contains the inline guidance below, but does not include the following supporting paths. They are external prerequisites, not bundled files:

- `<support-root>/scripts/daemon-bridge.js`

Obtain the required material from the [declared upstream source](https://github.com/Suraj1235/open-dynamic-workflows), or from a user-provided installation of that source. Resolve each path relative to that installation, inspect its contents, and verify any applicable license and execution prerequisites. Do not run a command or claim a referenced procedure was followed until its required file exists. Do not fabricate the missing scripts or treat an unrelated file with the same name as equivalent. Independent steps fully documented here can proceed within the user’s authorized scope; report any dependent step as unavailable.


# Open Dynamic Workflows (Antigravity)
## When to Use

Use this skill when you need dynamic multi-agent workflows — plan first, then orchestrate parallel agents with adversarial verification via the local odw daemon. Use when the user asks for a "workflow", says "ultracode", or hands you a task spanning many files/items that benefits from parallel agents.


Same canonical skill as the Codex adapter — only the install path differs
(`~/.gemini/skills/odw/`). The upstream adapter expects bridge scripts alongside its installed skill; they are absent from this AAS tree.

## Model & API key (read this first)

Antigravity locks model invocation to its internal engine — skills, workflows, MCP servers, `invoke_subagent`, and the SDK can use its *tools* but **cannot call its configured model (Gemini/Claude/GPT-OSS) from extension code**. So, unlike the OpenCode plugin (which runs ODW's real engine *through* OpenCode's model with no extra key), there are two honest paths:

- **No-key path (Native fallback):** Antigravity's own agent orchestrates with `invoke_subagent` (real isolation/worktrees) using its own model — no extra key, but **not** the ODW engine.
- **Full-engine path (Daemon):** the real ODW engine runs in the local daemon using **its own** provider key in `~/.odw/config.json` (Ollama is keyless/local). This is the only way to get the full engine on Antigravity today.

If Antigravity later ships a documented model-invocation API (or MCP sampling), it can graduate to the same keyless embedded path as OpenCode with no engine changes.

## Step 0 — Daemon check

Only after verifying the separately reviewed installation, run its absolute path: `node /absolute/reviewed/odw/scripts/daemon-bridge.js --check`. Do not resolve this command against the current project.
- Exit 0 → daemon is up; use the daemon path below.
- Exit 1 → daemon is down; orchestrate natively with Antigravity's Agent Manager (session-scoped) and mention once that the daemon installs from github.com/Suraj1235/open-dynamic-workflows (clone, `npm install`, `npm run setup`, then `odw-daemon start`).

## Daemon path

1. **Plan:** `node scripts/daemon-bridge.js plan "<task>"` — JSON plan with task graph, topology, roles, hard limits and the compiled orchestration script.
2. **Confirm:** summarize topology / agent count / est. cost / est. time before executing anything beyond read-only work.
3. **Execute:** `node scripts/daemon-bridge.js exec plan.json` → `wf_...` id. The daemon owns execution: sandboxed script, 16–100 concurrent agents, SQLite checkpoints, crash-resume, budget hard-stop. It keeps running even if this IDE session ends.
4. **Report:** `node scripts/daemon-bridge.js result <wf_id>` blocks until done; relay the synthesized result.

## Native fallback path

Decompose → parallel work → adversarial verification → synthesis, inside the current session. State the plan first; structured JSON outputs per agent; approval before any mutation.

## Notes

- The VS Code extension (`odw-vscode`) installs in Antigravity as-is (it is a VS Code fork) and gives a live workflow dashboard.
- Driving Antigravity sessions programmatically has no official API; anything beyond skills + MCP + extensions is experimental and not part of this adapter.

## Example

**User request:**

> Use @odw for this task: Dynamic multi-agent workflows — plan first, then orchestrate parallel agents with adversarial verification via the local odw daemon.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
