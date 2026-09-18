---
name: aider-delegate
description: Delegate coding tasks to Aider (`aider`) only when the user explicitly
  requests it, while the orchestrator retains review and landing responsibility.
risk: critical
category: agent-orchestration
source: https://github.com/amElnagdy/delegate-skills
source_repo: amElnagdy/delegate-skills
source_type: community
date_added: '2026-08-26'
license: MIT
license_source: https://github.com/amElnagdy/delegate-skills/blob/master/LICENSE
compatibility: Requires the `aider` CLI (`python -m pip install aider-chat`), Node
  18+, and git. Aider must be able to authenticate to a model before dispatch - export
  the provider key it expects (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …) or set it
  in Aider's own config; a local OpenAI-compatible endpoint still needs a non-empty
  `OPENAI_API_KEY`. The orchestrating agent must be able to run shell commands and
  read files. Shell examples assume bash/zsh (macOS/Linux, or Git Bash/WSL on Windows).
metadata:
  version: 0.5.0
---
# Aider Delegate

## When to Use

- You want to delegate a bounded coding task to a separate `aider` implementer (`Aider`) and then review its diff yourself.
- The user explicitly asked for delegation to this implementer.

You are the **orchestrator**. Hand a bounded coding task to a separate **implementer** - Aider - then
review what it produced and land it yourself. You write the brief and own the judgment; Aider does the
typing in its own run; you verify and commit.

The loop needs only a shell command and file access, so any comparable orchestrator can drive it.

## The one thing to know about Aider

**Aider commits by default.** Two of its defaults would destroy the reviewable diff this skill exists
to produce:

- `--auto-commits` (default `True`) - Aider commits its own edits after each exchange.
- `--dirty-commits` (default `True`) - Aider commits **your** pre-existing uncommitted work before it
  starts editing.

The relay always passes `--no-auto-commits` and `--no-dirty-commits`, and neither is configurable
through it. If you ever drive `aider` by hand instead of through the relay, pass both yourself, or the
work lands as commits you never reviewed. The relay also passes `--no-gitignore`, because Aider
otherwise writes `.aider*` into `.gitignore` on startup and dirties the tree you are about to read.

## When NOT to use this

- The task is small enough to do inline; delegation overhead is not worth it.
- The `aider` CLI is not installed, or no model is configured for it.
- You want the implementer to manage its own commits. Aider can, but this skill deliberately turns
  that off - the diff is the deliverable.

## Prerequisites (check once)

1. Install Aider - `python -m pip install aider-chat`, or the standalone installer from the
   [Aider install docs](https://aider.chat/docs/install.html).
2. Configure a model. Aider reads provider keys from the environment (`OPENAI_API_KEY`,
   `ANTHROPIC_API_KEY`, …) or its own config; see [Aider's model docs](https://aider.chat/docs/llms.html).
3. Confirm `aider --version` succeeds.
4. Work in, or point `--cd` at, the target git repository.

## Choose the model

Aider uses its own configured model when `--model` is omitted. Pass `--model <name>` to pick another.

## Local and self-hosted models

Aider talks to any OpenAI-compatible endpoint, so this is also the skill for delegating to a model
running on the user's own hardware - llama.cpp's server, Ollama, vLLM, LM Studio, or anything else
that serves the same API. Pair `--model` with `--api-base`:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo \
  --model openai/<served-model-name> --api-base http://127.0.0.1:<port>/v1
```

Three things differ from a hosted provider:

- **The `openai/` prefix is required.** It tells Aider to speak the OpenAI protocol to your endpoint;
  the part after it is whatever name your server reports, not a provider catalog name.
- **A placeholder key is still needed.** Export any non-empty `OPENAI_API_KEY`. The client library
  requires the header even when the server ignores its value.
- **Ask for a smaller edit format.** Local models often fail Aider's default `diff` format, which
  requires exact search/replace blocks. `--edit-format whole` trades tokens for reliability; keep the
  brief's scope tight with `--file` so whole-file rewrites stay cheap.

A local endpoint that is not running looks like a hang, not an error: Aider retries the connection
until the relay's `--timeout` watchdog fires and reports `status: "timeout"`. Confirm the server is up
before dispatching a long brief.

### Staying offline

No account or provider registration is involved: Aider is a pip install, the endpoint is yours, and
`OPENAI_API_KEY` only has to be non-empty. The relay pins the flags that would otherwise reach the
network on their own - `--no-check-update`, `--no-analytics` (Aider's own default is `random`, which
opts some sessions in by itself), and `--no-detect-urls`, without which Aider offers to scrape any URL
in the brief and `--yes-always` accepts that offer silently.

`--no-suggest-shell-commands` closes the remaining path by which a run could reach the network without
being asked to. What stays outside the relay's control is the brief itself: instructions that tell
Aider to install a package or call an API will still be carried out, and `--auto-lint` runs the
repository's own tooling. Offline here means nothing in the dispatch path reaches out on its own - not
that a sandbox is stopping it.

## The loop

Run these five steps per task. Steps 1, 4, and 5 require judgment; 2 and 3 are mechanical.

### 1. Write the brief

Aider sees only the text you send plus the files in its editing scope - no chat history or shared
context. Include the goal, current state, what to change, what to leave untouched, the project's
**actual** gates, and a report contract. Keep one task per brief. See
[references/writing-the-brief.md](references/writing-the-brief.md).

### 2. Dispatch

Use the bundled helper. It wraps Aider's headless `--message-file` mode, captures the run, and writes
`result.json`. (`<skill-dir>` is the installed folder containing this `SKILL.md`.)

```bash
node "<skill-dir>/scripts/relay.mjs" --brief brief.txt --cd /path/to/repo
# choose a model:                        add --model <name>
# point at an OpenAI-compatible server:  add --api-base <url>
# scope the edit surface:                add --file <path> (repeatable), --read <path> for context only
# dry run, no files modified:            add --read-only
# continue the previous chat:            add --resume-last  (delta brief only)
# hard time limit (watchdog):            add --timeout 2h  (the 30m default suits short runs; implementation briefs routinely need 1-2h)
# see all options:                       node .../relay.mjs --help
```

The child process's cwd pins the workspace. The brief is delivered with `--message-file`, so it never
rides argv: it stays out of the host process list and clear of the OS argument size cap. The relay
writes artifacts under the system temp dir by default and never commits. See
[references/dispatch-and-poll.md](references/dispatch-and-poll.md).

### 3. Wait for completion

The helper blocks until Aider finishes. Run it with the orchestrator's background-command facility, or
background it in the shell and poll for `result.json`. A pre-run usage error exits 2 and writes no
result; a missing `aider` exits 127 and writes `status: "aider_unavailable"`.

Trust process state and the working tree over a progress display. Completion means the process exited
and `result.json` exists. Aider's report is the `finalMessage` field in `result.json` (also printed in
full on stdout between the report markers).

Aider exits 0 even when it never reached a model, so the relay scans the run for Aider's own endpoint
and authentication errors and reports `status: "failed"` when it finds one. Treat a `failed` status
with an `error` mentioning the endpoint as a configuration problem, not a coding failure.

### 4. Review - do not trust the self-report

Treat Aider's final message and gate claims as claims:

- Re-run the project's gates yourself.
- Read the diff against the brief, starting with `touchedFiles`.
- Run relevant guard skills if installed.
- Round-trip migrations and grep for dangling references after removals or renames.

Aider's `--auto-lint` is on by default, so it may have already run a linter and fixed its own
complaints. That is Aider's lint, not your gates - run yours anyway. See
[references/review-and-land.md](references/review-and-land.md).

### 5. Land it

The implementer edits the working tree; **the orchestrator commits.** Commit only after the gates pass
and the diff holds. If rework is needed, send a delta brief with `--resume-last`, then review again.

## Autonomy and permissions

The relay passes `--yes-always`, Aider's own term for auto-confirming every prompt, because a headless
run cannot answer one. **Understand what that consents to in advance.** Auto-confirmation applies to
every prompt Aider would otherwise raise, and Aider's prompts are not limited to file edits: left at
its defaults it also offers to run shell commands it has suggested, and `--yes-always` would accept
those with nobody reading them. The relay therefore pins `--no-suggest-shell-commands`, which removes
that path.

What remains is not a sandbox, and nothing here pretends otherwise. Aider has no permission modes and
no isolation: within its file scope it edits freely, and `--auto-lint` (on by default) runs whatever
linter the repository configures. A brief that tells Aider to run a command still gets a command run.
Delegation is the authorization; if a run must not be able to touch the host, run it in a container or
a throwaway worktree, because no flag in this relay will give you that.

**File selection is not a security boundary.** `--file`, `--read`, and `--subtree-only` set what Aider
puts in its chat context, which is a scoping and token-cost decision. They do not confine what it can
reach. See [references/writing-the-brief.md](references/writing-the-brief.md).

`--read-only` maps to Aider's `--dry-run`, which performs the run without modifying files. The relay
does not independently verify that claim - it reports what `git status --porcelain` shows and warns if
a `--read-only` run left the tree changed. `touchedFiles` and the diff, not a flag, are the guarantee.

## Resume

Aider has no session ids. Its resume unit is the chat history file it keeps in the repository
(`.aider.chat.history.md`), so `--resume-last` maps to Aider's `--restore-chat-history` and
`--history-file` pins a specific one. Because that history lives in the repo, resume is per-worktree,
not per-user: two clones of the same project do not share it.

## Authorization model

Delegation is something the human opts into. Once they have ("run this queue", "proceed"), committing
verified, gate-passing work is the agreed contract. Two limits remain: **surface, don't absorb**
(report Aider's design decisions, defensible-but-unasked turns, and non-blocking nitpicks) and **stop
for scope changes** (if correct completion needs going beyond the brief, ask instead of expanding the
mandate). See [references/review-and-land.md](references/review-and-land.md).

## References

- [references/writing-the-brief.md](references/writing-the-brief.md) - structure, report contract,
  real gates, file scope, and delta briefs.
- [references/dispatch-and-poll.md](references/dispatch-and-poll.md) - flags, artifacts,
  `result.json`, polling, and failure recovery.
- [references/review-and-land.md](references/review-and-land.md) - review checklist, the commit
  boundary, and rework through Aider's chat history.
- [references/multi-task-queues.md](references/multi-task-queues.md) - sequential queues, constraint
  carry-forward, progress tracking, and the final coherence pass.


## Limitations

- Docs-only import — executable `scripts/relay.mjs` not included; see upstream for full runtime. Requires `aider` CLI, Node 18+, git.
- Relay never commits — it only returns structured result JSON; you review and land the commit.

> Adapted from [amElnagdy/delegate-skills](https://github.com/amElnagdy/delegate-skills) (MIT) — docs-only, runtime not bundled.
