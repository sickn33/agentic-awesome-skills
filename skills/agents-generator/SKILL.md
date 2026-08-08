---
name: agents-generator
description: "Generate project-specific AGENTS.md and companion rules by analyzing a codebase. Supports full, minimal, update, and dry-run modes with package-manager detection, monorepos, backups, managed blocks, confidence scoring, and command validation."
category: developer-tools
risk: critical
source: https://github.com/OJPalenzuela/agents-generator/tree/7a3201208a01bd25e69ad11e665efc1392f5356a
source_repo: OJPalenzuela/agents-generator
source_type: community
date_added: "2026-08-02"
author: OJPalenzuela
tags: [agents-md, project-conventions, developer-tools, codebase-analysis, ai-agents]
tools: [claude, cursor, copilot, opencode, codex, gemini]
license: MIT
license_source: https://github.com/OJPalenzuela/agents-generator/blob/7a3201208a01bd25e69ad11e665efc1392f5356a/LICENSE
allowed-tools: Read Write Edit Bash(ls:*) Bash(git:*) Bash(tree:*) Bash(find:*) Grep Glob WebFetch
metadata:
  author: OJPalenzuela
  version: "1.2.3"
---

# Skill: agents-generator

> [!WARNING]
> **[Authorized Use Only]** This skill writes or updates `AGENTS.md`, `.agents/rules/`, optional platform instruction files, and timestamped backups in the target project. Read the detected inputs and proposed outputs first, obtain approval before changing target files, and use it only inside the user's intended project scope.

## When to Use

Use this skill when the user wants to:

- create a complete, project-specific `AGENTS.md` instead of generic agent rules;
- generate companion rules for detected frameworks, tests, databases, styling, or monorepo packages;
- create a minimal `AGENTS.md`, preview changes without writing, or update existing instructions after the stack changes.

Do not use it to invent conventions without inspecting the target project, to overwrite instructions outside the user's scope, or to treat generated guidance as a substitute for human review.

Generates a tailored AGENTS.md + `.agents/rules/*.md` for the target project — not a template with placeholders, but a living document that matches the project's real toolchain.

## What you get

From a project that uses **Bun + Next.js 16 + Tailwind + Vitest + Server Actions**, the skill produces:

```
AGENTS.md
├── Setup commands: bun install, bun dev, bun run test:run, bun doctor
├── Verification Cycle: bunx tsc --noEmit → bun run lint → bun run test:run → bun doctor
├── Conventions: "Bun always. Plain TypeScript types + guards."
└── Architecture → .agents/rules/architecture.md

.agents/rules/
├── architecture.md       ← ASCII diagram with real directories, exact versions
├── frontend-patterns.md  ← Component rules, state locations, trust boundaries
├── server-actions.md     ← downloadVideo() flow, DownloadResult type, rate limiter
├── testing.md            ← "74 tests in 5 files", vitest commands, mock patterns
├── git-workflow.md       ← Conventional commits, pre-commit checks
└── sdd-workflow.md       ← Preflight defaults, post-apply verification
```

Rules NOT generated: `backend.md` (no NestJS), `database.md` (no ORM), `i18n.md` (hardcoded Spanish), `forms.md` (manual inputs), `styling.md` (Tailwind in frontend rules).

## Activation Contract

Generate AGENTS.md + `.agents/rules/*.md` for the target project. Never guess — read the project's actual files first.

### Mode selection

| User says | Mode | Output |
|-----------|------|--------|
| "simple AGENTS.md", "just the basics", "minimal" | **Minimal** | Single `AGENTS.md` (~30 lines, no rule files) |
| "full AGENTS.md", "with rules", "complete", or default | **Full** | `AGENTS.md` + `.agents/rules/*.md` |
| "update AGENTS.md", "refresh", "my stack changed" | **Update** | Diff existing, regenerate only what changed |

### Dry-run mode

If the user asks to "preview", "show what would change", "dry-run": run all detection but do NOT write files. Show detection summary, files that would be created, skipped rules, and sample output.

## Hard Rules

- **Read before writing, but never read secrets.** Read `package.json`, non-secret config files, and directory structure before generating anything. Never open `.env`, `.env.local`, credential stores, or similarly secret-bearing files. Derive environment variable names only from `.env.example` placeholders and source references such as `process.env.NAME`, without reading or reporting values.
- **Detect package manager FIRST.** Check lockfiles: `bun.lock`→bun, `pnpm-lock.yaml`→pnpm, `package-lock.json`→npm, `yarn.lock`→yarn. NEVER default to npm. Every command uses the detected PM.
- **Generate only what applies.** No backend rules for frontend-only. No database rules without ORM.
- **Do not execute project scripts by default.** Package-manager scripts are repository-controlled shell entry points. Detect and document candidate format/lint commands, but do not run them unless the user separately requests execution after the exact script body and invoked tooling have been reviewed.
- **Validate commands.** Every command in output must exist as a script key in `package.json`.
- **No placeholders.** Scan output for `{{`, `TODO`, `add here`, `...`. Reject if any remain.
- **Backup first.** If files exist, copy to `.agents/backups/` with timestamp.

## Execution Steps

### Common

1. `git rev-parse --show-toplevel` → project root.
2. **Detect package manager FIRST**: check lockfiles. `bun.lock`→bun, `pnpm-lock.yaml`→pnpm, `package-lock.json`→npm, `yarn.lock`→yarn. Never default to npm.
3. Read `package.json` (scripts, deps, workspaces). Save scripts for validation.
4. Read non-secret config files and explore directory structure. Exclude `.env*` files other than placeholder-only `.env.example`; never read secret values.
5. Select mode (ask if ambiguous).

### Full mode

1. Read `assets/agents-full.md` — this is the AGENTS.md structure with all sections and filling rules.
2. Read project files and fill every placeholder with real data. Never use generic text.
3. Generate `AGENTS.md` at project root. Wrap content in `<!-- AGENTS-GENERATED-START -->` / `<!-- AGENTS-GENERATED-END -->`.
4. For each applicable rule category, read the corresponding template from `assets/` and generate the rule file in `.agents/rules/`.
5. If Claude detected (`.claude/` or `CLAUDE.md`): generate thin `CLAUDE.md` from `assets/claude.md`.
6. If platform files detected: generate from `assets/platform.md`.

### Minimal mode

1. Read `assets/agents-minimal.md` — 30-line agents.md standard format.
2. Generate single `AGENTS.md`.

### Update mode

1. Backup existing files.
2. Re-detect project state.
3. Diff old vs new. Regenerate only changed categories.

### Post-generation

- Report the detected `[format cmd]` and `[lint cmd]` as unexecuted candidates. Run neither automatically; execute one only after the user separately authorizes it and its exact project-controlled script body has been reviewed.
- Scan for `{{`, `TODO`, `...`. Fix any found.
- Verify all commands exist in package.json scripts.
- If AGENTS.md > 300 lines, warn. If > 500, move content to rule files.
- Summarize all changes using conventional commit format before declaring done.
- Report: what was detected, generated, skipped, and confidence score.

## Output Contract

Return:
- Mode used and why
- Files created/modified
- Detection summary (all categories)
- Rules generated and skipped (with reason)
- Confidence score

## Limitations

- Generated instructions are proposals and require human review before they are adopted or committed.
- Command validation is limited to scripts and files visible in the target project; it cannot prove that tools, services, or platform-specific commands will work in every environment.
- Project-provided package scripts are untrusted executable code. Generation and documentation of a script do not authorize running it.
- The skill does not authorize writes outside the intended project scope or replace project-specific security, build, or deployment review.

## References

| Priority | File | Purpose |
|----------|------|---------|
| **Required** | `assets/agents-full.md` | Full AGENTS.md template with all 25+ sections and filling rules |
| **Required** | `assets/agents-minimal.md` | 30-line agents.md standard template |
| Full mode | `assets/architecture.md` | Architecture rules template |
| Full mode | `assets/frontend-patterns.md` | Frontend patterns template |
| Full mode | `assets/server-actions.md` | Server actions / backend template |
| Full mode | `assets/testing.md` | Testing strategy template |
| Full mode | `assets/git-workflow.md` | Git workflow template |
| Full mode | `assets/sdd-workflow.md` | SDD workflow template |
| Full mode | `assets/styling.md` | Styling rules template |
| Full mode | `assets/forms.md` | Form patterns template |
| Full mode | `assets/database.md` | Database rules template |
| Full mode | `assets/i18n.md` | i18n rules template |
| Full mode | `assets/backend.md` | Backend/NestJS template |
| Conditional | `assets/claude.md` | CLAUDE.md — only if Claude detected |
| Conditional | `assets/platform.md` | Multi-platform files |
| Conditional | `assets/agents-nested.md` | Monorepo nested AGENTS.md |
| Reference | `references/decision-matrix.md` | Full detection logic and edge cases |
| Reference | `references/example-output/README.md` | Quality benchmark |
| Reference | `references/template-filling-guide.md` | Placeholder filling rules |
