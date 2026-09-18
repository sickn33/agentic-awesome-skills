# Dispatch and poll

`scripts/relay.mjs` is the dispatch layer. It wraps `codex exec`, runs the brief in a sandbox, captures
everything, and writes a structured `result.json`. Your job collapses to: run one command, then read
one file. Everything Codex-specific lives in the helper, which is what keeps the loop portable across
orchestrators.

## Before the first run: check the binary

Two gotchas, both worth 30 seconds:

```bash
command -v codex      # the active binary; a stale install (e.g. Homebrew) can shadow a current one
codex --version       # an old binary predates `exec --json`, `-o`, and `exec resume`
codex login status    # must be authenticated
```

The Codex CLI moves fast and behavior shifts between versions, so the helper records the version it
actually ran into `result.json` — if something behaves oddly, check which binary answered.

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
| `--cd <dir>` | Working root for Codex (default: current directory). |
| `--lane <name>` | Fleet lane from `delegate-setup` config. Applies that lane's dials; fails if the lane's `implementer` is not this relay. Explicit dial flags win. |
| `--model <name>` | Codex model (default: Codex's own configured default). |
| `--effort <level>` | Reasoning effort, passed to Codex as `-c model_reasoning_effort=<level>` (default: Codex's own configured default). The relay accepts a bare token; Codex and the model own the supported levels. Applies to fresh and resumed runs. |
| `--sandbox <mode>` | `read-only` \| `workspace-write` \| `danger-full-access` (default: `workspace-write`). `danger-full-access` requires explicit human authorization for that run. |
| `--read-only` | Shortcut for `--sandbox read-only` — review/diagnosis with no edits. |
| `--resume-last` | Continue the most recent Codex session; send only the delta brief (see review-and-land). "Most recent" is global, so an unrelated Codex run can steal it — prefer `--session`. |
| `--session <id>` | Continue one specific thread by id (the `threadId` from a prior `result.json`); send only the delta brief. Mutually exclusive with `--resume-last`; an empty id is rejected. |
| `--clean-env` | Pass only runtime basics (`PATH`, home, locale, temp, `CODEX_HOME`, and Windows equivalents) to Codex and its version preflight. This changes inherited variables only; it does not protect files or other same-user secrets. |
| `--keep-env <name>` | Keep one additional variable under `--clean-env`; repeat for each required environment-backed auth, custom-provider credential, proxy, certificate, or MCP variable. The name must be set and use portable environment-variable syntax. |
| `--skip-git-repo-check` | Allow running outside a git repo. |
| `--timeout <dur>` | Relay-side watchdog (e.g. `30m`, `2h`); on expiry the child is killed and `result.json` gets `status: "timeout"`. Off by default. |
| `--out-dir <dir>` | Where artifacts go (default: a fresh dir under the system temp dir). |

Artifacts default to the system temp dir on purpose: the repo under review stays clean, so the
touched-files report shows only Codex's edits and nothing of the helper's own.

`--clean-env` is not a broader security boundary: Codex can still access files and other same-user
secrets available through `HOME`, `CODEX_HOME`, OS facilities, and the selected sandbox. File- or
OS-backed auth and normal configuration still load, but direct environment-backed auth
(`CODEX_API_KEY` or `CODEX_ACCESS_TOKEN`) needs that variable named with `--keep-env`.
`OPENAI_API_KEY` can still matter as a custom-provider credential; provider, proxy, certificate, or
MCP settings that reference any stripped variable likewise need it named with `--keep-env`. The same
filtered environment is used for preflight and dispatch.

## The result

`<out-dir>/result.json` is the contract. Fields:

- `schema` — the result-format version (currently `delegate-relay.result.v1`)
- `status` — `completed` | `failed` | `timeout` | `aborted` | `codex_unavailable`
- `exitCode` — mirrors Codex's exit code; `128` plus the signal number if the child was killed; `127` if `codex` isn't on PATH; on a `timeout` the relay forces a non-zero code even when the child exited `0` after the watchdog's SIGTERM
- `signal` — the signal that killed the child, otherwise `null`
- `codexVersion` — the binary that actually ran
- `threadId` — feed this to a later `--session <id>` (exact thread; preferred) or `--resume-last` (global "most recent", which another Codex run can steal)
- `finalMessage` — Codex's own final report (the `<structured_output_contract>` you asked for)
- `touchedFiles` — `git status --porcelain` lines in the working root: your review starting point. `null` (not `[]`) when git can't report — `git` missing, or a non-repo run under `--skip-git-repo-check`; `[]` means git ran and the tree is clean
- `briefPath` / `eventsPath` / `finalPath` — the exact brief relay sent, the raw JSONL event stream, and the final-message file
- `workdir`, `sandbox`, `model`, `effort`, `resumeLast`, `session`, `cleanEnv`, `keepEnv`, `startedAt`, `finishedAt` — `sandbox` is the applied mode, or a note that Codex used its active config on an unqualified resume; `session` is the explicit session id, or `null` for fresh and `--resume-last` runs; `keepEnv` records names only, never values
- `stderrTail` — last ~20 stderr lines; present on every run that did not complete (`failed`, `timeout`, `aborted`), absent on `completed`, `codex_unavailable`, and launch failures
- `error` — present on a launch failure, and on `timeout` and `aborted` runs

The helper also prints a summary to stdout and exits with Codex's exit code, so a wrapping script can
branch on success/failure directly.

## Waiting for completion

The helper blocks until Codex finishes. Back it with whatever your orchestrator offers:

- **Claude Code:** run the `Bash` call with `run_in_background: true`; you're notified on completion,
  then read `result.json`.
- **Plain shell / other agents:** foreground for short tasks, or background and poll — `node relay.mjs
  … &` in bash/zsh (including Git Bash/WSL), or your shell's equivalent (`Start-Job` in PowerShell,
  `start /b` in cmd). A run is done when `result.json` exists with a `status`. **But** a pre-run usage
  error (bad args, empty brief) exits with code 2 *before* writing any file — so check the exit code
  too, don't only watch for the file. (A missing `codex` binary exits 127 but *does* write a
  `result.json` with status `codex_unavailable`.)

Trust the working tree and the process state over any progress display. A run is finished when the
process has exited and `result.json` is written — not when a status line says so.

## When a run misbehaves

- **`status: codex_unavailable` (exit 127):** `codex` isn't on PATH or isn't found. Install
  (`npm i -g @openai/codex`) and `codex login`, then re-dispatch.
- **an `error` mentioning `version preflight` (`failed`, or `timeout` at exit 124):** the bounded
  `codex --version` probe exited non-zero or hung past its cap (10s, or `--timeout` when shorter), so
  codex was never dispatched; only the relay's own artifacts may already exist under `--out-dir`.
  Check the install by running `codex --version` yourself.
- **`status: failed`:** read `result.json`'s `stderrTail` and the tail of `eventsPath` for the cause.
  Common causes: an auth lapse, an invalid `--model` or unsupported `--effort`, or a sandbox that
  blocked something the task needed. Fix the cause and re-dispatch; don't paper over it by doing the
  work yourself unless that's what the user wants.
- **`status: timeout`:** the `--timeout` watchdog killed the run. The working tree may hold a
  half-applied change — inspect it before deciding between a longer `--timeout`, a smaller brief,
  or a resume.
- **`status: aborted`:** the relay itself was killed (its parent's timeout, a stopped task, a
  closed terminal) and forwarded the kill to codex. The result is written before the relay exits;
  inspect the working tree before re-dispatching. On native Windows a hard kill of the relay is
  uncatchable (Node supports no `SIGTERM` handler there), so this status may never get written -
  a relay process that is gone without a `result.json` is an aborted run; inspect the working
  tree and `events.jsonl` directly.
- **`status: failed` with `signal: "SIGKILL"`:** the host ended the child — commonly the OOM killer
  or a supervisor timeout, not an implementer error. Free up host memory or split the task into
  smaller briefs, then re-dispatch.
- **Empty `finalMessage`:** Codex exited before producing a final message. Treat as a failed run;
  the events log usually shows where it stopped.

## Recovering lost work

`events.jsonl` in the run directory records every event the implementer streamed. If finished
work is lost — the run killed late, or the working tree damaged afterward — read the event log
before re-dispatching: it identifies which files and tool commands were involved, which scopes
what needs redoing. It cannot rebuild the changes themselves — Codex's JSON stream currently
reports a file change as its path and kind only, without the diff contents — so when the tree
still holds the work, preserve the tree, and otherwise re-dispatch with the log as the map of
what was lost.

## What the helper is doing (and the alternatives)

Under the hood the helper runs roughly:

```bash
codex exec --json -o <final.txt> -s workspace-write [-m model] [-c model_reasoning_effort=<level>] - < brief.txt   # fresh run
codex exec [-s mode] resume --last --json -o <final.txt> [-m model] [-c model_reasoning_effort=<level>] - < delta-brief.txt  # resume
```

On resume, the helper places an explicit `--sandbox`/`--read-only` or fleet-lane sandbox before the
`resume` subcommand so Codex applies it to the resumed turn. Without one, Codex uses its active config.
The helper sets the child process's working directory instead of forwarding `-C`.

Two alternatives exist if you ever want them, but the helper is the recommended path:

- **Raw `codex exec`** — fine for one-offs; you give up the captured `result.json`, touched-files
  summary, and thread-id extraction the helper does for you.
- **The openai-codex Claude Code plugin's companion CLI** (`task`/`status`/`result`) — richer job
  tracking if you have that plugin installed. It runs Codex as a background job behind a broker process,
  so you track jobs through `queued`/`running` states; the bundled helper instead spawns `codex`
  in-process and blocks until completion, so the only state to track is whether `result.json` exists —
  which is why it's the default here.

## The commit boundary

The helper never commits — by design, not omission. Whether Codex's sandbox can write `.git` varies by
version, OS, and execution path, so relying on it is a coin flip. The robust contract is: Codex edits
the working tree, the orchestrator reviews and commits. See [review-and-land.md](review-and-land.md).
