---
adapter:
  language: generic
  display_name: "Generic (Auto-Discovery)"
  version: "1.0"

  detection:
    files: []  # Always matches as fallback
    confidence: 0.10

  commands:
    build: null   # Discovered from Makefile / README
    test: null    # Discovered from Makefile / README
    lint: null
    lint_arch: null
    format: null
    start: null
    dev: null

  package_manager:
    detection: []
    default: null
    install_command: null

  route_detection:
    server_indicators:
      - pattern: 'listen|serve|http|server'
        description: "Generic HTTP server indicator"
        frameworks: []
    cli_indicators:
      - pattern: 'argv|args|argparse|getopt|flag'
        description: "Generic CLI argument parsing"
        frameworks: []
    frontend_indicators:
      - pattern: 'index\\.html|<!DOCTYPE html>'
        description: "HTML file presence"
        frameworks: []
    patterns: []

  import_analysis:
    list_packages: null
    import_pattern: null
    source_extensions: []
    module_root_file: null

  layer_conventions:
    patterns:
      - layer: 0
        paths: ["types", "models", "domain", "entities"]
        description: "Core types (generic convention)"
      - layer: 1
        paths: ["utils", "lib", "common", "helpers", "shared"]
        description: "Shared utilities (generic convention)"
      - layer: 2
        paths: ["services", "core", "business", "logic"]
        description: "Business logic (generic convention)"
      - layer: 3
        paths: ["handlers", "controllers", "api", "routes", "endpoints"]
        description: "API layer (generic convention)"
      - layer: 4
        paths: ["main", "cmd", "bin", "app", "src/index", "src/main"]
        description: "Entry points (generic convention)"

  dependency_detection:
    manifest_file: null
    databases: []
    services: []
    env_var_patterns: []

  linter:
    template_section: null
    script_extension: null
    run_command: null

  naming:
    file_pattern: null
    test_pattern: null
    directory_style: null

  ci:
    github_actions:
      image: "ubuntu-latest"
      setup_steps: []
      cache_paths: []
---

# Generic Adapter (Auto-Discovery Fallback)

This adapter activates when no language-specific adapter matches. Instead of
assuming a specific language (previous behavior: defaulting to Go), it discovers
commands from project conventions.

## Discovery Strategy

### 1. Makefile Discovery

If a `Makefile` exists, parse targets:

```bash
# Extract make targets
grep -E '^[a-zA-Z_-]+:' Makefile | sed 's/:.*//'
```

Common target mappings:
| Target Pattern | Mapped Command |
|---------------|---------------|
| `build`, `compile` | `commands.build` |
| `test`, `check` | `commands.test` |
| `lint`, `lint-arch` | `commands.lint`, `commands.lint_arch` |
| `fmt`, `format` | `commands.format` |
| `run`, `start`, `serve` | `commands.start` |
| `dev`, `watch` | `commands.dev` |

### 2. README Discovery

If no Makefile, scan `README.md` for code blocks with common commands:

```bash
# Look for fenced code blocks with build/test commands
grep -A 2 '```' README.md
```

### 3. package.json Scripts Discovery (non-Node projects)

Some non-Node projects use `package.json` for script aliases:

```bash
# Check if package.json scripts exist
cat package.json | python3 -c "import sys,json; [print(k,v) for k,v in json.load(sys.stdin).get('scripts',{}).items()]"
```

### 4. docker-compose.yml Discovery

If `docker-compose.yml` exists, extract service definitions for environment setup.

## When Generic Adapter Activates

The generic adapter is the **last resort**. It activates only when:
1. No `go.mod`, `package.json`, `pyproject.toml`, `pom.xml`, `Cargo.toml` exists
2. Or when the user explicitly requests generic mode

## Behavior Differences from Language-Specific Adapters

| Aspect | Language Adapter | Generic Adapter |
|--------|-----------------|-----------------|
| Build command | Hardcoded default | Discovered from Makefile/README |
| Route detection | Framework-specific regex | Generic HTTP patterns only |
| Layer conventions | Language-idiomatic paths | Common directory names |
| Linter | Language-specific template | None (rely on existing tools) |
| CI template | Language-specific image | Ubuntu with custom steps |

## Extending to New Languages

If you find yourself repeatedly using the generic adapter for a specific language,
that's a signal to create a proper language adapter. See `adapter-schema.md` for
the schema to follow.
