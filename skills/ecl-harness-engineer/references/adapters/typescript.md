---
adapter:
  language: typescript
  display_name: "TypeScript / JavaScript"
  version: "1.0"

  detection:
    files: [package.json, tsconfig.json]
    content_patterns:
      - file: "package.json"
        pattern: '"(typescript|@types/node)"'
    confidence: 0.90

  commands:
    build: "{pkg_manager} run build"
    test: "{pkg_manager} test"
    lint: "{pkg_manager} run lint"
    lint_arch: "{pkg_manager} run lint:arch"
    format: "{pkg_manager} run format"
    start: "{pkg_manager} start"
    dev: "{pkg_manager} run dev"

  package_manager:
    detection:
      - lockfile: "pnpm-lock.yaml"
        manager: "pnpm"
      - lockfile: "yarn.lock"
        manager: "yarn"
      - lockfile: "bun.lockb"
        manager: "bun"
      - lockfile: "package-lock.json"
        manager: "npm"
    default: "npm"
    install_command: "{manager} install"

  route_detection:
    server_indicators:
      - pattern: 'require\(["\x27]express["\x27]\)|from ["\x27]express["\x27]'
        description: "Express.js web framework"
        frameworks: ["express"]
      - pattern: 'require\(["\x27]fastify["\x27]\)|from ["\x27]fastify["\x27]'
        description: "Fastify web framework"
        frameworks: ["fastify"]
      - pattern: 'from ["\x27]@nestjs/common["\x27]'
        description: "NestJS framework"
        frameworks: ["nestjs"]
      - pattern: 'require\(["\x27]koa["\x27]\)|from ["\x27]koa["\x27]'
        description: "Koa web framework"
        frameworks: ["koa"]
      - pattern: 'require\(["\x27]hono["\x27]\)|from ["\x27]hono["\x27]'
        description: "Hono web framework"
        frameworks: ["hono"]
      - pattern: 'createServer|http\.Server'
        description: "Node.js HTTP server"
        frameworks: ["http"]

    cli_indicators:
      - pattern: 'require\(["\x27]commander["\x27]\)|from ["\x27]commander["\x27]'
        description: "Commander.js CLI framework"
        frameworks: ["commander"]
      - pattern: 'require\(["\x27]yargs["\x27]\)|from ["\x27]yargs["\x27]'
        description: "Yargs CLI framework"
        frameworks: ["yargs"]
      - pattern: 'require\(["\x27]@oclif/core["\x27]\)|from ["\x27]@oclif'
        description: "Oclif CLI framework"
        frameworks: ["oclif"]
      - pattern: 'require\(["\x27]inquirer["\x27]\)|from ["\x27]inquirer["\x27]'
        description: "Inquirer.js interactive CLI"
        frameworks: ["inquirer"]

    frontend_indicators:
      - pattern: 'from ["\x27]react["\x27]|require\(["\x27]react["\x27]\)'
        description: "React"
        frameworks: ["react"]
      - pattern: 'from ["\x27]vue["\x27]|createApp'
        description: "Vue.js"
        frameworks: ["vue"]
      - pattern: 'from ["\x27]svelte["\x27]'
        description: "Svelte"
        frameworks: ["svelte"]
      - pattern: 'from ["\x27]next["\x27]|from ["\x27]next/'
        description: "Next.js"
        frameworks: ["next"]
      - pattern: 'defineNuxtConfig|from ["\x27]nuxt["\x27]'
        description: "Nuxt"
        frameworks: ["nuxt"]

    patterns:
      # Express / Koa style
      - type: route
        regex: '(app|router)\.(get|post|put|delete|patch|all)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [_, method, path]
        frameworks: ["express", "koa", "hono"]
      # Fastify
      - type: route
        regex: '(fastify|server|app)\.(get|post|put|delete|patch)\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [_, method, path]
        frameworks: ["fastify"]
      # NestJS decorators
      - type: route
        regex: '@(Get|Post|Put|Delete|Patch)\s*\(\s*["\x27]([^"\x27]*)["\x27]?\s*\)'
        groups: [method, path]
        frameworks: ["nestjs"]
      # Next.js app router (file-based)
      - type: route
        regex: 'export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)'
        groups: [method]
        frameworks: ["next"]
      # Commander CLI
      - type: command
        regex: '\.command\s*\(\s*["\x27]([^"\x27]+)["\x27]'
        groups: [command_name]
        frameworks: ["commander"]
      # Yargs
      - type: command
        regex: '\.command\s*\(\s*["\x27]([^"\x27\s]+)'
        groups: [command_name]
        frameworks: ["yargs"]

  import_analysis:
    list_packages: null  # TS doesn't have a native package lister
    import_pattern: "from ['\"]([^'\"]+)['\"]|require\\(['\"]([^'\"]+)['\"]\\)"
    source_extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]
    module_root_file: "package.json"

  layer_conventions:
    patterns:
      - layer: 0
        paths: ["src/types", "src/models", "types", "shared/types"]
        description: "Type definitions, interfaces, schemas"
      - layer: 1
        paths: ["src/utils", "src/lib", "src/helpers", "utils", "lib"]
        description: "Utility functions, depend only on types"
      - layer: 2
        paths: ["src/services", "src/core", "services", "core"]
        description: "Business logic layer"
      - layer: 3
        paths: ["src/controllers", "src/handlers", "src/routes", "src/api"]
        description: "HTTP/API handlers"
      - layer: 4
        paths: ["src/app", "src/pages", "src/index.ts", "src/main.ts"]
        description: "Application entry points"

  dependency_detection:
    manifest_file: "package.json"
    databases:
      - pattern: '"(pg|postgres|@prisma/client|typeorm|knex|drizzle-orm|sequelize)"'
        type: "postgres"
        default_port: 5432
      - pattern: '"(mysql2|mysql)"'
        type: "mysql"
        default_port: 3306
      - pattern: '"(mongodb|mongoose|mongosh)"'
        type: "mongodb"
        default_port: 27017
      - pattern: '"(redis|ioredis|@redis/client)"'
        type: "redis"
        default_port: 6379
      - pattern: '"(better-sqlite3|sql.js)"'
        type: "sqlite"
        default_port: 0
    services:
      - pattern: '"(kafkajs|@kafka-js/confluent-schema-registry)"'
        type: "kafka"
        default_port: 9092
      - pattern: '"(amqplib|amqp-connection-manager)"'
        type: "rabbitmq"
        default_port: 5672
      - pattern: '"(@elastic/elasticsearch)"'
        type: "elasticsearch"
        default_port: 9200
    env_var_patterns:
      - pattern: 'process\.env\.([A-Z_][A-Z0-9_]*)'
      - pattern: 'process\.env\[[\x27"]([A-Z_][A-Z0-9_]*)[\x27"]\]'

  linter:
    template_section: "typescript-linter"
    script_extension: ".ts"
    run_command: "npx ts-node scripts/lint-deps.ts"

  naming:
    file_pattern: "^[a-zA-Z][a-zA-Z0-9.-]*\\.(ts|tsx|js|jsx|mjs|cjs)$"
    test_pattern: "^[a-zA-Z][a-zA-Z0-9.-]*\\.(test|spec)\\.(ts|tsx|js|jsx)$"
    directory_style: "kebab-case"

  ci:
    github_actions:
      image: "node:20"
      setup_steps:
        - "uses: actions/setup-node@v4\n  with:\n    node-version: '20'"
      cache_paths: ["node_modules", ".next/cache"]
---

# TypeScript / JavaScript Adapter

## Package Manager Detection

TypeScript projects have multiple package managers. Detection priority:

| Lock File | Manager | Run Command |
|-----------|---------|-------------|
| `pnpm-lock.yaml` | pnpm | `pnpm run <script>` |
| `yarn.lock` | yarn | `yarn <script>` |
| `bun.lockb` | bun | `bun run <script>` |
| `package-lock.json` | npm | `npm run <script>` |

All `{pkg_manager}` placeholders in commands are resolved at detection time.

## Server Start Command Inference

1. Existing `harness/config/environment.json` startup command, if present
2. `package.json` → `scripts.start` exists → `{pkg_manager} start`
3. `package.json` → `scripts.dev` exists → `{pkg_manager} run dev`
4. `dist/index.js` exists → `node dist/index.js`
5. `src/index.ts` exists → `npx ts-node src/index.ts`

## Port Detection

1. Existing `harness/config/environment.json` readiness port, if present
2. `package.json` scripts containing `PORT=(\d+)` → use that port
3. `.env` containing `PORT=(\d+)` → use that port
4. Default: 3000 (frontend), 8080 (server)

## Framework-Specific Notes

### Next.js / Nuxt
- File-based routing: routes are derived from `app/` or `pages/` directory structure
- API routes: `app/api/**/route.ts` (Next.js App Router)
- Use `next build && next start` for production verification

### NestJS
- Decorator-based routing: `@Get()`, `@Post()`, `@Controller('prefix')`
- Module system: scan `*.module.ts` for service registration
- Default port: 3000

### Express / Fastify
- Explicit routing: `app.get('/path', handler)`
- Middleware chain matters for verification order

## Monorepo Support

If `workspaces` in `package.json` or `pnpm-workspace.yaml` exists:
- Run detection per-workspace
- Each workspace may have its own adapter overlay
- Build order respects workspace dependency graph
