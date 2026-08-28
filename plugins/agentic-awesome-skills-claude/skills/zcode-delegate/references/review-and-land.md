# Review and land

ZCode's `result.json` contains its own summary and its own claims about gates. Treat all of it as a
hypothesis. You are the reviewer; the commit is yours.

## The checklist

1. **Re-run the project's gates yourself.** Every time. "Gates passed" in `finalMessage` is a claim,
   not evidence. Run the actual commands from the brief and read their output.
2. **Read the diff against the brief.** Did ZCode do what was asked — nothing more, nothing less?
   `touchedFiles` tells you where to look; `git diff` tells you what happened.
3. **Check the "Out of scope" list.** Was anything on it touched?
4. **Read the DECISIONS section** of the report. Anything ZCode chose that the brief did not specify
   is something you now own. Surface it; do not absorb it silently.
5. **On a `--read-only` run**, confirm `touchedFiles` is `[]` and `readOnlyViolation` is `false`.
   Plan mode refuses edits, but the relay measures rather than assumes — see below.
6. **Run your guard skills** on the diff if you have them installed. This skill produces the work;
   those skills judge it.
7. For schema or migration changes, round-trip them. For removals, grep for dangling references.

## What `readOnlyViolation` means

`plan` mode refused to write in testing, but whether that refusal is enforced by ZCode's tool layer
or is model compliance is not established. So the relay fingerprints the repository before the run
and compares afterwards:

- `false` — no Git-visible change was detected. This is the expected result.
- `true` — something changed during a read-only run. **Stop and inspect the tree.** The relay
  detects and reports; it does not attribute or revert.
- `null` — git could not report, so the tripwire has no opinion. Inspect the tree directly.

`readOnlyViolation` is `null` on `yolo` runs, where writes are the point.

## The commit boundary

**The relay never commits.** Not on success, not on a clean gate run, not ever. Committing belongs
to whoever reviewed the diff, and that is you.

This is not a limitation to work around. If you find yourself wanting the implementer to commit, the
review step is being skipped.

## Rework: the exact-session cycle

When the diff needs changes, continue the same session rather than starting cold:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief delta-brief.txt --cd /path/to/repo --session sess_3d8fa06c-…
```

- Take `sessionId` from the prior `result.json`.
- **Send only the delta** — what was wrong and what to do instead. ZCode still has the earlier turn;
  re-sending the original brief wastes context and invites it to redo accepted work.
- `--resume-last` continues the latest session for `--cd`. It is scoped to that directory rather
  than being a global "last", which makes it safer than it sounds — but `--session` is still the
  precise choice when you have the id.
- Review the result again. A rework cycle gets the same scrutiny as the first pass.

## Authorization model

Delegation is something the human opts into. Once they have — "run this queue", "proceed" —
committing verified, gate-passing work is the agreed contract. Two limits on that mandate:

**Surface, don't absorb.** Report ZCode's design decisions, its defensible-but-unasked turns, and
non-blocking nitpicks. Your reviewer's summary should let the human disagree with a choice they
would not have made. Silently keeping such a change makes it yours.

**Stop for scope changes.** If correct completion requires going beyond the brief — a schema change
the task implies, a dependency the fix needs, a refactor without which the change is unsafe — ask.
Do not expand the mandate yourself, and do not let the implementer expand it for you.

## What to tell the human

After landing, say what actually happened:

- what changed, and why
- which gates you ran, and their real output
- what ZCode decided that the brief did not specify
- anything you left undone, and why

If a gate failed, say so with the output. If a step was skipped, say that. A clean report of a messy
run is more useful than a confident summary that does not survive contact with the diff.
