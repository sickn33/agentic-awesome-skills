# Grok Build CLI — headless reference

Verified against `grok` 0.2.93 (stable channel), 2026-07-09. Re-verify with
`grok --help` after major version bumps — flags mirror Claude Code's.

## One-shot headless run

```bash
grok -p "prompt" --output-format json
grok --prompt-file task.md --output-format json   # preferred: no shell-quoting issues
```

⚠️ `grok agent` is NOT a one-shot command — it runs the agent as a stdio/WebSocket
server for SDK/ACP integrations. Always use top-level `grok -p` / `--prompt-file`.

## JSON output shape (verified)

```json
{
  "text": "final response text",
  "stopReason": "EndTurn",
  "sessionId": "019f470d-3e02-7601-b726-1133cc72ef76",
  "requestId": "…",
  "thought": "…"
}
```

`sessionId` is the handle for fix-ups.

- POSIX: `grok --prompt-file task.md --output-format json | python3 -c "import json,sys;print(json.load(sys.stdin)['sessionId'])"`
- Windows (PowerShell): `grok --prompt-file task.md --output-format json | ConvertFrom-Json | Select-Object -ExpandProperty sessionId`

`stopReason: "Cancelled"` with empty `text` means a tool call hit a permission gate and
was auto-cancelled headlessly — you forgot `--always-approve` (see below).

## Permissions — the headless gotcha

**Use `--always-approve` for headless dispatch. Do NOT rely on
`--permission-mode acceptEdits`.**

Verified 2026-07-09: `--permission-mode acceptEdits` FAILS headlessly — the edit tool
hits a permission gate with no interactive approver, and the run returns
`stopReason: "Cancelled"` with no file change. `--always-approve` auto-approves BOTH
edits AND shell commands in one flag (Grok ran the acceptance test itself in the same
run). This is safe in the grok-build workflow because dispatch happens on a clean tree,
the task spec constrains scope, and the orchestrator reviews the full diff before
committing.

Optional hardening: `--sandbox <profile>` (env `GROK_SANDBOX`) restricts filesystem and
network access — layer it on for untrusted repos.

## Resume / fix-up

```bash
grok --resume <sessionId> -p "specific feedback" --always-approve --output-format json
```

Verified: the resumed session retains full context — it knows the repo and files touched
without re-explanation. Pass only the specific feedback, not the whole task again.

## Self-verification (`--check`) — opt-in only

`--check` appends a self-verification loop: Grok spawns a verifier subagent that emits a
checklist, action trace, scope/edge-case evaluation, and its own `VERDICT: PASS`.

Verified: correct but ~doubles wall-clock (a trivial task went from a few seconds to
~48s) and adds token cost, undercutting Grok's speed/cost advantage. Skip it by default —
the orchestrator's review gate is the authority. Add `--check` only for high-stakes tasks
where you want Grok to self-correct before review.

## Update check (session preflight)

```bash
grok update --check --json
# → {"currentVersion":"0.2.93","latestVersion":"0.2.93","updateAvailable":false,"channel":"stable",…}
grok update        # installs latest stable
```

## Key flags

| Flag | Purpose |
|---|---|
| `--always-approve` | Auto-approve all tool executions (edits + shell). **Required for headless.** |
| `--permission-mode <m>` | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan` — but see gotcha above |
| `--allow` / `--deny` | Fine-grained permission rules (Claude Code `--allowedTools` syntax) |
| `--max-turns <N>` | Turn cap — always set for headless runs |
| `--check` | Appends a self-verification loop (opt-in; see above) |
| `--worktree[=name]` | Run in a fresh git worktree (parallel tasks) |
| `--json-schema '<schema>'` | Constrain final output to a JSON Schema |
| `-m <model>` | `grok-4.5` (default) or `grok-composer-2.5-fast` |
| `--cwd <dir>` | Working directory for the run |
| `--best-of-n <N>` | Run N ways in parallel, pick best (headless) |

## Install & auth

- Install / update: follow xAI's Grok CLI install docs for your OS; verify with
  `grok --version`. Works on macOS, Linux, and Windows (PowerShell).
- Auth: grok.com subscription OAuth (`grok login` / `grok logout`). Check with `grok models`.
- Models available: `grok-4.5` (default), `grok-composer-2.5-fast`.
