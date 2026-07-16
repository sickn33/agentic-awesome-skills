---
name: turborepo-caching
description: "Configure Turborepo for efficient monorepo builds with local and remote caching. Use when setting up Turborepo, optimizing build pipelines, or implementing distributed caching."
risk: critical
source: community
date_added: "2026-02-27"
---

# Turborepo Caching

Production patterns for Turborepo build optimization.

## Do not use this skill when

- The task is unrelated to turborepo caching
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Setting up new Turborepo projects
- Configuring build pipelines
- Implementing remote caching
- Optimizing CI/CD performance
- Migrating from other monorepo tools
- Debugging cache misses

## Core Concepts

### 1. Turborepo Architecture

```
Workspace Root/
├── apps/
│   ├── web/
│   │   └── package.json
│   └── docs/
│       └── package.json
├── packages/
│   ├── ui/
│   │   └── package.json
│   └── config/
│       └── package.json
├── turbo.json
└── package.json
```

### 2. Pipeline Concepts

| Concept | Description |
|---------|-------------|
| **dependsOn** | Tasks that must complete first |
| **cache** | Whether to cache outputs |
| **outputs** | Files to cache |
| **inputs** | Files that affect cache key |
| **persistent** | Long-running tasks (dev servers) |

## Templates

### Template 1: turbo.json Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    ".env.local"
  ],
  "globalEnv": [
    "NODE_ENV",
    "VERCEL_URL"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**"
      ],
      "env": [
        "API_URL",
        "NEXT_PUBLIC_*"
      ]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": [
        "src/**/*.tsx",
        "src/**/*.ts",
        "test/**/*.ts"
      ]
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Template 2: Package-Specific Pipeline

```json
// apps/web/turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "extends": ["//"],
  "pipeline": {
    "build": {
      "outputs": [".next/**", "!.next/cache/**"],
      "env": [
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_ANALYTICS_ID"
      ]
    },
    "test": {
      "outputs": ["coverage/**"],
      "inputs": [
        "src/**",
        "tests/**",
        "jest.config.js"
      ]
    }
  }
}
```

### Template 3: Remote Caching with Vercel

```bash
# Login to Vercel
npx turbo login

# Link to Vercel project
npx turbo link

# Run with remote cache
turbo build --remote-only

# CI environment variables
TURBO_TOKEN=your-token
TURBO_TEAM=your-team
```

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npx turbo build --filter='...[origin/main]'

      - name: Test
        run: npx turbo test --filter='...[origin/main]'
```

### Template 4: Self-Hosted Remote Cache

```typescript
// Custom remote cache server (Express)
import express from 'express';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const app = express();
const CACHE_DIR = './cache';

// Get artifact
app.get('/v8/artifacts/:hash', async (req, res) => {
  const { hash } = req.params;
  const team = req.query.teamId || 'default';
  const filePath = join(CACHE_DIR, team, hash);

  try {
    const stream = createReadStream(filePath);
    stream.pipe(res);
  } catch {
    res.status(404).send('Not found');
  }
});

// Put artifact
app.put('/v8/artifacts/:hash', async (req, res) => {
  const { hash } = req.params;
  const team = req.query.teamId || 'default';
  const dir = join(CACHE_DIR, team);
  const filePath = join(dir, hash);

  await mkdir(dir, { recursive: true });

  const stream = createWriteStream(filePath);
  req.pipe(stream);

  stream.on('finish', () => {
    res.json({ urls: [`${req.protocol}://${req.get('host')}/v8/artifacts/${hash}`] });
  });
});

// Check artifact exists
app.head('/v8/artifacts/:hash', async (req, res) => {
  const { hash } = req.params;
  const team = req.query.teamId || 'default';
  const filePath = join(CACHE_DIR, team, hash);

  try {
    await fs.access(filePath);
    res.status(200).end();
  } catch {
    res.status(404).end();
  }
});

app.listen(3000);
```

```json
// turbo.json for self-hosted cache
{
  "remoteCache": {
    "signature": false
  }
}
```

```bash
# Use self-hosted cache
turbo build --api="http://localhost:3000" --token="my-token" --team="my-team"
```

### Template 5: Filtering and Scoping

```bash
# Build specific package
turbo build --filter=@myorg/web

# Build package and its dependencies
turbo build --filter=@myorg/web...

# Build package and its dependents
turbo build --filter=...@myorg/ui

# Build changed packages since main
turbo build --filter='...[origin/main]'

# Build packages in directory
turbo build --filter='./apps/*'

# Combine filters
turbo build --filter=@myorg/web --filter=@myorg/docs

# Exclude package
turbo build --filter='!@myorg/docs'

# Include dependencies of changed
turbo build --filter='...[HEAD^1]...'
```

### Template 6: Advanced Pipeline Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "inputs": [
        "$TURBO_DEFAULT$",
        "!**/*.md",
        "!**/*.test.*"
      ]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": [
        "src/**",
        "tests/**",
        "*.config.*"
      ],
      "env": ["CI", "NODE_ENV"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "outputs": [],
      "cache": false
    },
    "deploy": {
      "dependsOn": ["build", "test", "lint"],
      "outputs": [],
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false,
      "dependsOn": ["db:generate"]
    },
    "@myorg/web#build": {
      "dependsOn": ["^build", "@myorg/db#db:generate"],
      "outputs": [".next/**"],
      "env": ["NEXT_PUBLIC_*"]
    }
  }
}
```

### Template 7: Root package.json Setup

```json
{
  "name": "my-turborepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build --filter=./packages/* && changeset publish"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "prettier": "^3.0.0",
    "@changesets/cli": "^2.26.0"
  },
  "packageManager": "npm@10.0.0"
}
```

## Debugging Cache

```bash
# Dry run to see what would run
turbo build --dry-run

# Verbose output with hashes
turbo build --verbosity=2

# Show task graph
turbo build --graph

# Force no cache
turbo build --force

# Show cache status
turbo build --summarize

# Debug specific task
TURBO_LOG_VERBOSITY=debug turbo build --filter=@myorg/web
```

## Best Practices

### Do's
- **Define explicit inputs** - Avoid cache invalidation
- **Use workspace protocol** - `"@myorg/ui": "workspace:*"`
- **Enable remote caching** - Share across CI and local
- **Filter in CI** - Build only affected packages
- **Cache build outputs** - Not source files

### Don'ts
- **Don't cache dev servers** - Use `persistent: true`
- **Don't include secrets in env** - Use runtime env vars
- **Don't ignore dependsOn** - Causes race conditions
- **Don't over-filter** - May miss dependencies

## Resources

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Caching Guide](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
