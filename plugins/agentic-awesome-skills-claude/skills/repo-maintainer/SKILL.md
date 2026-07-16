---
name: repo-maintainer
description: Championship-grade repository maintenance. Audits for test artifacts, dependency issues, CI/CD health, documentation sync, and FAF alignment. Generates prioritized cleanup plans. Use when repos need deep cleaning or ongoing maintenance.
risk: unknown
source: https://github.com/Wolfe-Jam/faf-skills/tree/main/skills/repo-maintainer
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/Wolfe-Jam/faf-skills/blob/main/LICENSE
---

# Repo Maintainer - Championship Repository Hygiene

**"When brakes must work flawlessly, so must our repos."**

---

## When to Use This Skill

Activate when:
- User types `/repo-maintainer` or `/maintain`
- User says "clean up this repo" or "audit the repo"
- Starting maintenance on a repository
- After major refactoring or before releases
- Monthly/quarterly repo health checks
- Onboarding to a new codebase

## Repository Policy Gate

Before auditing or mutating the repository, read its `AGENTS.md`, maintainer documentation, branch protection, and package scripts. If the repository names a mandatory maintainer skill or guarded command, delegate to that workflow and do not invent a parallel branch, merge, synchronization, or release path. In `agentic-awesome-skills`, `antigravity-maintainer-batch-release` and `npm run merge:batch` take precedence over this generic skill; `main` is pull-request-only.

## What This Skill Does

### 🔍 **Phase 1: Comprehensive Audit**

Systematically checks 7 critical areas:

#### 1. **Artifact Detection**
```bash
# Find test artifacts
*.test.js leftovers
*.spec.ts.snap orphans
.DS_Store files
tmp/, temp/, cache/ directories
coverage/ not in .gitignore
dist/, build/ committed by accident
node_modules/ somehow in git
```

**Detection Strategy:**
- Check `git status` for untracked patterns
- Scan for common artifact extensions
- Compare against .gitignore
- Find large files (>1MB) in working directory

#### 2. **Dependency Health**
```bash
# Check package health
npm outdated
npm audit
npx depcheck (find unused deps)
Check for pinned versions (inquirer@8.2.5 pattern)
Verify Dependabot config
```

**Red Flags:**
- Packages with security vulnerabilities
- EOL runtime versions (Node 16, Python 3.7)
- Duplicate dependencies (lodash + lodash.merge)
- Unused dependencies (installed but never imported)

#### 3. **CI/CD Alignment**
```bash
# Workflow consistency check
Node versions across all workflows
Test matrices (should match across ci.yml, release.yml)
Action versions (@v6 vs @v5)
Failed/skipped workflow runs
Secrets/tokens properly configured
```

**Common Fixes:**
- Remove EOL runtimes (e.g. Node 16) from release workflows
- Align Node versions across all workflows (e.g. 18/20/22)
- Pin packages that break under ESM resolution

#### 4. **Documentation Sync**
```bash
# Context alignment check
README.md ↔ CLAUDE.md ↔ project.faf
CHANGELOG up to date with git tags
package.json version matches latest tag
Examples in README still work
Links not broken (404 checks)
```

**FAF-Specific:**
- project.faf reflects current state
- CLAUDE.md bi-sync active
- .faf-dna not churning unnecessarily

#### 5. **Git Hygiene**
```bash
# .gitignore audit
Untracked files that should be ignored
  *.config.mjs
  *.faf test artifacts
  .env.local, .env.development
Large files in git history (use git-filter-repo)
Binary files that don't belong
```

**Pattern Recognition:**
```gitignore
# Add to .gitignore based on artifacts found
*.config.mjs
*.faf.backup
.faf-dna.tmp
test-*.faf
```

#### 6. **Code Quality Signals**
```bash
# Quick health indicators
Dead code (unused exports via ts-prune or depcheck)
TODO/FIXME comments (track count, prioritize)
Commented code blocks (remove or document)
Console.log statements in production code
Hardcoded secrets/tokens
```

#### 7. **FAF Ecosystem Health**

For FAF projects specifically:
```yaml
# Check FAF alignment
.faf score accuracy (run faf score)
Bi-sync alignment — CLAUDE.md ↔ .faf (run `faf sync`; mtime auto-direction)
MCP server compliance (if applicable)
WJTTC test coverage (for faf-cli, MCP servers)
```

For MCP servers:
```bash
# MCP-specific checks
package.json has "mcp" field
Server implements required tools
Tests cover all tool endpoints
README has MCP installation instructions
Registry listing accurate (npm + MCP registry)
```

---

### 🛠️ **Phase 2: Cleanup Plan Generation**

After audit, generate prioritized task list:

```markdown
# 🏎️ REPO HEALTH REPORT: faf-cli

**Overall Score:** 85% ◇ Bronze
**Status:** Production-ready with minor cleanup needed

---

## 🚨 CRITICAL (Fix Now)

### 1. Security: `open@10` breaking CI/CD
- **Impact:** Release pipeline failing
- **Fix:** Pin to `open@8.4.2` ✅ FIXED
- **Effort:** 5 minutes
- **Auto-fix:** Available

---

## ⚠️  MEDIUM (This Week)

### 3. .gitignore Gaps
- **Issue:** `*.config.mjs`, `*.faf` test files not ignored
- **Fix:** Add patterns to .gitignore
- **Effort:** 1 minute
- **Auto-fix:** Available
  ```gitignore
  *.config.mjs
  test-*.faf
  ```

---

## ℹ️  LOW (Nice to Have)

### 6. README Links
- **Issue:** 2 broken links to old docs
- **Fix:** Update URLs
- **Effort:** 5 minutes

### 7. Unused Dependencies
- **Issue:** `depcheck` found unused packages
- **Fix:** Remove or document why needed

---

## ✅ EXCELLENT

- Test coverage: 799/799 passing
- TypeScript strict mode: enabled
- FAF score: 83% (good)
- CI/CD: All workflows aligned
- Security: No critical vulnerabilities
- Documentation: CLAUDE.md in sync

---

## 🎯 RECOMMENDED ACTIONS

**Quick wins:** .gitignore + CHANGELOG entry + README links + safe `npm update`.
**This week:** triage TODOs, remove unused deps, bump patch.
**Monthly:** full dependency audit, large-file scan, perf baseline.

---

## 🔧 AUTO-FIX AVAILABLE

I can automatically fix:
- ✅ .gitignore additions
- ✅ CHANGELOG draft
- ✅ Safe dependency updates
- ✅ Workflow alignment

**Run auto-fix?** (yes/no)
```

---

### 🤖 **Phase 3: Auto-Fix (Optional)**

For safe, non-breaking fixes:

```bash
# 1. Update .gitignore
cat >> .gitignore <<EOF

# Auto-added by repo-maintainer
*.config.mjs
*.faf.backup
.faf-dna.tmp
test-*.faf
EOF

# 2. Generate CHANGELOG entry from git log
git log v4.3.3..v4.4.0 --pretty=format:"- %s (%h)" >> CHANGELOG.draft.md

# 3. Safe dependency updates (non-breaking)
npm update --save

# 4. Create cleanup branch
git checkout -b repo-maintenance/$(date +%Y-%m-%d)
git add .gitignore CHANGELOG.md package.json package-lock.json
git commit -m "chore: repo maintenance - cleanup artifacts and update deps

- Add missing .gitignore patterns
- Update CHANGELOG with v4.4.0
- Safe dependency updates (patch/minor only)

Generated by /repo-maintainer skill"
```

---

## Workflow

### Step 1: Initial Assessment
```bash
# Quick health check
pwd
git status
git log --oneline -5
ls -la | head -20
```

### Step 2: Systematic Audit

Run checks in order of priority:

1. **Critical first** - CI/CD failures, security issues
2. **Medium next** - Dependencies, documentation gaps
3. **Low priority** - Code quality signals, nice-to-haves

### Step 3: Generate Report

Create structured report with:
- Overall health score (0-100%)
- Critical/Medium/Low sections
- Effort estimates
- Auto-fix availability
- Recommended action plan

### Step 4: Execute (with approval)

Ask user:
- "Run auto-fix for safe items?"
- "Create cleanup branch?"
- "Open issues for manual items?"

Never make changes without explicit approval.

---

## MCP Server Maintenance

### Additional MCP Checks:

```bash
# 1. MCP-specific structure
package.json has "mcp" field
Server exports via index.ts
Tools properly registered

# 2. Registry compliance
Registry listing accurate (npm + MCP registry)
README has MCP install instructions
Works with Claude Desktop config

# 3. Tool coverage
Each tool has tests
Each tool has description
Error handling implemented

# 4. Version alignment
package.json version
git tag version
MCP registry version
npm published version
```

### MCP Cleanup Checklist:

- [ ] Remove test artifacts
- [ ] Update dependencies
- [ ] Align workflows (Node 18/20/22)
- [ ] Verify MCP tools still work
- [ ] Update README examples
- [ ] Check CHANGELOG current
- [ ] Verify published to npm
- [ ] Confirm registry listing accurate

---

## ✪ Tier System (Aligned with FAF)

**CRITICAL: Use Official FAF Tiers for All Scoring**

| Score | Tier | Symbol | Status |
|-------|------|--------|--------|
| 100% | Trophy | ✪ | Perfect — Gold Code |
| 99% | Gold | ★ | Exceptional |
| 95% | Silver | ◆ | Top tier |
| 85% | Bronze | ◇ | Production ready |
| 70% | Green | ● | Solid foundation |
| 55% | Yellow | ● | Needs improvement |
| 1% | Red | ○ | Major work needed |
| 0% | White | ♡ | Empty |

The score is **deterministic** — same input → same score, every time. **FAF doesn't lie.**

**Note:** 🍊 **Big Orange** is an **HONOR**, not a score or a badge. It recognizes sustained excellence across multiple criteria; it is never calculated from a single score.

**Apply These Tiers to:**
- Overall repo health score
- Individual category scores (CI/CD, Dependencies, etc.)
- Summary reports
- Cleanup recommendations

**Examples:**
```
95% Security     → ◆ Silver
88% Overall      → ◇ Bronze
78% Dependencies → ● Green
70% Git Hygiene  → ● Green
40% CI/CD        → ○ Red
100% Tests       → ✪ Trophy
```

---

## Related Skills

- `/wjttc-builder` · `/wjttc-tester` - generate + run championship-grade tests before a release
- `/faf-expert` - master the `.faf` format + score the repo's AI-readiness

---

## Best Practices

### 1. **Run Regularly**
- After major refactors
- Before releases
- Monthly maintenance
- When onboarding new devs

### 2. **Prioritize Impact**
- Fix breaking issues first (CI/CD, security)
- Document before cleaning (understand why artifacts exist)
- Test after cleanup (ensure nothing broke)

### 3. **Track Progress**
- Use TodoWrite for multi-step cleanups
- Create issues for manual items
- Document decisions in CLAUDE.md

### 4. **Automate Where Safe**
- .gitignore additions ✅
- CHANGELOG drafts ✅
- Workflow alignment ✅
- Breaking changes ❌ (need review)

---

## Example Session

```
User: /repo-maintainer

Claude: 🏎️ Starting championship repo maintenance audit...

[Runs git status]
[Checks workflows]
[Scans for artifacts]
[Runs npm outdated]
[Checks .gitignore]

📊 AUDIT COMPLETE

Overall Health: 85% ◇ Bronze
Critical Issues: 2
Medium Issues: 3
Low Priority: 5

Top Issues:
1. 🚨 open@10 breaking CI/CD (auto-fixable)
2. 🚨 Node 16 in workflows (EOL)
3. ⚠️  .gitignore missing *.config.mjs
4. ⚠️  15 outdated dependencies
5. ⚠️  CHANGELOG missing v4.4.0

I can auto-fix items 1, 2, 3, and draft 5.
Would you like me to proceed? (yes/no)

User: yes

Claude: ✅ Fixing...
[Pins open@8.4.2]
[Updates workflows to Node 20]
[Adds .gitignore patterns]
[Drafts CHANGELOG entry]

✅ Auto-fixes complete!

Remaining manual items:
- Review 15 dependency updates
- 3 TODO comments need review

Create cleanup branch? (yes/no)
```

---

## The Championship Promise

> "Pit crews service the car between every race.
> Your repos deserve the same attention."

---

*Repo Maintainer - Championship Repository Hygiene*
*"When brakes must work flawlessly, so must our repos."*

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
