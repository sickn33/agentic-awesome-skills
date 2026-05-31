---
name: bun-development
description: "Fast, modern JavaScript/TypeScript development with the Bun runtime, inspired by [oven-sh/bun](https://github.com/oven-sh/bun)."
risk: critical
source: community
date_added: "2026-02-27"
---

# ⚡ Bun Development

> Fast, modern JavaScript/TypeScript development with the Bun runtime, inspired by [oven-sh/bun](https://github.com/oven-sh/bun).

## When to Use This Skill

Use this skill when:

- Starting new JS/TS projects with Bun
- Migrating from Node.js to Bun
- Optimizing development speed
- Using Bun's built-in tools (bundler, test runner)
- Troubleshooting Bun-specific issues

---

## 1. Getting Started

### 1.1 Installation

```bash
# macOS / Linux
brew install oven-sh/bun/bun

# Alternative: download the official installer, inspect it, then execute it
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
curl -fsSLo "$tmpdir/bun-install.sh" https://bun.sh/install
sed -n '1,160p' "$tmpdir/bun-install.sh"
bash "$tmpdir/bun-install.sh"

# Windows
powershell -NoProfile -Command "Invoke-WebRequest https://bun.sh/install.ps1 -OutFile $env:TEMP\\bun-install.ps1; Get-Content $env:TEMP\\bun-install.ps1 -TotalCount 120; powershell -ExecutionPolicy Bypass -File $env:TEMP\\bun-install.ps1"

# Homebrew
brew tap oven-sh/bun
brew install bun

# npm (if needed)
npm install -g bun

# Upgrade
bun upgrade
```

### 1.2 Why Bun?

| Feature         | Bun            | Node.js                     |
| :-------------- | :------------- | :-------------------------- |
| Startup time    | ~25ms          | ~100ms+                     |
| Package install | 10-100x faster | Baseline                    |
| TypeScript      | Native         | Requires transpiler         |
| JSX             | Native         | Requires transpiler         |
| Test runner     | Built-in       | External (Jest, Vitest)     |
| Bundler         | Built-in       | External (Webpack, esbuild) |

---

## 2. Project Setup

### 2.1 Create New Project

```bash
# Initialize project
bun init

# Creates:
# ├── package.json
# ├── tsconfig.json
# ├── index.ts
# └── README.md

# With specific template
bun create <template> <project-name>

# Examples
bun create react my-app        # React app
bun create next my-app         # Next.js app
bun create vite my-app         # Vite app
bun create elysia my-api       # Elysia API
```

### 2.2 package.json

```json
{
  "name": "my-bun-project",
  "version": "1.0.0",
  "module": "index.ts",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch index.ts",
    "start": "bun run index.ts",
    "test": "bun test",
    "build": "bun build ./index.ts --outdir ./dist",
    "lint": "bunx eslint ."
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### 2.3 tsconfig.json (Bun-optimized)

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "composite": true,
    "strict": true,
    "downlevelIteration": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true,
    "types": ["bun-types"]
  }
}
```

---

## 3. Package Management

### 3.1 Installing Packages

```bash
# Install from package.json
bun install              # or 'bun i'

# Add dependencies
bun add express          # Regular dependency
bun add -d typescript    # Dev dependency
bun add -D @types/node   # Dev dependency (alias)
bun add --optional pkg   # Optional dependency

# From specific registry
bun add lodash --registry https://registry.npmmirror.com

# Install specific version
bun add react@18.2.0
bun add react@latest
bun add react@next

# From git
bun add github:user/repo
bun add git+https://github.com/user/repo.git
```

### 3.2 Removing & Updating

```bash
# Remove package
bun remove lodash

# Update packages
bun update              # Update all
bun update lodash       # Update specific
bun update --latest     # Update to latest (ignore ranges)

# Check outdated
bun outdated
```

### 3.3 bunx (npx equivalent)

```bash
# Execute package binaries
bunx prettier --write .
bunx tsc --init
bunx create-react-app my-app

# With specific version
bunx -p typescript@4.9 tsc --version

# Run without installing
bunx cowsay "Hello from Bun!"
```

### 3.4 Lockfile

```bash
# bun.lockb is a binary lockfile (faster parsing)
# To generate text lockfile for debugging:
bun install --yarn    # Creates yarn.lock

# Trust existing lockfile
bun install --frozen-lockfile
```

---

## 4. Running Code

### 4.1 Basic Execution

```bash
# Run TypeScript directly (no build step!)
bun run index.ts

# Run JavaScript
bun run index.js

# Run with arguments
bun run server.ts --port 3000

# Run package.json script
bun run dev
bun run build

# Short form (for scripts)
bun dev
bun build
```

### 4.2 Watch Mode

```bash
# Auto-restart on file changes
bun --watch run index.ts

# With hot reloading
bun --hot run server.ts
```

### 4.3 Environment Variables

```typescript
// .env file is loaded automatically!

// Access environment variables
const apiKey = Bun.env.API_KEY;
const port = Bun.env.PORT ?? "3000";

// Or use process.env (Node.js compatible)
const dbUrl = process.env.DATABASE_URL;
```

```bash
# Run with specific env file
bun --env-file=.env.production run index.ts
```

---

## 5. Built-in APIs

### 5.1 File System (Bun.file)

```typescript
// Read file
const file = Bun.file("./data.json");
const text = await file.text();
const json = await file.json();
const buffer = await file.arrayBuffer();

// File info
console.log(file.size); // bytes
console.log(file.type); // MIME type

// Write file
await Bun.write("./output.txt", "Hello, Bun!");
await Bun.write("./data.json", JSON.stringify({ foo: "bar" }));

// Stream large files
const reader = file.stream();
for await (const chunk of reader) {
  console.log(chunk);
}
```

### 5.2 HTTP Server (Bun.serve)

```typescript
const server = Bun.serve({
  port: 3000,

  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Hello World!");
    }

    if (url.pathname === "/api/users") {
      return Response.json([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);
    }

    return new Response("Not Found", { status: 404 });
  },

  error(error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
```

### 5.3 WebSocket Server

```typescript
const server = Bun.serve({
  port: 3000,

  fetch(req, server) {
    // Upgrade to WebSocket
    if (server.upgrade(req)) {
      return; // Upgraded
    }
    return new Response("Upgrade failed", { status: 500 });
  },

  websocket: {
    open(ws) {
      console.log("Client connected");
      ws.send("Welcome!");
    },

    message(ws, message) {
      console.log(`Received: ${message}`);
      ws.send(`Echo: ${message}`);
    },

    close(ws) {
      console.log("Client disconnected");
    },
  },
});
```

### 5.4 SQLite (Bun.sql)

```typescript
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert
const insert = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
insert.run("Alice", "alice@example.com");

// Query
const query = db.prepare("SELECT * FROM users WHERE name = ?");
const user = query.get("Alice");
console.log(user); // { id: 1, name: "Alice", email: "alice@example.com" }

// Query all
const allUsers = db.query("SELECT * FROM users").all();
```

### 5.5 Password Hashing

```typescript
// Hash password
const password = "super-secret";
const hash = await Bun.password.hash(password);

// Verify password
const isValid = await Bun.password.verify(password, hash);
console.log(isValid); // true

// With algorithm options
const bcryptHash = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 12,
});
```

---

## 6. Testing

### 6.1 Basic Tests

```typescript
// math.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

describe("Math operations", () => {
  it("adds two numbers", () => {
    expect(1 + 1).toBe(2);
  });

  it("subtracts two numbers", () => {
    expect(5 - 3).toBe(2);
  });
});
```

### 6.2 Running Tests

```bash
# Run all tests
bun test

# Run specific file
bun test math.test.ts

# Run matching pattern
bun test --grep "adds"

# Watch mode
bun test --watch

# With coverage
bun test --coverage

# Timeout
bun test --timeout 5000
```

### 6.3 Matchers

```typescript
import { expect, test } from "bun:test";

test("matchers", () => {
  // Equality
  expect(1).toBe(1);
  expect({ a: 1 }).toEqual({ a: 1 });
  expect([1, 2]).toContain(1);

  // Comparisons
  expect(10).toBeGreaterThan(5);
  expect(5).toBeLessThanOrEqual(5);

  // Truthiness
  expect(true).toBeTruthy();
  expect(null).toBeNull();
  expect(undefined).toBeUndefined();

  // Strings
  expect("hello").toMatch(/ell/);
  expect("hello").toContain("ell");

  // Arrays
  expect([1, 2, 3]).toHaveLength(3);

  // Exceptions
  expect(() => {
    throw new Error("fail");
  }).toThrow("fail");

  // Async
  await expect(Promise.resolve(1)).resolves.toBe(1);
  await expect(Promise.reject("err")).rejects.toBe("err");
});
```

### 6.4 Mocking

```typescript
import { mock, spyOn } from "bun:test";

// Mock function
const mockFn = mock((x: number) => x * 2);
mockFn(5);
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(5);
expect(mockFn.mock.results[0].value).toBe(10);

// Spy on method
const obj = {
  method: () => "original",
};
const spy = spyOn(obj, "method").mockReturnValue("mocked");
expect(obj.method()).toBe("mocked");
expect(spy).toHaveBeenCalled();
```

---

## 7. Bundling

### 7.1 Basic Build

```bash
# Bundle for production
bun build ./src/index.ts --outdir ./dist

# With options
bun build ./src/index.ts \
  --outdir ./dist \
  --target browser \
  --minify \
  --sourcemap
```

### 7.2 Build API

```typescript
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser", // or "bun", "node"
  minify: true,
  sourcemap: "external",
  splitting: true,
  format: "esm",

  // External packages (not bundled)
  external: ["react", "react-dom"],

  // Define globals
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },

  // Naming
  naming: {
    entry: "[name].[hash].js",
    chunk: "chunks/[name].[hash].js",
    asset: "assets/[name].[hash][ext]",
  },
});

if (!result.success) {
  console.error(result.logs);
}
```

### 7.3 Compile to Executable

```bash
# Create standalone executable
bun build ./src/cli.ts --compile --outfile myapp

# Cross-compile
bun build ./src/cli.ts --compile --target=bun-linux-x64 --outfile myapp-linux
bun build ./src/cli.ts --compile --target=bun-darwin-arm64 --outfile myapp-mac

# With embedded assets
bun build ./src/cli.ts --compile --outfile myapp --embed ./assets
```

---

## 8. Migration from Node.js

### 8.1 Compatibility

```typescript
// Most Node.js APIs work out of the box
import fs from "fs";
import path from "path";
import crypto from "crypto";

// process is global
console.log(process.cwd());
console.log(process.env.HOME);

// Buffer is global
const buf = Buffer.from("hello");

// __dirname and __filename work
console.log(__dirname);
console.log(__filename);
```

### 8.2 Common Migration Steps

```bash
# 1. Install Bun
brew install oven-sh/bun/bun

# 2. Replace package manager
rm -rf node_modules package-lock.json
bun install

# 3. Update scripts in package.json
# "start": "node index.js" → "start": "bun run index.ts"
# "test": "jest" → "test": "bun test"

# 4. Add Bun types
bun add -d @types/bun
```

### 8.3 Differences from Node.js

```typescript
// ❌ Node.js specific (may not work)
require("module")             // Use import instead
require.resolve("pkg")        // Use import.meta.resolve
__non_webpack_require__       // Not supported

// ✅ Bun equivalents
import pkg from "pkg";
const resolved = import.meta.resolve("pkg");
Bun.resolveSync("pkg", process.cwd());

// ❌ These globals differ
process.hrtime()              // Use Bun.nanoseconds()
setImmediate()                // Use queueMicrotask()

// ✅ Bun-specific features
const file = Bun.file("./data.txt");  // Fast file API
Bun.serve({ port: 3000, fetch: ... }); // Fast HTTP server
Bun.password.hash(password);           // Built-in hashing
```

---

## 9. Performance Tips

### 9.1 Use Bun-native APIs

```typescript
// Slow (Node.js compat)
import fs from "fs/promises";
const content = await fs.readFile("./data.txt", "utf-8");

// Fast (Bun-native)
const file = Bun.file("./data.txt");
const content = await file.text();
```

### 9.2 Use Bun.serve for HTTP

```typescript
// Don't: Express/Fastify (overhead)
import express from "express";
const app = express();

// Do: Bun.serve (native, 4-10x faster)
Bun.serve({
  fetch(req) {
    return new Response("Hello!");
  },
});

// Or use Elysia (Bun-optimized framework)
import { Elysia } from "elysia";
new Elysia().get("/", () => "Hello!").listen(3000);
```

### 9.3 Bundle for Production

```bash
# Always bundle and minify for production
bun build ./src/index.ts --outdir ./dist --minify --target node

# Then run the bundle
bun run ./dist/index.js
```

---

## Quick Reference

| Task         | Command                                    |
| :----------- | :----------------------------------------- |
| Init project | `bun init`                                 |
| Install deps | `bun install`                              |
| Add package  | `bun add <pkg>`                            |
| Run script   | `bun run <script>`                         |
| Run file     | `bun run file.ts`                          |
| Watch mode   | `bun --watch run file.ts`                  |
| Run tests    | `bun test`                                 |
| Build        | `bun build ./src/index.ts --outdir ./dist` |
| Execute pkg  | `bunx <pkg>`                               |

---

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [Bun GitHub](https://github.com/oven-sh/bun)
- [Elysia Framework](https://elysiajs.com/)
- [Bun Discord](https://bun.sh/discord)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
