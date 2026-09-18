# Rollback Procedure

A new branch preserves committed history; it does not back up uncommitted edits. Inspect `git status --short` first and copy affected untracked files plus staged/unstaged changes to a verified backup before any discard operation. Keep unrelated work intact.

## Committed changes

Use a topic branch based on current `origin/main`, select the exact source commit to reverse, and inspect `git revert <commit>` before committing. Run the checks appropriate to the reversal and merge the repair through `npm run merge:batch`. Generated state belongs to the protected canonical-sync PR; never revert or patch it independently on `main`.

## Uncommitted changes

After verifying the backup, inspect each selected path. `git restore --staged -- <path>` unstages it without discarding working-tree content. `git restore -- <path>` discards working-tree changes in that path; use it only for explicitly selected disposable work. A branch switch alone is not recovery evidence.

## Published releases

Do not rewrite published history, move a released tag, or reuse an npm version. Prepare a corrective source PR and a separately authorized patch release through the [release process](release-process.md). Confirm the resulting checks and generated-state convergence before declaring recovery complete.
