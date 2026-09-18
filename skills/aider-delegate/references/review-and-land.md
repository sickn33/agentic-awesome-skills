# Review and land

Aider's report is a claim. Your review is the verification. The relay hands you a working tree and a
report; deciding whether that work is correct, and committing it, is the part you do not delegate.

## Check tests before trusting gates

Before believing "all tests pass", confirm the suite actually ran something. A pytest run that
collected zero items, a jest run that matched no files, and a green suite are three different things
that can look alike in a summary. Check the counts.

The same applies to a gate Aider chose for itself. If the brief named `python -m pytest tests/` and the
report shows `pytest tests/test_window.py`, that is a narrower gate than you asked for.

## Aider's lint is not your gates

Aider's `--auto-lint` is on by default: after editing, it runs a linter and may fix its own
complaints, which produces edits that no brief asked for. That is Aider's lint, not your gates. Run
yours, and read the lint-driven edits as part of the diff.

## Re-run the gates yourself

Run the project's real commands in the working tree, yourself, and read the output. Not because the
implementer lies, but because "I ran the tests" and "the tests pass in this tree right now" are
different statements, and only the second one is what you are about to commit.

If a gate fails, that is a rework loop (below), not a reason to commit and fix forward.

## Read the diff against the brief

Start with `touchedFiles` in `result.json`, then read the actual diff:

- Every changed file should map to something the brief asked for.
- Anything in the `DO NOT TOUCH` list that moved is a stop.
- A file you did not expect is worth understanding before it lands - Aider builds a repo map and can
  pull in files you did not scope.
- Aider's own bookkeeping appears in the tree - `.aider.chat.history.md`, `.aider.input.history`, and
  a `.aider.tags.cache.v*/` directory. Because the relay passes `--no-gitignore`, these show up as
  untracked entries in `touchedFiles` rather than being hidden by a `.gitignore` Aider wrote itself.
  They are not part of the change; do not commit them. Aider writes them under `--dry-run` too, so the
  relay excludes them when deciding whether a read-only run misbehaved.

## The implementer sweep

Things worth checking specifically after a delegated run:

- **Dangling references.** After a rename or removal, grep for the old name across the repo,
  including docs, config, and generated code.
- **Round-trip migrations.** A migration that applies is half-verified; roll it back too.
- **Silent scope creep.** Refactors "while I was in there" are defensible and still need surfacing.
- **Tests that assert the implementation.** A test written against the code just written can pass
  while the behavior is wrong. Read new tests as carefully as new code.
- **Swallowed errors.** A `try`/`except` added around the thing the brief asked to fail loudly.

## The commit boundary

**Aider edits the working tree; you commit.** The relay disables Aider's auto-commit and dirty-commit
defaults precisely so this boundary exists, and it never runs `git commit` itself.

Commit only when:

1. The gates pass in the tree you are looking at.
2. The diff matches the brief.
3. Anything unasked-for has been surfaced to the human or reverted.

Write the commit message yourself, describing the change as it landed. Aider's report describes what
it believed it did.

If the working tree was dirty before the run, separate your commit from the pre-existing changes -
`git add -p` or explicit paths, never `git add -A` on a tree you did not start clean.

## Rework: send the delta

When the gates fail or the diff misses the brief, do not hand-patch the result and call it delegated -
you lose the record of what the implementer actually produced. Re-dispatch:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief delta.txt --cd /path/to/repo --resume-last
```

`--resume-last` restores Aider's chat history for the repository, so the delta brief should say only
what to change now - the failing gate output, the specific correction. Do not resend the original
brief.

Because that history lives in the repo (`.aider.chat.history.md`), resume is per-worktree. A fresh
clone, or a different checkout of the same project, has nothing to resume; send a full brief there.

Review the rework the same way. A second run is not more trustworthy than the first.

## Surface, do not absorb

Once the human has opted into delegation, committing verified, gate-passing work is the agreed
contract - you do not need to ask again for each task. Two things still go back to them:

- **Design decisions the brief did not specify.** Aider chose a name, a structure, an approach. Say
  so, briefly, in your report.
- **Defensible-but-unasked turns.** The extra refactor, the added helper, the reformatted file.

And one thing stops the loop entirely: **a scope change**. If completing the task correctly requires
going beyond the brief - touching a `DO NOT TOUCH` file, changing a public interface, adding a
dependency - ask. Do not expand the mandate on the implementer's behalf.
