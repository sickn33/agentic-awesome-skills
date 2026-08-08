# AGENTS.md — Nested Template (monorepo sub-package)

Generate for each sub-package in a monorepo. Lightweight, package-specific. No YAML frontmatter. Format follows the agents.md standard.

Fill `{{PLACEHOLDER}}` markers from the sub-package's package.json and config files.

```markdown
# {{PACKAGE_NAME}}

{{PACKAGE_DESCRIPTION}}

## Setup commands

- Install: `cd {{PACKAGE_RELATIVE_PATH}} && {{PM}} install`
- Build: `{{BUILD_COMMAND}}`
- Dev: `{{DEV_COMMAND}}`

{{TEST_SECTION}}

## Code style

{{CODE_STYLE}}
```

## Filling rules

### `{{PACKAGE_NAME}}`

From `package.json` `name` field, or directory name if not found.

### `{{PACKAGE_DESCRIPTION}}`

One sentence from `package.json` `description`, or inferred from the package's purpose (shared types, API server, frontend app, etc.).

### `{{PACKAGE_RELATIVE_PATH}}`

Path relative to repo root, e.g. `packages/db` or `apps/dashboard`.

### `{{PM}}`

The root package manager: `pnpm`, `bun`, `npm`, `yarn`.

### `{{BUILD_COMMAND}}`

- Monorepo with turborepo: `npx turbo run build --filter={{PACKAGE_NAME}}`
- Monorepo with pnpm: `pnpm --filter {{PACKAGE_NAME}} build`
- If no build script in sub-package: omit or say "`cd {{PACKAGE_RELATIVE_PATH}} && {{PM}} run build`"

### `{{DEV_COMMAND}}`

- Same pattern as build. If sub-package has no dev script, omit.

### `{{TEST_SECTION}}`

```
## Testing instructions
- Run tests: `{{TEST_COMMAND}}`
- Add or update tests for the code you change
```

Only include if the sub-package has a test script or test config.

### `{{CODE_STYLE}}`

- 2-3 sub-package-specific conventions
- If sub-package is a shared package: mention exports map, entrypoints, rebuild dependencies
- If sub-package is an app: mention port, router type, framework

## Omission rules

- Skip the whole nested file if the sub-package has no `package.json`
- Keep under 20 lines
- No architecture descriptions, no ASCII diagrams, no tables
