# Dispatch and poll

`scripts/relay.mjs` wraps cline's headless JSON mode, captures its NDJSON event stream, and writes
a `result.json`. Run one command, then read one file.

## Before the first run

```bash
command -v cline
cline --version
```

Install `cline`; on macOS/Linux it ships as a native binary, on Windows as an npm package (the
relay launches the `.cmd` shim with `shell:true`). Authenticate with `cline auth`. A headless run
that is not authenticated fails with `status: "failed"` (exit 1).

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
| `--provider <name>` | Cline provider name (default: cline's own default). Token-validated. |
| `--model <id>` | Cline model id (default: cline's own default). Provider-local and qualified ids are accepted. Token-validated: letters, digits, `. _ : / -`. |
| `--plan` | Plan mode with `--auto-approve false`; explicit `--auto-approve true` is rejected so Cline cannot auto-approve a switch to act mode. |
| `--auto-approve <bool>` | Cline tool auto-approval. Defaults to `true` in act mode and `false` with `--plan`. |
| `--timeout <dur>` | Relay watchdog (default: `30m`; h/m/s strings). The relay never passes it as Cline's own `-t` / `--timeout`. |
| `--out-dir <dir>` | Artifact directory (default: a fresh directory under the system temp dir). |
| `-h`, `--help` | Print the relay's header help. |

The child cwd pins the workspace; the relay does not pass Cline's `--cwd`. `-v` (verbose) exposes
provider and model in `run_start`. Fresh JSON runs may omit `sessionId`, and the verified headless
JSON path does not support resume, so the relay has no resume flag.

## Artifacts and result fields

Artifacts live outside the repo by default, so they do not appear in `touchedFiles`; an
`--out-dir` inside the worktree can make the artifacts appear there:

- `brief.txt` - the exact brief.
- `events.jsonl` - raw cline stdout events (every event cline emitted).
- `final.txt` - cline's final text (`run_result.text`); absent if none was emitted.
- `stderr.txt` - complete stderr.
- `result.json` - the stable `delegate-relay.result.v1` contract.

`result.json` fields:

- `schema`, `tool` (`"cline"`), `status` (`completed` | `failed` | `timeout` | `aborted` | `cline_unavailable`), `exitCode`, and `signal` (`null` unless the child died on a signal).
- `workdir`, requested `provider`/`model`, `planMode`, `autoApprove`, `clineVersion`, `sessionId`,
  `startedAt`, and `finishedAt`.
- `actualProvider` and the initial `actualModel` from `run_start`; `run_result` can update the model
  and supplies `finishReason`, `usage`, and `durationMs`.
- `briefPath`, nullable `finalPath`, `eventsPath`, and `stderrPath`. `finalPath` is `null` when
  Cline emitted no final text and `final.txt` was not created.
- `sessionId` - parsed from `run_start` when Cline emits one; otherwise `null`. It is observational,
  not a resume promise.
- `finalMessage` - cline's final text (`run_result.text`).
- `touchedFiles` - `git status --porcelain` lines for the **final working tree under `--cd` only**,
  not an attribution of cline's edits: anything already dirty before dispatch shows up too.
  Dispatch from a clean tree when you want the list to read as "what cline changed". `null` means
  git could not report; `[]` means git ran and the tree is clean.
- `stderrTail` - the last 20 non-empty stderr lines on any run that did not complete (`failed`,
  `timeout`, `aborted`), except a launch failure, which reports `failed` with no `stderrTail`.
- `error` - present for launch failures, preflight failures, when the relay watchdog fires
  (`timeout`), and on an `aborted` run.

## Waiting for completion

The relay blocks. Use the orchestrator's background-command facility, or background it in a shell
and poll for `result.json`. The run is done only when the process exits and the file contains a
`status`. The result file is written atomically, so a partial read is impossible.

A pre-run usage error exits 2 and writes no result. A missing `cline` exits 127 and writes
`status: "cline_unavailable"`.

## When a run misbehaves

- **`status: "cline_unavailable"` (exit 127):** cline is not on PATH. Install it, authenticate,
  and re-dispatch.
- **`status: "failed"`:** read `stderrTail`, `stderrPath`, and the tail of `events.jsonl`. Common
  causes: an unknown `--model`, expired credentials, or a provider error. A `run_result` with a
  `finishReason` other than `completed` is failed even if cline exits zero.
- **`status: "failed"` with an `error` mentioning `version preflight`:** the bounded `cline --version`
  probe failed or hung, so cline was never dispatched. Check the install (`cline --version` yourself).
- **`status: "aborted"`:** the relay itself was killed (its parent's timeout, a stopped task, a
  closed terminal) and forwarded the kill to cline. The result is written before the relay exits;
  inspect the working tree before re-dispatching. On native Windows a hard kill of the relay is
  uncatchable (Node supports no `SIGTERM` handler there), so this status may never get written -
  a relay process that is gone without a `result.json` is an aborted run; inspect the working
  tree and `events.jsonl` directly.
- **`status: "failed"` with `signal: "SIGKILL"`:** the host killed the process, commonly through
  the OOM killer or a supervisor timeout. This is not a cline error; check host memory and
  re-dispatch, or split the task into smaller briefs.
- **`status: "timeout"`:** the `--timeout` watchdog killed the run; `error` reads
  `cline did not finish within --timeout <dur>; killed by the relay watchdog`. Increase
  `--timeout` or split the task. On POSIX the relay sends SIGTERM to the process group, waits 10
  seconds, then sends SIGKILL if needed; on Windows there is no escalation phase - the whole
  process tree is felled immediately with `taskkill /pid <pid> /t /f`.
- **Empty `finalMessage`:** inspect `touchedFiles` and the diff. Add a
  `<structured_output_contract>` to the next brief to require a closing report.

## Recovering lost work

`events.jsonl` in the run directory records every event the implementer streamed. If finished
work is lost - the run killed late, or the working tree damaged afterward - read the event log
before re-dispatching: it identifies which files and tool commands were involved, which scopes
what needs redoing. Tool execution events carry the write/edit arguments, but treat any
reconstruction as unverified until it matches a working-tree diff - when the tree still holds the
work, preserve the tree rather than replaying the log.

## What the relay runs

The launch is equivalent to:

```bash
cline --json -v [--provider <name>] [--model <id>] \
  --auto-approve <true|false> [--plan] \
  "Follow the task instructions provided on stdin." < brief.txt
```

Current Cline JSON mode checks for a positional prompt before reading piped input, so the relay
passes the fixed instruction and streams the real brief on stdin. The child process cwd pins the
workspace. Only token-validated provider/model values and fixed text reach the `shell:true` launch
on native Windows; the brief and cwd do not. `-v` (verbose) exposes the requested provider/model.
Before dispatch the relay runs a
bounded `cline --version` preflight (10s cap) so a hung or crashing CLI fails fast and explicitly
instead of hanging the run. In act mode, auto-approval defaults true. With `--plan`, the relay
forces it false because Cline can otherwise auto-approve a switch to act mode. Cline also exposes
sandbox through `--data-dir` / `CLINE_SANDBOX`; the relay leaves that control to the inherited CLI
environment.

## The commit boundary

The relay never commits. Cline edits the working tree; the orchestrator reviews, re-runs the
gates, and commits. See [review-and-land.md](review-and-land.md).
