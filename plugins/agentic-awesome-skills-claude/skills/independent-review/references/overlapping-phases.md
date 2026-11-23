# Running a round beside the next phase

When the next phase builds during review, separate the checkouts. For a serial round, keep one checkout still.

**Run the closing series beside the next phase in its own checkout.** An optional advisory stage round uses the same isolation and clears nothing. Their safe overlap depends on the checkout, not the commit.

**Commit means "reviewed from here". Push means "this round is closed".** Local history is working state; a deploying branch receives only the state a closing series cleared. Advisory stage rounds clear nothing; before hosting, a phase can remain local. A production push remains a release and requires the owner's go.

    # 1. tests green on your own run, then freeze the subject
    git add -A && git commit -F -          # the snapshot the round reviews
    SNAP=$(git rev-parse HEAD)

    # 2. give the reviewer its own checkout of that exact commit, under a name no other
    #    session on this machine is using (`git worktree list` shows the taken ones)
    git worktree add ../<repo>-review-<phase> "$SNAP"

    # 3. review there while the next phase builds in the main tree. In the worktree the
    #    range ends at HEAD, the snapshot ($RELEASED..HEAD, <last round>..HEAD), never at
    #    a branch name, which moves as the next phase commits
    python <skill dir>/scripts/review.py \
         --brief "$S/review-NNN-brief.md" --cwd ../<repo>-review-<phase> --subject "<range>" ...

    # 4. when a round closes with no INTRODUCED finding above Low and no High or Critical
    #    of any age, push the snapshot THAT round reviewed — never the branch tip, which may hold the next phase's commits.
    #    If a fix followed the last full gate run, the full gate passes on that snapshot first, in a
    #    checkout of it when the main tree has moved on.
    #    A round that found anything the bar names is fixed, re-tested, re-snapshotted and reviewed again;
    #    SNAP is read from that round's worktree, whose HEAD is the snapshot it reviewed
    #    (a new shell has lost it, and the main tree's HEAD may hold the next phase); `:?`
    #    refuses an empty one, which would turn the push into a delete. The first push goes
    #    only where the owner named (§ When)
    SNAP=$(git -C ../<repo>-review-<phase> rev-parse --verify HEAD)
    git push --no-follow-tags origin "${SNAP:?}:refs/heads/<branch>"
    #    (if you linked node_modules into the worktree, delete that link first; see below)
    git worktree remove ../<repo>-review-<phase>

**Never remove a worktree whose `node_modules` links to another checkout.** The reviewer only reads, so its worktree needs no `node_modules`. A linked one may support typechecks, unit tests or builds: a Windows junction or a symlink elsewhere. `git worktree remove --force` deletes through that link, emptying the main checkout's `node_modules`. A running gate or dev server dies; the next run fails with `'playwright' is not recognized`. Remove the link itself first. On Windows, `cmd /c rmdir <worktree>\node_modules` removes a junction without touching its target. Elsewhere, use `rm <worktree>/node_modules` without `-r`, then remove the worktree. Alternatively, give the worktree its own `npm ci`, which `next build` needs anyway.

- `2026-10-02`, a temporary worktree's junction; `npm ci` restored the main checkout.

**Push the snapshot, not the branch.** Once pushes deploy, the branch tip can ship unreviewed commits made by the next phase during review. Those commits belong to the next round's subject.

**The worktree is the load-bearing part.** Committing alone isolates nothing. The reviewer deliberately reads the working tree and diff because a diff cannot show interactions. Pointing it at the builder's tree produces findings about half-written code that no longer exists that way.
