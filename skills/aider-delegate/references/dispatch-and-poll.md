# Dispatch and poll

The relay (`scripts/relay.mjs`) is the whole dispatch mechanic: it launches Aider headlessly, captures
the run, and writes a structured `result.json`. Node built-ins only, no dependencies, and it never
commits.

## Before the first run

1. `aider --version` succeeds.
2. A model is configured - either Aider's own default, or the `--model` you intend to pass. Provider
   keys come from the environment or Aider's config.
3. The target directory is a git repository. Without git the relay cannot report `touchedFiles`, and
   the diff is the deliverable.
4. The working tree is clean, or you know exactly what was already dirty. `touchedFiles` reports
   everything git sees, not only what Aider wrote.

## Dispatching

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
```

| Flag | Effect |
| --- | --- |
| `--brief <file>` | Path to the brief. Omit to read it from stdin. |
| `--cd <dir>` | Working root for Aider. Default: current directory. |
| `--lane <name>` | Apply a fleet lane's dials from delegate-setup. Explicit flags win. |
| `--model <name>` | Aider's `--model`. Default: Aider's own configured model. |
| `--api-base <url>` | Aider's `--openai-api-base`, for an OpenAI-compatible server. |
| `--edit-format <fmt>` | Aider's `--edit-format` (e.g. `diff`, `whole`, `udiff`). |
| `--architect` | Aider's `--architect` edit format. Mutually exclusive with `--edit-format`. |
| `--file <path>` | Add a file to Aider's editing scope. Repeatable. |
| `--read <path>` | Add a read-only context file. Repeatable. |
| `--subtree-only` | Restrict Aider to the current subtree. |
| `--read-only` | Dispatch as Aider's `--dry-run`: no files modified. |
| `--resume-last` | Restore Aider's chat history for this repo. Send a delta brief. |
| `--history-file <path>` | Pin a specific chat history file (Aider's `--chat-history-file`). |
| `--timeout <dur>` | Relay watchdog, h/m/s. Default `30m`. |
| `--out-dir <dir>` | Where run artifacts go. Default: a fresh dir under the system temp dir. A reused directory has its previous `final.txt` and `result.json` removed before dispatch, so a poller can never read the last run's result as this one's. |

Relative `--file`, `--read`, and `--history-file` paths resolve against `--cd`, not the relay's own
cwd, so they mean what they look like they mean regardless of flag order.

### Local and self-hosted endpoints

`--api-base` points Aider at any OpenAI-compatible server - llama.cpp's server, Ollama, vLLM,
LM Studio - so a delegated run can go to a model on the user's own hardware:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo \
  --model openai/<served-model-name> --api-base http://127.0.0.1:<port>/v1 \
  --edit-format whole --file src/target.py
```

The `openai/` prefix selects the protocol, not a provider catalog entry; the name after it is
whatever the server reports. Export any non-empty `OPENAI_API_KEY` - the client library requires the
header even when the server ignores its value. `--edit-format whole` is the usual choice for smaller
local models, which frequently cannot produce the exact search/replace blocks Aider's default `diff`
format needs; pair it with `--file` so whole-file rewrites stay small.

A server that is not listening reads as a hang rather than an error: Aider retries the connection
until the `--timeout` watchdog fires and the relay reports `status: "timeout"`. Check the endpoint is
up before dispatching a long brief.

The default `30m` watchdog suits short runs. Implementation briefs routinely need `--timeout 1h` or
`2h`; a watchdog that fires mid-edit leaves a partial tree.

## What the relay always passes

These are not configurable, and the reason matters:

| Flag | Why |
| --- | --- |
| `--no-auto-commits` | Aider's `--auto-commits` defaults to `True` and would commit its own edits. |
| `--no-dirty-commits` | Aider's `--dirty-commits` defaults to `True` and would commit your pre-existing uncommitted work before starting. |
| `--no-gitignore` | Aider otherwise writes `.aider*` into `.gitignore` on startup, dirtying the tree. |
| `--yes-always` | A headless run cannot answer a confirmation prompt. |
| `--no-suggest-shell-commands` | The other half of `--yes-always`. Aider's `--suggest-shell-commands` defaults to `True`, and an auto-confirmed suggestion runs on the host with nobody reading it. This is a blast-radius reduction, not a sandbox. |
| `--no-analytics` | No telemetry from a dispatched run. Aider's own `--analytics` default is `random`, which opts some sessions in by itself. |
| `--no-check-update` | No version check on a dispatch path. |
| `--no-detect-urls` | Aider's `--detect-urls` defaults to `True` and offers to scrape any URL in the message. Under `--yes-always` that offer is auto-accepted, so a URL in the brief becomes an unannounced outbound fetch - and, with Playwright absent, a run that hangs until the watchdog fires. |
| `--no-pretty` | Colour codes would corrupt the captured report. |
| `--no-stream` | Whole responses; the relay captures text, not a live view. |

The first two are why this skill can promise a reviewable diff. If you drive `aider` by hand instead,
pass them yourself.

## Artifacts and result fields

Everything lands in the run directory (temp by default, so the repo under review stays clean):

| File | Contents |
| --- | --- |
| `brief.txt` | The brief as dispatched - and the file Aider reads via `--message-file`. |
| `final.txt` | Aider's report, when one was captured. |
| `stderr.txt` | Aider's stderr, streamed through to your terminal as well. |
| `result.json` | The structured result, written atomically. |

`result.json` speaks `delegate-relay.result.v1`:

| Field | Meaning |
| --- | --- |
| `status` | `completed`, `failed`, `timeout`, `aborted`, or `aider_unavailable`. |
| `exitCode` | Aider's exit code, or 128+signal, or 127 when the binary is missing. An exit-0 model/endpoint failure detected in the report is remapped to `1`. |
| `signal` | The signal that killed the child, else `null`. |
| `aiderVersion` | What `aider --version` reported. |
| `finalMessage` | Aider's own report. |
| `touchedFiles` | `git status --porcelain` lines. `[]` when the tree is clean, `null` when git cannot report. |
| `readOnly` | Whether this was dispatched as a dry run. |
| `resumed` | Whether chat history was restored. |
| `error` | Present on **every** non-clean outcome, including an ordinary nonzero exit; says what went wrong. |
| `stderrTail` | Last stderr lines, on a non-clean outcome. |

## Waiting for completion

The relay blocks until Aider exits. Run it under the orchestrator's background-command facility, or
background it and poll for `result.json` - it is published atomically via rename, so a poller never
reads a half-written file.

Completion means the process exited and `result.json` exists. Trust that over any progress display.

## When a run misbehaves

- **Exit 2, no result file.** A usage error - bad flag, missing value, empty brief, unparseable
  `--timeout`. Nothing was dispatched. Fix the command.
- **Exit 127, `status: "aider_unavailable"`.** `aider` is not on PATH. Install it, or check that the
  environment running the relay sees the same PATH you do.
- **`status: "failed"` with an endpoint or authentication `error`.** Aider exits 0 even when it never
  reached a model, so the relay scans the run for Aider's own errors and reports this rather than a
  false success. It is a configuration problem: check the model name, `--api-base`, and provider key.
- **`status: "timeout"`.** The watchdog fired and the process tree was killed, possibly mid-edit.
  Inspect `touchedFiles` before re-dispatching; re-run with a longer `--timeout`.
- **`status: "aborted"`.** The relay itself was killed and forwarded the kill to Aider. Same caution:
  the tree may be partial.
- **`--read-only` run that changed something.** Aider's `--dry-run` is Aider's promise, not the
  relay's measurement, so the relay warns when a read-only run leaves changed paths behind. Only the
  files Aider *generates* are excluded from that check - `.aider.chat.history.md`,
  `.aider.input.history`, `.aider.llm.history`, and the `.aider.tags.cache.v*` directory - because it
  writes them even under `--dry-run`. Aider's user-managed settings are deliberately **not** excluded:
  if `.aider.conf.yml`, `.aider.model.settings.yml`, `.aider.model.metadata.json`, or `.aiderignore`
  changed during a dry run, that is exactly what the warning is for. Everything, generated or not,
  still appears in `touchedFiles`, which reports git verbatim.

## Recovering lost work

If the orchestrator loses the relay's output, the run directory still has everything: `final.txt` for
the report, `stderr.txt` for the failure, `result.json` for the structured facts. Nothing was
committed, so the working tree is exactly as Aider left it - `git diff` is the source of truth.

## The commit boundary

The relay never runs `git commit`, `git add`, or `git push`, and it disables Aider's own committing.
Reviewing and committing are the orchestrator's job, after the gates pass. See
[review-and-land.md](review-and-land.md).
