# Review and land

Warp edits the working tree. **You commit.** That boundary is the point of the skill: the
implementer produces a diff, and a reviewer who did not write it decides whether it ships.

## Why the review is not optional here

Every delegate skill asks you to verify the implementer's claims. Warp raises the stakes: `oz agent
run` has no sandbox, no permission mode, and no read-only run, so nothing constrained what the run
could touch while it worked. The diff is not a courtesy record — it is the only record.

## The checklist

Work through these in order. Stop at the first one that fails and decide whether to rework or
discard.

1. **Read `result.json` first.** If there is no `result.json`, stop: a usage error exits 2 before
   Warp is ever dispatched and writes none, so an absent file means the run did not happen — read the
   relay's stderr, not the tree. Otherwise require `status: "completed"` and `exitCode: 0` before
   going further. `failed`, `timeout`, `aborted`, and `warp_unavailable` all mean the run did not
   finish on its own terms, and `timeout` and `aborted` additionally mean the tree may be mid-edit
   and incoherent. Rework or discard from the baseline rather than reviewing a partial run.
2. **Start from `touchedFiles`.** It is `git status --porcelain` taken after the run: post-run,
   git-visible worktree state, not a log of what the agent did. It cannot show an ignored file, an
   edit the run made and then reverted, or a write outside the repository, and it includes anything
   already dirty before dispatch. Start there, but do not read it as the complete set. `null` means
   git could not report — inspect the tree by hand. `[]` on a run that claimed edits is a
   contradiction worth chasing.
3. **Re-run the gates yourself.** Do not accept "tests pass" from `finalMessage`. Run the project's
   actual lint, typecheck, build, and test commands and read the output. Take "actual" from
   `CONTRIBUTING.md`, the CI config, or `package.json`: a project's gate set often includes a
   packaging, manifest, or schema validation step that lint and test do not cover, and that is
   exactly the gate a run can break without any test going red.
4. **Read the whole diff against the brief.** `git diff` and `git diff --staged` — then open every
   `??` path in `touchedFiles` directly, including everything inside an untracked directory. Neither
   diff command shows the contents of an untracked file, so a file Warp created is invisible to both
   and would otherwise reach your commit unread. Ask of each hunk and each new file: did the brief
   ask for this? Changes outside the brief's stated scope are the thing to catch.
5. **Check what should NOT have changed.** Lockfiles, CI config, formatter config, unrelated
   modules, and anything the brief listed under "leave untouched".
6. **Grep for dangling references** after any removal or rename — imports, string keys, docs.
7. **Round-trip migrations.** Apply and roll back before trusting a schema change.
8. **Run guard skills** if the repository has them installed.
9. **Confirm nothing was committed.** `git log -1` should still be your last commit. The relay never
   commits; if a commit exists, the agent made it despite the brief — treat that as a finding.

## Reading `finalMessage` correctly

`finalMessage` is Warp's self-report: a claim, not evidence. Read it for two things only —

- **Decisions it made that the brief did not specify.** These are the parts you most need to surface
  to the user.
- **What it says it could not do.** Usually accurate, and it tells you where to look first.

Everything else in it — "all tests pass", "no other files changed" — is a hypothesis your gates and
your diff read either confirm or refute. If `finalMessage` is empty on a run that exited 0, read
`events.jsonl` rather than assuming the run did nothing.

## Rework through a conversation

When the diff is close but wrong, continue the same conversation rather than starting cold:

```bash
node "<skill-dir>/scripts/relay.mjs" --brief delta-brief.txt --cd /path/to/repo \
  --conversation "$(jq -r .conversationId /tmp/warp-run-1/result.json)"
```

Warp still holds the earlier exchange, so send only the delta — what was wrong, what to change, what
to leave alone. See [writing-the-brief.md](writing-the-brief.md#delta-briefs).

If `conversationId` is `null`, the stream did not carry one; dispatch a fresh run with a brief that
restates the corrected requirements.

Discard rather than rework when the diff misunderstood the goal, wanders far outside the brief, or
would take longer to correct than to redo.

Discard against a known baseline, never with a blanket revert. `git checkout -- .` is the wrong
reach: it leaves staged and untracked files behind, so the tree stays dirty for the next dispatch,
and it destroys any uncommitted work of your own that predates the run. Dispatch from a clean tree —
commit your own changes, or `git stash push --include-untracked` them. A bare `git stash` leaves
untracked files in place, and those resurface as `??` entries in `touchedFiles`, where the cleanup
below would delete work the run never made. Confirm `git status --porcelain` prints nothing before
dispatching, so that everything dirty afterward is Warp's, then drop exactly what the run
introduced, reading the paths off `touchedFiles`:

```bash
git restore --staged --worktree -- <tracked paths>   # the ' M' / 'M ' entries
git clean -f -- <untracked paths>                    # the '??' entries
```

A `??` entry can name a whole directory rather than each file under it; passing that path removes
the directory and its contents, since `-d` only governs the no-pathspec case. The exception is a
nested git repository — if the run scaffolded one, `git clean -f` skips it and `-ff` is required.

If dispatching from a clean tree is not an option, give Warp its own `git worktree` instead: then
discarding is `git worktree remove --force`, and your work was never in reach. Either way, rewrite
the brief before dispatching again.

## Landing

Commit once the gates pass and the diff holds. Write the commit message yourself: it should describe
the change, not the delegation. Do not credit the tool in the message unless the project's own
convention asks for it.

## Surface, don't absorb

Delegation is something the human opted into, and committing verified, gate-passing work is the
agreed contract. Two limits stay with you:

- **Surface, don't absorb.** Report Warp's design decisions, its defensible-but-unasked turns, and
  the non-blocking nitpicks you chose not to fix. Silently smoothing them over hides the
  implementer's judgment from the person who owns the code.
- **Stop for scope changes.** If finishing correctly requires going beyond the brief — a dependency
  bump, a schema change, an interface the brief did not mention — ask rather than expanding the
  mandate yourself.

Snapshot egress is a decision you make **before** dispatch, not something you report after it. `oz
agent run` uploads an end-of-run workspace snapshot by default, so reading `snapshotDisabled: false`
off a finished run tells you only that the upload already happened. If the repository is sensitive,
pass `--no-snapshot` on the dispatch and confirm `snapshotDisabled: true` in `result.json` before
going further. Keep reporting the field either way — it is the evidence of which way the run went.

Also surface the `runUrl` when someone will want to inspect the run in Warp.
