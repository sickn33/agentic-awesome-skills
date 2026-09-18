# Writing the brief

The brief is the whole contract. Warp sees only the text you send plus whatever it can inspect in
the workspace — no chat history, no shared context, none of the reasoning that led you here.

## How the brief reaches Warp

`oz agent run` requires one of `--prompt`, `--saved-prompt`, `--task-id`, or `--skill`. Its
`-f/--file` config path does **not** satisfy that requirement, so there is no stdin or file channel
for the task text: the relay passes the brief as the `--prompt` value on argv.

Two consequences that do not apply to the other skills in this package:

- **The brief is visible in the host process list** (`ps`, Activity Monitor, Task Manager) for as
  long as the run is live. Keep credentials, tokens, and customer data out of it. Point Warp at a
  file in the repo or an environment variable instead of inlining a secret.
- **A very large brief can hit the OS argument limit.** Practical briefs are far below it, but a
  brief that inlines whole files can trip it. Reference paths rather than pasting file contents —
  Warp can read the workspace itself.

Because the brief rides argv, the relay never launches `oz` through a shell on any platform.

## Structure

Cover these in order. Skip a heading only when it genuinely does not apply.

1. **Goal** — one sentence on the outcome, not the mechanics.
2. **Current state** — where the code is now, and the paths that matter. **Name the workspace root
   as an absolute path**, and prefer absolute paths for the files you call out. `--cwd` is not
   uniformly honoured: on a verified run against oz 0.2026.05.27, shell commands executed in the
   pinned workspace (`pwd` returned it), but the agent stated its working directory was `/` and its
   file-reading tool resolved bare relative paths against `$HOME` — so `src/strings.js` was first
   read as `/Users/<you>/src/strings.js`. The agent recovered by running `pwd` and retrying, but it
   burned a turn, and in a home directory that happened to hold a matching path it would have read
   the wrong file. There is no sandbox to catch that.
3. **What to change** — the specific edits, in the order they make sense.
4. **What to leave untouched** — files, patterns, and public interfaces that must not move. Warp has
   no sandbox, so this is a written boundary, not an enforced one.
5. **Gates** — the project's *actual* commands. Read them out of `package.json`, `Makefile`, or the
   CI config; do not invent `npm test` because it is conventional.
6. **Report contract** — what the final message must state (below).
7. **Do not commit** — say it explicitly. Committing is the orchestrator's job.

## The report contract

Ask for a final message that states, plainly:

- What changed, file by file.
- Which gate commands were run, and their exact outcome.
- Anything the run could not do, and why.
- Any decision it made that the brief did not specify.

The relay captures that message as `finalMessage` in `result.json` and as `final.txt`. Treat it as a
claim to verify, never as verification — see [review-and-land.md](review-and-land.md).

## Repository context files

Warp reads skills from `.agents/skills/`, `.warp/skills/`, `.claude/skills/`, and `.codex/skills/`.
If the repository carries conventions in one of those, name it with the relay's `--skill` flag
(`name`, `repo:name`, or `org/repo:name`) so it becomes the base prompt and your brief stays the
task. Anything not in one of those locations — a plain `CONTRIBUTING.md`, for instance — must be
referenced by path in the brief; do not assume it is loaded.

## One task per brief

A brief that carries two unrelated changes produces a diff you cannot review cleanly and a
conversation you cannot resume precisely. Split them and queue the parts — see
[multi-task-queues.md](multi-task-queues.md).

## Delta briefs

When you continue a conversation with `--conversation <id>`, Warp still holds the earlier exchange.
Send only what changed:

- What you reviewed and what was wrong — be specific about the file and the symptom.
- What to do about it.
- What to leave alone from the previous round.
- The gates to re-run.

Do not re-send the original brief. Restating a satisfied requirement invites Warp to redo work that
was already correct.

## Worked example

```text
Goal: make the CSV export stream instead of buffering the whole result set.

Current state: src/export/csv.ts builds one string in memory (see toCsv) and
returns it from the /export route in src/routes/export.ts.

Change:
- Rewrite toCsv to return a Readable that yields one row at a time.
- Update the /export route to pipe that stream to the response.
- Keep the column order and the quoting behaviour exactly as they are now.

Leave untouched: the public signature of toCsv's caller in src/routes/export.ts
beyond the pipe change, and every file under src/import/.

Gates: `npm run lint`, `npm run typecheck`, `npm test -- export`.

Report: list each file you changed, quote the exact output of each gate command,
and state anything you could not finish.

Do not commit. Leave the changes in the working tree.
```
