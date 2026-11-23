# Reviewer CLI setup and diagnostics

Use this reference to check what a specific CLI isolates, prepare a manual round, or diagnose a failed one. The normal command and the evidence needed to accept a round are in `SKILL.md` section Running it.

## What each reviewer can still see

- A fresh Codex session in a read-only sandbox excludes user config and its MCP servers, execpolicy rules, connected apps, plugins, tool suggestions, web search, image generation, memory and saved sessions. A flag disables hooks. Repository and `CODEX_HOME` `AGENTS.md`, bundled skills, agent tools and administrator additions remain. Name them in the report (`codex-agents` § Reviewer points to the manual checks).
- A fresh headless Claude Code session uses read-only tools. It has no settings, hooks, plugins, MCP servers, auto-memory or saved session, starting from the repository and brief alone.
- Grok runs with read-only tools. Its memory, managed MCP servers, and Claude, Cursor and Codex compatibility, including session reading, are off for the run. The wrapper reads whatever still loads from `grok inspect` and prints it for the report. In a trusted folder, that includes project instructions and a gitignored `CLAUDE.local.md`. A review worktree of the snapshot does not hold that file.

A sandbox flag alone is insufficient. In Codex, `-s read-only` binds only shell commands; user configuration can add tools acting outside it (Codex CLI 0.159.0, observed `2026-10-29`). Ignoring user config does not remove connected apps, plugins or web search (Codex CLI 0.166.0, observed `2026-11-14`). Leave that configuration out and switch those features off by name; apply `codex-agents` § Reviewer.

## Wrapper flags and paging

**Use the repository's runnable fallback when the default reviewer cannot run.** `--reviewer auto` defaults to the first installed of Codex, Claude Code and Grok. Choose `--reviewer codex`, `claude` or `grok` explicitly. Codex runs `exec --json --ephemeral --ignore-user-config --ignore-rules -s read-only --disable apps --disable plugins --disable tool_suggest --disable image_generation --disable memories --disable hooks -c web_search=disabled`. It passes `--effort` as `model_reasoning_effort` (`xhigh` by default). Its event stream fails a round with no successful command, a completed outside MCP call, a web search, completed file changes, a missing report or events, or a failed turn. Pass the review model the user confirmed (`codex-agents`) with `--model`, because ignoring user config also omits your configured model. On Windows, `--windows-sandbox elevated|unelevated` explicitly overrides the mode; absent that flag, the wrapper restores `[windows].sandbox` from config. It stops with setup instructions when neither supplies a mode (observed `2026-11-16`, Codex CLI 0.169.0). Claude runs `claude -p` with `--restricted`, `--tools Read,Grep,Glob`, `--strict-mcp-config`, `--no-session-persistence`, `--effort max` and `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`. Measured on 2026-10-10: without that variable, a headless session loads the project's memory index holding builder notes. With these flags, no project instructions, personal notes, memory or skills list was in its context.

- `2026-11-16`, Codex CLI 0.169.0 on Windows: an elevated review timed out after 60 minutes with zero commands. The unelevated round completed in about 15 minutes. The wrapper therefore accepts an explicit Windows mode override; absence keeps config lookup.

Grok and Claude Code have no shell; Codex has a read-only shell. The wrapper writes the range's log and diffs, then everything uncommitted, to a never-committed file inside the git directory. It lists untracked files individually, with their content. It gives the reviewer the length and paging instructions: some file tools return at most 1,000 lines and may not say there are more. For Grok, it raises the turn cap when paging the subject needs more turns. The Codex and Claude Code runs have no turn cap; `--max-turns` does not apply to them.

## Fallback order

After Codex, the order is Claude Code then Grok. After Claude Code, it's Grok then Codex. After Grok, it's Codex then Claude Code. With no other installed, it prints the `--subject-only` route.

## Manual runs

**Apply the CLI's skill when running a reviewer by hand.** Apply `codex-agents` § Reviewer for the wrapper's Codex command and its manual checks. Apply `grok-agents` for Grok's bare call and each wrapper flag's purpose.

**The prompt comes from a file, the working directory is the repository under review, and stdin never waits on a terminal.** Close stdin with `< /dev/null` when the CLI takes the prompt through a file flag. When it reads stdin, as Codex does, pass the prompt file itself. Never leave stdin waiting on a terminal: that hangs without output. Long inline prompts trip permission classifiers.
