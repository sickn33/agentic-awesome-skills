---
name: warp-delegate
description: Delegate coding tasks to the Warp Agent CLI (`oz`) only when the user
  explicitly requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `oz` CLI (Warp Agent CLI) installed and authenticated
  (`oz login`, or `WARP_API_KEY` for a headless host; Warp AI features need an eligible
  Warp plan or your own provider key), Node 18+, and git. The orchestrating agent
  must be able to run shell commands and read files. Shell examples assume bash/zsh
  (macOS/Linux, or Git Bash/WSL on Windows).
metadata:
  version: 0.5.0
---
# Warp Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `warp` implementer (`Warp Agent CLI`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Delegate a bounded coding task to a separate **implementer** - the
Warp Agent CLI - then review what it produced and land it yourself. You write the brief and own the
judgment; the implementer makes changes in its own conversation; you verify and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## The binary is `oz`, not `warp`

Warp ships two different programs, and only one of them can be delegated to:

- **`oz`** - the Warp Agent CLI. Headless and scriptable; `oz agent run` executes an agent against a
  local directory. **This is what the relay drives.**
- **`warp`** - the interactive Warp TUI. It requires a terminal device, has no prompt or print flag
  (its only options are `--resume`, `--auto-approve`, `--api-key`, and the provider-key commands),
  and exits with `Device not configured` when stdin is a pipe. It cannot be relayed.

If `oz` is missing but `warp` is installed, you have the TUI, not the CLI.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `oz` CLI is not installed or authenticated.
- You need a sandboxed or read-only implementer. `oz agent run` has **no sandbox, no permission
  mode, and no read-only run** - see [Autonomy and permissions](#autonomy-and-permissions).
- The work must stay off Warp's servers. `oz agent run` uploads an end-of-run workspace snapshot
  unless `--no-snapshot` is passed, and conversations live server-side.

## Prerequisites (check once)

1. Install the Warp Agent CLI - see <https://docs.warp.dev/cli/>.
2. Authenticate: `oz login`, or set `WARP_API_KEY` for CI, a container, or any headless host.
3. Confirm the account has AI quota. **A working login is not enough** - unlike the other CLIs in
   this package. `oz whoami` can succeed while every dispatch fails with `In order to use Warp's AI
   features, subscribe to a Warp plan, or bring your own inference.` Warp records this internally as
   `QuotaLimit` / "lack of AI quota", so it is a credit condition on the account rather than a
   CLI-specific entitlement: `oz` runs the same agent harness as the Warp app and draws on the same
   account, plan, and credits. Check that `oz whoami` names the account holding the plan - if it
   does not, `oz logout && oz login` fixes it. Otherwise confirm the plan's AI credits are not
   spent, or store your own provider key -
   `warp --set-provider-api-key <openai|anthropic|google|grok>`, or `/api-keys` inside the TUI.
   Bring-your-own-key needs no paid Warp plan.
4. Confirm `oz --version` succeeds and `oz whoami` prints your user.
5. Work in, or point `--cd` at, the target git repository.

On macOS the CLI is distributed as a signed Developer ID binary; a first run may be held by
Gatekeeper until it is approved.

## Choose the model (optional)

Omit `--model` to use Warp's configured default. To pick another, choose an id from `oz model list`
and pass it verbatim. The relay accepts letters, digits, and `. _ : / -` only, so a value cannot be
mistaken for another `oz` flag.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write the brief

Warp sees only the text you send plus what it can inspect in the workspace - no chat history or
shared context. Include the goal, current state, what to change, what to leave untouched, the
project's **actual** gates, and a report contract. Tell it not to commit. Keep one task per brief.
The brief is delivered as the `--prompt` value on argv, so it is visible in the host process list -
keep secrets out of it and reference workspace files instead. See
[references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Use the bundled relay. It runs `oz agent run --output-format ndjson`, captures the event stream, and
writes `result.json`. (`<skill-dir>` is the installed folder containing this `SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# choose a model:                          add --model <id from oz model list>
# use an agent profile:                    add --profile <id>
# label the run:                           add --name <label>
# continue an existing conversation:       add --conversation <id> (delta brief only)
# base the run on a Warp skill:            add --skill <name|repo:name|org/repo:name>
# start MCP servers:                       add --mcp <path-or-inline-json>  (repeatable)
# suppress the workspace snapshot upload:  add --no-snapshot
# hard time limit (watchdog):              add --timeout 2h  (the 30m default suits short runs; implementation briefs routinely need 1-2h)
# see all options:                         node .../relay.mjs --help
```

The relay pins the workspace with both the child process's cwd and Warp's own `--cwd`. It writes
artifacts under the system temp dir by default and never commits. See
[references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The relay blocks until `oz` finishes. Run it with the orchestrator's background-command facility, or
background it in the shell and poll for `result.json`. A pre-run usage error exits 2 and writes no
result; a missing `oz` exits 127 and writes `status: "warp_unavailable"`.

Trust process state and the working tree over a progress display. Completion means the process
exited and `result.json` exists. Warp's report is the `finalMessage` field in `result.json` (also
printed on stdout between the report markers); the raw event stream is always in `events.jsonl`.

### 4. Review - do not trust the self-report

Treat Warp's final message and gate claims as claims:

- Re-run the project's gates yourself.
- Read the diff against the brief, starting with `touchedFiles`.
- Run relevant guard skills if installed.
- Round-trip migrations and grep for dangling references after removals or renames.

Because there is no read-only mode to fall back on, the diff is the **only** record you get - and it
records what git can see in the workspace afterward, not everything the run did. Dispatch from a
clean tree so the two are as close as they can be. See
[references/review-and-land.md](references/review-and-land.md).

### 5. Land it

The implementer edits the working tree; **the orchestrator commits.** Commit only after the gates
pass and the diff holds. If rework is needed, send a delta brief with `--conversation <id>` using the
`conversationId` from `result.json`, then review again.

## Autonomy and permissions

`oz agent run` has **no sandbox, no permission mode, and no read-only mode**. A headless run reads,
writes, edits, and executes commands with your own user permissions and never prompts. There is
nothing in the CLI to restrict that surface, so this relay ships no `--read-only` flag - offering one
would imply an enforcement that does not exist. The controls you actually have are:

1. **Scope by directory.** `--cd` pins the workspace, and the relay passes it to Warp's own `--cwd`.
   Treat this as *aim*, not a fence: on oz 0.2026.05.27 shell commands did run in the pinned
   workspace, but the agent's file tool resolved bare relative paths against `$HOME`. Name absolute
   paths in the brief - see [references/writing-the-brief.md](references/writing-the-brief.md).
2. **Review the diff.** `touchedFiles` is `git status --porcelain` taken after the run - post-run,
   git-visible worktree state, not a log of what the agent did. It cannot show an ignored file, an
   edit the run made and then reverted, or a write outside the repository (see item 1), and it
   carries anything that was already dirty before dispatch. Dispatch from a clean tree so those are
   the same set, and treat the diff as the best available record, not a complete one.
3. **Snapshot egress.** `--no-snapshot` forwards Warp's flag so the end-of-run workspace snapshot is
   not uploaded. Without it, the upload is Warp's default.

`--auto-approve` belongs to the interactive `warp` TUI and has no bearing on `oz agent run`.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"),
committing verified, gate-passing work is the agreed contract. Two limits remain: **surface, don't
absorb** (report Warp's design decisions, defensible-but-unasked turns, and non-blocking nitpicks)
and **stop for scope changes** (if correct completion needs going beyond the brief, ask instead of
expanding the mandate). See [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) - structure, report contract,
  real gates, argv delivery, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) - flags, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) - review checklist, commit
  boundary, and rework through Warp conversations.
- [references/multi-task-queues.md](references/multi-task-queues.md) - sequential queues,
  constraint carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `warp` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
