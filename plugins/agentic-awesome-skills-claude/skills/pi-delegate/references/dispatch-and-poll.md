# Dispatch and poll

`scripts/relay.mjs` wraps pi's non-interactive JSON mode, captures its event stream, and writes a
`result.json`. Run one command, then read one file.

## Before the first run

```bash
command -v pi
pi --version
pi --list-models   # optional: pick a model id for --model
```

Install with `npm install -g @earendil-works/pi-coding-agent`. Authenticate with `/login` inside
pi (subscription providers) or an API-key environment variable; pi stores credentials in
`~/.pi/agent/`.

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
| `--provider <name>` | pi provider name (default: pi's own default). Token-validated. |
| `--model <pattern>` | pi model id or pattern (default: pi's own default). Token-validated: letters, digits, `. _ : / -`. |
| `--session <id>` | Resume a specific pi session; send only the delta brief. |
| `--resume-last` | Continue the most recent pi session for this cwd (`pi --continue`); send only the delta brief. |
| `--read-only` | Restrict pi's callable tools to `--tools read,grep,find,ls`. |
| `--approve` | Trust project-local `.pi` resources for this run. The default passes `--no-approve`. |
| `--timeout <dur>` | Relay watchdog (default: `30m`; h/m/s strings). Pi has no timeout flag. |
| `--out-dir <dir>` | Artifact directory (default: a fresh directory under the system temp dir). |
| `-h`, `--help` | Print the relay's header help. |

`--session` and `--resume-last` are mutually exclusive. The child cwd pins the workspace; pi has
no add-dir flag and no sandbox, so reachability is simply the filesystem.

Remember: pi has no permission modes. A run without `--read-only` can write and execute anything
the user account can. `--read-only` removes write/edit/bash from Pi's callable tool surface, but
installed extension code still runs with the user's host permissions.

## Artifacts and result fields

Artifacts live outside the repo by default, so they do not appear in `touchedFiles`; an
`--out-dir` inside the worktree can make the artifacts appear there:

- `brief.txt` - the exact brief.
- `events.jsonl` - raw pi stdout events (the session header, then every agent event).
- `final.txt` - assistant text joined with a blank line between chunks; absent if none was emitted.
- `stderr.txt` - complete stderr.
- `result.json` - the stable `delegate-relay.result.v1` contract.

`result.json` fields:

- `schema`, `tool` (`"pi"`), `status` (`completed` | `failed` | `timeout` | `aborted` | `pi_unavailable`), `exitCode`, and
  `signal` (`null` unless the child died on a signal).
- `workdir`, requested `provider`/`model`, `projectTrusted`, `readOnly`, `resumed`, `piVersion`,
  `sessionId`, `startedAt`, and `finishedAt`.
- `actualProvider`, `actualModel`, `usage`, and `stopReason` from Pi's final assistant event.
- `briefPath`, `finalPath`, `eventsPath`, and `stderrPath`.
- `sessionId` - parsed from the JSON stream's `session` header. Resume with `--session <id>`.
  Note: `--continue` may mint a new session id for the continued run; the result always reports
  the id of the run that just happened.
- `finalMessage` - assistant text parts joined with `"\n\n"`; tool calls and tool results are
  excluded.
- `touchedFiles` - `git status --porcelain` lines for the **final working tree under `--cd` only**,
  not an attribution of pi's edits: anything already dirty before dispatch shows up too. Dispatch
  from a clean tree when you want the list to read as "what pi changed". `null` means git could
  not report; `[]` means git ran and the tree is clean.
- `stderrTail` - the last 20 non-empty stderr lines on any run that did not complete (`failed`,
  `timeout`, `aborted`), except a launch failure, which reports `failed` with no `stderrTail`.
- `error` - present for launch failures, preflight failures, when the relay watchdog fires
  (`timeout`), and on an `aborted` run.

Pi's stream carries thinking and message-update events the relay archives but does not parse.

## Waiting for completion

The relay blocks. Use the orchestrator's background-command facility, or background it in a
shell and poll for `result.json`. The run is done only when the process exits and the file
contains a `status`. The result file is written atomically, so a partial read is impossible.

A pre-run usage error exits 2 and writes no result. A missing `pi` exits 127 and writes
`status: "pi_unavailable"`.

## When a run misbehaves

- **`status: "pi_unavailable"` (exit 127):** install pi (`npm install -g @earendil-works/pi-coding-agent`),
  authenticate, and re-dispatch.
- **`status: "failed"`:** read `stderrTail`, `stderrPath`, and the tail of `events.jsonl`. Common
  causes: an unknown `--model` (`Model "<x>" not found`), an expired login, or a provider error.
  A final assistant event with `stopReason: "error"` or `"aborted"` is failed even if Pi exits zero.
- **`status: "failed"` with an `error` mentioning `version preflight`:** the bounded `pi --version`
  probe failed or hung, so pi was never dispatched. Check the install (`pi --version` yourself).
- **`status: "aborted"`:** the relay itself was killed (its parent's timeout, a stopped task, a
  closed terminal) and forwarded the kill to pi. The result is written before the relay exits;
  inspect the working tree before re-dispatching. On native Windows a hard kill of the relay is
  uncatchable (Node supports no `SIGTERM` handler there), so this status may never get written -
  a relay process that is gone without a `result.json` is an aborted run; inspect the working
  tree and `events.jsonl` directly.
- **`status: "failed"` with `signal: "SIGKILL"`:** the host killed the process, commonly through
  the OOM killer or a supervisor timeout. This is not a pi error; check host memory and
  re-dispatch, or split the task into smaller briefs.
- **`status: "timeout"`:** the `--timeout` watchdog killed the run; `error` reads
  `pi did not finish within --timeout <dur>; killed by the relay watchdog`. Increase `--timeout`
  or split the task. On POSIX the relay sends SIGTERM to the process group, waits 10 seconds,
  then sends SIGKILL if needed; on Windows there is no escalation phase — the whole process tree
  is felled immediately with `taskkill /pid <pid> /t /f`.
- **Empty `finalMessage`:** inspect `touchedFiles` and the diff. Add a
  `<structured_output_contract>` to the next brief to require a closing report.

## Recovering lost work

`events.jsonl` in the run directory records every event the implementer streamed. If finished
work is lost — the run killed late, or the working tree damaged afterward — read the event log
before re-dispatching: it identifies which files and tool commands were involved, which scopes
what needs redoing. Tool execution events carry the write/edit arguments, but treat any
reconstruction as unverified until it matches a working-tree diff — when the tree still holds the
work, preserve the tree rather than replaying the log.

## What the relay runs

The launch is equivalent to:

```bash
cat brief.txt | pi --mode json [--provider <name>] [--model <pattern>] \
  [--session <id> | --continue] [--approve | --no-approve] [--tools read,grep,find,ls]
```

The brief rides stdin, so it is not visible in the host process list and no argv size cap
applies. On native Windows `pi` is a `.cmd` shim, so the relay launches it with `shell:true`;
only the token-validated `--provider`/`--model`/`--session` values ever ride argv. Before dispatch the relay
runs a bounded `pi --version` preflight (10s cap) so a hung or crashing CLI fails fast and
explicitly instead of hanging the run. The relay passes `--no-approve` by default, so project
`.pi` settings, extensions, and skills stay untrusted; `--approve` opts in for a trusted repository.

## The commit boundary

The relay never commits. Pi edits the working tree; the orchestrator reviews, re-runs the gates,
and commits. See [review-and-land.md](review-and-land.md).
