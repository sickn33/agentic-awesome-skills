# Merging Pull Requests

**Policy: every accepted PR is merged through `npm run merge:batch`, which uses GitHub's protected squash-merge endpoint so contributors get credit. We never push an integration directly to `main` or close a PR after copying its work.**

## Always merge via GitHub

- Use `npm run merge:batch -- --prs <PR_NUMBER>` for every accepted PR; do not substitute the GitHub UI or a raw `gh pr merge` command.
- The PR must show as **Merged**, not Closed. That way the contributor appears in the repo’s contribution graph and the PR is clearly linked to the merge commit.
- Do **not** integrate a PR by squashing locally, pushing to `main`, and then closing the PR. That would show "Closed" and the contributor would not get proper credit.
- Before merging, require the normal PR checks from [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) to be green. If the PR changes anything under `skills/**` or `plugins/**/skills/**`, also require a truthful outcome from the separate [`skill-review` workflow](../../.github/workflows/skill-review.yml).
- For any tracked change under a canonical `skills/<skill-id>/**` subtree, inspect the complete skill directory and require a real manual logic review in addition to the automated checks. Confirm instructions, bundled files, failure modes, provenance, and `risk:` label before attesting the exact full head SHA.
- For ordered multi-PR maintainer batches, use [Merge Batch](merge-batch.md) as the operational shortcut and keep this document as the policy reference.

## If the PR has merge conflicts

Resolve conflicts **on the PR branch** so the PR becomes mergeable, then use `merge:batch`.

### Generated files policy

- Treat `CATALOG.md`, `skills_index.json`, and `data/*.json` as **derived artifacts**, not contributor-owned source files.
- `README.md` is mixed ownership: contributor prose edits are allowed, but workflow-managed metadata is canonicalized on `main`.
- If derived files appear in a PR refresh or merge conflict, prefer **`main`'s side** and remove them from the PR branch instead of hand-maintaining them there.
- Do not block a PR only because shared generated files would be regenerated differently after other merges. `main` auto-syncs the final state after merge.
- If a skill PR leaves `risk: unknown`, that is not automatically a blocker. Review the actual behavior semantically; do not infer risk from isolated words or rewrite it automatically.

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
   - **Preferred:** Ask the contributor to merge `main` into their branch, fix conflicts, and push; then use `merge:batch`.
   - If you have a way to push to their branch (e.g. they gave you permission, or the branch is in this repo), push:  
     `git push origin pr-<PR_NUMBER>:feat/uncle-bob-craft` (replace with the actual branch name from the PR).
6. **Run the guarded merge:** Once the PR is mergeable, use `npm run merge:batch -- --prs <PR_NUMBER> [--reviewed-head <40-character-head-sha>]`. The PR will show as **Merged**.

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

Then use the guarded `merge:batch` command. The PR will be **Merged**, not Closed.

## No local-integration exception

If `merge:batch` cannot prove the immutable PR tuple, required checks, branch protection, or exact review evidence, stop and repair the PR or workflow. Never integrate locally, push directly to `main`, or replace the guarded command with a raw merge.

## Summary

| Goal                         | Action                                                                 |
|-----------------------------|------------------------------------------------------------------------|
| Give contributors credit   | Use `merge:batch` so GitHub records the protected squash merge.       |
| PR has conflicts           | Resolve on the PR branch, then run `merge:batch`.                     |
| Never                      | Push an integration directly to `main`, use a raw merge, or close the PR after copying its work. |

## References

- [Merge Batch](merge-batch.md)
- [GitHub: Creating a commit with multiple authors](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)
- [GitHub: Merging a PR](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request)
