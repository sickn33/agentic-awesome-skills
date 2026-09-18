# Writing the brief

The brief is the whole contract. Aider sees the text you send plus the files in its editing scope -
nothing else. No chat history, no shared context, none of the reasoning that led you here. Anything
you leave implicit, Aider will decide for itself.

Write it as if for a competent contractor who has never seen the project.

## Model choice and resumed runs

Aider uses its own configured model unless you pass `--model <name>`. For an OpenAI-compatible
endpoint, pair it with `--api-base <url>`; a local server usually still needs a placeholder
`OPENAI_API_KEY` in the environment because the client requires the header.

On a resumed run (`--resume-last`), Aider restores its chat history for the repository, so send only
the **delta** - what to change now, not the original brief again. That history lives in the repo
(`.aider.chat.history.md`), so it is per-worktree: a fresh clone resumes nothing.

## The shape that works

```
GOAL
One sentence. What is true when this is done.

CONTEXT
Where the code lives, what currently happens, why it is wrong.
Point at the files that matter. Name the ones you already ruled out.

CHANGE
The specific edits you want, in order. Be concrete about names and
signatures you have already decided; say "your call" where you have not.

DO NOT TOUCH
Files, modules, behaviors, and public interfaces that must not move.
Migrations, generated files, and vendored code belong here by default.

GATES
The project's real commands. Aider should run these and report results.

REPORT
What to tell me when done (see below).
```

## Scope the files explicitly

Aider builds a repo map and pulls in files it thinks are relevant, which is useful for discovery and
risky for a bounded task. Two relay flags aim the run:

- `--file <path>` puts a file in Aider's **editing** scope. Repeatable.
- `--read <path>` supplies a file as **read-only context**. Repeatable.

Use `--read` for the interface, schema, or example the change must conform to, and `--file` for what
should actually change. `--subtree-only` restricts Aider to the current subtree of the repository.

**These are chat-context controls, not a security boundary.** They decide what Aider starts with, and
what you pay for in tokens - they do not confine what the run can reach. Aider has no sandbox, the
relay dispatches it with `--yes-always`, and a run that decides it needs another file is not stopped
by their absence. Treat them as aim, not as a fence. When a change genuinely must not be able to touch
something, the boundary has to come from outside Aider: a container, a VM, or a throwaway
`git worktree` holding only what the task may see.

Scoping the dispatch also does not replace a `DO NOT TOUCH` section - state the boundary in the brief
too, because the brief is what Aider reasons about, and then verify it in the diff rather than
assuming it held.

## Always ask for the report explicitly

Aider will not volunteer a structured summary. Ask for one:

```
REPORT
- What you changed, file by file, and why.
- Which gates you ran and their exact output.
- Anything you decided that I did not specify.
- Anything you could not do, and what blocked you.
```

## Discover the real gates

Read the project's config before writing the brief - `package.json` scripts, `Makefile`, `noxfile.py`,
`pyproject.toml`, the CI workflow. Name the actual commands. A brief that says "run the tests" against
a project whose suite needs a service container produces a confident report and no verification.

Aider's own `--auto-lint` runs a linter after edits by default; that is Aider's lint, not your gates.
State your gates anyway.

## Honor repo conventions

If the project has a `CONVENTIONS.md`, a style guide, or a `CLAUDE.md`/`AGENTS.md`, pass it with
`--read` and say in the brief that it is binding. Aider follows conventions it can see.

## One task per brief

One goal per dispatch. Bundled tasks produce a diff you cannot review cleanly, and a failure in one
half strands the other. Queue them instead - see
[multi-task-queues.md](multi-task-queues.md).

## Premises freeze at dispatch

Everything you assert in the brief is frozen the moment you dispatch. If you learn something that
changes the premises while the run is in flight - a gate command was wrong, an interface moved - do
not let the run land on a false basis. Stop it, or discard the result and re-dispatch with the
corrected brief.

## A worked example

```
GOAL
`parse_window()` should reject a negative duration instead of silently
clamping it to zero.

CONTEXT
src/chronal/window.py, parse_window() around line 40. It currently does
max(0, seconds), which turns "-5m" into a zero-length window and makes the
scheduler fire immediately. Callers in src/chronal/schedule.py assume a
positive window.

CHANGE
- Raise ValueError("window must be positive") for a non-positive duration.
- Leave the parsing of the h/m/s string itself alone.
- Update the two call sites in schedule.py to let the error propagate;
  do not add a try/except that swallows it.

DO NOT TOUCH
- The duration grammar or its regex.
- Anything under migrations/ or tests/fixtures/.

GATES
- python -m pytest tests/test_window.py tests/test_schedule.py
- python -m ruff check src/

REPORT
File-by-file summary, exact gate output, decisions I did not specify,
and anything you could not do.
```

## Brief delivery

The relay writes your brief to `brief.txt` in the run directory and passes it to Aider with
`--message-file`. It never rides argv, so there is no process-list exposure and no OS argument size
cap to work around: a long brief is fine. Large *context* still belongs in files Aider reads, not
inlined into the brief.
