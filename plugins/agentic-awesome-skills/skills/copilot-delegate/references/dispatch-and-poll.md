# Dispatch and poll

`scripts/relay.mjs` wraps copilot's headless JSONL mode, captures its event stream, and writes
a `result.json`. Run one command, then read one file.

## Before the first run

```bash
command -v copilot
copilot version
```

Install `copilot` (`npm install -g @github/copilot`; the CLI requires Node 22+, the relay itself
runs on Node 18+); on Windows it installs as an npm `.cmd` shim
(the relay launches it with `shell:true`). Authenticate with `copilot login` or set
`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`. A headless run that is not authenticated
fails with `status: "failed"` (exit 1).

## Dispatching

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
```

`<skill-dir>` is the installed folder containing this skill's `SKILL.md`.

| Flag | Effect |
| --- | --- |
| `--brief <file>` | Brief path. Omit it to read the brief from stdin. |
| `--cd <dir>` | Working root and child process cwd (default: current directory). |
| `--lane <name>` | Fleet lane from `delegate-setup` config. Applies that lane's dials; fails if the lane's `implementer` is not this relay. Explicit dial flags win. |
| `--model <name>` | Copilot model (default: copilot's own default, `auto`). Token-validated: letters, digits, `. _ : / -`. |
| `--effort <level>` | Reasoning effort (`low`\|`medium`\|`high`\|`xhigh`\|`max`). Rejected before dispatch if unknown. |
| `--read-only` | Read-only plan mode (`--mode plan`); works without `--allow-all-tools`. Mutually exclusive with `--allow-all-tools`. |
| `--allow-all-tools` | Full tool autonomy; requires explicit human authorization for that run. Without this, headless tool calls are auto-denied and the relay reports `status: "failed"`. Mutually exclusive with `--read-only`. |
| `--resume-last` | Resume the most recent session (`--continue`). |
| `--session <id>` | Resume a specific session (`--resume=<id>`). Mutually exclusive with `--resume-last`. |
| `--timeout <dur>` | Relay watchdog (default: `30m`; h/m/s strings). Copilot has no timeout flag. |
| `--out-dir <dir>` | Artifact directory (default: a fresh directory under the system temp dir). |
| `-h`, `--help` | Print the relay's header help. |

The child cwd pins the workspace. The relay does not pass copilot's `--add-dir`.

## Artifacts and result fields

Artifacts live outside the repo by default, so they do not appear in `touchedFiles`; an
`--out-dir` inside the worktree can make the artifacts appear there:

- `brief.txt` — the exact brief.
- `events.jsonl` — raw copilot stdout events (every JSONL event copilot emitted).
- `final.txt` — the last non-ephemeral `assistant.message` content; absent if none was emitted.
- `stderr.txt` — complete stderr.
- `result.json` — the stable `delegate-relay.result.v1` contract.

`result.json` fields:

- `schema`, `tool` (`"copilot"`), `status` (`completed` | `failed` | `timeout` | `aborted` | `copilot_unavailable`), `exitCode`, and `signal` (`null` unless the child died on a signal).
- `workdir`, `model`, `effort`, `readOnly`, `allowAllTools`, `resumed`, `copilotVersion`,
  `startedAt`, and `finishedAt`.
- `sessionId` — parsed from the `result` event's `sessionId` field; available for resume.
- `finalMessage` — text of the last non-ephemeral `assistant.message` event.
- `touchedFiles` — `git status --porcelain` lines for the **final working tree under `--cd` only**,
  not an attribution of copilot's edits: anything already dirty before dispatch shows up too.
  Dispatch from a clean tree when you want the list to read as "what copilot changed". `null` means
  git could not report; `[]` means git ran and the tree is clean.
- `briefPath`, nullable `finalPath`, `eventsPath`, and `stderrPath`. `finalPath` is `null` when
  copilot emitted no non-ephemeral assistant message and `final.txt` was not created.
- `stderrTail` — the last 20 non-empty stderr lines on any run that did not complete (`failed`,
  `timeout`, `aborted`).
- `error` — present on denial failures (with the CLI's own denial message plus a hint to pass
  `--allow-all-tools`), preflight failures, when the relay watchdog fires (`timeout`), and on an
  `aborted` run.

## Waiting for completion

The relay blocks. Use the orchestrator's background-command facility, or background it in a shell
and poll for `result.json`. The run is done only when the process exits and the file contains a
`status`. The result file is written atomically, so a partial read is impossible.

A pre-run usage error exits 2 and writes no result. A missing `copilot` exits 127 and writes
`status: "copilot_unavailable"`.

## When a run misbehaves

- **`status: "copilot_unavailable"` (exit 127):** copilot is not on PATH. Install it, authenticate,
  and re-dispatch.
- **`status: "failed"` with a denial error:** copilot auto-denied a tool call in headless mode.
  The error message includes the CLI's own denial text and a hint to pass `--allow-all-tools`.
  Re-dispatch with `--allow-all-tools` to grant full tool permissions.
- **`status: "failed"`:** read `stderrTail`, `stderrPath`, and the tail of `events.jsonl`. Common
  causes: an unknown `--model`, expired credentials, or a provider error.
- **`status: "failed"` with an `error` mentioning `version preflight`:** the bounded
  `copilot version` probe failed or hung, so copilot was never dispatched. Check the install
  (`copilot version` yourself).
- **`status: "aborted"`:** the relay itself was killed (its parent's timeout, a stopped task, a
  closed terminal) and forwarded the kill to copilot. The result is written before the relay exits;
  inspect the working tree before re-dispatching.
- **`status: "timeout"`:** the `--timeout` watchdog killed the run; `error` reads
  `copilot did not finish within --timeout <dur>; killed by the relay watchdog`. Increase
  `--timeout` or split the task.
- **Empty `finalMessage`:** inspect `touchedFiles` and the diff. Add a
  `<structured_output_contract>` to the next brief to require a closing report.

## Recovering lost work

`events.jsonl` in the run directory records every JSONL event the implementer streamed. If finished
work is lost — the run killed late, or the working tree damaged afterward — read the event log
before re-dispatching: it identifies which files and tool commands were involved, which scopes
what needs redoing.

## What the relay runs

The launch is equivalent to:

```bash
copilot --output-format json --no-color --stream off \
  [--mode plan] [--allow-all-tools] \
  [--continue | --resume=<id>] \
  [--model <name>] [--effort <level>] \
  -p @<brief.txt>
```

The child process cwd pins the workspace. Only token-validated model/effort/session values and
fixed text reach the `shell:true` launch on native Windows; the brief is delivered via `-p @<file>`
(the CLI's @-prefixed file prompt channel), with the brief path quoted for the shell on Windows.
On resume (`--continue` / `--resume=<id>`) the relay wraps the reference in a fixed directive —
`Execute the instructions in the referenced file, then report what you did. Do not just summarize
the file: @<file>` — because a bare `@<file>` reference in a resumed session is echoed back instead
of executed (verified on copilot 1.0.78). The directive is relay-authored fixed text, so no user
content ever reaches the shell-quoted value on Windows. Fresh runs deliver the bare `@<file>`,
which copilot executes correctly.
Before dispatch the relay runs a bounded `copilot version` preflight (10s cap) so a
hung or crashing CLI fails fast and explicitly instead of hanging the run.

Copilot's JSONL events include ephemeral events (mcp status, skills_loaded, etc.) which the relay
skips, `assistant.message` events whose `data.content` becomes `finalMessage`, and a final
`result` event carrying `sessionId` and `usage.codeChanges`. Tool execution events with
`success: false` and `error.code: "denied"` trigger the denial-detection path.

## The commit boundary

The relay never commits. Copilot edits the working tree; the orchestrator reviews, re-runs the
gates, and commits. See [review-and-land.md](review-and-land.md).
