# Dispatch and poll

`scripts/relay.mjs` wraps Vibe's headless `--prompt` mode, captures its structured stream, and writes
a `result.json`. Run one command, then read one file.

## Before the first run

```bash
command -v vibe
vibe --version
```

Install [`uv`](https://docs.astral.sh/uv/getting-started/installation/), then install Vibe with
`uv tool install mistral-vibe`. Configure your API key:

```bash
vibe --setup                    # interactive setup
export MISTRAL_API_KEY="..."    # or set it in the environment
```

Upstream Vibe works on Windows but officially supports and targets UNIX. This repository has not
smoke-tested the relay's native Windows launch; consult the
[official Mistral Vibe documentation](https://github.com/mistralai/mistral-vibe) for Windows guidance.

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
| `--max-turns <n>` | Maximum number of Vibe agent turns (`--max-turns`). Useful for cost control. |
| `--max-price <usd>` | Positive, indicative cost threshold in USD; not a hard budget (`--max-price`). |
| `--max-tokens <n>` | Positive maximum cumulative session tokens (`--max-tokens`). |
| `--session <id>` | Resume a specific Vibe session (`--resume SESSION_ID`); send only the delta brief. |
| `--resume-last` | Resume the most recent Vibe session (`--continue`); send only the delta brief. |
| `--plan-only` | Use Vibe's read-only `plan` agent. |
| `--full-access` | Use Vibe's `auto-approve` agent; arbitrary shell/tools run under the user account. |
| `--enabled-tools <tool>` | Enable only this tool (`--enabled-tools`). Repeatable. |
| `--disabled-tools <tool>` | Disable this tool (`--disabled-tools`). Repeatable. |
| `--timeout <dur>` | Relay watchdog (default: `30m`; h/m/s strings). Vibe has no timeout flag. |
| `--out-dir <dir>` | Artifact directory (default: a fresh directory under the system temp dir). |
| `-h`, `--help` | Print the relay's header help. |

`--session` and `--resume-last` are mutually exclusive, as are `--plan-only` and `--full-access`.
The relay always passes `--trust` so headless runs do not prompt for directory trust. That flag is not
a sandbox or tool permission.

Default mode uses `accept-edits`: Vibe's built-in file edits are approved, while approval-gated shell
commands — including most project gates — are denied headlessly rather than hanging. The orchestrator
runs the gates. Use `--full-access` only with explicit human authorization; it selects
`auto-approve`, which approves all tool executions. Inspect `touchedFiles` and the diff after every run.

## Artifacts and result fields

Artifacts live outside the repo by default, so they do not appear in `touchedFiles`; an `--out-dir`
inside the worktree can make the artifacts appear there:

- `brief.txt` — the exact brief.
- `events.jsonl` — raw Vibe stdout in streaming JSON format.
- `final.txt` — the last non-empty assistant message; absent if none was emitted.
- `stderr.txt` — complete stderr.
- `result.json` — the stable `delegate-relay.result.v1` contract.

`result.json` fields:

- `schema`, `tool` (`"vibe"`), `status` (`completed` | `failed` | `timeout` | `aborted` |
  `vibe_unavailable`), `exitCode`, and `signal` (`null` unless the child died on a signal).
- `workdir`, `agent` (`"accept-edits"`, `"plan"`, or `"auto-approve"`), `maxTurns`, `maxPrice`,
  `maxTokens`, `resumed`, `vibeVersion`, `sessionId`, `startedAt`, and `finishedAt`.
- `briefPath`, `finalPath`, `eventsPath`, and `stderrPath`.
- `finalMessage` — the last non-empty assistant content string; tool calls and tool results are excluded.
- `touchedFiles` — `git status --porcelain` lines for the **final working tree under `--cd`**. Not
  an attribution of Vibe's edits: anything already dirty before dispatch shows up too. Dispatch from
  a clean tree when you want the list to read as "what Vibe changed". `null` means git could not
  report; `[]` means git ran and the tree is clean.
- `stderrTail` — the last 20 non-empty stderr lines on a run that did not complete.
- `error` — present for launch failures, `timeout`, and `aborted`.

Vibe's streaming output does not expose its session id, so `sessionId` is always `null` for schema
compatibility. Use `--resume-last`; retain `--session <id>` only for an id obtained outside the relay.

## Waiting for completion

The helper blocks. Use the orchestrator's background-command facility, or background it in a shell and
poll for `result.json`. The run is done only when the process exits and the file contains a `status`.

A pre-run usage error exits 2 and writes no result. A missing `vibe` exits 127 and writes
`status: "vibe_unavailable"`.

## When a run misbehaves

- **`status: "vibe_unavailable"` (exit 127):** `vibe` isn't on PATH. Install
  [`uv`](https://docs.astral.sh/uv/getting-started/installation/), run
  `uv tool install mistral-vibe`, and configure `MISTRAL_API_KEY`, then re-dispatch.
- **`status: "failed"`:** read `stderrTail`, `stderrPath`, and the tail of `events.jsonl`. Common
  causes: an unconfigured or expired API key, an invalid model, or a trust-folder prompt that was
  not suppressed (the relay passes `--trust`, but check that the binary supports it).
- **`status: "aborted"`:** the relay itself was killed and terminated Vibe's process tree. Inspect the
  working tree before re-dispatching. Native Windows has no catchable `SIGTERM`; a relay that vanishes
  there without `result.json` is an aborted run, so inspect the tree and `events.jsonl` directly.
- **`status: "failed"` with `signal: "SIGKILL"`:** the host killed the process, commonly through the
  OOM killer or a supervisor timeout. This is not a Vibe error; check host memory and re-dispatch, or
  split the task into smaller briefs.
- **`status: "timeout"`:** `error` reads
  `vibe did not finish within --timeout <dur>; killed by the relay watchdog`. Increase `--timeout` or
  split the task. The relay sends SIGTERM, waits 10 seconds, then sends SIGKILL if needed.
- **Empty `finalMessage`:** inspect `touchedFiles` and the diff. Add a
  `<structured_output_contract>` to the next brief to require a closing report. The streaming events
  in `events.jsonl` are the source of truth for diagnosing missing messages.

## Recovering lost work

`events.jsonl` records every message Vibe streamed. If finished work is lost — the run ended late or
the tree was damaged afterward — read it before re-dispatching to scope which files and tools were
involved. It may not contain the edit contents, so treat reconstruction as unverified until it matches
a working-tree diff; when the tree still holds the work, preserve the tree rather than replaying the log.

## What the relay runs

The argv is equivalent to:

```bash
vibe --output streaming --agent <accept-edits|plan|auto-approve> --trust \
  [--max-turns <n>] [--max-price <usd>] [--max-tokens <n>] \
  [--resume SESSION_ID | --continue] \
  [--enabled-tools TOOL ...] [--disabled-tools TOOL ...] \
  --prompt=<brief>
```

The prompt rides argv and is visible in the host process list. The relay rejects briefs over 120 KB
on POSIX or 12 KB on Windows before launch because the platforms cap command arguments. It spawns the
native `vibe` binary directly with `--cd` as cwd; no shell or Vibe timeout flag is involved.

## The commit boundary

The relay never commits. Vibe edits the working tree; the orchestrator reviews, re-runs the gates, and
commits. See [review-and-land.md](review-and-land.md).
