# 🛠️ Repository Maintenance Guide (V5)

> **"If it's not documented, it's broken."**

This guide details the exact procedures for maintaining `antigravity-awesome-skills`.
It covers the **Quality Bar**, **Documentation Consistency**, and **Release Workflows**.

**Maintainer shortcuts:** [Merge a PR](#b-when-you-merge-a-pr-step-by-step) · [Reopen & merge a closed PR](#if-a-pr-was-closed-after-local-integration-reopen-and-merge) · [Post-merge credits sync](#c-post-merge-credits-sync-mandatory-after-every-pr-merge) · [Close issues](#when-to-close-an-issue) · [Create a release](#4-release-workflow)

---

## 0. 🤖 Agent Protocol (THE BIBLE)

**AGENTS MUST READ AND FOLLOW THIS SECTION BEFORE MARKING ANY TASK AS COMPLETE.**

There are 5 things that usually fail/get forgotten. **DO NOT FORGET THEM:**

### 1. 📤 ALWAYS PUSH (Non-Negotiable)

Committing is NOT enough. You must PUSH to the remote.

- **BAD**: `git commit -m "feat: new skill"` (User sees nothing)
- **GOOD**: `git commit -m "..." && git push origin main`

### 2. 🔄 SYNC GENERATED FILES (Avoid CI Drift)

If you touch **any of these**:

- `skills/` (add/remove/modify skills)
- the **Full Skill Registry** section of `README.md`
- **counts/claims** about the number of skills (`1,200+ Agentic Skills...`, `(1,200+/1,200+)`, etc.)

…then you **MUST** run the Validation Chain **BEFORE** committing.

- Running `npm run chain` is **NOT optional**.
- Running `npm run catalog` is **NOT optional**.

For contributor PRs, the contract is now **source-only**:

- contributors should not commit `CATALOG.md`, `skills_index.json`, or `data/*.json`
- PR CI previews generated drift but does not require those files in the branch
- `main` remains the only canonical owner of derived registry artifacts

If `main` CI fails with:

> `❌ Detected uncommitted changes produced by registry/readme/catalog scripts.`

it means the repository could not auto-sync generated artifacts cleanly and maintainer intervention is required.

### 3. 📝 EVIDENCE OF WORK

- You must create/update `walkthrough.md` or `CHANGELOG.md` to document what changed.
- If you made something new, **link it** in the artifacts.

### 4. 🚫 NO BRANCHES

- **ALWAYS use the `main` branch.**
- NEVER create feature branches (e.g., `feat/new-skill`).
- We commit directly to `main` to keep history linear and simple.

### 5. 📦 RUNTIME DEPENDENCIES MUST BE RUNTIME DEPENDENCIES

If you change the published npm installer surface:

- `tools/bin/install.js`
- `tools/lib/**/*.js` used by the installer
- `package.json` `bin` entry or packaged files

…then every imported package needed by `npx antigravity-awesome-skills` must live in `dependencies`, **not** `devDependencies`.

- `npm pack --dry-run` is **not enough** to prove this.
- A local repo test can pass while `npx` still fails in a clean environment.
- If installer/runtime imports change, add or update a package-contents/runtime test in `tools/scripts/tests/`.
- Treat `Cannot find module 'X'` from a clean `npx` install as a release-blocking packaging failure.

---

## 1. 🚦 Daily Maintenance Routine

### A. Validation Chain

Before ANY commit that adds/modifies skills, run the chain:

1.  **Validate, index, and update readme**:

    ```bash
    npm run chain
    ```

    _Must return 0 errors for new skills._

2.  **Enforce the frozen warning budget**:

    ```bash
    npm run check:warning-budget
    ```

    This is required before merging or releasing skill changes. It catches new repository-wide warnings, including missing `## When to Use` sections, at PR time instead of letting them surface only during `release:preflight`.

3.  **Check README source credits for changed skills**:

    ```bash
    npm run check:readme-credits -- --base origin/main --head HEAD
    ```

    This verifies that changed skills with declared external upstream repos already have the required README credit under `### Official Sources` or `### Community Contributors`.
    The first rollout is warning-first for missing structured metadata: if a changed skill clearly looks externally sourced but still lacks `source_repo`, the check warns instead of failing. Once `source_repo` is declared, README coverage is mandatory.

4.  **Build catalog**:

    ```bash
    npm run catalog
    ```

5.  **Optional maintainer sweep shortcut**:
    ```bash
    npm run sync:repo-state
    ```
    This wraps `chain + catalog + sync:web-assets + sync:contributors + audit:consistency` for a full local repo-state refresh.
    The scheduled GitHub Actions workflow `Repo Hygiene` runs this same sweep weekly to catch slow drift on `main`.
    It also enforces the frozen validation warning budget, so new warnings do not creep in silently while the legacy `135` known warnings remain accepted.

    When you need the live GitHub repo metadata updated too, run:

    ```bash
    npm run sync:github-about
    npm run audit:consistency:github
    ```
    For a read-only summary of current repo health, run:
    ```bash
    npm run audit:maintainer
    ```
    When you are reducing legacy `risk: unknown` debt, use this sequence instead of hand-editing large batches:
    ```bash
    npm run audit:skills
    npm run sync:risk-labels -- --dry-run
    npm run sync:risk-labels
    npm run sync:repo-state
    ```
    `sync:risk-labels` is intentionally conservative. It should handle only the obvious subset; the ambiguous tail still needs maintainer review.

6.  **COMMIT GENERATED FILES**:
    ```bash
    git add README.md skills_index.json data/skills_index.json data/catalog.json data/bundles.json data/aliases.json CATALOG.md
    git commit -m "chore: sync generated files"
    ```
    > 🔴 **CRITICAL for direct `main` work**: If you skip this on maintainer work that lands directly on `main`, CI will fail with "Detected uncommitted changes".
    > For contributor PRs, do **not** include derived registry artifacts. CI blocks direct edits to those files and previews drift separately.
    > See [`docs/maintainers/ci-drift-fix.md`](../docs/maintainers/ci-drift-fix.md) for details.
    > `main` may still auto-commit canonical artifacts with `[ci skip]`, but only within the generated-files contract. If the sync leaves unmanaged drift, the workflow must fail instead of pushing a partial fix.

### B. When You Merge a PR (Step-by-Step)

> **Agent instruction (when analyzing or handling PRs):** Always merge accepted PRs via GitHub (**Squash and merge**). Never integrate locally and then close the PR. If a PR is closed but its changes were integrated locally, reopen it and follow [Reopen & merge](#if-a-pr-was-closed-after-local-integration-reopen-and-merge) so it ends up **Merged**. Contributors must get credit.

**Before merging:**

1.  **CI is green** — Validation, warning-budget enforcement, README source-credit checks, reference checks, tests, and generated artifact steps passed (see [`.github/workflows/ci.yml`](workflows/ci.yml)). If the PR changes any `SKILL.md`, the separate [`skill-review` workflow](workflows/skill-review.yml) must also be green.
2.  **Generated drift understood** — On pull requests, generator drift is informational only. Do not block a good PR solely because canonical artifacts would be regenerated. Also do not accept PRs that directly edit `CATALOG.md`, `skills_index.json`, or `data/*.json`; those files are `main`-owned.
3.  **Quality Bar** — PR description confirms the [Quality Bar Checklist](.github/PULL_REQUEST_TEMPLATE.md) (metadata, risk label, credits if applicable).
4.  **Issue link** — If the PR fixes an issue, the PR description should contain `Closes #N` or `Fixes #N` so GitHub auto-closes the issue on merge.

**How you merge:**

- **Always merge via GitHub** so the PR shows as **Merged** and the contributor gets credit. Use **"Squash and merge"**. Do **not** integrate locally and then close the PR — that would show "Closed" and the contributor would not get proper attribution.
- **If the PR has merge conflicts:** Resolve them **on the PR branch** (you or the contributor: merge `main` into the PR branch, fix conflicts, drop derived registry files from the branch if they appear, push). For generated registry files, prefer keeping `main`'s side rather than hand-editing conflicts. Then use **"Squash and merge"** on GitHub. Full steps: [docs/maintainers/merging-prs.md](../docs/maintainers/merging-prs.md).
- **Rare exception:** Only if merging via GitHub is not possible, you may integrate locally and close the PR; in that case you **must** add a Co-authored-by line to the commit and explain in a comment. Prefer to avoid this so PRs are always **Merged**.

**If CI is blocked on fork approval or stale PR metadata:**

This happens regularly on community PRs from forks. The common symptoms are:

- `gh pr checks` shows `no checks reported` even though Actions runs exist.
- `gh run list` shows `action_required` with `jobs: []` for `Skills Registry CI` or `Skill Review`.
- `pr-policy` fails with `PR body must include the Quality Bar Checklist from the template.` even after you corrected the PR body and hit rerun.

Use this playbook:

1.  **Approve waiting fork runs** using the run id(s) from `gh run list`:
    ```bash
    gh api -X POST repos/<OWNER>/<REPO>/actions/runs/<RUN_ID>/approve
    ```
2.  **Normalize the PR body** so it includes the repository template's `## Quality Bar Checklist ✅` section. If `gh pr edit` works, use it. If `gh pr edit` fails with the GraphQL `projectCards` / Projects Classic deprecation error, patch the PR body through the REST API instead:
    ```bash
    gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER> -X PATCH --input <(jq -n --rawfile body /tmp/pr_body.md '{body:$body}')
    ```
3.  **Do not trust a plain rerun** to pick up the updated PR body. In practice, `gh run rerun <RUN_ID>` may re-use the original `pull_request` event payload, so `pr-policy` can keep reading the stale body and fail again.
4.  **If the rerun still sees stale metadata, close and reopen the PR** to force a fresh `pull_request` event:
    ```bash
    gh pr close <PR_NUMBER> --comment "Maintainer workflow refresh: closing and reopening to retrigger pull_request checks against the updated PR body."
    gh pr reopen <PR_NUMBER>
    ```
5.  **Approve the newly created fork runs** after reopen. They will usually appear as a fresh pair of `action_required` runs for `Skills Registry CI` and `Skill Review`.
6.  **Wait for the new checks only.** You may see older failed `pr-policy` runs in the rollup alongside newer green runs. Merge only after the fresh run set for the current PR state is fully green: `pr-policy`, `source-validation`, `artifact-preview`, and `review` when `SKILL.md` changed. `source-validation` now enforces the frozen warning budget and README source-credit coverage for changed skills, so missing `## When to Use` sections, missing README repo credits, or other new warning drift must be fixed before merge.
7.  **If `gh pr merge` says `Base branch was modified`**, refresh the PR state and retry. This is normal when you are merging a batch and `main` moved between attempts.

**If a PR was closed after local integration (reopen and merge):**

If a PR was integrated via local squash and then **closed** (so it shows "Closed" instead of "Merged"), you can still give the contributor credit by reopening it and merging it on GitHub. The merge can be effectively "empty" (no new diff vs `main`); what matters is that the PR ends up **Merged**.

1.  **Reopen the PR** on GitHub (Reopen button on the closed PR page), or: `gh pr reopen <PR_NUMBER>`.
2.  **Fetch the PR branch** (the branch lives on the contributor's fork):
    ```bash
    git fetch origin pull/<PR_NUMBER>/head:pr-<PR_NUMBER>-tmp
    git checkout pr-<PR_NUMBER>-tmp
    ```
3.  **Merge `main` into it** and resolve conflicts:
    ```bash
    git merge origin/main -m "chore: merge main to resolve conflicts"
    ```
    For conflicts in generated/registry files (`CATALOG.md`, `data/catalog.json`, etc.), keep **main's version** and remove those derived files from the PR branch:
    `git checkout --theirs CATALOG.md data/catalog.json` (and any other derived files), then `git add` them.
4.  **Commit the merge** (if not already done):  
    `git commit -m "chore: merge main to resolve conflicts" --no-edit`
5.  **Push to the contributor's fork.** Add their fork as a remote if needed (replace `USER` and `BRANCH` with the PR head owner and branch from the PR page):
    ```bash
    git remote add <user>-fork https://github.com/<USER>/antigravity-awesome-skills.git
    git push <user>-fork pr-<PR_NUMBER>-tmp:<BRANCH>
    ```
    This works if the contributor enabled **"Allow edits from maintainers"** (or you have push access). If push is denied, ask the contributor to merge `main` into their branch and push; then you use "Squash and merge" on GitHub.
6.  **Merge the PR on GitHub:**  
    `gh pr merge <PR_NUMBER> --squash`  
    The PR will show as **Merged** and the contributor will get credit.
7.  **Switch back to `main`:**  
    `git checkout main`

We used this flow for PRs [#220](https://github.com/sickn33/antigravity-awesome-skills/pull/220), [#224](https://github.com/sickn33/antigravity-awesome-skills/pull/224), and [#225](https://github.com/sickn33/antigravity-awesome-skills/pull/225) after they had been integrated locally and closed.

**Right after merging:**

1.  **If the PR had `Closes #N`** — The issue is closed automatically; no extra action.
2.  **If an issue was fixed but not linked** — Close it manually and add a comment, e.g.:
    ```text
    Fixed in #<PR_NUMBER>. Shipped in release vX.Y.Z.
    ```
3.  **Run the Post-Merge Credits Sync below** — this is mandatory after every PR merge, including single-PR merges.

**Maintainer shortcut for batched PRs:**

- Use `npm run merge:batch -- --prs 450,449,446,451` to automate the ordered maintainer flow for multiple PRs. See [docs/maintainers/merge-batch.md](../docs/maintainers/merge-batch.md) for the short usage guide.
- The script keeps the GitHub-only squash merge rule, handles fork-run approvals and stale PR metadata refresh, waits only on fresh required checks, retries `Base branch was modified`, and runs the mandatory post-merge `sync:contributors` follow-up on `main`.
- It is intentionally not a conflict resolver. If a PR is conflicting, stop and follow the manual conflict playbook.

### C. Post-Merge Credits Sync (Mandatory After Every PR Merge)

This section is **not optional**. Every time a PR is merged, you must ensure both README credit surfaces are correct on `main`:

- `### Community Contributors` / `## Credits & Sources` for external repositories referenced by the merged work
- `## Repo Contributors` for the human contributor list

Do this **immediately after each PR merge**. Do not defer it to release prep.

1.  **Pull the merged `main` state locally**:
    ```bash
    git checkout main
    git pull --ff-only origin main
    ```

2.  **Sync `Repo Contributors`**:
    - Run: `npm run sync:contributors`
    - This refreshes `## Repo Contributors` in `README.md` from the live GitHub contributor list while preserving custom bot/app links.
    - If you are already doing a full maintainer sweep, `npm run sync:repo-state` is also acceptable.

3.  **Audit external-source credits for the merged PR**:
    - Read the merged PR description, changed files, linked issues, and any release-note draft text you plan to ship.
    - If the PR added skills, references, or content sourced from an external GitHub repo that is not already credited in `README.md`, add it immediately.
    - Treat skill frontmatter `source_repo` + `source_type` as the primary source of truth when present.
    - If the repo is from an official organization/project source, place it under `### Official Sources`.
    - If the repo is a non-official ecosystem/community source, place it under `### Community Contributors`.
    - If the PR reveals that a credited repo is dead, renamed, archived, or overstated, fix the README entry in the same follow-up pass instead of leaving stale metadata behind.
    - Release notes are not a substitute for README attribution. If a repo appears in the merged work or planned release notes and belongs in credits, add it to the README at merge time.

4.  **Commit and push README credit updates right away**:
    - If `npm run sync:contributors` or the credit audit changed `README.md`, commit and push that follow-up immediately on `main`.
    - Do not leave contributor or community-credit drift sitting locally until the next release.

5.  **Then continue with normal maintenance**:
    - Verify Table of Contents if you touched headings.
    - Prepare the release when ready (see [§4 Release Workflow](#4-release-workflow) below).

---

## 2. 📝 Documentation "Pixel Perfect" Rules

We discovered several consistency issues during V4 development. Follow these rules STRICTLY.

### A. Table of Contents (TOC) Anchors

GitHub's anchor generation breaks if headers have emojis.

- **BAD**: `## 🚀 New Here?` -> Anchor: `#--new-here` (Broken)
- **GOOD**: `## New Here?` -> Anchor: `#new-here` (Clean)

**Rule**: **NEVER put emojis in H2 (`##`) headers.** Put them in the text below if needed.

### B. The "Trinity" of Docs

If you update installation instructions or tool compatibility, you MUST update all 3 files:

1.  `README.md` (Source of Truth)
2.  `docs/users/getting-started.md` (Beginner Guide)
3.  `docs/users/faq.md` (Troubleshooting)

_Common pitfall: Updating the clone URL in README but leaving an old one in FAQ._

### C. Statistics Consistency (CRITICAL)

If you add/remove skills, you **MUST** ensure generated counts and user-facing claims stay aligned.

Locations to check:

1.  `README.md`
2.  `package.json` description
3.  `skills_index.json` and generated catalog artifacts
4.  Any user docs that deliberately hardcode counts

### D. Credits Policy (Who goes where?)

- **Official Sources**: Use this for **official org/vendor/project repos**.
  - _Rule_: "This came from the official repo for the tool/company/project." -> Add to `### Official Sources`.
- **Community Contributors**: Use this for **non-official external repos** that contributed skills, references, templates, or other source material.
  - _Rule_: "This merged PR depends on or imports material from a community repo." -> Add to `### Community Contributors`.
- **Credits & Sources**: This whole area is for **external repos and upstream sources**, split into Official vs Community.
- **Repo Contributors**: Use this for **Pull Requests**.
  - _Rule_: "This user sent a PR." -> Add to `## Repo Contributors`.

**Merge rule:** after every PR merge, check **both** `### Community Contributors` and `## Repo Contributors`. A merge is not fully done until both sections are either confirmed unchanged or updated and pushed.

### E. Badges & Links

- **Antigravity Badge**: Must point to `https://github.com/sickn33/antigravity-awesome-skills`, NOT `anthropics/antigravity`.
- **License**: Ensure the link points to `LICENSE` file.

### F. Workflows Consistency (NEW in V5)

If you touch any Workflows-related artifact, keep all workflow surfaces in sync:

1. `docs/users/workflows.md` (human-readable playbooks)
2. `data/workflows.json` (machine-readable schema)
3. `skills/antigravity-workflows/SKILL.md` (orchestration entrypoint)

Rules:

- Every workflow id referenced in docs must exist in `data/workflows.json`.
- If you add/remove a workflow step category, update prompt examples accordingly.
- If a workflow references optional skills not yet merged (example: `go-playwright`), mark them explicitly as **optional** in docs.
- If workflow onboarding text is changed, update the docs trinity:
  - `README.md`
  - `docs/users/getting-started.md`
  - `docs/users/faq.md`

---

## 3. 🛡️ Governance & Quality Bar

### A. The 6-Point Quality Check

Reject any PR that fails this:

1.  **Metadata**: Has `name`, `description`?
2.  **Safety**: `risk: offensive` used for red-team tools?
3.  **Clarity**: Does it say _when_ to use it?
4.  **Examples**: Copy-pasteable code blocks?
5.  **Risk Limits**: If the skill includes shell/network/filesystem/mutation guidance, instructions include explicit prerequisites and warnings.
6.  **Repo Security Scan**: Run `npm run security:docs` for command-heavy, network-execution, or token-like guidance in `SKILL.md`.

### B. Risk Labels (V4)

- ⚪ **Safe**: Default.
- 🔴 **Risk**: Destructive/Security tools. MUST have `[Authorized Use Only]` warning.
- 🟣 **Official**: Vendor mirrors only.

---

## 4. 🚀 Release Workflow

When cutting a new version, follow the maintainer playbook in [`docs/maintainers/release-process.md`](../docs/maintainers/release-process.md).

**Release checklist (order matters):**  
Preflight verification → Changelog → `npm run release:prepare -- X.Y.Z` → `npm run release:publish -- X.Y.Z` → npm publish (manual or via CI) → Close remaining linked issues.

---

1.  **Run release verification**:
    ```bash
    npm run release:preflight
    ```
    This now runs the deterministic `sync:release-state` path, refreshes tracked web assets, executes the local test suite, runs the web-app build, and performs `npm pack --dry-run --json` before a release is considered healthy.
    If `release:preflight` fails on `check:warning-budget`, treat it as a PR-quality failure and fix the new warnings in source rather than bypassing the gate at release time.
    If the installer or packaged runtime code changed, you must also verify that new imports are satisfied by `dependencies` rather than `devDependencies`, and ensure the npm-package/runtime tests cover that path. `npm pack --dry-run` alone will not catch missing runtime deps in a clean `npx` environment.
    Optional diagnostic pass:
    ```bash
    npm run validate:strict
    ```
2.  **Update Changelog**: Add the new release section to `CHANGELOG.md`.
3.  **Prepare commit and tag locally**:
    ```bash
    npm run release:prepare -- X.Y.Z
    ```
    This validates the release, aligns versioned files, writes the release notes artifact, creates the release commit, and creates the local tag.
4.  **Create GitHub Release** (REQUIRED):

    > ⚠️ **CRITICAL**: Pushing a tag (`git push --tags`) is NOT enough. You must create a **GitHub Release Object** for it to appear in the sidebar and trigger the NPM publish workflow.

    Use the GitHub CLI:

    ```bash
    npm run release:publish -- X.Y.Z
    ```

    **Important:** The release tag must match `package.json`'s version. The [Publish to npm](workflows/publish-npm.yml) workflow runs on **Release published** and will run `npm publish`; npm rejects republishing the same version.
    Before publishing, that workflow re-runs `sync:release-state`, checks for canonical drift with `git diff --exit-code`, runs tests/docs security/web build, and performs `npm pack --dry-run --json`.

    _Or create the release manually via GitHub UI > Releases > Draft a new release, then publish._

5.  **Publish to npm** (so `npx antigravity-awesome-skills` works):
    - **Option A (manual):** From repo root, with npm logged in and 2FA/token set up:
      ```bash
      npm publish
      ```
      You cannot republish the same version; always bump `package.json` before publishing.
    - **Option B (CI):** On GitHub, create a **Release** (tag e.g. `v4.6.1`). The workflow [Publish to npm](.github/workflows/publish-npm.yml) runs on **Release published** and runs `npm publish` if the repo secret `NPM_TOKEN` is set (npm → Access Tokens → Granular token with Publish, then add as repo secret `NPM_TOKEN`).

6.  **Close linked issue(s)**:
    - Issues that had `Closes #N` / `Fixes #N` in a merged PR are already closed.
    - For any issue that was fixed by the release but not auto-closed, close it manually and add a comment, e.g.:
      ```bash
      gh issue close <ID> --comment "Shipped in vX.Y.Z. See CHANGELOG.md and release notes."
      ```

### GitHub Release Notes Requirements

Every published GitHub Release should work as a discovery page, not just an internal changelog dump.

Required rules:

1. Put the user-facing tool language early:
   - mention Claude Code, Cursor, Codex CLI, Gemini CLI, or the specific supported tools that matter for that release.
2. Add a short "Start here" block near the top:
   - install command
   - link to `README.md#choose-your-tool`
   - link to `README.md#best-skills-by-tool`
   - link to `docs/users/bundles.md`
   - link to `docs/users/workflows.md`
3. Keep the first paragraph readable to someone arriving from Google or GitHub Releases.
4. Prefer plain ASCII section headers in release notes.
5. Do not rewrite historical releases in bulk. Improve the latest release and all future releases.

### GitHub Release Notes Template

Use this structure for the published GitHub Release object:

```markdown
## [X.Y.Z] - YYYY-MM-DD - "User-facing title"

> Installable skill library update for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and related AI coding assistants.

Start here:

- Install: `npx antigravity-awesome-skills`
- Choose your tool: [README -> Choose Your Tool](https://github.com/sickn33/antigravity-awesome-skills#choose-your-tool)
- Best skills by tool: [README -> Best Skills By Tool](https://github.com/sickn33/antigravity-awesome-skills#best-skills-by-tool)
- Bundles: [docs/users/bundles.md](https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/bundles.md)
- Workflows: [docs/users/workflows.md](https://github.com/sickn33/antigravity-awesome-skills/blob/main/docs/users/workflows.md)

[Brief paragraph explaining what changed and who the release helps.]

## New Skills

- **skill-name** - user-facing summary

## Improvements

- **Area**: user-facing improvement summary

## Who should care

- **Claude Code users** ...
- **Cursor users** ...
- **Codex CLI users** ...
- **Gemini CLI users** ...

## Credits

- **@username** for `skill-name`

Upgrade now: `git pull origin main` to fetch the latest skills.
```

### Social Preview

If you set a repository social preview image on GitHub, keep these rules:

- focus on the core value proposition;
- mention the primary supported tools when helpful;
- avoid dense text or tiny unreadable logos;
- refresh it when repository positioning changes materially.

Manual upload path on GitHub:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Open the **Social preview** section.
4. Upload the image you want to use.

### Pinned Discussion Template

Canonical onboarding discussion:

- Title: `Start here: best skills by tool`
- Current live discussion: `https://github.com/sickn33/antigravity-awesome-skills/discussions/361`

When refreshing or recreating the pinned onboarding discussion, keep this structure:

~~~markdown
If you are new to **Antigravity Awesome Skills**, start here instead of browsing all skills at random.

## Install in 1 minute

```bash
npx antigravity-awesome-skills
```

## Best starting pages by tool

- Claude Code
- Cursor
- Codex CLI
- Gemini CLI

## Start with a bundle

- Bundles
- Workflows
- Getting started
- Usage guide

## Best starter skills for most users

- `@brainstorming`
- `@lint-and-validate`
- `@systematic-debugging`
- `@create-pr`
- `@security-auditor`

## Compare before you install

- comparison pages
- best-of pages
~~~

If GitHub does not support pinning via API, create/update the discussion programmatically if possible and pin it manually in the UI.

### When to Close an Issue

| Situation                                                | Action                                                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| PR merges and PR body contains `Closes #N` or `Fixes #N` | GitHub closes the issue automatically.                                                         |
| PR merges but did not reference the issue                | After merge, close manually: `gh issue close N --comment "Fixed in #<PR>. Shipped in vX.Y.Z."` |
| Fix/feature shipped in a release, no PR referenced       | Close with: `gh issue close N --comment "Shipped in vX.Y.Z. See CHANGELOG."`                   |

### 📋 Changelog Entry Template

Each new release section in `CHANGELOG.md` should follow [Keep a Changelog](https://keepachangelog.com/) and this structure:

```markdown
## [X.Y.Z] - YYYY-MM-DD - "[Theme Name]"

> **[One-line catchy summary of the release]**

[Brief 2-3 sentence intro about the release's impact]

## 🚀 New Skills

### [Emoji] [Skill Name](skills/skill-name/)

**[Bold high-level benefit]**
[Description of what it does]

- **Key Feature 1**: [Detail]
- **Key Feature 2**: [Detail]

> **Try it:** `(User Prompt) ...`

---

## 📦 Improvements

- **Registry Update**: Now tracking [N] skills.
- **[Component]**: [Change detail]

## 👥 Credits

A huge shoutout to our community contributors:

- **@username** for `skill-name`
- **@username** for `fix-name`

---

_Upgrade now: `git pull origin main` to fetch the latest skills._
```

---

## 5. 🚨 Emergency Fixes

If a skill is found to be harmful or broken:

1.  **Move to broken folder** (don't detect): `mv skills/bad-skill skills/.broken/`
2.  **Or Add Warning**: Add `> [!WARNING]` to the top of `SKILL.md`.
3.  **Push Immediately**.

---

## 6. 📁 Data directory note

`data/package.json` exists for historical reasons; the build and catalog scripts run from the repo root and use root `node_modules`. You can ignore or remove `data/package.json` and `data/node_modules` if present.
