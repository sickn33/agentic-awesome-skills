---
name: javascript-typescript-typescript-scaffold
description: "You are a TypeScript project architecture expert specializing in scaffolding production-ready Node.js and frontend applications. Generate complete project structures with modern tooling (pnpm, Vite, N"
risk: unknown
source: community
date_added: "2026-02-27"
---

# TypeScript Project Scaffolding

You are a TypeScript project architecture expert specializing in scaffolding production-ready Node.js and frontend applications. Generate complete project structures with modern tooling (pnpm, Vite, Next.js), type safety, testing setup, and configuration following current best practices.

## Use this skill when

- Working on typescript project scaffolding tasks or workflows
- Needing guidance, best practices, or checklists for typescript project scaffolding

## Do not use this skill when

- The task is unrelated to typescript project scaffolding
- You need a different domain or tool outside this scope

## Context

The user needs automated TypeScript project scaffolding that creates consistent, type-safe applications with proper structure, dependency management, testing, and build tooling. Focus on modern TypeScript patterns and scalable architecture.

## Requirements

$ARGUMENTS

## Instructions

### 1. Analyze Project Type

Determine the project type from user requirements:
- **Next.js**: Full-stack React applications, SSR/SSG, API routes
- **React + Vite**: SPA applications, component libraries
- **Node.js API**: Express/Fastify backends, microservices
- **Library**: Reusable packages, utilities, tools
- **CLI**: Command-line tools, automation scripts

### 2. Initialize Project with pnpm

```bash
# Install pnpm if needed
npm install -g pnpm

# Initialize project
mkdir project-name && cd project-name
pnpm init

# Initialize git
git init
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo ".env" >> .gitignore
```

### 3. Generate Next.js Project Structure

```bash
# Create Next.js project with TypeScript
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
```

```
nextjs-project/
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── api/
│   │   │   └── health/
│   │   │       └── route.ts
│   │   └── (routes)/
│   │       └── dashboard/
│   │           └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   └── Card.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── utils.ts
│   │   └── types.ts
│   └── hooks/
│       ├── useAuth.ts
│       └── useFetch.ts
└── tests/
    ├── setup.ts
    └── components/
        └── Button.test.tsx
```

**package.json**:
```json
{
  "name": "nextjs-project",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.1.0"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{"name": "next"}]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 4. Generate React + Vite Project Structure

```bash
# Create Vite project
pnpm create vite . --template react-ts
```

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
  },
})
```

### 5. Generate Node.js API Project Structure

```
nodejs-api/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── users.ts
│   │   └── health.ts
│   ├── controllers/
│   │   └── userController.ts
│   ├── services/
│   │   └── userService.ts
│   ├── models/
│   │   └── User.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   └── types/
│       └── express.d.ts
└── tests/
    └── routes/
        └── users.test.ts
```

**package.json for Node.js API**:
```json
{
  "name": "nodejs-api",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0"
  }
}
```

**src/app.ts**:
```typescript
import express, { Express } from 'express'
import { healthRouter } from './routes/health.js'
import { userRouter } from './routes/users.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp(): Express {
  const app = express()

  app.use(express.json())
  app.use('/health', healthRouter)
  app.use('/api/users', userRouter)
  app.use(errorHandler)

  return app
}
```

### 6. Generate TypeScript Library Structure

```
library-name/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── index.ts
│   └── core.ts
├── tests/
│   └── core.test.ts
└── dist/
```

**package.json for Library**:
```json
{
  "name": "@scope/library-name",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest",
    "prepublishOnly": "pnpm build"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

### 7. Configure Development Tools

**.env.example**:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
```

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

**.eslintrc.json**:
```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

## Output Format

1. **Project Structure**: Complete directory tree with all necessary files
2. **Configuration**: package.json, tsconfig.json, build tooling
3. **Entry Point**: Main application file with type-safe setup
4. **Tests**: Test structure with Vitest configuration
5. **Documentation**: README with setup and usage instructions
6. **Development Tools**: .env.example, .gitignore, linting config

Focus on creating production-ready TypeScript projects with modern tooling, strict type safety, and comprehensive testing setup.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
