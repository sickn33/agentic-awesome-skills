# Dispatch and poll

`scripts/relay.mjs` wraps Qoder's non-interactive print mode with `stream-json` output, captures raw
output, and writes a stable `result.json`.

## Before the first run

```bash
command -v qodercli
qodercli --version
qodercli --list-models
```

Install and authenticate using Qoder's
[official Quick Start](https://docs.qoder.com/en/cli/quick-start). Use `qodercli login` interactively or
`QODER_PERSONAL_ACCESS_TOKEN` for automation.

## Dispatch

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
```

| Flag | Effect |
| --- | --- |
| `--brief <file>` | Brief path; omit to read stdin. |
| `--cd <dir>` | Primary working root and child cwd; defaults to current directory. |
| `--lane <name>` | Fleet lane from `delegate-setup` config. Applies that lane's dials; fails if the lane's `implementer` is not this relay. Explicit dial flags win. |
| `--model <name>` | Exact live model value from `qodercli --list-models`; omit for Qoder's default. |
| `--context-window <n>` | Positive integer requested for models that support explicit sizing. |
| `--resume <id>` | Resume one Qoder session with a delta brief. |
| `--resume-last` | Continue the most recent Qoder session with a delta brief. |
| `--add-dir <dir>` | Add a workspace directory; repeatable. |
| `--permission-mode <mode>` | `default`, `accept_edits`, `auto`, `bypass_permissions`, `dont_ask`, or `plan`; defaults to `auto`. |
| `--timeout <dur>` | Relay watchdog; also bounds version preflight to at most 10s. Defaults to `30m`, using h/m/s syntax. |
| `--out-dir <dir>` | Artifact directory; defaults to a fresh system-temp directory. |
| `-h`, `--help` | Print relay help. |

`--resume` and `--resume-last` are mutually exclusive. Relative `--add-dir` values resolve against
`--cd`.

## Model and context behavior

Qoder's catalog is account- and time-dependent. The relay deliberately accepts a model string rather
than maintaining a stale allowlist. It validates only that the value is non-empty; Qoder remains the
authority on availability.

The relay validates context windows as positive integers and forwards the value unchanged. Qoder
remains the authority on whether the selected model supports it. An omitted value uses Qoder's normal
model behavior.

## Permission behavior

Print mode cannot ask for approval. `auto` is the implementation default: Qoder makes
non-interactive allow/deny decisions. `accept_edits` allows workspace edits but may deny shell actions;
`dont_ask` fails closed; `plan` maps to `default` plus Qoder's Plan work state; and
`bypass_permissions` is only for an explicitly trusted broad run.

Outside a trusted directory, Qoder falls back from any non-default request to `default`. Compare
`permissionMode` with `actualPermissionMode` in `result.json`. No mode replaces diff review.

## Artifacts and result fields

Artifacts default outside the repository:

- `brief.txt` - exact dispatched brief.
- `events.jsonl` - raw Qoder stdout events.
- `final.txt` - final report when captured.
- `stderr.txt` - complete stderr.
- `result.json` - `delegate-relay.result.v1`.

Important `result.json` fields:

- `tool` (`"qoder"`), `status` (`completed`, `failed`, `timeout`, `aborted`, or
  `qoder_unavailable`), `exitCode`, `signal`.
- Requested `model`, `contextWindow`, and `permissionMode`; observed `actualModel` and
  `actualPermissionMode` from Qoder's init event.
- `qoderVersion`, `sessionId`, `resumed`, `startedAt`, and `finishedAt`.
- `usage`, `resultSubtype`, `qoderErrors`, and `permissionDenials` from Qoder's result event.
- `finalMessage` from the result event, falling back to assistant text.
- `touchedFiles` from final `git status --porcelain` under the primary `--cd` only. Existing dirty
  entries are included; `--add-dir` changes are not. `null` means git could not report; `[]` means the
  tree is clean.
- Artifact paths, plus `stderrTail` and `error` on failures.

## Waiting

The relay blocks. Use the orchestrator's background facility or run it in the foreground for short
tasks. A valid run is done when the process exits and `result.json` exists. A usage error exits 2 before
creating artifacts; missing Qoder exits 127 with `qoder_unavailable`.

## Failures

- **`qoder_unavailable`:** install Qoder CLI, authenticate, and re-dispatch.
- **Preflight `failed` or `timeout`:** `qodercli --version` failed or exceeded its bound; Qoder was
  not dispatched. Fix the installation before retrying.
- **`failed`:** read `qoderErrors`, `permissionDenials`, `stderrTail`, `stderr.txt`, and the tail of
  `events.jsonl`. Fix auth, model/context compatibility, permissions, or the brief, then re-dispatch.
- **`timeout`:** increase `--timeout` or split the task. The relay terminates Qoder's process tree.
- **`aborted`:** the orchestrator stopped the relay; review any touched files before re-dispatching.
- **No result after the relay disappears:** treat the run as aborted and inspect the working tree and
  `events.jsonl`. Native Windows cannot deliver Node a catchable `SIGTERM`.
- **Empty final message:** inspect the diff; require a structured report in the next delta brief.

## Recovering lost work

`events.jsonl` records what Qoder streamed. If a run is interrupted, preserve the working tree first;
use the event log to scope any redo, not as proof that edits or gates completed.

## What the relay runs

```bash
qodercli --output-format stream-json --permission-mode auto \
  [--model <name>] [--context-window <n>] [--resume <id> | -c] \
  [--add-dir <dir> ...] -p <brief>
```

The relay spawns `qodercli` directly without a shell, never commits, and makes no network calls of its
own. Continue with [review-and-land.md](review-and-land.md).
