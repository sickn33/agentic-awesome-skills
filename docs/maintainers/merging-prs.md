# Merging Pull Requests

**Policy: we always Merge PRs on GitHub so contributors get credit. We never Close a PR after integrating their work locally.**

## Always merge via GitHub

- Use the GitHub UI **"Squash and merge"** for every accepted PR.
- The PR must show as **Merged**, not Closed. That way the contributor appears in the repo’s contribution graph and the PR is clearly linked to the merge commit.
- Do **not** integrate a PR by squashing locally, pushing to `main`, and then closing the PR. That would show "Closed" and the contributor would not get proper credit.
- Before merging, require the normal PR checks from [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) to be green. If the PR touches `SKILL.md`, also require the separate [`skill-review` workflow](../../.github/workflows/skill-review.yml) to pass.
- For PRs that touch `SKILL.md` or risky guidance, require a real manual logic review in addition to the automated checks. Confirm the instructions, failure modes, and `risk:` label make sense before merging.
- For ordered multi-PR maintainer batches, use [Merge Batch](merge-batch.md) as the operational shortcut and keep this document as the policy reference.

## If the PR has merge conflicts

Resolve conflicts **on the PR branch** so the PR becomes mergeable, then use "Squash and merge" on GitHub.

### Generated files policy

- Treat `CATALOG.md`, `skills_index.json`, and `data/*.json` as **derived artifacts**, not contributor-owned source files.
- `README.md` is mixed ownership: contributor prose edits are allowed, but workflow-managed metadata is canonicalized on `main`.
- If derived files appear in a PR refresh or merge conflict, prefer **`main`'s side** and remove them from the PR branch instead of hand-maintaining them there.
- Do not block a PR only because shared generated files would be regenerated differently after other merges. `main` auto-syncs the final state after merge.
- If a skill PR leaves `risk: unknown`, that is not automatically a blocker. Maintainers can review the suggested classification with `npm run audit:skills`, optionally run `npm run sync:risk-labels` locally after merge, and still keep the contributor PR source-only.

### Steps (maintainer resolves conflicts on the contributor’s branch)

1. **Fetch the PR branch**  
   `git fetch origin pull/<PR_NUMBER>/head:pr-<PR_NUMBER>`
2. **Checkout that branch**  
   `git checkout pr-<PR_NUMBER>`
3. **Merge `main` into it**  
   `git merge origin/main`  
   Resolve any conflicts in the working tree. For generated registry files (`CATALOG.md`, `data/*.json`, `skills_index.json`), prefer `main`'s version and remove them from the contributor branch:
   `git checkout --theirs CATALOG.md data/catalog.json skills_index.json`
   If `README.md` conflicts only because of workflow-managed metadata, prefer `main`'s side there too. Keep contributor prose edits when they are real source changes.
4. **Commit the merge**  
   `git add .` then `git commit -m "chore: merge main to resolve conflicts"` (or leave the default merge message).
5. **Push to the same branch the PR is from**  
   If the PR is from the contributor’s fork branch (e.g. `sraphaz:feat/uncle-bob-craft`), you need push access to that branch. Options:
   - **Preferred:** Ask the contributor to merge `main` into their branch, fix conflicts, and push; then you use "Squash and merge" on GitHub.
   - If you have a way to push to their branch (e.g. they gave you permission, or the branch is in this repo), push:  
     `git push origin pr-<PR_NUMBER>:feat/uncle-bob-craft` (replace with the actual branch name from the PR).
6. **On GitHub:** The PR should now be mergeable. Click **"Squash and merge"**. The PR will show as **Merged**.

### If the contributor resolves conflicts

Ask them to:

```bash
git checkout <their-branch>
git fetch origin main
git merge origin/main
# resolve conflicts, then drop derived files from the PR if they appear:
# CATALOG.md, skills_index.json, data/*.json
git add .
git commit -m "chore: merge main to resolve conflicts"
git push origin <their-branch>
```

Then you use **"Squash and merge"** on GitHub. The PR will be **Merged**, not Closed.

## Rare exception: local squash (avoid if possible)

Only if merging via GitHub is not possible (e.g. contributor unreachable and you must integrate their work, or a one-off batch), you may squash locally and push to `main`. In that case:

1. Add a **Co-authored-by** line to the squash commit so the contributor is still credited (see [GitHub: Creating a commit with multiple authors](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)).
2. Close the PR with a comment explaining why it was integrated locally and that attribution is in the commit.
3. Prefer to avoid this pattern in the future so PRs can be **Merged** normally.

## Summary

| Goal                         | Action                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| Give contributors credit   | Always use **Squash and merge** on GitHub so the PR shows **Merged**.  |
| PR has conflicts           | Resolve on the PR branch (you or the contributor), then **Squash and merge**. |
| Never                      | Integrate locally and then **Close** the PR without merging.          |

## References

- [Merge Batch](merge-batch.md)
- [GitHub: Creating a commit with multiple authors](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)
- [GitHub: Merging a PR](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request)
