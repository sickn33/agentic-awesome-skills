# Example Output — sssall (Next.js 16 + Bun + Server Actions)

This is the concrete output the skill should produce for a project with this stack. Use it as a quality benchmark: your generated AGENTS.md should be this specific, this actionable, and this free of placeholder text.

## Project Signals Detected

| Signal          | Detected                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Package manager | Bun (`bun.lock`)                                                                                  |
| Framework       | Next.js 16 App Router (`app/page.tsx`, `app/layout.tsx`)                                          |
| Router type     | App Router (server components default)                                                            |
| Language        | TypeScript strict (`tsconfig.json`)                                                               |
| CSS             | Tailwind CSS 4 + shadcn/ui New York                                                               |
| Testing         | Vitest 4.x (5 test files, 74 tests, all in `lib/`)                                                |
| Validation      | Plain TypeScript (type guards: `isDownloadError()`, no Zod)                                       |
| ORM             | None                                                                                              |
| State           | useState / useCallback only (no Zustand/Redux)                                                    |
| Server state    | None (React Query/SWR not present)                                                                |
| API pattern     | Server Actions (`"use server"` in `lib/actions.ts`) + REST fallback (`app/api/download/route.ts`) |
| Forms           | Manual controlled inputs (no react-hook-form)                                                     |
| i18n            | None (hardcoded Spanish UI)                                                                       |
| Auth            | None                                                                                              |
| Backend         | None (server actions + btch-downloader)                                                           |
| Linting         | ESLint 10 + react-doctor 0.9.3                                                                    |
| Monorepo        | No (single app)                                                                                   |

## Files Generated

```
AGENTS.md                              ← 85 lines, all placeholders filled
.agents/rules/
  architecture.md                      ← Stack table, route table, ASCII data flow diagram
  frontend-patterns.md                 ← Component specs, state locations, trust boundaries
  server-actions.md                    ← downloadVideo flow, DownloadResult type, rate limiter
  testing.md                           ← Vitest commands, test file tree, 74 tests counted
  git-workflow.md                      ← Conventional commits, pre-commit cycle
  sdd-workflow.md                      ← Preflight defaults, post-apply verification
```

## Skipped (with reasons)

| Rule file             | Reason                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| `backend-patterns.md` | No NestJS backend                                                          |
| `styling.md`          | Tailwind covered in frontend-patterns; no CSS Modules or styled-components |
| `forms.md`            | No form library (manual controlled inputs only)                            |
| `database.md`         | No ORM                                                                     |
| `i18n.md`             | No i18n library (hardcoded Spanish)                                        |

## Key Quality Checks

Compare your generated AGENTS.md against these criteria:

1. **Commands are exact**: The AGENTS.md says `bun dev`, not `npm run dev` or `pnpm dev`. It reads `package.json` scripts: `"doctor": "npx react-doctor@latest"` → `bun doctor`.
2. **Verification cycle is real**: `bunx tsc --noEmit → bun run lint → bun run test:run → bun doctor`. Every command exists in `package.json`.
3. **Global conventions match the stack**: "Sin librería de validación externa — TypeScript types + guards manuales (`isDownloadError()`)." Not "Zod para validación."
4. **Architecture diagram is specific**: ASCII art shows actual directories (`app/`, `components/`, `lib/downloader/`), not generic placeholders.
5. **Data flow names real functions**: `detectPlatform()` → `downloadVideo()` → `downloadFromUrl()` → `ttdl()/igdl()/fbdown()/twitter()`. Not "validation → API call → database."
6. **Route table is complete**: Every route file listed with its type (client/server) and description in Spanish.
7. **Test count is accurate**: "74 tests" counted from actual test files, not estimated.
8. **No placeholder text anywhere**: Search for `{{`, `TODO`, `add here`, `...` in the output — there should be zero matches.

## Reference Project

The benchmark output comes from a real project with this stack. The actual generated files (relative to project root):

```
AGENTS.md                              ← Main file with commands, conventions, PR instructions
.agents/rules/
  architecture.md                      ← Stack table, routes, ASCII data flow
  frontend-patterns.md                 ← Component specs, state, trust boundaries
  server-actions.md                    ← Entry points, error handling, rate limiting
  testing.md                           ← Test commands, file tree, patterns
  git-workflow.md                      ← Commit conventions, pre-commit cycle
  sdd-workflow.md                      ← Preflight defaults, post-apply verification
```

Use this as a quality benchmark when generating for any project — your output should match this level of specificity regardless of the target stack.
