# CI Drift Fix Guide

**Problem**: The failing job is caused by tracked drift left behind after the canonical sync steps run on `main`.

**Error**:

```
❌ Detected uncommitted changes produced by registry/readme/catalog scripts.
```

**Cause**:
The canonical sync contract is broader than just the root registry files. Scripts such as `generate_index.py`, `update_readme.py`, `build-catalog.js`, `setup_web.js`, and plugin sync helpers can legitimately update:

- `README.md`
- `CATALOG.md`
- `skills_index.json`
- `data/*.json`
- tracked web assets under `apps/web-app/public/`
- generated plugin metadata and plugin-safe copies

The workflow expects the repository to be clean after those sync steps finish. Any remaining tracked or unmanaged changes mean `main` is out of sync with what the generation pipeline actually produces.

## Pull Requests vs Main

- **Pull requests**: PRs are now **source-only**. Contributors should not commit derived registry artifacts (`CATALOG.md`, `skills_index.json`, `data/*.json`). CI blocks those direct edits and reports generated drift as an informational preview only.
- **`main` pushes**: drift is still strict. The workflow may publish only managed drift through `automation/canonical-repo-state`; required CI must reproduce that PR as the exact expected Git tree before an immediate protected merge.

## How to Fix on `main`

1. Run the canonical maintainer sync locally:

   ```bash
   npm run sync:repo-state
   ```

2. Check whether anything is still dirty:

   ```bash
   git status
   git diff
   ```

3. If the sync produced only canonical/generated changes, open a source-free PR rather than pushing to protected `main`. Prefer the generated-files contract instead of a hand-maintained file list:

   ```bash
   node tools/scripts/generated_files.js --include-mixed
   git add $(node tools/scripts/generated_files.js --include-mixed)
   git switch -c chore/canonical-artifact-repair
   git commit -m "chore: sync canonical artifacts"
   git push -u origin chore/canonical-artifact-repair
   gh pr create --base main --fill
   ```

4. If `sync:repo-state` leaves unrelated or unmanaged drift, stop and inspect it. The bot is only allowed to publish the canonical/generated subset; anything else must fail instead of being silently included.

## Maintainer guidance for PRs

- Validate the source change, not the absence of committed generated artifacts.
- If a contributor PR includes direct edits to `CATALOG.md`, `skills_index.json`, or `data/*.json`, ask them to drop those files from the PR or remove them while refreshing the branch.
- If merge conflicts touch generated registry files, keep `main`'s version for those files and let `main` auto-sync the final generated artifact set after merge.
- If CI on `main` detects drift, expect one `chore: synchronize canonical repository state` PR. Its special lane still requires managed-only paths and exact reproducibility; it is not a license to include arbitrary changes.

**Summary**:
Use generator drift as a hard failure only on `main`. On PRs, the contract is simpler: source-only changes are reviewed, generated output is previewed, and `main` produces the final canonical artifact set.
