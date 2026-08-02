# AGENTS.md — Minimal Template

Generate when the user asks for a simple, single-file AGENTS.md following the agents.md standard format (https://agents.md). No YAML frontmatter, no rule files, no ASCII art. Keep it under 30 lines.

Fill `{{PLACEHOLDER}}` markers from project detection. Only include sections whose content is non-empty.

```markdown
## Setup commands

{{SETUP_COMMANDS}}

## Code style

{{CODE_STYLE}}

## Testing instructions

{{TESTING_INSTRUCTIONS}}

## PR instructions

{{PR_INSTRUCTIONS}}
```

## Filling rules

### `{{SETUP_COMMANDS}}`

- One bullet per command: install deps, start dev, run build, run lint, format
- Use the detected package manager (`pnpm install`, `bun install`, etc.)
- Keep it short — 3-5 bullets max

### `{{CODE_STYLE}}`

- 3-5 project-specific conventions as bullets
- Only verifiable from config: TypeScript strict, no any, single/double quotes, semicolons, import conventions, UI language
- Format: `- TypeScript strict mode` not `- We use TypeScript`

### `{{TESTING_INSTRUCTIONS}}`

- What the agent should run before committing
- The exact test command from package.json
- One line about adding tests: "- Add or update tests for the code you change"
- If coverage: mention the command

### `{{PR_INSTRUCTIONS}}`

- Commit format: conventional commits or project-specific
- What to run before pushing: lint + test + typecheck
- Branch naming if applicable
- Attribution rules: "- No AI attribution in commits"

## Omission rules

- Skip any section whose content would be empty
- Never include architecture descriptions, ASCII diagrams, or stack tables
- Never include rule file references or `.agents/rules/` mentions
- If the project has no test runner, skip `## Testing instructions`
- If the project has no lint setup, omit lint from the PR checklist
- Keep total file under 30 lines
