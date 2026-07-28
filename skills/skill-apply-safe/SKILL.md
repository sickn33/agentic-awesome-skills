---
name: skill-apply-safe
description: Safely apply AAS skills to a project with dry-run preview, staged rollout, and rollback. Use when applying skills from an aas-stack.json plan, or when skill application previously failed or left the project in a broken state.
category: meta
risk: unknown
source: community
source_type: community
date_added: "2026-07-28"
author: sickn33-contributor
tags: [skill-apply, rollback, recovery, aas, safe-apply, staged]
tools: [claude, codex, gemini, cursor, antigravity]
---

# Skill Apply Safe

## Overview

AAS Core's `apply` and `recovery` paths are explicitly experimental and outside
the supported preview path (as of V15.5.1). The safe workflow ends at `aas stack plan`.

But agents still need to **actually apply skills** — copy files, edit configs, install
packages, scaffold patterns. Without a protocol, application is opaque and irreversible.

This skill provides a **safe, staged, reversible apply protocol** that works on top
of any AAS plan — adding the rollback, preview, and verification layer that
Core currently doesn't provide.

---

## When to Use This Skill

- Use when executing an `aas stack plan` output (applying a validated skill stack)
- Use when a previous skill application broke the project
- Use when applying multiple skills and ordering matters
- Use when you need to apply skills to a team project (others will be affected)
- Use to recover from a partial or failed skill application

---

## Safety Principles

Before writing a single file:

1. **Snapshot first** — always capture a restore point before any mutation
2. **Dry-run by default** — preview what will change before changing it
3. **One skill at a time** — never batch-apply; apply → verify → continue
4. **Human checkpoint** — stop before irreversible steps (package installs, schema migrations)
5. **Rollback must be tested** — know the restore path before the apply path

---

## Apply Protocol (4 Stages)

### Stage 0: Pre-Flight Checks

Before applying anything, verify:

```bash
# 1. Confirm clean working tree
git status
# Expected: nothing to commit, working tree clean
# If dirty → stash or commit first

# 2. Confirm current branch is not main/master
git branch --show-current
# If on main → create a feature branch first
git checkout -b apply/aas-skill-stack

# 3. Snapshot state
git stash push -m "pre-aas-apply snapshot $(date +%Y%m%d-%H%M%S)"
# OR
git tag pre-aas-apply-$(date +%Y%m%d)

# 4. Verify plan file exists and is valid
cat aas-stack.json | jq '.skills | length'
# Must return > 0
```

**Stop condition:** If git working tree is dirty AND stash fails → do not proceed.

---

### Stage 1: Dry-Run Preview

For each skill in the plan, list what it would change **without changing it**:

```
Skill: react-patterns
  Would add:    src/patterns/hooks.js
  Would modify: src/App.js (add error boundary pattern)
  Would add:    .eslintrc (react recommended rules)
  Would NOT:    install packages (requires human approval)

Skill: clerk-auth
  Would add:    src/auth/ClerkProvider.jsx
  Would modify: src/index.js (wrap with ClerkProvider)
  Would add:    .env.example (CLERK_PUBLISHABLE_KEY placeholder)
  Would install: @clerk/nextjs (REQUIRES HUMAN APPROVAL)
```

**Output format:** Print a full change manifest before proceeding.  
**Human checkpoint:** Ask for approval before Stage 2.

---

### Stage 2: Staged Application (One Skill at a Time)

Apply skills in dependency order:
1. Config/tooling skills (linting, formatting, tsconfig)
2. Core architecture skills (auth, database, state)
3. Feature-layer skills (UI patterns, components)
4. Testing/observability skills
5. Deployment/infra skills

For each skill:

```bash
# Apply one skill
# (copy files, scaffold patterns per skill instructions)

# Immediately verify
npm run build 2>&1 | tail -20
# OR
python -m pytest --co -q 2>&1 | tail -10

# If verify fails → rollback THIS skill only (not the whole stack)
git diff --name-only HEAD
git checkout HEAD -- <files changed by this skill>
```

**Stop condition:** If any skill application breaks the build → stop, rollback that skill, log the gap, continue with the next.

---

### Stage 3: Package Install Checkpoint

Package installs are **irreversible** without lockfile surgery. Always require explicit approval:

```
⚠️  HUMAN CHECKPOINT — Package Installation Required

The following packages will be installed:
  @clerk/nextjs@^5.0.0
  @tanstack/react-query@^5.0.0

This will:
  - Modify package.json
  - Regenerate package-lock.json / yarn.lock
  - Download ~45MB of dependencies

Proceed? [y/N]
```

Only continue after explicit human confirmation.

```bash
# Install with exact versions (reproducible)
npm install --save-exact @clerk/nextjs@5.0.0

# Verify install didn't break anything
npm run build
npm test
```

---

### Stage 4: Post-Apply Verification

After all skills are applied:

```bash
# Full build
npm run build

# Full test suite
npm test

# Lint
npm run lint

# Type check (if TypeScript)
npx tsc --noEmit

# Git diff summary
git diff --stat HEAD~1
```

Produce a verification report:

| Check | Status | Notes |
|-------|--------|-------|
| Build | ✅/❌  | |
| Tests | ✅/❌  | |
| Lint  | ✅/❌  | |
| Types | ✅/❌  | |

**If any check fails:** do NOT merge to main. Roll back failing skills, document the gap.

---

## Rollback Procedures

### Rollback a single skill
```bash
# Find files changed by that skill
git diff --name-only HEAD~1 HEAD

# Restore those files only
git checkout HEAD~1 -- <file1> <file2>

# Verify restore
npm run build
```

### Rollback the entire apply session
```bash
# Return to pre-apply snapshot
git checkout pre-aas-apply-<date>
# OR
git stash pop

# Verify clean state
npm run build && npm test
```

### Recovery from broken state
```bash
# Hard reset to last known good commit
git log --oneline -10
git reset --hard <last-good-commit-hash>

# Verify
git status
npm run build
```

---

## Examples

### Example 1: Clean apply workflow
```
Stage 0: git status → clean ✅ | git tag pre-aas-apply-20260728 ✅
Stage 1: Dry-run shows 12 file changes, 2 package installs → approved
Stage 2: Applied 6 skills one-by-one, all builds pass
Stage 3: Human approved 2 package installs → installed successfully
Stage 4: Build ✅ | Tests 47/47 ✅ | Lint ✅ | Types ✅
Result: Committed as apply/aas-skill-stack → PR opened
```

### Example 2: Recovery from failed apply
```
Problem: clerk-auth skill modified index.js, broke React tree
Stage 2 verify: build failed with "ClerkProvider missing publishable key"
Rollback: git checkout HEAD -- src/index.js
Build restored ✅
Resolution: Added CLERK_PUBLISHABLE_KEY to .env before re-applying
```

---

## Best Practices

- ✅ Always tag or stash before applying — git history is your safety net
- ✅ Apply one skill at a time — never batch-apply without per-skill verification
- ✅ Treat package installs as a human decision, not an automatic step
- ✅ Keep the verification report — it's your audit trail
- ❌ Don't apply directly to main — always use a branch
- ❌ Don't skip dry-run — surprises at apply time are expensive
- ❌ Don't assume a passing `aas stack plan` means safe to apply unattended

## Common Pitfalls

- **Problem:** Skill modifies a shared config file (e.g., `.eslintrc`) that two skills both need  
  **Solution:** Apply config-touching skills first; later skills should extend, not replace

- **Problem:** Package install pulls in a breaking major version  
  **Solution:** Use `--save-exact` and pin versions; review changelog before installing

- **Problem:** Apply session interrupted halfway through  
  **Solution:** Use `git stash` before each skill; rollback to last successful stash on interrupt

## Additional Resources

- [AAS Core Guide — Preview Status](https://github.com/sickn33/agentic-awesome-skills/blob/v15.5.1/docs/users/aas-core.md)
- [AAS CLI: aas stack plan](https://github.com/sickn33/agentic-awesome-skills)
- [aas-skill-selector](../aas-skill-selector/SKILL.md) — select the right stack before applying
- [skill-quality-auditor](../skill-quality-auditor/SKILL.md) — audit skills before applying
