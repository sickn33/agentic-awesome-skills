# Dispatch and poll

`scripts/relay.mjs` is the dispatch layer. It wraps `cmd -p`, feeds it the brief on stdin, captures the
NDJSON event stream, and writes a structured `result.json`. Your job collapses to: run one command,
then read one file. Everything Command Code-specific lives in the helper, which is what keeps the loop
portable across orchestrators.

## Before the first run: check the binary

Three gotchas, all worth 30 seconds:

```bash
command -v cmd        # `cmd` is a generic name — an alias or another tool can shadow it
cmd --version         # the relay records this in result.json; confirm it is Command Code's
cmd status            # must report authenticated (else `cmd login`)
```

On native Windows, use `cmdc`; `cmd` is the system shell. The relay launches the installed `cmdc.cmd`
shim through `cmd.exe`, while the brief stays on stdin and variable argument values stay restricted to
shell-safe tokens. Native Windows launch is contract-tested, but a live Command Code run is still
unverified. `COMMANDCODE_BIN` remains an absolute-path override, including for `.cmd`/`.bat` shims,
and must never point to `COMSPEC`.

## Dispatching

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
```

(`<skill-dir>` is wherever this skill is installed — the folder containing its `SKILL.md`. On Claude
Code it's the printed "Base directory for this skill"; on other orchestrators substitute that install
path. See [`SKILL.md`](../SKILL.md) if you need to locate it.)

Options:

| Flag | Effect |
| --- | --- |
| `--brief <file>` | The brief. Omit it to read the brief from stdin (`node relay.mjs … < brief.txt`). |
| `--cd <dir>` | Working root for Command Code (default: current directory). It is the child's working directory — Command Code has no `--cd` of its own, and under `--yolo` it is a starting point, not a boundary. |
| `--lane <name>` | Fleet lane from `delegate-setup` config. Applies that lane's dials; fails if the lane's `implementer` is not this relay. Explicit dial flags win. |
| `--model <name>` | Model for this run, e.g. `vendor/model` (default: Command Code's own). `cmd --list-models` lists what your account can use. |
| `--effort <level>` | Reasoning effort — `low` \| `medium` \| `high`, model-dependent. The relay accepts a bare token; Command Code and the model own the supported levels. |
| `--read-only` | Withhold the write, edit, and shell tools: no `--yolo`, plus `--permission-mode plan`. For review and diagnosis, followed by a Git-visible `readOnlyViolation` tripwire. |
| `--tools-all` | Also pass `--tools-all`, so no tool stays withheld. Ignored under `--read-only` — it does not lift the write gate. |
| `--max-turns <n>` | Cap conversation turns (default: Command Code's own, 100). Command Code may exit 0 at the cap; when its complete result reports `max_turns`, the relay reports failure and exits 1. |
| `--session <id>` | Continue one specific session by id (the `sessionId` from a prior `result.json`); send only the delta brief. Mutually exclusive with `--continue-last`. |
| `--continue-last` | Continue the most recent session. "Most recent" is global, not per-repo, so an unrelated run can steal it — prefer `--session`. |
| `--clean-env` | Pass only runtime basics (`PATH`, home, locale, temp, and Windows equivalents) to Command Code and its version preflight. This changes inherited variables only; it does not protect files or other same-user secrets. |
| `--keep-env <name>` | Keep one additional variable under `--clean-env`; repeat for each required environment-backed credential, proxy, certificate, or MCP variable. The name must be set and use portable environment-variable syntax. |
| `--timeout <dur>` | Relay-side watchdog (e.g. `30m`, `2h`); on expiry the child is killed and `result.json` gets `status: "timeout"`. Off by default. |
| `--out-dir <dir>` | Where artifacts go (default: a fresh private dir under the system temp dir). |

Artifacts default to the system temp dir so relay-created files stay out of the target repository.
On POSIX, that directory is mode `0700` and its files are created as `0600`. The touched-files report
then shows Command Code's Git-visible edits without the helper's artifacts.

`--clean-env` is not a security boundary: Command Code still reaches files and other same-user secrets
through `HOME` (its own state lives in `~/.commandcode`) and OS facilities, and under `--yolo` there is
no sandbox at all. Its login credentials are file-backed, so a `--clean-env` run stays authenticated;
provider, proxy, certificate, or MCP settings that reference a stripped variable need it named with
`--keep-env`. The same filtered environment is used for preflight and dispatch.

## What the helper is doing

```bash
cmd -p --output-format json --skip-onboarding --no-auto-update -t --yolo [--tools-all] \
    [-m <model>] [--effort <level>] [--max-turns <n>] < brief.txt          # fresh implementation run
cmd -p --output-format json --skip-onboarding --no-auto-update -t --permission-mode plan …  # --read-only
cmd -p … --resume <sessionId> < delta-brief.txt                            # exact-session rework
cmd -p … --continue < delta-brief.txt                                      # most-recent fallback
```

The four constant flags earn their place: `--output-format json` is what makes the run machine-readable
at all, `--skip-onboarding` stops the taste-onboarding prompt from blocking an automated run, `-t`
auto-trusts the project so the trust prompt doesn't, and `--no-auto-update` keeps a background update
from swapping the binary mid-run. The brief goes in on stdin, never in argv — Command Code's `-p` takes
an optional query argument, so an unrecognized flag would be read as that query and the run would die
with "too many arguments". Command Code waits at most 30 seconds for piped stdin; the relay writes the
brief immediately.

## The result

`<out-dir>/result.json` is the contract. Fields:

- `schema` — the result-format version (currently `delegate-relay.result.v1`)
- `status` — `completed` | `failed` | `timeout` | `aborted` | `commandcode_unavailable`
- `exitCode` — preserves Command Code's non-zero exit code; changes a zero exit with a complete non-success result to 1; uses `128` plus the signal number if the child was killed;
  `127` if the binary isn't on PATH; on a `timeout` the relay forces a non-zero code even when the child
  exited `0` after the watchdog's SIGTERM
- `signal` — the signal that killed the child, otherwise `null`
- `commandCodeVersion` — the binary that actually ran
- `sessionId` — feed this to a later `--session <id>` (exact session; preferred) or `--continue-last`
  (global "most recent", which another run can steal)
- `finalMessage` — Command Code's own final report (the `<structured_output_contract>` you asked for),
  lifted from `finalText` on a complete result line or recovered from the last `message_end` or
  `text_delta`; recovered text may be partial or empty, and is written to `finalPath` only when non-empty
- `resultLine` — how much of the tail survived: `complete`, `truncated`, or `absent`. See the
  truncation section below; the four fields under it are null unless this says `complete`
- `resultSubtype` / `stopReason` / `usage` / `durationMs` — straight from that result line: `success`,
  `error`, or `max_turns`; why the turn ended; token counts; wall-clock
- `touchedFiles` — `git status --porcelain` lines in the working root: your review starting point.
  `null` (not `[]`) when git can't report — `git` missing, or a non-repo working root; `[]` means git
  ran and the tree is clean
- `readOnlyViolation` — only meaningful under `--read-only`: `false` when the Git-visible detector
  saw no change beyond the relay's own artifacts; it does not cover ignored or outside-repository
  paths. `true` when the detector saw a change, `null` when git couldn't snapshot either side.
  `null` on write-capable runs, where the question doesn't apply
- `autonomy` — the state the run actually got, in Command Code's terms (`--yolo …` or `plan …`)
- `briefPath` / `eventsPath` / `finalPath` — the exact brief relay sent, the raw NDJSON event stream,
  and the final-message file; `finalPath` is `null` when `finalMessage` is empty
- `workdir`, `readOnly`, `toolsAll`, `model`, `effort`, `maxTurns`, `session`, `continueLast`,
  `cleanEnv`, `keepEnv`, `startedAt`, `finishedAt` — `session` is the explicit session id, or `null`
  for fresh and `--continue-last` runs; `keepEnv` records names only, never values
- `stderrTail` — last ~20 stderr lines; present on every run that did not complete (`failed`,
  `timeout`, `aborted`), absent on `completed`, `commandcode_unavailable`, and launch failures
- `error` — present on a launch failure, on `timeout` and `aborted` runs, and when Command Code
  reported a non-success result of its own

The helper also prints a summary to stdout and exits with Command Code's exit code, so a wrapping
script can branch on success/failure directly.

## The tail is not reliable — read `resultLine`

`cmd` ends a run with a `run_end` event that embeds the **entire conversation** — every tool call,
its arguments, and its result — and then exits with `process.exit`, which discards whatever is still
queued in its stdout pipe. On any run big enough to matter, the tail therefore arrives cut mid-write
and the `result` line after it never lands. Successful live write runs have lost the result line,
either truncating `run_end` or dropping the rest of the stream. A synthetic writer that exits the
same way loses the stream down to whatever fits the OS
pipe buffer, no matter how fast the reader is — so this is the CLI's flush behavior, not the relay's
read speed (the relay batches its event-log writes precisely so it drains as fast as it can).

What the relay does about it, and what it means for you:

- Nothing load-bearing is read from the tail. `sessionId` comes from `run_start`, the **first** line of
  the stream, so resume always works. The report is taken from the last `message_end`, falling back to
  the streamed `text_delta`s of a message whose `message_end` was lost.
- `resultLine` tells you which case you got. Under `truncated` or `absent`, `resultSubtype`,
  `stopReason`, `usage`, and `durationMs` are `null` because the CLI never delivered them — not because
  the run lacked them. The summary prints a note saying so.
- `finalMessage` can still come back short or empty when the report itself was in the discarded
  region. **The diff is the deliverable, not the report** — review `touchedFiles` and `git diff`, and
  treat a thin report as missing information rather than as a failed run.
- Read-only runs are small and usually keep a `complete` result line, so the second-opinion use is
  unaffected.

When a complete result line arrives, `status: "completed"` requires exit 0 and
`resultSubtype: "success"`; any other subtype is reported as failed with exit 1. When the result line
is truncated or absent, the relay falls back to the process exit code: exit 0 is completed and a
non-zero exit is failed. In that fallback case, read `resultLine` and review the diff because the
missing subtype cannot prove the task finished.

## Waiting for completion

The helper blocks until Command Code finishes. Back it with whatever your orchestrator offers:

- **Claude Code:** run the `Bash` call with `run_in_background: true`; you're notified on completion,
  then read `result.json`.
- **Plain shell / other agents:** foreground for short tasks, or background and poll — `node relay.mjs
  … &` in bash/zsh, or your shell's equivalent (`Start-Job` in PowerShell). A run is done when
  `result.json` exists with a `status`. **But** a pre-run usage error (bad args, empty brief) exits with
  code 2 *before* writing any file — so check the exit code too, don't only watch for the file. (A
  missing binary exits 127 but *does* write a `result.json` with status `commandcode_unavailable`.)

Trust the working tree and the process state over any progress display. A run is finished when the
process has exited and `result.json` is written — not when a status line says so.

## When a run misbehaves

- **`status: commandcode_unavailable` (exit 127):** the binary isn't on PATH. Install Command Code, run
  `cmd login` (`cmdc login` on Windows), or set `COMMANDCODE_BIN`, then re-dispatch.
- **an `error` mentioning `version preflight` (`failed`, or `timeout` at exit 124):** the bounded
  `cmd --version` probe exited non-zero or hung past its cap (10s, or `--timeout` when shorter), so
  Command Code was never dispatched; only the relay's own artifacts may already exist under
  `--out-dir`. Check the install by running `cmd --version` yourself.
- **`status: failed` at exit 3:** not authenticated. `cmd login`, then re-dispatch.
- **`status: failed` at exit 5 or 10:** rate limited, or out of credits. Wait, lower the model tier, or
  top up — the relay's summary names which.
- **`status: failed` with `stopReason: max_turns`:** the run hit the turn cap mid-task. If Command Code exited 0, the relay exits 1; otherwise it preserves the non-zero child exit. The
  tree may hold a half-applied change. Inspect it, then either raise `--max-turns` and re-dispatch, or
  split the brief.
- **`status: failed` at exit 0→1 with an `error` about subtype:** Command Code ended the run cleanly
  without succeeding. The usual cause is a write-capable task dispatched `--read-only`, where the report
  says the tools were refused. Re-dispatch without `--read-only`.
- **`status: failed` otherwise:** read `result.json`'s `stderrTail` and the tail of `eventsPath`. Common
  causes: an invalid `--model`, an unsupported `--effort` for the selected model, or a network lapse.
  Fix the cause and re-dispatch; don't paper over it by doing the work yourself unless that's what the
  user wants.
- **`status: timeout`:** the `--timeout` watchdog killed the run. The working tree may hold a
  half-applied change — inspect it before deciding between a longer `--timeout`, a smaller brief,
  or a resume.
- **`status: aborted`:** the relay itself was killed (its parent's timeout, a stopped task, a closed
  terminal) and forwarded the kill to `cmd`. The result is written before the relay exits; inspect the
  working tree before re-dispatching. On native Windows a hard kill of the relay is uncatchable (Node
  supports no `SIGTERM` handler there), so this status may never get written — a relay process that is
  gone without a `result.json` is an aborted run; inspect the working tree and `events.jsonl` directly.
- **`status: failed` with `signal: "SIGKILL"`:** the host ended the child — commonly the OOM killer or
  a supervisor timeout, not an implementer error. Free up host memory or split the task into smaller
  briefs, then re-dispatch.
- **`readOnlyViolation: true`:** the tripwire detected a Git-visible change during a `--read-only`
  run. It cannot attribute a concurrent change to Command Code, but its read-only state is a permission
  layer rather than an OS sandbox. Review the diff and report the warning before doing anything else.
- **Empty `finalMessage`:** this is missing information, not a separate failure state. Read `status`
  and `resultLine`; when the result line is truncated or absent, inspect the event log and diff before
  landing.

## Recovering lost work

`events.jsonl` records every NDJSON line Command Code streamed, and its `run_end` event embeds the
whole conversation — every tool call, its arguments, and its result. That makes the log both the map of
what a lost run did and, for file writes, often a literal copy of the content it wrote. If finished work
is lost — the run killed late, or the tree damaged afterward — read the event log before re-dispatching.
The flip side of that completeness: the log contains whatever the run read or wrote, so treat it as
sensitive as the repo itself, and note that it grows with the transcript (tens of KB for a trivial run,
much more for a long one).

## The commit boundary

The helper never commits — by design, not omission. Under `--yolo` Command Code *can* write `.git`,
which is the reason: a run that commits itself is a run you must unpick before you can review it. The
robust contract is: Command Code edits the working tree, the orchestrator reviews and commits. See
[review-and-land.md](review-and-land.md).
