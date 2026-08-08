# Greenfield Templates

Complete, ready-to-use templates for 0→1 project scaffolding. Each section provides real file contents — not placeholders — for bootstrapping a new project with core harness infrastructure.

## Table of Contents

- [Go CLI Tool](#go-cli-tool)
- [Go Web API](#go-web-api)
- [TypeScript/Node CLI](#typescriptnode-cli)
- [TypeScript/Node Web API](#typescriptnode-web-api)
- [Python CLI](#python-cli)
- [Python Web API](#python-web-api)
- [Shared Templates](#shared-templates) (docs, exec-plans, quality — same for all stacks)

---

## Go CLI Tool

### go.mod

```
module {module-path}

go 1.22
```

### main.go

```go
package main

import (
	"fmt"
	"os"

	"{module-path}/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
```

### cmd/root.go

```go
package cmd

import (
	"fmt"
	"os"
)

func Execute() error {
	if len(os.Args) < 2 {
		fmt.Println("{project-name} - {description}")
		fmt.Println("\nUsage:")
		fmt.Println("  {project-name} <command> [arguments]")
		fmt.Println("\nCommands:")
		fmt.Println("  version    Print version info")
		return nil
	}

	switch os.Args[1] {
	case "version":
		fmt.Println("{project-name} v0.1.0")
	default:
		return fmt.Errorf("unknown command: %s", os.Args[1])
	}
	return nil
}
```

### internal/types/types.go

```go
// Package types defines core types shared across the application.
// Layer 0: No internal dependencies allowed.
package types
```

### internal/core/core.go

```go
// Package core contains the main business logic.
// Layer 1: May depend on types (Layer 0) only.
package core
```

### Makefile

```makefile
.PHONY: build test lint lint-arch clean

build:
	go build -o bin/{project-name} .

test:
	go test ./...

lint: lint-arch
	@if command -v golangci-lint >/dev/null 2>&1; then \
		golangci-lint run; \
	else \
		echo "golangci-lint not installed, skipping"; \
	fi

lint-arch:
	@echo "Checking architecture constraints..."
	@go run scripts/lint-deps.go
	@go run scripts/lint-quality.go
	@echo "✓ Architecture checks passed"

clean:
	rm -rf bin/
```

### scripts/lint-deps.go

Use the template from `references/linter-templates.md`, with:
- `modulePath` set to the project's module path
- `layers` configured for the project's directory structure:
  ```go
  var layers = [][]string{
    {"internal/types"},          // Layer 0
    {"internal/core"},           // Layer 1
    {"cmd"},                     // Layer 2 (top)
  }
  ```

### scripts/lint-quality.go

Use the template from `references/linter-templates.md`, with file size limit set to 500 for new projects (can grow to 1000 later).

---

## Go Web API

Same as Go CLI Tool, with these additions/changes:

### main.go

```go
package main

import (
	"log"
	"net/http"

	"{module-path}/internal/api"
)

func main() {
	router := api.NewRouter()
	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
```

### internal/api/router.go

```go
// Package api defines HTTP handlers and routing.
// Layer 2: May depend on core (Layer 1) and types (Layer 0).
package api

import "net/http"

func NewRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	return mux
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}
```

### Layer hierarchy

```go
var layers = [][]string{
	{"internal/types"},          // Layer 0
	{"internal/core"},           // Layer 1
	{"internal/api"},            // Layer 2
	{"cmd"},                     // Layer 3 (top)
}
```

---

## TypeScript/Node CLI

### package.json

```json
{
  "name": "{project-name}",
  "version": "0.1.0",
  "description": "{description}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "lint": "npm run lint:arch && eslint src/",
    "lint:arch": "ts-node scripts/lint-deps.ts && ts-node scripts/lint-quality.ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "ts-node": "^10.0.0",
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### src/index.ts

```typescript
#!/usr/bin/env node

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "version":
      console.log("{project-name} v0.1.0");
      break;
    default:
      console.log("{project-name} - {description}");
      console.log("\nUsage:");
      console.log("  {project-name} <command>");
      console.log("\nCommands:");
      console.log("  version    Print version info");
  }
}

main();
```

### src/types/index.ts

```typescript
// Layer 0: Core types — no internal imports allowed
export interface Config {
  // Add configuration types here
}
```

### scripts/lint-deps.ts

```typescript
#!/usr/bin/env ts-node
/**
 * Validates that imports respect the layer hierarchy.
 *
 * Layer 0: src/types/     — No internal imports
 * Layer 1: src/core/      — May import types only
 * Layer 2: src/commands/  — May import core and types
 * Layer 3: src/index.ts   — May import anything
 */
import * as fs from "fs";
import * as path from "path";

interface LayerRule {
  pattern: string;
  layer: number;
  forbiddenImports: string[];
}

const rules: LayerRule[] = [
  {
    pattern: "src/types/",
    layer: 0,
    forbiddenImports: ["../core", "../commands"],
  },
  {
    pattern: "src/core/",
    layer: 1,
    forbiddenImports: ["../commands"],
  },
];

let violations = 0;

function checkFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (const rule of rules) {
    if (!filePath.includes(rule.pattern)) continue;

    lines.forEach((line, i) => {
      const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!importMatch) return;

      const importPath = importMatch[1];
      for (const forbidden of rule.forbiddenImports) {
        if (importPath.includes(forbidden)) {
          console.error(
            `✗ ${filePath}:${i + 1} — Layer ${rule.layer} cannot import "${importPath}"`,
          );
          console.error(
            `  Fix: Move this logic to a higher layer, or pass the dependency as a parameter.`,
          );
          violations++;
        }
      }
    });
  }
}

function walkDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      walkDir(fullPath);
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      checkFile(fullPath);
    }
  }
}

walkDir("src");

if (violations === 0) {
  console.log("✓ All imports follow the layer hierarchy");
  process.exit(0);
} else {
  console.error(`\n✗ Found ${violations} layer violation(s)`);
  process.exit(1);
}
```

### scripts/lint-quality.ts

```typescript
#!/usr/bin/env ts-node
/**
 * Validates quality rules:
 * - File size limits (max 500 lines)
 * - No console.log in production code (use a logger)
 */
import * as fs from "fs";
import * as path from "path";

const MAX_FILE_LINES = 500;
let violations = 0;

function checkFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  // Check file size
  if (lines.length > MAX_FILE_LINES) {
    console.error(
      `✗ ${filePath} has ${lines.length} lines (max ${MAX_FILE_LINES})`,
    );
    console.error(
      `  Fix: Split this file into smaller, focused modules.`,
    );
    violations++;
  }

  // Check for console.log in non-test, non-index files
  if (!filePath.includes(".test.") && !filePath.endsWith("index.ts")) {
    lines.forEach((line, i) => {
      if (line.match(/console\.log\(/) && !line.trim().startsWith("//")) {
        console.error(
          `✗ ${filePath}:${i + 1} — Use structured logger instead of console.log`,
        );
        console.error(
          `  Fix: Import the logger from src/utils/logger.ts and use logger.info() instead.`,
        );
        violations++;
      }
    });
  }
}

function walkDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      walkDir(fullPath);
    } else if (entry.name.endsWith(".ts")) {
      checkFile(fullPath);
    }
  }
}

walkDir("src");

if (violations === 0) {
  console.log("✓ All quality checks passed");
  process.exit(0);
} else {
  console.error(`\n✗ Found ${violations} quality violation(s)`);
  process.exit(1);
}
```

---

## TypeScript/Node Web API

Same as TypeScript CLI, with these additions:

### src/index.ts

```typescript
import http from "http";
import { router } from "./api/router";

const PORT = process.env.PORT || 8080;

const server = http.createServer(router);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### src/api/router.ts

```typescript
import http from "http";

export function router(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
}
```

---

## Python CLI

### pyproject.toml

```toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "{project-name}"
version = "0.1.0"
description = "{description}"
requires-python = ">=3.10"
dependencies = []

[project.optional-dependencies]
dev = ["pytest", "ruff", "mypy"]

[project.scripts]
{project-name} = "{package_name}.main:main"

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.mypy]
strict = true
```

### requirements.txt

```
# Production dependencies

# Dev dependencies
pytest>=7.0
ruff>=0.1.0
mypy>=1.0
```

### src/{package_name}/__init__.py

```python
"""
{Project Name} - {description}
"""

__version__ = "0.1.0"
```

### src/{package_name}/main.py

```python
"""Entry point for {project-name}."""
import sys


def main() -> None:
    """Main entry point."""
    args = sys.argv[1:]

    if not args:
        print("{project-name} - {description}")
        print("\nUsage:")
        print("  {project-name} <command>")
        print("\nCommands:")
        print("  version    Print version info")
        return

    command = args[0]
    if command == "version":
        print("{project-name} v0.1.0")
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### src/{package_name}/types.py

```python
"""
Core types shared across the application.
Layer 0: No internal imports allowed.
"""
from dataclasses import dataclass


@dataclass
class Config:
    """Application configuration."""
    pass
```

### tests/__init__.py

```python
```

### tests/test_main.py

```python
"""Tests for main module."""
from {package_name}.main import main


def test_main_no_args(capsys, monkeypatch):
    """Test main with no arguments shows usage."""
    monkeypatch.setattr("sys.argv", ["{project-name}"])
    main()
    captured = capsys.readouterr()
    assert "{project-name}" in captured.out
```

### Makefile (Python)

```makefile
.PHONY: install test lint lint-arch format clean

install:
	pip install -e ".[dev]"

test:
	pytest tests/ -v

lint: lint-arch
	ruff check src/ tests/
	mypy src/

lint-arch:
	@echo "Checking architecture constraints..."
	@python scripts/lint_deps.py
	@python scripts/lint_quality.py
	@echo "✓ Architecture checks passed"

format:
	ruff format src/ tests/

clean:
	rm -rf dist/ build/ *.egg-info __pycache__
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
```

### scripts/lint_deps.py

```python
#!/usr/bin/env python3
"""
Validates that imports respect the layer hierarchy.

Layer 0: src/{package}/types.py     — No internal imports
Layer 1: src/{package}/core/        — May import types only
Layer 2: src/{package}/api/         — May import core and types
Layer 3: src/{package}/main.py      — May import anything
"""
import ast
import sys
from pathlib import Path

PACKAGE_NAME = "{package_name}"

LAYER_MAP = {
    "types": 0,
    "core": 1,
    "api": 2,
    "main": 3,
}

violations = []


def get_layer(filepath: Path) -> int:
    """Determine the layer of a file based on its path."""
    parts = filepath.parts
    for part in parts:
        if part in LAYER_MAP:
            return LAYER_MAP[part]
    # main.py at package root
    if filepath.stem == "main":
        return 3
    return -1


def check_file(filepath: Path) -> None:
    """Check a single file for layer violations."""
    source_layer = get_layer(filepath)
    if source_layer < 0:
        return

    try:
        tree = ast.parse(filepath.read_text())
    except SyntaxError:
        return

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            module = ""
            if isinstance(node, ast.ImportFrom) and node.module:
                module = node.module
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    module = alias.name

            if not module.startswith(PACKAGE_NAME):
                continue

            for target, target_layer in LAYER_MAP.items():
                if target in module and target_layer >= source_layer and target != filepath.stem:
                    violations.append(
                        f"  ✗ {filepath}:{node.lineno} — "
                        f"Layer {source_layer} imports '{module}' (layer {target_layer})\n"
                        f"    Fix: Move this logic to a higher layer, "
                        f"or pass the dependency as a parameter."
                    )


def main() -> None:
    src_dir = Path("src") / PACKAGE_NAME
    if not src_dir.exists():
        print(f"Source directory {src_dir} not found")
        sys.exit(1)

    for py_file in src_dir.rglob("*.py"):
        if "__pycache__" in str(py_file):
            continue
        check_file(py_file)

    if not violations:
        print("✓ All imports follow the layer hierarchy")
        sys.exit(0)
    else:
        print(f"✗ Found {len(violations)} layer violation(s):\n")
        for v in violations:
            print(v)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### scripts/lint_quality.py

```python
#!/usr/bin/env python3
"""
Validates quality rules:
- File size limits (max 500 lines)
- No print() in production code (use logging)
"""
import sys
from pathlib import Path

MAX_FILE_LINES = 500
violations = []


def check_file(filepath: Path) -> None:
    """Check a single file for quality violations."""
    lines = filepath.read_text().splitlines()

    # File size check
    if len(lines) > MAX_FILE_LINES:
        violations.append(
            f"  ✗ {filepath} has {len(lines)} lines (max {MAX_FILE_LINES})\n"
            f"    Fix: Split this file into smaller, focused modules."
        )

    # print() in non-test, non-main files
    if "test_" not in filepath.name and filepath.stem != "main":
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            if "print(" in stripped:
                violations.append(
                    f"  ✗ {filepath}:{i} — Use logging instead of print()\n"
                    f"    Fix: import logging; logger = logging.getLogger(__name__); logger.info(...)"
                )


def main() -> None:
    src_dir = Path("src")
    if not src_dir.exists():
        print("src/ directory not found")
        sys.exit(1)

    for py_file in src_dir.rglob("*.py"):
        if "__pycache__" in str(py_file):
            continue
        check_file(py_file)

    if not violations:
        print("✓ All quality checks passed")
        sys.exit(0)
    else:
        print(f"✗ Found {len(violations)} quality violation(s):\n")
        for v in violations:
            print(v)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

---

## Python Web API

Same as Python CLI, with these additions:

### src/{package_name}/main.py (Web API version)

```python
"""Entry point for {project-name} web API."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json


class APIHandler(BaseHTTPRequestHandler):
    """Simple HTTP request handler."""

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json_response(200, {"status": "ok"})
        else:
            self._json_response(404, {"error": "Not Found"})

    def _json_response(self, status: int, body: dict) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())


def main() -> None:
    """Start the HTTP server."""
    port = 8080
    server = HTTPServer(("", port), APIHandler)
    print(f"Server running on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
```

---

## Shared Templates

These files are the same regardless of tech stack. All templates use:
- **Hierarchical numbering** (1, 1.1, 1.2...) for stable cross-references
- **Placeholder source citations** (`> Sources: [`file`]()`) pointing to files that will be created
- **Mermaid diagrams** showing the planned architecture

### AGENTS.md Template (DeepWiki-style)

```markdown
# {Project Name} Agent Guide

{One-sentence description}

## 1 Quick Start

- [Architecture Overview](docs/ARCHITECTURE.md) — System design, layers, data flow
- [Development Setup](docs/DEVELOPMENT.md) — Build, test, environment

## 2 Architecture

| Section | Document | Description |
|---------|----------|-------------|
| 2.1 | [System Architecture](docs/ARCHITECTURE.md) | Layer hierarchy, dependency graph, data flow |
| 2.2 | [Design Documents](docs/design-docs/index.md) | Component deep-dives (to be added) |

## 3 Quality & Standards

| Section | Document | Description |
|---------|----------|-------------|
| 3.1 | [Code Quality](docs/QUALITY.md) | Golden principles, linter rules |
| 3.2 | [Testing Standards](docs/TESTING.md) | Test patterns, coverage |
| 3.3 | [Security Policy](docs/SECURITY.md) | Security considerations |
| 3.4 | [Quality Score](docs/QUALITY_SCORE.md) | Per-domain quality grades |

## 4 Development

\`\`\`bash
{stack-specific build commands}
\`\`\`

See [Development Setup](docs/DEVELOPMENT.md) for complete reference.

## 5 Execution Plans

- [Active Plans](docs/exec-plans/active/) — Work in progress
- [Completed Plans](docs/exec-plans/completed/) — Historical record
- [Tech Debt Tracker](docs/exec-plans/tech-debt-tracker.md)

## 6 Key Directories

| Directory | Layer | Purpose |
|-----------|-------|---------|
| \`{main-source-dir}/\` | L2-L3 | Application code |
| \`{types-dir}/\` | L0 | Type definitions |
| \`docs/\` | — | All documentation |
| \`scripts/\` | — | Linters and tooling |
| \`harness/\` | — | Eval and quality |

---

**Note**: This file is a navigation map (~80 lines). Details live in linked documents.
```

### docs/ARCHITECTURE.md Template (DeepWiki-style, Greenfield)

For greenfield projects, the architecture document describes the **planned** structure, with
Mermaid diagrams showing the intended layer hierarchy. Source citations point to files that
will be created by the execution plan.

```markdown
# Architecture

> Project initialized: {today's date}
> Status: Greenfield — structure defined, implementation pending

## 1 Overview

{One paragraph: what this project will do, who will use it, and the architectural approach.}

## 2 System Architecture

### 2.1 Package Dependency Graph

\`\`\`mermaid
graph TD
    subgraph "Layer 2 — Entry Points"
        CMD[cmd/]
    end
    subgraph "Layer 1 — Business Logic"
        CORE[internal/core/]
    end
    subgraph "Layer 0 — Types"
        TYPES[internal/types/]
    end

    CMD --> CORE
    CORE --> TYPES

    style TYPES fill:#e8f5e9
    style CORE fill:#fff3e0
    style CMD fill:#f3e5f5
\`\`\`

> Planned structure. To be enforced by: [\`scripts/lint-deps.go\`]()

### 2.2 Layer Hierarchy

| Layer | Packages | Can Import | Cannot Import | Purpose |
|-------|----------|------------|---------------|---------|
| L0 | \`internal/types/\` | stdlib only | anything internal | Shared type definitions |
| L1 | \`internal/core/\` | L0 | L2 | Business logic |
| L2 | \`cmd/\` | L0, L1 | — | CLI commands, entry points |

> Will be enforced by: [\`scripts/lint-deps.go\`]()

### 2.3 Forbidden Dependencies

| From | To | Why Forbidden |
|------|----|---------------|
| \`internal/types/\` | any internal | Types must be dependency-free |
| \`internal/core/\` | \`cmd/\` | Core logic must not know about CLI |

## 3 Planned Components

### 3.1 Types Package

**Purpose**: Shared type definitions used across all layers
**Location**: \`internal/types/types.go\`

\`\`\`go
// Planned structure (to be implemented)
package types

type Config struct {
    // Configuration fields
}
\`\`\`

> Source: [\`internal/types/types.go\`]() (to be created)

### 3.2 Core Package

**Purpose**: Main business logic
**Location**: \`internal/core/core.go\`

\`\`\`mermaid
classDiagram
    class Core {
        +Process(input) Result, error
        +Validate(input) error
    }
\`\`\`

> Source: [\`internal/core/core.go\`]() (to be created)

### 3.3 CLI Commands

**Purpose**: User-facing command interface
**Location**: \`cmd/root.go\`

> Source: [\`cmd/root.go\`]() (to be created)

## 4 Data Flow

### 4.1 Primary Flow

\`\`\`mermaid
sequenceDiagram
    participant User
    participant CLI as CLI (cmd/)
    participant Core as Core (internal/core/)

    User->>CLI: command args
    CLI->>Core: Process(args)
    Core-->>CLI: Result
    CLI-->>User: Output
\`\`\`

## 5 Key Design Decisions

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | Layered architecture | Enforces clean dependencies, testable | Flat structure (rejected: harder to maintain) |
| 2 | Types in L0 | Shared across all layers without cycles | Types in each package (rejected: duplication) |
| 3 | internal/ packages | Prevents external imports | Public packages (rejected: not needed) |

## 6 Module & Dependencies

\`\`\`
module {module-path}
go {version}
\`\`\`

**External Dependencies**: None initially (boring technology principle)

## See Also

- [Development Setup](DEVELOPMENT.md) — Build and test commands
- [Quality Score](QUALITY_SCORE.md) — Quality tracking
```

### docs/PRODUCT_SENSE.md

```markdown
# Product Sense

## 1 What This Project Does

{description}

## 2 Business Context

[Why does this project exist? What problem does it solve?]

## 3 Key Priorities

| Priority | Level | Description |
|----------|-------|-------------|
| Correctness | [High/Medium/Low] | [How critical is data accuracy?] |
| Performance | [High/Medium/Low] | [What are latency requirements?] |
| Security | [High/Medium/Low] | [What data sensitivity level?] |
| Reliability | [High/Medium/Low] | [What uptime is expected?] |

## 4 Target Users

[Who uses this? What do they care about?]

## 5 Non-Goals

[What is explicitly out of scope?]
```

### docs/QUALITY_SCORE.md

```markdown
# Quality Score

Last updated: {today's date}

## 1 Domain Grades

| Domain | Grade | Issues | Trend | Notes |
|--------|-------|--------|-------|-------|
| Core | N/A | 0 | — | New project |

## 2 Architectural Layers

| Layer | Coverage | Lint Pass | Doc Fresh |
|-------|----------|-----------|-----------|
| Types (L0) | N/A | ✓ | ✓ |
| Core (L1) | N/A | ✓ | ✓ |
| CLI (L2) | N/A | ✓ | ✓ |

## 3 Golden Principles

1. Structured logging over raw print/log statements
2. Typed errors with context
3. Files under 500 lines
4. Layer hierarchy enforced by linters
5. All public APIs documented

> Enforced by: [\`scripts/lint-quality.go\`]()

## 4 Quality Trend

| Date | Overall | Notes |
|------|---------|-------|
| {today} | Baseline | Project initialized |
```

### docs/TESTING.md

```markdown
# Testing Standards

## 1 Test Organization

\`\`\`
tests/
├── unit/          — Fast, isolated tests
├── integration/   — Tests with real dependencies
└── fixtures/      — Shared test data
\`\`\`

## 2 Running Tests

{stack-specific commands}

## 3 Test Patterns

### 3.1 Unit Tests
- Test one thing per test
- Use descriptive names: \`test_<scenario>_<expected_result>\`
- Mock external dependencies

### 3.2 Integration Tests
- Test real interactions between components
- Use test fixtures for reproducible state
- Clean up after each test

## 4 Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Core logic | 80% | N/A |
| CLI commands | 70% | N/A |
| Utils | 60% | N/A |
```

### docs/SECURITY.md

```markdown
# Security Policy

## 1 Principles

1. Never commit secrets (API keys, passwords, tokens)
2. Validate all external input
3. Use parameterized queries for database access
4. Log security-relevant events
5. Keep dependencies updated

## 2 Sensitive Files

Never commit these:
- \`.env\` files
- \`credentials.json\`
- Private keys (\`*.pem\`, \`*.key\`)
- Database dumps

## 3 Input Validation

All user input must be validated before processing:
- Type checking
- Length limits
- Character allowlists where appropriate

## 4 Dependency Management

- Review new dependencies before adding
- Keep dependencies updated regularly
- Audit for known vulnerabilities
```

### docs/DEVELOPMENT.md (Go version)

```markdown
# Development Setup

## 1 Prerequisites

- Go 1.22+
- make

## 2 Quick Start

\`\`\`bash
git clone {repo-url}
cd {project-name}
make build
\`\`\`

## 3 Build Commands

| Command | Description | Duration |
|---------|-------------|----------|
| \`make build\` | Build the binary | ~5s |
| \`make test\` | Run all tests | ~10s |
| \`make lint\` | Run all linters | ~5s |
| \`make lint-arch\` | Run architecture linters only | ~3s |
| \`make clean\` | Remove build artifacts | ~1s |

## 4 Project Structure

\`\`\`
.
├── cmd/           — CLI commands (Layer 2)
├── internal/      — Private packages
│   ├── types/     — Core types (Layer 0)
│   └── core/      — Business logic (Layer 1)
├── docs/          — Documentation
├── scripts/       — Linters and tools
└── harness/       — Eval and quality
\`\`\`

## 5 Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| (none yet) | | | |
```

### docs/design-docs/index.md

```markdown
# Design Documents Index

| Document | Status | Last Updated | Description |
|----------|--------|-------------|-------------|
| (none yet) | | | |

## How to Add a Design Doc

1. Create a new file: `docs/design-docs/{component-name}.md`
2. Use the template from the project's SKILL reference
3. Add an entry to this index
4. Link from AGENTS.md if it's a major component
```

### docs/exec-plans/tech-debt-tracker.md

```markdown
# Tech Debt Tracker

## Active Debt

| ID | Description | Priority | Owner | Created |
|----|-------------|----------|-------|---------|
| (none yet) | | | | |

## Resolved Debt

| ID | Description | Resolution | Date |
|----|-------------|-----------|------|
| (none yet) | | | |

## How to Track Debt

When you notice tech debt during development:
1. Add a row to the Active Debt table
2. Assign a priority (P0-P3)
3. Reference it in the relevant execution plan if applicable
```

### docs/references/index.md

```markdown
# Reference Documents Index

| Document | Description | Last Updated |
|----------|-------------|-------------|
| (none yet) | | |

## Adding References

Reference documents provide agent-readable summaries of external dependencies, APIs, and schemas.

Format: `{dependency-name}-llms.txt` style — concise, focused on API surface and common patterns.
```

### .github/workflows/ci.yml (Go version)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build
        run: go build ./...

      - name: Test
        run: go test ./...

      - name: Lint Architecture
        run: |
          go run scripts/lint-deps.go
          go run scripts/lint-quality.go
```

### .github/workflows/ci.yml (TypeScript version)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install
        run: npm install

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Lint
        run: npm run lint
```

### .github/workflows/ci.yml (Python version)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install
        run: pip install -e ".[dev]"

      - name: Test
        run: pytest tests/ -v

      - name: Lint
        run: |
          ruff check src/ tests/
          python scripts/lint_deps.py
          python scripts/lint_quality.py
```
