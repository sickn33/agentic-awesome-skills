# The hook contract, as read from the docs

Vendors change hooks often; every fact here carries the date it was read. When one is wrong, correct the line and its date; never keep the old one beside it. The re-check is in `SKILL.md § Re-verify`.

## Claude Code

Read on `2026-10-24` from the hooks reference (`https://code.claude.com/docs/en/hooks.md`) and the permissions page (`https://code.claude.com/docs/en/permissions.md`), with Claude Code 2.1.310 installed. Version numbers below are the ones the docs or the changelog name.

### Where hooks live

| Location | Scope |
|---|---|
| `~/.claude/settings.json` | every project on your machine. Cloud sessions don't read it |
| `.claude/settings.json` | one project, committed |
| `.claude/settings.local.json` | one project, not committed |
| managed policy settings | the organization; user and project hooks can't remove them |
| a plugin's `hooks/hooks.json` | while the plugin is enabled |
| a skill's frontmatter (`hooks:`) | from the moment the skill is invoked to the end of the session (`once: true` removes it after its first successful run) |
| a subagent's frontmatter | while that subagent runs (a `Stop` hook there becomes `SubagentStop`) |

Hooks from every level merge; none replaces another. Settings-file and plugin hooks also fire for tool calls made inside subagents. `/hooks` lists what is configured and where each one came from. `"disableAllHooks": true` turns all of them off; there is no switch for one hook. In an interactive session, hooks wait until you accept the folder's workspace-trust dialog; in `-p` and SDK runs the folder counts as trusted, so a repository's committed hooks run. Review `.claude/` before scripting `claude -p` over a repository you didn't write.

### Shape

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "python", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/guard.py"],
            "if": "Bash(gh *)", "timeout": 30, "onFailure": "block" } ] } ] }
}
```

- **Event → matcher group → handlers.** Handler types: `command`, `http`, `mcp_tool`, `prompt` (one model turn), `agent` (experimental). Matching handlers run in parallel; an identical handler defined in two settings files runs once.
- **`matcher`**: `"*"`, `""` or omitted matches all. Only letters, digits, `_`, `-`, spaces, `,` and `|` → exact names (`Edit|Write`). Anything else → an unanchored JavaScript regex (`Edit.*` also matches `NotebookEdit`; write `^Edit$`). MCP tools are `mcp__<server>__<tool>`; `mcp__memory` alone matches nothing, write `mcp__memory__.*`. For tool events the matcher filters `tool_name`; `UserPromptSubmit`, `Stop` and a few others take no matcher, and one set there is silently ignored.
- **`if`**: one permission-rule pattern (`"Bash(git *)"`, `"Edit(*.ts)"`) checked before the handler spawns, on tool events only. Bash patterns are checked against every subcommand, including inside `$()` and backticks; when Claude Code can't tell what a command runs, the handler runs anyway. The docs call it best-effort: a hard allow or deny belongs in the permission system.
- **Exec form vs shell form.** With `args`, `command` is spawned directly with no shell, and path placeholders (`${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`) are substituted as plain strings. Without `args`, the string goes to `sh -c` on macOS and Linux, Git Bash on Windows, or PowerShell when Git Bash isn't installed (`"shell": "powershell"` picks it explicitly). Prefer exec form for anything with a path in it. On Windows, exec form needs a real `.exe`; npm's `.cmd` shims need shell form or `node <script>`.
- **`onFailure`**: `"block"` makes a hook that can't start, crashes (exit other than 0 or 2), times out or prints invalid JSON block the action, as exit 2 would. Requires 2.1.295 or later. Has no effect on `Stop`, `SubagentStop`, `TaskCompleted`, `TeammateIdle` or async hooks.
- **`timeout`**: seconds; 600 by default for command hooks (30 on `UserPromptSubmit`). A `PreToolUse` hook that times out does not block unless `onFailure` is `"block"`.

### Input (stdin)

Common fields: `session_id`, `transcript_path`, `cwd` (follows `cd` and worktrees; `${CLAUDE_PROJECT_DIR}` stays where the session started), `permission_mode` (`default`, `plan`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`), `hook_event_name`, plus `agent_id` / `agent_type` inside a subagent. `PreToolUse` adds `tool_name`, `tool_input` and `tool_use_id`; for Bash, `tool_input.command`. For `Write`, `Edit` and `Read`, `tool_input.file_path` is always absolute, and **on Windows it arrives with backslashes even under Git Bash**: a check written as `/src/` never matches until you normalize separators. `PreToolUse` does not fire for files the user `@`-mentions in a prompt.

### Exit codes

| Exit | Meaning |
|---|---|
| 0 | success; JSON on stdout, if any, is applied. Silence is "no decision", not approval: the normal permission flow runs |
| 2 | blocking error on events that can block; stderr is the reason the agent sees. JSON can't override it, even `"allow"` |
| anything else | non-blocking error: the action **goes ahead** and a `hook error` notice appears. Exit 1 is not a block |

What exit 2 does per event (selection): `PreToolUse` blocks the call; `UserPromptSubmit` rejects the prompt; `Stop` / `SubagentStop` keep the agent working; `PreCompact` blocks compaction; `PostToolUse` only shows stderr to the agent, since the tool already ran; `PermissionRequest` ignores it (deny through its `decision` object); `SessionStart` shows stderr to the user only.

### JSON output (exit 0, one JSON object, nothing else on stdout)

- **Universal:** `continue: false` (+ `stopReason`) stops the agent and takes precedence over every event-specific decision; `systemMessage` warns the user; `additionalContext` (inside `hookSpecificOutput`) adds a system reminder the agent reads. Strings over 10,000 characters are moved to a file with a preview. A stray line on stdout, such as a shell profile's greeting, makes the object unreadable.
- **`PreToolUse`:** `hookSpecificOutput.permissionDecision` = `allow` | `deny` | `ask` | `defer`, with `permissionDecisionReason` (shown to the user for `ask`, to the agent for `deny`) and optional `updatedInput` (replaces the whole input). Across several hooks, `deny` > `defer` > `ask` > `allow`. **`ask` forces a prompt even in auto mode**; in a `-p` run nobody can answer, so the call is denied and the agent reads the reason. `defer` only works in `-p`. The prompt is labelled with the hook's source (`[settings]`, `[plugin:<name>]`, `[skill]`). The old top-level `decision: approve|block` is deprecated for this event.
- **Permission rules still apply:** deny and ask rules in settings are evaluated whatever the hook returns, and a hook's exit 2 blocks before allow rules are consulted.
- **`PostToolUse`:** `decision: "block"` + `reason` puts feedback next to the result; `updatedToolOutput` replaces what the agent sees (the tool already ran).
- **`Stop`:** `decision: "block"` + `reason` keeps the agent working; `hookSpecificOutput.additionalContext` does the same without a hook-error label. Check `stop_hook_active` to avoid a loop; after 8 consecutive continuations Claude Code ends the turn anyway. `/goal` is itself a session-scoped prompt-based Stop hook.
- **`SessionStart`:** context only (`additionalContext`); plain stdout is also added as context on this event and on `UserPromptSubmit`.

### Debugging

`claude --debug` writes `~/.claude/debug/<session-id>.txt`; from 2.1.296 each command hook leaves a `Hooks: <event>:<matcher> [command] finished with status N (Nms)` line. A `hook error` notice ending in `No such file or directory` means the hook never ran: watch for it on a new hook's first run.

### Permission rules, the cheaper code path

Read on `2026-10-24`. Rules are evaluated deny, then ask, then allow; the first match wins and specificity doesn't reorder them. Deny and ask rules apply when **any subcommand** matches, including inside a subshell, a command substitution or a loop body, and an ask rule still prompts in auto mode (`"ask": ["Bash(git clean *)"]` prompts for `cd /tmp && git clean -f`).

## Codex

Read on `2026-10-24` from `https://developers.openai.com/codex/hooks` (Codex CLI 0.159.0 installed).

- **Where:** `hooks.json` or inline `[hooks]` tables in `config.toml`, next to each config layer: `~/.codex/` and `<repo>/.codex/` are the usual ones; plugins can bundle `hooks/hooks.json`. All sources load; none replaces another. Project hooks load only when the project's `.codex/` layer is trusted. On by default; `[features] hooks = false` turns them off.
- **Trust:** a non-managed hook runs only after you review and trust its exact definition in `/hooks`. Trust is recorded against the hook's hash, so **an edited hook is skipped until trusted again**; Codex warns at startup.
- **Same shape** as Claude Code: event → matcher (a regex) → handlers. `command` and `mcp_tool` handlers run; `prompt` and `agent` are parsed and skipped. `commandWindows` (TOML `command_windows`) overrides the command on Windows. Hooks run with the session cwd; resolve repo-local scripts from the git root, since Codex may start in a subdirectory.
- **`PreToolUse`** sees shell commands (as `Bash`, `tool_input.command`), `apply_patch` file edits (match `apply_patch`, `Edit` or `Write`), MCP tools and other local function tools; hosted tools such as web search don't pass through it. Deny with `permissionDecision: "deny"`, the older `decision: "block"`, or exit 2 with the reason on stderr. `updatedInput` works only with `"allow"`.
- **`permissionDecision: "ask"` is parsed but not supported yet: Codex marks the hook run as failed and the tool call continues.** An "ask" guard fails open on Codex. Run the guard in `block` mode there.
- The docs' own caveat: some tool paths opt out of hooks, so treat them as a guardrail, not a complete enforcement boundary.

## Cursor

Read on `2026-10-24` from `https://cursor.com/docs/agent/hooks`.

- **Where:** `hooks.json` at `<project>/.cursor/`, `~/.cursor/`, an enterprise path, or team settings. All matching hooks run; `deny` beats `ask` beats `allow` across them.
- **Events have their own names and shapes.** `beforeShellExecution` receives `{"command", "cwd", ...}` at the top level (the scripts here read that too) and answers with `{"permission": "allow" | "deny" | "ask", "user_message", "agent_message"}`. `preToolUse` accepts `"ask"` in its schema but does not enforce it. `beforeMCPExecution`, `beforeReadFile`, `afterFileEdit`, `stop` and others exist.
- **Exit 2 blocks** (same as `"deny"`). Other failures (crash, timeout, other exit codes) **fail open** unless the hook sets `failClosed: true`; for permission hooks, invalid JSON blocks.
- **On Windows the desktop app runs hook commands through PowerShell**, piping the JSON to stdin (`$input` in a PowerShell script).
