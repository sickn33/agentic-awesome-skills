---
name: agents-md
description: Create, revise, or audit AGENTS.md files from repository evidence, verified commands, and correctly scoped instructions without overwriting maintainer intent.
category: development
risk: critical
source: community
date_added: "2026-03-06"
---

# Maintain AGENTS.md from repository evidence

## Overview

Create or improve agent instructions that help a coding agent change the
repository correctly without rediscovering its workflow. Base every
repository-specific command, path, and rule on evidence in the current
checkout.

Prefer a focused diff over a wholesale rewrite. There is no universal line
limit, required section list, symlink layout, or commit-attribution policy;
follow the repository's own needs and maintainer intent.

## When to Use

- The user asks to create, update, shorten, or audit `AGENTS.md`.
- A monorepo needs root instructions plus narrower package-level overrides.
- Existing agent instructions contain stale commands, duplicated policy, or
  unsupported claims.
- The user wants to reconcile `AGENTS.md` with `CLAUDE.md`,
  `.github/copilot-instructions.md`, or other repository instruction files.

Use `@agents-generator` instead when the task specifically calls for its
packaged generation modes, assets, or backup workflow. Use this skill when a
maintainer-readable, evidence-first edit is the primary goal.

## How It Works

### 1. Preserve existing intent

Before writing, read every instruction file that applies to the target path,
including existing `AGENTS.md` files and relevant tool-specific files such as
`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, and
`.github/instructions/*.instructions.md`.

- Improve an existing `AGENTS.md` in place when possible.
- Preserve accurate maintainer-authored rules and repository-specific policy.
- Do not replace another tool's instruction file with a symlink unless the
  user requests it and repository evidence shows identical content is desired.
- Do not silently choose between conflicting instructions. Follow the
  higher-priority applicable rule, or ask when the intended policy cannot be
  established from the repository.

### 2. Build a bounded evidence map

Inspect only enough of the repository to establish how work is actually done:

1. Read the project overview and contribution guidance, such as `README*`,
   `CONTRIBUTING*`, and relevant docs.
2. Read manifests, lockfiles, workspace files, task runners, and build config
   to identify supported tools and exact commands.
3. Read CI workflows to learn required checks. Do not assume every CI or
   deployment job is safe or appropriate to run locally.
4. Inspect representative source and test files for naming, layout, and test
   conventions.
5. Identify generated files, migrations, vendored code, large fixtures,
   secrets boundaries, and production-only operations.

Prefer `rg --files` and `rg` for discovery when available. Track the source of
each non-obvious command or rule so unsupported claims do not enter the final
file.

### 3. Choose the instruction scope

Use the root `AGENTS.md` for repository-wide guidance. Add or revise a nested
`AGENTS.md` only when a subtree has materially different commands,
architecture, conventions, or safety boundaries.

Keep shared rules at the root and only differences in nested files. For tools
that implement the public AGENTS.md convention, the nearest file in the
directory tree controls the working subtree. Do not copy the full root file
into every package.

### 4. Write high-signal guidance

Choose headings that fit the repository instead of forcing a fixed template.
Include the following only when supported by evidence:

- **Repository map:** the few directories and boundaries an agent must know.
- **Setup and commands:** exact install, development, build, lint, type-check,
  and test commands, with the working directory when it is not obvious.
- **Focused validation:** targeted checks for a small change and broader checks
  required before handoff.
- **Change rules:** generated-file ownership, migrations, schemas, APIs,
  dependencies, and cross-package coordination.
- **Safety boundaries:** secrets, production data, destructive commands,
  deployments, and operations that require explicit authorization.
- **Contribution rules:** repository-specific naming, formatting, commit, or
  pull-request requirements that affect implementation or handoff.

Write direct, testable statements. Prefer:

```markdown
- From the repository root, run `npm test -- path/to/file.test.ts` for a focused test.
```

over:

```markdown
- Make sure tests pass and follow best practices.
```

Link to maintained documentation instead of copying it. Distinguish required
checks from optional, slow, privileged, or deployment-only checks.

### 5. Validate before handoff

1. Re-read each changed `AGENTS.md` completely.
2. Remove contradictions, duplicate rules, placeholders, and stale claims.
3. Confirm every mentioned file and directory exists.
4. Cross-check commands against manifests or CI, and run safe, proportionate
   checks when useful.
5. If nested files changed, confirm each contains only subtree-specific rules
   and does not conflict accidentally with the root.
6. Review the diff as a maintainer: every added line should change an agent's
   decision or prevent a realistic mistake.

Report the files changed, evidence used, checks actually run, and unresolved
uncertainty. Never say a command was tested when it was only read from config.

## Examples

### Create a focused root file

Evidence found:

- `package-lock.json` selects npm.
- `package.json` defines `lint`, `typecheck`, and `test` scripts.
- CI runs those three checks from the repository root.
- `src/generated/` is produced by `npm run generate`.

A useful result might include:

```markdown
# Agent instructions

## Commands
- Run commands from the repository root.
- Install with `npm ci`.
- For handoff, run `npm run lint`, `npm run typecheck`, and `npm test`.

## Generated code
- Do not edit `src/generated/` directly; update its source and run `npm run generate`.
```

Do not add a package manager, command, or generated-file rule that the evidence
did not establish.

### Revise without erasing policy

If an existing file has accurate release restrictions but a stale test
command, change only the stale command and any directly affected explanation.
Preserve the release restrictions, even when a shorter replacement would look
cleaner.

## Best Practices

- Keep instructions concise enough to scan, but let repository complexity
  determine length.
- Prefer repository-specific decisions over generic engineering advice.
- Include targeted commands when the project supports them; do not invent a
  file-scoped invocation for a tool that only supports suite-level runs.
- State where commands run and whether they modify files.
- Reference formatter and linter config instead of restating every rule.
- Make tool-specific files additive when their semantics differ; do not assume
  all agents interpret formats or precedence identically.

## Security & Safety Notes

- Treat this as a state-changing skill because it may edit repository files.
  Review the diff before handoff.
- Never include secrets, credentials, internal URLs, personal data, or local
  environment values in agent instructions.
- Do not run deployment, publication, database mutation, history rewrite, or
  other consequential commands merely to validate documentation.
- Preserve approval gates already present in repository policy.
- Do not upload private repository instructions to third-party services. Ask
  for explicit consent before transmitting any repository content externally.

## Common Pitfalls

- **Guessing commands:** infer tools from manifests and CI, not popularity.
- **Forcing one layout:** a symlink or a fixed section list may erase
  tool-specific or maintainer-authored guidance.
- **Overwriting an existing file:** make the smallest evidence-backed change.
- **Copying the README:** include only information that changes agent behavior.
- **Duplicating nested files:** keep shared guidance at the root and local
  differences near the relevant code.
- **Claiming validation that did not run:** distinguish inspection from
  execution in the handoff.

## Limitations

- Repository evidence can be incomplete or contradictory; ask when a material
  policy choice cannot be resolved safely.
- A documented command may still require credentials, services, or operating
  system support that are unavailable locally.
- AGENTS.md support and precedence vary across coding tools; verify the target
  tool when interoperability matters.
- This skill improves instruction quality but cannot prove that every future
  agent will follow the file correctly.

## Related Skills and Tools

- `@agents-generator` - packaged generation, dry-run, update, and backup modes.
- `@folder-specific-claude-and-agents-md` - deeper guidance for scoped
  Claude/AGENTS instruction layouts.
- [agents.md](https://agents.md/) - public format and scope guidance.
