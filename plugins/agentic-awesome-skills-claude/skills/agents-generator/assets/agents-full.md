# AGENTS.md — Template (Full Mode)

Replace `{{PLACEHOLDER}}` markers with detected project values. Remove sections whose condition is not met.

This template produces the **rich** AGENTS.md. For minimal (agents.md standard), use `agents-minimal.md`. For monorepo nested files, use `agents-nested.md`.

```markdown
# AGENTS.md

> Compatible with the [agents.md](https://agents.md) standard (60k+ projects). Specific rules in `.agents/rules/` — {{RULE_CATEGORIES_LIST}}.

## Project Overview

{{PROJECT_OVERVIEW}}

{{DOC_IMPORTS}}

{{WHO_USES_THIS}}

## Setup commands

{{SETUP_COMMANDS_BULLETS}}

{{READ_THIS_FIRST}}

## Source Files

{{SOURCE_FILE_LIST}}

## Where to edit

{{WHERE_TO_EDIT}}

## Essential Commands

| Command | Purpose | When |
| ------- | ------- | ---- |

{{ESSENTIAL_COMMANDS}}

{{ENVIRONMENT_VARIABLES}}

## Verification Cycle

{{VERIFICATION_CYCLE_INTRO}}
```

{{VERIFICATION_CYCLE}}

```

{{E2E_MATRIX}}
{{MONOREPO_REBUILD_NOTE}}

## Before committing

{{BEFORE_COMMIT_CHECKLIST}}

## Pre-validate

{{PRE_VALIDATE}}

## Code Style

{{CODE_STYLE}}

{{IO_CONTRACT}}

## Hard Rules

{{HARD_RULES}}

## Prohibitions

{{PROHIBITIONS}}

## Boundaries

{{BOUNDARIES}}

{{GENERATED_ARTIFACTS_POLICY}}

{{SUBSYSTEM_RULES}}

## Global Conventions

{{GLOBAL_CONVENTIONS}}

{{ARCHITECTURE_DECISIONS}}

{{DOC_UPDATE_CHECKLIST}}

{{INTENT_ROUTING_TABLE}}

{{ERROR_TAXONOMY}}

{{WRITING_STYLE_GUIDE}}

{{GOTCHAS}}

{{SSH_TROUBLESHOOTING}}

## Definition of Done

{{DEFINITION_OF_DONE}}

{{TASK_GUIDES}}

{{CONTRIBUTION_GUARDRAILS}}

{{VERSIONING_POLICY}}

{{RELEASING_SECTION}}

## PR instructions

{{PR_INSTRUCTIONS}}

{{AGENT_DISCLOSURE}}

{{RULE_FILE_LINKS}}

{{CODEGRAPH_SECTION}}
```

## Always-included sections

### `{{PROJECT_OVERVIEW}}`

One sentence. Package.json `description` or inferred.

### `{{SETUP_COMMANDS_BULLETS}}`

3-5 bullets: install, dev, build, test, lint. Format: `- <description>: \`<command>\``.

### `{{SOURCE_FILE_LIST}}`

Flat tree with one-line purpose per file. Then a **feature-to-file table**:

```
## Feature map
| Feature | Files |
|---------|-------|
| CLI entry | `src/cli.ts` |
| Core logic | `src/add.ts` |
```

5-8 rows mapping common operations to exact files. This is more useful to agents than the tree alone.

### `{{WHERE_TO_EDIT}}`

Same as feature map but framed as "What to edit for X": task → files. If Source Files already has both, this can be lighter.

### `{{ESSENTIAL_COMMANDS}}`

Table with 3 columns: Command | Purpose | **When**. Add a "when to run" decision column:

```
| `pnpm test` | Run all tests | Fast iteration |
| `pnpm test:run` | Single-run tests | Before committing |
| `pnpm typecheck` | TypeScript check | Before committing |
```

### `{{VERIFICATION_CYCLE_INTRO}}`

"After every code change. Do not mark a task complete without passing:" or, if E2E matrix exists: "Run the smallest relevant verification first."

### `{{BEFORE_COMMIT_CHECKLIST}}`

3-4 items: verification cycle, format check, lockfile verification.

### `{{CODE_STYLE}}`

2-4 project-specific rules. No generic advice.

### `{{PRE_VALIDATE}}`
Commands to run EXACTLY what the pre-commit hook runs, to avoid slow CI lint-staged failures. Format:
```
- Run `{{PRE_COMMIT_CMD}}` on changed files before committing — this is what CI runs.
```
Detect from: `.githooks/pre-commit`, `lint-staged` config, `.husky/pre-commit`. Read the actual hook to get exact commands.

### `{{HARD_RULES}}`

2-3 numbered, non-negotiable rules. Violating = rejected. Detect from: .env.example → secrets rule; tests/ → test rule; monorepo → contract sync rule.

### `{{PROHIBITIONS}}`

2-3 "**Never** do X" bullets. Bold the word Never. Detect from project context:

- Universal: "**Never** create README or markdown docs unless explicitly asked."
- If TypeScript strict: "**Never** use `any` types or `as any` assertions."
- If release scripts exist: "**Never** bump version numbers in feature PRs."
- If generated build output exists: "**Never** edit generated files by hand."
- If monorepo: "**Never** push directly to main on upstream."

### `{{BOUNDARIES}}`

Two subsections: "Ask first" and "Never". Detect from project: if monorepo → cross-package refactor rule. If ORM → destructive data rule. If build output → generated files rule. Secrets and destructive git are universal.

### `{{AGENT_DISCLOSURE}}`

If CONTRIBUTING.md or PR template exists, add agent attribution rules. Format:

```
- All agent-drafted GitHub content (PR comments, reviews, issues) must include attribution footer.
- Never @mention or tag individuals unless explicitly authorized.
- Drafted-by: footer required on all agent-generated GitHub messages.
```

### `{{GLOBAL_CONVENTIONS}}`

5-8 bullets: package manager, import conventions, naming, language, validation approach.

### `{{DEFINITION_OF_DONE}}`

4-6 numbered checklist items. Include: typecheck/lint/tests, new tests, docs updated, no warnings.

### `{{PR_INSTRUCTIONS}}`

2-3 bullets. Include the **"Goal (pick one per PR)"** scoping pattern if the project has a PR template:

```
- Pick ONE goal per PR. Frame the title to reflect it.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`.
- No AI attribution in commits.
```

## Conditional sections (detect and include)

### `{{WHO_USES_THIS}}`

CLI tool, API, or SDK consumed by AI agents:

```
## Who uses this

This CLI's primary consumers include AI agents (Claude Code, Cursor).
Error messages, output format, and flag design directly affect agent success rates.
Every error message will be parsed by an AI to decide its next action.
```

### `{{READ_THIS_FIRST}}`

If `docs/` or `doc/` has 3+ markdown files. Ordered list of files to read before making changes.

### `{{ENVIRONMENT_VARIABLES}}`

If placeholder-only `.env.example` entries or source references such as `process.env.NAME` are found, produce a table with Variable | Required | Purpose for 3-8 variables. Never open `.env`, `.env.local`, or another secret-bearing environment file, and never copy values into generated instructions or the transcript.

### `{{E2E_MATRIX}}`

If the project has both unit tests and E2E tests:

```
| Change | Unit tests | E2E tests |
|--------|:----------:|:---------:|
| New feature | Required | Required |
| Modify behavior | Required | If behavior changes |
| Bug fix | Required | If regression risk |
| Refactor | Required | Not needed |
```

### `{{IO_CONTRACT}}`

For CLI tools or APIs:

```
## I/O contract
- **stdout** is data — JSON, structured output, machine-readable.
- **stderr** is everything else — progress, warnings, hints.
- Never mix them. Mixing corrupts pipe chains.
```

### `{{GENERATED_ARTIFACTS_POLICY}}`

If the project has build output directories (dist/, build/, .next/):

```
## Generated artifacts

Source-first: edit files in `src/`, `lib/`, `app/`. Generated output in `dist/`
and `build/` is rebuilt — never edit it directly. Stage generated files only
for release PRs or when the build output itself is the change.
```

### `{{SUBSYSTEM_RULES}}`

If monorepo or projects with distinct subdirectories (packages/, apps/, cli/):

```
## Subsystem rules

### `packages/dashboard/`
- Never use native browser dialogs. Use shadcn/ui instead.
- Use kebab-case for file and folder names.
```

One subsection per subdirectory with non-obvious rules. Read existing AGENTS.md in subdirs for clues.

### `{{ARCHITECTURE_DECISIONS}}`

1-3 non-obvious choices with their "why":

```
- **Why structured errors**: AI agents parse stderr fields to decide next actions.
  Never use bare error strings for user-facing failures.
- **Why pnpm**: workspace protocol requires pnpm. npm/yarn won't resolve it.
```

### `{{DOC_UPDATE_CHECKLIST}}`

If the project has multiple documentation surfaces:

```
## Documentation checklist

When adding or changing user-facing features, update ALL:
1. `cli/src/output.rs` — help output
2. `README.md` — options table, examples
3. `docs/` — MDX pages
4. Inline doc comments in source
```

### `{{INTENT_ROUTING_TABLE}}`

If the project has multiple entrypoints, tools, or skills:

```
## Entrypoints by intent

| Intent | Entrypoint |
|--------|-----------|
| Reproduce from README | `ai-research-reproduction` |
| Environment setup | `env-and-assets-bootstrap` |
```

Maps user goals to the correct entrypoint.

### `{{ERROR_TAXONOMY}}`

For CLI/API projects with structured errors:

```
## Error types

| Failure | Constructor |
|---------|------------|
| Invalid flag/arg | `errs.NewValidationError(...).WithParam("--flag")` |
| Network failure | `errs.NewNetworkError(...)` |
| API error | Return as-is — never re-wrap |
```

### `{{WRITING_STYLE_GUIDE}}`

For projects that produce documentation or AI-facing content:

```
## Writing style

- Structure: H2/H3 hierarchy, short paragraphs (2-4 sentences)
- Tone: direct, instructional, second person
- Clarity: active voice, specific over vague, one idea per section
- Budget: challenge each paragraph — does it justify its token cost?
```

### `{{GOTCHAS}}`

If platform-specific issues exist (Windows, NTFS, Docker, sandbox):

```
## Gotchas
- `npx vite build` hangs on NTFS — use `node node_modules/vite/bin/vite.js build`
- Server startup takes 30-60s — don't assume failure immediately
```

### `{{SSH_TROUBLESHOOTING}}`
Only if git remote uses SSH (`git@github.com`):
```
## Git SSH troubleshooting
If Git fails with `sign_and_send_pubkey` or `Permission denied`:
- **Do NOT** switch remotes to HTTPS or retry repeatedly.
- Ask the user to ensure their SSH agent is available and unlocked.
```

### `{{TASK_GUIDES}}`

1-3 step-by-step guides for repeatable operations. 3-4 steps each.

### `{{CONTRIBUTION_GUARDRAILS}}`

If `.github/CONTRIBUTING.md` or PR template exists:

```
## Contribution guardrails

- Issue-first: open an issue before a PR unless you're a maintainer.
- AI agents must disclose AI assistance in PR descriptions.
- Unsolicited PRs from non-maintainers may be closed without review.
```

### `{{VERSIONING_POLICY}}`

If the project has multiple independently-versioned components:

```
## Versioning

| Component | Version file | Bump on |
|-----------|-------------|---------|
| Root | `package.json` | Breaking changes |
| Skills | `skills/*/SKILL.md` | Any change (unbumped = invisible) |
Do not bump versions in feature PRs — versioning is a release step.
```

### `{{RELEASING_SECTION}}`

Numbered steps. Only if publish/release/deploy scripts exist.

### `{{DOC_IMPORTS}}`

If the project has existing documentation (CONTRIBUTING.md, docs/\*.md, style guides): reference them with `@import` instead of duplicating content. Format:

```
> Detailed docs: @CONTRIBUTING.md, @docs/best_practices.md
```

- **@import** for docs the agent should ALWAYS have in context (conventions, patterns, style rules).
- **Plain markdown link** `[Topic](path)` for docs only needed occasionally.
- **Warn about large imports**: if a doc is over ~300 lines (~1500 tokens), flag it: "⚠️ Large file — consider importing only key sections."
- Never duplicate content that already exists in project docs.

### `{{RELEASING_SECTION}}`

Numbered steps. Only if publish/release/deploy scripts exist.

### `{{RULE_FILE_LINKS}}`

One link per generated rule file. Only in full mode.

### `{{CODEGRAPH_SECTION}}`

Only if `.codegraph/` exists.

### `{{CLAUDE_MD_NOTE}}`

If Claude Code is detected (`.claude/` directory or `CLAUDE.md` exists), also generate a thin `CLAUDE.md` at project root using `assets/claude.md`. AGENTS.md is the universal standard — CLAUDE.md only points to it and adds Claude-specific config if any exists.

## Post-generation limits

- **300 line soft cap**: if the generated AGENTS.md exceeds 300 lines, warn and suggest moving content to `.agents/rules/` or existing project docs with `@import`.
- **500 line hard cap**: never exceed. Move content to rule files or reference existing docs.
