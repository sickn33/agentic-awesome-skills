# Code Architecture Analysis Agent

You are analyzing a codebase to understand its architecture for building agent harness infrastructure.

## Your Task

Produce a complete architectural analysis that can be used by other agents to create documentation, linters, and configuration.

## Step-by-Step

### 1. Identify Tech Stack

```bash
ls go.mod package.json requirements.txt pyproject.toml Cargo.toml 2>/dev/null
```

Record: language, version, key dependencies.

### 2. Map Directory Structure

```bash
find . -type f \( -name "*.go" -o -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.rs" \) \
  ! -path './.git/*' ! -path './node_modules/*' ! -path './vendor/*' | head -100
```

Identify the organizational pattern (cmd/ + internal/, src/ + lib/, etc.)

### 3. Build Layer Hierarchy from Imports

This is the most critical step. Analyze actual import relationships:

**Go**: `grep -r '"module-path/' --include="*.go"` or `go list -json ./...`
**TypeScript**: `grep -r "from ['\"]\.\.?/" --include="*.ts" --include="*.tsx"`
**Python**: `grep -r "^from \." --include="*.py"`

Assign layers bottom-up:
- Layer 0: Packages with ZERO internal imports
- Layer N: Packages that only import from layers < N

Record every package and its layer assignment.

### 4. Detect Circular Dependencies

If Package A imports Package B AND Package B imports Package A → P0 issue.

Record:
- Files involved (with line numbers)
- Type: direct vs transitive
- Suggested fix

### 5. Extract Key Interfaces

Search for interface/abstract definitions:
- Go: `grep -r "type.*interface" --include="*.go"`
- TypeScript: `grep -r "interface\|abstract class" --include="*.ts"`
- Python: `grep -r "@abstractmethod" --include="*.py"`

For each key interface, record: name, location (file:line), methods, implementations, usage sites.

### 6. Trace Critical Code Paths

Pick 3-5 representative paths (happy path, error path, complex flow, background job).

For each, trace from entry point through all layers:
```
[file:line] function_name()
    ↓ calls
[file:line] another_function()
    ↓ returns
...
```

### 7. Catalog Error Handling Patterns

Identify:
- Typed errors vs strings?
- Error wrapping convention?
- Error code registry?
- Structured logging?
- Retry logic?

## Output Format

Save results to `harness/.analysis/architecture.json`:

```json
{
  "tech_stack": {
    "language": "Go",
    "version": "1.22",
    "module_path": "github.com/org/project",
    "key_dependencies": ["chi", "pgx", "zap"]
  },
  "layers": [
    {"level": 0, "packages": ["internal/types", "internal/errors"], "description": "Core types, zero internal deps"},
    {"level": 1, "packages": ["internal/utils", "internal/logging"], "description": "Utilities, only imports L0"},
    {"level": 2, "packages": ["internal/core", "internal/auth"], "description": "Business logic"}
  ],
  "circular_dependencies": [
    {"pkg_a": "internal/auth", "pkg_b": "internal/core", "files": ["auth/middleware.go:15", "core/service.go:23"], "suggested_fix": "Extract shared interface"}
  ],
  "key_interfaces": [
    {"name": "UserService", "location": "internal/core/user.go:10-25", "methods": ["GetUser", "CreateUser"], "implementations": ["internal/core/user_impl.go"]}
  ],
  "code_paths": [
    {"name": "Create User", "trigger": "POST /api/users", "flow": ["cmd/api.go:45", "core/user.go:30", "storage/user.go:15"]}
  ],
  "error_patterns": {
    "style": "typed_errors",
    "wrapping": true,
    "structured_logging": true,
    "error_registry": "internal/errors/codes.go"
  },
  "total_files": 45,
  "total_lines": 3500
}
```

Also write a human-readable summary to `harness/.analysis/architecture-summary.md`.
