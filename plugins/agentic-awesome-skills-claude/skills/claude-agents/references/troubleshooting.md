# Claude Code headless troubleshooting

Use these checks when running the raw CLI, diagnosing a wrapper turn or testing what the installed version does. The mode and permission boundary in `SKILL.md` applies on every turn.

## Session continuity

**Resume the recorded session id rather than the directory's latest conversation.** Each working directory has a small state file under `<claude config dir>/claude-agent/`. It records the id Claude Code reported on opening, plus mode, model, effort and extra directories. The next call uses `--resume <id>` with those settings. `--continue` instead takes the directory's latest conversation, whoever started it. `claude -p --continue` includes every `-p` session there (CLI reference, read 2026-10-24).

**The state names the last session that opened, including failed runs.** A usage limit or mid-build timeout leaves state on the session holding the brief and work so far. The next call continues it; `--new` starts over. Automatic resume falls back to a new session only when Claude Code has no transcript for the id. That returns `No conversation found with session ID`, exit 1, without opening a session (observed 2026-10-24). Explicit `--session` fails instead.

**`claude -p --resume` restores the model and nothing else the wrapper sets.** Observed 2026-10-24, Claude Code 2.1.310: a Haiku session started at effort `low`, with `--permission-mode dontAsk`, three tools and no MCP servers. Bare `--resume <id>` kept Haiku but changed effort to `medium`, permission mode to `default`, and access to 145 tools and 11 MCP servers.

A resume starts in the permission mode a new `-p` run would. Pass `--add-dir`, `--mcp-config` and `--settings` again (sessions docs, read 2026-10-24). The wrapper re-sends mode, model, effort and directories every turn. Pass them all every time when calling `claude -p --resume` directly. Without its permission mode, a resumed build denies writes and reports work it never did.

## What a `-p` session loads

**Consult and build load project context; review excludes it.** The observed entries below were checked on 2026-10-24.

| | Plain `claude -p` | consult / build | review | `--bare` |
|---|---|---|---|---|
| Project `CLAUDE.md` / `AGENTS.md`, user `~/.claude/CLAUDE.md` | yes | yes (the project file observed) | no (observed) | no |
| Auto-memory for the directory | yes | yes | no | no |
| Hooks, skills, plugins from settings | yes | yes; consult lists the skills but has no Skill tool to run them | no (`--restricted` ignores user, project and local settings) | no |
| MCP servers | all configured, the account's connectors included | none unless `--mcp` | none | only `--mcp-config` |
| Login | subscription or API key | same | same | `ANTHROPIC_API_KEY` or `apiKeyHelper` only |

**Leave MCP out unless asked.** A delegate does not need the owner's mailbox.

Measured 2026-10-24, a plain `claude -p` in a scratch folder loaded 145 tools and 11 MCP servers. These included the account's mail, chat and drive connectors, alongside 15 plugins and 110 skills. Its first reply wrote a 47k-token prompt cache. That cost $0.0096 on Haiku 5.5, against $0.0012 with three tools and no MCP.

**`--bare` cannot use subscription login and skips the project's instructions.** It never reads OAuth or the keychain. The headless docs, read 2026-10-24, say it will become the default for `-p` in a future release. Re-check `claude --help` when wrapper runs start answering without the project's instructions.

**Point consult and build only at repositories you trust.** Without `--bare` or `--restricted`, a `-p` run executes the project's hooks even in a folder never trusted, with no trust dialog (headless docs, read `2026-10-24`). Without `--strict-mcp-config`, it connects `.mcp.json` servers even in a folder never trusted, with no trust dialog (headless docs, read `2026-10-24`). Consult and build keep the hooks.

## Permission modes, and why nothing may wait on a prompt

**Pass the permission mode explicitly and disable permission prompts.** Since 2.1.302, a `-p` run without a mode starts in Manual unless settings specify `defaultMode` (permission-modes docs, read 2026-10-24). Manual denies every call needing approval. The wrapper always passes a mode and `--permission-prompts none` (2.1.259+). Calls that would prompt are denied immediately, Claude learns nobody can approve them, and the run continues. `dontAsk` still runs calls allowed by the user's settings; review's `--restricted` ignores those settings.

Observed 2026-10-24: consult had no Write tool; `echo x > f` and a `python -c` file write were denied (two `permission_denials`). `git status` ran, and the disk was unchanged. Review had only Read, Grep and Glob and attempted no write. Build, in auto mode on Haiku 5.5, edited a file, ran it and ran `git status`.

**Keep operational changes and production credentials out of auto-mode builds.** Auto mode is a safety net, not a boundary. It needs a supported model and an organization that hasn't disabled it; otherwise the session starts in Manual (permission-modes docs, read 2026-10-24). Supported Anthropic API models are Opus 4.6+, Sonnet 4.6+, Haiku 5.5 and Fable; cloud providers support fewer. The wrapper's stderr line shows the mode that actually ran. Permit development suite runs only within the brief's `delegation` boundaries; production access and operational changes stay out.

## Calling it from inside a sandbox

**Give the Claude process network access and a writable config directory.** It needs the network to reach the API and config writes to save the session. `claude auth status` prints that directory as `configDirectory`.

- **Configure both network and config writes inside Codex `workspace-write`.** On Codex CLI 0.159, Windows, both were needed for a resumable conversation (observed 2026-10-24). Default config opened the session, then failed with `API Error: Connection refused … (ECONNREFUSED)` after about three minutes of retries. With `-c sandbox_workspace_write.network_access=true`, it answered in seven seconds but saved no transcript, preventing continuation. The wrapper now warns when that happens. Adding the config directory as a writable root made a two-turn conversation work:

  ```bash
  codex exec -s workspace-write \
    -c sandbox_workspace_write.network_access=true \
    -c "sandbox_workspace_write.writable_roots=['<claude config dir>']" ...
  ```

  Codex's config reference and approvals-and-security page document both keys, also as `[sandbox_workspace_write]` entries in `config.toml` (read 2026-10-24). `danger-full-access` also works, with no sandbox. Codex ran the command through PowerShell, so put messages containing quotes in a file passed with `--read`.
- **Check transcript saving when running inside another agent's sandbox.** Cursor, Gemini CLI, OpenCode and Grok Build were not tested here. The same network and config-write needs apply; check the disk for the transcript or read the wrapper's warning.

## Cost, limits and long runs

- **Login decides the bill.** A Claude subscription draws on plan limits; an API key bills per token. Reported cost is a client-side estimate either way (headless docs, read 2026-10-24). On resume, `total_cost_usd` is the whole session total. The wrapper prints this run's cost from `model_usage_since_last_result` beside it (observed 2026-10-24).
- **Budget and turn limits stop runs with a non-zero exit.** `--budget` and `--max-turns` both stop the run. Budget exhaustion returns `error_max_budget_usd` (observed 2026-10-24), and spend can exceed the cap, so leave headroom (CLI reference). `--max-turns` appears in the CLI reference but not `claude --help`.
- **Read usage failures and the stream's utilization information.** Usage limits fail the run with the limit's message. Every stream carries a `rate_limit_event` with five-hour and seven-day utilization (observed 2026-10-24).
- **A build round takes minutes to an hour.** Run the wrapper as your harness's background job, rather than inside a shell tool with a short timeout. Use `--log` to watch events. After its last turn, a `-p` run waits up to ten idle minutes for background work it started. `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` controls this (headless docs, read 2026-10-24).
- **Use background sessions for a human watching sessions.** Commands are `claude --bg "<task>"`, then `claude agents --json`, `claude logs <id>`, `claude attach <id>` and `claude stop <id>`. `--bg` cannot combine with `-p`; it prints a session id and returns immediately instead of a result (CLI help and headless docs, read 2026-10-24). The wrapper runs in the foreground.

## Binary lookup

**Use the configured binary, then PATH, then native installer locations.** Lookup tries `$CLAUDE_BIN`, then `claude` on PATH. Windows prefers native `claude.exe` over an npm `.cmd` shim. Native locations are `~/.local/bin`, `~/.claude/local`, and macOS's `/opt/homebrew/bin` and `/usr/local/bin`. The wrapper refuses versions older than 2.1.259, which lack `--permission-prompts`.

## Gotchas captured

- **Effort is visible only in the transcript.** JSON names the model through `modelUsage` and the init event's `model`, but not effort. The transcript records effort on every reply. The wrapper reads it best-effort because that format is internal (observed 2026-10-24). Environment variable `CLAUDE_CODE_EFFORT_LEVEL` overrides `--effort` (env-vars docs). The wrapper warns when it is set and removes it in review mode, so reviews run at the requested effort.
- **An unknown model is not caught up front.** The session opens; its first request fails with `There's an issue with the selected model` (API 404), exit 1 (observed 2026-10-24). State keeps that session, so pass `--model` again or `--new`.
- **A failed run's `result` is the error text.** The wrapper prints it on stderr, never as the answer. When calling `claude -p` directly, check `is_error` rather than exit code alone.
- **Nested under Claude Code it still works.** The child inherits `CLAUDECODE=1` and `CLAUDE_CODE_CHILD_SESSION=1`. Its `-p` sessions remain saved and resumable (observed 2026-10-24; env-vars docs agree).
- **Send the prompt on stdin and close stdin afterward.** The prompt cap is 10 MB (headless docs); name larger material in a file in the brief. Open stdin makes the run wait for more.
