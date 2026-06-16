# Language Adapter Schema

Every language adapter must follow this schema. Adapters are the single source of truth
for all language-specific behavior across the harness system.

## Design Principles

1. **Discover, don't assume**: Adapters define detection rules, not the core system
2. **One adapter, one language**: Each adapter is self-contained for one language ecosystem
3. **Graceful degradation**: Every field is optional — missing fields fall back to generic behavior
4. **Extensibility**: Adding a new language = adding one adapter file, zero core changes

## Schema Definition

```yaml
adapter:
  # ─── Metadata ───────────────────────────────────────────────
  language: string               # Unique identifier: go, typescript, python, java, rust, etc.
  display_name: string           # Human-readable: "Go", "TypeScript", "Python", etc.
  version: string                # Adapter schema version (currently "1.0")

  # ─── Detection ──────────────────────────────────────────────
  # How to identify this language in a project.
  # Detection runs in order; first match with highest confidence wins.
  detection:
    # Files whose existence signals this language (ANY match = candidate)
    files: [string]
    # Optional: require file content patterns for higher confidence
    content_patterns:
      - file: string             # Glob pattern (e.g., "*.toml", "package.json")
        pattern: string          # Regex to match inside the file
    # Overall confidence when detection.files match (0.0 - 1.0)
    confidence: float

  # ─── Commands ───────────────────────────────────────────────
  # Standard development commands. null = not applicable for this language.
  # These are defaults; project-level overrides in DEVELOPMENT.md or
  # harness/config/validate.json always take priority.
  commands:
    build: string | null         # Compile/transpile: "go build ./...", "npm run build"
    test: string | null          # Run tests: "go test ./...", "npm test"
    lint: string | null          # General linting: "golangci-lint run", "npm run lint"
    lint_arch: string | null     # Architectural linting: "make lint-arch", "npm run lint:arch"
    format: string | null        # Code formatting: "gofmt -w .", "prettier --write ."
    start: string | null         # Start the application: "go run main.go", "npm start"
    dev: string | null           # Development mode: "air", "npm run dev"

  # ─── Package Manager ────────────────────────────────────────
  # How to detect and use the package manager.
  package_manager:
    # Detection priority: first match wins
    detection:
      - lockfile: string         # e.g., "pnpm-lock.yaml"
        manager: string          # e.g., "pnpm"
      - lockfile: string
        manager: string
    default: string              # Fallback if no lockfile: "npm", "pip", etc.
    install_command: string      # Template: "{manager} install"

  # ─── Route Detection ────────────────────────────────────────
  # How to find HTTP routes, CLI commands, and other entry points.
  # Used by verify.py and generate_task_verification.py.
  route_detection:
    # Indicators that this project is a server (scan file contents)
    server_indicators:
      - pattern: string          # Regex to find in source files
        description: string      # Human-readable explanation
        frameworks: [string]     # Associated frameworks: ["chi", "gin"]

    # Indicators that this project is a CLI tool
    cli_indicators:
      - pattern: string
        description: string
        frameworks: [string]

    # Indicators that this project is a frontend app
    frontend_indicators:
      - pattern: string
        description: string
        frameworks: [string]

    # Route/command extraction patterns
    patterns:
      - type: route              # "route" for HTTP, "command" for CLI
        regex: string            # Extraction regex with named groups
        groups: [string]         # Named groups: [method, path] or [command_name]
        frameworks: [string]     # Which frameworks this pattern matches

  # ─── Import Analysis ────────────────────────────────────────
  # How to analyze imports for dependency linting.
  import_analysis:
    # Command to list all packages/modules
    list_packages: string | null # "go list ./...", null for languages without this
    # Regex to extract imports from source files
    import_pattern: string       # e.g., '"([^"]+)"' for Go, 'from [\'"]([^\'"]+)' for TS
    # File extensions to scan
    source_extensions: [string]  # [".go"], [".ts", ".tsx", ".js", ".jsx"]
    # Module root detection
    module_root_file: string     # "go.mod", "package.json", "pyproject.toml"

  # ─── Layer Conventions ──────────────────────────────────────
  # Default layer hierarchy for architectural linting.
  # These are starting-point defaults; the analyzer agent adjusts based on
  # actual import graph analysis.
  layer_conventions:
    patterns:
      - layer: int               # 0 = foundational, higher = more application-specific
        paths: [string]          # Directory patterns: ["internal/types", "types", "domain"]
        description: string      # "Pure types, zero internal imports"

  # ─── Dependency Detection ───────────────────────────────────
  # How to detect external dependencies (databases, services, etc.)
  # from the project's dependency manifest.
  dependency_detection:
    manifest_file: string        # "go.mod", "package.json", "requirements.txt"
    # Patterns to detect specific dependency types
    databases:
      - pattern: string          # Regex on dependency name
        type: string             # "postgres", "mysql", "mongodb", "redis", "sqlite"
        default_port: int
    services:
      - pattern: string
        type: string             # "kafka", "rabbitmq", "elasticsearch", etc.
        default_port: int
    # Environment variable detection in source code
    env_var_patterns:
      - pattern: string          # e.g., 'os\.Getenv\("([^"]+)"\)' for Go

  # ─── Linter Template ────────────────────────────────────────
  # Reference to the linter implementation for this language.
  linter:
    # Pointer to the section in linter-templates.md
    template_section: string     # "go-linter", "typescript-linter", etc.
    # File extension for the linter script
    script_extension: string     # ".go", ".ts", ".py"
    # How to run the linter
    run_command: string          # "go run scripts/lint-deps.go", "npx ts-node scripts/lint-deps.ts"

  # ─── Naming Conventions ─────────────────────────────────────
  # File and directory naming rules for verify_action.py.
  naming:
    file_pattern: string         # Regex: "^[a-z][a-z0-9_]*\\.go$"
    test_pattern: string         # Regex: "^[a-z][a-z0-9_]*_test\\.go$"
    directory_style: string      # "snake_case", "kebab-case", "camelCase"

  # ─── CI Template ────────────────────────────────────────────
  # CI configuration template for this language.
  ci:
    # GitHub Actions template (primary)
    github_actions:
      image: string              # "golang:1.22", "node:20", "python:3.12"
      setup_steps: [string]      # Additional setup steps
      cache_paths: [string]      # Paths to cache: ["~/go/pkg/mod"], ["node_modules"]
    # Other CI systems can be added here
```

## Resolution Priority

When the harness system needs language-specific behavior, it follows this resolution chain:

1. **Project-level override** — `harness/config/validate.json`, `DEVELOPMENT.md` commands
2. **Adapter defaults** — The matching adapter's `commands` section
3. **Generic fallback** — `generic.md` adapter (discovers from Makefile/README)

## Adding a New Language

To add support for a new language (e.g., Kotlin):

1. Create `references/adapters/kotlin.md` following this schema
2. Fill in detection rules, commands, route patterns
3. Optionally add a linter template section to `linter-templates.md`
4. No changes to core scripts needed — `detect_adapter.py` auto-discovers adapters

## Adapter File Format

Each adapter file uses YAML front matter followed by prose documentation:

```markdown
---
adapter:
  language: kotlin
  display_name: "Kotlin"
  version: "1.0"
  detection:
    files: [build.gradle.kts, build.gradle]
    confidence: 0.9
  commands:
    build: "./gradlew build"
    test: "./gradlew test"
    # ...
---

# Kotlin Adapter

## Framework-Specific Notes

### Ktor (server)
- Routes defined via `routing { get("/path") { ... } }`
- ...

### Spring Boot
- Routes via `@GetMapping`, `@PostMapping` annotations
- ...
```
