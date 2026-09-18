# Decision Matrix — Project Detection and Rule Selection

## Detection Order

Run detections in this order. Each step reads files and sets flags used by later steps.

### 1. Package manager

Check for lockfile: `bun.lock` → bun, `pnpm-lock.yaml` → pnpm, `package-lock.json` → npm, `yarn.lock` → yarn.

### 2. Project type

`workspaces` in root `package.json` → monorepo. Otherwise → single app.

### 3. Framework

| Dep found                | Framework | Router detection                                                                                                                    |
| ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `next`                   | Next.js   | `app/` has `page.tsx` or `layout.tsx` → App Router; `pages/` has `.tsx` → Pages Router; both → hybrid (treat as App Router primary) |
| `@nestjs/core`           | NestJS    | N/A                                                                                                                                 |
| `vite`                   | Vite      | Check `react` for React, `vue` for Vue, `svelte` for Svelte                                                                         |
| `@angular/core`          | Angular   | N/A                                                                                                                                 |
| `express`                | Express   | N/A                                                                                                                                 |
| `fastify`                | Fastify   | N/A                                                                                                                                 |
| `remix` / `@remix-run/*` | Remix     | N/A                                                                                                                                 |
| `astro`                  | Astro     | N/A                                                                                                                                 |

### 4. Monorepo tool (if monorepo)

| File found                 | Tool                              |
| -------------------------- | --------------------------------- |
| `turbo.json`               | Turborepo                         |
| `nx.json`                  | Nx                                |
| `lerna.json`               | Lerna                             |
| `pnpm-workspace.yaml` only | pnpm workspaces (no orchestrator) |

### 5. Language

`tsconfig.json` exists → TypeScript. Check `compilerOptions.strict: true` → strict mode.

### 6. CSS approach

| Signal                                      | Approach                     |
| ------------------------------------------- | ---------------------------- |
| `tailwindcss` in deps                       | Tailwind CSS                 |
| `components.json` exists                    | shadcn/ui (implies Tailwind) |
| `styled-components` in deps                 | styled-components            |
| `@emotion/*` in deps                        | Emotion                      |
| `.module.css` or `.module.scss` files found | CSS Modules                  |
| `sass` or `node-sass` in deps               | Sass/SCSS                    |
| None of the above                           | Plain CSS / CSS imports      |

### 7. Testing

| Dep found                          | Runner     | Extra                                                  |
| ---------------------------------- | ---------- | ------------------------------------------------------ |
| `vitest`                           | Vitest     | Check `vitest.config.*` for env (node/jsdom/happy-dom) |
| `jest`                             | Jest       | Check `jest.config.*` for env                          |
| `playwright` or `@playwright/test` | Playwright | E2E tests present                                      |
| `cypress`                          | Cypress    | E2E tests present                                      |
| None                               | —          | Skip testing rules                                     |

### 8. Validation

| Dep found         | Library                                           |
| ----------------- | ------------------------------------------------- |
| `zod`             | Zod                                               |
| `yup`             | Yup                                               |
| `class-validator` | class-validator                                   |
| `valibot`         | Valibot                                           |
| None              | Plain TypeScript (type guards, manual validation) |

### 9. ORM / Database

| Dep found     | ORM              | Detect provider                                                    |
| ------------- | ---------------- | ------------------------------------------------------------------ |
| `prisma`      | Prisma           | Read `prisma/schema.prisma` → `datasource db { provider = "..." }` |
| `drizzle-orm` | Drizzle          | Check `drizzle.config.*` for `dialect`                             |
| `knex`        | Knex             | Check `knexfile.*` for client                                      |
| `typeorm`     | TypeORM          | Check config for `type`                                            |
| `mongoose`    | MongoDB/Mongoose | N/A                                                                |

Provider affects ID type conventions (UUID for PostgreSQL, autoincrement for SQLite/MySQL, ObjectId for MongoDB).

### 10. State management

| Dep found               | Library                    |
| ----------------------- | -------------------------- |
| `zustand`               | Zustand                    |
| `@reduxjs/toolkit`      | Redux Toolkit              |
| `jotai`                 | Jotai                      |
| `valtio`                | Valtio                     |
| `recoil`                | Recoil                     |
| `mobx`                  | MobX                       |
| `xstate`                | XState                     |
| `@tanstack/react-query` | React Query (server state) |
| `swr`                   | SWR (server state)         |
| None                    | useState / useReducer only |

Server-state libraries (React Query, SWR) need different rules than client-state (Zustand, Redux).

### 11. API client pattern

| Signal                                     | Pattern               |
| ------------------------------------------ | --------------------- |
| `@trpc/*` in deps                          | tRPC                  |
| `graphql` + `@apollo/client`               | GraphQL (Apollo)      |
| `graphql` + `relay-runtime`                | GraphQL (Relay)       |
| `@tanstack/react-query` + `fetch`          | REST with React Query |
| `swr` + `fetch`                            | REST with SWR         |
| `axios` in deps                            | REST with Axios       |
| Server action files (`"use server"`) found | Server Actions        |
| `app/api/` with `route.ts` files           | Next.js API Routes    |
| `src/` with NestJS controllers             | NestJS REST           |
| None of the above                          | fetch() directly      |

### 12. Form library

| Dep found              | Library                                 |
| ---------------------- | --------------------------------------- |
| `react-hook-form`      | react-hook-form                         |
| `formik`               | Formik                                  |
| `@tanstack/react-form` | TanStack Form                           |
| `@hookform/resolvers`  | react-hook-form + Zod/Yup resolver      |
| None                   | Controlled/uncontrolled inputs manually |

### 13. Auth library

| Dep found                                 | Library               | Extra detection                                       |
| ----------------------------------------- | --------------------- | ----------------------------------------------------- |
| `next-auth`                               | NextAuth v5 (Auth.js) | Check for `auth.ts`, `middleware.ts` route protection |
| `next-auth` v4                            | NextAuth v4           | Check for `[...nextauth].ts`                          |
| `@clerk/nextjs`                           | Clerk                 | Check for `middleware.ts`                             |
| `lucia` / `lucia-auth`                    | Lucia                 | Check for `auth.ts`                                   |
| `@supabase/supabase-js` + `@supabase/ssr` | Supabase Auth         | Check for middleware                                  |
| `firebase` + `firebase/auth`              | Firebase Auth         | Check for `firebase.ts` config                        |
| `@auth0/*`                                | Auth0                 | Check for `auth0.ts`                                  |
| None                                      | No auth or custom     | —                                                     |

### 14. i18n library

| Dep found                   | Library       | Extra detection                                 |
| --------------------------- | ------------- | ----------------------------------------------- |
| `next-intl`                 | next-intl     | Check `i18n.ts`, `messages/`, middleware config |
| `react-i18next` + `i18next` | react-i18next | Check `i18n.ts`, locale JSON files              |
| `next-i18next`              | next-i18next  | Check `next-i18next.config.js`                  |
| `lingui/*`                  | Lingui        | Check `lingui.config.*`                         |
| None                        | No i18n       | Check `lang=` in `<html>` for language hint     |

### 15. Backend pattern

| Signal                          | Pattern            |
| ------------------------------- | ------------------ |
| Files containing `"use server"` | Server Actions     |
| `app/api/` with `route.ts`      | Next.js API Routes |
| NestJS controllers              | NestJS REST        |
| Express/Fastify route files     | REST API           |
| tRPC routers                    | tRPC API           |
| GraphQL resolvers               | GraphQL API        |

### 16. Linting & Quality

| File/Dep found         | Tool                    |
| ---------------------- | ----------------------- |
| `eslint` in deps       | ESLint                  |
| `eslint.config.*`      | ESLint flat config      |
| `.eslintrc.*`          | ESLint legacy config    |
| `prettier` in deps     | Prettier                |
| `.prettierrc*`         | Prettier configured     |
| `react-doctor` in deps | react-doctor            |
| `doctor.config.*`      | react-doctor configured |
| `biome.json`           | Biome                   |
| `.oxlintrc.*`          | oxlint                  |

## Rule File Selection

Map detected flags to rule files to generate:

| Rule File              | Required When                                                               |
| ---------------------- | --------------------------------------------------------------------------- |
| `architecture.md`      | Always                                                                      |
| `frontend-patterns.md` | Has React/Next.js/Vite/Angular/Vue/Svelte frontend                          |
| `backend-patterns.md`  | Has NestJS backend                                                          |
| `server-actions.md`    | Uses server actions OR has API routes OR has NestJS/Express/Fastify backend |
| `styling.md`           | Has Tailwind, CSS Modules, or styled-components (not plain CSS)             |
| `forms.md`             | Has react-hook-form, formik, or TanStack Form                               |
| `database.md`          | Has Prisma, Drizzle, Knex, TypeORM, or Mongoose                             |
| `i18n.md`              | Has next-intl, react-i18next, or similar                                    |
| `testing.md`           | Has test runner (vitest/jest/playwright/cypress) in devDeps                 |
| `git-workflow.md`      | Always                                                                      |
| `sdd-workflow.md`      | Always                                                                      |

## AGENTS.md Section Selection

Sections included in the generated AGENTS.md based on detections:

| Section                        | Include When                                        |
| ------------------------------ | --------------------------------------------------- |
| Monorepo Structure             | `workspaces` in package.json                        |
| Monorepo Tool Commands         | Turborepo/Nx/Lerna detected                         |
| Next.js Router Convention      | Next.js detected → App Router vs Pages Router rules |
| Zod Validation Convention      | `zod` or `yup` or `valibot` in deps                 |
| Plain TS Validation Convention | No validation library, but TypeScript strict        |
| Prisma Convention              | `prisma` in deps                                    |
| Drizzle Convention             | `drizzle-orm` in deps                               |
| Server Actions Convention      | `"use server"` files detected                       |
| tRPC Convention                | tRPC detected                                       |
| GraphQL Convention             | GraphQL detected                                    |
| Tailwind Convention            | `tailwindcss` in deps                               |
| shadcn/ui Convention           | `components.json` exists                            |
| CSS Modules Convention         | `.module.css` files found                           |
| Styled Components Convention   | `styled-components` in deps                         |
| State Management Section       | Zustand/Redux/Jotai/MobX/XState in deps             |
| Server State Section           | React Query/SWR in deps                             |
| Form Library Section           | react-hook-form/formik/TanStack Form in deps        |
| i18n Section                   | i18n library detected                               |
| Auth Section                   | Auth library detected                               |
| react-doctor Convention        | `doctor.config.*` or `react-doctor` in deps         |
| UI Language Convention         | Check `lang=` attribute or i18n config              |

## Command Generation

Generate commands table from `package.json` `scripts`. Map `scripts` keys directly:

```json
{ "scripts": { "dev": "...", "build": "...", "lint": "...", "test": "..." } }
```

Becomes:

| Comando          | Qué hace               |
| ---------------- | ---------------------- |
| `{pm} dev`       | Servidor de desarrollo |
| `{pm} run build` | Build de producción    |
| `{pm} run lint`  | Linting                |
| `{pm} run test`  | Tests (watch)          |

Add extra rows for: `test:run` (single-run), `test:coverage`, `doctor`, `format`, `typecheck`.

Where `{pm}` = `bun` for bun (scripts without `run`), `pnpm` for pnpm, `npm run` for npm, `yarn` for yarn.

### Monorepo command generation

If monorepo with Turborepo: generate `turbo run {cmd}` variants.
If monorepo with pnpm: generate `pnpm --filter {pkg} {cmd}` examples.
If monorepo with Nx: generate `nx {cmd} {pkg}` variants.

### Verification cycle

Assemble from detected tools:

```
{typecheck}   →   {lint}   →   {test}   →   {doctor}
```

- `{typecheck}`: `tsc --noEmit` if TypeScript, `bunx tsc --noEmit` if bun, skip if no TS.
- `{lint}`: `{pm} run lint` or detected lint command.
- `{test}`: `{pm} run test:run` or `{pm} run test` (whichever is single-run).
- `{doctor}`: `{pm} doctor` or `{pm}x react-doctor@latest` if react-doctor detected. Skip if not.

### Monorepo rebuild note

If monorepo with shared packages: add note about rebuilding packages before cycle:

```
Si se modificaron packages compartidos ({shared_pkg_list}), ejecutar su rebuild primero:
  {rebuild_commands}
```

## Framework-Specific Conventions

### Next.js App Router

- Server Components by default. `"use client"` solo cuando se usen hooks.
- Server actions en `lib/actions.ts` o `src/actions/`.
- `error.tsx`, `loading.tsx`, `not-found.tsx` por segmento.
- `generateMetadata()` para SEO.
- `next/image` para imágenes, `next/font` para fuentes.
- Path alias `@/*` → `./*` o `./src/*`.

### Next.js Pages Router

- `getServerSideProps`, `getStaticProps`, `getStaticPaths`.
- `pages/api/` para API routes.
- `pages/_app.tsx`, `pages/_document.tsx`.
- Sin server components. Todo es client o API.

### NestJS

- Módulos como directorios: `src/{feature}/{feature}.module.ts`.
- DTOs con decoradores. Validación con `class-validator` o `ZodValidationPipe`.
- Guards para auth: `@UseGuards(AuthGuard)`.
- `PrismaService` como provider global.

## Edge Cases

| Situation                        | Action                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| No test runner                   | Skip testing.md, skip test from verification cycle                     |
| No lint tool                     | Skip lint from verification cycle                                      |
| No TypeScript                    | Skip `tsc --noEmit`, skip no-any rule, use JSDoc conventions instead   |
| No config files at all           | Minimal defaults, note that project needs setup                        |
| Multiple frameworks              | Pick primary based on root package.json, note secondary                |
| Both App Router and Pages Router | Treat as App Router primary, note Pages Router legacy routes           |
| No package.json scripts          | Generate commands from direct tool invocations (`npx next dev`)        |
| Bun without `bun run` scripts    | Use `bunx` prefix for npx equivalents                                  |
| Monorepo without workspaces      | Treat each `apps/*` or `packages/*` as independent                     |
| CSS: multiple approaches         | Pick primary (Tailwind wins over CSS Modules over plain CSS)           |
| Auth: multiple libraries         | Pick primary, note secondary (e.g., NextAuth for web, Clerk for admin) |
| i18n with Pages Router           | Different routing rules than App Router i18n                           |
| Database with multiple providers | Document each, note which is primary                                   |
