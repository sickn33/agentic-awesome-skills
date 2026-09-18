# Writing the brief

ZCode starts every dispatch cold. It has no orchestrator chat history, no memory of the last task,
and no idea what you already ruled out. The brief is the entire context, and a vague brief is the
single most common cause of a diff you have to throw away.

## How the brief reaches ZCode

The relay writes your brief to `brief.md` in its run directory and passes it with ZCode's
`--attach` flag, alongside a fixed one-line prompt telling ZCode to follow the attached brief.

That matters in two ways:

- **The command line stops bounding the brief.** ZCode has no stdin delivery, so a brief passed as
  prompt text would be limited by the command line (about 32 767 characters on Windows). Attaching
  sidesteps that entirely — write the brief the task deserves. The configured model's context window
  still applies, so this buys room, not an unlimited budget.
- **The brief is a document, not a chat message.** Structure it with headings. ZCode reads it as a
  file.

## Structure

```markdown
# Goal
One or two sentences. What must be true when this is done.

# Current state
Where the relevant code lives, what it does today, and anything already tried and rejected.
Name files with paths. Do not make ZCode hunt.

# Change
Exactly what to do. Be specific about behaviour, not implementation, unless the implementation
is the point.

# Out of scope
What to leave alone. This is the field that prevents scope creep — spend real effort on it.

# Gates
The project's ACTUAL commands, copied from its CLAUDE.md / AGENTS.md / Makefile / package.json.
Do not invent these.

    node test/relay-smoke.mjs
    npx skills add . --list

# Constraints
Anything non-negotiable: dependency limits, style rules, files that must not be touched,
platforms that must keep working.

# Report contract
End your final message with:
- WHAT CHANGED: one line per file, with the reason
- GATES: the command you ran and its actual result
- DECISIONS: anything you chose that the brief did not specify
- UNFINISHED: anything you could not complete, and why

# You will not commit
Do not run `git commit`, `git push`, or any command that writes to `.git`.
The orchestrator reviews the diff and commits.
```

## The rules that actually matter

**Embed the real gate commands.** The most common failure is a brief that says "run the tests" to an
implementer with no idea what the test command is. Discover them from the repo first, then paste
them. If you did not verify the command yourself, do not put it in the brief.

**Spend effort on "Out of scope".** An implementer that is uncertain tends to do more, not less. A
brief that says only what to change invites reformatting, drive-by refactors, and dependency
additions. Name the things you do not want touched.

**One task per brief.** If the brief has an "and then also", split it. Queues are for sequences —
see [multi-task-queues.md](multi-task-queues.md).

**Ask for a report contract.** You are going to re-verify everything anyway, but a structured report
tells you where to look first, and the DECISIONS section is how you catch defensible-but-unasked
turns before they reach your commit.

**Say it will not commit.** The relay never commits, and ZCode running under `--mode yolo` has a
Bash tool. Being explicit costs one line.

## Tool restrictions belong on the command line, not in the brief

If the task genuinely must not touch certain tools, do not ask politely in the brief — pass
`--disallowed-tools "Write,Edit,Bash"`. That denylist is enforced by ZCode: the named tools are
absent from the session entirely. Prose in a brief is not.

There is no allowlist counterpart — ZCode has no `--allowed-tools`. You can subtract capability, not
enumerate it.

## For a read-only run

A `--read-only` dispatch runs in ZCode's `plan` mode, which refuses edits. Briefs for these runs
should ask for a deliverable **in the final message**, since no files will change:

```markdown
# Goal
Give a second opinion on the approach below. Do not change any files.

# Agreed
...points both sides accept...

# Contested
1. <point> — Position A: ... Position B: ...
2. ...

# Report contract
For each contested point, defend or concede, and say which evidence moved you.
```

Then verify the result: `touchedFiles` is `[]` and `readOnlyViolation` is `false`. Plan mode's
refusal is measured by the relay's Git tripwire, not guaranteed by a sandbox, and
`readOnlyViolation` is tri-state — `true` means Git-visible changes were detected, `false` means
none were, and `null` means the tripwire could not tell, which calls for inspecting the tree
yourself rather than assuming either.

## Delta briefs for rework

When you send work back with `--session <sessionId>`, ZCode still has the earlier turn. Send only
what changed — the correction, not the whole original brief. Repeating the full brief wastes context
and invites it to redo work you already accepted. See [review-and-land.md](review-and-land.md).
