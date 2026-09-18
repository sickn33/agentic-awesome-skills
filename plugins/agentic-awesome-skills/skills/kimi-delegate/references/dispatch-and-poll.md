# Dispatch and poll

`scripts/relay.mjs` wraps Kimi's headless prompt mode, captures its structured stream, and writes a
`result.json`. Run one command, then read one file.

## Before the first run

```bash
command -v kimi
kimi --version
kimi login
```

Install with `brew install kimi-code` on macOS/Linux or use a native installer from the
[official Kimi Code documentation](https://moonshotai.github.io/kimi-code/en/). `kimi login` uses a
device-code flow without opening the TUI; `/login` is also available inside the TUI.

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
| `--model <alias>` | Kimi model alias for this run (default: Kimi's own `default_model`). |
| `--session <id>` | Resume a specific Kimi session; send only the delta brief. |
| `--resume-last` | Resume the most recent Kimi session for this cwd (`kimi --continue`); send only the delta brief. |
| `--add-dir <dir>` | Add an extra workspace directory. Repeatable. Edits there are not reported in `touchedFiles`. |
| `--timeout <dur>` | Relay watchdog (default: `30m`; h/m/s strings). Kimi has no timeout flag. |
| `--out-dir <dir>` | Artifact directory (default: a fresh directory under the system temp dir). |
| `-h`, `--help` | Print the relay's header help. |

`--session` and `--resume-last` are mutually exclusive. The child cwd pins the primary workspace;
`--add-dir` adds extra workspaces only.

Headless `-p` mode always uses Kimi's auto permission mode. Kimi rejects `--prompt` combined with
`--yolo`, `--auto`, or `--plan`, so the relay passes no autonomy flags and has no `--read-only` or
`--full-access` option. Inspect `touchedFiles` and the diff after every run.

## Artifacts and result fields

Artifacts live outside the repo by default, so they do not appear in `touchedFiles`; an `--out-dir`
inside the worktree can make the artifacts appear there:

- `brief.txt` - the exact brief.
- `events.jsonl` - raw Kimi stdout events.
- `final.txt` - assistant text joined with a blank line between chunks; absent if none was emitted.
- `stderr.txt` - complete stderr.
- `result.json` - the stable `delegate-relay.result.v1` contract.

`result.json` fields:

- `schema`, `tool` (`"kimi"`), `status` (`completed` | `failed` | `timeout` | `aborted` | `kimi_unavailable`), `exitCode`, and
  `signal` (`null` unless the child died on a signal).
- `workdir`, `model` (the model alias or `null`), `resumed`, `kimiVersion`, `sessionId`, `startedAt`,
  and `finishedAt`.
- `briefPath`, `finalPath`, `eventsPath`, and `stderrPath`.
- `finalMessage` - assistant `content` strings joined with `"\n\n"`; tool calls and tool results are
  excluded.
- `touchedFiles` - `git status --porcelain` lines for the **final working tree under `--cd` only**,
  not an attribution of Kimi's edits: anything already dirty before dispatch shows up too, and edits
  Kimi makes inside `--add-dir` workspaces do not show up at all - inspect those trees yourself.
  Dispatch from a clean tree when you want the list to read as "what Kimi changed". `null` means git
  could not report; `[]` means git ran and the tree is clean.
- `stderrTail` - the last 20 non-empty stderr lines on any run that did not complete (`failed`, `timeout`, `aborted`), except a launch failure, which reports `failed` with no `stderrTail`.
- `error` - present for launch failures, when the relay watchdog fires (`timeout`), and on an `aborted` run.

Kimi's stream carries no token usage, so `result.json` has no `usage` field.

## Waiting for completion

The helper blocks. Use the orchestrator's background-command facility, or background it in a shell and
poll for `result.json`. The run is done only when the process exits and the file contains a `status`.

A pre-run usage error exits 2 and writes no result. A missing `kimi` exits 127 and writes
`status: "kimi_unavailable"`.

## When a run misbehaves

- **`status: "kimi_unavailable"` (exit 127):** install the native Kimi Code CLI, authenticate with
  `kimi login`, and re-dispatch.
- **an `error` mentioning `version preflight` (`failed`, or `timeout` at exit 124):** the bounded
  `kimi --version` probe exited non-zero or hung past its cap (10s, or `--timeout` when shorter), so
  kimi was never dispatched; only the relay's own artifacts may already exist under `--out-dir`.
  Check the install by running `kimi --version` yourself.
- **`status: "failed"`:** read `stderrTail`, `stderrPath`, and the tail of `events.jsonl`. A common
  cause is an unconfigured model alias: `error: failed to run prompt: config.invalid: Model "<x>" is not configured in config.toml…`
- **`status: "aborted"`:** the relay itself was killed (its parent's timeout, a stopped task, a
  closed terminal) and forwarded the kill to kimi. The result is written before the relay exits;
  inspect the working tree before re-dispatching. On native Windows a hard kill of the relay is
  uncatchable (Node supports no `SIGTERM` handler there), so this status may never get written -
  a relay process that is gone without a `result.json` is an aborted run; inspect the working
  tree and `events.jsonl` directly.
- **`status: "failed"` with `signal: "SIGKILL"`:** the host killed the process, commonly through the
  OOM killer or a supervisor timeout. This is not a Kimi error; check host memory and re-dispatch, or
  split the task into smaller briefs.
- **`status: "timeout"`:** the `--timeout` watchdog killed the run; `error` reads
  `kimi did not finish within --timeout <dur>; killed by the relay watchdog`. Increase `--timeout` or
  split the task. The relay sends SIGTERM, waits 10 seconds, then sends SIGKILL if needed.
- **Empty `finalMessage`:** inspect `touchedFiles` and the diff. Add a
  `<structured_output_contract>` to the next brief to require a closing report.

## Recovering lost work

`events.jsonl` in the run directory records every event the implementer streamed. If finished
work is lost — the run killed late, or the working tree damaged afterward — read the event log
before re-dispatching: it identifies which files and tool commands were involved, which scopes
what needs redoing. Whether it also carries the edit contents depends on what the CLI streams,
so treat any reconstruction as unverified until it matches a working-tree diff — when the tree
still holds the work, preserve the tree rather than replaying the log.

## What the relay runs

The argv is equivalent to:

```bash
kimi --output-format stream-json [--model <alias>] [--session <id> | --continue] \
  [--add-dir <dir> ...] --prompt=<brief>
```

The prompt rides argv and is visible in the host process list. The relay rejects briefs over 120 KB
before launch because the OS caps a single argument. It spawns the native `kimi` binary directly with
the selected `--cd` as cwd; no shell or Kimi timeout flag is involved.

## The commit boundary

The relay never commits. Kimi edits the working tree; the orchestrator reviews, re-runs the gates, and
commits. See [review-and-land.md](review-and-land.md).
