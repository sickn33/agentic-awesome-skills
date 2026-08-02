# Template Filling Guide

When filling template placeholders in `assets/*.md`, follow these concreteness rules. The output must be as specific as the example in `references/example-output/README.md`.

## Quick Decision Table

Full detection logic is in `decision-matrix.md`. This is the quick-reference table for selecting templates:

| Signal                                | Decision                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `workspaces` in package.json          | Monorepo → generate package dependency rules, shared package rebuild commands                     |
| `turbo.json`, `nx.json`, `lerna.json` | Monorepo tool → adapt commands (`turbo run`, `nx`, `lerna run`)                                   |
| `next` in deps + `app/` vs `pages/`   | Next.js Router type → App Router (server components default) vs Pages Router (getServerSideProps) |
| `@nestjs/core`                        | NestJS backend → module architecture, guards, DTOs                                                |
| `@trpc/*`                             | tRPC → completely different backend rules than REST                                               |
| `react-hook-form`, `formik`           | Form library → generate `forms.md`                                                                |
| `next-intl`, `react-i18next`          | i18n → generate `i18n.md`                                                                         |
| `prisma`, `drizzle-orm`               | ORM → generate `database.md`                                                                      |
| `styled-components`, `.module.css`    | Non-Tailwind CSS → generate `styling.md` with different rules                                     |
| `next-auth`, `@clerk/nextjs`, `lucia` | Auth → route protection rules                                                                     |
| `@tanstack/react-query`, `swr`        | Server state → different state rules than Zustand/Redux                                           |
| `vitest`, `jest`, `playwright`        | Test runner(s) → generate `testing.md` with correct commands                                      |
| No TypeScript                         | JS project → skip `tsc`, different type safety rules                                              |

## Placeholder Filling Rules

### `{{STACK_TABLE}}`

Each row must have **exact version numbers** from `package.json`. Never write "latest" or "X.Y.Z". Format: `| Capa | Tecnología | Versión |`. Include framework, UI, runtime, ORM, validation, testing, linting, analytics, fonts.

### `{{ARCHITECTURE_DIAGRAM}}`

ASCII art using **actual directory names** from the project. Show real connections — which file imports which. No boxes labeled "Component" or "Service". For monorepos, show package dependency arrows. For single apps, show app/ → components/ + lib/ → external services.

### `{{DATA_FLOW}}`

Numbered steps with **real function names**: `detectPlatform()` not "validate input"; `ttdl(url)` not "call API". Show the complete chain: user action → frontend → backend/server action → external library/database → response → UI update. Use ASCII arrows between steps.

### `{{ROUTING_TABLE}}`

**Every route file** found in `app/` or `pages/`. Include: route path, type (server/client/API), file path, and 1-line purpose in the project's UI language. Check for: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `sitemap.ts`, `robots.ts`, API routes, dynamic routes.

### `{{ESSENTIAL_COMMANDS}}`

Only commands whose **script key exists** in `package.json`. Use `{pm} run <key>` or `{pm} <key>` format matching the package manager. If a script is missing, omit that row — don't invent commands. Core rows: dev, build, lint, test, test:run, test:coverage, and quality tool (doctor/lint-staged) if present.

### `{{TEST_COUNT}}`

Count actual `test()` / `it()` calls across all test files. Report `"N tests"` with the real number. If you cannot count accurately, report the number of test files: `"N test files"`.
Also report: test runner + version, environment (node/jsdom), coverage provider and target, strict TDD mode (yes/no).

### `{{COMMIT_EXAMPLES}}`

2-3 examples using **real file names** or feature names from the project's recent git history. Read `git log --oneline -5` if available to get realistic examples. Format: `type: message`, one per line.

### `{{VERIFICATION_CYCLE}}`

Assemble from validated commands: `{typecheck} → {lint} → {test} → {doctor}`. Only include steps whose tool exists. Use the exact command format from package.json.

### `{{GLOBAL_CONVENTIONS}}`

List 5-8 project-specific conventions. Each must be verifiable from config files, not generic advice. Examples:

- ✅ "Bun siempre. No npm ni yarn." (detected from bun.lock)
- ✅ "Sin librería de validación externa — TypeScript types + guards manuales." (no zod in deps)
- ❌ "Usar buenas prácticas de TypeScript." (generic, unverifiable)
- ❌ "Código limpio y documentado." (generic, unverifiable)
