# Config & Environment Creation Agent

You are creating or updating harness configuration and environment files.

## Input

You will receive:
- Environment analysis (from `harness/.analysis/environment.json`)
- Architecture data (from `harness/.analysis/architecture.json`)
- Existing state (from `harness/.analysis/audit.json`)
- Delta list of files to create/update

## Files You Create/Update

### harness/config/environment.json

The runtime ecosystem contract. Describes what the application needs to run.

**REQUIRED FIELDS** (functional verification depends on these):
- `runtime.dev_command` — How to start the server in dev mode
- `runtime.build_command` — How to build the project
- `test_environment.env_vars` — Environment variables for test mode
- `functional_scenarios[]` — List of verification scenarios

```json
{
  "runtime": {
    "language": "go",
    "version": "1.22",
    "build_command": "go build ./...",
    "dev_command": "go run main.go server -c config/server.toml",
    "test_command": "go test ./...",
    "binary_path": "./qts"
  },
  "databases": [
    {
      "type": "postgresql",
      "env_vars": {"DATABASE_URL": "postgres://..."},
      "docker": {"image": "postgres:16", "port": 5432},
      "test_alternative": "SQLite in-memory"
    }
  ],
  "services": [
    {"type": "redis", "env_vars": {"REDIS_URL": "redis://localhost:6379"}}
  ],
  "secrets": [
    {"name": "JWT_SECRET", "description": "JWT signing key", "test_value": "test-secret-do-not-use-in-prod"}
  ],
  "test_environment": {
    "env_vars": {
      "GIN_MODE": "release",
      "ENV_TAG": "test",
      "LOG_LEVEL": "error"
    }
  },
  "functional_scenarios": [
    {
      "name": "health_check",
      "description": "Verify server starts and health endpoint responds correctly",
      "prerequisites": ["postgresql", "redis"],
      "steps": [
        "Start server with runtime.dev_command",
        "Wait for server to be ready (GET /healthz returns 200)",
        "Verify health response contains status: up"
      ],
      "expected_outcome": "Server is healthy and all dependencies connected"
    },
    {
      "name": "basic_crud_flow",
      "description": "Create, read, update, delete a resource via API",
      "prerequisites": ["postgresql"],
      "steps": [
        "POST /api/v1/resources with valid payload -> 201",
        "GET /api/v1/resources/:id -> 200 with matching data",
        "PUT /api/v1/resources/:id -> 200",
        "DELETE /api/v1/resources/:id -> 204"
      ],
      "expected_outcome": "CRUD operations work correctly"
    }
  ],
  "scripts": {
    "setup": "harness/scripts/setup-env.sh",
    "start": "harness/scripts/start-server.sh",
    "teardown": "harness/scripts/teardown-env.sh"
  }
}
```

Follow `references/environment-detection-guide.md` for detection strategies.

### harness/scripts/setup-env.sh

Start external dependencies (DB, Redis, etc.):

```bash
#!/bin/bash
set -euo pipefail

# Start PostgreSQL
docker run -d --name harness-postgres \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=testpass \
  postgres:16

# Wait for ready
until docker exec harness-postgres pg_isready; do sleep 1; done

echo "✓ Environment ready"
```

If `docker-compose.yml` already exists, create a thin wrapper instead.

### harness/scripts/start-server.sh

Start the application with test environment:

```bash
#!/bin/bash
set -euo pipefail

export PORT=8081
export ENV=test
export DATABASE_URL="postgres://postgres:testpass@localhost:5432/testdb?sslmode=disable"

# Start server
go run cmd/api/main.go &
SERVER_PID=$!

# Wait for ready
for i in $(seq 1 30); do
  if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "✓ Server ready (PID: $SERVER_PID)"
    exit 0
  fi
  sleep 1
done

echo "✗ Server failed to start"
exit 1
```

### harness/scripts/teardown-env.sh

Stop and cleanup:

```bash
#!/bin/bash
docker stop harness-postgres 2>/dev/null || true
docker rm harness-postgres 2>/dev/null || true
echo "✓ Cleaned up"
```

### Makefile Targets

Ensure these targets exist:

```makefile
.PHONY: lint-arch lint-ecl lint-encoding verify-harness build test setup-env start-server teardown-env

lint-arch:
	./scripts/lint-deps
	./scripts/lint-quality

lint-ecl:
	{ecl_lint_command}

lint-encoding:
	{encoding_lint_command}

verify-harness: lint-ecl lint-encoding lint-arch

build:
	{appropriate build command}

test:
	{appropriate test command}

setup-env:
	./harness/scripts/setup-env.sh

start-server:
	./harness/scripts/start-server.sh

teardown-env:
	./harness/scripts/teardown-env.sh
```

### .github/workflows/ci.yml

Basic CI that runs build, lint, and test:

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-{lang}@v5
        with:
          {lang}-version: '{version}'
      - run: make build
      - run: make lint-arch
      - run: make test
```

CI must be strict by default. Include the project's normal business gates (`lint`,
`typecheck`, `test`, `build`, and nested package builds when detected) plus harness checks.
Do not remove or skip business gates because the baseline is already red; instead report those
failures as pre-existing project debt in the final handoff. Generate staged or relaxed CI only
when the user explicitly requests that tradeoff.

For TypeScript/Node.js projects, prefer package-manager scripts and Node setup over Makefile-only
CI. Use the adapter in `references/adapters/typescript.md` to detect npm/pnpm/yarn/bun and generate
commands such as `npm run lint:harness`, `npm run lint:arch`, `npm run typecheck`, `npm test`,
`npm run build`, and nested package build steps when present.

### Harness Directory Structure

Create the default core harness directory tree:

```
harness/
├── config/
│   └── environment.json
├── changes/
│   ├── active/
│   ├── parking/
│   ├── archive/
│   └── INDEX.json
├── evolution/
│   ├── state.json
│   ├── results.tsv
│   └── proposals/
├── templates/
│   └── change/
│       ├── summary.md
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       └── reviews/
│           └── review.md
├── scripts/
│   ├── setup-env.sh
│   ├── start-server.sh
│   └── teardown-env.sh
```

Initialize `harness/evolution/state.json`:

```json
{
  "enabled": true,
  "threshold": 5,
  "window": 10,
  "last_evolved_archive_count": 0,
  "last_evolved_change_id": null,
  "last_score": null,
  "last_run_at": null,
  "pending": false
}
```

Initialize `harness/evolution/results.tsv` with this header:

```tsv
timestamp	change_id	old_score	new_score	status	dimension	note	eval_mode
```

Allowed status values are `keep`, `revert`, `rejected`, and `noop`. Allowed eval modes are
`independent_review`, `dry_run`, and `full_test`. Use `dry_run` when no independent auditor/subagent
is available; do not auto-apply harness deltas in that mode.

Do not create empty advanced directories by default.

Create optional advanced directories only when the confirmed scope or user request explicitly
requires that capability:

```
harness/
├── eval/          # Agent evaluation datasets and runner inputs
├── trace/         # Agent execution traces
├── state/         # Runtime state for external executors
├── checkpoints/   # Resumable execution checkpoints
├── memory/        # Long-term agent memory experiments
│   ├── episodes/
│   ├── knowledge/
│   └── procedures/
└── metrics/       # Execution, quality, and cost metrics
```

Advanced directories must come with a read/write protocol and validation command. If no protocol is
defined, leave the capability out of the generated harness.

## Scripts Must Be

- `chmod +x` — executable
- Self-contained — no external dependencies beyond Docker
- Idempotent — safe to run multiple times
- With error handling — `set -euo pipefail`

## ECL Change Management Scripts

Create ECL scripts for the selected command surface from `references/ecl-harness.md`.
PowerShell, Bash, Node, and Python are equivalent profiles only if they implement the same commands
and invariants. If the project rejects `.ps1`, do not generate PowerShell as the only entrypoint.
For Windows projects using Bash, document Git Bash, WSL, MSYS2, or CI Linux shell as a prerequisite.
Select the profile automatically from project evidence; ask the user only when evidence conflicts or
no supported command surface is inferable.

- `scripts/harness-change.{ps1|sh|mjs|py}`: implements `new`, `status`, `validate`, `park`, `resume`, `close`, `search`, `context`, and `reindex`.
- `scripts/harness-evolve.{ps1|sh|mjs|py}`: implements `check`, `collect`, and `mark-complete` for default auto-evolve threshold checks.
- `scripts/lint-ecl.{ps1|sh|mjs|py}`: validates active change structure, `docs/STATUS.md` presence, `plan.md`, completed validation, pending task consistency, spec clarification gates, plan review gates, task id formatting, and generated index freshness.
- `scripts/lint-encoding.{ps1|sh|mjs|py}`: scans source/docs for mojibake markers and UTF-8 risks.

Rules:
- `INDEX.json` is derived from `parking/*/summary.md` and `archive/*/summary.md`; agents must not hand-edit it.
- `park`, `close`, `resume`, and `reindex` must rebuild `INDEX.json`.
- `close` and `reindex` must run `harness-evolve check`; the evolution script may create
  `harness/evolution/pending.md`, but it must not rewrite docs, scripts, STATUS, or change files.
- Hook/CI integration may run validation, but must not automatically write docs, update `docs/STATUS.md`, or move changes.
- `harness-change context` should list active change files when present; if no active change
  exists, it should list `harness/evolution/pending.md` before `docs/STATUS.md` when pending
  evolution exists. It must not print or load all archive files.
- Auto-evolve is core lightweight infrastructure. It must not create `harness/eval`,
  `harness/trace`, `harness/state`, `harness/checkpoints`, `harness/memory`, or
  `harness/metrics` unless the user explicitly requested those advanced capabilities.
- Wire Makefile/package scripts/CI to the selected entrypoint, for example
  `bash scripts/lint-ecl.sh` for Bash or `{pkg_manager} run lint:harness` for package scripts.
- If the PowerShell profile is selected, detect whether `pwsh` exists before documenting or wiring
  commands. If `pwsh` is unavailable, use `powershell -NoProfile -ExecutionPolicy Bypass`.
- Keep PowerShell profile scripts compatible with Windows PowerShell 5.1. Avoid ambiguous overloads such as
  `TrimStart(".\")`; use typed arguments such as `[char[]]@(".", "\")`.
- Avoid non-ASCII mojibake marker literals in PowerShell templates. Use Unicode codepoints or another
  PowerShell 5.1-safe representation so the script still parses on legacy Windows code pages.

## Verification Config Rule

`harness/config/environment.json` is the static runtime contract created by ecl-harness-engineer.
Do not create `harness/config/verify.json` or `harness/config/validate.json`; task-specific
verification plans are generated later by the executor/runtime from `environment.json` plus
the active change context.
